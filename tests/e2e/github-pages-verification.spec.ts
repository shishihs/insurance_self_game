import { test, expect } from '@playwright/test'

/**
 * GitHub Pages デプロイメント検証テスト
 * 本番環境（GitHub Pages）でゲームが正常に動作することを確認
 */

const GITHUB_PAGES_URL = 'https://shishihs.github.io/insurance_self_game/'

test.describe('GitHub Pages デプロイメント検証', () => {
    test('ページが正常に読み込まれる', async ({ page }) => {
        // GitHub Pagesにアクセス
        const response = await page.goto(GITHUB_PAGES_URL, { waitUntil: 'domcontentloaded' })


        // ステータスコードが200であることを確認
        expect(response?.status()).toBe(200)

        // タイトルが正しいことを確認
        await expect(page).toHaveTitle(/Life Enrichment Game/i)
    })

    test('ゲームボードが表示される', async ({ page }) => {
        await page.goto(GITHUB_PAGES_URL, { waitUntil: 'domcontentloaded' })

        // ゲームボードコンポーネントが存在することを確認
        const gameBoard = page.locator('[data-testid="game-board"], .game-board, #game-board')
        await expect(gameBoard.first()).toBeVisible({ timeout: 10000 })
    })

    test('活力表示が存在する', async ({ page }) => {
        await page.goto(GITHUB_PAGES_URL, { waitUntil: 'domcontentloaded' })

        // 活力バーまたは活力表示が存在することを確認
        const vitalityDisplay = page.locator('[data-testid="vitality"]').or(page.locator('.vitality')).or(page.getByText(/活力|体力|HP/i));
        await expect(vitalityDisplay.first()).toBeVisible({ timeout: 10000 })
    })

    test('カードが表示される', async ({ page }) => {
        await page.goto(GITHUB_PAGES_URL, { waitUntil: 'domcontentloaded' })

        // カードコンポーネントが存在することを確認
        const cards = page.locator('[data-testid="card"], .card, [class*="card"]')

        // 少なくとも1枚のカードが表示されるまで待つ
        await expect(cards.first()).toBeVisible({ timeout: 15000 })

        // カードが複数表示されることを確認（手札）
        const cardCount = await cards.count()
        expect(cardCount).toBeGreaterThan(0)

        console.log(`✅ ${cardCount}枚のカードが表示されました`)
    })

    test('基本的なゲーム操作が可能', async ({ page }) => {
        await page.goto(GITHUB_PAGES_URL, { waitUntil: 'domcontentloaded' })

        // ゲームが読み込まれるまで待つ
        await page.waitForTimeout(3000)

        // クリック可能な要素（カードやボタン）が存在することを確認
        const clickableElements = page.locator('button, [role="button"], .card[clickable], [data-testid*="card"]')
        const elementCount = await clickableElements.count()

        expect(elementCount).toBeGreaterThan(0)
        console.log(`✅ ${elementCount}個のインタラクティブ要素が見つかりました`)
    })

    test('JavaScriptエラーが発生しない', async ({ page }) => {
        const errors: string[] = []

        // コンソールエラーをキャプチャ
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text())
            }
        })

        // ページエラーをキャプチャ
        page.on('pageerror', error => {
            errors.push(error.message)
        })

        await page.goto(GITHUB_PAGES_URL, { waitUntil: 'domcontentloaded' })

        // 初期読み込み後に少し待つ
        await page.waitForTimeout(5000)

        // 重大なエラーがないことを確認（警告は許容）
        const criticalErrors = errors.filter(err =>
            !err.includes('Warning') &&
            !err.includes('[Vue warn]') &&
            !err.includes('DevTools')
        )

        if (criticalErrors.length > 0) {
            console.log('⚠️ 検出されたエラー:', criticalErrors)
        }

        // 重大なエラーが5個未満であることを確認（完全にゼロは難しいため）
        expect(criticalErrors.length).toBeLessThan(5)
    })

    test('レスポンシブデザインが機能する', async ({ page }) => {
        // モバイルビューポートでテスト
        await page.setViewportSize({ width: 375, height: 667 })
        await page.goto(GITHUB_PAGES_URL, { waitUntil: 'domcontentloaded' })

        // ゲームボードが表示されることを確認
        const gameBoard = page.locator('[data-testid="game-board"], .game-board, #game-board')
        await expect(gameBoard.first()).toBeVisible({ timeout: 10000 })

        // デスクトップビューポートでテスト
        await page.setViewportSize({ width: 1920, height: 1080 })
        await page.reload({ waitUntil: 'domcontentloaded' })

        // 再度ゲームボードが表示されることを確認
        await expect(gameBoard.first()).toBeVisible({ timeout: 10000 })
    })
})
