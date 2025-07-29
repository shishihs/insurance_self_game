import { test, expect } from '@playwright/test';

/**
 * パフォーマンステストスイート
 * 
 * アプリケーションのパフォーマンスを測定し、
 * パフォーマンス低下を検出する
 */

test.describe('Performance Tests', () => {
  // パフォーマンス測定用の設定
  test.use({
    // ビデオ録画を有効化してパフォーマンス分析
    video: 'on',
    trace: 'on',
    // ネットワーク速度のシミュレーション
    launchOptions: {
      args: ['--enable-gpu-benchmarking']
    }
  });

  test.describe('Page Load Performance', () => {
    test('ホーム画面の読み込みパフォーマンス', async ({ page }) => {
      // パフォーマンスメトリクスを収集
      const metrics = [];
      
      page.on('load', async () => {
        const performanceData = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const paint = performance.getEntriesByType('paint');
          
          return {
            // Navigation Timing
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            domInteractive: navigation.domInteractive - navigation.fetchStart,
            
            // Paint Timing
            firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
            firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
            
            // Resource Timing
            resources: performance.getEntriesByType('resource').map(r => ({
              name: r.name,
              duration: r.duration,
              size: (r as any).transferSize || 0
            }))
          };
        });
        
        metrics.push(performanceData);
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // メトリクスの検証
      const perf = metrics[0];
      expect(perf.firstContentfulPaint).toBeLessThan(1500); // FCP < 1.5秒
      expect(perf.domInteractive).toBeLessThan(2000); // DOM Interactive < 2秒
      expect(perf.loadComplete).toBeLessThan(3000); // 完全読み込み < 3秒
      
      // リソースサイズの検証
      const totalResourceSize = perf.resources.reduce((sum, r) => sum + r.size, 0);
      expect(totalResourceSize).toBeLessThan(2 * 1024 * 1024); // 総リソース < 2MB
      
      console.log('Page Load Metrics:', perf);
    });

    test('ゲーム画面の読み込みパフォーマンス', async ({ page }) => {
      await page.goto('/');
      
      // ゲーム開始時のパフォーマンス測定
      const gameLoadMetrics = await page.evaluate(async () => {
        const startTime = performance.now();
        
        // ゲーム開始ボタンをクリック
        const startButton = document.querySelector('button') as HTMLButtonElement;
        startButton?.click();
        
        // ゲーム画面の表示を待つ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const endTime = performance.now();
        
        return {
          gameInitTime: endTime - startTime,
          memoryUsage: (performance as any).memory ? {
            usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
            jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
          } : null
        };
      });
      
      expect(gameLoadMetrics.gameInitTime).toBeLessThan(1000); // ゲーム初期化 < 1秒
      
      if (gameLoadMetrics.memoryUsage) {
        const heapUsagePercent = (gameLoadMetrics.memoryUsage.usedJSHeapSize / gameLoadMetrics.memoryUsage.jsHeapSizeLimit) * 100;
        expect(heapUsagePercent).toBeLessThan(50); // ヒープ使用率 < 50%
      }
    });
  });

  test.describe('Runtime Performance', () => {
    test('ゲームプレイ中のFPS測定', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000);
      
      // FPS測定スクリプトを注入
      const fpsData = await page.evaluate(async () => {
        let frameCount = 0;
        let lastTime = performance.now();
        const fpsValues: number[] = [];
        
        return new Promise<{
          averageFPS: number;
          minFPS: number;
          maxFPS: number;
          droppedFrames: number;
        }>((resolve) => {
          const measureFPS = () => {
            const currentTime = performance.now();
            const deltaTime = currentTime - lastTime;
            
            if (deltaTime >= 1000) {
              const fps = (frameCount * 1000) / deltaTime;
              fpsValues.push(fps);
              frameCount = 0;
              lastTime = currentTime;
              
              if (fpsValues.length >= 10) {
                // 10秒間測定
                const averageFPS = fpsValues.reduce((a, b) => a + b) / fpsValues.length;
                const minFPS = Math.min(...fpsValues);
                const maxFPS = Math.max(...fpsValues);
                const droppedFrames = fpsValues.filter(fps => fps < 30).length;
                
                resolve({
                  averageFPS,
                  minFPS,
                  maxFPS,
                  droppedFrames
                });
                return;
              }
            }
            
            frameCount++;
            requestAnimationFrame(measureFPS);
          };
          
          requestAnimationFrame(measureFPS);
        });
      });
      
      expect(fpsData.averageFPS).toBeGreaterThan(30); // 平均FPS > 30
      expect(fpsData.minFPS).toBeGreaterThan(20); // 最小FPS > 20
      expect(fpsData.droppedFrames).toBeLessThan(2); // フレームドロップ < 2回
      
      console.log('FPS Metrics:', fpsData);
    });

    test('メモリリーク検出', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      
      // 初期メモリ使用量
      const initialMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // 100回のゲーム操作を実行
      for (let i = 0; i < 100; i++) {
        await page.evaluate(() => {
          // ゲーム操作をシミュレート
          const cards = document.querySelectorAll('.card, [data-testid="game-card"]');
          const randomCard = cards[Math.floor(Math.random() * cards.length)] as HTMLElement;
          randomCard?.click();
        });
        await page.waitForTimeout(100);
      }
      
      // ガベージコレクションを強制実行
      await page.evaluate(() => {
        if ((window as any).gc) {
          (window as any).gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      // 最終メモリ使用量
      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      
      // メモリ増加量をチェック
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePercent = (memoryIncrease / initialMemory) * 100;
      
      expect(memoryIncreasePercent).toBeLessThan(50); // メモリ増加 < 50%
      
      console.log('Memory Leak Test:', {
        initial: initialMemory,
        final: finalMemory,
        increase: memoryIncrease,
        increasePercent: memoryIncreasePercent
      });
    });

    test('大量データ処理のパフォーマンス', async ({ page }) => {
      await page.goto('/');
      
      // 大量データ処理のシミュレーション
      const processingMetrics = await page.evaluate(async () => {
        const startTime = performance.now();
        
        // 1000個のゲームオブジェクトを生成
        const gameObjects = Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          data: new Array(100).fill(0).map(() => Math.random())
        }));
        
        // ソート処理
        const sortStart = performance.now();
        gameObjects.sort((a, b) => a.x - b.x);
        const sortTime = performance.now() - sortStart;
        
        // フィルタ処理
        const filterStart = performance.now();
        const filtered = gameObjects.filter(obj => obj.x > 500 && obj.y > 500);
        const filterTime = performance.now() - filterStart;
        
        // 集計処理
        const aggregateStart = performance.now();
        const sum = gameObjects.reduce((acc, obj) => 
          acc + obj.data.reduce((a, b) => a + b, 0), 0
        );
        const aggregateTime = performance.now() - aggregateStart;
        
        const totalTime = performance.now() - startTime;
        
        return {
          totalTime,
          sortTime,
          filterTime,
          aggregateTime,
          objectCount: gameObjects.length,
          filteredCount: filtered.length
        };
      });
      
      expect(processingMetrics.totalTime).toBeLessThan(100); // 総処理時間 < 100ms
      expect(processingMetrics.sortTime).toBeLessThan(20); // ソート時間 < 20ms
      expect(processingMetrics.filterTime).toBeLessThan(10); // フィルタ時間 < 10ms
      
      console.log('Data Processing Metrics:', processingMetrics);
    });
  });

  test.describe('Network Performance', () => {
    test('API レスポンスタイム測定', async ({ page }) => {
      const apiCalls: any[] = [];
      
      // APIコールを監視
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
            startTime: Date.now()
          });
        }
      });
      
      page.on('response', response => {
        const request = apiCalls.find(call => call.url === response.url());
        if (request) {
          request.endTime = Date.now();
          request.duration = request.endTime - request.startTime;
          request.status = response.status();
          request.size = response.headers()['content-length'] || 0;
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // APIコールのパフォーマンス検証
      apiCalls.forEach(call => {
        expect(call.duration).toBeLessThan(1000); // API応答 < 1秒
        expect(call.status).toBe(200); // 正常なレスポンス
      });
      
      console.log('API Performance:', apiCalls);
    });

    test('リソース最適化の検証', async ({ page }) => {
      const resources: any[] = [];
      
      page.on('response', async response => {
        const url = response.url();
        const headers = response.headers();
        
        resources.push({
          url,
          status: response.status(),
          contentType: headers['content-type'],
          contentLength: parseInt(headers['content-length'] || '0'),
          cacheControl: headers['cache-control'],
          contentEncoding: headers['content-encoding']
        });
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 画像の最適化チェック
      const images = resources.filter(r => r.contentType?.includes('image'));
      images.forEach(img => {
        expect(img.contentLength).toBeLessThan(500 * 1024); // 画像 < 500KB
        expect(img.cacheControl).toBeTruthy(); // キャッシュ設定あり
      });
      
      // JavaScriptの最適化チェック
      const scripts = resources.filter(r => r.contentType?.includes('javascript'));
      scripts.forEach(script => {
        expect(script.contentEncoding).toBe('gzip'); // gzip圧縮
        expect(script.cacheControl).toBeTruthy(); // キャッシュ設定あり
      });
      
      // CSSの最適化チェック
      const styles = resources.filter(r => r.contentType?.includes('css'));
      styles.forEach(style => {
        expect(style.contentEncoding).toBe('gzip'); // gzip圧縮
        expect(style.contentLength).toBeLessThan(100 * 1024); // CSS < 100KB
      });
      
      console.log('Resource Optimization:', {
        totalResources: resources.length,
        images: images.length,
        scripts: scripts.length,
        styles: styles.length
      });
    });
  });

  test.describe('User Interaction Performance', () => {
    test('クリック応答性の測定', async ({ page }) => {
      await page.goto('/');
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      await page.waitForTimeout(1000);
      
      // クリックレスポンスタイムを測定
      const clickMetrics = await page.evaluate(async () => {
        const results: number[] = [];
        
        for (let i = 0; i < 10; i++) {
          const startTime = performance.now();
          
          // カードをクリック
          const card = document.querySelector('.card, [data-testid="game-card"]') as HTMLElement;
          card?.click();
          
          // DOMの更新を待つ
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          const endTime = performance.now();
          results.push(endTime - startTime);
          
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return {
          average: results.reduce((a, b) => a + b) / results.length,
          min: Math.min(...results),
          max: Math.max(...results),
          measurements: results
        };
      });
      
      expect(clickMetrics.average).toBeLessThan(50); // 平均応答時間 < 50ms
      expect(clickMetrics.max).toBeLessThan(100); // 最大応答時間 < 100ms
      
      console.log('Click Response Metrics:', clickMetrics);
    });

    test('スクロールパフォーマンス', async ({ page }) => {
      await page.goto('/');
      await page.setViewportSize({ width: 1280, height: 720 });
      
      // スクロールパフォーマンスを測定
      const scrollMetrics = await page.evaluate(async () => {
        let scrollEvents = 0;
        let jankEvents = 0;
        let lastScrollTime = 0;
        
        const scrollHandler = () => {
          const currentTime = performance.now();
          if (lastScrollTime > 0) {
            const delta = currentTime - lastScrollTime;
            if (delta > 16.67) { // 60FPSの閾値
              jankEvents++;
            }
          }
          lastScrollTime = currentTime;
          scrollEvents++;
        };
        
        window.addEventListener('scroll', scrollHandler, { passive: true });
        
        // スクロールをシミュレート
        for (let i = 0; i < 100; i++) {
          window.scrollBy(0, 10);
          await new Promise(resolve => requestAnimationFrame(resolve));
        }
        
        window.removeEventListener('scroll', scrollHandler);
        
        return {
          totalEvents: scrollEvents,
          jankEvents,
          jankRate: (jankEvents / scrollEvents) * 100
        };
      });
      
      expect(scrollMetrics.jankRate).toBeLessThan(10); // ジャンク率 < 10%
      
      console.log('Scroll Performance:', scrollMetrics);
    });

    test('アニメーションパフォーマンス', async ({ page }) => {
      await page.goto('/');
      
      // CSSアニメーションのパフォーマンスを測定
      const animationMetrics = await page.evaluate(async () => {
        // アニメーション要素を作成
        const element = document.createElement('div');
        element.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100px;
          height: 100px;
          background: red;
          transition: transform 1s;
        `;
        document.body.appendChild(element);
        
        const measurements: number[] = [];
        let frameCount = 0;
        let startTime = performance.now();
        
        return new Promise<any>((resolve) => {
          const measureAnimation = () => {
            const currentTime = performance.now();
            frameCount++;
            
            if (currentTime - startTime >= 1000) {
              measurements.push(frameCount);
              frameCount = 0;
              startTime = currentTime;
              
              if (measurements.length >= 3) {
                element.remove();
                
                const avgFPS = measurements.reduce((a, b) => a + b) / measurements.length;
                resolve({
                  averageFPS: avgFPS,
                  measurements,
                  smooth: avgFPS >= 55 // 55+ FPSをスムーズと判定
                });
                return;
              }
            }
            
            // アニメーション実行
            element.style.transform = `translateX(${Math.sin(currentTime / 1000) * 100}px)`;
            requestAnimationFrame(measureAnimation);
          };
          
          requestAnimationFrame(measureAnimation);
        });
      });
      
      expect(animationMetrics.smooth).toBe(true); // スムーズなアニメーション
      expect(animationMetrics.averageFPS).toBeGreaterThan(55); // 55+ FPS
      
      console.log('Animation Performance:', animationMetrics);
    });
  });

  test.describe('Bundle Size Analysis', () => {
    test('JavaScriptバンドルサイズの検証', async ({ page }) => {
      const jsFiles: any[] = [];
      
      page.on('response', async response => {
        if (response.url().endsWith('.js')) {
          const headers = response.headers();
          jsFiles.push({
            url: response.url(),
            size: parseInt(headers['content-length'] || '0'),
            compressed: headers['content-encoding'] === 'gzip'
          });
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // 総バンドルサイズを計算
      const totalSize = jsFiles.reduce((sum, file) => sum + file.size, 0);
      const totalSizeMB = totalSize / (1024 * 1024);
      
      expect(totalSizeMB).toBeLessThan(1); // 総JS < 1MB
      
      // 個別ファイルサイズをチェック
      jsFiles.forEach(file => {
        const fileSizeKB = file.size / 1024;
        expect(fileSizeKB).toBeLessThan(300); // 各ファイル < 300KB
        expect(file.compressed).toBe(true); // gzip圧縮されている
      });
      
      console.log('Bundle Size Analysis:', {
        totalFiles: jsFiles.length,
        totalSizeMB: totalSizeMB.toFixed(2),
        files: jsFiles.map(f => ({
          name: f.url.split('/').pop(),
          sizeKB: (f.size / 1024).toFixed(2),
          compressed: f.compressed
        }))
      });
    });
  });

  test.describe('Mobile Performance', () => {
    test('モバイルデバイスでのパフォーマンス', async ({ browser }) => {
      // モバイルデバイスをエミュレート
      const context = await browser.newContext({
        ...devices['iPhone 12'],
        // CPU速度を制限
        cpuThrottlingRate: 4
      });
      
      const page = await context.newPage();
      
      // ネットワーク速度を制限（3G相当）
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 遅延を追加
        await route.continue();
      });
      
      const startTime = Date.now();
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // モバイル読み込み < 5秒
      
      // モバイルでのインタラクションパフォーマンス
      await page.click('text=ゲームを開始, text=Start Game, button:has-text("Play")');
      
      const interactionMetrics = await page.evaluate(async () => {
        const touchStart = performance.now();
        
        // タッチイベントをシミュレート
        const element = document.querySelector('.card, button') as HTMLElement;
        element?.dispatchEvent(new TouchEvent('touchstart'));
        element?.dispatchEvent(new TouchEvent('touchend'));
        
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        const touchEnd = performance.now();
        
        return {
          touchResponseTime: touchEnd - touchStart
        };
      });
      
      expect(interactionMetrics.touchResponseTime).toBeLessThan(100); // タッチ応答 < 100ms
      
      await context.close();
      
      console.log('Mobile Performance:', {
        loadTime,
        touchResponse: interactionMetrics.touchResponseTime
      });
    });
  });
});

// Playwright設定用のdevices import
const { devices } = require('@playwright/test');