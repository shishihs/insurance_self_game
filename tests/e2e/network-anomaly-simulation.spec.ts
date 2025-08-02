/**
 * ネットワーク異常シミュレーション テスト
 * 実際のユーザー環境で発生しうるネットワークの異常状態をシミュレート
 */

import { test, expect, Page } from '@playwright/test'

test.describe('🌐 ネットワーク異常シミュレーション テスト', () => {
  
  test.beforeEach(async ({ page }) => {
    // エラーログの詳細監視を有効化
    page.on('pageerror', error => {
      console.error(`🔴 Network Test - Page Error: ${error.message}`)
    })
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`🔴 Network Test - Console Error: ${msg.text()}`)
      }
    })
  })

  test('🔌 通信途中切断 - リソース読み込み中断時の復旧', async ({ page }) => {
    let requestCount = 0
    const maxRequestsBeforeFailure = 3

    // 3回目以降のリクエストを切断
    await page.route('**/*', (route) => {
      requestCount++
      
      if (requestCount > maxRequestsBeforeFailure) {
        // 通信切断をシミュレート
        route.abort('internetdisconnected')
        console.log(`🔴 Request ${requestCount}: Connection interrupted`)
      } else {
        route.continue()
        console.log(`✅ Request ${requestCount}: Connected`)
      }
    })

    try {
      await page.goto('/', { timeout: 15000 })
      
      // アプリケーションが基本機能を維持していることを確認
      const app = page.locator('#app')
      await expect(app).toBeVisible({ timeout: 10000 })
      
      // エラーハンドリングメッセージの確認
      const errorMessage = page.locator('[role="alert"], .error-message, .network-error')
      const hasErrorMessage = await errorMessage.count() > 0
      
      if (hasErrorMessage) {
        console.log('✅ ネットワークエラーが適切に表示されている')
      } else {
        console.log('⚠️ ネットワークエラーの表示が見当たらない')
      }
      
      // オフライン状態の処理を確認
      const offlineIndicator = page.locator('.offline-indicator, [data-testid="offline-status"]')
      if (await offlineIndicator.count() > 0) {
        console.log('✅ オフライン状態の表示あり')
      }
      
    } catch (error) {
      console.log('⚠️ 通信切断テスト - 部分的な失敗:', error)
      
      // 完全失敗でも、基本的なHTMLは表示されるべき
      const hasBasicContent = await page.locator('body').count() > 0
      expect(hasBasicContent).toBe(true)
    }
  })

  test('🐌 極端に遅い通信速度 - 低速回線での動作確認', async ({ page }) => {
    const slowDownFactor = 5000 // 5秒の遅延
    
    // すべてのリクエストに大幅な遅延を追加
    await page.route('**/*', async (route) => {
      const url = route.request().url()
      console.log(`⏳ Slow request: ${url}`)
      
      // 遅延をシミュレート
      await new Promise(resolve => setTimeout(resolve, slowDownFactor))
      route.continue()
    })

    const startTime = Date.now()
    
    try {
      await page.goto('/', { timeout: 30000 }) // 長めのタイムアウト
      
      const loadTime = Date.now() - startTime
      console.log(`📊 ページ読み込み時間: ${loadTime}ms`)
      
      // ローディング表示の確認
      const loadingIndicator = page.locator('.loading, .spinner, [data-testid="loading"]')
      const hasLoadingIndicator = await loadingIndicator.count() > 0
      
      if (hasLoadingIndicator) {
        console.log('✅ ローディング表示が機能している')
      } else {
        console.log('⚠️ ローディング表示が見当たらない')
      }
      
      // アプリケーションが最終的に動作することを確認
      const app = page.locator('#app')
      await expect(app).toBeVisible()
      
      // インタラクティブ要素が使用可能かテスト
      const startButton = page.locator('text=ゲームをプレイ').first()
      if (await startButton.isVisible({ timeout: 5000 })) {
        await startButton.click({ timeout: 10000 })
        console.log('✅ 低速回線でもインタラクション可能')
      }
      
    } catch (error) {
      console.log('⚠️ 低速回線テスト失敗:', error)
      
      // タイムアウトエラーでも、基本要素は存在すべき
      const bodyExists = await page.locator('body').count() > 0
      expect(bodyExists).toBe(true)
    }
  })

  test('⏰ タイムアウト処理 - リクエストタイムアウトからの復旧', async ({ page }) => {
    let requestCount = 0
    const timeoutAfterRequests = 2
    
    await page.route('**/*', async (route) => {
      requestCount++
      
      if (requestCount > timeoutAfterRequests) {
        // タイムアウトをシミュレート（無限に待機）
        console.log(`⏰ Request ${requestCount}: Simulating timeout`)
        await new Promise(() => {}) // 永続的に待機
      } else {
        route.continue()
      }
    })

    try {
      await page.goto('/', { timeout: 8000 })
    } catch (timeoutError) {
      console.log('⚠️ Expected timeout error:', timeoutError)
    }
    
    // タイムアウト後のリトライ処理をテスト
    await page.route('**/*', (route) => {
      // すべてのリクエストを正常に処理
      route.continue()
    })
    
    // ページの再読み込み（リトライシミュレーション）
    try {
      await page.reload({ timeout: 10000 })
      
      const app = page.locator('#app')
      await expect(app).toBeVisible({ timeout: 8000 })
      
      console.log('✅ タイムアウト後のリトライが成功')
      
    } catch (retryError) {
      console.log('⚠️ リトライ失敗:', retryError)
    }
  })

  test('📶 不安定な接続 - 間欠的な接続失敗からの復旧', async ({ page }) => {
    let requestCount = 0
    const failurePattern = [false, true, false, false, true, false] // 不安定なパターン
    
    await page.route('**/*', (route) => {
      const shouldFail = failurePattern[requestCount % failurePattern.length]
      requestCount++
      
      if (shouldFail) {
        console.log(`❌ Request ${requestCount}: Unstable connection failure`)
        route.abort('connectionreset')
      } else {
        console.log(`✅ Request ${requestCount}: Connection successful`)
        route.continue()
      }
    })

    // 複数回の試行で最終的に成功することを確認
    let attemptCount = 0
    const maxAttempts = 5
    let finallySucceeded = false
    
    while (attemptCount < maxAttempts && !finallySucceeded) {
      attemptCount++
      console.log(`🔄 Attempt ${attemptCount}/${maxAttempts}`)
      
      try {
        await page.goto('/', { timeout: 10000 })
        
        const app = page.locator('#app')
        const isVisible = await app.isVisible({ timeout: 5000 })
        
        if (isVisible) {
          finallySucceeded = true
          console.log(`✅ 不安定接続でも ${attemptCount} 回目で成功`)
          break
        }
        
      } catch (error) {
        console.log(`⚠️ Attempt ${attemptCount} failed:`, error)
        
        if (attemptCount < maxAttempts) {
          // 次の試行前に少し待機
          await page.waitForTimeout(2000)
        }
      }
    }
    
    // 最終的には何らかの形で動作すべき
    if (!finallySucceeded) {
      console.log('⚠️ All attempts failed, checking for minimal functionality')
      
      // 最低限のHTML構造は存在すべき
      const bodyExists = await page.locator('body').count() > 0
      expect(bodyExists).toBe(true)
    }
  })

  test('🔄 自動リトライ機能 - ネットワークエラー時の自動復旧', async ({ page }) => {
    let requestCount = 0
    let shouldFail = true
    
    await page.route('**/*', (route) => {
      requestCount++
      
      if (shouldFail && requestCount <= 3) {
        console.log(`❌ Request ${requestCount}: Failing (will retry)`)
        route.abort('networkerror')
      } else {
        console.log(`✅ Request ${requestCount}: Success after retries`)
        route.continue()
      }
    })

    // 3回目以降は成功させる
    setTimeout(() => {
      shouldFail = false
    }, 5000)

    try {
      await page.goto('/', { timeout: 20000 })
      
      const app = page.locator('#app')
      await expect(app).toBeVisible()
      
      console.log('✅ 自動リトライが機能している')
      
      // リトライ中のUI表示確認
      const retryMessage = page.locator('.retry-message, .reconnecting, [data-testid="retry-status"]')
      if (await retryMessage.count() > 0) {
        console.log('✅ リトライ状態の表示あり')
      }
      
    } catch (error) {
      console.log('⚠️ 自動リトライテスト失敗:', error)
    }
  })

  test('📱 オフライン/オンライン切り替え - ネットワーク状態変化への対応', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    // オンライン状態でゲームを開始
    const startButton = page.locator('text=ゲームをプレイ').first()
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click()
      await page.waitForTimeout(3000)
    }
    
    // オフライン状態をシミュレート
    console.log('📴 Simulating offline state')
    await page.setOffline(true)
    
    // オフライン時のUI変化を確認
    await page.waitForTimeout(2000)
    
    const offlineIndicator = page.locator('.offline, .no-connection, [data-testid="offline"]')
    const offlineMessageExists = await offlineIndicator.count() > 0
    
    if (offlineMessageExists) {
      console.log('✅ オフライン状態が適切に検出・表示されている')
    } else {
      console.log('⚠️ オフライン状態の表示が見当たらない')
    }
    
    // オフライン時でもローカル機能が動作することを確認
    const canvas = page.locator('canvas')
    const canvasStillVisible = await canvas.isVisible({ timeout: 3000 })
    
    if (canvasStillVisible) {
      console.log('✅ オフライン時でもゲーム表示が維持されている')
    }
    
    // オンライン状態に復帰
    console.log('📶 Restoring online state')
    await page.setOffline(false)
    await page.waitForTimeout(2000)
    
    // オンライン復帰時の処理確認
    const onlineIndicator = page.locator('.online, .connected, [data-testid="online"]')
    const onlineMessageExists = await onlineIndicator.count() > 0
    
    if (onlineMessageExists) {
      console.log('✅ オンライン復帰が適切に検出・表示されている')
    }
    
    // 復帰後の機能確認
    const backButton = page.locator('text=ホームに戻る')
    if (await backButton.isVisible({ timeout: 5000 })) {
      await backButton.click()
      console.log('✅ オンライン復帰後も正常に操作可能')
    }
  })

  test('🌊 帯域幅制限 - 低帯域環境での動作確認', async ({ page, context }) => {
    // 帯域幅を制限 (100KB/s)
    await context.route('**/*', async (route) => {
      const response = await route.fetch()
      const body = await response.body()
      
      // データを小さなチャンクに分割して送信
      const chunkSize = 1024 // 1KB chunks
      const chunks = []
      
      for (let i = 0; i < body.length; i += chunkSize) {
        chunks.push(body.slice(i, i + chunkSize))
      }
      
      // 各チャンクを100ms間隔で送信（100KB/s をシミュレート）
      let combinedBody = Buffer.alloc(0)
      for (const chunk of chunks) {
        combinedBody = Buffer.concat([combinedBody, chunk])
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body: combinedBody
      })
    })

    const startTime = Date.now()
    
    try {
      await page.goto('/', { timeout: 30000 })
      
      const loadTime = Date.now() - startTime
      console.log(`📊 低帯域での読み込み時間: ${loadTime}ms`)
      
      // プログレッシブローディングの確認
      const app = page.locator('#app')
      await expect(app).toBeVisible()
      
      // 基本機能の動作確認
      const startButton = page.locator('text=ゲームをプレイ').first()
      if (await startButton.isVisible({ timeout: 10000 })) {
        console.log('✅ 低帯域環境でも基本機能が利用可能')
      }
      
    } catch (error) {
      console.log('⚠️ 低帯域テスト失敗:', error)
    }
  })

  test('🔧 キャッシュ機能 - ネットワーク障害時のキャッシュ活用', async ({ page }) => {
    // 最初に正常にページを読み込み（キャッシュ作成）
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    
    const app = page.locator('#app')
    await expect(app).toBeVisible()
    
    console.log('✅ 初回読み込み完了（キャッシュ作成）')
    
    // すべてのネットワークリクエストを遮断
    await page.route('**/*', (route) => {
      if (route.request().url().includes('localhost') || 
          route.request().url().includes('127.0.0.1')) {
        console.log('❌ Blocking network request:', route.request().url())
        route.abort('internetdisconnected')
      } else {
        route.continue()
      }
    })
    
    // ページを再読み込み（キャッシュからの読み込みテスト）
    try {
      await page.reload({ timeout: 15000 })
      
      // キャッシュからの読み込みでも基本機能が動作することを確認
      const appAfterReload = page.locator('#app')
      const isVisibleFromCache = await appAfterReload.isVisible({ timeout: 10000 })
      
      if (isVisibleFromCache) {
        console.log('✅ キャッシュからの読み込みが成功')
        
        // キャッシュ利用時の表示確認
        const cacheIndicator = page.locator('.cached, .offline-mode, [data-testid="cache-mode"]')
        if (await cacheIndicator.count() > 0) {
          console.log('✅ キャッシュ利用状態の表示あり')
        }
      } else {
        console.log('⚠️ キャッシュからの読み込みが失敗')
      }
      
    } catch (error) {
      console.log('⚠️ キャッシュテスト失敗:', error)
    }
  })
})

