/**
 * Optimization library index
 * Exports all optimization utilities and systems
 */

// Unified Performance System (New Optimized System)
export {
  UnifiedPerformanceSystem,
  memoize,
  benchmark
} from '../optimizations/UnifiedPerformanceSystem'

export type {
  OptimizationConfig,
  PerformanceMetrics,
  OptimizationResult
} from '../optimizations/UnifiedPerformanceSystem'

// Optimized Utilities
export {
  fastShuffle,
  fastFilter,
  batchProcess,
  fastUnique,
  OptimizedMath,
  OptimizedString,
  OptimizedObject,
  OptimizedAlgorithms,
  PerformanceUtils,
  LazyEvaluation,
  createOptimizedArray,
  releaseOptimizedArray,
  memoizeComputation
} from '../utils/performance/OptimizedUtilities'

// Optimized Game Components
export {
  OptimizedCardManager,
  OptimizedGameStateManager,
  OptimizedGameAlgorithms,
  OptimizedGameFactory
} from '../optimizations/OptimizedGameComponents'

// Benchmark Suite
export {
  BenchmarkRunner,
  GameOptimizationBenchmarks,
  BenchmarkReporter
} from '../utils/performance/BenchmarkSuite'

export type {
  BenchmarkResult,
  BenchmarkSuite
} from '../utils/performance/BenchmarkSuite'

// Examples and Demonstrations
export {
  OptimizationUsageExamples,
  BenchmarkExecutionExamples,
  OptimizationDemonstration
} from '../optimizations/OptimizationExamples'

// Legacy Object Pooling (maintained for compatibility)
export {
  ObjectPool,
  CardPool,
  GameStatePool,
  PoolManager,
  AutoReleasingPool,
  pooled,
  PooledCard,
  PooledGameState,
  PooledPlayerStats
} from './ObjectPooling'

export type {
  PoolStats,
  PoolEfficiencyReport
} from './ObjectPooling'

// Legacy Cache System (maintained for compatibility)
export {
  LRUCache,
  ComputationCache,
  GameCache,
  MultiLevelCache,
  CacheWarmer
} from './CacheSystem'

export type {
  Cache,
  CacheStats
} from './CacheSystem'

// Legacy Batch Processing (maintained for compatibility)
export {
  BatchProcessor,
  BatchProcessorManager,
  GameBatchProcessors,
  BatchOptimizationUtils
} from './BatchProcessor'

export type {
  BatchConfig,
  BatchResult,
  BatchStats,
  CardOperation,
  CardResult,
  GameStateUpdate,
  GameStateResult,
  StatEntry,
  StatResult
} from './BatchProcessor'

/**
 * Comprehensive optimization suite
 */
export class OptimizationSuite {
  private static instance: OptimizationSuite
  private poolManager: PoolManager
  private gameCache: GameCache
  private batchManager: BatchProcessorManager
  private monitoringEnabled: boolean = false

  private constructor() {
    this.poolManager = PoolManager.getInstance()
    this.gameCache = GameCache.getInstance()
    this.batchManager = new BatchProcessorManager()
    this.initializeOptimizations()
  }

  static getInstance(): OptimizationSuite {
    if (!OptimizationSuite.instance) {
      OptimizationSuite.instance = new OptimizationSuite()
    }
    return OptimizationSuite.instance
  }

  /**
   * Initialize all optimization systems
   */
  private initializeOptimizations(): void {
    // Set up batch processors
    this.batchManager.registerProcessor('cards', GameBatchProcessors.createCardProcessor())
    this.batchManager.registerProcessor('gameStates', GameBatchProcessors.createGameStateProcessor())
    this.batchManager.registerProcessor('stats', GameBatchProcessors.createStatsProcessor())

    // Start pool monitoring
    this.poolManager.startMonitoring(10000) // Monitor every 10 seconds
  }

  /**
   * Enable comprehensive monitoring
   */
  enableMonitoring(): void {
    if (this.monitoringEnabled) return

    this.monitoringEnabled = true
    this.poolManager.startMonitoring(5000)
    
    // Set up periodic cache optimization
    setInterval(() => {
      this.gameCache.optimizeCacheSizes()
    }, 30000) // Every 30 seconds

    console.log('🔍 Optimization monitoring enabled')
  }

