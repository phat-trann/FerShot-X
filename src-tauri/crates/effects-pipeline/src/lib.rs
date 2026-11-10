//! Ordered, immutable, bounded orchestration over the existing image and effects cores.
use fershot_image_core::{Raster, TransformError, MAX_DIMENSION, MAX_INPUT_BYTES, MAX_PIXELS};
use fershot_effects_core::{EffectRaster, EffectsError, MAX_BLUR_RADIUS, MAX_EFFECT_REGION_PIXELS, MAX_MOSAIC_BLOCK_SIZE};
pub use fershot_effects_core::{EffectRect, PixelEffect, RgbaColor};
use image::{ImageFormat, ImageReader, Limits};
use std::{fmt, io::Cursor};

#[derive(Clone, Copy, Debug)]
pub struct PipelineLimits {
    pub max_input_bytes: usize,
    pub max_output_bytes: usize,
    pub max_pixels: u64,
    pub max_effects: usize,
    /// Conservative policy units, not elapsed time or an exact CPU instruction count.
    pub max_work_units: u64,
    /// Preflight estimate; decoder/encoder allocation limits are not a process memory sandbox.
    pub max_working_bytes: u64,
}
impl Default for PipelineLimits {
    fn default() -> Self {
        Self { max_input_bytes: MAX_INPUT_BYTES, max_output_bytes: MAX_INPUT_BYTES,
            max_pixels: MAX_PIXELS, max_effects: 64, max_work_units: 512 * 1024 * 1024,
            max_working_bytes: 512 * 1024 * 1024 }
    }
}
#[derive(Debug)]
pub enum PipelineError {
    InvalidLimits, InputLimit, OutputLimit, PixelLimit, EffectCountLimit, WorkLimit, WorkingMemoryLimit,
    UnsupportedFormat, Header(String), Decode(TransformError),
    InvalidEffect { index: usize, reason: &'static str },
    Effect { index: usize, source: EffectsError },
    Encode(EffectsError),
}
impl PipelineError {
    pub fn code(&self) -> &'static str {
        match self {
            Self::InvalidLimits => "invalid_limits", Self::InputLimit => "input_limit",
            Self::OutputLimit => "output_limit", Self::PixelLimit => "pixel_limit",
            Self::EffectCountLimit => "effect_count_limit", Self::WorkLimit => "work_limit",
            Self::WorkingMemoryLimit => "working_memory_limit", Self::UnsupportedFormat => "unsupported_format",
            Self::Header(_) | Self::Decode(_) => "decode_failed", Self::InvalidEffect { .. } => "invalid_effect",
            Self::Effect { .. } => "effect_failed", Self::Encode(_) => "encode_failed",
        }
    }
}
impl fmt::Display for PipelineError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Header(message) => write!(f, "Image header failed: {message}"),
            Self::Decode(source) => write!(f, "Image decode failed: {source}"),
            Self::InvalidEffect { index, reason } => write!(f, "Invalid effect {index}: {reason}"),
            Self::Effect { index, source } => write!(f, "Effect {index} failed: {source}"),
            Self::Encode(source) => write!(f, "PNG encode failed: {source}"),
            _ => write!(f, "Image pipeline rejected request: {}", self.code()),
        }
    }
}
impl std::error::Error for PipelineError {}

