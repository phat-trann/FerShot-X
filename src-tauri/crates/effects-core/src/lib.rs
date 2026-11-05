//! Bounded non-mutating pixel effects (visual blur/mosaic, solid cover, transparent erase).
//!
//! Security notice: `PixelEffect::Blur` and `PixelEffect::Mosaic` are visual obfuscation
//! filters only and MUST NOT be claimed as irreversible cryptographic redaction.
//! Use `PixelEffect::SolidCover` or `PixelEffect::TransparentErase` to overwrite source pixels completely.
use image::{
    codecs::png::PngEncoder, imageops, DynamicImage, ExtendedColorType, GenericImage,
    GenericImageView, ImageEncoder, Rgba, RgbaImage,
};
use std::fmt;

pub const MAX_EFFECT_DIMENSION: u32 = 16_384;
pub const MAX_EFFECT_PIXELS: u64 = 16_777_216;
pub const MAX_EFFECT_REGION_PIXELS: u64 = 4_194_304;
pub const MAX_BLUR_RADIUS: u32 = 64;
pub const MAX_MOSAIC_BLOCK_SIZE: u32 = 128;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct EffectRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct RgbaColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub a: u8,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PixelEffect {
    /// Visual Gaussian blur within `rect` (`1..=MAX_BLUR_RADIUS`). Not irreversible redaction.
    Blur { rect: EffectRect, radius: u32 },
    /// Visual pixelation mosaic within `rect` (`2..=MAX_MOSAIC_BLOCK_SIZE`). Not irreversible redaction.
    Mosaic { rect: EffectRect, block_size: u32 },
    /// Overwrites every pixel in `rect` with `color`.
    SolidCover { rect: EffectRect, color: RgbaColor },
    /// Sets every pixel in `rect` to `[0, 0, 0, 0]`.
    TransparentErase { rect: EffectRect },
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum EffectsError {
    InvalidImageDimensions,
    ImageLimitExceeded,
    MalformedRgbaBuffer,
    InvalidRegionBounds,
    RegionWorkLimitExceeded,
    InvalidEffectParameter,
    EncodeFailed(String),
}

impl fmt::Display for EffectsError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidImageDimensions => write!(f, "Image dimensions must be positive."),
            Self::ImageLimitExceeded => write!(f, "Image dimensions exceed supported limits."),
            Self::MalformedRgbaBuffer => write!(f, "RGBA byte buffer length does not match width*height*4."),
            Self::InvalidRegionBounds => write!(f, "Effect region is empty, overflows, or exceeds image bounds."),
            Self::RegionWorkLimitExceeded => write!(f, "Effect region exceeds per-operation pixel work cap."),
            Self::InvalidEffectParameter => write!(f, "Blur radius or mosaic block size is out of bounds."),
            Self::EncodeFailed(msg) => write!(f, "PNG encoding failed: {msg}"),
        }
    }
}

impl std::error::Error for EffectsError {}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct EffectRaster(RgbaImage);

fn validate_region(rect: EffectRect, img_width: u32, img_height: u32) -> Result<(), EffectsError> {
    if rect.width == 0 || rect.height == 0 {
        return Err(EffectsError::InvalidRegionBounds);
    }
    let end_x = rect
        .x
        .checked_add(rect.width)
        .ok_or(EffectsError::InvalidRegionBounds)?;
    let end_y = rect
        .y
        .checked_add(rect.height)
        .ok_or(EffectsError::InvalidRegionBounds)?;
    if end_x > img_width || end_y > img_height {
        return Err(EffectsError::InvalidRegionBounds);
    }
    let area = u64::from(rect.width) * u64::from(rect.height);
    if area > MAX_EFFECT_REGION_PIXELS {
        return Err(EffectsError::RegionWorkLimitExceeded);
    }
    Ok(())
}

