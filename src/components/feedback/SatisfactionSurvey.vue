<template>
  <div v-if="isVisible" class="satisfaction-survey-overlay" @click="dismiss">
    <div class="satisfaction-survey" @click.stop>
      <!-- 調査ヘッダー -->
      <div class="survey-header">
        <div class="survey-icon">📊</div>
        <div class="survey-content">
          <h3 class="survey-title">ゲーム体験はいかがでしたか？</h3>
          <p class="survey-subtitle">
            あなたの感想が今後のゲーム改善に役立ちます（回答時間: 約30秒）
          </p>
        </div>
        <button
          @click="dismiss"
          class="survey-close"
          aria-label="調査を閉じる"
        >
          ×
        </button>
      </div>

      <!-- 調査フォーム -->
      <div class="survey-form">
        <!-- クイック評価 -->
        <div class="quick-rating-section">
          <h4 class="section-title">総合的な満足度</h4>
          <div class="emoji-rating">
            <button
              v-for="rating in emojiRatings"
              :key="rating.value"
              @click="setOverallRating(rating.value)"
              class="emoji-btn"
              :class="{ selected: selectedRating === rating.value }"
              :aria-label="`${rating.value}点 - ${rating.label}`"
            >
              <div class="emoji">{{ rating.emoji }}</div>
              <div class="emoji-label">{{ rating.label }}</div>
            </button>
          </div>
        </div>

        <!-- 詳細コメント（条件付き） -->
        <div v-if="selectedRating && selectedRating <= 3" class="improvement-section">
          <h4 class="section-title">改善点をお聞かせください</h4>
          <div class="improvement-options">
            <button
              v-for="issue in commonIssues"
              :key="issue.id"
              @click="toggleIssue(issue.id)"
              class="issue-btn"
              :class="{ selected: selectedIssues.includes(issue.id) }"
            >
              <div class="issue-icon">{{ issue.icon }}</div>
              <div class="issue-text">{{ issue.text }}</div>
            </button>
          </div>
        </div>

        <div v-if="selectedRating && selectedRating >= 4" class="positive-section">
          <h4 class="section-title">特に良かった点</h4>
          <div class="positive-options">
            <button
              v-for="positive in positiveAspects"
              :key="positive.id"
              @click="togglePositive(positive.id)"
              class="positive-btn"
              :class="{ selected: selectedPositives.includes(positive.id) }"
            >
              <div class="positive-icon">{{ positive.icon }}</div>
              <div class="positive-text">{{ positive.text }}</div>
            </button>
          </div>
        </div>

        <!-- 推奨度 -->
        <div v-if="selectedRating" class="recommendation-section">
          <h4 class="section-title">友人におすすめしますか？</h4>
          <div class="recommendation-buttons">
            <button
              @click="setRecommendation(true)"
              class="recommend-btn"
              :class="{ selected: wouldRecommend === true }"
            >
              <div class="recommend-icon">👍</div>
              <div class="recommend-text">はい</div>
            </button>
            <button
              @click="setRecommendation(false)"
              class="recommend-btn"
              :class="{ selected: wouldRecommend === false }"
            >
              <div class="recommend-icon">👎</div>
              <div class="recommend-text">いいえ</div>
            </button>
          </div>
        </div>

        <!-- 追加コメント（任意） -->
        <div v-if="selectedRating" class="comment-section">
          <h4 class="section-title">その他のご意見（任意）</h4>
          <textarea
            v-model="additionalComment"
            class="comment-textarea"
            placeholder="ご自由にお書きください..."
            maxlength="200"
            rows="3"
          ></textarea>
          <div class="character-count">{{ additionalComment.length }}/200</div>
        </div>

        <!-- 送信ボタン -->
        <div class="survey-actions">
          <button
            @click="dismiss"
            class="btn-skip"
          >
            スキップ
          </button>
          <button
            @click="submitSurvey"
            class="btn-submit"
            :disabled="!selectedRating || isSubmitting"
          >
            <span v-if="isSubmitting">送信中...</span>
            <span v-else>送信</span>
          </button>
        </div>
      </div>

      <!-- 送信完了 -->
      <div v-if="showThankYou" class="thank-you-section">
        <div class="thank-you-icon">🎉</div>
        <h3 class="thank-you-title">ありがとうございました！</h3>
        <p class="thank-you-message">
          いただいたフィードバックを参考に、より良いゲーム体験を提供できるよう改善を続けます。
        </p>
        <button @click="closeCompletely" class="btn-close">
          閉じる
        </button>
      </div>

      <!-- プログレスバー -->
      <div class="survey-progress">
        <div class="progress-bar" :style="{ width: `${progressPercentage}%` }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { FeedbackManagementService } from '../../domain/services/FeedbackManagementService'
