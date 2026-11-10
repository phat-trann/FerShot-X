use crate::imaging::{ImagePayload,NativeError};
use serde::{Deserialize,Serialize};
use std::{collections::VecDeque,sync::Mutex};
use tauri::{Manager,Emitter};
pub const LABEL:&str="library";
#[derive(Default)]pub struct EditorInbox(pub Mutex<VecDeque<LibraryImage>>);
#[derive(Clone,Copy,Deserialize)]#[serde(rename_all="lowercase")]pub enum Kind{Local,Ftp}
#[derive(Serialize)]#[serde(rename_all="camelCase")]pub struct LibraryImage{pub name:String,pub image:ImagePayload,pub local_id:Option<String>,pub draft:Option<serde_json::Value>}
pub fn validate_reader(label:&str)->Result<(),NativeError>{if matches!(label,"main"|"library"){Ok(())}else{Err(NativeError::new("forbidden_window","This operation belongs to Edit or Library."))}}
pub fn require_library(label:&str)->Result<(),NativeError>{if label==LABEL{Ok(())}else{Err(NativeError::new("forbidden_window","This operation belongs to Library."))}}
pub fn show(app:&tauri::AppHandle,label:&str)->Result<(),NativeError>{let w=app.get_webview_window(label).ok_or_else(||NativeError::new("window_failed","The requested window is unavailable."))?;let other=if label=="main"{Some("library")}else if label=="library"{Some("main")}else{None};let previous=other.and_then(|label|app.get_webview_window(label)).filter(|window|window.is_visible().unwrap_or(false));if let Some(ref window)=previous{window.hide().map_err(|_|NativeError::new("window_failed","The other view could not be hidden."))?;}let result=crate::lifecycle::bring_to_front(&w);if result.is_err(){let _=w.hide();if let Some(window)=previous{let _=window.show();}}result.map_err(|_|NativeError::new("window_failed","The window could not be shown."))}
#[tauri::command]pub fn show_editor(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{crate::imaging::validate_window_label(window.label())?;show(&app,"main")}
#[tauri::command]pub fn show_library(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{validate_reader(window.label())?;show(&app,LABEL)}
fn read(app:&tauri::AppHandle,kind:Kind,id:&str)->Result<LibraryImage,NativeError>{let(name,image,local_id,draft)=match kind{Kind::Local=>{let(name,image,draft)=crate::local_cache::library_snapshot(app,id)?;(name,image,Some(id.to_owned()),draft)},Kind::Ftp=>{let(name,image)=crate::ftp::library_image(app,id)?;(name,image,None,None)}};Ok(LibraryImage{name,image,local_id,draft})}
#[tauri::command]pub async fn library_image(kind:Kind,id:String,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<LibraryImage,NativeError>{require_library(window.label())?;tauri::async_runtime::spawn_blocking(move||read(&app,kind,&id)).await.map_err(|_|NativeError::new("worker_failed","Library loading stopped."))?}
#[tauri::command]pub async fn library_thumbnail(kind:Kind,id:String,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<ImagePayload,NativeError>{
 require_library(window.label())?;tauri::async_runtime::spawn_blocking(move||{if matches!(kind,Kind::Ftp){return crate::ftp::thumbnail(&app,&id)}let source=read(&app,kind,&id)?;let raster=crate::imaging::decode_input(&source.image.png_base64)?.resize(128,96).map_err(|_|NativeError::new("invalid_image","Thumbnail unavailable."))?;crate::imaging::payload(raster)}).await.map_err(|_|NativeError::new("worker_failed","Thumbnail loading stopped."))?
}
#[tauri::command]pub async fn edit_library_image(kind:Kind,id:String,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{
 require_library(window.label())?;tauri::async_runtime::spawn_blocking(move||{let image=read(&app,kind,&id)?;{let inbox=app.state::<EditorInbox>();let mut queue=inbox.0.lock().map_err(|_|NativeError::new("busy","Editor inbox unavailable."))?;if queue.len()>=4{return Err(NativeError::new("busy","Finish opening the pending images first."))}queue.push_back(image);}show(&app,"main")?;let _=app.emit_to("main","fershot-editor-image",());Ok(())}).await.map_err(|_|NativeError::new("worker_failed","Opening Edit stopped."))?
}
#[tauri::command]pub fn take_editor_image(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<Option<LibraryImage>,NativeError>{crate::imaging::validate_window_label(window.label())?;let state=app.state::<EditorInbox>();let mut queue=state.0.lock().map_err(|_|NativeError::new("busy","Editor inbox unavailable."))?;Ok(queue.pop_front())}
#[cfg(test)]mod tests{#[test]fn library_does_not_receive_capture_or_settings_privileges(){assert!(super::validate_reader("library").is_ok());assert!(super::require_library("main").is_err());assert!(super::validate_reader("preferences").is_err());assert!(crate::imaging::validate_window_label("library").is_err());assert!(super::validate_reader("pin-1").is_err());}}

