//! ScreenCaptureKit loaded lazily: macOS <15 can still run the image application.
//! Recording objects never leave the owning worker thread. No Swift bridge.
use super::model::{RecordingSettings,CaptureRegion,output_size};
use crate::{display_capture::DisplayTarget,imaging::NativeError};
use std::{sync::{OnceLock,mpsc},time::{Duration,Instant},path::Path};
use block2::RcBlock;
use libloading::Library;
use objc2::{AnyThread,DefinedClass,define_class,extern_protocol,msg_send,rc::{Retained,Allocated},runtime::{AnyClass,AnyObject,Bool,ProtocolObject}};
use objc2_foundation::{NSObject,NSObjectProtocol,NSArray,NSError,NSURL};
use objc2_core_media::CMTime;

fn fail()->NativeError{NativeError::new("recording_failed","Screen recording failed. Check Screen & System Audio Recording permission and retry.")}
pub fn available()->bool{
 static FRAMEWORK:OnceLock<Result<Library,()>>=OnceLock::new();
 FRAMEWORK.get_or_init(||unsafe{Library::new("/System/Library/Frameworks/ScreenCaptureKit.framework/ScreenCaptureKit")}.map_err(|_|())).is_ok()&&AnyClass::get(c"SCRecordingOutput").is_some()
}
extern_protocol!(
 unsafe trait SCRecordingOutputDelegate:NSObjectProtocol{
  #[optional]#[unsafe(method(recordingOutputDidStartRecording:))]unsafe fn started(&self,output:&AnyObject);
  #[optional]#[unsafe(method(recordingOutputDidFinishRecording:))]unsafe fn finished(&self,output:&AnyObject);
  #[optional]#[unsafe(method(recordingOutput:didFailWithError:))]unsafe fn failed(&self,output:&AnyObject,error:&NSError);
 }
);
#[derive(Clone,Copy)]enum Event{Started(Instant),Finished,Failed}
define_class!(
 #[unsafe(super=NSObject)]#[ivars=mpsc::Sender<Event>]
 struct FerShotRecordingDelegate;
 unsafe impl NSObjectProtocol for FerShotRecordingDelegate{}
 unsafe impl SCRecordingOutputDelegate for FerShotRecordingDelegate{
  #[unsafe(method(recordingOutputDidStartRecording:))]fn started(&self,_:&AnyObject){let _=self.ivars().send(Event::Started(Instant::now()));}
  #[unsafe(method(recordingOutputDidFinishRecording:))]fn finished(&self,_:&AnyObject){let _=self.ivars().send(Event::Finished);}
  #[unsafe(method(recordingOutput:didFailWithError:))]fn failed(&self,_:&AnyObject,_error:&NSError){let _=self.ivars().send(Event::Failed);}
 }
);
// Immutable SCShareableContent is retained in its callback, transferred once to
// the recording worker, and not shared or accessed concurrently across threads.
struct Content(Retained<AnyObject>);
unsafe impl Send for Content{}
pub struct Capture{
 stream:Retained<AnyObject>,output:Retained<AnyObject>,_delegate:Retained<FerShotRecordingDelegate>,events:mpsc::Receiver<Event>,
 pub started:Instant,pub width:u32,pub height:u32,pub display:DisplayTarget,stopped:bool,terminal:Option<bool>,
 pub(super) guide_excluded:bool,
}
fn alloc(name:&std::ffi::CStr)->Result<Allocated<AnyObject>,NativeError>{let class=AnyClass::get(name).ok_or_else(fail)?;Ok(unsafe{msg_send![class,alloc]})}
fn object(name:&std::ffi::CStr)->Result<Retained<AnyObject>,NativeError>{Ok(unsafe{msg_send![alloc(name)?,init]})}
fn excluding_guide(display:&AnyObject,window:&AnyObject)->Option<Retained<AnyObject>>{
 objc2::exception::catch(std::panic::AssertUnwindSafe(||unsafe{
  let filter=alloc(c"SCContentFilter").ok()?;
  let excluded=NSArray::from_slice(&[window]);
  msg_send![filter,initWithDisplay:display,excludingWindows:&*excluded]
 })).ok().flatten()
}
pub fn start(path:&Path,display:DisplayTarget,settings:&RecordingSettings,region:CaptureRegion,guide_id:Option<u32>)->Result<Capture,NativeError>{objc2::exception::catch(||start_inner(path,display,settings,region,guide_id)).unwrap_or_else(|_|Err(fail()))}
fn start_inner(path:&Path,display:DisplayTarget,settings:&RecordingSettings,region:CaptureRegion,guide_id:Option<u32>)->Result<Capture,NativeError>{
 if !available(){return Err(NativeError::new("unsupported_recording","Screen recording requires macOS 15 or later."))}
 unsafe{
  if settings.microphone{
   let class=AnyClass::get(c"AVCaptureDevice").ok_or_else(fail)?;
   let(tx,rx)=mpsc::sync_channel(1);let permission=RcBlock::new(move|granted:Bool|{let _=tx.send(granted.as_bool());});
   let media=objc2_foundation::NSString::from_str("soun");let _:()=msg_send![class,requestAccessForMediaType:&*media,completionHandler:&*permission];
   if !rx.recv_timeout(Duration::from_secs(30)).map_err(|_|fail())?{return Err(NativeError::new("permission_denied","Allow Microphone access for FerShot X or turn microphone recording off."))}
  }
  let(tx,rx)=mpsc::sync_channel(1);
  let block=RcBlock::new(move|content:*mut AnyObject,error:*mut NSError|{let value=if error.is_null(){Retained::retain(content).map(Content).ok_or(())}else{Err(())};let _=tx.send(value);});
  let class=AnyClass::get(c"SCShareableContent").ok_or_else(fail)?;
  let _:()=msg_send![class,getShareableContentExcludingDesktopWindows:Bool::NO,onScreenWindowsOnly:Bool::NO,completionHandler:&*block];
  let content=rx.recv_timeout(Duration::from_secs(30)).map_err(|_|fail())?.map_err(|_|fail())?;
  let displays:Retained<NSArray<AnyObject>>=msg_send![&*content.0,displays];
  let target=displays.iter().find(|d|{let id:u32=msg_send![&**d,displayID];id==display.id}).ok_or_else(fail)?;
  let empty=NSArray::<AnyObject>::new();
  let applications:Retained<NSArray<AnyObject>>=msg_send![&*content.0,applications];
  let mut own=applications.iter().find(|app|{let pid:i32=msg_send![&**app,processID];pid==std::process::id()as i32});
  let mut guide_window=None;
  if own.is_none(){
   // Resolve window ownership too if the application list omits our process.
   let windows:Retained<NSArray<AnyObject>>=msg_send![&*content.0,windows];
   own=windows.iter().find_map(|window|{let owner:Option<Retained<AnyObject>>=msg_send![&*window,owningApplication];owner.filter(|app|{let pid:i32=msg_send![&**app,processID];pid==std::process::id()as i32})});
   if own.is_none(){if let Some(guide_id)=guide_id{guide_window=windows.iter().find(|window|{let id:u32=msg_send![&**window,windowID];id==guide_id});}}
  }
  let guide_filter=guide_window.and_then(|window|excluding_guide(&target,&window));
  let guide_excluded=guide_id.is_some()&&(own.is_some()||guide_filter.is_some());
  let filter:Retained<AnyObject>=if let Some(filter)=guide_filter{
   filter
  }else{
   let own=NSArray::from_slice(&own.iter().map(|app|&**app).collect::<Vec<_>>());
   msg_send![alloc(c"SCContentFilter")?,initWithDisplay:&*target,excludingApplications:&*own,exceptingWindows:&*empty]
  };
  let(width,height)=output_size(region,display.scale);
  let config=object(c"SCStreamConfiguration")?;
  let _:()=msg_send![&*config,setSourceRect:objc2_foundation::NSRect::new(objc2_foundation::NSPoint::new(region.x,region.y),objc2_foundation::NSSize::new(region.width,region.height))];
  let _:()=msg_send![&*config,setWidth:width as usize];let _:()=msg_send![&*config,setHeight:height as usize];
  let _:()=msg_send![&*config,setMinimumFrameInterval:CMTime::new(1,30)];
  let _:()=msg_send![&*config,setShowsCursor:Bool::new(!settings.record_pointer)];
  let _:()=msg_send![&*config,setCapturesAudio:Bool::new(settings.system_audio)];
  let _:()=msg_send![&*config,setExcludesCurrentProcessAudio:Bool::YES];
  let _:()=msg_send![&*config,setCaptureMicrophone:Bool::new(settings.microphone)];
  let stream:Retained<AnyObject>=msg_send![alloc(c"SCStream")?,initWithFilter:&*filter,configuration:&*config,delegate:std::ptr::null::<AnyObject>()];
  let output_config=object(c"SCRecordingOutputConfiguration")?;
  let url=NSURL::fileURLWithPath(&objc2_foundation::NSString::from_str(path.to_str().ok_or_else(fail)?));
  let _:()=msg_send![&*output_config,setOutputURL:&*url];
  let codec=objc2_av_foundation::AVVideoCodecTypeH264.ok_or_else(fail)?;
  let file_type=objc2_av_foundation::AVFileTypeMPEG4.ok_or_else(fail)?;
  let _:()=msg_send![&*output_config,setVideoCodecType:codec];let _:()=msg_send![&*output_config,setOutputFileType:file_type];
  let(tx,events)=mpsc::channel();let this=FerShotRecordingDelegate::alloc().set_ivars(tx);
  let delegate:Retained<FerShotRecordingDelegate>=msg_send![super(this),init];
  let output:Retained<AnyObject>=msg_send![alloc(c"SCRecordingOutput")?,initWithConfiguration:&*output_config,delegate:ProtocolObject::<dyn SCRecordingOutputDelegate>::from_ref(&*delegate)];
  let mut error=std::ptr::null_mut::<NSError>();let added:Bool=msg_send![&*stream,addRecordingOutput:&*output,error:&mut error];if !added.as_bool(){return Err(fail())}
  let mut capture=Capture{stream,output,_delegate:delegate,events,started:Instant::now(),width,height,display,stopped:false,terminal:None,guide_excluded};
  let(tx,rx)=mpsc::sync_channel(1);let block=RcBlock::new(move|error:*mut NSError|{let _=tx.send(error.is_null());});
  let _:()=msg_send![&*capture.stream,startCaptureWithCompletionHandler:&*block];
  if !rx.recv_timeout(Duration::from_secs(15)).map_err(|_|fail())?{return Err(fail())}
  capture.started=match capture.events.recv_timeout(Duration::from_secs(15)){Ok(Event::Started(at))=>at,_=>return Err(fail())};
  Ok(capture)
 }
}
impl Capture{
 pub fn interrupted(&mut self)->bool{match self.events.try_recv(){Ok(Event::Finished)=>self.terminal=Some(true),Ok(Event::Failed)=>self.terminal=Some(false),_=>{}}self.terminal.is_some()}
 pub fn size(&self)->u64{unsafe{let size:isize=msg_send![&*self.output,recordedFileSize];size.max(0)as u64}}
 pub fn stop(&mut self)->Result<(),NativeError>{
  // stopCapture owns finalization of an attached SCRecordingOutput. Removing
  // the output first introduces a second terminal transition and can fail before
  // any document is saved. Never gate completion on reset recordedDuration.
  let(tx,rx)=mpsc::sync_channel(1);let block=RcBlock::new(move|error:*mut NSError|{
   let acknowledged=if error.is_null(){true}else{let error=unsafe{&*error};let domain=error.domain().to_string();matches!(domain.as_str(),"com.apple.ScreenCaptureKit.SCStreamErrorDomain"|"SCStreamErrorDomain")&&matches!(error.code(),-3808|-3817)};
   let _=tx.send(acknowledged);
  });
  unsafe{let _:()=msg_send![&*self.stream,stopCaptureWithCompletionHandler:&*block];}
  if !rx.recv_timeout(Duration::from_secs(15)).map_err(|_|NativeError::new("recording_stop_failed","The recording stream did not acknowledge stopping."))?{return Err(NativeError::new("recording_stop_failed","The recording stream could not stop."))}
  self.stopped=true;
  if let Some(finished)=self.terminal{return if finished{Ok(())}else{Err(fail())}}
  match self.events.recv_timeout(Duration::from_millis(500)){
   Ok(Event::Finished)=>{},
   Ok(Event::Failed)=>return Err(fail()),
   // The caller validates the finalized asset's tracks/duration before publishing
   // it. A missing delegate notification must not add a 20-second blank wait.
   Err(mpsc::RecvTimeoutError::Timeout)=>{},
   _=>return Err(fail()),
  }
  Ok(())
 }
}
impl Drop for Capture{fn drop(&mut self){if !self.stopped{unsafe{let _:()=msg_send![&*self.stream,stopCaptureWithCompletionHandler:None::<&block2::DynBlock<dyn Fn(*mut NSError)>>];}}}}

