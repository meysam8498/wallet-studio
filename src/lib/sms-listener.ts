/**
 * پل شنود پیامک بانکی — v2.6.0
 *
 * پوشش تایپ‌دارِ پلاگین بومی SmsListener (اندروید). رویدادهای
 * برداشت/واریزِ تشخیص‌داده‌شده از پیامک بانک را به برنامه می‌دهد تا
 * دیالوگِ تأیید نشان دهد. روی وب و ویندوز بی‌اثر است (پلاگین وجود ندارد).
 */

export type BankSmsEvent = {
  kind: "expense" | "income";
  /** مبلغ به تومان — ریال پیش‌تر ÷۱۰ شده است */
  amount: number;
  unit: "تومان" | "ریال";
  body: string;
  sender: string;
};

type SmsListenerPlugin = {
  requestPermissions(): Promise<{ granted: boolean }>;
  checkPermissions(): Promise<{ granted: boolean }>;
  addListener(
    eventName: string,
    cb: (e: BankSmsEvent) => void,
  ): Promise<{ remove: () => void }>;
};

function getPlugin(): SmsListenerPlugin | null {
  const w = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { SmsListener?: SmsListenerPlugin };
    };
  };
  if (!w.Capacitor?.isNativePlatform?.()) return null;
  return w.Capacitor.Plugins?.SmsListener ?? null;
}

export function smsListenerAvailable(): boolean {
  return getPlugin() !== null;
}

export async function requestSmsPermissions(): Promise<boolean> {
  const p = getPlugin();
  if (!p) return false;
  try {
    const res = await p.requestPermissions();
    return Boolean(res.granted);
  } catch {
    return false;
  }
}

export async function checkSmsPermissions(): Promise<boolean> {
  const p = getPlugin();
  if (!p) return false;
  try {
    const res = await p.checkPermissions();
    return Boolean(res.granted);
  } catch {
    return false;
  }
}

export async function onBankSms(cb: (e: BankSmsEvent) => void): Promise<() => void> {
  const p = getPlugin();
  if (!p) return () => {};
  const handle = await p.addListener("smsBankEvent", cb);
  return () => handle.remove();
}
