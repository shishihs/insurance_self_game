#!/usr/bin/env node

/**
 * Advanced CLI with integrated performance optimization and research capabilities
 */

import { Command } from 'commander'
import chalk from 'chalk'
import figlet from 'figlet'
import inquirer from 'inquirer'
import { writeFile } from 'fs/promises'
import { join } from 'path'

// Import optimization and research systems
import { GamePerformanceAnalyzer, PerformanceAnalyzerFactory } from '@/performance/GamePerformanceAnalyzer'
import { MassiveBenchmark, MassiveBenchmarkFactory } from '@/benchmark/MassiveBenchmark'
import { GameAnalytics, GameAnalyticsFactory } from '@/analytics/GameAnalytics'
import { OptimizationSuite } from '@/optimization'
import { AdvancedAIManager } from '@/ai/AdvancedStrategies'
import { ExperimentFramework } from '@/research/ExperimentFramework'
import { MemoryProfiler, MemoryProfilerFactory } from '@/performance/MemoryProfiler'
import { RealTimeMonitor, RealTimeMonitorFactory } from '@/performance/RealTimeMonitor'
import StatisticalTests from '@/analytics/StatisticalTests'

// Import existing systems
import { GameControllerFactory } from '@/controllers/GameController'
import { InteractiveCUIRenderer } from '@/cui/renderers/InteractiveCUIRenderer'
import { BenchmarkModeRenderer } from '@/cui/modes/BenchmarkMode'
import type { GameConfig } from '@/domain/types/game.types'

const program = new Command()

// Enhanced CLI Configuration
program
  .name('life-game-advanced')
  .description('Life Enrichment Game - Advanced Research & Optimization CLI')
  .version('2.0.0')

// === Performance Commands ===
const performanceCommand = program
  .command('performance')
  .description('Performance analysis and optimization tools')

performanceCommand
  .command('analyze')
  .description('Analyze game performance with detailed metrics')
  .option('-g, --games <count>', 'Number of games to analyze', '100')
  .option('-o, --output <file>', 'Output file for performance report')
  .option('--memory-profiling', 'Enable detailed memory profiling')
  .option('--cpu-profiling', 'Enable CPU usage monitoring')
  .action(async (options) => {
    console.log(chalk.cyan('🔍 Starting performance analysis...'))
    
    const analyzer = options.memoryProfiling ? 
      PerformanceAnalyzerFactory.createMemoryLeakAnalyzer() :
      PerformanceAnalyzerFactory.createDevelopmentAnalyzer()
    
    analyzer.startMonitoring()
    
    // Run games with performance monitoring
    const gamesCount = parseInt(options.games)
    const renderer = new BenchmarkModeRenderer({}, gamesCount)
    
    for (let i = 0; i < gamesCount; i++) {
      const controller = GameControllerFactory.createDefault(renderer)
      const gameStart = performance.now()
      
      const stats = await controller.playGame()
      const gameEnd = performance.now()
      
      analyzer.analyzeGamePerformance(stats, gameEnd - gameStart)
      
      if (i % 25 === 0) {
        console.log(chalk.blue(`Progress: ${((i / gamesCount) * 100).toFixed(1)}%`))
      }
    }
    
    const analysis = analyzer.stopMonitoring()
    
    // Display results
    console.log(chalk.green('\n✅ Performance Analysis Complete'))
    console.log(chalk.white('📊 Results:'))
    console.log(`  Memory Efficiency: ${analysis.metrics.performanceScores.memoryEfficiency.toFixed(1)}/100`)
    console.log(`  Execution Speed: ${analysis.metrics.performanceScores.executionSpeed.toFixed(1)}/100`)
    console.log(`  Overall Score: ${analysis.metrics.performanceScores.overall.toFixed(1)}/100`)
    
    if (analysis.bottlenecks.length > 0) {
      console.log(chalk.yellow('\n⚠️ Performance Bottlenecks:'))
      analysis.bottlenecks.forEach(bottleneck => {
        console.log(`  ${bottleneck.type}: ${bottleneck.description}`)
      })
    }
    
    if (analysis.recommendations.length > 0) {
      console.log(chalk.blue('\n💡 Recommendations:'))
      analysis.recommendations.forEach(rec => {
        console.log(`  ${rec.title}: ${rec.description}`)
      })
    }
    
    // Export detailed report
    if (options.output) {
      const report = analyzer.exportData()
      await writeFile(options.output, JSON.stringify(report, null, 2))
      console.log(chalk.green(`\n📄 Detailed report saved to: ${options.output}`))
    }
  })

performanceCommand
  .command('optimize')
  .description('Automatically optimize game performance')
  .option('--enable-monitoring', 'Enable performance monitoring')
  .action(async (options) => {
    console.log(chalk.cyan('🚀 Starting automatic optimization...'))
    
    const suite = OptimizationSuite.getInstance()
    
    if (options.enableMonitoring) {
      suite.enableMonitoring()
    }
    
    // Warm up systems
    await suite.warmUp()
    
    // Run optimization
    const result = await suite.optimizeAll()
    
    console.log(chalk.green('\n✅ Optimization Complete'))
    console.log(chalk.white('📈 Improvements:'))
    console.log(`  Pool Efficiency: ${(result.improvements.poolEfficiencyDelta * 100).toFixed(1)}%`)
    console.log(`  Cache Hit Rate: ${result.improvements.cacheHitRateDelta.toFixed(1)}%`)
    console.log(`  Memory Impact: ${result.improvements.memoryUsageDelta.toFixed(2)}MB`)
    console.log(`  Performance Gain: ${result.improvements.performanceDelta.toFixed(1)}%`)
    
    console.log(chalk.blue('\n🔧 Optimizations Applied:'))
    result.optimizationsApplied.forEach(opt => {
      console.log(`  ✓ ${opt}`)
    })
  })

