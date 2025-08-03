import { writeFile } from 'fs/promises'
import { join } from 'path'

// Import Node.js types
import type { PerformanceObserver } from 'perf_hooks'

// Type definitions
interface HeapStatistics {
  total_heap_size: number
  total_heap_size_executable: number
  total_physical_size: number
  total_available_size: number
  used_heap_size: number
  heap_size_limit: number
  malloced_memory: number
  peak_malloced_memory?: number
  does_zap_garbage?: number
  number_of_native_contexts?: number
  number_of_detached_contexts?: number
}

interface MemoryTrend {
  trend: 'stable' | 'increasing' | 'decreasing' | 'volatile'
  growthRate: number
  confidence: number
}

/**
 * Detailed memory analysis results
 */
export interface MemorySnapshot {
  timestamp: number
  totalHeapSize: number
  totalHeapSizeExecutable: number
  totalPhysicalSize: number
  totalAvailableSize: number
  usedHeapSize: number
  heapSizeLimit: number
  mallocedMemory: number
  peakMallocedMemory: number
  externalMemory: number
  numberOfDetachedContexts: number
  numberOfNativeContexts: number
}

/**
 * Memory leak detection result
 */
export interface MemoryLeakInfo {
  severity: 'minor' | 'moderate' | 'severe' | 'critical'
  leakRate: number // MB per second
  affectedArea: string
  description: string
  recommendation: string
  confidence: number // 0-100
  detectionMethod: string
  stackTrace?: string
}

/**
 * Memory allocation pattern analysis
 */
export interface AllocationPattern {
  pattern: string
  frequency: number
  averageSize: number
  peakSize: number
  totalAllocated: number
  source: string
  efficiency: number
}

/**
 * Memory profiling session result
 */
export interface MemoryProfilingResult {
  sessionId: string
  startTime: number
  endTime: number
  duration: number
  snapshots: MemorySnapshot[]
  leaks: MemoryLeakInfo[]
  patterns: AllocationPattern[]
  summary: MemoryProfileSummary
  heapDumps?: string[] // File paths to heap dumps
  recommendations: string[]
}

/**
 * Memory profile summary
 */
export interface MemoryProfileSummary {
  peakMemoryUsage: number
  averageMemoryUsage: number
  memoryGrowthRate: number
  totalAllocations: number
  gcPressure: number
  leakScore: number // 0-100, higher is worse
  efficiencyScore: number // 0-100, higher is better
  stabilityScore: number // 0-100, higher is better
}

/**
 * Advanced memory profiler with leak detection and heap analysis
 */
export class MemoryProfiler {
  private isActive: boolean = false
  private sessionId: string = ''
  private startTime: number = 0
  private snapshots: MemorySnapshot[] = []
  private samplingInterval: number = 1000 // 1 second
  private samplingTimer: ReturnType<typeof setTimeout> | null = null
  private leakDetectionThreshold: number = 1 // 1MB per minute
  private maxSnapshots: number = 1000
  private heapDumpPath: string = './heap-dumps'
  private enableHeapDumps: boolean = false
  private gcObserver: PerformanceObserver | null = null

  constructor(config?: {
    samplingInterval?: number
    leakDetectionThreshold?: number
    maxSnapshots?: number
    heapDumpPath?: string
    enableHeapDumps?: boolean
  }) {
    if (config) {
      this.samplingInterval = config.samplingInterval || this.samplingInterval
      this.leakDetectionThreshold = config.leakDetectionThreshold || this.leakDetectionThreshold
      this.maxSnapshots = config.maxSnapshots || this.maxSnapshots
      this.heapDumpPath = config.heapDumpPath || this.heapDumpPath
      this.enableHeapDumps = config.enableHeapDumps || this.enableHeapDumps
    }
  }

