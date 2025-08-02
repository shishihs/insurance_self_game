/**
 * 高度なレート制限・DDoS対策システム
 * 分散レート制限、適応制限、インテリジェント脅威検知
 */

import { SecurityMonitor } from './security-extensions'
import { SecurityAuditLogger } from './security-audit-logger'

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  blockDurationMs: number
  adaptiveScaling: boolean
  burstAllowance: number
  penaltyMultiplier: number
}

export interface ClientRiskProfile {
  riskScore: number
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical'
  violations: ViolationRecord[]
  adaptiveLimit: number
  lastActivity: Date
  behaviorPattern: BehaviorPattern
}

export interface ViolationRecord {
  timestamp: Date
  type: 'rate_limit' | 'suspicious_pattern' | 'known_attack' | 'bot_detection'
  severity: 'low' | 'medium' | 'high' | 'critical'
  details: Record<string, any>
}

export interface BehaviorPattern {
  requestFrequency: number[]
  userAgentConsistency: number
  geographicConsistency: number
  sessionDuration: number
  interactionQuality: number
  humanLikelihood: number
}

export interface DDoSMetrics {
  totalRequests: number
  uniqueClients: number
  suspiciousClients: number
  blockedRequests: number
  avgResponseTime: number
  systemLoad: number
}

/**
 * 高度なレート制限システム
 */
export class AdvancedRateLimiter {
  private static instance: AdvancedRateLimiter
  private readonly configs = new Map<string, RateLimitConfig>()
  private readonly clientProfiles = new Map<string, ClientRiskProfile>()
  private readonly requestHistory = new Map<string, number[]>()
  private readonly blockedClients = new Map<string, number>()
  private readonly auditLogger = SecurityAuditLogger.getInstance()
  private readonly securityMonitor = SecurityMonitor.getInstance()
  
  // DDoS検知メトリクス
  private ddosMetrics: DDoSMetrics = {
    totalRequests: 0,
    uniqueClients: 0,
    suspiciousClients: 0,
    blockedRequests: 0,
    avgResponseTime: 0,
    systemLoad: 0
  }

  private constructor() {
    this.initializeDefaultConfigs()
    this.startBackgroundTasks()
  }

  static getInstance(): AdvancedRateLimiter {
    if (!AdvancedRateLimiter.instance) {
      AdvancedRateLimiter.instance = new AdvancedRateLimiter()
    }
    return AdvancedRateLimiter.instance
  }

  /**
   * デフォルト設定の初期化
   */
  private initializeDefaultConfigs(): void {
    // 一般ユーザー向け設定
    this.configs.set('default', {
      windowMs: 60 * 1000, // 1分
      maxRequests: 60,
      blockDurationMs: 5 * 60 * 1000, // 5分
      adaptiveScaling: true,
      burstAllowance: 10,
      penaltyMultiplier: 2
    })

    // API向け厳格設定
    this.configs.set('api', {
      windowMs: 60 * 1000,
      maxRequests: 30,
      blockDurationMs: 10 * 60 * 1000, // 10分
      adaptiveScaling: true,
      burstAllowance: 5,
      penaltyMultiplier: 3
    })

    // 認証向け最厳格設定
    this.configs.set('auth', {
      windowMs: 60 * 1000,
      maxRequests: 5,
      blockDurationMs: 30 * 60 * 1000, // 30分
      adaptiveScaling: false,
      burstAllowance: 2,
      penaltyMultiplier: 5
    })
  }

  /**
   * 包括的レート制限チェック
   */
  checkRateLimit(
    clientId: string, 
    configName: string = 'default',
    requestContext?: Record<string, any>
  ): {
    allowed: boolean
    remainingRequests: number
    resetTime: Date
    riskScore: number
    blockReason?: string
  } {
    const now = Date.now()
    const config = this.configs.get(configName) || this.configs.get('default')!
    
    // クライアントプロファイルの取得・初期化
    let profile = this.clientProfiles.get(clientId)
    if (!profile) {
      profile = this.initializeClientProfile(clientId)
      this.clientProfiles.set(clientId, profile)
    }

    // ブロック状態の確認
    const blockUntil = this.blockedClients.get(clientId)
    if (blockUntil && now < blockUntil) {
      this.ddosMetrics.blockedRequests++
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: new Date(blockUntil),
        riskScore: profile.riskScore,
        blockReason: 'Temporarily blocked due to rate limit violation'
      }
    }

