/**
 * 包括的ベンチマークスイート
 * 最適化の効果を測定し、パフォーマンス改善を定量化
 */

import { OptimizationResult, UnifiedPerformanceSystem } from '../../optimizations/UnifiedPerformanceSystem'
import { 
  fastFilter, 
  fastShuffle, 
  OptimizedAlgorithms, 
  OptimizedMath, 
  OptimizedObject,
  OptimizedString,
  PerformanceUtils 
} from './OptimizedUtilities'

// ===== BENCHMARK INTERFACES =====

export interface BenchmarkResult {
  name: string
  iterations: number
  totalTime: number
  averageTime: number
  minTime: number
  maxTime: number
  operationsPerSecond: number
  memoryUsage: {
    before: number
    after: number
    delta: number
  }
  comparisons?: {
    baseline: BenchmarkResult
    improvement: {
      speedup: number
      memoryReduction: number
      efficiency: number
    }
  }
}

export interface BenchmarkSuite {
  name: string
  description: string
  results: BenchmarkResult[]
  summary: {
    totalTests: number
    averageSpeedup: number
    totalMemoryReduction: number
    overallScore: number
  }
}

// ===== BENCHMARK RUNNER =====

export class BenchmarkRunner {
  private readonly performanceSystem: UnifiedPerformanceSystem
  private readonly warmupIterations = 100
  private readonly benchmarkIterations = 1000

  constructor() {
    this.performanceSystem = UnifiedPerformanceSystem.getInstance()
  }

  /**
   * 単一ベンチマークの実行
   */
  async runBenchmark<T>(
    name: string,
    operation: () => T,
    iterations: number = this.benchmarkIterations,
    warmup: number = this.warmupIterations
  ): Promise<BenchmarkResult> {
    // ウォームアップ
    for (let i = 0; i < warmup; i++) {
      operation()
    }

    // ガベージコレクション強制実行
    if (global.gc) {
      global.gc()
    }

    const memoryBefore = this.getMemoryUsage()
    const times: number[] = []

    // ベンチマーク実行
    for (let i = 0; i < iterations; i++) {
      const start = performance.now()
      operation()
      const end = performance.now()
      times.push(end - start)
    }

    const memoryAfter = this.getMemoryUsage()
    const totalTime = times.reduce((sum, time) => sum + time, 0)
    const averageTime = totalTime / iterations
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)

    return {
      name,
      iterations,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      operationsPerSecond: 1000 / averageTime,
      memoryUsage: {
        before: memoryBefore,
        after: memoryAfter,
        delta: memoryAfter - memoryBefore
      }
    }
  }

  /**
   * 比較ベンチマークの実行
   */
  async runComparisonBenchmark<T>(
    name: string,
    optimizedOperation: () => T,
    baselineOperation: () => T,
    iterations: number = this.benchmarkIterations
  ): Promise<BenchmarkResult> {
    const baselineResult = await this.runBenchmark(`${name} (Baseline)`, baselineOperation, iterations)
    const optimizedResult = await this.runBenchmark(`${name} (Optimized)`, optimizedOperation, iterations)

    // 改善度を計算
    const speedup = baselineResult.averageTime / optimizedResult.averageTime
    const memoryReduction = baselineResult.memoryUsage.delta - optimizedResult.memoryUsage.delta
    const efficiency = (speedup + Math.max(0, memoryReduction / baselineResult.memoryUsage.delta)) / 2

    optimizedResult.comparisons = {
      baseline: baselineResult,
      improvement: {
        speedup,
        memoryReduction,
        efficiency
      }
    }

    return optimizedResult
  }

  /**
   * ベンチマークスイートの実行
   */
  async runSuite(name: string, description: string, benchmarks: Array<() => Promise<BenchmarkResult>>): Promise<BenchmarkSuite> {
    console.log(`🏃 Running benchmark suite: ${name}`)
    
    const results: BenchmarkResult[] = []
    
    for (const benchmark of benchmarks) {
      try {
        const result = await benchmark()
        results.push(result)
        console.log(`✅ ${result.name}: ${result.averageTime.toFixed(2)}ms avg, ${result.operationsPerSecond.toFixed(0)} ops/sec`)
      } catch (error) {
        console.error(`❌ Benchmark failed:`, error)
      }
    }

    // サマリーを計算
    const validResults = results.filter(r => r.comparisons)
    const averageSpeedup = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + r.comparisons!.improvement.speedup, 0) / validResults.length
      : 1

    const totalMemoryReduction = validResults.reduce((sum, r) => sum + r.comparisons!.improvement.memoryReduction, 0)
    const overallScore = validResults.length > 0
      ? validResults.reduce((sum, r) => sum + r.comparisons!.improvement.efficiency, 0) / validResults.length * 100
      : 0

    return {
      name,
      description,
      results,
      summary: {
        totalTests: results.length,
        averageSpeedup,
        totalMemoryReduction,
        overallScore
      }
    }
  }

  private getMemoryUsage(): number {
    if ((performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024
    }
    return 0
  }
}

