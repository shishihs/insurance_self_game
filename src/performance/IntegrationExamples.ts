/**
 * Comprehensive integration examples showing how to use the performance systems together
 * This file serves as both documentation and working examples for developers
 */

import { GamePerformanceAnalyzer, PerformanceAnalyzerFactory } from './GamePerformanceAnalyzer'
import { MemoryProfiler, MemoryProfilerFactory } from './MemoryProfiler'
import { RealTimeMonitor, RealTimeMonitorFactory } from './RealTimeMonitor'
import { MassiveBenchmark, MassiveBenchmarkFactory } from '../benchmark/MassiveBenchmark'
import { GameAnalytics, GameAnalyticsFactory } from '../analytics/GameAnalytics'
import { OptimizationSuite } from '../optimization'
import StatisticalTests from '../analytics/StatisticalTests'
import chalk from 'chalk'

/**
 * Example 1: Basic Performance Monitoring
 * Shows how to monitor a single game or small batch of games
 */
export async function basicPerformanceMonitoring(): Promise<void> {
  console.log(chalk.cyan('📊 Example 1: Basic Performance Monitoring'))
  
  // Create a performance analyzer for development
  const analyzer = PerformanceAnalyzerFactory.createDevelopmentAnalyzer()
  
  // Start monitoring
  analyzer.startMonitoring()
  console.log(chalk.blue('🔍 Monitoring started...'))
  
  // Simulate some work (replace with actual game execution)
  await simulateGameExecution(10)
  
  // Stop monitoring and get results
  const analysis = analyzer.stopMonitoring()
  
  // Display results
  console.log(chalk.green('✅ Monitoring completed'))
  console.log(chalk.white('Results:'))
  console.log(`  Memory Efficiency: ${analysis.metrics.performanceScores.memoryEfficiency.toFixed(1)}/100`)
  console.log(`  Execution Speed: ${analysis.metrics.performanceScores.executionSpeed.toFixed(1)}/100`)
  console.log(`  Overall Score: ${analysis.metrics.performanceScores.overall.toFixed(1)}/100`)
  
  if (analysis.bottlenecks.length > 0) {
    console.log(chalk.yellow('⚠️ Bottlenecks detected:'))
    analysis.bottlenecks.forEach(bottleneck => {
      console.log(`  ${bottleneck.type}: ${bottleneck.description}`)
    })
  }
  
  if (analysis.recommendations.length > 0) {
    console.log(chalk.blue('💡 Recommendations:'))
    analysis.recommendations.forEach(rec => {
      console.log(`  ${rec.title}: ${rec.description}`)
    })
  }
  
  console.log('')
}

/**
 * Example 2: Memory Leak Detection
 * Shows how to detect and analyze memory leaks during extended gameplay
 */
export async function memoryLeakDetection(): Promise<void> {
  console.log(chalk.cyan('🧠 Example 2: Memory Leak Detection'))
  
  // Create a memory profiler for detailed analysis
  const profiler = MemoryProfilerFactory.createAnalysisProfiler()
  
  // Start profiling
  const sessionId = `leak-detection-${Date.now()}`
  profiler.startProfiling(sessionId)
  console.log(chalk.blue('🔍 Memory profiling started...'))
  
  // Simulate extended gameplay with potential memory growth
  await simulateExtendedGameplay(50)
  
  // Stop profiling and analyze results
  const results = profiler.stopProfiling()
  
  console.log(chalk.green('✅ Memory profiling completed'))
  console.log(chalk.white('Memory Analysis:'))
  console.log(`  Duration: ${(results.duration / 1000).toFixed(1)}s`)
  console.log(`  Peak Memory: ${results.summary.peakMemoryUsage.toFixed(1)}MB`)
  console.log(`  Growth Rate: ${results.summary.memoryGrowthRate.toFixed(2)}MB/min`)
  console.log(`  Leak Score: ${results.summary.leakScore.toFixed(0)}/100`)
  
  if (results.leaks.length > 0) {
    console.log(chalk.red('🚨 Memory leaks detected:'))
    results.leaks.forEach(leak => {
      console.log(`  ${leak.severity.toUpperCase()}: ${leak.description}`)
      console.log(`    Rate: ${leak.leakRate.toFixed(2)}MB/min`)
      console.log(`    Recommendation: ${leak.recommendation}`)
    })
  }
  
  console.log('')
}

