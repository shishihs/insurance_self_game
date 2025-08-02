/**
 * 統合パフォーマンス最適化システム
 * 
 * 全ての最適化システムを統合管理:
 * - PerformanceOptimizer (基本最適化)
 * - WebGLOptimizer (GPU最適化)
 * - FrameRateStabilizer (フレームレート安定化)
 * - MobilePerformanceManager (モバイル最適化)
 * - PerformanceBenchmark (ベンチマーク)
 */

import { PerformanceOptimizer } from './PerformanceOptimizer'
import { WebGLOptimizer } from './WebGLOptimizer'
import { FrameRateStabilizer } from './FrameRateStabilizer'
import { MobilePerformanceManager } from './MobilePerformanceManager'
import { PerformanceBenchmark } from './PerformanceBenchmark'

interface IntegratedPerformanceConfig {
  enableWebGLOptimization: boolean
  enableFrameRateStabilization: boolean
  enableMobileOptimization: boolean
  enableBenchmarking: boolean
  autoOptimization: boolean
  performanceMonitoring: boolean
  adaptiveQuality: boolean
}

interface SystemStatus {
  isInitialized: boolean
  currentOptimizationLevel: string
  activeOptimizations: string[]
  performanceGrade: string
  lastBenchmarkScore: number
}

export class IntegratedPerformanceSystem {
  private readonly scene: Phaser.Scene
  private readonly config: IntegratedPerformanceConfig
  
  // サブシステム
  private performanceOptimizer?: PerformanceOptimizer
  private webglOptimizer?: WebGLOptimizer
  private frameRateStabilizer?: FrameRateStabilizer
  private mobilePerformanceManager?: MobilePerformanceManager
  private performanceBenchmark?: PerformanceBenchmark
  
  // 統合制御
  private isInitialized: boolean = false
  private monitoringInterval?: number
  private lastPerformanceCheck: number = 0
  private performanceHistory: number[] = []
  
  // 自動最適化
  private autoOptimizationEnabled: boolean = true
  private optimizationCooldown: number = 0
  
  constructor(scene: Phaser.Scene, config?: Partial<IntegratedPerformanceConfig>) {
    this.scene = scene
    this.config = {
      enableWebGLOptimization: true,
      enableFrameRateStabilization: true,
      enableMobileOptimization: true,
      enableBenchmarking: true,
      autoOptimization: true,
      performanceMonitoring: true,
      adaptiveQuality: true,
      ...config
    }
    
    this.initializeSystem()
  }

  /**
   * システム初期化
   */
  private async initializeSystem(): Promise<void> {
    console.log('統合パフォーマンスシステムを初期化中...')
    
    try {
      // 基本パフォーマンス最適化（常に有効）
      this.performanceOptimizer = new PerformanceOptimizer(this.scene)
      
      // WebGL最適化
      if (this.config.enableWebGLOptimization) {
        this.webglOptimizer = this.performanceOptimizer.getWebGLOptimizer()
      }
      
      // フレームレート安定化
      if (this.config.enableFrameRateStabilization) {
        this.frameRateStabilizer = new FrameRateStabilizer(this.scene, {
          targetFPS: 60,
          adaptiveQuality: this.config.adaptiveQuality
        })
      }
      
      // モバイル最適化
      if (this.config.enableMobileOptimization) {
        this.mobilePerformanceManager = new MobilePerformanceManager(this.scene)
      }
      
      // ベンチマーク
      if (this.config.enableBenchmarking) {
        this.performanceBenchmark = new PerformanceBenchmark(this.scene)
      }
      
      // 監視開始
      if (this.config.performanceMonitoring) {
        this.startPerformanceMonitoring()
      }
      
      this.isInitialized = true
      console.log('統合パフォーマンスシステム初期化完了')
      
    } catch (error) {
      console.error('パフォーマンスシステム初期化エラー:', error)
    }
  }

  /**
   * パフォーマンス監視開始
   */
  private startPerformanceMonitoring(): void {
    this.monitoringInterval = window.setInterval(() => {
      this.performPerformanceCheck()
    }, 5000) // 5秒ごと
  }

  /**
   * パフォーマンスチェック実行
   */
  private performPerformanceCheck(): void {
    if (!this.isInitialized) return
    
    const currentFPS = this.scene.game.loop.actualFps || 0
    this.performanceHistory.push(currentFPS)
    
    // 履歴を最新50件に制限
    if (this.performanceHistory.length > 50) {
      this.performanceHistory.shift()
    }
    
    // 自動最適化の実行
    if (this.config.autoOptimization && this.optimizationCooldown <= 0) {
      this.executeAutoOptimization()
    }
    
    if (this.optimizationCooldown > 0) {
      this.optimizationCooldown--
    }
    
    this.lastPerformanceCheck = Date.now()
  }

