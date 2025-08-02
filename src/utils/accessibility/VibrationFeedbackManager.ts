/**
 * VibrationFeedbackManager - Vibration APIを使った次世代振動フィードバック
 * 
 * 機能:
 * - ゲームアクションに応じた直感的な振動パターン
 * - アクセシビリティ対応の触覚フィードバック
 * - カスタム振動パターンの作成
 * - 省電力モード対応
 * - 振動無効化オプション
 */

export interface VibrationPattern {
  name: string
  pattern: number[]
  description: string
  category: 'game' | 'ui' | 'notification' | 'accessibility'
  intensity: 'light' | 'medium' | 'strong'
  duration: number
}

export interface VibrationConfig {
  enabled: boolean
  globalIntensity: number // 0.0 - 1.0
  respectPowerSaving: boolean
  respectUserPreferences: boolean
  maxDuration: number // ミリ秒
  cooldownMs: number // 振動間のクールダウン
}

export interface HapticFeedbackEvent {
  type: 'success' | 'error' | 'warning' | 'info' | 'interaction' | 'game_action'
  action?: string
  intensity?: 'light' | 'medium' | 'strong'
  customPattern?: number[]
  context?: string
}

export class VibrationFeedbackManager {
  private config: VibrationConfig
  private readonly patterns: Map<string, VibrationPattern> = new Map()
  private lastVibrationTime = 0
  private isVibrating = false
  private readonly supportedFeatures: {
    basicVibration: boolean
    patternVibration: boolean
    gamepadHaptics: boolean
  }

  // プリセット振動パターン
  private readonly defaultPatterns: VibrationPattern[] = [
    // ゲームアクション
    {
      name: 'card_draw',
      pattern: [50],
      description: 'カードを引いた時の軽い振動',
      category: 'game',
      intensity: 'light',
      duration: 50
    },
    {
      name: 'card_play',
      pattern: [100, 50, 100],
      description: 'カードをプレイした時の確認振動',
      category: 'game',
      intensity: 'medium',
      duration: 250
    },
    {
      name: 'insurance_activate',
      pattern: [150, 100, 150, 100, 200],
      description: '保険カード適用時の重要な振動',
      category: 'game',
      intensity: 'strong',
      duration: 600
    },
    {
      name: 'challenge_success',
      pattern: [200, 100, 200, 100, 300],
      description: 'チャレンジ成功時の祝福振動',
      category: 'game',
      intensity: 'strong',
      duration: 800
    },
    {
      name: 'challenge_failure',
      pattern: [300, 200, 300],
      description: 'チャレンジ失敗時の警告振動',
      category: 'game',
      intensity: 'strong',
      duration: 800
    },
    {
      name: 'turn_end',
      pattern: [100, 100, 100],
      description: 'ターン終了時の区切り振動',
      category: 'game',
      intensity: 'medium',
      duration: 300
    },
    {
      name: 'game_over',
      pattern: [500, 200, 300, 200, 200, 200, 100],
      description: 'ゲーム終了時の最終振動',
      category: 'game',
      intensity: 'strong',
      duration: 1300
    },

    // UIインタラクション
    {
      name: 'button_tap',
      pattern: [30],
      description: 'ボタンタップ時の軽い確認振動',
      category: 'ui',
      intensity: 'light',
      duration: 30
    },
    {
      name: 'menu_open',
      pattern: [80, 40, 80],
      description: 'メニュー開閉時の振動',
      category: 'ui',
      intensity: 'medium',
      duration: 200
    },
    {
      name: 'drag_start',
      pattern: [60],
      description: 'ドラッグ開始時の振動',
      category: 'ui',
      intensity: 'light',
      duration: 60
    },
    {
      name: 'drag_drop',
      pattern: [100, 50, 50],
      description: 'ドロップ成功時の振動',
      category: 'ui',
      intensity: 'medium',
      duration: 200
    },
    {
      name: 'scroll_boundary',
      pattern: [40, 20, 40],
      description: 'スクロール境界に達した時の振動',
      category: 'ui',
      intensity: 'light',
      duration: 100
    },

    // 通知・フィードバック
    {
      name: 'success_notification',
      pattern: [100, 50, 100],
      description: '成功通知の振動',
      category: 'notification',
      intensity: 'medium',
      duration: 250
    },
    {
      name: 'error_notification',
      pattern: [200, 100, 200, 100, 200],
      description: 'エラー通知の強い振動',
      category: 'notification',
      intensity: 'strong',
      duration: 700
    },
    {
      name: 'warning_notification',
      pattern: [150, 50, 150],
      description: '警告通知の振動',
      category: 'notification',
      intensity: 'medium',
      duration: 350
    },
    {
      name: 'info_notification',
      pattern: [80],
      description: '情報通知の軽い振動',
      category: 'notification',
      intensity: 'light',
      duration: 80
    },

    // アクセシビリティ支援
    {
      name: 'focus_change',
      pattern: [25],
      description: 'フォーカス移動時の微細な振動',
      category: 'accessibility',
      intensity: 'light',
      duration: 25
    },
    {
      name: 'selection_change',
      pattern: [40, 20, 40],
      description: '選択変更時の振動',
      category: 'accessibility',
      intensity: 'light',
      duration: 100
    },
    {
      name: 'page_change',
      pattern: [120, 80, 120],
      description: 'ページ変更時の振動',
      category: 'accessibility',
      intensity: 'medium',
      duration: 320
    },
    {
      name: 'important_announcement',
      pattern: [200, 100, 100, 100, 200],
      description: '重要なアナウンス時の振動',
      category: 'accessibility',
      intensity: 'strong',
      duration: 700
    }
  ]

