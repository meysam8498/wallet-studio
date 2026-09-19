import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";

import { api } from "@/convex/_generated/api";
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
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, Crown, LogOut, RefreshCw, UserMinus, Users } from "lucide-react";
import { faDigits } from "@/lib/format";

type HouseholdInfo = {
  _id: string;
  name: string;
  ownerId: string;
  isOwner: boolean;
  members: Array<{ id: string; email?: string; isOwner: boolean }>;
};

/**
 * گفت‌وگوی خانوار مشترک — v2.0.0
 *
 * سه وضعیت: بدون خانوار (ساختن یا پیوستن با کد)، عضو (نمایش اعضا و خروج)،
 * مالک (مدیریت اعضا، کد دعوت، تغییر نام و انحلال).
 */
export function HouseholdDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const household = useQuery(api.households.myHousehold);
  const create = useMutation(api.households.create);
  const join = useMutation(api.households.join);
  const leave = useMutation(api.households.leave);
  const dissolve = useMutation(api.households.dissolve);
  const newInviteCode = useMutation(api.households.newInviteCode);
  const removeMember = useMutation(api.households.removeMember);
  const rename = useMutation(api.households.rename);

  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingLeave, setConfirmingLeave] = useState(false);
  const [confirmingDissolve, setConfirmingDissolve] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  // بازنشانی ورودی‌ها هنگام بازشدن گفت‌وگو — بدون اثر کاسکادی (الگوی key)
  const resetKey = `${open}:${household?._id ?? "none"}`;
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setInviteCode(null);
    setJoinCode("");
    setName("");
  }

  const loading = household === undefined;

  const doCreate = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await create({ name: name.trim() });
      toast.success("خانوار ساخته شد — حالا با کد دعوت اعضا را اضافه کنید");
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const doJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setBusy(true);
    try {
      await join({ code });
      toast.success("به خانوار پیوستید — دفتر مشترک از این لحظه فعال است");
      setJoinCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const doNewCode = async () => {
    setBusy(true);
    try {
      const code = await newInviteCode({});
      setInviteCode(code);
      toast.success("کد دعوت تازه ساخته شد");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const doLeave = async () => {
    setBusy(true);
    try {
      await leave({});
      toast.success("خانوار را ترک کردید — دفتر شخصی شما دست‌نخورده باقی می‌ماند");
      setConfirmingLeave(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const doDissolve = async () => {
    setBusy(true);
    try {
      await dissolve({});
      toast.success("خانوار منحل شد — داده‌های دفتر نزد مالک باقی ماند");
      setConfirmingDissolve(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async (userId: string) => {
    setBusy(true);
    try {
      await removeMember({ userId: userId as never });
      toast.success("عضو حذف شد");
      setRemoving(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const doRename = async () => {
    if (!household || !name.trim()) return;
    setBusy(true);
    try {
      await rename({ name: name.trim() });
      toast.success("نام خانوار به‌روزرسانی شد");
      setName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطایی رخ داد");
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("کد در حافظه کپی شد");
    } catch {
      toast.error("کپی ناموفق بود");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Users className="size-5" />
              خانوار مشترک
            </DialogTitle>
            <DialogDescription>
              یک دفتر واحد برای همهٔ اعضا — هر کس با حساب خودش وارد می‌شود و
              ثبت‌کنندهٔ هر سند کنارش می‌ماند.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              در حال بارگذاری…
            </p>
          ) : household === null ? (
            /* ---------- بدون خانوار: ساختن یا پیوستن ---------- */
            <div className="grid gap-5">
              <div className="grid gap-2 rounded-[4px] border bg-secondary/40 p-4">
                <p className="text-sm font-medium">دفتر مشترک تازه</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  همهٔ داده‌های فعلی شما می‌ماند و اعضای تازه به همین دفتر
                  اضافه می‌شوند.
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثلاً خانوادهٔ ما"
                    className="h-9"
                  />
                  <Button size="sm" onClick={doCreate} disabled={busy || !name.trim()}>
                    ساختن
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-xs text-muted-foreground">
                  یا
                </span>
              </div>

              <div className="grid gap-2 rounded-[4px] border bg-secondary/40 p-4">
                <p className="text-sm font-medium">پیوستن به دفتر کسی دیگر</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  کد شش‌حرفی که مالک دفتر به شما داده است را وارد کنید.
                </p>
                <div className="mt-1 flex items-center gap-2" dir="ltr">
                  <Input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ABC123"
                    maxLength={6}
                    className="h-9 text-center font-display text-lg tracking-[0.4em]"
                  />
                  <Button size="sm" onClick={doJoin} disabled={busy || joinCode.trim().length !== 6}>
                    پیوستن
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* ---------- عضو خانوار ---------- */
            <div className="grid gap-4">
              <div className="flex items-center justify-between rounded-[4px] border bg-card px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{household.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {faDigits(household.members.length)} عضو
                  </p>
                </div>
                {household.isOwner && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    <Crown className="size-3" />
                    مالک
                  </span>
                )}
              </div>

              {/* فهرست اعضا */}
              <div className="grid gap-1.5">
                {(household.members as HouseholdInfo["members"])
                  .slice()
                  .sort(
                    (a: HouseholdInfo["members"][number], b: HouseholdInfo["members"][number]) =>
                      Number(b.isOwner) - Number(a.isOwner),
                  )
                  .map((m: HouseholdInfo["members"][number]) => (
                    <div
                      key={m.id}
                      className="group flex items-center gap-2.5 rounded-[4px] border bg-card px-3 py-2"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full border text-[10px]">
                        {(m.email ?? "؟").slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm" dir="ltr">
                        {m.email ?? "بدون ایمیل"}
                        {m.isOwner && (
                          <span className="mr-1.5 text-[10px] text-muted-foreground">
                            (مالک)
                          </span>
                        )}
                      </span>
                      {household.isOwner && !m.isOwner && (
                        <button
                          type="button"
                          aria-label="حذف عضو"
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setRemoving(m.id)}
                        >
                          <UserMinus className="size-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>

              {/* کد دعوت — v2.6.0: همیشه در دسترس مالک؛ خودکار پس از ساخت نمایش داده می‌شود */}
              {household.isOwner && (
                <div className="grid gap-2 rounded-[4px] border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">کد دعوت اعضا</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                      onClick={doNewCode}
                      disabled={busy}
                    >
                      <RefreshCw className="size-3" />
                      کد تازه
                    </Button>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">
                    این کد را به عضو خانواده بدهید؛ او پس از ورود، از دکمهٔ
                    «دفتر فعال» همین کد را وارد می‌کند و به دفتر مشترک می‌پیوندد.
                  </p>
                  <div className="flex items-center gap-2" dir="ltr">
                    {household.inviteCode ?? inviteCode ? (
                      <>
                        <span className="flex-1 rounded-[4px] border bg-secondary/60 py-2.5 text-center font-display text-2xl tracking-[0.5em]">
                          {household.inviteCode ?? inviteCode}
                        </span>
                        <Button
                          size="icon-sm"
                          variant="outline"
                          aria-label="کپی کد دعوت"
                          onClick={() =>
                            void copyCode(String(household.inviteCode ?? inviteCode))
                          }
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={doNewCode}
                        disabled={busy}
                        className="justify-self-start"
                      >
                        ساخت کد دعوت
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* تغییر نام — فقط مالک */}
              {household.isOwner && (
                <div className="grid gap-2">
                  <Label htmlFor="hh-name">تغییر نام خانوار</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="hh-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={household.name}
                      className="h-9"
                    />
                    <Button size="sm" variant="outline" onClick={doRename} disabled={busy || !name.trim()}>
                      ذخیره
                    </Button>
                  </div>
                </div>
              )}

              <DialogFooter className="mt-1">
                {household.isOwner ? (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmingDissolve(true)}
                    disabled={busy}
                  >
                    انحلال خانوار
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmingLeave(true)}
                    disabled={busy}
                  >
                    <LogOut className="size-3.5" />
                    ترک خانوار
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* تأیید خروج عضو */}
      <AlertDialog open={confirmingLeave} onOpenChange={setConfirmingLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ترک خانوار؟</AlertDialogTitle>
            <AlertDialogDescription>
              دفتر مشترک را از دست می‌دهید؛ اما داده‌های شخصی پیشین شما دست‌نخورده
              باقی می‌ماند. برای پیوستن دوباره به کد دعوت تازه نیاز دارید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ماندن</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void doLeave();
              }}
            >
              ترک خانوار
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* تأیید انحلال (فقط مالک) */}
      <AlertDialog open={confirmingDissolve} onOpenChange={setConfirmingDissolve}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>انحلال خانوار؟</AlertDialogTitle>
            <AlertDialogDescription>
              همهٔ اعضا از این لحظه دفتر شخصی خودشان را می‌بینند. تراکنش‌ها و
              حساب‌ها حذف نمی‌شوند و پیش مالک می‌مانند. این کار برگشت‌پذیر نیست؛
              برای هم‌رسانی دوباره باید خانوار تازه ساخت.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void doDissolve();
              }}
            >
              انحلال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* تأیید حذف عضو */}
      <AlertDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عضو؟</AlertDialogTitle>
            <AlertDialogDescription>
              این کاربر از این لحظه دفتر شخصی خودش را می‌بیند و به دفتر مشترک
              دسترسی ندارد. اسنادی که ثبت کرده بودند، باقی می‌مانند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (removing) void doRemove(removing);
              }}
            >
              حذف عضو
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
