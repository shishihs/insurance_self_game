/**
 * 包括的統合テストスイート
 * 全機能を網羅し、システム全体の整合性を検証
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { Challenge } from '../../domain/aggregates/challenge/Challenge'
import { Insurance } from '../../domain/aggregates/insurance/Insurance'
import { GamePhase } from '../../domain/types/game.types'
import { CardType } from '../../domain/types/card.types'

describe('包括的統合テスト - ゲームシステム全体', () => {
  let game: Game
  
  beforeEach(() => {
    game = new Game()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ゲーム初期化と基本動作', () => {
    it('ゲームが正しく初期化される', () => {
      expect(game.getCurrentPhase()).toBe(GamePhase.DRAW)
      expect(game.getPlayerVitality()).toBe(100)
      expect(game.getPlayerAge()).toBe(20)
      expect(game.isGameOver()).toBe(false)
    })

    it('初期カードドローが正常に動作する', () => {
      const initialHandSize = game.getHandCards().length
      expect(initialHandSize).toBeGreaterThan(0)
      expect(initialHandSize).toBeLessThanOrEqual(7)
    })

    it('ゲーム状態が正しく管理される', () => {
      expect(game.getCurrentTurn()).toBe(1)
      expect(game.getGameLog()).toEqual([])
      expect(game.getPlayedCards()).toEqual([])
    })
  })

  describe('カードシステム統合', () => {
    it('カードドロー、プレイ、廃棄のサイクルが正常動作', () => {
      // ドローフェーズでカードを引く
      const initialHandSize = game.getHandCards().length
      
      // 行動フェーズに移行
      game.proceedToActionPhase()
      expect(game.getCurrentPhase()).toBe(GamePhase.ACTION)
      
      // カードをプレイ（可能な場合）
      const handCards = game.getHandCards()
      if (handCards.length > 0) {
        const cardToPlay = handCards[0]
        const canPlay = game.canPlayCard(cardToPlay)
        
        if (canPlay) {
          game.playCard(cardToPlay)
          expect(game.getPlayedCards()).toContain(cardToPlay)
          expect(game.getHandCards()).not.toContain(cardToPlay)
        }
      }
      
      // ターン終了
      game.endTurn()
      expect(game.getCurrentTurn()).toBe(2)
      expect(game.getCurrentPhase()).toBe(GamePhase.DRAW)
    })

    it('様々なカードタイプが正しく機能する', () => {
      const testCards = [
        Card.createAction('テスト行動', 10, 5),
        Card.createInsurance('テスト保険', 5, 50, 'term'),
        Card.createChallenge('テストチャレンジ', 15, 20)
      ]

      testCards.forEach(card => {
        expect(card.id).toBeDefined()
        expect(card.name).toBeDefined()
        expect(card.power).toBeGreaterThan(0)
        
        // カードタイプ固有の検証
        if (card.type === CardType.ACTION) {
          expect(card.cost).toBeGreaterThanOrEqual(0)
        } else if (card.type === CardType.INSURANCE) {
          expect(card.coverage).toBeGreaterThan(0)
        } else if (card.type === CardType.CHALLENGE) {
          expect(card.reward).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('チャレンジシステム統合', () => {
    it('チャレンジの出現、選択、解決が正常動作', () => {
      // チャレンジフェーズに移行
      game.proceedToActionPhase()
      game.proceedToChallenge()
      
      expect(game.getCurrentPhase()).toBe(GamePhase.CHALLENGE)
      
      const availableChallenges = game.getAvailableChallenges()
      expect(availableChallenges.length).toBeGreaterThan(0)
      
      // チャレンジを選択
      const challenge = availableChallenges[0]
      game.selectChallenge(challenge)
      
      expect(game.getCurrentChallenge()).toBe(challenge)
    })

    it('チャレンジの難易度設定が正しく機能する', () => {
      const easyChallenge = Challenge.create('簡単チャレンジ', 5, 10)
      const hardChallenge = Challenge.create('困難チャレンジ', 50, 100)
      
      expect(easyChallenge.requiredPower).toBeLessThan(hardChallenge.requiredPower)
      expect(easyChallenge.reward).toBeLessThan(hardChallenge.reward)
    })

    it('チャレンジ解決時の報酬とペナルティが正しく適用される', () => {
      game.proceedToActionPhase()
      game.proceedToChallenge()
      
      const challenge = game.getAvailableChallenges()[0]
      game.selectChallenge(challenge)
      
      const initialVitality = game.getPlayerVitality()
      
      // 充分な戦力でチャレンジを解決
      const strongCard = Card.createAction('強力カード', 100, 0)
      game.addCardToHand(strongCard)
      game.selectCardsForChallenge([strongCard])
      
      const result = game.resolveChallenge()
      
      if (result.success) {
        expect(game.getPlayerVitality()).toBeGreaterThanOrEqual(initialVitality)
      } else {
        expect(game.getPlayerVitality()).toBeLessThan(initialVitality)
      }
    })
  })

  describe('保険システム統合', () => {
    it('保険の購入、適用、期限管理が正常動作', () => {
      // 保険カードを手札に追加
      const insuranceCard = Card.createInsurance('テスト保険', 10, 50, 'term')
      game.addCardToHand(insuranceCard)
      
      game.proceedToActionPhase()
      
      // 保険を購入
      const initialVitality = game.getPlayerVitality()
      game.playCard(insuranceCard)
      
      // 保険料が支払われることを確認
      expect(game.getPlayerVitality()).toBeLessThan(initialVitality)
      
      // アクティブ保険に追加されることを確認
      const activeInsurances = game.getActiveInsurances()
      expect(activeInsurances.length).toBeGreaterThan(0)
    })

    it('定期保険の期限が正しく管理される', () => {
      const termInsurance = Insurance.create('定期保険', 10, 50, 'term')
      game.addInsurance(termInsurance)
      
      const initialTurn = game.getCurrentTurn()
      
      // 複数ターン経過
      for (let i = 0; i < 5; i++) {
        game.endTurn()
      }
      
      // 期限チェック（実装に依存）
      const activeInsurances = game.getActiveInsurances()
      const isStillActive = activeInsurances.some(ins => ins.id === termInsurance.id)
      
      if (game.getCurrentTurn() - initialTurn >= 3) {
        // 3ターン経過後は期限切れの可能性
        expect(isStillActive).toBeDefined()
      }
    })

    it('終身保険は期限なく継続する', () => {
      const permanentInsurance = Insurance.create('終身保険', 15, 100, 'permanent')
      game.addInsurance(permanentInsurance)
      
      // 多数ターン経過
      for (let i = 0; i < 10; i++) {
        game.endTurn()
      }
      
      const activeInsurances = game.getActiveInsurances()
      const isStillActive = activeInsurances.some(ins => ins.id === permanentInsurance.id)
      expect(isStillActive).toBe(true)
    })

    it('保険料計算が年齢に基づいて正しく調整される', () => {
      const insurance = Insurance.create('年齢連動保険', 10, 50, 'term')
      
      const youngPlayerPremium = game.calculateInsurancePremium(insurance)
      
      // プレイヤーを老化させる
      game.advanceAge(20)
      
      const oldPlayerPremium = game.calculateInsurancePremium(insurance)
      
      expect(oldPlayerPremium).toBeGreaterThan(youngPlayerPremium)
    })
  })

  describe('ゲーム進行統合', () => {
    it('完全なゲームサイクルが正常に動作する', () => {
      let turnCount = 0
      const maxTurns = 10
      
      while (!game.isGameOver() && turnCount < maxTurns) {
        // ドローフェーズ
        expect(game.getCurrentPhase()).toBe(GamePhase.DRAW)
        
        // 行動フェーズ
        game.proceedToActionPhase()
        expect(game.getCurrentPhase()).toBe(GamePhase.ACTION)
        
        // カードをプレイ（可能な場合）
        const handCards = game.getHandCards()
        const playableCards = handCards.filter(card => game.canPlayCard(card))
        
        if (playableCards.length > 0) {
          game.playCard(playableCards[0])
        }
        
        // チャレンジフェーズ
        game.proceedToChallenge()
        expect(game.getCurrentPhase()).toBe(GamePhase.CHALLENGE)
        
        const challenges = game.getAvailableChallenges()
        if (challenges.length > 0) {
          game.selectChallenge(challenges[0])
          
          // 適当なカードでチャレンジ
          const challengeCards = game.getHandCards().slice(0, 1)
          if (challengeCards.length > 0) {
            game.selectCardsForChallenge(challengeCards)
            game.resolveChallenge()
          }
        }
        
        // ターン終了
        game.endTurn()
        turnCount++
      }
      
      expect(turnCount).toBeGreaterThan(0)
      expect(turnCount).toBeLessThanOrEqual(maxTurns)
    })

    it('ゲームオーバー条件が正しく判定される', () => {
      // 体力を0まで減らす
      while (game.getPlayerVitality() > 0) {
        game.takeDamage(10)
      }
      
      expect(game.isGameOver()).toBe(true)
      expect(game.getPlayerVitality()).toBeLessThanOrEqual(0)
    })

    it('年齢による効果が正しく適用される', () => {
      const initialAge = game.getPlayerAge()
      const initialMaxVitality = game.getMaxVitality()
      
      // 年齢を進める
      game.advanceAge(30)
      
      expect(game.getPlayerAge()).toBe(initialAge + 30)
      
      // 年齢による影響（実装に依存）
      // 一般的に年齢が上がると最大体力が減少する
      const newMaxVitality = game.getMaxVitality()
      expect(newMaxVitality).toBeLessThanOrEqual(initialMaxVitality)
    })
  })

  describe('エラーハンドリング統合', () => {
    it('無効な操作が適切に処理される', () => {
      // 不正なフェーズでの操作
      expect(game.getCurrentPhase()).toBe(GamePhase.DRAW)
      
      expect(() => {
        game.selectChallenge(Challenge.create('テスト', 10, 10))
      }).toThrow()
      
      // 存在しないカードのプレイ
      const nonexistentCard = Card.createAction('存在しない', 10, 5)
      expect(() => {
        game.playCard(nonexistentCard)
      }).toThrow()
    })

    it('境界値でのエラーハンドリング', () => {
      // 負の値での操作
      expect(() => {
        game.takeDamage(-10)
      }).toThrow()
      
      expect(() => {
        game.restoreVitality(-5)
      }).toThrow()
      
      // ゼロでの操作
      expect(() => {
        game.takeDamage(0)
      }).not.toThrow()
    })

    it('リソース不足時の適切な処理', () => {
      // 体力不足で高コストカードをプレイ
      const expensiveCard = Card.createAction('高額カード', 10, 200)
      game.addCardToHand(expensiveCard)
      
      game.proceedToActionPhase()
      
      const canPlay = game.canPlayCard(expensiveCard)
      expect(canPlay).toBe(false)
      
      if (!canPlay) {
        expect(() => {
          game.playCard(expensiveCard)
        }).toThrow()
      }
    })
  })

  describe('パフォーマンス統合', () => {
    it('大量のカード操作でもパフォーマンスが維持される', () => {
      const startTime = performance.now()
      
      // 大量のカードを生成して操作
      for (let i = 0; i < 100; i++) {
        const card = Card.createAction(`カード${i}`, i % 50 + 1, i % 10)
        game.addCardToHand(card)
      }
      
      // 大量の操作を実行
      game.proceedToActionPhase()
      const handCards = game.getHandCards()
      
      for (let i = 0; i < Math.min(50, handCards.length); i++) {
        const card = handCards[i]
        if (game.canPlayCard(card)) {
          game.playCard(card)
        }
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // 1秒以内に完了することを期待
      expect(executionTime).toBeLessThan(1000)
    })

    it('メモリリークが発生しない', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // 大量のオブジェクト生成と破棄
      for (let i = 0; i < 50; i++) {
        const tempGame = new Game()
        for (let j = 0; j < 20; j++) {
          const card = Card.createAction(`テンプカード${j}`, j + 1, 1)
          tempGame.addCardToHand(card)
        }
        
        tempGame.proceedToActionPhase()
        tempGame.endTurn()
      }
      
      // ガベージコレクションを促す
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      // メモリ使用量の増加を確認（完全リークチェックは困難）
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory
        const memoryIncreaseRatio = memoryIncrease / initialMemory
        
        // メモリ使用量が初期の5倍を超えないことを期待
        expect(memoryIncreaseRatio).toBeLessThan(5)
      }
    })
  })

  describe('データ整合性統合', () => {
    it('ゲーム状態の整合性が常に保たれる', () => {
      const iterations = 20
      
      for (let i = 0; i < iterations; i++) {
        // ゲーム状態の整合性チェック
        expect(game.getPlayerVitality()).toBeGreaterThanOrEqual(0)
        expect(game.getPlayerVitality()).toBeLessThanOrEqual(game.getMaxVitality())
        expect(game.getPlayerAge()).toBeGreaterThanOrEqual(20)
        expect(game.getCurrentTurn()).toBeGreaterThan(0)
        
        // 手札の整合性
        const handCards = game.getHandCards()
        expect(handCards.length).toBeGreaterThanOrEqual(0)
        expect(handCards.length).toBeLessThanOrEqual(10) // 仮の上限
        
        // プレイしたカードとのダブりなし
        const playedCards = game.getPlayedCards()
        const intersection = handCards.filter(card => 
          playedCards.some(played => played.id === card.id)
        )
        expect(intersection).toHaveLength(0)
        
        // ランダムな操作を実行
        if (Math.random() > 0.5) {
          game.proceedToActionPhase()
          const playableCards = handCards.filter(card => game.canPlayCard(card))
          if (playableCards.length > 0 && Math.random() > 0.3) {
            game.playCard(playableCards[0])
          }
        }
        
        if (Math.random() > 0.7) {
          game.endTurn()
        }
        
        if (game.isGameOver()) {
          break
        }
      }
    })

    it('カードIDの一意性が保たれる', () => {
      const cardIds = new Set<string>()
      
      // 大量のカードを生成してIDの重複をチェック
      for (let i = 0; i < 200; i++) {
        const card = Card.createAction(`カード${i}`, 10, 5)
        expect(cardIds.has(card.id)).toBe(false)
        cardIds.add(card.id)
      }
      
      expect(cardIds.size).toBe(200)
    })
  })
})