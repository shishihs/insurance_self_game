<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { ErrorInfo } from '@/utils/error-handling/ErrorHandler'

interface ErrorNotification {
  id: string
  message: string
  severity: ErrorInfo['severity']
  timestamp: number
  actions?: Array<{
    label: string
    action: () => void
  }>
  autoHide?: boolean
  hideDelay?: number
}

const notifications = ref<ErrorNotification[]>([])
const maxNotifications = 3
const defaultHideDelay = 5000

// 通知を追加
const addNotification = (notification: Omit<ErrorNotification, 'id' | 'timestamp'>) => {
  const id = `${Date.now()}-${Math.random()}`
  const newNotification: ErrorNotification = {
    ...notification,
    id,
    timestamp: Date.now(),
    autoHide: notification.autoHide ?? notification.severity !== 'critical',
    hideDelay: notification.hideDelay ?? defaultHideDelay
  }

  notifications.value.unshift(newNotification)

  // 最大数を超えたら古いものを削除
  if (notifications.value.length > maxNotifications) {
    notifications.value = notifications.value.slice(0, maxNotifications)
  }

  // 自動非表示
  if (newNotification.autoHide) {
    setTimeout(() => {
      removeNotification(id)
    }, newNotification.hideDelay)
  }
}

// 通知を削除
const removeNotification = (id: string) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index !== -1) {
    notifications.value.splice(index, 1)
  }
}

// すべての通知をクリア
const clearAll = () => {
  notifications.value = []
}

// エラーイベントリスナー
const handleError = (event: CustomEvent) => {
  const { message, severity } = event.detail
  
  // 同じメッセージの通知が既にある場合はスキップ
  if (notifications.value.some(n => n.message === message)) {
    return
  }

  addNotification({
    message,
    severity: severity || 'medium',
    actions: severity === 'critical' ? [
      {
        label: 'ページを再読み込み',
        action: () => window.location.reload()
      }
    ] : undefined
  })
}

// 通知のアイコン
const getIcon = (severity: ErrorInfo['severity']) => {
  switch (severity) {
    case 'critical':
      return '🚨'
    case 'high':
      return '⚠️'
    case 'medium':
      return 'ℹ️'
    case 'low':
      return '💡'
  }
}

// 通知の色
const getColorClass = (severity: ErrorInfo['severity']) => {
  switch (severity) {
    case 'critical':
      return 'notification-critical'
    case 'high':
      return 'notification-high'
    case 'medium':
      return 'notification-medium'
    case 'low':
      return 'notification-low'
  }
}

// アニメーションのための計算プロパティ
const visibleNotifications = computed(() => 
  notifications.value.map((notification, index) => ({
    ...notification,
    offset: index * 80,
    opacity: index < 3 ? 1 : 0.5
  }))
)

onMounted(() => {
  window.addEventListener('app:error', handleError as EventListener)
})

onUnmounted(() => {
  window.removeEventListener('app:error', handleError as EventListener)
})

// 外部からアクセス可能なメソッドを公開
defineExpose({
  addNotification,
  removeNotification,
  clearAll
})
</script>

<template>
  <Teleport to="body">
    <div class="error-notification-container" role="alert" aria-live="polite">
      <TransitionGroup name="notification" tag="div">
        <div
          v-for="(notification, index) in visibleNotifications"
          :key="notification.id"
          :class="['error-notification', getColorClass(notification.severity)]"
          :style="{
            transform: `translateY(${notification.offset}px)`,
            opacity: notification.opacity,
            zIndex: 1000 - index
          }"
          role="alertdialog"
          :aria-label="`${notification.severity}エラー: ${notification.message}`"
        >
          <div class="notification-content">
            <span class="notification-icon" aria-hidden="true">
              {{ getIcon(notification.severity) }}
            </span>
            
            <div class="notification-body">
              <p class="notification-message">{{ notification.message }}</p>
              
              <div v-if="notification.actions && notification.actions.length > 0" class="notification-actions">
                <button
                  v-for="(action, actionIndex) in notification.actions"
                  :key="actionIndex"
                  @click="action.action"
                  class="notification-action-btn"
                >
                  {{ action.label }}
                </button>
              </div>
            </div>
            
            <button
              @click="removeNotification(notification.id)"
              class="notification-close"
              :aria-label="`通知を閉じる: ${notification.message}`"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="18" y1="6" x2="6" y2="18" stroke-width="2"/>
                <line x1="6" y1="6" x2="18" y2="18" stroke-width="2"/>
              </svg>
            </button>
          </div>
          
          <!-- 自動非表示のプログレスバー -->
          <div
            v-if="notification.autoHide"
            class="notification-progress"
            :style="{
              animationDuration: `${notification.hideDelay}ms`
            }"
          />
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.error-notification-container {
  position: fixed;
  top: var(--space-md);
  right: var(--space-md);
  z-index: var(--z-notification);
  pointer-events: none;
}

