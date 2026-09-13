import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarDays,
  ChartPie,
  PiggyBank,
  Tags,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router";

import { Button } from "@/components/ui/button";
import { LedgerMark } from "@/components/LedgerMark";
import { useAuth } from "@/hooks/use-auth";
import { faDigits } from "@/lib/format";
import { VERSION } from "@/lib/version";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

const featured = [
  { name: "خوراک", pct: 34, color: "#6B7A6F" },
  { name: "مسکن", pct: 26, color: "#A68A64" },
  { name: "حمل‌ونقل", pct: 18, color: "#5C6B7A" },
  { name: "رستوران", pct: 14, color: "#9C6B5E" },
  { name: "تفریح", pct: 8, color: "#7A6B8A" },
];

export default function Landing() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const primary = {
    label: isAuthenticated ? "ورود به دفتر" : "ورود به دفتر",
    to: isAuthenticated ? "/dashboard" : "/auth",
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* سربرگ */}
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-6">
          <LedgerMark className="size-7 text-foreground" />
          <span className="font-display text-lg">دفتر من</span>
          <div className="mr-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/about")}>
              درباره و نسخه‌ها
            </Button>
            {isLoading ? null : isAuthenticated ? (
              <Button size="sm" onClick={() => navigate("/dashboard")}>
                داشبورد
                <ArrowLeft className="size-3.5" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  ورود
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")}>
                  شروع رایگان
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* قهرمان */}
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-20 sm:pt-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <motion.div {...fadeUp} transition={{ duration: 0.6, ease: "easeOut" }}>
              <p className="eyebrow">حسابداری شخصی، ساده و روشن</p>
              <h1 className="mt-4 font-display text-5xl font-medium leading-[1.15] sm:text-6xl">
                خرج‌های شما،
                <br />
                منظم مثل یک{" "}
                <span className="italic">دفتر</span>.
              </h1>
              <p className="mt-6 max-w-md text-base leading-8 text-muted-foreground">
                «دفتر من» دفترِ شخصی شما برای ثبت درآمد و هزینه است؛ هر سند زیر
                دسته‌بندی خودش و هر ماه، مرتب و خوانا پیش روی شما.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" onClick={() => navigate(primary.to)}>
                  {primary.label}
                  <ArrowLeft className="size-4" />
                </Button>
                <p className="text-xs text-muted-foreground">
                  رایگان · همگام میان همهٔ دستگاه‌های شما
                </p>
              </div>
            </motion.div>

            {/* قاب پیش‌نمایش */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
              className="rounded-[4px] border bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-8"
            >
              <div className="flex items-center justify-between">
                <p className="eyebrow">خلاصهٔ اسفند</p>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {faDigits("4,120,000")} تومان · {faDigits(5)} تراکنش
                </span>
              </div>
              <div className="mt-6 flex items-end justify-center gap-3 sm:gap-4">
                {featured.map((f, i) => (
                  <motion.div
                    key={f.name}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.6, delay: 0.35 + i * 0.08 }}
                    style={{ originY: 1 }}
                    className="flex flex-1 flex-col items-center gap-2"
                  >
                    <span
                      className="w-full max-w-14 rounded-t-[2px]"
                      style={{
                        backgroundColor: f.color,
                        height: `${f.pct * 3.6}px`,
                      }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {f.name}
                    </span>
                  </motion.div>
                ))}
              </div>
              <div className="mt-8 grid grid-cols-3 gap-4 border-t pt-5 text-center">
                {[
                  ["درآمد", "8,900,000"],
                  ["هزینه", "4,120,000"],
                  ["تراز", "4,780,000"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="mt-1 font-display text-base tabular-nums">
                      {faDigits(value)}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* آنچه در دفتر است */}
        <section className="border-y bg-secondary/40">
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <p className="eyebrow">امکانات دفتر</p>
            <h2 className="mt-3 max-w-lg font-display text-3xl font-medium leading-snug sm:text-4xl">
              دقیقاً همان چیزی که لازم است، و هیچ چیز اضافه‌تر.
            </h2>
            <div className="mt-12 grid gap-px overflow-hidden rounded-[4px] border bg-border sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: CalendarDays,
                  title: "ثبت تراکنش",
                  body: "درآمد و هزینه با مبلغ، تاریخ شمسی، دسته‌بندی، حساب و یادداشت کوتاه — در چند ثانیه، از هر دستگاهی.",
                },
                {
                  icon: Tags,
                  title: "دسته‌بندی‌های خودتان",
                  body: "نام دسته‌ها را خودتان انتخاب می‌کنید؛ هر دسته رنگ ملایم و بودجهٔ خودش را دارد.",
                },
                {
                  icon: ChartPie,
                  title: "نمودار دسته‌ها",
                  body: "ماه، به‌شکل حلقه و میله‌های رتبه‌بندی‌شده — یک نگاه، تصویر کامل.",
                },
                {
                  icon: Wallet,
                  title: "چند حساب",
                  body: "نقدی، بانکی، کارت اعتباری و… هرکدام با موجودی خودش؛ تراز کل همیشه پیشِ چشم.",
                },
                {
                  icon: PiggyBank,
                  title: "بودجهٔ ماهانه",
                  body: "برای هر دسته سقفی بگذارید و ببینید در ماه چقدر جا مانده — قبل از اینکه دیر شود.",
                },
                {
                  icon: ArrowLeftRight,
                  title: "طلب و بدهی",
                  body: "قرض‌های شما و قرض‌هایی که دارید، در یک بخش مشخص — با تسویهٔ یک‌ضرب.",
                },
              ].map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="bg-card p-8"
                >
                  <f.icon className="size-5 text-muted-foreground" strokeWidth={1.5} />
                  <h3 className="mt-5 font-display text-xl">{f.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {f.body}
                  </p>
                </motion.div>
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              و همچنین: روند ماهانهٔ درآمد و هزینه، جست‌وجو و فیلتر، واحد
              تومان یا ریال، و خروجی CSV برای پشتیبان‌گیری شخصی.
            </p>
          </div>
        </section>

        {/* فراخوان پایانی */}
        <section className="mx-auto w-full max-w-6xl px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <LedgerMark className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-6 font-display text-3xl font-medium sm:text-4xl">
              دفترتان را باز کنید.
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
              با ایمیل وارد شوید — دفتر شما بی‌سروصدا بین دستگاه‌ها همگام می‌ماند.
            </p>
            <Button className="mt-8" size="lg" onClick={() => navigate(primary.to)}>
              {primary.label}
              <ArrowLeft className="size-4" />
            </Button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>
            دفتر من — حسابداری شخصی، ساده و خصوصی ·{" "}
            <Link
              to="/about"
              className="tabular-nums underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              نسخهٔ {faDigits(VERSION)}
            </Link>
          </span>
          <Link
            to={primary.to}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {primary.label}
          </Link>
        </div>
      </footer>
    </div>
  );
}