    // リクエスト履歴の更新
    this.updateRequestHistory(clientId, now, requestContext)
    
    // 行動パターン分析
    this.analyzeBehaviorPattern(clientId, requestContext)
    
    // リスクスコアの更新
    this.updateRiskScore(clientId, requestContext)
    
    // 適応的制限の計算
    const effectiveLimit = this.calculateAdaptiveLimit(clientId, config)
    
    // 現在のウィンドウ内のリクエスト数
    const windowStart = now - config.windowMs
    const recentRequests = this.getRecentRequests(clientId, windowStart)
    const requestCount = recentRequests.length
    
    // バースト許可の考慮
    const burstAdjustedLimit = effectiveLimit + config.burstAllowance
    const allowed = requestCount < burstAdjustedLimit

    this.ddosMetrics.totalRequests++
    
    if (!allowed) {
      // 制限違反の処理
      this.handleRateLimitViolation(clientId, configName, requestCount, effectiveLimit)
      this.ddosMetrics.blockedRequests++
      
      return {
        allowed: false,
        remainingRequests: 0,
        resetTime: new Date(now + config.blockDurationMs),
        riskScore: profile.riskScore,
        blockReason: 'Rate limit exceeded'
      }
    }

    // 残りリクエスト数の計算
    const remainingRequests = Math.max(0, effectiveLimit - requestCount)
    const resetTime = new Date(now + config.windowMs)

