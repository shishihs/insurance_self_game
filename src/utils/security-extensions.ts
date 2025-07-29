/**
 * セキュリティ拡張機能
 * 監視、検知、防護システムの追加実装
 */

import { generateSecureRandomString, RateLimiter, sanitizeInput } from './security'

/**
 * セキュリティ監視システム
 * 不審な活動を検出・記録
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private suspiciousActivities: SuspiciousActivity[] = []
  private rateLimiters = new Map<string, RateLimiter>()
  private securityMetrics = {
    totalThreatsBlocked: 0,
    totalInputValidations: 0,
    totalRateLimitViolations: 0,
    sessionStartTime: Date.now()
  }
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }
  
  /**
   * セキュリティメトリクスを取得
   */
  getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      uptime: Date.now() - this.securityMetrics.sessionStartTime,
      currentThreats: this.suspiciousActivities.filter(a => 
        Date.now() - a.timestamp.getTime() < 60000 // 直近1分間の脅威
      ).length
    }
  }
  
  /**
   * レートリミッターのクリーンアップ
   */
  cleanupRateLimiters(): void {
    for (const limiter of this.rateLimiters.values()) {
      limiter.cleanup()
    }
  }
  
  /**
   * 不審な活動を記録 - 強化版
   */
  logSuspiciousActivity(activity: Omit<SuspiciousActivity, 'timestamp' | 'id'>): void {
    const suspiciousActivity: SuspiciousActivity = {
      ...activity,
      id: generateSecureRandomString(16),
      timestamp: new Date()
    }
    
    this.suspiciousActivities.push(suspiciousActivity)
    this.securityMetrics.totalThreatsBlocked++
    
    // 最大1000件まで保持
    if (this.suspiciousActivities.length > 1000) {
      this.suspiciousActivities = this.suspiciousActivities.slice(-1000)
    }
    
    // アクティビティのパターン分析
    const recentActivities = this.getRecentActivitiesByType(activity.type, 60000) // 1分間
    if (recentActivities.length >= 5) {
      // 短時間で同じタイプの活動が頻発している
      suspiciousActivity.severity = 'high'
      suspiciousActivity.description += ' (攻撃パターン検出)'
    }
    
    // 重要度が高い場合は即座に警告
    if (suspiciousActivity.severity === 'high' || suspiciousActivity.severity === 'critical') {
      console.warn(`🚨 セキュリティ警告 [${suspiciousActivity.severity.toUpperCase()}]: ${suspiciousActivity.description}`)
      
      if (suspiciousActivity.severity === 'critical') {
        // 緊急時の処理
        this.handleCriticalThreat(suspiciousActivity)
      }
    }
    
    // ローカルストレージにも保存（非同期）
    this.persistActivityToStorage(suspiciousActivity)
  }
  
  /**
   * 最近の特定タイプのアクティビティを取得
   */
  private getRecentActivitiesByType(type: string, timeWindowMs: number): SuspiciousActivity[] {
    const cutoff = Date.now() - timeWindowMs
    return this.suspiciousActivities.filter(activity => 
      activity.type === type && activity.timestamp.getTime() > cutoff
    )
  }
  
  /**
   * アティビティをストレージに永続化
   */
  private persistActivityToStorage(activity: SuspiciousActivity): void {
    try {
      setTimeout(() => {
        const existingLogs = JSON.parse(localStorage.getItem('security_incidents') || '[]')
        existingLogs.push({
          ...activity,
          timestamp: activity.timestamp.toISOString()
        })
        // 最新500件のみ保持
        const trimmedLogs = existingLogs.slice(-500)
        localStorage.setItem('security_incidents', JSON.stringify(trimmedLogs))
      }, 0)
    } catch (error) {
      console.error('セキュリティログの永続化に失敗:', error)
    }
  }
  
  /**
   * レート制限を確認 - 強化版
   */
  checkRateLimit(key: string, maxAttempts: number, windowMs: number, blockDurationMs = 60000): boolean {
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, new RateLimiter())
    }
    
    const limiter = this.rateLimiters.get(key)!
    const allowed = limiter.isAllowed(key, maxAttempts, windowMs, blockDurationMs)
    
    if (!allowed) {
      this.securityMetrics.totalRateLimitViolations++
      
      const remainingAttempts = limiter.getRemainingAttempts(key, maxAttempts, windowMs)
      const nextAttemptTime = limiter.getNextAttemptTime(key, windowMs)
      
      this.logSuspiciousActivity({
        type: 'rate_limit_exceeded',
        description: `レート制限を超過: ${key}`,
        severity: remainingAttempts === 0 ? 'high' : 'medium',
        source: key,
        metadata: {
          maxAttempts,
          windowMs,
          blockDurationMs,
          remainingAttempts,
          nextAttemptTime
        }
      })
    }
    
    return allowed
  }
  
  /**
   * 不審な活動の履歴を取得
   */
  getSuspiciousActivities(limit = 100): SuspiciousActivity[] {
    return this.suspiciousActivities
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
  
  /**
   * セキュリティレポートを生成 - 強化版
   */
  generateSecurityReport(): SecurityReport {
    const activities = this.getSuspiciousActivities()
    const typeCount: Record<string, number> = {}
    const severityCount: Record<string, number> = {}
    const hourlyCount: Record<string, number> = {}
    
    activities.forEach(activity => {
      typeCount[activity.type] = (typeCount[activity.type] || 0) + 1
      severityCount[activity.severity] = (severityCount[activity.severity] || 0) + 1
      
      // 1時間単位の統計
      const hour = new Date(activity.timestamp).getHours()
      hourlyCount[hour] = (hourlyCount[hour] || 0) + 1
    })
    
    const metrics = this.getSecurityMetrics()
    
    return {
      totalActivities: activities.length,
      typeBreakdown: typeCount,
      severityBreakdown: severityCount,
      hourlyBreakdown: hourlyCount,
      recentActivities: activities.slice(0, 10),
      generateTime: new Date(),
      metrics,
      recommendations: this.generateSecurityRecommendations(typeCount, severityCount)
    }
  }
  
  /**
   * セキュリティ推奨事項を生成
   */
  private generateSecurityRecommendations(
    typeCount: Record<string, number>,
    severityCount: Record<string, number>
  ): string[] {
    const recommendations: string[] = []
    
    // 高頻度の脅威タイプに基づく推奨
    if (typeCount['rate_limit_exceeded'] > 10) {
      recommendations.push('レート制限の強化を検討してください')
    }
    
    if (typeCount['invalid_input'] > 5) {
      recommendations.push('入力検証の強化を検討してください')
    }
    
    if (typeCount['csp_violation'] > 0) {
      recommendations.push('Content Security Policyの見直しを検討してください')
    }
    
    if (severityCount['critical'] > 0) {
      recommendations.push('クリティカルな脅威が検出されました。系統管理者に連絡してください')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('セキュリティ状態は良好です')
    }
    
    return recommendations
  }
  
  /**
   * クリティカルな脅威への対応
   */
  private handleCriticalThreat(activity: SuspiciousActivity): void {
    // セッションクリア
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch (error) {
      console.error('緊急時のストレージクリアに失敗:', error)
    }
    
    // 追加の防護措置をここに実装
    console.error('🚨 CRITICAL SECURITY THREAT DETECTED 🚨')
    console.error('Activity:', activity)
    console.error('All storage has been cleared as a security measure.')
    
    // 可能であればページをリロード（極端な対策）
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  }
}

