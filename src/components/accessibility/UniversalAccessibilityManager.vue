<template>
  <div class="universal-accessibility-manager" :class="accessibilityClasses">
    <!-- アクセシビリティ設定パネル -->
    <AccessibilitySettings
      v-if="showSettings"
      :is-open="showSettings"
      @close="showSettings = false"
      @settings-changed="handleSettingsChanged"
    />
    
    <!-- フローティングアクセシビリティボタン -->
    <div v-if="showFloatingButton" class="accessibility-fab">
      <button
        class="fab-trigger"
        :aria-expanded="showFabMenu"
        aria-label="アクセシビリティメニューを開く"
        @click="toggleAccessibilityMenu"
      >
        <Icon name="accessibility" />
      </button>
      
      <div v-if="showFabMenu" class="fab-menu" role="menu">
        <button 
          class="fab-option"
          role="menuitem"
          :aria-pressed="highContrastMode"
          @click="toggleHighContrast"
        >
          <Icon name="contrast" />
          ハイコントラスト
        </button>
        
        <button 
          class="fab-option"
          role="menuitem"
          :aria-pressed="reducedMotionMode"
          @click="toggleReducedMotion"
        >
          <Icon name="motion" />
          モーション削減
        </button>
        
        <button 
          class="fab-option"
          role="menuitem"
          @click="openSettings"
        >
          <Icon name="settings" />
          詳細設定
        </button>
      </div>
    </div>
    
    <!-- スクリーンリーダー用の追加情報 -->
    <div ref="announcements" class="sr-only" aria-live="polite"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AccessibilitySettings from './AccessibilitySettings.vue'
import { EnhancedScreenReaderManager } from './EnhancedScreenReaderManager'
import { useVibrationFeedback } from '../../utils/accessibility/VibrationFeedbackManager'
import { useViewport } from '../../utils/responsive/ViewportManager'
import { useMultilingualLayout } from '../../utils/responsive/MultilingualLayoutManager'

// Props
interface Props {
  enableVibrationFeedback?: boolean
  showFloatingButton?: boolean
}

withDefaults(defineProps<Props>(), {
  enableVibrationFeedback: true,
  showFloatingButton: true
})

// Emits
const emit = defineEmits<{
  accessibilityChanged: [settings: any]
}>()

// Reactive state
const showSettings = ref(false)
const showFabMenu = ref(false)
const highContrastMode = ref(false)
const reducedMotionMode = ref(false)
const announcements = ref<HTMLElement>()

// コンポーザブルの使用
const { viewportInfo } = useViewport()
const { currentLanguage } = useMultilingualLayout()

const {
  vibrationManager,
  isSupported: vibrationSupported,
  vibrateForEvent
} = useVibrationFeedback()

// Enhanced Screen Reader Manager
const screenReaderManager = ref<EnhancedScreenReaderManager | null>(null)

// Computed properties
const accessibilityClasses = computed(() => ({
  'high-contrast': highContrastMode.value,
  'reduced-motion': reducedMotionMode.value,
  'mobile-device': viewportInfo.value?.deviceType === 'mobile',
  'touch-device': viewportInfo.value?.hasTouch,
  [`lang-${currentLanguage.value}`]: true,
  [`breakpoint-${viewportInfo.value?.breakpoint}`]: true
}))

// Methods
const toggleAccessibilityMenu = () => {
  showFabMenu.value = !showFabMenu.value
  
  if (vibrationSupported.value) {
    vibrateForEvent({
      type: 'interaction',
      intensity: 'light'
    })
  }
}

const toggleHighContrast = () => {
  highContrastMode.value = !highContrastMode.value
  document.documentElement.classList.toggle('high-contrast', highContrastMode.value)
  
  announceToScreenReader(
    highContrastMode.value 
      ? 'ハイコントラストモードを有効にしました'
      : 'ハイコントラストモードを無効にしました'
  )
  
  if (vibrationSupported.value) {
    vibrateForEvent({
      type: 'success',
      intensity: 'medium'
    })
  }
}

