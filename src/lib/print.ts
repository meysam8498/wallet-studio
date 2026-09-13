import {
  faDigits,
  formatMoneyIn,
  jMonthLabel,
  type UnitId,
} from "@/lib/format";
import { VERSION } from "@/lib/version";

/**
 * چاپ گزارش ماهانه — v1.5.0
 * یک پنجرهٔ چاپ با چیدمان ایستا و سفید باز می‌شود که می‌تواند ذخیرهٔ PDF هم بشود.
 */

export type PrintMonthReportInput = {
  jy: number;
  jm: number;
  unit: UnitId;
  scope: "هزینه" | "درآمد";
  stats: { income: number; expense: number; net: number };
  transfers: Array<{
    day: string;
    amount: number;
    from: string;
    to: string;
    note?: string;
  }>;
  categories: Array<{ name: string; color: string; total: number; pct: number }>;
  txCount: number;
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function printMonthReport(input: PrintMonthReportInput) {
  const month = jMonthLabel(input.jy, input.jm);
  const now = new Date().toLocaleString("fa-IR");

  const catRows = input.categories
    .map(
      (c) => `
        <tr>
          <td><span class="dot" style="background:${esc(c.color)}"></span>${esc(c.name)}</td>
          <td class="num">${formatMoneyIn(c.total, input.unit)}</td>
          <td class="num">${faDigits(c.pct)}٪</td>
        </tr>`,
    )
    .join("");

  const transferRows = input.transfers
    .map(
      (t) => `
        <tr>
          <td>${esc(t.day)}</td>
          <td>${esc(t.from)} → ${esc(t.to)}</td>
          <td class="num">${formatMoneyIn(t.amount, input.unit)}</td>
          <td>${esc(t.note ?? "")}</td>
        </tr>`,
    )
    .join("");

  const w = window.open("", "_blank", "width=820,height=960");
  if (!w) return;

  w.document.write(`<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>گزارش ${esc(month)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: Vazirmatn, Tahoma, sans-serif;
      color: #1c1c1a;
      margin: 0;
      padding: 32px 40px;
    }
    h1 { font-size: 20px; margin: 0; }
    .meta { color: #6f6d66; font-size: 11px; margin-top: 4px; }
    .head {
      border-bottom: 1px solid #d8d5cc;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .sums { display: flex; gap: 10px; margin-bottom: 20px; }
    .sum {
      flex: 1;
      border: 1px solid #d8d5cc;
      border-radius: 4px;
      padding: 10px 12px;
    }
    .sum .label { font-size: 10px; color: #6f6d66; }
    .sum .value { font-size: 15px; margin-top: 4px; }
    .neg { color: #a3392e; }
    h2 { font-size: 13px; margin: 18px 0 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: right; padding: 6px 8px; border-bottom: 1px solid #eceae3; }
    th { font-size: 10px; color: #6f6d66; font-weight: 500; border-bottom: 1px solid #d8d5cc; }
    .num { font-variant-numeric: tabular-nums; }
    .dot {
      display: inline-block;
      width: 8px; height: 8px;
      border-radius: 50%;
      margin-left: 6px;
    }
    .foot {
      margin-top: 24px;
      border-top: 1px solid #d8d5cc;
      padding-top: 10px;
      font-size: 10px;
      color: #6f6d66;
      display: flex;
      justify-content: space-between;
    }
    @page { margin: 14mm; }
  </style>
</head>
<body>
  <div class="head">
    <h1>گزارش ${esc(month)}</h1>
    <div class="meta">دفتر من · نسخهٔ ${faDigits(VERSION)} · چاپ در ${esc(now)}</div>
  </div>

  <div class="sums">
    <div class="sum">
      <div class="label">درآمد ماه</div>
      <div class="value">${formatMoneyIn(input.stats.income, input.unit)}</div>
    </div>
    <div class="sum">
      <div class="label">هزینهٔ ماه</div>
      <div class="value">${formatMoneyIn(input.stats.expense, input.unit)}</div>
    </div>
    <div class="sum">
      <div class="label">تراز ماه</div>
      <div class="value${input.stats.net < 0 ? " neg" : ""}">${formatMoneyIn(input.stats.net, input.unit)}</div>
    </div>
  </div>

  ${input.categories.length ? `
  <h2>${input.scope === "هزینه" ? "هزینه‌ها" : "درآمدها"} به تفکیک دسته</h2>
  <table>
    <thead><tr><th>دسته</th><th>مبلغ</th><th>سهم</th></tr></thead>
    <tbody>${catRows}</tbody>
  </table>` : ""}

  ${input.transfers.length ? `
  <h2>انتقال‌های میان حساب‌ها</h2>
  <table>
    <thead><tr><th>تاریخ</th><th>مسیر</th><th>مبلغ</th><th>یادداشت</th></tr></thead>
    <tbody>${transferRows}</tbody>
  </table>` : ""}

  <div class="foot">
    <span>${faDigits(input.txCount)} سند در این ماه</span>
    <span>دفتر من</span>
  </div>
</body>
</html>`);
  w.document.close();
  w.focus();
  w.print();
}
