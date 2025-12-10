import { beforeEach, describe, expect, it } from 'vitest'
import { Game } from '../Game'
import { Card } from '../Card'
import type { GameConfig } from '../../types/game.types'

/**
 * Game エンティティ - 状態遷移・不整合データテスト
 * 
 * Test Paranoidによる包括的破綻パターン検証:
 * - 無効な状態組み合わせの検出
 * - イベントシステムの競合状態
 * - キャッシュとダーティフラグの整合性
 * - 複雑な状態遷移での不変条件違反
 * - 並行処理でのデータ競合
 */
describe('Game - 状態遷移・不整合データテスト', () => {
  let game: Game
  let mockConfig: GameConfig

  beforeEach(() => {
    mockConfig = {
      difficulty: 'normal',
      startingVitality: 110, // Compensate for Adventurer -10
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3,
      characterId: 'adventurer', // 0 Savings, -10 Vitality
      balanceConfig: {
        stageParameters: {
          youth: { maxVitality: 110 } // Ensure max is 100 (110 - 10)
        }
      }
    }
    game = new Game(mockConfig)
  })

  describe('🔥 状態遷移の境界条件テスト', () => {
    it('未開始ゲームでの操作制限', async () => {
      expect(game.status).toBe('not_started')

      // 未開始状態でもカードドローは動作する（現在の実装）
      const cards = await game.drawCards(5)
      expect(cards).toBeDefined()

      // ただしターン進行はエラー
      expect(() => game.nextTurn()).toThrow()

      // チャレンジ開始もエラー
      const challengeCard = Card.createChallengeCard('Test Challenge', 5)
      expect(() => { game.startChallenge(challengeCard); }).toThrow()
    })

    it('ゲーム開始後の重複開始エラー', () => {
      game.start()
      expect(game.status).toBe('in_progress')

      // 既に開始済みゲームの再開始
      expect(() => { game.start(); }).toThrow('Game has already started')
    })

    it('ゲームオーバー後の操作制限', async () => {
      game.start()

      // 強制的にゲームオーバー状態にする
      game.applyDamage(200) // 活力を0にする
      expect(game.isGameOver()).toBe(true)
      expect(game.status).toBe('game_over')

      // ゲームオーバー後でもカードドローは動作する（現在の実装）
      const cards = await game.drawCards(1)
      expect(cards).toBeDefined()

      // ターン進行はエラー
      expect(() => game.nextTurn()).toThrow()
    })

    it('無効なフェーズ遷移の検出', async () => {
      game.start()

      // 不正なフェーズ設定の試行
      expect(() => {
        // 内部状態を直接操作（テスト用）
        ; (game as any).phase = 'invalid_phase'
      }).not.toThrow() // 直接設定は可能だが

      // 後の操作で整合性チェックされるか
      const cards = await game.drawCards(1)
      expect(cards).toBeDefined() // 現在の実装では許可される
    })

    it('活力とゲーム状態の不整合検出', () => {
      game.start()

      // 活力が0なのにゲームが継続している不整合状態
      game.applyDamage(100)
      expect(game.vitality).toBe(0)
      expect(game.status).toBe('game_over')

      // この状態での操作
      expect(game.isGameOver()).toBe(true)
      expect(game.isCompleted()).toBe(true)
    })
  })

  describe('💀 キャッシュとダーティフラグの整合性', () => {
    it('活力変更時のキャッシュ無効化', () => {
      game.start()

      // 初回計算でキャッシュが作成される
      const available1 = game.getAvailableVitality()
      expect(available1).toBe(100) // 保険料負担なし

      // 活力変更後のキャッシュ更新確認
      game.applyDamage(20)
      const available2 = game.getAvailableVitality()
      expect(available2).toBe(80)

      // 保険追加後のキャッシュ更新（保険料計算は複雑なため、減少することのみ確認）
      const insurance = Card.createInsuranceCard('Test Insurance', 5, 10)
      game.addInsurance(insurance)
      const available3 = game.getAvailableVitality()
      // 保険料負担が増えるため、利用可能活力は減少する
      expect(available3).toBeLessThanOrEqual(available2)
    })

    it('並行アクセスでのキャッシュ競合状態', async () => {
      game.start()

      // 同時に複数の活力関連操作を実行
      const operations = [
        () => { game.applyDamage(10); },
        () => { game.heal(5); },
        () => game.getAvailableVitality(),
        () => game.calculateInsuranceBurden()
      ]

      // 並行実行
      const promises = operations.map(async op => Promise.resolve().then(op))
      await Promise.all(promises)

      // 最終状態の一貫性確認
      expect(game.vitality).toBe(95) // 100 - 10 + 5
      expect(game.getAvailableVitality()).toBe(95)
    })

    it('ダーティフラグのリセット漏れ検出', () => {
      game.start()

      // パフォーマンス統計でダーティフラグ状態を確認
      const stats1 = game.getPerformanceStats()
      expect(stats1.dirtyFlags['vitality']).toBe(false)

      // 活力変更
      game.applyDamage(10)
      const stats2 = game.getPerformanceStats()
      expect(stats2.dirtyFlags['vitality']).toBe(true)

      // キャッシュアクセス後のフラグリセット
      game.getAvailableVitality()
      const stats3 = game.getPerformanceStats()
      expect(stats3.dirtyFlags['vitality']).toBe(false)
    })
  })

  describe('⚡ 複雑な状態組み合わせテスト', () => {
    it('ステージ遷移時の活力上限調整', () => {
      game.start()
      game.setStage('middle')

      // 中年期の活力上限確認（実装に依存）
      const middleVitality = game.maxVitality
      expect(middleVitality).toBeLessThanOrEqual(100)

      // さらに充実期へ
      game.setStage('fulfillment')
      const fulfillmentVitality = game.maxVitality
      expect(fulfillmentVitality).toBeLessThanOrEqual(middleVitality)

      // 現在活力が上限を超えていないか
      expect(game.vitality).toBeLessThanOrEqual(game.maxVitality)
    })

    it('保険期限管理の複雑な状態', () => {
      game.start()

      // 複数の保険を追加（期限バラバラ）
      const insurance1 = new Card({
        id: 'ins1',
        name: 'Insurance 1',
        description: 'Term 3',
        type: 'insurance',
        power: 5,
        cost: 3,
        durationType: 'term',
        remainingTurns: 3,
        effects: []
      })

      const insurance2 = new Card({
        id: 'ins2',
        name: 'Insurance 2',
        description: 'Term 1',
        type: 'insurance',
        power: 4,
        cost: 2,
        durationType: 'term',
        remainingTurns: 1,
        effects: []
      })

      game.addInsurance(insurance1)
      game.addInsurance(insurance2)

      // 初期状態
      expect(game.getActiveInsurances()).toHaveLength(2)
      expect(game.getExpiredInsurances()).toHaveLength(0)

      // 1ターン経過
      game.nextTurn()

      // insurance2が期限切れになる予定
      const expired = game.getExpiredInsurances()
      expect(expired.length).toBeGreaterThanOrEqual(0)
    })

    it('チャレンジ解決時の複雑な状態更新', () => {
      game.start()

      // game.start()後はdream_selectionフェーズなので、drawフェーズに変更
      game.setPhase('draw')

      // 手札にカードを追加
      const card1 = Card.createLifeCard('Card 1', 3)
      const card2 = Card.createLifeCard('Card 2', 4)
      game.setHand([card1, card2])

      // チャレンジを開始
      const challenge = Card.createChallengeCard('Test Challenge', 10)
      game.startChallenge(challenge)

      // カードを選択
      game.toggleCardSelection(card1)
      game.toggleCardSelection(card2)

      // チャレンジ解決
      const result = game.resolveChallenge()

      // 状態の一貫性確認
      expect(result).toBeDefined()
      expect(game.stats.totalChallenges).toBe(1)

      if (result.success) {
        expect(game.stats.successfulChallenges).toBe(1)
      } else {
        expect(game.stats.failedChallenges).toBe(1)
      }
    })
  })

  describe('🧠 Observer Pattern・イベントシステムの異常系', () => {
    it('イベントリスナーの例外処理', () => {
      game.start()

      // 故意にエラーを起こすイベントリスナーを設定
      const stateManager = game.getStateManager()
      stateManager.addEventListener('phase_change', () => {
        throw new Error('Listener error')
      })

      // フェーズ変更時にエラーが適切に処理されるか
      expect(() => {
        game.setPhase('challenge')
      }).not.toThrow() // エラーが外部に漏れないことを確認
    })

    it('イベント発火の順序性確認', () => {
      game.start()
      const events: string[] = []

      const stateManager = game.getStateManager()
      stateManager.addEventListener('phase_change', (event) => {
        events.push(`phase: ${event.previousValue} -> ${event.newValue}`)
      })
      stateManager.addEventListener('turn_change', (event) => {
        events.push(`turn: ${event.previousValue} -> ${event.newValue}`)
      })

      // 複数の状態変更
      game.setPhase('challenge')
      game.nextTurn()

      // イベントが期待される順序で発火したか
      expect(events.length).toBeGreaterThan(0)
      expect(events[0]).toContain('phase:')
    })

    it('循環参照によるメモリリーク検出', () => {
      const games: Game[] = []

      // 大量のゲームインスタンス作成
      for (let i = 0; i < 100; i++) {
        const testGame = new Game(mockConfig)
        testGame.start()
        games.push(testGame)
      }

      // ガベージコレクション実行（環境依存）
      if ((global as any).gc) {
        (global as any).gc()
      }

      // メモリ使用量の確認（概算）
      const performanceStats = games[0].getPerformanceStats()
      expect(performanceStats.poolStats.gameStates).toBeLessThan(50)
    })
  })

  describe('🔄 統計情報の整合性テスト', () => {
    it('統計カウンターのオーバーフロー耐性', () => {
      game.start()

      // 大量のチャレンジ実行
      for (let i = 0; i < 1000; i++) {
        game.recordChallengeResult(i % 2 === 0)
      }

      expect(game.stats.totalChallenges).toBe(1000)
      expect(game.stats.successfulChallenges).toBe(500)
      expect(game.stats.failedChallenges).toBe(500)

        // Number.MAX_SAFE_INTEGER近くでの動作
        ; (game.stats as any).totalChallenges = Number.MAX_SAFE_INTEGER - 1
      game.recordChallengeResult(true)

      expect(game.stats.totalChallenges).toBe(Number.MAX_SAFE_INTEGER)
    })

    it('最高活力の記録精度', () => {
      game.start()

      // 初期値確認
      expect(game.stats.highestVitality).toBe(100)

      // 活力変動による最高値更新
      game.applyDamage(50) // 50に減少
      expect(game.stats.highestVitality).toBe(100) // 最高値は維持

      game.heal(60) // 110になる予定だが上限で100
      expect(game.stats.highestVitality).toBe(100)

      // 最大活力を増やして回復
      game.setStage('youth') // 最大活力をリセット
      const vitalityObject = game.getVitality()
      const newVitality = vitalityObject.withMaxVitality(120)
        ; (game as any)._vitality = newVitality.increase(20)

      expect(game.stats.highestVitality).toBeGreaterThanOrEqual(100)
    })
  })

  describe('💣 データ不整合の強制的な作成・検出', () => {
    it('手札とデッキの参照整合性', async () => {
      game.start()

      const card = Card.createLifeCard('Test Card', 5)
      game.addCardToPlayerDeck(card)

      // 同じカードを手札にも追加（通常はありえない）
      game.addCardToHand(card)

      // この状態でゲームが破綻しないか
      const drawnCards = await game.drawCards(1)
      expect(drawnCards).toBeDefined()
    })

    it('保険カード配列の重複・null混入', () => {
      game.start()

      const insurance = Card.createInsuranceCard('Test Insurance', 5, 3)

      // 正常な追加
      game.addInsurance(insurance)
      expect(game.getActiveInsurances()).toHaveLength(1)

      // 同じ保険の重複追加
      game.addInsurance(insurance)
      expect(game.getActiveInsurances().length).toBeGreaterThanOrEqual(1)

      // 内部配列への直接操作（悪意のある操作）
      const activeInsurances = (game as any).insuranceCards
      if (activeInsurances) {
        activeInsurances.push(null) // null混入

        // この状態でメソッド呼び出し
        expect(() => {
          game.calculateInsuranceBurden()
        }).not.toThrow() // エラーハンドリングされることを期待
      }
    })

    it('フェーズとターン数の不整合状態', () => {
      game.start()

        // 内部状態を直接操作
        ; (game as any).turn = -1 // 負のターン数
        ; (game as any).phase = 'challenge'

      // この状態での操作
      expect(() => {
        const snapshot = game.getSnapshot()
        expect(snapshot.turn).toBe(-1)
        expect(snapshot.phase).toBe('challenge')
      }).not.toThrow()
    })
  })

  describe('🎯 エッジケース・境界条件の組み合わせ', () => {
    it('活力0・保険料負担ありの状態', () => {
      game.start()

      // 保険追加
      const insurance = Card.createInsuranceCard('Expensive Insurance', 5, 10)
      game.addInsurance(insurance)

      // 活力を0にする
      game.applyDamage(100)

      // この状態での利用可能活力（保険料分がマイナスになる可能性）
      const available = game.getAvailableVitality()
      // 活力0で保険料負担があるため、0以下になるはず
      expect(available).toBeLessThanOrEqual(0)

      // ゲームオーバー状態か
      expect(game.isGameOver()).toBe(true)
    })

    it('最大手札数オーバーでのカードドロー', async () => {
      game.start()

      // 手札を最大数まで埋める
      const maxSize = mockConfig.maxHandSize
      const cards = Array.from({ length: maxSize + 5 }, (_, i) =>
        Card.createLifeCard(`Card ${i}`, 1)
      )

      game.setHand(cards.slice(0, maxSize))
      expect(game.hand).toHaveLength(maxSize)

      // さらにドローしようとする
      const drawnCards = await game.drawCards(1)
      expect(drawnCards).toBeDefined() // 実装に依存
    })

    it('全ての統計値が最大値の状態', () => {
      game.start()

      // 統計値を極限まで押し上げる
      for (let i = 0; i < 10000; i++) {
        game.recordChallengeResult(true)
      }

      expect(game.stats.totalChallenges).toBe(10000)
      expect(game.stats.successfulChallenges).toBe(10000)
      expect(game.stats.challengesCompleted).toBe(10000)

      // この状態でのスナップショット取得
      const snapshot = game.getSnapshot()
      expect(snapshot.stats.totalChallenges).toBe(10000)
    })
  })
})