/**
 * アニメーションパフォーマンス最適化システム
 * 60FPS維持とGPU加速によるスムーズな体験を提供
 */

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  memoryUsage: number
  activeAnimations: number
  droppedFrames: number
  cpuUsage: number
  batteryLevel?: number
}

export interface OptimizationSettings {
  targetFPS: number
  maxConcurrentAnimations: number
  enableGPUAcceleration: boolean
  enableReducedMotion: boolean
  enableAdaptiveQuality: boolean
  memoryThreshold: number // MB
  batteryThreshold: number // %
}

export interface DeviceCapabilities {
  hasGPU: boolean
  maxTextureSize: number
  hardwareConcurrency: number
  deviceMemory: number
  connectionType: string
  isMobile: boolean
  isLowEnd: boolean
}

/**
 * アニメーションパフォーマンス最適化クラス
 */
export class AnimationPerformanceOptimizer {
  private readonly metrics: PerformanceMetrics
  private settings: OptimizationSettings
  private readonly deviceCapabilities: DeviceCapabilities
  
  // パフォーマンス監視
  private frameCount = 0
  private readonly lastFrameTime = 0
  private readonly frameTimeHistory: number[] = []
  private readonly animationMap = new Map<string, AnimationData>()
  
  // 適応的品質制御
  private qualityLevel: 'low' | 'medium' | 'high' = 'high'
  private lastQualityAdjustment = 0
  
  // GPU最適化
  private readonly gpuMemoryPool: GPUMemoryPool
  private readonly transformCache = new Map<string, string>()
  
  // フレーム監視
  private animationFrame: number | null = null
  private performanceObserver: PerformanceObserver | null = null

  constructor(settings?: Partial<OptimizationSettings>) {
    this.settings = {
      targetFPS: 60,
      maxConcurrentAnimations: 10,
      enableGPUAcceleration: true,
      enableReducedMotion: false,
      enableAdaptiveQuality: true,
      memoryThreshold: 100,
      batteryThreshold: 20,
      ...settings
    }

    this.metrics = {
      fps: 60,
      frameTime: 16.67,
      memoryUsage: 0,
      activeAnimations: 0,
      droppedFrames: 0,
      cpuUsage: 0
    }

    this.deviceCapabilities = this.detectDeviceCapabilities()
    this.gpuMemoryPool = new GPUMemoryPool()
    
    this.initializePerformanceMonitoring()
    this.adjustSettingsForDevice()
  }

  /**
   * デバイス性能を検出
   */
  private detectDeviceCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    
    // GPU情報の取得
    const hasGPU = Boolean(gl)
    const maxTextureSize = hasGPU ? gl.getParameter(gl.MAX_TEXTURE_SIZE) : 0
    
    // デバイス情報
    const hardwareConcurrency = navigator.hardwareConcurrency || 4
    const deviceMemory = (navigator as any).deviceMemory || 4
    const connection = (navigator as any).connection
    const connectionType = connection ? connection.effectiveType : 'unknown'
    
    // モバイルデバイスの検出
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // 低性能デバイスの判定
    const isLowEnd = hardwareConcurrency <= 2 || 
                     deviceMemory <= 2 || 
                     connectionType === 'slow-2g' || 
                     connectionType === '2g'

