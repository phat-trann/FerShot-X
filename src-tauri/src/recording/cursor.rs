//! Obtain only the public macOS arrow artwork. No global cursor/input polling.
use super::timeline::CursorAsset;
use crate::imaging::NativeError;
use objc2::{msg_send,rc::Retained,runtime::{AnyClass,AnyObject}};
use objc2_foundation::{NSPoint,NSSize};
use base64::{Engine as _,engine::general_purpose::STANDARD};
fn fail()->NativeError{NativeError::new("video_cursor_failed","The macOS cursor artwork is unavailable. Choose Custom Arrow.")}
fn artwork(image:&AnyObject,hotspot:NSPoint)->Result<CursorAsset,NativeError>{unsafe{
 use core_graphics::{context::CGContext,color_space::CGColorSpace,geometry::{CGRect,CGPoint,CGSize}};
 use objc2_foundation::NSRect;
 let size:NSSize=msg_send![image,size];if ![size.width,size.height,hotspot.x,hotspot.y].iter().all(|v|v.is_finite())||size.width<=0.||size.height<=0.{return Err(fail())}
 let mut proposed=NSRect::new(NSPoint::new(0.,0.),size);
 let pointer:*mut std::ffi::c_void=msg_send![image,CGImageForProposedRect:&mut proposed,context:std::ptr::null::<AnyObject>(),hints:std::ptr::null::<AnyObject>()];if pointer.is_null(){return Err(fail())}
 // NSCursor images may contain vector/multi-resolution representations. Render
 // one bounded CGImage instead of round-tripping those representations via TIFF.
 unsafe extern "C"{fn CFRetain(value:*const std::ffi::c_void)->*const std::ffi::c_void;}
 use foreign_types::ForeignType;CFRetain(pointer);let image=core_graphics::image::CGImage::from_ptr(pointer.cast());
 let ratio=128./size.width.max(size.height);let width=(size.width*ratio).round().max(1.)as usize;let height=(size.height*ratio).round().max(1.)as usize;
 let space=CGColorSpace::create_device_rgb();let mut context=CGContext::create_bitmap_context(None,width,height,8,width*4,&space,core_graphics::base::kCGImageAlphaPremultipliedLast|core_graphics::base::kCGBitmapByteOrder32Big);
 context.draw_image(CGRect::new(&CGPoint::new(0.,0.),&CGSize::new(width as f64,height as f64)),&image);let mut pixels=context.data().to_vec();
 for p in pixels.chunks_exact_mut(4){let alpha=p[3]as u16;if alpha>0{for c in &mut p[..3]{*c=(*c as u16*255/alpha).min(255)as u8;}}}
 let rgba=image::RgbaImage::from_raw(width as u32,height as u32,pixels).ok_or_else(fail)?;let mut png=std::io::Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(rgba).write_to(&mut png,image::ImageFormat::Png).map_err(|_|fail())?;
 let value=CursorAsset{png:format!("data:image/png;base64,{}",STANDARD.encode(png.into_inner())),width:width as u32,height:height as u32,hotspot_x:(hotspot.x/size.width).clamp(0.,1.),hotspot_y:(hotspot.y/size.height).clamp(0.,1.)};if !value.validate(){return Err(fail())}Ok(value)
}}
fn read()->Result<CursorAsset,NativeError>{objc2::exception::catch(||unsafe{
 let cursor:Retained<AnyObject>=msg_send![AnyClass::get(c"NSCursor").ok_or_else(fail)?,arrowCursor];let image:Retained<AnyObject>=msg_send![&*cursor,image];let hotspot:NSPoint=msg_send![&*cursor,hotSpot];artwork(&image,hotspot)
}).unwrap_or_else(|_|Err(fail()))}
#[tauri::command]pub async fn read_recording_cursor(window:tauri::WebviewWindow)->Result<CursorAsset,NativeError>{
 crate::imaging::validate_window_label(window.label())?;let(tx,rx)=std::sync::mpsc::channel();window.run_on_main_thread(move||{let _=tx.send(read());}).map_err(|_|fail())?;
 tauri::async_runtime::spawn_blocking(move||rx.recv_timeout(std::time::Duration::from_secs(5)).map_err(|_|fail())?).await.map_err(|_|fail())?
}

#[cfg(test)]mod tests{use super::*;
 #[test]fn generated_image_representation_produces_bounded_cursor_png(){objc2::rc::autoreleasepool(|_|unsafe{
  let mut encoded=std::io::Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(12,24,image::Rgba([255,128,0,180]))).write_to(&mut encoded,image::ImageFormat::Png).unwrap();let bytes=encoded.into_inner();
  let data:Retained<AnyObject>=msg_send![AnyClass::get(c"NSData").unwrap(),dataWithBytes:bytes.as_ptr(),length:bytes.len()];let allocated:objc2::rc::Allocated<AnyObject>=msg_send![AnyClass::get(c"NSImage").unwrap(),alloc];let image:Retained<AnyObject>=msg_send![allocated,initWithData:&*data];
  let asset=artwork(&image,NSPoint::new(3.,6.)).unwrap();assert_eq!((asset.width,asset.height),(64,128));assert_eq!((asset.hotspot_x,asset.hotspot_y),(0.25,0.25));assert!(asset.validate());
 });}
}
