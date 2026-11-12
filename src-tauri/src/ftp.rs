//! Explicit, persisted screenshot publishing. Enqueue allocates a URL without network I/O.
use crate::diagnostics::{self, Area as LogArea, Event as LogEvent, Code as LogCode};
use crate::imaging::{NativeError, decode_input};
use fershot_image_core::ExportFormat;
use chrono::{Datelike, Timelike};
use serde::{Deserialize, Serialize};
use std::{fs, io::Write, path::{Path, PathBuf}, process::{Command, Stdio}, sync::{Mutex, atomic::{AtomicU64, Ordering}}, time::{SystemTime, UNIX_EPOCH}};
use tauri::{Emitter, Manager};

#[derive(Default)]
pub struct FtpStore(pub Mutex<()>, pub Mutex<std::collections::HashSet<String>>);
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings { host: String, port: u16, username: String, remote_dir: String, #[serde(default)] monthly_folders: bool, public_base_url: String, secure: bool, #[serde(default)] naming_mode: NamingMode, #[serde(default, rename="sharedUploader", skip_serializing)] _retired_shared_flag: bool }
#[derive(Clone, Copy, Default, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
enum NamingMode { #[default] Random, Timestamp }
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct QueueItem { id: String, source_id: String, name: String, remote_path: String, url: String, status: String, created_at: u64, updated_at: u64, error: Option<String>, #[serde(default)] error_code: Option<String> }
#[derive(Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Job { item: QueueItem, settings: Settings, #[serde(default)] remote_name: Option<String> }
#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EnqueueRequest { source_id: String, name: String, png_base64: String }
fn fail(message: &str) -> NativeError { NativeError::new("ftp_failed", message) }
fn now() -> u64 { SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_millis() as u64 }
fn encode_segment(text: &str) -> String {
    text.as_bytes().iter().map(|b| if b.is_ascii_alphanumeric() || b"-._~".contains(b) { (*b as char).to_string() } else { format!("%{b:02X}") }).collect()
}
fn encode_path(text: &str) -> String { text.split('/').map(encode_segment).collect::<Vec<_>>().join("/") }
fn validate(settings: &Settings) -> Result<(), NativeError> {
    if settings.host.is_empty() || settings.host.len() > 253 || !settings.host.bytes().all(|c| c.is_ascii_alphanumeric() || b".-".contains(&c)) || settings.host.starts_with('-') || settings.port == 0 || settings.username.is_empty() || settings.username.len()>256 || settings.username.chars().any(|c| c.is_control() || c == ':') {
        return Err(fail("Enter a valid FTP hostname, port and username."));
    }
    if settings.remote_dir.len()>1024 || !settings.remote_dir.starts_with('/') || settings.remote_dir.contains('\\') || settings.remote_dir.chars().any(char::is_control) || settings.remote_dir.split('/').any(|s| s==".." || s==".") {
        return Err(fail("Remote folder must be an absolute FTP path without traversal."));
    }
    let url = tauri::Url::parse(&settings.public_base_url).map_err(|_| fail("Public URL must be an HTTP or HTTPS base URL."))?;
    if !matches!(url.scheme(), "http"|"https") || url.host_str().is_none() || !url.username().is_empty() || url.password().is_some() || url.query().is_some() || url.fragment().is_some() || settings.public_base_url.len()>2048 {
        return Err(fail("Public URL must use HTTP/HTTPS without credentials, query or fragment."));
    } Ok(())
}
fn account(s: &Settings) -> String { format!("{}:{}:{}",s.host,s.port,s.username) }
fn target(s: &Settings, filename: &str) -> (String,String) {
    let remote = format!("{}/{}", s.remote_dir.trim_end_matches('/'), filename);
    let url = format!("{}{}", s.public_base_url.trim_end_matches('/'), encode_path(&remote));
    (remote,url)
}
// Only the mutable profile interprets the monthly-folder option. Queued jobs store an effective path.
fn freeze_destination<T:chrono::TimeZone>(mut settings:Settings,date:&chrono::DateTime<T>)->Settings {
    if settings.monthly_folders {
        settings.remote_dir=format!("{}/{:02}{:02}",settings.remote_dir.trim_end_matches('/'),date.year().rem_euclid(100),date.month());
        settings.monthly_folders=false;
    }
    settings
}
fn migrate_profile_folder(settings:&mut Settings) {
    let path=settings.remote_dir.trim_end_matches('/');
    if let Some((base,month))=path.rsplit_once('/') {
        if month.len()==4 && month.bytes().all(|b|b.is_ascii_digit()) && month[2..].parse::<u8>().is_ok_and(|m|(1..=12).contains(&m)) {
            settings.remote_dir=if base.is_empty(){"/".into()}else{base.into()};settings.monthly_folders=true;
        }
    }
}
fn root(app: &tauri::AppHandle) -> Result<PathBuf, NativeError> {
    let dir=app.path().app_data_dir().map_err(|_| fail("App data directory is unavailable."))?.join("ftp-v1");
    private_dir(&dir)?; Ok(dir)
}
fn private_dir(dir:&Path) -> Result<(),NativeError> {
    if fs::symlink_metadata(dir).is_ok_and(|m| m.file_type().is_symlink()) { return Err(fail("FTP data directory must not be a symbolic link.")); }
    fs::create_dir_all(dir).map_err(|_| fail("Cannot create private FTP data directory."))?;
    #[cfg(unix)] { use std::os::unix::fs::PermissionsExt; fs::set_permissions(dir,fs::Permissions::from_mode(0o700)).map_err(|_| fail("Cannot protect FTP data directory."))?; } Ok(())
}
fn write_private(path:&Path, bytes:&[u8]) -> Result<(),NativeError> {
    let mut options=fs::OpenOptions::new(); options.write(true).create_new(true);
    #[cfg(unix)] { use std::os::unix::fs::OpenOptionsExt; options.mode(0o600); }
    let mut file=options.open(path).map_err(|_| fail("Cannot create private FTP data file."))?;
    file.write_all(bytes).and_then(|_|file.sync_all()).map_err(|_|fail("Cannot persist FTP data."))
}
fn load(dir:&Path) -> Result<Vec<Job>,NativeError> {
    let path=dir.join("queue.json");
    if !path.exists() { return Ok(Vec::new()); }
    if fs::symlink_metadata(&path).map_err(|_| fail("Cannot read FTP queue metadata."))?.file_type().is_symlink() || fs::metadata(&path).map_err(|_|fail("Cannot read FTP queue."))?.len()>4*1024*1024 { return Err(fail("FTP queue is invalid or too large.")); }
    let jobs:Vec<Job>=serde_json::from_slice(&fs::read(path).map_err(|_|fail("Cannot read FTP queue."))?).map_err(|_|fail("FTP queue is damaged; its original file has been preserved."))?;
    if jobs.len()>256 { return Err(fail("FTP queue exceeds its item limit.")); }
    for job in &jobs {
        validate(&job.settings)?; valid_id(&job.item.id)?;
        if job.settings.monthly_folders {return Err(fail("FTP queued folder must already be frozen; original file preserved."));}
        let frozen_name = frozen_remote_name(job)?;
        let (path,url)=target(&job.settings,&frozen_name);
        if job.item.remote_path!=path || job.item.url!=url || !matches!(job.item.status.as_str(),"pending"|"uploading"|"success"|"failed") { return Err(fail("FTP queue target is inconsistent; original file preserved.")); }
    }
    Ok(jobs)
}
fn persist(dir:&Path,jobs:&[Job]) -> Result<(),NativeError> {
    let temp=dir.join(format!("queue-{}.tmp", fresh_id()));
    write_private(&temp,&serde_json::to_vec(jobs).map_err(|_| fail("Cannot encode FTP queue."))?)?;
    if fs::rename(&temp,dir.join("queue.json")).is_err() { let _=fs::remove_file(temp); return Err(fail("Cannot commit FTP queue.")); } Ok(())
}
static SEQUENCE:AtomicU64=AtomicU64::new(0);
fn fresh_id()->String { format!("{}-{}-{}",SystemTime::now().duration_since(UNIX_EPOCH).unwrap_or_default().as_nanos(),std::process::id(),SEQUENCE.fetch_add(1,Ordering::Relaxed)) }
fn valid_id(id:&str)->Result<(),NativeError> { if id.is_empty() || id.len()>100 || !id.bytes().all(|c|c.is_ascii_digit() || c==b'-') { Err(fail("Invalid FTP item ID.")) } else {Ok(())} }
fn frozen_remote_name(job: &Job) -> Result<String, NativeError> {
    let random = format!("screenshot-{}.png", job.item.id);
    let name = job.remote_name.as_deref().unwrap_or(&random);
    let valid = match job.settings.naming_mode {
        NamingMode::Random => name == random,
        NamingMode::Timestamp => name.len() == 13 && name.ends_with(".png") && name.as_bytes()[..9].iter().all(u8::is_ascii_digit),
    };
    if !valid { return Err(fail("FTP queue filename is inconsistent; original file preserved.")); }
    Ok(name.to_owned())
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
struct TimestampSlot { second: i64, sequence: u8 }
fn next_timestamp_slot(previous: Option<TimestampSlot>, second: i64) -> Result<TimestampSlot, NativeError> {
    if second < 0 { return Err(fail("System time is unavailable for timestamp filenames.")); }
    match previous {
        Some(p) if p.sequence > 9 || p.second < 0 => Err(fail("Timestamp naming state is invalid; its file has been preserved.")),
        Some(p) if p.second >= second => {
            if p.sequence < 9 { Ok(TimestampSlot { second: p.second, sequence: p.sequence + 1 }) }
            else { Ok(TimestampSlot { second: p.second.checked_add(1).ok_or_else(|| fail("Timestamp naming time is out of range."))?, sequence: 0 }) }
        }
        _ => Ok(TimestampSlot { second, sequence: 0 }),
    }
}
fn timestamp_filename<T: chrono::TimeZone>(date: &chrono::DateTime<T>, sequence: u8) -> String {
    format!("{:02}{:02}{:02}{:02}{}.png",date.day(),date.hour(),date.minute(),date.second(),sequence.min(9))
}
fn reserve_timestamp_name(dir: &Path, jobs: &[Job], second: i64) -> Result<String, NativeError> {
    let path = dir.join("timestamp-names.json");
    let mut previous = match fs::symlink_metadata(&path) {
        Ok(m) if !m.is_file() || m.file_type().is_symlink() || m.len() > 1024 => return Err(fail("Timestamp naming state is invalid; its file has been preserved.")),
        Ok(_) => Some(serde_json::from_slice::<TimestampSlot>(&fs::read(&path).map_err(|_| fail("Cannot read timestamp naming state."))?).map_err(|_| fail("Timestamp naming state is damaged; its file has been preserved."))?),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
        Err(_) => return Err(fail("Cannot inspect timestamp naming state.")),
    };
    // The tiny high-water mark survives restart/removal. Reserve before publishing a URL.
    for _ in 0..=jobs.len() {
        let slot = next_timestamp_slot(previous, second)?;
        let date = chrono::DateTime::from_timestamp(slot.second, 0).ok_or_else(|| fail("Timestamp naming time is out of range."))?.with_timezone(&chrono::Local);
        let name = timestamp_filename(&date, slot.sequence);
        previous = Some(slot);
        if jobs.iter().any(|job| job.item.remote_path.rsplit('/').next() == Some(name.as_str())) { continue; }
        let temp = dir.join(format!("timestamp-{}.tmp", fresh_id()));
        write_private(&temp, &serde_json::to_vec(&slot).map_err(|_| fail("Cannot encode timestamp naming state."))?)?;
        if fs::rename(&temp, &path).is_err() { let _ = fs::remove_file(temp); return Err(fail("Cannot reserve timestamp filename.")); }
        return Ok(name);
    }
    Err(fail("Cannot allocate an unused timestamp filename. Retry shortly."))
}
fn require_main(window:&tauri::WebviewWindow)->Result<(),NativeError> { crate::imaging::validate_window_label(window.label()) }
fn settings_load(dir:&Path)->Result<Option<Settings>,NativeError> {
    let path=dir.join("settings.json"); if !path.exists(){return Ok(None)}
    if fs::symlink_metadata(&path).map_err(|_|fail("Cannot read FTP settings."))?.file_type().is_symlink() || fs::metadata(&path).map_err(|_|fail("Cannot read FTP settings."))?.len()>8192 {return Err(fail("FTP settings file is invalid."))}
    let value:serde_json::Value=serde_json::from_slice(&fs::read(path).map_err(|_| fail("Cannot read FTP settings."))?).map_err(|_|fail("FTP settings are damaged; file preserved."))?; let old_profile=value.get("monthlyFolders").is_none(); let mut settings:Settings=serde_json::from_value(value).map_err(|_|fail("FTP settings are damaged; file preserved."))?; if old_profile {migrate_profile_folder(&mut settings);} validate(&settings)?; Ok(Some(settings))
}
fn password_for(app:&tauri::AppHandle,settings:&Settings)->Result<String,NativeError>{crate::ftp_credentials::get(app,&account(settings))}
#[tauri::command]
pub async fn ftp_read_settings(window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,FtpStore>)->Result<Option<Settings>,NativeError>{
    crate::preferences_window::validate_label(window.label())?; let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;settings_load(&root(&app)?)
}
#[tauri::command]
pub async fn ftp_save_settings(settings:Settings,password:Option<String>,window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,FtpStore>)->Result<Settings,NativeError>{
    crate::preferences_window::validate_label(window.label())?;validate(&settings)?;
    if let Some(ref secret)=password { if secret.is_empty() || secret.len()>4096 || secret.chars().any(char::is_control) { return Err(fail("Enter a nonempty FTP password without control characters.")); } }
    // Private credential file IO stays off the UI thread; IPC returns only the profile.
    let credential_settings=settings.clone();let credential_app=app.clone();
    tauri::async_runtime::spawn_blocking(move || if let Some(secret)=password {crate::ftp_credentials::set(&credential_app,&account(&credential_settings),&secret)} else {password_for(&credential_app,&credential_settings).map(|_|())}).await.map_err(|_|fail("Credential storage worker stopped."))??;
    let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;let dir=root(&app)?;
    let tmp=dir.join(format!("settings-{}.tmp",fresh_id()));write_private(&tmp,&serde_json::to_vec(&settings).map_err(|_|fail("Cannot encode FTP settings."))?)?;
    fs::rename(tmp,dir.join("settings.json")).map_err(|_|fail("Cannot save FTP settings."))?;Ok(settings)
}
#[tauri::command]
pub async fn ftp_list(window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,FtpStore>)->Result<Vec<QueueItem>,NativeError>{
    crate::library_window::validate_reader(window.label())?;let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;Ok(load(&root(&app)?)?.into_iter().map(|j|j.item).collect())
}
#[tauri::command]
pub async fn ftp_enqueue(request:EnqueueRequest,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<QueueItem,NativeError>{
    require_main(&window)?;
    tauri::async_runtime::spawn_blocking(move || {
        crate::imaging::validate_name(&request.name)?;
        if request.source_id.is_empty() || request.source_id.len()>128 {return Err(fail("Invalid source ID."))}
        let bytes=decode_input(&request.png_base64)?.encode(ExportFormat::Png).map_err(|_|fail("Cannot freeze upload image."))?;
        let store=app.state::<FtpStore>();let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;let dir=root(&app)?;
        let settings=settings_load(&dir)?.ok_or_else(||fail("Configure FTP in Settings before uploading."))?;
        let mut jobs=load(&dir)?;
        if jobs.len()>=256 {return Err(fail("FTP queue is full. Remove old entries first."))}
        let used:u64=fs::read_dir(&dir).map_err(|_|fail("Cannot inspect FTP cache."))?.filter_map(Result::ok).filter_map(|e|e.metadata().ok()).map(|m|m.len()).sum();
        if used.saturating_add(bytes.len() as u64)>512*1024*1024 {return Err(fail("FTP retry cache reached 512 MiB. Remove old entries first."))}
        let id=fresh_id();let time=now();
        let name=match settings.naming_mode { NamingMode::Random => format!("screenshot-{id}.png"), NamingMode::Timestamp => reserve_timestamp_name(&dir,&jobs,(time/1000) as i64)? };
        let date=chrono::DateTime::from_timestamp_millis(time as i64).ok_or_else(||fail("System time is unavailable for upload folders."))?.with_timezone(&chrono::Local);
        let settings=freeze_destination(settings,&date);
        validate(&settings)?;
        let (remote_path,url)=target(&settings,&name);
        let item=QueueItem{id:id.clone(),source_id:request.source_id,name:request.name,remote_path,url,status:"pending".into(),created_at:time,updated_at:time,error:None,error_code:None};
        let image_path=dir.join(format!("{id}.png"));write_private(&image_path,&bytes)?;if let Err(e)=ensure_thumbnail(&dir,&id){let _=fs::remove_file(&image_path);return Err(e)}
        jobs.insert(0,Job{item:item.clone(),settings,remote_name:Some(name)});
        if let Err(error)=persist(&dir,&jobs){let _=fs::remove_file(image_path);return Err(error)}
        diagnostics::record(&app,LogArea::Ftp,LogEvent::Queued,LogCode::None);
        let _=app.emit("fershot-ftp-updated",());Ok(item)
    }).await.map_err(|_|fail("FTP enqueue worker stopped."))?
}
fn quoted(text:&str)->String { format!("\"{}\"",text.replace('\\',"\\\\").replace('"',"\\\"")) }
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum PassiveMode { Pasv, Epsv }
fn transport_command(job:&Job,image:&Path,mode:PassiveMode)->Command{
    let url=format!("ftp://{}:{}/%2F{}",job.settings.host,job.settings.port,encode_path(job.item.remote_path.trim_start_matches('/')));
    // Disable curlrc and proxies, restrict protocols, keep the password off argv/disk/logs.
    let mut command=Command::new("/usr/bin/curl");
    command.args(["--disable","--config","-","--silent","--fail","--globoff","--proto","=ftp","--noproxy","*","--connect-timeout","15","--max-time","180","--ftp-create-dirs","--upload-file"]).arg(image).arg("--url").arg(url);
    // Some IPv4 servers accept EPSV but expose an unreachable data port. Curl only
    // falls back on protocol rejection, not this timeout. Prefer the working PASV
    // strategy and pin its data host to the authenticated control peer (basic-ftp's default).
    command.args(["--ftp-pasv", "--ftp-skip-pasv-ip"]);
    if mode == PassiveMode::Pasv { command.arg("--disable-epsv"); }
    if job.settings.secure {command.arg("--ssl-reqd");}
    command
}
fn run_transport(job:&Job,image:&Path,password:&str,mode:PassiveMode)->Result<Option<i32>,NativeError>{
    let mut command=transport_command(job,image,mode);
    let mut child=command.stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|_|fail("System FTP transport is unavailable."))?;
    let config=format!("user = {}\n",quoted(&format!("{}:{}",job.settings.username,password)));
    let sent=child.stdin.take().ok_or_else(||fail("FTP transport input unavailable."))?.write_all(config.as_bytes());
    if sent.is_err(){let _=child.kill();let _=child.wait();return Err(fail("Could not configure FTP transport."))}
    let status=child.wait().map_err(|_|fail("FTP transport stopped."))?;
    Ok(status.code())
}
fn transfer_with(job:&Job,image:&Path,password:&str,mut run:impl FnMut(&Job,&Path,&str,PassiveMode)->Result<Option<i32>,NativeError>)->Result<(),NativeError>{
    if password.is_empty() || password.len()>4096 || password.chars().any(char::is_control) { return Err(fail("Stored FTP password is invalid. Save it again.")); }
    let mut status=run(job,image,password,PassiveMode::Pasv)?;
    // 13/14 mean passive negotiation failed before STOR; an EPSV-only server can
    // safely try the alternate strategy. Never silently replay a partial transfer.
    if matches!(status,Some(13|14)){status=run(job,image,password,PassiveMode::Epsv)?;}
    if status!=Some(0){
        let (code,message)=match status{
            Some(6|7)=>("ftp_connection","FTP server could not be reached. Check the address and connection."),
            Some(28)=>("ftp_timeout","FTP transfer timed out. Retry keeps the same URL."),
            Some(67)=>("ftp_authentication","FTP login failed. Check username and your saved password."),
            Some(60)=>("ftp_tls","FTP TLS certificate could not be verified."),
            _=>("ftp_failed","FTP transfer failed. Check connection and folder permissions. Retry keeps the same URL."),
        };return Err(NativeError::new(code,message))
    }Ok(())
}
fn transfer(job:&Job,image:&Path,password:&str)->Result<(),NativeError>{
    transfer_with(job,image,password,run_transport)
}
#[tauri::command]
pub async fn ftp_start(id:String,window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,FtpStore>)->Result<(),NativeError>{
    crate::library_window::validate_reader(window.label())?;valid_id(&id)?;if store.1.lock().map_err(|_|fail("FTP state unavailable."))?.contains(&id){return Err(fail("This image is being deleted."))}
    let job={let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;let dir=root(&app)?;let mut jobs=load(&dir)?;
        if crate::updates::is_installing(&app){return Err(NativeError::new("busy","Restart after the update before uploading."))}
        if jobs.iter().filter(|j|j.item.status=="uploading").count()>=4{return Err(fail("Four uploads are already running. Retry this pending entry shortly."))}
        let j=jobs.iter_mut().find(|j|j.item.id==id).ok_or_else(||fail("FTP item not found."))?;
        if !matches!(j.item.status.as_str(),"pending"|"failed"){return Err(fail("Only pending or failed uploads can start."))}
        j.item.status="uploading".into();j.item.updated_at=now();j.item.error=None;j.item.error_code=None;let job=j.clone();persist(&dir,&jobs)?;job};
    diagnostics::record(&app,LogArea::Ftp,LogEvent::Started,LogCode::None);
    let _=app.emit("fershot-ftp-updated",());
    tauri::async_runtime::spawn_blocking(move || {
        let result=root(&app).and_then(|dir|{let image=dir.join(format!("{}.png",job.item.id));
            if fs::symlink_metadata(&image).map_err(|_|fail("Retry image is missing."))?.file_type().is_symlink(){return Err(fail("Retry image must not be a symbolic link."))}
            let password=password_for(&app,&job.settings)?; transfer(&job,&image,&password)});
        let failure = result.as_ref().err().map(|e|e.code);
        diagnostics::record(&app,LogArea::Ftp,if result.is_ok(){LogEvent::Completed}else{LogEvent::Failed},match failure{None=>LogCode::None,Some("ftp_credentials")=>LogCode::FtpCredentials,Some("ftp_authentication")=>LogCode::FtpAuthentication,Some("ftp_connection")=>LogCode::FtpConnection,Some("ftp_timeout")=>LogCode::FtpTimeout,Some("ftp_tls")=>LogCode::FtpTls,_=>LogCode::FtpFailed});
        let saved=(|| -> Result<(),NativeError> {
            let store=app.state::<FtpStore>(); let _lock=store.0.lock().map_err(|_|fail("FTP state is unavailable."))?;
            let dir=root(&app)?;let mut jobs=load(&dir)?;
            let j=jobs.iter_mut().find(|j|j.item.id==job.item.id).ok_or_else(||fail("FTP queue item disappeared."))?;
            j.item.error_code=result.as_ref().err().map(|e|e.code.to_owned());
            j.item.status=if result.is_ok(){"success"}else{"failed"}.into();j.item.error=result.err().map(|e|e.message);j.item.updated_at=now();
            persist(&dir,&jobs)?;if jobs.iter().any(|j|j.item.id==job.item.id&&j.item.status=="success"){let _=finalize_success(&dir,&job.item.id);}Ok(())
        })();
        if saved.is_err() { let _=app.emit_to("main","fershot-ftp-error","Transfer ended but its result could not be saved. Do not assume success; check the server and restart to recover the queue."); }
        let _=app.emit("fershot-ftp-updated",());
    });Ok(())
}
#[tauri::command]
pub async fn ftp_remove(id:String,window:tauri::WebviewWindow,app:tauri::AppHandle,store:tauri::State<'_,FtpStore>)->Result<(),NativeError>{
    crate::library_window::validate_reader(window.label())?;valid_id(&id)?;let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;let dir=root(&app)?;let mut jobs=load(&dir)?;
    if jobs.iter().any(|j|j.item.id==id && j.item.status=="uploading"){return Err(fail("Wait for the active transfer before removing its history."))}
    jobs.retain(|j|j.item.id!=id);persist(&dir,&jobs)?;let _=fs::remove_file(dir.join(format!("{id}.png")));let _=fs::remove_file(dir.join(format!("{id}.thumb.png")));let _=app.emit("fershot-ftp-updated",());Ok(())
}
pub fn recover(app:&tauri::AppHandle)->Result<(),NativeError>{
    let store=app.state::<FtpStore>();let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;let dir=root(app)?;let mut jobs=load(&dir)?;let mut changed=false;
    for j in &mut jobs{if j.item.status=="success"{let _=finalize_success(&dir,&j.item.id);}if j.item.status=="uploading"{j.item.status="failed".into();j.item.error=Some("Transfer interrupted by app exit. Retry uses the original URL.".into());j.item.error_code=Some("ftp_interrupted".into());j.item.updated_at=now();changed=true;}}
    if changed{persist(&dir,&jobs)?;diagnostics::record(app,LogArea::Ftp,LogEvent::Recovered,LogCode::None);}Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]fn monthly_folders_freeze_the_allocated_destination() {
        use chrono::TimeZone;
        let mut profile=sample();profile.remote_dir="/s".into();profile.monthly_folders=true;
        let november=chrono::Utc.with_ymd_and_hms(2026,11,30,23,59,59).unwrap();
        let december=chrono::Utc.with_ymd_and_hms(2026,12,1,0,0,0).unwrap();
        let frozen=freeze_destination(profile.clone(),&november);
        assert_eq!(frozen.remote_dir,"/s/2611");assert!(!frozen.monthly_folders);
        assert_eq!(freeze_destination(frozen.clone(),&december).remote_dir,"/s/2611");
        assert_eq!(freeze_destination(profile.clone(),&december).remote_dir,"/s/2612");
        profile.monthly_folders=false;assert_eq!(freeze_destination(profile,&november).remote_dir,"/s");
        assert_eq!(target(&frozen,"capture.png").0,"/s/2611/capture.png");
    }
    #[test]fn old_profile_month_folder_is_split_without_rewriting_its_file() {
        let dir=tempfile::tempdir().unwrap();let mut profile=sample();profile.remote_dir="/s/2611".into();
        let mut value=serde_json::to_value(profile).unwrap();value.as_object_mut().unwrap().remove("monthlyFolders");
        let bytes=serde_json::to_vec(&value).unwrap();let file=dir.path().join("settings.json");fs::write(&file,&bytes).unwrap();
        let loaded=settings_load(dir.path()).unwrap().unwrap();assert_eq!(loaded.remote_dir,"/s");assert!(loaded.monthly_folders);assert_eq!(fs::read(file).unwrap(),bytes);
        let mut fixed=sample();fixed.remote_dir="/s/2613".into();migrate_profile_folder(&mut fixed);assert_eq!(fixed.remote_dir,"/s/2613");assert!(!fixed.monthly_folders);
    }
    fn sample()->Settings{Settings{host:"ftp.example.com".into(),port:21,username:"user".into(),remote_dir:"/images/a b".into(),monthly_folders:false,public_base_url:"https://cdn.example.com".into(),secure:true,naming_mode:NamingMode::Random,_retired_shared_flag:false}}
    #[test]fn library_reads_retained_success_pixels_without_network_and_rejects_symlinks(){
        let dir=tempfile::tempdir().unwrap();let settings=sample();let(remote_path,url)=target(&settings,"screenshot-123-1.png");let job=Job{settings,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"Edited.png".into(),remote_path,url,status:"success".into(),created_at:1,updated_at:1,error:None,error_code:None}};persist(dir.path(),&[job]).unwrap();
        let mut encoded=std::io::Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(2,2,image::Rgba([12,30,50,255]))).write_to(&mut encoded,image::ImageFormat::Png).unwrap();let png=encoded.into_inner();let path=dir.path().join("123-1.png");fs::write(&path,&png).unwrap();let(name,image)=library_image_at(dir.path(),"123-1").unwrap();assert_eq!(name,"Edited.png");assert_eq!((image.width,image.height),(2,2));assert!(library_image_at(dir.path(),"../123-1").is_err());
        #[cfg(unix)]{fs::remove_file(&path).unwrap();let original=dir.path().join("original.png");fs::write(&original,&png).unwrap();std::os::unix::fs::symlink(&original,&path).unwrap();assert!(library_image_at(dir.path(),"123-1").is_err());assert_eq!(fs::read(original).unwrap(),png);}
    }
    #[test]fn ftp_delete_wire_is_control_only_and_never_lists_or_uploads(){
        use std::{net::TcpListener,io::{BufRead,BufReader,Write},thread,time::Duration};let listener=TcpListener::bind("127.0.0.1:0").unwrap();let port=listener.local_addr().unwrap().port();
        let server=thread::spawn(move||{let(mut socket,_)=listener.accept().unwrap();socket.set_read_timeout(Some(Duration::from_secs(6))).unwrap();socket.write_all(b"220 Synthetic FTP\r\n").unwrap();let mut reader=BufReader::new(socket.try_clone().unwrap());let mut verbs=Vec::new();loop{let mut line=String::new();if reader.read_line(&mut line).unwrap()==0{break}let(verb,arg)=line.trim_end().split_once(' ').unwrap_or((line.trim_end(),""));verbs.push(verb.to_owned());let reply=match verb{"USER"=>"331 Password\r\n","PASS"=>"230 Logged in\r\n","PWD"=>"257 \"/\"\r\n","DELE"=>{assert_eq!(arg,"/images/a b/screenshot-123-1.png");"250 Deleted\r\n"},"QUIT"=>{socket.write_all(b"221 Bye\r\n").unwrap();break},_=>"200 OK\r\n"};socket.write_all(reply.as_bytes()).unwrap();}verbs});
        let mut settings=sample();settings.host="127.0.0.1".into();settings.port=port;settings.secure=false;let(remote_path,url)=target(&settings,"screenshot-123-1.png");let job=Job{settings,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"fixture.png".into(),remote_path,url,status:"success".into(),created_at:1,updated_at:1,error:None,error_code:None}};let mut child=delete_command(&job).stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().unwrap();child.stdin.take().unwrap().write_all(b"user = \"synthetic:password\"\n").unwrap();let status=child.wait().unwrap();let verbs=server.join().unwrap();assert!(status.success());assert!(verbs.contains(&"DELE".into()));assert!(!verbs.iter().any(|v|["STOR","RETR","LIST","PASV","EPSV"].contains(&v.as_str())));
    }
    #[test]fn successful_upload_keeps_only_thumbnail_and_delete_uses_frozen_path(){
        let dir=tempfile::tempdir().unwrap();let mut bytes=std::io::Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(300,200,image::Rgba([12,30,50,255]))).write_to(&mut bytes,image::ImageFormat::Png).unwrap();write_private(&dir.path().join("123-1.png"),&bytes.into_inner()).unwrap();finalize_success(dir.path(),"123-1").unwrap();assert!(!dir.path().join("123-1.png").exists());assert!(dir.path().join("123-1.thumb.png").exists());let raster=fershot_image_core::Raster::decode(&fs::read(dir.path().join("123-1.thumb.png")).unwrap()).unwrap();assert_eq!(raster.dimensions(),(128,85));
        let settings=sample();let(remote_path,url)=target(&settings,"screenshot-123-1.png");let job=Job{settings,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"image.png".into(),remote_path,url,status:"success".into(),created_at:1,updated_at:1,error:None,error_code:None}};let command=delete_command(&job);let args=command.get_args().map(|s|s.to_string_lossy().to_string()).collect::<Vec<_>>();assert!(args.windows(2).any(|a|a==["--quote","DELE /images/a b/screenshot-123-1.png"]));assert!(args.windows(2).any(|a|a==["--config","-"]));assert!(!args.iter().any(|a|a.contains("password")));
    }
    #[test]fn predicted_target_is_stable_and_encoded(){let s=sample();assert!(validate(&s).is_ok());assert_eq!(target(&s,"a.png"),("/images/a b/a.png".into(),"https://cdn.example.com/images/a%20b/a.png".into()));assert_eq!(target(&s,"a.png"),target(&s,"a.png"));}
    #[test]fn reject_injection_and_path_escape(){for host in ["user@host","host/path","host\npassword","--config"]{let mut s=sample();s.host=host.into();assert!(validate(&s).is_err());}for path in ["../x","/a/../b","/x\r\nDELE a"]{let mut s=sample();s.remote_dir=path.into();assert!(validate(&s).is_err());}assert!(valid_id("../secret").is_err());}
    #[test]fn queue_persistence_keeps_frozen_target_without_secrets(){let dir=tempfile::tempdir().unwrap();let s=sample();let (remote_path,url)=target(&s,"screenshot-123-1.png");let job=Job{settings:s,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"test.png".into(),remote_path,url,status:"pending".into(),created_at:1,updated_at:1,error:None,error_code:None}};persist(dir.path(),&[job]).unwrap();let jobs=load(dir.path()).unwrap();assert_eq!(jobs[0].item.url,"https://cdn.example.com/images/a%20b/screenshot-123-1.png");assert!(!fs::read_to_string(dir.path().join("queue.json")).unwrap().contains("password"));}
    #[test]fn malformed_queue_is_preserved(){let dir=tempfile::tempdir().unwrap();fs::write(dir.path().join("queue.json"),b"bad").unwrap();assert!(load(dir.path()).is_err());assert_eq!(fs::read(dir.path().join("queue.json")).unwrap(),b"bad");}
    #[test]fn transport_is_bounded_and_never_puts_password_in_arguments(){
        let settings=sample();let (remote_path,url)=target(&settings,"screenshot-123-1.png");
        let job=Job{settings,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"a.png".into(),remote_path,url,status:"pending".into(),created_at:1,updated_at:1,error:None,error_code:None}};
        let command=transport_command(&job,Path::new("/private/retry.png"),PassiveMode::Pasv);
        let args:Vec<_>=command.get_args().map(|a|a.to_string_lossy().into_owned()).collect();
        assert_eq!(args[0],"--disable");assert!(args.windows(2).any(|v|v==["--config","-"]));assert!(args.windows(2).any(|v|v==["--proto","=ftp"]));assert!(args.contains(&"--ssl-reqd".into()));assert!(args.contains(&"ftp://ftp.example.com:21/%2Fimages/a%20b/screenshot-123-1.png".into()));assert!(!args.iter().any(|a|a.contains("user:") || a.contains("password")));
        assert!(args.contains(&"--disable-epsv".into()));assert!(args.contains(&"--ftp-skip-pasv-ip".into()));
        assert!(transfer(&job,Path::new("/unused"),"bad\nurl = evil").is_err());
    }
    #[test]fn retired_sharing_flag_is_read_only_compatibility_and_never_serialized(){
        let mut value=serde_json::to_value(sample()).unwrap();value["sharedUploader"]=true.into();
        let loaded:Settings=serde_json::from_value(value).unwrap();
        assert!(serde_json::to_value(&loaded).unwrap().get("sharedUploader").is_none());
    }
    #[test]fn old_settings_and_random_jobs_remain_readable(){
        let dir=tempfile::tempdir().unwrap();let settings=sample();let (remote_path,url)=target(&settings,"screenshot-123-1.png");
        let job=Job{settings,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"old.png".into(),remote_path,url,status:"pending".into(),created_at:1,updated_at:1,error:None,error_code:None}};
        let mut value=serde_json::to_value(vec![job]).unwrap();
        value[0].as_object_mut().unwrap().remove("remoteName");
        value[0]["settings"].as_object_mut().unwrap().remove("namingMode");
        value[0]["item"].as_object_mut().unwrap().remove("errorCode");
        fs::write(dir.path().join("queue.json"),serde_json::to_vec(&value).unwrap()).unwrap();
        let jobs=load(dir.path()).unwrap();assert!(jobs[0].settings.naming_mode==NamingMode::Random);
        assert_eq!(frozen_remote_name(&jobs[0]).unwrap(),"screenshot-123-1.png");
        assert!(jobs[0].item.error_code.is_none());
    }
    #[test]fn timestamp_pattern_uses_local_date_components_and_rolls_after_ten_names(){
        use chrono::TimeZone;
        let date=chrono::FixedOffset::east_opt(7*3600).unwrap().with_ymd_and_hms(2026,11,9,12,34,56).unwrap();
        assert_eq!(timestamp_filename(&date,0),"091234560.png");
        let mut slot=None;
        for sequence in 0..10 {let next=next_timestamp_slot(slot,date.timestamp()).unwrap();assert_eq!(next.second,date.timestamp());assert_eq!(next.sequence,sequence);slot=Some(next);}
        let next=next_timestamp_slot(slot,date.timestamp()).unwrap();assert_eq!(next.second,date.timestamp()+1);assert_eq!(next.sequence,0);
        let rolled=chrono::DateTime::from_timestamp(next.second,0).unwrap().with_timezone(date.offset());assert_eq!(timestamp_filename(&rolled,next.sequence),"091234570.png");
    }
    #[test]fn timestamp_names_are_reserved_across_restart_clock_rollback_and_deleted_history(){
        let dir=tempfile::tempdir().unwrap();let second=1_793_162_096;
        let first=reserve_timestamp_name(dir.path(),&[],second).unwrap();
        let second_name=reserve_timestamp_name(dir.path(),&[],second).unwrap();
        assert_ne!(first,second_name);assert!(second_name.ends_with("1.png"));
        assert_ne!(reserve_timestamp_name(dir.path(),&[],second-3600).unwrap(),first);
        let mut settings=sample();settings.naming_mode=NamingMode::Timestamp;
        let (remote_path,url)=target(&settings,&first);
        let job=Job{settings,remote_name:Some(first.clone()),item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"image.png".into(),remote_path,url,status:"failed".into(),created_at:1,updated_at:1,error:None,error_code:None}};
        persist(dir.path(),&[job]).unwrap();
        let before=load(dir.path()).unwrap()[0].item.url.clone();
        let mut edited_settings=sample();edited_settings.naming_mode=NamingMode::Random;edited_settings.remote_dir="/new".into();
        fs::write(dir.path().join("settings.json"),serde_json::to_vec(&edited_settings).unwrap()).unwrap();
        let loaded=load(dir.path()).unwrap();assert_eq!(loaded[0].item.url,before);assert_eq!(frozen_remote_name(&loaded[0]).unwrap(),first);
        let mut forged=serde_json::to_value(&loaded).unwrap();forged[0]["remoteName"]="../escape.png".into();
        fs::write(dir.path().join("queue.json"),serde_json::to_vec(&forged).unwrap()).unwrap();assert!(load(dir.path()).is_err());
    }
    #[test]fn damaged_timestamp_state_is_preserved_instead_of_reusing_a_name(){
        let dir=tempfile::tempdir().unwrap();fs::write(dir.path().join("timestamp-names.json"),b"broken").unwrap();
        assert!(reserve_timestamp_name(dir.path(),&[],1_793_162_096).is_err());
        assert_eq!(fs::read(dir.path().join("timestamp-names.json")).unwrap(),b"broken");
    }
    #[test]fn config_credentials_are_quoted(){assert_eq!(quoted("u:p\\\"x"),"\"u:p\\\\\\\"x\"");}
    #[test]fn passive_negotiation_fallback_is_injected_and_keeps_frozen_target(){
        let settings=sample();let (remote_path,url)=target(&settings,"screenshot-123-1.png");
        let job=Job{settings,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"a.png".into(),remote_path,url,status:"pending".into(),created_at:1,updated_at:1,error:None,error_code:None}};
        let mut modes=Vec::new();
        transfer_with(&job,Path::new("/synthetic.png"),"synthetic-secret",|same,path,_,mode|{
            assert_eq!(same.item.url,job.item.url);assert_eq!(path,Path::new("/synthetic.png"));modes.push(mode);
            Ok(Some(if mode==PassiveMode::Pasv{13}else{0}))
        }).unwrap();
        assert_eq!(modes,vec![PassiveMode::Pasv,PassiveMode::Epsv]);
        let fallback=transport_command(&job,Path::new("/synthetic.png"),PassiveMode::Epsv);
        assert!(!fallback.get_args().any(|a|a=="--disable-epsv"));
        let mut attempts=0;
        let error=transfer_with(&job,Path::new("/synthetic.png"),"synthetic-secret",|_,_,_,_|{attempts+=1;Ok(Some(28))}).unwrap_err();
        assert_eq!(attempts,1);assert_eq!(error.code,"ftp_timeout");
        let mut auth_attempts=0;
        let error=transfer_with(&job,Path::new("/synthetic.png"),"synthetic-secret",|_,_,_,_|{auth_attempts+=1;Ok(Some(67))}).unwrap_err();
        assert_eq!(auth_attempts,1);assert_eq!(error.code,"ftp_authentication");
    }
    #[test]fn curl_pasv_wire_protocol_sends_exact_frozen_bytes_to_loopback_only(){
        use std::{io::{BufRead,BufReader,Read},net::TcpListener,thread,time::{Duration,Instant}};
        let control=TcpListener::bind("127.0.0.1:0").unwrap();
        let port=control.local_addr().unwrap().port();
        control.set_nonblocking(true).unwrap();
        let server=thread::spawn(move || {
            let deadline=Instant::now()+Duration::from_secs(8);
            let mut socket=loop {match control.accept(){Ok((s,_))=>break s,Err(e) if e.kind()==std::io::ErrorKind::WouldBlock && Instant::now()<deadline=>thread::sleep(Duration::from_millis(5)),Err(e)=>panic!("Loopback control failed: {e}")}};
            socket.set_nonblocking(false).unwrap();socket.set_read_timeout(Some(Duration::from_secs(4))).unwrap();
            socket.write_all(b"220 Synthetic FTP ready\r\n").unwrap();
            let mut reader=BufReader::new(socket.try_clone().unwrap());
            let mut data:Option<TcpListener>=None;let mut verbs=Vec::new();let mut uploaded=Vec::new();let mut paths=Vec::new();
            loop {
                let mut line=String::new();if reader.read_line(&mut line).unwrap()==0{break;}
                let (verb,arg)=line.trim_end().split_once(' ').unwrap_or((line.trim_end(),""));verbs.push(verb.to_owned());
                let reply=match verb {
                    "USER"=>"331 Password required\r\n".into(),"PASS"=>"230 Logged in\r\n".into(),
                    "PWD"=>"257 \"/\" is current directory\r\n".into(),"TYPE"=>"200 Type set\r\n".into(),
                    "CWD"=>{paths.push(arg.to_owned());"250 Directory changed\r\n".into()},
                    "EPSV"=>"500 EPSV unsupported in synthetic fixture\r\n".into(),
                    "PASV"=>{
                        let listener=TcpListener::bind("127.0.0.1:0").unwrap();let p=listener.local_addr().unwrap().port();listener.set_nonblocking(true).unwrap();data=Some(listener);
                        format!("227 Entering Passive Mode (127,0,0,2,{},{})\r\n",p/256,p%256)
                    },
                    "STOR"=>{
                        assert_eq!(arg,"screenshot-123-1.png");socket.write_all(b"150 Opening synthetic data stream\r\n").unwrap();
                        let listener=data.take().unwrap();let deadline=Instant::now()+Duration::from_secs(4);
                        let mut stream=loop{match listener.accept(){Ok((s,_))=>break s,Err(e) if e.kind()==std::io::ErrorKind::WouldBlock && Instant::now()<deadline=>thread::sleep(Duration::from_millis(5)),Err(e)=>panic!("Loopback data failed: {e}")}};
                        stream.set_nonblocking(false).unwrap();stream.set_read_timeout(Some(Duration::from_secs(4))).unwrap();stream.read_to_end(&mut uploaded).unwrap();"226 Synthetic transfer complete\r\n".into()
                    },
                    "QUIT"=>{socket.write_all(b"221 Goodbye\r\n").unwrap();break;},
                    _=>"200 Synthetic command accepted\r\n".into(),
                };
                socket.write_all(reply.as_bytes()).unwrap();
            }
            (verbs,paths,uploaded)
        });
        let mut settings=sample();settings.host="127.0.0.1".into();settings.port=port;settings.secure=false;
        let (remote_path,url)=target(&settings,"screenshot-123-1.png");
        let job=Job{settings,remote_name:None,item:QueueItem{id:"123-1".into(),source_id:"source".into(),name:"fixture.png".into(),remote_path,url,status:"pending".into(),created_at:1,updated_at:1,error:None,error_code:None}};
        let dir=tempfile::tempdir().unwrap();let image=dir.path().join("synthetic.png");let expected=b"synthetic frozen PNG bytes";fs::write(&image,expected).unwrap();
        let result=transfer(&job,&image,"synthetic-password");let (verbs,paths,uploaded)=server.join().unwrap();
        result.unwrap();assert!(verbs.contains(&"PASV".into()));assert!(!verbs.contains(&"EPSV".into()));assert!(paths.first().is_some_and(|path|path.starts_with('/')));let resolved=paths.iter().map(|path|path.trim_matches('/')).filter(|path|!path.is_empty()).collect::<Vec<_>>().join("/");assert_eq!(resolved,"images/a b");assert_eq!(uploaded,expected);
    }
}

