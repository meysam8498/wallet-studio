import { useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ArrowLeftRight,
  BadgeCheck,
  Loader2,
  Mic,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { faDigits, formatMoneyIn, jalaliToGregorian, todayJ, type UnitId } from "@/lib/format";

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

type Draft = {
  type: "expense" | "income" | "transfer";
  amount: number;
  category: string;
  note?: string;
  provider: string;
  confidence: number;
};

/**
 * ثبت سریع با هوش مصنوعی — v2.5.0
 *
 * کاربر می‌گوید یا می‌نویسد: «۲۰۰ تومن دادم به اسنپ» — دستیار آن را به
 * هزینهٔ حمل‌ونقل ۲۰۰٬۰۰۰ تومانی تبدیل می‌کند و «همیشه» پیش از ذخیره،
 * پیش‌نویس قابل ویرایش را برای تأیید نشان می‌دهد تا از اشتباه جلوگیری شود.
 *
 * گفتار با Web Speech API مرورگر/WebView تشخیص داده می‌شود (رایگان،
 * آفلاین روی اندروید جدید)؛ متن سپس به اکشن Convex می‌رود که زنجیرهٔ
 * ارائه‌دهنده‌ها (Groq → OpenCode → Google → قاعده‌محور) را امتحان می‌کند.
 * کلیدهای API فقط سمت سرورند — هیچ کلیدی در بستهٔ کلاینت نیست.
 */

/** تشخیص گفتار — در TypeScript استاندارد تعریف نشده، اینجا تایپ کمینه */
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function AiCaptureDialog({
  open,
  onOpenChange,
  unit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: UnitId;
}) {
  const parse = useAction(api.ledger.parseTransactionProxy);
  const createTx = useMutation(api.ledger.createTransaction);
  const accounts = useQuery(api.accounts.list) as Account[] | undefined;
  const categories = useQuery(api.ledger.listCategories) as Category[] | undefined;

  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);

  const speechSupported = typeof window !== "undefined" && getSpeechRecognition() !== null;

  // پاک‌سازی هنگام بستن دیالوگ — بدون افکت همگام (الزام react-refresh)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setText("");
      setDraft(null);
      setListening(false);
      recRef.current?.stop();
    }
    onOpenChange(next);
  };

  const startListening = () => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      toast.error("تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود — بنویسید");
      return;
    }
    const rec = new Ctor();
    rec.lang = "fa-IR";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const said = e.results[0]?.[0]?.transcript ?? "";
      setText((t) => (t ? `${t} ${said}` : said));
    };
    rec.onerror = () => {
      setListening(false);
      toast.error("شنیدن ممکن نشد — اجازهٔ میکروفون را بررسی کنید");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  };

  const runParse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setDraft(null);
    try {
      const result = await parse({ text: text.trim() });
      setDraft(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "تشخیص ناموفق بود");
    } finally {
      setParsing(false);
    }
  };

  /** دستهٔ پیشنهادی را با دسته‌های موجود تطبیق بده (باز هم ذخیره فقط با تأیید) */
  const matchCategory = (name: string, type: Draft["type"]): Category | undefined => {
    const pool = (categories ?? []).filter((c) =>
      type === "transfer" ? false : type === "income" ? c.kind === "income" : c.kind === "expense",
    );
    const clean = name.replace(/\u200c/g, "").trim();
    return (
      pool.find((c) => c.name.replace(/\u200c/g, "") === clean) ??
      pool.find((c) => c.name.includes(clean) || clean.includes(c.name.replace(/\u200c/g, "")))
    );
  };

  const saveDraft = async () => {
    if (!draft || draft.amount <= 0) return;
    setSaving(true);
    try {
      const cat = matchCategory(draft.category, draft.type);
      const account = (accounts ?? [])[0];
      const j = todayJ();
      await createTx({
        amount: draft.amount,
        date: jalaliToGregorian(j.jy, j.jm, j.jd),
        type: draft.type,
        categoryId:
          cat && draft.type !== "transfer" ? (cat._id as Id<"categories">) : undefined,
        accountId: account?._id as Id<"accounts"> | undefined,
        transferToId:
          draft.type === "transfer"
            ? (((accounts ?? [])[1]?._id ?? account?._id) as Id<"accounts"> | undefined)
            : undefined,
        note: [draft.note, draft.provider !== "قاعده‌محور" ? `✦ ${draft.provider}` : undefined]
          .filter(Boolean)
          .join(" · "),
      });
      toast.success(
        `${draft.type === "income" ? "درآمد" : draft.type === "transfer" ? "انتقال" : "هزینه"} ثبت شد — ${formatMoneyIn(draft.amount, unit)}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ثبت ناموفق بود");
    } finally {
      setSaving(false);
    }
  };

  const typeBadge = (t: Draft["type"]) =>
    t === "income" ? (
      <span className="inline-flex items-center gap-1 rounded-[3px] bg-chart-2/10 px-1.5 py-0.5 text-[11px] font-medium text-chart-2">
        <TrendingUp className="size-3" /> درآمد
      </span>
    ) : t === "transfer" ? (
      <span className="inline-flex items-center gap-1 rounded-[3px] bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
        <ArrowLeftRight className="size-3" /> انتقال
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-[3px] bg-destructive/10 px-1.5 py-0.5 text-[11px] font-medium text-destructive">
        <TrendingDown className="size-3" /> هزینه
      </span>
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-lg">
            <Sparkles className="size-4 text-muted-foreground" />
            ثبت سریع با دستیار
          </DialogTitle>
          <DialogDescription>
            بگو یا بنویس؛ مثلاً «۲۰۰ تومن دادم به اسنپ» — پیش از ذخیره تأیید می‌کنی
          </DialogDescription>
        </DialogHeader>

        {!draft ? (
          <div className="space-y-3">
            <div className="relative">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="مثلاً: ۲۵۰ هزار تومن قبض برق دادم"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !parsing) void runParse();
                }}
                className="pl-11"
                disabled={parsing}
              />
              {speechSupported && (
                <button
                  type="button"
                  aria-label={listening ? "توقف شنیدن" : "گفتن"}
                  onClick={() => (listening ? recRef.current?.stop() : startListening())}
                  className={cn(
                    "absolute left-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[3px] transition-colors",
                    listening
                      ? "bg-destructive/10 text-destructive"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Mic className={cn("size-4", listening && "animate-pulse")} />
                </button>
              )}
            </div>
            {listening && (
              <p className="text-xs text-muted-foreground">در حال شنیدن…</p>
            )}
            <Button className="w-full" onClick={() => void runParse()} disabled={!text.trim() || parsing}>
              {parsing ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  در حال تشخیص…
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  تشخیص تراکنش
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* نوار اعتماد: نوع + ارائه‌دهنده + اطمینان */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {typeBadge(draft.type)}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <BadgeCheck className="size-3.5" />
                {draft.provider}
              </span>
              <span
                className={cn(
                  "tabular-nums",
                  draft.confidence < 0.5 ? "text-destructive" : "text-muted-foreground",
                )}
              >
                اطمینان {faDigits(Math.round(draft.confidence * 100))}٪
              </span>
            </div>
            {draft.confidence < 0.5 && (
              <p className="rounded-[4px] border border-dashed border-destructive/40 px-3 py-2 text-xs text-destructive">
                تشخیص مطمئن نیست — مقدارها را بررسی و اصلاح کن
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>مبلغ (تومان)</Label>
                <Input
                  dir="ltr"
                  inputMode="numeric"
                  value={draft.amount || ""}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(/[^\d]/g, ""));
                    setDraft({ ...draft, amount: Number.isFinite(n) ? n : 0 });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>نوع</Label>
                <Select
                  value={draft.type}
                  onValueChange={(v) => setDraft({ ...draft, type: v as Draft["type"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">هزینه</SelectItem>
                    <SelectItem value="income">درآمد</SelectItem>
                    <SelectItem value="transfer">انتقال</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>
                دسته {matchCategory(draft.category, draft.type) ? "(موجود — تطبیق خورد)" : "(تازه)"}
              </Label>
              <Input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>یادداشت</Label>
              <Input
                value={draft.note ?? ""}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              />
            </div>
          </div>
        )}

        <DialogFooter className="max-sm:flex-col">
          {draft ? (
            <>
              <Button variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                ویرایش جمله
              </Button>
              <Button onClick={() => void saveDraft()} disabled={saving || draft.amount <= 0}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : "ثبت در دفتر"}
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              بستن
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
