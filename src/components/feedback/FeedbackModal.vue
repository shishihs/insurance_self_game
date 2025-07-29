<template>
  <div v-if="isOpen" class="feedback-modal-overlay" @click="closeOnOverlay">
    <div class="feedback-modal" @click.stop role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <!-- ヘッダー -->
      <header class="feedback-header">
        <h2 id="feedback-title" class="feedback-title">
          {{ currentStep === 'selection' ? 'フィードバックを送信' : getStepTitle() }}
        </h2>
        <button
          @click="close"
          class="close-button"
          aria-label="フィードバックモーダルを閉じる"
          type="button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </header>

      <!-- ステップ選択 -->
      <div v-if="currentStep === 'selection'" class="feedback-selection">
        <p class="selection-description">
          ご意見やご要望をお聞かせください。あなたのフィードバックがゲームをより良くします。
        </p>
        
        <div class="feedback-options">
          <button
            v-for="option in feedbackOptions"
            :key="option.type"
            @click="selectFeedbackType(option.type)"
            class="feedback-option-btn"
            :aria-describedby="`option-${option.type}-desc`"
          >
            <div class="option-icon" :style="{ backgroundColor: option.color }">
              {{ option.icon }}
            </div>
            <div class="option-content">
              <h3 class="option-title">{{ option.title }}</h3>
              <p class="option-description" :id="`option-${option.type}-desc`">
                {{ option.description }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <!-- フィードバックフォーム -->
      <form v-else @submit.prevent="submitFeedback" class="feedback-form">
        <!-- カテゴリ別の専用フィールド -->
        <div v-if="selectedType === 'bug'" class="bug-report-fields">
          <div class="form-group">
            <label for="bug-severity" class="form-label">重要度</label>
            <select 
              id="bug-severity" 
              v-model="formData.bugReport.severity" 
              class="form-select"
              required
            >
              <option value="">選択してください</option>
              <option value="low">軽微 - 操作に支障なし</option>
              <option value="medium">中程度 - 一部操作に影響</option>
              <option value="high">重大 - ゲーム進行に支障</option>
              <option value="critical">致命的 - ゲームが停止</option>
            </select>
          </div>

          <div class="form-group">
            <label for="reproduction-rate" class="form-label">再現頻度</label>
            <select 
              id="reproduction-rate" 
              v-model="formData.bugReport.reproductionRate" 
              class="form-select"
              required
            >
              <option value="">選択してください</option>
              <option value="always">毎回発生</option>
              <option value="often">頻繁に発生</option>
              <option value="sometimes">時々発生</option>
              <option value="rarely">稀に発生</option>
            </select>
          </div>
        </div>

        <div v-if="selectedType === 'review'" class="review-fields">
          <div class="form-group">
            <label class="form-label">総合評価</label>
            <div class="star-rating">
              <button
                v-for="star in 5"
                :key="star"
                type="button"
                @click="setRating('overall', star)"
                class="star-button"
                :class="{ active: formData.review.overallRating >= star }"
                :aria-label="`総合評価 ${star} 星`"
              >
                ★
              </button>
            </div>
          </div>

          <div class="aspect-ratings">
            <div v-for="aspect in aspectRatings" :key="aspect.key" class="aspect-rating">
              <label class="form-label">{{ aspect.label }}</label>
              <div class="star-rating">
                <button
                  v-for="star in 5"
                  :key="star"
                  type="button"
                  @click="setRating(aspect.key, star)"
                  class="star-button"
                  :class="{ active: formData.review.aspects[aspect.key] >= star }"
                  :aria-label="`${aspect.label} ${star} 星`"
                >
                  ★
                </button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">
              <input
                type="checkbox"
                v-model="formData.review.wouldRecommend"
                class="form-checkbox"
              />
              このゲームを他の人におすすめしますか？
            </label>
          </div>
        </div>

        <!-- 共通フィールド -->
        <div class="form-group">
          <label for="feedback-title" class="form-label">
            タイトル <span class="required">*</span>
          </label>
          <input
            id="feedback-title"
            v-model="formData.title"
            type="text"
            class="form-input"
            placeholder="簡潔にお聞かせください"
            required
            maxlength="100"
          />
          <div class="character-count">{{ formData.title.length }}/100</div>
        </div>

        <div class="form-group">
          <label for="feedback-description" class="form-label">
            詳細 <span class="required">*</span>
          </label>
          <textarea
            id="feedback-description"
            v-model="formData.description"
            class="form-textarea"
            :placeholder="getDescriptionPlaceholder()"
            required
            rows="5"
            maxlength="1000"
          ></textarea>
          <div class="character-count">{{ formData.description.length }}/1000</div>
        </div>

        <!-- バグレポート専用フィールド -->
        <div v-if="selectedType === 'bug'" class="bug-specific-fields">
          <div class="form-group">
            <label for="steps-to-reproduce" class="form-label">
              再現手順 <span class="required">*</span>
            </label>
            <textarea
              id="steps-to-reproduce"
              v-model="formData.bugReport.stepsToReproduce"
              class="form-textarea"
              placeholder="1. ○○をクリック&#10;2. △△を選択&#10;3. □□が発生"
              required
              rows="4"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="expected-behavior" class="form-label">期待される動作</label>
            <textarea
              id="expected-behavior"
              v-model="formData.bugReport.expectedBehavior"
              class="form-textarea"
              placeholder="本来はどのような動作を期待していましたか？"
              rows="2"
            ></textarea>
          </div>

          <div class="form-group">
            <label for="actual-behavior" class="form-label">実際の動作</label>
            <textarea
              id="actual-behavior"
              v-model="formData.bugReport.actualBehavior"
              class="form-textarea"
              placeholder="実際にはどのような動作が発生しましたか？"
              rows="2"
            ></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">
              <input
                type="checkbox"
                v-model="includeScreenshot"
                class="form-checkbox"
              />
              スクリーンショットを含める（推奨）
            </label>
            <p class="form-help">スクリーンショットは問題の特定に役立ちます</p>
          </div>
        </div>

        <!-- 送信者情報 -->
        <div class="submitter-section">
          <h3 class="section-title">送信者情報（任意）</h3>
          
          <div class="form-group">
            <label class="form-label">
              <input
                type="checkbox"
                v-model="isAnonymous"
                class="form-checkbox"
              />
              匿名で送信する
            </label>
            <p class="form-help">
              匿名の場合、返信はできませんが、フィードバックは大切に活用させていただきます
            </p>
          </div>

          <div v-if="!isAnonymous" class="contact-fields">
            <div class="form-group">
              <label for="submitter-name" class="form-label">お名前</label>
              <input
                id="submitter-name"
                v-model="formData.submitter.name"
                type="text"
                class="form-input"
                placeholder="田中太郎"
                maxlength="50"
              />
            </div>

            <div class="form-group">
              <label for="submitter-email" class="form-label">メールアドレス</label>
              <input
                id="submitter-email"
                v-model="formData.submitter.email"
                type="email"
                class="form-input"
                placeholder="example@example.com"
              />
              <p class="form-help">返信が必要な場合のみご入力ください</p>
            </div>
          </div>
        </div>

        <!-- アクションボタン -->
        <div class="form-actions">
          <button
            type="button"
            @click="goBack"
            class="btn-secondary"
          >
            戻る
          </button>
          <button
            type="submit"
            class="btn-primary"
            :disabled="!isFormValid || isSubmitting"
          >
            <span v-if="isSubmitting">送信中...</span>
            <span v-else>送信する</span>
          </button>
        </div>
      </form>

      <!-- 送信完了画面 -->
      <div v-if="currentStep === 'success'" class="success-message">
        <div class="success-icon">✅</div>
        <h3 class="success-title">フィードバックを送信しました</h3>
        <p class="success-description">
          貴重なご意見をありがとうございます。
          {{isAnonymous ? 'いただいたフィードバックは今後の改善に活用させていただきます。' : 'ご連絡先をいただいている場合は、必要に応じて返信いたします。'}}
        </p>
        <button @click="close" class="btn-primary">閉じる</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { FeedbackManagementService } from '../../domain/services/FeedbackManagementService'
import type { SatisfactionRating } from '../../domain/entities/Feedback';
import { FeedbackCategory } from '../../domain/entities/Feedback'

// Props & Emits
interface Props {
  isOpen: boolean
  gameState?: {
    stage: string
    turn: number
    vitality: number
    phase: string
  }
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false
})

