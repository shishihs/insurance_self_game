/**
 * Vue I18n 国際化システム
 * 多言語サポートとローカライゼーション機能を提供
 */

import { createI18n } from 'vue-i18n'
import type { I18nOptions } from 'vue-i18n'

// 言語ファイルのインポート
import ja from './locales/ja'
import en from './locales/en'
import zh from './locales/zh'
import ko from './locales/ko'

// サポートされる言語
export const SUPPORTED_LOCALES = ['ja', 'en', 'zh', 'ko'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

// 言語表示名
export const LOCALE_NAMES: Record<SupportedLocale, string> = {
  ja: '日本語',
  en: 'English',
  zh: '中文（简体）',
  ko: '한국어'
}

// RTL言語（将来的な拡張に備えて）
export const RTL_LOCALES: SupportedLocale[] = []

// ブラウザの言語設定から適切な言語を検出
export function detectBrowserLocale(): SupportedLocale {
  const browserLang = navigator.language.split('-')[0] as SupportedLocale
  return SUPPORTED_LOCALES.includes(browserLang) ? browserLang : 'ja'
}

// ローカルストレージから保存された言語設定を取得
export function getSavedLocale(): SupportedLocale | null {
  try {
    const saved = localStorage.getItem('insurance-game-locale') as SupportedLocale
    return SUPPORTED_LOCALES.includes(saved) ? saved : null
  } catch {
    return null
  }
}

// 言語設定をローカルストレージに保存
export function saveLocale(locale: SupportedLocale): void {
  try {
    localStorage.setItem('insurance-game-locale', locale)
  } catch (error) {
    console.warn('Failed to save locale to localStorage:', error)
  }
}

// 初期言語の決定
export function getInitialLocale(): SupportedLocale {
  return getSavedLocale() || detectBrowserLocale()
}

// i18nインスタンスの設定
const i18nOptions: I18nOptions = {
  legacy: false, // Composition API mode
  locale: getInitialLocale(),
  fallbackLocale: 'ja',
  messages: {
    ja,
    en,
    zh,
    ko
  },
  // 数値フォーマット
  numberFormats: {
    ja: {
      currency: {
        style: 'currency',
        currency: 'JPY',
        currencyDisplay: 'symbol'
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    },
    en: {
      currency: {
        style: 'currency',
        currency: 'USD',
        currencyDisplay: 'symbol'
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    },
    zh: {
      currency: {
        style: 'currency',
        currency: 'CNY',
        currencyDisplay: 'symbol'
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    },
    ko: {
      currency: {
        style: 'currency',
        currency: 'KRW',
        currencyDisplay: 'symbol'
      },
      decimal: {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }
    }
  },
  // 日時フォーマット
  datetimeFormats: {
    ja: {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }
    },
    en: {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }
    },
    zh: {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }
    },
    ko: {
      short: {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      },
      long: {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      }
    }
  }
}

// i18nインスタンスを作成
export const i18n = createI18n(i18nOptions)

// 言語切り替え関数
export function setLocale(locale: SupportedLocale): void {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    console.warn(`Unsupported locale: ${locale}`)
    return
  }
  
  i18n.global.locale.value = locale
  saveLocale(locale)
  
  // HTML lang属性を更新
  document.documentElement.lang = locale
  
  // RTL方向の設定（将来的な拡張用）
  document.documentElement.dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

// 現在の言語を取得
export function getCurrentLocale(): SupportedLocale {
  return i18n.global.locale.value as SupportedLocale
}

// 翻訳済みメッセージのタイプセーフなアクセス用
export type MessageSchema = typeof ja

export default i18n