use crate::imaging::{NativeError, NativeJobs, validate_window_label};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use ferby_vision_core::{VisionRecognitionMode, VisionRequest, VisionResponse, MAX_INPUT_BYTES, MAX_RESULTS_CAP};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RecognitionRequest {
    png_base64: String,
    mode: VisionRecognitionMode,
    languages: Vec<String>,
    preserve_line_breaks: bool,
    max_results: usize,
}

fn decode_request(input: RecognitionRequest) -> Result<VisionRequest, NativeError> {
    if input.png_base64.is_empty() || input.png_base64.len() > MAX_INPUT_BYTES.div_ceil(3) * 4
        || input.max_results == 0 || input.max_results > MAX_RESULTS_CAP
        || input.languages.len() > 128 || input.languages.iter().any(|value| value.len() > 32) {
        return Err(NativeError::new("recognition_limit", "Recognition request exceeds bounds."));
    }
    let bytes = STANDARD.decode(input.png_base64)
        .map_err(|_| NativeError::new("invalid_image", "Recognition image is not valid base64."))?;
    if bytes.is_empty() || bytes.len() > MAX_INPUT_BYTES {
        return Err(NativeError::new("recognition_limit", "Recognition image exceeds bounds."));
    }
    let mut request = VisionRequest::new(input.mode, bytes);
    request.languages = input.languages;
    request.preserve_line_breaks = input.preserve_line_breaks;
    request.max_results = input.max_results;
    Ok(request)
}

#[tauri::command]
pub async fn recognition_languages(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>) -> Result<Vec<String>, NativeError> {
    validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        let languages = ferby_vision_core::runtime_supported_languages()
            .map_err(|error| NativeError::new("recognition_unavailable", error.to_string()))?;
        if languages.len() > 128 || languages.iter().any(|value| value.len() > 32) {
            return Err(NativeError::new("recognition_limit", "Runtime language list exceeds bounds."));
        }
        Ok(languages.into_iter().collect())
    }).await.map_err(|_| NativeError::new("worker_failed", "Language discovery stopped unexpectedly."))?
}

#[tauri::command]
pub async fn recognize_image(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>, request: RecognitionRequest) -> Result<VisionResponse, NativeError> {
    validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        let request = decode_request(request)?;
        ferby_vision_core::recognize(&request)
            .map_err(|error| NativeError::new("recognition_failed", error.to_string()))
    }).await.map_err(|_| NativeError::new("worker_failed", "Recognition stopped unexpectedly."))?
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CopyTextRequest { text: String }

#[tauri::command]
pub async fn copy_recognized_text(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>, request: CopyTextRequest) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    if request.text.is_empty() || request.text.len() > 256 * 1024 {
        return Err(NativeError::new("recognition_limit", "Choose bounded recognized text to copy."));
    }
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        #[cfg(target_os = "macos")]
        {
            let mut clipboard = arboard::Clipboard::new().map_err(|error| NativeError::new("clipboard_unavailable", error.to_string()))?;
            clipboard.set_text(request.text).map_err(|error| NativeError::new("clipboard_failed", error.to_string()))
        }
        #[cfg(not(target_os = "macos"))]
        {
            let _ = request;
            Err(NativeError::new("unsupported", "Text copy is currently supported on macOS only."))
        }
    }).await.map_err(|_| NativeError::new("worker_failed", "Text copy stopped unexpectedly."))?
}
