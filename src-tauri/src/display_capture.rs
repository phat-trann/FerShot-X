//! Resolve the display under the pointer before hiding any app windows.
use crate::imaging::NativeError;
use fershot_capture_core::ScreenRect;
#[derive(Clone,Copy,Debug,PartialEq)]
pub struct DisplayTarget { pub id:u32,pub rect:ScreenRect,pub scale:f64 }
fn unavailable()->NativeError{NativeError::new("display_unavailable","The display under the pointer could not be resolved. Move the pointer onto the screen to capture and retry.")}
fn contains(rect:ScreenRect,x:f64,y:f64)->bool{x.is_finite()&&y.is_finite()&&x>=rect.x as f64&&y>=rect.y as f64&&x<(rect.x as f64+rect.width as f64)&&y<(rect.y as f64+rect.height as f64)}
fn choose(displays:&[DisplayTarget],x:f64,y:f64)->Result<DisplayTarget,NativeError>{displays.iter().copied().find(|d|d.rect.is_valid()&&d.scale.is_finite()&&(1.0..=8.0).contains(&d.scale)&&contains(d.rect,x,y)).ok_or_else(unavailable)}
#[cfg(target_os="macos")]
fn snapshot(id:u32)->Result<DisplayTarget,NativeError>{
 use core_graphics::display::CGDisplay;
 let display=CGDisplay::new(id);if !display.is_active(){return Err(unavailable())}
 let b=display.bounds();let values=[b.origin.x,b.origin.y,b.size.width,b.size.height];
 if values.iter().any(|v|!v.is_finite()||(*v-v.round()).abs()>0.01)||b.origin.x.abs()>1_000_000.||b.origin.y.abs()>1_000_000.||!(1.0..=16384.).contains(&b.size.width)||!(1.0..=16384.).contains(&b.size.height){return Err(unavailable())}
 let rect=ScreenRect{x:b.origin.x.round()as i32,y:b.origin.y.round()as i32,width:b.size.width.round()as u32,height:b.size.height.round()as u32};
 let scale=display.pixels_wide()as f64/b.size.width;
 if !scale.is_finite()||!(1.0..=8.0).contains(&scale){return Err(unavailable())}
 Ok(DisplayTarget{id,rect,scale})
}
pub fn under_pointer()->Result<DisplayTarget,NativeError>{
 #[cfg(target_os="macos")]{
  use core_graphics::{display::CGDisplay,event::CGEvent,event_source::{CGEventSource,CGEventSourceStateID}};
  let source=CGEventSource::new(CGEventSourceStateID::CombinedSessionState).map_err(|_|unavailable())?;
  let point=CGEvent::new(source).map_err(|_|unavailable())?.location();
  let ids=CGDisplay::active_displays().map_err(|_|unavailable())?;
  let displays=ids.into_iter().take(32).filter_map(|id|snapshot(id).ok()).collect::<Vec<_>>();choose(&displays,point.x,point.y)
 }
 #[cfg(not(target_os="macos"))]{Err(unavailable())}
}
pub fn confirm(target:DisplayTarget)->Result<(),NativeError>{
 #[cfg(target_os="macos")]{if snapshot(target.id)?==target{Ok(())}else{Err(NativeError::new("display_changed","The selected display changed during capture. Retry on the intended screen."))}}
 #[cfg(not(target_os="macos"))]{let _=target;Err(unavailable())}
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn pointer_selects_secondary_negative_origin_and_its_retina_scale(){let main=DisplayTarget{id:1,rect:ScreenRect{x:0,y:0,width:1440,height:900},scale:2.};let left=DisplayTarget{id:2,rect:ScreenRect{x:-1920,y:-200,width:1920,height:1080},scale:1.};assert_eq!(choose(&[main,left],-400.,100.).unwrap(),left);assert_eq!(choose(&[main,left],100.,100.).unwrap(),main);assert_eq!(choose(&[main,left],0.,100.).unwrap(),main);}
 #[test]fn missing_or_invalid_pointer_never_falls_back_to_primary(){let d=DisplayTarget{id:1,rect:ScreenRect{x:0,y:0,width:100,height:100},scale:2.};for(x,y)in[(100.,0.),(-1.,0.),(f64::NAN,0.)]{assert!(choose(&[d],x,y).is_err())}assert!(choose(&[],1.,1.).is_err());}
}
