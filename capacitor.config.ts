import type { CapacitorConfig } from "@capacitor/cli";

/**
 * پیکربندی Capacitor — پوستهٔ بومی اندروید (و در آیندهٔ نزدیک iOS).
 *
 * سرور زندهٔ توسعه: در حالت `bun run dev` برنامه از Vite با HMR سرو می‌شود و
 * WebView اندروید به همان آدرس وصل می‌شود (server.url). در بستهٔ نهایی
 * (release) فایل‌های dist/ داخل APK جاسازی می‌شوند.
 */
const config: CapacitorConfig = {
  appId: "com.meysamijadi.daftaram",
  appName: "دفتر من",
  webDir: "dist",
  // Android WebView پشتیبانی داخلی از RTL دارد؛ نیازی به تنظیم خاصی نیست.
  android: {
    // ترکیب رنگ نوار وضعیت با تم برنامه
    backgroundColor: "#FBFAF7",
    allowMixedContent: false,
  },
  server: {
    // اجازهٔ اتصال WebView به استقرار Convex (https)
    androidScheme: "https",
  },
};

export default config;