pub fn editor_size(image:(u32,u32),available:(f64,f64))->(f64,f64){
 let chrome=110.;let max_w=(available.0*0.8).min(((available.1*0.8-chrome).max(1.))*16./9.);let wanted=(image.0 as f64+48.).max(image.1 as f64*16./9.+48.).max(480.);let width=wanted.min(max_w).max(1.);(width,width*9./16.+chrome)
}
#[tauri::command]pub fn fit_editor_window(width:u32,height:u32,window:tauri::WebviewWindow)->Result<(),NativeError>{
 crate::imaging::validate_window_label(window.label())?;if width==0||height==0||width>16384||height>16384{return Err(NativeError::new("invalid_input","Invalid image dimensions."))}
 if let Some(monitor)=window.current_monitor().ok().flatten().or(window.primary_monitor().ok().flatten()){let area=monitor.work_area();let scale=monitor.scale_factor();let(w,h)=editor_size((width,height),(area.size.width as f64/scale,area.size.height as f64/scale));window.set_size(tauri::LogicalSize::new(w,h)).map_err(|_|NativeError::new("window_failed","Edit could not be sized."))?;let _=window.center();}
 Ok(())
}

#[cfg(test)]mod geometry_tests{#[test]fn editor_is_sixteen_nine_and_bounded_by_eighty_percent(){for image in [(120,60),(4000,6000),(6000,4000)]{let(w,h)=super::editor_size(image,(1440.,900.));assert!((w/(h-110.)-16./9.).abs()<0.0001);assert!(w<=1152.&&h<=720.);}let(small,_)=super::editor_size((120,60),(1440.,900.));let(large,_)=super::editor_size((6000,4000),(1440.,900.));assert!(small<large);}}

// Library receives a narrowly scoped clipboard command, never Edit's image commands.
#[tauri::command]
pub async fn copy_library_images(images:Vec<String>,window:tauri::WebviewWindow,app:tauri::AppHandle,jobs:tauri::State<'_,crate::imaging::NativeJobs>)->Result<(),NativeError>{
 require_library(window.label())?;
 if images.is_empty()||images.len()>32||images.iter().map(String::len).sum::<usize>()>64*1024*1024{return Err(NativeError::new("clipboard_limit","Select fewer images to copy."))}
 let guard=jobs.acquire()?;
 tauri::async_runtime::spawn_blocking(move||{let _guard=guard;
  #[cfg(target_os="macos")]
  {
   use std::{fs,io::Write,time::{SystemTime,UNIX_EPOCH}};
   use fershot_image_core::ExportFormat;
   let fail=||NativeError::new("clipboard_failed","Images could not be copied. Please retry.");
   let root=app.path().app_cache_dir().map_err(|_|fail())?.join("library-clipboard-v1");
   fs::create_dir_all(&root).map_err(|_|fail())?;
   let stamp=SystemTime::now().duration_since(UNIX_EPOCH).map_err(|_|fail())?.as_nanos();
   let folder=root.join(format!("{stamp}"));fs::create_dir(&folder).map_err(|_|fail())?;
   let result=(||{
    let mut paths=Vec::new();let mut total=0usize;
    for(index,image)in images.iter().enumerate(){let png=crate::imaging::decode_input(image)?.encode(ExportFormat::Png).map_err(|_|fail())?;total+=png.len();if total>64*1024*1024{return Err(NativeError::new("clipboard_limit","Selected images are too large to copy together."))}let path=folder.join(format!("Image-{:02}.png",index+1));let mut file=fs::OpenOptions::new().write(true).create_new(true).open(&path).map_err(|_|fail())?;file.write_all(&png).map_err(|_|fail())?;paths.push(path);}
    let mut clipboard=arboard::Clipboard::new().map_err(|_|fail())?;
    clipboard.set().file_list(&paths).map_err(|_|fail())
   })();
   if result.is_err(){let _=fs::remove_dir_all(&folder);}else if let Ok(entries)=fs::read_dir(&root){for entry in entries.flatten(){if entry.path()!=folder&&entry.file_type().map(|kind|kind.is_dir()).unwrap_or(false){let _=fs::remove_dir_all(entry.path());}}}
   result
  }
  #[cfg(not(target_os="macos"))]
  {let _=(images,app);Err(NativeError::new("unsupported","Image file-list copy currently requires macOS."))}
 }).await.map_err(|_|NativeError::new("worker_failed","Copying images stopped unexpectedly."))?
}
