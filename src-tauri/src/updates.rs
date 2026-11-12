//! Updater state bridge. Only main owns plugin resources; Settings receives bounded status.
use crate::{application_preferences::{self,Document},imaging::{NativeError,JobGuard}};
use serde::{Deserialize,Serialize};
use std::sync::{Mutex,atomic::{AtomicBool,Ordering}};
use tauri::{Emitter,Manager};
#[cfg(not(target_os="macos"))]use tauri_plugin_notification::NotificationExt;
#[derive(Clone,Default,Serialize,Deserialize)]
#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Snapshot{pub phase:Phase,pub available_version:Option<String>,pub downloaded:u64,pub total:Option<u64>,pub error:Option<ErrorCode>}
#[derive(Clone,Copy,Default,Serialize,Deserialize)]#[serde(rename_all="kebab-case")]
pub enum Phase{#[default]Idle,Unconfigured,Checking,Current,Available,Downloading,Downloaded,Installing,Installed,Restarting,Error}
#[derive(Clone,Copy,Serialize,Deserialize)]#[serde(rename_all="kebab-case")]
pub enum ErrorCode{Check,Download,Install,Restart,Busy,Storage}
#[derive(Clone,Copy,Serialize,Deserialize)]#[serde(rename_all="lowercase")]
pub enum Action{Check,Download,Install,Restart}
#[derive(Default)]pub struct UpdateStore{snapshot:Mutex<Snapshot>,guard:Mutex<Option<JobGuard>>,installing:AtomicBool,notified:Mutex<Option<String>>,notification_busy:AtomicBool,notification_status:Mutex<NoticeStatus>}
fn fail()->NativeError{NativeError::new("update_failed","Update service is unavailable. Please retry.")}
fn reader(label:&str)->Result<(),NativeError>{if matches!(label,"main"|"preferences"|"library"){Ok(())}else{Err(fail())}}
pub fn configured(app:&tauri::AppHandle)->bool{app.config().plugins.0.get("updater").and_then(|v|v.get("pubkey")).and_then(|v|v.as_str()).is_some_and(|s|!s.trim().is_empty())}
pub fn is_installing(app:&tauri::AppHandle)->bool{app.state::<UpdateStore>().installing.load(Ordering::Acquire)}
#[tauri::command]pub fn updater_configuration(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<bool,NativeError>{reader(window.label())?;Ok(configured(&app))}
#[tauri::command]pub fn read_update_state(window:tauri::WebviewWindow,store:tauri::State<'_,UpdateStore>)->Result<Snapshot,NativeError>{reader(window.label())?;Ok(store.snapshot.lock().map_err(|_|fail())?.clone())}
pub fn request(app:&tauri::AppHandle,action:Action)->Result<(),NativeError>{app.emit_to("main","fershot-updater-action",action).map_err(|_|fail())}
#[tauri::command]pub fn request_update(action:Action,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{if !matches!(window.label(),"main"|"preferences"){return Err(fail())}request(&app,action)}
#[tauri::command]pub fn publish_update_state(snapshot:Snapshot,window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,UpdateStore>)->Result<(),NativeError>{
 crate::imaging::validate_window_label(window.label())?;
 if snapshot.available_version.as_ref().is_some_and(|v|v.is_empty()||v.len()>64||!v.bytes().all(|c|c.is_ascii_alphanumeric()||b".+-".contains(&c)))||snapshot.downloaded>16*1024*1024*1024||snapshot.total.is_some_and(|v|v>16*1024*1024*1024){return Err(fail())}
 *store.snapshot.lock().map_err(|_|fail())?=snapshot.clone();app.emit("fershot-update-state",snapshot.clone()).map_err(|_|fail())?;
 if matches!(snapshot.phase,Phase::Available){tauri::async_runtime::spawn_blocking(move||{let store=app.state::<UpdateStore>();if let Ok(mut last)=store.notified.lock(){let _=notify_with(&mut last,&snapshot,|version|submit_notice(&app,"FerShot X Update Available",&format!("FerShot X {version} is available. Click to view the update."),false).map_err(|_|()));}});}Ok(())
}
#[derive(Serialize,Deserialize)]#[serde(deny_unknown_fields)]struct Schedule{version:u8,checked_at:u64}
fn due(now:u64,last:u64)->bool{now<last||now.saturating_sub(last)>=86400}
#[tauri::command]pub fn claim_update_check(manual:bool,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<bool,NativeError>{
 crate::imaging::validate_window_label(window.label())?;if !configured(&app){return Ok(false)}
 let dir=app.path().app_config_dir().map_err(|_|fail())?;let now=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|_|fail())?.as_secs();
 let last=match application_preferences::read_document(&dir,Document::UpdateSchedule)?{Some(raw)=>{let value:Schedule=serde_json::from_slice(&raw).map_err(|_|fail())?;if value.version!=1{return Err(fail())}value.checked_at},None=>0};
 if !manual&&!due(now,last){return Ok(false)}
 application_preferences::write_document(&dir,Document::UpdateSchedule,&serde_json::to_vec(&Schedule{version:1,checked_at:now}).map_err(|_|fail())?)?;Ok(true)
}
#[tauri::command]pub fn begin_update_install(window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,UpdateStore>)->Result<(),NativeError>{
 crate::imaging::validate_window_label(window.label())?;
 if store.installing.swap(true,Ordering::AcqRel){return Err(NativeError::new("busy","An update is already being installed."))}
 let result=(||{let guard=app.state::<crate::imaging::NativeJobs>().acquire()?;crate::ftp::ensure_update_idle(&app)?;*store.guard.lock().map_err(|_|fail())?=Some(guard);Ok(())})();if result.is_err(){store.installing.store(false,Ordering::Release)}result
}
#[tauri::command]pub fn end_update_install(window:tauri::WebviewWindow,store:tauri::State<'_,UpdateStore>)->Result<(),NativeError>{crate::imaging::validate_window_label(window.label())?;store.guard.lock().map_err(|_|fail())?.take();store.installing.store(false,Ordering::Release);Ok(())}
#[cfg(test)]mod tests{#[test]fn daily_schedule_handles_restart_and_clock_rollback(){assert!(!super::due(100000,99999));assert!(super::due(186400,100000));assert!(super::due(90000,100000));}#[test]fn only_product_windows_receive_status(){assert!(super::reader("library").is_ok());assert!(super::reader("pin-1").is_err());}}

