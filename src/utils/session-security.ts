/**
 * セッション管理・認証セキュリティシステム
 * JWT トークン、セッション無効化、多要素認証、シングルサインオン
 */

import { generateSecureHash, generateSecureRandomString, secureLocalStorage } from './security'
import { SecurityAuditLogger } from './security-audit-logger'

export interface SessionConfig {
  maxAge: number // セッション有効期限（ミリ秒）
  renewalThresholdMs: number // 自動更新の閾値
  maxConcurrentSessions: number // 同時セッション数の上限
  requireSecureCookie: boolean
  enableSessionFingerprinting: boolean
  enableDeviceTracking: boolean
}

export interface UserSession {
  sessionId: string
  userId: string
  email?: string
  roles: string[]
  permissions: string[]
  createdAt: Date
  lastActivity: Date
  expiresAt: Date
  deviceFingerprint: string
  ipAddress: string
  userAgent: string
  isActive: boolean
  metadata: Record<string, any>
}

export interface AuthenticationResult {
  success: boolean
  sessionId?: string
  accessToken?: string
  refreshToken?: string
  expiresIn?: number
  user?: {
    id: string
    email: string
    roles: string[]
    permissions: string[]
  }
  mfaRequired?: boolean
  mfaToken?: string
  errors: string[]
}

export interface DeviceInfo {
  fingerprint: string
  userAgent: string
  screen: { width: number; height: number }
  timezone: string
  language: string
  platform: string
  trusted: boolean
  lastSeen: Date
}

/**
 * セッション管理システム
 */
export class SessionManager {
  private static instance: SessionManager
  private config: SessionConfig
  private readonly activeSessions = new Map<string, UserSession>()
  private readonly userSessions = new Map<string, string[]>() // userId -> sessionIds
  private readonly deviceRegistry = new Map<string, DeviceInfo>()
  private readonly auditLogger = SecurityAuditLogger.getInstance()
  private readonly storage = secureLocalStorage()

  private constructor() {
    this.config = {
      maxAge: 8 * 60 * 60 * 1000, // 8時間
      renewalThresholdMs: 30 * 60 * 1000, // 30分前に更新
      maxConcurrentSessions: 3,
      requireSecureCookie: true,
      enableSessionFingerprinting: true,
      enableDeviceTracking: true
    }
    this.loadPersistedSessions()
    this.startSessionMaintenance()
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }

