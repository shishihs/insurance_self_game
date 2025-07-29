<template>
  <div class="feedback-button-container">
    <!-- フローティングアクションボタン -->
    <button
      v-if="!isExpanded"
      @click="expand"
      class="feedback-fab"
      :class="{ 'has-notifications': hasUnreadNotifications }"
      aria-label="フィードバックを送信"
      title="フィードバック・レビュー・バグ報告"
    >
      <div class="fab-icon">💬</div>
      <div v-if="hasUnreadNotifications" class="notification-badge">
        {{ unreadCount }}
      </div>
    </button>

    <!-- 展開されたメニュー -->
    <div v-else class="feedback-menu" @click.stop>
      <div class="menu-header">
        <h3 class="menu-title">フィードバック</h3>
        <button
          @click="collapse"
          class="menu-close-btn"
          aria-label="メニューを閉じる"
        >
          ×
        </button>
      </div>

      <div class="menu-content">
        <!-- クイックアクション -->
        <div class="quick-actions">
          <button
            v-for="action in quickActions"
            :key="action.id"
            @click="handleQuickAction(action)"
            class="quick-action-btn"
            :class="{ 'high-priority': action.priority === 'high' }"
          >
            <div class="action-icon" :style="{ color: action.color }">
              {{ action.icon }}
            </div>
            <div class="action-content">
              <div class="action-title">{{ action.title }}</div>
              <div class="action-subtitle">{{ action.subtitle }}</div>
            </div>
          </button>
        </div>

        <!-- コンテキスト情報 -->
        <div v-if="gameContext" class="context-info">
          <h4 class="context-title">現在の状況</h4>
          <div class="context-details">
            <div class="context-item">
              <span class="context-label">ステージ:</span>
              <span class="context-value">{{ getStageLabel(gameContext.stage) }}</span>
            </div>
            <div class="context-item">
              <span class="context-label">ターン:</span>
              <span class="context-value">{{ gameContext.turn }}</span>
            </div>
            <div class="context-item">
              <span class="context-label">活力:</span>
              <span class="context-value">{{ gameContext.vitality }}</span>
            </div>
          </div>
        </div>

        <!-- 最近のフィードバック -->
        <div v-if="recentFeedbacks.length > 0" class="recent-feedback">
          <h4 class="recent-title">最近の送信履歴</h4>
          <div class="recent-list">
            <div
              v-for="feedback in recentFeedbacks.slice(0, 3)"
              :key="feedback.id"
              class="recent-item"
            >
              <div class="recent-icon">{{ getCategoryIcon(feedback.category) }}</div>
              <div class="recent-content">
                <div class="recent-title-text">{{ feedback.title }}</div>
                <div class="recent-meta">
                  {{ getRelativeTime(feedback.createdAt) }} • {{ getStatusLabel(feedback.status) }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 統計情報 -->
        <div v-if="showStats && feedbackStats" class="feedback-stats">
          <h4 class="stats-title">フィードバック統計</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ feedbackStats.total }}</div>
              <div class="stat-label">総数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ feedbackStats.resolvedCount }}</div>
              <div class="stat-label">解決済み</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ feedbackStats.averageSatisfactionRating?.toFixed(1) || 'N/A' }}</div>
              <div class="stat-label">満足度</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- オーバーレイ -->
    <div
      v-if="isExpanded"
      class="feedback-overlay"
      @click="collapse"
    ></div>

    <!-- モーダル -->
    <FeedbackModal
      :is-open="showFeedbackModal"
      :game-state="gameContext"
      @close="showFeedbackModal = false"
      @feedback-submitted="handleFeedbackSubmitted"
    />

    <ReviewSystem
      v-if="showReviewModal"
      :mode="reviewMode"
      :game-state="gameContext"
      @review-submitted="handleReviewSubmitted"
      @mode-changed="reviewMode = $event"
      class="review-modal"
    />

    <div v-if="showBugReporter" class="bug-reporter-modal">
      <div class="modal-overlay" @click="showBugReporter = false">
        <div class="modal-content" @click.stop>
          <BugReporter
            :game-state="gameContext"
            @bug-reported="handleBugReported"
            @close="showBugReporter = false"
          />
        </div>
      </div>
    </div>

    <!-- 通知トースト -->
    <div v-if="showToast" class="feedback-toast" :class="`toast-${toastType}`">
      <div class="toast-icon">{{ getToastIcon(toastType) }}</div>
      <div class="toast-content">
        <div class="toast-title">{{ toastTitle }}</div>
        <div class="toast-message">{{ toastMessage }}</div>
      </div>
      <button @click="hideToast" class="toast-close">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import FeedbackModal from './FeedbackModal.vue'
