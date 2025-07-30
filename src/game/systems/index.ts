// ゲームシステムのエクスポート

// アニメーション関連
export { AnimationManager } from './AnimationManager'
export { UnifiedAnimationManager } from './UnifiedAnimationManager'

// サウンド関連
export { SoundManager } from './SoundManager'
export { IntegratedSoundManager } from './IntegratedSoundManager'
export { BackgroundMusicManager } from './BackgroundMusicManager'
export { Spatial3DSoundSystem } from './Spatial3DSoundSystem'
export { WebAudioSoundGenerator } from './WebAudioSoundGenerator'

// ドロップゾーン関連
export { DropZoneManager } from './DropZoneManager'
export { DropZoneIntegration } from './DropZoneIntegration'
export * from './DropZoneValidators'

// チュートリアル関連
export { TutorialManager } from './TutorialManager'
export { TutorialIntegration } from './TutorialIntegration'
export * from './TutorialSteps'

// パフォーマンス関連
export { PerformanceOptimizer } from './PerformanceOptimizer'
export { MobilePerformanceManager } from './MobilePerformanceManager'
export { ObjectPool } from './ObjectPool'

// その他のシステム
export { EventCleanupManager } from './EventCleanupManager'
export { KeyboardController } from './KeyboardController'

// 型定義のエクスポート
export type { GameAnimationConfig, UIAnimationEvent } from './AnimationManager'
export type { SoundConfig, SoundEvent } from './SoundManager'
export type { DropZone, DragState } from './DropZoneManager'
export type { TutorialStep, TutorialState } from './TutorialManager'