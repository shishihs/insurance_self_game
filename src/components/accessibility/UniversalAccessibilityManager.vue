<template>
  <div class="universal-accessibility-manager" :class="accessibilityClasses">
    <!-- アクセシビリティ設定パネル -->
    <AccessibilitySettings
      v-if="showSettings"
      :is-open="showSettings"
      @close="showSettings = false"
      @settings-changed="handleSettingsChanged"
    />
    
    <!-- 音声コントロール状態表示 -->
    <div 
      v-if="voiceControlEnabled && isListening" 
      class="voice-control-indicator"
      role="status"
      aria-live="polite"
    >
      <div class="voice-indicator-pulse"></div>
      <span>音声認識中...</span>
      <button 
        class="voice-stop-btn"
        aria-label="音声認識を停止"
        @click="stopVoiceControl"
      >
        停止
      </button>
    </div>
    
    <!-- 認知負荷インジケーター（開発・テスト用） -->
    <div 
      v-if="showCognitiveIndicator && cognitiveLoad" 
      class="cognitive-load-indicator"
      :class="getCognitiveLoadClass()"
    >
      <div class="load-bar">
        <div 
          class="load-fill" 
          :style="{ width: `${cognitiveLoad.overall * 100}%` }"
        ></div>
      </div>
      <span class="load-text">認知負荷: {{ Math.round(cognitiveLoad.overall * 100) }}%</span>
    </div>
    
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
          :aria-pressed="voiceControlEnabled"
          @click="toggleVoiceControl"
        >
          <Icon name="mic" />
          音声操作
        </button>
        
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
        
        <button 
          class="fab-option"
          role="menuitem"
          @click="startAccessibilityTour"
        >
          <Icon name="help" />
          使い方ツアー
        </button>
      </div>
    </div>
    
    <!-- 緊急アクセシビリティヘルプ -->
    <div 
      v-if="emergencyMode"
      class="emergency-accessibility"
      role="alert"
      aria-live="assertive"
    >
      <div class="emergency-content">
        <h2>アクセシビリティ緊急モード</h2>
        <p>画面の内容が見づらい、または操作が困難な場合は、以下のオプションをお試しください。</p>
        
        <div class="emergency-options">
          <button class="emergency-btn" @click="activateMaximumAccessibility">
            <Icon name="accessibility-max" />
            最大アクセシビリティモード
          </button>
          
          <button class="emergency-btn" @click="activateSimpleMode">
            <Icon name="simplify" />
            シンプルモード
          </button>
          
          <button class="emergency-btn" @click="activateVoiceOnlyMode">
            <Icon name="volume-up" />
            音声専用モード
          </button>
          
          <button class="emergency-btn" @click="resetToDefault">
            <Icon name="refresh" />
            デフォルトに戻す
          </button>
        </div>
        
        <button 
          class="emergency-close"
          aria-label="緊急モードを終了"
          @click="exitEmergencyMode"
        >
          閉じる
        </button>
      </div>
    </div>
    
    <!-- スクリーンリーダー用の追加情報 -->
    <div ref="announcements" class="sr-only" aria-live="polite"></div>
    
    <!-- アクセシビリティツアーオーバーレイ -->
    <AccessibilityTour
      v-if="showTour"
      @close="showTour = false"
      @complete="handleTourComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import AccessibilitySettings from './AccessibilitySettings.vue'
import { EnhancedScreenReaderManager } from './EnhancedScreenReaderManager'
import { useVoiceControl } from '../../utils/accessibility/VoiceControlManager'
import { useVibrationFeedback } from '../../utils/accessibility/VibrationFeedbackManager'
import { useCognitiveAccessibility } from '../../utils/accessibility/CognitiveAccessibilityManager'
import { useViewport } from '../../utils/responsive/ViewportManager'
import { useMultilingualLayout } from '../../utils/responsive/MultilingualLayoutManager'
import { useResponsiveContainer } from '../../utils/responsive/ResponsiveContainer'

// Props
interface Props {
  enableVoiceControl?: boolean
  enableVibrationFeedback?: boolean
  enableCognitiveOptimization?: boolean
  showFloatingButton?: boolean
  showCognitiveIndicator?: boolean
  autoOptimization?: boolean
  emergencyModeKey?: string // 緊急時のキーコンビネーション
}