import { SatisfactionRating } from '../../domain/entities/Feedback'

// Props
interface Props {
  gameState?: {
    stage: string
    turn: number
    vitality: number
    phase: string
  }
  trigger?: 'manual' | 'game-end' | 'periodic' | 'achievement'
  autoShow?: boolean
  delay?: number
}

const props = withDefaults(defineProps<Props>(), {
  trigger: 'manual',
  autoShow: false,
  delay: 0
})

// Emits
const emit = defineEmits<{
  submitted: [surveyId: string]
  dismissed: []
  completed: []
}>()

// Services
const feedbackService = new FeedbackManagementService()

// State
const isVisible = ref(false)
const selectedRating = ref<number>(0)
const selectedIssues = ref<string[]>([])
const selectedPositives = ref<string[]>([])
const wouldRecommend = ref<boolean | null>(null)
const additionalComment = ref('')
const isSubmitting = ref(false)
const showThankYou = ref(false)

// Emoji Ratings
const emojiRatings = [
  { value: 1, emoji: '😞', label: '不満' },
  { value: 2, emoji: '😐', label: 'いまいち' },
  { value: 3, emoji: '🙂', label: '普通' },
  { value: 4, emoji: '😊', label: '満足' },
  { value: 5, emoji: '🤩', label: '大満足' }
]

// Common Issues (for low ratings)
const commonIssues = [
  { id: 'difficult', icon: '😵', text: '難しすぎる' },
  { id: 'boring', icon: '😴', text: 'つまらない' },
  { id: 'confusing', icon: '😕', text: 'わかりにくい' },
  { id: 'slow', icon: '🐌', text: '動作が重い' },
  { id: 'bugs', icon: '🐛', text: 'バグが多い' },
  { id: 'ui', icon: '🎨', text: 'UIが使いにくい' }
]

// Positive Aspects (for high ratings)
const positiveAspects = [
  { id: 'fun', icon: '🎉', text: '楽しい' },
  { id: 'strategic', icon: '🧠', text: '戦略性がある' },
  { id: 'intuitive', icon: '👆', text: '直感的' },
  { id: 'graphics', icon: '✨', text: '見た目が良い' },
  { id: 'balanced', icon: '⚖️', text: 'バランスが良い' },
  { id: 'educational', icon: '📚', text: '勉強になる' }
]

// Computed
const progressPercentage = computed(() => {
  let progress = 0
  if (selectedRating.value > 0) progress += 40
  if (wouldRecommend.value !== null) progress += 30
  if (selectedIssues.value.length > 0 || selectedPositives.value.length > 0) progress += 20
  if (additionalComment.value.trim()) progress += 10
  return Math.min(progress, 100)
})

// Methods
const show = () => {
  if (props.delay > 0) {
    setTimeout(() => {
      isVisible.value = true
    }, props.delay)
  } else {
    isVisible.value = true
  }
}

const dismiss = () => {
  // 調査を拒否した場合、しばらく表示しない
  const dismissalData = {
    timestamp: Date.now(),
    trigger: props.trigger,
    gameState: props.gameState
  }
  localStorage.setItem('survey_dismissed', JSON.stringify(dismissalData))
  
  isVisible.value = false
  emit('dismissed')
}

