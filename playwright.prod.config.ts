import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: false,
  retries: 1,
  workers: 1,
  reporter: 'line',
  testMatch: '**/tests/e2e/deployment.spec.ts',
  timeout: 30000,
  use: {
    baseURL: 'https://shishihs.github.io/insurance_self_game/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // 本番サイト専用なのでwebServerは使用しない
});