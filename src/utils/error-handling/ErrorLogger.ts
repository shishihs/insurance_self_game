/**
 * エラーログ管理システム
 * すべてのエラーを記録し、分析可能な形で保存
 */

import type { ErrorInfo } from './ErrorHandler'

export interface LogEntry {
  id: string
  timestamp: number
  errorInfo: ErrorInfo
  context?: Record<string, any>
  sessionId?: string
  userId?: string
  buildVersion?: string
  source: 'user' | 'system' | 'auto' // ログの発生源
  correlationId?: string // 関連するエラーの結びつけ
  resolved?: boolean // 解決済みかどうか
  resolvedBy?: string // 解決方法
  impact?: 'low' | 'medium' | 'high' | 'critical' // ビジネスインパクト
}

export interface WarningEntry {
  id: string
  timestamp: number
  message: string
  component?: string
  trace?: string
}

export class ErrorLogger {
  private logs: LogEntry[] = []
  private warnings: WarningEntry[] = []
  private maxLogs = 1000
  private logRotationSize = 100
  private storageKey = 'game_error_logs'
  private warningStorageKey = 'game_warning_logs'
  private analyticsBuffer: LogEntry[] = []
  private realtimeListeners: Array<(entry: LogEntry) => void> = []
  private sessionId: string
  private userId?: string
  private buildVersion: string
  private isAnalyzing = false

  constructor() {
    this.sessionId = this.generateSessionId()
    this.buildVersion = import.meta.env.VITE_BUILD_VERSION || 'unknown'
    this.loadFromStorage()
    this.startRealtimeAnalysis()
  }

