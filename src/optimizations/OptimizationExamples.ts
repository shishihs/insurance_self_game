/**
 * 最適化システムの使用例とベンチマーク実行例
 * 実際のゲームロジックでの最適化効果を実証
 */

import { UnifiedPerformanceSystem } from './UnifiedPerformanceSystem'
import { BenchmarkReporter, GameOptimizationBenchmarks } from '../utils/performance/BenchmarkSuite'
import { 
  OptimizedCardManager, 
  OptimizedGameAlgorithms, 
  OptimizedGameFactory,
  OptimizedGameStateManager 
} from './OptimizedGameComponents'

// ===== BASIC USAGE EXAMPLES =====

export class OptimizationUsageExamples {
  
  /**
   * 基本的な最適化システムの使用例
   */
  static async basicOptimizationExample(): Promise<void> {
    console.log('🚀 Basic Optimization Example')
    console.log('=' .repeat(40))

    // 1. 統合パフォーマンスシステムの初期化
    const performanceSystem = UnifiedPerformanceSystem.getInstance({
      poolingConfig: {
        enabled: true,
        poolSizes: {
          cards: 100,
          gameStates: 50,
          arrays: 200,
          objects: 300
        }
      },
      memoizationConfig: {
        enabled: true,
        maxCacheSize: 1000
      }
    })

    // システム開始
    performanceSystem.start()

    console.log('✅ Performance system initialized')

    // 2. オブジェクトプールの使用例
    console.log('\n📦 Object Pool Example:')
    const cards = []
    
    // プールからオブジェクトを取得
    for (let i = 0; i < 50; i++) {
      const card = performanceSystem.acquireFromPool('cards') || {
        id: `card_${i}`,
        type: 'test',
        value: i * 10,
        riskFactor: Math.random() * 0.5
      }
      cards.push(card)
    }
    console.log(`   Created ${cards.length} cards from pool`)

    // プールにオブジェクトを戻す
    for (const card of cards) {
      performanceSystem.releaseToPool('cards', card)
    }
    console.log(`   Released ${cards.length} cards back to pool`)

    // 3. メモ化の使用例
    console.log('\n🧠 Memoization Example:')
    const expensiveCalculation = (n: number) => {
      let result = 0
      for (let i = 0; i < n * 1000; i++) {
        result += Math.sqrt(i)
      }
      return result
    }

    // メモ化なし
    const start1 = performance.now()
    expensiveCalculation(100)
    const time1 = performance.now() - start1

    // メモ化あり（初回）
    const start2 = performance.now()
    performanceSystem.memoize('computations', 'expensive_100', () => expensiveCalculation(100))
    const time2 = performance.now() - start2

    // メモ化あり（キャッシュヒット）
    const start3 = performance.now()
    performanceSystem.memoize('computations', 'expensive_100', () => expensiveCalculation(100))
    const time3 = performance.now() - start3

    console.log(`   Without memoization: ${time1.toFixed(2)}ms`)
    console.log(`   With memoization (first): ${time2.toFixed(2)}ms`)
    console.log(`   With memoization (cached): ${time3.toFixed(2)}ms`)
    console.log(`   Speedup: ${(time1 / time3).toFixed(2)}x`)

    // 4. パフォーマンス監視
    console.log('\n📊 Performance Monitoring:')
    const metrics = performanceSystem.getCurrentMetrics()
    console.log(`   Memory usage: ${metrics.memory.usagePercent.toFixed(1)}%`)
    console.log(`   Pool efficiency: ${metrics.optimization.poolEfficiency.toFixed(1)}%`)
    console.log(`   Cache hit rate: ${metrics.optimization.cacheHitRate.toFixed(1)}%`)

    // システム停止
    performanceSystem.stop()
    console.log('\n✅ Example completed')
  }