import ReviewSystem from './ReviewSystem.vue'
import BugReporter from './BugReporter.vue'
import { FeedbackManagementService, type FeedbackStatistics } from '../../domain/services/FeedbackManagementService'
import { FeedbackCategory, FeedbackStatus } from '../../domain/entities/Feedback'

// Props
interface Props {
  gameState?: {
    stage: string
    turn: number
    vitality: number
    phase: string
  }
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  showStats?: boolean
  autoSurvey?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  position: 'bottom-right',
  showStats: false,
  autoSurvey: true
})

// Emits
const emit = defineEmits<{
  feedbackSubmitted: [feedbackId: string, type: string]
}>()

// Services
const feedbackService = new FeedbackManagementService()

// State
const isExpanded = ref(false)
const showFeedbackModal = ref(false)
const showReviewModal = ref(false)
const showBugReporter = ref(false)
const reviewMode = ref<'quick' | 'detailed'>('quick')
const recentFeedbacks = ref<any[]>([])
const feedbackStats = ref<FeedbackStatistics | null>(null)
const gameContext = ref(props.gameState)

// Toast notifications
const showToast = ref(false)
const toastType = ref<'success' | 'info' | 'warning' | 'error'>('success')
const toastTitle = ref('')
const toastMessage = ref('')
let toastTimeout: number | null = null

// Quick Actions
const quickActions = [
  {
    id: 'review',
    title: '評価・レビュー',
    subtitle: 'ゲームの感想を教えてください',
    icon: '⭐',
    color: '#F59E0B',
    priority: 'normal'
  },
  {
    id: 'bug',
    title: 'バグ報告',
    subtitle: '問題や不具合を報告',
    icon: '🐛',
    color: '#EF4444',
    priority: 'high'
  },
  {
    id: 'feature',
    title: '機能要望',
    subtitle: '新機能のアイデアを提案',
    icon: '💡',
    color: '#3B82F6',
    priority: 'normal'
  },
  {
    id: 'general',
    title: 'その他',
    subtitle: 'ご質問・ご意見など',
    icon: '💬',
    color: '#8B5CF6',
    priority: 'normal'
  }
]

// Computed
const hasUnreadNotifications = computed(() => {
  // 実際の実装では未読通知の状態を管理
  return false
})

const unreadCount = computed(() => {
  // 実際の実装では未読通知数を計算
  return 0
})

// Methods
const expand = () => {
  isExpanded.value = true
  loadRecentFeedbacks()
  if (props.showStats) {
    loadFeedbackStats()
  }
}

const collapse = () => {
  isExpanded.value = false
}

const handleQuickAction = (action: any) => {
  collapse()
  
  switch (action.id) {
    case 'review':
      showReviewModal.value = true
      break
    case 'bug':
      showBugReporter.value = true
      break
    default:
      showFeedbackModal.value = true
      break
  }
}

const handleFeedbackSubmitted = (feedbackId: string) => {
  showFeedbackModal.value = false
  showSuccessToast('フィードバックを送信しました', 'ご意見をありがとうございます')
  emit('feedbackSubmitted', feedbackId, 'general')
  loadRecentFeedbacks()
}

const handleReviewSubmitted = (reviewId: string) => {
  showReviewModal.value = false
  showSuccessToast('レビューを送信しました', 'ご評価をありがとうございます')
  emit('feedbackSubmitted', reviewId, 'review')
  loadRecentFeedbacks()
}

const handleBugReported = (reportId: string) => {
  showBugReporter.value = false
  showSuccessToast('バグレポートを送信しました', `レポートID: ${  reportId.substring(0, 8)}`)
  emit('feedbackSubmitted', reportId, 'bug')
  loadRecentFeedbacks()
}

const loadRecentFeedbacks = () => {
  try {
    const feedbacks = feedbackService.searchFeedbacks({
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7日前から
        end: new Date()
      }
    })
    recentFeedbacks.value = feedbacks.slice(0, 5)
  } catch (error) {
    console.error('Failed to load recent feedbacks:', error)
  }
}

const loadFeedbackStats = () => {
  try {
    feedbackStats.value = feedbackService.getStatistics()
  } catch (error) {
    console.error('Failed to load feedback stats:', error)
  }
}

const getStageLabel = (stage: string): string => {
  const labels: Record<string, string> = {
    youth: '青年期',
    middle: '中年期',
    senior: '充実期'
  }
  return labels[stage] || stage
}

const getCategoryIcon = (category: FeedbackCategory): string => {
  const icons: Record<FeedbackCategory, string> = {
    [FeedbackCategory.BUG_REPORT]: '🐛',
    [FeedbackCategory.FEATURE_REQUEST]: '💡',
    [FeedbackCategory.UI_UX]: '🎨',
    [FeedbackCategory.GAMEPLAY]: '🎮',
    [FeedbackCategory.PERFORMANCE]: '⚡',
    [FeedbackCategory.ACCESSIBILITY]: '♿',
    [FeedbackCategory.GENERAL]: '💬'
  }
  return icons[category] || '📝'
}

