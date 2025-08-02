/**
 * カラーブラインド対応マネージャー
 * 色覚異常の方にも識別しやすい色彩とパターンによる情報伝達システム
 */

export interface ColorBlindnessType {
  id: string
  name: string
  description: string
  prevalence: string
  affectedColors: string[]
  simulationMatrix: number[][]
}

export interface ColorPattern {
  id: string
  name: string
  pattern: string
  strokeWidth: number
  spacing: number
  opacity: number
}

export interface ColorBlindnessSettings {
  enabled: boolean
  simulationType: string | null
  usePatterns: boolean
  useShapes: boolean
  useTextures: boolean
  enhanceContrast: boolean
  customColorPalette: boolean
  showColorNames: boolean
}

export class ColorBlindnessManager {
  private static instance: ColorBlindnessManager
  private currentSettings: ColorBlindnessSettings = {
    enabled: false,
    simulationType: null,
    usePatterns: true,
    useShapes: true,
    useTextures: false,
    enhanceContrast: true,
    customColorPalette: false,
    showColorNames: false
  }

  private readonly colorBlindnessTypes: Map<string, ColorBlindnessType> = new Map()
  private readonly patterns: Map<string, ColorPattern> = new Map()
  private readonly originalColors: Map<HTMLElement, string> = new Map()
  private safePalette: string[] = []
  private observers: MutationObserver[] = []

  private constructor() {
    this.initializeColorBlindnessTypes()
    this.initializePatterns()
    this.initializeSafePalette()
    this.setupDynamicEnhancements()
  }

  public static getInstance(): ColorBlindnessManager {
    if (!ColorBlindnessManager.instance) {
      ColorBlindnessManager.instance = new ColorBlindnessManager()
    }
    return ColorBlindnessManager.instance
  }

