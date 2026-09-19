import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ArrowDown, ArrowUp, GripVertical, LayoutGrid, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { faDigits } from "@/lib/format";

/**
 * تختهٔ کارت‌های داشبورد — v2.4.0
 *
 * هر «کارت» (پنل) یک بلوک مستقل داشبورد است: دسته‌بندی‌ها، نمای سالانه،
 * روند شش‌ماهه، انتقال‌ها، بودجه و تراکنش‌ها. ترتیب و دیده‌شدن هر کارت در
 * localStorage ذخیره می‌شود و روی همهٔ پلتفرم‌ها (وب، ویندوز، اندروید)
 * همان دستگاه به یاد می‌ماند.
 *
 * چیدمان: در نمایش‌های متوسط به بالا دو ستونه با ارتفاع متفاوت (masonry
 * با CSS columns) — دیگر هیچ کارتی «لاغر و مثل قطار» زیر هم نمی‌آید و
 * نیمی از صفحه خالی نمی‌ماند. در موبایل تک‌ستونه و به ترتیب انتخابی کاربر.
 */

export type WidgetId =
  | "categories"
  | "yearly"
  | "trend"
  | "transfers"
  | "budgets"
  | "transactions";

export const WIDGET_TITLES: Record<WidgetId, string> = {
  categories: "دسته‌بندی‌ها",
  yearly: "نمای سالانه",
  trend: "روند شش‌ماهه",
  transfers: "انتقال‌های این ماه",
  budgets: "بودجهٔ ماه",
  transactions: "تراکنش‌ها",
};

/** ترتیب پیش‌فرض — همان ترتیب روایی قبلی داشبورد */
const DEFAULT_ORDER: WidgetId[] = [
  "categories",
  "yearly",
  "trend",
  "transfers",
  "budgets",
  "transactions",
];

const STORAGE_KEY = "daftaram.widgets.v1";

type SavedState = { order: WidgetId[]; hidden: WidgetId[] };

/**
 * مقدار اولیهٔ خوش‌بینانه از localStorage — تا پیش از رسیدن پاسخ سرور رابط
 * با چیدمانِ همین دستگاه رندر شود (سپس سرور در صورت وجود، بازنویسی می‌کند).
 */
function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { order: DEFAULT_ORDER, hidden: [] };
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    // فقط شناسه‌های معتبر را بپذیر؛ کارت‌های تازهٔ ناشناخته را در انتها بیفزای
    const known = new Set(DEFAULT_ORDER);
    const order = (parsed.order ?? []).filter((id) => known.has(id));
    for (const id of DEFAULT_ORDER) if (!order.includes(id)) order.push(id);
    return {
      order: order as WidgetId[],
      hidden: (parsed.hidden ?? []).filter((id) => known.has(id)) as WidgetId[],
    };
  } catch {
    return { order: DEFAULT_ORDER, hidden: [] };
  }
}

/**
 * چیدمان کارت‌ها — v2.6.0 روی سرور (Convex) ذخیره می‌شود تا همهٔ دستگاه‌های
 * یک کاربر — ویندوز، اندروید، وب — همان ترتیب را ببینند. localStorage فقط
 * به‌عنوان مقدار اولیهٔ خوش‌بینانه (پیش از رسیدن پاسخ سرور) و مهاجرت کاربران
 * نسخهٔ ۲.۴ استفاده می‌شود؛ پس از نخستین همگام‌سازی، سرور مرجع یگانه است.
 */