  constructor(config: Partial<VibrationConfig> = {}) {
    this.config = {
      enabled: true,
      globalIntensity: 1.0,
      respectPowerSaving: true,
      respectUserPreferences: true,
      maxDuration: 2000,
      cooldownMs: 50,
      ...config
    }

    this.supportedFeatures = this.detectSupportedFeatures()
    this.loadPatterns()
    this.setupUserPreferences()
  }

  /**
   * サポートされている機能の検出
   */
  private detectSupportedFeatures() {
    return {
      basicVibration: 'vibrate' in navigator,
      patternVibration: 'vibrate' in navigator && 
        navigator.vibrate([100, 100, 100]),
      gamepadHaptics: 'getGamepads' in navigator &&
        navigator.getGamepads().some(gamepad => 
          gamepad?.vibrationActuator?.type === 'dual-rumble'
        )
    }
  }

  /**
   * デフォルトパターンの読み込み
   */
  private loadPatterns(): void {
    this.defaultPatterns.forEach(pattern => {
      this.patterns.set(pattern.name, pattern)
    })
  }

  /**
   * ユーザー設定の確認
   */
  private setupUserPreferences(): void {
    if (!this.config.respectUserPreferences) return

    // プリファーズ設定の確認
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.globalIntensity = Math.min(this.config.globalIntensity, 0.5)
    }

