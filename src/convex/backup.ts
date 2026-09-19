import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { resolveOwner } from "./ownership";
import { PALETTE } from "./ledger";

/**
 * بازیابی پشتیبان — v2.6.0: مکملِ خروجی JSON (exportAll در ledger.ts)
 *
 * داده‌های فایل پشتیبان با دفترِ جاری «ادغام» می‌شود — این بازیابی
 * بازنویسی‌کننده نیست، ترمیم‌کننده است:
 *  - هیچ سندی حذف یا تغییر داده نمی‌شود؛ فقط افزودن است.
 *  - رکورد تکراری با «قاعدهٔ اثر انگشت» تشخیص داده می‌شود و رد می‌گردد:
 *      دسته: نام + نوع | حساب: نام + نوع | تراکنش: مبلغ + تاریخ + نوع + یادداشت
 *      طلب: شخص + مبلغ + جهت + تسویه | پرداخت تکراری: عنوان + روز ماه + نوع
 *
 * نگاشت دسته/حساب دو مرحله‌ای: اگر شناسهٔ فایل در همین دفتر معتبر بود
 * (بازیابی در همان دفتر) مستقیم استفاده می‌شود؛ وگرنه با نام تطبیق داده
 * می‌شود (بازیابی در دفتر دیگر یا پس از حذف دسته).
 *
 * نتیجهٔ بازگشتی برای نمایش دقیق در رابط: تعداد افزوده‌شده و رد‌شدهٔ هر جدول.
 */

type TableKey = "categories" | "accounts" | "transactions" | "debts" | "subscriptions";
type Counts = Record<TableKey, { added: number; skipped: number }>;

const emptyCounts = (): Counts => ({
  categories: { added: 0, skipped: 0 },
  accounts: { added: 0, skipped: 0 },
  transactions: { added: 0, skipped: 0 },
  debts: { added: 0, skipped: 0 },
  subscriptions: { added: 0, skipped: 0 },
});

const norm = (s: unknown): string => String(s ?? "").replace(/\u200c/g, "").trim();