const closeCompletely = () => {
  isVisible.value = false
  emit('completed')
}

const setOverallRating = (rating: number) => {
  selectedRating.value = rating
  
  // 評価に応じて選択肢をリセット
  if (rating <= 3) {
    selectedPositives.value = []
  } else {
    selectedIssues.value = []
  }
}

const toggleIssue = (issueId: string) => {
  const index = selectedIssues.value.indexOf(issueId)
  if (index > -1) {
    selectedIssues.value.splice(index, 1)
  } else {
    selectedIssues.value.push(issueId)
  }
}

const togglePositive = (positiveId: string) => {
  const index = selectedPositives.value.indexOf(positiveId)
  if (index > -1) {
    selectedPositives.value.splice(index, 1)
  } else {
    selectedPositives.value.push(positiveId)
  }
}

const setRecommendation = (recommend: boolean) => {
  wouldRecommend.value = recommend
}

const submitSurvey = async () => {
  if (!selectedRating.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    // システム情報を収集
    const systemInfo = {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      gameVersion: '0.2.7',
      timestamp: new Date(),
      gameState: props.gameState
    }

    // 送信者情報（匿名）
    const submitter = {
      isAnonymous: true,
      userAgent: navigator.userAgent,
      sessionId: generateSessionId()
    }

    // レビューデータを構築
    const reviewData = {
      overallRating: selectedRating.value as SatisfactionRating,
      aspects: {
        gameplay: selectedRating.value as SatisfactionRating,
        ui: selectedRating.value as SatisfactionRating,
        performance: selectedRating.value as SatisfactionRating,
        accessibility: selectedRating.value as SatisfactionRating
      },
      wouldRecommend: wouldRecommend.value ?? false,
      playTime: calculatePlayTime()
    }

    // タグを作成
    const tags = [
      'satisfaction-survey',
      `trigger-${props.trigger}`,
      `rating-${selectedRating.value}`,
      wouldRecommend.value ? 'would-recommend' : 'would-not-recommend',
      ...selectedIssues.value.map(issue => `issue-${issue}`),
      ...selectedPositives.value.map(positive => `positive-${positive}`)
    ]

    // コメントを構築
    let description = `満足度調査: ${selectedRating.value}/5点`
    
    if (selectedIssues.value.length > 0) {
      const issueTexts = selectedIssues.value.map(id => 
        commonIssues.find(issue => issue.id === id)?.text
      ).filter(Boolean)
      description += `\n改善点: ${issueTexts.join(', ')}`
    }
    
    if (selectedPositives.value.length > 0) {
      const positiveTexts = selectedPositives.value.map(id => 
        positiveAspects.find(positive => positive.id === id)?.text
      ).filter(Boolean)
      description += `\n良かった点: ${positiveTexts.join(', ')}`
    }
    
    if (additionalComment.value.trim()) {
      description += `\n追加コメント: ${additionalComment.value.trim()}`
    }

    // フィードバックを作成
    const feedback = feedbackService.createReview({
      title: `満足度調査 (${selectedRating.value}/5点)`,
      description,
      submitter,
      systemInfo,
      reviewData,
      tags
    })

    // 送信完了を記録
    const completionData = {
      timestamp: Date.now(),
      surveyId: feedback.id,
      rating: selectedRating.value,
      trigger: props.trigger
    }
    localStorage.setItem('survey_completed', JSON.stringify(completionData))

    // UI更新
    showThankYou.value = true
    emit('submitted', feedback.id)

    // アナリティクス送信
    trackSurveyCompletion(feedback.id)

  } catch (error) {
    console.error('Failed to submit satisfaction survey:', error)
    alert('調査の送信に失敗しました。')
  } finally {
    isSubmitting.value = false
  }
}

