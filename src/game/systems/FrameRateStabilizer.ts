/**
 * フレームレート安定化システム
 * 
 * 主な機能:
 * - 適応的品質調整
 * - アニメーション最適化
 * - レンダリング負荷分散
 * - フレームスキップ制御
 */

interface FrameRateConfig {
  targetFPS: number
  minFPS: number
  maxFPS: number
  adaptiveQuality: boolean
  frameSkipThreshold: number
  qualityAdjustmentSpeed: number
}

interface QualitySettings {
  renderScale: number
  particleDensity: number
  shadowQuality: number
  antialiasing: boolean
  textureFiltering: number
  animationFrameRate: number
}

interface FrameMetrics {
  currentFPS: number
  averageFPS: number
  frameTimeVariance: number
  frameDrops: number
  qualityLevel: number
  isStable: boolean
}

export class FrameRateStabilizer {
  private readonly scene: Phaser.Scene
  private readonly config: FrameRateConfig
  private qualitySettings: QualitySettings
  
  // フレーム測定
  private readonly frameHistory: number[] = []
  private readonly maxFrameHistory: number = 120 // 2秒分（60fps）
  private lastFrameTime: number = 0
  private frameDropCounter: number = 0
  
  // 適応的品質調整
  private currentQualityLevel: number = 1.0
  private qualityAdjustmentCooldown: number = 0
  private readonly qualityLevels: QualitySettings[] = []
  
  // アニメーション制御
  private readonly animationQueues: Map<string, (() => void)[]> = new Map()
  private currentAnimationBudget: number = 16.67 // 60fps target
  
  // レンダリング制御
  private frameSkipEnabled: boolean = false
  private frameSkipCounter: number = 0
  
  constructor(scene: Phaser.Scene, config?: Partial<FrameRateConfig>) {
    this.scene = scene
    this.config = {
      targetFPS: 60,
      minFPS: 30,
      maxFPS: 144,
      adaptiveQuality: true,
      frameSkipThreshold: 25,
      qualityAdjustmentSpeed: 0.1,
      ...config
    }
    
    this.qualitySettings = this.createDefaultQualitySettings()
    this.initializeQualityLevels()
    this.setupFrameRateMonitoring()
  }

  /**
   * デフォルト品質設定の作成
   */
  private createDefaultQualitySettings(): QualitySettings {
    return {
      renderScale: 1.0,
      particleDensity: 1.0,
      shadowQuality: 1.0,
      antialiasing: true,
      textureFiltering: 1.0,
      animationFrameRate: 60
    }
  }

  /**
   * 品質レベルの初期化
   */
  private initializeQualityLevels(): void {
    // 高品質 (レベル 1.0)
    this.qualityLevels.push({
      renderScale: 1.0,
      particleDensity: 1.0,
      shadowQuality: 1.0,
      antialiasing: true,
      textureFiltering: 1.0,
      animationFrameRate: 60
    })
    
    // 中品質 (レベル 0.75)
    this.qualityLevels.push({
      renderScale: 0.9,
      particleDensity: 0.8,
      shadowQuality: 0.75,
      antialiasing: true,
      textureFiltering: 0.8,
      animationFrameRate: 60
    })
    
    // 低品質 (レベル 0.5)
    this.qualityLevels.push({
      renderScale: 0.8,
      particleDensity: 0.6,
      shadowQuality: 0.5,
      antialiasing: false,
      textureFiltering: 0.6,
      animationFrameRate: 30
    })
    
    // 最低品質 (レベル 0.25)
    this.qualityLevels.push({
      renderScale: 0.7,
      particleDensity: 0.3,
      shadowQuality: 0.25,
      antialiasing: false,
      textureFiltering: 0.4,
      animationFrameRate: 30
    })
  }

  /**
   * フレームレート監視の設定
   */
  private setupFrameRateMonitoring(): void {
    this.scene.events.on('preupdate', this.onPreUpdate, this)
    this.scene.events.on('postupdate', this.onPostUpdate, this)
  }

  /**
   * プリアップデートフック
   */
  private onPreUpdate(): void {
    const currentTime = performance.now()
    
    if (this.lastFrameTime > 0) {
      const deltaTime = currentTime - this.lastFrameTime
      const currentFPS = 1000 / deltaTime
      
      this.updateFrameHistory(currentFPS)
      this.checkFrameStability()
      
      if (this.config.adaptiveQuality) {
        this.adjustQualityIfNeeded()
      }
    }
    
    this.lastFrameTime = currentTime
  }

