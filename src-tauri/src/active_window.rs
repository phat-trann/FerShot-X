use crate::imaging::NativeError;

#[cfg(target_os = "macos")]
mod macos {
    use super::*;
    use block2::RcBlock;
    use core_foundation::{array::CFArray, base::{CFType, TCFType}, dictionary::CFDictionary,
        number::CFNumber, string::{CFString, CFStringRef}};
    use core_graphics::window::*;
    use objc2::{rc::Retained, runtime::ProtocolObject};
    use objc2_app_kit::{NSRunningApplication, NSWorkspace, NSWorkspaceDidActivateApplicationNotification};
    use objc2_foundation::{NSNotification, NSNotificationCenter, NSObjectProtocol, NSOperationQueue};
    use std::{cell::RefCell, ptr::NonNull, sync::atomic::{AtomicI32, Ordering}};

    static LAST_EXTERNAL_PID: AtomicI32 = AtomicI32::new(0);
    struct Observer { center: Retained<NSNotificationCenter>, token: Retained<ProtocolObject<dyn NSObjectProtocol>> }
    impl Drop for Observer {
        fn drop(&mut self) {
            // This exact token was returned by this center and stays on its owning main thread.
            let observer: &objc2::runtime::AnyObject = self.token.as_ref();
            unsafe { self.center.removeObserver(observer); }
        }
    }
    thread_local! { static OBSERVER: RefCell<Option<Observer>> = const { RefCell::new(None) }; }

    fn remember_frontmost() {
        if let Some(application) = NSWorkspace::sharedWorkspace().frontmostApplication() {
            let pid = application.processIdentifier();
            if pid > 0 && pid as u32 != std::process::id() { LAST_EXTERNAL_PID.store(pid, Ordering::Release); }
        }
    }

    pub fn install() {
        OBSERVER.with(|slot| {
            if slot.borrow().is_some() { return; }
            remember_frontmost();
            let center = NSWorkspace::sharedWorkspace().notificationCenter();
            let callback = RcBlock::new(|_notification: NonNull<NSNotification>| remember_frontmost());
            // NSWorkspace copies the block; use the main queue, and retain/remove the returned token.
            let token = unsafe { center.addObserverForName_object_queue_usingBlock(
                Some(NSWorkspaceDidActivateApplicationNotification), None, Some(&NSOperationQueue::mainQueue()), &callback) };
            *slot.borrow_mut() = Some(Observer { center, token });
        });
    }
    pub fn stop() { OBSERVER.with(|slot| { slot.borrow_mut().take(); }); }

    fn number(row: &CFDictionary<CFString, CFType>, key: CFStringRef) -> Option<i64> {
        // CoreGraphics guarantees that these constants are CFString keys.
        let key = unsafe { CFString::wrap_under_get_rule(key) };
        row.find(&key)?.downcast::<CFNumber>()?.to_i64()
    }

    pub fn target() -> Result<(u32, u32), NativeError> {
        remember_frontmost();
        let pid = LAST_EXTERNAL_PID.load(Ordering::Acquire);
        if pid <= 0 || NSRunningApplication::runningApplicationWithProcessIdentifier(pid).is_none() {
            return Err(NativeError::new("active_window_unavailable", "Focus the application you want to capture once, then retry."));
        }
        let window = find(pid as u32, None)?;
        Ok((pid as u32, window))
    }

