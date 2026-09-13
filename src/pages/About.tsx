import { motion } from "framer-motion";
import {
  ArrowRight,
  Download,
  Github,
  Globe,
  Linkedin,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MonitorDown,
  Moon,
  Package,
  Phone,
  Send,
  Ship,
  Smartphone,
  Sun,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";

import { useTheme } from "@/hooks/use-theme";

import { LedgerMark } from "@/components/LedgerMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { faDigits } from "@/lib/format";
import {
  CHANGELOG,
  CHANGE_TYPE_COLORS,
  CHANGE_TYPE_LABELS,
  CONTACTS,
  CREATOR,
  DOWNLOADS,
  VERSION,
  type ContactItem,
} from "@/lib/version";

const CONTACT_ICONS = {
  globe: Globe,
  github: Github,
  docker: Ship,
  linkedin: Linkedin,
  send: Send,
  "message-circle": MessageCircle,
  phone: Phone,
  mail: Mail,
} as const;

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
};

function ContactCard({ item }: { item: ContactItem }) {
  const Icon = CONTACT_ICONS[item.icon];
  const available = Boolean(item.href);
  const body = (
    <>
      <Icon className="size-4 text-muted-foreground" strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{item.label}</p>
        <p
          className={`truncate text-sm ${available ? "font-medium" : "text-muted-foreground/70"}`}
        >
          {item.value}
        </p>
      </div>
    </>
  );
  const cls = "flex items-center gap-3 rounded-[4px] border bg-card p-4";
  return available ? (
    <a
      key={item.id}
      href={item.href}
      target="_blank"
      rel="noreferrer"
      className={`${cls} transition-colors hover:border-foreground/30`}
    >
      {body}
    </a>
  ) : (
    <div key={item.id} className={`${cls} opacity-70`}>
      {body}
    </div>
  );
}

