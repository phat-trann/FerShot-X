//! Native, click-through recording guides. No renderer, screen reads or input
//! interception. All AppKit objects live and are released on the main thread.
use super::model::CaptureRegion;
use crate::{display_capture::DisplayTarget, imaging::NativeError};
use objc2::{msg_send, rc::Retained, runtime::{AnyClass, AnyObject, Bool}};
use objc2_foundation::{NSPoint, NSRect, NSSize};
use std::{cell::RefCell, sync::mpsc, time::Duration};

thread_local! { static WINDOWS: RefCell<Vec<Retained<AnyObject>>> = const { RefCell::new(Vec::new()) }; }
fn fail()->NativeError{NativeError::new("recording_failed","The recording area guide could not be displayed.")}
fn bands(width:f64,height:f64,r:CaptureRegion)->Vec<CaptureRegion>{
 [CaptureRegion{x:0.,y:0.,width,height:r.y},
  CaptureRegion{x:0.,y:r.y+r.height,width,height:height-r.y-r.height},
  CaptureRegion{x:0.,y:r.y,width:r.x,height:r.height},
  CaptureRegion{x:r.x+r.width,y:r.y,width:width-r.x-r.width,height:r.height}]
 .into_iter().filter(|b|b.width>0.&&b.height>0.).collect()
}
fn clear(){WINDOWS.with(|windows|{for window in windows.borrow_mut().drain(..){unsafe{let _:()=msg_send![&*window,orderOut:std::ptr::null::<AnyObject>()];let _:()=msg_send![&*window,close];}}});}
fn guide_frame(display:DisplayTarget,primary_height:f64,band:CaptureRegion)->NSRect{
 NSRect::new(NSPoint::new(display.rect.x as f64+band.x,primary_height-display.rect.y as f64-band.y-band.height),NSSize::new(band.width,band.height))
}
fn frame_matches(actual:NSRect,expected:NSRect)->bool{[actual.origin.x-expected.origin.x,actual.origin.y-expected.origin.y,actual.size.width-expected.size.width,actual.size.height-expected.size.height].iter().all(|difference|difference.is_finite()&&difference.abs()<0.01)}
pub struct Mask{app:tauri::AppHandle,count:usize}
impl Mask{
 pub fn requires_exclusion(&self)->bool{self.count>0}
 pub fn show(app:&tauri::AppHandle,display:DisplayTarget,region:CaptureRegion)->Result<Self,NativeError>{
  let(tx,rx)=mpsc::channel();app.run_on_main_thread(move||{
   let result=objc2::exception::catch(||unsafe{
    clear();let class=AnyClass::get(c"NSWindow").ok_or_else(fail)?;
    let colors=AnyClass::get(c"NSColor").ok_or_else(fail)?;
    let color:Retained<AnyObject>=msg_send![colors,colorWithCalibratedWhite:0f64,alpha:0.24f64];
    let primary=core_graphics::display::CGDisplay::main().bounds().size.height;
    for b in bands(display.rect.width as f64,display.rect.height as f64,region){
     // Quartz uses a top-left origin; AppKit uses the primary display's bottom.
     let rect=guide_frame(display,primary,b);
     let allocated:objc2::rc::Allocated<AnyObject>=msg_send![class,alloc];
     let window:Retained<AnyObject>=msg_send![allocated,initWithContentRect:rect,styleMask:0usize,backing:2usize,defer:Bool::NO];
     let _:()=msg_send![&*window,setReleasedWhenClosed:Bool::NO];
     WINDOWS.with(|windows|windows.borrow_mut().push(window.clone()));
     let _:()=msg_send![&*window,setOpaque:Bool::NO];let _:()=msg_send![&*window,setBackgroundColor:&*color];
     let _:()=msg_send![&*window,setHasShadow:Bool::NO];let _:()=msg_send![&*window,setIgnoresMouseEvents:Bool::YES];
     let _:()=msg_send![&*window,setLevel:3isize];let _:()=msg_send![&*window,setCollectionBehavior:321usize];
     // Reapply exact borderless geometry after creation, never a work-area frame.
     let _:()=msg_send![&*window,setFrame:rect,display:Bool::NO];
     let _:()=msg_send![&*window,orderFrontRegardless];
     let actual:NSRect=msg_send![&*window,frame];if !frame_matches(actual,rect){return Err(fail())}
    }Ok(WINDOWS.with(|windows|windows.borrow().len()))
   }).unwrap_or_else(|_|Err(fail()));
   if result.is_err(){clear();}let _=tx.send(result);
  }).map_err(|_|fail())?;
  // On timeout, enqueue cleanup after the show operation on the same main queue.
  let mut mask=Self{app:app.clone(),count:0};mask.count=rx.recv_timeout(Duration::from_secs(5)).map_err(|_|fail())??;Ok(mask)
 }
}
impl Drop for Mask{fn drop(&mut self){let _=self.app.run_on_main_thread(clear);}}
#[cfg(test)]mod tests{use super::*;
 #[test]fn bands_cover_only_outside_selected_region(){let r=CaptureRegion{x:100.,y:50.,width:400.,height:300.};let b=bands(800.,600.,r);assert_eq!(b.len(),4);let area:f64=b.iter().map(|b|b.width*b.height).sum();assert_eq!(area,800.*600.-400.*300.);for b in b{assert!(b.x+b.width<=r.x||b.x>=r.x+r.width||b.y+b.height<=r.y||b.y>=r.y+r.height);}}
 #[test]fn fullscreen_has_no_dimming_bands(){assert!(bands(800.,600.,CaptureRegion{x:0.,y:0.,width:800.,height:600.}).is_empty());}
}

