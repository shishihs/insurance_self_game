/**
 * セキュアエラーハンドリングシステム
 * 情報漏洩防止、スタックトレース制御、ログ改ざん対策
 */

import { generateSecureHash, generateSecureRandomString } from './security'
import { SecurityAuditLogger } from './security-audit-logger'

export interface SecureErrorConfig {
  exposeStackTrace: boolean
  maxErrorMessageLength: number
  sensitiveDataPatterns: RegExp[]
  logIntegrityCheck: boolean
  errorSanitization: boolean
  clientErrorReporting: boolean
  serverErrorReporting: boolean
}

export interface ErrorContext {
  component: string
  method?: string
  userId?: string
  sessionId?: string
  requestId?: string
  timestamp?: Date
  userAgent?: string
  url?: string
  additionalContext?: Record<string, any>
}

export interface SanitizedError {
  id: string
  message: string
  code: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  context: ErrorContext
  stackTrace?: string
  hash: string
  userFriendlyMessage: string
}

export interface ErrorReport {
  errorId: string
  sanitizedError: SanitizedError
  reportedAt: Date
  reportedBy: 'system' | 'user'
  environmentInfo: {
    userAgent: string
    url: string
    timestamp: Date
    sessionId?: string
  }
}

/**
 * セキュアエラーハンドラー
 */
export class SecureErrorHandler {
  private static instance: SecureErrorHandler
  private config: SecureErrorConfig
  private readonly errorLog = new Map<string, SanitizedError>()
  private readonly auditLogger = SecurityAuditLogger.getInstance()
  private sensitivePatterns: RegExp[]

  private constructor() {
    this.config = {
      exposeStackTrace: process.env.NODE_ENV === 'development',
      maxErrorMessageLength: 500,
      sensitiveDataPatterns: [],
      logIntegrityCheck: true,
      errorSanitization: true,
      clientErrorReporting: true,
      serverErrorReporting: false
    }

    this.initializeSensitivePatterns()
    this.setupGlobalErrorHandlers()
  }

  static getInstance(): SecureErrorHandler {
    if (!SecureErrorHandler.instance) {
      SecureErrorHandler.instance = new SecureErrorHandler()
    }
    return SecureErrorHandler.instance
  }

  /**
   * 機密データパターンの初期化
   */
  private initializeSensitivePatterns(): void {
    this.sensitivePatterns = [
      // クレジットカード番号
      /\b4[0-9]{12}(?:[0-9]{3})?\b/g, // Visa
      /\b5[1-5][0-9]{14}\b/g, // MasterCard
      /\b3[47][0-9]{13}\b/g, // American Express
      
      // 社会保障番号（アメリカ）
      /\b\d{3}-\d{2}-\d{4}\b/g,
      
      // メールアドレス
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      
      // パスワード関連
      /password[=:\s]*['"]*([^'"\s]+)['"]*\s*/gi,
      /pass[=:\s]*['"]*([^'"\s]+)['"]*\s*/gi,
      /token[=:\s]*['"]*([^'"\s]+)['"]*\s*/gi,
      /key[=:\s]*['"]*([^'"\s]+)['"]*\s*/gi,
      /secret[=:\s]*['"]*([^'"\s]+)['"]*\s*/gi,
      
      // IP アドレス（プライベート範囲以外）
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
      
      // JWT トークン
      /eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g,
      
      // ファイルパス（機密情報を含む可能性）
      /[C-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\?)*[^\\/:*?"<>|\r\n]*/g,
      /\/(?:home|root|etc|var)\/[^\s]*/g,
      
      // データベース接続文字列
      /(?:mongodb|mysql|postgres|redis):\/\/[^\s]*/gi,
      
      // APIキー
      /(?:api[_-]?key|apikey)[=:\s]*['"]*([^'"\s]+)['"]*\s*/gi,
      
      // セッションID
      /(?:session[_-]?id|sessionid)[=:\s]*['"]*([^'"\s]+)['"]*\s*/gi
    ]
  }

  /**
   * グローバルエラーハンドラーの設定
   */
  private setupGlobalErrorHandlers(): void {
    // JavaScript エラー
    window.addEventListener('error', (event) => {
      this.handleError(
        event.error || new Error(event.message),
        {
          component: 'global_javascript',
          url: event.filename,
          additionalContext: {
            lineNumber: event.lineno,
            columnNumber: event.colno
          }
        }
      )
    })

    // Promise rejection
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(
        new Error(`Unhandled Promise Rejection: ${event.reason}`),
        {
          component: 'global_promise',
          additionalContext: {
            reason: this.sanitizeValue(String(event.reason))
          }
        }
      )
    })