  /**
   * 自動最適化の実行
   */
  private executeAutoOptimization(): void {
    const avgFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length
    const targetFPS = 60
    
    // パフォーマンスが低下している場合
    if (avgFPS < targetFPS * 0.8) {
      console.log('パフォーマンス低下を検出 - 自動最適化を実行')
      
      // フレームレート安定化の調整
      if (this.frameRateStabilizer) {
        this.frameRateStabilizer.adjustAnimationBudget(avgFPS)
      }
      
      // モバイル最適化レベルの調整
      if (this.mobilePerformanceManager) {
        if (avgFPS < 30) {
          this.mobilePerformanceManager.setOptimizationLevel('low')
        } else if (avgFPS < 45) {
          this.mobilePerformanceManager.setOptimizationLevel('medium')
        }
      }
      
      // WebGL最適化の調整
      if (this.webglOptimizer) {
        this.webglOptimizer.adjustOptimizationLevel(avgFPS)
      }
      
      this.optimizationCooldown = 12 // 1分間のクールダウン
    }
    // パフォーマンスが良好な場合
    else if (avgFPS > targetFPS * 0.95) {
      // 品質向上の余地があるかチェック
      if (this.mobilePerformanceManager) {
        const currentLevel = this.mobilePerformanceManager.getOptimizationLevel()
        if (currentLevel !== 'high') {
          console.log('パフォーマンス良好 - 品質を向上')
          this.mobilePerformanceManager.setOptimizationLevel('high')
          this.optimizationCooldown = 6 // 30秒間のクールダウン
        }
      }
    }
  }

  /**
   * 初期ベンチマークの実行
   */
  public async runInitialBenchmark(): Promise<any> {
    if (!this.performanceBenchmark) {
      console.warn('ベンチマークが無効になっています')
      return null
    }
    
    console.log('初期ベンチマークを実行...')
    
    const result = await this.performanceBenchmark.runComprehensiveBenchmark({
      duration: 15, // 短時間で実行
      iterations: 1
    })
    
    // 結果に基づいて初期設定を調整
    this.applyBenchmarkResults(result)
    
    // 結果を保存
    this.performanceBenchmark.saveBenchmarkResult(result)
    
    return result
  }

  /**
   * ベンチマーク結果の適用
   */
  private applyBenchmarkResults(result: any): void {
    const score = result.overall.score
    const recommended = result.overall.recommendedSettings
    
    console.log(`ベンチマークスコア: ${score}, 推奨設定: ${recommended}`)
    
    // 推奨設定を適用
    if (this.mobilePerformanceManager) {
      this.mobilePerformanceManager.setOptimizationLevel(recommended as any)
    }
    
    if (this.frameRateStabilizer) {
      if (recommended === 'low') {
        this.frameRateStabilizer.setQualityLevel(0.5)
      } else if (recommended === 'medium') {
        this.frameRateStabilizer.setQualityLevel(0.75)
      } else {
        this.frameRateStabilizer.setQualityLevel(1.0)
      }
    }
  }

  /**
   * ストレステストの実行
   */
  public async runStressTest(): Promise<any> {
    if (!this.performanceBenchmark) {
      console.warn('ベンチマークが無効になっています')
      return null
    }
    
    return await this.performanceBenchmark.runStressTest({
      objects: 1000,
      particles: 10,
      animations: 50,
      duration: 10
    })
  }

  /**
   * 包括的なパフォーマンス統計の取得
   */
  public getComprehensiveStats(): any {
    const stats: any = {
      system: this.getSystemStatus(),
      timestamp: Date.now()
    }
    
    // 基本パフォーマンス統計
    if (this.performanceOptimizer) {
      stats.performance = this.performanceOptimizer.getPerformanceStats()
    }
    
    // フレームレート統計
    if (this.frameRateStabilizer) {
      stats.frameRate = this.frameRateStabilizer.calculateFrameMetrics()
      stats.quality = this.frameRateStabilizer.getCurrentQualitySettings()
    }
    
    // モバイル統計
    if (this.mobilePerformanceManager) {
      stats.mobile = this.mobilePerformanceManager.getExtendedPerformanceInfo()
    }
    
    // WebGL統計
    if (this.webglOptimizer) {
      stats.webgl = this.webglOptimizer.getPerformanceStats()
    }
    
    // パフォーマンス履歴
    stats.history = {
      recent: this.performanceHistory.slice(-10),
      average: this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length,
      trend: this.calculatePerformanceTrend()
    }
    
    return stats
  }

