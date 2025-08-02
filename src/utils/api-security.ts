/**
 * API セキュリティ強化システム
 * HTTPS強制、APIキー管理、CORS制御、リクエスト検証
 */

import { generateSecureHash, generateSecureRandomString } from './security'
import { SecurityMonitor } from './security-extensions'
import { SecurityAuditLogger } from './security-audit-logger'

export interface APISecurityConfig {
  enforceHTTPS: boolean
  allowedOrigins: string[]
  allowedMethods: string[]
  maxRequestSize: number
  rateLimitConfig: {
    windowMs: number
    maxRequests: number
    blockDurationMs: number
  }
  requireAPIKey: boolean
  enableRequestSigning: boolean
  corsPreflightMaxAge: number
}

export interface APIKeyConfig {
  keyId: string
  keyValue: string
  permissions: string[]
  expiresAt: Date
  lastUsed?: Date
  usageCount: number
  rateLimit: {
    maxRequestsPerMinute: number
    maxRequestsPerHour: number
  }
}

export interface SignedRequest {
  method: string
  url: string
  timestamp: number
  nonce: string
  signature: string
  payload?: string
}

/**
 * API セキュリティマネージャー
 */
export class APISecurityManager {
  private static instance: APISecurityManager
  private config: APISecurityConfig
  private readonly apiKeys = new Map<string, APIKeyConfig>()
  private readonly requestCache = new Map<string, number>()
  private readonly auditLogger = SecurityAuditLogger.getInstance()
  private readonly securityMonitor = SecurityMonitor.getInstance()

  private constructor() {
    this.config = {
      enforceHTTPS: true,
      allowedOrigins: [
        window.location.origin,
        'https://shishihs.github.io'
      ],
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      maxRequestSize: 10 * 1024 * 1024, // 10MB
      rateLimitConfig: {
        windowMs: 60 * 1000, // 1分
        maxRequests: 100,
        blockDurationMs: 5 * 60 * 1000 // 5分ブロック
      },
      requireAPIKey: false, // ゲームアプリでは通常不要
      enableRequestSigning: false,
      corsPreflightMaxAge: 86400 // 24時間
    }
  }

