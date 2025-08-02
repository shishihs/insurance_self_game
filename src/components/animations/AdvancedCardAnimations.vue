<template>
  <div 
    ref="cardContainer" 
    class="advanced-card-animations"
    :class="{ 
      'performance-mode': performanceMode,
      'reduced-motion': reducedMotion 
    }"
  >
    <!-- カードアニメーション用のコンテナ -->
    <div ref="animationLayer" class="animation-layer">
      <slot />
    </div>
    
    <!-- パーティクルエフェクト用のコンテナ -->
    <div ref="particleLayer" class="particle-layer" />
    
    <!-- グロウエフェクト用のコンテナ -->
    <div ref="effectLayer" class="effect-layer" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

interface Props {
  performanceMode?: boolean
  enableParticles?: boolean
  enablePhysics?: boolean
  animationIntensity?: 'subtle' | 'normal' | 'dramatic'
  maxParticles?: number
}

const props = withDefaults(defineProps<Props>(), {
  performanceMode: false,
  enableParticles: true,
  enablePhysics: false,
  animationIntensity: 'normal',
  maxParticles: 100
})

// テンプレート参照
const cardContainer = ref<HTMLElement>()
const animationLayer = ref<HTMLElement>()
const particleLayer = ref<HTMLElement>()
const effectLayer = ref<HTMLElement>()

// リアクティブ設定
const reducedMotion = ref(false)
const activeAnimations = ref(0)
const particleCount = ref(0)

// アニメーション管理
const animationQueue: Array<() => Promise<void>> = []
const isProcessingQueue = false

// パフォーマンス設定
const performanceConfig = computed(() => ({
  maxConcurrentAnimations: props.performanceMode ? 4 : 8,
  maxParticles: props.performanceMode ? 50 : props.maxParticles,
  useGPUAcceleration: !props.performanceMode,
  reducedEffects: props.performanceMode || reducedMotion.value
}))

// アニメーション強度設定
const intensityConfig = computed(() => {
  const base = {
    subtle: { duration: 0.7, scale: 0.8, particles: 0.5 },
    normal: { duration: 1.0, scale: 1.0, particles: 1.0 },
    dramatic: { duration: 1.3, scale: 1.2, particles: 1.5 }
  }
  return base[props.animationIntensity]
})

/**
 * カードドローアニメーション
 */
const drawCard = async (
  cardElement: HTMLElement,
  options: {
    from?: { x: number; y: number }
    to?: { x: number; y: number }
    duration?: number
    enableParticles?: boolean
  } = {}
): Promise<void> => {
  if (!canStartAnimation()) return

  return new Promise((resolve) => {
    activeAnimations.value++
    
    const config = {
      duration: (options.duration || 600) * intensityConfig.value.duration,
      from: options.from || { x: 0, y: 0 },
      to: options.to || { x: 0, y: 0 },
      enableParticles: options.enableParticles ?? props.enableParticles
    }

    // GPU最適化
    if (performanceConfig.value.useGPUAcceleration) {
      cardElement.style.willChange = 'transform, opacity'
    }

    // 初期状態設定
    cardElement.style.transform = `
      translate(${config.from.x}px, ${config.from.y}px) 
      scale(0.6) 
      rotate(-5deg)
    `
    cardElement.style.opacity = '0.8'

    // パーティクルエフェクト
    if (config.enableParticles && !performanceConfig.value.reducedEffects) {
      createDrawParticles(config.from.x, config.from.y)
    }

    // アニメーション実行
    cardElement.animate([
      {
        transform: `translate(${config.from.x}px, ${config.from.y}px) scale(0.6) rotate(-5deg)`,
        opacity: '0.8'
      },
      {
        transform: `translate(${config.to.x}px, ${config.to.y - 50}px) scale(1) rotate(0deg)`,
        opacity: '1',
        offset: 0.6
      },
      {
        transform: `translate(${config.to.x}px, ${config.to.y}px) scale(1.05) rotate(0deg)`,
        opacity: '1',
        offset: 0.9
      },
      {
        transform: `translate(${config.to.x}px, ${config.to.y}px) scale(1) rotate(0deg)`,
        opacity: '1'
      }
    ], {
      duration: config.duration,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'forwards'
    }).addEventListener('finish', () => {
      cardElement.style.willChange = ''
      activeAnimations.value--
      resolve()
    })
  })
}

