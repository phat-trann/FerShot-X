use tauri::{Emitter, Manager, menu::{Menu, MenuItem, PredefinedMenuItem, Submenu}};

pub fn build(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let item = |id, title| MenuItem::with_id(app, id, title, true, None::<&str>);
    let show = item("show-workspace", "Library")?;
    let settings = MenuItem::with_id(app,"open-preferences","Settings…",true,Some("CmdOrCtrl+,"))?;
    let quit = MenuItem::with_id(app,"quit-app","Quit",true,Some("CmdOrCtrl+Q"))?;
    let separator = PredefinedMenuItem::separator(app)?;
    let application = Submenu::with_items(app, "FerShot X", true, &[&show, &settings, &separator, &quit])?;
    let fullscreen = item("capture-fullscreen", "Capture Screen")?;
    let area = item("capture-area", "Capture Area")?;
    let window = item("capture-window", "Capture Any Window")?;
    let active = item("capture-active-window", "Capture Active Window")?;
    let scrolling = item("capture-scrolling", "Scrolling Capture")?;
    let capture = Submenu::with_items(app, "Capture", true, &[&fullscreen, &area, &window, &active, &scrolling])?;
    let clipboard = item("open-clipboard", "Open clipboard image")?;
    let copy = item("image-copy", "Copy edited image")?;
    let save = item("image-save", "Save edited image…")?;
    let upload = MenuItem::with_id(app, "image-upload", "Upload edited image", true, Some("CmdOrCtrl+S"))?;
    let image = Submenu::with_items(app, "Image", true, &[&clipboard, &copy, &save, &upload])?;
    // Preserve standard native text editing without bypassing the workspace's image history.
    let cut = PredefinedMenuItem::cut(app, None)?;
    let text_copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let all = PredefinedMenuItem::select_all(app, None)?;
    let close = PredefinedMenuItem::close_window(app,Some("Close Window"))?;
    let file=Submenu::with_items(app,"File",true,&[&close])?;
    let edit = Submenu::with_items(app, "Edit", true, &[&cut, &text_copy, &paste, &all])?;
    Menu::with_items(app, &[&application, &file, &capture, &image, &edit])
}

pub fn on_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    let action = event.id().as_ref();
    if action == "open-preferences" { let _ = crate::preferences_window::open(app); return; }
    if action == "launch-startup" {
        let app=app.clone();
        tauri::async_runtime::spawn_blocking(move || {
            let outcome=(|| -> Result<bool, crate::imaging::NativeError> {
                let jobs=app.state::<crate::imaging::NativeJobs>();let _guard=jobs.acquire()?;
                let current=fershot_application_services::login_state(&app).map_err(|_|crate::imaging::NativeError::new("application_service_failed","Startup state unavailable."))?;
                let desired=!current.enabled;
                let actual=fershot_application_services::set_launch_at_login(&app,desired).map_err(|_|crate::imaging::NativeError::new("application_service_failed","Startup setting could not be changed."))?;
                if actual!=desired{return Err(crate::imaging::NativeError::new("application_service_failed","The system did not enable the requested startup setting."));}
                Ok(actual)
            })();
            if let Ok(enabled)=outcome { crate::menu_bar::update_startup_check(&app,enabled);crate::preferences_window::changed(&app); }
            else {
                crate::diagnostics::record(&app,crate::diagnostics::Area::Settings,crate::diagnostics::Event::Failed,crate::diagnostics::Code::SettingsFailed);
                if let Ok(current)=fershot_application_services::login_state(&app) { crate::menu_bar::update_startup_check(&app,current.enabled); }
                let _=app.emit_to("main","fershot-menu-action","startup-failed");
            }
        });
        return;
    }
    let Some(main) = app.get_webview_window("main") else { if action=="quit-app" { app.exit(0); } return; };
    match action {
        "show-workspace" => { let _=crate::library_window::show(app,"library"); }
        "quit-app" => { app.exit(0); }
        "open-file" | "open-clipboard" => {
            let _=crate::library_window::show(app,"main");let _=main.emit("fershot-menu-action",action);
        }
        
        "capture-fullscreen" | "capture-area" | "capture-window" | "capture-active-window" | "capture-repeat-region" | "capture-scrolling" => {
            let _ = main.emit("fershot-menu-action", action);
        }
        "image-copy" | "image-save" | "image-upload" if main.is_focused().unwrap_or(false) => {
            let _ = main.emit("fershot-menu-action", action);
        }
        _ => (),
    }
}
