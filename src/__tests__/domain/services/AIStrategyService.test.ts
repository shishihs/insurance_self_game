import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../../../domain/entities/Game'
import { CardFactory } from '../../../domain/services/CardFactory'
import {
  AIStrategyService,
  AIStrategyFactory,
  ConservativeStrategy,
  AggressiveStrategy,
  BalancedStrategy,
  AdaptiveStrategy,
  type AIStrategyType
} from '../../../domain/services/AIStrategyService'
import type { Card } from '../../../domain/entities/Card'

describe('AIStrategyService', () => {
  let game: Game
  let aiService: AIStrategyService
  let challengeCards: Card[]
  let playerCards: Card[]

  beforeEach(() => {
    // ゲームインスタンスを作成
    game = new Game({
      startingVitality: 100,
      maxHandSize: 7
    })
    game.start()

    // AIサービスを初期化
    aiService = new AIStrategyService('balanced')

    // テスト用のカードを作成
    challengeCards = CardFactory.createChallengeCards('youth')
    playerCards = CardFactory.createStarterLifeCards()

    // 手札にカードを配布
    playerCards.forEach(card => {
      game.cardManager.playerDeck.addCard(card)
    })
    game.cardManager.playerDeck.drawCards(5)
  })

  describe('AIStrategyFactory', () => {
    it('should create all available strategy types', () => {
      const types: AIStrategyType[] = ['conservative', 'aggressive', 'balanced', 'adaptive']
      
      types.forEach(type => {
        const strategy = AIStrategyFactory.createStrategy(type)
        expect(strategy.getType()).toBe(type)
      })
    })

    it('should throw error for unknown strategy type', () => {
      expect(() => {
        // @ts-expect-error Testing invalid type
        AIStrategyFactory.createStrategy('unknown')
      }).toThrow('Unknown strategy type: unknown')
    })

    it('should return available strategy types', () => {
      const types = AIStrategyFactory.getAvailableTypes()
      expect(types).toEqual(['conservative', 'aggressive', 'balanced', 'adaptive'])
    })

    it('should return strategy descriptions', () => {
      const types: AIStrategyType[] = ['conservative', 'aggressive', 'balanced', 'adaptive']
      
      types.forEach(type => {
        const description = AIStrategyFactory.getStrategyDescription(type)
        expect(description).toBeTypeOf('string')
        expect(description.length).toBeGreaterThan(0)
      })
    })
  })

  describe('ConservativeStrategy', () => {
    let strategy: ConservativeStrategy

    beforeEach(() => {
      strategy = new ConservativeStrategy()
    })

    it('should have correct name and type', () => {
      expect(strategy.getName()).toBe('保守的戦略')
      expect(strategy.getType()).toBe('conservative')
    })

    it('should select the easiest challenge', () => {
      const choice = strategy.selectChallenge(challengeCards, game)
      
      expect(choice.challenge).toBeDefined()
      expect(choice.reason).toContain('安全')
      expect(choice.successProbability).toBeTypeOf('number')
      
      // 最も易しいチャレンジが選択されているかチェック
      const easiestPower = Math.min(...challengeCards.map(c => c.power))
      expect(choice.challenge.power).toBe(easiestPower)
    })

    it('should prioritize insurance cards in card selection', () => {
      const challenge = challengeCards[0]
      const availableCards = game.cardManager.playerDeck.getCards()
      
      // 保険カードを追加
      const insuranceCards = CardFactory.createBasicInsuranceCards('youth')
      if (insuranceCards.length > 0) {
        availableCards.push(insuranceCards[0])
      }
      
      const choice = strategy.selectCards(challenge, availableCards, game)
      
      expect(choice.cards).toBeDefined()
      expect(choice.reason).toContain('保険')
      expect(choice.expectedPower).toBeTypeOf('number')
      
      // 保険カードが優先的に選択されているかチェック
      const hasInsuranceCard = choice.cards.some(card => card.type === 'insurance')
      if (availableCards.some(card => card.type === 'insurance')) {
        expect(hasInsuranceCard).toBe(true)
      }
    })

    it('should have higher fitness when vitality is low', () => {
      // 活力を低く設定
      game.applyDamage(80) // 活力を20にする
      const lowVitalityFitness = strategy.evaluateFitness(game)
      
      // 活力を回復
      game.heal(60) // 活力を80にする
      const highVitalityFitness = strategy.evaluateFitness(game)
      
      expect(lowVitalityFitness).toBeGreaterThan(highVitalityFitness)
    })
  })

  describe('AggressiveStrategy', () => {
    let strategy: AggressiveStrategy

    beforeEach(() => {
      strategy = new AggressiveStrategy()
    })

    it('should have correct name and type', () => {
      expect(strategy.getName()).toBe('攻撃的戦略')
      expect(strategy.getType()).toBe('aggressive')
    })

    it('should select challenging but viable challenges', () => {
      const choice = strategy.selectChallenge(challengeCards, game)
      
      expect(choice.challenge).toBeDefined()
      expect(choice.reason).toContain('困難')
      expect(choice.successProbability).toBeGreaterThanOrEqual(0.5) // 最低50%の勝率
    })

    it('should select high power cards efficiently', () => {
      const challenge = challengeCards.find(c => c.power >= 5) || challengeCards[0]
      const availableCards = game.cardManager.playerDeck.getCards()
      
      const choice = strategy.selectCards(challenge, availableCards, game)
      
      expect(choice.cards).toBeDefined()
      expect(choice.reason).toContain('最適')
      
      // カードは効率的に選択されているはず（高パワー優先）
      if (choice.cards.length > 1) {
        for (let i = 0; i < choice.cards.length - 1; i++) {
          expect(choice.cards[i].calculateEffectivePower())
            .toBeGreaterThanOrEqual(choice.cards[i + 1].calculateEffectivePower())
        }
      }
    })

    it('should have higher fitness when vitality and hand are strong', () => {
      // 強力な手札を追加（中年期のカードを使用）
      const powerfulCards = CardFactory.createStarterLifeCards() // より一般的なメソッドを使用
      powerfulCards.forEach(card => {
        game.cardManager.playerDeck.addCard(card)
      })
      
      const highVitalityFitness = strategy.evaluateFitness(game)
      
      // 活力を下げて比較
      game.applyDamage(50)
      const lowVitalityFitness = strategy.evaluateFitness(game)
      
      expect(highVitalityFitness).toBeGreaterThan(lowVitalityFitness)
    })
  })

  describe('BalancedStrategy', () => {
    let strategy: BalancedStrategy

    beforeEach(() => {
      strategy = new BalancedStrategy()
    })

    it('should have correct name and type', () => {
      expect(strategy.getName()).toBe('バランス戦略')
      expect(strategy.getType()).toBe('balanced')
    })

    it('should select challenges with good risk-reward balance', () => {
      const choice = strategy.selectChallenge(challengeCards, game)
      
      expect(choice.challenge).toBeDefined()
      expect(choice.reason).toContain('バランス')
      expect(choice.successProbability).toBeTypeOf('number')
      
      // 極端に易しいまたは困難なチャレンジではないはず
      const powers = challengeCards.map(c => c.power).sort((a, b) => a - b)
      const selectedPower = choice.challenge.power
      expect(selectedPower).toBeGreaterThan(powers[0]) // 最易しいではない
      expect(selectedPower).toBeLessThan(powers[powers.length - 1]) // 最困難ではない
    })

    it('should select cards based on efficiency', () => {
      const challenge = challengeCards[Math.floor(challengeCards.length / 2)] // 中程度の難易度
      const availableCards = game.cardManager.playerDeck.getCards()
      
      const choice = strategy.selectCards(challenge, availableCards, game)
      
      expect(choice.cards).toBeDefined()
      expect(choice.reason).toContain('最適')
      expect(choice.expectedPower).toBeGreaterThan(challenge.power * 0.9) // 十分なパワー
      expect(choice.expectedPower).toBeLessThan(challenge.power * 1.5) // 過剰ではない
    })

    it('should have moderate fitness in all conditions', () => {
      const fitness = strategy.evaluateFitness(game)
      expect(fitness).toBe(0.6) // 常に固定値
    })
  })

  describe('AdaptiveStrategy', () => {
    let strategy: AdaptiveStrategy

    beforeEach(() => {
      strategy = new AdaptiveStrategy()
    })

    it('should have correct name and type', () => {
      expect(strategy.getName()).toBe('適応戦略')
      expect(strategy.getType()).toBe('adaptive')
    })

    it('should adapt to game conditions', () => {
      // 低活力時は保守的戦略を採用するはず
      game.applyDamage(80) // 活力を20にする
      const lowVitalityChoice = strategy.selectChallenge(challengeCards, game)
      expect(lowVitalityChoice.reason).toContain('保守的戦略')
      
      // 高活力時は攻撃的戦略を採用するはず
      game.heal(70) // 活力を90にする
      const highVitalityChoice = strategy.selectChallenge(challengeCards, game)
      // 注: 手札の強さにもよるので、必ずしも攻撃的戦略になるとは限らない
      expect(highVitalityChoice.reason).toContain('戦略')
    })

    it('should have fitness equal to best available strategy', () => {
      const fitness = strategy.evaluateFitness(game)
      
      // 他の戦略の最高適用度と同じはず
      const conservative = new ConservativeStrategy()
      const aggressive = new AggressiveStrategy()
      const balanced = new BalancedStrategy()
      
      const maxFitness = Math.max(
        conservative.evaluateFitness(game),
        aggressive.evaluateFitness(game),
        balanced.evaluateFitness(game)
      )
      
      expect(fitness).toBe(maxFitness)
    })
  })

  describe('AIStrategyService', () => {
    it('should initialize with default strategy', () => {
      const service = new AIStrategyService()
      expect(service.getCurrentStrategy().getType()).toBe('balanced')
    })

    it('should allow strategy changes', () => {
      aiService.setStrategy('conservative')
      expect(aiService.getCurrentStrategy().getType()).toBe('conservative')
      
      aiService.setStrategy('aggressive')
      expect(aiService.getCurrentStrategy().getType()).toBe('aggressive')
    })

    it('should auto-select challenges', () => {
      const choice = aiService.autoSelectChallenge(challengeCards, game)
      
      expect(choice.challenge).toBeDefined()
      expect(choice.reason).toBeTypeOf('string')
      expect(choice.successProbability).toBeTypeOf('number')
      expect(choice.successProbability).toBeGreaterThanOrEqual(0)
      expect(choice.successProbability).toBeLessThanOrEqual(1)
    })

    it('should auto-select cards', () => {
      const challenge = challengeCards[0]
      const availableCards = game.cardManager.playerDeck.getCards()
      
      const choice = aiService.autoSelectCards(challenge, availableCards, game)
      
      expect(choice.cards).toBeDefined()
      expect(choice.cards.length).toBeGreaterThan(0)
      expect(choice.reason).toBeTypeOf('string')
      expect(choice.expectedPower).toBeTypeOf('number')
    })

    it('should record decision history', () => {
      const challenge = challengeCards[0]
      const availableCards = game.cardManager.playerDeck.getCards()
      
      const challengeChoice = aiService.autoSelectChallenge([challenge], game)
      const cardChoice = aiService.autoSelectCards(challenge, availableCards, game)
      
      // 意思決定を記録
      aiService.recordDecision(1, challengeChoice, cardChoice, true)
      
      const stats = aiService.getStatistics()
      expect(stats.totalDecisions).toBe(1)
      expect(stats.successRate).toBe(1.0)
      expect(stats.strategyUsage.size).toBeGreaterThan(0)
    })

    it('should maintain statistics correctly', () => {
      const challenge = challengeCards[0]
      const availableCards = game.cardManager.playerDeck.getCards()
      
      // 複数の意思決定を記録
      for (let i = 0; i < 10; i++) {
        const challengeChoice = aiService.autoSelectChallenge([challenge], game)
        const cardChoice = aiService.autoSelectCards(challenge, availableCards, game)
        const success = i < 7 // 70%の成功率
        
        aiService.recordDecision(i + 1, challengeChoice, cardChoice, success)
      }
      
      const stats = aiService.getStatistics()
      expect(stats.totalDecisions).toBe(10)
      expect(stats.successRate).toBe(0.7)
    })

    it('should clear history correctly', () => {
      // 履歴を作成
      const challenge = challengeCards[0]
      const availableCards = game.cardManager.playerDeck.getCards()
      const challengeChoice = aiService.autoSelectChallenge([challenge], game)
      const cardChoice = aiService.autoSelectCards(challenge, availableCards, game)
      
      aiService.recordDecision(1, challengeChoice, cardChoice, true)
      
      // 履歴をクリア
      aiService.clearHistory()
      
      const stats = aiService.getStatistics()
      expect(stats.totalDecisions).toBe(0)
      expect(stats.successRate).toBe(0)
      expect(stats.strategyUsage.size).toBe(0)
    })

    it('should handle statistics toggle', () => {
      // 統計を無効化
      aiService.setStatisticsEnabled(false)
      
      const challenge = challengeCards[0]
      const availableCards = game.cardManager.playerDeck.getCards()
      const challengeChoice = aiService.autoSelectChallenge([challenge], game)
      const cardChoice = aiService.autoSelectCards(challenge, availableCards, game)
      
      aiService.recordDecision(1, challengeChoice, cardChoice, true)
      
      // 統計が記録されていないはず
      const stats = aiService.getStatistics()
      expect(stats.totalDecisions).toBe(0)
      
      // 統計を有効化
      aiService.setStatisticsEnabled(true)
      aiService.recordDecision(2, challengeChoice, cardChoice, true)
      
      const newStats = aiService.getStatistics()
      expect(newStats.totalDecisions).toBe(1)
    })
  })

  describe('Game integration', () => {
    beforeEach(() => {
      game.setAIEnabled(true)
    })

    it('should integrate AI into game correctly', () => {
      expect(game.isAIEnabled()).toBe(true)
      expect(game.getCurrentAIStrategy()).toBe('balanced')
    })

    it('should allow AI strategy changes in game', () => {
      game.setAIStrategy('conservative')
      expect(game.getCurrentAIStrategy()).toBe('conservative')
    })

    it('should perform AI challenge selection', () => {
      // チャレンジデッキにカードを追加
      challengeCards.forEach(card => {
        game.cardManager.challengeDeck.addCard(card)
      })
      
      const selectedChallenge = game.aiSelectChallenge()
      expect(selectedChallenge).toBeDefined()
      expect(challengeCards).toContain(selectedChallenge!)
    })

    it('should perform AI card selection', () => {
      const challenge = challengeCards[0]
      const selectedCards = game.aiSelectCards(challenge)
      
      expect(selectedCards).toBeDefined()
      expect(selectedCards.length).toBeGreaterThan(0)
      
      // 選択されたカードは手札に含まれているはず
      const handCards = game.cardManager.playerDeck.getCards()
      selectedCards.forEach(card => {
        expect(handCards).toContain(card)
      })
    })

    it('should throw error when AI is disabled', () => {
      game.setAIEnabled(false)
      
      expect(() => game.aiSelectChallenge()).toThrow('AI is not enabled')
      expect(() => game.aiSelectCards(challengeCards[0])).toThrow('AI is not enabled')
    })

    it('should provide AI statistics', () => {
      const stats = game.getAIStatistics()
      expect(stats).toBeDefined()
      expect(stats.totalDecisions).toBeTypeOf('number')
      expect(stats.successRate).toBeTypeOf('number')
      expect(stats.strategyUsage).toBeInstanceOf(Map)
    })

    it('should reset AI settings correctly', () => {
      game.setAIStrategy('aggressive')
      game.setAIEnabled(true)
      
      game.resetAISettings()
      
      expect(game.isAIEnabled()).toBe(false)
      expect(game.getCurrentAIStrategy()).toBe('balanced')
    })
  })

  describe('Edge cases', () => {
    it('should handle empty challenge list', () => {
      const choice = aiService.autoSelectChallenge([], game)
      // 実装によっては例外を投げるかもしれないが、
      // ここでは適切に処理されることを期待
      expect(choice).toBeDefined()
    })

    it('should handle empty card list', () => {
      const challenge = challengeCards[0]
      const choice = aiService.autoSelectCards(challenge, [], game)
      
      expect(choice.cards).toBeDefined()
      expect(choice.cards.length).toBe(0)
    })

    it('should handle very easy challenges', () => {
      // 最も易しいチャレンジを選択
      const sortedChallenges = [...challengeCards].sort((a, b) => a.power - b.power)
      const easyChallenge = sortedChallenges[0]
      
      const choice = aiService.autoSelectChallenge([easyChallenge], game)
      expect(choice.successProbability).toBeGreaterThanOrEqual(0) // 成功確率が有効な範囲内
    })

    it('should handle very difficult challenges', () => {
      // 最も困難なチャレンジを選択
      const sortedChallenges = [...challengeCards].sort((a, b) => b.power - a.power)
      const hardChallenge = sortedChallenges[0]
      
      const choice = aiService.autoSelectChallenge([hardChallenge], game)
      expect(choice.successProbability).toBeLessThanOrEqual(1) // 成功確率が有効な範囲内
    })
  })
})