export function useWidgetState() {
  // خوش‌بینانه: همان مقدار محلیِ قبلی تا رابط فلیکر نزند
  const [state, setState] = useState<SavedState>(() => loadState());
  const serverPrefs = useQuery(api.preferences.getWidgetPrefs);
  const save = useMutation(api.preferences.setWidgetPrefs);

  // آیا اولین پاسخ سرور آمده؟ تا آن لحظه چیزی به سرور نمی‌نویسیم
  const serverArrived = serverPrefs !== undefined;
  const appliedServer = useRef(false);

  useEffect(() => {
    if (serverPrefs === undefined || appliedServer.current) return;
    appliedServer.current = true;
    const hasServerData = serverPrefs !== null;
    if (hasServerData) {
      // سرور مرجع است — ترتیب محلی را بازنویسی کن
      const known = new Set<WidgetId>(DEFAULT_ORDER);
      const order = (serverPrefs.order ?? []).filter((id): id is WidgetId =>
        known.has(id as WidgetId),
      );
      for (const id of DEFAULT_ORDER) if (!order.includes(id)) order.push(id);
      const hidden = (serverPrefs.hidden ?? []).filter((id): id is WidgetId =>
        known.has(id as WidgetId),
      );
      // ناهمگام‌سازی به رندر بعدی — setState همگام در افکت ممنوع است
      queueMicrotask(() => setState({ order, hidden }));
    }
    // اگر سرور خالی بود، ترتیب محلیِ موجود را بالا بفرست (مهاجرت از ۲.۴)
    else {
      void save({ order: [...loadState().order], hidden: [...loadState().hidden] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverPrefs, save]);

  useEffect(() => {
    if (!serverArrived || !appliedServer.current) return;
    void save({ order: [...state.order], hidden: [...state.hidden] });
  }, [state, serverArrived, save]);

  const move = useCallback((id: WidgetId, dir: -1 | 1) => {
    setState((s) => {
      const order = [...s.order];
      const i = order.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return s;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...s, order };
    });
  }, []);

  const toggleHidden = useCallback((id: WidgetId) => {
    setState((s) => ({
      ...s,
      hidden: s.hidden.includes(id)
        ? s.hidden.filter((h) => h !== id)
        : [...s.hidden, id],
    }));
  }, []);

  const reset = useCallback(() => {
    setState({ order: DEFAULT_ORDER, hidden: [] });
  }, []);

  return { order: state.order, hidden: state.hidden, move, toggleHidden, reset };
}

export function WidgetSettingsMenu({
  order,
  hidden,
  onMove,
  onToggle,
  onReset,
}: {
  order: WidgetId[];
  hidden: WidgetId[];
  onMove: (id: WidgetId, dir: -1 | 1) => void;
  onToggle: (id: WidgetId) => void;
  onReset: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          title="چیدمان کارت‌های داشبورد"
          className="h-8 gap-1.5 text-xs"
        >
          <LayoutGrid className="size-3.5" />
          چیدمان
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <p className="px-2 pt-1.5 pb-1 text-[11px] text-muted-foreground">
          ترتیب و نمایش کارت‌های داشبورد — روی همین دستگاه ذخیره می‌شود
        </p>
        <DropdownMenuSeparator />
        {order.map((id, i) => {
          const isHidden = hidden.includes(id);
          return (
            <DropdownMenuItem
              key={id}
              className={cn("gap-1", isHidden && "opacity-55")}
              onSelect={(e) => e.preventDefault()}
            >
              <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-xs">{WIDGET_TITLES[id]}</span>
              <button
                type="button"
                aria-label={`کارت ${WIDGET_TITLES[id]} به بالا`}
                disabled={i === 0}
                className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(id, -1);
                }}
              >
                <ArrowUp className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={`کارت ${WIDGET_TITLES[id]} به پایین`}
                disabled={i === order.length - 1}
                className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                onClick={(e) => {
                  e.stopPropagation();
                  onMove(id, 1);
                }}
              >
                <ArrowDown className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label={isHidden ? `نمایش ${WIDGET_TITLES[id]}` : `پنهان‌کردن ${WIDGET_TITLES[id]}`}
                className="grid size-6 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(id);
                }}
              >
                <span className="text-[10px] leading-none">{isHidden ? "+" : "−"}</span>
              </button>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset} className="text-xs">
          <RotateCcw className="mr-1 size-3.5" />
          بازنشانی به چیدمان پیش‌فرض
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * ستون‌بندی masonry: کارت‌ها را بر اساس اندازهٔ تقریبی‌شان در دو ستون
 * متوازن پخش می‌کند (فقط از عرض md به بالا؛ پایین‌تر همه پشت هم تک‌ستون).
 * کارت‌های «چاق» (categories، yearly، transactions) یک ستون کامل می‌گیرند
 * و کارت‌های «لاغر» (transfers، budgets، trend) در ستون مقابل می‌نشینند
 * تا هیچ‌گاه دو کارت چاق هم‌زمان بالا نباشند و صفحه متعادل بماند.
 */
export function boardLayout(order: WidgetId[], hidden: WidgetId[]) {
  const visible = order.filter((id) => !hidden.includes(id));
  const wide = new Set<WidgetId>(["categories", "yearly", "transactions"]);
  return visible.map((id) => ({ id, wide: wide.has(id) }));
}

/** برچسب کمکی برای نشان شمارهٔ کارت در منوی چیدمان */
export function widgetIndexLabel(i: number): string {
  return faDigits(i + 1);
}
