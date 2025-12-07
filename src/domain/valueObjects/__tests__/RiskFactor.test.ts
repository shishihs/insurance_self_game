import { describe, expect, it } from 'vitest'
import { RiskFactor } from '../RiskFactor'
import { RiskProfile } from '../RiskProfile'

describe('RiskFactor', () => {
  describe('create', () => {
    it('正常な値でリスクファクターを作成できる', () => {
      const factor = RiskFactor.create(0.5, 'age')
      expect(factor.getValue()).toBe(0.5)
      expect(factor.getType()).toBe('age')
    })

    it('0の値でリスクファクターを作成できる', () => {
      const factor = RiskFactor.create(0, 'health')
      expect(factor.getValue()).toBe(0)
    })

    it('1の値でリスクファクターを作成できる', () => {
      const factor = RiskFactor.create(1, 'claims')
      expect(factor.getValue()).toBe(1)
    })

    it('範囲外の値（負の値）でエラーが発生する', () => {
      expect(() => RiskFactor.create(-0.1, 'age')).toThrow('Risk factor value must be between 0 and 1')
    })

    it('範囲外の値（1より大きい）でエラーが発生する', () => {
      expect(() => RiskFactor.create(1.1, 'health')).toThrow('Risk factor value must be between 0 and 1')
    })
  })

  describe('getRiskLevel', () => {
    it('0.3以下の値で低リスクと判定される', () => {
      expect(RiskFactor.create(0, 'age').getRiskLevel()).toBe('low')
      expect(RiskFactor.create(0.3, 'age').getRiskLevel()).toBe('low')
    })

    it('0.3より大きく0.7以下の値で中リスクと判定される', () => {
      expect(RiskFactor.create(0.31, 'health').getRiskLevel()).toBe('medium')
      expect(RiskFactor.create(0.7, 'health').getRiskLevel()).toBe('medium')
    })

    it('0.7より大きい値で高リスクと判定される', () => {
      expect(RiskFactor.create(0.71, 'claims').getRiskLevel()).toBe('high')
      expect(RiskFactor.create(1, 'claims').getRiskLevel()).toBe('high')
    })
  })

  describe('getPremiumMultiplier', () => {
    it('年齢リスクの保険料倍率が正しく計算される', () => {
      const factor = RiskFactor.create(0.5, 'age')
      // 1.0 + (0.5 * 0.5) = 1.25
      expect(factor.getPremiumMultiplier()).toBe(1.25)
    })

    it('健康リスクの保険料倍率が正しく計算される', () => {
      const factor = RiskFactor.create(0.6, 'health')
      // 1.0 + (0.6 * 0.3) = 1.18
      expect(factor.getPremiumMultiplier()).toBeCloseTo(1.18)
    })

    it('請求履歴リスクの保険料倍率が正しく計算される', () => {
      const factor = RiskFactor.create(0.8, 'claims')
      // 1.0 + (0.8 * 0.4) = 1.32
      expect(factor.getPremiumMultiplier()).toBeCloseTo(1.32)
    })

    it('ライフスタイルリスクの保険料倍率が正しく計算される', () => {
      const factor = RiskFactor.create(0.4, 'lifestyle')
      // 1.0 + (0.4 * 0.2) = 1.08
      expect(factor.getPremiumMultiplier()).toBeCloseTo(1.08)
    })

    it('リスク値0の場合、倍率は1.0になる', () => {
      const factor = RiskFactor.create(0, 'age')
      expect(factor.getPremiumMultiplier()).toBe(1.0)
    })

    it('リスク値1の場合、最大倍率になる', () => {
      const factor = RiskFactor.create(1, 'age')
      expect(factor.getPremiumMultiplier()).toBe(1.5) // 1.0 + (1.0 * 0.5)
    })
  })

  describe('adjust', () => {
    it('正の調整値でリスクが増加する', () => {
      const factor = RiskFactor.create(0.5, 'age')
      const adjusted = factor.adjust(0.2)
      expect(adjusted.getValue()).toBe(0.7)
      expect(adjusted.getType()).toBe('age')
    })

    it('負の調整値でリスクが減少する', () => {
      const factor = RiskFactor.create(0.5, 'health')
      const adjusted = factor.adjust(-0.3)
      expect(adjusted.getValue()).toBe(0.2)
    })

    it('調整後の値は0未満にならない', () => {
      const factor = RiskFactor.create(0.2, 'claims')
      const adjusted = factor.adjust(-0.5)
      expect(adjusted.getValue()).toBe(0)
    })

    it('調整後の値は1を超えない', () => {
      const factor = RiskFactor.create(0.8, 'lifestyle')
      const adjusted = factor.adjust(0.5)
      expect(adjusted.getValue()).toBe(1)
    })
  })

  describe('combine', () => {
    it('同じタイプのリスクファクターを結合できる', () => {
      const factor1 = RiskFactor.create(0.4, 'age')
      const factor2 = RiskFactor.create(0.6, 'age')
      const combined = factor1.combine(factor2, 0.5)
      expect(combined.getValue()).toBe(0.5) // (0.4 * 0.5) + (0.6 * 0.5)
    })

    it('異なる重みで結合できる', () => {
      const factor1 = RiskFactor.create(0.2, 'health')
      const factor2 = RiskFactor.create(0.8, 'health')
      const combined = factor1.combine(factor2, 0.3)
      // (0.2 * 0.7) + (0.8 * 0.3) = 0.14 + 0.24 = 0.38
      expect(combined.getValue()).toBeCloseTo(0.38)
    })

    it('異なるタイプのリスクファクターは結合できない', () => {
      const factor1 = RiskFactor.create(0.5, 'age')
      const factor2 = RiskFactor.create(0.5, 'health')
      expect(() => factor1.combine(factor2)).toThrow('Cannot combine different risk factor types')
    })
  })

  describe('equals', () => {
    it('同じ値と同じタイプの場合、等しいと判定される', () => {
      const factor1 = RiskFactor.create(0.5, 'age')
      const factor2 = RiskFactor.create(0.5, 'age')
      expect(factor1.equals(factor2)).toBe(true)
    })

    it('異なる値の場合、等しくないと判定される', () => {
      const factor1 = RiskFactor.create(0.5, 'age')
      const factor2 = RiskFactor.create(0.6, 'age')
      expect(factor1.equals(factor2)).toBe(false)
    })

    it('異なるタイプの場合、等しくないと判定される', () => {
      const factor1 = RiskFactor.create(0.5, 'age')
      const factor2 = RiskFactor.create(0.5, 'health')
      expect(factor1.equals(factor2)).toBe(false)
    })
  })

  describe('toString', () => {
    it('リスクファクターの文字列表現が正しい', () => {
      const factor = RiskFactor.create(0.75, 'age')
      expect(factor.toString()).toBe('RiskFactor(age: 0.75 - high)')
    })
  })
})

