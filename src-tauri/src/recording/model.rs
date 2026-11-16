use serde::{Deserialize,Serialize};
use crate::imaging::NativeError;
pub const MAX_DURATION_MS:u64=30*60*1000;
pub const MAX_VIDEO_BYTES:u64=1024*1024*1024;
pub const MAX_SAMPLES:usize=54_010;
pub fn invalid()->NativeError{NativeError::new("invalid_video","Invalid recording or video edit settings.")}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct RecordingSettings{pub system_audio:bool,pub microphone:bool,pub record_pointer:bool}
impl Default for RecordingSettings{fn default()->Self{Self{system_audio:false,microphone:false,record_pointer:true}}}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct PointerSample{pub time_ms:u64,pub x:f64,pub y:f64,pub visible:bool,pub left:bool,pub right:bool}
#[derive(Clone,Copy,Default,Serialize,Deserialize,PartialEq)]#[serde(rename_all="lowercase")]pub enum AnnotationKind{#[default]Highlight,Arrow,Text,Cover,Image}
fn default_font()->f64{32.}
fn default_stroke()->f64{3.}
#[derive(Clone,Default,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Highlight{#[serde(default,skip_serializing_if="String::is_empty")]pub image_png:String,#[serde(default)]pub kind:AnnotationKind,#[serde(default)]pub text:String,#[serde(default="default_font")]pub font_size:f64,#[serde(default="default_stroke")]pub stroke_width:f64,#[serde(default)]pub reverse_x:bool,#[serde(default)]pub reverse_y:bool,pub id:String,pub start_ms:u64,pub end_ms:u64,pub x:f64,pub y:f64,pub width:f64,pub height:f64,pub color:String,pub opacity:f64}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct VideoDraft{pub schema_version:u8,pub start_ms:u64,pub end_ms:u64,pub muted:bool,pub cursor_visible:bool,pub cursor_size:f64,pub click_highlight:bool,pub highlights:Vec<Highlight>,#[serde(default,skip_serializing_if="Option::is_none")]pub timeline:Option<super::timeline::VideoTimeline>,#[serde(default)]pub cursor_style:super::timeline::CursorStyle,#[serde(default="super::timeline::white")]pub cursor_color:String,#[serde(default,skip_serializing_if="Option::is_none")]pub cursor_asset:Option<super::timeline::CursorAsset>}
impl VideoDraft{
 pub fn new(duration:u64)->Self{Self{schema_version:1,start_ms:0,end_ms:duration,muted:false,cursor_visible:true,cursor_size:24.,click_highlight:true,highlights:vec![],timeline:None,cursor_style:Default::default(),cursor_color:super::timeline::white(),cursor_asset:None}}
 pub fn needs_render(&self,duration:u64,pointer:&[PointerSample],has_audio:bool)->bool{
  if let Some(t)=&self.timeline{
   use super::timeline::LayerKind;
   let original=|kind|t.layers.iter().any(|l|l.kind==kind&&l.enabled&&l.clips.len()==1&&l.clips[0].start_ms==0&&l.clips[0].end_ms==duration&&l.clips[0].source_start_ms==0);
   return self.start_ms!=0||self.end_ms!=duration||self.muted||!original(LayerKind::Video)||(has_audio&&!original(LayerKind::Audio))||t.layers.iter().any(|l|l.enabled&&!l.clips.is_empty()&&match l.kind{LayerKind::Highlight|LayerKind::Arrow|LayerKind::Text|LayerKind::Cover|LayerKind::Image=>true,LayerKind::Cursor=>self.cursor_visible&&pointer.iter().any(|p|p.visible),LayerKind::Clicks=>self.click_highlight&&pointer.iter().any(|p|p.visible&&(p.left||p.right)),_=>false});
  }
  self.start_ms!=0||self.end_ms!=duration||self.muted||!self.highlights.is_empty()||
   (self.cursor_visible&&pointer.iter().any(|p|p.visible))||
   (self.click_highlight&&pointer.iter().any(|p|p.visible&&(p.left||p.right)))
 }
 pub fn validate(&self,duration:u64)->Result<(),NativeError>{
  let timeline_duration=self.timeline.as_ref().map_or(duration,|t|t.duration(duration));
  if self.timeline.as_ref().is_some_and(|t|!t.validate(duration,&self.highlights))||self.cursor_color.len()!=7||!self.cursor_color.starts_with('#')||!self.cursor_color.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit)||self.cursor_asset.as_ref().is_some_and(|a|!a.validate())||self.cursor_style==super::timeline::CursorStyle::System&&self.cursor_asset.is_none(){return Err(invalid())}
  if self.schema_version!=1||duration==0||duration>MAX_DURATION_MS||self.start_ms>=self.end_ms||self.end_ms>timeline_duration||self.end_ms-self.start_ms<100||!self.cursor_size.is_finite()||!(12.0..=96.0).contains(&self.cursor_size)||self.highlights.len()>128{return Err(invalid())}
  if self.highlights.iter().map(|h|h.image_png.len()).sum::<usize>()>6*1024*1024{return Err(invalid())}
  let mut ids=std::collections::HashSet::new();
  for h in &self.highlights{if h.kind==AnnotationKind::Image&&!super::timeline::valid_image(&h.image_png)||h.kind!=AnnotationKind::Image&&!h.image_png.is_empty()||!valid_id(&h.id)||!ids.insert(&h.id)||h.start_ms>=h.end_ms||h.end_ms>timeline_duration||![h.x,h.y,h.width,h.height,h.opacity].iter().all(|v|v.is_finite())||h.x<0.||h.y<0.||h.width<=0.||h.height<=0.||h.x+h.width>1.000001||h.y+h.height>1.000001||!(0.05..=if h.kind==AnnotationKind::Highlight{0.8}else{1.}).contains(&h.opacity)||!h.font_size.is_finite()||!(12.0..=160.0).contains(&h.font_size)||!h.stroke_width.is_finite()||!(1.0..=32.0).contains(&h.stroke_width)||h.text.len()>2048||h.kind==AnnotationKind::Text&&h.text.trim().is_empty()||h.kind==AnnotationKind::Cover&&h.opacity!=1.||h.color.len()!=7||!h.color.starts_with('#')||!h.color.as_bytes()[1..].iter().all(u8::is_ascii_hexdigit){return Err(invalid())}}
  Ok(())
 }
}
pub fn valid_id(id:&str)->bool{!id.is_empty()&&id.len()<=96&&id.bytes().all(|b|b.is_ascii_alphanumeric()||b==b'-')}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct Clip{pub id:String,pub name:String,pub width:u32,pub height:u32,pub duration_ms:u64,pub byte_size:u64,pub created_at:u64,pub media_path:String,pub poster:String,#[serde(default,skip_serializing_if="Option::is_none")]pub has_audio:Option<bool>}
#[derive(Clone,Serialize,Deserialize)]#[serde(rename_all="camelCase",deny_unknown_fields)]
pub struct VideoDocument{pub clip:Clip,pub draft:VideoDraft,pub pointer:Vec<PointerSample>}
#[derive(Clone,Serialize)]#[serde(rename_all="camelCase")]
pub struct RecordingStatus{pub phase:&'static str,pub elapsed_ms:u64,pub error:Option<&'static str>,pub clip_id:Option<String>}
#[cfg(test)]mod tests{use super::*;
 #[test]fn trim_and_highlights_remain_inside_recording(){let mut d=VideoDraft::new(10_000);assert!(d.validate(10_000).is_ok());d.start_ms=10_000;assert!(d.validate(10_000).is_err());d.start_ms=0;d.highlights.push(Highlight{id:"h-1".into(),start_ms:500,end_ms:2000,x:0.2,y:0.3,width:0.4,height:0.2,color:"#257EFE".into(),opacity:0.3,font_size:32.,stroke_width:3.,..Default::default()});assert!(d.validate(10_000).is_ok());d.highlights[0].width=0.9;assert!(d.validate(10_000).is_err());}
 #[test]fn unchanged_video_uses_original_but_every_visible_edit_requires_render(){let mut d=VideoDraft::new(1000);assert!(!d.needs_render(1000,&[],true));let sample=PointerSample{time_ms:0,x:0.5,y:0.5,visible:true,left:false,right:false};assert!(d.needs_render(1000,&[sample.clone()],true));d.cursor_visible=false;assert!(!d.needs_render(1000,&[sample.clone()],true));let mut clicked=sample;clicked.left=true;assert!(d.needs_render(1000,&[clicked],true));d.click_highlight=false;d.muted=true;assert!(d.needs_render(1000,&[],true));d.muted=false;d.start_ms=100;assert!(d.needs_render(1000,&[],true));d.start_ms=0;d.end_ms=900;assert!(d.needs_render(1000,&[],true));}
 #[test]fn text_and_cover_validate_their_real_output_requirements(){let mut d=VideoDraft::new(1000);d.highlights.push(Highlight{id:"text".into(),kind:AnnotationKind::Text,text:"Hello".into(),font_size:24.,stroke_width:3.,start_ms:0,end_ms:1000,x:0.1,y:0.1,width:0.5,height:0.3,color:"#FFFFFF".into(),opacity:1.,..Default::default()});assert!(d.validate(1000).is_ok());d.highlights[0].text.clear();assert!(d.validate(1000).is_err());d.highlights[0].kind=AnnotationKind::Cover;d.highlights[0].opacity=0.5;assert!(d.validate(1000).is_err());d.highlights[0].opacity=1.;assert!(d.validate(1000).is_ok());}
 #[test]fn fractional_annotation_times_are_rejected_by_ipc_but_integer_arrow_roundtrips(){let mut draft=VideoDraft::new(10000);draft.highlights.push(Highlight{id:"arrow".into(),kind:AnnotationKind::Arrow,font_size:32.,stroke_width:3.,start_ms:1235,end_ms:4235,x:0.1,y:0.1,width:0.2,height:0.2,color:"#FF0000".into(),opacity:1.,..Default::default()});let mut json=serde_json::to_value(&draft).unwrap();assert!(serde_json::from_value::<VideoDraft>(json.clone()).unwrap().validate(10000).is_ok());json["highlights"][0]["startMs"]=serde_json::json!(1234.56);assert!(serde_json::from_value::<VideoDraft>(json).is_err());}
 #[test]fn reject_paths_nonfinite_and_unsupported_schema(){assert!(!valid_id("../movie"));let mut d=VideoDraft::new(1000);d.cursor_size=f64::NAN;assert!(d.validate(1000).is_err());d.cursor_size=24.;d.schema_version=2;assert!(d.validate(1000).is_err());}
}

