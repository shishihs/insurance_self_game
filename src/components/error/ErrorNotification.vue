<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { ErrorInfo } from '@/utils/error-handling/ErrorHandler'
import { userFriendlyMessages, type UserMessage } from '@/utils/error-handling/UserFriendlyMessages'

interface ErrorNotification {
  id: string
  userMessage: UserMessage
  originalError: ErrorInfo
  timestamp: number
  autoHide?: boolean
  hideDelay?: number
  isExpanded?: boolean
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
    autoHide: notification.autoHide ?? notification.userMessage.severity !== 'critical',
    hideDelay: notification.hideDelay ?? defaultHideDelay,
    isExpanded: false
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
  const errorInfo: ErrorInfo = event.detail
  
  // 同じフィンガープリントの通知が既にある場合はスキップ
  if (notifications.value.some(n => n.originalError.fingerprint === errorInfo.fingerprint)) {
    return
  }

  // ユーザーフレンドリーなメッセージを生成
  const userMessage = userFriendlyMessages.generateUserMessage(errorInfo)

  addNotification({
    userMessage,
    originalError: errorInfo
  })
}

// 通知のアイコン
const getIcon = (userMessage: UserMessage) => {
  return userMessage.icon || getDefaultIcon(userMessage.severity)
}

const getDefaultIcon = (severity: UserMessage['severity']) => {
  switch (severity) {
    case 'critical':
      return '🚨'
    case 'error':
      return '⚠️'
    case 'warning':
      return 'ℹ️'
    case 'info':
      return '💡'
  }
}

// 通知の色
const getColorClass = (severity: UserMessage['severity']) => {
  switch (severity) {
    case 'critical':
      return 'notification-critical'
    case 'error':
      return 'notification-error'
    case 'warning':
      return 'notification-warning'
    case 'info':
      return 'notification-info'
  }
}

// 通知のアクションを実行
const executeAction = (notification: ErrorNotification) => {
  const { actionType, actionData } = notification.userMessage
  
  switch (actionType) {
    case 'reload':
      window.location.reload()
      break
    case 'retry':
      // リトライロジック（カスタムイベント）
      const retryEvent = new CustomEvent('app:retry-action', {
        detail: { errorId: actionData?.errorId, component: actionData?.component }
      })
      window.dispatchEvent(retryEvent)
      removeNotification(notification.id)
      break
    case 'navigate':
      if (actionData?.url) {
        window.location.href = actionData.url
      }
      break
    case 'contact':
      // サポート連絡フォームを開く
      const contactEvent = new CustomEvent('app:open-support', {
        detail: { errorInfo: notification.originalError }
      })
      window.dispatchEvent(contactEvent)
      break
    case 'close':
    default:
      removeNotification(notification.id)
      break
  }
}

// 詳細の表示/非表示を切り替え
const toggleDetails = (id: string) => {
  const notification = notifications.value.find(n => n.id === id)
  if (notification) {
    notification.isExpanded = !notification.isExpanded
  }
}

// ヘルプURLを開く
const openHelp = (helpUrl: string) => {
  window.open(helpUrl, '_blank', 'noopener,noreferrer')
}

// アニメーションのための計算プロパティ
const visibleNotifications = computed(() => 
  notifications.value.map((notification, index) => ({
    ...notification,
    offset: index * (notification.isExpanded ? 120 : 80),
    opacity: index < 3 ? 1 : 0.5
  }))
)

onMounted(() => {
  window.addEventListener('app:error', handleError as EventListener)
  
  // システムアラート用のリスナー
  window.addEventListener('app:system-alert', (event: CustomEvent) => {
    const { message } = event.detail
    addNotification({
      userMessage: {
        title: 'システムアラート',
        description: message,
        actionLabel: 'ページを再読み込み',
        actionType: 'reload',
        icon: '🚀',
        severity: 'critical',
        showDetails: false
      },
      originalError: {
        message,
        category: 'system',
        severity: 'critical',
        timestamp: Date.now(),
        userAgent: navigator.userAgent
      },
      autoHide: false
    })
  })
})

onUnmounted(() => {
  window.removeEventListener('app:error', handleError as EventListener)
  window.removeEventListener('app:system-alert', () => {})
})

// 外部からアクセス可能なメソッドを公開
defineExpose({
  addNotification,
  removeNotification,
  clearAll,
  executeAction,
  toggleDetails
})
</script>