    // バッテリー API での省電力モード確認
    if ('getBattery' in navigator && this.config.respectPowerSaving) {
      (navigator as any).getBattery().then((battery: any) => {
        if (battery.level < 0.2 || battery.charging === false) {
          this.config.globalIntensity = Math.min(this.config.globalIntensity, 0.3)
        }
      }).catch(() => {
        // バッテリー情報が取得できない場合は無視
      })
    }
  }

  /**
   * 振動の実行
   */
  public vibrate(patternName: string, options: {
    intensity?: number
    respectCooldown?: boolean
    force?: boolean
  } = {}): boolean {
    if (!this.canVibrate(options.force)) {
      return false
    }

    const pattern = this.patterns.get(patternName)
    if (!pattern) {
      console.warn(`Vibration pattern '${patternName}' not found`)
      return false
    }

    return this.executeVibration(pattern, options.intensity)
  }

  /**
   * カスタム振動パターンの実行
   */
  public vibrateCustom(pattern: number[], options: {
    intensity?: number
    respectCooldown?: boolean
    force?: boolean
  } = {}): boolean {
    if (!this.canVibrate(options.force)) {
      return false
    }

    const customPattern: VibrationPattern = {
      name: 'custom',
      pattern,
      description: 'Custom vibration pattern',
      category: 'ui',
      intensity: 'medium',
      duration: pattern.reduce((sum, val) => sum + val, 0)
    }

    return this.executeVibration(customPattern, options.intensity)
  }

  /**
   * ゲームイベントに基づく振動
   */
  public vibrateForGameEvent(event: string, context?: any): boolean {
    const eventPatternMap: Record<string, string> = {
      'card_drawn': 'card_draw',
      'card_played': 'card_play',
      'insurance_applied': 'insurance_activate',
      'challenge_won': 'challenge_success',
      'challenge_lost': 'challenge_failure',
      'turn_ended': 'turn_end',
      'game_ended': 'game_over'
    }

    const patternName = eventPatternMap[event]
    if (!patternName) {
      return false
    }

    return this.vibrate(patternName)
  }

  /**
   * ハプティックフィードバックイベントの処理
   */
  public handleHapticEvent(event: HapticFeedbackEvent): boolean {
    if (event.customPattern) {
      return this.vibrateCustom(event.customPattern)
    }

    // イベントタイプに基づくパターン選択
    const typePatternMap: Record<string, string> = {
      'success': 'success_notification',
      'error': 'error_notification',
      'warning': 'warning_notification',
      'info': 'info_notification',
      'interaction': 'button_tap'
    }

    let patternName = typePatternMap[event.type]
    
    // ゲームアクション特有のパターン
    if (event.type === 'game_action' && event.action) {
      patternName = event.action
    }

    if (!patternName) {
      patternName = 'button_tap' // デフォルト
    }

    const intensityMap: Record<string, number> = {
      'light': 0.3,
      'medium': 0.7,
      'strong': 1.0
    }

    const intensity = event.intensity ? intensityMap[event.intensity] : undefined

    return this.vibrate(patternName, { intensity })
  }

  /**
   * アクセシビリティ支援振動
   */
  public vibrateForAccessibility(type: 'focus' | 'selection' | 'page' | 'announcement'): boolean {
    const accessibilityPatterns: Record<string, string> = {
      'focus': 'focus_change',
      'selection': 'selection_change',
      'page': 'page_change',
      'announcement': 'important_announcement'
    }

    return this.vibrate(accessibilityPatterns[type])
  }

  /**
   * ゲームパッドハプティクス（対応デバイスのみ）
   */
  public vibrateGamepad(intensity: number = 0.5, duration: number = 200): boolean {
    if (!this.supportedFeatures.gamepadHaptics) {
      return false
    }

    const gamepads = navigator.getGamepads()
    let success = false

    for (const gamepad of gamepads) {
      if (gamepad?.vibrationActuator) {
        gamepad.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration,
          weakMagnitude: intensity * 0.5,
          strongMagnitude: intensity
        }).then(() => {
          success = true
        }).catch(() => {
          // エラーは無視
        })
      }
    }

    return success
  }

  /**
   * パターンの追加・カスタマイズ
   */
  public addPattern(pattern: VibrationPattern): void {
    // 最大時間の制限
    if (pattern.duration > this.config.maxDuration) {
      console.warn(`Pattern duration exceeds maximum allowed (${this.config.maxDuration}ms)`)
      return
    }

    this.patterns.set(pattern.name, pattern)
  }

  /**
   * パターンの削除
   */
  public removePattern(name: string): boolean {
    return this.patterns.delete(name)
  }

  /**
   * 利用可能なパターンの取得
   */
  public getAvailablePatterns(): VibrationPattern[] {
    return Array.from(this.patterns.values())
  }

  /**
   * カテゴリ別パターンの取得
   */
  public getPatternsByCategory(category: VibrationPattern['category']): VibrationPattern[] {
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.category === category)
  }

  /**
   * 振動可能かどうかの判定
   */
  private canVibrate(force = false): boolean {
    if (force) return this.supportedFeatures.basicVibration

    if (!this.config.enabled || !this.supportedFeatures.basicVibration) {
      return false
    }

    // クールダウン確認
    const now = Date.now()
    if (now - this.lastVibrationTime < this.config.cooldownMs) {
      return false
    }

    // 既に振動中の場合
    if (this.isVibrating) {
      return false
    }

    return true
  }

  /**
   * 振動の実行
   */
  private executeVibration(pattern: VibrationPattern, intensityOverride?: number): boolean {
    if (!navigator.vibrate) {
      return false
    }

    const intensity = intensityOverride ?? this.config.globalIntensity
    const adjustedPattern = pattern.pattern.map(duration => 
      Math.round(duration * intensity)
    ).filter(duration => duration > 0)

    if (adjustedPattern.length === 0) {
      return false
    }

    this.isVibrating = true
    this.lastVibrationTime = Date.now()

    try {
      const success = navigator.vibrate(adjustedPattern)
      
      // 振動終了時の処理
      setTimeout(() => {
        this.isVibrating = false
      }, pattern.duration)

      return success
    } catch (error) {
      console.error('Vibration failed:', error)
      this.isVibrating = false
      return false
    }
  }

  /**
   * 振動の停止
   */
  public stopVibration(): void {
    if (navigator.vibrate) {
      navigator.vibrate(0)
    }
    this.isVibrating = false
  }

  /**
   * 設定の更新
   */
  public updateConfig(newConfig: Partial<VibrationConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (!this.config.enabled) {
      this.stopVibration()
    }
  }

  /**
   * サポート状況の取得
   */
  public getSupportInfo(): {
    isSupported: boolean
    features: typeof this.supportedFeatures
    config: VibrationConfig
  } {
    return {
      isSupported: this.supportedFeatures.basicVibration,
      features: this.supportedFeatures,
      config: this.config
    }
  }

  /**
   * 振動パターンのテスト
   */
  public testPattern(patternName: string): boolean {
    return this.vibrate(patternName, { force: true })
  }

  /**
   * 利用統計の取得
   */
  public getUsageStats(): {
    totalVibrations: number
    lastVibrationTime: number
    isCurrentlyVibrating: boolean
  } {
    return {
      totalVibrations: this.vibrationCount,
      lastVibrationTime: this.lastVibrationTime,
      isCurrentlyVibrating: this.isVibrating
    }
  }

  private readonly vibrationCount = 0

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.stopVibration()
    this.patterns.clear()
  }
}

