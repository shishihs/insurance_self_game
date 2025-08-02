<template>
  <div class="advanced-interactions-container">
    <!-- 磁気吸着エフェクト -->
    <div 
      v-if="magneticFields.length > 0"
      class="magnetic-fields"
    >
      <div
        v-for="field in magneticFields"
        :key="field.id"
        class="magnetic-field"
        :style="getMagneticFieldStyle(field)"
      />
    </div>

    <!-- パーティクルトレイル -->
    <canvas
      v-if="trailEnabled"
      ref="trailCanvasRef"
      class="particle-trail-canvas"
      @mousemove="handleTrailMouseMove"
    />

    <!-- フローティングラベル -->
    <div
      v-for="label in floatingLabels"
      :key="label.id"
      class="floating-label"
      :class="label.type"
      :style="label.style"
    >
      {{ label.text }}
    </div>

    <!-- 波紋エフェクト -->
    <div
      v-for="ripple in activeRipples"
      :key="ripple.id"
      class="advanced-ripple"
      :style="ripple.style"
    />

    <!-- スロット -->
    <slot />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from 'vue'

interface MagneticField {
  id: string
  x: number
  y: number
  radius: number
  strength: number
  element: HTMLElement
}

interface FloatingLabel {
  id: string
  text: string
  x: number
  y: number
  type: 'success' | 'error' | 'info' | 'warning'
  style: Record<string, string>
  startTime: number
}

interface RippleEffect {
  id: string
  x: number
  y: number
  color: string
  maxRadius: number
  style: Record<string, string>
  startTime: number
}

interface TrailParticle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
}

interface AdvancedMicroInteractionsProps {
  magneticEnabled?: boolean
  trailEnabled?: boolean
  magneticStrength?: number
  trailIntensity?: number
  particleCount?: number
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<AdvancedMicroInteractionsProps>(), {
  magneticEnabled: true,
  trailEnabled: true,
  magneticStrength: 0.3,
  trailIntensity: 1.0,
  particleCount: 50,
  reduceMotion: false
})

const emit = defineEmits<{
  magneticAttract: [element: HTMLElement, distance: number]
  trailUpdate: [particleCount: number]
}>()

const trailCanvasRef = ref<HTMLCanvasElement>()
const magneticFields = ref<MagneticField[]>([])
const floatingLabels = ref<FloatingLabel[]>([])
const activeRipples = ref<RippleEffect[]>([])
const trailParticles = ref<TrailParticle[]>([])

let animationId: number | null = null
let trailContext: CanvasRenderingContext2D | null = null
let mouseX = 0
let mouseY = 0
let lastMouseTime = 0

// 磁気フィールドの管理
const createMagneticField = (element: HTMLElement, strength: number = props.magneticStrength) => {
  const rect = element.getBoundingClientRect()
  const field: MagneticField = {
    id: `magnetic_${Date.now()}_${Math.random()}`,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    radius: Math.max(rect.width, rect.height) * 2,
    strength,
    element
  }

  magneticFields.value.push(field)

  // 要素のマウスイベントを設定
  const handleMouseEnter = () => { activateMagneticField(field); }
  const handleMouseLeave = () => { deactivateMagneticField(field); }

  element.addEventListener('mouseenter', handleMouseEnter)
  element.addEventListener('mouseleave', handleMouseLeave)

  return {
    destroy: () => {
      element.removeEventListener('mouseenter', handleMouseEnter)
      element.removeEventListener('mouseleave', handleMouseLeave)
      removeMagneticField(field.id)
    }
  }
}

