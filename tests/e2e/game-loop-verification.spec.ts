import { test, expect } from '@playwright/test';

test.describe('Game Loop Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Go to the home page
        await page.goto('/');

        // Wait for the app to load
        await expect(page.locator('.app-container')).toBeVisible();
    });

    test('should play through a basic turn', async ({ page }) => {
        // 1. Start Game
        // Look for the start game button with exact text "ゲームをプレイ"
        const startGameBtn = page.getByRole('button', { name: 'ゲームをプレイ' });
        await expect(startGameBtn).toBeVisible({ timeout: 5000 });
        await startGameBtn.click();

        // Wait for GameBoard to be visible
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });

        // Wait for game initialization - check that phase is 'draw'
        await page.waitForTimeout(1000); // Give time for store initialization

        // 2. Draw Phase
        // Check for "Draw Card" button
        const drawBtn = page.getByRole('button', { name: /Draw Card/i });
        await expect(drawBtn).toBeVisible({ timeout: 5000 });
        await drawBtn.click();

        // Wait a bit for the card to be drawn
        await page.waitForTimeout(500);

        // 3. Challenge Phase
        // Check for "Start Challenge" button
        const challengeBtn = page.getByRole('button', { name: /Start Challenge/i });
        await expect(challengeBtn).toBeVisible({ timeout: 5000 });
        await challengeBtn.click();

        // Wait for challenge to be set
        await page.waitForTimeout(500);

        // 4. Resolution Phase
        // Check for "Resolve Challenge" button
        const resolveBtn = page.getByRole('button', { name: /Resolve Challenge/i });
        await expect(resolveBtn).toBeVisible({ timeout: 5000 });

        // Try to select a card from hand if available
        const cards = page.locator('.hand-container .card');
        const count = await cards.count();
        if (count > 0) {
            // Click the first card to select it
            await cards.first().click();
            await page.waitForTimeout(300);
        }

        await resolveBtn.click();

        // Wait for resolution
        await page.waitForTimeout(500);

        // 5. End Turn Phase
        // After resolve, we should see End Turn button
        const endTurnBtn = page.getByRole('button', { name: /End Turn/i });
        await expect(endTurnBtn).toBeVisible({ timeout: 5000 });
        await endTurnBtn.click();

        // Wait for turn to end
        await page.waitForTimeout(500);

        // Verify we're back to draw phase (Draw Card button should be visible again)
        await expect(drawBtn).toBeVisible({ timeout: 5000 });
    });
});
