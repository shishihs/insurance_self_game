/**
 * Content Security Policy 動的管理システム
 * nonce生成・検証・CSPヘッダー更新機能
 */

import { generateSecureRandomString } from './security'
import { SecurityMonitor } from './security-extensions'

export interface CSPDirectives {
  'default-src'?: string[]
  'script-src'?: string[]
  'style-src'?: string[]
  'img-src'?: string[]
  'connect-src'?: string[]
  'font-src'?: string[]
  'object-src'?: string[]
  'media-src'?: string[]
  'frame-src'?: string[]
  'worker-src'?: string[]
  'manifest-src'?: string[]
  'base-uri'?: string[]
  'form-action'?: string[]
  'frame-ancestors'?: string[]
  'report-uri'?: string[]
  'report-to'?: string[]
}

/**
 * CSP動的管理システム
 */
export class CSPManager {
  private static instance: CSPManager
  private currentNonce: string = ''
  private nonceExpiry: number = 0
  private directives: CSPDirectives = {}
  private violations: any[] = []
  private reportEndpoint: string = ''

  static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager()
    }
    return CSPManager.instance
  }

  /**
   * CSPを初期化
   */
  initialize(): void {
    this.setupDefaultDirectives()
    this.setupViolationReporting()
    this.updateCSPMetaTag()
    this.scheduleNonceRotation()
    
    console.log('🛡️ CSP Manager initialized with dynamic nonce support')
  }

  /**
   * デフォルトのCSPディレクティブを設定
   */
  private setupDefaultDirectives(): void {
    this.directives = {
      'default-src': ["'self'"],
      'script-src': ["'self'", `'nonce-${this.generateNewNonce()}'`, "'strict-dynamic'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
      'font-src': ["'self'", 'data:', 'https:'],
      'connect-src': ["'self'", 'https:'],
      'media-src': ["'self'"],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'worker-src': ["'self'", 'blob:'],
      'manifest-src': ["'self'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'report-uri': ['/api/csp-violation-report']
    }
  }

  /**
   * 新しいnonceを生成
   */
  generateNewNonce(): string {
    this.currentNonce = generateSecureRandomString(32)
    this.nonceExpiry = Date.now() + (15 * 60 * 1000) // 15分間有効
    
    SecurityMonitor.getInstance().logSuspiciousActivity({
      type: 'nonce_generated',
      description: 'New CSP nonce generated',
      severity: 'low',
      source: 'csp_manager',
      metadata: { 
        nonceLength: this.currentNonce.length,
        expiryTime: new Date(this.nonceExpiry).toISOString()
      }
    })
    
    return this.currentNonce
  }

  /**
   * 現在のnonceを取得
   */
  getCurrentNonce(): string {
    if (Date.now() > this.nonceExpiry) {
      // 期限切れの場合は新しいnonceを生成
      this.generateNewNonce()
      this.updateCSPMetaTag()
    }
    
    return this.currentNonce
  }

  /**
   * nonceの有効性を検証
   */
  validateNonce(providedNonce: string): boolean {
    const now = Date.now()
    
    if (now > this.nonceExpiry) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'expired_nonce_used',
        description: 'Attempt to use expired nonce',
        severity: 'medium',
        source: 'csp_manager',
        metadata: { 
          providedNonce: `${providedNonce.slice(0, 8)  }...`,
          expired: true,
          expiryTime: new Date(this.nonceExpiry).toISOString()
        }
      })
      return false
    }

    const isValid = providedNonce === this.currentNonce
    
    if (!isValid) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'invalid_nonce_used',
        description: 'Invalid nonce provided',
        severity: 'high',
        source: 'csp_manager',
        metadata: { 
          providedNonce: `${providedNonce.slice(0, 8)  }...`,
          expectedNonce: `${this.currentNonce.slice(0, 8)  }...`
        }
      })
    }

    return isValid
  }

  /**
   * CSPディレクティブを追加・更新
   */
  setDirective(directive: keyof CSPDirectives, values: string[]): void {
    this.directives[directive] = [...values]
    this.updateCSPMetaTag()
  }

  /**
   * CSPディレクティブに値を追加
   */
  addToDirective(directive: keyof CSPDirectives, value: string): void {
    if (!this.directives[directive]) {
      this.directives[directive] = []
    }
    
    if (!this.directives[directive]!.includes(value)) {
      this.directives[directive]!.push(value)
      this.updateCSPMetaTag()
    }
  }

  /**
   * CSPディレクティブから値を削除
   */
  removeFromDirective(directive: keyof CSPDirectives, value: string): void {
    if (this.directives[directive]) {
      this.directives[directive] = this.directives[directive]!.filter(v => v !== value)
      this.updateCSPMetaTag()
    }
  }

  /**
   * CSPヘッダー文字列を生成
   */
  generateCSPHeader(forMetaTag = false): string {
    const policies: string[] = []
    
    // メタタグ経由では無効なディレクティブ（すべて拡張）
    const metaTagInvalidDirectives = [
      'frame-ancestors',  // HTTP headerでのみ有効
      'report-uri', 
      'report-to', 
      'sandbox'
    ]
    
    for (const [directive, values] of Object.entries(this.directives)) {
      // メタタグ用の場合、無効なディレクティブをスキップ
      if (forMetaTag && metaTagInvalidDirectives.includes(directive)) {
        continue
      }
      
      if (values && values.length > 0) {
        let policyValues = values.join(' ')
        
        // nonce変数を現在のnonceで置換
        policyValues = policyValues.replace(/\$\{nonce\}/g, this.getCurrentNonce())
        
        policies.push(`${directive} ${policyValues}`)
      }
    }
    
    return policies.join('; ')
  }

  /**
   * CSPメタタグを動的に更新
   */
  updateCSPMetaTag(): void {
    if (typeof document === 'undefined') return

    // 既存のCSPメタタグを削除
    const existingCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (existingCSP) {
      existingCSP.remove()
    }

    // 新しいCSPメタタグを作成
    const cspMeta = document.createElement('meta')
    cspMeta.httpEquiv = 'Content-Security-Policy'
    cspMeta.content = this.generateCSPHeader(true) // メタタグ用のCSPを生成
    document.head.appendChild(cspMeta)

    // HTMLのプレースホルダーを置換
    const htmlContent = document.documentElement.outerHTML
    if (htmlContent.includes('PLACEHOLDER_NONCE')) {
      document.documentElement.outerHTML = htmlContent.replace(
        /PLACEHOLDER_NONCE/g,
        this.getCurrentNonce()
      )
    }

    SecurityMonitor.getInstance().logSuspiciousActivity({
      type: 'csp_updated',
      description: 'CSP policy updated',
      severity: 'low',
      source: 'csp_manager',
      metadata: { 
        policy: `${cspMeta.content.slice(0, 200)  }...`,
        nonce: `${this.currentNonce.slice(0, 8)  }...`
      }
    })
  }

  /**
   * CSP違反レポート設定
   */
  private setupViolationReporting(): void {
    if (typeof document === 'undefined') return

    document.addEventListener('securitypolicyviolation', (event: any) => {
      const violation = {
        blockedURI: event.blockedURI,
        columnNumber: event.columnNumber,
        documentURI: event.documentURI,
        effectiveDirective: event.effectiveDirective,
        lineNumber: event.lineNumber,
        originalPolicy: event.originalPolicy,
        referrer: event.referrer,
        sample: event.sample,
        sourceFile: event.sourceFile,
        statusCode: event.statusCode,
        violatedDirective: event.violatedDirective,
        timestamp: new Date().toISOString()
      }

      this.violations.push(violation)
      
      // 最大100件まで保持
      if (this.violations.length > 100) {
        this.violations = this.violations.slice(-100)
      }

      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'csp_violation',
        description: `CSP violation: ${event.violatedDirective}`,
        severity: this.assessViolationSeverity(event),
        source: 'csp_violation_handler',
        metadata: violation
      })

      // 外部レポートエンドポイントに送信
      if (this.reportEndpoint) {
        this.sendViolationReport(violation)
      }
    })
  }

  /**
   * CSP違反の重要度を評価
   */
  private assessViolationSeverity(event: any): 'low' | 'medium' | 'high' | 'critical' {
    // スクリプト関連の違反は高リスク
    if (event.violatedDirective.startsWith('script-src')) {
      return event.blockedURI.includes('javascript:') || 
             event.blockedURI.includes('data:') ? 'critical' : 'high'
    }
    
    // インライン実行の試行
    if (event.sample && (
      event.sample.includes('eval(') ||
      event.sample.includes('Function(') ||
      event.sample.includes('setTimeout(') ||
      event.sample.includes('setInterval(')
    )) {
      return 'high'
    }
    
    // 外部リソースの読み込み試行
    if (event.effectiveDirective.includes('-src') && 
        !event.blockedURI.startsWith(window.location.origin)) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * 違反レポートを外部エンドポイントに送信
   */
  private async sendViolationReport(violation: any): Promise<void> {
    try {
      await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          'csp-report': violation
        })
      })
    } catch (error) {
      console.warn('CSP violation report failed:', error)
    }
  }

  /**
   * 定期的なnonce更新をスケジュール
   */
  private scheduleNonceRotation(): void {
    // 10分ごとにnonceを更新
    setInterval(() => {
      this.generateNewNonce()
      this.updateCSPMetaTag()
    }, 10 * 60 * 1000)
  }

  /**
   * 安全なスクリプト実行
   */
  executeScriptWithNonce(code: string): boolean {
    if (typeof document === 'undefined') return false

    try {
      const script = document.createElement('script')
      script.nonce = this.getCurrentNonce()
      script.textContent = code
      
      document.head.appendChild(script)
      document.head.removeChild(script)
      
      return true
    } catch (error) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'safe_script_execution_failed',
        description: 'Failed to execute script with nonce',
        severity: 'medium',
        source: 'csp_manager',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          codeLength: code.length
        }
      })
      return false
    }
  }

  /**
   * 安全なスタイル追加
   */
  addStyleWithNonce(css: string): boolean {
    if (typeof document === 'undefined') return false

    try {
      const style = document.createElement('style')
      style.nonce = this.getCurrentNonce()
      style.textContent = css
      
      document.head.appendChild(style)
      
      return true
    } catch (error) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'safe_style_addition_failed',
        description: 'Failed to add style with nonce',
        severity: 'medium',
        source: 'csp_manager',
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          cssLength: css.length
        }
      })
      return false
    }
  }

  /**
   * CSP違反履歴を取得
   */
  getViolationHistory(limit = 50): any[] {
    return this.violations.slice(-limit)
  }

  /**
   * CSP違反統計を取得
   */
  getViolationStats(): { total: number; byDirective: Record<string, number>; bySource: Record<string, number> } {
    const stats = {
      total: this.violations.length,
      byDirective: {} as Record<string, number>,
      bySource: {} as Record<string, number>
    }

    this.violations.forEach(violation => {
      const directive = violation.effectiveDirective || 'unknown'
      const source = violation.sourceFile || 'inline'
      
      stats.byDirective[directive] = (stats.byDirective[directive] || 0) + 1
      stats.bySource[source] = (stats.bySource[source] || 0) + 1
    })

    return stats
  }

  /**
   * レポートエンドポイントを設定
   */
  setReportEndpoint(endpoint: string): void {
    this.reportEndpoint = endpoint
    this.addToDirective('report-uri', endpoint)
  }

  /**
   * CSPのデバッグ情報を出力
   */
  debugCSP(): void {
    console.group('🛡️ CSP Debug Information')
    console.log('Current Nonce:', this.currentNonce)
    console.log('Nonce Expiry:', new Date(this.nonceExpiry))
    console.log('Current Policy:', this.generateCSPHeader())
    console.log('Violation Count:', this.violations.length)
    console.log('Recent Violations:', this.violations.slice(-5))
    console.groupEnd()
  }
}

