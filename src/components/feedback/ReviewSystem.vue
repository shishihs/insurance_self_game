<template>
  <div class="review-system">
    <!-- クイック評価ボタン -->
    <div v-if="mode === 'quick'" class="quick-review">
      <div class="quick-review-header">
        <h3 class="quick-title">ゲームはいかがでしたか？</h3>
        <p class="quick-subtitle">簡単な評価をお聞かせください</p>
      </div>
      
      <div class="quick-actions">
        <button
          v-for="rating in quickRatings"
          :key="rating.value"
          class="quick-rating-btn"
          :class="{ selected: selectedQuickRating === rating.value }"
          :aria-label="`${rating.label} - ${rating.description}`"
          @click="submitQuickRating(rating.value)"
        >
          <div class="rating-emoji">{{ rating.emoji }}</div>
          <div class="rating-label">{{ rating.label }}</div>
        </button>
      </div>
      
      <button 
        class="expand-btn" 
        :disabled="!selectedQuickRating"
        @click="expandToFullReview"
      >
        詳細な評価を書く
      </button>
    </div>

    <!-- 詳細レビューフォーム -->
    <div v-else class="detailed-review">
      <div class="review-header">
        <h3 class="review-title">詳細レビュー</h3>
        <p class="review-subtitle">あなたの体験をお聞かせください</p>
      </div>

      <form class="review-form" @submit.prevent="submitDetailedReview">
        <!-- 総合評価 -->
        <div class="rating-section">
          <h4 class="section-title">総合評価</h4>
          <div class="star-rating-container">
            <div class="star-rating">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                class="star-button"
                :class="{ 
                  active: overallRating >= star,
                  hover: hoverOverallRating >= star && hoverOverallRating > overallRating
                }"
                :aria-label="`${star} 星評価`"
                @click="setOverallRating(star)"
                @mouseover="hoverOverallRating = star"
                @mouseleave="hoverOverallRating = 0"
              >
                ★
              </button>
            </div>
            <div class="rating-description">
              {{ getRatingDescription(hoverOverallRating || overallRating) }}
            </div>
          </div>
        </div>

        <!-- 項目別評価 -->
        <div class="aspect-ratings-section">
          <h4 class="section-title">項目別評価</h4>
          <div class="aspect-grid">
            <div 
              v-for="aspect in aspectRatings" 
              :key="aspect.key"
              class="aspect-item"
            >
              <div class="aspect-header">
                <div class="aspect-icon">{{ aspect.icon }}</div>
                <div class="aspect-info">
                  <h5 class="aspect-title">{{ aspect.title }}</h5>
                  <p class="aspect-description">{{ aspect.description }}</p>
                </div>
              </div>
              <div class="aspect-rating">
                <div class="star-rating small">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    class="star-button"
                    :class="{ active: aspectRatingsData[aspect.key] >= star }"
                    :aria-label="`${aspect.title} ${star} 星評価`"
                    @click="setAspectRating(aspect.key, star)"
                  >
                    ★
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- コメント -->
        <div class="comment-section">
          <h4 class="section-title">コメント</h4>
          <div class="comment-prompts">
            <button
              v-for="prompt in commentPrompts"
              :key="prompt.id"
              type="button"
              class="prompt-btn"
              :class="{ selected: selectedPrompt?.id === prompt.id }"
              @click="selectCommentPrompt(prompt)"
            >
              {{ prompt.text }}
            </button>
          </div>
          <textarea
            v-model="reviewComment"
            class="comment-textarea"
            :placeholder="selectedPrompt?.placeholder || '自由にご感想をお聞かせください...'"
            rows="4"
            maxlength="500"
          ></textarea>
          <div class="character-count">{{ reviewComment.length }}/500</div>
        </div>

        <!-- 推奨度 -->
        <div class="recommendation-section">
          <h4 class="section-title">推奨度</h4>
          <p class="section-description">このゲームを友人におすすめしますか？</p>
          <div class="recommendation-scale">
            <div class="scale-labels">
              <span class="scale-label">おすすめしない</span>
              <span class="scale-label">おすすめする</span>
            </div>
            <div class="scale-track">
              <input
                v-model="recommendationScore"
                type="range"
                min="0"
                max="10"
                step="1"
                class="scale-slider"
                :aria-label="`推奨度 ${recommendationScore} 点`"
              />
              <div class="scale-markers">
                <div 
                  v-for="n in 11" 
                  :key="n-1"
                  class="scale-marker"
                  :class="{ active: recommendationScore >= n-1 }"
                ></div>
              </div>
            </div>
            <div class="scale-value">{{ recommendationScore }}/10</div>
          </div>
        </div>

        <!-- タグ選択 -->
        <div class="tags-section">
          <h4 class="section-title">印象的だった要素</h4>
          <p class="section-description">当てはまるものを選択してください（複数選択可）</p>
          <div class="tags-grid">
            <button
              v-for="tag in availableTags"
              :key="tag.id"
              type="button"
              class="tag-button"
              :class="{ selected: selectedTags.includes(tag.id) }"
              @click="toggleTag(tag.id)"
            >
              <span class="tag-icon">{{ tag.icon }}</span>
              <span class="tag-label">{{ tag.label }}</span>
            </button>
          </div>
        </div>

        <!-- プレイ時間（任意） -->
        <div class="playtime-section">
          <h4 class="section-title">プレイ時間</h4>
          <div class="playtime-options">
            <button
              v-for="option in playtimeOptions"
              :key="option.value"
              type="button"
              class="playtime-btn"
              :class="{ selected: selectedPlaytime === option.value }"
              @click="selectedPlaytime = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <!-- 送信ボタン -->
        <div class="form-actions">
          <button
            type="button"
            class="btn-secondary"
            @click="switchToQuickMode"
          >
            簡易モードに戻る
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="!isFormValid || isSubmitting"
          >
            <span v-if="isSubmitting">送信中...</span>
            <span v-else>レビューを送信</span>
          </button>
        </div>
      </form>
    </div>

    <!-- 送信完了メッセージ -->
    <div v-if="showSuccessMessage" class="success-overlay">
      <div class="success-content">
        <div class="success-icon">🎉</div>
        <h3 class="success-title">レビューをありがとうございます！</h3>
        <p class="success-message">
          あなたの貴重な意見がゲームの改善に役立ちます。
        </p>
        <button class="btn-primary" @click="closeSuccessMessage">
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { FeedbackManagementService } from '../../domain/services/FeedbackManagementService'
import type { SatisfactionRating } from '../../domain/entities/Feedback'

