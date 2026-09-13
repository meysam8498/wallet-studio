import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, HandCoins, Plus, Trash2 } from "lucide-react";
import {
  formatMoneyIn,
  jDateLabel,
  normalizeDigits,
  type UnitId,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export type Debt = {
  _id: Id<"debts">;
  person: string;
  amount: number;
  direction: "owed_to_me" | "owed_by_me";
  note?: string;
  dueDate?: string;
  settled: boolean;
};

export function DebtsDialog({
  open,
  onOpenChange,
  debts,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  debts: Debt[];
  unit: UnitId;
}) {
  const create = useMutation(api.debts.create);
  const toggle = useMutation(api.debts.toggleSettled);
  const remove = useMutation(api.debts.remove);

  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"owed_to_me" | "owed_by_me">(
    "owed_by_me",
  );
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(normalizeDigits(amount).trim());
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("مبلغ باید عددی بزرگ‌تر از صفر باشد");
      return;
    }
    setBusy(true);
    try {
      await create({
        person: person.trim(),
        amount: parsed,
        direction,
        note: note.trim() || undefined,
        dueDate: dueDate || undefined,
      });
      toast.success("ثبت شد");
      setPerson("");
      setAmount("");
      setNote("");
      setDueDate("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const act = async (fn: () => Promise<void>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    }
  };

  const toMe = debts.filter((d) => d.direction === "owed_to_me");
  const byMe = debts.filter((d) => d.direction === "owed_by_me");
  const sumToMe = toMe.filter((d) => !d.settled).reduce((s, d) => s + d.amount, 0);
  const sumByMe = byMe.filter((d) => !d.settled).reduce((s, d) => s + d.amount, 0);

  const renderRow = (d: Debt) => (
    <div
      key={d._id}
      className={cn(
        "group flex items-center gap-3 rounded-[4px] border bg-card px-3 py-2.5",
        d.settled && "opacity-55",
      )}
    >
      <button
        type="button"
        aria-label={d.settled ? "بازگرداندن به حالت باز" : "علامت‌زدن به‌عنوان تسویه‌شده"}
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
          d.settled
            ? "border-foreground bg-foreground text-background"
            : "border-input hover:border-foreground",
        )}
        onClick={() =>
          act(
            () => toggle({ id: d._id }).then(() => undefined),
            d.settled ? "باز شد" : "تسویه شد",
          )
        }
      >
        {d.settled && <Check className="size-3" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {d.person}
          <span className="mr-2 text-[11px] text-muted-foreground">
            {d.direction === "owed_to_me" ? "به من بدهکار است" : "من بدهکارم"}
          </span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          {d.note ? `${d.note} · ` : ""}
          {d.dueDate ? `سررسید ${jDateLabel(d.dueDate)}` : "بدون سررسید"}
        </p>
      </div>
      <span className="shrink-0 text-sm tabular-nums">
        {formatMoneyIn(d.amount, unit)}
      </span>
      <button
        type="button"
        aria-label="حذف"
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => act(() => remove({ id: d._id }).then(() => undefined), "حذف شد")}
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">طلب و بدهی</DialogTitle>
          <DialogDescription>
            حساب کتاب با آدم‌ها — چه کسی به شما بدهکار است و به چه کسی شما بدهکارید.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={submit}
          className="grid gap-3 rounded-[4px] border bg-secondary/40 p-4"
        >
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["owed_by_me", "من بدهکارم"],
                ["owed_to_me", "طلب دارم"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setDirection(id)}
                className={cn(
                  "h-9 rounded-[4px] border text-sm transition-colors",
                  direction === id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="debt-person">نام شخص</Label>
              <Input
                id="debt-person"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                placeholder="مثلاً علی"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="debt-amount">مبلغ</Label>
              <Input
                id="debt-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="۰"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="debt-note">یادداشت</Label>
              <Input
                id="debt-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اختیاری"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="debt-due">سررسید (میلهادی)</Label>
              <Input
                id="debt-due"
                type="date"
                dir="ltr"
                className="text-left"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" size="sm" disabled={busy} className="justify-self-start">
            <Plus className="size-3.5" />
            ثبت
          </Button>
        </form>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[4px] border bg-card p-3 text-center">
            <p className="eyebrow">جمع طلب‌های باز</p>
            <p className="mt-1 font-display text-lg tabular-nums text-chart-2">
              {formatMoneyIn(sumToMe, unit)}
            </p>
          </div>
          <div className="rounded-[4px] border bg-card p-3 text-center">
            <p className="eyebrow">جمع بدهی‌های باز</p>
            <p className="mt-1 font-display text-lg tabular-nums text-destructive">
              {formatMoneyIn(sumByMe, unit)}
            </p>
          </div>
        </div>

        <div className="grid gap-1.5">
          {debts.filter((d) => !d.settled).length > 0 && (
            <p className="eyebrow">باز</p>
          )}
          {debts.filter((d) => !d.settled).map(renderRow)}
          {debts.filter((d) => d.settled).length > 0 && (
            <p className="eyebrow mt-2">تسویه‌شده</p>
          )}
          {debts.filter((d) => d.settled).map(renderRow)}
          {debts.length === 0 && (
            <div className="grid place-items-center gap-1.5 rounded-[4px] border border-dashed py-10 text-center">
              <HandCoins className="size-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">هنوز چیزی ثبت نشده است.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
