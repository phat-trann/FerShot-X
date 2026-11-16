use super::model::*;
use serde::{Serialize,Deserialize};
#[derive(Clone,Copy,Serialize,Deserialize,PartialEq,Debug)]#[serde(rename_all="lowercase")]pub enum LayerKind{Video,Audio,Cursor,Clicks,Highlight,Arrow,Text,Cover,Image}
impl LayerKind{pub fn is_annotation(self)->bool{matches!(self,Self::Highlight|Self::Arrow|Self::Text|Self::Cover|Self::Image)}}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct TimelineClip{pub id:String,pub start_ms:u64,pub end_ms:u64,pub source_start_ms:u64}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct VideoLayer{pub id:String,pub kind:LayerKind,pub enabled:bool,pub locked:bool,#[serde(default,skip_serializing_if="Option::is_none")]pub highlight_id:Option<String>,pub clips:Vec<TimelineClip>}
#[derive(Clone,Serialize,Deserialize)]#[serde(deny_unknown_fields)]pub struct VideoTimeline{pub layers:Vec<VideoLayer>}
#[derive(Clone,Copy,Serialize,Deserialize,Default,PartialEq)]#[serde(rename_all="lowercase")]pub enum CursorStyle{System,#[default]Custom}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]pub struct CursorAsset{pub png:String,pub width:u32,pub height:u32,pub hotspot_x:f64,pub hotspot_y:f64}
pub fn valid_image(png:&str)->bool{use base64::Engine;let Some(data)=png.strip_prefix("data:image/png;base64,")else{return false};if data.len()>2*1024*1024{return false}let Ok(bytes)=base64::engine::general_purpose::STANDARD.decode(data)else{return false};if bytes.len()<24||&bytes[..8]!=b"\x89PNG\r\n\x1a\n"{return false}let w=u32::from_be_bytes(bytes[16..20].try_into().unwrap());let h=u32::from_be_bytes(bytes[20..24].try_into().unwrap());if !(1..=2048).contains(&w)||!(1..=2048).contains(&h){return false}image::load_from_memory_with_format(&bytes,image::ImageFormat::Png).is_ok()}
pub fn white()->String{"#FFFFFF".into()}
impl CursorAsset{pub fn validate(&self)->bool{use base64::Engine;let Some(png)=self.png.strip_prefix("data:image/png;base64,")else{return false};if png.len()>350000||!(1..=256).contains(&self.width)||!(1..=256).contains(&self.height)||![self.hotspot_x,self.hotspot_y].iter().all(|v|v.is_finite()&&(0.0..=1.0).contains(v)){return false}let Ok(bytes)=base64::engine::general_purpose::STANDARD.decode(png)else{return false};if bytes.len()<24||&bytes[..8]!=b"\x89PNG\r\n\x1a\n"||u32::from_be_bytes(bytes[16..20].try_into().unwrap())!=self.width||u32::from_be_bytes(bytes[20..24].try_into().unwrap())!=self.height{return false}image::load_from_memory_with_format(&bytes,image::ImageFormat::Png).is_ok()}}
impl VideoTimeline{
 pub fn duration(&self,source:u64)->u64{self.layers.iter().flat_map(|l|&l.clips).map(|c|c.end_ms).max().unwrap_or(source).max(source)}
 pub fn validate(&self,source:u64,highlights:&[Highlight])->bool{
  if self.layers.is_empty()||self.layers.len()>32||self.layers.iter().filter(|l|l.kind==LayerKind::Video).count()!=1||self.layers.iter().filter(|l|l.kind==LayerKind::Audio).count()>1{return false}
  let mut ids=std::collections::HashSet::new();let mut count=0;
  for l in &self.layers{if !valid_id(&l.id)||!ids.insert(l.id.clone())||l.clips.len()>64||(l.kind.is_annotation()&&!highlights.iter().any(|h|Some(&h.id)==l.highlight_id.as_ref())){return false}let mut clips=l.clips.iter().collect::<Vec<_>>();clips.sort_by_key(|c|c.start_ms);let mut end=0;for c in clips{count+=1;if count>256||!valid_id(&c.id)||!ids.insert(c.id.clone())||c.start_ms<end||c.end_ms<c.start_ms.saturating_add(100)||c.end_ms>MAX_DURATION_MS||(!l.kind.is_annotation()&&c.source_start_ms.saturating_add(c.end_ms-c.start_ms)>source){return false}end=c.end_ms;}}
  true
 }
 pub fn clips(&self,kind:LayerKind)->Vec<TimelineClip>{self.layers.iter().filter(|l|l.kind==kind&&l.enabled).flat_map(|l|l.clips.clone()).collect()}
}
/// Invisible boundaries prevent cursor state leaking across deleted gaps. At an
/// adjacent cut the next clip owns the boundary sample, not the previous gap.
pub fn mapped_pointer(samples:&[PointerSample],clips:&[TimelineClip])->Vec<PointerSample>{
 let mut result=Vec::new();let mut ordered=clips.iter().collect::<Vec<_>>();ordered.sort_by_key(|c|c.start_ms);for clip in ordered{let source_end=clip.source_start_ms+clip.end_ms-clip.start_ms;
  let before=samples.iter().rev().find(|p|p.time_ms<=clip.source_start_ms).or(samples.first());
  if let Some(p)=before{let mut p=p.clone();if let Some(next)=samples.iter().find(|p|p.time_ms>clip.source_start_ms){if p.visible&&next.visible&&next.time_ms>p.time_ms{let t=(clip.source_start_ms.saturating_sub(p.time_ms))as f64/(next.time_ms-p.time_ms)as f64;p.x+=(next.x-p.x)*t;p.y+=(next.y-p.y)*t;}}p.time_ms=clip.start_ms;result.push(p);}
  for p in samples.iter().filter(|p|p.time_ms>clip.source_start_ms&&p.time_ms<source_end){let mut p=p.clone();p.time_ms=clip.start_ms+p.time_ms-clip.source_start_ms;result.push(p);}
  if let Some(p)=result.last().cloned(){let mut p=p;p.time_ms=clip.end_ms;p.visible=false;p.left=false;p.right=false;result.push(p);}
 }let mut by_time=std::collections::BTreeMap::new();for p in result{by_time.insert(p.time_ms,p);}if let Some((&at,p))=by_time.first_key_value(){if at>0{let mut hidden=p.clone();hidden.time_ms=0;hidden.visible=false;hidden.left=false;hidden.right=false;by_time.insert(0,hidden);}}by_time.into_values().collect()
}
/// Detect transitions in source time before trimming, avoiding invented clicks
/// when a clip starts in the middle of a held button.
pub fn mapped_clicks(samples:&[PointerSample],clips:&[TimelineClip])->Vec<PointerSample>{
 let mut events=Vec::new();let(mut left,mut right)=(false,false);for p in samples{if p.visible&&((p.left&&!left)||(p.right&&!right)){events.push(p);}left=p.left;right=p.right;}
 let mut result=Vec::new();for c in clips{for p in events.iter().filter(|p|p.time_ms>=c.source_start_ms&&p.time_ms<c.source_start_ms+c.end_ms-c.start_ms){let mut p=(*p).clone();p.time_ms=c.start_ms+p.time_ms-c.source_start_ms;let mut release=p.clone();release.time_ms+=1;release.left=false;release.right=false;result.push(p);result.push(release);}result.push(PointerSample{time_ms:c.end_ms,x:0.,y:0.,visible:false,left:false,right:false});}result.sort_by_key(|p|p.time_ms);result
}
#[cfg(test)]mod tests{use super::*;
 #[test]fn image_layers_accept_only_bounded_decodable_pngs(){use base64::Engine;let encode=|bytes:&[u8]|format!("data:image/png;base64,{}",base64::engine::general_purpose::STANDARD.encode(bytes));let mut bytes=std::io::Cursor::new(Vec::new());image::DynamicImage::ImageRgba8(image::RgbaImage::from_pixel(4,3,image::Rgba([255,0,255,255]))).write_to(&mut bytes,image::ImageFormat::Png).unwrap();let bytes=bytes.into_inner();assert!(valid_image(&encode(&bytes)));assert!(!valid_image("https://example.test/image.png"));assert!(!valid_image(&encode(&bytes[..24])));let mut oversized=bytes.clone();oversized[16..20].copy_from_slice(&4096u32.to_be_bytes());assert!(!valid_image(&encode(&oversized)));assert!(!valid_image(&format!("data:image/png;base64,{}","A".repeat(2*1024*1024+1))));}

