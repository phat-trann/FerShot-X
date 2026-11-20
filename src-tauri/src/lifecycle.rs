use crate::imaging::{NativeError, NativeJobs, validate_window_label};
use tauri::{Manager,Emitter};

#[cfg(target_os="macos")]
mod library_frame {
    use block2::RcBlock;
    use objc2::MainThreadMarker;
    use objc2_app_kit::{NSEvent, NSScreen, NSWindow, NSWindowDidExitFullScreenNotification, NSWindowStyleMask};
    use objc2_foundation::{NSNotification, NSNotificationCenter, NSOperationQueue, NSPoint, NSRect, NSSize};
    use std::{cell::Cell, ptr::NonNull};

    thread_local! {
        static PENDING_FRAME: Cell<Option<NSRect>> = const { Cell::new(None) };
    }

    fn unavailable() -> tauri::Error {
        tauri::Error::Io(std::io::Error::other("Library window geometry is unavailable."))
    }

    fn frame_for_area(area: NSRect, scale: f64) -> NSRect {
        let round = |points: f64| (points * scale).round() / scale;
        let width = round(area.size.width * 0.75);
        let height = round(area.size.height * 0.75);
        NSRect::new(
            NSPoint::new(round(area.origin.x + (area.size.width - width) / 2.), round(area.origin.y + (area.size.height - height) / 2.)),
            NSSize::new(width, height),
        )
    }

    fn requested_frame(mtm: MainThreadMarker) -> tauri::Result<NSRect> {
        let pointer = NSEvent::mouseLocation();
        let screen = NSScreen::screens(mtm).iter().find(|screen| {
            let frame = screen.frame();
            pointer.x >= frame.origin.x && pointer.x < frame.origin.x + frame.size.width
                && pointer.y >= frame.origin.y && pointer.y < frame.origin.y + frame.size.height
        }).or_else(|| NSScreen::mainScreen(mtm)).ok_or_else(unavailable)?;
        Ok(frame_for_area(screen.visibleFrame(), screen.backingScaleFactor()))
    }

    fn native_window(window: &tauri::WebviewWindow, _mtm: MainThreadMarker) -> tauri::Result<&NSWindow> {
        // Tauri owns the NSWindow. It is used only while this handle is borrowed on main.
        unsafe { window.ns_window()?.cast::<NSWindow>().as_ref() }.ok_or_else(unavailable)
    }

    fn apply_frame(window: &NSWindow, frame: NSRect) {
        if window.isMiniaturized() { window.deminiaturize(None); }
        window.setMinSize(NSSize::new(frame.size.width.min(800.), frame.size.height.min(540.)));
        window.setFrame_display(frame, window.isVisible());
    }

    fn show_on_main(window: &tauri::WebviewWindow, mtm: MainThreadMarker) -> tauri::Result<()> {
        let frame = requested_frame(mtm)?;
        let native = native_window(window, mtm)?;
        let exiting = PENDING_FRAME.with(|pending| pending.get().is_some());
        if exiting || native.styleMask().contains(NSWindowStyleMask::FullScreen) {
            PENDING_FRAME.with(|pending| pending.set(Some(frame)));
            if !exiting {
                if let Err(error) = window.set_fullscreen(false) {
                    cancel_pending();
                    return Err(error);
                }
            }
            return Ok(());
        }
        apply_frame(native, frame);
        window.show()?;
        window.set_focus()
    }

    pub(super) fn open(window: &tauri::WebviewWindow) -> tauri::Result<()> {
        if let Some(mtm) = MainThreadMarker::new() { return show_on_main(window, mtm); }
        let (send, receive) = std::sync::mpsc::channel();
        let handle = window.clone();
        window.run_on_main_thread(move || {
            let result = MainThreadMarker::new().ok_or_else(unavailable).and_then(|mtm| show_on_main(&handle, mtm));
            let _ = send.send(result);
        })?;
        receive.recv().map_err(|_| unavailable())?
    }