impl EffectRaster {
    pub fn from_rgba8(width: u32, height: u32, rgba: Vec<u8>) -> Result<Self, EffectsError> {
        if width == 0 || height == 0 {
            return Err(EffectsError::InvalidImageDimensions);
        }
        let pixels = u64::from(width) * u64::from(height);
        if width > MAX_EFFECT_DIMENSION
            || height > MAX_EFFECT_DIMENSION
            || pixels > MAX_EFFECT_PIXELS
        {
            return Err(EffectsError::ImageLimitExceeded);
        }
        let expected_len = usize::try_from(pixels)
            .ok()
            .and_then(|px| px.checked_mul(4))
            .ok_or(EffectsError::ImageLimitExceeded)?;
        if rgba.len() != expected_len {
            return Err(EffectsError::MalformedRgbaBuffer);
        }
        let image = RgbaImage::from_raw(width, height, rgba)
            .ok_or(EffectsError::MalformedRgbaBuffer)?;
        Ok(Self(image))
    }

    pub fn dimensions(&self) -> (u32, u32) {
        self.0.dimensions()
    }

    pub fn pixel(&self, x: u32, y: u32) -> [u8; 4] {
        self.0.get_pixel(x, y).0
    }

    pub fn rgba_bytes(&self) -> Vec<u8> {
        self.0.clone().into_raw()
    }

    pub fn apply(&self, effect: PixelEffect) -> Result<Self, EffectsError> {
        let (width, height) = self.dimensions();
        let mut output = self.0.clone();

        match effect {
            PixelEffect::SolidCover { rect, color } => {
                validate_region(rect, width, height)?;
                let px = Rgba([color.r, color.g, color.b, color.a]);
                for y in rect.y..(rect.y + rect.height) {
                    for x in rect.x..(rect.x + rect.width) {
                        output.put_pixel(x, y, px);
                    }
                }
            }
            PixelEffect::TransparentErase { rect } => {
                validate_region(rect, width, height)?;
                let transparent = Rgba([0, 0, 0, 0]);
                for y in rect.y..(rect.y + rect.height) {
                    for x in rect.x..(rect.x + rect.width) {
                        output.put_pixel(x, y, transparent);
                    }
                }
            }
            PixelEffect::Blur { rect, radius } => {
                validate_region(rect, width, height)?;
                if !(1..=MAX_BLUR_RADIUS).contains(&radius) {
                    return Err(EffectsError::InvalidEffectParameter);
                }
                let sub = imageops::crop_imm(&self.0, rect.x, rect.y, rect.width, rect.height)
                    .to_image();
                let blurred = DynamicImage::ImageRgba8(sub).blur(radius as f32).to_rgba8();
                output
                    .copy_from(&blurred, rect.x, rect.y)
                    .map_err(|_| EffectsError::InvalidRegionBounds)?;
            }
            PixelEffect::Mosaic { rect, block_size } => {
                validate_region(rect, width, height)?;
                if !(2..=MAX_MOSAIC_BLOCK_SIZE).contains(&block_size) {
                    return Err(EffectsError::InvalidEffectParameter);
                }
                let end_x = rect.x + rect.width;
                let end_y = rect.y + rect.height;
                let mut by = rect.y;
                while by < end_y {
                    let bh = block_size.min(end_y - by);
                    let mut bx = rect.x;
                    while bx < end_x {
                        let bw = block_size.min(end_x - bx);
                        let mut sum_r = 0u64;
                        let mut sum_g = 0u64;
                        let mut sum_b = 0u64;
                        let mut sum_a = 0u64;
                        let count = u64::from(bw) * u64::from(bh);
                        for y in by..(by + bh) {
                            for x in bx..(bx + bw) {
                                let p = self.0.get_pixel(x, y).0;
                                sum_r += u64::from(p[0]);
                                sum_g += u64::from(p[1]);
                                sum_b += u64::from(p[2]);
                                sum_a += u64::from(p[3]);
                            }
                        }
                        let avg = Rgba([
                            (sum_r / count) as u8,
                            (sum_g / count) as u8,
                            (sum_b / count) as u8,
                            (sum_a / count) as u8,
                        ]);
                        for y in by..(by + bh) {
                            for x in bx..(bx + bw) {
                                output.put_pixel(x, y, avg);
                            }
                        }
                        bx += bw;
                    }
                    by += bh;
                }
            }
        }

        Ok(Self(output))
    }