  /**
   * ゲーム固有の最適化使用例
   */
  static async gameSpecificOptimizationExample(): Promise<void> {
    console.log('\n🎮 Game-Specific Optimization Example')
    console.log('=' .repeat(50))

    // 最適化されたゲームコンポーネントを作成
    const game = OptimizedGameFactory.createOptimizedGame()
    
    console.log('✅ Optimized game components created')

    // 1. 最適化されたカード管理
    console.log('\n🃏 Optimized Card Management:')
    const cardManager = game.cardManager
    
    // カードを作成（プール使用）
    const testCards = []
    for (let i = 0; i < 20; i++) {
      const card = cardManager.createCard(
        `card_${i}`,
        ['attack', 'defense', 'utility', 'special'][i % 4],
        10 + i * 5,
        Math.random() * 0.4
      )
      testCards.push(card)
    }
    console.log(`   Created ${testCards.length} optimized cards`)

    // デッキシャッフル（メモ化）
    const shuffledDeck1 = cardManager.shuffleDeck(testCards, 12345)
    const shuffledDeck2 = cardManager.shuffleDeck(testCards, 12345) // キャッシュヒット
    console.log(`   Shuffled deck (deterministic): ${shuffledDeck1.length} cards`)
    console.log(`   Cache hit: ${shuffledDeck1 === shuffledDeck2}`)

    // カード検索
    const highValueCards = cardManager.findCards(testCards, card => card.value > 50)
    console.log(`   Found ${highValueCards.length} high-value cards`)

    // 2. 最適化されたゲーム状態管理
    console.log('\n🎯 Optimized Game State Management:')
    const stateManager = game.stateManager
    
    // ゲーム状態を作成
    const gameState = stateManager.createGameState({
      turn: 1,
      vitality: 100,
      cards: testCards.slice(0, 5),
      challenges: [],
      insurance: null
    })
    console.log(`   Created game state with ${gameState.cards.length} cards`)

    // ゲーム状態評価（メモ化）
    const score1 = stateManager.evaluateGameState(gameState)
    const score2 = stateManager.evaluateGameState(gameState) // キャッシュヒット
    console.log(`   Game state score: ${score1.toFixed(2)}`)
    console.log(`   Memoization working: ${score1 === score2}`)

    // 3. 最適化されたアルゴリズム
    console.log('\n🧮 Optimized Algorithms:')
    const algorithms = game.algorithms
    
    // 最適なカード選択
    const optimalCards = algorithms.selectOptimalCards(testCards, 5, gameState)
    console.log(`   Selected ${optimalCards.length} optimal cards`)

    // リスク計算（メモ化）
    const risk = algorithms.calculateRisk(optimalCards, gameState)
    console.log(`   Calculated risk: ${(risk * 100).toFixed(1)}%`)

    // AI判断
    const aiDecision = algorithms.makeAIDecision(gameState, ['draw_card', 'play_card', 'buy_insurance'])
    console.log(`   AI decision: ${aiDecision}`)

    // カードを解放
    for (const card of testCards) {
      cardManager.releaseCard(card)
    }
    
    stateManager.releaseGameState(gameState)
    
    console.log('\n✅ Game-specific optimization example completed')
  }

  /**
   * パフォーマンス比較の例
   */
  static async performanceComparisonExample(): Promise<void> {
    console.log('\n⚡ Performance Comparison Example')
    console.log('=' .repeat(45))

    const iterations = 1000
    console.log(`Running ${iterations} iterations for comparison...\n`)

    // 1. 配列操作の比較
    console.log('🔄 Array Operations Comparison:')
    
    // 従来のシャッフル
    const array1 = Array.from({ length: 100 }, (_, i) => i)
    const start1 = performance.now()
    for (let i = 0; i < iterations; i++) {
      array1.sort(() => Math.random() - 0.5)
    }
    const time1 = performance.now() - start1

    // 最適化されたシャッフル
    const { fastShuffle } = await import('../utils/performance/OptimizedUtilities')
    const array2 = Array.from({ length: 100 }, (_, i) => i)
    const start2 = performance.now()
    for (let i = 0; i < iterations; i++) {
      fastShuffle(array2)
    }
    const time2 = performance.now() - start2

    console.log(`   Traditional shuffle: ${time1.toFixed(2)}ms`)
    console.log(`   Optimized shuffle: ${time2.toFixed(2)}ms`)
    console.log(`   Speedup: ${(time1 / time2).toFixed(2)}x`)

    // 2. オブジェクト作成の比較
    console.log('\n🏭 Object Creation Comparison:')
    
    const performanceSystem = UnifiedPerformanceSystem.getInstance()
    performanceSystem.start()

    // 従来のオブジェクト作成
    const start3 = performance.now()
    const objects1 = []
    for (let i = 0; i < iterations; i++) {
      objects1.push({ id: i, value: i * 2, processed: false })
    }
    const time3 = performance.now() - start3

    // プールを使用したオブジェクト作成
    const start4 = performance.now()
    const objects2 = []
    for (let i = 0; i < iterations; i++) {
      const obj = performanceSystem.acquireFromPool('objects') || { id: 0, value: 0, processed: false }
      obj.id = i
      obj.value = i * 2
      obj.processed = false
      objects2.push(obj)
    }
    const time4 = performance.now() - start4

    console.log(`   Traditional creation: ${time3.toFixed(2)}ms`)
    console.log(`   Pool-based creation: ${time4.toFixed(2)}ms`)
    console.log(`   Speedup: ${(time3 / time4).toFixed(2)}x`)

    // オブジェクトを解放
    for (const obj of objects2) {
      performanceSystem.releaseToPool('objects', obj)
    }

    // 3. 計算キャッシュの比較
    console.log('\n💾 Computation Caching Comparison:')
    
    const expensiveFunction = (n: number) => {
      let result = 0
      for (let i = 0; i < n; i++) {
        result += Math.sqrt(i) * Math.sin(i)
      }
      return result
    }

    // キャッシュなし
    const start5 = performance.now()
    for (let i = 0; i < 100; i++) {
      expensiveFunction(i % 10 * 100) // 同じ計算を繰り返し
    }
    const time5 = performance.now() - start5

    // キャッシュあり
    const start6 = performance.now()
    for (let i = 0; i < 100; i++) {
      performanceSystem.memoize('computations', `expensive_${i % 10}`, () => expensiveFunction(i % 10 * 100))
    }
    const time6 = performance.now() - start6

    console.log(`   Without caching: ${time5.toFixed(2)}ms`)
    console.log(`   With caching: ${time6.toFixed(2)}ms`)
    console.log(`   Speedup: ${(time5 / time6).toFixed(2)}x`)

    performanceSystem.stop()
    console.log('\n✅ Performance comparison completed')
  }

