//! User-triggered recording lifecycle. Native objects stay on an owned worker.
pub mod model;
pub mod timeline;
mod storage;
mod finalized;
#[cfg(target_os="macos")]mod capture;
#[cfg(target_os="macos")]mod render;
#[cfg(target_os="macos")]pub mod cursor;
#[cfg(target_os="macos")]mod mask;
use model::*;
use crate::imaging::{NativeError,NativeJobs};
use std::sync::{Mutex,mpsc};
use tauri::{Manager,Emitter};
#[derive(Default)]pub struct RecordingStore{recovering:std::sync::atomic::AtomicBool,documents:Mutex<()>,exit_pending:std::sync::atomic::AtomicBool,pending:Mutex<std::collections::VecDeque<VideoOpen>>,active:Mutex<Option<mpsc::Sender<bool>>>,status:Mutex<RecordingStatus>}
#[derive(Clone,serde::Serialize)]#[serde(rename_all="camelCase")]pub struct VideoOpen{pub id:String,pub request_id:Option<String>,pub upload_immediately:bool}
fn queue_open(app:&tauri::AppHandle,id:String,request_id:Option<String>)->Result<(),NativeError>{queue_delivery(app,id,request_id,false)}
fn queue_delivery(app:&tauri::AppHandle,id:String,request_id:Option<String>,upload_immediately:bool)->Result<(),NativeError>{let state=app.state::<RecordingStore>();let mut pending=state.pending.lock().map_err(|_|failed())?;if pending.len()>=4{return Err(NativeError::new("busy","Finish opening the pending videos first."))}pending.push_back(VideoOpen{id,request_id,upload_immediately});drop(pending);let _=app.emit_to("main","fershot-video-open",());Ok(())}
#[tauri::command]pub fn recording_take(window:tauri::WebviewWindow,store:tauri::State<'_,RecordingStore>)->Result<Option<VideoOpen>,NativeError>{crate::imaging::validate_window_label(window.label())?;Ok(store.pending.lock().map_err(|_|failed())?.pop_front())}
#[tauri::command]pub fn recording_open_failed(request_id:String,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{crate::imaging::validate_window_label(window.label())?;if !valid_id(&request_id){return Err(invalid())}app.emit_to("library","fershot-editor-open-result",serde_json::json!({"requestId":request_id,"success":false})).map_err(|_|failed())}
fn failed()->NativeError{NativeError::new("recording_failed","Screen recording could not be completed. Retry from the menu.")}
fn status(app:&tauri::AppHandle,next:RecordingStatus){crate::menu_bar::update_recording(app,next.phase,next.elapsed_ms);if let Ok(mut value)=app.state::<RecordingStore>().status.lock(){*value=next.clone();}let _=app.emit("fershot-recording-state",next);}
fn reader(label:&str)->Result<(),NativeError>{crate::library_window::validate_reader(label)}
#[tauri::command]pub fn read_recording_settings(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<RecordingSettings,NativeError>{crate::preferences_window::validate_label(window.label())?;settings(&app)}
fn settings(app:&tauri::AppHandle)->Result<RecordingSettings,NativeError>{let p=app.path().app_config_dir().map_err(|_|failed())?.join("recording-settings-v1.json");if !p.exists(){return Ok(RecordingSettings::default())}let m=std::fs::symlink_metadata(&p).map_err(|_|failed())?;if !m.is_file()||m.file_type().is_symlink()||m.len()>1024{return Err(failed())}serde_json::from_slice(&std::fs::read(p).map_err(|_|failed())?).map_err(|_|failed())}
#[tauri::command]pub fn save_recording_settings(value:RecordingSettings,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<RecordingSettings,NativeError>{crate::preferences_window::validate_label(window.label())?;let p=app.path().app_config_dir().map_err(|_|failed())?;std::fs::create_dir_all(&p).map_err(|_|failed())?;storage::write(&p.join("recording-settings-v1.json"),&serde_json::to_vec(&value).map_err(|_|failed())?)?;Ok(value)}
#[tauri::command]pub fn read_recording_status(window:tauri::WebviewWindow,store:tauri::State<'_,RecordingStore>)->Result<RecordingStatus,NativeError>{reader(window.label())?;Ok(store.status.lock().map_err(|_|failed())?.clone())}
#[tauri::command]pub async fn recording_list(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<Vec<Clip>,NativeError>{reader(window.label())?;tauri::async_runtime::spawn_blocking(move||{recover_history(&app);storage::list(&app)}).await.map_err(|_|failed())?}
fn recover_history(app:&tauri::AppHandle){
 #[cfg(target_os="macos")]{
  use std::sync::atomic::Ordering;
  if app.state::<RecordingStore>().recovering.swap(true,Ordering::AcqRel){return}
  let handle=app.clone();std::thread::spawn(move||{
   if let Ok(_guard)=handle.state::<NativeJobs>().acquire(){let state=handle.state::<RecordingStore>();if let Ok(_documents)=state.documents.lock(){if storage::recover(&handle).unwrap_or(0)>0{let _=handle.emit("fershot-library-updated",());}}}
   handle.state::<RecordingStore>().recovering.store(false,Ordering::Release);
  });
 }
 #[cfg(not(target_os="macos"))]let _=app;
}

