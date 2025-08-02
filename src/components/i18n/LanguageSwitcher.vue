<!--
  言語切り替えコンポーネント
  ユーザーが動的に言語を変更できるインターフェース
-->

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { 
  getCurrentLocale,
  LOCALE_NAMES,
  setLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale
} from '@/i18n'

const { t } = useI18n()

// コンポーネントプロパティ
interface Props {
  // 表示モード
  mode?: 'dropdown' | 'buttons' | 'flags'
  // コンパクト表示
  compact?: boolean
  // アクセシビリティラベル
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'dropdown',
  compact: false,
  ariaLabel: ''
})

// 状態管理
const isOpen = ref(false)
const currentLocale = ref<SupportedLocale>(getCurrentLocale())

// 計算プロパティ
const currentLocaleName = computed(() => LOCALE_NAMES[currentLocale.value])

const localeOptions = computed(() => 
  SUPPORTED_LOCALES.map(locale => ({
    value: locale,
    label: LOCALE_NAMES[locale],
    flag: getFlagEmoji(locale),
    isActive: locale === currentLocale.value
  }))
)

// 各言語の国旗絵文字
function getFlagEmoji(locale: SupportedLocale): string {
  const flags: Record<SupportedLocale, string> = {
    ja: '🇯🇵',
    en: '🇺🇸', 
    zh: '🇨🇳',
    ko: '🇰🇷'
  }
  return flags[locale]
}

// 言語変更処理
function changeLanguage(locale: SupportedLocale) {
  currentLocale.value = locale
  setLocale(locale)
  isOpen.value = false
  
  // アクセシビリティ: 言語変更をアナウンス
  const message = `Language changed to ${LOCALE_NAMES[locale]}`
  announceToScreenReader(message)
}

// スクリーンリーダーへのアナウンス
function announceToScreenReader(message: string) {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', 'polite')
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 1000)
}

// ドロップダウンの開閉
function toggleDropdown() {
  isOpen.value = !isOpen.value
}

// 外部クリックでドロップダウンを閉じる
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (!target.closest('.language-switcher')) {
    isOpen.value = false
  }
}

// キーボード操作
function handleKeydown(event: KeyboardEvent, locale?: SupportedLocale) {
  switch (event.key) {
    case 'Enter':
    case ' ':
      event.preventDefault()
      if (locale) {
        changeLanguage(locale)
      } else {
        toggleDropdown()
      }
      break
    case 'Escape':
      if (isOpen.value) {
        isOpen.value = false
        // フォーカスをトリガーボタンに戻す
        const trigger = document.querySelector('.language-trigger') as HTMLElement
        trigger?.focus()
      }
      break
    case 'ArrowDown':
      if (props.mode === 'dropdown' && isOpen.value) {
        event.preventDefault()
        const nextOption = document.querySelector('.language-option:not([aria-selected="true"]) + .language-option') as HTMLElement
        nextOption?.focus()
      }
      break
    case 'ArrowUp':
      if (props.mode === 'dropdown' && isOpen.value) {
        event.preventDefault()
        const prevOption = document.querySelector('.language-option[aria-selected="true"]')?.previousElementSibling as HTMLElement
        prevOption?.focus()
      }
      break
  }
}

