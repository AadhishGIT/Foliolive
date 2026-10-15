import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const THEMES = ['dark', 'light'] as const;

test.describe('Automated Accessibility Audits across Themes (WCAG 2.1 AA)', () => {
  test.setTimeout(60000);

  for (const theme of THEMES) {
    test(`login page meets WCAG 2.1 AA in ${theme} theme`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem('foliolive-theme-mode', mode);
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      await page.goto('/login');
      await expect(page.getByRole('heading', { name: 'Foliolive Analytics' })).toBeVisible();

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(scanResults.violations).toEqual([]);
    });

    test(`portfolio dashboard meets WCAG 2.1 AA in ${theme} theme`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem('foliolive-theme-mode', mode);
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      await page.goto('/login');
      await page.getByRole('button', { name: /PM Demo/i }).click();
      await expect(page).toHaveURL(/.*portfolio/);
      await expect(page.getByRole('columnheader', { name: 'Symbol', exact: true })).toBeVisible();

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('iframe')
        .analyze();

      expect(scanResults.violations).toEqual([]);
    });

    test(`risk analytics view meets WCAG 2.1 AA in ${theme} theme`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem('foliolive-theme-mode', mode);
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      await page.goto('/login');
      await page.getByRole('button', { name: /PM Demo/i }).click();
      await page.getByRole('link', { name: /Risk Metrics & VaR/i }).click();
      await expect(page).toHaveURL(/.*risk/);
      await expect(
        page.getByRole('heading', { name: /Parametric VaR \(95%, 1-Day\)/i })
      ).toBeVisible();

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(scanResults.violations).toEqual([]);
    });

    test(`surveillance feed meets WCAG 2.1 AA in ${theme} theme`, async ({ page }) => {
      await page.addInitScript((mode) => {
        window.localStorage.setItem('foliolive-theme-mode', mode);
        if (mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, theme);

      await page.goto('/login');
      await page.getByRole('button', { name: /PM Demo/i }).click();
      await page.getByRole('link', { name: /Limits & Alerts/i }).click();
      await expect(page).toHaveURL(/.*alerts/);
      await expect(
        page.getByRole('heading', { name: /Live Breach Stream & Alert Feed/i })
      ).toBeVisible();

      const scanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      expect(scanResults.violations).toEqual([]);
    });
  }
});
