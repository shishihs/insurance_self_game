<template>
  <div class="bug-reporter">
    <!-- ヘッダー -->
    <div class="bug-reporter-header">
      <div class="header-icon">🐛</div>
      <div class="header-content">
        <h3 class="header-title">バグレポート</h3>
        <p class="header-subtitle">
          問題の詳細を教えてください。スクリーンショットや詳細な手順があると解決が早くなります。
        </p>
      </div>
    </div>

    <form @submit.prevent="submitBugReport" class="bug-report-form">
      <!-- クイック分類 -->
      <div class="form-section">
        <h4 class="section-title">問題の種類</h4>
        <div class="bug-categories">
          <button
            v-for="category in bugCategories"
            :key="category.id"
            type="button"
            @click="selectCategory(category)"
            class="category-btn"
            :class="{ selected: selectedCategory?.id === category.id }"
            :aria-describedby="`category-${category.id}-desc`"
          >
            <div class="category-icon" :style="{ backgroundColor: category.color }">
              {{ category.icon }}
            </div>
            <div class="category-content">
              <div class="category-title">{{ category.title }}</div>
              <div class="category-description" :id="`category-${category.id}-desc`">
                {{ category.description }}
              </div>
            </div>
          </button>
        </div>
      </div>

      <!-- 重要度選択 -->
      <div class="form-section">
        <label for="severity" class="form-label">
          重要度 <span class="required">*</span>
        </label>
        <select 
          id="severity" 
          v-model="formData.severity" 
          class="form-select"
          required
          @change="updateSeverityDescription"
        >
          <option value="">選択してください</option>
          <option value="low">軽微 - 操作に支障なし</option>
          <option value="medium">中程度 - 一部操作に影響</option>
          <option value="high">重大 - ゲーム進行に支障</option>
          <option value="critical">致命的 - ゲームが停止</option>
        </select>
        <div v-if="severityDescription" class="severity-description">
          {{ severityDescription }}
        </div>
      </div>

      <!-- タイトル -->
      <div class="form-section">
        <label for="bug-title" class="form-label">
          問題のタイトル <span class="required">*</span>
        </label>
        <input
          id="bug-title"
          v-model="formData.title"
          type="text"
          class="form-input"
          :placeholder="getTitlePlaceholder()"
          required
          maxlength="100"
        />
        <div class="character-count">{{ formData.title.length }}/100</div>
      </div>

      <!-- 問題の説明 -->
      <div class="form-section">
        <label for="bug-description" class="form-label">
          問題の詳細 <span class="required">*</span>
        </label>
        <textarea
          id="bug-description"
          v-model="formData.description"
          class="form-textarea"
          placeholder="どのような問題が発生しましたか？できるだけ詳しく説明してください。"
          required
          rows="4"
          maxlength="1000"
        ></textarea>
        <div class="character-count">{{ formData.description.length }}/1000</div>
      </div>

      <!-- 再現手順 -->
      <div class="form-section">
        <label for="reproduction-steps" class="form-label">
          再現手順 <span class="required">*</span>
        </label>
        <div class="steps-helper">
          <div class="helper-tabs">
            <button
              type="button"
              @click="stepsInputMode = 'manual'"
              class="helper-tab"
              :class="{ active: stepsInputMode === 'manual' }"
            >
              手動入力
            </button>
            <button
              type="button"
              @click="stepsInputMode = 'guided'"
              class="helper-tab"
              :class="{ active: stepsInputMode === 'guided' }"
            >
              ステップ形式
            </button>
          </div>

          <div v-if="stepsInputMode === 'manual'" class="manual-input">
            <textarea
              id="reproduction-steps"
              v-model="formData.stepsToReproduce"
              class="form-textarea"
              placeholder="1. ○○をクリック&#10;2. △△を選択&#10;3. □□が発生"
              required
              rows="5"
            ></textarea>
          </div>

          <div v-else class="guided-input">
            <div class="steps-list">
              <div
                v-for="(step, index) in guidedSteps"
                :key="index"
                class="step-item"
              >
                <div class="step-number">{{ index + 1 }}</div>
                <input
                  v-model="guidedSteps[index]"
                  type="text"
                  class="step-input"
                  :placeholder="`ステップ ${index + 1} の操作内容`"
                  @input="updateStepsFromGuided"
                />
                <button
                  v-if="guidedSteps.length > 1"
                  type="button"
                  @click="removeStep(index)"
                  class="remove-step-btn"
                  aria-label="このステップを削除"
                >
                  ×
                </button>
              </div>
            </div>
            <button
              type="button"
              @click="addStep"
              class="add-step-btn"
              :disabled="guidedSteps.length >= 10"
            >
              + ステップを追加
            </button>
          </div>
        </div>
      </div>

      <!-- 期待される動作 -->
      <div class="form-section">
        <label for="expected-behavior" class="form-label">期待される動作</label>
        <textarea
          id="expected-behavior"
          v-model="formData.expectedBehavior"
          class="form-textarea"
          placeholder="本来はどのような動作を期待していましたか？"
          rows="3"
        ></textarea>
      </div>

      <!-- 実際の動作 -->
      <div class="form-section">
        <label for="actual-behavior" class="form-label">実際の動作</label>
        <textarea
          id="actual-behavior"
          v-model="formData.actualBehavior"
          class="form-textarea"
          placeholder="実際にはどのような動作が発生しましたか？"
          rows="3"
        ></textarea>
      </div>

      <!-- 再現頻度 -->
      <div class="form-section">
        <label for="reproduction-rate" class="form-label">
          再現頻度 <span class="required">*</span>
        </label>
        <div class="frequency-options">
          <label
            v-for="freq in frequencyOptions"
            :key="freq.value"
            class="frequency-option"
          >
            <input
              type="radio"
              v-model="formData.reproductionRate"
              :value="freq.value"
              class="frequency-radio"
              required
            />
            <div class="frequency-content">
              <div class="frequency-label">{{ freq.label }}</div>
              <div class="frequency-description">{{ freq.description }}</div>
            </div>
          </label>
        </div>
      </div>

      <!-- エラーメッセージ -->
      <div class="form-section">
        <label for="error-message" class="form-label">エラーメッセージ（もしあれば）</label>
        <textarea
          id="error-message"
          v-model="formData.errorMessage"
          class="form-textarea mono-font"
          placeholder="表示されたエラーメッセージをそのままコピー&ペーストしてください"
          rows="3"
        ></textarea>
      </div>

      <!-- スクリーンショット -->
      <div class="form-section">
        <div class="screenshot-section">
          <div class="screenshot-header">
            <label class="form-label">スクリーンショット</label>
            <div class="screenshot-actions">
              <button
                type="button"
                @click="captureScreenshot"
                class="capture-btn"
                :disabled="isCapturing"
              >
                <span v-if="isCapturing">撮影中...</span>
                <span v-else>📸 画面を撮影</span>
              </button>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileUpload"
                class="file-input"
                style="display: none"
              />
              <button
                type="button"
                @click="$refs.fileInput?.click()"
                class="upload-btn"
              >
                📁 ファイルを選択
              </button>
            </div>
          </div>
          
          <div v-if="screenshots.length > 0" class="screenshots-preview">
            <div
              v-for="(screenshot, index) in screenshots"
              :key="index"
              class="screenshot-item"
            >
              <img
                :src="screenshot.data"
                :alt="`スクリーンショット ${index + 1}`"
                class="screenshot-image"
                @click="previewImage(screenshot.data)"
              />
              <div class="screenshot-info">
                <div class="screenshot-name">{{ screenshot.name }}</div>
                <div class="screenshot-size">{{ formatFileSize(screenshot.size) }}</div>
              </div>
              <button
                type="button"
                @click="removeScreenshot(index)"
                class="remove-screenshot-btn"
                aria-label="スクリーンショットを削除"
              >
                ×
              </button>
            </div>
          </div>
          
          <div v-else class="no-screenshots">
            <div class="no-screenshots-icon">📷</div>
            <p class="no-screenshots-text">
              スクリーンショットがあると問題の特定が早くなります
            </p>
          </div>
        </div>
      </div>

      <!-- システム情報の自動収集 -->
      <div class="form-section">
        <div class="system-info-section">
          <h4 class="section-title">システム情報</h4>
          <div class="system-info-toggle">
            <label class="toggle-label">
              <input
                type="checkbox"
                v-model="includeSystemInfo"
                class="toggle-checkbox"
              />
              <span class="toggle-slider"></span>
              システム情報を含める（推奨）
            </label>
            <p class="toggle-description">
              ブラウザ情報、画面サイズ、ゲーム状態などを自動で収集します
            </p>
          </div>
          
          <div v-if="includeSystemInfo && systemInfo" class="system-info-preview">
            <div class="info-item">
              <span class="info-label">ブラウザ:</span>
              <span class="info-value">{{ getBrowserName() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">画面サイズ:</span>
              <span class="info-value">{{ systemInfo.screenResolution }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">ゲーム状態:</span>
              <span class="info-value">{{ getGameStateText() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 送信者情報 -->
      <div class="form-section">
        <h4 class="section-title">連絡先（任意）</h4>
        <div class="contact-toggle">
          <label class="toggle-label">
            <input
              type="checkbox"
              v-model="provideContact"
              class="toggle-checkbox"
            />
            <span class="toggle-slider"></span>
            連絡先を提供する
          </label>
          <p class="toggle-description">
            進捗の通知や追加情報の確認が必要な場合にご連絡します
          </p>
        </div>
        
        <div v-if="provideContact" class="contact-fields">
          <div class="contact-field">
            <label for="contact-email" class="form-label">メールアドレス</label>
            <input
              id="contact-email"
              v-model="formData.contactEmail"
              type="email"
              class="form-input"
              placeholder="example@example.com"
            />
          </div>
          <div class="contact-field">
            <label for="contact-name" class="form-label">お名前</label>
            <input
              id="contact-name"
              v-model="formData.contactName"
              type="text"
              class="form-input"
              placeholder="田中太郎"
              maxlength="50"
            />
          </div>
        </div>
      </div>

      <!-- 送信ボタン -->
      <div class="form-actions">
        <button
          type="button"
          @click="resetForm"
          class="btn-secondary"
        >
          リセット
        </button>
        <button
          type="submit"
          class="btn-primary"
          :disabled="!isFormValid || isSubmitting"
        >
          <span v-if="isSubmitting">送信中...</span>
          <span v-else>バグレポートを送信</span>
        </button>
      </div>
    </form>

    <!-- 画像プレビューモーダル -->
    <div v-if="previewImageUrl" class="image-preview-modal" @click="closeImagePreview">
      <div class="preview-content" @click.stop>
        <img :src="previewImageUrl" alt="プレビュー画像" class="preview-image" />
        <button @click="closeImagePreview" class="close-preview-btn">×</button>
      </div>
    </div>

    <!-- 送信成功メッセージ -->
    <div v-if="showSuccessMessage" class="success-overlay">
      <div class="success-content">
        <div class="success-icon">✅</div>
        <h3 class="success-title">バグレポートを送信しました</h3>
        <div class="success-details">
          <p class="report-id">レポートID: <code>{{ submittedReportId }}</code></p>
          <p class="success-message">
            {{ provideContact 
              ? 'ご連絡先をいただいているため、進捗があればお知らせします。' 
              : 'バグの修正状況は今後のアップデート情報でご確認ください。' }}
          </p>
        </div>
        <div class="success-actions">
          <button @click="createAnotherReport" class="btn-secondary">
            別のバグを報告
          </button>
          <button @click="closeReporter" class="btn-primary">
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { FeedbackManagementService } from '../../domain/services/FeedbackManagementService'

// Props & Emits
interface Props {
  gameState?: {
    stage: string
    turn: number
    vitality: number
    phase: string
  }
}

const props = defineProps<Props>()

const emit = defineEmits<{
  bugReported: [reportId: string]
  close: []
}>()

// Services
const feedbackService = new FeedbackManagementService()

// State
const stepsInputMode = ref<'manual' | 'guided'>('manual')
const guidedSteps = ref<string[]>([''])
const screenshots = ref<Array<{ name: string; data: string; size: number }>>([])
const isCapturing = ref(false)
const includeSystemInfo = ref(true)
const provideContact = ref(false)
const isSubmitting = ref(false)
const showSuccessMessage = ref(false)
const submittedReportId = ref('')
const previewImageUrl = ref('')
const selectedCategory = ref<any>(null)
const severityDescription = ref('')
const systemInfo = ref<any>(null)

// Form Data
const formData = reactive({
  severity: '',
  title: '',
  description: '',
  stepsToReproduce: '',
  expectedBehavior: '',
  actualBehavior: '',
  reproductionRate: '',
  errorMessage: '',
  contactEmail: '',
  contactName: ''
})

// Bug Categories
const bugCategories = [
  {
    id: 'ui',
    title: 'UI・表示の問題',
    description: 'ボタンが押せない、表示が崩れるなど',
    icon: '🎨',
    color: '#8B5CF6'
  },
  {
    id: 'gameplay',
    title: 'ゲームプレイの問題',
    description: 'カードが選択できない、ゲームが進まないなど',
    icon: '🎮',
    color: '#3B82F6'
  },
  {
    id: 'performance',
    title: 'パフォーマンスの問題',
    description: '動作が重い、フリーズするなど',
    icon: '⚡',
    color: '#F59E0B'
  },
  {
    id: 'audio',
    title: '音声の問題',
    description: '音が出ない、音量調整ができないなど',
    icon: '🔊',
    color: '#10B981'
  },
  {
    id: 'save',
    title: 'セーブ・ロードの問題',
    description: '進行状況が保存されない、読み込めないなど',
    icon: '💾',
    color: '#EF4444'
  },
  {
    id: 'other',
    title: 'その他',
    description: '上記に当てはまらない問題',
    icon: '❓',
    color: '#6B7280'
  }
]

// Frequency Options
const frequencyOptions = [
  {
    value: 'always',
    label: '毎回発生',
    description: '同じ操作をすると必ず発生する'
  },
  {
    value: 'often',
    label: '頻繁に発生',
    description: '半分以上の確率で発生する'
  },
  {
    value: 'sometimes',
    label: '時々発生',
    description: 'たまに発生する'
  },
  {
    value: 'rarely',
    label: '稀に発生',
    description: '一度だけ、または非常に稀に発生'
  }
]

// Computed
const isFormValid = computed(() => {
  return formData.severity &&
         formData.title.trim() &&
         formData.description.trim() &&
         formData.stepsToReproduce.trim() &&
         formData.reproductionRate
})

// Methods
const selectCategory = (category: any) => {
  selectedCategory.value = selectedCategory.value?.id === category.id ? null : category
  if (selectedCategory.value && !formData.title) {
    // カテゴリに基づいてタイトルのテンプレートを提案
    const templates = {
      ui: 'UIの表示に関する問題',
      gameplay: 'ゲームプレイの進行に関する問題',
      performance: 'パフォーマンスに関する問題',
      audio: '音声に関する問題',
      save: 'セーブ・ロードに関する問題',
      other: 'その他の問題'
    }
    // ここではタイトルは自動設定せず、プレースホルダーで誘導
  }
}

const getTitlePlaceholder = () => {
  if (selectedCategory.value) {
    const placeholders = {
      ui: '例: ○○ボタンが押せない',
      gameplay: '例: カード選択後にゲームが進まない',
      performance: '例: ゲーム開始時に長時間フリーズする',
      audio: '例: 効果音が再生されない',
      save: '例: ゲーム終了後にスコアが保存されない',
      other: '例: 具体的な問題を簡潔に'
    }
    return placeholders[selectedCategory.value.id as keyof typeof placeholders] || '問題を簡潔に説明してください'
  }
  return '問題を簡潔に説明してください'
}

const updateSeverityDescription = () => {
  const descriptions = {
    low: '機能は使えるが、改善の余地がある軽微な問題',
    medium: 'いくつかの機能に影響するが、回避方法がある問題',
    high: 'ゲームの主要機能に大きく影響する問題',
    critical: 'ゲームが全く使用できない、またはデータ損失の可能性がある問題'
  }
  severityDescription.value = descriptions[formData.severity as keyof typeof descriptions] || ''
}

const addStep = () => {
  if (guidedSteps.value.length < 10) {
    guidedSteps.value.push('')
  }
}

const removeStep = (index: number) => {
  if (guidedSteps.value.length > 1) {
    guidedSteps.value.splice(index, 1)
    updateStepsFromGuided()
  }
}

const updateStepsFromGuided = () => {
  formData.stepsToReproduce = guidedSteps.value
    .filter(step => step.trim())
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n')
}

const captureScreenshot = async () => {
  isCapturing.value = true
  try {
    // 簡易的なスクリーンショット実装
    // 実際の実装では html2canvas などを使用
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not available')

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    
    // 背景色を設定
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    // テキストを描画（実際の画面キャプチャの代替）
    ctx.fillStyle = '#ffffff'
    ctx.font = '16px Arial'
    ctx.fillText(`Screenshot captured at ${new Date().toLocaleString()}`, 10, 30)
    ctx.fillText(`Browser: ${navigator.userAgent.split(' ').slice(-1)[0]}`, 10, 60)
    ctx.fillText(`Screen: ${canvas.width}x${canvas.height}`, 10, 90)
    
    if (props.gameState) {
      ctx.fillText(`Game Stage: ${props.gameState.stage}`, 10, 120)
      ctx.fillText(`Turn: ${props.gameState.turn}`, 10, 150)
      ctx.fillText(`Vitality: ${props.gameState.vitality}`, 10, 180)
    }

    const dataUrl = canvas.toDataURL('image/png')
    const size = Math.round((dataUrl.length * 3) / 4) // Base64 size estimation
    
    screenshots.value.push({
      name: `screenshot_${Date.now()}.png`,
      data: dataUrl,
      size
    })
  } catch (error) {
    console.error('Failed to capture screenshot:', error)
    alert('スクリーンショットの撮影に失敗しました。')
  } finally {
    isCapturing.value = false
  }
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files) return

  Array.from(files).forEach(file => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        if (result) {
          screenshots.value.push({
            name: file.name,
            data: result,
            size: file.size
          })
        }
      }
      reader.readAsDataURL(file)
    }
  })
  
  // ファイル入力をリセット
  target.value = ''
}

const removeScreenshot = (index: number) => {
  screenshots.value.splice(index, 1)
}

const previewImage = (imageData: string) => {
  previewImageUrl.value = imageData
}

const closeImagePreview = () => {
  previewImageUrl.value = ''
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / k**i).toFixed(2))  } ${  sizes[i]}`
}

const getBrowserName = (): string => {
  const userAgent = navigator.userAgent
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  return 'Unknown'
}

const getGameStateText = (): string => {
  if (!props.gameState) return 'Unknown'
  return `${props.gameState.stage} - Turn ${props.gameState.turn}`
}

const submitBugReport = async () => {
  if (!isFormValid.value || isSubmitting.value) return

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

    // 送信者情報
    const submitter = {
      name: provideContact.value ? formData.contactName || undefined : undefined,
      email: provideContact.value ? formData.contactEmail || undefined : undefined,
      isAnonymous: !provideContact.value,
      userAgent: navigator.userAgent,
      sessionId: generateSessionId()
    }

    // バグレポートデータ
    const bugReportData = {
      stepsToReproduce: formData.stepsToReproduce.split('\n').filter(step => step.trim()),
      expectedBehavior: formData.expectedBehavior,
      actualBehavior: formData.actualBehavior,
      errorMessage: formData.errorMessage || undefined,
      severity: formData.severity as 'low' | 'medium' | 'high' | 'critical',
      reproductionRate: formData.reproductionRate as 'always' | 'often' | 'sometimes' | 'rarely',
      screenshot: screenshots.value.length > 0 ? screenshots.value[0].data : undefined
    }

    // タグを生成
    const tags = [
      'bug-report',
      selectedCategory.value?.id || 'uncategorized',
      `severity-${formData.severity}`,
      `frequency-${formData.reproductionRate}`,
      screenshots.value.length > 0 ? 'with-screenshot' : 'no-screenshot'
    ]

    // フィードバックを作成
    const feedback = feedbackService.createBugReport({
      title: formData.title.trim(),
      description: formData.description.trim(),
      submitter,
      systemInfo: includeSystemInfo.value ? systemInfo : {
        userAgent: 'Not provided',
        screenResolution: 'Not provided',
        viewport: 'Not provided',
        gameVersion: '0.2.7',
        timestamp: new Date()
      },
      bugReportData,
      tags
    })

    submittedReportId.value = feedback.id
    showSuccessMessage.value = true
    emit('bugReported', feedback.id)

  } catch (error) {
    console.error('Failed to submit bug report:', error)
    alert('バグレポートの送信に失敗しました。しばらく後にもう一度お試しください。')
  } finally {
    isSubmitting.value = false
  }
}

const resetForm = () => {
  Object.assign(formData, {
    severity: '',
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    reproductionRate: '',
    errorMessage: '',
    contactEmail: '',
    contactName: ''
  })
  
  selectedCategory.value = null
  severityDescription.value = ''
  screenshots.value = []
  guidedSteps.value = ['']
  stepsInputMode.value = 'manual'
  includeSystemInfo.value = true
  provideContact.value = false
}

const createAnotherReport = () => {
  showSuccessMessage.value = false
  resetForm()
}

const closeReporter = () => {
  emit('close')
}

const generateSessionId = (): string => {
  return `bugreport_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`
}

// Lifecycle
onMounted(() => {
  // システム情報を初期化
  systemInfo.value = {
    userAgent: navigator.userAgent,
    screenResolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    timestamp: new Date()
  }
})
</script>

<style scoped>
/* =================================
   バグレポーターベース
   ================================= */

.bug-reporter {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  overflow: hidden;
}

/* =================================
   ヘッダー
   ================================= */

.bug-reporter-header {
  display: flex;
  align-items: center;
  gap: var(--space-lg);
  padding: var(--space-lg);
  background: rgba(239, 68, 68, 0.1);
  border-bottom: 1px solid rgba(239, 68, 68, 0.2);
}

.header-icon {
  font-size: 3rem;
  flex-shrink: 0;
}

.header-content {
  flex: 1;
}

.header-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(239, 68, 68, 1);
  margin: 0 0 var(--space-sm) 0;
}

.header-subtitle {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  line-height: 1.5;
}

/* =================================
   フォーム
   ================================= */

.bug-report-form {
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
}

.form-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
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
  font-family: inherit;
}

.form-textarea.mono-font {
  font-family: 'Courier New', monospace;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(255, 255, 255, 0.08);
}

.character-count {
  text-align: right;
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.5);
}

.severity-description {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
  padding: var(--space-sm);
  background: rgba(129, 140, 248, 0.1);
  border-radius: 6px;
  border-left: 3px solid rgba(129, 140, 248, 0.5);
}

/* =================================
   カテゴリ選択
   ================================= */

.bug-categories {
  display: grid;
  gap: var(--space-sm);
}

.category-btn {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: left;
  width: 100%;
}

.category-btn:hover,
.category-btn.selected {
  border-color: rgba(129, 140, 248, 0.5);
  background: rgba(129, 140, 248, 0.1);
}

.category-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-lg);
  flex-shrink: 0;
}

.category-content {
  flex: 1;
}

.category-title {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: var(--space-xs);
}

.category-description {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

/* =================================
   ステップ入力
   ================================= */

.steps-helper {
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  overflow: hidden;
}

.helper-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
}

.helper-tab {
  flex: 1;
  padding: var(--space-sm);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-size: var(--text-sm);
}

.helper-tab.active {
  background: rgba(129, 140, 248, 0.2);
  color: rgba(255, 255, 255, 0.95);
}

.manual-input,
.guided-input {
  padding: var(--space-md);
}

.steps-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
}

.step-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.step-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(129, 140, 248, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  flex-shrink: 0;
}

.step-input {
  flex: 1;
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
}

.remove-step-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.2);
  border: none;
  color: rgba(239, 68, 68, 1);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  flex-shrink: 0;
}

.add-step-btn {
  padding: var(--space-sm) var(--space-md);
  background: rgba(129, 140, 248, 0.1);
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 6px;
  color: rgba(129, 140, 248, 1);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.add-step-btn:hover:not(:disabled) {
  background: rgba(129, 140, 248, 0.2);
}

.add-step-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* =================================
   再現頻度
   ================================= */

.frequency-options {
  display: grid;
  gap: var(--space-sm);
}

.frequency-option {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: var(--space-md);
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.frequency-option:has(.frequency-radio:checked) {
  border-color: rgba(129, 140, 248, 0.6);
  background: rgba(129, 140, 248, 0.1);
}

.frequency-radio {
  accent-color: rgba(129, 140, 248, 1);
}

.frequency-content {
  flex: 1;
}

.frequency-label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
  margin-bottom: var(--space-xs);
}

.frequency-description {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
}

/* =================================
   スクリーンショット
   ================================= */

.screenshot-section {
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  padding: var(--space-md);
}

.screenshot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-md);
}

.screenshot-actions {
  display: flex;
  gap: var(--space-sm);
}

.capture-btn,
.upload-btn {
  padding: var(--space-sm) var(--space-md);
  background: rgba(129, 140, 248, 0.1);
  border: 1px solid rgba(129, 140, 248, 0.3);
  border-radius: 6px;
  color: rgba(129, 140, 248, 1);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.capture-btn:hover,
.upload-btn:hover {
  background: rgba(129, 140, 248, 0.2);
}

.capture-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.screenshots-preview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-md);
}

.screenshot-item {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: var(--space-sm);
  border: 1px solid rgba(129, 140, 248, 0.2);
}

.screenshot-image {
  width: 100%;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity var(--transition-fast);
}

.screenshot-image:hover {
  opacity: 0.8;
}

.screenshot-info {
  margin-top: var(--space-sm);
}

.screenshot-name {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.8);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.screenshot-size {
  font-size: var(--text-xs);
  color: rgba(255, 255, 255, 0.6);
}

.remove-screenshot-btn {
  position: absolute;
  top: var(--space-xs);
  right: var(--space-xs);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(239, 68, 68, 0.8);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
}

.no-screenshots {
  text-align: center;
  padding: var(--space-xl);
  color: rgba(255, 255, 255, 0.6);
}

.no-screenshots-icon {
  font-size: 2rem;
  margin-bottom: var(--space-md);
}

.no-screenshots-text {
  margin: 0;
  font-size: var(--text-sm);
}

/* =================================
   システム情報・連絡先
   ================================= */

.system-info-section,
.contact-toggle {
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 8px;
  padding: var(--space-md);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  cursor: pointer;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.toggle-checkbox {
  display: none;
}

.toggle-slider {
  width: 44px;
  height: 24px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  position: relative;
  transition: background var(--transition-fast);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  top: 2px;
  left: 2px;
  transition: transform var(--transition-fast);
}

.toggle-checkbox:checked + .toggle-slider {
  background: rgba(129, 140, 248, 0.8);
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-description {
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.7);
  margin: var(--space-sm) 0 0 0;
}

.system-info-preview {
  margin-top: var(--space-md);
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: var(--space-xs);
  font-size: var(--text-sm);
}

.info-label {
  color: rgba(255, 255, 255, 0.7);
}

.info-value {
  color: rgba(255, 255, 255, 0.9);
  font-family: monospace;
}

.contact-fields {
  margin-top: var(--space-md);
  display: grid;
  gap: var(--space-md);
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
  min-width: 140px;
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
   画像プレビューモーダル
   ================================= */

.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  backdrop-filter: blur(4px);
}

.preview-content {
  position: relative;
  max-width: 90vw;
  max-height: 90vh;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
}

.close-preview-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
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
  max-width: 500px;
}

.success-icon {
  font-size: 3rem;
  margin-bottom: var(--space-md);
}

.success-title {
  font-size: var(--text-xl);
  font-weight: 700;
  color: rgba(34, 197, 94, 1);
  margin: 0 0 var(--space-lg) 0;
}

.success-details {
  margin-bottom: var(--space-xl);
}

.report-id {
  margin-bottom: var(--space-md);
  color: rgba(255, 255, 255, 0.9);
}

.report-id code {
  background: rgba(255, 255, 255, 0.1);
  padding: var(--space-xs) var(--space-sm);
  border-radius: 4px;
  font-family: monospace;
  color: rgba(129, 140, 248, 1);
}

.success-message {
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
  margin: 0;
}

.success-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

/* =================================
   レスポンシブ
   ================================= */

@media (max-width: 768px) {
  .bug-reporter-header {
    flex-direction: column;
    text-align: center;
    gap: var(--space-md);
  }

  .category-btn {
    flex: 1;
  }

  .screenshot-actions {
    flex-direction: column;
  }

  .screenshots-preview {
    grid-template-columns: 1fr;
  }

  .form-actions,
  .success-actions {
    flex-direction: column;
  }

  .contact-fields {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .bug-report-form {
    padding: var(--space-md);
  }

  .helper-tabs {
    flex-direction: column;
  }

  .frequency-options {
    gap: var(--space-xs);
  }

  .frequency-option {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-sm);
  }
}

/* =================================
   アクセシビリティ
   ================================= */

@media (prefers-reduced-motion: reduce) {
  .category-btn,
  .capture-btn,
  .upload-btn,
  .toggle-slider,
  .btn-primary,
  .btn-secondary {
    transition: none;
  }

  .btn-primary:hover {
    transform: none;
  }
}

.bug-reporter:focus-within {
  outline: 2px solid rgba(239, 68, 68, 0.8);
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