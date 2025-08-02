<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ScreenReaderManager } from './ScreenReaderManager'

// アクセシビリティ設定の型定義
interface AccessibilitySettings {
  // 視覚設定
  colorScheme: 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
  
  // モーション設定
  reduceMotion: boolean
  animationSpeed: number // 0.0 - 2.0
  
  // オーディオ設定
  screenReaderEnabled: boolean
  audioDescriptions: boolean
  soundEffectsVolume: number // 0 - 100
  
  // インタラクション設定
  stickyKeys: boolean
  keyRepeatDelay: number // ミリ秒
  touchTargetSize: 'default' | 'large' | 'extra-large'
}

const props = defineProps<{
  isOpen: boolean
}>()

const emit = defineEmits<{
  close: []
  settingsChanged: [settings: AccessibilitySettings]
}>()

// デフォルト設定
const defaultSettings: AccessibilitySettings = {
  colorScheme: 'default',
  highContrast: false,
  fontSize: 'medium',
  reduceMotion: false,
  animationSpeed: 1.0,
  screenReaderEnabled: false,
  audioDescriptions: false,
  soundEffectsVolume: 70,
  stickyKeys: false,
  keyRepeatDelay: 500,
  touchTargetSize: 'default'
}

const settings = ref<AccessibilitySettings>({ ...defaultSettings })
const screenReaderManager = ref<ScreenReaderManager | null>(null)

// 色覚シミュレーションフィルター
const colorFilters = {
  default: '',
  protanopia: `
    <filter id="protanopia">
      <feColorMatrix type="matrix" values="
        0.567, 0.433, 0,     0, 0
        0.558, 0.442, 0,     0, 0
        0,     0.242, 0.758, 0, 0
        0,     0,     0,     1, 0
      "/>
    </filter>
  `,
  deuteranopia: `
    <filter id="deuteranopia">
      <feColorMatrix type="matrix" values="
        0.625, 0.375, 0,   0, 0
        0.7,   0.3,   0,   0, 0
        0,     0.3,   0.7, 0, 0
        0,     0,     0,   1, 0
      "/>
    </filter>
  `,
  tritanopia: `
    <filter id="tritanopia">
      <feColorMatrix type="matrix" values="
        0.95, 0.05,  0,     0, 0
        0,    0.433, 0.567, 0, 0
        0,    0.475, 0.525, 0, 0
        0,    0,     0,     1, 0
      "/>
    </filter>
  `,
  achromatopsia: `
    <filter id="achromatopsia">
      <feColorMatrix type="matrix" values="
        0.299, 0.587, 0.114, 0, 0
        0.299, 0.587, 0.114, 0, 0
        0.299, 0.587, 0.114, 0, 0
        0,     0,     0,     1, 0
      "/>
    </filter>
  `
}

// 設定の永続化
const saveSettings = () => {
  localStorage.setItem('accessibility-settings', JSON.stringify(settings.value))
  emit('settingsChanged', settings.value)
  applySettings()
}

const loadSettings = () => {
  const saved = localStorage.getItem('accessibility-settings')
  if (saved) {
    try {
      settings.value = { ...defaultSettings, ...JSON.parse(saved) }
    } catch (e) {
      console.error('Failed to load accessibility settings:', e)
    }
  }
}

// 設定の適用
const applySettings = () => {
  const root = document.documentElement
  
  // 色覚異常フィルター
  if (settings.value.colorScheme !== 'default') {
    root.style.filter = `url(#${settings.value.colorScheme})`
  } else {
    root.style.filter = ''
  }
  
  // ハイコントラストモード
  root.classList.toggle('high-contrast', settings.value.highContrast)
  
  // フォントサイズ
  const fontSizeMap = {
    'small': '14px',
    'medium': '16px',
    'large': '20px',
    'extra-large': '24px'
  }
  root.style.setProperty('--base-font-size', fontSizeMap[settings.value.fontSize])
  
  // モーション設定
  root.classList.toggle('reduce-motion', settings.value.reduceMotion)
  root.style.setProperty('--animation-speed-multiplier', String(settings.value.animationSpeed))
  
  // タッチターゲットサイズ
  const touchSizeMap = {
    'default': '44px',
    'large': '56px',
    'extra-large': '72px'
  }
  root.style.setProperty('--touch-target-size', touchSizeMap[settings.value.touchTargetSize])
  
  // スクリーンリーダー通知
  if (screenReaderManager.value) {
    screenReaderManager.value.announce('アクセシビリティ設定が更新されました', { priority: 'polite' })
  }
}

// プレビュー機能
const previewSettings = (setting: keyof AccessibilitySettings, value: any) => {
  const originalValue = settings.value[setting]
  settings.value[setting] = value
  applySettings()
  
  // 3秒後に元に戻す
  setTimeout(() => {
    if (settings.value[setting] === value) {
      settings.value[setting] = originalValue
      applySettings()
    }
  }, 3000)
}

