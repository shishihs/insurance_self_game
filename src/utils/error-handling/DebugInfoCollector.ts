/**
 * デバッグ情報の安全な収集システム
 * プライバシーを保護しながら問題解決に必要な情報を収集
 */

export interface DebugInfo {
  timestamp: string
  sessionId: string
  buildVersion: string
  environment: string
  
  // システム情報
  system: {
    userAgent: string
    platform: string
    language: string
    cookieEnabled: boolean
    onLine: boolean
    screenResolution: string
    viewportSize: string
    devicePixelRatio: number
    timezone: string
  }
  
  // パフォーマンス情報
  performance: {
    memory?: {
      used: number
      total: number
      limit: number
    }
    timing: {
      navigationStart: number
      loadComplete: number
      domReady: number
      firstPaint?: number
      firstContentfulPaint?: number
    }
    connection?: {
      effectiveType: string
      downlink: number
      rtt: number
    }
  }
  
  // アプリケーション状態
  application: {
    url: string
    referrer: string
    gameState?: 'menu' | 'playing' | 'paused' | 'finished' | 'error'
    routePath?: string
    currentComponent?: string
    activeFeatures: string[]
    errorCount: number
    lastError?: {
      message: string
      timestamp: number
      severity: string
    }
  }
  
  // ブラウザ機能
  features: {
    localStorage: boolean
    sessionStorage: boolean
    webGL: boolean
    webWorker: boolean
    serviceWorker: boolean
    notifications: boolean
    geolocation: boolean
    mediaDevices: boolean
  }
  
  // 実験的機能・設定
  experimental?: {
    flags: Record<string, boolean>
    abTests: Record<string, string>
    featureToggles: Record<string, boolean>
  }
  
  // 機密情報は含めない
  // - ユーザーの個人情報
  // - 認証トークン
  // - セッション詳細
  // - IPアドレス
  // - 位置情報
}

export interface CollectionOptions {
  includeMemory?: boolean
  includePerformance?: boolean
  includeGameState?: boolean
  includeExperimental?: boolean
  sanitize?: boolean
  maxDataSize?: number // bytes
}

export class DebugInfoCollector {
  private readonly sessionId: string
  private readonly buildVersion: string
  private readonly environment: string
  private gameStateProvider?: () => string
  private componentProvider?: () => string
  private featureProvider?: () => string[]
  
  constructor(
    sessionId: string,
    buildVersion: string = 'unknown',
    environment: string = 'unknown'
  ) {
    this.sessionId = sessionId
    this.buildVersion = buildVersion
    this.environment = environment
  }
  
  /**
   * ゲーム状態プロバイダーを設定
   */
  setGameStateProvider(provider: () => string): void {
    this.gameStateProvider = provider
  }
  
  /**
   * コンポーネントプロバイダーを設定
   */
  setComponentProvider(provider: () => string): void {
    this.componentProvider = provider
  }
  
  /**
   * アクティブ機能プロバイダーを設定
   */
  setFeatureProvider(provider: () => string[]): void {
    this.featureProvider = provider
  }
  
