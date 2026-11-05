use base64::{Engine as _, engine::general_purpose::STANDARD};
use ferby_capture_core::{CaptureError, CaptureMode};
use ferby_image_core::{CropRect, ExportFormat, MAX_INPUT_BYTES, Raster};
use serde::{Deserialize, Serialize};
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize)]
pub struct NativeError {
    pub code: &'static str,
    pub message: String,
}
impl NativeError {
    pub(crate) fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }
}

#[derive(Default)]
pub struct NativeJobs {
    busy: Arc<AtomicBool>,
}
pub(crate) struct JobGuard(Arc<AtomicBool>);
impl Drop for JobGuard {
    fn drop(&mut self) {
        self.0.store(false, Ordering::Release);
    }
}
impl NativeJobs {
    pub(crate) fn acquire(&self) -> Result<JobGuard, NativeError> {
        self.busy
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .map_err(|_| NativeError::new("busy", "Another image operation is still running."))?;
        Ok(JobGuard(Arc::clone(&self.busy)))
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ImagePayload {
    pub(crate) png_base64: String,
    pub(crate) width: u32,
    pub(crate) height: u32,
    pub(crate) byte_size: usize,
}

#[derive(Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Fullscreen,
    Area,
    Window,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Crop {
    x: u32,
    y: u32,
    width: u32,
    height: u32,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Resize {
    width: u32,
    height: u32,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProcessRequest {
    png_base64: String,
    crop: Option<Crop>,
    resize: Option<Resize>,
}

pub(crate) fn decode_input(text: &str) -> Result<Raster, NativeError> {
    if text.len() > MAX_INPUT_BYTES.div_ceil(3) * 4 {
        return Err(NativeError::new("input_limit", "Image input is too large."));
    }
    let bytes = STANDARD
        .decode(text)
        .map_err(|_| NativeError::new("invalid_input", "Image payload is not valid base64."))?;
    Raster::decode(&bytes).map_err(|error| NativeError::new("invalid_image", error.to_string()))
}

pub(crate) fn payload(raster: Raster) -> Result<ImagePayload, NativeError> {
    let (width, height) = raster.dimensions();
    let bytes = raster
        .encode(ExportFormat::Png)
        .map_err(|error| NativeError::new("encode_failed", error.to_string()))?;
    if bytes.len() > MAX_INPUT_BYTES {
        return Err(NativeError::new(
            "output_limit",
            "The processed image is too large.",
        ));
    }
    Ok(ImagePayload {
        png_base64: STANDARD.encode(&bytes),
        width,
        height,
        byte_size: bytes.len(),
    })
}

fn process(request: ProcessRequest) -> Result<ImagePayload, NativeError> {
    let mut raster = decode_input(&request.png_base64)?;
    if let Some(crop) = request.crop {
        raster = raster
            .crop(CropRect {
                x: crop.x,
                y: crop.y,
                width: crop.width,
                height: crop.height,
            })
            .map_err(|error| NativeError::new("invalid_bounds", error.to_string()))?;
    }
    if let Some(resize) = request.resize {
        raster = raster
            .resize(resize.width, resize.height)
            .map_err(|error| NativeError::new("invalid_bounds", error.to_string()))?;
    }
    payload(raster)
}

pub(crate) fn validate_window_label(label: &str) -> Result<(), NativeError> {
    if label != "main" {
        return Err(NativeError::new(
            "forbidden_window",
            "Image operations are only available from the main workspace.",
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn process_image(
    request: ProcessRequest,
    window: tauri::WebviewWindow,
    jobs: tauri::State<'_, NativeJobs>,
) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        process(request)
    })
    .await
    .map_err(|_| NativeError::new("worker_failed", "Image processing stopped unexpectedly."))?
}

struct RestoreWindow {
    window: tauri::WebviewWindow,
    was_visible: bool,
}
impl Drop for RestoreWindow {
    fn drop(&mut self) {
        if self.was_visible {
            let _ = self.window.show();
            let _ = self.window.set_focus();
        }
    }
}

#[tauri::command]
pub async fn capture_image(
    mode: Mode,
    window: tauri::WebviewWindow,
    jobs: tauri::State<'_, NativeJobs>,
) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    if !cfg!(target_os = "macos") {
        return Err(NativeError::new(
            "unsupported",
            "Screen capture is currently supported on macOS only.",
        ));
    }
    let guard = jobs.acquire()?;
    let visible = window
        .is_visible()
        .map_err(|e| NativeError::new("window_failed", e.to_string()))?;
    let restore = RestoreWindow {
        window: window.clone(),
        was_visible: visible,
    };
    if visible {
        window
            .hide()
            .map_err(|e| NativeError::new("window_failed", e.to_string()))?;
    }
    tauri::async_runtime::spawn_blocking(move || {
        // Ownership stays in the blocking job even if the IPC caller disappears.
        let (_guard, _restore) = (guard, restore);
        std::thread::sleep(std::time::Duration::from_millis(150));
        let mode = match mode {
            Mode::Fullscreen => CaptureMode::Fullscreen,
            Mode::Area => CaptureMode::Area,
            Mode::Window => CaptureMode::Window,
        };
        let captured = ferby_capture_core::capture(mode).map_err(|error| {
            let code = match error {
                CaptureError::Cancelled => "cancelled",
                CaptureError::PermissionDenied => "permission_denied",
                _ => "capture_failed",
            };
            NativeError::new(code, error.to_string())
        })?;
        let bytes = captured
            .read()
            .map_err(|error| NativeError::new("capture_failed", error.to_string()))?;
        payload(
            Raster::decode(&bytes)
                .map_err(|error| NativeError::new("invalid_image", error.to_string()))?,
        )
    })
    .await
    .map_err(|_| NativeError::new("worker_failed", "Screen capture stopped unexpectedly."))?
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "lowercase")]
pub enum SaveFormat {
    Png,
    Jpeg,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct SaveRequest {
    png_base64: String,
    suggested_name: String,
    format: SaveFormat,
    quality: u8,
}

fn export_format(format: SaveFormat, quality: u8) -> Result<ExportFormat, NativeError> {
    if !(1..=100).contains(&quality) {
        return Err(NativeError::new(
            "invalid_quality",
            "JPEG quality must be from 1 to 100.",
        ));
    }
    Ok(match format {
        SaveFormat::Png => ExportFormat::Png,
        SaveFormat::Jpeg => ExportFormat::Jpeg { quality },
    })
}

pub(crate) fn validate_name(name: &str) -> Result<(), NativeError> {
    if name.is_empty()
        || name.len() > 240
        || name == "."
        || name == ".."
        || name
            .chars()
            .any(|c| c.is_control() || c == '/' || c == '\\')
    {
        return Err(NativeError::new(
            "invalid_name",
            "Choose a short image filename without path separators.",
        ));
    }
    Ok(())
}

#[tauri::command]
pub async fn save_image(
    request: SaveRequest,
    window: tauri::WebviewWindow,
    app: tauri::AppHandle,
    jobs: tauri::State<'_, NativeJobs>,
) -> Result<Option<String>, NativeError> {
    validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        validate_name(&request.suggested_name)?;
        let format = export_format(request.format, request.quality)?;
        let raster = decode_input(&request.png_base64)?;
        let extension = match request.format {
            SaveFormat::Png => "png",
            SaveFormat::Jpeg => "jpg",
        };
        let selected = app
            .dialog()
            .file()
            .set_parent(&window)
            .set_title("Save image")
            .set_file_name(&request.suggested_name)
            .add_filter("Image", &[extension])
            .blocking_save_file();
        let Some(selected) = selected else {
            return Ok(None);
        };
        let mut path = selected
            .into_path()
            .map_err(|e| NativeError::new("invalid_path", e.to_string()))?;
        if path.extension().is_none() {
            path.set_extension(extension);
        }
        let actual_extension = path
            .extension()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();
        let valid_extension = match request.format {
            SaveFormat::Png => actual_extension == "png",
            SaveFormat::Jpeg => actual_extension == "jpg" || actual_extension == "jpeg",
        };
        if !valid_extension {
            return Err(NativeError::new(
                "invalid_extension",
                "The filename extension does not match the chosen image format.",
            ));
        }
        raster.save_new(&path, format).map_err(|e| {
            NativeError::new(
                "save_failed",
                format!("{e} Choose a new filename if the file already exists."),
            )
        })?;
        Ok(Some(path.to_string_lossy().into_owned()))
    })
    .await
    .map_err(|_| NativeError::new("worker_failed", "Image export stopped unexpectedly."))?
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CopyRequest {
    png_base64: String,
}

// Inject the write boundary: tests can verify exact decoded bytes without
// opening, reading, clearing or writing the user's actual system clipboard.
fn copy_with(
    request: CopyRequest,
    sink: impl FnOnce(usize, usize, Vec<u8>) -> Result<(), NativeError>,
) -> Result<(), NativeError> {
    let raster = decode_input(&request.png_base64)?;
    let (width, height) = raster.dimensions();
    sink(width as usize, height as usize, raster.rgba_bytes())
}

#[cfg(target_os = "macos")]
fn system_clipboard(width: usize, height: usize, bytes: Vec<u8>) -> Result<(), NativeError> {
    let mut clipboard = arboard::Clipboard::new()
        .map_err(|e| NativeError::new("clipboard_unavailable", e.to_string()))?;
    clipboard
        .set_image(arboard::ImageData {
            width,
            height,
            bytes: std::borrow::Cow::Owned(bytes),
        })
        .map_err(|e| NativeError::new("clipboard_failed", e.to_string()))
}

#[tauri::command]
pub async fn copy_image(
    request: CopyRequest,
    window: tauri::WebviewWindow,
    jobs: tauri::State<'_, NativeJobs>,
) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (request, jobs);
        Err(NativeError::new(
            "unsupported",
            "Image clipboard copy is currently supported on macOS only.",
        ))
    }
    #[cfg(target_os = "macos")]
    {
        let guard = jobs.acquire()?;
        tauri::async_runtime::spawn_blocking(move || {
            let _guard = guard;
            copy_with(request, system_clipboard)
        })
        .await
        .map_err(|_| NativeError::new("worker_failed", "Image copy stopped unexpectedly."))?
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    const PNG: &str = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAEklEQVR4nGP4z8DAAMIM/4EAAB/uBfsL2WiLAAAAAElFTkSuQmCC";
    #[test]
    fn clipboard_receives_owned_rgba_pixels_once() {
        let mut calls = 0;
        copy_with(
            CopyRequest {
                png_base64: PNG.into(),
            },
            |width, height, bytes| {
                calls += 1;
                assert_eq!((width, height), (2, 2));
                assert_eq!(bytes.len(), 16);
                assert_eq!(&bytes[..4], &[255, 0, 0, 255]);
                Ok(())
            },
        )
        .unwrap();
        assert_eq!(calls, 1);
    }
    #[test]
    fn clipboard_preserves_straight_alpha_and_color_channels() {
        let request = CopyRequest { png_base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMQ0bBpAAABxQD5BVCswgAAAABJRU5ErkJggg==".into() };
        copy_with(request, |w, h, pixels| {
            assert_eq!((w, h), (1, 1));
            assert_eq!(pixels, [20, 40, 60, 128]);
            Ok(())
        })
        .unwrap();
    }
    #[test]
    fn invalid_clipboard_input_never_reaches_write_boundary() {
        for text in ["***", "", "bm90IGFuIGltYWdl"] {
            let result = copy_with(
                CopyRequest {
                    png_base64: text.into(),
                },
                |_, _, _| panic!("invalid input must never open the clipboard"),
            );
            assert!(result.is_err());
        }
        assert!(
            serde_json::from_value::<CopyRequest>(
                serde_json::json!({"pngBase64":PNG,"path":"/tmp/private"})
            )
            .is_err()
        );
    }
    #[test]
    fn clipboard_failure_is_reported_and_job_can_retry() {
        let jobs = NativeJobs::default();
        {
            let _guard = jobs.acquire().unwrap();
            let error = copy_with(
                CopyRequest {
                    png_base64: PNG.into(),
                },
                |_, _, _| {
                    Err(NativeError::new(
                        "clipboard_failed",
                        "Synthetic clipboard busy",
                    ))
                },
            )
            .unwrap_err();
            assert_eq!(error.code, "clipboard_failed");
        }
        assert!(jobs.acquire().is_ok());
    }
    #[test]
    fn mutating_operations_require_the_main_window() {
        assert!(validate_window_label("main").is_ok());
        for label in ["pin", "", "remote", "main-child"] {
            assert_eq!(
                validate_window_label(label).err().unwrap().code,
                "forbidden_window"
            );
        }
    }
    #[test]
    fn typed_process_request_roundtrips_crop_and_resize() {
        let request: ProcessRequest = serde_json::from_value(serde_json::json!({"pngBase64":PNG,"crop":{"x":0,"y":0,"width":1,"height":2},"resize":{"width":4,"height":4}})).unwrap();
        let result = process(request).unwrap();
        assert_eq!((result.width, result.height), (2, 4));
        let value = serde_json::to_value(&result).unwrap();
        assert!(value.get("pngBase64").is_some());
        assert_eq!(
            STANDARD.decode(&result.png_base64).unwrap().len(),
            result.byte_size
        );
    }
    #[test]
    fn ipc_rejects_bad_payloads_negative_coordinates_and_unknown_paths() {
        assert_eq!(decode_input("***").err().unwrap().code, "invalid_input");
        assert!(
            serde_json::from_value::<ProcessRequest>(
                serde_json::json!({"pngBase64":PNG,"crop":{"x":-1,"y":0,"width":1,"height":1}})
            )
            .is_err()
        );
        assert!(
            serde_json::from_value::<ProcessRequest>(
                serde_json::json!({"pngBase64":PNG,"path":"/private/file"})
            )
            .is_err()
        );
        assert!(
            process(ProcessRequest {
                png_base64: PNG.into(),
                crop: Some(Crop {
                    x: 2,
                    y: 0,
                    width: 1,
                    height: 1
                }),
                resize: None
            })
            .is_err()
        );
    }
    #[test]
    fn export_inputs_are_validated_without_opening_a_dialog() {
        for name in ["../photo.png", "", ".", "a\\b.png", "line\nbreak.png"] {
            assert!(validate_name(name).is_err());
        }
        assert!(validate_name("ảnh.png").is_ok());
        assert!(export_format(SaveFormat::Jpeg, 0).is_err());
        assert!(export_format(SaveFormat::Png, 90).is_ok());
    }
    #[test]
    fn exclusive_job_guard_releases_only_after_worker_ownership_ends() {
        let jobs = NativeJobs::default();
        let guard = jobs.acquire().unwrap();
        assert!(jobs.acquire().is_err());
        let worker = std::thread::spawn(move || {
            let _guard = guard;
        });
        worker.join().unwrap();
        assert!(jobs.acquire().is_ok());
    }
}

pub(crate) fn copy_encoded_image(text: &str) -> Result<(), NativeError> {
    #[cfg(target_os = "macos")]
    { let raster = decode_input(text)?; let (width, height) = raster.dimensions(); system_clipboard(width as usize, height as usize, raster.rgba_bytes()) }
    #[cfg(not(target_os = "macos"))]
    { let _ = text; Err(NativeError::new("unsupported", "Clipboard copy is currently supported on macOS only.")) }
}
