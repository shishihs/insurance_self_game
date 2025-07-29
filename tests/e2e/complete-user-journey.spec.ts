/**
 * 完全なユーザージャーニーE2Eテスト
 * チュートリアルからゲーム完了まで、全てのフローを検証
 */

import { test, expect } from '@playwright/test'

interface GameState {
  vitality: number
  age: number
  turn: number
  phase: string
  hasInsurance: boolean
  challengesCompleted: number
}

class UserJourneyTracker {
  private interactions: Array<{ action: string; timestamp: number; state?: Partial<GameState> }> = []
  
  logInteraction(action: string, state?: Partial<GameState>) {
    this.interactions.push({
      action,
      timestamp: Date.now(),
      state
    })
    console.log(`[${new Date().toISOString()}] ${action}`, state || '')
  }
  
  getJourneyReport(): string {
    const duration = this.interactions.length > 0 ? 
      this.interactions[this.interactions.length - 1].timestamp - this.interactions[0].timestamp : 0
    
    return `ユーザージャーニー完了: ${this.interactions.length}アクション, ${duration}ms`
  }
}

async function getGameState(page: any): Promise<GameState> {
  return await page.evaluate(() => {
    const vitalityEl = document.querySelector('[data-testid="vitality-display"]')
    const ageEl = document.querySelector('[data-testid="age-display"]')
    const turnEl = document.querySelector('[data-testid="turn-display"]')
    const phaseEl = document.querySelector('[data-testid="phase-display"]')
    
    return {
      vitality: vitalityEl ? parseInt(vitalityEl.textContent?.match(/\d+/)?.[0] || '0') : 0,
      age: ageEl ? parseInt(ageEl.textContent?.match(/\d+/)?.[0] || '0') : 0,
      turn: turnEl ? parseInt(turnEl.textContent?.match(/\d+/)?.[0] || '0') : 1,
      phase: phaseEl ? phaseEl.textContent || 'unknown' : 'unknown',
      hasInsurance: !!document.querySelector('[data-testid="active-insurance"]'),
      challengesCompleted: document.querySelectorAll('[data-testid^="completed-challenge"]').length
    }
  })
}

