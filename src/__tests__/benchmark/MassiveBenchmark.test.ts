import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MassiveBenchmark } from '@/benchmark/MassiveBenchmark'
import { TestDataGenerator, PerformanceTestHelper, MemoryTestHelper, StatisticalTestHelper } from '../utils/TestHelpers'
import type { GameConfig } from '@/domain/types/game.types'

describe('Massive Scale Benchmark Tests', () => {
  let benchmark: MassiveBenchmark
  let testConfig: GameConfig

  beforeEach(() => {
    TestDataGenerator.setSeed(12345)
    testConfig = TestDataGenerator.createTestGameConfig({
      maxTurns: 3, // Keep games short for testing
      initialVitality: 100
    })
    
    benchmark = new MassiveBenchmark()
    MemoryTestHelper.startMemoryMonitoring()
  })

  afterEach(() => {
    PerformanceTestHelper.clearMeasurements()
  })

  describe('Basic Benchmark Functionality', () => {
    it('should initialize benchmark correctly', () => {
      expect(benchmark).toBeDefined()
      expect(benchmark).toBeInstanceOf(MassiveBenchmark)
    })

    it('should run small-scale benchmark successfully', async () => {
      const config = {
        gameCount: 10,
        concurrency: 2,
        timeout: 30000,
        collectStats: true
      }

      const results = await benchmark.runBenchmark(config)

      expect(results).toBeDefined()
      expect(results.totalGames).toBe(config.gameCount)
      expect(results.successfulGames).toBeGreaterThan(0)
      expect(results.executionTime).toBeGreaterThan(0)
      expect(results.statistics).toBeDefined()
    })

    it('should handle different concurrency levels', async () => {
      const concurrencyLevels = [1, 2, 4]
      const gameCount = 6

      for (const concurrency of concurrencyLevels) {
        const config = {
          gameCount,
          concurrency,
          timeout: 15000
        }

        const results = await benchmark.runBenchmark(config)

        expect(results.totalGames).toBe(gameCount)
        expect(results.successfulGames).toBeLessThanOrEqual(gameCount)
        expect(results.executionTime).toBeGreaterThan(0)

        console.log(`Concurrency ${concurrency}: ${results.successfulGames}/${results.totalGames} games in ${results.executionTime.toFixed(2)}ms`)
      }
    })

    it('should collect comprehensive statistics', async () => {
      const config = {
        gameCount: 20,
        concurrency: 4,
        collectStats: true,
        timeout: 20000
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.statistics).toBeDefined()
      expect(results.statistics.executionTime).toBeDefined()
      expect(results.statistics.memoryUsage).toBeDefined()
      expect(results.statistics.gameOutcomes).toBeDefined()

      const timeStats = results.statistics.executionTime
      expect(timeStats.mean).toBeGreaterThan(0)
      expect(timeStats.standardDeviation).toBeGreaterThanOrEqual(0)
      expect(timeStats.min).toBeLessThanOrEqual(timeStats.mean)
      expect(timeStats.max).toBeGreaterThanOrEqual(timeStats.mean)
    })
  })

  describe('Parallel Execution and Worker Thread Tests', () => {
    it('should execute games in parallel correctly', async () => {
      const gameCount = 8
      const concurrency = 4

      const startTime = performance.now()
      const results = await benchmark.runBenchmark({
        gameCount,
        concurrency,
        timeout: 15000
      })
      const endTime = performance.now()

      expect(results.successfulGames).toBeGreaterThan(0)

      // Parallel execution should be faster than sequential
      const parallelTime = endTime - startTime
      const estimatedSequentialTime = results.statistics?.executionTime.mean * gameCount

      if (estimatedSequentialTime) {
        expect(parallelTime).toBeLessThan(estimatedSequentialTime * 0.8) // Should be significantly faster
      }
    })

    it('should handle worker thread communication', async () => {
      const config = {
        gameCount: 6,
        concurrency: 3,
        useWorkerThreads: true,
        timeout: 15000
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.totalGames).toBe(config.gameCount)
      expect(results.successfulGames).toBeGreaterThan(0)
      expect(results.workerMetrics).toBeDefined()

      if (results.workerMetrics) {
        expect(results.workerMetrics.threadsUsed).toBeGreaterThan(0)
        expect(results.workerMetrics.threadsUsed).toBeLessThanOrEqual(config.concurrency)
      }
    })

    it('should distribute workload evenly across workers', async () => {
      const config = {
        gameCount: 12,
        concurrency: 3,
        useWorkerThreads: true,
        collectWorkerStats: true,
        timeout: 20000
      }

      const results = await benchmark.runBenchmark(config)

      if (results.workerMetrics && results.workerMetrics.workerStats) {
        const workerStats = results.workerMetrics.workerStats
        const gamesPerWorker = workerStats.map(stat => stat.gamesProcessed)

        // Workload should be relatively balanced
        const totalGames = gamesPerWorker.reduce((sum, count) => sum + count, 0)
        const expectedGamesPerWorker = totalGames / gamesPerWorker.length
        
        gamesPerWorker.forEach(count => {
          expect(count).toBeGreaterThan(0)
          expect(Math.abs(count - expectedGamesPerWorker)).toBeLessThan(expectedGamesPerWorker * 0.5) // Within 50% of expected
        })
      }
    })

    it('should handle worker thread errors gracefully', async () => {
      // Simulate worker errors by running with very low timeout
      const config = {
        gameCount: 10,
        concurrency: 4,
        useWorkerThreads: true,
        timeout: 1, // Very low timeout to force errors
        collectStats: true
      }

      const results = await benchmark.runBenchmark(config)

      expect(results).toBeDefined()
      expect(results.totalGames).toBe(config.gameCount)
      // Some games may fail due to timeout, but benchmark should complete
      expect(results.failedGames).toBeGreaterThanOrEqual(0)
      expect(results.successfulGames + results.failedGames).toBe(results.totalGames)
    })
  })

  describe('Large Scale Data Processing', () => {
    it('should handle 1K games efficiently', async () => {
      const config = {
        gameCount: 1000,
        concurrency: 8,
        timeout: 60000,
        collectStats: true
      }

      const { result, timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'benchmark_1k_games',
        () => benchmark.runBenchmark(config)
      )

      expect(result.totalGames).toBe(1000)
      expect(result.successfulGames).toBeGreaterThan(900) // At least 90% success rate
      expect(timeMs).toBeLessThan(50000) // Should complete within 50 seconds

      console.log(`1K games benchmark: ${result.successfulGames}/${result.totalGames} successful in ${timeMs.toFixed(2)}ms`)
    }, 70000) // 70 second timeout for this test

    it('should process large datasets without memory leaks', async () => {
      const initialMemory = MemoryTestHelper.getMemoryDelta()

      const config = {
        gameCount: 500,
        concurrency: 6,
        timeout: 30000,
        collectStats: true
      }

      const results = await benchmark.runBenchmark(config)

      const finalMemory = MemoryTestHelper.getMemoryDelta()
      const memoryIncrease = finalMemory - initialMemory

      expect(results.successfulGames).toBeGreaterThan(400)

      // Memory increase should be reasonable for processing 500 games
      MemoryTestHelper.assertMemoryUsage(50 * 1024 * 1024) // 50MB limit

      console.log(`500 games processed with ${MemoryTestHelper.formatBytes(memoryIncrease)} memory increase`)
    }, 40000)

    it('should generate accurate statistics for large datasets', async () => {
      const config = {
        gameCount: 200,
        concurrency: 8,
        collectStats: true,
        collectDetailedStats: true,
        timeout: 25000
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.statistics).toBeDefined()

      // Verify statistical accuracy
      const timeStats = results.statistics.executionTime
      expect(timeStats.count).toBe(results.successfulGames)
      expect(timeStats.mean).toBeGreaterThan(0)
      expect(timeStats.standardDeviation).toBeGreaterThanOrEqual(0)

      // Memory statistics should be realistic
      const memoryStats = results.statistics.memoryUsage
      expect(memoryStats.average).toBeGreaterThan(0)
      expect(memoryStats.peak).toBeGreaterThanOrEqual(memoryStats.average)

      // Game outcome distribution should make sense
      const outcomes = results.statistics.gameOutcomes
      expect(outcomes.completed + outcomes.failed + outcomes.timeout).toBe(results.totalGames)
    })
  })

  describe('Memory Efficiency and Stability', () => {
    it('should maintain stable memory usage during extended runs', async () => {
      const batchCount = 5
      const gamesPerBatch = 50
      const memoryReadings: number[] = []

      for (let batch = 0; batch < batchCount; batch++) {
        const config = {
          gameCount: gamesPerBatch,
          concurrency: 4,
          timeout: 15000
        }

        await benchmark.runBenchmark(config)
        
        if (global.gc) global.gc() // Force garbage collection
        
        memoryReadings.push(MemoryTestHelper.getMemoryDelta())
      }

      // Memory should not grow significantly between batches
      const memoryStats = StatisticalTestHelper.calculateStats(memoryReadings)
      const memoryGrowth = memoryReadings[memoryReadings.length - 1] - memoryReadings[0]

      expect(memoryGrowth).toBeLessThan(20 * 1024 * 1024) // Less than 20MB growth

      console.log(`Memory stability test: ${MemoryTestHelper.formatBytes(memoryGrowth)} growth over ${batchCount} batches`)
    })

    it('should handle extreme memory constraints', async () => {
      // Simulate memory-constrained environment
      const config = {
        gameCount: 100,
        concurrency: 2, // Lower concurrency to reduce memory pressure
        timeout: 20000,
        memoryLimit: 100 * 1024 * 1024, // 100MB limit
        collectStats: false // Reduce memory overhead
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.totalGames).toBe(100)
      expect(results.successfulGames).toBeGreaterThan(50) // Should complete at least half

      // Verify memory constraint was respected
      const memoryUsage = MemoryTestHelper.getMemoryDelta()
      expect(memoryUsage).toBeLessThan(config.memoryLimit!)
    })

    it('should clean up resources properly after benchmark', async () => {
      const config = {
        gameCount: 50,
        concurrency: 4,
        timeout: 15000
      }

      const initialMemory = MemoryTestHelper.getMemoryDelta()

      await benchmark.runBenchmark(config)
      
      // Force cleanup
      await benchmark.cleanup()
      
      if (global.gc) global.gc()
      
      const finalMemory = MemoryTestHelper.getMemoryDelta()
      const memoryRetention = finalMemory - initialMemory

      // Should have minimal memory retention after cleanup
      expect(memoryRetention).toBeLessThan(10 * 1024 * 1024) // Less than 10MB
    })
  })

  describe('Error Handling and Recovery', () => {
    it('should handle individual game failures gracefully', async () => {
      // Inject failures by using invalid game config
      const faultyConfig = {
        gameCount: 20,
        concurrency: 4,
        timeout: 10000,
        gameConfig: {
          ...testConfig,
          maxTurns: -1 // Invalid config to cause failures
        }
      }

      const results = await benchmark.runBenchmark(faultyConfig)

      expect(results.totalGames).toBe(20)
      expect(results.failedGames).toBeGreaterThan(0)
      expect(results.successfulGames + results.failedGames).toBe(results.totalGames)
      expect(results.errorDetails).toBeDefined()
    })

    it('should recover from worker thread crashes', async () => {
      const config = {
        gameCount: 30,
        concurrency: 6,
        useWorkerThreads: true,
        timeout: 15000,
        retryFailedGames: true,
        maxRetries: 2
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.totalGames).toBe(30)
      expect(results.successfulGames).toBeGreaterThan(0)
      
      if (results.retryMetrics) {
        expect(results.retryMetrics.totalRetries).toBeGreaterThanOrEqual(0)
        expect(results.retryMetrics.successfulRetries).toBeLessThanOrEqual(results.retryMetrics.totalRetries)
      }
    })

    it('should handle timeout scenarios correctly', async () => {
      const config = {
        gameCount: 10,
        concurrency: 2,
        timeout: 100, // Very short timeout
        collectStats: true
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.totalGames).toBe(10)
      expect(results.timeoutGames).toBeGreaterThan(0)
      expect(results.statistics?.gameOutcomes.timeout).toBeGreaterThan(0)
    })

    it('should provide detailed error reporting', async () => {
      const config = {
        gameCount: 15,
        concurrency: 3,
        timeout: 5000,
        collectErrorDetails: true,
        gameConfig: testConfig
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.errorDetails).toBeDefined()
      
      if (results.failedGames > 0) {
        expect(results.errorDetails!.length).toBeGreaterThan(0)
        
        results.errorDetails!.forEach(error => {
          expect(error.gameIndex).toBeGreaterThanOrEqual(0)
          expect(error.error).toBeDefined()
          expect(error.timestamp).toBeGreaterThan(0)
        })
      }
    })
  })

  describe('Performance Regression Testing', () => {
    it('should detect performance regressions', async () => {
      // Establish baseline
      const baselineConfig = {
        gameCount: 50,
        concurrency: 4,
        timeout: 15000,
        collectStats: true
      }

      const baselineResults = await benchmark.runBenchmark(baselineConfig)
      const baselineTime = baselineResults.statistics?.executionTime.mean || 0

      // Test current performance
      const currentResults = await benchmark.runBenchmark(baselineConfig)
      const currentTime = currentResults.statistics?.executionTime.mean || 0

      // Performance should be within reasonable bounds
      const performanceRatio = currentTime / baselineTime
      expect(performanceRatio).toBeLessThan(2.0) // No more than 2x slower
      expect(performanceRatio).toBeGreaterThan(0.5) // No more than 2x faster (suspiciously fast)

      console.log(`Performance ratio: ${performanceRatio.toFixed(2)} (current: ${currentTime.toFixed(2)}ms, baseline: ${baselineTime.toFixed(2)}ms)`)
    })

    it('should benchmark different game configurations', async () => {
      const configurations = [
        { maxTurns: 2, description: 'short' },
        { maxTurns: 5, description: 'medium' },
        { maxTurns: 8, description: 'long' }
      ]

      const results: any[] = []

      for (const config of configurations) {
        const gameConfig = TestDataGenerator.createTestGameConfig(config)
        
        const benchmarkResult = await benchmark.runBenchmark({
          gameCount: 30,
          concurrency: 4,
          timeout: 15000,
          gameConfig,
          collectStats: true
        })

        results.push({
          description: config.description,
          avgTime: benchmarkResult.statistics?.executionTime.mean || 0,
          successRate: benchmarkResult.successfulGames / benchmarkResult.totalGames
        })
      }

      // Verify results make sense
      results.forEach(result => {
        expect(result.avgTime).toBeGreaterThan(0)
        expect(result.successRate).toBeGreaterThan(0.8) // At least 80% success rate
      })

      // Longer games should generally take more time
      expect(results[2].avgTime).toBeGreaterThan(results[0].avgTime)

      console.log('Configuration benchmark results:')
      results.forEach(result => {
        console.log(`  ${result.description}: ${result.avgTime.toFixed(2)}ms avg, ${(result.successRate * 100).toFixed(1)}% success`)
      })
    })
  })

  describe('Stress Testing', () => {
    it('should handle maximum system load', async () => {
      const maxConcurrency = Math.min(16, require('os').cpus().length * 2)
      
      const config = {
        gameCount: maxConcurrency * 10,
        concurrency: maxConcurrency,
        timeout: 30000,
        collectStats: true
      }

      const results = await benchmark.runBenchmark(config)

      expect(results.totalGames).toBe(config.gameCount)
      expect(results.successfulGames).toBeGreaterThan(config.gameCount * 0.7) // At least 70% success under stress

      console.log(`Stress test: ${results.successfulGames}/${results.totalGames} successful with ${maxConcurrency} concurrent workers`)
    }, 40000)

    it('should maintain stability over long durations', async () => {
      const duration = 10000 // 10 seconds
      const startTime = Date.now()
      const batchSize = 20
      let totalGames = 0
      let successfulGames = 0

      while (Date.now() - startTime < duration) {
        const results = await benchmark.runBenchmark({
          gameCount: batchSize,
          concurrency: 4,
          timeout: 5000
        })

        totalGames += results.totalGames
        successfulGames += results.successfulGames
      }

      expect(totalGames).toBeGreaterThan(0)
      expect(successfulGames).toBeGreaterThan(totalGames * 0.8) // Maintain 80% success rate

      console.log(`Duration test: ${successfulGames}/${totalGames} successful over ${duration}ms`)
    }, 15000)
  })
})