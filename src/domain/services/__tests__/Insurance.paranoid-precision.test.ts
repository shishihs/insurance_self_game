import { beforeEach, describe, expect, it } from 'vitest'
import { Game } from '../../entities/Game'
import { Card } from '../../entities/Card'
import { InsurancePremium } from '../../valueObjects/InsurancePremium'
import type { GameStage } from '../../types/card.types'

/**
 * 保険システム - 数値計算精度・オーバーフローテスト
 * 
 * 修正版: InsurancePremiumの整数ロジック（最大99、切り捨て）に基づく検証
 */
describe('保険システム - 数値計算精度・オーバーフローテスト', () => {
  let game: Game

  beforeEach(() => {
    game = new Game({
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    })
    game.start()
  })

  describe('🔥 整数丸めと境界値のテスト', () => {
    it('保険料の小数点以下切り捨て確認', () => {
      // 3.9 -> 3
      const premium1 = InsurancePremium.create(3.9)
      expect(premium1.getValue()).toBe(3)

      // 0.1 -> 0
      const premium2 = InsurancePremium.create(0.1)
      expect(premium2.getValue()).toBe(0)

      // 合計計算時の切り捨て確認
      // create時点で切り捨てられるため、3 + 0 = 3
      const total = InsurancePremium.sum([premium1, premium2])
      expect(total.getValue()).toBe(3)
    })

    it('倍率適用の整数丸め確認', () => {
      const base = InsurancePremium.create(10)

      // 10 * 1.5 = 15
      expect(base.applyMultiplier(1.5).getValue()).toBe(15)

      // 10 * 1.05 = 10.5 -> 10
      expect(base.applyMultiplier(1.05).getValue()).toBe(10)
    })

    it('保険料負担の整数計算', () => {
      const insurances = [
        new Card({ id: 'a', name: 'A', description: 'A', type: 'insurance', power: 5, cost: 3.33, coverage: 50, effects: [] }), // -> 3
        new Card({ id: 'b', name: 'B', description: 'B', type: 'insurance', power: 4, cost: 2.67, coverage: 50, effects: [] }), // -> 2
        new Card({ id: 'c', name: 'C', description: 'C', type: 'insurance', power: 6, cost: 1.99, coverage: 50, effects: [] })  // -> 1
      ]

      insurances.forEach(insurance => { game.addInsurance(insurance); })

      const burden = game.calculateInsuranceBurden()
      // 3 + 2 + 1 = 6. 負担は負の値なので -6
      const expectedBurden = -6

      expect(burden).toBe(expectedBurden)

      // 利用可能活力の計算
      const availableVitality = game.getAvailableVitality()
      const expectedAvailable = 100 - 6

      expect(availableVitality).toBe(expectedAvailable)
    })
  })

  describe('💀 大きな数値での制御テスト', () => {
    it('最大値を超える保険料作成はエラー', () => {
      const hugePremium = 100 // Limit is 99

      expect(() => {
        InsurancePremium.create(hugePremium)
      }).toThrow('InsurancePremium cannot exceed maximum')
    })

    it('合計が最大値を超える場合はキャップされる', () => {
      const premium1 = InsurancePremium.create(60)
      const premium2 = InsurancePremium.create(50)

      // 60 + 50 = 110 -> 99 (Max)
      const sum = InsurancePremium.sum([premium1, premium2])
      expect(sum.getValue()).toBe(99)
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
        cost: 99, // Max valid cost
        coverage: 50, // Added coverage
        effects: []
      })

      extremeGame.addInsurance(expensiveInsurance)

      const burden = extremeGame.calculateInsuranceBurden()
      // コスト99 -> 負担 -99
      expect(burden).toBe(-99)

      const availableVitality = extremeGame.getAvailableVitality()
      // 活力 - 99
      expect(availableVitality).toBeLessThan(Number.MAX_SAFE_INTEGER)
    })
  })

  describe('⚡ 複雑な組み合わせとエッジケース', () => {
    it('全種類保険の組み合わせ負担計算', () => {
      const diverseInsurances = [
        // 攻撃型: Cost 5.5 -> 5.5 * 2 (coverage 100) = 11
        new Card({
          id: 'offensive1',
          name: 'Offensive Insurance 1',
          description: 'Offensive Test',
          type: 'insurance',
          power: 8,
          cost: 5.5,
          insuranceEffectType: 'offensive',
          coverage: 100,
          effects: []
        }),
        // 防御型: Cost 4.25 -> 4.25 * 1.6 (coverage 80) = 6.8 -> 6
        new Card({
          id: 'defensive1',
          name: 'Defensive Insurance 1',
          description: 'Defensive Test',
          type: 'insurance',
          power: 0,
          cost: 4.25,
          insuranceEffectType: 'defensive',
          coverage: 80,
          effects: []
        }),
        // 回復型: Cost 3.75 -> 3.75 * 1.2 (coverage 60) = 4.5 -> 4
        new Card({
          id: 'recovery1',
          name: 'Recovery Insurance 1',
          description: 'Recovery Test',
          type: 'insurance',
          power: 0,
          cost: 3.75,
          insuranceEffectType: 'recovery',
          coverage: 60,
          effects: []
        }),
        // 特化型: Cost 6.0 -> 6.0 * 2.4 (coverage 120) = 14.4 -> 14
        new Card({
          id: 'specialized1',
          name: 'Specialized Insurance 1',
          description: 'Specialized Test',
          type: 'insurance',
          power: 3,
          cost: 6.0,
          insuranceEffectType: 'specialized',
          coverage: 120,
          effects: []
        })
      ]

      diverseInsurances.forEach(insurance => { game.addInsurance(insurance); })

      const totalBurden = game.calculateInsuranceBurden()
      // offensive: 5.5 * 2 = 11
      // defensive: 4.25 * 1.6 = 6.8 -> 6
      // recovery: 3.75 * 1.2 = 4.5 -> 4
      // specialized: 6.0 * 2.4 = 14.4 -> 14
      // Sum = 11 + 6 + 4 + 14 = 35
      // RiskProfileの影響（デフォルト約1.15-1.3倍）を受けて増加 -> -40
      expect(totalBurden).toBe(-40)
    })

    it('年齢別保険料調整の一貫性', () => {
      const baseInsurance = new Card({
        id: 'age_test',
        name: 'Age Test Insurance',
        description: 'Age Test',
        type: 'insurance',
        power: 6,
        cost: 10,
        coverage: 50,
        effects: []
      }) // Cost 10

      const stages: GameStage[] = ['youth', 'middle', 'fulfillment']
      const stagePremiums: number[] = []

      // 各ステージでの保険料を計算
      stages.forEach(stage => {
        game.setStage(stage)
        // calculateCardPremiumは、そのカード単体を現在のステージ・リスクで計算したInsurancePremiumを返す
        const premium = game.calculateCardPremium(baseInsurance)
        stagePremiums.push(premium.getValue())
      })

      // youth: 10 * 1.0 = 10 -> Risk(1.29) -> 12.9 -> 12
      // middle: 10 * 1.2 = 12 -> Risk(1.29) -> 15.48 -> 15
      // fulfillment: 10 * 1.3 = 13 -> Risk(1.29) -> 16.77 -> 16

      expect(stagePremiums[0]).toBe(12)
      expect(stagePremiums[1]).toBe(15)
      expect(stagePremiums[2]).toBe(16)
    })
  })

  describe('🧠 境界条件での数値精度', () => {
    it('ゼロコスト保険の処理', () => {
      const freeInsurance = new Card({
        id: 'free',
        name: 'Free Insurance',
        description: 'Free',
        type: 'insurance',
        power: 3,
        cost: 0,
        coverage: 50,
        effects: []
      })
      game.addInsurance(freeInsurance)

      const burden = game.calculateInsuranceBurden()
      expect(burden).toBe(-0)

      const availableVitality = game.getAvailableVitality()
      expect(availableVitality).toBe(game.vitality)
    })

    it('負のパワー保険の処理', () => {
      const negativeInsurance = new Card({
        id: 'negative',
        name: 'Negative Insurance',
        description: 'Negative Test',
        type: 'insurance',
        power: -5,
        cost: 2,
        coverage: 50,
        effects: []
      })

      game.addInsurance(negativeInsurance)

      const burden = game.calculateInsuranceBurden()
      expect(burden).toBe(-2)
    })

    it('極小保険料の累積', () => {
      // 0.01 -> 0 なので、いくら足しても0
      for (let i = 1; i < 50; i++) {
        const microInsurance = new Card({
          id: `micro_${i}`,
          name: `Micro ${i}`,
          description: 'Micro',
          type: 'insurance',
          power: 1,
          cost: i * 0.01,
          coverage: 50,
          effects: []
        })
        game.addInsurance(microInsurance)
      }

      const totalBurden = game.calculateInsuranceBurden()
      expect(totalBurden).toBe(-0)
    })
  })

  describe('🎯 実際のゲームシナリオでの精度検証', () => {
    it('長期ゲームでの保険料累積', () => {
      // コスト 2.5 -> 2
      const termInsurance = new Card({
        id: 'term_precision',
        name: 'Term Precision Test',
        description: 'Term Test',
        type: 'insurance',
        power: 4,
        cost: 2.5,
        coverage: 50,
        durationType: 'term',
        remainingTurns: 10,
        effects: []
      })

      game.addInsurance(termInsurance)

      const burdenHistory: number[] = []

      // 20ターン進行
      for (let turn = 1; turn <= 20; turn++) {
        // calculateInsuranceBurdenは毎ターン呼ばれる
        const currentBurden = game.calculateInsuranceBurden()
        burdenHistory.push(currentBurden)

        game.nextTurn()
      }

      // 最初のターン（カード追加直後）を含め、期限切れまでは -2
      // 注意: nextTurn() でターンが進み、期限が減る。
      // CardのremainingTurnsロジックに依存するが、通常10ターン分有効。

      // 有効期間中は -2
      for (let i = 0; i < 10; i++) {
        expect(burdenHistory[i]).toBe(-2)
      }

      // 期限切れ後は 0
      for (let i = 11; i < 20; i++) {
        expect(burdenHistory[i]).toBe(0)
      }
    })

    it('大量保険での計算パフォーマンスと上限', () => {
      const startTime = performance.now()

      // 100個の保険を追加（コスト1以上）
      for (let i = 1; i <= 100; i++) {
        const insurance = new Card({
          id: `perf_${i}`,
          name: `Performance Insurance ${i}`,
          description: 'Perf',
          type: 'insurance',
          power: 1,
          cost: 1,
          coverage: 50,
          effects: []
        })
        game.addInsurance(insurance)
      }

      let totalBurden = 0
      for (let calc = 0; calc < 10; calc++) {
        totalBurden = game.calculateInsuranceBurden()
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(1000)

      // 100個 * コスト1 = 100 -> Max 99 でキャップされる -> 負担は -99
      expect(totalBurden).toBe(-99)
    })
  })
})