  /**
   * Start memory profiling session
   */
  startProfiling(sessionId?: string): void {
    if (this.isActive) {
      this.stopProfiling()
    }

    this.sessionId = sessionId || `memory-profile-${Date.now()}`
    this.startTime = Date.now()
    this.snapshots = []
    this.isActive = true

    console.log(`🔍 Starting memory profiling session: ${this.sessionId}`)

    // Setup GC monitoring
    this.setupGCMonitoring()

    // Start periodic sampling
    this.samplingTimer = setInterval(() => {
      this.captureSnapshot()
    }, this.samplingInterval)

    // Capture initial snapshot
    this.captureSnapshot()

    // Force initial GC to establish baseline
    if (global.gc) {
      global.gc()
      setTimeout(() => this.captureSnapshot(), 100)
    }
  }

  /**
   * Stop profiling and return results
   */
  stopProfiling(): MemoryProfilingResult {
    if (!this.isActive) {
      throw new Error('No active profiling session')
    }

    console.log(`🏁 Stopping memory profiling session: ${this.sessionId}`)

    this.isActive = false
    
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer)
      this.samplingTimer = null
    }

    if (this.gcObserver) {
      this.gcObserver.disconnect()
      this.gcObserver = null
    }

    // Capture final snapshot
    this.captureSnapshot()

    const endTime = Date.now()
    const duration = endTime - this.startTime

    // Analyze the collected data
    const leaks = this.detectMemoryLeaks()
    const patterns = this.analyzeAllocationPatterns()
    const summary = this.generateSummary()
    const recommendations = this.generateRecommendations(leaks, patterns, summary)

    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime,
      duration,
      snapshots: this.snapshots,
      leaks,
      patterns,
      summary,
      recommendations
    }
  }

  /**
   * Take heap dump for detailed analysis
   */
  async takeHeapDump(filename?: string): Promise<string> {
    if (!this.enableHeapDumps) {
      throw new Error('Heap dumps are disabled. Enable them in configuration.')
    }

    try {
      const v8 = await import('v8')
      const heapSnapshot = v8.default.getHeapSnapshot()
      
      const dumpFilename = filename || `heap-dump-${this.sessionId}-${Date.now()}.heapsnapshot`
      const dumpPath = join(this.heapDumpPath, dumpFilename)

      const chunks: Buffer[] = []
      
      return new Promise((resolve, reject) => {
        heapSnapshot.on('data', (chunk: Buffer) => {
          chunks.push(chunk)
        })

        heapSnapshot.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks)
            await writeFile(dumpPath, buffer)
            console.log(`📸 Heap dump saved: ${dumpPath}`)
            resolve(dumpPath)
          } catch (error) {
            reject(error)
          }
        })

        heapSnapshot.on('error', reject)
      })
    } catch (error) {
      throw new Error(`Failed to take heap dump: ${error}`)
    }
  }

  /**
   * Get current memory statistics
   */
  async getCurrentMemoryStats(): Promise<MemorySnapshot> {
    return await this.createSnapshot()
  }

  /**
   * Analyze memory usage over time period
   */
  analyzeMemoryTrend(timeWindowMs: number = 60000): {
    trend: 'stable' | 'increasing' | 'decreasing' | 'volatile'
    growthRate: number
    confidence: number
  } {
    const cutoffTime = Date.now() - timeWindowMs
    const recentSnapshots = this.snapshots.filter(s => s.timestamp >= cutoffTime)
    
    if (recentSnapshots.length < 3) {
      return { trend: 'stable', growthRate: 0, confidence: 0 }
    }

    const memoryValues = recentSnapshots.map(s => s.usedHeapSize)
    const timeValues = recentSnapshots.map(s => s.timestamp)
    
    // Calculate linear regression
    const { slope, rSquared } = this.linearRegression(timeValues, memoryValues)
    
    // Convert slope to MB per minute
    const growthRate = (slope * 60000) / (1024 * 1024)
    
    let trend: 'stable' | 'increasing' | 'decreasing' | 'volatile'
    
    if (rSquared < 0.3) {
      trend = 'volatile'
    } else if (Math.abs(growthRate) < 0.1) {
      trend = 'stable'
    } else if (growthRate > 0) {
      trend = 'increasing'
    } else {
      trend = 'decreasing'
    }

    return {
      trend,
      growthRate,
      confidence: rSquared * 100
    }
  }

  /**
   * Generate memory optimization suggestions
   */
  generateOptimizationSuggestions(): string[] {
    if (!this.isActive && this.snapshots.length === 0) {
      return ['No profiling data available. Start a profiling session first.']
    }

    const suggestions: string[] = []
    const latest = this.snapshots[this.snapshots.length - 1]
    const summary = this.generateSummary()

    // Memory usage suggestions
    if (latest.usedHeapSize > latest.heapSizeLimit * 0.8) {
      suggestions.push('Memory usage is near heap limit - consider increasing heap size or reducing memory usage')
    }

    // GC pressure suggestions
    if (summary.gcPressure > 70) {
      suggestions.push('High GC pressure detected - implement object pooling and reduce allocations')
    }

    // Memory leak suggestions
    if (summary.leakScore > 60) {
      suggestions.push('Potential memory leaks detected - review object lifecycle and event listeners')
    }

    // External memory suggestions
    if (latest.externalMemory > latest.usedHeapSize * 0.5) {
      suggestions.push('High external memory usage - review Buffer usage and native module memory')
    }

    // Efficiency suggestions
    if (summary.efficiencyScore < 60) {
      suggestions.push('Memory efficiency is low - consider caching frequently used objects')
    }

    if (suggestions.length === 0) {
      suggestions.push('Memory usage appears optimal')
    }

    return suggestions
  }

  // === Private Methods ===

  private setupGCMonitoring(): void {
    try {
      const { PerformanceObserver } = require('perf_hooks')
      
      this.gcObserver = new PerformanceObserver((list) => {
        // GC events are automatically captured in snapshots
      })
      
      this.gcObserver.observe({ entryTypes: ['gc'] })
    } catch (error) {
      console.warn('GC monitoring not available')
    }
  }

  private async captureSnapshot(): Promise<void> {
    if (!this.isActive) return

    const snapshot = await this.createSnapshot()
    this.snapshots.push(snapshot)

    // Limit snapshot history
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots)
    }
  }

  private async createSnapshot(): Promise<MemorySnapshot> {
    const memUsage = process.memoryUsage()
    
    let heapStats: HeapStatistics = {} as HeapStatistics
    try {
      const v8 = await import('v8')
      heapStats = v8.default.getHeapStatistics()
    } catch (error) {
      // V8 heap stats not available
      heapStats = {
        total_heap_size: memUsage.heapTotal,
        total_heap_size_executable: 0,
        total_physical_size: memUsage.heapUsed,
        total_available_size: memUsage.heapTotal - memUsage.heapUsed,
        used_heap_size: memUsage.heapUsed,
        heap_size_limit: memUsage.heapTotal * 4, // Estimate
        malloced_memory: 0,
        peak_malloced_memory: 0,
        external_memory: memUsage.external,
        number_of_detached_contexts: 0,
        number_of_native_contexts: 0
      }
    }

    return {
      timestamp: Date.now(),
      totalHeapSize: heapStats.total_heap_size || memUsage.heapTotal,
      totalHeapSizeExecutable: heapStats.total_heap_size_executable || 0,
      totalPhysicalSize: heapStats.total_physical_size || memUsage.heapUsed,
      totalAvailableSize: heapStats.total_available_size || (memUsage.heapTotal - memUsage.heapUsed),
      usedHeapSize: heapStats.used_heap_size || memUsage.heapUsed,
      heapSizeLimit: heapStats.heap_size_limit || memUsage.heapTotal * 4,
      mallocedMemory: heapStats.malloced_memory || 0,
      peakMallocedMemory: heapStats.peak_malloced_memory || 0,
      externalMemory: heapStats.external_memory || memUsage.external,
      numberOfDetachedContexts: heapStats.number_of_detached_contexts || 0,
      numberOfNativeContexts: heapStats.number_of_native_contexts || 0
    }
  }

  private detectMemoryLeaks(): MemoryLeakInfo[] {
    if (this.snapshots.length < 10) {
      return []
    }

    const leaks: MemoryLeakInfo[] = []
    
    // Analyze recent memory growth
    const recentSnapshots = this.snapshots.slice(-20)
    const memoryGrowth = this.analyzeMemoryTrend(20 * this.samplingInterval)
    
    if (memoryGrowth.trend === 'increasing' && memoryGrowth.growthRate > this.leakDetectionThreshold) {
      const severity = this.classifyLeakSeverity(memoryGrowth.growthRate)
      
      leaks.push({
        severity,
        leakRate: memoryGrowth.growthRate,
        affectedArea: 'Heap Memory',
        description: `Consistent memory growth detected: ${memoryGrowth.growthRate.toFixed(2)} MB/min`,
        recommendation: this.getLeakRecommendation(severity),
        confidence: memoryGrowth.confidence,
        detectionMethod: 'Linear regression analysis'
      })
    }

    // Check for external memory leaks
    const externalGrowth = this.analyzeExternalMemoryGrowth()
    if (externalGrowth.isLeaking) {
      leaks.push({
        severity: 'moderate',
        leakRate: externalGrowth.rate,
        affectedArea: 'External Memory',
        description: 'External memory (Buffers, native modules) is growing unexpectedly',
        recommendation: 'Check Buffer usage and native module memory management',
        confidence: 75,
        detectionMethod: 'External memory trend analysis'
      })
    }

    return leaks
  }

  private analyzeAllocationPatterns(): AllocationPattern[] {
    // This would analyze allocation patterns if heap profiling data was available
    // For now, return basic patterns based on memory snapshots
    const patterns: AllocationPattern[] = []

    if (this.snapshots.length < 5) return patterns

    const avgHeapGrowth = this.calculateAverageHeapGrowth()
    
    if (avgHeapGrowth > 0) {
      patterns.push({
        pattern: 'Regular allocations',
        frequency: this.snapshots.length,
        averageSize: avgHeapGrowth,
        peakSize: this.getPeakMemoryUsage(),
        totalAllocated: this.getTotalMemoryAllocated(),
        source: 'Heap memory',
        efficiency: this.calculateAllocationEfficiency()
      })
    }

    return patterns
  }

  private generateSummary(): MemoryProfileSummary {
    if (this.snapshots.length === 0) {
      return {
        peakMemoryUsage: 0,
        averageMemoryUsage: 0,
        memoryGrowthRate: 0,
        totalAllocations: 0,
        gcPressure: 0,
        leakScore: 0,
        efficiencyScore: 100,
        stabilityScore: 100
      }
    }

    const memoryValues = this.snapshots.map(s => s.usedHeapSize / (1024 * 1024)) // Convert to MB
    const peakMemoryUsage = Math.max(...memoryValues)
    const averageMemoryUsage = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length
    
    const trend = this.analyzeMemoryTrend()
    const memoryGrowthRate = trend.growthRate
    
    // Calculate scores
    const leakScore = this.calculateLeakScore(trend)
    const efficiencyScore = this.calculateEfficiencyScore()
    const stabilityScore = this.calculateStabilityScore()
    const gcPressure = this.calculateGCPressure()

    return {
      peakMemoryUsage,
      averageMemoryUsage,
      memoryGrowthRate,
      totalAllocations: this.snapshots.length, // Simplified
      gcPressure,
      leakScore,
      efficiencyScore,
      stabilityScore
    }
  }

  private generateRecommendations(
    leaks: MemoryLeakInfo[],
    patterns: AllocationPattern[],
    summary: MemoryProfileSummary
  ): string[] {
    const recommendations: string[] = []

    // Leak-based recommendations
    if (leaks.length > 0) {
      recommendations.push('Memory leaks detected - review object lifecycle and event listener cleanup')
      
      const severeLeaks = leaks.filter(l => l.severity === 'severe' || l.severity === 'critical')
      if (severeLeaks.length > 0) {
        recommendations.push('Critical memory leaks require immediate attention')
      }
    }

    // Performance recommendations
    if (summary.gcPressure > 70) {
      recommendations.push('High GC pressure - implement object pooling and reduce object allocation')
    }

    if (summary.peakMemoryUsage > 500) { // 500MB
      recommendations.push('High peak memory usage - consider memory optimization techniques')
    }

    if (summary.efficiencyScore < 60) {
      recommendations.push('Low memory efficiency - review data structures and caching strategies')
    }

    if (summary.stabilityScore < 70) {
      recommendations.push('Memory usage is volatile - investigate allocation patterns')
    }

    // Pattern-based recommendations
    for (const pattern of patterns) {
      if (pattern.efficiency < 0.5) {
        recommendations.push(`${pattern.source} allocation efficiency is low - review ${pattern.pattern}`)
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Memory usage appears healthy - no major issues detected')
    }

    return recommendations
  }

  // === Utility Methods ===

  private linearRegression(x: number[], y: number[]): { slope: number; rSquared: number } {
    const n = x.length
    const sumX = x.reduce((sum, val) => sum + val, 0)
    const sumY = y.reduce((sum, val) => sum + val, 0)
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0)
    const sumXX = x.reduce((sum, val) => sum + val * val, 0)
    const sumYY = y.reduce((sum, val) => sum + val * val, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Calculate R-squared
    const predictions = x.map(val => slope * val + intercept)
    const meanY = sumY / n
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0)
    const residualSumSquares = y.reduce((sum, val, i) => sum + Math.pow(val - predictions[i], 2), 0)
    const rSquared = 1 - (residualSumSquares / totalSumSquares)

    return { slope, rSquared: Math.max(0, rSquared) }
  }

  private classifyLeakSeverity(leakRate: number): 'minor' | 'moderate' | 'severe' | 'critical' {
    if (leakRate > 10) return 'critical'
    if (leakRate > 5) return 'severe'
    if (leakRate > 2) return 'moderate'
    return 'minor'
  }

  private getLeakRecommendation(severity: string): string {
    switch (severity) {
      case 'critical': return 'Immediate action required - stop application and investigate'
      case 'severe': return 'High priority fix needed - review recent code changes'
      case 'moderate': return 'Schedule time to investigate and fix leak'
      case 'minor': return 'Monitor and investigate if trend continues'
      default: return 'Monitor memory usage'
    }
  }

  private analyzeExternalMemoryGrowth(): { isLeaking: boolean; rate: number } {
    if (this.snapshots.length < 5) return { isLeaking: false, rate: 0 }

    const recent = this.snapshots.slice(-10)
    const externalValues = recent.map(s => s.externalMemory)
    const timeValues = recent.map(s => s.timestamp)

    const { slope } = this.linearRegression(timeValues, externalValues)
    const growthRate = (slope * 60000) / (1024 * 1024) // MB per minute

    return {
      isLeaking: growthRate > 1, // 1MB per minute threshold
      rate: growthRate
    }
  }

  private calculateAverageHeapGrowth(): number {
    if (this.snapshots.length < 2) return 0
    
    let totalGrowth = 0
    for (let i = 1; i < this.snapshots.length; i++) {
      const growth = this.snapshots[i].usedHeapSize - this.snapshots[i - 1].usedHeapSize
      totalGrowth += Math.max(0, growth) // Only count positive growth
    }
    
    return totalGrowth / (this.snapshots.length - 1) / (1024 * 1024) // MB
  }

  private getPeakMemoryUsage(): number {
    return Math.max(...this.snapshots.map(s => s.usedHeapSize)) / (1024 * 1024) // MB
  }

  private getTotalMemoryAllocated(): number {
    if (this.snapshots.length < 2) return 0
    const latest = this.snapshots[this.snapshots.length - 1]
    const first = this.snapshots[0]
    return Math.max(0, latest.usedHeapSize - first.usedHeapSize) / (1024 * 1024) // MB
  }

  private calculateAllocationEfficiency(): number {
    // Simple efficiency calculation based on memory stability
    if (this.snapshots.length < 3) return 1

    const memoryValues = this.snapshots.map(s => s.usedHeapSize)
    const mean = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length
    const variance = memoryValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / memoryValues.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / mean

    // Lower variation = higher efficiency
    return Math.max(0, 1 - coefficientOfVariation)
  }

  private calculateLeakScore(trend: MemoryTrend): number {
    if (trend.trend === 'increasing') {
      // Convert growth rate to a 0-100 score (higher is worse)
      return Math.min(100, trend.growthRate * 10)
    }
    return 0
  }

  private calculateEfficiencyScore(): number {
    // Based on memory stability and GC pressure
    const latest = this.snapshots[this.snapshots.length - 1]
    const heapUtilization = latest.usedHeapSize / latest.totalHeapSize
    
    // Good utilization is around 60-80%
    let utilizationScore = 100
    if (heapUtilization < 0.3 || heapUtilization > 0.9) {
      utilizationScore = 60
    }

    return utilizationScore
  }

  private calculateStabilityScore(): number {
    if (this.snapshots.length < 5) return 100

    const memoryValues = this.snapshots.map(s => s.usedHeapSize)
    const mean = memoryValues.reduce((sum, val) => sum + val, 0) / memoryValues.length
    const variance = memoryValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / memoryValues.length
    const stdDev = Math.sqrt(variance)
    const coefficientOfVariation = stdDev / mean

    // Lower variation = higher stability
    return Math.max(0, 100 * (1 - coefficientOfVariation * 5))
  }

  private calculateGCPressure(): number {
    // Estimate GC pressure based on memory growth patterns
    if (this.snapshots.length < 5) return 0

    const recent = this.snapshots.slice(-5)
    let gcEvents = 0
    
    for (let i = 1; i < recent.length; i++) {
      const memoryDrop = recent[i - 1].usedHeapSize - recent[i].usedHeapSize
      if (memoryDrop > recent[i].usedHeapSize * 0.1) { // 10% drop indicates GC
        gcEvents++
      }
    }

    // Convert to pressure score
    return Math.min(100, (gcEvents / (recent.length - 1)) * 100)
  }
}

