import { describe, it, expect } from 'vitest'
import { InsurancePremium } from '../InsurancePremium'

describe('InsurancePremium値オブジェクト', () => {
  describe('生成', () => {
    it('正常な値で生成できる', () => {
      const premium = InsurancePremium.create(5)
      expect(premium).toBeDefined()
      expect(premium.getValue()).toBe(5)
    })

    it('0での生成を許可する（無料保険）', () => {
      const premium = InsurancePremium.create(0)
      expect(premium.getValue()).toBe(0)
    })

    it('負の値では生成できない', () => {
      expect(() => InsurancePremium.create(-1)).toThrow('Insurance premium cannot be negative')
    })

    it('最大値を超える値では生成できない', () => {
      expect(() => InsurancePremium.create(100)).toThrow('Insurance premium cannot exceed maximum')
    })
  })

  describe('保険料計算', () => {
    it('基本保険料を計算できる', () => {
      const premium = InsurancePremium.create(5)
      expect(premium.getValue()).toBe(5)
    })

    it('複数の保険料を合計できる', () => {
      const premiums = [
        InsurancePremium.create(3),
        InsurancePremium.create(5),
        InsurancePremium.create(2)
      ]
      const total = InsurancePremium.sum(premiums)
      
      expect(total.getValue()).toBe(10)
    })

    it('空配列の合計は0になる', () => {
      const total = InsurancePremium.sum([])
      expect(total.getValue()).toBe(0)
    })

    it('合計が最大値を超える場合は最大値になる', () => {
      const premiums = [
        InsurancePremium.create(30),
        InsurancePremium.create(40),
        InsurancePremium.create(40)
      ]
      const total = InsurancePremium.sum(premiums)
      
      expect(total.getValue()).toBe(99) // 最大値
    })
  })

  describe('保険料の調整', () => {
    it('割引率を適用できる', () => {
      const premium = InsurancePremium.create(10)
      const discounted = premium.applyDiscount(0.2) // 20%割引
      
      expect(discounted.getValue()).toBe(8)
    })

    it('100%割引で無料になる', () => {
      const premium = InsurancePremium.create(10)
      const free = premium.applyDiscount(1.0)
      
      expect(free.getValue()).toBe(0)
    })

    it('割引率が0の場合は変化なし', () => {
      const premium = InsurancePremium.create(10)
      const same = premium.applyDiscount(0)
      
      expect(same.getValue()).toBe(10)
    })

    it('割引率が負の場合はエラー', () => {
      const premium = InsurancePremium.create(10)
      expect(() => premium.applyDiscount(-0.1)).toThrow('Discount rate cannot be negative')
    })

    it('割引率が100%を超える場合はエラー', () => {
      const premium = InsurancePremium.create(10)
      expect(() => premium.applyDiscount(1.1)).toThrow('Discount rate cannot exceed 100%')
    })

    it('割増率を適用できる', () => {
      const premium = InsurancePremium.create(10)
      const increased = premium.applyMultiplier(1.5) // 50%増
      
      expect(increased.getValue()).toBe(15)
    })

    it('倍率0で無料になる', () => {
      const premium = InsurancePremium.create(10)
      const free = premium.applyMultiplier(0)
      
      expect(free.getValue()).toBe(0)
    })

    it('負の倍率はエラー', () => {
      const premium = InsurancePremium.create(10)
      expect(() => premium.applyMultiplier(-1)).toThrow('Multiplier cannot be negative')
    })
  })

  describe('保険料の分類', () => {
    it('無料保険を判定できる', () => {
      const free = InsurancePremium.create(0)
      const paid = InsurancePremium.create(5)
      
      expect(free.isFree()).toBe(true)
      expect(paid.isFree()).toBe(false)
    })

    it('高額保険料を判定できる（20以上）', () => {
      const normal = InsurancePremium.create(10)
      const expensive = InsurancePremium.create(20)
      const veryExpensive = InsurancePremium.create(30)
      
      expect(normal.isExpensive()).toBe(false)
      expect(expensive.isExpensive()).toBe(true)
      expect(veryExpensive.isExpensive()).toBe(true)
    })
  })

  describe('比較', () => {
    it('他の保険料より高いか判定できる', () => {
      const premium1 = InsurancePremium.create(5)
      const premium2 = InsurancePremium.create(10)
      
      expect(premium1.isHigherThan(premium2)).toBe(false)
      expect(premium2.isHigherThan(premium1)).toBe(true)
    })

    it('負担可能か判定できる', () => {
      const premium = InsurancePremium.create(5)
      
      expect(premium.isAffordableWith(10)).toBe(true)
      expect(premium.isAffordableWith(5)).toBe(true)
      expect(premium.isAffordableWith(4)).toBe(false)
    })
  })

  describe('等価性', () => {
    it('同じ値の場合、等価と判定される', () => {
      const premium1 = InsurancePremium.create(5)
      const premium2 = InsurancePremium.create(5)
      
      expect(premium1.equals(premium2)).toBe(true)
    })

    it('異なる値の場合、等価ではない', () => {
      const premium1 = InsurancePremium.create(5)
      const premium2 = InsurancePremium.create(10)
      
      expect(premium1.equals(premium2)).toBe(false)
    })
  })

  describe('文字列表現', () => {
    it('読みやすい形式で文字列化される', () => {
      const premium = InsurancePremium.create(5)
      expect(premium.toString()).toBe('保険料: 5')
    })

    it('無料保険は特別な表記', () => {
      const free = InsurancePremium.create(0)
      expect(free.toString()).toBe('保険料: 無料')
    })
  })

  describe('定数', () => {
    it('無料保険の定数が使える', () => {
      const free = InsurancePremium.FREE
      expect(free.getValue()).toBe(0)
      expect(free.isFree()).toBe(true)
    })
  })
})