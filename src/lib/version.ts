/**
 * منبع یگانهٔ حقیقت برای اطلاعات نسخه، تغییرات نسخه‌به‌نسخه، سازنده و دانلودها.
 *
 * هر بار که تغییری منتشر می‌شود، فقط همین فایل ویرایش می‌شود:
 *   ۱. VERSION را بالا ببرید (کاملاً حسب semver)
 *   ۲. یک مدخل تازه در ابتدای CHANGELOG اضافه کنید
 *   ۳. در صورت تغییر وضعیت، دانلودهای بومی را به‌روز کنید
 *
 * قواعد نسخه‌گذاری:
 *   major  — تغییر بزرگ یا ناسازگار (مثلاً بازطراحی کامل، مهاجرت داده)
 *   minor  — قابلیت تازه
 *   patch  — رفع اشکال یا بهبود جزئی
 */

export const VERSION = "2.3.0";

export const RELEASE_DATE = "۱۴۰۵/۰۶/۲۳";

export type ChangeType = "added" | "changed" | "fixed" | "security";

export type ChangelogEntry = {
  version: string;
  date: string;
  title: string;
  /** تغییرات مهم به فارسی؛ ترتیب: added → changed → fixed → security */
  changes: Array<{ type: ChangeType; text: string }>;
};

export const CHANGE_TYPE_LABELS: Record<ChangeType, string> = {
  added: "افزوده",
  changed: "تغییر",
  fixed: "رفع اشکال",
  security: "امنیت",
};