export default function About() {
  const { isAuthenticated, isLoading, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const backTo = isAuthenticated ? "/dashboard" : "/auth";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      navigate("/auth");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* سربرگ */}
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center gap-3 px-6">
          <div className="flex items-center gap-2.5">
            <LedgerMark className="size-7 text-foreground" />
            <span className="font-display text-lg">دفتر من</span>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <button
              aria-label={theme === "dark" ? "تم روشن" : "تم تیره"}
              onClick={toggleTheme}
              className="grid size-8 place-items-center rounded-[3px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {theme === "dark" ? (
                <Sun className="size-4" strokeWidth={1.5} />
              ) : (
                <Moon className="size-4" strokeWidth={1.5} />
              )}
            </button>
            {isLoading ? null : isAuthenticated ? (
              <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? <Loader2 className="size-4 animate-spin" /> : "خروج"}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                ورود
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
              <ArrowRight className="size-3.5" />
              بازگشت
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 pb-24">
        {/* عنوان */}
        <section className="pt-14 pb-10">
          <p className="eyebrow">درباره و نسخه‌ها</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <h1 className="font-display text-4xl font-medium">
              دفتر من
            </h1>
            <Badge
              variant="outline"
              className="rounded-[3px] border-foreground/25 font-normal tabular-nums"
            >
              نسخهٔ {faDigits(VERSION)}
            </Badge>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            حسابداری شخصی با تقویم شمسی و همگام‌سازی زنده میان همهٔ دستگاه‌های
            شما. این صفحه تاریخچهٔ تغییرات، سازنده و راه‌های ارتباط را در بر
            می‌گیرد.
          </p>
        </section>

        {/* سازنده */}
        <motion.section {...fadeUp} transition={{ duration: 0.5 }} className="pt-4">
          <p className="eyebrow">سازنده</p>
          <div className="mt-4 rounded-[4px] border bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-[3px] border font-display text-xl">
                م
              </div>
              <div>
                <h2 className="font-display text-xl">{CREATOR.name}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {CREATOR.nameEn} · {CREATOR.role}
                </p>
                <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
                  {CREATOR.bio}
                </p>
              </div>
            </div>
          </div>
        </motion.section>

        {/* تماس */}
        <motion.section {...fadeUp} transition={{ duration: 0.5 }} className="pt-10">
          <p className="eyebrow">تماس</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CONTACTS.map((c) => (
              <ContactCard key={c.id} item={c} />
            ))}
          </div>
        </motion.section>

        {/* دانلودها */}
        <motion.section {...fadeUp} transition={{ duration: 0.5 }} className="pt-10">
          <p className="eyebrow">دانلودها</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DOWNLOADS.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-4 rounded-[4px] border bg-card p-5"
              >
                <div className="grid size-11 shrink-0 place-items-center rounded-[3px] border">
                  {d.platform === "android" ? (
                    <Smartphone className="size-5 text-muted-foreground" strokeWidth={1.5} />
                  ) : (
                    <MonitorDown className="size-5 text-muted-foreground" strokeWidth={1.5} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{d.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    نسخهٔ {faDigits(d.version)}
                    {d.note ? ` · ${d.note}` : ""}
                  </p>
                </div>
                {d.href ? (
                  <a href={d.href} download>
                    <Button size="sm">
                      <Download className="size-3.5" />
                      دریافت
                    </Button>
                  </a>
                ) : (
                  <Button size="sm" variant="outline" disabled>
                    <Lock className="size-3.5" />
                    به‌زودی
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            نسخهٔ وب همیشه آخرین است — همین برنامه که اکنون می‌بینید.
          </p>
        </motion.section>

        {/* تاریخچهٔ نسخه‌ها */}
        <motion.section {...fadeUp} transition={{ duration: 0.5 }} className="pt-12">
          <p className="eyebrow">تاریخچهٔ تغییرات</p>
          <div className="mt-6">
            {CHANGELOG.map((entry, idx) => (
              <div key={entry.version} className="relative pr-8 pb-10 last:pb-2">
                {/* خط زمانی */}
                <span
                  aria-hidden
                  className="absolute top-2 right-[7px] bottom-0 w-px bg-border last:hidden"
                  style={{ display: idx === CHANGELOG.length - 1 ? "none" : undefined }}
                />
                <span
                  aria-hidden
                  className={`absolute top-1.5 right-0 size-[15px] rounded-full border-2 ${
                    idx === 0
                      ? "border-foreground bg-background"
                      : "border-border bg-background"
                  }`}
                />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-display text-xl">
                    نسخهٔ {faDigits(entry.version)}
                  </h3>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {entry.date}
                  </span>
                  {idx === 0 && (
                    <Badge
                      variant="outline"
                      className="rounded-[3px] border-foreground/25 text-[10px] font-normal"
                    >
                      آخرین
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{entry.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {entry.changes.map((c, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span
                        className="mt-1 inline-block shrink-0 rounded-[2px] px-1.5 py-0.5 text-[10px] leading-4"
                        style={{
                          color: CHANGE_TYPE_COLORS[c.type],
                          border: `1px solid ${CHANGE_TYPE_COLORS[c.type]}55`,
                        }}
                      >
                        {CHANGE_TYPE_LABELS[c.type]}
                      </span>
                      <span className="text-sm leading-6">{c.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.section>

        {/* یادداشت فنی */}
        <motion.section
          {...fadeUp}
          transition={{ duration: 0.5 }}
          className="rounded-[4px] border bg-secondary/40 p-6"
        >
          <div className="flex items-center gap-2">
            <Package className="size-4 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm font-medium">یادداشت فنی</p>
          </div>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs leading-6 text-muted-foreground">
            <li>همگام‌سازی زندهٔ داده میان همهٔ دستگاه‌ها با رمزگذاری در انتقال.</li>
            <li>تقویم شمسی کامل، شامل سال کبیسه و مرزهای ماه‌های جلالی.</li>
            <li>خروجی CSV سازگار با اکسل برای پشتیبان‌گیری شخصی.</li>
            <li>تاریخچهٔ کامل فنی هر نسخه در مخزن گیت‌هاب پروژه نگهداری می‌شود.</li>
          </ul>
        </motion.section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
          <span>
            دفتر من · نسخهٔ {faDigits(VERSION)} · {CREATOR.name}
          </span>
          <Link
            to={backTo}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            بازگشت به {isAuthenticated ? "داشبورد" : "آغاز"}
          </Link>
        </div>
      </footer>
    </div>
  );
}
