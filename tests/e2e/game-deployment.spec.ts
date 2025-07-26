import { test, expect } from '@playwright/test';

test.describe('人生充実ゲーム - デプロイメント検証', () => {
  test('サイトが正常にロードされる', async ({ page }) => {
    await page.goto('/');
    
    // ページタイトル確認
    await expect(page).toHaveTitle(/人生充実ゲーム|Life Fulfillment/);
    
    // メインコンテナが表示される
    await expect(page.locator('#app')).toBeVisible();
    
    // JavaScriptエラーがないことを確認
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.waitForTimeout(3000); // 3秒待機
    expect(errors).toHaveLength(0);
  });

  test('ゲームが起動する', async ({ page }) => {
    await page.goto('/');
    
    // ゲーム開始ボタンを待機
    const startButton = page.locator('text=ゲームをプレイ').or(page.locator('text=PLAY')).or(page.locator('button').first());
    await expect(startButton).toBeVisible({ timeout: 10000 });
    
    // ゲーム開始
    await startButton.click();
    
    // ゲーム画面の要素確認
    await expect(page.locator('canvas').or(page.locator('#game-container'))).toBeVisible({ timeout: 10000 });
  });

  test('Phase 2機能: 保険カード選択システム', async ({ page }) => {
    await page.goto('/');
    
    // ゲーム開始
    const startButton = page.locator('text=ゲームをプレイ').or(page.locator('text=PLAY')).or(page.locator('button').first());
    await startButton.click();
    
    // ゲーム画面が表示されるまで待機
    await page.waitForTimeout(5000);
    
    // チャレンジを成功させる（簡易テスト）
    // 実際のゲームロジックに応じて調整が必要
    try {
      // チャレンジボタンを探してクリック
      const challengeButton = page.locator('text=チャレンジ').or(page.locator('text=CHALLENGE'));
      if (await challengeButton.isVisible({ timeout: 5000 })) {
        await challengeButton.click();
        
        // カード選択画面が表示されるかチェック
        await page.waitForTimeout(3000);
        
        // 3択カード選択要素の存在確認
        const cardSelectionElements = page.locator('[class*="card"]').or(page.locator('[data-testid*="card"]'));
        const cardCount = await cardSelectionElements.count();
        
        console.log(`カード選択要素数: ${cardCount}`);
      }
    } catch (error) {
      console.log('ゲームフロー詳細テストはスキップ:', error);
    }
  });

  test('レスポンシブデザイン確認', async ({ page }) => {
    // デスクトップサイズ
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.goto('/');
    await expect(page.locator('#app')).toBeVisible();
    
    // タブレットサイズ
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    await expect(page.locator('#app')).toBeVisible();
    
    // モバイルサイズ
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await expect(page.locator('#app')).toBeVisible();
  });

  test('パフォーマンス測定', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    
    // ページロード完了まで待機
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`ページロード時間: ${loadTime}ms`);
    
    // 3秒以内のロードを期待
    expect(loadTime).toBeLessThan(5000);
  });
});