const props = withDefaults(defineProps<Props>(), {
  enableVoiceControl: true,
  enableVibrationFeedback: true,
  enableCognitiveOptimization: true,
  showFloatingButton: true,
  showCognitiveIndicator: false,
  autoOptimization: true,
  emergencyModeKey: 'Alt+Shift+A'
})

// Emits
const emit = defineEmits<{
  accessibilityChanged: [settings: any]
  voiceCommand: [command: any]
  emergencyModeActivated: []
  tourCompleted: []
}>()

// Reactive state
const showSettings = ref(false)
const showFabMenu = ref(false)
const showTour = ref(false)
const emergencyMode = ref(false)
const highContrastMode = ref(false)
const reducedMotionMode = ref(false)
const voiceControlEnabled = ref(props.enableVoiceControl)
const announcements = ref<HTMLElement>()

// コンポーザブルの使用
const { viewportInfo, matches, getValue } = useViewport()
const { currentLanguage, setLanguage, currentLanguageInfo } = useMultilingualLayout()
const { 
  voiceControl, 
  isListening, 
  lastResult, 
  startListening, 
  stopListening,
  setContext 
} = useVoiceControl()

const {
  vibrationManager,
  isSupported: vibrationSupported,
  vibrateForEvent,
  vibrateForGameEvent
} = useVibrationFeedback()

const {
  cognitiveManager,
  currentLoad: cognitiveLoad,
  optimizeElement,
  recordInteraction
} = useCognitiveAccessibility()

// Enhanced Screen Reader Manager
const screenReaderManager = ref<EnhancedScreenReaderManager | null>(null)

// Computed properties
const accessibilityClasses = computed(() => ({
  'high-contrast': highContrastMode.value,
  'reduced-motion': reducedMotionMode.value,
  'voice-control-active': voiceControlEnabled.value && isListening.value,
  'mobile-device': viewportInfo.value?.deviceType === 'mobile',
  'touch-device': viewportInfo.value?.hasTouch,
  [`lang-${currentLanguage.value}`]: true,
  [`breakpoint-${viewportInfo.value?.breakpoint}`]: true
}))

const getCognitiveLoadClass = () => {
  if (!cognitiveLoad.value) return 'load-unknown'
  
  const load = cognitiveLoad.value.overall
  if (load < 0.3) return 'load-low'
  if (load < 0.6) return 'load-medium'
  if (load < 0.8) return 'load-high'
  return 'load-critical'
}

// Methods
const toggleAccessibilityMenu = () => {
  showFabMenu.value = !showFabMenu.value
  
  if (vibrationSupported.value) {
    vibrateForEvent({
      type: 'interaction',
      intensity: 'light'
    })
  }
  
  recordInteraction('menu_toggle', Date.now())
}

const toggleVoiceControl = () => {
  voiceControlEnabled.value = !voiceControlEnabled.value
  
  if (voiceControlEnabled.value) {
    startListening()
    announceToScreenReader('音声コントロールを有効にしました')
  } else {
    stopListening()
    announceToScreenReader('音声コントロールを無効にしました')
  }
  
  if (vibrationSupported.value) {
    vibrateForEvent({
      type: voiceControlEnabled.value ? 'success' : 'info',
      intensity: 'medium'
    })
  }
}

