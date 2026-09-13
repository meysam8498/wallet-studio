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
import { Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { formatMoneyIn, normalizeDigits, type UnitId } from "@/lib/format";

export type Account = {
  _id: Id<"accounts">;
  name: string;
  kind: "cash" | "bank" | "card" | "wallet";
  initialBalance: number;
};

export const ACCOUNT_KIND_LABELS: Record<Account["kind"], string> = {
  cash: "نقدی",
  bank: "بانکی",
  card: "کارت بانکی",
  wallet: "کیف پول",
};

const KIND_COLORS: Record<Account["kind"], string> = {
  cash: "#8A8A6B",
  bank: "#5C6B7A",
  card: "#A68A64",
  wallet: "#7A6B8A",
};

/** شکل کمینهٔ تراکنش برای محاسبهٔ موجودی — انتقال دو سمت دارد (v2.0.0) */
export type BalanceTx = {
  accountId?: Id<"accounts">;
  transferToId?: Id<"accounts">;
  type: "income" | "expense" | "transfer";
  amount: number;
};

export function accountBalance(a: Account, txs: BalanceTx[]): number {
  let bal = a.initialBalance;
  for (const t of txs) {
    if (t.type === "transfer") {
      // انتقال: از حساب مبدأ کم و به حساب مقصد افزوده می‌شود
      if (t.accountId === a._id) bal -= t.amount;
      if (t.transferToId === a._id) bal += t.amount;
      continue;
    }
    if (t.accountId !== a._id) continue;
    bal += t.type === "income" ? t.amount : -t.amount;
  }
  return bal;
}

export function AccountsDialog({
  open,
  onOpenChange,
  accounts,
  transactions,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: Account[];
  transactions: BalanceTx[];
  unit: UnitId;
}) {
  const create = useMutation(api.accounts.create);
  const update = useMutation(api.accounts.update);
  const remove = useMutation(api.accounts.remove);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<Account["kind"]>("cash");
  const [initial, setInitial] = useState("");
  const [editingId, setEditingId] = useState<Id<"accounts"> | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setKind("cash");
    setInitial("");
  };

  const startEdit = (a: Account) => {
    setEditingId(a._id);
    setName(a.name);
    setKind(a.kind);
    setInitial(a.initialBalance ? formatAmountFa(a.initialBalance) : "");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const parsed = initial.trim() ? Number(normalizeDigits(initial)) : 0;
    if (!Number.isFinite(parsed)) {
      toast.error("موجودی اولیه نامعتبر است");
      return;
    }
    setBusy(true);
    try {
      if (editingId) {
        await update({ id: editingId, name: name.trim(), kind, initialBalance: parsed });
        toast.success("حساب به‌روزرسانی شد");
      } else {
        await create({ name: name.trim(), kind, initialBalance: parsed });
        toast.success("حساب ساخته شد");
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
      toast.success("حساب حذف شد؛ تراکنش‌هایش بدون حساب شدند");
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
            <DialogTitle className="font-display text-2xl">حساب‌ها</DialogTitle>
            <DialogDescription>
              کیف پول، حساب بانکی و کارت‌ها — موجودی هر حساب از تراکنش‌هایش ساخته می‌شود.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={submit}
            className="grid gap-3 rounded-[4px] border bg-secondary/40 p-4"
          >
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="acc-name">نام حساب</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثلاً بانک ملت"
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <Label>نوع</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as Account["kind"])}>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_KIND_LABELS).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="acc-initial">موجودی اولیه (اختیاری)</Label>
              <Input
                id="acc-initial"
                inputMode="decimal"
                value={initial}
                onChange={(e) => setInitial(e.target.value)}
                placeholder="۰"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={busy || !name.trim()}>
                <Plus className="size-3.5" />
                {editingId ? "ذخیرهٔ تغییرها" : "افزودن حساب"}
              </Button>
              {editingId && (
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  انصراف
                </Button>
              )}
            </div>
          </form>

          <div className="grid gap-1.5">
            {accounts.map((a) => (
              <div
                key={a._id}
                className="group flex items-center gap-3 rounded-[4px] border bg-card px-3 py-2.5"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: KIND_COLORS[a.kind] }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{a.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {ACCOUNT_KIND_LABELS[a.kind]}
                  </p>
                </div>
                <span className="shrink-0 font-display text-sm tabular-nums">
                  {formatMoneyIn(accountBalance(a, transactions), unit)}
                </span>
                <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    aria-label={`ویرایش ${a.name}`}
                    className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                    onClick={() => startEdit(a)}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <button
                    type="button"
                    aria-label={`حذف ${a.name}`}
                    className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-destructive"
                    onClick={() => setDeleting(a)}
                  >
                    <Trash2 className="size-3" />
                  </button>
                </div>
              </div>
            ))}
            {accounts.length === 0 && (
              <div className="grid place-items-center gap-1.5 rounded-[4px] border border-dashed py-10 text-center">
                <Wallet className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  هنوز حسابی نساخته‌اید.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">حذف حساب؟</DialogTitle>
            <DialogDescription>
              {deleting
                ? `«${deleting.name}» حذف می‌شود. تراکنش‌های آن می‌مانند، اما بدون حساب خواهند شد.`
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

function formatAmountFa(n: number): string {
  return n.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
}
