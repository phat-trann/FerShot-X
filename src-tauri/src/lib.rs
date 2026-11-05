mod commands;
mod imaging;
mod preferences;
mod pins;
mod clipboard_import;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(imaging::NativeJobs::default())
        .manage(preferences::PreferenceGate::default())
        .manage(pins::PinStore::default())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            imaging::capture_image,
            imaging::process_image,
            imaging::save_image,
            imaging::copy_image,
            preferences::load_preferences,
            preferences::save_preferences,
            pins::open_pin,
            pins::get_pin,
            pins::close_pin,
            pins::copy_pin,
            pins::edit_pin,
            clipboard_import::import_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
