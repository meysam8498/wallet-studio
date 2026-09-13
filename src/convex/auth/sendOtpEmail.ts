"use node";
/**
 * ارسال نامهٔ کد ورود — محیط Node (تنها جایی که nodemailer کار می‌کند).
 *
 * متغیرهای محیطی استقرار (داشبورد Convex → Settings → Environment Variables):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, OTP_FROM
 */
import nodemailer from "nodemailer";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";

export const sendOtpEmail = internalAction({
  args: {
    to: v.string(),
    token: v.string(),
  },
  handler: async (_, { to, token }) => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;
    const from = process.env.OTP_FROM ?? "دفتر من <no-reply@localhost>";

    if (!host || !user || !pass) {
      // فقط در استقرار محلی: بدون SMTP، کد در کنسول بک‌اند چاپ می‌شود تا
      // بتوان جریان ورود را آزمود. در محیط واقعی خطا می‌دهیم تا نامه‌ای
      // بی‌صدا گم نشود.
      const cloudUrl = process.env.CONVEX_CLOUD_URL ?? "";
      const isLocalBackend = /127\.0\.0\.1|localhost/.test(cloudUrl);
      if (isLocalBackend) {
        console.log(
          `[DEV] SMTP تنظیم نشده — کد ورود برای ${to}: ${token}`,
        );
        return { sent: false as const, devLogged: true as const };
      }
      throw new Error(
        "پیکربندی SMTP ناقص است — SMTP_HOST، SMTP_USER و SMTP_PASSWORD را در متغیرهای محیطی استقرار تنظیم کنید",
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    await transporter.sendMail({
      from,
      to,
      subject: `کد ورود دفتر من: ${token}`,
      text: `کد ورود شما: ${token}\n\nاین کد تا ۱۵ دقیقه اعتبار دارد.\nاگر شما درخواست نداده‌اید، این نامه را نادیده بگیرید.`,
      html: `<div style="font-family:Vazirmatn,Tahoma,sans-serif;direction:rtl;text-align:right;padding:24px">
  <h2 style="margin:0 0 12px">ورود به دفتر من</h2>
  <p style="color:#555;margin:0 0 16px">کد یک‌بارمصرف شما:</p>
  <p style="font-size:32px;letter-spacing:8px;font-weight:700;margin:0 0 16px">${token}</p>
  <p style="color:#888;font-size:13px">این کد تا ۱۵ دقیقه اعتبار دارد. اگر شما درخواست نداده‌اید، این نامه را نادیده بگیرید.</p>
</div>`,
    });

    return { sent: true as const };
  },
});
