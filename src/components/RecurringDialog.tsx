import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Pause, Pencil, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { faDigits, formatMoneyIn, normalizeDigits, type UnitId } from "@/lib/format";

export type Subscription = {
  _id: Id<"subscriptions">;
  title: string;
  amount: number;
  type: "income" | "expense";
  categoryId?: Id<"categories">;
  accountId?: Id<"accounts">;
  dayOfMonth: number;
  active: boolean;
  lastPosted?: string;
  note?: string;
};

type Category = { _id: Id<"categories">; name: string; kind: "income" | "expense" };
type Account = { _id: Id<"accounts">; name: string };

export function RecurringDialog({
  open,
  onOpenChange,
  subscriptions,
  categories,
  accounts,
  unit,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscriptions: Subscription[];
  categories: Category[];
  accounts: Account[];
  unit: UnitId;
  /** تعداد تراکنشی که این بار به‌طور خودکار ثبت شد */
  onPosted?: (count: number) => void;
}) {
  const create = useMutation(api.recurring.create);
  const update = useMutation(api.recurring.update);
  const toggle = useMutation(api.recurring.toggle);
  const remove = useMutation(api.recurring.remove);
  const runDue = useMutation(api.recurring.runDue);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [categoryId, setCategoryId] = useState("none");
  const [accountId, setAccountId] = useState("none");
  const [day, setDay] = useState("1");
  const [editingId, setEditingId] = useState<Id<"subscriptions"> | null>(null);
  const [deleting, setDeleting] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);

  const pool = categories.filter((c) => c.kind === type);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setAmount("");
    setType("expense");
    setCategoryId("none");
    setAccountId("none");
    setDay("1");
  };

  const startEdit = (s: Subscription) => {
    setEditingId(s._id);
    setTitle(s.title);
    setAmount(faDigits(s.amount));
    setType(s.type);
    setCategoryId(s.categoryId ?? "none");
    setAccountId(s.accountId ?? "none");
    setDay(faDigits(s.dayOfMonth));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const parsedAmount = Number(normalizeDigits(amount).trim());
    const parsedDay = Number(normalizeDigits(day).trim());
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error("مبلغ باید عددی بزرگ‌تر از صفر باشد");
      return;
    }
    if (!Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      toast.error("روز ماه باید عددی میان ۱ تا ۳۱ باشد");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        title: title.trim(),
        amount: parsedAmount,
        type,
        categoryId:
          categoryId === "none" ? undefined : (categoryId as Id<"categories">),
        accountId: accountId === "none" ? undefined : (accountId as Id<"accounts">),
        dayOfMonth: parsedDay,
      };
      if (editingId) {
        await update({ id: editingId, ...payload, active: true });
        toast.success("پرداخت تکراری به‌روزرسانی شد");
      } else {
        await create(payload);
        toast.success("پرداخت تکراری ساخته شد");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const handleToggle = async (s: Subscription) => {
    try {
      await toggle({ id: s._id, active: !s.active });
      toast.success(s.active ? "پرداخت متوقف شد" : "پرداخت فعال شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await remove({ id: deleting._id });
      toast.success("پرداخت تکراری حذف شد");
      setDeleting(null);
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const handleRunDue = async () => {
    setBusy(true);
    try {
      const { posted } = await runDue({});
      if (posted > 0) {
        toast.success(`${faDigits(posted)} تراکنش سرسید ثبت شد`);
        onPosted?.(posted);
      } else {
        toast("سرسید تازه‌ای نیست", { description: "همهٔ پرداخت‌ها تا امروز ثبت شده‌اند" });
      }
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
            <DialogTitle className="flex items-center gap-2 font-display text-2xl">
              <Repeat className="size-5 text-muted-foreground" strokeWidth={1.5} />
              پرداخت‌های تکراری
            </DialogTitle>
            <DialogDescription>
              اجاره، اشتراک‌ها و اقساط — هر ماه در سرسیدش خودکار ثبت می‌شود.
            </DialogDescription>
          </DialogHeader>

          {/* فهرست */}
          <div className="grid gap-2">
            {subscriptions.length === 0 && (
              <p className="rounded-[4px] border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                هنوز پرداخت تکراری‌ای نساخته‌اید — مثلاً «اجاره خانه» هر ماه روز ۱.
              </p>
            )}
            {subscriptions.map((s) => (
              <div
                key={s._id}
                className="flex items-center gap-3 rounded-[4px] border bg-card p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    {!s.active && (
                      <Badge
                        variant="outline"
                        className="rounded-[3px] px-1 py-0 text-[10px] text-muted-foreground"
                      >
                        متوقف
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                    هر ماه روز {faDigits(s.dayOfMonth)} ·{" "}
                    {formatMoneyIn(s.type === "expense" ? -s.amount : s.amount, unit, {
                      signed: s.type === "income",
                    })}
                  </p>
                </div>
                <Switch
                  checked={s.active}
                  onCheckedChange={() => handleToggle(s)}
                  aria-label={s.active ? "توقف پرداخت" : "فعال‌سازی پرداخت"}
                />
                <div className="flex gap-0.5">
                  <button
                    aria-label="ویرایش"
                    className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => startEdit(s)}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    aria-label="حذف"
                    className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-destructive"
                    onClick={() => setDeleting(s)}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {subscriptions.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRunDue}
              disabled={busy}
            >
              <Play className="size-3.5" />
              بررسی و ثبت سرسیدهای امروز
            </Button>
          )}

          {/* فرم */}
          <form onSubmit={submit} className="grid gap-3 border-t pt-4">
            <p className="eyebrow">
              {editingId ? "ویرایش پرداخت تکراری" : "پرداخت تکراری تازه"}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="sub-title">عنوان</Label>
                <Input
                  id="sub-title"
                  placeholder="مثلاً اجاره خانه"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sub-amount">مبلغ (تومان)</Label>
                <Input
                  id="sub-amount"
                  inputMode="numeric"
                  placeholder="۰"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>نوع</Label>
                <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">هزینه</SelectItem>
                    <SelectItem value="income">درآمد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>دسته</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
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
              <div className="grid gap-1.5">
                <Label>حساب</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="bg-card">
                    <SelectValue />
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
            <div className="grid gap-1.5 sm:w-40">
              <Label htmlFor="sub-day">روز ماه (شمسی)</Label>
              <Input
                id="sub-day"
                inputMode="numeric"
                placeholder="۱ تا ۳۱"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-1">
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetForm}
                >
                  انصراف از ویرایش
                </Button>
              )}
              <Button type="submit" disabled={busy}>
                <Plus className="size-3.5" />
                {editingId ? "ذخیرهٔ تغییرها" : "ساختن"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* تأیید حذف */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">حذف پرداخت تکراری؟</DialogTitle>
            <DialogDescription>
              {deleting
                ? `«${deleting.title}» دیگر هر ماه ثبت نمی‌شود. تراکنش‌های پیشین حذف نمی‌مانند.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              نگه‌داشتن
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              <Pause className="size-3.5" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