  /**
   * Disable monitoring
   */
  disableMonitoring(): void {
    this.monitoringEnabled = false
    this.poolManager.stopMonitoring()
    console.log('🔍 Optimization monitoring disabled')
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): OptimizationReport {
    const poolStats = this.poolManager.getAllStats()
    const cacheStats = this.gameCache.getAllStats()
    const batchStats = this.batchManager.getStats()
    const poolEfficiency = this.poolManager.getEfficiencyReport()

    return {
      timestamp: new Date().toISOString(),
      pools: {
        stats: poolStats,
        efficiency: poolEfficiency
      },
      cache: cacheStats,
      batching: batchStats,
      recommendations: this.generateOptimizationRecommendations(poolStats, cacheStats, batchStats),
      memoryImpact: this.calculateMemoryImpact(poolEfficiency, cacheStats),
      performanceGains: this.calculatePerformanceGains(poolEfficiency, cacheStats, batchStats)
    }
  }

  /**
   * Optimize all systems automatically
   */
  async optimizeAll(): Promise<OptimizationResult> {
    console.log('🚀 Starting comprehensive optimization...')
    
    const before = this.getPerformanceReport()
    
    // Clear and optimize pools
    this.poolManager.clearAllPools()
    
    // Optimize cache sizes
    this.gameCache.optimizeCacheSizes()
    
    // Flush all batches
    await this.batchManager.flushAll()
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    // Wait a moment for optimizations to take effect
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const after = this.getPerformanceReport()
    
    console.log('✅ Optimization complete')
    
    return {
      before,
      after,
      improvements: this.calculateImprovements(before, after),
      optimizationsApplied: [
        'Pool clearing and reset',
        'Cache size optimization',
        'Batch processing flush',
        'Garbage collection trigger'
      ]
    }
  }

  /**
   * Warm up all optimization systems
   */
  async warmUp(): Promise<void> {
    console.log('🔥 Warming up optimization systems...')
    
    // Warm up caches
    await CacheWarmer.warmGameCache(this.gameCache)
    
    // Pre-allocate pool objects
    const cardPool = CardPool.getInstance()
    for (let i = 0; i < 50; i++) {
      const card = cardPool.acquireCard()
      cardPool.releaseCard(card)
    }
    
    console.log('✅ Warm-up complete')
  }

