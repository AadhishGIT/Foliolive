import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits (WCAG 2.2 AA)', () => {
  test('login page meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/login');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('portfolio dashboard meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await expect(page).toHaveURL(/.*portfolio/);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('iframe')
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('risk analytics view meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await page.getByRole('link', { name: /Risk Metrics & VaR/i }).click();
    await expect(page).toHaveURL(/.*risk/);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('surveillance feed meets WCAG 2.2 AA standards', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /PM Demo/i }).click();
    await page.getByRole('link', { name: /Limits & Alerts/i }).click();
    await expect(page).toHaveURL(/.*alerts/);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
