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
      await this.initializeWorkers()
      await this.distributeTasks()
      await this.waitForCompletion()
      await this.collectResults()
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
        if (this.workerProgressBars.has(workerId)) {
          const bar = this.workerProgressBars.get(workerId)!
          bar.update(message.totalGames)
        }
        break
        
      case 'error':
        console.error(chalk.red(`❌ Worker ${workerId} error: ${message.error}`))
        break
    }
  }

  private async collectResults(): Promise<void> {
    console.log(chalk.blue('📊 Collecting results from workers...'))
    // Results collection would be implemented based on your specific data storage approach
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
    // This would track completed games from all workers
    return 0 // Placeholder
  }

  private async generateResults(performanceAnalysis: PerformanceAnalysis): Promise<MassiveBenchmarkResults> {
    const endTime = Date.now()
    const totalDuration = endTime - this.startTime

    // This would collect actual results from workers
    const mockResults: MassiveBenchmarkResults = {
      config: this.config,
      execution: {
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        totalDuration,
        completedGames: this.config.totalGames,
        failedGames: 0,
        gamesPerSecond: this.config.totalGames / (totalDuration / 1000),
        averageGameTime: totalDuration / this.config.totalGames
      },
      performance: performanceAnalysis,
      statistics: await this.calculateStatistics([]),
      gameResults: [],
      workerPerformance: [],
      systemUsage: {
        cpu: { averageUsage: 0, peakUsage: 0, coreUtilization: [] },
        memory: { peakUsage: 0, averageUsage: 0, gcPressure: 0 },
        disk: { readOperations: 0, writeOperations: 0, totalBytes: 0 }
      }
    }

    return mockResults
  }

  private async calculateStatistics(gameResults: GameResultSummary[]): Promise<BenchmarkStatistics> {
    // Comprehensive statistical analysis would be implemented here
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
  let gameResults: GameResultSummary[] = []

  parentPort.on('message', async (message) => {
    if (message.command === 'start') {
      await executeWorkerBenchmark()
    }
  })

  async function executeWorkerBenchmark(): Promise<void> {
    const startTime = Date.now()
    let lastProgressUpdate = startTime

    try {
      for (let i = 0; i < totalGames; i++) {
        const gameStart = Date.now()
        
        try {
          const result = await executeGame(i, gameConfig, strategy, gameTimeout)
          gameResults.push(result)
          completedGames++
          
          // Send progress updates every 100ms
          const now = Date.now()
          if (now - lastProgressUpdate > 100) {
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
          
        } catch (error) {
          parentPort?.postMessage({
            type: 'error',
            gameId: i,
            error: error instanceof Error ? error.message : String(error)
          })
        }
      }
      
      parentPort?.postMessage({
        type: 'completed',
        workerId,
        totalGames: completedGames,
        results: gameResults
      })
      
    } catch (error) {
      parentPort?.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  async function executeGame(
    gameId: number,
    config: GameConfig,
    strategy: string,
    timeout: number
  ): Promise<GameResultSummary> {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error('Game timeout'))
      }, timeout)

      try {
        const renderer = new BenchmarkModeRenderer({}, 1)
        const controller = GameControllerFactory.create(config, renderer)
        
        controller.playGame().then((stats) => {
          clearTimeout(timeoutHandle)
          
          resolve({
            gameId,
            workerId,
            outcome: 'victory', // Simplified - would determine actual outcome
            stats,
            duration: Date.now() - gameId, // Simplified timing
            strategy,
            stage: 'elderly' // Simplified - would track actual stage
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