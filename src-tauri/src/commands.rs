use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    name: &'static str,
    version: &'static str,
    platform: &'static str,
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        name: "Ferby Shottr",
        version: env!("CARGO_PKG_VERSION"),
        platform: std::env::consts::OS,
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn app_info_matches_frontend_wire_contract() {
        let value = serde_json::to_value(super::app_info()).unwrap();
        assert_eq!(value["name"], "Ferby Shottr");
        assert_eq!(value["version"], env!("CARGO_PKG_VERSION"));
        assert!(value["platform"].as_str().is_some_and(|s| !s.is_empty()));
    }
}
