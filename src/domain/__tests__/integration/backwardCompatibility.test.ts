import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../../entities/Game'
import { Card } from '../../entities/Card'
import { Deck } from '../../entities/Deck'
import { CardFactory } from '../../services/CardFactory'
import { Vitality } from '../../valueObjects/Vitality'

describe('後方互換性テスト', () => {
  let game: Game
  let cardFactory: CardFactory

  beforeEach(() => {
    game = new Game()
    cardFactory = new CardFactory()
  })

  describe('既存のGameSceneとの互換性', () => {
    it('Gameエンティティの既存のプロパティとメソッドが動作する', () => {
      game.start()

      // 既存のプロパティへのアクセス
      expect(game.phase).toBe('preparation')
      expect(game.stage).toBe('youth')
      expect(game.vitality).toBe(100)
      expect(game.turn).toBe(1)
      expect(game.challengesCompleted).toBe(0)
      expect(game.score).toBe(0)

      // 既存のメソッドの動作
      game.applyDamage(20)
      expect(game.vitality).toBe(80)

      game.heal(10)
      expect(game.vitality).toBe(90)

      game.nextTurn()
      expect(game.turn).toBe(2)

      // チャレンジ関連メソッド
      const challengeCard = new Card({
        id: 'ch-1',
        name: 'テストチャレンジ',
        description: '互換性テスト',
        type: 'challenge',
        power: 30,
        cost: 0,
        effects: []
      })

      game.startChallenge(challengeCard)
      expect(game.phase).toBe('challenge')
      expect(game.currentChallenge).toBe(challengeCard)

      game.resolveChallenge(35, true)
      expect(game.phase).toBe('resolution')
      expect(game.challengesCompleted).toBe(1)
    })

    it('保険関連の既存メソッドが動作する', () => {
      game.start()

      // 保険料負担の設定と取得
      const burden = 15
      game['_insuranceBurden'] = burden
      expect(game.insuranceBurden).toBe(burden)

      // 利用可能体力の計算
      expect(game.getAvailableVitality()).toBe(85) // 100 - 15

      // 保険の追加（簡易版）
      const insuranceCard = new Card({
        id: 'ins-1',
        name: '健康保険',
        description: '互換性テスト',
        type: 'insurance',
        power: 0,
        cost: 5,
        effects: [],
        insuranceType: 'health',
        coverage: 25,
        durationType: 'term',
        remainingTurns: 5
      })

      game.addInsurance(insuranceCard)
      expect(game.activeInsurances).toHaveLength(1)
      expect(game.activeInsurances[0]).toBe(insuranceCard)
    })

    it('ステージ進行の既存ロジックが動作する', () => {
      game.start()
      expect(game.stage).toBe('youth')

      // 10ターン経過で中年期へ
      for (let i = 0; i < 9; i++) {
        game.nextTurn()
      }
      expect(game.turn).toBe(10)
      expect(game.stage).toBe('middle_age')

      // さらに10ターンで老年期へ
      for (let i = 0; i < 10; i++) {
        game.nextTurn()
      }
      expect(game.turn).toBe(20)
      expect(game.stage).toBe('elder')
    })
  })

  describe('Cardのcloneメソッドの互換性', () => {
    it('Cardのcloneメソッドが正しく動作する', () => {
      const originalCard = new Card({
        id: 'original',
        name: 'オリジナルカード',
        description: 'クローンテスト',
        type: 'life',
        power: 25,
        cost: 10,
        effects: [],
        category: 'work'
      })

      // cloneメソッドの存在確認
      expect(originalCard.clone).toBeDefined()
      expect(typeof originalCard.clone).toBe('function')

      // クローンの作成
      const clonedCard = originalCard.clone()

      // クローンの検証
      expect(clonedCard).toBeInstanceOf(Card)
      expect(clonedCard).not.toBe(originalCard)
      expect(clonedCard.id).toBe(originalCard.id)
      expect(clonedCard.name).toBe(originalCard.name)
      expect(clonedCard.description).toBe(originalCard.description)
      expect(clonedCard.type).toBe(originalCard.type)
      expect(clonedCard.power).toBe(originalCard.power)
      expect(clonedCard.cost).toBe(originalCard.cost)
      expect(clonedCard.category).toBe(originalCard.category)
    })

    it('保険カードのcloneメソッドが全プロパティを保持する', () => {
      const insuranceCard = new Card({
        id: 'ins-original',
        name: '定期保険',
        description: 'クローンテスト',
        type: 'insurance',
        power: 0,
        cost: 7,
        effects: [],
        insuranceType: 'health',
        coverage: 30,
        durationType: 'term',
        remainingTurns: 5,
        ageBonus: 10
      })

      const cloned = insuranceCard.clone()

      // 保険特有のプロパティも保持されていることを確認
      expect(cloned.insuranceType).toBe(insuranceCard.insuranceType)
      expect(cloned.coverage).toBe(insuranceCard.coverage)
      expect(cloned.durationType).toBe(insuranceCard.durationType)
      expect(cloned.remainingTurns).toBe(insuranceCard.remainingTurns)
      expect(cloned.ageBonus).toBe(insuranceCard.ageBonus)
    })
  })

  describe('DeckクラスでのCard.cloneの使用', () => {
    it('Deckのcloneメソッドが各カードを正しくクローンする', () => {
      const deck = new Deck('テストデッキ')

      // カードを追加
      const cards = [
        cardFactory.createLifeCard({
          category: 'work',
          basePower: 15,
          baseCost: 5
        }),
        cardFactory.createLifeCard({
          category: 'love',
          basePower: 20,
          baseCost: 7
        }),
        new Card({
          id: 'ins-deck',
          name: '保険カード',
          description: 'デッキテスト',
          type: 'insurance',
          power: 0,
          cost: 6,
          effects: [],
          insuranceType: 'health',
          coverage: 25,
          durationType: 'term',
          remainingTurns: 5
        })
      ]

      deck.addCards(cards)
      expect(deck.size()).toBe(3)

      // デッキのクローン
      const clonedDeck = deck.clone()

      // クローンの検証
      expect(clonedDeck).toBeInstanceOf(Deck)
      expect(clonedDeck).not.toBe(deck)
      expect(clonedDeck.getName()).toBe(deck.getName())
      expect(clonedDeck.size()).toBe(deck.size())

      // 各カードが独立してクローンされていることを確認
      const originalCards = deck.getCards()
      const clonedCards = clonedDeck.getCards()

      for (let i = 0; i < originalCards.length; i++) {
        expect(clonedCards[i]).not.toBe(originalCards[i])
        expect(clonedCards[i].id).toBe(originalCards[i].id)
        expect(clonedCards[i].name).toBe(originalCards[i].name)
      }
    })

    it('Deckのシャッフルやドローが元のカードに影響しない', () => {
      const deck = new Deck('シャッフルテスト')

      // カードを追加
      for (let i = 0; i < 10; i++) {
        deck.addCard(cardFactory.createLifeCard({
          category: 'work',
          basePower: 10 + i,
          baseCost: 3 + i
        }))
      }

      // クローンを作成
      const clonedDeck = deck.clone()

      // 元のデッキをシャッフル
      deck.shuffle()

      // クローンからカードを引く
      const drawnCard = clonedDeck.drawCard()
      expect(drawnCard).toBeDefined()

      // 元のデッキのサイズは変わらない
      expect(deck.size()).toBe(10)
      expect(clonedDeck.size()).toBe(9)
    })
  })


  describe('エラーケースの後方互換性', () => {
    it('既存のエラーハンドリングが維持される', () => {
      // ゲーム開始前の操作でエラー
      expect(() => game.nextTurn()).toThrow('Game not started')

      game.start()

      // チャレンジがない状態での解決
      expect(() => game.resolveChallenge(30, true))
        .toThrow('No challenge to resolve')

      // 不正なカードタイプでチャレンジ開始
      const invalidCard = cardFactory.createLifeCard({
        category: 'work',
        basePower: 20,
        baseCost: 5
      })

      expect(() => game.startChallenge(invalidCard))
        .toThrow('Challenge card must be of type "challenge"')
    })

    it('値オブジェクト導入後もエラーメッセージが変わらない', () => {
      // 負の体力値
      game.start()
      expect(() => game['_vitality'] = Vitality.create(-10))
        .toThrow('Vitality must be between 0 and 100')

      // カードの不正な値
      expect(() => new Card({
        id: 'invalid',
        name: '不正カード',
        description: 'エラーテスト',
        type: 'life',
        power: -5,
        cost: 10,
        effects: []
      })).toThrow('CardPower must be non-negative')
    })
  })
})