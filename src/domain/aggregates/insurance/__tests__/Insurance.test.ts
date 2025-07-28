import { describe, it, expect } from 'vitest'
import { Insurance } from '../Insurance'
import { InsuranceId } from '../InsuranceId'
import { Card } from '../../../entities/Card'
import { InsuranceExpiredEvent, InsuranceUsedEvent } from '../events'

describe('Insurance集約', () => {
  const createInsuranceCard = (
    type: 'term' | 'whole_life', 
    coverage: number,
    cost: number = 5
  ): Card => {
    return new Card({
      id: `insurance_${type}_${coverage}`,
      name: `テスト${type === 'term' ? '定期' : '終身'}保険`,
      description: 'テスト用保険カード',
      type: 'insurance',
      power: 0,
      cost,
      effects: [],
      coverage,
      durationType: type,
      remainingTurns: type === 'term' ? 10 : undefined
    })
  }

  describe('保険の生成', () => {
    it('保険カードから生成できる', () => {
      const card = createInsuranceCard('term', 20)
      const insurance = Insurance.create(card)
      
      expect(insurance).toBeDefined()
      expect(insurance.getId()).toBeInstanceOf(InsuranceId)
      expect(insurance.getCard()).toBe(card)
      expect(insurance.getCoverage().getValue()).toBe(20)
      expect(insurance.getPremium().getValue()).toBe(5)
      expect(insurance.isActive()).toBe(true)
    })

    it('非保険カードからは生成できない', () => {
      const card = new Card({
        id: 'life_1',
        name: 'ライフカード',
        description: 'テスト',
        type: 'life',
        power: 10,
        cost: 0,
        effects: []
      })
      
      expect(() => Insurance.create(card))
        .toThrow('Card must be of type "insurance"')
    })
  })

  describe('保険の使用', () => {
    it('アクティブな保険は使用できる', () => {
      const insurance = Insurance.create(createInsuranceCard('term', 20))
      
      const events = insurance.use(15)
      
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(InsuranceUsedEvent)
      expect(events[0].damageAbsorbed).toBe(15)
      expect(insurance.getUsageCount()).toBe(1)
    })

    it('カバレッジを超えるダメージは部分的に吸収', () => {
      const insurance = Insurance.create(createInsuranceCard('term', 20))
      
      const events = insurance.use(30)
      
      expect(events[0].damageAbsorbed).toBe(20)
      expect(events[0].damageOverflow).toBe(10)
    })

    it('期限切れの保険は使用できない', () => {
      const card = createInsuranceCard('term', 20)
      card.remainingTurns = 0
      const insurance = Insurance.create(card)
      
      const events = insurance.use(10)
      
      expect(events).toHaveLength(0)
    })
  })

  describe('保険の期限管理', () => {
    it('定期保険はターンごとに期限が減る', () => {
      const insurance = Insurance.create(createInsuranceCard('term', 20))
      expect(insurance.getRemainingTurns()).toBe(10)
      
      const events = insurance.decrementTurn()
      
      expect(insurance.getRemainingTurns()).toBe(9)
      expect(events).toHaveLength(0)
    })

    it('期限が0になると期限切れイベントが発生', () => {
      const card = createInsuranceCard('term', 20)
      card.remainingTurns = 1
      const insurance = Insurance.create(card)
      
      const events = insurance.decrementTurn()
      
      expect(events).toHaveLength(1)
      expect(events[0]).toBeInstanceOf(InsuranceExpiredEvent)
      expect(insurance.isExpired()).toBe(true)
    })

    it('終身保険は期限が減らない', () => {
      const insurance = Insurance.create(createInsuranceCard('whole_life', 30))
      
      const events = insurance.decrementTurn()
      
      expect(events).toHaveLength(0)
      expect(insurance.getRemainingTurns()).toBeUndefined()
      expect(insurance.isExpired()).toBe(false)
    })
  })

  describe('保険料の計算', () => {
    it('基本保険料を取得できる', () => {
      const insurance = Insurance.create(createInsuranceCard('term', 20, 8))
      
      expect(insurance.getPremium().getValue()).toBe(8)
    })

    it('年齢による保険料調整', () => {
      const card = createInsuranceCard('term', 20, 10)
      const insurance = Insurance.create(card)
      
      // 中年期での保険料（20%増）
      const middleAgePremium = insurance.calculateAdjustedPremium('middle_age')
      expect(middleAgePremium.getValue()).toBe(12)
      
      // 充実期での保険料（50%増）
      const elderPremium = insurance.calculateAdjustedPremium('elder')
      expect(elderPremium.getValue()).toBe(15)
    })
  })

  describe('保険の効果', () => {
    it('年齢ボーナスを持つ保険を判定できる', () => {
      const card = createInsuranceCard('whole_life', 30)
      card.ageBonus = 10
      const insurance = Insurance.create(card)
      
      expect(insurance.hasAgeBonus()).toBe(true)
      expect(insurance.getAgeBonus()).toBe(10)
    })

    it('使用統計を追跡する', () => {
      const insurance = Insurance.create(createInsuranceCard('term', 20))
      
      insurance.use(10)
      insurance.use(15)
      insurance.use(5)
      
      expect(insurance.getUsageCount()).toBe(3)
      expect(insurance.getTotalDamageAbsorbed()).toBe(30)
    })
  })

  describe('保険の状態', () => {
    it('アクティブな状態を判定できる', () => {
      const insurance = Insurance.create(createInsuranceCard('term', 20))
      
      expect(insurance.isActive()).toBe(true)
      expect(insurance.isExpired()).toBe(false)
    })

    it('定期保険と終身保険を区別できる', () => {
      const termInsurance = Insurance.create(createInsuranceCard('term', 20))
      const wholeLifeInsurance = Insurance.create(createInsuranceCard('whole_life', 30))
      
      expect(termInsurance.isTermInsurance()).toBe(true)
      expect(termInsurance.isWholeLifeInsurance()).toBe(false)
      
      expect(wholeLifeInsurance.isTermInsurance()).toBe(false)
      expect(wholeLifeInsurance.isWholeLifeInsurance()).toBe(true)
    })
  })
})