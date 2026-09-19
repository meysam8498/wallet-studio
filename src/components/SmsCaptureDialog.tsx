import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Building2, Check, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { faDigits, formatMoneyIn, jalaliToGregorian, todayJ, type UnitId } from "@/lib/format";
import type { BankSmsEvent } from "@/lib/sms-listener";

/**
 * تأیید تراکنشِ پیامک بانکی — v2.6.0
 *
 * پیامک بانکی هرگز مستقیم ثبت نمی‌شود؛ پیش‌نویس این دیالوگ باز می‌شود و
 * ذخیره فقط پس از تأیید کاربر انجام می‌گیرد. دسته با واژگان پیامک پیشنهاد
 * می‌شود و کاربر می‌تواند حساب و یادداشت را اصلاح کند.
 */

type Account = {
  _id: string;
  name: string;
  kind: "cash" | "bank" | "card" | "wallet";
  initialBalance: number;
};

type Category = {
  _id: string;
  name: string;
  kind: "income" | "expense";
  color: string;
};

const SMS_CATEGORY_HINTS: Array<[RegExp, string]> = [
  [/قبض|برق|آب|گاز/, "قبض"],
  [/سوخت|بنزین|گازوئیل|احتساب/, "حمل‌ونقل"],
  [/عوارض|جریمه|خلافی/, "قبض"],
  [/خرید اینترنتی|فروشگاه|سوپرمارکت/, "خرید"],
  [/حق بیمه|بیمه/, "بیمه"],
  [/قسط|وام/, "قسط"],
];

export function SmsCaptureDialog({
  event,
  open,
  onOpenChange,
  unit,
}: {
  event: BankSmsEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UnitId;
}) {
  const createTx = useMutation(api.ledger.createTransaction);
  const accounts = useQuery(api.accounts.list) as Account[] | undefined;
  const categories = useQuery(api.ledger.listCategories) as Category[] | undefined;

  const [amountText, setAmountText] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState("none");
  const [categoryId, setCategoryId] = useState("none");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // با هر رویداد تازه، پیش‌نویس را از پیامک بازسازی کن
  const eventKey = event ? `${event.amount}:${event.kind}:${event.body.slice(0, 40)}` : "none";
  const [lastKey, setLastKey] = useState(eventKey);
  if (eventKey !== lastKey) {
    setLastKey(eventKey);
    if (event) {
      setAmountText(faDigits(event.amount));
      setType(event.kind);
      setAccountId("none");
      setNote(`پیامک بانک — ${event.body.slice(0, 90)}`);
      // پیشنهاد دسته از واژگان پیامک
      const hint = SMS_CATEGORY_HINTS.find(([re]) => re.test(event.body))?.[1];
      setCategoryId(hint ?? "none");
    }
  }

  const suggestedCategory = useMemo(() => {
    if (!event) return undefined;
    const pool = (categories ?? []).filter((c) =>
      event.kind === "income" ? c.kind === "income" : c.kind === "expense",
    );
    const hint = SMS_CATEGORY_HINTS.find(([re]) => re.test(event.body))?.[1];
    return pool.find((c) => c.name.includes(hint ?? "\u0000"));
  }, [event, categories]);

  const save = async () => {
    const amount = Number(amountText.replace(/[^0-9]/g, ""));
    if (!amount || amount <= 0) {
      toast.error("مبلغ معتبر نیست");
      return;
    }
    setSaving(true);
    try {
      const j = todayJ();
      await createTx({
        amount,
        date: jalaliToGregorian(j.jy, j.jm, j.jd),
        type,
        categoryId:
          categoryId !== "none"
            ? (categoryId as Id<"categories">)
            : suggestedCategory
              ? (suggestedCategory._id as Id<"categories">)
              : undefined,
        accountId: accountId !== "none" ? (accountId as Id<"accounts">) : undefined,
        transferToId: undefined,
        note: note.trim() || undefined,
        receipt: undefined,
      });
      toast.success(
        `${type === "income" ? "واریز" : "برداشت"} ثبت شد — ${formatMoneyIn(amount, unit)}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ثبت ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <Building2 className="size-4 text-muted-foreground" />
            تراکنشِ پیامک بانکی
          </DialogTitle>
          <DialogDescription className="line-clamp-2" dir="rtl">
            {event.body.slice(0, 140)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={type === "expense" ? "default" : "outline"}
              onClick={() => setType("expense")}
              className="gap-1.5"
            >
              <TrendingDown className="size-3.5" /> برداشت
            </Button>
            <Button
              type="button"
              size="sm"
              variant={type === "income" ? "default" : "outline"}
              onClick={() => setType("income")}
              className="gap-1.5"
            >
              <TrendingUp className="size-3.5" /> واریز
            </Button>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sms-amount">مبلغ (تومان)</Label>
            <Input
              id="sms-amount"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              inputMode="numeric"
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>حساب</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder="انتخاب حساب" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts ?? []).map((a) => (
                    <SelectItem key={a._id} value={a._id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>دسته</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 w-full">
                  <SelectValue placeholder={suggestedCategory?.name ?? "انتخاب دسته"} />
                </SelectTrigger>
                <SelectContent>
                  {(categories ?? [])
                    .filter((c) => (type === "income" ? c.kind === "income" : c.kind === "expense"))
                    .map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="sms-note">یادداشت</Label>
            <Input
              id="sms-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            رد کردن
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="gap-1.5">
            <Check className="size-3.5" />
            {saving ? "…" : "ثبت در دفتر"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
