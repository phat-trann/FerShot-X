//! Native-only generic-password storage. Secrets never appear in command arguments or settings JSON.
use crate::imaging::NativeError;
#[cfg(target_os = "macos")]
mod mac {
    use super::*;
    use std::{ffi::c_void, ptr};
    #[link(name = "Security", kind = "framework")]
    unsafe extern "C" {
        fn SecKeychainFindGenericPassword(keychain: *const c_void, service_len: u32, service: *const u8, account_len: u32, account: *const u8, length: *mut u32, data: *mut *mut c_void, item: *mut *mut c_void) -> i32;
        fn SecKeychainAddGenericPassword(keychain: *const c_void, service_len: u32, service: *const u8, account_len: u32, account: *const u8, length: u32, data: *const c_void, item: *mut *mut c_void) -> i32;
        fn SecKeychainItemModifyAttributesAndData(item: *mut c_void, attributes: *const c_void, length: u32, data: *const c_void) -> i32;
        fn SecKeychainItemFreeContent(attributes: *mut c_void, data: *mut c_void) -> i32;
    }
    #[link(name = "CoreFoundation", kind = "framework")]
    unsafe extern "C" { fn CFRelease(value: *const c_void); }
    pub fn get(service: &[u8], account: &str) -> Result<String, NativeError> {
        let mut length = 0; let mut data = ptr::null_mut();
        let code = unsafe { SecKeychainFindGenericPassword(ptr::null(), service.len() as u32, service.as_ptr(), account.len() as u32, account.as_ptr(), &mut length, &mut data, ptr::null_mut()) };
        if code != 0 { return Err(NativeError::new("ftp_credentials", "FTP password is unavailable in Keychain. Save it again in FTP settings.")); }
        let secret = if length > 4096 { Err(NativeError::new("ftp_credentials", "Stored password exceeds supported bounds.")) } else if length == 0 { Ok(String::new()) } else if data.is_null() { Err(NativeError::new("ftp_credentials", "Keychain returned invalid password data.")) } else {
            String::from_utf8(unsafe { std::slice::from_raw_parts(data.cast::<u8>(), length as usize) }.to_vec()).map_err(|_| NativeError::new("ftp_credentials", "Keychain password is not valid text."))
        };
        unsafe { SecKeychainItemFreeContent(ptr::null_mut(), data); } secret
    }
    pub fn set(service: &[u8], account: &str, password: &str) -> Result<(), NativeError> {
        let mut item = ptr::null_mut();
        let found = unsafe { SecKeychainFindGenericPassword(ptr::null(), service.len() as u32, service.as_ptr(), account.len() as u32, account.as_ptr(), ptr::null_mut(), ptr::null_mut(), &mut item) };
        let code = if found == 0 {
            let result = unsafe { SecKeychainItemModifyAttributesAndData(item, ptr::null(), password.len() as u32, password.as_ptr().cast()) };
            unsafe { CFRelease(item); } result
        } else if found == -25300 {
            unsafe { SecKeychainAddGenericPassword(ptr::null(), service.len() as u32, service.as_ptr(), account.len() as u32, account.as_ptr(), password.len() as u32, password.as_ptr().cast(), ptr::null_mut()) }
        } else { found };
        if code != 0 { return Err(NativeError::new("ftp_credentials", "Could not save FTP password in Keychain.")); } Ok(())
    }
}
pub fn get(account: &str) -> Result<String, NativeError> {
    #[cfg(target_os = "macos")] { mac::get(b"dev.fershot.x.ftp.v1", account) }
    #[cfg(not(target_os = "macos"))] { let _ = account; Err(NativeError::new("unsupported", "FTP credential storage currently requires macOS.")) }
}
pub fn set(account: &str, password: &str) -> Result<(), NativeError> {
    #[cfg(target_os = "macos")] { mac::set(b"dev.fershot.x.ftp.v1", account, password) }
    #[cfg(not(target_os = "macos"))] { let _ = (account,password); Err(NativeError::new("unsupported", "FTP credential storage currently requires macOS.")) }
}


pub fn legacy_http(account:&str)->Result<String,NativeError>{
 #[cfg(target_os="macos")] {mac::get(b"FerbyFTP",account)}
 #[cfg(not(target_os="macos"))] {let _=account;Err(NativeError::new("unsupported","Keychain requires macOS."))}
}
