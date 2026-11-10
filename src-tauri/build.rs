fn main() {
    let built = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
    println!("cargo:rustc-env=FERSHOT_BUILD_ID={built}");
    println!("cargo:rerun-if-changed=../src");
    tauri_build::build()
}
