import { test, expect } from '@playwright/test';

/**
 * ビジュアルリグレッションテストスイート
 * 
 * UIの視覚的な変更を検出し、意図しない変更を防ぐ
 */

test.describe('Visual Regression Tests', () => {
  // スナップショット設定
  test.use({
    // ビジュアル比較の閾値設定
    ignoreHTMLDifferences: true,
    video: 'retain-on-failure',
    screenshot: {
      animations: 'disabled',
      caret: 'hide'
    }
  });

  test.beforeEach(async ({ page }) => {
    // アニメーションを無効化して一貫性を保つ
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
        }
      `
    });
  });

  test.describe('Home Screen', () => {
    test('ホーム画面の全体表示', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 全画面スクリーンショット
      await expect(page).toHaveScreenshot('home-full.png', {
        fullPage: true,
        threshold: 0.2,
        maxDiffPixels: 100
      });
    });

    test('ホーム画面のヘッダー部分', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      const header = page.locator('header, .header, [role="banner"]').first();
      await expect(header).toHaveScreenshot('home-header.png');
    });

    test('ゲーム開始ボタンのホバー状態', async ({ page }) => {
      await page.goto('/');
      const startButton = page.locator('text=ゲームを開始, text=Start Game, button:has-text("Play")').first();
      
      // 通常状態
      await expect(startButton).toHaveScreenshot('start-button-normal.png');
      
      // ホバー状態
      await startButton.hover();
      await page.waitForTimeout(100); // ホバーエフェクトの完了待ち
      await expect(startButton).toHaveScreenshot('start-button-hover.png');
    });
  });

  test.describe('Game Screen', () => {
    test('ゲーム画面の初期状態', async ({ page }) => {
      await page.goto('/');
      
      // ゲーム開始
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000); // ゲーム初期化待ち
      
      // ゲーム画面全体
      await expect(page).toHaveScreenshot('game-initial.png', {
        fullPage: true,
        threshold: 0.3, // ゲーム画面は動的なので閾値を緩める
        maxDiffPixels: 200
      });
    });

    test('カード表示エリア', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000);
      
      // カードエリアのスクリーンショット
      const cardArea = page.locator('.card-area, .cards, [data-testid="card-area"]').first();
      await expect(cardArea).toHaveScreenshot('game-cards.png', {
        threshold: 0.25,
        maxDiffPixelRatio: 0.05
      });
    });

    test('スコア表示部分', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000);
      
      const scoreArea = page.locator('.score, .status, [data-testid="score-display"]').first();
      await expect(scoreArea).toHaveScreenshot('game-score.png');
    });

    test('チャレンジモード表示', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000);
      
      // チャレンジモードに移行（もし実装されていれば）
      const challengeButton = page.locator('text=チャレンジ, text=Challenge').first();
      if (await challengeButton.isVisible()) {
        await challengeButton.click();
        await page.waitForTimeout(500);
        
        await expect(page).toHaveScreenshot('game-challenge-mode.png', {
          fullPage: true,
          threshold: 0.3
        });
      }
    });
  });

  test.describe('Responsive Design', () => {
    const viewports = [
      { name: 'mobile-portrait', width: 375, height: 667 },
      { name: 'mobile-landscape', width: 667, height: 375 },
      { name: 'tablet-portrait', width: 768, height: 1024 },
      { name: 'tablet-landscape', width: 1024, height: 768 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(({ name, width, height }) => {
      test(`ホーム画面 - ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        await expect(page).toHaveScreenshot(`responsive-home-${name}.png`, {
          fullPage: true,
          threshold: 0.3
        });
      });

      test(`ゲーム画面 - ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
        await page.waitForTimeout(1000);
        
        await expect(page).toHaveScreenshot(`responsive-game-${name}.png`, {
          fullPage: true,
          threshold: 0.3
        });
      });
    });
  });

  test.describe('Dark Mode', () => {
    test('ダークモード - ホーム画面', async ({ page }) => {
      // ダークモードを強制
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('dark-mode-home.png', {
        fullPage: true,
        threshold: 0.2
      });
    });

    test('ダークモード - ゲーム画面', async ({ page }) => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('dark-mode-game.png', {
        fullPage: true,
        threshold: 0.3
      });
    });
  });

  test.describe('Animations and Transitions', () => {
    test('カード選択アニメーション', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000);
      
      // アニメーションを有効化
      await page.addStyleTag({
        content: `
          * {
            animation-duration: 0.1s !important;
            transition-duration: 0.1s !important;
          }
        `
      });
      
      const card = page.locator('.card, [data-testid="game-card"]').first();
      
      // カード選択前
      await expect(card).toHaveScreenshot('card-before-select.png');
      
      // カード選択（クリック）
      await card.click();
      await page.waitForTimeout(150); // アニメーション完了待ち
      
      // カード選択後
      await expect(card).toHaveScreenshot('card-after-select.png');
    });

    test('画面遷移アニメーション', async ({ page }) => {
      await page.goto('/');
      
      // 遷移前のスクリーンショット
      await expect(page).toHaveScreenshot('transition-before.png');
      
      // ゲーム開始をクリック
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      
      // 遷移中（アニメーションの中間地点）
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot('transition-during.png');
      
      // 遷移完了後
      await page.waitForTimeout(700);
      await expect(page).toHaveScreenshot('transition-after.png');
    });
  });

  test.describe('Error States', () => {
    test('ネットワークエラー時の表示', async ({ page, context }) => {
      // ネットワークリクエストを遮断
      await context.route('**/*', route => route.abort());
      
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      
      await expect(page).toHaveScreenshot('error-network.png', {
        fullPage: true
      });
    });

    test('ゲームオーバー画面', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      
      // ゲームオーバー状態をシミュレート（実装に応じて調整）
      await page.evaluate(() => {
        // ゲームオーバー状態を強制的に作る
        const gameOverEvent = new CustomEvent('gameover');
        window.dispatchEvent(gameOverEvent);
      });
      
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('game-over.png', {
        fullPage: true
      });
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('高コントラストモード', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot('high-contrast-home.png', {
        fullPage: true
      });
    });

    test('フォーカス状態の可視化', async ({ page }) => {
      await page.goto('/');
      
      // Tabキーでフォーカスを移動
      await page.keyboard.press('Tab');
      await expect(page).toHaveScreenshot('focus-first-element.png');
      
      await page.keyboard.press('Tab');
      await expect(page).toHaveScreenshot('focus-second-element.png');
      
      await page.keyboard.press('Tab');
      await expect(page).toHaveScreenshot('focus-third-element.png');
    });
  });

  test.describe('Component States', () => {
    test('ボタンの各種状態', async ({ page }) => {
      await page.goto('/');
      
      const button = page.locator('button').first();
      
      // 通常状態
      await expect(button).toHaveScreenshot('button-normal.png');
      
      // ホバー状態
      await button.hover();
      await expect(button).toHaveScreenshot('button-hover.png');
      
      // フォーカス状態
      await button.focus();
      await expect(button).toHaveScreenshot('button-focus.png');
      
      // アクティブ状態（押下中）
      await button.hover();
      await page.mouse.down();
      await expect(button).toHaveScreenshot('button-active.png');
      await page.mouse.up();
      
      // 無効状態（もし実装されていれば）
      await page.evaluate((el) => {
        el.disabled = true;
      }, await button.elementHandle());
      await expect(button).toHaveScreenshot('button-disabled.png');
    });

    test('入力フォームの状態', async ({ page }) => {
      await page.goto('/');
      
      // 入力フォームがある場合のテスト
      const input = page.locator('input[type="text"], input[type="number"]').first();
      if (await input.isVisible()) {
        // 空の状態
        await expect(input).toHaveScreenshot('input-empty.png');
        
        // フォーカス状態
        await input.focus();
        await expect(input).toHaveScreenshot('input-focus.png');
        
        // 値入力後
        await input.fill('テスト値');
        await expect(input).toHaveScreenshot('input-filled.png');
        
        // エラー状態（バリデーションエラーをシミュレート）
        await page.evaluate((el) => {
          el.classList.add('error');
          el.setAttribute('aria-invalid', 'true');
        }, await input.elementHandle());
        await expect(input).toHaveScreenshot('input-error.png');
      }
    });
  });

  test.describe('Loading States', () => {
    test('ローディング画面', async ({ page }) => {
      // ローディング状態をシミュレート
      await page.route('**/*', async route => {
        await page.waitForTimeout(2000); // 遅延を追加
        await route.continue();
      });
      
      await page.goto('/');
      
      // ローディング中のスクリーンショット
      await expect(page).toHaveScreenshot('loading-state.png');
    });

    test('スケルトンスクリーン', async ({ page }) => {
      await page.goto('/');
      
      // スケルトンスクリーンがある場合
      const skeleton = page.locator('.skeleton, [data-loading="true"]').first();
      if (await skeleton.isVisible()) {
        await expect(skeleton).toHaveScreenshot('skeleton-screen.png');
      }
    });
  });
});

/**
 * ビジュアルリグレッションテストのベストプラクティス
 * 
 * 1. アニメーションの無効化
 *    - テストの一貫性を保つため、CSSアニメーションを無効化
 * 
 * 2. 適切な閾値設定
 *    - threshold: ピクセル差の許容率（0-1）
 *    - maxDiffPixels: 許容する最大ピクセル差
 *    - maxDiffPixelRatio: 許容する最大ピクセル差の割合
 * 
 * 3. 待機時間の設定
 *    - 動的コンテンツの読み込み完了を待つ
 *    - waitForLoadState('networkidle')を使用
 * 
 * 4. スナップショットの更新
 *    - UIの意図的な変更時: npm run test:e2e -- --update-snapshots
 * 
 * 5. CI/CD環境での実行
 *    - Dockerコンテナで一貫した環境を確保
 *    - フォントやレンダリングエンジンの差異に注意
 */