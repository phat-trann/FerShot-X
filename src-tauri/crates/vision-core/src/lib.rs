//! Standalone bounded Rust Vision OCR and QR recognition core (`A33`).
//!
//! Calls Apple's Objective-C `Vision` framework directly via `objc2-vision 0.3.2`
//! on macOS 12+ without any Swift compiler, runtime helper, or subprocess.
//!
//! # Capabilities & Limitations
//! - Validates encoded byte size (`<= 32 MiB`), image header dimensions (`1..=16_384`),
//!   and total pixel count (`<= 16_777_216`) in pure Rust before passing image bytes to
//!   Apple's native `VNImageRequestHandler`.
//! - Queries actual runtime-installed recognition languages via `VNRecognizeTextRequest`
//!   (`supportedRecognitionLanguagesAndReturnError`) rather than relying on a static
//!   hardcoded language list.
//! - Keeps all Objective-C `Retained` objects confined to a single synchronous
//!   `objc2::rc::autoreleasepool` scope; only owned Rust data (`VisionResponse`,
//!   `VisionError`, `Vec<String>`) crosses thread boundaries.
//! - Native ImageIO/Vision internal allocations and synchronous execution cannot be
//!   preempted mid-request once `performRequests_error` begins; callers should run
//!   [`recognize`] on a bounded blocking worker pool (`tauri::async_runtime::spawn_blocking`).
//!
//! # Proposed Tauri Blocking-Call Integration (`C08`)
//! ```rust,ignore
//! #[tauri::command]
//! async fn recognize_vision(request: ferby_vision_core::VisionRequest)
//!     -> Result<ferby_vision_core::VisionResponse, String>
//! {
//!     tauri::async_runtime::spawn_blocking(move || {
//!         ferby_vision_core::recognize(&request)
//!     })
//!     .await
//!     .map_err(|e| format!("Vision worker join failed: {e}"))?
//!     .map_err(|e| e.to_string())
//! }
//! ```

use image::{ImageFormat, ImageReader, Limits};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::io::Cursor;
use thiserror::Error;

