import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

test.describe('保険機能E2Eテスト', () => {
  let page: Page

  test.beforeEach(async ({ page: p }) => {
    page = p
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  test.describe('保険カードの購入と管理', () => {
    test('保険カードの購入フロー', async () => {
      // ゲーム開始
      await page.click('text=ゲーム開始')
      await page.fill('input[placeholder*="名前"]', 'テストプレイヤー')
      await page.click('text=開始')
      
      // ゲーム画面が表示されるまで待機
      await page.waitForSelector('.game-canvas')
      
      // 保険ショップを開く
      await page.click('text=保険購入')
      await page.waitForSelector('.insurance-shop')
      
      // 健康保険を選択
      const healthInsurance = page.locator('.insurance-card').filter({ hasText: '健康保険' })
      await expect(healthInsurance).toBeVisible()
      
      // 保険の詳細を確認
      await healthInsurance.hover()
      await expect(page.locator('.insurance-tooltip')).toContainText('カバレッジ')
      await expect(page.locator('.insurance-tooltip')).toContainText('保険料')
      
      // 購入
      await healthInsurance.click()
      await page.click('text=購入確定')
      
      // 購入成功の確認
      await expect(page.locator('.notification')).toContainText('保険を購入しました')
      
      // ステータスバーで保険が表示されることを確認
      await expect(page.locator('.status-bar .insurance-list')).toContainText('健康保険')
    })

    test('複数保険の同時管理', async () => {
      // ゲーム開始（テストユーティリティ使用）
      await startGame(page, 'マルチ保険テスター')
      
      // 複数の保険を購入
      const insuranceTypes = ['健康保険', 'がん保険', '事故保険']
      
      for (const insurance of insuranceTypes) {
        await purchaseInsurance(page, insurance)
        await page.waitForTimeout(500) // アニメーション待機
      }
      
      // 保険リストの確認
      const insuranceList = page.locator('.insurance-list')
      for (const insurance of insuranceTypes) {
        await expect(insuranceList).toContainText(insurance)
      }
      
      // 保険負担率の表示確認
      const burden = page.locator('.insurance-burden')
      await expect(burden).toBeVisible()
      const burdenText = await burden.textContent()
      expect(parseInt(burdenText || '0')).toBeGreaterThan(0)
    })

    test('保険料の動的計算', async () => {
      await startGame(page, '保険料テスター')
      
      // 初期ステージでの保険料を確認
      await page.click('text=保険購入')
      const initialPremium = await page.locator('.health-insurance .premium').textContent()
      
      // ステージを進める（チートコマンド使用）
      await page.keyboard.press('Control+Shift+D') // デバッグメニュー
      await page.click('text=ステージ変更')
      await page.selectOption('select[name="stage"]', 'middle')
      
      // 中年期での保険料を確認
      await page.click('text=保険購入')
      const middleAgePremium = await page.locator('.health-insurance .premium').textContent()
      
      // 保険料が上昇していることを確認
      expect(parseInt(middleAgePremium || '0')).toBeGreaterThan(parseInt(initialPremium || '0'))
    })
  })

  test.describe('リスク・リワードチャレンジ', () => {
    test('低リスクチャレンジの成功フロー', async () => {
      await startGame(page, 'チャレンジャー')
      
      // チャレンジカードが出るまでドロー
      await drawUntilChallenge(page, 'low')
      
      // チャレンジの詳細確認
      const challengeCard = page.locator('.challenge-card.low-risk')
      await challengeCard.hover()
      await expect(page.locator('.challenge-details')).toContainText('低リスク')
      await expect(page.locator('.challenge-details')).toContainText('成功ボーナス')
      
      // チャレンジに挑戦
      await challengeCard.click()
      await page.click('text=挑戦する')
      
      // 結果アニメーション
      await page.waitForSelector('.challenge-result')
      
      // 成功時の報酬確認
      const result = await page.locator('.challenge-result').textContent()
      if (result?.includes('成功')) {
        await expect(page.locator('.vitality-change')).toContainText('+')
      }
    })

    test('極限リスクチャレンジと保険無効化', async () => {
      await startGame(page, 'エクストリーマー')
      
      // 保険を購入
      await purchaseInsurance(page, '健康保険')
      
      // 極限チャレンジカードが出るまでドロー
      await drawUntilChallenge(page, 'extreme')
      
      // 保険無効の警告確認
      const challengeCard = page.locator('.challenge-card.extreme-risk')
      await challengeCard.hover()
      await expect(page.locator('.challenge-warning')).toContainText('保険無効')
      
      // チャレンジに挑戦
      await challengeCard.click()
      await page.click('text=覚悟を決めて挑戦')
      
      // 失敗時でも保険が発動しないことを確認
      await page.waitForSelector('.challenge-result')
      const result = await page.locator('.challenge-result').textContent()
      
      if (result?.includes('失敗')) {
        await expect(page.locator('.insurance-activation')).not.toBeVisible()
        await expect(page.locator('.vitality-change')).toContainText('-')
      }
    })

    test('リスクレベル別の報酬計算', async () => {
      await startGame(page, 'リスク計算者')
      
      const riskLevels = ['low', 'medium', 'high', 'extreme']
      const rewards: Record<string, number> = {}
      
      for (const level of riskLevels) {
        // 各リスクレベルのチャレンジを取得
        await page.reload() // リセット
        await startGame(page, 'リスク計算者')
        await drawUntilChallenge(page, level)
        
        // 報酬額を記録
        const rewardText = await page.locator(`.challenge-card.${level}-risk .success-bonus`).textContent()
        rewards[level] = parseInt(rewardText?.match(/\d+/)?.[0] || '0')
      }
      
      // リスクレベルが上がるほど報酬も増加することを確認
      expect(rewards.low).toBeLessThan(rewards.medium)
      expect(rewards.medium).toBeLessThan(rewards.high)
      expect(rewards.high).toBeLessThan(rewards.extreme)
    })
  })

  test.describe('保険とゲームプレイの統合', () => {
    test('保険による活力保護の実証', async () => {
      await startGame(page, '保険活用者')
      
      // 初期活力を記録
      const initialVitality = await getVitality(page)
      
      // 保険なしでダメージを受ける
      await takeDamage(page, 10)
      const vitalityAfterDamage = await getVitality(page)
      expect(vitalityAfterDamage).toBe(initialVitality - 10)
      
      // 健康保険を購入
      await purchaseInsurance(page, '健康保険')
      
      // 保険ありでダメージを受ける
      await takeDamage(page, 10)
      const vitalityWithInsurance = await getVitality(page)
      
      // 保険によってダメージが軽減されることを確認
      expect(vitalityWithInsurance).toBeGreaterThan(vitalityAfterDamage - 10)
    })

    test('保険の使用回数制限', async () => {
      await startGame(page, '保険使用者')
      
      // 保険を購入
      await purchaseInsurance(page, '事故保険')
      
      // 保険の使用回数を確認
      const usageLimit = 3 // 事故保険の使用回数制限
      
      // 制限回数まで使用
      for (let i = 0; i < usageLimit; i++) {
        await takeDamage(page, 5)
        await expect(page.locator('.insurance-activated')).toBeVisible()
        await page.waitForTimeout(1000)
      }
      
      // 制限を超えて使用を試みる
      await takeDamage(page, 5)
      await expect(page.locator('.insurance-exhausted')).toBeVisible()
      await expect(page.locator('.insurance-activated')).not.toBeVisible()
    })

    test('ステージ進行と保険戦略', async () => {
      await startGame(page, '戦略家')
      
      // 青春期: 低コスト保険中心
      await expect(page.locator('.stage-indicator')).toContainText('青春期')
      await purchaseInsurance(page, '事故保険') // 安価
      
      // 中年期へ進行
      await progressToNextStage(page)
      await expect(page.locator('.stage-indicator')).toContainText('中年期')
      
      // 中年期: バランス型保険
      await purchaseInsurance(page, '健康保険')
      
      // 充実期へ進行
      await progressToNextStage(page)
      await expect(page.locator('.stage-indicator')).toContainText('充実期')
      
      // 充実期: 高カバレッジ保険
      await purchaseInsurance(page, 'がん保険')
      
      // 各ステージで適切な保険戦略が取れることを確認
      const insuranceList = await page.locator('.insurance-list').textContent()
      expect(insuranceList).toContain('事故保険')
      expect(insuranceList).toContain('健康保険')
      expect(insuranceList).toContain('がん保険')
    })
  })

  test.describe('保険システムのエッジケース', () => {
    test('保険料が活力を超える場合の処理', async () => {
      await startGame(page, 'エッジケーステスター')
      
      // 活力を低く設定（デバッグコマンド）
      await page.keyboard.press('Control+Shift+D')
      await page.click('text=活力設定')
      await page.fill('input[name="vitality"]', '5')
      
      // 高額保険の購入を試みる
      await page.click('text=保険購入')
      const expensiveInsurance = page.locator('.insurance-card').filter({ hasText: 'がん保険' })
      await expensiveInsurance.click()
      
      // エラーメッセージの確認
      await expect(page.locator('.error-message')).toContainText('活力が不足')
      await expect(page.locator('text=購入確定')).toBeDisabled()
    })

    test('保険の同時発動', async () => {
      await startGame(page, '複数保険テスター')
      
      // 複数の保険を購入
      await purchaseInsurance(page, '健康保険')
      await purchaseInsurance(page, '総合保険')
      
      // 大ダメージを受ける
      await takeDamage(page, 30)
      
      // 複数の保険が同時に発動することを確認
      const notifications = page.locator('.insurance-activated')
      await expect(notifications).toHaveCount(2)
      
      // それぞれの保険効果が適用されることを確認
      await expect(notifications.nth(0)).toContainText('健康保険')
      await expect(notifications.nth(1)).toContainText('総合保険')
    })

    test('保険更新と料金変動', async () => {
      await startGame(page, '保険更新テスター')
      
      // 保険を購入
      await purchaseInsurance(page, '健康保険')
      const initialPremium = await getInsurancePremium(page, '健康保険')
      
      // 保険を数回使用
      for (let i = 0; i < 3; i++) {
        await takeDamage(page, 10)
        await page.waitForTimeout(500)
      }
      
      // 次のステージへ進む（保険更新タイミング）
      await progressToNextStage(page)
      
      // 更新画面の表示
      await expect(page.locator('.insurance-renewal')).toBeVisible()
      
      // 使用履歴により保険料が上昇していることを確認
      const renewalPremium = await page.locator('.renewal-premium').textContent()
      expect(parseInt(renewalPremium || '0')).toBeGreaterThan(initialPremium)
      
      // 更新するかどうかの選択
      await page.click('text=更新する')
      await expect(page.locator('.notification')).toContainText('保険を更新しました')
    })
  })
})

// ヘルパー関数
async function startGame(page: Page, playerName: string) {
  await page.click('text=ゲーム開始')
  await page.fill('input[placeholder*="名前"]', playerName)
  await page.click('text=開始')
  await page.waitForSelector('.game-canvas')
}

async function purchaseInsurance(page: Page, insuranceType: string) {
  await page.click('text=保険購入')
  await page.waitForSelector('.insurance-shop')
  const insurance = page.locator('.insurance-card').filter({ hasText: insuranceType })
  await insurance.click()
  await page.click('text=購入確定')
  await page.waitForSelector('.notification')
}

async function drawUntilChallenge(page: Page, riskLevel: string) {
  let attempts = 0
  while (attempts < 20) {
    await page.click('text=カードを引く')
    await page.waitForTimeout(500)
    
    const challenge = await page.locator(`.challenge-card.${riskLevel}-risk`).isVisible()
    if (challenge) break
    
    attempts++
  }
}

async function getVitality(page: Page): Promise<number> {
  const vitalityText = await page.locator('.vitality-display').textContent()
  return parseInt(vitalityText?.match(/\d+/)?.[0] || '0')
}

async function takeDamage(page: Page, amount: number) {
  // デバッグコマンドでダメージを与える
  await page.keyboard.press('Control+Shift+D')
  await page.click('text=ダメージ付与')
  await page.fill('input[name="damage"]', amount.toString())
  await page.click('text=実行')
}

async function progressToNextStage(page: Page) {
  // ステージ進行のシミュレーション
  for (let i = 0; i < 10; i++) {
    await page.click('text=ターン終了')
    await page.waitForTimeout(300)
    
    const stageChanged = await page.locator('.stage-transition').isVisible()
    if (stageChanged) break
  }
}

async function getInsurancePremium(page: Page, insuranceType: string): Promise<number> {
  const premium = await page.locator(`.insurance-status .${insuranceType} .premium`).textContent()
  return parseInt(premium?.match(/\d+/)?.[0] || '0')
}