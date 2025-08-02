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
  category: 'vue' | 'javascript' | 'network' | 'async' | 'user' | 'system' | 'performance' | 'security' | 'game'
  context?: {
    userId?: string
    sessionId?: string
    gameState?: string
    route?: string
    action?: string
    deviceInfo?: {
      isMobile: boolean
      screenSize: string
      connection?: string
    }
  }
  fingerprint?: string
  tags?: string[]
  breadcrumbs?: Array<{
    timestamp: number
    category: string
    message: string
    data?: Record<string, any>
  }>
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
  private readonly errorLogger: ErrorLogger
  private readonly errorReporter: ErrorReporter
  private readonly errorRecovery: ErrorRecovery
  private readonly options: Required<ErrorHandlerOptions>
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
      const messageStr = typeof message === 'string' ? message : 'Unknown error'
      
      // Phaserの既知の問題をフィルタリング
      if (messageStr.includes('setMaxTextures is not a function')) {
        if (import.meta.env.DEV) {
          console.warn('[ErrorHandler] Phaserの既知の問題 (setMaxTextures) - 無視します:', messageStr)
        }
        return true // エラーを無視
      }
      
      this.handleError({
        message: messageStr,
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
      const reason = String(event.reason)
      
      // Phaserの既知の問題をフィルタリング
      if (reason.includes('setMaxTextures is not a function')) {
        if (import.meta.env.DEV) {
          console.warn('[ErrorHandler] Phaserの既知の問題 (Promise rejection) - 無視します:', reason)
        }
        event.preventDefault()
        return
      }
      
      this.handleError({
        message: `Unhandled Promise rejection: ${reason}`,
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
    // エラーの前処理と拡張
    const enhancedErrorInfo = this.enhanceErrorInfo(errorInfo)
    
    // レート制限チェック
    if (!this.checkRateLimit()) {
      console.error('Error rate limit exceeded')
      return
    }

    this.errorCount++

    // エラーフィンガープリントの生成
    enhancedErrorInfo.fingerprint = this.generateFingerprint(enhancedErrorInfo)
    
    // 重複エラーのチェック
    if (this.isDuplicateError(enhancedErrorInfo)) {
      console.log('Duplicate error detected, skipping notification')
      // ログには記録するが通知はスキップ
      if (this.options.enableLogging) {
        this.errorLogger.log(enhancedErrorInfo)
      }
      return
    }

    // ログ記録
    if (this.options.enableLogging) {
      this.errorLogger.log(enhancedErrorInfo)
      if (this.options.logToConsole) {
        this.logStructuredError(enhancedErrorInfo)
      }
    }

    // エラー報告
    if (this.options.enableReporting && this.options.reportToServer) {
      this.errorReporter.report(enhancedErrorInfo)
    }

    // リカバリー試行（高度なリカバリーを使用）
    if (this.options.enableRecovery) {
      this.errorRecovery.tryAdvancedRecover(enhancedErrorInfo)
        .then(result => {
          // リカバリー結果をイベントとして発火
          const recoveryEvent = new CustomEvent('app:recovery-result', {
            detail: {
              success: result.success,
              strategy: result.strategyUsed,
              attempts: result.attemptsCount,
              errorId: enhancedErrorInfo.fingerprint
            }
          })
          window.dispatchEvent(recoveryEvent)
          
          if (result.success) {
            console.log(`[ErrorHandler] Auto-recovery successful using ${result.strategyUsed}`)
            
            // 成功した復旧を通知
            const successEvent = new CustomEvent('app:error', {
              detail: {
                message: `エラーから自動復旧しました (${result.strategyUsed})`,
                severity: 'info',
                category: 'system',
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                context: {
                  originalError: enhancedErrorInfo.fingerprint,
                  recoveryStrategy: result.strategyUsed
                }
              } as ErrorInfo
            })
            window.dispatchEvent(successEvent)
          }
        })
        .catch(error => {
          console.error('[ErrorHandler] Recovery failed:', error)
          
          // 復旧失敗を記録
          this.handleError({
            message: `Recovery system failure: ${error.message}`,
            stack: error.stack,
            category: 'system',
            severity: 'high',
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            context: {
              originalError: enhancedErrorInfo.fingerprint,
              recoveryError: true
            }
          })
        })
    }

    // ユーザー通知
    if (this.options.showUserNotification && enhancedErrorInfo.severity !== 'low') {
      this.notifyUser(enhancedErrorInfo)
    }

    // パフォーマンス監視
    this.trackErrorPerformance(enhancedErrorInfo)
  }

  /**
   * エラーの深刻度を判定
   */
  private determineSeverity(error: any): ErrorInfo['severity'] {
    if (!error) return 'low'

    const message = error.message || error.toString()
    const stack = error.stack || ''
    
    // 致命的なエラーパターン（システム停止レベル）
    if (
      message.includes('Cannot read property') ||
      message.includes('Cannot access before initialization') ||
      message.includes('is not defined') ||
      message.includes('Maximum call stack') ||
      message.includes('Out of memory') ||
      message.includes('Script error') ||
      message.includes('ChunkLoadError') ||
      stack.includes('at Object.exports') ||
      (error.name === 'TypeError' && message.includes('null'))
    ) {
      return 'critical'
    }

    // 高優先度エラーパターン（機能停止レベル）
    if (
      message.includes('Network error') ||
      message.includes('Failed to fetch') ||
      message.includes('Promise rejection') ||
      message.includes('Timeout') ||
      message.includes('CORS') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('500') ||
      message.includes('Game state') ||
      message.includes('Save failed') ||
      error.name === 'SecurityError'
    ) {
      return 'high'
    }

    // 中優先度エラーパターン（体験劣化レベル）
    if (
      message.includes('Warning') ||
      message.includes('Deprecated') ||
      message.includes('Performance') ||
      message.includes('Slow') ||
      message.includes('404') ||
      message.includes('Render') ||
      message.includes('Animation')
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
   * エラー情報を拡張
   */
  private enhanceErrorInfo(errorInfo: ErrorInfo): ErrorInfo {
    // コンテキスト情報の自動収集
    const context = {
      ...errorInfo.context,
      route: window.location.pathname,
      deviceInfo: {
        isMobile: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent),
        screenSize: `${window.screen.width}x${window.screen.height}`,
        connection: (navigator as any).connection?.effectiveType || 'unknown'
      }
    }

    // タグの自動生成
    const tags = [
      ...errorInfo.tags || [],
      errorInfo.category,
      errorInfo.severity,
      context.deviceInfo.isMobile ? 'mobile' : 'desktop'
    ]

    // ブレッドクラムの追加（現在のアクション）
    const breadcrumbs = [
      ...errorInfo.breadcrumbs || [],
      {
        timestamp: Date.now(),
        category: 'error',
        message: 'Error captured by handler',
        data: { component: errorInfo.component }
      }
    ]

    return {
      ...errorInfo,
      context,
      tags,
      breadcrumbs
    }
  }

  /**
   * エラーフィンガープリントを生成
   */
  private generateFingerprint(errorInfo: ErrorInfo): string {
    const key = [
      errorInfo.message,
      errorInfo.component || 'unknown',
      errorInfo.category,
      errorInfo.context?.route || 'unknown'
    ].join('|')
    
    // 簡易ハッシュ関数
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit整数に変換
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 重複エラーのチェック
   */
  private readonly duplicateErrors = new Map<string, number>()
  private isDuplicateError(errorInfo: ErrorInfo): boolean {
    if (!errorInfo.fingerprint) return false
    
    const now = Date.now()
    const lastSeen = this.duplicateErrors.get(errorInfo.fingerprint) || 0
    const timeDiff = now - lastSeen
    
    // 同じエラーが1分以内に発生した場合は重複とみなす
    if (timeDiff < 60000) {
      return true
    }
    
    this.duplicateErrors.set(errorInfo.fingerprint, now)
    return false
  }

  /**
   * 構造化されたエラーログ出力
   */
  private logStructuredError(errorInfo: ErrorInfo): void {
    const logData = {
      message: errorInfo.message,
      severity: errorInfo.severity,
      category: errorInfo.category,
      component: errorInfo.component,
      fingerprint: errorInfo.fingerprint,
      context: errorInfo.context,
      tags: errorInfo.tags,
      timestamp: new Date(errorInfo.timestamp).toISOString()
    }

    console.group(`🚨 [${errorInfo.severity.toUpperCase()}] ${errorInfo.category}`)
    console.error('Message:', errorInfo.message)
    console.log('Data:', logData)
    if (errorInfo.stack) {
      console.log('Stack:', errorInfo.stack)
    }
    console.groupEnd()
  }

  /**
   * エラーパフォーマンスの追跡
   */
  private errorPerformanceHistory: Array<{ timestamp: number; severity: string }> = []
  private trackErrorPerformance(errorInfo: ErrorInfo): void {
    this.errorPerformanceHistory.push({
      timestamp: Date.now(),
      severity: errorInfo.severity
    })

    // 1時間以上前のデータを削除
    const oneHourAgo = Date.now() - 3600000
    this.errorPerformanceHistory = this.errorPerformanceHistory.filter(
      entry => entry.timestamp > oneHourAgo
    )

    // アラート条件のチェック
    const recentCriticalErrors = this.errorPerformanceHistory.filter(
      entry => entry.severity === 'critical' && entry.timestamp > Date.now() - 300000 // 5分以内
    ).length

    if (recentCriticalErrors >= 3) {
      this.triggerSystemAlert('Multiple critical errors detected')
    }
  }

  /**
   * システムアラートをトリガー
   */
  private triggerSystemAlert(message: string): void {
    console.error(`🚀 SYSTEM ALERT: ${message}`)
    
    // カスタムイベントを発火
    const event = new CustomEvent('app:system-alert', {
      detail: { message, timestamp: Date.now() }
    })
    window.dispatchEvent(event)
  }

  /**
   * ブレッドクラムを追加
   */
  addBreadcrumb(category: string, message: string, data?: Record<string, any>): void {
    // 将来的にグローバルなブレッドクラム管理を実装予定
    console.log(`[Breadcrumb] ${category}: ${message}`, data)
  }

  /**
   * エラーハンドラーの健全性チェック
   */
  getHealthStatus() {
    const recentErrors = this.errorTimestamps.filter(
      ts => ts > Date.now() - 300000 // 5分以内
    ).length

    const criticalErrorsRecent = this.errorPerformanceHistory.filter(
      entry => entry.severity === 'critical' && entry.timestamp > Date.now() - 300000
    ).length

    return {
      isHealthy: recentErrors < this.options.maxErrorsPerMinute / 2 && criticalErrorsRecent === 0,
      recentErrorCount: recentErrors,
      criticalErrorCount: criticalErrorsRecent,
      totalErrors: this.errorCount,
      rateLimit: {
        current: this.errorTimestamps.length,
        max: this.options.maxErrorsPerMinute
      }
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    window.onerror = null
    window.removeEventListener('unhandledrejection', () => {})
    this.duplicateErrors.clear()
    this.errorPerformanceHistory = []
    this.reset()
    this.isInitialized = false
  }
}