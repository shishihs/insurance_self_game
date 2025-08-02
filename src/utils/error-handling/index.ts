/**
 * エラーハンドリングシステムの統合エクスポート
 * アプリケーション全体でのエラーハンドリングを統一管理
 */

import { type ErrorHandlerOptions, type ErrorInfo, GlobalErrorHandler } from './ErrorHandler'
import { ErrorLogger, type LogEntry } from './ErrorLogger'
import { ErrorRecovery } from './ErrorRecovery'
import { ErrorReporter } from './ErrorReporter'
import { AsyncQueue, safeAsync, safeAsyncAll, withAsyncErrorHandler } from './AsyncErrorHandler'
import { userFriendlyMessages, type UserMessage } from './UserFriendlyMessages'
import { type CollectionOptions, type DebugInfo, getDebugInfoCollector } from './DebugInfoCollector'
import type { App } from 'vue'

export {
  GlobalErrorHandler,
  ErrorLogger,
  ErrorRecovery,
  ErrorReporter,
  safeAsync,
  safeAsyncAll,
  withAsyncErrorHandler,
  AsyncQueue,
  userFriendlyMessages,
  getDebugInfoCollector
}

export type {
  ErrorInfo,
  ErrorHandlerOptions,
  LogEntry,
  UserMessage,
  DebugInfo,
  CollectionOptions
}

/**
 * エラーハンドリングシステムの初期化オプション
 */
export interface ErrorHandlingConfig {
  // 基本設定
  enableLogging?: boolean
  enableReporting?: boolean
  enableRecovery?: boolean
  enableUserNotifications?: boolean
  
  // 詳細設定
  maxErrorsPerMinute?: number
  logToConsole?: boolean
  reportToServer?: boolean
  
  // サーバーレポート設定
  reportEndpoint?: string
  reportApiKey?: string
  
  // 環境設定
  environment?: 'development' | 'staging' | 'production'
  userId?: string
  buildVersion?: string
  
  // カスタムコールバック
  onError?: (errorInfo: ErrorInfo) => void
  onRecovery?: (success: boolean, strategy?: string) => void
  onAlert?: (type: string, data: any) => void
}

/**
 * グローバルエラーハンドリングシステム
 */
class ErrorHandlingSystem {
  private globalHandler?: GlobalErrorHandler
  private isInitialized = false
  private config: ErrorHandlingConfig = {}
  private debugCollector?: ReturnType<typeof getDebugInfoCollector>
  
  /**
   * システムを初期化
   */
  initialize(config: ErrorHandlingConfig = {}): void {
    if (this.isInitialized) {
      console.warn('[ErrorHandlingSystem] Already initialized')
      return
    }
    
    this.config = {
      enableLogging: true,
      enableReporting: true,
      enableRecovery: true,
      enableUserNotifications: true,
      maxErrorsPerMinute: 10,
      logToConsole: import.meta.env.DEV,
      reportToServer: import.meta.env.PROD,
      environment: (import.meta.env.MODE as any) || 'development',
      ...config
    }
    
    // グローバルハンドラーの初期化
    this.globalHandler = GlobalErrorHandler.getInstance({
      enableLogging: this.config.enableLogging,
      enableReporting: this.config.enableReporting,
      enableRecovery: this.config.enableRecovery,
      logToConsole: this.config.logToConsole,
      reportToServer: this.config.reportToServer,
      showUserNotification: this.config.enableUserNotifications,
      maxErrorsPerMinute: this.config.maxErrorsPerMinute
    })
    
    // グローバルハンドラーの設定
    this.globalHandler.setupGlobalHandlers()
    
    // デバッグ情報コレクターの初期化
    this.debugCollector = getDebugInfoCollector(
      this.generateSessionId(),
      this.config.buildVersion,
      this.config.environment
    )
    
    // ユーザーIDの設定
    if (this.config.userId) {
      this.setUserId(this.config.userId)
    }
    
    // イベントリスナーの設定
    this.setupEventListeners()
    
    this.isInitialized = true
    
    console.log('[ErrorHandlingSystem] Initialized successfully', {
      config: this.config,
      environment: this.config.environment
    })
  }
  
