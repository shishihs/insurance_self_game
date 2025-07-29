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

  constructor() {
    this.loadFromStorage()
  }

  /**
   * エラーをログに記録
   */
  log(errorInfo: ErrorInfo, context?: Record<string, any>): void {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      errorInfo,
      context
    }

    this.logs.push(entry)
    
    // ログのローテーション
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs + this.logRotationSize)
    }

    // ストレージに保存
    this.saveToStorage()

    // 開発環境では詳細をコンソールに出力
    if (import.meta.env.DEV) {
      console.group(`🚨 Error Log [${entry.id}]`)
      console.error('Error Info:', errorInfo)
      if (context) {
        console.log('Context:', context)
      }
      console.groupEnd()
    }
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
   * ユニークIDを生成
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}