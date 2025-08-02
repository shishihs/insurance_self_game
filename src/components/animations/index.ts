/**
 * Enhanced Animation System - Export Module
 * カードアニメーションとトランジションの統合システム
 */

// コンポーネントのエクスポート
export { default as AdvancedCardAnimations } from './AdvancedCardAnimations.vue'
export { default as GameStateTransitions } from './GameStateTransitions.vue' 
export { default as InteractiveElements } from './InteractiveElements.vue'
export { default as EnhancedAnimationSystem } from './EnhancedAnimationSystem.vue'
export { default as TransitionAnimations } from './TransitionAnimations.vue'

// TypeScript型定義のエクスポート
export type {
  CardAnimationOptions,
  CardPhysicsConfig,
  ParticleConfig
} from '../../game/effects/AdvancedCardAnimations'

export type {
  PerformanceMetrics,
  OptimizationSettings,
  DeviceCapabilities
} from '../../game/effects/AnimationPerformanceOptimizer'

// パフォーマンス最適化ユーティリティのエクスポート
export {
  AnimationPerformanceOptimizer,
  getAnimationPerformanceOptimizer,
  destroyAnimationPerformanceOptimizer
} from '../../game/effects/AnimationPerformanceOptimizer'

// アニメーション効果のエクスポート
export { AdvancedCardAnimations as CardAnimationEffects } from '../../game/effects/AdvancedCardAnimations'

// 便利な型定義
export type GameState = 'menu' | 'playing' | 'paused' | 'victory' | 'defeat' | 'levelUp'
export type TransitionType = 'fade' | 'slide' | 'zoom' | 'flip' | 'curtain' | 'wave' | 'spiral'
export type TransitionDirection = 'left' | 'right' | 'up' | 'down' | 'center'
export type AnimationIntensity = 'subtle' | 'normal' | 'dramatic'
export type QualityLevel = 'low' | 'medium' | 'high'

// デフォルト設定
export const DEFAULT_ANIMATION_SETTINGS = {
  animationIntensity: 'normal' as AnimationIntensity,
  transitionType: 'fade' as TransitionType,
  transitionDirection: 'center' as TransitionDirection,
  transitionDuration: 600,
  enableParticles: true,
  enablePhysics: false,
  enableDrag: true,
  enableDrop: true,
  enableHover: true,
  enableTouch: true,
  performanceMode: false,
  targetFPS: 60,
  maxConcurrentAnimations: 10,
  enableGPUAcceleration: true,
  enableAdaptiveQuality: true,
  accessibilityMode: false,
  reducedMotion: false
}

// パフォーマンス最適化の推奨設定
export const PERFORMANCE_PRESETS = {
  highEnd: {
    targetFPS: 60,
    maxConcurrentAnimations: 15,
    enableGPUAcceleration: true,
    enableAdaptiveQuality: true,
    animationIntensity: 'dramatic' as AnimationIntensity,
    enableParticles: true,
    enablePhysics: true
  },
  
  midRange: {
    targetFPS: 60,
    maxConcurrentAnimations: 10,
    enableGPUAcceleration: true,
    enableAdaptiveQuality: true,
    animationIntensity: 'normal' as AnimationIntensity,
    enableParticles: true,
    enablePhysics: false
  },
  
  lowEnd: {
    targetFPS: 30,
    maxConcurrentAnimations: 5,
    enableGPUAcceleration: false,
    enableAdaptiveQuality: false,
    animationIntensity: 'subtle' as AnimationIntensity,
    enableParticles: false,
    enablePhysics: false
  },
  
  mobile: {
    targetFPS: 60,
    maxConcurrentAnimations: 8,
    enableGPUAcceleration: true,
    enableAdaptiveQuality: true,
    animationIntensity: 'normal' as AnimationIntensity,
    enableParticles: true,
    enablePhysics: false
  },
  
  accessibility: {
    targetFPS: 30,
    maxConcurrentAnimations: 3,
    enableGPUAcceleration: false,
    enableAdaptiveQuality: false,
    animationIntensity: 'subtle' as AnimationIntensity,
    enableParticles: false,
    enablePhysics: false,
    reducedMotion: true
  }
}

