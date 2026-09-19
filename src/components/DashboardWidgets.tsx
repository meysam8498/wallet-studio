import { useMemo } from "react";
import { motion } from "framer-motion";
import { Pie, PieChart, Cell } from "recharts";
import {
  ArrowLeftRight,
  Download,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TrendChart } from "@/components/TrendChart";
import {
  faDigits,
  formatMoneyIn,
  jMonthLabel,
  jDateLabel,
  type UnitId,
} from "@/lib/format";
const UNCAT_COLOR = "#6B6B6B";

/**
 * کارت‌های داشبورد — v2.7.0
 *
 * هر کارت یک کامپوننت مستقل است تا تختهٔ داشبورد (Dashboard.tsx) بتواند
 * آن‌ها را به ترتیبِ انتخابی کاربر — همگام‌شده از سرور — رندر کند. پیش از
 * این کارت‌ها ثابت در JSX نشسته بودند و منوی «چیدمان» عملاً بی‌اثر بود.
 *
 * این فایل فقط «نمای» کارت‌هاست؛ همهٔ داده‌ها و کنش‌ها از طریق props
 * از Dashboard تزریق می‌شوند تا چرخهٔ حالت یک‌جا بماند.
 */

export type Category = {
  _id: Id<"categories">;
  name: string;
  kind: "income" | "expense";
  color: string;
  budget?: number;
};
export type Account = {
  _id: Id<"accounts">;
  name: string;
  kind: "cash" | "bank" | "card" | "wallet";
  initialBalance: number;
};
export type Transaction = {
  _id: Id<"transactions">;
  amount: number;
  date: string;
  type: "income" | "expense" | "transfer";
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  transferToId?: Id<"accounts">;
  note?: string;
  createdBy?: Id<"users">;
};

const cardCls = "min-w-0 break-inside-avoid rounded-[4px] border-border/70 shadow-none";

// ---------------------------------------------------------------------------
// دسته‌بندی‌ها (دونات)
// ---------------------------------------------------------------------------

