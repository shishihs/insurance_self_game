<template>
  <div ref="containerRef" class="game-state-transitions">
    <!-- メイン状態コンテナ -->
    <div 
      ref="stateContainer"
      class="state-container"
      :class="currentStateClass"
    >
      <Transition
        :name="transitionName"
        :mode="transitionMode"
        :duration="transitionDuration"
        @before-enter="onBeforeEnter"
        @enter="onEnter"
        @after-enter="onAfterEnter"
        @before-leave="onBeforeLeave"
        @leave="onLeave"
        @after-leave="onAfterLeave"
      >
        <slot />
      </Transition>
    </div>

    <!-- オーバーレイエフェクト -->
    <div ref="overlayRef" class="overlay-effects">
      <!-- フェーズ変更時のオーバーレイ -->
      <div 
        ref="phaseOverlayRef"
        class="phase-overlay"
        :class="{ active: showPhaseOverlay }"
      >
        <div class="phase-content">
          <h2 class="phase-title">{{ phaseTitle }}</h2>
          <p class="phase-subtitle">{{ phaseSubtitle }}</p>
        </div>
      </div>

      <!-- 勝利/敗北オーバーレイ -->
      <div 
        ref="resultOverlayRef"
        class="result-overlay"
        :class="[{ active: showResultOverlay }, resultType]"
      >
        <div class="result-content">
          <div class="result-icon">{{ resultIcon }}</div>
          <h1 class="result-title">{{ resultTitle }}</h1>
          <p class="result-message">{{ resultMessage }}</p>
        </div>
      </div>

      <!-- レベル進行オーバーレイ -->
      <div 
        ref="levelOverlayRef"
        class="level-overlay"
        :class="{ active: showLevelOverlay }"
      >
        <div class="level-content">
          <div class="level-badge">
            <span class="level-number">{{ currentLevel }}</span>
          </div>
          <h3 class="level-title">Level {{ currentLevel }}</h3>
          <div class="level-progress">
            <div 
              class="level-progress-bar"
              :style="{ width: `${levelProgress}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- パーティクルシステム -->
    <div ref="particleSystemRef" class="particle-system"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

// 型定義
type GameState = 'menu' | 'playing' | 'paused' | 'victory' | 'defeat' | 'levelUp'
type TransitionType = 'fade' | 'slide' | 'zoom' | 'flip' | 'curtain' | 'wave' | 'spiral'
type TransitionDirection = 'left' | 'right' | 'up' | 'down' | 'center'

interface Props {
  currentState: GameState
  transitionType?: TransitionType
  transitionDirection?: TransitionDirection
  duration?: number
  enableParticles?: boolean
  enableSoundEffects?: boolean
  performanceMode?: boolean
}

interface GamePhaseInfo {
  title: string
  subtitle: string
  color: string
}

const props = withDefaults(defineProps<Props>(), {
  transitionType: 'fade',
  transitionDirection: 'center',
  duration: 600,
  enableParticles: true,
  enableSoundEffects: false,
  performanceMode: false
})

// テンプレート参照
const containerRef = ref<HTMLElement>()
const stateContainer = ref<HTMLElement>()
const overlayRef = ref<HTMLElement>()
const phaseOverlayRef = ref<HTMLElement>()
const resultOverlayRef = ref<HTMLElement>()
const levelOverlayRef = ref<HTMLElement>()
const particleSystemRef = ref<HTMLElement>()

// リアクティブ状態
const isTransitioning = ref(false)
const showPhaseOverlay = ref(false)
const showResultOverlay = ref(false)
const showLevelOverlay = ref(false)
const currentLevel = ref(1)
const levelProgress = ref(0)

// フェーズ情報
const phaseTitle = ref('')
const phaseSubtitle = ref('')

// 結果情報
const resultType = ref<'victory' | 'defeat'>('victory')
const resultIcon = ref('')
const resultTitle = ref('')
const resultMessage = ref('')

// パフォーマンス設定
const reducedMotion = ref(false)
const animationSpeed = ref(1)

// 計算プロパティ
const currentStateClass = computed(() => `state-${props.currentState}`)

const transitionName = computed(() => {
  if (reducedMotion.value) return 'simple-fade'
  return `${props.transitionType}-${props.transitionDirection}`
})

const transitionMode = computed(() => {
  return ['slide', 'curtain'].includes(props.transitionType) ? 'out-in' : 'default'
})