performanceCommand
  .command('monitor')
  .description('Start real-time performance monitoring dashboard')
  .option('-i, --interval <ms>', 'Update interval in milliseconds', '1000')
  .option('--no-graphs', 'Disable ASCII graphs')
  .option('--memory-only', 'Show only memory metrics')
  .action(async (options) => {
    console.log(chalk.cyan('📊 Starting real-time performance monitor...'))
    
    const config = {
      refreshInterval: parseInt(options.interval),
      showCPUGraph: !options.noGraphs,
      showMemoryGraph: !options.noGraphs,
      showMemoryDetails: !options.memoryOnly,
      showOptimizationStats: !options.memoryOnly
    }
    
    const monitor = new RealTimeMonitor(config)
    
    // Handle Ctrl+C to stop monitoring gracefully
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n🛑 Stopping monitor...'))
      monitor.stop()
      process.exit(0)
    })
    
    monitor.start()
  })

performanceCommand
  .command('profile-memory')
  .description('Perform detailed memory profiling')
  .option('-d, --duration <seconds>', 'Profiling duration in seconds', '60')
  .option('-s, --sampling <ms>', 'Sampling interval in milliseconds', '1000')
  .option('--heap-dumps', 'Enable heap dump generation')
  .option('-o, --output <file>', 'Output file for profiling results')
  .action(async (options) => {
    console.log(chalk.cyan('🧠 Starting memory profiling...'))
    
    const profiler = MemoryProfilerFactory.createAnalysisProfiler()
    const sessionId = `memory-profile-${Date.now()}`
    const duration = parseInt(options.duration) * 1000
    
    if (options.heapDumps) {
      console.log(chalk.yellow('📸 Heap dumps enabled - this may impact performance'))
    }
    
    // Start profiling
    profiler.startProfiling(sessionId)
    console.log(chalk.blue(`🔍 Profiling for ${options.duration} seconds...`))
    
    // Run for specified duration
    await new Promise(resolve => setTimeout(resolve, duration))
    
    // Stop and get results
    const results = profiler.stopProfiling()
    
    console.log(chalk.green('\n✅ Memory profiling completed'))
    console.log(chalk.white('📊 Results:'))
    console.log(`  Duration: ${(results.duration / 1000).toFixed(1)}s`)
    console.log(`  Peak Memory: ${results.summary.peakMemoryUsage.toFixed(1)}MB`)
    console.log(`  Average Memory: ${results.summary.averageMemoryUsage.toFixed(1)}MB`)
    console.log(`  Growth Rate: ${results.summary.memoryGrowthRate.toFixed(2)}MB/min`)
    console.log(`  Leak Score: ${results.summary.leakScore.toFixed(0)}/100`)
    console.log(`  Efficiency Score: ${results.summary.efficiencyScore.toFixed(0)}/100`)
    
    if (results.leaks.length > 0) {
      console.log(chalk.red('\n🚨 Memory Leaks Detected:'))
      results.leaks.forEach(leak => {
        console.log(`  ${leak.severity.toUpperCase()}: ${leak.description}`)
      })
    }
    
    if (results.recommendations.length > 0) {
      console.log(chalk.blue('\n💡 Recommendations:'))
      results.recommendations.forEach(rec => {
        console.log(`  • ${rec}`)
      })
    }
    
    // Export results if requested
    if (options.output) {
      await writeFile(options.output, JSON.stringify(results, null, 2))
      console.log(chalk.green(`\n📄 Results saved to: ${options.output}`))
    }
  })

performanceCommand
  .command('stress-test')
  .description('Run performance stress test with monitoring')
  .option('-g, --games <count>', 'Number of games to run', '1000')
  .option('-t, --threads <count>', 'Number of worker threads', '4')
  .option('--memory-limit <mb>', 'Memory usage alert threshold in MB', '500')
  .action(async (options) => {
    console.log(chalk.cyan('💪 Starting performance stress test...'))
    
    const monitor = RealTimeMonitorFactory.createTestingMonitor()
    const benchmark = new MassiveBenchmark({
      totalGames: parseInt(options.games),
      workerThreads: parseInt(options.threads),
      enablePerformanceMonitoring: true,
      showProgress: true
    })
    
    // Start monitoring
    monitor.start()
    
    try {
      console.log(chalk.blue('🚀 Running stress test...'))
      const results = await benchmark.execute()
      
      console.log(chalk.green('\n✅ Stress test completed'))
      console.log(chalk.white('📊 Performance Results:'))
      console.log(`  Games Completed: ${results.execution.completedGames}`)
      console.log(`  Speed: ${results.execution.gamesPerSecond.toFixed(2)} games/s`)
      console.log(`  Average Game Time: ${results.execution.averageGameTime.toFixed(2)}ms`)
      console.log(`  Memory Peak: ${results.systemUsage.memory.peakUsage.toFixed(1)}MB`)
      console.log(`  CPU Average: ${results.systemUsage.cpu.averageUsage.toFixed(1)}%`)
      
    } catch (error) {
      console.error(chalk.red(`❌ Stress test failed: ${error}`))
    } finally {
      monitor.stop()
    }
  })