#[tauri::command]pub async fn recording_document(id:String,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<VideoDocument,NativeError>{reader(window.label())?;tauri::async_runtime::spawn_blocking(move||{let mut doc=storage::read(&app,&id)?;if doc.clip.has_audio.is_none(){if let Ok(has_audio)=inspect_audio(std::path::Path::new(&doc.clip.media_path)){doc.clip.has_audio=Some(has_audio);let state=app.state::<RecordingStore>();if let Ok(_lock)=state.documents.lock(){if let Ok(mut current)=storage::read(&app,&id){current.clip.has_audio=Some(has_audio);let _=storage::save(&app,&current);doc=current;}}}}Ok(doc)}).await.map_err(|_|failed())?}
#[tauri::command]pub fn recording_save_draft(id:String,draft:VideoDraft,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{crate::imaging::validate_window_label(window.label())?;let state=app.state::<RecordingStore>();let _lock=state.documents.lock().map_err(|_|failed())?;let mut doc=storage::read_light(&app,&id)?;draft.validate(doc.clip.duration_ms)?;doc.draft=draft;storage::save(&app,&doc)?;let _=app.emit("fershot-library-updated",());Ok(())}
#[tauri::command]pub fn recording_remove(id:String,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{reader(window.label())?;let state=app.state::<RecordingStore>();let _lock=state.documents.lock().map_err(|_|failed())?;storage::remove(&app,&id)?;let _=app.emit("fershot-library-updated",());Ok(())}
#[tauri::command]pub fn stop_recording(window:tauri::WebviewWindow,store:tauri::State<'_,RecordingStore>)->Result<(),NativeError>{crate::imaging::validate_window_label(window.label())?;if let Some(sender)=store.active.lock().map_err(|_|failed())?.as_ref(){sender.send(false).map_err(|_|failed())?;}Ok(())}
pub fn active(app:&tauri::AppHandle)->bool{app.state::<RecordingStore>().active.lock().is_ok_and(|v|v.is_some())}
pub fn stop_from_menu(app:&tauri::AppHandle){if let Ok(active)=app.state::<RecordingStore>().active.lock(){if let Some(tx)=active.as_ref(){let _=tx.send(false);}}}
#[tauri::command]pub async fn start_recording(mode:Option<RecordingMode>,window:tauri::WebviewWindow,app:tauri::AppHandle,jobs:tauri::State<'_,NativeJobs>)->Result<(),NativeError>{
 crate::imaging::validate_window_label(window.label())?;
 #[cfg(not(target_os="macos"))]{let _=(app,jobs);return Err(NativeError::new("unsupported_recording","Screen recording requires macOS 15 or later."));}
 #[cfg(target_os="macos")]{
  if !capture::available(){status(&app,RecordingStatus{phase:"failed",error:Some("unsupported_recording"),..Default::default()});return Err(NativeError::new("unsupported_recording","Screen recording requires macOS 15 or later."))}
  let options=settings(&app)?;let instant=crate::capture_upload::read(&app)?;let target=crate::display_capture::under_pointer()?;let guard=jobs.acquire()?;
  let(tx,rx)=mpsc::channel();{let state=app.state::<RecordingStore>();let mut active=state.active.lock().map_err(|_|failed())?;if active.is_some(){return Err(NativeError::new("busy","A recording is already running."))}*active=Some(tx);}
  status(&app,RecordingStatus{phase:"starting",..Default::default()});
  let visible:Vec<_>=["main","library","preferences"].into_iter().filter_map(|id|app.get_webview_window(id)).filter(|w|w.is_visible().unwrap_or(false)).collect();for w in &visible{if w.hide().is_err(){*app.state::<RecordingStore>().active.lock().map_err(|_|failed())?=None;for old in &visible{let _=old.show();}return Err(failed())}}
  let(begin,ready)=mpsc::sync_channel(1);let handle=app.clone();
  std::thread::spawn(move||{let worker_guard=guard;let result=run(&handle,target,mode.unwrap_or(RecordingMode::Fullscreen),options,rx,begin);drop(worker_guard);*handle.state::<RecordingStore>().active.lock().unwrap_or_else(|e|e.into_inner())=None;match result{Ok(id)=>{if !handle.state::<RecordingStore>().exit_pending.load(std::sync::atomic::Ordering::Acquire){if queue_delivery(&handle,id.clone(),None,instant).is_err(){let _=crate::library_window::show(&handle,"library");}}status(&handle,RecordingStatus{phase:"ready",clip_id:Some(id.clone()),..Default::default()});let _=handle.emit("fershot-library-updated",());let preview_app=handle.clone();std::thread::spawn(move||{if let Ok(doc)=storage::read_light(&preview_app,&id){if let Ok(poster)=render::poster(std::path::Path::new(&doc.clip.media_path)){let state=preview_app.state::<RecordingStore>();if let Ok(_lock)=state.documents.lock(){if let Ok(mut current)=storage::read_light(&preview_app,&id){current.clip.poster=poster;if storage::save(&preview_app,&current).is_ok(){let _=preview_app.emit("fershot-library-updated",());}}}}}});},Err(error)=>{let cancelled=error.code=="cancelled";status(&handle,RecordingStatus{phase:if cancelled{"idle"}else{"failed"},error:if cancelled{None}else{Some("recording_failed")},..Default::default()});if visible.is_empty(){let _=crate::library_window::show(&handle,"library");}else{for w in visible{let _=w.show();}}if !cancelled{crate::diagnostics::record(&handle,crate::diagnostics::Area::Capture,crate::diagnostics::Event::Failed,crate::diagnostics::Code::CaptureFailed);}}}if handle.state::<RecordingStore>().exit_pending.swap(false,std::sync::atomic::Ordering::AcqRel){handle.exit(0);}});
  tauri::async_runtime::spawn_blocking(move||ready.recv().map_err(|_|failed())?).await.map_err(|_|failed())?
 }
}
#[cfg(target_os="macos")]
fn run(app:&tauri::AppHandle,display:crate::display_capture::DisplayTarget,mode:RecordingMode,settings:RecordingSettings,stop:mpsc::Receiver<bool>,ready:mpsc::SyncSender<Result<(),NativeError>>)->Result<String,NativeError>{
 use std::time::{Duration,Instant};use core_graphics::{event::CGEvent,event_source::{CGEventSource,CGEventSourceStateID}};
 unsafe extern "C"{fn CGEventSourceButtonState(state:i32,button:u32)->bool;}
 let id=format!("video-{}-{}",storage::now(),std::process::id());let folder=storage::folder(app,&id)?;std::fs::create_dir(&folder).map_err(|_|failed())?;let path=folder.join("original.mp4");
 let selection=(||{if mode==RecordingMode::Area{
  let before=crate::area_capture::topology(&app.get_webview_window("main").ok_or_else(failed)?)?;
  let selected=fershot_capture_core::capture(fershot_capture_core::CaptureMode::Area).map_err(|error|match error{fershot_capture_core::CaptureError::Cancelled=>NativeError::new("cancelled","Recording selection cancelled."),_=>failed()})?;
  let image=fershot_image_core::Raster::decode(&selected.read().map_err(|_|failed())?).map_err(|_|failed())?;
  let rect=crate::area_capture::selected_rect(selected.path(),image.dimensions()).ok_or_else(||NativeError::new("recording_coordinates_missing","macOS did not provide recording region coordinates. Select again."))?;
  if before!=crate::area_capture::topology(&app.get_webview_window("main").ok_or_else(failed)?)?{return Err(NativeError::new("display_changed","Displays changed during selection."))}
  let target=crate::display_capture::for_region(rect)?;let region=region_on_display(target.rect,rect)?;Ok((target,region))
 }else{let region=CaptureRegion{x:0.,y:0.,width:display.rect.width as f64,height:display.rect.height as f64};Ok((display,region))}})();
 let(display,region)=match selection{Ok(value)=>value,Err(error)=>{let cancelled=error.code=="cancelled";let _=ready.send(Err(error));let _=std::fs::remove_dir_all(&folder);return Err(NativeError::new(if cancelled{"cancelled"}else{"recording_failed"},"Recording selection stopped."))}};
 if stop.try_recv().is_ok(){let _=ready.send(Err(NativeError::new("cancelled","Recording cancelled.")));let _=std::fs::remove_dir_all(&folder);return Err(NativeError::new("cancelled","Recording cancelled."))}
 let capture=capture::start(&path,display,&settings,region);let mut capture=match capture{Ok(value)=>value,Err(error)=>{let _=ready.send(Err(error));let _=std::fs::remove_dir_all(&folder);return Err(failed())}};
 let mask=if mode==RecordingMode::Area{Some(mask::Mask::show(app,display,region)?)}else{None};
 let _=ready.send(Ok(()));status(app,RecordingStatus{phase:"recording",..Default::default()});
 let mut pointer=Vec::new();let mut last_report=Instant::now();let mut interrupted=false;
 loop{
  if stop.recv_timeout(Duration::from_micros(33_334)).is_ok(){break}
  let elapsed=capture.started.elapsed().as_millis()as u64;
  if elapsed>=MAX_DURATION_MS||capture.size()>=MAX_VIDEO_BYTES-16*1024*1024{break}
  if capture.interrupted(){break}
  if settings.record_pointer&&pointer.len()<MAX_SAMPLES{
   if let Ok(source)=CGEventSource::new(CGEventSourceStateID::CombinedSessionState){if let Ok(event)=CGEvent::new(source){let p=event.location();let x=(p.x-display.rect.x as f64-region.x)/region.width;let y=(p.y-display.rect.y as f64-region.y)/region.height;pointer.push(PointerSample{time_ms:elapsed,x:x.clamp(0.,1.),y:y.clamp(0.,1.),visible:(0.0..=1.0).contains(&x)&&(0.0..=1.0).contains(&y),left:unsafe{CGEventSourceButtonState(0,0)},right:unsafe{CGEventSourceButtonState(0,1)}});}}
  }
  if last_report.elapsed()>=Duration::from_secs(1){if crate::display_capture::confirm(capture.display).is_err(){interrupted=true;break}status(app,RecordingStatus{phase:"recording",elapsed_ms:elapsed,..Default::default()});last_report=Instant::now();}
 }
 status(app,RecordingStatus{phase:"stopping",elapsed_ms:capture.started.elapsed().as_millis()as u64,..Default::default()});drop(mask);let finalize=Instant::now();capture.stop().map_err(|error|{crate::diagnostics::record_recording_error(app,if error.code=="recording_stop_failed"{crate::diagnostics::Stage::StopStream}else{crate::diagnostics::Stage::FinishRecording},finalize.elapsed().as_millis()as u64);error})?;let inspect=Instant::now();while !finalized::complete(&path)&&inspect.elapsed()<Duration::from_secs(3){std::thread::sleep(Duration::from_millis(25));}if !finalized::complete(&path){crate::diagnostics::record_recording_error(app,crate::diagnostics::Stage::InspectRecording,inspect.elapsed().as_millis()as u64);return Err(failed())}let(_,_,duration)=render::describe(&path).map_err(|error|{crate::diagnostics::record_recording_error(app,crate::diagnostics::Stage::InspectRecording,inspect.elapsed().as_millis()as u64);error})?;if interrupted||duration<100||duration>MAX_DURATION_MS+2000{return Err(failed())}let duration=duration.min(MAX_DURATION_MS);pointer.retain(|p|p.time_ms<=duration);
 let size=std::fs::metadata(&path).map_err(|_|failed())?.len();if !(16..=MAX_VIDEO_BYTES).contains(&size){return Err(failed())}
 let clip=Clip{id:id.clone(),name:format!("Recording-{}.mp4",chrono::Local::now().format("%Y-%m-%d-%H%M%S")),width:capture.width,height:capture.height,duration_ms:duration,byte_size:size,created_at:storage::now(),media_path:path.to_string_lossy().into_owned(),poster:String::new(),has_audio:Some(settings.system_audio||settings.microphone)};
 let mut draft=VideoDraft::new(duration);draft.cursor_visible=settings.record_pointer;draft.click_highlight=settings.record_pointer;storage::save(app,&VideoDocument{clip,draft,pointer})?;Ok(id)
}

