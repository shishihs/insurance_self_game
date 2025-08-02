<template>
  <div class="enhanced-animation-system" ref="systemContainer">
    <!-- カードアニメーション -->
    <AdvancedCardAnimations
      ref="cardAnimations"
      :performance-mode="performanceMode"
      :enable-particles="enableParticles"
      :enable-physics="enablePhysics"
      :animation-intensity="animationIntensity"
      @animation-start="onAnimationStart"
      @animation-complete="onAnimationComplete"
    >
      <template #default>
        <slot name="cards" />
      </template>
    </AdvancedCardAnimations>

    <!-- ゲーム状態トランジション -->
    <GameStateTransitions
      ref="stateTransitions"
      :current-state="gameState"
      :transition-type="transitionType"
      :transition-direction="transitionDirection"
      :duration="transitionDuration"
      :enable-particles="enableParticles"
      :performance-mode="performanceMode"
      @transition-start="onTransitionStart"
      @transition-complete="onTransitionComplete"
    >
      <template #default>
        <slot name="game-content" />
      </template>
    </GameStateTransitions>

    <!-- インタラクティブ要素 -->
    <InteractiveElements
      ref="interactiveElements"
      :enable-drag="enableDrag"
      :enable-drop="enableDrop"
      :enable-hover="enableHover"
      :enable-touch="enableTouch"
      :performance-mode="performanceMode"
      :accessibility-mode="accessibilityMode"
      @drag-start="onDragStart"
      @drag-end="onDragEnd"
      @drop="onDrop"
      @drop-failed="onDropFailed"
      @hover="onHover"
    >
      <template #draggable>
        <slot name="draggable" />
      </template>
      <template #drop-zones>
        <slot name="drop-zones" />
      </template>
    </InteractiveElements>

    <!-- パフォーマンス監視UI（開発時のみ） -->
    <div 
      v-if="showPerformanceMonitor && isDevelopment"
      class="performance-monitor"
      :class="{ collapsed: monitorCollapsed }"
    >
      <div class="monitor-header" @click="toggleMonitor">
        <span class="monitor-title">Performance Monitor</span>
        <span class="monitor-toggle">{{ monitorCollapsed ? '▼' : '▲' }}</span>
      </div>
      <div class="monitor-content" v-show="!monitorCollapsed">
        <div class="metric">
          <span class="metric-label">FPS:</span>
          <span class="metric-value" :class="getFpsClass(performanceMetrics.fps)">
            {{ performanceMetrics.fps.toFixed(1) }}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Frame Time:</span>
          <span class="metric-value">{{ performanceMetrics.frameTime.toFixed(2) }}ms</span>
        </div>
        <div class="metric">
          <span class="metric-label">Active Animations:</span>
          <span class="metric-value">{{ performanceMetrics.activeAnimations }}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Memory:</span>
          <span class="metric-value">{{ performanceMetrics.memoryUsage.toFixed(1) }}MB</span>
        </div>
        <div class="metric">
          <span class="metric-label">Quality:</span>
          <span class="metric-value quality-indicator" :class="qualityLevel">
            {{ qualityLevel.toUpperCase() }}
          </span>
        </div>
        <div class="metric">
          <span class="metric-label">Battery:</span>
          <span class="metric-value">
            {{ performanceMetrics.batteryLevel ? `${performanceMetrics.batteryLevel.toFixed(0)}%` : 'N/A' }}
          </span>
        </div>
      </div>
    </div>

    <!-- パフォーマンス警告 -->
    <Transition name="warning-fade">
      <div 
        v-if="showPerformanceWarning && performanceWarning"
        class="performance-warning"
        @click="dismissWarning"
      >
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">{{ performanceWarning }}</div>
        <div class="warning-close">×</div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AdvancedCardAnimations from './AdvancedCardAnimations.vue'
import GameStateTransitions from './GameStateTransitions.vue'
import InteractiveElements from './InteractiveElements.vue'
import type { 
  AnimationPerformanceOptimizer} from '../../game/effects/AnimationPerformanceOptimizer';
import { 
  destroyAnimationPerformanceOptimizer,
  getAnimationPerformanceOptimizer,
  type PerformanceMetrics 
} from '../../game/effects/AnimationPerformanceOptimizer'

