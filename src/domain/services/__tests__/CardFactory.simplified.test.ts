import { describe, it, expect } from 'vitest'
import { CardFactory } from '../CardFactory'

describe('CardFactory Simplified Implementation', () => {
  describe('createBasicInsuranceCards', () => {
    it('should create permanent insurance cards with age bonus', () => {
      // 青年期のテスト
      const youthCards = CardFactory.createBasicInsuranceCards('youth')
      expect(youthCards).toHaveLength(3)
      
      youthCards.forEach(card => {
        expect(card.type).toBe('insurance')
        expect(card.ageBonus).toBe(0)
        expect(card.description).toContain('永続保障')
        expect(card.effects).toHaveLength(1)
        expect(card.effects[0].type).toBe('shield')
      })
      
      // 中年期のテスト
      const middleCards = CardFactory.createBasicInsuranceCards('middle')
      middleCards.forEach(card => {
        expect(card.ageBonus).toBe(0.5)
        expect(card.description).toContain('永続保障')
      })
      
      // 充実期のテスト
      const fulfillmentCards = CardFactory.createBasicInsuranceCards('fulfillment')
      fulfillmentCards.forEach(card => {
        expect(card.ageBonus).toBe(1.0)
        expect(card.description).toContain('永続保障')
      })
    })

    it('should create cards with proper insurance types', () => {
      const cards = CardFactory.createBasicInsuranceCards('youth')
      
      const medicalInsurance = cards.find(card => card.insuranceType === 'medical')
      const lifeInsurance = cards.find(card => card.insuranceType === 'life')
      const incomeInsurance = cards.find(card => card.insuranceType === 'income')
      
      expect(medicalInsurance).toBeDefined()
      expect(lifeInsurance).toBeDefined()
      expect(incomeInsurance).toBeDefined()
      
      expect(medicalInsurance!.name).toBe('医療保険')
      expect(lifeInsurance!.name).toBe('生命保険')
      expect(incomeInsurance!.name).toBe('収入保障保険')
    })
  })
  
  describe('createExtendedInsuranceCards', () => {
    it('should create variety of permanent insurance cards', () => {
      const cards = CardFactory.createExtendedInsuranceCards('youth')
      
      // 基本保険（3種類）と追加保険（6種類）= 9枚（簡素化版）
      expect(cards.length).toBe(9)
      
      // すべて永続保険であることを確認
      cards.forEach(card => {
        expect(card.type).toBe('insurance')
        expect(card.description).toContain('永続保障')
        expect(card.effects).toHaveLength(1)
        expect(card.effects[0].type).toBe('shield')
        expect(card.coverage).toBeGreaterThan(0)
      })
    })

    it('should include specialized insurance types', () => {
      const cards = CardFactory.createExtendedInsuranceCards('youth')
      
      const cardNames = cards.map(card => card.name)
      
      // 基本的な保険種類が含まれていることを確認
      expect(cardNames).toContain('医療保険')
      expect(cardNames).toContain('生命保険')
      expect(cardNames).toContain('収入保障保険')
      
      // 特殊な保険種類が含まれていることを確認
      expect(cardNames).toContain('傷害保険')
      expect(cardNames).toContain('就業不能保険')
      expect(cardNames).toContain('介護保険')
      expect(cardNames).toContain('がん保険')
      expect(cardNames).toContain('個人年金保険')
      expect(cardNames).toContain('学資保険')
    })

    it('should apply age bonus correctly across different stages', () => {
      const youthCards = CardFactory.createExtendedInsuranceCards('youth')
      const middleCards = CardFactory.createExtendedInsuranceCards('middle')
      const fulfillmentCards = CardFactory.createExtendedInsuranceCards('fulfillment')
      
      // 年齢ボーナスが正しく設定されていることを確認
      youthCards.forEach(card => {
        expect(card.ageBonus).toBe(0)
      })
      
      middleCards.forEach(card => {
        expect(card.ageBonus).toBe(0.5)
      })
      
      fulfillmentCards.forEach(card => {
        expect(card.ageBonus).toBe(1.0)
      })
    })
  })

  describe('Card Power and Cost Balance', () => {
    it('should have reasonable power-to-cost ratios', () => {
      const cards = CardFactory.createExtendedInsuranceCards('youth')
      
      cards.forEach(card => {
        expect(card.power).toBeGreaterThan(0)
        expect(card.cost).toBeGreaterThan(0)
        expect(card.coverage).toBeGreaterThan(0)
        
        // パワーコスト比が妥当であることを確認（大体1.0〜2.0の範囲）
        const powerCostRatio = card.power / card.cost
        expect(powerCostRatio).toBeGreaterThan(0.8)
        expect(powerCostRatio).toBeLessThan(2.5)
      })
    })

    it('should calculate effective power with age bonus', () => {
      const middleCards = CardFactory.createExtendedInsuranceCards('middle')
      
      const testCard = middleCards[0]
      const basePower = testCard.power
      const ageBonus = testCard.ageBonus || 0
      const effectivePower = testCard.calculateEffectivePower()
      
      expect(effectivePower).toBe(basePower + ageBonus)
    })
  })
})