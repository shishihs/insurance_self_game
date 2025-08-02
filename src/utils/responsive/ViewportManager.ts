/**
 * ViewportManager - 次世代レスポンシブデザイン用ビューポート管理
 * 
 * 機能:
 * - 高DPI・Retinaディスプレイ対応
 * - 画面回転への動的対応
 * - 異なる画面比率への適応
 * - コンテナクエリ対応
 * - セーフエリア対応
 */

export interface ViewportInfo {
  width: number
  height: number
  devicePixelRatio: number
  orientation: 'portrait' | 'landscape'
  aspectRatio: number
  safeAreaInsets: {
    top: number
    right: number
    bottom: number
    left: number
  }
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  deviceType: 'mobile' | 'tablet' | 'desktop'
  hasTouch: boolean
  prefersReducedMotion: boolean
  colorScheme: 'light' | 'dark'
  contrast: 'normal' | 'high'
}

export interface ResponsiveBreakpoints {
  xs: number    // ~479px  (スマートフォン縦)
  sm: number    // ~639px  (スマートフォン横・小タブレット)
  md: number    // ~767px  (タブレット縦)
  lg: number    // ~1023px (タブレット横・小デスクトップ)
  xl: number    // ~1279px (デスクトップ)
  '2xl': number // 1280px+ (大型デスクトップ)
}

export type ResponsiveValueMap<T> = {
  [K in keyof ResponsiveBreakpoints]?: T
} & { base?: T }

export class ViewportManager {
  private static instance: ViewportManager | null = null
  private readonly listeners: Set<(info: ViewportInfo) => void> = new Set()
  private currentInfo: ViewportInfo
  private resizeObserver: ResizeObserver | null = null
  private readonly mediaQueryLists: Map<string, MediaQueryList> = new Map()

  // デフォルトブレークポイント設定
  private breakpoints: ResponsiveBreakpoints = {
    xs: 479,
    sm: 639,
    md: 767,
    lg: 1023,
    xl: 1279,
    '2xl': 1920
  }

  private constructor() {
    this.currentInfo = this.calculateViewportInfo()
    this.setupEventListeners()
    this.setupMediaQueries()
    this.setupCSSCustomProperties()
  }

  public static getInstance(): ViewportManager {
    if (!ViewportManager.instance) {
      ViewportManager.instance = new ViewportManager()
    }
    return ViewportManager.instance
  }

  /**
   * 現在のビューポート情報を取得
   */
  public getViewportInfo(): ViewportInfo {
    return { ...this.currentInfo }
  }

  /**
   * ブレークポイントを設定
   */
  public setBreakpoints(breakpoints: Partial<ResponsiveBreakpoints>): void {
    this.breakpoints = { ...this.breakpoints, ...breakpoints }
    this.updateCurrentInfo()
  }

  /**
   * ビューポート変更の監視を開始
   */
  public subscribe(callback: (info: ViewportInfo) => void): () => void {
    this.listeners.add(callback)
    
    // 初回実行
    callback(this.currentInfo)
    
    // アンサブスクライブ関数を返す
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * 現在のブレークポイントが指定した条件を満たすかチェック
   */
  public matches(breakpoint: keyof ResponsiveBreakpoints | string): boolean {
    if (typeof breakpoint === 'string' && breakpoint.includes(':')) {
      // "md:above", "lg:below", "sm:only" などの条件
      const [bp, condition] = breakpoint.split(':')
      const bpValue = this.breakpoints[bp as keyof ResponsiveBreakpoints]
      
      if (!bpValue) return false
      
      switch (condition) {
        case 'above':
          return this.currentInfo.width > bpValue
        case 'below':
          return this.currentInfo.width <= bpValue
        case 'only':
          return this.getCurrentBreakpoint() === bp
        default:
          return false
      }
    }
    
    return this.currentInfo.breakpoint === breakpoint
  }

  /**
   * レスポンシブ値から現在の値を取得
   */
  public getValue<T>(values: ResponsiveValueMap<T>): T | undefined {
    const breakpoint = this.getCurrentBreakpoint()
    const breakpointOrder: (keyof ResponsiveBreakpoints)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
    
    // 現在のブレークポイントから下向きに値を探す
    const currentIndex = breakpointOrder.indexOf(breakpoint)
    
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i]
      if (values[bp] !== undefined) {
        return values[bp]
      }
    }
    
