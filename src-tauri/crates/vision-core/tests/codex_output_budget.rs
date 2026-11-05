use ferby_vision_core::{
    recognize_with_backend, VisionBackend, VisionError, VisionQrObservation, VisionRecognitionMode,
    VisionRequest, VisionTextObservation, MAX_UTF8_OUTPUT_BYTES,
};
use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use std::collections::BTreeSet;
use std::io::Cursor;

struct FakeBackend {
    text: Vec<VisionTextObservation>,
    qr: Vec<VisionQrObservation>,
}
impl VisionBackend for FakeBackend {
    fn supported_languages(&self) -> Result<BTreeSet<String>, VisionError> {
        Ok(BTreeSet::from(["en-US".to_string()]))
    }
    fn execute(
        &self,
        _: &VisionRequest,
        _: &[String],
        _: (u32, u32),
    ) -> Result<(Vec<VisionTextObservation>, Vec<VisionQrObservation>), VisionError> {
        Ok((self.text.clone(), self.qr.clone()))
    }
}
fn request(mode: VisionRecognitionMode) -> VisionRequest {
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(RgbaImage::from_pixel(1, 1, Rgba([0, 0, 0, 255])))
        .write_to(&mut bytes, ImageFormat::Png).unwrap();
    VisionRequest::new(mode, bytes.into_inner())
}
fn block(bytes: usize) -> VisionTextObservation {
    VisionTextObservation { text: "a".repeat(bytes), confidence: 1.0 }
}

#[test]
fn joining_text_blocks_includes_separator_bytes_in_the_cap() {
    let backend = FakeBackend {
        text: vec![block(MAX_UTF8_OUTPUT_BYTES / 2), block(MAX_UTF8_OUTPUT_BYTES / 2)],
        qr: vec![],
    };
    assert!(matches!(recognize_with_backend(&request(VisionRecognitionMode::Ocr), &backend),
        Err(VisionError::OutputTooLarge(size)) if size == MAX_UTF8_OUTPUT_BYTES + 1));
}

#[test]
fn final_joined_text_at_exact_cap_is_accepted() {
    let backend = FakeBackend {
        text: vec![block(MAX_UTF8_OUTPUT_BYTES / 2), block(MAX_UTF8_OUTPUT_BYTES / 2 - 1)],
        qr: vec![],
    };
    for preserve in [true, false] {
        let mut req = request(VisionRecognitionMode::Ocr);
        req.preserve_line_breaks = preserve;
        let response = recognize_with_backend(&req, &backend).unwrap();
        assert_eq!(response.recognized_text.len(), MAX_UTF8_OUTPUT_BYTES);
    }
}

#[test]
fn qr_symbology_is_part_of_the_string_output_budget() {
    let backend = FakeBackend { text: vec![], qr: vec![VisionQrObservation {
        payload: "a".into(), symbology: "s".repeat(MAX_UTF8_OUTPUT_BYTES),
    }] };
    assert!(matches!(recognize_with_backend(&request(VisionRecognitionMode::Qr), &backend),
        Err(VisionError::OutputTooLarge(size)) if size == MAX_UTF8_OUTPUT_BYTES + 1));
}

#[test]
fn combined_text_separators_and_qr_fields_share_the_cap() {
    let backend = FakeBackend {
        text: vec![block(MAX_UTF8_OUTPUT_BYTES / 2), block(MAX_UTF8_OUTPUT_BYTES / 2 - 4)],
        qr: vec![VisionQrObservation { payload: "a".into(), symbology: "QR".into() }],
    };
    let response = recognize_with_backend(&request(VisionRecognitionMode::Both), &backend).unwrap();
    assert_eq!(response.recognized_text.len() + response.qr_codes[0].payload.len()
        + response.qr_codes[0].symbology.len(), MAX_UTF8_OUTPUT_BYTES);
}
