fn main() {
    tauri_build::build();
    // Re-embed the frontend whenever `dist/` changes. Without this, cargo can
    // miss changes on WSL's /mnt/c (DrvFs) filesystem and ship a stale exe.
    println!("cargo:rerun-if-changed=../dist");
}
