import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireOwner } from "./ownership";

/**
 * خانوار مشترک — v2.0.0
 *
 * یک دفتر واحد برای همهٔ اعضا: هر عضو با حساب خودش وارد می‌شود، تراکنش‌ها و
 * حساب‌ها و طلب‌ها مشترک دیده می‌شوند و «ثبت‌کنندهٔ» هر سند کنارش ذخیره می‌شود.
 * مالک اعضا را دعوت و حذف می‌کند؛ اعضا می‌توانند خودشان را خارج کنند.
 *
 * دعوت با «کد شش‌حرفی» انجام می‌شود: مالک کد می‌سازد و آن را حضوری
 * با اعضای خانواده به اشتراک می‌گذارد؛ عضو تازه کد را در برنامه وارد می‌کند.
 */

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // بدون کاراکترهای گیج‌کننده
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = "";
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return code;
}

type Ctx = QueryCtx | MutationCtx;

type HouseholdDoc = Doc<"households">;

async function getUserEmail(ctx: Ctx, userId: Id<"users">): Promise<string | undefined> {
  const user = await ctx.db.get(userId);
  return user?.email ?? user?.name ?? undefined;
}

/**
 * یافتن خانوارِ شاملِ کاربر — روی شاخص آرایه‌ای `memberIds`.
 * eq روی فیلد آرایه‌ای یعنی «شاملِ عضو».
 */
async function householdOf(ctx: Ctx, userId: Id<"users">): Promise<HouseholdDoc | null> {
  // eq روی فیلد آرایه‌ای یعنی «شاملِ عضو»؛ استاب محلی و کدژن واقعی تفاوت نوعی
  // دارند — cast برای یکدستی هر دو.
  const row = await ctx.db
    .query("households")
    .withIndex("by_member", (q) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (q as any).eq("memberIds", userId),
    )
    .first();
  return row ?? null;
}

/** مشخصات نمایشی اعضا — ایمیل یا نام کاربر برای فهرست اعضا */
async function membersInfo(
  ctx: Ctx,
  memberIds: Id<"users">[],
): Promise<Array<{ id: Id<"users">; email?: string; isOwner: boolean }>> {
  const rows: Array<{ id: Id<"users">; email?: string; isOwner: boolean }> = [];
  for (const id of memberIds) {
    rows.push({
      id,
      email: await getUserEmail(ctx, id),
      isOwner: false,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// کوئری‌ها
// ---------------------------------------------------------------------------

/** خانوار کاربر جاری؛ اگر عضو هیچ خانواری نباشد null برمی‌گرداند */
export const myHousehold = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const mine = await householdOf(ctx, userId);
    if (!mine) return null;
    const members = await membersInfo(ctx, mine.memberIds);
    return {
      _id: mine._id,
      name: mine.name,
      ownerId: mine.ownerId,
      isOwner: mine.ownerId === userId,
      members: members.map((m) => ({
        ...m,
        isOwner: m.id === mine.ownerId,
      })),
    };
  },
});

// ---------------------------------------------------------------------------
// ساختن و منحل‌کردن خانوار
// ---------------------------------------------------------------------------

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");

    const existing = await householdOf(ctx, userId);
    if (existing) {
      throw new Error("شما هم‌اکنون عضو یک خانوار هستید؛ ابتدا آن را ترک کنید");
    }

    const name = args.name.trim();
    if (!name) throw new Error("نام خانوار الزامی است");

    return await ctx.db.insert("households", {
      name,
      ownerId: userId,
      memberIds: [userId],
      updatedAt: Date.now(),
    });
  },
});

/** انحلال کامل خانوار — فقط مالک؛ داده‌های دفتر دست‌نخورده می‌مانند */
export const dissolve = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");
    const mine = await householdOf(ctx, userId);
    if (!mine || mine.ownerId !== userId) {
      throw new Error("فقط مالک خانوار می‌تواند آن را منحل کند");
    }
    await ctx.db.delete(mine._id);
  },
});

