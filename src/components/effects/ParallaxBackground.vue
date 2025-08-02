<template>
  <div ref="containerRef" class="parallax-container">
    <!-- 背景レイヤー（最も遠い） -->
    <div 
      class="parallax-layer background-layer"
      :style="backgroundLayerStyle"
    >
      <div class="gradient-mesh">
        <div class="gradient-orb orb-1" :style="orb1Style"></div>
        <div class="gradient-orb orb-2" :style="orb2Style"></div>
        <div class="gradient-orb orb-3" :style="orb3Style"></div>
        <div class="gradient-orb orb-4" :style="orb4Style"></div>
      </div>
    </div>

    <!-- 中間レイヤー -->
    <div 
      class="parallax-layer middle-layer"
      :style="middleLayerStyle"
    >
      <div class="floating-shapes">
        <div 
          v-for="(shape, index) in floatingShapes"
          :key="index"
          class="floating-shape"
          :class="`shape-${shape.type}`"
          :style="getShapeStyle(shape, index)"
        />
      </div>
    </div>

    <!-- 前景レイヤー（最も近い） -->
    <div 
      class="parallax-layer foreground-layer"
      :style="foregroundLayerStyle"
    >
      <div class="light-rays">
        <div 
          v-for="(ray, index) in lightRays"
          :key="index"
          class="light-ray"
          :style="getRayStyle(ray, index)"
        />
      </div>
    </div>

    <!-- コンテンツスロット -->
    <div class="parallax-content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'

interface ParallaxProps {
  scrollSpeed?: number
  layerCount?: number
  enableMouseParallax?: boolean
  intensity?: 'subtle' | 'normal' | 'dramatic'
  theme?: 'cool' | 'warm' | 'neutral' | 'cosmic'
  reduceMotion?: boolean
}

const props = withDefaults(defineProps<ParallaxProps>(), {
  scrollSpeed: 1,
  layerCount: 3,
  enableMouseParallax: true,
  intensity: 'normal',
  theme: 'cool',
  reduceMotion: false
})

const containerRef = ref<HTMLElement>()
const scrollY = ref(0)
const mouseX = ref(0)
const mouseY = ref(0)
const animationTime = ref(0)

// テーマカラー設定
const themeColors = computed(() => {
  switch (props.theme) {
    case 'warm':
      return ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff']
    case 'cool':
      return ['#667eea', '#764ba2', '#4facfe', '#00f2fe']
    case 'cosmic':
      return ['#8b5fbf', '#8b5fbf', '#e056fd', '#7c3aed']
    default:
      return ['#6366f1', '#a855f7', '#ec4899', '#f59e0b']
  }
})

// 強度設定
const intensityMultiplier = computed(() => {
  if (props.reduceMotion) return 0.1
  
  switch (props.intensity) {
    case 'subtle': return 0.3
    case 'dramatic': return 1.8
    default: return 1.0
  }
})

// 浮遊する形状の設定
const floatingShapes = reactive(
  Array.from({ length: 12 }, (_, index) => ({
    type: ['circle', 'triangle', 'square', 'diamond'][Math.floor(Math.random() * 4)],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 40,
    speed: 0.5 + Math.random() * 2,
    rotation: Math.random() * 360,
    color: themeColors.value[Math.floor(Math.random() * themeColors.value.length)]
  }))
)

// 光線の設定
const lightRays = reactive(
  Array.from({ length: 6 }, (_, index) => ({
    angle: (index * 60) + Math.random() * 30,
    length: 200 + Math.random() * 300,
    opacity: 0.1 + Math.random() * 0.2,
    speed: 0.2 + Math.random() * 0.8
  }))
)

// レイヤースタイルの計算
const backgroundLayerStyle = computed(() => {
  const parallaxY = scrollY.value * 0.1 * intensityMultiplier.value
  const mouseParallaxX = mouseX.value * 0.02 * intensityMultiplier.value
  const mouseParallaxY = mouseY.value * 0.02 * intensityMultiplier.value
  
  return {
    transform: `translate3d(${mouseParallaxX}px, ${parallaxY + mouseParallaxY}px, 0)`,
    transition: props.reduceMotion ? 'none' : 'transform 0.1s ease-out'
  }
})

const middleLayerStyle = computed(() => {
  const parallaxY = scrollY.value * 0.3 * intensityMultiplier.value
  const mouseParallaxX = mouseX.value * 0.05 * intensityMultiplier.value
  const mouseParallaxY = mouseY.value * 0.05 * intensityMultiplier.value
  
  return {
    transform: `translate3d(${mouseParallaxX}px, ${parallaxY + mouseParallaxY}px, 0)`,
    transition: props.reduceMotion ? 'none' : 'transform 0.1s ease-out'
  }
})

const foregroundLayerStyle = computed(() => {
  const parallaxY = scrollY.value * 0.6 * intensityMultiplier.value
  const mouseParallaxX = mouseX.value * 0.1 * intensityMultiplier.value
  const mouseParallaxY = mouseY.value * 0.1 * intensityMultiplier.value
  
  return {
    transform: `translate3d(${mouseParallaxX}px, ${parallaxY + mouseParallaxY}px, 0)`,
    transition: props.reduceMotion ? 'none' : 'transform 0.1s ease-out'
  }
})

