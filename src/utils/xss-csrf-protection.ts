/**
 * XSS・CSRF攻撃防止対策の包括的実装
 * Content Security Policy対応とnonce生成機能付き
 */

import { sanitizeInput } from './security'
import { SecurityMonitor } from './security-extensions'

/**
 * セキュアなCSRFトークン生成関数
 */
function generateCSRFToken(): string {
  // ブラウザ環境でのセキュアなランダム値生成
  const array = new Uint8Array(32)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    window.crypto.getRandomValues(array)
  } else {
    // フォールバック：Math.randomを使用（テスト環境用）
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * CSRFトークンの検証関数
 */
function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken || token.length !== expectedToken.length) {
    return false
  }
  
  // タイミング攻撃防止のための定数時間比較
  let result = 0
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i)
  }
  return result === 0
}

/**
 * XSS攻撃防止のための包括的対策
 */
export class XSSProtection {
  private static instance: XSSProtection
  private trustedDomains: string[] = []
  private allowedTags: string[] = ['b', 'i', 'em', 'strong', 'br', 'p']
  private readonly allowedAttributes: string[] = ['class', 'data-*']

  static getInstance(): XSSProtection {
    if (!XSSProtection.instance) {
      XSSProtection.instance = new XSSProtection()
    }
    return XSSProtection.instance
  }

  /**
   * 信頼できるドメインを設定
   */
  setTrustedDomains(domains: string[]): void {
    this.trustedDomains = domains.map(domain => domain.toLowerCase())
  }

  /**
   * 許可するHTMLタグを設定
   */
  setAllowedTags(tags: string[]): void {
    this.allowedTags = tags.map(tag => tag.toLowerCase())
  }

  /**
   * HTML文字列の厳格なサニタイゼーション
   */
  sanitizeHTML(html: string): string {
    if (typeof html !== 'string') {
      return ''
    }

    // 基本的なHTMLエンティティエンコード
    let sanitized = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')

    // 許可されたタグのみ復元（非常に限定的）
    for (const tag of this.allowedTags) {
      const openTagRegex = new RegExp(`&lt;(${tag})&gt;`, 'gi')
      const closeTagRegex = new RegExp(`&lt;\\/(${tag})&gt;`, 'gi')
      
      sanitized = sanitized
        .replace(openTagRegex, `<$1>`)
        .replace(closeTagRegex, `</$1>`)
    }

    return sanitized.slice(0, 10000) // 長さ制限
  }

  /**
   * JavaScript文字列のエスケープ
   */
  escapeJavaScript(str: string): string {
    if (typeof str !== 'string') {
      return ''
    }

    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\u0008]/g, '\\b')
      .replace(/\f/g, '\\f')
      .replace(/\v/g, '\\v')
      .replace(/[\u0000]/g, '\\0')
      .replace(/[\u0001-\u001f\u007f-\u009f]/g, (match) => {
        return `\\u${  (`0000${  match.charCodeAt(0).toString(16)}`).slice(-4)}`
      })
  }

  /**
   * URLの安全性検証とサニタイゼーション
   */
  sanitizeURL(url: string): string {
    if (typeof url !== 'string') {
      return ''
    }

    try {
      const parsedURL = new URL(url)
      
      // 許可されたプロトコルのみ
      const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
      if (!allowedProtocols.includes(parsedURL.protocol)) {
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'blocked_dangerous_protocol',
          description: `危険なプロトコルをブロック: ${parsedURL.protocol}`,
          severity: 'high',
          source: 'xss_protection',
          metadata: { originalUrl: url, protocol: parsedURL.protocol }
        })
        return ''
      }

      // 信頼できるドメインかチェック
      if (this.trustedDomains.length > 0) {
        const isHostTrusted = this.trustedDomains.some(domain => 
          parsedURL.hostname.endsWith(domain)
        )
        
        if (!isHostTrusted && parsedURL.protocol !== 'mailto:' && parsedURL.protocol !== 'tel:') {
          SecurityMonitor.getInstance().logSuspiciousActivity({
            type: 'untrusted_domain',
            description: `信頼されていないドメイン: ${parsedURL.hostname}`,
            severity: 'medium',
            source: 'xss_protection',
            metadata: { originalUrl: url, hostname: parsedURL.hostname }
          })
          return ''
        }
      }

      return parsedURL.toString()
    } catch (error) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'invalid_url',
        description: `無効なURL: ${url}`,
        severity: 'medium',
        source: 'xss_protection',
        metadata: { originalUrl: url, error: error instanceof Error ? error.message : String(error) }
      })
      return ''
    }
  }

  /**
   * DOM操作時の安全性チェック
   */
  validateDOMOperation(element: Element, operation: string, value?: string): boolean {
    if (!element || !operation) {
      return false
    }

    // innerHTML操作を制限
    if (operation === 'innerHTML' && value) {
      const sanitizedValue = this.sanitizeHTML(value)
      if (sanitizedValue !== value) {
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'blocked_unsafe_dom',
          description: 'unsafe innerHTML操作をブロック',
          severity: 'high',
          source: 'xss_protection',
          metadata: { 
            operation,
            originalValue: value.slice(0, 200),
            sanitizedValue: sanitizedValue.slice(0, 200)
          }
        })
        return false
      }
    }

    // 危険な属性の設定を制限
    if (operation === 'setAttribute' && value) {
      const [attrName] = (value).split('=', 1)
      const dangerousAttributes = ['onload', 'onerror', 'onclick', 'onmouseover', 'style']
      
      if (dangerousAttributes.includes(attrName.toLowerCase())) {
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'blocked_dangerous_attribute',
          description: `危険な属性設定をブロック: ${attrName}`,
          severity: 'high',
          source: 'xss_protection',
          metadata: { operation, attributeName: attrName }
        })
        return false
      }
    }

    return true
  }
}