    return {
      hasGPU,
      maxTextureSize,
      hardwareConcurrency,
      deviceMemory,
      connectionType,
      isMobile,
      isLowEnd
    }
  }

  /**
   * パフォーマンス監視の初期化
   */
  private initializePerformanceMonitoring(): void {
    // Frame rate monitoring
    this.startFrameRateMonitoring()
    
    // Performance Observer (サポートされている場合)
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.entryType === 'measure') {
            this.updatePerformanceMetrics(entry)
          }
        })
      })
      
      this.performanceObserver.observe({ entryTypes: ['measure', 'paint'] })
    }

    // Memory monitoring (サポートされている場合)
    this.startMemoryMonitoring()
    
    // Battery monitoring (サポートされている場合)
    this.startBatteryMonitoring()
  }

  /**
   * フレームレート監視
   */
  private startFrameRateMonitoring(): void {
    let lastTime = performance.now()
    
    const monitorFrame = (currentTime: number) => {
      const deltaTime = currentTime - lastTime
      
      if (deltaTime > 0) {
        this.frameCount++
        this.frameTimeHistory.push(deltaTime)
        
        // 過去60フレームの平均を計算
        if (this.frameTimeHistory.length > 60) {
          this.frameTimeHistory.shift()
        }
        
        // FPSを計算
        const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length
        this.metrics.fps = 1000 / avgFrameTime
        this.metrics.frameTime = avgFrameTime
        
        // フレームドロップの検出
        if (deltaTime > 33.33) { // 30FPS以下
          this.metrics.droppedFrames++
        }
        
        // 適応的品質調整
        if (this.settings.enableAdaptiveQuality) {
          this.adaptiveQualityAdjustment()
        }
      }
      
      lastTime = currentTime
      this.animationFrame = requestAnimationFrame(monitorFrame)
    }
    
    this.animationFrame = requestAnimationFrame(monitorFrame)
  }

  /**
   * メモリ監視
   */
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory
        this.metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024 // MB
        
        // メモリ圧迫時の対応
        if (this.metrics.memoryUsage > this.settings.memoryThreshold) {
          this.handleMemoryPressure()
        }
      }, 5000)
    }
  }

  /**
   * バッテリー監視
   */
  private async startBatteryMonitoring(): Promise<void> {
    if ('getBattery' in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        
        const updateBattery = () => {
          this.metrics.batteryLevel = battery.level * 100
          
          // バッテリー低下時の省電力モード
          if (this.metrics.batteryLevel && this.metrics.batteryLevel < this.settings.batteryThreshold) {
            this.enablePowerSavingMode()
          }
        }
        
        battery.addEventListener('levelchange', updateBattery)
        updateBattery()
      } catch (error) {
        console.warn('Battery API not available:', error)
      }
    }
  }

  /**
   * デバイスに応じた設定調整
   */
  private adjustSettingsForDevice(): void {
    if (this.deviceCapabilities.isLowEnd) {
      this.settings.maxConcurrentAnimations = Math.min(this.settings.maxConcurrentAnimations, 5)
      this.settings.enableGPUAcceleration = false
      this.qualityLevel = 'low'
    } else if (this.deviceCapabilities.isMobile) {
      this.settings.maxConcurrentAnimations = Math.min(this.settings.maxConcurrentAnimations, 8)
      this.qualityLevel = 'medium'
    }
    
    // モーション削減設定の確認
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.settings.enableReducedMotion = true
    }
  }

  /**
   * 適応的品質調整
   */
  private adaptiveQualityAdjustment(): void {
    const now = performance.now()
    
    // 調整間隔の制限（5秒に1回）
    if (now - this.lastQualityAdjustment < 5000) return
    
    const targetFrameTime = 1000 / this.settings.targetFPS
    const currentFrameTime = this.metrics.frameTime
    
    if (currentFrameTime > targetFrameTime * 1.5) {
      // パフォーマンスが悪い場合は品質を下げる
      this.decreaseQuality()
    } else if (currentFrameTime < targetFrameTime * 0.8 && this.qualityLevel !== 'high') {
      // パフォーマンスに余裕がある場合は品質を上げる
      this.increaseQuality()
    }
    
    this.lastQualityAdjustment = now
  }

  /**
   * 品質レベルを下げる
   */
  private decreaseQuality(): void {
    switch (this.qualityLevel) {
      case 'high':
        this.qualityLevel = 'medium'
        this.settings.maxConcurrentAnimations = Math.max(1, Math.floor(this.settings.maxConcurrentAnimations * 0.7))
        break
      case 'medium':
        this.qualityLevel = 'low'
        this.settings.maxConcurrentAnimations = Math.max(1, Math.floor(this.settings.maxConcurrentAnimations * 0.5))
        this.settings.enableGPUAcceleration = false
        break
    }
    
    console.log(`Quality decreased to: ${this.qualityLevel}`)
  }

  /**
   * 品質レベルを上げる
   */
  private increaseQuality(): void {
    switch (this.qualityLevel) {
      case 'low':
        this.qualityLevel = 'medium'
        this.settings.maxConcurrentAnimations = Math.min(10, Math.floor(this.settings.maxConcurrentAnimations * 1.5))
        this.settings.enableGPUAcceleration = this.deviceCapabilities.hasGPU
        break
      case 'medium':
        this.qualityLevel = 'high'
        this.settings.maxConcurrentAnimations = Math.min(15, Math.floor(this.settings.maxConcurrentAnimations * 1.3))
        break
    }
    
    console.log(`Quality increased to: ${this.qualityLevel}`)
  }

  /**
   * メモリ圧迫時の対応
   */
  private handleMemoryPressure(): void {
    console.warn('Memory pressure detected, cleaning up resources')
    
    // キャッシュをクリア
    this.transformCache.clear()
    
    // 非アクティブなアニメーションを停止
    this.cleanupInactiveAnimations()
    
    // 品質を下げる
    this.decreaseQuality()
    
    // ガベージコレクションを促す
    if ('gc' in window) {
      (window as any).gc()
    }
  }

  /**
   * 省電力モードの有効化
   */
  private enablePowerSavingMode(): void {
    console.log('Enabling power saving mode')
    
    this.settings.targetFPS = 30
    this.settings.maxConcurrentAnimations = Math.max(1, Math.floor(this.settings.maxConcurrentAnimations * 0.5))
    this.settings.enableGPUAcceleration = false
    this.qualityLevel = 'low'
  }

  /**
   * アニメーションの最適化
   */
  optimizeAnimation(element: HTMLElement, animationType: string, config: any): OptimizedAnimationConfig {
    const optimizedConfig = { ...config }
    
    // GPU最適化の適用
    if (this.settings.enableGPUAcceleration && this.shouldUseGPU(animationType)) {
      this.applyGPUOptimization(element)
    }
    
    // 品質レベルに応じた調整
    optimizedConfig.duration = this.adjustDuration(config.duration || 300)
    optimizedConfig.easing = this.adjustEasing(config.easing || 'ease-out')
    
    // パーティクル数の調整
    if (config.particles) {
      optimizedConfig.particles = this.adjustParticleCount(config.particles)
    }
    
    // モーション削減対応
    if (this.settings.enableReducedMotion) {
      optimizedConfig.duration = Math.min(optimizedConfig.duration, 200)
      optimizedConfig.particles = 0
    }
    
    return optimizedConfig
  }

  /**
   * GPU使用の判定
   */
  private shouldUseGPU(animationType: string): boolean {
    const gpuOptimizedAnimations = ['transform', 'opacity', 'filter']
    return gpuOptimizedAnimations.some(type => animationType.includes(type))
  }

  /**
   * GPU最適化の適用
   */
  private applyGPUOptimization(element: HTMLElement): void {
    if (!this.deviceCapabilities.hasGPU) return
    
    // GPU層の作成
    element.style.willChange = 'transform, opacity'
    element.style.transform = element.style.transform || 'translateZ(0)'
    
    // メモリプールからテクスチャを取得
    const texture = this.gpuMemoryPool.getTexture(element)
    if (texture) {
      // テクスチャキャッシュの利用
      this.cacheElementTexture(element, texture)
    }
  }

  /**
   * アニメーション継続時間の調整
   */
  private adjustDuration(duration: number): number {
    switch (this.qualityLevel) {
      case 'low':
        return duration * 0.5
      case 'medium':
        return duration * 0.8
      case 'high':
        return duration
      default:
        return duration
    }
  }

  /**
   * イージングの調整
   */
  private adjustEasing(easing: string): string {
    if (this.qualityLevel === 'low') {
      // 低品質時はシンプルなイージングを使用
      return 'linear'
    }
    return easing
  }

  /**
   * パーティクル数の調整
   */
  private adjustParticleCount(originalCount: number): number {
    switch (this.qualityLevel) {
      case 'low':
        return Math.max(1, Math.floor(originalCount * 0.3))
      case 'medium':
        return Math.max(1, Math.floor(originalCount * 0.7))
      case 'high':
        return originalCount
      default:
        return originalCount
    }
  }

  /**
   * Transform最適化
   */
  optimizeTransform(element: HTMLElement, transform: string): string {
    const cacheKey = `${element.id || element.className}-${transform}`
    
    if (this.transformCache.has(cacheKey)) {
      return this.transformCache.get(cacheKey)!
    }
    
    let optimizedTransform = transform
    
    // GPU最適化されたプロパティを優先
    if (this.settings.enableGPUAcceleration) {
      // translate3d の使用を強制
      optimizedTransform = optimizedTransform.replace(/translateX\((.*?)\)/, 'translate3d($1, 0, 0)')
      optimizedTransform = optimizedTransform.replace(/translateY\((.*?)\)/, 'translate3d(0, $1, 0)')
      
      // translateZ(0) の追加
      if (!optimizedTransform.includes('translateZ') && !optimizedTransform.includes('translate3d')) {
        optimizedTransform += ' translateZ(0)'
      }
    }
    
    this.transformCache.set(cacheKey, optimizedTransform)
    return optimizedTransform
  }

  /**
   * アニメーション登録
   */
  registerAnimation(id: string, element: HTMLElement, type: string): void {
    if (this.animationMap.size >= this.settings.maxConcurrentAnimations) {
      // 最も古いアニメーションを停止
      const oldestAnimation = Array.from(this.animationMap.values())
        .sort((a, b) => a.startTime - b.startTime)[0]
      
      if (oldestAnimation) {
        this.unregisterAnimation(oldestAnimation.id)
      }
    }
    
    this.animationMap.set(id, {
      id,
      element,
      type,
      startTime: performance.now()
    })
    
    this.metrics.activeAnimations = this.animationMap.size
  }

  /**
   * アニメーション登録解除
   */
  unregisterAnimation(id: string): void {
    const animation = this.animationMap.get(id)
    if (animation) {
      // GPU最適化のクリーンアップ
      if (animation.element) {
        animation.element.style.willChange = ''
      }
      
      this.animationMap.delete(id)
      this.metrics.activeAnimations = this.animationMap.size
    }
  }

  /**
   * パフォーマンスメトリクスの更新
   */
  private updatePerformanceMetrics(entry: PerformanceEntry): void {
    if (entry.name.includes('animation')) {
      // アニメーション関連のメトリクスを更新
      this.metrics.cpuUsage = Math.min(100, (entry.duration / 16.67) * 100)
    }
  }

  /**
   * 非アクティブなアニメーションのクリーンアップ
   */
  private cleanupInactiveAnimations(): void {
    const now = performance.now()
    const maxAge = 30000 // 30秒
    
    this.animationMap.forEach((animation, id) => {
      if (now - animation.startTime > maxAge) {
        this.unregisterAnimation(id)
      }
    })
  }

  /**
   * 要素テクスチャのキャッシュ
   */
  private cacheElementTexture(element: HTMLElement, texture: any): void {
    // テクスチャキャッシュの実装
    // 実際の実装では WebGL テクスチャを使用
  }

  /**
   * パフォーマンス最適化の推奨事項を取得
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    
    if (this.metrics.fps < 30) {
      recommendations.push('フレームレートが低下しています。アニメーション数を減らすことを推奨します。')
    }
    
    if (this.metrics.memoryUsage > this.settings.memoryThreshold) {
      recommendations.push('メモリ使用量が多くなっています。不要なアニメーションを停止してください。')
    }
    
    if (this.metrics.droppedFrames > 10) {
      recommendations.push('フレームドロップが発生しています。品質設定を下げることを推奨します。')
    }
    
    if (!this.deviceCapabilities.hasGPU && this.settings.enableGPUAcceleration) {
      recommendations.push('このデバイスではGPU加速を無効にすることを推奨します。')
    }
    
    return recommendations
  }

  /**
   * 現在のパフォーマンスメトリクスを取得
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 設定を更新
   */
  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings }
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
    }
    
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
    
    this.animationMap.clear()
    this.transformCache.clear()
    this.gpuMemoryPool.destroy()
  }
}

