/**
 * 値オブジェクトの堅牢性テスト
 * 
 * すべての値オブジェクトが異常な入力や境界条件に対して
 * 適切に動作することを検証します。
 */

import { describe, it, expect } from 'vitest'
import { CardPower } from '../../domain/valueObjects/CardPower'
import { Vitality } from '../../domain/valueObjects/Vitality'
import { InsurancePremium } from '../../domain/valueObjects/InsurancePremium'

describe('値オブジェクト堅牢性テスト', () => {
  describe('CardPower異常入力テスト', () => {
    const invalidInputs = [
      { input: -1, description: '負の整数' },
      { input: -0.1, description: '負の小数' },
      { input: 1000, description: '最大値超過' },
      { input: NaN, description: 'NaN' },
      { input: Infinity, description: '正の無限大' },
      { input: -Infinity, description: '負の無限大' },
      { input: null as any, description: 'null' },
      { input: undefined as any, description: 'undefined' },
      { input: 'string' as any, description: '文字列' },
      { input: [] as any, description: '配列' },
      { input: {} as any, description: 'オブジェクト' },
      { input: true as any, description: 'boolean' }
    ]

    invalidInputs.forEach(({ input, description }) => {
      it(`${description}（${input}）でエラーを投げる`, () => {
        expect(() => CardPower.create(input)).toThrow()
      })
    })

    it('小数点以下は切り捨てられる', () => {
      const power = CardPower.create(10.9)
      expect(power.getValue()).toBe(10)
    })

    it('ゼロは有効', () => {
      const power = CardPower.create(0)
      expect(power.getValue()).toBe(0)
    })

    it('最大値は有効', () => {
      const power = CardPower.create(999)
      expect(power.getValue()).toBe(999)
    })

    it('非常に小さい正の数は0になる', () => {
      const power = CardPower.create(0.1)
      expect(power.getValue()).toBe(0)
    })
  })

  describe('CardPower演算の境界テスト', () => {
    it('最大値 + 最大値 = 最大値（オーバーフロー防止）', () => {
      const power1 = CardPower.create(999)
      const power2 = CardPower.create(999)
      const result = power1.add(power2)
      expect(result.getValue()).toBe(999)
    })

    it('ゼロ + ゼロ = ゼロ', () => {
      const power1 = CardPower.create(0)
      const power2 = CardPower.create(0)
      const result = power1.add(power2)
      expect(result.getValue()).toBe(0)
    })

    it('大量の値の合計でオーバーフローしない', () => {
      const powers = Array.from({ length: 1000 }, () => CardPower.create(1))
      const result = CardPower.sum(powers)
      expect(result.getValue()).toBe(999) // 最大値で制限
    })

    it('空配列の合計はゼロ', () => {
      const result = CardPower.sum([])
      expect(result.getValue()).toBe(0)
    })

    it('multiply操作での境界値', () => {
      const power = CardPower.create(100)
      
      // 非常に大きい倍率
      const result1 = power.multiply(1000)
      expect(result1.getValue()).toBe(999) // 最大値制限
      
      // ゼロ倍率
      const result2 = power.multiply(0)
      expect(result2.getValue()).toBe(0)
      
      // 非常に小さい倍率
      const result3 = power.multiply(0.001)
      expect(result3.getValue()).toBe(0) // 切り捨て
    })

    it('negative multiplier throws error', () => {
      const power = CardPower.create(10)
      expect(() => power.multiply(-1)).toThrow('Multiplier cannot be negative')
    })
  })

  describe('Vitality異常入力テスト', () => {
    const invalidInputs = [
      { input: -1, description: '負の整数' },
      { input: 1000, description: '最大値超過' },
      { input: NaN, description: 'NaN' },
      { input: Infinity, description: '正の無限大' },
      { input: -Infinity, description: '負の無限大' },
      { input: null as any, description: 'null' },
      { input: undefined as any, description: 'undefined' }
    ]

    invalidInputs.forEach(({ input, description }) => {
      it(`${description}（${input}）でエラーを投げる`, () => {
        expect(() => Vitality.create(input)).toThrow()
      })
    })

    it('ゼロは有効', () => {
      const vitality = Vitality.create(0)
      expect(vitality.getValue()).toBe(0)
      expect(vitality.isZero()).toBe(true)
    })

    it('最大値は有効', () => {
      const vitality = Vitality.create(999)
      expect(vitality.getValue()).toBe(999)
    })
  })

  describe('Vitality演算の境界テスト', () => {
    it('最大値での減算操作', () => {
      const vitality = Vitality.create(999)
      const reduced = vitality.subtract(Vitality.create(999))
      expect(reduced.getValue()).toBe(0)
      expect(reduced.isZero()).toBe(true)
    })

    it('ゼロから減算してもゼロのまま', () => {
      const vitality = Vitality.create(0)
      const reduced = vitality.subtract(Vitality.create(10))
      expect(reduced.getValue()).toBe(0)
    })

    it('最大値に追加してもオーバーフローしない', () => {
      const vitality = Vitality.create(999)
      const increased = vitality.add(Vitality.create(100))
      expect(increased.getValue()).toBe(999) // 最大値制限
    })

    it('大量の演算でも安定', () => {
      let vitality = Vitality.create(500)
      
      // 1000回の加算と減算
      for (let i = 0; i < 1000; i++) {
        vitality = vitality.add(Vitality.create(1))
        vitality = vitality.subtract(Vitality.create(1))
      }
      
      expect(vitality.getValue()).toBe(500)
    })

    it('percentage 計算の境界値', () => {
      const vitality = Vitality.create(100)
      
      // 0%
      const result1 = vitality.percentage(0)
      expect(result1.getValue()).toBe(0)
      
      // 100%
      const result2 = vitality.percentage(100)
      expect(result2.getValue()).toBe(100)
      
      // 200%
      const result3 = vitality.percentage(200)
      expect(result3.getValue()).toBe(200)
      
      // 1000% (オーバーフロー)
      const result4 = vitality.percentage(1000)
      expect(result4.getValue()).toBe(999) // 最大値制限
    })
  })

  describe('InsurancePremium異常入力テスト', () => {
    const invalidInputs = [
      { input: -1, description: '負の値' },
      { input: NaN, description: 'NaN' },
      { input: Infinity, description: '正の無限大' },
      { input: -Infinity, description: '負の無限大' },
      { input: null as any, description: 'null' },
      { input: undefined as any, description: 'undefined' }
    ]

    invalidInputs.forEach(({ input, description }) => {
      it(`${description}（${input}）でエラーを投げる`, () => {
        expect(() => InsurancePremium.create(input)).toThrow()
      })
    })

    it('ゼロは有効', () => {
      const premium = InsurancePremium.create(0)
      expect(premium.getValue()).toBe(0)
    })

    it('非常に大きい値でも処理できる', () => {
      const premium = InsurancePremium.create(999999)
      expect(premium.getValue()).toBe(999999)
    })
  })

  describe('InsurancePremium演算の境界テスト', () => {
    it('ゼロ保険料の演算', () => {
      const premium = InsurancePremium.create(0)
      
      const multiplied = premium.applyMultiplier(2.0)
      expect(multiplied.getValue()).toBe(0)
      
      const discounted = premium.applyDiscount(0.1)
      expect(discounted.getValue()).toBe(0)
    })

    it('大きい保険料の計算', () => {
      const premium = InsurancePremium.create(1000000)
      
      const multiplied = premium.applyMultiplier(1.5)
      expect(multiplied.getValue()).toBe(1500000)
      
      const discounted = premium.applyDiscount(0.2)
      expect(discounted.getValue()).toBe(800000)
    })

    it('複数保険料の合計', () => {
      const premiums = [
        InsurancePremium.create(100),
        InsurancePremium.create(200),
        InsurancePremium.create(300)
      ]
      
      const total = InsurancePremium.sum(premiums)
      expect(total.getValue()).toBe(600)
    })

    it('空配列の合計はゼロ', () => {
      const total = InsurancePremium.sum([])
      expect(total.getValue()).toBe(0)
    })

    it('無効な倍率でエラー', () => {
      const premium = InsurancePremium.create(100)
      
      expect(() => premium.applyMultiplier(-1)).toThrow()
      expect(() => premium.applyMultiplier(NaN)).toThrow()
      expect(() => premium.applyMultiplier(Infinity)).toThrow()
    })

    it('無効な割引率でエラー', () => {
      const premium = InsurancePremium.create(100)
      
      expect(() => premium.applyDiscount(-0.1)).toThrow()
      expect(() => premium.applyDiscount(1.1)).toThrow()
      expect(() => premium.applyDiscount(NaN)).toThrow()
    })

    it('小数点の丸め処理', () => {
      const premium = InsurancePremium.create(100)
      
      // 1.5倍は150
      const result1 = premium.applyMultiplier(1.5)
      expect(result1.getValue()).toBe(150)
      
      // 1.33倍は133（切り捨て）
      const result2 = premium.applyMultiplier(1.33)
      expect(result2.getValue()).toBe(133)
    })
  })

  describe('値オブジェクト比較演算の境界テスト', () => {
    describe('CardPower比較', () => {
      it('同じ値での比較', () => {
        const power1 = CardPower.create(100)
        const power2 = CardPower.create(100)
        
        expect(power1.equals(power2)).toBe(true)
        expect(power1.isGreaterThan(power2)).toBe(false)
        expect(power1.isGreaterThanOrEqual(power2)).toBe(true)
      })

      it('境界値での比較', () => {
        const min = CardPower.create(0)
        const max = CardPower.create(999)
        
        expect(min.isGreaterThan(max)).toBe(false)
        expect(max.isGreaterThan(min)).toBe(true)
        expect(min.equals(max)).toBe(false)
      })
    })

    describe('Vitality比較', () => {
      it('ゼロ状態の検証', () => {
        const zero = Vitality.create(0)
        const nonZero = Vitality.create(1)
        
        expect(zero.isZero()).toBe(true)
        expect(nonZero.isZero()).toBe(false)
        expect(zero.isDepleted()).toBe(true)
        expect(nonZero.isDepleted()).toBe(false)
      })

      it('十分性の判定', () => {
        const vitality = Vitality.create(100)
        const requirement1 = Vitality.create(50)
        const requirement2 = Vitality.create(100)
        const requirement3 = Vitality.create(150)
        
        expect(vitality.isSufficientFor(requirement1)).toBe(true)
        expect(vitality.isSufficientFor(requirement2)).toBe(true)
        expect(vitality.isSufficientFor(requirement3)).toBe(false)
      })
    })
  })

  describe('メモリ効率とパフォーマンステスト', () => {
    it('大量の値オブジェクト生成でもメモリリークしない', () => {
      const startMemory = process.memoryUsage().heapUsed
      
      // 10000個の値オブジェクトを生成
      const objects = []
      for (let i = 0; i < 10000; i++) {
        objects.push(CardPower.create(i % 1000))
        objects.push(Vitality.create(i % 1000))
        objects.push(InsurancePremium.create(i % 1000))
      }
      
      const midMemory = process.memoryUsage().heapUsed
      const memoryIncrease = midMemory - startMemory
      
      // オブジェクトをクリア
      objects.length = 0
      
      // メモリ使用量が合理的な範囲内であることを確認
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // 50MB未満
    })

    it('大量の演算処理でも高速', () => {
      const startTime = Date.now()
      
      let power = CardPower.create(500)
      let vitality = Vitality.create(500)
      let premium = InsurancePremium.create(500)
      
      // 10000回の演算
      for (let i = 0; i < 10000; i++) {
        power = power.add(CardPower.create(1))
        vitality = vitality.add(Vitality.create(1))
        premium = premium.applyMultiplier(1.001)
      }
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // 演算が2秒以内に完了することを確認
      expect(duration).toBeLessThan(2000)
      
      // 結果が正しいことを確認
      expect(power.getValue()).toBe(999) // 最大値制限
      expect(vitality.getValue()).toBe(999) // 最大値制限
      expect(premium.getValue()).toBeGreaterThan(500)
    })
  })

  describe('不変性（Immutability）テスト', () => {
    it('CardPower操作で元のオブジェクトが変更されない', () => {
      const original = CardPower.create(100)
      const originalValue = original.getValue()
      
      const modified = original.add(CardPower.create(50))
      const multiplied = original.multiply(2)
      
      // 元のオブジェクトは変更されていない
      expect(original.getValue()).toBe(originalValue)
      expect(modified.getValue()).toBe(150)
      expect(multiplied.getValue()).toBe(200)
    })

    it('Vitality操作で元のオブジェクトが変更されない', () => {
      const original = Vitality.create(100)
      const originalValue = original.getValue()
      
      const increased = original.add(Vitality.create(50))
      const decreased = original.subtract(Vitality.create(30))
      const percentage = original.percentage(50)
      
      // 元のオブジェクトは変更されていない
      expect(original.getValue()).toBe(originalValue)
      expect(increased.getValue()).toBe(150)
      expect(decreased.getValue()).toBe(70)
      expect(percentage.getValue()).toBe(50)
    })

    it('InsurancePremium操作で元のオブジェクトが変更されない', () => {
      const original = InsurancePremium.create(100)
      const originalValue = original.getValue()
      
      const multiplied = original.applyMultiplier(1.5)
      const discounted = original.applyDiscount(0.2)
      
      // 元のオブジェクトは変更されていない
      expect(original.getValue()).toBe(originalValue)
      expect(multiplied.getValue()).toBe(150)
      expect(discounted.getValue()).toBe(80)
    })
  })
})