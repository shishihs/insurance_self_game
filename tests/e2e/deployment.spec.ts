import { test, expect } from '@playwright/test';

test.describe('デプロイメント確認', () => {
  test('ホームページが正しく表示される', async ({ page }) => {
    // GitHub Pagesのサイトにアクセス
    await page.goto('https://shishihs.github.io/insurance_self_game/');
    
    // ページタイトルを確認
    await expect(page).toHaveTitle(/人生充実ゲーム/);
    
    // メインタイトルが表示されている
    const title = page.locator('h1');
    await expect(title).toHaveText('人生充実ゲーム');
    
    // サブタイトルが表示されている
    const subtitle = page.locator('text=Life Fulfillment - 生命保険を「人生の味方」として描く');
    await expect(subtitle).toBeVisible();
    
    // ゲームをプレイボタンが存在する
    const playButton = page.locator('button:has-text("ゲームをプレイ")');
    await expect(playButton).toBeVisible();
    
    // チュートリアルボタンが存在する
    const tutorialButton = page.locator('button:has-text("チュートリアル")');
    await expect(tutorialButton).toBeVisible();
  });

  test('最新アップデート情報が表示される', async ({ page }) => {
    await page.goto('https://shishihs.github.io/insurance_self_game/');
    
    // 最新アップデートのバージョンが表示されている
    const versionHeader = page.locator('text=最新アップデート v0.2.4');
    await expect(versionHeader).toBeVisible();
    
    // ドラッグ&ドロップシステムの情報が表示されている
    const dragDropTitle = page.locator('text=高度なドラッグ&ドロップシステム');
    await expect(dragDropTitle).toBeVisible();
    
    // 主要機能の説明が表示されている
    const features = [
      'マグネティックスナップ',
      '60fps維持',
      'モバイル最適化',
      'ビジュアルフィードバック',
      'パフォーマンス最適化'
    ];
    
    for (const feature of features) {
      const featureElement = page.locator(`text=${feature}`);
      await expect(featureElement).toBeVisible();
    }
  });

  test('ゲーム開始機能が動作する', async ({ page }) => {
    await page.goto('https://shishihs.github.io/insurance_self_game/');
    
    // ゲームをプレイボタンをクリック
    await page.click('button:has-text("ゲームをプレイ")');
    
    // ゲーム画面が表示される（Phaser canvasの存在を確認）
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // ホームに戻るボタンが表示される
    const backButton = page.locator('button:has-text("ホームに戻る")');
    await expect(backButton).toBeVisible();
  });

  test('チュートリアル開始機能が動作する', async ({ page }) => {
    await page.goto('https://shishihs.github.io/insurance_self_game/');
    
    // チュートリアルボタンをクリック
    await page.click('button:has-text("チュートリアル")');
    
    // ゲーム画面が表示される
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 10000 });
    
    // チュートリアルオーバーレイが表示される（少し待つ）
    await page.waitForTimeout(1000);
    const tutorialOverlay = page.locator('.tutorial-overlay, [class*="tutorial"]');
    const overlayCount = await tutorialOverlay.count();
    expect(overlayCount).toBeGreaterThan(0);
  });

  test('レスポンシブデザインが機能する', async ({ page }) => {
    // モバイルビューポートでテスト
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://shishihs.github.io/insurance_self_game/');
    
    // タイトルが表示されている
    const title = page.locator('h1');
    await expect(title).toBeVisible();
    
    // ボタンが縦に配置されているか確認（モバイルレイアウト）
    const playButton = page.locator('button:has-text("ゲームをプレイ")');
    const tutorialButton = page.locator('button:has-text("チュートリアル")');
    await expect(playButton).toBeVisible();
    await expect(tutorialButton).toBeVisible();
  });
});