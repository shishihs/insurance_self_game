import type { PlayerStats } from '@/domain/types/game.types'

/**
 * Performance metrics for game execution
 */
export interface PerformanceMetrics {
  /** Memory usage in MB */
  memoryUsage: {
    used: number
    heapUsed: number
    heapTotal: number
    external: number
    rss: number
  }
  /** CPU usage percentage (0-100) */
  cpuUsage: number
  /** Game execution time in milliseconds */
  gameExecutionTime: number
  /** Garbage collection metrics */
  gcMetrics: {
    totalCollections: number
    totalTime: number
    avgCollectionTime: number
  }
  /** Performance scores */
  performanceScores: {
    memoryEfficiency: number
    executionSpeed: number
    overall: number
  }
  /** Game-specific metrics */
  gameMetrics: {
    turnsPerSecond: number
    cardsProcessedPerSecond: number
    averageDecisionTime: number
  }
}

/**
 * Performance analysis result
 */
export interface PerformanceAnalysis {
  metrics: PerformanceMetrics
  bottlenecks: PerformanceBottleneck[]
  recommendations: PerformanceRecommendation[]
  memoryLeaks: MemoryLeakWarning[]
  trend: PerformanceTrend
}

/**
 * Performance bottleneck detection
 */
export interface PerformanceBottleneck {
  type: 'memory' | 'cpu' | 'gc' | 'execution'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  suggestion: string
}

/**
 * Performance optimization recommendation
 */
export interface PerformanceRecommendation {
  category: 'memory' | 'cpu' | 'architecture' | 'algorithm'
  priority: 'low' | 'medium' | 'high'
  title: string
  description: string
  implementation: string
  expectedImprovement: string
}

/**
 * Memory leak warning
 */
export interface MemoryLeakWarning {
  severity: 'warning' | 'danger' | 'critical'
  source: string
  description: string
  memoryGrowth: number
  recommendation: string
}

/**
 * Performance trend over time
 */
export interface PerformanceTrend {
  memoryTrend: 'stable' | 'increasing' | 'decreasing' | 'volatile'
  executionTrend: 'stable' | 'improving' | 'degrading' | 'volatile'
  gcTrend: 'stable' | 'increasing' | 'decreasing'
  overallHealth: 'excellent' | 'good' | 'concerning' | 'poor'
}

/**
 * Performance monitoring configuration
 */
export interface PerformanceConfig {
  /** Enable memory monitoring */
  enableMemoryMonitoring: boolean
  /** Enable CPU monitoring */
  enableCpuMonitoring: boolean
  /** Enable GC monitoring */
  enableGcMonitoring: boolean
  /** Sampling interval in milliseconds */
  samplingInterval: number
  /** Memory leak detection threshold (MB) */
  memoryLeakThreshold: number
  /** Performance warning thresholds */
  thresholds: {
    memoryUsage: number // MB
    cpuUsage: number // percentage
    executionTime: number // milliseconds
    gcTime: number // milliseconds
  }
}

/**
 * Advanced performance analyzer for game optimization
 */
