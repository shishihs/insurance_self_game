/**
 * Responsive Utils Index - 次世代レスポンシブデザインシステムの統合エクスポート
 * 
 * このファイルは、プロジェクトのすべてのレスポンシブデザイン機能を統合し、
 * 一元的なAPIを提供します。
 */

// Core responsive managers
export { ViewportManager, viewportManager, useViewport } from './ViewportManager'
export { ResponsiveContainer, useResponsiveContainer } from './ResponsiveContainer'
export { MultilingualLayoutManager, useMultilingualLayout } from './MultilingualLayoutManager'

// Type definitions
export type {
  ViewportInfo,
  ResponsiveBreakpoints,
  ResponsiveValueMap
} from './ViewportManager'

export type {
  ContainerConfig,
  ContainerState
} from './ResponsiveContainer'

export type {
  LanguageInfo,
  LayoutConstraints,
  TextMetrics,
  MultilingualLayoutConfig
} from './MultilingualLayoutManager'

/**
 * 高DPI・Retinaディスプレイ対応ユーティリティ
 */
export class HighDPIManager {
  private static instance: HighDPIManager | null = null
  private currentDPI: number = 1
  private readonly observers: Set<(dpi: number) => void> = new Set()

  private constructor() {
    this.currentDPI = window.devicePixelRatio || 1
    this.setupDPIMonitoring()
  }

  public static getInstance(): HighDPIManager {
    if (!HighDPIManager.instance) {
      HighDPIManager.instance = new HighDPIManager()
    }
    return HighDPIManager.instance
  }

  /**
   * DPI変更の監視設定
   */
  private setupDPIMonitoring(): void {
    // メディアクエリでDPI変更を監視
    const mediaQuery = window.matchMedia(`(resolution: ${this.currentDPI}dppx)`)
    
    const handleDPIChange = () => {
      const newDPI = window.devicePixelRatio || 1
      if (newDPI !== this.currentDPI) {
        this.currentDPI = newDPI
        this.notifyObservers()
        this.updateGlobalDPISettings()
      }
    }

    mediaQuery.addEventListener('change', handleDPIChange)
    
    // 定期的なチェック（フォールバック）
    setInterval(() => {
      const newDPI = window.devicePixelRatio || 1
      if (newDPI !== this.currentDPI) {
        this.currentDPI = newDPI
        this.notifyObservers()
        this.updateGlobalDPISettings()
      }
    }, 1000)
  }

  /**
   * DPI変更の通知
   */
  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.currentDPI)
      } catch (error) {
        console.error('DPI observer error:', error)
      }
    })
  }

  /**
   * グローバルDPI設定の更新
   */
  private updateGlobalDPISettings(): void {
    document.documentElement.style.setProperty('--device-pixel-ratio', String(this.currentDPI))
    document.documentElement.style.setProperty('--dpi-scale', String(Math.min(this.currentDPI, 3)))
    
    // DPIクラスの設定
    document.documentElement.classList.remove('dpi-1x', 'dpi-2x', 'dpi-3x', 'dpi-high')
    
    if (this.currentDPI >= 3) {
      document.documentElement.classList.add('dpi-3x', 'dpi-high')
    } else if (this.currentDPI >= 2) {
      document.documentElement.classList.add('dpi-2x', 'dpi-high')  
    } else {
      document.documentElement.classList.add('dpi-1x')
    }
  }

  /**
   * 最適な画像解像度の取得
   */
  public getOptimalImageResolution(): '1x' | '2x' | '3x' {
    if (this.currentDPI >= 3) return '3x'
    if (this.currentDPI >= 2) return '2x'
    return '1x'
  }

  /**
   * DPIスケール値の取得
   */
  public getDPIScale(): number {
    return Math.min(this.currentDPI, 3)
  }

  /**
   * 物理ピクセル単位でのサイズ計算
   */
  public toPhysicalPixels(logicalPixels: number): number {
    return logicalPixels * this.currentDPI
  }

  /**
   * 論理ピクセル単位でのサイズ計算
   */
  public toLogicalPixels(physicalPixels: number): number {
    return physicalPixels / this.currentDPI
  }

  /**
   * 高DPI対応の描画コンテキスト設定
   */
  public setupHighDPICanvas(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext('2d')!
    const rect = canvas.getBoundingClientRect()
    
    // 物理ピクセルサイズを設定
    canvas.width = rect.width * this.currentDPI
    canvas.height = rect.height * this.currentDPI
    
    // CSS表示サイズを維持
    canvas.style.width = `${rect.width  }px`
    canvas.style.height = `${rect.height  }px`
    
    // コンテキストをスケール
    ctx.scale(this.currentDPI, this.currentDPI)
    
    return ctx
  }

  /**
   * DPI変更の監視開始
   */
  public subscribe(callback: (dpi: number) => void): () => void {
    this.observers.add(callback)
    
    // 初回実行
    callback(this.currentDPI)
    
    return () => {
      this.observers.delete(callback)
    }
  }

  /**
   * 現在のDPI値を取得
   */
  public getCurrentDPI(): number {
    return this.currentDPI
  }

  /**
   * 高DPIかどうかの判定
   */
  public isHighDPI(): boolean {
    return this.currentDPI > 1.5
  }
}

