//! Bounded clipboard RGBA image import and PNG encoding with an injectable reader.
use image::{ codecs::png::PngEncoder, ExtendedColorType, ImageEncoder };
use std::fmt;

pub const MAX_CLIPBOARD_DIMENSION: u32 = 16_384;
pub const MAX_CLIPBOARD_PIXELS: u64 = 16_777_216;
pub const MAX_CLIPBOARD_RGBA_BYTES: usize = (MAX_CLIPBOARD_PIXELS as usize) * 4;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RawClipboardRgba {
    pub width: u32,
    pub height: u32,
    pub bytes: Vec<u8>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ImportedClipboardImage {
    pub width: u32,
    pub height: u32,
    pub rgba: Vec<u8>,
    pub png_bytes: Vec<u8>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ClipboardImportError {
    NotAnImage,
    Unavailable(String),
    InvalidDimensions {
        width: u32,
        height: u32,
    },
    DimensionLimitExceeded {
        width: u32,
        height: u32,
    },
    MalformedRgbaLength {
        expected: usize,
        actual: usize,
    },
    EncodeFailed(String),
}

impl fmt::Display for ClipboardImportError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::NotAnImage => write!(f, "Clipboard does not currently contain an image."),
            Self::Unavailable(msg) => write!(f, "System clipboard is unavailable: {msg}"),
            Self::InvalidDimensions { width, height } => {
                write!(f, "Clipboard image dimensions ({width}x{height}) must be positive.")
            }
            Self::DimensionLimitExceeded { width, height } => {
                write!(
                    f,
                    "Clipboard image dimensions ({width}x{height}) exceed supported limits."
                )
            }
            Self::MalformedRgbaLength { expected, actual } => {
                write!(
                    f,
                    "Clipboard RGBA buffer length mismatch: expected {expected} bytes, got {actual}."
                )
            }
            Self::EncodeFailed(msg) => write!(f, "Failed to encode clipboard image as PNG: {msg}"),
        }
    }
}

impl std::error::Error for ClipboardImportError {}

pub trait ClipboardImageReader {
    fn read_rgba(&mut self) -> Result<RawClipboardRgba, ClipboardImportError>;
}

pub struct ArboardClipboardReader;

impl ClipboardImageReader for ArboardClipboardReader {
    fn read_rgba(&mut self) -> Result<RawClipboardRgba, ClipboardImportError> {
        let mut clipboard = arboard::Clipboard::new()
            .map_err(|err| ClipboardImportError::Unavailable(err.to_string()))?;
        let image_data = clipboard.get_image().map_err(|err| match err {
            arboard::Error::ContentNotAvailable => ClipboardImportError::NotAnImage,
            other => ClipboardImportError::Unavailable(other.to_string()),
        })?;
        let width = u32::try_from(image_data.width).map_err(|_| {
            ClipboardImportError::DimensionLimitExceeded {
                width: u32::MAX,
                height: u32::try_from(image_data.height).unwrap_or(u32::MAX),
            }
        })?;
        let height = u32::try_from(image_data.height).map_err(|_| {
            ClipboardImportError::DimensionLimitExceeded {
                width,
                height: u32::MAX,
            }
        })?;
        Ok(RawClipboardRgba {
            width,
            height,
            bytes: image_data.bytes.into_owned(),
        })
    }
}

pub fn validate_and_encode_rgba(
    raw: RawClipboardRgba,
) -> Result<ImportedClipboardImage, ClipboardImportError> {
    if raw.width == 0 || raw.height == 0 {
        return Err(ClipboardImportError::InvalidDimensions {
            width: raw.width,
            height: raw.height,
        });
    }
    let pixel_count = u64::from(raw.width) * u64::from(raw.height);
    if raw.width > MAX_CLIPBOARD_DIMENSION
        || raw.height > MAX_CLIPBOARD_DIMENSION
        || pixel_count > MAX_CLIPBOARD_PIXELS
    {
        return Err(ClipboardImportError::DimensionLimitExceeded {
            width: raw.width,
            height: raw.height,
        });
    }

    let expected_len = usize::try_from(pixel_count)
        .ok()
        .and_then(|px| px.checked_mul(4))
        .filter(|&len| len <= MAX_CLIPBOARD_RGBA_BYTES)
        .ok_or(ClipboardImportError::DimensionLimitExceeded {
            width: raw.width,
            height: raw.height,
        })?;

    if raw.bytes.len() != expected_len {
        return Err(ClipboardImportError::MalformedRgbaLength {
            expected: expected_len,
            actual: raw.bytes.len(),
        });
    }

    let mut png_bytes = Vec::new();
    PngEncoder::new(&mut png_bytes)
        .write_image(
            &raw.bytes,
            raw.width,
            raw.height,
            ExtendedColorType::Rgba8,
        )
        .map_err(|err| ClipboardImportError::EncodeFailed(err.to_string()))?;

    Ok(ImportedClipboardImage {
        width: raw.width,
        height: raw.height,
        rgba: raw.bytes,
        png_bytes,
    })
}