export class GamePerformanceAnalyzer {
  private metrics: PerformanceMetrics[]
  private config: PerformanceConfig
  private samplingTimer: ReturnType<typeof setTimeout> | null = null
  private gameStartTime: number = 0
  private initialMemory: number = 0
  private gcStats: { count: number; totalTime: number } = { count: 0, totalTime: 0 }
  private isMonitoring: boolean = false

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableMemoryMonitoring: true,
      enableCpuMonitoring: true,
      enableGcMonitoring: true,
      samplingInterval: 100, // 100ms
      memoryLeakThreshold: 50, // 50MB
      thresholds: {
        memoryUsage: 100, // 100MB
        cpuUsage: 80, // 80%
        executionTime: 1000, // 1 second
        gcTime: 50 // 50ms
      },
      ...config
    }
    
    this.metrics = []
    this.setupGcMonitoring()
  }

  /**
   * Start performance monitoring for a game session
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      this.stopMonitoring()
    }

    this.isMonitoring = true
    this.gameStartTime = performance.now()
    this.initialMemory = this.getMemoryUsage().used
    this.metrics = []
    this.gcStats = { count: 0, totalTime: 0 }

    if (this.config.samplingInterval > 0) {
      this.samplingTimer = setInterval(() => {
        this.collectMetrics()
      }, this.config.samplingInterval)
    }

    this.collectMetrics() // Initial measurement
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): PerformanceAnalysis {
    this.isMonitoring = false
    
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer)
      this.samplingTimer = null
    }

    this.collectMetrics() // Final measurement
    return this.analyzePerformance()
  }

  /**
   * Get real-time performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    return this.collectMetrics()
  }

  /**
   * Analyze game-specific performance
   */
  analyzeGamePerformance(stats: PlayerStats, executionTime: number): PerformanceAnalysis {
    const metrics = this.getCurrentMetrics()
    metrics.gameExecutionTime = executionTime
    
    // Calculate game-specific metrics
    metrics.gameMetrics = {
      turnsPerSecond: stats.turnsPlayed / (executionTime / 1000),
      cardsProcessedPerSecond: (stats.cardsAcquired + stats.totalChallenges) / (executionTime / 1000),
      averageDecisionTime: executionTime / Math.max(stats.totalChallenges, 1)
    }

    return this.analyzePerformance()
  }

  /**
   * Profile memory usage during a specific operation
   */
  async profileMemoryUsage<T>(operation: () => Promise<T> | T, operationName: string): Promise<{
    result: T
    memoryDelta: number
    executionTime: number
    analysis: string
  }> {
    const initialMemory = this.getMemoryUsage()
    const startTime = performance.now()
    
    // Force garbage collection before measurement (if available)
    if (global.gc) {
      global.gc()
    }
    
    const preMemory = this.getMemoryUsage().used
    
    const result = await operation()
    
    const endTime = performance.now()
    const postMemory = this.getMemoryUsage().used
    const memoryDelta = postMemory - preMemory
    const executionTime = endTime - startTime

    const analysis = this.analyzeMemoryDelta(memoryDelta, executionTime, operationName)

    return {
      result,
      memoryDelta,
      executionTime,
      analysis
    }
  }

  /**
   * Benchmark execution speed
   */
  async benchmarkExecution<T>(
    operation: () => Promise<T> | T,
    iterations: number = 1000
  ): Promise<{
    averageTime: number
    minTime: number
    maxTime: number
    totalTime: number
    operationsPerSecond: number
    memoryImpact: number
  }> {
    const times: number[] = []
    const initialMemory = this.getMemoryUsage().used
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now()
      await operation()
      const endTime = performance.now()
      times.push(endTime - startTime)
    }

    const finalMemory = this.getMemoryUsage().used
    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const averageTime = totalTime / iterations
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    return {
      averageTime,
      minTime,
      maxTime,
      totalTime,
      operationsPerSecond: 1000 / averageTime,
      memoryImpact: finalMemory - initialMemory
    }
  }

  /**
   * Detect performance bottlenecks
   */
  detectBottlenecks(): PerformanceBottleneck[] {
    const bottlenecks: PerformanceBottleneck[] = []
    const currentMetrics = this.getCurrentMetrics()

    // Memory bottlenecks
    if (currentMetrics.memoryUsage.used > this.config.thresholds.memoryUsage) {
      bottlenecks.push({
        type: 'memory',
        severity: this.getSeverity(currentMetrics.memoryUsage.used, this.config.thresholds.memoryUsage),
        description: `High memory usage: ${currentMetrics.memoryUsage.used.toFixed(2)}MB`,
        impact: 'May cause performance degradation and potential out-of-memory errors',
        suggestion: 'Implement object pooling and optimize data structures'
      })
    }

    // CPU bottlenecks
    if (currentMetrics.cpuUsage > this.config.thresholds.cpuUsage) {
      bottlenecks.push({
        type: 'cpu',
        severity: this.getSeverity(currentMetrics.cpuUsage, this.config.thresholds.cpuUsage),
        description: `High CPU usage: ${currentMetrics.cpuUsage.toFixed(1)}%`,
        impact: 'Reduces system responsiveness and battery life',
        suggestion: 'Optimize algorithms and consider async processing'
      })
    }

    // Garbage collection bottlenecks
    if (currentMetrics.gcMetrics.avgCollectionTime > this.config.thresholds.gcTime) {
      bottlenecks.push({
        type: 'gc',
        severity: this.getSeverity(currentMetrics.gcMetrics.avgCollectionTime, this.config.thresholds.gcTime),
        description: `Long GC pauses: ${currentMetrics.gcMetrics.avgCollectionTime.toFixed(2)}ms`,
        impact: 'Causes frame drops and stuttering',
        suggestion: 'Reduce object allocation and implement object pooling'
      })
    }

    // Execution time bottlenecks
    if (currentMetrics.gameExecutionTime > this.config.thresholds.executionTime) {
      bottlenecks.push({
        type: 'execution',
        severity: this.getSeverity(currentMetrics.gameExecutionTime, this.config.thresholds.executionTime),
        description: `Slow execution: ${currentMetrics.gameExecutionTime.toFixed(2)}ms`,
        impact: 'Poor user experience and reduced throughput',
        suggestion: 'Profile and optimize critical code paths'
      })
    }

    return bottlenecks
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(): PerformanceRecommendation[] {
    const recommendations: PerformanceRecommendation[] = []
    const currentMetrics = this.getCurrentMetrics()
    const trend = this.calculateTrend()

    // Memory optimization recommendations
    if (currentMetrics.performanceScores.memoryEfficiency < 70) {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: 'Implement Object Pooling',
        description: 'Reduce garbage collection pressure by reusing objects',
        implementation: 'Create pools for Cards, Game states, and temporary objects',
        expectedImprovement: '30-50% reduction in GC time'
      })
    }

    if (trend.memoryTrend === 'increasing') {
      recommendations.push({
        category: 'memory',
        priority: 'high',
        title: 'Fix Memory Leaks',
        description: 'Memory usage is consistently increasing',
        implementation: 'Profile memory usage and remove circular references',
        expectedImprovement: 'Stable memory usage over time'
      })
    }

    // CPU optimization recommendations
    if (currentMetrics.performanceScores.executionSpeed < 70) {
      recommendations.push({
        category: 'cpu',
        priority: 'medium',
        title: 'Optimize Hot Code Paths',
        description: 'Improve frequently executed code',
        implementation: 'Profile and optimize card selection and game logic',
        expectedImprovement: '20-40% faster execution'
      })
    }

    // Architecture recommendations
    if (currentMetrics.gameMetrics.averageDecisionTime > 100) {
      recommendations.push({
        category: 'architecture',
        priority: 'medium',
        title: 'Implement Async Processing',
        description: 'Move heavy computations off the main thread',
        implementation: 'Use Worker threads for AI decision making',
        expectedImprovement: 'Better responsiveness and parallelization'
      })
    }

    // Algorithm recommendations
    if (currentMetrics.gameMetrics.cardsProcessedPerSecond < 100) {
      recommendations.push({
        category: 'algorithm',
        priority: 'low',
        title: 'Optimize Data Structures',
        description: 'Use more efficient data structures for card management',
        implementation: 'Replace arrays with Sets/Maps where appropriate',
        expectedImprovement: '10-20% faster card operations'
      })
    }

    return recommendations
  }

  /**
   * Check for memory leaks
   */
  detectMemoryLeaks(): MemoryLeakWarning[] {
    const warnings: MemoryLeakWarning[] = []
    
    if (this.metrics.length < 10) {
      return warnings // Need more data points
    }

    const recent = this.metrics.slice(-10)
    const older = this.metrics.slice(-20, -10)
    
    if (older.length === 0) return warnings

    const recentAvg = recent.reduce((sum, m) => sum + m.memoryUsage.used, 0) / recent.length
    const olderAvg = older.reduce((sum, m) => sum + m.memoryUsage.used, 0) / older.length
    const growth = recentAvg - olderAvg

    if (growth > this.config.memoryLeakThreshold) {
      warnings.push({
        severity: growth > this.config.memoryLeakThreshold * 2 ? 'critical' : 'danger',
        source: 'Overall memory usage',
        description: `Memory usage increased by ${growth.toFixed(2)}MB over recent samples`,
        memoryGrowth: growth,
        recommendation: 'Profile memory usage and check for circular references or cached objects'
      })
    }

    // Check heap growth specifically
    const recentHeap = recent.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / recent.length
    const olderHeap = older.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / older.length
    const heapGrowth = recentHeap - olderHeap

    if (heapGrowth > this.config.memoryLeakThreshold * 0.5) {
      warnings.push({
        severity: 'warning',
        source: 'Heap memory',
        description: `Heap usage increased by ${heapGrowth.toFixed(2)}MB`,
        memoryGrowth: heapGrowth,
        recommendation: 'Check for object retention and optimize garbage collection'
      })
    }

    return warnings
  }

  /**
   * Export performance data for analysis
   */
  exportData(): {
    config: PerformanceConfig
    metrics: PerformanceMetrics[]
    analysis: PerformanceAnalysis
    timestamp: string
  } {
    return {
      config: this.config,
      metrics: this.metrics,
      analysis: this.analyzePerformance(),
      timestamp: new Date().toISOString()
    }
  }

  // === Private Methods ===

  private collectMetrics(): PerformanceMetrics {
    const memoryUsage = this.getMemoryUsage()
    const cpuUsage = this.getCpuUsage()
    const currentTime = performance.now()
    const executionTime = currentTime - this.gameStartTime

    const metrics: PerformanceMetrics = {
      memoryUsage,
      cpuUsage,
      gameExecutionTime: executionTime,
      gcMetrics: {
        totalCollections: this.gcStats.count,
        totalTime: this.gcStats.totalTime,
        avgCollectionTime: this.gcStats.count > 0 ? this.gcStats.totalTime / this.gcStats.count : 0
      },
      performanceScores: {
        memoryEfficiency: this.calculateMemoryEfficiency(memoryUsage),
        executionSpeed: this.calculateExecutionSpeed(executionTime),
        overall: 0 // Will be calculated
      },
      gameMetrics: {
        turnsPerSecond: 0,
        cardsProcessedPerSecond: 0,
        averageDecisionTime: 0
      }
    }

    // Calculate overall score
    metrics.performanceScores.overall = (
      metrics.performanceScores.memoryEfficiency +
      metrics.performanceScores.executionSpeed
    ) / 2

    this.metrics.push(metrics)
    return metrics
  }

  private getMemoryUsage(): PerformanceMetrics['memoryUsage'] {
    const usage = process.memoryUsage()
    return {
      used: usage.heapUsed / 1024 / 1024, // Convert to MB
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      rss: usage.rss / 1024 / 1024
    }
  }

  private lastCpuUsage: NodeJS.CpuUsage | null = null
  private lastCpuTime: number = 0

  private getCpuUsage(): number {
    const currentCpuUsage = process.cpuUsage()
    const currentTime = Date.now()

    if (this.lastCpuUsage && this.lastCpuTime) {
      const elapsedTime = currentTime - this.lastCpuTime
      const elapsedUserCPU = currentCpuUsage.user - this.lastCpuUsage.user
      const elapsedSystemCPU = currentCpuUsage.system - this.lastCpuUsage.system
      
      // Convert microseconds to milliseconds and calculate percentage
      const totalCpuTime = (elapsedUserCPU + elapsedSystemCPU) / 1000 // Convert to ms
      const cpuUsage = (totalCpuTime / elapsedTime) * 100
      
      this.lastCpuUsage = currentCpuUsage
      this.lastCpuTime = currentTime
      
      return Math.min(100, Math.max(0, cpuUsage))
    } else {
      // First measurement - initialize tracking
      this.lastCpuUsage = currentCpuUsage
      this.lastCpuTime = currentTime
      return 0
    }
  }

  private setupGcMonitoring(): void {
    if (!this.config.enableGcMonitoring) return

    // Monitor garbage collection using performance hooks
    if (typeof process !== 'undefined' && process.on) {
      try {
        // Import performance hooks dynamically to avoid errors if not available
        const { PerformanceObserver } = require('perf_hooks')
        
        const obs = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          for (const entry of entries) {
            if (entry.entryType === 'gc') {
              this.gcStats.count++
              this.gcStats.totalTime += entry.duration
            }
          }
        })
        
        // Observe GC events
        obs.observe({ entryTypes: ['gc'] })
        
        // Also monitor using process events if available
        if (process.on) {
          process.on('exit', () => {
            obs.disconnect()
          })
        }
        
      } catch (error) {
        // GC monitoring not available - fallback to basic monitoring
        console.warn('Advanced GC monitoring not available, using basic monitoring')
        
        // Simple memory-based GC estimation
        let lastHeapUsed = process.memoryUsage().heapUsed
        const gcCheckInterval = setInterval(() => {
          const currentHeapUsed = process.memoryUsage().heapUsed
          if (currentHeapUsed < lastHeapUsed * 0.8) {
            // Likely GC occurred (significant memory decrease)
            this.gcStats.count++
            this.gcStats.totalTime += 10 // Estimate 10ms per GC
          }
          lastHeapUsed = currentHeapUsed
        }, 100) // Check every 100ms
        
        // Clean up interval on exit
        if (process.on) {
          process.on('exit', () => {
            clearInterval(gcCheckInterval)
          })
        }
      }
    }
  }

  private calculateMemoryEfficiency(memoryUsage: PerformanceMetrics['memoryUsage']): number {
    const efficiency = Math.max(0, 100 - (memoryUsage.used / this.config.thresholds.memoryUsage) * 100)
    return Math.min(100, efficiency)
  }

  private calculateExecutionSpeed(executionTime: number): number {
    const speed = Math.max(0, 100 - (executionTime / this.config.thresholds.executionTime) * 100)
    return Math.min(100, speed)
  }

  private getSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold
    if (ratio >= 2) return 'critical'
    if (ratio >= 1.5) return 'high'
    if (ratio >= 1) return 'medium'
    return 'low'
  }

  private calculateTrend(): PerformanceTrend {
    if (this.metrics.length < 5) {
      return {
        memoryTrend: 'stable',
        executionTrend: 'stable',
        gcTrend: 'stable',
        overallHealth: 'good'
      }
    }

    const recent = this.metrics.slice(-5)
    const older = this.metrics.slice(-10, -5)

    if (older.length === 0) {
      return {
        memoryTrend: 'stable',
        executionTrend: 'stable',
        gcTrend: 'stable',
        overallHealth: 'good'
      }
    }

    const memoryTrend = this.analyzeTrend(
      recent.map(m => m.memoryUsage.used),
      older.map(m => m.memoryUsage.used)
    )

    const executionTrend = this.analyzeTrend(
      recent.map(m => m.gameExecutionTime),
      older.map(m => m.gameExecutionTime),
      true // Lower is better for execution time
    )

    const gcTrend = this.analyzeTrend(
      recent.map(m => m.gcMetrics.avgCollectionTime),
      older.map(m => m.gcMetrics.avgCollectionTime)
    )

    // Determine overall health
    let overallHealth: PerformanceTrend['overallHealth'] = 'excellent'
    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage.used, 0) / recent.length
    const avgScore = recent.reduce((sum, m) => sum + m.performanceScores.overall, 0) / recent.length

    if (avgMemory > this.config.thresholds.memoryUsage || avgScore < 50) {
      overallHealth = 'poor'
    } else if (avgScore < 70) {
      overallHealth = 'concerning'
    } else if (avgScore < 85) {
      overallHealth = 'good'
    }

    return {
      memoryTrend,
      executionTrend,
      gcTrend,
      overallHealth
    }
  }

  private analyzeTrend(recent: number[], older: number[], lowerIsBetter: boolean = false): 'stable' | 'increasing' | 'decreasing' | 'volatile' {
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length
    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length
    const change = (recentAvg - olderAvg) / olderAvg

    // Check volatility
    const recentVariance = this.calculateVariance(recent)
    const olderVariance = this.calculateVariance(older)
    const isVolatile = recentVariance > olderVariance * 2 || recentVariance > recentAvg * 0.2

    if (isVolatile) return 'volatile'

    const threshold = 0.1 // 10% change threshold
    if (Math.abs(change) < threshold) return 'stable'

    if (lowerIsBetter) {
      return change < 0 ? 'improving' : 'degrading'
    } else {
      return change > 0 ? 'increasing' : 'decreasing'
    }
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2))
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length
  }

  private analyzeMemoryDelta(delta: number, executionTime: number, operationName: string): string {
    const rate = delta / (executionTime / 1000) // MB per second
    
    if (delta < 0) {
      return `✅ ${operationName} freed ${Math.abs(delta).toFixed(2)}MB (${Math.abs(rate).toFixed(2)}MB/s)`
    } else if (delta < 1) {
      return `✅ ${operationName} has minimal memory impact: ${delta.toFixed(2)}MB`
    } else if (delta < 10) {
      return `⚠️ ${operationName} allocated ${delta.toFixed(2)}MB (${rate.toFixed(2)}MB/s) - monitor for leaks`
    } else {
      return `🚨 ${operationName} allocated ${delta.toFixed(2)}MB (${rate.toFixed(2)}MB/s) - potential memory issue`
    }
  }

  private analyzePerformance(): PerformanceAnalysis {
    const currentMetrics = this.getCurrentMetrics()
    const bottlenecks = this.detectBottlenecks()
    const recommendations = this.generateRecommendations()
    const memoryLeaks = this.detectMemoryLeaks()
    const trend = this.calculateTrend()

    return {
      metrics: currentMetrics,
      bottlenecks,
      recommendations,
      memoryLeaks,
      trend
    }
  }
}