// ユーティリティ関数
export const detectDeviceType = (): keyof typeof PERFORMANCE_PRESETS => {
  // モーション削減設定の確認
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return 'accessibility'
  }
  
  // モバイルデバイスの検出
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  if (isMobile) {
    return 'mobile'
  }
  
  // ハードウェア性能の推定
  const hardwareConcurrency = navigator.hardwareConcurrency || 4
  const deviceMemory = (navigator as any).deviceMemory || 4
  
  if (hardwareConcurrency >= 8 && deviceMemory >= 8) {
    return 'highEnd'
  } if (hardwareConcurrency >= 4 && deviceMemory >= 4) {
    return 'midRange'
  } 
    return 'lowEnd'
  
}

export const getOptimalSettings = (deviceType?: keyof typeof PERFORMANCE_PRESETS) => {
  const detectedType = deviceType || detectDeviceType()
  return {
    ...DEFAULT_ANIMATION_SETTINGS,
    ...PERFORMANCE_PRESETS[detectedType]
  }
}

// アニメーション効果の定数
export const ANIMATION_EASINGS = {
  // 基本的なイージング
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  
  // カスタムベジェ曲線
  smoothOut: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  bounceOut: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  anticipate: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  backOut: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  
  // ゲーム専用イージング
  cardFlip: 'cubic-bezier(0.4, 0, 0.2, 1)',
  cardSlide: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  particleFloat: 'cubic-bezier(0.23, 1, 0.32, 1)',
  stateTransition: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
}

export const ANIMATION_DURATIONS = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  dramatic: 800,
  
  // 特定用途
  cardDraw: 600,
  cardPlay: 800,
  cardDiscard: 400,
  stateTransition: 600,
  hoverResponse: 200,
  dragResponse: 150
}

// カラーパレット（パーティクルエフェクト用）
export const EFFECT_COLORS = {
  success: '#51CF66',
  error: '#FF6B6B',
  warning: '#FFE066',
  info: '#4DABF7',
  magic: '#9775FA',
  fire: '#FF6B35',
  water: '#4DABF7',
  earth: '#51CF66',
  air: '#FFE066',
  neutral: '#ADB5BD'
}

// デバッグ用ユーティリティ
export const enableDebugMode = () => {
  if (import.meta.env.DEV) {
    // CSS でアニメーション境界を表示
    const style = document.createElement('style')
    style.textContent = `
      .debug-animation {
        outline: 2px dashed rgba(255, 0, 0, 0.5) !important;
        outline-offset: 2px !important;
      }
      
      .debug-particle {
        border: 1px solid rgba(0, 255, 0, 0.7) !important;
      }
      
      .debug-transition {
        background: rgba(255, 255, 0, 0.1) !important;
      }
    `
    document.head.appendChild(style)
    
    console.log('Animation debug mode enabled')
  }
}

// バージョン情報
export const ANIMATION_SYSTEM_VERSION = '2.0.0'

// 使用例のドキュメント（開発時参考用）
export const USAGE_EXAMPLES = {
  basicSetup: `
import { EnhancedAnimationSystem, getOptimalSettings } from '@/components/animations'

// 最適設定を自動検出
const settings = getOptimalSettings()

// コンポーネントで使用
<EnhancedAnimationSystem
  v-bind="settings"
  :game-state="currentGameState"
  @animation-complete="onAnimationComplete"
>
  <template #cards>
    <!-- カード要素 -->
  </template>
  <template #game-content>
    <!-- ゲームコンテンツ -->
  </template>
</EnhancedAnimationSystem>
  `,
  
  cardAnimation: `
// カードアニメーションの実行
await animationSystem.playCardAnimation(cardElement, 'play', {
  targetPosition: { x: 300, y: 200 },
  duration: 800,
  enableParticles: true
})
  `,
  
  performanceMonitoring: `
// パフォーマンス監視
const metrics = animationSystem.performanceMetrics
console.log(\`FPS: \${metrics.fps}, Memory: \${metrics.memoryUsage}MB\`)
  `
}