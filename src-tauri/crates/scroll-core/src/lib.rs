//! Bounded deterministic vertical frame stitcher for scrolling captures.
//!
//! Algorithm limits:
//! - Matches contiguous horizontal RGBA8 row bands between consecutive frames within a configurable
//!   per-channel tolerance (`max_channel_diff`).
//! - Handles `ScrollDirection::Down` (appending new bottom rows), `ScrollDirection::Up` (prepending
//!   new top rows), and exact consecutive duplicate frames (deterministically skipped).
//! - Does NOT perform OS scroll synthesis, screen capture, or arbitrary-app sticky-header removal.
use std::fmt;

pub const MAX_STITCH_FRAMES: usize = 64;
pub const MAX_FRAME_WIDTH: u32 = 8_192;
pub const MAX_FRAME_HEIGHT: u32 = 8_192;
pub const MAX_OUTPUT_HEIGHT: u32 = 32_768;
pub const MAX_OUTPUT_PIXELS: u64 = 33_554_432;
pub const MIN_OVERLAP_ROWS: u32 = 2;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ScrollDirection {
    Down,
    Up,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ScrollFrame {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct StitchOptions {
    pub direction: ScrollDirection,
    pub min_overlap_rows: u32,
    pub max_output_height: u32,
    pub max_channel_diff: u8,
}

impl Default for StitchOptions {
    fn default() -> Self {
        Self {
            direction: ScrollDirection::Down,
            min_overlap_rows: MIN_OVERLAP_ROWS,
            max_output_height: 8_192,
            max_channel_diff: 0,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct StitchedOutput {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
    pub matched_overlaps: Vec<u32>,
    pub skipped_duplicates: usize,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum StitchError {
    EmptyFrameList,
    TooManyFrames(usize),
    InvalidFrameDimensions { width: u32, height: u32 },
    MismatchedFrameWidth { expected: u32, actual: u32 },
    MalformedRgbaBuffer { expected: usize, actual: usize },
    InvalidOverlapConfig,
    NoOverlapMatch { frame_index: usize },
    OutputHeightLimitExceeded { attempted: u32, max_allowed: u32 },
}

impl fmt::Display for StitchError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::EmptyFrameList => write!(f, "At least one frame is required for stitching."),
            Self::TooManyFrames(n) => write!(f, "Frame count {n} exceeds limit {MAX_STITCH_FRAMES}."),
            Self::InvalidFrameDimensions { width, height } => {
                write!(f, "Invalid frame dimensions ({width}x{height}).")
            }
            Self::MismatchedFrameWidth { expected, actual } => {
                write!(f, "Frame width mismatch: expected {expected}, got {actual}.")
            }
            Self::MalformedRgbaBuffer { expected, actual } => {
                write!(f, "Frame RGBA byte length mismatch: expected {expected}, got {actual}.")
            }
            Self::InvalidOverlapConfig => write!(f, "Invalid overlap or max_output_height configuration."),
            Self::NoOverlapMatch { frame_index } => {
                write!(f, "No valid vertical overlap found at frame index {frame_index}.")
            }
            Self::OutputHeightLimitExceeded { attempted, max_allowed } => {
                write!(f, "Stitched height {attempted} exceeds maximum {max_allowed}.")
            }
        }
    }
}

impl std::error::Error for StitchError {}

fn validate_frame(frame: &ScrollFrame) -> Result<usize, StitchError> {
    if frame.width == 0
        || frame.height < MIN_OVERLAP_ROWS
        || frame.width > MAX_FRAME_WIDTH
        || frame.height > MAX_FRAME_HEIGHT
        || u64::from(frame.width) * u64::from(frame.height) > MAX_OUTPUT_PIXELS
    {
        return Err(StitchError::InvalidFrameDimensions {
            width: frame.width,
            height: frame.height,
        });
    }
    let row_bytes = usize::try_from(frame.width)
        .ok()
        .and_then(|w| w.checked_mul(4))
        .ok_or(StitchError::InvalidFrameDimensions {
            width: frame.width,
            height: frame.height,
        })?;
    let expected = usize::try_from(frame.height)
        .ok()
        .and_then(|h| h.checked_mul(row_bytes))
        .ok_or(StitchError::InvalidFrameDimensions {
            width: frame.width,
            height: frame.height,
        })?;
    if frame.rgba.len() != expected {
        return Err(StitchError::MalformedRgbaBuffer {
            expected,
            actual: frame.rgba.len(),
        });
    }
    Ok(row_bytes)
}

fn bands_match(a: &[u8], b: &[u8], max_diff: u8) -> bool {
    if a.len() != b.len() {
        return false;
    }
    if max_diff == 0 {
        return a == b;
    }
    a.iter()
        .zip(b.iter())
        .all(|(&x, &y)| x.abs_diff(y) <= max_diff)
}

fn find_overlap_rows(
    prev: &ScrollFrame,
    next: &ScrollFrame,
    row_bytes: usize,
    options: StitchOptions,
) -> Option<u32> {
    let max_overlap = prev.height.min(next.height).saturating_sub(1);
    if max_overlap < options.min_overlap_rows {
        return None;
    }

    for ov in (options.min_overlap_rows..=max_overlap).rev() {
        let band_bytes = (ov as usize) * row_bytes;
        let matched = match options.direction {
            ScrollDirection::Down => {
                let prev_start = prev.rgba.len() - band_bytes;
                let prev_band = &prev.rgba[prev_start..];
                let next_band = &next.rgba[..band_bytes];
                bands_match(prev_band, next_band, options.max_channel_diff)
            }
            ScrollDirection::Up => {
                let prev_band = &prev.rgba[..band_bytes];
                let next_start = next.rgba.len() - band_bytes;
                let next_band = &next.rgba[next_start..];
                bands_match(prev_band, next_band, options.max_channel_diff)
            }
        };
        if matched {
            return Some(ov);
        }
    }
    None
}

pub fn stitch_frames(
    frames: &[ScrollFrame],
    options: StitchOptions,
) -> Result<StitchedOutput, StitchError> {
    if frames.is_empty() {
        return Err(StitchError::EmptyFrameList);
    }
    if frames.len() > MAX_STITCH_FRAMES {
        return Err(StitchError::TooManyFrames(frames.len()));
    }
    if options.min_overlap_rows < MIN_OVERLAP_ROWS
        || options.max_output_height == 0
        || options.max_output_height > MAX_OUTPUT_HEIGHT
    {
        return Err(StitchError::InvalidOverlapConfig);
    }

    let first = &frames[0];
    let row_bytes = validate_frame(first)?;
    let max_allowed_height = options.max_output_height.min(MAX_OUTPUT_HEIGHT);
    if first.height > max_allowed_height {
        return Err(StitchError::OutputHeightLimitExceeded {
            attempted: first.height,
            max_allowed: max_allowed_height,
        });
    }

    let mut out_rgba = first.rgba.clone();
    let mut out_height = first.height;
    let mut matched_overlaps = Vec::new();
    let mut skipped_duplicates = 0usize;
    let mut prev = first;

    for (idx, frame) in frames.iter().enumerate().skip(1) {
        if frame.width != first.width {
            return Err(StitchError::MismatchedFrameWidth {
                expected: first.width,
                actual: frame.width,
            });
        }
        validate_frame(frame)?;

        if frame.height == prev.height
            && bands_match(&prev.rgba, &frame.rgba, options.max_channel_diff)
        {
            skipped_duplicates += 1;
            continue;
        }

        let overlap = find_overlap_rows(prev, frame, row_bytes, options)
            .ok_or(StitchError::NoOverlapMatch { frame_index: idx })?;
        let added_rows = frame.height - overlap;
        let next_height = out_height
            .checked_add(added_rows)
            .ok_or(StitchError::OutputHeightLimitExceeded {
                attempted: u32::MAX,
                max_allowed: max_allowed_height,
            })?;
        let next_pixels = u64::from(first.width) * u64::from(next_height);
        if next_height > max_allowed_height || next_pixels > MAX_OUTPUT_PIXELS {
            return Err(StitchError::OutputHeightLimitExceeded {
                attempted: next_height,
                max_allowed: max_allowed_height,
            });
        }

        let overlap_bytes = (overlap as usize) * row_bytes;
        match options.direction {
            ScrollDirection::Down => {
                out_rgba.extend_from_slice(&frame.rgba[overlap_bytes..]);
            }
            ScrollDirection::Up => {
                let keep_bytes = frame.rgba.len() - overlap_bytes;
                let mut combined = Vec::with_capacity(keep_bytes + out_rgba.len());
                combined.extend_from_slice(&frame.rgba[..keep_bytes]);
                combined.extend_from_slice(&out_rgba);
                out_rgba = combined;
            }
        }

        out_height = next_height;
        matched_overlaps.push(overlap);
        prev = frame;
    }

    Ok(StitchedOutput {
        width: first.width,
        height: out_height,
        rgba: out_rgba,
        matched_overlaps,
        skipped_duplicates,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_banded_frame(width: u32, row_values: &[u8]) -> ScrollFrame {
        let mut rgba = Vec::with_capacity((width as usize) * row_values.len() * 4);
        for &val in row_values {
            for _ in 0..width {
                rgba.extend_from_slice(&[val, val.wrapping_add(10), 200, 255]);
            }
        }
        ScrollFrame {
            width,
            height: row_values.len() as u32,
            rgba,
        }
    }

    fn extract_row_first_red(rgba: &[u8], width: u32, height: u32) -> Vec<u8> {
        let row_bytes = (width as usize) * 4;
        (0..(height as usize))
            .map(|r| rgba[r * row_bytes])
            .collect()
    }

    #[test]
    fn stitches_downward_and_upward_frames_skips_duplicates_and_preserves_sources() {
        let f0 = make_banded_frame(4, &[10, 20, 30, 40, 50]);
        let f1_dup = f0.clone();
        let f2 = make_banded_frame(4, &[30, 40, 50, 60, 70]);
        let f3 = make_banded_frame(4, &[50, 60, 70, 80]);
        let inputs = vec![f0.clone(), f1_dup, f2, f3];

        let down = stitch_frames(&inputs, StitchOptions::default()).unwrap();
        assert_eq!(down.width, 4);
        assert_eq!(down.height, 8);
        assert_eq!(down.skipped_duplicates, 1);
        assert_eq!(down.matched_overlaps, vec![3, 3]);
        assert_eq!(
            extract_row_first_red(&down.rgba, down.width, down.height),
            vec![10, 20, 30, 40, 50, 60, 70, 80]
        );
        // Source frames remain unchanged
        assert_eq!(inputs[0], f0);

        // Reverse (Up) scrolling: starts at bottom [40, 50, 60, 70], moves up to [20, 30, 40, 50]
        let up_frames = vec![
            make_banded_frame(4, &[40, 50, 60, 70]),
            make_banded_frame(4, &[20, 30, 40, 50]),
        ];
        let up = stitch_frames(
            &up_frames,
            StitchOptions {
                direction: ScrollDirection::Up,
                ..StitchOptions::default()
            },
        )
        .unwrap();
        assert_eq!(up.height, 6);
        assert_eq!(
            extract_row_first_red(&up.rgba, up.width, up.height),
            vec![20, 30, 40, 50, 60, 70]
        );
    }

    #[test]
    fn rejects_no_match_and_output_height_limit_violations() {
        let f0 = make_banded_frame(4, &[10, 20, 30, 40]);
        let disjoint = make_banded_frame(4, &[90, 91, 92, 93]);

        assert_eq!(
            stitch_frames(&[f0.clone(), disjoint], StitchOptions::default()),
            Err(StitchError::NoOverlapMatch { frame_index: 1 })
        );

        let f1 = make_banded_frame(4, &[30, 40, 50, 60]);
        assert_eq!(
            stitch_frames(
                &[f0, f1],
                StitchOptions {
                    max_output_height: 5,
                    ..StitchOptions::default()
                }
            ),
            Err(StitchError::OutputHeightLimitExceeded {
                attempted: 6,
                max_allowed: 5,
            })
        );
    }
}

