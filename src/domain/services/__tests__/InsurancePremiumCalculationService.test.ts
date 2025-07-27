import { describe, it, expect, beforeEach } from 'vitest'
import { InsurancePremiumCalculationService } from '../InsurancePremiumCalculationService'
import { InsurancePremium } from '../../valueObjects/InsurancePremium'
import { Card } from '../../entities/Card'
import type { GameStage, InsuranceType } from '../../types/card.types'

describe('InsurancePremiumCalculationService', () => {
  let service: InsurancePremiumCalculationService

  beforeEach(() => {
    service = new InsurancePremiumCalculationService()
  })

  describe('年齢調整保険料計算', () => {
    it('青年期では基本料金のまま', () => {
      const basePremium = InsurancePremium.create(10)
      const result = service.calculateAgeAdjustedPremium(basePremium, 'youth')
      
      expect(result.getValue()).toBe(10)
    })

    it('中年期では20%増し', () => {
      const basePremium = InsurancePremium.create(10)
      const result = service.calculateAgeAdjustedPremium(basePremium, 'middle_age')
      
      expect(result.getValue()).toBe(12) // 10 * 1.2
    })

    it('老年期では50%増し', () => {
      const basePremium = InsurancePremium.create(10)
      const result = service.calculateAgeAdjustedPremium(basePremium, 'elder')
      
      expect(result.getValue()).toBe(15) // 10 * 1.5
    })

    it('充実期では30%増し', () => {
      const basePremium = InsurancePremium.create(10)
      const result = service.calculateAgeAdjustedPremium(basePremium, 'fulfillment')
      
      expect(result.getValue()).toBe(13) // 10 * 1.3
    })
  })

  describe('総合保険料計算', () => {
    it('健康保険の基本計算', () => {
      const card = createInsuranceCard('health', 10, 50)
      const result = service.calculateComprehensivePremium(card, 'youth')
      
      // 基本料金10 * 年齢調整1.0 * 種別調整1.0 * カバレッジ調整1.0
      expect(result.getValue()).toBe(10)
    })

    it('がん保険は50%高い', () => {
      const card = createInsuranceCard('cancer', 10, 50)
      const result = service.calculateComprehensivePremium(card, 'youth')
      
      // 基本料金10 * 年齢調整1.0 * 種別調整1.5 * カバレッジ調整1.0
      expect(result.getValue()).toBe(15)
    })

    it('中年期のがん保険は年齢＋種別の両方の調整が適用される', () => {
      const card = createInsuranceCard('cancer', 10, 50)
      const result = service.calculateComprehensivePremium(card, 'middle_age')
      
      // 基本料金10 * 年齢調整1.2 * 種別調整1.5 * カバレッジ調整1.0
      expect(result.getValue()).toBe(18) // 10 * 1.2 * 1.5
    })

    it('高カバレッジの保険は料金が高くなる', () => {
      const card = createInsuranceCard('health', 10, 100) // カバレッジ100
      const result = service.calculateComprehensivePremium(card, 'youth')
      
      // 基本料金10 * 年齢調整1.0 * 種別調整1.0 * カバレッジ調整2.0
      expect(result.getValue()).toBe(20)
    })
  })

  describe('総保険料負担計算', () => {
    it('保険なしの場合は0', () => {
      const result = service.calculateTotalInsuranceBurden([], 'youth')
      expect(result.getValue()).toBe(0)
    })

    it('1枚の保険の場合', () => {
      const cards = [createInsuranceCard('health', 10, 50)]
      const result = service.calculateTotalInsuranceBurden(cards, 'youth')
      
      // 基本料金10のまま（ペナルティなし）
      expect(result.getValue()).toBe(10)
    })

    it('3枚の保険で10%のペナルティ', () => {
      const cards = [
        createInsuranceCard('health', 10, 50),
        createInsuranceCard('health', 10, 50),
        createInsuranceCard('health', 10, 50)
      ]
      const result = service.calculateTotalInsuranceBurden(cards, 'youth')
      
      // (10 + 10 + 10) * 1.1 = 33
      expect(result.getValue()).toBe(33)
    })

    it('6枚の保険で20%のペナルティ', () => {
      const cards = Array(6).fill(null).map(() => createInsuranceCard('health', 10, 50))
      const result = service.calculateTotalInsuranceBurden(cards, 'youth')
      
      // (10 * 6) * 1.2 = 72
      expect(result.getValue()).toBe(72)
    })
  })

  describe('更新料金計算', () => {
    it('使用履歴なしで10%割引', () => {
      const card = createInsuranceCard('health', 10, 50)
      const result = service.calculateRenewalPremium(card, 'youth', 0)
      
      // 基本料金10 * 継続割引0.9 * リスク調整1.0 = 9
      expect(result.getValue()).toBe(9)
    })

    it('使用履歴2回で5%割引', () => {
      const card = createInsuranceCard('health', 10, 50)
      const result = service.calculateRenewalPremium(card, 'youth', 2)
      
      // 基本料金10 * 継続割引0.95 * リスク調整1.0 = 9.5 → 9（切り捨て）
      expect(result.getValue()).toBe(9)
    })

    it('使用履歴5回以上で30%リスク増加', () => {
      const card = createInsuranceCard('health', 10, 50)
      const result = service.calculateRenewalPremium(card, 'youth', 5)
      
      // 基本料金10 * 継続割引1.0 * リスク調整1.3 = 13
      expect(result.getValue()).toBe(13)
    })
  })

  describe('最適保険予算計算', () => {
    it('保守的プレイヤーは活力の15%', () => {
      const result = service.calculateOptimalInsuranceBudget(100, 'youth', 'conservative')
      expect(result.getValue()).toBe(15)
    })

    it('バランス型プレイヤーは活力の25%', () => {
      const result = service.calculateOptimalInsuranceBudget(100, 'youth', 'balanced')
      expect(result.getValue()).toBe(25)
    })

    it('積極的プレイヤーは活力の35%', () => {
      const result = service.calculateOptimalInsuranceBudget(100, 'youth', 'aggressive')
      expect(result.getValue()).toBe(35)
    })

    it('低活力時は少額推奨', () => {
      const result = service.calculateOptimalInsuranceBudget(20, 'youth', 'balanced')
      expect(result.getValue()).toBe(5) // 20 * 0.25
    })
  })

  describe('エラーハンドリング', () => {
    it('非保険カードで例外発生', () => {
      const nonInsuranceCard = new Card({
        id: 'test-1',
        name: 'テストカード',
        description: 'テスト用',
        type: 'life',
        power: 10,
        cost: 5
      })

      expect(() => {
        service.calculateComprehensivePremium(nonInsuranceCard, 'youth')
      }).toThrow('Card must be an insurance card')
    })

    it('無効なステージでも安全にフォールバック', () => {
      const basePremium = InsurancePremium.create(10)
      const result = service.calculateAgeAdjustedPremium(basePremium, 'invalid_stage' as GameStage)
      
      // 無効なステージの場合は1.0倍率でフォールバック
      expect(result.getValue()).toBe(10)
    })
  })

  describe('境界値テスト', () => {
    it('最大保険料でも正常動作', () => {
      const maxPremium = InsurancePremium.create(99)
      const result = service.calculateAgeAdjustedPremium(maxPremium, 'elder')
      
      // 99の制限により、99 * 1.5 = 148.5 → 99（上限制限）
      expect(result.getValue()).toBe(99)
    })

    it('無料保険は0のまま', () => {
      const freePremium = InsurancePremium.FREE
      const result = service.calculateAgeAdjustedPremium(freePremium, 'elder')
      
      expect(result.getValue()).toBe(0)
    })

    it('カバレッジ0でも正常動作', () => {
      const card = createInsuranceCard('health', 10, 0)
      const result = service.calculateComprehensivePremium(card, 'youth')
      
      // カバレッジ調整の最小値0.5が適用される
      expect(result.getValue()).toBe(5) // 10 * 0.5
    })
  })
})

/**
 * テスト用の保険カードを作成
 */
function createInsuranceCard(insuranceType: InsuranceType, cost: number, coverage: number): Card {
  return new Card({
    id: `insurance-${insuranceType}-${Math.random()}`,
    name: `${insuranceType}保険`,
    description: 'テスト用保険',
    type: 'insurance',
    power: 0,
    cost,
    insuranceType,
    coverage,
    effects: []
  })
}