import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  retries: 2,
  workers: 1,
  reporter: [['html'], ['json', { outputFile: 'test-results/playwright-results.json' }]],
  use: {
    baseURL: 'https://shishihs.github.io/insurance_self_game/',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // No webServer for production testing
});