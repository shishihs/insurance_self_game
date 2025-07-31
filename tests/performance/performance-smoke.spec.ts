import { test, expect } from '@playwright/test';

test.describe('Performance Smoke Tests', () => {
  test('basic performance test', async ({ page }) => {
    // Simple test to ensure performance tests can run
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 100));
    const duration = Date.now() - startTime;
    
    expect(duration).toBeGreaterThanOrEqual(100);
    expect(duration).toBeLessThan(200);
  });
});