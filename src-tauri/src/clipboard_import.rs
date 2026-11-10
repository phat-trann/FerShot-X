use crate::imaging::{ImagePayload, NativeError, NativeJobs, validate_window_label};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use fershot_clipboard_import_core::{ClipboardImageReader, ClipboardImportError};
use fershot_image_core::MAX_INPUT_BYTES;

fn import_with(reader: &mut impl ClipboardImageReader) -> Result<ImagePayload, NativeError> {
    let imported = fershot_clipboard_import_core::import_clipboard_image(reader).map_err(|error| {
        let code = match &error { ClipboardImportError::NotAnImage => "clipboard_no_image",
            ClipboardImportError::Unavailable(_) => "clipboard_unavailable", _ => "clipboard_invalid" };
        NativeError::new(code, error.to_string())
    })?;
    if imported.png_bytes.len() > MAX_INPUT_BYTES {
        return Err(NativeError::new("image_limit", "The clipboard image is too large to import."));
    }
    Ok(ImagePayload { png_base64: STANDARD.encode(&imported.png_bytes), width: imported.width,
        height: imported.height, byte_size: imported.png_bytes.len(), display_scale: None })
}

#[tauri::command]
pub async fn import_clipboard(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    if !cfg!(target_os = "macos") { return Err(NativeError::new("unsupported", "Clipboard import is currently supported on macOS only.")); }
    let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard;
        import_with(&mut fershot_clipboard_import_core::ArboardClipboardReader)
    }).await.map_err(|_| NativeError::new("worker_failed", "Clipboard import stopped unexpectedly."))?
}

#[cfg(test)]
mod tests {
    use super::*;
    struct FakeReader(Result<fershot_clipboard_import_core::RawClipboardRgba, ClipboardImportError>);
    impl ClipboardImageReader for FakeReader {
        fn read_rgba(&mut self) -> Result<fershot_clipboard_import_core::RawClipboardRgba, ClipboardImportError> { self.0.clone() }
    }
    #[test]
    fn synthetic_clipboard_image_roundtrips_typed_png_with_alpha() {
        let mut reader = FakeReader(Ok(fershot_clipboard_import_core::RawClipboardRgba { width: 1, height: 1, bytes: vec![20,40,60,128] }));
        let payload = import_with(&mut reader).unwrap();
        assert_eq!((payload.width, payload.height), (1,1));
        let bytes = STANDARD.decode(payload.png_base64).unwrap();
        assert_eq!(bytes.len(), payload.byte_size);
        assert_eq!(fershot_image_core::Raster::decode(&bytes).unwrap().rgba_bytes(), [20,40,60,128]);
    }
    #[test]
    fn fake_reader_errors_preserve_meaning_and_do_not_access_real_clipboard() {
        assert_eq!(import_with(&mut FakeReader(Err(ClipboardImportError::NotAnImage))).unwrap_err().code, "clipboard_no_image");
        assert_eq!(import_with(&mut FakeReader(Err(ClipboardImportError::Unavailable("synthetic".into())))).unwrap_err().code, "clipboard_unavailable");
        let bad = fershot_clipboard_import_core::RawClipboardRgba { width: 0, height: 1, bytes: vec![] };
        assert_eq!(import_with(&mut FakeReader(Ok(bad))).unwrap_err().code, "clipboard_invalid");
    }
}