// グラデーションオーブのスタイル
const orb1Style = computed(() => ({
  background: `radial-gradient(circle, ${themeColors.value[0]}40 0%, transparent 70%)`,
  transform: `translate(${Math.sin(animationTime.value * 0.001) * 100}px, ${Math.cos(animationTime.value * 0.0008) * 80}px)`
}))

const orb2Style = computed(() => ({
  background: `radial-gradient(circle, ${themeColors.value[1]}30 0%, transparent 70%)`,
  transform: `translate(${Math.sin(animationTime.value * 0.0015) * 120}px, ${Math.cos(animationTime.value * 0.0012) * 100}px)`
}))

const orb3Style = computed(() => ({
  background: `radial-gradient(circle, ${themeColors.value[2]}35 0%, transparent 70%)`,
  transform: `translate(${Math.sin(animationTime.value * 0.0008) * 90}px, ${Math.cos(animationTime.value * 0.001) * 70}px)`
}))

const orb4Style = computed(() => ({
  background: `radial-gradient(circle, ${themeColors.value[3]}25 0%, transparent 70%)`,
  transform: `translate(${Math.sin(animationTime.value * 0.0012) * 110}px, ${Math.cos(animationTime.value * 0.0009) * 90}px)`
}))

// 浮遊形状のスタイル
const getShapeStyle = (shape: any, index: number) => {
  const animOffset = animationTime.value * shape.speed * 0.001
  const x = shape.x + Math.sin(animOffset + index) * 20 * intensityMultiplier.value
  const y = shape.y + Math.cos(animOffset + index * 0.7) * 15 * intensityMultiplier.value
  const rotation = shape.rotation + animationTime.value * 0.05 * shape.speed
  
  return {
    left: `${x}%`,
    top: `${y}%`,
    width: `${shape.size}px`,
    height: `${shape.size}px`,
    backgroundColor: `${shape.color}20`,
    border: `2px solid ${shape.color}40`,
    transform: `rotate(${rotation}deg)`,
    transition: props.reduceMotion ? 'none' : 'all 0.1s ease-out'
  }
}

// 光線のスタイル
const getRayStyle = (ray: any, index: number) => {
  const rotation = ray.angle + animationTime.value * ray.speed * 0.1
  
  return {
    transform: `rotate(${rotation}deg)`,
    width: `${ray.length}px`,
    opacity: ray.opacity,
    background: `linear-gradient(90deg, transparent 0%, ${themeColors.value[index % themeColors.value.length]}20 50%, transparent 100%)`
  }
}

// スクロールイベントハンドラー
const handleScroll = () => {
  scrollY.value = window.pageYOffset
}

// マウスイベントハンドラー
const handleMouseMove = (event: MouseEvent) => {
  if (!props.enableMouseParallax || props.reduceMotion) return

  const rect = containerRef.value?.getBoundingClientRect()
  if (!rect) return

  mouseX.value = (event.clientX - rect.left - rect.width / 2) / rect.width * 100
  mouseY.value = (event.clientY - rect.top - rect.height / 2) / rect.height * 100
}

// アニメーションループ
let animationId: number

const animate = (timestamp: number) => {
  animationTime.value = timestamp
  animationId = requestAnimationFrame(animate)
}

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('mousemove', handleMouseMove, { passive: true })
  
  if (!props.reduceMotion) {
    animationId = requestAnimationFrame(animate)
  }
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('mousemove', handleMouseMove)
  
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.parallax-container {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.parallax-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 120%;
  height: 120%;
  pointer-events: none;
  will-change: transform;
}

.background-layer {
  z-index: 1;
}

.middle-layer {
  z-index: 2;
}

.foreground-layer {
  z-index: 3;
}

.parallax-content {
  position: relative;
  z-index: 10;
  pointer-events: auto;
}

/* グラデーションメッシュ */
.gradient-mesh {
  position: relative;
  width: 100%;
  height: 100%;
}

.gradient-orb {
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  filter: blur(60px);
  will-change: transform;
}

.orb-1 {
  top: 10%;
  left: 10%;
}

.orb-2 {
  top: 20%;
  right: 15%;
}

.orb-3 {
  bottom: 30%;
  left: 20%;
}

.orb-4 {
  bottom: 10%;
  right: 10%;
}

/* 浮遊形状 */
.floating-shapes {
  position: relative;
  width: 100%;
  height: 100%;
}

.floating-shape {
  position: absolute;
  border-radius: 8px;
  backdrop-filter: blur(2px);
  will-change: transform;
}

.shape-circle {
  border-radius: 50%;
}

.shape-triangle {
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  border-radius: 0;
}

.shape-diamond {
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  border-radius: 0;
}

/* 光線 */
.light-rays {
  position: relative;
  width: 100%;
  height: 100%;
}

.light-ray {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 2px;
  transform-origin: left center;
  will-change: transform;
}

/* レスポンシブ調整 */
@media (max-width: 768px) {
  .gradient-orb {
    width: 200px;
    height: 200px;
    filter: blur(30px);
  }
  
  .floating-shape {
    transform: scale(0.7);
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .parallax-layer,
  .gradient-orb,
  .floating-shape,
  .light-ray {
    transform: none !important;
    transition: none !important;
    animation: none !important;
  }
}

/* パフォーマンス最適化 */
.parallax-layer {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}
</style>