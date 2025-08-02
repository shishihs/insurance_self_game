import { beforeEach, describe, expect, it } from 'vitest'
import { Game } from '../../entities/Game'
import { Card } from '../../entities/Card'
import { InsurancePremiumCalculationService } from '../InsurancePremiumCalculationService'
import { InsurancePremium } from '../../valueObjects/InsurancePremium'
import { RiskProfile } from '../../valueObjects/RiskFactor'
import type { GameStage } from '../../types/card.types'

/**
 * 保険システム - 数値計算精度・オーバーフローテスト
 * 
 * Test Paranoidによる包括的破綻パターン検証:
 * - 浮動小数点精度の累積エラー
 * - 大きな数値でのオーバーフロー
 * - 保険料計算の複雑な組み合わせ
 * - リスクプロファイルの境界条件
 * - 年齢調整による数値誤差
 */
describe('保険システム - 数値計算精度・オーバーフローテスト', () => {
  let game: Game
  let premiumService: InsurancePremiumCalculationService

  beforeEach(() => {
    game = new Game({
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    })
    game.start()
    
    premiumService = new InsurancePremiumCalculationService()
  })

  describe('🔥 浮動小数点精度の累積エラーテスト', () => {
    it('保険料の累積計算精度', () => {
      const premiums: number[] = []
      
      // 0.1刻みで100個の保険料を作成
      for (let i = 1; i <= 100; i++) {
        premiums.push(i * 0.1)
      }
      
      // 累積計算
      let total = 0
      premiums.forEach(premium => {
        total += premium
      })
      
      // 理論値: 0.1 + 0.2 + ... + 10.0 = 505.0
      const expected = 50.5 * 101 / 2 // 等差数列の和
      
      // 浮動小数点誤差を考慮した検証
      expect(Math.abs(total - expected)).toBeLessThan(0.000001)
      
      // InsurancePremium値オブジェクトでの計算
      const premiumObjects = premiums.map(p => InsurancePremium.create(p))
      let objectTotal = InsurancePremium.create(0)
      
      premiumObjects.forEach(premium => {
        objectTotal = objectTotal.add(premium)
      })
      
      expect(Math.abs(objectTotal.getValue() - expected)).toBeLessThan(0.000001)
    })

    it('複利計算での精度保持', () => {
      // 年齢調整の複利計算シミュレーション
      const baseAmount = 100.0
      const interestRate = 0.03 // 3%
      const years = 50
      
      // 直接計算
      const directResult = baseAmount * (1 + interestRate)**years
      
      // 段階的計算（累積エラーが発生しやすい）
      let stepwiseResult = baseAmount
      for (let year = 0; year < years; year++) {
        stepwiseResult *= (1 + interestRate)
      }
      
      // 誤差が許容範囲内か
      const difference = Math.abs(directResult - stepwiseResult)
      const relativeError = difference / directResult
      
      expect(relativeError).toBeLessThan(0.000001) // 0.0001%未満の誤差
    })

    it('保険料負担の小数点計算', () => {
      const insurances = [
        Card.createInsuranceCard('Insurance A', 5, 3.33),
        Card.createInsuranceCard('Insurance B', 4, 2.67),
        Card.createInsuranceCard('Insurance C', 6, 1.99)
      ]
      
      insurances.forEach(insurance => { game.addInsurance(insurance); })
      
      const burden = game.calculateInsuranceBurden()
      const expectedBurden = 3.33 + 2.67 + 1.99 // = 7.99
      
      // 小数点計算の精度確認
      expect(Math.abs(burden - expectedBurden)).toBeLessThan(0.01)
      
      // 利用可能活力の計算精度
      const availableVitality = game.getAvailableVitality()
      const expectedAvailable = 100 - 7.99 // = 92.01
      
      expect(Math.abs(availableVitality - expectedAvailable)).toBeLessThan(0.01)
    })
  })

  describe('💀 大きな数値でのオーバーフローテスト', () => {
    it('極大保険料での計算安定性', () => {
      const hugePremium = Number.MAX_SAFE_INTEGER / 2
      
      expect(() => {
        const premium = InsurancePremium.create(hugePremium)
        expect(premium.getValue()).toBe(hugePremium)
      }).not.toThrow()
      
      // 加算でのオーバーフロー検出
      const premium1 = InsurancePremium.create(hugePremium)
      const premium2 = InsurancePremium.create(hugePremium)
      
      expect(() => {
        const sum = premium1.add(premium2)
        expect(sum.getValue()).toBeGreaterThan(hugePremium)
      }).not.toThrow()
    })

    it('活力の極限値での保険料負担計算', () => {
      const extremeGame = new Game({
        difficulty: 'normal',
        startingVitality: Number.MAX_SAFE_INTEGER,
        startingHandSize: 5,
        maxHandSize: 10,
        dreamCardCount: 3
      })
      extremeGame.start()
      
      const expensiveInsurance = new Card({
        id: 'expensive',
        name: 'Expensive Insurance',
        description: 'Very costly',
        type: 'insurance',
        power: 10,
        cost: 1000000, // 100万
        effects: []
      })
      
      extremeGame.addInsurance(expensiveInsurance)
      
      const burden = extremeGame.calculateInsuranceBurden()
      expect(burden).toBeGreaterThan(0)
      expect(burden).toBeLessThan(Number.MAX_SAFE_INTEGER)
      
      const availableVitality = extremeGame.getAvailableVitality()
      expect(availableVitality).toBeGreaterThan(0)
    })

    it('保険カバレッジの極大値処理', () => {
      const maxCoverageCard = new Card({
        id: 'max_coverage',
        name: 'Max Coverage Insurance',
        description: 'Maximum coverage',
        type: 'insurance',
        power: 5,
        cost: 10,
        coverage: Number.MAX_SAFE_INTEGER,
        effects: []
      })
      
      expect(() => {
        game.addInsurance(maxCoverageCard)
        
        // ダメージ軽減計算
        if (maxCoverageCard.isDefensiveInsurance()) {
          const reduction = maxCoverageCard.calculateDamageReduction()
          expect(reduction).toBeGreaterThan(0)
        }
      }).not.toThrow()
    })
  })

  describe('⚡ 保険料計算の複雑な組み合わせ', () => {
    it('全種類保険の組み合わせ負担計算', () => {
      const diverseInsurances = [
        // 攻撃型
        new Card({
          id: 'offensive1',
          name: 'Offensive Insurance 1',
          description: 'Attack type',
          type: 'insurance',
          power: 8,
          cost: 5.5,
          insuranceEffectType: 'offensive',
          coverage: 100,
          effects: []
        }),
        // 防御型
        new Card({
          id: 'defensive1',
          name: 'Defensive Insurance 1',
          description: 'Defense type',
          type: 'insurance',
          power: 0,
          cost: 4.25,
          insuranceEffectType: 'defensive',
          coverage: 80,
          effects: [
            { type: 'damage_reduction', value: 6, description: 'Reduce 6' }
          ]
        }),
        // 回復型
        new Card({
          id: 'recovery1',
          name: 'Recovery Insurance 1',
          description: 'Recovery type',
          type: 'insurance',
          power: 0,
          cost: 3.75,
          insuranceEffectType: 'recovery',
          coverage: 60,
          effects: [
            { type: 'turn_heal', value: 3, description: 'Heal 3' }
          ]
        }),
        // 特化型
        new Card({
          id: 'specialized1',
          name: 'Specialized Insurance 1',
          description: 'Specialized type',
          type: 'insurance',
          power: 3,
          cost: 6.0,
          insuranceEffectType: 'specialized',
          coverage: 120,
          effects: [
            { 
              type: 'challenge_bonus', 
              value: 10, 
              description: 'Job bonus',
              condition: 'job,career'
            }
          ]
        })
      ]
      
      diverseInsurances.forEach(insurance => { game.addInsurance(insurance); })
      
      const totalBurden = game.calculateInsuranceBurden()
      const expectedBurden = 5.5 + 4.25 + 3.75 + 6.0 // = 19.5
      
      expect(Math.abs(totalBurden - expectedBurden)).toBeLessThan(0.01)
      
      // 各保険の個別計算確認
      diverseInsurances.forEach(insurance => {
        const individualPremium = game.calculateCardPremium(insurance)
        expect(individualPremium.getValue()).toBeGreaterThan(0)
      })
    })

    it('年齢別保険料調整の精度', () => {
      const baseInsurance = Card.createInsuranceCard('Age Test Insurance', 6, 4)
      
      const stages: GameStage[] = ['youth', 'middle', 'fulfillment']
      const stagePremiums: number[] = []
      
      stages.forEach(stage => {
        game.setStage(stage)
        const premium = game.calculateCardPremium(baseInsurance)
        stagePremiums.push(premium.getValue())
      })
      
      // 年齢が上がるにつれて保険料が増加する傾向
      expect(stagePremiums[1]).toBeGreaterThanOrEqual(stagePremiums[0])
      expect(stagePremiums[2]).toBeGreaterThanOrEqual(stagePremiums[1])
      
      // 増加率の妥当性（極端でない）
      const youthToMiddle = stagePremiums[1] / stagePremiums[0]
      const middleToFulfillment = stagePremiums[2] / stagePremiums[1]
      
      expect(youthToMiddle).toBeLessThan(3) // 3倍未満
      expect(middleToFulfillment).toBeLessThan(3) // 3倍未満
    })

    it('リスクプロファイル別の保険予算計算', () => {
      const riskProfiles: Array<'conservative' | 'balanced' | 'aggressive'> = 
        ['conservative', 'balanced', 'aggressive']
      
      const budgetRecommendations: number[] = []
      
      riskProfiles.forEach(profile => {
        const budget = game.getRecommendedInsuranceBudget(profile)
        budgetRecommendations.push(budget.getValue())
      })
      
      // 保守的 <= バランス <= 積極的 の順で予算が増加
      expect(budgetRecommendations[0]).toBeLessThanOrEqual(budgetRecommendations[1])
      expect(budgetRecommendations[1]).toBeLessThanOrEqual(budgetRecommendations[2])
      
      // 予算の妥当性（0以上、活力以下）
      budgetRecommendations.forEach(budget => {
        expect(budget).toBeGreaterThan(0)
        expect(budget).toBeLessThanOrEqual(game.vitality)
      })
    })
  })

  describe('🧠 境界条件での数値精度', () => {
    it('ゼロコスト保険の処理', () => {
      const freeInsurance = Card.createInsuranceCard('Free Insurance', 3, 0)
      
      game.addInsurance(freeInsurance)
      
      const burden = game.calculateInsuranceBurden()
      expect(burden).toBe(0)
      
      const availableVitality = game.getAvailableVitality()
      expect(availableVitality).toBe(game.vitality)
    })

    it('負のパワー保険の処理', () => {
      const negativeInsurance = new Card({
        id: 'negative',
        name: 'Negative Insurance',
        description: 'Reduces power',
        type: 'insurance',
        power: -5,
        cost: 2,
        effects: []
      })
      
      game.addInsurance(negativeInsurance)
      
      // 負のパワーでも保険料は発生
      const burden = game.calculateInsuranceBurden()
      expect(burden).toBe(2)
      
      // 有効パワー計算での処理
      const effectivePower = negativeInsurance.calculateEffectivePower()
      expect(effectivePower).toBe(0) // Math.max(0, -5) = 0
    })

    it('極小保険料の累積', () => {
      const microPremiums = []
      
      // 0.01から0.99まで99個の極小保険を作成
      for (let i = 1; i < 100; i++) {
        const microInsurance = Card.createInsuranceCard(`Micro ${i}`, 1, i * 0.01)
        game.addInsurance(microInsurance)
        microPremiums.push(i * 0.01)
      }
      
      const totalBurden = game.calculateInsuranceBurden()
      const expectedTotal = microPremiums.reduce((sum, premium) => sum + premium, 0)
      
      // 累積誤差が許容範囲内
      expect(Math.abs(totalBurden - expectedTotal)).toBeLessThan(0.01)
    })
  })

  describe('🎯 実際のゲームシナリオでの精度検証', () => {
    it('長期ゲームでの保険料累積精度', () => {
      // 定期保険の期限管理と精度
      const termInsurance = new Card({
        id: 'term_precision',
        name: 'Term Precision Test',
        description: '10-turn insurance',
        type: 'insurance',
        power: 4,
        cost: 2.5,
        durationType: 'term',
        remainingTurns: 10,
        effects: []
      })
      
      game.addInsurance(termInsurance)
      
      const burdenHistory: number[] = []
      
      // 20ターン進行（保険期限を超える）
      for (let turn = 1; turn <= 20; turn++) {
        const currentBurden = game.calculateInsuranceBurden()
        burdenHistory.push(currentBurden)
        
        game.nextTurn()
      }
      
      // 10ターンまでは保険料発生
      for (let i = 0; i < 10; i++) {
        expect(burdenHistory[i]).toBe(2.5)
      }
      
      // 11ターン以降は保険料ゼロ
      for (let i = 10; i < 20; i++) {
        expect(burdenHistory[i]).toBe(0)
      }
    })

    it('複数ステージでの保険価値変動', () => {
      const ageAdjustableInsurance = new Card({
        id: 'age_adjustable',
        name: 'Age Adjustable Insurance',
        description: 'Changes with age',
        type: 'insurance',
        power: 5,
        cost: 3,
        ageBonus: 2, // 年齢ボーナス
        effects: []
      })
      
      game.addInsurance(ageAdjustableInsurance)
      
      const stageValues: Array<{stage: GameStage, premium: number, power: number}> = []
      
      const stages: GameStage[] = ['youth', 'middle', 'fulfillment']
      stages.forEach(stage => {
        game.setStage(stage)
        
        const premium = game.calculateCardPremium(ageAdjustableInsurance)
        const effectivePower = ageAdjustableInsurance.calculateEffectivePower()
        
        stageValues.push({
          stage,
          premium: premium.getValue(),
          power: effectivePower
        })
      })
      
      // 年齢に応じた価値変動の一貫性
      stageValues.forEach((value, index) => {
        expect(value.premium).toBeGreaterThan(0)
        expect(value.power).toBeGreaterThan(0)
        
        if (index > 0) {
          // 前のステージと比較して妥当な変動範囲内
          const prevValue = stageValues[index - 1]
          const premiumRatio = value.premium / prevValue.premium
          const powerRatio = value.power / prevValue.power
          
          expect(premiumRatio).toBeLessThan(5) // 5倍未満の変動
          expect(powerRatio).toBeLessThan(3) // 3倍未満の変動
        }
      })
    })

    it('大量保険での計算パフォーマンスと精度', () => {
      const startTime = performance.now()
      
      // 1000個の保険を追加
      for (let i = 1; i <= 1000; i++) {
        const insurance = Card.createInsuranceCard(
          `Performance Insurance ${i}`,
          i % 10 + 1, // パワー1-10
          (i % 100) / 10 + 0.1 // コスト0.1-10.1
        )
        game.addInsurance(insurance)
      }
      
      // 負担計算のパフォーマンス
      let totalBurden = 0
      for (let calc = 0; calc < 100; calc++) {
        totalBurden = game.calculateInsuranceBurden()
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // パフォーマンス要件
      expect(duration).toBeLessThan(1000) // 1秒以内
      
      // 精度要件
      expect(totalBurden).toBeGreaterThan(0)
      expect(totalBurden).toBeLessThan(Number.MAX_SAFE_INTEGER)
      
      // 利用可能活力の一貫性
      const availableVitality = game.getAvailableVitality()
      expect(availableVitality).toBe(game.vitality - totalBurden)
    })
  })
})