  /**
   * エラーをログに記録
   */
  log(errorInfo: ErrorInfo, context?: Record<string, any>, source: LogEntry['source'] = 'auto'): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      errorInfo,
      context,
      sessionId: this.sessionId,
      userId: this.userId,
      buildVersion: this.buildVersion,
      source,
      correlationId: this.generateCorrelationId(errorInfo),
      resolved: false,
      impact: this.calculateBusinessImpact(errorInfo)
    }

    this.logs.push(entry)
    this.analyticsBuffer.push(entry)
    
    // リアルタイムリスナーに通知
    this.notifyRealtimeListeners(entry)
    
    // ログのローテーション
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs + this.logRotationSize)
    }

    // ストレージに保存
    this.saveToStorage()

    // 開発環境では詳細をコンソールに出力
    if (import.meta.env.DEV) {
      this.logToConsole(entry)
    }
    
    // アラート条件のチェック
    this.checkAlertConditions(entry)
  }

  /**
   * 警告をログに記録
   */
  logWarning(warning: Omit<WarningEntry, 'id'>): void {
    const entry: WarningEntry = {
      id: this.generateId(),
      ...warning
    }

    this.warnings.push(entry)
    
    // 警告のローテーション
    if (this.warnings.length > this.maxLogs / 2) {
      this.warnings = this.warnings.slice(-this.maxLogs / 2 + this.logRotationSize)
    }

    this.saveToStorage()
  }

  /**
   * ログを取得
   */
  getLogs(filter?: {
    severity?: ErrorInfo['severity']
    category?: ErrorInfo['category']
    startTime?: number
    endTime?: number
    limit?: number
  }): LogEntry[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.severity) {
        filteredLogs = filteredLogs.filter(log => 
          log.errorInfo.severity === filter.severity
        )
      }

      if (filter.category) {
        filteredLogs = filteredLogs.filter(log => 
          log.errorInfo.category === filter.category
        )
      }

      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.startTime!
        )
      }

      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp <= filter.endTime!
        )
      }

      if (filter.limit) {
        filteredLogs = filteredLogs.slice(-filter.limit)
      }
    }

    return filteredLogs
  }

  /**
   * 警告を取得
   */
  getWarnings(limit?: number): WarningEntry[] {
    if (limit) {
      return this.warnings.slice(-limit)
    }
    return [...this.warnings]
  }

  /**
   * エラー統計を生成
   */
  getStatistics(timeRange?: { start: number; end: number }) {
    const logs = timeRange 
      ? this.getLogs({ startTime: timeRange.start, endTime: timeRange.end })
      : this.logs

    const stats = {
      total: logs.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      },
      byCategory: {
        vue: 0,
        javascript: 0,
        network: 0,
        async: 0,
        user: 0,
        system: 0
      },
      errorRate: 0,
      mostCommonErrors: [] as Array<{ message: string; count: number }>
    }

    // 集計
    const errorMessages = new Map<string, number>()
    
    logs.forEach(log => {
      stats.bySeverity[log.errorInfo.severity]++
      stats.byCategory[log.errorInfo.category]++
      
      const message = log.errorInfo.message
      errorMessages.set(message, (errorMessages.get(message) || 0) + 1)
    })

    // エラーレート計算（1分あたり）
    if (logs.length > 0) {
      const timeSpan = logs[logs.length - 1].timestamp - logs[0].timestamp
      stats.errorRate = timeSpan > 0 ? (logs.length / timeSpan) * 60000 : 0
    }

    // 最も一般的なエラーを抽出
    stats.mostCommonErrors = Array.from(errorMessages.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([message, count]) => ({ message, count }))

    return stats
  }

  /**
   * 特定のパターンのエラーを検索
   */
  searchErrors(pattern: string | RegExp): LogEntry[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
    
    return this.logs.filter(log => 
      regex.test(log.errorInfo.message) ||
      (log.errorInfo.stack && regex.test(log.errorInfo.stack))
    )
  }

  /**
   * エラーログをエクスポート
   */
  export(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify({
        logs: this.logs,
        warnings: this.warnings,
        exported: new Date().toISOString()
      }, null, 2)
    }

    // CSV形式
    const headers = ['ID', 'Timestamp', 'Severity', 'Category', 'Message', 'Component', 'URL', 'Stack']
    const rows = this.logs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      log.errorInfo.severity,
      log.errorInfo.category,
      `"${log.errorInfo.message.replace(/"/g, '""')}"`,
      log.errorInfo.component || '',
      log.errorInfo.url || '',
      log.errorInfo.stack ? `"${log.errorInfo.stack.replace(/"/g, '""')}"` : ''
    ])

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
  }

  /**
   * ログをクリア
   */
  clear(): void {
    this.logs = []
    this.warnings = []
    this.saveToStorage()
  }

  /**
   * 古いログを削除
   */
  pruneOldLogs(maxAge: number): void {
    const cutoff = Date.now() - maxAge
    
    this.logs = this.logs.filter(log => log.timestamp > cutoff)
    this.warnings = this.warnings.filter(warning => warning.timestamp > cutoff)
    
    this.saveToStorage()
  }

  /**
   * ストレージから読み込み
   */
  private loadFromStorage(): void {
    try {
      const logsData = localStorage.getItem(this.storageKey)
      const warningsData = localStorage.getItem(this.warningStorageKey)
      
      if (logsData) {
        this.logs = JSON.parse(logsData)
      }
      
      if (warningsData) {
        this.warnings = JSON.parse(warningsData)
      }
    } catch (error) {
      console.error('Failed to load error logs from storage:', error)
    }
  }

  /**
   * ストレージに保存
   */
  private saveToStorage(): void {
    try {
      // 最新のログのみ保存（ストレージ容量を考慮）
      const recentLogs = this.logs.slice(-100)
      const recentWarnings = this.warnings.slice(-50)
      
      localStorage.setItem(this.storageKey, JSON.stringify(recentLogs))
      localStorage.setItem(this.warningStorageKey, JSON.stringify(recentWarnings))
    } catch (error) {
      // ストレージがいっぱいの場合は古いログを削除
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.logs = this.logs.slice(-50)
        this.warnings = this.warnings.slice(-25)
        try {
          this.saveToStorage()
        } catch {
          // それでも失敗したら諦める
          console.error('Failed to save error logs to storage')
        }
      }
    }
  }

  /**
   * セッションIDを生成
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 相関IDを生成
   */
  private generateCorrelationId(errorInfo: ErrorInfo): string {
    // 同じ種類のエラーには同じ相関IDを付与
    const key = `${errorInfo.category}_${errorInfo.component || 'unknown'}_${errorInfo.message.split(' ')[0]}`
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit整数に変換
    }
    return `corr_${Math.abs(hash).toString(16)}`
  }

  /**
   * ビジネスインパクトを計算
   */
  private calculateBusinessImpact(errorInfo: ErrorInfo): LogEntry['impact'] {
    // ゲーム関連のエラーは高インパクト
    if (errorInfo.category === 'game' && errorInfo.severity === 'critical') {
      return 'critical'
    }
    
    // セキュリティエラーは高インパクト
    if (errorInfo.category === 'security') {
      return 'high'
    }
    
    // ネットワークエラーは中インパクト
    if (errorInfo.category === 'network') {
      return 'medium'
    }
    
    // その他は深刻度に基づく
    switch (errorInfo.severity) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      case 'low': return 'low'
    }
  }

  /**
   * リアルタイムリスナーに通知
   */
  private notifyRealtimeListeners(entry: LogEntry): void {
    this.realtimeListeners.forEach(listener => {
      try {
        listener(entry)
      } catch (error) {
        console.warn('[ErrorLogger] Realtime listener failed:', error)
      }
    })
  }

  /**
   * コンソールログ出力
   */
  private logToConsole(entry: LogEntry): void {
    const impactIcon = {
      low: '🟢',
      medium: '🟡',
      high: '🟠',
      critical: '🔴'
    }[entry.impact || 'low']

    console.group(`🚨 Error Log [${entry.id}] ${impactIcon}`)
    console.error('Error Info:', entry.errorInfo)
    console.log('Impact:', entry.impact)
    console.log('Source:', entry.source)
    if (entry.correlationId) {
      console.log('Correlation ID:', entry.correlationId)
    }
    if (entry.context) {
      console.log('Context:', entry.context)
    }
    console.groupEnd()
  }

  /**
   * アラート条件をチェック
   */
  private checkAlertConditions(entry: LogEntry): void {
    // 過去5分間のクリティカルエラー数をチェック
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const recentCriticalErrors = this.logs.filter(log => 
      log.timestamp > fiveMinutesAgo && 
      log.errorInfo.severity === 'critical'
    ).length

    if (recentCriticalErrors >= 3) {
      this.triggerAlert('critical-error-spike', {
        count: recentCriticalErrors,
        timespan: '5 minutes',
        latestError: entry
      })
    }

    // 同じ相関IDのエラーが連続している場合
    if (entry.correlationId) {
      const sameCorrelationErrors = this.logs.filter(log => 
        log.correlationId === entry.correlationId &&
        log.timestamp > Date.now() - 2 * 60 * 1000 // 2分以内
      ).length

      if (sameCorrelationErrors >= 5) {
        this.triggerAlert('repeated-error', {
          correlationId: entry.correlationId,
          count: sameCorrelationErrors,
          errorType: entry.errorInfo.message
        })
      }
    }
  }

  /**
   * アラートをトリガー
   */
  private triggerAlert(type: string, data: any): void {
    const alertEvent = new CustomEvent('app:error-alert', {
      detail: { type, data, timestamp: Date.now() }
    })
    window.dispatchEvent(alertEvent)
  }

  /**
   * リアルタイム分析を開始
   */
  private startRealtimeAnalysis(): void {
    // 30秒ごとに分析バッファを処理
    setInterval(() => {
      if (!this.isAnalyzing && this.analyticsBuffer.length > 0) {
        this.performRealtimeAnalysis()
      }
    }, 30000)
  }

  /**
   * リアルタイム分析を実行
   */
  private async performRealtimeAnalysis(): Promise<void> {
    if (this.analyticsBuffer.length === 0) return
    
    this.isAnalyzing = true
    
    try {
      const buffer = [...this.analyticsBuffer]
      this.analyticsBuffer = []
      
      // パターン分析
      const patterns = this.analyzeErrorPatterns(buffer)
      
      // トレンド分析
      const trends = this.analyzeTrends(buffer)
      
      // 異常検知
      const anomalies = this.detectAnomalies(buffer)
      
      // 分析結果をイベントとして発火
      const analysisEvent = new CustomEvent('app:error-analysis', {
        detail: {
          patterns,
          trends,
          anomalies,
          timestamp: Date.now(),
          sampleSize: buffer.length
        }
      })
      window.dispatchEvent(analysisEvent)
      
    } catch (error) {
      console.error('[ErrorLogger] Realtime analysis failed:', error)
    } finally {
      this.isAnalyzing = false
    }
  }

  /**
   * エラーパターンを分析
   */
  private analyzeErrorPatterns(logs: LogEntry[]): any {
    const patterns = {
      byCategory: new Map<string, number>(),
      byComponent: new Map<string, number>(),
      byCorrelation: new Map<string, number>(),
      topErrors: [] as Array<{ message: string; count: number; severity: string }>
    }
    
    const messageCount = new Map<string, { count: number; severity: string }>()
    
    logs.forEach(log => {
      // カテゴリ別集計
      const category = log.errorInfo.category
      patterns.byCategory.set(category, (patterns.byCategory.get(category) || 0) + 1)
      
      // コンポーネント別集計
      const component = log.errorInfo.component || 'unknown'
      patterns.byComponent.set(component, (patterns.byComponent.get(component) || 0) + 1)
      
      // 相関ID別集計
      if (log.correlationId) {
        patterns.byCorrelation.set(log.correlationId, (patterns.byCorrelation.get(log.correlationId) || 0) + 1)
      }
      
      // メッセージ別集計
      const message = log.errorInfo.message
      const existing = messageCount.get(message) || { count: 0, severity: log.errorInfo.severity }
      messageCount.set(message, { count: existing.count + 1, severity: log.errorInfo.severity })
    })
    
    // トップエラーを抽出
    patterns.topErrors = Array.from(messageCount.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([message, data]) => ({
        message,
        count: data.count,
        severity: data.severity
      }))
    
    return patterns
  }

  /**
   * トレンド分析
   */
  private analyzeTrends(logs: LogEntry[]): any {
    if (logs.length < 2) return null
    
    const timeSlots = new Map<string, number>()
    const slotSize = 5 * 60 * 1000 // 5分スロット
    
    logs.forEach(log => {
      const slot = Math.floor(log.timestamp / slotSize) * slotSize
      const slotKey = new Date(slot).toISOString()
      timeSlots.set(slotKey, (timeSlots.get(slotKey) || 0) + 1)
    })
    
    const sortedSlots = Array.from(timeSlots.entries()).sort((a, b) => 
      new Date(a[0]).getTime() - new Date(b[0]).getTime()
    )
    
    if (sortedSlots.length < 2) return null
    
    // 傾向を計算
    const values = sortedSlots.map(([, count]) => count)
    const trend = this.calculateTrend(values)
    
    return {
      timeSlots: sortedSlots,
      trend: trend > 0 ? 'increasing' : trend < 0 ? 'decreasing' : 'stable',
      trendValue: trend
    }
  }

  /**
   * 傾向計算（線形回帰の簡易版）
   */
  private calculateTrend(values: number[]): number {
    const n = values.length
    const sumX = (n * (n - 1)) / 2
    const sumY = values.reduce((a, b) => a + b, 0)
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0)
    const sumXX = values.reduce((sum, _, x) => sum + x * x, 0)
    
    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  }

  /**
   * 異常検知
   */
  private detectAnomalies(logs: LogEntry[]): any {
    const anomalies = []
    
    // エラー頻度の異常
    if (logs.length > 10) { // 30秒で10個以上のエラー
      anomalies.push({
        type: 'high_frequency',
        description: 'Unusually high error frequency detected',
        count: logs.length,
        severity: 'high'
      })
    }
    
    // 新しいエラータイプの検出
    const recentMessages = new Set(logs.map(log => log.errorInfo.message))
    const historicalMessages = new Set(
      this.logs.slice(0, -logs.length).map(log => log.errorInfo.message)
    )
    
    const newMessages = Array.from(recentMessages).filter(msg => !historicalMessages.has(msg))
    if (newMessages.length > 0) {
      anomalies.push({
        type: 'new_error_types',
        description: 'New error types detected',
        newErrors: newMessages,
        severity: 'medium'
      })
    }
    
    return anomalies
  }

  /**
   * リアルタイムリスナーを追加
   */
  addRealtimeListener(listener: (entry: LogEntry) => void): () => void {
    this.realtimeListeners.push(listener)
    
    // リスナーを削除する関数を返す
    return () => {
      const index = this.realtimeListeners.indexOf(listener)
      if (index !== -1) {
        this.realtimeListeners.splice(index, 1)
      }
    }
  }

  /**
   * エラーを解決済みとしてマーク
   */
  markAsResolved(errorId: string, resolvedBy: string): boolean {
    const entry = this.logs.find(log => log.id === errorId)
    if (entry) {
      entry.resolved = true
      entry.resolvedBy = resolvedBy
      this.saveToStorage()
      return true
    }
    return false
  }

  /**
   * 相関IDで関連エラーを取得
   */
  getRelatedErrors(correlationId: string): LogEntry[] {
    return this.logs.filter(log => log.correlationId === correlationId)
  }

  /**
   * ユーザーIDを設定
   */
  setUserId(userId: string): void {
    this.userId = userId
  }

  /**
   * 高度な統計を取得
   */
  getAdvancedStatistics(timeRange?: { start: number; end: number }) {
    const logs = timeRange 
      ? this.getLogs({ startTime: timeRange.start, endTime: timeRange.end })
      : this.logs

    const baseStats = this.getStatistics(timeRange)
    
    // MTTR (Mean Time To Resolution) の計算
    const resolvedErrors = logs.filter(log => log.resolved)
    const mttr = resolvedErrors.length > 0
      ? resolvedErrors.reduce((sum, log) => {
          // 解決時刻は記録されていないので、簡易的に次のエラーまでの時間を使用
          return sum + (60 * 1000) // 仮の値: 1分
        }, 0) / resolvedErrors.length
      : 0

    // インパクト別統計
    const impactStats = {
      low: logs.filter(log => log.impact === 'low').length,
      medium: logs.filter(log => log.impact === 'medium').length,
      high: logs.filter(log => log.impact === 'high').length,
      critical: logs.filter(log => log.impact === 'critical').length
    }

    // ソース別統計
    const sourceStats = {
      user: logs.filter(log => log.source === 'user').length,
      system: logs.filter(log => log.source === 'system').length,
      auto: logs.filter(log => log.source === 'auto').length
    }

    return {
      ...baseStats,
      mttr,
      impactStats,
      sourceStats,
      resolutionRate: logs.length > 0 ? resolvedErrors.length / logs.length : 0,
      correlationGroups: this.getCorrelationGroups(logs)
    }
  }

  /**
   * 相関グループを取得
   */
  private getCorrelationGroups(logs: LogEntry[]): Array<{ id: string; count: number; resolved: number }> {
    const groups = new Map<string, { count: number; resolved: number }>()
    
    logs.forEach(log => {
      if (log.correlationId) {
        const existing = groups.get(log.correlationId) || { count: 0, resolved: 0 }
        existing.count++
        if (log.resolved) {
          existing.resolved++
        }
        groups.set(log.correlationId, existing)
      }
    })
    
    return Array.from(groups.entries())
      .map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * ユニークIDを生成
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}