    return {
      allowed: true,
      remainingRequests,
      resetTime,
      riskScore: profile.riskScore
    }
  }

  /**
   * クライアントプロファイルの初期化
   */
  private initializeClientProfile(clientId: string): ClientRiskProfile {
    return {
      riskScore: 0,
      threatLevel: 'none',
      violations: [],
      adaptiveLimit: 60, // デフォルト制限
      lastActivity: new Date(),
      behaviorPattern: {
        requestFrequency: [],
        userAgentConsistency: 1.0,
        geographicConsistency: 1.0,
        sessionDuration: 0,
        interactionQuality: 0.5,
        humanLikelihood: 0.5
      }
    }
  }

  /**
   * リクエスト履歴の更新
   */
  private updateRequestHistory(
    clientId: string, 
    timestamp: number, 
    context?: Record<string, any>
  ): void {
    const history = this.requestHistory.get(clientId) || []
    history.push(timestamp)
    
    // 古い履歴をクリーンアップ（24時間より古いものを削除）
    const cutoff = timestamp - (24 * 60 * 60 * 1000)
    const filteredHistory = history.filter(time => time > cutoff)
    
    this.requestHistory.set(clientId, filteredHistory)

    // プロファイルの最終活動時刻を更新
    const profile = this.clientProfiles.get(clientId)
    if (profile) {
      profile.lastActivity = new Date(timestamp)
    }
  }

  /**
   * 行動パターンの分析
   */
  private analyzeBehaviorPattern(clientId: string, context?: Record<string, any>): void {
    const profile = this.clientProfiles.get(clientId)
    if (!profile) return

    const history = this.requestHistory.get(clientId) || []
    if (history.length < 2) return

    // リクエスト頻度パターンの分析
    const intervals = []
    for (let i = 1; i < history.length; i++) {
      intervals.push(history[i] - history[i - 1])
    }

    profile.behaviorPattern.requestFrequency = intervals.slice(-20) // 最新20個の間隔

    // 人間らしさの評価
    profile.behaviorPattern.humanLikelihood = this.calculateHumanLikelihood(intervals)

    // User-Agent の一貫性チェック
    if (context?.userAgent) {
      // 実装簡略化：実際にはより複雑な一貫性チェックを行う
      profile.behaviorPattern.userAgentConsistency = 1.0
    }

    // セッション継続時間の計算
    if (history.length > 0) {
      profile.behaviorPattern.sessionDuration = Date.now() - history[0]
    }
  }

  /**
   * 人間らしさの計算
   */
  private calculateHumanLikelihood(intervals: number[]): number {
    if (intervals.length < 5) return 0.5

    // 間隔の変動係数を計算
    const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
    const variance = intervals.reduce((sum, interval) => sum + (interval - mean)**2, 0) / intervals.length
    const standardDeviation = Math.sqrt(variance)
    const coefficientOfVariation = standardDeviation / mean

    // 人間の行動は適度にランダム（CV = 0.3-1.0が人間らしい）
    if (coefficientOfVariation < 0.1) return 0.1 // 機械的すぎる
    if (coefficientOfVariation > 2.0) return 0.1 // ランダムすぎる
    
    // 0.3-1.0の範囲で最も人間らしいと判定
    const humanness = Math.min(1.0, Math.max(0.0, 
      1.0 - Math.abs(coefficientOfVariation - 0.65) / 0.65
    ))

    return humanness
  }

  /**
   * リスクスコアの更新
   */
  private updateRiskScore(clientId: string, context?: Record<string, any>): void {
    const profile = this.clientProfiles.get(clientId)
    if (!profile) return

    let riskScore = 0

    // 履歴ベースのリスク
    const history = this.requestHistory.get(clientId) || []
    if (history.length > 100) riskScore += 10 // 大量リクエスト

    // 行動パターンベースのリスク
    const humanLikelihood = profile.behaviorPattern.humanLikelihood
    if (humanLikelihood < 0.3) riskScore += 20 // ボット的行動

    // 違反履歴ベースのリスク
    const recentViolations = profile.violations.filter(v => 
      Date.now() - v.timestamp.getTime() < 60 * 60 * 1000 // 1時間以内
    )
    riskScore += recentViolations.length * 15

    // IPアドレスベースのリスク（簡略化）
    if (context?.ipAddress) {
      if (this.isKnownMaliciousIP(context.ipAddress)) {
        riskScore += 50
      }
    }

    profile.riskScore = Math.min(100, riskScore)

    // 脅威レベルの更新
    if (riskScore >= 80) profile.threatLevel = 'critical'
    else if (riskScore >= 60) profile.threatLevel = 'high'
    else if (riskScore >= 40) profile.threatLevel = 'medium'
    else if (riskScore >= 20) profile.threatLevel = 'low'
    else profile.threatLevel = 'none'
  }

  /**
   * 適応的制限の計算
   */
  private calculateAdaptiveLimit(clientId: string, config: RateLimitConfig): number {
    if (!config.adaptiveScaling) return config.maxRequests

    const profile = this.clientProfiles.get(clientId)
    if (!profile) return config.maxRequests

    let adaptiveFactor = 1.0

    // リスクスコアベースの調整
    if (profile.riskScore > 50) {
      adaptiveFactor *= 0.5 // 高リスククライアントは制限を厳しく
    } else if (profile.riskScore < 20) {
      adaptiveFactor *= 1.2 // 低リスククライアントは制限を緩く
    }

    // 人間らしさベースの調整
    const humanLikelihood = profile.behaviorPattern.humanLikelihood
    if (humanLikelihood > 0.8) {
      adaptiveFactor *= 1.1 // 人間らしい行動は制限を緩く
    } else if (humanLikelihood < 0.3) {
      adaptiveFactor *= 0.6 // ボット的行動は制限を厳しく
    }

    // システム負荷ベースの調整
    if (this.ddosMetrics.systemLoad > 0.8) {
      adaptiveFactor *= 0.7 // システム負荷が高い場合は制限を厳しく
    }

    const adaptiveLimit = Math.floor(config.maxRequests * adaptiveFactor)
    profile.adaptiveLimit = Math.max(1, Math.min(config.maxRequests * 2, adaptiveLimit))

    return profile.adaptiveLimit
  }

  /**
   * レート制限違反の処理
   */
  private handleRateLimitViolation(
    clientId: string, 
    configName: string, 
    requestCount: number, 
    limit: number
  ): void {
    const config = this.configs.get(configName)!
    const profile = this.clientProfiles.get(clientId)!

    // 違反記録の追加
    const violation: ViolationRecord = {
      timestamp: new Date(),
      type: 'rate_limit',
      severity: requestCount > limit * 2 ? 'high' : 'medium',
      details: {
        configName,
        requestCount,
        limit,
        riskScore: profile.riskScore
      }
    }

    profile.violations.push(violation)

    // 古い違反記録をクリーンアップ
    const cutoff = Date.now() - (24 * 60 * 60 * 1000) // 24時間
    profile.violations = profile.violations.filter(v => 
      v.timestamp.getTime() > cutoff
    )

    // ブロック期間の計算（違反回数に応じて延長）
    const recentViolations = profile.violations.filter(v => 
      Date.now() - v.timestamp.getTime() < 60 * 60 * 1000 // 1時間以内
    )

    let blockDuration = config.blockDurationMs
    if (recentViolations.length > 1) {
      blockDuration *= config.penaltyMultiplier**(recentViolations.length - 1)
    }

    // 最大ブロック期間の制限（24時間）
    blockDuration = Math.min(blockDuration, 24 * 60 * 60 * 1000)

    // ブロック設定
    this.blockedClients.set(clientId, Date.now() + blockDuration)

    // セキュリティログの記録
    this.auditLogger.logSecurityEvent(
      'advanced_rate_limit_violation',
      violation.severity as any,
      'advanced_rate_limiter',
      `高度レート制限違反: クライアント ${clientId}`,
      {
        clientId,
        configName,
        requestCount,
        limit,
        blockDuration,
        riskScore: profile.riskScore,
        threatLevel: profile.threatLevel,
        recentViolations: recentViolations.length
      }
    )

    // 脅威レベルが高い場合の追加対策
    if (profile.threatLevel === 'critical') {
      this.handleCriticalThreat(clientId)
    }
  }

  /**
   * 重大脅威の処理
   */
  private handleCriticalThreat(clientId: string): void {
    // 長期ブロック
    this.blockedClients.set(clientId, Date.now() + (24 * 60 * 60 * 1000)) // 24時間

    // セキュリティ担当者への通知（実装は環境に依存）
    this.auditLogger.logSecurityEvent(
      'critical_threat_detected',
      'critical',
      'advanced_rate_limiter',
      `重大脅威を検出: クライアント ${clientId}`,
      {
        clientId,
        action: 'long_term_block',
        duration: '24_hours'
      }
    )

    // 関連クライアントの調査（IP範囲など）
    this.investigateRelatedClients(clientId)
  }

  /**
   * DDoS攻撃の検知
   */
  detectDDoSAttack(): {
    isUnderAttack: boolean
    attackSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical'
    metrics: DDoSMetrics
    recommendations: string[]
  } {
    const now = Date.now()
    const recommendations: string[] = []

    // 過去5分間のメトリクス計算
    const window = 5 * 60 * 1000 // 5分
    let totalRequests = 0
    const uniqueClients = new Set<string>()
    let suspiciousClients = 0

    for (const [clientId, history] of this.requestHistory.entries()) {
      const recentRequests = history.filter(time => now - time < window)
      totalRequests += recentRequests.length
      
      if (recentRequests.length > 0) {
        uniqueClients.add(clientId)
        
        const profile = this.clientProfiles.get(clientId)
        if (profile && profile.threatLevel !== 'none') {
          suspiciousClients++
        }
      }
    }

    // メトリクス更新
    this.ddosMetrics = {
      totalRequests,
      uniqueClients: uniqueClients.size,
      suspiciousClients,
      blockedRequests: this.ddosMetrics.blockedRequests,
      avgResponseTime: this.calculateAverageResponseTime(),
      systemLoad: this.calculateSystemLoad()
    }

    // 攻撃検知ロジック
    let attackSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical' = 'none'
    let isUnderAttack = false

    // 閾値ベースの検知
    const requestsPerSecond = totalRequests / 300 // 5分 = 300秒
    const suspiciousRatio = uniqueClients.size > 0 ? suspiciousClients / uniqueClients.size : 0

    if (requestsPerSecond > 100) {
      isUnderAttack = true
      attackSeverity = 'critical'
      recommendations.push('緊急：トラフィック制限を直ちに実施')
      recommendations.push('CDN/WAFでの追加保護を有効化')
    } else if (requestsPerSecond > 50) {
      isUnderAttack = true
      attackSeverity = 'high'
      recommendations.push('レート制限を強化')
      recommendations.push('疑わしいIPアドレスをブロック')
    } else if (requestsPerSecond > 20 || suspiciousRatio > 0.3) {
      isUnderAttack = true
      attackSeverity = 'medium'
      recommendations.push('監視を強化し、パターンを分析')
    } else if (suspiciousRatio > 0.1) {
      attackSeverity = 'low'
      recommendations.push('継続的な監視を実施')
    }

    // レスポンス時間ベースの検知
    if (this.ddosMetrics.avgResponseTime > 5000) { // 5秒以上
      isUnderAttack = true
      if (attackSeverity === 'none') attackSeverity = 'medium'
      recommendations.push('システムリソースの調査が必要')
    }

    if (isUnderAttack) {
      this.auditLogger.logSecurityEvent(
        'ddos_attack_detected',
        attackSeverity as any,
        'advanced_rate_limiter',
        `DDoS攻撃を検知: ${attackSeverity} レベル`,
        {
          metrics: this.ddosMetrics,
          attackSeverity,
          recommendations
        }
      )
    }

    return {
      isUnderAttack,
      attackSeverity,
      metrics: this.ddosMetrics,
      recommendations
    }
  }

  /**
   * 自動ブロックリストの管理
   */
  manageAutoBlockList(): void {
    const now = Date.now()
    const criticalClients: string[] = []

    for (const [clientId, profile] of this.clientProfiles.entries()) {
      // 重大脅威クライアントの特定
      if (profile.threatLevel === 'critical') {
        criticalClients.push(clientId)
        
        // 自動ブロック
        if (!this.blockedClients.has(clientId)) {
          this.blockedClients.set(clientId, now + (24 * 60 * 60 * 1000)) // 24時間
        }
      }

      // 長期間非アクティブなプロファイルのクリーンアップ
      if (now - profile.lastActivity.getTime() > (7 * 24 * 60 * 60 * 1000)) { // 7日
        this.clientProfiles.delete(clientId)
        this.requestHistory.delete(clientId)
      }
    }

    // 期限切れブロックのクリーンアップ
    for (const [clientId, blockUntil] of this.blockedClients.entries()) {
      if (now > blockUntil) {
        this.blockedClients.delete(clientId)
      }
    }

    if (criticalClients.length > 0) {
      this.auditLogger.logSecurityEvent(
        'auto_block_list_updated',
        'medium',
        'advanced_rate_limiter',
        `自動ブロックリストを更新: ${criticalClients.length}個のクライアント`,
        { blockedClients: criticalClients }
      )
    }
  }

  // ヘルパーメソッド
  private getRecentRequests(clientId: string, windowStart: number): number[] {
    const history = this.requestHistory.get(clientId) || []
    return history.filter(time => time > windowStart)
  }

  private isKnownMaliciousIP(ipAddress: string): boolean {
    // 実装簡略化：実際には外部の脅威インテリジェンスAPIを使用
    const knownMaliciousRanges = [
      '192.168.1.100', // 例：テスト用IP
    ]
    return knownMaliciousRanges.includes(ipAddress)
  }

  private investigateRelatedClients(clientId: string): void {
    // 同一IP範囲のクライアントを調査
    // 実装は簡略化
    this.auditLogger.logSecurityEvent(
      'related_client_investigation',
      'medium',
      'advanced_rate_limiter',
      `関連クライアントの調査を開始: ${clientId}`,
      { sourceClient: clientId }
    )
  }

  private calculateAverageResponseTime(): number {
    // 実装簡略化：実際にはレスポンス時間のトラッキングが必要
    return Math.random() * 1000 // 0-1000ms
  }

  private calculateSystemLoad(): number {
    // 実装簡略化：実際にはCPU使用率、メモリ使用率などを計算
    return Math.random() * 0.8 // 0-80%
  }

  /**
   * バックグラウンドタスクの開始
   */
  private startBackgroundTasks(): void {
    // 5分ごとにDDoS検知を実行
    setInterval(() => {
      this.detectDDoSAttack()
    }, 5 * 60 * 1000)

    // 10分ごとに自動ブロックリストを管理
    setInterval(() => {
      this.manageAutoBlockList()
    }, 10 * 60 * 1000)

    // 1時間ごとにメトリクスをリセット
    setInterval(() => {
      this.ddosMetrics.blockedRequests = 0
    }, 60 * 60 * 1000)
  }

  /**
   * 統計情報の取得
   */
  getStatistics(): {
    totalClients: number
    activeClients: number
    blockedClients: number
    ddosMetrics: DDoSMetrics
    topRiskClients: Array<{ clientId: string; riskScore: number; threatLevel: string }>
  } {
    const now = Date.now()
    const activeThreshold = 5 * 60 * 1000 // 5分

    const activeClients = Array.from(this.clientProfiles.values()).filter(
      profile => now - profile.lastActivity.getTime() < activeThreshold
    ).length

    const topRiskClients = Array.from(this.clientProfiles.entries())
      .map(([clientId, profile]) => ({
        clientId,
        riskScore: profile.riskScore,
        threatLevel: profile.threatLevel
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)

    return {
      totalClients: this.clientProfiles.size,
      activeClients,
      blockedClients: this.blockedClients.size,
      ddosMetrics: this.ddosMetrics,
      topRiskClients
    }
  }
}

// エクスポート用インスタンス
export const advancedRateLimiter = AdvancedRateLimiter.getInstance()