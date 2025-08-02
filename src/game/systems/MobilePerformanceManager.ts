/**
 * モバイルパフォーマンス最適化マネージャー
 * 
 * 主な機能:
 * - ハードウェアアクセラレーションの管理
 * - メモリ使用量の監視と最適化
 * - 描画パフォーマンスの調整
 * - バッテリー消費の最適化
 */

interface PerformanceMetrics {
  fps: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  renderTime: number
  updateTime: number
  drawCalls: number
}

interface PerformanceThresholds {
  minFPS: number
  maxMemoryUsage: number // percentage
  maxRenderTime: number // ms
  maxDrawCalls: number
}

export class MobilePerformanceManager {
  private readonly scene: Phaser.Scene
  private readonly metrics: PerformanceMetrics
  private readonly thresholds: PerformanceThresholds
  private optimizationLevel: 'low' | 'medium' | 'high' = 'medium'
  private monitoringInterval: number | null = null
  private frameCounter: number = 0
  private lastFrameTime: number = 0
  private readonly fpsHistory: number[] = []
  private isLowPowerMode: boolean = false
  
  constructor(scene: Phaser.Scene, thresholds?: Partial<PerformanceThresholds>) {
    this.scene = scene
    
    this.thresholds = {
      minFPS: 30,
      maxMemoryUsage: 80,
      maxRenderTime: 16.67, // 60fps target
      maxDrawCalls: 100,
      ...thresholds
    }
    
    this.metrics = {
      fps: 60,
      memory: { used: 0, total: 0, percentage: 0 },
      renderTime: 0,
      updateTime: 0,
      drawCalls: 0
    }
    
    this.initialize()
  }

  private initialize(): void {
    // パフォーマンス監視の開始
    this.startMonitoring()
    
    // ハードウェアアクセラレーションの有効化
    this.enableHardwareAcceleration()
    
    // バッテリー状態の監視
    this.monitorBatteryStatus()
    
    // ビジビリティ変更の監視
    this.setupVisibilityHandling()
  }

