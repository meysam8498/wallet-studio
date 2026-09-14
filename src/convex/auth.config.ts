import type { AuthConfig } from "convex/server";

// احراز هویت برنامه: ارائه‌دهندهٔ استاندارد Convex Auth برای ورود با
// ایمیل + گذرواژه و مهمان (src/convex/auth.ts) — بدون هیچ سرویس ایمیل.
// توکن‌ها توسط خود استقرار صادر می‌شوند (iss = CONVEX_SITE_URL) و از طریق
// مسیرهای OIDC که auth.addHttpRoutes() در convex/http.ts ثبت می‌کند
// اعتبارسنجی می‌شوند. این مدخل نباید به «customJwt» تبدیل شود؛ مسیر
// customJwt توکن بدون هدر `kid` را نمی‌پذیرد و ورود بی‌صدا شکست می‌خورد.
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
