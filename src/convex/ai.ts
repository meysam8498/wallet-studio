"use node";
/**
 * دستیار هوشمند دفتر — v2.5.0
 *
 * متنِ آزاد فارسی (تایپ‌شده یا حاصل تشخیص گفتار) را به یک پیش‌نویس
 * تراکنش تبدیل می‌کند: نوع (هزینه/درآمد/انتقال)، مبلغ، دسته و یادداشت.
 * مثال: «۲۰۰ تومن دادم به اسنپ» ← هزینه، ۲۰۰٬۰۰۰ تومان، حمل‌ونقل.
 *
 * زنجیرهٔ جایگزینی ارائه‌دهنده‌ها — اگر یکی در دسترس نبود یا خطا داد،
 * بعدی امتحان می‌شود تا تشخیص همیشه کار کند:
 *   1. OpenRouter     (کلید: AI_KEY_OPENROUTER — مدل‌های رایگان با پسوند :free)
 *   2. Groq           (کلید: AI_KEY_GROQ)
 *   3. OpenCode Zen   (کلید: AI_KEY_OPENCODE)
 *   4. Google AI Studio (کلید: AI_KEY_GOOGLE)
 *
 * امنیت: کلیدها فقط در متغیرهای محیطیِ سمت سرورِ Convex نگهداری می‌شوند
 * (`bunx convex env set AI_KEY_GROQ ...`) و هرگز در کد یا گیت نمی‌آیند.
 * اگر هیچ کلیدی تنظیم نشده باشد، تجزیه‌گر قاعده‌محورِ داخلی پاسخ می‌دهد
 * تا قابلیت بدون هیچ کلیدی هم کار کند.
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";

export type DraftTx = {
  type: "expense" | "income" | "transfer";
  /** مبلغ به تومان */
  amount: number;
  /** نام دستهٔ پیشنهادی (فارسی، خلاصه) */
  category: string;
  note?: string;
  /** کدام ارائه‌دهنده تشخیص داد — برای نمایش در رابط */
  provider: string;
  /** درستی تشخیص ۰ تا ۱ — هرچه کمتر، رابط بیشتر هشدار می‌دهد */
  confidence: number;
};

type ProviderResult = DraftTx | null;

const SYSTEM_PROMPT = `تو دستیار حسابداری شخصیِ یک برنامهٔ فارسی هستی. کاربر یک جملهٔ فارسی محاوره‌ای می‌گوید و تو آن را به تراکنش تبدیل می‌کنی.

فقط و فقط یک JSON معتبر برگردان، بدون هیچ توضیح اضافه:
{"type":"expense"|"income"|"transfer","amount":<عدد به تومان>,"category":"<نام دسته کوتاه فارسی>","note":"<یادداشت کوتاه یا خالی>","confidence":<0 تا 1>}

قواعد:
- «تومن/تومان» بدون هزار یعنی همان عدد؛ «هزار تومن» ×۱۰۰۰؛ «میلیون» ×۱٬۰۰۰٬۰۰۰. اعداد فارسی و انگلیسی هر دو می‌آید.
- «دادم/خریدم/پرداخت کردم/فرستادم» = expense. «گرفتم/دریافت کردم/واریز شد» = income. «منتقل کردم/کارت به کارت» = transfer.
- دسته را از کاربرد روزمرهٔ فارسی انتخاب کن: خوراک، حمل‌ونقل، قبض، خرید، تفریح، سلامت، آموزش، اجاره، حقوق، هدیه و مانند آن.
- اگر مبلغ مبهم است ۰ بگذار و confidence را کم بده.`;

/** هر.KeyCode که در پاسخ مدل به‌صورت JSON نیمه‌سالم پیدا شود */
function extractJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function normalize(raw: Record<string, unknown>, provider: string): DraftTx | null {
  const type = String(raw.type ?? "");
  if (!["expense", "income", "transfer"].includes(type)) return null;
  const amount = Math.round(Number(raw.amount ?? 0));
  const category = String(raw.category ?? "").trim() || (type === "income" ? "درآمد" : "سایر");
  const note = String(raw.note ?? "").trim();
  const confidence = Math.min(1, Math.max(0, Number(raw.confidence ?? 0.7)));
  if (!Number.isFinite(amount) || amount < 0) return null;
  return {
    type: type as DraftTx["type"],
    amount,
    category,
    note: note || undefined,
    provider,
    confidence,
  };
}

async function callOpenAICompatible(
  baseUrl: string,
  key: string,
  model: string,
  provider: string,
  text: string,
): Promise<ProviderResult> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${provider}: HTTP ${res.status}`);
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);
  return parsed ? normalize(parsed, provider) : null;
}

async function callGemini(
  key: string,
  provider: string,
  text: string,
): Promise<ProviderResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 200 },
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!res.ok) throw new Error(`${provider}: HTTP ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const content = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  const parsed = extractJson(content);
  return parsed ? normalize(parsed, provider) : null;
}

