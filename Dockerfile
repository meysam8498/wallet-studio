# ---------- مرحلهٔ ساخت ----------
# Node 22 LTS — همان نسخه‌ای که CI استفاده می‌کند تا ساخت محلی و ابری یکدست باشد.
FROM node:22-alpine AS build
WORKDIR /app

# نصب وابستگی‌ها با bun (قفل نسخهٔ bun.lock) — لایهٔ کش‌شونده
# رجیستری npm.js در برخی شبکه‌ها فیلتر است؛ mirror باز را پیش‌فرض می‌کنیم
# (در CI گیت‌هاب هم همین mirror بدون مشکل پاسخ می‌دهد).
COPY package.json bun.lock ./
RUN npm config set registry https://registry.npmmirror.com \
  && npm install -g bun@1 \
  && bun install --frozen-lockfile

# ساخت خروجی ایستا — VITE_CONVEX_URL در زمان build تزریق می‌شود
COPY . .
ARG VITE_CONVEX_URL=https://replace-me.convex.cloud
ENV VITE_CONVEX_URL=$VITE_CONVEX_URL
RUN bun run build

# آدرس پخته‌شده را برای جایگزینی در زمان اجرا ذخیره می‌کنیم
# (مستقیم از ARG — تا با رشته‌های نمونهٔ داخل کتابخانه‌ها اشتباه نشود)
RUN echo -n "$VITE_CONVEX_URL" > dist/.baked-convex-url

# ---------- مرحلهٔ اجرا ----------
FROM nginx:1.27-alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/.baked-convex-url /usr/share/nginx/html/.baked-convex-url
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 80

# بررسی سلامت هر ۳۰ ثانیه
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

# جایگزینی آدرس بک‌اند در زمان اجرا (در صورت ست‌بودن VITE_CONVEX_URL) و اجرای nginx
ENTRYPOINT ["/docker-entrypoint.sh"]
