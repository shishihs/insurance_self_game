import { test, expect } from '@playwright/test';

test.describe('Game Crash Fix Verification', () => {
    test('should initialize game without crashing', async ({ page }) => {
        // Navigate to home page
        await page.goto('/');

        // Wait for app to load
        await expect(page.locator('.app-container')).toBeVisible({ timeout: 10000 });

        // Find and click the game start button
        // Using text content selector which is more robust
        const gameButton = page.locator('button').filter({ hasText: 'ゲームをプレイ' });
        await expect(gameButton).toBeVisible({ timeout: 10000 });
        await gameButton.click();

        // Wait for game view to appear
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });

        // Verify game components are rendered (not crashed)
        // Check for vitality display
        await expect(page.getByText('Vitality')).toBeVisible({ timeout: 5000 });

        // Check for stage display
        await expect(page.getByText('Stage')).toBeVisible({ timeout: 5000 });

        // Check for phase display
        await expect(page.getByText('Phase')).toBeVisible({ timeout: 5000 });

        // Verify game is in draw phase (not crashed during initialization)
        await expect(page.getByRole('button', { name: /Draw Card/i })).toBeVisible({ timeout: 5000 });

        // Take a screenshot as proof
        await page.screenshot({ path: 'test-results/game-initialized-successfully.png' });
    });
});
