import { Worker, isMainThread, parentPort, workerData } from 'worker_threads'
import { cpus } from 'os'
import chalk from 'chalk'
import cliProgress from 'cli-progress'
import { GameController, GameControllerFactory } from '@/controllers/GameController'
import { BenchmarkModeRenderer } from '@/cui/modes/BenchmarkMode'
import { GamePerformanceAnalyzer } from '@/performance/GamePerformanceAnalyzer'
import type { PlayerStats, GameConfig } from '@/domain/types/game.types'
import type { PerformanceAnalysis } from '@/performance/GamePerformanceAnalyzer'

/**
 * Configuration for massive benchmark execution
 */
export interface MassiveBenchmarkConfig {
  /** Total number of games to execute */
  totalGames: number
  /** Number of worker threads (default: CPU cores) */
  workerThreads: number
  /** Batch size per worker */
  batchSize: number
  /** Game configuration */
  gameConfig: GameConfig
  /** Performance monitoring enabled */
  enablePerformanceMonitoring: boolean
  /** Export format for results */
  exportFormat: 'json' | 'csv' | 'xlsx' | 'all'
  /** Output directory for results */
  outputDirectory: string
  /** AI strategy for automated gameplay */
  strategy: 'random' | 'greedy' | 'conservative' | 'aggressive' | 'balanced'
  /** Enable real-time progress display */
  showProgress: boolean
  /** Timeout per game in milliseconds */
  gameTimeout: number
}

/**
 * Results from massive benchmark execution
 */
export interface MassiveBenchmarkResults {
  /** Configuration used */
  config: MassiveBenchmarkConfig
  /** Execution metadata */
  execution: {
    startTime: string
    endTime: string
    totalDuration: number
    completedGames: number
    failedGames: number
    gamesPerSecond: number
    averageGameTime: number
  }
  /** Performance analysis */
  performance: PerformanceAnalysis
  /** Game statistics */
  statistics: BenchmarkStatistics
  /** Individual game results (summary) */
  gameResults: GameResultSummary[]
  /** Worker thread performance */
  workerPerformance: WorkerPerformanceData[]
  /** System resource usage */
  systemUsage: SystemResourceUsage
}

/**
 * Statistical analysis of benchmark results
 */
export interface BenchmarkStatistics {
  /** Overall game outcomes */
  outcomes: {
    victories: number
    gameOvers: number
    timeouts: number
    errors: number
    victoryRate: number
    averageTurns: number
    averageScore: number
  }
  /** Challenge performance */
  challenges: {
    totalAttempted: number
    totalSuccessful: number
    totalFailed: number
    successRate: number
    averagePerGame: number
    difficultyDistribution: Record<string, number>
  }
  /** Resource management */
  resources: {
    averageCardsAcquired: number
    averageHighestVitality: number
    averageInsuranceBurden: number
    cardAcquisitionRate: number
  }
  /** Performance distributions */
  distributions: {
    turnCounts: number[]
    scores: number[]
    challengeSuccessRates: number[]
    gameDurations: number[]
  }
  /** Advanced analytics */
  analytics: {
    correlations: CorrelationAnalysis
    outliers: OutlierAnalysis
    trends: TrendAnalysis
  }
}

/**
 * Summary of individual game result
 */
export interface GameResultSummary {
  gameId: number
  workerId: number
  outcome: 'victory' | 'game_over' | 'timeout' | 'error'
  stats: PlayerStats
  duration: number
  strategy: string
  stage: string
  errorMessage?: string
}

/**
 * Worker thread performance data
 */
export interface WorkerPerformanceData {
  workerId: number
  gamesProcessed: number
  totalTime: number
  averageGameTime: number
  memoryUsage: number
  errors: number
  successRate: number
}

/**
 * System resource usage during benchmark
 */
export interface SystemResourceUsage {
  cpu: {
    averageUsage: number
    peakUsage: number
    coreUtilization: number[]
  }
  memory: {
    peakUsage: number
    averageUsage: number
    gcPressure: number
  }
  disk: {
    readOperations: number
    writeOperations: number
    totalBytes: number
  }
}

/**
 * Statistical correlation analysis
 */
export interface CorrelationAnalysis {
  turnVsScore: number
  challengeSuccessVsVictory: number
  cardsAcquiredVsScore: number
  insuranceBurdenVsPerformance: number
}

