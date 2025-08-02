/**
 * Accessibility Utils Index - 次世代アクセシビリティシステムの統合エクスポート
 * 
 * このファイルは、プロジェクトのすべてのアクセシビリティ機能を統合し、
 * 一元的なAPIを提供します。
 */

// Core accessibility managers
export { EnhancedScreenReaderManager } from './EnhancedScreenReaderManager'
export { VoiceControlManager, useVoiceControl } from './VoiceControlManager'
export { VibrationFeedbackManager, useVibrationFeedback } from './VibrationFeedbackManager'
export { CognitiveAccessibilityManager, useCognitiveAccessibility } from './CognitiveAccessibilityManager'

// Existing accessibility components (re-export enhanced versions)
export { ARIAManager } from './ARIAManager'
export { ScreenReaderManager } from './ScreenReaderManager'
export { KeyboardManager } from './KeyboardManager'
export { EnhancedKeyboardManager } from './EnhancedKeyboardManager'
export { ColorBlindnessManager } from './ColorBlindnessManager'
export { HighContrastManager } from './HighContrastManager'

// Type definitions
export type {
  VoiceCommand,
  VoiceControlConfig,
  RecognitionResult
} from './VoiceControlManager'

export type {
  VibrationPattern,
  VibrationConfig,  
  HapticFeedbackEvent
} from './VibrationFeedbackManager'

export type {
  CognitiveLoad,
  CognitiveProfile,
  CognitiveConfig,
  AccessibilityAdaptation
} from './CognitiveAccessibilityManager'

export type {
  ContextualAnnouncement,
  VerbosityLevel,
  GameSpecificContext
} from './EnhancedScreenReaderManager'

/**
 * 統合アクセシビリティマネージャー
 * すべてのアクセシビリティ機能を一元管理
 */
export class UniversalAccessibilitySystem {
  private readonly screenReader: EnhancedScreenReaderManager
  private readonly voiceControl: VoiceControlManager | null = null
  private readonly vibrationFeedback: VibrationFeedbackManager
  private readonly cognitiveManager: CognitiveAccessibilityManager
  private isInitialized = false

  constructor(config: {
    enableVoiceControl?: boolean
    enableVibration?: boolean
    enableCognitive?: boolean
    screenReaderConfig?: any
    voiceConfig?: any
    vibrationConfig?: any
    cognitiveConfig?: any
  } = {}) {
    // Initialize core systems
    this.screenReader = new EnhancedScreenReaderManager()
    this.vibrationFeedback = new VibrationFeedbackManager(config.vibrationConfig)
    this.cognitiveManager = new CognitiveAccessibilityManager(config.cognitiveConfig)
    
    // Initialize optional systems
    if (config.enableVoiceControl) {
      this.voiceControl = new VoiceControlManager(config.voiceConfig)
    }
  }

  /**
   * システム全体の初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // スクリーンリーダーの初期化
      // (EnhancedScreenReaderManagerは自動初期化)

      // 音声コントロールの初期化
      if (this.voiceControl) {
        // 必要に応じて音声認識の準備
      }

      // 認知支援機能のページ最適化
      const mainContent = document.querySelector('main') || document.body
      this.cognitiveManager.optimizeForCognitiveLoad(mainContent)

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize accessibility system:', error)
    }
  }

  /**
   * 音声でのゲーム操作開始
   */
  public startVoiceControl(): void {
    this.voiceControl?.startListening()
    this.vibrationFeedback.vibrateForEvent({
      type: 'success',
      intensity: 'medium'
    })
    this.screenReader.announce('音声コントロールを開始しました', { priority: 'assertive' })
  }

  /**
   * 音声操作停止
   */
  public stopVoiceControl(): void {
    this.voiceControl?.stopListening()
    this.screenReader.announce('音声コントロールを停止しました', { priority: 'polite' })
  }

  /**
   * ゲーム状況の包括的アナウンス
   */
  public announceGameState(gameState: any): void {
    this.screenReader.updateGameContext(gameState)
    this.screenReader.announceFullGameState()
    
    // 認知負荷に応じた振動フィードバック
    const cognitiveLoad = this.cognitiveManager.getCurrentLoad()
    if (cognitiveLoad.overall > 0.7) {
      this.vibrationFeedback.vibrateForEvent({
        type: 'warning',
        intensity: 'light'
      })
    }
  }

