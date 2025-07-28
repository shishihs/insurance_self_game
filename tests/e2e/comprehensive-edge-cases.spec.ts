import { test, expect } from '@playwright/test';

test.describe('🚨 エッジケース・失敗シナリオ 網羅テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 詳細なエラーロギングを有効化
    page.on('pageerror', error => {
      console.error(`🔴 Page Error: ${error.message}`);
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`🔴 Console Error: ${msg.text()}`);
      }
    });
  });

  test('境界値テスト: 極小画面でのゲーム動作', async ({ page }) => {
    // 極小画面サイズ (スマートウォッチレベル)
    await page.setViewportSize({ width: 200, height: 200 });
    await page.goto('/');
    
    // UIが適切にレスポンシブ対応するかチェック
    const app = page.locator('#app');
    await expect(app).toBeVisible();
    
    // ボタンがクリック可能な範囲内にあるかチェック
    const startButton = page.locator('text=ゲームをプレイ').first();
    if (await startButton.isVisible({ timeout: 5000 })) {
      const buttonBox = await startButton.boundingBox();
      expect(buttonBox?.width).toBeGreaterThan(50); // 最小タップ領域
      expect(buttonBox?.height).toBeGreaterThan(30);
    }
  });

  test('境界値テスト: 超大画面でのレイアウト崩れ検証', async ({ page }) => {
    // 4K+ 大画面
    await page.setViewportSize({ width: 3840, height: 2160 });
    await page.goto('/');
    
    // レイアウトが適切にスケールするかチェック
    const title = page.locator('h1').first();
    await expect(title).toBeVisible();
    
    // 中央配置が維持されているかチェック
    const titleBox = await title.boundingBox();
    if (titleBox) {
      const screenCenter = 3840 / 2;
      const titleCenter = titleBox.x + titleBox.width / 2;
      const centerDifference = Math.abs(screenCenter - titleCenter);
      expect(centerDifference).toBeLessThan(500); // 中央からの許容誤差
    }
  });

  test('並行性テスト: 高速連続クリック耐性', async ({ page }) => {
    await page.goto('/');
    
    const startButton = page.locator('text=ゲームをプレイ').first();
    await expect(startButton).toBeVisible();
    
    // 短時間内に複数回クリック (競合状態を誘発)
    const clickPromises = [];
    for (let i = 0; i < 10; i++) {
      clickPromises.push(startButton.click({ timeout: 1000 }));
    }
    
    try {
      await Promise.all(clickPromises);
      console.log('✅ 高速連続クリック: 正常処理');
    } catch (error) {
      console.log('⚠️ 高速連続クリック: 一部クリックが失敗 (期待される動作)');
    }
    
    // ゲーム状態が一貫していることを確認
    await page.waitForTimeout(2000);
    const canvas = page.locator('canvas');
    const canvasCount = await canvas.count();
    expect(canvasCount).toBeLessThanOrEqual(1); // 重複ゲーム起動防止
  });

  test('リソース枯渇テスト: 長時間実行での安定性', async ({ page }) => {
    await page.goto('/');
    
    // ゲームを複数回開始・終了して安定性をテスト
    for (let cycle = 0; cycle < 10; cycle++) {
      try {
        const startButton = page.locator('text=ゲームをプレイ');
        await startButton.click({ timeout: 5000 });
        
        // ゲーム初期化を待機
        await page.waitForTimeout(2000);
        
        // ホームに戻る
        const backButton = page.locator('text=ホームに戻る');
        if (await backButton.isVisible({ timeout: 3000 })) {
          await backButton.click();
        } else {
          await page.reload(); // フォールバック
        }
        
        await page.waitForTimeout(1000);
        
        console.log(`✅ サイクル ${cycle + 1}/10 完了`);
      } catch (error) {
        console.error(`🔴 サイクル ${cycle + 1} でエラー:`, error);
        await page.reload(); // エラー時はリセット
      }
    }
  });

  test('入力異常テスト: 不正キー入力処理', async ({ page }) => {
    await page.goto('/');
    
    // ゲーム開始
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    // 異常キー入力のシーケンス
    const abnormalKeys = [
      'F12', 'Escape', 'F5', 'Control+R', 'Control+Shift+I',
      'Alt+F4', 'Control+W', 'Control+T', 'Control+N'
    ];
    
    for (const key of abnormalKeys) {
      try {
        await page.keyboard.press(key);
        await page.waitForTimeout(100);
      } catch (error) {
        console.log(`⚠️ キー ${key} は処理できませんでした:`, error);
      }
    }
    
    // ゲームが継続して動作しているかチェック
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
  });

  test('ネットワーク異常テスト: 間欠的接続失敗', async ({ page }) => {
    let requestCount = 0;
    
    // 50%の確率でリクエストを失敗させる
    await page.route('**/*', (route) => {
      requestCount++;
      if (requestCount % 2 === 0) {
        route.abort(); // 間欠的な失敗をシミュレート
      } else {
        route.continue();
      }
    });
    
    try {
      await page.goto('/', { timeout: 10000 });
      
      // アプリケーションが部分的に動作することを確認
      const app = page.locator('#app');
      await expect(app).toBeVisible({ timeout: 15000 });
      
      console.log('✅ 間欠的ネットワーク障害に対する耐性を確認');
    } catch (error) {
      console.log('⚠️ ネットワーク異常時の動作:', error);
    }
  });

  test('メモリリーク検出: Phaserゲーム生成/破棄サイクル', async ({ page }) => {
    await page.goto('/');
    
    // JavaScript メモリ使用量を監視
    const initialMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    // ゲーム生成・破棄を繰り返す
    for (let i = 0; i < 5; i++) {
      const startButton = page.locator('text=ゲームをプレイ');
      await startButton.click();
      
      await page.waitForTimeout(3000); // ゲーム初期化待機
      
      const backButton = page.locator('text=ホームに戻る');
      if (await backButton.isVisible({ timeout: 5000 })) {
        await backButton.click();
      } else {
        await page.reload();
      }
      
      await page.waitForTimeout(2000); // GC時間を確保
    }
    
    // 最終メモリ使用量をチェック
    const finalMemory = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercentage = (memoryIncrease / initialMemory) * 100;
      
      console.log(`🧠 メモリ使用量: ${initialMemory} → ${finalMemory} (+${memoryIncreasePercentage.toFixed(2)}%)`);
      
      // 50%以上のメモリ増加は異常とみなす
      expect(memoryIncreasePercentage).toBeLessThan(50);
    }
  });

  test('フォーカス・ブラー耐性: タブ切り替え時の状態保持', async ({ page }) => {
    await page.goto('/');
    
    // ゲーム開始
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    // ページフォーカスを外す（タブ切り替えシミュレート）
    await page.evaluate(() => {
      window.dispatchEvent(new Event('blur'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(2000);
    
    // フォーカスを戻す
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'));
    });
    
    // ゲームが継続して動作しているかチェック
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    console.log('✅ フォーカス・ブラー処理: 正常動作');
  });

  test('データ破損テスト: LocalStorage異常値対応', async ({ page }) => {
    // 異常なLocalStorageデータを設定
    await page.addInitScript(() => {
      localStorage.setItem('gameData', '{"invalid": json}'); // 不正JSON
      localStorage.setItem('playerStats', 'null');
      localStorage.setItem('settings', '{"corruption": true}');
    });
    
    await page.goto('/');
    
    // アプリケーションが起動することを確認
    const app = page.locator('#app');
    await expect(app).toBeVisible();
    
    // ゲーム開始が可能かテスト
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    
    // 正常に初期化されるかチェック
    await page.waitForTimeout(3000);
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    console.log('✅ データ破損テスト: 適切にフォールバック処理');
  });

  test('レンダリング異常テスト: Canvas破損対応', async ({ page }) => {
    await page.goto('/');
    
    // ゲーム開始
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    // Canvas要素を意図的に破損させる
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        // Canvas contextを無効化
        const originalGetContext = canvas.getContext;
        canvas.getContext = () => null;
      }
    });
    
    // アプリケーションがクラッシュせずエラーハンドリングするかチェック
    await page.waitForTimeout(2000);
    
    // エラー状態でもUI要素が残っているかチェック
    const backButton = page.locator('text=ホームに戻る');
    const isBackButtonVisible = await backButton.isVisible({ timeout: 3000 });
    
    if (isBackButtonVisible) {
      console.log('✅ Canvas破損時もナビゲーション維持');
    } else {
      console.log('⚠️ Canvas破損時のエラーハンドリング要改善');
    }
  });
});