    pub fn encode_png(&self) -> Result<Vec<u8>, EffectsError> {
        let (width, height) = self.dimensions();
        let mut out = Vec::new();
        PngEncoder::new(&mut out)
            .write_image(
                self.0.as_raw(),
                width,
                height,
                ExtendedColorType::Rgba8,
            )
            .map_err(|err| EffectsError::EncodeFailed(err.to_string()))?;
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_raster() -> EffectRaster {
        let mut rgba = Vec::with_capacity(8 * 8 * 4);
        for y in 0..8u32 {
            for x in 0..8u32 {
                let is_bright = x >= 4 && y >= 4;
                if is_bright {
                    rgba.extend_from_slice(&[240, 20, 40, 255]);
                } else {
                    rgba.extend_from_slice(&[20, 40, 240, 200]);
                }
            }
        }
        EffectRaster::from_rgba8(8, 8, rgba).unwrap()
    }

    #[test]
    fn applies_solid_cover_and_transparent_erase_with_exact_pixels_and_preserves_source() {
        let source = sample_raster();
        let orig_bytes = source.rgba_bytes();

        let covered = source
            .apply(PixelEffect::SolidCover {
                rect: EffectRect {
                    x: 1,
                    y: 2,
                    width: 3,
                    height: 2,
                },
                color: RgbaColor {
                    r: 12,
                    g: 34,
                    b: 56,
                    a: 255,
                },
            })
            .unwrap();

        assert_eq!(covered.pixel(1, 2), [12, 34, 56, 255]);
        assert_eq!(covered.pixel(3, 3), [12, 34, 56, 255]);
        assert_eq!(covered.pixel(0, 0), [20, 40, 240, 200]);

        let erased = covered
            .apply(PixelEffect::TransparentErase {
                rect: EffectRect {
                    x: 2,
                    y: 2,
                    width: 2,
                    height: 2,
                },
            })
            .unwrap();

        assert_eq!(erased.pixel(2, 2), [0, 0, 0, 0]);
        assert_eq!(erased.pixel(1, 2), [12, 34, 56, 255]);
        assert_eq!(source.rgba_bytes(), orig_bytes);
        assert!(erased.encode_png().unwrap().starts_with(b"\x89PNG\r\n\x1a\n"));
    }

    #[test]
    fn applies_bounded_blur_and_mosaic_within_target_region_only() {
        let source = sample_raster();
        let blurred = source
            .apply(PixelEffect::Blur {
                rect: EffectRect {
                    x: 2,
                    y: 2,
                    width: 4,
                    height: 4,
                },
                radius: 2,
            })
            .unwrap();

        // Outside the blur region (0, 0) is untouched
        assert_eq!(blurred.pixel(0, 0), source.pixel(0, 0));
        // Inside the boundary at (4, 4), red channel is blended down from 240
        assert!(blurred.pixel(4, 4)[0] < 240);

        let mosaiced = source
            .apply(PixelEffect::Mosaic {
                rect: EffectRect {
                    x: 3,
                    y: 3,
                    width: 2,
                    height: 2,
                },
                block_size: 2,
            })
            .unwrap();
        // All 4 pixels in the 2x2 block at (3..5, 3..5) share the exact averaged color
        let block_px = mosaiced.pixel(3, 3);
        assert_eq!(mosaiced.pixel(4, 4), block_px);
        assert_ne!(block_px, [240, 20, 40, 255]);
    }

    #[test]
    fn rejects_invalid_bounds_overflow_and_work_or_parameter_caps() {
        let source = sample_raster();

        assert_eq!(
            source.apply(PixelEffect::TransparentErase {
                rect: EffectRect {
                    x: 6,
                    y: 0,
                    width: 4,
                    height: 2,
                },
            }),
            Err(EffectsError::InvalidRegionBounds)
        );

        assert_eq!(
            source.apply(PixelEffect::TransparentErase {
                rect: EffectRect {
                    x: u32::MAX,
                    y: 0,
                    width: 2,
                    height: 2,
                },
            }),
            Err(EffectsError::InvalidRegionBounds)
        );

        assert_eq!(
            source.apply(PixelEffect::Blur {
                rect: EffectRect {
                    x: 0,
                    y: 0,
                    width: 4,
                    height: 4,
                },
                radius: MAX_BLUR_RADIUS + 1,
            }),
            Err(EffectsError::InvalidEffectParameter)
        );

        assert_eq!(
            validate_region(
                EffectRect {
                    x: 0,
                    y: 0,
                    width: 2500,
                    height: 2000,
                },
                4000,
                4000
            ),
            Err(EffectsError::RegionWorkLimitExceeded)
        );
    }
}

