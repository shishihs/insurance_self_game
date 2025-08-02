<template>
  <div class="theme-selector" :class="{ 'expanded': isExpanded }">
    <!-- トリガーボタン -->
    <button
      ref="triggerRef"
      class="theme-trigger"
      :class="{ 'active': isExpanded }"
      :aria-label="$t('theme.selector.label', 'テーマを選択')"
      :aria-expanded="isExpanded"
      aria-haspopup="true"
      @click="toggleExpanded"
    >
      <div class="current-theme-preview">
        <div class="theme-color-dots">
          <div 
            class="color-dot" 
            :style="{ backgroundColor: currentTheme.colors.primary }"
          />
          <div 
            class="color-dot" 
            :style="{ backgroundColor: currentTheme.colors.accent }"
          />
          <div 
            class="color-dot" 
            :style="{ backgroundColor: currentTheme.colors.secondary }"
          />
        </div>
      </div>
      <span class="theme-name">{{ currentTheme.name }}</span>
      <ChevronDownIcon 
        class="chevron-icon" 
        :class="{ 'rotated': isExpanded }"
      />
    </button>

    <!-- テーマ選択パネル -->
    <Transition name="theme-panel">
      <div 
        v-if="isExpanded"
        ref="panelRef"
        class="theme-panel"
        role="menu"
        :aria-labelledby="triggerId"
      >
        <!-- テーマオプション -->
        <div class="theme-options">
          <button
            v-for="theme in availableThemes"
            :key="theme.id"
            class="theme-option"
            :class="{ 'active': theme.id === currentTheme.id }"
            role="menuitem"
            :aria-selected="theme.id === currentTheme.id"
            @click="selectTheme(theme.id)"
          >
            <div class="theme-preview">
              <div class="preview-background" :style="getPreviewBackgroundStyle(theme)" />
              <div class="preview-content">
                <div class="preview-title" :style="{ color: theme.colors.text }">
                  {{ theme.name }}
                </div>
                <div class="preview-description" :style="{ color: theme.colors.textSecondary }">
                  {{ theme.description }}
                </div>
                <div class="preview-colors">
                  <div 
                    v-for="(color, index) in getThemeColors(theme)"
                    :key="index"
                    class="preview-color"
                    :style="{ backgroundColor: color }"
                  />
                </div>
              </div>
            </div>
            <CheckIcon v-if="theme.id === currentTheme.id" class="check-icon" />
          </button>
        </div>

        <!-- カスタム設定 -->
        <div class="custom-settings">
          <h3 class="settings-title">{{ $t('theme.customization.title', 'カスタマイズ') }}</h3>
          
          <!-- フォントサイズ -->
          <div class="setting-group">
            <label class="setting-label">
              {{ $t('theme.fontSize.label', 'フォントサイズ') }}
            </label>
            <div class="font-size-options">
              <button
                v-for="size in fontSizeOptions"
                :key="size.value"
                class="font-size-button"
                :class="{ 'active': userPreferences.fontSize === size.value }"
                :aria-label="size.label"
                @click="updateFontSize(size.value)"
              >
                {{ size.icon }}
              </button>
            </div>
          </div>

          <!-- アニメーション速度 -->
          <div class="setting-group">
            <label class="setting-label">
              {{ $t('theme.animationSpeed.label', 'アニメーション') }}
            </label>
            <div class="animation-speed-options">
              <button
                v-for="speed in animationSpeedOptions"
                :key="speed.value"
                class="animation-speed-button"
                :class="{ 'active': userPreferences.animationSpeed === speed.value }"
                @click="updateAnimationSpeed(speed.value)"
              >
                {{ speed.label }}
              </button>
            </div>
          </div>

          <!-- アクセシビリティ設定 -->
          <div class="accessibility-settings">
            <label class="accessibility-toggle">
              <input
                type="checkbox"
                :checked="userPreferences.reducedMotion"
                @change="updateReducedMotion($event.target.checked)"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-label">
                {{ $t('theme.reducedMotion.label', 'モーション削減') }}
              </span>
            </label>

            <label class="accessibility-toggle">
              <input
                type="checkbox"
                :checked="userPreferences.highContrast"
                @change="updateHighContrast($event.target.checked)"
              />
              <span class="toggle-slider"></span>
              <span class="toggle-label">
                {{ $t('theme.highContrast.label', 'ハイコントラスト') }}
              </span>
            </label>
          </div>
        </div>

        <!-- カスタムカラー -->
        <div v-if="showCustomColors" class="custom-colors">
          <h3 class="settings-title">{{ $t('theme.customColors.title', 'カスタムカラー') }}</h3>
          <div class="color-inputs">
            <div 
              v-for="colorKey in customizableColors"
              :key="colorKey"
              class="color-input-group"
            >
              <label :for="`color-${colorKey}`" class="color-label">
                {{ $t(`theme.colors.${colorKey}`, colorKey) }}
              </label>
              <input
                :id="`color-${colorKey}`"
                type="color"
                :value="getCustomColor(colorKey)"
                class="color-input"
                @input="updateCustomColor(colorKey, $event.target.value)"
              />
            </div>
          </div>
          <button 
            class="reset-colors-button"
            @click="resetCustomColors"
          >
            {{ $t('theme.resetColors', 'リセット') }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- 背景オーバーレイ -->
    <div 
      v-if="isExpanded"
      class="theme-overlay"
      @click="closePanel"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
import { type ThemeConfig, ThemeManager, type UserPreferences } from './ThemeManager'

// アイコンコンポーネント（簡略化）
const ChevronDownIcon = {
  template: '<svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>'
}

const CheckIcon = {
  template: '<svg viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>'
}

interface ThemeSelectorProps {
  showCustomColors?: boolean
  compact?: boolean
}

const props = withDefaults(defineProps<ThemeSelectorProps>(), {
  showCustomColors: true,
  compact: false
})

const emit = defineEmits<{
  themeChanged: [theme: ThemeConfig]
  preferencesChanged: [preferences: UserPreferences]
}>()

const triggerRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const isExpanded = ref(false)
const triggerId = ref(`theme-trigger-${Math.random().toString(36).substr(2, 9)}`)

let themeManager: ThemeManager | null = null
const currentTheme = ref<ThemeConfig>()
const availableThemes = ref<ThemeConfig[]>([])
const userPreferences = ref<UserPreferences>()

// オプションデータ
const fontSizeOptions = [
  { value: 'small' as const, label: 'Small', icon: 'A' },
  { value: 'medium' as const, label: 'Medium', icon: 'A' },
  { value: 'large' as const, label: 'Large', icon: 'A' }
]

const animationSpeedOptions = [
  { value: 'slow' as const, label: 'Slow' },
  { value: 'normal' as const, label: 'Normal' },
  { value: 'fast' as const, label: 'Fast' }
]

const customizableColors = ['primary', 'accent', 'background', 'text']

// 計算されたプロパティ
const getThemeColors = (theme: ThemeConfig) => [
  theme.colors.primary,
  theme.colors.accent,
  theme.colors.secondary,
  theme.colors.success
]

const getPreviewBackgroundStyle = (theme: ThemeConfig) => ({
  background: theme.gradients.background,
  borderColor: theme.colors.border
})

const getCustomColor = (colorKey: string) => {
  return userPreferences.value?.customColors?.[colorKey] || currentTheme.value?.colors[colorKey] || '#000000'
}

// メソッド
const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value
  
  if (isExpanded.value) {
    nextTick(() => {
      positionPanel()
    })
  }
}

