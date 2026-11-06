use crate::{active_window, imaging::{NativeError, NativeJobs, validate_window_label}, scrolling::{self, DisplayGeometry}};
use serde::Deserialize;
use std::sync::{Mutex, atomic::{AtomicU64, Ordering}};

#[derive(Clone)]
struct Target { token: String, pid: u32, window: u32, display: DisplayGeometry, x: f64, y: f64 }
#[derive(Default)]
pub struct AutoScrollStore(Mutex<Option<Target>>);
static SEQUENCE: AtomicU64 = AtomicU64::new(1);
fn error(reason: impl ToString) -> NativeError { NativeError::new("auto_scroll_failed", reason.to_string()) }
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request { display: DisplayGeometry, x: u32, y: u32, width: u32, height: u32 }

#[tauri::command]
pub fn begin_auto_scroll(request: Request, window: tauri::WebviewWindow, store: tauri::State<'_, AutoScrollStore>) -> Result<String, NativeError> {
    validate_window_label(window.label())?;
    if scrolling::current_display(&window)? != request.display || request.width == 0 || request.height < 16 ||
        request.x.checked_add(request.width).is_none_or(|x| x > request.display.width) ||
        request.y.checked_add(request.height).is_none_or(|y| y > request.display.height) { return Err(error("Choose a valid region on the unchanged primary display.")); }
    let (pid, target_window) = active_window::target()?;
    let mut state = store.0.lock().map_err(|_| error("Scroll target unavailable."))?;
    if state.is_some() { return Err(error("A scroll session is already active.")); }
    let token = format!("auto-scroll-{}", SEQUENCE.fetch_add(1, Ordering::Relaxed));
    *state = Some(Target { token: token.clone(), pid, window: target_window,
        x: (f64::from(request.display.x) + f64::from(request.x) + f64::from(request.width) / 2.0) / request.display.scale,
        y: (f64::from(request.display.y) + f64::from(request.y) + f64::from(request.height) / 2.0) / request.display.scale,
        display: request.display });
    Ok(token)
}

#[tauri::command]
pub fn advance_auto_scroll(token: String, pixels: i32, window: tauri::WebviewWindow, store: tauri::State<'_, AutoScrollStore>,
    jobs: tauri::State<'_, NativeJobs>) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    let _guard = jobs.acquire()?;
    if pixels == 0 || pixels.unsigned_abs() > 2048 { return Err(error("Scroll step must be within1–2048 pixels.")); }
    let target = store.0.lock().map_err(|_| error("Scroll target unavailable."))?.as_ref()
        .filter(|target| target.token == token).cloned().ok_or_else(|| error("Scroll session expired."))?;
    if scrolling::current_display(&window)? != target.display || active_window::target()? != (target.pid, target.window) {
        return Err(error("The target application/window or display changed. Scroll session stopped."));
    }
    active_window::confirm(target.pid, target.window)?;
    #[cfg(target_os = "macos")] {
        use core_graphics::geometry::CGPoint;
        #[link(name = "CoreGraphics", kind = "framework")]
        unsafe extern "C" {
            fn CGPreflightPostEventAccess() -> bool;
            fn CGEventCreateScrollWheelEvent2(
                source: *mut std::ffi::c_void,
                units: u32,
                wheel_count: u32,
                wheel1: i32,
                wheel2: i32,
                wheel3: i32,
            ) -> *mut std::ffi::c_void;
            fn CGEventSetLocation(event: *mut std::ffi::c_void, point: CGPoint);
            fn CGEventPostToPid(pid: i32, event: *mut std::ffi::c_void);
            fn CFRelease(cf: *const std::ffi::c_void);
        }
        if !unsafe { CGPreflightPostEventAccess() } { return Err(error("macOS has not granted permission to send scrolling events. Use manual capture instead.")); }
        let event = unsafe {
            CGEventCreateScrollWheelEvent2(
                std::ptr::null_mut(),
                0, // kCGScrollEventUnitPixel = 0
                1,
                pixels,
                0,
                0,
            )
        };
        if event.is_null() { return Err(error("Scroll event creation failed.")); }
        unsafe {
            CGEventSetLocation(event, CGPoint::new(target.x, target.y));
            CGEventPostToPid(target.pid as i32, event);
            CFRelease(event);
        }
        Ok(())
    }
    #[cfg(not(target_os = "macos"))] { Err(error("Automatic scrolling requires macOS.")) }
}

#[tauri::command]
pub fn end_auto_scroll(token: String, window: tauri::WebviewWindow, store: tauri::State<'_, AutoScrollStore>) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    let mut state = store.0.lock().map_err(|_| error("Scroll target unavailable."))?;
    if state.as_ref().is_some_and(|target| target.token == token) { *state = None; }
    Ok(())
}