const getStatusLabel = (status: FeedbackStatus): string => {
  const labels: Record<FeedbackStatus, string> = {
    [FeedbackStatus.SUBMITTED]: '提出済み',
    [FeedbackStatus.UNDER_REVIEW]: '確認中',
    [FeedbackStatus.IN_PROGRESS]: '対応中',
    [FeedbackStatus.RESOLVED]: '解決済み',
    [FeedbackStatus.CLOSED]: '完了'
  }
  return labels[status] || status
}

const getRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'たった今'
  if (diffMins < 60) return `${diffMins}分前`
  if (diffHours < 24) return `${diffHours}時間前`
  if (diffDays < 7) return `${diffDays}日前`
  return date.toLocaleDateString('ja-JP')
}

const showSuccessToast = (title: string, message: string) => {
  showToast.value = true
  toastType.value = 'success'
  toastTitle.value = title
  toastMessage.value = message
  
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }
  toastTimeout = window.setTimeout(() => {
    hideToast()
  }, 5000)
}

const showErrorToast = (title: string, message: string) => {
  showToast.value = true
  toastType.value = 'error'
  toastTitle.value = title
  toastMessage.value = message
  
  if (toastTimeout) {
    clearTimeout(toastTimeout)
  }
  toastTimeout = window.setTimeout(() => {
    hideToast()
  }, 7000)
}

const hideToast = () => {
  showToast.value = false
  if (toastTimeout) {
    clearTimeout(toastTimeout)
    toastTimeout = null
  }
}

const getToastIcon = (type: string): string => {
  const icons = {
    success: '✅',
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌'
  }
  return icons[type as keyof typeof icons] || 'ℹ️'
}

// 自動満足度調査
const checkAutoSurvey = () => {
  if (!props.autoSurvey || !gameContext.value) return

  // 特定の条件で自動的に満足度調査を表示
  // 例：ゲーム終了時、一定ターン経過時など
  const shouldShowSurvey = 
    gameContext.value.turn > 10 && 
    gameContext.value.turn % 20 === 0 && // 20ターンごと
    Math.random() < 0.3 // 30%の確率

  if (shouldShowSurvey) {
    setTimeout(() => {
      reviewMode.value = 'quick'
      showReviewModal.value = true
    }, 2000) // 2秒後に表示
  }
}

// Lifecycle
onMounted(() => {
  // ゲーム状態の変化を監視
  if (props.gameState) {
    gameContext.value = props.gameState
  }

  // 初回データ読み込み
  loadRecentFeedbacks()

  // 自動調査チェック
  checkAutoSurvey()

  // ESCキーでメニューを閉じる
  const handleEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && isExpanded.value) {
      collapse()
    }
  }
  document.addEventListener('keydown', handleEscape)

  // クリーンアップ用に記録
  onUnmounted(() => {
    document.removeEventListener('keydown', handleEscape)
    if (toastTimeout) {
      clearTimeout(toastTimeout)
    }
  })
})

// ゲーム状態の更新を監視
const updateGameContext = (newState: any) => {
  gameContext.value = newState
  checkAutoSurvey()
}

// 外部から呼び出し可能な公開メソッド
defineExpose({
  expand,
  collapse,
  showReview: () => { showReviewModal.value = true },
  showBugReport: () => { showBugReporter.value = true },
  showFeedback: () => { showFeedbackModal.value = true },
  updateGameContext
})
</script>

<style scoped>
/* =================================
   フィードバックボタンベース
   ================================= */

.feedback-button-container {
  position: fixed;
  z-index: 1000;
}

/* ポジション設定 */
.feedback-button-container {
  bottom: var(--space-lg);
  right: var(--space-lg);
}

/* =================================
   フローティングアクションボタン
   ================================= */

.feedback-fab {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary-gradient);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.4);
  transition: all var(--transition-normal);
  backdrop-filter: blur(8px);
}

.feedback-fab:hover {
  transform: translateY(-4px) scale(1.1);
  box-shadow: 0 12px 40px rgba(129, 140, 248, 0.5);
}

.feedback-fab.has-notifications {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.fab-icon {
  font-size: 1.5rem;
  color: white;
}

.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #EF4444;
  color: white;
  font-size: var(--text-xs);
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
}

/* =================================
   展開メニュー
   ================================= */

.feedback-menu {
  position: absolute;
  bottom: 80px;
  right: 0;
  width: 320px;
  max-height: 500px;
  background: var(--bg-primary);
  border-radius: 16px;
  border: 1px solid rgba(129, 140, 248, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(12px);
  overflow: hidden;
  animation: menuSlideIn 0.3s ease-out;
}

@keyframes menuSlideIn {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-md) var(--space-lg);
  background: rgba(129, 140, 248, 0.1);
  border-bottom: 1px solid rgba(129, 140, 248, 0.2);
}

