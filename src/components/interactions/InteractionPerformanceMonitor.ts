/**
 * インタラクションパフォーマンス監視システム
 * 60fps目標でのマイクロインタラクション最適化
 */

export interface PerformanceMetrics {
  fps: number
  frameTime: number
  interactionLatency: number
  memoryUsage: number
  animationQueueLength: number
  droppedFrames: number
}

export interface PerformanceThresholds {
  targetFPS: number
  maxFrameTime: number
  maxInteractionLatency: number
  maxAnimationQueue: number
  warningMemoryUsage: number
}

export interface InteractionTiming {
  type: string
  startTime: number
  endTime?: number
  duration?: number
  frameCount: number
  avgFPS: number
}

export class InteractionPerformanceMonitor {
  private isMonitoring: boolean = false
  private readonly metricsHistory: PerformanceMetrics[] = []
  private readonly interactionTimings: InteractionTiming[] = []
  private frameCount: number = 0
  private lastFrameTime: number = 0
  private animationFrameId: number = 0
  private performanceObserver?: PerformanceObserver

  private readonly thresholds: PerformanceThresholds = {
    targetFPS: 60,
    maxFrameTime: 16.67, // 60fps = 16.67ms per frame
    maxInteractionLatency: 100, // 100ms max for user interactions
    maxAnimationQueue: 10,
    warningMemoryUsage: 50 * 1024 * 1024 // 50MB
  }

  private readonly fpsBuffer: number[] = []
  private readonly frameTimeBuffer: number[] = []
  private readonly latencyBuffer: number[] = []
  
  constructor() {
    this.setupPerformanceObserver()
  }

  /**
   * パフォーマンス監視開始
   */
  startMonitoring(): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.frameCount = 0
    this.lastFrameTime = performance.now()
    this.measureFrame()