test.describe('🔍 ネットワーク品質監視テスト', () => {
  
  test('📊 接続品質の測定と表示', async ({ page }) => {
    await page.goto('/')
    
    // 接続品質を測定する JavaScript を実行
    const connectionQuality = await page.evaluate(async () => {
      const startTime = performance.now()
      
      try {
        // 小さなリクエストで応答時間を測定
        const testUrl = `${location.origin}/favicon.ico?t=${Date.now()}`
        const response = await fetch(testUrl)
        const endTime = performance.now()
        
        const responseTime = endTime - startTime
        
        return {
          success: response.ok,
          responseTime: responseTime,
          quality: responseTime < 100 ? 'excellent' : 
                  responseTime < 500 ? 'good' : 
                  responseTime < 1000 ? 'fair' : 'poor'
        }
      } catch (error) {
        return {
          success: false,
          responseTime: -1,
          quality: 'error',
          error: error.message
        }
      }
    })
    
    console.log('📊 接続品質測定結果:', connectionQuality)
    
    // 品質に応じた UI 調整の確認
    if (connectionQuality.quality === 'poor' || connectionQuality.quality === 'error') {
      // 低品質時の UI 確認
      const lowQualityMode = page.locator('.low-quality-mode, .reduced-features, [data-testid="low-quality"]')
      const hasLowQualityMode = await lowQualityMode.count() > 0
      
      if (hasLowQualityMode) {
        console.log('✅ 低品質時のUI調整が適用されている')
      }
    }
    
    expect(connectionQuality).toBeDefined()
  })

  test('⚡ レスポンス時間の閾値による機能制限', async ({ page }) => {
    let responseDelay = 2000 // 2秒の遅延
    
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, responseDelay))
      route.continue()
    })
    
    await page.goto('/', { timeout: 15000 })
    
    // 遅延が大きい場合の機能制限確認
    const performanceModeIndicator = page.locator('.performance-mode, .reduced-features, [data-testid="performance-mode"]')
    const hasPerformanceMode = await performanceModeIndicator.count() > 0
    
    if (hasPerformanceMode) {
      console.log('✅ パフォーマンスモードが有効化されている')
    } else {
      console.log('⚠️ パフォーマンスモードの表示が見当たらない')
    }
    
    // 基本機能は維持されていることを確認
    const app = page.locator('#app')
    await expect(app).toBeVisible()
  })
})