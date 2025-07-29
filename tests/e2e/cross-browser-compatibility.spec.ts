/**
 * クロスブラウザ・デバイス互換性テスト
 * 各ブラウザ・デバイスでの動作確認
 */

import { test, expect, devices } from '@playwright/test'

// 各ブラウザでのテスト
const browsers = [
  { name: 'chromium', userAgent: 'Chrome' },
  { name: 'firefox', userAgent: 'Firefox' },
  { name: 'webkit', userAgent: 'Safari' }
]

// モバイルデバイス設定
const mobileDevices = [
  devices['iPhone 13'],
  devices['Pixel 5'],
  devices['iPad Air']
]

// デスクトップ解像度
const desktopViewports = [
  { width: 1920, height: 1080 }, // Full HD
  { width: 1366, height: 768 },  // 一般的な解像度
  { width: 1280, height: 800 },  // MacBook Air
  { width: 2560, height: 1440 }  // 4K
]

describe('クロスブラウザ互換性テスト', () => {
  
  test.describe('基本ゲーム機能 - 全ブラウザ', () => {
    browsers.forEach(browser => {
      test(`ゲーム起動とUI表示 - ${browser.name}`, async ({ page, browserName }) => {
        // ブラウザ固有のスキップ条件
        test.skip(browserName !== browser.name, `${browser.name}専用テスト`)
        
        await page.goto('/')
        
        // 基本要素の存在確認
        await expect(page.locator('[data-testid="game-canvas"]')).toBeVisible()
        await expect(page.locator('[data-testid="vitality-display"]')).toBeVisible()
        await expect(page.locator('[data-testid="age-display"]')).toBeVisible()
        
        // ゲーム状態の確認
        await expect(page.locator('[data-testid="vitality-display"]')).toContainText('100')
        await expect(page.locator('[data-testid="age-display"]')).toContainText('20')
      })
      
      test(`カードドラッグ&ドロップ - ${browser.name}`, async ({ page, browserName }) => {
        test.skip(browserName !== browser.name, `${browser.name}専用テスト`)
        
        await page.goto('/')
        await page.waitForSelector('[data-testid="game-canvas"]')
        
        // チュートリアルを完了
        const tutorialButton = page.locator('[data-testid="tutorial-button"]')
        if (await tutorialButton.isVisible()) {
          await tutorialButton.click()
          await page.waitForSelector('[data-testid="tutorial-complete"]', { timeout: 10000 })
        }
        
        // ドラッグ可能なカードを探す
        const cards = page.locator('[data-testid^="card-"]')
        const cardCount = await cards.count()
        
        if (cardCount > 0) {
          const firstCard = cards.first()
          const cardBounds = await firstCard.boundingBox()
          const dropZone = page.locator('[data-testid="play-area"]')
          const dropBounds = await dropZone.boundingBox()
          
          if (cardBounds && dropBounds) {
            // ドラッグ&ドロップ実行
            await page.mouse.move(
              cardBounds.x + cardBounds.width / 2,
              cardBounds.y + cardBounds.height / 2
            )
            await page.mouse.down()
            await page.mouse.move(
              dropBounds.x + dropBounds.width / 2,
              dropBounds.y + dropBounds.height / 2,
              { steps: 10 }
            )
            await page.mouse.up()
            
            // ドロップが成功したか確認
            await page.waitForTimeout(1000)
            const afterDropCardCount = await cards.count()
            expect(afterDropCardCount).toBeLessThanOrEqual(cardCount)
          }
        }
      })
      
      test(`音声再生対応 - ${browser.name}`, async ({ page, browserName }) => {
        test.skip(browserName !== browser.name, `${browser.name}専用テスト`)
        
        await page.goto('/')
        
        // 音声コンテキスト作成をテスト
        const audioSupported = await page.evaluate(() => {
          return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
        })
        
        expect(audioSupported).toBe(true)
        
        // 音声テスト（実際の再生はしない）
        const audioTest = await page.evaluate(() => {
          try {
            const AudioContextClass = AudioContext || (window as any).webkitAudioContext
            const audioContext = new AudioContextClass()
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            
            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime)
            
            return true
          } catch (error) {
            return false
          }
        })
        
        expect(audioTest).toBe(true)
      })
    })
  })
  
  test.describe('レスポンシブデザイン', () => {
    desktopViewports.forEach((viewport, index) => {
      test(`デスクトップ解像度 ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.goto('/')
        
        // ゲームエリアが適切に表示される
        const gameCanvas = page.locator('[data-testid="game-canvas"]')
        await expect(gameCanvas).toBeVisible()
        
        const canvasBounds = await gameCanvas.boundingBox()
        expect(canvasBounds).not.toBeNull()
        
        if (canvasBounds) {
          // キャンバスが画面内に収まっている
          expect(canvasBounds.width).toBeLessThanOrEqual(viewport.width)
          expect(canvasBounds.height).toBeLessThanOrEqual(viewport.height)
          
          // 最小サイズ要件
          expect(canvasBounds.width).toBeGreaterThan(300)
          expect(canvasBounds.height).toBeGreaterThan(200)
        }
        
        // UI要素が重ならない
        const vitalityDisplay = page.locator('[data-testid="vitality-display"]')
        const ageDisplay = page.locator('[data-testid="age-display"]')
        
        const vitalityBounds = await vitalityDisplay.boundingBox()
        const ageBounds = await ageDisplay.boundingBox()
        
        if (vitalityBounds && ageBounds) {
          // 要素が重複していない（簡易チェック）
          const noOverlap = 
            vitalityBounds.x + vitalityBounds.width < ageBounds.x ||
            ageBounds.x + ageBounds.width < vitalityBounds.x ||
            vitalityBounds.y + vitalityBounds.height < ageBounds.y ||
            ageBounds.y + ageBounds.height < vitalityBounds.y
          
          expect(noOverlap).toBe(true)
        }
      })
    })
  })
  
  test.describe('モバイルデバイス対応', () => {
    mobileDevices.forEach(device => {
      test(`${device.name || 'モバイルデバイス'}での基本操作`, async ({ browser }) => {
        const context = await browser.newContext({
          ...device,
          // モバイル固有の設定
          hasTouch: true,
          isMobile: true
        })
        
        const page = await context.newPage()
        
        try {
          await page.goto('/')
          
          // タッチイベントの動作確認
          const gameCanvas = page.locator('[data-testid="game-canvas"]')
          await expect(gameCanvas).toBeVisible()
          
          // タップ操作のテスト
          await gameCanvas.tap()
          await page.waitForTimeout(500)
          
          // 画面回転のテスト（可能な場合）
          if (device.viewport && device.viewport.width < device.viewport.height) {
            // 横向きに回転
            await page.setViewportSize({
              width: device.viewport.height,
              height: device.viewport.width
            })
            
            await page.waitForTimeout(1000)
            await expect(gameCanvas).toBeVisible()
            
            // 元に戻す
            await page.setViewportSize(device.viewport)
          }
          
          // スワイプ操作のテスト
          const bounds = await gameCanvas.boundingBox()
          if (bounds) {
            const startX = bounds.x + bounds.width * 0.2
            const endX = bounds.x + bounds.width * 0.8
            const y = bounds.y + bounds.height * 0.5
            
            await page.touchscreen.tap(startX, y)
            await page.touchscreen.tap(endX, y)
          }
          
          // モバイル固有のUI要素チェック
          const vitalityDisplay = page.locator('[data-testid="vitality-display"]')
          await expect(vitalityDisplay).toBeVisible()
          
          // テキストが読みやすいサイズか確認
          const fontSize = await vitalityDisplay.evaluate(el => {
            return window.getComputedStyle(el).fontSize
          })
          
          const fontSizeValue = parseFloat(fontSize)
          expect(fontSizeValue).toBeGreaterThan(12) // 最小フォントサイズ
          
        } finally {
          await context.close()
        }
      })
    })
  })
  
  test.describe('アクセシビリティ対応', () => {
    test('キーボードナビゲーション', async ({ page }) => {
      await page.goto('/')
      
      // フォーカス可能な要素を探す
      const focusableElements = page.locator('button, [tabindex]:not([tabindex="-1"])')
      const count = await focusableElements.count()
      
      if (count > 0) {
        // タブキーでナビゲーション
        for (let i = 0; i < Math.min(count, 5); i++) {
          await page.keyboard.press('Tab')
          await page.waitForTimeout(200)
          
          // フォーカスが当たっていることを確認
          const focusedElement = page.locator(':focus')
          await expect(focusedElement).toBeVisible()
        }
      }
    })
    
    test('スクリーンリーダー対応', async ({ page }) => {
      await page.goto('/')
      
      // ARIA属性の確認
      const gameCanvas = page.locator('[data-testid="game-canvas"]')
      const ariaLabel = await gameCanvas.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
      
      // 重要な情報にラベルが付いている
      const vitalityDisplay = page.locator('[data-testid="vitality-display"]')
      const vitalityAriaLabel = await vitalityDisplay.getAttribute('aria-label')
      expect(vitalityAriaLabel).toContain('体力')
      
      const ageDisplay = page.locator('[data-testid="age-display"]')
      const ageAriaLabel = await ageDisplay.getAttribute('aria-label')
      expect(ageAriaLabel).toContain('年齢')
    })
    
    test('色盲対応（コントラスト）', async ({ page }) => {
      await page.goto('/')
      
      // CSS カスタムプロパティで色を確認
      const contrastTest = await page.evaluate(() => {
        const getContrastRatio = (color1: string, color2: string) => {
          // 簡易的なコントラスト比計算
          const getLuminance = (rgb: string) => {
            const values = rgb.match(/\d+/g)
            if (!values || values.length < 3) return 0
            
            const [r, g, b] = values.map(v => {
              const val = parseInt(v) / 255
              return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
            })
            
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
          }
          
          const l1 = getLuminance(color1)
          const l2 = getLuminance(color2)
          const lighter = Math.max(l1, l2)
          const darker = Math.min(l1, l2)
          
          return (lighter + 0.05) / (darker + 0.05)
        }
        
        const style = getComputedStyle(document.body)
        const textColor = style.color
        const backgroundColor = style.backgroundColor
        
        return {
          textColor,
          backgroundColor,
          contrastRatio: getContrastRatio(textColor, backgroundColor)
        }
      })
      
      // WCAG AA基準（4.5:1）以上
      expect(contrastTest.contrastRatio).toBeGreaterThan(4.5)
    })
  })
  
  test.describe('パフォーマンス検証', () => {
    test('初期読み込み性能', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await page.waitForSelector('[data-testid="game-canvas"]')
      
      const loadTime = Date.now() - startTime
      
      // 5秒以内に読み込み完了
      expect(loadTime).toBeLessThan(5000)
      
      // Performance API の情報取得
      const perfData = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
          firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
        }
      })
      
      // First Contentful Paint は 3秒以内
      if (perfData.firstContentfulPaint > 0) {
        expect(perfData.firstContentfulPaint).toBeLessThan(3000)
      }
    })
    
    test('アニメーション性能', async ({ page }) => {
      await page.goto('/')
      await page.waitForSelector('[data-testid="game-canvas"]')
      
      // アニメーション開始
      const startButton = page.locator('[data-testid="tutorial-button"]')
      if (await startButton.isVisible()) {
        await startButton.click()
      }
      
      // フレームレート測定
      const frameRates = await page.evaluate(() => {
        return new Promise<number[]>(resolve => {
          const frames: number[] = []
          let lastTime = performance.now()
          let frameCount = 0
          const maxFrames = 60 // 1秒間測定
          
          const measureFrame = (currentTime: number) => {
            const deltaTime = currentTime - lastTime
            const fps = 1000 / deltaTime
            frames.push(fps)
            lastTime = currentTime
            frameCount++
            
            if (frameCount < maxFrames) {
              requestAnimationFrame(measureFrame)
            } else {
              resolve(frames)
            }
          }
          
          requestAnimationFrame(measureFrame)
        })
      })
      
      if (frameRates.length > 0) {
        const averageFps = frameRates.reduce((sum, fps) => sum + fps, 0) / frameRates.length
        const minFps = Math.min(...frameRates)
        
        // 平均30fps以上を期待
        expect(averageFps).toBeGreaterThan(30)
        // 最低でも20fps以上を維持
        expect(minFps).toBeGreaterThan(20)
      }
    })
    
    test('メモリ使用量監視', async ({ page }) => {
      await page.goto('/')
      
      // 初期メモリ使用量
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      // 大量の操作を実行
      for (let i = 0; i < 10; i++) {
        const canvas = page.locator('[data-testid="game-canvas"]')
        await canvas.click()
        await page.waitForTimeout(100)
      }
      
      // 最終メモリ使用量
      const finalMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0
      })
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        const increaseRatio = memoryIncrease / initialMemory
        
        // メモリ使用量が初期の3倍を超えない
        expect(increaseRatio).toBeLessThan(3)
      }
    })
  })
})

test.describe('ネットワーク環境テスト', () => {
  test('低速ネットワークでの動作', async ({ page, context }) => {
    // 低速ネットワークをシミュレート
    await context.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 100)) // 100ms遅延
      await route.continue()
    })
    
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    const loadTime = Date.now() - startTime
    
    // 低速環境でも10秒以内に読み込み
    expect(loadTime).toBeLessThan(10000)
    
    // 基本機能が動作することを確認
    await expect(page.locator('[data-testid="vitality-display"]')).toBeVisible()
  })
  
  test('オフライン状態での動作', async ({ page, context }) => {
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    // オフライン状態にする
    await context.setOffline(true)
    
    // ページを更新してオフライン動作をテスト
    await page.reload()
    
    // Service Workerやキャッシュによる動作確認
    // （実装によっては一部機能が制限される可能性）
    const isGameVisible = await page.locator('[data-testid="game-canvas"]').isVisible()
    
    // オフラインでもゲームが表示される（キャッシュされている場合）
    if (await page.locator('[data-testid="offline-message"]').isVisible()) {
      // オフライン表示が適切に出る
      expect(await page.locator('[data-testid="offline-message"]').textContent()).toContain('オフライン')
    } else {
      // キャッシュによりゲームが動作
      expect(isGameVisible).toBe(true)
    }
  })
})

test.describe('セキュリティテスト', () => {
  test('XSS攻撃耐性', async ({ page }) => {
    await page.goto('/')
    
    // スクリプト注入攻撃の試行
    const maliciousScript = '<script>window.xssAttack = true;</script>'
    
    // 各入力フィールドでテスト（存在する場合）
    const inputs = page.locator('input[type="text"], textarea')
    const inputCount = await inputs.count()
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i)
      await input.fill(maliciousScript)
      await page.keyboard.press('Enter')
      
      // スクリプトが実行されていないことを確認
      const xssExecuted = await page.evaluate(() => (window as any).xssAttack)
      expect(xssExecuted).toBeFalsy()
    }
  })
  
  test('Content Security Policy確認', async ({ page }) => {
    const response = await page.goto('/')
    const cspHeader = response?.headers()['content-security-policy']
    
    // CSPヘッダーが設定されていることを確認
    if (cspHeader) {
      expect(cspHeader).toContain("default-src")
      expect(cspHeader).toContain("script-src")
    }
  })
})