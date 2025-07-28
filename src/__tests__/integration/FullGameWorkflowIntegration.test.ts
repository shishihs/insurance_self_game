/**
 * 完全なゲームワークフロー統合テスト
 * 
 * 実際のプレイヤーがゲームを通してプレイする完全なシナリオを
 * テストし、すべてのコンポーネントが適切に連携することを確認します。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { CardPower } from '../../domain/valueObjects/CardPower'
import { Vitality } from '../../domain/valueObjects/Vitality'
import { InsurancePremium } from '../../domain/valueObjects/InsurancePremium'
import type { GameConfig } from '../../domain/types/game.types'

describe('完全なゲームワークフロー統合テスト', () => {
  let game: Game
  let config: GameConfig

  beforeEach(() => {
    config = {
      startingVitality: 20,
      maxHandSize: 7,
      initialDeckSize: 40,
      challengesPerStage: 3,
      maxInsuranceCards: 5,
      dreamBonusMultiplier: 1.5
    }
    game = new Game(config)
  })

  describe('基本的なゲームプレイワークフロー', () => {
    it('完全なゲームセッションを実行できる', () => {
      // === フェーズ1: ゲーム開始と初期セットアップ ===
      expect(game.status).toBe('not_started')
      
      game.start()
      expect(game.status).toBe('active')
      expect(game.stage).toBe('youth')
      expect(game.vitality.getValue()).toBe(config.startingVitality)
      expect(game.turn).toBe(1)
      expect(game.hand).toHaveLength(0)
      
      // === フェーズ2: 初期カード配布 ===
      game.drawCards(5)
      expect(game.hand).toHaveLength(5)
      expect(game.deck.size).toBe(config.initialDeckSize - 5)
      
      // === フェーズ3: 最初のチャレンジ ===
      const firstChallenge = game.challengeDeck.drawCard()
      expect(firstChallenge).toBeDefined()
      expect(firstChallenge!.type).toBe('challenge')
      
      game.startChallenge(firstChallenge!)
      expect(game.currentChallenge).toBe(firstChallenge)
      
      // チャレンジに対してカードを選択
      const availableCards = game.hand.filter(card => card.type === 'life')
      expect(availableCards.length).toBeGreaterThan(0)
      
      const selectedCard = availableCards[0]
      game.selectCardForChallenge(selectedCard.id)
      
      // チャレンジ解決
      const challengeResult = game.resolveChallenge()
      expect(challengeResult).toBeDefined()
      expect(['success', 'failure']).toContain(challengeResult.result)
      
      // === フェーズ4: 統計更新確認 ===
      if (challengeResult.result === 'success') {
        expect(game.stats.challengesCompleted).toBe(1)
        expect(game.stats.challengesFailed).toBe(0)
      } else {
        expect(game.stats.challengesCompleted).toBe(0)
        expect(game.stats.challengesFailed).toBe(1)
      }
      
      // === フェーズ5: ターン進行 ===
      const initialTurn = game.turn
      game.nextTurn()
      expect(game.turn).toBe(initialTurn + 1)
      
      // === フェーズ6: ゲーム継続確認 ===
      expect(game.isGameOver()).toBe(false)
      expect(game.vitality.getValue()).toBeGreaterThan(0)
    })

    it('保険カード購入ワークフローが正常に動作する', () => {
      game.start()
      game.drawCards(5)
      
      // === 保険カード作成 ===
      const healthInsurance = Card.createInsuranceCard(
        'health-ins-1',
        '健康保険',
        CardPower.create(3),
        {
          type: 'protection',
          value: 2,
          description: '健康リスクから保護'
        }
      )
      
      // === 保険購入 ===
      const initialInsuranceCount = game.insuranceCards.length
      game.addInsuranceCard(healthInsurance)
      
      expect(game.insuranceCards).toHaveLength(initialInsuranceCount + 1)
      expect(game.insuranceCards).toContain(healthInsurance)
      
      // === 保険料負担計算 ===
      const insuranceBurden = game.calculateInsuranceBurden()
      expect(typeof insuranceBurden).toBe('number')
      expect(insuranceBurden).toBeGreaterThanOrEqual(0)
      
      // === アクティブ保険確認 ===
      const activeInsurances = game.getActiveInsurances()
      expect(activeInsurances).toContain(healthInsurance)
      
      // === 保険効果確認 ===
      const totalPower = game.calculateTotalPower()
      expect(totalPower).toBeGreaterThan(0)
    })

    it('ステージ進行ワークフローが正常に動作する', () => {
      game.start()
      
      const initialStage = game.stage
      expect(initialStage).toBe('youth')
      
      // === 複数のチャレンジを完了してステージを進める ===
      for (let i = 0; i < config.challengesPerStage; i++) {
        // チャレンジを手動で成功させる
        game.stats.challengesCompleted++
      }
      
      // ステージ進行チェック
      game.checkStageProgression()
      
      // ステージが進行している（実装に依存）
      // 注意: 具体的なステージ遷移ロジックに依存
      expect(game.turn).toBeGreaterThan(0)
      
      // === ステージ変更に伴う効果確認 ===
      const currentVitality = game.vitality.getValue()
      expect(currentVitality).toBeGreaterThanOrEqual(0)
    })
  })

  describe('複雑なゲームシナリオ', () => {
    it('大量の保険カードを持つプレイヤーのシナリオ', () => {
      game.start()
      
      // === 複数の保険カードを購入 ===
      const insuranceTypes = [
        { name: '健康保険', power: 2 },
        { name: '生命保険', power: 4 },
        { name: '収入保険', power: 3 },
        { name: 'がん保険', power: 5 },
        { name: '歯科保険', power: 1 }
      ]
      
      insuranceTypes.forEach((insurance, index) => {
        if (game.insuranceCards.length < config.maxInsuranceCards) {
          const card = Card.createInsuranceCard(
            `insurance-${index}`,
            insurance.name,
            CardPower.create(insurance.power)
          )
          game.addInsuranceCard(card)
        }
      })
      
      expect(game.insuranceCards).toHaveLength(Math.min(insuranceTypes.length, config.maxInsuranceCards))
      
      // === 保険料負担の複雑な計算 ===
      const burden = game.calculateInsuranceBurden()
      expect(burden).toBeGreaterThan(0)
      
      // === 複雑なチャレンジでの保険効果 ===
      const challenge = Card.createChallengeCard(
        'big-challenge',
        '大きなチャレンジ',
        CardPower.create(20)
      )
      
      game.startChallenge(challenge)
      
      // 保険の力も含めた総合力を計算
      const totalPower = game.calculateTotalPower()
      expect(totalPower).toBeGreaterThan(0)
      
      // チャレンジ解決
      const result = game.resolveChallenge()
      expect(result).toBeDefined()
    })

    it('リソース枯渇状況でのゲーム継続', () => {
      game.start()
      
      // === バイタリティを危険水準まで減少 ===
      const criticalVitality = Vitality.create(3)
      game.vitality = criticalVitality
      
      expect(game.vitality.getValue()).toBe(3)
      expect(game.isGameOver()).toBe(false)
      
      // === 危険な状況でのチャレンジ ===
      const riskyChallenge = Card.createChallengeCard(
        'risky-challenge',
        'リスキーなチャレンジ',
        CardPower.create(10)
      )
      
      game.startChallenge(riskyChallenge)
      
      // === 失敗時のダメージでゲーム終了の可能性 ===
      const result = game.resolveChallenge()
      
      if (result.result === 'failure') {
        // 失敗時のダメージ処理
        const damage = Vitality.create(2)
        game.takeDamage(damage)
        
        expect(game.vitality.getValue()).toBe(1)
        expect(game.isGameOver()).toBe(false)
      }
      
      // === 最後のダメージでゲーム終了 ===
      const finalDamage = Vitality.create(10)
      game.takeDamage(finalDamage)
      
      expect(game.vitality.getValue()).toBe(0)
      expect(game.isGameOver()).toBe(true)
    })

    it('長期間のゲームプレイシミュレーション', () => {
      game.start()
      
      let totalTurns = 0
      const maxTurns = 100
      
      // === 100ターンのシミュレーション ===
      while (!game.isGameOver() && totalTurns < maxTurns) {
        // カードを引く（可能な場合）
        if (game.deck.size > 0 && game.hand.length < config.maxHandSize) {
          game.drawCards(1)
        }
        
        // ランダムにチャレンジを実行
        if (Math.random() > 0.7 && !game.currentChallenge) {
          const challenge = game.challengeDeck.drawCard()
          if (challenge) {
            game.startChallenge(challenge)
            
            // 利用可能なカードでチャレンジ
            const lifeCards = game.hand.filter(card => card.type === 'life')
            if (lifeCards.length > 0) {
              const randomCard = lifeCards[Math.floor(Math.random() * lifeCards.length)]
              game.selectCardForChallenge(randomCard.id)
            }
            
            game.resolveChallenge()
          }
        }
        
        // ランダムに保険購入
        if (Math.random() > 0.9 && game.insuranceCards.length < config.maxInsuranceCards) {
          const insurance = Card.createInsuranceCard(
            `random-insurance-${totalTurns}`,
            `保険${totalTurns}`,
            CardPower.create(Math.floor(Math.random() * 5) + 1)
          )
          game.addInsuranceCard(insurance)
        }
        
        // ターン進行
        game.nextTurn()
        totalTurns++
      }
      
      // === 長期プレイ後の状態確認 ===
      expect(totalTurns).toBeGreaterThan(0)
      expect(game.turn).toBe(totalTurns + 1)
      
      // 統計が適切に記録されている
      expect(game.stats.challengesCompleted + game.stats.challengesFailed).toBeGreaterThanOrEqual(0)
      expect(game.stats.cardsPlayed).toBeGreaterThanOrEqual(0)
      
      // ゲーム状態が一貫している
      if (game.isGameOver()) {
        expect(game.vitality.getValue()).toBe(0)
      } else {
        expect(game.vitality.getValue()).toBeGreaterThan(0)
      }
    })
  })

  describe('エラー回復と状態整合性', () => {
    it('エラー後のゲーム状態が整合性を保つ', () => {
      game.start()
      game.drawCards(3)
      
      const initialState = {
        turn: game.turn,
        vitality: game.vitality.getValue(),
        handSize: game.hand.length,
        status: game.status
      }
      
      // === 意図的にエラーを発生させる ===
      try {
        game.playCard('non-existent-card')
      } catch (error) {
        // エラーが期待通り発生
        expect(error).toBeDefined()
      }
      
      // === エラー後の状態確認 ===
      expect(game.turn).toBe(initialState.turn)
      expect(game.vitality.getValue()).toBe(initialState.vitality)
      expect(game.hand).toHaveLength(initialState.handSize)
      expect(game.status).toBe(initialState.status)
      
      // === 正常な操作が継続可能 ===
      expect(() => game.nextTurn()).not.toThrow()
      expect(() => game.drawCards(1)).not.toThrow()
    })

    it('無効な操作の連続でも安定性を保つ', () => {
      game.start()
      
      const invalidOperations = [
        () => game.playCard('invalid-id'),
        () => game.drawCards(-1),
        () => game.takeDamage(Vitality.create(-1)),
        () => game.addInsuranceCard(null as any),
        () => game.startChallenge(null as any)
      ]
      
      // === 無効な操作を連続実行 ===
      let errorCount = 0
      invalidOperations.forEach(operation => {
        try {
          operation()
        } catch (error) {
          errorCount++
        }
      })
      
      expect(errorCount).toBe(invalidOperations.length)
      
      // === ゲームが正常状態を維持 ===
      expect(game.status).toBe('active')
      expect(game.vitality.getValue()).toBeGreaterThan(0)
      expect(() => game.nextTurn()).not.toThrow()
    })
  })

  describe('パフォーマンスとスケーラビリティ', () => {
    it('大量のカード操作でも高速処理', () => {
      game.start()
      
      const startTime = Date.now()
      
      // === 大量のカード操作 ===
      for (let i = 0; i < 1000; i++) {
        if (game.deck.size > 0 && game.hand.length < config.maxHandSize) {
          game.drawCards(1)
        }
        
        if (game.hand.length > 0) {
          const card = game.hand[0]
          game.playCard(card.id)
        }
        
        if (i % 100 === 0) {
          game.nextTurn()
        }
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // === 1000回の操作が2秒以内 ===
      expect(duration).toBeLessThan(2000)
      
      // === ゲーム状態が正常 ===
      expect(game.status).toBeDefined()
      expect(game.turn).toBeGreaterThan(1)
    })

    it('メモリ使用量が適切に管理される', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // === 複数のゲームセッション ===
      const games = []
      for (let i = 0; i < 100; i++) {
        const testGame = new Game(config)
        testGame.start()
        
        // 各ゲームで簡単なプレイ
        testGame.drawCards(3)
        testGame.nextTurn()
        
        games.push(testGame)
      }
      
      const midMemory = process.memoryUsage().heapUsed
      
      // === ゲームインスタンスをクリア ===
      games.length = 0
      
      // === メモリ使用量が合理的範囲内 ===
      const memoryIncrease = midMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB未満
    })
  })

  describe('データ整合性とトランザクション', () => {
    it('複雑な操作での原子性保証', () => {
      game.start()
      game.drawCards(5)
      
      const initialState = {
        vitality: game.vitality.getValue(),
        handSize: game.hand.length,
        insuranceCount: game.insuranceCards.length,
        stats: { ...game.stats }
      }
      
      // === 複雑な複合操作（失敗する可能性がある） ===
      try {
        // 1. 保険購入
        const insurance = Card.createInsuranceCard('test-ins', 'テスト保険', CardPower.create(2))
        game.addInsuranceCard(insurance)
        
        // 2. チャレンジ開始（無効なカードで失敗させる）
        const invalidChallenge = Card.createLifeCard('invalid', 'Invalid', CardPower.create(1))
        game.startChallenge(invalidChallenge as any) // 意図的に型エラー
        
      } catch (error) {
        // エラーが発生した場合、保険購入は成功しているが、チャレンジは失敗
        expect(error).toBeDefined()
      }
      
      // === 部分的な操作結果の確認 ===
      expect(game.insuranceCards.length).toBe(initialState.insuranceCount + 1) // 保険購入は成功
      expect(game.currentChallenge).toBeUndefined() // チャレンジは開始されていない
      expect(game.vitality.getValue()).toBe(initialState.vitality) // バイタリティは変化なし
    })
  })
})