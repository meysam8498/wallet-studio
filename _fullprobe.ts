// پروب کامل — ورود، دادهٔ آزمایشی، اسکن ۳۶۰px و ۱۳۶۶px داشبورد
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9225;
const BASE = process.argv[2] ?? "http://localhost:4173";
const EMAIL = process.argv[3] ?? "meysam@test.ir";
const PASS = process.argv[4] ?? "test12345";

const proc = Bun.spawn(
  [
    EDGE,
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${Bun.env.TEMP}\\edgefullprobe`,
    "--no-first-run",
    "--disable-gpu",
    "--window-size=1500,900",
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

async function loginAndScan(width: number, height: number, tag: string) {
  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 500,
  });
  await send("Page.navigate", { url: BASE + "/auth" });
  await Bun.sleep(3500);
  await send("Runtime.evaluate", {
    expression: `(async () => {
      const email = document.querySelector('input[name="email"]');
      if (!email) return;
      const set = (el, v) => {
        const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        s.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      };
      set(email, '${EMAIL}');
      set(document.querySelector('input[name="password"]'), '${PASS}');
      email.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`,
  });
  await Bun.sleep(5000);
  const scan = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const doc = document.documentElement;
      const overflowX = doc.scrollWidth - doc.clientWidth;
      const bad = [];
      document.querySelectorAll('main *, header *').forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > doc.clientWidth + 1 || r.left < -1)) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none') return;
          if (/(auto|scroll)/.test(cs.overflowX)) return;
          // داخل ریل اسکرولی حساب‌ها مجاز است
          if (el.closest('.accounts-rail')) return;
          const sec = el.closest('[data-slot=card]');
          const title = sec?.querySelector('[data-slot=card-title]')?.textContent ?? '';
          bad.push((title ? title.slice(0, 18) : el.tagName) + '|' + String(el.className).split(' ').slice(0,2).join('.') + '→' + Math.round(el.getBoundingClientRect().right));
        }
      });
      return { overflowX, w: doc.clientWidth, bad: bad.slice(0, 14) };
    })()`,
  });
  const v = scan.result.value;
  console.log(`«${tag}» عرض:${v.w} سرریز:${v.overflowX}px بیرون‌زده:${v.bad.length}`);
  for (const b of v.bad) console.log("   " + b);
  await send("Runtime.evaluate", { expression: "window.scrollTo(0, 0)" });
  await Bun.sleep(700);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await Bun.write(`_fullprobe-${tag}.png`, Buffer.from(shot.data, "base64"));
}

await loginAndScan(360, 740, "mobile");
await loginAndScan(1366, 850, "desktop");
console.log("DONE");
proc.kill();
process.exit(0);
