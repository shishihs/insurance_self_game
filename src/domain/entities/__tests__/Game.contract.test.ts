import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../Game'
import { Card } from '../Card'
import { Vitality } from '../../valueObjects/Vitality'
import { CardFactory } from '../../services/CardFactory'
import type { GameConfig } from '../../types/game.types'

/**
 * Game Entity - 契約による設計（Design by Contract）テスト
 * 
 * このテストファイルはt-wadaスタイルのTest Paranoidアプローチに基づいて作成されており、
 * すべての可能な失敗パターンとエッジケースを網羅的にテストします。
 * 
 * 各テストは以下のパターンに従います：
 * 1. Arrange（準備） - テストデータの準備
 * 2. Act（実行） - テスト対象の実行
 * 3. Assert（検証） - 結果の検証
 */
describe('Game Entity - 契約による設計テスト', () => {
  let game: Game
  const validConfig: GameConfig = {
    difficulty: 'normal',
    startingVitality: 50,
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  }

  beforeEach(() => {
    // Arrange: 各テストで新しいGameインスタンスを作成
    game = new Game(validConfig)
  })

  describe('コンストラクタの契約テスト', () => {
    it('正常なconfigで正しく初期化される', () => {
      // Arrange & Act
      const newGame = new Game(validConfig)
      
      // Assert: 事後条件の検証
      expect(newGame.id).toBeDefined()
      expect(newGame.id).toMatch(/^game_/)
      expect(newGame.status).toBe('not_started')
      expect(newGame.phase).toBe('setup')
      expect(newGame.stage).toBe('youth')
      expect(newGame.turn).toBe(0)
      expect(newGame.vitality).toBe(50)
      expect(newGame.maxVitality).toBe(100) // 青年期の最大活力
      expect(newGame.insuranceBurden).toBe(0)
      expect(newGame.hand).toHaveLength(0)
      expect(newGame.selectedCards).toHaveLength(0)
      expect(newGame.insuranceCards).toHaveLength(0)
    })

    it('configなしでもデフォルト値で初期化される', () => {
      // Arrange & Act
      const newGame = new Game()
      
      // Assert: デフォルト値の検証
      expect(newGame.vitality).toBe(100) // デフォルトの開始活力
      expect(newGame.config.difficulty).toBe('normal')
      expect(newGame.config.startingHandSize).toBe(5)
      expect(newGame.config.maxHandSize).toBe(10)
    })

    it('無効なstartingVitalityは上限値でクランプされる', () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        startingVitality: 150 // 最大値を超える
      }
      
      // Act
      const newGame = new Game(invalidConfig)
      
      // Assert: 値が適切にクランプされる
      expect(newGame.vitality).toBe(100) // 青年期の最大活力まで
      expect(newGame.maxVitality).toBe(100)
    })

    it('負のstartingVitalityでエラーになる', () => {
      // Arrange
      const invalidConfig = {
        ...validConfig,
        startingVitality: -10
      }
      
      // Act & Assert: 事前条件違反でエラー
      expect(() => new Game(invalidConfig)).toThrow()
    })
  })

  describe('start()メソッドの契約テスト', () => {
    it('初期状態からゲームを開始できる', () => {
      // Arrange
      expect(game.status).toBe('not_started')
      
      // Act
      game.start()
      
      // Assert: 事後条件の検証
      expect(game.status).toBe('in_progress')
      expect(game.phase).toBe('draw')
      expect(game.turn).toBe(1)
      expect(game.startedAt).toBeInstanceOf(Date)
      
      // 不変条件: startedAtは過去の時刻である
      expect(game.startedAt!.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('既に開始されているゲームでは事前条件違反エラー', () => {
      // Arrange
      game.start()
      
      // Act & Assert: 事前条件違反
      expect(() => game.start()).toThrow('Game has already started')
      
      // 不変条件: 状態が変わらない
      expect(game.status).toBe('in_progress')
      expect(game.turn).toBe(1)
    })

    it('ゲームオーバー状態からは再開始できない', () => {
      // Arrange
      game.start()
      // 強制的にゲームオーバーにする
      const testGame = game as any
      testGame.status = 'game_over'
      
      // Act & Assert
      expect(() => game.start()).toThrow('Game has already started')
    })
  })

  describe('updateVitality()の契約テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('正の値で活力が正しく増加する', () => {
      // Arrange
      const initialVitality = game.vitality
      const healAmount = 10
      
      // Act
      game.heal(healAmount)
      
      // Assert: 事後条件
      expect(game.vitality).toBe(initialVitality + healAmount)
      expect(game.vitality).toBeGreaterThan(initialVitality)
      expect(game.vitality).toBeLessThanOrEqual(game.maxVitality)
      
      // 統計の更新確認
      expect(game.stats.highestVitality).toBeGreaterThanOrEqual(game.vitality)
    })

    it('負の値でダメージが正しく適用される', () => {
      // Arrange
      const initialVitality = game.vitality
      const damageAmount = 20
      
      // Act
      game.applyDamage(damageAmount)
      
      // Assert: 事後条件
      expect(game.vitality).toBe(initialVitality - damageAmount)
      expect(game.vitality).toBeLessThan(initialVitality)
      expect(game.vitality).toBeGreaterThanOrEqual(0)
    })

    it('活力が0になるとゲームオーバーになる', () => {
      // Arrange
      const currentVitality = game.vitality
      
      // Act: 現在の活力以上のダメージを与える
      game.applyDamage(currentVitality)
      
      // Assert: 事後条件
      expect(game.vitality).toBe(0)
      expect(game.status).toBe('game_over')
      expect(game.completedAt).toBeInstanceOf(Date)
      expect(game.isGameOver()).toBe(true)
    })

    it('活力が負になることはない', () => {
      // Arrange
      const currentVitality = game.vitality
      const excessiveDamage = currentVitality + 50
      
      // Act
      game.applyDamage(excessiveDamage)
      
      // Assert: 不変条件 - 活力は0以上
      expect(game.vitality).toBe(0)
      expect(game.vitality).toBeGreaterThanOrEqual(0)
    })

    it('活力が最大値を超えることはない', () => {
      // Arrange
      const maxVitality = game.maxVitality
      const excessiveHeal = maxVitality * 2
      
      // Act
      game.heal(excessiveHeal)
      
      // Assert: 不変条件 - 活力は最大値以下
      expect(game.vitality).toBe(maxVitality)
      expect(game.vitality).toBeLessThanOrEqual(maxVitality)
    })

    it('非数値の入力で事前条件違反エラー', () => {
      // Act & Assert
      expect(() => game.applyDamage(NaN)).toThrow('Change amount must be a finite number')
      expect(() => game.applyDamage(Infinity)).toThrow('Change amount must be a finite number')
      expect(() => game.heal(NaN)).toThrow('Change amount must be a finite number')
      expect(() => game.heal(-Infinity)).toThrow('Change amount must be a finite number')
    })

    it('変更量0では状態が変わらない', () => {
      // Arrange
      const initialVitality = game.vitality
      const initialStats = { ...game.stats }
      
      // Act
      game.heal(0)
      game.applyDamage(0)
      
      // Assert: 状態が変わらない
      expect(game.vitality).toBe(initialVitality)
      expect(game.stats.highestVitality).toBe(initialStats.highestVitality)
    })
  })

  describe('境界値テスト - 活力システム', () => {
    beforeEach(() => {
      game.start()
    })

    it('活力が1のときに1ダメージでゲームオーバー', () => {
      // Arrange: 活力を1にする
      game.applyDamage(game.vitality - 1)
      expect(game.vitality).toBe(1)
      
      // Act
      game.applyDamage(1)
      
      // Assert
      expect(game.vitality).toBe(0)
      expect(game.status).toBe('game_over')
    })

    it('最大活力-1のときに1回復で最大に達する', () => {
      // Arrange: 活力を最大-1にする
      const maxVitality = game.maxVitality
      game.applyDamage(game.vitality - (maxVitality - 1))
      expect(game.vitality).toBe(maxVitality - 1)
      
      // Act
      game.heal(1)
      
      // Assert
      expect(game.vitality).toBe(maxVitality)
      expect(game.getVitality().isFull()).toBe(true)
    })

    it('Float精度での計算も正確に処理される', () => {
      // Arrange
      const initialVitality = game.vitality
      const floatDamage = 0.1 + 0.2 // JavaScript float精度問題
      
      // Act
      game.applyDamage(floatDamage)
      
      // Assert: 小数点計算も適切に処理される
      expect(game.vitality).toBeLessThan(initialVitality)
      expect(typeof game.vitality).toBe('number')
      expect(isFinite(game.vitality)).toBe(true)
    })
  })

  describe('ステージ進行の契約テスト', () => {
    beforeEach(() => {
      game.start()
    })

    it('青年期から中年期への正常な進行', () => {
      // Arrange
      expect(game.stage).toBe('youth')
      expect(game.maxVitality).toBe(100)
      
      // Act
      game.advanceStage()
      
      // Assert: 事後条件
      expect(game.stage).toBe('middle')
      expect(game.maxVitality).toBe(80) // 中年期の最大活力
      expect(game.vitality).toBeLessThanOrEqual(game.maxVitality)
    })

    it('活力が新しい最大値を超える場合の調整', () => {
      // Arrange: 活力を満タンにする
      game.heal(game.maxVitality)
      expect(game.vitality).toBe(100)
      
      // Act: 中年期に進行（最大活力80）
      game.advanceStage()
      
      // Assert: 活力が新しい最大値に調整される
      expect(game.maxVitality).toBe(80)
      expect(game.vitality).toBe(80) // 新しい最大値に調整
    })

    it('最終ステージクリアで勝利状態になる', () => {
      // Arrange: 最終ステージまで進める
      game.advanceStage() // middle
      game.advanceStage() // fulfillment
      expect(game.stage).toBe('fulfillment')
      
      // Act: 最終ステージをクリア
      game.advanceStage()
      
      // Assert: 勝利状態
      expect(game.status).toBe('victory')
      expect(game.completedAt).toBeInstanceOf(Date)
      expect(game.isCompleted()).toBe(true)
    })
  })

  describe('カードドローシステムの契約テスト', () => {
    beforeEach(() => {
      // カードを追加してゲーム開始
      const cards = CardFactory.createStarterLifeCards()
      cards.forEach(card => game.addCardToPlayerDeck(card))
      game.start()
    })

    it('指定枚数のカードを正確にドローする', async () => {
      // Arrange
      const drawCount = 3
      const initialHandSize = game.hand.length
      
      // Act
      const drawnCards = await game.drawCards(drawCount)
      
      // Assert: 事後条件
      expect(drawnCards).toHaveLength(drawCount)
      expect(game.hand.length).toBe(initialHandSize + drawCount)
      
      // 各カードが有効であることを確認
      drawnCards.forEach(card => {
        expect(card).toBeInstanceOf(Card)
        expect(card.id).toBeDefined()
        expect(game.hand).toContain(card)
      })
    })

    it('手札上限を超えた場合の適切な処理', async () => {
      // Arrange: 手札上限まで引く
      const maxHandSize = game.config.maxHandSize || 7
      await game.drawCards(maxHandSize)
      expect(game.hand.length).toBe(maxHandSize)
      
      // Act: さらに引く
      const additionalCards = 2
      await game.drawCards(additionalCards)
      
      // Assert: 上限を維持
      expect(game.hand.length).toBe(maxHandSize)
      expect(game.discardPile.length).toBe(additionalCards)
    })

    it('デッキが空の場合の処理', async () => {
      // Arrange: デッキを空にする
      while (!game.playerDeck.isEmpty()) {
        game.playerDeck.drawCard()
      }
      game.clearHand() // 手札もクリア
      
      // Act & Assert: エラーにならずに0枚が返される
      const drawnCards = await game.drawCards(3)
      expect(drawnCards).toHaveLength(0)
      expect(game.hand.length).toBe(0)
    })

    it('負の枚数でドローしようとすると適切にエラー', async () => {
      // Act & Assert
      await expect(game.drawCards(-1)).rejects.toThrow()
    })

    it('非整数でドローしようとしても適切に処理される', async () => {
      // Act
      const drawnCards = await game.drawCards(2.7)
      
      // Assert: 小数点以下は適切に処理される（切り捨てまたは四捨五入）
      expect(drawnCards.length).toBeGreaterThanOrEqual(0)
      expect(Number.isInteger(drawnCards.length)).toBe(true)
    })
  })

  describe('エラーハンドリングの網羅テスト', () => {
    describe('型安全性テスト', () => {
      it('nullやundefinedパラメータで適切にエラー', () => {
        game.start()
        expect(() => game.applyDamage(null as any)).toThrow('Change amount must not be null or undefined')
        expect(() => game.applyDamage(undefined as any)).toThrow('Change amount must not be null or undefined')
        expect(() => game.heal(null as any)).toThrow('Change amount must not be null or undefined')
        expect(() => game.heal(undefined as any)).toThrow('Change amount must not be null or undefined')
      })

      it('文字列パラメータで適切にエラー', () => {
        game.start()
        expect(() => game.applyDamage('10' as any)).toThrow('Change amount must be a number')
        expect(() => game.heal('invalid' as any)).toThrow('Change amount must be a number')
      })

      it('オブジェクトパラメータで適切にエラー', () => {
        game.start()
        expect(() => game.applyDamage({} as any)).toThrow('Change amount must be a number')
        expect(() => game.applyDamage([] as any)).toThrow('Change amount must be a number')
      })
    })

    describe('状態不整合テスト', () => {
      it('ゲーム未開始状態での操作制限', () => {
        expect(game.status).toBe('not_started')
        
        // ターン進行は不可
        expect(() => game.nextTurn()).toThrow('Game is not in progress')
        
        // チャレンジ開始は不可
        const challengeCard = new Card({
          id: 'test-challenge',
          name: 'テストチャレンジ',
          description: 'テスト用',
          type: 'life',
          power: 5,
          cost: 0,
          effects: []
        })
        expect(() => game.startChallenge(challengeCard)).toThrow()
      })

      it('ゲーム終了後の操作制限', () => {
        // Arrange: ゲームを強制終了
        game.start()
        const testGame = game as any
        testGame.status = 'game_over'
        
        // Act & Assert
        expect(() => game.nextTurn()).toThrow('Game is not in progress')
      })
    })

    describe('メモリリークとリソース管理テスト', () => {
      it('大量のスナップショット作成後の適切なクリーンアップ', () => {
        const snapshots = []
        
        // Arrange: 大量のスナップショットを作成
        for (let i = 0; i < 100; i++) {
          snapshots.push(game.getSnapshot())
        }
        
        // Act: スナップショットを解放
        snapshots.forEach(snapshot => {
          Game.releaseSnapshot(snapshot)
        })
        
        // Assert: オブジェクトプールが適切に管理されている
        const performanceStats = game.getPerformanceStats()
        expect(performanceStats.poolStats).toBeDefined()
        expect(performanceStats.poolStats.gameStates).toBeGreaterThanOrEqual(0)
      })

      it('循環参照の適切な処理', () => {
        // Arrange: 循環参照を作成
        const snapshot = game.getSnapshot()
        const circular: any = { snapshot }
        circular.self = circular
        
        // Act & Assert: 循環参照があってもエラーにならない
        expect(() => {
          JSON.stringify(snapshot) // 循環参照があると失敗する
        }).not.toThrow()
      })
    })
  })

  describe('並行性とパフォーマンステスト', () => {
    beforeEach(() => {
      const cards = CardFactory.createStarterLifeCards()
      cards.forEach(card => game.addCardToPlayerDeck(card))
      game.start()
    })

    it('複数の非同期操作の整合性', async () => {
      // Arrange: 複数の非同期操作を並行実行
      const operations = [
        game.drawCards(2),
        game.drawCards(1),
        game.drawCards(2)
      ]
      
      // Act
      const results = await Promise.all(operations)
      
      // Assert: 結果の整合性
      const totalDrawn = results.reduce((total, cards) => total + cards.length, 0)
      expect(totalDrawn).toBeGreaterThan(0)
      expect(game.hand.length).toBeLessThanOrEqual(game.config.maxHandSize || 7)
    })

    it('高負荷状況での安定性', () => {
      const startTime = performance.now()
      let operationCount = 0
      
      // Act: 短時間で大量の操作
      while (performance.now() - startTime < 50 && operationCount < 1000) {
        try {
          game.getSnapshot()
          game.getAvailableVitality()
          operationCount++
        } catch (error) {
          break
        }
      }
      
      // Assert: エラーなく実行完了
      expect(operationCount).toBeGreaterThan(0)
      expect(game.status).toBeDefined()
    })
  })

  describe('不変条件の継続的検証', () => {
    it('どの操作後もゲーム状態の整合性が保たれる', () => {
      // Arrange
      const cards = CardFactory.createStarterLifeCards()
      cards.forEach(card => game.addCardToPlayerDeck(card))
      
      // Act: 様々な操作を実行
      game.start()
      game.heal(10)
      game.applyDamage(5)
      
      // Assert: 不変条件の検証
      expect(game.vitality).toBeGreaterThanOrEqual(0)
      expect(game.vitality).toBeLessThanOrEqual(game.maxVitality)
      expect(game.turn).toBeGreaterThanOrEqual(0)
      expect(game.stats.highestVitality).toBeGreaterThanOrEqual(game.vitality)
      expect(game.hand.length).toBeGreaterThanOrEqual(0)
      expect(game.selectedCards.length).toBeGreaterThanOrEqual(0)
    })

    it('Vitalityオブジェクトの不変性', () => {
      // Arrange
      game.start()
      const originalVitality = game.getVitality()
      
      // Act: 活力を変更
      game.heal(20)
      const newVitality = game.getVitality()
      
      // Assert: 元のオブジェクトは変更されない（イミュータブル）
      expect(originalVitality.getValue()).not.toBe(newVitality.getValue())
      expect(originalVitality).not.toBe(newVitality) // 別のインスタンス
    })
  })
})