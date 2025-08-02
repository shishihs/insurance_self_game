<template>
  <div 
    class="dynamic-gradient"
    :class="{ 
      'animated': animated && !reduceMotion,
      'interactive': interactive,
      'reduce-motion': reduceMotion
    }"
    :style="gradientStyle"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface DynamicGradientProps {
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

const props = withDefaults(defineProps<DynamicGradientProps>(), {
  colors: () => ['#667eea', '#764ba2', '#f093fb', '#f5576c'],
  direction: 45,
  animated: true,
  interactive: false,
  speed: 1,
  intensity: 1,
  pattern: 'linear',
  blendMode: 'normal',
  reduceMotion: false
})

const mouseX = ref(50)
const mouseY = ref(50)
const animationTime = ref(0)
const animationId = ref<number>()

// カラーパレットの拡張
const extendedColors = computed(() => {
  const baseColors = props.colors
  const extended = []
  
  // 基本色を追加
  extended.push(...baseColors)
  
  // 中間色を生成
  for (let i = 0; i < baseColors.length - 1; i++) {
    const midColor = interpolateColor(baseColors[i], baseColors[i + 1], 0.5)
    extended.push(midColor)
  }
  
  return extended
})

// アニメーション時間に基づく動的な色の位置
const animatedColorStops = computed(() => {
  const time = animationTime.value * 0.001 * props.speed
  const colors = extendedColors.value
  
  return colors.map((color, index) => {
    const basePosition = (index / (colors.length - 1)) * 100
    const offset = Math.sin(time + index * 0.5) * 10 * props.intensity
    const position = Math.max(0, Math.min(100, basePosition + offset))
    
    return { color, position }
  }).sort((a, b) => a.position - b.position)
})

// グラデーションスタイルの生成
const gradientStyle = computed(() => {
  const stops = animatedColorStops.value
  const colorString = stops.map(stop => `${stop.color} ${stop.position}%`).join(', ')
  
  let background: string
  
  switch (props.pattern) {
    case 'radial':
      background = `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, ${colorString})`
      break
    case 'conic':
      const rotation = props.animated && !props.reduceMotion 
        ? animationTime.value * 0.05 * props.speed
        : props.direction
      background = `conic-gradient(from ${rotation}deg at ${mouseX.value}% ${mouseY.value}%, ${colorString})`
      break
    case 'mesh':
      // 3つの重複するラジアルグラデーションでメッシュ効果を作成
      const mesh1 = `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, ${stops[0]?.color || '#667eea'}40 0%, transparent 50%)`
      const mesh2 = `radial-gradient(circle at ${100 - mouseX.value}% ${mouseY.value}%, ${stops[1]?.color || '#764ba2'}40 0%, transparent 50%)`
      const mesh3 = `radial-gradient(circle at ${mouseX.value}% ${100 - mouseY.value}%, ${stops[2]?.color || '#f093fb'}40 0%, transparent 50%)`
      background = `${mesh1}, ${mesh2}, ${mesh3}`
      break
    default:
      const angle = props.animated && !props.reduceMotion
        ? props.direction + Math.sin(animationTime.value * 0.001) * 30
        : props.direction
      background = `linear-gradient(${angle}deg, ${colorString})`
  }
  
  return {
    background,
    mixBlendMode: props.blendMode,
    transition: props.reduceMotion ? 'none' : 'background 0.3s ease'
  }
})

// 色の補間関数
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const hex1 = color1.replace('#', '')
  const hex2 = color2.replace('#', '')
  
  const r1 = parseInt(hex1.substr(0, 2), 16)
  const g1 = parseInt(hex1.substr(2, 2), 16)
  const b1 = parseInt(hex1.substr(4, 2), 16)
  
  const r2 = parseInt(hex2.substr(0, 2), 16)
  const g2 = parseInt(hex2.substr(2, 2), 16)
  const b2 = parseInt(hex2.substr(4, 2), 16)
  
  const r = Math.round(r1 + (r2 - r1) * factor)
  const g = Math.round(g1 + (g2 - g1) * factor)
  const b = Math.round(b1 + (b2 - b1) * factor)
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

// マウス追従
const handleMouseMove = (event: MouseEvent) => {
  if (!props.interactive || props.reduceMotion) return
  
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  mouseX.value = ((event.clientX - rect.left) / rect.width) * 100
  mouseY.value = ((event.clientY - rect.top) / rect.height) * 100
}

const handleMouseLeave = () => {
  if (!props.interactive || props.reduceMotion) return
  
  mouseX.value = 50
  mouseY.value = 50
}

// アニメーションループ
const animate = (timestamp: number) => {
  animationTime.value = timestamp
  
  if (props.animated && !props.reduceMotion) {
    animationId.value = requestAnimationFrame(animate)
  }
}

onMounted(() => {
  if (props.animated && !props.reduceMotion) {
    animationId.value = requestAnimationFrame(animate)
  }
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
})
</script>

<style scoped>
.dynamic-gradient {
  position: relative;
  width: 100%;
  height: 100%;
  background-size: 300% 300%;
  will-change: background;
}

.dynamic-gradient.animated {
  animation: gradientShift 8s ease-in-out infinite;
}

.dynamic-gradient.interactive {
  cursor: crosshair;
}

.dynamic-gradient.reduce-motion {
  animation: none !important;
  transition: none !important;
}

@keyframes gradientShift {
  0%, 100% {
    background-position: 0% 0%;
  }
  25% {
    background-position: 100% 0%;
  }
  50% {
    background-position: 100% 100%;
  }
  75% {
    background-position: 0% 100%;
  }
}

/* ブレンドモード別の調整 */
.dynamic-gradient {
  isolation: isolate;
}

/* アクセシビリティ対応 */
@media (prefers-reduced-motion: reduce) {
  .dynamic-gradient {
    animation: none !important;
    transition: none !important;
  }
}

/* パフォーマンス最適化 */
.dynamic-gradient {
  transform: translateZ(0);
  backface-visibility: hidden;
}
</style>