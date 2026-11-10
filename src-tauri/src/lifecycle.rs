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

/// Restore visibility and focus when a tray/menu action reopens any product window.
pub fn bring_to_front(window:&tauri::WebviewWindow)->tauri::Result<()> {
    #[cfg(target_os="macos")]
    window.app_handle().show()?;
    window.unminimize()?;
    window.show()?;
    window.set_focus()
}

pub fn initial_geometry(width:u32,height:u32)->(u32,u32){
    (((width as f64*0.8).round() as u32).max(1),((height as f64*0.8).round() as u32).max(1))
}
pub fn setup_main(app:&tauri::AppHandle)->tauri::Result<()> {
    #[cfg(target_os="macos")]objc2_foundation::NSProcessInfo::processInfo().setProcessName(&objc2_foundation::NSString::from_str("FerShot X"));
    for label in ["main", "library"] { if let Some(main)=app.get_webview_window(label) {
        if let Some(monitor)=main.current_monitor()?.or(main.primary_monitor()?) {
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
 #[test]fn initial_window_is_eighty_percent_in_physical_pixels(){assert_eq!(super::initial_geometry(1440,900),(1152,720));assert_eq!(super::initial_geometry(2880,1800),(2304,1440));}
}

/// Dock reopen restores the existing editor instead of creating a second workspace.
pub fn on_app_event(app:&tauri::AppHandle,event:&tauri::RunEvent){
 #[cfg(target_os="macos")]
 if let tauri::RunEvent::Reopen{..}=event { let _=crate::library_window::show(app,"library"); }
 #[cfg(not(target_os="macos"))]let _=(app,event);
}