const transitionDuration = computed(() => {
  const baseDuration = props.performanceMode ? props.duration * 0.7 : props.duration
  return Math.round(baseDuration * animationSpeed.value)
})

// ゲームフェーズの定義
const gamePhases: Record<GameState, GamePhaseInfo> = {
  menu: {
    title: 'メインメニュー',
    subtitle: 'ゲームを開始してください',
    color: '#4DABF7'
  },
  playing: {
    title: 'ゲーム中',
    subtitle: '戦略を練って勝利を目指そう',
    color: '#51CF66'
  },
  paused: {
    title: '一時停止',
    subtitle: 'ゲームが一時停止されています',
    color: '#FFE066'
  },
  victory: {
    title: '勝利！',
    subtitle: '素晴らしい戦略でした！',
    color: '#51CF66'
  },
  defeat: {
    title: '敗北',
    subtitle: '次回はきっと勝てます',
    color: '#FF6B6B'
  },
  levelUp: {
    title: 'レベルアップ！',
    subtitle: '新しいチャレンジが待っています',
    color: '#FFD43B'
  }
}

// イベントハンドラー
const onBeforeEnter = (el: Element) => {
  isTransitioning.value = true
  const element = el as HTMLElement
  
  // GPU最適化
  if (!props.performanceMode) {
    element.style.willChange = 'transform, opacity'
  }
  
  // パーティクルエフェクトの開始
  if (props.enableParticles && !reducedMotion.value) {
    startTransitionParticles()
  }
}

const onEnter = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  
  // カスタムアニメーション実行
  executeCustomTransition(element, 'enter', done)
}

const onAfterEnter = (el: Element) => {
  const element = el as HTMLElement
  element.style.willChange = ''
  isTransitioning.value = false
  
  // 状態固有のエフェクト
  executeStateSpecificEffects()
}

const onBeforeLeave = (el: Element) => {
  const element = el as HTMLElement
  if (!props.performanceMode) {
    element.style.willChange = 'transform, opacity'
  }
}

const onLeave = (el: Element, done: () => void) => {
  const element = el as HTMLElement
  executeCustomTransition(element, 'leave', done)
}

const onAfterLeave = (el: Element) => {
  const element = el as HTMLElement
  element.style.willChange = ''
}

// カスタムトランジション実行
const executeCustomTransition = (
  element: HTMLElement, 
  phase: 'enter' | 'leave', 
  done: () => void
) => {
  const duration = transitionDuration.value
  const type = props.transitionType
  const direction = props.transitionDirection

  // 既存のトランジションをクリーンアップ
  element.getAnimations().forEach(animation => { animation.cancel(); })

  if (type === 'wave') {
    executeWaveTransition(element, phase, duration, done)
  } else if (type === 'spiral') {
    executeSpiralTransition(element, phase, duration, done)
  } else if (type === 'curtain') {
    executeCurtainTransition(element, phase, direction, duration, done)
  } else {
    // 標準のトランジション
    setTimeout(done, duration)
  }
}

// ウェーブトランジション
const executeWaveTransition = (
  element: HTMLElement,
  phase: 'enter' | 'leave',
  duration: number,
  done: () => void
) => {
  const children = Array.from(element.children) as HTMLElement[]
  const staggerDelay = duration / children.length / 4

  children.forEach((child, index) => {
    const delay = index * staggerDelay
    const childElement = child
    
    childElement.animate([
      {
        transform: phase === 'enter' ? 'translateY(50px) scale(0.8)' : 'translateY(0px) scale(1)',
        opacity: phase === 'enter' ? '0' : '1'
      },
      {
        transform: phase === 'enter' ? 'translateY(0px) scale(1)' : 'translateY(-50px) scale(0.8)',
        opacity: phase === 'enter' ? '1' : '0'
      }
    ], {
      duration: duration - delay,
      delay,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'forwards'
    })
  })

  setTimeout(done, duration)
}

// スパイラルトランジション
const executeSpiralTransition = (
  element: HTMLElement,
  phase: 'enter' | 'leave',
  duration: number,
  done: () => void
) => {
  const centerX = element.offsetWidth / 2
  const centerY = element.offsetHeight / 2
  
  element.animate([
    {
      transform: phase === 'enter' 
        ? `translate(${centerX}px, ${centerY}px) scale(0) rotate(180deg)`
        : 'translate(0px, 0px) scale(1) rotate(0deg)',
      opacity: phase === 'enter' ? '0' : '1'
    },
    {
      transform: phase === 'enter'
        ? 'translate(0px, 0px) scale(1) rotate(0deg)'
        : `translate(${centerX}px, ${centerY}px) scale(0) rotate(-180deg)`,
      opacity: phase === 'enter' ? '1' : '0'
    }
  ], {
    duration,
    easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    fill: 'forwards'
  })

  setTimeout(done, duration)
}

