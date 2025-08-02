import { describe, expect, it } from 'vitest'
import { Card } from '../Card'

describe('Card clone メソッド', () => {
  const createTestCard = () => {
    return new Card({
      id: 'test_card_1',
      name: 'テストカード',
      description: 'テスト用のカード',
      type: 'life',
      power: 10,
      cost: 5,
      effects: [
        { type: 'draw', value: 2 }
      ],
      category: 'daily'
    })
  }

  describe('基本的なクローン機能', () => {
    it('cloneメソッドが存在する', () => {
      const card = createTestCard()
      expect(card.clone).toBeDefined()
      expect(typeof card.clone).toBe('function')
    })

    it('cloneメソッドが新しいCardインスタンスを返す', () => {
      const original = createTestCard()
      const cloned = original.clone()
      
      expect(cloned).toBeInstanceOf(Card)
      expect(cloned).not.toBe(original)
    })

    it('全てのプロパティが正しくコピーされる', () => {
      const original = createTestCard()
      const cloned = original.clone()
      
      expect(cloned.id).toBe(original.id)
      expect(cloned.name).toBe(original.name)
      expect(cloned.description).toBe(original.description)
      expect(cloned.type).toBe(original.type)
      expect(cloned.power).toBe(original.power)
      expect(cloned.cost).toBe(original.cost)
      expect(cloned.effects).toEqual(original.effects)
      expect(cloned.category).toBe(original.category)
    })

    it('値オブジェクトも正しくコピーされる', () => {
      const original = createTestCard()
      const cloned = original.clone()
      
      expect(cloned.getPower().getValue()).toBe(original.getPower().getValue())
      expect(cloned.getCost().getValue()).toBe(original.getCost().getValue())
    })
  })

  describe('保険カードのクローン', () => {
    it('保険カードの特有プロパティもコピーされる', () => {
      const insuranceCard = new Card({
        id: 'insurance_1',
        name: '定期保険',
        description: 'テスト用保険',
        type: 'insurance',
        power: 0,
        cost: 5,
        effects: [],
        coverage: 20,
        penalty: 10,
        durationType: 'term',
        remainingTurns: 10,
        ageBonus: 5
      })
      
      const cloned = insuranceCard.clone()
      
      expect(cloned.coverage).toBe(insuranceCard.coverage)
      expect(cloned.penalty).toBe(insuranceCard.penalty)
      expect(cloned.durationType).toBe(insuranceCard.durationType)
      expect(cloned.remainingTurns).toBe(insuranceCard.remainingTurns)
      expect(cloned.ageBonus).toBe(insuranceCard.ageBonus)
    })
  })

  describe('copyメソッドとの関係', () => {
    it('cloneはcopyメソッドを内部で使用する', () => {
      const card = createTestCard()
      const cloned = card.clone()
      const copied = card.copy()
      
      // 両方とも同じプロパティを持つ新しいインスタンス
      expect(cloned.id).toBe(copied.id)
      expect(cloned.name).toBe(copied.name)
      expect(cloned.power).toBe(copied.power)
    })

    it('cloneは引数を取らない', () => {
      const card = createTestCard()
      // @ts-expect-error - cloneは引数を取らない
      const cloned = card.clone({ power: 20 })
      
      // 引数は無視される
      expect(cloned.power).toBe(card.power)
    })
  })

  describe('イミュータビリティ', () => {
    it('クローン後に元のカードを変更してもクローンには影響しない', () => {
      const original = createTestCard()
      const cloned = original.clone()
      
      // 元のカードの配列を変更
      original.effects.push({ type: 'heal', value: 5 })
      
      // クローンには影響しない
      expect(cloned.effects.length).toBe(1)
      expect(original.effects.length).toBe(2)
    })
  })

  describe('Deckでの使用', () => {
    it('Deck.cloneで使用される際にエラーが発生しない', () => {
      const cards = [
        createTestCard(),
        new Card({
          id: 'test_card_2',
          name: 'テストカード2',
          description: 'テスト用のカード2',
          type: 'challenge',
          power: 20,
          cost: 0,
          effects: []
        })
      ]
      
      // Deck.cloneのシミュレーション
      const clonedCards = cards.map(card => card.clone())
      
      expect(clonedCards).toHaveLength(2)
      expect(clonedCards[0]).toBeInstanceOf(Card)
      expect(clonedCards[1]).toBeInstanceOf(Card)
      expect(clonedCards[0].id).toBe('test_card_1')
      expect(clonedCards[1].id).toBe('test_card_2')
    })
  })
})