// 設定のリセット
const resetSettings = () => {
  settings.value = { ...defaultSettings }
  saveSettings()
  
  if (screenReaderManager.value) {
    screenReaderManager.value.announce('アクセシビリティ設定をリセットしました', { priority: 'assertive' })
  }
}

// ショートカットキーの設定
const setupKeyboardShortcuts = () => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return
    
    // Ctrl + Alt + キーの組み合わせ
    if (e.ctrlKey && e.altKey) {
      switch (e.key) {
        case 'c':
          // 色覚設定を循環
          const schemes: AccessibilitySettings['colorScheme'][] = 
            ['default', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']
          const currentIndex = schemes.indexOf(settings.value.colorScheme)
          settings.value.colorScheme = schemes[(currentIndex + 1) % schemes.length]
          saveSettings()
          break
          
        case 'h':
          // ハイコントラスト切り替え
          settings.value.highContrast = !settings.value.highContrast
          saveSettings()
          break
          
        case 'm':
          // モーション削減切り替え
          settings.value.reduceMotion = !settings.value.reduceMotion
          saveSettings()
          break
      }
    }
  }
  
  window.addEventListener('keydown', handleKeyDown)
  return () => { window.removeEventListener('keydown', handleKeyDown); }
}

onMounted(() => {
  loadSettings()
  applySettings()
  screenReaderManager.value = new ScreenReaderManager()
  const cleanup = setupKeyboardShortcuts()
  
  // クリーンアップ
  return () => {
    cleanup()
    screenReaderManager.value?.destroy()
  }
})

// 設定変更の監視
watch(() => settings.value, () => {
  saveSettings()
}, { deep: true })
</script>

<template>
  <Transition name="modal">
    <div v-if="isOpen" class="accessibility-modal" @click.self="emit('close')">
      <div 
        class="modal-content"
        role="dialog"
        aria-labelledby="accessibility-title"
        aria-describedby="accessibility-description"
      >
        <!-- SVGフィルター定義 -->
        <svg style="position: absolute; width: 0; height: 0;">
          <defs v-html="Object.values(colorFilters).join('')"></defs>
        </svg>
        
        <div class="modal-header">
          <h2 id="accessibility-title">アクセシビリティ設定</h2>
          <button 
            @click="emit('close')"
            class="close-button"
            aria-label="設定を閉じる"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        
        <div id="accessibility-description" class="sr-only">
          ゲームのアクセシビリティオプションを設定できます。
          Ctrl+Alt+Cで色覚設定、Ctrl+Alt+Hでハイコントラスト、Ctrl+Alt+Mでモーション削減を切り替えられます。
        </div>
        
        <div class="modal-body">
          <!-- 視覚設定 -->
          <section class="settings-section">
            <h3>視覚設定</h3>
            
            <div class="setting-item">
              <label for="color-scheme">色覚サポート</label>
              <select 
                id="color-scheme"
                v-model="settings.colorScheme"
                @change="saveSettings"
              >
                <option value="default">標準</option>
                <option value="protanopia">赤色覚異常（1型）</option>
                <option value="deuteranopia">緑色覚異常（2型）</option>
                <option value="tritanopia">青色覚異常（3型）</option>
                <option value="achromatopsia">全色覚異常</option>
              </select>
              <button 
                @click="previewSettings('colorScheme', settings.colorScheme)"
                class="preview-button"
                aria-label="色覚設定をプレビュー"
              >
                プレビュー
              </button>
            </div>
            
            <div class="setting-item">
              <label for="high-contrast">
                <input 
                  id="high-contrast"
                  type="checkbox"
                  v-model="settings.highContrast"
                  @change="saveSettings"
                >
                ハイコントラストモード
              </label>
              <span class="setting-description">
                コントラストを高めて視認性を向上させます
              </span>
            </div>
            
            <div class="setting-item">
              <label for="font-size">文字サイズ</label>
              <select 
                id="font-size"
                v-model="settings.fontSize"
                @change="saveSettings"
              >
                <option value="small">小（14px）</option>
                <option value="medium">中（16px）</option>
                <option value="large">大（20px）</option>
                <option value="extra-large">特大（24px）</option>
              </select>
            </div>
          </section>
          
          <!-- モーション設定 -->
          <section class="settings-section">
            <h3>モーション設定</h3>
            
            <div class="setting-item">
              <label for="reduce-motion">
                <input 
                  id="reduce-motion"
                  type="checkbox"
                  v-model="settings.reduceMotion"
                  @change="saveSettings"
                >
                モーションを削減
              </label>
              <span class="setting-description">
                アニメーションを最小限に抑えます
              </span>
            </div>
            
            <div class="setting-item" v-if="!settings.reduceMotion">
              <label for="animation-speed">アニメーション速度</label>
              <input 
                id="animation-speed"
                type="range"
                min="0.1"
                max="2.0"
                step="0.1"
                v-model.number="settings.animationSpeed"
                @change="saveSettings"
              >
              <span class="range-value">{{ settings.animationSpeed }}x</span>
            </div>
          </section>
          
          <!-- オーディオ設定 -->
          <section class="settings-section">
            <h3>オーディオ設定</h3>
            
            <div class="setting-item">
              <label for="screen-reader">
                <input 
                  id="screen-reader"
                  type="checkbox"
                  v-model="settings.screenReaderEnabled"
                  @change="saveSettings"
                >
                スクリーンリーダー対応を有効化
              </label>
            </div>
            
            <div class="setting-item">
              <label for="audio-descriptions">
                <input 
                  id="audio-descriptions"
                  type="checkbox"
                  v-model="settings.audioDescriptions"
                  @change="saveSettings"
                >
                音声説明を有効化
              </label>
            </div>
            
            <div class="setting-item">
              <label for="sound-volume">効果音の音量</label>
              <input 
                id="sound-volume"
                type="range"
                min="0"
                max="100"
                step="5"
                v-model.number="settings.soundEffectsVolume"
                @change="saveSettings"
              >
              <span class="range-value">{{ settings.soundEffectsVolume }}%</span>
            </div>
          </section>
          
          <!-- インタラクション設定 -->
          <section class="settings-section">
            <h3>インタラクション設定</h3>
            
            <div class="setting-item">
              <label for="sticky-keys">
                <input 
                  id="sticky-keys"
                  type="checkbox"
                  v-model="settings.stickyKeys"
                  @change="saveSettings"
                >
                スティッキーキー
              </label>
              <span class="setting-description">
                修飾キーを一度に押す必要がありません
              </span>
            </div>
            
            <div class="setting-item">
              <label for="touch-target-size">タッチターゲットサイズ</label>
              <select 
                id="touch-target-size"
                v-model="settings.touchTargetSize"
                @change="saveSettings"
              >
                <option value="default">標準（44px）</option>
                <option value="large">大（56px）</option>
                <option value="extra-large">特大（72px）</option>
              </select>
            </div>
          </section>
        </div>
        
        <div class="modal-footer">
          <button 
            @click="resetSettings"
            class="reset-button"
            aria-label="すべての設定をリセット"
          >
            設定をリセット
          </button>
          <button 
            @click="emit('close')"
            class="save-button"
            aria-label="設定を保存して閉じる"
          >
            保存して閉じる
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.accessibility-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-md);
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-card);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  color: var(--primary-light);
  font-size: var(--text-2xl);
}