// Props & Emits
interface Props {
  mode?: 'quick' | 'detailed'
  gameState?: {
    stage: string
    turn: number
    vitality: number
    phase: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'quick'
})

const emit = defineEmits<{
  reviewSubmitted: [reviewId: string]
  modeChanged: [mode: 'quick' | 'detailed']
}>()

// Services
const feedbackService = new FeedbackManagementService()

// State
const currentMode = ref<'quick' | 'detailed'>(props.mode)
const selectedQuickRating = ref<number>(0)
const hoverOverallRating = ref<number>(0)
const overallRating = ref<number>(0)
const reviewComment = ref<string>('')
const recommendationScore = ref<number>(5)
const selectedPlaytime = ref<string>('')
const selectedTags = ref<string[]>([])
const selectedPrompt = ref<any>(null)
const isSubmitting = ref(false)
const showSuccessMessage = ref(false)

// 項目別評価データ
const aspectRatingsData = reactive({
  gameplay: 0,
  ui: 0,
  performance: 0,
  accessibility: 0
})

// クイック評価オプション
const quickRatings = [
  {
    value: 1,
    label: 'いまいち',
    emoji: '😞',
    description: '期待に届かなかった'
  },
  {
    value: 2,
    label: 'まあまあ',
    emoji: '😐',
    description: '普通の出来'
  },
  {
    value: 3,
    label: 'よかった',
    emoji: '😊',
    description: '楽しめた'
  },
  {
    value: 4,
    label: 'とてもよかった',
    emoji: '😄',
    description: '大いに楽しめた'
  },
  {
    value: 5,
    label: '最高だった',
    emoji: '🤩',
    description: '期待を大きく上回った'
  }
]

// 項目別評価
const aspectRatings = [
  {
    key: 'gameplay',
    title: 'ゲームプレイ',
    description: '面白さ・戦略性',
    icon: '🎮'
  },
  {
    key: 'ui',
    title: 'UI・操作性',
    description: '使いやすさ・直感性',
    icon: '🖱️'
  },
  {
    key: 'performance',
    title: 'パフォーマンス',
    description: '動作の軽さ・安定性',
    icon: '⚡'
  },
  {
    key: 'accessibility',
    title: 'アクセシビリティ',
    description: '利用しやすさ・配慮',
    icon: '♿'
  }
]

