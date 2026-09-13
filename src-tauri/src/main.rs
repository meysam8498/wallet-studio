// دفتر استودیو — پوستهٔ دسکتاپ (ویندوز/مک/لینوکس) بر پایهٔ Tauri
// محتوای برنامه خروجی ایستای Vite است که در WebView سیستم اجرا می‌شود.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("خطا در اجرای پوستهٔ دسکتاپ دفتر من");
}