/**
 * Example 3: Real-time Monitoring Dashboard
 * Shows how to set up a real-time monitoring dashboard for live performance tracking
 */
export async function realTimeMonitoringDemo(): Promise<void> {
  console.log(chalk.cyan('📈 Example 3: Real-time Monitoring Dashboard'))
  console.log(chalk.yellow('Note: This will start a real-time dashboard. Press Ctrl+C to stop.'))
  
  // Create a monitoring configuration for testing
  const monitor = RealTimeMonitorFactory.createTestingMonitor()
  
  // Set up graceful shutdown
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n🛑 Stopping monitor...'))
    monitor.stop()
    process.exit(0)
  })
  
  // Start monitoring
  monitor.start()
  
  // Simulate background work
  setInterval(async () => {
    await simulateGameExecution(1)
  }, 2000) // Execute a game every 2 seconds
}

/**
 * Example 4: Comprehensive Performance Analysis Pipeline
 * Shows how to combine multiple systems for complete performance analysis
 */
export async function comprehensiveAnalysisPipeline(): Promise<void> {
  console.log(chalk.cyan('🔬 Example 4: Comprehensive Performance Analysis Pipeline'))
  
  // Step 1: Initialize all systems
  const analyzer = PerformanceAnalyzerFactory.createBenchmarkAnalyzer()
  const profiler = MemoryProfilerFactory.createDevelopmentProfiler()
  const optimizationSuite = OptimizationSuite.getInstance()
  const analytics = GameAnalyticsFactory.createBalanceAnalyzer()
  
  console.log(chalk.blue('🚀 Phase 1: Baseline Performance Collection'))
  
  // Step 2: Collect baseline performance
  analyzer.startMonitoring()
  profiler.startProfiling('baseline')
  optimizationSuite.enableMonitoring()
  
  // Run baseline benchmark
  const baselineBenchmark = MassiveBenchmarkFactory.createQuickBenchmark()
  const baselineResults = await baselineBenchmark.execute()
  
  const baselineAnalysis = analyzer.stopMonitoring()
  const baselineMemory = profiler.stopProfiling()
  
  console.log(chalk.green('✅ Baseline collected'))
  console.log(`  Speed: ${baselineResults.execution.gamesPerSecond.toFixed(2)} games/s`)
  console.log(`  Memory: ${baselineMemory.summary.peakMemoryUsage.toFixed(1)}MB peak`)
  
  console.log(chalk.blue('\n🔧 Phase 2: Optimization Application'))
  
  // Step 3: Apply optimizations
  await optimizationSuite.warmUp()
  const optimizationResult = await optimizationSuite.optimizeAll()
  
  console.log(chalk.green('✅ Optimizations applied'))
  console.log(`  Pool Efficiency: ${(optimizationResult.improvements.poolEfficiencyDelta * 100).toFixed(1)}%`)
  console.log(`  Memory Impact: ${optimizationResult.improvements.memoryUsageDelta.toFixed(2)}MB`)
  
  console.log(chalk.blue('\n📊 Phase 3: Optimized Performance Collection'))
  
  // Step 4: Collect optimized performance
  analyzer.startMonitoring()
  profiler.startProfiling('optimized')
  
  const optimizedBenchmark = MassiveBenchmarkFactory.createQuickBenchmark()
  const optimizedResults = await optimizedBenchmark.execute()
  
  const optimizedAnalysis = analyzer.stopMonitoring()
  const optimizedMemory = profiler.stopProfiling()
  
  console.log(chalk.green('✅ Optimized performance collected'))
  console.log(`  Speed: ${optimizedResults.execution.gamesPerSecond.toFixed(2)} games/s`)
  console.log(`  Memory: ${optimizedMemory.summary.peakMemoryUsage.toFixed(1)}MB peak`)
  
  console.log(chalk.blue('\n📈 Phase 4: Statistical Analysis'))
  
  // Step 5: Perform statistical analysis
  const gameBalance = analytics.analyzeGameBalance(optimizedResults)
  const strategies = analytics.analyzeStrategies(optimizedResults)
  
  console.log(chalk.green('✅ Statistical analysis completed'))
  console.log(`  Overall Balance Score: ${gameBalance.overallBalance.toFixed(1)}/100`)
  console.log(`  Winning Strategies Found: ${strategies.winningStrategies.length}`)
  console.log(`  Losing Patterns Found: ${strategies.losingPatterns.length}`)
  
  console.log(chalk.blue('\n📋 Phase 5: Comprehensive Report'))
  
  // Step 6: Generate comprehensive report
  const speedImprovement = ((optimizedResults.execution.gamesPerSecond - baselineResults.execution.gamesPerSecond) / baselineResults.execution.gamesPerSecond) * 100
  const memoryImprovement = baselineMemory.summary.peakMemoryUsage - optimizedMemory.summary.peakMemoryUsage
  
  console.log(chalk.white('🏆 Final Performance Comparison:'))
  console.log(`  Speed Improvement: ${speedImprovement >= 0 ? '+' : ''}${speedImprovement.toFixed(1)}%`)
  console.log(`  Memory Reduction: ${memoryImprovement >= 0 ? '+' : ''}${memoryImprovement.toFixed(1)}MB`)
  console.log(`  Baseline Efficiency: ${baselineAnalysis.metrics.performanceScores.overall.toFixed(1)}/100`)
  console.log(`  Optimized Efficiency: ${optimizedAnalysis.metrics.performanceScores.overall.toFixed(1)}/100`)
  
  if (gameBalance.recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Game Balance Recommendations:'))
    gameBalance.recommendations.slice(0, 3).forEach(rec => {
      console.log(`  ${rec.priority.toUpperCase()}: ${rec.title}`)
    })
  }
  
  console.log('')
}

