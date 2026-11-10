use crate::imaging::{ImagePayload, NativeError, NativeJobs, validate_window_label};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use fershot_effects_pipeline::{EffectRect, PixelEffect, RgbaColor, PipelineLimits, run_pipeline};
use fershot_image_core::MAX_INPUT_BYTES;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rect { x: u32, y: u32, width: u32, height: u32 }
impl From<Rect> for EffectRect {
    fn from(r: Rect) -> Self { Self { x: r.x, y: r.y, width: r.width, height: r.height } }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Color { r: u8, g: u8, b: u8, a: u8 }
#[derive(Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum Effect {
    Blur { rect: Rect, radius: u32 },
    Mosaic { rect: Rect, #[serde(rename = "blockSize")] block_size: u32 },
    SolidCover { rect: Rect, color: Color },
    TransparentErase { rect: Rect },
}
impl From<Effect> for PixelEffect {
    fn from(effect: Effect) -> Self {
        match effect {
            Effect::Blur { rect, radius } => Self::Blur { rect: rect.into(), radius },
            Effect::Mosaic { rect, block_size } => Self::Mosaic { rect: rect.into(), block_size },
            Effect::SolidCover { rect, color } => Self::SolidCover { rect: rect.into(), color: RgbaColor { r: color.r, g: color.g, b: color.b, a: color.a } },
            Effect::TransparentErase { rect } => Self::TransparentErase { rect: rect.into() },
        }
    }
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EffectRequest { png_base64: String, effect: Effect }

#[tauri::command]
pub async fn apply_image_effect(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>, request: EffectRequest) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    if request.png_base64.is_empty() || request.png_base64.len() > MAX_INPUT_BYTES.div_ceil(3) * 4 {
        return Err(NativeError::new("input_limit", "Effect input exceeds 32 MiB."));
    }
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        let input = STANDARD.decode(request.png_base64)
            .map_err(|_| NativeError::new("invalid_image", "Effect input is not valid base64."))?;
        let output = run_pipeline(&input, &[request.effect.into()], PipelineLimits::default())
            .map_err(|error| NativeError::new(error.code(), error.to_string()))?;
        Ok(ImagePayload { png_base64: STANDARD.encode(&output.png), width: output.width, height: output.height,
            byte_size: output.png.len(), display_scale: None })
    }).await.map_err(|_| NativeError::new("worker_failed", "Image effect stopped unexpectedly."))?
}
