# نسخه‌های بومی — اندروید و ویندوز

دفتر من علاوه بر نسخهٔ وب، دو خروجی بومی هم دارد:

| خروجی | پوسته | فناوری | ساخته در |
|---|---|---|---|
| اندروید (APK) | WebView سیستمی + دارایی‌های جاسازی‌شده | [Capacitor 7](https://capacitorjs.com) | `.github/workflows/android.yml` |
| ویندوز (MSI/EXE) | WebView2 ویندوز | [Tauri 2](https://tauri.app) | `.github/workflows/windows.yml` |

هر دو پوسته **همان نسخهٔ وب** را اجرا می‌کنند — همان رابط، همان دفتر، همان
حساب کاربری. داده‌ها روی استقرار Convex می‌مانند؛ نصب بومی فقط یک پنجرهٔ
راحت‌تر و آیکونِ روی دستگاه است، نه یک دفتر جدا.

---

## اندروید — Capacitor

### یک‌بار در هر ماشین توسعه

پیش‌نیازها: **Java 21** (Temurin)، **Android Studio** (برای SDK و ابزارها)،
**bun** و یک دستگاه اندرویدی یا شبیه‌ساز.

```bash
bun install

# افزودن پوستهٔ بومی — پوشهٔ android/ ساخته می‌شود (یک بار)
bun x cap add android
```

پوشهٔ `android/` یک پروژهٔ Gradle مستقل است؛ آن را مثل کد بومی در گیت نگه
دارید (تنظیمات آیکون و نام بسته در آن ذخیره می‌شود).

### چرخهٔ روزمره

```bash
# ساخت خروجی وب + همگام‌سازی + اجرا روی دستگاه متصل
bun run cap:run:android

# فقط ساخت و sync (برای بازکردن در اندروید استودیو)
bun run cap:sync:android

# باز کردن پروژهٔ Gradle در Android Studio
bun run cap:open:android
```

### پیکربندی

- `capacitor.config.ts` — شناسهٔ بسته (`com.meysamijadi.daftaram`)،
  نام برنامه، رنگ پس‌زمینهٔ WebView و scheme.
- `android/app/src/main/res/` — آیکون‌ها (جای‌گزین `ic_launcher*` با خروجی
  Image Asset در Android Studio) و `strings.xml` برای نام نمایشی.
- امضای نسخهٔ انتشار: `android/key.properties` (در `.gitignore`) با
  `storeFile`، `storePassword`، `keyAlias`، `keyPassword` و تنظیم
  `signingConfigs` در `android/app/build.gradle`.

### ساخت APK

```bash
bun run cap:sync:android
cd android
./gradlew assembleDebug            # خروجی: app/build/outputs/apk/debug/
./gradlew assembleRelease          # با امضا — برای انتشار
```

### انتشار خودکار

هر پوش برچسب `vX.Y.Z` گردش‌کار `android.yml` را اجرا می‌کند: ساخت خروجی وب،
`cap sync`، ساخت APK دیباگ و پیوست به Release گیت‌هاب. برای APK امضاشده،
این رمزها را در Settings → Secrets اضافه کنید و گام `assembleRelease` را
فعال کنید:

| رمز | محتوا |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | فایل keystore با base64 |
| `ANDROID_KEYSTORE_PASSWORD` | گذرواژهٔ keystore |
| `ANDROID_KEY_ALIAS` | نام کلید |
| `ANDROID_KEY_PASSWORD` | گذرواژهٔ کلید |

---

## ویندوز — Tauri

### یک‌بار در هر ماشین توسعه

پیش‌نیازها: **Rust 1.77+** (هدف `x86_64-pc-windows-msvc`)، **Visual Studio
Build Tools** با workload «Desktop development with C++»، **WebView2**
(در ویندوز ۱۰/۱۱ به‌روز معمولاً حاضر است) و **bun**.

```bash
bun install

# اجرای برنامه در حالت توسعه (پنجرهٔ بومی با HMR)
bun run tauri:dev

# ساخت بستهٔ انتشار MSI + NSIS
bun run tauri:build
```

خروجی‌ها در `src-tauri/target/release/bundle/`:

```
msi/دفتر من_2.0.0_x64_en-US.msi
nsis/دفتر من_2.0.0_x64-setup.exe
```

### پیکربندی

- `src-tauri/tauri.conf.json` — نام و نسخهٔ محصول، اندازهٔ پنجره، مسیر
  `frontendDist` (خروجی Vite) و بسته‌بندی MSI/NSIS.
- `src-tauri/Cargo.toml` — وابستگی‌های Rust و بهینه‌سازی حجم باینری
  (`lto`، `strip`).
- آیکون‌ها در `src-tauri/icons/` — با فرمان زیر از لوگوی برنامه ساخته می‌شوند:
  ```bash
  bun x tauri icon public/logo.svg
  ```

### انتشار خودکار

هر پوش برچسب `vX.Y.Z` گردش‌کار `windows.yml` را اجرا می‌کند: کش Cargo، ساخت
MSI و NSIS و پیوست هر دو به Release گیت‌هاب. برای امضای کد، `certificateThumbprint`
را در `tauri.conf.json` تنظیم و رمز گواهی را به Secrets اضافه کنید.

---

## ساختار فایل‌های بومی

```
├── capacitor.config.ts        ← پیکربندی Capacitor (اندروید)
├── android/                   ← پروژهٔ Gradle (پس از cap add ساخته می‌شود)
├── src-tauri/
│   ├── Cargo.toml             ← مانیفست Rust
│   ├── tauri.conf.json        ← پیکربندی Tauri
│   ├── build.rs               ← اسکریپت ساخت
│   └── src/main.rs            ← نقطهٔ ورود پوسته
└── .github/workflows/
    ├── android.yml            ← ساخت APK پس از هر برچسب
    └── windows.yml            ← ساخت MSI/NSIS پس از هر برچسب
```

---

## پرسش‌های پرتکرار

**آیا نسخهٔ بومی داده را آفلاین نگه می‌دارد؟**
نه — هر دو پوسته همان بک‌اند ابری را صدا می‌زنند. برای آفلاین کامل،
راهکار PWA (سرویس‌ورکر + کش) مسیر آینده است و در نقشهٔ راه v2.2.0 است.

**آیا می‌توان APK را بدون گوگل‌پلی منتشر کرد؟**
بله — فایل APK مستقل است و به‌صورت مستقیم نصب می‌شود (Unknown sources).
برای انتشار گسترده، امضای release الزامی است.

**چرا MSI و NSIS هر دو؟**
MSI برای استقرار سازمانی و سیاست‌های گروهی؛ NSIS برای نصب سادهٔ کاربر
معمولی. هر دو از یک باینری ساخته می‌شوند.

**نسخهٔ مک و لینوکس؟**
پوستهٔ Tauri از هر دو پشتیبانی می‌کند؛ فقط `bundle.targets` را در
`tauri.conf.json` گسترش دهید (`dmg`, `appimage`, `deb`). گردش‌کارهای مک/لینوکس
می‌توانند به‌الگو از `windows.yml` ساخته شوند.