.close-button {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  font-size: var(--text-2xl);
  cursor: pointer;
  padding: var(--space-xs);
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.close-button:focus {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
}

.modal-body {
  padding: var(--space-lg);
}

.settings-section {
  margin-bottom: var(--space-2xl);
}

.settings-section:last-child {
  margin-bottom: 0;
}

.settings-section h3 {
  color: white;
  font-size: var(--text-lg);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-xs);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.setting-item {
  margin-bottom: var(--space-lg);
  display: flex;
  align-items: center;
  gap: var(--space-md);
  flex-wrap: wrap;
}

.setting-item label {
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-base);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  min-width: 200px;
}

.setting-item select,
.setting-item input[type="range"] {
  flex: 1;
  min-width: 150px;
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  color: white;
  font-size: var(--text-base);
}

.setting-item select:focus,
.setting-item input:focus {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
}

.setting-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.setting-description {
  display: block;
  width: 100%;
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.6);
  margin-top: var(--space-xs);
}

.preview-button {
  padding: var(--space-xs) var(--space-sm);
  background: rgba(129, 140, 248, 0.2);
  border: 1px solid rgba(129, 140, 248, 0.4);
  border-radius: 4px;
  color: var(--primary-light);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.preview-button:hover {
  background: rgba(129, 140, 248, 0.3);
  border-color: rgba(129, 140, 248, 0.6);
}

.range-value {
  color: var(--primary-light);
  font-size: var(--text-sm);
  min-width: 50px;
  text-align: right;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-lg);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.reset-button,
.save-button {
  padding: var(--space-sm) var(--space-lg);
  border-radius: 8px;
  font-size: var(--text-base);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-normal);
  min-height: var(--touch-target-min);
}

.reset-button {
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #EF4444;
}

.reset-button:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.6);
}

.save-button {
  background: var(--primary-gradient);
  border: none;
  color: white;
}

.save-button:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

/* モーダルアニメーション */
.modal-enter-active,
.modal-leave-active {
  transition: all var(--transition-normal);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.9) translateY(20px);
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: high) {
  .modal-content {
    border: 2px solid white;
  }
  
  .setting-item select,
  .setting-item input[type="range"] {
    border-width: 2px;
  }
  
  .close-button:focus,
  .setting-item select:focus,
  .setting-item input:focus {
    outline-width: 3px;
  }
}

/* モバイル対応 */
@media (max-width: 640px) {
  .modal-content {
    max-height: 100vh;
    height: 100%;
    border-radius: 0;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .setting-item label {
    min-width: auto;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: var(--space-md);
  }
  
  .reset-button,
  .save-button {
    width: 100%;
  }
}
</style>