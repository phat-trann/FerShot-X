//! macOS UserNotifications with acknowledged permission/submission, never legacy fire-and-forget.
#[derive(Clone,Copy,Debug,PartialEq,Eq)]pub enum Failure{Denied,Timeout,Unavailable,Submission}
#[cfg(target_os="macos")]
mod mac{
 use super::Failure;
 use std::{cell::RefCell,sync::mpsc,time::Duration};
 use block2::{RcBlock,DynBlock};
 use objc2::{define_class,msg_send,DefinedClass,AnyThread,rc::Retained,runtime::{Bool,ProtocolObject}};
 use objc2_foundation::{NSObject,NSObjectProtocol,NSString,NSError};
 use objc2_user_notifications::*;
 define_class!(
  #[unsafe(super=NSObject)]
  #[ivars=tauri::AppHandle]
  struct FerShotUpdateNotificationDelegate;
  unsafe impl NSObjectProtocol for FerShotUpdateNotificationDelegate{}
  unsafe impl UNUserNotificationCenterDelegate for FerShotUpdateNotificationDelegate{
   #[unsafe(method(userNotificationCenter:willPresentNotification:withCompletionHandler:))]
   fn present(&self,_center:&UNUserNotificationCenter,_notification:&UNNotification,complete:&DynBlock<dyn Fn(UNNotificationPresentationOptions)>){complete.call((UNNotificationPresentationOptions::Banner|UNNotificationPresentationOptions::List|UNNotificationPresentationOptions::Sound,));}
   #[unsafe(method(userNotificationCenter:didReceiveNotificationResponse:withCompletionHandler:))]
   fn response(&self,_center:&UNUserNotificationCenter,response:&UNNotificationResponse,complete:&DynBlock<dyn Fn()>){
    let identifier=response.notification().request().identifier().to_string();
    if super::opens_updates(&identifier,&response.actionIdentifier().to_string()){
     let app=self.ivars().clone();let handle=app.clone();let _=handle.run_on_main_thread(move||{let _=crate::preferences_window::open_tab(&app,Some("updates"));});
    }complete.call(());
   }
  }
 );
 thread_local!{static DELEGATE:RefCell<Option<Retained<FerShotUpdateNotificationDelegate>>>=const{RefCell::new(None)};}
 pub fn install(app:&tauri::AppHandle){if !fershot_application_services::is_packaged_app(){return}DELEGATE.with(|slot|{if slot.borrow().is_some(){return}let this=FerShotUpdateNotificationDelegate::alloc().set_ivars(app.clone());let delegate:Retained<FerShotUpdateNotificationDelegate>=unsafe{msg_send![super(this),init]};UNUserNotificationCenter::currentNotificationCenter().setDelegate(Some(ProtocolObject::from_ref(&*delegate)));*slot.borrow_mut()=Some(delegate);});}
 pub fn send(title:&str,body:&str,test:bool)->Result<(),Failure>{
  if !fershot_application_services::is_packaged_app(){return Err(Failure::Unavailable)}
  let center=UNUserNotificationCenter::currentNotificationCenter();
  let(tx,rx)=mpsc::sync_channel(1);let permission=RcBlock::new(move|granted:Bool,error:*mut NSError|{let _=tx.send(if !error.is_null(){Err(Failure::Submission)}else if granted.as_bool(){Ok(())}else{Err(Failure::Denied)});});
  center.requestAuthorizationWithOptions_completionHandler(UNAuthorizationOptions::Alert|UNAuthorizationOptions::Sound,&permission);
  rx.recv_timeout(Duration::from_secs(30)).map_err(|_|Failure::Timeout)??;
  let content=UNMutableNotificationContent::new();content.setTitle(&NSString::from_str(title));content.setBody(&NSString::from_str(body));content.setSound(Some(&UNNotificationSound::defaultSound()));
  let request=UNNotificationRequest::requestWithIdentifier_content_trigger(&NSString::from_str(if test{"fershot-update-test"}else{"fershot-update"}),&content,None);
  let(tx,rx)=mpsc::sync_channel(1);let completion=RcBlock::new(move|error:*mut NSError|{let _=tx.send(if error.is_null(){Ok(())}else{Err(Failure::Submission)});});center.addNotificationRequest_withCompletionHandler(&request,Some(&completion));
  rx.recv_timeout(Duration::from_secs(10)).map_err(|_|Failure::Timeout)?
 }
}
pub fn install(app:&tauri::AppHandle){#[cfg(target_os="macos")]mac::install(app);#[cfg(not(target_os="macos"))]let _=app;}
pub fn send(app:&tauri::AppHandle,title:&str,body:&str,test:bool)->Result<(),Failure>{
 #[cfg(target_os="macos")] {let _=app;mac::send(title,body,test)}
 #[cfg(not(target_os="macos"))]{use tauri_plugin_notification::NotificationExt;let _=test;app.notification().builder().title(title).body(body).show().map_err(|_|Failure::Submission)}
}
fn opens_updates(identifier:&str,action:&str)->bool{matches!(identifier,"fershot-update"|"fershot-update-test")&&action=="com.apple.UNNotificationDefaultActionIdentifier"}
#[cfg(test)]mod tests{#[test]fn only_our_default_notification_click_opens_updates(){assert!(super::opens_updates("fershot-update","com.apple.UNNotificationDefaultActionIdentifier"));assert!(super::opens_updates("fershot-update-test","com.apple.UNNotificationDefaultActionIdentifier"));assert!(!super::opens_updates("fershot-update","com.apple.UNNotificationDismissActionIdentifier"));assert!(!super::opens_updates("unrelated","com.apple.UNNotificationDefaultActionIdentifier"));}}