// ===== PREDEFINED BENCHMARK SUITES =====

export class GameOptimizationBenchmarks {
  private readonly runner = new BenchmarkRunner()

  /**
   * 配列操作ベンチマーク
   */
  async runArrayBenchmarks(): Promise<BenchmarkSuite> {
    return this.runner.runSuite(
      'Array Operations',
      'Benchmarks for optimized array operations',
      [
        // シャッフルベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Array Shuffle',
          () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i)
            return fastShuffle(arr)
          },
          () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i)
            return arr.sort(() => Math.random() - 0.5)
          }
        ),

        // フィルタリングベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Array Filter',
          () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i)
            return fastFilter(arr, x => x % 2 === 0)
          },
          () => {
            const arr = Array.from({ length: 1000 }, (_, i) => i)
            return arr.filter(x => x % 2 === 0)
          }
        ),

        // ソートベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Array Sort',
          () => {
            const arr = Array.from({ length: 1000 }, () => Math.random())
            return OptimizedAlgorithms.quickSort(arr)
          },
          () => {
            const arr = Array.from({ length: 1000 }, () => Math.random())
            return arr.sort((a, b) => a - b)
          }
        )
      ]
    )
  }

  /**
   * 数学関数ベンチマーク
   */
  async runMathBenchmarks(): Promise<BenchmarkSuite> {
    return this.runner.runSuite(
      'Math Operations',
      'Benchmarks for optimized mathematical operations',
      [
        // 階乗計算ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Factorial Calculation',
          () => OptimizedMath.factorial(20),
          () => {
            const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1)
            return factorial(20)
          }
        ),

        // べき乗計算ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Power Calculation',
          () => OptimizedMath.power(2, 30),
          () => 2**30
        ),

        // 組み合わせ計算ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Combination Calculation',
          () => OptimizedMath.combination(50, 25),
          () => {
            const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1)
            return factorial(50) / (factorial(25) * factorial(25))
          }
        )
      ]
    )
  }

  /**
   * 文字列操作ベンチマーク
   */
  async runStringBenchmarks(): Promise<BenchmarkSuite> {
    return this.runner.runSuite(
      'String Operations',
      'Benchmarks for optimized string operations',
      [
        // 文字列比較ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'String Comparison',
          () => {
            const str1 = 'a'.repeat(1000)
            const str2 = 'a'.repeat(1000)
            return OptimizedString.fastEquals(str1, str2)
          },
          () => {
            const str1 = 'a'.repeat(1000)
            const str2 = 'a'.repeat(1000)
            return str1 === str2
          }
        ),

        // 文字列置換ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'String Replace',
          () => {
            const str = 'hello world hello universe hello galaxy'.repeat(100)
            return OptimizedString.fastReplace(str, 'hello', 'hi')
          },
          () => {
            const str = 'hello world hello universe hello galaxy'.repeat(100)
            return str.replace(/hello/g, 'hi')
          }
        ),

        // ハッシュ計算ベンチマーク
        async () => this.runner.runBenchmark(
          'String Hash',
          () => {
            const str = 'benchmark string for hashing'.repeat(10)
            return OptimizedString.hash(str)
          }
        )
      ]
    )
  }

  /**
   * オブジェクト操作ベンチマーク
   */
  async runObjectBenchmarks(): Promise<BenchmarkSuite> {
    return this.runner.runSuite(
      'Object Operations',
      'Benchmarks for optimized object operations',
      [
        // オブジェクトクローンベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Object Clone',
          () => {
            const obj = { a: 1, b: 2, c: 3, d: { nested: true }, e: [1, 2, 3] }
            return OptimizedObject.fastClone(obj)
          },
          () => {
            const obj = { a: 1, b: 2, c: 3, d: { nested: true }, e: [1, 2, 3] }
            return { ...obj }
          }
        ),

        // 深い比較ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Deep Object Comparison',
          () => {
            const obj1 = { a: 1, b: { c: 2, d: [3, 4, 5] } }
            const obj2 = { a: 1, b: { c: 2, d: [3, 4, 5] } }
            return OptimizedObject.deepEquals(obj1, obj2)
          },
          () => {
            const obj1 = { a: 1, b: { c: 2, d: [3, 4, 5] } }
            const obj2 = { a: 1, b: { c: 2, d: [3, 4, 5] } }
            return JSON.stringify(obj1) === JSON.stringify(obj2)
          }
        ),

        // プロパティ取得ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Property Access',
          () => {
            const obj = { a: { b: { c: { d: 'value' } } } }
            return OptimizedObject.getProperty(obj, 'a.b.c.d')
          },
          () => {
            const obj = { a: { b: { c: { d: 'value' } } } }
            return obj.a?.b?.c?.d
          }
        )
      ]
    )
  }

  /**
   * メモリ最適化ベンチマーク
   */
  async runMemoryBenchmarks(): Promise<BenchmarkSuite> {
    return this.runner.runSuite(
      'Memory Optimization',
      'Benchmarks for memory optimization techniques',
      [
        // オブジェクトプール使用ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Object Pool Usage',
          () => {
            const system = UnifiedPerformanceSystem.getInstance()
            const objects = []
            
            for (let i = 0; i < 1000; i++) {
              const obj = system.acquireFromPool('objects') || {}
              objects.push(obj)
            }
            
            for (const obj of objects) {
              system.releaseToPool('objects', obj)
            }
            
            return objects.length
          },
          () => {
            const objects = []
            
            for (let i = 0; i < 1000; i++) {
              const obj = {}
              objects.push(obj)
            }
            
            return objects.length
          }
        ),

        // メモ化ベンチマーク
        async () => this.runner.runComparisonBenchmark(
          'Memoization',
          () => {
            const system = UnifiedPerformanceSystem.getInstance()
            let result = 0
            
            for (let i = 0; i < 100; i++) {
              result += system.memoize('computations', `fib_${i % 20}`, () => {
                const fib = (n: number): number => n <= 1 ? n : fib(n - 1) + fib(n - 2)
                return fib(i % 20)
              })
            }
            
            return result
          },
          () => {
            const fib = (n: number): number => n <= 1 ? n : fib(n - 1) + fib(n - 2)
            let result = 0
            
            for (let i = 0; i < 100; i++) {
              result += fib(i % 20)
            }
            
            return result
          }
        )
      ]
    )
  }

  /**
   * 統合最適化ベンチマーク
   */
  async runIntegratedBenchmarks(): Promise<BenchmarkSuite> {
    return this.runner.runSuite(
      'Integrated Optimizations',
      'Benchmarks for integrated optimization systems',
      [
        // 統合システムのパフォーマンス測定
        async () => this.runner.runBenchmark(
          'Unified Performance System',
          () => {
            const system = UnifiedPerformanceSystem.getInstance()
            
            // 複数の最適化を組み合わせて使用
            const cards = []
            for (let i = 0; i < 100; i++) {
              const card = system.acquireFromPool('cards') || { id: '', type: '', value: 0, riskFactor: 0 }
              card.id = `card_${i}`
              card.type = 'test'
              card.value = i
              card.riskFactor = Math.random()
              cards.push(card)
            }
            
            // メモ化された計算
            const processedCards = cards.map(card => {
              return system.memoize('gameLogic', `process_${card.id}`, () => ({
                ...card,
                processed: true,
                hash: OptimizedString.hash(card.id)
              }))
            })
            
            // 最適化されたソート
            const sortedCards = OptimizedAlgorithms.quickSort(processedCards, (a, b) => a.value - b.value)
            
            // プールに戻す
            for (const card of cards) {
              system.releaseToPool('cards', card)
            }
            
            return sortedCards.length
          }
        ),

        // 全体最適化の効果測定
        async () => this.runner.runBenchmark(
          'Full Optimization Pipeline',
          async () => {
            const system = UnifiedPerformanceSystem.getInstance()
            const before = system.getCurrentMetrics()
            
            // 最適化を実行
            const result = await system.optimizeNow()
            
            const after = system.getCurrentMetrics()
            
            return {
              memoryImprovement: result.improvements.memoryReduction,
              speedImprovement: result.improvements.speedIncrease,
              efficiencyGain: result.improvements.efficiencyGain
            }
          }
        )
      ]
    )
  }

  /**
   * 全ベンチマークの実行
   */
  async runAllBenchmarks(): Promise<{
    suites: BenchmarkSuite[]
    overallSummary: {
      totalBenchmarks: number
      averageSpeedup: number
      totalMemoryReduction: number
      overallScore: number
    }
  }> {
    console.log('🚀 Starting comprehensive benchmark suite...')
    
    const suites = await Promise.all([
      this.runArrayBenchmarks(),
      this.runMathBenchmarks(),
      this.runStringBenchmarks(),
      this.runObjectBenchmarks(),
      this.runMemoryBenchmarks(),
      this.runIntegratedBenchmarks()
    ])

    // 全体サマリーを計算
    const totalBenchmarks = suites.reduce((sum, suite) => sum + suite.summary.totalTests, 0)
    const averageSpeedup = suites.reduce((sum, suite) => sum + suite.summary.averageSpeedup, 0) / suites.length
    const totalMemoryReduction = suites.reduce((sum, suite) => sum + suite.summary.totalMemoryReduction, 0)
    const overallScore = suites.reduce((sum, suite) => sum + suite.summary.overallScore, 0) / suites.length

    return {
      suites,
      overallSummary: {
        totalBenchmarks,
        averageSpeedup,
        totalMemoryReduction,
        overallScore
      }
    }
  }
}