/**
 * カードプレイアニメーション
 */
const playCard = async (
  cardElement: HTMLElement,
  options: {
    targetPosition?: { x: number; y: number }
    duration?: number
    enableParticles?: boolean
    cardType?: string
  } = {}
): Promise<void> => {
  if (!canStartAnimation()) return

  return new Promise((resolve) => {
    activeAnimations.value++
    
    const config = {
      duration: (options.duration || 800) * intensityConfig.value.duration,
      targetPosition: options.targetPosition || { x: 0, y: 0 },
      enableParticles: options.enableParticles ?? props.enableParticles,
      cardType: options.cardType || 'normal'
    }

    // GPU最適化
    if (performanceConfig.value.useGPUAcceleration) {
      cardElement.style.willChange = 'transform, opacity, filter'
    }

    // パーティクルエフェクト
    if (config.enableParticles && !performanceConfig.value.reducedEffects) {
      const rect = cardElement.getBoundingClientRect()
      createPlayParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, config.cardType)
    }

    // 3D変形エフェクト
    cardElement.animate([
      {
        transform: 'scale(1) rotateY(0deg) rotateX(0deg)',
        filter: 'brightness(1) saturate(1)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      },
      {
        transform: 'scale(1.2) rotateY(-15deg) rotateX(5deg)',
        filter: 'brightness(1.2) saturate(1.3)',
        boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
        offset: 0.3
      },
      {
        transform: 'scale(0.1) rotateY(-90deg) rotateX(0deg)',
        filter: 'brightness(1.5) saturate(1.5)',
        boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
        offset: 0.5
      },
      {
        transform: 'scale(1) rotateY(90deg) rotateX(0deg)',
        filter: 'brightness(1.2) saturate(1.2)',
        boxShadow: '0 6px 12px rgba(0,0,0,0.1)',
        offset: 0.7
      },
      {
        transform: 'scale(1) rotateY(0deg) rotateX(0deg)',
        filter: 'brightness(1) saturate(1)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }
    ], {
      duration: config.duration,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      fill: 'forwards'
    }).addEventListener('finish', () => {
      // 着地エフェクト
      if (!performanceConfig.value.reducedEffects) {
        createLandingEffect(config.targetPosition.x, config.targetPosition.y)
      }
      
      cardElement.style.willChange = ''
      activeAnimations.value--
      resolve()
    })
  })
}

/**
 * カード破棄アニメーション
 */
const discardCard = async (
  cardElement: HTMLElement,
  options: {
    discardPile?: { x: number; y: number }
    duration?: number
    enablePhysics?: boolean
    enableParticles?: boolean
  } = {}
): Promise<void> => {
  if (!canStartAnimation()) return

  return new Promise((resolve) => {
    activeAnimations.value++
    
    const config = {
      duration: (options.duration || 600) * intensityConfig.value.duration,
      discardPile: options.discardPile || { x: 0, y: 0 },
      enablePhysics: options.enablePhysics ?? props.enablePhysics,
      enableParticles: options.enableParticles ?? props.enableParticles
    }

    // パーティクルエフェクト
    if (config.enableParticles && !performanceConfig.value.reducedEffects) {
      const rect = cardElement.getBoundingClientRect()
      createDiscardParticles(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    if (config.enablePhysics && !performanceConfig.value.reducedEffects) {
      // 物理シミュレーション付き
      animateCardPhysics(cardElement, config.discardPile, config.duration, resolve)
    } else {
      // 標準的な破棄アニメーション
      cardElement.animate([
        {
          transform: 'scale(1) rotate(0deg)',
          opacity: '1',
          filter: 'blur(0px) brightness(1)'
        },
        {
          transform: 'scale(0.8) rotate(10deg)',
          opacity: '0.7',
          filter: 'blur(1px) brightness(0.8)',
          offset: 0.6
        },
        {
          transform: 'scale(0.3) rotate(25deg)',
          opacity: '0',
          filter: 'blur(3px) brightness(0.5)'
        }
      ], {
        duration: config.duration,
        easing: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
        fill: 'forwards'
      }).addEventListener('finish', () => {
        activeAnimations.value--
        resolve()
      })
    }
  })
}

/**
 * ホバーエフェクト
 */
const hoverCard = (cardElement: HTMLElement, isHovering: boolean): void => {
  if (performanceConfig.value.reducedEffects) return

  const targetTransform = isHovering 
    ? 'translateY(-8px) scale(1.03) rotateX(2deg)' 
    : 'translateY(0px) scale(1) rotateX(0deg)'
  
  const targetBoxShadow = isHovering
    ? '0 12px 24px rgba(0,0,0,0.15), 0 0 20px rgba(77, 171, 247, 0.3)'
    : '0 4px 8px rgba(0,0,0,0.1)'

  cardElement.style.transition = 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
  cardElement.style.transform = targetTransform
  cardElement.style.boxShadow = targetBoxShadow

  if (isHovering) {
    addCardGlow(cardElement)
  } else {
    removeCardGlow(cardElement)
  }
}

/**
 * ドラッグ開始エフェクト
 */
const startDrag = (cardElement: HTMLElement): void => {
  cardElement.style.transition = 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)'
  cardElement.style.transform = 'scale(1.05) rotate(2deg) translateZ(50px)'
  cardElement.style.boxShadow = '0 15px 30px rgba(0,0,0,0.2), 0 0 25px rgba(77, 171, 247, 0.4)'
  cardElement.style.zIndex = '1000'
  
  addCardGlow(cardElement, 'drag')
}

/**
 * ドロップ成功エフェクト
 */
const dropSuccess = async (
  cardElement: HTMLElement,
  targetPosition: { x: number; y: number }
): Promise<void> => {
  return new Promise((resolve) => {
    // 成功パーティクル
    if (!performanceConfig.value.reducedEffects) {
      createSuccessParticles(targetPosition.x, targetPosition.y)
      createSuccessGlow(targetPosition.x, targetPosition.y)
    }

    // カードの成功アニメーション
    cardElement.animate([
      { transform: 'scale(1.05)', filter: 'brightness(1.2)' },
      { transform: 'scale(1.2)', filter: 'brightness(1.5)', offset: 0.5 },
      { transform: 'scale(1)', filter: 'brightness(1)' }
    ], {
      duration: 400,
      easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
    }).addEventListener('finish', () => {
      resetCardStyle(cardElement)
      resolve()
    })
  })
}

/**
 * ドロップ失敗エフェクト
 */
const dropFailed = async (
  cardElement: HTMLElement,
  originalPosition: { x: number; y: number }
): Promise<void> => {
  return new Promise((resolve) => {
    // エラーパーティクル
    if (!performanceConfig.value.reducedEffects) {
      const rect = cardElement.getBoundingClientRect()
      createErrorParticles(rect.left + rect.width / 2, rect.top + rect.height / 2)
    }

    // エラーシェイク
    cardElement.animate([
      { transform: 'translateX(0px)', filter: 'brightness(1)' },
      { transform: 'translateX(-5px)', filter: 'brightness(1.2) hue-rotate(10deg)' },
      { transform: 'translateX(5px)', filter: 'brightness(1.2) hue-rotate(-10deg)' },
      { transform: 'translateX(-3px)', filter: 'brightness(1.1) hue-rotate(5deg)' },
      { transform: 'translateX(3px)', filter: 'brightness(1.1) hue-rotate(-5deg)' },
      { transform: 'translateX(0px)', filter: 'brightness(1)' }
    ], {
      duration: 400,
      easing: 'ease-in-out'
    }).addEventListener('finish', () => {
      resetCardStyle(cardElement)
      resolve()
    })
  })
}

// === パーティクルエフェクト ===

const createDrawParticles = (x: number, y: number): void => {
  createParticleEffect(x, y, {
    count: Math.floor(8 * intensityConfig.value.particles),
    color: '#FFD700',
    size: 4,
    spread: 30,
    lifetime: 800,
    type: 'sparkle'
  })
}

const createPlayParticles = (x: number, y: number, cardType: string): void => {
  const color = getCardTypeColor(cardType)
  createParticleEffect(x, y, {
    count: Math.floor(12 * intensityConfig.value.particles),
    color,
    size: 6,
    spread: 40,
    lifetime: 1000,
    type: 'magic'
  })
}

const createDiscardParticles = (x: number, y: number): void => {
  createParticleEffect(x, y, {
    count: Math.floor(8 * intensityConfig.value.particles),
    color: '#666666',
    size: 3,
    spread: 25,
    lifetime: 600,
    type: 'smoke'
  })
}

const createSuccessParticles = (x: number, y: number): void => {
  createParticleEffect(x, y, {
    count: Math.floor(15 * intensityConfig.value.particles),
    color: '#51CF66',
    size: 5,
    spread: 50,
    lifetime: 1200,
    type: 'celebration'
  })
}

const createErrorParticles = (x: number, y: number): void => {
  createParticleEffect(x, y, {
    count: Math.floor(6 * intensityConfig.value.particles),
    color: '#FF6B6B',
    size: 4,
    spread: 30,
    lifetime: 500,
    type: 'error'
  })
}

const createParticleEffect = (
  x: number, 
  y: number, 
  config: {
    count: number
    color: string
    size: number
    spread: number
    lifetime: number
    type: string
  }
): void => {
  if (!particleLayer.value || particleCount.value >= performanceConfig.value.maxParticles) return

  for (let i = 0; i < config.count; i++) {
    const particle = document.createElement('div')
    particle.className = `particle particle-${config.type}`
    
    // パーティクルのスタイル設定
    const size = config.size + Math.random() * 4
    particle.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      background-color: ${config.color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
    `

    // タイプ別のカスタマイズ
    if (config.type === 'sparkle') {
      particle.innerHTML = '✦'
      particle.style.backgroundColor = 'transparent'
      particle.style.color = config.color
      particle.style.fontSize = `${size}px`
    } else if (config.type === 'celebration') {
      particle.style.boxShadow = `0 0 ${size}px ${config.color}`
    }

    particleLayer.value.appendChild(particle)
    particleCount.value++

    // アニメーション
    const angle = (Math.PI * 2 * i) / config.count + Math.random() * 0.5
    const velocity = 50 + Math.random() * 50
    const distance = config.spread + Math.random() * 20

    particle.animate([
      {
        transform: 'translate(0, 0) scale(1)',
        opacity: '1'
      },
      {
        transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance - 30}px) scale(0.3)`,
        opacity: '0'
      }
    ], {
      duration: config.lifetime,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    }).addEventListener('finish', () => {
      particle.remove()
      particleCount.value--
    })
  }
}

