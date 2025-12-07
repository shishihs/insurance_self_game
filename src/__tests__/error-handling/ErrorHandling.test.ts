/**
 * エラーハンドリングシステムのテスト
 * Long taskの検出とメモリクリーンアップの検証
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { errorHandlingSystem } from '../../utils/error-handling/index'
import { ErrorRecovery } from '../../utils/error-handling/ErrorRecovery'

// PerformanceObserverのモック
class MockPerformanceObserver {
  static callback: (list: any) => void
  callback: (list: any) => void

  constructor(callback: (list: any) => void) {
    this.callback = callback
    MockPerformanceObserver.callback = callback
  }

  observe(options: any) {
    // Long taskをシミュレート
    if (options.entryTypes && options.entryTypes.includes('longtask')) {
      // フェイクタイマー使用時は即座にコールバックを設定
      if (vi.isFakeTimers()) {
        Promise.resolve().then(() => {
          this.callback({
            getEntries: () => [
              { duration: 150, startTime: 1000, name: 'long-task-1' },
              { duration: 80, startTime: 2000, name: 'short-task' },
              { duration: 200, startTime: 3000, name: 'long-task-2' }
            ]
          })
        })
      } else {
        setTimeout(() => {
          this.callback({
            getEntries: () => [
              { duration: 150, startTime: 1000, name: 'long-task-1' },
              { duration: 80, startTime: 2000, name: 'short-task' },
              { duration: 200, startTime: 3000, name: 'long-task-2' }
            ]
          })
        }, 100)
      }
    }
  }

  disconnect() { }
}

// requestIdleCallbackのモック
global.requestIdleCallback = vi.fn((callback, options) => {
  // フェイクタイマー使用時は即座に実行
  if (vi.isFakeTimers()) {
    callback({ timeRemaining: () => 50, didTimeout: false } as IdleDeadline)
  } else {
    setTimeout(() => callback({ timeRemaining: () => 50, didTimeout: false } as IdleDeadline), options?.timeout || 0)
  }
  return 1
})

describe('ErrorHandling System Tests', () => {
  let performanceObserverSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2000000))

    // PerformanceObserverをモック
    Object.defineProperty(globalThis, 'PerformanceObserver', {
      writable: true,
      value: MockPerformanceObserver,
      configurable: true
    })
    performanceObserverSpy = MockPerformanceObserver

    // windowオブジェクトにPerformanceObserverが存在することを保証
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'PerformanceObserver', {
        writable: true,
        value: MockPerformanceObserver,
        configurable: true
      })
    }
  })

  afterEach(() => {
    errorHandlingSystem.destroy()
    vi.useRealTimers()
  })

  describe('Long Task検出のテスト', () => {
    test('100ms以上のタスクのみ報告される', async () => {
      const reportErrorSpy = vi.spyOn(errorHandlingSystem, 'reportError').mockImplementation(() => { })

      // エラーハンドリングシステムを初期化
      errorHandlingSystem.initialize({
        enableLogging: true,
        enableReporting: true
      })

      // PerformanceObserverのコールバックが設定されるまで待つ
      await vi.waitFor(() => {
        return MockPerformanceObserver.callback !== undefined
      }, { timeout: 1000 })

      // Long taskのコールバックを手動で実行
      if (MockPerformanceObserver.callback) {
        MockPerformanceObserver.callback({
          getEntries: () => [
            { duration: 150, startTime: 1000, name: 'long-task-1' },
            { duration: 80, startTime: 2000, name: 'short-task' },
            { duration: 200, startTime: 3000, name: 'long-task-2' }
          ]
        })
      }

      // タイマーを進める
      vi.advanceTimersByTime(100)

      // reportErrorが呼ばれることを確認
      expect(reportErrorSpy).toHaveBeenCalled()

      // 最初の呼び出しの内容を確認
      const firstCall = reportErrorSpy.mock.calls[0]
      expect(firstCall[0]).toBe('Long task detected')
      expect(firstCall[1].duration).toBeGreaterThanOrEqual(100)
      expect(firstCall[1].taskCount).toBe(2) // 100ms以上のタスクは2つ
      expect(firstCall[2]).toBe('performance')
    })

    test('1分間に1回のみ報告される', async () => {
      const reportErrorSpy = vi.spyOn(errorHandlingSystem, 'reportError').mockImplementation(() => { })

      errorHandlingSystem.initialize({
        enableLogging: true,
        enableReporting: true
      })

      // PerformanceObserverのコールバックが設定されるまで待つ
      await vi.waitFor(() => {
        return MockPerformanceObserver.callback !== undefined
      }, { timeout: 1000 })

      // 複数回Long taskを発生させる
      for (let i = 0; i < 5; i++) {
        if (MockPerformanceObserver.callback) {
          MockPerformanceObserver.callback({
            getEntries: () => [
              { duration: 150, startTime: 1000 + i * 100, name: `long-task-${i}` }
            ]
          })
        }
        await vi.advanceTimersByTimeAsync(100)
      }

      // 1回のみ報告されることを確認（レート制限のため）
      expect(reportErrorSpy).toHaveBeenCalledTimes(1)
    })

    test('最も長いタスクが報告される', async () => {
      const reportErrorSpy = vi.spyOn(errorHandlingSystem, 'reportError').mockImplementation(() => { })

      errorHandlingSystem.initialize({
        enableLogging: true,
        enableReporting: true
      })

      // PerformanceObserverのコールバックが設定されるまで待つ
      await vi.waitFor(() => {
        return MockPerformanceObserver.callback !== undefined
      }, { timeout: 1000 })

      // Long taskのコールバックを実行
      if (MockPerformanceObserver.callback) {
        MockPerformanceObserver.callback({
          getEntries: () => [
            { duration: 150, startTime: 1000, name: 'long-task-1' },
            { duration: 80, startTime: 2000, name: 'short-task' },
            { duration: 200, startTime: 3000, name: 'long-task-2' }
          ]
        })
      }

      await vi.advanceTimersByTimeAsync(100)

      const reportedData = reportErrorSpy.mock.calls[0][1]
      expect(reportedData.duration).toBe(200) // 最も長いタスク
      expect(reportedData.totalDuration).toBe(350) // 150 + 200
    })
  })
})

describe('ErrorRecovery Tests', () => {
  let errorRecovery: ErrorRecovery

  beforeEach(() => {
    vi.clearAllMocks()
    errorRecovery = new ErrorRecovery()
  })

  describe('メモリクリーンアップのテスト', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    test('メモリクリーンアップが重複実行されない', async () => {
      const performMemoryCleanupSpy = vi.spyOn(errorRecovery as any, 'performMemoryCleanup')

      const memoryError = {
        message: 'out of memory',
        category: 'performance' as const,
        severity: 'high' as const,
        timestamp: Date.now(),
        userAgent: 'test'
      }

      // 連続でメモリクリーンアップを要求
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(errorRecovery.tryRecover(memoryError))
      }

      const resultsPromise = Promise.all(promises)

      // 非同期処理が含まれるため、タイマーを進める
      await vi.advanceTimersByTimeAsync(5000)

      const results = await resultsPromise

      // 最初の1回のみ実行され、残りはスキップされる
      expect(performMemoryCleanupSpy).toHaveBeenCalledTimes(1)
      expect(results[0].success).toBeDefined()
      expect(results.slice(1).every(r => r.success === false)).toBe(true)
    })

    test('1分後には再度クリーンアップ可能', async () => {
      const performMemoryCleanupSpy = vi.spyOn(errorRecovery as any, 'performMemoryCleanup')

      const memoryError = {
        message: 'out of memory',
        category: 'performance' as const,
        severity: 'high' as const,
        timestamp: Date.now(),
        userAgent: 'test'
      }

      // 最初のクリーンアップ
      const p1 = errorRecovery.tryRecover(memoryError)
      await vi.advanceTimersByTimeAsync(5000)
      await p1
      expect(performMemoryCleanupSpy).toHaveBeenCalledTimes(1)

      // 時間を進める（1分後）
      await vi.advanceTimersByTimeAsync(61000)

      // 2回目のクリーンアップが可能
      const p2 = errorRecovery.tryRecover(memoryError)
      await vi.advanceTimersByTimeAsync(5000)
      await p2
      expect(performMemoryCleanupSpy).toHaveBeenCalledTimes(2)
    })

    test('requestIdleCallbackが使用される', async () => {
      const requestIdleCallbackSpy = vi.spyOn(global, 'requestIdleCallback')

      const cleanupPromise = (errorRecovery as any).performMemoryCleanup()

      // タイマーを進めてrequestIdleCallbackとsetTimeoutを実行
      // performMemoryCleanup内で複数のsetTimeout(..., 10/1000/2000)などが呼ばれるため十分に進める
      await vi.advanceTimersByTimeAsync(5000)

      await cleanupPromise

      // DOM要素のクリーンアップなどがrequestIdleCallbackで実行される
      expect(requestIdleCallbackSpy).toHaveBeenCalled()
    })

    test('パフォーマンスエラーはdebugレベルでログ出力', async () => {
      const consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { })
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

      const performanceError = {
        message: 'Long task detected',
        category: 'performance' as const,
        severity: 'medium' as const,
        timestamp: Date.now(),
        userAgent: 'test'
      }

      const p = errorRecovery.tryAdvancedRecover(performanceError)
      await vi.advanceTimersByTimeAsync(5000)
      await p

      // debugが使用され、logは使用されない
      expect(consoleDebugSpy).toHaveBeenCalledWith('[Recovery] Starting advanced recovery for performance error')
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Starting advanced recovery'))
    })
  })
})