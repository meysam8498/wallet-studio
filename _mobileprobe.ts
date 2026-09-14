// پروب موبایل — بدون هیچ وابستگی: CDP خام روی Edge headless
// صفحه‌ها را با ۳۶۰×۷۴۰ (کف طراحی) می‌سنجد و هر عنصر سرریزشده را گزارش می‌کند.
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9223;
const BASE = process.argv[2] ?? "http://localhost:4173";

const proc = Bun.spawn(
  [
    EDGE,
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${Bun.env.TEMP}\\edgeprobe`,
    "--no-first-run",
    "--disable-gpu",
    "--window-size=400,800",
    "about:blank",
  ],
  { stdout: "ignore", stderr: "ignore" },
);

await Bun.sleep(2500);

// کشف صفحهٔ هدف از روی JSON endpoint
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

// صفحه‌های عمومی (بدون ورود): auth و about
const pages = ["/auth", "/about"];
const report: string[] = [];

for (const path of pages) {
  await send("Page.navigate", { url: BASE + path });
  await Bun.sleep(4000);
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
          // عناصری که خودشان اسکرول افقی مجاز دارند مشکلی نیستند
          if (/(auto|scroll)/.test(cs.overflowX)) return;
          bad.push(el.tagName + '.' + String(el.className).split(' ').slice(0,3).join('.') + ' → ' + Math.round(r.right));
        }
      });
      return { overflowX, clientWidth: doc.clientWidth, bad: bad.slice(0, 12) };
    })()`,
  });
  const v = scan.result.value;
  report.push(
    `«${path}» — عرض سند: ${v.clientWidth}، سرریز افقی: ${v.overflowX}px، عناصر بیرون‌زده: ${v.bad.length}`,
  );
  for (const b of v.bad) report.push("   " + b);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  await Bun.write(`_mobileprobe${path.replace("/", "-")}.png`, Buffer.from(shot.data, "base64"));
}

console.log(report.join("\n"));
proc.kill();
process.exit(0);
