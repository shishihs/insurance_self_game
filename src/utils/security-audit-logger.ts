/**
 * セキュリティ監査ログシステム
 * 包括的なセキュリティイベント追跡・分析・レポート機能
 */

import { generateSecureHash, secureLocalStorage } from './security'
import { SecurityMonitor } from './security-extensions'

export interface SecurityAuditEvent {
  id: string
  timestamp: Date
  eventType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
  message: string
  metadata: Record<string, any>
  userAgent: string
  ipAddress?: string
  sessionId?: string
  userId?: string
  stackTrace?: string
  hash: string // イベントの整合性検証用
}

export interface SecurityAuditFilter {
  startDate?: Date
  endDate?: Date
  eventTypes?: string[]
  severities?: string[]
  sources?: string[]
  searchTerm?: string
}

export interface SecurityAuditReport {
  generatedAt: Date
  period: { start: Date; end: Date }
  summary: {
    totalEvents: number
    criticalEvents: number
    highSeverityEvents: number
    mediumSeverityEvents: number
    lowSeverityEvents: number
    uniqueEventTypes: number
    uniqueSources: number
  }
  topEventTypes: Array<{ type: string; count: number }>
  topSources: Array<{ source: string; count: number }>
  severityTrend: Array<{ date: string; critical: number; high: number; medium: number; low: number }>
  recommendations: string[]
  events: SecurityAuditEvent[]
}

/**
 * セキュリティ監査ログシステム
 */
export class SecurityAuditLogger {
  private static instance: SecurityAuditLogger
  private readonly storage = secureLocalStorage()
  private eventQueue: SecurityAuditEvent[] = []
  private isProcessingQueue = false
  private readonly maxEventsInMemory = 1000
  private readonly maxEventsInStorage = 5000
  private readonly sessionId: string
  private config = {
    enableStackTrace: true,
    enableGeoLocation: false,
    enablePerformanceMetrics: true,
    autoFlushInterval: 30000, // 30秒に変更（レート制限緩和）
    compressionThreshold: 200 // 200イベント以上で圧縮（閾値を上げる）
  }

  private constructor() {
    this.sessionId = this.generateSessionId()
    this.startAutoFlush()
    this.setupUnloadHandler()
  }

  static getInstance(): SecurityAuditLogger {
    if (!SecurityAuditLogger.instance) {
      SecurityAuditLogger.instance = new SecurityAuditLogger()
    }
    return SecurityAuditLogger.instance
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `session_${timestamp}_${random}`
  }

  /**
   * セキュリティイベントをログに記録
   */
  async logSecurityEvent(
    eventType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    source: string,
    message: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const event: SecurityAuditEvent = {
        id: await this.generateEventId(),
        timestamp: new Date(),
        eventType,
        severity,
        source,
        message,
        metadata: {
          ...metadata,
          url: window.location.href,
          referrer: document.referrer,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight
          },
          ...(this.config.enablePerformanceMetrics && this.getPerformanceMetrics())
        },
        userAgent: navigator.userAgent,
        sessionId: this.sessionId,
        stackTrace: this.config.enableStackTrace ? this.captureStackTrace() : undefined,
        hash: '' // 後で計算
      }

      // イベントのハッシュを計算（整合性検証用）
      event.hash = await this.calculateEventHash(event)

      // メモリキューに追加
      this.eventQueue.push(event)

      // キューのサイズ制限
      if (this.eventQueue.length > this.maxEventsInMemory) {
        this.eventQueue = this.eventQueue.slice(-this.maxEventsInMemory)
      }

      // 緊急度が高い場合は即座にフラッシュ
      if (severity === 'critical' || severity === 'high') {
        await this.flushQueue()
      }

