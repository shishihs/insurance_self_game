import { describe, expect, it } from 'vitest'
import { CardPower } from '../CardPower'

describe('CardPower値オブジェクト', () => {
  describe('生成', () => {
    it('正常な値で生成できる', () => {
      const power = CardPower.create(10)
      expect(power).toBeDefined()
      expect(power.getValue()).toBe(10)
    })

    it('0での生成を許可する', () => {
      const power = CardPower.create(0)
      expect(power.getValue()).toBe(0)
    })

    it('負の値では生成できない', () => {
      expect(() => CardPower.create(-100)).toThrow('CardPower must be at least -99')
    })

    it('最大値を超える値では生成できない', () => {
      expect(() => CardPower.create(1000)).toThrow('CardPower cannot exceed maximum')
    })
  })

  describe('演算', () => {
    it('正常に加算できる', () => {
      const power1 = CardPower.create(10)
      const power2 = CardPower.create(20)
      const result = power1.add(power2)
      
      expect(result.getValue()).toBe(30)
      // イミュータブルであることを確認
      expect(power1.getValue()).toBe(10)
      expect(power2.getValue()).toBe(20)
    })

    it('加算結果が最大値を超える場合は最大値になる', () => {
      const power1 = CardPower.create(500)
      const power2 = CardPower.create(600)
      const result = power1.add(power2)
      
      expect(result.getValue()).toBe(999) // 最大値
    })

    it('複数のパワーを合計できる', () => {
      const powers = [
        CardPower.create(10),
        CardPower.create(20),
        CardPower.create(15)
      ]
      const total = CardPower.sum(powers)
      
      expect(total.getValue()).toBe(45)
    })

    it('空配列の合計は0になる', () => {
      const total = CardPower.sum([])
      expect(total.getValue()).toBe(0)
    })

    it('倍率を適用できる', () => {
      const power = CardPower.create(10)
      const doubled = power.multiply(2)
      
      expect(doubled.getValue()).toBe(20)
    })

    it('倍率適用で最大値を超える場合は最大値になる', () => {
      const power = CardPower.create(500)
      const result = power.multiply(3)
      
      expect(result.getValue()).toBe(999)
    })

    it('0倍は0になる', () => {
      const power = CardPower.create(50)
      const result = power.multiply(0)
      
      expect(result.getValue()).toBe(0)
    })

    it('負の倍率はエラー', () => {
      const power = CardPower.create(10)
      expect(() => power.multiply(-1)).toThrow('Multiplier cannot be negative')
    })
  })

  describe('比較', () => {
    it('大小を比較できる', () => {
      const power1 = CardPower.create(10)
      const power2 = CardPower.create(20)
      
      expect(power1.isGreaterThan(power2)).toBe(false)
      expect(power2.isGreaterThan(power1)).toBe(true)
    })

    it('等しい場合の比較', () => {
      const power1 = CardPower.create(20)
      const power2 = CardPower.create(20)
      
      expect(power1.isGreaterThan(power2)).toBe(false)
      expect(power1.isGreaterThanOrEqual(power2)).toBe(true)
    })

    it('以上の比較ができる', () => {
      const power1 = CardPower.create(20)
      const power2 = CardPower.create(20)
      const power3 = CardPower.create(10)
      
      expect(power1.isGreaterThanOrEqual(power2)).toBe(true)
      expect(power1.isGreaterThanOrEqual(power3)).toBe(true)
      expect(power3.isGreaterThanOrEqual(power1)).toBe(false)
    })
  })

  describe('等価性', () => {
    it('同じ値の場合、等価と判定される', () => {
      const power1 = CardPower.create(10)
      const power2 = CardPower.create(10)
      
      expect(power1.equals(power2)).toBe(true)
    })

    it('異なる値の場合、等価ではない', () => {
      const power1 = CardPower.create(10)
      const power2 = CardPower.create(20)
      
      expect(power1.equals(power2)).toBe(false)
    })
  })

  describe('文字列表現', () => {
    it('読みやすい形式で文字列化される', () => {
      const power = CardPower.create(50)
      expect(power.toString()).toBe('Power: 50')
    })
  })

  describe('定数', () => {
    it('ゼロパワーの定数が使える', () => {
      const zero = CardPower.ZERO
      expect(zero.getValue()).toBe(0)
    })

    it('最大パワーの定数が使える', () => {
      const max = CardPower.MAX
      expect(max.getValue()).toBe(999)
    })
  })
})