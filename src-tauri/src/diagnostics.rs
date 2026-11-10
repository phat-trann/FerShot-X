//! Local structured diagnostics. No request arguments, URLs, file names or free-form error text.
use crate::imaging::{NativeError, validate_window_label};
use serde::{Deserialize, Serialize};
use std::{fs, io::{Read, Write}, path::Path, sync::Mutex, time::{SystemTime, UNIX_EPOCH}};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
const MAX_ENTRIES:usize=500;
const MAX_BYTES:u64=1024*1024;
#[cfg(test)]const RETENTION_MS:u64=7*24*60*60*1000;
#[derive(Default)]pub struct DiagnosticStore(Mutex<()>);
#[derive(Clone, Copy, Serialize, Deserialize)]#[serde(rename_all="snake_case")]pub enum Area{App,Capture,Image,Clipboard,Export,Settings,Ftp}
#[derive(Clone, Copy, Serialize, Deserialize)]#[serde(rename_all="snake_case")]pub enum Event{Started,Completed,Queued,Failed,Cancelled,Recovered,Unhandled}
#[derive(Clone, Copy, Serialize, Deserialize)]#[serde(rename_all="snake_case")]pub enum Code{None,Busy,PermissionDenied,Cancelled,InvalidInput,CaptureFailed,ClipboardFailed,SettingsFailed,FtpFailed,FtpCredentials,FtpAuthentication,FtpConnection,FtpTimeout,FtpTls,AutoScrollFailed,ScrollPermissionDenied,ScrollCoordinatesMissing,ScrollTargetUnavailable,ScrollNoMovement,DisplayChanged,Other}
#[derive(Clone,Copy,Serialize,Deserialize)]#[serde(rename_all="snake_case")]pub enum Stage{RendererIpc,SelectRegion,ResolveRegion,ResolveTarget,PostScroll,CaptureFrame,StitchFrames,EncodeOutput}
#[derive(Clone, Serialize, Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct LogInput{pub area:Area,pub event:Event,pub code:Code,#[serde(default)]pub operation:Option<String>,#[serde(default)]pub stage:Option<Stage>,#[serde(default)]pub duration_ms:Option<u64>,#[serde(default)]pub frame_count:Option<u32>}
fn operation_allowed(value:&str)->bool{matches!(value,"read_capture_upload_mode"|"capture_image"|"capture_scroll_image"|"capture_repeat_area"|"copy_image"|"copy_text"|"copy_library_images"|"save_image"|"process_image"|"import_clipboard"|"library_image"|"library_thumbnail"|"edit_library_image"|"local_cache_save_draft"|"ftp_enqueue"|"ftp_start"|"ftp_remove"|"ftp_delete_remote"|"ftp_read_settings"|"ftp_save_settings"|"ftp_read_preview_auth"|"ftp_save_preview_auth"|"load_application_preferences"|"save_application_preferences"|"renderer_error"|"unhandled_rejection"|"unknown")}

