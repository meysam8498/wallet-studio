import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { resolveOwner } from "./ownership";

/**
 * Get the current signed in user. Returns null if the user is not signed in.
 * Usage: const signedInUser = await ctx.runQuery(api.authHelpers.currentUser);
 * THIS FUNCTION IS READ-ONLY. DO NOT MODIFY.
 */
export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * کاربرانِ دفتر جاری — v2.0.0 (خانوار مشترک)
 *
 * اگر کاربر عضو خانوار باشد، همهٔ اعضا (برای نشان «ثبت‌کننده» کنار اسناد)
 * و در غیر این صورت فقط خودش برمی‌گردد. نام نمایشی از ایمیل یا نام کاربر.
 */
export const ledgerPeers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const ownerId = await resolveOwner(ctx, userId);
    // مالکِ دفتر، مرجع شناسایی اعضاست — عضوِ تازه‌وارد هم مالک را می‌بیند
    const household = await ctx.db
      .query("households")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .first();
    const ids = household ? household.memberIds : [userId];
    const rows: Array<{ id: string; label: string }> = [];
    for (const id of ids) {
      const u = await ctx.db.get(id);
      if (!u) continue;
      const raw = u.name || u.email || "عضو";
      rows.push({ id, label: raw.split("@")[0]! });
    }
    return rows;
  },
});
