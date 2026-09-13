حسابداری شخصی «دفتر من» — تقویم شمسی · همگام‌سازی زنده میان دستگاه‌ها · خانوار مشترک

ورود با کد یک‌بارمصرف ایمیلی (SMTP خودتان) — بدون هیچ سرویس واسط.

▌راه‌اندازی سریع

1) بک‌اند Convex را آماده کنید (رایگان):
   npx convex dev            # اولین بار: ورود و ساخت پروژه
   npx convex env set OTP_FROM "دفتر من"
   # متغیرهای SMTP هم در همان جا ست می‌شوند: SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD

2) آدرس بک‌اند را از خروجی دستور بالا بردارید (مثل https://…….convex.cloud)

3) اجرا:

   docker run -d --name daftaram \
     -p 8080:80 \
     --restart unless-stopped \
     -e VITE_CONVEX_URL="https://glorious-panda-581.convex.cloud" \
     meysam8498/daftaram:latest

   سپس http://localhost:8080 را باز کنید.

▌docker-compose.yml

services:
  web:
    image: meysam8498/daftaram:latest
    ports: ["8080:80"]
    restart: unless-stopped
    environment:
      VITE_CONVEX_URL: https://glorious-panda-581.convex.cloud

▌نکته‌ها

• VITE_CONVEX_URL در زمان build/اجرای کانتینر تزریق می‌شود؛ همهٔ دستگاه‌هایی
  که همین آدرس را داشته باشند، با یک حساب، دادهٔ یکسان و زنده می‌بینند.
• نسخه‌های تگ‌شده: meysam8498/daftaram:2.1.0
• راهنمای کامل (TLS، reverse proxy، انتشار): docs/DOCKER.md در مخزن گیت‌هاب
• سازنده: میثم ایجادی — M.Ijadi@Hotmail.com — GitHub/Docker: meysam8498

The version tags on Docker Hub always match the releases on GitHub (vX.Y.Z),
and the app's own "About" page (route /about) shows the same version number.
