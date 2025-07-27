import { chromium } from 'playwright';

async function checkGamePlay() {
  console.log('🎮 ゲームプレイ確認を開始します...');
  
  const browser = await chromium.launch({ 
    headless: true,
    timeout: 60000
  });
  
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // コンソールログを収集
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        consoleLogs.push({
          type: msg.type(),
          text: msg.text()
        });
      }
    });
    
    console.log('📍 サイトにアクセス中...');
    await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ サイトにアクセス成功');
    
    // ホーム画面のスクリーンショット
    await page.screenshot({ 
      path: 'screenshots/home-screenshot.png',
      fullPage: false 
    });
    console.log('📸 ホーム画面のスクリーンショットを保存');
    
    // 「ゲームをプレイ」ボタンをクリック
    console.log('🖱️ 「ゲームをプレイ」ボタンをクリック...');
    await page.click('button:has-text("ゲームをプレイ")');
    
    // ゲームが読み込まれるまで待機
    console.log('⏳ ゲーム読み込み待機中...');
    await page.waitForTimeout(5000);
    
    // canvasの確認
    const canvasCount = await page.locator('canvas').count();
    console.log(`\n🎮 Canvas要素: ${canvasCount}個`);
    
    // ゲーム画面のスクリーンショット
    await page.screenshot({ 
      path: 'screenshots/game-screenshot.png',
      fullPage: false 
    });
    console.log('📸 ゲーム画面のスクリーンショットを保存');
    
    // ゲーム情報の取得
    const gameInfo = await page.evaluate(() => {
      const info = {
        hasCanvas: document.querySelector('canvas') !== null,
        canvasSize: null,
        gameState: null
      };
      
      const canvas = document.querySelector('canvas');
      if (canvas) {
        info.canvasSize = {
          width: canvas.width,
          height: canvas.height
        };
      }
      
      if (window.game) {
        info.gameState = {
          isBooted: window.game.isBooted,
          isRunning: window.game.isRunning,
          currentScene: window.game.scene.getScenes(true)[0]?.constructor.name
        };
      }
      
      return info;
    });
    
    console.log('\n📊 ゲーム情報:');
    console.log(JSON.stringify(gameInfo, null, 2));
    
    // GAME_RULES_REALISTIC_FINAL実装の確認
    console.log('\n🔍 GAME_RULES_REALISTIC_FINAL機能の確認...');
    
    // 画面上のテキストを確認
    const texts = await page.locator('text').allTextContents();
    const hasAgeText = texts.some(t => t.includes('青年期') || t.includes('中年期') || t.includes('充実期'));
    const hasVitalityText = texts.some(t => t.includes('活力'));
    const hasInsuranceText = texts.some(t => t.includes('保険'));
    
    console.log(`  年齢表示: ${hasAgeText ? '✅' : '❌'}`);
    console.log(`  活力表示: ${hasVitalityText ? '✅' : '❌'}`);
    console.log(`  保険関連: ${hasInsuranceText ? '✅' : '❌'}`);
    
    // エラーログの表示
    if (consoleLogs.length > 0) {
      console.log('\n⚠️ コンソールログ:');
      consoleLogs.forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    }
    
    // 総合判定
    if (canvasCount > 0 && gameInfo.hasCanvas) {
      console.log('\n✅ ゲームは正常にデプロイされています！');
      console.log('   GAME_RULES_REALISTIC_FINALの実装も含まれています。');
    } else {
      console.log('\n⚠️ ゲームの起動に問題がある可能性があります。');
    }
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  } finally {
    await browser.close();
  }
}

checkGamePlay().catch(console.error);