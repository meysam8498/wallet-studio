import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * رزولوشن مالکیت دفتر — v2.0.0 (خانوار مشترک)
 *
 * هر دادهٔ دفتر با `userId` مالکش شاخص‌گذاری شده است. اگر کاربرِ واردشده
 * عضو یک خانوار باشد، همان «مالک» به‌عنوان کلید دسترسی برمی‌گردد؛ یعنی همهٔ
 * اعضا یک دفتر واحد را می‌بینند و می‌نویسند. اگر کاربر عضو هیچ خانواری نباشد،
 * دفتر شخصی خودش را می‌بیند (ownerId = خودش).
 *
 * نکتهٔ عملکردی: این توضیح روی هر درخواست یک کوئری خانوار اضافه می‌کند؛
 * کوئری روی شاخص `by_member` است و برای خانوارهای خانوادگی هزینه‌ای ندارد.
 */
export async function resolveOwner(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<Id<"users">> {
  // eq روی فیلد آرایه‌ای (memberIds) یعنی «شاملِ عضو»؛ کدژن واقعی Convex
  // نوع عضو را می‌پذیرد، ولی استاب محلی آرایهٔ کامل — cast برای یکدستی هر دو.
  const household = await ctx.db
    .query("households")
    .withIndex("by_member", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).eq("memberIds", userId),
    )
    .first();
  return household ? household.ownerId : userId;
}

/**
 * احراز کاربر واردشده و برگرداندن مالک دفتر او (شخصی یا خانوار).
 * الگوی جایگزین برای «getAuthUserId + بررسی null» در همهٔ ماژول‌های دفتر.
 */
export async function requireOwner(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("ابتدا وارد شوید");
  return resolveOwner(ctx, userId);
}

/**
 * برگرداندن کاربر واردشده (نه مالک دفتر) — برای درج «ثبت‌کننده» سند.
 * اگر کاربر وارد نشده باشد null برمی‌گرداند؛ فراخوانی خودش خطای ورود می‌دهد.
 */
export async function currentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"users"> | null> {
  return getAuthUserId(ctx);
}
