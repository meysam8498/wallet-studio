#!/bin/sh
# ---------- دفتر من — نقطهٔ ورود تصویر داکر ----------
# آدرس بک‌اند Convex در زمان ساخت داخل فایل‌های JS پخته می‌شود؛ این اسکریپت
# در زمان اجرا آن را با مقدار VITE_CONVEX_URL کانتینر جایگزین می‌کند تا یک
# تصویر واحد روی هر بک‌اندی اجرا شود (بدون بازساخت).
set -e

HTML=/usr/share/nginx/html

if [ -n "$VITE_CONVEX_URL" ] && [ -f "$HTML/.baked-convex-url" ]; then
  BAKED=$(cat "$HTML/.baked-convex-url")
  if [ -n "$BAKED" ] && [ "$BAKED" != "$VITE_CONVEX_URL" ]; then
    echo "daftaram: rebinding backend -> $VITE_CONVEX_URL"
    # همتای WebSocket هر آدرس (https→wss و http→ws)
    WSS_BAKED=$(printf '%s' "$BAKED" | sed 's|^https:|wss:|; s|^http:|ws:|')
    WSS_NEW=$(printf '%s' "$VITE_CONVEX_URL" | sed 's|^https:|wss:|; s|^http:|ws:|')
    # جایگزینی در همهٔ فایل‌های JS به‌همراه نسخهٔ کدشدهٔ داخل رشته‌های URL
    grep -rl -e "$BAKED" -e "$WSS_BAKED" "$HTML/assets" 2>/dev/null | while read -r f; do
      sed -i -e "s|$BAKED|$VITE_CONVEX_URL|g" -e "s|$WSS_BAKED|$WSS_NEW|g" "$f"
    done
    grep -rl "$BAKED" "$HTML/assets" 2>/dev/null | while read -r f; do
      ENC=$(printf '%s' "$BAKED" | sed 's/\./\\\\./g; s/-/\\\\-/g')
      NEWENC=$(printf '%s' "$VITE_CONVEX_URL" | sed 's/\./\\\\./g; s/-/\\\\-/g')
      sed -i "s|$ENC|$NEWENC|g" "$f" || true
    done
  fi
fi

exec nginx -g "daemon off;"
