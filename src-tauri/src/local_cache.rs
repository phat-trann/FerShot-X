//! The Local library persists private PNG copies, never user originals.
use crate::imaging::{ImagePayload, NativeError, decode_input, validate_window_label};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use fershot_image_core::{ExportFormat, Raster};
use fershot_local_cache::{CacheEntry, CacheLimits, LocalCache};
use serde::{Deserialize, Serialize};
use std::{fs::File, io::Read, path::Path, sync::Mutex, time::{SystemTime, UNIX_EPOCH}};
use tauri::{Emitter,Manager};

#[derive(Default)]
pub struct LocalStore(pub Mutex<()>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    id: String, name: String, width: u32, height: u32,
    created_at: u64, expires_at: u64, byte_size: u64,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct StoreRequest { id: String, name: String, png_base64: String }

fn fail() -> NativeError { NativeError::new("cache_failed", "Local history is unavailable. The image remains open; retry from the library.") }
fn open(root: &Path) -> Result<LocalCache, NativeError> {
    let cache = LocalCache::open(root, CacheLimits::default()).map_err(|_| fail())?;
    cache.prune_expired().map_err(|_| fail())?;
    Ok(cache)
}
fn root(app: &tauri::AppHandle) -> Result<std::path::PathBuf, NativeError> {
    Ok(app.path().app_data_dir().map_err(|_| fail())?.join("local-cache-v1"))
}
fn dimensions(bytes: &[u8]) -> Result<(u32, u32), NativeError> {
    if bytes.len() < 24 || &bytes[..8] != b"\x89PNG\r\n\x1a\n" || &bytes[12..16] != b"IHDR" { return Err(fail()); }
    let width = u32::from_be_bytes(bytes[16..20].try_into().map_err(|_| fail())?);
    let height = u32::from_be_bytes(bytes[20..24].try_into().map_err(|_| fail())?);
    if width == 0 || height == 0 || width > 16_384 || height > 16_384 || u64::from(width)*u64::from(height) > 16_777_216 { return Err(fail()); }
    Ok((width, height))
}
fn entry(metadata: CacheEntry, width: u32, height: u32) -> Entry {
    Entry { id: metadata.id, name: metadata.name, width, height,
        created_at: metadata.created_at * 1000, expires_at: metadata.expires_at * 1000, byte_size: metadata.byte_size }
}
fn list_at(cache: &LocalCache) -> Result<Vec<Entry>, NativeError> {
    let mut result = Vec::new();
    for metadata in cache.list().map_err(|_| fail())? {
        // Only headers enter the list IPC; opening a row decodes its full PNG separately.
        let mut header = [0u8; 24];
        File::open(cache.root().join(format!("{}.png", metadata.id))).and_then(|mut f| f.read_exact(&mut header)).map_err(|_| fail())?;
        let (width, height) = dimensions(&header)?;
        result.push(entry(metadata, width, height));
    }
    result.reverse();
    Ok(result)
}
fn store_at(cache: &LocalCache, request: StoreRequest, now: u64) -> Result<Entry, NativeError> {
    let raster = decode_input(&request.png_base64)?;
    let (width, height) = raster.dimensions();
    let png = raster.encode(ExportFormat::Png).map_err(|_| fail())?;
    cache.prune(now).map_err(|_| fail())?;
    let metadata = cache.store(&request.id, &request.name, &png, now).map_err(|_| fail())?;
    Ok(entry(metadata, width, height))
}
fn read_at(cache: &LocalCache, id: &str) -> Result<ImagePayload, NativeError> {
    let cached = cache.read(id).map_err(|_| fail())?;
    // Full decoder validation applies only to the explicitly opened row.
    let raster = Raster::decode(&cached.png_bytes).map_err(|_| fail())?;
    let (width, height) = raster.dimensions();
    Ok(ImagePayload { png_base64: STANDARD.encode(&cached.png_bytes), width, height,
        byte_size: cached.png_bytes.len(), display_scale: None })
}

#[tauri::command]
pub async fn local_cache_list(window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<Vec<Entry>, NativeError> {
    crate::library_window::validate_reader(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<LocalStore>(); let _guard = state.0.lock().map_err(|_| fail())?;
        list_at(&open(&root(&app)?)?)
    }).await.map_err(|_| fail())?
}
#[tauri::command]
pub async fn local_cache_store(request: StoreRequest, window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<Entry, NativeError> {
    validate_window_label(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<LocalStore>(); let _guard = state.0.lock().map_err(|_| fail())?;
        let now = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_| fail())?.as_secs();
        let result=store_at(&open(&root(&app)?)?, request, now);
        if result.is_ok(){let _=app.emit_to("library","fershot-library-updated",());}result
    }).await.map_err(|_| fail())?
}
#[tauri::command]
pub async fn local_cache_read(id: String, window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<ImagePayload, NativeError> {
    validate_window_label(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<LocalStore>(); let _guard = state.0.lock().map_err(|_| fail())?;
        read_at(&open(&root(&app)?)?, &id)
    }).await.map_err(|_| fail())?
}
#[tauri::command]
pub async fn local_cache_remove(id: String, window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<bool, NativeError> {
    crate::library_window::validate_reader(window.label())?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<LocalStore>(); let _guard = state.0.lock().map_err(|_| fail())?;
        open(&root(&app)?)?.remove(&id).map_err(|_| fail())
    }).await.map_err(|_| fail())?
}