// 型定義
type GameState = 'menu' | 'playing' | 'paused' | 'victory' | 'defeat' | 'levelUp'
type TransitionType = 'fade' | 'slide' | 'zoom' | 'flip' | 'curtain' | 'wave' | 'spiral'
type TransitionDirection = 'left' | 'right' | 'up' | 'down' | 'center'
type AnimationIntensity = 'subtle' | 'normal' | 'dramatic'
type QualityLevel = 'low' | 'medium' | 'high'

interface Props {
  // ゲーム状態
  gameState?: GameState
  
  // アニメーション設定
  animationIntensity?: AnimationIntensity
  transitionType?: TransitionType
  transitionDirection?: TransitionDirection
  transitionDuration?: number
  
  // 機能有効/無効
  enableParticles?: boolean
  enablePhysics?: boolean
  enableDrag?: boolean
  enableDrop?: boolean
  enableHover?: boolean
  enableTouch?: boolean
  
  // パフォーマンス設定
  performanceMode?: boolean
  targetFPS?: number
  maxConcurrentAnimations?: number
  enableGPUAcceleration?: boolean
  enableAdaptiveQuality?: boolean
  
  // アクセシビリティ
  accessibilityMode?: boolean
  reducedMotion?: boolean
  
  // 監視・デバッグ
  showPerformanceMonitor?: boolean
  showPerformanceWarning?: boolean
  developmentMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  gameState: 'menu',
  animationIntensity: 'normal',
  transitionType: 'fade',
  transitionDirection: 'center',
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
  reducedMotion: false,
  showPerformanceMonitor: false,
  showPerformanceWarning: true,
  developmentMode: false
})

const emit = defineEmits<{
  // アニメーションイベント
  animationStart: [type: string, data: any]
  animationComplete: [type: string, data: any]
  
  // トランジションイベント
  transitionStart: [from: GameState, to: GameState]
  transitionComplete: [state: GameState]
  
  // インタラクションイベント
  dragStart: [data: any, element: HTMLElement]
  dragEnd: [data: any, element: HTMLElement]
  drop: [data: any, dropZone: HTMLElement]
  dropFailed: [data: any, element: HTMLElement]
  hover: [element: HTMLElement, isHovering: boolean]
  
  // パフォーマンスイベント
  performanceWarning: [warning: string, metrics: PerformanceMetrics]
  qualityChanged: [level: QualityLevel]
}>()

// テンプレート参照
const systemContainer = ref<HTMLElement>()
const cardAnimations = ref<InstanceType<typeof AdvancedCardAnimations>>()
const stateTransitions = ref<InstanceType<typeof GameStateTransitions>>()
const interactiveElements = ref<InstanceType<typeof InteractiveElements>>()

// パフォーマンス最適化
const performanceOptimizer = ref<AnimationPerformanceOptimizer | null>(null)
const performanceMetrics = ref<PerformanceMetrics>({
  fps: 60,
  frameTime: 16.67,
  memoryUsage: 0,
  activeAnimations: 0,
  droppedFrames: 0,
  cpuUsage: 0
})

// 監視UI
const monitorCollapsed = ref(false)
const performanceWarning = ref<string | null>(null)
const qualityLevel = ref<QualityLevel>('high')

// 計算プロパティ
const isDevelopment = computed(() => {
  return process.env.NODE_ENV === 'development' || props.developmentMode
})

// パフォーマンス設定
onMounted(async () => {
  // パフォーマンス最適化システムを初期化
  performanceOptimizer.value = getAnimationPerformanceOptimizer({
    targetFPS: props.targetFPS,
    maxConcurrentAnimations: props.maxConcurrentAnimations,
    enableGPUAcceleration: props.enableGPUAcceleration,
    enableReducedMotion: props.reducedMotion,
    enableAdaptiveQuality: props.enableAdaptiveQuality
  })

  // パフォーマンス監視を開始
  startPerformanceMonitoring()
  
  await nextTick()
  
  // システムの初期化完了を通知
  console.log('Enhanced Animation System initialized')
})

onUnmounted(() => {
  // パフォーマンス最適化システムをクリーンアップ
  if (performanceOptimizer.value) {
    destroyAnimationPerformanceOptimizer()
  }
})

