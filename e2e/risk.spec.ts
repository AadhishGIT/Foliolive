import { test, expect } from '@playwright/test';

test.describe('Risk Micro-Frontend (VaR, Heatmap & Exposures)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);
    await page.getByRole('link', { name: /Risk Metrics & VaR/i }).click();
    await expect(page).toHaveURL(/.*risk/);
  });

  test('renders VaR metrics cards with interactive risk gauges', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Parametric VaR \(95%, 1-Day\)/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Historical Simulation \(99%, 1-Day\)/i })
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /Expected Shortfall \/ CVaR \(95%\)/i })
    ).toBeVisible();

    // Verify meter elements
    const gauges = page.getByRole('meter', { name: /Parametric VaR 95%/i });
    await expect(gauges).toBeVisible();
  });

  test('opens and interacts with accessible VaR Methodology Explainer dialog', async ({ page }) => {
    const explainerBtn = page.getByRole('button', { name: /Methodology Explainer/i });
    await expect(explainerBtn).toBeVisible();
    await explainerBtn.click();

    // Dialog should open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Institutional Risk Engine Methodology')).toBeVisible();
    await expect(page.getByText(/Parametric \(Variance-Covariance\) VaR/i)).toBeVisible();

    // Close dialog using Close or Escape
    const closeBtn = page.getByRole('button', { name: /Close/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    } else {
      await page.keyboard.press('Escape');
    }
    await expect(dialog).not.toBeVisible();
  });

  test('renders D3 Sector Exposure chart with policy limit markers', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Exposure vs Policy Limit \(D3 Bars\)/i })
    ).toBeVisible();
    const exposureChart = page.getByRole('img', {
      name: /Sector exposure bar chart with policy limits/i,
    });
    await expect(exposureChart).toBeVisible();

    // Accessible table
    const srTable = page.getByRole('table', { name: /Sector Exposure vs Limits/i });
    await expect(srTable).toBeAttached();
  });

  test('renders D3 Top-10 Concentration chart vs 15% mandate cap', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Top 10 Concentration & Single-Asset Cap/i })
    ).toBeVisible();
    const concChart = page.getByRole('img', { name: /Top 10 assets concentration bar chart/i });
    await expect(concChart).toBeVisible();

    const srTable = page.getByRole('table', { name: /Top 10 Institutional Asset Weights/i });
    await expect(srTable).toBeAttached();
  });

  test('renders D3 Cross-Sector Correlation Heatmap matrix', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Cross-Sector Correlation Heatmap/i })
    ).toBeVisible();
    const heatmapGrid = page.getByRole('grid', { name: /Cross-sector correlation matrix/i });
    await expect(heatmapGrid).toBeVisible();

    const srTable = page.getByRole('table', { name: /Sector Cross-Correlation Matrix/i });
    await expect(srTable).toBeAttached();
  });

  test('renders D3 VaR Historical Exceedance backtest chart', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /VaR Backtesting & Exceedance History/i })
    ).toBeVisible();
    const exceedanceChart = page.getByRole('img', {
      name: /VaR backtesting chart with breach markers/i,
    });
    await expect(exceedanceChart).toBeVisible();

    const srTable = page.getByRole('table', { name: /VaR Exceedance Backtesting Log/i });
    await expect(srTable).toBeAttached();
  });
});