  /**
   * 全体最適化の実行例
   */
  static async fullOptimizationExample(): Promise<void> {
    console.log('\n🎯 Full Optimization Example')
    console.log('=' .repeat(40))

    const performanceSystem = UnifiedPerformanceSystem.getInstance()
    performanceSystem.start()

    // 最適化前のメトリクス
    console.log('📊 Before Optimization:')
    const beforeMetrics = performanceSystem.getCurrentMetrics()
    console.log(`   Memory usage: ${beforeMetrics.memory.usagePercent.toFixed(1)}%`)
    console.log(`   Pool efficiency: ${beforeMetrics.optimization.poolEfficiency.toFixed(1)}%`)
    console.log(`   Overall score: ${beforeMetrics.optimization.overallScore.toFixed(1)}`)

    // 負荷を生成
    console.log('\n🔥 Generating workload...')
    const game = OptimizedGameFactory.createTestGame()
    
    // 大量のカード操作
    for (let i = 0; i < 500; i++) {
      const card = game.cardManager.createCard(`load_${i}`, 'test', i, Math.random())
      game.cardManager.calculateCardValue(card, game.gameState)
      
      if (i % 50 === 49) {
        game.cardManager.releaseCard(card)
      }
    }

    // 大量のゲーム状態操作
    for (let i = 0; i < 100; i++) {
      const state = game.stateManager.createGameState({ turn: i, vitality: 100 - i })
      game.stateManager.evaluateGameState(state)
      
      if (i % 10 === 9) {
        game.stateManager.releaseGameState(state)
      }
    }

    console.log('✅ Workload generated')

    // 最適化実行
    console.log('\n🚀 Running optimization...')
    const optimizationResult = await performanceSystem.optimizeNow()

    console.log('\n📈 Optimization Results:')
    console.log(`   Memory reduction: ${optimizationResult.improvements.memoryReduction.toFixed(2)}%`)
    console.log(`   Speed increase: ${optimizationResult.improvements.speedIncrease.toFixed(2)} fps`)
    console.log(`   Efficiency gain: ${optimizationResult.improvements.efficiencyGain.toFixed(2)}%`)

    console.log('\n💡 Recommendations:')
    for (const recommendation of optimizationResult.recommendations) {
      console.log(`   • ${recommendation}`)
    }

    // 最適化後のメトリクス
    console.log('\n📊 After Optimization:')
    const afterMetrics = performanceSystem.getCurrentMetrics()
    console.log(`   Memory usage: ${afterMetrics.memory.usagePercent.toFixed(1)}%`)
    console.log(`   Pool efficiency: ${afterMetrics.optimization.poolEfficiency.toFixed(1)}%`)
    console.log(`   Overall score: ${afterMetrics.optimization.overallScore.toFixed(1)}`)

    performanceSystem.stop()
    console.log('\n✅ Full optimization example completed')
  }
}

