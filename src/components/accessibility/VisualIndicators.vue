<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { FocusIndicatorManager, type FocusIndicatorOptions } from '@/utils/focus-indicator'

// 開発環境フラグ
const isDev = import.meta.env.DEV

// Props
interface Props {
  enabled?: boolean
  color?: string
  width?: number
  style?: 'solid' | 'dashed' | 'dotted'
  offset?: number
  borderRadius?: number
  showKeyboardHints?: boolean
  reducedMotion?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  color: '#818CF8',
  width: 3,
  style: 'solid',
  offset: 4,
  borderRadius: 8,
  showKeyboardHints: true,
  reducedMotion: false
})

// リアクティブな状態
const isEnabled = ref(props.enabled)
const currentOptions = ref<FocusIndicatorOptions>({
  color: props.color,
  width: props.width,
  style: props.style,
  offset: props.offset,
  borderRadius: props.borderRadius
})

// Focus Indicator Manager
let focusIndicatorManager: FocusIndicatorManager | null = null

// キーボードヒント表示状態
const showHints = ref(false)
const hintTimer = ref<number | null>(null)

// 計算されたプロパティ
const indicatorStyle = computed(() => ({
  '--focus-color': currentOptions.value.color,
  '--focus-width': `${currentOptions.value.width}px`,
  '--focus-offset': `${currentOptions.value.offset}px`,
  '--focus-radius': `${currentOptions.value.borderRadius}px`
}))

// キーボードショートカット
const keyboardShortcuts = computed(() => [
  { key: 'Tab', description: '次の要素にフォーカス' },
  { key: 'Shift + Tab', description: '前の要素にフォーカス' },
  { key: 'Enter', description: '選択した要素を実行' },
  { key: 'Space', description: 'ボタンやチェックボックスを操作' },
  { key: 'Arrow Keys', description: 'メニューや選択肢を移動' },
  { key: 'Escape', description: 'モーダルやメニューを閉じる' }
])

// メソッド
const initializeFocusIndicator = () => {
  if (isEnabled.value && !focusIndicatorManager) {
    focusIndicatorManager = new FocusIndicatorManager(currentOptions.value)
  }
}

const destroyFocusIndicator = () => {
  if (focusIndicatorManager) {
    focusIndicatorManager.destroy()
    focusIndicatorManager = null
  }
}

const updateOptions = () => {
  if (focusIndicatorManager) {
    focusIndicatorManager.setOptions(currentOptions.value)
  }
}

const showKeyboardHints = () => {
  if (!props.showKeyboardHints) return
  
  showHints.value = true
  
  // 5秒後に自動的に隠す
  if (hintTimer.value) {
    clearTimeout(hintTimer.value)
  }
  
  hintTimer.value = window.setTimeout(() => {
    showHints.value = false
  }, 5000)
}

const hideKeyboardHints = () => {
  showHints.value = false
  if (hintTimer.value) {
    clearTimeout(hintTimer.value)
    hintTimer.value = null
  }
}

// キーボード使用検出
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Tab') {
    showKeyboardHints()
  }
}

// 設定を更新
const updateSettings = (newOptions: Partial<FocusIndicatorOptions>) => {
  Object.assign(currentOptions.value, newOptions)
  updateOptions()
}

// 有効/無効の切り替え
const toggleEnabled = () => {
  isEnabled.value = !isEnabled.value
  
  if (isEnabled.value) {
    initializeFocusIndicator()
  } else {
    destroyFocusIndicator()
  }
}

// ライフサイクル
onMounted(() => {
  initializeFocusIndicator()
  
  // キーボード使用検出のためのイベントリスナー
  document.addEventListener('keydown', handleKeydown)
  
  // ユーザーのモーション設定を検出
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  if (prefersReducedMotion.matches) {
    currentOptions.value = {
      ...currentOptions.value,
      offset: 2 // モーション削減時はオフセットを小さく
    }
    updateOptions()
  }
})

onUnmounted(() => {
  destroyFocusIndicator()
  document.removeEventListener('keydown', handleKeydown)
  
  if (hintTimer.value) {
    clearTimeout(hintTimer.value)
  }
})

