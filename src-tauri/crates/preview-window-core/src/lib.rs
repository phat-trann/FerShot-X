//! Native floating capture preview window geometry, placement, and auto-dismiss logic for FerShot X.

use serde::{Deserialize, Serialize};

pub const DEFAULT_AUTO_DISMISS_MS: u64 = 5_000;
pub const MIN_AUTO_DISMISS_MS: u64 = 1_000;
pub const MAX_AUTO_DISMISS_MS: u64 = 60_000;
pub const DEFAULT_PREVIEW_MARGIN_PX: i32 = 24;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum PreviewAnchorCorner {
    BottomRight,
    BottomLeft,
    TopRight,
    TopLeft,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PreviewPlacement {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PreviewWindowConfig {
    pub auto_dismiss_ms: Option<u64>,
    pub anchor: PreviewAnchorCorner,
    pub margin_px: i32,
    pub always_on_top: bool,
}

impl Default for PreviewWindowConfig {
    fn default() -> Self {
        Self {
            auto_dismiss_ms: Some(DEFAULT_AUTO_DISMISS_MS),
            anchor: PreviewAnchorCorner::BottomRight,
            margin_px: DEFAULT_PREVIEW_MARGIN_PX,
            always_on_top: true,
        }
    }
}

pub fn clamp_auto_dismiss_ms(ms: u64) -> u64 {
    ms.clamp(MIN_AUTO_DISMISS_MS, MAX_AUTO_DISMISS_MS)
}

pub fn calculate_preview_placement(
    screen_width: u32,
    screen_height: u32,
    preview_width: u32,
    preview_height: u32,
    anchor: PreviewAnchorCorner,
    margin_px: i32,
) -> PreviewPlacement {
    let (x, y) = match anchor {
        PreviewAnchorCorner::BottomRight => (
            (screen_width as i32) - (preview_width as i32) - margin_px,
            (screen_height as i32) - (preview_height as i32) - margin_px,
        ),
        PreviewAnchorCorner::BottomLeft => (
            margin_px,
            (screen_height as i32) - (preview_height as i32) - margin_px,
        ),
        PreviewAnchorCorner::TopRight => (
            (screen_width as i32) - (preview_width as i32) - margin_px,
            margin_px,
        ),
        PreviewAnchorCorner::TopLeft => (margin_px, margin_px),
    };

    PreviewPlacement {
        x: x.max(0),
        y: y.max(0),
        width: preview_width,
        height: preview_height,
    }
}