// ===== BENCHMARK EXECUTION EXAMPLES =====

export class BenchmarkExecutionExamples {
  
  /**
   * 基本ベンチマークの実行例
   */
  static async runBasicBenchmarks(): Promise<void> {
    console.log('\n🏃 Running Basic Benchmarks')
    console.log('=' .repeat(40))

    const benchmarks = new GameOptimizationBenchmarks()
    
    // 配列操作ベンチマーク
    console.log('📊 Array Operations Benchmark:')
    const arrayResults = await benchmarks.runArrayBenchmarks()
    
    console.log(`   Suite: ${arrayResults.name}`)
    console.log(`   Tests: ${arrayResults.summary.totalTests}`)
    console.log(`   Average Speedup: ${arrayResults.summary.averageSpeedup.toFixed(2)}x`)
    console.log(`   Overall Score: ${arrayResults.summary.overallScore.toFixed(1)}%`)

    // 数学関数ベンチマーク
    console.log('\n🧮 Math Operations Benchmark:')
    const mathResults = await benchmarks.runMathBenchmarks()
    
    console.log(`   Suite: ${mathResults.name}`)
    console.log(`   Tests: ${mathResults.summary.totalTests}`)
    console.log(`   Average Speedup: ${mathResults.summary.averageSpeedup.toFixed(2)}x`)
    console.log(`   Overall Score: ${mathResults.summary.overallScore.toFixed(1)}%`)

    console.log('\n✅ Basic benchmarks completed')
  }

  /**
   * 包括的ベンチマークの実行例
   */
  static async runComprehensiveBenchmarks(): Promise<void> {
    console.log('\n🎯 Running Comprehensive Benchmarks')
    console.log('=' .repeat(45))

    const benchmarks = new GameOptimizationBenchmarks()
    
    // 全ベンチマークを実行
    const results = await benchmarks.runAllBenchmarks()
    
    console.log('📊 Comprehensive Benchmark Results:')
    console.log(`   Total benchmarks: ${results.overallSummary.totalBenchmarks}`)
    console.log(`   Average speedup: ${results.overallSummary.averageSpeedup.toFixed(2)}x`)
    console.log(`   Memory reduction: ${results.overallSummary.totalMemoryReduction.toFixed(2)}MB`)
    console.log(`   Overall score: ${results.overallSummary.overallScore.toFixed(1)}%`)

    // 詳細結果をコンソールに出力
    console.log('\n📋 Detailed Results:')
    BenchmarkReporter.reportToConsole(results.suites)

    // JSONレポートを生成
    console.log('\n💾 Generating Reports:')
    const jsonReport = BenchmarkReporter.exportToJSON(results.suites)
    console.log(`   JSON report length: ${jsonReport.length} characters`)

    // Markdownレポートを生成
    const markdownReport = BenchmarkReporter.exportToMarkdown(results.suites)
    console.log(`   Markdown report length: ${markdownReport.length} characters`)

    console.log('\n✅ Comprehensive benchmarks completed')
  }

