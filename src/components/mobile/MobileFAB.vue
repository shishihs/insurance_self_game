<script setup lang="ts">
import { computed, ref } from 'vue'

interface FABAction {
  id: string
  icon: string
  label: string
  color?: string
}

const props = defineProps<{
  mainIcon?: string
  mainLabel?: string
  actions?: FABAction[]
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
}>()

const emit = defineEmits<{
  click: []
  actionClick: [id: string]
}>()

// 状態管理
const isExpanded = ref(false)
const isAnimating = ref(false)

// 位置クラス
const positionClass = computed(() => {
  switch (props.position) {
    case 'bottom-left':
      return 'fab-bottom-left'
    case 'bottom-center':
      return 'fab-bottom-center'
    default:
      return 'fab-bottom-right'
  }
})

// メインボタンのクリック処理
const handleMainClick = () => {
  if (props.actions && props.actions.length > 0) {
    toggleExpanded()
  } else {
    emit('click')
  }
}

// 展開/折りたたみ切り替え
const toggleExpanded = () => {
  if (isAnimating.value) return
  
  isAnimating.value = true
  isExpanded.value = !isExpanded.value
  
  // 触覚フィードバック
  if ('vibrate' in navigator) {
    navigator.vibrate(10)
  }
  
  setTimeout(() => {
    isAnimating.value = false
  }, 300)
}

// アクションボタンのクリック処理
const handleActionClick = (actionId: string) => {
  emit('actionClick', actionId)
  toggleExpanded()
  
  // 触覚フィードバック
  if ('vibrate' in navigator) {
    navigator.vibrate([10, 5, 10])
  }
}

// 背景クリックで閉じる
const handleBackdropClick = () => {
  if (isExpanded.value) {
    toggleExpanded()
  }
}
</script>

<template>
  <div class="mobile-fab-container">
    <!-- 背景オーバーレイ -->
    <Transition name="backdrop">
      <div
        v-if="isExpanded"
        class="fab-backdrop"
        :aria-hidden="true"
        @click="handleBackdropClick"
      ></div>
    </Transition>
    
    <!-- FABコンテナ -->
    <div :class="['fab-wrapper', positionClass]">
      <!-- アクションボタン -->
      <TransitionGroup
        v-if="actions && actions.length > 0"
        name="action-button"
        tag="div"
        class="fab-actions"
      >
        <button
          v-for="(action, index) in actions"
          v-show="isExpanded"
          :key="action.id"
          :class="['fab-action', `fab-action-${index}`]"
          :aria-label="action.label"
          :style="{
            transitionDelay: isExpanded ? `${index * 50}ms` : `${(actions.length - index - 1) * 50}ms`,
            '--action-color': action.color || 'var(--primary-light)'
          }"
          @click="handleActionClick(action.id)"
        >
          <span class="fab-action-icon">{{ action.icon }}</span>
          <span class="fab-action-label">{{ action.label }}</span>
        </button>
      </TransitionGroup>
      
      <!-- メインボタン -->
      <button
        :class="['fab-main', { 'is-expanded': isExpanded }]"
        :aria-label="mainLabel || 'アクション'"
        :aria-expanded="isExpanded"
        @click="handleMainClick"
      >
        <Transition name="icon-rotate" mode="out-in">
          <span v-if="!isExpanded" key="main" class="fab-main-icon">
            {{ mainIcon || '➕' }}
          </span>
          <span v-else key="close" class="fab-main-icon">
            ✕
          </span>
        </Transition>
      </button>
    </div>
  </div>
</template>

<style scoped>
.mobile-fab-container {
  pointer-events: none;
}

.fab-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: var(--z-modal-backdrop);
  pointer-events: auto;
}

.fab-wrapper {
  position: fixed;
  z-index: var(--z-modal);
  pointer-events: auto;
}

/* 位置クラス */
.fab-bottom-right {
  bottom: calc(var(--space-lg) + 56px + env(safe-area-inset-bottom, 0));
  right: calc(var(--space-lg) + env(safe-area-inset-right, 0));
}

.fab-bottom-left {
  bottom: calc(var(--space-lg) + 56px + env(safe-area-inset-bottom, 0));
  left: calc(var(--space-lg) + env(safe-area-inset-left, 0));
}

.fab-bottom-center {
  bottom: calc(var(--space-lg) + 56px + env(safe-area-inset-bottom, 0));
  left: 50%;
  transform: translateX(-50%);
}

/* メインボタン */
.fab-main {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: var(--primary-gradient);
  border: none;
  color: white;
  
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  
  transition: all var(--transition-normal);
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  
  will-change: transform;
}

.fab-main:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.fab-main:active {
  transform: scale(0.95);
}

.fab-main.is-expanded {
  background: var(--bg-primary);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
}

.fab-main-icon {
  font-size: 24px;
  line-height: 1;
}

/* アクションボタン */
.fab-actions {
  position: absolute;
  bottom: 70px;
  right: 0;
  display: flex;
  flex-direction: column-reverse;
  align-items: flex-end;
  gap: var(--space-sm);
}

.fab-bottom-left .fab-actions {
  right: auto;
  left: 0;
  align-items: flex-start;
}

.fab-bottom-center .fab-actions {
  right: auto;
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
}

.fab-action {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  
  padding: var(--space-sm) var(--space-md);
  background: var(--bg-card);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 28px;
  
  color: white;
  cursor: pointer;
  
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all var(--transition-normal);
  
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.fab-action:hover {
  background: var(--action-color);
  transform: translateX(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.fab-bottom-left .fab-action:hover {
  transform: translateX(4px);
}

.fab-bottom-center .fab-action:hover {
  transform: translateY(-2px);
}

.fab-action:active {
  transform: scale(0.95);
}

.fab-action-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  line-height: 1;
}

.fab-action-label {
  font-size: var(--text-sm);
  font-weight: 500;
  white-space: nowrap;
}

/* トランジション */
.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity var(--transition-normal);
}

.backdrop-enter-from,
.backdrop-leave-to {
  opacity: 0;
}

.action-button-enter-active,
.action-button-leave-active {
  transition: all var(--transition-normal);
}

.action-button-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.action-button-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.9);
}

.icon-rotate-enter-active,
.icon-rotate-leave-active {
  transition: transform var(--transition-fast);
}

.icon-rotate-enter-from {
  transform: rotate(-90deg);
}

.icon-rotate-leave-to {
  transform: rotate(90deg);
}

/* ランドスケープ対応 */
@media (orientation: landscape) and (max-height: 600px) {
  .fab-wrapper {
    bottom: calc(var(--space-md) + 48px + env(safe-area-inset-bottom, 0)) !important;
  }
  
  .fab-main {
    width: 48px;
    height: 48px;
  }
  
  .fab-main-icon {
    font-size: 20px;
  }
  
  .fab-actions {
    bottom: 60px;
  }
}

/* アクセシビリティ */
.fab-main:focus,
.fab-action:focus {
  outline: 3px solid var(--primary-light);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .fab-main,
  .fab-action {
    transition: opacity var(--transition-fast) !important;
  }
  
  .action-button-enter-from,
  .action-button-leave-to {
    transform: none;
  }
  
  .icon-rotate-enter-from,
  .icon-rotate-leave-to {
    transform: none;
  }
}

/* ダークモード対応 */
@media (prefers-color-scheme: light) {
  .fab-action {
    background: white;
    color: var(--primary-dark);
    border-color: rgba(0, 0, 0, 0.1);
  }
  
  .fab-action:hover {
    color: white;
  }
}
</style>