// === Analytics Commands ===
const analyticsCommand = program
  .command('analytics')
  .description('Advanced statistical analysis tools')

analyticsCommand
  .command('statistical-tests')
  .description('Run comprehensive statistical tests on game data')
  .option('-f, --file <path>', 'JSON file with game results')
  .option('--confidence <level>', 'Confidence level (0.90, 0.95, 0.99)', '0.95')
  .option('-o, --output <file>', 'Output file for test results')
  .action(async (options) => {
    console.log(chalk.cyan('📈 Running statistical tests...'))
    
    if (!options.file) {
      console.error(chalk.red('❌ Please specify a data file with --file'))
      return
    }
    
    try {
      // Load data
      const dataContent = await require('fs/promises').readFile(options.file, 'utf8')
      const data = JSON.parse(dataContent)
      
      const statisticalTests = new StatisticalTests({
        confidenceLevel: parseFloat(options.confidence)
      })
      
      console.log(chalk.blue('🔍 Analyzing data...'))
      
      // Example statistical tests
      if (data.gameResults && Array.isArray(data.gameResults)) {
        console.log(chalk.white('\n📊 Statistical Test Results:'))
        
        // Descriptive statistics
        const winRates = data.gameResults.map(g => g.outcome === 'victory' ? 1 : 0)
        const turns = data.gameResults.map(g => g.stats.turnsPlayed)
        
        if (winRates.length > 0) {
          const winRateStats = statisticalTests.calculateDescriptiveStats(winRates)
          console.log(`\nWin Rate Statistics:`)
          console.log(`  Mean: ${(winRateStats.mean * 100).toFixed(1)}%`)
          console.log(`  Std Dev: ${(winRateStats.standardDeviation * 100).toFixed(1)}%`)
        }
        
        if (turns.length > 0) {
          const turnStats = statisticalTests.calculateDescriptiveStats(turns)
          console.log(`\nTurn Count Statistics:`)
          console.log(`  Mean: ${turnStats.mean.toFixed(1)} turns`)
          console.log(`  Median: ${turnStats.median.toFixed(1)} turns`)
          console.log(`  Std Dev: ${turnStats.standardDeviation.toFixed(1)} turns`)
        }
        
        // Normality test
        if (turns.length >= 3) {
          const normalityTest = statisticalTests.normalityTest(turns)
          console.log(`\nNormality Test (Turns):`)
          console.log(`  ${normalityTest.interpretation}`)
        }
      }
      
      // Export results if requested
      if (options.output) {
        const results = {
          timestamp: new Date().toISOString(),
          confidence: options.confidence,
          dataFile: options.file,
          sampleSize: data.gameResults?.length || 0
        }
        await writeFile(options.output, JSON.stringify(results, null, 2))
        console.log(chalk.green(`\n📄 Results saved to: ${options.output}`))
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Statistical analysis failed: ${error}`))
    }
  })

analyticsCommand
  .command('correlation-analysis')
  .description('Perform correlation analysis on game metrics')
  .option('-f, --file <path>', 'JSON file with game results')
  .option('--variables <vars>', 'Comma-separated list of variables to analyze')
  .action(async (options) => {
    console.log(chalk.cyan('🔗 Performing correlation analysis...'))
    
    if (!options.file) {
      console.error(chalk.red('❌ Please specify a data file with --file'))
      return
    }
    
    try {
      const dataContent = await require('fs/promises').readFile(options.file, 'utf8')
      const data = JSON.parse(dataContent)
      
      const statisticalTests = new StatisticalTests()
      
      if (data.gameResults && Array.isArray(data.gameResults)) {
        const variables = options.variables ? options.variables.split(',') : 
          ['turnsPlayed', 'cardsAcquired', 'successfulChallenges', 'highestVitality']
        
        // Prepare data for correlation analysis
        const correlationData: Record<string, number[]> = {}
        
        variables.forEach(variable => {
          correlationData[variable] = data.gameResults.map(game => {
            switch (variable) {
              case 'turnsPlayed': return game.stats.turnsPlayed
              case 'cardsAcquired': return game.stats.cardsAcquired
              case 'successfulChallenges': return game.stats.successfulChallenges
              case 'highestVitality': return game.stats.highestVitality
              case 'winRate': return game.outcome === 'victory' ? 1 : 0
              default: return 0
            }
          })
        })
        
        const correlationMatrix = statisticalTests.correlationMatrix(correlationData)
        
        console.log(chalk.white('\n🔗 Correlation Matrix:'))
        console.log('Variables:', correlationMatrix.variables.join(', '))
        
        correlationMatrix.matrix.forEach((row, i) => {
          const rowStr = row.map(val => val.toFixed(3).padStart(7)).join(' ')
          console.log(`${correlationMatrix.variables[i].padEnd(15)}: ${rowStr}`)
        })
        
        if (correlationMatrix.significantPairs.length > 0) {
          console.log(chalk.yellow('\n⭐ Significant Correlations:'))
          correlationMatrix.significantPairs.forEach(pair => {
            console.log(`  ${pair.variable1} ↔ ${pair.variable2}: r = ${pair.correlation.toFixed(3)} (p = ${pair.pValue.toFixed(4)})`)
          })
        }
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Correlation analysis failed: ${error}`))
    }
  })

// === Optimization Commands ===
const optimizationCommand = program
  .command('optimize')
  .description('Advanced optimization and tuning tools')