// カーテントランジション
const executeCurtainTransition = (
  element: HTMLElement,
  phase: 'enter' | 'leave',
  direction: TransitionDirection,
  duration: number,
  done: () => void
) => {
  const isHorizontal = ['left', 'right'].includes(direction)
  const isReverse = ['right', 'down'].includes(direction)
  
  const transform = isHorizontal 
    ? `scaleX(${phase === 'enter' ? (isReverse ? '-1' : '1') : '0'})`
    : `scaleY(${phase === 'enter' ? '1' : '0'})`
  
  const transformOrigin = isHorizontal
    ? (isReverse ? 'right center' : 'left center')
    : 'center top'

  element.style.transformOrigin = transformOrigin
  
  element.animate([
    {
      transform: phase === 'enter' 
        ? isHorizontal ? 'scaleX(0)' : 'scaleY(0)'
        : transform,
      opacity: phase === 'enter' ? '0' : '1'
    },
    {
      transform: phase === 'enter' 
        ? transform
        : isHorizontal ? 'scaleX(0)' : 'scaleY(0)',
      opacity: phase === 'enter' ? '1' : '0'
    }
  ], {
    duration,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    fill: 'forwards'
  })

  setTimeout(done, duration)
}

// 状態固有のエフェクト
const executeStateSpecificEffects = () => {
  const state = props.currentState
  
  switch (state) {
    case 'victory':
      showVictoryEffects()
      break
    case 'defeat':
      showDefeatEffects()
      break
    case 'levelUp':
      showLevelUpEffects()
      break
    case 'playing':
      updatePhaseDisplay('ゲーム開始', '戦略を練って勝利を目指そう')
      break
  }
}

// 勝利エフェクト
const showVictoryEffects = () => {
  resultType.value = 'victory'
  resultIcon.value = '🎉'
  resultTitle.value = 'Victory!'
  resultMessage.value = '素晴らしい戦略でした！'
  showResultOverlay.value = true

  if (props.enableParticles && !reducedMotion.value) {
    createVictoryParticles()
  }

  // 自動非表示
  setTimeout(() => {
    showResultOverlay.value = false
  }, 3000)
}

// 敗北エフェクト
const showDefeatEffects = () => {
  resultType.value = 'defeat'
  resultIcon.value = '💔'
  resultTitle.value = 'Game Over'
  resultMessage.value = '次回はきっと勝てます！'
  showResultOverlay.value = true

  if (props.enableParticles && !reducedMotion.value) {
    createDefeatParticles()
  }

  setTimeout(() => {
    showResultOverlay.value = false
  }, 3000)
}

// レベルアップエフェクト
const showLevelUpEffects = () => {
  showLevelOverlay.value = true
  levelProgress.value = 0

  // プログレスバーアニメーション
  setTimeout(() => {
    levelProgress.value = 100
  }, 300)

  if (props.enableParticles && !reducedMotion.value) {
    createLevelUpParticles()
  }

  setTimeout(() => {
    showLevelOverlay.value = false
  }, 2500)
}

// フェーズ表示更新
const updatePhaseDisplay = (title: string, subtitle: string) => {
  phaseTitle.value = title
  phaseSubtitle.value = subtitle
  showPhaseOverlay.value = true

  setTimeout(() => {
    showPhaseOverlay.value = false
  }, 2000)
}

// パーティクルエフェクト
const startTransitionParticles = () => {
  if (!particleSystemRef.value) return
  
  createParticleWave({
    count: 20,
    color: gamePhases[props.currentState].color,
    duration: transitionDuration.value,
    type: 'transition'
  })
}

const createVictoryParticles = () => {
  for (let i = 0; i < 3; i++) {
    setTimeout(() => {
      createParticleWave({
        count: 30,
        color: '#FFD43B',
        duration: 1500,
        type: 'celebration'
      })
    }, i * 300)
  }
}

