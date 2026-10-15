import { chromium } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

export interface StressAuditMetrics {
  durationMs: number;
  totalFrames: number;
  measuredFPS: number;
  domNodeCount: number;
  longTasksCount: number;
  maxLongTaskMs: number;
  totalLongTaskBlockingTimeMs: number;
  heapUsedMB?: number;
}

async function runPerformanceStressAudit() {
  // eslint-disable-next-line no-console
  console.log('🚀 Starting 10,000-Row Stress Performance Audit...');

  // Ensure output directory exists
  const outputDir = path.join(process.cwd(), 'playwright-report');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Enable Playwright tracing
  await context.tracing.start({ screenshots: true, snapshots: true });
  const page = await context.newPage();

  try {
    // 1. Authenticate as Portfolio Manager
    await page.goto('http://localhost:3100/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await page.waitForURL(/.*portfolio/);
    await page.waitForSelector('text=LIVE FEED');

    // 2. Enable 10,000-row stress mode on the VirtualizedGrid
    const stressToggle = page.getByRole('button', { name: /10k Rows|Stress/i });
    await stressToggle.click();
    await page.waitForTimeout(500); // Allow virtualizer to allocate 10k index map

    // 3. Inject PerformanceObserver to track main-thread long tasks (>50ms) and frame rate
    await page.evaluate(() => {
      window.__longTasks = [];
      window.__frameCount = 0;
      window.__startTime = performance.now();

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__longTasks.push({
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });

      function countFrame() {
        window.__frameCount++;
        window.__frameRaf = requestAnimationFrame(countFrame);
      }
      window.__frameRaf = requestAnimationFrame(countFrame);
    });

    // 4. Trigger High-Frequency Stress Mode (100 updates/sec) on BFF Simulator
    try {
      await fetch('http://localhost:4000/api/simulator/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stressMode: true }),
      });
      // eslint-disable-next-line no-console
      console.log('⚡ Market Simulator stress mode enabled: streaming 100 ticks/sec...');
    } catch {
      // eslint-disable-next-line no-console
      console.warn(
        '⚠️ Could not connect to BFF simulator REST endpoint; continuing with local client stream.'
      );
    }

    // 5. Simulate intense user scroll interaction across 10,000 virtual rows
    const gridContainer = page.locator('.overflow-auto').first();
    const scrollStartTime = Date.now();

    for (let i = 0; i < 20; i++) {
      await gridContainer.evaluate((el, step) => {
        el.scrollTop = step * 600;
      }, i);
      await page.waitForTimeout(100);
    }

    const elapsedScrollMs = Date.now() - scrollStartTime;

    // 6. Collect browser performance metrics
    const results = await page.evaluate(
      ({ elapsedMs }) => {
        cancelAnimationFrame(window.__frameRaf);

        const longTasks = window.__longTasks || [];
        const totalLongTaskBlockingTimeMs = longTasks.reduce((acc, t) => acc + t.duration, 0);
        const maxLongTaskMs =
          longTasks.length > 0 ? Math.max(...longTasks.map((t) => t.duration)) : 0;
        const totalFrames = window.__frameCount || 0;
        const measuredFPS = Math.round((totalFrames / (elapsedMs / 1000)) * 10) / 10;

        // Measure DOM nodes inside the grid container
        const domNodeCount = document.querySelectorAll('[role="row"]').length;

        // Memory if supported by Chrome
        const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const heapUsedMB = memory
          ? Math.round((memory.usedJSHeapSize / (1024 * 1024)) * 10) / 10
          : undefined;

        return {
          durationMs: elapsedMs,
          totalFrames,
          measuredFPS,
          domNodeCount,
          longTasksCount: longTasks.length,
          maxLongTaskMs: Math.round(maxLongTaskMs * 10) / 10,
          totalLongTaskBlockingTimeMs: Math.round(totalLongTaskBlockingTimeMs * 10) / 10,
          heapUsedMB,
        };
      },
      { elapsedMs: elapsedScrollMs }
    );

    // 7. Reset Simulator to standard mode
    try {
      await fetch('http://localhost:4000/api/simulator/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stressMode: false }),
      });
    } catch {
      // Ignore reset failure
    }

    // 8. Stop Playwright tracing and save archive
    const tracePath = path.join(outputDir, 'trace-10k-stress.zip');
    await context.tracing.stop({ path: tracePath });

    // Output formatted report
    // eslint-disable-next-line no-console
    console.log('\n📊 === 10,000-ROW VIRTUAL GRID STRESS TEST RESULTS ===');
    // eslint-disable-next-line no-console
    console.log(`⏱️  Duration:                  ${results.durationMs} ms`);
    // eslint-disable-next-line no-console
    console.log(`🎞️  Scroll Frame Rate:         ${results.measuredFPS} FPS (Fluid 60FPS target)`);
    // eslint-disable-next-line no-console
    console.log(
      `🧱 Active DOM Rows in View:   ${results.domNodeCount} rows (vs 10,000 in naive table)`
    );
    // eslint-disable-next-line no-console
    console.log(`⏳ Main-Thread Long Tasks:    ${results.longTasksCount} tasks > 50ms`);
    // eslint-disable-next-line no-console
    console.log(`🛑 Max Long Task Duration:     ${results.maxLongTaskMs} ms`);
    // eslint-disable-next-line no-console
    console.log(`📦 Playwright Trace Saved:    ${tracePath}\n`);

    // Write JSON report
    fs.writeFileSync(
      path.join(outputDir, 'stress-audit-summary.json'),
      JSON.stringify(results, null, 2)
    );

    return results;
  } finally {
    await browser.close();
  }
}

// Add TypeScript declarations for browser window properties
declare global {
  interface Window {
    __longTasks: Array<{ name: string; duration: number; startTime: number }>;
    __frameCount: number;
    __startTime: number;
    __frameRaf: number;
  }
}

runPerformanceStressAudit().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Performance stress audit failed:', err);
  process.exit(1);
});
