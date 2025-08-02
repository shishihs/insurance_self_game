import { ObjectPool, PooledCard, PooledGameState, PoolManager } from '../../optimization/ObjectPooling'
import { GameCache } from '../../optimization/CacheSystem'
import { BatchProcessor } from '../../optimization/BatchProcessor'

/**
 * パフォーマンス最適化システム - 大幅強化版
 */
export class PerformanceOptimizer {
  private readonly scene: Phaser.Scene
  private readonly updateQueue: (() => void)[] = []
  private frameSkipCounter: number = 0
  private readonly targetFPS: number = 60
  private lastFrameTime: number = 0
  private frameTimeThreshold: number = 16.67 // 60fps target
  
  // Phaserオブジェクトプール
  private textObjectPool: ObjectPool<Phaser.GameObjects.Text>
  private spriteObjectPool: ObjectPool<Phaser.GameObjects.Sprite>
  private particlePool: ObjectPool<Phaser.GameObjects.Particles.ParticleEmitter>
  private tweenPool: ObjectPool<Phaser.Tweens.Tween>
  
  // キャッシュシステム
  private gameCache: GameCache
  
  // バッチ処理
  private renderBatchProcessor: BatchProcessor<RenderTask, void>
  
  // パフォーマンス監視
  private performanceMonitor: PerformanceMonitor
  