pub fn library_image(app:&tauri::AppHandle,id:&str)->Result<(String,crate::imaging::ImagePayload),NativeError>{valid_id(id)?;let job={let store=app.state::<FtpStore>();let _lock=store.0.lock().map_err(|_|fail("FTP store unavailable."))?;load(&root(app)?)?.into_iter().find(|j|j.item.id==id).ok_or_else(||fail("Upload history is unavailable."))?};let bytes=https_preview(app,&job)?;let raster=fershot_image_core::Raster::decode(&bytes).map_err(|_|fail("The HTTPS image is invalid or exceeds image limits."))?;Ok((job.item.name,crate::imaging::payload(raster)?))}
#[cfg(test)]fn library_image_at(dir:&Path,id:&str)->Result<(String,crate::imaging::ImagePayload),NativeError>{
 valid_id(id)?;let job=load(dir)?.into_iter().find(|j|j.item.id==id).ok_or_else(||fail("Upload history is unavailable."))?;let path=dir.join(format!("{id}.png"));let meta=fs::symlink_metadata(&path).map_err(|_|fail("Upload preview is unavailable."))?;if !meta.is_file()||meta.file_type().is_symlink()||meta.len()>32*1024*1024{return Err(fail("Upload preview is invalid."))}let bytes=fs::read(path).map_err(|_|fail("Upload preview is unavailable."))?;let raster=fershot_image_core::Raster::decode(&bytes).map_err(|_|fail("Upload preview is invalid."))?;Ok((job.item.name,crate::imaging::payload(raster)?))
}