  /**
   * アクセシビリティエラーの報告
   */
  public reportAccessibilityError(error: string, recovery?: string[]): void {
    this.screenReader.announceErrorWithRecovery(error, recovery)
    this.vibrationFeedback.vibrateForEvent({
      type: 'error',
      intensity: 'strong'
    })
  }

  /**
   * ページの認知負荷を最適化
   */
  public optimizePage(element?: HTMLElement): void {
    const target = element || document.body
    this.cognitiveManager.optimizeForCognitiveLoad(target)
  }

  /**
   * 緊急アクセシビリティモードの有効化
   */
  public activateEmergencyMode(): void {
    // 最大アクセシビリティ設定
    document.documentElement.classList.add('emergency-accessibility')
    document.documentElement.style.fontSize = '24px'
    
    // ハイコントラスト
    document.documentElement.classList.add('high-contrast')
    
    // モーション削減
    document.documentElement.classList.add('reduce-motion')
    
    // 音声コントロール開始
    this.startVoiceControl()
    
    // 通知
    this.screenReader.announce(
      '緊急アクセシビリティモードを有効にしました。大きな文字、ハイコントラスト、音声操作が利用できます。',
      { priority: 'assertive' }
    )
    
    this.vibrationFeedback.vibrateForEvent({
      type: 'success',
      intensity: 'strong'
    })
  }

  /**
   * アクセシビリティ統計の取得
   */
  public getAccessibilityStats(): any {
    return {
      screenReader: this.screenReader.getScreenReaderStats(),
      vibration: this.vibrationFeedback.getSupportInfo(),
      cognitive: this.cognitiveManager.getCurrentLoad(),
      voiceControl: this.voiceControl?.getIsListening() || false
    }
  }

  /**
   * システム全体のクリーンアップ
   */
  public destroy(): void {
    this.screenReader.destroy()
    this.voiceControl?.destroy()
    this.vibrationFeedback.destroy()
    this.cognitiveManager.destroy()
    this.isInitialized = false
  }
}

/**
 * Vue Composition API用の統合フック
 */
export function useUniversalAccessibility(config: any = {}) {
  const { ref, onMounted, onUnmounted } = require('vue')
  
  const accessibilitySystem = ref<UniversalAccessibilitySystem | null>(null)
  const isInitialized = ref(false)
  const stats = ref<any>(null)

  onMounted(async () => {
    accessibilitySystem.value = new UniversalAccessibilitySystem(config)
    await accessibilitySystem.value.initialize()
    isInitialized.value = true
    stats.value = accessibilitySystem.value.getAccessibilityStats()

    onUnmounted(() => {
      accessibilitySystem.value?.destroy()
    })
  })

  const announceGameState = (gameState: any) => {
    accessibilitySystem.value?.announceGameState(gameState)
  }

  const startVoiceControl = () => {
    accessibilitySystem.value?.startVoiceControl()
  }

  const stopVoiceControl = () => {
    accessibilitySystem.value?.stopVoiceControl()
  }

  const optimizePage = (element?: HTMLElement) => {
    accessibilitySystem.value?.optimizePage(element)
  }

  const activateEmergencyMode = () => {
    accessibilitySystem.value?.activateEmergencyMode()
  }

  const reportError = (error: string, recovery?: string[]) => {
    accessibilitySystem.value?.reportAccessibilityError(error, recovery)
  }

  return {
    accessibilitySystem,
    isInitialized,
    stats,
    announceGameState,
    startVoiceControl,
    stopVoiceControl,
    optimizePage,
    activateEmergencyMode,
    reportError
  }
}

/**
 * グローバルアクセシビリティ設定の適用
 */
