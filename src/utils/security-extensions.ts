/**
 * セキュリティ拡張機能
 * 監視、検知、防護システムの追加実装
 */

import { generateSecureRandomString, RateLimiter } from './security'

/**
 * セキュリティ監視システム
 * 不審な活動を検出・記録
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private suspiciousActivities: SuspiciousActivity[] = []
  private rateLimiters = new Map<string, RateLimiter>()
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }
  
  /**
   * 不審な活動を記録
   */
  logSuspiciousActivity(activity: Omit<SuspiciousActivity, 'timestamp' | 'id'>): void {
    const suspiciousActivity: SuspiciousActivity = {
      ...activity,
      id: generateSecureRandomString(16),
      timestamp: new Date()
    }
    
    this.suspiciousActivities.push(suspiciousActivity)
    
    // 最大1000件まで保持
    if (this.suspiciousActivities.length > 1000) {
      this.suspiciousActivities = this.suspiciousActivities.slice(-1000)
    }
    
    // 重要度が高い場合は即座に警告
    if (activity.severity === 'high' || activity.severity === 'critical') {
      console.warn(`🚨 セキュリティ警告 [${activity.severity.toUpperCase()}]: ${activity.description}`)
      
      if (activity.severity === 'critical') {
        // 緊急時の処理
        this.handleCriticalThreat(suspiciousActivity)
      }
    }
  }
  
  /**
   * レート制限を確認
   */
  checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, new RateLimiter())
    }
    
    const limiter = this.rateLimiters.get(key)!
    const allowed = limiter.isAllowed(key, maxAttempts, windowMs)
    
    if (!allowed) {
      this.logSuspiciousActivity({
        type: 'rate_limit_exceeded',
        description: `レート制限を超過: ${key}`,
        severity: 'medium',
        source: key,
        metadata: { maxAttempts, windowMs }
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
   * セキュリティレポートを生成
   */
  generateSecurityReport(): SecurityReport {
    const activities = this.getSuspiciousActivities()
    const typeCount: Record<string, number> = {}
    const severityCount: Record<string, number> = {}
    
    activities.forEach(activity => {
      typeCount[activity.type] = (typeCount[activity.type] || 0) + 1
      severityCount[activity.severity] = (severityCount[activity.severity] || 0) + 1
    })
    
    return {
      totalActivities: activities.length,
      typeBreakdown: typeCount,
      severityBreakdown: severityCount,
      recentActivities: activities.slice(0, 10),
      generateTime: new Date()
    }
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
 * 入力値の深度検証
 */
export function validateInputDepth(input: any, maxDepth = 10): boolean {
  function getDepth(obj: any, currentDepth = 0): number {
    if (currentDepth > maxDepth) return currentDepth
    if (obj === null || typeof obj !== 'object') return currentDepth
    
    if (Array.isArray(obj)) {
      return Math.max(currentDepth, ...obj.map(item => getDepth(item, currentDepth + 1)))
    }
    
    return Math.max(currentDepth, ...Object.values(obj).map(value => getDepth(value, currentDepth + 1)))
  }
  
  return getDepth(input) <= maxDepth
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
 * ブラウザの開発者ツール検出
 */
export function setupDevToolsDetection(): void {
  if (typeof window !== 'undefined') {
    let devtools = false
    
    setInterval(() => {
      const threshold = 160
      
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools) {
          devtools = true
          SecurityMonitor.getInstance().logSuspiciousActivity({
            type: 'devtools_opened',
            description: '開発者ツールが開かれました',
            severity: 'low',
            source: 'devtools_detector',
            metadata: {
              outerHeight: window.outerHeight,
              innerHeight: window.innerHeight,
              outerWidth: window.outerWidth,
              innerWidth: window.innerWidth
            }
          })
        }
      } else {
        devtools = false
      }
    }, 500)
  }
}

/**
 * セキュリティ初期化
 */
export function initializeSecurity(): void {
  setupCSPMonitoring()
  setupDOMMonitoring()
  setupNetworkMonitoring()
  setupDevToolsDetection()
  
  console.log('🛡️ セキュリティシステムが初期化されました')
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
  recentActivities: SuspiciousActivity[]
  generateTime: Date
}

export interface SecurityHeaderReport {
  timestamp: Date
  headers: Record<string, string>
  recommendations: string[]
}