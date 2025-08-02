/**
 * MultilingualLayoutManager - 多言語対応の柔軟なレイアウトシステム
 * 
 * 機能:
 * - RTL/LTR言語の自動対応
 * - テキスト長変動への動的調整
 * - フォント特性に基づくレイアウト最適化
 * - 縦書き文字対応
 * - 複数言語混在レイアウト
 */

import { viewportManager } from './ViewportManager'

export interface LanguageInfo {
  code: string
  direction: 'ltr' | 'rtl'
  writingMode: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr'
  fontFamily: string[]
  baselineAlign: 'alphabetic' | 'ideographic' | 'hanging'
  textExpansionFactor: number // 英語に対する相対的な文字数比率
  preferredLineHeight: number
  wordSpacing: boolean
  characterSpacing: number
  punctuationStyle: 'western' | 'asian' | 'arabic'
}

export interface LayoutConstraints {
  minWidth?: number
  maxWidth?: number
  preferredAspectRatio?: number
  allowTextOverflow?: boolean
  prioritizeReadability?: boolean
  adaptToContentLength?: boolean
}

export interface TextMetrics {
  width: number
  height: number
  lineCount: number
  averageCharWidth: number
  hasOverflow: boolean
  readabilityScore: number
}

export interface MultilingualLayoutConfig {
  primaryLanguage: string
  fallbackLanguages: string[]
  autoDetectLanguage: boolean
  respectSystemLocale: boolean
  enableBidirectionalText: boolean
  optimizeForReading: boolean
  adaptiveSpacing: boolean
  dynamicFontLoading: boolean
}

export class MultilingualLayoutManager {
  private readonly config: MultilingualLayoutConfig
  private readonly languageDatabase: Map<string, LanguageInfo> = new Map()
  private currentLanguage: string
  private readonly layoutCache: Map<string, any> = new Map()
  private readonly fontLoadPromises: Map<string, Promise<void>> = new Map()
  private measurementCanvas: HTMLCanvasElement
  private measurementContext: CanvasRenderingContext2D