  /**
   * ハードウェアアクセラレーションの有効化
   */
  private enableHardwareAcceleration(): void {
    const renderer = this.scene.game.renderer
    
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      // WebGLコンテキストの最適化
      const gl = renderer.gl
      
      // アンチエイリアスの調整
      if (this.optimizationLevel === 'low') {
        gl.disable(gl.BLEND)
        gl.disable(gl.DITHER)
      }
      
      // テクスチャフィルタリングの最適化
      gl.hint(gl.GENERATE_MIPMAP_HINT, gl.FASTEST)
      
      // 深度テストの最適化
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.STENCIL_TEST)
    }
    
    // CSS最適化
    const canvas = this.scene.game.canvas
    canvas.style.willChange = 'transform'
    canvas.style.transform = 'translateZ(0)'
    canvas.style.backfaceVisibility = 'hidden'
    canvas.style.perspective = '1000px'
  }

  /**
   * パフォーマンス監視の開始
   */
  private startMonitoring(): void {
    // 既存の監視を停止
    this.stopMonitoring()
    
    // FPS計測
    this.scene.events.on('preupdate', this.measureFPS, this)
    
    // 定期的なメトリクス更新
    this.monitoringInterval = window.setInterval(() => {
      this.updateMetrics()
      this.checkPerformanceThresholds()
    }, 1000) // 1秒ごと
  }

  /**
   * パフォーマンス監視の停止
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval !== null) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    this.scene.events.off('preupdate', this.measureFPS, this)
  }

  /**
   * FPSの計測
   */
  private measureFPS(): void {
    const currentTime = performance.now()
    
    if (this.lastFrameTime > 0) {
      const deltaTime = currentTime - this.lastFrameTime
      const currentFPS = 1000 / deltaTime
      
      this.fpsHistory.push(currentFPS)
      
      // 履歴を最新60フレーム分に制限
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift()
      }
    }
    
    this.lastFrameTime = currentTime
    this.frameCounter++
  }

  /**
   * メトリクスの更新
   */
  private updateMetrics(): void {
    // FPS計算（平均値）
    if (this.fpsHistory.length > 0) {
      const avgFPS = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
      this.metrics.fps = Math.round(avgFPS)
    }
    
    // メモリ使用量の取得
    if ('memory' in performance && (performance as any).memory) {
      const memoryInfo = (performance as any).memory
      this.metrics.memory = {
        used: memoryInfo.usedJSHeapSize,
        total: memoryInfo.totalJSHeapSize,
        percentage: (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100
      }
    }
    
    // レンダリング統計
    const renderer = this.scene.game.renderer
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      this.metrics.drawCalls = renderer.pipelines.pipelines.size
    }
  }

  /**
   * パフォーマンスしきい値のチェック
   */
  private checkPerformanceThresholds(): void {
    let needsOptimization = false
    
    // FPSチェック
    if (this.metrics.fps < this.thresholds.minFPS) {
      needsOptimization = true
    }
    
    // メモリ使用量チェック
    if (this.metrics.memory.percentage > this.thresholds.maxMemoryUsage) {
      needsOptimization = true
      this.performMemoryCleanup()
    }
    
    // 描画コール数チェック
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
      needsOptimization = true
    }
    
    // 最適化レベルの調整
    if (needsOptimization) {
      this.adjustOptimizationLevel()
    }
  }

  /**
   * 最適化レベルの調整
   */
  private adjustOptimizationLevel(): void {
    const fps = this.metrics.fps
    
    if (fps < 20) {
      this.setOptimizationLevel('low')
    } else if (fps < 40) {
      this.setOptimizationLevel('medium')
    } else {
      this.setOptimizationLevel('high')
    }
  }

  /**
   * 最適化レベルの設定
   */
  public setOptimizationLevel(level: 'low' | 'medium' | 'high'): void {
    if (this.optimizationLevel === level) return
    
    this.optimizationLevel = level
    
    switch (level) {
      case 'low':
        this.applyLowQualitySettings()
        break
      case 'medium':
        this.applyMediumQualitySettings()
        break
      case 'high':
        this.applyHighQualitySettings()
        break
    }
    
    // 最適化レベル変更を通知
    this.scene.events.emit('optimizationLevelChanged', level)
  }

  /**
   * 低品質設定の適用
   */
  private applyLowQualitySettings(): void {
    // 影の無効化
    this.disableShadows()
    
    // パーティクル効果の削減
    this.reduceParticles()
    
    // テクスチャ品質の低下
    this.reduceTextureQuality()
    
    // アニメーションフレームレートの削減
    this.reduceAnimationFrameRate()
    
    // 背景効果の簡略化
    this.simplifyBackgroundEffects()
  }

  /**
   * 中品質設定の適用
   */
  private applyMediumQualitySettings(): void {
    // 一部の影を有効化
    this.enableLimitedShadows()
    
    // パーティクル効果の部分的な有効化
    this.enableLimitedParticles()
    
    // テクスチャ品質の中程度設定
    this.setMediumTextureQuality()
    
    // 標準的なアニメーションフレームレート
    this.setNormalAnimationFrameRate()
  }

  /**
   * 高品質設定の適用
   */
  private applyHighQualitySettings(): void {
    // すべての視覚効果を有効化
    this.enableAllVisualEffects()
    
    // 最高品質のテクスチャ
    this.setHighTextureQuality()
    
    // スムーズなアニメーション
    this.setSmoothAnimations()
  }

  /**
   * メモリクリーンアップ
   */
  private performMemoryCleanup(): void {
    // 未使用のテクスチャを解放
    const textureManager = this.scene.textures
    const keysToRemove: string[] = []
    
    textureManager.list.forEach((texture, key) => {
      // システムテクスチャ以外で参照カウントが0のものを削除
      if (!['__DEFAULT', '__MISSING', '__WHITE'].includes(key)) {
        const isInUse = this.isTextureInUse(key)
        if (!isInUse) {
          keysToRemove.push(key)
        }
      }
    })
    
    // テクスチャの削除
    keysToRemove.forEach(key => {
      try {
        textureManager.remove(key)
      } catch (e) {
        // エラーを無視
      }
    })
    
    // ガベージコレクションの要求（可能な場合）
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc()
    }
  }

  /**
   * テクスチャが使用中かどうかをチェック
   */
  private isTextureInUse(key: string): boolean {
    // シーン内のすべてのゲームオブジェクトをチェック
    const gameObjects = this.scene.children.list
    
    for (const obj of gameObjects) {
      if ('texture' in obj && (obj as any).texture?.key === key) {
        return true
      }
    }
    
    return false
  }

  /**
   * バッテリー状態の監視
   */
  private monitorBatteryStatus(): void {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        // バッテリーレベルの監視
        const checkBatteryLevel = () => {
          if (battery.level < 0.2 && !battery.charging) {
            this.enableLowPowerMode()
          } else {
            this.disableLowPowerMode()
          }
        }
        
        // イベントリスナーの設定
        battery.addEventListener('levelchange', checkBatteryLevel)
        battery.addEventListener('chargingchange', checkBatteryLevel)
        
        // 初期チェック
        checkBatteryLevel()
      })
    }
  }

  /**
   * 低電力モードの有効化
   */
  private enableLowPowerMode(): void {
    if (this.isLowPowerMode) return
    
    this.isLowPowerMode = true
    this.setOptimizationLevel('low')
    
    // フレームレートを30fpsに制限
    this.scene.game.loop.targetFps = 30
    
    // 振動機能の無効化
    if ('vibrate' in navigator) {
      navigator.vibrate = () => false
    }
  }

  /**
   * 低電力モードの無効化
   */
  private disableLowPowerMode(): void {
    if (!this.isLowPowerMode) return
    
    this.isLowPowerMode = false
    
    // フレームレートを60fpsに戻す
    this.scene.game.loop.targetFps = 60
  }

  /**
   * ビジビリティ処理の設定
   */
  private setupVisibilityHandling(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // バックグラウンドでは最小限の処理
        this.scene.game.loop.sleep()
      } else {
        // フォアグラウンドで再開
        this.scene.game.loop.wake()
      }
    })
  }

  // 以下、各種最適化メソッド（実装は省略）
  private disableShadows(): void {}
  private reduceParticles(): void {}
  private reduceTextureQuality(): void {}
  private reduceAnimationFrameRate(): void {}
  private simplifyBackgroundEffects(): void {}
  private enableLimitedShadows(): void {}
  private enableLimitedParticles(): void {}
  private setMediumTextureQuality(): void {}
  private setNormalAnimationFrameRate(): void {}
  private enableAllVisualEffects(): void {}
  private setHighTextureQuality(): void {}
  private setSmoothAnimations(): void {}

  /**
   * パフォーマンスメトリクスの取得
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * 現在の最適化レベルを取得
   */
  public getOptimizationLevel(): 'low' | 'medium' | 'high' {
    return this.optimizationLevel
  }

  /**
   * 破棄処理
   */
  public destroy(): void {
    this.stopMonitoring()
    this.scene.events.off('preupdate', this.measureFPS, this)
  }
}