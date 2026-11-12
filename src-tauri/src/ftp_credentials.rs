//! Native-only, user-authorized plaintext storage; never returned by an IPC command.
use crate::{application_preferences::{self,Document},imaging::NativeError};
use std::{collections::BTreeMap,path::Path,sync::Mutex};
use serde::{Serialize,Deserialize};
use tauri::Manager;
static GATE:Mutex<()>=Mutex::new(());
#[derive(Serialize,Deserialize)]#[serde(deny_unknown_fields)]struct Saved{version:u8,entries:BTreeMap<String,String>}
fn fail()->NativeError{NativeError::new("ftp_credentials","Save your FTP/HTTP password again in Settings → Uploading. Passwords are now stored locally, without Keychain.")}
fn valid(account:&str,password:&str)->bool{!account.is_empty()&&account.len()<=4096&&!password.is_empty()&&password.len()<=4096&&!password.chars().any(char::is_control)}
fn load(dir:&Path)->Result<Saved,NativeError>{let raw=application_preferences::read_document(dir,Document::Credentials).map_err(|_|fail())?;let Some(raw)=raw else{return Ok(Saved{version:1,entries:BTreeMap::new()})};let saved:Saved=serde_json::from_slice(&raw).map_err(|_|fail())?;if saved.version!=1||saved.entries.len()>32||saved.entries.iter().any(|(a,p)|!valid(a,p)){return Err(fail())}Ok(saved)}
fn get_at(dir:&Path,account:&str)->Result<String,NativeError>{let _guard=GATE.lock().map_err(|_|fail())?;let saved=load(dir)?;saved.entries.get(account).cloned().ok_or_else(fail)}
fn set_at(dir:&Path,account:&str,password:&str)->Result<(),NativeError>{if !valid(account,password){return Err(fail())}let _guard=GATE.lock().map_err(|_|fail())?;let mut saved=load(dir)?;saved.entries.insert(account.into(),password.into());if saved.entries.len()>32{return Err(fail())}let bytes=serde_json::to_vec(&saved).map_err(|_|fail())?;application_preferences::write_document(dir,Document::Credentials,&bytes).map_err(|_|fail())}
pub fn get(app:&tauri::AppHandle,account:&str)->Result<String,NativeError>{get_at(&app.path().app_config_dir().map_err(|_|fail())?,account)}
pub fn set(app:&tauri::AppHandle,account:&str,password:&str)->Result<(),NativeError>{set_at(&app.path().app_config_dir().map_err(|_|fail())?,account,password)}
#[cfg(test)]mod tests{use super::*;
 #[test]fn private_passwords_survive_restart_and_profiles_remain_separate(){let d=tempfile::tempdir().unwrap();set_at(d.path(),"ftp:one","synthetic-ftp").unwrap();set_at(d.path(),"http:one","synthetic-http").unwrap();assert_eq!(get_at(d.path(),"ftp:one").unwrap(),"synthetic-ftp");assert_eq!(get_at(d.path(),"http:one").unwrap(),"synthetic-http");assert!(get_at(d.path(),"missing").is_err());assert!(set_at(d.path(),"ftp:one","").is_err());assert_eq!(get_at(d.path(),"ftp:one").unwrap(),"synthetic-ftp");#[cfg(unix)]{use std::os::unix::fs::PermissionsExt;assert_eq!(std::fs::metadata(d.path().join("fershot-credentials.json")).unwrap().permissions().mode()&0o777,0o600);}}
 #[test]fn corrupt_or_linked_storage_is_preserved(){let d=tempfile::tempdir().unwrap();let p=d.path().join("fershot-credentials.json");std::fs::write(&p,b"broken").unwrap();assert!(set_at(d.path(),"ftp","synthetic").is_err());assert_eq!(std::fs::read(&p).unwrap(),b"broken");#[cfg(unix)]{std::fs::remove_file(&p).unwrap();let outside=d.path().join("outside");std::fs::write(&outside,b"preserved").unwrap();std::os::unix::fs::symlink(&outside,&p).unwrap();assert!(set_at(d.path(),"ftp","synthetic").is_err());assert_eq!(std::fs::read(outside).unwrap(),b"preserved");}}
}
