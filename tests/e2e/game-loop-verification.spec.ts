import { test, expect } from '@playwright/test';

test.describe('Game Loop Verification', () => {
    test.beforeEach(async ({ page }) => {
        // Capture console logs
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err.message}`));

        // Go to the home page
        await page.goto('/', { waitUntil: 'commit' });

        // Wait for the app wrapper
        await expect(page.locator('#app')).toBeVisible({ timeout: 5000 });

        // Wait for the Vue app to mount and show content
        await expect(page.locator('.app-container')).toBeVisible({ timeout: 20000 });
    });

    test('should play through a basic turn v2', async ({ page }) => {
        // 1. Start Game
        // Look for the start game button with exact accessible name
        const startGameBtn = page.getByRole('button', { name: 'ゲームを開始する (Alt+G)' });
        await expect(startGameBtn).toBeVisible({ timeout: 5000 });
        await startGameBtn.click();

        // 2. Dream Selection (v2)
        // Wait for Dream Selector to appear (Look for "Choose Your Dream" text)
        await expect(page.getByText('夢を選択してください')).toBeVisible({ timeout: 10000 });

        // Wait for Dream Selector animations to finish
        await page.waitForTimeout(2000);

        // Debug: Log page content
        const content = await page.content();
        console.log('DEBUG: Page Content Snippet:', content.substring(0, 500));
        console.log('DEBUG: Visible text:', await page.innerText('body'));

        // Select the first dream card
        const dreamCards = page.locator('[data-testid="card"]');
        await expect(dreamCards.first()).toBeVisible();

        // Force click just in case of overlay issues, or ensure it's stable
        await dreamCards.first().click({ force: true });

        // 3. Draw Phase
        // Wait for GameBoard to be visible
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });

        // In v2, Draw Phase might be automated or manual.
        // If there is a manual "Draw Card" button:
        const drawBtn = page.getByRole('button', { name: /カードを引く/i });
        if (await drawBtn.isVisible()) {
            await drawBtn.click();
        }

        // 4. Challenge Selection Phase (v2)
        // Check for "Start Challenge" button which triggers the choice phase
        const startChallengeBtn = page.getByRole('button', { name: /課題に取り組む/i });
        await expect(startChallengeBtn).toBeVisible({ timeout: 5000 });
        await startChallengeBtn.click();

        // Wait for Challenge Selector overlay
        await expect(page.getByText('課題に立ち向かう')).toBeVisible({ timeout: 5000 });

        // Select first challenge option
        // Assuming dream selector cards are gone, these are the new ones
        const challengeOption = page.locator('[data-testid="card"]').first();
        await expect(challengeOption).toBeVisible();
        await challengeOption.click();

        // 5. Challenge Active Phase
        // Now "Resolve Challenge" should be visible
        const resolveBtn = page.getByRole('button', { name: /課題を解決する/i });
        await expect(resolveBtn).toBeVisible({ timeout: 5000 });

        // Select a card from hand to play
        const handCard = page.locator('[data-testid="hand-container"] [data-testid="card"]').first();
        if (await handCard.isVisible()) {
            await handCard.click();
        }

        await resolveBtn.click();

        // 6. End Turn / Next Phase
        // After resolution, either End Turn or Result
        const endTurnBtn = page.getByRole('button', { name: /ターン終了/i });
        await expect(endTurnBtn).toBeVisible({ timeout: 5000 });
        await endTurnBtn.click();

        // Verify back to Draw or Start Challenge
        // In v2 loop, next turn starts.
        await expect(startChallengeBtn).toBeVisible({ timeout: 10000 }); // Or draw btn
    });
});
