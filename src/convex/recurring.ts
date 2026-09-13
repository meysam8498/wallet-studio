import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireOwner } from "./ownership";

// ---------------------------------------------------------------------------
// پرداخت‌های تکراری (اشتراک‌ها، اجاره، اقساط) — v1.4.0
// هر پرداخت در «روز شمسی» مشخصی از ماه ثبت می‌شود؛ ثبت خودکار با runDue.
// ---------------------------------------------------------------------------

// --- کمکی‌های تقویم شمسی (کوچک‌شده از src/lib/format.ts — سمت سرور) ---

function div(a: number, b: number) {
  return Math.trunc(a / b);
}
function mod(a: number, b: number) {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0]!;
  let jump = 0;
  let n = 0;
  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i]!;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

function jIsLeap(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

function jMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jIsLeap(jy) ? 30 : 29;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = d2g(j2d(jy, jm, jd));
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

function todayJ() {
  const now = new Date();
  return d2j(g2d(now.getFullYear(), now.getMonth() + 1, now.getDate()));
}

function jShift({ jy, jm }: { jy: number; jm: number }, delta: number) {
  let m = jm + delta;
  let y = jy;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { jy: y, jm: m };
}

const monthKey = ({ jy, jm }: { jy: number; jm: number }) => `${jy}-${pad2(jm)}`;

// --- اعتبارسنجی ---

function validateAmount(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("مبلغ باید عددی بزرگ‌تر از صفر باشد");
  }
}

function validateDay(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error("روز ماه باید عددی میان ۱ تا ۳۱ باشد");
  }
}

// --- کوئری‌ها ---

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOwner(ctx);
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// --- ثبت / ویرایش / حذف ---

const subArgs = {
  title: v.string(),
  amount: v.number(),
  type: v.union(v.literal("income"), v.literal("expense")),
  categoryId: v.optional(v.id("categories")),
  accountId: v.optional(v.id("accounts")),
  dayOfMonth: v.number(),
  note: v.optional(v.string()),
};

async function assertOwned(
  ctx: MutationCtx,
  categoryId: Id<"categories"> | undefined,
  accountId: Id<"accounts"> | undefined,
  userId: Id<"users">,
) {
  if (categoryId) {
    const cat = await ctx.db.get(categoryId);
    if (!cat || cat.userId !== userId) throw new Error("دسته‌بندی پیدا نشد");
  }
  if (accountId) {
    const acc = await ctx.db.get(accountId);
    if (!acc || acc.userId !== userId) throw new Error("حساب پیدا نشد");
  }
}

export const create = mutation({
  args: subArgs,
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const title = args.title.trim();
    if (!title) throw new Error("عنوان الزامی است");
    validateAmount(args.amount);
    validateDay(args.dayOfMonth);
    await assertOwned(ctx, args.categoryId, args.accountId, userId);
    return await ctx.db.insert("subscriptions", {
      userId,
      title,
      amount: args.amount,
      type: args.type,
      categoryId: args.categoryId,
      accountId: args.accountId,
      dayOfMonth: args.dayOfMonth,
      note: args.note?.trim() || undefined,
      active: true,
      updatedAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: { id: v.id("subscriptions"), ...subArgs, active: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("پرداخت تکراری پیدا نشد");
    }
    const title = args.title.trim();
    if (!title) throw new Error("عنوان الزامی است");
    validateAmount(args.amount);
    validateDay(args.dayOfMonth);
    await assertOwned(ctx, args.categoryId, args.accountId, userId);
    await ctx.db.patch(args.id, {
      title,
      amount: args.amount,
      type: args.type,
      categoryId: args.categoryId,
      accountId: args.accountId,
      dayOfMonth: args.dayOfMonth,
      note: args.note?.trim() || undefined,
      active: args.active,
      updatedAt: Date.now(),
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("subscriptions"), active: v.boolean() },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("پرداخت تکراری پیدا نشد");
    }
    await ctx.db.patch(args.id, {
      active: args.active,
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const userId = await requireOwner(ctx);
    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
      throw new Error("پرداخت تکراری پیدا نشد");
    }
    await ctx.db.delete(args.id);
  },
});

// --- ثبت خودکار سرسیدها ---

export const runDue = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireOwner(ctx);

    const today = todayJ();
    const subs = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_active", (q) =>
        q.eq("userId", userId).eq("active", true),
      )
      .collect();

    let posted = 0;
    for (const s of subs) {
      // ماه‌های سرنشده از آخرین ثبت تا ماه جاری (سقف ۱۲ ماه برای محافظت)
      const lastKey = s.lastPosted ?? null;
      let cur = lastKey
        ? jShift({ jy: Number(lastKey.split("-")[0]), jm: Number(lastKey.split("-")[1]) }, 1)
        : { jy: today.jy, jm: today.jm };

      let steps = 0;
      while (steps < 12) {
        const curKey = monthKey(cur);
        // جلوتر از ماه جاری؟ کاری نداریم
        if (cur.jy > today.jy || (cur.jy === today.jy && cur.jm > today.jm)) break;

        const len = jMonthLength(cur.jy, cur.jm);
        const dueDay = Math.min(s.dayOfMonth, len);
        const isCurrent = cur.jy === today.jy && cur.jm === today.jm;

        if (isCurrent && today.jd < dueDay) break; // هنوز سرسید نرسیده

        if (lastKey === curKey) break; // این ماه قبلاً ثبت شده

        await ctx.db.insert("transactions", {
          userId,
          amount: s.amount,
          date: jalaliToGregorian(cur.jy, cur.jm, dueDay),
          type: s.type,
          categoryId: s.categoryId,
          accountId: s.accountId,
          note: `پرداخت تکراری — ${s.title}`,
          updatedAt: Date.now(),
        });
        await ctx.db.patch(s._id, { lastPosted: curKey, updatedAt: Date.now() });
        posted += 1;
        cur = jShift(cur, 1);
        steps += 1;
      }
    }
    return { posted };
  },
});