// === ヘルパー関数 ===

const canStartAnimation = (): boolean => {
  return activeAnimations.value < performanceConfig.value.maxConcurrentAnimations
}

const getCardTypeColor = (cardType: string): string => {
  const colors: Record<string, string> = {
    fire: '#FF6B35',
    water: '#4DABF7',
    earth: '#51CF66',
    air: '#FFE066',
    normal: '#ADB5BD'
  }
  return colors[cardType] || colors.normal
}

const addCardGlow = (element: HTMLElement, type: 'hover' | 'drag' = 'hover'): void => {
  const glowClass = type === 'drag' ? 'card-glow-drag' : 'card-glow-hover'
  element.classList.add(glowClass)
}

const removeCardGlow = (element: HTMLElement): void => {
  element.classList.remove('card-glow-hover', 'card-glow-drag')
}

const resetCardStyle = (element: HTMLElement): void => {
  element.style.transition = ''
  element.style.transform = ''
  element.style.boxShadow = ''
  element.style.zIndex = ''
  element.style.willChange = ''
  removeCardGlow(element)
}

const createLandingEffect = (x: number, y: number): void => {
  if (!effectLayer.value) return

  const ripple = document.createElement('div')
  ripple.className = 'landing-ripple'
  ripple.style.cssText = `
    position: absolute;
    left: ${x - 20}px;
    top: ${y - 20}px;
    width: 40px;
    height: 40px;
    border: 2px solid #4DABF7;
    border-radius: 50%;
    opacity: 0.6;
  `

  effectLayer.value.appendChild(ripple)

  ripple.animate([
    { transform: 'scale(1)', opacity: '0.6' },
    { transform: 'scale(3)', opacity: '0' }
  ], {
    duration: 400,
    easing: 'ease-out'
  }).addEventListener('finish', () => { ripple.remove(); })
}

