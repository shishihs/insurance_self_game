<template>
  <button
    class="neumorphism-button"
    :class="[
      `variant-${variant}`,
      `size-${size}`,
      { 
        'pressed': isPressed,
        'disabled': disabled,
        'elevated': elevated,
        'high-contrast': highContrast
      }
    ]"
    :style="buttonStyle"
    :disabled="disabled"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <!-- 内側シャドウ -->
    <div class="neuro-inner-shadow" :style="innerShadowStyle" />
    
    <!-- アイコン -->
    <div v-if="$slots.icon" class="neuro-icon">
      <slot name="icon" />
    </div>
    
    <!-- テキスト -->
    <span class="neuro-text">
      <slot />
    </span>
    
    <!-- リップルエフェクト -->
    <div 
      v-if="rippleEffect && !disabled"
      class="neuro-ripple"
      :style="rippleStyle"
    />
  </button>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

interface NeumorphismButtonProps {
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  elevated?: boolean
  rippleEffect?: boolean
  customColor?: string
  highContrast?: boolean
}

const props = withDefaults(defineProps<NeumorphismButtonProps>(), {
  variant: 'default',
  size: 'md',
  disabled: false,
  elevated: false,
  rippleEffect: true,
  customColor: '',
  highContrast: false
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const isPressed = ref(false)
const rippleX = ref(0)
const rippleY = ref(0)
const showRipple = ref(false)

// バリアント別色設定
const variantColors = computed(() => {
  if (props.customColor) {
    return {
      base: props.customColor,
      light: lightenColor(props.customColor, 20),
      dark: darkenColor(props.customColor, 20),
      text: getContrastColor(props.customColor)
    }
  }

  switch (props.variant) {
    case 'primary':
      return {
        base: '#6366f1',
        light: '#818cf8',
        dark: '#4338ca',
        text: '#ffffff'
      }
    case 'secondary':
      return {
        base: '#6b7280',
        light: '#9ca3af',
        dark: '#374151',
        text: '#ffffff'
      }
    case 'danger':
      return {
        base: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
        text: '#ffffff'
      }
    case 'success':
      return {
        base: '#10b981',
        light: '#34d399',
        dark: '#059669',
        text: '#ffffff'
      }
    default:
      return {
        base: '#e5e7eb',
        light: '#f3f4f6',
        dark: '#d1d5db',
        text: '#374151'
      }
  }
})

// サイズ設定
const sizeSettings = computed(() => {
  switch (props.size) {
    case 'sm':
      return {
        padding: '8px 16px',
        fontSize: '14px',
        borderRadius: '8px',
        shadowDistance: '4px'
      }
    case 'lg':
      return {
        padding: '16px 32px',
        fontSize: '18px',
        borderRadius: '16px',
        shadowDistance: '8px'
      }
    default:
      return {
        padding: '12px 24px',
        fontSize: '16px',
        borderRadius: '12px',
        shadowDistance: '6px'
      }
  }
})

// ボタンスタイル
const buttonStyle = computed(() => {
  const colors = variantColors.value
  const size = sizeSettings.value
  const shadowDistance = size.shadowDistance
  
  const baseStyle = {
    background: colors.base,
    color: colors.text,
    padding: size.padding,
    fontSize: size.fontSize,
    borderRadius: size.borderRadius,
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
  }

  if (props.disabled) {
    return {
      ...baseStyle,
      background: '#d1d5db',
      color: '#9ca3af',
      boxShadow: 'none',
      cursor: 'not-allowed'
    }
  }

  if (props.highContrast) {
    return {
      ...baseStyle,
      background: colors.text === '#ffffff' ? '#000000' : '#ffffff',
      color: colors.text === '#ffffff' ? '#ffffff' : '#000000',
      border: `2px solid ${colors.base}`,
      boxShadow: `0 0 0 2px ${colors.base}`
    }
  }

  if (isPressed.value) {
    return {
      ...baseStyle,
      boxShadow: `inset ${shadowDistance} ${shadowDistance} ${parseInt(shadowDistance) * 2}px ${colors.dark}40, 
                  inset -${shadowDistance} -${shadowDistance} ${parseInt(shadowDistance) * 2}px ${colors.light}40`,
      transform: 'translateY(1px)'
    }
  }

  return {
    ...baseStyle,
    boxShadow: props.elevated
      ? `${shadowDistance} ${shadowDistance} ${parseInt(shadowDistance) * 2}px ${colors.dark}60, 
         -${shadowDistance} -${shadowDistance} ${parseInt(shadowDistance) * 2}px ${colors.light}60,
         0 ${parseInt(shadowDistance) * 2}px ${parseInt(shadowDistance) * 4}px rgba(0, 0, 0, 0.1)`
      : `${shadowDistance} ${shadowDistance} ${parseInt(shadowDistance) * 2}px ${colors.dark}40, 
         -${shadowDistance} -${shadowDistance} ${parseInt(shadowDistance) * 2}px ${colors.light}40`
  }
})

// 内側シャドウスタイル
const innerShadowStyle = computed(() => {
  if (!isPressed.value || props.disabled || props.highContrast) {
    return { opacity: '0' }
  }
  
  const colors = variantColors.value
  const shadowDistance = sizeSettings.value.shadowDistance
  
  return {
    opacity: '1',
    background: `linear-gradient(135deg, ${colors.dark}20, ${colors.light}10)`,
    boxShadow: `inset ${shadowDistance} ${shadowDistance} ${parseInt(shadowDistance) * 2}px ${colors.dark}30`
  }
})

// リップルスタイル
const rippleStyle = computed(() => {
  if (!showRipple.value) return { opacity: '0', transform: 'scale(0)' }
  
  return {
    left: `${rippleX.value}px`,
    top: `${rippleY.value}px`,
    opacity: '0.6',
    transform: 'scale(4)',
    background: variantColors.value.text === '#ffffff' 
      ? 'rgba(255, 255, 255, 0.3)' 
      : 'rgba(0, 0, 0, 0.2)'
  }
})

// 色操作ユーティリティ
const lightenColor = (color: string, percent: number): string => {
  // 簡易的な色の明度調整
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) + amt
  const G = (num >> 8 & 0x00FF) + amt
  const B = (num & 0x0000FF) + amt
  return `#${  (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1)}`
}

const darkenColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = (num >> 16) - amt
  const G = (num >> 8 & 0x00FF) - amt
  const B = (num & 0x0000FF) - amt
  return `#${  (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
    (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
    (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1)}`
}

