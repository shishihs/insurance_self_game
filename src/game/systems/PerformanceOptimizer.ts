/**
 * パフォーマンス最適化システム
 */
export class PerformanceOptimizer {
  private scene: Phaser.Scene
  private updateQueue: (() => void)[] = []
  private frameSkipCounter: number = 0
  private targetFPS: number = 60
  private lastFrameTime: number = 0
  private frameTimeThreshold: number = 16.67 // 60fps target

  constructor(scene: Phaser.Scene) {
    this.scene = scene
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
        batch.forEach(update => update())
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
          const isOnScreen = this.isOnScreen(target as any)
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
   * テクスチャの動的解放
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
    
    // 使用されていないテクスチャを解放
    textureManager.list.forEach((texture, key) => {
      if (!usedTextures.has(key) && !key.startsWith('__')) {
        // システムテクスチャ以外で未使用のものを解放候補とする
        console.log(`未使用テクスチャ検出: ${key}`)
      }
    })
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats() {
    return {
      fps: Math.round(this.scene.game.loop.actualFps || 0),
      frameSkips: this.frameSkipCounter,
      activeObjects: this.scene.children.length,
      activeTweens: this.scene.tweens.getAllTweens().length,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024)
      } : null
    }
  }
}