  /**
   * デバッグ情報を安全に収集
   */
  collect(options: CollectionOptions = {}): DebugInfo {
    const opts = {
      includeMemory: true,
      includePerformance: true,
      includeGameState: true,
      includeExperimental: false,
      sanitize: true,
      maxDataSize: 1024 * 100, // 100KB
      ...options
    }
    
    try {
      const debugInfo: DebugInfo = {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        buildVersion: this.buildVersion,
        environment: this.environment,
        
        system: this.collectSystemInfo(),
        performance: this.collectPerformanceInfo(opts),
        application: this.collectApplicationInfo(opts),
        features: this.collectFeatureInfo()
      }
      
      if (opts.includeExperimental) {
        debugInfo.experimental = this.collectExperimentalInfo()
      }
      
      // データサイズの制限
      if (opts.maxDataSize) {
        const serialized = JSON.stringify(debugInfo)
        if (serialized.length > opts.maxDataSize) {
          console.warn('[DebugInfoCollector] Data size exceeds limit, truncating...')
          return this.truncateData(debugInfo, opts.maxDataSize)
        }
      }
      
      // サニタイズ
      if (opts.sanitize) {
        return this.sanitizeData(debugInfo)
      }
      
      return debugInfo
      
    } catch (error) {
      console.error('[DebugInfoCollector] Failed to collect debug info:', error)
      
      // 最小限の情報を返す
      return {
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        buildVersion: this.buildVersion,
        environment: this.environment,
        system: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
          screenResolution: `${screen.width}x${screen.height}`,
          viewportSize: `${window.innerWidth}x${window.innerHeight}`,
          devicePixelRatio: window.devicePixelRatio,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        performance: {
          timing: {
            navigationStart: 0,
            loadComplete: 0,
            domReady: 0
          }
        },
        application: {
          url: this.sanitizeUrl(window.location.href),
          referrer: this.sanitizeUrl(document.referrer),
          activeFeatures: [],
          errorCount: 0
        },
        features: {
          localStorage: false,
          sessionStorage: false,
          webGL: false,
          webWorker: false,
          serviceWorker: false,
          notifications: false,
          geolocation: false,
          mediaDevices: false
        }
      }
    }
  }
  
  /**
   * システム情報を収集
   */
  private collectSystemInfo(): DebugInfo['system'] {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      viewportSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  }
  
  /**
   * パフォーマンス情報を収集
   */
  private collectPerformanceInfo(options: CollectionOptions): DebugInfo['performance'] {
    const perfInfo: DebugInfo['performance'] = {
      timing: {
        navigationStart: performance.timing.navigationStart,
        loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      }
    }
    
    // メモリ情報（Chrome限定）
    if (options.includeMemory && 'memory' in performance) {
      const memory = (performance as any).memory
      perfInfo.memory = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    }
    
    // ペイント情報
    if (options.includePerformance && 'getEntriesByType' in performance) {
      try {
        const paintEntries = performance.getEntriesByType('paint')
        const fpEntry = paintEntries.find(entry => entry.name === 'first-paint')
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
        
        if (fpEntry) perfInfo.timing.firstPaint = fpEntry.startTime
        if (fcpEntry) perfInfo.timing.firstContentfulPaint = fcpEntry.startTime
      } catch (error) {
        // サポートされていない場合は無視
      }
    }
    
    // 接続情報
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      perfInfo.connection = {
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0
      }
    }
    