pub fn import_clipboard_image<R: ClipboardImageReader>(
    reader: &mut R,
) -> Result<ImportedClipboardImage, ClipboardImportError> {
    let raw = reader.read_rgba()?;
    validate_and_encode_rgba(raw)
}

#[cfg(test)]
mod tests {
    use super::*;

    struct FakeClipboardReader {
        result: Result<RawClipboardRgba, ClipboardImportError>,
    }

    impl ClipboardImageReader for FakeClipboardReader {
        fn read_rgba(&mut self) -> Result<RawClipboardRgba, ClipboardImportError> {
            self.result.clone()
        }
    }

    #[test]
    fn imports_valid_rgba_with_alpha_and_encodes_png_bytes() {
        let rgba = vec![
            255, 0, 128, 128, // pixel (0,0) semi-transparent
            0, 200, 100, 255, // pixel (1,0) opaque
            10, 20, 30, 0, // pixel (0,1) transparent
            250, 250, 250, 64, // pixel (1,1) quarter-alpha
        ];
        let mut reader = FakeClipboardReader {
            result: Ok(RawClipboardRgba {
                width: 2,
                height: 2,
                bytes: rgba.clone(),
            }),
        };

        let imported = import_clipboard_image(&mut reader).expect("valid clipboard image");
        assert_eq!(imported.width, 2);
        assert_eq!(imported.height, 2);
        assert_eq!(imported.rgba, rgba);
        assert!(imported.png_bytes.starts_with(b"\x89PNG\r\n\x1a\n"));

        let decoded = image::load_from_memory(&imported.png_bytes)
            .expect("decode generated PNG")
            .to_rgba8();
        assert_eq!(decoded.dimensions(), (2, 2));
        assert_eq!(decoded.into_raw(), rgba);
    }

    #[test]
    fn preserves_not_an_image_and_unavailable_reader_errors() {
        let mut not_image = FakeClipboardReader {
            result: Err(ClipboardImportError::NotAnImage),
        };
        assert_eq!(
            import_clipboard_image(&mut not_image),
            Err(ClipboardImportError::NotAnImage)
        );

        let mut unavailable = FakeClipboardReader {
            result: Err(ClipboardImportError::Unavailable("locked".to_string())),
        };
        assert_eq!(
            import_clipboard_image(&mut unavailable),
            Err(ClipboardImportError::Unavailable("locked".to_string()))
        );
    }

    #[test]
    fn rejects_zero_or_oversized_dimensions_and_malformed_rgba_buffers() {
        assert_eq!(
            validate_and_encode_rgba(RawClipboardRgba {
                width: 0,
                height: 4,
                bytes: vec![],
            }),
            Err(ClipboardImportError::InvalidDimensions {
                width: 0,
                height: 4,
            })
        );

        assert_eq!(
            validate_and_encode_rgba(RawClipboardRgba {
                width: MAX_CLIPBOARD_DIMENSION + 1,
                height: 1,
                bytes: vec![],
            }),
            Err(ClipboardImportError::DimensionLimitExceeded {
                width: MAX_CLIPBOARD_DIMENSION + 1,
                height: 1,
            })
        );

        assert_eq!(
            validate_and_encode_rgba(RawClipboardRgba {
                width: 5_000,
                height: 5_000,
                bytes: vec![],
            }),
            Err(ClipboardImportError::DimensionLimitExceeded {
                width: 5_000,
                height: 5_000,
            })
        );

        assert_eq!(
            validate_and_encode_rgba(RawClipboardRgba {
                width: 2,
                height: 2,
                bytes: vec![255; 15],
            }),
            Err(ClipboardImportError::MalformedRgbaLength {
                expected: 16,
                actual: 15,
            })
        );
    }
}

