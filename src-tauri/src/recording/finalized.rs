//! Cheap container preflight before opening abandoned recordings. This does not
//! decode pixels, trust extensions, or accept a partially written MP4.
use std::{io::{Read, Seek, SeekFrom}, path::Path};
pub fn complete(path:&Path)->bool{
 fn inspect(path:&Path)->Option<()>{
  let metadata=std::fs::symlink_metadata(path).ok()?;
  if !metadata.is_file()||metadata.file_type().is_symlink()||!(24..=super::model::MAX_VIDEO_BYTES).contains(&metadata.len()){return None}
  let mut file=std::fs::File::open(path).ok()?;let length=metadata.len();let(mut offset,mut atoms)=(0u64,0);
  let(mut ftyp,mut moov,mut mdat)=(false,false,false);
  while offset<length{
   atoms+=1;if atoms>4096||length-offset<8{return None}
   file.seek(SeekFrom::Start(offset)).ok()?;let mut header=[0;8];file.read_exact(&mut header).ok()?;
   let raw=u32::from_be_bytes(header[..4].try_into().ok()?);let mut size=raw as u64;let mut head=8;
   if raw==1{let mut extended=[0;8];file.read_exact(&mut extended).ok()?;size=u64::from_be_bytes(extended);head=16;}
   if raw==0{size=length-offset;}
   if size<head||size>length-offset{return None}
   match &header[4..]{b"ftyp"=>{if offset!=0||size<16{return None}ftyp=true;},b"moov"=>{if size<=head||size>64*1024*1024{return None}moov=true;},b"mdat"=>{if size<=head{return None}mdat=true;},_=>{}}
   offset=offset.checked_add(size)?;
  }
  (ftyp&&moov&&mdat).then_some(())
 }
 inspect(path).is_some()
}
#[cfg(test)]mod tests{use super::*;use std::io::Write;
 fn atom(kind:&[u8;4],payload:&[u8])->Vec<u8>{let mut b=((payload.len()+8)as u32).to_be_bytes().to_vec();b.extend(kind);b.extend(payload);b}
 #[test]fn complete_and_truncated_containers_are_distinct(){let mut file=tempfile::NamedTempFile::new().unwrap();let mut bytes=atom(b"ftyp",b"isom0000");bytes.extend(atom(b"mdat",b"pixels"));file.write_all(&bytes).unwrap();assert!(!complete(file.path()));bytes.extend(atom(b"moov",b"metadata"));std::fs::write(file.path(),&bytes).unwrap();assert!(complete(file.path()));bytes.pop();std::fs::write(file.path(),&bytes).unwrap();assert!(!complete(file.path()));}
 #[test]fn extended_atoms_and_invalid_atom_sizes(){let file=tempfile::NamedTempFile::new().unwrap();let mut bytes=atom(b"ftyp",b"isom0000");bytes.extend(1u32.to_be_bytes());bytes.extend(b"mdat");bytes.extend(20u64.to_be_bytes());bytes.extend(b"data");bytes.extend(atom(b"moov",b"metadata"));std::fs::write(file.path(),&bytes).unwrap();assert!(complete(file.path()));bytes[0..4].copy_from_slice(&4u32.to_be_bytes());std::fs::write(file.path(),&bytes).unwrap();assert!(!complete(file.path()));}
}
