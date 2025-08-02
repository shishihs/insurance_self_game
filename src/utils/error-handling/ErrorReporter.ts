/**
 * エラーレポートシステム
 * エラーを外部サービスに報告し、監視を可能にする
 */

import type { ErrorInfo } from './ErrorHandler'

export interface ReportOptions {
  endpoint?: string
  apiKey?: string
  environment?: 'development' | 'staging' | 'production'
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
}

export interface ErrorReport {
  errorInfo: ErrorInfo
  environment: string
  browser: {
    name: string
    version: string
    platform: string
  }
  screen: {
    width: number
    height: number
    pixelRatio: number
  }
  memory?: {
    used: number
    total: number
    limit: number
  }
  sessionInfo: {
    id: string
    startTime: number
    duration: number
    pageViews: number
  }
  userId?: string
  metadata?: Record<string, any>
}

export class ErrorReporter {
  private readonly options: Required<ReportOptions>
  private queue: ErrorReport[] = []
  private isReporting = false
  private readonly sessionId: string
  private readonly sessionStartTime: number
  private pageViews = 0
  private reportInterval: number | null = null
  private readonly maxQueueSize = 50
  private readonly batchSize = 10

  constructor(options: ReportOptions = {}) {
    this.options = {
      endpoint: import.meta.env.VITE_ERROR_REPORT_ENDPOINT || '',
      apiKey: import.meta.env.VITE_ERROR_REPORT_API_KEY || '',
      environment: (import.meta.env.MODE as any) || 'development',
      userId: '',
      sessionId: this.generateSessionId(),
      metadata: {},
      ...options
    }

    this.sessionId = this.options.sessionId
    this.sessionStartTime = Date.now()
    
    // ページビューのトラッキング
    this.trackPageView()
    
    // バッチ報告の設定
    if (this.options.endpoint) {
      this.startBatchReporting()
    }
  }

  /**
   * エラーを報告キューに追加
   */
  report(errorInfo: ErrorInfo, additionalData?: Record<string, any>): void {
    // 開発環境では報告しない（オプション）
    if (this.options.environment === 'development' && !import.meta.env.VITE_FORCE_ERROR_REPORTING) {
      console.log('[ErrorReporter] Skipping report in development environment')
      return
    }

    const report: ErrorReport = {
      errorInfo,
      environment: this.options.environment,
      browser: this.getBrowserInfo(),
      screen: this.getScreenInfo(),
      memory: this.getMemoryInfo(),
      sessionInfo: {
        id: this.sessionId,
        startTime: this.sessionStartTime,
        duration: Date.now() - this.sessionStartTime,
        pageViews: this.pageViews
      },
      userId: this.options.userId,
      metadata: {
        ...this.options.metadata,
        ...additionalData
      }
    }

    // キューに追加
    this.queue.push(report)
    
    // キューサイズ制限
    if (this.queue.length > this.maxQueueSize) {
      this.queue = this.queue.slice(-this.maxQueueSize)
    }

    // 緊急度が高いエラーは即座に報告
    if (errorInfo.severity === 'critical') {
      this.flushQueue()
    }
  }

  /**
   * 報告キューを送信
   */
  async flushQueue(): Promise<void> {
    if (this.isReporting || this.queue.length === 0 || !this.options.endpoint) {
      return
    }

    this.isReporting = true
    
    try {
      // バッチごとに送信
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize)
        await this.sendBatch(batch)
      }
    } catch (error) {
      console.error('[ErrorReporter] Failed to send error reports:', error)
      // 失敗したバッチは破棄（無限ループを防ぐため）
    } finally {
      this.isReporting = false
    }
  }

  /**
   * バッチを送信
   */
  private async sendBatch(batch: ErrorReport[]): Promise<void> {
    const payload = {
      reports: batch,
      timestamp: Date.now(),
      apiKey: this.options.apiKey
    }

    const response = await fetch(this.options.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.options.apiKey
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Failed to send error reports: ${response.statusText}`)
    }
  }

  /**
   * ブラウザ情報を取得
   */
  private getBrowserInfo() {
    const ua = navigator.userAgent
    const browser = {
      name: 'Unknown',
      version: 'Unknown',
      platform: navigator.platform || 'Unknown'
    }

    // 簡易的なブラウザ判定
    if (ua.includes('Chrome')) {
      browser.name = 'Chrome'
      const match = ua.match(/Chrome\/(\d+)/)
      if (match) browser.version = match[1]
    } else if (ua.includes('Firefox')) {
      browser.name = 'Firefox'
      const match = ua.match(/Firefox\/(\d+)/)
      if (match) browser.version = match[1]
    } else if (ua.includes('Safari')) {
      browser.name = 'Safari'
      const match = ua.match(/Version\/(\d+)/)
      if (match) browser.version = match[1]
    } else if (ua.includes('Edge')) {
      browser.name = 'Edge'
      const match = ua.match(/Edge\/(\d+)/)
      if (match) browser.version = match[1]
    }

    return browser
  }

  /**
   * スクリーン情報を取得
   */
  private getScreenInfo() {
    return {
      width: window.screen.width,
      height: window.screen.height,
      pixelRatio: window.devicePixelRatio || 1
    }
  }

  /**
   * メモリ情報を取得（Chrome限定）
   */
  private getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    }
    return undefined
  }

  /**
   * ページビューをトラッキング
   */
  private trackPageView(): void {
    this.pageViews++
    
    // SPAのルート変更を検知
    const pushState = history.pushState
    history.pushState = (...args) => {
      this.pageViews++
      pushState.apply(history, args);
    }
  }

  /**
   * バッチ報告を開始
   */
  private startBatchReporting(): void {
    // 30秒ごとにキューを送信
    this.reportInterval = window.setInterval(() => {
      this.flushQueue()
    }, 30000)

    // ページ離脱時にキューを送信
    window.addEventListener('beforeunload', () => {
      this.flushQueue()
    })
    
    // ページ非表示時にキューを送信
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushQueue()
      }
    })
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * ユーザーIDを設定
   */
  setUserId(userId: string): void {
    this.options.userId = userId
  }

  /**
   * メタデータを更新
   */
  updateMetadata(metadata: Record<string, any>): void {
    this.options.metadata = {
      ...this.options.metadata,
      ...metadata
    }
  }

  /**
   * レポート統計を取得
   */
  getStats() {
    return {
      queueSize: this.queue.length,
      sessionDuration: Date.now() - this.sessionStartTime,
      pageViews: this.pageViews,
      isReporting: this.isReporting
    }
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.reportInterval) {
      clearInterval(this.reportInterval)
      this.reportInterval = null
    }
    
    // 残りのキューを送信
    this.flushQueue()
  }
}