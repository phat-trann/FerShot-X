use super::model::*;
use crate::imaging::NativeError;
use std::{fs,path::{Path,PathBuf},io::Write};
use tauri::Manager;
fn fail()->NativeError{NativeError::new("recording_storage","The local recording could not be read or saved.")}
pub fn root(app:&tauri::AppHandle)->Result<PathBuf,NativeError>{let p=app.path().app_cache_dir().map_err(|_|fail())?.join("recordings-v1");if fs::symlink_metadata(&p).is_ok_and(|m|m.file_type().is_symlink()){return Err(fail())}fs::create_dir_all(&p).map_err(|_|fail())?;#[cfg(unix)]{use std::os::unix::fs::PermissionsExt;fs::set_permissions(&p,fs::Permissions::from_mode(0o700)).map_err(|_|fail())?;}Ok(p)}
pub fn folder(app:&tauri::AppHandle,id:&str)->Result<PathBuf,NativeError>{if !valid_id(id){return Err(invalid())}let root=root(app)?;let p=root.join(id);if p.exists(){let m=fs::symlink_metadata(&p).map_err(|_|fail())?;if !m.is_dir()||m.file_type().is_symlink(){return Err(fail())}}Ok(p)}
pub fn write(path:&Path,bytes:&[u8])->Result<(),NativeError>{
 let parent=path.parent().ok_or_else(fail)?;let mut file=tempfile::NamedTempFile::new_in(parent).map_err(|_|fail())?;
 file.write_all(bytes).map_err(|_|fail())?;file.as_file().sync_all().map_err(|_|fail())?;file.persist(path).map_err(|_|fail())?;Ok(())
}
pub fn save(app:&tauri::AppHandle,doc:&VideoDocument)->Result<(),NativeError>{doc.draft.validate(doc.clip.duration_ms)?;if doc.pointer.len()>MAX_SAMPLES{return Err(invalid())}let path=folder(app,&doc.clip.id)?;fs::create_dir_all(&path).map_err(|_|fail())?;if !doc.pointer.is_empty()&&!path.join("pointer.json").exists(){let bytes=serde_json::to_vec(&doc.pointer).map_err(|_|fail())?;if bytes.len()>8*1024*1024{return Err(invalid())}write(&path.join("pointer.json"),&bytes)?;}let snapshot=VideoDocument{clip:doc.clip.clone(),draft:doc.draft.clone(),pointer:vec![]};let bytes=serde_json::to_vec(&snapshot).map_err(|_|fail())?;write(&path.join("document.json"),&bytes)}
pub fn read_light(app:&tauri::AppHandle,id:&str)->Result<VideoDocument,NativeError>{
 let p=folder(app,id)?;let m=fs::symlink_metadata(p.join("document.json")).map_err(|_|fail())?;if !m.is_file()||m.file_type().is_symlink()||m.len()>8*1024*1024{return Err(fail())}
 let mut doc:VideoDocument=serde_json::from_slice(&fs::read(p.join("document.json")).map_err(|_|fail())?).map_err(|_|fail())?;
 if doc.clip.id!=id||doc.clip.width==0||doc.clip.height==0||doc.clip.width>4096||doc.clip.height>4096||doc.pointer.len()>MAX_SAMPLES{return Err(invalid())}doc.draft.validate(doc.clip.duration_ms)?;
 let video=p.join("original.mp4");let m=fs::symlink_metadata(&video).map_err(|_|fail())?;if !m.is_file()||m.file_type().is_symlink()||m.len()>MAX_VIDEO_BYTES||m.len()<16{return Err(fail())}
 doc.clip.media_path=video.to_string_lossy().into_owned();doc.clip.byte_size=m.len();Ok(doc)
}
pub fn remove(app:&tauri::AppHandle,id:&str)->Result<(),NativeError>{let p=folder(app,id)?;if p.exists(){fs::remove_dir_all(p).map_err(|_|fail())?;}Ok(())}
#[derive(serde::Serialize)]pub struct LibraryClip{#[serde(flatten)]pub clip:Clip,pub revision:String}
fn revision(doc:&VideoDocument)->String{let mut hash=14695981039346656037u64;for byte in serde_json::to_vec(&doc.draft).unwrap_or_default(){hash^=u64::from(byte);hash=hash.wrapping_mul(1099511628211);}format!("{hash:016x}")}
/// Listing never mutates media. Cleanup is serialized by the recording owner.
pub fn list(app:&tauri::AppHandle)->Result<Vec<LibraryClip>,NativeError>{
 let root=root(app)?;let mut docs=Vec::new();for entry in fs::read_dir(root).map_err(|_|fail())?.flatten(){if !entry.file_type().is_ok_and(|kind|kind.is_dir()&&!kind.is_symlink()){continue}let Some(id)=entry.file_name().to_str().map(str::to_owned)else{continue};if let Ok(doc)=read_light(app,&id){docs.push(LibraryClip{revision:revision(&doc),clip:doc.clip});}}
 docs.sort_by(|a,b|b.clip.created_at.cmp(&a.clip.created_at));Ok(docs)
}
fn expired(clip:&Clip,time:u64,retained:usize,used:u64)->bool{time.saturating_sub(clip.created_at)>30*86400000||retained>=200||used.saturating_add(clip.byte_size)>5*1024*1024*1024}
pub fn prune(app:&tauri::AppHandle,pinned:&std::collections::HashSet<String>)->Result<usize,NativeError>{
 let mut removed=0;let mut used=0u64;let mut retained=0;let time=now();for row in list(app)?{let clip=row.clip;if !pinned.contains(&clip.id)&&expired(&clip,time,retained,used){remove(app,&clip.id)?;removed+=1;}else{used=used.saturating_add(clip.byte_size);retained+=1;}}Ok(removed)
}
pub fn now()->u64{std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis()as u64}

pub fn read(app:&tauri::AppHandle,id:&str)->Result<VideoDocument,NativeError>{let mut doc=read_light(app,id)?;let path=folder(app,id)?.join("pointer.json");if path.exists(){let m=fs::symlink_metadata(&path).map_err(|_|fail())?;if !m.is_file()||m.file_type().is_symlink()||m.len()>8*1024*1024{return Err(fail())}doc.pointer=serde_json::from_slice(&fs::read(path).map_err(|_|fail())?).map_err(|_|fail())?;}if doc.pointer.len()>MAX_SAMPLES{return Err(invalid())}let mut previous=0;for sample in &doc.pointer{if sample.time_ms<previous||sample.time_ms>doc.clip.duration_ms||![sample.x,sample.y].iter().all(|v|v.is_finite()&&(0.0..=1.0).contains(v)){return Err(invalid())}previous=sample.time_ms;}Ok(doc)}

/// Recover only finalized, inactive originals whose initial metadata was never
/// committed. Called on a background worker under NativeJobs + documents locks.
#[cfg(target_os="macos")]
pub fn recover(app:&tauri::AppHandle)->Result<usize,NativeError>{
 let mut restored=0;let root=root(app)?;
 for entry in fs::read_dir(root).map_err(|_|fail())?.take(200).flatten(){
  if !entry.file_type().is_ok_and(|t|t.is_dir()&&!t.is_symlink()){continue}
  let Some(id)=entry.file_name().to_str().map(str::to_owned)else{continue};
  if !id.starts_with("video-")||!valid_id(&id)||entry.path().join("document.json").exists(){continue}
  let video=entry.path().join("original.mp4");let Ok(metadata)=fs::symlink_metadata(&video)else{continue};
  if !metadata.modified().is_ok_and(|time|time.elapsed().is_ok_and(|age|age.as_secs()>=5))||!super::finalized::complete(&video){continue}
  let Ok((width,height,duration))=super::render::describe(&video)else{continue};
  let created_at=metadata.modified().ok().and_then(|time|time.duration_since(std::time::UNIX_EPOCH).ok()).map(|time|time.as_millis()as u64).unwrap_or_else(now);
  let clip=Clip{id:id.clone(),name:"Recovered recording.mp4".into(),width,height,duration_ms:duration,byte_size:metadata.len(),created_at,media_path:video.to_string_lossy().into_owned(),poster:String::new(),has_audio:super::render::has_audio(&video).ok()};
  let mut draft=VideoDraft::new(duration);draft.cursor_visible=false;draft.click_highlight=false;
  save(app,&VideoDocument{clip,draft,pointer:vec![]})?;restored+=1;if restored>=4{break}
 }
 Ok(restored)
}

#[cfg(test)]mod collection_tests{use super::*;
 #[test]fn poster_generation_does_not_change_the_edit_revision(){let clip=Clip{id:"video-1".into(),name:"Test".into(),width:100,height:100,duration_ms:1000,byte_size:100,created_at:1,media_path:String::new(),poster:String::new(),has_audio:Some(false)};let mut doc=VideoDocument{clip,draft:VideoDraft::new(1000),pointer:vec![]};let first=revision(&doc);doc.clip.poster="new poster".into();assert_eq!(revision(&doc),first);doc.draft.muted=true;assert_ne!(revision(&doc),first);}
}