// Vue Composition API用のフック
export function useVibrationFeedback(config: Partial<VibrationConfig> = {}) {
  const { ref, onMounted, onUnmounted } = require('vue')
  
  const vibrationManager = ref<VibrationFeedbackManager | null>(null)
  const isSupported = ref(false)
  const isEnabled = ref(true)

  onMounted(() => {
    vibrationManager.value = new VibrationFeedbackManager(config)
    const supportInfo = vibrationManager.value.getSupportInfo()
    isSupported.value = supportInfo.isSupported
    isEnabled.value = supportInfo.config.enabled

    onUnmounted(() => {
      vibrationManager.value?.destroy()
    })
  })

  const vibrate = (patternName: string, options?: any) => {
    return vibrationManager.value?.vibrate(patternName, options) || false
  }

  const vibrateCustom = (pattern: number[], options?: any) => {
    return vibrationManager.value?.vibrateCustom(pattern, options) || false
  }

  const vibrateForEvent = (event: HapticFeedbackEvent) => {
    return vibrationManager.value?.handleHapticEvent(event) || false
  }

  const vibrateForGameEvent = (event: string, context?: any) => {
    return vibrationManager.value?.vibrateForGameEvent(event, context) || false
  }

  const setEnabled = (enabled: boolean) => {
    vibrationManager.value?.updateConfig({ enabled })
    isEnabled.value = enabled
  }

  return {
    vibrationManager,
    isSupported,
    isEnabled,
    vibrate,
    vibrateCustom,
    vibrateForEvent,
    vibrateForGameEvent,
    setEnabled
  }
}