const createDefeatParticles = () => {
  createParticleWave({
    count: 15,
    color: '#868E96',
    duration: 1000,
    type: 'somber'
  })
}

const createLevelUpParticles = () => {
  createParticleWave({
    count: 25,
    color: '#51CF66',
    duration: 2000,
    type: 'achievement'
  })
}

const createParticleWave = (config: {
  count: number
  color: string
  duration: number
  type: string
}) => {
  if (!particleSystemRef.value || !containerRef.value || reducedMotion.value) return

  const containerRect = containerRef.value.getBoundingClientRect()
  const centerX = containerRect.width / 2
  const centerY = containerRect.height / 2

  for (let i = 0; i < config.count; i++) {
    const particle = document.createElement('div')
    particle.className = `particle particle-${config.type}`
    
    const size = 4 + Math.random() * 8
    const angle = (Math.PI * 2 * i) / config.count
    const distance = 50 + Math.random() * 100
    
    particle.style.cssText = `
      position: absolute;
      left: ${centerX}px;
      top: ${centerY}px;
      width: ${size}px;
      height: ${size}px;
      background-color: ${config.color};
      border-radius: 50%;
      pointer-events: none;
    `

    // タイプ別のカスタマイズ
    if (config.type === 'celebration') {
      particle.innerHTML = ['🎊', '✨', '💫', '⭐'][Math.floor(Math.random() * 4)]
      particle.style.backgroundColor = 'transparent'
      particle.style.fontSize = `${size * 2}px`
    } else if (config.type === 'achievement') {
      particle.style.boxShadow = `0 0 ${size * 2}px ${config.color}`
    }

    particleSystemRef.value.appendChild(particle)

    // アニメーション
    particle.animate([
      {
        transform: 'translate(0, 0) scale(1)',
        opacity: '1'
      },
      {
        transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0.3)`,
        opacity: '0'
      }
    ], {
      duration: config.duration,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }).addEventListener('finish', () => {
      particle.remove()
    })
  }
}

// 公開メソッド
const triggerPhaseTransition = (title: string, subtitle: string) => {
  updatePhaseDisplay(title, subtitle)
}

const setLevel = (level: number, progress: number = 0) => {
  currentLevel.value = level
  levelProgress.value = progress
}

const setAnimationSpeed = (speed: number) => {
  animationSpeed.value = Math.max(0.1, Math.min(2, speed))
}

// ライフサイクル
onMounted(() => {
  // モーション削減設定の監視
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = mediaQuery.matches
  mediaQuery.addEventListener('change', (e) => {
    reducedMotion.value = e.matches
  })
})

onUnmounted(() => {
  // パーティクルのクリーンアップ
  if (particleSystemRef.value) {
    particleSystemRef.value.innerHTML = ''
  }
})

// 状態変更の監視
watch(() => props.currentState, (newState, oldState) => {
  if (newState !== oldState) {
    console.log(`Game state transition: ${oldState} → ${newState}`)
  }
})

// 公開API
defineExpose({
  triggerPhaseTransition,
  setLevel,
  setAnimationSpeed,
  isTransitioning: readonly(isTransitioning)
})
</script>

<style scoped>
.game-state-transitions {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.state-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.overlay-effects {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

/* フェーズオーバーレイ */
.phase-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(77, 171, 247, 0.9), rgba(81, 207, 102, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.phase-overlay.active {
  opacity: 1;
  transform: scale(1);
}

.phase-content {
  text-align: center;
  color: white;
  text-shadow: 0 2px 4px rgba(0,0,0,0.3);
}

.phase-title {
  font-size: 2.5rem;
  font-weight: bold;
  margin: 0 0 0.5rem 0;
  animation: phase-title-slide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.phase-subtitle {
  font-size: 1.2rem;
  margin: 0;
  opacity: 0.9;
  animation: phase-subtitle-fade 0.8s ease-out 0.2s both;
}

/* 結果オーバーレイ */
.result-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.result-overlay.active {
  opacity: 1;
  transform: scale(1);
}

.result-overlay.victory {
  background: radial-gradient(circle, rgba(81, 207, 102, 0.95), rgba(255, 212, 59, 0.95));
}

.result-overlay.defeat {
  background: radial-gradient(circle, rgba(255, 107, 107, 0.9), rgba(134, 142, 150, 0.9));
}

.result-content {
  text-align: center;
  color: white;
  text-shadow: 0 3px 6px rgba(0,0,0,0.4);
}

.result-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  animation: result-icon-bounce 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.3s both;
}

.result-title {
  font-size: 3rem;
  font-weight: bold;
  margin: 0 0 1rem 0;
  animation: result-title-slide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
}

.result-message {
  font-size: 1.4rem;
  margin: 0;
  opacity: 0.95;
  animation: result-message-fade 0.8s ease-out 0.7s both;
}

/* レベルオーバーレイ */
.level-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  background: linear-gradient(135deg, rgba(255, 212, 59, 0.95), rgba(81, 207, 102, 0.95));
  padding: 2rem;
  border-radius: 20px;
  text-align: center;
  color: white;
  opacity: 0;
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
}

.level-overlay.active {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.level-badge {
  width: 80px;
  height: 80px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem auto;
  animation: level-badge-pulse 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) 0.2s both;
}

.level-number {
  font-size: 2rem;
  font-weight: bold;
  color: #FFD43B;
}

.level-title {
  font-size: 1.8rem;
  font-weight: bold;
  margin: 0 0 1rem 0;
  animation: level-title-slide 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
}

.level-progress {
  width: 200px;
  height: 8px;
  background: rgba(255,255,255,0.3);
  border-radius: 4px;
  margin: 0 auto;
  overflow: hidden;
}

.level-progress-bar {
  height: 100%;
  background: white;
  border-radius: 4px;
  transition: width 1s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-origin: left center;
}

/* パーティクルシステム */
.particle-system {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
}

.particle {
  will-change: transform, opacity;
}

.particle-celebration {
  text-shadow: 0 0 10px currentColor;
}

.particle-achievement {
  animation: particle-achievement-glow 2s ease-out infinite;
}

/* トランジションクラス */
.simple-fade-enter-active,
.simple-fade-leave-active {
  transition: opacity 0.2s ease;
}

.simple-fade-enter-from,
.simple-fade-leave-to {
  opacity: 0;
}

/* フェードトランジション */
.fade-center-enter-active,
.fade-center-leave-active {
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.fade-center-enter-from,
.fade-center-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* スライドトランジション */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-left-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-right-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

/* ズームトランジション */
.zoom-center-enter-active,
.zoom-center-leave-active {
  transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.zoom-center-enter-from {
  transform: scale(0.3);
  opacity: 0;
}

.zoom-center-leave-to {
  transform: scale(1.3);
  opacity: 0;
}

/* フリップトランジション */
.flip-center-enter-active,
.flip-center-leave-active {
  transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  transform-style: preserve-3d;
}

.flip-center-enter-from {
  transform: rotateY(-90deg);
  opacity: 0;
}

.flip-center-leave-to {
  transform: rotateY(90deg);
  opacity: 0;
}

/* アニメーション定義 */
@keyframes phase-title-slide {
  0% {
    transform: translateY(-30px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes phase-subtitle-fade {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 0.9;
  }
}

@keyframes result-icon-bounce {
  0% {
    transform: scale(0) rotate(-180deg);
    opacity: 0;
  }
  60% {
    transform: scale(1.2) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

@keyframes result-title-slide {
  0% {
    transform: translateY(-30px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes result-message-fade {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 0.95;
  }
}

@keyframes level-badge-pulse {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes level-title-slide {
  0% {
    transform: translateY(-20px);
    opacity: 0;
  }
  100% {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes particle-achievement-glow {
  0%, 100% {
    box-shadow: 0 0 10px currentColor;
  }
  50% {
    box-shadow: 0 0 20px currentColor;
  }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .phase-title {
    font-size: 2rem;
  }
  
  .phase-subtitle {
    font-size: 1rem;
  }
  
  .result-icon {
    font-size: 3rem;
  }
  
  .result-title {
    font-size: 2.2rem;
  }
  
  .result-message {
    font-size: 1.1rem;
  }
  
  .level-badge {
    width: 60px;
    height: 60px;
  }
  
  .level-number {
    font-size: 1.5rem;
  }
  
  .level-progress {
    width: 150px;
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .particle-system {
    display: none;
  }
}

/* パフォーマンスモード */
.performance-mode .phase-overlay,
.performance-mode .result-overlay,
.performance-mode .level-overlay {
  transition-duration: 0.3s;
}

.performance-mode .particle-system {
  opacity: 0.7;
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .level-badge {
    background: rgba(255,255,255,0.9);
  }
}
</style>