#[derive(serde::Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct ExportRequest{pub id:String,pub draft:VideoDraft}
pub(crate) struct PreparedVideo{pub doc:VideoDocument,pub path:std::path::PathBuf,pub poster:String}
pub(crate) fn prepare_upload(app:&tauri::AppHandle,request:ExportRequest)->Result<PreparedVideo,NativeError>{
 let mut doc=storage::read(app,&request.id)?;request.draft.validate(doc.clip.duration_ms)?;doc.draft=request.draft;
 #[cfg(target_os="macos")]{let folder=storage::folder(app,&request.id)?;let path=render::export(&doc,&folder)?;let poster=if path==std::path::Path::new(&doc.clip.media_path)&&!doc.clip.poster.is_empty(){doc.clip.poster.clone()}else{render::poster(&path)?};let state=app.state::<RecordingStore>();let _lock=state.documents.lock().map_err(|_|failed())?;storage::save(app,&doc)?;Ok(PreparedVideo{doc,path,poster})}
 #[cfg(not(target_os="macos"))]{let _=doc;Err(failed())}
}
#[tauri::command]pub async fn recording_save(request:ExportRequest,window:tauri::WebviewWindow,app:tauri::AppHandle,jobs:tauri::State<'_,NativeJobs>)->Result<bool,NativeError>{
 crate::imaging::validate_window_label(window.label())?;let guard=jobs.acquire()?;
 tauri::async_runtime::spawn_blocking(move||{use tauri_plugin_dialog::DialogExt;let _guard=guard;let doc=storage::read(&app,&request.id)?;let selected=app.dialog().file().set_parent(&window).set_title("Save video").set_file_name(&doc.clip.name).add_filter("MP4 video",&["mp4"]).blocking_save_file();let Some(selected)=selected else{return Ok(false)};let mut path=selected.into_path().map_err(|_|failed())?;if path.extension().is_none(){path.set_extension("mp4");}if !path.extension().is_some_and(|ext|ext.eq_ignore_ascii_case("mp4")){return Err(NativeError::new("invalid_extension","Choose an MP4 filename."))}let prepared=prepare_upload(&app,request)?;let parent=path.parent().ok_or_else(failed)?;let mut temp=tempfile::NamedTempFile::new_in(parent).map_err(|_|failed())?;let mut input=std::fs::File::open(prepared.path).map_err(|_|failed())?;std::io::copy(&mut input,&mut temp).map_err(|_|failed())?;temp.as_file().sync_all().map_err(|_|failed())?;temp.persist_noclobber(path).map_err(|_|NativeError::new("save_failed","Choose a new filename. Existing files are never overwritten."))?;Ok(true)}).await.map_err(|_|failed())?
}
pub(crate) fn forget_uploaded(app:&tauri::AppHandle,id:&str){if id.starts_with("video-"){let state=app.state::<RecordingStore>();if let Ok(_lock)=state.documents.lock(){let _=storage::remove(app,id);}}}

