import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireOwner, currentUser } from "./ownership";
import type { ACCOUNT_KINDS } from "./accounts";

// Muted editorial palette for category swatches (studio theme).
const PALETTE = [
  "#6B7A6F", "#A68A64", "#5C6B7A", "#9C6B5E", "#7A6B8A",
  "#8A8A6B", "#5E8A7A", "#8A5E74", "#6B6B6B", "#B08968",
] as const;

const dateArg = v.string(); // "YYYY-MM-DD" (میلادی، فرمت ذخیره‌سازی)

// ---------------------------------------------------------------------------
// دسته‌بندی‌ها
// ---------------------------------------------------------------------------

export const listCategories = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOwner(ctx);
    return await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
    kind: v.union(v.literal("income"), v.literal("expense")),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("نام دسته الزامی است");
    const dup = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (dup.some((c) => c.kind === args.kind && c.name.trim() === name)) {
      throw new Error("دسته‌ای با این نام قبلاً ساخته شده است");
    }
    return await ctx.db.insert("categories", {
      userId,
      name,
      kind: args.kind,
      color: args.color,
      updatedAt: Date.now(),
    });
  },
});

export const updateCategory = mutation({
  args: {
    id: v.id("categories"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("دسته‌بندی پیدا نشد");
    }
    const name = args.name.trim();
    if (!name) throw new Error("نام دسته الزامی است");
    const siblings = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (
      siblings.some(
        (c) => c.kind === existing.kind && c._id !== args.id && c.name.trim() === name,
      )
    ) {
      throw new Error("دسته‌ای با این نام قبلاً ساخته شده است");
    }
    await ctx.db.patch(args.id, {
      name,
      color: args.color,
      updatedAt: Date.now(),
    });
  },
});

export const deleteCategory = mutation({
  args: { id: v.id("categories") },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("دسته‌بندی پیدا نشد");
    }
    // تراکنش‌ها حذف نمی‌شوند؛ فقط از دسته جدا می‌شوند.
    const attached = await ctx.db
      .query("transactions")
      .withIndex("by_category", (q) => q.eq("categoryId", args.id))
      .collect();
    for (const t of attached) {
      await ctx.db.patch(t._id, {
        categoryId: undefined,
        updatedAt: Date.now(),
      });
    }
    await ctx.db.delete(args.id);
  },
});

// ---------------------------------------------------------------------------
// تراکنش‌ها
// ---------------------------------------------------------------------------

const transactionArgs = {
  amount: v.number(),
  date: dateArg,
  type: v.union(
    v.literal("income"),
    v.literal("expense"),
    v.literal("transfer"), // انتقال میان حساب‌ها — v1.5.0
  ),
  categoryId: v.optional(v.id("categories")),
  accountId: v.optional(v.id("accounts")),
  transferToId: v.optional(v.id("accounts")), // حساب مقصد انتقال — v1.5.0
  note: v.optional(v.string()),
  receipt: v.optional(v.string()), // data URL تصویر رسید (کوچک‌شده سمت کلاینت)
};

function validate(amount: number, date: string) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ باید عددی بزرگ‌تر از صفر باشد");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("تاریخ نامعتبر است");
  }
}

export const listTransactions = query({
  args: { month: v.optional(dateArg) }, // "YYYY-MM" میلادی
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    let rows = await ctx.db
      .query("transactions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    if (args.month) rows = rows.filter((t) => t.date.startsWith(args.month!));
    return rows;
  },
});

async function assertOwnedAccount(
  ctx: QueryCtx,
  accountId: Id<"accounts"> | undefined,
  userId: Id<"users">,
) {
  if (!accountId) return;
  const acc = await ctx.db.get(accountId);
  if (!acc || acc.userId !== userId) {
    throw new Error("حساب پیدا نشد");
  }
}

/** اعتبارسنجی مشترک تراکنش، از جمله قواعد انتقال میان حساب‌ها (v1.5.0) */
async function assertTransaction(
  ctx: QueryCtx,
  args: {
    amount: number;
    date: string;
    type: "income" | "expense" | "transfer";
    categoryId?: Id<"categories">;
    accountId?: Id<"accounts">;
    transferToId?: Id<"accounts">;
  },
  userId: Id<"users">,
) {
  validate(args.amount, args.date);
  if (args.type === "transfer") {
    if (!args.accountId || !args.transferToId) {
      throw new Error("انتقال باید هر دو حساب مبدأ و مقصد را داشته باشد");
    }
    if (args.accountId === args.transferToId) {
      throw new Error("مبدأ و مقصد انتقال نمی‌توانند یکی باشند");
    }
    if (args.categoryId) {
      throw new Error("انتقال، دسته‌بندی نمی‌پذیرد");
    }
  } else if (args.categoryId) {
    const cat = await ctx.db.get(args.categoryId);
    if (!cat || cat.userId !== userId) {
      throw new Error("دسته‌بندی پیدا نشد");
    }
  }
  await assertOwnedAccount(ctx, args.accountId, userId);
  await assertOwnedAccount(ctx, args.transferToId, userId);
}