  static getInstance(): APISecurityManager {
    if (!APISecurityManager.instance) {
      APISecurityManager.instance = new APISecurityManager()
    }
    return APISecurityManager.instance
  }

  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<APISecurityConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.auditLogger.logSecurityEvent(
      'api_security_config_updated',
      'low',
      'api_security_manager',
      'API セキュリティ設定が更新されました',
      { updatedFields: Object.keys(newConfig) }
    )
  }

  /**
   * HTTPS 強制チェック
   */
  enforceHTTPS(request: Request): boolean {
    if (!this.config.enforceHTTPS) return true

    const url = new URL(request.url)
    const isSecure = url.protocol === 'https:' || 
                    url.hostname === 'localhost' || 
                    url.hostname === '127.0.0.1'

    if (!isSecure) {
      this.auditLogger.logSecurityEvent(
        'insecure_api_request_blocked',
        'high',
        'api_security_manager',
        `非HTTPS リクエストをブロック: ${request.url}`,
        { 
          url: request.url,
          method: request.method,
          protocol: url.protocol 
        }
      )
      return false
    }

    return true
  }

  /**
   * CORS 検証
   */
  validateCORS(request: Request, origin?: string): boolean {
    const requestOrigin = origin || request.headers.get('Origin')
    
    if (!requestOrigin) {
      // Same-origin リクエストの場合は許可
      return true
    }

    const isAllowed = this.config.allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true
      if (allowedOrigin === requestOrigin) return true
      // ワイルドカードサブドメイン対応
      if (allowedOrigin.startsWith('*.')) {
        const baseDomain = allowedOrigin.slice(2)
        return requestOrigin.endsWith(baseDomain)
      }
      return false
    })

    if (!isAllowed) {
      this.auditLogger.logSecurityEvent(
        'cors_violation',
        'high',
        'api_security_manager',
        `CORS 違反: 許可されていないオリジンからのリクエスト`,
        { 
          origin: requestOrigin,
          allowedOrigins: this.config.allowedOrigins,
          url: request.url,
          method: request.method
        }
      )
    }

    return isAllowed
  }

  /**
   * メソッド検証
   */
  validateMethod(request: Request): boolean {
    const isAllowed = this.config.allowedMethods.includes(request.method.toUpperCase())

    if (!isAllowed) {
      this.auditLogger.logSecurityEvent(
        'invalid_http_method',
        'medium',
        'api_security_manager',
        `許可されていないHTTPメソッド: ${request.method}`,
        { 
          method: request.method,
          allowedMethods: this.config.allowedMethods,
          url: request.url
        }
      )
    }

    return isAllowed
  }

  /**
   * リクエストサイズ検証
   */
  async validateRequestSize(request: Request): Promise<boolean> {
    const contentLength = request.headers.get('Content-Length')
    let size = 0

    if (contentLength) {
      size = parseInt(contentLength, 10)
    } else if (request.body) {
      // Content-Length が設定されていない場合は body を読む
      try {
        const clonedRequest = request.clone()
        const body = await clonedRequest.text()
        size = new Blob([body]).size
      } catch (error) {
        this.auditLogger.logSecurityEvent(
          'request_size_validation_error',
          'medium',
          'api_security_manager',
          'リクエストサイズの検証中にエラーが発生',
          { error: error instanceof Error ? error.message : String(error) }
        )
        return false
      }
    }

    const isValid = size <= this.config.maxRequestSize

    if (!isValid) {
      this.auditLogger.logSecurityEvent(
        'oversized_request_blocked',
        'high',
        'api_security_manager',
        `サイズ制限を超えるリクエストをブロック: ${size} bytes`,
        { 
          requestSize: size,
          maxSize: this.config.maxRequestSize,
          url: request.url,
          method: request.method
        }
      )
    }

    return isValid
  }

  /**
   * レート制限チェック
   */
  checkRateLimit(clientId: string): boolean {
    const now = Date.now()
    const key = `rate_limit_${clientId}`
    const windowStart = now - this.config.rateLimitConfig.windowMs
    
    // 現在のウィンドウ内のリクエスト数を取得
    const requestTimes = this.getRequestTimes(clientId)
    const recentRequests = requestTimes.filter(time => time > windowStart)
    
    const isAllowed = recentRequests.length < this.config.rateLimitConfig.maxRequests

    if (isAllowed) {
      // リクエスト時刻を記録
      recentRequests.push(now)
      this.setRequestTimes(clientId, recentRequests)
    } else {
      // レート制限違反をログ
      this.auditLogger.logSecurityEvent(
        'api_rate_limit_exceeded',
        'high',
        'api_security_manager',
        `API レート制限を超過: クライアント ${clientId}`,
        {
          clientId,
          requestCount: recentRequests.length,
          maxRequests: this.config.rateLimitConfig.maxRequests,
          windowMs: this.config.rateLimitConfig.windowMs
        }
      )

      // ブロック時間を設定
      this.setClientBlock(clientId, now + this.config.rateLimitConfig.blockDurationMs)
    }

    return isAllowed
  }

  /**
   * クライアントブロック状態の確認
   */
  isClientBlocked(clientId: string): boolean {
    const blockUntil = this.getClientBlockTime(clientId)
    const now = Date.now()
    
    if (blockUntil && now < blockUntil) {
      return true
    }

    // ブロック期間が終了していたらクリア
    if (blockUntil && now >= blockUntil) {
      this.clearClientBlock(clientId)
    }

    return false
  }

  /**
   * APIキーの生成
   */
  generateAPIKey(permissions: string[] = [], expirationHours = 24 * 30): APIKeyConfig {
    const keyId = generateSecureRandomString(16)
    const keyValue = generateSecureRandomString(64)
    const expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000)

    const apiKey: APIKeyConfig = {
      keyId,
      keyValue,
      permissions,
      expiresAt,
      usageCount: 0,
      rateLimit: {
        maxRequestsPerMinute: 60,
        maxRequestsPerHour: 1000
      }
    }

    this.apiKeys.set(keyId, apiKey)

    this.auditLogger.logSecurityEvent(
      'api_key_generated',
      'low',
      'api_security_manager',
      `新しいAPIキーが生成されました: ${keyId}`,
      { 
        keyId,
        permissions,
        expiresAt: expiresAt.toISOString()
      }
    )

    return apiKey
  }

  /**
   * APIキーの検証
   */
  validateAPIKey(keyId: string, keyValue: string, requiredPermission?: string): boolean {
    const apiKey = this.apiKeys.get(keyId)

    if (!apiKey) {
      this.auditLogger.logSecurityEvent(
        'invalid_api_key',
        'high',
        'api_security_manager',
        `無効なAPIキーID: ${keyId}`,
        { keyId }
      )
      return false
    }

    // 有効期限チェック
    if (new Date() > apiKey.expiresAt) {
      this.auditLogger.logSecurityEvent(
        'expired_api_key',
        'medium',
        'api_security_manager',
        `期限切れのAPIキー: ${keyId}`,
        { keyId, expiresAt: apiKey.expiresAt.toISOString() }
      )
      return false
    }

    // キー値の検証
    if (apiKey.keyValue !== keyValue) {
      this.auditLogger.logSecurityEvent(
        'api_key_mismatch',
        'high',
        'api_security_manager',
        `APIキー値の不一致: ${keyId}`,
        { keyId }
      )
      return false
    }

    // 権限チェック
    if (requiredPermission && !apiKey.permissions.includes(requiredPermission)) {
      this.auditLogger.logSecurityEvent(
        'insufficient_api_permissions',
        'medium',
        'api_security_manager',
        `不十分なAPI権限: ${keyId}, 必要な権限: ${requiredPermission}`,
        { 
          keyId,
          requiredPermission,
          availablePermissions: apiKey.permissions
        }
      )
      return false
    }

    // レート制限チェック
    if (!this.checkAPIKeyRateLimit(keyId)) {
      return false
    }

    // 使用回数を更新
    apiKey.usageCount++
    apiKey.lastUsed = new Date()

    return true
  }

  /**
   * リクエスト署名の生成
   */
  async signRequest(
    method: string, 
    url: string, 
    payload: string = '', 
    secretKey: string
  ): Promise<SignedRequest> {
    const timestamp = Date.now()
    const nonce = generateSecureRandomString(16)
    
    const signatureData = `${method}\n${url}\n${timestamp}\n${nonce}\n${payload}`
    const signature = await generateSecureHash(signatureData + secretKey)

    return {
      method,
      url,
      timestamp,
      nonce,
      signature,
      payload: payload || undefined
    }
  }

  /**
   * リクエスト署名の検証
   */
  async verifyRequestSignature(
    signedRequest: SignedRequest, 
    secretKey: string,
    maxAgeMs = 5 * 60 * 1000 // 5分
  ): Promise<boolean> {
    const now = Date.now()
    
    // タイムスタンプチェック
    if (now - signedRequest.timestamp > maxAgeMs) {
      this.auditLogger.logSecurityEvent(
        'expired_request_signature',
        'medium',
        'api_security_manager',
        '期限切れのリクエスト署名',
        { 
          timestamp: signedRequest.timestamp,
          currentTime: now,
          maxAge: maxAgeMs
        }
      )
      return false
    }

    // nonce の重複チェック（リプレイ攻撃対策）
    const nonceKey = `nonce_${signedRequest.nonce}`
    if (this.requestCache.has(nonceKey)) {
      this.auditLogger.logSecurityEvent(
        'duplicate_nonce',
        'high',
        'api_security_manager',
        'nonce の重複検出（リプレイ攻撃の可能性）',
        { nonce: signedRequest.nonce }
      )
      return false
    }

    // 署名の再計算と検証
    const signatureData = `${signedRequest.method}\n${signedRequest.url}\n${signedRequest.timestamp}\n${signedRequest.nonce}\n${signedRequest.payload || ''}`
    const expectedSignature = await generateSecureHash(signatureData + secretKey)

    const isValid = expectedSignature === signedRequest.signature

    if (isValid) {
      // nonce をキャッシュに登録（重複防止）
      this.requestCache.set(nonceKey, signedRequest.timestamp)
      
      // 古いnonce をクリーンアップ（メモリ使用量制御）
      this.cleanupOldNonces(maxAgeMs)
    } else {
      this.auditLogger.logSecurityEvent(
        'invalid_request_signature',
        'high',
        'api_security_manager',
        '無効なリクエスト署名',
        { 
          expectedSignature: `${expectedSignature.slice(0, 16)  }...`,
          providedSignature: `${signedRequest.signature.slice(0, 16)  }...`
        }
      )
    }

    return isValid
  }

  /**
   * 包括的リクエスト検証
   */
  async validateRequest(
    request: Request, 
    clientId?: string, 
    apiKeyId?: string, 
    apiKeyValue?: string
  ): Promise<{
    isValid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // HTTPS 強制チェック
      if (!this.enforceHTTPS(request)) {
        errors.push('HTTPS required')
      }

      // CORS 検証
      if (!this.validateCORS(request)) {
        errors.push('CORS violation')
      }

      // HTTPメソッド検証
      if (!this.validateMethod(request)) {
        errors.push('Invalid HTTP method')
      }

      // リクエストサイズ検証
      if (!(await this.validateRequestSize(request))) {
        errors.push('Request too large')
      }

      // レート制限チェック
      if (clientId && this.isClientBlocked(clientId)) {
        errors.push('Client is temporarily blocked')
      } else if (clientId && !this.checkRateLimit(clientId)) {
        errors.push('Rate limit exceeded')
      }

      // APIキー検証（必要な場合）
      if (this.config.requireAPIKey) {
        if (!apiKeyId || !apiKeyValue) {
          errors.push('API key required')
        } else if (!this.validateAPIKey(apiKeyId, apiKeyValue)) {
          errors.push('Invalid API key')
        }
      }

      // セキュリティヘッダーの確認
      const securityHeaders = this.validateSecurityHeaders(request)
      if (securityHeaders.warnings.length > 0) {
        warnings.push(...securityHeaders.warnings)
      }

    } catch (error) {
      this.auditLogger.logSecurityEvent(
        'request_validation_error',
        'high',
        'api_security_manager',
        'リクエスト検証中にエラーが発生',
        { 
          error: error instanceof Error ? error.message : String(error),
          url: request.url,
          method: request.method
        }
      )
      errors.push('Internal validation error')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * セキュリティヘッダーの検証
   */
  private validateSecurityHeaders(request: Request): { warnings: string[] } {
    const warnings: string[] = []
    
    // Content-Type の検証
    const contentType = request.headers.get('Content-Type')
    if (request.method !== 'GET' && request.method !== 'HEAD' && !contentType) {
      warnings.push('Missing Content-Type header')
    }

    // User-Agent の検証
    const userAgent = request.headers.get('User-Agent')
    if (!userAgent) {
      warnings.push('Missing User-Agent header')
    }

    return { warnings }
  }

  // プライベートヘルパーメソッド
  private getRequestTimes(clientId: string): number[] {
    const stored = localStorage.getItem(`rate_limit_${clientId}`)
    return stored ? JSON.parse(stored) : []
  }

  private setRequestTimes(clientId: string, times: number[]): void {
    localStorage.setItem(`rate_limit_${clientId}`, JSON.stringify(times))
  }

  private getClientBlockTime(clientId: string): number | null {
    const stored = localStorage.getItem(`block_${clientId}`)
    return stored ? parseInt(stored, 10) : null
  }

  private setClientBlock(clientId: string, blockUntil: number): void {
    localStorage.setItem(`block_${clientId}`, blockUntil.toString())
  }

  private clearClientBlock(clientId: string): void {
    localStorage.removeItem(`block_${clientId}`)
  }

  private checkAPIKeyRateLimit(keyId: string): boolean {
    // APIキー固有のレート制限実装
    return this.securityMonitor.checkRateLimit(
      `api_key_${keyId}`,
      60, // 1分間に60リクエスト
      60 * 1000
    )
  }

  private cleanupOldNonces(maxAgeMs: number): void {
    const cutoff = Date.now() - maxAgeMs
    for (const [key, timestamp] of this.requestCache.entries()) {
      if (timestamp < cutoff) {
        this.requestCache.delete(key)
      }
    }
  }
}

