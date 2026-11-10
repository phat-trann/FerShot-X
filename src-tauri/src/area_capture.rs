//! Remember only macOS-provided selection coordinates, never inferred mouse positions.
use crate::imaging::{NativeError, validate_window_label};
use tauri::Manager;
use fershot_capture_core::ScreenRect;
use std::{path::Path, sync::Mutex};

#[derive(Default)]
pub struct AreaStore(Mutex<Option<(ScreenRect, String)>>);
fn error(message: &str) -> NativeError { NativeError::new("repeat_unavailable", message) }
pub fn topology(window: &tauri::WebviewWindow) -> Result<String, NativeError> {
    let mut screens = window.available_monitors().map_err(|_|error("Cannot verify display geometry."))?.into_iter().map(|m| {
        format!("{:?}:{}:{}:{}:{}:{:.8}", m.name(), m.position().x,m.position().y,m.size().width,m.size().height,m.scale_factor())
    }).collect::<Vec<_>>();
    screens.sort(); if screens.is_empty() { return Err(error("No display is available.")); } Ok(screens.join("|"))
}
pub fn remember(store:&AreaStore, rect:Option<ScreenRect>, before:&str, after:&str) {
    if let Ok(mut saved)=store.0.lock() { *saved=rect.filter(|_|before==after).map(|rect|(rect,after.into())); }
}
pub fn previous(store:&AreaStore,current:&str)->Result<ScreenRect,NativeError> {
    let mut saved=store.0.lock().map_err(|_|error("Remembered area is unavailable."))?;
    match saved.as_ref() {
        Some((rect,screen)) if screen==current => Ok(*rect),
        Some(_) => { *saved=None; Err(NativeError::new("display_changed","Displays changed. Use Capture Area to select a new region.")) },
        None => Err(error("Use Capture Area first. Repeat requires coordinates provided by macOS for the latest successful area capture.")),
    }
}
#[tauri::command]
pub fn repeat_area_available(window:tauri::WebviewWindow,store:tauri::State<'_,AreaStore>)->Result<bool,NativeError> {
    validate_window_label(window.label())?;
    let result=topology(&window).map(|displays|previous(&store,&displays).is_ok());
    crate::menu_bar::update_repeat_availability(window.app_handle(),result.as_ref().copied().unwrap_or(false));
    result
}
#[cfg(target_os="macos")]
fn parse(bytes:&[u8],pixels:(u32,u32))->Option<ScreenRect> {
    if bytes.len()>4096 {return None}
    let values=plist::Value::from_reader(std::io::Cursor::new(bytes)).ok()?;
    let values=values.as_array()?;if values.len()!=4{return None}
    let mut n=[0f64;4];
    for (i,value) in values.iter().enumerate(){n[i]=match value {plist::Value::Real(v)=>*v,plist::Value::Integer(v)=>v.as_signed().map(|v|v as f64).or_else(||v.as_unsigned().map(|v|v as f64))?,_=>return None};if !n[i].is_finite() || n[i].fract()!=0.0{return None}}
    if n[0].abs()>1_000_000.0 || n[1].abs()>1_000_000.0 || !(1.0..=16384.0).contains(&n[2]) || !(1.0..=16384.0).contains(&n[3]) {return None}
    let rect=ScreenRect{x:n[0] as i32,y:n[1] as i32,width:n[2] as u32,height:n[3] as u32};
    let sx=pixels.0 as f64/n[2];let sy=pixels.1 as f64/n[3];
    if !(1.0..=8.0).contains(&sx) || (sx-sy).abs()>0.001 {return None}Some(rect)
}
/// Reads only the private PNG just produced by the explicit native Capture Area action.
#[cfg(target_os="macos")]
pub fn selected_rect(path:&Path,pixels:(u32,u32))->Option<ScreenRect> {
    use std::{ffi::CString,os::unix::ffi::OsStrExt};
    unsafe extern "C" {fn getxattr(path:*const std::ffi::c_char,name:*const std::ffi::c_char,value:*mut std::ffi::c_void,size:usize,position:u32,options:i32)->isize;}
    let path=CString::new(path.as_os_str().as_bytes()).ok()?;
    let name=c"com.apple.metadata:kMDItemScreenCaptureGlobalRect";
    let mut data=[0u8;4096];let length=unsafe{getxattr(path.as_ptr(),name.as_ptr(),data.as_mut_ptr().cast(),data.len(),0,1)};
    if length<=0 || length as usize>data.len(){return None}parse(&data[..length as usize],pixels)
}
#[cfg(not(target_os="macos"))]
pub fn selected_rect(_path:&Path,_pixels:(u32,u32))->Option<ScreenRect>{None}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]fn only_the_latest_successful_selection_on_unchanged_displays_is_repeated(){
        let store=AreaStore::default();let rect=ScreenRect{x:-100,y:20,width:200,height:100};
        assert!(previous(&store,"screens").is_err());remember(&store,Some(rect),"screens","screens");assert_eq!(previous(&store,"screens").unwrap(),rect);
        assert!(previous(&store,"changed").is_err());assert!(previous(&store,"screens").is_err());
        remember(&store,Some(rect),"screens","screens");remember(&store,None,"screens","screens");assert!(previous(&store,"screens").is_err());
        remember(&store,Some(rect),"before","after");assert!(previous(&store,"after").is_err());
    }
    #[cfg(target_os="macos")]
    #[test]fn coordinates_are_read_from_only_the_owned_capture_file(){
        use std::{ffi::CString,os::unix::ffi::OsStrExt};
        unsafe extern "C" {fn setxattr(path:*const std::ffi::c_char,name:*const std::ffi::c_char,value:*const std::ffi::c_void,size:usize,position:u32,options:i32)->i32;}
        let file=tempfile::NamedTempFile::new().unwrap();
        let value=plist::Value::Array(vec![20.into(),40.into(),100.into(),80.into()]);
        let mut bytes=Vec::new();value.to_writer_binary(&mut bytes).unwrap();
        let path=CString::new(file.path().as_os_str().as_bytes()).unwrap();
        assert_eq!(unsafe{setxattr(path.as_ptr(),c"com.apple.metadata:kMDItemScreenCaptureGlobalRect".as_ptr(),bytes.as_ptr().cast(),bytes.len(),0,0)},0);
        assert_eq!(selected_rect(file.path(),(200,160)),Some(ScreenRect{x:20,y:40,width:100,height:80}));
    }
    #[cfg(target_os="macos")]
    #[test]fn selection_metadata_is_bounded_and_matches_pixel_scale(){
        fn plist(values:Vec<plist::Value>)->Vec<u8>{let mut bytes=Vec::new();plist::Value::Array(values).to_writer_binary(&mut bytes).unwrap();bytes}
        let rect=plist(vec![(-100).into(),20.into(),200.into(),100.into()]);assert_eq!(parse(&rect,(400,200)),Some(ScreenRect{x:-100,y:20,width:200,height:100}));
        assert!(parse(&rect,(400,300)).is_none());assert!(parse(b"invalid",(400,200)).is_none());assert!(parse(&[0;4097],(400,200)).is_none());
        assert!(parse(&plist(vec![0.into(),0.into(),0.into(),10.into()]),(1,10)).is_none());
    }
}
