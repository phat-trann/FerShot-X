//! Explicit test-feature driver for the real WKWebView + production IPC handlers.
//! No capture, clipboard, input injection, notification, login or privacy-setting commands.
use std::path::PathBuf;
use tauri::{Listener, Manager};

pub fn isolate(mut context: tauri::Context<tauri::Wry>) -> tauri::Context<tauri::Wry> {
    let id = std::env::var("FERSHOT_ACCEPTANCE_ID").expect("test ID is required");
    assert!(id.starts_with("dev.fershot.x.acceptance.") && id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'.' || b == b'-'));
    context.config_mut().identifier = id;
    context
}

pub fn setup(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let phase: u8 = std::env::var("FERSHOT_ACCEPTANCE_PHASE")?.parse()?;
    assert!((1..=3).contains(&phase));
    let report_path = PathBuf::from(std::env::var("FERSHOT_ACCEPTANCE_REPORT")?);
    assert!(report_path.is_absolute() && !report_path.exists());
    let config = app.path().app_config_dir()?;
    let export = config.join("synthetic-exports");
    if phase == 1 {
        // Refuse a reused ID so pre-existing state can never be overwritten.
        assert!(!config.join("fershot-export-destination.json").exists() && !config.join("fershot-settings.json").exists() && !config.join("fershot-application-preferences.json").exists(), "choose a fresh isolated acceptance ID");
        std::fs::create_dir_all(&export)?;
        let destination = serde_json::json!({"version":1,"destination":{"folder":export,"basename":"Acceptance"}});
        std::fs::write(config.join("fershot-export-destination.json"), serde_json::to_vec(&destination)?)?;
    }
    let handle = app.handle().clone();
    app.listen("fershot-acceptance-report", move |event| {
        let mut report: serde_json::Value = serde_json::from_str(event.payload()).unwrap_or_else(|_| serde_json::json!({"ok":false,"error":"invalid report"}));
        report["configDir"] = config.to_string_lossy().into_owned().into();
        report["phase"] = phase.into();
        // Verify actual files through the Rust codec, not through mocked browser payloads.
        if phase == 1 && report["ok"] == true {
            let paths: Vec<_> = std::fs::read_dir(&export).unwrap().filter_map(Result::ok).map(|entry| entry.path()).filter(|path| path.extension().is_some_and(|ext| ext == "png")).collect();
            let mut files = Vec::new();
            for path in paths {
                if path.parent() != Some(export.as_path()) { report["ok"] = false.into(); break; }
                match std::fs::read(&path).ok().and_then(|bytes| image::load_from_memory(&bytes).ok()) {
                    Some(image) => {
                        let image = image.to_rgba8();
                        let pixel = image.get_pixel(20, 40).0;
                        files.push(serde_json::json!({"path":path,"width":image.width(),"height":image.height(),"pixel":pixel}));
                        if image.width()!=100 || image.height()!=80 || !(pixel[0] == 255 && pixel[1] == 255 && (127..=128).contains(&pixel[2]) && pixel[3] == 255) { report["ok"]=false.into(); }
                    }
                    None => report["ok"] = false.into(),
                }
            }
            if files.len()!=2 { report["ok"] = false.into(); }
            report["verifiedExports"] = files.into();
        }
        if phase == 2 && report["ok"] == true {
            // Only our own newly-created config; the next real process must recover without overwriting corruption.
            for name in ["fershot-settings.json", "fershot-application-preferences.json"] {
                if let Err(error) = std::fs::write(config.join(name), b"synthetic-corrupt") { report["ok"] = false.into(); report["error"] = error.to_string().into(); }
            }
        }
        if phase == 3 {
            report["corruptFilesPreserved"] = ["fershot-settings.json", "fershot-application-preferences.json"].iter()
                .all(|name| std::fs::read(config.join(name)).ok().as_deref() == Some(b"synthetic-corrupt".as_slice())).into();
            if report["corruptFilesPreserved"] != true { report["ok"] = false.into(); }
        }
        let code = if report["ok"] == true { 0 } else { 1 };
        if let Err(error) = std::fs::write(&report_path, serde_json::to_vec_pretty(&report).unwrap()) { eprintln!("Acceptance report failed: {error}"); handle.exit(1); return; }
        handle.exit(code);
    });
    Ok(())
}

pub fn on_page_load(webview: &tauri::Webview, payload: &tauri::webview::PageLoadPayload<'_>) {
    if payload.event() != tauri::webview::PageLoadEvent::Finished { return; }
    if webview.label() != "main" { return; }
    let phase = std::env::var("FERSHOT_ACCEPTANCE_PHASE").unwrap();
    let script = format!("window.__FERSHOT_ACCEPTANCE_PHASE__ = {phase};\n{}", include_str!("../../scripts/native_acceptance.js"));
    if let Err(error) = webview.eval(script) { eprintln!("Acceptance eval failed: {error}"); webview.app_handle().exit(1); }
}