  /**
   * Vueアプリケーションに統合
   */
  integrateWithVue(app: App): void {
    if (!this.globalHandler) {
      throw new Error('ErrorHandlingSystem must be initialized before Vue integration')
    }
    
    this.globalHandler.setupVueErrorHandler(app)
    
    // Vue DevToolsの統合（開発環境のみ）
    if (import.meta.env.DEV && (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__) {
      this.setupVueDevToolsIntegration()
    }
  }
  
  /**
   * ユーザーIDを設定
   */
  setUserId(userId: string): void {
    this.config.userId = userId
    
    if (this.globalHandler) {
      // エラーレポーターにユーザーIDを設定
      // 注意: これは内部APIなので、将来的に変更される可能性があります
      try {
        (this.globalHandler as any).errorReporter.setUserId(userId)
        (this.globalHandler as any).errorLogger.setUserId(userId)
      } catch (error) {
        console.warn('[ErrorHandlingSystem] Failed to set user ID:', error)
      }
    }
  }
  
  /**
   * 手動でエラーを報告
   */
  reportError(error: Error | string, context?: Record<string, any>, category: ErrorInfo['category'] = 'user'): void {
    if (!this.globalHandler) {
      console.error('[ErrorHandlingSystem] Not initialized')
      return
    }
    
    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      category,
      severity: 'medium',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      context: {
        ...context,
        source: 'manual-report',
        userId: this.config.userId
      }
    }
    
    this.globalHandler.handleError(errorInfo)
  }
  
  /**
   * カスタムエラーパターンを追加
   */
  addErrorPattern(pattern: any): void {
    userFriendlyMessages.addPattern(pattern)
  }
  
  /**
   * システムの健全性を取得
   */
  getHealthStatus() {
    if (!this.globalHandler) {
      return { isHealthy: false, error: 'Not initialized' }
    }
    
    return this.globalHandler.getHealthStatus()
  }
  
  /**
   * エラー統計を取得
   */
  getStatistics() {
    if (!this.globalHandler) {
      return null
    }
    
    return this.globalHandler.getErrorStats()
  }
  
  /**
   * リアルタイムエラー監視リスナーを追加
   */
  addErrorListener(listener: (errorInfo: ErrorInfo) => void): () => void {
    const handler = (event: CustomEvent) => {
      listener(event.detail)
    }
    
    window.addEventListener('app:error', handler as EventListener)
    
    return () => {
      window.removeEventListener('app:error', handler as EventListener)
    }
  }
  
  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // エラーアラートリスナー
    window.addEventListener('app:error-alert', (event: CustomEvent) => {
      if (this.config.onAlert) {
        this.config.onAlert(event.detail.type, event.detail.data)
      }
    })
    
    // システムアラートリスナー
    window.addEventListener('app:system-alert', (event: CustomEvent) => {
      console.error(`🚨 SYSTEM ALERT: ${event.detail.message}`)
      
      if (this.config.onAlert) {
        this.config.onAlert('system-alert', event.detail)
      }
    })
    
    // リカバリー結果リスナー
    window.addEventListener('app:recovery-result', (event: CustomEvent) => {
      if (this.config.onRecovery) {
        this.config.onRecovery(event.detail.success, event.detail.strategy)
      }
    })
    