import { BaseFactory } from '@/common/BaseFactory'

/**
 * Factory for creating performance analyzers with preset configurations
 */
export class PerformanceAnalyzerFactory extends BaseFactory<GamePerformanceAnalyzer, PerformanceConfig> {
  // Register presets
  static {
    this.registerPreset('development', {
      name: 'development',
      description: 'Analyzer for development environment',
      config: {
        enableMemoryMonitoring: true,
        enableCpuMonitoring: true,
        enableGcMonitoring: true,
        samplingInterval: 100,
        memoryLeakThreshold: 25,
        thresholds: {
          memoryUsage: 50,
          cpuUsage: 70,
          executionTime: 500,
          gcTime: 25
        }
      }
    })

    this.registerPreset('benchmark', {
      name: 'benchmark',
      description: 'Analyzer for production benchmarking',
      config: {
        enableMemoryMonitoring: true,
        enableCpuMonitoring: false, // Reduced overhead
        enableGcMonitoring: true,
        samplingInterval: 0, // Manual sampling only
        memoryLeakThreshold: 100,
        thresholds: {
          memoryUsage: 200,
          cpuUsage: 90,
          executionTime: 2000,
          gcTime: 100
        }
      }
    })

    this.registerPreset('memory-leak', {
      name: 'memory-leak',
      description: 'Analyzer for memory leak detection',
      config: {
        enableMemoryMonitoring: true,
        enableCpuMonitoring: false,
        enableGcMonitoring: true,
        samplingInterval: 50, // More frequent sampling
        memoryLeakThreshold: 10, // Very sensitive
        thresholds: {
          memoryUsage: 30,
          cpuUsage: 100,
          executionTime: 10000,
          gcTime: 10
        }
      }
    })
  }

  /**
   * Create analyzer for development environment
   */
  static createDevelopmentAnalyzer(): GamePerformanceAnalyzer {
    return this.createWithPreset('development', (config) => new GamePerformanceAnalyzer(config))
  }

  /**
   * Create analyzer for production benchmarking
   */
  static createBenchmarkAnalyzer(): GamePerformanceAnalyzer {
    return this.createWithPreset('benchmark', (config) => new GamePerformanceAnalyzer(config))
  }

  /**
   * Create analyzer for memory leak detection
   */
  static createMemoryLeakAnalyzer(): GamePerformanceAnalyzer {
    return this.createWithPreset('memory-leak', (config) => new GamePerformanceAnalyzer(config))
  }
}