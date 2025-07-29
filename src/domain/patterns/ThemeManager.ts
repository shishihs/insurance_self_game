import type { 
  Observable, 
  Observer, 
  ConfigurationSystem,
  EventHandler 
} from '../types/enhanced-types'

/**
 * テーマの定義
 */
export interface Theme {
  readonly name: string
  readonly displayName: string
  readonly version: string
  readonly description: string
  readonly colors: ThemeColors
  readonly typography: ThemeTypography
  readonly spacing: ThemeSpacing
  readonly shadows: ThemeShadows
  readonly animations: ThemeAnimations
  readonly custom?: Record<string, any>
}

/**
 * テーマの色設定
 */
export interface ThemeColors {
  // 背景色
  readonly background: {
    primary: string
    secondary: string
    tertiary: string
    surface: string
    overlay: string
  }
  
  // テキスト色
  readonly text: {
    primary: string
    secondary: string
    disabled: string
    inverse: string
  }
  
  // ブランド色
  readonly brand: {
    primary: string
    secondary: string
    accent: string
  }
  
  // セマンティック色
  readonly semantic: {
    success: string
    warning: string
    error: string
    info: string
  }
  
  // インタラクション色
  readonly interactive: {
    hover: string
    active: string
    focus: string
    disabled: string
  }
  
  // ボーダー色
  readonly border: {
    primary: string
    secondary: string
    focus: string
  }
}

/**
 * タイポグラフィ設定
 */
export interface ThemeTypography {
  readonly fontFamily: {
    primary: string
    secondary: string
    monospace: string
  }
  
  readonly fontSize: {
    xs: string
    sm: string
    base: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
    '4xl': string
  }
  
  readonly fontWeight: {
    light: string
    normal: string
    medium: string
    semibold: string
    bold: string
  }
  
  readonly lineHeight: {
    tight: string
    normal: string
    relaxed: string
  }
}

/**
 * スペーシング設定
 */
export interface ThemeSpacing {
  readonly xs: string
  readonly sm: string
  readonly md: string
  readonly lg: string
  readonly xl: string
  readonly '2xl': string
  readonly '3xl': string
  readonly '4xl': string
}

/**
 * シャドウ設定
 */
export interface ThemeShadows {
  readonly sm: string
  readonly md: string
  readonly lg: string
  readonly xl: string
  readonly card: string
  readonly glow: string
}

/**
 * アニメーション設定
 */
export interface ThemeAnimations {
  readonly duration: {
    fast: string
    normal: string
    slow: string
  }
  
  readonly easing: {
    linear: string
    easeIn: string
    easeOut: string
    easeInOut: string
  }
}

/**
 * テーマ変更イベント
 */
export interface ThemeChangeEvent {
  previousTheme: string | null
  currentTheme: string
  theme: Theme
  timestamp: number
}

/**
 * デフォルトテーマ定義
 */
const DEFAULT_THEME: Theme = {
  name: 'default',
  displayName: 'デフォルト',
  version: '1.0.0',
  description: 'アプリケーションのデフォルトテーマ',
  
  colors: {
    background: {
      primary: '#0a0a0a',
      secondary: '#1a1a1a',
      tertiary: '#2a2a2a',
      surface: 'rgba(255, 255, 255, 0.05)',
      overlay: 'rgba(0, 0, 0, 0.8)'
    },
    
    text: {
      primary: 'rgba(255, 255, 255, 0.87)',
      secondary: 'rgba(255, 255, 255, 0.60)',
      disabled: 'rgba(255, 255, 255, 0.38)',
      inverse: 'rgba(0, 0, 0, 0.87)'
    },
    
    brand: {
      primary: '#667eea',
      secondary: '#764ba2',
      accent: '#f093fb'
    },
    
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6'
    },
    
    interactive: {
      hover: 'rgba(255, 255, 255, 0.1)',
      active: 'rgba(255, 255, 255, 0.2)',
      focus: 'rgba(102, 126, 234, 0.5)',
      disabled: 'rgba(255, 255, 255, 0.12)'
    },
    
    border: {
      primary: 'rgba(255, 255, 255, 0.12)',
      secondary: 'rgba(255, 255, 255, 0.06)',
      focus: 'rgba(102, 126, 234, 0.8)'
    }
  },
  
  typography: {
    fontFamily: {
      primary: 'Inter, system-ui, sans-serif',
      secondary: 'ui-serif, serif',
      monospace: 'ui-monospace, monospace'
    },
    
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700'
    },
    
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75'
    }
  },
  
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem'
  },
  
  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
    card: '0 4px 20px rgba(0, 0, 0, 0.15)',
    glow: '0 0 20px rgba(102, 126, 234, 0.5)'
  },
  
  animations: {
    duration: {
      fast: '0.15s',
      normal: '0.3s',
      slow: '0.5s'
    },
    
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }
}

