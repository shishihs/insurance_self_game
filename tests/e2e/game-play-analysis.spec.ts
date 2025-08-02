/**
 * ゲームプレイ分析E2Eテスト
 * 
 * Playwrightを使用してゲームが正しく動作するかを検証し、
 * 改善点を特定するための包括的なテスト
 */

import { test, expect, Page } from '@playwright/test'

// ローカル開発サーバーでテスト
const BASE_URL = 'http://localhost:5173'

// ゲームの各種セレクタ
const SELECTORS = {
  // ホーム画面
  heroTitle: 'h1',
  gameButton: 'button:has-text("ゲーム"), button:has-text("プレイ")',
  tutorialButton: 'button:has-text("チュートリアル")',
  statisticsButton: 'button:has-text("統計")',
  
  // ゲーム画面
  gameCanvas: 'canvas, #game-container',
  backToHomeButton: '.back-to-home-btn',
  
  // ゲーム内UI要素（Phaser内）
  vitality: 'text=/活力|Vitality|HP/i',
  turn: 'text=/ターン|Turn/i',
  stage: 'text=/ステージ|Stage/i',
  
  // アクセシビリティ
  accessibilityButton: '.accessibility-button',
  languageSwitcher: '.language-switcher-container'
}

test.describe('ゲームプレイ分析', () => {
  test.beforeEach(async ({ page }) => {
    // コンソールログを収集
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('ブラウザエラー:', msg.text())
      }
    })
    
    // ネットワークエラーを監視
    page.on('pageerror', error => {
      console.error('ページエラー:', error.message)
    })
  })

  test('ホーム画面の要素と機能の検証', async ({ page }) => {
    await page.goto(BASE_URL)
    
    // タイトルの確認
    await expect(page).toHaveTitle(/人生充実ゲーム|Life Fulfillment Game/)
    
    // ヒーロータイトルの確認
    const heroTitle = page.locator(SELECTORS.heroTitle)
    await expect(heroTitle).toBeVisible()
    await expect(heroTitle).toContainText(/人生充実ゲーム|Life Fulfillment Game/)
    
    // 各種ボタンの存在確認
    const gameButton = page.locator(SELECTORS.gameButton).first()
    const tutorialButton = page.locator(SELECTORS.tutorialButton).first()
    const statisticsButton = page.locator(SELECTORS.statisticsButton).first()
    
    await expect(gameButton).toBeVisible()
    await expect(tutorialButton).toBeVisible()
    await expect(statisticsButton).toBeVisible()
    
    // アクセシビリティボタンの確認
    const accessibilityButton = page.locator(SELECTORS.accessibilityButton)
    await expect(accessibilityButton).toBeVisible()
    
    // 言語切り替えの確認
    const languageSwitcher = page.locator(SELECTORS.languageSwitcher)
    await expect(languageSwitcher).toBeVisible()
    
    // スクリーンショットを撮影
    await page.screenshot({ path: 'test-results/home-screen.png', fullPage: true })
  })

  test('ゲーム開始とローディングプロセス', async ({ page }) => {
    await page.goto(BASE_URL)
    
    // ゲームボタンをクリック
    const gameButton = page.locator(SELECTORS.gameButton).first()
    await gameButton.click()
    
    // ローディング表示の確認
    const loadingIndicator = page.locator('.loading-container, .loading-spinner')
    await expect(loadingIndicator).toBeVisible()
    
    // ゲームキャンバスの表示を待つ（最大15秒）
    const gameCanvas = page.locator(SELECTORS.gameCanvas).first()
    await expect(gameCanvas).toBeVisible({ timeout: 15000 })
    
    // ホームに戻るボタンの確認
    const backButton = page.locator(SELECTORS.backToHomeButton)
    await expect(backButton).toBeVisible()
    
    // ゲーム画面のスクリーンショット
    await page.waitForTimeout(3000) // ゲームが完全に読み込まれるまで待つ
    await page.screenshot({ path: 'test-results/game-screen.png', fullPage: true })
  })

  test('ゲーム内インタラクションとUI要素', async ({ page }) => {
    await page.goto(BASE_URL)
    
    // ゲームを開始
    const gameButton = page.locator(SELECTORS.gameButton).first()
    await gameButton.click()
    
    // ゲームが読み込まれるまで待つ
    await page.waitForTimeout(5000)
    
    // キャンバスのサイズと位置を取得
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    
    if (box) {
      console.log(`Canvas size: ${box.width}x${box.height}`)
      console.log(`Canvas position: (${box.x}, ${box.y})`)
      
      // キャンバス内の様々な位置をクリックしてインタラクションをテスト
      const testPoints = [
        { x: box.x + box.width * 0.5, y: box.y + box.height * 0.8 }, // 下部中央（カードエリア）
        { x: box.x + box.width * 0.2, y: box.y + box.height * 0.5 }, // 左中央
        { x: box.x + box.width * 0.8, y: box.y + box.height * 0.5 }, // 右中央
        { x: box.x + box.width * 0.5, y: box.y + box.height * 0.3 }  // 上部中央（チャレンジエリア）
      ]
      
      for (const point of testPoints) {
        await page.mouse.click(point.x, point.y)
        await page.waitForTimeout(1000)
        await page.screenshot({ 
          path: `test-results/interaction-${point.x}-${point.y}.png`, 
          fullPage: false 
        })
      }
      
      // ドラッグ＆ドロップのテスト
      await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.8)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.3, { steps: 10 })
      await page.mouse.up()
      await page.waitForTimeout(1000)
    }
  })

  test('キーボードナビゲーションとアクセシビリティ', async ({ page }) => {
    await page.goto(BASE_URL)
    
    // Tabキーでのナビゲーションテスト
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    await page.keyboard.press('Tab')
    await page.waitForTimeout(500)
    
    // Enterキーでゲーム開始
    await page.keyboard.press('Enter')
    await page.waitForTimeout(3000)
    
    // ゲーム内でのキーボード操作
    const shortcuts = ['D', 'C', 'E', '1', '2', '3', 'M', 'Escape']
    
    for (const key of shortcuts) {
      await page.keyboard.press(key)
      await page.waitForTimeout(500)
      console.log(`Pressed key: ${key}`)
    }
    
    // Alt+Hでホームに戻る
    await page.keyboard.press('Alt+H')
    await page.waitForTimeout(1000)
    
    // ホーム画面に戻ったことを確認
    const heroTitle = page.locator(SELECTORS.heroTitle)
    await expect(heroTitle).toBeVisible()
  })

  test('レスポンシブデザインの検証', async ({ page }) => {
    const viewports = [
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 375, height: 667 },
      { name: 'mobile-landscape', width: 667, height: 375 }
    ]
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(BASE_URL)
      
      // ゲームを開始
      const gameButton = page.locator(SELECTORS.gameButton).first()
      await gameButton.click()
      await page.waitForTimeout(3000)
      
      // スクリーンショットを撮影
      await page.screenshot({ 
        path: `test-results/responsive-${viewport.name}.png`, 
        fullPage: true 
      })
      
      // ホームに戻る
      const backButton = page.locator(SELECTORS.backToHomeButton)
      if (await backButton.isVisible()) {
        await backButton.click()
      }
    }
  })

  test('エラーハンドリングとリカバリー', async ({ page }) => {
    // ネットワークエラーをシミュレート
    await page.route('**/*.js', route => route.abort())
    await page.goto(BASE_URL)
    
    // エラー表示の確認
    const errorContainer = page.locator('.error-container')
    await expect(errorContainer).toBeVisible({ timeout: 10000 })
    
    // エラーメッセージの確認
    const errorMessage = page.locator('.error-message')
    await expect(errorMessage).toBeVisible()
    
    // リロードボタンの存在確認
    const reloadButton = page.locator('button:has-text("再読み込み")')
    await expect(reloadButton).toBeVisible()
  })

  test('パフォーマンス計測', async ({ page }) => {
    // パフォーマンスメトリクスの収集
    await page.goto(BASE_URL)
    
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      }
    })
    
    console.log('パフォーマンスメトリクス:', metrics)
    
    // ゲーム開始時のパフォーマンス
    const startTime = Date.now()
    const gameButton = page.locator(SELECTORS.gameButton).first()
    await gameButton.click()
    
    const gameCanvas = page.locator(SELECTORS.gameCanvas).first()
    await expect(gameCanvas).toBeVisible({ timeout: 15000 })
    
    const loadTime = Date.now() - startTime
    console.log(`ゲーム読み込み時間: ${loadTime}ms`)
    
    // メモリ使用量の確認
    const memoryUsage = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory
      }
      return null
    })
    
    if (memoryUsage) {
      console.log('メモリ使用量:', {
        used: `${(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`
      })
    }
  })
})

// 分析結果をまとめる関数
test.afterAll(async () => {
  console.log('\n=== ゲームプレイ分析結果 ===')
  console.log('テストが完了しました。test-results/フォルダ内のスクリーンショットを確認してください。')
  console.log('改善点の特定については、テスト結果を基にissueを作成します。')
})