const activateMagneticField = (field: MagneticField) => {
  if (props.reduceMotion) return

  field.element.style.transition = 'transform 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
  
  const updatePosition = (e: MouseEvent) => {
    const rect = field.element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const deltaX = e.clientX - centerX
    const deltaY = e.clientY - centerY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance < field.radius) {
      const force = (1 - distance / field.radius) * field.strength * 20
      const moveX = (deltaX / distance) * force
      const moveY = (deltaY / distance) * force
      
      field.element.style.transform = `translate(${moveX}px, ${moveY}px)`
      emit('magneticAttract', field.element, distance)
    }
  }

  document.addEventListener('mousemove', updatePosition)
  
  // クリーンアップ用の参照を保存
  field.element.addEventListener('mouseleave', () => {
    document.removeEventListener('mousemove', updatePosition)
    field.element.style.transform = ''
  }, { once: true })
}

const deactivateMagneticField = (field: MagneticField) => {
  field.element.style.transform = ''
}

const removeMagneticField = (id: string) => {
  magneticFields.value = magneticFields.value.filter(field => field.id !== id)
}

const getMagneticFieldStyle = (field: MagneticField) => ({
  position: 'fixed',
  left: `${field.x - field.radius}px`,
  top: `${field.y - field.radius}px`,
  width: `${field.radius * 2}px`,
  height: `${field.radius * 2}px`,
  background: `radial-gradient(circle, rgba(129, 140, 248, 0.1) 0%, transparent 70%)`,
  borderRadius: '50%',
  pointerEvents: 'none',
  opacity: '0',
  transition: 'opacity 0.3s ease'
})

// フローティングラベル
const createFloatingLabel = (
  text: string, 
  x: number, 
  y: number, 
  type: FloatingLabel['type'] = 'info'
) => {
  const label: FloatingLabel = {
    id: `label_${Date.now()}_${Math.random()}`,
    text,
    x,
    y,
    type,
    style: {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%) scale(0)',
      zIndex: '10000',
      pointerEvents: 'none',
      transition: 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
    },
    startTime: performance.now()
  }

  floatingLabels.value.push(label)

  // アニメーション開始
  nextTick(() => {
    label.style.transform = 'translate(-50%, -50%) scale(1) translateY(-20px)'
    label.style.opacity = '1'
  })

  // 自動削除
  setTimeout(() => {
    label.style.opacity = '0'
    label.style.transform = 'translate(-50%, -50%) scale(0.8) translateY(-40px)'
    
    setTimeout(() => {
      floatingLabels.value = floatingLabels.value.filter(l => l.id !== label.id)
    }, 600)
  }, 2000)

  return label.id
}

// 高度な波紋エフェクト
const createAdvancedRipple = (
  x: number, 
  y: number, 
  color: string = 'rgba(129, 140, 248, 0.3)',
  size: 'small' | 'medium' | 'large' = 'medium'
) => {
  const maxRadius = size === 'small' ? 100 : size === 'large' ? 300 : 200
  
  const ripple: RippleEffect = {
    id: `ripple_${Date.now()}_${Math.random()}`,
    x,
    y,
    color,
    maxRadius,
    style: {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      width: '4px',
      height: '4px',
      borderRadius: '50%',
      border: `2px solid ${color}`,
      transform: 'translate(-50%, -50%) scale(0)',
      pointerEvents: 'none',
      zIndex: '1000',
      transition: 'all 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
    },
    startTime: performance.now()
  }

  activeRipples.value.push(ripple)

  // アニメーション開始
  nextTick(() => {
    ripple.style.transform = `translate(-50%, -50%) scale(${maxRadius / 2})`
    ripple.style.opacity = '0'
    ripple.style.borderWidth = '1px'
  })

  // 自動削除
  setTimeout(() => {
    activeRipples.value = activeRipples.value.filter(r => r.id !== ripple.id)
  }, 1200)

  return ripple.id
}

// パーティクルトレイル
const initTrailCanvas = () => {
  if (!trailCanvasRef.value) return

  const canvas = trailCanvasRef.value
  trailContext = canvas.getContext('2d')
  
  if (!trailContext) return

  const resizeCanvas = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }

  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)

  return () => {
    window.removeEventListener('resize', resizeCanvas)
  }
}

