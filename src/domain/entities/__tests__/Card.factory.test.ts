import { describe, it, expect } from 'vitest'
import { Card } from '../Card'

describe('Card Factory Methods', () => {
  describe('createLifeCard', () => {
    it('正のパワーを持つライフカードを作成できる', () => {
      const card = Card.createLifeCard('アルバイト収入', 1)
      
      expect(card.name).toBe('アルバイト収入')
      expect(card.type).toBe('life')
      expect(card.power).toBe(1)
      expect(card.description).toContain('パワー: +1')
    })

    it('負のパワーを持つライフカードを作成できる', () => {
      const card = Card.createLifeCard('浪費癖', -1)
      
      expect(card.name).toBe('浪費癖')
      expect(card.type).toBe('life')
      expect(card.power).toBe(-1)
      expect(card.description).toContain('パワー: -1')
    })

    it('ゼロパワーのライフカードを作成できる', () => {
      const card = Card.createLifeCard('衝動買い', 0)
      
      expect(card.name).toBe('衝動買い')
      expect(card.type).toBe('life')
      expect(card.power).toBe(0)
      expect(card.description).toContain('パワー: 0')
    })
  })

  describe('createChallengeCard', () => {
    it('チャレンジカードを作成できる', () => {
      const card = Card.createChallengeCard('健康づくり', 3)
      
      expect(card.name).toBe('健康づくり')
      expect(card.type).toBe('challenge')
      expect(card.power).toBe(3)
      expect(card.description).toContain('必要パワー: 3')
    })

    it('高難易度のチャレンジカードを作成できる', () => {
      const card = Card.createChallengeCard('マイホーム購入', 5)
      
      expect(card.name).toBe('マイホーム購入')
      expect(card.type).toBe('challenge')
      expect(card.power).toBe(5)
      expect(card.description).toContain('必要パワー: 5')
    })
  })

  describe('createInsuranceCard', () => {
    it('基本的な保険カードを作成できる', () => {
      const card = Card.createInsuranceCard(
        '健康保険',
        2,
        { type: 'basic', description: '健康に関する保険' }
      )
      
      expect(card.name).toBe('健康保険')
      expect(card.type).toBe('insurance')
      expect(card.power).toBe(2)
      expect(card.effects).toHaveLength(1)
      expect(card.effects[0].type).toBe('basic')
      expect(card.effects[0].description).toBe('健康に関する保険')
    })

    it('複数の効果を持つ保険カードを作成できる', () => {
      const effects = [
        { type: 'basic' as const, description: '基本効果' },
        { type: 'powerUp' as const, value: 1, description: 'パワー+1' }
      ]
      
      const card = Card.createInsuranceCard('総合保険', 3, ...effects)
      
      expect(card.name).toBe('総合保険')
      expect(card.type).toBe('insurance')
      expect(card.power).toBe(3)
      expect(card.effects).toHaveLength(2)
    })
  })

  describe('Card Instance Properties', () => {
    it('チャレンジカードはisUsedプロパティを追加できる', () => {
      const card = Card.createChallengeCard('テスト', 1) as any
      
      // 初期状態では存在しない
      expect(card.isUsed).toBe(undefined)
      
      // プロパティを追加可能
      card.isUsed = true
      expect(card.isUsed).toBe(true)
    })
  })
})