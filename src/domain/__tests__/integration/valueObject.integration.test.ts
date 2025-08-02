import { beforeEach, describe, expect, it } from 'vitest'
import { Card } from '../../entities/Card'
import { Game } from '../../entities/Game'
import { CardPower } from '../../valueObjects/CardPower'
import { InsurancePremium } from '../../valueObjects/InsurancePremium'
import { Vitality } from '../../valueObjects/Vitality'
import { CardFactory } from '../../services/CardFactory'

describe('値オブジェクト統合テスト', () => {
  let game: Game
  let cardFactory: CardFactory

  beforeEach(() => {
    game = new Game()
    cardFactory = new CardFactory()
  })

  describe('Card エンティティと値オブジェクトの統合', () => {
    it('Cardが値オブジェクトを正しく保持し、getterが動作する', () => {
      const card = new Card({
        id: 'test-1',
        name: 'テストカード',
        description: '値オブジェクトテスト用',
        type: 'life',
        power: 10,
        cost: 5,
        effects: []
      })

      // 後方互換性のためのnumber型getter
      expect(card.power).toBe(10)
      expect(card.cost).toBe(5)

      // 値オブジェクトとしてのgetter
      expect(card.getPower()).toBeInstanceOf(CardPower)
      expect(card.getPower().getValue()).toBe(10)
      expect(card.getCost()).toBeInstanceOf(InsurancePremium)
      expect(card.getCost().getValue()).toBe(5)
    })

    it('値オブジェクトを使用したビジネスロジックが正しく動作する', () => {
      const card = new Card({
        id: 'insurance-1',
        name: '定期保険',
        description: '保険カード',
        type: 'insurance',
        power: 0,
        cost: 3,
        effects: [],
        coverage: 20,
        insuranceType: 'health',
        durationType: 'term',
        remainingTurns: 5
      })

      // hasPowerAtLeastメソッドが値オブジェクトを使用
      expect(card.hasPowerAtLeast(0)).toBe(true)
      expect(card.hasPowerAtLeast(1)).toBe(false)

      // isAffordableWithメソッドが値オブジェクトを使用
      expect(card.isAffordableWith(10)).toBe(true)
      expect(card.isAffordableWith(2)).toBe(false)
    })

    it('Cardのcloneメソッドが値オブジェクトを正しく複製する', () => {
      const original = new Card({
        id: 'original-1',
        name: 'オリジナルカード',
        description: 'クローンテスト',
        type: 'life',
        power: 15,
        cost: 7,
        effects: [],
        category: 'work'
      })

      const cloned = original.clone()

      // クローンが独立したインスタンスであること
      expect(cloned).not.toBe(original)
      expect(cloned.id).toBe(original.id)
      expect(cloned.name).toBe(original.name)

      // 値オブジェクトも正しく複製されていること
      expect(cloned.power).toBe(15)
      expect(cloned.cost).toBe(7)
      expect(cloned.getPower().getValue()).toBe(15)
      expect(cloned.getCost().getValue()).toBe(7)
    })
  })

  describe('Game エンティティと値オブジェクトの統合', () => {
    it('GameがVitality値オブジェクトを正しく使用する', () => {
      game.start()
      
      // 初期体力値の確認
      expect(game.vitality).toBe(100)
      expect(game.getVitality()).toBeInstanceOf(Vitality)
      expect(game.getVitality().getValue()).toBe(100)

      // ダメージ適用
      game.applyDamage(30)
      expect(game.vitality).toBe(70)
      expect(game.getVitality().getValue()).toBe(70)

      // 体力回復
      game.heal(20)
      expect(game.vitality).toBe(90)
      expect(game.getVitality().getValue()).toBe(90)
    })

    it('Vitalityの上限・下限制約が正しく動作する', () => {
      game.start()

      // 上限を超える回復
      game.heal(200)
      expect(game.vitality).toBe(100) // 最大値100で制限される

      // 下限を超えるダメージ
      game.applyDamage(150)
      expect(game.vitality).toBe(0) // 最小値0で制限される
      expect(game.isGameOver()).toBe(true)
    })

    it('保険料負担の計算が値オブジェクトを使用する', () => {
      game.start()

      // 保険料負担を設定（値オブジェクトとして）
      game['_insuranceBurden'] = InsurancePremium.create(10)

      // 利用可能体力の計算
      const availableVitality = game.getAvailableVitality()
      expect(availableVitality).toBe(90) // 100 - 10
    })
  })

  describe('値オブジェクト間の相互作用', () => {
    it('CardPowerの集計が正しく動作する', () => {
      const powers = [
        CardPower.create(10),
        CardPower.create(20),
        CardPower.create(15)
      ]

      const total = CardPower.sum(powers)
      expect(total.getValue()).toBe(45)
    })

    it('InsurancePremiumの集計が正しく動作する', () => {
      const premiums = [
        InsurancePremium.create(5),
        InsurancePremium.create(3),
        InsurancePremium.create(7)
      ]

      const total = InsurancePremium.sum(premiums)
      expect(total.getValue()).toBe(15)
    })

    it('CardFactoryが値オブジェクトを持つCardを正しく生成する', () => {
      const lifeCard = cardFactory.createLifeCard({
        category: 'work',
        basePower: 20,
        baseCost: 10
      })

      expect(lifeCard).toBeInstanceOf(Card)
      expect(lifeCard.power).toBe(20)
      expect(lifeCard.cost).toBe(10)
      expect(lifeCard.getPower().getValue()).toBe(20)
      expect(lifeCard.getCost().getValue()).toBe(10)
    })
  })

  describe('値オブジェクトのエラーハンドリング', () => {
    it('不正な値での値オブジェクト作成時にエラーが発生する', () => {
      // CardPowerの最小値以下
      expect(() => CardPower.create(-100)).toThrow('CardPower must be at least -99')

      // InsurancePremiumの負の値
      expect(() => InsurancePremium.create(-1)).toThrow('InsurancePremium must be non-negative')

      // Vitalityの範囲外の値
      expect(() => Vitality.create(-1)).toThrow('Vitality must be between 0 and 100')
      expect(() => Vitality.create(101)).toThrow('Vitality must be between 0 and 100')
    })

    it('Cardが不正な値で作成されようとしたときエラーが発生する', () => {
      expect(() => new Card({
        id: 'invalid-1',
        name: '不正カード',
        description: 'エラーテスト',
        type: 'life',
        power: -10,
        cost: 5,
        effects: []
      })).toThrow('CardPower must be non-negative')
    })
  })
})