fn ensure_thumbnail(dir:&Path,id:&str)->Result<(),NativeError>{
 valid_id(id)?;let thumb=dir.join(format!("{id}.thumb.png"));if thumb.exists(){let meta=fs::symlink_metadata(&thumb).map_err(|_|fail("Thumbnail unavailable."))?;if !meta.is_file()||meta.file_type().is_symlink()||meta.len()>128*1024{return Err(fail("Thumbnail is invalid."))}let bytes=fs::read(&thumb).map_err(|_|fail("Thumbnail unavailable."))?;let raster=fershot_image_core::Raster::decode(&bytes).map_err(|_|fail("Thumbnail is invalid."))?;let(w,h)=raster.dimensions();if w>128||h>96{return Err(fail("Thumbnail dimensions are invalid."))}return Ok(())}
 let path=dir.join(format!("{id}.png"));let meta=fs::symlink_metadata(&path).map_err(|_|fail("Retry pixels unavailable."))?;if !meta.is_file()||meta.file_type().is_symlink()||meta.len()>32*1024*1024{return Err(fail("Retry pixels invalid."))}let bytes=fs::read(path).map_err(|_|fail("Retry pixels unavailable."))?;let image=fershot_image_core::Raster::decode(&bytes).map_err(|_|fail("Retry image invalid."))?.resize(128,96).map_err(|_|fail("Thumbnail could not be resized."))?;write_private(&thumb,&image.encode(ExportFormat::Png).map_err(|_|fail("Thumbnail could not be encoded."))?)
}
fn finalize_success(dir:&Path,id:&str)->Result<(),NativeError>{ensure_thumbnail(dir,id)?;let _=fs::remove_file(dir.join(format!("{id}.png")));Ok(())}
pub fn thumbnail(app:&tauri::AppHandle,id:&str)->Result<crate::imaging::ImagePayload,NativeError>{valid_id(id)?;let store=app.state::<FtpStore>();let _lock=store.0.lock().map_err(|_|fail("FTP state unavailable."))?;let dir=root(app)?;if !load(&dir)?.iter().any(|j|j.item.id==id){return Err(fail("Upload history is unavailable."))}ensure_thumbnail(&dir,id)?;let path=dir.join(format!("{id}.thumb.png"));let bytes=fs::read(path).map_err(|_|fail("Thumbnail unavailable."))?;let raster=fershot_image_core::Raster::decode(&bytes).map_err(|_|fail("Thumbnail is invalid."))?;let(w,h)=raster.dimensions();if w>128||h>96{return Err(fail("Thumbnail dimensions are invalid."))}crate::imaging::payload(raster)}
type PreviewCache=Vec<(String,std::time::Instant,Vec<u8>)>;
static PREVIEWS:std::sync::OnceLock<Mutex<PreviewCache>>=std::sync::OnceLock::new();
fn https_preview(app:&tauri::AppHandle,job:&Job)->Result<Vec<u8>,NativeError>{
 let cache=PREVIEWS.get_or_init(||Mutex::new(Vec::new()));if let Ok(entries)=cache.lock(){if let Some((_,_,bytes))=entries.iter().find(|(id,time,_)|id==&job.item.id&&time.elapsed().as_secs()<60){return Ok(bytes.clone())}}
 let url=tauri::Url::parse(&job.item.url).map_err(|_|fail("Image URL is invalid."))?;if url.scheme()!="https"||!url.username().is_empty()||url.password().is_some(){return Err(fail("Full image preview requires an HTTPS public URL."))}
 let auth=preview_settings(app)?;let origin=url.origin().ascii_serialization();let mut command=Command::new("/usr/bin/curl");command.args(["--disable","--config","-","--silent","--fail","--globoff","--proto","=https","--connect-timeout","10","--max-time","30","--max-filesize","33554432","--write-out","%{http_code}","--url"]).arg(job.item.url.as_str());
 let config=if auth.enabled&&auth.origin==origin{let secret=crate::ftp_credentials::get(app,&preview_account(&auth)).map_err(|_|fail("HTTPS preview password is unavailable. Save it in Settings → Uploading."))?;if secret.is_empty()||secret.chars().any(char::is_control){return Err(fail("Save the HTTPS preview password in Settings → Uploading."))}format!("user = {}\nbasic\n",quoted(&format!("{}:{}",auth.username,secret)))}else{command.args(["--location","--max-redirs","3","--proto-redir","=https"]);String::new()};
 let mut child=command.stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).spawn().map_err(|_|fail("HTTPS preview transport unavailable."))?;if child.stdin.take().ok_or_else(||fail("HTTPS preview input unavailable."))?.write_all(config.as_bytes()).is_err(){let _=child.kill();let _=child.wait();return Err(fail("HTTPS preview setup failed."))}
 use std::io::Read;let mut bytes=Vec::new();let result=child.stdout.take().ok_or_else(||fail("HTTPS image unavailable."))?.take(32*1024*1024+4).read_to_end(&mut bytes);if result.is_err()||bytes.len()>32*1024*1024+3{let _=child.kill();let _=child.wait();return Err(fail("HTTPS preview exceeds the image limit."))}let status=child.wait().map_err(|_|fail("HTTPS preview stopped."))?;let code=if bytes.len()>=3{let tail=bytes.split_off(bytes.len()-3);String::from_utf8(tail).unwrap_or_default()}else{String::new()};if code=="401"||code=="403"{return Err(fail("HTTPS preview authentication was rejected. Check HTTP username/password in Settings → Uploading, then retry preview."))}if !status.success()||!code.starts_with('2'){return Err(fail("HTTPS preview could not be loaded. Check the upload status, HTTPS URL and server connection, then retry."))}
 fershot_image_core::Raster::decode(&bytes).map_err(|_|fail("The HTTPS image is not a supported image."))?;
 if bytes.len()<=8*1024*1024{if let Ok(mut entries)=cache.lock(){entries.retain(|(id,time,_)|id!=&job.item.id&&time.elapsed().as_secs()<60);while entries.len()>=2{entries.remove(0);}entries.push((job.item.id.clone(),std::time::Instant::now(),bytes.clone()));}}Ok(bytes)
}
fn delete_command(job:&Job)->Command{let mut command=Command::new("/usr/bin/curl");command.args(["--disable","--config","-","--silent","--fail","--globoff","--proto","=ftp","--noproxy","*","--connect-timeout","15","--max-time","30","--head","--ftp-pasv","--ftp-skip-pasv-ip","--disable-epsv","--quote"]).arg(format!("DELE {}",job.item.remote_path)).arg("--url").arg(format!("ftp://{}:{}/",job.settings.host,job.settings.port)).arg("--output").arg("/dev/null");if job.settings.secure{command.arg("--ssl-reqd");}command}
#[tauri::command]pub async fn ftp_delete_remote(id:String,confirmed:bool,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{
 crate::library_window::require_library(window.label())?;valid_id(&id)?;if !confirmed{return Err(fail("Confirm permanent deletion from FTP first."))}
 tauri::async_runtime::spawn_blocking(move||{
  let job={let store=app.state::<FtpStore>();let _lock=store.0.lock().map_err(|_|fail("FTP state unavailable."))?;if crate::updates::is_installing(&app){return Err(NativeError::new("busy","Restart after the update before deleting images."))}let jobs=load(&root(&app)?)?;let job=jobs.into_iter().find(|j|j.item.id==id).ok_or_else(||fail("Upload history not found."))?;if job.item.status=="uploading"{return Err(fail("Wait for this upload to finish before deleting it."))}let mut deleting=store.1.lock().map_err(|_|fail("FTP state unavailable."))?;if !deleting.insert(id.clone()){return Err(fail("This image is already being deleted."))}job};
  let result=(||{let password=password_for(&app,&job.settings)?;if password.is_empty()||password.chars().any(char::is_control){return Err(fail("FTP credentials are invalid."))}let mut child=delete_command(&job).stdin(Stdio::piped()).stdout(Stdio::null()).stderr(Stdio::null()).spawn().map_err(|_|fail("FTP delete transport unavailable."))?;let sent=child.stdin.take().ok_or_else(||fail("FTP delete input unavailable."))?.write_all(format!("user = {}\n",quoted(&format!("{}:{}",job.settings.username,password))).as_bytes());if sent.is_err(){let _=child.kill();let _=child.wait();return Err(fail("FTP delete setup failed."))}if !child.wait().map_err(|_|fail("FTP delete stopped."))?.success(){return Err(fail("FTP deletion could not be confirmed. Check the server before retrying."))}
   let store=app.state::<FtpStore>();let _lock=store.0.lock().map_err(|_|fail("FTP state unavailable."))?;let dir=root(&app)?;let mut jobs=load(&dir)?;jobs.retain(|j|j.item.id!=id);persist(&dir,&jobs).map_err(|_|fail("Remote image deleted, but local history could not be updated. Remove its history after refreshing."))?;let _=fs::remove_file(dir.join(format!("{id}.png")));let _=fs::remove_file(dir.join(format!("{id}.thumb.png")));if let Some(cache)=PREVIEWS.get(){if let Ok(mut rows)=cache.lock(){rows.retain(|(key,_,_)|key!=&id)}}Ok(())})();
  if let Ok(mut state)=app.state::<FtpStore>().1.lock(){state.remove(&id);}if result.is_err(){diagnostics::record(&app,LogArea::Ftp,LogEvent::Failed,LogCode::FtpFailed);}let _=app.emit("fershot-ftp-updated",());result
 }).await.map_err(|_|fail("FTP deletion stopped unexpectedly."))?
}

