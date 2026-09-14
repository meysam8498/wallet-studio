# استقرار با داکر — دفتر من

این سند راهنمای کامل بسته‌بندی، اجرا، انتشار و نگهداری برنامه با داکر است —
از نخستین اجرای محلی تا انتشار عمومی تصویر در رجیستری.

> پشتیبانی داکر از **نسخهٔ 1.3.0** آغاز شده و از **نسخهٔ 2.0.0** با
> گردش‌کار انتشار خودکار گیت‌هاب (`.github/workflows/docker.yml`) یکپارچه شده است.

---

## فهرست

1. [معماری](#معماری)
2. [پیش‌نیازها](#پیش‌نیازها)
3. [ساخت تصویر](#ساخت-تصویر)
4. [اجرای محلی](#اجرای-محلی)
5. [اجرای با docker compose](#اجرای-با-docker-compose)
6. [انتشار تصویر در رجیستری](#انتشار-تصویر-در-رجیستری)
7. [انتشار خودکار با گیت‌هاب اکشنز](#انتشار-خودکار-با-گیت‌هاب-اکشنز)
8. [پیکربندی Nginx](#پیکربندی-nginx)
9. [نگهداری و به‌روزرسانی](#نگهداری-و-به‌روزرسانی)
10. [عیب‌یابی](#عیب‌یابی)
11. [نسخه‌به‌نسخه](#نسخه‌به-نسخه)

---

## معماری

برنامه از دو بخش تشکیل شده:

| بخش | اجرا | تصویر داکر |
|---|---|---|
| رابط کاربری (Vite + React) | فایل‌های ایستا، سرو توسط Nginx | `ghcr.io/meysam8498/daftaram` |
| بک‌اند و پایگاه داده | سرویس ابری Convex (خارج از کانتینر) | — |

چرا بک‌اند داخل کانتینر نیست؟ دفتر من از همگام‌سازی زنده و احراز هویت
مدیریت‌شدهٔ Convex استفاده می‌کند؛ این سرویس بدون نگهداری سرور پایگاه داده و
وظایف زمان‌بندی‌شده کار می‌کند. کانتینر داکر تنها یک «شِل ایستا» است: هر
دستگاهی که آدرس بک‌اند را داشته باشد مستقیماً به همان دفتر وصل می‌شود.

پیش‌نیاز داده‌ای: آدرس بک‌اند باید در متغیر `VITE_CONVEX_URL` ثبت شود —
دو راه دارید:

- **تصویر منتشرشده (پیشنهادی):** هنگام اجرا بدهید؛ نیازی به بازساخت نیست.
  اسکریپت ورود تصویر، آدرس پخته‌شده را در لحظهٔ بالا آمدن کانتینر با مقدار
  `VITE_CONVEX_URL` شما جایگزین می‌کند:
  ```bash
  docker run -d -p 8080:80 -e VITE_CONVEX_URL="https://<YOUR-CONVEX>.convex.cloud" \
    meysam8498/daftaram:latest
  ```
- **ساخت محلی:** با `--build-arg VITE_CONVEX_URL=…` در زمان build جاسازی
  می‌شود (بخش «ساخت تصویر»).

---

## پیش‌نیازها

- **داکر** 24 یا بالاتر (شامل `docker buildx`)
- **آدرس استقرار Convex** — اگر هنوز استقراری نساخته‌اید:
  ```bash
  bun install
  bunx convex dev          # نخستین اجرا: ساخت پروژه و استقرار
  # آدرس https://<YOUR-CONVEX>.convex.cloud را یادداشت کنید
  ```
- برای انتشار در رجیستری: یک حساب [GHCR](https://ghcr.io) (همان حساب گیت‌هاب)
  یا Docker Hub.

---

## ساخت تصویر

ساخت دو‌مرحله‌ای است:

1. **مرحلهٔ build** — Node 22 LTS (همان نسخهٔ CI) + bun برای نصب دقیق
   وابستگی‌ها از `bun.lock`؛ خروجی در `dist/` ساخته می‌شود.
2. **مرحلهٔ runtime** — `nginx:1.27-alpine` با پیکربندی SPA و healthcheck.

```bash
# ساخت با آدرس بک‌اند
docker build \
  --build-arg VITE_CONVEX_URL="https://<YOUR-CONVEX>.convex.cloud" \
  -t meysam8498/daftaram:2.3.0 \
  -t meysam8498/daftaram:latest \
  .

# بررسی تصویر
docker images | grep daftaram
docker inspect meysam8498/daftaram:2.3.0 --format '{{.Config.Healthcheck}}'
```

نکته‌ها:

- حداکثر حجم تصویر حدود **۴۰ مگابایت** است؛ بیشتر آن Nginx است.
- `--build-arg VITE_CONVEX_URL` الزامی است؛ بدون آن برنامه ساخته می‌شود ولی
  در زمان اجرا «آدرس بک‌اند تنظیم نشده» نشان می‌دهد.
- برای ساخت بدون کش لایه‌ها (مثلاً پس از تغییر قلم یا فونت):
  `docker build --no-cache …`

---

## اجرای محلی

```bash
docker run -d \
  --name daftar-web \
  -p 8080:80 \
  --restart unless-stopped \
  meysam8498/daftaram:2.3.0

# بررسی سلامت
docker ps --filter name=daftar-web
curl -I http://localhost:8080
```

برنامه روی `http://localhost:8080` در دسترس است.

- پورت میزبان را با `-p <PORT>:80` تغییر دهید؛ پورت کانتینر همیشه ۸۰ است.
- برای اجرای موقت (پس از توقف خودکار حذف می‌شود) `--rm` اضافه کنید.
- برای دیدن لاگ‌ها: `docker logs -f daftar-web`

---

## اجرای با docker compose

فایل `docker-compose.yml` در ریشهٔ مخزن:

```yaml
services:
  web:
    image: ghcr.io/meysam8498/daftaram:2.3.0   # یا ساخت محلی با build
    build:
      context: .
      args:
        VITE_CONVEX_URL: ${VITE_CONVEX_URL}
    ports:
      - "8080:80"
    restart: unless-stopped
```

اجرا:

```bash
# مقدار VITE_CONVEX_URL را در .env.local یا خط فرمان بدهید
export VITE_CONVEX_URL="https://<YOUR-CONVEX>.convex.cloud"

docker compose up -d --build
docker compose logs -f web
docker compose down        # توقف و حذف کانتینر
```

`restart: unless-stopped` یعنی کانتینر پس از ریبوت سرور هم بالا می‌آید مگر
خودتان با `docker stop` متوقفش کنید.

---

## انتشار تصویر در رجیستری

### گیت‌هاب کانتینر رجیستری (GHCR) — پیش‌فرض

```bash
# ورود با توکن دسترسی (scope: write:packages)
echo "<PAT>" | docker login ghcr.io -u meysam8498 --password-stdin

# تگ‌گذاری
docker tag meysam8498/daftaram:2.3.0 ghcr.io/meysam8498/daftaram:2.3.0
docker tag meysam8498/daftaram:2.3.0 ghcr.io/meysam8498/daftaram:latest

# انتشار
docker push ghcr.io/meysam8498/daftaram:2.3.0
docker push ghcr.io/meysam8498/daftaram:latest
```

تصویر منتشرشده در صفحهٔ پکیج‌های گیت‌هاب قابل مشاهده است؛ پیش‌فرض **خصوصی**
است و از مسیر Package settings → Danger Zone → Change visibility عمومی می‌شود.

### داکر هاب

```bash
docker login
docker tag meysam8498/daftaram:2.3.0 meysam8498/daftaram:2.3.0
docker push meysam8498/daftaram:2.3.0
```

برای استفاده از داکر هاب در `docker-compose.yml` مقدار `image` را به
`meysam8498/daftaram:2.3.0` تغییر دهید.

---

## انتشار خودکار با گیت‌هاب اکشنز

از نسخهٔ 2.0.0، هر بار که برچسب `vX.Y.Z` را push کنید، گردش‌کار
`.github/workflows/docker.yml` این‌ها را انجام می‌دهد:

1. ساخت تصویر با همان `VITE_CONVEX_URL` که در **Repository variables** ثبت شده
2. ورود به GHCR با `GITHUB_TOKEN` (بدون نیاز به PAT)
3. انتشار دو تگ: `vX.Y.Z` و `latest`
4. ساخت یک Release با یادداشت خودکار و فرمان `docker pull`

پیکربندی یک‌باره در مخزن:

- **Settings → Secrets and variables → Actions → Variables**: متغیر
  `VITE_CONVEX_URL` با مقدار آدرس استقرار Convex.
- (اختیاری) **Secrets**: `CONVEX_DEPLOY_KEY` برای استقرار خودکار بک‌اند
  همراه با ساخت تصویر — اگر خالی بماند فقط فرانت‌اند منتشر می‌شود.

راهنمای ساخت برچسب و چرخهٔ انتشار کامل: [`GITHUB.md`](./GITHUB.md).

---

## پیکربندی Nginx

`nginx.conf` به‌صورت پیش‌فرض همراه تصویر کپی می‌شود:

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # مسیرهای SPA — همه به index.html
  location / {
    try_files $uri $uri/ /index.html;
  }

  # کش بلندمدت برای فایل‌های هش‌دار
  location /assets/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }

  # فایل‌های حساس
  location ~ /\.(env|git) {
    deny all;
  }

  gzip on;
  gzip_types text/css application/javascript application/json image/svg+xml;
}
```

### پیکربندی سفارشی (TLS، پراکسی معکوس، زیرمسیر)

برای نسخهٔ سفارشی، `nginx.conf` را ویرایش و تصویر را دوباره بسازید؛ یا فایل
را هنگام اجرا سوار کنید:

```bash
docker run -d \
  --name daftar-web \
  -p 443:443 \
  -v /srv/daftar/nginx.conf:/etc/nginx/conf.d/default.conf:ro \
  -v /srv/daftar/certs:/etc/nginx/certs:ro \
  --restart unless-stopped \
  meysam8498/daftaram:2.3.0
```

معمار پیشنهادی پشت پروکسی معکوس (Caddy یا Traefik با TLS خودکار):

```bash
docker run -d --name daftar-web \
  -p 127.0.0.1:8080:80 --restart unless-stopped \
  meysam8498/daftaram:2.3.0
# Caddyfile:
#   daftar.example.com {
#     reverse_proxy 127.0.0.1:8080
#   }
```

نکته: اگر برنامه را روی **زیرمسیر** (مثل `example.com/daftar/`) سرو می‌کنید،
`vite.config.ts` را با `base: "/daftar/"` بسازید و `location /` در Nginx را
هم‌راستا کنید.

---

## نگهداری و به‌روزرسانی

```bash
# توقف و حذف
docker rm -f daftar-web

# به‌روزرسانی به نسخهٔ تازه
docker pull ghcr.io/meysam8498/daftaram:2.3.0
docker rm -f daftar-web
docker run -d --name daftar-web -p 8080:80 \
  --restart unless-stopped \
  ghcr.io/meysam8498/daftaram:2.3.0

# پاک‌سازی تصاویر قدیمی و لایه‌های بلااستفاده
docker image prune -f
docker system df        # مصرف دیسک داکر
```

با `docker compose` همهٔ این‌ها ساده‌تر است:

```bash
docker compose pull     # دریافت نسخهٔ تازه
docker compose up -d    # بازسازی کانتینر با تصویر تازه
```

---

## عیب‌یابی

| نشانی | علت محتمل | راه‌حل |
|---|---|---|
| «آدرس بک‌اند تنظیم نشده» در مرورگر | `VITE_CONVEX_URL` در زمان build داده نشده | تصویر را با `--build-arg` دوباره بسازید |
| صفحهٔ سفید پس از اجرا | مسیر `base` ناهم‌خوان با زیرمسیر Nginx | `base` را در `vite.config.ts` تنظیم و دوباره بسازید |
| 404 در مسیرهایی مثل `/dashboard` | `try_files` SPA فعال نیست | `nginx.conf` سفارشی را بررسی کنید |
| «ایمیل یا گذرواژه نادرست است» | حساب ساخته نشده یا گذرواژهٔ اشتباه | ابتدا از حالت «ساخت حساب» استفاده کنید |
| کانتینر بی‌درنگ می‌افتد | خطای نگاشت پورت یا Nginx | `docker logs daftar-web` را ببینید |
| `healthcheck: unhealthy` | وب‌سرور پاسخ نمی‌دهد | `docker exec daftar-web wget -qO- http://localhost/` |

لاگ زنده: `docker logs -f daftar-web` — خطاهای Nginx در `stderr` و
دسترسی‌ها در `stdout` دیده می‌شود.

---

## نسخه‌به‌نسخه

### v2.0.0 — خانوار مشترک و انتشار خودکار
- گردش‌کار انتشار خودکار تصویر پس از هر برچسب (`.github/workflows/docker.yml`)
- انتشار روی GHCR با تگ‌های `vX.Y.Z` و `latest` و Release خودکار
- `Dockerfile` به Node 22 LTS مهاجرت کرد تا با CI یکدست باشد (bun همچنان
  برای نصب وابستگی‌ها به‌کار می‌رود)
- `docker-compose.yml` به تگ `2.0.0` به‌روزرسانی شد
- بخش‌های تازه: انتشار در رجیستری، پیکربندی سفارشی Nginx، عیب‌یابی

### v1.4.0 — پرداخت‌های تکراری، رسید تصویری و تم تیره
- بدون تغییر در Dockerfile و nginx.conf؛ همان ساخت دو‌مرحله‌ای Bun → Nginx
- تگ پیشنهادی تصویر: `meysam8498/daftaram:1.4.0`
- حجم تصویر با پیوست‌های رسید تغییر نمی‌کند — رسیدها در پایگاه داده ذخیره می‌شوند

### v1.3.1 — پایداری ساخت
- بدون تغییر در Dockerfile و nginx.conf؛ پیکربندی نسخهٔ 1.3.0 عیناً حفظ شد
- تگ پیشنهادی تصویر: `meysam8498/daftaram:1.3.1` (محتوای اپ تازه‌سازی شد)

### v1.3.0 — نخستین نسخهٔ داکری
- افزودن `Dockerfile` دو‌مرحله‌ای (Bun برای ساخت، Nginx برای اجرا)
- افزودن `nginx.conf` با پشتیبانی SPA و کش بلندمدت
- خروجی نهایی حدود ۳۰ مگابایت؛ راه‌اندازی زیر یک ثانیه

### نسخه‌های بعدی
- [ ] v2.1.0 — برگرداندن دادهٔ JSON پشتیبان (بازگردانی کامل)
- [ ] v2.3.0 — حالت آفلاین PWA (سرویس‌ورکر + کش)

خروجی‌های بومی (اندروید و ویندوز) گردش‌کار داکری خودشان را دارند:
[`NATIVE.md`](./NATIVE.md).