  /**
   * 色覚異常タイプの初期化
   */
  private initializeColorBlindnessTypes(): void {
    this.colorBlindnessTypes.set('protanopia', {
      id: 'protanopia',
      name: '1型色覚（赤色覚異常）',
      description: '赤の認識が困難',
      prevalence: '男性の約1%',
      affectedColors: ['red', 'green'],
      simulationMatrix: [
        [0.567, 0.433, 0.000],
        [0.558, 0.442, 0.000],
        [0.000, 0.242, 0.758]
      ]
    })

    this.colorBlindnessTypes.set('deuteranopia', {
      id: 'deuteranopia',
      name: '2型色覚（緑色覚異常）',
      description: '緑の認識が困難',
      prevalence: '男性の約1%',
      affectedColors: ['red', 'green'],
      simulationMatrix: [
        [0.625, 0.375, 0.000],
        [0.700, 0.300, 0.000],
        [0.000, 0.300, 0.700]
      ]
    })

    this.colorBlindnessTypes.set('tritanopia', {
      id: 'tritanopia',
      name: '3型色覚（青色覚異常）',
      description: '青の認識が困難',
      prevalence: '約0.001%',
      affectedColors: ['blue', 'yellow'],
      simulationMatrix: [
        [0.950, 0.050, 0.000],
        [0.000, 0.433, 0.567],
        [0.000, 0.475, 0.525]
      ]
    })

    this.colorBlindnessTypes.set('achromatopsia', {
      id: 'achromatopsia',
      name: '全色覚異常（モノクロ視）',
      description: 'すべての色の認識が困難',
      prevalence: '約0.003%',
      affectedColors: ['all'],
      simulationMatrix: [
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114],
        [0.299, 0.587, 0.114]
      ]
    })
  }

  /**
   * パターンの初期化
   */
  private initializePatterns(): void {
    this.patterns.set('solid', {
      id: 'solid',
      name: '塗りつぶし',
      pattern: 'none',
      strokeWidth: 0,
      spacing: 0,
      opacity: 1.0
    })

    this.patterns.set('diagonal-lines', {
      id: 'diagonal-lines',
      name: '斜線',
      pattern: 'repeating-linear-gradient(45deg, transparent, transparent 3px, currentColor 3px, currentColor 6px)',
      strokeWidth: 2,
      spacing: 6,
      opacity: 0.6
    })

    this.patterns.set('dots', {
      id: 'dots',
      name: 'ドット',
      pattern: 'radial-gradient(circle at 25% 25%, currentColor 2px, transparent 2px)',
      strokeWidth: 0,
      spacing: 8,
      opacity: 0.7
    })

    this.patterns.set('vertical-lines', {
      id: 'vertical-lines',
      name: '縦線',
      pattern: 'repeating-linear-gradient(90deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)',
      strokeWidth: 2,
      spacing: 4,
      opacity: 0.6
    })

    this.patterns.set('crosshatch', {
      id: 'crosshatch',
      name: 'クロスハッチ',
      pattern: 'repeating-linear-gradient(45deg, transparent, transparent 2px, currentColor 2px, currentColor 4px), repeating-linear-gradient(-45deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)',
      strokeWidth: 2,
      spacing: 4,
      opacity: 0.5
    })

    this.patterns.set('wave', {
      id: 'wave',
      name: '波線',
      pattern: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, currentColor 2px, currentColor 4px)',
      strokeWidth: 1,
      spacing: 4,
      opacity: 0.6
    })
  }

  /**
   * 安全なカラーパレットの初期化
   */
  private initializeSafePalette(): void {
    // カラーユニバーサルデザイン推奨色
    this.safePalette = [
      '#000000', // 黒
      '#FFFFFF', // 白
      '#FF4B00', // 赤
      '#005AFF', // 青
      '#03AF7A', // 緑
      '#4DC4FF', // 水色
      '#FF8E00', // オレンジ
      '#FFF100', // 黄色
      '#990099', // ピンク
      '#804000', // 茶色
    ]
  }

  /**
   * カラーブラインド対応の有効化
   */
  public enable(settings: Partial<ColorBlindnessSettings> = {}): void {
    this.currentSettings = { ...this.currentSettings, enabled: true, ...settings }
    
    this.applyColorBlindnessSupport()
    this.announceSettingsChange()
    this.saveSettings()
  }

  /**
   * カラーブラインド対応の無効化
   */
  public disable(): void {
    this.currentSettings.enabled = false
    this.removeColorBlindnessSupport()
    this.announceSettingsChange()
    this.saveSettings()
  }

  /**
   * シミュレーションの適用
   */
  public applySimulation(type: string): void {
    if (!this.colorBlindnessTypes.has(type)) {
      console.warn(`Unknown color blindness type: ${type}`)
      return
    }

    this.currentSettings.simulationType = type
    this.applyColorFilterSimulation(type)
    this.saveSettings()
  }

  /**
   * シミュレーションの削除
   */
  public removeSimulation(): void {
    this.currentSettings.simulationType = null
    this.removeColorFilterSimulation()
    this.saveSettings()
  }

  /**
   * カラーブラインド対応の適用
   */
  private applyColorBlindnessSupport(): void {
    const root = document.documentElement
    root.classList.add('color-blind-support')
    
    // ゲーム要素の強化
    this.enhanceGameElements()
    
    // パターンの適用
    if (this.currentSettings.usePatterns) {
      this.applyPatternsToElements()
    }
    
    // 形状の適用
    if (this.currentSettings.useShapes) {
      this.applyShapesToElements()
    }
    
    // カラーネーム表示
    if (this.currentSettings.showColorNames) {
      this.addColorNameLabels()
    }
    
    // コントラスト強化
    if (this.currentSettings.enhanceContrast) {
      this.enhanceColorContrast()
    }

    // CSS変数の設定
    this.setCSSVariables()
  }

  /**
   * カラーブラインド対応の削除
   */
  private removeColorBlindnessSupport(): void {
    const root = document.documentElement
    root.classList.remove('color-blind-support')
    
    // 適用した変更を元に戻す
    this.restoreOriginalColors()
    this.removePatterns()
    this.removeShapes()
    this.removeColorNameLabels()
    this.removeColorFilterSimulation()
  }

  /**
   * ゲーム要素の強化
   */
  private enhanceGameElements(): void {
    // カード要素の強化
    const cards = document.querySelectorAll('.game-card')
    cards.forEach((card, index) => {
      this.enhanceCardVisibility(card as HTMLElement, index)
    })

    // ドロップゾーンの強化
    const dropZones = document.querySelectorAll('.drop-zone')
    dropZones.forEach((zone, index) => {
      this.enhanceDropZoneVisibility(zone as HTMLElement, index)
    })

    // ボタンの強化
    const buttons = document.querySelectorAll('button, .btn')
    buttons.forEach((button, index) => {
      this.enhanceButtonVisibility(button as HTMLElement, index)
    })

    // ステータス表示の強化
    const statusElements = document.querySelectorAll('.vitality, .turn-counter, .score')
    statusElements.forEach((element, index) => {
      this.enhanceStatusVisibility(element as HTMLElement, index)
    })
  }

  /**
   * カードの視認性強化
   */
  private enhanceCardVisibility(card: HTMLElement, index: number): void {
    const cardType = card.getAttribute('data-card-type') || 'default'
    
    // パターンの適用
    if (this.currentSettings.usePatterns) {
      const patternId = this.getPatternForCardType(cardType)
      this.applyPatternToElement(card, patternId)
    }
    
    // 形状の適用
    if (this.currentSettings.useShapes) {
      this.applyShapeToCard(card, cardType)
    }
    
    // 境界線の強化
    card.style.border = '3px solid'
    card.style.borderColor = this.getSafeColorForType(cardType)
    
    // アイコンの追加
    this.addTypeIcon(card, cardType)
  }

  /**
   * ドロップゾーンの視認性強化
   */
  private enhanceDropZoneVisibility(zone: HTMLElement, index: number): void {
    const zoneType = zone.getAttribute('data-zone-type') || 'default'
    
    // パターンの適用
    if (this.currentSettings.usePatterns) {
      const patternId = this.getPatternForZoneType(zoneType)
      this.applyPatternToElement(zone, patternId)
    }
    
    // 点線境界の強化
    zone.style.border = '4px dashed'
    zone.style.borderColor = this.getSafeColorForType(zoneType)
    
    // ラベルの追加
    this.addZoneLabel(zone, zoneType)
  }

  /**
   * ボタンの視認性強化
   */
  private enhanceButtonVisibility(button: HTMLElement, index: number): void {
    const buttonType = button.getAttribute('data-button-type') || 'default'
    
    // 安全な色の適用
    const safeColor = this.safePalette[index % this.safePalette.length]
    button.style.backgroundColor = safeColor
    button.style.color = this.getContrastingColor(safeColor)
    
    // 境界線の追加
    button.style.border = '2px solid'
    button.style.borderColor = this.getContrastingColor(safeColor)
    
    // テキスト強調
    button.style.fontWeight = 'bold'
    button.style.textShadow = '1px 1px 1px rgba(0,0,0,0.5)'
  }

  /**
   * ステータス表示の強化
   */
  private enhanceStatusVisibility(element: HTMLElement, index: number): void {
    // 背景色の設定
    const safeColor = this.safePalette[index % this.safePalette.length]
    element.style.backgroundColor = safeColor
    element.style.color = this.getContrastingColor(safeColor)
    
    // パディングと境界線
    element.style.padding = '8px 12px'
    element.style.border = '2px solid'
    element.style.borderColor = this.getContrastingColor(safeColor)
    element.style.borderRadius = '4px'
  }

  /**
   * パターンの適用
   */
  private applyPatternsToElements(): void {
    const coloredElements = document.querySelectorAll('[style*="background-color"], [style*="color"]')
    coloredElements.forEach((element, index) => {
      const htmlElement = element as HTMLElement
      const patternId = ['diagonal-lines', 'dots', 'vertical-lines', 'crosshatch'][index % 4]
      this.applyPatternToElement(htmlElement, patternId)
    })
  }

  /**
   * 要素へのパターン適用
   */
  private applyPatternToElement(element: HTMLElement, patternId: string): void {
    const pattern = this.patterns.get(patternId)
    if (!pattern || pattern.pattern === 'none') return
    
    // 既存の背景を保存
    const originalBackground = element.style.backgroundImage
    if (originalBackground) {
      this.originalColors.set(element, originalBackground)
    }
    
    // パターンを適用
    element.style.backgroundImage = pattern.pattern
    element.style.backgroundSize = `${pattern.spacing}px ${pattern.spacing}px`
    element.classList.add('cb-pattern-enhanced')
  }

  /**
   * 形状の適用
   */
  private applyShapesToElements(): void {
    const cards = document.querySelectorAll('.game-card')
    cards.forEach((card, index) => {
      this.applyShapeToCard(card as HTMLElement, card.getAttribute('data-card-type') || 'default')
    })
  }

  /**
   * カードへの形状適用
   */
  private applyShapeToCard(card: HTMLElement, cardType: string): void {
    const shapes = {
      'life': '50% 0% 50% 100%', // ダイヤモンド
      'insurance': '0 0 100% 100%', // 三角形
      'challenge': '50%', // 円形
      'default': '10px' // 角丸四角形
    }
    
    const clipPath = shapes[cardType as keyof typeof shapes] || shapes.default
    
    if (cardType === 'challenge') {
      card.style.borderRadius = clipPath
    } else if (cardType === 'insurance') {
      card.style.clipPath = `polygon(0 100%, 50% 0, 100% 100%)`
    } else if (cardType === 'life') {
      card.style.clipPath = `polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)`
    } else {
      card.style.borderRadius = clipPath
    }
    
    card.classList.add('cb-shape-enhanced')
  }

  /**
   * アイコンの追加
   */
  private addTypeIcon(element: HTMLElement, type: string): void {
    const icons = {
      'life': '♥',
      'insurance': '🛡',
      'challenge': '⚡',
      'default': '●'
    }
    
    const icon = icons[type as keyof typeof icons] || icons.default
    
    // 既存のアイコンを削除
    const existingIcon = element.querySelector('.cb-type-icon')
    if (existingIcon) {
      existingIcon.remove()
    }
    
    // 新しいアイコンを追加
    const iconElement = document.createElement('span')
    iconElement.className = 'cb-type-icon'
    iconElement.textContent = icon
    iconElement.style.cssText = `
      position: absolute;
      top: 4px;
      right: 4px;
      font-size: 20px;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    `
    
    element.style.position = 'relative'
    element.appendChild(iconElement)
  }

  /**
   * ゾーンラベルの追加
   */
  private addZoneLabel(zone: HTMLElement, type: string): void {
    const labels = {
      'hand': '手札',
      'field': 'フィールド',
      'discard': '捨て札',
      'default': 'エリア'
    }
    
    const label = labels[type as keyof typeof labels] || labels.default
    
    // 既存のラベルを削除
    const existingLabel = zone.querySelector('.cb-zone-label')
    if (existingLabel) {
      existingLabel.remove()
    }
    
    // 新しいラベルを追加
    const labelElement = document.createElement('div')
    labelElement.className = 'cb-zone-label'
    labelElement.textContent = label
    labelElement.style.cssText = `
      position: absolute;
      top: 8px;
      left: 8px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 10;
    `
    
    zone.style.position = 'relative'
    zone.appendChild(labelElement)
  }

  /**
   * カラーネームラベルの追加
   */
  private addColorNameLabels(): void {
    const coloredElements = document.querySelectorAll('[style*="background-color"]')
    coloredElements.forEach(element => {
      const htmlElement = element as HTMLElement
      const bgColor = htmlElement.style.backgroundColor
      if (bgColor) {
        const colorName = this.getColorName(bgColor)
        this.addColorLabel(htmlElement, colorName)
      }
    })
  }

  /**
   * カラーラベルの追加
   */
  private addColorLabel(element: HTMLElement, colorName: string): void {
    // 既存のラベルを削除
    const existingLabel = element.querySelector('.cb-color-label')
    if (existingLabel) {
      existingLabel.remove()
    }
    
    // 新しいラベルを追加
    const labelElement = document.createElement('span')
    labelElement.className = 'cb-color-label'
    labelElement.textContent = colorName
    labelElement.style.cssText = `
      position: absolute;
      bottom: 4px;
      left: 4px;
      background: rgba(255, 255, 255, 0.9);
      color: black;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
      z-index: 10;
    `
    
    element.style.position = 'relative'
    element.appendChild(labelElement)
  }

  /**
   * 色フィルターシミュレーションの適用
   */
  private applyColorFilterSimulation(type: string): void {
    const colorBlindType = this.colorBlindnessTypes.get(type)
    if (!colorBlindType) return
    
    // SVGフィルターを作成
    this.createSVGFilter(type, colorBlindType.simulationMatrix)
    
    // フィルターを適用
    document.documentElement.style.filter = `url(#colorblind-${type})`
  }

  /**
   * SVGフィルターの作成
   */
  private createSVGFilter(type: string, matrix: number[][]): void {
    // 既存のSVGを削除
    const existingSvg = document.getElementById('colorblind-filters')
    if (existingSvg) {
      existingSvg.remove()
    }
    
    // 新しいSVGフィルターを作成
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.id = 'colorblind-filters'
    svg.style.cssText = 'position: absolute; width: 0; height: 0;'
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter')
    filter.id = `colorblind-${type}`
    
    const colorMatrix = document.createElementNS('http://www.w3.org/2000/svg', 'feColorMatrix')
    colorMatrix.setAttribute('type', 'matrix')
    colorMatrix.setAttribute('values', matrix.flat().join(' '))
    
    filter.appendChild(colorMatrix)
    defs.appendChild(filter)
    svg.appendChild(defs)
    document.body.appendChild(svg)
  }

  /**
   * 色フィルターシミュレーションの削除
   */
  private removeColorFilterSimulation(): void {
    document.documentElement.style.filter = ''
    const svg = document.getElementById('colorblind-filters')
    if (svg) {
      svg.remove()
    }
  }

  /**
   * 動的な機能強化の設定
   */
  private setupDynamicEnhancements(): void {
    const observer = new MutationObserver((mutations) => {
      if (!this.currentSettings.enabled) return
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement
              this.enhanceNewElement(element)
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
   * 新しい要素の強化
   */
  private enhanceNewElement(element: HTMLElement): void {
    if (element.classList.contains('game-card')) {
      this.enhanceCardVisibility(element, 0)
    } else if (element.classList.contains('drop-zone')) {
      this.enhanceDropZoneVisibility(element, 0)
    } else if (element.tagName === 'BUTTON' || element.classList.contains('btn')) {
      this.enhanceButtonVisibility(element, 0)
    }
    
    // 子要素も処理
    const children = element.querySelectorAll('.game-card, .drop-zone, button, .btn')
    children.forEach(child => {
      this.enhanceNewElement(child as HTMLElement)
    })
  }

  /**
   * ユーティリティ関数
   */
  private getPatternForCardType(cardType: string): string {
    const patternMap = {
      'life': 'diagonal-lines',
      'insurance': 'dots',
      'challenge': 'vertical-lines',
      'default': 'solid'
    }
    return patternMap[cardType as keyof typeof patternMap] || patternMap.default
  }

  private getPatternForZoneType(zoneType: string): string {
    const patternMap = {
      'hand': 'wave',
      'field': 'crosshatch',
      'discard': 'vertical-lines',
      'default': 'diagonal-lines'
    }
    return patternMap[zoneType as keyof typeof patternMap] || patternMap.default
  }

  private getSafeColorForType(type: string): string {
    const colorMap = {
      'life': '#FF4B00',     // 赤
      'insurance': '#005AFF', // 青
      'challenge': '#03AF7A', // 緑
      'hand': '#FF8E00',     // オレンジ
      'field': '#4DC4FF',    // 水色
      'discard': '#990099',  // ピンク
      'default': '#000000'   // 黒
    }
    return colorMap[type as keyof typeof colorMap] || colorMap.default
  }

  private getContrastingColor(color: string): string {
    // 簡単な明度計算で白か黒を選択
    const rgb = this.parseRGBColor(color)
    if (!rgb) return '#000000'
    
    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000
    return brightness > 128 ? '#000000' : '#FFFFFF'
  }

  private parseRGBColor(color: string): [number, number, number] | null {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
    }
    return null
  }

  private getColorName(color: string): string {
    const colorNames = {
      'rgb(255, 75, 0)': '赤',
      'rgb(0, 90, 255)': '青',
      'rgb(3, 175, 122)': '緑',
      'rgb(255, 142, 0)': 'オレンジ',
      'rgb(77, 196, 255)': '水色',
      'rgb(153, 0, 153)': 'ピンク',
      'rgb(255, 241, 0)': '黄色',
      'rgb(128, 64, 0)': '茶色',
      'rgb(0, 0, 0)': '黒',
      'rgb(255, 255, 255)': '白'
    }
    
    return colorNames[color as keyof typeof colorNames] || '不明'
  }

  private setCSSVariables(): void {
    const root = document.documentElement
    
    // 安全な色をCSS変数として設定
    this.safePalette.forEach((color, index) => {
      root.style.setProperty(`--safe-color-${index}`, color)
    })
    
    // カラーブラインド対応の追加スタイル
    const style = document.createElement('style')
    style.id = 'colorblind-support-styles'
    style.textContent = `
      .color-blind-support .cb-pattern-enhanced {
        background-blend-mode: multiply;
      }
      
      .color-blind-support .cb-shape-enhanced {
        transition: transform 0.2s ease;
      }
      
      .color-blind-support .cb-type-icon {
        pointer-events: none;
      }
      
      .color-blind-support .cb-zone-label,
      .color-blind-support .cb-color-label {
        pointer-events: none;
        user-select: none;
      }
      
      .color-blind-support button:focus,
      .color-blind-support .game-card:focus {
        outline: 4px solid #000000;
        outline-offset: 2px;
      }
    `
    
    document.head.appendChild(style)
  }

  private enhanceColorContrast(): void {
    // 既存のコントラスト強化ロジックを適用
    const elements = document.querySelectorAll('*')
    elements.forEach(el => {
      const element = el as HTMLElement
      const style = window.getComputedStyle(element)
      const bg = style.backgroundColor
      const text = style.color
      
      if (bg && text && bg !== 'rgba(0, 0, 0, 0)') {
        // コントラスト比をチェックして必要に応じて調整
        // 実装は複雑になるため、簡単なケースのみ対応
        if (this.needsContrastEnhancement(bg, text)) {
          element.style.textShadow = '1px 1px 2px rgba(0,0,0,0.8)'
          element.style.fontWeight = 'bold'
        }
      }
    })
  }

  private needsContrastEnhancement(bg: string, text: string): boolean {
    // 簡単なコントラスト判定
    const bgRgb = this.parseRGBColor(bg)
    const textRgb = this.parseRGBColor(text)
    
    if (!bgRgb || !textRgb) return false
    
    const bgBrightness = (bgRgb[0] + bgRgb[1] + bgRgb[2]) / 3
    const textBrightness = (textRgb[0] + textRgb[1] + textRgb[2]) / 3
    
    return Math.abs(bgBrightness - textBrightness) < 128
  }

  private restoreOriginalColors(): void {
    this.originalColors.forEach((originalColor, element) => {
      element.style.backgroundImage = originalColor
    })
    this.originalColors.clear()
  }

  private removePatterns(): void {
    const patternElements = document.querySelectorAll('.cb-pattern-enhanced')
    patternElements.forEach(element => {
      const htmlElement = element as HTMLElement
      htmlElement.style.backgroundImage = ''
      htmlElement.classList.remove('cb-pattern-enhanced')
    })
  }

  private removeShapes(): void {
    const shapeElements = document.querySelectorAll('.cb-shape-enhanced')
    shapeElements.forEach(element => {
      const htmlElement = element as HTMLElement
      htmlElement.style.clipPath = ''
      htmlElement.style.borderRadius = ''
      htmlElement.classList.remove('cb-shape-enhanced')
    })
  }

  private removeColorNameLabels(): void {
    const labels = document.querySelectorAll('.cb-color-label, .cb-type-icon, .cb-zone-label')
    labels.forEach(label => { label.remove(); })
  }

  private announceSettingsChange(): void {
    const message = this.currentSettings.enabled 
      ? 'カラーブラインド対応を有効にしました' 
      : 'カラーブラインド対応を無効にしました'
    
    // ARIAライブリージョンでアナウンス
    const liveRegion = document.querySelector('[aria-live="assertive"]') || this.createLiveRegion()
    liveRegion.textContent = message
  }

  private createLiveRegion(): HTMLElement {
    const region = document.createElement('div')
    region.setAttribute('aria-live', 'assertive')
    region.className = 'sr-only'
    document.body.appendChild(region)
    return region
  }

  private saveSettings(): void {
    localStorage.setItem('colorblind-settings', JSON.stringify(this.currentSettings))
  }

  /**
   * 設定の読み込み
   */
  public loadSettings(): void {
    const saved = localStorage.getItem('colorblind-settings')
    if (saved) {
      try {
        const settings = JSON.parse(saved)
        this.currentSettings = { ...this.currentSettings, ...settings }
        
        if (this.currentSettings.enabled) {
          this.applyColorBlindnessSupport()
        }
        
        if (this.currentSettings.simulationType) {
          this.applyColorFilterSimulation(this.currentSettings.simulationType)
        }
      } catch (e) {
        console.warn('Failed to load colorblind settings:', e)
      }
    }
  }

  /**
   * 利用可能な色覚異常タイプの取得
   */
  public getAvailableTypes(): ColorBlindnessType[] {
    return Array.from(this.colorBlindnessTypes.values())
  }

  /**
   * 現在の設定を取得
   */
  public getCurrentSettings(): ColorBlindnessSettings {
    return { ...this.currentSettings }
  }

  /**
   * 安全なカラーパレットを取得
   */
  public getSafePalette(): string[] {
    return [...this.safePalette]
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.observers.forEach(observer => { observer.disconnect(); })
    this.observers = []
    
    if (this.currentSettings.enabled) {
      this.disable()
    }
    
    this.removeColorFilterSimulation()
    
    // 追加したスタイルを削除
    const style = document.getElementById('colorblind-support-styles')
    if (style) {
      style.remove()
    }
  }
}

// シングルトンインスタンスをエクスポート
export const colorBlindnessManager = ColorBlindnessManager.getInstance()