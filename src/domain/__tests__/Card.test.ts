import { describe, expect, it } from 'vitest'
import { Card } from '../entities/Card'
import type { ICard } from '../types/card.types'

describe('Card Entity', () => {
  const mockLifeCard: ICard = {
    id: 'test-card-1',
    name: '朝のジョギング',
    description: '健康的な一日の始まり',
    type: 'life',
    power: 3,
    cost: 2,
    effects: [],
    category: 'health'
  }

  const mockInsuranceCard: ICard = {
    id: 'test-card-2',
    name: '医療保険',
    description: '病気やケガに備える',
    type: 'insurance',
    power: 5,
    cost: 3,
    effects: [{
      type: 'shield',
      value: 100,
      description: '100ポイントの保障'
    }],
    insuranceType: 'medical',
    coverage: 100
  }

  const mockPitfallCard: ICard = {
    id: 'test-card-3',
    name: '急な入院',
    description: '予期せぬ医療費',
    type: 'pitfall',
    power: 0,
    cost: 0,
    effects: [],
    penalty: 3
  }

  describe('コンストラクタ', () => {
    it('人生カードを正しく生成できる', () => {
      const card = new Card(mockLifeCard)
      
      expect(card.id).toBe('test-card-1')
      expect(card.name).toBe('朝のジョギング')
      expect(card.type).toBe('life')
      expect(card.power).toBe(3)
      expect(card.cost).toBe(2)
      expect(card.category).toBe('health')
    })

    it('保険カードを正しく生成できる', () => {
      const card = new Card(mockInsuranceCard)
      
      expect(card.type).toBe('insurance')
      expect(card.insuranceType).toBe('medical')
      expect(card.coverage).toBe(100)
      expect(card.effects).toHaveLength(1)
    })

    it('落とし穴カードを正しく生成できる', () => {
      const card = new Card(mockPitfallCard)
      
      expect(card.type).toBe('pitfall')
      expect(card.penalty).toBe(3)
      expect(card.power).toBe(0)
    })
  })

  describe('calculateEffectivePower', () => {
    it('基本パワーを返す', () => {
      const card = new Card(mockLifeCard)
      expect(card.calculateEffectivePower()).toBe(3)
    })

    it('ボーナスを加算する', () => {
      const card = new Card(mockLifeCard)
      expect(card.calculateEffectivePower(2)).toBe(5)
    })

    it('負の値にならない', () => {
      const card = new Card(mockLifeCard)
      expect(card.calculateEffectivePower(-10)).toBe(0)
    })
  })

  describe('hasEffect', () => {
    it('効果を持っている場合trueを返す', () => {
      const card = new Card(mockInsuranceCard)
      expect(card.hasEffect('shield')).toBe(true)
    })

    it('効果を持っていない場合falseを返す', () => {
      const card = new Card(mockInsuranceCard)
      expect(card.hasEffect('draw_cards')).toBe(false)
    })
  })

  describe('タイプチェックメソッド', () => {
    it('isLifeCard', () => {
      const lifeCard = new Card(mockLifeCard)
      const insuranceCard = new Card(mockInsuranceCard)
      
      expect(lifeCard.isLifeCard()).toBe(true)
      expect(insuranceCard.isLifeCard()).toBe(false)
    })

    it('isInsuranceCard', () => {
      const lifeCard = new Card(mockLifeCard)
      const insuranceCard = new Card(mockInsuranceCard)
      
      expect(lifeCard.isInsuranceCard()).toBe(false)
      expect(insuranceCard.isInsuranceCard()).toBe(true)
    })

    it('isPitfallCard', () => {
      const lifeCard = new Card(mockLifeCard)
      const pitfallCard = new Card(mockPitfallCard)
      
      expect(lifeCard.isPitfallCard()).toBe(false)
      expect(pitfallCard.isPitfallCard()).toBe(true)
    })
  })

  describe('clone', () => {
    it('カードの完全なコピーを作成する', () => {
      const original = new Card(mockInsuranceCard)
      const cloned = original.clone()
      
      expect(cloned).not.toBe(original) // 異なるインスタンス
      expect(cloned.id).toBe(original.id)
      expect(cloned.name).toBe(original.name)
      expect(cloned.effects).toEqual(original.effects)
      expect(cloned.effects).not.toBe(original.effects) // 配列も別インスタンス
    })
  })

  describe('toDisplayString', () => {
    it('基本情報を表示する', () => {
      const card = new Card(mockLifeCard)
      const display = card.toDisplayString()
      
      expect(display).toContain('朝のジョギング')
      expect(display).toContain('Power: 3')
      expect(display).toContain('Cost: 2')
    })

    it('効果情報を含める', () => {
      const card = new Card(mockInsuranceCard)
      const display = card.toDisplayString()
      
      expect(display).toContain('Effects:')
      expect(display).toContain('100ポイントの保障')
    })
  })
})