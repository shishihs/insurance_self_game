
import { test, expect } from '@playwright/test';

test.describe('Game Clear Verification', () => {
    test.skip('should clear the game with runtime cheats', async ({ page }) => {
        test.setTimeout(180000); // 3 minutes

        // Console logs redirection
        page.on('console', msg => console.log(`BROWSER LOG: ${msg.text()}`));
        page.on('pageerror', err => console.log(`BROWSER ERROR: ${err}`));

        await page.goto('/');

        // 1. Start Game
        const startGameBtn = page.getByRole('button', { name: /ゲームを開始する/ });
        await expect(startGameBtn).toBeVisible({ timeout: 10000 });
        await startGameBtn.click();

        // 2. Dream Selection
        await expect(page.getByText('夢を選択してください')).toBeVisible({ timeout: 10000 });
        const dreamCard = page.locator('[data-testid="card"]').first();
        await expect(dreamCard).toBeVisible();
        await dreamCard.click({ force: true });

        // 3. Game Loop
        const MAX_TURNS = 150;
        let turn = 1;
        let isGameActive = true;
        let victoryDetected = false;

        // Cheat function
        const applyCheats = async () => {
            await page.evaluate(() => {
                const store = (window as any)._gameStore;
                if (!store || !store.game) return;

                // 1. Heal to Max (keep alive)
                try {
                    // Try to update max vitality too if possible, but heal is safer
                    store.game.heal(100);
                } catch (e) { }

                // Force update
                if (store.triggerUpdate) store.triggerUpdate();
            });
        };

        while (isGameActive && turn <= MAX_TURNS) {
            console.log(`--- Turn ${turn} ---`);

            // Check for App Error
            if (await page.locator('.desktop-error').isVisible()) {
                const errorText = await page.locator('.desktop-error p').innerText();
                console.log('APP CRASHED:', errorText);
                throw new Error(`App Crashed: ${errorText}`);
            }

            // Apply cheats every turn cycle
            await applyCheats();

            // Check for Victory
            if (await page.getByText('Victory!', { exact: false }).isVisible()) {
                console.log('Victory detected!');
                victoryDetected = true;
                isGameActive = false;
                break;
            }
            if (await page.getByText('Game Clear', { exact: false }).isVisible()) { // Just in case
                console.log('Victory detected!');
                victoryDetected = true;
                isGameActive = false;
                break;
            }

            // 4-1. Draw Phase
            const drawBtn = page.getByRole('button', { name: /カードを引く/i });
            if (await drawBtn.isVisible()) {
                await drawBtn.click();
                await page.waitForTimeout(500);
                await applyCheats(); // Apply cheats to newly drawn cards
            }

            // 4-2. Challenge Selection
            const startChallengeBtn = page.getByRole('button', { name: /課題に取り組む/i });
            if (await startChallengeBtn.isVisible()) {
                await startChallengeBtn.click();
                await expect(page.getByText('課題に立ち向かう')).toBeVisible({ timeout: 5000 });
                await page.locator('[data-testid="card"]').first().click();
            }

            // 4-3. Challenge Resolution
            const resolveBtn = page.getByRole('button', { name: /課題を解決する/i });
            if (await resolveBtn.isVisible()) {
                // Ensure cheats applied before playing
                await applyCheats();

                // Select cards
                const handCards = page.locator('.hand-container [data-testid="card"]');
                const count = await handCards.count();

                // Select at least one card (now powerful)
                if (count > 0) {
                    const card = handCards.first();
                    const classes = await card.getAttribute('class') || '';
                    if (!classes.includes('ring-2')) {
                        await card.click();
                    }
                }

                await resolveBtn.click();
                await page.waitForTimeout(1000);
            }

            // 4-4. Insurance Selection
            const insuranceTitle = page.getByText('保険を選択');
            if (await insuranceTitle.isVisible()) {
                await page.locator('.fixed [data-testid="card"]').first().click();
                await page.waitForTimeout(1000);
            }

            // 4-5. End Turn
            const endTurnBtn = page.getByRole('button', { name: /ターン終了/i });
            if (await endTurnBtn.isVisible()) {
                await endTurnBtn.click();
                turn++;
                await page.waitForTimeout(500);
            } else {
                await page.waitForTimeout(500);
            }
        }

        if (!victoryDetected) {
            console.log('Final Page Content Dump:');
            // console.log(await page.content()); // Too large
            const text = await page.innerText('body');
            console.log(text.substring(0, 1000));
        }

        expect(victoryDetected).toBeTruthy();
    });
});
