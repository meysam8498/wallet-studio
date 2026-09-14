// پروب داشبورد — ورود آزمایشی و سپس اسکن ۳۶۰px داشبورد
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9224;
const BASE = process.argv[2] ?? "http://localhost:4173";
const EMAIL = process.argv[3] ?? "meysam@test.ir";
const PASS = process.argv[4] ?? "test12345";

const proc = Bun.spawn(
  [
    EDGE,
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${Bun.env.TEMP}\\edgedashprobe`,
    "--no-first-run",
    "--disable-gpu",
    "--window-size=400,800",
    "about:blank",
  ],
  { stdout: "ignore", stderr: "ignore" },
);
await Bun.sleep(2500);
const list = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()) as Array<{
  webSocketDebuggerUrl: string;
}>;
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let mid = 0;
const pending = new Map<number, (v: unknown) => void>();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data as string);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)!(m.result);
    pending.delete(m.id);
  }
};
function send(method: string, params: Record<string, unknown> = {}): Promise<any> {
  const id = ++mid;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((r) => pending.set(id, r));
}
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 360,
  height: 740,
  deviceScaleFactor: 2,
  mobile: true,
});

await send("Page.navigate", { url: BASE + "/auth" });
await Bun.sleep(3500);

// ورود: فرم ایمیل/گذرواژه را پر و ارسال کن
await send("Runtime.evaluate", {
  awaitPromise: true,
  expression: `(async () => {
    const email = document.querySelector('input[name="email"]');
    const pass = document.querySelector('input[name="password"]');
    if (!email || !pass) return 'NO_FORM: ' + location.pathname;
    const set = (el, v) => {
      const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      s.call(el, v);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    };
    set(email, '${EMAIL}');
    set(pass, '${PASS}');
    const form = email.closest('form');
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return 'submitted';
  })()`,
});
await Bun.sleep(5000);
const where = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: "location.pathname",
});
const out: string[] = ["after-login: " + where.result.value];

const scan = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth - doc.clientWidth;
    const bad = [];
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && (r.right > doc.clientWidth + 1 || r.left < -1)) {
        const cs = getComputedStyle(el);
        if (cs.position === 'fixed' || cs.display === 'none') return;
        if (/(auto|scroll)/.test(cs.overflowX)) return;
        bad.push(el.tagName + '.' + String(el.className).split(' ').slice(0,3).join('.') + ' → ' + Math.round(r.right));
      }
    });
    return { overflowX, clientWidth: doc.clientWidth, bad: bad.slice(0, 15) };
  })()`,
});
const v = scan.result.value;
out.push(
  `«dashboard» — عرض سند: ${v.clientWidth}، سرریز افقی: ${v.overflowX}px، عناصر بیرون‌زده: ${v.bad.length}`,
);
for (const b of v.bad) out.push("   " + b);

// اسکرول تا انتهای صفحه و تصویر دوم (نیمهٔ پایین)
await send("Runtime.evaluate", { expression: "window.scrollTo(0, document.body.scrollHeight)" });
await Bun.sleep(800);
const shot1 = await send("Page.captureScreenshot", { format: "png" });
await Bun.write("_dashprobe-top.png", Buffer.from(shot1.data, "base64"));
await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
await Bun.sleep(500);
const shot2 = await send("Page.captureScreenshot", { format: "png" });
await Bun.write("_dashprobe-bottom.png", Buffer.from(shot2.data, "base64"));

console.log(out.join("\n"));
proc.kill();
process.exit(0);
