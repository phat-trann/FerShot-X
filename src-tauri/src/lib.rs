#[cfg(feature = "native-acceptance")]
mod acceptance;
mod commands;
mod diagnostics;
mod ftp;
mod ftp_credentials;
mod local_cache;
mod imaging;
mod area_capture;
mod preferences;
mod preferences_window;
mod application_preferences;
mod application_services;
mod export_destination;
mod clipboard_import;
mod scrolling;
mod automatic_capture;
mod scroll_preferences;
mod effects;
mod lifecycle;
mod library_window;
mod shortcuts;
mod dragging;
mod desktop_menu;
mod menu_bar;
mod capture_upload;
mod updates;
mod active_window;
mod display_capture;
mod document_open;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(imaging::NativeJobs::default())
        .manage(updates::UpdateStore::default())
        .manage(automatic_capture::StopState::default())
        .manage(library_window::EditorInbox::default())
        .manage(diagnostics::DiagnosticStore::default())
        .manage(area_capture::AreaStore::default())
        .manage(ftp::FtpStore::default())
        .manage(local_cache::LocalStore::default())
        .manage(preferences::PreferenceGate::default())
        .manage(menu_bar::MenuBarState::default())
        .manage(shortcuts::ShortcutStore::default())
        .manage(document_open::DocumentOpenStore::default())
        .manage(dragging::DragStore::default())
        .on_window_event(lifecycle::on_window_event)
        .setup(|_app| {
            if updates::install_notifications(_app.handle()).is_err(){diagnostics::record(_app.handle(),diagnostics::Area::App,diagnostics::Event::Failed,diagnostics::Code::Other);}
            active_window::install();
            if shortcuts::restore(_app.handle()).is_err(){diagnostics::record(_app.handle(),diagnostics::Area::Settings,diagnostics::Event::Failed,diagnostics::Code::SettingsFailed);}
            lifecycle::setup_main(_app.handle())?;
            diagnostics::start_cleanup(_app.handle());
            diagnostics::record(_app.handle(),diagnostics::Area::App,diagnostics::Event::Started,diagnostics::Code::None);
            if let Err(error) = ftp::recover(_app.handle()) { let _ = tauri::Emitter::emit_to(_app.handle(), "main", "fershot-ftp-error", error.message); }
            #[cfg(feature = "native-acceptance")] acceptance::setup(_app)?;
            Ok(())
        })
        .menu(desktop_menu::build)
        .on_menu_event(desktop_menu::on_event)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::Builder::new().app_name("FerShot X").build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(shortcuts::on_shortcut).build())
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            updates::updater_configuration,
            updates::read_update_state,
            updates::request_update,
            updates::publish_update_state,
            updates::claim_update_check,
            updates::begin_update_install,
            updates::end_update_install,
            capture_upload::read_capture_upload_mode,
            automatic_capture::capture_scroll_image,
            scroll_preferences::read_scroll_preferences,
            scroll_preferences::save_scroll_preferences,
            library_window::fit_editor_window,
            library_window::show_library,
            library_window::show_editor,
            library_window::library_image,
            library_window::copy_library_images,
            library_window::library_thumbnail,
            library_window::edit_library_image,
            library_window::take_editor_image,
            diagnostics::read_log_preferences,
            diagnostics::save_log_preferences,
            diagnostics::open_logs_folder,
            diagnostics::read_diagnostics,
            diagnostics::record_diagnostic,
            diagnostics::clear_diagnostics,
            diagnostics::export_diagnostics,
            ftp::ftp_read_settings,
            ftp::ftp_open_in_browser,
            ftp::ftp_read_preview_auth,
            ftp::ftp_save_preview_auth,
            ftp::ftp_save_settings,
            ftp::ftp_enqueue,
            ftp::ftp_start,
            ftp::ftp_list,
            ftp::ftp_remove,
            ftp::ftp_delete_remote,
            local_cache::local_cache_list,
            local_cache::local_cache_store,
            local_cache::local_cache_save_draft,
            local_cache::local_cache_read,
            local_cache::local_cache_remove,
            imaging::capture_image,
            imaging::capture_repeat_area,
            area_capture::repeat_area_available,
            imaging::capture_active_window,
            imaging::capture_region,
            imaging::process_image,
            imaging::save_image,
            imaging::copy_image,
            preferences::load_preferences,
            preferences_window::open_preferences_window,
            preferences_window::close_preferences_window,
            preferences::save_preferences,
            preferences::load_application_preferences,
            preferences::save_application_preferences,
            application_services::read_login_state,
            application_services::set_launch_at_login,
            application_services::notify_capture_completed,
            export_destination::read_export_destination,
            export_destination::choose_export_directory,
            export_destination::update_export_destination,
            preferences::load_saved_shortcuts,
            preferences::save_shortcut_preferences,
            clipboard_import::import_clipboard,
            imaging::copy_text,
            scrolling::capture_display,
            scrolling::stitch_images,
            effects::apply_image_effect,
            lifecycle::hide_workspace,
            lifecycle::quit_application,
            lifecycle::set_workspace_on_top,
            menu_bar::set_menu_bar_icon,
            shortcuts::get_shortcuts,
            shortcuts::configure_shortcuts,
            shortcuts::apply_shortcuts,
            document_open::pending_documents,
            document_open::open_image_dialog,
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
        .run(|app, event| { lifecycle::on_app_event(app, &event); document_open::on_event(app, &event); });
}