/**
 * Example 5: Statistical Analysis Deep Dive
 * Shows advanced statistical analysis of game data
 */
export async function statisticalAnalysisDeepDive(): Promise<void> {
  console.log(chalk.cyan('📊 Example 5: Statistical Analysis Deep Dive'))
  
  // Generate sample data
  console.log(chalk.blue('🎲 Generating sample game data...'))
  const benchmark = MassiveBenchmarkFactory.createBalanceBenchmark()
  const results = await benchmark.execute()
  
  // Initialize statistical testing
  const statisticalTests = new StatisticalTests({
    confidenceLevel: 0.95,
    minSampleSize: 100
  })
  
  const analytics = GameAnalyticsFactory.createResearchAnalyzer()
  
  console.log(chalk.blue('\n📈 Performing statistical tests...'))
  
  // Perform comprehensive statistical analysis
  const tests = analytics.performStatisticalTests(results)
  
  console.log(chalk.green('✅ Statistical analysis completed'))
  
  if (tests.chiSquareTests.length > 0) {
    console.log(chalk.white('\n🔗 Chi-square Tests:'))
    tests.chiSquareTests.forEach(test => {
      console.log(`  ${test.variables.join(' vs ')}: χ² = ${test.statistic.toFixed(3)}, p = ${test.pValue.toFixed(4)}`)
      console.log(`    ${test.significant ? 'SIGNIFICANT' : 'Not significant'}: ${test.interpretation}`)
    })
  }
  
  if (tests.tTests.length > 0) {
    console.log(chalk.white('\n📊 T-Tests:'))
    tests.tTests.forEach(test => {
      console.log(`  ${test.groups.join(' vs ')}: t = ${test.statistic.toFixed(3)}, p = ${test.pValue.toFixed(4)}`)
      console.log(`    Effect size (Cohen's d): ${test.effectSize.toFixed(3)}`)
      console.log(`    ${test.significant ? 'SIGNIFICANT' : 'Not significant'}: ${test.interpretation}`)
    })
  }
  
  if (tests.anovaTests.length > 0) {
    console.log(chalk.white('\n🎯 ANOVA Tests:'))
    tests.anovaTests.forEach(test => {
      console.log(`  ${test.groups.join(', ')}: F = ${test.fStatistic.toFixed(3)}, p = ${test.pValue.toFixed(4)}`)
      console.log(`    ${test.significant ? 'SIGNIFICANT' : 'Not significant'}: ${test.interpretation}`)
    })
  }
  
  if (tests.correlations.significantPairs.length > 0) {
    console.log(chalk.white('\n🔗 Significant Correlations:'))
    tests.correlations.significantPairs.forEach(pair => {
      console.log(`  ${pair.variable1} ↔ ${pair.variable2}: r = ${pair.correlation.toFixed(3)} (p = ${pair.pValue.toFixed(4)})`)
    })
  }
  
  console.log('')
}