#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct PreviewAuth{origin:String,username:String,enabled:bool}
fn preview_account(auth:&PreviewAuth)->String{format!("https-preview:{}:{}",auth.origin,auth.username)}
fn validate_preview(auth:&PreviewAuth)->Result<(),NativeError>{let url=tauri::Url::parse(&auth.origin).map_err(|_|fail("Enter a valid HTTPS origin."))?;if url.scheme()!="https"||url.origin().ascii_serialization()!=auth.origin||!url.username().is_empty()||url.password().is_some()||auth.username.len()>256||auth.username.chars().any(|c|c.is_control()||c==':')||auth.enabled&&auth.username.is_empty(){return Err(fail("Enter an HTTPS origin and valid HTTP username."))}Ok(())}
fn persist_preview(app:&tauri::AppHandle,auth:&PreviewAuth)->Result<(),NativeError>{let dir=root(app)?;let tmp=dir.join(format!("preview-auth-{}.tmp",fresh_id()));write_private(&tmp,&serde_json::to_vec(auth).map_err(|_|fail("Cannot encode HTTP settings."))?)?;fs::rename(tmp,dir.join("preview-auth.json")).map_err(|_|fail("Cannot save HTTP settings."))}
fn preview_settings(app:&tauri::AppHandle)->Result<PreviewAuth,NativeError>{
 let dir=root(app)?;let path=dir.join("preview-auth.json");if path.exists(){let meta=fs::symlink_metadata(&path).map_err(|_|fail("HTTP settings unavailable."))?;if !meta.is_file()||meta.file_type().is_symlink()||meta.len()>8192{return Err(fail("HTTP settings invalid."))}let auth:PreviewAuth=serde_json::from_slice(&fs::read(path).map_err(|_|fail("HTTP settings unavailable."))?).map_err(|_|fail("HTTP settings damaged; original preserved."))?;validate_preview(&auth)?;return Ok(auth)}
 let settings=settings_load(&dir)?;let origin=settings.as_ref().and_then(|s|tauri::Url::parse(&s.public_base_url).ok()).map(|u|u.origin().ascii_serialization()).unwrap_or_else(||"https://example.invalid".into());let auth=PreviewAuth{origin,username:String::new(),enabled:false};
 // Do not read legacy Keychain entries: the user explicitly retired Keychain.
 validate_preview(&auth)?;persist_preview(app,&auth)?;Ok(auth)
}
#[tauri::command]pub async fn ftp_read_preview_auth(window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<PreviewAuth,NativeError>{crate::preferences_window::validate_label(window.label())?;tauri::async_runtime::spawn_blocking(move||preview_settings(&app)).await.map_err(|_|fail("HTTP settings worker stopped."))?}
#[tauri::command]pub async fn ftp_save_preview_auth(settings:PreviewAuth,password:Option<String>,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<PreviewAuth,NativeError>{crate::preferences_window::validate_label(window.label())?;validate_preview(&settings)?;tauri::async_runtime::spawn_blocking(move||{if let Some(secret)=password{if secret.is_empty()||secret.len()>4096||secret.chars().any(char::is_control){return Err(fail("Enter a valid HTTP password."))}crate::ftp_credentials::set(&app,&preview_account(&settings),&secret)?;}if settings.enabled{crate::ftp_credentials::get(&app,&preview_account(&settings)).map_err(|_|fail("Save an HTTP password for this HTTPS origin and username."))?;}persist_preview(&app,&settings)?;if let Some(cache)=PREVIEWS.get(){if let Ok(mut entries)=cache.lock(){entries.clear();}}Ok(settings)}).await.map_err(|_|fail("HTTP settings worker stopped."))?}

