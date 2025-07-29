/**
 * モバイルパフォーマンス最適化ユーティリティ
 * 
 * 機能:
 * - デバイス性能の検出と適応
 * - レンダリング最適化
 * - メモリ管理
 * - バッテリー状態の監視
 * - フレームレート調整
 */

export interface DeviceCapabilities {
  memory: number
  cores: number
  connectionType: string
  isLowEnd: boolean
  batteryLevel?: number
  isCharging?: boolean
  reduceMotion: boolean
  darkMode: boolean
}

export interface PerformanceMetrics {
  fps: number
  memoryUsage: number
  renderTime: number
  domNodes: number
  timestamp: number
}

export type PerformanceLevel = 'low' | 'medium' | 'high'

class MobilePerformanceManager {
  private capabilities: DeviceCapabilities
  private performanceLevel: PerformanceLevel = 'medium'
  private metrics: PerformanceMetrics[] = []
  private frameCounter = 0
  private lastFrameTime = 0
  private animationFrame: number | null = null
  private metricsCallback: ((metrics: PerformanceMetrics) => void) | null = null
  private resizeObserver: ResizeObserver | null = null

  constructor() {
    this.capabilities = this.detectDeviceCapabilities()
    this.performanceLevel = this.calculatePerformanceLevel()
    this.setupPerformanceMonitoring()
    this.setupBatteryMonitoring()
    this.setupMemoryWarnings()
  }

  /**
   * デバイス性能の検出
   */
  private detectDeviceCapabilities(): DeviceCapabilities {
    const memory = (navigator as any).deviceMemory || 4
    const cores = navigator.hardwareConcurrency || 4
    const connection = (navigator as any).connection || {}
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

    return {
      memory,
      cores,
      connectionType: connection.effectiveType || 'unknown',
      isLowEnd: memory <= 2 || cores <= 2,
      reduceMotion,
      darkMode
    }
  }

  /**
   * パフォーマンスレベルの計算
   */
  private calculatePerformanceLevel(): PerformanceLevel {
    const { memory, cores, connectionType, isLowEnd } = this.capabilities

    if (isLowEnd || connectionType === 'slow-2g' || connectionType === '2g') {
      return 'low'
    }

    if (memory >= 6 && cores >= 6 && connectionType === '4g') {
      return 'high'
    }

    return 'medium'
  }

  /**
   * パフォーマンス監視の設定
   */
  private setupPerformanceMonitoring(): void {
    let frameCount = 0
    let lastTime = performance.now()

    const measureFrame = (currentTime: number) => {
      frameCount++
      
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime))
        frameCount = 0
        lastTime = currentTime