#[cfg(test)]mod tests{
 use super::*;
 use objc2_foundation::NSString;
 define_class!(
  #[unsafe(super=NSObject)]#[ivars=(mpsc::Sender<Event>,u8)]
  struct SyntheticRecordingStream;
  unsafe impl NSObjectProtocol for SyntheticRecordingStream{}
  impl SyntheticRecordingStream{
   #[unsafe(method(stopCaptureWithCompletionHandler:))]
   fn stop(&self,completion:Option<&block2::DynBlock<dyn Fn(*mut NSError)>>){
    // Generated callbacks only: no framework, display, audio or OS input.
    let(tx,mode)=self.ivars();let Some(completion)=completion else{return};
    let _=tx.send(if *mode==3{Event::Failed}else{Event::Finished});
    let error=if *mode==0||*mode==3{None}else{Some(unsafe{NSError::errorWithDomain_code_userInfo(&NSString::from_str(if *mode==1{"com.apple.ScreenCaptureKit.SCStreamErrorDomain"}else{"UnrelatedErrorDomain"}),-3808,None)})};
    completion.call((error.as_ref().map_or(std::ptr::null_mut(),|e|Retained::as_ptr(e).cast_mut()),));
   }
  }
 );
 fn synthetic(mode:u8)->Capture{unsafe{
  let(tx,events)=mpsc::channel();let stream:Retained<SyntheticRecordingStream>=msg_send![super(SyntheticRecordingStream::alloc().set_ivars((tx.clone(),mode))),init];
  let delegate:Retained<FerShotRecordingDelegate>=msg_send![super(FerShotRecordingDelegate::alloc().set_ivars(tx)),init];
  Capture{stream:Retained::cast_unchecked(stream),output:Retained::cast_unchecked(NSObject::new()),_delegate:delegate,events,started:Instant::now(),width:160,height:100,display:DisplayTarget{id:1,rect:fershot_capture_core::ScreenRect{x:0,y:0,width:160,height:100},scale:1.},stopped:false,terminal:None,guide_excluded:false}
 }}
 #[test]fn stop_finalizes_attached_writer_without_removing_it(){let mut capture=synthetic(0);assert!(capture.stop().is_ok());assert!(capture.stopped);}
 #[test]fn already_stopped_is_accepted_only_for_screencapturekit(){assert!(synthetic(1).stop().is_ok());assert!(synthetic(2).stop().is_err());}
 #[test]fn failed_writer_is_never_published(){assert!(synthetic(3).stop().is_err());}
 #[test]fn consumed_finish_notification_remains_available_to_stop(){let mut capture=synthetic(1);capture.terminal=Some(true);assert!(capture.interrupted());assert!(capture.stop().is_ok());}
}