  // GPU最適化設定
  private gpuOptimized: boolean = false
  private renderBounds: Phaser.Geom.Rectangle
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.initializeOptimization()
  }

  /**
   * フレームレート適応型更新
   */
  adaptiveUpdate(callback: () => void, priority: 'low' | 'medium' | 'high' = 'medium'): void {
    const currentTime = this.scene.time.now
    const deltaTime = currentTime - this.lastFrameTime

    // フレームレートが低い場合は低優先度のタスクをスキップ
    if (deltaTime > this.frameTimeThreshold * 1.5 && priority === 'low') {
      return
    }

    if (deltaTime > this.frameTimeThreshold * 2 && priority === 'medium') {
      this.frameSkipCounter++
      if (this.frameSkipCounter % 2 !== 0) {
        return
      }
    }

    callback()
    this.lastFrameTime = currentTime
  }

  /**
   * バッチ処理でUI更新を最適化
   */
  batchUIUpdate(updates: (() => void)[]): void {
    const batchSize = this.getOptimalBatchSize()
    
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize)
      
      this.scene.time.delayedCall(i * 16, () => {
        batch.forEach(update => { update(); })
      })
    }
  }

  /**
   * 最適なバッチサイズを算出
   */
  private getOptimalBatchSize(): number {
    const currentFPS = Math.min(this.scene.game.loop.actualFps || 60, 60)
    const fpsRatio = currentFPS / this.targetFPS
    
    // FPSが低い場合はバッチサイズを小さくする
    if (fpsRatio < 0.8) return 3
    if (fpsRatio < 0.9) return 5
    return 8
  }

  /**
   * 重要でないオブジェクトのカリング
   */
  frustumCulling(objects: Phaser.GameObjects.GameObject[], viewBounds: Phaser.Geom.Rectangle): void {
    objects.forEach(obj => {
      if ('x' in obj && 'y' in obj && 'width' in obj && 'height' in obj) {
        const objBounds = new Phaser.Geom.Rectangle(
          (obj as any).x - (obj as any).width / 2,
          (obj as any).y - (obj as any).height / 2,
          (obj as any).width,
          (obj as any).height
        )
        
        const isVisible = Phaser.Geom.Rectangle.Overlaps(viewBounds, objBounds)
        obj.setVisible(isVisible)
      }
    })
  }

  /**
   * アニメーション最適化
   */
  optimizeAnimations(): void {
    // 画面外のアニメーションを一時停止
    this.scene.tweens.getAllTweens().forEach(tween => {
      const targets = tween.targets
      targets.forEach(target => {
        if ('x' in target && 'y' in target) {
          const isOnScreen = this.isOnScreen(target)
          if (!isOnScreen) {
            tween.pause()
          } else if (tween.isPaused()) {
            tween.resume()
          }
        }
      })
    })
  }

  /**
   * オブジェクトが画面内にあるかチェック
   */
  private isOnScreen(obj: { x: number; y: number; width?: number; height?: number }): boolean {
    const camera = this.scene.cameras.main
    const bounds = camera.worldView
    
    const objX = obj.x
    const objY = obj.y
    const objWidth = obj.width || 0
    const objHeight = obj.height || 0
    
    return !(objX + objWidth < bounds.x || 
             objX > bounds.x + bounds.width ||
             objY + objHeight < bounds.y || 
             objY > bounds.y + bounds.height)
  }

  /**
   * 最適化システムの初期化
   */
  private initializeOptimization(): void {
    // オブジェクトプールの初期化
    this.initializeObjectPools()
    
    // キャッシュシステムの初期化
    this.gameCache = GameCache.getInstance()
    
    // バッチ処理の初期化
    this.renderBatchProcessor = new BatchProcessor<RenderTask, void>(
      async (tasks) => {
        tasks.forEach(task => { task.execute(); })
        return new Array(tasks.length).fill(undefined)
      },
      {
        maxBatchSize: 50,
        maxWaitTime: 16, // 1フレーム以内
        enableParallelProcessing: false // レンダリングは順序重要
      }
    )
    
    // パフォーマンス監視の初期化
    this.performanceMonitor = new PerformanceMonitor(this.scene)
    
    // レンダリング境界の設定
    this.renderBounds = new Phaser.Geom.Rectangle(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height)
    
    // GPU最適化の有効化
    this.enableGPUOptimization()
  }
  
  /**
   * オブジェクトプールの初期化
   */
  private initializeObjectPools(): void {
    // テキストオブジェクトプール
    this.textObjectPool = new ObjectPool<Phaser.GameObjects.Text>(
      () => this.scene.add.text(0, 0, '', { fontSize: '16px', color: '#000000' }).setVisible(false),
      (text) => {
        text.setText('')
        text.setVisible(false)
        text.setPosition(0, 0)
        text.setStyle({ fontSize: '16px', color: '#000000' })
      },
      50,
      200
    )
    
    // スプライトオブジェクトプール
    this.spriteObjectPool = new ObjectPool<Phaser.GameObjects.Sprite>(
      () => this.scene.add.sprite(0, 0, '__DEFAULT').setVisible(false),
      (sprite) => {
        sprite.setVisible(false)
        sprite.setPosition(0, 0)
        sprite.setScale(1)
        sprite.setRotation(0)
        sprite.setAlpha(1)
        sprite.clearTint()
      },
      100,
      500
    )
    
    // パーティクルプール
    this.particlePool = new ObjectPool<Phaser.GameObjects.Particles.ParticleEmitter>(
      () => {
        const emitter = this.scene.add.particles(0, 0, '__DEFAULT', {
          speed: { min: 100, max: 200 },
          lifespan: 300
        })
        emitter.stop()
        return emitter
      },
      (emitter) => {
        emitter.stop()
        emitter.setPosition(0, 0)
      },
      20,
      100
    )
    
    // Tweenプール（厳密にはプールできないがリサイクル用の管理）
    this.tweenPool = new ObjectPool<Phaser.Tweens.Tween>(
      () => this.scene.tweens.create({ targets: {}, duration: 0 }),
      (tween) => {
        tween.stop()
        tween.remove()
      },
      30,
      150
    )
    
    // プールマネージャーに登録
    const poolManager = PoolManager.getInstance()
    poolManager.registerPool('phaserText', this.textObjectPool)
    poolManager.registerPool('phaserSprite', this.spriteObjectPool)
    poolManager.registerPool('phaserParticle', this.particlePool)
    poolManager.registerPool('phaserTween', this.tweenPool)
  }
  
  /**
   * GPU最適化の有効化
   */
  private enableGPUOptimization(): void {
    if (!this.gpuOptimized && this.scene.game.renderer.type === Phaser.WEBGL) {
      const gl = (this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl
      
      // テクスチャフィルタリング最適化
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      
      // アンチエイリアス無効化（パフォーマンス優先）
      gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE)
      
      this.gpuOptimized = true
    }
  }
  
  /**
   * プールされたテキストオブジェクトを取得
   */
  acquireText(x: number, y: number, text: string, style?: Phaser.Types.GameObjects.Text.TextStyle): Phaser.GameObjects.Text {
    const textObj = this.textObjectPool.acquire()
    textObj.setPosition(x, y)
    textObj.setText(text)
    if (style) textObj.setStyle(style)
    textObj.setVisible(true)
    return textObj
  }
  
  /**
   * テキストオブジェクトをプールに返却
   */
  releaseText(textObj: Phaser.GameObjects.Text): void {
    this.textObjectPool.release(textObj)
  }
  
  /**
   * プールされたスプライトオブジェクトを取得
   */
  acquireSprite(x: number, y: number, texture: string, frame?: string | number): Phaser.GameObjects.Sprite {
    const sprite = this.spriteObjectPool.acquire()
    sprite.setPosition(x, y)
    sprite.setTexture(texture, frame)
    sprite.setVisible(true)
    return sprite
  }
  
  /**
   * スプライトオブジェクトをプールに返却
   */
  releaseSprite(sprite: Phaser.GameObjects.Sprite): void {
    this.spriteObjectPool.release(sprite)
  }
  
  /**
   * 高性能レンダリング（バッチ処理）
   */
  async batchRender(tasks: RenderTask[]): Promise<void> {
    await this.renderBatchProcessor.addItems(tasks)
  }
  
  /**
   * フラストラムカリング（改良版）
   */
  advancedFrustumCulling(objects: Phaser.GameObjects.GameObject[]): void {
    const camera = this.scene.cameras.main
    const bounds = camera.worldView
    
    // 境界を少し拡張してポップイン防止
    const expandedBounds = new Phaser.Geom.Rectangle(
      bounds.x - 100,
      bounds.y - 100,
      bounds.width + 200,
      bounds.height + 200
    )
    
    for (const obj of objects) {
      if ('getBounds' in obj) {
        const objBounds = (obj as any).getBounds()
        const isVisible = Phaser.Geom.Rectangle.Overlaps(expandedBounds, objBounds)
        
        if (obj.visible !== isVisible) {
          obj.setVisible(isVisible)
          
          // 非表示オブジェクトの更新処理を停止
          if ('setActive' in obj) {
            (obj as any).setActive(isVisible)
          }
        }
      }
    }
  }
  
  /**
   * テクスチャの動的解放（改良版）
   */
  cleanupUnusedTextures(): void {
    const textureManager = this.scene.textures
    const usedTextures = new Set<string>()
    
    // 現在使用中のテクスチャを特定
    this.scene.children.list.forEach(child => {
      if ('texture' in child && child.texture) {
        usedTextures.add((child as any).texture.key)
      }
    })
    
    // キャッシュされたテクスチャも考慮
    const cacheStats = this.gameCache.getAllStats()
    
    // 使用されていないテクスチャを段階的に解放
    const textureList = Array.from(textureManager.list.entries())
    for (const [key, texture] of textureList) {
      if (!usedTextures.has(key) && !key.startsWith('__') && !key.startsWith('_cached_')) {
        // 一定時間未使用のテクスチャのみ解放
        setTimeout(() => {
          if (!this.isTextureRecentlyUsed(key)) {
            console.log(`テクスチャ解放: ${key}`)
            textureManager.remove(key)
          }
        }, 5000) // 5秒後にチェック
      }
    }
  }
  
  /**
   * テクスチャが最近使用されたかチェック
   */
  private isTextureRecentlyUsed(textureKey: string): boolean {
    // 簡単な実装 - 実際はより精密な追跡が必要
    return this.scene.children.list.some(child => 
      'texture' in child && (child as any).texture?.key === textureKey
    )
  }

  /**
   * パフォーマンス統計の取得（拡張版）
   */
  getPerformanceStats() {
    const poolStats = PoolManager.getInstance().getAllStats()
    const cacheStats = this.gameCache.getAllStats()
    const monitorStats = this.performanceMonitor.getDetailedStats()
    
    return {
      // 基本パフォーマンス
      fps: Math.round(this.scene.game.loop.actualFps || 0),
      frameSkips: this.frameSkipCounter,
      activeObjects: this.scene.children.length,
      activeTweens: this.scene.tweens.getAllTweens().length,
      
      // メモリ使用量
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : null,
      
      // プール統計
      objectPools: {
        text: poolStats.phaserText || {},
        sprite: poolStats.phaserSprite || {},
        particle: poolStats.phaserParticle || {},
        tween: poolStats.phaserTween || {},
        efficiency: this.calculatePoolEfficiency(poolStats)
      },
      
      // キャッシュ統計
      cache: {
        hitRate: cacheStats.overall.totalHitRate,
        memoryUsage: cacheStats.overall.totalMemoryUsage,
        recommendations: cacheStats.overall.recommendations
      },
      
      // 詳細パフォーマンス
      detailed: monitorStats,
      
      // GPU統計
      gpu: {
        optimized: this.gpuOptimized,
        renderer: this.scene.game.renderer.type === Phaser.WEBGL ? 'WebGL' : 'Canvas',
        texturesLoaded: this.scene.textures.list.size
      }
    }
  }
  
  /**
   * プール効率の計算
   */
  private calculatePoolEfficiency(poolStats: Record<string, any>): number {
    let totalEfficiency = 0
    let poolCount = 0
    
    for (const stats of Object.values(poolStats)) {
      if (stats && typeof stats.efficiency === 'number') {
        totalEfficiency += stats.efficiency
        poolCount++
      }
    }
    
    return poolCount > 0 ? totalEfficiency / poolCount : 0
  }
  
  /**
   * 最適化設定の動的調整
   */
  optimizeSettings(): void {
    const stats = this.getPerformanceStats()
    
    // FPSが低い場合の対処
    if (stats.fps < 45) {
      this.frameTimeThreshold *= 1.2
      console.log('FPS低下検出 - 品質設定を下げます')
    } else if (stats.fps > 55) {
      this.frameTimeThreshold = Math.max(16.67, this.frameTimeThreshold * 0.95)
    }
    
    // メモリ使用量が多い場合の対処
    if (stats.memoryUsage && stats.memoryUsage.used > 200) {
      this.cleanupUnusedTextures()
      PoolManager.getInstance().clearAllPools()
      console.log('メモリ使用量過多 - クリーンアップを実行')
    }
    
    // プール効率が低い場合のリサイズ
    if (stats.objectPools.efficiency < 0.5) {
      this.resizeObjectPools()
    }
  }
  
  /**
   * オブジェクトプールのリサイズ
   */
  private resizeObjectPools(): void {
    const poolManager = PoolManager.getInstance()
    const stats = poolManager.getAllStats()
    
    for (const [poolName, poolStats] of Object.entries(stats)) {
      if (poolStats.hitRate < 50) {
        // ヒット率が低い場合はプールサイズを増やす
        const pool = poolManager.pools?.get(poolName)
        if (pool && 'resize' in pool) {
          (pool as any).resize(Math.min(poolStats.maxSize * 1.5, 1000))
        }
      }
    }
  }
  
  /**
   * リソースの完全クリーンアップ
   */
  cleanup(): void {
    // オブジェクトプールのクリア
    this.textObjectPool.clear()
    this.spriteObjectPool.clear()
    this.particlePool.clear()
    this.tweenPool.clear()
    
    // キャッシュのクリア
    this.gameCache.clearAll()
    
    // バッチプロセッサのクリア
    this.renderBatchProcessor.clear()
    
    // パフォーマンス監視の停止
    this.performanceMonitor.stop()
    
    // 未使用テクスチャの解放
    this.cleanupUnusedTextures()
  }
}