    console.log('🔍 インタラクションパフォーマンス監視開始')
  }

  /**
   * パフォーマンス監視停止
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return

    this.isMonitoring = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }

    console.log('⏹️ インタラクションパフォーマンス監視停止')
  }

  /**
   * インタラクション開始計測
   */
  startInteractionTiming(type: string): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const timing: InteractionTiming = {
      type,
      startTime: performance.now(),
      frameCount: this.frameCount,
      avgFPS: this.getCurrentFPS()
    }

    this.interactionTimings.push(timing)
    return id
  }

  /**
   * インタラクション終了計測
   */
  endInteractionTiming(id: string): InteractionTiming | null {
    const index = this.interactionTimings.findIndex(timing => 
      `${timing.type}-${timing.startTime}` === id.split('-').slice(0, -2).join('-')
    )

    if (index === -1) return null

    const timing = this.interactionTimings[index]
    timing.endTime = performance.now()
    timing.duration = timing.endTime - timing.startTime
    timing.frameCount = this.frameCount - timing.frameCount
    timing.avgFPS = timing.frameCount > 0 ? (timing.frameCount / (timing.duration / 1000)) : 0

    // パフォーマンス警告チェック
    if (timing.duration > this.thresholds.maxInteractionLatency) {
      console.warn(`⚠️ インタラクション遅延警告: ${timing.type} took ${timing.duration.toFixed(2)}ms`)
    }

    return timing
  }

  /**
   * 現在のパフォーマンスメトリクス取得
   */
  getCurrentMetrics(): PerformanceMetrics {
    const fps = this.getCurrentFPS()
    const frameTime = this.getAverageFrameTime()
    const interactionLatency = this.getAverageInteractionLatency()
    const memoryUsage = this.getMemoryUsage()
    const animationQueueLength = this.getAnimationQueueLength()
    const droppedFrames = this.getDroppedFrames()

    return {
      fps,
      frameTime,
      interactionLatency,
      memoryUsage,
      animationQueueLength,
      droppedFrames
    }
  }

  /**
   * パフォーマンス履歴取得
   */
  getMetricsHistory(): PerformanceMetrics[] {
    return [...this.metricsHistory]
  }

  /**
   * インタラクション計測履歴取得
   */
  getInteractionHistory(): InteractionTiming[] {
    return [...this.interactionTimings]
  }

  /**
   * パフォーマンス最適化推奨事項
   */
  getOptimizationRecommendations(): string[] {
    const metrics = this.getCurrentMetrics()
    const recommendations: string[] = []

    if (metrics.fps < this.thresholds.targetFPS * 0.8) {
      recommendations.push('FPSが低下しています。アニメーション量を減らすことを検討してください。')
    }

    if (metrics.frameTime > this.thresholds.maxFrameTime * 1.5) {
      recommendations.push('フレーム時間が長すぎます。重い処理をrequestIdleCallbackに移行してください。')
    }

    if (metrics.interactionLatency > this.thresholds.maxInteractionLatency) {
      recommendations.push('インタラクション応答が遅いです。デバウンスやスロットリングを実装してください。')
    }

    if (metrics.memoryUsage > this.thresholds.warningMemoryUsage) {
      recommendations.push('メモリ使用量が多いです。不要なDOMノードやイベントリスナーを削除してください。')
    }

    if (metrics.animationQueueLength > this.thresholds.maxAnimationQueue) {
      recommendations.push('アニメーションキューが長いです。同時実行アニメーション数を制限してください。')
    }

    if (metrics.droppedFrames > 5) {
      recommendations.push('フレームドロップが発生しています。will-change CSSプロパティの使用を検討してください。')
    }

    return recommendations
  }

  /**
   * パフォーマンスレポート生成
   */
  generateReport(): string {
    const metrics = this.getCurrentMetrics()
    const recommendations = this.getOptimizationRecommendations()
    const recentInteractions = this.interactionTimings.slice(-10)

    return `
# インタラクションパフォーマンスレポート

## 現在のメトリクス
- FPS: ${metrics.fps.toFixed(1)} / ${this.thresholds.targetFPS}
- フレーム時間: ${metrics.frameTime.toFixed(2)}ms
- インタラクション遅延: ${metrics.interactionLatency.toFixed(2)}ms
- メモリ使用量: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
- アニメーションキュー: ${metrics.animationQueueLength}
- ドロップフレーム: ${metrics.droppedFrames}

## パフォーマンス評価
${this.getPerformanceGrade(metrics)}

## 最近のインタラクション (上位10件)
${recentInteractions.map(interaction => 
  `- ${interaction.type}: ${interaction.duration?.toFixed(2)}ms (${interaction.avgFPS.toFixed(1)}fps)`
).join('\n')}

## 最適化推奨事項
${recommendations.length > 0 ? recommendations.map(rec => `- ${rec}`).join('\n') : '現在、最適化推奨事項はありません。'}

## 生成日時
${new Date().toLocaleString()}
    `.trim()
  }

  /**
   * パフォーマンス自動最適化
   */
  enableAutoOptimization(): void {
    setInterval(() => {
      const metrics = this.getCurrentMetrics()
      
      // FPS低下時の自動最適化
      if (metrics.fps < this.thresholds.targetFPS * 0.7) {
        this.applyEmergencyOptimizations()
      }
      
      // メトリクス履歴に追加
      this.metricsHistory.push(metrics)
      
      // 履歴サイズ制限（最新100件）
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift()
      }
    }, 1000)
  }

  private measureFrame(): void {
    if (!this.isMonitoring) return

    const currentTime = performance.now()
    const frameTime = currentTime - this.lastFrameTime
    
    this.frameCount++
    this.frameTimeBuffer.push(frameTime)
    
    // バッファサイズ制限
    if (this.frameTimeBuffer.length > 60) {
      this.frameTimeBuffer.shift()
    }

    // FPS計算
    const fps = 1000 / frameTime
    this.fpsBuffer.push(fps)
    
    if (this.fpsBuffer.length > 60) {
      this.fpsBuffer.shift()
    }

    this.lastFrameTime = currentTime
    this.animationFrameId = requestAnimationFrame(() => { this.measureFrame(); })
  }

  private getCurrentFPS(): number {
    if (this.fpsBuffer.length === 0) return 0
    return this.fpsBuffer.reduce((sum, fps) => sum + fps, 0) / this.fpsBuffer.length
  }

  private getAverageFrameTime(): number {
    if (this.frameTimeBuffer.length === 0) return 0
    return this.frameTimeBuffer.reduce((sum, time) => sum + time, 0) / this.frameTimeBuffer.length
  }

  private getAverageInteractionLatency(): number {
    const recentInteractions = this.interactionTimings
      .filter(timing => timing.duration !== undefined)
      .slice(-20)
    
    if (recentInteractions.length === 0) return 0
    
    const totalLatency = recentInteractions.reduce((sum, timing) => sum + (timing.duration || 0), 0)
    return totalLatency / recentInteractions.length
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize
    }
    return 0
  }

  private getAnimationQueueLength(): number {
    // 実際の実装では、アクティブなアニメーション数を返す
    return document.getAnimations().length
  }

  private getDroppedFrames(): number {
    // 簡単な推定：目標FPSを大きく下回るフレーム数
    const targetFrameTime = 1000 / this.thresholds.targetFPS
    return this.frameTimeBuffer.filter(time => time > targetFrameTime * 2).length
  }

  private getPerformanceGrade(metrics: PerformanceMetrics): string {
    let score = 100

    // FPS評価
    const fpsRatio = metrics.fps / this.thresholds.targetFPS
    if (fpsRatio < 0.5) score -= 40
    else if (fpsRatio < 0.7) score -= 25
    else if (fpsRatio < 0.9) score -= 10

    // フレーム時間評価
    if (metrics.frameTime > this.thresholds.maxFrameTime * 2) score -= 25
    else if (metrics.frameTime > this.thresholds.maxFrameTime * 1.5) score -= 15
    else if (metrics.frameTime > this.thresholds.maxFrameTime) score -= 5

    // インタラクション遅延評価
    if (metrics.interactionLatency > this.thresholds.maxInteractionLatency * 2) score -= 20
    else if (metrics.interactionLatency > this.thresholds.maxInteractionLatency) score -= 10

    // メモリ使用量評価
    if (metrics.memoryUsage > this.thresholds.warningMemoryUsage * 2) score -= 15
    else if (metrics.memoryUsage > this.thresholds.warningMemoryUsage) score -= 8

    if (score >= 90) return 'A (優秀)'
    if (score >= 80) return 'B (良好)'
    if (score >= 70) return 'C (普通)'
    if (score >= 60) return 'D (要改善)'
    return 'F (緊急対応必要)'
  }

  private applyEmergencyOptimizations(): void {
    console.warn('🚨 緊急最適化実行中...')
    
    // アニメーション品質を下げる
    document.documentElement.style.setProperty('--animation-duration-multiplier', '0.5')
    
    // 複雑なエフェクトを無効化
    document.documentElement.classList.add('reduced-effects')
    
    // 一定時間後に復元
    setTimeout(() => {
      document.documentElement.style.removeProperty('--animation-duration-multiplier')
      document.documentElement.classList.remove('reduced-effects')
      console.log('✅ 緊急最適化解除')
    }, 5000)
  }

  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'measure' && entry.name.startsWith('interaction-')) {
            this.latencyBuffer.push(entry.duration)
            if (this.latencyBuffer.length > 20) {
              this.latencyBuffer.shift()
            }
          }
        }
      })
      
      this.performanceObserver.observe({ entryTypes: ['measure'] })
    }
  }

  /**
   * デバッグ用のパフォーマンス可視化
   */
  showDebugOverlay(): HTMLElement {
    const overlay = document.createElement('div')
    overlay.id = 'performance-debug-overlay'
    overlay.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      min-width: 200px;
    `

    const updateOverlay = () => {
      const metrics = this.getCurrentMetrics()
      // セキュリティ対策: innerHTML の代わりに textContent を使用
      overlay.textContent = ''
      
      const title = document.createElement('div')
      const titleStrong = document.createElement('strong')
      titleStrong.textContent = 'Performance Monitor'
      title.appendChild(titleStrong)
      
      const fpsDiv = document.createElement('div')
      fpsDiv.textContent = `FPS: ${metrics.fps.toFixed(1)}`
      
      const frameDiv = document.createElement('div')
      frameDiv.textContent = `Frame: ${metrics.frameTime.toFixed(2)}ms`
      
      const latencyDiv = document.createElement('div')
      latencyDiv.textContent = `Latency: ${metrics.interactionLatency.toFixed(2)}ms`
      
      const memoryDiv = document.createElement('div')
      memoryDiv.textContent = `Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`
      
      const queueDiv = document.createElement('div')
      queueDiv.textContent = `Queue: ${metrics.animationQueueLength}`
      
      const droppedDiv = document.createElement('div')
      droppedDiv.textContent = `Dropped: ${metrics.droppedFrames}`
      
      overlay.appendChild(title)
      overlay.appendChild(fpsDiv)
      overlay.appendChild(frameDiv)
      overlay.appendChild(latencyDiv)
      overlay.appendChild(memoryDiv)
      overlay.appendChild(queueDiv)
      overlay.appendChild(droppedDiv)
    }

    // 定期更新
    const intervalId = setInterval(updateOverlay, 500)
    updateOverlay()

    // 閉じるボタン
    const closeBtn = document.createElement('button')
    closeBtn.textContent = '×'
    closeBtn.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      background: none;
      border: none;
      color: white;
      cursor: pointer;
    `
    closeBtn.onclick = () => {
      clearInterval(intervalId)
      overlay.remove()
    }
    overlay.appendChild(closeBtn)

    document.body.appendChild(overlay)
    return overlay
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.stopMonitoring()
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
    
    // デバッグオーバーレイを削除
    const overlay = document.getElementById('performance-debug-overlay')
    if (overlay) {
      overlay.remove()
    }
  }
}