/**
 * ダークテーマ定義
 */
const DARK_THEME: Theme = {
  ...DEFAULT_THEME,
  name: 'dark',
  displayName: 'ダーク',
  description: 'ダークテーマ（目に優しい暗色調）'
}

/**
 * ライトテーマ定義
 */
const LIGHT_THEME: Theme = {
  ...DEFAULT_THEME,
  name: 'light',
  displayName: 'ライト',
  description: 'ライトテーマ（明るい色調）',
  
  colors: {
    ...DEFAULT_THEME.colors,
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      surface: 'rgba(0, 0, 0, 0.05)',
      overlay: 'rgba(0, 0, 0, 0.5)'
    },
    
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.60)',
      disabled: 'rgba(0, 0, 0, 0.38)',
      inverse: 'rgba(255, 255, 255, 0.87)'
    },
    
    interactive: {
      hover: 'rgba(0, 0, 0, 0.04)',
      active: 'rgba(0, 0, 0, 0.08)',
      focus: 'rgba(102, 126, 234, 0.2)',
      disabled: 'rgba(0, 0, 0, 0.12)'
    },
    
    border: {
      primary: 'rgba(0, 0, 0, 0.12)',
      secondary: 'rgba(0, 0, 0, 0.06)',
      focus: 'rgba(102, 126, 234, 0.8)'
    }
  }
}

/**
 * ハイコントラストテーマ定義
 */
const HIGH_CONTRAST_THEME: Theme = {
  ...DEFAULT_THEME,
  name: 'high-contrast',
  displayName: 'ハイコントラスト',
  description: 'アクセシビリティ対応高コントラストテーマ',
  
  colors: {
    ...DEFAULT_THEME.colors,
    background: {
      primary: '#000000',
      secondary: '#000000',
      tertiary: '#1a1a1a',
      surface: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.9)'
    },
    
    text: {
      primary: '#ffffff',
      secondary: '#ffffff',
      disabled: '#808080',
      inverse: '#000000'
    },
    
    brand: {
      primary: '#ffff00',
      secondary: '#00ffff',
      accent: '#ff00ff'
    },
    
    border: {
      primary: '#ffffff',
      secondary: '#ffffff',
      focus: '#ffff00'
    }
  }
}

/**
 * テーママネージャー
 * 
 * Strategy Pattern: 異なるテーマの切り替え
 * Observer Pattern: テーマ変更の通知
 */
export class ThemeManager implements Observable<ThemeChangeEvent> {
  private themes: Map<string, Theme> = new Map()
  private currentThemeName: string
  private observers: Set<Observer<ThemeChangeEvent>> = new Set()
  private cssVariables: Map<string, string> = new Map()

  constructor(defaultThemeName: string = 'default') {
    // デフォルトテーマを登録
    this.registerTheme(DEFAULT_THEME)
    this.registerTheme(DARK_THEME)
    this.registerTheme(LIGHT_THEME)
    this.registerTheme(HIGH_CONTRAST_THEME)
    
    this.currentThemeName = defaultThemeName
    this.applyTheme(defaultThemeName)
  }

  /**
   * テーマを登録
   */
  registerTheme(theme: Theme): void {
    this.themes.set(theme.name, theme)
    console.log(`テーマ "${theme.displayName}" (${theme.name}) を登録しました`)
  }

  /**
   * テーマを削除
   */
  unregisterTheme(themeName: string): boolean {
    if (themeName === 'default') {
      console.warn('デフォルトテーマは削除できません')
      return false
    }
    
    if (this.currentThemeName === themeName) {
      this.applyTheme('default')
    }
    
    return this.themes.delete(themeName)
  }

  /**
   * テーマを適用
   */
  applyTheme(themeName: string): void {
    const theme = this.themes.get(themeName)
    if (!theme) {
      console.error(`テーマ "${themeName}" が見つかりません`)
      return
    }

    const previousTheme = this.currentThemeName
    this.currentThemeName = themeName

    // CSS変数を適用
    this.applyCSSVariables(theme)

    // data属性を設定
    document.documentElement.setAttribute('data-theme', themeName)

    // 観察者に通知
    const event: ThemeChangeEvent = {
      previousTheme,
      currentTheme: themeName,
      theme,
      timestamp: Date.now()
    }

    this.notify(event)
  }

