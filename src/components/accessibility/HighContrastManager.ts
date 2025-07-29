/**
 * 高コントラストモード管理システム
 * WCAG 2.1 AA準拠のコントラスト要件と視覚障害者支援機能
 */

export interface ContrastTheme {
  id: string
  name: string
  description: string
  colors: {
    background: string
    surface: string
    primary: string
    secondary: string
    accent: string
    text: string
    textSecondary: string
    border: string
    focus: string
    success: string
    warning: string
    error: string
    info: string
  }
  contrastRatios: {
    textBackground: number
    primaryBackground: number
    focusBackground: number
  }
}

export interface ContrastSettings {
  enabled: boolean
  themeId: string
  customColors?: Partial<ContrastTheme['colors']>
  enhancedFocus: boolean
  boldText: boolean
  largeFocus: boolean
  eliminateAnimations: boolean
  simplifyUI: boolean
}

export class HighContrastManager {
  private static instance: HighContrastManager
  private currentSettings: ContrastSettings = {
    enabled: false,
    themeId: 'high-contrast-dark',
    enhancedFocus: true,
    boldText: false,
    largeFocus: false,
    eliminateAnimations: true,
    simplifyUI: false
  }

  private themes: Map<string, ContrastTheme> = new Map()
  private observers: MutationObserver[] = []
  private contrastAnalyzer: ContrastAnalyzer

  private constructor() {
    this.contrastAnalyzer = new ContrastAnalyzer()
    this.initializeThemes()
    this.detectSystemPreferences()
    this.setupDynamicContrast()
  }

  public static getInstance(): HighContrastManager {
    if (!HighContrastManager.instance) {
      HighContrastManager.instance = new HighContrastManager()
    }
    return HighContrastManager.instance
  }

  /**
   * デフォルトテーマの初期化
   */
  private initializeThemes(): void {
    // 高コントラストダークテーマ
    this.themes.set('high-contrast-dark', {
      id: 'high-contrast-dark',
      name: '高コントラスト（ダーク）',
      description: '黒背景に白テキストの高コントラストテーマ',
      colors: {
        background: '#000000',
        surface: '#1a1a1a',
        primary: '#00ff00',
        secondary: '#ffff00',
        accent: '#00ffff',
        text: '#ffffff',
        textSecondary: '#cccccc',
        border: '#ffffff',
        focus: '#ffff00',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000',
        info: '#00ffff'
      },
      contrastRatios: {
        textBackground: 21,
        primaryBackground: 15,
        focusBackground: 12
      }
    })

    // 高コントラストライトテーマ
    this.themes.set('high-contrast-light', {
      id: 'high-contrast-light',
      name: '高コントラスト（ライト）',
      description: '白背景に黒テキストの高コントラストテーマ',
      colors: {
        background: '#ffffff',
        surface: '#f5f5f5',
        primary: '#000080',
        secondary: '#800080',
        accent: '#008000',
        text: '#000000',
        textSecondary: '#333333',
        border: '#000000',
        focus: '#ff0000',
        success: '#008000',
        warning: '#ff8000',
        error: '#ff0000',
        info: '#000080'
      },
      contrastRatios: {
        textBackground: 21,
        primaryBackground: 15,
        focusBackground: 12
      }
    })

    // 青黄高コントラストテーマ（色覚異常対応）
    this.themes.set('high-contrast-blue-yellow', {
      id: 'high-contrast-blue-yellow',
      name: '青黄高コントラスト',
      description: '色覚異常の方にも区別しやすい青と黄色のテーマ',
      colors: {
        background: '#000033',
        surface: '#001144',
        primary: '#ffff00',
        secondary: '#0088ff',
        accent: '#ffffff',
        text: '#ffffff',
        textSecondary: '#cccccc',
        border: '#ffff00',
        focus: '#ffffff',
        success: '#ffff00',
        warning: '#ff8800',
        error: '#ff4444',
        info: '#0088ff'
      },
      contrastRatios: {
        textBackground: 18,
        primaryBackground: 12,
        focusBackground: 15
      }
    })

    // カスタマイズ可能テーマ
    this.themes.set('custom', {
      id: 'custom',
      name: 'カスタム',
      description: 'ユーザーがカスタマイズしたテーマ',
      colors: {
        background: '#000000',
        surface: '#1a1a1a',
        primary: '#00ff00',
        secondary: '#ffff00',
        accent: '#00ffff',
        text: '#ffffff',
        textSecondary: '#cccccc',
        border: '#ffffff',
        focus: '#ffff00',
        success: '#00ff00',
        warning: '#ffff00',
        error: '#ff0000',
        info: '#00ffff'
      },
      contrastRatios: {
        textBackground: 21,
        primaryBackground: 15,
        focusBackground: 12
      }
    })
  }

