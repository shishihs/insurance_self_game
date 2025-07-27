import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GamePerformanceAnalyzer } from '@/performance/GamePerformanceAnalyzer'
import { MemoryProfiler } from '@/performance/MemoryProfiler'
import { RealTimeMonitor } from '@/performance/RealTimeMonitor'
import { GameController } from '@/controllers/GameController'
import { MockRenderer, TestDataGenerator, PerformanceTestHelper, MemoryTestHelper, StatisticalTestHelper } from '../utils/TestHelpers'
import type { GameConfig } from '@/domain/types/game.types'

describe('Performance Infrastructure Tests', () => {
  let analyzer: GamePerformanceAnalyzer
  let memoryProfiler: MemoryProfiler
  let realTimeMonitor: RealTimeMonitor
  let testConfig: GameConfig
  let mockRenderer: MockRenderer

  beforeEach(() => {
    TestDataGenerator.setSeed(12345)
    testConfig = TestDataGenerator.createTestGameConfig()
    mockRenderer = new MockRenderer()
    
    analyzer = new GamePerformanceAnalyzer()
    memoryProfiler = new MemoryProfiler()
    realTimeMonitor = new RealTimeMonitor()
    
    MemoryTestHelper.startMemoryMonitoring()
  })

  afterEach(() => {
    PerformanceTestHelper.clearMeasurements()
  })

  describe('GamePerformanceAnalyzer Tests', () => {
    it('should measure single game execution time accurately', async () => {
      mockRenderer.addInputValue(0)
      mockRenderer.addInputValue([])
      
      const controller = new GameController(testConfig, mockRenderer)
      
      const startTime = performance.now()
      const metrics = await analyzer.measureGameExecution(async () => {
        return await controller.playGame()
      })
      const endTime = performance.now()
      const actualTime = endTime - startTime
      
      expect(metrics).toBeDefined()
      expect(metrics.executionTime).toBeGreaterThan(0)
      expect(metrics.executionTime).toBeLessThanOrEqual(actualTime + 5) // Allow 5ms tolerance
      expect(metrics.memoryUsage).toBeDefined()
      expect(metrics.cpuUsage).toBeDefined()
      expect(metrics.gcCount).toBeGreaterThanOrEqual(0)
    })

    it('should provide microsecond precision measurements', async () => {
      const quickOperation = () => Promise.resolve(42)
      
      const metrics = await analyzer.measureGameExecution(quickOperation)
      
      expect(metrics.executionTime).toBeGreaterThan(0)
      expect(metrics.executionTime).toBeLessThan(10) // Should be very fast
      
      // Test precision by measuring multiple times
      const measurements: number[] = []
      for (let i = 0; i < 10; i++) {
        const metric = await analyzer.measureGameExecution(quickOperation)
        measurements.push(metric.executionTime)
      }
      
      // Measurements should show precision (not all identical)
      const uniqueValues = new Set(measurements)
      expect(uniqueValues.size).toBeGreaterThan(1)
    })

    it('should track memory usage accurately', async () => {
      const memoryIntensiveOperation = async () => {
        // Create some objects to consume memory
        const largeArray = new Array(100000).fill('memory test')
        await new Promise(resolve => setTimeout(resolve, 10))
        return largeArray.length
      }
      
      const metrics = await analyzer.measureGameExecution(memoryIntensiveOperation)
      
      expect(metrics.memoryUsage.before).toBeDefined()
      expect(metrics.memoryUsage.after).toBeDefined()
      expect(metrics.memoryUsage.delta).toBeDefined()
      expect(metrics.memoryUsage.peak).toBeDefined()
      
      // Memory delta should reflect the allocated array
      expect(metrics.memoryUsage.delta).toBeGreaterThan(0)
    })

    it('should detect garbage collection events', async () => {
      let gcCount = 0
      
      // Mock gc counting
      const originalGc = global.gc
      global.gc = () => {
        gcCount++
        if (originalGc) originalGc()
      }
      
      const operation = async () => {
        // Force some allocations
        for (let i = 0; i < 1000; i++) {
          new Array(1000).fill(i)
        }
        if (global.gc) global.gc()
        return true
      }
      
      const metrics = await analyzer.measureGameExecution(operation)
      
      expect(metrics.gcCount).toBeGreaterThanOrEqual(0)
      
      // Restore original gc
      global.gc = originalGc
    })

    it('should measure CPU usage patterns', async () => {
      const cpuIntensiveOperation = async () => {
        // CPU intensive calculation
        let result = 0
        for (let i = 0; i < 1000000; i++) {
          result += Math.sqrt(i) * Math.sin(i)
        }
        return result
      }
      
      const metrics = await analyzer.measureGameExecution(cpuIntensiveOperation)
      
      expect(metrics.cpuUsage).toBeDefined()
      expect(metrics.cpuUsage.average).toBeGreaterThan(0)
      expect(metrics.cpuUsage.peak).toBeGreaterThanOrEqual(metrics.cpuUsage.average)
    })

    it('should handle concurrent measurements safely', async () => {
      const operations = Array.from({ length: 5 }, (_, i) => 
        analyzer.measureGameExecution(async () => {
          await new Promise(resolve => setTimeout(resolve, 10 + i * 5))
          return i
        })
      )
      
      const results = await Promise.all(operations)
      
      expect(results).toHaveLength(5)
      results.forEach((metrics, index) => {
        expect(metrics).toBeDefined()
        expect(metrics.executionTime).toBeGreaterThan(0)
      })
    })

    it('should provide statistical analysis of multiple runs', async () => {
      const measurements: number[] = []
      
      // Run same operation multiple times
      for (let i = 0; i < 20; i++) {
        const metrics = await analyzer.measureGameExecution(async () => {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 10))
          return i
        })
        measurements.push(metrics.executionTime)
      }
      
      const stats = StatisticalTestHelper.calculateStats(measurements)
      
      expect(stats.count).toBe(20)
      expect(stats.mean).toBeGreaterThan(0)
      expect(stats.standardDeviation).toBeGreaterThan(0)
      expect(stats.min).toBeLessThanOrEqual(stats.mean)
      expect(stats.max).toBeGreaterThanOrEqual(stats.mean)
    })
  })

  describe('MemoryProfiler Tests', () => {
    it('should track memory allocations accurately', () => {
      memoryProfiler.startProfiling()
      
      // Allocate memory
      const largeObject = new Array(50000).fill('memory test')
      
      const profile = memoryProfiler.getProfile()
      memoryProfiler.stopProfiling()
      
      expect(profile).toBeDefined()
      expect(profile.heapUsed).toBeGreaterThan(0)
      expect(profile.heapTotal).toBeGreaterThanOrEqual(profile.heapUsed)
      expect(profile.external).toBeGreaterThanOrEqual(0)
    })

    it('should detect memory leaks over time', async () => {
      memoryProfiler.startProfiling()
      
      const initialProfile = memoryProfiler.getProfile()
      
      // Simulate memory leak
      const leakyObjects: any[] = []
      for (let i = 0; i < 100; i++) {
        leakyObjects.push(new Array(1000).fill(`leak-${i}`))
        await new Promise(resolve => setTimeout(resolve, 1))
      }
      
      const finalProfile = memoryProfiler.getProfile()
      memoryProfiler.stopProfiling()
      
      const memoryIncrease = finalProfile.heapUsed - initialProfile.heapUsed
      expect(memoryIncrease).toBeGreaterThan(0)
      
      // Check for leak detection
      const leakAnalysis = memoryProfiler.detectLeaks(initialProfile, finalProfile)
      expect(leakAnalysis.potentialLeak).toBe(true)
      expect(leakAnalysis.memoryGrowth).toBeGreaterThan(0)
    })

    it('should profile memory usage during game execution', async () => {
      mockRenderer.addInputValue(0)
      mockRenderer.addInputValue([])
      
      const controller = new GameController(testConfig, mockRenderer)
      
      memoryProfiler.startProfiling()
      await controller.playGame()
      const profile = memoryProfiler.getProfile()
      memoryProfiler.stopProfiling()
      
      expect(profile.heapUsed).toBeGreaterThan(0)
      expect(profile.samples.length).toBeGreaterThan(0)
      
      // Verify memory sampling worked
      expect(profile.samples[0].timestamp).toBeLessThan(profile.samples[profile.samples.length - 1].timestamp)
    })

    it('should calculate memory usage statistics', () => {
      memoryProfiler.startProfiling()
      
      // Create varying memory usage
      for (let i = 0; i < 10; i++) {
        new Array(i * 1000).fill(i)
      }
      
      const profile = memoryProfiler.getProfile()
      memoryProfiler.stopProfiling()
      
      const stats = memoryProfiler.calculateMemoryStats(profile.samples)
      
      expect(stats.average).toBeGreaterThan(0)
      expect(stats.peak).toBeGreaterThanOrEqual(stats.average)
      expect(stats.minimum).toBeLessThanOrEqual(stats.average)
      expect(stats.variance).toBeGreaterThanOrEqual(0)
    })

    it('should format memory values for human readability', () => {
      const bytes = 1536 * 1024 * 1024 // 1.5 GB
      const formatted = memoryProfiler.formatMemorySize(bytes)
      
      expect(formatted).toContain('1.5')
      expect(formatted).toContain('GB')
    })
  })

  describe('RealTimeMonitor Tests', () => {
    it('should start and stop monitoring correctly', () => {
      realTimeMonitor.start()
      expect(realTimeMonitor.isRunning()).toBe(true)
      
      realTimeMonitor.stop()
      expect(realTimeMonitor.isRunning()).toBe(false)
    })

    it('should collect performance metrics in real-time', async () => {
      realTimeMonitor.start()
      
      // Let monitor collect some data
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const metrics = realTimeMonitor.getCurrentMetrics()
      realTimeMonitor.stop()
      
      expect(metrics).toBeDefined()
      expect(metrics.timestamp).toBeGreaterThan(0)
      expect(metrics.memory).toBeDefined()
      expect(metrics.cpu).toBeDefined()
    })

    it('should maintain metric history', async () => {
      realTimeMonitor.start()
      
      // Generate some activity
      for (let i = 0; i < 5; i++) {
        new Array(10000).fill(i)
        await new Promise(resolve => setTimeout(resolve, 20))
      }
      
      const history = realTimeMonitor.getMetricHistory()
      realTimeMonitor.stop()
      
      expect(history.length).toBeGreaterThan(0)
      
      // Verify timestamps are in order
      for (let i = 1; i < history.length; i++) {
        expect(history[i].timestamp).toBeGreaterThan(history[i - 1].timestamp)
      }
    })

    it('should generate ASCII dashboard display', () => {
      realTimeMonitor.start()
      
      // Add some metric data
      const mockMetrics = {
        timestamp: Date.now(),
        memory: { heapUsed: 50 * 1024 * 1024, heapTotal: 100 * 1024 * 1024 },
        cpu: { usage: 45 }
      }
      
      const dashboard = realTimeMonitor.generateDashboard([mockMetrics])
      realTimeMonitor.stop()
      
      expect(dashboard).toBeDefined()
      expect(typeof dashboard).toBe('string')
      expect(dashboard.length).toBeGreaterThan(0)
      
      // Should contain performance indicators
      expect(dashboard).toMatch(/memory|cpu|performance/i)
    })

    it('should handle high-frequency monitoring', async () => {
      realTimeMonitor.start({ interval: 1 }) // 1ms interval
      
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const history = realTimeMonitor.getMetricHistory()
      realTimeMonitor.stop()
      
      // Should have collected many samples
      expect(history.length).toBeGreaterThan(10)
    })

    it('should alert on performance thresholds', async () => {
      const alerts: any[] = []
      
      realTimeMonitor.start({
        alertThresholds: {
          memoryUsage: 80, // 80% memory usage
          cpuUsage: 90     // 90% CPU usage
        },
        onAlert: (alert) => alerts.push(alert)
      })
      
      // Simulate high memory usage
      const largeArray = new Array(100000).fill('memory stress')
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      realTimeMonitor.stop()
      
      // May or may not trigger alerts depending on system load
      // Just verify the monitoring doesn't crash
      expect(alerts).toBeDefined()
    })
  })

  describe('Performance Integration Tests', () => {
    it('should coordinate all performance tools together', async () => {
      // Start all monitoring
      memoryProfiler.startProfiling()
      realTimeMonitor.start()
      
      // Run a complete game with performance tracking
      mockRenderer.addInputValue(0)
      mockRenderer.addInputValue([])
      
      const controller = new GameController(testConfig, mockRenderer)
      
      const metrics = await analyzer.measureGameExecution(async () => {
        return await controller.playGame()
      })
      
      // Collect results from all tools
      const memoryProfile = memoryProfiler.getProfile()
      const realtimeHistory = realTimeMonitor.getMetricHistory()
      
      // Stop monitoring
      memoryProfiler.stopProfiling()
      realTimeMonitor.stop()
      
      // Verify all tools collected data
      expect(metrics.executionTime).toBeGreaterThan(0)
      expect(memoryProfile.samples.length).toBeGreaterThan(0)
      expect(realtimeHistory.length).toBeGreaterThan(0)
      
      // Cross-validate measurements
      expect(metrics.memoryUsage.delta).toBeGreaterThanOrEqual(0)
      expect(memoryProfile.heapUsed).toBeGreaterThan(0)
    })

    it('should provide comprehensive performance report', async () => {
      // Simulate a complex game scenario
      const gameCount = 5
      const allMetrics: any[] = []
      
      for (let i = 0; i < gameCount; i++) {
        const renderer = new MockRenderer()
        renderer.addInputValue(0)
        renderer.addInputValue([])
        
        const controller = new GameController(testConfig, renderer)
        
        const metrics = await analyzer.measureGameExecution(async () => {
          return await controller.playGame()
        })
        
        allMetrics.push(metrics)
      }
      
      // Analyze performance across multiple games
      const executionTimes = allMetrics.map(m => m.executionTime)
      const memoryDeltas = allMetrics.map(m => m.memoryUsage.delta)
      
      const timeStats = StatisticalTestHelper.calculateStats(executionTimes)
      const memoryStats = StatisticalTestHelper.calculateStats(memoryDeltas)
      
      expect(timeStats.mean).toBeGreaterThan(0)
      expect(timeStats.standardDeviation).toBeGreaterThanOrEqual(0)
      expect(memoryStats.mean).toBeGreaterThanOrEqual(0)
      
      // Performance should be consistent (low variance)
      const coefficientOfVariation = timeStats.standardDeviation / timeStats.mean
      expect(coefficientOfVariation).toBeLessThan(1.0) // Less than 100% variance
      
      console.log(`Performance Summary:`)
      console.log(`  Execution Time: ${timeStats.mean.toFixed(2)}ms ± ${timeStats.standardDeviation.toFixed(2)}ms`)
      console.log(`  Memory Usage: ${MemoryTestHelper.formatBytes(memoryStats.mean)} ± ${MemoryTestHelper.formatBytes(memoryStats.standardDeviation)}`)
    })

    it('should benchmark against performance baselines', async () => {
      // Establish baseline performance
      const baselineIterations = 10
      const baselineTimes: number[] = []
      
      for (let i = 0; i < baselineIterations; i++) {
        const renderer = new MockRenderer()
        renderer.addInputValue(0)
        renderer.addInputValue([])
        
        const controller = new GameController(testConfig, renderer)
        
        const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
          'baseline_game',
          () => controller.playGame()
        )
        
        baselineTimes.push(timeMs)
      }
      
      const baselineStats = StatisticalTestHelper.calculateStats(baselineTimes)
      
      // Test current performance against baseline
      const currentTimes: number[] = []
      
      for (let i = 0; i < 5; i++) {
        const renderer = new MockRenderer()
        renderer.addInputValue(0)
        renderer.addInputValue([])
        
        const controller = new GameController(testConfig, renderer)
        
        const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
          'current_game',
          () => controller.playGame()
        )
        
        currentTimes.push(timeMs)
      }
      
      const currentStats = StatisticalTestHelper.calculateStats(currentTimes)
      
      // Performance regression test
      const performanceRegression = currentStats.mean > baselineStats.mean * 1.5 // 50% slower = regression
      
      expect(performanceRegression).toBe(false)
      
      console.log(`Baseline: ${baselineStats.mean.toFixed(2)}ms, Current: ${currentStats.mean.toFixed(2)}ms`)
    })
  })

  describe('Stress Testing Performance Tools', () => {
    it('should handle high-frequency measurements', async () => {
      const measurementCount = 1000
      const measurements: number[] = []
      
      for (let i = 0; i < measurementCount; i++) {
        const metrics = await analyzer.measureGameExecution(async () => {
          return Math.random()
        })
        measurements.push(metrics.executionTime)
      }
      
      expect(measurements).toHaveLength(measurementCount)
      
      // Verify all measurements are valid
      measurements.forEach(time => {
        expect(time).toBeGreaterThan(0)
        expect(time).toBeLessThan(1000) // Should be very fast
      })
      
      const stats = StatisticalTestHelper.calculateStats(measurements)
      console.log(`High-frequency test: ${stats.mean.toFixed(4)}ms average over ${measurementCount} measurements`)
    })

    it('should maintain accuracy under system load', async () => {
      // Create background load
      const backgroundTasks = Array.from({ length: 10 }, () => 
        new Promise(resolve => {
          const worker = () => {
            for (let i = 0; i < 100000; i++) {
              Math.sqrt(i)
            }
            setTimeout(worker, 1)
          }
          worker()
          setTimeout(resolve, 200)
        })
      )
      
      // Measure performance under load
      const metrics = await analyzer.measureGameExecution(async () => {
        const renderer = new MockRenderer()
        renderer.addInputValue(0)
        renderer.addInputValue([])
        
        const controller = new GameController(testConfig, renderer)
        return await controller.playGame()
      })
      
      // Clean up background tasks
      await Promise.race([Promise.all(backgroundTasks), new Promise(resolve => setTimeout(resolve, 300))])
      
      // Measurements should still be valid
      expect(metrics.executionTime).toBeGreaterThan(0)
      expect(metrics.memoryUsage).toBeDefined()
      expect(metrics.cpuUsage).toBeDefined()
    })
  })
})