  /**
   * Reset all optimization systems
   */
  reset(): void {
    console.log('🔄 Resetting optimization systems...')
    
    this.poolManager.clearAllPools()
    this.gameCache.clearAll()
    this.batchManager.clearAll()
    
    // Reinitialize
    this.initializeOptimizations()
    
    console.log('✅ Reset complete')
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(
    poolStats: Record<string, any>,
    cacheStats: any,
    batchStats: any
  ): string[] {
    const recommendations: string[] = []

    // Pool recommendations
    const totalPoolEfficiency = Object.values(poolStats).reduce((sum: number, stats: any) => 
      sum + (stats.efficiency || 0), 0) / Object.keys(poolStats).length

    if (totalPoolEfficiency < 0.5) {
      recommendations.push('Pool efficiency is low - consider increasing pool sizes or reviewing object lifecycle')
    }

    // Cache recommendations
    if (cacheStats.overall.totalHitRate < 60) {
      recommendations.push('Cache hit rate is below optimal - consider increasing cache sizes or TTL values')
    }

    // Batch recommendations
    if (batchStats.averageProcessingTime > 1000) {
      recommendations.push('Batch processing time is high - consider reducing batch sizes or enabling parallel processing')
    }

    // Memory recommendations
    if (cacheStats.overall.totalMemoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - consider implementing more aggressive cache eviction')
    }

    if (recommendations.length === 0) {
      recommendations.push('All optimization systems are performing well')
    }

    return recommendations
  }

  /**
   * Calculate memory impact of optimizations
   */
  private calculateMemoryImpact(poolEfficiency: any, cacheStats: any): MemoryImpact {
    const poolMemorySaved = poolEfficiency.estimatedMemorySaved
    const cacheMemoryUsed = cacheStats.overall.totalMemoryUsage / (1024 * 1024) // Convert to MB
    
    return {
      poolMemorySaved,
      cacheMemoryUsed,
      netMemoryImpact: poolMemorySaved - cacheMemoryUsed,
      description: poolMemorySaved > cacheMemoryUsed ? 
        'Net memory savings from optimizations' : 
        'Memory usage increased due to caching overhead'
    }
  }

  /**
   * Calculate performance gains
   */
  private calculatePerformanceGains(
    poolEfficiency: any,
    cacheStats: any,
    batchStats: any
  ): PerformanceGains {
    return {
      objectAllocationReduction: poolEfficiency.overallEfficiency * 100,
      cacheSpeedup: cacheStats.overall.totalHitRate / 100,
      batchThroughputGain: batchStats.averageItemsPerBatch > 1 ? 
        Math.log(batchStats.averageItemsPerBatch) : 0,
      overallSpeedImprovement: this.estimateOverallSpeedImprovement(
        poolEfficiency.overallEfficiency,
        cacheStats.overall.totalHitRate,
        batchStats.averageItemsPerBatch
      )
    }
  }

  /**
   * Calculate improvements between two reports
   */
  private calculateImprovements(before: OptimizationReport, after: OptimizationReport): Improvements {
    return {
      poolEfficiencyDelta: after.pools.efficiency.overallEfficiency - before.pools.efficiency.overallEfficiency,
      cacheHitRateDelta: after.cache.overall.totalHitRate - before.cache.overall.totalHitRate,
      memoryUsageDelta: after.memoryImpact.netMemoryImpact - before.memoryImpact.netMemoryImpact,
      performanceDelta: after.performanceGains.overallSpeedImprovement - before.performanceGains.overallSpeedImprovement
    }
  }

  /**
   * Estimate overall speed improvement
   */
  private estimateOverallSpeedImprovement(
    poolEfficiency: number,
    cacheHitRate: number,
    batchSize: number
  ): number {
    // Weighted combination of optimization benefits
    const poolWeight = 0.3
    const cacheWeight = 0.5
    const batchWeight = 0.2

    const poolBenefit = poolEfficiency * poolWeight
    const cacheBenefit = (cacheHitRate / 100) * cacheWeight
    const batchBenefit = Math.min(batchSize / 10, 1) * batchWeight

    return (poolBenefit + cacheBenefit + batchBenefit) * 100
  }
}

/**
 * Optimization report structure
 */
export interface OptimizationReport {
  timestamp: string
  pools: {
    stats: Record<string, any>
    efficiency: any
  }
  cache: any
  batching: any
  recommendations: string[]
  memoryImpact: MemoryImpact
  performanceGains: PerformanceGains
}

/**
 * Memory impact analysis
 */
export interface MemoryImpact {
  poolMemorySaved: number
  cacheMemoryUsed: number
  netMemoryImpact: number
  description: string
}

/**
 * Performance gains analysis
 */
export interface PerformanceGains {
  objectAllocationReduction: number
  cacheSpeedup: number
  batchThroughputGain: number
  overallSpeedImprovement: number
}

/**
 * Optimization result
 */
export interface OptimizationResult {
  before: OptimizationReport
  after: OptimizationReport
  improvements: Improvements
  optimizationsApplied: string[]
}

/**
 * Improvements between reports
 */
export interface Improvements {
  poolEfficiencyDelta: number
  cacheHitRateDelta: number
  memoryUsageDelta: number
  performanceDelta: number
}

/**
 * Optimization configuration
 */
export interface OptimizationConfig {
  enablePooling: boolean
  enableCaching: boolean
  enableBatching: boolean
  enableMonitoring: boolean
  poolSizes: {
    cards: number
    gameStates: number
    arrays: number
  }
  cacheSizes: {
    cards: number
    computations: number
    strategies: number
  }
  batchSizes: {
    cards: number
    gameStates: number
    stats: number
  }
}

/**
 * Factory for creating optimized game components
 */
export class OptimizedGameFactory {
  private static optimizationSuite = OptimizationSuite.getInstance()

  /**
   * Create an optimized game controller
   */
  static createOptimizedController(config: any): any {
    // Enable all optimizations
    this.optimizationSuite.enableMonitoring()
    
    // Return a wrapper that uses optimization systems
    return {
      // Game controller implementation would use pools, caches, and batching
      optimizationSuite: this.optimizationSuite,
      config
    }
  }

  /**
   * Create an optimized benchmark runner
   */
  static createOptimizedBenchmark(config: any): any {
    // Pre-warm optimization systems
    this.optimizationSuite.warmUp()
    
    return {
      optimizationSuite: this.optimizationSuite,
      config
    }
  }
}

// Default export
export default OptimizationSuite