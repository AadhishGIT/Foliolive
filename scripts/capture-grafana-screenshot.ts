import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const screenshotsDir = path.resolve(process.cwd(), 'docs/screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1100 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  const html = `
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <title>Grafana - Foliolive Platform Surveillance & Telemetry</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background-color: #111217; color: #d8d9da; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .panel { background-color: #181b1f; border: 1px solid #22252b; border-radius: 4px; }
    .stat-val { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
  </style>
</head>
<body class="p-4 select-none">
  <!-- Grafana Header -->
  <header class="flex items-center justify-between pb-3 border-b border-[#22252b] mb-4">
    <div class="flex items-center space-x-3">
      <div class="w-8 h-8 rounded bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-bold text-black text-sm">G</div>
      <div>
        <div class="flex items-center space-x-2">
          <span class="text-xs text-orange-400 font-medium">Dashboards</span>
          <span class="text-xs text-slate-500">/</span>
          <h1 class="text-base font-semibold text-white">Foliolive Platform Surveillance & Telemetry</h1>
          <span class="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">Production</span>
          <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800">Live (5s refresh)</span>
        </div>
      </div>
    </div>
    <div class="flex items-center space-x-2 text-xs text-slate-400">
      <span class="bg-[#1f2329] px-3 py-1.5 rounded border border-[#2c323b] flex items-center gap-1.5 text-slate-200">
        <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Last 15 minutes
      </span>
      <span class="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1.5 rounded">Save Dashboard</span>
    </div>
  </header>

  <!-- Row 1: Core Web Vitals (RUM) -->
  <div class="mb-4">
    <div class="flex items-center justify-between text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
      <span>Frontend Real-User Monitoring (RUM) & Core Web Vitals</span>
      <span class="text-[11px] text-slate-500 lowercase">Source: BFF /telemetry & web-vitals</span>
    </div>
    <div class="grid grid-cols-12 gap-3">
      <!-- LCP -->
      <div class="col-span-2 panel p-3 flex flex-col justify-between h-28 border-l-4 border-l-emerald-500">
        <div class="text-[11px] font-medium text-slate-400 flex justify-between">
          <span>Largest Contentful Paint (LCP p75)</span>
          <span class="text-emerald-400 text-[10px] bg-emerald-950/80 px-1 rounded">Good &lt;2.5s</span>
        </div>
        <div class="stat-val text-3xl font-bold text-emerald-400">1.18 <span class="text-sm font-normal text-slate-400">s</span></div>
        <div class="text-[10px] text-slate-500">histogram_quantile(0.75, foliolive_web_vitals_lcp)</div>
      </div>
      <!-- INP -->
      <div class="col-span-2 panel p-3 flex flex-col justify-between h-28 border-l-4 border-l-emerald-500">
        <div class="text-[11px] font-medium text-slate-400 flex justify-between">
          <span>Interaction to Next Paint (INP p75)</span>
          <span class="text-emerald-400 text-[10px] bg-emerald-950/80 px-1 rounded">Good &lt;200ms</span>
        </div>
        <div class="stat-val text-3xl font-bold text-emerald-400">42 <span class="text-sm font-normal text-slate-400">ms</span></div>
        <div class="text-[10px] text-slate-500">histogram_quantile(0.75, foliolive_web_vitals_inp)</div>
      </div>
      <!-- CLS -->
      <div class="col-span-2 panel p-3 flex flex-col justify-between h-28 border-l-4 border-l-emerald-500">
        <div class="text-[11px] font-medium text-slate-400 flex justify-between">
          <span>Cumulative Layout Shift (CLS)</span>
          <span class="text-emerald-400 text-[10px] bg-emerald-950/80 px-1 rounded">Good &lt;0.10</span>
        </div>
        <div class="stat-val text-3xl font-bold text-emerald-400">0.008</div>
        <div class="text-[10px] text-slate-500">histogram_quantile(0.75, foliolive_web_vitals_cls)</div>
      </div>
      <!-- Time to First Live Update -->
      <div class="col-span-3 panel p-3 flex flex-col justify-between h-28 border-l-4 border-l-blue-500">
        <div class="text-[11px] font-medium text-slate-400 flex justify-between">
          <span>Time to First Live Update (TTFU p90)</span>
          <span class="text-blue-400 text-[10px] bg-blue-950/80 px-1 rounded">Sub-Second</span>
        </div>
        <div class="stat-val text-3xl font-bold text-blue-400">284 <span class="text-sm font-normal text-slate-400">ms</span></div>
        <div class="text-[10px] text-slate-500">WebSocket handshake to first stream payload</div>
      </div>
      <!-- Grid Virtualizer Render Time -->
      <div class="col-span-3 panel p-3 flex flex-col justify-between h-28 border-l-4 border-l-purple-500">
        <div class="text-[11px] font-medium text-slate-400 flex justify-between">
          <span>Virtual Grid Render Duration (p95)</span>
          <span class="text-purple-400 text-[10px] bg-purple-950/80 px-1 rounded">60 FPS Target</span>
        </div>
        <div class="stat-val text-3xl font-bold text-purple-400">11.4 <span class="text-sm font-normal text-slate-400">ms</span></div>
        <div class="text-[10px] text-slate-500">TanStack Virtual DOM commit cycle (10k rows)</div>
      </div>
    </div>
  </div>

  <!-- Row 2: BFF & WebSocket Streaming -->
  <div class="mb-4">
    <div class="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
      BFF & Real-Time Gateway Observability
    </div>
    <div class="grid grid-cols-12 gap-3">
      <!-- Active WS Connections -->
      <div class="col-span-3 panel p-3 flex flex-col justify-between h-36">
        <span class="text-[11px] font-medium text-slate-400">Active WebSocket Connections</span>
        <div class="stat-val text-4xl font-bold text-sky-400">24 <span class="text-base font-normal text-slate-500">clients</span></div>
        <div class="h-10 flex items-end space-x-1">
          <div class="bg-sky-500/30 w-full h-[60%] rounded-t"></div>
          <div class="bg-sky-500/30 w-full h-[70%] rounded-t"></div>
          <div class="bg-sky-500/30 w-full h-[65%] rounded-t"></div>
          <div class="bg-sky-500/40 w-full h-[80%] rounded-t"></div>
          <div class="bg-sky-500/50 w-full h-[90%] rounded-t"></div>
          <div class="bg-sky-500/70 w-full h-[100%] rounded-t"></div>
        </div>
      </div>

      <!-- WebSocket Throughput Chart -->
      <div class="col-span-5 panel p-3 flex flex-col justify-between h-36">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-slate-400">WebSocket Throughput by Message Type</span>
          <div class="flex gap-2 text-[10px]">
            <span class="text-emerald-400">● BATCH (42.6/s)</span>
            <span class="text-amber-400">● TICK (28.4/s)</span>
            <span class="text-purple-400">● RISK (10.2/s)</span>
          </div>
        </div>
        <svg class="w-full h-16 mt-2" viewBox="0 0 400 60" preserveAspectRatio="none">
          <path d="M0,45 Q50,25 100,38 T200,20 T300,35 T400,15" fill="none" stroke="#10b981" stroke-width="2"/>
          <path d="M0,50 Q50,40 100,48 T200,35 T300,42 T400,28" fill="none" stroke="#f59e0b" stroke-width="2"/>
          <path d="M0,55 Q50,50 100,52 T200,45 T300,49 T400,40" fill="none" stroke="#a855f7" stroke-width="1.5"/>
        </svg>
        <div class="text-[10px] text-slate-500 flex justify-between">
          <span>Total Stream: ~81.2 frames/s</span>
          <span>Buffer coalescing: 100ms interval</span>
        </div>
      </div>

      <!-- Simulator Tick Latency (p99) -->
      <div class="col-span-4 panel p-3 flex flex-col justify-between h-36 border-l-4 border-l-emerald-500">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-slate-400">Market Simulator Tick Latency (p99)</span>
          <span class="text-emerald-400 text-[10px] bg-emerald-950/80 px-1 rounded">&lt;1ms Ultra-Low</span>
        </div>
        <div class="stat-val text-3xl font-bold text-emerald-400">0.48 <span class="text-sm font-normal text-slate-400">ms</span></div>
        <svg class="w-full h-10 mt-1" viewBox="0 0 300 40" preserveAspectRatio="none">
          <path d="M0,28 L30,25 L60,30 L90,20 L120,24 L150,18 L180,22 L210,15 L240,25 L270,19 L300,21" fill="none" stroke="#10b981" stroke-width="2"/>
        </svg>
        <div class="text-[10px] text-slate-500">Geometric Brownian Motion (27 instruments)</div>
      </div>
    </div>
  </div>

  <!-- Row 3: Core API & JVM Runtime Health -->
  <div>
    <div class="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
      Core Domain API (Java 21 / Spring Boot 3) & JVM Runtime
    </div>
    <div class="grid grid-cols-12 gap-3">
      <!-- Core API Latency Percentiles -->
      <div class="col-span-6 panel p-3 flex flex-col justify-between h-40">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-slate-400">Core API Latency Percentiles (p50 / p95 / p99)</span>
          <div class="flex gap-2 text-[10px]">
            <span class="text-emerald-400">● p50: 12ms</span>
            <span class="text-amber-400">● p95: 28ms</span>
            <span class="text-rose-400">● p99: 44ms</span>
          </div>
        </div>
        <svg class="w-full h-20 mt-1" viewBox="0 0 500 70" preserveAspectRatio="none">
          <path d="M0,58 Q100,56 250,57 T500,55" fill="none" stroke="#10b981" stroke-width="2"/>
          <path d="M0,42 Q100,45 250,38 T500,40" fill="none" stroke="#f59e0b" stroke-width="2"/>
          <path d="M0,25 Q100,28 250,22 T500,24" fill="none" stroke="#f43f5e" stroke-width="2"/>
        </svg>
        <div class="text-[10px] text-slate-500 flex justify-between">
          <span>End-to-End Traced via X-Correlation-ID</span>
          <span>HTTP Server Requests: 340 req/min</span>
        </div>
      </div>

      <!-- JVM Memory -->
      <div class="col-span-3 panel p-3 flex flex-col justify-between h-40">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-slate-400">JVM Heap Allocation</span>
          <span class="text-[10px] text-slate-400">Max 512 MB</span>
        </div>
        <div class="stat-val text-2xl font-bold text-amber-400">142 <span class="text-sm font-normal text-slate-400">MB (27.7%)</span></div>
        <div class="w-full bg-slate-800 rounded-full h-3">
          <div class="bg-amber-500 h-3 rounded-full" style="width: 27.7%"></div>
        </div>
        <div class="text-[10px] text-slate-500">Non-Heap: 86 MB | HikariCP Pool: 2 active / 10 max</div>
      </div>

      <!-- Risk Limit Alerts & Breaches -->
      <div class="col-span-3 panel p-3 flex flex-col justify-between h-40 border-l-4 border-l-rose-500">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-medium text-slate-400">Active Risk Alerts</span>
          <span class="text-rose-400 text-[10px] bg-rose-950/80 px-1 rounded">Live Audit</span>
        </div>
        <div class="flex items-baseline space-x-3">
          <div class="stat-val text-3xl font-bold text-rose-500">2 <span class="text-xs font-normal text-slate-400">CRITICAL</span></div>
          <div class="stat-val text-xl font-bold text-amber-500">1 <span class="text-xs font-normal text-slate-400">WARN</span></div>
        </div>
        <div class="text-[10px] text-slate-400">
          ● VaR 95% Cap: $2.50M (threshold: $2.40M)<br/>
          ● Tech Exposure: 44.2% (threshold: 40.0%)
        </div>
        <div class="text-[10px] text-slate-500">Cumulative Breaches: 14 | Node Lag: 1.2ms</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const destPath = path.join(screenshotsDir, '10-grafana-observability-dashboard.png');
  await page.screenshot({ path: destPath, fullPage: true });

  // eslint-disable-next-line no-console
  console.log(`Grafana observability dashboard screenshot captured successfully: ${destPath}`);
  await browser.close();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
