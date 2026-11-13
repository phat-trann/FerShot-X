use crate::imaging::{NativeError, NativeJobs, validate_window_label};
use tauri::{Manager,Emitter};

pub fn on_window_event(window: &tauri::Window, event: &tauri::WindowEvent) {
    if matches!(window.label(), "main" | "library") {
        if matches!(event, tauri::WindowEvent::Destroyed) { crate::active_window::stop(); }
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
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
/// Every product window opens centered in the active display's usable area.
pub fn bring_to_front(window:&tauri::WebviewWindow)->tauri::Result<()> {
    #[cfg(target_os="macos")]
    window.app_handle().show()?;
    window.unminimize()?;
    center_on_active_display(window)?;
    window.show()?;
    window.set_focus()
}

pub fn initial_geometry(width:u32,height:u32)->(u32,u32){
    (((width as f64*0.8).round() as u32).max(1),((height as f64*0.8).round() as u32).max(1))
}
pub fn setup_main(app:&tauri::AppHandle)->tauri::Result<()> {
    #[cfg(target_os="macos")]
    {
        app.set_activation_policy(tauri::ActivationPolicy::Accessory)?;
        app.set_dock_visibility(false)?;
        objc2_foundation::NSProcessInfo::processInfo().setProcessName(&objc2_foundation::NSString::from_str("FerShot X"));
    }
    for label in ["main", "library"] { if let Some(main)=app.get_webview_window(label) {
        { let monitor=active_monitor(&main)?;
            let area=monitor.work_area();let (mut width,mut height)=initial_geometry(area.size.width,area.size.height);if label=="main"{width=width.min(((height as f64-110.).max(1.)*16./9.).floor()as u32);height=(width as f64*9./16.+110.).round()as u32;}
            // Physical geometry remains correct on Retina and secondary displays.
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
 #[test]fn initial_window_is_eighty_percent_in_physical_pixels(){assert_eq!(super::initial_geometry(1440,900),(1152,720));assert_eq!(super::initial_geometry(2880,1800),(2304,1440));}
}

/// Dock reopen restores the existing editor instead of creating a second workspace.
pub fn on_app_event(app:&tauri::AppHandle,event:&tauri::RunEvent){
 #[cfg(target_os="macos")]
 if let tauri::RunEvent::Reopen{..}=event { let _=crate::library_window::show(app,"library"); }
 #[cfg(not(target_os="macos"))]let _=(app,event);
}