export function CategoriesCard({
  scope,
  onScopeChange,
  chartTxs,
  byId,
  unit,
  monthLabel,
  onOpenCats,
}: {
  scope: "expense" | "income";
  onScopeChange: (v: "expense" | "income") => void;
  chartTxs: Transaction[];
  byId: Map<string, Category>;
  unit: UnitId;
  monthLabel: string;
  onOpenCats: () => void;
}) {
  const donut = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of chartTxs) {
      const key = t.categoryId ?? "uncat";
      totals.set(key, (totals.get(key) ?? 0) + t.amount);
    }
    const grand = [...totals.values()].reduce((a, b) => a + b, 0);
    const rows = [...totals.entries()]
      .map(([id, total]) => {
        const c = id === "uncat" ? undefined : byId.get(id);
        return {
          id,
          name: c?.name ?? "بدون دسته",
          color: c?.color ?? UNCAT_COLOR,
          total,
          pct: grand > 0 ? Math.round((total / grand) * 100) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);
    return { rows, grand };
  }, [chartTxs, byId]);

  return (
    <Card className={`${cardCls} gap-5 py-6`}>
      <CardHeader className="px-6">
        <CardAction>
          <Tabs value={scope} onValueChange={(v) => onScopeChange(v as "expense" | "income")}>
            <TabsList className="h-8 rounded-[4px] bg-secondary p-0.5">
              <TabsTrigger value="expense" className="h-7 rounded-[3px] px-3 text-xs">
                هزینه‌ها
              </TabsTrigger>
              <TabsTrigger value="income" className="h-7 rounded-[3px] px-3 text-xs">
                درآمدها
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardAction>
        <CardTitle className="font-display text-xl">دسته‌بندی‌ها</CardTitle>
        <CardDescription>
          {scope === "expense" ? "هزینه‌ها" : "درآمدها"} به تفکیک دسته — {monthLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        {donut.rows.length > 0 ? (
          <>
            <div className="mx-auto h-44 w-44">
              <PieChart width={176} height={176}>
                <Pie
                  data={donut.rows.map((r) => ({ name: r.name, value: r.total }))}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={54}
                  outerRadius={84}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {donut.rows.map((r) => (
                    <Cell key={r.id} fill={r.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="mt-5 grid gap-2.5">
              {donut.rows.map((r) => (
                <div key={r.id} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
                      <span className="truncate">{r.name}</span>
                      <span className="mr-1.5 text-xs">
                        · {faDigits(r.pct)}٪
                      </span>
                    </span>
                    <span className="shrink-0 font-display text-sm tabular-nums">
                      {formatMoneyIn(r.total, unit)}
                    </span>
                  </div>
                  <div className="h-px w-full bg-border/70">
                    <motion.div
                      className="h-px bg-foreground/70"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: r.pct / 100 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      style={{ transformOrigin: "right" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="grid place-items-center gap-2 rounded-[4px] border border-dashed py-14 text-center">
            <p className="font-display text-lg">دفتر خالی</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              نخستین تراکنش {scope === "expense" ? "هزینه" : "درآمد"} خود را ثبت کنید تا در دفتر بنشیند.
            </p>
          </div>
        )}
      </CardContent>
      <button type="button" className="sr-only" onClick={onOpenCats} aria-hidden />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// نمای سالانه
// ---------------------------------------------------------------------------

export function YearlyCard({
  yearSums,
  unit,
}: {
  yearSums: { jy: number; months: Array<{ jm: number; income: number; expense: number }> };
  unit: UnitId;
}) {
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const m of yearSums.months) {
      income += m.income;
      expense += m.expense;
    }
    return { income, expense, net: income - expense };
  }, [yearSums]);
  const max = Math.max(1, ...yearSums.months.map((m) => Math.max(m.income, m.expense)));

  return (
    <Card className={`${cardCls} gap-4 py-6`}>
      <CardHeader className="px-6">
        <CardTitle className="font-display text-xl">
          نمای سالانه — سال {faDigits(yearSums.jy)}
        </CardTitle>
        <CardDescription>جمع دوازده‌ماههٔ درآمد و هزینه</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: "درآمد سال", value: totals.income, tone: "text-chart-2" },
            { label: "هزینهٔ سال", value: totals.expense, tone: "" },
            { label: "تراز سال", value: totals.net, tone: totals.net < 0 ? "text-destructive" : "" },
          ].map((s) => (
            <div key={s.label} className="grid gap-1">
              <p className="eyebrow">{s.label}</p>
              <p className={`truncate font-display text-sm tabular-nums sm:text-base ${s.tone}`}>
                {formatMoneyIn(s.value, unit)}
              </p>
            </div>
          ))}
        </div>
        <div className="grid gap-2">
          {yearSums.months.map((m) => (
            <div key={m.jm} className="flex items-center gap-2 text-xs">
              <span className="w-14 shrink-0 text-muted-foreground">
                {jMonthLabel(yearSums.jy, m.jm).split(" ")[0]}
              </span>
              <span className="flex h-2.5 flex-1 gap-px overflow-hidden rounded-[3px] bg-secondary/60">
                <span
                  className="h-2 rounded-l-sm bg-chart-2/80"
                  style={{ width: `${(m.income / max) * 100}%` }}
                />
                <span
                  className="h-2 rounded-r-sm bg-chart-4/80"
                  style={{ width: `${(m.expense / max) * 100}%` }}
                />
              </span>
              <span className="w-24 shrink-0 text-left tabular-nums text-muted-foreground">
                {formatMoneyIn(m.income - m.expense, unit)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// روند شش‌ماهه
// ---------------------------------------------------------------------------

export function TrendCard({ trendSums }: { trendSums: Map<string, { income: number; expense: number }> }) {
  return (
    <Card className={`${cardCls} gap-4 py-6`}>
      <CardHeader className="px-6">
        <CardTitle className="font-display text-xl">روند شش‌ماهه</CardTitle>
        <CardDescription>درآمد در برابر هزینه، ماه به ماه</CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <TrendChart sumsByJMonth={trendSums} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// انتقال‌های ماه
// ---------------------------------------------------------------------------

export function TransfersCard({
  monthTransfers,
  accById,
  unit,
}: {
  monthTransfers: Transaction[];
  accById: Map<string, Account>;
  unit: UnitId;
}) {
  if (monthTransfers.length === 0) return null;
  return (
    <Card className={`${cardCls} gap-4 py-6`}>
      <CardHeader className="px-6">
        <CardTitle className="font-display text-xl">انتقال‌های این ماه</CardTitle>
        <CardDescription>
          جابه‌جایی پول میان حساب‌های خودتان — در آمار درآمد و هزینه نمی‌شمارند
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        <div className="grid gap-1.5">
          {monthTransfers.map((t) => (
            <div
              key={t._id}
              className="flex items-center gap-3 rounded-[4px] border bg-card px-3 py-2.5"
            >
              <ArrowLeftRight className="size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {t.accountId ? (accById.get(t.accountId)?.name ?? "—") : "—"}
                  {" ← "}
                  {t.transferToId ? (accById.get(t.transferToId)?.name ?? "—") : "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {jDateLabel(t.date)}
                  {t.note ? ` · ${t.note}` : ""}
                </p>
              </div>
              <span className="shrink-0 font-display text-sm tabular-nums">
                {formatMoneyIn(t.amount, unit)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// بودجهٔ ماه
// ---------------------------------------------------------------------------

export function BudgetsCard({
  budgets,
  unit,
  onEditBudgets,
}: {
  budgets: Array<{ id: string; name: string; color: string; budget: number; spent: number }>;
  unit: UnitId;
  onEditBudgets: () => void;
}) {
  return (
    <Card className={`${cardCls} gap-4 py-6`}>
      <CardHeader className="px-6">
        <CardAction>
          <Button variant="ghost" size="sm" onClick={onEditBudgets}>
            <Pencil className="size-3.5" />
            ویرایش بودجه‌ها
          </Button>
        </CardAction>
        <CardTitle className="font-display text-xl">بودجهٔ ماه</CardTitle>
        <CardDescription>
          مصرف دسته‌های بودجه‌دار در برابر سقف ماهانه
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6">
        {budgets.length > 0 ? (
          <div className="grid gap-4">
            {budgets.map((b) => {
              const pct = Math.min(100, Math.round((b.spent / b.budget) * 100));
              const over = b.spent > b.budget;
              return (
                <div key={b.id} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />
                      <span className="truncate">{b.name}</span>
                    </span>
                    <span className={`shrink-0 text-xs tabular-nums ${over ? "text-destructive" : "text-muted-foreground"}`}>
                      {formatMoneyIn(b.spent, unit)} / {formatMoneyIn(b.budget, unit)}
                      {over ? " — عبور از سقف" : ""}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/70">
                    <div
                      className={`h-full rounded-full transition-all ${over ? "bg-destructive" : "bg-foreground/75"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid place-items-center gap-2 rounded-[4px] border border-dashed py-12 text-center">
            <p className="font-display text-lg">بودجهٔ ماه</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              برای دسته‌های هزینه، بودجهٔ ماهانه تعیین کنید؛ مثلاً برای «خوراک»
              سقف ماهانه بگذارید و مصرفش را همین‌جا ببینید.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// تراکنش‌ها (جدول)
// ---------------------------------------------------------------------------

export function TransactionsCard({
  monthTxs,
  filteredTxs,
  monthLabel,
  byId,
  accById,
  unit,
  query,
  onQueryChange,
  catFilter,
  onCatFilterChange,
  categories,
  onExportCsv,
  onEditTx,
  onDeleteTx,
}: {
  monthTxs: Transaction[];
  filteredTxs: Transaction[];
  monthLabel: string;
  byId: Map<string, Category>;
  accById: Map<string, Account>;
  unit: UnitId;
  query: string;
  onQueryChange: (v: string) => void;
  catFilter: string;
  onCatFilterChange: (v: string) => void;
  categories: Category[];
  onExportCsv: () => void;
  onEditTx: (t: Transaction) => void;
  onDeleteTx: (t: Transaction) => void;
}) {
  return (
    <Card className={`${cardCls} gap-0 py-0`}>
      <CardHeader className="max-sm:px-4 gap-3 border-b px-5 py-5">
        <CardAction className="max-sm:col-start-1 max-sm:row-start-2 max-sm:w-full max-sm:justify-self-stretch">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="جست‌وجو…"
                className="h-8 w-32 bg-card pl-7 text-xs"
              />
            </div>
            <Select value={catFilter} onValueChange={onCatFilterChange}>
              <SelectTrigger className="h-8 w-32 bg-card text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همهٔ دسته‌ها</SelectItem>
                <SelectItem value="none">بدون دسته</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="خروجی CSV"
              title="خروجی CSV این ماه"
              onClick={onExportCsv}
            >
              <Download className="size-3.5" />
            </Button>
          </div>
        </CardAction>
        <CardTitle className="font-display text-xl">تراکنش‌ها</CardTitle>
        <CardDescription>
          {faDigits(filteredTxs.length)} سند در {monthLabel}
        </CardDescription>
      </CardHeader>
      <div className="max-h-[560px] overflow-y-auto">
        {filteredTxs.length === 0 ? (
          <div className="grid place-items-center gap-2 px-6 py-16 text-center">
            <p className="font-display text-lg">چیزی ثبت نشده</p>
            <p className="max-w-[16rem] text-sm text-muted-foreground">
              {monthTxs.length > 0
                ? "هیچ سندی با این فیلتر یا جست‌وجو پیدا نشد."
                : "نخستین تراکنش این ماه را ثبت کنید."}
            </p>
          </div>
        ) : (
          <div className="max-sm:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="pr-5">تاریخ</TableHead>
                  <TableHead>دسته</TableHead>
                  <TableHead className="pl-5 text-right">مبلغ</TableHead>
                  <TableHead className="w-0 pl-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTxs.map((t) => {
                  const cat = t.categoryId ? byId.get(t.categoryId) : undefined;
                  const acc = t.accountId ? accById.get(t.accountId) : undefined;
                  return (
                    <TableRow key={t._id} className="group">
                      <TableCell className="py-3 pr-5 align-top">
                        <p className="text-sm tabular-nums">{jDateLabel(t.date)}</p>
                        {t.note && (
                          <p className="mt-0.5 max-w-36 truncate text-xs text-muted-foreground">
                            {t.note}
                          </p>
                        )}
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
                          {acc
                            ? acc.name
                            : t.type === "income"
                              ? "درآمد"
                              : t.type === "transfer"
                                ? `به ${t.transferToId ? (accById.get(t.transferToId)?.name ?? "—") : "—"}`
                                : "هزینه"}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5 text-sm">
                            <span
                              className="size-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "py-3 pl-5 text-left align-top font-display text-base tabular-nums",
                          t.type === "income"
                            ? "text-chart-2"
                            : t.type === "transfer"
                              ? "text-muted-foreground"
                              : "text-foreground",
                        )}
                      >
                        {formatMoneyIn(t.amount, unit)}
                      </TableCell>
                      <TableCell className="w-0 pl-3 align-top">
                        <div className="max-sm:opacity-100 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            aria-label="ویرایش تراکنش"
                            className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                            onClick={() => onEditTx(t)}
                          >
                            <Pencil className="size-3" />
                          </button>
                          <button
                            aria-label="حذف تراکنش"
                            className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-destructive"
                            onClick={() => onDeleteTx(t)}
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
}