describe('RiskProfile', () => {
  describe('empty', () => {
    it('空のリスクプロファイルを作成できる', () => {
      const profile = RiskProfile.empty()
      expect(profile.getOverallRiskScore()).toBe(0)
      expect(profile.getTotalPremiumMultiplier()).toBe(1.0)
    })
  })

  describe('default', () => {
    it('デフォルトのリスクプロファイルが正しく作成される', () => {
      const profile = RiskProfile.default()
      expect(profile.getFactor('age')?.getValue()).toBe(0.3)
      expect(profile.getFactor('health')?.getValue()).toBe(0.2)
      expect(profile.getFactor('claims')?.getValue()).toBe(0.0)
      expect(profile.getFactor('lifestyle')?.getValue()).toBe(0.3)
    })
  })

  describe('withFactor', () => {
    it('リスクファクターを追加できる', () => {
      const profile = RiskProfile.empty()
      const factor = RiskFactor.create(0.5, 'age')
      const newProfile = profile.withFactor(factor)

      expect(newProfile.getFactor('age')).toEqual(factor)
    })

    it('既存のリスクファクターを更新できる', () => {
      const profile = RiskProfile.default()
      const newFactor = RiskFactor.create(0.8, 'age')
      const newProfile = profile.withFactor(newFactor)

      expect(newProfile.getFactor('age')?.getValue()).toBe(0.8)
    })
  })

  describe('getOverallRiskScore', () => {
    it('全体のリスクスコアが正しく計算される', () => {
      const profile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.4, 'age'))
        .withFactor(RiskFactor.create(0.6, 'health'))

      // (0.4 + 0.6) / 2 = 0.5
      expect(profile.getOverallRiskScore()).toBe(0.5)
    })

    it('デフォルトプロファイルのリスクスコアが正しい', () => {
      const profile = RiskProfile.default()
      // (0.3 + 0.2 + 0.0 + 0.3) / 4 = 0.2
      expect(profile.getOverallRiskScore()).toBe(0.2)
    })
  })

  describe('getTotalPremiumMultiplier', () => {
    it('総合的な保険料倍率が正しく計算される', () => {
      const profile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.5, 'age'))      // 倍率: 1.25
        .withFactor(RiskFactor.create(0.6, 'health'))  // 倍率: 1.18

      // 1.25 * 1.18 = 1.475
      expect(profile.getTotalPremiumMultiplier()).toBeCloseTo(1.475)
    })

    it('リスクファクターがない場合は倍率1.0', () => {
      const profile = RiskProfile.empty()
      expect(profile.getTotalPremiumMultiplier()).toBe(1.0)
    })
  })

  describe('getSummary', () => {
    it('低リスクプロファイルの要約が正しい', () => {
      const profile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.2, 'age'))
        .withFactor(RiskFactor.create(0.1, 'health'))

      expect(profile.getSummary()).toBe('低リスク (スコア: 0.15)')
    })

    it('中リスクプロファイルの要約が正しい', () => {
      const profile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.5, 'age'))
        .withFactor(RiskFactor.create(0.6, 'health'))

      expect(profile.getSummary()).toBe('中リスク (スコア: 0.55)')
    })

    it('高リスクプロファイルの要約が正しい', () => {
      const profile = RiskProfile.empty()
        .withFactor(RiskFactor.create(0.8, 'age'))
        .withFactor(RiskFactor.create(0.9, 'health'))

      expect(profile.getSummary()).toBe('高リスク (スコア: 0.85)')
    })
  })
})