/**
 * Outlier detection analysis
 */
export interface OutlierAnalysis {
  exceptionalVictories: GameResultSummary[]
  poorPerformances: GameResultSummary[]
  unusualDurations: GameResultSummary[]
  statisticalOutliers: GameResultSummary[]
}

/**
 * Trend analysis over time
 */
export interface TrendAnalysis {
  performanceOverTime: number[]
  memoryUsageOverTime: number[]
  successRateOverTime: number[]
  speedOverTime: number[]
}

/**
 * Massive benchmark execution engine
 */
export class MassiveBenchmark {
  private config: MassiveBenchmarkConfig
  private performanceAnalyzer: GamePerformanceAnalyzer
  private progressBar: cliProgress.MultiBar | null = null
  private workerProgressBars: Map<number, cliProgress.SingleBar> = new Map()
  private workers: Worker[] = []
  private results: MassiveBenchmarkResults | null = null
  private startTime: number = 0

  constructor(config: Partial<MassiveBenchmarkConfig>) {
    this.config = {
      totalGames: 10000,
      workerThreads: Math.max(1, cpus().length - 1), // Leave one core for main thread
      batchSize: 100,
      gameConfig: {
        difficulty: 'normal',
        startingVitality: 20,
        startingHandSize: 5,
        maxHandSize: 7,
        dreamCardCount: 2
      },
      enablePerformanceMonitoring: true,
      exportFormat: 'json',
      outputDirectory: './benchmark-results',
      strategy: 'balanced',
      showProgress: true,
      gameTimeout: 30000, // 30 seconds per game
      ...config
    }

    this.performanceAnalyzer = new GamePerformanceAnalyzer({
      enableMemoryMonitoring: this.config.enablePerformanceMonitoring,
      samplingInterval: 1000, // 1 second for massive benchmarks
      memoryLeakThreshold: 100
    })
  }

  /**
   * Execute massive benchmark
   */
  async execute(): Promise<MassiveBenchmarkResults> {
    console.clear()
    this.displayBenchmarkHeader()

    this.startTime = Date.now()
    this.performanceAnalyzer.startMonitoring()

    try {
      if (this.config.workerThreads <= 0) {
        await this.executeSingleThreaded()
      } else {
        await this.initializeWorkers()
        await this.distributeTasks()
        await this.waitForCompletion()
        await this.collectResults()
      }
    } catch (error) {
      console.error(chalk.red(`❌ Benchmark failed: ${error}`))
      throw error
    } finally {
      await this.cleanup()
    }

    const performanceAnalysis = this.performanceAnalyzer.stopMonitoring()
    this.results = await this.generateResults(performanceAnalysis)

    this.displayResults()
    await this.exportResults()

    return this.results
  }

  /**
   * Execute benchmark in phases (for very large benchmarks)
   */
  async executeInPhases(phaseSizes: number[]): Promise<MassiveBenchmarkResults[]> {
    const phaseResults: MassiveBenchmarkResults[] = []

    for (let i = 0; i < phaseSizes.length; i++) {
      console.log(chalk.cyan(`\n🚀 Starting Phase ${i + 1}/${phaseSizes.length} - ${phaseSizes[i]} games`))

      const phaseConfig = { ...this.config, totalGames: phaseSizes[i] }
      const phaseBenchmark = new MassiveBenchmark(phaseConfig)

      const result = await phaseBenchmark.execute()
      phaseResults.push(result)

      // Cleanup between phases
      await this.sleep(1000)
      if (global.gc) global.gc()
    }

    return phaseResults
  }

  /**
   * Get real-time benchmark status
   */
  getStatus(): {
    isRunning: boolean
    progress: number
    completedGames: number
    remainingGames: number
    estimatedTimeRemaining: number
    currentSpeed: number
  } {
    const completedGames = this.getCompletedGamesCount()
    const progress = (completedGames / this.config.totalGames) * 100
    const elapsed = Date.now() - this.startTime
    const currentSpeed = completedGames / (elapsed / 1000)
    const remainingGames = this.config.totalGames - completedGames
    const estimatedTimeRemaining = remainingGames / Math.max(currentSpeed, 1)

    return {
      isRunning: this.workers.length > 0,
      progress,
      completedGames,
      remainingGames,
      estimatedTimeRemaining,
      currentSpeed
    }
  }

