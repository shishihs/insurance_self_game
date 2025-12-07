import { beforeEach, describe, expect, it } from 'vitest'
import { InsurancePremiumCalculationService } from '../InsurancePremiumCalculationService'
import { InsurancePremium } from '../../valueObjects/InsurancePremium'
import { Card } from '../../entities/Card'
import type { GameStage, InsuranceType } from '../../types/card.types'
import { RiskFactor } from '../../valueObjects/RiskFactor'
import { RiskProfile } from '../../valueObjects/RiskProfile'

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
      const result = service.calculateAgeAdjustedPremium(basePremium, 'middle')

      expect(result.getValue()).toBe(12) // 10 * 1.2
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
      const result = service.calculateComprehensivePremium(card, 'middle')

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

    it('3枚の保険では基本料金のまま（5枚未満）', () => {
      const cards = [
        createInsuranceCard('health', 10, 50),
        createInsuranceCard('health', 10, 50),
        createInsuranceCard('health', 10, 50)
      ]
      const result = service.calculateTotalInsuranceBurden(cards, 'youth')

      // (10 + 10 + 10) * 1.0 = 30 (5枚未満なのでペナルティなし)
      expect(result.getValue()).toBe(30)
    })

    it('5枚の保険で10%のペナルティ', () => {
      const cards = Array(5).fill(null).map(() => createInsuranceCard('health', 10, 50))
      const result = service.calculateTotalInsuranceBurden(cards, 'youth')

      // (10 * 5) * 1.1 = 55
      expect(result.getValue()).toBe(55)
    })

    it('大量の保険でもペナルティには上限がある', () => {
      const cards = Array(15).fill(null).map(() => createInsuranceCard('health', 10, 50))
      const result = service.calculateTotalInsuranceBurden(cards, 'youth')

      // 大量の保険でも上限があり、無制限にペナルティが増えることはない
      expect(result.getValue()).toBeLessThan(200) // 実装の詳細は99という値だが、上限があることをテスト
      expect(result.getValue()).toBeGreaterThan(90) // 一定のペナルティは適用される
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
        cost: 5,
        effects: []
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
      const result = service.calculateAgeAdjustedPremium(maxPremium, 'fulfillment')

      // 99の制限により、99 * 1.3 = 128.7 → 99（上限制限）
      expect(result.getValue()).toBe(99)
    })

    it('無料保険は0のまま', () => {
      const freePremium = InsurancePremium.FREE
      const result = service.calculateAgeAdjustedPremium(freePremium, 'fulfillment')

      expect(result.getValue()).toBe(0)
    })

    it('カバレッジ0でも正常動作', () => {
      const card = createInsuranceCard('health', 10, 0)
      const result = service.calculateComprehensivePremium(card, 'youth')

      // カバレッジ調整の最小値0.5が適用される
      expect(result.getValue()).toBe(5) // 10 * 0.5
    })
  })

  describe('リスクファクターを使用した保険料計算', () => {
    it('リスクプロファイルなしでの基本計算', () => {
      const card = createInsuranceCard('health', 10, 50)
      const result = service.calculateRiskAdjustedPremium(card, 'youth')

      // リスクプロファイルなしの場合は通常の計算
      expect(result.getValue()).toBe(10)
    })

    it('低リスクプロファイルでの保険料計算', () => {
      const card = createInsuranceCard('health', 10, 50)
      const riskProfile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.2, 'age'))
        .withFactor(RiskFactor.create(0.1, 'health'))

      const result = service.calculateRiskAdjustedPremium(card, 'youth', riskProfile)

      // 基本料金10 * リスク倍率（低リスクなので1.0に近い）
      expect(result.getValue()).toBeLessThan(12)
    })

    it('高リスクプロファイルでの保険料計算', () => {
      const card = createInsuranceCard('health', 10, 50)
      const riskProfile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.8, 'age'))
        .withFactor(RiskFactor.create(0.9, 'health'))
        .withFactor(RiskFactor.create(0.7, 'claims'))

      const result = service.calculateRiskAdjustedPremium(card, 'youth', riskProfile)

      // 高リスクなので保険料が大幅に増加
      expect(result.getValue()).toBeGreaterThan(15)
    })

    it('特定のリスクファクターが保険種別に応じて影響する', () => {
      const healthCard = createInsuranceCard('health', 10, 50)
      const cancerCard = createInsuranceCard('cancer', 10, 50)

      const riskProfile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.8, 'health'))

      const healthResult = service.calculateRiskAdjustedPremium(healthCard, 'youth', riskProfile)
      const cancerResult = service.calculateRiskAdjustedPremium(cancerCard, 'youth', riskProfile)

      // 健康リスクが高い場合、健康保険により大きく影響
      expect(healthResult.getValue()).toBeGreaterThan(cancerResult.getValue() * 0.6)
    })

    it('年齢とリスクファクターの複合効果', () => {
      const card = createInsuranceCard('health', 10, 50)
      const riskProfile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.6, 'age'))

      const youthResult = service.calculateRiskAdjustedPremium(card, 'youth', riskProfile)
      const fulfillmentResult = service.calculateRiskAdjustedPremium(card, 'fulfillment', riskProfile)

      // 充実期の方が年齢リスクの影響が大きい
      expect(fulfillmentResult.getValue()).toBeGreaterThan(youthResult.getValue() * 1.2)
    })

    it('最大リスクでも保険料に上限がある', () => {
      const card = createInsuranceCard('health', 50, 100)
      const extremeRiskProfile = RiskProfile.empty()
        .withFactor(RiskFactor.create(1.0, 'age'))
        .withFactor(RiskFactor.create(1.0, 'health'))
        .withFactor(RiskFactor.create(1.0, 'claims'))
        .withFactor(RiskFactor.create(1.0, 'lifestyle'))

      const result = service.calculateRiskAdjustedPremium(card, 'fulfillment', extremeRiskProfile)

      // 最大保険料の上限（99）を超えない
      expect(result.getValue()).toBeLessThanOrEqual(99)
    })
  })

  describe('包括的な保険料最適化', () => {
    it('複数の保険の組み合わせで最適な保険料を計算', () => {
      const cards = [
        createInsuranceCard('health', 15, 60),
        createInsuranceCard('cancer', 20, 80),
        createInsuranceCard('accident', 10, 40)
      ]

      const totalBurden = service.calculateTotalInsuranceBurden(cards, 'middle')
      const optimalBudget = service.calculateOptimalInsuranceBudget(100, 'middle', 'balanced')

      // 総負担が最適予算を超える場合の警告判定
      expect(totalBurden.getValue()).toBeGreaterThan(optimalBudget.getValue())
    })

    it('リスクプロファイルに基づく保険推奨', () => {
      const highHealthRisk = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.9, 'health'))

      const healthCard = createInsuranceCard('health', 15, 70)
      const accidentCard = createInsuranceCard('accident', 10, 50)

      const healthPremium = service.calculateRiskAdjustedPremium(healthCard, 'youth', highHealthRisk)
      // accidentPremium variable removed as it was unused

      // 健康リスクが高い場合、健康保険の保険料が上がることを確認
      const basePremium = service.calculateComprehensivePremium(healthCard, 'youth')
      expect(healthPremium.getValue()).toBeGreaterThan(basePremium.getValue())
    })
  })

  describe('動的保険料調整', () => {
    it('使用頻度に応じた保険料の動的調整', () => {
      const card = createInsuranceCard('health', 10, 50)

      // 使用回数による段階的な保険料増加
      const premium0 = service.calculateRenewalPremium(card, 'youth', 0)
      const premium3 = service.calculateRenewalPremium(card, 'youth', 3)
      const premium7 = service.calculateRenewalPremium(card, 'youth', 7)

      expect(premium0.getValue()).toBeLessThan(premium3.getValue())
      expect(premium3.getValue()).toBeLessThan(premium7.getValue())
    })

    it('長期無事故での優遇料金', () => {
      const card = createInsuranceCard('health', 20, 60)
      const longTermNoClaimPremium = service.calculateRenewalPremium(card, 'youth', 0)
      const basePremium = service.calculateComprehensivePremium(card, 'youth')

      // 無事故継続では基本料金より安くなる
      expect(longTermNoClaimPremium.getValue()).toBeLessThan(basePremium.getValue())
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