/**
 * دسترسی‌های اندروید — v2.7.0
 *
 * پوشش تایپ‌دارِ پلاگین‌های بومی برای مجوزهای زمان اجرا: میکروفون
 * (تشخیص گفتار دستیار) و پیامک (شنود بانکی). درخواست مجوز در اندروید
 * ۱۳+ از طریق پلاگین Permissions انجام می‌شود؛ در نسخه‌های قدیمی‌تر
 * WebView خودش هنگام use می‌پرسد.
 */

type PermissionsPlugin = {
  query(options: { permissions: string[] }): Promise<{ results: Array<{ permission: string; state: "granted" | "denied" | "prompt" }> }>;
  request(options: { permissions: string[] }): Promise<{ results: Array<{ permission: string; state: "granted" | "denied" | "prompt" }> }>;
};

type WebViewPlugin = {
  requestPermissions?(options: { permissions: string[] }): Promise<unknown>;
};

function getPlugin<T>(name: string): T | null {
  const w = window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, T> };
  };
  if (!w.Capacitor?.isNativePlatform?.()) return null;
  return (w.Capacitor.Plugins?.[name] as T) ?? null;
}

export function isNative(): boolean {
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  return Boolean(w.Capacitor?.isNativePlatform?.());
}

const RECORD_AUDIO = "android.permission.RECORD_AUDIO";
const RECEIVE_SMS = "android.permission.RECEIVE_SMS";
const READ_SMS = "android.permission.READ_SMS";

/** درخواست میکروفون برای تشخیص گفتار — true یعنی مجوز داده شد */
export async function requestMicrophonePermission(): Promise<boolean> {
  const perms = getPlugin<PermissionsPlugin>("Permissions");
  if (perms) {
    try {
      const res = await perms.request({ permissions: [RECORD_AUDIO] });
      const st = res.results.find((r) => r.permission === RECORD_AUDIO)?.state;
      if (st === "granted") return true;
    } catch { /* به روش WebView ادامه بده */ }
  }
  const webview = getPlugin<WebViewPlugin>("WebView");
  if (webview?.requestPermissions) {
    try {
      await webview.requestPermissions({ permissions: [RECORD_AUDIO] });
    } catch { /* نتیجه از وب‌ویو نامشخص است */ }
  }
  // fallback استاندارد وب (در WebView اندروید کاور می‌شود)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch {
    return false;
  }
}

/** درخواست پیامک — اگر پلاگین SmsListener نبود، بی‌اثر است */
export async function requestSmsPermissionsViaPermissions(): Promise<boolean> {
  const perms = getPlugin<PermissionsPlugin>("Permissions");
  if (!perms) return false;
  try {
    const res = await perms.request({ permissions: [RECEIVE_SMS, READ_SMS] });
    return res.results.every((r) => r.state === "granted");
  } catch {
    return false;
  }
}

/** وضعیت فعلی میکروفون — برای نمایش شرطی دکمهٔ فعال‌سازی */
export async function micPermissionState(): Promise<"granted" | "denied" | "prompt"> {
  const perms = getPlugin<PermissionsPlugin>("Permissions");
  if (perms) {
    try {
      const res = await perms.query({ permissions: [RECORD_AUDIO] });
      return res.results.find((r) => r.permission === RECORD_AUDIO)?.state ?? "prompt";
    } catch { /* ادامه */ }
  }
  return "prompt";
}