    pub(super) fn setup(window: &tauri::WebviewWindow) -> tauri::Result<()> {
        let mtm = MainThreadMarker::new().ok_or_else(unavailable)?;
        let native = native_window(window, mtm)?;
        apply_frame(native, requested_frame(mtm)?);
        let handle = window.clone();
        let exited = RcBlock::new(move |_: NonNull<NSNotification>| {
            if PENDING_FRAME.with(|pending| pending.get().is_none()) { return; }
            let handle = handle.clone();
            let after_restore = RcBlock::new(move || {
                if let Some(frame) = PENDING_FRAME.with(Cell::take) {
                    if let Some(mtm) = MainThreadMarker::new() {
                        if let Ok(native) = native_window(&handle, mtm) {
                            apply_frame(native, frame);
                            let _ = handle.show().and_then(|_| handle.set_focus());
                        }
                    }
                }
            });
            // Apply after the fullscreen transition and its saved-frame restoration.
            unsafe { NSOperationQueue::mainQueue().addOperationWithBlock(&after_restore); }
        });
        // A single observer is scoped to the retained Library window for the app lifetime.
        unsafe {
            NSNotificationCenter::defaultCenter().addObserverForName_object_queue_usingBlock(
                Some(NSWindowDidExitFullScreenNotification), Some(native), None, &exited,
            );
        }
        Ok(())
    }

    pub(super) fn cancel_pending() { PENDING_FRAME.with(|pending| pending.set(None)); }

    #[cfg(test)]
    mod tests {
        use super::*;
        #[test]
        fn library_frame_centers_at_75_percent_without_using_the_previous_window() {
            for (area, scale, expected) in [
                (NSRect::new(NSPoint::new(-1920., 23.), NSSize::new(1920., 1040.)), 1.,
                 NSRect::new(NSPoint::new(-1680., 153.), NSSize::new(1440., 780.))),
                (NSRect::new(NSPoint::new(900., -780.), NSSize::new(1440., 876.)), 2.,
                 NSRect::new(NSPoint::new(1080., -670.5), NSSize::new(1080., 657.))),
            ] {
                assert_eq!(frame_for_area(area, scale), expected);
            }
        }
    }
}

#[cfg(target_os="macos")]
static REOPEN_POLICY:std::sync::Mutex<crate::reopen_policy::ReopenPolicy>=std::sync::Mutex::new(crate::reopen_policy::ReopenPolicy::new());
/// Mark the Settings destination before native notification activation queues work.
pub fn preserve_settings_activation(){
 #[cfg(target_os="macos")]
 if let Ok(mut policy)=REOPEN_POLICY.lock(){policy.prefer_settings(std::time::Instant::now());}
}
pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    #[cfg(target_os="macos")]
    if window.label()=="preferences"&&matches!(event,tauri::WindowEvent::CloseRequested{..}|tauri::WindowEvent::Destroyed){if let Ok(mut policy)=REOPEN_POLICY.lock(){policy.clear_settings();}}
    if matches!(window.label(), "main" | "library") {
        if matches!(event, tauri::WindowEvent::Destroyed) { crate::active_window::stop(); }
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            #[cfg(target_os="macos")]
            if window.label()=="library" { library_frame::cancel_pending(); }
            // Closing the view preserves documents, queue and the menu-bar process.
            if window.label()=="main" {let _=window.app_handle().emit_to("main","fershot-editor-closed",());}
            let _ = window.hide();
        }
    }
}

/// Hiding is allowed while an upload is running; it never clears state or the tray.
#[tauri::command]
pub fn hide_workspace(window: tauri::WebviewWindow) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    window.hide().map_err(|error| NativeError::new("window_failed", error.to_string()))
}

