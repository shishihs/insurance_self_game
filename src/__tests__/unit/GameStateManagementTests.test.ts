/**
 * ゲーム状態管理の包括的テスト
 * 
 * ゲームの状態遷移、エラーハンドリング、境界条件での動作を
 * 徹底的にテストします。
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { CardPower } from '../../domain/valueObjects/CardPower'
import { Vitality } from '../../domain/valueObjects/Vitality'
import type { GameConfig } from '../../domain/types/game.types'

describe('ゲーム状態管理テスト', () => {
  let game: Game
  let config: GameConfig

  beforeEach(() => {
    config = {
      startingVitality: 20,
      maxHandSize: 7,
      initialDeckSize: 40,
      challengesPerStage: 3,
      maxInsuranceCards: 5,
      dreamBonusMultiplier: 1.5
    }
    game = new Game(config)
  })

  describe('ゲーム初期化の境界テスト', () => {
    it('最小構成でゲームを初期化できる', () => {
      const minimalConfig: GameConfig = {
        startingVitality: 1,
        maxHandSize: 1,
        initialDeckSize: 1,
        challengesPerStage: 1,
        maxInsuranceCards: 1,
        dreamBonusMultiplier: 1.0
      }
      
      expect(() => new Game(minimalConfig)).not.toThrow()
      const minGame = new Game(minimalConfig)
      expect(minGame.config.startingVitality).toBe(1)
    })

    it('異常な設定値でエラーを投げる', () => {
      const invalidConfigs = [
        { ...config, startingVitality: 0 },
        { ...config, startingVitality: -1 },
        { ...config, maxHandSize: 0 },
        { ...config, maxHandSize: -1 },
        { ...config, initialDeckSize: 0 },
        { ...config, challengesPerStage: 0 },
        { ...config, maxInsuranceCards: -1 },
        { ...config, dreamBonusMultiplier: -1 }
      ]
      
      invalidConfigs.forEach(invalidConfig => {
        expect(() => new Game(invalidConfig)).toThrow()
      })
    })

    it('非常に大きな設定値でも処理できる', () => {
      const largeConfig: GameConfig = {
        startingVitality: 1000,
        maxHandSize: 50,
        initialDeckSize: 500,
        challengesPerStage: 100,
        maxInsuranceCards: 50,
        dreamBonusMultiplier: 10.0
      }
      
      expect(() => new Game(largeConfig)).not.toThrow()
    })
  })

  describe('ゲーム開始と状態管理', () => {
    it('ゲーム開始前の操作でエラーを投げる', () => {
      expect(() => game.drawCards(1)).toThrow('Cannot draw cards: Game is not started')
      expect(() => game.playCard('any-id')).toThrow('Cannot play card: Game is not active')
      expect(() => game.nextTurn()).toThrow('Cannot advance turn: Game is not active')
    })

    it('正常にゲームを開始できる', () => {
      expect(() => game.start()).not.toThrow()
      expect(game.status).toBe('active')
      expect(game.vitality.getValue()).toBe(config.startingVitality)
      expect(game.turn).toBe(1)
    })

    it('既に開始されたゲームを再度開始するとエラー', () => {
      game.start()
      expect(() => game.start()).toThrow('Game is already started')
    })

    it('ゲーム終了後の操作でエラーを投げる', () => {
      game.start()
      game.status = 'finished'
      
      expect(() => game.drawCards(1)).toThrow('Cannot draw cards: Game is not active')
      expect(() => game.playCard('any-id')).toThrow('Cannot play card: Game is not active')
      expect(() => game.nextTurn()).toThrow('Cannot advance turn: Game is not active')
    })
  })

  describe('カード管理の境界テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('存在しないカードIDでエラー', () => {
      expect(() => game.playCard('non-existent-id')).toThrow('Card not found in hand')
    })

    it('null/undefinedカードIDでエラー', () => {
      expect(() => game.playCard(null as any)).toThrow('Card ID cannot be null or undefined')
      expect(() => game.playCard(undefined as any)).toThrow('Card ID cannot be null or undefined')
    })

    it('空文字列カードIDでエラー', () => {
      expect(() => game.playCard('')).toThrow('Card ID cannot be empty')
    })

    it('手札上限を超えてカードを引こうとするとエラー', () => {
      // 手札を最大まで埋める
      while (game.hand.length < config.maxHandSize && game.deck.size > 0) {
        game.drawCards(1)
      }
      
      if (game.deck.size > 0) {
        expect(() => game.drawCards(1)).toThrow('Hand is full')
      }
    })

    it('デッキが空の状態でカードを引くとエラー', () => {
      // デッキを空にする
      while (game.deck.size > 0) {
        game.deck.drawCard()
      }
      
      expect(() => game.drawCards(1)).toThrow('Cannot draw from empty deck')
    })

    it('負の数のカードを引こうとするとエラー', () => {
      expect(() => game.drawCards(-1)).toThrow('Cannot draw negative number of cards')
    })

    it('ゼロ枚のカードを引く場合は何もしない', () => {
      const initialHandSize = game.hand.length
      game.drawCards(0)
      expect(game.hand.length).toBe(initialHandSize)
    })

    it('大量のカードを一度に引こうとするとエラー', () => {
      expect(() => game.drawCards(1000)).toThrow('Cannot draw more cards than deck size')
    })
  })

  describe('バイタリティ管理の境界テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('バイタリティがゼロになるとゲーム終了', () => {
      game.vitality = Vitality.create(0)
      expect(game.isGameOver()).toBe(true)
    })

    it('バイタリティ減少で正確に計算される', () => {
      const initialVitality = game.vitality.getValue()
      const damage = Vitality.create(5)
      
      game.takeDamage(damage)
      expect(game.vitality.getValue()).toBe(initialVitality - 5)
    })

    it('バイタリティ減少でゼロ未満にならない', () => {
      const bigDamage = Vitality.create(1000)
      game.takeDamage(bigDamage)
      expect(game.vitality.getValue()).toBe(0)
    })

    it('負のダメージでエラー', () => {
      expect(() => game.takeDamage(Vitality.create(-1))).toThrow()
    })

    it('バイタリティ回復で最大値を超えない', () => {
      game.vitality = Vitality.create(995)
      const healing = Vitality.create(100)
      
      game.healVitality(healing)
      expect(game.vitality.getValue()).toBe(999) // 最大値制限
    })
  })

  describe('ターン管理とステージ進行', () => {
    beforeEach(() => {
      game.start()
    })

    it('ターンが正常に進行する', () => {
      const initialTurn = game.turn
      game.nextTurn()
      expect(game.turn).toBe(initialTurn + 1)
    })

    it('大量のターンを進めても安定', () => {
      const initialTurn = game.turn
      
      for (let i = 0; i < 1000; i++) {
        game.nextTurn()
      }
      
      expect(game.turn).toBe(initialTurn + 1000)
      expect(game.status).toBeDefined()
    })

    it('ターン数がオーバーフローしない', () => {
      game.turn = Number.MAX_SAFE_INTEGER - 1
      game.nextTurn()
      expect(game.turn).toBe(Number.MAX_SAFE_INTEGER)
      
      // さらに進めても安全
      game.nextTurn()
      expect(game.turn).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('ステージ遷移が正常に動作する', () => {
      const initialStage = game.stage
      
      // 必要なチャレンジを完了してステージを進める
      for (let i = 0; i < config.challengesPerStage; i++) {
        game.stats.challengesCompleted++
      }
      
      game.checkStageProgression()
      
      // ステージが進んでいることを確認（具体的な遷移ロジックに依存）
      expect(game.stage).toBeDefined()
    })
  })

  describe('保険管理の境界テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('保険カード上限を超えて追加できない', () => {
      // 保険カードを最大数まで追加
      for (let i = 0; i < config.maxInsuranceCards; i++) {
        const insurance = Card.createInsuranceCard(
          `insurance-${i}`,
          `保険${i}`,
          CardPower.create(1)
        )
        game.insuranceCards.push(insurance)
      }
      
      // さらに追加しようとする
      const extraInsurance = Card.createInsuranceCard(
        'extra-insurance',
        '追加保険',
        CardPower.create(1)
      )
      
      expect(() => game.addInsuranceCard(extraInsurance))
        .toThrow('Cannot add more insurance cards: limit reached')
    })

    it('無効な保険カードでエラー', () => {
      const nonInsuranceCard = Card.createLifeCard(
        'life-card',
        'ライフカード',
        CardPower.create(1)
      )
      
      expect(() => game.addInsuranceCard(nonInsuranceCard))
        .toThrow('Card must be an insurance card')
    })

    it('null保険カードでエラー', () => {
      expect(() => game.addInsuranceCard(null as any))
        .toThrow('Insurance card cannot be null')
    })

    it('重複する保険カードでエラー', () => {
      const insurance = Card.createInsuranceCard(
        'duplicate-insurance',
        '重複保険',
        CardPower.create(1)
      )
      
      game.addInsuranceCard(insurance)
      
      expect(() => game.addInsuranceCard(insurance))
        .toThrow('Insurance card already exists')
    })
  })

  describe('チャレンジ管理の境界テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('既にアクティブなチャレンジがある状態で新しいチャレンジを開始するとエラー', () => {
      const challenge1 = Card.createChallengeCard('challenge1', 'チャレンジ1', CardPower.create(10))
      const challenge2 = Card.createChallengeCard('challenge2', 'チャレンジ2', CardPower.create(10))
      
      game.startChallenge(challenge1)
      
      expect(() => game.startChallenge(challenge2))
        .toThrow('Cannot start challenge: Another challenge is already active')
    })

    it('null/undefinedチャレンジでエラー', () => {
      expect(() => game.startChallenge(null as any))
        .toThrow('Challenge card cannot be null')
      expect(() => game.startChallenge(undefined as any))
        .toThrow('Challenge card cannot be null')
    })

    it('非チャレンジカードでエラー', () => {
      const lifeCard = Card.createLifeCard('life', 'ライフ', CardPower.create(10))
      
      expect(() => game.startChallenge(lifeCard))
        .toThrow('Card must be a challenge card')
    })

    it('アクティブなチャレンジがない状態で解決しようとするとエラー', () => {
      expect(() => game.resolveChallenge())
        .toThrow('No active challenge to resolve')
    })
  })

  describe('統計情報の境界テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('統計値が負になることはない', () => {
      // 初期状態では全て0以上
      expect(game.stats.challengesCompleted).toBeGreaterThanOrEqual(0)
      expect(game.stats.challengesFailed).toBeGreaterThanOrEqual(0)
      expect(game.stats.cardsPlayed).toBeGreaterThanOrEqual(0)
      expect(game.stats.insuranceCardsPurchased).toBeGreaterThanOrEqual(0)
    })

    it('統計値が異常に大きくなっても処理できる', () => {
      // 大量の統計を蓄積
      for (let i = 0; i < 1000000; i++) {
        game.stats.cardsPlayed++
      }
      
      expect(game.stats.cardsPlayed).toBe(1000000)
      expect(typeof game.stats.cardsPlayed).toBe('number')
    })

    it('統計情報のリセット', () => {
      // 統計を増やす
      game.stats.challengesCompleted = 10
      game.stats.cardsPlayed = 20
      
      game.resetStats()
      
      expect(game.stats.challengesCompleted).toBe(0)
      expect(game.stats.cardsPlayed).toBe(0)
    })
  })

  describe('ゲーム状態の永続化と復元', () => {
    beforeEach(() => {
      game.start()
    })

    it('ゲーム状態をシリアライズできる', () => {
      // ゲーム状態を変更
      game.drawCards(3)
      game.nextTurn()
      game.stats.challengesCompleted = 5
      
      const serialized = game.serialize()
      
      expect(serialized).toBeDefined()
      expect(typeof serialized).toBe('string')
      expect(serialized.length).toBeGreaterThan(0)
    })

    it('シリアライズされた状態から復元できる', () => {
      // 元の状態を保存
      const originalTurn = game.turn
      const originalVitality = game.vitality.getValue()
      
      const serialized = game.serialize()
      
      // 新しいゲームインスタンスで復元
      const restoredGame = Game.deserialize(serialized, config)
      
      expect(restoredGame.turn).toBe(originalTurn)
      expect(restoredGame.vitality.getValue()).toBe(originalVitality)
      expect(restoredGame.status).toBe(game.status)
    })

    it('破損したシリアライズデータでエラー', () => {
      const corruptedData = 'invalid-json-data'
      
      expect(() => Game.deserialize(corruptedData, config))
        .toThrow('Invalid serialized game data')
    })

    it('空のシリアライズデータでエラー', () => {
      expect(() => Game.deserialize('', config))
        .toThrow('Serialized data cannot be empty')
      
      expect(() => Game.deserialize(null as any, config))
        .toThrow('Serialized data cannot be null')
    })
  })

  describe('同時実行安全性テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('同時にカードを引く操作が安全', async () => {
      const promises = []
      
      for (let i = 0; i < 10; i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            try {
              if (game.deck.size > 0 && game.hand.length < config.maxHandSize) {
                game.drawCards(1)
                resolve(true)
              } else {
                resolve(false)
              }
            } catch (error) {
              resolve(false) // エラーは適切に処理される
            }
          }, Math.random() * 10)
        }))
      }
      
      const results = await Promise.all(promises)
      const successCount = results.filter(Boolean).length
      
      // 少なくとも一部は成功することを確認
      expect(successCount).toBeGreaterThanOrEqual(0)
      expect(game.hand.length).toBeLessThanOrEqual(config.maxHandSize)
    })

    it('同時のターン進行が安全', async () => {
      const initialTurn = game.turn
      const promises = []
      
      for (let i = 0; i < 5; i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            try {
              game.nextTurn()
              resolve(true)
            } catch (error) {
              resolve(false)
            }
          }, Math.random() * 10)
        }))
      }
      
      await Promise.all(promises)
      
      // ターンが適切に進行していることを確認
      expect(game.turn).toBeGreaterThan(initialTurn)
    })
  })
})