export const CHANGE_TYPE_COLORS: Record<ChangeType, string> = {
  added: "#6B7A6F",
  changed: "#5C6B7A",
  fixed: "#A68A64",
  security: "#9C6B5E",
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.3.0",
    date: "۱۴۰۵/۰۶/۲۳",
    title: "بازطراحی موبایل — سیستم طراحی DESIGN.md",
    changes: [
      { type: "added", text: "سیستم طراحی مستند بر پایهٔ استاندارد DESIGN.md گوگل — توکن‌های رنگ، قلم، گردی و فاصله در DESIGN.md مخزن" },
      { type: "fixed", text: "رفع سرریز متن‌ها در نمایش اندروید: همهٔ صفحه‌ها در عرض ۳۶۰ پیکسل بدون اسکرول افقی تأیید شدند" },
      { type: "changed", text: "نوار ابزار تراکنش‌ها (جست‌وجو و فیلتر) روی موبایل زیر عنوان می‌شکند؛ کارت ورود، سربرگ و اندازهٔ عنوان‌ها برای نمایشگرهای تنگ بازتنظیم شد" },
      { type: "added", text: "پشتیبانی نمایش لبه‌به‌لبهٔ اندروید با رعایت نواحی امن و قفل زوم متن WebView تا بزرگ‌نمایی سیستم چیدمان را نشکند" },
      { type: "changed", text: "گفت‌وگوها روی موبایل محدود به ارتفاع صفحه‌اند و محتوایشان اسکرول می‌شود" },
    ],
  },
  {
    version: "2.2.1",
    date: "۱۴۰۵/۰۶/۲۳",
    title: "لینک‌های همیشه‌به‌روز دانلود",
    changes: [
      { type: "added", text: "دکمه‌های دانلود اندروید و ویندوز در بخش «درباره» اکنون همیشه تازه‌ترین نسخهٔ منتشرشده را می‌دهند — بدون نیاز به به‌روزرسانی برنامه" },
      { type: "changed", text: "همگام‌سازی خودکار توضیحات گیت‌هاب و داکر هاب با هر انتشار — از فایل‌های نسخه‌دار مخزن" },
      { type: "fixed", text: "پاک‌سازی آخرین نام ابزار میزبان از فایل‌های مخزن" },
    ],
  },
  {
    version: "2.2.0",
    date: "۱۴۰۵/۰۶/۲۳",
    title: "ورود با گذرواژه — صفر تنظیمات",
    changes: [
      { type: "added", text: "ورود با ایمیل و گذرواژه — بدون تأیید ایمیل، بدون SMTP و بدون هیچ سرویس بیرونی" },
      { type: "changed", text: "داده‌ها روی استقرار ابری رایگان می‌مانند؛ همهٔ دستگاه‌ها با یک حساب، دفتر یکسانی می‌بینند و هیچ پیکربندی‌ای لازم نیست" },
      { type: "security", text: "گذرواژه‌ها با الگوریتم Scrypt در خود بک‌اند هش می‌شوند و هرگز خام ذخیره نمی‌شوند" },
      { type: "changed", text: "نمایش/پنهان‌کردن گذرواژه در صفحهٔ ورود و پیام‌های خطای فارسی روشن برای حالت‌های رایج" },
      { type: "changed", text: "ورود مهمان همچنان برای آزمایش سریع بدون حساب در دسترس است" },
    ],
  },
  {
    version: "2.1.0",
    date: "۱۴۰۵/۰۶/۲۲",
    title: "انتشار عمومی — دفتر من",
    changes: [
      { type: "changed", text: "تغییر نام برنامه از «دفتر استودیو» به «دفتر من» — هویت روشن یک اپ حسابداری شخصی، بدون تم استودیویی" },
      { type: "changed", text: "بازنویسی متن‌های صفحهٔ اصلی و داشبورد با لحن سادهٔ حسابداری؛ حذف استعاره‌های گالری و قاب" },
      { type: "fixed", text: "رفع خطای ورود در استقرار تازه: تنظیم خودکار کلید امضای توکن و آدرس سایت در راهنمای راه‌اندازی" },
      { type: "added", text: "اجرای محلی یک‌فرمانی: بک‌اند محلی، پیکربندی ایمیل آزمایشی و ورود مهمان بدون هیچ سرویس بیرونی" },
      { type: "added", text: "پوسته‌های بومی: اندروید با Capacitor و ویندوز با Tauri — با گردش‌کار ساخت خودکار APK و MSI/NSIS" },
      { type: "changed", text: "ارسال کد ورود مستقیماً از SMTP خودتان — حذف کامل وابستگی به سرویس واسط پلتفرمی" },
      { type: "changed", text: "حذف کامل ابزارهای پلتفرم میزبان از مخزن؛ پروژه کاملاً مستقل و قابل میزبانی روی هر سرور است" },
      { type: "added", text: "گردش‌کار انتشار خودکار: CI در هر پوش، تصویر داکر و خروجی‌های بومی پس از هر برچسب" },
      { type: "fixed", text: "محاسبهٔ موجودی حساب‌ها اکنون دو سمت انتقال میان حساب‌ها را درست اعمال می‌کند" },
      { type: "fixed", text: "رفع خطاهای ساخت: مؤلفهٔ ناموجود در دکمهٔ پشتیبان JSON و نوع ناقص فیلتر نمودارها" },
    ],
  },
  {
    version: "1.5.0",
    date: "۱۴۰۵/۰۶/۲۱",
    title: "انتقال میان حساب‌ها، چاپ گزارش و نمای سالانه",
    changes: [
      { type: "added", text: "انتقال پول میان حساب‌های خودتان — بدون اثر بر درآمد و هزینه، با نمایش مسیر مبدأ ← مقصد" },
      { type: "added", text: "چاپ گزارش ماهانه (یا ذخیرهٔ PDF) با خلاصه، تفکیک دسته‌ها و انتقال‌ها" },
      { type: "added", text: "نمای سالانه: جمع دوازده‌ماههٔ درآمد، هزینه و تراز سال شمسی جاری" },
      { type: "added", text: "پشتیبان‌گیری کامل JSON از همهٔ داده‌ها — دسته‌ها، حساب‌ها، تراکنش‌ها، طلب‌ها و پرداخت‌های تکراری" },
      { type: "changed", text: "فهرست تراکنش‌ها و خروجی CSV اکنون نوع انتقال را هم نشان می‌دهند" },
    ],
  },
  {
    version: "1.4.0",
    date: "۱۴۰۵/۰۶/۲۰",
    title: "پرداخت‌های تکراری، رسید تصویری و تم تیره",
    changes: [
      { type: "added", text: "پرداخت‌های تکراری (اشتراک، اجاره، قسط) با ثبت خودکار در سرسید ماهانهٔ شمسی" },
      { type: "added", text: "پیوست تصویر رسید به هر تراکنش، با فشرده‌سازی خودکار و پیش‌نمایش" },
      { type: "added", text: "تم تیره و روشن با ذخیرهٔ انتخاب کاربر در همهٔ دستگاه‌ها" },
      { type: "changed", text: "یادداشت پرداخت‌های خودکار با عنوان «پرداخت تکراری» مشخص می‌شود" },
    ],
  },
  {
    version: "1.3.1",
    date: "۱۴۰۴/۰۶/۲۰",
    title: "پایداری ساخت",
    changes: [
      { type: "fixed", text: "رفع تداخل نام متغیر در پنل دسته‌بندی‌ها که مانع ساخت و اجرای برنامه می‌شد" },
      { type: "changed", text: "تقویت فرایند ساخت: تایپ‌چک کامل پروژه پیش از هر انتشار" },
    ],
  },
  {
    version: "1.3.0",
    date: "۱۴۰۴/۰۶/۱۹",
    title: "حساب‌ها، بودجه، طلب و بدهی",
    changes: [
      { type: "added", text: "مدیریت چند حساب (نقدی، بانکی، کارت، کیف پول) با موجودی مستقل و تراز کل" },
      { type: "added", text: "بودجهٔ ماهانه برای هر دستهٔ هزینه، همراه نوار پیشرفت و هشدار عبور از سقف" },
      { type: "added", text: "دفتر طلب و بدهی با تسویهٔ یک‌ضرب و امکان ثبت خودکار تراکنش تسویه" },
      { type: "added", text: "نمودار روند شش‌ماههٔ درآمد و هزینه (تقویم شمسی)" },
      { type: "added", text: "جست‌وجوی زندهٔ تراکنش‌ها در یادداشت و دسته‌بندی" },
      { type: "added", text: "خروجی CSV از ماه جاری برای پشتیبان‌گیری شخصی" },
      { type: "added", text: "تغییر واحد پولی بین تومان و ریال از سربرگ داشبورد" },
      { type: "added", text: "بخش «درباره و نسخه‌ها»: تاریخچهٔ تغییرات، اطلاعات سازنده، راه‌های تماس و دانلود بومی" },
    ],
  },
  {
    version: "1.2.0",
    date: "۱۴۰۴/۰۶/۱۲",
    title: "پارسی‌سازی کامل",
    changes: [
      { type: "added", text: "رابط کاربری تمام‌فارسی با چینش راست‌به‌چپ" },
      { type: "added", text: "تقویم شمسی واقعی: ناوبری ماه، انتخاب‌گر تاریخ و برچسب‌ها" },
      { type: "added", text: "اعداد فارسی در سراسر برنامه؛ ورود اعداد با هر دو رقم فارسی و انگلیسی" },
      { type: "changed", text: "قلم Vazirmatn و جایگزینی قلم‌های لاتین" },
      { type: "changed", text: "دسته‌بندی‌های پیش‌فرض فارسی‌شده برای کاربران تازه" },
    ],
  },
  {
    version: "1.1.0",
    date: "۱۴۰۴/۰۶/۰۵",
    title: "بهبودهای رابط و پایداری",
    changes: [
      { type: "changed", text: "بهبود چیدمان و فاصله‌گذاری در صفحهٔ اصلی" },
      { type: "changed", text: "اصلاح انتخاب رنگ دسته‌بندی و پیش‌نمایش زنده" },
      { type: "fixed", text: "رفع کرش هنگام حذف آخرین دسته‌بندی" },
      { type: "fixed", text: "رفع ناسازگاری فیلتر ماه با تاریخ‌های مرزی" },
    ],
  },
  {
    version: "1.0.0",
    date: "۱۴۰۴/۰۵/۲۹",
    title: "انتشار نخست — ثبت و دسته‌بندی",
    changes: [
      { type: "added", text: "ثبت درآمد و هزینه با مبلغ، تاریخ، دسته‌بندی و یادداشت" },
      { type: "added", text: "دسته‌بندی‌های قابل‌تعریف با پالت رنگ ملایم" },
      { type: "added", text: "نمودار حلقه‌ای و میله‌ای دسته‌ها به‌عنوان دیوار اصلی" },
      { type: "added", text: "همگام‌سازی زنده میان همهٔ دستگاه‌ها" },
    ],
  },
];

