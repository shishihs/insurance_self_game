import { test, expect } from '@playwright/test';

test.describe('Game Flow Verification', () => {
    test('should reach game clear with high vitality', async ({ page }) => {
        // 1. Inject Cheat Config (High Vitality)
        await page.addInitScript(() => {
            (window as any).__GAME_CONFIG__ = {
                difficulty: 'normal',
                startingVitality: 9999, // Ensure survival (999 might be drained by consistent failures)
                startingHandSize: 5,
                maxHandSize: 10,
                dreamCardCount: 3,
                balanceConfig: {
                    progressionSettings: {
                        maxTurns: 50,
                        victoryConditions: {
                            minTurns: 20, // Shorten if needed, but logic says 20
                            minVitality: 50
                        }
                    },
                    vitalitySettings: {
                        defaultStarting: 9999,
                        maximumValue: 9999
                    },
                    stageParameters: {
                        youth: { maxVitality: 9999 },
                        middle: { maxVitality: 9999 },
                        fulfillment: { maxVitality: 9999 }
                    }
                }
            };
        });

        // 2. Start Game
        // Capture console logs for debugging
        page.on('console', msg => console.log(`[Browser Console] ${msg.text()}`));

        // Verify console capture
        await page.evaluate(() => console.log('[TEST] Console capture active'));

        // Clear storage to ensure no persistence interference
        await page.addInitScript(() => {
            localStorage.clear();
            sessionStorage.clear();
        });

        await page.goto('/');

        // Wait for Home Screen (force synchronization)
        await expect(page.locator('.home-view')).toBeVisible({ timeout: 10000 });

        // Click Start Game
        await page.getByRole('button', { name: /ゲームを開始|ゲームをプレイ/ }).click();

        // Wait for Game Screen (and allow transition)
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });

        const closeTutorial = page.getByRole('button', { name: '閉じる' });
        if (await closeTutorial.isVisible()) {
            await closeTutorial.click();
        }

        // 3. Dream Selection Phase
        // Use regex to be safe, and verify overlay presence first
        await expect(page.locator('.z-modal')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText(/夢を選択/)).toBeVisible();

        // Click first dream card
        // Use data-testid="card" as .dream-card does not exist
        await page.locator('[data-testid="card"]').first().click();

        // Verify Initial Hand Size (Fix verification)
        // Should be 5 cards immediately
        await expect(page.locator('[data-testid="hand-container"] .hover\\:z-10')).toHaveCount(5, { timeout: 5000 });
        console.log('Initial Hand verification passed: 5 cards');

        // 4. Game Loop
        // Loop until victory or limit
        let turn = 1;
        let maxLoops = 500; // Increase loops to allow full game clear (approx 40-50 turns * 4 actions)

        while (turn <= 55 && maxLoops > 0) {
            maxLoops--;

            // Check for Game Over / Victory
            if (await page.getByText('ゲームクリア').isVisible() || await page.getByText('勝利！').isVisible()) {
                console.log('VICTORY REACHED!');
                return; // Success
            }
            if (await page.getByText('ゲームオーバー').isVisible()) {
                throw new Error('Game Over reached unexpectedly with 999 vitality');
            }

            // Determine Action based on buttons
            // Priority: Insurance Selection -> Resolve -> Challenge -> Draw -> End Turn

            // Insurance Selection Overlay
            const insuranceOverlay = page.locator('.z-modal h2:has-text("保険を選択")');
            if (await insuranceOverlay.isVisible()) {
                console.log('Choosing Insurance...');
                // Click first "定期保険" button
                await page.getByRole('button', { name: /定期保険/ }).first().click();
                continue;
            }

            // Action Buttons
            const drawButton = page.getByRole('button', { name: 'カードを引く' });
            const challengeButton = page.getByRole('button', { name: '課題に取り組む' });
            const resolveButton = page.getByRole('button', { name: '課題を解決する' });
            const endTurnButton = page.getByRole('button', { name: 'ターン終了' });

            if (await resolveButton.isVisible()) {
                console.log('Resolving Challenge...');
                await resolveButton.click();
                continue;
            }

            // Challenge Choice Overlay (if "Challenge Choice" phase)
            // Usually clicking "課題に取り組む" opens an overlay (ChallengeSelector)
            // Correct text is "課題に立ち向かう"
            const challengeSelector = page.getByText('課題に立ち向かう');
            if (await challengeSelector.isVisible()) {
                console.log('Selecting Challenge Card...');
                // Click first challenge card in selector
                // Selector structure: .fixed ... card
                // Use data-testid="card"
                await page.locator('.z-modal [data-testid="card"]').first().click();
                continue;
            }

            if (await challengeButton.isVisible()) {
                console.log('Starting Challenge...');
                await challengeButton.click();
                // Wait for selector?
                continue;
            }

            if (await drawButton.isVisible()) {
                // Logic: Draw until hand limit or challenge?
                // Simple logic: Draw once then Challenge
                // But button visibility handles phase.
                // If Draw button is visible, we are in Draw phase.
                // We need to click "Challenge" if available, but "Challenge" usually requires non-empty challenge deck?
                // If we can't challenge (e.g. no button), we draw?
                // Wait, "Challenge" button only appears if we haven't challenged?
                // GameBoard logic: 
                // v-if="store.currentPhase === 'draw' && !store.currentChallenge" -> Show Challenge
                // v-if="store.currentPhase === 'draw'" -> Show Draw

                // Prefer Challenge if available
                // But Playwright `await challengeButton.isVisible()` might be false if button is there?
                // We checked challengeButton above.

                console.log('Drawing Card...');
                await drawButton.click();
                continue;
            }

            if (await endTurnButton.isVisible()) {
                console.log('Ending Turn...');
                await endTurnButton.click();
                // Turn increments
                continue;
            }

            // Wait a bit to avoid busy loop if animation
            await page.waitForTimeout(500);
        }

        throw new Error('Test timed out or max loops reached without victory');
    });
});