const getContrastColor = (color: string): string => {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000
  return brightness > 128 ? '#000000' : '#ffffff'
}

// イベントハンドラー
const handleMouseDown = (event: MouseEvent) => {
  if (props.disabled) return
  
  isPressed.value = true
  
  if (props.rippleEffect) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    rippleX.value = event.clientX - rect.left
    rippleY.value = event.clientY - rect.top
    showRipple.value = true
    
    setTimeout(() => {
      showRipple.value = false
    }, 600)
  }
}

const handleMouseUp = () => {
  if (props.disabled) return
  isPressed.value = false
}

const handleMouseLeave = () => {
  if (props.disabled) return
  isPressed.value = false
}

const handleClick = (event: MouseEvent) => {
  if (props.disabled) return
  emit('click', event)
}
</script>

<style scoped>
.neumorphism-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-family: inherit;
  overflow: hidden;
  outline: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  will-change: transform, box-shadow;
}

.neumorphism-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.neuro-inner-shadow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.neuro-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.neuro-text {
  position: relative;
  z-index: 1;
}

.neuro-ripple {
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  transform-origin: center;
  pointer-events: none;
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

/* バリアント別スタイル */
.variant-primary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.variant-secondary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.variant-danger:hover:not(:disabled) {
  transform: translateY(-1px);
}

.variant-success:hover:not(:disabled) {
  transform: translateY(-1px);
}

/* フォーカス表示 */
.neumorphism-button:focus-visible {
  outline: 2px solid #6366f1;
  outline-offset: 2px;
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .neumorphism-button {
    transition: none;
  }
  
  .neuro-ripple {
    display: none;
  }
  
  .neumorphism-button:hover:not(:disabled) {
    transform: none;
  }
}

/* ハイコントラストモード専用 */
.neumorphism-button.high-contrast {
  box-shadow: none !important;
  border: 2px solid currentColor !important;
}

.neumorphism-button.high-contrast:hover:not(:disabled) {
  background-color: currentColor !important;
  color: var(--contrast-bg, white) !important;
}

.neumorphism-button.high-contrast.pressed {
  transform: scale(0.98) !important;
}

/* タッチデバイス最適化 */
@media (hover: none) {
  .neumorphism-button:hover {
    transform: none;
  }
}

/* レスポンシブ調整 */
@media (max-width: 640px) {
  .neumorphism-button.size-lg {
    padding: 12px 24px;
    font-size: 16px;
  }
  
  .neumorphism-button.size-md {
    padding: 10px 20px;
    font-size: 14px;
  }
  
  .neumorphism-button.size-sm {
    padding: 8px 16px;
    font-size: 12px;
  }
}
</style>