// サポートクラス
interface AnimationData {
  id: string
  element: HTMLElement
  type: string
  startTime: number
}

interface OptimizedAnimationConfig {
  duration: number
  easing: string
  particles?: number
  [key: string]: any
}

class GPUMemoryPool {
  private readonly textures: Map<string, any> = new Map()
  private readonly maxTextures = 50

  getTexture(element: HTMLElement): any | null {
    const key = this.getElementKey(element)
    return this.textures.get(key) || null
  }

  setTexture(element: HTMLElement, texture: any): void {
    if (this.textures.size >= this.maxTextures) {
      // 最も古いテクスチャを削除
      const firstKey = this.textures.keys().next().value
      this.textures.delete(firstKey)
    }
    
    const key = this.getElementKey(element)
    this.textures.set(key, texture)
  }

  private getElementKey(element: HTMLElement): string {
    return element.id || element.className || `element-${element.getBoundingClientRect().toString()}`
  }

  destroy(): void {
    this.textures.clear()
  }
}

// シングルトンインスタンス
let optimizerInstance: AnimationPerformanceOptimizer | null = null

export function getAnimationPerformanceOptimizer(settings?: Partial<OptimizationSettings>): AnimationPerformanceOptimizer {
  if (!optimizerInstance) {
    optimizerInstance = new AnimationPerformanceOptimizer(settings)
  }
  return optimizerInstance
}

export function destroyAnimationPerformanceOptimizer(): void {
  if (optimizerInstance) {
    optimizerInstance.destroy()
    optimizerInstance = null
  }
}