  /**
   * ポストアップデートフック
   */
  private onPostUpdate(): void {
    // アニメーション処理の負荷分散
    this.processAnimationQueues()
    
    // クールダウンタイマーの更新
    if (this.qualityAdjustmentCooldown > 0) {
      this.qualityAdjustmentCooldown--
    }
  }

  /**
   * フレーム履歴の更新
   */
  private updateFrameHistory(fps: number): void {
    this.frameHistory.push(fps)
    
    if (this.frameHistory.length > this.maxFrameHistory) {
      this.frameHistory.shift()
    }
    
    // フレームドロップの検出
    if (fps < this.config.targetFPS * 0.8) {
      this.frameDropCounter++
    }
  }

  /**
   * フレーム安定性のチェック
   */
  private checkFrameStability(): void {
    if (this.frameHistory.length < 30) return // 十分なデータが必要
    
    const metrics = this.calculateFrameMetrics()
    
    // フレームスキップの制御
    if (metrics.currentFPS < this.config.frameSkipThreshold) {
      this.enableFrameSkip()
    } else if (metrics.currentFPS > this.config.targetFPS * 0.9) {
      this.disableFrameSkip()
    }
  }

  /**
   * 必要に応じて品質調整
   */
  private adjustQualityIfNeeded(): void {
    if (this.qualityAdjustmentCooldown > 0) return
    
    const metrics = this.calculateFrameMetrics()
    
    // 品質を下げる条件
    if (metrics.averageFPS < this.config.targetFPS * 0.85 && this.currentQualityLevel > 0.25) {
      this.decreaseQuality()
      this.qualityAdjustmentCooldown = 180 // 3秒間のクールダウン
    }
    // 品質を上げる条件
    else if (metrics.averageFPS > this.config.targetFPS * 0.95 && 
             metrics.isStable && 
             this.currentQualityLevel < 1.0) {
      this.increaseQuality()
      this.qualityAdjustmentCooldown = 300 // 5秒間のクールダウン
    }
  }

  /**
   * 品質を下げる
   */
  private decreaseQuality(): void {
    this.currentQualityLevel = Math.max(0.25, this.currentQualityLevel - this.config.qualityAdjustmentSpeed)
    this.applyQualitySettings()
    console.log(`品質レベル低下: ${this.currentQualityLevel.toFixed(2)}`)
  }

  /**
   * 品質を上げる
   */
  private increaseQuality(): void {
    this.currentQualityLevel = Math.min(1.0, this.currentQualityLevel + this.config.qualityAdjustmentSpeed)
    this.applyQualitySettings()
    console.log(`品質レベル向上: ${this.currentQualityLevel.toFixed(2)}`)
  }

  /**
   * 品質設定の適用
   */
  private applyQualitySettings(): void {
    const targetLevel = this.findQualityLevel(this.currentQualityLevel)
    this.qualitySettings = { ...targetLevel }
    
    // レンダースケールの適用
    if (this.scene.cameras.main) {
      this.scene.cameras.main.setZoom(this.qualitySettings.renderScale)
    }
    
    // パーティクル密度の調整
    this.adjustParticleSystems()
    
    // アニメーションフレームレートの調整
    this.adjustAnimationFrameRate()
    
    // テクスチャフィルタリングの調整
    this.adjustTextureFiltering()
  }

  /**
   * 品質レベルの検索
   */
  private findQualityLevel(level: number): QualitySettings {
    if (level >= 0.875) return this.qualityLevels[0] // 高品質
    if (level >= 0.625) return this.qualityLevels[1] // 中品質
    if (level >= 0.375) return this.qualityLevels[2] // 低品質
    return this.qualityLevels[3] // 最低品質
  }

  /**
   * パーティクルシステムの調整
   */
  private adjustParticleSystems(): void {
    const particles = this.scene.children.list.filter(child => 
      child instanceof Phaser.GameObjects.Particles.ParticleEmitter
    ) as Phaser.GameObjects.Particles.ParticleEmitter[]
    
    particles.forEach(emitter => {
      const baseMaxParticles = (emitter as any).defaultMaxParticles || 100
      const newMaxParticles = Math.floor(baseMaxParticles * this.qualitySettings.particleDensity)
      emitter.setQuantity(newMaxParticles)
    })
  }

  /**
   * アニメーションフレームレートの調整
   */
  private adjustAnimationFrameRate(): void {
    // Tweenのタイムスケール調整
    const tweens = this.scene.tweens.getAllTweens()
    tweens.forEach(tween => {
      if (this.qualitySettings.animationFrameRate < 60) {
        tween.timeScale = 0.5 // 30fps相当
      } else {
        tween.timeScale = 1.0 // 60fps
      }
    })
  }

