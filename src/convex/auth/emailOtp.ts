import { Email } from "@convex-dev/auth/providers/Email";
import type { GenericActionCtxWithAuthConfig } from "@convex-dev/auth/server";
import type { GenericDataModel } from "convex/server";
import { internal } from "../_generated/api";

/**
 * ارسال کد یک‌بارمصرف ورود با ایمیل — مستقل از هر سرویس واسط پلتفرمی.
 *
 * نامه از سرور SMTP خودتان فرستاده می‌شود؛ چون nodemailer فقط در محیط Node
 * اجرا می‌شود، ارسال به اکشن داخلی «sendOtpEmail» (فایل sendOtpEmail.ts با
 * دستور "use node") واگذار می‌گردد. این تابع در بافتِ اکشنِ signIn اجرا
 * می‌شود، پس فراخوانی runAction مجاز است.
 *
 * متغیرهای محیطی (در داشبورد Convex → Settings → Environment Variables):
 *   SMTP_HOST     — سرور ایمیل (مثلاً mail.example.com)
 *   SMTP_PORT     — پورت (۴۶۵ برای SSL، ۵۸۷ برای STARTTLS)
 *   SMTP_USER     — نام کاربری
 *   SMTP_PASSWORD — گذرواژه
 *   OTP_FROM      — فرستنده، مثل: "دفتر من <no-reply@example.com>"
 */

/** پارامترهایی که برای ارسال نامه لازم داریم. */
type VerificationRequestArgs = {
  identifier: string;
  token: string;
};

async function sendVerificationRequest(
  { identifier: email, token }: VerificationRequestArgs,
  ctx: GenericActionCtxWithAuthConfig<GenericDataModel>,
): Promise<void> {
  await ctx.runAction(internal.auth.sendOtpEmail.sendOtpEmail, {
    to: email,
    token,
  });
}

export const emailOtp = Email({
  id: "email-otp",
  maxAge: 60 * 15, // ۱۵ دقیقه
  async generateVerificationToken() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },
  // در زمان اجرا، پارامتر دوم (ctx بافت اکشن) نیز پاس داده می‌شود؛ امضای
  // عمومیِ نوع فقط پارامتر اول را تعریف می‌کند، پس اینجا تبدیل نوع داریم.
  sendVerificationRequest:
    sendVerificationRequest as unknown as (
      params: VerificationRequestArgs,
    ) => Promise<void>,
});
