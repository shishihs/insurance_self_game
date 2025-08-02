/**
 * 高度なテーマ管理システム
 * ダーク、ライト、カスタムテーマの管理と動的切り替え
 */

export interface ColorPalette {
  primary: string
  primaryLight: string
  primaryDark: string
  secondary: string
  secondaryLight: string
  secondaryDark: string
  accent: string
  accentLight: string
  accentDark: string
  background: string
  backgroundSecondary: string
  backgroundTertiary: string
  surface: string
  surfaceLight: string
  surfaceDark: string
  text: string
  textSecondary: string
  textMuted: string
  border: string
  borderLight: string
  success: string
  warning: string
  error: string
  info: string
}

export interface ThemeConfig {
  id: string
  name: string
  description: string
  colors: ColorPalette
  gradients: {
    primary: string
    secondary: string
    accent: string
    background: string
  }
  shadows: {
    small: string
    medium: string
    large: string
    colored: string
  }
  animations: {
    fast: string
    normal: string
    slow: string
    elastic: string
  }
  borderRadius: {
    small: string
    medium: string
    large: string
    pill: string
  }
  spacing: {
    xs: string
    sm: string
    md: string
    lg: string
    xl: string
    '2xl': string
    '3xl': string
  }
  typography: {
    fontFamily: string
    fontFamilyHeading: string
    fontSize: {
      xs: string
      sm: string
      base: string
      lg: string
      xl: string
      '2xl': string
      '3xl': string
      '4xl': string
    }
    fontWeight: {
      light: string
      normal: string
      medium: string
      semibold: string
      bold: string
    }
    lineHeight: {
      tight: string
      normal: string
      relaxed: string
    }
  }
}

export interface UserPreferences {
  theme: string
  customColors?: Partial<ColorPalette>
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  animationSpeed: 'slow' | 'normal' | 'fast'
}

export class ThemeManager {
  private currentTheme: ThemeConfig
  private readonly themes: Map<string, ThemeConfig> = new Map()
  private userPreferences: UserPreferences
  private readonly observers: Set<(theme: ThemeConfig, preferences: UserPreferences) => void> = new Set()
  private readonly cssVariablesRoot: HTMLElement

  constructor() {
    this.cssVariablesRoot = document.documentElement
    this.userPreferences = this.loadUserPreferences()
    this.initializeBuiltInThemes()
    this.currentTheme = this.themes.get(this.userPreferences.theme) || this.themes.get('light')!
    this.applyTheme()
    this.setupSystemThemeDetection()
  }