  /**
   * 高コントラストモードの有効化
   */
  public enable(themeId: string = 'high-contrast-dark'): void {
    const theme = this.themes.get(themeId)
    if (!theme) {
      console.warn(`Theme ${themeId} not found`)
      return
    }

    this.currentSettings.enabled = true
    this.currentSettings.themeId = themeId
    
    this.applyTheme(theme)
    this.announceThemeChange(theme)
    this.saveSettings()
  }

  /**
   * 高コントラストモードの無効化
   */
  public disable(): void {
    this.currentSettings.enabled = false
    this.removeTheme()
    this.announceThemeChange(null)
    this.saveSettings()
  }

  /**
   * 設定の更新
   */
  public updateSettings(settings: Partial<ContrastSettings>): void {
    this.currentSettings = { ...this.currentSettings, ...settings }
    
    if (this.currentSettings.enabled) {
      const theme = this.themes.get(this.currentSettings.themeId)
      if (theme) {
        this.applyTheme(theme)
      }
    }
    
    this.saveSettings()
  }

  /**
   * カスタムカラーの設定
   */
  public setCustomColors(colors: Partial<ContrastTheme['colors']>): void {
    const customTheme = this.themes.get('custom')!
    customTheme.colors = { ...customTheme.colors, ...colors }
    
    // コントラスト比を再計算
    customTheme.contrastRatios = this.calculateContrastRatios(customTheme.colors)
    
    if (this.currentSettings.themeId === 'custom' && this.currentSettings.enabled) {
      this.applyTheme(customTheme)
    }
  }