    // baseがあれば返す
    return values.base
  }

  /**
   * 高DPI対応の画像URLを生成
   */
  public getOptimizedImageUrl(baseUrl: string, options: {
    webp?: boolean
    avif?: boolean
    sizes?: string[]
  } = {}): string {
    const dpi = this.currentInfo.devicePixelRatio
    const { webp = true, avif = true, sizes = ['1x', '2x', '3x'] } = options
    
    // デバイスに適した解像度を選択
    const targetDPI = dpi >= 3 ? '3x' : dpi >= 2 ? '2x' : '1x'
    
    if (!sizes.includes(targetDPI)) {
      return baseUrl
    }
    
    // 最新フォーマット対応
    const supportsAvif = 'avif' in new Image()
    const supportsWebp = 'webp' in new Image()
    
    let format = ''
    if (avif && supportsAvif) {
      format = '.avif'
    } else if (webp && supportsWebp) {
      format = '.webp'
    }
    
    // URLを変換
    const extension = baseUrl.split('.').pop()
    const baseName = baseUrl.replace(`.${extension}`, '')
    
    return `${baseName}_${targetDPI}${format || `.${extension}`}`
  }

  /**
   * コンテナクエリ用のサイズ情報を取得
   */
  public getContainerInfo(element: HTMLElement): {
    width: number
    height: number
    breakpoint: keyof ResponsiveBreakpoints
    canUseContainer: boolean
  } {
    const rect = element.getBoundingClientRect()
    const breakpoint = this.getBreakpointFromWidth(rect.width)
    
    return {
      width: rect.width,
      height: rect.height,
      breakpoint,
      canUseContainer: 'container' in document.documentElement.style
    }
  }

  /**
   * セーフエリアを考慮したサイズ計算
   */
  public getSafeAreaDimensions(): {
    safeWidth: number
    safeHeight: number
    availableWidth: number
    availableHeight: number
  } {
    const { safeAreaInsets, width, height } = this.currentInfo
    
    return {
      safeWidth: width - safeAreaInsets.left - safeAreaInsets.right,
      safeHeight: height - safeAreaInsets.top - safeAreaInsets.bottom,
      availableWidth: width,
      availableHeight: height
    }
  }

  /**
   * タッチデバイス用の最適なタッチターゲットサイズを計算
   */
  public getOptimalTouchTargetSize(): {
    minimum: number
    comfortable: number
    large: number
  } {
    const dpi = this.currentInfo.devicePixelRatio
    const isMobile = this.currentInfo.deviceType === 'mobile'
    
    // 物理サイズを基準にした計算（約9mm以上推奨）
    const baseSizePx = 44 // iOS/Android推奨サイズ
    
    return {
      minimum: Math.max(baseSizePx, 44 * dpi),
      comfortable: Math.max(baseSizePx * 1.3, 56 * dpi),
      large: Math.max(baseSizePx * 1.6, 72 * dpi)
    }
  }

  private calculateViewportInfo(): ViewportInfo {
    const width = window.innerWidth
    const height = window.innerHeight
    const devicePixelRatio = window.devicePixelRatio || 1
    const aspectRatio = width / height
    const orientation = width > height ? 'landscape' : 'portrait'
    
    // セーフエリアの取得
    const safeAreaInsets = {
      top: this.getCSSEnvValue('safe-area-inset-top'),
      right: this.getCSSEnvValue('safe-area-inset-right'),
      bottom: this.getCSSEnvValue('safe-area-inset-bottom'),
      left: this.getCSSEnvValue('safe-area-inset-left')
    }
    
    const breakpoint = this.getBreakpointFromWidth(width)
    const deviceType = this.getDeviceType(width, devicePixelRatio)
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // プリファレンスの取得
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const contrast = window.matchMedia('(prefers-contrast: high)').matches ? 'high' : 'normal'
    
    return {
      width,
      height,
      devicePixelRatio,
      orientation,
      aspectRatio,
      safeAreaInsets,
      breakpoint,
      deviceType,
      hasTouch,
      prefersReducedMotion,
      colorScheme,
      contrast
    }
  }

  private getCurrentBreakpoint(): keyof ResponsiveBreakpoints {
    return this.getBreakpointFromWidth(this.currentInfo.width)
  }

  private getBreakpointFromWidth(width: number): keyof ResponsiveBreakpoints {
    if (width <= this.breakpoints.xs) return 'xs'
    if (width <= this.breakpoints.sm) return 'sm'
    if (width <= this.breakpoints.md) return 'md'
    if (width <= this.breakpoints.lg) return 'lg'
    if (width <= this.breakpoints.xl) return 'xl'
    return '2xl'
  }

  private getDeviceType(width: number, dpi: number): 'mobile' | 'tablet' | 'desktop' {
    if (width <= this.breakpoints.sm) return 'mobile'
    if (width <= this.breakpoints.lg) return 'tablet'
    return 'desktop'
  }

  private getCSSEnvValue(property: string): number {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`env(${property})`)
    return value ? parseInt(value, 10) : 0
  }

  private setupEventListeners(): void {
    // リサイズの監視
    window.addEventListener('resize', this.handleResize.bind(this), { passive: true })
    
    // 向き変更の監視
    window.addEventListener('orientationchange', this.handleOrientationChange.bind(this), { passive: true })
    
    // ResizeObserverによるより精密な監視
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize.bind(this))
      this.resizeObserver.observe(document.documentElement)
    }
  }

  private setupMediaQueries(): void {
    // 各種メディアクエリの監視
    const queries = [
      '(prefers-reduced-motion: reduce)',
      '(prefers-color-scheme: dark)',
      '(prefers-contrast: high)',
      '(orientation: portrait)',
      '(orientation: landscape)'
    ]
    
    queries.forEach(query => {
      const mql = window.matchMedia(query)
      this.mediaQueryLists.set(query, mql)
      mql.addEventListener('change', this.handleMediaQueryChange.bind(this))
    })
  }

  private setupCSSCustomProperties(): void {
    this.updateCSSCustomProperties()
  }

  private updateCSSCustomProperties(): void {
    const root = document.documentElement
    const info = this.currentInfo
    const touchTargets = this.getOptimalTouchTargetSize()
    const safeDimensions = this.getSafeAreaDimensions()
    
    // ビューポート情報
    root.style.setProperty('--viewport-width', `${info.width}px`)
    root.style.setProperty('--viewport-height', `${info.height}px`)
    root.style.setProperty('--device-pixel-ratio', String(info.devicePixelRatio))
    root.style.setProperty('--aspect-ratio', String(info.aspectRatio))
    
    // セーフエリア
    root.style.setProperty('--safe-area-width', `${safeDimensions.safeWidth}px`)
    root.style.setProperty('--safe-area-height', `${safeDimensions.safeHeight}px`)
    
    // タッチターゲット
    root.style.setProperty('--touch-target-min', `${touchTargets.minimum}px`)
    root.style.setProperty('--touch-target-comfortable', `${touchTargets.comfortable}px`)
    root.style.setProperty('--touch-target-large', `${touchTargets.large}px`)
    
    // ブレークポイント情報
    root.style.setProperty('--current-breakpoint', info.breakpoint)
    root.style.setProperty('--device-type', info.deviceType)
    
    // デバイス特性
    root.style.setProperty('--has-touch', info.hasTouch ? '1' : '0')
    root.style.setProperty('--prefers-reduced-motion', info.prefersReducedMotion ? '1' : '0')
  }

  private handleResize(): void {
    // デバウンス処理
    clearTimeout(this.resizeTimeout)
    this.resizeTimeout = setTimeout(() => {
      this.updateCurrentInfo()
    }, 100)
  }
  
  private resizeTimeout: number = 0

  private handleOrientationChange(): void {
    // 向き変更後の遅延実行（iOS対応）
    setTimeout(() => {
      this.updateCurrentInfo()
    }, 100)
  }

  private handleMediaQueryChange(): void {
    this.updateCurrentInfo()
  }

  private updateCurrentInfo(): void {
    const oldInfo = this.currentInfo
    this.currentInfo = this.calculateViewportInfo()
    this.updateCSSCustomProperties()
    
    // 変更があった場合のみ通知
    if (this.hasSignificantChange(oldInfo, this.currentInfo)) {
      this.notifyListeners()
    }
  }

  private hasSignificantChange(oldInfo: ViewportInfo, newInfo: ViewportInfo): boolean {
    return (
      oldInfo.breakpoint !== newInfo.breakpoint ||
      oldInfo.orientation !== newInfo.orientation ||
      oldInfo.deviceType !== newInfo.deviceType ||
      Math.abs(oldInfo.width - newInfo.width) > 50 ||
      Math.abs(oldInfo.height - newInfo.height) > 50 ||
      oldInfo.prefersReducedMotion !== newInfo.prefersReducedMotion ||
      oldInfo.colorScheme !== newInfo.colorScheme ||
      oldInfo.contrast !== newInfo.contrast
    )
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentInfo)
      } catch (error) {
        console.error('ViewportManager listener error:', error)
      }
    })
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    window.removeEventListener('resize', this.handleResize.bind(this))
    window.removeEventListener('orientationchange', this.handleOrientationChange.bind(this))
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
    
    this.mediaQueryLists.forEach(mql => {
      mql.removeEventListener('change', this.handleMediaQueryChange.bind(this))
    })
    
    this.listeners.clear()
    ViewportManager.instance = null
  }
}

// シングルトンインスタンスをエクスポート
export const viewportManager = ViewportManager.getInstance()

// Vue Composition API用のフック
export function useViewport() {
  const { ref, onMounted, onUnmounted } = require('vue')
  
  const viewportInfo = ref<ViewportInfo>(viewportManager.getViewportInfo())
  let unsubscribe: (() => void) | null = null
  
  onMounted(() => {
    unsubscribe = viewportManager.subscribe((info) => {
      viewportInfo.value = info
    })
  })
  
  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe()
    }
  })
  
  return {
    viewportInfo,
    matches: viewportManager.matches.bind(viewportManager),
    getValue: viewportManager.getValue.bind(viewportManager)
  }
}