/**
 * セキュリティヘッダー管理
 */
export class SecurityHeaderManager {
  private static instance: SecurityHeaderManager

  static getInstance(): SecurityHeaderManager {
    if (!SecurityHeaderManager.instance) {
      SecurityHeaderManager.instance = new SecurityHeaderManager()
    }
    return SecurityHeaderManager.instance
  }

  /**
   * すべてのセキュリティヘッダーを設定
   */
  initializeSecurityHeaders(): void {
    this.setContentTypeOptions()
    // X-Frame-Optionsはmetaタグでは無効なため削除
    // this.setFrameOptions()
    this.setXSSProtection()
    this.setReferrerPolicy()
    this.setPermissionsPolicy()
    this.setStrictTransportSecurity()
    this.setCrossOriginPolicies()
    
    console.log('🛡️ Security headers initialized (X-Frame-Options skipped for meta tag compatibility)')
  }

  /**
   * X-Content-Type-Options ヘッダー
   */
  private setContentTypeOptions(): void {
    this.updateMetaTag('X-Content-Type-Options', 'nosniff')
  }

  /**
   * X-Frame-Options ヘッダー
   */
  private setFrameOptions(): void {
    this.updateMetaTag('X-Frame-Options', 'DENY')
  }

  /**
   * X-XSS-Protection ヘッダー
   */
  private setXSSProtection(): void {
    this.updateMetaTag('X-XSS-Protection', '1; mode=block')
  }

