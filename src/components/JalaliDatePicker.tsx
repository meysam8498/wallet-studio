import { useMemo, useState } from "react";
import {
  faDigits,
  J_MONTHS,
  jMonthLength,
  toGregorian,
  toJalali,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export type JDateParts = { jy: number; jm: number; jd: number };

/** روز هفتهٔ اول ماه جلالی: ۰ = شنبه … ۶ = جمعه */
function firstWeekday(jy: number, jm: number): number {
  const { gy, gm, gd } = toGregorian(jy, jm, 1);
  const dow = new Date(gy, gm - 1, gd).getDay(); // 0=Sunday … 6=Saturday
  return (dow + 1) % 7;
}

/**
 * تقویم شمسی — RTL-native month grid with month/year selects.
 * Value and onPick both use Jalali parts (jy, jm, jd).
 */
export function JalaliDatePicker({
  value,
  onChange,
  minYear,
  maxYear,
}: {
  value: JDateParts;
  onChange: (v: JDateParts) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const [view, setView] = useState({ jy: value.jy, jm: value.jm });

  const today = useMemo(() => {
    const now = new Date();
    return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }, []);

  const grid = useMemo(() => {
    const len = jMonthLength(view.jy, view.jm);
    const first = firstWeekday(view.jy, view.jm);
    const cells: Array<{ jd: number } | null> = [];
    for (let i = 0; i < first; i++) cells.push(null);
    for (let d = 1; d <= len; d++) cells.push({ jd: d });
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view]);

  const years = useMemo(() => {
    const hi = maxYear ?? today.jy;
    const lo = minYear ?? hi - 10;
    const out: number[] = [];
    for (let y = hi; y >= lo; y--) out.push(y);
    return out;
  }, [minYear, maxYear, today.jy]);

  const shift = (delta: number) => {
    let m = view.jm + delta;
    let y = view.jy;
    if (m > 12) {
      m = 1;
      y += 1;
    } else if (m < 1) {
      m = 12;
      y -= 1;
    }
    setView({ jy: y, jm: m });
  };

  return (
    <div className="rounded-[4px] border bg-card p-3" dir="rtl">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="ماه قبل"
          className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => shift(-1)}
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none">
            <path
              d="M6 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="flex items-center gap-1.5">
          <select
            aria-label="ماه"
            className="h-7 rounded-[3px] border bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={view.jm}
            onChange={(e) => setView((v) => ({ ...v, jm: Number(e.target.value) }))}
          >
            {J_MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            aria-label="سال"
            className="h-7 rounded-[3px] border bg-background px-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            value={view.jy}
            onChange={(e) => setView((v) => ({ ...v, jy: Number(e.target.value) }))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {faDigits(y)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label="ماه بعد"
          className="grid size-7 place-items-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={() => shift(1)}
        >
          <svg viewBox="0 0 16 16" className="size-4" fill="none">
            <path
              d="M10 3L5 8l5 5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="grid h-6 place-items-center text-[10px] text-muted-foreground"
          >
            {w}
          </div>
        ))}
        {grid.map((cell, i) =>
          cell === null ? (
            <div key={`e-${i}`} />
          ) : (
            <button
              key={cell.jd}
              type="button"
              onClick={() => onChange({ ...view, jd: cell.jd })}
              className={cn(
                "grid h-8 place-items-center rounded-[3px] text-sm transition-colors",
                value.jy === view.jy &&
                  value.jm === view.jm &&
                  value.jd === cell.jd
                  ? "bg-foreground text-background"
                  : cell.jd === today.jd &&
                      view.jy === today.jy &&
                      view.jm === today.jm
                    ? "bg-accent text-accent-foreground ring-1 ring-ring/40"
                    : "hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {faDigits(cell.jd)}
            </button>
          ),
        )}
      </div>

      <button
        type="button"
        className="mt-1 w-full rounded-[3px] py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={() => onChange(today)}
      >
        امروز
      </button>
    </div>
  );
}
