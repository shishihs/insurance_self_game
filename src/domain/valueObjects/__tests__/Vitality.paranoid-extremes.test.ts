import { describe, expect, it } from 'vitest'
import { Vitality } from '../Vitality'

/**
 * Vitality値オブジェクト - 極端ケース・異常入力テスト
 * 
 * Test Paranoidによる網羅的破綻パターン検証:
 * - 数値の境界値（最大・最小・ゼロ）
 * - 型安全性の破綻（null/undefined/文字列）
 * - 浮動小数点精度問題
 * - メモリ効率性テスト
 * - 不変性の保証
 */
describe('Vitality - 極端ケース・異常入力テスト', () => {
  
  describe('🔥 境界値テスト - 数値限界', () => {
    it('数値の最大値での動作確認', () => {
      const maxSafeInteger = Number.MAX_SAFE_INTEGER
      const vitality = Vitality.create(maxSafeInteger, maxSafeInteger)
      
      expect(vitality.getValue()).toBe(maxSafeInteger)
      expect(vitality.getMax()).toBe(maxSafeInteger)
      expect(vitality.isFull()).toBe(true)
    })

    it('数値の最小値（0）での動作確認', () => {
      const vitality = Vitality.create(0, 100)
      
      expect(vitality.getValue()).toBe(0)
      expect(vitality.isDepleted()).toBe(true)
      expect(vitality.getPercentage()).toBe(0)
    })

    it('極小の浮動小数点値での精度確認', () => {
      const epsilon = Number.EPSILON
      const vitality = Vitality.create(epsilon, 1)
      
      expect(vitality.getValue()).toBe(epsilon)
      expect(vitality.getPercentage()).toBe(0) // Math.floor で0になる
    })

    it('非常に大きな最大値との比率計算', () => {
      const hugeDifference = Vitality.create(1, 1000000)
      
      expect(hugeDifference.getPercentage()).toBe(0)
      expect(hugeDifference.isDepleted()).toBe(false)
      expect(hugeDifference.isFull()).toBe(false)
    })

    it('1未満の最大値エラーハンドリング', () => {
      expect(() => Vitality.create(0, 0)).toThrow('Maximum vitality must be positive')
      expect(() => Vitality.create(0, -1)).toThrow('Maximum vitality must be positive')
      expect(() => Vitality.create(0, 0.5)).not.toThrow() // 0.5は有効
    })
  })

  describe('💀 型安全性の破綻テスト', () => {
    it('NaNが渡された場合のエラーハンドリング', () => {
      expect(() => Vitality.create(NaN, 100)).toThrow('Vitality value must be a finite number')
      expect(() => Vitality.create(50, NaN)).toThrow('Maximum vitality must be a finite number')
    })

    it('Infinityが渡された場合のエラーハンドリング', () => {
      expect(() => Vitality.create(Infinity, 100)).toThrow('Vitality value must be a finite number')
      expect(() => Vitality.create(-Infinity, 100)).toThrow('Vitality value must be a finite number')
      expect(() => Vitality.create(50, Infinity)).toThrow('Maximum vitality must be a finite number')
      expect(() => Vitality.create(50, -Infinity)).toThrow('Maximum vitality must be a finite number')
    })

    // 型変換攻撃のテスト
    it('文字列型が渡された場合の型安全性', () => {
      // TypeScriptレベルで防がれるが、実行時の型チェックも確認
      const fakeVitality = () => (Vitality as any).create('100', '200')
      expect(fakeVitality).toThrow()
    })

    it('null/undefinedが渡された場合の処理', () => {
      const fakeNull = () => (Vitality as any).create(null, 100)
      const fakeUndefined = () => (Vitality as any).create(undefined, 100)
      
      expect(fakeNull).toThrow()
      expect(fakeUndefined).toThrow()
    })

    it('オブジェクトが渡された場合の処理', () => {
      const fakeObj = () => (Vitality as any).create({}, 100)
      const fakeArray = () => (Vitality as any).create([], 100)
      
      expect(fakeObj).toThrow()
      expect(fakeArray).toThrow()
    })
  })

  describe('⚡ 演算の境界条件テスト', () => {
    it('decrease操作での境界条件', () => {
      const vitality = Vitality.create(50, 100)
      
      // 正常な減少
      const decreased = vitality.decrease(25)
      expect(decreased.getValue()).toBe(25)
      
      // 値を超える減少（0に収束）
      const overDecrease = vitality.decrease(100)
      expect(overDecrease.getValue()).toBe(0)
      expect(overDecrease.isDepleted()).toBe(true)
      
      // 極小値での操作
      const tiny = vitality.decrease(49.999999)
      expect(tiny.getValue()).toBeCloseTo(0.000001, 6)
    })

    it('increase操作での境界条件', () => {
      const vitality = Vitality.create(50, 100)
      
      // 正常な増加
      const increased = vitality.increase(25)
      expect(increased.getValue()).toBe(75)
      
      // 最大値を超える増加（最大値に収束）
      const overIncrease = vitality.increase(100)
      expect(overIncrease.getValue()).toBe(100)
      expect(overIncrease.isFull()).toBe(true)
      
      // 極小値での操作
      const tiny = vitality.increase(0.000001)
      expect(tiny.getValue()).toBeCloseTo(50.000001, 6)
    })

    it('負の値での操作エラーハンドリング', () => {
      const vitality = Vitality.create(50, 100)
      
      expect(() => vitality.decrease(-10)).toThrow('Decrease amount must be non-negative')
      expect(() => vitality.increase(-10)).toThrow('Increase amount must be non-negative')
    })

    it('withMaxVitality での境界条件', () => {
      const vitality = Vitality.create(80, 100)
      
      // 現在値より小さい最大値に変更
      const reduced = vitality.withMaxVitality(60)
      expect(reduced.getValue()).toBe(60) // 調整される
      expect(reduced.getMax()).toBe(60)
      
      // 現在値より大きい最大値に変更
      const expanded = vitality.withMaxVitality(120)
      expect(expanded.getValue()).toBe(80) // そのまま
      expect(expanded.getMax()).toBe(120)
      
      // 極小値への変更
      const tiny = vitality.withMaxVitality(0.1)
      expect(tiny.getValue()).toBe(0.1)
      expect(tiny.getMax()).toBe(0.1)
    })
  })

  describe('🧠 不変性・同等性テスト', () => {
    it('インスタンスの不変性確認', () => {
      const original = Vitality.create(50, 100)
      const decreased = original.decrease(10)
      const increased = original.increase(10)
      
      // 元のインスタンスは変更されない
      expect(original.getValue()).toBe(50)
      expect(decreased.getValue()).toBe(40)
      expect(increased.getValue()).toBe(60)
      
      // 参照が異なることを確認
      expect(original).not.toBe(decreased)
      expect(original).not.toBe(increased)
    })

    it('equals メソッドの正確性', () => {
      const v1 = Vitality.create(50, 100)
      const v2 = Vitality.create(50, 100)
      const v3 = Vitality.create(51, 100)
      const v4 = Vitality.create(50, 101)
      
      expect(v1.equals(v2)).toBe(true)
      expect(v1.equals(v3)).toBe(false)
      expect(v1.equals(v4)).toBe(false)
    })

    it('toString の一貫性', () => {
      const vitality = Vitality.create(75, 100)
      expect(vitality.toString()).toBe('75/100 (75%)')
      
      const zero = Vitality.create(0, 100)
      expect(zero.toString()).toBe('0/100 (0%)')
      
      const full = Vitality.create(100, 100)
      expect(full.toString()).toBe('100/100 (100%)')
      
      // 小数点のケース
      const decimal = Vitality.create(33.33, 100)
      expect(decimal.toString()).toBe('33.33/100 (33%)')
    })
  })

  describe('🔄 ストレステスト・パフォーマンス', () => {
    it('大量のインスタンス生成パフォーマンス', () => {
      const startTime = performance.now()
      const instances: Vitality[] = []
      
      for (let i = 0; i < 10000; i++) {
        instances.push(Vitality.create(i % 100, 100))
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(instances.length).toBe(10000)
      expect(duration).toBeLessThan(100) // 100ms以内に完了
    })

    it('連続操作でのメモリ効率性', () => {
      let vitality = Vitality.create(50, 100)
      
      // 1000回の連続操作
      for (let i = 0; i < 1000; i++) {
        if (i % 2 === 0) {
          vitality = vitality.increase(1)
        } else {
          vitality = vitality.decrease(1)
        }
      }
      
      // 最終値が期待通り
      expect(vitality.getValue()).toBe(50)
      
      // ガベージコレクションのトリガー
      if (global.gc) {
        global.gc()
      }
    })

    it('浮動小数点精度の累積エラーテスト', () => {
      let vitality = Vitality.create(0, 1)
      
      // 0.1 を10回足すと1になるはず
      for (let i = 0; i < 10; i++) {
        vitality = vitality.increase(0.1)
      }
      
      // 浮動小数点精度の問題があるかもしれないが、期待値は1に近い
      expect(vitality.getValue()).toBeCloseTo(1, 10)
    })
  })

  describe('🎯 実際のゲームシナリオでの境界条件', () => {
    it('保険料負担による複雑な利用可能活力計算', () => {
      const vitality = Vitality.create(100, 100)
      const premium = 30
      
      // 利用可能活力が70になる状況
      const available = vitality.getValue() - premium
      expect(available).toBe(70)
      
      // このケースでのパーセンテージ
      const availableVitality = Vitality.create(available, 100)
      expect(availableVitality.getPercentage()).toBe(70)
    })

    it('年齢による最大活力減少シナリオ', () => {
      // 青年期: 最大100
      const youth = Vitality.create(100, 100)
      expect(youth.isFull()).toBe(true)
      
      // 中年期: 最大80に減少
      const middle = youth.withMaxVitality(80)
      expect(middle.getValue()).toBe(80) // 自動調整
      expect(middle.isFull()).toBe(true)
      
      // 充実期: 最大60に減少
      const fulfillment = middle.withMaxVitality(60)
      expect(fulfillment.getValue()).toBe(60)
      expect(fulfillment.isFull()).toBe(true)
    })

    it('ダメージ軽減後の極小活力での生存判定', () => {
      const nearDeath = Vitality.create(0.1, 100)
      expect(nearDeath.isDepleted()).toBe(false)
      
      const deceased = nearDeath.decrease(0.1)
      expect(deceased.isDepleted()).toBe(true)
      expect(deceased.getValue()).toBe(0)
    })

    it('最大回復での完全回復確認', () => {
      const damaged = Vitality.create(1, 100)
      const healed = damaged.increase(200) // 過剰回復
      
      expect(healed.getValue()).toBe(100)
      expect(healed.isFull()).toBe(true)
      expect(healed.getPercentage()).toBe(100)
    })
  })

  describe('🔒 契約による設計テスト', () => {
    it('事前条件違反のエラーメッセージ品質', () => {
      // 具体的でデバッグしやすいエラーメッセージか
      expect(() => Vitality.create(-1, 100))
        .toThrow('Vitality value cannot be negative')
      
      expect(() => Vitality.create(101, 100))
        .toThrow('Vitality value cannot exceed maximum (100)')
        
      expect(() => Vitality.create(50, 0))
        .toThrow('Maximum vitality must be positive')
    })

    it('事後条件の保証', () => {
      const vitality = Vitality.create(50, 100)
      
      // increase後の事後条件
      const increased = vitality.increase(30)
      expect(increased.getValue()).toBeGreaterThanOrEqual(vitality.getValue())
      expect(increased.getValue()).toBeLessThanOrEqual(vitality.getMax())
      
      // decrease後の事後条件
      const decreased = vitality.decrease(30)
      expect(decreased.getValue()).toBeLessThanOrEqual(vitality.getValue())
      expect(decreased.getValue()).toBeGreaterThanOrEqual(0)
    })

    it('不変条件の維持', () => {
      const vitality = Vitality.create(75, 100)
      
      // どの操作でも不変条件が保たれる
      expect(vitality.getValue()).toBeGreaterThanOrEqual(0)
      expect(vitality.getValue()).toBeLessThanOrEqual(vitality.getMax())
      expect(vitality.getMax()).toBeGreaterThan(0)
      
      // 操作後も同様
      const ops = [
        vitality.increase(50),
        vitality.decrease(50),
        vitality.withMaxVitality(150),
        vitality.withMaxVitality(50)
      ]
      
      ops.forEach(v => {
        expect(v.getValue()).toBeGreaterThanOrEqual(0)
        expect(v.getValue()).toBeLessThanOrEqual(v.getMax())
        expect(v.getMax()).toBeGreaterThan(0)
      })
    })
  })
})