/**
 * レンダリングタスクインターフェース
 */
interface RenderTask {
  execute(): void
  priority?: number
}

/**
 * パフォーマンス監視クラス
 */
class PerformanceMonitor {
  private readonly scene: Phaser.Scene
  private readonly frameTimeHistory: number[] = []
  private readonly memoryHistory: number[] = []
  private isRunning: boolean = false
  private intervalId: NodeJS.Timeout | null = null
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.start()
  }
  
  start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    this.intervalId = setInterval(() => {
      this.collectMetrics()
    }, 1000) // 1秒ごとに収集
  }
  
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }
  
  private collectMetrics(): void {
    // フレーム時間の記録
    const currentFPS = this.scene.game.loop.actualFps || 0
    this.frameTimeHistory.push(1000 / Math.max(currentFPS, 1))
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift()
    }
    
    // メモリ使用量の記録
    if ((performance as any).memory) {
      const memoryUsed = (performance as any).memory.usedJSHeapSize / 1024 / 1024
      this.memoryHistory.push(memoryUsed)
      if (this.memoryHistory.length > 60) {
        this.memoryHistory.shift()
      }
    }
  }
  
  getDetailedStats() {
    const avgFrameTime = this.frameTimeHistory.length > 0 ? 
      this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length : 0
    
    const avgMemory = this.memoryHistory.length > 0 ?
      this.memoryHistory.reduce((a, b) => a + b, 0) / this.memoryHistory.length : 0
    
    return {
      averageFrameTime: Math.round(avgFrameTime * 100) / 100,
      averageFPS: Math.round(1000 / Math.max(avgFrameTime, 1)),
      averageMemoryUsage: Math.round(avgMemory * 100) / 100,
      frameTimeStability: this.calculateStability(this.frameTimeHistory),
      memoryStability: this.calculateStability(this.memoryHistory),
      isStable: this.isPerformanceStable()
    }
  }
  
  private calculateStability(history: number[]): number {
    if (history.length < 2) return 1
    
    const mean = history.reduce((a, b) => a + b, 0) / history.length
    const variance = history.reduce((acc, val) => acc + (val - mean)**2, 0) / history.length
    const standardDeviation = Math.sqrt(variance)
    
    // 安定性スコア (0-1, 1が最も安定)
    return Math.max(0, 1 - (standardDeviation / mean))
  }
  
  private isPerformanceStable(): boolean {
    const stats = this.getDetailedStats()
    return stats.frameTimeStability > 0.8 && stats.memoryStability > 0.9
  }
}