const emit = defineEmits<{
  close: []
  feedbackSubmitted: [feedbackId: string]
}>()

// Services
const feedbackService = new FeedbackManagementService()

// State
const currentStep = ref<'selection' | 'form' | 'success'>('selection')
const selectedType = ref<string>('')
const isSubmitting = ref(false)
const isAnonymous = ref(true)
const includeScreenshot = ref(false)

// Form Data
const formData = reactive({
  title: '',
  description: '',
  submitter: {
    name: '',
    email: ''
  },
  bugReport: {
    severity: '',
    reproductionRate: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: ''
  },
  review: {
    overallRating: 0,
    aspects: {
      gameplay: 0,
      ui: 0,
      performance: 0,
      accessibility: 0
    },
    wouldRecommend: false
  }
})

// Feedback Options
const feedbackOptions = [
  {
    type: 'bug',
    title: 'バグ報告',
    description: '動作不良や予期しない動作を報告',
    icon: '🐛',
    color: '#EF4444'
  },
  {
    type: 'feature',
    title: '機能要望',
    description: '新しい機能やゲームプレイの改善案',
    icon: '💡',
    color: '#3B82F6'
  },
  {
    type: 'ui',
    title: 'UI/UX改善',
    description: 'インターフェースの使いやすさ向上',
    icon: '🎨',
    color: '#8B5CF6'
  },
  {
    type: 'review',
    title: '評価・レビュー',
    description: 'ゲーム全体の評価とご感想',
    icon: '⭐',
    color: '#F59E0B'
  },
  {
    type: 'accessibility',
    title: 'アクセシビリティ',
    description: 'バリアフリー・操作性の改善提案',
    icon: '♿',
    color: '#10B981'
  },
  {
    type: 'general',
    title: 'その他',
    description: '上記以外のご意見・ご質問',
    icon: '💬',
    color: '#6B7280'
  }
]