// コメントプロンプト
const commentPrompts = [
  {
    id: 'liked',
    text: '特に良かった点',
    placeholder: 'どの部分が特に気に入りましたか？具体的にお聞かせください。'
  },
  {
    id: 'improvement',
    text: '改善してほしい点',
    placeholder: 'どの部分を改善すればより良くなると思いますか？'
  },
  {
    id: 'feature',
    text: '追加してほしい機能',
    placeholder: 'どのような機能があると更に楽しめると思いますか？'
  },
  {
    id: 'general',
    text: '全体的な感想',
    placeholder: 'ゲーム全体を通しての感想をお聞かせください。'
  }
]

// タグオプション
const availableTags = [
  { id: 'addictive', label: 'ハマる', icon: '🎯' },
  { id: 'relaxing', label: 'リラックス', icon: '😌' },
  { id: 'challenging', label: 'やりがい', icon: '💪' },
  { id: 'educational', label: '学びになる', icon: '📚' },
  { id: 'innovative', label: '斬新', icon: '💡' },
  { id: 'beautiful', label: '美しい', icon: '🎨' },
  { id: 'intuitive', label: '直感的', icon: '👆' },
  { id: 'immersive', label: '没入感', icon: '🌟' }
]

// プレイ時間オプション
const playtimeOptions = [
  { value: '< 30min', label: '30分未満' },
  { value: '30min - 1h', label: '30分〜1時間' },
  { value: '1h - 2h', label: '1〜2時間' },
  { value: '2h - 5h', label: '2〜5時間' },
  { value: '5h+', label: '5時間以上' }
]

// Computed
const isFormValid = computed(() => {
  return overallRating.value > 0 && reviewComment.value.trim().length > 0
})

// Methods
const submitQuickRating = async (rating: number) => {
  selectedQuickRating.value = rating
  
  try {
    const feedback = await feedbackService.createReview({
      title: `クイック評価: ${quickRatings.find(r => r.value === rating)?.label}`,
      description: `ユーザーからの ${rating} 星評価`,
      submitter: {
        isAnonymous: true,
        userAgent: navigator.userAgent,
        sessionId: generateSessionId()
      },
      systemInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        gameVersion: '0.2.7',
        timestamp: new Date(),
        gameState: props.gameState
      },
      reviewData: {
        overallRating: rating as SatisfactionRating,
        aspects: {
          gameplay: rating as SatisfactionRating,
          ui: rating as SatisfactionRating,
          performance: rating as SatisfactionRating,
          accessibility: rating as SatisfactionRating
        },
        wouldRecommend: rating >= 4
      }
    })
    
    showSuccessMessage.value = true
    emit('reviewSubmitted', feedback.id)
  } catch (error) {
    console.error('Failed to submit quick rating:', error)
    alert('評価の送信に失敗しました。')
  }
}

const expandToFullReview = () => {
  if (selectedQuickRating.value > 0) {
    overallRating.value = selectedQuickRating.value
    Object.keys(aspectRatingsData).forEach(key => {
      aspectRatingsData[key as keyof typeof aspectRatingsData] = selectedQuickRating.value
    })
    recommendationScore.value = selectedQuickRating.value >= 4 ? 8 : 4
  }
  currentMode.value = 'detailed'
  emit('modeChanged', 'detailed')
}

const switchToQuickMode = () => {
  currentMode.value = 'quick'
  emit('modeChanged', 'quick')
}

const setOverallRating = (rating: number) => {
  overallRating.value = rating
}

const setAspectRating = (aspect: string, rating: number) => {
  aspectRatingsData[aspect as keyof typeof aspectRatingsData] = rating
}

const selectCommentPrompt = (prompt: any) => {
  selectedPrompt.value = selectedPrompt.value?.id === prompt.id ? null : prompt
}

const toggleTag = (tagId: string) => {
  const index = selectedTags.value.indexOf(tagId)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    selectedTags.value.push(tagId)
  }
}

