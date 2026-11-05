//! Bounded PNG/JPEG image transforms and non-overwriting local export.
use image::{DynamicImage, ExtendedColorType, ImageEncoder, ImageFormat, ImageReader, Limits};
use std::{
    fmt,
    io::{self, Cursor, Write},
    path::Path,
};

pub const MAX_INPUT_BYTES: usize = 32 * 1024 * 1024;
pub const MAX_DIMENSION: u32 = 16_384;
pub const MAX_PIXELS: u64 = 16_777_216;

#[derive(Debug)]
pub enum TransformError {
    InvalidBounds,
    InputLimit,
    UnsupportedFormat,
    InvalidQuality,
    Decode(image::ImageError),
    Io(io::Error),
}
impl fmt::Display for TransformError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::InvalidBounds => write!(f, "Image dimensions or crop bounds are invalid."),
            Self::InputLimit => write!(f, "Image exceeds the supported byte or pixel limits."),
            Self::UnsupportedFormat => write!(f, "Native transforms support PNG and JPEG inputs."),
            Self::InvalidQuality => write!(f, "JPEG quality must be from 1 to 100."),
            Self::Decode(e) => write!(f, "Image decoding/encoding failed: {e}"),
            Self::Io(e) => write!(f, "Image export IO failed: {e}"),
        }
    }
}
impl std::error::Error for TransformError {}
impl From<image::ImageError> for TransformError {
    fn from(e: image::ImageError) -> Self {
        Self::Decode(e)
    }
}
impl From<io::Error> for TransformError {
    fn from(e: io::Error) -> Self {
        Self::Io(e)
    }
}

#[derive(Clone, Copy, Debug)]
pub enum ExportFormat {
    Png,
    Jpeg { quality: u8 },
}
#[derive(Clone, Copy, Debug)]
pub struct CropRect {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}
#[derive(Clone)]
pub struct Raster(DynamicImage);

fn dimensions(width: u32, height: u32) -> Result<(), TransformError> {
    if width == 0 || height == 0 {
        return Err(TransformError::InvalidBounds);
    }
    if width > MAX_DIMENSION
        || height > MAX_DIMENSION
        || u64::from(width) * u64::from(height) > MAX_PIXELS
    {
        return Err(TransformError::InputLimit);
    }
    Ok(())
}

fn reader(bytes: &[u8]) -> Result<ImageReader<Cursor<&[u8]>>, TransformError> {
    let mut reader = ImageReader::new(Cursor::new(bytes)).with_guessed_format()?;
    if !matches!(reader.format(), Some(ImageFormat::Png | ImageFormat::Jpeg)) {
        return Err(TransformError::UnsupportedFormat);
    }
    let mut limits = Limits::default();
    limits.max_image_width = Some(MAX_DIMENSION);
    limits.max_image_height = Some(MAX_DIMENSION);
    limits.max_alloc = Some(128 * 1024 * 1024);
    reader.limits(limits);
    Ok(reader)
}