      // SecurityMonitorにも通知
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: eventType,
        description: message,
        severity,
        source,
        metadata
      })

    } catch (error) {
      // エラーログの無限ループを防ぐため、オリジナルのconsole.errorを使用
      const originalError = (console as any).originalError || console.error
      
      // エラーが頻発しないよう、エラーログの出力を制限
      if (Math.random() < 0.1) { // 10%の確率でエラーをログ出力
        originalError.call(console, 'セキュリティイベントのログ記録に失敗:', error)
      }
      // フォールバック: クリティカルなイベントのみコンソールに出力
      if (severity === 'critical' || severity === 'high') {
        console.warn(`🚨 Security Event: ${eventType} [${severity.toUpperCase()}] ${message}`)
      }
    }
  }

  /**
   * イベントIDを生成
   */
  private async generateEventId(): Promise<string> {
    const timestamp = Date.now().toString()
    const random = Math.random().toString()
    const hash = await generateSecureHash(timestamp + random)
    return hash.slice(0, 16)
  }

  /**
   * イベントのハッシュを計算
   */
  private async calculateEventHash(event: Omit<SecurityAuditEvent, 'hash'>): Promise<string> {
    const eventString = JSON.stringify({
      id: event.id,
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      severity: event.severity,
      source: event.source,
      message: event.message,
      sessionId: event.sessionId
    })
    return await generateSecureHash(eventString)
  }

  /**
   * スタックトレースをキャプチャ
   */
  private captureStackTrace(): string {
    try {
      throw new Error()
    } catch (error) {
      if (error instanceof Error && error.stack) {
        return error.stack.split('\n').slice(3, 8).join('\n') // 関連する部分のみ
      }
      return ''
    }
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  private getPerformanceMetrics(): Record<string, any> {
    if (!performance) return {}

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    const memory = (performance as any).memory

    return {
      loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
      domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
      memoryUsage: memory ? {
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024) // MB
      } : null,
      timing: performance.now()
    }
  }

  /**
   * キューを永続化ストレージにフラッシュ
   */
  private async flushQueue(): Promise<void> {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return
    }

    this.isProcessingQueue = true

    try {
      // 既存のイベントを読み込み
      const existingEvents = await this.storage.getItem<SecurityAuditEvent[]>('security_audit_log', true) || []
      
      // 新しいイベントを追加
      const allEvents = [...existingEvents, ...this.eventQueue]
      
      // サイズ制限の適用
      const trimmedEvents = allEvents.slice(-this.maxEventsInStorage)
      
      // 圧縮の判定
      const shouldCompress = trimmedEvents.length >= this.config.compressionThreshold
      
      // ストレージに保存
      await this.storage.setItem('security_audit_log', trimmedEvents, shouldCompress)
      
      // メタデータの更新
      await this.updateAuditMetadata(trimmedEvents)
      
      // キューをクリア
      this.eventQueue = []
      
      console.log(`📝 ${trimmedEvents.length}件のセキュリティイベントがログに記録されました`)
      
    } catch (error) {
      console.error('セキュリティログのフラッシュに失敗:', error)
      
      // 重要: フラッシュが失敗してもキューを保持
      // ただし、サイズ制限は適用
      if (this.eventQueue.length > this.maxEventsInMemory) {
        this.eventQueue = this.eventQueue.slice(-Math.floor(this.maxEventsInMemory / 2))
      }
    } finally {
      this.isProcessingQueue = false
    }
  }

  /**
   * 監査メタデータを更新
   */
  private async updateAuditMetadata(events: SecurityAuditEvent[]): Promise<void> {
    const metadata = {
      lastUpdated: new Date().toISOString(),
      totalEvents: events.length,
      oldestEvent: events.length > 0 ? events[0].timestamp.toISOString() : null,
      newestEvent: events.length > 0 ? events[events.length - 1].timestamp.toISOString() : null,
      sessionId: this.sessionId,
      eventTypes: [...new Set(events.map(e => e.eventType))],
      sources: [...new Set(events.map(e => e.source))],
      severityCounts: {
        critical: events.filter(e => e.severity === 'critical').length,
        high: events.filter(e => e.severity === 'high').length,
        medium: events.filter(e => e.severity === 'medium').length,
        low: events.filter(e => e.severity === 'low').length
      }
    }

    await this.storage.setItem('security_audit_metadata', metadata, true)
  }

  /**
   * セキュリティイベントを検索・フィルタリング
   */
  async searchEvents(filter: SecurityAuditFilter = {}): Promise<SecurityAuditEvent[]> {
    try {
      const allEvents = await this.storage.getItem<SecurityAuditEvent[]>('security_audit_log', true) || []
      
      let filteredEvents = allEvents

      // 日付範囲フィルタ
      if (filter.startDate) {
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.timestamp) >= filter.startDate!
        )
      }
      
      if (filter.endDate) {
        filteredEvents = filteredEvents.filter(event => 
          new Date(event.timestamp) <= filter.endDate!
        )
      }

      // イベントタイプフィルタ
      if (filter.eventTypes && filter.eventTypes.length > 0) {
        filteredEvents = filteredEvents.filter(event => 
          filter.eventTypes!.includes(event.eventType)
        )
      }

      // 重要度フィルタ
      if (filter.severities && filter.severities.length > 0) {
        filteredEvents = filteredEvents.filter(event => 
          filter.severities!.includes(event.severity)
        )
      }

      // ソースフィルタ
      if (filter.sources && filter.sources.length > 0) {
        filteredEvents = filteredEvents.filter(event => 
          filter.sources!.includes(event.source)
        )
      }

      // テキスト検索
      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase()
        filteredEvents = filteredEvents.filter(event => 
          event.message.toLowerCase().includes(searchTerm) ||
          event.eventType.toLowerCase().includes(searchTerm) ||
          event.source.toLowerCase().includes(searchTerm)
        )
      }

      return filteredEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

    } catch (error) {
      console.error('セキュリティイベント検索に失敗:', error)
      return []
    }
  }

  /**
   * セキュリティ監査レポートを生成
   */
  async generateAuditReport(startDate?: Date, endDate?: Date): Promise<SecurityAuditReport> {
    const now = new Date()
    const start = startDate || new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)) // デフォルト: 7日前
    const end = endDate || now

    const events = await this.searchEvents({ startDate: start, endDate: end })

    // 統計計算
    const severityCounts = {
      critical: events.filter(e => e.severity === 'critical').length,
      high: events.filter(e => e.severity === 'high').length,
      medium: events.filter(e => e.severity === 'medium').length,
      low: events.filter(e => e.severity === 'low').length
    }

    const eventTypeCount = new Map<string, number>()
    const sourceCount = new Map<string, number>()

    events.forEach(event => {
      eventTypeCount.set(event.eventType, (eventTypeCount.get(event.eventType) || 0) + 1)
      sourceCount.set(event.source, (sourceCount.get(event.source) || 0) + 1)
    })

    const topEventTypes = Array.from(eventTypeCount.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const topSources = Array.from(sourceCount.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 日別トレンド計算
    const severityTrend = this.calculateSeverityTrend(events, start, end)

    // 推奨事項生成
    const recommendations = this.generateRecommendations(events, severityCounts)

    return {
      generatedAt: now,
      period: { start, end },
      summary: {
        totalEvents: events.length,
        criticalEvents: severityCounts.critical,
        highSeverityEvents: severityCounts.high,
        mediumSeverityEvents: severityCounts.medium,
        lowSeverityEvents: severityCounts.low,
        uniqueEventTypes: eventTypeCount.size,
        uniqueSources: sourceCount.size
      },
      topEventTypes,
      topSources,
      severityTrend,
      recommendations,
      events: events.slice(0, 100) // 最新100件のみ
    }
  }

  /**
   * 重要度別トレンドを計算
   */
  private calculateSeverityTrend(
    events: SecurityAuditEvent[], 
    startDate: Date, 
    endDate: Date
  ): Array<{ date: string; critical: number; high: number; medium: number; low: number }> {
    const trend: Array<{ date: string; critical: number; high: number; medium: number; low: number }> = []
    const msPerDay = 24 * 60 * 60 * 1000
    
    for (let date = new Date(startDate); date <= endDate; date.setTime(date.getTime() + msPerDay)) {
      const dateStr = date.toISOString().split('T')[0]
      const dayEvents = events.filter(event => 
        event.timestamp.toISOString().split('T')[0] === dateStr
      )
      
      trend.push({
        date: dateStr,
        critical: dayEvents.filter(e => e.severity === 'critical').length,
        high: dayEvents.filter(e => e.severity === 'high').length,
        medium: dayEvents.filter(e => e.severity === 'medium').length,
        low: dayEvents.filter(e => e.severity === 'low').length
      })
    }
    
    return trend
  }

  /**
   * セキュリティ推奨事項を生成
   */
  private generateRecommendations(
    events: SecurityAuditEvent[], 
    severityCounts: Record<string, number>
  ): string[] {
    const recommendations: string[] = []

    // クリティカルイベントの分析
    if (severityCounts.critical > 0) {
      recommendations.push('🚨 クリティカルなセキュリティイベントが検出されました。即座に対応が必要です。')
    }

    // 頻発イベントの分析
    const eventTypeCount = new Map<string, number>()
    events.forEach(event => {
      eventTypeCount.set(event.eventType, (eventTypeCount.get(event.eventType) || 0) + 1)
    })

    const frequentEvents = Array.from(eventTypeCount.entries())
      .filter(([, count]) => count > 10)
      .sort((a, b) => b[1] - a[1])

    if (frequentEvents.length > 0) {
      recommendations.push(`⚠️ 頻発するイベント: ${frequentEvents[0][0]} (${frequentEvents[0][1]}回)。パターンを分析し、根本原因を調査してください。`)
    }

    // ブルートフォース攻撃の検出
    const rateLimitEvents = events.filter(e => e.eventType.includes('rate_limit'))
    if (rateLimitEvents.length > 20) {
      recommendations.push('🛡️ 大量のレート制限違反が検出されました。ブルートフォース攻撃の可能性があります。')
    }

    // XSS攻撃の検出
    const xssEvents = events.filter(e => e.eventType.includes('xss') || e.eventType.includes('script_injection'))
    if (xssEvents.length > 0) {
      recommendations.push('🚫 XSS攻撃の試行が検出されました。入力検証とCSPの強化を検討してください。')
    }

    // 開発者ツールの過度な使用
    const devToolsEvents = events.filter(e => e.eventType === 'devtools_opened')
    if (devToolsEvents.length > 50) {
      recommendations.push('🔧 開発者ツールの頻繁な使用が検出されました。本番環境での監視を強化することを推奨します。')
    }

    // デフォルト推奨事項
    if (recommendations.length === 0) {
      recommendations.push('✅ 現在のセキュリティ状態は良好です。継続的な監視を続けてください。')
    }

    return recommendations
  }

  /**
   * 自動フラッシュを開始
   */
  private startAutoFlush(): void {
    setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushQueue()
      }
    }, this.config.autoFlushInterval)
  }

  /**
   * ページアンロード時のハンドラ設定
   */
  private setupUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // 同期的にフラッシュ（制限あり）
      if (this.eventQueue.length > 0) {
        try {
          // 緊急時のためのsendBeacon API使用（利用可能な場合）
          if (navigator.sendBeacon) {
            const data = JSON.stringify(this.eventQueue)
            navigator.sendBeacon('/api/security-events', data)
          } else {
            // フォールバック: 同期XHR（非推奨だが緊急時）
            this.flushQueue()
          }
        } catch (error) {
          console.warn('ページアンロード時のログフラッシュに失敗:', error)
        }
      }
    })
  }

  /**
   * 監査ログをエクスポート
   */
  async exportAuditLog(format: 'json' | 'csv' = 'json'): Promise<string> {
    const events = await this.storage.getItem<SecurityAuditEvent[]>('security_audit_log', true) || []
    
    if (format === 'json') {
      return JSON.stringify(events, null, 2)
    } 
      // CSV形式
      const headers = ['ID', 'Timestamp', 'Event Type', 'Severity', 'Source', 'Message', 'User Agent', 'Session ID']
      const csvRows = [headers.join(',')]
      
      events.forEach(event => {
        const row = [
          event.id,
          event.timestamp.toISOString(),
          event.eventType,
          event.severity,
          event.source,
          `"${event.message.replace(/"/g, '""')}"`, // CSVエスケープ
          `"${event.userAgent.replace(/"/g, '""')}"`,
          event.sessionId || ''
        ]
        csvRows.push(row.join(','))
      })
      
      return csvRows.join('\n')
    
  }

  /**
   * 監査ログをクリア
   */
  async clearAuditLog(): Promise<void> {
    try {
      await this.storage.removeItem('security_audit_log')
      await this.storage.removeItem('security_audit_metadata')
      this.eventQueue = []
      
      // クリア操作自体をログに記録
      await this.logSecurityEvent(
        'audit_log_cleared',
        'medium',
        'security_audit_logger',
        'セキュリティ監査ログがクリアされました',
        { clearedAt: new Date().toISOString(), sessionId: this.sessionId }
      )
      
      console.log('🗑️ セキュリティ監査ログがクリアされました')
      
    } catch (error) {
      console.error('監査ログのクリアに失敗:', error)
      throw error
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<typeof this.config>): void {
    this.config = { ...this.config, ...newConfig }
    
    console.log('⚙️ セキュリティ監査ログの設定が更新されました:', newConfig)
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): typeof this.config {
    return { ...this.config }
  }

  /**
   * 統計情報を取得
   */
  async getStatistics(): Promise<{
    queueSize: number
    totalEventsLogged: number
    oldestEvent: string | null
    newestEvent: string | null
    sessionId: string
  }> {
    const metadata = await this.storage.getItem<any>('security_audit_metadata', true)
    
    return {
      queueSize: this.eventQueue.length,
      totalEventsLogged: metadata?.totalEvents || 0,
      oldestEvent: metadata?.oldestEvent || null,
      newestEvent: metadata?.newestEvent || null,
      sessionId: this.sessionId
    }
  }
}

