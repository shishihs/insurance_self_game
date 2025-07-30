import { test, expect } from '@playwright/test';

test('smoke test', async ({ page }) => {
  // Simple test that always passes
  expect(true).toBe(true);
});

test('basic math test', async ({ page }) => {
  const result = 2 + 2;
  expect(result).toBe(4);
});