/**
 * CSRF攻撃防止のための包括的対策
 */
export class CSRFProtection {
  private static instance: CSRFProtection
  private readonly tokenStore = new Map<string, { token: string; expires: number }>()
  private validOrigins: string[] = []

  static getInstance(): CSRFProtection {
    if (!CSRFProtection.instance) {
      CSRFProtection.instance = new CSRFProtection()
    }
    return CSRFProtection.instance
  }

  /**
   * 有効なオリジンを設定
   */
  setValidOrigins(origins: string[]): void {
    this.validOrigins = origins.map(origin => origin.toLowerCase())
  }

  /**
   * CSRFトークンの生成と管理
   */
  generateTokenForAction(action: string, expiryMinutes = 30): string {
    const token = generateCSRFToken()
    const expires = Date.now() + (expiryMinutes * 60 * 1000)
    
    this.tokenStore.set(action, { token, expires })
    
    // 期限切れトークンをクリーンアップ
    this.cleanupExpiredTokens()
    
    return token
  }

  /**
   * CSRFトークンの検証
   */
  validateTokenForAction(action: string, providedToken: string): boolean {
    const tokenData = this.tokenStore.get(action)
    
    if (!tokenData) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'csrf_token_missing',
        description: `CSRF token not found for action: ${action}`,
        severity: 'high',
        source: 'csrf_protection',
        metadata: { action }
      })
      return false
    }

    if (Date.now() > tokenData.expires) {
      this.tokenStore.delete(action)
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'csrf_token_expired',
        description: `CSRF token expired for action: ${action}`,
        severity: 'medium',
        source: 'csrf_protection',
        metadata: { action }
      })
      return false
    }

    const isValid = validateCSRFToken(providedToken, tokenData.token)
    
    if (!isValid) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'csrf_token_invalid',
        description: `Invalid CSRF token for action: ${action}`,
        severity: 'high',
        source: 'csrf_protection',
        metadata: { action }
      })
    }

    // 使用後はトークンを削除（ワンタイムトークン）
    if (isValid) {
      this.tokenStore.delete(action)
    }

    return isValid
  }

  /**
   * リクエストのオリジン検証
   */
  validateOrigin(origin: string): boolean {
    if (!origin) {
      return false
    }

    const normalizedOrigin = origin.toLowerCase()
    
    if (this.validOrigins.length === 0) {
      // 設定されていない場合は現在のオリジンを使用
      return normalizedOrigin === window.location.origin.toLowerCase()
    }

    const isValid = this.validOrigins.includes(normalizedOrigin)
    
    if (!isValid) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'csrf_invalid_origin',
        description: `Invalid origin: ${origin}`,
        severity: 'high',
        source: 'csrf_protection',
        metadata: { 
          providedOrigin: origin,
          validOrigins: this.validOrigins 
        }
      })
    }

    return isValid
  }

  /**
   * Refererヘッダーの検証
   */
  validateReferer(referer: string): boolean {
    if (!referer) {
      return false // Refererが存在しない場合は拒否
    }

    try {
      const refererURL = new URL(referer)
      const currentOrigin = window.location.origin.toLowerCase()
      
      return refererURL.origin.toLowerCase() === currentOrigin
    } catch {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'csrf_invalid_referer',
        description: `Invalid referer: ${referer}`,
        severity: 'medium',
        source: 'csrf_protection',
        metadata: { referer }
      })
      return false
    }
  }

  /**
   * 期限切れトークンのクリーンアップ
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now()
    
    for (const [action, tokenData] of this.tokenStore.entries()) {
      if (now > tokenData.expires) {
        this.tokenStore.delete(action)
      }
    }
  }

  /**
   * すべてのトークンをクリア
   */
  clearAllTokens(): void {
    this.tokenStore.clear()
  }
}