export const CREATOR = {
  name: "میثم ایجادی",
  nameEn: "Meysam Ijadi",
  role: "طراح و توسعه‌دهنده",
  bio: "سازندهٔ «دفتر من» — طراحی و توسعه با تمرکز بر سادگی، حریم خصوصی و ماندگاری داده.",
} as const;

export type ContactItem = {
  id: string;
  label: string;
  value: string;
  href?: string;
  /** نام آیکون lucide-react */
  icon: "globe" | "github" | "docker" | "linkedin" | "send" | "message-circle" | "phone" | "mail";
};

export const CONTACTS: ContactItem[] = [
  {
    id: "email",
    label: "ایمیل",
    value: "M.Ijadi@Hotmail.com",
    href: "mailto:M.Ijadi@Hotmail.com",
    icon: "mail",
  },
  {
    id: "phone",
    label: "تلفن و واتس‌اپ",
    value: "+۹۸ ۹۰۲ ۲۹۶ ۴۰۰۶",
    href: "tel:+989022964006",
    icon: "phone",
  },
  {
    id: "telegram",
    label: "تلگرام و واتس‌اپ",
    value: "Meysam_Ijadi@",
    href: "https://t.me/Meysam_Ijadi",
    icon: "send",
  },
  {
    id: "github",
    label: "گیت‌هاب",
    value: "meysam8498",
    href: "https://github.com/meysam8498",
    icon: "github",
  },
  {
    id: "docker",
    label: "داکر هاب",
    value: "meysam8498",
    href: "https://hub.docker.com/u/meysam8498",
    icon: "docker",
  },
  {
    id: "whatsapp",
    label: "واتس‌اپ",
    value: "Meysam_Ijadi",
    href: "https://wa.me/989022964006",
    icon: "message-circle",
  },
];