const stopVoiceControl = () => {
  stopListening()
  announceToScreenReader('音声認識を停止しました')
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

const startAccessibilityTour = () => {
  showTour.value = true
  showFabMenu.value = false
  announceToScreenReader('アクセシビリティ使い方ツアーを開始します')
}

const activateMaximumAccessibility = () => {
  // 最大アクセシビリティモードの実装
  highContrastMode.value = true
  reducedMotionMode.value = true
  voiceControlEnabled.value = true
  
  document.documentElement.classList.add('max-accessibility')
  document.documentElement.style.fontSize = '24px'
  
  startListening()
  announceToScreenReader('最大アクセシビリティモードを有効にしました。大きな文字、ハイコントラスト、音声コントロールが利用できます。')
  
  exitEmergencyMode()
}

const activateSimpleMode = () => {
  // シンプルモードの実装
  document.documentElement.classList.add('simple-mode')
  
  // 複雑な要素を隠す
  document.querySelectorAll('.advanced-feature, .decoration').forEach(el => {
    (el as HTMLElement).style.display = 'none'
  })
  
  announceToScreenReader('シンプルモードを有効にしました。複雑な要素を非表示にし、基本機能のみを表示します。')
  exitEmergencyMode()
}

const activateVoiceOnlyMode = () => {
  // 音声専用モードの実装
  document.documentElement.classList.add('voice-only-mode')
  voiceControlEnabled.value = true
  startListening()
  
  // 画面を暗くして音声に集中
  document.body.style.backgroundColor = '#000000'
  document.body.style.color = '#ffffff'
  
  announceToScreenReader('音声専用モードを有効にしました。画面を暗くし、音声操作に集中できます。')
  exitEmergencyMode()
}

const resetToDefault = () => {
  // すべての設定をリセット
  highContrastMode.value = false
  reducedMotionMode.value = false
  voiceControlEnabled.value = false
  
  document.documentElement.className = ''
  document.documentElement.style.fontSize = ''
  document.body.style.backgroundColor = ''
  document.body.style.color = ''
  
  // 隠された要素を再表示
  document.querySelectorAll('[style*="display: none"]').forEach(el => {
    (el as HTMLElement).style.display = ''
  })
  
  stopListening()
  announceToScreenReader('すべての設定をデフォルトに戻しました')
  exitEmergencyMode()
}

const exitEmergencyMode = () => {
  emergencyMode.value = false
}

const handleSettingsChanged = (settings: any) => {
  // 設定変更の処理
  emit('accessibilityChanged', settings)
  
  // 各マネージャーに設定を反映
  if (cognitiveManager.value) {
    cognitiveManager.value.updateConfig({
      enableProgressiveDisclosure: settings.enableProgressiveDisclosure,
      customizations: {
        reduceAnimations: settings.reduceMotion,
        simplifyLanguage: settings.simplifyLanguage,
        increaseFontSize: settings.fontSize !== 'medium',
        highContrast: settings.highContrast,
        reduceClutter: settings.reduceClutter
      }
    })
  }
  
  if (vibrationManager.value) {
    vibrationManager.value.updateConfig({
      enabled: settings.vibrationEnabled,
      globalIntensity: settings.vibrationIntensity
    })
  }
}

const handleTourComplete = () => {
  showTour.value = false
  emit('tourCompleted')
  announceToScreenReader('使い方ツアーが完了しました')
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
    // 緊急モードのショートカット
    if (event.altKey && event.shiftKey && event.key === 'A') {
      event.preventDefault()
      emergencyMode.value = true
      announceToScreenReader('緊急アクセシビリティモードを開きました')
      emit('emergencyModeActivated')
      return
    }
    
    // その他のショートカット
    if (event.altKey && event.shiftKey) {
      switch (event.key) {
        case 'V':
          event.preventDefault()
          toggleVoiceControl()
          break
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
        case 'T':
          event.preventDefault()
          startAccessibilityTour()
          break
      }
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown)
  }
}

const optimizePageForAccessibility = async () => {
  if (!props.autoOptimization) return
  
  await nextTick()
  
  // ページ全体の認知負荷を計算・最適化
  if (cognitiveManager.value) {
    const mainContent = document.querySelector('main') || document.body
    optimizeElement(mainContent)
  }
  
  // コンテキストの設定（ゲーム状態に応じて）
  if (voiceControl.value) {
    const gamePhase = detectGamePhase()
    setContext(['game', gamePhase])
  }
}

const detectGamePhase = (): string => {
  // ゲームの現在フェーズを検出（簡易版）
  if (document.querySelector('.draw-phase')) return 'draw_phase'
  if (document.querySelector('.play-phase')) return 'play_phase'
  if (document.querySelector('.challenge-phase')) return 'challenge_phase'
  return 'menu'
}

