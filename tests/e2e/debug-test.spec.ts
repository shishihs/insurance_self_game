import { test, expect } from '@playwright/test';

test.describe('Debug Test', () => {
    test('should load the page and find elements', async ({ page }) => {
        // Navigate to the home page
        await page.goto('/');

        // Take a screenshot of what we see
        await page.screenshot({ path: 'test-results/debug-initial.png', fullPage: true });

        // Wait for the app container
        await expect(page.locator('.app-container')).toBeVisible({ timeout: 10000 });

        // Log the page URL
        console.log('Current URL:', page.url());

        // Log the page title
        console.log('Page title:', await page.title());

        // Wait for home view
        await expect(page.locator('.home-view')).toBeVisible({ timeout: 10000 });

        // Take another screenshot
        await page.screenshot({ path: 'test-results/debug-after-wait.png', fullPage: true });

        // Try to find the button with different selectors
        const button1 = page.getByRole('button', { name: 'ゲームをプレイ' });
        const button2 = page.getByText('ゲームをプレイ');
        const button3 = page.locator('button:has-text("ゲームをプレイ")');

        console.log('Button 1 count:', await button1.count());
        console.log('Button 2 count:', await button2.count());
        console.log('Button 3 count:', await button3.count());

        // Wait for button to be visible
        await expect(button1).toBeVisible({ timeout: 10000 });

        console.log('Button found and visible!');
    });
});