/**
 * 入力値の深度検証 - 強化版
 */
export function validateInputDepth(input: any, maxDepth = 10): boolean {
  function getDepth(obj: any, currentDepth = 0): number {
    if (currentDepth > maxDepth) return currentDepth
    if (obj === null || typeof obj !== 'object') return currentDepth
    
    // 循環参照の検知
    if (visitedObjects.has(obj)) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'circular_reference',
        description: '循環参照を持つオブジェクトが検出されました',
        severity: 'medium',
        source: 'input_validation',
        metadata: { currentDepth }
      })
      return maxDepth + 1 // 制限を超えたことを示す
    }
    
    visitedObjects.add(obj)
    
    try {
      if (Array.isArray(obj)) {
        // 配列のサイズチェック
        if (obj.length > 10000) {
          SecurityMonitor.getInstance().logSuspiciousActivity({
            type: 'oversized_array',
            description: `異常に大きな配列: ${obj.length}個の要素`,
            severity: 'high',
            source: 'input_validation',
            metadata: { arrayLength: obj.length, currentDepth }
          })
          return maxDepth + 1
        }
        
        return Math.max(currentDepth, ...obj.map(item => getDepth(item, currentDepth + 1)))
      }
      
      // オブジェクトのプロパティ数チェック
      const keys = Object.keys(obj)
      if (keys.length > 1000) {
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'oversized_object',
          description: `異常に多くのプロパティ: ${keys.length}個`,
          severity: 'high',
          source: 'input_validation',
          metadata: { propertyCount: keys.length, currentDepth }
        })
        return maxDepth + 1
      }
      
      return Math.max(currentDepth, ...Object.values(obj).map(value => getDepth(value, currentDepth + 1)))
    } finally {
      visitedObjects.delete(obj)
    }
  }
  
  const visitedObjects = new Set()
  return getDepth(input) <= maxDepth
}