// Lifecycle hooks
onMounted(async () => {
  // Enhanced Screen Reader Manager の初期化
  screenReaderManager.value = new EnhancedScreenReaderManager()
  
  // キーボードショートカットの設定
  const cleanupKeyboard = setupKeyboardShortcuts()
  
  // 初期最適化
  await optimizePageForAccessibility()
  
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

// Watchers
watch(lastResult, (result) => {
  if (result?.success && result.command) {
    emit('voiceCommand', result)
    
    // 音声コマンドの実行
    handleVoiceCommand(result.command, result.parameters)
  }
})

watch(viewportInfo, (newInfo) => {
  if (newInfo) {
    // ビューポート変更時の再最適化
    optimizePageForAccessibility()
  }
}, { deep: true })

watch(cognitiveLoad, (newLoad) => {
  if (newLoad && newLoad.overall > 0.8) {
    // 認知負荷が高い場合の警告
    announceToScreenReader('ページの内容が複雑です。設定でシンプルモードを有効にすることをおすすめします。')
  }
}, { deep: true })

const handleVoiceCommand = (command: any, parameters?: any) => {
  switch (command.action) {
    case 'open_settings':
      openSettings()
      break
    case 'toggle_high_contrast':
      toggleHighContrast()
      break
    case 'toggle_voice_control':
      toggleVoiceControl()
      break
    case 'start_tour':
      startAccessibilityTour()
      break
    case 'emergency_mode':
      emergencyMode.value = true
      break
    default:
      // ゲーム固有のコマンドは親コンポーネントに委譲
      emit('voiceCommand', { command, parameters })
      break
  }
}

// Expose public methods
defineExpose({
  toggleVoiceControl,
  toggleHighContrast,
  toggleReducedMotion,
  openSettings,
  startAccessibilityTour,
  activateMaximumAccessibility,
  optimizePageForAccessibility,
  announceToScreenReader
})
</script>

<style scoped>
.universal-accessibility-manager {
  position: relative;
}

/* 音声コントロール表示 */
.voice-control-indicator {
  position: fixed;
  top: 20px;
  right: 20px;
  background: var(--primary-600);
  color: white;
  padding: 12px 16px;
  border-radius: 25px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: var(--shadow-card);
  z-index: 1000;
  animation: slideInRight 0.3s ease-out;
}

.voice-indicator-pulse {
  width: 12px;
  height: 12px;
  background: #ff4444;
  border-radius: 50%;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.voice-stop-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.voice-stop-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 認知負荷インジケーター */
.cognitive-load-indicator {
  position: fixed;
  bottom: 20px;
  left: 20px;
  background: white;
  border-radius: 8px;
  padding: 12px;
  box-shadow: var(--shadow-card);
  z-index: 999;
  min-width: 200px;
}

.load-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.load-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.load-low .load-fill { background: #10b981; }
.load-medium .load-fill { background: #f59e0b; }
.load-high .load-fill { background: #ef4444; }
.load-critical .load-fill { background: #dc2626; animation: pulse 1s infinite; }

.load-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
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

/* 緊急アクセシビリティモード */
.emergency-accessibility {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s ease-out;
}

.emergency-content {
  background: white;
  border-radius: 16px;
  padding: 32px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
  text-align: center;
}

.emergency-content h2 {
  color: var(--error-600);
  font-size: 24px;
  margin-bottom: 16px;
}

.emergency-content p {
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.emergency-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.emergency-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 16px;
  border: 2px solid var(--primary-200);
  border-radius: 12px;
  background: var(--primary-50);
  color: var(--primary-700);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 14px;
  font-weight: 500;
}

.emergency-btn:hover {
  border-color: var(--primary-400);
  background: var(--primary-100);
  transform: translateY(-2px);
}

.emergency-btn:focus-visible {
  outline: 3px solid var(--primary-300);
  outline-offset: 2px;
}

.emergency-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--gray-100);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--gray-600);
  font-size: 18px;
}

.emergency-close:hover {
  background: var(--gray-200);
  color: var(--gray-800);
}

/* アニメーション */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

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

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .voice-control-indicator {
    top: 10px;
    right: 10px;
    padding: 8px 12px;
    font-size: 14px;
  }
  
  .cognitive-load-indicator {
    bottom: 10px;
    left: 10px;
    padding: 8px;
    min-width: 150px;
  }
  
  .accessibility-fab {
    bottom: 20px;
    right: 20px;
  }
  
  .fab-trigger {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .emergency-content {
    padding: 24px;
    margin: 16px;
  }
  
  .emergency-options {
    grid-template-columns: 1fr;
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

.high-contrast .emergency-btn {
  border-width: 3px;
  font-weight: 700;
}

/* モーション削減対応 */
.reduced-motion * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}

.reduced-motion .voice-indicator-pulse {
  animation: none;
  opacity: 1;
  transform: scale(1);
}

/* 音声コントロール有効時のスタイル */
.voice-control-active .fab-trigger {
  animation: pulseGlow 2s infinite;
}

@keyframes pulseGlow {
  0%, 100% { 
    box-shadow: var(--shadow-fab), 0 0 0 0 rgba(129, 140, 248, 0.4);
  }
  50% { 
    box-shadow: var(--shadow-fab), 0 0 0 10px rgba(129, 140, 248, 0);
  }
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