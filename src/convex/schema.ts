import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // add other tables here

    // User-defined categories for income and expense transactions.
    categories: defineTable({
      userId: v.id("users"),
      name: v.string(),
      kind: v.union(v.literal("income"), v.literal("expense")),
      color: v.string(), // hex swatch from the studio palette
      budget: v.optional(v.number()), // monthly budget for expense categories
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_kind", ["userId", "kind"]),

    // Wallets / bank accounts / cards — balances roll up from transactions.
    accounts: defineTable({
      userId: v.id("users"),
      name: v.string(),
      kind: v.union(
        v.literal("cash"),
        v.literal("bank"),
        v.literal("card"),
        v.literal("wallet"),
      ),
      initialBalance: v.number(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // Recorded income / expense transactions — transfer since v1.5.0
    transactions: defineTable({
      userId: v.id("users"),
      // ثبت‌کنندهٔ واقعی سند — با خانوار مشترک می‌تواند member باشد (v2.0.0)
      createdBy: v.optional(v.id("users")),
      amount: v.number(), // positive, in major currency units
      date: v.string(), // "YYYY-MM-DD"
      type: v.union(
        v.literal("income"),
        v.literal("expense"),
        v.literal("transfer"), // انتقال میان حساب‌ها — v1.5.0
      ),
      categoryId: v.optional(v.id("categories")),
      accountId: v.optional(v.id("accounts")), // حساب مبدأ در انتقال
      transferToId: v.optional(v.id("accounts")), // حساب مقصد در انتقال — v1.5.0
      note: v.optional(v.string()),
      receipt: v.optional(v.string()), // data URL تصویر رسید — v1.4.0
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_date", ["userId", "date"])
      .index("by_category", ["categoryId"])
      .index("by_account", ["accountId"])
      .index("by_transfer_to", ["transferToId"]), // واکشی انتقال‌ها روی حساب مقصد — v1.5.0

    // طلب و بدهی — personal IOUs with people.
    debts: defineTable({
      userId: v.id("users"),
      person: v.string(),
      amount: v.number(), // positive
      direction: v.union(v.literal("owed_to_me"), v.literal("owed_by_me")),
      note: v.optional(v.string()),
      dueDate: v.optional(v.string()), // "YYYY-MM-DD"
      settled: v.boolean(),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),

    // پرداخت‌های تکراری (اشتراک‌ها، اجاره، اقساط) — v1.4.0
    subscriptions: defineTable({
      userId: v.id("users"),
      title: v.string(),
      amount: v.number(), // positive, toman
      type: v.union(v.literal("income"), v.literal("expense")),
      categoryId: v.optional(v.id("categories")),
      accountId: v.optional(v.id("accounts")),
      dayOfMonth: v.number(), // 1..31 — روز شمسیِ ماه
      active: v.boolean(),
      lastPosted: v.optional(v.string()), // "YYYY-MM" جلالیِ آخرین ثبت
      note: v.optional(v.string()),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_user_active", ["userId", "active"]),

    // خانوار مشترک — v2.0.0: همهٔ اعضا یک دفتر واحد را می‌بینند و می‌نویسند.
    // داده‌های دفتر متعلق به مالک (ownerId) است و اعضا با رزولوشن مالکیت
    // (requireOwner در src/convex/ownership.ts) به همان دفتر دسترسی دارند.
    households: defineTable({
      name: v.string(),
      ownerId: v.id("users"),
      memberIds: v.array(v.id("users")), // مالک همیشه عضو اول است
      inviteCode: v.optional(v.string()), // کد شش‌حرفی دعوت — v2.0.0
      updatedAt: v.number(),
    })
      .index("by_owner", ["ownerId"])
      // روی فیلد آرایه‌ای، هر عضو یک مدخل شاخص دارد؛ eq روی آن «شاملِ عضو» را می‌دهد
      .index("by_member", ["memberIds"])
      .index("by_invite_code", ["inviteCode"]),

    // ترجیحات دستگاه — v2.6.0: چیدمان کارت‌های داشبورد روی همهٔ دستگاه‌های
    // یک کاربر (ویندوز، اندروید، وب) یکسان دیده می‌شود؛ یک سند به‌ازای هر کاربر.
    deviceSettings: defineTable({
      userId: v.id("users"), // کاربر صاحب ترجیحات — نه مالک دفتر
      widgetOrder: v.optional(v.array(v.string())),
      widgetHidden: v.optional(v.array(v.string())),
      updatedAt: v.number(),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