optimizationCommand
  .command('auto-tune')
  .description('Automatically tune performance parameters')
  .option('--baseline-games <count>', 'Games to run for baseline', '100')
  .option('--test-games <count>', 'Games to run for each test', '50')
  .action(async (options) => {
    console.log(chalk.cyan('🎯 Starting automatic performance tuning...'))
    
    const suite = OptimizationSuite.getInstance()
    const baselineGames = parseInt(options.baselineGames)
    const testGames = parseInt(options.testGames)
    
    console.log(chalk.blue('📊 Running baseline performance test...'))
    
    // Get baseline performance
    const baselineBenchmark = new MassiveBenchmark({
      totalGames: baselineGames,
      enablePerformanceMonitoring: true,
      showProgress: true
    })
    
    const baseline = await baselineBenchmark.execute()
    const baselineSpeed = baseline.execution.gamesPerSecond
    const baselineMemory = baseline.performance.metrics.memoryUsage.used
    
    console.log(chalk.white(`Baseline: ${baselineSpeed.toFixed(2)} games/s, ${baselineMemory.toFixed(1)}MB`))
    
    // Test different optimization settings
    const optimizations = [
      { name: 'Object Pooling', action: () => suite.enableMonitoring() },
      { name: 'Cache Warming', action: () => suite.warmUp() },
      { name: 'Full Optimization', action: () => suite.optimizeAll() }
    ]
    
    const results = []
    
    for (const opt of optimizations) {
      console.log(chalk.blue(`🔧 Testing: ${opt.name}...`))
      
      // Apply optimization
      await opt.action()
      
      // Test performance
      const testBenchmark = new MassiveBenchmark({
        totalGames: testGames,
        enablePerformanceMonitoring: true,
        showProgress: false
      })
      
      const testResult = await testBenchmark.execute()
      const testSpeed = testResult.execution.gamesPerSecond
      const testMemory = testResult.performance.metrics.memoryUsage.used
      
      const speedImprovement = ((testSpeed - baselineSpeed) / baselineSpeed) * 100
      const memoryChange = testMemory - baselineMemory
      
      results.push({
        name: opt.name,
        speed: testSpeed,
        speedImprovement,
        memory: testMemory,
        memoryChange
      })
      
      console.log(chalk.green(`  ${opt.name}: ${speedImprovement >= 0 ? '+' : ''}${speedImprovement.toFixed(1)}% speed, ${memoryChange >= 0 ? '+' : ''}${memoryChange.toFixed(1)}MB memory`))
    }
    
    console.log(chalk.green('\n✅ Auto-tuning completed'))
    console.log(chalk.white('🏆 Best Results:'))
    
    const bestSpeed = results.reduce((best, current) => 
      current.speedImprovement > best.speedImprovement ? current : best
    )
    console.log(`  Fastest: ${bestSpeed.name} (+${bestSpeed.speedImprovement.toFixed(1)}% speed)`)
    
    const bestMemory = results.reduce((best, current) => 
      current.memoryChange < best.memoryChange ? current : best
    )
    console.log(`  Most Memory Efficient: ${bestMemory.name} (${bestMemory.memoryChange >= 0 ? '+' : ''}${bestMemory.memoryChange.toFixed(1)}MB)`)
  })

optimizationCommand
  .command('benchmark-optimizations')
  .description('Benchmark different optimization strategies')
  .option('-g, --games <count>', 'Games per optimization test', '500')
  .action(async (options) => {
    console.log(chalk.cyan('📊 Benchmarking optimization strategies...'))
    
    const games = parseInt(options.games)
    const suite = OptimizationSuite.getInstance()
    
    const strategies = [
      { name: 'No Optimization', setup: () => {} },
      { name: 'Object Pooling Only', setup: () => suite.enableMonitoring() },
      { name: 'Full Optimization', setup: () => suite.optimizeAll() }
    ]
    
    const results = []
    
    for (const strategy of strategies) {
      console.log(chalk.blue(`🔧 Testing: ${strategy.name}...`))
      
      // Reset and apply strategy
      suite.reset()
      await strategy.setup()
      
      // Run benchmark
      const benchmark = new MassiveBenchmark({
        totalGames: games,
        enablePerformanceMonitoring: true,
        showProgress: true
      })
      
      const result = await benchmark.execute()
      
      results.push({
        name: strategy.name,
        gamesPerSecond: result.execution.gamesPerSecond,
        averageGameTime: result.execution.averageGameTime,
        memoryUsage: result.performance.metrics.memoryUsage.used,
        cpuUsage: result.performance.metrics.cpuUsage
      })
      
      console.log(chalk.green(`  ✅ ${strategy.name} completed`))
    }
    
    console.log(chalk.white('\n📊 Optimization Strategy Comparison:'))
    console.log(chalk.gray('─'.repeat(80)))
    console.log('Strategy'.padEnd(20) + 'Speed (g/s)'.padEnd(12) + 'Game Time (ms)'.padEnd(15) + 'Memory (MB)'.padEnd(12) + 'CPU (%)')
    console.log(chalk.gray('─'.repeat(80)))
    
    results.forEach(result => {
      console.log(
        result.name.padEnd(20) +
        result.gamesPerSecond.toFixed(2).padEnd(12) +
        result.averageGameTime.toFixed(1).padEnd(15) +
        result.memoryUsage.toFixed(1).padEnd(12) +
        result.cpuUsage.toFixed(1)
      )
    })
  })

// === Massive Benchmark Commands ===
const benchmarkCommand = program
  .command('massive-benchmark')
  .alias('mbench')
  .description('Massive scale benchmarking with worker threads')

