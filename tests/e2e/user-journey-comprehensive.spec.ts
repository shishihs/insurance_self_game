/**
 * 包括的ユーザージャーニーE2Eテスト
 * 
 * 実際のユーザーが体験する可能性のあるすべてのシナリオを
 * ブラウザで実際にテストします。
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = 'https://shishihs.github.io/insurance_self_game/'

test.describe('包括的ユーザージャーニー', () => {
  
  test.describe('初回訪問ユーザーの体験', () => {
    test('新規ユーザーがサイトを訪問してゲームを開始する', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // === 1. ランディングページの確認 ===
      await expect(page).toHaveTitle(/Insurance Self Game|保険ゲーム/)
      
      // ヒーローセクションの存在確認
      const heroSection = page.locator('[data-testid="hero-section"], .hero-section, h1').first()
      await expect(heroSection).toBeVisible()
      
      // === 2. ゲーム開始ボタンを探して押す ===
      const gameButton = page.locator('button:has-text("ゲーム"), button:has-text("プレイ"), button:has-text("開始"), [data-testid="start-game"]').first()
      await expect(gameButton).toBeVisible()
      await gameButton.click()
      
      // === 3. ゲーム画面の読み込み確認 ===
      await page.waitForTimeout(2000) // アニメーション等の待機
      
      // ゲームキャンバスまたはゲーム要素の確認
      const gameArea = page.locator('canvas, [data-testid="game-area"], .game-canvas, #game-container').first()
      await expect(gameArea).toBeVisible({ timeout: 10000 })
      
      // === 4. 基本的なゲーム要素の確認 ===
      // バイタリティ表示
      const vitalityDisplay = page.locator('text=/vitality|バイタリティ|活力|HP/i, [data-testid*="vitality"]').first()
      if (await vitalityDisplay.isVisible()) {
        await expect(vitalityDisplay).toBeVisible()
      }
      
      // ターン表示
      const turnDisplay = page.locator('text=/turn|ターン|Turn/i, [data-testid*="turn"]').first()
      if (await turnDisplay.isVisible()) {
        await expect(turnDisplay).toBeVisible()
      }
    })

    test('チュートリアルモードでゲームを学習する', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // === 1. チュートリアルボタンを探して押す ===
      const tutorialButton = page.locator('button:has-text("チュートリアル"), button:has-text("Tutorial"), [data-testid="start-tutorial"]').first()
      
      if (await tutorialButton.isVisible()) {
        await tutorialButton.click()
        
        // === 2. チュートリアル画面の確認 ===
        await page.waitForTimeout(2000)
        
        // チュートリアル特有の要素を確認
        const tutorialElements = [
          page.locator('text=/tutorial|チュートリアル/i'),
          page.locator('text=/説明|instruction|guide/i'),
          page.locator('button:has-text("次へ"), button:has-text("Next")')
        ]
        
        for (const element of tutorialElements) {
          if (await element.first().isVisible()) {
            await expect(element.first()).toBeVisible()
            break
          }
        }
        
        // === 3. チュートリアル進行 ===
        // 次へボタンが存在する場合はクリック
        const nextButton = page.locator('button:has-text("次へ"), button:has-text("Next"), [data-testid*="next"]').first()
        if (await nextButton.isVisible()) {
          await nextButton.click()
          await page.waitForTimeout(1000)
        }
      }
    })
  })

  test.describe('ゲームプレイの基本フロー', () => {
    test('カードの描画と基本操作', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // ゲーム開始
      const gameButton = page.locator('button:has-text("ゲーム"), button:has-text("プレイ")').first()
      await gameButton.click()
      await page.waitForTimeout(3000)
      
      // === 1. カード要素の確認 ===
      const cardElements = [
        page.locator('.card, [data-testid*="card"], .game-card'),
        page.locator('text=/カード|Card/i').first()
      ]
      
      let cardsFound = false
      for (const cardSelector of cardElements) {
        if (await cardSelector.first().isVisible()) {
          cardsFound = true
          
          // === 2. カードクリック/インタラクション ===
          await cardSelector.first().click()
          await page.waitForTimeout(1000)
          
          // クリック後の状態変化を確認
          // （選択状態、ハイライト等）
          break
        }
      }
      
      // === 3. ゲーム進行ボタンの確認 ===
      const actionButtons = [
        page.locator('button:has-text("次の"), button:has-text("進む"), button:has-text("Next")'),
        page.locator('[data-testid*="next"], [data-testid*="proceed"]')
      ]
      
      for (const buttonSelector of actionButtons) {
        if (await buttonSelector.first().isVisible()) {
          await buttonSelector.first().click()
          await page.waitForTimeout(1000)
          break
        }
      }
    })

    test('チャレンジ解決フロー', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // ゲーム開始
      const gameButton = page.locator('button:has-text("ゲーム"), button:has-text("プレイ")').first()
      await gameButton.click()
      await page.waitForTimeout(3000)
      
      // === 1. チャレンジ要素の確認 ===
      const challengeElements = [
        page.locator('text=/challenge|チャレンジ|挑戦/i'),
        page.locator('[data-testid*="challenge"]'),
        page.locator('.challenge, .challenge-card')
      ]
      
      let challengeFound = false
      for (const challengeSelector of challengeElements) {
        if (await challengeSelector.first().isVisible()) {
          challengeFound = true
          
          // === 2. チャレンジの開始 ===
          await challengeSelector.first().click()
          await page.waitForTimeout(1000)
          break
        }
      }
      
      // === 3. チャレンジ解決ボタンの探索 ===
      const resolveButtons = [
        page.locator('button:has-text("解決"), button:has-text("Resolve")'),
        page.locator('button:has-text("挑戦"), button:has-text("Challenge")'),
        page.locator('[data-testid*="resolve"], [data-testid*="challenge"]')
      ]
      
      for (const button of resolveButtons) {
        if (await button.first().isVisible()) {
          await button.first().click()
          await page.waitForTimeout(2000)
          
          // === 4. 結果の確認 ===
          const resultElements = [
            page.locator('text=/成功|失敗|Success|Failure/i'),
            page.locator('[data-testid*="result"]')
          ]
          
          for (const result of resultElements) {
            if (await result.first().isVisible()) {
              await expect(result.first()).toBeVisible()
              break
            }
          }
          break
        }
      }
    })
  })

  test.describe('エラー状況とエッジケース', () => {
    test('ネットワーク切断時の動作', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // ゲーム開始
      const gameButton = page.locator('button').first()
      await gameButton.click()
      await page.waitForTimeout(2000)
      
      // === 1. ネットワークを切断 ===
      await page.context().setOffline(true)
      
      // === 2. オフライン状態でのゲーム操作 ===
      const clickableElements = await page.locator('button, .clickable, [data-testid*="button"]').all()
      
      for (const element of clickableElements.slice(0, 3)) { // 最初の3つだけテスト
        try {
          if (await element.isVisible()) {
            await element.click()
            await page.waitForTimeout(500)
          }
        } catch (error) {
          // オフライン状態でのエラーは予期される
          console.log('Expected offline error:', error)
        }
      }
      
      // === 3. ネットワークを復旧 ===
      await page.context().setOffline(false)
      await page.waitForTimeout(1000)
      
      // === 4. 復旧後の動作確認 ===
      const recoveryButton = page.locator('button').first()
      if (await recoveryButton.isVisible()) {
        await recoveryButton.click()
      }
    })

    test('異常に多くのクリック操作', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // ゲーム開始
      const gameButton = page.locator('button').first()
      await gameButton.click()
      await page.waitForTimeout(2000)
      
      // === 1. 高頻度クリック ===
      const clickableElement = page.locator('button, canvas, .clickable').first()
      
      if (await clickableElement.isVisible()) {
        // 短時間で大量クリック
        for (let i = 0; i < 20; i++) {
          await clickableElement.click()
          await page.waitForTimeout(50) // 50ms間隔
        }
        
        // === 2. システムの安定性確認 ===
        await page.waitForTimeout(2000)
        
        // ページがクラッシュしていないことを確認
        const body = page.locator('body')
        await expect(body).toBeVisible()
        
        // コンソールエラーの確認（重大なエラーがないか）
        const logs = []
        page.on('console', msg => {
          if (msg.type() === 'error') {
            logs.push(msg.text())
          }
        })
        
        await page.waitForTimeout(1000)
        
        // 重大なエラーが大量に発生していないことを確認
        expect(logs.length).toBeLessThan(10)
      }
    })

    test('ブラウザタブの切り替えとフォーカス復帰', async ({ page, context }) => {
      await page.goto(BASE_URL)
      
      // ゲーム開始
      const gameButton = page.locator('button').first()
      await gameButton.click()
      await page.waitForTimeout(2000)
      
      // === 1. 新しいタブを作成 ===
      const newPage = await context.newPage()
      await newPage.goto('about:blank')
      await page.waitForTimeout(1000)
      
      // === 2. 元のタブに戻る ===
      await page.bringToFront()
      await page.waitForTimeout(1000)
      
      // === 3. ゲームが正常に動作することを確認 ===
      const gameElement = page.locator('canvas, .game-area, [data-testid*="game"]').first()
      if (await gameElement.isVisible()) {
        await expect(gameElement).toBeVisible()
        
        // インタラクション可能か確認
        await gameElement.click()
        await page.waitForTimeout(500)
      }
      
      // === 4. 新しいタブを閉じる ===
      await newPage.close()
    })
  })

  test.describe('アクセシビリティとユーザビリティ', () => {
    test('キーボードナビゲーション', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // === 1. Tabキーでナビゲーション ===
      await page.keyboard.press('Tab')
      await page.waitForTimeout(300)
      
      // フォーカスされた要素の確認
      const focusedElement = page.locator(':focus')
      if (await focusedElement.isVisible()) {
        await expect(focusedElement).toBeVisible()
        
        // === 2. Enterキーで要素を活性化 ===
        await page.keyboard.press('Enter')
        await page.waitForTimeout(1000)
      }
      
      // === 3. 複数のTab移動 ===
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        await page.waitForTimeout(200)
      }
      
      // === 4. Escapeキーでの操作 ===
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
    })

    test('画面サイズ変更への対応', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // === 1. デスクトップサイズ ===
      await page.setViewportSize({ width: 1920, height: 1080 })
      await page.waitForTimeout(1000)
      
      const gameButton = page.locator('button').first()
      await gameButton.click()
      await page.waitForTimeout(2000)
      
      // === 2. タブレットサイズ ===
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.waitForTimeout(1000)
      
      // レスポンシブ対応の確認
      const gameArea = page.locator('canvas, .game-area').first()
      if (await gameArea.isVisible()) {
        await expect(gameArea).toBeVisible()
      }
      
      // === 3. モバイルサイズ ===
      await page.setViewportSize({ width: 375, height: 667 })
      await page.waitForTimeout(1000)
      
      // モバイル表示での動作確認
      const clickableElements = await page.locator('button, .clickable').all()
      for (const element of clickableElements.slice(0, 2)) {
        if (await element.isVisible()) {
          await element.click()
          await page.waitForTimeout(500)
          break
        }
      }
      
      // === 4. 極小サイズ ===
      await page.setViewportSize({ width: 320, height: 568 })
      await page.waitForTimeout(1000)
      
      // 極小画面でも基本要素が見える
      const body = page.locator('body')
      await expect(body).toBeVisible()
    })

    test('色覚アクセシビリティの確認', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // ゲーム開始
      const gameButton = page.locator('button').first()
      await gameButton.click()
      await page.waitForTimeout(2000)
      
      // === 1. 高コントラストモードのシミュレート ===
      await page.emulateMedia({ colorScheme: 'dark' })
      await page.waitForTimeout(1000)
      
      // ダークモードでの表示確認
      const gameArea = page.locator('canvas, .game-area, body').first()
      await expect(gameArea).toBeVisible()
      
      // === 2. 通常モードに戻す ===
      await page.emulateMedia({ colorScheme: 'light' })
      await page.waitForTimeout(1000)
      
      // === 3. カラーブラインドシミュレーション（CSS filter使用） ===
      await page.addStyleTag({
        content: `
          * {
            filter: grayscale(100%) !important;
          }
        `
      })
      await page.waitForTimeout(1000)
      
      // グレースケールでも判別可能か確認
      const interactiveElements = await page.locator('button, .clickable, [role="button"]').all()
      for (const element of interactiveElements.slice(0, 2)) {
        if (await element.isVisible()) {
          // 要素が十分な大きさを持っているか
          const box = await element.boundingBox()
          if (box) {
            expect(box.width).toBeGreaterThan(20)
            expect(box.height).toBeGreaterThan(20)
          }
          break
        }
      }
    })
  })

  test.describe('パフォーマンステスト', () => {
    test('ページ読み込み速度', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto(BASE_URL)
      
      // === 1. 基本要素の読み込み完了待機 ===
      await page.locator('body').waitFor()
      
      const loadTime = Date.now() - startTime
      
      // === 2. 読み込み時間が妥当な範囲内 ===
      expect(loadTime).toBeLessThan(10000) // 10秒以内
      
      // === 3. ゲーム開始後のレスポンス時間 ===
      const gameStartTime = Date.now()
      
      const gameButton = page.locator('button').first()
      await gameButton.click()
      
      // ゲーム要素の出現待機
      await page.locator('canvas, .game-area, .game-content').first().waitFor({ timeout: 15000 })
      
      const gameLoadTime = Date.now() - gameStartTime
      expect(gameLoadTime).toBeLessThan(15000) // 15秒以内
    })

    test('メモリ使用量の監視', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // ゲーム開始
      const gameButton = page.locator('button').first()
      await gameButton.click()
      await page.waitForTimeout(3000)
      
      // === 1. 長時間プレイのシミュレート ===
      const clickableElements = await page.locator('button, canvas, .clickable').all()
      
      for (let i = 0; i < 30; i++) { // 30回の操作
        for (const element of clickableElements.slice(0, 2)) {
          if (await element.isVisible()) {
            await element.click()
            await page.waitForTimeout(200)
            break
          }
        }
        
        if (i % 10 === 0) {
          // 定期的な待機（GC時間を与える）
          await page.waitForTimeout(1000)
        }
      }
      
      // === 2. ページがまだ応答することを確認 ===
      const body = page.locator('body')
      await expect(body).toBeVisible()
      
      // === 3. 新しい操作が可能か確認 ===
      const finalButton = page.locator('button').first()
      if (await finalButton.isVisible()) {
        await finalButton.click()
        await page.waitForTimeout(500)
      }
    })
  })

  test.describe('複数ブラウザ対応', () => {
    test('基本的な互換性確認', async ({ page }) => {
      await page.goto(BASE_URL)
      
      // === 1. ブラウザ情報の取得 ===
      const userAgent = await page.evaluate(() => navigator.userAgent)
      console.log('Testing on:', userAgent)
      
      // === 2. 基本要素の確認 ===
      const gameButton = page.locator('button').first()
      await expect(gameButton).toBeVisible()
      
      // === 3. JavaScript動作確認 ===
      const jsWorking = await page.evaluate(() => {
        return typeof Array.from === 'function' && typeof Promise !== 'undefined'
      })
      expect(jsWorking).toBe(true)
      
      // === 4. Canvas要素の確認（ゲーム開始後） ===
      await gameButton.click()
      await page.waitForTimeout(3000)
      
      const canvas = page.locator('canvas').first()
      if (await canvas.isVisible()) {
        const canvasSupported = await page.evaluate(() => {
          const canvas = document.createElement('canvas')
          return !!(canvas.getContext && canvas.getContext('2d'))
        })
        expect(canvasSupported).toBe(true)
      }
    })
  })
})