#[cfg(not(target_os="macos"))]const UPDATE_NOTICE_ID:i32=10701;
fn notify_with(last:&mut Option<String>,snapshot:&Snapshot,send:impl FnOnce(&str)->Result<(),()>)->Result<(),()>{if !matches!(snapshot.phase,Phase::Available){return Ok(())}let Some(version)=snapshot.available_version.as_deref()else{return Ok(())};if last.as_deref()==Some(version){return Ok(())}send(version)?;*last=Some(version.into());Ok(())}
pub fn install_notifications(app:&tauri::AppHandle)->tauri_plugin_notification::Result<()>{crate::update_notifications::install(app);
 #[cfg(not(target_os="macos"))]{let handle=app.clone();app.notification().on_action(move|action|{if action.action_id()=="tap"&&action.notification().is_some_and(|n|n.id()==UPDATE_NOTICE_ID){let app=handle.clone();let _=handle.run_on_main_thread(move||{let _=crate::preferences_window::open_tab(&app,Some("updates"));});}})?;}Ok(())}
#[derive(Clone,Copy,Default,Serialize)]#[serde(rename_all="kebab-case")]pub enum NoticeStatus{#[default]Idle,Sending,Scheduled,Denied,Failed,Timeout,Unavailable}
fn notice_state(app:&tauri::AppHandle,value:NoticeStatus){if let Ok(mut state)=app.state::<UpdateStore>().notification_status.lock(){*state=value;}let _=app.emit("fershot-update-notification-state",value);}
fn submit_notice(app:&tauri::AppHandle,title:&str,body:&str,test:bool)->Result<(),NativeError>{let store=app.state::<UpdateStore>();if store.notification_busy.swap(true,Ordering::AcqRel){return Err(NativeError::new("busy","A notification request is already running."))}notice_state(app,NoticeStatus::Sending);let result=crate::update_notifications::send(app,title,body,test);store.notification_busy.store(false,Ordering::Release);match result{Ok(())=>{notice_state(app,NoticeStatus::Scheduled);Ok(())},Err(error)=>{use crate::update_notifications::Failure;let(status,code,message)=match error{Failure::Denied=>(NoticeStatus::Denied,"notification_denied","Enable FerShot X in System Settings → Notifications, then retry."),Failure::Timeout=>(NoticeStatus::Timeout,"notification_timeout","Notification permission or submission timed out. Retry after answering the macOS prompt."),Failure::Unavailable=>(NoticeStatus::Unavailable,"notification_unavailable","Notifications require the installed FerShot X.app."),Failure::Submission=>(NoticeStatus::Failed,"notification_failed","macOS rejected the notification request. Check Notifications settings and retry.")};notice_state(app,status);crate::diagnostics::record_notification_error(app,matches!(error,Failure::Denied));Err(NativeError::new(code,message))}}}
#[tauri::command]pub fn read_update_notification_status(window:tauri::WebviewWindow,store:tauri::State<'_,UpdateStore>)->Result<NoticeStatus,NativeError>{crate::preferences_window::validate_label(window.label())?;Ok(*store.notification_status.lock().map_err(|_|fail())?)}
#[tauri::command]pub async fn test_update_notification(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{crate::preferences_window::validate_label(window.label())?;tauri::async_runtime::spawn_blocking(move||submit_notice(&app,"FerShot X Notification Test","Notifications are enabled. Click to open Updates.",true)).await.map_err(|_|fail())?}

#[cfg(test)]mod notification_tests{use super::*;#[test]fn notification_is_versioned_deduplicated_and_retries_only_failed_submission(){let mut last=None;let snapshot=Snapshot{phase:Phase::Available,available_version:Some("1.2.0".into()),..Default::default()};assert!(notify_with(&mut last,&snapshot,|_|Err(())).is_err());assert!(last.is_none());let mut versions=Vec::new();notify_with(&mut last,&snapshot,|v|{versions.push(v.to_owned());Ok(())}).unwrap();notify_with(&mut last,&snapshot,|_|panic!("duplicate notification")).unwrap();assert_eq!(versions,vec!["1.2.0"]);notify_with(&mut last,&Snapshot{phase:Phase::Downloading,..snapshot.clone()},|_|panic!("not an available update")).unwrap();notify_with(&mut last,&Snapshot{available_version:Some("1.3.0".into()),..snapshot},|v|{versions.push(v.to_owned());Ok(())}).unwrap();assert_eq!(versions,vec!["1.2.0","1.3.0"]);}}