#[derive(Clone, Serialize, Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct Entry{pub id:u64,pub timestamp:u64,#[serde(default="unknown_version")]pub version:String,#[serde(default)]pub build_id:String,#[serde(default)]pub platform:String,#[serde(default)]pub severity:String,#[serde(default)]pub summary:String,#[serde(default)]pub recovery:String,pub area:Area,pub event:Event,pub code:Code,#[serde(default,skip_serializing_if="Option::is_none")]pub operation:Option<String>,#[serde(default,skip_serializing_if="Option::is_none")]pub stage:Option<Stage>,#[serde(default,skip_serializing_if="Option::is_none")]pub duration_ms:Option<u64>,#[serde(default,skip_serializing_if="Option::is_none")]pub frame_count:Option<u32>}
#[derive(Serialize, Deserialize)]#[serde(deny_unknown_fields)]struct File{version:u8,entries:Vec<Entry>}
#[derive(Serialize)]#[serde(rename_all="camelCase")]pub struct Report{app:&'static str,version:&'static str,build_id:&'static str,platform:&'static str,pub entries:Vec<Entry>}
fn unknown_version()->String{"unknown".into()}
fn error()->NativeError{NativeError::new("diagnostics_failed","Local logs are unavailable. No image or credential data has been included.")}
fn now()->u64{SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64}
fn directory(app:&tauri::AppHandle)->Result<std::path::PathBuf,NativeError>{
 let dir=app.path().app_data_dir().map_err(|_|error())?.join("diagnostics");
 if fs::symlink_metadata(&dir).is_ok_and(|m|m.file_type().is_symlink()){return Err(error())}
 fs::create_dir_all(&dir).map_err(|_|error())?;
 #[cfg(unix)]{use std::os::unix::fs::PermissionsExt;fs::set_permissions(&dir,fs::Permissions::from_mode(0o700)).map_err(|_|error())?;}Ok(dir)
}
fn read(dir:&Path)->Result<Vec<Entry>,NativeError>{
 let path=dir.join("events.json");let metadata=match fs::symlink_metadata(&path){Ok(m)=>m,Err(e)if e.kind()==std::io::ErrorKind::NotFound=>return Ok(Vec::new()),Err(_)=>return Err(error())};
 if !metadata.is_file() || metadata.file_type().is_symlink() || metadata.len()>MAX_BYTES{return Err(error())}
 let mut bytes=Vec::new();fs::File::open(path).and_then(|f|f.take(MAX_BYTES+1).read_to_end(&mut bytes)).map_err(|_|error())?;
 if bytes.len() as u64>MAX_BYTES{return Err(error())}
 let file:File=serde_json::from_slice(&bytes).map_err(|_|error())?;if file.version!=1 || file.entries.len()>MAX_ENTRIES{return Err(error())}Ok(file.entries)
}
fn write(dir:&Path,entries:Vec<Entry>)->Result<(),NativeError>{
 let path=dir.join("events.json");if fs::symlink_metadata(&path).is_ok_and(|m|m.file_type().is_symlink()){return Err(error())}
 let readable=format_errors(&entries);let bytes=serde_json::to_vec_pretty(&File{version:1,entries}).map_err(|_|error())?;if bytes.len() as u64>MAX_BYTES{return Err(error())}
 static SEQUENCE:std::sync::atomic::AtomicU64=std::sync::atomic::AtomicU64::new(0);
 let temp=dir.join(format!(".events-{}-{}-{}.tmp",std::process::id(),now(),SEQUENCE.fetch_add(1,std::sync::atomic::Ordering::Relaxed)));
 let mut options=fs::OpenOptions::new();options.write(true).create_new(true);
 #[cfg(unix)]{use std::os::unix::fs::OpenOptionsExt;options.mode(0o600);}
 let mut file=options.open(&temp).map_err(|_|error())?;
 let result=(||{file.write_all(&bytes).and_then(|_|file.sync_all()).map_err(|_|error())?;drop(file);fs::rename(&temp,&path).map_err(|_|error())})();if result.is_err(){let _=fs::remove_file(temp);}result?;write_readable(dir,&readable)
}
fn format_errors(entries:&[Entry])->String{
 let mut text=String::from("FerShot X — technical error log (UTC)\nNo credentials, URLs, filenames or image data.\n\n");
 for entry in entries{let stamp=chrono::DateTime::from_timestamp_millis(entry.timestamp as i64).map(|v|v.to_rfc3339()).unwrap_or_else(||"invalid-time".into());let code=serde_json::to_value(entry.code).unwrap_or_default();let stage=entry.stage.and_then(|s|serde_json::to_value(s).ok()).and_then(|v|v.as_str().map(str::to_owned)).unwrap_or_else(||"unknown".into());
 text.push_str(&format!("[{}] ERROR #{} version={} build={} platform={}\n  operation={} stage={} code={} duration_ms={} frames={}\n  summary: {}\n  recovery: {}\n\n",stamp,entry.id,entry.version,entry.build_id,entry.platform,entry.operation.as_deref().unwrap_or("unknown"),stage,code.as_str().unwrap_or("other"),entry.duration_ms.map(|v|v.to_string()).unwrap_or_else(||"unknown".into()),entry.frame_count.map(|v|v.to_string()).unwrap_or_else(||"unknown".into()),entry.summary,entry.recovery));}
 text
}
fn write_readable(dir:&Path,text:&str)->Result<(),NativeError>{
 let path=dir.join("errors.log");if fs::symlink_metadata(&path).is_ok_and(|m|m.file_type().is_symlink())||text.len()>MAX_BYTES as usize{return Err(error())}let temp=dir.join(format!(".readable-{}-{}.tmp",std::process::id(),now()));let mut options=fs::OpenOptions::new();options.write(true).create_new(true);
 #[cfg(unix)]{use std::os::unix::fs::OpenOptionsExt;options.mode(0o600);}
 let mut file=options.open(&temp).map_err(|_|error())?;let result=(||{file.write_all(text.as_bytes()).and_then(|_|file.sync_all()).map_err(|_|error())?;drop(file);fs::rename(&temp,path).map_err(|_|error())})();if result.is_err(){let _=fs::remove_file(temp);}result
}
pub fn record_scroll_error(app:&tauri::AppHandle,error_value:&NativeError,stage:Stage,duration:u64,frames:u32){
 let code=match error_value.code{"cancelled"=>return,"scroll_permission_denied"=>Code::ScrollPermissionDenied,"scroll_coordinates_missing"=>Code::ScrollCoordinatesMissing,"scroll_target_unavailable"|"active_window_unavailable"=>Code::ScrollTargetUnavailable,"scroll_no_movement"=>Code::ScrollNoMovement,"display_changed"=>Code::DisplayChanged,"permission_denied"=>Code::PermissionDenied,_=>Code::AutoScrollFailed};
 let result=(||{let store=app.state::<DiagnosticStore>();let _lock=store.0.lock().map_err(|_|error())?;append(&directory(app)?,LogInput{area:Area::Capture,event:Event::Failed,code,operation:Some("capture_scroll_image".into()),stage:Some(stage),duration_ms:Some(duration.min(600000)),frame_count:Some(frames.min(64))},now())})();if result.is_ok(){let _=app.emit_to("main","fershot-diagnostics-updated",());}
}
fn append(dir:&Path,input:LogInput,time:u64)->Result<(),NativeError>{
 if !is_error(input.event) { return Ok(()) }
 if input.operation.as_deref().is_some_and(|v|!operation_allowed(v))||input.duration_ms.is_some_and(|v|v>600000)||input.frame_count.is_some_and(|v|v>64){return Err(error())}
 let retention=read_log_settings(dir)?.retention_days as u64*24*60*60*1000;
 let mut entries=read(dir)?;entries.retain(|e|is_error(e.event) && e.timestamp<=time && time-e.timestamp<=retention);
 let id=entries.iter().map(|e|e.id).max().unwrap_or(0).saturating_add(1);entries.push(Entry{id,timestamp:time,version:env!("CARGO_PKG_VERSION").into(),build_id:option_env!("FERSHOT_BUILD_ID").unwrap_or("development").into(),platform:std::env::consts::OS.into(),severity:"error".into(),summary:description(input.code).0.into(),recovery:description(input.code).1.into(),area:input.area,event:input.event,code:input.code,operation:input.operation,stage:input.stage,duration_ms:input.duration_ms,frame_count:input.frame_count});
 if entries.len()>MAX_ENTRIES{entries.drain(0..entries.len()-MAX_ENTRIES);}
 write(dir,entries)
}
pub fn record(app:&tauri::AppHandle,area:Area,event:Event,code:Code){
 // Diagnostics never interrupt the user's image or upload operation.
 if !is_error(event) || matches!(code,Code::Cancelled) { return; }
 let result=(||{let store=app.state::<DiagnosticStore>();let _lock=store.0.lock().map_err(|_|error())?;append(&directory(app)?,LogInput{area,event,code,operation:None,stage:None,duration_ms:None,frame_count:None},now())})();
 if result.is_ok(){let _=app.emit_to("main","fershot-diagnostics-updated",());}
}
fn report(mut entries:Vec<Entry>)->Report{let time=now();entries.retain(|e|is_error(e.event) && e.timestamp<=time);Report{app:"FerShot X",version:env!("CARGO_PKG_VERSION"),build_id:option_env!("FERSHOT_BUILD_ID").unwrap_or("development"),platform:std::env::consts::OS,entries}}
#[tauri::command]pub fn read_diagnostics(window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,DiagnosticStore>)->Result<Report,NativeError>{
 validate_window_label(window.label())?;let _lock=store.0.lock().map_err(|_|error())?;let time=now();let dir=directory(&app)?;let retention=read_log_settings(&dir)?.retention_days as u64*86400000;let entries=read(&dir)?.into_iter().filter(|e|is_error(e.event)&&e.timestamp<=time&&time-e.timestamp<=retention).collect();Ok(report(entries))
}
#[tauri::command]pub fn record_diagnostic(input:LogInput,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{if window.label()!="library"{crate::preferences_window::validate_label(window.label())?;}if !is_error(input.event)||matches!(input.code,Code::Cancelled){return Ok(())}let store=app.state::<DiagnosticStore>();let _lock=store.0.lock().map_err(|_|error())?;append(&directory(&app)?,input,now())?;let _=app.emit_to("main","fershot-diagnostics-updated",());Ok(())}
#[tauri::command]pub fn clear_diagnostics(window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,DiagnosticStore>)->Result<(),NativeError>{validate_window_label(window.label())?;let _lock=store.0.lock().map_err(|_|error())?;write(&directory(&app)?,Vec::new())}
fn save_report(path:&Path,bytes:&[u8])->Result<(),NativeError>{
 let mut options=fs::OpenOptions::new();options.write(true).create_new(true);
 #[cfg(unix)]{use std::os::unix::fs::OpenOptionsExt;options.mode(0o600);}
 let mut file=options.open(path).map_err(|_|NativeError::new("diagnostics_failed","Choose a new log-report filename; existing files are preserved."))?;
 file.write_all(bytes).and_then(|_|file.sync_all()).map_err(|_|error())
}
#[tauri::command]pub async fn export_diagnostics(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<bool,NativeError>{
 validate_window_label(window.label())?;
 tauri::async_runtime::spawn_blocking(move||{
  let bytes={let store=app.state::<DiagnosticStore>();let _lock=store.0.lock().map_err(|_|error())?;serde_json::to_vec_pretty(&report(read(&directory(&app)?)?)).map_err(|_|error())?};
  let selected=app.dialog().file().set_parent(&window).set_title("Export diagnostic logs").set_file_name("FerShot-X-logs.json").add_filter("JSON",&["json"]).blocking_save_file();
  let Some(selected)=selected else{return Ok(false)};let path=selected.into_path().map_err(|_|error())?;save_report(&path,&bytes)?;Ok(true)
 }).await.map_err(|_|error())?
}