pub(crate) fn active_monitor(window:&tauri::WebviewWindow)->tauri::Result<tauri::Monitor>{
    let pointer=window.app_handle().cursor_position()?;
    window.monitor_from_point(pointer.x,pointer.y)?.ok_or_else(||tauri::Error::Io(std::io::Error::other("The display under the pointer is unavailable.")))
}
pub(crate) fn center_in_work_area(origin:(i32,i32),area:(u32,u32),window:(u32,u32))->(i32,i32){
    let offset=|available:u32,size:u32|((available as i64-size as i64).max(0)/2)as i32;
    (origin.0.saturating_add(offset(area.0,window.0)),origin.1.saturating_add(offset(area.1,window.1)))
}
/// Center the retained window on the user's display, including after manual moves.
fn center_on_active_display(window:&tauri::WebviewWindow)->tauri::Result<()>{
    let monitor=active_monitor(window)?;let area=monitor.work_area();
    // Moving between Retina/non-Retina displays may update physical outer size.
    for _ in 0..2 {
        let size=window.outer_size()?;
        let(x,y)=center_in_work_area((area.position.x,area.position.y),(area.size.width,area.size.height),(size.width,size.height));
        window.set_position(tauri::PhysicalPosition::new(x,y))?;
    }
    Ok(())
}
pub fn proportional_geometry(width:u32,height:u32,ratio:f64)->(u32,u32){(((width as f64*ratio).round()as u32).max(1),((height as f64*ratio).round()as u32).max(1))}
/// Move first, so logical size constraints use the destination display's scale.
pub(crate) fn size_on_active_display(window:&tauri::WebviewWindow,size:tauri::PhysicalSize<u32>)->tauri::Result<()>{
 let monitor=active_monitor(window)?;let area=monitor.work_area();let(x,y)=center_in_work_area((area.position.x,area.position.y),(area.size.width,area.size.height),(size.width,size.height));window.set_position(tauri::PhysicalPosition::new(x,y))?;window.set_size(size)?;center_on_active_display(window)
}
fn reset_open_geometry(window:&tauri::WebviewWindow)->tauri::Result<()>{
 #[cfg(not(target_os="macos"))]
 if window.label()=="library"{if window.is_maximized()?{window.unmaximize()?;}let monitor=active_monitor(window)?;let area=monitor.work_area();let(w,h)=proportional_geometry(area.size.width,area.size.height,0.75);window.set_min_size(Some(tauri::LogicalSize::new(800f64.min(w as f64/monitor.scale_factor()),540f64.min(h as f64/monitor.scale_factor()))))?;size_on_active_display(window,tauri::PhysicalSize::new(w,h))?;}
 if window.label()=="preferences"{window.set_resizable(false)?;window.set_maximizable(false)?;if window.is_maximized()?{window.unmaximize()?;}let monitor=active_monitor(window)?;let scale=monitor.scale_factor();size_on_active_display(window,tauri::PhysicalSize::new((532.*scale).round()as u32,(637.*scale).round()as u32))?;}
 center_on_active_display(window)
}
/// Every product window opens centered in the active display's usable area.
pub fn bring_to_front(window:&tauri::WebviewWindow)->tauri::Result<()> {
    #[cfg(target_os="macos")]
    if window.label()=="library" { return library_frame::open(window); }
    // Show only this view. AppHandle::show unhides every retained macOS window.
    window.unminimize()?;
    reset_open_geometry(window)?;
    window.show()?;
    window.set_focus()
}

pub fn initial_geometry(width:u32,height:u32)->(u32,u32){
    proportional_geometry(width,height,0.8)
}
pub fn setup_main(app:&tauri::AppHandle)->tauri::Result<()> {
    #[cfg(target_os="macos")]
    {
        app.set_activation_policy(tauri::ActivationPolicy::Accessory)?;
        app.set_dock_visibility(false)?;
        objc2_foundation::NSProcessInfo::processInfo().setProcessName(&objc2_foundation::NSString::from_str("FerShot X"));
    }
    for label in ["main", "library"] { if let Some(main)=app.get_webview_window(label) {
        #[cfg(target_os="macos")]
        if label=="library" {
            library_frame::setup(&main)?;
            apply_material(&main);
            continue;
        }
        { let monitor=active_monitor(&main)?;
            let area=monitor.work_area();let (mut width,mut height)=if label=="library"{proportional_geometry(area.size.width,area.size.height,0.75)}else{initial_geometry(area.size.width,area.size.height)};if label=="main"{width=width.min(((height as f64-110.).max(1.)*16./9.).floor()as u32);height=(width as f64*9./16.+110.).round()as u32;}
            // Physical geometry remains correct on Retina and secondary displays.
            if label=="library"{main.set_min_size(Some(tauri::LogicalSize::new(800f64.min(width as f64/monitor.scale_factor()),540f64.min(height as f64/monitor.scale_factor()))))?;}
            main.set_size(tauri::PhysicalSize::new(width,height))?;
            main.set_position(tauri::PhysicalPosition::new(area.position.x+((area.size.width-width)/2) as i32,area.position.y+((area.size.height-height)/2) as i32))?;
        }
        apply_material(&main);
    }
    }
    Ok(())
}
pub fn apply_material(window:&tauri::WebviewWindow){
    #[cfg(target_os="macos")]
    { use tauri::window::{EffectsBuilder, Effect, EffectState};
      let _=window.set_effects(EffectsBuilder::new().effect(Effect::Sidebar).state(EffectState::FollowsWindowActiveState).build());
      let _=window.set_background_color(Some(tauri::window::Color(0,0,0,0)));
    }
    #[cfg(not(target_os="macos"))]let _=window;
}

