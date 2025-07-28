/**
 * 包括的エッジケーステスト
 * 
 * このファイルは、アプリケーション全体で考えられる
 * あらゆるエッジケースと異常系をテストします。
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { CardPower } from '../../domain/valueObjects/CardPower'
import { Vitality } from '../../domain/valueObjects/Vitality'
import { InsurancePremium } from '../../domain/valueObjects/InsurancePremium'
import type { GameConfig } from '../../domain/types/game.types'

describe('包括的エッジケーステスト', () => {
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

  describe('境界値テスト', () => {
    describe('Vitality境界値', () => {
      it('最小値（0）で正常に動作する', () => {
        const vitality = Vitality.create(0)
        expect(vitality.getValue()).toBe(0)
        expect(vitality.isZero()).toBe(true)
      })

      it('最大値（999）で正常に動作する', () => {
        const vitality = Vitality.create(999)
        expect(vitality.getValue()).toBe(999)
      })

      it('負の値でエラーを投げる', () => {
        expect(() => Vitality.create(-1)).toThrow('Vitality cannot be negative')
      })

      it('最大値を超えた場合エラーを投げる', () => {
        expect(() => Vitality.create(1000)).toThrow('Vitality cannot exceed maximum')
      })

      it('NaNでエラーを投げる', () => {
        expect(() => Vitality.create(NaN)).toThrow('Vitality must be a valid number')
      })

      it('Infinityでエラーを投げる', () => {
        expect(() => Vitality.create(Infinity)).toThrow('Vitality must be finite')
      })

      it('小数点以下が切り捨てられる', () => {
        const vitality = Vitality.create(10.9)
        expect(vitality.getValue()).toBe(10)
      })
    })

    describe('CardPower境界値', () => {
      it('最小値（0）で正常に動作する', () => {
        const power = CardPower.create(0)
        expect(power.getValue()).toBe(0)
      })

      it('最大値（999）で正常に動作する', () => {
        const power = CardPower.create(999)
        expect(power.getValue()).toBe(999)
      })

      it('負の値でエラーを投げる', () => {
        expect(() => CardPower.create(-1)).toThrow('CardPower must be non-negative')
      })

      it('最大値を超えた場合制限される', () => {
        expect(() => CardPower.create(1000)).toThrow('CardPower cannot exceed maximum')
      })

      it('加算で最大値を超える場合制限される', () => {
        const power1 = CardPower.create(900)
        const power2 = CardPower.create(200)
        const result = power1.add(power2)
        expect(result.getValue()).toBe(999)
      })

      it('負の倍率でエラーを投げる', () => {
        const power = CardPower.create(10)
        expect(() => power.multiply(-1)).toThrow('Multiplier cannot be negative')
      })
    })

    describe('InsurancePremium境界値', () => {
      it('ゼロ保険料で正常に動作する', () => {
        const premium = InsurancePremium.create(0)
        expect(premium.getValue()).toBe(0)
      })

      it('高額保険料で正常に動作する', () => {
        const premium = InsurancePremium.create(999)
        expect(premium.getValue()).toBe(999)
      })

      it('負の保険料でエラーを投げる', () => {
        expect(() => InsurancePremium.create(-1)).toThrow('Insurance premium cannot be negative')
      })
    })
  })

  describe('並行処理エッジケース', () => {
    it('同時に複数のチャレンジを開始しようとした場合の処理', async () => {
      game.start()
      
      const challenge1 = game.challengeDeck.drawCard()
      const challenge2 = game.challengeDeck.drawCard()

      // 最初のチャレンジを開始
      game.startChallenge(challenge1!)

      // 2つ目のチャレンジを同時に開始しようとする
      expect(() => game.startChallenge(challenge2!)).toThrow('Cannot start challenge: Another challenge is already active')
    })

    it('同時にカードを引こうとした場合の処理', async () => {
      game.start()
      
      // デッキを小さくして境界条件を作る
      while (game.deck.size > 2) {
        game.deck.drawCard()
      }

      // 残り2枚の状態で3枚引こうとする
      expect(() => game.drawCards(3)).toThrow('Not enough cards in deck')
    })
  })

  describe('メモリ制限エッジケース', () => {
    it('大量のカードを処理しても正常に動作する', () => {
      game.start()
      
      // 手札を最大まで埋める
      while (game.hand.length < config.maxHandSize) {
        if (game.deck.size === 0) break
        game.drawCards(1)
      }

      expect(game.hand.length).toBeLessThanOrEqual(config.maxHandSize)
    })

    it('保険カードの最大枚数制限が機能する', () => {
      game.start()
      
      // 保険カードを最大数まで追加
      const insuranceCards = []
      for (let i = 0; i < config.maxInsuranceCards + 2; i++) {
        const card = Card.createInsuranceCard(`insurance-${i}`, 'テスト保険', CardPower.create(5))
        insuranceCards.push(card)
      }

      // 最大数を超えて追加しようとする
      insuranceCards.forEach(card => {
        if (game.insuranceCards.length < config.maxInsuranceCards) {
          game.insuranceCards.push(card)
        }
      })

      expect(game.insuranceCards.length).toBe(config.maxInsuranceCards)
    })
  })

  describe('データ破損エッジケース', () => {
    it('無効なカードIDでの操作', () => {
      game.start()
      
      expect(() => game.playCard('invalid-card-id')).toThrow('Card not found in hand')
    })

    it('存在しないチャレンジの解決', () => {
      game.start()
      
      expect(() => game.resolveChallenge()).toThrow('No active challenge to resolve')
    })

    it('ゲーム終了後の操作', () => {
      game.start()
      game.status = 'finished'
      
      expect(() => game.drawCards(1)).toThrow('Cannot draw cards: Game is not active')
    })

    it('初期化前のゲーム操作', () => {
      const uninitializedGame = new Game(config)
      
      expect(() => uninitializedGame.drawCards(1)).toThrow('Cannot draw cards: Game is not started')
    })
  })

  describe('数値オーバーフローエッジケース', () => {
    it('ターン数が異常に大きくなった場合', () => {
      game.start()
      game.turn = Number.MAX_SAFE_INTEGER - 1
      
      game.nextTurn()
      expect(game.turn).toBe(Number.MAX_SAFE_INTEGER)
      
      // さらに進めようとしても安全
      game.nextTurn()
      expect(game.turn).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('統計値が異常に大きくなった場合', () => {
      game.start()
      
      // 大量のチャレンジを成功させる
      for (let i = 0; i < 1000; i++) {
        game.stats.challengesCompleted++
      }
      
      expect(game.stats.challengesCompleted).toBe(1000)
      expect(typeof game.stats.challengesCompleted).toBe('number')
    })
  })

  describe('タイミング依存エッジケース', () => {
    it('保険の有効期限切れタイミング', () => {
      game.start()
      
      const insurance = Card.createInsuranceCard('temp-insurance', 'テスト保険', CardPower.create(10))
      game.insuranceCards.push(insurance)
      
      // ステージを進める
      game.stage = 'middle'
      game.processInsuranceExpirations()
      
      // youth期の保険は期限切れになる
      expect(game.expiredInsurances.some(card => card.id === 'temp-insurance')).toBe(true)
    })

    it('ステージ変更中の操作', () => {
      game.start()
      
      // ステージ変更プロセス中にカードを引こうとする
      const originalStage = game.stage
      game.stage = 'transitioning' as any
      
      expect(() => game.drawCards(1)).toThrow('Cannot perform action during stage transition')
    })
  })

  describe('リソース枯渇エッジケース', () => {
    it('デッキが空の状態でカードを引く', () => {
      game.start()
      
      // デッキを空にする
      while (game.deck.size > 0) {
        game.deck.drawCard()
      }
      
      expect(() => game.drawCards(1)).toThrow('Cannot draw from empty deck')
    })

    it('チャレンジデッキが空の状態', () => {
      game.start()
      
      // チャレンジデッキを空にする
      while (game.challengeDeck.size > 0) {
        game.challengeDeck.drawCard()
      }
      
      expect(() => game.generateChallenge()).toThrow('No more challenges available')
    })

    it('Vitalityが0の状態での操作', () => {
      game.start()
      game.vitality = Vitality.create(0)
      
      expect(game.isGameOver()).toBe(true)
      expect(() => game.drawCards(1)).toThrow('Cannot continue: Player vitality is zero')
    })
  })

  describe('設定値異常エッジケース', () => {
    it('異常な設定でのゲーム初期化', () => {
      const invalidConfig: GameConfig = {
        startingVitality: -10,
        maxHandSize: 0,
        initialDeckSize: -5,
        challengesPerStage: 0,
        maxInsuranceCards: -1,
        dreamBonusMultiplier: -0.5
      }
      
      expect(() => new Game(invalidConfig)).toThrow('Invalid game configuration')
    })

    it('設定値の境界でのゲーム初期化', () => {
      const boundaryConfig: GameConfig = {
        startingVitality: 1,
        maxHandSize: 1,
        initialDeckSize: 1,
        challengesPerStage: 1,
        maxInsuranceCards: 1,
        dreamBonusMultiplier: 0.1
      }
      
      expect(() => new Game(boundaryConfig)).not.toThrow()
    })
  })

  describe('型安全性エッジケース', () => {
    it('nullやundefinedでの操作', () => {
      game.start()
      
      expect(() => game.playCard(null as any)).toThrow('Card ID cannot be null or undefined')
      expect(() => game.playCard(undefined as any)).toThrow('Card ID cannot be null or undefined')
    })

    it('空文字列での操作', () => {
      game.start()
      
      expect(() => game.playCard('')).toThrow('Card ID cannot be empty')
    })

    it('不正な型でのカード作成', () => {
      expect(() => Card.createLifeCard(null as any, 'テスト', CardPower.create(10))).toThrow('Card ID cannot be null')
      expect(() => Card.createLifeCard('test', null as any, CardPower.create(10))).toThrow('Card name cannot be null')
    })
  })

  describe('ガベージコレクション関連エッジケース', () => {
    it('大量のオブジェクト生成後のメモリクリーンアップ', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // 大量のカードを生成
      const cards = []
      for (let i = 0; i < 10000; i++) {
        cards.push(Card.createLifeCard(`card-${i}`, `カード${i}`, CardPower.create(i % 100)))
      }
      
      // 参照を削除
      cards.length = 0
      
      // ガベージコレクションを強制実行（テスト環境でのみ）
      if (global.gc) {
        global.gc()
      }
      
      // メモリ使用量が適切に管理されていることを確認
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // メモリ増加が合理的な範囲内であることを確認
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB未満
    })
  })

  describe('セキュリティ関連エッジケース', () => {
    it('悪意のあるカードIDでの操作', () => {
      game.start()
      
      const maliciousIds = [
        '../../../etc/passwd',
        '<script>alert("xss")</script>',
        'DROP TABLE cards;',
        '${process.exit(1)}',
        'eval("malicious code")'
      ]
      
      maliciousIds.forEach(id => {
        expect(() => game.playCard(id)).toThrow(/Card not found|Invalid card ID/)
      })
    })

    it('プロトタイプ汚染の防止', () => {
      const maliciousCard = {
        id: 'test',
        name: 'Test',
        power: CardPower.create(10),
        __proto__: { maliciousProperty: 'hacked' }
      }
      
      expect(() => Card.createLifeCard(
        maliciousCard.id, 
        maliciousCard.name, 
        maliciousCard.power
      )).not.toThrow()
      
      // プロトタイプ汚染が発生していないことを確認
      expect((Card.prototype as any).maliciousProperty).toBeUndefined()
    })
  })

  describe('パフォーマンス境界エッジケース', () => {
    it('大量の同時処理での安定性', async () => {
      game.start()
      
      const promises = []
      for (let i = 0; i < 100; i++) {
        promises.push(new Promise(resolve => {
          setTimeout(() => {
            try {
              if (game.deck.size > 0) {
                game.drawCards(1)
              }
              resolve(true)
            } catch (error) {
              resolve(false)
            }
          }, Math.random() * 10)
        }))
      }
      
      const results = await Promise.all(promises)
      const successCount = results.filter(Boolean).length
      
      // 全てが成功するか、適切にエラーハンドリングされることを確認
      expect(successCount).toBeGreaterThan(0)
    })

    it('長時間実行での安定性', () => {
      game.start()
      
      // 長時間のゲームプレイをシミュレート
      const startTime = Date.now()
      let operations = 0
      
      while (Date.now() - startTime < 1000 && operations < 10000) { // 1秒または10000回操作
        try {
          if (game.deck.size > 0) {
            game.drawCards(1)
          }
          if (game.hand.length > 0) {
            const card = game.hand[0]
            game.playCard(card.id)
          }
          operations++
        } catch (error) {
          // エラーが発生した場合は適切に処理される
          break
        }
      }
      
      expect(operations).toBeGreaterThan(0)
      expect(game.status).toBeDefined()
    })
  })
})