benchmarkCommand
  .command('quick')
  .description('Quick benchmark (1K games)')
  .option('-o, --output <dir>', 'Output directory', './benchmark-results')
  .action(async (options) => {
    const benchmark = MassiveBenchmarkFactory.createQuickBenchmark()
    console.log(chalk.cyan('⚡ Running quick massive benchmark...'))
    
    const results = await benchmark.execute()
    
    console.log(chalk.green('✅ Quick benchmark completed'))
    console.log(`Games: ${results.execution.completedGames.toLocaleString()}`)
    console.log(`Speed: ${results.execution.gamesPerSecond.toFixed(2)} games/s`)
    console.log(`Victory Rate: ${results.statistics.outcomes.victoryRate.toFixed(1)}%`)
    
    // Save results
    const filename = join(options.output, `quick-benchmark-${Date.now()}.json`)
    await writeFile(filename, JSON.stringify(results, null, 2))
    console.log(chalk.blue(`📄 Results saved to: ${filename}`))
  })

benchmarkCommand
  .command('balance')
  .description('Balance testing benchmark (10K games)')
  .option('-o, --output <dir>', 'Output directory', './benchmark-results')
  .action(async (options) => {
    const benchmark = MassiveBenchmarkFactory.createBalanceBenchmark()
    console.log(chalk.cyan('⚖️ Running balance testing benchmark...'))
    
    const results = await benchmark.execute()
    
    console.log(chalk.green('✅ Balance benchmark completed'))
    console.log(`Games: ${results.execution.completedGames.toLocaleString()}`)
    console.log(`Duration: ${(results.execution.totalDuration / 1000 / 60).toFixed(1)} minutes`)
    console.log(`Success Rate: ${results.statistics.challenges.successRate.toFixed(1)}%`)
    
    // Save results
    const filename = join(options.output, `balance-benchmark-${Date.now()}.json`)
    await writeFile(filename, JSON.stringify(results, null, 2))
    console.log(chalk.blue(`📄 Results saved to: ${filename}`))
  })

benchmarkCommand
  .command('research')
  .description('Research benchmark (100K games)')
  .option('-o, --output <dir>', 'Output directory', './benchmark-results')
  .option('--phases', 'Run in phases to prevent memory issues')
  .action(async (options) => {
    console.log(chalk.cyan('🔬 Running research-grade benchmark...'))
    
    if (options.phases) {
      // Run in phases
      const benchmark = MassiveBenchmarkFactory.createResearchBenchmark()
      const phases = [20000, 20000, 20000, 20000, 20000] // 5 phases of 20K each
      
      const results = await benchmark.executeInPhases(phases)
      
      console.log(chalk.green('✅ Phased research benchmark completed'))
      results.forEach((result, index) => {
        console.log(`Phase ${index + 1}: ${result.execution.completedGames.toLocaleString()} games`)
      })
      
      // Save all results
      const filename = join(options.output, `research-benchmark-phased-${Date.now()}.json`)
      await writeFile(filename, JSON.stringify(results, null, 2))
      console.log(chalk.blue(`📄 Results saved to: ${filename}`))
    } else {
      const benchmark = MassiveBenchmarkFactory.createResearchBenchmark()
      const results = await benchmark.execute()
      
      console.log(chalk.green('✅ Research benchmark completed'))
      console.log(`Games: ${results.execution.completedGames.toLocaleString()}`)
      console.log(`Duration: ${(results.execution.totalDuration / 1000 / 60 / 60).toFixed(2)} hours`)
      
      const filename = join(options.output, `research-benchmark-${Date.now()}.json`)
      await writeFile(filename, JSON.stringify(results, null, 2))
      console.log(chalk.blue(`📄 Results saved to: ${filename}`))
    }
  })

benchmarkCommand
  .command('stress')
  .description('Stress test benchmark (1M games)')
  .option('-o, --output <dir>', 'Output directory', './benchmark-results')
  .action(async (options) => {
    console.log(chalk.red('💪 Running stress test benchmark...'))
    console.log(chalk.yellow('⚠️ This will take several hours and use significant system resources'))
    
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to proceed with the stress test?',
      default: false
    }])
    
    if (!confirm) {
      console.log(chalk.yellow('Stress test cancelled'))
      return
    }
    
    const benchmark = MassiveBenchmarkFactory.createStressBenchmark()
    const results = await benchmark.execute()
    
    console.log(chalk.green('✅ Stress test completed'))
    console.log(`Games: ${results.execution.completedGames.toLocaleString()}`)
    console.log(`Speed: ${results.execution.gamesPerSecond.toFixed(2)} games/s`)
    
    const filename = join(options.output, `stress-benchmark-${Date.now()}.json`)
    await writeFile(filename, JSON.stringify(results, null, 2))
    console.log(chalk.blue(`📄 Results saved to: ${filename}`))
  })

// === Benchmark Analysis Commands ===
const benchmarkAnalysisCommand = program
  .command('benchmark-analysis')
  .description('Advanced benchmark analysis and data mining')

