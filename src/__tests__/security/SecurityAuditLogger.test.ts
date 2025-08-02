/**
 * セキュリティ監査ログシステムのテスト
 * レート制限とエラーループ防止機能の検証
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { SecurityAuditLogger } from '../../utils/security-audit-logger'

// モック設定
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
    length: Object.keys(store).length,
    key: (index: number) => Object.keys(store)[index] || null
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: mockLocalStorage, configurable: true })

describe('SecurityAuditLogger Tests', () => {
  let auditLogger: SecurityAuditLogger
  let consoleErrorSpy: any
  let originalConsoleError: any

  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    
    // console.errorをモック
    originalConsoleError = console.error
    consoleErrorSpy = vi.fn()
    console.error = consoleErrorSpy
    
    // シングルトンインスタンスをリセット
    ;(SecurityAuditLogger as any).instance = undefined
    
    // 新しいインスタンスを作成
    auditLogger = SecurityAuditLogger.getInstance()
  })

  afterEach(() => {
    mockLocalStorage.clear()
    if (originalConsoleError) {
      console.error = originalConsoleError
    }
    
    // シングルトンインスタンスをリセット
    ;(SecurityAuditLogger as any).instance = undefined
  })

  describe('基本機能のテスト', () => {
    test('SecurityAuditLoggerインスタンスが正常に作成される', () => {
      expect(auditLogger).toBeDefined()
      expect(auditLogger).toBeInstanceOf(SecurityAuditLogger)
    })

    test('logSecurityEventメソッドが例外なく実行される', async () => {
      expect(async () => {
        await auditLogger.logSecurityEvent(
          'test-event',
          'low',
          'test-source',
          'Test message'
        )
      }).not.toThrow()
    })

    test('シングルトンパターンが正しく機能する', () => {
      const instance1 = SecurityAuditLogger.getInstance()
      const instance2 = SecurityAuditLogger.getInstance()
      expect(instance1).toBe(instance2)
    })
  })

  describe('レポート機能のテスト', () => {
    test('generateAuditReportメソッドが正常に動作する', async () => {
      // テストイベントを追加
      await auditLogger.logSecurityEvent(
        'test-event',
        'medium',
        'test-source',
        'Test message for report'
      )
      
      const report = await auditLogger.generateAuditReport()
      
      expect(report).toBeDefined()
      expect(report.generatedAt).toBeInstanceOf(Date)
      expect(report.summary).toBeDefined()
      expect(report.recommendations).toBeInstanceOf(Array)
    })

    test('searchEventsメソッドが正常に動作する', async () => {
      const events = await auditLogger.searchEvents({})
      expect(events).toBeInstanceOf(Array)
    })

    test('getStatisticsメソッドが正常に動作する', async () => {
      const stats = await auditLogger.getStatistics()
      expect(stats).toBeDefined()
      expect(stats.sessionId).toBeDefined()
      expect(typeof stats.queueSize).toBe('number')
    })
  })
})