/**
 * 統合レスポンシブマネージャー
 * すべてのレスポンシブ機能を一元管理
 */
export class UniversalResponsiveSystem {
  private readonly viewportManager: ViewportManager
  private readonly layoutManager: MultilingualLayoutManager
  private readonly dpiManager: HighDPIManager
  private readonly containerObservers: Map<string, ResponsiveContainer> = new Map()
  private isInitialized = false

  constructor(config: {
    viewportConfig?: any
    layoutConfig?: any
    enableDPIOptimization?: boolean
  } = {}) {
    this.viewportManager = ViewportManager.getInstance()
    this.layoutManager = new MultilingualLayoutManager(config.layoutConfig)
    this.dpiManager = HighDPIManager.getInstance()
  }

  /**
   * システム全体の初期化
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      // グローバルCSS変数の設定
      this.setupGlobalCSSVariables()
      
      // レスポンシブスタイルの注入
      this.injectResponsiveStyles()
      
      // DPI最適化の開始
      this.setupDPIOptimization()
      
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize responsive system:', error)
    }
  }

  /**
   * グローバルCSS変数の設定
   */
  private setupGlobalCSSVariables(): void {
    const viewportInfo = this.viewportManager.getViewportInfo()
    const root = document.documentElement
    
    // ビューポート情報
    root.style.setProperty('--viewport-width', `${viewportInfo.width}px`)
    root.style.setProperty('--viewport-height', `${viewportInfo.height}px`)
    root.style.setProperty('--device-type', viewportInfo.deviceType)
    root.style.setProperty('--orientation', viewportInfo.orientation)
    
    // セーフエリア
    const { safeAreaInsets } = viewportInfo
    root.style.setProperty('--safe-area-top', `${safeAreaInsets.top}px`)
    root.style.setProperty('--safe-area-right', `${safeAreaInsets.right}px`)
    root.style.setProperty('--safe-area-bottom', `${safeAreaInsets.bottom}px`)
    root.style.setProperty('--safe-area-left', `${safeAreaInsets.left}px`)
    
    // DPI情報
    root.style.setProperty('--device-pixel-ratio', String(viewportInfo.devicePixelRatio))
  }

