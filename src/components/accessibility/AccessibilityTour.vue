<template>
  <div class="accessibility-tour-overlay" role="dialog" aria-labelledby="tour-title" aria-modal="true">
    <div class="tour-content">
      <!-- ツアーヘッダー -->
      <div class="tour-header">
        <h1 id="tour-title">アクセシビリティ機能の使い方ツアー</h1>
        <div class="tour-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${(currentStep / totalSteps) * 100}%` }"
            ></div>
          </div>
          <span class="progress-text">
            {{ currentStep }} / {{ totalSteps }}
          </span>
        </div>
      </div>

      <!-- ツアーステップ -->
      <div class="tour-step" :key="currentStep">
        <div class="step-content">
          <!-- ステップアイコン -->
          <div class="step-icon">
            <Icon :name="currentTourStep.icon" />
          </div>

          <!-- ステップタイトルと説明 -->
          <div class="step-text">
            <h2>{{ currentTourStep.title }}</h2>
            <p>{{ currentTourStep.description }}</p>
            
            <!-- デモ/練習エリア -->
            <div v-if="currentTourStep.interactive" class="step-demo">
              <component 
                :is="currentTourStep.component"
                v-bind="currentTourStep.props"
                @demo-complete="handleDemoComplete"
              />
            </div>

            <!-- キーボードショートカット -->
            <div v-if="currentTourStep.shortcuts" class="shortcuts-info">
              <h3>キーボードショートカット:</h3>
              <div class="shortcuts-list">
                <div 
                  v-for="shortcut in currentTourStep.shortcuts"
                  :key="shortcut.keys"
                  class="shortcut-item"
                >
                  <kbd class="shortcut-keys">{{ shortcut.keys }}</kbd>
                  <span class="shortcut-description">{{ shortcut.description }}</span>
                </div>
              </div>
            </div>

            <!-- 追加の設定オプション -->
            <div v-if="currentTourStep.settings" class="settings-preview">
              <h3>関連設定:</h3>
              <div class="settings-list">
                <label 
                  v-for="setting in currentTourStep.settings"
                  :key="setting.key"
                  class="setting-item"
                >
                  <input 
                    :type="setting.type"
                    :checked="setting.value"
                    @change="updateSetting(setting.key, $event.target.checked)"
                  />
                  <span>{{ setting.label }}</span>
                  <small v-if="setting.description">{{ setting.description }}</small>
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- ステップナビゲーション -->
        <div class="step-navigation">
          <button 
            @click="previousStep"
            :disabled="currentStep === 1"
            class="nav-btn prev-btn"
            aria-label="前のステップ"
          >
            <Icon name="arrow-left" />
            前へ
          </button>
          
          <button 
            @click="skipTour"
            class="nav-btn skip-btn"
          >
            スキップ
          </button>
          
          <button 
            @click="nextStep"
            :disabled="!canProceed"
            class="nav-btn next-btn"
            :aria-label="isLastStep ? 'ツアーを完了' : '次のステップ'"
          >
            {{ isLastStep ? '完了' : '次へ' }}
            <Icon :name="isLastStep ? 'check' : 'arrow-right'" />
          </button>
        </div>
      </div>
    </div>

    <!-- 閉じるボタン -->
    <button 
      @click="closeTour"
      class="tour-close"
      aria-label="ツアーを閉じる"
    >
      <Icon name="close" />
    </button>

    <!-- スクリーンリーダー用の追加情報 -->
    <div class="sr-only" aria-live="polite" ref="announcements"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

// Props & Emits
const emit = defineEmits<{
  close: []
  complete: []
  stepChanged: [step: number]
}>()

// State
const currentStep = ref(1)
const demoCompleted = ref(false)
const userSettings = ref<Record<string, any>>({})
const announcements = ref<HTMLElement>()