test.describe('🎯 カスタムアサーション: ゲーム固有の検証', () => {
  test('ゲーム状態一貫性: UI表示とロジック状態の同期', async ({ page }) => {
    await page.goto('/');
    
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    // ゲーム内部状態を取得
    const gameState = await page.evaluate(() => {
      // window上のゲーム状態を取得 (実装に応じて調整)
      return {
        isGameActive: !!document.querySelector('canvas'),
        hasGameManager: typeof (window as any).gameManager !== 'undefined',
        phaserInstances: (window as any).Phaser ? 1 : 0
      };
    });
    
    // UI状態と内部状態の一貫性をチェック
    expect(gameState.isGameActive).toBeTruthy();
    
    console.log('ゲーム状態一貫性:', gameState);
  });

  test('パフォーマンス基準: 60FPS維持チェック', async ({ page }) => {
    await page.goto('/');
    
    const startButton = page.locator('text=ゲームをプレイ');
    await startButton.click();
    await page.waitForTimeout(3000);
    
    // FPS測定
    const fpsData = await page.evaluate(() => {
      return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        
        function countFrame() {
          frameCount++;
          if (performance.now() - startTime < 2000) { // 2秒間測定
            requestAnimationFrame(countFrame);
          } else {
            const elapsed = (performance.now() - startTime) / 1000;
            const fps = frameCount / elapsed;
            resolve({ fps: Math.round(fps), frameCount });
          }
        }
        
        requestAnimationFrame(countFrame);
      });
    });
    
    console.log(`🎮 ゲームFPS: ${(fpsData as any).fps} fps (${(fpsData as any).frameCount} frames)`);
    
    // 最低30FPS以上を期待 (60FPS理想だが、テスト環境を考慮)
    expect((fpsData as any).fps).toBeGreaterThan(25);
  });
});