.menu-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin: 0;
}

.menu-close-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  transition: all var(--transition-fast);
}

.menu-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 1);
}

.menu-content {
  padding: var(--space-lg);
  max-height: 400px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

/* =================================
   クイックアクション
   ================================= */

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.quick-action-btn {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;
}

.quick-action-btn:hover {
  border-color: rgba(129, 140, 248, 0.5);
  background: rgba(129, 140, 248, 0.1);
  transform: translateY(-2px);
}

.quick-action-btn.high-priority {
  border-color: rgba(239, 68, 68, 0.3);
}

.quick-action-btn.high-priority:hover {
  border-color: rgba(239, 68, 68, 0.6);
  background: rgba(239, 68, 68, 0.1);
}

.action-icon {
  font-size: var(--text-xl);
  width: 32px;
  text-align: center;
  flex-shrink: 0;
}

.action-content {
  flex: 1;
}

.action-title {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: var(--space-xs);
}

.action-subtitle {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

/* =================================
   コンテキスト情報
   ================================= */

.context-info {
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(129, 140, 248, 0.1);
}

.context-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 var(--space-sm) 0;
}

.context-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.context-item {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
}

.context-label {
  color: rgba(255, 255, 255, 0.6);
}

.context-value {
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

/* =================================
   最近のフィードバック
   ================================= */

.recent-feedback {
  border-top: 1px solid rgba(129, 140, 248, 0.1);
  padding-top: var(--space-md);
}

.recent-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 var(--space-sm) 0;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.recent-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.recent-icon {
  font-size: var(--text-base);
  width: 24px;
  text-align: center;
  flex-shrink: 0;
}

.recent-content {
  flex: 1;
  min-width: 0;
}

.recent-title-text {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.recent-meta {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
}

/* =================================
   統計情報
   ================================= */

.feedback-stats {
  border-top: 1px solid rgba(129, 140, 248, 0.1);
  padding-top: var(--space-md);
}

.stats-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 var(--space-sm) 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-sm);
}

.stat-item {
  text-align: center;
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.stat-value {
  font-size: var(--text-lg);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin-bottom: 2px;
}

.stat-label {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
}

/* =================================
   オーバーレイ
   ================================= */

.feedback-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: -1;
}

/* =================================
   モーダル
   ================================= */

.review-modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1100;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.bug-reporter-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1100;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

/* =================================
   トースト通知
   ================================= */

.feedback-toast {
  position: fixed;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: 1200;
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md) var(--space-lg);
  background: var(--bg-primary);
  border-radius: 8px;
  border-left: 4px solid;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
  max-width: 400px;
  animation: toastSlideIn 0.3s ease-out;
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.toast-success {
  border-left-color: #10B981;
}

.toast-error {
  border-left-color: #EF4444;
}

.toast-warning {
  border-left-color: #F59E0B;
}

.toast-info {
  border-left-color: #3B82F6;
}

.toast-icon {
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-title {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: var(--space-xs);
}

.toast-message {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
}

.toast-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: var(--space-xs);
  font-size: var(--text-lg);
  line-height: 1;
  flex-shrink: 0;
}

.toast-close:hover {
  color: rgba(255, 255, 255, 0.9);
}

/* =================================
   レスポンシブ
   ================================= */

@media (max-width: 768px) {
  .feedback-button-container {
    bottom: var(--space-md);
    right: var(--space-md);
  }

  .feedback-menu {
    width: 280px;
    bottom: 70px;
    right: -20px;
  }

  .feedback-toast {
    top: var(--space-md);
    right: var(--space-md);
    left: var(--space-md);
    max-width: none;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .feedback-fab {
    width: 56px;
    height: 56px;
  }

  .feedback-menu {
    width: calc(100vw - 2 * var(--space-md));
    right: 0;
    left: var(--space-md);
    bottom: 70px;
  }

  .modal-content {
    margin: var(--space-sm);
  }
}

/* =================================
   アクセシビリティ
   ================================= */

@media (prefers-reduced-motion: reduce) {
  .feedback-fab,
  .quick-action-btn,
  .feedback-toast {
    transition: none;
    animation: none;
  }

  .feedback-fab:hover,
  .quick-action-btn:hover {
    transform: none;
  }

  .feedback-fab.has-notifications {
    animation: none;
  }
}

.feedback-fab:focus,
.quick-action-btn:focus,
.menu-close-btn:focus,
.toast-close:focus {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

/* ハイコントラストモード */
@media (prefers-contrast: high) {
  .feedback-menu {
    border: 2px solid white;
    background: #000;
  }

  .quick-action-btn {
    border: 2px solid white;
  }

  .feedback-toast {
    border: 2px solid white;
    background: #000;
  }
}
</style>