#[cfg(test)]mod geometry_regressions{
 use super::*;
 #[test]fn guide_frames_preserve_selected_pixels_on_retina_and_displaced_displays(){
  use fershot_capture_core::ScreenRect;
  for (display,region) in [(DisplayTarget{id:1,rect:ScreenRect{x:0,y:0,width:800,height:600},scale:2.},CaptureRegion{x:75.,y:27.,width:400.,height:300.}), (DisplayTarget{id:2,rect:ScreenRect{x:-800,y:-120,width:800,height:600},scale:1.},CaptureRegion{x:80.,y:0.,width:400.,height:300.}), (DisplayTarget{id:3,rect:ScreenRect{x:800,y:600,width:800,height:600},scale:2.},CaptureRegion{x:0.,y:55.,width:800.,height:545.})]{
   let frames=bands(800.,600.,region).into_iter().map(|b|guide_frame(display,900.,b)).collect::<Vec<_>>();
   for y in 0..600{for x in 0..800{let point=NSPoint::new(display.rect.x as f64+x as f64+0.5,900.-display.rect.y as f64-y as f64-0.5);let hits=frames.iter().filter(|f|point.x>=f.origin.x&&point.x<f.origin.x+f.size.width&&point.y>=f.origin.y&&point.y<f.origin.y+f.size.height).count();let selected=x as f64>=region.x&&(x as f64)<region.x+region.width&&y as f64>=region.y&&(y as f64)<region.y+region.height;assert_eq!(hits,if selected{0}else{1},"mask coverage at ({x},{y}) on display {}",display.id);}}
  }
 }
 #[test]fn shifted_top_band_is_rejected_instead_of_covering_the_recording(){
  let expected=NSRect::new(NSPoint::new(0.,573.),NSSize::new(800.,27.));assert!(frame_matches(expected,expected));let shifted=NSRect::new(NSPoint::new(0.,546.),expected.size);assert!(!frame_matches(shifted,expected));assert!(!frame_matches(NSRect::new(NSPoint::new(f64::NAN,573.),expected.size),expected));
 }
}
