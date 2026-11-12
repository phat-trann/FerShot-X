use base64::{Engine as _, engine::general_purpose::STANDARD};
use fershot_capture_core::{CaptureError, CaptureMode};
use fershot_image_core::{CropRect, ExportFormat, MAX_INPUT_BYTES, Raster};
use serde::{Deserialize, Serialize};
use std::sync::{
    Arc,
    atomic::{AtomicBool, Ordering},
};
use tauri_plugin_dialog::DialogExt;
use tauri::Manager;

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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) display_scale: Option<f64>,
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
        display_scale: None,
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

// Successful capture presentation belongs to the renderer after its new canvas is painted.
fn restore_after_capture(was_visible:bool,captured:bool,_background:bool)->bool { was_visible&&!captured }

struct RestoreWindow {
    window: tauri::WebviewWindow,
    was_visible: bool,
    captured: bool,
    other_windows: Vec<tauri::WebviewWindow>,
    background:bool,
}
impl Drop for RestoreWindow {
    fn drop(&mut self) {
        for window in &self.other_windows { let _=window.show(); }
        if restore_after_capture(self.was_visible,self.captured,self.background) {
            let _ = self.window.unminimize();
            let _ = self.window.show();
            let _ = self.window.set_focus();
        }
    }
}

#[tauri::command]
pub async fn capture_image(
    mode: Mode,
    background:Option<bool>,
    window: tauri::WebviewWindow,
    jobs: tauri::State<'_, NativeJobs>,
) -> Result<ImagePayload, NativeError> {
    capture_with_region(mode, None, None, None, background.unwrap_or(false), window, jobs).await
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CaptureRegionRequest { display: crate::scrolling::DisplayGeometry, region: Crop }

#[tauri::command]
pub async fn capture_region(request: CaptureRegionRequest, window: tauri::WebviewWindow,
    jobs: tauri::State<'_, NativeJobs>) -> Result<ImagePayload, NativeError> {
    capture_with_region(Mode::Fullscreen, Some(request), None, None, false, window, jobs).await
}

#[tauri::command]
pub async fn capture_active_window(background:Option<bool>,window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    let target = crate::active_window::target()?;
    capture_with_region(Mode::Window, None, Some(target), None, background.unwrap_or(false), window, jobs).await
}

#[tauri::command]
pub async fn capture_repeat_area(background:Option<bool>,window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    let rect = crate::area_capture::previous(&window.state::<crate::area_capture::AreaStore>(), &crate::area_capture::topology(&window)?)?;
    capture_with_region(Mode::Area, None, None, Some(rect), background.unwrap_or(false), window, jobs).await
}

async fn capture_with_region(mode: Mode, region: Option<CaptureRegionRequest>,
    active_window: Option<(u32, u32)>, repeat_rect: Option<fershot_capture_core::ScreenRect>,background:bool,
    window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    if !cfg!(target_os = "macos") {
        return Err(NativeError::new(
            "unsupported",
            "Screen capture is currently supported on macOS only.",
        ));
    }
    let guard = jobs.acquire()?;
    let area_topology = if matches!(mode, Mode::Area) { Some(crate::area_capture::topology(&window)?) } else { None };
    if let Some(request) = &region {
        let current = crate::scrolling::current_display(&window)?;
        if current != request.display { return Err(NativeError::new("display_changed", "Display geometry changed. Define the capture region again.")); }
        let rect = &request.region;
        if rect.width == 0 || rect.height == 0 || rect.x.checked_add(rect.width).is_none_or(|x| x > current.width)
            || rect.y.checked_add(rect.height).is_none_or(|y| y > current.height) {
            return Err(NativeError::new("invalid_bounds", "The repeat region must fit within the primary display's physical pixels."));
        }
    }
    let fullscreen_display=if matches!(mode,Mode::Fullscreen)&&region.is_none(){Some(crate::display_capture::under_pointer()?)}else{None};
    let visible = window
        .is_visible()
        .map_err(|e| NativeError::new("window_failed", e.to_string()))?;
    let other_windows:Vec<_>=["library","preferences"].into_iter().filter_map(|label|window.app_handle().get_webview_window(label)).filter(|w|w.is_visible().unwrap_or(false)).collect();
    let restore = RestoreWindow {
        window: window.clone(),
        was_visible: visible,
        captured: false,
        other_windows,
        background,
    };
    let display_scale = if matches!(mode, Mode::Fullscreen) {
        fullscreen_display.map(|display|display.scale)
            .filter(|value| value.is_finite() && *value > 0.0 && *value <= 8.0)
    } else { None };
    for other in &restore.other_windows { other.hide().map_err(|_|NativeError::new("window_failed","The app could not be hidden for capture."))?; }
    if visible {
        window
            .hide()
            .map_err(|e| NativeError::new("window_failed", e.to_string()))?;
    }
    tauri::async_runtime::spawn_blocking(move || {
        // Ownership stays in the blocking job even if the IPC caller disappears.
        let (_guard, mut _restore) = (guard, restore);
        let mut display_scale = display_scale;
        std::thread::sleep(std::time::Duration::from_millis(150));
        let mode = match mode {
            Mode::Fullscreen => CaptureMode::Fullscreen,
            Mode::Area => CaptureMode::Area,
            Mode::Window => CaptureMode::Window,
        };
        let mode = if let Some(display)=fullscreen_display { crate::display_capture::confirm(display)?;CaptureMode::Region(display.rect) } else if let Some((pid, window)) = active_window {
            crate::active_window::confirm(pid, window)?;
            CaptureMode::WindowId(window)
        } else if let Some(rect) = repeat_rect { CaptureMode::Region(rect) } else { mode };
        let captured = fershot_capture_core::capture(mode).map_err(|error| {
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
        let mut raster = Raster::decode(&bytes).map_err(|error| NativeError::new("invalid_image", error.to_string()))?;
        if let Some(display)=fullscreen_display{crate::display_capture::confirm(display)?;let (w,h)=raster.dimensions();let scale=w as f64/display.rect.width as f64;if (1.0..=8.0).contains(&scale)&&(scale-h as f64/display.rect.height as f64).abs()<0.001{display_scale=Some(scale);}}
        if let Some(request) = region {
            if crate::scrolling::current_display(&_restore.window)? != request.display ||
                raster.dimensions() != (request.display.width, request.display.height) {
                return Err(NativeError::new("display_changed", "Display pixels changed during capture. Define the region again."));
            }
            let rect = request.region;
            raster = raster.crop(CropRect { x: rect.x, y: rect.y, width: rect.width, height: rect.height })
                .map_err(|error| NativeError::new("invalid_bounds", error.to_string()))?;
        }
        if let Some(before) = &area_topology {
            let after = crate::area_capture::topology(&_restore.window)?;
            if repeat_rect.is_some() && before != &after {
                return Err(NativeError::new("display_changed", "Displays changed during repeat capture. Select an area again."));
            }
            let selected = repeat_rect.or_else(|| crate::area_capture::selected_rect(captured.path(), raster.dimensions()));
            if let Some(rect) = selected {
                let dimensions = raster.dimensions();
                let scale = dimensions.0 as f64 / rect.width as f64;
                if (1.0..=8.0).contains(&scale) && (scale - dimensions.1 as f64 / rect.height as f64).abs() < 0.001 { display_scale = Some(scale); }
            }
            if repeat_rect.is_none() {
                crate::area_capture::remember(&_restore.window.state::<crate::area_capture::AreaStore>(), selected, before, &after);
            }
        }
        let mut result = payload(raster)?;
        result.display_scale = display_scale;
        _restore.captured = true;
        Ok(result)
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
    preferences: tauri::State<'_, crate::preferences::PreferenceGate>,
) -> Result<Option<String>, NativeError> {
    validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    let preference_gate = preferences.shared();
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        validate_name(&request.suggested_name)?;
        let format = export_format(request.format, request.quality)?;
        let raster = decode_input(&request.png_base64)?;
        let extension = match request.format {
            SaveFormat::Png => "png",
            SaveFormat::Jpeg => "jpg",
        };
        let destination = {
            use tauri::Manager;
            let path = app.path().app_config_dir().map_err(|e| NativeError::new("settings_failed", e.to_string()))?;
            let _lock = preference_gate.lock().map_err(|_| NativeError::new("settings_failed", "Export preferences unavailable."))?;
            crate::export_destination::load(&path)?
        };
        if let Some(saved) = crate::export_destination::save_to_folder(&raster, &destination, format, extension)? { return Ok(Some(saved)); }
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
    #[test]fn background_success_stays_hidden_and_cancel_restores_prior_view(){assert!(!super::restore_after_capture(true,true,true));assert!(!super::restore_after_capture(false,true,true));assert!(super::restore_after_capture(true,false,true));assert!(!super::restore_after_capture(false,false,true));}
    #[test] fn success_waits_for_renderer_and_cancel_restores_previous_visibility() { assert!(!super::restore_after_capture(false,true,false)); assert!(super::restore_after_capture(true,false,false)); assert!(!super::restore_after_capture(false,false,false)); }
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

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CopyTextRequest { text: String }
#[tauri::command]
pub async fn copy_text(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>, request: CopyTextRequest) -> Result<(), NativeError> {
    crate::library_window::validate_reader(window.label())?;
    if request.text.is_empty() || request.text.len() > 256 * 1024 || request.text.contains('\0') { return Err(NativeError::new("clipboard_limit", "Choose bounded text to copy.")); }
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        #[cfg(target_os = "macos")]
        { let mut clipboard = arboard::Clipboard::new().map_err(|error| NativeError::new("clipboard_unavailable", error.to_string()))?;
          clipboard.set_text(request.text).map_err(|error| NativeError::new("clipboard_failed", error.to_string())) }
        #[cfg(not(target_os = "macos"))]
        { let _ = request; Err(NativeError::new("unsupported", "Text copy currently requires macOS.")) }
    }).await.map_err(|_| NativeError::new("worker_failed", "Text copy stopped unexpectedly."))?
}