// ---------------------------------------------------------------------------
// تجزیه‌گر قاعده‌محور داخلی — وقتی هیچ ارائه‌دهنده‌ای در دسترس نیست
// ---------------------------------------------------------------------------

const FALLBACK_CATEGORIES: Array<[RegExp, string]> = [
  [/اسنپ|تپسی|تاکسی|بنزین|سوخت|مترو|اتوبوس|پارکینگ/, "حمل‌ونقل"],
  [/قبض|برق|آب|گاز|موبایل|همراه اول|ایرانسل|اینترنت/, "قبض"],
  [/خواربار|سوپرمارکت|فروشگاه|نان|گوشت|میوه|رستوران|کافه|غذا/, "خوراک"],
  [/دارو|پزشک|درمان|بیمارستان|دندان/, "سلامت"],
  [/اجاره|رهن/, "اجاره"],
  [/قسط|وام/, "قسط"],
  [/فیلم|سینما|بازی|تفریح|سفر|هتل/, "تفریح"],
  [/مدرسه|دانشگاه|کلاس|کتاب|دوره/, "آموزش"],
  [/حقوق|فروش|درآمد|دریافت کردم|واریز/, "درآمد"],
];

function parseFaNumber(raw: string): number {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const latin = raw.replace(/[۰-۹]/g, (d) => String(fa.indexOf(d)));
  const cleaned = latin.replace(/[,\u066C]/g, "");
  const m = cleaned.match(/([\d.]+)/);
  if (!m) return 0;
  let n = parseFloat(m[1]!);
  if (/میلیون|ملیون/.test(raw)) n *= 1_000_000;
  else if (/هزار|هزاز/.test(raw)) n *= 1_000;
  return Math.round(n);
}

function ruleBased(text: string): DraftTx {
  const lower = text.replace(/\u200c/g, " ");
  const numMatch =
    lower.match(/(\d[\d.,]*|[۰-۹][۰-۹.,]*)\s*(هزار|میلیون|ملیون)?\s*(تومن|تومان|ریال)?/) ?? [];
  let amount = parseFaNumber(numMatch[0] ?? "");
  if (/ریال/.test(lower) && amount > 0) amount = Math.round(amount / 10);
  const isIncome = /گرفتم|دریافت|واریز شد|حقوق|فروختم/.test(lower);
  const isTransfer = /منتقل|کارت به کارت|حواله/.test(lower);
  let category = isIncome ? "درآمد" : "سایر";
  for (const [re, name] of FALLBACK_CATEGORIES) {
    if (re.test(lower)) {
      category = name;
      break;
    }
  }
  if (isIncome && category === "سایر") category = "درآمد";
  return {
    type: isTransfer ? "transfer" : isIncome ? "income" : "expense",
    amount,
    category,
    note: text.trim().slice(0, 80),
    provider: "قاعده‌محور",
    confidence: amount > 0 ? 0.5 : 0.25,
  };
}

// ---------------------------------------------------------------------------

export const parseTransaction = internalAction({
  args: { text: v.string() },
  handler: async (_, { text }): Promise<DraftTx> => {
    const clean = text.trim();
    if (!clean) throw new Error("متنی برای تشخیص داده نشد");

    const openrouter = process.env.AI_KEY_OPENROUTER;
    const groq = process.env.AI_KEY_GROQ;
    const opencode = process.env.AI_KEY_OPENCODE;
    const google = process.env.AI_KEY_GOOGLE;

    // زنجیرهٔ جایگزینی: اولین در دسترس برنده است؛ خطای هرکدام به بعدی می‌رود
    const attempts: Array<() => Promise<ProviderResult>> = [];
    if (openrouter) {
      attempts.push(() =>
        callOpenAICompatible(
          "https://openrouter.ai/api/v1",
          openrouter,
          "google/gemini-2.0-flash-exp:free",
          "OpenRouter",
          clean,
        ),
      );
    }
    if (groq) {
      attempts.push(() =>
        callOpenAICompatible("https://api.groq.com/openai/v1", groq, "llama-3.3-70b-versatile", "Groq", clean),
      );
    }
    if (opencode) {
      attempts.push(() =>
        callOpenAICompatible(
          "https://opencode.ai/zen/v1",
          opencode,
          "deepseek-v4.1-flash",
          "OpenCode",
          clean,
        ),
      );
    }
    if (google) {
      attempts.push(() => callGemini(google, "Google", clean));
    }

    for (const attempt of attempts) {
      try {
        const result = await attempt();
        if (result) return result;
      } catch (err) {
        console.warn(`[ai] provider failed: ${err instanceof Error ? err.message : err}`);
      }
    }

    // هیچ ارائه‌دهنده‌ای نبود یا همه شکست خوردند — قاعده‌محور محلی
    return ruleBased(clean);
  },
});
