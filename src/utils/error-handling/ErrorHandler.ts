/**
 * 包括的エラーハンドリングシステム
 * あらゆるエラーを捕捉し、適切に処理する
 */

import { ErrorLogger } from './ErrorLogger'
import { ErrorReporter } from './ErrorReporter'
import { ErrorRecovery } from './ErrorRecovery'
import type { App } from 'vue'

export interface ErrorInfo {
  message: string
  stack?: string
  code?: string
  component?: string
  props?: Record<string, any>
  info?: string
  url?: string
  line?: number
  column?: number
  timestamp: number
  userAgent: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'vue' | 'javascript' | 'network' | 'async' | 'user' | 'system'
}

export interface ErrorHandlerOptions {
  enableLogging?: boolean
  enableReporting?: boolean
  enableRecovery?: boolean
  logToConsole?: boolean
  reportToServer?: boolean
  showUserNotification?: boolean
  maxErrorsPerMinute?: number
  recoveryStrategies?: Map<string, () => void>
}

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler
  private errorLogger: ErrorLogger
  private errorReporter: ErrorReporter
  private errorRecovery: ErrorRecovery
  private options: Required<ErrorHandlerOptions>
  private errorCount = 0
  private errorTimestamps: number[] = []
  private isInitialized = false

  private constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      enableLogging: true,
      enableReporting: true,
      enableRecovery: true,
      logToConsole: true,
      reportToServer: false,
      showUserNotification: true,
      maxErrorsPerMinute: 10,
      recoveryStrategies: new Map(),
      ...options
    }

    this.errorLogger = new ErrorLogger()
    this.errorReporter = new ErrorReporter()
    this.errorRecovery = new ErrorRecovery()
  }

  static getInstance(options?: ErrorHandlerOptions): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler(options)
    }
    return GlobalErrorHandler.instance
  }

  /**
   * Vueアプリケーションにエラーハンドラーを設定
   */
  setupVueErrorHandler(app: App): void {
    app.config.errorHandler = (error, instance, info) => {
      this.handleError({
        message: error.message || 'Unknown Vue error',
        stack: error.stack,
        component: instance?.$options.name || 'Unknown',
        props: instance?.$props,
        info,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        severity: this.determineSeverity(error),
        category: 'vue'
      })
    }

    // Vue警告ハンドラー
    app.config.warnHandler = (msg, instance, trace) => {
      if (this.options.logToConsole) {
        console.warn(`Vue warning: ${msg}\nTrace: ${trace}`)
      }
      this.errorLogger.logWarning({
        message: msg,
        component: instance?.$options.name || 'Unknown',
        trace,
        timestamp: Date.now()
      })
    }
  }

  /**
   * グローバルエラーハンドラーを設定
   */
  setupGlobalHandlers(): void {
    if (this.isInitialized) {
      console.warn('GlobalErrorHandler is already initialized')
      return
    }

    // window.onerrorハンドラー
    window.onerror = (message, source, lineno, colno, error) => {
      this.handleError({
        message: typeof message === 'string' ? message : 'Unknown error',
        stack: error?.stack,
        url: source,
        line: lineno,
        column: colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        severity: this.determineSeverity(error),
        category: 'javascript'
      })
      return true // エラーの伝播を防ぐ
    }

    // unhandledrejectionハンドラー
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        message: `Unhandled Promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        severity: 'high',
        category: 'async'
      })
      event.preventDefault()
    })

    // ネットワークエラーの監視
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource' && 
              'responseStatus' in entry && 
              (entry as any).responseStatus >= 400) {
            this.handleError({
              message: `Network error: ${(entry as any).name}`,
              url: (entry as any).name,
              timestamp: Date.now(),
              userAgent: navigator.userAgent,
              severity: 'medium',
              category: 'network'
            })
          }
        }
      })
      
      try {
        observer.observe({ entryTypes: ['resource'] })
      } catch (e) {
        // PerformanceObserverがサポートされていない場合は無視
      }
    }

    this.isInitialized = true
  }

  /**
   * エラーを処理する中核メソッド
   */
  handleError(errorInfo: ErrorInfo): void {
    // レート制限チェック
    if (!this.checkRateLimit()) {
      console.error('Error rate limit exceeded')
      return
    }

    this.errorCount++

    // ログ記録
    if (this.options.enableLogging) {
      this.errorLogger.log(errorInfo)
      if (this.options.logToConsole) {
        console.error('Error caught:', errorInfo)
      }
    }

    // エラー報告
    if (this.options.enableReporting && this.options.reportToServer) {
      this.errorReporter.report(errorInfo)
    }

    // リカバリー試行
    if (this.options.enableRecovery) {
      this.errorRecovery.tryRecover(errorInfo)
    }

    // ユーザー通知
    if (this.options.showUserNotification && errorInfo.severity !== 'low') {
      this.notifyUser(errorInfo)
    }
  }

  /**
   * エラーの深刻度を判定
   */
  private determineSeverity(error: any): ErrorInfo['severity'] {
    if (!error) return 'low'

    const message = error.message || error.toString()
    
    // 致命的なエラーパターン
    if (
      message.includes('Cannot read') ||
      message.includes('Cannot access') ||
      message.includes('is not defined') ||
      message.includes('Maximum call stack')
    ) {
      return 'critical'
    }

    // 高優先度エラーパターン
    if (
      message.includes('Network') ||
      message.includes('Failed to fetch') ||
      message.includes('Promise rejection')
    ) {
      return 'high'
    }

    // 中優先度エラーパターン
    if (
      message.includes('Warning') ||
      message.includes('Deprecated')
    ) {
      return 'medium'
    }

    return 'low'
  }

  /**
   * レート制限チェック
   */
  private checkRateLimit(): boolean {
    const now = Date.now()
    const oneMinuteAgo = now - 60000

    // 1分以上前のタイムスタンプを削除
    this.errorTimestamps = this.errorTimestamps.filter(ts => ts > oneMinuteAgo)
    
    if (this.errorTimestamps.length >= this.options.maxErrorsPerMinute) {
      return false
    }

    this.errorTimestamps.push(now)
    return true
  }

  /**
   * ユーザーへの通知
   */
  private notifyUser(errorInfo: ErrorInfo): void {
    // エラーの種類に応じたメッセージを生成
    let userMessage = 'エラーが発生しました'
    
    switch (errorInfo.category) {
      case 'network':
        userMessage = 'ネットワーク接続に問題が発生しました'
        break
      case 'async':
        userMessage = '処理中にエラーが発生しました'
        break
      case 'vue':
        userMessage = '画面の表示でエラーが発生しました'
        break
      default:
        userMessage = '予期しないエラーが発生しました'
    }

    // 実際の通知実装（後でUIコンポーネントと連携）
    this.showErrorNotification(userMessage, errorInfo.severity)
  }

  /**
   * エラー通知を表示（UIコンポーネントと連携予定）
   */
  private showErrorNotification(message: string, severity: ErrorInfo['severity']): void {
    // 一時的にconsoleに出力
    console.warn(`[User Notification] ${severity.toUpperCase()}: ${message}`)
    
    // TODO: 実際のUI通知コンポーネントと連携
    const event = new CustomEvent('app:error', {
      detail: { message, severity }
    })
    window.dispatchEvent(event)
  }

  /**
   * エラー統計の取得
   */
  getErrorStats() {
    return {
      totalErrors: this.errorCount,
      recentErrors: this.errorTimestamps.length,
      logs: this.errorLogger.getLogs(),
      isHealthy: this.errorTimestamps.length < this.options.maxErrorsPerMinute / 2
    }
  }

  /**
   * エラーハンドラーのリセット
   */
  reset(): void {
    this.errorCount = 0
    this.errorTimestamps = []
    this.errorLogger.clear()
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    window.onerror = null
    this.reset()
    this.isInitialized = false
  }
}