impl Default for RecordingStatus{fn default()->Self{Self{phase:"idle",elapsed_ms:0,error:None,clip_id:None}}}

#[derive(Clone,Copy,serde::Deserialize,PartialEq,Debug)]#[serde(rename_all="lowercase")]pub enum RecordingMode{Fullscreen,Area}
#[derive(Clone,Copy,Debug,PartialEq)]pub struct CaptureRegion{pub x:f64,pub y:f64,pub width:f64,pub height:f64}
pub fn region_on_display(display:fershot_capture_core::ScreenRect,selected:fershot_capture_core::ScreenRect)->Result<CaptureRegion,NativeError>{
 let x=selected.x as f64-display.x as f64;let y=selected.y as f64-display.y as f64;
 if !selected.is_valid()||selected.width<8||selected.height<8||x<0.||y<0.||x+selected.width as f64>display.width as f64||y+selected.height as f64>display.height as f64{return Err(NativeError::new("invalid_bounds","Select a recording area inside one display, at least 8 × 8 points."))}
 Ok(CaptureRegion{x,y,width:selected.width as f64,height:selected.height as f64})
}
pub fn output_size(region:CaptureRegion,scale:f64)->(u32,u32){let w=region.width*scale;let h=region.height*scale;let ratio=(1920./w).min(1080./h).min(1.);(((w*ratio).floor()as u32/2*2).max(2),((h*ratio).floor()as u32/2*2).max(2))}
#[cfg(test)]mod region_tests{use super::*;use fershot_capture_core::ScreenRect;
 #[test]fn negative_origin_retina_region_matches_output_and_pointer_space(){let d=ScreenRect{x:-1920,y:-200,width:1920,height:1080};let r=region_on_display(d,ScreenRect{x:-1800,y:-100,width:800,height:600}).unwrap();assert_eq!(r,CaptureRegion{x:120.,y:100.,width:800.,height:600.});assert_eq!(output_size(r,2.),(1440,1080));}
 #[test]fn crossing_display_empty_and_tiny_regions_rejected(){let d=ScreenRect{x:0,y:0,width:1000,height:800};for r in [ScreenRect{x:-1,y:0,width:50,height:50},ScreenRect{x:990,y:0,width:50,height:50},ScreenRect{x:10,y:0,width:7,height:50}]{assert!(region_on_display(d,r).is_err());}assert_eq!(output_size(CaptureRegion{x:0.,y:0.,width:3840.,height:2160.},1.),(1920,1080));}
}
