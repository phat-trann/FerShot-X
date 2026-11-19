fn main() {
    let built = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
    println!("cargo:rustc-env=FERSHOT_BUILD_ID={built}");
    println!("cargo:rerun-if-changed=../src");
    #[cfg(target_os="macos")]
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref()==Ok("macos") {
        println!("cargo:rerun-if-changed=live-text");
        swift_rs::SwiftLinker::new("12.0").with_package("FerShotLiveText", "live-text").link();
        println!("cargo:rustc-link-arg=-Wl,-weak_framework,VisionKit");
        println!("cargo:rustc-link-arg=-Wl,-rpath,/usr/lib/swift");
    }
    tauri_build::build()
}