fn is_error(event:Event)->bool { matches!(event,Event::Failed|Event::Unhandled) }
fn description(code:Code)->(&'static str,&'static str) { match code {
 Code::PermissionDenied=>("The operating system denied the operation.","Check the app permission in System Settings, then retry."),
 Code::FtpCredentials=>("FTP credentials are unavailable.","Save the FTP password again in Settings > Uploading."),
 Code::FtpAuthentication=>("FTP authentication was rejected.","Verify the username and password in Settings > Uploading."),
 Code::FtpConnection=>("The FTP connection could not be established.","Check network availability and the configured FTP host and port."),
 Code::FtpTimeout=>("The FTP connection or transfer timed out.","Check network and FTP passive-mode availability, then retry the frozen queue item."),
 Code::FtpTls=>("The secure FTP handshake failed.","Verify the server TLS configuration; do not disable transport security blindly."),
 Code::FtpFailed=>("The FTP operation failed.","Inspect the queue status and retry the existing item after correcting settings."),
 Code::AutoScrollFailed=>("Native scrolling capture failed.","Report the operation, stage, duration and frame count in errors.log."),
 Code::ScrollPermissionDenied=>("Posting scroll events was denied by macOS.","Enable FerShot X in Privacy & Security > Accessibility, then retry."),
 Code::ScrollCoordinatesMissing=>("Native selection metadata did not include usable coordinates.","Retry desktop area selection; report ResolveRegion if it repeats."),
 Code::ScrollTargetUnavailable=>("The selected region has no usable target application window.","Select inside visible scrollable content and retry."),
 Code::ScrollNoMovement=>("Scroll events produced no changed frame.","Check Accessibility permission and choose a scrollable pane away from fixed headers."),
 Code::DisplayChanged=>("Display topology changed during capture.","Retry after display geometry is stable."),
 Code::CaptureFailed=>("Native capture failed.","Verify Screen Recording permission and retry capture from the menu."),
 Code::ClipboardFailed=>("Clipboard access failed.","Retry Copy or use Save image to retain the edited image."),
 Code::SettingsFailed=>("Settings could not be read or persisted.","Reopen Settings and check available disk space. Existing settings are preserved."),
 Code::InvalidInput=>("The operation received invalid or unsupported data.","Retry with a supported image and valid settings."),
 Code::Busy=>("An exclusive image operation is already running.","Wait for the current operation to finish before retrying."),
 _=>("An application operation failed.","Report the event timestamp, app build, area and code with reproduction steps.")
} }
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct LogSettings { retention_days:u16 }
fn read_log_settings(dir:&Path)->Result<LogSettings,NativeError>{
 let path=dir.join("settings.json");let meta=match fs::symlink_metadata(&path){Ok(m)=>m,Err(e)if e.kind()==std::io::ErrorKind::NotFound=>return Ok(LogSettings{retention_days:7}),Err(_)=>return Err(error())};
 if !meta.is_file()||meta.file_type().is_symlink()||meta.len()>128{return Err(error())}
 let value:LogSettings=serde_json::from_slice(&fs::read(path).map_err(|_|error())?).map_err(|_|error())?;
 if !(1..=90).contains(&value.retention_days){return Err(error())} Ok(value)
}
fn prune(dir:&Path,time:u64)->Result<(),NativeError>{
 let retention=read_log_settings(dir)?.retention_days as u64*86400000;
 let mut entries=read(dir)?;let old=entries.len();entries.retain(|e|is_error(e.event)&&e.timestamp<=time&&time-e.timestamp<=retention);
 if old!=entries.len(){write(dir,entries)?} Ok(())
}
#[tauri::command]pub fn read_log_preferences(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<LogSettings,NativeError>{
 crate::preferences_window::validate_label(window.label())?;let store=app.state::<DiagnosticStore>();let _lock=store.0.lock().map_err(|_|error())?;let dir=directory(&app)?;prune(&dir,now())?;read_log_settings(&dir)
}
#[tauri::command]pub fn save_log_preferences(retention_days:u16,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<LogSettings,NativeError>{
 crate::preferences_window::validate_label(window.label())?;
 if !(1..=90).contains(&retention_days){return Err(NativeError::new("invalid_input","Choose between 1 and 90 days."))}
 let store=app.state::<DiagnosticStore>();let _lock=store.0.lock().map_err(|_|error())?;let dir=directory(&app)?;read_log_settings(&dir)?;read(&dir)?;
 let value=LogSettings{retention_days};let bytes=serde_json::to_vec_pretty(&value).map_err(|_|error())?;
 let temp=dir.join(format!(".settings-{}-{}.tmp",std::process::id(),now()));let mut opts=fs::OpenOptions::new();opts.write(true).create_new(true);
 #[cfg(unix)]{use std::os::unix::fs::OpenOptionsExt;opts.mode(0o600);}
 let mut file=opts.open(&temp).map_err(|_|error())?;
 let result=(||{file.write_all(&bytes).and_then(|_|file.sync_all()).map_err(|_|error())?;drop(file);fs::rename(&temp,dir.join("settings.json")).map_err(|_|error())})();if result.is_err(){let _=fs::remove_file(&temp);}result?;
 prune(&dir,now())?;Ok(value)
}
#[tauri::command]pub async fn open_logs_folder(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{
 crate::preferences_window::validate_label(window.label())?;
 tauri::async_runtime::spawn_blocking(move||{
  let dir={let store=app.state::<DiagnosticStore>();let _lock=store.0.lock().map_err(|_|error())?;let dir=directory(&app)?;prune(&dir,now())?;write_readable(&dir,&format_errors(&read(&dir)?))?;dir};
  #[cfg(target_os="macos")]let status=std::process::Command::new("/usr/bin/open").arg(&dir).status().map_err(|_|error())?;
  #[cfg(not(target_os="macos"))]let status=std::process::Command::new(if cfg!(windows){"explorer"}else{"xdg-open"}).arg(&dir).status().map_err(|_|error())?;
  if status.success(){Ok(())}else{Err(error())}
 }).await.map_err(|_|error())?
}
pub fn start_cleanup(app:&tauri::AppHandle){
 let app=app.clone();std::thread::spawn(move||loop{
  {let store=app.state::<DiagnosticStore>();if let Ok(_lock)=store.0.lock(){if let Ok(dir)=directory(&app){let _=prune(&dir,now());}}}
  std::thread::sleep(std::time::Duration::from_secs(3600));
 });
}