export type DownloadItem = {
  id: string;
  platform: "android" | "windows" | "web";
  label: string;
  version: string;
  size?: string;
  href?: string;
  note?: string;
};

// لینک‌های همیشگی: گیت‌هاب «releases/latest/download» را همیشه به آخرین
// Release منتشرشده هدایت می‌کند؛ فایل‌های «-latest» در هر انتشار کنار
// فایل‌های نسخه‌دار بارگذاری می‌شوند تا این لینک‌ها هرگز کهنه نشوند.
const LATEST_BASE =
  "https://github.com/meysam8498/wallet-studio/releases/latest/download";

export const DOWNLOADS: DownloadItem[] = [
  {
    id: "android",
    platform: "android",
    label: "اندروید (APK)",
    version: VERSION,
    href: `${LATEST_BASE}/Daftaram-latest-android.apk`,
    note: "همیشه تازه‌ترین نسخه",
  },
  {
    id: "windows",
    platform: "windows",
    label: "ویندوز (EXE)",
    version: VERSION,
    href: `${LATEST_BASE}/Daftaram-latest-windows-x64-setup.exe`,
    note: "همیشه تازه‌ترین نسخه",
  },
];

export function latestVersion(): string {
  return CHANGELOG[0]?.version ?? VERSION;
}