    return perfInfo
  }
  
  /**
   * アプリケーション情報を収集
   */
  private collectApplicationInfo(options: CollectionOptions): DebugInfo['application'] {
    const appInfo: DebugInfo['application'] = {
      url: this.sanitizeUrl(window.location.href),
      referrer: this.sanitizeUrl(document.referrer),
      activeFeatures: this.featureProvider ? this.featureProvider() : this.detectActiveFeatures(),
      errorCount: this.getErrorCount()
    }
    
    if (options.includeGameState && this.gameStateProvider) {
      try {
        appInfo.gameState = this.gameStateProvider() as any
      } catch (error) {
        // エラーが発生した場合は'error'状態とする
        appInfo.gameState = 'error'
      }
    }
    
    if (this.componentProvider) {
      try {
        appInfo.currentComponent = this.componentProvider()
      } catch (error) {
        // 取得できない場合は無視
      }
    }
    
    // ルートパス（Vue Router等）
    if (window.location.pathname) {
      appInfo.routePath = window.location.pathname
    }
    
    // 最後のエラー情報
    const lastError = this.getLastError()
    if (lastError) {
      appInfo.lastError = lastError
    }
    
    return appInfo
  }
  
  /**
   * ブラウザ機能情報を収集
   */
  private collectFeatureInfo(): DebugInfo['features'] {
    return {
      localStorage: this.testFeature(() => 'localStorage' in window && window.localStorage !== null),
      sessionStorage: this.testFeature(() => 'sessionStorage' in window && window.sessionStorage !== null),
      webGL: this.testFeature(() => this.hasWebGL()),
      webWorker: this.testFeature(() => 'Worker' in window),
      serviceWorker: this.testFeature(() => 'serviceWorker' in navigator),
      notifications: this.testFeature(() => 'Notification' in window),
      geolocation: this.testFeature(() => 'geolocation' in navigator),
      mediaDevices: this.testFeature(() => 'mediaDevices' in navigator)
    }
  }
  
  /**
   * 実験的機能情報を収集
   */
  private collectExperimentalInfo(): DebugInfo['experimental'] {
    return {
      flags: this.getFeatureFlags(),
      abTests: this.getABTests(),
      featureToggles: this.getFeatureToggles()
    }
  }
  
  /**
   * 機能のテスト
   */
  private testFeature(test: () => boolean): boolean {
    try {
      return test()
    } catch {
      return false
    }
  }
  
  /**
   * WebGLサポートの確認
   */
  private hasWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas')
      return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    } catch {
      return false
    }
  }
  
  /**
   * URLをサニタイズ（機密情報を除去）
   */
  private sanitizeUrl(url: string): string {
    if (!url) return ''
    
    try {
      const urlObj = new URL(url)
      
      // クエリパラメータから機密情報を除去
      const sanitizedParams = new URLSearchParams()
      urlObj.searchParams.forEach((value, key) => {
        // トークンやIDなどの機密情報を除去
        if (!this.isSensitiveParam(key)) {
          sanitizedParams.set(key, value)
        }
      })
      
      return `${urlObj.origin}${urlObj.pathname}${sanitizedParams.toString() ? `?${  sanitizedParams.toString()}` : ''}`
    } catch {
      // URLが無効な場合はドメインのみ返す
      return url.split('?')[0].split('#')[0]
    }
  }
  
  /**
   * 機密パラメータの判定
   */
  private isSensitiveParam(key: string): boolean {
    const sensitiveKeys = [
      'token', 'auth', 'session', 'key', 'secret',
      'password', 'pwd', 'pass', 'api_key', 'apikey',
      'access_token', 'refresh_token', 'jwt', 'bearer'
    ]
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    )
  }
  
  /**
   * アクティブ機能を検出
   */
  private detectActiveFeatures(): string[] {
    const features: string[] = []
    
    // DOM要素から機能を推測
    if (document.querySelector('[data-game-canvas]')) features.push('game')
    if (document.querySelector('[data-tutorial]')) features.push('tutorial')
    if (document.querySelector('[data-statistics]')) features.push('statistics')
    if (document.querySelector('[data-settings]')) features.push('settings')
    
    // ローカルストレージから機能を推測
    try {
      if (localStorage.getItem('game_settings')) features.push('settings-saved')
      if (localStorage.getItem('game_progress')) features.push('progress-saved')
      if (localStorage.getItem('tutorial_completed')) features.push('tutorial-completed')
    } catch {
      // アクセスできない場合は無視
    }
    
    return features
  }
  
  /**
   * エラー数を取得
   */
  private getErrorCount(): number {
    try {
      // グローバルエラーハンドラーから統計を取得
      const errorHandling = (window as any).__errorHandling
      if (errorHandling?.getStatistics) {
        const stats = errorHandling.getStatistics()
        return stats.totalErrors || 0
      }
    } catch {
      // 取得できない場合は0を返す
    }
    return 0
  }
  
  /**
   * 最後のエラー情報を取得
   */
  private getLastError(): DebugInfo['application']['lastError'] {
    try {
      const errorHandling = (window as any).__errorHandling
      if (errorHandling?.getStatistics) {
        const stats = errorHandling.getStatistics()
        if (stats.logs && stats.logs.length > 0) {
          const lastLog = stats.logs[stats.logs.length - 1]
          return {
            message: lastLog.errorInfo.message,
            timestamp: lastLog.timestamp,
            severity: lastLog.errorInfo.severity
          }
        }
      }
    } catch {
      // 取得できない場合はundefinedを返す
    }
    return undefined
  }
  
  /**
   * 機能フラグを取得
   */
  private getFeatureFlags(): Record<string, boolean> {
    const flags: Record<string, boolean> = {}
    
    try {
      // 環境変数から機能フラグを取得
      const flagKeys = Object.keys(import.meta.env).filter(key => 
        key.startsWith('VITE_FEATURE_FLAG_')
      )
      
      flagKeys.forEach(key => {
        const flagName = key.replace('VITE_FEATURE_FLAG_', '').toLowerCase()
        flags[flagName] = import.meta.env[key] === 'true'
      })
    } catch {
      // 取得できない場合は空のオブジェクト
    }
    
    return flags
  }
  
  /**
   * A/Bテスト情報を取得
   */
  private getABTests(): Record<string, string> {
    const tests: Record<string, string> = {}
    
    try {
      // ローカルストレージからA/Bテスト情報を取得
      const abTestData = localStorage.getItem('ab_tests')
      if (abTestData) {
        Object.assign(tests, JSON.parse(abTestData))
      }
    } catch {
      // 取得できない場合は空のオブジェクト
    }
    
    return tests
  }
  
  /**
   * 機能トグル情報を取得
   */
  private getFeatureToggles(): Record<string, boolean> {
    const toggles: Record<string, boolean> = {}
    
    try {
      // ローカルストレージから機能トグル情報を取得
      const toggleData = localStorage.getItem('feature_toggles')
      if (toggleData) {
        Object.assign(toggles, JSON.parse(toggleData))
      }
    } catch {
      // 取得できない場合は空のオブジェクト
    }
    
    return toggles
  }
  
  /**
   * データをサニタイズ
   */
  private sanitizeData(data: DebugInfo): DebugInfo {
    // 深いコピーを作成
    const sanitized = JSON.parse(JSON.stringify(data))
    
    // User Agentから不要な情報を除去
    if (sanitized.system.userAgent) {
      sanitized.system.userAgent = this.sanitizeUserAgent(sanitized.system.userAgent)
    }
    
    // URLから機密情報を除去（既にsanitizeUrlで処理済み）
    
    return sanitized
  }
  
  /**
   * User Agentをサニタイズ
   */
  private sanitizeUserAgent(userAgent: string): string {
    // 基本的なブラウザ情報のみ残す
    const parts = userAgent.split(' ')
    const importantParts = parts.filter(part => {
      return part.includes('Chrome') || 
             part.includes('Firefox') || 
             part.includes('Safari') || 
             part.includes('Edge') ||
             part.includes('Mobile') ||
             part.includes('Windows') ||
             part.includes('Mac') ||
             part.includes('Linux')
    })
    
    return importantParts.slice(0, 5).join(' ') // 最大5つまで
  }
  
  /**
   * データサイズを制限
   */
  private truncateData(data: DebugInfo, maxSize: number): DebugInfo {
    // 優先度の低い情報から削除
    const truncated = { ...data }
    
    // 実験的情報を削除
    delete truncated.experimental
    
    // パフォーマンス詳細を削除
    if (truncated.performance.memory) {
      delete truncated.performance.memory
    }
    
    if (truncated.performance.connection) {
      delete truncated.performance.connection
    }
    
    // まだサイズが大きい場合はアプリケーション情報を簡略化
    if (JSON.stringify(truncated).length > maxSize) {
      truncated.application = {
        url: truncated.application.url,
        errorCount: truncated.application.errorCount,
        activeFeatures: []
      }
    }
    
    return truncated
  }
}

// シングルトンインスタンス
let debugInfoCollector: DebugInfoCollector | null = null

/**
 * デバッグ情報コレクターのインスタンスを取得
 */
export function getDebugInfoCollector(
  sessionId?: string,
  buildVersion?: string,
  environment?: string
): DebugInfoCollector {
  if (!debugInfoCollector) {
    debugInfoCollector = new DebugInfoCollector(
      sessionId || 'unknown',
      buildVersion || import.meta.env.VITE_BUILD_VERSION || 'unknown',
      environment || import.meta.env.MODE || 'unknown'
    )
  }
  return debugInfoCollector
}