test.describe('完全ユーザージャーニー', () => {
  let tracker: UserJourneyTracker
  
  test.beforeEach(() => {
    tracker = new UserJourneyTracker()
  })
  
  test('新規プレイヤーの完全ジャーニー', async ({ page }) => {
    tracker.logInteraction('ゲーム開始')
    
    // 1. ゲーム読み込み
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    let gameState = await getGameState(page)
    tracker.logInteraction('ゲーム読み込み完了', gameState)
    
    // 初期状態の確認
    expect(gameState.vitality).toBe(100)
    expect(gameState.age).toBe(20)
    expect(gameState.turn).toBe(1)
    
    // 2. チュートリアル開始
    const tutorialButton = page.locator('[data-testid="tutorial-button"]')
    if (await tutorialButton.isVisible()) {
      tracker.logInteraction('チュートリアル開始')
      await tutorialButton.click()
      
      // チュートリアル進行
      const tutorialSteps = [
        '[data-testid="tutorial-step-1"]',
        '[data-testid="tutorial-step-2"]', 
        '[data-testid="tutorial-step-3"]'
      ]
      
      for (let i = 0; i < tutorialSteps.length; i++) {
        const step = page.locator(tutorialSteps[i])
        if (await step.isVisible({ timeout: 5000 })) {
          tracker.logInteraction(`チュートリアルステップ${i + 1}`)
          await step.click()
          await page.waitForTimeout(1000)
        }
      }
      
      // チュートリアル完了待機
      await page.waitForSelector('[data-testid="tutorial-complete"]', { timeout: 30000 })
      tracker.logInteraction('チュートリアル完了')
    }
    
    gameState = await getGameState(page)
    tracker.logInteraction('チュートリアル後状態', gameState)
    
    // 3. 最初のターン - カードドロー
    const handCards = page.locator('[data-testid^="hand-card-"]')
    const initialHandSize = await handCards.count()
    tracker.logInteraction(`初期手札確認: ${initialHandSize}枚`)
    
    expect(initialHandSize).toBeGreaterThan(0)
    expect(initialHandSize).toBeLessThanOrEqual(7)
    
    // 4. 行動フェーズ - カードプレイ
    if (initialHandSize > 0) {
      const firstCard = handCards.first()
      const cardInfo = await firstCard.getAttribute('data-card-type')
      tracker.logInteraction(`カードプレイ試行: ${cardInfo}`)
      
      // カードをドラッグ&ドロップでプレイ
      const cardBounds = await firstCard.boundingBox()
      const playArea = page.locator('[data-testid="play-area"]')
      const playBounds = await playArea.boundingBox()
      
      if (cardBounds && playBounds) {
        await page.mouse.move(
          cardBounds.x + cardBounds.width / 2,
          cardBounds.y + cardBounds.height / 2
        )
        await page.mouse.down()
        await page.mouse.move(
          playBounds.x + playBounds.width / 2,
          playBounds.y + playBounds.height / 2,
          { steps: 5 }
        )
        await page.mouse.up()
        
        await page.waitForTimeout(1000)
        tracker.logInteraction('カードプレイ完了')
      }
    }
    
    gameState = await getGameState(page)
    tracker.logInteraction('カードプレイ後状態', gameState)
    
    // 5. チャレンジフェーズ
    const challengePhaseButton = page.locator('[data-testid="proceed-to-challenge"]')
    if (await challengePhaseButton.isVisible()) {
      await challengePhaseButton.click()
      tracker.logInteraction('チャレンジフェーズ開始')
      
      // 利用可能なチャレンジを確認
      const challenges = page.locator('[data-testid^="challenge-"]')
      const challengeCount = await challenges.count()
      
      if (challengeCount > 0) {
        tracker.logInteraction(`利用可能チャレンジ: ${challengeCount}個`)
        
        // 最初のチャレンジを選択
        const firstChallenge = challenges.first()
        await firstChallenge.click()
        tracker.logInteraction('チャレンジ選択')
        
        // チャレンジ用カード選択
        const challengeCards = page.locator('[data-testid^="challenge-card-"]')
        const challengeCardCount = await challengeCards.count()
        
        if (challengeCardCount > 0) {
          await challengeCards.first().click()
          tracker.logInteraction('チャレンジカード選択')
          
          // チャレンジ実行
          const executeButton = page.locator('[data-testid="execute-challenge"]')
          if (await executeButton.isVisible()) {
            await executeButton.click()
            tracker.logInteraction('チャレンジ実行')
            
            // 結果待機
            await page.waitForSelector('[data-testid="challenge-result"]', { timeout: 5000 })
            
            const result = await page.locator('[data-testid="challenge-result"]').textContent()
            tracker.logInteraction(`チャレンジ結果: ${result}`)
          }
        }
      }
    }
    
    gameState = await getGameState(page)
    tracker.logInteraction('チャレンジ後状態', gameState)
    
    // 6. 保険購入体験
    const insuranceButton = page.locator('[data-testid="insurance-menu"]')
    if (await insuranceButton.isVisible()) {
      await insuranceButton.click()
      tracker.logInteraction('保険メニュー開く')
      
      const availableInsurance = page.locator('[data-testid^="insurance-option-"]')
      const insuranceCount = await availableInsurance.count()
      
      if (insuranceCount > 0) {
        tracker.logInteraction(`利用可能保険: ${insuranceCount}種類`)
        
        // 最初の保険を購入
        const firstInsurance = availableInsurance.first()
        const insuranceInfo = await firstInsurance.textContent()
        
        await firstInsurance.click()
        tracker.logInteraction(`保険購入: ${insuranceInfo}`)
        
        const confirmButton = page.locator('[data-testid="confirm-insurance"]')
        if (await confirmButton.isVisible()) {
          await confirmButton.click()
          tracker.logInteraction('保険購入確定')
        }
      }
    }
    
    gameState = await getGameState(page)
    tracker.logInteraction('保険購入後状態', gameState)
    
    // 7. 複数ターンのゲームプレイ
    const maxTurns = 5
    let currentTurn = gameState.turn
    
    while (currentTurn < maxTurns && gameState.vitality > 0) {
      tracker.logInteraction(`ターン${currentTurn}開始`)
      
      // ターン終了ボタン
      const endTurnButton = page.locator('[data-testid="end-turn"]')
      if (await endTurnButton.isVisible()) {
        await endTurnButton.click()
        await page.waitForTimeout(2000) // ターン処理待機
        
        gameState = await getGameState(page)
        currentTurn = gameState.turn
        tracker.logInteraction(`ターン${currentTurn - 1}終了`, gameState)
      } else {
        break
      }
      
      // 年齢進行の確認
      if (gameState.age > 20) {
        tracker.logInteraction(`年齢進行: ${gameState.age}歳`)
      }
      
      // 体力変化の記録
      if (gameState.vitality < 100) {
        tracker.logInteraction(`体力変化: ${gameState.vitality}`)
      }
    }
    
    // 8. ゲーム終了条件のテスト
    if (gameState.vitality <= 0) {
      tracker.logInteraction('ゲームオーバー: 体力0')
      
      const gameOverScreen = page.locator('[data-testid="game-over"]')
      await expect(gameOverScreen).toBeVisible()
      
      const finalScore = await page.locator('[data-testid="final-score"]').textContent()
      tracker.logInteraction(`最終スコア: ${finalScore}`)
      
      // リスタートオプション
      const restartButton = page.locator('[data-testid="restart-game"]')
      if (await restartButton.isVisible()) {
        tracker.logInteraction('リスタートオプション確認')
      }
      
    } else if (currentTurn >= maxTurns) {
      tracker.logInteraction(`制限ターン到達: ${maxTurns}ターン`)
    }
    
    // 9. 最終状態の検証
    const finalState = await getGameState(page)
    tracker.logInteraction('最終状態', finalState)
    
    // ジャーニー完了レポート
    console.log(tracker.getJourneyReport())
    
    // 基本的な整合性チェック
    expect(finalState.age).toBeGreaterThanOrEqual(20)
    expect(finalState.turn).toBeGreaterThanOrEqual(1)
    expect(finalState.vitality).toBeGreaterThanOrEqual(0)
    expect(finalState.vitality).toBeLessThanOrEqual(150) // 上限チェック
  })
  
  test('パワープレイヤージャーニー - 最適戦略', async ({ page }) => {
    tracker.logInteraction('パワープレイヤージャーニー開始')
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    // チュートリアルスキップ（経験者想定）
    const skipButton = page.locator('[data-testid="skip-tutorial"]')
    if (await skipButton.isVisible()) {
      await skipButton.click()
      tracker.logInteraction('チュートリアルスキップ')
    }
    
    let gameState = await getGameState(page)
    const targetTurns = 10
    let strategicScore = 0
    
    for (let turn = 1; turn <= targetTurns && gameState.vitality > 0; turn++) {
      tracker.logInteraction(`戦略的ターン${turn}開始`)
      
      // 最適カード選択戦略
      const handCards = page.locator('[data-testid^="hand-card-"]')
      const cardCount = await handCards.count()
      
      if (cardCount > 0) {
        // カード情報を分析
        const cardAnalysis = []
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
          const card = handCards.nth(i)
          const cardType = await card.getAttribute('data-card-type')
          const cardPower = await card.getAttribute('data-card-power')
          const cardCost = await card.getAttribute('data-card-cost')
          
          cardAnalysis.push({
            index: i,
            type: cardType,
            power: parseInt(cardPower || '0'),
            cost: parseInt(cardCost || '0'),
            efficiency: parseInt(cardPower || '0') - parseInt(cardCost || '0')
          })
        }
        
        // 効率の良いカードを選択
        cardAnalysis.sort((a, b) => b.efficiency - a.efficiency)
        const bestCard = cardAnalysis[0]
        
        if (bestCard.efficiency > 0) {
          const targetCard = handCards.nth(bestCard.index)
          
          // カードプレイ
          const cardBounds = await targetCard.boundingBox()
          const playArea = page.locator('[data-testid="play-area"]')
          const playBounds = await playArea.boundingBox()
          
          if (cardBounds && playBounds) {
            await page.mouse.move(
              cardBounds.x + cardBounds.width / 2,
              cardBounds.y + cardBounds.height / 2
            )
            await page.mouse.down()
            await page.mouse.move(
              playBounds.x + playBounds.width / 2,
              playBounds.y + playBounds.height / 2,
              { steps: 3 }
            )
            await page.mouse.up()
            
            strategicScore += bestCard.efficiency
            tracker.logInteraction(`戦略的カードプレイ: ${bestCard.type} (効率: ${bestCard.efficiency})`)
          }
        }
      }
      
      // 高報酬チャレンジの選択
      const challengeButton = page.locator('[data-testid="proceed-to-challenge"]')
      if (await challengeButton.isVisible()) {
        await challengeButton.click()
        
        const challenges = page.locator('[data-testid^="challenge-"]')
        const challengeCount = await challenges.count()
        
        if (challengeCount > 0) {
          // 最も報酬の高いチャレンジを選択
          let bestChallenge = null
          let bestReward = 0
          
          for (let i = 0; i < challengeCount; i++) {
            const challenge = challenges.nth(i)
            const reward = await challenge.getAttribute('data-challenge-reward')
            const requiredPower = await challenge.getAttribute('data-challenge-power')
            
            const rewardValue = parseInt(reward || '0')
            const powerValue = parseInt(requiredPower || '0')
            
            if (rewardValue > bestReward && powerValue <= gameState.vitality * 0.3) {
              bestReward = rewardValue
              bestChallenge = i
            }
          }
          
          if (bestChallenge !== null) {
            await challenges.nth(bestChallenge).click()
            tracker.logInteraction(`戦略的チャレンジ選択: 報酬${bestReward}`)
            
            // チャレンジ実行
            const executeButton = page.locator('[data-testid="execute-challenge"]')
            if (await executeButton.isVisible()) {
              await executeButton.click()
              await page.waitForSelector('[data-testid="challenge-result"]', { timeout: 5000 })
              
              const success = await page.locator('[data-testid="challenge-success"]').isVisible()
              if (success) {
                strategicScore += bestReward
                tracker.logInteraction(`チャレンジ成功: +${bestReward}`)
              } else {
                tracker.logInteraction('チャレンジ失敗')
              }
            }
          }
        }
      }
      
      // 保険の戦略的活用
      if (turn === 3 && gameState.vitality < 80) {
        const insuranceButton = page.locator('[data-testid="insurance-menu"]')
        if (await insuranceButton.isVisible()) {
          await insuranceButton.click()
          
          const permanentInsurance = page.locator('[data-testid="insurance-permanent"]')
          if (await permanentInsurance.isVisible()) {
            await permanentInsurance.click()
            
            const confirmButton = page.locator('[data-testid="confirm-insurance"]')
            if (await confirmButton.isVisible()) {
              await confirmButton.click()
              tracker.logInteraction('戦略的終身保険購入')
            }
          }
        }
      }
      
      // ターン終了
      const endTurnButton = page.locator('[data-testid="end-turn"]')
      if (await endTurnButton.isVisible()) {
        await endTurnButton.click()
        await page.waitForTimeout(1500)
      }
      
      gameState = await getGameState(page)
      tracker.logInteraction(`ターン${turn}終了`, { ...gameState, strategicScore })
    }
    
    tracker.logInteraction(`パワープレイヤージャーニー完了: 戦略スコア${strategicScore}`)
    
    // パワープレイヤーの期待結果
    expect(strategicScore).toBeGreaterThan(50) // 高スコア達成
    expect(gameState.vitality).toBeGreaterThan(20) // 生存
    expect(gameState.challengesCompleted).toBeGreaterThanOrEqual(3) // 複数チャレンジ完了
  })
  
  test('初心者プレイヤージャーニー - ガイド付き', async ({ page }) => {
    tracker.logInteraction('初心者ジャーニー開始')
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    // 完全なチュートリアル体験
    const tutorialButton = page.locator('[data-testid="tutorial-button"]')
    if (await tutorialButton.isVisible()) {
      await tutorialButton.click()
      tracker.logInteraction('フルチュートリアル開始')
      
      // すべてのチュートリアルステップを体験
      const tutorialSteps = [1, 2, 3, 4, 5]
      
      for (const stepNum of tutorialSteps) {
        const step = page.locator(`[data-testid="tutorial-step-${stepNum}"]`)
        
        if (await step.isVisible({ timeout: 10000 })) {
          // ステップの説明を読む時間
          await page.waitForTimeout(2000)
          
          await step.click()
          tracker.logInteraction(`チュートリアルステップ${stepNum}完了`)
          
          // 次のステップまでの間隔
          await page.waitForTimeout(1000)
        }
      }
      
      await page.waitForSelector('[data-testid="tutorial-complete"]', { timeout: 30000 })
      tracker.logInteraction('フルチュートリアル完了')
    }
    
    // 慎重なプレイスタイル
    let gameState = await getGameState(page)
    const cautionTurns = 7
    
    for (let turn = 1; turn <= cautionTurns && gameState.vitality > 0; turn++) {
      tracker.logInteraction(`慎重ターン${turn}開始`)
      
      // 低リスクカードの選択
      const handCards = page.locator('[data-testid^="hand-card-"]')
      const cardCount = await handCards.count()
      
      if (cardCount > 0) {
        // 最もコストの低いカードを選択
        let lowestCostCard = null
        let lowestCost = Infinity
        
        for (let i = 0; i < cardCount; i++) {
          const card = handCards.nth(i)
          const cost = await card.getAttribute('data-card-cost')
          const costValue = parseInt(cost || '0')
          
          if (costValue < lowestCost && costValue <= gameState.vitality * 0.2) {
            lowestCost = costValue
            lowestCostCard = i
          }
        }
        
        if (lowestCostCard !== null) {
          const targetCard = handCards.nth(lowestCostCard)
          
          const cardBounds = await targetCard.boundingBox()
          const playArea = page.locator('[data-testid="play-area"]')
          const playBounds = await playArea.boundingBox()
          
          if (cardBounds && playBounds) {
            await page.mouse.move(
              cardBounds.x + cardBounds.width / 2,
              cardBounds.y + cardBounds.height / 2
            )
            await page.mouse.down()
            await page.mouse.move(
              playBounds.x + playBounds.width / 2,
              playBounds.y + playBounds.height / 2,
              { steps: 5 }
            )
            await page.mouse.up()
            
            tracker.logInteraction(`慎重カードプレイ: コスト${lowestCost}`)
          }
        }
      }
      
      // 簡単なチャレンジのみ選択
      const challengeButton = page.locator('[data-testid="proceed-to-challenge"]')
      if (await challengeButton.isVisible()) {
        await challengeButton.click()
        
        const easyChallenge = page.locator('[data-testid="challenge-easy"]')
        if (await easyChallenge.isVisible()) {
          await easyChallenge.click()
          tracker.logInteraction('簡単チャレンジ選択')
          
          const executeButton = page.locator('[data-testid="execute-challenge"]')
          if (await executeButton.isVisible()) {
            await executeButton.click()
            await page.waitForSelector('[data-testid="challenge-result"]', { timeout: 5000 })
            tracker.logInteraction('簡単チャレンジ実行')
          }
        } else {
          // 簡単なチャレンジがない場合はスキップ
          const skipChallenge = page.locator('[data-testid="skip-challenge"]')
          if (await skipChallenge.isVisible()) {
            await skipChallenge.click()
            tracker.logInteraction('チャレンジスキップ')
          }
        }
      }
      
      // 早期保険購入（リスク回避）
      if (turn === 2) {
        const insuranceButton = page.locator('[data-testid="insurance-menu"]')
        if (await insuranceButton.isVisible()) {
          await insuranceButton.click()
          
          const basicInsurance = page.locator('[data-testid="insurance-basic"]')
          if (await basicInsurance.isVisible()) {
            await basicInsurance.click()
            
            const confirmButton = page.locator('[data-testid="confirm-insurance"]')
            if (await confirmButton.isVisible()) {
              await confirmButton.click()
              tracker.logInteraction('早期保険購入（基本）')
            }
          }
        }
      }
      
      // ターン終了
      const endTurnButton = page.locator('[data-testid="end-turn"]')
      if (await endTurnButton.isVisible()) {
        await endTurnButton.click()
        await page.waitForTimeout(2000) // 初心者はゆっくり
      }
      
      gameState = await getGameState(page)
      tracker.logInteraction(`慎重ターン${turn}終了`, gameState)
    }
    
    tracker.logInteraction('初心者ジャーニー完了')
    
    // 初心者の期待結果（安全重視）
    expect(gameState.vitality).toBeGreaterThan(50) // 体力温存
    expect(gameState.hasInsurance).toBe(true) // 保険加入
    expect(gameState.turn).toBeGreaterThanOrEqual(5) // 長期生存
  })
  
  test('エラー回復ジャーニー - 問題発生時の対応', async ({ page }) => {
    tracker.logInteraction('エラー回復ジャーニー開始')
    
    await page.goto('/')
    await page.waitForSelector('[data-testid="game-canvas"]')
    
    // 意図的なエラー状況の作成と回復テスト
    
    // 1. 無効な操作の試行
    const nonExistentButton = page.locator('[data-testid="non-existent-button"]')
    await nonExistentButton.click({ timeout: 1000 }).catch(() => {
      tracker.logInteraction('無効操作試行: 存在しないボタン')
    })
    
    // ゲームが正常状態を維持しているか確認
    const gameCanvas = page.locator('[data-testid="game-canvas"]')
    await expect(gameCanvas).toBeVisible()
    
    // 2. 高速連続クリック（レート制限テスト）
    tracker.logInteraction('高速連続操作テスト開始')
    
    for (let i = 0; i < 20; i++) {
      await gameCanvas.click({ timeout: 100 }).catch(() => {})
    }
    
    await page.waitForTimeout(1000)
    const gameState = await getGameState(page)
    expect(gameState.vitality).toBeGreaterThanOrEqual(0) // 整合性維持
    tracker.logInteraction('高速操作後の状態確認', gameState)
    
    // 3. ネットワーク切断シミュレーション
    await page.context().setOffline(true)
    tracker.logInteraction('オフライン状態移行')
    
    // オフライン状態での操作試行
    const handCards = page.locator('[data-testid^="hand-card-"]')
    const cardCount = await handCards.count()
    
    if (cardCount > 0) {
      await handCards.first().click().catch(() => {
        tracker.logInteraction('オフライン操作試行: カードクリック')
      })
    }
    
    // ネットワーク復旧
    await page.context().setOffline(false)
    tracker.logInteraction('オンライン状態復旧')
    
    // 復旧後の正常動作確認
    await page.waitForTimeout(1000)
    const postRecoveryState = await getGameState(page)
    expect(postRecoveryState.vitality).toBeGreaterThanOrEqual(0)
    tracker.logInteraction('復旧後状態確認', postRecoveryState)
    
    // 4. ブラウザ機能制限下での動作
    // ローカルストレージを無効化
    await page.evaluate(() => {
      Object.defineProperty(window, 'localStorage', {
        value: null,
        writable: false
      })
    })
    
    tracker.logInteraction('ストレージ無効化テスト')
    
    // ゲームが引き続き動作するか確認
    const endTurnButton = page.locator('[data-testid="end-turn"]')
    if (await endTurnButton.isVisible()) {
      await endTurnButton.click()
      tracker.logInteraction('ストレージ無効状態でのターン終了')
    }
    
    const finalState = await getGameState(page)
    tracker.logInteraction('エラー回復ジャーニー完了', finalState)
    
    // システムの堅牢性確認
    expect(finalState.vitality).toBeGreaterThanOrEqual(0)
    expect(finalState.turn).toBeGreaterThanOrEqual(1)
  })
  
  test.afterEach(() => {
    console.log(tracker.getJourneyReport())
  })
})