import { chromium } from 'playwright';

async function checkDeploymentDetailed() {
  console.log('🔍 詳細なデプロイ確認を開始します...');
  
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
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });
    
    // ネットワークエラーを監視
    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        failure: request.failure()
      });
    });
    
    console.log('📍 サイトにアクセス中...');
    const response = await page.goto('https://shishihs.github.io/insurance_self_game/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    console.log(`  HTTPステータス: ${response.status()}`);
    
    // ページのHTMLを確認
    const html = await page.content();
    console.log(`  HTMLサイズ: ${html.length} bytes`);
    
    // 重要な要素の存在確認
    const elements = {
      'app要素': await page.locator('#app').count(),
      'canvas要素': await page.locator('canvas').count(),
      'script要素': await page.locator('script').count(),
    };
    
    console.log('\n📋 要素の確認:');
    for (const [name, count] of Object.entries(elements)) {
      console.log(`  ${name}: ${count}個`);
    }
    
    // スクリプトのソースを確認
    const scripts = await page.locator('script[src]').evaluateAll(
      elements => elements.map(el => el.src)
    );
    
    if (scripts.length > 0) {
      console.log('\n📜 読み込まれているスクリプト:');
      scripts.forEach(src => console.log(`  - ${src}`));
    }
    
    // 10秒待機してゲームの読み込みを待つ
    console.log('\n⏳ ゲーム読み込み待機中...');
    await page.waitForTimeout(10000);
    
    // 再度canvasを確認
    const canvasAfterWait = await page.locator('canvas').count();
    console.log(`\n🎮 待機後のcanvas要素: ${canvasAfterWait}個`);
    
    // ゲームオブジェクトの確認
    const gameInfo = await page.evaluate(() => {
      const info = {
        hasWindow: typeof window !== 'undefined',
        hasPhaser: typeof window.Phaser !== 'undefined',
        hasGame: typeof window.game !== 'undefined',
        documentReady: document.readyState,
        bodyChildren: document.body.children.length,
        appContent: document.getElementById('app')?.innerHTML.substring(0, 100)
      };
      
      if (window.game) {
        info.gameBooted = window.game.isBooted;
        info.gameRunning = window.game.isRunning;
      }
      
      return info;
    });
    
    console.log('\n🔍 詳細情報:');
    console.log(JSON.stringify(gameInfo, null, 2));
    
    // コンソールログの表示
    if (consoleLogs.length > 0) {
      console.log('\n📝 コンソールログ:');
      consoleLogs.slice(-10).forEach(log => {
        console.log(`  [${log.type}] ${log.text}`);
      });
    }
    
    // ネットワークエラーの表示
    if (networkErrors.length > 0) {
      console.log('\n❌ ネットワークエラー:');
      networkErrors.forEach(error => {
        console.log(`  ${error.url}: ${error.failure.errorText}`);
      });
    }
    
    // スクリーンショット
    await page.screenshot({ 
      path: 'screenshots/deployment-detailed-screenshot.png',
      fullPage: true 
    });
    console.log('\n📸 詳細スクリーンショットを保存しました');
    
  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
  } finally {
    await browser.close();
  }
}

checkDeploymentDetailed().catch(console.error);