/**
 * セキュアなFetch API ラッパー
 */
export class SecureFetch {
  private readonly apiSecurity = APISecurityManager.getInstance()
  private readonly auditLogger = SecurityAuditLogger.getInstance()

  /**
   * セキュアなHTTPリクエスト実行
   */
  async request(
    url: string | URL,
    options: RequestInit & {
      clientId?: string
      apiKey?: { id: string; value: string }
      enableSigning?: boolean
      secretKey?: string
    } = {}
  ): Promise<Response> {
    const {
      clientId = 'default',
      apiKey,
      enableSigning = false,
      secretKey,
      ...fetchOptions
    } = options

    try {
      // リクエストの作成
      const request = new Request(url, fetchOptions)

      // セキュリティ検証
      const validation = await this.apiSecurity.validateRequest(
        request,
        clientId,
        apiKey?.id,
        apiKey?.value
      )

      if (!validation.isValid) {
        const error = new Error(`Request validation failed: ${validation.errors.join(', ')}`)
        this.auditLogger.logSecurityEvent(
          'secure_fetch_validation_failed',
          'high',
          'secure_fetch',
          'セキュアFetchの検証に失敗',
          {
            url: url.toString(),
            errors: validation.errors,
            warnings: validation.warnings
          }
        )
        throw error
      }

      // リクエスト署名（有効な場合）
      if (enableSigning && secretKey) {
        const payload = fetchOptions.body ? String(fetchOptions.body) : ''
        const signedData = await this.apiSecurity.signRequest(
          fetchOptions.method || 'GET',
          url.toString(),
          payload,
          secretKey
        )

        // 署名ヘッダーを追加
        const headers = new Headers(fetchOptions.headers)
        headers.set('X-Signature', signedData.signature)
        headers.set('X-Timestamp', signedData.timestamp.toString())
        headers.set('X-Nonce', signedData.nonce)
        
        fetchOptions.headers = headers
      }

      // APIキーヘッダーの追加
      if (apiKey) {
        const headers = new Headers(fetchOptions.headers)
        headers.set('X-API-Key-ID', apiKey.id)
        headers.set('X-API-Key', apiKey.value)
        fetchOptions.headers = headers
      }

      // リクエスト実行
      const response = await fetch(url, fetchOptions)

      // レスポンスの検証
      await this.validateResponse(response, url.toString())

      return response

    } catch (error) {
      this.auditLogger.logSecurityEvent(
        'secure_fetch_error',
        'medium',
        'secure_fetch',
        'セキュアFetchでエラーが発生',
        {
          url: url.toString(),
          error: error instanceof Error ? error.message : String(error),
          clientId
        }
      )
      throw error
    }
  }