pub const CURRENT_SCHEMA_VERSION: u32 = 1;
pub const MAX_INPUT_BYTES: usize = 32 * 1024 * 1024;
pub const MAX_DIMENSION: u32 = 16_384;
pub const MAX_PIXELS: u64 = 16_777_216;
pub const MAX_RESULTS_CAP: usize = 200;
pub const MAX_UTF8_OUTPUT_BYTES: usize = 256 * 1024;
pub const MAX_LANGUAGE_TAG_LEN: usize = 32;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum VisionRecognitionMode {
    Ocr,
    Qr,
    Both,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisionRequest {
    pub schema_version: u32,
    pub mode: VisionRecognitionMode,
    pub image_bytes: Vec<u8>,
    pub languages: Vec<String>,
    pub preserve_line_breaks: bool,
    pub uses_language_correction: bool,
    pub max_results: usize,
}

impl VisionRequest {
    pub fn new(mode: VisionRecognitionMode, image_bytes: Vec<u8>) -> Self {
        Self {
            schema_version: CURRENT_SCHEMA_VERSION,
            mode,
            image_bytes,
            languages: vec!["en-US".to_string()],
            preserve_line_breaks: true,
            uses_language_correction: true,
            max_results: 50,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisionTextObservation {
    pub text: String,
    pub confidence: f32,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisionQrObservation {
    pub payload: String,
    pub symbology: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VisionResponse {
    pub schema_version: u32,
    pub width: u32,
    pub height: u32,
    pub recognized_text: String,
    pub text_blocks: Vec<VisionTextObservation>,
    pub qr_codes: Vec<VisionQrObservation>,
    pub resolved_languages: Vec<String>,
}

#[derive(Debug, Error, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "detail", rename_all = "camelCase")]
pub enum VisionError {
    #[error("Unsupported schema version: {0}.")]
    UnsupportedSchemaVersion(u32),
    #[error("Image byte buffer must not be empty.")]
    EmptyImageBytes,
    #[error("Image byte length ({0}) exceeds limit ({MAX_INPUT_BYTES}).")]
    ImageBytesTooLarge(usize),
    #[error("maxResults ({0}) must be between 1 and {MAX_RESULTS_CAP}.")]
    InvalidMaxResults(usize),
    #[error("At least one recognition language is required for OCR.")]
    EmptyLanguageList,
    #[error("Unsupported or malformed recognition language: {0}.")]
    UnsupportedLanguage(String),
    #[error("Unsupported or malformed image format (PNG or JPEG required): {0}.")]
    InvalidImageFormat(String),
    #[error("Image dimensions ({width}x{height}) are out of bounds (max {MAX_DIMENSION}px, {MAX_PIXELS} pixels).")]
    ImageDimensionsOutOfBounds { width: u32, height: u32 },
    #[error("Recognized UTF-8 output exceeds maximum byte cap ({MAX_UTF8_OUTPUT_BYTES}).")]
    OutputTooLarge(usize),
    #[error("Vision framework is not supported on this host platform.")]
    UnsupportedPlatform,
    #[error("Vision execution failed: {0}.")]
    VisionExecutionFailed(String),
}

/// Injectable backend trait for deterministic unit tests and macOS Vision execution.
pub trait VisionBackend {
    fn supported_languages(&self) -> Result<BTreeSet<String>, VisionError>;
    fn execute(
        &self,
        request: &VisionRequest,
        resolved_languages: &[String],
        dimensions: (u32, u32),
    ) -> Result<(Vec<VisionTextObservation>, Vec<VisionQrObservation>), VisionError>;
}

fn is_valid_language_tag(tag: &str) -> bool {
    !tag.is_empty()
        && tag.len() <= MAX_LANGUAGE_TAG_LEN
        && tag
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Validates encoded bytes, header dimensions, pixel count, and full image decode in pure Rust
/// before any native Objective-C Vision call occurs.
pub fn validate_and_inspect_image(bytes: &[u8]) -> Result<(u32, u32), VisionError> {
    if bytes.is_empty() {
        return Err(VisionError::EmptyImageBytes);
    }
    if bytes.len() > MAX_INPUT_BYTES {
        return Err(VisionError::ImageBytesTooLarge(bytes.len()));
    }

    let make_reader = |with_limits: bool| -> Result<ImageReader<Cursor<&[u8]>>, VisionError> {
        let mut reader = ImageReader::new(Cursor::new(bytes))
            .with_guessed_format()
            .map_err(|e| VisionError::InvalidImageFormat(e.to_string()))?;
        if !matches!(reader.format(), Some(ImageFormat::Png | ImageFormat::Jpeg)) {
            return Err(VisionError::InvalidImageFormat(
                "Only PNG and JPEG inputs are accepted".to_string(),
            ));
        }
        if with_limits {
            let mut limits = Limits::default();
            limits.max_image_width = Some(MAX_DIMENSION);
            limits.max_image_height = Some(MAX_DIMENSION);
            limits.max_alloc = Some(128 * 1024 * 1024);
            reader.limits(limits);
        } else {
            reader.no_limits();
        }
        Ok(reader)
    };

    let (width, height) = make_reader(false)?
        .into_dimensions()
        .map_err(|e| VisionError::InvalidImageFormat(e.to_string()))?;

    if width == 0
        || height == 0
        || width > MAX_DIMENSION
        || height > MAX_DIMENSION
        || u64::from(width) * u64::from(height) > MAX_PIXELS
    {
        return Err(VisionError::ImageDimensionsOutOfBounds { width, height });
    }

    let decoded = make_reader(true)?
        .decode()
        .map_err(|e| VisionError::InvalidImageFormat(e.to_string()))?;
    if decoded.width() != width || decoded.height() != height {
        return Err(VisionError::ImageDimensionsOutOfBounds {
            width: decoded.width(),
            height: decoded.height(),
        });
    }

    Ok((width, height))
}

pub fn validate_request_with_languages(
    request: &VisionRequest,
    installed_languages: &BTreeSet<String>,
) -> Result<(Vec<String>, (u32, u32)), VisionError> {
    if request.schema_version != CURRENT_SCHEMA_VERSION {
        return Err(VisionError::UnsupportedSchemaVersion(
            request.schema_version,
        ));
    }
    if request.max_results == 0 || request.max_results > MAX_RESULTS_CAP {
        return Err(VisionError::InvalidMaxResults(request.max_results));
    }

    let dimensions = validate_and_inspect_image(&request.image_bytes)?;

    let mut resolved_languages = Vec::new();
    if matches!(
        request.mode,
        VisionRecognitionMode::Ocr | VisionRecognitionMode::Both
    ) {
        if request.languages.is_empty() {
            return Err(VisionError::EmptyLanguageList);
        }
        for lang in &request.languages {
            let trimmed = lang.trim();
            if !is_valid_language_tag(trimmed) || !installed_languages.contains(trimmed) {
                return Err(VisionError::UnsupportedLanguage(lang.clone()));
            }
            if !resolved_languages.iter().any(|existing| existing == trimmed) {
                resolved_languages.push(trimmed.to_string());
            }
        }
    }

    Ok((resolved_languages, dimensions))
}

pub fn recognize_with_backend<B: VisionBackend>(
    request: &VisionRequest,
    backend: &B,
) -> Result<VisionResponse, VisionError> {
    let installed = backend.supported_languages()?;
    let (resolved_languages, (width, height)) =
        validate_request_with_languages(request, &installed)?;

    let (raw_text_blocks, raw_qr_codes) =
        backend.execute(request, &resolved_languages, (width, height))?;

    let mut text_blocks = Vec::new();
    let mut total_utf8_bytes: usize = 0;

    for obs in raw_text_blocks.into_iter().take(request.max_results) {
        let trimmed = obs.text.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !obs.confidence.is_finite() {
            continue;
        }
        total_utf8_bytes = total_utf8_bytes.saturating_add(trimmed.len());
        if total_utf8_bytes > MAX_UTF8_OUTPUT_BYTES {
            return Err(VisionError::OutputTooLarge(total_utf8_bytes));
        }
        text_blocks.push(VisionTextObservation {
            text: trimmed.to_string(),
            confidence: obs.confidence.clamp(0.0, 1.0),
        });
    }

    let mut qr_codes = Vec::new();
    for qr in raw_qr_codes.into_iter().take(request.max_results) {
        if qr.payload.is_empty() {
            continue;
        }
        total_utf8_bytes = total_utf8_bytes.saturating_add(qr.payload.len());
        if total_utf8_bytes > MAX_UTF8_OUTPUT_BYTES {
            return Err(VisionError::OutputTooLarge(total_utf8_bytes));
        }
        qr_codes.push(qr);
    }

    let separator = if request.preserve_line_breaks {
        "\n"
    } else {
        " "
    };
    let recognized_text = text_blocks
        .iter()
        .map(|b| b.text.as_str())
        .collect::<Vec<_>>()
        .join(separator);

    Ok(VisionResponse {
        schema_version: CURRENT_SCHEMA_VERSION,
        width,
        height,
        recognized_text,
        text_blocks,
        qr_codes,
        resolved_languages,
    })
}

#[cfg(target_os = "macos")]
mod macos_backend {
    use super::*;
    use objc2::rc::{autoreleasepool, Retained};
    use objc2::AnyThread;
    use objc2_foundation::{NSArray, NSData, NSDictionary, NSString};
    use objc2_vision::{
        VNBarcodeObservation, VNBarcodeSymbologyQR, VNDetectBarcodesRequest,
        VNImageRequestHandler, VNRecognizeTextRequest, VNRecognizedTextObservation, VNRequest,
        VNRequestTextRecognitionLevel,
    };

    pub struct MacOsVisionBackend;

    impl VisionBackend for MacOsVisionBackend {
        fn supported_languages(&self) -> Result<BTreeSet<String>, VisionError> {
            autoreleasepool(|_| {
                // SAFETY: `VNRecognizeTextRequest::new()` creates a standard Objective-C request
                // object on macOS 10.15+ (compatible with the frozen macOS 12 baseline).
                // All retained objects stay inside this synchronous `autoreleasepool` and are
                // copied into owned Rust `String`s before returning.
                unsafe {
                    let req = VNRecognizeTextRequest::new();
                    req.setRecognitionLevel(VNRequestTextRecognitionLevel::Accurate);
                    let langs = req
                        .supportedRecognitionLanguagesAndReturnError()
                        .map_err(|e| VisionError::VisionExecutionFailed(e.to_string()))?;
                    let mut out = BTreeSet::new();
                    let count = langs.count();
                    for idx in 0..count {
                        let item = langs.objectAtIndex(idx);
                        out.insert(item.to_string());
                    }
                    Ok(out)
                }
            })
        }

        fn execute(
            &self,
            request: &VisionRequest,
            resolved_languages: &[String],
            _dimensions: (u32, u32),
        ) -> Result<(Vec<VisionTextObservation>, Vec<VisionQrObservation>), VisionError> {
            autoreleasepool(|_| {
                let ns_data = NSData::with_bytes(&request.image_bytes);
                // SAFETY: `ns_data` contains validated PNG/JPEG bytes within `MAX_INPUT_BYTES` and
                // `MAX_PIXELS`. `NSDictionary::new()` provides an empty options dictionary.
                // All Objective-C objects (`handler`, `text_req`, `barcode_req`, observations)
                // remain confined to this thread and `autoreleasepool`.
                unsafe {
                    let options = NSDictionary::new();
                    let handler = VNImageRequestHandler::initWithData_options(
                        VNImageRequestHandler::alloc(),
                        &ns_data,
                        &options,
                    );

                    let mut text_out = Vec::new();
                    let mut qr_out = Vec::new();

                    if matches!(
                        request.mode,
                        VisionRecognitionMode::Ocr | VisionRecognitionMode::Both
                    ) {
                        let text_req = VNRecognizeTextRequest::new();
                        text_req.setRecognitionLevel(VNRequestTextRecognitionLevel::Accurate);
                        text_req.setUsesLanguageCorrection(request.uses_language_correction);

                        let ns_langs: Vec<Retained<NSString>> = resolved_languages
                            .iter()
                            .map(|lang| NSString::from_str(lang))
                            .collect();
                        let lang_array = NSArray::from_retained_slice(&ns_langs);
                        text_req.setRecognitionLanguages(&lang_array);

                        let req_super: Retained<VNRequest> =
                            Retained::into_super(Retained::into_super(text_req.clone()));
                        let req_array = NSArray::from_retained_slice(&[req_super]);
                        handler
                            .performRequests_error(&req_array)
                            .map_err(|e| VisionError::VisionExecutionFailed(e.to_string()))?;

                        if let Some(results) = text_req.results() {
                            let count = results.count().min(request.max_results);
                            for idx in 0..count {
                                let obs: Retained<VNRecognizedTextObservation> =
                                    results.objectAtIndex(idx);
                                let candidates = obs.topCandidates(1);
                                if let Some(top) = candidates.firstObject() {
                                    let text = top.string().to_string();
                                    let confidence = top.confidence();
                                    text_out.push(VisionTextObservation { text, confidence });
                                }
                            }
                        }
                    }

                    if matches!(
                        request.mode,
                        VisionRecognitionMode::Qr | VisionRecognitionMode::Both
                    ) {
                        let barcode_req = VNDetectBarcodesRequest::new();
                        let qr_sym = VNBarcodeSymbologyQR.ok_or_else(|| {
                            VisionError::VisionExecutionFailed(
                                "VNBarcodeSymbologyQR constant unavailable on host".to_string(),
                            )
                        })?;
                        let sym_array = NSArray::from_slice(&[qr_sym]);
                        barcode_req.setSymbologies(&sym_array);

                        let req_super: Retained<VNRequest> =
                            Retained::into_super(Retained::into_super(barcode_req.clone()));
                        let req_array = NSArray::from_retained_slice(&[req_super]);
                        handler
                            .performRequests_error(&req_array)
                            .map_err(|e| VisionError::VisionExecutionFailed(e.to_string()))?;

                        if let Some(results) = barcode_req.results() {
                            let count = results.count().min(request.max_results);
                            for idx in 0..count {
                                let obs: Retained<VNBarcodeObservation> =
                                    results.objectAtIndex(idx);
                                if let Some(payload_ns) = obs.payloadStringValue() {
                                    let payload = payload_ns.to_string();
                                    let symbology = obs.symbology().to_string();
                                    qr_out.push(VisionQrObservation { payload, symbology });
                                }
                            }
                        }
                    }

                    Ok((text_out, qr_out))
                }
            })
        }
    }
}

pub fn runtime_supported_languages() -> Result<BTreeSet<String>, VisionError> {
    #[cfg(target_os = "macos")]
    {
        macos_backend::MacOsVisionBackend.supported_languages()
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err(VisionError::UnsupportedPlatform)
    }
}

pub fn recognize(request: &VisionRequest) -> Result<VisionResponse, VisionError> {
    #[cfg(target_os = "macos")]
    {
        recognize_with_backend(request, &macos_backend::MacOsVisionBackend)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = request;
        Err(VisionError::UnsupportedPlatform)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{ExtendedColorType, ImageEncoder, Rgba, RgbaImage};

    fn encode_rgba_png(img: &RgbaImage) -> Vec<u8> {
        let mut out = Vec::new();
        image::codecs::png::PngEncoder::new(&mut out)
            .write_image(
                img.as_raw(),
                img.width(),
                img.height(),
                ExtendedColorType::Rgba8,
            )
            .unwrap();
        out
    }

    fn glyph_5x7(ch: char) -> Option<[u8; 7]> {
        Some(match ch {
            'H' => [
                0b10001,
                0b10001,
                0b10001,
                0b11111,
                0b10001,
                0b10001,
                0b10001,
            ],
            'E' => [
                0b11111,
                0b10000,
                0b10000,
                0b11110,
                0b10000,
                0b10000,
                0b11111,
            ],
            'L' => [
                0b10000,
                0b10000,
                0b10000,
                0b10000,
                0b10000,
                0b10000,
                0b11111,
            ],
            'O' => [
                0b01110,
                0b10001,
                0b10001,
                0b10001,
                0b10001,
                0b10001,
                0b01110,
            ],
            '2' => [
                0b01110,
                0b10001,
                0b00001,
                0b00010,
                0b00100,
                0b01000,
                0b11111,
            ],
            '0' => [
                0b01110,
                0b10001,
                0b10001,
                0b10001,
                0b10001,
                0b10001,
                0b01110,
            ],
            '6' => [
                0b01110,
                0b10000,
                0b10000,
                0b11110,
                0b10001,
                0b10001,
                0b01110,
            ],
            ' ' => [0; 7],
            _ => return None,
        })
    }

    fn make_synthetic_text_png(text: &str) -> Vec<u8> {
        let scale: u32 = 8;
        let char_advance = 6 * scale;
        let margin: u32 = 40;
        let width = margin * 2 + (text.chars().count() as u32) * char_advance;
        let height = margin * 2 + 7 * scale;
        let mut img = RgbaImage::from_pixel(width, height, Rgba([255, 255, 255, 255]));

        for (idx, ch) in text.chars().enumerate() {
            if let Some(rows) = glyph_5x7(ch) {
                let base_x = margin + (idx as u32) * char_advance;
                let base_y = margin;
                for (ry, row_bits) in rows.iter().enumerate() {
                    for rx in 0..5u32 {
                        if (row_bits >> (4 - rx)) & 1 == 1 {
                            for dy in 0..scale {
                                for dx in 0..scale {
                                    img.put_pixel(
                                        base_x + rx * scale + dx,
                                        base_y + (ry as u32) * scale + dy,
                                        Rgba([0, 0, 0, 255]),
                                    );
                                }
                            }
                        }
                    }
                }
            }
        }
        encode_rgba_png(&img)
    }

    /// Standard ISO/IEC 18004 Version 1-L (21x21) QR matrix encoding `"FERBY-QR-42"`.
    fn make_synthetic_qr_png() -> Vec<u8> {
        const ROWS: [&str; 21] = [
            "111111100101101111111",
            "100000100111001000001",
            "101110101101101011101",
            "101110100101001011101",
            "101110100010101011101",
            "100000100000101000001",
            "111111101010101111111",
            "000000001101100000000",
            "111011111111011000100",
            "110000001100010000010",
            "000110101110100111111",
            "011100011110010000011",
            "011110111000100011111",
            "000000001011001001010",
            "111111101111011110011",
            "100000101111110000001",
            "101110101111010100100",
            "101110100101000111010",
            "101110101110101010001",
            "100000101011110000010",
            "111111101010110001111",
        ];

        let quiet = 4u32;
        let scale = 10u32;
        let modules = 21u32 + quiet * 2;
        let size = modules * scale;
        let mut img = RgbaImage::from_pixel(size, size, Rgba([255, 255, 255, 255]));

        for (y, row) in ROWS.iter().enumerate() {
            for (x, ch) in row.chars().enumerate() {
                if ch == '1' {
                    let px0 = (quiet + x as u32) * scale;
                    let py0 = (quiet + y as u32) * scale;
                    for dy in 0..scale {
                        for dx in 0..scale {
                            img.put_pixel(px0 + dx, py0 + dy, Rgba([0, 0, 0, 255]));
                        }
                    }
                }
            }
        }
        encode_rgba_png(&img)
    }

    struct FakeVisionBackend {
        languages: BTreeSet<String>,
        text_blocks: Vec<VisionTextObservation>,
        qr_codes: Vec<VisionQrObservation>,
    }

    impl VisionBackend for FakeVisionBackend {
        fn supported_languages(&self) -> Result<BTreeSet<String>, VisionError> {
            Ok(self.languages.clone())
        }

        fn execute(
            &self,
            _request: &VisionRequest,
            _resolved_languages: &[String],
            _dimensions: (u32, u32),
        ) -> Result<(Vec<VisionTextObservation>, Vec<VisionQrObservation>), VisionError> {
            Ok((self.text_blocks.clone(), self.qr_codes.clone()))
        }
    }

    #[test]
    fn pure_validation_covers_bounds_headers_languages_and_result_caps() {
        let valid_png = make_synthetic_text_png("HELLO");
        let mut langs = BTreeSet::new();
        langs.insert("en-US".to_string());

        let fake = FakeVisionBackend {
            languages: langs,
            text_blocks: vec![
                VisionTextObservation {
                    text: "Line 1".to_string(),
                    confidence: 0.95,
                },
                VisionTextObservation {
                    text: "Line 2".to_string(),
                    confidence: 0.90,
                },
                VisionTextObservation {
                    text: "Line 3".to_string(),
                    confidence: 0.85,
                },
            ],
            qr_codes: vec![],
        };

        // Result cap truncation (`max_results = 2`)
        let mut req = VisionRequest::new(VisionRecognitionMode::Ocr, valid_png.clone());
        req.max_results = 2;
        let resp = recognize_with_backend(&req, &fake).unwrap();
        assert_eq!(resp.text_blocks.len(), 2);
        assert_eq!(resp.recognized_text, "Line 1\nLine 2");

        // Single-line join when preserve_line_breaks = false
        req.preserve_line_breaks = false;
        let single_line = recognize_with_backend(&req, &fake).unwrap();
        assert_eq!(single_line.recognized_text, "Line 1 Line 2");

        // Invalid schema version
        let mut bad_schema = req.clone();
        bad_schema.schema_version = 99;
        assert_eq!(
            recognize_with_backend(&bad_schema, &fake),
            Err(VisionError::UnsupportedSchemaVersion(99))
        );

        // Empty bytes
        let empty_req = VisionRequest::new(VisionRecognitionMode::Ocr, vec![]);
        assert_eq!(
            recognize_with_backend(&empty_req, &fake),
            Err(VisionError::EmptyImageBytes)
        );

        // Unsupported language
        let mut bad_lang = VisionRequest::new(VisionRecognitionMode::Ocr, valid_png.clone());
        bad_lang.languages = vec!["xx-NOT-INSTALLED".to_string()];
        assert_eq!(
            recognize_with_backend(&bad_lang, &fake),
            Err(VisionError::UnsupportedLanguage(
                "xx-NOT-INSTALLED".to_string()
            ))
        );

        // Oversized PNG header rejected before full decode
        let mut oversized_header = valid_png.clone();
        oversized_header[16..20].copy_from_slice(&(MAX_DIMENSION + 1).to_be_bytes());
        let mut crc = !0u32;
        for byte in &oversized_header[12..29] {
            crc ^= u32::from(*byte);
            for _ in 0..8 {
                crc = (crc >> 1) ^ (0xedb8_8320u32 & (0u32.wrapping_sub(crc & 1)));
            }
        }
        oversized_header[29..33].copy_from_slice(&(!crc).to_be_bytes());
        let header_req = VisionRequest::new(VisionRecognitionMode::Ocr, oversized_header);
        assert!(matches!(
            recognize_with_backend(&header_req, &fake),
            Err(VisionError::ImageDimensionsOutOfBounds { .. })
        ));
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn macos_vision_recognizes_synthetic_text_and_qr_and_queries_languages() {
        let supported = runtime_supported_languages().unwrap();
        assert!(
            supported.contains("en-US"),
            "Expected en-US in runtime_supported_languages: {supported:?}"
        );

        // 1. Real Vision OCR on synthetic text PNG
        let text_png = make_synthetic_text_png("HELLO 2026");
        let mut ocr_req = VisionRequest::new(VisionRecognitionMode::Ocr, text_png);
        ocr_req.uses_language_correction = false;
        let ocr_resp = recognize(&ocr_req).unwrap();
        assert!(
            ocr_resp.recognized_text.to_uppercase().contains("HELLO"),
            "Expected Vision OCR output to contain HELLO, got: {:?}",
            ocr_resp.recognized_text
        );
        assert!(!ocr_resp.text_blocks.is_empty());

        // 2. Real Vision QR on synthetic 21x21 QR PNG
        let qr_png = make_synthetic_qr_png();
        let qr_req = VisionRequest::new(VisionRecognitionMode::Qr, qr_png);
        let qr_resp = recognize(&qr_req).unwrap();
        assert_eq!(qr_resp.qr_codes.len(), 1);
        assert_eq!(qr_resp.qr_codes[0].payload, "FERBY-QR-42");

        // 3. Blank image returns empty observations cleanly
        let blank = encode_rgba_png(&RgbaImage::from_pixel(
            120,
            80,
            Rgba([255, 255, 255, 255]),
        ));
        let blank_resp = recognize(&VisionRequest::new(VisionRecognitionMode::Both, blank)).unwrap();
        assert!(blank_resp.recognized_text.is_empty());
        assert!(blank_resp.qr_codes.is_empty());
    }
}