const generateSessionId = (): string => {
  return 'survey_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

const calculatePlayTime = (): number => {
  // 実際の実装では、ゲーム開始からの経過時間を計算
  if (props.gameState) {
    return props.gameState.turn * 2 // 1ターン2分と仮定
  }
  return 0
}

const trackSurveyCompletion = (surveyId: string) => {
  // アナリティクスイベントを送信
  console.log(`Satisfaction survey completed: ${surveyId}`)
}

// 自動表示の制御
const shouldAutoShow = (): boolean => {
  // 最近拒否された場合はスキップ
  const dismissed = localStorage.getItem('survey_dismissed')
  if (dismissed) {
    const dismissalData = JSON.parse(dismissed)
    const daysSinceDismissal = (Date.now() - dismissalData.timestamp) / (1000 * 60 * 60 * 24)
    if (daysSinceDismissal < 7) { // 7日間は表示しない
      return false
    }
  }

  // 最近完了した場合はスキップ
  const completed = localStorage.getItem('survey_completed')
  if (completed) {
    const completionData = JSON.parse(completed)
    const daysSinceCompletion = (Date.now() - completionData.timestamp) / (1000 * 60 * 60 * 24)
    if (daysSinceCompletion < 30) { // 30日間は表示しない
      return false
    }
  }

  return true
}

// 外部から呼び出し可能なメソッド
const showSurvey = () => {
  if (shouldAutoShow()) {
    show()
  }
}

// Lifecycle
onMounted(() => {
  if (props.autoShow && shouldAutoShow()) {
    show()
  }
})

// 公開メソッド
defineExpose({
  show: showSurvey,
  dismiss,
  isVisible: computed(() => isVisible.value)
})
</script>

<style scoped>
/* =================================
   満足度調査オーバーレイ
   ================================= */

.satisfaction-survey-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: var(--space-md);
  backdrop-filter: blur(4px);
  animation: overlayFadeIn 0.3s ease-out;
}

@keyframes overlayFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* =================================
   調査ウィンドウ
   ================================= */

.satisfaction-survey {
  background: var(--bg-primary);
  border-radius: 16px;
  border: 2px solid rgba(129, 140, 248, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow: hidden;
  position: relative;
  animation: surveySlideIn 0.4s ease-out;
}

@keyframes surveySlideIn {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* =================================
   ヘッダー
   ================================= */

.survey-header {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-lg);
  background: rgba(129, 140, 248, 0.1);
  border-bottom: 1px solid rgba(129, 140, 248, 0.2);
}

.survey-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.survey-content {
  flex: 1;
}

.survey-title {
  font-size: var(--text-lg);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin: 0 0 var(--space-xs) 0;
}

.survey-subtitle {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.4;
}

.survey-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.survey-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 1);
}

/* =================================
   フォーム
   ================================= */

.survey-form {
  padding: var(--space-lg);
  max-height: 60vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.section-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 var(--space-md) 0;
  text-align: center;
}

/* =================================
   絵文字評価
   ================================= */

.emoji-rating {
  display: flex;
  justify-content: space-between;
  gap: var(--space-sm);
}

.emoji-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md) var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex: 1;
  min-height: 80px;
}

.emoji-btn:hover,
.emoji-btn.selected {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(129, 140, 248, 0.1);
  transform: translateY(-2px);
}

.emoji {
  font-size: 2rem;
  line-height: 1;
}

.emoji-label {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  text-align: center;
}

/* =================================
   改善点・良かった点
   ================================= */

.improvement-options,
.positive-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--space-sm);
}

.issue-btn,
.positive-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  padding: var(--space-md) var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.issue-btn:hover,
.issue-btn.selected {
  border-color: rgba(239, 68, 68, 0.6);
  background: rgba(239, 68, 68, 0.1);
}

.positive-btn:hover,
.positive-btn.selected {
  border-color: rgba(34, 197, 94, 0.6);
  background: rgba(34, 197, 94, 0.1);
}

.issue-icon,
.positive-icon {
  font-size: var(--text-lg);
}

.issue-text,
.positive-text {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 500;
}

/* =================================
   推奨度
   ================================= */

