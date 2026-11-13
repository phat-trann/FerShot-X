//! Pure activation policy; never touches native windows or user permissions.
use std::time::{Duration,Instant};
pub struct ReopenPolicy { settings_until: Option<Instant> }
impl ReopenPolicy {
 pub const fn new()->Self{Self{settings_until:None}}
 pub fn prefer_settings(&mut self,now:Instant){self.settings_until=Some(now+Duration::from_secs(5));}
 pub fn clear_settings(&mut self){self.settings_until=None;}
 pub fn should_open_library(&mut self,now:Instant,has_visible_windows:bool)->bool{
  if self.settings_until.is_some_and(|until|now>=until){self.settings_until=None;}
  !has_visible_windows&&self.settings_until.is_none()
 }
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn visible_settings_editor_or_library_never_triggers_library_reopen(){let mut p=ReopenPolicy::new();assert!(!p.should_open_library(Instant::now(),true));}
 #[test]fn notification_intent_covers_reopen_before_and_after_settings_show(){let now=Instant::now();let mut p=ReopenPolicy::new();p.prefer_settings(now);assert!(!p.should_open_library(now,false));assert!(!p.should_open_library(now+Duration::from_millis(200),true));assert!(!p.should_open_library(now+Duration::from_secs(1),false));}
 #[test]fn ordinary_reopen_returns_after_expiry_or_settings_close(){let now=Instant::now();let mut p=ReopenPolicy::new();assert!(p.should_open_library(now,false));p.prefer_settings(now);assert!(p.should_open_library(now+Duration::from_secs(5),false));p.prefer_settings(now+Duration::from_secs(6));p.clear_settings();assert!(p.should_open_library(now+Duration::from_secs(6),false));}
}
