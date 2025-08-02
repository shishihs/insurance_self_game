/**
 * iframe検出・ブロック機能のテスト
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { FrameDetector } from '../../utils/security/frame-detector'

describe('FrameDetector Tests', () => {
  let frameDetector: FrameDetector | null = null
  let originalTop: any
  let originalSelf: any
  let setIntervalSpy: any
  let consoleWarnSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    // シングルトンインスタンスをリセット
    ;(FrameDetector as any).instance = undefined
    
    // window.top と window.self をモック
    originalTop = globalThis.top
    originalSelf = globalThis.self
    
    // console.warnをモック
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    
    // setIntervalをモック
    setIntervalSpy = vi.spyOn(globalThis, 'setInterval').mockImplementation(() => 0)
  })

  afterEach(() => {
    // モックを元に戻す
    Object.defineProperty(globalThis, 'top', { value: originalTop, writable: true })
    Object.defineProperty(globalThis, 'self', { value: originalSelf, writable: true })
    consoleWarnSpy.mockRestore()
    setIntervalSpy.mockRestore()
    
    // インスタンスをクリーンアップ
    if (frameDetector) {
      frameDetector.destroy()
      frameDetector = null
    }
    
    // シングルトンインスタンスをリセット
    ;(FrameDetector as any).instance = undefined
  })

  describe('iframe検出のテスト', () => {
    test('通常のウィンドウでは iframe として検出されない', () => {
      // window.top === window.self の状態
      Object.defineProperty(globalThis, 'top', { value: globalThis, writable: true })
      Object.defineProperty(globalThis, 'self', { value: globalThis, writable: true })
      
      frameDetector = FrameDetector.getInstance()
      
      expect(frameDetector.isRunningInFrame()).toBe(false)
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('iframe内で実行'))
    })

    test('iframe内では検出される', () => {
      // window.top !== window.self の状態
      const mockTop = { location: { href: 'https://parent.com' } }
      Object.defineProperty(globalThis, 'top', { value: mockTop, writable: true })
      Object.defineProperty(globalThis, 'self', { value: globalThis, writable: true })
      
      frameDetector = FrameDetector.getInstance()
      
      expect(frameDetector.isRunningInFrame()).toBe(true)
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Security] サイトがiframe内で実行されています')
    })

    test('クロスオリジンiframeでも検出される', () => {
      // window.topへのアクセスで例外が発生する状態をモック
      Object.defineProperty(globalThis, 'top', {
        get() { throw new Error('Blocked a frame with origin') },
        configurable: true
      })
      Object.defineProperty(globalThis, 'self', { value: globalThis, writable: true })
      
      frameDetector = FrameDetector.getInstance()
      
      expect(frameDetector.isRunningInFrame()).toBe(true)
    })
  })

  describe('開発環境での動作', () => {
    test('開発環境ではiframe実行を許可', () => {
      // 開発環境をモック
      const originalEnv = import.meta.env.DEV
      Object.defineProperty(import.meta.env, 'DEV', {
        value: true,
        configurable: true
      })
      
      // iframe内の状態をモック
      const mockTop = { location: { href: 'https://parent.com' } }
      Object.defineProperty(window, 'top', { value: mockTop, writable: true })
      Object.defineProperty(window, 'self', { value: window, writable: true })
      
      frameDetector = FrameDetector.getInstance()
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[Security] 開発環境のため、iframe実行を許可します')
      
      // 環境を戻す
      Object.defineProperty(import.meta.env, 'DEV', {
        value: originalEnv,
        configurable: true
      })
    })
  })

  describe('iframe脱出機能のテスト', () => {
    test('本番環境ではトップレベルウィンドウへリダイレクトを試みる', () => {
      // 本番環境をモック
      const originalEnv = import.meta.env.DEV
      Object.defineProperty(import.meta.env, 'DEV', {
        value: false,
        configurable: true
      })
      
      // iframe内の状態をモック
      const mockLocation = { href: '' }
      const mockTop = { location: mockLocation }
      Object.defineProperty(window, 'top', { value: mockTop, writable: true })
      Object.defineProperty(window, 'self', { 
        value: { location: { href: 'https://example.com/game' } }, 
        writable: true 
      })
      
      frameDetector = FrameDetector.getInstance()
      
      // トップレベルウィンドウへのリダイレクトが試みられる
      expect(mockLocation.href).toBe('https://example.com/game')
      
      // 環境を戻す
      Object.defineProperty(import.meta.env, 'DEV', {
        value: originalEnv,
        configurable: true
      })
    })

    test('クロスオリジンの場合は警告を表示', () => {
      // 本番環境をモック
      const originalEnv = import.meta.env.DEV
      Object.defineProperty(import.meta.env, 'DEV', {
        value: false,
        configurable: true
      })
      
      // クロスオリジンiframeをモック
      Object.defineProperty(window, 'top', {
        get() { throw new Error('Blocked a frame with origin') },
        configurable: true
      })
      Object.defineProperty(window, 'self', { value: window, writable: true })
      
      // document.body.appendChildをモック
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => null as any)
      
      frameDetector = FrameDetector.getInstance()
      
      // 警告要素が追加される
      expect(appendChildSpy).toHaveBeenCalled()
      const warningElement = appendChildSpy.mock.calls[0][0] as HTMLElement
      expect(warningElement.innerHTML).toContain('セキュリティ警告')
      expect(warningElement.innerHTML).toContain('正規サイトで開く')
      
      // 環境を戻す
      Object.defineProperty(import.meta.env, 'DEV', {
        value: originalEnv,
        configurable: true
      })
    })
  })

  describe('定期チェック機能のテスト', () => {
    test('5秒ごとにフレームチェックが実行される', () => {
      frameDetector = FrameDetector.getInstance()
      
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000)
    })

    test('destroyメソッドでインターバルがクリアされる', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval')
      
      frameDetector = FrameDetector.getInstance()
      const intervalId = setIntervalSpy.mock.results[0].value
      
      frameDetector.destroy()
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(intervalId)
    })
  })

  describe('シングルトンパターンのテスト', () => {
    test('複数回getInstanceを呼んでも同じインスタンスが返される', () => {
      const instance1 = FrameDetector.getInstance()
      const instance2 = FrameDetector.getInstance()
      
      expect(instance1).toBe(instance2)
    })
  })
})