// ===== BENCHMARK REPORTER =====

export class BenchmarkReporter {
  /**
   * ベンチマーク結果をコンソールに出力
   */
  static reportToConsole(suites: BenchmarkSuite[]): void {
    console.log('\n📊 BENCHMARK RESULTS')
    console.log('='.repeat(50))

    for (const suite of suites) {
      console.log(`\n🎯 ${suite.name}`)
      console.log(`📝 ${suite.description}`)
      console.log('-'.repeat(30))

      for (const result of suite.results) {
        console.log(`\n📈 ${result.name}`)
        console.log(`   ⏱️  Average: ${result.averageTime.toFixed(2)}ms`)
        console.log(`   🚀 Ops/sec: ${result.operationsPerSecond.toFixed(0)}`)
        console.log(`   💾 Memory: ${result.memoryUsage.delta.toFixed(2)}MB`)

        if (result.comparisons) {
          const improvement = result.comparisons.improvement
          console.log(`   📊 Speedup: ${improvement.speedup.toFixed(2)}x`)
          console.log(`   🔄 Memory reduction: ${improvement.memoryReduction.toFixed(2)}MB`)
          console.log(`   ⭐ Efficiency: ${(improvement.efficiency * 100).toFixed(1)}%`)
        }
      }

      console.log(`\n📋 Suite Summary:`)
      console.log(`   Tests: ${suite.summary.totalTests}`)
      console.log(`   Avg Speedup: ${suite.summary.averageSpeedup.toFixed(2)}x`)
      console.log(`   Memory Saved: ${suite.summary.totalMemoryReduction.toFixed(2)}MB`)
      console.log(`   Overall Score: ${suite.summary.overallScore.toFixed(1)}%`)
    }
  }