#[tauri::command]
pub fn set_workspace_on_top(window: tauri::WebviewWindow, enabled: bool) -> Result<(), NativeError> {
    crate::preferences_window::validate_label(window.label())?;
    let main = window.app_handle().get_webview_window("main").ok_or_else(|| NativeError::new("window_failed", "Workspace is unavailable."))?;
    main.set_always_on_top(enabled).map_err(|error| NativeError::new("window_failed", error.to_string()))?;
    for label in ["preferences","library"] {
        if let Some(secondary)=window.app_handle().get_webview_window(label) {
            secondary.set_always_on_top(enabled).map_err(|error| NativeError::new("window_failed",error.to_string()))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn quit_application(window: tauri::WebviewWindow, jobs: tauri::State<'_, NativeJobs>) -> Result<(), NativeError> {
    crate::preferences_window::validate_label(window.label())?;
    let _ = jobs;
    crate::shortcuts::clear_on_close(window.app_handle())?;
    crate::dragging::clear_on_close(&window.app_handle().state::<crate::dragging::DragStore>())?;
    window.app_handle().exit(0);
    Ok(())
}

#[cfg(test)]mod tests{
 #[test]fn centers_on_negative_origin_secondary_and_mixed_scale_physical_area(){assert_eq!(super::center_in_work_area((-1920,-200),(1920,1080),(960,600)),(-1440,40));assert_eq!(super::center_in_work_area((2880,48),(3840,2112),(1920,1200)),(3840,504));}
 #[test]fn oversized_window_does_not_underflow(){assert_eq!(super::center_in_work_area((-100,20),(800,600),(1000,900)),(-100,20));}
 #[test]fn all_retained_window_sizes_share_the_same_center(){for size in [(532,637),(1152,720),(800,540)]{let(x,y)=super::center_in_work_area((0,24),(1440,876),size);assert!((x as f64+size.0 as f64/2.-720.).abs()<=0.5);assert!((y as f64+size.1 as f64/2.-462.).abs()<=0.5);}}
 #[test]fn library_geometry_is_seventy_five_percent_on_every_scale(){assert_eq!(super::proportional_geometry(1440,900,0.75),(1080,675));assert_eq!(super::proportional_geometry(2880,1800,0.75),(2160,1350));}
 #[test]fn initial_window_is_eighty_percent_in_physical_pixels(){assert_eq!(super::initial_geometry(1440,900),(1152,720));assert_eq!(super::initial_geometry(2880,1800),(2304,1440));}
}

/// A generic reopen must not override an explicit Settings/notification destination.
pub fn on_app_event(app:&tauri::AppHandle,event:&tauri::RunEvent){
 if let tauri::RunEvent::ExitRequested{api,..}=event{if crate::recording::request_exit(app){api.prevent_exit();}}
 #[cfg(target_os="macos")]
 if let tauri::RunEvent::Reopen{has_visible_windows,..}=event {
  if crate::recording::active(app){return;}
  // AppKit's visibility flag may precede a queued notification callback; also
  // inspect retained product views and honor its bounded explicit destination.
  let visible=*has_visible_windows||["preferences","main","library"].into_iter().any(|label|app.get_webview_window(label).is_some_and(|window|window.is_visible().unwrap_or(false)));
  let reopen=REOPEN_POLICY.lock().is_ok_and(|mut policy|policy.should_open_library(std::time::Instant::now(),visible));
  if reopen{let _=crate::library_window::show(app,"library");}
 }
 #[cfg(not(target_os="macos"))]let _=(app,event);
}