.error-notification {
  position: absolute;
  top: 0;
  right: 0;
  min-width: 320px;
  max-width: 420px;
  background: rgba(17, 24, 39, 0.95);
  border-radius: 12px;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  pointer-events: auto;
  transition: all 0.3s ease;
  overflow: hidden;
}

.notification-content {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-md);
}

.notification-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
  margin-top: 2px;
}

.notification-body {
  flex: 1;
  min-width: 0;
}

.notification-message {
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-base);
  line-height: 1.5;
  margin: 0;
  word-wrap: break-word;
}

.notification-actions {
  margin-top: var(--space-sm);
  display: flex;
  gap: var(--space-xs);
}

.notification-action-btn {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.notification-action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
}

.notification-close {
  position: absolute;
  top: var(--space-sm);
  right: var(--space-sm);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  border-radius: 4px;
  transition: all var(--transition-fast);
  padding: 0;
}

.notification-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
}

/* プログレスバー */
.notification-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: currentColor;
  animation: progress linear forwards;
  transform-origin: left;
}

@keyframes progress {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

/* 深刻度別のスタイル */
.notification-critical {
  border-left: 4px solid rgba(239, 68, 68, 1);
}

.notification-critical .notification-icon {
  color: rgba(239, 68, 68, 1);
}

.notification-critical .notification-progress {
  color: rgba(239, 68, 68, 0.6);
}

.notification-high {
  border-left: 4px solid rgba(245, 158, 11, 1);
}

.notification-high .notification-icon {
  color: rgba(245, 158, 11, 1);
}

.notification-high .notification-progress {
  color: rgba(245, 158, 11, 0.6);
}

.notification-medium {
  border-left: 4px solid rgba(59, 130, 246, 1);
}

.notification-medium .notification-icon {
  color: rgba(59, 130, 246, 1);
}

.notification-medium .notification-progress {
  color: rgba(59, 130, 246, 0.6);
}

.notification-low {
  border-left: 4px solid rgba(156, 163, 175, 1);
}

.notification-low .notification-icon {
  color: rgba(156, 163, 175, 1);
}

.notification-low .notification-progress {
  color: rgba(156, 163, 175, 0.6);
}

/* トランジション */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-enter-from {
  transform: translateX(100%) !important;
  opacity: 0 !important;
}

.notification-leave-to {
  transform: translateX(100%) !important;
  opacity: 0 !important;
}

/* レスポンシブ */
@media (max-width: 640px) {
  .error-notification-container {
    top: var(--space-sm);
    right: var(--space-sm);
    left: var(--space-sm);
  }
  
  .error-notification {
    position: relative;
    transform: none !important;
    max-width: 100%;
    margin-bottom: var(--space-sm);
  }
  
  .notification-content {
    padding: var(--space-sm);
  }
  
  .notification-message {
    font-size: var(--text-sm);
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .error-notification,
  .notification-action-btn,
  .notification-close {
    transition: none;
  }
  
  .notification-progress {
    animation: none;
    display: none;
  }
}

/* ハイコントラストモード */
@media (prefers-contrast: high) {
  .error-notification {
    border: 2px solid currentColor;
  }
  
  .notification-action-btn {
    border-width: 2px;
  }
}

/* ダークモード対応は既に考慮済み（背景が半透明） */
</style>