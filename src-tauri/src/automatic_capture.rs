//! User-triggered desktop region capture. Automated tests never invoke its OS boundaries.
use crate::imaging::{ImagePayload,NativeError,NativeJobs};
use fershot_capture_core::{CaptureMode,ScreenRect};
use fershot_scroll_core::{ScrollFrame,ScrollDirection,StitchOptions,stitch_frames};
use std::sync::atomic::{AtomicBool,Ordering};
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code,GlobalShortcutExt,Shortcut,ShortcutState};
#[derive(Default)]pub struct StopState(pub AtomicBool);
fn fail(text:&str)->NativeError{NativeError::new("auto_scroll_failed",text)}
struct Restore{app:tauri::AppHandle,windows:Vec<tauri::WebviewWindow>,success:bool,escape:bool}
impl Drop for Restore{fn drop(&mut self){if self.escape{let _=self.app.global_shortcut().unregister(Shortcut::new(None,Code::Escape));}for w in &self.windows{let _=w.show();}if self.success{let _=crate::library_window::show(&self.app,"main");}}}
fn capture(mode:CaptureMode)->Result<fershot_image_core::Raster,NativeError>{let file=fershot_capture_core::capture(mode).map_err(|_|fail("Native scrolling capture failed or was cancelled."))?;fershot_image_core::Raster::decode(&file.read().map_err(|_|fail("Captured pixels could not be read."))?).map_err(|_|fail("Captured pixels are invalid."))}
#[cfg(target_os="macos")]
fn scroll(pid:u32,rect:ScreenRect)->Result<(),NativeError>{
 use core_graphics::geometry::CGPoint;
 #[link(name="CoreGraphics",kind="framework")]unsafe extern "C"{fn CGPreflightPostEventAccess()->bool;fn CGEventCreateScrollWheelEvent2(source:*mut std::ffi::c_void,units:u32,count:u32,a:i32,b:i32,c:i32)->*mut std::ffi::c_void;fn CGEventSetLocation(event:*mut std::ffi::c_void,point:CGPoint);fn CGEventPostToPid(pid:i32,event:*mut std::ffi::c_void);fn CFRelease(value:*const std::ffi::c_void);}
 if !unsafe{CGPreflightPostEventAccess()}{return Err(fail("Allow FerShot X to send input events in System Settings to use scrolling capture."))}
 let event=unsafe{CGEventCreateScrollWheelEvent2(std::ptr::null_mut(),0,1,-((rect.height as f64*0.65).round()as i32).clamp(1,2048),0,0)};if event.is_null(){return Err(fail("A scroll event could not be created."))}unsafe{CGEventSetLocation(event,CGPoint::new(rect.x as f64+rect.width as f64/2.,rect.y as f64+rect.height as f64/2.));CGEventPostToPid(pid as i32,event);CFRelease(event);}Ok(())
}
fn raster(width:u32,height:u32,rgba:Vec<u8>)->Result<fershot_image_core::Raster,NativeError>{let image=image::RgbaImage::from_raw(width,height,rgba).ok_or_else(||fail("Invalid scroll pixels."))?;let mut out=std::io::Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(image).write_to(&mut out,image::ImageFormat::Png).map_err(|_|fail("Scrolling output could not be encoded."))?;fershot_image_core::Raster::decode(&out.into_inner()).map_err(|_|fail("Scrolling output exceeds the image limits."))}
fn unchanged(a:&ScrollFrame,b:&ScrollFrame)->bool{a.width==b.width&&a.height==b.height&&a.rgba==b.rgba}
#[tauri::command]pub async fn capture_scroll_image(window:tauri::WebviewWindow,app:tauri::AppHandle,jobs:tauri::State<'_,NativeJobs>)->Result<ImagePayload,NativeError>{
 crate::imaging::validate_window_label(window.label())?;let guard=jobs.acquire()?;
 tauri::async_runtime::spawn_blocking(move||{
  let _guard=guard;let windows=["main","library","preferences"].into_iter().filter_map(|label|app.get_webview_window(label)).filter(|w|w.is_visible().unwrap_or(false)).collect::<Vec<_>>();
  let mut restore=Restore{app:app.clone(),windows,success:false,escape:false};for w in &restore.windows{w.hide().map_err(|_|fail("The app could not be hidden for capture."))?;}std::thread::sleep(std::time::Duration::from_millis(150));
  let target=crate::active_window::target()?;let before=crate::area_capture::topology(&window)?;
  let selected=fershot_capture_core::capture(CaptureMode::Area).map_err(|e|match e{fershot_capture_core::CaptureError::Cancelled=>NativeError::new("cancelled","Scrolling selection cancelled."),fershot_capture_core::CaptureError::PermissionDenied=>NativeError::new("permission_denied","Allow Screen Recording permission to capture."),_=>fail("Native region selection failed.")})?;
  let first=fershot_image_core::Raster::decode(&selected.read().map_err(|_|fail("The selected frame could not be read."))?).map_err(|_|fail("The selected frame is invalid."))?;
  let rect=crate::area_capture::selected_rect(selected.path(),first.dimensions()).ok_or_else(||fail("macOS did not provide the selected region coordinates. Select a region again."))?;
  if rect.width<8||rect.height<32{return Err(fail("Select a larger scrollable region (at least 8 × 32 points)."))}
  let escape=Shortcut::new(None,Code::Escape);if app.global_shortcut().is_registered(escape){return Err(fail("Escape is already registered; scrolling capture cannot safely start."))}
  app.state::<StopState>().0.store(false,Ordering::SeqCst);
  app.global_shortcut().on_shortcut(escape,|app,_,event|{if event.state()==ShortcutState::Pressed{app.state::<StopState>().0.store(true,Ordering::SeqCst);}}).map_err(|_|fail("Escape could not be registered for stopping capture."))?;restore.escape=true;
  let(w,h)=first.dimensions();let mut frames=vec![ScrollFrame{width:w,height:h,rgba:first.rgba_bytes()}];let mut used_pixels=u64::from(w)*u64::from(h);let max_pixels=16_777_216u64;
  while frames.len()<64&&used_pixels+u64::from(w)*u64::from(h)<=max_pixels{
   if app.state::<StopState>().0.load(Ordering::SeqCst){break;}
   if before!=crate::area_capture::topology(&window)?{return Err(fail("Displays changed during scrolling capture."))}crate::active_window::confirm(target.0,target.1)?;
   #[cfg(target_os="macos")]scroll(target.0,rect)?;
   #[cfg(not(target_os="macos"))]return Err(fail("Automatic scrolling requires macOS."));
   for _ in 0..20{if app.state::<StopState>().0.load(Ordering::SeqCst){break;}std::thread::sleep(std::time::Duration::from_millis(25));}
   if app.state::<StopState>().0.load(Ordering::SeqCst){break;}
   let frame=capture(CaptureMode::Region(rect))?;let(width,height)=frame.dimensions();let next=ScrollFrame{width,height,rgba:frame.rgba_bytes()};if unchanged(frames.last().unwrap(),&next){break;}if width!=w||height!=h{return Err(fail("The capture region changed size."))}used_pixels+=u64::from(w)*u64::from(h);frames.push(next);
  }
  let output=if frames.len()==1{raster(w,h,frames.remove(0).rgba).map_err(|_|fail("Captured frame is invalid."))?}else{let image=stitch_frames(&frames,StitchOptions{direction:ScrollDirection::Down,min_overlap_rows:2,max_output_height:16384,max_channel_diff:0}).map_err(|_|fail("The scrolling frames could not be aligned. Avoid animated content or fixed headers and retry."))?;raster(image.width,image.height,image.rgba).map_err(|_|fail("The scrolling result is too large."))?};
  let result=crate::imaging::payload(output)?;restore.success=true;Ok(result)
 }).await.map_err(|_|fail("Scrolling capture stopped unexpectedly."))?
}
#[cfg(test)]mod tests{#[test]fn end_detection_compares_pixels_and_geometry(){let a=fershot_scroll_core::ScrollFrame{width:1,height:1,rgba:vec![1,2,3,255]};let mut b=a.clone();assert!(super::unchanged(&a,&b));b.rgba[0]=4;assert!(!super::unchanged(&a,&b));}}