  /**
   * レスポンシブスタイルの注入
   */
  private injectResponsiveStyles(): void {
    const styles = `
      /* レスポンシブグリッドシステム */
      .responsive-grid {
        display: grid;
        gap: var(--grid-gap, 1rem);
        grid-template-columns: repeat(var(--grid-columns, auto-fit), minmax(var(--grid-min-width, 200px), 1fr));
      }
      
      /* 適応型テキストサイズ */
      .adaptive-text {
        font-size: clamp(var(--text-min, 0.875rem), var(--text-preferred, 1rem), var(--text-max, 1.25rem));
        line-height: var(--line-height-adaptive, 1.5);
      }
      
      /* セーフエリア対応 */
      .safe-area-padding {
        padding-top: env(safe-area-inset-top);
        padding-right: env(safe-area-inset-right);
        padding-bottom: env(safe-area-inset-bottom);
        padding-left: env(safe-area-inset-left);
      }
      
      /* 高DPI対応 */
      .high-dpi-border {
        border-width: calc(1px / var(--device-pixel-ratio, 1));
      }
      
      /* タッチ最適化 */
      .touch-target {
        min-width: var(--touch-target-min, 44px);
        min-height: var(--touch-target-min, 44px);
        position: relative;
      }
      
      .touch-target::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 100%;
        min-width: var(--touch-target-min, 44px);
        min-height: var(--touch-target-min, 44px);
      }
      
      /* 異なる画面比率への対応 */
      .aspect-ratio-adaptive {
        aspect-ratio: var(--adaptive-aspect-ratio, 16/9);
      }
      
      @media (orientation: portrait) {
        .aspect-ratio-adaptive {
          aspect-ratio: var(--adaptive-aspect-ratio-portrait, 9/16);
        }
      }
      
      /* コンテナクエリ対応 */
      @container (max-width: 400px) {
        .container-responsive {
          font-size: 0.875rem;
          padding: 0.5rem;
        }
      }
      
      @container (min-width: 800px) {
        .container-responsive {
          font-size: 1.125rem;
          padding: 1.5rem;
        }
      }
    `
    
    const styleElement = document.createElement('style')
    styleElement.textContent = styles
    document.head.appendChild(styleElement)
  }

  /**
   * DPI最適化の設定
   */
  private setupDPIOptimization(): void {
    this.dpiManager.subscribe((dpi) => {
      // 画像の最適化
      this.optimizeImagesForDPI(dpi)
      
      // フォントの最適化
      this.optimizeFontsForDPI(dpi)
      
      // UIコンポーネントの最適化
      this.optimizeUIForDPI(dpi)
    })
  }

  /**
   * DPI対応画像最適化
   */
  private optimizeImagesForDPI(dpi: number): void {
    const images = document.querySelectorAll('img[data-responsive]')
    const resolution = this.dpiManager.getOptimalImageResolution()
    
    images.forEach((img) => {
      const baseUrl = img.getAttribute('data-src-base')
      if (baseUrl) {
        const optimizedUrl = `${baseUrl}_${resolution}.webp`
        img.setAttribute('src', optimizedUrl)
      }
    })
  }

  /**
   * DPI対応フォント最適化
   */
  private optimizeFontsForDPI(dpi: number): void {
    const root = document.documentElement
    
    if (dpi >= 2) {
      // 高DPIでは少し細いフォントウェイトを使用
      root.style.setProperty('--font-weight-adjustment', '-100')
      root.style.setProperty('--letter-spacing-adjustment', '0.01em')
    } else {
      root.style.setProperty('--font-weight-adjustment', '0')
      root.style.setProperty('--letter-spacing-adjustment', '0')
    }
  }

  /**
   * DPI対応UI最適化
   */
  private optimizeUIForDPI(dpi: number): void {
    const root = document.documentElement
    
    // 境界線の調整
    const borderWidth = Math.max(0.5, 1 / dpi)
    root.style.setProperty('--border-width-optimized', `${borderWidth}px`)
    
    // シャドウの調整
    const shadowScale = Math.min(dpi, 2)
    root.style.setProperty('--shadow-scale', String(shadowScale))
  }

  /**
   * 要素のコンテナ監視開始
   */
  public observeContainer(element: HTMLElement, id: string, config?: any): ResponsiveContainer {
    const container = new ResponsiveContainer(element, config)
    this.containerObservers.set(id, container)
    return container
  }

  /**
   * コンテナ監視の停止
   */
  public stopObservingContainer(id: string): void {
    const container = this.containerObservers.get(id)
    if (container) {
      container.destroy()
      this.containerObservers.delete(id)
    }
  }