export const restore = mutation({
  args: {
    categories: v.optional(v.array(v.any())),
    accounts: v.optional(v.array(v.any())),
    transactions: v.optional(v.array(v.any())),
    debts: v.optional(v.array(v.any())),
    subscriptions: v.optional(v.array(v.any())),
  },
  handler: async (ctx, args): Promise<Counts> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");
    // بازیابی در دفترِ «فعال» انجام می‌شود: شخصی یا خانوار مشترک
    const owner = await resolveOwner(ctx, userId);
    const counts = emptyCounts();

    // ---- دسته‌ها: کلیدِ ادغام = نام + نوع ----
    const existingCats = await ctx.db
      .query("categories")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
    const catKey = (name: unknown, kind: unknown) => `${norm(name)}|${norm(kind)}`;
    const catMap = new Map(existingCats.map((c) => [catKey(c.name, c.kind), c._id]));

    // ---- حساب‌ها: کلید = نام + نوع؛ جست‌وجوی نام‌محور هم نگه می‌داریم ----
    const existingAccs = await ctx.db
      .query("accounts")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
    const accKey = (name: unknown, kind: unknown) => `${norm(name)}|${norm(kind)}`;
    const accMap = new Map(existingAccs.map((a) => [accKey(a.name, a.kind), a._id]));
    const accByName = new Map<string, Id<"accounts">>();
    for (const a of existingAccs) if (!accByName.has(norm(a.name))) accByName.set(norm(a.name), a._id);

    // ---- تراکنش‌ها: اثر انگشت = مبلغ + تاریخ + نوع + یادداشت ----
    const existingTxs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
    const txKey = (t: { amount?: unknown; date?: unknown; type?: unknown; note?: unknown }) =>
      `${Number(t.amount ?? 0)}|${norm(t.date)}|${norm(t.type)}|${norm(t.note).slice(0, 80)}`;
    const txSet = new Set(existingTxs.map(txKey));

    // ---- طلب‌ها ----
    const existingDebts = await ctx.db
      .query("debts")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
    const debtKey = (d: { person?: unknown; amount?: unknown; direction?: unknown; settled?: unknown }) =>
      `${norm(d.person)}|${Number(d.amount ?? 0)}|${norm(d.direction)}|${d.settled ? "1" : "0"}`;
    const debtSet = new Set(existingDebts.map(debtKey));

    // ---- پرداخت‌های تکراری ----
    const existingSubs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", owner))
      .collect();
    const subKey = (s: { title?: unknown; dayOfMonth?: unknown; type?: unknown }) =>
      `${norm(s.title)}|${Number(s.dayOfMonth ?? 0)}|${norm(s.type)}`;
    const subSet = new Set(existingSubs.map(subKey));

    /** نگاشت شناسهٔ دستهٔ فایل: معتبر در همین دفتر؟ وگرنه با نام */
    const mapCategory = async (
      rawId: unknown,
      rawName: unknown,
      kind: "income" | "expense",
    ): Promise<Id<"categories"> | undefined> => {
      if (typeof rawId === "string") {
        try {
          const doc = await ctx.db.get(rawId as Id<"categories">);
          if (doc && doc.userId === owner) return doc._id;
        } catch { /* شناسهٔ نامعتبر — با نام ادامه بده */ }
      }
      const name = norm(rawName);
      if (name) return catMap.get(catKey(name, kind));
      return undefined;
    };

    const mapAccount = async (rawId: unknown, rawName: unknown): Promise<Id<"accounts"> | undefined> => {
      if (typeof rawId === "string") {
        try {
          const doc = await ctx.db.get(rawId as Id<"accounts">);
          if (doc && doc.userId === owner) return doc._id;
        } catch { /* با نام ادامه بده */ }
      }
      const name = norm(rawName);
      return name ? (accByName.get(name) ?? undefined) : undefined;
    };

    // ---- درج دسته‌ها ----
    let paletteIdx = existingCats.length;
    for (const c of args.categories ?? []) {
      const name = norm(c.name);
      const kind = c.kind === "income" ? "income" : "expense";
      if (!name) { counts.categories.skipped++; continue; }
      const key = catKey(name, kind);
      if (catMap.has(key)) { counts.categories.skipped++; continue; }
      const id = await ctx.db.insert("categories", {
        userId: owner,
        name,
        kind,
        color:
          typeof c.color === "string" && /^#[0-9a-fA-F]{6}$/.test(c.color)
            ? c.color
            : PALETTE[paletteIdx++ % PALETTE.length]!,
        budget: typeof c.budget === "number" && c.budget > 0 ? c.budget : undefined,
        updatedAt: Date.now(),
      });
      catMap.set(key, id);
      if (!accByName.has(name)) { /* دسته است، حساب نیست — نگه‌داری نام برای تراکنش‌ها */ }
      counts.categories.added++;
    }

    // ---- درج حساب‌ها ----
    for (const a of args.accounts ?? []) {
      const name = norm(a.name);
      if (!name) { counts.accounts.skipped++; continue; }
      const kindRaw = norm(a.kind);
      const kind = (["cash", "bank", "card", "wallet"].includes(kindRaw) ? kindRaw : "cash") as
        | "cash" | "bank" | "card" | "wallet";
      const key = accKey(name, kind);
      if (accMap.has(key)) { counts.accounts.skipped++; continue; }
      const id = await ctx.db.insert("accounts", {
        userId: owner,
        name,
        kind,
        initialBalance: Number(a.initialBalance ?? 0) || 0,
        updatedAt: Date.now(),
      });
      accMap.set(key, id);
      if (!accByName.has(name)) accByName.set(name, id);
      counts.accounts.added++;
    }

    // ---- درج تراکنش‌ها (پس از دسته/حساب تا نگاشت کامل باشد) ----
    for (const t of args.transactions ?? []) {
      const amount = Number(t.amount ?? 0);
      const date = norm(t.date);
      const typeRaw = norm(t.type);
      const type = (["income", "expense", "transfer"].includes(typeRaw) ? typeRaw : "expense") as
        | "income" | "expense" | "transfer";
      if (!Number.isFinite(amount) || amount <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        counts.transactions.skipped++;
        continue;
      }
      const key = txKey(t);
      if (txSet.has(key)) { counts.transactions.skipped++; continue; }
      const catId = type === "transfer" ? undefined : await mapCategory(t.categoryId, t.categoryName, type === "income" ? "income" : "expense");
      const accId = await mapAccount(t.accountId, t.accountName);
      const accToId = type === "transfer" ? await mapAccount(t.transferToId, t.transferToName) : undefined;
      await ctx.db.insert("transactions", {
        userId: owner,
        createdBy: userId,
        amount,
        date,
        type,
        categoryId: catId,
        accountId: accId,
        transferToId: accToId,
        note: norm(t.note) || undefined,
        updatedAt: Date.now(),
      });
      txSet.add(key);
      counts.transactions.added++;
    }

    // ---- درج طلب‌ها ----
    for (const d of args.debts ?? []) {
      const person = norm(d.person);
      const amount = Number(d.amount ?? 0);
      if (!person || !Number.isFinite(amount) || amount <= 0) { counts.debts.skipped++; continue; }
      const direction = d.direction === "owed_by_me" ? "owed_by_me" : "owed_to_me";
      const settled = Boolean(d.settled);
      const key = debtKey({ person, amount, direction, settled });
      if (debtSet.has(key)) { counts.debts.skipped++; continue; }
      await ctx.db.insert("debts", {
        userId: owner,
        person,
        amount,
        direction,
        note: norm(d.note) || undefined,
        dueDate: norm(d.dueDate) || undefined,
        settled,
        updatedAt: Date.now(),
      });
      debtSet.add(key);
      counts.debts.added++;
    }

    // ---- درج پرداخت‌های تکراری ----
    for (const s of args.subscriptions ?? []) {
      const title = norm(s.title);
      const amount = Number(s.amount ?? 0);
      const day = Math.min(31, Math.max(1, Number(s.dayOfMonth ?? 1) || 1));
      if (!title || !Number.isFinite(amount) || amount <= 0) { counts.subscriptions.skipped++; continue; }
      const type = s.type === "income" ? "income" : "expense";
      const key = subKey({ title, dayOfMonth: day, type });
      if (subSet.has(key)) { counts.subscriptions.skipped++; continue; }
      const catId = await mapCategory(s.categoryId, s.categoryName, type);
      const accId = await mapAccount(s.accountId, s.accountName);
      await ctx.db.insert("subscriptions", {
        userId: owner,
        title,
        amount,
        type,
        categoryId: catId,
        accountId: accId,
        dayOfMonth: day,
        active: s.active === undefined ? true : Boolean(s.active),
        note: norm(s.note) || undefined,
        updatedAt: Date.now(),
      });
      subSet.add(key);
      counts.subscriptions.added++;
    }

    return counts;
  },
});
