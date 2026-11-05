use ferby_vision_core::{
    recognize_with_backend, VisionBackend, VisionError, VisionQrObservation, VisionRecognitionMode,
    VisionRequest, VisionTextObservation, MAX_UTF8_OUTPUT_BYTES,
};
use image::{DynamicImage, ImageFormat, Rgba, RgbaImage};
use std::collections::BTreeSet;
use std::io::Cursor;
use std::sync::atomic::{AtomicUsize, Ordering};

struct CountingBackend {
    languages_calls: AtomicUsize,
    execute_calls: AtomicUsize,
    languages_result: Result<BTreeSet<String>, VisionError>,
    execute_result:
        Result<(Vec<VisionTextObservation>, Vec<VisionQrObservation>), VisionError>,
}

impl VisionBackend for CountingBackend {
    fn supported_languages(&self) -> Result<BTreeSet<String>, VisionError> {
        self.languages_calls.fetch_add(1, Ordering::SeqCst);
        self.languages_result.clone()
    }

    fn execute(
        &self,
        _request: &VisionRequest,
        _resolved_languages: &[String],
        _dimensions: (u32, u32),
    ) -> Result<(Vec<VisionTextObservation>, Vec<VisionQrObservation>), VisionError> {
        self.execute_calls.fetch_add(1, Ordering::SeqCst);
        self.execute_result.clone()
    }
}

fn png_bytes() -> Vec<u8> {
    let image = RgbaImage::from_pixel(1, 1, Rgba([255, 255, 255, 255]));
    let mut bytes = Cursor::new(Vec::new());
    DynamicImage::ImageRgba8(image)
        .write_to(&mut bytes, ImageFormat::Png)
        .expect("synthetic PNG encoding should succeed");
    bytes.into_inner()
}

fn backend() -> CountingBackend {
    let mut languages = BTreeSet::new();
    languages.insert("en-US".to_string());
    CountingBackend {
        languages_calls: AtomicUsize::new(0),
        execute_calls: AtomicUsize::new(0),
        languages_result: Ok(languages),
        execute_result: Ok((Vec::new(), Vec::new())),
    }
}

#[test]
fn invalid_request_is_rejected_before_backend_execute() {
    let fake = backend();
    let mut request = VisionRequest::new(VisionRecognitionMode::Ocr, png_bytes());
    request.max_results = 0;

    assert_eq!(
        recognize_with_backend(&request, &fake),
        Err(VisionError::InvalidMaxResults(0))
    );
    assert_eq!(fake.languages_calls.load(Ordering::SeqCst), 1);
    assert_eq!(fake.execute_calls.load(Ordering::SeqCst), 0);
}

#[test]
fn supported_language_failure_is_returned_without_execution() {
    let fake = CountingBackend {
        languages_calls: AtomicUsize::new(0),
        execute_calls: AtomicUsize::new(0),
        languages_result: Err(VisionError::VisionExecutionFailed(
            "language query failed".to_string(),
        )),
        execute_result: Ok((Vec::new(), Vec::new())),
    };

    assert_eq!(
        recognize_with_backend(
            &VisionRequest::new(VisionRecognitionMode::Ocr, png_bytes()),
            &fake,
        ),
        Err(VisionError::VisionExecutionFailed(
            "language query failed".to_string()
        ))
    );
    assert_eq!(fake.languages_calls.load(Ordering::SeqCst), 1);
    assert_eq!(fake.execute_calls.load(Ordering::SeqCst), 0);
}

#[test]
fn backend_execution_failure_is_propagated() {
    let mut fake = backend();
    fake.execute_result = Err(VisionError::VisionExecutionFailed(
        "request failed".to_string(),
    ));

    assert_eq!(
        recognize_with_backend(
            &VisionRequest::new(VisionRecognitionMode::Ocr, png_bytes()),
            &fake,
        ),
        Err(VisionError::VisionExecutionFailed("request failed".to_string()))
    );
    assert_eq!(fake.execute_calls.load(Ordering::SeqCst), 1);
}

#[test]
fn oversized_utf8_output_is_rejected_at_public_boundary() {
    let mut fake = backend();
    fake.execute_result = Ok((
        vec![VisionTextObservation {
            text: "x".repeat(MAX_UTF8_OUTPUT_BYTES + 1),
            confidence: 1.0,
        }],
        Vec::new(),
    ));

    assert_eq!(
        recognize_with_backend(
            &VisionRequest::new(VisionRecognitionMode::Ocr, png_bytes()),
            &fake,
        ),
        Err(VisionError::OutputTooLarge(MAX_UTF8_OUTPUT_BYTES + 1))
    );
    assert_eq!(fake.execute_calls.load(Ordering::SeqCst), 1);
}
