use tauri::{Emitter, Manager, menu::{Menu, MenuItem, PredefinedMenuItem, Submenu}};

pub fn build(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let item = |id, title| MenuItem::with_id(app, id, title, true, None::<&str>);
    let show = item("show-workspace", "Show workspace")?;
    let close = item("close-workspace", "Close workspace…")?;
    let application = Submenu::with_items(app, "Ferby Shottr", true, &[&show, &close])?;
    let fullscreen = item("capture-fullscreen", "Capture primary display")?;
    let area = item("capture-area", "Capture area…")?;
    let window = item("capture-window", "Capture window…")?;
    let active = item("capture-active-window", "Capture last active app window")?;
    let scrolling = item("capture-scrolling", "Manual scrolling capture…")?;
    let ocr = item("ocr-capture", "Capture area for recognition…")?;
    let capture = Submenu::with_items(app, "Capture", true, &[&fullscreen, &area, &window, &active, &scrolling, &ocr])?;
    let clipboard = item("open-clipboard", "Open clipboard image")?;
    let copy = item("image-copy", "Copy edited image")?;
    let save = item("image-save", "Save edited image…")?;
    let pin = item("image-pin", "Pin edited image")?;
    let print = item("image-print", "Print and drag controls…")?;
    let image = Submenu::with_items(app, "Image", true, &[&clipboard, &copy, &save, &pin, &print])?;
    // Preserve standard native text editing without bypassing the workspace's image history.
    let cut = PredefinedMenuItem::cut(app, None)?;
    let text_copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let all = PredefinedMenuItem::select_all(app, None)?;
    let edit = Submenu::with_items(app, "Edit", true, &[&cut, &text_copy, &paste, &all])?;
    Menu::with_items(app, &[&application, &capture, &image, &edit])
}

pub fn on_event(app: &tauri::AppHandle, event: tauri::menu::MenuEvent) {
    let Some(main) = app.get_webview_window("main") else { return; };
    let action = event.id().as_ref();
    match action {
        "show-workspace" => { let _ = main.show(); let _ = main.set_focus(); }
        "close-workspace" => { let _ = main.emit("ferby-workspace-close-requested", ()); }
        "capture-fullscreen" | "capture-area" | "capture-window" | "capture-active-window" | "capture-scrolling" | "ocr-capture" => {
            let _ = main.emit("ferby-menu-action", action);
        }
        "open-clipboard" | "image-copy" | "image-save" | "image-pin" | "image-print" if main.is_focused().unwrap_or(false) => {
            let _ = main.emit("ferby-menu-action", action);
        }
        _ => (),
    }
}
