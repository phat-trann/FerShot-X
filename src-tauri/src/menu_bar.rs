use crate::imaging::{NativeError, NativeJobs};
use std::sync::{Mutex, atomic::{AtomicBool, Ordering}};
use tauri::{Manager, menu::{CheckMenuItem, Menu, IconMenuItem, PredefinedMenuItem, Submenu}, tray::TrayIconBuilder};

const ID: &str = "fershot-menu-bar";
#[derive(Default)]
pub struct MenuBarState { startup: Mutex<Option<CheckMenuItem<tauri::Wry>>>, capture_upload:Mutex<Option<IconMenuItem<tauri::Wry>>>, repeat: Mutex<Option<IconMenuItem<tauri::Wry>>>, repeat_available: AtomicBool }
pub const CAPTURE_ITEMS: &[(&str, &str)] = &[
    ("capture-fullscreen", "Capture Screen"), ("capture-area", "Capture Area"), ("capture-scrolling", "Scrolling Capture"),
];
pub const MORE_ITEMS: &[(&str, &str)] = &[
    ("capture-repeat-region", "Repeat Area Capture"), ("capture-active-window", "Capture Active Window"), ("capture-window", "Capture Any Window"),
];
pub fn update_startup_check(app: &tauri::AppHandle, enabled: bool) {
    if let Some(state) = app.try_state::<MenuBarState>() {
        if let Ok(item) = state.startup.lock() { if let Some(item) = item.as_ref() { let _ = item.set_checked(enabled); } }
    }
}
pub fn capture_upload_title(enabled:bool)->&'static str{if enabled{"Upload Captures Immediately  ✓"}else{"Upload Captures Immediately"}}
pub fn update_capture_upload(app:&tauri::AppHandle,enabled:bool){if let Some(state)=app.try_state::<MenuBarState>(){if let Ok(item)=state.capture_upload.lock(){if let Some(item)=item.as_ref(){let _=item.set_text(capture_upload_title(enabled));}}}}
pub fn update_repeat_availability(app: &tauri::AppHandle, available: bool) {
    if let Some(state)=app.try_state::<MenuBarState>() {
        state.repeat_available.store(available,Ordering::Relaxed);
        if let Ok(item)=state.repeat.lock(){if let Some(item)=item.as_ref(){let _=item.set_enabled(available);}}
    }
}
fn lucide_icon(name:&str)->tauri::image::Image<'static>{let bytes:&[u8]=match name{
 "square-library"=>include_bytes!("../icons/menu/square-library.png"),"monitor"=>include_bytes!("../icons/menu/monitor.png"),"scan-square"=>include_bytes!("../icons/menu/scan-square.png"),"gallery-vertical"=>include_bytes!("../icons/menu/gallery-vertical.png"),"app-window-mac"=>include_bytes!("../icons/menu/app-window-mac.png"),"folder-open"=>include_bytes!("../icons/menu/folder-open.png"),"clipboard-list"=>include_bytes!("../icons/menu/clipboard-list.png"),"cog"=>include_bytes!("../icons/menu/cog.png"),"circle-power"=>include_bytes!("../icons/menu/circle-power.png"),"cloud-upload"=>include_bytes!("../icons/menu/cloud-upload.png"),_=>include_bytes!("../icons/menu/ellipsis.png")};let image=image::load_from_memory(bytes).expect("Bundled Lucide icon").to_rgba8();let(w,h)=image.dimensions();tauri::image::Image::new_owned(image.into_raw(),w,h)}