#[cfg(test)]mod tests{
 use super::*;
 fn input()->LogInput{LogInput{area:Area::Ftp,event:Event::Failed,code:Code::FtpAuthentication,operation:None,stage:None,duration_ms:None,frame_count:None}}
 #[test]fn success_and_cancel_events_are_not_persisted(){let dir=tempfile::tempdir().unwrap();for event in [Event::Started,Event::Completed,Event::Queued,Event::Recovered,Event::Cancelled]{append(dir.path(),LogInput{event,..input()},1).unwrap();}assert!(read(dir.path()).unwrap().is_empty());}
 #[test]fn configurable_retention_prunes_without_new_errors(){let dir=tempfile::tempdir().unwrap();fs::write(dir.path().join("settings.json"),br#"{"retentionDays":1}"#).unwrap();append(dir.path(),input(),1).unwrap();prune(dir.path(),86400002).unwrap();assert!(read(dir.path()).unwrap().is_empty());assert_eq!(read_log_settings(dir.path()).unwrap().retention_days,1);}
 #[test]fn invalid_retention_is_preserved_and_error_metadata_is_detailed(){let dir=tempfile::tempdir().unwrap();append(dir.path(),input(),1).unwrap();let entry=read(dir.path()).unwrap().remove(0);assert_eq!(entry.severity,"error");assert!(entry.summary.contains("authentication"));assert!(entry.recovery.contains("Settings"));fs::write(dir.path().join("settings.json"),br#"{"retentionDays":0}"#).unwrap();assert!(prune(dir.path(),9999999999).is_err());assert_eq!(read(dir.path()).unwrap().len(),1);}
 #[test]fn logs_reject_free_text_and_secrets_at_the_schema_boundary(){assert!(serde_json::from_value::<LogInput>(serde_json::json!({"area":"ftp","event":"failed","code":"other","password":"secret"})).is_err());assert!(serde_json::from_value::<LogInput>(serde_json::json!({"area":"ftp","event":"failed","code":"password=secret"})).is_err());}
 #[test]fn events_survive_restart_and_rotation_retains_only_bounded_recent_metadata(){let dir=tempfile::tempdir().unwrap();for i in 0..510{append(dir.path(),input(),i).unwrap();}let saved=read(dir.path()).unwrap();assert_eq!(saved.len(),500);assert_eq!(saved[0].timestamp,10);append(dir.path(),input(),RETENTION_MS+1000).unwrap();assert_eq!(read(dir.path()).unwrap().len(),1);}
 #[test]fn malformed_logs_are_preserved_and_existing_exports_are_never_overwritten(){let dir=tempfile::tempdir().unwrap();let path=dir.path().join("events.json");fs::write(&path,b"bad").unwrap();assert!(append(dir.path(),input(),1).is_err());assert_eq!(fs::read(&path).unwrap(),b"bad");let export=dir.path().join("report.json");save_report(&export,b"first").unwrap();assert!(save_report(&export,b"second").is_err());assert_eq!(fs::read(export).unwrap(),b"first");}
 #[test]fn technical_errors_have_readable_stages_and_reject_free_form_operations(){let dir=tempfile::tempdir().unwrap();let mut event=input();event.operation=Some("capture_scroll_image".into());event.stage=Some(Stage::PostScroll);event.duration_ms=Some(250);event.frame_count=Some(1);append(dir.path(),event.clone(),1).unwrap();let text=fs::read_to_string(dir.path().join("errors.log")).unwrap();assert!(text.contains("operation=capture_scroll_image stage=post_scroll"));assert!(text.contains("duration_ms=250 frames=1"));event.operation=Some("password=secret".into());assert!(append(dir.path(),event,2).is_err());assert!(!fs::read_to_string(dir.path().join("events.json")).unwrap().contains("secret"));}
}
