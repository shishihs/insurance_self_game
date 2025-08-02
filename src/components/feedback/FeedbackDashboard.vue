<template>
  <div class="feedback-dashboard">
    <!-- ダッシュボードヘッダー -->
    <div class="dashboard-header">
      <div class="header-content">
        <h1 class="dashboard-title">フィードバック管理ダッシュボード</h1>
        <p class="dashboard-subtitle">
          ユーザーからのフィードバック、レビュー、バグレポートを一元管理
        </p>
      </div>
      <div class="header-actions">
        <button @click="refreshData" class="refresh-btn" :disabled="isLoading">
          <span v-if="isLoading">🔄</span>
          <span v-else>↻</span>
          更新
        </button>
        <button @click="exportData" class="export-btn">
          📊 エクスポート
        </button>
      </div>
    </div>

    <!-- 統計カード -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats?.total || 0 }}</div>
          <div class="stat-label">総フィードバック数</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⭐</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats?.averageSatisfactionRating?.toFixed(1) || 'N/A' }}</div>
          <div class="stat-label">平均満足度</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats?.resolvedCount || 0 }}</div>
          <div class="stat-label">解決済み</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats?.responseTime.average.toFixed(1) || 'N/A' }}h</div>
          <div class="stat-label">平均応答時間</div>
        </div>
      </div>
    </div>

    <!-- フィルター -->
    <div class="filters-section">
      <div class="filters-header">
        <h2 class="filters-title">フィルター</h2>
        <button @click="clearFilters" class="clear-filters-btn">
          クリア
        </button>
      </div>
      
      <div class="filters-grid">
        <div class="filter-group">
          <label class="filter-label">カテゴリ</label>
          <select v-model="filters.category" class="filter-select">
            <option value="">すべて</option>
            <option value="bug_report">バグ報告</option>
            <option value="feature_request">機能要望</option>
            <option value="ui_ux">UI/UX</option>
            <option value="gameplay">ゲームプレイ</option>
            <option value="performance">パフォーマンス</option>
            <option value="accessibility">アクセシビリティ</option>
            <option value="general">一般</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">ステータス</label>
          <select v-model="filters.status" class="filter-select">
            <option value="">すべて</option>
            <option value="submitted">提出済み</option>
            <option value="under_review">確認中</option>
            <option value="in_progress">対応中</option>
            <option value="resolved">解決済み</option>
            <option value="closed">完了</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">優先度</label>
          <select v-model="filters.priority" class="filter-select">
            <option value="">すべて</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
            <option value="critical">緊急</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">期間</label>
          <select v-model="filters.dateRange" class="filter-select" @change="updateDateRange">
            <option value="">すべて</option>
            <option value="today">今日</option>
            <option value="week">過去1週間</option>
            <option value="month">過去1ヶ月</option>
            <option value="quarter">過去3ヶ月</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label class="filter-label">検索</label>
          <input
            v-model="filters.search"
            type="text"
            class="filter-input"
            placeholder="タイトルや説明で検索..."
          />
        </div>
      </div>
    </div>

    <!-- フィードバックリスト -->
    <div class="feedback-list-section">
      <div class="list-header">
        <h2 class="list-title">
          フィードバック一覧 ({{ filteredFeedbacks.length }}件)
        </h2>
        <div class="list-controls">
          <select v-model="sortBy" class="sort-select">
            <option value="createdAt">作成日時</option>
            <option value="updatedAt">更新日時</option>
            <option value="priority">優先度</option>
            <option value="status">ステータス</option>
          </select>
          <button @click="toggleSortOrder" class="sort-order-btn">
            {{ sortOrder === 'desc' ? '↓' : '↑' }}
          </button>
        </div>
      </div>

      <div v-if="isLoading" class="loading-state">
        <div class="loading-spinner">🔄</div>
        <p>データを読み込んでいます...</p>
      </div>

      <div v-else-if="filteredFeedbacks.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3 class="empty-title">フィードバックが見つかりません</h3>
        <p class="empty-message">
          フィルター条件を変更するか、ユーザーからのフィードバックをお待ちください。
        </p>
      </div>

      <div v-else class="feedback-items">
        <div
          v-for="feedback in paginatedFeedbacks"
          :key="feedback.id"
          class="feedback-item"
          :class="`priority-${feedback.priority}`"
          @click="selectFeedback(feedback)"
        >
          <div class="feedback-header">
            <div class="feedback-meta">
              <span class="feedback-category">{{ getCategoryLabel(feedback.category) }}</span>
              <span class="feedback-id">ID: {{ feedback.id.substring(0, 8) }}</span>
            </div>
            <div class="feedback-badges">
              <span class="status-badge" :class="`status-${feedback.status}`">
                {{ getStatusLabel(feedback.status) }}
              </span>
              <span class="priority-badge" :class="`priority-${feedback.priority}`">
                {{ getPriorityLabel(feedback.priority) }}
              </span>
            </div>
          </div>
          
          <div class="feedback-content">
            <h3 class="feedback-title">{{ feedback.title }}</h3>
            <p class="feedback-description">{{ feedback.description }}</p>
            
            <div v-if="feedback.bugReportData" class="bug-details">
              <span class="bug-severity">重要度: {{ feedback.bugReportData.severity }}</span>
              <span class="bug-frequency">頻度: {{ feedback.bugReportData.reproductionRate }}</span>
            </div>
            
            <div v-if="feedback.reviewData" class="review-details">
              <div class="review-rating">
                <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= feedback.reviewData.overallRating }">
                  ★
                </span>
                <span class="rating-text">({{ feedback.reviewData.overallRating }}/5)</span>
              </div>
              <span v-if="feedback.reviewData.wouldRecommend" class="recommend-badge">推奨</span>
            </div>
          </div>
          
          <div class="feedback-footer">
            <div class="feedback-info">
              <span class="feedback-date">{{ formatDate(feedback.createdAt) }}</span>
              <span v-if="!feedback.submitter.isAnonymous && feedback.submitter.email" class="feedback-contact">
                {{ feedback.submitter.email }}
              </span>
              <span v-else class="feedback-anonymous">匿名</span>
            </div>
            <div class="feedback-actions">
              <button @click.stop="updateStatus(feedback)" class="action-btn">
                ステータス変更
              </button>
              <button @click.stop="addNote(feedback)" class="action-btn">
                メモ追加
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ページネーション -->
      <div v-if="totalPages > 1" class="pagination">
        <button
          @click="currentPage = Math.max(1, currentPage - 1)"
          :disabled="currentPage === 1"
          class="pagination-btn"
        >
          前へ
        </button>
        
        <div class="pagination-info">
          {{ currentPage }} / {{ totalPages }} ページ
        </div>
        
        <button
          @click="currentPage = Math.min(totalPages, currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="pagination-btn"
        >
          次へ
        </button>
      </div>
    </div>

    <!-- 詳細モーダル -->
    <div v-if="selectedFeedback" class="feedback-modal" @click="closeFeedbackModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ selectedFeedback.title }}</h2>
          <button @click="closeFeedbackModal" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="feedback-details">
            <div class="detail-section">
              <h3 class="detail-title">基本情報</h3>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">ID:</span>
                  <span class="detail-value">{{ selectedFeedback.id }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">カテゴリ:</span>
                  <span class="detail-value">{{ getCategoryLabel(selectedFeedback.category) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">ステータス:</span>
                  <span class="detail-value">{{ getStatusLabel(selectedFeedback.status) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">優先度:</span>
                  <span class="detail-value">{{ getPriorityLabel(selectedFeedback.priority) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">作成日時:</span>
                  <span class="detail-value">{{ formatDateTime(selectedFeedback.createdAt) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">更新日時:</span>
                  <span class="detail-value">{{ formatDateTime(selectedFeedback.updatedAt) }}</span>
                </div>
              </div>
            </div>
            
            <div class="detail-section">
              <h3 class="detail-title">説明</h3>
              <p class="detail-description">{{ selectedFeedback.description }}</p>
            </div>
            
            <div v-if="selectedFeedback.bugReportData" class="detail-section">
              <h3 class="detail-title">バグレポート詳細</h3>
              <div class="bug-report-details">
                <div class="detail-item">
                  <span class="detail-label">重要度:</span>
                  <span class="detail-value">{{ selectedFeedback.bugReportData.severity }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">再現頻度:</span>
                  <span class="detail-value">{{ selectedFeedback.bugReportData.reproductionRate }}</span>
                </div>
                <div v-if="selectedFeedback.bugReportData.stepsToReproduce.length > 0" class="reproduction-steps">
                  <h4 class="steps-title">再現手順:</h4>
                  <ol class="steps-list">
                    <li v-for="step in selectedFeedback.bugReportData.stepsToReproduce" :key="step" class="step-item">
                      {{ step }}
                    </li>
                  </ol>
                </div>
                <div v-if="selectedFeedback.bugReportData.expectedBehavior" class="expected-behavior">
                  <h4 class="behavior-title">期待される動作:</h4>
                  <p class="behavior-text">{{ selectedFeedback.bugReportData.expectedBehavior }}</p>
                </div>
                <div v-if="selectedFeedback.bugReportData.actualBehavior" class="actual-behavior">
                  <h4 class="behavior-title">実際の動作:</h4>
                  <p class="behavior-text">{{ selectedFeedback.bugReportData.actualBehavior }}</p>
                </div>
              </div>
            </div>
            
            <div v-if="selectedFeedback.reviewData" class="detail-section">
              <h3 class="detail-title">レビュー詳細</h3>
              <div class="review-details-full">
                <div class="review-ratings">
                  <div class="rating-item">
                    <span class="rating-label">総合評価:</span>
                    <div class="rating-stars">
                      <span v-for="star in 5" :key="star" class="star" :class="{ filled: star <= selectedFeedback.reviewData.overallRating }">
                        ★
                      </span>
                      <span class="rating-value">({{ selectedFeedback.reviewData.overallRating }}/5)</span>
                    </div>
                  </div>
                  <div class="aspect-ratings">
                    <div v-for="(value, aspect) in selectedFeedback.reviewData.aspects" :key="aspect" class="aspect-item">
                      <span class="aspect-label">{{ getAspectLabel(aspect) }}:</span>
                      <div class="aspect-stars">
                        <span v-for="star in 5" :key="star" class="star small" :class="{ filled: star <= value }">
                          ★
                        </span>
                        <span class="aspect-value">({{ value }}/5)</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="recommendation-status">
                  <span class="recommendation-label">推奨度:</span>
                  <span class="recommendation-value" :class="{ positive: selectedFeedback.reviewData.wouldRecommend }">
                    {{ selectedFeedback.reviewData.wouldRecommend ? '推奨する' : '推奨しない' }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="detail-section">
              <h3 class="detail-title">システム情報</h3>
              <div class="system-info">
                <div class="detail-item">
                  <span class="detail-label">ユーザーエージェント:</span>
                  <span class="detail-value">{{ selectedFeedback.systemInfo.userAgent }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">画面解像度:</span>
                  <span class="detail-value">{{ selectedFeedback.systemInfo.screenResolution }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">ビューポート:</span>
                  <span class="detail-value">{{ selectedFeedback.systemInfo.viewport }}</span>
                </div>
                <div v-if="selectedFeedback.systemInfo.gameState" class="detail-item">
                  <span class="detail-label">ゲーム状態:</span>
                  <span class="detail-value">
                    {{ selectedFeedback.systemInfo.gameState.stage }} - Turn {{ selectedFeedback.systemInfo.gameState.turn }}
                  </span>
                </div>
              </div>
            </div>
            
            <div v-if="selectedFeedback.tags && selectedFeedback.tags.length > 0" class="detail-section">
              <h3 class="detail-title">タグ</h3>
              <div class="tags-list">
                <span v-for="tag in selectedFeedback.tags" :key="tag" class="tag">
                  {{ tag }}
                </span>
              </div>
            </div>
            
            <div v-if="selectedFeedback.adminNotes && selectedFeedback.adminNotes.length > 0" class="detail-section">
              <h3 class="detail-title">管理者メモ</h3>
              <div class="admin-notes">
                <div v-for="note in selectedFeedback.adminNotes" :key="note" class="admin-note">
                  {{ note }}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="downloadFeedback" class="btn-secondary">
            ダウンロード
          </button>
          <button @click="closeFeedbackModal" class="btn-primary">
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { type FeedbackFilter, FeedbackManagementService, type FeedbackStatistics } from '../../domain/services/FeedbackManagementService'
import { type Feedback, FeedbackCategory, FeedbackPriority, FeedbackStatus } from '../../domain/entities/Feedback'

// Services
const feedbackService = new FeedbackManagementService()

// State
const isLoading = ref(false)
const allFeedbacks = ref<Feedback[]>([])
const stats = ref<FeedbackStatistics | null>(null)
const selectedFeedback = ref<Feedback | null>(null)
const currentPage = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<string>('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

// Filters
const filters = ref({
  category: '',
  status: '',
  priority: '',
  dateRange: '',
  search: ''
})

// Computed
const filteredFeedbacks = computed(() => {
  let feedbacks = [...allFeedbacks.value]
  
  // フィルター適用
  if (filters.value.category) {
    feedbacks = feedbacks.filter(f => f.category === filters.value.category)
  }
  
  if (filters.value.status) {
    feedbacks = feedbacks.filter(f => f.status === filters.value.status)
  }
  
  if (filters.value.priority) {
    feedbacks = feedbacks.filter(f => f.priority === filters.value.priority)
  }
  
  if (filters.value.search) {
    const query = filters.value.search.toLowerCase()
    feedbacks = feedbacks.filter(f => 
      f.title.toLowerCase().includes(query) ||
      f.description.toLowerCase().includes(query)
    )
  }
  
  // ソート
  feedbacks.sort((a, b) => {
    let aValue: any
    let bValue: any
    
    switch (sortBy.value) {
      case 'createdAt':
        aValue = a.createdAt.getTime()
        bValue = b.createdAt.getTime()
        break
      case 'updatedAt':
        aValue = a.updatedAt.getTime()
        bValue = b.updatedAt.getTime()
        break
      case 'priority':
        const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 }
        aValue = priorityOrder[a.priority as keyof typeof priorityOrder]
        bValue = priorityOrder[b.priority as keyof typeof priorityOrder]
        break
      case 'status':
        const statusOrder = { submitted: 1, under_review: 2, in_progress: 3, resolved: 4, closed: 5 }
        aValue = statusOrder[a.status as keyof typeof statusOrder]
        bValue = statusOrder[b.status as keyof typeof statusOrder]
        break
      default:
        aValue = a.createdAt.getTime()
        bValue = b.createdAt.getTime()
    }
    
    if (sortOrder.value === 'desc') {
      return bValue - aValue
    } 
      return aValue - bValue
    
  })
  
  return feedbacks
})

const totalPages = computed(() => Math.ceil(filteredFeedbacks.value.length / itemsPerPage.value))

const paginatedFeedbacks = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredFeedbacks.value.slice(start, end)
})

// Methods
const loadData = async () => {
  isLoading.value = true
  try {
    // フィードバックデータを読み込み
    allFeedbacks.value = feedbackService.getAllFeedbacks()
    
    // 統計データを読み込み
    stats.value = feedbackService.getStatistics()
  } catch (error) {
    console.error('Failed to load feedback data:', error)
  } finally {
    isLoading.value = false
  }
}

const refreshData = () => {
  loadData()
}

const exportData = () => {
  try {
    const data = feedbackService.exportFeedbacks()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `feedback_export_${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Failed to export feedback data:', error)
    alert('データのエクスポートに失敗しました。')
  }
}

const clearFilters = () => {
  filters.value = {
    category: '',
    status: '',
    priority: '',
    dateRange: '',
    search: ''
  }
  currentPage.value = 1
}

const updateDateRange = () => {
  // 日付範囲フィルターの実装は省略（実際の実装では日付計算を行う）
  currentPage.value = 1
}

const toggleSortOrder = () => {
  sortOrder.value = sortOrder.value === 'desc' ? 'asc' : 'desc'
}

const selectFeedback = (feedback: Feedback) => {
  selectedFeedback.value = feedback
}

const closeFeedbackModal = () => {
  selectedFeedback.value = null
}

const updateStatus = (feedback: Feedback) => {
  // ステータス更新の実装（実際にはモーダルを表示）
  const newStatus = prompt('新しいステータスを入力してください', feedback.status)
  if (newStatus && Object.values(FeedbackStatus).includes(newStatus as FeedbackStatus)) {
    feedbackService.updateFeedbackStatus(feedback.id, newStatus as FeedbackStatus)
    loadData()
  }
}

const addNote = (feedback: Feedback) => {
  // メモ追加の実装
  const note = prompt('管理者メモを入力してください')
  if (note) {
    feedbackService.addAdminNote(feedback.id, note)
    loadData()
  }
}

const downloadFeedback = () => {
  if (!selectedFeedback.value) return
  
  const data = JSON.stringify(selectedFeedback.value.toJSON(), null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `feedback_${selectedFeedback.value.id}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Helper methods
const getCategoryLabel = (category: FeedbackCategory): string => {
  const labels: Record<FeedbackCategory, string> = {
    [FeedbackCategory.BUG_REPORT]: 'バグ報告',
    [FeedbackCategory.FEATURE_REQUEST]: '機能要望', 
    [FeedbackCategory.UI_UX]: 'UI/UX',
    [FeedbackCategory.GAMEPLAY]: 'ゲームプレイ',
    [FeedbackCategory.PERFORMANCE]: 'パフォーマンス',
    [FeedbackCategory.ACCESSIBILITY]: 'アクセシビリティ',
    [FeedbackCategory.GENERAL]: '一般'
  }
  return labels[category] || category
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

const getPriorityLabel = (priority: FeedbackPriority): string => {
  const labels: Record<FeedbackPriority, string> = {
    [FeedbackPriority.LOW]: '低',
    [FeedbackPriority.MEDIUM]: '中',
    [FeedbackPriority.HIGH]: '高',
    [FeedbackPriority.CRITICAL]: '緊急'
  }
  return labels[priority] || priority
}

const getAspectLabel = (aspect: string): string => {
  const labels: Record<string, string> = {
    gameplay: 'ゲームプレイ',
    ui: 'UI・操作性',
    performance: 'パフォーマンス',
    accessibility: 'アクセシビリティ'
  }
  return labels[aspect] || aspect
}

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('ja-JP')
}

const formatDateTime = (date: Date): string => {
  return date.toLocaleString('ja-JP')
}

// Watchers
watch(() => filters.value, () => {
  currentPage.value = 1
}, { deep: true })

// Lifecycle
onMounted(() => {
  loadData()
})
</script>

<style scoped>
/* =================================
   ダッシュボードベース
   ================================= */

.feedback-dashboard {
  padding: var(--space-lg);
  max-width: 1400px;
  margin: 0 auto;
  background: var(--bg-primary);
  min-height: 100vh;
}

/* =================================
   ヘッダー
   ================================= */

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-xl);
  padding-bottom: var(--space-lg);
  border-bottom: 2px solid rgba(129, 140, 248, 0.2);
}

.header-content {
  flex: 1;
}

.dashboard-title {
  font-size: var(--text-3xl);
  font-weight: 800;
  color: rgba(129, 140, 248, 1);
  margin: 0 0 var(--space-sm) 0;
}

.dashboard-subtitle {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  font-size: var(--text-lg);
}

.header-actions {
  display: flex;
  gap: var(--space-md);
}

.refresh-btn,
.export-btn {
  padding: var(--space-sm) var(--space-lg);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  font-size: var(--text-sm);
}

.refresh-btn {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(129, 140, 248, 0.3);
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(129, 140, 248, 0.5);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn {
  background: var(--primary-gradient);
  color: white;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.3);
}

/* =================================
   統計カード
   ================================= */

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
  margin-bottom: var(--space-xl);
}

.stat-card {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 12px;
  transition: all var(--transition-normal);
}

.stat-card:hover {
  border-color: rgba(129, 140, 248, 0.4);
  transform: translateY(-2px);
}

.stat-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin-bottom: var(--space-xs);
}

.stat-label {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

/* =================================
   フィルター
   ================================= */

.filters-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  padding: var(--space-lg);
  margin-bottom: var(--space-xl);
  border: 1px solid rgba(129, 140, 248, 0.1);
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

.filters-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.clear-filters-btn {
  padding: var(--space-xs) var(--space-sm);
  background: none;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.clear-filters-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-lg);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.filter-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.filter-select,
.filter-input {
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
  transition: border-color var(--transition-fast);
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(255, 255, 255, 0.08);
}

/* =================================
   フィードバックリスト
   ================================= */

.feedback-list-section {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(129, 140, 248, 0.1);
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(129, 140, 248, 0.1);
}

.list-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.list-controls {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.sort-select {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
}

.sort-order-btn {
  width: 32px;
  height: 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.sort-order-btn:hover {
  background: rgba(129, 140, 248, 0.1);
}

/* =================================
   ローディング・空状態
   ================================= */

.loading-state,
.empty-state {
  padding: var(--space-3xl);
  text-align: center;
}

.loading-spinner,
.empty-icon {
  font-size: 3rem;
  margin-bottom: var(--space-lg);
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-title {
  font-size: var(--text-xl);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 var(--space-md) 0;
}

.empty-message {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* =================================
   フィードバックアイテム
   ================================= */

.feedback-items {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.feedback-item {
  padding: var(--space-lg);
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  border: 2px solid rgba(129, 140, 248, 0.1);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.feedback-item:hover {
  border-color: rgba(129, 140, 248, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.feedback-item.priority-high {
  border-left: 4px solid #F59E0B;
}

.feedback-item.priority-critical {
  border-left: 4px solid #EF4444;
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.feedback-meta {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.feedback-category {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(129, 140, 248, 1);
}

.feedback-id {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  font-family: monospace;
}

.feedback-badges {
  display: flex;
  gap: var(--space-sm);
}

.status-badge,
.priority-badge {
  padding: var(--space-xs) var(--space-sm);
  border-radius: 12px;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.status-submitted {
  background: rgba(156, 163, 175, 0.2);
  color: rgba(156, 163, 175, 1);
}

.status-badge.status-under_review {
  background: rgba(59, 130, 246, 0.2);
  color: rgba(59, 130, 246, 1);
}

.status-badge.status-in_progress {
  background: rgba(245, 158, 11, 0.2);
  color: rgba(245, 158, 11, 1);
}

.status-badge.status-resolved {
  background: rgba(34, 197, 94, 0.2);
  color: rgba(34, 197, 94, 1);
}

.status-badge.status-closed {
  background: rgba(107, 114, 128, 0.2);
  color: rgba(107, 114, 128, 1);
}

.priority-badge.priority-low {
  background: rgba(34, 197, 94, 0.2);
  color: rgba(34, 197, 94, 1);
}

.priority-badge.priority-medium {
  background: rgba(245, 158, 11, 0.2);
  color: rgba(245, 158, 11, 1);
}

.priority-badge.priority-high {
  background: rgba(239, 68, 68, 0.2);
  color: rgba(239, 68, 68, 1);
}

.priority-badge.priority-critical {
  background: rgba(239, 68, 68, 0.3);
  color: rgba(239, 68, 68, 1);
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.feedback-content {
  margin-bottom: var(--space-md);
}

.feedback-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 var(--space-sm) 0;
}

.feedback-description {
  color: rgba(255, 255, 255, 0.8);
  margin: 0 0 var(--space-md) 0;
  line-height: 1.5;
}

.bug-details,
.review-details {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.bug-severity,
.bug-frequency {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  font-size: var(--text-xs);
  color: rgba(239, 68, 68, 1);
}

.review-rating {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.star {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.3);
}

.star.filled {
  color: #F59E0B;
}

.star.small {
  font-size: var(--text-xs);
}

.rating-text {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.7);
  margin-left: var(--space-xs);
}

.recommend-badge {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 6px;
  font-size: var(--text-xs);
  color: rgba(34, 197, 94, 1);
}

.feedback-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: var(--space-md);
  border-top: 1px solid rgba(129, 140, 248, 0.1);
}

.feedback-info {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.feedback-date {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.6);
}

.feedback-contact {
  font-size: var(--text-sm);
  color: rgba(129, 140, 248, 1);
}

.feedback-anonymous {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
}

.feedback-actions {
  display: flex;
  gap: var(--space-sm);
}

.action-btn {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(129, 140, 248, 0.1);
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 6px;
  color: rgba(129, 140, 248, 1);
  cursor: pointer;
  font-size: var(--text-xs);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  background: rgba(129, 140, 248, 0.2);
}

/* =================================
   ページネーション
   ================================= */

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  border-top: 1px solid rgba(129, 140, 248, 0.1);
}

.pagination-btn {
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 6px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.pagination-btn:hover:not(:disabled) {
  background: rgba(129, 140, 248, 0.1);
  color: rgba(255, 255, 255, 0.95);
}

.pagination-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination-info {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

/* =================================
   モーダル
   ================================= */

.feedback-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 16px;
  border: 2px solid rgba(129, 140, 248, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  background: rgba(129, 140, 248, 0.1);
  border-bottom: 1px solid rgba(129, 140, 248, 0.2);
}

.modal-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  transition: all var(--transition-fast);
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 1);
}

.modal-body {
  flex: 1;
  padding: var(--space-lg);
  overflow-y: auto;
}

.feedback-details {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.detail-section {
  padding: var(--space-lg);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(129, 140, 248, 0.1);
}

.detail-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 var(--space-md) 0;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-md);
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
}

.detail-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
}

.detail-value {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.9);
  word-break: break-word;
}

.detail-description {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin: 0;
}

.reproduction-steps,
.expected-behavior,
.actual-behavior {
  margin-top: var(--space-md);
}

.steps-title,
.behavior-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 var(--space-sm) 0;
}

.steps-list {
  padding-left: var(--space-lg);
  margin: 0;
}

.step-item {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--space-xs);
}

.behavior-text {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.5;
}

.review-details-full {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}

.review-ratings {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.rating-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.rating-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  min-width: 80px;
}

.rating-stars {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.rating-value,
.aspect-value {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
  margin-left: var(--space-xs);
}

.aspect-ratings {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-left: var(--space-lg);
}

.aspect-item {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.aspect-label {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
  min-width: 120px;
}

.aspect-stars {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
}

.recommendation-status {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.recommendation-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
}

.recommendation-value {
  font-size: var(--text-sm);
  color: rgba(239, 68, 68, 1);
}

.recommendation-value.positive {
  color: rgba(34, 197, 94, 1);
}

.system-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-sm);
}

.tag {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(129, 140, 248, 0.1);
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 12px;
  font-size: var(--text-xs);
  color: rgba(129, 140, 248, 1);
}

.admin-notes {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.admin-note {
  padding: var(--space-sm);
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid rgba(245, 158, 11, 0.5);
  border-radius: 4px;
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: rgba(255, 255, 255, 0.03);
  border-top: 1px solid rgba(129, 140, 248, 0.1);
}

.btn-primary,
.btn-secondary {
  padding: var(--space-sm) var(--space-lg);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  font-size: var(--text-sm);
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: 2px solid rgba(129, 140, 248, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(129, 140, 248, 0.5);
}

/* =================================
   レスポンシブ
   ================================= */

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .feedback-dashboard {
    padding: var(--space-md);
  }

  .dashboard-header {
    flex-direction: column;
    gap: var(--space-md);
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .filters-grid {
    grid-template-columns: 1fr;
  }

  .list-header {
    flex-direction: column;
    gap: var(--space-md);
    align-items: stretch;
  }

  .feedback-header {
    flex-direction: column;
    gap: var(--space-sm);
    align-items: stretch;
  }

  .feedback-footer {
    flex-direction: column;
    gap: var(--space-md);
  }

  .modal-content {
    margin: var(--space-sm);
    max-width: none;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .header-actions {
    flex-direction: column;
  }

  .feedback-badges {
    flex-direction: column;
    align-items: flex-start;
  }

  .bug-details,
  .review-details {
    flex-direction: column;
    align-items: flex-start;
  }

  .modal-footer {
    flex-direction: column;
  }
}

/* =================================
   アクセシビリティ
   ================================= */

@media (prefers-reduced-motion: reduce) {
  .stat-card,
  .feedback-item,
  .refresh-btn,
  .export-btn,
  .btn-primary,
  .btn-secondary {
    transition: none;
  }

  .stat-card:hover,
  .feedback-item:hover,
  .export-btn:hover,
  .btn-primary:hover {
    transform: none;
  }

  .loading-spinner {
    animation: none;
  }
}

.feedback-dashboard:focus-within {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

/* ハイコントラストモード */
@media (prefers-contrast: high) {
  .stat-card,
  .filters-section,
  .feedback-list-section,
  .feedback-item,
  .modal-content,
  .detail-section {
    border: 2px solid white;
    background: rgba(0, 0, 0, 0.9);
  }

  .status-badge,
  .priority-badge,
  .tag {
    border: 1px solid white;
  }
}
</style>