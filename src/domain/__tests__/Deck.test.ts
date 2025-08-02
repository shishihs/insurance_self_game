import { beforeEach, describe, expect, it } from 'vitest'
import { Deck } from '../entities/Deck'
import { Card } from '../entities/Card'
import type { CardType } from '../types/card.types'

describe('Deck Entity', () => {
  let deck: Deck
  
  const createTestCard = (id: string, type: CardType = 'life'): Card => {
    return new Card({
      id,
      name: `Test Card ${id}`,
      description: 'Test card',
      type,
      power: 3,
      cost: 2,
      effects: []
    })
  }

  beforeEach(() => {
    deck = new Deck('Test Deck')
  })

  describe('基本機能', () => {
    it('デッキ名を取得できる', () => {
      expect(deck.getName()).toBe('Test Deck')
    })

    it('初期状態では空である', () => {
      expect(deck.isEmpty()).toBe(true)
      expect(deck.size()).toBe(0)
    })

    it('カードを追加できる', () => {
      const card = createTestCard('1')
      deck.addCard(card)
      
      expect(deck.size()).toBe(1)
      expect(deck.isEmpty()).toBe(false)
    })

    it('複数のカードを一度に追加できる', () => {
      const cards = [
        createTestCard('1'),
        createTestCard('2'),
        createTestCard('3')
      ]
      deck.addCards(cards)
      
      expect(deck.size()).toBe(3)
    })
  })

  describe('カードのドロー', () => {
    beforeEach(() => {
      deck.addCards([
        createTestCard('1'),
        createTestCard('2'),
        createTestCard('3')
      ])
    })

    it('カードを1枚引ける', () => {
      const card = deck.drawCard()
      
      expect(card).toBeDefined()
      expect(card?.id).toBe('3') // 最後に追加したカードから引かれる
      expect(deck.size()).toBe(2)
    })

    it('複数枚のカードを引ける', () => {
      const cards = deck.drawCards(2)
      
      expect(cards).toHaveLength(2)
      expect(cards[0].id).toBe('3')
      expect(cards[1].id).toBe('2')
      expect(deck.size()).toBe(1)
    })

    it('デッキ枚数以上を要求した場合、引ける分だけ引く', () => {
      const cards = deck.drawCards(5)
      
      expect(cards).toHaveLength(3)
      expect(deck.isEmpty()).toBe(true)
    })

    it('空のデッキからドローするとnullを返す', () => {
      deck.clear()
      const card = deck.drawCard()
      
      expect(card).toBeNull()
    })
  })

  describe('カードの削除', () => {
    it('特定のカードを削除できる', () => {
      const card1 = createTestCard('1')
      const card2 = createTestCard('2')
      deck.addCards([card1, card2])
      
      const removed = deck.removeCard('1')
      
      expect(removed).toBe(true)
      expect(deck.size()).toBe(1)
      expect(deck.getCards()[0].id).toBe('2')
    })

    it('存在しないカードの削除はfalseを返す', () => {
      const card = createTestCard('1')
      deck.addCard(card)
      
      const removed = deck.removeCard('999')
      
      expect(removed).toBe(false)
      expect(deck.size()).toBe(1)
    })
  })

  describe('シャッフル', () => {
    it('デッキをシャッフルできる', () => {
      // 10枚のカードを追加
      const cards = Array.from({ length: 10 }, (_, i) => 
        createTestCard(String(i))
      )
      deck.addCards(cards)
      
      // 元の順序を記録
      const originalOrder = deck.getCards().map(c => c.id)
      
      // シャッフル
      deck.shuffle()
      
      // 新しい順序を取得
      const newOrder = deck.getCards().map(c => c.id)
      
      // カード枚数は変わらない
      expect(deck.size()).toBe(10)
      
      // 順序が変わっている可能性が高い（確率的）
      // 完全に同じ順序になる確率は極めて低い
      expect(newOrder).not.toEqual(originalOrder)
    })
  })

  describe('タイプ別カウント', () => {
    it('カードタイプ別の枚数を取得できる', () => {
      deck.addCards([
        createTestCard('1', 'life'),
        createTestCard('2', 'life'),
        createTestCard('3', 'insurance'),
        createTestCard('4', 'pitfall')
      ])
      
      expect(deck.countCardsByType('life')).toBe(2)
      expect(deck.countCardsByType('insurance')).toBe(1)
      expect(deck.countCardsByType('pitfall')).toBe(1)
    })
  })

  describe('統計情報', () => {
    it('デッキの統計情報を取得できる', () => {
      deck.addCards([
        new Card({ id: '1', name: 'Card 1', description: '', type: 'life', power: 2, cost: 1, effects: [] }),
        new Card({ id: '2', name: 'Card 2', description: '', type: 'life', power: 4, cost: 3, effects: [] }),
        new Card({ id: '3', name: 'Card 3', description: '', type: 'insurance', power: 6, cost: 5, effects: [] })
      ])
      
      const stats = deck.getStats()
      
      expect(stats.total).toBe(3)
      expect(stats.byType.life).toBe(2)
      expect(stats.byType.insurance).toBe(1)
      expect(stats.byType.pitfall).toBe(0)
      expect(stats.averagePower).toBe(4) // (2+4+6)/3
      expect(stats.averageCost).toBe(3) // (1+3+5)/3
    })

    it('空のデッキの統計情報', () => {
      const stats = deck.getStats()
      
      expect(stats.total).toBe(0)
      expect(stats.averagePower).toBe(0)
      expect(stats.averageCost).toBe(0)
    })
  })

  describe('クローン', () => {
    it('デッキの完全なコピーを作成する', () => {
      const card1 = createTestCard('1')
      const card2 = createTestCard('2')
      deck.addCards([card1, card2])
      
      const cloned = deck.clone()
      
      expect(cloned).not.toBe(deck) // 異なるインスタンス
      expect(cloned.getName()).toBe(deck.getName())
      expect(cloned.size()).toBe(deck.size())
      
      // カードも別インスタンス
      const clonedCards = cloned.getCards()
      const originalCards = deck.getCards()
      expect(clonedCards[0]).not.toBe(originalCards[0])
      expect(clonedCards[0].id).toBe(originalCards[0].id)
    })
  })
})