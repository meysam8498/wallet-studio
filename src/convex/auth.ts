// پیکربندی مرکزی احراز هویت برنامه (ایمیل + گذرواژه + مهمان) — v2.2.0
//
// از این نسخه ورود با «ایمیل + گذرواژه» انجام می‌شود؛ هیچ سرویس ایمیل یا
// SMTP در کار نیست و هیچ تنظیمی لازم نیست. گذرواژه‌ها با Scrypt در خود
// بک‌اند (رایگان Convex Cloud) هش می‌شوند و هرگز خام ذخیره نمی‌شوند.
// داده‌ها هم روی همان استقرار ابری رایگان می‌مانند و همهٔ دستگاه‌ها با یک
// حساب واحد دفتر یکسانی می‌بینند.

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Password } from "@convex-dev/auth/providers/Password";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    // بدون گزینهٔ verify: نیازی به تأیید ایمیل نیست — صفر وابستگی خارجی
    Password(),
    Anonymous,
  ],
});