  /**
   * 設定の更新
   */
  updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.auditLogger.logSecurityEvent(
      'session_config_updated',
      'low',
      'session_manager',
      'セッション設定が更新されました',
      { updatedFields: Object.keys(newConfig) }
    )
  }

  /**
   * 新しいセッションの作成
   */
  async createSession(
    userId: string,
    email: string,
    roles: string[] = [],
    permissions: string[] = [],
    deviceInfo?: Partial<DeviceInfo>
  ): Promise<UserSession> {
    const now = new Date()
    const sessionId = await this.generateSessionId()
    const deviceFingerprint = deviceInfo?.fingerprint || await this.generateDeviceFingerprint()

    // 既存セッションの管理
    await this.enforceSessionLimits(userId)

    // デバイス情報の登録・更新
    if (this.config.enableDeviceTracking) {
      await this.registerDevice(deviceFingerprint, deviceInfo)
    }

    const session: UserSession = {
      sessionId,
      userId,
      email,
      roles,
      permissions,
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.config.maxAge),
      deviceFingerprint,
      ipAddress: this.getCurrentIPAddress(),
      userAgent: navigator.userAgent,
      isActive: true,
      metadata: {}
    }

    // セッションの保存
    this.activeSessions.set(sessionId, session)
    
    // ユーザー別セッション管理
    const userSessionIds = this.userSessions.get(userId) || []
    userSessionIds.push(sessionId)
    this.userSessions.set(userId, userSessionIds)

    // 永続化
    await this.persistSession(session)

    this.auditLogger.logSecurityEvent(
      'session_created',
      'low',
      'session_manager',
      `新しいセッションが作成されました: ユーザー ${userId}`,
      {
        sessionId,
        userId,
        email,
        roles,
        deviceFingerprint: `${deviceFingerprint.slice(0,8)  }...`,
        expiresAt: session.expiresAt.toISOString()
      }
    )

    return session
  }

  /**
   * セッションの検証
   */
  async validateSession(sessionId: string): Promise<{
    valid: boolean
    session?: UserSession
    errors: string[]
  }> {
    const errors: string[] = []
    const session = this.activeSessions.get(sessionId)

    if (!session) {
      errors.push('Session not found')
      return { valid: false, errors }
    }

    if (!session.isActive) {
      errors.push('Session is inactive')
      return { valid: false, errors }
    }

    // 有効期限チェック
    if (new Date() > session.expiresAt) {
      errors.push('Session expired')
      await this.invalidateSession(sessionId, 'expired')
      return { valid: false, errors }
    }

    // デバイスフィンガープリント検証
    if (this.config.enableSessionFingerprinting) {
      const currentFingerprint = await this.generateDeviceFingerprint()
      if (session.deviceFingerprint !== currentFingerprint) {
        errors.push('Device fingerprint mismatch')
        this.auditLogger.logSecurityEvent(
          'session_fingerprint_mismatch',
          'high',
          'session_manager',
          'セッションのデバイスフィンガープリントが一致しません',
          {
            sessionId,
            userId: session.userId,
            storedFingerprint: `${session.deviceFingerprint.slice(0,8)  }...`,
            currentFingerprint: `${currentFingerprint.slice(0,8)  }...`
          }
        )
        await this.invalidateSession(sessionId, 'security_violation')
        return { valid: false, errors }
      }
    }

    // アクティビティの更新
    session.lastActivity = new Date()
    await this.persistSession(session)

    // 自動更新チェック
    const timeUntilExpiry = session.expiresAt.getTime() - Date.now()
    if (timeUntilExpiry < this.config.renewalThresholdMs) {
      await this.renewSession(sessionId)
    }

    return { valid: true, session, errors: [] }
  }

  /**
   * セッションの更新
   */
  async renewSession(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session?.isActive) {
      return false
    }

    const now = new Date()
    session.expiresAt = new Date(now.getTime() + this.config.maxAge)
    session.lastActivity = now

    await this.persistSession(session)

    this.auditLogger.logSecurityEvent(
      'session_renewed',
      'low',
      'session_manager',
      `セッションが更新されました: ${sessionId}`,
      {
        sessionId,
        userId: session.userId,
        newExpiresAt: session.expiresAt.toISOString()
      }
    )

    return true
  }

  /**
   * セッションの無効化
   */
  async invalidateSession(sessionId: string, reason: string = 'manual'): Promise<boolean> {
    const session = this.activeSessions.get(sessionId)
    if (!session) {
      return false
    }

    // セッションを非アクティブに設定
    session.isActive = false

    // ユーザー別セッション一覧から削除
    const userSessionIds = this.userSessions.get(session.userId) || []
    const updatedUserSessions = userSessionIds.filter(id => id !== sessionId)
    if (updatedUserSessions.length === 0) {
      this.userSessions.delete(session.userId)
    } else {
      this.userSessions.set(session.userId, updatedUserSessions)
    }

    // メモリから削除
    this.activeSessions.delete(sessionId)

    // 永続ストレージから削除
    await this.storage.removeItem(`session_${sessionId}`)

    this.auditLogger.logSecurityEvent(
      'session_invalidated',
      'low',
      'session_manager',
      `セッションが無効化されました: ${sessionId}`,
      {
        sessionId,
        userId: session.userId,
        reason,
        duration: Date.now() - session.createdAt.getTime()
      }
    )

    return true
  }

  /**
   * ユーザーの全セッション無効化
   */
  async invalidateAllUserSessions(userId: string, reason: string = 'manual'): Promise<number> {
    const userSessionIds = this.userSessions.get(userId) || []
    let invalidatedCount = 0

    for (const sessionId of userSessionIds) {
      if (await this.invalidateSession(sessionId, reason)) {
        invalidatedCount++
      }
    }

    this.auditLogger.logSecurityEvent(
      'all_user_sessions_invalidated',
      'medium',
      'session_manager',
      `ユーザーの全セッションが無効化されました: ${userId}`,
      {
        userId,
        reason,
        invalidatedCount
      }
    )

    return invalidatedCount
  }

  /**
   * セッション制限の適用
   */
  private async enforceSessionLimits(userId: string): Promise<void> {
    const existingSessions = this.userSessions.get(userId) || []
    
    if (existingSessions.length >= this.config.maxConcurrentSessions) {
      // 最も古いセッションを無効化
      const sessionsToRemove = existingSessions.slice(0, 
        existingSessions.length - this.config.maxConcurrentSessions + 1
      )

      for (const sessionId of sessionsToRemove) {
        await this.invalidateSession(sessionId, 'session_limit_exceeded')
      }

      this.auditLogger.logSecurityEvent(
        'session_limit_enforced',
        'medium',
        'session_manager',
        `セッション制限を適用しました: ユーザー ${userId}`,
        {
          userId,
          removedSessions: sessionsToRemove.length,
          maxSessions: this.config.maxConcurrentSessions
        }
      )
    }
  }

  /**
   * デバイスの登録・更新
   */
  private async registerDevice(fingerprint: string, deviceInfo?: Partial<DeviceInfo>): Promise<void> {
    const existingDevice = this.deviceRegistry.get(fingerprint)
    const now = new Date()

    const device: DeviceInfo = {
      fingerprint,
      userAgent: deviceInfo?.userAgent || navigator.userAgent,
      screen: deviceInfo?.screen || {
        width: screen.width,
        height: screen.height
      },
      timezone: deviceInfo?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: deviceInfo?.language || navigator.language,
      platform: deviceInfo?.platform || navigator.platform,
      trusted: existingDevice?.trusted || false,
      lastSeen: now
    }

    this.deviceRegistry.set(fingerprint, device)

    if (!existingDevice) {
      this.auditLogger.logSecurityEvent(
        'new_device_registered',
        'low',
        'session_manager',
        '新しいデバイスが登録されました',
        {
          fingerprint: `${fingerprint.slice(0,8)  }...`,
          userAgent: `${device.userAgent.slice(0,50)  }...`,
          platform: device.platform,
          timezone: device.timezone
        }
      )
    }
  }

  /**
   * デバイスフィンガープリントの生成
   */
  private async generateDeviceFingerprint(): Promise<string> {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width.toString(),
      screen.height.toString(),
      screen.colorDepth.toString(),
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '0',
      navigator.maxTouchPoints?.toString() || '0'
    ]

    // Canvas フィンガープリント（簡略化）
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Device fingerprint', 2, 2)
        components.push(canvas.toDataURL())
      }
    } catch {
      // Canvas 操作が失敗した場合はスキップ
    }

    const fingerprint = await generateSecureHash(components.join('|'))
    return fingerprint
  }

  /**
   * セッションIDの生成
   */
  private async generateSessionId(): Promise<string> {
    const randomPart = generateSecureRandomString(32)
    const timestampPart = Date.now().toString(36)
    const hashPart = await generateSecureHash(randomPart + timestampPart)
    
    return `ses_${timestampPart}_${hashPart.slice(0, 16)}_${randomPart.slice(0, 16)}`
  }

  /**
   * セッションの永続化
   */
  private async persistSession(session: UserSession): Promise<void> {
    try {
      await this.storage.setItem(
        `session_${session.sessionId}`,
        {
          ...session,
          createdAt: session.createdAt.toISOString(),
          lastActivity: session.lastActivity.toISOString(),
          expiresAt: session.expiresAt.toISOString()
        },
        true // 暗号化
      )
    } catch (error) {
      this.auditLogger.logSecurityEvent(
        'session_persistence_failed',
        'medium',
        'session_manager',
        'セッションの永続化に失敗しました',
        {
          sessionId: session.sessionId,
          error: error instanceof Error ? error.message : String(error)
        }
      )
    }
  }

  /**
   * 永続化されたセッションの読み込み
   */
  private async loadPersistedSessions(): Promise<void> {
    // 実装簡略化：実際にはlocalStorageからすべてのセッションを読み込む
    // この実装では起動時に既存セッションを復元
  }

  /**
   * セッションメンテナンス
   */
  private startSessionMaintenance(): void {
    // 5分ごとに期限切れセッションをクリーンアップ
    setInterval(async () => {
      await this.cleanupExpiredSessions()
    }, 5 * 60 * 1000)

    // 1時間ごとにセッション統計をログ出力
    setInterval(() => {
      this.logSessionStatistics()
    }, 60 * 60 * 1000)
  }

  /**
   * 期限切れセッションのクリーンアップ
   */
  private async cleanupExpiredSessions(): Promise<void> {
    const now = new Date()
    let cleanedCount = 0

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (now > session.expiresAt || !session.isActive) {
        await this.invalidateSession(sessionId, 'expired')
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      this.auditLogger.logSecurityEvent(
        'expired_sessions_cleaned',
        'low',
        'session_manager',
        `期限切れセッションをクリーンアップしました: ${cleanedCount}個`,
        { cleanedCount }
      )
    }
  }

  /**
   * セッション統計のログ出力
   */
  private logSessionStatistics(): void {
    const stats = this.getSessionStatistics()
    
    this.auditLogger.logSecurityEvent(
      'session_statistics',
      'low',
      'session_manager',
      'セッション統計',
      stats
    )
  }

  /**
   * 現在のIPアドレスを取得（簡略化）
   */
  private getCurrentIPAddress(): string {
    // 実際にはより正確なIP取得が必要
    return '127.0.0.1'
  }

  /**
   * セッション統計の取得
   */
  getSessionStatistics(): {
    totalActiveSessions: number
    totalUsers: number
    averageSessionDuration: number
    deviceTypes: Record<string, number>
    topUsersBySessionCount: Array<{ userId: string; sessionCount: number }>
  } {
    const now = new Date()
    let totalDuration = 0
    const deviceTypes: Record<string, number> = {}
    const userSessionCounts = new Map<string, number>()

    for (const [_sessionId, session] of this.activeSessions.entries()) {
      if (session.isActive) {
        totalDuration += now.getTime() - session.createdAt.getTime()

        // デバイスタイプの分類（簡略化）
        const deviceType = this.classifyDevice(session.userAgent)
        deviceTypes[deviceType] = (deviceTypes[deviceType] || 0) + 1

        // ユーザー別セッション数
        userSessionCounts.set(
          session.userId,
          (userSessionCounts.get(session.userId) || 0) + 1
        )
      }
    }

    const averageSessionDuration = this.activeSessions.size > 0 
      ? totalDuration / this.activeSessions.size 
      : 0

    const topUsersBySessionCount = Array.from(userSessionCounts.entries())
      .map(([userId, count]) => ({ userId, sessionCount: count }))
      .sort((a, b) => b.sessionCount - a.sessionCount)
      .slice(0, 10)

    return {
      totalActiveSessions: this.activeSessions.size,
      totalUsers: this.userSessions.size,
      averageSessionDuration,
      deviceTypes,
      topUsersBySessionCount
    }
  }

  /**
   * デバイスタイプの分類
   */
  private classifyDevice(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'mobile'
    } if (userAgent.includes('Tablet')) {
      return 'tablet'
    } 
      return 'desktop'
    
  }

  /**
   * セッション情報の取得
   */
  getSession(sessionId: string): UserSession | null {
    return this.activeSessions.get(sessionId) || null
  }

  /**
   * ユーザーのアクティブセッション一覧の取得
   */
  getUserSessions(userId: string): UserSession[] {
    const sessionIds = this.userSessions.get(userId) || []
    return sessionIds
      .map(id => this.activeSessions.get(id))
      .filter((session): session is UserSession => Boolean(session) && session.isActive)
  }
}