// パフォーマンス監視
const startPerformanceMonitoring = () => {
  const updateMetrics = () => {
    if (performanceOptimizer.value) {
      performanceMetrics.value = performanceOptimizer.value.getMetrics()
      
      // パフォーマンス警告の生成
      checkPerformanceWarnings()
      
      // 品質レベルの更新
      updateQualityLevel()
    }
    
    // 次のフレームで再実行
    requestAnimationFrame(updateMetrics)
  }
  
  updateMetrics()
}

const checkPerformanceWarnings = () => {
  if (!props.showPerformanceWarning) return
  
  const metrics = performanceMetrics.value
  
  if (metrics.fps < 30) {
    performanceWarning.value = 'フレームレートが低下しています。パフォーマンスモードの有効化をお勧めします。'
    emit('performanceWarning', performanceWarning.value, metrics)
  } else if (metrics.memoryUsage > 100) {
    performanceWarning.value = 'メモリ使用量が多くなっています。一部のアニメーションが制限される可能性があります。'
    emit('performanceWarning', performanceWarning.value, metrics)
  } else {
    performanceWarning.value = null
  }
}

const updateQualityLevel = () => {
  const metrics = performanceMetrics.value
  let newQualityLevel: QualityLevel = 'high'
  
  if (metrics.fps < 45 || metrics.memoryUsage > 150) {
    newQualityLevel = 'low'
  } else if (metrics.fps < 55 || metrics.memoryUsage > 100) {
    newQualityLevel = 'medium'
  }
  
  if (newQualityLevel !== qualityLevel.value) {
    qualityLevel.value = newQualityLevel
    emit('qualityChanged', newQualityLevel)
  }
}

// イベントハンドラー
const onAnimationStart = (type: string, data: any) => {
  if (performanceOptimizer.value) {
    performanceOptimizer.value.registerAnimation(
      `${type}-${Date.now()}`,
      data.element || systemContainer.value!,
      type
    )
  }
  emit('animationStart', type, data)
}

const onAnimationComplete = (type: string, data: any) => {
  emit('animationComplete', type, data)
}

const onTransitionStart = (from: GameState, to: GameState) => {
  emit('transitionStart', from, to)
}

const onTransitionComplete = (state: GameState) => {
  emit('transitionComplete', state)
}

const onDragStart = (data: any, element: HTMLElement) => {
  emit('dragStart', data, element)
}

const onDragEnd = (data: any, element: HTMLElement) => {
  emit('dragEnd', data, element)
}

const onDrop = (data: any, dropZone: HTMLElement) => {
  emit('drop', data, dropZone)
}

const onDropFailed = (data: any, element: HTMLElement) => {
  emit('dropFailed', data, element)
}

const onHover = (element: HTMLElement, isHovering: boolean) => {
  // ホバーアニメーションの最適化
  if (cardAnimations.value) {
    cardAnimations.value.hoverCard(element, isHovering)
  }
  emit('hover', element, isHovering)
}

// UI制御
const toggleMonitor = () => {
  monitorCollapsed.value = !monitorCollapsed.value
}

const dismissWarning = () => {
  performanceWarning.value = null
}

const getFpsClass = (fps: number): string => {
  if (fps >= 55) return 'fps-good'
  if (fps >= 30) return 'fps-ok'
  return 'fps-poor'
}

// 公開API
const playCardAnimation = async (
  element: HTMLElement,
  animationType: 'draw' | 'play' | 'discard' | 'hover',
  options: any = {}
) => {
  if (!cardAnimations.value) return
  
  // パフォーマンス最適化を適用
  const optimizedOptions = performanceOptimizer.value
    ? performanceOptimizer.value.optimizeAnimation(element, animationType, options)
    : options
  
  switch (animationType) {
    case 'draw':
      return await cardAnimations.value.drawCard(element, optimizedOptions)
    case 'play':
      return await cardAnimations.value.playCard(element, optimizedOptions)
    case 'discard':
      return await cardAnimations.value.discardCard(element, optimizedOptions)
    case 'hover':
      cardAnimations.value.hoverCard(element, options.isHovering ?? true)
      break
  }
}