// ---------------------------------------------------------------------------
// دعوت با کد
// ---------------------------------------------------------------------------

/** ساخت کد دعوت تازه — فقط مالک؛ کد در حافظهٔ سند نگهداری می‌شود */
export const newInviteCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");
    const mine = await householdOf(ctx, userId);
    if (!mine || mine.ownerId !== userId) {
      throw new Error("فقط مالک خانوار می‌تواند کد دعوت بسازد");
    }
    const code = generateCode();
    await ctx.db.patch(mine._id, {
      inviteCode: code,
      updatedAt: Date.now(),
    });
    return code;
  },
});

/** پیوستن با کد دعوت — کاربر باید بیرون از هر خانوار دیگری باشد */
export const join = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");

    const code = args.code.trim().toUpperCase();
    if (!code) throw new Error("کد دعوت را وارد کنید");

    const already = await householdOf(ctx, userId);
    if (already) {
      throw new Error("شما هم‌اکنون عضو یک خانوار هستید");
    }

    // جست‌وجوی خانوار با این کد — روی شاخص inviteCode
    const target = await ctx.db
      .query("households")
      .withIndex("by_invite_code", (q) => q.eq("inviteCode", code))
      .first();
    if (!target) {
      throw new Error("کد دعوت معتبر نیست");
    }

    await ctx.db.patch(target._id, {
      memberIds: [...target.memberIds, userId],
      updatedAt: Date.now(),
    });
    return target._id;
  },
});

/** خروج اختیاری عضو — مالک نمی‌تواند خارج شود؛ باید خانوار را منحل کند */
export const leave = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");
    const mine = await householdOf(ctx, userId);
    if (!mine) throw new Error("شما عضو هیچ خانواری نیستید");
    if (mine.ownerId === userId) {
      throw new Error(
        "مالک نمی‌تواند خانوار را ترک کند — برای پایان هم‌رسانی، خانوار را منحل کنید",
      );
    }
    await ctx.db.patch(mine._id, {
      memberIds: mine.memberIds.filter((id: Id<"users">) => id !== userId),
      inviteCode: undefined,
      updatedAt: Date.now(),
    });
  },
});

/** حذف عضو توسط مالک */
export const removeMember = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const callerId = await getAuthUserId(ctx);
    if (callerId === null) throw new Error("ابتدا وارد شوید");
    const mine = await householdOf(ctx, callerId);
    if (!mine || mine.ownerId !== callerId) {
      throw new Error("فقط مالک می‌تواند عضو را حذف کند");
    }
    if (args.userId === callerId) {
      throw new Error("برای خروج خودتان از «ترک خانوار» استفاده کنید");
    }
    if (!mine.memberIds.includes(args.userId)) {
      throw new Error("این کاربر عضو خانوار نیست");
    }
    await ctx.db.patch(mine._id, {
      memberIds: mine.memberIds.filter((id: Id<"users">) => id !== args.userId),
      inviteCode: undefined,
      updatedAt: Date.now(),
    });
  },
});

// ---------------------------------------------------------------------------
// نام خانوار
// ---------------------------------------------------------------------------

export const rename = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("ابتدا وارد شوید");
    const mine = await householdOf(ctx, userId);
    if (!mine || mine.ownerId !== userId) {
      throw new Error("فقط مالک می‌تواند نام خانوار را تغییر دهد");
    }
    const name = args.name.trim();
    if (!name) throw new Error("نام خانوار الزامی است");
    await ctx.db.patch(mine._id, { name, updatedAt: Date.now() });
  },
});

// اهمیت: myHousehold اعضا را با مالک در ردیف اول برنمی‌گرداند؛ مرتب‌سازی
// در رابط کاربری انجام می‌شود. برای درج «ثبت‌کننده» روی اسناد از
// currentUser در ownership.ts استفاده می‌شود.
void requireOwner;
void membersInfo;