/**
 * Content Security Policy（CSP）の動的管理
 */
export class CSPManager {
  private static instance: CSPManager
  private readonly nonces = new Set<string>()
  private readonly cspDirectives = new Map<string, string[]>()

  static getInstance(): CSPManager {
    if (!CSPManager.instance) {
      CSPManager.instance = new CSPManager()
    }
    return CSPManager.instance
  }

  /**
   * スクリプト用のnonceを生成
   */
  generateScriptNonce(): string {
    const nonce = generateCSRFToken() // 32文字のランダム文字列
    this.nonces.add(nonce)
    
    // 1時間後に自動削除
    setTimeout(() => {
      this.nonces.delete(nonce)
    }, 60 * 60 * 1000)
    
    return nonce
  }

  /**
   * nonceの有効性を検証
   */
  validateNonce(nonce: string): boolean {
    return this.nonces.has(nonce)
  }

  /**
   * CSPディレクティブを設定
   */
  setDirective(directive: string, values: string[]): void {
    this.cspDirectives.set(directive, [...values])
  }

  /**
   * CSPディレクティブに値を追加
   */
  addToDirective(directive: string, value: string): void {
    const existing = this.cspDirectives.get(directive) || []
    if (!existing.includes(value)) {
      existing.push(value)
      this.cspDirectives.set(directive, existing)
    }
  }

  /**
   * 現在のCSPポリシーを文字列として生成
   */
  generateCSPHeader(): string {
    const directives: string[] = []
    
    for (const [directive, values] of this.cspDirectives.entries()) {
      directives.push(`${directive} ${values.join(' ')}`)
    }
    
    return directives.join('; ')
  }

  /**
   * メタタグとしてCSPを動的に設定
   */
  applyCSPToDocument(): void {
    // 既存のCSPメタタグを削除
    const existingMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
    if (existingMeta) {
      existingMeta.remove()
    }

    // 新しいCSPメタタグを追加
    const meta = document.createElement('meta')
    meta.httpEquiv = 'Content-Security-Policy'
    meta.content = this.generateCSPHeader()
    document.head.appendChild(meta)
    
    console.log('🛡️ CSP updated:', meta.content)
  }

  /**
   * 安全なスクリプト実行のヘルパー
   */
  executeScriptSafely(code: string, nonce?: string): boolean {
    const scriptNonce = nonce || this.generateScriptNonce()
    
    if (!this.validateNonce(scriptNonce)) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'invalid_script_nonce',
        description: 'Invalid nonce for script execution',
        severity: 'high',
        source: 'csp_manager',
        metadata: { nonce: scriptNonce }
      })
      return false
    }

    try {
      const script = document.createElement('script')
      script.nonce = scriptNonce
      script.textContent = code
      document.head.appendChild(script)
      document.head.removeChild(script)
      return true
    } catch (error) {
      SecurityMonitor.getInstance().logSuspiciousActivity({
        type: 'script_execution_failed',
        description: 'Safe script execution failed',
        severity: 'medium',
        source: 'csp_manager',
        metadata: { 
          error: error instanceof Error ? error.message : String(error),
          nonce: scriptNonce
        }
      })
      return false
    }
  }
}

/**
 * 統合セキュリティインターセプター
 */
export class SecurityInterceptor {
  private static instance: SecurityInterceptor
  private readonly xssProtection = XSSProtection.getInstance()
  private readonly csrfProtection = CSRFProtection.getInstance()
  private readonly cspManager = CSPManager.getInstance()

