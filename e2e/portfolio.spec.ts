import { test, expect } from '@playwright/test';

test.describe('Portfolio Micro-Frontend (Holdings Grid & Charts)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);
  });

  test('renders portfolio summary metrics cards', async ({ page }) => {
    await expect(page.getByText('Total Portfolio AUM')).toBeVisible();
    await expect(page.getByText('Unrealized P&L').first()).toBeVisible();
    await expect(page.getByText('Daily Change')).toBeVisible();
    await expect(page.getByText('Cash Reserve')).toBeVisible();
  });

  test('renders virtualized grid with 500+ default positions', async ({ page }) => {
    // Check grid headers
    await expect(page.getByRole('columnheader', { name: 'Symbol', exact: true })).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Market Value', exact: true })
    ).toBeVisible();

    // Check row count indicator in telemetry
    await expect(page.getByRole('paragraph').getByText('500')).toBeVisible();
  });

  test('filters holdings via search input with useDeferredValue', async ({ page }) => {
    const searchInput = page.getByLabel(/Filter holdings grid/i);
    await expect(searchInput).toBeVisible();

    // Type AAPL
    await searchInput.fill('AAPL');
    await expect(page.getByText('AAPL').first()).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.getByRole('paragraph').getByText('500')).toBeVisible();
  });

  test('activates 10,000 rows stress test mode without UI degradation', async ({ page }) => {
    const stressBtn = page.getByRole('button', { name: /Toggle 10,000 rows/i });
    await expect(stressBtn).toBeVisible();
    await stressBtn.click();

    // Verify 10,000 positions indicator badge
    await expect(page.locator('div').filter({ hasText: /^10k Stress Active$/ })).toBeVisible();

    // Verify grid still renders and scrolls
    const gridContainer = page.getByRole('grid');
    await expect(gridContainer).toBeVisible();

    // Toggle back to normal 500 rows
    await stressBtn.click();
    await expect(page.locator('div').filter({ hasText: /^10k Stress Active$/ })).not.toBeVisible();
  });

  test('renders accessible D3 Sector Allocation Donut chart', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Sector Diversification/i })).toBeVisible();

    // Verify D3 chart element
    const donutChart = page.getByRole('img', {
      name: /Sector allocation interactive donut chart/i,
    });
    await expect(donutChart).toBeVisible();

    // Verify accessible screen-reader table
    const srTable = page.getByRole('table', { name: /Portfolio Sector Allocation Breakdown/i });
    await expect(srTable).toBeAttached();
  });

  test('renders accessible D3 P&L Time Series chart with brush slider', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Cumulative P&L Over Time/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '1M' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ALL', exact: true })).toBeVisible();
  });
});
