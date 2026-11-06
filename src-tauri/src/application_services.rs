use crate::imaging::{NativeError, NativeJobs, validate_window_label};
pub use ferby_application_services::CaptureCompletion;
fn error(reason: impl ToString) -> NativeError { NativeError::new("application_service_failed", reason.to_string()) }

#[tauri::command]
pub async fn read_login_state(window: tauri::WebviewWindow, app: tauri::AppHandle,
    jobs: tauri::State<'_, NativeJobs>) -> Result<ferby_application_services::LoginState, NativeError> {
    validate_window_label(window.label())?; let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || { let _guard = guard; ferby_application_services::login_state(&app).map_err(error) })
        .await.map_err(|_| error("Login state loading stopped unexpectedly."))?
}

#[tauri::command]
pub async fn set_launch_at_login(enabled: bool, window: tauri::WebviewWindow, app: tauri::AppHandle,
    jobs: tauri::State<'_, NativeJobs>) -> Result<bool, NativeError> {
    validate_window_label(window.label())?; let guard = jobs.acquire()?;
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = guard; let actual = ferby_application_services::set_launch_at_login(&app, enabled).map_err(error)?;
        if actual != enabled { return Err(error("The system did not retain the requested login setting.")); }
        Ok(actual)
    }).await.map_err(|_| error("Login setting update stopped unexpectedly."))?
}

#[tauri::command]
pub async fn notify_capture_completed(action: CaptureCompletion, window: tauri::WebviewWindow, app: tauri::AppHandle) -> Result<(), NativeError> {
    validate_window_label(window.label())?;
    tauri::async_runtime::spawn_blocking(move || ferby_application_services::notify_capture_completed(&app, action).map_err(error))
        .await.map_err(|_| error("Notification submission stopped unexpectedly."))?
}