  // 言語データベース
  private readonly defaultLanguages: LanguageInfo[] = [
    {
      code: 'ja',
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Noto Sans JP',
        'Hiragino Kaku Gothic ProN',
        'Hiragino Sans',
        'Yu Gothic',
        'Meiryo',
        'sans-serif'
      ],
      baselineAlign: 'ideographic',
      textExpansionFactor: 1.0,
      preferredLineHeight: 1.6,
      wordSpacing: false,
      characterSpacing: 0.05,
      punctuationStyle: 'asian'
    },
    {
      code: 'en',
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Inter',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'sans-serif'
      ],
      baselineAlign: 'alphabetic',
      textExpansionFactor: 1.0,
      preferredLineHeight: 1.5,
      wordSpacing: true,
      characterSpacing: 0,
      punctuationStyle: 'western'
    },
    {
      code: 'zh',
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Noto Sans SC',
        'PingFang SC',
        'Hiragino Sans GB',
        'Microsoft YaHei',
        'SimHei',
        'sans-serif'
      ],
      baselineAlign: 'ideographic',
      textExpansionFactor: 0.9,
      preferredLineHeight: 1.6,
      wordSpacing: false,
      characterSpacing: 0.05,
      punctuationStyle: 'asian'
    },
    {
      code: 'ko',
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Noto Sans KR',
        'Apple SD Gothic Neo',
        'Malgun Gothic',
        'sans-serif'
      ],
      baselineAlign: 'ideographic',
      textExpansionFactor: 1.1,
      preferredLineHeight: 1.6,
      wordSpacing: false,
      characterSpacing: 0.03,
      punctuationStyle: 'asian'
    },
    {
      code: 'ar',
      direction: 'rtl',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Noto Sans Arabic',
        'Tahoma',
        'Arial Unicode MS',
        'sans-serif'
      ],
      baselineAlign: 'alphabetic',
      textExpansionFactor: 1.3,
      preferredLineHeight: 1.7,
      wordSpacing: true,
      characterSpacing: 0,
      punctuationStyle: 'arabic'
    },
    {
      code: 'he',
      direction: 'rtl',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Noto Sans Hebrew',
        'Arial Hebrew',
        'David',
        'sans-serif'
      ],
      baselineAlign: 'alphabetic',
      textExpansionFactor: 1.2,
      preferredLineHeight: 1.6,
      wordSpacing: true,
      characterSpacing: 0,
      punctuationStyle: 'western'
    },
    {
      code: 'de',
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Inter',
        'system-ui',
        'sans-serif'
      ],
      baselineAlign: 'alphabetic',
      textExpansionFactor: 1.3,
      preferredLineHeight: 1.5,
      wordSpacing: true,
      characterSpacing: 0,
      punctuationStyle: 'western'
    },
    {
      code: 'fr',
      direction: 'ltr',
      writingMode: 'horizontal-tb',
      fontFamily: [
        'Inter',
        'system-ui',
        'sans-serif'
      ],
      baselineAlign: 'alphabetic',
      textExpansionFactor: 1.2,
      preferredLineHeight: 1.5,
      wordSpacing: true,
      characterSpacing: 0,
      punctuationStyle: 'western'
    }
  ]

  constructor(config: Partial<MultilingualLayoutConfig> = {}) {
    this.config = {
      primaryLanguage: 'ja',
      fallbackLanguages: ['en'],
      autoDetectLanguage: true,
      respectSystemLocale: true,
      enableBidirectionalText: true,
      optimizeForReading: true,
      adaptiveSpacing: true,
      dynamicFontLoading: true,
      ...config
    }

    this.currentLanguage = this.config.primaryLanguage
    this.setupMeasurementTools()
    this.loadLanguageDatabase()
    this.detectInitialLanguage()
    this.setupDocumentProperties()
  }

  /**
   * 測定ツールの設定
   */
  private setupMeasurementTools(): void {
    this.measurementCanvas = document.createElement('canvas')
    this.measurementContext = this.measurementCanvas.getContext('2d')!
    this.measurementCanvas.style.position = 'absolute'
    this.measurementCanvas.style.visibility = 'hidden'
    this.measurementCanvas.style.left = '-9999px'
    document.body.appendChild(this.measurementCanvas)
  }

  /**
   * 言語データベースの読み込み
   */
  private loadLanguageDatabase(): void {
    this.defaultLanguages.forEach(lang => {
      this.languageDatabase.set(lang.code, lang)
    })
  }

  /**
   * 初期言語の検出
   */
  private detectInitialLanguage(): void {
    if (!this.config.autoDetectLanguage) {
      return
    }

    // ブラウザ言語設定の確認
    const browserLanguages = navigator.languages || [navigator.language]
    
    for (const browserLang of browserLanguages) {
      const langCode = browserLang.split('-')[0]
      if (this.languageDatabase.has(langCode)) {
        this.currentLanguage = langCode
        break
      }
    }

    // システムロケールの確認
    if (this.config.respectSystemLocale) {
      const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale
      const systemLangCode = systemLocale.split('-')[0]
      if (this.languageDatabase.has(systemLangCode)) {
        this.currentLanguage = systemLangCode
      }
    }
  }

  /**
   * ドキュメントプロパティの設定
   */
  private setupDocumentProperties(): void {
    this.updateDocumentDirection()
    this.updateDocumentFonts()
    this.setupBidirectionalText()
  }

  /**
   * 言語の設定
   */
  public setLanguage(languageCode: string): void {
    if (!this.languageDatabase.has(languageCode)) {
      console.warn(`Language '${languageCode}' not supported`)
      return
    }

    this.currentLanguage = languageCode
    this.updateDocumentDirection()
    this.updateDocumentFonts()
    this.clearLayoutCache()
    
    // フォントの動的読み込み
    if (this.config.dynamicFontLoading) {
      this.loadLanguageFonts(languageCode)
    }
  }

  /**
   * テキストの測定
   */
  public measureText(
    text: string, 
    fontSize: number, 
    fontFamily?: string,
    constraints: LayoutConstraints = {}
  ): TextMetrics {
    const cacheKey = `${text}-${fontSize}-${fontFamily}-${JSON.stringify(constraints)}`
    
    if (this.layoutCache.has(cacheKey)) {
      return this.layoutCache.get(cacheKey)
    }

    const langInfo = this.getCurrentLanguageInfo()
    const actualFontFamily = fontFamily || langInfo.fontFamily.join(', ')
    
    this.measurementContext.font = `${fontSize}px ${actualFontFamily}`
    
    const singleLineWidth = this.measurementContext.measureText(text).width
    const averageCharWidth = singleLineWidth / text.length
    
    // 制約に基づく折り返し計算
    const maxWidth = constraints.maxWidth || Infinity
    const lines = this.calculateTextLines(text, maxWidth, averageCharWidth)
    
    const metrics: TextMetrics = {
      width: Math.min(singleLineWidth, maxWidth),
      height: lines.length * fontSize * langInfo.preferredLineHeight,
      lineCount: lines.length,
      averageCharWidth,
      hasOverflow: singleLineWidth > maxWidth,
      readabilityScore: this.calculateReadabilityScore(text, fontSize, maxWidth)
    }

    this.layoutCache.set(cacheKey, metrics)
    return metrics
  }

  /**
   * レスポンシブテキストサイズの計算
   */
  public calculateResponsiveTextSize(
    baseSize: number,
    containerWidth: number,
    targetText: string,
    constraints: LayoutConstraints = {}
  ): {
    fontSize: number
    lineHeight: number
    letterSpacing: number
    wordSpacing: number
  } {
    const langInfo = this.getCurrentLanguageInfo()
    const viewportInfo = viewportManager.getViewportInfo()
    
    // テキスト拡張係数を考慮
    const expandedLength = targetText.length * langInfo.textExpansionFactor
    
    // コンテナ幅に基づく調整
    const widthScale = Math.min(containerWidth / 320, 2) // 320pxを基準
    
    // デバイスタイプによる調整
    const deviceScale = {
      mobile: 0.9,
      tablet: 1.0,
      desktop: 1.1
    }[viewportInfo.deviceType]
    
    // DPI対応
    const dpiScale = Math.min(viewportInfo.devicePixelRatio / 2, 1.5)
    
    let fontSize = baseSize * widthScale * deviceScale * dpiScale
    
    // 最小・最大サイズの制限
    fontSize = Math.max(12, Math.min(fontSize, 72))
    
    // 読みやすさを最適化
    if (this.config.optimizeForReading) {
      const metrics = this.measureText(targetText, fontSize, undefined, constraints)
      if (metrics.readabilityScore < 0.7) {
        fontSize *= 1.1 // サイズを少し大きく
      }
    }

    return {
      fontSize,
      lineHeight: fontSize * langInfo.preferredLineHeight,
      letterSpacing: fontSize * langInfo.characterSpacing,
      wordSpacing: langInfo.wordSpacing ? fontSize * 0.25 : 0
    }
  }

  /**
   * 双方向テキスト対応レイアウト
   */
  public createBidirectionalLayout(
    element: HTMLElement,
    content: { [key: string]: string }
  ): void {
    if (!this.config.enableBidirectionalText) {
      return
    }

    const langInfo = this.getCurrentLanguageInfo()
    
    // 要素のベース方向を設定
    element.dir = langInfo.direction
    element.style.direction = langInfo.direction
    element.style.textAlign = langInfo.direction === 'rtl' ? 'right' : 'left'
    
    // 混合言語コンテンツの処理
    Object.entries(content).forEach(([lang, text]) => {
      const textLangInfo = this.languageDatabase.get(lang)
      if (textLangInfo && textLangInfo.direction !== langInfo.direction) {
        // 反対方向のテキストには明示的にdirを設定
        const span = document.createElement('span')
        span.dir = textLangInfo.direction
        span.lang = lang
        span.textContent = text
        element.appendChild(span)
      }
    })
  }

  /**
   * アダプティブグリッドレイアウト
   */
  public createAdaptiveGridLayout(
    container: HTMLElement,
    items: Array<{ text: string, minWidth?: number }>,
    options: {
      gap?: number
      minColumns?: number
      maxColumns?: number
      maintainAspectRatio?: boolean
    } = {}
  ): void {
    const { gap = 16, minColumns = 1, maxColumns = 6 } = options
    const langInfo = this.getCurrentLanguageInfo()
    
    // 各アイテムの最適幅を計算
    const itemWidths = items.map(item => {
      const metrics = this.measureText(item.text, 16)
      return Math.max(metrics.width + 32, item.minWidth || 200) // パディング考慮
    })
    
    const containerWidth = container.offsetWidth
    const availableWidth = containerWidth - gap * 2
    
    // 最適な列数を計算
    let columns = minColumns
    for (let c = minColumns; c <= maxColumns; c++) {
      const itemWidth = (availableWidth - gap * (c - 1)) / c
      const canFitAll = itemWidths.every(width => width <= itemWidth)
      
      if (canFitAll) {
        columns = c
      } else {
        break
      }
    }
    
    // CSS Grid設定
    container.style.display = 'grid'
    container.style.gridTemplateColumns = `repeat(${columns}, 1fr)`
    container.style.gap = `${gap}px`
    container.style.direction = langInfo.direction
    
    // RTL言語の場合はグリッドの順序を調整
    if (langInfo.direction === 'rtl') {
      container.style.gridAutoFlow = 'row'
    }
  }

  /**
   * 縦書きレイアウトの作成
   */
  public createVerticalLayout(
    element: HTMLElement,
    text: string,
    options: {
      maxHeight?: number
      columnWidth?: number
      columnGap?: number
    } = {}
  ): void {
    const langInfo = this.getCurrentLanguageInfo()
    
    if (langInfo.writingMode.startsWith('vertical')) {
      element.style.writingMode = langInfo.writingMode
      element.style.textCombineUpright = 'digits 2' // 数字の横組み
      
      if (options.maxHeight) {
        element.style.maxHeight = `${options.maxHeight}px`
        element.style.overflow = 'hidden'
      }
      
      if (options.columnWidth) {
        element.style.columnWidth = `${options.columnWidth}px`
        element.style.columnGap = `${options.columnGap || 20}px`
        element.style.columnFill = 'auto'
      }
    }
  }

  /**
   * フォント特性に基づくスタイル調整
   */
  public adjustForFontCharacteristics(element: HTMLElement): void {
    const langInfo = this.getCurrentLanguageInfo()
    
    // フォントファミリーの設定
    element.style.fontFamily = langInfo.fontFamily.join(', ')
    
    // ベースライン調整
    element.style.dominantBaseline = langInfo.baselineAlign
    
    // 文字間隔の調整
    if (this.config.adaptiveSpacing) {
      element.style.letterSpacing = `${langInfo.characterSpacing}em`
      
      if (langInfo.wordSpacing) {
        element.style.wordSpacing = '0.25em'
      } else {
        element.style.wordSpacing = 'normal'
      }
    }
    
    // 句読点スタイルの調整
    switch (langInfo.punctuationStyle) {
      case 'asian':
        element.style.textJustify = 'inter-ideograph'
        element.style.lineBreak = 'strict'
        element.style.wordBreak = 'keep-all'
        break
      case 'arabic':
        element.style.textJustify = 'kashida'
        break
      default:
        element.style.textJustify = 'auto'
        break
    }
  }

  /**
   * 言語特有のタイポグラフィルールの適用
   */
  public applyTypographyRules(element: HTMLElement, text: string): void {
    const langInfo = this.getCurrentLanguageInfo()
    
    // 日本語特有の処理
    if (langInfo.code === 'ja') {
      // 禁則処理
      element.style.lineBreak = 'strict'
      element.style.overflowWrap = 'break-word'
      
      // 約物の調整
      element.style.textSpacingTrim = 'auto'
      element.style.textAutospace = 'auto'
    }
    
    // アラビア語特有の処理
    if (langInfo.code === 'ar') {
      element.style.textAlign = 'justify'
      element.style.textJustify = 'kashida'
      element.style.fontKerning = 'auto'
    }
    
    // 英語系言語の処理
    if (langInfo.punctuationStyle === 'western') {
      element.style.hyphens = 'auto'
    }
  }

  /**
   * 現在の言語情報を取得
   */
  private getCurrentLanguageInfo(): LanguageInfo {
    return this.languageDatabase.get(this.currentLanguage) || this.languageDatabase.get('en')!
  }

  /**
   * ドキュメント方向の更新
   */
  private updateDocumentDirection(): void {
    const langInfo = this.getCurrentLanguageInfo()
    document.documentElement.dir = langInfo.direction
    document.documentElement.lang = this.currentLanguage
  }

  /**
   * ドキュメントフォントの更新
   */
  private updateDocumentFonts(): void {
    const langInfo = this.getCurrentLanguageInfo()
    document.documentElement.style.fontFamily = langInfo.fontFamily.join(', ')
  }

  /**
   * 双方向テキストの設定
   */
  private setupBidirectionalText(): void {
    if (!this.config.enableBidirectionalText) return
    
    const style = document.createElement('style')
    style.textContent = `
      [dir="auto"] {
        unicode-bidi: plaintext;
      }
      
      .bidi-isolate {
        unicode-bidi: isolate;
      }
      
      .bidi-isolate-override {
        unicode-bidi: isolate-override;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * 言語フォントの動的読み込み
   */
  private async loadLanguageFonts(languageCode: string): Promise<void> {
    if (this.fontLoadPromises.has(languageCode)) {
      return this.fontLoadPromises.get(languageCode)!
    }

    const langInfo = this.languageDatabase.get(languageCode)
    if (!langInfo) return

    const loadPromise = this.loadWebFonts(langInfo.fontFamily)
    this.fontLoadPromises.set(languageCode, loadPromise)
    
    return loadPromise
  }

  /**
   * Webフォントの読み込み
   */
  private async loadWebFonts(fontFamilies: string[]): Promise<void> {
    if (!('fonts' in document)) return

    const loadPromises = fontFamilies
      .filter(family => !family.includes('system') && !family.includes('serif'))
      .map(async family => {
        const fontFace = new FontFace(family, `url(/fonts/${family.replace(' ', '-').toLowerCase()}.woff2)`)
        return fontFace.load().then(font => {
          document.fonts.add(font)
        }).catch(() => {
          // フォント読み込み失敗は無視
        })
      })

    await Promise.allSettled(loadPromises)
  }

  /**
   * テキスト行の計算
   */
  private calculateTextLines(text: string, maxWidth: number, charWidth: number): string[] {
    if (maxWidth === Infinity) {
      return [text]
    }

    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = testLine.length * charWidth
      
      if (testWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          // 単語が長すぎる場合は強制的に改行
          lines.push(word)
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }

  /**
   * 読みやすさスコアの計算
   */
  private calculateReadabilityScore(text: string, fontSize: number, maxWidth: number): number {
    const langInfo = this.getCurrentLanguageInfo()
    const idealLineLength = langInfo.code === 'ja' ? 35 : 66 // 文字数
    const idealLineLengthPx = idealLineLength * fontSize * 0.6
    
    let score = 1.0
    
    // 行長の評価
    if (maxWidth > idealLineLengthPx * 1.5) {
      score *= 0.8 // 長すぎる
    } else if (maxWidth < idealLineLengthPx * 0.5) {
      score *= 0.9 // 短すぎる
    }
    
    // フォントサイズの評価
    if (fontSize < 14) {
      score *= 0.7 // 小さすぎる
    } else if (fontSize > 24) {
      score *= 0.9 // 大きすぎる
    }
    
    return score
  }

  /**
   * レイアウトキャッシュのクリア
   */
  private clearLayoutCache(): void {
    this.layoutCache.clear()
  }

  /**
   * サポートされている言語の取得
   */
  public getSupportedLanguages(): string[] {
    return Array.from(this.languageDatabase.keys())
  }

  /**
   * 現在の言語を取得
   */
  public getCurrentLanguage(): string {
    return this.currentLanguage
  }

  /**
   * 言語情報の取得
   */
  public getLanguageInfo(languageCode: string): LanguageInfo | undefined {
    return this.languageDatabase.get(languageCode)
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    if (this.measurementCanvas.parentNode) {
      this.measurementCanvas.parentNode.removeChild(this.measurementCanvas)
    }
    this.layoutCache.clear()
    this.fontLoadPromises.clear()
  }
}

// Vue Composition API用のフック
export function useMultilingualLayout(config: Partial<MultilingualLayoutConfig> = {}) {
  const { ref, onMounted, onUnmounted, computed } = require('vue')
  
  const layoutManager = ref<MultilingualLayoutManager | null>(null)
  const currentLanguage = ref('ja')
  const supportedLanguages = ref<string[]>([])

  onMounted(() => {
    layoutManager.value = new MultilingualLayoutManager(config)
    currentLanguage.value = layoutManager.value.getCurrentLanguage()
    supportedLanguages.value = layoutManager.value.getSupportedLanguages()

    onUnmounted(() => {
      layoutManager.value?.destroy()
    })
  })

  const setLanguage = (languageCode: string) => {
    layoutManager.value?.setLanguage(languageCode)
    currentLanguage.value = languageCode
  }

  const measureText = (text: string, fontSize: number, constraints?: LayoutConstraints) => {
    return layoutManager.value?.measureText(text, fontSize, undefined, constraints)
  }

  const calculateResponsiveTextSize = (
    baseSize: number,
    containerWidth: number,
    text: string,
    constraints?: LayoutConstraints
  ) => {
    return layoutManager.value?.calculateResponsiveTextSize(baseSize, containerWidth, text, constraints)
  }

  const currentLanguageInfo = computed(() => {
    return layoutManager.value?.getLanguageInfo(currentLanguage.value)
  })

  return {
    layoutManager,
    currentLanguage,
    supportedLanguages,
    currentLanguageInfo,
    setLanguage,
    measureText,
    calculateResponsiveTextSize
  }
}