  /**
   * 組み込みテーマの初期化
   */
  private initializeBuiltInThemes(): void {
    // ライトテーマ
    this.themes.set('light', {
      id: 'light',
      name: 'Light',
      description: 'Clean and bright interface',
      colors: {
        primary: '#6366f1',
        primaryLight: '#818cf8',
        primaryDark: '#4338ca',
        secondary: '#6b7280',
        secondaryLight: '#9ca3af',
        secondaryDark: '#374151',
        accent: '#ec4899',
        accentLight: '#f472b6',
        accentDark: '#be185d',
        background: '#ffffff',
        backgroundSecondary: '#f8fafc',
        backgroundTertiary: '#f1f5f9',
        surface: '#ffffff',
        surfaceLight: '#fafbff',
        surfaceDark: '#f8fafc',
        text: '#0f172a',
        textSecondary: '#475569',
        textMuted: '#64748b',
        border: '#e2e8f0',
        borderLight: '#f1f5f9',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6'
      },
      gradients: {
        primary: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        secondary: 'linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)',
        accent: 'linear-gradient(135deg, #ec4899 0%, #f97316 100%)',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'
      },
      shadows: {
        small: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
        large: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        colored: '0 10px 25px rgba(99, 102, 241, 0.2)'
      },
      animations: {
        fast: '0.15s',
        normal: '0.3s',
        slow: '0.6s',
        elastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      borderRadius: {
        small: '4px',
        medium: '8px',
        large: '16px',
        pill: '9999px'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontFamilyHeading: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '12px',
          sm: '14px',
          base: '16px',
          lg: '18px',
          xl: '20px',
          '2xl': '24px',
          '3xl': '30px',
          '4xl': '36px'
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
      }
    })

    // ダークテーマ
    this.themes.set('dark', {
      id: 'dark',
      name: 'Dark',
      description: 'Easy on the eyes for extended use',
      colors: {
        primary: '#818cf8',
        primaryLight: '#a5b4fc',
        primaryDark: '#6366f1',
        secondary: '#9ca3af',
        secondaryLight: '#d1d5db',
        secondaryDark: '#6b7280',
        accent: '#f472b6',
        accentLight: '#f9a8d4',
        accentDark: '#ec4899',
        background: '#0f172a',
        backgroundSecondary: '#1e293b',
        backgroundTertiary: '#334155',
        surface: '#1e293b',
        surfaceLight: '#334155',
        surfaceDark: '#0f172a',
        text: '#f8fafc',
        textSecondary: '#cbd5e1',
        textMuted: '#94a3b8',
        border: '#334155',
        borderLight: '#475569',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        info: '#60a5fa'
      },
      gradients: {
        primary: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
        secondary: 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)',
        accent: 'linear-gradient(135deg, #f472b6 0%, #fb7185 100%)',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
      },
      shadows: {
        small: '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        medium: '0 4px 6px rgba(0, 0, 0, 0.3), 0 2px 4px rgba(0, 0, 0, 0.2)',
        large: '0 10px 15px rgba(0, 0, 0, 0.3), 0 4px 6px rgba(0, 0, 0, 0.2)',
        colored: '0 10px 25px rgba(129, 140, 248, 0.3)'
      },
      animations: {
        fast: '0.15s',
        normal: '0.3s',
        slow: '0.6s',
        elastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      borderRadius: {
        small: '4px',
        medium: '8px',
        large: '16px',
        pill: '9999px'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontFamilyHeading: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '12px',
          sm: '14px',
          base: '16px',
          lg: '18px',
          xl: '20px',
          '2xl': '24px',
          '3xl': '30px',
          '4xl': '36px'
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
      }
    })

    // コズミックテーマ
    this.themes.set('cosmic', {
      id: 'cosmic',
      name: 'Cosmic',
      description: 'Mystical and ethereal experience',
      colors: {
        primary: '#8b5fbf',
        primaryLight: '#a78bfa',
        primaryDark: '#7c3aed',
        secondary: '#64748b',
        secondaryLight: '#94a3b8',
        secondaryDark: '#475569',
        accent: '#e879f9',
        accentLight: '#f0abfc',
        accentDark: '#d946ef',
        background: '#0c0a1a',
        backgroundSecondary: '#1a1625',
        backgroundTertiary: '#2d2438',
        surface: '#1a1625',
        surfaceLight: '#2d2438',
        surfaceDark: '#0c0a1a',
        text: '#f3e8ff',
        textSecondary: '#c4b5fd',
        textMuted: '#a78bfa',
        border: '#4c1d95',
        borderLight: '#6d28d9',
        success: '#a7f3d0',
        warning: '#fde68a',
        error: '#fca5a5',
        info: '#93c5fd'
      },
      gradients: {
        primary: 'linear-gradient(135deg, #8b5fbf 0%, #ec4899 50%, #f59e0b 100%)',
        secondary: 'linear-gradient(135deg, #64748b 0%, #8b5fbf 100%)',
        accent: 'linear-gradient(135deg, #e879f9 0%, #8b5fbf 100%)',
        background: 'linear-gradient(135deg, #0c0a1a 0%, #1a1625 50%, #2d2438 100%)'
      },
      shadows: {
        small: '0 1px 3px rgba(139, 95, 191, 0.3), 0 1px 2px rgba(236, 72, 153, 0.2)',
        medium: '0 4px 6px rgba(139, 95, 191, 0.3), 0 2px 4px rgba(236, 72, 153, 0.2)',
        large: '0 10px 15px rgba(139, 95, 191, 0.4), 0 4px 6px rgba(236, 72, 153, 0.3)',
        colored: '0 10px 25px rgba(139, 95, 191, 0.4)'
      },
      animations: {
        fast: '0.15s',
        normal: '0.3s',
        slow: '0.6s',
        elastic: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
      },
      borderRadius: {
        small: '6px',
        medium: '12px',
        large: '20px',
        pill: '9999px'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
        '3xl': '64px'
      },
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontFamilyHeading: 'Inter, system-ui, sans-serif',
        fontSize: {
          xs: '12px',
          sm: '14px',
          base: '16px',
          lg: '18px',
          xl: '20px',
          '2xl': '24px',
          '3xl': '30px',
          '4xl': '36px'
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
      }
    })
  }

  /**
   * テーマを適用
   */
  private applyTheme(): void {
    const theme = this.currentTheme
    const preferences = this.userPreferences

    // カラーCSS変数の設定
    Object.entries(theme.colors).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--color-${this.kebabCase(key)}`, value)
    })

    // グラデーションCSS変数の設定
    Object.entries(theme.gradients).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--gradient-${key}`, value)
    })

    // シャドウCSS変数の設定
    Object.entries(theme.shadows).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--shadow-${key}`, value)
    })

    // アニメーションCSS変数の設定
    Object.entries(theme.animations).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--animation-${key}`, value)
    })

    // ボーダーラディウスCSS変数の設定
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--radius-${key}`, value)
    })

    // スペーシングCSS変数の設定
    Object.entries(theme.spacing).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--spacing-${key}`, value)
    })

    // タイポグラフィCSS変数の設定
    this.cssVariablesRoot.style.setProperty('--font-family', theme.typography.fontFamily)
    this.cssVariablesRoot.style.setProperty('--font-family-heading', theme.typography.fontFamilyHeading)

    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--text-${key}`, value)
    })

    Object.entries(theme.typography.fontWeight).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--font-${key}`, value)
    })

    Object.entries(theme.typography.lineHeight).forEach(([key, value]) => {
      this.cssVariablesRoot.style.setProperty(`--leading-${key}`, value)
    })

    // ユーザー設定の適用
    this.applyUserPreferences(preferences)

    // body要素にテーマクラスを追加
    document.body.className = document.body.className.replace(/theme-\w+/g, '')
    document.body.classList.add(`theme-${theme.id}`)

    // カスタムカラーの適用
    if (preferences.customColors) {
      Object.entries(preferences.customColors).forEach(([key, value]) => {
        if (value) {
          this.cssVariablesRoot.style.setProperty(`--color-${this.kebabCase(key)}`, value)
        }
      })
    }

    // オブザーバーに通知
    this.observers.forEach(callback => { callback(theme, preferences); })
  }

  /**
   * ユーザー設定の適用
   */
  private applyUserPreferences(preferences: UserPreferences): void {
    // フォントサイズ調整
    const fontSizeMultipliers = {
      small: 0.875,
      medium: 1,
      large: 1.125
    }
    this.cssVariablesRoot.style.setProperty('--font-size-multiplier', fontSizeMultipliers[preferences.fontSize].toString())

    // アニメーション速度調整
    const animationSpeeds = {
      slow: 1.5,
      normal: 1,
      fast: 0.75
    }
    this.cssVariablesRoot.style.setProperty('--animation-speed-multiplier', animationSpeeds[preferences.animationSpeed].toString())

    // アクセシビリティクラスの設定
    document.body.classList.toggle('reduce-motion', preferences.reducedMotion)
    document.body.classList.toggle('high-contrast', preferences.highContrast)

    // ハイコントラスト用の追加変数
    if (preferences.highContrast) {
      this.cssVariablesRoot.style.setProperty('--color-text', '#000000')
      this.cssVariablesRoot.style.setProperty('--color-background', '#ffffff')
      this.cssVariablesRoot.style.setProperty('--color-border', '#000000')
    }
  }

  /**
   * システムテーマ検出の設定
   */
  private setupSystemThemeDetection(): void {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (this.userPreferences.theme === 'system') {
          const systemTheme = e.matches ? 'dark' : 'light'
          this.setTheme(systemTheme, false) // システム変更なので保存しない
        }
      }

      darkModeQuery.addEventListener('change', handleSystemThemeChange)
    }
  }

  /**
   * ユーザー設定の読み込み
   */
  private loadUserPreferences(): UserPreferences {
    const saved = localStorage.getItem('theme-preferences')
    const defaults: UserPreferences = {
      theme: 'light',
      reducedMotion: false,
      highContrast: false,
      fontSize: 'medium',
      animationSpeed: 'normal'
    }

    if (saved) {
      try {
        return { ...defaults, ...JSON.parse(saved) }
      } catch {
        return defaults
      }
    }

    // システム設定の検出
    if (window.matchMedia) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        defaults.theme = 'dark'
      }
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        defaults.reducedMotion = true
      }
      if (window.matchMedia('(prefers-contrast: high)').matches) {
        defaults.highContrast = true
      }
    }

    return defaults
  }

  /**
   * ユーザー設定の保存
   */
  private saveUserPreferences(): void {
    localStorage.setItem('theme-preferences', JSON.stringify(this.userPreferences))
  }

  /**
   * ケバブケースに変換
   */
  private kebabCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
  }

  // パブリックメソッド

  /**
   * 利用可能なテーマ一覧を取得
   */
  getAvailableThemes(): ThemeConfig[] {
    return Array.from(this.themes.values())
  }

  /**
   * 現在のテーマを取得
   */
  getCurrentTheme(): ThemeConfig {
    return this.currentTheme
  }

  /**
   * ユーザー設定を取得
   */
  getUserPreferences(): UserPreferences {
    return { ...this.userPreferences }
  }

  /**
   * テーマを設定
   */
  setTheme(themeId: string, save: boolean = true): boolean {
    const theme = this.themes.get(themeId)
    if (!theme) return false

    this.currentTheme = theme
    if (save) {
      this.userPreferences.theme = themeId
      this.saveUserPreferences()
    }
    this.applyTheme()
    return true
  }

  /**
   * ユーザー設定を更新
   */
  updateUserPreferences(preferences: Partial<UserPreferences>): void {
    this.userPreferences = { ...this.userPreferences, ...preferences }
    this.saveUserPreferences()
    this.applyTheme()
  }

  /**
   * カスタムテーマを登録
   */
  registerTheme(theme: ThemeConfig): void {
    this.themes.set(theme.id, theme)
  }

  /**
   * テーマ変更の監視
   */
  subscribe(callback: (theme: ThemeConfig, preferences: UserPreferences) => void): () => void {
    this.observers.add(callback)
    return () => this.observers.delete(callback)
  }

  /**
   * CSS変数の値を取得
   */
  getCSSVariable(name: string): string {
    return getComputedStyle(this.cssVariablesRoot).getPropertyValue(name).trim()
  }

  /**
   * CSS変数を設定
   */
  setCSSVariable(name: string, value: string): void {
    this.cssVariablesRoot.style.setProperty(name, value)
  }

  /**
   * テーマの動的切り替えアニメーション
   */
  async animateThemeTransition(duration: number = 300): Promise<void> {
    document.body.style.transition = `background-color ${duration}ms ease, color ${duration}ms ease`
    
    return new Promise(resolve => {
      setTimeout(() => {
        document.body.style.transition = ''
        resolve()
      }, duration)
    })
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.observers.clear()
  }
}