/** Persian (fa) formatting + Jalali (Shamsi) calendar helpers for the ledger. */

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

export function faDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Persian/Arabic digits and separators → ASCII, for parsing user input. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[٬,]/g, "")
    .replace(/٫/g, ".");
}

export function formatAmount(amount: number): string {
  return amount.toLocaleString("fa-IR", { maximumFractionDigits: 2 });
}

export function formatMoney(
  amount: number,
  opts?: { signed?: boolean },
): string {
  const sign = amount < 0 ? "−" : opts?.signed ? "+" : "";
  const abs = formatAmount(Math.abs(amount));
  return `${sign ? sign + " " : ""}${abs} تومان`;
}

// ---------------------------------------------------------------------------
// Jalali calendar (algorithm adapted from jalaali-js, MIT)
// ---------------------------------------------------------------------------

export type JDate = { jy: number; jm: number; jd: number };

function div(a: number, b: number) {
  return Math.trunc(a / b);
}
function mod(a: number, b: number) {
  return a - Math.trunc(a / b) * b;
}

function jalCal(jy: number) {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097,
    2192, 2262, 2324, 2394, 2456, 3178,
  ];
  const gy = jy + 621;
  let leapJ = -14;
  let jp = breaks[0]!;
  let jump = 0;
  let n = 0;
  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i]!;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

function g2d(gy: number, gm: number, gd: number) {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number) {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number) {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number) {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

export function toJalali(gy: number, gm: number, gd: number): JDate {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number) {
  return d2g(j2d(jy, jm, jd));
}

export function jIsLeap(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return jIsLeap(jy) ? 30 : 29;
}

export const J_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** "2026-03-07" (Gregorian, stored format) → Jalali parts. */
export function gregorianToJalali(dateStr: string): JDate {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toJalali(y!, m!, d!);
}

/** Jalali parts → "YYYY-MM-DD" (Gregorian, stored format). */
export function jalaliToGregorian(jy: number, jm: number, jd: number): string {
  const { gy, gm, gd } = toGregorian(jy, jm, jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

export function todayJ(): JDate {
  const now = new Date();
  return toJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Local Gregorian "YYYY-MM-DD" for today. */
export function todayGregorianKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function jShift(
  { jy, jm }: { jy: number; jm: number },
  delta: number,
): { jy: number; jm: number } {
  let m = jm + delta;
  let y = jy;
  while (m > 12) {
    m -= 12;
    y += 1;
  }
  while (m < 1) {
    m += 12;
    y -= 1;
  }
  return { jy: y, jm: m };
}

/** «شهریور ۱۴۰۵» */
export function jMonthLabel(jy: number, jm: number): string {
  return `${J_MONTHS[jm - 1]} ${faDigits(jy)}`;
}

/** «۲۴ شهریور» — سال فقط وقتی سال جاری نیست اضافه می‌شود. */
export function jDateLabel(dateStr: string): string {
  const { jy, jm, jd } = gregorianToJalali(dateStr);
  const cur = todayJ();
  const base = `${faDigits(jd)} ${J_MONTHS[jm - 1]}`;
  return jy === cur.jy ? base : `${base} ${faDigits(jy)}`;
}

// ---------------------------------------------------------------------------
// واحدهای پولی (تومان / ریال)
// ---------------------------------------------------------------------------

export const UNITS = [
  { id: "toman", label: "تومان", factor: 1 },
  { id: "rial", label: "ریال", factor: 10 },
] as const;

export type UnitId = (typeof UNITS)[number]["id"];

export function unitLabel(unit: UnitId): string {
  return UNITS.find((u) => u.id === unit)!.label;
}

/** مبلغ ذخیره‌شده (تومان) را در واحد دلخواه نمایش می‌دهد. */
export function formatMoneyIn(
  amount: number,
  unit: UnitId,
  opts?: { signed?: boolean },
): string {
  const value = amount * UNITS.find((u) => u.id === unit)!.factor;
  const sign = value < 0 ? "−" : opts?.signed ? "+" : "";
  const abs = formatAmount(Math.abs(value));
  return `${sign ? sign + " " : ""}${abs} ${unitLabel(unit)}`;
}