  /**
   * レスポンスの検証
   */
  private async validateResponse(response: Response, url: string): Promise<void> {
    // セキュリティヘッダーの確認
    const securityHeaders = [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Strict-Transport-Security'
    ]

    const missingHeaders = securityHeaders.filter(header => 
      !response.headers.has(header)
    )

    if (missingHeaders.length > 0) {
      this.auditLogger.logSecurityEvent(
        'missing_security_headers',
        'low',
        'secure_fetch',
        'レスポンスにセキュリティヘッダーが不足',
        {
          url,
          missingHeaders,
          status: response.status
        }
      )
    }

    // Content-Type の検証
    const contentType = response.headers.get('Content-Type')
    if (!contentType) {
      this.auditLogger.logSecurityEvent(
        'missing_content_type',
        'low',
        'secure_fetch',
        'レスポンスにContent-Typeヘッダーが不足',
        { url, status: response.status }
      )
    }
  }
}

// エクスポート用のインスタンス
export const apiSecurity = APISecurityManager.getInstance()
export const secureFetch = new SecureFetch()

// CSRFトークン生成用のヘルパー関数（既存のsecurity.tsから移植）
export function validateCSRFToken(provided: string, expected: string): boolean {
  if (!provided || !expected) return false
  
  // 定数時間比較（タイミング攻撃対策）
  if (provided.length !== expected.length) return false
  
  let result = 0
  for (let i = 0; i < provided.length; i++) {
    result |= provided.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  
  return result === 0
}