  /**
   * テクスチャフィルタリングの調整
   */
  private adjustTextureFiltering(): void {
    const renderer = this.scene.game.renderer
    
    if (renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
      const gl = renderer.gl
      
      if (this.qualitySettings.textureFiltering < 0.8) {
        // 低品質時は線形フィルタリングのみ
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      } else {
        // 高品質時はミップマップ使用
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      }
    }
  }

  /**
   * フレームスキップの有効化
   */
  private enableFrameSkip(): void {
    if (this.frameSkipEnabled) return
    
    this.frameSkipEnabled = true
    console.log('フレームスキップ有効化')
  }

  /**
   * フレームスキップの無効化
   */
  private disableFrameSkip(): void {
    if (!this.frameSkipEnabled) return
    
    this.frameSkipEnabled = false
    this.frameSkipCounter = 0
    console.log('フレームスキップ無効化')
  }

  /**
   * アニメーションキューの処理
   */
  private processAnimationQueues(): void {
    const startTime = performance.now()
    const budget = this.currentAnimationBudget
    
    for (const [priority, queue] of this.animationQueues) {
      while (queue.length > 0 && (performance.now() - startTime) < budget) {
        const animation = queue.shift()
        if (animation) {
          try {
            animation()
          } catch (error) {
            console.error('アニメーション処理エラー:', error)
          }
        }
      }
      
      // 時間切れの場合は次のフレームに持ち越し
      if (queue.length > 0) {
        break
      }
    }
  }

  /**
   * アニメーションをキューに追加
   */
  public queueAnimation(animation: () => void, priority: string = 'normal'): void {
    if (!this.animationQueues.has(priority)) {
      this.animationQueues.set(priority, [])
    }
    
    this.animationQueues.get(priority)!.push(animation)
  }

  /**
   * フレームメトリクスの計算
   */
  public calculateFrameMetrics(): FrameMetrics {
    if (this.frameHistory.length === 0) {
      return {
        currentFPS: 0,
        averageFPS: 0,
        frameTimeVariance: 0,
        frameDrops: 0,
        qualityLevel: this.currentQualityLevel,
        isStable: false
      }
    }
    
    const currentFPS = this.frameHistory[this.frameHistory.length - 1]
    const averageFPS = this.frameHistory.reduce((sum, fps) => sum + fps, 0) / this.frameHistory.length
    
    // 分散の計算
    const variance = this.frameHistory.reduce((sum, fps) => {
      return sum + Math.pow(fps - averageFPS, 2)
    }, 0) / this.frameHistory.length
    
    const frameTimeVariance = Math.sqrt(variance)
    
    // 安定性の判定（分散が小さく、平均FPSが目標の85%以上）
    const isStable = frameTimeVariance < 5 && averageFPS > this.config.targetFPS * 0.85
    
    return {
      currentFPS: Math.round(currentFPS),
      averageFPS: Math.round(averageFPS),
      frameTimeVariance: Math.round(frameTimeVariance * 100) / 100,
      frameDrops: this.frameDropCounter,
      qualityLevel: this.currentQualityLevel,
      isStable
    }
  }

  /**
   * 現在の品質設定を取得
   */
  public getCurrentQualitySettings(): QualitySettings {
    return { ...this.qualitySettings }
  }

  /**
   * 品質レベルを手動設定
   */
  public setQualityLevel(level: number): void {
    this.currentQualityLevel = Math.max(0.25, Math.min(1.0, level))
    this.applyQualitySettings()
  }

  /**
   * フレームスキップの状態確認
   */
  public shouldSkipFrame(): boolean {
    if (!this.frameSkipEnabled) return false
    
    this.frameSkipCounter++
    
    // 2フレームに1回スキップ
    if (this.frameSkipCounter % 2 === 0) {
      return true
    }
    
    return false
  }

  /**
   * アニメーション予算の調整
   */
  public adjustAnimationBudget(targetFPS: number): void {
    this.currentAnimationBudget = (1000 / targetFPS) * 0.8 // 80%を上限とする
  }

  /**
   * 統計のリセット
   */
  public resetStats(): void {
    this.frameHistory.length = 0
    this.frameDropCounter = 0
    this.frameSkipCounter = 0
  }

  /**
   * クリーンアップ
   */
  public cleanup(): void {
    this.scene.events.off('preupdate', this.onPreUpdate, this)
    this.scene.events.off('postupdate', this.onPostUpdate, this)
    
    this.animationQueues.clear()
    this.frameHistory.length = 0
  }
}