impl Raster {
    pub fn decode(bytes: &[u8]) -> Result<Self, TransformError> {
        if bytes.len() > MAX_INPUT_BYTES {
            return Err(TransformError::InputLimit);
        }
        let (width, height) = reader(bytes)?.into_dimensions()?;
        dimensions(width, height)?;
        let decoded = reader(bytes)?.decode()?;
        dimensions(decoded.width(), decoded.height())?;
        Ok(Self(decoded))
    }
    pub fn dimensions(&self) -> (u32, u32) {
        (self.0.width(), self.0.height())
    }
    pub fn crop(&self, rect: CropRect) -> Result<Self, TransformError> {
        if rect.width == 0
            || rect.height == 0
            || rect
                .x
                .checked_add(rect.width)
                .is_none_or(|x| x > self.0.width())
            || rect
                .y
                .checked_add(rect.height)
                .is_none_or(|y| y > self.0.height())
        {
            return Err(TransformError::InvalidBounds);
        }
        Ok(Self(self.0.crop_imm(
            rect.x,
            rect.y,
            rect.width,
            rect.height,
        )))
    }
    /// Fits within the supplied box using integer dimensions; may upscale.
    pub fn resize(&self, max_width: u32, max_height: u32) -> Result<Self, TransformError> {
        if max_width == 0 || max_height == 0 {
            return Err(TransformError::InvalidBounds);
        }
        if max_width > MAX_DIMENSION || max_height > MAX_DIMENSION {
            return Err(TransformError::InputLimit);
        }
        let (width, height) = self.dimensions();
        let (out_width, out_height) = if u64::from(max_width) * u64::from(height)
            <= u64::from(max_height) * u64::from(width)
        {
            (
                max_width,
                (u64::from(height) * u64::from(max_width) / u64::from(width)).max(1) as u32,
            )
        } else {
            (
                (u64::from(width) * u64::from(max_height) / u64::from(height)).max(1) as u32,
                max_height,
            )
        };
        dimensions(out_width, out_height)?;
        Ok(Self(self.0.resize_exact(
            out_width,
            out_height,
            image::imageops::FilterType::Lanczos3,
        )))
    }
    pub fn encode(&self, format: ExportFormat) -> Result<Vec<u8>, TransformError> {
        let (width, height) = self.dimensions();
        dimensions(width, height)?;
        let rgba = self.0.to_rgba8();
        let mut bytes = Vec::new();
        match format {
            ExportFormat::Png => image::codecs::png::PngEncoder::new(&mut bytes).write_image(
                rgba.as_raw(),
                width,
                height,
                ExtendedColorType::Rgba8,
            )?,
            ExportFormat::Jpeg { quality } => {
                if !(1..=100).contains(&quality) {
                    return Err(TransformError::InvalidQuality);
                }
                let mut rgb =
                    Vec::with_capacity((u64::from(width) * u64::from(height) * 3) as usize);
                for pixel in rgba.pixels() {
                    let alpha = u32::from(pixel[3]);
                    for channel in &pixel.0[..3] {
                        rgb.push(
                            ((u32::from(*channel) * alpha + 255 * (255 - alpha) + 127) / 255) as u8,
                        );
                    }
                }
                image::codecs::jpeg::JpegEncoder::new_with_quality(&mut bytes, quality).encode(
                    &rgb,
                    width,
                    height,
                    ExtendedColorType::Rgb8,
                )?;
            }
        }
        Ok(bytes)
    }
    /// Never replaces an existing destination, including a symlink.
    pub fn save_new(&self, destination: &Path, format: ExportFormat) -> Result<(), TransformError> {
        if destination.file_name().is_none() {
            return Err(TransformError::InvalidBounds);
        }
        let parent = destination
            .parent()
            .filter(|p| !p.as_os_str().is_empty())
            .unwrap_or(Path::new("."));
        let bytes = self.encode(format)?;
        let mut file = tempfile::Builder::new()
            .prefix(".ferby-export-")
            .tempfile_in(parent)?;
        file.write_all(&bytes)?;
        file.as_file().sync_all()?;
        file.persist_noclobber(destination)
            .map_err(|error| TransformError::Io(error.error))?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::{GenericImageView, Rgba, RgbaImage};
    fn fixture() -> Raster {
        Raster(DynamicImage::ImageRgba8(RgbaImage::from_fn(
            4,
            2,
            |x, y| Rgba([(x * 50) as u8, (y * 100) as u8, 20, 255]),
        )))
    }
    #[test]
    fn crop_is_exact_and_source_is_unchanged() {
        let source = fixture();
        let crop = source
            .crop(CropRect {
                x: 1,
                y: 1,
                width: 2,
                height: 1,
            })
            .unwrap();
        assert_eq!(crop.dimensions(), (2, 1));
        assert_eq!(crop.0.get_pixel(0, 0).0, [50, 100, 20, 255]);
        assert_eq!(crop.0.get_pixel(1, 0).0, [100, 100, 20, 255]);
        assert_eq!(source.dimensions(), (4, 2));
    }
    #[test]
    fn crop_rejects_zero_bounds_and_unsigned_overflow() {
        for rect in [
            CropRect {
                x: 0,
                y: 0,
                width: 0,
                height: 1,
            },
            CropRect {
                x: 3,
                y: 0,
                width: 2,
                height: 1,
            },
            CropRect {
                x: u32::MAX,
                y: 0,
                width: 2,
                height: 1,
            },
        ] {
            assert!(matches!(
                fixture().crop(rect),
                Err(TransformError::InvalidBounds)
            ));
        }
    }
    #[test]
    fn resize_fits_box_and_preserves_ratio_as_integer_pixels() {
        let source = fixture();
        assert_eq!(source.resize(2, 10).unwrap().dimensions(), (2, 1));
        assert_eq!(source.resize(20, 3).unwrap().dimensions(), (6, 3));
        assert_eq!(source.resize(1, 1).unwrap().dimensions(), (1, 1));
        assert!(source.resize(0, 10).is_err());
        assert!(source.resize(u32::MAX, 10).is_err());
        assert_eq!(source.dimensions(), (4, 2));
    }
    #[test]
    fn png_is_lossless_and_jpeg_has_independently_decodable_headers() {
        let source = fixture();
        let png = source.encode(ExportFormat::Png).unwrap();
        assert!(png.starts_with(b"\x89PNG\r\n\x1a\n"));
        let decoded = image::load_from_memory(&png).unwrap();
        assert_eq!(decoded.to_rgba8(), source.0.to_rgba8());
        assert_eq!(Raster::decode(&png).unwrap().dimensions(), (4, 2));
        let jpeg = source.encode(ExportFormat::Jpeg { quality: 90 }).unwrap();
        assert!(jpeg.starts_with(&[0xff, 0xd8]));
        assert_eq!(image::load_from_memory(&jpeg).unwrap().dimensions(), (4, 2));
    }
    #[test]
    fn jpeg_flattens_transparent_pixels_to_white_and_validates_quality() {
        let transparent = Raster(DynamicImage::ImageRgba8(RgbaImage::from_pixel(
            2,
            2,
            Rgba([0, 0, 0, 0]),
        )));
        let jpeg = transparent
            .encode(ExportFormat::Jpeg { quality: 100 })
            .unwrap();
        assert!(
            image::load_from_memory(&jpeg)
                .unwrap()
                .to_rgb8()
                .pixels()
                .all(|p| p.0.iter().all(|c| *c >= 250))
        );
        for quality in [0, 101, 255] {
            assert!(matches!(
                transparent.encode(ExportFormat::Jpeg { quality }),
                Err(TransformError::InvalidQuality)
            ));
        }
    }
    #[test]
    fn decoding_rejects_invalid_formats_and_limits() {
        assert!(Raster::decode(b"not an image").is_err());
        assert!(matches!(
            Raster::decode(&vec![0; MAX_INPUT_BYTES + 1]),
            Err(TransformError::InputLimit)
        ));
        assert!(dimensions(0, 1).is_err());
        assert!(dimensions(MAX_DIMENSION + 1, 1).is_err());
        assert!(dimensions(8192, 8192).is_err());
    }
    #[test]
    fn truncated_png_is_not_accepted_as_a_decoded_image() {
        let mut bytes = fixture().encode(ExportFormat::Png).unwrap();
        bytes.truncate(40);
        assert!(Raster::decode(&bytes).is_err());
    }
    #[test]
    fn valid_large_header_is_refused_before_full_decode() {
        let mut bytes = fixture().encode(ExportFormat::Png).unwrap();
        bytes[16..20].copy_from_slice(&(MAX_DIMENSION + 1).to_be_bytes());
        let mut crc = !0u32;
        for byte in &bytes[12..29] {
            crc ^= u32::from(*byte);
            for _ in 0..8 {
                crc = (crc >> 1) ^ (0xedb8_8320u32 & (0u32.wrapping_sub(crc & 1)));
            }
        }
        bytes[29..33].copy_from_slice(&(!crc).to_be_bytes());
        let mut unbounded = ImageReader::new(Cursor::new(&bytes))
            .with_guessed_format()
            .unwrap();
        unbounded.no_limits();
        assert_eq!(unbounded.into_dimensions().unwrap(), (MAX_DIMENSION + 1, 2));
        assert!(Raster::decode(&bytes).is_err());
    }
    #[test]
    fn saving_never_overwrites_and_cleans_up_temporary_files() {
        let dir = tempfile::tempdir().unwrap();
        let destination = dir.path().join("result.png");
        fixture().save_new(&destination, ExportFormat::Png).unwrap();
        let original = std::fs::read(&destination).unwrap();
        assert!(
            fixture()
                .resize(2, 1)
                .unwrap()
                .save_new(&destination, ExportFormat::Png)
                .is_err()
        );
        assert_eq!(original, std::fs::read(&destination).unwrap());
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 1);
    }
    #[test]
    fn concurrent_exports_to_one_name_have_one_winner() {
        let dir = tempfile::tempdir().unwrap();
        let destination = dir.path().join("result.png");
        let handles: Vec<_> = (0..2)
            .map(|_| {
                let path = destination.clone();
                std::thread::spawn(move || fixture().save_new(&path, ExportFormat::Png).is_ok())
            })
            .collect();
        assert_eq!(
            handles
                .into_iter()
                .map(|h| h.join().unwrap())
                .filter(|success| *success)
                .count(),
            1
        );
        assert_eq!(
            Raster::decode(&std::fs::read(&destination).unwrap())
                .unwrap()
                .dimensions(),
            (4, 2)
        );
    }
}
