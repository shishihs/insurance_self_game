/**
 * ResponsiveContainer - コンテナクエリ対応の次世代レスポンシブコンテナ
 * 
 * 機能:
 * - CSS Container Queries対応
 * - 要素ベースのレスポンシブ制御
 * - 動的ブレークポイント調整
 * - パフォーマンス最適化
 */

import { type ResponsiveValueMap, viewportManager } from './ViewportManager'

export interface ContainerConfig {
  name?: string
  type?: 'inline-size' | 'block-size' | 'size'
  breakpoints?: Record<string, number>
  fallbackStrategy?: 'viewport' | 'element' | 'parent'
  observeResize?: boolean
  debounceMs?: number
}

export interface ContainerState {
  width: number
  height: number
  breakpoint: string
  canUseContainerQueries: boolean
  isVisible: boolean
  aspectRatio: number
}

export class ResponsiveContainer {
  private readonly element: HTMLElement
  private readonly config: Required<ContainerConfig>
  private resizeObserver: ResizeObserver | null = null
  private intersectionObserver: IntersectionObserver | null = null
  private readonly listeners: Set<(state: ContainerState) => void> = new Set()
  private currentState: ContainerState
  private debounceTimeout: number = 0

  // デフォルトコンテナブレークポイント
  private static readonly defaultBreakpoints = {
    xs: 320,
    sm: 480,
    md: 640,
    lg: 768,
    xl: 1024,
    '2xl': 1280
  }

  constructor(element: HTMLElement, config: ContainerConfig = {}) {
    this.element = element
    this.config = {
      name: config.name || 'responsive-container',
      type: config.type || 'inline-size',
      breakpoints: { ...ResponsiveContainer.defaultBreakpoints, ...config.breakpoints },
      fallbackStrategy: config.fallbackStrategy || 'viewport',
      observeResize: config.observeResize !== false,
      debounceMs: config.debounceMs || 100
    }

    this.currentState = this.calculateState()
    this.setupContainer()
    this.setupObservers()
  }

  /**
   * 現在のコンテナ状態を取得
   */
  public getState(): ContainerState {
    return { ...this.currentState }
  }

  /**
   * 状態変更の監視を開始
   */
  public subscribe(callback: (state: ContainerState) => void): () => void {
    this.listeners.add(callback)
    
    // 初回実行
    callback(this.currentState)
    
    return () => {
      this.listeners.delete(callback)
    }
  }

  /**
   * コンテナブレークポイントのチェック
   */
  public matches(breakpoint: string): boolean {
    return this.currentState.breakpoint === breakpoint
  }

  /**
   * ブレークポイント条件のチェック
   */
  public matchesCondition(condition: string): boolean {
    if (!condition.includes(':')) {
      return this.matches(condition)
    }

    const [bp, operator] = condition.split(':')
    const breakpointValue = this.config.breakpoints[bp]
    
    if (!breakpointValue) return false

    const currentSize = this.config.type === 'block-size' 
      ? this.currentState.height 
      : this.currentState.width

    switch (operator) {
      case 'above':
      case 'min':
        return currentSize >= breakpointValue
      case 'below':
      case 'max':
        return currentSize < breakpointValue
      case 'only':
        return this.matches(bp)
      default:
        return false
    }
  }

