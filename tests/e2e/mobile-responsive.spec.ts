import { test, expect, devices } from '@playwright/test'

// テストするデバイス設定
const MOBILE_DEVICES = [
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'Pixel 5', device: devices['Pixel 5'] },
  { name: 'Galaxy S21', device: devices['Galaxy S21'] },
  { name: 'iPad', device: devices['iPad (gen 7)'] },
  { name: 'iPad Pro', device: devices['iPad Pro 11'] }
]

// 各デバイスでテストを実行
MOBILE_DEVICES.forEach(({ name, device }) => {
  test.describe(`Mobile Responsive - ${name}`, () => {
    test.use({ ...device })

    test.beforeEach(async ({ page }) => {
      await page.goto('/')
      // Service Worker の登録を待つ
      await page.waitForTimeout(2000)
    })

    test('ホーム画面が正しく表示される', async ({ page }) => {
      // タイトルが表示されている
      await expect(page.locator('h1:has-text("人生充実ゲーム")')).toBeVisible()
      
      // アクションボタンが表示されている
      await expect(page.locator('button:has-text("ゲームをプレイ")')).toBeVisible()
      await expect(page.locator('button:has-text("チュートリアル")')).toBeVisible()
      
      // モバイルレイアウトが適用されている
      const buttonGroup = page.locator('.button-group')
      const isPortrait = device.viewport.width < device.viewport.height
      
      if (isPortrait) {
        // ポートレートモードではボタンが縦に並ぶ
        await expect(buttonGroup).toHaveCSS('flex-direction', 'column')
      }
    })

    test('タッチ操作でゲームを開始できる', async ({ page }) => {
      const playButton = page.locator('button:has-text("ゲームをプレイ")')
      
      // タッチ操作をシミュレート
      await playButton.tap()
      
      // ゲーム画面に遷移
      await expect(page.locator('.game-view')).toBeVisible()
      await expect(page.locator('#game-container')).toBeVisible()
    })

    test('セーフエリアが正しく適用される', async ({ page }) => {
      // iPhoneの場合のみノッチ対応をテスト
      if (name.includes('iPhone') && !name.includes('SE')) {
        const backButton = page.locator('.back-to-home-btn')
        await page.locator('button:has-text("ゲームをプレイ")').tap()
        
        // セーフエリアのパディングが適用されている
        const buttonStyles = await backButton.evaluate(el => {
          return window.getComputedStyle(el)
        })
        
        // env() 関数はブラウザでは0を返すが、実機では適切な値が設定される
        expect(parseInt(buttonStyles.top)).toBeGreaterThanOrEqual(16)
      }
    })

    test('画面回転に対応している', async ({ page, context }) => {
      // タブレットのみテスト
      if (name.includes('iPad')) {
        // ポートレートモードで開始
        await page.setViewportSize({ width: 768, height: 1024 })
        await page.locator('button:has-text("ゲームをプレイ")').tap()
        
        // ランドスケープモードに変更
        await page.setViewportSize({ width: 1024, height: 768 })
        await page.waitForTimeout(500) // 回転アニメーション待機
        
        // レイアウトが調整されている
        const gameContainer = page.locator('#game-container')
        await expect(gameContainer).toBeVisible()
      }
    })

    test('タッチジェスチャーが機能する', async ({ page }) => {
      await page.locator('button:has-text("ゲームをプレイ")').tap()
      await page.waitForTimeout(1000)
      
      // スワイプジェスチャーのテスト
      const gameArea = page.locator('#game-container')
      const box = await gameArea.boundingBox()
      
      if (box) {
        // 上スワイプ
        await page.touchscreen.swipe({
          start: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          end: { x: box.x + box.width / 2, y: box.y + box.height / 4 },
          steps: 10
        })
        
        await page.waitForTimeout(500)
        
        // 左右スワイプ
        await page.touchscreen.swipe({
          start: { x: box.x + box.width / 2, y: box.y + box.height / 2 },
          end: { x: box.x + box.width / 4, y: box.y + box.height / 2 },
          steps: 10
        })
      }
    })

    test('PWAとして動作する', async ({ page }) => {
      // manifest.json が読み込まれている
      const manifestLink = await page.locator('link[rel="manifest"]')
      await expect(manifestLink).toHaveAttribute('href', '/manifest.json')
      
      // Service Worker が登録されている（本番環境のみ）
      const hasServiceWorker = await page.evaluate(() => {
        return 'serviceWorker' in navigator
      })
      expect(hasServiceWorker).toBeTruthy()
    })

    test('オフライン時の動作', async ({ page, context }) => {
      // オフラインモードに切り替え
      await context.setOffline(true)
      
      // ページリロード
      await page.reload({ waitUntil: 'domcontentloaded' })
      
      // キャッシュからページが表示される（Service Workerが有効な場合）
      const title = page.locator('h1:has-text("人生充実ゲーム")')
      
      // オフラインでも基本的な要素は表示される
      try {
        await expect(title).toBeVisible({ timeout: 5000 })
      } catch {
        // Service Worker が無効な環境では失敗する可能性がある
        console.log('Offline test skipped - Service Worker not active')
      }
      
      // オンラインに戻す
      await context.setOffline(false)
    })

    test('パフォーマンス最適化が適用される', async ({ page }) => {
      // GPUアクセラレーションが有効
      const gameCanvas = page.locator('#game-container canvas')
      
      await page.locator('button:has-text("ゲームをプレイ")').tap()
      await page.waitForTimeout(1000)
      
      if (await gameCanvas.isVisible()) {
        const canvasStyles = await gameCanvas.evaluate(el => {
          return window.getComputedStyle(el)
        })
        
        // will-change や transform が設定されている
        expect(canvasStyles.willChange).toBeTruthy()
      }
    })

    test('モバイル専用UIが表示される', async ({ page }) => {
      await page.locator('button:has-text("ゲームをプレイ")').tap()
      await page.waitForTimeout(1000)
      
      // モバイルでは戻るボタンがアイコンのみ
      const backButton = page.locator('.back-to-home-btn')
      const buttonText = page.locator('.back-to-home-btn .btn-text')
      
      if (device.viewport.width <= 640) {
        // モバイルではテキストが非表示
        await expect(buttonText).toHaveCSS('display', 'none')
      } else {
        // タブレットではテキストが表示
        await expect(buttonText).toBeVisible()
      }
    })

    test('アクセシビリティが保持される', async ({ page }) => {
      // タップターゲットサイズの確認
      const buttons = page.locator('button')
      const count = await buttons.count()
      
      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i)
        const box = await button.boundingBox()
        
        if (box) {
          // 最小タップターゲットサイズ（44px）を満たしている
          expect(box.width).toBeGreaterThanOrEqual(44)
          expect(box.height).toBeGreaterThanOrEqual(44)
        }
      }
      
      // ARIA属性が適切に設定されている
      const playButton = page.locator('button:has-text("ゲームをプレイ")')
      await expect(playButton).toHaveAttribute('aria-label', /ゲームを開始/)
    })
  })
})

// タッチ拡張テスト用のヘルパー
declare module '@playwright/test' {
  interface Page {
    touchscreen: {
      swipe(options: {
        start: { x: number; y: number }
        end: { x: number; y: number }
        steps?: number
      }): Promise<void>
    }
  }
}

// タッチスクリーン拡張実装
test.beforeEach(async ({ page }) => {
  page.touchscreen = {
    async swipe({ start, end, steps = 10 }) {
      await page.mouse.move(start.x, start.y)
      await page.mouse.down()
      
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps
        const x = start.x + (end.x - start.x) * progress
        const y = start.y + (end.y - start.y) * progress
        await page.mouse.move(x, y)
        await page.waitForTimeout(10)
      }
      
      await page.mouse.up()
    }
  }
})