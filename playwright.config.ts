import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @foliolive/portfolio-mfe preview --strictPort',
      port: 3001,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @foliolive/risk-mfe preview --strictPort',
      port: 3002,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @foliolive/alerts-mfe preview --strictPort',
      port: 3003,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @foliolive/bff dev',
      port: 4000,
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: 'pnpm --filter @foliolive/shell preview --strictPort',
      port: 3100,
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