// ライフサイクル
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div 
    class="language-switcher"
    :class="[`language-switcher--${mode}`, { 'language-switcher--compact': compact }]"
  >
    <!-- ドロップダウンモード -->
    <div v-if="mode === 'dropdown'" class="language-dropdown">
      <button
        class="language-trigger"
        :aria-label="ariaLabel || t('accessibility.options.changeLanguage', 'Change Language')"
        :aria-expanded="isOpen"
        aria-haspopup="listbox"
        @click="toggleDropdown"
        @keydown="handleKeydown"
      >
        <span class="current-flag" aria-hidden="true">{{ getFlagEmoji(currentLocale) }}</span>
        <span v-if="!compact" class="current-label">{{ currentLocaleName }}</span>
        <span class="dropdown-icon" aria-hidden="true" :class="{ 'dropdown-icon--open': isOpen }">
          ▼
        </span>
      </button>
      
      <Transition name="dropdown">
        <ul
          v-if="isOpen"
          class="language-options"
          role="listbox"
          :aria-label="t('ui.navigation.selectLanguage', 'Select Language')"
        >
          <li
            v-for="option in localeOptions"
            :key="option.value"
            class="language-option"
            role="option" 
            :aria-selected="option.isActive"
            :tabindex="option.isActive ? 0 : -1"
            @click="changeLanguage(option.value)"
            @keydown="handleKeydown($event, option.value)"
          >
            <span class="option-flag" aria-hidden="true">{{ option.flag }}</span>
            <span class="option-label">{{ option.label }}</span>
            <span v-if="option.isActive" class="option-check" aria-hidden="true">✓</span>
          </li>
        </ul>
      </Transition>
    </div>
    
    <!-- ボタンモード -->
    <div v-else-if="mode === 'buttons'" class="language-buttons">
      <button
        v-for="option in localeOptions"
        :key="option.value"
        class="language-button"
        :class="{ 'language-button--active': option.isActive }"
        :aria-label="`${t('ui.navigation.switchTo', 'Switch to')} ${option.label}`"
        :aria-pressed="option.isActive"
        @click="changeLanguage(option.value)"
      >
        <span class="button-flag" aria-hidden="true">{{ option.flag }}</span>
        <span v-if="!compact" class="button-label">{{ option.label }}</span>
      </button>
    </div>
    
    <!-- フラグモード -->
    <div v-else-if="mode === 'flags'" class="language-flags">
      <button
        v-for="option in localeOptions"
        :key="option.value"
        class="language-flag"
        :class="{ 'language-flag--active': option.isActive }"
        :aria-label="`${t('ui.navigation.switchTo', 'Switch to')} ${option.label}`"
        :title="option.label"
        @click="changeLanguage(option.value)"
      >
        {{ option.flag }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* =================================
   言語切り替えコンポーネント基本スタイル
   ================================= */

.language-switcher {
  position: relative;
  font-family: Inter, system-ui, sans-serif;
}

/* =================================
   ドロップダウンモード
   ================================= */

.language-dropdown {
  position: relative;
}

.language-trigger {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: var(--space-sm) var(--space-md);
  
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
  font-weight: 500;
  
  cursor: pointer;
  transition: all var(--transition-fast);
  
  min-width: 120px;
  justify-content: space-between;
}

.language-trigger:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.language-trigger:focus {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
}

.current-flag {
  font-size: 1.2em;
}

.current-label {
  flex: 1;
  text-align: left;
}

.dropdown-icon {
  font-size: 0.8em;
  transition: transform var(--transition-fast);
}

.dropdown-icon--open {
  transform: rotate(180deg);
}

.language-options {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: var(--z-dropdown);
  
  background: rgba(30, 30, 30, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  margin-top: var(--space-xs);
  
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-card);
  
  list-style: none;
  padding: var(--space-xs) 0;
  margin: 0;
  
  max-height: 200px;
  overflow-y: auto;
}

.language-option {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  
  padding: var(--space-sm) var(--space-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  
  color: rgba(255, 255, 255, 0.9);
  font-size: var(--text-sm);
}

.language-option:hover,
.language-option:focus {
  background: rgba(255, 255, 255, 0.1);
  outline: none;
}

.language-option[aria-selected="true"] {
  background: rgba(129, 140, 248, 0.2);
  color: rgba(129, 140, 248, 1);
}

.option-flag {
  font-size: 1.1em;
}

.option-label {
  flex: 1;
}

.option-check {
  color: var(--primary-light);
  font-weight: bold;
}

/* =================================
   ボタンモード
   ================================= */

.language-buttons {
  display: flex;
  gap: var(--space-xs);
  flex-wrap: wrap;
}

.language-button {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: var(--space-xs) var(--space-sm);
  
  color: rgba(255, 255, 255, 0.7);
  font-size: var(--text-sm);
  font-weight: 500;
  
  cursor: pointer;
  transition: all var(--transition-fast);
}

.language-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
}

.language-button:focus {
  outline: 2px solid var(--primary-light);
  outline-offset: 1px;
}

.language-button--active {
  background: rgba(129, 140, 248, 0.2);
  border-color: rgba(129, 140, 248, 0.4);
  color: rgba(129, 140, 248, 1);
}

.button-flag {
  font-size: 1.1em;
}

/* =================================
   フラグモード
   ================================= */

.language-flags {
  display: flex;
  gap: var(--space-xs);
}

.language-flag {
  display: flex;
  align-items: center;
  justify-content: center;
  
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  
  font-size: 1.5em;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.language-flag:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.1);
}

.language-flag:focus {
  outline: 2px solid var(--primary-light);
  outline-offset: 2px;
}

.language-flag--active {
  border-color: var(--primary-light);
  background: rgba(129, 140, 248, 0.1);
}

/* =================================
   コンパクトモード
   ================================= */

.language-switcher--compact .language-trigger {
  min-width: auto;
  padding: var(--space-xs) var(--space-sm);
}

.language-switcher--compact .language-button {
  padding: var(--space-xs);
}

/* =================================
   アニメーション
   ================================= */

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-normal);
  transform-origin: top;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scaleY(0.8) translateY(-8px);
}

.dropdown-enter-to,
.dropdown-leave-from {
  opacity: 1;
  transform: scaleY(1) translateY(0);
}

/* =================================
   レスポンシブ対応
   ================================= */

@media (max-width: 640px) {
  .language-trigger {
    min-width: auto;
    padding: var(--space-xs) var(--space-sm);
  }
  
  .language-options {
    left: -50%;
    right: -50%;
    min-width: 200px;
  }
  
  .language-buttons {
    justify-content: center;
  }
}

/* =================================
   アクセシビリティ対応
   ================================= */

@media (prefers-reduced-motion: reduce) {
  .dropdown-icon,
  .language-button,
  .language-flag,
  .dropdown-enter-active,
  .dropdown-leave-active {
    transition: none;
  }
  
  .language-flag:hover {
    transform: none;
  }
}

/* 高コントラストモード */
@media (prefers-contrast: high) {
  .language-trigger,
  .language-button,
  .language-options {
    border-width: 2px;
    border-color: white;
  }
  
  .language-button--active,
  .language-flag--active {
    border-color: yellow;
    background: rgba(255, 255, 0, 0.2);
  }
}

/* RTL対応 */
[dir="rtl"] .current-label {
  text-align: right;
}

[dir="rtl"] .language-options {
  left: auto;
  right: 0;
}

/* スクリーンリーダー専用 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>