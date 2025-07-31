import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 2,
  workers: 1,
  reporter: [['html', { outputFolder: 'test-results/playwright-report' }]],
  testMatch: '**/website-verification.spec.js',
  timeout: 60000,
  use: {
    // No baseURL since we'll use full URLs
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer needed for external URL testing
});