  /**
   * Referrer Policy ヘッダー
   */
  private setReferrerPolicy(): void {
    const meta = document.querySelector('meta[name="referrer"]') as HTMLMetaElement
    if (!meta) {
      const newMeta = document.createElement('meta')
      newMeta.name = 'referrer'
      newMeta.content = 'strict-origin-when-cross-origin'
      document.head.appendChild(newMeta)
    }
  }

  /**
   * Permissions Policy ヘッダー
   */
  private setPermissionsPolicy(): void {
    const policy = [
      'geolocation=()',
      'microphone=()', 
      'camera=()',
      'fullscreen=(self)',
      'payment=()',
      'usb=()',
      'serial=()',
      'hid=()',
      'midi=()',
      'clipboard-read=()',
      'clipboard-write=(self)',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'ambient-light-sensor=()',
      'encrypted-media=()',
      'picture-in-picture=()',
      'display-capture=()'
    ].join(', ')
    
    this.updateMetaTag('Permissions-Policy', policy)
  }

  /**
   * Strict-Transport-Security ヘッダー
   */
  private setStrictTransportSecurity(): void {
    // HTTPSでのみ有効
    if (window.location.protocol === 'https:') {
      this.updateMetaTag('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
    }
  }

  /**
   * Cross-Origin policies
   */
  private setCrossOriginPolicies(): void {
    this.updateMetaTag('Cross-Origin-Embedder-Policy', 'require-corp')
    this.updateMetaTag('Cross-Origin-Opener-Policy', 'same-origin')
    this.updateMetaTag('Cross-Origin-Resource-Policy', 'same-origin')
  }

  /**
   * メタタグを更新またはを作成
   */
  private updateMetaTag(httpEquiv: string, content: string): void {
    if (typeof document === 'undefined') return

    let meta = document.querySelector(`meta[http-equiv="${httpEquiv}"]`) as HTMLMetaElement
    
    if (!meta) {
      meta = document.createElement('meta')
      meta.httpEquiv = httpEquiv
      document.head.appendChild(meta)
    }
    
    meta.content = content
  }

  /**
   * セキュリティヘッダーの検証
   */
  validateSecurityHeaders(): { valid: string[]; missing: string[]; recommendations: string[] } {
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'X-XSS-Protection',
      'Strict-Transport-Security',
      'Cross-Origin-Embedder-Policy',
      'Cross-Origin-Opener-Policy'
    ]

    const valid: string[] = []
    const missing: string[] = []
    const recommendations: string[] = []

    requiredHeaders.forEach(header => {
      const meta = document.querySelector(`meta[http-equiv="${header}"]`)
      if (meta) {
        valid.push(header)
      } else {
        missing.push(header)
      }
    })

    // HTTPSチェック
    if (window.location.protocol !== 'https:') {
      recommendations.push('HTTPSの使用を強く推奨します')
    }

    // Referrer Policyチェック
    const referrerMeta = document.querySelector('meta[name="referrer"]')
    if (!referrerMeta) {
      recommendations.push('Referrer Policyの設定を推奨します')
    }

    return { valid, missing, recommendations }
  }
}

// 自動初期化は削除（main.tsからの初期化で重複を防ぐ）
// 手動初期化が必要な場合は、以下のコードを使用：
// const cspManager = CSPManager.getInstance()
// const headerManager = SecurityHeaderManager.getInstance()
// cspManager.initialize()
// headerManager.initializeSecurityHeaders()