<template>
  <Teleport to="body">
    <div class="error-notification-container" role="alert" aria-live="polite">
      <TransitionGroup name="notification" tag="div">
        <div
          v-for="(notification, index) in visibleNotifications"
          :key="notification.id"
          :class="['error-notification', getColorClass(notification.userMessage.severity), { 'expanded': notification.isExpanded }]"
          :style="{
            transform: `translateY(${notification.offset}px)`,
            opacity: notification.opacity,
            zIndex: 1000 - index
          }"
          role="alertdialog"
          :aria-label="`${notification.userMessage.severity}エラー: ${notification.userMessage.title}`"
        >
          <div class="notification-content">
            <span class="notification-icon" aria-hidden="true">
              {{ getIcon(notification.userMessage) }}
            </span>
            
            <div class="notification-body">
              <h4 class="notification-title">{{ notification.userMessage.title }}</h4>
              <p class="notification-description">{{ notification.userMessage.description }}</p>
              
              <!-- メインアクション -->
              <div v-if="notification.userMessage.actionLabel" class="notification-actions">
                <button
                  @click="executeAction(notification)"
                  class="notification-action-btn primary"
                >
                  {{ notification.userMessage.actionLabel }}
                </button>
                
                <!-- ヘルプリンク -->
                <button
                  v-if="notification.userMessage.helpUrl"
                  @click="openHelp(notification.userMessage.helpUrl!)"
                  class="notification-action-btn secondary small"
                >
                  ヘルプ
                </button>
                
                <!-- 詳細表示トグル -->
                <button
                  v-if="notification.userMessage.showDetails"
                  @click="toggleDetails(notification.id)"
                  class="notification-action-btn secondary small"
                >
                  {{ notification.isExpanded ? '詳細を隠す' : '詳細を表示' }}
                </button>
              </div>
              
              <!-- 詳細情報（開発者向け） -->
              <div v-if="notification.isExpanded && notification.userMessage.showDetails" class="notification-details">
                <div class="detail-section">
                  <strong>エラーメッセージ:</strong>
                  <code>{{ notification.originalError.message }}</code>
                </div>
                
                <div v-if="notification.originalError.component" class="detail-section">
                  <strong>コンポーネント:</strong>
                  <code>{{ notification.originalError.component }}</code>
                </div>
                
                <div class="detail-section">
                  <strong>カテゴリ:</strong>
                  <span class="detail-tag">{{ notification.originalError.category }}</span>
                  <strong>深刻度:</strong>
                  <span class="detail-tag">{{ notification.originalError.severity }}</span>
                </div>
                
                <div v-if="notification.originalError.context?.route" class="detail-section">
                  <strong>ページ:</strong>
                  <code>{{ notification.originalError.context.route }}</code>
                </div>
                
                <div class="detail-section">
                  <strong>時刻:</strong>
                  {{ new Date(notification.originalError.timestamp).toLocaleString() }}
                </div>
              </div>
            </div>
            
            <button
              @click="removeNotification(notification.id)"
              class="notification-close"
              :aria-label="`通知を閉じる: ${notification.userMessage.title}`"
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

.notification-title {
  color: rgba(255, 255, 255, 0.95);
  font-size: var(--text-base);
  font-weight: 600;
  line-height: 1.4;
  margin: 0 0 var(--space-xs) 0;
}

.notification-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: var(--text-sm);
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

.notification-action-btn.primary {
  background: rgba(59, 130, 246, 0.8);
  border-color: rgba(59, 130, 246, 1);
}

.notification-action-btn.primary:hover {
  background: rgba(59, 130, 246, 1);
  transform: translateY(-1px);
}

.notification-action-btn.secondary {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.3);
}

.notification-action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.5);
}

.notification-action-btn.small {
  padding: var(--space-2xs) var(--space-xs);
  font-size: var(--text-xs);
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

/* 詳細情報スタイル */
.notification-details {
  margin-top: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-section {
  margin-bottom: var(--space-xs);
  font-size: var(--text-xs);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section strong {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
  margin-right: var(--space-xs);
}

.detail-section code {
  background: rgba(0, 0, 0, 0.5);
  padding: 2px var(--space-xs);
  border-radius: 3px;
  font-family: monospace;
  font-size: var(--text-2xs);
  color: rgba(255, 255, 255, 0.8);
}

.detail-tag {
  display: inline-block;
  background: rgba(59, 130, 246, 0.2);
  color: rgba(59, 130, 246, 1);
  padding: 1px var(--space-xs);
  border-radius: 3px;
  font-size: var(--text-2xs);
  font-weight: 500;
  margin-right: var(--space-xs);
}

/* 拡張状態 */
.error-notification.expanded {
  min-height: 120px;
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
  animation: pulse-critical 2s infinite;
}

.notification-critical .notification-icon {
  color: rgba(239, 68, 68, 1);
}

.notification-critical .notification-progress {
  color: rgba(239, 68, 68, 0.6);
}

.notification-error {
  border-left: 4px solid rgba(245, 158, 11, 1);
}

.notification-error .notification-icon {
  color: rgba(245, 158, 11, 1);
}

.notification-error .notification-progress {
  color: rgba(245, 158, 11, 0.6);
}

.notification-warning {
  border-left: 4px solid rgba(59, 130, 246, 1);
}

.notification-warning .notification-icon {
  color: rgba(59, 130, 246, 1);
}

.notification-warning .notification-progress {
  color: rgba(59, 130, 246, 0.6);
}

.notification-info {
  border-left: 4px solid rgba(156, 163, 175, 1);
}

.notification-info .notification-icon {
  color: rgba(156, 163, 175, 1);
}

.notification-info .notification-progress {
  color: rgba(156, 163, 175, 0.6);
}

@keyframes pulse-critical {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.3); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
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
  
  .notification-title {
    font-size: var(--text-sm);
  }
  
  .notification-description {
    font-size: var(--text-xs);
  }
  
  .notification-actions {
    flex-direction: column;
    gap: var(--space-xs);
  }
  
  .notification-action-btn {
    width: 100%;
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