#[cfg(feature = "native-acceptance")]
mod acceptance;
mod commands;
mod imaging;
mod preferences;
mod application_preferences;
mod application_services;
mod recognition_preferences;
mod export_destination;
mod pins;
mod clipboard_import;
mod recognition;
mod scrolling;
mod auto_scroll;
mod effects;
mod lifecycle;
mod archive;
mod printing;
mod shortcuts;
mod deep_links;
mod dragging;
mod desktop_menu;
mod menu_bar;
mod active_window;
mod document_open;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(imaging::NativeJobs::default())
        .manage(auto_scroll::AutoScrollStore::default())
        .manage(preferences::PreferenceGate::default())
        .manage(pins::PinStore::default())
        .manage(printing::PrintStore::default())
        .manage(shortcuts::ShortcutStore::default())
        .manage(deep_links::DeepLinkStore::default())
        .manage(document_open::DocumentOpenStore::default())
        .manage(dragging::DragStore::default())
        .on_window_event(lifecycle::on_window_event)
        .setup(|_app| {
            active_window::install();
            #[cfg(feature = "native-acceptance")] acceptance::setup(_app)?;
            Ok(())
        })
        .menu(desktop_menu::build)
        .on_menu_event(desktop_menu::on_event)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::Builder::new().app_name("Ferby Shottr").build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(shortcuts::on_shortcut).build())
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            imaging::capture_image,
            imaging::capture_active_window,
            imaging::capture_region,
            imaging::process_image,
            imaging::save_image,
            imaging::copy_image,
            preferences::load_preferences,
            preferences::save_preferences,
            preferences::load_application_preferences,
            preferences::save_application_preferences,
            application_services::read_login_state,
            application_services::set_launch_at_login,
            application_services::notify_capture_completed,
            preferences::load_recognition_preferences,
            preferences::save_recognition_preferences,
            export_destination::read_export_destination,
            export_destination::choose_export_directory,
            export_destination::update_export_destination,
            preferences::load_saved_shortcuts,
            preferences::save_shortcut_preferences,
            pins::open_pin,
            pins::get_pin,
            pins::close_pin,
            pins::copy_pin,
            pins::edit_pin,
            clipboard_import::import_clipboard,
            recognition::recognition_languages,
            recognition::recognize_image,
            recognition::copy_recognized_text,
            scrolling::capture_display,
            scrolling::stitch_images,
            auto_scroll::begin_auto_scroll,
            auto_scroll::advance_auto_scroll,
            auto_scroll::end_auto_scroll,
            effects::apply_image_effect,
            lifecycle::close_workspace,
            lifecycle::set_workspace_on_top,
            menu_bar::set_menu_bar_icon,
            archive::read_local_archive,
            archive::write_local_archive,
            printing::open_print_preview,
            printing::get_print_preview,
            printing::print_preview,
            printing::close_print_preview,
            shortcuts::get_shortcuts,
            shortcuts::apply_shortcuts,
            deep_links::read_pending_deep_links,
            deep_links::read_link_policy,
            deep_links::save_link_policy,
            deep_links::acknowledge_deep_links,
            document_open::pending_documents,
            document_open::read_open_document,
            document_open::acknowledge_document,
            dragging::prepare_drag_image,
            dragging::discard_prepared_drag,
            dragging::start_prepared_drag
        ])
;
    #[cfg(feature = "native-acceptance")]
    let builder = builder.on_page_load(acceptance::on_page_load);
    let context = tauri::generate_context!();
    #[cfg(feature = "native-acceptance")]
    let context = acceptance::isolate(context);
    builder.build(context)
        .expect("error while building tauri application")
        .run(|app, event| { deep_links::on_event(app, &event); document_open::on_event(app, &event); });
}