const closePanel = () => {
  isExpanded.value = false
}

const positionPanel = () => {
  if (!triggerRef.value || !panelRef.value) return

  const triggerRect = triggerRef.value.getBoundingClientRect()
  const panel = panelRef.value
  const viewportHeight = window.innerHeight

  // パネルの位置を調整
  if (triggerRect.bottom + 400 > viewportHeight) {
    panel.style.bottom = '100%'
    panel.style.top = 'auto'
  } else {
    panel.style.top = '100%'
    panel.style.bottom = 'auto'
  }
}

const selectTheme = async (themeId: string) => {
  if (!themeManager) return

  await themeManager.animateThemeTransition()
  themeManager.setTheme(themeId)
  closePanel()
}

const updateFontSize = (fontSize: UserPreferences['fontSize']) => {
  if (!themeManager) return
  
  themeManager.updateUserPreferences({ fontSize })
}

const updateAnimationSpeed = (animationSpeed: UserPreferences['animationSpeed']) => {
  if (!themeManager) return
  
  themeManager.updateUserPreferences({ animationSpeed })
}

const updateReducedMotion = (reducedMotion: boolean) => {
  if (!themeManager) return
  
  themeManager.updateUserPreferences({ reducedMotion })
}

const updateHighContrast = (highContrast: boolean) => {
  if (!themeManager) return
  
  themeManager.updateUserPreferences({ highContrast })
}

const updateCustomColor = (colorKey: string, color: string) => {
  if (!themeManager || !userPreferences.value) return
  
  const customColors = { ...userPreferences.value.customColors, [colorKey]: color }
  themeManager.updateUserPreferences({ customColors })
}

const resetCustomColors = () => {
  if (!themeManager) return
  
  themeManager.updateUserPreferences({ customColors: {} })
}

// 外部クリック検出
const handleClickOutside = (event: Event) => {
  if (!triggerRef.value || !panelRef.value) return
  
  const target = event.target as Element
  if (!triggerRef.value.contains(target) && !panelRef.value.contains(target)) {
    closePanel()
  }
}

// ESCキー検出
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && isExpanded.value) {
    closePanel()
    triggerRef.value?.focus()
  }
}