#[derive(Debug)]
pub struct PipelineOutput {
    pub png: Vec<u8>,
    pub width: u32,
    pub height: u32,
    pub applied_effects: usize,
    pub estimated_work_units: u64,
}
fn limits_valid(l: PipelineLimits) -> bool {
    l.max_input_bytes > 0 && l.max_input_bytes <= MAX_INPUT_BYTES
        && l.max_output_bytes > 0 && l.max_output_bytes <= MAX_INPUT_BYTES
        && l.max_pixels > 0 && l.max_pixels <= MAX_PIXELS && l.max_effects <= 64
        && l.max_work_units > 0 && l.max_work_units <= 4 * 1024 * 1024 * 1024
        && l.max_working_bytes > 0 && l.max_working_bytes <= 1024 * 1024 * 1024
}
fn preflight(input: &[u8], effects: &[PixelEffect], limits: PipelineLimits) -> Result<(u32, u32, u64), PipelineError> {
    if !limits_valid(limits) { return Err(PipelineError::InvalidLimits); }
    if input.is_empty() || input.len() > limits.max_input_bytes { return Err(PipelineError::InputLimit); }
    if effects.len() > limits.max_effects { return Err(PipelineError::EffectCountLimit); }
    let mut reader = ImageReader::new(Cursor::new(input)).with_guessed_format().map_err(|e| PipelineError::Header(e.to_string()))?;
    if !matches!(reader.format(), Some(ImageFormat::Png | ImageFormat::Jpeg)) { return Err(PipelineError::UnsupportedFormat); }
    let mut decode_limits = Limits::default();
    decode_limits.max_image_width = Some(MAX_DIMENSION); decode_limits.max_image_height = Some(MAX_DIMENSION);
    // Header probing uses C03's codec ceiling; the caller's estimate is checked below,
    // before pixel decode. It is not a per-allocation codec limit.
    decode_limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(decode_limits);
    let (width, height) = reader.into_dimensions().map_err(|e| PipelineError::Header(e.to_string()))?;
    let pixels = u64::from(width) * u64::from(height);
    if width == 0 || height == 0 || width > MAX_DIMENSION || height > MAX_DIMENSION || pixels > limits.max_pixels {
        return Err(PipelineError::PixelLimit);
    }
    let mut work = pixels.checked_mul(3).ok_or(PipelineError::WorkLimit)?;
    let mut largest_region = 0;
    for (index, effect) in effects.iter().enumerate() {
        let (rect, factor) = match *effect {
            PixelEffect::SolidCover { rect, .. } | PixelEffect::TransparentErase { rect } => (rect, 1),
            PixelEffect::Mosaic { rect, block_size } => {
                if !(2..=MAX_MOSAIC_BLOCK_SIZE).contains(&block_size) { return Err(PipelineError::InvalidEffect { index, reason: "mosaic block size" }); }
                (rect, 2)
            }
            PixelEffect::Blur { rect, radius } => {
                if !(1..=MAX_BLUR_RADIUS).contains(&radius) { return Err(PipelineError::InvalidEffect { index, reason: "blur radius" }); }
                (rect, u64::from(radius) * 12 + 8)
            }
        };
        if rect.width == 0 || rect.height == 0 || rect.x.checked_add(rect.width).is_none_or(|x| x > width)
            || rect.y.checked_add(rect.height).is_none_or(|y| y > height) {
            return Err(PipelineError::InvalidEffect { index, reason: "region bounds" });
        }
        let area = u64::from(rect.width) * u64::from(rect.height);
        if area > MAX_EFFECT_REGION_PIXELS { return Err(PipelineError::InvalidEffect { index, reason: "region work cap" }); }
        largest_region = largest_region.max(area);
        work = work.checked_add(pixels).and_then(|v| area.checked_mul(factor).and_then(|n| v.checked_add(n)))
            .ok_or(PipelineError::WorkLimit)?;
    }
    if work > limits.max_work_units { return Err(PipelineError::WorkLimit); }
    // Covers several raster copies, region temporaries and uncompressed-size PNG reserve.
    let estimate = pixels.checked_mul(28)
        .and_then(|v| largest_region.checked_mul(24).and_then(|r| v.checked_add(r)))
        .and_then(|v| v.checked_add(input.len() as u64))
        .and_then(|v| v.checked_add(u64::from(height) + 1024 * 1024))
        .ok_or(PipelineError::WorkingMemoryLimit)?;
    if estimate > limits.max_working_bytes { return Err(PipelineError::WorkingMemoryLimit); }
    Ok((width, height, work))
}