const toggleReducedMotion = () => {
  reducedMotionMode.value = !reducedMotionMode.value
  document.documentElement.classList.toggle('reduce-motion', reducedMotionMode.value)
  
  announceToScreenReader(
    reducedMotionMode.value 
      ? 'モーション削減モードを有効にしました'
      : 'モーション削減モードを無効にしました'
  )
}

const openSettings = () => {
  showSettings.value = true
  showFabMenu.value = false
  announceToScreenReader('アクセシビリティ設定を開きました')
}

const handleSettingsChanged = (settings: any) => {
  // 設定変更の処理
  emit('accessibilityChanged', settings)
  
  if (vibrationManager.value) {
    vibrationManager.value.updateConfig({
      enabled: settings.vibrationEnabled,
      globalIntensity: settings.vibrationIntensity
    })
  }
}

const announceToScreenReader = (message: string) => {
  if (announcements.value) {
    announcements.value.textContent = message
  }
  
  if (screenReaderManager.value) {
    screenReaderManager.value.announce(message, { priority: 'polite' })
  }
}

const setupKeyboardShortcuts = () => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // ショートカット
    if (event.altKey && event.shiftKey) {
      switch (event.key) {
        case 'C':
          event.preventDefault()
          toggleHighContrast()
          break
        case 'M':
          event.preventDefault()
          toggleReducedMotion()
          break
        case 'S':
          event.preventDefault()
          openSettings()
          break
      }
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

// Lifecycle hooks
onMounted(async () => {
  // Enhanced Screen Reader Manager の初期化
  screenReaderManager.value = new EnhancedScreenReaderManager()
  
  // キーボードショートカットの設定
  const cleanupKeyboard = setupKeyboardShortcuts()
  
  // ユーザー設定の復元
  const savedSettings = localStorage.getItem('universal-accessibility-settings')
  if (savedSettings) {
    try {
      const settings = JSON.parse(savedSettings)
      handleSettingsChanged(settings)
    } catch (error) {
      console.error('Failed to load accessibility settings:', error)
    }
  }
  
  onUnmounted(() => {
    cleanupKeyboard()
    screenReaderManager.value?.destroy()
  })
})

// Expose public methods
defineExpose({
  toggleHighContrast,
  toggleReducedMotion,
  openSettings,
  announceToScreenReader
})
</script>

<style scoped>
.universal-accessibility-manager {
  position: relative;
}

/* フローティングアクセシビリティボタン */
.accessibility-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.fab-trigger {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--primary-gradient);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-fab);
  transition: all var(--transition-normal);
  font-size: 24px;
}

.fab-trigger:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-fab-hover);
}

.fab-trigger:focus-visible {
  outline: 3px solid var(--primary-300);
  outline-offset: 4px;
}

.fab-menu {
  position: absolute;
  bottom: 70px;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: var(--shadow-dropdown);
  padding: 8px 0;
  min-width: 200px;
  animation: slideInUp 0.2s ease-out;
}

.fab-option {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text-primary);
  font-size: 14px;
  transition: background-color 0.2s;
}

.fab-option:hover {
  background: var(--bg-hover);
}

.fab-option[aria-pressed="true"] {
  background: var(--primary-50);
  color: var(--primary-700);
}

/* アニメーション */
@keyframes slideInUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .accessibility-fab {
    bottom: 20px;
    right: 20px;
  }
  
  .fab-trigger {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
}

/* ハイコントラストモード対応 */
.high-contrast .fab-trigger {
  border: 3px solid white;
  background: #000000;
  color: #ffffff;
}

.high-contrast .fab-menu {
  border: 2px solid black;
  background: white;
}

/* モーション削減対応 */
.reduced-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

/* デバイス別の調整 */
.mobile-device .fab-menu {
  bottom: 60px;
  left: 50%;
  right: auto;
  transform: translateX(-50%);
  width: calc(100vw - 32px);
  max-width: 400px;
}

.touch-device .fab-option {
  min-height: 48px;
  padding: 16px;
}
</style>