/**
 * Example 6: Automated Performance Optimization
 * Shows how to automatically optimize performance using all available systems
 */
export async function automatedPerformanceOptimization(): Promise<void> {
  console.log(chalk.cyan('🤖 Example 6: Automated Performance Optimization'))
  
  const optimizationSuite = OptimizationSuite.getInstance()
  
  console.log(chalk.blue('🔍 Step 1: Performance Assessment'))
  
  // Get initial performance report
  const initialReport = optimizationSuite.getPerformanceReport()
  console.log(chalk.white('Initial Performance:'))
  if (initialReport.pools?.efficiency) {
    console.log(`  Pool Efficiency: ${initialReport.pools.efficiency.overallEfficiency.toFixed(1)}%`)
    console.log(`  Memory Saved: ${initialReport.pools.efficiency.estimatedMemorySaved.toFixed(1)}MB`)
  }
  if (initialReport.cache?.overall) {
    console.log(`  Cache Hit Rate: ${initialReport.cache.overall.totalHitRate.toFixed(1)}%`)
  }
  
  console.log(chalk.blue('\n🎯 Step 2: Automated Optimization'))
  
  // Apply automated optimizations
  const optimizationResult = await optimizationSuite.optimizeAll()
  
  console.log(chalk.green('✅ Optimization completed'))
  console.log(chalk.white('Applied Optimizations:'))
  optimizationResult.optimizationsApplied.forEach(opt => {
    console.log(`  ✓ ${opt}`)
  })
  
  console.log(chalk.blue('\n📊 Step 3: Performance Validation'))
  
  // Validate improvements with a quick benchmark
  const validationBenchmark = new MassiveBenchmark({
    totalGames: 500,
    enablePerformanceMonitoring: true,
    showProgress: true
  })
  
  const validationResults = await validationBenchmark.execute()
  
  console.log(chalk.green('✅ Validation completed'))
  console.log(chalk.white('Performance Metrics:'))
  console.log(`  Speed: ${validationResults.execution.gamesPerSecond.toFixed(2)} games/s`)
  console.log(`  Memory: ${validationResults.performance.metrics.memoryUsage.used.toFixed(1)}MB`)
  console.log(`  CPU: ${validationResults.performance.metrics.cpuUsage.toFixed(1)}%`)
  
  console.log(chalk.blue('\n🎉 Step 4: Optimization Summary'))
  
  const finalReport = optimizationSuite.getPerformanceReport()
  console.log(chalk.white('Improvements Achieved:'))
  console.log(`  Pool Efficiency Delta: ${optimizationResult.improvements.poolEfficiencyDelta.toFixed(1)}%`)
  console.log(`  Cache Hit Rate Delta: ${optimizationResult.improvements.cacheHitRateDelta.toFixed(1)}%`)
  console.log(`  Memory Usage Delta: ${optimizationResult.improvements.memoryUsageDelta.toFixed(2)}MB`)
  console.log(`  Performance Delta: ${optimizationResult.improvements.performanceDelta.toFixed(1)}%`)
  
  if (finalReport.recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Further Recommendations:'))
    finalReport.recommendations.slice(0, 3).forEach(rec => {
      console.log(`  • ${rec}`)
    })
  }
  
  console.log('')
}

/**
 * Example 7: Production Monitoring Setup
 * Shows how to set up monitoring for production environments
 */