#[tauri::command]pub async fn ftp_open_in_browser(id:String,window:tauri::WebviewWindow,app:tauri::AppHandle)->Result<(),NativeError>{crate::library_window::require_library(window.label())?;valid_id(&id)?;tauri::async_runtime::spawn_blocking(move||{let url={let state=app.state::<FtpStore>();let _guard=state.0.lock().map_err(|_|fail("FTP history unavailable."))?;load(&root(&app)?)?.into_iter().find(|job|job.item.id==id).ok_or_else(||fail("FTP history item not found."))?.item.url};let parsed=tauri::Url::parse(&url).map_err(|_|fail("Invalid image URL."))?;if parsed.scheme()!="https"||!parsed.username().is_empty()||parsed.password().is_some(){return Err(fail("Only credential-free HTTPS image links can open in the browser."))}let result=Command::new("/usr/bin/open").arg("--").arg(url).status().map_err(|_|fail("The browser could not be opened."))?;if result.success(){Ok(())}else{Err(fail("The browser could not be opened."))}}).await.map_err(|_|fail("Opening browser stopped."))?}

/// Hold the FTP lock while checking so installing cannot race a new transfer.
pub fn ensure_update_idle(app:&tauri::AppHandle)->Result<(),NativeError>{let store=app.state::<FtpStore>();let _lock=store.0.lock().map_err(|_|fail("FTP state unavailable."))?;if !store.1.lock().map_err(|_|fail("FTP state unavailable."))?.is_empty()||load(&root(app)?)?.iter().any(|j|j.item.status=="uploading"){return Err(NativeError::new("busy","Wait for FTP transfers or deletion to finish before updating."))}Ok(())}
