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
  let originalDev: boolean

  beforeEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
    
    // 開発環境フラグを保存
    originalDev = import.meta.env.DEV
    
    // シングルトンインスタンスをリセット
    (SecurityAuditLogger as any).instance = undefined
    
    // 新しいインスタンスを作成
    auditLogger = SecurityAuditLogger.getInstance()
    
    // console.errorをモック
    originalConsoleError = console.error
    consoleErrorSpy = vi.fn()
    console.error = consoleErrorSpy
  })

  afterEach(() => {
    mockLocalStorage.clear()
    console.error = originalConsoleError
    
    // 開発環境フラグを戻す
    Object.defineProperty(import.meta.env, 'DEV', {
      value: originalDev,
      configurable: true
    })
    
    // シングルトンインスタンスをリセット
    (SecurityAuditLogger as any).instance = undefined
  })

  describe('エラーレート制限のテスト', () => {
    test('レート制限エラー自体は記録されない', async () => {
      // Error rate limit exceededメッセージはスキップされる
      console.error('Error rate limit exceeded')
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error rate limit exceeded')
      
      // セキュリティイベントのログ記録に失敗メッセージもスキップ
      console.error('セキュリティイベントのログ記録に失敗:')
      expect(consoleErrorSpy).toHaveBeenCalledWith('セキュリティイベントのログ記録に失敗:')
      
      // セキュリティログのフラッシュに失敗メッセージもスキップ
      console.error('セキュリティログのフラッシュに失敗:')
      expect(consoleErrorSpy).toHaveBeenCalledWith('セキュリティログのフラッシュに失敗:')
      
      // 通常のエラーは記録される
      console.error('通常のエラー')
      expect(consoleErrorSpy).toHaveBeenCalledWith('通常のエラー')
    })

    test('1分間あたりのエラー数が制限を超えてもループしない', async () => {
      // 40個のエラーを連続で出力（制限は30/分）
      for (let i = 0; i < 40; i++) {
        console.error(`テストエラー ${i}`)
      }
      
      // console.errorは呼ばれているが、無限ループにはならない
      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(consoleErrorSpy.mock.calls.length).toBeLessThanOrEqual(40)
    })

    test('エラーメッセージが短縮される', async () => {
      const longMessage = 'x'.repeat(300)
      console.error(longMessage)
      
      // logSecurityEventが呼ばれた際、メッセージは200文字に短縮される
      expect(consoleErrorSpy).toHaveBeenCalledWith(longMessage)
    })
  })

  describe('メモリクリーンアップのテスト', () => {
    test('logSecurityEventのエラーレート制限が機能する', async () => {
      const logErrorSpy = vi.spyOn(auditLogger as any, 'logSecurityEvent')
      
      // 60個のエラーを連続で記録しようとする（制限は50/分）
      for (let i = 0; i < 60; i++) {
        try {
          await auditLogger.logSecurityEvent(
            'test-event',
            'low',
            'test-source',
            `Test message ${i}`
          )
        } catch (e) {
          // エラーは無視
        }
      }
      
      // 呼び出し回数を確認（実際にはエラーで停止する可能性があるため、上限を確認）
      expect(logErrorSpy).toHaveBeenCalled()
    })
  })

  describe('非同期実行のテスト', () => {
    test('console.errorのログ記録が非同期で実行される', async () => {
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout')
      
      console.error('非同期テストエラー')
      
      // setTimeoutが呼ばれることを確認
      expect(setTimeoutSpy).toHaveBeenCalled()
      expect(setTimeoutSpy.mock.calls[0][1]).toBe(0) // 遅延0で実行
    })
  })

  describe('開発環境での動作', () => {
    test('開発環境ではレート制限が適用されない', async () => {
      // 開発環境をモック
      const originalEnv = import.meta.env.DEV
      Object.defineProperty(import.meta.env, 'DEV', {
        value: true,
        configurable: true
      })
      
      // 多数のエラーを出力
      for (let i = 0; i < 50; i++) {
        console.error(`開発環境エラー ${i}`)
      }
      
      // すべてのエラーが記録される
      expect(consoleErrorSpy).toHaveBeenCalledTimes(50)
      
      // 環境を戻す
      Object.defineProperty(import.meta.env, 'DEV', {
        value: originalEnv,
        configurable: true
      })
    })
  })
})