const submitDetailedReview = async () => {
  if (!isFormValid.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    const feedback = await feedbackService.createReview({
      title: `詳細レビュー: ${getRatingDescription(overallRating.value)}`,
      description: reviewComment.value.trim(),
      submitter: {
        isAnonymous: true,
        userAgent: navigator.userAgent,
        sessionId: generateSessionId()
      },
      systemInfo: {
        userAgent: navigator.userAgent,
        screenResolution: `${screen.width}x${screen.height}`,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        gameVersion: '0.2.7',
        timestamp: new Date(),
        gameState: props.gameState
      },
      reviewData: {
        overallRating: overallRating.value as SatisfactionRating,
        aspects: {
          gameplay: aspectRatingsData.gameplay as SatisfactionRating,
          ui: aspectRatingsData.ui as SatisfactionRating,
          performance: aspectRatingsData.performance as SatisfactionRating,
          accessibility: aspectRatingsData.accessibility as SatisfactionRating
        },
        wouldRecommend: recommendationScore.value >= 6,
        playTime: getPlayTimeInMinutes()
      },
      tags: [
        'detailed-review',
        ...selectedTags.value,
        `recommendation-${recommendationScore.value}`,
        selectedPlaytime.value ? `playtime-${selectedPlaytime.value}` : ''
      ].filter(Boolean)
    })

    showSuccessMessage.value = true
    emit('reviewSubmitted', feedback.id)
  } catch (error) {
    console.error('Failed to submit detailed review:', error)
    alert('レビューの送信に失敗しました。')
  } finally {
    isSubmitting.value = false
  }
}

const closeSuccessMessage = () => {
  showSuccessMessage.value = false
  resetForm()
}

const resetForm = () => {
  selectedQuickRating.value = 0
  overallRating.value = 0
  reviewComment.value = ''
  recommendationScore.value = 5
  selectedPlaytime.value = ''
  selectedTags.value = []
  selectedPrompt.value = null
  Object.keys(aspectRatingsData).forEach(key => {
    aspectRatingsData[key as keyof typeof aspectRatingsData] = 0
  })
}

const getRatingDescription = (rating: number): string => {
  const descriptions = [
    '',
    '改善が必要',
    'まあまあ',
    '良い',
    'とても良い',
    '素晴らしい'
  ]
  return descriptions[rating] || ''
}

const generateSessionId = (): string => {
  return `review_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`
}

const getPlayTimeInMinutes = (): number => {
  const playtimeMap: Record<string, number> = {
    '< 30min': 15,
    '30min - 1h': 45,
    '1h - 2h': 90,
    '2h - 5h': 210,
    '5h+': 360
  }
  return playtimeMap[selectedPlaytime.value] || 0
}

// Watchers
watch(() => props.mode, (newMode) => {
  currentMode.value = newMode
})
</script>

<style scoped>
/* =================================
   レビューシステムベース
   ================================= */

.review-system {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: var(--space-lg);
  border: 1px solid rgba(129, 140, 248, 0.2);
}

/* =================================
   クイックレビュー
   ================================= */

.quick-review-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.quick-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 var(--space-sm) 0;
}

.quick-subtitle {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
  flex-wrap: wrap;
}

.quick-rating-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-normal);
  min-width: 80px;
}

.quick-rating-btn:hover,
.quick-rating-btn.selected {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(129, 140, 248, 0.1);
  transform: translateY(-2px);
}

.rating-emoji {
  font-size: 2rem;
  line-height: 1;
}

.rating-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.expand-btn {
  display: block;
  margin: 0 auto;
  padding: var(--space-sm) var(--space-lg);
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.expand-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.expand-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.3);
}

/* =================================
   詳細レビュー
   ================================= */

.review-header {
  text-align: center;
  margin-bottom: var(--space-xl);
}

.review-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin: 0 0 var(--space-sm) 0;
}

.review-subtitle {
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
}

.review-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

/* =================================
   セクション共通
   ================================= */

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 var(--space-md) 0;
}

.section-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-sm);
  margin: 0 0 var(--space-md) 0;
}

/* =================================
   評価セクション
   ================================= */

.star-rating-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-md);
}

.star-rating {
  display: flex;
  gap: var(--space-sm);
  justify-content: center;
}

.star-rating.small {
  gap: var(--space-xs);
}

.star-button {
  background: none;
  border: none;
  font-size: var(--text-2xl);
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: all var(--transition-fast);
  padding: var(--space-xs);
}

.star-rating.small .star-button {
  font-size: var(--text-lg);
}

.star-button:hover,
.star-button.active,
.star-button.hover {
  color: #F59E0B;
  transform: scale(1.1);
}