 #[test]fn trimmed_click_layer_does_not_invent_held_click(){let samples=vec![PointerSample{time_ms:0,x:0.2,y:0.3,visible:true,left:false,right:false},PointerSample{time_ms:100,x:0.2,y:0.3,visible:true,left:true,right:false},PointerSample{time_ms:500,x:0.2,y:0.3,visible:true,left:true,right:false}];let c=TimelineClip{id:"cut".into(),start_ms:0,end_ms:500,source_start_ms:200};assert!(!mapped_clicks(&samples,&[c]).iter().any(|p|p.left||p.right));}
 #[test]fn cursor_boundary_uses_new_segment_at_adjacent_cut(){let samples=vec![PointerSample{time_ms:0,x:0.1,y:0.3,visible:true,left:false,right:false},PointerSample{time_ms:500,x:0.8,y:0.3,visible:true,left:false,right:false}];let clips=[TimelineClip{id:"one".into(),start_ms:0,end_ms:500,source_start_ms:0},TimelineClip{id:"two".into(),start_ms:500,end_ms:1000,source_start_ms:500}];let mapped=mapped_pointer(&samples,&clips);let boundary=mapped.iter().find(|p|p.time_ms==500).unwrap();assert!(boundary.visible);assert_eq!(boundary.x,0.8);assert!(!mapped.last().unwrap().visible);}
 #[test]fn moved_cursor_stays_hidden_before_its_clip(){let samples=vec![PointerSample{time_ms:0,x:0.5,y:0.5,visible:true,left:false,right:false}];let result=mapped_pointer(&samples,&[TimelineClip{id:"late".into(),start_ms:5000,end_ms:6000,source_start_ms:0}]);assert_eq!(result[0].time_ms,0);assert!(!result[0].visible);assert!(result[1].visible);assert_eq!(result[1].time_ms,5000);}
 #[test]fn validation_rejects_overlap_and_out_of_source_ranges(){let mut t=VideoTimeline{layers:vec![VideoLayer{id:"v".into(),kind:LayerKind::Video,enabled:true,locked:false,highlight_id:None,clips:vec![TimelineClip{id:"one".into(),start_ms:0,end_ms:1000,source_start_ms:0}]},VideoLayer{id:"a".into(),kind:LayerKind::Audio,enabled:true,locked:false,highlight_id:None,clips:vec![]}]};assert!(t.validate(1000,&[]));t.layers[0].clips.push(TimelineClip{id:"two".into(),start_ms:500,end_ms:1500,source_start_ms:0});assert!(!t.validate(1000,&[]));t.layers[0].clips[1].start_ms=1000;t.layers[0].clips[1].end_ms=2000;assert!(t.validate(1000,&[]));t.layers[0].clips[1].source_start_ms=1;assert!(!t.validate(1000,&[]));}
}