  /**
   * ベンチマーク結果をJSONで出力
   */
  static exportToJSON(suites: BenchmarkSuite[], filename: string = 'benchmark-results.json'): string {
    const report = {
      timestamp: new Date().toISOString(),
      suites,
      metadata: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js',
        platform: typeof process !== 'undefined' ? process.platform : 'Browser',
        memory: (performance as any).memory ? {
          jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
          totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
          usedJSHeapSize: (performance as any).memory.usedJSHeapSize
        } : null
      }
    }

    const json = JSON.stringify(report, null, 2)
    
    // Node.js環境での出力
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs')
        fs.writeFileSync(filename, json)
        console.log(`📄 Benchmark results exported to ${filename}`)
      } catch (error) {
        console.warn('Could not write to file:', error)
      }
    }

    return json
  }

  /**
   * ベンチマーク結果をMarkdownで出力
   */
  static exportToMarkdown(suites: BenchmarkSuite[]): string {
    let markdown = '# Benchmark Results\n\n'
    markdown += `Generated: ${new Date().toISOString()}\n\n`

    for (const suite of suites) {
      markdown += `## ${suite.name}\n\n`
      markdown += `${suite.description}\n\n`
      markdown += '| Test | Avg Time (ms) | Ops/sec | Memory (MB) | Speedup | Efficiency |\n'
      markdown += '|------|---------------|---------|-------------|---------|------------|\n'

      for (const result of suite.results) {
        const speedup = result.comparisons ? `${result.comparisons.improvement.speedup.toFixed(2)}x` : '-'
        const efficiency = result.comparisons ? `${(result.comparisons.improvement.efficiency * 100).toFixed(1)}%` : '-'

        markdown += `| ${result.name} | ${result.averageTime.toFixed(2)} | ${result.operationsPerSecond.toFixed(0)} | ${result.memoryUsage.delta.toFixed(2)} | ${speedup} | ${efficiency} |\n`
      }

      markdown += `\n**Suite Summary:**\n`
      markdown += `- Tests: ${suite.summary.totalTests}\n`
      markdown += `- Average Speedup: ${suite.summary.averageSpeedup.toFixed(2)}x\n`
      markdown += `- Total Memory Saved: ${suite.summary.totalMemoryReduction.toFixed(2)}MB\n`
      markdown += `- Overall Score: ${suite.summary.overallScore.toFixed(1)}%\n\n`
    }

    return markdown
  }
}

// ===== EXPORTS =====

export { BenchmarkRunner, GameOptimizationBenchmarks, BenchmarkReporter }

export default {
  BenchmarkRunner,
  GameOptimizationBenchmarks,
  BenchmarkReporter
}