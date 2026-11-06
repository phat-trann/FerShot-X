use crate::imaging::{decode_input, ImagePayload, NativeError, NativeJobs, validate_window_label};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use ferby_image_core::{MAX_DIMENSION, MAX_INPUT_BYTES, MAX_PIXELS};
use ferby_scroll_core::{ScrollDirection, ScrollFrame, StitchOptions, stitch_frames};
use serde::{Deserialize, Serialize};
use std::io::Cursor;

#[derive(Clone, PartialEq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct DisplayGeometry {
    pub(crate) id: String, pub(crate) x: i32, pub(crate) y: i32, pub(crate) width: u32, pub(crate) height: u32, pub(crate) scale: f64,
}

/// Collection context only; interactive area capture does not expose selected-area provenance.
#[tauri::command]
pub fn capture_display(window: tauri::WebviewWindow) -> Result<DisplayGeometry, NativeError> {
    validate_window_label(window.label())?;
    current_display(&window)
}

pub(crate) fn current_display(window: &tauri::WebviewWindow) -> Result<DisplayGeometry, NativeError> {
    let monitor = window.primary_monitor()
        .map_err(|error| NativeError::new("display_unavailable", error.to_string()))?
        .ok_or_else(|| NativeError::new("display_unavailable", "No primary display is available."))?;
    let position = monitor.position();
    let size = monitor.size();
    let scale = monitor.scale_factor();
    if size.width == 0 || size.height == 0 || !scale.is_finite() || scale <= 0.0 || scale > 8.0 {
        return Err(NativeError::new("display_unavailable", "Invalid primary display metadata."));
    }
    Ok(DisplayGeometry {
        id: format!("primary:{}:{}:{}:{}", position.x, position.y, size.width, size.height),
        x: position.x, y: position.y, width: size.width, height: size.height, scale,
    })
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StitchRequest {
    frames_png_base64: Vec<String>, reverse_direction: bool, max_height: u32,
}

fn stitch(request: StitchRequest) -> Result<ImagePayload, NativeError> {
    if request.frames_png_base64.is_empty() || request.frames_png_base64.len() > 64
        || !(400..=32_768).contains(&request.max_height) {
        return Err(NativeError::new("stitch_limit", "Invalid frame count or output height."));
    }
    let total_encoded = request.frames_png_base64.iter().try_fold(0usize, |total, frame| total.checked_add(frame.len()));
    if total_encoded.is_none_or(|total| total > MAX_INPUT_BYTES.div_ceil(3) * 4) {
        return Err(NativeError::new("stitch_limit", "Combined frame input exceeds 32 MiB."));
    }
    let mut frames = Vec::with_capacity(request.frames_png_base64.len());
    let mut pixels = 0u64;
    for encoded in request.frames_png_base64 {
        let raster = decode_input(&encoded)?;
        let (width, height) = raster.dimensions();
        pixels += u64::from(width) * u64::from(height);
        if pixels > MAX_PIXELS {
            return Err(NativeError::new("stitch_limit", "Combined frame pixels exceed the image budget."));
        }
        frames.push(ScrollFrame { width, height, rgba: raster.rgba_bytes() });
    }
    let output = stitch_frames(&frames, StitchOptions {
        direction: if request.reverse_direction { ScrollDirection::Up } else { ScrollDirection::Down },
        min_overlap_rows: 2, max_output_height: request.max_height.min(MAX_DIMENSION), max_channel_diff: 0,
    }).map_err(|error| NativeError::new("stitch_failed", error.to_string()))?;
    if output.width > MAX_DIMENSION || output.height > MAX_DIMENSION
        || u64::from(output.width) * u64::from(output.height) > MAX_PIXELS {
        return Err(NativeError::new("stitch_limit", "Stitched output exceeds the image budget."));
    }
    let rgba = image::RgbaImage::from_raw(output.width, output.height, output.rgba)
        .ok_or_else(|| NativeError::new("stitch_failed", "Invalid stitched pixel buffer."))?;
    let mut encoded = Cursor::new(Vec::new());
    image::DynamicImage::ImageRgba8(rgba).write_to(&mut encoded, image::ImageFormat::Png)
        .map_err(|error| NativeError::new("encode_failed", error.to_string()))?;
    let bytes = encoded.into_inner();
    if bytes.len() > MAX_INPUT_BYTES {
        return Err(NativeError::new("stitch_limit", "Stitched PNG exceeds 32 MiB."));
    }
    Ok(ImagePayload { png_base64: STANDARD.encode(&bytes), width: output.width, height: output.height,
        byte_size: bytes.len(), display_scale: None })
}

#[tauri::command]
pub async fn stitch_images(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>, request: StitchRequest) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || { let _guard = guard; stitch(request) })
        .await.map_err(|_| NativeError::new("worker_failed", "Stitching stopped unexpectedly."))?
}