const createSuccessGlow = (x: number, y: number): void => {
  if (!effectLayer.value) return

  const glow = document.createElement('div')
  glow.className = 'success-glow'
  glow.style.cssText = `
    position: absolute;
    left: ${x - 30}px;
    top: ${y - 30}px;
    width: 60px;
    height: 60px;
    background: radial-gradient(circle, rgba(81, 207, 102, 0.4) 0%, transparent 70%);
    border-radius: 50%;
  `

  effectLayer.value.appendChild(glow)

  glow.animate([
    { transform: 'scale(1)', opacity: '1' },
    { transform: 'scale(2)', opacity: '0' }
  ], {
    duration: 600,
    easing: 'ease-out'
  }).addEventListener('finish', () => { glow.remove(); })
}

const animateCardPhysics = (
  element: HTMLElement,
  target: { x: number; y: number },
  duration: number,
  onComplete: () => void
): void => {
  // 簡易物理シミュレーション
  let startTime: number | null = null
  const startPos = element.getBoundingClientRect()
  
  let velocityX = (target.x - startPos.left) / duration * 1000
  let velocityY = (target.y - startPos.top) / duration * 1000
  
  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp
    const elapsed = timestamp - startTime
    
    if (elapsed >= duration) {
      onComplete()
      return
    }
    
    // 重力と摩擦を適用
    velocityY += 800 * 0.016 // 重力
    velocityX *= 0.99 // 摩擦
    velocityY *= 0.99
    
    // 位置更新
    const currentPos = element.getBoundingClientRect()
    const newX = currentPos.left + velocityX * 0.016
    const newY = currentPos.top + velocityY * 0.016
    
    element.style.transform = `translate(${newX - startPos.left}px, ${newY - startPos.top}px) rotate(${elapsed / 10}deg)`
    element.style.opacity = `${1 - elapsed / duration}`
    
    requestAnimationFrame(animate)
  }
  
  requestAnimationFrame(animate)
}