  /**
   * テーマの適用
   */
  private applyTheme(theme: ContrastTheme): void {
    const root = document.documentElement
    
    // CSS カスタムプロパティを設定
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--hc-${key}`, value)
    })

    // 高コントラストクラスを追加
    root.classList.add('high-contrast')
    root.classList.add(`high-contrast-${theme.id}`)
    
    // 追加設定の適用
    this.applyAdditionalSettings()
    
    // ゲーム要素の特別な処理
    this.applyGameSpecificContrast()
    
    // フォーカス表示の強化
    if (this.currentSettings.enhancedFocus) {
      this.enhanceFocusVisibility()
    }
  }

  /**
   * テーマの削除
   */
  private removeTheme(): void {
    const root = document.documentElement
    
    // 高コントラストクラスを削除
    root.classList.remove('high-contrast')
    this.themes.forEach(theme => {
      root.classList.remove(`high-contrast-${theme.id}`)
    })
    
    // CSS カスタムプロパティを削除
    const theme = this.themes.values().next().value
    if (theme) {
      Object.keys(theme.colors).forEach(key => {
        root.style.removeProperty(`--hc-${key}`)
      })
    }
    
    // 追加設定をリセット
    root.classList.remove('hc-bold-text', 'hc-large-focus', 'hc-no-animations', 'hc-simple-ui')
  }

  /**
   * 追加設定の適用
   */
  private applyAdditionalSettings(): void {
    const root = document.documentElement
    
    root.classList.toggle('hc-bold-text', this.currentSettings.boldText)
    root.classList.toggle('hc-large-focus', this.currentSettings.largeFocus)
    root.classList.toggle('hc-no-animations', this.currentSettings.eliminateAnimations)
    root.classList.toggle('hc-simple-ui', this.currentSettings.simplifyUI)
  }

  /**
   * ゲーム特有の高コントラスト適用
   */
  private applyGameSpecificContrast(): void {
    // カード要素の強化
    const cards = document.querySelectorAll('.game-card')
    cards.forEach(card => {
      const element = card as HTMLElement
      this.enhanceElementContrast(element, 'card')
    })

    // ドロップゾーンの強化
    const dropZones = document.querySelectorAll('.drop-zone')
    dropZones.forEach(zone => {
      const element = zone as HTMLElement
      this.enhanceElementContrast(element, 'dropzone')
    })

    // ボタンの強化
    const buttons = document.querySelectorAll('button, .btn')
    buttons.forEach(button => {
      const element = button as HTMLElement
      this.enhanceElementContrast(element, 'button')
    })

    // ステータス表示の強化
    const statusElements = document.querySelectorAll('.status, .vitality, .turn-counter')
    statusElements.forEach(status => {
      const element = status as HTMLElement
      this.enhanceElementContrast(element, 'status')
    })
  }

  /**
   * 要素コントラストの強化
   */
  private enhanceElementContrast(element: HTMLElement, type: string): void {
    element.classList.add(`hc-enhanced-${type}`)
    
    // パターンやテクスチャによる区別を追加
    switch (type) {
      case 'card':
        this.addPatternDistinction(element, 'card')
        break
      case 'dropzone':
        this.addPatternDistinction(element, 'zone')
        break
      case 'button':
        this.addPatternDistinction(element, 'interactive')
        break
    }
  }

  /**
   * パターンによる区別の追加
   */
  private addPatternDistinction(element: HTMLElement, patternType: string): void {
    const patterns = {
      card: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
      zone: 'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(255,255,255,0.2) 5px, rgba(255,255,255,0.2) 10px)',
      interactive: 'repeating-linear-gradient(135deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)'
    }
    
    element.style.backgroundImage = patterns[patternType as keyof typeof patterns] || ''
  }

  /**
   * フォーカス表示の強化
   */
  private enhanceFocusVisibility(): void {
    const style = document.createElement('style')
    style.id = 'high-contrast-focus'
    style.textContent = `
      .high-contrast *:focus,
      .high-contrast *:focus-visible {
        outline: 4px solid var(--hc-focus) !important;
        outline-offset: 4px !important;
        box-shadow: 
          0 0 0 2px var(--hc-background),
          0 0 0 6px var(--hc-focus),
          0 0 20px var(--hc-focus) !important;
        border-radius: 4px;
      }
      
      .high-contrast.hc-large-focus *:focus,
      .high-contrast.hc-large-focus *:focus-visible {
        outline-width: 6px !important;
        outline-offset: 6px !important;
        box-shadow: 
          0 0 0 2px var(--hc-background),
          0 0 0 8px var(--hc-focus),
          0 0 30px var(--hc-focus) !important;
      }
      
      .high-contrast .game-card:focus {
        transform: scale(1.1) !important;
        z-index: 100 !important;
      }
      
      .high-contrast .drop-zone:focus {
        border: 6px dashed var(--hc-focus) !important;
        background: rgba(255, 255, 0, 0.1) !important;
      }
    `
    
    document.head.appendChild(style)
  }

  /**
   * システム設定の検出
   */
  private detectSystemPreferences(): void {
    // システムの高コントラスト設定を検出
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    highContrastQuery.addEventListener('change', (e) => {
      if (e.matches && !this.currentSettings.enabled) {
        // システムで高コントラストが有効になった場合
        const defaultTheme = colorSchemeQuery.matches ? 'high-contrast-dark' : 'high-contrast-light'
        this.enable(defaultTheme)
      }
    })
    
    // 初期状態でシステム設定を確認
    if (highContrastQuery.matches && !this.currentSettings.enabled) {
      const defaultTheme = colorSchemeQuery.matches ? 'high-contrast-dark' : 'high-contrast-light'
      this.enable(defaultTheme)
    }
  }

  /**
   * 動的コントラスト監視
   */
  private setupDynamicContrast(): void {
    const observer = new MutationObserver((mutations) => {
      if (!this.currentSettings.enabled) return
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement
              this.analyzeAndEnhanceElement(element)
            }
          })
        }
      })
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    this.observers.push(observer)
  }

  /**
   * 要素のコントラスト分析と強化
   */
  private analyzeAndEnhanceElement(element: HTMLElement): void {
    // ゲーム要素の判定
    if (element.classList.contains('game-card')) {
      this.enhanceElementContrast(element, 'card')
    } else if (element.classList.contains('drop-zone')) {
      this.enhanceElementContrast(element, 'dropzone')
    } else if (element.tagName === 'BUTTON' || element.classList.contains('btn')) {
      this.enhanceElementContrast(element, 'button')
    }
    
    // 子要素も処理
    const children = element.querySelectorAll('.game-card, .drop-zone, button, .btn')
    children.forEach(child => {
      this.analyzeAndEnhanceElement(child as HTMLElement)
    })
  }

  /**
   * コントラスト比の計算
   */
  private calculateContrastRatios(colors: ContrastTheme['colors']): ContrastTheme['contrastRatios'] {
    return {
      textBackground: this.contrastAnalyzer.calculateRatio(colors.text, colors.background),
      primaryBackground: this.contrastAnalyzer.calculateRatio(colors.primary, colors.background),
      focusBackground: this.contrastAnalyzer.calculateRatio(colors.focus, colors.background)
    }
  }

  /**
   * テーマ変更のアナウンス
   */
  private announceThemeChange(theme: ContrastTheme | null): void {
    const message = theme 
      ? `高コントラストモードを有効にしました: ${theme.name}`
      : '高コントラストモードを無効にしました'
    
    // ARIAライブリージョンでアナウンス
    const liveRegion = document.querySelector('[aria-live="assertive"]') || this.createLiveRegion()
    liveRegion.textContent = message
  }

  /**
   * ライブリージョンの作成
   */
  private createLiveRegion(): HTMLElement {
    const region = document.createElement('div')
    region.setAttribute('aria-live', 'assertive')
    region.className = 'sr-only'
    document.body.appendChild(region)
    return region
  }

  /**
   * 設定の保存
   */
  private saveSettings(): void {
    localStorage.setItem('high-contrast-settings', JSON.stringify(this.currentSettings))
  }

  /**
   * 設定の読み込み
   */
  public loadSettings(): void {
    const saved = localStorage.getItem('high-contrast-settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        this.currentSettings = { ...this.currentSettings, ...settings }
        
        if (this.currentSettings.enabled) {
          this.enable(this.currentSettings.themeId)
        }
      } catch (e) {
        console.warn('Failed to load high contrast settings:', e)
      }
    }
  }

  /**
   * 利用可能なテーマの取得
   */
  public getAvailableThemes(): ContrastTheme[] {
    return Array.from(this.themes.values())
  }

  /**
   * 現在の設定を取得
   */
  public getCurrentSettings(): ContrastSettings {
    return { ...this.currentSettings }
  }

  /**
   * コントラスト分析の実行
   */
  public analyzePageContrast(): any {
    return this.contrastAnalyzer.analyzePage()
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    
    if (this.currentSettings.enabled) {
      this.disable()
    }
    
    // 追加したスタイルを削除
    const focusStyle = document.getElementById('high-contrast-focus')
    if (focusStyle) {
      focusStyle.remove()
    }
  }
}

/**
 * コントラスト分析クラス
 */
class ContrastAnalyzer {
  /**
   * 2色のコントラスト比を計算
   */
  public calculateRatio(color1: string, color2: string): number {
    const rgb1 = this.parseColor(color1)
    const rgb2 = this.parseColor(color2)
    
    const luminance1 = this.getLuminance(rgb1)
    const luminance2 = this.getLuminance(rgb2)
    
    const lighter = Math.max(luminance1, luminance2)
    const darker = Math.min(luminance1, luminance2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  /**
   * ページ全体のコントラスト分析
   */
  public analyzePage(): any {
    const elements = document.querySelectorAll('*')
    const results: any[] = []
    
    elements.forEach(el => {
      const element = el as HTMLElement
      const style = window.getComputedStyle(element)
      const bg = style.backgroundColor
      const text = style.color
      
      if (bg !== 'rgba(0, 0, 0, 0)' && text && text !== 'rgba(0, 0, 0, 0)') {
        const ratio = this.calculateRatio(text, bg)
        const fontSize = parseFloat(style.fontSize)
        const fontWeight = style.fontWeight
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
        const requiredRatio = isLargeText ? 3 : 4.5
        
        results.push({
          element: element.tagName.toLowerCase() + (element.className ? '.' + element.className : ''),
          ratio: Math.round(ratio * 100) / 100,
          required: requiredRatio,
          passes: ratio >= requiredRatio,
          isLargeText,
          foreground: text,
          background: bg
        })
      }
    })
    
    return {
      total: results.length,
      passing: results.filter(r => r.passes).length,
      failing: results.filter(r => !r.passes).length,
      details: results.filter(r => !r.passes).slice(0, 10) // 最初の10件の失敗例
    }
  }

  private parseColor(color: string): [number, number, number] {
    // RGB形式の解析
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (rgbMatch) {
      return [parseInt(rgbMatch[1]), parseInt(rgbMatch[2]), parseInt(rgbMatch[3])]
    }
    
    // HEX形式の解析
    const hexMatch = color.match(/^#([0-9a-f]{6})$/i)
    if (hexMatch) {
      const hex = hexMatch[1]
      return [
        parseInt(hex.substr(0, 2), 16),
        parseInt(hex.substr(2, 2), 16),
        parseInt(hex.substr(4, 2), 16)
      ]
    }
    
    // デフォルト値
    return [0, 0, 0]
  }

  private getLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      const sRGB = c / 255
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }
}

// シングルトンインスタンスをエクスポート
export const highContrastManager = HighContrastManager.getInstance()