  /**
   * カスタムベンチマークの実行例
   */
  static async runCustomBenchmark(): Promise<void> {
    console.log('\n🔧 Running Custom Benchmark')
    console.log('=' .repeat(35))

    const { BenchmarkRunner } = await import('../utils/performance/BenchmarkSuite')
    const runner = new BenchmarkRunner()

    // カスタムベンチマーク: ゲーム特有の操作
    const result = await runner.runComparisonBenchmark(
      'Game Turn Processing',
      // 最適化版
      () => {
        const game = OptimizedGameFactory.createTestGame()
        const { cardManager, stateManager, algorithms } = game
        
        // ターンを処理
        const availableCards = game.testCards.slice(0, 10)
        const optimalCards = algorithms.selectOptimalCards(availableCards, 3, game.gameState)
        const risk = algorithms.calculateRisk(optimalCards, game.gameState)
        const decision = algorithms.makeAIDecision(game.gameState, ['draw_card', 'play_card'])
        
        // 状態を更新
        game.gameState.turn += 1
        game.gameState.vitality -= risk * 10
        
        return { optimalCards, risk, decision }
      },
      // ベースライン版（非最適化）
      () => {
        // 同様の処理を非最適化で実行
        const cards = []
        for (let i = 0; i < 10; i++) {
          cards.push({
            id: `card_${i}`,
            type: 'test',
            value: i * 10,
            riskFactor: Math.random() * 0.5
          })
        }
        
        // 非効率なソート
        cards.sort((a, b) => b.value - a.value)
        const optimalCards = cards.slice(0, 3)
        
        // 非効率なリスク計算
        const risk = optimalCards.reduce((sum, card) => sum + card.riskFactor, 0) / optimalCards.length
        
        // 簡単な判断
        const decision = 'draw_card'
        
        return { optimalCards, risk, decision }
      },
      500 // 500回実行
    )

    console.log('🎮 Custom Game Benchmark Results:')
    console.log(`   Test: ${result.name}`)
    console.log(`   Average time: ${result.averageTime.toFixed(2)}ms`)
    console.log(`   Operations/sec: ${result.operationsPerSecond.toFixed(0)}`)
    console.log(`   Memory delta: ${result.memoryUsage.delta.toFixed(2)}MB`)
    
    if (result.comparisons) {
      console.log(`   Speedup: ${result.comparisons.improvement.speedup.toFixed(2)}x`)
      console.log(`   Memory reduction: ${result.comparisons.improvement.memoryReduction.toFixed(2)}MB`)
      console.log(`   Efficiency: ${(result.comparisons.improvement.efficiency * 100).toFixed(1)}%`)
    }

    console.log('\n✅ Custom benchmark completed')
  }
}

// ===== MAIN DEMONSTRATION =====

export class OptimizationDemonstration {
  
  /**
   * 全体的なデモンストレーション
   */
  static async runFullDemonstration(): Promise<void> {
    console.log('🎯 INSURANCE GAME OPTIMIZATION DEMONSTRATION')
    console.log('=' .repeat(60))
    console.log('This demonstration shows the impact of comprehensive')
    console.log('performance optimizations in the insurance game.')
    console.log('=' .repeat(60))

    try {
      // 1. 基本的な最適化の使用例
      await OptimizationUsageExamples.basicOptimizationExample()

      // 2. ゲーム固有の最適化例
      await OptimizationUsageExamples.gameSpecificOptimizationExample()

      // 3. パフォーマンス比較
      await OptimizationUsageExamples.performanceComparisonExample()

      // 4. 全体最適化の実行
      await OptimizationUsageExamples.fullOptimizationExample()

      // 5. 基本ベンチマーク
      await BenchmarkExecutionExamples.runBasicBenchmarks()

      // 6. カスタムベンチマーク
      await BenchmarkExecutionExamples.runCustomBenchmark()

      // 7. 包括的ベンチマーク（時間がかかるので最後）
      console.log('\n⏳ Running comprehensive benchmarks (this may take a while)...')
      await BenchmarkExecutionExamples.runComprehensiveBenchmarks()

      console.log('\n🎉 DEMONSTRATION COMPLETED SUCCESSFULLY!')
      console.log('=' .repeat(60))
      console.log('Key takeaways:')
      console.log('• Object pooling reduces memory allocation overhead')
      console.log('• Memoization dramatically speeds up repeated calculations')
      console.log('• Optimized algorithms improve performance significantly')
      console.log('• Unified system provides comprehensive monitoring')
      console.log('• Benchmarking quantifies optimization benefits')
      console.log('=' .repeat(60))

    } catch (error) {
      console.error('❌ Demonstration failed:', error)
      throw error
    }
  }

  /**
   * 簡単なデモンストレーション（開発時用）
   */
  static async runQuickDemo(): Promise<void> {
    console.log('⚡ QUICK OPTIMIZATION DEMO')
    console.log('=' .repeat(30))

    try {
      // 基本例のみ実行
      await OptimizationUsageExamples.basicOptimizationExample()
      await OptimizationUsageExamples.gameSpecificOptimizationExample()
      await BenchmarkExecutionExamples.runCustomBenchmark()

      console.log('\n✅ Quick demo completed!')
      
    } catch (error) {
      console.error('❌ Quick demo failed:', error)
      throw error
    }
  }
}

// ===== EXPORTS =====

export {
  OptimizationUsageExamples,
  BenchmarkExecutionExamples,
  OptimizationDemonstration
}

export default OptimizationDemonstration

// ===== AUTO EXECUTION (for testing) =====

// Node.js環境での自動実行
if (typeof require !== 'undefined' && require.main === module) {
  OptimizationDemonstration.runQuickDemo().catch(console.error)
}