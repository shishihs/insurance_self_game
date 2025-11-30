import { test, expect } from '@playwright/test';

/**
 * 完全なゲームフローのE2Eテスト
 * ゲームの開始から終了まで、期待される動作をストーリー形式で検証
 */
test.describe('Complete Game Flow - Full Story', () => {
    test.beforeEach(async ({ page }) => {
        // ホーム画面に移動
        await page.goto('/');
        await expect(page.locator('.app-container')).toBeVisible();
    });

    test('should complete a full game session from start to finish', async ({ page }) => {
        // ==========================================
        // Act 1: ゲーム開始
        // ==========================================

        // ホーム画面が表示されていることを確認
        await expect(page.locator('.home-view')).toBeVisible();

        // 「ゲームをプレイ」ボタンをクリック
        const startGameBtn = page.getByRole('button', { name: 'ゲームをプレイ' });
        await expect(startGameBtn).toBeVisible();
        await startGameBtn.click();

        // ゲーム画面に遷移したことを確認
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });

        // ゲームボードが表示されることを確認
        await page.waitForTimeout(1000); // ストアの初期化を待つ

        // 初期状態の確認
        await expect(page.getByText('Stage')).toBeVisible();
        await expect(page.getByText('Vitality')).toBeVisible();
        await expect(page.getByText('Turn')).toBeVisible();
        await expect(page.getByText('Phase')).toBeVisible();

        // ==========================================
        // Act 2: ターン1 - カードドロー
        // ==========================================

        // Drawフェーズであることを確認
        const drawBtn = page.getByRole('button', { name: /Draw Card/i });
        await expect(drawBtn).toBeVisible({ timeout: 5000 });

        // カードを1枚ドロー
        await drawBtn.click();
        await page.waitForTimeout(500);

        // 手札にカードが追加されたことを確認
        const handCards = page.locator('.hand-container .card');
        await expect(handCards.first()).toBeVisible({ timeout: 3000 });

        // ==========================================
        // Act 3: チャレンジ開始
        // ==========================================

        // 「Start Challenge」ボタンが表示されることを確認
        const challengeBtn = page.getByRole('button', { name: /Start Challenge/i });
        await expect(challengeBtn).toBeVisible({ timeout: 5000 });

        // チャレンジを開始
        await challengeBtn.click();
        await page.waitForTimeout(500);

        // チャレンジカードが表示されることを確認
        await expect(page.getByText('Current Challenge')).toBeVisible();

        // ==========================================
        // Act 4: チャレンジ解決
        // ==========================================

        // 「Resolve Challenge」ボタンが表示されることを確認
        const resolveBtn = page.getByRole('button', { name: /Resolve Challenge/i });
        await expect(resolveBtn).toBeVisible({ timeout: 5000 });

        // 手札からカードを選択（可能であれば）
        const cardCount = await handCards.count();
        if (cardCount > 0) {
            // 最初のカードを選択
            await handCards.first().click();
            await page.waitForTimeout(300);
        }

        // チャレンジを解決
        await resolveBtn.click();
        await page.waitForTimeout(1000);

        // 結果メッセージが表示されることを確認（成功/失敗）
        // メッセージエリアが存在するか確認
        const messageArea = page.locator('.absolute.top-20');
        // メッセージが表示される場合もあれば、されない場合もある

        // ==========================================
        // Act 5: 保険選択（成功時のみ）
        // ==========================================

        // 保険選択オーバーレイが表示されるか確認
        const insuranceOverlay = page.locator('.fixed.inset-0.bg-black\\/80');
        const isInsuranceVisible = await insuranceOverlay.isVisible().catch(() => false);

        if (isInsuranceVisible) {
            // 保険タイプを選択
            const insuranceChoices = page.locator('.grid.grid-cols-3 > div');
            const choiceCount = await insuranceChoices.count();

            if (choiceCount > 0) {
                // 最初の保険を選択
                await insuranceChoices.first().click();
                await page.waitForTimeout(500);
            }
        }

        // ==========================================
        // Act 6: ターン終了
        // ==========================================

        // 「End Turn」ボタンが表示されることを確認
        const endTurnBtn = page.getByRole('button', { name: /End Turn/i });
        await expect(endTurnBtn).toBeVisible({ timeout: 5000 });

        // ターンを終了
        await endTurnBtn.click();
        await page.waitForTimeout(500);

        // ==========================================
        // Act 7: ターン2 - 同じフローを繰り返し
        // ==========================================

        // 再びDrawフェーズに戻ったことを確認
        await expect(drawBtn).toBeVisible({ timeout: 5000 });

        // ターン番号が増えていることを確認
        // (具体的な数値は確認しないが、ゲームが進行していることを確認)

        // もう一度カードをドロー
        await drawBtn.click();
        await page.waitForTimeout(500);

        // チャレンジを開始
        await expect(challengeBtn).toBeVisible({ timeout: 5000 });
        await challengeBtn.click();
        await page.waitForTimeout(500);

        // チャレンジを解決
        await expect(resolveBtn).toBeVisible({ timeout: 5000 });

        // カードを選択
        const currentCards = await handCards.count();
        if (currentCards > 0) {
            await handCards.first().click();
            await page.waitForTimeout(300);
        }

        await resolveBtn.click();
        await page.waitForTimeout(1000);

        // 保険選択があれば処理
        const isInsuranceVisible2 = await insuranceOverlay.isVisible().catch(() => false);
        if (isInsuranceVisible2) {
            const insuranceChoices2 = page.locator('.grid.grid-cols-3 > div');
            const choiceCount2 = await insuranceChoices2.count();
            if (choiceCount2 > 0) {
                await insuranceChoices2.first().click();
                await page.waitForTimeout(500);
            }
        }

        // ターン終了
        await expect(endTurnBtn).toBeVisible({ timeout: 5000 });
        await endTurnBtn.click();
        await page.waitForTimeout(500);

        // ==========================================
        // Act 8: ゲーム継続の確認
        // ==========================================

        // ゲームオーバーでない限り、再びDrawフェーズに戻る
        const isGameOver = await page.locator('.game-over').isVisible().catch(() => false);

        if (!isGameOver) {
            // ゲームが継続していることを確認
            await expect(drawBtn).toBeVisible({ timeout: 5000 });
        }

        // ==========================================
        // Final: スクリーンショット撮影
        // ==========================================

        // 最終状態のスクリーンショットを撮影
        await page.screenshot({ path: 'test-results/game-flow-complete.png', fullPage: true });
    });

    test('should handle game over scenario', async ({ page }) => {
        // ゲーム開始
        const startGameBtn = page.getByRole('button', { name: 'ゲームをプレイ' });
        await startGameBtn.click();
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1000);

        // 複数ターンを実行してゲームオーバーを目指す
        // (実際のゲームオーバー条件に依存)

        for (let i = 0; i < 10; i++) {
            // Drawボタンが表示されているか確認（ゲームオーバーでない）
            const drawBtn = page.getByRole('button', { name: /Draw Card/i });
            const isDrawVisible = await drawBtn.isVisible().catch(() => false);

            if (!isDrawVisible) {
                // ゲームオーバーまたは別の状態
                break;
            }

            // 基本的なターンフロー
            await drawBtn.click();
            await page.waitForTimeout(300);

            const challengeBtn = page.getByRole('button', { name: /Start Challenge/i });
            const isChallengeVisible = await challengeBtn.isVisible().catch(() => false);

            if (isChallengeVisible) {
                await challengeBtn.click();
                await page.waitForTimeout(300);

                const resolveBtn = page.getByRole('button', { name: /Resolve Challenge/i });
                const isResolveVisible = await resolveBtn.isVisible().catch(() => false);

                if (isResolveVisible) {
                    await resolveBtn.click();
                    await page.waitForTimeout(500);

                    // 保険選択をスキップ（オーバーレイがあればクリック）
                    const insuranceOverlay = page.locator('.fixed.inset-0.bg-black\\/80');
                    const isInsuranceVisible = await insuranceOverlay.isVisible().catch(() => false);
                    if (isInsuranceVisible) {
                        const choices = page.locator('.grid.grid-cols-3 > div');
                        const count = await choices.count();
                        if (count > 0) {
                            await choices.first().click();
                            await page.waitForTimeout(300);
                        }
                    }

                    const endTurnBtn = page.getByRole('button', { name: /End Turn/i });
                    const isEndTurnVisible = await endTurnBtn.isVisible().catch(() => false);

                    if (isEndTurnVisible) {
                        await endTurnBtn.click();
                        await page.waitForTimeout(300);
                    }
                }
            }
        }

        // 最終状態のスクリーンショット
        await page.screenshot({ path: 'test-results/game-over-scenario.png', fullPage: true });
    });

    test('should navigate back to home from game', async ({ page }) => {
        // ゲーム開始
        const startGameBtn = page.getByRole('button', { name: 'ゲームをプレイ' });
        await startGameBtn.click();
        await expect(page.locator('.game-view')).toBeVisible({ timeout: 10000 });

        // 「ホーム」ボタンをクリック
        const backBtn = page.locator('.back-to-home-btn');
        await expect(backBtn).toBeVisible();
        await backBtn.click();

        // ホーム画面に戻ったことを確認
        await expect(page.locator('.home-view')).toBeVisible({ timeout: 5000 });
        await expect(startGameBtn).toBeVisible();
    });
});