// ツアーステップの定義
const tourSteps = [
  {
    id: 1,
    title: 'アクセシビリティ機能へようこそ',
    description: 'このゲームには、誰もが快適に楽しめるよう様々なアクセシビリティ機能が搭載されています。このツアーでは主要な機能をご紹介します。',
    icon: 'accessibility',
    interactive: false
  },
  {
    id: 2,
    title: 'キーボード操作',
    description: 'マウスを使わずにキーボードだけでゲームを操作できます。Tabキーで要素間を移動し、Enterやスペースキーで選択・実行できます。',
    icon: 'keyboard',
    interactive: true,
    component: 'KeyboardDemo',
    shortcuts: [
      { keys: 'Tab', description: '次の要素に移動' },
      { keys: 'Shift + Tab', description: '前の要素に移動' },
      { keys: 'Enter', description: '選択・実行' },
      { keys: 'Space', description: 'ボタンの押下・チェックボックスの切り替え' },
      { keys: '矢印キー', description: 'カード選択・メニュー内移動' }
    ]
  },
  {
    id: 3,
    title: '音声コントロール',
    description: '音声でゲームを操作できます。「カードを引く」「保険を適用」など、自然な日本語で話しかけてください。',
    icon: 'mic',
    interactive: true,
    component: 'VoiceControlDemo',
    shortcuts: [
      { keys: 'Alt + Shift + V', description: '音声認識のオン/オフ' }
    ],
    settings: [
      {
        key: 'voiceEnabled',
        type: 'checkbox',
        label: '音声コントロールを有効にする',
        value: false,
        description: 'マイクへのアクセスが必要です'
      }
    ]
  },
  {
    id: 4,
    title: 'スクリーンリーダー対応',
    description: 'スクリーンリーダーを使用している方向けに、ゲームの状況や操作方法を音声で説明します。',
    icon: 'volume-up',
    interactive: true,
    component: 'ScreenReaderDemo',
    settings: [
      {
        key: 'screenReaderEnhanced',
        type: 'checkbox',
        label: '詳細な音声説明を有効にする',
        value: true
      },
      {
        key: 'gameStateAnnouncements',
        type: 'checkbox',
        label: 'ゲーム状況の自動アナウンス',
        value: true
      }
    ]
  },
  {
    id: 5,
    title: '視覚的な調整',
    description: 'ハイコントラストモード、フォントサイズ調整、色覚サポートなど、見やすさを向上させる機能があります。',
    icon: 'eye',
    interactive: true,
    component: 'VisualDemo',
    shortcuts: [
      { keys: 'Alt + Shift + C', description: 'ハイコントラストモードの切り替え' }
    ],
    settings: [
      {
        key: 'highContrast',
        type: 'checkbox',
        label: 'ハイコントラストモード',
        value: false
      },
      {
        key: 'largeText',
        type: 'checkbox',
        label: '大きな文字サイズ',
        value: false
      },
      {
        key: 'colorBlindSupport',
        type: 'checkbox',
        label: '色覚サポート（パターン表示）',
        value: false
      }
    ]
  },
  {
    id: 6,
    title: 'モーションと効果',
    description: 'アニメーションや動きに敏感な方向けに、モーションを削減したり、振動フィードバックを調整できます。',
    icon: 'motion',
    interactive: true,
    component: 'MotionDemo',
    shortcuts: [
      { keys: 'Alt + Shift + M', description: 'モーション削減モードの切り替え' }
    ],
    settings: [
      {
        key: 'reducedMotion',
        type: 'checkbox',
        label: 'アニメーションを最小限に',
        value: false
      },
      {
        key: 'vibrationEnabled',
        type: 'checkbox',
        label: '触覚フィードバック（振動）',
        value: true,
        description: '対応デバイスのみ'
      }
    ]
  },
  {
    id: 7,
    title: '認知支援機能',
    description: '複雑な情報を整理し、記憶や意思決定をサポートする機能があります。',
    icon: 'brain',
    interactive: true,
    component: 'CognitiveDemo',
    settings: [
      {
        key: 'simplifiedInterface',
        type: 'checkbox',
        label: 'シンプルなインターフェース',
        value: false
      },
      {
        key: 'memoryAids',
        type: 'checkbox',
        label: 'メモリ支援（ヒント表示）',
        value: true
      },
      {
        key: 'progressiveDisclosure',
        type: 'checkbox',
        label: '段階的な情報表示',
        value: true
      }
    ]
  },
  {
    id: 8,
    title: '緊急時のヘルプ',
    description: '困ったときは Alt + Shift + A で緊急アクセシビリティメニューを開けます。最大アクセシビリティモードや音声専用モードに素早く切り替えられます。',
    icon: 'help-circle',
    interactive: true,
    component: 'EmergencyDemo',
    shortcuts: [
      { keys: 'Alt + Shift + A', description: '緊急アクセシビリティメニュー' },
      { keys: 'Alt + Shift + H', description: 'ヘルプとサポート' }
    ]
  },
  {
    id: 9,
    title: 'ツアー完了！',
    description: 'お疲れさまでした！これらの機能はいつでも画面右下のアクセシビリティボタンから利用できます。快適なゲーム体験をお楽しみください。',
    icon: 'check-circle',
    interactive: false
  }
]

// Computed
const totalSteps = computed(() => tourSteps.length)
const currentTourStep = computed(() => tourSteps[currentStep.value - 1])
const isLastStep = computed(() => currentStep.value === totalSteps.value)
const canProceed = computed(() => {
  if (!currentTourStep.value.interactive) return true
  return demoCompleted.value
})

// Methods
const nextStep = () => {
  if (isLastStep.value) {
    completeTour()
  } else {
    currentStep.value++
    demoCompleted.value = false
    emit('stepChanged', currentStep.value)
    announceStep()
  }
}

const previousStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
    demoCompleted.value = false
    emit('stepChanged', currentStep.value)
    announceStep()
  }
}

const skipTour = () => {
  closeTour()
}

const closeTour = () => {
  emit('close')
}

const completeTour = () => {
  // 設定を保存
  const settingsToSave = {
    ...userSettings.value,
    tourCompleted: true,
    tourCompletionDate: new Date().toISOString()
  }
  
  localStorage.setItem('accessibility-tour-settings', JSON.stringify(settingsToSave))
  
  announceToScreenReader('アクセシビリティツアーが完了しました。設定が保存されました。')
  emit('complete')
}