    // リソース読み込みエラー
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        this.handleError(
          new Error(`Resource loading failed: ${(event.target as any).src || (event.target as any).href}`),
          {
            component: 'resource_loading',
            additionalContext: {
              tagName: (event.target as Element).tagName,
              src: this.sanitizeValue((event.target as any).src || (event.target as any).href)
            }
          }
        )
      }
    }, true)
  }

  /**
   * エラーの処理
   */
  async handleError(
    error: Error | unknown, 
    context: ErrorContext = { component: 'unknown' }
  ): Promise<SanitizedError> {
    const errorId = generateSecureRandomString(16)
    const timestamp = new Date()

    let originalError: Error
    if (error instanceof Error) {
      originalError = error
    } else {
      originalError = new Error(String(error))
    }

    // エラーメッセージの初期サニタイゼーション
    const sanitizedMessage = this.sanitizeErrorMessage(originalError.message)
    
    // スタックトレースの処理
    let sanitizedStackTrace: string | undefined
    if (this.config.exposeStackTrace && originalError.stack) {
      sanitizedStackTrace = this.sanitizeStackTrace(originalError.stack)
    }

    // 重要度の決定
    const severity = this.determineSeverity(originalError, context)

    // ユーザー向けメッセージの生成
    const userFriendlyMessage = this.generateUserFriendlyMessage(originalError, severity)

    // コンテキストのサニタイゼーション
    const sanitizedContext = this.sanitizeContext(context)

    const sanitizedError: SanitizedError = {
      id: errorId,
      message: sanitizedMessage,
      code: this.generateErrorCode(originalError),
      severity,
      timestamp,
      context: sanitizedContext,
      stackTrace: sanitizedStackTrace,
      hash: '', // 後で計算
      userFriendlyMessage
    }

    // 整合性ハッシュの計算
    if (this.config.logIntegrityCheck) {
      sanitizedError.hash = await this.calculateErrorHash(sanitizedError)
    }

    // エラーログに保存
    this.errorLog.set(errorId, sanitizedError)

    // セキュリティ監査ログに記録
    await this.auditLogger.logSecurityEvent(
      'error_handled',
      severity as any,
      'secure_error_handler',
      `エラーが処理されました: ${sanitizedError.code}`,
      {
        errorId,
        component: context.component,
        severity,
        code: sanitizedError.code,
        message: sanitizedMessage.slice(0, 100),
        userId: context.userId,
        sessionId: context.sessionId
      }
    )

    // 重要度が高い場合の追加処理
    if (severity === 'critical' || severity === 'high') {
      await this.handleCriticalError(sanitizedError)
    }

    // エラーレポートの生成（設定に応じて）
    if (this.config.clientErrorReporting) {
      await this.generateErrorReport(sanitizedError)
    }

    return sanitizedError
  }

  /**
   * エラーメッセージのサニタイゼーション
   */
  private sanitizeErrorMessage(message: string): string {
    if (!this.config.errorSanitization) {
      return message
    }

    let sanitized = message

    // 機密データパターンの除去
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }

    // 長さ制限の適用
    if (sanitized.length > this.config.maxErrorMessageLength) {
      sanitized = `${sanitized.slice(0, this.config.maxErrorMessageLength)  }...`
    }

    // 危険な文字の除去
    sanitized = sanitized
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/&/g, '&amp;')

    return sanitized
  }

  /**
   * スタックトレースのサニタイゼーション
   */
  private sanitizeStackTrace(stackTrace: string): string {
    let sanitized = stackTrace

    // ファイルパスの除去（機密情報漏洩防止）
    sanitized = sanitized.replace(/([C-Z]:\\|\/)[^\s\n]*/g, '[FILE_PATH]')
    
    // 機密データパターンの除去
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }

    // 開発環境でない場合は行数を制限
    if (process.env.NODE_ENV !== 'development') {
      const lines = sanitized.split('\n')
      if (lines.length > 10) {
        sanitized = `${lines.slice(0, 10).join('\n')  }\n... (truncated)`
      }
    }

    return sanitized
  }

  /**
   * コンテキストのサニタイゼーション
   */
  private sanitizeContext(context: ErrorContext): ErrorContext {
    const sanitized: ErrorContext = { ...context }

    // 機密データのサニタイゼーション
    if (sanitized.userId) {
      sanitized.userId = this.hashSensitiveData(sanitized.userId)
    }

    if (sanitized.sessionId) {
      sanitized.sessionId = this.hashSensitiveData(sanitized.sessionId)
    }

    if (sanitized.url) {
      sanitized.url = this.sanitizeURL(sanitized.url)
    }

    if (sanitized.additionalContext) {
      sanitized.additionalContext = this.sanitizeObject(sanitized.additionalContext)
    }

    return sanitized
  }

  /**
   * URLのサニタイゼーション
   */
  private sanitizeURL(url: string): string {
    try {
      const parsedURL = new URL(url)
      
      // クエリパラメータから機密データを除去
      const sanitizedParams = new URLSearchParams()
      for (const [key, value] of parsedURL.searchParams.entries()) {
        if (this.isSensitiveParameter(key)) {
          sanitizedParams.set(key, '[REDACTED]')
        } else {
          sanitizedParams.set(key, this.sanitizeValue(value))
        }
      }
      
      parsedURL.search = sanitizedParams.toString()
      return parsedURL.toString()
    } catch {
      return this.sanitizeValue(url)
    }
  }

  /**
   * 機密パラメータの判定
   */
  private isSensitiveParameter(key: string): boolean {
    const sensitiveKeys = [
      'token', 'key', 'secret', 'password', 'pass', 'auth', 
      'session', 'sid', 'csrf', 'api_key', 'access_token',
      'refresh_token', 'authorization'
    ]
    
    return sensitiveKeys.some(sensitiveKey => 
      key.toLowerCase().includes(sensitiveKey)
    )
  }

  /**
   * オブジェクトのサニタイゼーション
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveParameter(key)) {
        sanitized[key] = '[REDACTED]'
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeValue(value)
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          sanitized[key] = value.map(item => 
            typeof item === 'string' ? this.sanitizeValue(item) : item
          )
        } else {
          sanitized[key] = this.sanitizeObject(value)
        }
      } else {
        sanitized[key] = value
      }
    }
    
    return sanitized
  }

  /**
   * 値のサニタイゼーション
   */
  private sanitizeValue(value: string): string {
    let sanitized = value
    
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
    
    return sanitized
  }

  /**
   * 機密データのハッシュ化
   */
  private hashSensitiveData(data: string): string {
    // 最初の4文字と最後の4文字を表示し、中間をハッシュ化
    if (data.length <= 8) {
      return `${data.slice(0, 2)  }***${  data.slice(-2)}`
    }
    
    const prefix = data.slice(0, 4)
    const suffix = data.slice(-4)
    const middle = data.slice(4, -4)
    
    // 簡易ハッシュ（実際には generateSecureHash を使用）
    let hash = 0
    for (let i = 0; i < middle.length; i++) {
      hash = ((hash << 5) - hash + middle.charCodeAt(i)) & 0xffffffff
    }
    
    return `${prefix}***${Math.abs(hash).toString(16)}***${suffix}`
  }

  /**
   * エラーの重要度判定
   */
  private determineSeverity(error: Error, context: ErrorContext): 'low' | 'medium' | 'high' | 'critical' {
    // セキュリティ関連エラーは高重要度
    if (context.component.includes('security') || 
        context.component.includes('auth') ||
        context.component.includes('session')) {
      return 'critical'
    }

    // ネットワークエラー
    if (error.message.includes('Network') || 
        error.message.includes('fetch')) {
      return 'medium'
    }

    // 構文エラー
    if (error instanceof SyntaxError) {
      return 'high'
    }

    // 参照エラー
    if (error instanceof ReferenceError) {
      return 'medium'
    }

    // TypeError
    if (error instanceof TypeError) {
      return 'medium'
    }

    // デフォルト
    return 'low'
  }

  /**
   * エラーコードの生成
   */
  private generateErrorCode(error: Error): string {
    const errorType = error.constructor.name
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).slice(2, 6)
    
    return `${errorType.slice(0, 3).toUpperCase()}_${timestamp}_${random}`
  }

  /**
   * ユーザー向けメッセージの生成
   */
  private generateUserFriendlyMessage(error: Error, severity: string): string {
    const messages = {
      critical: '重要なエラーが発生しました。すぐにサポートにお問い合わせください。',
      high: 'エラーが発生しました。しばらく待ってから再試行してください。',
      medium: '一時的な問題が発生しました。再試行してください。',
      low: '軽微な問題が発生しましたが、続行できます。'
    }

    // 特定のエラータイプに対するカスタムメッセージ
    if (error.message.includes('Network')) {
      return 'ネットワークの問題が発生しました。インターネット接続を確認してください。'
    }

    if (error.message.includes('Permission')) {
      return 'アクセス権限がありません。管理者にお問い合わせください。'
    }

    if (error.message.includes('timeout')) {
      return 'リクエストがタイムアウトしました。再試行してください。'
    }

    return messages[severity as keyof typeof messages] || messages.medium
  }

  /**
   * エラーハッシュの計算
   */
  private async calculateErrorHash(error: Omit<SanitizedError, 'hash'>): Promise<string> {
    const hashData = JSON.stringify({
      id: error.id,
      message: error.message,
      code: error.code,
      timestamp: error.timestamp.toISOString(),
      component: error.context.component
    })
    
    return await generateSecureHash(hashData)
  }

  /**
   * 重要エラーの処理
   */
  private async handleCriticalError(error: SanitizedError): Promise<void> {
    // システム管理者への通知（実装は環境に依存）
    console.error(`🚨 Critical Error Detected: ${error.id}`)
    
    // 追加のセキュリティログ
    await this.auditLogger.logSecurityEvent(
      'critical_error_detected',
      'critical',
      'secure_error_handler',
      `重要エラーが検出されました: ${error.code}`,
      {
        errorId: error.id,
        component: error.context.component,
        timestamp: error.timestamp.toISOString(),
        hash: error.hash
      }
    )

    // 自動復旧の試行（必要に応じて）
    this.attemptAutoRecovery(error)
  }

  /**
   * 自動復旧の試行
   */
  private attemptAutoRecovery(error: SanitizedError): void {
    // セッション関連エラーの場合はセッションリセット
    if (error.context.component.includes('session')) {
      this.triggerSessionReset()
    }

    // ストレージ関連エラーの場合はキャッシュクリア
    if (error.message.includes('storage') || error.message.includes('localStorage')) {
      this.clearCorruptedStorage()
    }
  }

  /**
   * セッションリセットのトリガー
   */
  private triggerSessionReset(): void {
    // セッションクリアの実装
    try {
      localStorage.removeItem('session_token')
      sessionStorage.clear()
    } catch (error) {
      console.warn('Session reset failed:', error)
    }
  }

  /**
   * 破損ストレージのクリア
   */
  private clearCorruptedStorage(): void {
    try {
      // 重要でないデータのみクリア
      const keysToPreserve = ['user_preferences', 'game_settings']
      const allKeys = Object.keys(localStorage)
      
      for (const key of allKeys) {
        if (!keysToPreserve.some(preserve => key.includes(preserve))) {
          localStorage.removeItem(key)
        }
      }
    } catch (error) {
      console.warn('Storage cleanup failed:', error)
    }
  }

  /**
   * エラーレポートの生成
   */
  private async generateErrorReport(error: SanitizedError): Promise<ErrorReport> {
    const report: ErrorReport = {
      errorId: error.id,
      sanitizedError: error,
      reportedAt: new Date(),
      reportedBy: 'system',
      environmentInfo: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date(),
        sessionId: error.context.sessionId
      }
    }

    // レポートをサーバーに送信（実装は環境に依存）
    if (this.config.serverErrorReporting) {
      await this.sendErrorReport(report)
    }

    return report
  }

  /**
   * エラーレポートの送信
   */
  private async sendErrorReport(report: ErrorReport): Promise<void> {
    try {
      // 実装簡略化：実際にはサーバーAPIにPOST
      console.log('Error report would be sent:', report.errorId)
    } catch (error) {
      console.warn('Failed to send error report:', error)
    }
  }

  /**
   * エラーログの検索
   */
  searchErrors(filter: {
    severity?: string
    component?: string
    fromDate?: Date
    toDate?: Date
    limit?: number
  } = {}): SanitizedError[] {
    let errors = Array.from(this.errorLog.values())

    if (filter.severity) {
      errors = errors.filter(error => error.severity === filter.severity)
    }

    if (filter.component) {
      errors = errors.filter(error => 
        error.context.component.includes(filter.component)
      )
    }

    if (filter.fromDate) {
      errors = errors.filter(error => error.timestamp >= filter.fromDate!)
    }

    if (filter.toDate) {
      errors = errors.filter(error => error.timestamp <= filter.toDate!)
    }

    // 新しい順にソート
    errors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    if (filter.limit) {
      errors = errors.slice(0, filter.limit)
    }

    return errors
  }

  /**
   * エラー統計の取得
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsBySeverity: Record<string, number>
    errorsByComponent: Record<string, number>
    recentErrors: number
    topErrors: Array<{ code: string; count: number }>
  } {
    const errors = Array.from(this.errorLog.values())
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const errorsBySeverity: Record<string, number> = {}
    const errorsByComponent: Record<string, number> = {}
    const errorCounts: Record<string, number> = {}

    let recentErrors = 0

    for (const error of errors) {
      // 重要度別集計
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1

      // コンポーネント別集計
      errorsByComponent[error.context.component] = 
        (errorsByComponent[error.context.component] || 0) + 1

      // エラーコード別集計
      errorCounts[error.code] = (errorCounts[error.code] || 0) + 1

      // 最近のエラー数
      if (error.timestamp >= oneHourAgo) {
        recentErrors++
      }
    }

    const topErrors = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalErrors: errors.length,
      errorsBySeverity,
      errorsByComponent,
      recentErrors,
      topErrors
    }
  }

  /**
   * 設定の更新
   */
  updateConfig(newConfig: Partial<SecureErrorConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * エラーログのクリア
   */
  clearErrorLog(): void {
    this.errorLog.clear()
    
    this.auditLogger.logSecurityEvent(
      'error_log_cleared',
      'medium',
      'secure_error_handler',
      'エラーログがクリアされました'
    )
  }
}

// エクスポート用インスタンス
export const secureErrorHandler = SecureErrorHandler.getInstance()