fn icon_for(id:&str)->&str{match id{"show-workspace"=>"square-library","capture-fullscreen"=>"monitor","capture-area"|"capture-repeat-region"=>"scan-square","capture-scrolling"=>"gallery-vertical","capture-active-window"|"capture-window"=>"app-window-mac","open-file"=>"folder-open","open-clipboard"=>"clipboard-list","capture-instant-upload"=>"cloud-upload",_=>"ellipsis"}}
pub fn build(app: &tauri::AppHandle) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::new(app)?;
    let item = |id, title| IconMenuItem::with_id(app, id, title, true, Some(lucide_icon(icon_for(id))), None::<&str>);
    menu.append(&item("show-workspace", "Library")?)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    for (id,title) in CAPTURE_ITEMS { menu.append(&item(*id,*title)?)?; }
    let more=Submenu::new(app,"More",true)?;more.set_icon(Some(lucide_icon("ellipsis")))?;
    for (id,title) in MORE_ITEMS {
        let entry=item(*id,*title)?;
        if *id=="capture-repeat-region" {
            let state=app.state::<MenuBarState>();entry.set_enabled(state.repeat_available.load(Ordering::Relaxed))?;
            if let Ok(mut saved)=state.repeat.lock(){*saved=Some(entry.clone());}
        }
        more.append(&entry)?;
    }
    more.append(&PredefinedMenuItem::separator(app)?)?;
    more.append(&item("open-file", "Open File…")?)?;
    more.append(&item("open-clipboard", "Load From Clipboard")?)?;
    menu.append(&more)?;
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    let instant_enabled=crate::capture_upload::read(app).unwrap_or(false);
    let instant=IconMenuItem::with_id(app,"capture-instant-upload",capture_upload_title(instant_enabled),true,Some(lucide_icon("cloud-upload")),None::<&str>)?;
    menu.append(&instant)?;if let Ok(mut saved)=app.state::<MenuBarState>().capture_upload.lock(){*saved=Some(instant);}
    if let Ok(login) = fershot_application_services::login_state(app) {
        if login.supported {
            let startup = CheckMenuItem::with_id(app,"launch-startup","Launch at Startup",true,login.enabled,None::<&str>)?;
            menu.append(&startup)?;
            if let Ok(mut saved) = app.state::<MenuBarState>().startup.lock() { *saved = Some(startup); }
        }
    }
    menu.append(&IconMenuItem::with_id(app,"open-preferences","Settings…",true,Some(lucide_icon("cog")),Some("CmdOrCtrl+,"))?)?;
    menu.append(&IconMenuItem::with_id(app,"quit-app","Quit",true,Some(lucide_icon("circle-power")),Some("CmdOrCtrl+Q"))?)?;
    Ok(menu)
}
#[tauri::command]
pub async fn set_menu_bar_icon(enabled: bool, window: tauri::WebviewWindow, app: tauri::AppHandle,
    jobs: tauri::State<'_, NativeJobs>) -> Result<(), NativeError> {
    crate::preferences_window::validate_label(window.label())?;
    let _guard = jobs.acquire()?;
    let error = |reason: tauri::Error| NativeError::new("menu_bar_failed", reason.to_string());
    if let Some(icon) = app.tray_by_id(ID) { return icon.set_visible(enabled).map_err(error); }
    if !enabled { return Ok(()); }
    let menu=build(&app).map_err(error)?;
    let pixels=image::load_from_memory(include_bytes!("../icons/tray.png")).expect("Bundled uploader tray symbol").to_rgba8();let(w,h)=pixels.dimensions();let icon=tauri::image::Image::new_owned(pixels.into_raw(),w,h);
    TrayIconBuilder::with_id(ID).icon(icon).icon_as_template(true).show_menu_on_left_click(true)
        .tooltip("FerShot X").menu(&menu).build(&app).map_err(error)?;
    Ok(())
}
#[cfg(test)]
mod tests {
    #[test] fn quick_menu_contains_only_implemented_capture_routes() {
        assert_eq!(super::CAPTURE_ITEMS.iter().map(|x|x.0).collect::<Vec<_>>(),vec!["capture-fullscreen","capture-area","capture-scrolling"]);
        assert_eq!(super::MORE_ITEMS.iter().map(|x|x.0).collect::<Vec<_>>(),vec!["capture-repeat-region","capture-active-window","capture-window"]);
        for (id,_) in super::CAPTURE_ITEMS.iter().chain(super::MORE_ITEMS.iter()) { assert!(!id.contains("ocr") && !id.contains("license")); }
    }
    #[test] fn capture_upload_menu_item_has_cloud_upload_icon_and_toggled_titles() {
        assert_eq!(super::icon_for("capture-instant-upload"), "cloud-upload");
        assert_eq!(super::capture_upload_title(true), "Upload Captures Immediately  ✓");
        assert_eq!(super::capture_upload_title(false), "Upload Captures Immediately");
    }
}