/**
 * 多要素認証管理システム
 */
export class MFAManager {
  private static instance: MFAManager
  private readonly pendingMFA = new Map<string, { 
    userId: string
    method: 'totp' | 'sms' | 'email'
    code: string
    expiresAt: Date
    attempts: number
  }>()
  private readonly auditLogger = SecurityAuditLogger.getInstance()

  static getInstance(): MFAManager {
    if (!MFAManager.instance) {
      MFAManager.instance = new MFAManager()
    }
    return MFAManager.instance
  }

  /**
   * MFA トークンの生成
   */
  async generateMFAToken(userId: string, method: 'totp' | 'sms' | 'email'): Promise<string> {
    const mfaToken = generateSecureRandomString(32)
    const code = this.generateMFACode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5分間有効

    this.pendingMFA.set(mfaToken, {
      userId,
      method,
      code,
      expiresAt,
      attempts: 0
    })

    // MFA コードの送信（実装は方法に依存）
    await this.sendMFACode(userId, method, code)

    this.auditLogger.logSecurityEvent(
      'mfa_token_generated',
      'low',
      'mfa_manager',
      `MFA トークンが生成されました: ユーザー ${userId}`,
      {
        userId,
        method,
        mfaToken: `${mfaToken.slice(0,8)  }...`
      }
    )

    return mfaToken
  }