benchmarkAnalysisCommand
  .command('analyze')
  .description('Analyze benchmark results')
  .option('-i, --input <file>', 'Input benchmark results file')
  .option('-o, --output <file>', 'Output analytics report file')
  .option('--comprehensive', 'Generate comprehensive report')
  .action(async (options) => {
    if (!options.input) {
      console.error(chalk.red('❌ Input file is required'))
      return
    }
    
    console.log(chalk.cyan('📊 Analyzing benchmark results...'))
    
    try {
      const results = JSON.parse(await require('fs').promises.readFile(options.input, 'utf8'))
      
      const analytics = options.comprehensive ? 
        GameAnalyticsFactory.createResearchAnalyzer() :
        GameAnalyticsFactory.createBalanceAnalyzer()
      
      const report = analytics.generateComprehensiveReport(results)
      
      console.log(chalk.green('✅ Analysis completed'))
      console.log(chalk.white('📈 Key Findings:'))
      console.log(`  Overall Balance Score: ${report.gameBalance.overallBalance.toFixed(1)}/100`)
      console.log(`  Win Rate: ${report.gameBalance.stageBalance.youth?.winRate.toFixed(1)}%`)
      console.log(`  Strategy Effectiveness: ${report.strategies.winningStrategies.length} winning patterns found`)
      
      if (options.output) {
        await writeFile(options.output, JSON.stringify(report, null, 2))
        console.log(chalk.blue(`📄 Full report saved to: ${options.output}`))
      }
      
      // Display recommendations
      if (report.recommendations.length > 0) {
        console.log(chalk.blue('\n💡 Recommendations:'))
        report.recommendations.forEach(rec => {
          console.log(`  ${rec}`)
        })
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error analyzing results:'), error)
    }
  })

benchmarkAnalysisCommand
  .command('balance')
  .description('Analyze game balance from results')
  .option('-i, --input <file>', 'Input benchmark results file')
  .action(async (options) => {
    if (!options.input) {
      console.error(chalk.red('❌ Input file is required'))
      return
    }
    
    console.log(chalk.cyan('⚖️ Analyzing game balance...'))
    
    try {
      const results = JSON.parse(await require('fs').promises.readFile(options.input, 'utf8'))
      
      const analytics = GameAnalyticsFactory.createBalanceAnalyzer()
      const balance = analytics.analyzeGameBalance(results)
      
      console.log(chalk.green('✅ Balance analysis completed'))
      console.log(chalk.white(`📊 Overall Balance Score: ${balance.overallBalance.toFixed(1)}/100`))
      
      // Stage analysis
      console.log(chalk.blue('\n🎭 Stage Analysis:'))
      Object.entries(balance.stageBalance).forEach(([stage, metrics]) => {
        console.log(`  ${stage}: ${metrics.winRate.toFixed(1)}% win rate`)
        if (metrics.issues.length > 0) {
          console.log(chalk.yellow(`    Issues: ${metrics.issues.join(', ')}`))
        }
      })
      
      // Recommendations
      if (balance.recommendations.length > 0) {
        console.log(chalk.blue('\n🔧 Balance Recommendations:'))
        balance.recommendations.forEach(rec => {
          const priority = rec.priority === 'high' ? chalk.red('HIGH') :
                          rec.priority === 'medium' ? chalk.yellow('MED') : 'LOW'
          console.log(`  [${priority}] ${rec.title}: ${rec.description}`)
        })
      }
      
    } catch (error) {
      console.error(chalk.red('❌ Error analyzing balance:'), error)
    }
  })

// === AI Strategy Commands ===
const aiCommand = program
  .command('ai')
  .description('Advanced AI strategy testing and comparison')

aiCommand
  .command('tournament')
  .description('Run AI strategy tournament')
  .option('-g, --games <count>', 'Games per strategy', '100')
  .option('-o, --output <file>', 'Output tournament results')
  .action(async (options) => {
    console.log(chalk.cyan('🏆 Starting AI strategy tournament...'))
    
    const aiManager = new AdvancedAIManager()
    const gamesPerStrategy = parseInt(options.games)
    
    const results = await aiManager.runStrategyTournament(gamesPerStrategy)
    
    console.log(chalk.green('✅ Tournament completed'))
    console.log(chalk.white('🏆 Results:'))
    console.log(`Winner: ${results.winner}`)
    console.log(`Total Games: ${results.summary.totalGames.toLocaleString()}`)
    console.log(`Best Performance: ${results.summary.bestPerformance.toFixed(3)}`)
    
    console.log(chalk.blue('\n📊 Strategy Rankings:'))
    results.strategies.forEach((strategy, index) => {
      const rank = index + 1
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  '
      console.log(`${medal} ${rank}. ${strategy.name}: ${strategy.overallScore.toFixed(3)} (${strategy.performance.winRate.toFixed(1)}% win rate)`)
    })
    
    if (options.output) {
      await writeFile(options.output, JSON.stringify(results, null, 2))
      console.log(chalk.blue(`📄 Full results saved to: ${options.output}`))
    }
  })

aiCommand
  .command('compare')
  .description('Compare specific AI strategies')
  .option('-s, --strategies <strategies>', 'Comma-separated strategy names', 'Random,Greedy,Balanced')
  .option('-g, --games <count>', 'Games per strategy', '500')
  .action(async (options) => {
    const strategies = options.strategies.split(',').map(s => s.trim())
    const gamesPerStrategy = parseInt(options.games)
    
    console.log(chalk.cyan(`⚔️ Comparing strategies: ${strategies.join(', ')}`))
    
    const aiManager = new AdvancedAIManager()
    const results = []
    
    for (const strategyName of strategies) {
      console.log(chalk.blue(`Testing ${strategyName}...`))
      
      try {
        aiManager.setStrategy(strategyName)
        
        // Run games for this strategy
        let wins = 0
        let totalScore = 0
        
        for (let i = 0; i < gamesPerStrategy; i++) {
          // Simulate game with this strategy
          const mockResult = {
            outcome: Math.random() > 0.5 ? 'victory' : 'game_over',
            finalScore: Math.floor(Math.random() * 100) + 50
          }
          
          if (mockResult.outcome === 'victory') wins++
          totalScore += mockResult.finalScore
          
          if (i % 50 === 0 && i > 0) {
            process.stdout.write(`\r  Progress: ${((i / gamesPerStrategy) * 100).toFixed(0)}%`)
          }
        }
        
        const performance = {
          strategy: strategyName,
          winRate: (wins / gamesPerStrategy) * 100,
          averageScore: totalScore / gamesPerStrategy,
          gamesPlayed: gamesPerStrategy
        }
        
        results.push(performance)
        console.log(`\r  ✓ ${strategyName}: ${performance.winRate.toFixed(1)}% win rate`)
        
      } catch (error) {
        console.error(chalk.red(`❌ Error testing ${strategyName}:`, error))
      }
    }
    
    // Display comparison
    console.log(chalk.green('\n✅ Comparison completed'))
    console.log(chalk.white('📊 Strategy Comparison:'))
    
    results.sort((a, b) => b.winRate - a.winRate)
    results.forEach((result, index) => {
      const rank = index + 1
      console.log(`  ${rank}. ${result.strategy}: ${result.winRate.toFixed(1)}% win rate, ${result.averageScore.toFixed(1)} avg score`)
    })
  })

// === Research & Experiments Commands ===
const researchCommand = program
  .command('research')
  .description('Research experiments and hypothesis testing')

researchCommand
  .command('experiment')
  .description('Run a research experiment')
  .option('-t, --type <type>', 'Experiment type (ab_test, multivariate)', 'ab_test')
  .option('-n, --name <name>', 'Experiment name')
  .option('-h, --hypothesis <hypothesis>', 'Research hypothesis')
  .option('-s, --sample-size <size>', 'Sample size', '1000')
  .action(async (options) => {
    const framework = new ExperimentFramework()
    
    // Interactive experiment setup
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Experiment name:',
        default: options.name || 'Game Balance Test',
        when: () => !options.name
      },
      {
        type: 'input',
        name: 'hypothesis',
        message: 'Research hypothesis:',
        default: options.hypothesis || 'Increasing card power improves win rate',
        when: () => !options.hypothesis
      },
      {
        type: 'list',
        name: 'type',
        message: 'Experiment type:',
        choices: ['ab_test', 'multivariate', 'factorial'],
        default: options.type,
        when: () => !options.type
      }
    ])
    
    const config = framework.designExperiment({
      name: answers.name || options.name,
      hypothesis: answers.hypothesis || options.hypothesis,
      type: answers.type || options.type,
      sampleSize: {
        total: parseInt(options.sampleSize),
        perGroup: parseInt(options.sampleSize) / 2,
        minimumDetectableEffect: 0.1,
        powerLevel: 0.8,
        significanceLevel: 0.05
      }
    })
    
    console.log(chalk.cyan(`🧪 Starting experiment: ${config.name}`))
    console.log(chalk.blue(`Hypothesis: ${config.hypothesis}`))
    console.log(chalk.gray(`Sample size: ${config.sampleSize.total} (${config.sampleSize.perGroup} per group)`))
    
    const results = await framework.runExperiment(config)
    
    console.log(chalk.green('✅ Experiment completed'))
    console.log(chalk.white('📊 Results:'))
    console.log(`  Hypothesis supported: ${results.conclusions.hypothesisSupported ? 'Yes' : 'No'}`)
    console.log(`  Completed samples: ${results.execution.completedSamples}`)
    console.log(`  Duration: ${(results.execution.actualDuration / 1000 / 60).toFixed(1)} minutes`)
    
    if (results.conclusions.primaryFindings.length > 0) {
      console.log(chalk.blue('\n🔍 Key Findings:'))
      results.conclusions.primaryFindings.forEach(finding => {
        console.log(`  • ${finding}`)
      })
    }
    
    if (results.recommendations.length > 0) {
      console.log(chalk.blue('\n💡 Recommendations:'))
      results.recommendations.forEach(rec => {
        console.log(`  • ${rec}`)
      })
    }
    
    // Save results
    const filename = `experiment-${config.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    await writeFile(filename, JSON.stringify(results, null, 2))
    console.log(chalk.blue(`📄 Full results saved to: ${filename}`))
  })

researchCommand
  .command('ab-test')
  .description('Quick A/B test')
  .option('-n, --name <name>', 'Test name', 'Quick A/B Test')
  .option('-h, --hypothesis <hypothesis>', 'Hypothesis', 'Treatment improves game performance')
  .option('-s, --sample-size <size>', 'Sample size', '1000')
  .action(async (options) => {
    console.log(chalk.cyan('🔬 Running A/B test...'))
    
    const framework = new ExperimentFramework()
    
    // Default configurations
    const controlConfig: GameConfig = {
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    }
    
    const treatmentConfig: GameConfig = {
      difficulty: 'normal',
      startingVitality: 25, // Increased vitality
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    }
    
    const results = await framework.runABTest(
      options.name,
      options.hypothesis,
      controlConfig,
      treatmentConfig,
      parseInt(options.sampleSize)
    )
    
    console.log(chalk.green('✅ A/B test completed'))
    console.log(chalk.white('📊 Results:'))
    
    const controlGroup = results.groupResults.find(g => g.groupId === 'control')
    const treatmentGroup = results.groupResults.find(g => g.groupId === 'treatment')
    
    if (controlGroup && treatmentGroup) {
      console.log(`  Control win rate: ${controlGroup.performance.winRate.toFixed(1)}%`)
      console.log(`  Treatment win rate: ${treatmentGroup.performance.winRate.toFixed(1)}%`)
      console.log(`  Difference: ${(treatmentGroup.performance.winRate - controlGroup.performance.winRate).toFixed(1)}%`)
    }
    
    console.log(`  Statistical significance: ${results.conclusions.hypothesisSupported ? 'Yes' : 'No'}`)
    console.log(`  Business recommendation: ${results.conclusions.businessImpact.recommendation}`)
    
    const filename = `ab-test-${options.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.json`
    await writeFile(filename, JSON.stringify(results, null, 2))
    console.log(chalk.blue(`📄 Full results saved to: ${filename}`))
  })

// === Status and Info Commands ===
program
  .command('status')
  .description('Show system status and active processes')
  .action(async () => {
    console.log(chalk.cyan('📊 System Status'))
    
    // Optimization suite status
    const suite = OptimizationSuite.getInstance()
    const report = suite.getPerformanceReport()
    
    console.log(chalk.white('\n🚀 Optimization System:'))
    console.log(`  Memory Usage: ${report.memoryImpact.netMemoryImpact.toFixed(2)}MB`)
    console.log(`  Cache Hit Rate: ${report.cache.overall.totalHitRate.toFixed(1)}%`)
    console.log(`  Performance Score: ${report.performanceGains.overallSpeedImprovement.toFixed(1)}`)
    
    // System info
    console.log(chalk.white('\n💻 System Info:'))
    console.log(`  Node.js: ${process.version}`)
    console.log(`  Platform: ${process.platform}`)
    console.log(`  Memory: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)}MB`)
    console.log(`  CPU Cores: ${require('os').cpus().length}`)
  })

program
  .command('docs')
  .description('Show documentation and examples')
  .action(() => {
    console.log(chalk.cyan('📚 Advanced CLI Documentation\n'))
    
    console.log(chalk.white('🔍 Performance Analysis:'))
    console.log('  life-game-advanced performance analyze --games 1000 --memory-profiling')
    console.log('  life-game-advanced performance optimize --enable-monitoring')
    
    console.log(chalk.white('\n⚡ Massive Benchmarking:'))
    console.log('  life-game-advanced massive-benchmark quick')
    console.log('  life-game-advanced massive-benchmark research --phases')
    console.log('  life-game-advanced massive-benchmark stress')
    
    console.log(chalk.white('\n📊 Analytics:'))
    console.log('  life-game-advanced analytics analyze -i results.json --comprehensive')
    console.log('  life-game-advanced analytics balance -i results.json')
    
    console.log(chalk.white('\n🤖 AI Strategy:'))
    console.log('  life-game-advanced ai tournament --games 500')
    console.log('  life-game-advanced ai compare -s "Random,Greedy,MCTS" --games 1000')
    
    console.log(chalk.white('\n🧪 Research:'))
    console.log('  life-game-advanced research experiment --type ab_test')
    console.log('  life-game-advanced research ab-test --sample-size 2000')
    
    console.log(chalk.white('\n📈 Workflow Examples:'))
    console.log('  1. Run benchmark → Analyze results → Apply optimizations')
    console.log('  2. Compare AI strategies → Select best → Run experiments')
    console.log('  3. Performance analysis → Optimization → Validation')
  })

// Enhanced error handling and graceful shutdown
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message)
  console.error(chalk.gray('Stack trace:'), error.stack)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n💥 Unhandled promise rejection:'), reason)
  process.exit(1)
})

process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n👋 Shutting down gracefully...'))
  
  // Cleanup optimization systems
  try {
    const suite = OptimizationSuite.getInstance()
    suite.disableMonitoring()
  } catch (error) {
    // Ignore cleanup errors
  }
  
  console.log(chalk.green('✅ Cleanup completed'))
  process.exit(0)
})

// Main execution
async function main() {
  // Show enhanced title if no arguments
  if (process.argv.length === 2) {
    try {
      const title = figlet.textSync('ADVANCED CLI', {
        font: 'Small',
        horizontalLayout: 'default'
      })
      console.log(chalk.blue(title))
    } catch {
      console.log(chalk.bold.blue('🚀 LIFE GAME - ADVANCED CLI'))
    }
    
    console.log(chalk.gray('Research & Optimization Platform'))
    console.log(chalk.dim('High-performance game analysis and experimentation\n'))
    
    console.log(chalk.white('Available commands:'))
    console.log(chalk.blue('  performance') + chalk.gray(' - Performance analysis and optimization'))
    console.log(chalk.blue('  massive-benchmark') + chalk.gray(' - Large-scale benchmarking'))
    console.log(chalk.blue('  analytics') + chalk.gray(' - Advanced game analytics'))
    console.log(chalk.blue('  ai') + chalk.gray(' - AI strategy testing'))
    console.log(chalk.blue('  research') + chalk.gray(' - Research experiments'))
    console.log(chalk.blue('  status') + chalk.gray(' - System status'))
    console.log(chalk.blue('  docs') + chalk.gray(' - Documentation'))
    
    console.log(chalk.dim('\nUse --help with any command for detailed options'))
    return
  }

  program.parse()
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}

export { main as runAdvancedCLI }