// 自動初期化とグローバルエラーハンドラー設定
if (typeof window !== 'undefined') {
  const auditLogger = SecurityAuditLogger.getInstance()

  // グローバルエラーハンドラー
  window.addEventListener('error', (event) => {
    auditLogger.logSecurityEvent(
      'javascript_error',
      'medium',
      'global_error_handler',
      `JavaScriptエラー: ${event.message}`,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString()
      }
    )
  })

  // Promise rejection ハンドラー
  window.addEventListener('unhandledrejection', (event) => {
    auditLogger.logSecurityEvent(
      'unhandled_promise_rejection',
      'medium',
      'global_promise_handler',
      `未処理のPromise rejection: ${event.reason}`,
      {
        reason: event.reason?.toString(),
        stack: event.reason?.stack
      }
    )
  })

  // Console override for security monitoring with rate limiting
  if (typeof console !== 'undefined' && console.error) {
    const originalConsoleError = console.error
    // Store original console.error for internal use
    ;(console as any).originalError = originalConsoleError
  
  let consoleErrorCount = 0
  let lastResetTime = Date.now()
  const MAX_CONSOLE_ERRORS_PER_MINUTE = 10
  
    console.error = function(...args) {
      // 開発環境ではレート制限を緩和
      if (import.meta.env.DEV) {
        return originalConsoleError.apply(this, args)
      }
      
      // Reset counter every minute
      const now = Date.now()
      if (now - lastResetTime > 60000) {
        consoleErrorCount = 0
        lastResetTime = now
      }
      
      // Skip logging if rate limit exceeded to prevent infinite loop
      const message = args.join(' ')
      if (message.includes('Error rate limit exceeded') || 
          consoleErrorCount >= MAX_CONSOLE_ERRORS_PER_MINUTE) {
        originalConsoleError.apply(console, args); return;
      }
      
      consoleErrorCount++
      
      // Log the error with low severity
      auditLogger.logSecurityEvent(
        'console_error',
        'low',
        'console_override',
        `Console Error: ${message}`,
        { args, count: consoleErrorCount }
      )
      
      originalConsoleError.apply(console, args);
    }
  }
}