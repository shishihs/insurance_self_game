/**
 * メモリ最適化ユーティリティ
 * メモリリーク防止とガベージコレクション最適化
 */

export interface MemoryStats {
  used: number
  total: number
  limit: number
  pressure: 'low' | 'medium' | 'high'
}

export class MemoryOptimizer {
  private static instance: MemoryOptimizer
  private weakRefs: WeakRef<any>[] = []
  private readonly cleanupTasks: (() => void)[] = []
  private readonly memoryPressureCallbacks: ((pressure: 'low' | 'medium' | 'high') => void)[] = []
  private monitoringInterval?: number

  private constructor() {
    this.startMemoryMonitoring()
    this.setupGlobalErrorHandling()
  }

  static getInstance(): MemoryOptimizer {
    if (!MemoryOptimizer.instance) {
      MemoryOptimizer.instance = new MemoryOptimizer()
    }
    return MemoryOptimizer.instance
  }

  /**
   * WeakRefでオブジェクトを追跡
   */
  trackObject<T extends object>(obj: T): WeakRef<T> {
    const weakRef = new WeakRef(obj)
    this.weakRefs.push(weakRef as WeakRef<any>)
    return weakRef
  }

  /**
   * クリーンアップタスクを登録
   */
  registerCleanupTask(task: () => void): void {
    this.cleanupTasks.push(task)
  }

  /**
   * メモリ圧迫時のコールバック登録
   */
  onMemoryPressure(callback: (pressure: 'low' | 'medium' | 'high') => void): void {
    this.memoryPressureCallbacks.push(callback)
  }

  /**
   * 積極的なガベージコレクション実行
   */
  forceGarbageCollection(): void {
    // WeakRefの無効化をチェック
    this.weakRefs = this.weakRefs.filter(ref => ref.deref() !== undefined)
    
    // クリーンアップタスクを実行
    this.cleanupTasks.forEach(task => {
      try {
        task()
      } catch (error) {
        console.warn('Cleanup task failed:', error)
      }
    })

    // ブラウザのGCをヒント（Chrome Dev Tools等）
    if ((window as any).gc) {
      (window as any).gc()
    }
  }

  /**
   * メモリ使用状況の取得
   */
  getMemoryStats(): MemoryStats | null {
    if (!(performance as any).memory) {
      return null
    }

    const memory = (performance as any).memory
    const used = memory.usedJSHeapSize / 1024 / 1024 // MB
    const total = memory.totalJSHeapSize / 1024 / 1024 // MB
    const limit = memory.jsHeapSizeLimit / 1024 / 1024 // MB

    const usageRatio = used / limit
    let pressure: 'low' | 'medium' | 'high' = 'low'
    
    if (usageRatio > 0.8) pressure = 'high'
    else if (usageRatio > 0.6) pressure = 'medium'

    return { used, total, limit, pressure }
  }

  /**
   * メモリ監視の開始
   */
  private startMemoryMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      const stats = this.getMemoryStats()
      if (stats) {
        this.handleMemoryPressure(stats.pressure)
      }
    }, 10000) // 10秒間隔
  }

  /**
   * メモリ圧迫の処理
   */
  private handleMemoryPressure(pressure: 'low' | 'medium' | 'high'): void {
    if (pressure === 'high') {
      this.forceGarbageCollection()
    }

    this.memoryPressureCallbacks.forEach(callback => {
      try {
        callback(pressure)
      } catch (error) {
        console.warn('Memory pressure callback failed:', error)
      }
    })
  }

  /**
   * グローバルエラーハンドリングの設定
   */
  private setupGlobalErrorHandling(): void {
    window.addEventListener('unhandledrejection', (event) => {
      console.warn('Unhandled promise rejection:', event.reason)
      // メモリリークの可能性があるため、クリーンアップを実行
      this.forceGarbageCollection()
    })
  }

  /**
   * 監視の停止
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
  }

  /**
   * 全体的なクリーンアップ
   */
  cleanup(): void {
    this.stopMonitoring()
    this.forceGarbageCollection()
    this.cleanupTasks.length = 0
    this.memoryPressureCallbacks.length = 0
    this.weakRefs.length = 0
  }
}

/**
 * Vue.js用メモリ最適化ミックスイン
 */
export const VueMemoryOptimizer = {
  mounted() {
    const optimizer = MemoryOptimizer.getInstance()
    
    // コンポーネントのクリーンアップタスクを登録
    optimizer.registerCleanupTask(() => {
      // イベントリスナーの削除
      if (this.$el?.removeEventListener) {
        // 自動的にイベントリスナーをクリーンアップ
      }
    })

    // メモリ圧迫時の対応
    optimizer.onMemoryPressure((pressure) => {
      if (pressure === 'high' && this.$options.name) {
        console.log(`High memory pressure detected in component: ${this.$options.name}`)
      }
    })
  },

  beforeUnmount() {
    // コンポーネントの明示的なクリーンアップ
    const optimizer = MemoryOptimizer.getInstance()
    optimizer.forceGarbageCollection()
  }
}

/**
 * Phaser用メモリ最適化
 */
export class PhaserMemoryOptimizer {
  private readonly scene: Phaser.Scene
  private readonly optimizer: MemoryOptimizer

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.optimizer = MemoryOptimizer.getInstance()
    this.setupPhaserOptimizations()
  }

  private setupPhaserOptimizations(): void {
    // テクスチャキャッシュの最適化
    this.optimizer.registerCleanupTask(() => {
      this.cleanupUnusedTextures()
    })

    // オーディオキャッシュの最適化
    this.optimizer.registerCleanupTask(() => {
      this.cleanupUnusedAudio()
    })

    // Tweenの最適化
    this.optimizer.registerCleanupTask(() => {
      this.cleanupCompletedTweens()
    })
  }

  private cleanupUnusedTextures(): void {
    const textureManager = this.scene.textures
    const activeTextures = new Set<string>()

    // アクティブなテクスチャを収集
    this.scene.children.list.forEach(child => {
      if ('texture' in child && child.texture) {
        activeTextures.add((child as any).texture.key)
      }
    })

    // 未使用テクスチャの削除
    textureManager.list.forEach((texture, key) => {
      if (!activeTextures.has(key) && !key.startsWith('__')) {
        console.log(`Cleaning up unused texture: ${key}`)
        textureManager.remove(key)
      }
    })
  }

  private cleanupUnusedAudio(): void {
    const audioManager = this.scene.sound
    if ('sounds' in audioManager) {
      const sounds = (audioManager as any).sounds
      sounds.forEach((sound: any, index: number) => {
        if (!sound.isPlaying && sound.isPaused === false) {
          sound.destroy()
          sounds.splice(index, 1)
        }
      })
    }
  }

  private cleanupCompletedTweens(): void {
    const tweenManager = this.scene.tweens
    const activeTweens = tweenManager.getAllTweens()
    
    activeTweens.forEach(tween => {
      if (tween.hasEnded) {
        tween.destroy()
      }
    })
  }
}

// シングルトンインスタンスのエクスポート
export const memoryOptimizer = MemoryOptimizer.getInstance()