// Aspect Ratings
const aspectRatings = [
  { key: 'gameplay', label: 'ゲームプレイ' },
  { key: 'ui', label: 'UI・操作性' },
  { key: 'performance', label: 'パフォーマンス' },
  { key: 'accessibility', label: 'アクセシビリティ' }
]

// Computed
const isFormValid = computed(() => {
  if (!formData.title.trim() || !formData.description.trim()) {
    return false
  }

  if (selectedType.value === 'bug') {
    return formData.bugReport.severity && 
           formData.bugReport.reproductionRate && 
           formData.bugReport.stepsToReproduce.trim()
  }

  if (selectedType.value === 'review') {
    return formData.review.overallRating > 0
  }

  return true
})

// Methods
const selectFeedbackType = (type: string) => {
  selectedType.value = type
  currentStep.value = 'form'
}

const goBack = () => {
  if (currentStep.value === 'form') {
    currentStep.value = 'selection'
  }
}

const close = () => {
  resetForm()
  emit('close')
}

const closeOnOverlay = (event: MouseEvent) => {
  if (event.target === event.currentTarget) {
    close()
  }
}

const setRating = (type: string, rating: number) => {
  if (type === 'overall') {
    formData.review.overallRating = rating
  } else {
    formData.review.aspects[type as keyof typeof formData.review.aspects] = rating
  }
}

const getStepTitle = () => {
  const option = feedbackOptions.find(opt => opt.type === selectedType.value)
  return option ? option.title : 'フィードバック'
}

const getDescriptionPlaceholder = () => {
  switch (selectedType.value) {
    case 'bug':
      return 'どのような問題が発生しましたか？できるだけ詳しく教えてください。'
    case 'feature':
      return 'どのような機能があると良いと思いますか？具体的なアイデアをお聞かせください。'
    case 'ui':
      return 'どの部分を改善すべきでしょうか？より使いやすくするための提案をお願いします。'
    case 'review':
      return 'ゲーム全体の感想や、特に良かった点・改善すべき点をお聞かせください。'
    case 'accessibility':
      return 'どのような機能や改善があると、より利用しやすくなりますか？'
    default:
      return 'ご意見やご質問をお聞かせください。'
  }
}

const getCategoryFromType = (type: string): FeedbackCategory => {
  const mapping: Record<string, FeedbackCategory> = {
    bug: FeedbackCategory.BUG_REPORT,
    feature: FeedbackCategory.FEATURE_REQUEST,
    ui: FeedbackCategory.UI_UX,
    review: FeedbackCategory.GENERAL,
    accessibility: FeedbackCategory.ACCESSIBILITY,
    general: FeedbackCategory.GENERAL
  }
  return mapping[type] || FeedbackCategory.GENERAL
}

