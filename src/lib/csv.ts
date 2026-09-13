/** خروجی CSV با BOM تا اکسل فارسی درست باز کند. */

export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${body}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * پشتیبان‌گیری کامل JSON — v1.5.0
 * همهٔ داده‌های کاربر در یک فایل، با فرمت خوانا و مخصوص بازگردانی آینده.
 */
export function downloadJson(
  filename: string,
  data: Record<string, unknown>,
) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
