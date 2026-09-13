import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./ownership";

const ACCOUNT_KINDS = ["cash", "bank", "card", "wallet"] as const;

// ---------------------------------------------------------------------------
// حساب‌ها (نقدی، بانکی، کارت، کیف پول)
// ---------------------------------------------------------------------------

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOwner(ctx);
    return await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    kind: v.union(
      v.literal("cash"),
      v.literal("bank"),
      v.literal("card"),
      v.literal("wallet"),
    ),
    initialBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("نام حساب الزامی است");
    const existing = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.some((a) => a.name.trim() === name)) {
      throw new Error("حسابی با این نام قبلاً ساخته شده است");
    }
    return await ctx.db.insert("accounts", {
      userId,
      name,
      kind: args.kind,
      initialBalance: args.initialBalance,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("accounts"),
    name: v.string(),
    kind: v.union(
      v.literal("cash"),
      v.literal("bank"),
      v.literal("card"),
      v.literal("wallet"),
    ),
    initialBalance: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("حساب پیدا نشد");
    }
    const name = args.name.trim();
    if (!name) throw new Error("نام حساب الزامی است");
    const siblings = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (siblings.some((a) => a._id !== args.id && a.name.trim() === name)) {
      throw new Error("حسابی با این نام قبلاً ساخته شده است");
    }
    await ctx.db.patch(args.id, {
      name,
      kind: args.kind,
      initialBalance: args.initialBalance,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("accounts") },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("حساب پیدا نشد");
    }
    // تراکنش‌های این حساب به «بدون حساب» منتقل می‌شوند.
    const attached = await ctx.db
      .query("transactions")
      .withIndex("by_account", (q) => q.eq("accountId", args.id))
      .collect();
    for (const t of attached) {
      await ctx.db.patch(t._id, { accountId: undefined, updatedAt: Date.now() });
    }
    await ctx.db.delete(args.id);
  },
});

export { ACCOUNT_KINDS };
