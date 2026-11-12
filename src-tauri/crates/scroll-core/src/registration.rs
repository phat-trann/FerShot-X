//! Capture-only vertical registration using textured landmarks, not blank pixels.
use super::{ScrollFrame,ScrollDirection,StitchOptions};
#[derive(Clone,Copy)]struct Mark{x:usize,y:usize,rgb:[u8;3],dx:i16,dy:i16}
fn luma(frame:&ScrollFrame,x:usize,y:usize)->i16{let i=(y*frame.width as usize+x)*4;(frame.rgba[i]as i16+frame.rgba[i+1]as i16+frame.rgba[i+2]as i16)/3}
fn mark(frame:&ScrollFrame,x:usize,y:usize)->Mark{let i=(y*frame.width as usize+x)*4;Mark{x,y,rgb:[frame.rgba[i],frame.rgba[i+1],frame.rgba[i+2]],dx:luma(frame,x+1,y)-luma(frame,x-1,y),dy:luma(frame,x,y+1)-luma(frame,x,y-1)}}
fn same(a:Mark,b:Mark)->bool{a.rgb.iter().zip(b.rgb).all(|(x,y)|x.abs_diff(y)<=12)&&(a.dx-b.dx).abs()<=24&&(a.dy-b.dy).abs()<=24}
pub(super)fn overlap(prev:&ScrollFrame,next:&ScrollFrame,options:StitchOptions)->Option<u32>{
 let(w,h)=(prev.width as usize,prev.height as usize);if w<5||h<12||next.width!=prev.width||next.height!=prev.height{return None}
 let mut columns=Vec::new();let margin=(w/20).max(2);
 for x in (margin..w-margin-1).step_by((w/48).max(1)){
  let mut points=Vec::new();for y in (1..h-1).step_by((h/96).max(1)){let m=mark(prev,x,y);if m.dx.abs().max(m.dy.abs())>=32{points.push(m)}}
  let step=points.len().div_ceil(24).max(1);let points=points.into_iter().step_by(step).collect::<Vec<_>>();if points.len()>=4{columns.push(points)}
 }
 if columns.len()<3{return None}
 let max_shift=(h.saturating_sub(options.min_overlap_rows as usize)).min(h*3/4);let mut best=None;
 let evaluate=|shift:usize|->Option<usize>{
  let(mut active,mut good,mut score)=(0usize,0usize,0usize);
  for points in &columns{
   let(mut count,mut matched)=(0usize,0usize);
   for &a in points{let y=match options.direction{ScrollDirection::Down=>a.y.checked_sub(shift),ScrollDirection::Up=>a.y.checked_add(shift)};let Some(y)=y.filter(|&y|y>0&&y<h-1)else{continue};count+=1;if same(a,mark(next,a.x,y)){matched+=1}}
   if count>=4{active+=1;let ratio=matched*1000/count;score+=ratio;if ratio>=700{good+=1}}
  }
  // No confidence from a handful of coincidental/blank matches. Moving sidebars
  // and antialias changes may be outliers, but a majority of columns must agree.
  if active<3||good<3||good*5<active*3{return None}
  Some(score/active)
 };
 let stationary=evaluate(0).unwrap_or(0);
 for shift in 1..=max_shift{if let Some(score)=evaluate(shift){if score<stationary.saturating_add(50){continue}if best.is_none_or(|(_,old)|score>old){best=Some((shift,score))}}}
 best.map(|(shift,_)|(h-shift)as u32)
}