#[tauri::command]pub fn recording_edit(id:String,request_id:Option<String>,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{crate::library_window::require_library(window.label())?;if request_id.as_deref().is_some_and(|id|!valid_id(id)){return Err(invalid())}let _=storage::read(&app,&id)?;queue_open(&app,id,request_id)}
#[tauri::command]pub async fn recording_copy(request:ExportRequest,window:tauri::WebviewWindow,app:tauri::AppHandle,jobs:tauri::State<'_,NativeJobs>)->Result<(),NativeError>{crate::imaging::validate_window_label(window.label())?;let guard=jobs.acquire()?;tauri::async_runtime::spawn_blocking(move||{let _guard=guard;let prepared=prepare_upload(&app,request)?;#[cfg(target_os="macos")]{let mut clipboard=arboard::Clipboard::new().map_err(|_|failed())?;clipboard.set().file_list(&[prepared.path]).map_err(|_|failed())}#[cfg(not(target_os="macos"))]{let _=prepared;Err(failed())}}).await.map_err(|_|failed())?}

pub(crate) fn media_root(app:&tauri::AppHandle)->Result<std::path::PathBuf,NativeError>{storage::root(app)}
pub(crate) fn inspect_audio(path:&std::path::Path)->Result<bool,NativeError>{#[cfg(target_os="macos")]{render::has_audio(path)}#[cfg(not(target_os="macos"))]{let _=path;Err(failed())}}
pub(crate) fn inspect_video(path:&std::path::Path)->Result<(u32,u32,u64),NativeError>{#[cfg(target_os="macos")]{render::describe(path)}#[cfg(not(target_os="macos"))]{let _=path;Err(failed())}}
pub(crate) fn import_remote(app:&tauri::AppHandle,clip:Clip,request_id:Option<String>)->Result<(),NativeError>{
 let id=format!("video-{}",clip.id);if !valid_id(&id){return Err(invalid())}let folder=storage::folder(app,&id)?;
 if !folder.exists(){std::fs::create_dir(&folder).map_err(|_|failed())?;let original=folder.join("original.mp4");let mut temp=tempfile::NamedTempFile::new_in(&folder).map_err(|_|failed())?;let mut source=std::fs::File::open(&clip.media_path).map_err(|_|failed())?;std::io::copy(&mut source,&mut temp).map_err(|_|failed())?;temp.persist_noclobber(&original).map_err(|_|failed())?;let mut clip=clip;clip.id=id.clone();clip.media_path=original.to_string_lossy().into_owned();clip.created_at=storage::now();let mut draft=VideoDraft::new(clip.duration_ms);draft.cursor_visible=false;draft.click_highlight=false;storage::save(app,&VideoDocument{clip,draft,pointer:vec![]})?;}
 let _=storage::read_light(app,&id)?;queue_open(app,id,request_id)
}
#[tauri::command]pub async fn recording_copy_library(id:String,window:tauri::WebviewWindow,app:tauri::AppHandle,jobs:tauri::State<'_,NativeJobs>)->Result<(),NativeError>{crate::library_window::require_library(window.label())?;let guard=jobs.acquire()?;tauri::async_runtime::spawn_blocking(move||{let _guard=guard;let doc=storage::read_light(&app,&id)?;let prepared=prepare_upload(&app,ExportRequest{id,draft:doc.draft})?;#[cfg(target_os="macos")]{let mut clipboard=arboard::Clipboard::new().map_err(|_|failed())?;clipboard.set().file_list(&[prepared.path]).map_err(|_|failed())}#[cfg(not(target_os="macos"))]{let _=prepared;Err(failed())}}).await.map_err(|_|failed())?}

pub fn request_exit(app:&tauri::AppHandle)->bool{let state=app.state::<RecordingStore>();let Ok(active)=state.active.lock()else{return false};let Some(tx)=active.as_ref()else{return false};state.exit_pending.store(true,std::sync::atomic::Ordering::Release);if tx.send(true).is_err(){state.exit_pending.store(false,std::sync::atomic::Ordering::Release);return false}true}