// === ライフサイクル ===

onMounted(() => {
  // モーション削減設定の監視
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  reducedMotion.value = mediaQuery.matches
  mediaQuery.addEventListener('change', (e) => {
    reducedMotion.value = e.matches
  })

  // パフォーマンス監視
  if (performance.memory) {
    setInterval(() => {
      const memoryUsage = (performance.memory as any).usedJSHeapSize / 1024 / 1024
      if (memoryUsage > 100) { // 100MB以上の場合はパフォーマンスモードに切り替え
        console.warn('High memory usage detected, enabling performance mode')
      }
    }, 5000)
  }
})

onUnmounted(() => {
  // アクティブなアニメーションをクリーンアップ
  if (particleLayer.value) {
    particleLayer.value.innerHTML = ''
  }
  if (effectLayer.value) {
    effectLayer.value.innerHTML = ''
  }
})

// モーション削減設定の監視
watch(reducedMotion, (newValue) => {
  if (newValue && cardContainer.value) {
    cardContainer.value.style.setProperty('--animation-duration-multiplier', '0.1')
  } else if (cardContainer.value) {
    cardContainer.value.style.removeProperty('--animation-duration-multiplier')
  }
})

// 公開API
defineExpose({
  drawCard,
  playCard,
  discardCard,
  hoverCard,
  startDrag,
  dropSuccess,
  dropFailed
})
</script>

