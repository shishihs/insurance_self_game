import { describe, expect, it } from 'vitest'
import { Vitality } from '../Vitality'

describe('Vitality値オブジェクト', () => {
  describe('生成', () => {
    it('正常な値で生成できる', () => {
      const vitality = Vitality.create(50, 100)
      expect(vitality).toBeDefined()
      expect(vitality.getValue()).toBe(50)
      expect(vitality.getMax()).toBe(100)
    })

    it('負の値では生成できない', () => {
      expect(() => Vitality.create(-1, 100)).toThrow('Vitality value cannot be negative')
    })

    it('最大値を超える値では生成できない', () => {
      expect(() => Vitality.create(150, 100)).toThrow('Vitality value cannot exceed maximum')
    })

    it('最大値が0以下では生成できない', () => {
      expect(() => Vitality.create(0, 0)).toThrow('Maximum vitality must be positive')
    })
  })

  describe('減少操作', () => {
    it('正常に減少できる', () => {
      const vitality = Vitality.create(50, 100)
      const decreased = vitality.decrease(20)
      
      expect(decreased.getValue()).toBe(30)
      expect(decreased.getMax()).toBe(100)
      // イミュータブルであることを確認
      expect(vitality.getValue()).toBe(50)
    })

    it('0を下回らない', () => {
      const vitality = Vitality.create(30, 100)
      const decreased = vitality.decrease(50)
      
      expect(decreased.getValue()).toBe(0)
    })

    it('負の値で減少しようとするとエラー', () => {
      const vitality = Vitality.create(50, 100)
      expect(() => vitality.decrease(-10)).toThrow('Decrease amount must be non-negative')
    })
  })

  describe('増加操作', () => {
    it('正常に増加できる', () => {
      const vitality = Vitality.create(50, 100)
      const increased = vitality.increase(20)
      
      expect(increased.getValue()).toBe(70)
      expect(increased.getMax()).toBe(100)
      // イミュータブルであることを確認
      expect(vitality.getValue()).toBe(50)
    })

    it('最大値を超えない', () => {
      const vitality = Vitality.create(80, 100)
      const increased = vitality.increase(50)
      
      expect(increased.getValue()).toBe(100)
    })

    it('負の値で増加しようとするとエラー', () => {
      const vitality = Vitality.create(50, 100)
      expect(() => vitality.increase(-10)).toThrow('Increase amount must be non-negative')
    })
  })

  describe('パーセンテージ計算', () => {
    it('正しくパーセンテージを計算する', () => {
      const vitality = Vitality.create(50, 100)
      expect(vitality.getPercentage()).toBe(50)
    })

    it('小数点以下は切り捨てる', () => {
      const vitality = Vitality.create(33, 100)
      expect(vitality.getPercentage()).toBe(33)
    })
  })

  describe('状態判定', () => {
    it('活力が0の時、枯渇状態と判定される', () => {
      const vitality = Vitality.create(0, 100)
      expect(vitality.isDepleted()).toBe(true)
    })

    it('活力が1以上の時、枯渇状態ではない', () => {
      const vitality = Vitality.create(1, 100)
      expect(vitality.isDepleted()).toBe(false)
    })

    it('活力が最大値の時、満タン状態と判定される', () => {
      const vitality = Vitality.create(100, 100)
      expect(vitality.isFull()).toBe(true)
    })

    it('活力が最大値未満の時、満タン状態ではない', () => {
      const vitality = Vitality.create(99, 100)
      expect(vitality.isFull()).toBe(false)
    })
  })

  describe('等価性', () => {
    it('同じ値の場合、等価と判定される', () => {
      const vitality1 = Vitality.create(50, 100)
      const vitality2 = Vitality.create(50, 100)
      
      expect(vitality1.equals(vitality2)).toBe(true)
    })

    it('値が異なる場合、等価ではない', () => {
      const vitality1 = Vitality.create(50, 100)
      const vitality2 = Vitality.create(60, 100)
      
      expect(vitality1.equals(vitality2)).toBe(false)
    })

    it('最大値が異なる場合、等価ではない', () => {
      const vitality1 = Vitality.create(50, 100)
      const vitality2 = Vitality.create(50, 120)
      
      expect(vitality1.equals(vitality2)).toBe(false)
    })
  })

  describe('文字列表現', () => {
    it('読みやすい形式で文字列化される', () => {
      const vitality = Vitality.create(50, 100)
      expect(vitality.toString()).toBe('50/100 (50%)')
    })
  })
})