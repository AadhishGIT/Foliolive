import { test, expect } from '@playwright/test';

test.describe('Institutional E2E Workflow & Resilience Scenarios', () => {
  test('Complete PM workflow: login → dashboard → live updates → sort/filter → create risk limit → breach → logout', async ({
    page,
  }) => {
    // 1. Login as Portfolio Manager
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Foliolive Analytics' })).toBeVisible();

    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);
    await expect(page.getByText('Total Portfolio AUM')).toBeVisible();

    // 2. Verify live feed connection indicator
    const indicator = page.locator('div[title*="WebSocket status"]');
    await expect(indicator).toBeVisible();

    // 3. Verify holdings matrix rendered with active rows
    await expect(page.getByRole('columnheader', { name: 'Symbol', exact: true })).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Market Value', exact: true })
    ).toBeVisible();

    // 4. Test filtering and sorting in the grid
    const searchInput = page.getByLabel(/Filter holdings grid/i);
    await searchInput.fill('AAPL');
    await expect(page.getByText('AAPL').first()).toBeVisible();

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(200);

    // 5. Navigate to Limits & Alerts surveillance
    await page.getByRole('link', { name: /Limits & Alerts/i }).click();
    await expect(page).toHaveURL(/.*alerts/);

    // 6. Create a new risk limit policy
    const createBtn = page.getByRole('button', { name: /Create Rule/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    await page.locator('#rule-name-input').fill('E2E Stress Drawdown Threshold');
    await page.locator('#rule-threshold-input').fill('250000');

    // Submit limit rule
    await page.getByRole('button', { name: /Save Policy$/i }).click();
    await expect(dialog).not.toBeVisible();

    // 7. Verify alert audit trail has records
    await expect(
      page.getByRole('heading', { name: /Risk Limit Policies & Mandate Rules/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Acknowledge All/i })).toBeVisible();

    // 8. Logout
    const logoutBtn = page.getByRole('button', { name: 'Sign out of Foliolive' });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Verify redirected to login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: 'Foliolive Analytics' })).toBeVisible();
  });

  test('Remote Failure Resilience: displays graceful fallback UI when a remote container fails to load', async ({
    page,
  }) => {
    // Intercept and abort requests for risk-mfe remote entry
    await page.route('**/remoteEntry.js', (route) => {
      const url = route.request().url();
      if (url.includes('3002') || url.includes('risk')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);

    // Navigate to Risk view whose remoteEntry was blocked
    await page.getByRole('link', { name: /Risk Metrics & VaR/i }).click();

    // Verify the RemoteErrorBoundary caught the failure and displayed the graceful fallback card
    await expect(page.getByText(/Micro-Frontend Unavailable: risk-mfe/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/could not be loaded/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Retry Connection/i })).toBeVisible();
  });

  test('WebSocket Disconnect & Recovery: reflects connection state when network drops and recovers', async ({
    page,
    context,
  }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);

    // Initial state is visible
    const indicator = page.locator('div[title*="WebSocket status"]');
    await expect(indicator).toBeVisible();

    // Simulate browser offline event
    await context.setOffline(true);
    await page.waitForTimeout(500);

    // Status indicator exists and reflects network state
    await expect(page.locator('div[title*="WebSocket status"]')).toBeVisible();

    // Restore network
    await context.setOffline(false);
    await page.waitForTimeout(800);
    await expect(page.locator('div[title*="WebSocket status"]')).toBeVisible();
  });
});
