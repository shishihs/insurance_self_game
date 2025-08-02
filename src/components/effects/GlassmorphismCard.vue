<template>
  <div 
    class="glassmorphism-card"
    :class="[
      `variant-${variant}`,
      `size-${size}`,
      { 
        'interactive': interactive,
        'elevated': elevated,
        'animated': animated && !reduceMotion,
        'high-contrast': highContrast
      }
    ]"
    :style="cardStyle"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- 背景ブラー -->
    <div class="glass-backdrop" :style="backdropStyle" />
    
    <!-- 境界線グロー -->
    <div class="glass-border" :style="borderStyle" />
    
    <!-- 内部ハイライト -->
    <div class="glass-highlight" />
    
    <!-- 内容 -->
    <div class="glass-content">
      <slot />
    </div>
    
    <!-- ホバーエフェクト -->
    <div 
      v-if="interactive && !reduceMotion"
      class="glass-hover-effect"
      :style="hoverEffectStyle"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

interface GlassmorphismCardProps {
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

const props = withDefaults(defineProps<GlassmorphismCardProps>(), {
  variant: 'default',
  size: 'md',
  interactive: false,
  elevated: false,
  animated: true,
  blurIntensity: 12,
  opacity: 0.15,
  borderRadius: 16,
  customGradient: '',
  glowColor: '',
  reduceMotion: false,
  highContrast: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
  hover: [isHovered: boolean]
}>()

const isHovered = ref(false)
const mouseX = ref(0)
const mouseY = ref(0)

// バリアント別カラーパレット
const variantColors = computed(() => {
  switch (props.variant) {
    case 'primary':
      return {
        background: 'rgba(99, 102, 241, 0.15)',
        border: 'rgba(129, 140, 248, 0.3)',
        glow: '#6366f1',
        highlight: 'rgba(255, 255, 255, 0.2)'
      }
    case 'secondary':
      return {
        background: 'rgba(107, 114, 128, 0.15)',
        border: 'rgba(156, 163, 175, 0.3)',
        glow: '#6b7280',
        highlight: 'rgba(255, 255, 255, 0.2)'
      }
    case 'accent':
      return {
        background: 'rgba(236, 72, 153, 0.15)',
        border: 'rgba(249, 168, 212, 0.3)',
        glow: '#ec4899',
        highlight: 'rgba(255, 255, 255, 0.2)'
      }
    case 'danger':
      return {
        background: 'rgba(239, 68, 68, 0.15)',
        border: 'rgba(248, 113, 113, 0.3)',
        glow: '#ef4444',
        highlight: 'rgba(255, 255, 255, 0.2)'
      }
    case 'success':
      return {
        background: 'rgba(34, 197, 94, 0.15)',
        border: 'rgba(74, 222, 128, 0.3)',
        glow: '#22c55e',
        highlight: 'rgba(255, 255, 255, 0.2)'
      }
    default:
      return {
        background: 'rgba(255, 255, 255, 0.1)',
        border: 'rgba(255, 255, 255, 0.2)',
        glow: '#ffffff',
        highlight: 'rgba(255, 255, 255, 0.15)'
      }
  }
})

// サイズ設定
const sizeSettings = computed(() => {
  switch (props.size) {
    case 'sm':
      return { padding: '12px', minHeight: '60px', fontSize: '14px' }
    case 'lg':
      return { padding: '32px', minHeight: '120px', fontSize: '18px' }
    case 'xl':
      return { padding: '40px', minHeight: '150px', fontSize: '20px' }
    default:
      return { padding: '24px', minHeight: '80px', fontSize: '16px' }
  }
})

// カードスタイル
const cardStyle = computed(() => ({
  borderRadius: `${props.borderRadius}px`,
  padding: sizeSettings.value.padding,
  minHeight: sizeSettings.value.minHeight,
  fontSize: sizeSettings.value.fontSize,
  transform: props.interactive && isHovered.value && !props.reduceMotion
    ? 'translateY(-4px) scale(1.02)'
    : 'translateY(0) scale(1)',
  boxShadow: props.elevated || (props.interactive && isHovered.value)
    ? `0 20px 40px rgba(0, 0, 0, 0.1), 0 0 30px ${variantColors.value.glow}20`
    : '0 8px 32px rgba(0, 0, 0, 0.05)'
}))

// 背景ブラースタイル
const backdropStyle = computed(() => ({
  background: props.customGradient || 
    `linear-gradient(135deg, ${variantColors.value.background}, rgba(255, 255, 255, 0.05))`,
  backdropFilter: `blur(${props.blurIntensity}px) saturate(1.5)`,
  borderRadius: `${props.borderRadius}px`,
  opacity: props.highContrast ? 0.3 : props.opacity
}))

// 境界線スタイル
const borderStyle = computed(() => ({
  border: props.highContrast 
    ? `2px solid ${variantColors.value.border}`
    : `1px solid ${variantColors.value.border}`,
  borderRadius: `${props.borderRadius}px`,
  background: props.interactive && isHovered.value
    ? `linear-gradient(135deg, ${variantColors.value.border}, transparent)`
    : 'transparent'
}))

// ホバーエフェクトスタイル
const hoverEffectStyle = computed(() => {
  if (!isHovered.value) return { opacity: '0' }
  
  return {
    background: `radial-gradient(circle at ${mouseX.value}% ${mouseY.value}%, ${variantColors.value.glow}20 0%, transparent 50%)`,
    opacity: '1'
  }
})

// イベントハンドラー
const handleMouseEnter = (event: MouseEvent) => {
  if (!props.interactive) return
  
  isHovered.value = true
  emit('hover', true)
  updateMousePosition(event)
}

const handleMouseLeave = () => {
  if (!props.interactive) return
  
  isHovered.value = false
  emit('hover', false)
}

const handleClick = (event: MouseEvent) => {
  emit('click', event)
}

const updateMousePosition = (event: MouseEvent) => {
  if (!props.interactive || props.reduceMotion) return
  
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  mouseX.value = ((event.clientX - rect.left) / rect.width) * 100
  mouseY.value = ((event.clientY - rect.top) / rect.height) * 100
}

// マウス移動の追跡
const handleMouseMove = (event: MouseEvent) => {
  if (isHovered.value) {
    updateMousePosition(event)
  }
}

onMounted(() => {
  if (props.interactive && !props.reduceMotion) {
    document.addEventListener('mousemove', handleMouseMove)
  }
})

onUnmounted(() => {
  if (props.interactive && !props.reduceMotion) {
    document.removeEventListener('mousemove', handleMouseMove)
  }
})
</script>

<style scoped>
.glassmorphism-card {
  position: relative;
  isolation: isolate;
  cursor: default;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
}

.glassmorphism-card.interactive {
  cursor: pointer;
}

.glass-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -3;
  transition: all 0.3s ease;
}

.glass-border {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -2;
  pointer-events: none;
  transition: all 0.3s ease;
}

.glass-highlight {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  z-index: -1;
}

.glass-content {
  position: relative;
  z-index: 1;
  color: rgba(255, 255, 255, 0.9);
}

.glass-hover-effect {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
  transition: opacity 0.3s ease;
  border-radius: inherit;
}

/* アニメーション */
.glassmorphism-card.animated {
  animation: glassAppear 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes glassAppear {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* サイズバリエーション */
.glassmorphism-card.size-sm {
  --glass-border-radius: 12px;
}

.glassmorphism-card.size-lg {
  --glass-border-radius: 20px;
}

.glassmorphism-card.size-xl {
  --glass-border-radius: 24px;
}

/* 高さ調整 */
.glassmorphism-card.elevated {
  transform: translateY(-8px);
}

/* ハイコントラストモード */
.glassmorphism-card.high-contrast {
  background: rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.8);
}

.glassmorphism-card.high-contrast .glass-content {
  color: rgba(255, 255, 255, 1);
}

/* レスポンシブ調整 */
@media (max-width: 768px) {
  .glassmorphism-card {
    padding: 16px;
  }
  
  .glassmorphism-card.size-lg {
    padding: 24px;
  }
  
  .glassmorphism-card.size-xl {
    padding: 28px;
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .glassmorphism-card {
    transition: none;
    animation: none;
  }
  
  .glassmorphism-card.interactive:hover {
    transform: none;
  }
  
  .glass-hover-effect {
    display: none;
  }
}

/* フォーカス表示 */
.glassmorphism-card.interactive:focus {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .glass-content {
    color: rgba(255, 255, 255, 0.95);
  }
}

/* セレクション無効化 */
.glassmorphism-card {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}

.glass-content {
  -webkit-user-select: text;
  -moz-user-select: text;
  -ms-user-select: text;
  user-select: text;
}
</style>