#[cfg(test)]
mod tests {
    use super::*;
    fn request(id: &str) -> StoreRequest {
        let image = image::RgbaImage::from_pixel(3, 2, image::Rgba([12, 30, 50, 255]));
        let mut bytes = std::io::Cursor::new(Vec::new());
        image::DynamicImage::ImageRgba8(image).write_to(&mut bytes, image::ImageFormat::Png).unwrap();
        StoreRequest { id: id.into(), name: "Local.png".into(), png_base64: STANDARD.encode(bytes.into_inner()) }
    }
    #[test]
    fn persists_headers_lazy_pixels_and_expiry_across_reopen() {
        let dir = tempfile::tempdir().unwrap();
        let cache = LocalCache::open(dir.path(), CacheLimits::default()).unwrap();
        let saved = store_at(&cache, request("capture-1"), 100).unwrap();
        assert_eq!(saved.expires_at, (100 + 30 * 24 * 60 * 60) * 1000);
        drop(cache);
        let reopened = LocalCache::open(dir.path(), CacheLimits::default()).unwrap();
        let rows = list_at(&reopened).unwrap();
        assert_eq!((rows[0].width, rows[0].height), (3, 2));
        assert_eq!(read_at(&reopened, "capture-1").unwrap().width, 3);
        assert!(reopened.prune(100 + 30 * 24 * 60 * 60).unwrap().contains(&"capture-1".into()));
        assert!(list_at(&reopened).unwrap().is_empty());
    }
    #[test]
    fn rejects_fake_png_traversal_and_cannot_delete_originals() {
        let dir = tempfile::tempdir().unwrap();
        let original = dir.path().join("original.png"); std::fs::write(&original, b"user original").unwrap();
        let cache = LocalCache::open(dir.path().join("cache"), CacheLimits::default()).unwrap();
        assert!(store_at(&cache, request("../original"), 100).is_err());
        let mut invalid = request("bad"); invalid.png_base64 = STANDARD.encode(b"\x89PNG\r\n\x1a\nnot an image");
        assert!(store_at(&cache, invalid, 100).is_err());
        assert!(cache.remove("../original").is_err());
        assert_eq!(std::fs::read(original).unwrap(), b"user original");
    }
}

