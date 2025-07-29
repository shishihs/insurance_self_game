import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  testMatch: '**/tests/e2e/**/*.spec.ts',
  use: {
    baseURL: process.env.CI 
      ? 'https://shishihs.github.io/insurance_self_game/'
      : 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/tests/e2e/**/*.spec.ts',
    },
    // Mobile devices
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: '**/tests/e2e/mobile-*.spec.ts',
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
      testMatch: '**/tests/e2e/mobile-*.spec.ts',
    },
    {
      name: 'Tablet',
      use: { ...devices['iPad Pro'] },
      testMatch: '**/tests/e2e/mobile-*.spec.ts',
    },
  ],

  // Local development server
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: true,
  },
});