export async function productionMonitoringSetup(): Promise<void> {
  console.log(chalk.cyan('🏭 Example 7: Production Monitoring Setup'))
  
  console.log(chalk.blue('⚙️ Setting up production monitoring...'))
  
  // Create production-grade monitoring components
  const analyzer = PerformanceAnalyzerFactory.createBenchmarkAnalyzer()
  const profiler = MemoryProfilerFactory.createProductionProfiler()
  const monitor = RealTimeMonitorFactory.createProductionMonitor()
  
  // Configure for production use
  const optimizationSuite = OptimizationSuite.getInstance()
  await optimizationSuite.warmUp()
  optimizationSuite.enableMonitoring()
  
  console.log(chalk.green('✅ Production monitoring configured'))
  console.log(chalk.white('Monitoring Components:'))
  console.log('  ✓ Performance Analyzer (minimal overhead)')
  console.log('  ✓ Memory Profiler (production settings)')
  console.log('  ✓ Real-time Monitor (5-second intervals)')
  console.log('  ✓ Optimization Suite (background optimization)')
  
  console.log(chalk.blue('\n📋 Production Monitoring Guidelines:'))
  console.log('1. Use PerformanceAnalyzerFactory.createBenchmarkAnalyzer() for minimal overhead')
  console.log('2. Set memory profiler sampling to 10+ seconds for production')
  console.log('3. Enable real-time monitoring with 5+ second intervals')
  console.log('4. Set appropriate alert thresholds for your environment')
  console.log('5. Export performance data regularly for trend analysis')
  
  console.log(chalk.yellow('\n⚠️ Production Recommendations:'))
  console.log('• Monitor memory growth trends over time')
  console.log('• Set up automated alerts for performance degradation')
  console.log('• Schedule regular optimization cycles during low-traffic periods')
  console.log('• Keep historical performance data for capacity planning')
  console.log('• Use statistical analysis to detect performance regressions')
  
  console.log('')
}

// === Helper Functions ===

/**
 * Simulate game execution for testing
 */
async function simulateGameExecution(games: number): Promise<void> {
  const startTime = Date.now()
  
  for (let i = 0; i < games; i++) {
    // Simulate game logic with some CPU and memory usage
    const data = new Array(1000).fill(0).map(() => Math.random())
    
    // Simulate some processing
    data.sort()
    data.reverse()
    
    // Simulate async operations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50))
  }
  
  const duration = Date.now() - startTime
  console.log(chalk.dim(`  Simulated ${games} games in ${duration}ms`))
}

interface SimulatedGameData {
  id: number
  cards: Array<{ id: number; value: number }>
  stats: number[]
  timestamp: number
}

/**
 * Simulate extended gameplay that might cause memory growth
 */
async function simulateExtendedGameplay(iterations: number): Promise<void> {
  const data: SimulatedGameData[] = []
  
  for (let i = 0; i < iterations; i++) {
    // Simulate memory allocation that might cause leaks
    const gameData = {
      id: i,
      cards: new Array(100).fill(0).map(() => ({ id: Math.random(), value: Math.random() })),
      stats: new Array(50).fill(0).map(() => Math.random()),
      timestamp: Date.now()
    }
    
    data.push(gameData)
    
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Occasionally "forget" to clean up (simulate potential memory leak)
    if (i % 10 !== 0) {
      data.pop()
    }
  }
}

/**
 * Export all examples for easy access
 */
export const PerformanceIntegrationExamples = {
  basicPerformanceMonitoring,
  memoryLeakDetection,
  realTimeMonitoringDemo,
  comprehensiveAnalysisPipeline,
  statisticalAnalysisDeepDive,
  automatedPerformanceOptimization,
  productionMonitoringSetup
}

/**
 * Main function to run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log(chalk.bold.cyan('🚀 Performance Integration Examples'))
  console.log(chalk.gray('═'.repeat(80)))
  console.log('')
  
  try {
    await basicPerformanceMonitoring()
    await memoryLeakDetection()
    await comprehensiveAnalysisPipeline()
    await statisticalAnalysisDeepDive()
    await automatedPerformanceOptimization()
    await productionMonitoringSetup()
    
    console.log(chalk.bold.green('✅ All examples completed successfully!'))
    console.log(chalk.white('These examples demonstrate how to:'))
    console.log('• Monitor performance in real-time')
    console.log('• Detect and analyze memory leaks')
    console.log('• Perform comprehensive performance analysis')
    console.log('• Run advanced statistical tests')
    console.log('• Automate performance optimization')
    console.log('• Set up production monitoring')
    console.log('')
    console.log(chalk.blue('💡 Next steps:'))
    console.log('• Integrate these patterns into your application')
    console.log('• Customize monitoring thresholds for your environment')
    console.log('• Set up automated performance regression detection')
    console.log('• Create performance dashboards for your team')
    
  } catch (error) {
    console.error(chalk.red(`❌ Example execution failed: ${error}`))
  }
}

export default PerformanceIntegrationExamples