export function applyGlobalAccessibilitySettings(settings: {
  highContrast?: boolean
  reducedMotion?: boolean
  largeText?: boolean
  screenReaderMode?: boolean
  touchOptimization?: boolean
}): void {
  const root = document.documentElement

  // ハイコントラスト
  root.classList.toggle('high-contrast', settings.highContrast)
  
  // モーション削減
  root.classList.toggle('reduce-motion', settings.reducedMotion)
  
  // 大きなテキスト
  if (settings.largeText) {
    root.style.fontSize = '120%'
  } else {
    root.style.fontSize = ''
  }
  
  // スクリーンリーダーモード
  root.classList.toggle('screen-reader-mode', settings.screenReaderMode)
  
  // タッチ最適化
  root.classList.toggle('touch-optimized', settings.touchOptimization)
}

/**
 * アクセシビリティチェック関数
 */
export function checkAccessibilityCompliance(element: HTMLElement): {
  score: number
  issues: string[]
  recommendations: string[]
} {
  const issues: string[] = []
  const recommendations: string[] = []

  // 基本的なチェック
  const interactiveElements = element.querySelectorAll('button, a, input, select, textarea')
  interactiveElements.forEach((el, index) => {
    // ARIA属性のチェック
    if (!el.getAttribute('aria-label') && !el.textContent?.trim()) {
      issues.push(`Interactive element ${index + 1} lacks accessible name`)
      recommendations.push(`Add aria-label to element ${index + 1}`)
    }
    
    // フォーカス可能性のチェック
    const tabIndex = el.getAttribute('tabindex')
    if (tabIndex === '-1' && el.tagName !== 'DIV') {
      issues.push(`Element ${index + 1} is not focusable`)
      recommendations.push(`Remove tabindex="-1" or add proper focus management`)
    }
  })

  // 見出し構造のチェック  
  const headings = element.querySelectorAll('h1, h2, h3, h4, h5, h6')
  if (headings.length === 0) {
    issues.push('No heading structure found')
    recommendations.push('Add proper heading hierarchy (h1, h2, etc.)')
  }

  // ランドマークのチェック
  const landmarks = element.querySelectorAll('main, nav, aside, header, footer, [role="main"], [role="navigation"]')
  if (landmarks.length === 0) {
    issues.push('No landmark elements found')
    recommendations.push('Add semantic HTML5 elements or ARIA landmarks')
  }

  // コントラスト（簡易チェック）
  const computedStyle = getComputedStyle(element)
  const color = computedStyle.color
  const backgroundColor = computedStyle.backgroundColor
  
  if (color === backgroundColor) {
    issues.push('Insufficient color contrast detected')
    recommendations.push('Ensure adequate color contrast ratio (4.5:1 minimum)')
  }

  // スコア計算
  const totalChecks = 10 // 基本的なチェック項目数
  const passedChecks = totalChecks - issues.length
  const score = Math.max(0, (passedChecks / totalChecks) * 100)

  return {
    score: Math.round(score),
    issues,
    recommendations
  }
}

/**
 * クイックアクセシビリティ修正
 */
export function quickAccessibilityFix(element: HTMLElement): void {
  // 基本的な修正を自動適用
  const buttons = element.querySelectorAll('button:not([aria-label]):not([aria-labelledby])')
  buttons.forEach((button, index) => {
    if (!button.textContent?.trim() && !button.querySelector('img[alt]')) {
      button.setAttribute('aria-label', `Button ${index + 1}`)
    }
  })

  // リンクの修正
  const links = element.querySelectorAll('a:not([aria-label]):not([aria-labelledby])')
  links.forEach((link, index) => {
    if (!link.textContent?.trim()) {
      link.setAttribute('aria-label', `Link ${index + 1}`)
    }
  })

  // 画像の修正
  const images = element.querySelectorAll('img:not([alt])')
  images.forEach((img) => {
    img.setAttribute('alt', 'Image')
  })

  // フォームラベルの修正
  const inputs = element.querySelectorAll('input:not([aria-label]):not([aria-labelledby])')
  inputs.forEach((input, index) => {
    const type = input.getAttribute('type') || 'text'
    input.setAttribute('aria-label', `${type} input ${index + 1}`)
  })
}

// デフォルトエクスポート
export default {
  UniversalAccessibilitySystem,
  useUniversalAccessibility,
  applyGlobalAccessibilitySettings,
  checkAccessibilityCompliance,
  quickAccessibilityFix
}