  /**
   * システム状態の取得
   */
  public getSystemStatus(): SystemStatus {
    const activeOptimizations: string[] = []
    
    if (this.performanceOptimizer) activeOptimizations.push('基本最適化')
    if (this.webglOptimizer) activeOptimizations.push('WebGL最適化')
    if (this.frameRateStabilizer) activeOptimizations.push('フレームレート安定化')
    if (this.mobilePerformanceManager) activeOptimizations.push('モバイル最適化')
    
    const currentLevel = this.mobilePerformanceManager?.getOptimizationLevel() || 'medium'
    
    return {
      isInitialized: this.isInitialized,
      currentOptimizationLevel: currentLevel,
      activeOptimizations,
      performanceGrade: this.calculateCurrentGrade(),
      lastBenchmarkScore: this.getLastBenchmarkScore()
    }
  }

  /**
   * パフォーマンストレンドの計算
   */
  private calculatePerformanceTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.performanceHistory.length < 10) return 'stable'
    
    const recent = this.performanceHistory.slice(-5)
    const earlier = this.performanceHistory.slice(-10, -5)
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
    
    const difference = recentAvg - earlierAvg
    
    if (difference > 2) return 'improving'
    if (difference < -2) return 'degrading'
    return 'stable'
  }

  /**
   * 現在のパフォーマンスグレードの計算
   */
  private calculateCurrentGrade(): string {
    const avgFPS = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length
    
    if (avgFPS >= 55) return 'A'
    if (avgFPS >= 45) return 'B'
    if (avgFPS >= 35) return 'C'
    if (avgFPS >= 25) return 'D'
    return 'F'
  }

  /**
   * 最後のベンチマークスコアを取得
   */
  private getLastBenchmarkScore(): number {
    if (!this.performanceBenchmark) return 0
    
    const results = this.performanceBenchmark.getSavedResults()
    return results.length > 0 ? results[0].result.overall.score : 0
  }

  /**
   * パフォーマンス最適化の手動実行
   */
  public optimizeNow(): void {
    console.log('手動最適化を実行中...')
    
    if (this.performanceOptimizer) {
      this.performanceOptimizer.optimizeSettings()
    }
    
    if (this.frameRateStabilizer) {
      this.frameRateStabilizer.resetStats()
    }
    
    // ガベージコレクションの実行（可能な場合）
    if ('gc' in window) {
      (window as any).gc()
    }
    
    console.log('手動最適化完了')
  }

  /**
   * 品質設定の手動調整
   */
  public setQualityLevel(level: 'low' | 'medium' | 'high'): void {
    console.log(`品質レベルを ${level} に設定`)
    
    if (this.mobilePerformanceManager) {
      this.mobilePerformanceManager.setOptimizationLevel(level)
    }
    
    if (this.frameRateStabilizer) {
      const qualityValue = level === 'low' ? 0.5 : level === 'medium' ? 0.75 : 1.0
      this.frameRateStabilizer.setQualityLevel(qualityValue)
    }
  }

  /**
   * 自動最適化の有効/無効切り替え
   */
  public setAutoOptimization(enabled: boolean): void {
    this.autoOptimizationEnabled = enabled
    console.log(`自動最適化: ${enabled ? '有効' : '無効'}`)
  }

  /**
   * システムのクリーンアップ
   */
  public cleanup(): void {
    console.log('統合パフォーマンスシステムをクリーンアップ中...')
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    
    if (this.performanceOptimizer) {
      this.performanceOptimizer.cleanup()
    }
    
    if (this.webglOptimizer) {
      this.webglOptimizer.cleanup()
    }
    
    if (this.frameRateStabilizer) {
      this.frameRateStabilizer.cleanup()
    }
    
    if (this.mobilePerformanceManager) {
      this.mobilePerformanceManager.destroy()
    }
    
    this.isInitialized = false
    console.log('クリーンアップ完了')
  }

  /**
   * デバッグ情報の出力
   */
  public printDebugInfo(): void {
    console.group('統合パフォーマンスシステム - デバッグ情報')
    
    const stats = this.getComprehensiveStats()
    
    console.log('システム状態:', stats.system)
    console.log('パフォーマンス統計:', stats.performance)
    console.log('フレームレート:', stats.frameRate)
    console.log('モバイル最適化:', stats.mobile)
    console.log('WebGL統計:', stats.webgl)
    console.log('履歴:', stats.history)
    
    console.groupEnd()
  }
}