  /**
   * レスポンシブ値の計算
   */
  public calculateResponsiveValue<T>(
    values: ResponsiveValueMap<T>,
    element?: HTMLElement
  ): T | undefined {
    if (element) {
      // 要素固有のコンテナサイズを考慮
      const container = this.containerObservers.get(element.id)
      if (container) {
        return container.getValue(values as any)
      }
    }
    
    // ビューポートベースの計算
    return this.viewportManager.getValue(values)
  }

  /**
   * アダプティブレイアウトの適用
   */
  public applyAdaptiveLayout(
    element: HTMLElement,
    config: {
      gridMinWidth?: number
      aspectRatio?: number
      textScaling?: boolean
      touchOptimization?: boolean
    }
  ): void {
    const { gridMinWidth = 200, aspectRatio, textScaling = true, touchOptimization = true } = config
    
    // グリッドレイアウト
    if (gridMinWidth) {
      element.style.setProperty('--grid-min-width', `${gridMinWidth}px`)
      element.classList.add('responsive-grid')
    }
    
    // アスペクト比
    if (aspectRatio) {
      element.style.setProperty('--adaptive-aspect-ratio', String(aspectRatio))
      element.classList.add('aspect-ratio-adaptive')
    }
    
    // テキストスケーリング
    if (textScaling) {
      element.classList.add('adaptive-text')
      
      const containerWidth = element.offsetWidth
      const textSize = this.layoutManager.calculateResponsiveTextSize(
        16,
        containerWidth,
        element.textContent || ''
      )
      
      if (textSize) {
        element.style.setProperty('--text-preferred', `${textSize.fontSize}px`)
        element.style.setProperty('--line-height-adaptive', String(textSize.lineHeight / textSize.fontSize))
      }
    }
    
    // タッチ最適化
    if (touchOptimization) {
      const interactiveElements = element.querySelectorAll('button, a, input, select')
      interactiveElements.forEach(el => {
        el.classList.add('touch-target')
      })
    }
  }

  /**
   * 現在のレスポンシブ状態を取得
   */
  public getResponsiveState(): {
    viewport: ViewportInfo
    dpi: number
    language: string
    containers: string[]
  } {
    return {
      viewport: this.viewportManager.getViewportInfo(),
      dpi: this.dpiManager.getCurrentDPI(),
      language: this.layoutManager.getCurrentLanguage(),
      containers: Array.from(this.containerObservers.keys())
    }
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    this.containerObservers.forEach(container => container.destroy())
    this.containerObservers.clear()
    this.layoutManager.destroy()
    this.isInitialized = false
  }
}

/**
 * Vue Composition API用の統合フック
 */
export function useUniversalResponsive(config: any = {}) {
  const { ref, onMounted, onUnmounted } = require('vue')
  
  const responsiveSystem = ref<UniversalResponsiveSystem | null>(null)
  const responsiveState = ref<any>(null)
  const isInitialized = ref(false)

  onMounted(async () => {
    responsiveSystem.value = new UniversalResponsiveSystem(config)
    await responsiveSystem.value.initialize()
    isInitialized.value = true
    responsiveState.value = responsiveSystem.value.getResponsiveState()

    onUnmounted(() => {
      responsiveSystem.value?.destroy()
    })
  })

  const calculateValue = <T>(values: ResponsiveValueMap<T>, element?: HTMLElement): T | undefined => {
    return responsiveSystem.value?.calculateResponsiveValue(values, element)
  }

  const applyLayout = (element: HTMLElement, config: any) => {
    responsiveSystem.value?.applyAdaptiveLayout(element, config)
  }

  const observeContainer = (element: HTMLElement, id: string, config?: any) => {
    return responsiveSystem.value?.observeContainer(element, id, config)
  }

  return {
    responsiveSystem,
    responsiveState,
    isInitialized,
    calculateValue,
    applyLayout,
    observeContainer
  }
}

// シングルトンインスタンス
export const highDPIManager = HighDPIManager.getInstance()

// デフォルトエクスポート
export default {
  ViewportManager,
  ResponsiveContainer,
  MultilingualLayoutManager,
  HighDPIManager,
  UniversalResponsiveSystem,
  useUniversalResponsive,
  highDPIManager
}