import { BaseFactory } from '@/common/BaseFactory'

interface MemoryProfilerConfig {
  samplingInterval?: number
  leakDetectionThreshold?: number
  maxSnapshots?: number
  heapDumpPath?: string
  enableHeapDumps?: boolean
}

/**
 * Factory for creating memory profilers with preset configurations
 */
export class MemoryProfilerFactory extends BaseFactory<MemoryProfiler, MemoryProfilerConfig> {
  // Register presets
  static {
    this.registerPreset('development', {
      name: 'development',
      description: 'Profiler for development use',
      config: {
        samplingInterval: 1000, // 1 second
        leakDetectionThreshold: 2, // 2MB per minute
        maxSnapshots: 500,
        enableHeapDumps: false
      }
    })

    this.registerPreset('production', {
      name: 'production',
      description: 'Profiler for production monitoring',
      config: {
        samplingInterval: 10000, // 10 seconds
        leakDetectionThreshold: 5, // 5MB per minute
        maxSnapshots: 1000,
        enableHeapDumps: false
      }
    })

    this.registerPreset('analysis', {
      name: 'analysis',
      description: 'Profiler for detailed analysis',
      config: {
        samplingInterval: 500, // 500ms
        leakDetectionThreshold: 1, // 1MB per minute
        maxSnapshots: 2000,
        enableHeapDumps: true,
        heapDumpPath: './analysis/heap-dumps'
      }
    })

    this.registerPreset('stress-test', {
      name: 'stress-test',
      description: 'Profiler for stress testing',
      config: {
        samplingInterval: 100, // 100ms
        leakDetectionThreshold: 0.5, // 0.5MB per minute
        maxSnapshots: 5000,
        enableHeapDumps: false
      }
    })
  }

  /**
   * Create profiler for development use
   */
  static createDevelopmentProfiler(): MemoryProfiler {
    return this.createWithPreset('development', (config) => new MemoryProfiler(config))
  }

  /**
   * Create profiler for production monitoring
   */
  static createProductionProfiler(): MemoryProfiler {
    return this.createWithPreset('production', (config) => new MemoryProfiler(config))
  }

  /**
   * Create profiler for detailed analysis
   */
  static createAnalysisProfiler(): MemoryProfiler {
    return this.createWithPreset('analysis', (config) => new MemoryProfiler(config))
  }

  /**
   * Create profiler for stress testing
   */
  static createStressTestProfiler(): MemoryProfiler {
    return this.createWithPreset('stress-test', (config) => new MemoryProfiler(config))
  }
}

export default MemoryProfiler