const triggerStateTransition = (
  newState: GameState,
  options: {
    type?: TransitionType
    direction?: TransitionDirection
    duration?: number
  } = {}
) => {
  if (!stateTransitions.value) return
  
  const transitionOptions = {
    type: options.type || props.transitionType,
    direction: options.direction || props.transitionDirection,
    duration: options.duration || props.transitionDuration
  }
  
  // ゲーム状態の更新は親コンポーネントで行う
  emit('transitionStart', props.gameState, newState)
}

const enablePerformanceMode = (enabled: boolean) => {
  if (performanceOptimizer.value) {
    performanceOptimizer.value.updateSettings({
      enableGPUAcceleration: !enabled,
      maxConcurrentAnimations: enabled ? 5 : props.maxConcurrentAnimations
    })
  }
}

const setAnimationIntensity = (intensity: AnimationIntensity) => {
  // 子コンポーネントの設定更新は reactivity で自動的に行われる
}

// プロパティの変更監視
watch(() => props.performanceMode, (enabled) => {
  enablePerformanceMode(enabled)
})

watch(() => props.reducedMotion, (enabled) => {
  if (performanceOptimizer.value) {
    performanceOptimizer.value.updateSettings({
      enableReducedMotion: enabled
    })
  }
})

// 公開API
defineExpose({
  playCardAnimation,
  triggerStateTransition,
  enablePerformanceMode,
  setAnimationIntensity,
  performanceMetrics: readonly(performanceMetrics),
  qualityLevel: readonly(qualityLevel)
})
</script>

<style scoped>
.enhanced-animation-system {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* パフォーマンス監視UI */
.performance-monitor {
  position: fixed;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  min-width: 200px;
  z-index: 10000;
  font-family: monospace;
  font-size: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
}

.monitor-header {
  padding: 8px 12px;
  background: rgba(77, 171, 247, 0.2);
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  user-select: none;
}

.monitor-title {
  font-weight: bold;
}

.monitor-toggle {
  font-size: 10px;
  opacity: 0.7;
}

.monitor-content {
  padding: 8px 12px;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.metric-label {
  opacity: 0.8;
}

.metric-value {
  font-weight: bold;
}

.fps-good {
  color: #51CF66;
}

.fps-ok {
  color: #FFE066;
}

.fps-poor {
  color: #FF6B6B;
}

.quality-indicator.low {
  color: #FF6B6B;
}

.quality-indicator.medium {
  color: #FFE066;
}

.quality-indicator.high {
  color: #51CF66;
}

.performance-monitor.collapsed .monitor-content {
  display: none;
}

/* パフォーマンス警告 */
.performance-warning {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #FF6B6B, #FF8787);
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
  z-index: 10001;
  cursor: pointer;
  user-select: none;
  max-width: 400px;
}

.warning-icon {
  font-size: 20px;
}

.warning-text {
  flex: 1;
  font-size: 14px;
}

.warning-close {
  font-size: 18px;
  font-weight: bold;
  opacity: 0.7;
}

.warning-close:hover {
  opacity: 1;
}

/* トランジション */
.warning-fade-enter-active,
.warning-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.warning-fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.9);
}

.warning-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.9);
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .performance-monitor {
    top: 10px;
    right: 10px;
    min-width: 180px;
    font-size: 11px;
  }
  
  .performance-warning {
    top: 10px;
    left: 10px;
    right: 10px;
    transform: none;
    max-width: none;
    font-size: 13px;
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .warning-fade-enter-active,
  .warning-fade-leave-active {
    transition: opacity 0.1s ease !important;
  }
  
  .warning-fade-enter-from,
  .warning-fade-leave-to {
    transform: translateX(-50%) !important;
  }
}

/* アクセシビリティ */
.performance-monitor:focus-within {
  outline: 2px solid #4DABF7;
  outline-offset: 2px;
}

.performance-warning:focus {
  outline: 2px solid white;
  outline-offset: 2px;
}

/* 高コントラスト対応 */
@media (prefers-contrast: high) {
  .performance-monitor {
    background: black;
    border: 2px solid white;
  }
  
  .performance-warning {
    background: #CC0000;
    border: 2px solid white;
  }
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .performance-monitor {
    background: rgba(0, 0, 0, 0.9);
  }
  
  .monitor-header {
    background: rgba(77, 171, 247, 0.3);
  }
}
</style>