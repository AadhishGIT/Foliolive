import { test, expect } from '@playwright/test';

test.describe('Alerts & Risk Surveillance Micro-Frontend', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);
    await page.getByRole('link', { name: /Limits & Alerts/i }).click();
    await expect(page).toHaveURL(/.*alerts/);
  });

  test('renders live alert feed with aria-live polite accessibility attribute', async ({
    page,
  }) => {
    const liveRegion = page.locator('[aria-live="polite"]');
    await expect(liveRegion).toBeAttached();
    await expect(
      page.getByRole('heading', { name: /Live Breach Stream & Alert Feed/i })
    ).toBeVisible();
    await expect(page.getByText(/2 Active Alerts/i)).toBeVisible();
  });

  test('filters alerts by status and severity tabs', async ({ page }) => {
    const severitySelect = page.getByRole('combobox', { name: /Filter alerts by severity/i });
    await expect(severitySelect).toBeVisible();
    await severitySelect.selectOption('WARNING');

    const statusSelect = page.getByRole('combobox', { name: /Filter alerts by status/i });
    await expect(statusSelect).toBeVisible();
    await statusSelect.selectOption('ACTIVE');

    // Acknowledge All button should be visible
    await expect(page.getByRole('button', { name: /Acknowledge All/i })).toBeVisible();
  });

  test('allows Portfolio Manager to open Add Policy Limit modal', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /Risk Limit Policies & Mandate Rules/i })
    ).toBeVisible();

    const createRuleBtn = page.getByRole('button', { name: /Create Rule/i });
    await expect(createRuleBtn).toBeVisible();
    await expect(createRuleBtn).toBeEnabled();
    await createRuleBtn.click();

    // Verify dialog appears
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Create New Risk Limit Policy')).toBeVisible();

    // Fill rule name
    const nameInput = page.locator('#rule-name-input');
    await nameInput.fill('Test Max Drawdown Limit');

    const cancelBtn = page.getByRole('button', { name: /Cancel/i });
    await cancelBtn.click();
    await expect(dialog).not.toBeVisible();
  });

  test('enforces read-only restrictions for Viewer role', async ({ page }) => {
    // Logout
    await page.getByRole('button', { name: 'Sign out of Foliolive' }).click();

    // Login as Viewer
    await page.getByRole('button', { name: /Viewer Demo/i }).click();
    await page.getByRole('link', { name: /Limits & Alerts/i }).click();

    // Create Rule button should be disabled for Viewer
    const createRuleBtn = page.getByRole('button', { name: /Create Rule/i });
    await expect(createRuleBtn).toBeDisabled();
    await expect(page.getByText('Read-Only (Requires PM Role)')).toBeVisible();
  });

  test('renders policy limits and breach status table', async ({ page }) => {
    await expect(page.getByRole('table').first()).toBeVisible();
    await expect(page.getByText('Tech Sector Exposure Cap').first()).toBeVisible();
    await expect(page.getByText('Parametric VaR 95% Ceiling').first()).toBeVisible();
  });
});