pub fn library_snapshot(app:&tauri::AppHandle,id:&str)->Result<(String,ImagePayload,Option<serde_json::Value>),NativeError>{
 let state=app.state::<LocalStore>();let _lock=state.0.lock().map_err(|_|fail())?;let cache=open(&root(app)?)?;let cached=cache.read(id).map_err(|_|fail())?;let draft=draft_at(&cache,id,&cached.png_bytes)?;let raster=Raster::decode(&cached.png_bytes).map_err(|_|fail())?;let(width,height)=raster.dimensions();let image=ImagePayload{png_base64:STANDARD.encode(&cached.png_bytes),width,height,byte_size:cached.png_bytes.len(),display_scale:None};Ok((cached.metadata.name,image,draft))
}

#[derive(Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct DraftRequest{ id:String,name:String,png_base64:Option<String>,draft:serde_json::Value }
fn checksum(bytes:&[u8])->String{let mut hash=14695981039346656037u64;for byte in bytes{hash^=u64::from(*byte);hash=hash.wrapping_mul(1099511628211);}format!("{hash:016x}")}
fn validate_draft(value:&serde_json::Value,width:u32,height:u32)->Result<(),NativeError>{
 if value.get("schemaVersion").and_then(|v|v.as_u64())!=Some(1)||value.get("width").and_then(|v|v.as_u64())!=Some(u64::from(width))||value.get("height").and_then(|v|v.as_u64())!=Some(u64::from(height)){return Err(fail())}
 let annotations=value.get("annotations").and_then(|v|v.as_array()).ok_or_else(fail)?;let advanced=value.get("advanced").and_then(|v|v.as_array()).ok_or_else(fail)?;if annotations.len()+advanced.len()>1024||serde_json::to_vec(value).map_err(|_|fail())?.len()>32*1024*1024{return Err(fail())}Ok(())
}
#[tauri::command]pub async fn local_cache_save_draft(request:DraftRequest,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<Entry,NativeError>{
 validate_window_label(window.label())?;tauri::async_runtime::spawn_blocking(move||{
 let store=app.state::<LocalStore>();let _lock=store.0.lock().map_err(|_|fail())?;let cache=open(&root(&app)?)?;
 let existing=cache.list().map_err(|_|fail())?.into_iter().find(|row|row.id==request.id);
 let created=existing.as_ref().map(|row|row.created_at).unwrap_or(SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_|fail())?.as_secs());
 // Validate against the decoded replacement before touching a saved image.
 if let Some(ref png)=request.png_base64{let raster=decode_input(png)?;let(w,h)=raster.dimensions();validate_draft(&request.draft,w,h)?;store_at(&cache,StoreRequest{id:request.id.clone(),name:request.name,png_base64:png.clone()},created)?;}
 let image=cache.read(&request.id).map_err(|_|fail())?;let(w,h)=dimensions(&image.png_bytes)?;validate_draft(&request.draft,w,h)?;
 let bytes=serde_json::to_vec(&serde_json::json!({"imageChecksum":checksum(&image.png_bytes),"draft":request.draft})).map_err(|_|fail())?;cache.write_draft(&request.id,&bytes).map_err(|_|fail())?;
 let result=entry(image.metadata,w,h);let _=app.emit_to("library","fershot-library-updated",());Ok(result)
 }).await.map_err(|_|fail())?
}
fn draft_at(cache:&LocalCache,id:&str,png:&[u8])->Result<Option<serde_json::Value>,NativeError>{
 let Some(bytes)=cache.read_draft(id).map_err(|_|fail())? else{return Ok(None)};let envelope:serde_json::Value=serde_json::from_slice(&bytes).map_err(|_|fail())?;if envelope.get("imageChecksum").and_then(|v|v.as_str())!=Some(checksum(png).as_str()){return Err(NativeError::new("cache_failed","The edit draft does not match its image. Both files were preserved."))}let(w,h)=dimensions(png)?;let draft=envelope.get("draft").cloned().ok_or_else(fail)?;validate_draft(&draft,w,h)?;Ok(Some(draft))
}