        this.updateMetrics({ fps })
      }

      this.animationFrame = requestAnimationFrame(measureFrame)
    }

    this.animationFrame = requestAnimationFrame(measureFrame)
  }

  /**
   * バッテリー監視の設定
   */
  private async setupBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        
        this.capabilities.batteryLevel = Math.round(battery.level * 100)
        this.capabilities.isCharging = battery.charging

        battery.addEventListener('levelchange', () => {
          this.capabilities.batteryLevel = Math.round(battery.level * 100)
          this.adjustForBatteryLevel()
        })

        battery.addEventListener('chargingchange', () => {
          this.capabilities.isCharging = battery.charging
          this.adjustForBatteryLevel()
        })
      } catch (error) {
        console.warn('[Performance] Battery API not available:', error)
      }
    }
  }

  /**
   * メモリ警告の設定
   */
  private setupMemoryWarnings(): void {
    if ('memory' in performance) {
      const checkMemory = () => {
        const memInfo = (performance as any).memory
        const usedPercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100

        if (usedPercent > 80) {
          console.warn('[Performance] High memory usage detected:', usedPercent + '%')
          this.requestGarbageCollection()
        }
      }

      setInterval(checkMemory, 30000) // 30秒ごと
    }
  }

  /**
   * バッテリーレベルに基づく調整
   */
  private adjustForBatteryLevel(): void {
    const { batteryLevel, isCharging } = this.capabilities

    if (!isCharging && batteryLevel && batteryLevel < 20) {
      // バッテリー残量が少ない場合は低性能モードに
      this.setPerformanceLevel('low')
    } else if (isCharging && batteryLevel && batteryLevel > 50) {
      // 充電中で十分なバッテリー残量がある場合は通常モードに
      this.setPerformanceLevel(this.calculatePerformanceLevel())
    }
  }

  /**
   * ガベージコレクションの要求
   */
  private requestGarbageCollection(): void {
    if ('gc' in window) {
      (window as any).gc()
    }
    
    // 手動でのメモリクリーンアップ
    this.cleanupUnusedResources()
  }

  /**
   * 未使用リソースのクリーンアップ
   */
  private cleanupUnusedResources(): void {
    // 古いパフォーマンスメトリクスを削除
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-50)
    }

    // DOM要素の不要なイベントリスナーをクリーンアップ
    // (実装は使用するフレームワークに依存)
  }

  /**
   * メトリクスの更新
   */
  private updateMetrics(partialMetrics: Partial<PerformanceMetrics>): void {
    const currentMetrics: PerformanceMetrics = {
      fps: 60,
      memoryUsage: 0,
      renderTime: 0,
      domNodes: document.querySelectorAll('*').length,
      timestamp: Date.now(),
      ...partialMetrics
    }

    // メモリ使用量の取得
    if ('memory' in performance) {
      const memInfo = (performance as any).memory
      currentMetrics.memoryUsage = memInfo.usedJSHeapSize / (1024 * 1024) // MB
    }

    this.metrics.push(currentMetrics)
    
    if (this.metricsCallback) {
      this.metricsCallback(currentMetrics)
    }

    // 自動的なパフォーマンス調整
    this.autoAdjustPerformance(currentMetrics)
  }

  /**
   * 自動パフォーマンス調整
   */
  private autoAdjustPerformance(metrics: PerformanceMetrics): void {
    // FPSが低い場合は性能を下げる
    if (metrics.fps < 30 && this.performanceLevel !== 'low') {
      console.log('[Performance] Low FPS detected, reducing performance level')
      this.setPerformanceLevel('low')
    }

    // メモリ使用量が多い場合
    if (metrics.memoryUsage > 100) { // 100MB以上
      console.log('[Performance] High memory usage, requesting cleanup')
      this.requestGarbageCollection()
    }

    // DOM要素が多すぎる場合
    if (metrics.domNodes > 5000) {
      console.warn('[Performance] Too many DOM nodes:', metrics.domNodes)
    }
  }

  /**
   * パフォーマンスレベルの設定
   */
  setPerformanceLevel(level: PerformanceLevel): void {
    this.performanceLevel = level
    
    // CSSカスタムプロパティでパフォーマンスレベルを伝達
    document.documentElement.style.setProperty('--performance-level', level)
    document.documentElement.setAttribute('data-performance', level)

    console.log(`[Performance] Level set to: ${level}`)
  }

  /**
   * 推奨設定の取得
   */
  getRecommendedSettings() {
    const base = {
      animationDuration: 300,
      particleCount: 50,
      renderQuality: 1.0,
      shadowQuality: 'high' as const,
      enableBlur: true,
      enableGradients: true,
      maxConcurrentAnimations: 5
    }

    switch (this.performanceLevel) {
      case 'low':
        return {
          ...base,
          animationDuration: this.capabilities.reduceMotion ? 0 : 150,
          particleCount: 10,
          renderQuality: 0.5,
          shadowQuality: 'off' as const,
          enableBlur: false,
          enableGradients: false,
          maxConcurrentAnimations: 2
        }

      case 'medium':
        return {
          ...base,
          animationDuration: this.capabilities.reduceMotion ? 0 : 200,
          particleCount: 25,
          renderQuality: 0.75,
          shadowQuality: 'medium' as const,
          maxConcurrentAnimations: 3
        }

      case 'high':
        return {
          ...base,
          animationDuration: this.capabilities.reduceMotion ? 0 : 400,
          particleCount: 100,
          renderQuality: 1.0,
          shadowQuality: 'high' as const,
          maxConcurrentAnimations: 8
        }
    }
  }

  /**
   * CSS最適化の適用
   */
  applyCSSOptimizations(): void {
    const style = document.createElement('style')
    const level = this.performanceLevel

    let css = `
      :root {
        --performance-level: ${level};
      }
    `

    if (level === 'low') {
      css += `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          transform: none !important;
        }
        
        .performance-heavy {
          display: none !important;
        }
        
        [data-performance-level="medium"],
        [data-performance-level="high"] {
          display: none !important;
        }
      `
    } else if (level === 'medium') {
      css += `
        .performance-heavy {
          opacity: 0.7;
        }
        
        [data-performance-level="high"] {
          display: none !important;
        }
      `
    }

    style.textContent = css
    document.head.appendChild(style)
  }

  /**
   * 現在の性能レベルの取得
   */
  getPerformanceLevel(): PerformanceLevel {
    return this.performanceLevel
  }

  /**
   * デバイス情報の取得
   */
  getDeviceCapabilities(): DeviceCapabilities {
    return { ...this.capabilities }
  }

  /**
   * 最新のメトリクスの取得
   */
  getLatestMetrics(): PerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null
  }

  /**
   * メトリクス履歴の取得
   */
  getMetricsHistory(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count)
  }

  /**
   * メトリクスコールバックの設定
   */
  onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): void {
    this.metricsCallback = callback
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
    }
  }
}

// シングルトンインスタンス
export const performanceManager = new MobilePerformanceManager()

// Vue.js向けのコンポーザブル関数
export function useMobilePerformance() {
  return {
    getPerformanceLevel: () => performanceManager.getPerformanceLevel(),
    setPerformanceLevel: (level: PerformanceLevel) => performanceManager.setPerformanceLevel(level),
    getDeviceCapabilities: () => performanceManager.getDeviceCapabilities(),
    getRecommendedSettings: () => performanceManager.getRecommendedSettings(),
    getLatestMetrics: () => performanceManager.getLatestMetrics(),
    getMetricsHistory: (count?: number) => performanceManager.getMetricsHistory(count),
    onMetricsUpdate: (callback: (metrics: PerformanceMetrics) => void) => 
      performanceManager.onMetricsUpdate(callback),
    applyCSSOptimizations: () => performanceManager.applyCSSOptimizations()
  }
}

// 自動初期化
if (typeof window !== 'undefined') {
  // CSS最適化を自動適用
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      performanceManager.applyCSSOptimizations()
    })
  } else {
    performanceManager.applyCSSOptimizations()
  }
}