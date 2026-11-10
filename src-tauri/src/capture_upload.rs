//! A separate persisted tray option; Settings saves never overwrite this choice.
use crate::{application_preferences::{self,Document},imaging::NativeError};
use serde::{Deserialize,Serialize};
use std::sync::Mutex;
use tauri::{Manager,Emitter};
static GATE:Mutex<()>=Mutex::new(());
#[derive(Serialize,Deserialize)]#[serde(deny_unknown_fields)]struct Mode{version:u8,enabled:bool}
fn failure()->NativeError{NativeError::new("settings_failed","Automatic upload mode could not be loaded or saved. Existing settings were preserved.")}
pub fn read(app:&tauri::AppHandle)->Result<bool,NativeError>{
 let dir=app.path().app_config_dir().map_err(|_|failure())?;
 let Some(raw)=application_preferences::read_document(&dir,Document::CaptureUpload)?else{return Ok(false)};
 decode(&raw)
}
fn decode(raw:&[u8])->Result<bool,NativeError>{let mode:Mode=serde_json::from_slice(raw).map_err(|_|failure())?;if mode.version!=1{return Err(failure())}Ok(mode.enabled)}
pub fn toggle(app:&tauri::AppHandle)->Result<bool,NativeError>{
 let _guard=GATE.lock().map_err(|_|failure())?;let enabled=!read(app)?;let dir=app.path().app_config_dir().map_err(|_|failure())?;
 let raw=serde_json::to_vec(&Mode{version:1,enabled}).map_err(|_|failure())?;application_preferences::write_document(&dir,Document::CaptureUpload,&raw)?;
 crate::menu_bar::update_capture_upload(app,enabled);let _=app.emit("fershot-capture-upload-changed",enabled);Ok(enabled)
}
#[tauri::command]pub fn read_capture_upload_mode(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<bool,NativeError>{crate::imaging::validate_window_label(window.label())?;read(&app)}
#[cfg(test)]mod tests{#[test]fn modes_are_versioned_and_strict(){assert!(!super::decode(br#"{"version":1,"enabled":false}"#).unwrap());assert!(super::decode(br#"{"version":1,"enabled":true}"#).unwrap());assert!(super::decode(br#"{"version":2,"enabled":true}"#).is_err());assert!(super::decode(br#"{"version":1,"enabled":true,"password":"secret"}"#).is_err());}}
