import { test, expect } from '@playwright/test';

test.describe('Draw Card Error Investigation', () => {
    test('should capture error when clicking Draw Card', async ({ page }) => {
        // Capture console messages
        const consoleMessages: string[] = [];
        const errorMessages: string[] = [];

        page.on('console', msg => {
            const text = `[${msg.type()}] ${msg.text()}`;
            consoleMessages.push(text);
            if (msg.type() === 'error') {
                errorMessages.push(text);
            }
        });

        // Capture page errors
        const pageErrors: Error[] = [];
        page.on('pageerror', error => {
            pageErrors.push(error);
            console.log('PAGE ERROR:', error.message);
            console.log('STACK:', error.stack);
        });

        // Navigate and start game
        await page.goto('/');
        await expect(page.locator('.app-container')).toBeVisible({ timeout: 10000 });

        // Click game start button
        const gameButton = page.locator('button').filter({ hasText: 'ゲームをプレイ' });
        await gameButton.click();
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });

        // Take screenshot before clicking Draw Card
        await page.screenshot({ path: 'test-results/before-draw-card.png', fullPage: true });

        // Wait for Draw Card button
        const drawButton = page.getByRole('button', { name: /Draw Card/i });
        await expect(drawButton).toBeVisible({ timeout: 5000 });

        // Click Draw Card and wait for potential error
        await drawButton.click();

        // Wait a bit to see if error occurs
        await page.waitForTimeout(2000);

        // Take screenshot after clicking
        await page.screenshot({ path: 'test-results/after-draw-card.png', fullPage: true });

        // Log all captured errors
        console.log('\n=== CONSOLE MESSAGES ===');
        consoleMessages.forEach(msg => console.log(msg));

        console.log('\n=== ERROR MESSAGES ===');
        errorMessages.forEach(msg => console.log(msg));

        console.log('\n=== PAGE ERRORS ===');
        pageErrors.forEach(error => {
            console.log('Message:', error.message);
            console.log('Stack:', error.stack);
        });

        // Check if there are any errors
        if (pageErrors.length > 0 || errorMessages.length > 0) {
            console.log('\n⚠️ ERRORS DETECTED!');
        } else {
            console.log('\n✅ No errors detected');
        }
    });
});