onMounted(() => {
  // ThemeManagerの初期化
  themeManager = new ThemeManager()
  
  // 初期状態の設定
  currentTheme.value = themeManager.getCurrentTheme()
  availableThemes.value = themeManager.getAvailableThemes()
  userPreferences.value = themeManager.getUserPreferences()

  // テーマ変更の監視
  const unsubscribe = themeManager.subscribe((theme, preferences) => {
    currentTheme.value = theme
    userPreferences.value = preferences
    emit('themeChanged', theme)
    emit('preferencesChanged', preferences)
  })

  // イベントリスナーの設定
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)

  return () => {
    unsubscribe()
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  themeManager?.destroy()
})
</script>

<style scoped>
.theme-selector {
  position: relative;
  display: inline-block;
}

.theme-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  cursor: pointer;
  transition: all var(--animation-normal);
  font-size: var(--text-sm);
  color: var(--color-text);
}

.theme-trigger:hover {
  background: var(--color-surface-light);
  border-color: var(--color-primary);
}

.theme-trigger.active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.current-theme-preview {
  display: flex;
  align-items: center;
}

.theme-color-dots {
  display: flex;
  gap: 2px;
}

.color-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid var(--color-border-light);
}

.theme-name {
  font-weight: var(--font-medium);
}

.chevron-icon {
  width: 16px;
  height: 16px;
  transition: transform var(--animation-normal);
  color: var(--color-text-secondary);
}

.chevron-icon.rotated {
  transform: rotate(180deg);
}

.theme-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  min-width: 320px;
  max-height: 500px;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-large);
  box-shadow: var(--shadow-large);
  backdrop-filter: blur(8px);
  z-index: 1000;
  margin-top: 4px;
}

.theme-options {
  padding: 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.theme-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  background: transparent;
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-medium);
  cursor: pointer;
  transition: all var(--animation-normal);
}

.theme-option:hover {
  border-color: var(--color-primary);
  background: var(--color-surface-light);
}

.theme-option.active {
  border-color: var(--color-primary);
  background: rgba(99, 102, 241, 0.1);
}

.theme-preview {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-background {
  width: 100%;
  height: 40px;
  border-radius: var(--radius-small);
  border: 1px solid var(--color-border-light);
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-title {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
}

.preview-description {
  font-size: var(--text-xs);
  opacity: 0.8;
}

.preview-colors {
  display: flex;
  gap: 4px;
}

.preview-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.check-icon {
  width: 20px;
  height: 20px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.custom-settings {
  padding: 16px;
  border-bottom: 1px solid var(--color-border-light);
}

.settings-title {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text);
  margin-bottom: 12px;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text);
  margin-bottom: 8px;
}

.font-size-options {
  display: flex;
  gap: 8px;
}

.font-size-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 32px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  cursor: pointer;
  transition: all var(--animation-normal);
  font-weight: var(--font-medium);
}

.font-size-button:hover {
  border-color: var(--color-primary);
}

.font-size-button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.animation-speed-options {
  display: flex;
  gap: 8px;
}

.animation-speed-button {
  padding: 6px 12px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  cursor: pointer;
  transition: all var(--animation-normal);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.animation-speed-button:hover {
  border-color: var(--color-primary);
}

.animation-speed-button.active {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.accessibility-settings {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.accessibility-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.accessibility-toggle input[type="checkbox"] {
  display: none;
}

.toggle-slider {
  width: 40px;
  height: 20px;
  background: var(--color-surface-dark);
  border-radius: var(--radius-pill);
  position: relative;
  transition: background var(--animation-normal);
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform var(--animation-normal);
}

.accessibility-toggle input:checked + .toggle-slider {
  background: var(--color-primary);
}

.accessibility-toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.toggle-label {
  font-size: var(--text-sm);
  color: var(--color-text);
}

.custom-colors {
  padding: 16px;
}

.color-inputs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.color-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.color-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-transform: capitalize;
}

.color-input {
  width: 100%;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-small);
  cursor: pointer;
}

.reset-colors-button {
  width: 100%;
  padding: 8px;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-medium);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  transition: all var(--animation-normal);
}

.reset-colors-button:hover {
  border-color: var(--color-error);
  color: var(--color-error);
}

.theme-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.1);
  z-index: 999;
}

/* トランジション */
.theme-panel-enter-active,
.theme-panel-leave-active {
  transition: all var(--animation-normal);
}

.theme-panel-enter-from,
.theme-panel-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

/* レスポンシブ */
@media (max-width: 640px) {
  .theme-panel {
    min-width: 280px;
    max-height: 70vh;
  }
  
  .color-inputs {
    grid-template-columns: 1fr;
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .theme-trigger,
  .theme-option,
  .chevron-icon,
  .toggle-slider,
  .toggle-slider::before {
    transition: none;
  }

  .theme-panel-enter-active,
  .theme-panel-leave-active {
    transition: none;
  }
}

/* フォーカス表示 */
.theme-trigger:focus,
.theme-option:focus,
.font-size-button:focus,
.animation-speed-button:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>