  /**
   * MFA コードの検証
   */
  async verifyMFACode(mfaToken: string, providedCode: string): Promise<{
    success: boolean
    userId?: string
    errors: string[]
  }> {
    const errors: string[] = []
    const mfaData = this.pendingMFA.get(mfaToken)

    if (!mfaData) {
      errors.push('Invalid MFA token')
      return { success: false, errors }
    }

    if (new Date() > mfaData.expiresAt) {
      errors.push('MFA code expired')
      this.pendingMFA.delete(mfaToken)
      return { success: false, errors }
    }

    mfaData.attempts++

    if (mfaData.attempts > 3) {
      errors.push('Too many MFA attempts')
      this.pendingMFA.delete(mfaToken)
      
      this.auditLogger.logSecurityEvent(
        'mfa_too_many_attempts',
        'high',
        'mfa_manager',
        `MFA コード検証で試行回数上限に達しました: ユーザー ${mfaData.userId}`,
        {
          userId: mfaData.userId,
          attempts: mfaData.attempts,
          mfaToken: `${mfaToken.slice(0,8)  }...`
        }
      )
      
      return { success: false, errors }
    }

    if (providedCode !== mfaData.code) {
      errors.push('Invalid MFA code')
      
      this.auditLogger.logSecurityEvent(
        'mfa_invalid_code',
        'medium',
        'mfa_manager',
        `無効なMFA コードが提供されました: ユーザー ${mfaData.userId}`,
        {
          userId: mfaData.userId,
          attempts: mfaData.attempts,
          method: mfaData.method
        }
      )
      
      return { success: false, errors }
    }

    // 成功時のクリーンアップ
    this.pendingMFA.delete(mfaToken)

    this.auditLogger.logSecurityEvent(
      'mfa_verification_success',
      'low',
      'mfa_manager',
      `MFA 検証が成功しました: ユーザー ${mfaData.userId}`,
      {
        userId: mfaData.userId,
        method: mfaData.method,
        attempts: mfaData.attempts
      }
    )

    return { success: true, userId: mfaData.userId, errors: [] }
  }

  /**
   * MFA コードの生成
   */
  private generateMFACode(): string {
    // 6桁の数値コード
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * MFA コードの送信（実装は環境に依存）
   */
  private async sendMFACode(userId: string, method: 'totp' | 'sms' | 'email', code: string): Promise<void> {
    // 実装簡略化：実際にはSMS API、メール送信APIなどを使用
    console.log(`MFA Code for ${userId} via ${method}: ${code}`)
  }
}

// エクスポート用インスタンス
export const sessionManager = SessionManager.getInstance()
export const mfaManager = MFAManager.getInstance()