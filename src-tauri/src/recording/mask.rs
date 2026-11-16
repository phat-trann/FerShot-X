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
pub struct Mask(tauri::AppHandle);
impl Mask{
 pub fn show(app:&tauri::AppHandle,display:DisplayTarget,region:CaptureRegion)->Result<Self,NativeError>{
  let(tx,rx)=mpsc::channel();app.run_on_main_thread(move||{
   let result=objc2::exception::catch(||unsafe{
    clear();let class=AnyClass::get(c"NSWindow").ok_or_else(fail)?;
    let colors=AnyClass::get(c"NSColor").ok_or_else(fail)?;
    let color:Retained<AnyObject>=msg_send![colors,colorWithCalibratedWhite:0f64,alpha:0.24f64];
    let primary=core_graphics::display::CGDisplay::main().bounds().size.height;
    for b in bands(display.rect.width as f64,display.rect.height as f64,region){
     // Quartz uses a top-left origin; AppKit uses the primary display's bottom.
     let rect=NSRect::new(NSPoint::new(display.rect.x as f64+b.x,primary-display.rect.y as f64-b.y-b.height),NSSize::new(b.width,b.height));
     let allocated:objc2::rc::Allocated<AnyObject>=msg_send![class,alloc];
     let window:Retained<AnyObject>=msg_send![allocated,initWithContentRect:rect,styleMask:0usize,backing:2usize,defer:Bool::NO];
     let _:()=msg_send![&*window,setReleasedWhenClosed:Bool::NO];
     WINDOWS.with(|windows|windows.borrow_mut().push(window.clone()));
     let _:()=msg_send![&*window,setOpaque:Bool::NO];let _:()=msg_send![&*window,setBackgroundColor:&*color];
     let _:()=msg_send![&*window,setHasShadow:Bool::NO];let _:()=msg_send![&*window,setIgnoresMouseEvents:Bool::YES];
     let _:()=msg_send![&*window,setLevel:3isize];let _:()=msg_send![&*window,setCollectionBehavior:321usize];
     let _:()=msg_send![&*window,orderFrontRegardless];
    }Ok(())
   }).unwrap_or_else(|_|Err(fail()));
   if result.is_err(){clear();}let _=tx.send(result);
  }).map_err(|_|fail())?;
  // On timeout, enqueue cleanup after the show operation on the same main queue.
  let mask=Self(app.clone());rx.recv_timeout(Duration::from_secs(5)).map_err(|_|fail())??;Ok(mask)
 }
}
impl Drop for Mask{fn drop(&mut self){let _=self.0.run_on_main_thread(clear);}}
#[cfg(test)]mod tests{use super::*;
 #[test]fn bands_cover_only_outside_selected_region(){let r=CaptureRegion{x:100.,y:50.,width:400.,height:300.};let b=bands(800.,600.,r);assert_eq!(b.len(),4);let area:f64=b.iter().map(|b|b.width*b.height).sum();assert_eq!(area,800.*600.-400.*300.);for b in b{assert!(b.x+b.width<=r.x||b.x>=r.x+r.width||b.y+b.height<=r.y||b.y>=r.y+r.height);}}
 #[test]fn fullscreen_has_no_dimming_bands(){assert!(bands(800.,600.,CaptureRegion{x:0.,y:0.,width:800.,height:600.}).is_empty());}
}