    pub fn target_at(rect:fershot_capture_core::ScreenRect)->Result<(u32,u32),NativeError>{
        let raw=copy_window_info(kCGWindowListOptionOnScreenOnly|kCGWindowListExcludeDesktopElements,kCGNullWindowID).ok_or_else(||NativeError::new("scroll_target_unavailable","Window geometry is unavailable."))?;
        let rows=unsafe{CFArray::<CFDictionary<CFString,CFType>>::wrap_under_get_rule(raw.as_concrete_TypeRef())};
        let key=unsafe{CFString::wrap_under_get_rule(kCGWindowBounds)};let x=rect.x as f64+rect.width as f64/2.;let y=rect.y as f64+rect.height as f64/2.;
        for row in rows.iter().take(512){
            let Some(pid)=unsafe{number(&row,kCGWindowOwnerPID)}.and_then(|v|u32::try_from(v).ok()).filter(|v|*v!=std::process::id())else{continue};
            if unsafe{number(&row,kCGWindowLayer)}!=Some(0){continue}
            let Some(untyped)=row.find(&key).and_then(|v|v.downcast::<CFDictionary>())else{continue};
            let bounds=unsafe{CFDictionary::<CFString,CFType>::wrap_under_get_rule(untyped.as_concrete_TypeRef())};
            let value=|name:&str|bounds.find(&CFString::new(name)).and_then(|v|v.downcast::<CFNumber>()).and_then(|v|v.to_f64());
            let(Some(left),Some(top),Some(width),Some(height))=(value("X"),value("Y"),value("Width"),value("Height"))else{continue};
            if x>=left&&x<left+width&&y>=top&&y<top+height{if let Some(id)=unsafe{number(&row,kCGWindowNumber)}.and_then(|v|u32::try_from(v).ok()){return Ok((pid,id))}}
        }
        Err(NativeError::new("scroll_target_unavailable","Select a scrollable application window, then retry."))
    }
    pub fn activate(pid:u32)->Result<(),NativeError>{
        let application=NSRunningApplication::runningApplicationWithProcessIdentifier(pid as i32).ok_or_else(||NativeError::new("scroll_target_unavailable","The selected application is no longer running."))?;
        if application.isActive()||application.activateWithOptions(objc2_app_kit::NSApplicationActivationOptions::ActivateIgnoringOtherApps){Ok(())}else{Err(NativeError::new("scroll_target_unavailable","The selected application could not be focused."))}
    }
    pub fn confirm(pid: u32, window: u32) -> Result<(), NativeError> { find(pid, Some(window)).map(|_| ()) }

    fn find(pid: u32, expected: Option<u32>) -> Result<u32, NativeError> {
        let raw = copy_window_info(kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements, kCGNullWindowID)
            .ok_or_else(|| NativeError::new("active_window_unavailable", "Window metadata is unavailable. Check capture permission."))?;
        // CGWindowListCopyWindowInfo returns an array of dictionaries; no names/titles are retained.
        let rows = unsafe { CFArray::<CFDictionary<CFString, CFType>>::wrap_under_get_rule(raw.as_concrete_TypeRef()) };
        for row in rows.iter().take(512) {
            let owner = unsafe { number(&row, kCGWindowOwnerPID) };
            let layer = unsafe { number(&row, kCGWindowLayer) };
            let id = unsafe { number(&row, kCGWindowNumber) }.and_then(|id| u32::try_from(id).ok()).filter(|id| *id != 0);
            if owner == Some(i64::from(pid)) && layer == Some(0) {
                if let Some(id) = id.filter(|id| expected.is_none_or(|wanted| wanted == *id)) { return Ok(id); }
            }
        }
        Err(NativeError::new("active_window_unavailable", "The last active application's visible window is unavailable. Focus it and retry."))
    }
}

pub fn install() { #[cfg(target_os = "macos")] macos::install(); }
pub fn stop() { #[cfg(target_os = "macos")] macos::stop(); }
pub fn target() -> Result<(u32, u32), NativeError> {
    #[cfg(target_os = "macos")] { macos::target() }
    #[cfg(not(target_os = "macos"))] { Err(NativeError::new("unsupported", "Active-window capture requires macOS.")) }
}
pub fn confirm(pid: u32, window: u32) -> Result<(), NativeError> {
    #[cfg(target_os = "macos")] { macos::confirm(pid, window) }
    #[cfg(not(target_os = "macos"))] { let _ = (pid, window); Err(NativeError::new("unsupported", "Active-window capture requires macOS.")) }
}

pub fn target_at(rect:fershot_capture_core::ScreenRect)->Result<(u32,u32),NativeError>{
 #[cfg(target_os="macos")]{macos::target_at(rect)}
 #[cfg(not(target_os="macos"))]{let _=rect;Err(NativeError::new("unsupported","Scrolling capture requires macOS."))}
}
pub fn activate(pid:u32)->Result<(),NativeError>{
 #[cfg(target_os="macos")]{macos::activate(pid)}
 #[cfg(not(target_os="macos"))]{let _=pid;Err(NativeError::new("unsupported","Scrolling capture requires macOS."))}
}
