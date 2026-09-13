import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./ownership";

// ---------------------------------------------------------------------------
// طلب و بدهی (اشخاص)
// ---------------------------------------------------------------------------

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOwner(ctx);
    return await ctx.db
      .query("debts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    person: v.string(),
    amount: v.number(),
    direction: v.union(v.literal("owed_to_me"), v.literal("owed_by_me")),
    note: v.optional(v.string()),
    dueDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const person = args.person.trim();
    if (!person) throw new Error("نام شخص الزامی است");
    if (!Number.isFinite(args.amount) || args.amount <= 0) {
      throw new Error("مبلغ باید عددی بزرگ‌تر از صفر باشد");
    }
    if (args.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(args.dueDate)) {
      throw new Error("تاریخ سررسید نامعتبر است");
    }
    return await ctx.db.insert("debts", {
      userId,
      person,
      amount: args.amount,
      direction: args.direction,
      note: args.note?.trim() || undefined,
      dueDate: args.dueDate || undefined,
      settled: false,
      updatedAt: Date.now(),
    });
  },
});

export const toggleSettled = mutation({
  args: { id: v.id("debts") },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("سند پیدا نشد");
    }
    await ctx.db.patch(args.id, {
      settled: !existing.settled,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("debts") },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("سند پیدا نشد");
    }
    await ctx.db.delete(args.id);
  },
});