.rating-description {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  min-height: 20px;
}

/* =================================
   項目別評価
   ================================= */

.aspect-grid {
  display: grid;
  gap: var(--space-md);
}

.aspect-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  border: 1px solid rgba(129, 140, 248, 0.1);
}

.aspect-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex: 1;
}

.aspect-icon {
  font-size: var(--text-xl);
  width: 40px;
  text-align: center;
}

.aspect-info {
  flex: 1;
}

.aspect-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 var(--space-xs) 0;
}

.aspect-description {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* =================================
   コメントセクション
   ================================= */

.comment-prompts {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  flex-wrap: wrap;
}

.prompt-btn {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-sm);
}

.prompt-btn:hover,
.prompt-btn.selected {
  background: rgba(129, 140, 248, 0.2);
  border-color: rgba(129, 140, 248, 0.6);
  color: rgba(255, 255, 255, 0.95);
}

.comment-textarea {
  width: 100%;
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-family: inherit;
  font-size: var(--text-sm);
  resize: vertical;
  min-height: 100px;
}

.comment-textarea:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(255, 255, 255, 0.08);
}

.character-count {
  text-align: right;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.5);
  margin-top: var(--space-xs);
}

/* =================================
   推奨度セクション
   ================================= */

.recommendation-scale {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

.scale-track {
  position: relative;
  padding: var(--space-sm) 0;
}

.scale-slider {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  outline: none;
  appearance: none;
  cursor: pointer;
}

.scale-slider::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  background: var(--primary-gradient);
  border-radius: 50%;
  cursor: pointer;
  appearance: none;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.scale-markers {
  display: flex;
  justify-content: space-between;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  pointer-events: none;
}

.scale-marker {
  width: 2px;
  height: 6px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 1px;
}

.scale-marker.active {
  background: rgba(129, 140, 248, 0.8);
}

.scale-value {
  text-align: center;
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(129, 140, 248, 1);
}

/* =================================
   タグセクション
   ================================= */

.tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.tag-button {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
}

.tag-button:hover,
.tag-button.selected {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(129, 140, 248, 0.1);
  color: rgba(255, 255, 255, 0.95);
}

.tag-icon {
  font-size: var(--text-base);
}

/* =================================
   プレイ時間セクション
   ================================= */

.playtime-options {
  display: flex;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.playtime-btn {
  padding: var(--space-sm) var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 20px;
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-sm);
}

.playtime-btn:hover,
.playtime-btn.selected {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(129, 140, 248, 0.1);
  color: rgba(255, 255, 255, 0.95);
}

/* =================================
   フォームアクション
   ================================= */

.form-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  margin-top: var(--space-xl);
  padding-top: var(--space-lg);
  border-top: 1px solid rgba(129, 140, 248, 0.2);
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
  min-width: 120px;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.3);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
   成功メッセージ
   ================================= */

.success-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  backdrop-filter: blur(4px);
}

.success-content {
  text-align: center;
  padding: var(--space-xl);
  background: var(--bg-primary);
  border-radius: 12px;
  border: 2px solid rgba(34, 197, 94, 0.3);
  max-width: 400px;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
}

.success-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(34, 197, 94, 1);
  margin: 0 0 var(--space-md) 0;
}

.success-message {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: var(--space-xl);
}

/* =================================
   レスポンシブ
   ================================= */

@media (max-width: 768px) {
  .quick-actions {
    flex-direction: column;
    align-items: center;
  }

  .quick-rating-btn {
    width: 100%;
    max-width: 200px;
    flex-direction: row;
    justify-content: center;
  }

  .aspect-item {
    flex-direction: column;
    gap: var(--space-md);
    text-align: center;
  }

  .tags-grid {
    grid-template-columns: 1fr;
  }

  .playtime-options {
    flex-direction: column;
  }

  .form-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .review-system {
    padding: var(--space-md);
  }

  .comment-prompts {
    flex-direction: column;
  }

  .scale-labels {
    font-size: var(--text-xs);
  }
}

/* =================================
   アクセシビリティ
   ================================= */

@media (prefers-reduced-motion: reduce) {
  .quick-rating-btn,
  .tag-button,
  .playtime-btn,
  .star-button {
    transition: none;
  }

  .quick-rating-btn:hover,
  .star-button:hover {
    transform: none;
  }
}

.review-system:focus-within {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}
</style>