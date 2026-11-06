//! Native pinned window management and geometry calculation for Ferby Shottr.

use serde::{Deserialize, Serialize};

pub const MAX_PIN_WINDOWS: usize = 4;
pub const MAX_PIN_BYTES: usize = 64 * 1024 * 1024;
pub const MIN_PIN_SCALE: f64 = 0.25;
pub const MAX_PIN_SCALE: f64 = 2.0;
pub const MIN_PIN_OPACITY: f64 = 0.2;
pub const MAX_PIN_OPACITY: f64 = 1.0;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PinWindowGeometry {
    pub width: u32,
    pub height: u32,
    pub scale: f64,
    pub opacity: f64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PinDocumentSummary {
    pub source_id: String,
    pub name: String,
    pub byte_size: usize,
    pub geometry: PinWindowGeometry,
}

pub fn clamp_pin_scale(scale: f64) -> f64 {
    if !scale.is_finite() {
        return 1.0;
    }
    let clamped = scale.clamp(MIN_PIN_SCALE, MAX_PIN_SCALE);
    (clamped * 100.0).round() / 100.0
}

pub fn clamp_pin_opacity(opacity: f64) -> f64 {
    if !opacity.is_finite() {
        return 1.0;
    }
    let clamped = opacity.clamp(MIN_PIN_OPACITY, MAX_PIN_OPACITY);
    (clamped * 100.0).round() / 100.0
}

pub fn calculate_window_geometry(
    base_width: u32,
    base_height: u32,
    scale: f64,
    opacity: f64,
) -> PinWindowGeometry {
    let safe_scale = clamp_pin_scale(scale);
    let safe_opacity = clamp_pin_opacity(opacity);
    let width = ((base_width as f64) * safe_scale).round().max(1.0) as u32;
    let height = ((base_height as f64) * safe_scale).round().max(1.0) as u32;

    PinWindowGeometry {
        width,
        height,
        scale: safe_scale,
        opacity: safe_opacity,
    }
}

pub fn validate_pin_limits(
    active_count: usize,
    current_bytes: usize,
    new_bytes: usize,
) -> Result<(), &'static str> {
    if active_count >= MAX_PIN_WINDOWS {
        return Err("Maximum number of pinned windows reached.");
    }
    if current_bytes.saturating_add(new_bytes) > MAX_PIN_BYTES {
        return Err("Pinned image memory limit exceeded.");
    }
    Ok}