  /**
   * レスポンシブ値の取得
   */
  public getValue<T>(values: Record<string, T> & { base?: T }): T | undefined {
    const breakpointOrder = Object.keys(this.config.breakpoints).sort((a, b) => 
      this.config.breakpoints[a] - this.config.breakpoints[b]
    )
    
    const currentBp = this.currentState.breakpoint
    const currentIndex = breakpointOrder.indexOf(currentBp)
    
    // 現在のブレークポイントから下向きに値を探す
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i]
      if (values[bp] !== undefined) {
        return values[bp]
      }
    }
    
    return values.base
  }

  /**
   * CSS変数の設定
   */
  public setCSSVariables(variables: Record<string, string | number>): void {
    Object.entries(variables).forEach(([key, value]) => {
      const cssVar = key.startsWith('--') ? key : `--${key}`
      this.element.style.setProperty(cssVar, String(value))
    })
  }

  /**
   * 条件付きクラスの適用
   */
  public applyConditionalClasses(conditions: Record<string, string | string[]>): void {
    Object.entries(conditions).forEach(([condition, classes]) => {
      const classArray = Array.isArray(classes) ? classes : [classes]
      
      if (this.matchesCondition(condition)) {
        this.element.classList.add(...classArray)
      } else {
        this.element.classList.remove(...classArray)
      }
    })
  }

  /**
   * アスペクト比ベースのレイアウト調整
   */
  public adjustForAspectRatio(ratios: Record<string, { width: number; height: number }>): void {
    const currentRatio = this.currentState.aspectRatio
    let bestMatch = 'default'
    let bestDifference = Infinity

    Object.entries(ratios).forEach(([name, ratio]) => {
      const targetRatio = ratio.width / ratio.height
      const difference = Math.abs(currentRatio - targetRatio)
      
      if (difference < bestDifference) {
        bestDifference = difference
        bestMatch = name
      }
    })

    // 既存のアスペクト比クラスを削除
    Object.keys(ratios).forEach(name => {
      this.element.classList.remove(`aspect-${name}`)
    })
    
    // 最適なアスペクト比クラスを追加
    this.element.classList.add(`aspect-${bestMatch}`)
  }

  /**
   * グリッドレイアウトの動的調整
   */
  public adjustGridLayout(config: {
    minItemWidth: number
    maxColumns?: number
    gap?: number
    aspectRatio?: number
  }): void {
    const { minItemWidth, maxColumns = 12, gap = 16, aspectRatio } = config
    const containerWidth = this.currentState.width - (gap * 2)
    
    // 最適な列数を計算
    const maxPossibleColumns = Math.floor(containerWidth / (minItemWidth + gap))
    const columns = Math.min(maxPossibleColumns, maxColumns)
    
    // CSS Grid設定
    this.setCSSVariables({
      'grid-columns': columns,
      'grid-gap': `${gap}px`,
      'grid-item-min-width': `${minItemWidth}px`
    })
    
    if (aspectRatio) {
      const itemHeight = (containerWidth - gap * (columns - 1)) / columns / aspectRatio
      this.setCSSVariables({
        'grid-item-height': `${itemHeight}px`
      })
    }
  }

  /**
   * テキストサイズの動的調整
   */
  public adjustTextScale(config: {
    baseSize: number
    scaleRatio?: number
    minSize?: number
    maxSize?: number
  }): void {
    const { baseSize, scaleRatio = 1.2, minSize = 12, maxSize = 48 } = config
    const containerWidth = this.currentState.width
    
    // コンテナ幅に基づくスケール計算
    const viewportScale = Math.min(containerWidth / 320, 2) // 320pxを基準に最大2倍
    const scaledSize = baseSize * scaleRatio**Math.log(viewportScale)
    
    const finalSize = Math.max(minSize, Math.min(maxSize, scaledSize))
    
    this.setCSSVariables({
      'text-scale': finalSize / baseSize,
      'font-size-scaled': `${finalSize}px`
    })
  }

  private setupContainer(): void {
    // コンテナクエリのサポート確認
    const supportsContainerQueries = 'container' in document.documentElement.style

    if (supportsContainerQueries) {
      // CSS Container Queriesを設定
      this.element.style.containerName = this.config.name
      this.element.style.containerType = this.config.type
    } else {
      // フォールバック戦略を適用
      this.setupFallback()
    }

    // 初期CSS変数設定
    this.updateCSSVariables()
  }

  private setupFallback(): void {
    switch (this.config.fallbackStrategy) {
      case 'viewport':
        // ビューポートベースのフォールバック
        this.setupViewportFallback()
        break
      case 'element':
        // 要素サイズベースのフォールバック
        this.setupElementFallback()
        break
      case 'parent':
        // 親要素ベースのフォールバック
        this.setupParentFallback()
        break
    }
  }

  private setupViewportFallback(): void {
    const unsubscribe = viewportManager.subscribe((viewportInfo) => {
      // ビューポート情報をコンテナ情報として使用
      this.currentState = {
        ...this.currentState,
        width: viewportInfo.width,
        height: viewportInfo.height,
        breakpoint: this.getBreakpointFromWidth(viewportInfo.width)
      }
      this.notifyListeners()
    })

    // クリーンアップの準備
    this.cleanupCallbacks.push(unsubscribe)
  }

  private setupElementFallback(): void {
    // ResizeObserverによる要素サイズ監視
    if (this.config.observeResize && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.handleResize(entries)
      })
      this.resizeObserver.observe(this.element)
    }
  }

  private setupParentFallback(): void {
    const parent = this.element.parentElement
    if (parent && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateCurrentState()
      })
      this.resizeObserver.observe(parent)
    }
  }

  private setupObservers(): void {
    // ResizeObserver
    if (this.config.observeResize && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver((entries) => {
        this.handleResize(entries)
      })
      this.resizeObserver.observe(this.element)
    }

    // IntersectionObserver（可視性監視）
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        const isVisible = entries[0]?.isIntersecting || false
        if (this.currentState.isVisible !== isVisible) {
          this.currentState.isVisible = isVisible
          this.notifyListeners()
        }
      })
      this.intersectionObserver.observe(this.element)
    }
  }

  private handleResize(entries: ResizeObserverEntry[]): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.debounceTimeout = setTimeout(() => {
      this.updateCurrentState()
    }, this.config.debounceMs)
  }

  private calculateState(): ContainerState {
    const rect = this.element.getBoundingClientRect()
    const width = rect.width || this.element.offsetWidth
    const height = rect.height || this.element.offsetHeight
    const aspectRatio = width / height || 1

    return {
      width,
      height,
      breakpoint: this.getBreakpointFromWidth(width),
      canUseContainerQueries: 'container' in document.documentElement.style,
      isVisible: true, // IntersectionObserverで後から更新
      aspectRatio
    }
  }

  private getBreakpointFromWidth(width: number): string {
    const breakpoints = Object.entries(this.config.breakpoints)
      .sort(([, a], [, b]) => a - b)

    for (let i = breakpoints.length - 1; i >= 0; i--) {
      const [name, minWidth] = breakpoints[i]
      if (width >= minWidth) {
        return name
      }
    }

    return Object.keys(this.config.breakpoints)[0] || 'xs'
  }

  private updateCurrentState(): void {
    const oldState = this.currentState
    this.currentState = this.calculateState()
    this.updateCSSVariables()

    // 重要な変更があった場合のみ通知
    if (this.hasSignificantChange(oldState, this.currentState)) {
      this.notifyListeners()
    }
  }

  private hasSignificantChange(oldState: ContainerState, newState: ContainerState): boolean {
    return (
      oldState.breakpoint !== newState.breakpoint ||
      Math.abs(oldState.width - newState.width) > 10 ||
      Math.abs(oldState.height - newState.height) > 10 ||
      oldState.isVisible !== newState.isVisible
    )
  }

  private updateCSSVariables(): void {
    this.setCSSVariables({
      'container-width': `${this.currentState.width}px`,
      'container-height': `${this.currentState.height}px`,
      'container-breakpoint': this.currentState.breakpoint,
      'container-aspect-ratio': this.currentState.aspectRatio,
      'container-can-query': this.currentState.canUseContainerQueries ? '1' : '0'
    })
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentState)
      } catch (error) {
        console.error('ResponsiveContainer listener error:', error)
      }
    })
  }

  private readonly cleanupCallbacks: (() => void)[] = []

  /**
   * クリーンアップ
   */
  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }

    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect()
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    this.cleanupCallbacks.forEach(cleanup => { cleanup(); })
    this.listeners.clear()
  }
}

// Vue Composition API用のフック
export function useResponsiveContainer(
  elementRef: { value: HTMLElement | null },
  config: ContainerConfig = {}
) {
  const { ref, onMounted, onUnmounted, computed } = require('vue')
  
  const containerState = ref<ContainerState | null>(null)
  let container: ResponsiveContainer | null = null

  onMounted(() => {
    if (elementRef.value) {
      container = new ResponsiveContainer(elementRef.value, config)
      
      const unsubscribe = container.subscribe((state) => {
        containerState.value = state
      })

      onUnmounted(() => {
        unsubscribe()
        container?.destroy()
      })
    }
  })

  const matches = (condition: string) => {
    return container?.matchesCondition(condition) || false
  }

  const getValue = <T>(values: Record<string, T> & { base?: T }): T | undefined => {
    return container?.getValue(values)
  }

  return {
    containerState,
    matches,
    getValue,
    container: computed(() => container)
  }
}