const submitFeedback = async () => {
  if (!isFormValid.value || isSubmitting.value) return

  isSubmitting.value = true

  try {
    // スクリーンショットを取得（バグレポートで選択された場合）
    let screenshot: string | undefined
    if (selectedType.value === 'bug' && includeScreenshot.value) {
      screenshot = await captureScreenshot()
    }

    // システム情報を収集
    const systemInfo = {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      gameVersion: '0.2.7', // TODO: バージョンを動的に取得
      timestamp: new Date(),
      gameState: props.gameState
    }

    // 送信者情報
    const submitter = {
      name: isAnonymous.value ? undefined : formData.submitter.name || undefined,
      email: isAnonymous.value ? undefined : formData.submitter.email || undefined,
      isAnonymous: isAnonymous.value,
      userAgent: navigator.userAgent,
      sessionId: generateSessionId()
    }

    // フィードバック作成パラメータ
    const createParams = {
      category: getCategoryFromType(selectedType.value),
      title: formData.title.trim(),
      description: formData.description.trim(),
      submitter,
      systemInfo,
      tags: [selectedType.value]
    }

    // カテゴリ別の詳細データを追加
    if (selectedType.value === 'bug') {
      createParams.bugReportData = {
        stepsToReproduce: formData.bugReport.stepsToReproduce.split('\n').filter(step => step.trim()),
        expectedBehavior: formData.bugReport.expectedBehavior,
        actualBehavior: formData.bugReport.actualBehavior,
        screenshot,
        severity: formData.bugReport.severity as 'low' | 'medium' | 'high' | 'critical',
        reproductionRate: formData.bugReport.reproductionRate as 'always' | 'often' | 'sometimes' | 'rarely'
      }
    }

    if (selectedType.value === 'review') {
      createParams.reviewData = {
        overallRating: formData.review.overallRating as SatisfactionRating,
        aspects: {
          gameplay: formData.review.aspects.gameplay as SatisfactionRating,
          ui: formData.review.aspects.ui as SatisfactionRating,
          performance: formData.review.aspects.performance as SatisfactionRating,
          accessibility: formData.review.aspects.accessibility as SatisfactionRating
        },
        wouldRecommend: formData.review.wouldRecommend,
        playTime: calculatePlayTime()
      }
    }

    // フィードバックを作成
    const feedback = feedbackService.createFeedback(createParams)
    
    // 成功通知
    currentStep.value = 'success'
    emit('feedbackSubmitted', feedback.id)

    // アナリティクス送信（将来的に実装）
    trackFeedbackSubmission(selectedType.value, feedback.id)

  } catch (error) {
    console.error('Failed to submit feedback:', error)
    alert('フィードバックの送信に失敗しました。しばらく後にもう一度お試しください。')
  } finally {
    isSubmitting.value = false
  }
}

const captureScreenshot = async (): Promise<string | undefined> => {
  try {
    // HTML2Canvasまたは類似のライブラリを使用してスクリーンショットを取得
    // 現在は簡易実装として、canvas要素から画像データを取得
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // 簡易的な実装（実際にはhtml2canvasなどを使用）
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.fillText(`Screenshot captured at ${  new Date().toLocaleString()}`, 10, 30)

    return canvas.toDataURL('image/png')
  } catch (error) {
    console.error('Failed to capture screenshot:', error)
    return undefined
  }
}

const generateSessionId = (): string => {
  return `session_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`
}

const calculatePlayTime = (): number => {
  // 実際の実装では、ゲーム開始からの経過時間を計算
  return Math.floor(Math.random() * 3600) // 仮の実装
}

const trackFeedbackSubmission = (type: string, feedbackId: string) => {
  // アナリティクスイベントを送信
  console.log(`Feedback submitted: ${type} (${feedbackId})`)
}

const resetForm = () => {
  currentStep.value = 'selection'
  selectedType.value = ''
  isSubmitting.value = false
  isAnonymous.value = true
  includeScreenshot.value = false
  
  // フォームデータをリセット
  Object.assign(formData, {
    title: '',
    description: '',
    submitter: { name: '', email: '' },
    bugReport: {
      severity: '',
      reproductionRate: '',
      stepsToReproduce: '',
      expectedBehavior: '',
      actualBehavior: ''
    },
    review: {
      overallRating: 0,
      aspects: { gameplay: 0, ui: 0, performance: 0, accessibility: 0 },
      wouldRecommend: false
    }
  })
}

// Watchers
watch(() => props.isOpen, (isOpen) => {
  if (isOpen) {
    // モーダルが開かれた時の処理
    document.body.style.overflow = 'hidden'
  } else {
    // モーダルが閉じられた時の処理
    document.body.style.overflow = ''
    resetForm()
  }
})

// Lifecycle
onMounted(() => {
  // 既存のフィードバックサービスが利用可能かチェック
  if (!feedbackService) {
    console.warn('FeedbackManagementService is not available')
  }
})
</script>

<style scoped>
/* =================================
   モーダルベース
   ================================= */

