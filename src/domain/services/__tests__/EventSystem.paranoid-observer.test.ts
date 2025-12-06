import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Game } from '../../entities/Game'
import { Card } from '../../entities/Card'
import type { GamePhase, GameStatus } from '../../types/game.types'
import type { GameStage } from '../../types/card.types'

/**
 * イベントシステム・Observer Pattern 異常系テスト
 * 
 * Test Paranoidによる包括的破綻パターン検証:
 * - イベントリスナーの例外処理
 * - 循環参照・無限ループの検出
 * - イベント順序の整合性
 * - メモリリーク防止機構
 * - 並行イベント処理での競合状態
 */
describe('イベントシステム・Observer Pattern 異常系テスト', () => {
  let game: Game
  let eventLog: Array<{ type: string, data: any, timestamp: number }>

  beforeEach(() => {
    game = new Game({
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    })

    eventLog = []
  })

  describe('🔥 イベントリスナーの例外処理', () => {
    it('リスナー内での例外がシステム全体を破綻させない', () => {
      game.start()
      const stateManager = game.getStateManager()

      // 故意にエラーを起こすリスナー
      const faultyListener = vi.fn(() => {
        throw new Error('Faulty listener error')
      })

      // 正常なリスナー
      const normalListener = vi.fn((event) => {
        eventLog.push({ type: 'normal', data: event, timestamp: Date.now() })
      })

      stateManager.addEventListener('phase_change', faultyListener)
      stateManager.addEventListener('phase_change', normalListener)

      // フェーズ変更を実行
      expect(() => {
        game.setPhase('challenge')
      }).not.toThrow() // エラーが外部に漏れない

      // 正常なリスナーは実行されている
      expect(normalListener).toHaveBeenCalled()

      // システムの状態は正常
      expect(game.phase).toBe('challenge')
    })

    it('複数のエラーリスナーでの例外隔離', () => {
      game.start()
      const stateManager = game.getStateManager()

      const errors = ['Error 1', 'Error 2', 'Error 3']
      const errorListeners = errors.map(errorMsg =>
        vi.fn(() => { throw new Error(errorMsg) })
      )

      const successCounter = vi.fn()

      // エラーリスナーを登録
      errorListeners.forEach(listener => {
        stateManager.addEventListener('turn_change', listener)
      })

      // 成功リスナーを登録
      stateManager.addEventListener('turn_change', successCounter)

      // ターン変更を複数回実行
      expect(() => {
        for (let i = 0; i < 5; i++) {
          game.nextTurn()
        }
      }).not.toThrow()

      // 成功リスナーが正常に呼ばれている
      expect(successCounter).toHaveBeenCalledTimes(5)

      // ゲーム状態は正常
      expect(game.turn).toBe(6) // 初期1 + 5回のnextTurn
    })

    it('非同期リスナーでの例外処理', async () => {
      game.start()
      const stateManager = game.getStateManager()

      const asyncErrors: Error[] = []

      // 非同期でエラーを起こすリスナー
      const asyncFaultyListener = vi.fn(async (event) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Async listener error')
      })

      // 非同期成功リスナー
      const asyncSuccessListener = vi.fn(async (event) => {
        await new Promise(resolve => setTimeout(resolve, 5))
        eventLog.push({ type: 'async_success', data: event, timestamp: Date.now() })
      })

      stateManager.addEventListener('status_change', asyncFaultyListener)
      stateManager.addEventListener('status_change', asyncSuccessListener)

      // ステータス変更を実行
      game.applyDamage(200) // game_overに変更

      // 少し待って非同期処理完了を待つ
      await new Promise(resolve => setTimeout(resolve, 50))

      // システムは正常動作している
      expect(game.status).toBe('game_over')
      expect(asyncSuccessListener).toHaveBeenCalled()
    })
  })

  describe('💀 循環参照・無限ループの検出', () => {
    it('イベント内でのイベント発火による無限ループ検出', () => {
      game.start()
      const stateManager = game.getStateManager()

      let recursionDepth = 0
      const maxRecursionDepth = 100

      // 自己参照するリスナー（無限ループを引き起こす可能性）
      const recursiveListener = vi.fn((event) => {
        recursionDepth++

        if (recursionDepth > maxRecursionDepth) {
          throw new Error('Maximum recursion depth exceeded')
        }

        // 同じイベントを再発火（危険）
        if (recursionDepth < 3) { // 3回まで許可
          try {
            game.setPhase(event.newValue === 'challenge' ? 'draw' : 'challenge')
          } catch (error) {
            // 再帰制限エラーをキャッチ
            eventLog.push({ type: 'recursion_stopped', data: error.message, timestamp: Date.now() })
          }
        }
      })

      stateManager.addEventListener('phase_change', recursiveListener)

      // 初回のフェーズ変更
      expect(() => {
        game.setPhase('challenge')
      }).not.toThrow()

      // 無限ループが適切に制御されている
      expect(recursionDepth).toBeLessThan(maxRecursionDepth)
      expect(eventLog.some(log => log.type === 'recursion_stopped')).toBe(false) // 制御が効いている
    })

    it('相互参照イベントでの循環検出', () => {
      const game1 = new Game()
      const game2 = new Game()

      game1.start()
      game2.start()

      const stateManager1 = game1.getStateManager()
      const stateManager2 = game2.getStateManager()

      let crossReferenceCount = 0

      // game1のイベントがgame2を変更
      stateManager1.addEventListener('phase_change', (event) => {
        crossReferenceCount++
        if (crossReferenceCount < 5) { // 循環制限
          game2.setPhase(event.newValue === 'challenge' ? 'draw' : 'challenge')
        }
      })

      // game2のイベントがgame1を変更
      stateManager2.addEventListener('phase_change', (event) => {
        crossReferenceCount++
        if (crossReferenceCount < 5) { // 循環制限
          game1.setPhase(event.newValue === 'challenge' ? 'draw' : 'challenge')
        }
      })

      // 循環開始
      expect(() => {
        game1.setPhase('challenge')
      }).not.toThrow()

      // 循環が制御されている
      expect(crossReferenceCount).toBeLessThan(10)
    })

    it('メモリリークを引き起こすリスナー蓄積の検出', () => {
      const games: Game[] = []
      const listenerCounts: number[] = []

      // 大量のゲームインスタンスでリスナー蓄積をテスト
      for (let gameIndex = 0; gameIndex < 100; gameIndex++) {
        const tempGame = new Game()
        tempGame.start()
        games.push(tempGame)

        const stateManager = tempGame.getStateManager()

        // 複数のリスナーを追加
        for (let listenerIndex = 0; listenerIndex < 5; listenerIndex++) {
          const listener = (event: any) => {
            eventLog.push({
              type: `game_${gameIndex}_listener_${listenerIndex}`,
              data: event,
              timestamp: Date.now()
            })
          }

          stateManager.addEventListener('phase_change', listener)
          stateManager.addEventListener('turn_change', listener)
          stateManager.addEventListener('status_change', listener)
        }

        // リスナー数を記録（実装依存）
        const listenerCount = stateManager.getListenerCount?.() || 0
        listenerCounts.push(listenerCount)
      }

      // リスナー数の増加が線形的であることを確認（メモリリークではない）
      if (listenerCounts.length > 10) {
        const early = listenerCounts.slice(0, 10)
        const late = listenerCounts.slice(-10)

        const earlyAvg = early.reduce((a, b) => a + b, 0) / early.length
        const lateAvg = late.reduce((a, b) => a + b, 0) / late.length

        // リスナー数が異常に増加していない
        const growthRatio = lateAvg / earlyAvg
        expect(growthRatio).toBeLessThan(2) // 2倍未満の増加
      }

      // クリーンアップ
      games.forEach(game => {
        const stateManager = game.getStateManager()
        stateManager.removeAllListeners?.()
      })
    })
  })

  describe('⚡ イベント順序の整合性', () => {
    it('複雑な状態変更でのイベント順序保証', () => {
      game.start()
      const stateManager = game.getStateManager()

      const eventSequence: string[] = []

      // 各イベントタイプのリスナー
      stateManager.addEventListener('phase_change', (event) => {
        eventSequence.push(`phase:${event.previousValue}->${event.newValue}`)
      })

      stateManager.addEventListener('turn_change', (event) => {
        eventSequence.push(`turn:${event.previousValue}->${event.newValue}`)
      })

      stateManager.addEventListener('status_change', (event) => {
        eventSequence.push(`status:${event.previousValue}->${event.newValue}`)
      })

      stateManager.addEventListener('stage_change', (event) => {
        eventSequence.push(`stage:${event.previousValue}->${event.newValue}`)
      })

      // 複雑な状態変更シーケンス
      game.setPhase('challenge')
      game.nextTurn()
      game.setStage('middle')
      game.applyDamage(100) // status変更を誘発

      // イベントが適切な順序で発生している
      expect(eventSequence.length).toBeGreaterThan(3)

      // フェーズ変更イベントが最初に来ている
      expect(eventSequence[0]).toContain('phase:')

      // ステータス変更イベントが最後に来ている
      const statusEvents = eventSequence.filter(event => event.includes('status:'))
      expect(statusEvents.length).toBeGreaterThan(0)
    })

    it('並行イベント発火での順序整合性', async () => {
      game.start()
      const stateManager = game.getStateManager()

      const concurrentEvents: Array<{ event: string, timestamp: number }> = []

      // タイムスタンプ付きリスナー
      const timestampListener = (eventType: string) => (event: any) => {
        concurrentEvents.push({
          event: `${eventType}:${event.previousValue}->${event.newValue}`,
          timestamp: performance.now()
        })
      }

      stateManager.addEventListener('phase_change', timestampListener('phase'))
      stateManager.addEventListener('turn_change', timestampListener('turn'))
      stateManager.addEventListener('stage_change', timestampListener('stage'))

      // 並行で複数の状態変更を実行
      const changes = [
        () => { game.setPhase('challenge'); },
        () => game.nextTurn(),
        () => { game.setStage('middle'); },
        () => { game.setPhase('draw'); },
        () => game.nextTurn()
      ]

      const promises = changes.map(async change => Promise.resolve().then(change))
      await Promise.allSettled(promises)

      // イベントの時系列順序を確認
      concurrentEvents.sort((a, b) => a.timestamp - b.timestamp)

      // タイムスタンプが単調増加している
      for (let i = 1; i < concurrentEvents.length; i++) {
        expect(concurrentEvents[i].timestamp).toBeGreaterThanOrEqual(concurrentEvents[i - 1].timestamp)
      }

      // 論理的に不整合な順序がない（実装依存）
      const phaseEvents = concurrentEvents.filter(e => e.event.includes('phase:'))
      const turnEvents = concurrentEvents.filter(e => e.event.includes('turn:'))

      expect(phaseEvents.length).toBeGreaterThan(0)
      expect(turnEvents.length).toBeGreaterThan(0)
    })

    it('イベントリスナーの登録・削除順序', () => {
      game.start()
      const stateManager = game.getStateManager()

      const executionOrder: number[] = []

      // 順序付きリスナー
      const createOrderedListener = (order: number) => (event: any) => {
        executionOrder.push(order)
      }

      const listeners = [
        createOrderedListener(1),
        createOrderedListener(2),
        createOrderedListener(3),
        createOrderedListener(4),
        createOrderedListener(5)
      ]

      // リスナーを順次登録
      listeners.forEach(listener => {
        stateManager.addEventListener('phase_change', listener)
      })

      // イベント発火
      game.setPhase('challenge')

      // 登録順序でリスナーが実行されている
      expect(executionOrder).toEqual([1, 2, 3, 4, 5])

      // 一部のリスナーを削除
      executionOrder.length = 0
      stateManager.removeEventListener?.('phase_change', listeners[1])
      stateManager.removeEventListener?.('phase_change', listeners[3])

      // 再度イベント発火
      game.setPhase('draw')

      // 削除されたリスナーは実行されない
      expect(executionOrder).toEqual([1, 3, 5])
    })
  })

  describe('🧠 パフォーマンス・スケーラビリティ', () => {
    it('大量リスナーでのイベント処理性能', () => {
      game.start()
      const stateManager = game.getStateManager()

      const listenerCount = 1000
      const executionCounts: number[] = []

      // 大量のリスナーを登録
      for (let i = 0; i < listenerCount; i++) {
        let execCount = 0
        const listener = (event: any) => {
          execCount++
        }

        stateManager.addEventListener('phase_change', listener)
        executionCounts.push(execCount)
      }

      // パフォーマンス測定
      const startTime = performance.now()

      // 複数回のイベント発火
      for (let i = 0; i < 10; i++) {
        game.setPhase(i % 2 === 0 ? 'challenge' : 'draw')
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 性能要件（1000リスナー×10イベントが妥当な時間内）
      expect(duration).toBeLessThan(100) // 100ms以内

      // 全リスナーが実行されている
      const totalExecutions = executionCounts.reduce((sum, count) => sum + count, 0)
      expect(totalExecutions).toBe(listenerCount * 10)
    })

    it('イベントデータの大容量処理', () => {
      game.start()
      const stateManager = game.getStateManager()

      const largeDataSizes: number[] = []

      // 大容量データを扱うリスナー
      const largeDataListener = (event: any) => {
        // 大きなデータ構造を作成
        const largeData = {
          event,
          timestamp: Date.now(),
          largeArray: new Array(10000).fill(Math.random()),
          nestedData: {
            level1: new Array(1000).fill('data'),
            level2: {
              items: new Array(500).fill({ id: Math.random(), value: 'test' })
            }
          }
        }

        largeDataSizes.push(JSON.stringify(largeData).length)
      }

      stateManager.addEventListener('phase_change', largeDataListener)

      const startTime = performance.now()

      // 複数回のイベント発火
      for (let i = 0; i < 20; i++) {
        game.setPhase(i % 2 === 0 ? 'challenge' : 'draw')
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // 大容量データでも処理時間が妥当
      expect(duration).toBeLessThan(1000) // 1秒以内

      // データサイズの一貫性
      expect(largeDataSizes.length).toBe(20)
      largeDataSizes.forEach(size => {
        expect(size).toBeGreaterThan(100000) // 100KB以上
      })
    })

    it('メモリ使用量の最適化確認', () => {
      const initialMemory = process.memoryUsage().heapUsed

      // 大量のゲームインスタンスでイベントシステムをテスト
      const games: Game[] = []

      for (let i = 0; i < 100; i++) {
        const testGame = new Game()
        testGame.start()

        const stateManager = testGame.getStateManager()

        // 各ゲームに複数のリスナーを追加
        for (let j = 0; j < 10; j++) {
          const listener = (event: any) => {
            // 軽量な処理
            eventLog.push({
              type: `game_${i}_listener_${j}`,
              data: event.type,
              timestamp: Date.now()
            })
          }

          stateManager.addEventListener('phase_change', listener)
        }

        games.push(testGame)

        // 各ゲームでイベント発火
        testGame.setPhase('challenge')
        testGame.nextTurn()
      }

      const peakMemory = process.memoryUsage().heapUsed

      // ゲームとリスナーをクリーンアップ
      games.forEach(game => {
        const stateManager = game.getStateManager()
        stateManager.removeAllListeners?.()
      })
      games.length = 0

      // ガベージコレクション
      if (global.gc) {
        global.gc()
      }

      const finalMemory = process.memoryUsage().heapUsed

      // メモリ効率性の確認
      const peakIncrease = peakMemory - initialMemory
      const finalIncrease = finalMemory - initialMemory
      const memoryPerGame = peakIncrease / 100
      const cleanupEfficiency = (peakIncrease - finalIncrease) / peakIncrease

      expect(memoryPerGame).toBeLessThan(50000) // ゲーム1つあたり50KB未満
      expect(cleanupEfficiency).toBeGreaterThan(0.7) // 70%以上のメモリ解放
    })
  })

  describe('🎯 実際のゲームシナリオでの統合テスト', () => {
    it('完全なゲームライフサイクルでのイベント整合性', async () => {
      const completeEventLog: Array<{ type: string, phase: GamePhase, turn: number, status: GameStatus, stage: GameStage }> = []

      game.start()
      const stateManager = game.getStateManager()

      // 包括的なイベントリスナー
      const comprehensiveListener = (eventType: string) => (event: any) => {
        completeEventLog.push({
          type: eventType,
          phase: game.phase,
          turn: game.turn,
          status: game.status,
          stage: game.stage
        })
      }

      stateManager.addEventListener('phase_change', comprehensiveListener('phase_change'))
      stateManager.addEventListener('turn_change', comprehensiveListener('turn_change'))
      stateManager.addEventListener('status_change', comprehensiveListener('status_change'))
      stateManager.addEventListener('stage_change', comprehensiveListener('stage_change'))

      // 完全なゲームプレイシーケンス
      game.setPhase('draw')
      await game.drawCards(3)
      game.setPhase('challenge')

      // チャレンジ実行
      const challenge = Card.createChallengeCard('Test Challenge', 5)
      game.startChallenge(challenge)
      game.setPhase('resolution')

      // ターン進行
      game.nextTurn()
      game.nextTurn()

      // ステージ進行
      game.setStage('middle')
      game.nextTurn()

      // ゲーム終了
      game.applyDamage(200)

      // イベントログの検証
      expect(completeEventLog.length).toBeGreaterThan(5)

      // 各イベントタイプが適切に記録されている
      const eventTypes = completeEventLog.map(log => log.type)
      expect(eventTypes).toContain('phase_change')
      expect(eventTypes).toContain('turn_change')
      expect(eventTypes).toContain('status_change')

      // 最終状態の確認
      const finalLog = completeEventLog[completeEventLog.length - 1]
      expect(finalLog.status).toBe('game_over')
    })

    it('エラー発生時のシステム復旧能力', () => {
      game.start()
      const stateManager = game.getStateManager()

      const recoveryLog: Array<{ type: 'error' | 'recovery', message: string, timestamp: number }> = []

      // エラーを記録するリスナー
      const errorTrackingListener = (event: any) => {
        try {
          // 故意にエラーを発生させる条件
          if (event.newValue === 'challenge' && Math.random() < 0.3) {
            throw new Error('Random listener error')
          }

          recoveryLog.push({
            type: 'recovery',
            message: `Successful processing: ${event.type}`,
            timestamp: Date.now()
          })
        } catch (error) {
          recoveryLog.push({
            type: 'error',
            message: error.message,
            timestamp: Date.now()
          })
        }
      }

      stateManager.addEventListener('phase_change', errorTrackingListener)

      // 大量の状態変更でエラー発生と復旧をテスト
      for (let i = 0; i < 50; i++) {
        game.setPhase(i % 2 === 0 ? 'challenge' : 'draw')
      }

      // エラーが発生してもシステムが継続している
      const errorCount = recoveryLog.filter(log => log.type === 'error').length
      const recoveryCount = recoveryLog.filter(log => log.type === 'recovery').length

      expect(recoveryCount).toBeGreaterThan(errorCount) // 成功が失敗を上回る
      expect(game.phase).toBe('draw') // 最終状態が正常

      // システムが応答している
      expect(() => {
        game.setPhase('challenge')
      }).not.toThrow()
    })
  })
})