// 外部に公開する関数
defineExpose({
  updateSettings,
  toggleEnabled,
  showKeyboardHints,
  hideKeyboardHints
})
</script>

<template>
  <div 
    class="visual-indicators"
    :class="{
      'reduced-motion': reducedMotion,
      'hints-visible': showHints
    }"
    :style="indicatorStyle"
  >
    <!-- キーボードヒント -->
    <Transition name="hints-fade">
      <div 
        v-if="showHints && showKeyboardHints" 
        class="keyboard-hints"
        role="tooltip"
        aria-live="polite"
      >
        <div class="hints-header">
          <h3 class="hints-title">キーボードショートカット</h3>
          <button 
            @click="hideKeyboardHints"
            class="hints-close"
            aria-label="ヒントを閉じる"
          >
            ×
          </button>
        </div>
        <ul class="hints-list">
          <li 
            v-for="shortcut in keyboardShortcuts"
            :key="shortcut.key"
            class="hint-item"
          >
            <kbd class="hint-key">{{ shortcut.key }}</kbd>
            <span class="hint-description">{{ shortcut.description }}</span>
          </li>
        </ul>
      </div>
    </Transition>

    <!-- 設定パネル（開発環境のみ） -->
    <div 
      v-if="isDev" 
      class="settings-panel"
    >
      <h4>フォーカスインジケーター設定</h4>
      <label>
        <input 
          v-model="isEnabled" 
          type="checkbox"
          @change="toggleEnabled"
        >
        有効
      </label>
      
      <label>
        色:
        <input 
          :value="currentOptions.color"
          type="color"
          @input="updateSettings({ color: ($event.target as HTMLInputElement).value })"
        >
      </label>
      
      <label>
        幅:
        <input 
          :value="currentOptions.width"
          type="range"
          min="1"
          max="10"
          @input="updateSettings({ width: parseInt(($event.target as HTMLInputElement).value) })"
        >
      </label>
    </div>
  </div>
</template>

<style scoped>
.visual-indicators {
  /* CSS変数でスタイルを制御 */
  --focus-transition: all 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.visual-indicators.reduced-motion {
  --focus-transition: none;
}

/* キーボードヒント */
.keyboard-hints {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10001;
  
  background: var(--bg-overlay);
  border: 1px solid var(--border-primary);
  border-radius: var(--rounded-lg);
  padding: var(--space-4);
  max-width: 300px;
  
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-xl);
  
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
}

.hints-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.hints-title {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  margin: 0;
  color: var(--primary-300);
}

.hints-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-lg);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--rounded);
}

.hints-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.hints-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
}

.hint-key {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-gray);
  border-radius: var(--rounded);
  padding: var(--space-1) var(--space-2);
  font-family: monospace;
  font-size: var(--text-xs);
  min-width: 60px;
  text-align: center;
  color: var(--primary-200);
}

.hint-description {
  flex: 1;
  color: rgba(255, 255, 255, 0.8);
}

/* アニメーション */
.hints-fade-enter-active,
.hints-fade-leave-active {
  transition: all var(--duration-300) var(--ease-out);
}

.hints-fade-enter-from,
.hints-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* 設定パネル（開発環境） */
.settings-panel {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 10001;
  
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: var(--rounded-lg);
  padding: var(--space-4);
  
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
}

.settings-panel h4 {
  margin: 0 0 var(--space-3) 0;
  font-size: var(--text-base);
  color: var(--primary-300);
}

.settings-panel label {
  display: block;
  margin-bottom: var(--space-2);
}

.settings-panel input {
  margin-left: var(--space-2);
}

/* レスポンシブ */
@media (max-width: 640px) {
  .keyboard-hints {
    top: 10px;
    right: 10px;
    left: 10px;
    max-width: none;
  }
  
  .settings-panel {
    bottom: 10px;
    left: 10px;
    right: 10px;
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .hints-fade-enter-active,
  .hints-fade-leave-active {
    transition: opacity var(--duration-200) linear;
  }
  
  .hints-fade-enter-from,
  .hints-fade-leave-to {
    transform: none;
  }
}
</style>