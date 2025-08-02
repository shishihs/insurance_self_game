import { beforeEach, describe, expect, it } from 'vitest'
import { Game } from '../Game'
import { Card } from '../Card'
import { CardFactory } from '../../services/CardFactory'
import type { GameConfig } from '../../types/game.types'

describe('Game - Insurance Type Selection System', () => {
  let game: Game
  let config: GameConfig

  beforeEach(() => {
    config = {
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 3
    }
    game = new Game(config)
    game.start()
  })

  describe('Insurance Type Choice Generation', () => {
    it('should generate insurance type choices on challenge success', () => {
      // セットアップ: チャレンジを設定
      const challengeCard = new Card({
        id: 'challenge_1',
        name: 'テストチャレンジ',
        description: 'テスト用のチャレンジ',
        type: 'life',
        power: 5,
        cost: 0,
        effects: []
      })

      // 強力な手札を設定
      const strongCard = new Card({
        id: 'strong_1',
        name: '強力なカード',
        description: 'テスト用の強力なカード',
        type: 'life',
        power: 10,
        cost: 1,
        effects: []
      })

      game.setHand([strongCard])
      game.startChallenge(challengeCard)
      game.toggleCardSelection(strongCard)

      // チャレンジを解決
      const result = game.resolveChallenge()

      // 成功して保険種類選択肢が生成されることを確認
      expect(result.success).toBe(true)
      expect(result.insuranceTypeChoices).toBeDefined()
      expect(result.insuranceTypeChoices).toHaveLength(3)
      expect(game.phase).toBe('insurance_type_selection')
    })

    it('should provide both term and whole life options for each insurance type', () => {
      // 保険種類選択肢を直接生成してテスト
      const choices = CardFactory.createInsuranceTypeChoices('youth')

      expect(choices).toHaveLength(3)
      
      choices.forEach(choice => {
        // 各選択肢が必要なプロパティを持つことを確認
        expect(choice.insuranceType).toBeDefined()
        expect(choice.name).toBeDefined()
        expect(choice.description).toBeDefined()
        expect(choice.baseCard).toBeDefined()
        expect(choice.termOption).toBeDefined()
        expect(choice.wholeLifeOption).toBeDefined()

        // 定期保険の方が安いことを確認
        expect(choice.termOption.cost).toBeLessThan(choice.wholeLifeOption.cost)
        
        // 定期保険には期間が設定されていることを確認
        expect(choice.termOption.duration).toBeGreaterThan(0)
      })
    })
  })

  describe('Insurance Type Selection', () => {
    beforeEach(() => {
      // 保険種類選択フェーズに設定
      game.setPhase('insurance_type_selection')
      game.insuranceTypeChoices = CardFactory.createInsuranceTypeChoices('youth')
    })

    it('should successfully select term insurance', () => {
      const firstChoice = game.insuranceTypeChoices![0]
      
      const result = game.selectInsuranceType(firstChoice.insuranceType, 'term')

      expect(result.success).toBe(true)
      expect(result.selectedCard).toBeDefined()
      expect(result.selectedCard!.isTermInsurance()).toBe(true)
      expect(result.selectedCard!.remainingTurns).toBe(firstChoice.termOption.duration)
      expect(result.selectedCard!.cost).toBe(firstChoice.termOption.cost)
      expect(game.phase).toBe('resolution')
    })

    it('should successfully select whole life insurance', () => {
      const firstChoice = game.insuranceTypeChoices![0]
      
      const result = game.selectInsuranceType(firstChoice.insuranceType, 'whole_life')

      expect(result.success).toBe(true)
      expect(result.selectedCard).toBeDefined()
      expect(result.selectedCard!.isWholeLifeInsurance()).toBe(true)
      expect(result.selectedCard!.remainingTurns).toBeUndefined()
      expect(result.selectedCard!.cost).toBe(firstChoice.wholeLifeOption.cost)
      expect(game.phase).toBe('resolution')
    })

    it('should add selected insurance to active insurance list', () => {
      const firstChoice = game.insuranceTypeChoices![0]
      
      const initialInsuranceCount = game.insuranceCards.length
      game.selectInsuranceType(firstChoice.insuranceType, 'term')

      expect(game.insuranceCards.length).toBe(initialInsuranceCount + 1)
      expect(game.getActiveInsurances().length).toBe(initialInsuranceCount + 1)
    })

    it('should update insurance burden after selection', () => {
      const firstChoice = game.insuranceTypeChoices![0]
      
      // const initialBurden = game.insuranceBurden
      game.selectInsuranceType(firstChoice.insuranceType, 'term')

      // 保険が追加されたので負担が計算されるはず
      const newBurden = game.calculateInsuranceBurden()
      expect(game.insuranceBurden).toBe(newBurden)
    })

    it('should fail with invalid insurance type', () => {
      const result = game.selectInsuranceType('invalid_type', 'term')

      expect(result.success).toBe(false)
      expect(result.message).toContain('Invalid insurance type selection')
      expect(game.phase).toBe('insurance_type_selection') // フェーズは変わらない
    })

    it('should fail when not in insurance type selection phase', () => {
      game.setPhase('draw')

      expect(() => {
        game.selectInsuranceType('medical', 'term')
      }).toThrow('Not in insurance type selection phase')
    })
  })

  describe('Term Insurance Expiration', () => {
    it('should properly handle term insurance expiration', () => {
      // 定期保険を追加（短い期間で）
      const termInsurance = CardFactory.createTermInsuranceCard({
        insuranceType: 'medical',
        name: 'テスト医療保険',
        description: 'テスト用',
        baseCard: {
          name: 'テスト医療保険',
          description: 'テスト用',
          type: 'insurance',
          power: 5,
          cost: 3,
          insuranceType: 'medical',
          coverage: 100,
          effects: [],
          ageBonus: 0
        },
        termOption: {
          cost: 3,
          duration: 2,
          description: '2ターン限定'
        },
        wholeLifeOption: {
          cost: 5,
          description: '永続保障'
        }
      })

      // 残りターン数を2に設定
      termInsurance.remainingTurns = 2
      game.insuranceCards.push(termInsurance)

      expect(game.insuranceCards.length).toBe(1)
      expect(termInsurance.isExpired()).toBe(false)

      // 1ターン経過
      game.nextTurn()
      expect(termInsurance.remainingTurns).toBe(1)
      expect(termInsurance.isExpired()).toBe(false)

      // もう1ターン経過（期限切れになるはず）
      const turnResult = game.nextTurn()
      expect(termInsurance.remainingTurns).toBe(0)
      expect(termInsurance.isExpired()).toBe(true)
      expect(turnResult.newExpiredCount).toBe(1)
      expect(game.insuranceCards.length).toBe(0) // アクティブリストから削除
      expect(game.expiredInsurances.length).toBe(1) // 期限切れリストに移動
    })
  })

  describe('Cost Differences', () => {
    it('should ensure term insurance costs less than whole life insurance', () => {
      const choices = CardFactory.createInsuranceTypeChoices('youth')

      choices.forEach(choice => {
        const termCard = CardFactory.createTermInsuranceCard(choice)
        const wholeLifeCard = CardFactory.createWholeLifeInsuranceCard(choice)

        expect(termCard.cost).toBeLessThan(wholeLifeCard.cost)
        expect(termCard.power).toBe(wholeLifeCard.power) // パワーは同じ
        expect(termCard.coverage).toBe(wholeLifeCard.coverage) // 保障額も同じ
      })
    })
  })
})