/// Pixel-decodes once through C03, applies existing A19 operations in caller order, encodes one PNG.
pub fn run_pipeline(input: &[u8], effects: &[PixelEffect], limits: PipelineLimits) -> Result<PipelineOutput, PipelineError> {
    let (width, height, work) = preflight(input, effects, limits)?;
    let source = Raster::decode(input).map_err(PipelineError::Decode)?;
    if source.dimensions() != (width, height) { return Err(PipelineError::PixelLimit); }
    let mut raster = EffectRaster::from_rgba8(width, height, source.rgba_bytes()).map_err(PipelineError::Encode)?;
    drop(source);
    for (index, effect) in effects.iter().enumerate() {
        raster = raster.apply(*effect).map_err(|source| PipelineError::Effect { index, source })?;
    }
    let png = raster.encode_png().map_err(PipelineError::Encode)?;
    if png.len() > limits.max_output_bytes { return Err(PipelineError::OutputLimit); }
    Ok(PipelineOutput { png, width, height, applied_effects: effects.len(), estimated_work_units: work })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Vec<u8> { EffectRaster::from_rgba8(2, 2, [10, 20, 30, 40].repeat(4)).unwrap().encode_png().unwrap() }
    fn rect() -> EffectRect { EffectRect { x: 0, y: 0, width: 1, height: 1 } }
    fn cover() -> PixelEffect { PixelEffect::SolidCover { rect: rect(), color: RgbaColor { r: 200, g: 20, b: 10, a: 255 } } }
    #[test]
    fn mixed_effect_order_changes_exact_pixels_without_mutating_original() {
        let input = fixture(); let original = input.clone();
        let erase = PixelEffect::TransparentErase { rect: rect() };
        let a = run_pipeline(&input, &[cover(), erase], PipelineLimits::default()).unwrap();
        let b = run_pipeline(&input, &[erase, cover()], PipelineLimits::default()).unwrap();
        assert_eq!(&Raster::decode(&a.png).unwrap().rgba_bytes()[..4], &[0, 0, 0, 0]);
        assert_eq!(&Raster::decode(&b.png).unwrap().rgba_bytes()[..4], &[200, 20, 10, 255]);
        assert_eq!(input, original); assert_eq!(a.applied_effects, 2);
    }
    #[test]
    fn no_effect_roundtrip_preserves_straight_alpha() {
        let out = run_pipeline(&fixture(), &[], PipelineLimits::default()).unwrap();
        assert_eq!((out.width, out.height), (2, 2));
        assert_eq!(Raster::decode(&out.png).unwrap().rgba_bytes(), [10, 20, 30, 40].repeat(4));
    }
    #[test]
    fn all_regions_and_parameters_are_validated_before_applying_any_operation() {
        let input = fixture(); let original = input.clone();
        let bad = PixelEffect::TransparentErase { rect: EffectRect { x: u32::MAX, ..rect() } };
        assert!(matches!(run_pipeline(&input, &[cover(), bad], PipelineLimits::default()), Err(PipelineError::InvalidEffect { index: 1, .. })));
        assert!(matches!(run_pipeline(&input, &[PixelEffect::Blur { rect: rect(), radius: 0 }], PipelineLimits::default()), Err(PipelineError::InvalidEffect { index: 0, .. })));
        assert_eq!(input, original);
    }
    #[test]
    fn malformed_and_oversized_inputs_fail_without_partial_output() {
        assert!(run_pipeline(b"not an image", &[], PipelineLimits::default()).is_err());
        assert!(matches!(run_pipeline(&fixture(), &[], PipelineLimits { max_input_bytes: 1, ..PipelineLimits::default() }), Err(PipelineError::InputLimit)));
    }
    #[test]
    fn pixel_work_memory_and_effect_count_budgets_are_enforced() {
        let input = fixture();
        assert!(matches!(run_pipeline(&input, &[], PipelineLimits { max_pixels: 3, ..PipelineLimits::default() }), Err(PipelineError::PixelLimit)));
        assert!(matches!(run_pipeline(&input, &[cover()], PipelineLimits { max_work_units: 1, ..PipelineLimits::default() }), Err(PipelineError::WorkLimit)));
        assert!(matches!(run_pipeline(&input, &[], PipelineLimits { max_working_bytes: 1, ..PipelineLimits::default() }), Err(PipelineError::WorkingMemoryLimit)));
        assert!(matches!(run_pipeline(&input, &[cover(), cover()], PipelineLimits { max_effects: 1, ..PipelineLimits::default() }), Err(PipelineError::EffectCountLimit)));
    }
    #[test]
    fn output_cap_and_invalid_limits_have_typed_failures() {
        assert!(matches!(run_pipeline(&fixture(), &[], PipelineLimits { max_output_bytes: 1, ..PipelineLimits::default() }), Err(PipelineError::OutputLimit)));
        assert!(matches!(run_pipeline(&fixture(), &[], PipelineLimits { max_effects: 65, ..PipelineLimits::default() }), Err(PipelineError::InvalidLimits)));
    }
    #[test]
    fn blur_and_mosaic_chain_is_deterministic_and_preserves_unaffected_pixels() {
        let rgba: Vec<u8> = (0..64).flat_map(|i| [i * 3, 20, 30, 200]).collect();
        let input = EffectRaster::from_rgba8(8, 8, rgba.clone()).unwrap().encode_png().unwrap();
        let region = EffectRect { x: 1, y: 1, width: 4, height: 4 };
        let effects = [PixelEffect::Mosaic { rect: region, block_size: 2 }, PixelEffect::Blur { rect: region, radius: 1 }];
        let a = run_pipeline(&input, &effects, PipelineLimits::default()).unwrap();
        let b = run_pipeline(&input, &effects, PipelineLimits::default()).unwrap();
        assert_eq!(a.png, b.png); assert_eq!(&Raster::decode(&a.png).unwrap().rgba_bytes()[..4], &rgba[..4]);
    }
    #[test]
    fn jpeg_input_is_decoded_by_existing_core_and_output_is_owned_png() {
        let jpeg = Raster::decode(&fixture()).unwrap().encode(fershot_image_core::ExportFormat::Jpeg { quality: 90 }).unwrap();
        let out = run_pipeline(&jpeg, &[], PipelineLimits::default()).unwrap();
        assert!(out.png.starts_with(b"\x89PNG\r\n\x1a\n")); assert_eq!(Raster::decode(&out.png).unwrap().dimensions(), (2, 2));
    }
}
