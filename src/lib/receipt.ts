/**
 * پیوست رسید — تصویر انتخابی به data URL کوچک تبدیل می‌شود
 * (بیشینه ۱۰۲۴ پیکسل، JPEG با کیفیت ۷۲٪) تا در دیتابیس جا شود.
 */

const MAX_DIM = 1024;
const QUALITY = 0.72;
const MAX_INPUT_BYTES = 10 * 1024 * 1024; // ۱۰ مگابایت

export async function fileToReceiptDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("فقط فایل تصویری پشتیبانی می‌شود");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error("حجم تصویر بیش از حد بزرگ است (سقف ۱۰ مگابایت)");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("پردازش تصویر ممکن نشد");
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", QUALITY);
}
