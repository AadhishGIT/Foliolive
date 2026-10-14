import { test, expect } from '@playwright/test';

test.describe('Authentication & Session Flow', () => {
  test('renders login page with institutional compliance notice', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Foliolive Analytics' })).toBeVisible();
    await expect(
      page.getByText(/Institutional Portfolio & Real-Time Risk Platform/i)
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /PM Demo/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Viewer Demo/i })).toBeVisible();
    await expect(
      page.getByText(
        /Strict WCAG 2.2 AA • JWT Resource Guarded • Simulated Institutional Environment/i
      )
    ).toBeVisible();
  });

  test('logs in successfully as Portfolio Manager (PM role)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();

    // Should redirect to portfolio view
    await expect(page).toHaveURL(/.*portfolio/);

    // Verify header contains PM user badge
    await expect(page.getByText('Lead Portfolio Manager')).toBeVisible();
    await expect(page.getByText('PM', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Holdings & P&L/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Risk Metrics & VaR/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Limits & Alerts/i })).toBeVisible();
  });

  test('logs in successfully as Viewer (read-only role)', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Viewer Demo/i }).click();

    await expect(page).toHaveURL(/.*portfolio/);
    await expect(page.getByText('Risk Viewer Analyst')).toBeVisible();
    await expect(page.getByText('VIEWER', { exact: true })).toBeVisible();
  });

  test('logs out and redirects back to /login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);

    // Click logout
    const logoutBtn = page.getByRole('button', { name: 'Sign out of Foliolive' });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: 'Foliolive Analytics' })).toBeVisible();
  });
});