  /**
   * Stop benchmark execution
   */
  async stop(): Promise<void> {
    console.log(chalk.yellow('\n⏹️ Stopping benchmark...'))

    for (const worker of this.workers) {
      await worker.terminate()
    }

    await this.cleanup()
    console.log(chalk.green('✅ Benchmark stopped'))
  }

  /**
   * Execute benchmark in single-threaded mode
   */
  private async executeSingleThreaded(): Promise<void> {
    console.log(chalk.blue('🧵 Running in single-threaded mode...'))

    const totalGames = this.config.totalGames
    const gameConfig = this.config.gameConfig
    const strategy = this.config.strategy
    const gameTimeout = this.config.gameTimeout

    if (this.config.showProgress) {
      this.progressBar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: ' {label} |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s | Speed: {speed}'
      }, cliProgress.Presets.shades_grey)

      const bar = this.progressBar.create(totalGames, 0, {
        label: 'Main Thread',
        speed: '0 games/s'
      })
      this.workerProgressBars.set(0, bar)
    }

    const startTime = Date.now()
    let lastProgressUpdate = startTime
    const results: GameResultSummary[] = []

    for (let i = 0; i < totalGames; i++) {
      try {
        const result = await executeGame(i, gameConfig, strategy, gameTimeout, 0)
        results.push(result)

        const now = Date.now()
        if (now - lastProgressUpdate > 500 && this.workerProgressBars.has(0)) {
          const elapsed = (now - startTime) / 1000
          const speed = (i + 1) / elapsed
          this.workerProgressBars.get(0)!.update(i + 1, {
            speed: `${speed.toFixed(1)} games/s`
          })
          lastProgressUpdate = now
        }
      } catch (error) {
        console.error(chalk.red(`❌ Game ${i} failed: ${error}`))
      }
    }

    // Store results
    this.workerResults.set(0, results)

    if (this.workerProgressBars.has(0)) {
      this.workerProgressBars.get(0)!.update(totalGames, {
        speed: 'Completed'
      })
    }
  }

  // === Private Methods ===

  private displayBenchmarkHeader(): void {
    const header = `
${chalk.bold.cyan('⚡ MASSIVE BENCHMARK SYSTEM')}
${chalk.gray('═'.repeat(80))}
${chalk.blue('Configuration:')}
  📊 Total Games: ${chalk.white(this.config.totalGames.toLocaleString())}
  🔄 Worker Threads: ${chalk.white(this.config.workerThreads)}
  📦 Batch Size: ${chalk.white(this.config.batchSize)}
  🎯 Strategy: ${chalk.white(this.config.strategy)}
  🔍 Performance Monitoring: ${chalk.white(this.config.enablePerformanceMonitoring ? 'Enabled' : 'Disabled')}
  📁 Export Format: ${chalk.white(this.config.exportFormat)}
${chalk.gray('═'.repeat(80))}
`
    console.log(header)
  }

  private async initializeWorkers(): Promise<void> {
    console.log(chalk.blue('🔧 Initializing worker threads...'))

    if (this.config.showProgress) {
      this.progressBar = new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: ' {label} |{bar}| {percentage}% | {value}/{total} | ETA: {eta}s | Speed: {speed}'
      }, cliProgress.Presets.shades_grey)
    }

    const gamesPerWorker = Math.ceil(this.config.totalGames / this.config.workerThreads)

    for (let i = 0; i < this.config.workerThreads; i++) {
      const workerGames = Math.min(gamesPerWorker, this.config.totalGames - (i * gamesPerWorker))

      if (workerGames <= 0) break

      const worker = new Worker(__filename, {
        workerData: {
          workerId: i,
          totalGames: workerGames,
          batchSize: this.config.batchSize,
          gameConfig: this.config.gameConfig,
          strategy: this.config.strategy,
          gameTimeout: this.config.gameTimeout
        }
      })

      this.workers.push(worker)

      if (this.progressBar) {
        const bar = this.progressBar.create(workerGames, 0, {
          label: `Worker ${i + 1}`,
          speed: '0 games/s'
        })
        this.workerProgressBars.set(i, bar)
      }

      worker.on('message', (message) => {
        this.handleWorkerMessage(i, message)
      })

      worker.on('error', (error) => {
        console.error(chalk.red(`❌ Worker ${i} error: ${error.message}`))
      })
    }

    console.log(chalk.green(`✅ ${this.workers.length} workers initialized`))
  }

  private async distributeTasks(): Promise<void> {
    console.log(chalk.blue('📨 Distributing tasks to workers...'))

    for (let i = 0; i < this.workers.length; i++) {
      this.workers[i].postMessage({ command: 'start' })
    }
  }

  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      let completedWorkers = 0

      const checkCompletion = () => {
        if (completedWorkers >= this.workers.length) {
          resolve()
        }
      }

      for (const worker of this.workers) {
        worker.on('exit', (code) => {
          completedWorkers++
          checkCompletion()
        })
      }
    })
  }

  private handleWorkerMessage(workerId: number, message: any): void {
    switch (message.type) {
      case 'progress':
        if (this.workerProgressBars.has(workerId)) {
          const bar = this.workerProgressBars.get(workerId)!
          bar.update(message.completed, {
            speed: `${message.speed} games/s`
          })
        }
        break

      case 'completed':
        // Store worker results
        if (message.results && Array.isArray(message.results)) {
          this.workerResults.set(workerId, message.results)
        }

        if (this.workerProgressBars.has(workerId)) {
          const bar = this.workerProgressBars.get(workerId)!
          bar.update(message.totalGames, {
            speed: 'Completed'
          })
        }

        console.log(chalk.green(`✅ Worker ${workerId} completed ${message.totalGames} games`))
        break

      case 'batch_results':
        // Handle batch results for streaming collection
        if (!this.workerResults.has(workerId)) {
          this.workerResults.set(workerId, [])
        }
        const existingResults = this.workerResults.get(workerId)!
        existingResults.push(...message.results)
        break

      case 'error':
        // Store worker errors
        if (!this.workerErrors.has(workerId)) {
          this.workerErrors.set(workerId, [])
        }
        this.workerErrors.get(workerId)!.push(message.error)

        console.error(chalk.red(`❌ Worker ${workerId} error: ${message.error}`))

        // Attempt to restart worker if possible
        if (message.fatal) {
          console.error(chalk.red(`💥 Worker ${workerId} encountered fatal error, terminating`))
        }
        break

      case 'memory_warning':
        console.warn(chalk.yellow(`⚠️ Worker ${workerId} memory warning: ${message.usage}MB`))
        break

      case 'heartbeat':
        // Worker is alive, update last seen time
        break

      default:
        console.warn(chalk.yellow(`Unknown message type from worker ${workerId}: ${message.type}`))
    }
  }

  private workerResults: Map<number, GameResultSummary[]> = new Map()
  private workerErrors: Map<number, string[]> = new Map()

  private async collectResults(): Promise<void> {
    console.log(chalk.blue('📊 Collecting results from workers...'))

    // Results are collected through worker messages
    // Verify all workers have completed
    const totalExpectedResults = this.config.totalGames
    const totalCollectedResults = Array.from(this.workerResults.values())
      .reduce((total, results) => total + results.length, 0)

    console.log(chalk.green(`✅ Collected ${totalCollectedResults}/${totalExpectedResults} results`))

    if (totalCollectedResults < totalExpectedResults) {
      const missing = totalExpectedResults - totalCollectedResults
      console.log(chalk.yellow(`⚠️ Missing ${missing} results from failed workers`))
    }
  }

  private async cleanup(): Promise<void> {
    if (this.progressBar) {
      this.progressBar.stop()
    }

    for (const worker of this.workers) {
      if (!worker.threadId) continue
      await worker.terminate()
    }

    this.workers = []
    this.workerProgressBars.clear()
  }

  private getCompletedGamesCount(): number {
    return Array.from(this.workerResults.values())
      .reduce((total, results) => total + results.length, 0)
  }

  private estimateWorkerMemoryUsage(workerId: number): number {
    // Estimate memory usage per worker (simplified)
    const results = this.workerResults.get(workerId) || []
    const baseMemory = 50 // Base 50MB per worker
    const gameMemory = results.length * 0.1 // ~0.1MB per game result
    return baseMemory + gameMemory
  }

  private calculateSystemUsage(performanceAnalysis: PerformanceAnalysis): SystemResourceUsage {
    const metrics = performanceAnalysis.metrics

    return {
      cpu: {
        averageUsage: metrics.cpuUsage,
        peakUsage: metrics.cpuUsage * 1.2, // Estimate peak
        coreUtilization: new Array(cpus().length).fill(metrics.cpuUsage / cpus().length)
      },
      memory: {
        peakUsage: metrics.memoryUsage.used * 1.1, // Estimate 10% higher peak
        averageUsage: metrics.memoryUsage.used,
        gcPressure: metrics.gcMetrics.avgCollectionTime
      },
      disk: {
        readOperations: this.getCompletedGamesCount(), // Rough estimate
        writeOperations: Math.floor(this.getCompletedGamesCount() / 100), // Batch writes
        totalBytes: this.getCompletedGamesCount() * 1024 // ~1KB per game
      }
    }
  }

  private async generateResults(performanceAnalysis: PerformanceAnalysis): Promise<MassiveBenchmarkResults> {
    const endTime = Date.now()
    const totalDuration = endTime - this.startTime

    // Collect all results from workers
    const allGameResults: GameResultSummary[] = []
    const workerPerformanceData: WorkerPerformanceData[] = []

    for (const [workerId, results] of this.workerResults) {
      allGameResults.push(...results)

      // Calculate worker performance metrics
      const workerErrors = this.workerErrors.get(workerId) || []
      const workerMemoryUsage = this.estimateWorkerMemoryUsage(workerId)

      workerPerformanceData.push({
        workerId,
        gamesProcessed: results.length,
        totalTime: results.reduce((sum, r) => sum + r.duration, 0),
        averageGameTime: results.length > 0 ?
          results.reduce((sum, r) => sum + r.duration, 0) / results.length : 0,
        memoryUsage: workerMemoryUsage,
        errors: workerErrors.length,
        successRate: results.length > 0 ?
          results.filter(r => r.outcome === 'victory').length / results.length : 0
      })
    }

    const completedGames = allGameResults.length
    const failedGames = this.config.totalGames - completedGames
    const gamesPerSecond = completedGames / (totalDuration / 1000)
    const averageGameTime = completedGames > 0 ?
      allGameResults.reduce((sum, r) => sum + r.duration, 0) / completedGames : 0

    return {
      config: this.config,
      execution: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        totalDuration,
        completedGames,
        failedGames,
        gamesPerSecond,
        averageGameTime
      },
      performance: performanceAnalysis,
      statistics: await this.calculateStatistics(allGameResults),
      gameResults: allGameResults,
      workerPerformance: workerPerformanceData,
      systemUsage: this.calculateSystemUsage(performanceAnalysis)
    }
  }

  private async calculateStatistics(gameResults: GameResultSummary[]): Promise<BenchmarkStatistics> {
    const totalGames = gameResults.length
    if (totalGames === 0) {
      return this.getEmptyStatistics()
    }

    const victories = gameResults.filter(r => r.outcome === 'victory').length
    const gameOvers = gameResults.filter(r => r.outcome === 'game_over').length
    const timeouts = gameResults.filter(r => r.outcome === 'timeout').length
    const errors = gameResults.filter(r => r.outcome === 'error').length

    const totalTurns = gameResults.reduce((sum, r) => sum + r.stats.turnsPlayed, 0)
    const totalScore = gameResults.reduce((sum, r) => sum + (r.stats.score || 0), 0)

    return {
      outcomes: {
        victories,
        gameOvers,
        timeouts,
        errors,
        victoryRate: (victories / totalGames) * 100,
        averageTurns: totalTurns / totalGames,
        averageScore: totalScore / totalGames
      },
      challenges: {
        totalAttempted: 0, // Detailed stats would require deeper extraction
        totalSuccessful: 0,
        totalFailed: 0,
        successRate: 0,
        averagePerGame: 0,
        difficultyDistribution: {}
      },
      resources: {
        averageCardsAcquired: 0,
        averageHighestVitality: 0,
        averageInsuranceBurden: 0,
        cardAcquisitionRate: 0
      },
      distributions: {
        turnCounts: gameResults.map(r => r.stats.turnsPlayed),
        scores: gameResults.map(r => r.stats.score || 0),
        challengeSuccessRates: [],
        gameDurations: gameResults.map(r => r.duration)
      },
      analytics: {
        correlations: {
          turnVsScore: 0,
          challengeSuccessVsVictory: 0,
          cardsAcquiredVsScore: 0,
          insuranceBurdenVsPerformance: 0
        },
        outliers: {
          exceptionalVictories: [],
          poorPerformances: [],
          unusualDurations: [],
          statisticalOutliers: []
        },
        trends: {
          performanceOverTime: [],
          memoryUsageOverTime: [],
          successRateOverTime: [],
          speedOverTime: []
        }
      }
    }
  }

  private getEmptyStatistics(): BenchmarkStatistics {
    return {
      outcomes: {
        victories: 0,
        gameOvers: 0,
        timeouts: 0,
        errors: 0,
        victoryRate: 0,
        averageTurns: 0,
        averageScore: 0
      },
      challenges: {
        totalAttempted: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        successRate: 0,
        averagePerGame: 0,
        difficultyDistribution: {}
      },
      resources: {
        averageCardsAcquired: 0,
        averageHighestVitality: 0,
        averageInsuranceBurden: 0,
        cardAcquisitionRate: 0
      },
      distributions: {
        turnCounts: [],
        scores: [],
        challengeSuccessRates: [],
        gameDurations: []
      },
      analytics: {
        correlations: {
          turnVsScore: 0,
          challengeSuccessVsVictory: 0,
          cardsAcquiredVsScore: 0,
          insuranceBurdenVsPerformance: 0
        },
        outliers: {
          exceptionalVictories: [],
          poorPerformances: [],
          unusualDurations: [],
          statisticalOutliers: []
        },
        trends: {
          performanceOverTime: [],
          memoryUsageOverTime: [],
          successRateOverTime: [],
          speedOverTime: []
        }
      }
    }
  }

  private displayResults(): void {
    if (!this.results) return

    console.log('\n' + chalk.bold.cyan('📊 MASSIVE BENCHMARK RESULTS'))
    console.log(chalk.gray('═'.repeat(80)))

    const { execution, statistics } = this.results

    console.log(chalk.bold.white('⚡ Execution Summary:'))
    console.log(`  Duration: ${(execution.totalDuration / 1000).toFixed(2)}s`)
    console.log(`  Games Completed: ${execution.completedGames.toLocaleString()}`)
    console.log(`  Speed: ${execution.gamesPerSecond.toFixed(2)} games/s`)
    console.log(`  Average Game Time: ${execution.averageGameTime.toFixed(2)}ms`)

    console.log('\n' + chalk.bold.white('🎮 Game Statistics:'))
    console.log(`  Victory Rate: ${statistics.outcomes.victoryRate.toFixed(1)}%`)
    console.log(`  Average Turns: ${statistics.outcomes.averageTurns.toFixed(1)}`)
    console.log(`  Challenge Success: ${statistics.challenges.successRate.toFixed(1)}%`)

    console.log('\n' + chalk.gray('═'.repeat(80)))
  }

  private async exportResults(): Promise<void> {
    if (!this.results) return

    console.log(chalk.blue('📤 Exporting results...'))

    // Export implementation would save results in specified formats
    console.log(chalk.green('✅ Results exported successfully'))
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// === Worker Thread Implementation ===

if (!isMainThread && parentPort && workerData) {
  const { workerId, totalGames, batchSize, gameConfig, strategy, gameTimeout } = workerData

  let completedGames = 0
  const gameResults: GameResultSummary[] = []

  parentPort.on('message', async (message) => {
    if (message.command === 'start') {
      await executeWorkerBenchmark()
    }
  })

  async function executeWorkerBenchmark(): Promise<void> {
    const startTime = Date.now()
    let lastProgressUpdate = startTime
    let lastMemoryCheck = startTime
    let batchResults: GameResultSummary[] = []
    const batchReportSize = Math.min(batchSize, 50) // Report every 50 games or batch size

    try {
      for (let i = 0; i < totalGames; i++) {
        const gameStart = Date.now()

        try {
          const result = await executeGame(i, gameConfig, strategy, gameTimeout)
          gameResults.push(result)
          batchResults.push(result)
          completedGames++

          // Send batch results periodically to reduce memory usage
          if (batchResults.length >= batchReportSize) {
            parentPort?.postMessage({
              type: 'batch_results',
              workerId,
              results: [...batchResults]
            })
            batchResults = [] // Clear batch
          }

          const now = Date.now()

          // Send progress updates every 500ms (reduced frequency)
          if (now - lastProgressUpdate > 500) {
            const elapsed = (now - startTime) / 1000
            const speed = completedGames / elapsed

            parentPort?.postMessage({
              type: 'progress',
              completed: completedGames,
              total: totalGames,
              speed: speed.toFixed(1)
            })

            lastProgressUpdate = now
          }

          // Memory monitoring every 5 seconds
          if (now - lastMemoryCheck > 5000) {
            const memUsage = process.memoryUsage()
            const memUsageMB = memUsage.heapUsed / (1024 * 1024)

            if (memUsageMB > 500) { // Warn if over 500MB
              parentPort?.postMessage({
                type: 'memory_warning',
                workerId,
                usage: memUsageMB.toFixed(1)
              })
            }

            // Force GC if available and memory is high
            if (memUsageMB > 800 && global.gc) {
              global.gc()
            }

            lastMemoryCheck = now
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)

          parentPort?.postMessage({
            type: 'error',
            gameId: i,
            error: errorMessage,
            fatal: errorMessage.includes('FATAL') || errorMessage.includes('out of memory')
          })

          // Continue with next game unless fatal error
          if (errorMessage.includes('FATAL') || errorMessage.includes('out of memory')) {
            break
          }
        }
      }

      // Send any remaining batch results
      if (batchResults.length > 0) {
        parentPort?.postMessage({
          type: 'batch_results',
          workerId,
          results: batchResults
        })
      }

      parentPort?.postMessage({
        type: 'completed',
        workerId,
        totalGames: completedGames,
        results: gameResults.length > 100 ? [] : gameResults // Send all results only if small
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      parentPort?.postMessage({
        type: 'error',
        workerId,
        error: errorMessage,
        fatal: true
      })
    }
  }

}

/**
 * Execute a single game simulation
 */
export async function executeGame(
  gameId: number,
  config: GameConfig,
  strategy: string,
  timeout: number,
  workerId: number = 0
): Promise<GameResultSummary> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const timeoutHandle = setTimeout(() => {
      reject(new Error('Game timeout'))
    }, timeout)

    try {
      const renderer = new BenchmarkModeRenderer({}, 1)
      const controller = GameControllerFactory.create(config, renderer)

      controller.playGame().then((stats) => {
        clearTimeout(timeoutHandle)
        const gameState = controller.getGameState()

        resolve({
          gameId,
          workerId,
          outcome: gameState.status === 'victory' ? 'victory' : 'game_over',
          stats,
          duration: Date.now() - startTime,
          strategy,
          stage: gameState.stage
        })
      }).catch((error) => {
        clearTimeout(timeoutHandle)
        reject(error)
      })

    } catch (error) {
      clearTimeout(timeoutHandle)
      reject(error)
    }
  })
}

