import { chromium } from 'playwright';

async function checkDeployment() {
  console.log('🚀 デプロイ確認を開始します...');
  
  const browser = await chromium.launch({ 
    headless: true,
    timeout: 60000
  });
  
  try {
    const page = await browser.newPage();
    
    // タイムアウトを設定
    page.setDefaultTimeout(30000);
    
    console.log('📍 サイトにアクセス中...');
    const response = await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    if (!response.ok()) {
      throw new Error(`サイトにアクセスできません: ${response.status()}`);
    }
    
    console.log('✅ サイトにアクセス成功');
    
    // ゲームが読み込まれるまで待機
    await page.waitForTimeout(3000);
    
    // スクリーンショットを撮影
    await page.screenshot({ 
      path: 'screenshots/deployment-check-screenshot.png',
      fullPage: true 
    });
    console.log('📸 スクリーンショットを保存しました: screenshots/deployment-check-screenshot.png');
    
    // ゲーム要素の確認
    const checks = {
      'ゲームキャンバス': await page.locator('canvas').count() > 0,
      'タイトル表示': await page.title() === '人生充実ゲーム - Life Fulfillment',
    };
    
    // Phaserゲームの状態確認
    const gameState = await page.evaluate(() => {
      // グローバル変数からゲーム情報を取得
      if (typeof window !== 'undefined' && window.game) {
        return {
          isBooted: window.game.isBooted,
          sceneCount: window.game.scene.scenes.length,
          currentScene: window.game.scene.getScenes(true)[0]?.constructor.name
        };
      }
      return null;
    });
    
    if (gameState) {
      checks['Phaserゲーム起動'] = gameState.isBooted;
      checks['シーン数'] = gameState.sceneCount > 0;
      console.log(`  現在のシーン: ${gameState.currentScene || '不明'}`);
    }
    
    // 結果表示
    console.log('\n📋 確認結果:');
    for (const [item, result] of Object.entries(checks)) {
      console.log(`  ${result ? '✅' : '❌'} ${item}`);
    }
    
    // エラーチェック
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('\n⚠️  コンソールエラーが検出されました:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    }
    
    // 全体的な判定
    const allChecksPass = Object.values(checks).every(v => v);
    if (allChecksPass && consoleErrors.length === 0) {
      console.log('\n✅ デプロイは正常に完了しています！');
    } else {
      console.log('\n⚠️  デプロイに問題がある可能性があります。');
    }
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message);
  } finally {
    await browser.close();
  }
}

// 実行
checkDeployment().catch(console.error);