import { describe, it, expect } from 'vitest'
import { CardFactory } from '../CardFactory'
import { Card } from '../../entities/Card'

describe('CardFactory Phase 2 Implementation', () => {
  describe('createBasicInsuranceCards', () => {
    it('should create insurance cards with durationType and ageBonus', () => {
      // 青年期のテスト
      const youthCards = CardFactory.createBasicInsuranceCards('youth')
      expect(youthCards).toHaveLength(3)
      
      youthCards.forEach(card => {
        expect(card.durationType).toBe('whole_life')
        expect(card.ageBonus).toBe(0)
        expect(card.remainingTurns).toBeUndefined()
      })
      
      // 中年期のテスト
      const middleCards = CardFactory.createBasicInsuranceCards('middle')
      middleCards.forEach(card => {
        expect(card.durationType).toBe('whole_life')
        expect(card.ageBonus).toBe(0.5)
      })
      
      // 充実期のテスト
      const fulfillmentCards = CardFactory.createBasicInsuranceCards('fulfillment')
      fulfillmentCards.forEach(card => {
        expect(card.durationType).toBe('whole_life')
        expect(card.ageBonus).toBe(1.0)
      })
    })
  })
  
  describe('createExtendedInsuranceCards', () => {
    it('should create both whole life and term insurance variants', () => {
      const cards = CardFactory.createExtendedInsuranceCards('youth')
      
      // 基本保険（3種類）と追加保険（6種類）の各2バリエーション = 18枚
      expect(cards.length).toBe(18)
      
      // 終身保険のチェック
      const wholeLifeCards = cards.filter(card => card.durationType === 'whole_life')
      expect(wholeLifeCards).toHaveLength(9)
      
      wholeLifeCards.forEach(card => {
        expect(card.name).toContain('（終身）')
        expect(card.description).toContain('一生涯の保障')
        expect(card.remainingTurns).toBeUndefined()
      })
      
      // 定期保険のチェック
      const termCards = cards.filter(card => card.durationType === 'term')
      expect(termCards).toHaveLength(9)
      
      termCards.forEach(card => {
        expect(card.name).toContain('（定期）')
        expect(card.description).toContain('10ターンの保障')
        expect(card.remainingTurns).toBe(10)
      })
    })
    
    it('should apply correct cost and power adjustments', () => {
      const cards = CardFactory.createExtendedInsuranceCards('youth')
      
      // 医療保険の例で検証
      const medicalWholeLife = cards.find(card => card.name === '医療保険（終身）')
      const medicalTerm = cards.find(card => card.name === '医療保険（定期）')
      
      expect(medicalWholeLife).toBeDefined()
      expect(medicalTerm).toBeDefined()
      
      // 終身保険は定期保険よりコスト+2、パワー+2
      expect(medicalWholeLife!.cost).toBe(medicalTerm!.cost + 2)
      expect(medicalWholeLife!.power).toBe(medicalTerm!.power + 2)
    })
    
    it('should apply age bonus correctly', () => {
      const middleCards = CardFactory.createExtendedInsuranceCards('middle')
      const fulfillmentCards = CardFactory.createExtendedInsuranceCards('fulfillment')
      
      middleCards.forEach(card => {
        expect(card.ageBonus).toBe(0.5)
      })
      
      fulfillmentCards.forEach(card => {
        expect(card.ageBonus).toBe(1.0)
      })
    })
  })
  
  describe('Card entity Phase 2 features', () => {
    it('should calculate effective power with age bonus', () => {
      const card = new Card({
        id: 'test',
        name: 'Test Insurance',
        description: 'Test',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [],
        durationType: 'whole_life',
        ageBonus: 0.5
      })
      
      expect(card.calculateEffectivePower()).toBe(5.5)
      expect(card.calculateEffectivePower(2)).toBe(7.5)
    })
    
    it('should decrement remaining turns for term insurance', () => {
      const termCard = new Card({
        id: 'test',
        name: 'Term Insurance',
        description: 'Test',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [],
        durationType: 'term',
        remainingTurns: 3,
        ageBonus: 0
      })
      
      const updatedCard = termCard.decrementRemainingTurns()
      expect(updatedCard).not.toBeNull()
      expect(updatedCard!.remainingTurns).toBe(2)
      
      // 期限切れのテスト
      const expiringCard = new Card({
        id: 'test2',
        name: 'Expiring Insurance',
        description: 'Test',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [],
        durationType: 'term',
        remainingTurns: 1,
        ageBonus: 0
      })
      
      const expiredCard = expiringCard.decrementRemainingTurns()
      expect(expiredCard).toBeNull()
    })
    
    it('should not decrement turns for whole life insurance', () => {
      const wholeLifeCard = new Card({
        id: 'test',
        name: 'Whole Life Insurance',
        description: 'Test',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [],
        durationType: 'whole_life',
        ageBonus: 0
      })
      
      const sameCard = wholeLifeCard.decrementRemainingTurns()
      expect(sameCard).toBe(wholeLifeCard)
    })
    
    it('should display insurance duration info correctly', () => {
      const wholeLifeCard = new Card({
        id: 'test1',
        name: 'Whole Life',
        description: 'Test',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [],
        durationType: 'whole_life',
        ageBonus: 0.5
      })
      
      const display1 = wholeLifeCard.toDisplayString()
      expect(display1).toContain('Type: 終身')
      expect(display1).toContain('Age Bonus: +0.5')
      
      const termCard = new Card({
        id: 'test2',
        name: 'Term',
        description: 'Test',
        type: 'insurance',
        power: 5,
        cost: 3,
        effects: [],
        durationType: 'term',
        remainingTurns: 5,
        ageBonus: 1.0
      })
      
      const display2 = termCard.toDisplayString()
      expect(display2).toContain('Type: 定期')
      expect(display2).toContain('(残り5ターン)')
      expect(display2).toContain('Age Bonus: +1')
    })
  })
})