  static getInstance(): SecurityInterceptor {
    if (!SecurityInterceptor.instance) {
      SecurityInterceptor.instance = new SecurityInterceptor()
    }
    return SecurityInterceptor.instance
  }

  /**
   * フォーム送信の包括的検証
   */
  validateFormSubmission(form: HTMLFormElement, csrfToken?: string): boolean {
    const formData = new FormData(form)
    let isValid = true

    // CSRF トークン検証
    if (csrfToken) {
      const action = form.getAttribute('data-action') || 'form_submit'
      if (!this.csrfProtection.validateTokenForAction(action, csrfToken)) {
        isValid = false
      }
    }

    // オリジン検証
    const origin = document.referrer || window.location.origin
    if (!this.csrfProtection.validateOrigin(origin)) {
      isValid = false
    }

    // 入力値のサニタイゼーション
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        try {
          const sanitized = sanitizeInput(value)
          if (sanitized !== value) {
            SecurityMonitor.getInstance().logSuspiciousActivity({
              type: 'form_input_sanitized',
              description: `Form input was sanitized: ${key}`,
              severity: 'low',
              source: 'security_interceptor',
              metadata: { 
                fieldName: key,
                original: value.slice(0, 100),
                sanitized: sanitized.slice(0, 100)
              }
            })
          }
        } catch (error) {
          isValid = false
          SecurityMonitor.getInstance().logSuspiciousActivity({
            type: 'form_input_validation_failed',
            description: `Form input validation failed: ${key}`,
            severity: 'high',
            source: 'security_interceptor',
            metadata: { 
              fieldName: key,
              error: error instanceof Error ? error.message : String(error)
            }
          })
        }
      }
    }

    return isValid
  }

  /**
   * AJAX リクエストの包括的検証
   */
  validateAjaxRequest(url: string, method: string, headers: Record<string, string>, data?: any): boolean {
    let isValid = true

    // URL の安全性検証
    const sanitizedURL = this.xssProtection.sanitizeURL(url)
    if (!sanitizedURL) {
      isValid = false
    }

    // CSRF トークン確認（POST, PUT, DELETE の場合）
    const methodsRequiringCSRF = ['POST', 'PUT', 'DELETE', 'PATCH']
    if (methodsRequiringCSRF.includes(method.toUpperCase())) {
      const csrfToken = headers['X-CSRF-Token']
      if (!csrfToken) {
        SecurityMonitor.getInstance().logSuspiciousActivity({
          type: 'missing_csrf_token',
          description: `CSRF token missing for ${method} request`,
          severity: 'high',
          source: 'security_interceptor',
          metadata: { url, method }
        })
        isValid = false
      }
    }

    // データペイロードの検証
    if (data && typeof data === 'object') {
      try {
        const jsonString = JSON.stringify(data)
        if (jsonString.length > 100000) { // 100KB制限
          SecurityMonitor.getInstance().logSuspiciousActivity({
            type: 'oversized_request_payload',
            description: `Request payload too large: ${jsonString.length} bytes`,
            severity: 'medium',
            source: 'security_interceptor',
            metadata: { url, method, payloadSize: jsonString.length }
          })
          isValid = false
        }
      } catch (error) {
        isValid = false
      }
    }

    return isValid
  }

  /**
   * 包括的セキュリティ初期化
   */
  initialize(): void {
    // 信頼できるドメインの設定
    this.xssProtection.setTrustedDomains([
      window.location.hostname,
      'cdn.jsdelivr.net',
      'unpkg.com'
    ])

    // 有効なオリジンの設定
    this.csrfProtection.setValidOrigins([window.location.origin])

    // CSPの初期設定
    this.cspManager.setDirective('default-src', ["'self'"])
    this.cspManager.setDirective('script-src', ["'self'", "'unsafe-inline'"])
    this.cspManager.setDirective('style-src', ["'self'", "'unsafe-inline'"])
    this.cspManager.setDirective('img-src', ["'self'", 'data:', 'blob:'])
    this.cspManager.setDirective('connect-src', ["'self'"])
    this.cspManager.setDirective('font-src', ["'self'", 'data:'])
    this.cspManager.setDirective('object-src', ["'none'"])
    this.cspManager.setDirective('frame-src', ["'none'"])

    console.log('🛡️ Security Interceptor initialized')
  }
}

// 自動初期化
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    SecurityInterceptor.getInstance().initialize()
  })
}

// Classes are already exported above using 'export class' syntax