  /**
   * 現在のテーマ名を取得
   */
  getCurrentThemeName(): string {
    return this.currentThemeName
  }

  /**
   * 現在のテーマを取得
   */
  getCurrentTheme(): Theme | undefined {
    return this.themes.get(this.currentThemeName)
  }

  /**
   * 利用可能なテーマ一覧を取得
   */
  getAvailableThemes(): Array<{ name: string; displayName: string; description: string }> {
    return Array.from(this.themes.values()).map(theme => ({
      name: theme.name,
      displayName: theme.displayName,
      description: theme.description
    }))
  }

  /**
   * テーマが存在するかチェック
   */
  hasTheme(themeName: string): boolean {
    return this.themes.has(themeName)
  }

  /**
   * テーマ変更観察者を登録
   */
  subscribe(observer: Observer<ThemeChangeEvent>): () => void {
    this.observers.add(observer)
    
    // 登録解除関数を返す
    return () => {
      this.observers.delete(observer)
    }
  }

  /**
   * テーマ変更観察者を削除
   */
  unsubscribe(observer: Observer<ThemeChangeEvent>): void {
    this.observers.delete(observer)
  }

  /**
   * 観察者に通知
   */
  notify(event: ThemeChangeEvent): void {
    this.observers.forEach(observer => {
      try {
        observer.update(event)
      } catch (error) {
        console.error('テーマ変更の通知中にエラーが発生しました:', error)
      }
    })
  }

  /**
   * システムのダークモード設定を検出
   */
  detectSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'light'
  }

  /**
   * システムテーマの変更を監視
   */
  watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return () => {} // 何もしない関数を返す
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const handleChange = (e: MediaQueryListEvent) => {
      callback(e.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)

    // 監視解除関数を返す
    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }

  /**
   * CSS変数を適用（内部使用）
   */
  private applyCSSVariables(theme: Theme): void {
    const root = document.documentElement
    const variables: Record<string, string> = {}

    // 色設定を変数に変換
    this.flattenObject(theme.colors, 'color', variables)
    this.flattenObject(theme.typography, 'typography', variables)
    this.flattenObject(theme.spacing, 'spacing', variables)
    this.flattenObject(theme.shadows, 'shadow', variables)
    this.flattenObject(theme.animations, 'animation', variables)

    // カスタム設定があれば追加
    if (theme.custom) {
      this.flattenObject(theme.custom, 'custom', variables)
    }

    // CSS変数を適用
    Object.entries(variables).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
      this.cssVariables.set(key, value)
    })
  }

  /**
   * オブジェクトを平坦化してCSS変数に変換（内部使用）
   */
  private flattenObject(
    obj: any,
    prefix: string,
    result: Record<string, string>,
    separator: string = '-'
  ): void {
    Object.entries(obj).forEach(([key, value]) => {
      const newKey = `${prefix}${separator}${key}`
      
      if (typeof value === 'object' && value !== null) {
        this.flattenObject(value, newKey, result, separator)
      } else {
        result[newKey] = String(value)
      }
    })
  }

  /**
   * CSS変数の値を取得
   */
  getCSSVariable(name: string): string | undefined {
    return this.cssVariables.get(name)
  }

  /**
   * テーマをJSONから読み込み
   */
  loadThemeFromJSON(json: string): void {
    try {
      const theme: Theme = JSON.parse(json)
      this.registerTheme(theme)
    } catch (error) {
      console.error('テーマの読み込みに失敗しました:', error)
      throw new Error('Invalid theme JSON')
    }
  }

  /**
   * テーマをJSONとして出力
   */
  exportThemeToJSON(themeName: string): string | null {
    const theme = this.themes.get(themeName)
    if (!theme) {
      return null
    }
    
    return JSON.stringify(theme, null, 2)
  }
}

/**
 * グローバルテーママネージャーインスタンス
 */
export const globalThemeManager = new ThemeManager()

/**
 * Vue Composition API用のテーマフック
 */
export function useTheme() {
  const themeManager = globalThemeManager

  return {
    currentTheme: themeManager.getCurrentThemeName(),
    availableThemes: themeManager.getAvailableThemes(),
    applyTheme: (name: string) => themeManager.applyTheme(name),
    getCurrentTheme: () => themeManager.getCurrentTheme(),
    detectSystemTheme: () => themeManager.detectSystemTheme(),
    watchSystemTheme: (callback: (theme: 'light' | 'dark') => void) => 
      themeManager.watchSystemTheme(callback),
    subscribe: (observer: Observer<ThemeChangeEvent>) => 
      themeManager.subscribe(observer)
  }
}