const handleTrailMouseMove = (event: MouseEvent) => {
  if (props.reduceMotion || !props.trailEnabled) return

  mouseX = event.clientX
  mouseY = event.clientY
  const currentTime = performance.now()

  // パーティクル生成の間隔制御
  if (currentTime - lastMouseTime > 50) {
    createTrailParticles(mouseX, mouseY)
    lastMouseTime = currentTime
  }
}

const createTrailParticles = (x: number, y: number) => {
  const particleCount = Math.floor(props.particleCount * props.trailIntensity)
  
  for (let i = 0; i < Math.min(particleCount, 5); i++) {
    const particle: TrailParticle = {
      x: x + (Math.random() - 0.5) * 20,
      y: y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1,
      maxLife: 60 + Math.random() * 60,
      size: 2 + Math.random() * 4,
      color: `hsl(${220 + Math.random() * 40}, 80%, ${60 + Math.random() * 30}%)`
    }

    trailParticles.value.push(particle)
  }

  // パーティクル数の制限
  if (trailParticles.value.length > props.particleCount * 3) {
    trailParticles.value = trailParticles.value.slice(-props.particleCount * 2)
  }
}

const updateTrailParticles = () => {
  if (!trailContext || props.reduceMotion) return

  const canvas = trailCanvasRef.value!
  trailContext.clearRect(0, 0, canvas.width, canvas.height)

  trailParticles.value = trailParticles.value.filter(particle => {
    // パーティクルの更新
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vx *= 0.98
    particle.vy *= 0.98
    particle.life -= 1

    if (particle.life <= 0) return false

    // 描画
    const alpha = particle.life / particle.maxLife
    trailContext.save()
    trailContext.globalAlpha = alpha
    trailContext.fillStyle = particle.color
    trailContext.beginPath()
    trailContext.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2)
    trailContext.fill()
    trailContext.restore()

    return true
  })

  emit('trailUpdate', trailParticles.value.length)
}

// アニメーションループ
const animate = () => {
  if (!props.reduceMotion) {
    updateTrailParticles()
  }
  
  animationId = requestAnimationFrame(animate)
}

// 公開メソッド
const addMagneticElement = (element: HTMLElement, strength?: number) => {
  if (!props.magneticEnabled) return null
  return createMagneticField(element, strength)
}

const showFloatingMessage = (text: string, x: number, y: number, type?: FloatingLabel['type']) => {
  return createFloatingLabel(text, x, y, type)
}

const createRippleAt = (x: number, y: number, color?: string, size?: 'small' | 'medium' | 'large') => {
  return createAdvancedRipple(x, y, color, size)
}

// エクスポート
defineExpose({
  addMagneticElement,
  showFloatingMessage,
  createRippleAt
})

onMounted(() => {
  const cleanupCanvas = initTrailCanvas()
  
  if (!props.reduceMotion) {
    animationId = requestAnimationFrame(animate)
  }

  return () => {
    if (cleanupCanvas) cleanupCanvas()
  }
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.advanced-interactions-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.magnetic-fields {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.magnetic-field {
  position: fixed;
  pointer-events: none;
}

.particle-trail-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.floating-label {
  position: fixed;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
  opacity: 0;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.floating-label.success {
  background: rgba(34, 197, 94, 0.9);
  color: white;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.floating-label.error {
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.floating-label.info {
  background: rgba(59, 130, 246, 0.9);
  color: white;
  border: 1px solid rgba(59, 130, 246, 0.3);
}

.floating-label.warning {
  background: rgba(245, 158, 11, 0.9);
  color: white;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.advanced-ripple {
  position: fixed;
  pointer-events: none;
}

/* アクセシビリティ対応 */
@media (prefers-reduced-motion: reduce) {
  .magnetic-field,
  .particle-trail-canvas,
  .floating-label,
  .advanced-ripple {
    display: none;
  }
}

/* パフォーマンス最適化 */
.advanced-interactions-container {
  will-change: auto;
}

.particle-trail-canvas {
  will-change: auto;
}

/* 高DPI対応 */
@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
  .particle-trail-canvas {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
}
</style>