.feedback-modal-overlay {
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

.feedback-modal {
  background: var(--bg-primary);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(129, 140, 248, 0.2);
}

/* =================================
   ヘッダー
   ================================= */

.feedback-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-lg);
  border-bottom: 1px solid rgba(129, 140, 248, 0.2);
  background: rgba(129, 140, 248, 0.05);
}

.feedback-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin: 0;
}

.close-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  padding: var(--space-xs);
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  color: rgba(255, 255, 255, 1);
  background: rgba(255, 255, 255, 0.1);
}

/* =================================
   フィードバック選択
   ================================= */

.feedback-selection {
  padding: var(--space-lg);
}

.selection-description {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--space-lg);
  line-height: 1.6;
}

.feedback-options {
  display: grid;
  gap: var(--space-md);
}

.feedback-option-btn {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--transition-normal);
  text-align: left;
  width: 100%;
}

.feedback-option-btn:hover {
  border-color: rgba(129, 140, 248, 0.5);
  background: rgba(129, 140, 248, 0.1);
  transform: translateY(-2px);
}

.option-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  flex-shrink: 0;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0 0 var(--space-xs) 0;
}

.option-description {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
  margin: 0;
  line-height: 1.4;
}

/* =================================
   フォーム
   ================================= */

.feedback-form {
  padding: var(--space-lg);
}

.form-group {
  margin-bottom: var(--space-lg);
}

.form-label {
  display: block;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: var(--space-sm);
  font-size: var(--text-sm);
}

.required {
  color: #EF4444;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
  transition: border-color var(--transition-fast);
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(255, 255, 255, 0.08);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
}

.form-checkbox {
  margin-right: var(--space-sm);
  accent-color: rgba(129, 140, 248, 1);
}

.character-count {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.5);
  text-align: right;
  margin-top: var(--space-xs);
}

.form-help {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
  margin-top: var(--space-xs);
  margin-bottom: 0;
}

/* =================================
   評価システム
   ================================= */

.star-rating {
  display: flex;
  gap: var(--space-xs);
  margin-top: var(--space-xs);
}

.star-button {
  background: none;
  border: none;
  font-size: var(--text-xl);
  color: rgba(255, 255, 255, 0.3);
  cursor: pointer;
  transition: color var(--transition-fast);
  padding: var(--space-xs);
}

.star-button:hover,
.star-button.active {
  color: #F59E0B;
}

.aspect-ratings {
  display: grid;
  gap: var(--space-md);
  margin-top: var(--space-md);
}

.aspect-rating {
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

/* =================================
   セクション
   ================================= */

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(129, 140, 248, 1);
  margin: 0 0 var(--space-md) 0;
  padding-top: var(--space-lg);
  border-top: 1px solid rgba(129, 140, 248, 0.2);
}

.submitter-section .section-title {
  border-top: none;
  padding-top: 0;
}

.contact-fields {
  display: grid;
  gap: var(--space-md);
}

/* =================================
   アクションボタン
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
   成功画面
   ================================= */

.success-message {
  padding: var(--space-xl);
  text-align: center;
}

.success-icon {
  font-size: 4rem;
  margin-bottom: var(--space-lg);
}

.success-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(34, 197, 94, 1);
  margin: 0 0 var(--space-md) 0;
}

.success-description {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin-bottom: var(--space-xl);
}

/* =================================
   レスポンシブ
   ================================= */

@media (max-width: 640px) {
  .feedback-modal-overlay {
    padding: var(--space-sm);
  }

  .feedback-modal {
    max-height: 95vh;
  }

  .feedback-header,
  .feedback-selection,
  .feedback-form,
  .success-message {
    padding: var(--space-md);
  }

  .feedback-options {
    gap: var(--space-sm);
  }

  .feedback-option-btn {
    flex-direction: column;
    text-align: center;
    gap: var(--space-sm);
  }

  .contact-fields {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .aspect-ratings {
    gap: var(--space-sm);
  }
}

/* =================================
   アクセシビリティ
   ================================= */

@media (prefers-reduced-motion: reduce) {
  .feedback-option-btn,
  .btn-primary,
  .btn-secondary,
  .star-button {
    transition: none;
  }

  .feedback-option-btn:hover,
  .btn-primary:hover {
    transform: none;
  }
}

.feedback-modal:focus-within {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

.form-input:invalid,
.form-textarea:invalid,
.form-select:invalid {
  border-color: #EF4444;
}

.form-input:invalid:focus,
.form-textarea:invalid:focus,
.form-select:invalid:focus {
  border-color: #EF4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
</style>