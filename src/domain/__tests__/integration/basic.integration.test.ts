import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../../entities/Game'
import { Card } from '../../entities/Card'
import { CardFactory } from '../../services/CardFactory'
import { Deck } from '../../entities/Deck'

describe('基本統合テスト', () => {
  let game: Game
  let cardFactory: CardFactory

  beforeEach(() => {
    game = new Game()
    cardFactory = new CardFactory()
  })

  describe('ゲーム基本機能', () => {
    it('ゲームの開始と基本状態が正しく動作する', () => {
      // ゲーム開始前
      expect(game.status).toBe('not_started')
      expect(game.vitality).toBe(100)
      expect(game.turn).toBe(0)

      // ゲーム開始
      game.start()
      expect(game.status).toBe('in_progress')
      expect(game.vitality).toBe(100)
      expect(game.turn).toBe(1)
      expect(game.phase).toBe('draw')
    })

    it('体力の増減が正しく動作する', () => {
      game.start()

      // ダメージを受ける
      game.applyDamage(30)
      expect(game.vitality).toBe(70)

      // 回復する
      game.heal(20)
      expect(game.vitality).toBe(90)

      // 上限を超える回復
      game.heal(20)
      expect(game.vitality).toBe(100) // 上限100で制限

      // 致命傷
      game.applyDamage(150)
      expect(game.vitality).toBe(0)
      expect(game.isGameOver()).toBe(true)
    })
  })

  describe('Card統合テスト', () => {
    it('Cardの作成とクローンが正しく動作する', () => {
      const originalCard = new Card({
        id: 'test-card',
        name: 'テストカード',
        description: '統合テスト用',
        type: 'life',
        power: 25,
        cost: 8,
        effects: [],
        category: 'work'
      })

      // 値オブジェクトとして正しくアクセスできる
      expect(originalCard.power).toBe(25)
      expect(originalCard.cost).toBe(8)
      expect(originalCard.getPower().getValue()).toBe(25)
      expect(originalCard.getCost().getValue()).toBe(8)

      // クローンが正しく動作する
      const clonedCard = originalCard.clone()
      expect(clonedCard).not.toBe(originalCard)
      expect(clonedCard.id).toBe(originalCard.id)
      expect(clonedCard.power).toBe(25)
      expect(clonedCard.cost).toBe(8)
    })

    it('CardFactoryが正しく動作する', () => {
      const lifeCard = cardFactory.createLifeCard({
        category: 'work',
        basePower: 15,
        baseCost: 5
      })

      expect(lifeCard.type).toBe('life')
      expect(lifeCard.power).toBe(15)
      expect(lifeCard.cost).toBe(5)
      expect(lifeCard.category).toBe('work')
    })
  })

  describe('Deck統合テスト', () => {
    it('Deckの基本操作が正しく動作する', () => {
      const deck = new Deck('テストデッキ')

      // カードを追加
      const cards = [
        cardFactory.createLifeCard({
          category: 'work',
          basePower: 10,
          baseCost: 3
        }),
        cardFactory.createLifeCard({
          category: 'love',
          basePower: 15,
          baseCost: 5
        })
      ]

      deck.addCards(cards)
      expect(deck.size()).toBe(2)

      // カードを引く
      const drawnCard = deck.drawCard()
      expect(drawnCard).toBeDefined()
      expect(deck.size()).toBe(1)

      // デッキのクローン
      const clonedDeck = deck.clone()
      expect(clonedDeck.size()).toBe(1)
      expect(clonedDeck).not.toBe(deck)

      // 元のデッキに影響しない
      clonedDeck.drawCard()
      expect(deck.size()).toBe(1)
      expect(clonedDeck.size()).toBe(0)
    })
  })

  describe('保険関連統合テスト', () => {
    it('保険カードの基本動作が正しく機能する', () => {
      game.start()

      const insuranceCard = new Card({
        id: 'insurance-test',
        name: 'テスト保険',
        description: '統合テスト用保険',
        type: 'insurance',
        power: 0,
        cost: 5,
        effects: [],
        insuranceType: 'health',
        coverage: 25,
        durationType: 'whole_life'
      })

      // 保険の判定
      expect(insuranceCard.isInsurance()).toBe(true)
      expect(insuranceCard.isWholeLifeInsurance()).toBe(true)
      expect(insuranceCard.isTermInsurance()).toBe(false)

      // 保険を有効化（簡易版）
      game.addInsurance(insuranceCard)
      expect(game.insuranceCards).toHaveLength(1)
    })

    it('定期保険の期限管理が正しく動作する', () => {
      const termInsurance = new Card({
        id: 'term-test',
        name: 'テスト定期保険',
        description: '期限付き保険',
        type: 'insurance',
        power: 0,
        cost: 3,
        effects: [],
        insuranceType: 'health',
        coverage: 20,
        durationType: 'term',
        remainingTurns: 3
      })

      expect(termInsurance.isTermInsurance()).toBe(true)
      expect(termInsurance.remainingTurns).toBe(3)

      // 残りターンを減らす
      const decremented = termInsurance.decrementRemainingTurns()
      expect(decremented.remainingTurns).toBe(2)
      expect(decremented.isExpired()).toBe(false)

      // 期限切れまで進める
      let current = decremented
      for (let i = 0; i < 2; i++) {
        current = current.decrementRemainingTurns()
      }
      expect(current.remainingTurns).toBe(0)
      expect(current.isExpired()).toBe(true)
    })
  })

  describe('チャレンジ基本テスト', () => {
    it('チャレンジカードの作成が正しく動作する', () => {
      const challengeCard = new Card({
        id: 'challenge-test',
        name: 'テストチャレンジ',
        description: 'チャレンジテスト',
        type: 'challenge',
        power: 30,
        cost: 0,
        effects: []
      })

      expect(challengeCard.type).toBe('challenge')
      expect(challengeCard.power).toBe(30)
      expect(challengeCard.cost).toBe(0)
    })
  })

  describe('エラーハンドリング', () => {
    it('値オブジェクトの検証が正しく動作する', () => {
      // 負の値での Card 作成
      expect(() => new Card({
        id: 'invalid',
        name: '不正カード',
        description: 'エラーテスト',
        type: 'life',
        power: -10,
        cost: 5,
        effects: []
      })).toThrow('CardPower must be non-negative')

      // 負のコスト
      expect(() => new Card({
        id: 'invalid-cost',
        name: '不正コストカード',
        description: 'エラーテスト',
        type: 'insurance',
        power: 0,
        cost: -5,
        effects: []
      })).toThrow('InsurancePremium must be non-negative')
    })

    it('ゲーム状態の検証が正しく動作する', () => {
      // ゲーム開始前の操作
      expect(() => game.nextTurn()).toThrow('Game is not in progress')

      // 重複開始
      game.start()
      expect(() => game.start()).toThrow('Game has already started')
    })
  })
})