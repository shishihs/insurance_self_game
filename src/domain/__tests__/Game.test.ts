import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../entities/Game'
import { Card } from '../entities/Card'
import { CardFactory } from '../services/CardFactory'
import type { GameConfig } from '../types/game.types'

describe('Game Entity', () => {
  let game: Game
  const defaultConfig: GameConfig = {
    difficulty: 'normal',
    startingVitality: 20,
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  }

  beforeEach(() => {
    game = new Game(defaultConfig)
  })

  describe('初期化', () => {
    it('正しい初期状態で作成される', () => {
      expect(game.status).toBe('not_started')
      expect(game.phase).toBe('setup')
      expect(game.stage).toBe('youth')
      expect(game.turn).toBe(0)
      expect(game.vitality).toBe(20)
      expect(game.maxVitality).toBe(35) // 青年期の最大活力値
      expect(game.hand).toHaveLength(0)
      expect(game.discardPile).toHaveLength(0)
    })

    it('統計情報が初期化される', () => {
      expect(game.stats.totalChallenges).toBe(0)
      expect(game.stats.successfulChallenges).toBe(0)
      expect(game.stats.failedChallenges).toBe(0)
      expect(game.stats.cardsAcquired).toBe(0)
      expect(game.stats.highestVitality).toBe(20)
      expect(game.stats.turnsPlayed).toBe(0)
    })
  })

  describe('ゲーム開始', () => {
    it('ゲームを開始できる', () => {
      game.start()
      
      expect(game.status).toBe('in_progress')
      expect(game.phase).toBe('draw')
      expect(game.turn).toBe(1)
      expect(game.startedAt).toBeDefined()
    })

    it('既に開始されたゲームは再開始できない', () => {
      game.start()
      
      expect(() => game.start()).toThrow('Game has already started')
    })
  })

  describe('カードドロー', () => {
    beforeEach(() => {
      // テスト用カードを追加
      const cards = CardFactory.createStarterLifeCards()
      cards.forEach(card => game.addCardToPlayerDeck(card))
      game.start()
    })

    it('指定枚数のカードを引ける', () => {
      const drawn = game.drawCards(3)
      
      expect(drawn).toHaveLength(3)
      expect(game.hand).toHaveLength(3)
    })

    it('手札上限を超えた場合、古いカードが捨て札になる', () => {
      // デッキに追加のカードを加える
      const extraCards = CardFactory.createStarterLifeCards()
      extraCards.forEach(card => game.addCardToPlayerDeck(card))
      
      // 手札を上限まで引く
      game.drawCards(7)
      expect(game.hand).toHaveLength(7)
      
      // さらに引く
      game.drawCards(2)
      
      expect(game.hand).toHaveLength(7)
      expect(game.discardPile).toHaveLength(2)
    })

    it('デッキが空の時、捨て札をシャッフルして再利用する', () => {
      // 全カードを引く
      const totalCards = game.playerDeck.size()
      const drawnCards = game.drawCards(totalCards)
      
      // 手札をクリアして捨て札に移動
      game.clearHand()
      drawnCards.forEach(card => game.addCardToDiscardPile(card))
      
      // デッキが空であることを確認
      expect(game.playerDeck.isEmpty()).toBe(true)
      expect(game.discardPile).toHaveLength(totalCards)
      
      // 再度引く
      const drawn = game.drawCards(3)
      
      // 3枚引けることを確認
      expect(drawn).toHaveLength(3)
      expect(game.hand).toHaveLength(3) // 新しく引いた3枚
      
      // 捨て札はシャッフルされてデッキに戻るので空になる
      expect(game.discardPile).toHaveLength(0)
      
      // デッキには残りのカードがある
      expect(game.playerDeck.size()).toBe(totalCards - 3)
    })
  })

  describe('チャレンジ', () => {
    let challengeCard: Card

    beforeEach(() => {
      const cards = CardFactory.createStarterLifeCards()
      cards.forEach(card => game.addCardToPlayerDeck(card))
      game.start()
      game.drawCards(5)
      
      challengeCard = new Card({
        id: 'challenge-1',
        name: 'テストチャレンジ',
        description: 'テスト用',
        type: 'life',
        power: 5,
        cost: 0,
        effects: []
      })
    })

    it('チャレンジを開始できる', () => {
      game.startChallenge(challengeCard)
      
      expect(game.phase).toBe('challenge')
      expect(game.currentChallenge).toBe(challengeCard)
      expect(game.selectedCards).toHaveLength(0)
    })

    it('ドローフェーズ以外では開始できない', () => {
      // phaseは直接変更できないので、プライベートプロパティアクセスをテストで回避
      // ここではゲームの状態を操作するためのメソッドを使用
      const testGame = game as unknown as { phase: string }
      testGame.phase = 'resolution'
      
      expect(() => game.startChallenge(challengeCard)).toThrow('Can only start challenge during draw phase')
    })

    it('カードを選択/選択解除できる', () => {
      game.startChallenge(challengeCard)
      const card = game.hand[0]
      
      // 選択
      const selected = game.toggleCardSelection(card)
      expect(selected).toBe(true)
      expect(game.selectedCards).toContain(card)
      
      // 選択解除
      const deselected = game.toggleCardSelection(card)
      expect(deselected).toBe(false)
      expect(game.selectedCards).not.toContain(card)
    })

    it('チャレンジを解決できる（成功）', () => {
      game.startChallenge(challengeCard)
      
      // パワー合計が5以上になるようカードを選択
      let totalPower = 0
      for (const card of game.hand) {
        if (totalPower < 5) {
          game.toggleCardSelection(card)
          totalPower += card.power
        }
      }
      
      const handSizeBefore = game.hand.length
      // const cardsAcquiredBefore = game.stats.cardsAcquired
      const selectedCardCount = game.selectedCards.length
      const result = game.resolveChallenge()
      
      expect(result.success).toBe(true)
      expect(result.playerPower).toBeGreaterThanOrEqual(5)
      expect(game.phase).toBe('insurance_type_selection')  // 新システム: チャレンジ成功後は保険種類選択フェーズ
      expect(game.currentChallenge).toBeUndefined()
      expect(game.stats.successfulChallenges).toBe(1)
      
      // 使用したカードは手札から減る (報酬カードがある場合は加算)
      const expectedHandSize = handSizeBefore - selectedCardCount + (result.rewards ? result.rewards.length : 0)
      expect(game.hand.length).toBe(expectedHandSize)
      
      // 保険種類選択肢が提供される
      expect(result.insuranceTypeChoices).toBeDefined()
      expect(result.insuranceTypeChoices).toHaveLength(3)
      expect(game.currentInsuranceTypeChoices).toBeDefined()
      expect(game.currentInsuranceTypeChoices).toHaveLength(3)
    })

    it('チャレンジを解決できる（失敗）', () => {
      game.startChallenge(challengeCard)
      
      // パワーが足りないカードを選択
      const weakCard = game.hand.find(card => card.power < 3)
      if (weakCard) {
        game.selectedCards.push(weakCard)
      }
      
      const vitalityBefore = game.vitality
      const result = game.resolveChallenge()
      
      expect(result.success).toBe(false)
      expect(game.vitality).toBeLessThan(vitalityBefore)
      expect(game.stats.failedChallenges).toBe(1)
    })
  })

  describe('ステージ進行', () => {
    it('ステージを進められる', () => {
      expect(game.stage).toBe('youth')
      
      game.advanceStage()
      expect(game.stage).toBe('middle')
      
      game.advanceStage()
      expect(game.stage).toBe('fulfillment')
    })

    it('最終ステージクリアで勝利', () => {
      game.start()
      game.stage = 'fulfillment'
      
      game.advanceStage()
      
      expect(game.status).toBe('victory')
      expect(game.completedAt).toBeDefined()
    })

    it('ステージ移行時に活力上限が更新される', () => {
      game.start()
      
      // 青年期の上限を確認
      expect(game.maxVitality).toBe(35)
      
      // 中年期へ移行
      game.advanceStage()
      expect(game.maxVitality).toBe(30)
      
      // 充実期へ移行
      game.advanceStage()
      expect(game.maxVitality).toBe(27)
    })

    it('ステージ移行時に活力が新しい上限を超えていたら調整される', () => {
      game.start()
      game.vitality = 35 // 青年期の最大値
      
      // 中年期へ移行（上限30）
      game.advanceStage()
      expect(game.maxVitality).toBe(30)
      expect(game.vitality).toBe(30) // 調整される
      
      // 充実期へ移行（上限27）
      game.advanceStage()
      expect(game.maxVitality).toBe(27)
      expect(game.vitality).toBe(27) // 調整される
    })
  })

  describe('ゲーム状態', () => {
    it('活力が0になるとゲームオーバー', () => {
      game.start()
      game['updateVitality'](-20)
      
      expect(game.vitality).toBe(0)
      expect(game.status).toBe('game_over')
      expect(game.completedAt).toBeDefined()
    })

    it('最高活力が更新される', () => {
      game.start()
      game['updateVitality'](10)
      
      expect(game.vitality).toBe(30)
      expect(game.stats.highestVitality).toBe(30)
    })

    it('活力は最大値の2倍を超えない', () => {
      game.start()
      game['updateVitality'](100)
      
      expect(game.vitality).toBe(70) // maxVitality(35) * 2
    })
  })

  describe('ターン進行', () => {
    beforeEach(() => {
      const cards = CardFactory.createStarterLifeCards()
      cards.forEach(card => game.addCardToPlayerDeck(card))
      game.start()
    })

    it('次のターンに進める', () => {
      const turnBefore = game.turn
      const handSizeBefore = game.hand.length
      
      game.nextTurn()
      
      expect(game.turn).toBe(turnBefore + 1)
      expect(game.phase).toBe('draw')
      expect(game.hand.length).toBe(handSizeBefore + 1) // ターン開始時に1枚ドロー
      expect(game.stats.turnsPlayed).toBe(2)
    })

    it('ゲームが進行中でないとターンを進められない', () => {
      // statusを直接変更するためのテスト用アクセス
      const testGame = game as unknown as { status: string }
      testGame.status = 'game_over'
      
      expect(() => game.nextTurn()).toThrow('Game is not in progress')
    })
  })

  describe('スナップショット', () => {
    it('ゲーム状態のスナップショットを取得できる', () => {
      game.start()
      const snapshot = game.getSnapshot()
      
      expect(snapshot.id).toBe(game.id)
      expect(snapshot.status).toBe(game.status)
      expect(snapshot.phase).toBe(game.phase)
      expect(snapshot.turn).toBe(game.turn)
      expect(snapshot.vitality).toBe(game.vitality)
      
      // スナップショットは別インスタンス
      expect(snapshot.hand).not.toBe(game.hand)
      expect(snapshot.stats).not.toBe(game.stats)
    })
  })
})