<style scoped>
.advanced-card-animations {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.animation-layer {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.particle-layer,
.effect-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}

/* GPU最適化 */
.animation-layer * {
  transform-style: preserve-3d;
  backface-visibility: hidden;
}

.performance-mode .animation-layer * {
  transform-style: flat;
}

/* カードグロウエフェクト */
:deep(.card-glow-hover) {
  box-shadow: 
    0 8px 16px rgba(0,0,0,0.12),
    0 0 20px rgba(77, 171, 247, 0.3),
    inset 0 1px 0 rgba(255,255,255,0.1);
  transition: box-shadow 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

:deep(.card-glow-drag) {
  box-shadow: 
    0 15px 30px rgba(0,0,0,0.2),
    0 0 25px rgba(77, 171, 247, 0.4),
    inset 0 1px 0 rgba(255,255,255,0.15);
  transition: box-shadow 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* パーティクルアニメーション */
.particle {
  will-change: transform, opacity;
}

.particle-sparkle {
  text-shadow: 0 0 10px currentColor;
}

.particle-magic {
  animation: particle-float 2s ease-out forwards;
}

.particle-celebration {
  animation: particle-celebrate 1.5s ease-out forwards;
}

@keyframes particle-float {
  0% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(180deg); }
  100% { transform: scale(0) rotate(360deg); }
}

@keyframes particle-celebrate {
  0% { transform: scale(0) rotate(0deg); }
  30% { transform: scale(1.2) rotate(120deg); }
  100% { transform: scale(0.3) rotate(360deg); }
}

/* エフェクト */
.landing-ripple {
  animation: ripple-expand 0.4s ease-out forwards;
}

@keyframes ripple-expand {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(3);
    opacity: 0;
  }
}

.success-glow {
  animation: success-glow-expand 0.6s ease-out forwards;
}

@keyframes success-glow-expand {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .particle-layer,
  .effect-layer {
    transform: scale(0.8);
    transform-origin: center;
  }
}

/* モーション削減対応 */
.reduced-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  transform: none !important;
}

.reduced-motion .particle-layer,
.reduced-motion .effect-layer {
  display: none;
}

/* パフォーマンスモード */
.performance-mode {
  --animation-duration-multiplier: 0.7;
}

.performance-mode .particle-layer {
  opacity: 0.7;
}

.performance-mode .effect-layer {
  opacity: 0.5;
}

/* 3D変形のためのCSS */
:deep(.card-3d-container) {
  transform-style: preserve-3d;
  perspective: 1000px;
}

:deep(.card-3d-inner) {
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

:deep(.card-3d-front),
:deep(.card-3d-back) {
  backface-visibility: hidden;
  position: absolute;
  width: 100%;
  height: 100%;
}

:deep(.card-3d-back) {
  transform: rotateY(180deg);
}

/* 高度なアニメーション効果 */
:deep(.card-enhanced) {
  will-change: transform, opacity, filter;
  transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

:deep(.card-enhanced:hover) {
  transform: translateY(-8px) scale(1.03) rotateX(2deg);
  filter: brightness(1.1) saturate(1.1);
}

:deep(.card-dragging) {
  transform: scale(1.05) rotate(2deg) translateZ(50px);
  filter: brightness(1.2) saturate(1.2);
  z-index: 1000;
}

/* カスタムCSS変数 */
:root {
  --card-hover-duration: 0.3s;
  --card-drag-duration: 0.2s;
  --card-play-duration: 0.8s;
  --card-draw-duration: 0.6s;
  --card-discard-duration: 0.6s;
  --particle-lifetime: 1s;
  --effect-intensity: 1;
}

.performance-mode {
  --card-hover-duration: 0.2s;
  --card-drag-duration: 0.1s;
  --card-play-duration: 0.5s;
  --card-draw-duration: 0.4s;
  --card-discard-duration: 0.4s;
  --particle-lifetime: 0.5s;
  --effect-intensity: 0.7;
}
</style>