    // パフォーマンス問題の検出
    this.setupPerformanceMonitoring()
  }
  
  /**
   * Vue DevToolsとの統合を設定
   */
  private setupVueDevToolsIntegration(): void {
    const devtools = (window as any).__VUE_DEVTOOLS_GLOBAL_HOOK__
    
    // エラー情報をDevToolsに送信
    this.addErrorListener((errorInfo) => {
      devtools.emit('app:error', {
        type: 'error',
        payload: {
          error: errorInfo,
          timestamp: Date.now()
        }
      })
    })
  }
  
  /**
   * パフォーマンス監視を設定
   */
  private setupPerformanceMonitoring(): void {
    // メモリ使用量の監視
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        const used = memory.usedJSHeapSize
        const limit = memory.jsHeapSizeLimit
        
        // メモリ使用量が80%を超えた場合
        if (used / limit > 0.8) {
          this.reportError('High memory usage detected', {
            memoryUsed: used,
            memoryLimit: limit,
            percentage: Math.round((used / limit) * 100)
          }, 'performance')
        }
      }, 30000) // 30秒ごと
    }
    
    // 長時間のタスクの検出
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // 50ms以上のタスク
              this.reportError('Long task detected', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              }, 'performance')
            }
          }
        })
        
        observer.observe({ entryTypes: ['longtask'] })
      } catch (error) {
        console.warn('[ErrorHandlingSystem] Long task monitoring not supported:', error)
      }
    }
  }
  
  /**
   * デバッグ情報を収集
   */
  collectDebugInfo(options?: CollectionOptions): DebugInfo | Record<string, any> {
    if (this.debugCollector) {
      try {
        return this.debugCollector.collect(options)
      } catch (error) {
        console.error('[ErrorHandlingSystem] Failed to collect debug info:', error)
      }
    }
    
    // フォールバック: 基本的な情報のみ
    const debugInfo: Record<string, any> = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      config: this.config,
      isInitialized: this.isInitialized
    }
    
    // メモリ情報
    if ('memory' in performance) {
      debugInfo.memory = (performance as any).memory
    }
    
    // 接続情報
    if ('connection' in navigator) {
      debugInfo.connection = (navigator as any).connection
    }
    
    // タイミング情報
    debugInfo.timing = performance.timing
    
    // エラー統計
    if (this.globalHandler) {
      debugInfo.errorStats = this.getStatistics()
      debugInfo.healthStatus = this.getHealthStatus()
    }
    
    return debugInfo
  }
  
  /**
   * ゲーム状態プロバイダーを設定
   */
  setGameStateProvider(provider: () => string): void {
    if (this.debugCollector) {
      this.debugCollector.setGameStateProvider(provider)
    }
  }
  
  /**
   * コンポーネントプロバイダーを設定
   */
  setComponentProvider(provider: () => string): void {
    if (this.debugCollector) {
      this.debugCollector.setComponentProvider(provider)
    }
  }
  
  /**
   * アクティブ機能プロバイダーを設定
   */
  setFeatureProvider(provider: () => string[]): void {
    if (this.debugCollector) {
      this.debugCollector.setFeatureProvider(provider)
    }
  }
  
  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  /**
   * システムをクリーンアップ
   */
  destroy(): void {
    if (this.globalHandler) {
      this.globalHandler.destroy()
      this.globalHandler = undefined
    }
    
    this.isInitialized = false
    console.log('[ErrorHandlingSystem] Destroyed')
  }
}

/**
 * グローバルエラーハンドリングシステムのシングルトンインスタンス
 */
export const errorHandlingSystem = new ErrorHandlingSystem()

/**
 * Vue プラグインとしてのエラーハンドリング統合
 */
export const ErrorHandlingPlugin = {
  install(app: App, options: ErrorHandlingConfig = {}) {
    // システムを初期化
    errorHandlingSystem.initialize(options)
    
    // Vueアプリケーションと統合
    errorHandlingSystem.integrateWithVue(app)
    
    // グローバルプロパティとして利用可能にする
    app.config.globalProperties.$errorHandling = {
      reportError: errorHandlingSystem.reportError.bind(errorHandlingSystem),
      getHealth: errorHandlingSystem.getHealthStatus.bind(errorHandlingSystem),
      getStats: errorHandlingSystem.getStatistics.bind(errorHandlingSystem),
      collectDebugInfo: errorHandlingSystem.collectDebugInfo.bind(errorHandlingSystem)
    }
    
    // Provide/Injectでも利用可能にする
    app.provide('errorHandling', errorHandlingSystem)
  }
}

/**
 * Composable for Vue 3
 */
export function useErrorHandling() {
  return {
    reportError: errorHandlingSystem.reportError.bind(errorHandlingSystem),
    getHealthStatus: errorHandlingSystem.getHealthStatus.bind(errorHandlingSystem),
    getStatistics: errorHandlingSystem.getStatistics.bind(errorHandlingSystem),
    addErrorListener: errorHandlingSystem.addErrorListener.bind(errorHandlingSystem),
    collectDebugInfo: errorHandlingSystem.collectDebugInfo.bind(errorHandlingSystem),
    setGameStateProvider: errorHandlingSystem.setGameStateProvider.bind(errorHandlingSystem),
    setComponentProvider: errorHandlingSystem.setComponentProvider.bind(errorHandlingSystem),
    setFeatureProvider: errorHandlingSystem.setFeatureProvider.bind(errorHandlingSystem)
  }
}

// デフォルトエクスポート（後方互換性のため）
export default errorHandlingSystem