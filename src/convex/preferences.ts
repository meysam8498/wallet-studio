import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

/**
 * ترجیحات دستگاه — v2.6.0
 *
 * چیدمان کارت‌های داشبورد (ترتیب و پنهان‌سازی) در یک سندِ به‌ازای هر کاربر
 * نگهداری می‌شود تا روی همهٔ دستگاه‌های همان کاربر — ویندوز، اندروید و وب —
 * یکسان دیده شود. برخلاف داده‌های دفتر، این ترجیحات «شخصی» است و با
 * userIdِ کاربر شاخص می‌شود (نه مالک دفتر) تا هر عضو خانوار چیدمان خودش
 * را داشته باشد.
 *
 * مهاجرت از localStorage: کلاینت ترتیب محلیِ قبلی را در نخستین ثبت بالا
 * می‌فرستد؛ پس از آن سرور مرجعِ یگانه است و همهٔ دستگاه‌ها هم‌گام می‌مانند.
 */

const WIDGET_IDS = [
  "categories",
  "yearly",
  "trend",
  "transfers",
  "budgets",
  "transactions",
] as const;

/** چیدمان کارت‌های داشبورد کاربر جاری؛ اگر هنوز ثبت نشده null برمی‌گرداند */
export const getWidgetPrefs = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const doc = await ctx.db
      .query("deviceSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!doc) return null;
    // شناسه‌های ناشناخته (مثلاً کارت حذف‌شده در آینده) را بی‌صدا بیفکن
    const known = new Set<string>(WIDGET_IDS);
    return {
      order: (doc.widgetOrder ?? []).filter((id) => known.has(id)),
      hidden: (doc.widgetHidden ?? []).filter((id) => known.has(id)),
    };
  },
});

/**
 * ثبت چیدمان — «آخرین نویسنده برنده است»؛ نوشتن idempotent است و هر
 * دستگاه پس از هر تغییر همین را صدا می‌زند. سند در نخستین فراخوانی ساخته می‌شود.
 */
export const setWidgetPrefs = mutation({
  args: {
    order: v.array(v.string()),
    hidden: v.array(v.string()),
  },
  handler: async (ctx, { order, hidden }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");
    const known = new Set<string>(WIDGET_IDS);
    const cleanOrder = order.filter((id) => known.has(id));
    const cleanHidden = hidden.filter((id) => known.has(id));

    const doc = await ctx.db
      .query("deviceSettings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (doc) {
      await ctx.db.patch(doc._id, {
        widgetOrder: cleanOrder,
        widgetHidden: cleanHidden,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("deviceSettings", {
        userId,
        widgetOrder: cleanOrder,
        widgetHidden: cleanHidden,
        updatedAt: Date.now(),
      });
    }
  },
});