/**
 * ユーザー入力の総合的な検証
 */
export function validateUserInput(
  input: unknown,
  options: {
    maxLength?: number
    allowedTypes?: string[]
    sanitize?: boolean
    maxDepth?: number
    checkPatterns?: RegExp[]
  } = {}
): { isValid: boolean; sanitizedInput?: string; errors: string[] } {
  const {
    maxLength = 1000,
    allowedTypes = ['string', 'number', 'boolean'],
    sanitize = true,
    maxDepth = 10,
    checkPatterns = []
  } = options
  
  const errors: string[] = []
  let sanitizedInput: string | undefined
  
  // 型チェック
  const inputType = typeof input
  if (!allowedTypes.includes(inputType)) {
    errors.push(`無効な型: ${inputType}`)
    return { isValid: false, errors }
  }
  
  // null/undefinedチェック
  if (input === null || input === undefined) {
    if (!allowedTypes.includes('null')) {
      errors.push('nullまたはundefinedは許可されていません')
      return { isValid: false, errors }
    }
  }
  
  // 文字列の場合の特別な処理
  if (inputType === 'string') {
    const stringInput = input as string
    
    // 長さチェック
    if (stringInput.length > maxLength) {
      errors.push(`文字列が長すぎます: ${stringInput.length}/${maxLength}`)
    }
    
    // パターンチェック
    for (const pattern of checkPatterns) {
      if (!pattern.test(stringInput)) {
        errors.push(`パターンマッチング失敗: ${pattern.source}`)
      }
    }
    
    // サニタイゼーション
    if (sanitize) {
      try {
        sanitizedInput = sanitizeAdvancedInput(stringInput)
      } catch (error) {
        errors.push(`サニタイゼーションエラー: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
  }
  
  // オブジェクトの深度チェック
  if (input && typeof input === 'object') {
    if (!validateInputDepth(input, maxDepth)) {
      errors.push(`オブジェクトの深度が制限を超えています: ${maxDepth}`)
    }
  }
  
  const isValid = errors.length === 0
  return { isValid, sanitizedInput, errors }
}

/**
 * 高度な入力サニタイゼーション
 */
function sanitizeAdvancedInput(input: string): string {
  return input
    // コメントアウトの除去
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    // SQLインジェクション対策
    .replace(/['"`;]/g, '')
    .replace(/\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b/gi, '')
    // LDAPインジェクション対策
    .replace(/[()&|!=<>]/g, '')
    // NoSQLインジェクション対策
    .replace(/[{}$]/g, '')
    // XPathインジェクション対策
    .replace(/[\/\[\]@]/g, '')
    // コマンドインジェクション対策
    .replace(/[;&|`$\\]/g, '')
    // 制御文字と特殊文字の除去
    .replace(/[\x00-\x1f\x7f-\x9f\ufeff]/g, '')
    .trim()
}

/**
 * CSP (Content Security Policy) 違反を検出
 */
export function setupCSPMonitoring(): void {
  if (typeof window !== 'undefined') {
    document.addEventListener('securitypolicyviolation', (event: any) => {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'csp_violation',
        description: `CSP違反: ${event.violatedDirective}`,
        severity: 'high',
        source: event.sourceFile || 'unknown',
        metadata: {
          violatedDirective: event.violatedDirective,
          blockedURI: event.blockedURI,
          lineNumber: event.lineNumber,
          columnNumber: event.columnNumber
        }
      })
    })
  }
}

/**
 * DOM操作の監視
 */
export function setupDOMMonitoring(): void {
  if (typeof window !== 'undefined' && window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // 外部スクリプトの動的追加を検出
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element
              
              if (element.tagName === 'SCRIPT') {
                const src = element.getAttribute('src')
                if (src && !src.startsWith(window.location.origin)) {
                  SecurityMonitor.getInstance().logSuspiciousActivity({
                    type: 'external_script_injection',
                    description: `外部スクリプトの動的追加を検出: ${src}`,
                    severity: 'critical',
                    source: 'dom_monitor',
                    metadata: { scriptSrc: src }
                  })
                }
              }
            }
          })
        }
      })
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
  }
}

/**
 * 異常なネットワーク活動の監視
 */
export function setupNetworkMonitoring(): void {
  if (typeof window !== 'undefined') {
    // fetch の監視
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      const url = args[0]
      const options = args[1] || {}
      
      // 外部ドメインへのリクエストを監視
      if (typeof url === 'string' && url.startsWith('http') && !url.startsWith(window.location.origin)) {
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'external_network_request',
          description: `外部ドメインへのリクエスト: ${url}`,
          severity: 'medium',
          source: 'network_monitor',
          metadata: { url, method: options.method || 'GET' }
        })
      }
      
      return originalFetch.apply(this, args)
    }
    
    // XMLHttpRequest の監視
    const originalXHR = window.XMLHttpRequest
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR()
      const originalOpen = xhr.open
      
      xhr.open = function(method: string, url: string | URL, ...args: any[]) {
        if (typeof url === 'string' && url.startsWith('http') && !url.startsWith(window.location.origin)) {
          SecurityMonitor.getInstance().logSuspiciousActivity({
            type: 'external_xhr_request',
            description: `外部ドメインへのXHRリクエスト: ${url}`,
            severity: 'medium',
            source: 'network_monitor',
            metadata: { url, method }
          })
        }
        
        return originalOpen.apply(this, [method, url, ...args])
      }
      
      return xhr
    }
  }
}

/**
 * ブラウザの開発者ツール検出 - 強化版
 */
export function setupDevToolsDetection(): void {
  if (typeof window !== 'undefined') {
    let devtools = false
    let lastCheck = Date.now()
    
    // 複数の検出手法を併用
    const detectionMethods = {
      // サイズベースの検出
      sizeDetection(): boolean {
        const threshold = 160
        return (window.outerHeight - window.innerHeight > threshold || 
                window.outerWidth - window.innerWidth > threshold)
      },
      
      // console.logの監視
      consoleDetection(): boolean {
        const start = performance.now()
        console.log('%c', 'color: transparent')
        const end = performance.now()
        return (end - start) > 100 // DevToolsが開いているとconsole.logが遅くなる
      },
      
      // debuggerステートメントの検出
      debuggerDetection(): boolean {
        const start = performance.now()
        try {
          // debuggerステートメントを動的に実行
          Function('debugger')() // DevToolsが開いていると停止する
        } catch {}
        const end = performance.now()
        return (end - start) > 100
      },
      
      // コンテキストメニュの検出
      contextMenuDetection(): boolean {
        return document.addEventListener ? false : true // 簡易版
      }
    }
    
    setInterval(() => {
      const now = Date.now()
      
      // 選択的に検出手法を実行（パフォーマンスへの影響を減らす）
      const detectionResults = {
        size: detectionMethods.sizeDetection(),
        console: (now - lastCheck) > 5000 ? detectionMethods.consoleDetection() : false,
        debugger: (now - lastCheck) > 10000 ? detectionMethods.debuggerDetection() : false,
        contextMenu: false // コンテキストメニュ検出は省略
      }
      
      const isDetected = Object.values(detectionResults).some(Boolean)
      
      if (isDetected && !devtools) {
        devtools = true
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'devtools_opened',
          description: '開発者ツールが検出されました',
          severity: 'low',
          source: 'devtools_detector',
          metadata: {
            detectionMethods: detectionResults,
            outerHeight: window.outerHeight,
            innerHeight: window.innerHeight,
            outerWidth: window.outerWidth,
            innerWidth: window.innerWidth,
            userAgent: navigator.userAgent,
            timestamp: now
          }
        })
        
        // 開発者ツール検出時の追加処理
        handleDevToolsDetection()
      } else if (!isDetected && devtools) {
        devtools = false
      }
      
      if ((now - lastCheck) > 5000) {
        lastCheck = now
      }
    }, 1000) // チェック間隔を緩やかに
  }
}

/**
 * 開発者ツール検出時の処理
 */
function handleDevToolsDetection(): void {
  // コンソールに警告メッセージを表示
  console.warn(
    '%c🚨 セキュリティ警告',
    'color: red; font-size: 24px; font-weight: bold;'
  )
  console.warn(
    '%cこのサイトはセキュリティ監視下にあります。\n開発者ツールの使用は記録されます。',
    'color: orange; font-size: 14px;'
  )
  
  // レート制限を強化
  const monitor = SecurityMonitor.getInstance()
  const userAgent = navigator.userAgent
  
  // 開発者ツール使用者への特別なレート制限
  if (!monitor.checkRateLimit(`devtools_user_${userAgent}`, 10, 60000)) {
    console.warn('⚠️ 開発者ツール使用によるレート制限が発動しました')
  }
}

/**
 * セキュリティ初期化 - 強化版
 */
export function initializeSecurity(): void {
  try {
    // コアセキュリティ機能の初期化
    setupCSPMonitoring()
    setupDOMMonitoring()
    setupNetworkMonitoring()
    setupDevToolsDetection()
    
    // 追加のセキュリティ機能
    setupInputValidationMonitoring()
    setupPerformanceMonitoring()
    setupMemoryLeakDetection()
    
    // セキュリティ状態の初期チェック
    performInitialSecurityCheck()
    
    // 定期的なセキュリティチェックのスケジュール
    scheduleSecurityMaintenance()
    
    console.log('🛡️ セキュリティシステムが初期化されました (強化版)')
  } catch (error) {
    console.error('❌ セキュリティ初期化に失敗しました:', error)
    SecurityMonitor.getInstance().logSuspiciousActivity({
      type: 'security_init_failure',
      description: `セキュリティ初期化エラー: ${error instanceof Error ? error.message : String(error)}`,
      severity: 'critical',
      source: 'security_initialization',
      metadata: { error }
    })
  }
}

/**
 * 入力検証の監視設定
 */
function setupInputValidationMonitoring(): void {
  // フォーム入力の監視
  document.addEventListener('input', (event) => {
    const target = event.target as HTMLInputElement
    if (target && target.value) {
      const validation = validateUserInput(target.value, {
        maxLength: 1000,
        sanitize: true,
        checkPatterns: [/^[^<>"'&{}$]*$/] // 基本的なパターン
      })
      
      if (!validation.isValid) {
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'invalid_input',
          description: `無効な入力が検出されました: ${validation.errors.join(', ')}`,
          severity: 'medium',
          source: 'input_validation_monitor',
          metadata: {
            inputValue: target.value.slice(0, 100), // 最初の100文字のみログ
            errors: validation.errors,
            elementType: target.type,
            elementName: target.name
          }
        })
      }
    }
  })
}

/**
 * パフォーマンス監視の設定
 */
function setupPerformanceMonitoring(): void {
  if (typeof window !== 'undefined' && window.performance) {
    // メモリ使用量の監視
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        const usagePercent = (usedMB / limitMB) * 100
        
        if (usagePercent > 80) {
          SecurityMonitor.getInstance().logSuspiciousActivity({
            type: 'high_memory_usage',
            description: `メモリ使用率が高いです: ${usagePercent.toFixed(1)}%`,
            severity: 'medium',
            source: 'performance_monitor',
            metadata: {
              usedMB,
              limitMB,
              usagePercent
            }
          })
        }
      }
    }
    
    // 30秒ごとにメモリ使用量をチェック
    setInterval(checkMemoryUsage, 30000)
  }
}

/**
 * メモリリーク検出の設定
 */
function setupMemoryLeakDetection(): void {
  const objectCounts = new Map<string, number>()
  
  const checkObjectCounts = () => {
    // グローバルオブジェクトの監視
    const globalKeys = Object.keys(window).length
    const previousCount = objectCounts.get('global') || 0
    
    if (globalKeys > previousCount + 100) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'potential_memory_leak',
        description: `グローバルオブジェクトの数が急激に増加: ${globalKeys}`,
        severity: 'medium',
        source: 'memory_leak_detector',
        metadata: {
          currentCount: globalKeys,
          previousCount,
          increase: globalKeys - previousCount
        }
      })
    }
    
    objectCounts.set('global', globalKeys)
  }
  
  // 60秒ごとにオブジェクト数をチェック
  setInterval(checkObjectCounts, 60000)
}

/**
 * 初期セキュリティチェック
 */
function performInitialSecurityCheck(): void {
  // ブラウザのセキュリティ機能チェック
  const securityFeatures = {
    crypto: !!window.crypto,
    subtle: !!(window.crypto && window.crypto.subtle),
    csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
    https: window.location.protocol === 'https:',
    referrerPolicy: !!document.querySelector('meta[name="referrer"]')
  }
  
  const missingFeatures = Object.entries(securityFeatures)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature)
  
  if (missingFeatures.length > 0) {
    SecurityMonitor.getInstance().logSuspiciousActivity({
      type: 'missing_security_features',
      description: `セキュリティ機能が不十分: ${missingFeatures.join(', ')}`,
      severity: 'medium',
      source: 'initial_security_check',
      metadata: {
        missingFeatures,
        allFeatures: securityFeatures
      }
    })
  }
}

/**
 * 定期メンテナンスのスケジュール
 */
function scheduleSecurityMaintenance(): void {
  // 5分ごとにレートリミッターのクリーンアップ
  setInterval(() => {
    SecurityMonitor.getInstance().cleanupRateLimiters()
  }, 5 * 60 * 1000)
  
  // 1時間ごとにセキュリティレポートをコンソールに出力
  setInterval(() => {
    const report = SecurityMonitor.getInstance().generateSecurityReport()
    if (report.totalActivities > 0) {
      console.log('📊 セキュリティレポート:', report)
    }
  }, 60 * 60 * 1000)
  
  // 24時間ごとに古いセキュリティログをクリーンアップ
  setInterval(() => {
    const incidents = JSON.parse(localStorage.getItem('security_incidents') || '[]')
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    const recentIncidents = incidents.filter((incident: any) => 
      new Date(incident.timestamp).getTime() > oneDayAgo
    )
    localStorage.setItem('security_incidents', JSON.stringify(recentIncidents))
  }, 24 * 60 * 60 * 1000)
}

/**
 * セキュリティヘッダーの確認
 */
export async function validateSecurityHeaders(): Promise<SecurityHeaderReport> {
  const report: SecurityHeaderReport = {
    timestamp: new Date(),
    headers: {},
    recommendations: []
  }
  
  try {
    // 現在のページのレスポンスヘッダーを確認することは直接はできないため
    // 代替手段として、MetaタグやCSPの存在を確認
    
    // CSPメタタグの確認
    const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (cspMeta) {
      report.headers['content-security-policy'] = cspMeta.getAttribute('content') || ''
    } else {
      report.recommendations.push('Content-Security-Policy (CSP) の実装を推奨します')
    }
    
    // その他のセキュリティメタタグの確認
    const referrerPolicy = document.querySelector('meta[name="referrer"]')
    if (!referrerPolicy) {
      report.recommendations.push('Referrer-Policy の設定を推奨します')
    }
    
    // HTTPS の確認
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      report.recommendations.push('HTTPS の使用を強く推奨します')
    }
    
  } catch (error) {
    console.error('セキュリティヘッダーの確認中にエラーが発生:', error)
  }
  
  return report
}

// 型定義
export interface SuspiciousActivity {
  id: string
  type: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: Date
  source: string
  metadata?: Record<string, any>
}

export interface SecurityReport {
  totalActivities: number
  typeBreakdown: Record<string, number>
  severityBreakdown: Record<string, number>
  hourlyBreakdown: Record<string, number>
  recentActivities: SuspiciousActivity[]
  generateTime: Date
  metrics: any
  recommendations: string[]
}

export interface SecurityHeaderReport {
  timestamp: Date
  headers: Record<string, string>
  recommendations: string[]
}