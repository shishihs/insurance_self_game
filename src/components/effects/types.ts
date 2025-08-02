/**
 * 視覚効果コンポーネントの型定義
 */

// パーティクルシステム
export interface ParticleSystemProps {
  particleCount?: number
  colorPalette?: string[]
  intensity?: 'low' | 'medium' | 'high'
  speed?: number
  reduceMotion?: boolean
  enabled?: boolean
}

// パララックス背景
export interface ParallaxProps {
  scrollSpeed?: number
  layerCount?: number
  enableMouseParallax?: boolean
  intensity?: 'subtle' | 'normal' | 'dramatic'
  theme?: 'cool' | 'warm' | 'neutral' | 'cosmic'
  reduceMotion?: boolean
}

// グラスモーフィズムカード
export interface GlassmorphismCardProps {
  variant?: 'default' | 'primary' | 'secondary' | 'accent' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  elevated?: boolean
  animated?: boolean
  blurIntensity?: number
  opacity?: number
  borderRadius?: number
  customGradient?: string
  glowColor?: string
  reduceMotion?: boolean
  highContrast?: boolean
}

// ニューモーフィズムボタン
export interface NeumorphismButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  elevated?: boolean
  rippleEffect?: boolean
  customColor?: string
  highContrast?: boolean
}

// 動的グラデーション
export interface DynamicGradientProps {
  colors?: string[]
  direction?: number
  animated?: boolean
  interactive?: boolean
  speed?: number
  intensity?: number
  pattern?: 'linear' | 'radial' | 'conic' | 'mesh'
  blendMode?: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light'
  reduceMotion?: boolean
}

// シェーダーエフェクト
export interface ShaderEffectProps {
  effect?: 'waves' | 'plasma' | 'noise' | 'distortion' | 'ripple' | 'mandelbrot'
  interactive?: boolean
  intensity?: number
  speed?: number
  colors?: string[]
  resolution?: number
  reduceMotion?: boolean
}

// 高度なマイクロインタラクション
export interface AdvancedMicroInteractionsProps {
  magneticEnabled?: boolean
  trailEnabled?: boolean
  magneticStrength?: number
  trailIntensity?: number
  particleCount?: number
  reduceMotion?: boolean
}

// リワードアニメーション
export interface RewardAnimationsProps {
  autoCloseDelay?: number
  enableSound?: boolean
  particleCount?: number
  reduceMotion?: boolean
}

// 環境エフェクト
export interface EnvironmentalEffectsProps {
  weather?: 'clear' | 'rain' | 'snow' | 'fog' | 'storm'
  timeOfDay?: 'dawn' | 'morning' | 'noon' | 'afternoon' | 'evening' | 'night'
  season?: 'spring' | 'summer' | 'autumn' | 'winter'
  intensity?: number
  autoTransition?: boolean
  transitionDuration?: number
  enableAurora?: boolean
  enableSeasonalEffects?: boolean
  reduceMotion?: boolean
}

// 共通イベント型
export interface EffectEvent {
  type: string
  timestamp: number
  data?: any
}

// パフォーマンス設定
export interface PerformanceSettings {
  enableGPUAcceleration: boolean
  maxParticleCount: number
  animationQuality: 'low' | 'medium' | 'high'
  enableEffects: boolean
}

// アクセシビリティ設定
export interface AccessibilitySettings {
  reduceMotion: boolean
  highContrast: boolean
  screenReaderOptimized: boolean
  keyboardNavigation: boolean
}