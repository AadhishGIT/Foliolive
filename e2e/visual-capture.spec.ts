import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('Visual Verification & Screenshot Capture', () => {
  const screenshotsDir = path.resolve(process.cwd(), 'docs/screenshots');

  test.beforeAll(() => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test('captures complete visual walkthrough', async ({ page }) => {
    // 1. Login Screen
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-screen.png') });

    // 2. Portfolio Manager Login -> Holdings Grid
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);
    await page.waitForTimeout(1000); // Allow virtualizer & D3 to mount
    await page.screenshot({ path: path.join(screenshotsDir, '02-portfolio-holdings-grid.png') });

    // 3. 10,000 Rows Stress Mode
    const stressBtn = page.getByRole('button', { name: /Toggle 10,000 rows/i });
    await stressBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(screenshotsDir, '03-portfolio-10k-stress-mode.png') });
    await stressBtn.click(); // Toggle back to normal 500 rows

    // 4. Portfolio D3 Charts (Focus Charts View)
    const chartsBtn = page.getByRole('button', { name: 'Charts Only' });
    await chartsBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '04-portfolio-d3-charts.png') });

    // Switch back to All Views
    await page.getByRole('button', { name: 'All Views' }).click();

    // 5. Risk Analytics & Gauges
    await page.getByRole('link', { name: /Risk Metrics & VaR/i }).click();
    await expect(page).toHaveURL(/.*risk/);
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(screenshotsDir, '05-risk-var-gauges-and-heatmap.png'),
    });

    // 6. Risk Method Explainer Modal Dialog
    const explainerBtn = page.getByRole('button', { name: /Methodology Explainer/i });
    await explainerBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '06-risk-methodology-dialog.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 7. Alerts Surveillance Feed
    await page.getByRole('link', { name: /Limits & Alerts/i }).click();
    await expect(page).toHaveURL(/.*alerts/);
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(screenshotsDir, '07-alerts-surveillance-feed.png') });

    // 8. Risk Limit Policies & Mandate Management Modal
    const createRuleBtn = page.getByRole('button', { name: /Create Rule/i });
    await createRuleBtn.click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(screenshotsDir, '08-alerts-limit-manager.png') });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 9. Light Theme Dashboard
    const themeBtn = page.getByRole('button', { name: /Switch to light mode/i });
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      await page.waitForTimeout(500);
      await page.getByRole('link', { name: /Holdings & P&L/i }).click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(screenshotsDir, '09-light-theme-dashboard.png') });

      // Toggle back to dark theme
      const darkThemeBtn = page.getByRole('button', { name: /Switch to dark mode/i });
      if (await darkThemeBtn.isVisible()) {
        await darkThemeBtn.click();
      }
    }
  });
});
