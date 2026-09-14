import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Pie, PieChart, Cell } from "recharts";
import {
  WidgetSettingsMenu,
  useWidgetState,
} from "@/components/WidgetBoard";
import {
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  HandCoins,
  HardDriveDownload,
  Moon,
  Paperclip,
  Pencil,
  Plus,
  Printer,
  Repeat,
  Search,
  Sun,
  Tags,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { fileToReceiptDataUrl } from "@/lib/receipt";
import { LedgerMark } from "@/components/LedgerMark";
import { JalaliDatePicker, type JDateParts } from "@/components/JalaliDatePicker";
import {
  AccountsDialog,
  accountBalance,
  type Account,
} from "@/components/AccountsDialog";
import { DebtsDialog } from "@/components/DebtsDialog";
import { HouseholdDialog } from "@/components/HouseholdDialog";
import { RecurringDialog, type Subscription } from "@/components/RecurringDialog";
import { TrendChart } from "@/components/TrendChart";
import { printMonthReport } from "@/lib/print";
import {
  faDigits,
  formatMoneyIn,
  gregorianToJalali,
  jalaliToGregorian,
  jDateLabel,
  jMonthLabel,
  jShift,
  normalizeDigits,
  todayJ,
  todayGregorianKey,
  UNITS,
  type UnitId,
} from "@/lib/format";
import { VERSION } from "@/lib/version";
import { downloadCsv, downloadJson } from "@/lib/csv";
import { cn } from "@/lib/utils";

const PALETTE = [
  "#6B7A6F", "#A68A64", "#5C6B7A", "#9C6B5E", "#7A6B8A",
  "#8A8A6B", "#5E8A7A", "#8A5E74", "#6B6B6B", "#B08968",
];

type Category = {
  _id: Id<"categories">;
  name: string;
  kind: "income" | "expense";
  color: string;
  budget?: number;
};

type Transaction = {
  _id: Id<"transactions">;
  _creationTime?: number;
  createdBy?: Id<"users">;
  amount: number;
  date: string;
  type: "income" | "expense" | "transfer";
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  transferToId?: Id<"accounts">;
  note?: string;
  receipt?: string;
};

type TxType = "expense" | "income" | "transfer";
type CatKind = "expense" | "income";
type CatFilter = "all" | "none" | (string & {});
type JMonthKey = { jy: number; jm: number };

const UNCAT_COLOR = PALETTE[9]!;

const monthOrder = (m: JMonthKey) => m.jy * 12 + m.jm;

// ---------------------------------------------------------------------------
// گفت‌وگوی تراکنش (ثبت و ویرایش)
// ---------------------------------------------------------------------------

function TransactionDialog({
  open,
  onOpenChange,
  categories,
  accounts,
  editing,
  defaultMonth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  accounts: Account[];
  editing: Transaction | null;
  defaultMonth: JMonthKey;
}) {
  const create = useMutation(api.ledger.createTransaction);
  const update = useMutation(api.ledger.updateTransaction);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [dateG, setDateG] = useState(todayGregorianKey());
  const [categoryId, setCategoryId] = useState("none");
  const [accountId, setAccountId] = useState("none");
  const [transferTo, setTransferTo] = useState("none");
  const [note, setNote] = useState("");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const defaultDateG = () =>
    monthOrder(defaultMonth) === monthOrder(todayJ())
      ? todayGregorianKey()
      : jalaliToGregorian(defaultMonth.jy, defaultMonth.jm, 1);

  const dialogKey = editing ? `edit-${editing._id}` : "create";
  const [lastKey, setLastKey] = useState(dialogKey);
  if (dialogKey !== lastKey) {
    setLastKey(dialogKey);
    if (editing) {
      setType(editing.type);
      setAmount(faDigits(editing.amount));
      setDateG(editing.date);
      setCategoryId(
        editing.categoryId && categories.some((c) => c._id === editing.categoryId)
          ? editing.categoryId
          : "none",
      );
      setAccountId(
        editing.accountId && accounts.some((a) => a._id === editing.accountId)
          ? editing.accountId
          : "none",
      );
      setTransferTo(
        editing.type === "transfer" && editing.transferToId && accounts.some((a) => a._id === editing.transferToId)
          ? editing.transferToId
          : "none",
      );
      setNote(editing.note ?? "");
      setReceipt(editing.receipt ?? null);
    } else {
      setType("expense");
      setAmount("");
      setDateG(defaultDateG());
      setCategoryId("none");
      setAccountId("none");
      setTransferTo("none");
      setNote("");
      setReceipt(null);
    }
  }

  const pool = categories.filter((c) => c.kind === type);
  const [prevType, setPrevType] = useState(type);
  if (prevType !== type) {
    setPrevType(type);
    if (categoryId !== "none" && !pool.some((c) => c._id === categoryId)) {
      setCategoryId("none");
    }
  }

  const dateJ = useMemo(() => gregorianToJalali(dateG), [dateG]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(normalizeDigits(amount).trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("مبلغ باید عددی بزرگ‌تر از صفر باشد");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        amount: parsed,
        date: dateG,
        type,
        categoryId:
          type === "transfer" || categoryId === "none"
            ? undefined
            : (categoryId as Id<"categories">),
        accountId:
          accountId === "none" ? undefined : (accountId as Id<"accounts">),
        transferToId:
          type === "transfer" && transferTo !== "none"
            ? (transferTo as Id<"accounts">)
            : undefined,
        note: note.trim() || undefined,
        receipt: receipt ?? undefined,
      };
      if (editing) {
        await update({ id: editing._id, ...payload });
        toast.success("تراکنش به‌روزرسانی شد");
      } else {
        await create(payload);
        toast.success("تراکنش ثبت شد");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {editing ? "ویرایش تراکنش" : "تراکنش تازه"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "جزئیات را ویرایش کنید."
              : `ثبت درآمد یا هزینه برای ${jMonthLabel(defaultMonth.jy, defaultMonth.jm)}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            {(["expense", "income", "transfer"] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setType(k)}
                className={cn(
                  "h-9 rounded-[4px] border text-sm transition-colors",
                  type === k
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {k === "expense" ? "هزینه" : k === "income" ? "درآمد" : "انتقال"}
              </button>
            ))}
          </div>

          {type === "transfer" && (
            <p className="rounded-[4px] border border-dashed px-3 py-2 text-xs leading-5 text-muted-foreground">
              انتقال پول میان حساب‌های خودتان است؛ نه هزینه و نه درآمد.
            </p>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="tx-amount">مبلغ (تومان)</Label>
            <Input
              id="tx-amount"
              inputMode="decimal"
              placeholder="۰"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>تاریخ</Label>
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start bg-card font-normal"
                  >
                    <CalendarDays className="size-4 text-muted-foreground" />
                    {jDateLabel(dateG)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <JalaliDatePicker
                    value={dateJ}
                    onChange={(v: JDateParts) => {
                      setDateG(jalaliToGregorian(v.jy, v.jm, v.jd));
                      setPickerOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-1.5">
              <Label>{type === "transfer" ? "از حساب" : "حساب"}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون حساب</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === "transfer" && (
            <div className="grid gap-1.5">
              <Label>به حساب</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">انتخاب مقصد…</SelectItem>
                  {accounts
                    .filter((a) => a._id !== accountId)
                    .map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== "transfer" && (
            <div className="grid gap-1.5">
              <Label>دسته‌بندی</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون دسته</SelectItem>
                  {pool.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="tx-note">یادداشت</Label>
            <Input
              id="tx-note"
              placeholder="توضیح کوتاه (اختیاری)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {type !== "transfer" && (
          <div className="grid gap-1.5">
            <Label>رسید (اختیاری)</Label>
            {receipt ? (
              <div className="flex items-center gap-3 rounded-[4px] border bg-card p-2">
                <img
                  src={receipt}
                  alt="پیوست رسید"
                  className="size-14 rounded-[3px] border object-cover"
                />
                <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                  رسید پیوست شد
                </div>
                <button
                  type="button"
                  aria-label="حذف رسید"
                  className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-destructive"
                  onClick={() => setReceipt(null)}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-[4px] border border-dashed px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground">
                <Paperclip className="size-3.5" />
                {receiptBusy ? "در حال پردازش تصویر…" : "پیوست عکس رسید"}
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={receiptBusy}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setReceiptBusy(true);
                    try {
                      const dataUrl = await fileToReceiptDataUrl(f);
                      setReceipt(dataUrl);
                    } catch (err) {
                      toast.error(
                        err instanceof Error ? err.message : "تصویر پردازش نشد",
                      );
                    } finally {
                      setReceiptBusy(false);
                    }
                  }}
                />
              </label>
            )}
          </div>
          )}

          <DialogFooter className="mt-1">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              انصراف
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "در حال ذخیره…" : editing ? "ذخیرهٔ تغییرها" : "ثبت"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// مدیریت دسته‌بندی‌ها (با بودجه)
// ---------------------------------------------------------------------------

function CategoryManager({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
}) {
  const create = useMutation(api.ledger.createCategory);
  const update = useMutation(api.ledger.updateCategory);
  const remove = useMutation(api.ledger.deleteCategory);
  const saveBudget = useMutation(api.ledger.setCategoryBudget);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CatKind>("expense");
  const [color, setColor] = useState(PALETTE[0]!);
  const [budget, setBudgetInput] = useState("");
  const [editingId, setEditingId] = useState<Id<"categories"> | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setKind("expense");
    setColor(PALETTE[0]!);
    setBudgetInput("");
  };

  const startEdit = (c: Category) => {
    setEditingId(c._id);
    setName(c.name);
    setKind(c.kind);
    setColor(c.color);
    setBudgetInput(c.budget ? faDigits(c.budget) : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const budgetNum = budget.trim()
        ? Number(normalizeDigits(budget))
        : undefined;
      if (editingId) {
        await update({ id: editingId, name: name.trim(), color });
        if (kind === "expense") {
          await saveBudget({
            id: editingId,
            budget: budgetNum && budgetNum > 0 ? budgetNum : undefined,
          });
        }
        toast.success("دسته‌بندی به‌روزرسانی شد");
      } else {
        const id = await create({ name: name.trim(), kind, color });
        if (kind === "expense" && budgetNum && budgetNum > 0) {
          await saveBudget({ id, budget: budgetNum });
        }
        toast.success("دسته‌بندی ساخته شد");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await remove({ id: deleting._id });
      toast.success("دسته حذف شد؛ تراکنش‌هایش بدون دسته شدند");
      setDeleting(null);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">دسته‌بندی‌ها</DialogTitle>
            <DialogDescription>
              تالارهای شخصی شما — هر تراکنش زیر یکی از این‌ها ثبت می‌شود.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={submit}
            className="grid gap-3 rounded-[4px] border bg-secondary/40 p-4"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="cat-name">نام</Label>
              <Input
                id="cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً خوراک"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>نوع</Label>
                <div className="grid grid-cols-2 gap-1">
                  {(["expense", "income"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      disabled={!!editingId}
                      onClick={() => setKind(k)}
                      className={cn(
                        "h-8 rounded-[4px] border text-xs transition-colors disabled:opacity-50",
                        kind === k
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {k === "expense" ? "هزینه" : "درآمد"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>رنگ</Label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PALETTE.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      aria-label={`رنگ ${hex}`}
                      onClick={() => setColor(hex)}
                      className={cn(
                        "size-5 rounded-full border transition-transform",
                        color === hex
                          ? "border-foreground scale-110"
                          : "border-transparent hover:scale-105",
                      )}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {kind === "expense" && (
              <div className="grid gap-1.5">
                <Label htmlFor="cat-budget">بودجهٔ ماهانه (اختیاری)</Label>
                <Input
                  id="cat-budget"
                  inputMode="decimal"
                  value={budget}
                  onChange={(e) => setBudgetInput(e.target.value)}
                  placeholder="مثلاً ۲٬۰۰۰٬۰۰۰"
                />
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <Button type="submit" size="sm" disabled={busy || !name.trim()}>
                {editingId ? "ذخیرهٔ تغییرها" : "افزودن دسته"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  انصراف
                </Button>
              )}
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mr-auto text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleting(
                      categories.find((c) => c._id === editingId) ?? null,
                    );
                  }}
                >
                  <Trash2 className="size-3.5" />
                  حذف
                </Button>
              )}
            </div>
          </form>

          <div className="grid gap-4 sm:grid-cols-2">
            {(["expense", "income"] as const).map((k) => (
              <div key={k} className="grid gap-2">
                <p className="eyebrow">{k === "expense" ? "هزینه‌ها" : "درآمدها"}</p>
                <div className="grid gap-1.5">
                  {categories
                    .filter((c) => c.kind === k)
                    .map((c) => (
                      <div
                        key={c._id}
                        className="group flex items-center gap-2.5 rounded-[4px] border bg-card px-3 py-2"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{c.name}</span>
                          {c.budget ? (
                            <span className="block text-[11px] text-muted-foreground">
                              بودجه: {faDigits(c.budget)}
                            </span>
                          ) : null}
                        </span>
                        <button
                          type="button"
                          aria-label={`ویرایش ${c.name}`}
                          className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => startEdit(c)}
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label={`حذف ${c.name}`}
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setDeleting(c)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  {categories.filter((c) => c.kind === k).length === 0 && (
                    <p className="rounded-[4px] border border-dashed px-3 py-2 text-xs text-muted-foreground">
                      هنوز چیزی نیست.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">حذف دسته؟</DialogTitle>
            <DialogDescription>
              {deleting
                ? `«${deleting.name}» حذف می‌شود. تراکنش‌های آن می‌مانند، اما بدون دسته خواهند شد.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              نگه‌داشتن
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// داشبورد
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const categories = useQuery(api.ledger.listCategories) as Category[] | undefined;
  const transactions = useQuery(api.ledger.listTransactions, {}) as Transaction[] | undefined;
  const accounts = useQuery(api.accounts.list) as Account[] | undefined;
  const debts = useQuery(api.debts.list);
  const subscriptions = useQuery(api.recurring.list);
  const ensureSeed = useMutation(api.ledger.ensureSeed);
  const removeTx = useMutation(api.ledger.deleteTransaction);
  const exportAllData = useQuery(api.ledger.exportAll);
  const peers = useQuery(api.users.ledgerPeers);

  const [monthJ, setMonthJ] = useState<JMonthKey>(() => {
    const t = todayJ();
    return { jy: t.jy, jm: t.jm };
  });
  const [scope, setScope] = useState<TxType>("expense");
  const [filter, setFilter] = useState<CatFilter>("all");
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState<UnitId>("toman");
  const [txOpen, setTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [debtsOpen, setDebtsOpen] = useState(false);
  const [subsOpen, setSubsOpen] = useState(false);
  const [householdOpen, setHouseholdOpen] = useState(false);
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<Transaction | null>(null);

  // چیدمان شخصی کارت‌های داشبورد — ترتیب/پنهان‌سازی روی همین دستگاه (v2.4.0)
  const widgets = useWidgetState();
  // دفتر فعال (شخصی یا خانوار) — برای نشانِ انتخاب دفتر در سربرگ
  const myHousehold = useQuery(api.households.myHousehold);
  const activeLedgerName = myHousehold ? myHousehold.name : "دفتر شخصی";

  const exportAllJson = () => {
    if (
      !confirm(
        "خروجی کامل از همهٔ داده‌ها (دسته‌ها، حساب‌ها، تراکنش‌ها، طلب‌ها و پرداخت‌های تکراری) به‌صورت فایل JSON گرفته شود؟",
      )
    )
      return;
    if (!exportAllData) {
      toast.error("داده‌ها هنوز بارگذاری نشده‌اند");
      return;
    }
    try {
      downloadJson(`daftar-backup-${todayGregorianKey()}.json`, {
        app: "daftar-man",
        version: VERSION,
        exportedAt: new Date().toISOString(),
        ...exportAllData,
      });
      toast.success("فایل پشتیبان JSON دانلود شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    }
  };

  // دسته‌های پیش‌فرض، فقط یک بار در هر نشست
  const seedAttempted = useRef(false);
  useEffect(() => {
    if (
      categories !== undefined &&
      categories.length === 0 &&
      !seedAttempted.current
    ) {
      seedAttempted.current = true;
      void ensureSeed();
    }
  }, [categories, ensureSeed]);

  const byId = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories ?? []) m.set(c._id, c);
    return m;
  }, [categories]);

  const accById = useMemo(() => {
    const m = new Map<string, Account>();
    for (const a of accounts ?? []) m.set(a._id, a);
    return m;
  }, [accounts]);

  const allTxs = useMemo(() => transactions ?? [], [transactions]);

  // تراکنش‌های ماه جلالی — ماه شمسی با ماه میلادی یکی نیست
  const monthTxs = useMemo(
    () =>
      allTxs.filter((t) => {
        const j = gregorianToJalali(t.date);
        return j.jy === monthJ.jy && j.jm === monthJ.jm;
      }),
    [allTxs, monthJ],
  );

  const monthTransfers = useMemo(
    () => monthTxs.filter((t) => t.type === "transfer"),
    [monthTxs],
  );

  const stats = useMemo(() => {
    // انتقال میان حساب‌ها نه درآمد است و نه هزینه — از آمار ماه حذف می‌شود (v1.5.0)
    let income = 0;
    let expense = 0;
    for (const t of monthTxs) {
      if (t.type === "income") income += t.amount;
      else if (t.type === "expense") expense += t.amount;
    }
    return { income, expense, net: income - expense };
  }, [monthTxs]);

  const chartTxs = useMemo(
    () => monthTxs.filter((t) => t.type === scope),
    [monthTxs, scope],
  );

  // نمای سالانه — ۱۲ ماه شمسیِ سال جاری (v1.5.0)
  const yearSums = useMemo(() => {
    const now = todayJ();
    const m = new Map<string, { income: number; expense: number }>();
    for (const t of allTxs) {
      if (t.type === "transfer") continue;
      const j = gregorianToJalali(t.date);
      if (j.jy !== now.jy) continue;
      const key = `${j.jy}-${j.jm}`;
      const cur = m.get(key) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += t.amount;
      else cur.expense += t.amount;
      m.set(key, cur);
    }
    let income = 0;
    let expense = 0;
    for (let jm = 1; jm <= 12; jm++) {
      const s = m.get(`${now.jy}-${jm}`);
      if (s) {
        income += s.income;
        expense += s.expense;
      }
    }
    return { sums: m, income, expense, net: income - expense, jy: now.jy };
  }, [allTxs]);

  const series = useMemo(() => {
    const totals = new Map<string, number>();
    for (const t of chartTxs) {
      const key = t.categoryId ?? "none";
      totals.set(key, (totals.get(key) ?? 0) + t.amount);
    }
    const rows = [...totals.entries()].map(([key, total]) => {
      const cat = key === "none" ? undefined : byId.get(key);
      return {
        key,
        name: cat?.name ?? "بدون دسته",
        color: key === "none" ? UNCAT_COLOR : cat!.color,
        total,
      };
    });
    rows.sort((a, b) => b.total - a.total);
    const grand = rows.reduce((s, r) => s + r.total, 0);
    return { rows, grand };
  }, [chartTxs, byId]);

  // روند ۶ ماه بر پایهٔ کلید شمسی
  const trendSums = useMemo(() => {
    const m = new Map<string, { income: number; expense: number }>();
    for (const t of allTxs) {
      const j = gregorianToJalali(t.date);
      const key = `${j.jy}-${j.jm}`;
      const cur = m.get(key) ?? { income: 0, expense: 0 };
      if (t.type === "income") cur.income += t.amount;
      else cur.expense += t.amount;
      m.set(key, cur);
    }
    return m;
  }, [allTxs]);

  // بودجهٔ دسته‌های هزینه‌دار
  const budgets = useMemo(() => {
    const spentByCat = new Map<string, number>();
    for (const t of monthTxs) {
      if (t.type !== "expense" || !t.categoryId) continue;
      spentByCat.set(
        t.categoryId,
        (spentByCat.get(t.categoryId) ?? 0) + t.amount,
      );
    }
    return (categories ?? [])
      .filter((c) => c.kind === "expense" && c.budget && c.budget > 0)
      .map((c) => ({
        cat: c,
        budget: c.budget!,
        spent: spentByCat.get(c._id) ?? 0,
      }))
      .sort(
        (a, b) =>
          b.spent / b.budget - a.spent / a.budget,
      );
  }, [categories, monthTxs]);

  const filteredTxs = useMemo(() => {
    let rows = [...monthTxs];
    if (filter !== "all") {
      if (filter === "none") rows = rows.filter((t) => !t.categoryId);
      else rows = rows.filter((t) => t.categoryId === filter);
    }
    const q = query.trim();
    if (q) {
      rows = rows.filter((t) => {
        const cat = t.categoryId ? byId.get(t.categoryId)?.name : undefined;
        const acc = t.accountId ? accById.get(t.accountId)?.name : undefined;
        return (
          (t.note ?? "").includes(q) ||
          (cat ?? "").includes(q) ||
          (acc ?? "").includes(q) ||
          String(t.amount).includes(normalizeDigits(q)) ||
          faDigits(t.amount).includes(q)
        );
      });
    }
    return rows.sort((a, b) =>
      a.date === b.date
        ? (b._creationTime ?? 0) - (a._creationTime ?? 0)
        : a.date < b.date
          ? 1
          : -1,
    );
  }, [monthTxs, filter, query, byId, accById]);

  const chartConfig = useMemo(() => {
    const cfg: ChartConfig = {};
    for (const r of series.rows) cfg[r.key] = { label: r.name, color: r.color };
    return cfg;
  }, [series]);

  const currentJ = todayJ();
  const isCurrentMonth =
    monthOrder(monthJ) === monthOrder({ jy: currentJ.jy, jm: currentJ.jm });

  const topShare =
    series.grand > 0 && series.rows.length > 0
      ? Math.round((series.rows[0]!.total / series.grand) * 100)
      : 0;

  const totalBalance = useMemo(() => {
    if (!accounts) return 0;
    return accounts.reduce(
      (s, a) => s + accountBalance(a, allTxs),
      0,
    );
  }, [accounts, allTxs]);

  const monthReport = () =>
    printMonthReport({
      jy: monthJ.jy,
      jm: monthJ.jm,
      unit,
      stats: { income: stats.income, expense: stats.expense, net: stats.net },
      transfers: monthTransfers.map((t) => ({
        day: jDateLabel(t.date),
        amount: t.amount,
        from: t.accountId ? (accById.get(t.accountId)?.name ?? "—") : "—",
        to: t.transferToId ? (accById.get(t.transferToId)?.name ?? "—") : "—",
        note: t.note,
      })),
      categories: series.rows.map((r) => ({ name: r.name, color: r.color, total: r.total, pct: Math.round((r.total / series.grand) * 100) })),
      scope: scope === "expense" ? ("هزینه" as const) : ("درآمد" as const),
      txCount: filteredTxs.length,
    });

  const exportCsv = () => {
    const header = [
      "تاریخ شمسی",
      "تاریخ میلادی",
      "نوع",
      "دسته",
      "حساب",
      "مبلغ (تومان)",
      "یادداشت",
    ];
    const rows = [...monthTxs]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .map((t) => [
        jDateLabel(t.date),
        t.date,
        t.type === "income" ? "درآمد" : t.type === "transfer" ? "انتقال" : "هزینه",
        t.categoryId ? (byId.get(t.categoryId)?.name ?? "") : "",
        t.accountId ? (accById.get(t.accountId)?.name ?? "") : "",
        t.amount,
        t.note ?? "",
      ]);
    downloadCsv(`daftar-${monthJ.jy}-${String(monthJ.jm).padStart(2, "0")}.csv`, [
      header,
      ...rows,
    ]);
    toast.success("خروجی CSV دانلود شد");
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const loading =
    categories === undefined ||
    transactions === undefined ||
    accounts === undefined ||
    debts === undefined ||
    subscriptions === undefined;

  return (
    <div className="min-h-screen bg-background">
      {/* سربرگ */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:h-16 sm:gap-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <LedgerMark className="size-7 shrink-0 text-foreground" />
            <span className="truncate font-display text-base sm:text-lg">دفتر من</span>
            <Link
              to="/about"
              title="درباره و نسخه‌ها"
              className="shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              v{faDigits(VERSION)}
            </Link>
          </div>
          <span className="mr-auto hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
            {user?.email ?? "دفتر خصوصی"}
          </span>
          <button
            aria-label={theme === "dark" ? "تم روشن" : "تم تیره"}
            title={theme === "dark" ? "تم روشن" : "تم تیره"}
            onClick={toggleTheme}
            className="grid size-8 place-items-center rounded-[3px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {theme === "dark" ? (
              <Sun className="size-4" strokeWidth={1.5} />
            ) : (
              <Moon className="size-4" strokeWidth={1.5} />
            )}
          </button>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            خروج
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
        {/* ردیف عنوان */}
        <div className="flex flex-col gap-6 pt-8 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => setHouseholdOpen(true)}
              title="مدیریت دفترها — انتخاب یا ویرایش خانوار"
              className="group inline-flex max-w-full items-center gap-1.5 rounded-[4px] border border-transparent px-1.5 py-0.5 text-left transition-colors hover:border-border hover:bg-accent"
            >
              <p className="eyebrow shrink-0">دفتر:</p>
              <p className="truncate text-[11px] font-medium text-foreground/80 group-hover:text-foreground">
                {activeLedgerName}
              </p>
              <Pencil className="size-2.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
            <h1 className="mt-2 font-display text-3xl font-medium sm:text-4xl">
              {jMonthLabel(monthJ.jy, monthJ.jm)}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              دفتر این ماه، مرتب‌شده بر پایهٔ دسته‌بندی‌ها — هر سند در جای خودش.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 items-center rounded-[4px] border">
              <button
                aria-label="ماه قبل"
                className="grid size-9 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMonthJ((m) => jShift(m, -1))}
              >
                <ChevronRight className="size-4" />
              </button>
              <button
                className="h-9 border-x px-3 text-xs font-medium transition-colors hover:bg-accent"
                onClick={() => {
                  const t = todayJ();
                  setMonthJ({ jy: t.jy, jm: t.jm });
                }}
                title="رفتن به ماه جاری"
              >
                {jMonthLabel(monthJ.jy, monthJ.jm)}
              </button>
              <button
                aria-label="ماه بعد"
                className="grid size-9 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMonthJ((m) => jShift(m, 1))}
                disabled={isCurrentMonth}
              >
                <ChevronLeft className="size-4" />
              </button>
            </div>
            <div className="flex items-center rounded-[4px] border p-0.5">
              {UNITS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUnit(u.id)}
                  className={cn(
                    "h-8 rounded-[3px] px-2.5 text-xs transition-colors",
                    unit === u.id
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ردیف ابزارها */}
        <div className="flex flex-wrap items-center gap-2 pb-6">
          <Button
            size="sm"
            onClick={() => {
              setEditingTx(null);
              setTxOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            تراکنش تازه
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCatsOpen(true)}>
            <Tags className="size-3.5" />
            دسته‌بندی‌ها
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAccountsOpen(true)}>
            <Wallet className="size-3.5" />
            حساب‌ها
          </Button>
          <Button variant="outline" size="sm" onClick={() => setDebtsOpen(true)}>
            <HandCoins className="size-3.5" />
            طلب و بدهی
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSubsOpen(true)}>
            <Repeat className="size-3.5" />
            پرداخت‌های تکراری
          </Button>
          <Button variant="outline" size="sm" onClick={() => setHouseholdOpen(true)}>
            <Users className="size-3.5" />
            خانوار
          </Button>
          <WidgetSettingsMenu
            order={widgets.order}
            hidden={widgets.hidden}
            onMove={widgets.move}
            onToggle={widgets.toggleHidden}
            onReset={widgets.reset}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={monthReport}
            title="چاپ گزارش این ماه"
          >
            <Printer className="size-3.5" />
            چاپ گزارش
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportAllJson()}
            title="پشتیبان‌گیری کامل از همهٔ داده‌ها"
          >
            <HardDriveDownload className="size-3.5" />
            <span className="hidden sm:inline">پشتیبان JSON</span>
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
            در حال بارگذاری دفتر…
          </div>
        ) : (
          <>
            {/* نوار حساب‌ها */}
            <div className="accounts-rail mb-6 flex gap-3 overflow-x-auto pb-1">
              <div className="min-w-36 shrink-0 rounded-[4px] border bg-card px-4 py-3">
                <p className="eyebrow">موجودی کل</p>
                <p className="mt-1.5 font-display text-lg tabular-nums">
                  {formatMoneyIn(totalBalance, unit)}
                </p>
              </div>
              {(accounts ?? []).map((a) => (
                <div
                  key={a._id}
                  className="min-w-36 shrink-0 rounded-[4px] border bg-card px-4 py-3"
                >
                  <p className="eyebrow truncate">{a.name}</p>
                  <p className="mt-1.5 font-display text-lg tabular-nums">
                    {formatMoneyIn(accountBalance(a, allTxs), unit)}
                  </p>
                </div>
              ))}
              {(accounts ?? []).length === 0 && (
                <button
                  type="button"
                  onClick={() => setAccountsOpen(true)}
                  className="min-w-36 shrink-0 rounded-[4px] border border-dashed px-4 py-3 text-right text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  حسابی نساخته‌اید — برای شروع کلیک کنید
                </button>
              )}
            </div>

            {/* آمار ماه */}
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "درآمد", value: stats.income },
                { label: "هزینه‌ها", value: stats.expense },
                { label: "تراز", value: stats.net },
              ].map((s, i) => (
                <Card
                  key={s.label}
                  className="gap-3 rounded-[4px] border-border/70 py-5 shadow-none"
                >
                  <CardContent className="px-5">
                    <p className="eyebrow">{s.label}</p>
                    <p
                      className={cn(
                        "mt-2 truncate font-display text-xl tabular-nums sm:text-2xl",
                        i === 2 && stats.net < 0 && "text-destructive",
                      )}
                      title={formatMoneyIn(s.value, unit)}
                    >
                      {formatMoneyIn(s.value, unit)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* تختهٔ کارت‌ها — masonry دوستونه با ترتیب شخصی (v2.4.0):
                کارت‌ها در دو ستون متوازن جریان می‌یابند؛ نه «مثل قطار» زیر هم،
                نه نصف صفحهٔ خالی. ترتیب از منوی «چیدمان» قابل تغییر است. */}
            <div className="board-columns mt-10 columns-1 gap-6 md:columns-2">
                <Card className="break-inside-avoid gap-5 rounded-[4px] border-border/70 py-6 shadow-none">
                  <CardHeader className="px-6">
                    <CardAction>
                      <Tabs
                        value={scope}
                        onValueChange={(v) => setScope(v as TxType)}
                      >
                        <TabsList className="h-8 rounded-[4px] bg-secondary p-0.5">
                          <TabsTrigger
                            value="expense"
                            className="h-7 rounded-[3px] px-3 text-xs"
                          >
                            هزینه‌ها
                          </TabsTrigger>
                          <TabsTrigger
                            value="income"
                            className="h-7 rounded-[3px] px-3 text-xs"
                          >
                            درآمدها
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </CardAction>
                    <CardTitle className="font-display text-xl">
                      {scope === "expense"
                        ? "هزینه‌ها به تفکیک دسته"
                        : "درآمدها به تفکیک دسته"}
                    </CardTitle>
                    <CardDescription>
                      {series.grand > 0
                        ? `${formatMoneyIn(series.grand, unit)} در ${faDigits(series.rows.length)} دسته`
                        : "برای این ماه هنوز سندی ثبت نشده است"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6">
                    {series.grand > 0 ? (
                      <>
                        <div className="flex flex-col items-center gap-8 sm:flex-row">
                          <ChartContainer
                            config={chartConfig}
                            className="mx-auto aspect-square max-h-56 w-56 shrink-0"
                          >
                            <PieChart>
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    hideLabel
                                    formatter={(value, name) => (
                                      <div className="flex w-full items-center justify-between gap-4">
                                        <span className="text-muted-foreground">
                                          {chartConfig[name as string]?.label ?? name}
                                        </span>
                                        <span className="font-medium tabular-nums">
                                          {formatMoneyIn(Number(value), unit)}
                                        </span>
                                      </div>
                                    )}
                                  />
                                }
                              />
                              <Pie
                                data={series.rows}
                                dataKey="total"
                                nameKey="key"
                                innerRadius="62%"
                                outerRadius="92%"
                                paddingAngle={2}
                                stroke="var(--card)"
                                strokeWidth={1}
                              >
                                {series.rows.map((r) => (
                                  <Cell key={r.key} fill={r.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                          <div className="grid w-full gap-2.5">
                            {series.rows.map((r) => {
                              const pct = Math.round((r.total / series.grand) * 100);
                              return (
                                <div key={r.key} className="grid gap-1">
                                  <div className="flex items-baseline justify-between gap-3 text-sm">
                                    <span className="flex min-w-0 items-center gap-2">
                                      <span
                                        className="size-2 shrink-0 rounded-full"
                                        style={{ backgroundColor: r.color }}
                                      />
                                      <span className="truncate">{r.name}</span>
                                    </span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">
                                      {formatMoneyIn(r.total, unit)}
                                      <span className="mr-1.5 text-xs">
                                        · {faDigits(pct)}٪
                                      </span>
                                    </span>
                                  </div>
                                  <div className="h-px w-full bg-border/70">
                                    <motion.div
                                      className="h-px bg-foreground/70"
                                      initial={{ scaleX: 0 }}
                                      animate={{ scaleX: pct / 100 }}
                                      style={{ originX: 1 }}
                                      transition={{ duration: 0.6, ease: "easeOut" }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {topShare > 0 && (
                          <p className="mt-5 border-t pt-4 text-xs leading-5 text-muted-foreground">
                            بیشترین سهم این ماه{" "}
                            <span className="text-foreground">
                              {series.rows[0]!.name}
                            </span>{" "}
                            است — با سهم {faDigits(topShare)}٪ از{" "}
                            {scope === "expense" ? "خرج" : "درآمد"}.
                          </p>
                        )}
                      </>
                    ) : (
                      <div className="grid place-items-center gap-2 rounded-[4px] border border-dashed py-14 text-center">
                        <p className="font-display text-lg">دفتر خالی</p>
                        <p className="max-w-xs text-sm text-muted-foreground">
                          نخستین تراکنش {scope === "expense" ? "هزینه" : "درآمد"} خود
                          را ثبت کنید تا در دفتر بنشیند.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* نمای سالانه */}
                <Card className="break-inside-avoid gap-4 rounded-[4px] border-border/70 py-6 shadow-none">
                  <CardHeader className="px-6">
                    <CardTitle className="font-display text-xl">
                      نمای سالانه — سال {faDigits(yearSums.jy)}
                    </CardTitle>
                    <CardDescription>
                      جمع دوازده‌ماههٔ درآمد و هزینه
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        { label: "درآمد سال", value: yearSums.income },
                        { label: "هزینهٔ سال", value: yearSums.expense },
                        { label: "تراز سال", value: yearSums.net },
                      ].map((s, i) => (
                        <div key={s.label} className="rounded-[4px] border bg-card p-4">
                          <p className="eyebrow">{s.label}</p>
                          <p
                            className={cn(
                              "mt-1.5 font-display text-lg tabular-nums",
                              i === 2 && yearSums.net < 0 && "text-destructive",
                            )}
                          >
                            {formatMoneyIn(s.value, unit)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 grid gap-2">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((jm) => {
                        const s = yearSums.sums.get(`${yearSums.jy}-${jm}`) ?? {
                          income: 0,
                          expense: 0,
                        };
                        const net = s.income - s.expense;
                        const max = Math.max(
                          ...Array.from({ length: 12 }, (_, k) => {
                            const v = yearSums.sums.get(`${yearSums.jy}-${k + 1}`);
                            return v ? Math.max(v.income, v.expense) : 0;
                          }),
                          1,
                        );
                        return (
                          <div key={jm} className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
                            <span className="w-16 shrink-0 text-xs text-muted-foreground">
                              {jMonthLabel(yearSums.jy, jm).split(" ")[0]}
                            </span>
                            <span className="flex h-2 items-center gap-px">
                              <span
                                className="h-2 rounded-l-sm bg-chart-2/80"
                                style={{ width: `${(s.income / max) * 100}%` }}
                              />
                              <span
                                className="h-2 rounded-r-sm bg-chart-4/80"
                                style={{ width: `${(s.expense / max) * 100}%` }}
                              />
                            </span>
                            <span
                              className={cn(
                                "w-24 shrink-0 text-left text-xs tabular-nums text-muted-foreground",
                                net < 0 && "text-destructive",
                              )}
                            >
                              {formatMoneyIn(net, unit)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* روند ۶ ماه */}
                <Card className="break-inside-avoid gap-4 rounded-[4px] border-border/70 py-6 shadow-none">
                  <CardHeader className="px-6">
                    <CardTitle className="font-display text-xl">
                      روند شش‌ماهه
                    </CardTitle>
                    <CardDescription>
                      درآمد در برابر هزینه، ماه به ماه
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6">
                    <TrendChart sumsByJMonth={trendSums} />
                  </CardContent>
                </Card>

                {/* انتقال‌های میان حساب‌ها */}
                {monthTransfers.length > 0 && (
                  <Card className="break-inside-avoid gap-4 rounded-[4px] border-border/70 py-6 shadow-none">
                    <CardHeader className="px-6">
                      <CardTitle className="font-display text-xl">
                        انتقال‌های این ماه
                      </CardTitle>
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
                                {t.accountId ? (accById.get(t.accountId)?.name ?? "حساب حذف‌شده") : "—"}
                                {" ← "}
                                {t.transferToId ? (accById.get(t.transferToId)?.name ?? "حساب حذف‌شده") : "—"}
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
                )}

                {/* بودجه‌ها */}
                <Card className="break-inside-avoid gap-4 rounded-[4px] border-border/70 py-6 shadow-none">
                  <CardHeader className="px-6">
                    <CardAction>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCatsOpen(true)}
                      >
                        <Tags className="size-3.5" />
                        ویرایش بودجه‌ها
                      </Button>
                    </CardAction>
                    <CardTitle className="font-display text-xl">بودجهٔ ماه</CardTitle>
                    <CardDescription>
                      {budgets.length > 0
                        ? "سهم هر دسته از بودجهٔ ماهانه‌اش"
                        : "برای دسته‌های هزینه، بودجهٔ ماهانه تعیین کنید"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-6">
                    {budgets.length === 0 ? (
                      <p className="rounded-[4px] border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                        مثلاً برای «خوراک» سقف ماهانه بگذارید و مصرفش را همین‌جا ببینید.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {budgets.map(({ cat, budget, spent }) => {
                          const pct = Math.min(
                            100,
                            Math.round((spent / budget) * 100),
                          );
                          const over = spent > budget;
                          return (
                            <div key={cat._id} className="grid gap-1.5">
                              <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="flex min-w-0 items-center gap-2">
                                  <span
                                    className="size-2 shrink-0 rounded-full"
                                    style={{ backgroundColor: cat.color }}
                                  />
                                  <span className="truncate">{cat.name}</span>
                                </span>
                                <span
                                  className={cn(
                                    "shrink-0 tabular-nums text-muted-foreground",
                                    over && "text-destructive",
                                  )}
                                >
                                  {formatMoneyIn(spent, unit)} از{" "}
                                  {formatMoneyIn(budget, unit)}
                                  <span className="mr-1.5 text-xs">
                                    · {faDigits(pct)}٪
                                  </span>
                                </span>
                              </div>
                              <div className="h-1 w-full rounded-full bg-secondary">
                                <div
                                  className={cn(
                                    "h-1 rounded-full transition-all",
                                    over ? "bg-destructive" : "bg-foreground/70",
                                  )}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* تراکنش‌ها */}
                <Card className="min-w-0 break-inside-avoid gap-0 rounded-[4px] border-border/70 py-0 shadow-none">
                <CardHeader className="max-sm:px-4 gap-3 border-b px-5 py-5">
                  <CardAction className="max-sm:col-start-1 max-sm:row-start-2 max-sm:w-full max-sm:justify-self-stretch">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="جست‌وجو…"
                          className="h-8 w-32 bg-card pl-7 text-xs"
                        />
                      </div>
                      <Select
                        value={filter}
                        onValueChange={(v) => setFilter(v as CatFilter)}
                      >
                        <SelectTrigger size="sm" className="w-32 bg-card text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">همهٔ دسته‌ها</SelectItem>
                          {categories!.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}
                            </SelectItem>
                          ))}
                          <SelectItem value="none">بدون دسته</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="خروجی CSV"
                        title="خروجی CSV این ماه"
                        onClick={exportCsv}
                      >
                        <Download className="size-3.5" />
                      </Button>
                    </div>
                  </CardAction>
                  <CardTitle className="font-display text-xl">تراکنش‌ها</CardTitle>
                  <CardDescription>
                    {faDigits(filteredTxs.length)} سند در{" "}
                    {jMonthLabel(monthJ.jy, monthJ.jm)}
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
                                <p className="text-sm tabular-nums">
                                  {jDateLabel(t.date)}
                                </p>
                                {t.note && (
                                  <p className="mt-0.5 max-w-36 truncate text-xs text-muted-foreground">
                                    {t.note}
                                  </p>
                                )}
                                {t.receipt && (
                                  <button
                                    type="button"
                                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                                    onClick={() => setReceiptPreview(t)}
                                  >
                                    <Paperclip className="size-3" />
                                    رسید
                                  </button>
                                )}
                                {(() => {
                                  const peer = (
                                    peers as Array<{ id: string; label: string }> | undefined
                                  )?.find((p) => p.id === t.createdBy);
                                  if (!peer) return null;
                                  return (
                                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                                      ثبت {peer.label}
                                    </p>
                                  );
                                })()}
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
                                  <span className="text-sm text-muted-foreground">
                                    —
                                  </span>
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
                                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                                  <button
                                    aria-label="ویرایش تراکنش"
                                    className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                                    onClick={() => {
                                      setEditingTx(t);
                                      setTxOpen(true);
                                    }}
                                  >
                                    <Pencil className="size-3" />
                                  </button>
                                  <button
                                    aria-label="حذف تراکنش"
                                    className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-destructive"
                                    onClick={() => setDeletingTx(t)}
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
            </div>
          </>
        )}
      </main>

      {/* گفت‌وگوها */}
      <TransactionDialog
        open={txOpen}
        onOpenChange={setTxOpen}
        categories={categories ?? []}
        accounts={accounts ?? []}
        editing={editingTx}
        defaultMonth={monthJ}
      />
      <CategoryManager
        open={catsOpen}
        onOpenChange={setCatsOpen}
        categories={categories ?? []}
      />
      <AccountsDialog
        open={accountsOpen}
        onOpenChange={setAccountsOpen}
        accounts={accounts ?? []}
        transactions={allTxs}
        unit={unit}
      />
      <DebtsDialog
        open={debtsOpen}
        onOpenChange={setDebtsOpen}
        debts={debts ?? []}
        unit={unit}
      />
      <RecurringDialog
        open={subsOpen}
        onOpenChange={setSubsOpen}
        subscriptions={(subscriptions ?? []) as Subscription[]}
        categories={categories ?? []}
        accounts={accounts ?? []}
        unit={unit}
      />
      <HouseholdDialog open={householdOpen} onOpenChange={setHouseholdOpen} />
      <Dialog open={!!deletingTx} onOpenChange={(o) => !o && setDeletingTx(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">حذف سند؟</DialogTitle>
            <DialogDescription>
              {deletingTx
                ? `${formatMoneyIn(deletingTx.amount, unit)} در تاریخ ${jDateLabel(deletingTx.date)} از دفتر حذف می‌شود.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeletingTx(null)}>
              نگه‌داشتن
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!deletingTx) return;
                try {
                  await removeTx({ id: deletingTx._id });
                  toast.success("سند حذف شد");
                  setDeletingTx(null);
                } catch (err) {
                  toast.error(
                    err instanceof Error ? err.message : "خطایی رخ داد",
                  );
                }
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* پیش‌نمایش رسید */}
      <Dialog
        open={!!receiptPreview}
        onOpenChange={(o) => !o && setReceiptPreview(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">پیوست رسید</DialogTitle>
            <DialogDescription>
              {receiptPreview
                ? `${formatMoneyIn(receiptPreview.amount, unit)} · ${jDateLabel(receiptPreview.date)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {receiptPreview?.receipt && (
            <img
              src={receiptPreview.receipt}
              alt="پیوست رسید"
              className="max-h-[60vh] w-full rounded-[4px] border object-contain"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* دکمهٔ شناور افزودن (موبایل) */}
      <button
        aria-label="تراکنش تازه"
        className="fixed bottom-6 left-6 z-40 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 sm:hidden"
        onClick={() => {
          setEditingTx(null);
          setTxOpen(true);
        }}
      >
        <Plus className="size-5" />
      </button>
    </div>
  );
}
