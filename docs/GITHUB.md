# راهنمای گیت و انتشار — دفتر من

این سند گردش‌کار کامل نسخه‌به‌نسخهٔ مخزن را توضیح می‌دهد: ساختار شاخه‌ها،
پیام‌های کامیت، چرخهٔ انتشار، برچسب‌گذاری، انتشار خودکار تصویر داکر و
Releaseهای گیت‌هاب.

تاریخچهٔ کامل تغییرات هر نسخه در [`docs/CHANGELOG.md`](./CHANGELOG.md) و در
خود برنامه (بخش «درباره و نسخه‌ها») نگهداری می‌شود. راهنمای داکری:
[`docs/DOCKER.md`](./DOCKER.md).

---

## فهرست

1. [ساختار مخزن](#ساختار-مخزن)
2. [گردش‌کار شاخه‌ها](#گردش‌کار-شاخه‌ها)
3. [پیام‌های کامیت](#پیام‌های-کامیت)
4. [چک سلامت پیش از انتشار](#چک-سلامت-پیش-از-انتشار)
5. [انتشار یک نسخهٔ تازه](#انتشار-یک-نسخه-تازه)
6. [CI و انتشار خودکار](#ci-و-انتشار-خودکار)
7. [رمزها و متغیرهای مخزن](#رمزها-و-متغیرهای-مخزن)
8. [نسخه‌به‌نسخه](#نسخه-به-نسخه)
9. [بازیابی و وضعیت‌های خاص](#بازیابی-و-وضعیت-های-خاص)
10. [قواعد و یادداشت‌ها](#قواعد-و-یادداشت-ها)

---

## ساختار مخزن

```
├── src/
│   ├── lib/version.ts      ← منبع یگانهٔ شمارهٔ نسخه و تاریخچهٔ تغییرات
│   ├── pages/About.tsx     ← صفحهٔ «درباره و نسخه‌ها» در خود برنامه
│   └── convex/             ← بک‌اند و پایگاه داده
├── docs/
│   ├── CHANGELOG.md        ← تاریخچهٔ تغییرات نسخه‌به‌نسخه
│   ├── DOCKER.md           ← راهنمای استقرار داکر
│   └── GITHUB.md           ← همین سند
├── .github/workflows/
│   ├── ci.yml              ← تایپ‌چک، لینت و ساخت در هر پوش
│   └── docker.yml          ← ساخت و انتشار تصویر پس از هر برچسب
├── Dockerfile              ← ساخت دو‌مرحله‌ای Node 22 + Nginx
├── nginx.conf              ← پیکربندی سرور ایستا
├── docker-compose.yml      ← اجرای تک‌فرمانی
└── .env.example            ← نمونهٔ متغیرهای محیطی
```

نکته: پوشهٔ `src/convex/_generated` در `.gitignore` است و با `bunx convex dev`
بازتولید می‌شود. برای تایپ‌چک بدون استقرار، استاب‌های محلی همان پوشه به‌کار
می‌روند (کامیت نمی‌شوند).

---

## گردش‌کار شاخه‌ها

| شاخه | نقش |
|---|---|
| `main` | همیشه پایدار و قابل‌انتشار؛ محافظت‌شده |
| `feat/<نام>` | توسعهٔ قابلیت تازه |
| `fix/<نام>` | رفع اشکال |
| `docs/<موضوع>` | تغییر مستندات فقط |

```bash
# چرخهٔ کار استاندارد
git switch main
git pull origin main
git switch -c feat/households
# … توسعه، کامیت‌های کوچک …
bun x tsc -b --noEmit && bun run lint   # پیش از هر پوش
git push -u origin feat/households
# سپس Pull Request به main — CI خودکار اجرا می‌شود
```

ادغام با «Merge commit» یا «Squash» بسته به اندازهٔ شاخه؛ برای شاخه‌های
کوچک squash توصیه می‌شود تا تاریخچهٔ `main` خطی بماند. پس از ادغام:

```bash
git switch main && git pull
git branch -d feat/households
git push origin --delete feat/households   # حذف شاخهٔ ریموت
```

---

## پیام‌های کامیت

قالب [Conventional Commits](https://www.conventionalcommits.org) با توضیح
فارسی:

```
feat: افزودن خانوار مشترک با دعوت کد‌محور
fix: اعمال دو سمت انتقال در محاسبهٔ موجودی حساب
docs: بازنویسی راهنمای داکر برای v2.0.0
chore: حذف وابستگی‌های بلااستفاده
refactor: مهاجرت ماژول‌های دفتر به رزولوشن مالکیت
release: v2.0.0
```

- سطر اول حداکثر ~۷۲ نویسه، فعل امری، بدون نقطهٔ پایان.
- اگر کامیت چند نوع تغییر دارد، نوعِ اثرگذارترین را برگزینید.
- کامیت `release:` فقط برای خودِ فرایند انتشار — بدون تغییر کد.

---

## چک سلامت پیش از انتشار

```bash
bun install                          # همگام‌سازی bun.lock پس از تغییر package.json
bun x tsc -b --noEmit                # تایپ‌چک کامل (پروژهٔ app + node)
bun run lint                         # سبک کد
VITE_CONVEX_URL="https://…" bun run build   # ساخت واقعی خروجی
```

برای استقرار بک‌اند و بازتولید تایپ‌های کامل:

```bash
bunx convex dev --once
```

هر سهٔ نخست باید بی‌خطا باشند؛ CI همین سه گام را روی هر Pull Request اجرا
می‌کند و پوش مستقیم به `main` بدون سبز‌بودن CI پذیرفته نمی‌شود.

---

## انتشار یک نسخهٔ تازه

### ۱. به‌روزرسانی منبع نسخه

- `src/lib/version.ts`: مقدار `VERSION`، `RELEASE_DATE` و مدخل تازهٔ `CHANGELOG`
  (نخستین عنصر آرایه = آخرین نسخه)
- `docs/CHANGELOG.md`: همان مدخل، با قالب Keep a Changelog
- `docs/DOCKER.md` و همین سند: بخش «نسخه‌به‌نسخه»
- `docker-compose.yml`: تگ تصویر
- `docs/GITHUB-ABOUT.txt` و `docs/DOCKER-HUB.md`: متن معرفی مخزن و صفحهٔ
  Docker Hub — همیشه هم‌نسخه با این فهرست به‌روز شوند تا توضیحات منتشرشده
  با نسخهٔ واقعی هم‌خوان بماند

### ۲. تأیید سلامت

بخش پیشین را کامل اجرا کنید.

### ۳. کامیت و برچسب

```bash
git switch main
git pull origin main
git add -A
git commit -m "release: v2.1.0"
git tag -a v2.1.0 -m "نسخهٔ 2.1.0 — هویت دفتر من، بستهٔ اندروید و توضیحات رجیستری"
git push origin main --follow-tags
```

`--follow-tags` برچسب‌های annotated را همراه شاخه می‌فرستد — این محرک
گردش‌کار داکر است.

### ۴. Release گیت‌هاب

گردش‌کار docker.yml خودش یک Release با یادداشت خودکار می‌سازد. برای ویرایش
متن: Releases → Draft منتشرشده → Edit — توضیح برگرفته از `CHANGELOG.md`.
اگر خروجی بومی (APK/exe) دارید، این چهار فایل را ضمیمه کنید:

- `Daftaram-X.Y.Z-android.apk` — نسخهٔ نسخه‌دار
- `Daftaram-X.Y.Z-windows-x64-setup.exe`
- `Daftaram-latest-android.apk` — **همیشه ضمیمه شود**: لینک همیشگی
  «آخرین نسخه» که دکمه‌های دانلود بخش «درباره» از آن استفاده می‌کنند
- `Daftaram-latest-windows-x64-setup.exe`

فایل‌های `-latest` با هر انتشار جایگزین می‌شوند و لینک
`releases/latest/download/…` همیشه به تازه‌ترین Release هدایت می‌کند.

### ۵. توضیحات رجیستری‌ها — همیشه با هر انتشار

توضیح کوتاه مخزن گیت‌هاب و صفحهٔ داکر هاب بخشی از مخزن است و باید همراه
هر نسخه به‌روز شود:

```bash
# ۱) متن‌ها را ویرایش کنید:
#    docs/GITHUB-ABOUT.txt   (توضیح کوتاه مخزن)
#    docs/DOCKER-HUB.md      (صفحهٔ کامل داکر هاب)
# ۲) اعمال در گیت‌هاب (توضیح + صفحهٔ اصلی):
gh api -X PATCH repos/meysam8498/wallet-studio \
  -f description="$(cat docs/GITHUB-ABOUT.txt)" \
  -f homepage="https://github.com/meysam8498/wallet-studio/releases/latest"
# ۳) متن داکر هاب را از docs/DOCKER-HUB.md در Description صفحهٔ Repository
#    کپی کنید (Docker Hub → repo → Description → Edit).
```

### ۶. تصویر داکر

خودکار در GHCR منتشر می‌شود:
`ghcr.io/meysam8498/daftaram:v2.2.1` و `:latest`.
راهنمای pull و اجرا: [`DOCKER.md`](./DOCKER.md#اجرای-محلی).

---

## CI و انتشار خودکار

| گردش‌کار | محرک | کار |
|---|---|---|
| `ci.yml` | پوش یا PR به `main` | تایپ‌چک، لینت، ساخت آزمایشی |
| `docker.yml` | پوش برچسب `v*.*.*` | ساخت، انتشار تصویر در GHCR، ساخت Release |
| `android.yml` | پوش برچسب `v*.*.*` | ساخت APK و پیوست به Release — [`NATIVE.md`](./NATIVE.md) |
| `windows.yml` | پوش برچسب `v*.*.*` | ساخت MSI/NSIS و پیوست به Release — [`NATIVE.md`](./NATIVE.md) |

قواعد پیشنهادی شاخهٔ `main` (Settings → Branches → Add rule):

- Require a pull request before merging — برای بازبینی
- Require status checks: `check` (از ci.yml)
- Require linear history — برای تاریخچهٔ خوانا

---

## رمزها و متغیرهای مخزن

Settings → Secrets and variables → Actions:

| نام | نوع | نقش |
|---|---|---|
| `VITE_CONVEX_URL` | Variable | آدرس بک‌اند؛ در ساخت تصویر جاسازی می‌شود |
| `CONVEX_DEPLOY_KEY` | Secret (اختیاری) | استقرار خودکار بک‌اند هنگام انتشار تصویر |
| `GITHUB_TOKEN` | Secret (خودکار) | ورود به GHCR و ساخت Release — دست‌نخورده بماند |

هیچ رمزی در مخزن کامیت نمی‌شود؛ پیکربندی حساس فقط از متغیرهای محیطی تزریق
می‌گردد. از نسخهٔ 2.2.0 هیچ کلید SMTP هم لازم نیست — ورود فقط ایمیل +
گذرواژه است.

---

## نسخه‌به‌نسخه

### v2.2.0 — ۱۴۰۵/۰۶/۲۳
- قابلیت‌ها: ورود با ایمیل + گذرواژه (هش Scrypt سمت بک‌اند) — حذف کامل
  SMTP/nodemailer؛ صفر تنظیمات برای همگام‌سازی چنددستگاهی
- فایل‌های کلیدی: `src/convex/auth.ts`، `src/pages/Auth.tsx`،
  `src/lib/version.ts`

### v2.0.0 — ۱۴۰۵/۰۶/۲۲
- قابلیت‌ها: خانوار مشترک (دعوت با کد، مدیریت اعضا، نشان ثبت‌کننده)؛
  ارسال کد ورود با SMTP مستقیم؛ حذف کامل سرویس‌های پلتفرم میزبان
- فایل‌های کلیدی: `src/convex/households.ts`، `src/convex/ownership.ts`،
  `src/convex/schema.ts` (جدول `households`، فیلد `createdBy`)،
  `src/components/HouseholdDialog.tsx`، `src/convex/auth/emailOtp.ts`،
  `.github/workflows/`، `Dockerfile`
- گردش‌کار پیشنهادی:
  ```bash
  git switch main
  git add -A
  git commit -m "release: v2.0.0"
  git tag -a v2.0.0 -m "نسخهٔ 2.0.0 — خانوار مشترک و زیرساخت انتشار"
  git push origin main --follow-tags
  ```
- تگ تصویر داکر: `ghcr.io/meysam8498/daftaram:v2.0.0`

### v1.4.0 — ۱۴۰۵/۰۶/۲۰
- قابلیت‌ها: پرداخت‌های تکراری با ثبت خودکار سرسید، پیوست تصویر رسید، تم تیره/روشن
- فایل‌های کلیدی: `src/convex/recurring.ts`، `src/convex/schema.ts` (جدول `subscriptions`،
  فیلد `receipt`)، `src/components/RecurringDialog.tsx`، `src/hooks/use-theme.ts`،
  `src/lib/receipt.ts`، `src/pages/Dashboard.tsx`، `src/pages/About.tsx`
- تگ تصویر داکر: `meysam8498/daftaram:1.4.0`

### v1.3.1 — ۱۴۰۴/۰۶/۲۰
- رفع خطای ساخت: تداخل نام `setBudget` در `Dashboard.tsx` (تغییر نام به `setBudgetInput`)
- بدون تغییر بک‌اند؛ برچسب پیشنهادی: `v1.3.1`

### v1.3.0 — ۱۴۰۴/۰۶/۱۹
- قابلیت‌ها: حساب‌ها، بودجه، طلب و بدهی، روند شش‌ماهه، جست‌وجو، CSV، واحد پولی
- افزودن صفحهٔ «درباره و نسخه‌ها» (`/about`) و نخستین `Dockerfile`

### v1.2.0 — ۱۴۰۴/۰۶/۱۲
- پارسی‌سازی کامل رابط، تقویم شمسی واقعی، اعداد فارسی، قلم Vazirmatn

### v1.1.0 — ۱۴۰۴/۰۶/۰۵
- بهبود چیدمان، اصلاح انتخاب رنگ دسته‌ها، رفع کرش حذف آخرین دسته

### v1.0.0 — ۱۴۰۴/۰۵/۲۹
- انتشار نخست: ثبت تراکنش، دسته‌بندی، نمودار دسته‌ها، همگام‌سازی زنده

---

## بازیابی و وضعیت‌های خاص

### برچسب اشتباه — پیش از انتشار

```bash
git tag -d v2.0.1                      # حذف محلی
git push origin :refs/tags/v2.0.1      # حذف ریموت (اگر فرستاده شده)
```

### بازگردانی نسخهٔ منتشرشدهٔ خراب

تصویر داکر نسخهٔ پیشین همیشه در رجیستری هست؛ سریع‌ترین واکنش:

```bash
docker pull ghcr.io/meysam8498/daftaram:v1.5.0   # یا تگ پیشین
docker rm -f daftar-web
docker run -d --name daftar-web -p 8080:80 \
  --restart unless-stopped ghcr.io/meysam8498/daftaram:v1.5.0
```

سپس در گیت:

```bash
git revert <sha>            # بازگردانی ایمن با کامیت تازه
# یا (آخر راه، تیم تک‌نفره، آگاهی کامل):
# git reset --hard v1.5.0 && git push --force-with-lease origin main
```

### فراموشی `--follow-tags`

برچسب روی ریموت نرفته و گردش‌کار داکر اجرا نشده؟ فقط دوباره بفرستید:

```bash
git push origin v2.0.0
```

### قفل‌شدن شاخهٔ محلی روی مخزن جابه‌جاشده

```bash
git fetch --prune
git reset --hard origin/main   # فقط وقتی کامیت‌های محلی مهم نیستند
```

---

## نقشهٔ راه نسخه‌های بعدی

| نسخه | محتوا |
|---|---|
| v2.1.0 | بازگردانی فایل JSON پشتیبان (restore کامل) |
| v2.2.0 | حالت آفلاین PWA و انتشار عمومی APK امضاشده |
| v3.0.0 | دعوت ایمیلی خودکار خانوار و دسترسی سطح‌بندی‌شده |

---

## یادداشت‌ها

- تاریخ نسخه‌ها با تقویم شمسی ثبت می‌شود تا با زبان برنامه یکدست باشد.
- هیچ اطلاعات محرمانه (کلید، توکن، آدرس خصوصی) در مخزن کامیت نمی‌شود؛
  پیکربندی حساس از طریق متغیرهای محیطی در زمان ساخت تزریق می‌گردد.
- پروژه هیچ وابستگی به سرویس یا پلتفرم میزبانی اپ ندارد؛ مخزن مستقل است و
  روی هر گیت‌هابی (یا حتی گیت سرور خصوصی) قابل انتشار.