export const createTransaction = mutation({
  args: transactionArgs,
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const by = await currentUser(ctx);
    await assertTransaction(ctx, args, userId);
    return await ctx.db.insert("transactions", {
      userId,
      createdBy: by ?? undefined,
      amount: args.amount,
      date: args.date,
      type: args.type,
      categoryId: args.type === "transfer" ? undefined : args.categoryId,
      accountId: args.accountId,
      transferToId: args.type === "transfer" ? args.transferToId : undefined,
      note: args.note?.trim() || undefined,
      receipt: args.receipt || undefined,
      updatedAt: Date.now(),
    });
  },
});

export const updateTransaction = mutation({
  args: {
    id: v.id("transactions"),
    ...transactionArgs,
  },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("تراکنش پیدا نشد");
    }
    await assertTransaction(ctx, args, userId);
    await ctx.db.patch(args.id, {
      amount: args.amount,
      date: args.date,
      type: args.type,
      categoryId: args.type === "transfer" ? undefined : args.categoryId,
      accountId: args.accountId,
      transferToId: args.type === "transfer" ? args.transferToId : undefined,
      note: args.note?.trim() || undefined,
      receipt: args.receipt === undefined ? existing.receipt : args.receipt || undefined,
      updatedAt: Date.now(),
    });
  },
});

export const deleteTransaction = mutation({
  args: { id: v.id("transactions") },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("تراکنش پیدا نشد");
    }
    await ctx.db.delete(args.id);
  },
});

// ---------------------------------------------------------------------------
// بودجهٔ ماهانهٔ دسته‌ها
// ---------------------------------------------------------------------------

export const setCategoryBudget = mutation({
  args: { id: v.id("categories"), budget: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("دسته‌بندی پیدا نشد");
    }
    if (args.budget !== undefined && (!Number.isFinite(args.budget) || args.budget < 0)) {
      throw new Error("بودجه باید عددی نامنفی باشد");
    }
    await ctx.db.patch(args.id, {
      budget: args.budget,
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// دسته‌ها و حساب‌های پیش‌فرض برای کاربر تازه
// ---------------------------------------------------------------------------

export const ensureSeed = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    if (existing.length > 0) return;
    const defaults: Array<{ name: string; kind: "income" | "expense" }> = [
      { name: "حقوق", kind: "income" },
      { name: "درآمد دیگر", kind: "income" },
      { name: "خوراک", kind: "expense" },
      { name: "مسکن", kind: "expense" },
      { name: "حمل‌ونقل", kind: "expense" },
      { name: "رستوران و کافه", kind: "expense" },
      { name: "قبوض", kind: "expense" },
      { name: "سلامت", kind: "expense" },
      { name: "تفریح", kind: "expense" },
      { name: "متفرقه", kind: "expense" },
    ];
    for (let i = 0; i < defaults.length; i++) {
      await ctx.db.insert("categories", {
        userId,
        name: defaults[i]!.name,
        kind: defaults[i]!.kind,
        color: PALETTE[i % PALETTE.length]!,
        updatedAt: Date.now(),
      });
    }
    const accountDefaults: Array<{
      name: string;
      kind: (typeof ACCOUNT_KINDS)[number];
    }> = [
      { name: "نقدی", kind: "cash" },
      { name: "کارت بانکی", kind: "card" },
    ];
    for (const a of accountDefaults) {
      await ctx.db.insert("accounts", {
        userId,
        name: a.name,
        kind: a.kind,
        initialBalance: 0,
        updatedAt: Date.now(),
      });
    }
  },
});

// ---------------------------------------------------------------------------
// پشتیبان‌گیری کامل — v1.5.0
// ---------------------------------------------------------------------------

/** کل داده‌های کاربر در یک پاس — مبنای خروجی JSON پشتیبان. */
export const exportAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOwner(ctx);
    const [categories, accounts, transactions, debts, subscriptions] =
      await Promise.all([
        ctx.db
          .query("categories")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("accounts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("transactions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("debts")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("subscriptions")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
      ]);
    return { categories, accounts, transactions, debts, subscriptions };
  },
});