const handleDemoComplete = () => {
  demoCompleted.value = true
  announceToScreenReader('デモが完了しました。次のステップに進めます。')
}

const updateSetting = (key: string, value: any) => {
  userSettings.value[key] = value
  
  // リアルタイムで設定を適用
  applySettingChange(key, value)
}

const applySettingChange = (key: string, value: any) => {
  switch (key) {
    case 'highContrast':
      document.documentElement.classList.toggle('high-contrast', value)
      break
    case 'largeText':
      document.documentElement.style.fontSize = value ? '120%' : ''
      break
    case 'reducedMotion':
      document.documentElement.classList.toggle('reduce-motion', value)
      break
    // 他の設定も同様に処理
  }
}

const announceStep = () => {
  const step = currentTourStep.value
  const message = `ステップ ${currentStep.value}: ${step.title}。${step.description}`
  announceToScreenReader(message)
}

const announceToScreenReader = (message: string) => {
  if (announcements.value) {
    announcements.value.textContent = message
  }
}

// キーボードナビゲーション
const handleKeyDown = (event: KeyboardEvent) => {
  switch (event.key) {
    case 'ArrowRight':
    case 'PageDown':
      event.preventDefault()
      if (canProceed.value) nextStep()
      break
    case 'ArrowLeft':
    case 'PageUp':
      event.preventDefault()
      if (currentStep.value > 1) previousStep()
      break
    case 'Escape':
      event.preventDefault()
      closeTour()
      break
    case 'Home':
      event.preventDefault()
      currentStep.value = 1
      demoCompleted.value = false
      announceStep()
      break
    case 'End':
      event.preventDefault()
      currentStep.value = totalSteps.value
      demoCompleted.value = true
      announceStep()
      break
  }
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  
  // キーボードイベントリスナーの設定
  window.addEventListener('keydown', handleKeyDown)
  
  // 既存の設定を読み込み
  const savedSettings = localStorage.getItem('accessibility-tour-settings')
  if (savedSettings) {
    try {
      userSettings.value = JSON.parse(savedSettings)
    } catch (error) {
      console.error('Failed to load tour settings:', error)
    }
  }
  
  // 初回アナウンス
  announceStep()
  
  // クリーンアップ
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
})
</script>

<style scoped>
.accessibility-tour-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;
}

.tour-content {
  background: white;
  border-radius: 16px;
  box-shadow: var(--shadow-modal);
  max-width: 800px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.tour-header {
  padding: 24px 24px 0;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 24px;
}

.tour-header h1 {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.tour-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-secondary);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary);
  min-width: 50px;
}

.tour-step {
  padding: 0 24px 24px;
}

.step-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.step-icon {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  background: var(--primary-gradient);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.step-text {
  flex: 1;
}

.step-text h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.step-text p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 20px;
}

.step-demo {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.shortcuts-info {
  margin-bottom: 20px;
}

.shortcuts-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.shortcut-keys {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-light);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-family: monospace;
  min-width: 80px;
  text-align: center;
}

.shortcut-description {
  color: var(--text-secondary);
  font-size: 14px;
}

.settings-preview {
  margin-bottom: 20px;
}

.settings-preview h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}

.setting-item input {
  margin-top: 2px;
}

.setting-item span {
  font-size: 14px;
  color: var(--text-primary);
}

.setting-item small {
  color: var(--text-secondary);
  font-size: 12px;
  margin-left: 8px;
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
  margin-top: 20px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.prev-btn {
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-color: var(--border-light);
}

.prev-btn:not(:disabled):hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.skip-btn {
  background: none;
  color: var(--text-secondary);
}

.skip-btn:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.next-btn {
  background: var(--primary-gradient);
  color: white;
}

.next-btn:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-button);
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tour-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-secondary);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  transition: all 0.2s;
}

.tour-close:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.tour-close:focus-visible {
  outline: 2px solid var(--primary-400);
  outline-offset: 2px;
}

/* アニメーション */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .tour-content {
    width: 95%;
    margin: 16px;
    max-height: calc(100vh - 32px);
  }
  
  .tour-header {
    padding: 16px 16px 0;
  }
  
  .tour-step {
    padding: 0 16px 16px;
  }
  
  .step-content {
    flex-direction: column;
    text-align: center;
  }
  
  .step-icon {
    align-self: center;
  }
  
  .shortcuts-list {
    gap: 12px;
  }
  
  .shortcut-item {
    flex-direction: column;
    text-align: center;
    gap: 4px;
  }
  
  .step-navigation {
    flex-direction: column;
    gap: 12px;
  }
  
  .nav-btn {
    width: 100%;
    justify-content: center;
  }
}

/* ハイコントラストモード */
.high-contrast .tour-content {
  border: 3px solid white;
  background: black;
  color: white;
}

.high-contrast .step-icon {
  border: 2px solid white;
}

.high-contrast .nav-btn {
  border-width: 2px;
  font-weight: 700;
}

/* モーション削減 */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
</style>