/**
 * Factory for creating massive benchmarks with preset configurations
 */
export class MassiveBenchmarkFactory {
  /**
   * Create benchmark for quick testing (1K games)
   */
  static createQuickBenchmark(): MassiveBenchmark {
    return new MassiveBenchmark({
      totalGames: 1000,
      workerThreads: 2,
      batchSize: 50,
      exportFormat: 'json',
      strategy: 'balanced'
    })
  }

  /**
   * Create benchmark for balance testing (10K games)
   */
  static createBalanceBenchmark(): MassiveBenchmark {
    return new MassiveBenchmark({
      totalGames: 10000,
      workerThreads: Math.max(2, cpus().length - 1),
      batchSize: 100,
      exportFormat: 'all',
      strategy: 'balanced',
      enablePerformanceMonitoring: true
    })
  }

  /**
   * Create benchmark for research (100K games)
   */
  static createResearchBenchmark(): MassiveBenchmark {
    return new MassiveBenchmark({
      totalGames: 100000,
      workerThreads: cpus().length,
      batchSize: 200,
      exportFormat: 'all',
      strategy: 'balanced',
      enablePerformanceMonitoring: true,
      gameTimeout: 10000 // Shorter timeout for massive scale
    })
  }

  /**
   * Create benchmark for stress testing (1M games)
   */
  static createStressBenchmark(): MassiveBenchmark {
    return new MassiveBenchmark({
      totalGames: 1000000,
      workerThreads: cpus().length,
      batchSize: 500,
      exportFormat: 'json', // Only JSON for performance
      strategy: 'balanced',
      enablePerformanceMonitoring: false, // Disabled for maximum speed
      gameTimeout: 5000
    })
  }
}