.recommendation-buttons {
  display: flex;
  justify-content: center;
  gap: var(--space-lg);
}

.recommend-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-lg);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 100px;
}

.recommend-btn:hover,
.recommend-btn.selected {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(129, 140, 248, 0.1);
  transform: translateY(-2px);
}

.recommend-icon {
  font-size: 2rem;
}

.recommend-text {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.9);
  font-weight: 600;
}

/* =================================
   コメント
   ================================= */

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
  transition: border-color var(--transition-fast);
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
   アクション
   ================================= */

.survey-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--space-md);
  margin-top: var(--space-lg);
}

.btn-skip,
.btn-submit,
.btn-close {
  padding: var(--space-sm) var(--space-lg);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  border: none;
  font-size: var(--text-sm);
  min-width: 100px;
}

.btn-skip {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.btn-skip:hover {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.9);
}

.btn-submit,
.btn-close {
  background: var(--primary-gradient);
  color: white;
}

.btn-submit:hover:not(:disabled),
.btn-close:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* =================================
   感謝メッセージ
   ================================= */

.thank-you-section {
  padding: var(--space-xl);
  text-align: center;
  animation: thankYouFadeIn 0.5s ease-out;
}

@keyframes thankYouFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thank-you-icon {
  font-size: 3rem;
  margin-bottom: var(--space-lg);
}

.thank-you-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(34, 197, 94, 1);
  margin: 0 0 var(--space-md) 0;
}

.thank-you-message {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: var(--space-xl);
}

/* =================================
   プログレスバー
   ================================= */

.survey-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 0.3s ease-out;
  position: relative;
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* =================================
   レスポンシブ
   ================================= */

@media (max-width: 640px) {
  .satisfaction-survey-overlay {
    padding: var(--space-sm);
  }

  .satisfaction-survey {
    max-height: 95vh;
  }

  .survey-header {
    padding: var(--space-md);
  }

  .survey-form {
    padding: var(--space-md);
    max-height: 70vh;
  }

  .emoji-rating {
    flex-wrap: wrap;
    justify-content: center;
  }

  .emoji-btn {
    min-width: 60px;
  }

  .improvement-options,
  .positive-options {
    grid-template-columns: 1fr;
  }

  .recommendation-buttons {
    flex-direction: column;
    align-items: center;
  }

  .survey-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .survey-header {
    flex-direction: column;
    text-align: center;
    gap: var(--space-sm);
  }

  .survey-close {
    position: absolute;
    top: var(--space-sm);
    right: var(--space-sm);
  }

  .emoji-rating {
    gap: var(--space-xs);
  }

  .emoji-btn {
    min-width: 50px;
    padding: var(--space-sm) var(--space-xs);
  }

  .emoji {
    font-size: 1.5rem;
  }
}

/* =================================
   アクセシビリティ
   ================================= */

@media (prefers-reduced-motion: reduce) {
  .satisfaction-survey-overlay,
  .satisfaction-survey,
  .emoji-btn,
  .issue-btn,
  .positive-btn,
  .recommend-btn,
  .btn-submit,
  .thank-you-section {
    animation: none;
    transition: none;
  }

  .emoji-btn:hover,
  .issue-btn:hover,
  .positive-btn:hover,
  .recommend-btn:hover,
  .btn-submit:hover {
    transform: none;
  }

  .progress-bar::after {
    animation: none;
  }
}

.satisfaction-survey:focus-within {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

.emoji-btn:focus,
.issue-btn:focus,
.positive-btn:focus,
.recommend-btn:focus,
.btn-skip:focus,
.btn-submit:focus,
.btn-close:focus,
.survey-close:focus {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

/* ハイコントラストモード */
@media (prefers-contrast: high) {
  .satisfaction-survey {
    border: 3px solid white;
    background: #000;
  }

  .emoji-btn,
  .issue-btn,
  .positive-btn,
  .recommend-btn {
    border: 2px solid white;
  }

  .comment-textarea {
    border: 2px solid white;
  }
}
</style>