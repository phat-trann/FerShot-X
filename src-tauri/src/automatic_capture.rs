//! User-triggered desktop region capture. Automated tests never invoke its OS boundaries.
use crate::imaging::{ImagePayload,NativeError,NativeJobs};
use fershot_capture_core::{CaptureMode,ScreenRect};
use fershot_scroll_core::{ScrollFrame,ScrollDirection,StitchOptions,stitch_capture_frames};
use std::sync::atomic::{AtomicBool,Ordering};
use tauri::Manager;
use tauri_plugin_global_shortcut::{Code,GlobalShortcutExt,Shortcut,ShortcutState};
#[derive(Default)]pub struct StopState(pub AtomicBool);
fn event_access(trusted:bool,preflight:bool)->bool{trusted||preflight}
fn fail(text:&str)->NativeError{NativeError::new("auto_scroll_failed",text)}
struct Restore{app:tauri::AppHandle,windows:Vec<tauri::WebviewWindow>,success:bool,escape:bool}
impl Drop for Restore{fn drop(&mut self){if self.escape{let _=self.app.global_shortcut().unregister(Shortcut::new(None,Code::Escape));}for w in &self.windows{if !(self.success&&w.label()=="main"){let _=w.show();}}}}
fn capture(mode:CaptureMode)->Result<fershot_image_core::Raster,NativeError>{let file=fershot_capture_core::capture(mode).map_err(|_|fail("Native scrolling capture failed or was cancelled."))?;fershot_image_core::Raster::decode(&file.read().map_err(|_|fail("Captured pixels could not be read."))?).map_err(|_|fail("Captured pixels are invalid."))}
fn scroll_step(rect:ScreenRect,speed:u8)->Result<(f64,f64,i32),NativeError>{
 if !rect.is_valid()||rect.width<8||rect.height<32{return Err(fail("Select a larger scrollable region."))}
 Ok((rect.x as f64+rect.width as f64/2.,rect.y as f64+rect.height as f64/2.,-((rect.height as f64*(0.12+f64::from(speed.clamp(1,5))*0.04)).round()as i32).clamp(12,240)))
}
#[cfg(target_os="macos")]
mod input{
 use super::*;use core_graphics::geometry::CGPoint;
 #[link(name="CoreGraphics",kind="framework")]unsafe extern "C"{
  fn CGPreflightPostEventAccess()->bool;fn CGEventCreate(source:*mut std::ffi::c_void)->*mut std::ffi::c_void;fn CGEventGetLocation(event:*mut std::ffi::c_void)->CGPoint;
  fn CGEventCreateMouseEvent(source:*mut std::ffi::c_void,kind:u32,point:CGPoint,button:u32)->*mut std::ffi::c_void;
  fn CGEventCreateScrollWheelEvent2(source:*mut std::ffi::c_void,units:u32,count:u32,a:i32,b:i32,c:i32)->*mut std::ffi::c_void;
  fn CGEventSetLocation(event:*mut std::ffi::c_void,point:CGPoint);fn CGEventSetIntegerValueField(event:*mut std::ffi::c_void,field:u32,value:i64);fn CGEventPost(tap:u32,event:*mut std::ffi::c_void);
 }
 #[link(name="ApplicationServices",kind="framework")]unsafe extern "C"{fn AXIsProcessTrusted()->bool;}
 #[link(name="CoreFoundation",kind="framework")]unsafe extern "C"{fn CFRelease(value:*const std::ffi::c_void);}
 struct Event(*mut std::ffi::c_void);
 impl Event{fn new(raw:*mut std::ffi::c_void)->Result<Self,NativeError>{if raw.is_null(){Err(fail("A scroll input event could not be created."))}else{Ok(Self(raw))}}}
 impl Drop for Event{fn drop(&mut self){unsafe{CFRelease(self.0)}}}
 fn location()->Result<CGPoint,NativeError>{let e=Event::new(unsafe{CGEventCreate(std::ptr::null_mut())})?;Ok(unsafe{CGEventGetLocation(e.0)})}
 fn near(a:CGPoint,b:CGPoint)->bool{(a.x-b.x).abs()<2.&&(a.y-b.y).abs()<2.}
 fn move_to(point:CGPoint)->Result<(),NativeError>{let e=Event::new(unsafe{CGEventCreateMouseEvent(std::ptr::null_mut(),5,point,0)})?;unsafe{CGEventPost(0,e.0)};Ok(())}
 pub struct Pointer{original:CGPoint,last:Option<CGPoint>}
 impl Pointer{
  pub fn new()->Result<Self,NativeError>{
   if !event_access(unsafe{AXIsProcessTrusted()},unsafe{CGPreflightPostEventAccess()}){return Err(NativeError::new("scroll_permission_denied","Allow Accessibility for the installed FerShot X.app, then quit and reopen it. Ad-hoc updates may require granting access again."))}
   Ok(Self{original:location()?,last:None})
  }
  pub fn scroll(&mut self,rect:ScreenRect,lines:bool,speed:u8)->Result<(),NativeError>{
   if let Some(last)=self.last{if !near(location()?,last){return Err(NativeError::new("scroll_interrupted","The pointer moved during automatic scrolling. Keep it still or press Escape to finish."))}}
   let(x,y,delta)=scroll_step(rect,speed)?;let point=CGPoint::new(x,y);
   let e=Event::new(unsafe{CGEventCreateScrollWheelEvent2(std::ptr::null_mut(),if lines{1}else{0},1,if lines{-3}else{delta},0,0)})?;
   // Route through WindowServer hit testing, as real pointer input. Posting to a
   // PID alone does not establish the scrollable view under the cursor.
   move_to(point)?;self.last=Some(point);std::thread::sleep(std::time::Duration::from_millis(40));
   unsafe{CGEventSetLocation(e.0,point);CGEventSetIntegerValueField(e.0,88,if lines{0}else{1});CGEventPost(0,e.0)};Ok(())
  }
 }
 impl Drop for Pointer{fn drop(&mut self){if let Some(last)=self.last{if location().is_ok_and(|p|near(p,last)){let _=move_to(self.original);}}}}
}
fn raster(width:u32,height:u32,rgba:Vec<u8>)->Result<fershot_image_core::Raster,NativeError>{let image=image::RgbaImage::from_raw(width,height,rgba).ok_or_else(||fail("Invalid scroll pixels."))?;let mut out=std::io::Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(image).write_to(&mut out,image::ImageFormat::Png).map_err(|_|fail("Scrolling output could not be encoded."))?;fershot_image_core::Raster::decode(&out.into_inner()).map_err(|_|fail("Scrolling output exceeds the image limits."))}
fn unchanged(a:&ScrollFrame,b:&ScrollFrame)->bool{a.width==b.width&&a.height==b.height&&a.rgba==b.rgba}
fn capture_step<T>(stop:&AtomicBool,operation:impl FnOnce()->Result<T,NativeError>)->Result<Option<T>,NativeError>{
 if stop.load(Ordering::SeqCst){return Ok(None)}
 let result=operation();
 if stop.load(Ordering::SeqCst){return Ok(None)}
 result.map(Some)
}
fn finish_frames(frames:&[ScrollFrame],stopped:bool)->Result<(fershot_image_core::Raster,usize),NativeError>{
 if frames.is_empty(){return Err(fail("No scrolling frame was captured."))}
 let mut count=frames.len();
 loop{
  let first=&frames[0];
  if count==1{return raster(first.width,first.height,first.rgba.clone()).map(|image|(image,1))}
  match stitch_capture_frames(&frames[..count],StitchOptions{direction:ScrollDirection::Down,min_overlap_rows:(first.height/10).max(8),max_output_height:16384,max_channel_diff:0}){
   Ok(image)=>{if image.matched_overlaps.is_empty()&&!stopped{return Err(NativeError::new("scroll_no_movement","The selected content did not move. Select the scrolling content and retry."))}return raster(image.width,image.height,image.rgba).map(|image|(image,count))},
   // Escape finishes the valid prefix. Never invent overlap for an unaligned
   // tail, or discard all captured pixels merely because the last pair failed.
   Err(fershot_scroll_core::StitchError::NoOverlapMatch{frame_index})if stopped&&frame_index>0=>count=frame_index.min(count-1),
   Err(fershot_scroll_core::StitchError::OutputHeightLimitExceeded{..})if stopped=>count-=1,
   Err(_)=>return Err(fail("The scrolling frames could not be aligned. Select just the scrolling content, avoid animation, and retry.")),
  }
 }
}
#[derive(serde::Serialize)]#[serde(rename_all="camelCase")]pub struct ScrollCapturePayload{#[serde(flatten)]image:ImagePayload,captured_frames:u32,accepted_frames:u32,partial:bool}
#[tauri::command]pub async fn capture_scroll_image(background:Option<bool>,window:tauri::WebviewWindow,app:tauri::AppHandle,jobs:tauri::State<'_,NativeJobs>)->Result<ScrollCapturePayload,NativeError>{
 let _=background;crate::imaging::validate_window_label(window.label())?;let guard=jobs.acquire()?;
 tauri::async_runtime::spawn_blocking(move||{
  let _guard=guard;let dir=app.path().app_config_dir().map_err(|_|fail("Scroll settings unavailable."))?;let speed=crate::scroll_preferences::load(&dir)?.speed;let started=std::time::Instant::now();let mut stage=crate::diagnostics::Stage::SelectRegion;let mut captured_frames=0u32;let result=(||{let windows=["main","library","preferences"].into_iter().filter_map(|label|app.get_webview_window(label)).filter(|w|w.is_visible().unwrap_or(false)).collect::<Vec<_>>();
  let mut restore=Restore{app:app.clone(),windows,success:false,escape:false};for w in &restore.windows{w.hide().map_err(|_|fail("The app could not be hidden for capture."))?;}std::thread::sleep(std::time::Duration::from_millis(150));
  let before=crate::area_capture::topology(&window)?;
  let selected=fershot_capture_core::capture(CaptureMode::Area).map_err(|e|match e{fershot_capture_core::CaptureError::Cancelled=>NativeError::new("cancelled","Scrolling selection cancelled."),fershot_capture_core::CaptureError::PermissionDenied=>NativeError::new("permission_denied","Allow Screen Recording permission to capture."),_=>fail("Native region selection failed.")})?;
  let first=fershot_image_core::Raster::decode(&selected.read().map_err(|_|fail("The selected frame could not be read."))?).map_err(|_|fail("The selected frame is invalid."))?;
  captured_frames=1;stage=crate::diagnostics::Stage::ResolveRegion;
  let rect=crate::area_capture::selected_rect(selected.path(),first.dimensions()).ok_or_else(||NativeError::new("scroll_coordinates_missing","macOS did not provide the selected region coordinates. Select a region again."))?;
  stage=crate::diagnostics::Stage::ResolveTarget;
  let target=crate::active_window::target_at(rect)?;crate::active_window::activate(target.0)?;std::thread::sleep(std::time::Duration::from_millis(150));
  let baseline=capture(CaptureMode::Region(rect))?;if baseline.dimensions()!=first.dimensions(){return Err(NativeError::new("display_changed","Selected capture pixels changed size."))}let first=baseline;
  if rect.width<8||rect.height<32{return Err(fail("Select a larger scrollable region (at least 8 × 32 points)."))}
  let escape=Shortcut::new(None,Code::Escape);if app.global_shortcut().is_registered(escape){return Err(fail("Escape is already registered; scrolling capture cannot safely start."))}
  app.state::<StopState>().0.store(false,Ordering::SeqCst);
  app.global_shortcut().on_shortcut(escape,|app,_,event|{if event.state()==ShortcutState::Pressed{app.state::<StopState>().0.store(true,Ordering::SeqCst);}}).map_err(|_|fail("Escape could not be registered for stopping capture."))?;restore.escape=true;
  let(w,h)=first.dimensions();captured_frames=1;let mut frames=vec![ScrollFrame{width:w,height:h,rgba:first.rgba_bytes()}];let mut used_pixels=u64::from(w)*u64::from(h);let max_pixels=16_777_216u64;if used_pixels*2>max_pixels{return Err(fail("The selected region is too large for two safe frames. Select a smaller scrollable area."))}
  #[cfg(target_os="macos")]let mut pointer=input::Pointer::new()?;
  let mut line_input=false;
  while frames.len()<64&&used_pixels+u64::from(w)*u64::from(h)<=max_pixels{
   if app.state::<StopState>().0.load(Ordering::SeqCst){break;}
   let next=capture_step(&app.state::<StopState>().0,||{
   stage=crate::diagnostics::Stage::ResolveTarget;if before!=crate::area_capture::topology(&window)?{return Err(NativeError::new("display_changed","Displays changed during scrolling capture."))}crate::active_window::confirm(target.0,target.1)?;if crate::active_window::target_at(rect)?!=target{return Err(NativeError::new("scroll_target_unavailable","The selected window is covered or changed. Uncover it and retry."))}
   stage=crate::diagnostics::Stage::PostScroll;
   #[cfg(target_os="macos")]pointer.scroll(rect,line_input,speed)?;
   #[cfg(not(target_os="macos"))]return Err(fail("Automatic scrolling requires macOS."));
   for _ in 0..crate::scroll_preferences::delay_ms(speed).div_ceil(25){if app.state::<StopState>().0.load(Ordering::SeqCst){break;}std::thread::sleep(std::time::Duration::from_millis(25));}
   if app.state::<StopState>().0.load(Ordering::SeqCst){return Err(NativeError::new("cancelled","Scrolling stopped."))}
   stage=crate::diagnostics::Stage::CaptureFrame;let frame=capture(CaptureMode::Region(rect))?;let(width,height)=frame.dimensions();Ok(ScrollFrame{width,height,rgba:frame.rgba_bytes()})
   });let next=match next{Ok(value)=>value,Err(error)if error.code=="scroll_interrupted"=>{app.state::<StopState>().0.store(true,Ordering::SeqCst);break;},Err(error)=>return Err(error)};let Some(next)=next else{break;};let(width,height)=(next.width,next.height);if unchanged(frames.last().unwrap(),&next){if frames.len()==1&&!line_input{line_input=true;continue;}break;}if width!=w||height!=h{return Err(fail("The capture region changed size."))}used_pixels+=u64::from(w)*u64::from(h);frames.push(next);captured_frames=frames.len()as u32;
  }
  if frames.len()==1&&!app.state::<StopState>().0.load(Ordering::SeqCst){return Err(NativeError::new("scroll_no_movement","The selected content did not move. Start above the end of the page and select inside its scrollable content."))}
  stage=crate::diagnostics::Stage::StitchFrames;
  let stopped=app.state::<StopState>().0.load(Ordering::SeqCst);
  let(output,accepted)=finish_frames(&frames,stopped)?;
  if accepted<frames.len(){crate::diagnostics::record_scroll_error(&app,&fail("Stopped capture retained its aligned prefix."),stage,started.elapsed().as_millis()as u64,captured_frames);}
  stage=crate::diagnostics::Stage::EncodeOutput;let single=output.dimensions().1<=h;let partial=accepted<frames.len()||single||frames.len()>=64||used_pixels+u64::from(w)*u64::from(h)>max_pixels;let result=crate::imaging::payload(output)?;restore.success=true;Ok(ScrollCapturePayload{image:result,captured_frames:frames.len()as u32,accepted_frames:if single{1}else{accepted as u32},partial})
  })();if let Err(ref error)=result{crate::diagnostics::record_scroll_error(&app,error,stage,started.elapsed().as_millis()as u64,captured_frames);}result
 }).await.map_err(|_|fail("Scrolling capture stopped unexpectedly."))?
}
#[cfg(test)]mod tests{
fn rows(start:u8)->fershot_scroll_core::ScrollFrame{let width=40;let height=32;let rgba=(0..height).flat_map(|y|(0..width).flat_map(move|x|{let seed=(start as u32+y).wrapping_mul(0x9e3779b9)^(x as u32).wrapping_mul(0x85ebca6b);let value=seed.wrapping_mul(seed^0xc2b2ae35);[(value>>24)as u8,(value>>16)as u8,(value>>8)as u8,255]})).collect();fershot_scroll_core::ScrollFrame{width,height,rgba}}
fn disjoint()->fershot_scroll_core::ScrollFrame{let mut frame=rows(190);for pixel in frame.rgba.chunks_exact_mut(4){pixel[2]=0;}frame}
#[test]fn stop_during_an_inflight_step_preserves_prior_frames_but_other_failures_propagate(){let stop=std::sync::atomic::AtomicBool::new(false);let result=super::capture_step::<()>(&stop,||{stop.store(true,std::sync::atomic::Ordering::SeqCst);Err(super::fail("injected interrupted capture"))});assert!(result.unwrap().is_none());stop.store(false,std::sync::atomic::Ordering::SeqCst);assert!(super::capture_step::<()>(&stop,||Err(super::fail("injected real capture failure"))).is_err());}
#[test]fn escape_keeps_aligned_prefix_when_the_tail_cannot_be_registered(){let frames=vec![rows(0),rows(10),disjoint()];let(image,count)=super::finish_frames(&frames,true).unwrap();assert_eq!(count,2);assert_eq!(image.dimensions(),(40,42));assert!(super::finish_frames(&frames,false).is_err());}
#[test]fn escape_after_first_frame_returns_pixels_even_if_the_next_frame_failed(){let first=rows(0);let(image,count)=super::finish_frames(&[first.clone()],true).unwrap();assert_eq!(count,1);assert_eq!(image.rgba_bytes(),first.rgba);assert!(super::finish_frames(&[],true).is_err());}
#[test]fn escape_with_no_usable_overlap_still_preserves_the_first_frame(){let(image,count)=super::finish_frames(&[rows(0),disjoint()],true).unwrap();assert_eq!(count,1);assert_eq!(image.dimensions(),(40,32));}
#[test]fn scroll_steps_are_pixels_bounded_to_preserve_overlap_and_global_coordinates(){let rect=fershot_capture_core::ScreenRect{x:-1920,y:40,width:600,height:1200};assert_eq!(super::scroll_step(rect,3).unwrap(),(-1620.,640.,-240));assert_eq!(super::scroll_step(fershot_capture_core::ScreenRect{height:100,..rect},3).unwrap().2,-24);assert!(super::scroll_step(fershot_capture_core::ScreenRect{height:0,..rect},3).is_err());}#[test]fn accessibility_trust_is_not_overruled_by_a_false_preflight(){assert!(super::event_access(true,false));assert!(super::event_access(false,true));assert!(super::event_access(true,true));assert!(!super::event_access(false,false));}#[test]fn end_detection_compares_pixels_and_geometry(){let a=fershot_scroll_core::ScrollFrame{width:1,height:1,rgba:vec![1,2,3,255]};let mut b=a.clone();assert!(super::unchanged(&a,&b));b.rgba[0]=4;assert!(!super::unchanged(&a,&b));}}
