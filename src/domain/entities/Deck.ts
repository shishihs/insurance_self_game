import { Card } from './Card'
import type { CardType } from '../types/card.types'

/**
 * デッキエンティティ
 */
export class Deck {
  private cards: Card[]
  private name: string

  constructor(name: string, cards: Card[] = []) {
    this.name = name
    this.cards = [...cards]
  }

  /**
   * デッキ名を取得
   */
  getName(): string {
    return this.name
  }

  /**
   * カード枚数を取得
   */
  size(): number {
    return this.cards.length
  }

  /**
   * デッキが空かどうか
   */
  isEmpty(): boolean {
    return this.cards.length === 0
  }

  /**
   * カードを追加
   */
  addCard(card: Card): void {
    this.cards.push(card)
  }

  /**
   * 複数のカードを追加
   */
  addCards(cards: Card[]): void {
    this.cards.push(...cards)
  }

  /**
   * カードを上から引く
   */
  drawCard(): Card | null {
    return this.cards.pop() || null
  }

  /**
   * 複数枚のカードを引く
   */
  drawCards(count: number): Card[] {
    const drawn: Card[] = []
    for (let i = 0; i < count && !this.isEmpty(); i++) {
      const card = this.drawCard()
      if (card) drawn.push(card)
    }
    return drawn
  }

  /**
   * 特定のカードを削除
   */
  removeCard(cardId: string): boolean {
    const index = this.cards.findIndex(card => card.id === cardId)
    if (index !== -1) {
      this.cards.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * デッキをシャッフル（Fisher-Yatesアルゴリズム）
   */
  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]]
    }
  }

  /**
   * デッキの中身を確認（コピーを返す）
   */
  getCards(): Card[] {
    return [...this.cards]
  }

  /**
   * 特定のタイプのカード枚数を取得
   */
  countCardsByType(type: CardType): number {
    return this.cards.filter(card => card.type === type).length
  }

  /**
   * デッキをクリア
   */
  clear(): void {
    this.cards = []
  }

  /**
   * デッキのコピーを作成
   */
  clone(): Deck {
    return new Deck(
      this.name,
      this.cards.map(card => card.clone())
    )
  }

  /**
   * デッキの統計情報を取得
   */
  getStats(): {
    total: number
    byType: Record<CardType, number>
    averagePower: number
    averageCost: number
  } {
    const stats = {
      total: this.cards.length,
      byType: {
        life: 0,
        insurance: 0,
        pitfall: 0
      } as Record<CardType, number>,
      averagePower: 0,
      averageCost: 0
    }

    let totalPower = 0
    let totalCost = 0

    this.cards.forEach(card => {
      stats.byType[card.type]++
      totalPower += card.power
      totalCost += card.cost
    })

    stats.averagePower = stats.total > 0 ? totalPower / stats.total : 0
    stats.averageCost = stats.total > 0 ? totalCost / stats.total : 0

    return stats
  }
}