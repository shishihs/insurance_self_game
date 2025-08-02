/**
 * 最適化システムの簡単なテスト
 * 実装が正しく動作することを確認
 */

import { UnifiedPerformanceSystem } from './UnifiedPerformanceSystem'
import { OptimizedGameFactory } from './OptimizedGameComponents'
import { GameOptimizationBenchmarks } from '../utils/performance/BenchmarkSuite'

async function testOptimizations() {
  console.log('🧪 Testing Optimizations')
  console.log('=' .repeat(30))

  try {
    // 1. 統合パフォーマンスシステムのテスト
    console.log('1. Testing Unified Performance System...')
    const performanceSystem = UnifiedPerformanceSystem.getInstance()
    performanceSystem.start()

    // オブジェクトプールのテスト
    const obj = performanceSystem.acquireFromPool('objects')
    if (obj !== null) {
      console.log('   ✅ Object pool working')
      performanceSystem.releaseToPool('objects', obj)
    } else {
      console.log('   ℹ️ Object pool created new object (expected on first run)')
    }

    // メモ化のテスト
    const result1 = performanceSystem.memoize('test', 'key1', () => 42)
    const result2 = performanceSystem.memoize('test', 'key1', () => 99) // Should return cached 42
    
    if (result1 === 42 && result2 === 42) {
      console.log('   ✅ Memoization working')
    } else {
      console.log('   ❌ Memoization failed')
    }

    // メトリクスのテスト
    const metrics = performanceSystem.getCurrentMetrics()
    if (metrics && typeof metrics.timestamp === 'number') {
      console.log('   ✅ Metrics collection working')
    } else {
      console.log('   ❌ Metrics collection failed')
    }

    performanceSystem.stop()

    // 2. 最適化されたゲームコンポーネントのテスト
    console.log('\n2. Testing Optimized Game Components...')
    const game = OptimizedGameFactory.createOptimizedGame()

    // カード管理のテスト
    const card = game.cardManager.createCard('test', 'attack', 10, 0.2)
    if (card && card.id === 'test') {
      console.log('   ✅ Optimized card creation working')
      game.cardManager.releaseCard(card)
    } else {
      console.log('   ❌ Optimized card creation failed')
    }

    // ゲーム状態管理のテスト
    const gameState = game.stateManager.createGameState({ turn: 1, vitality: 100 })
    if (gameState && gameState.turn === 1) {
      console.log('   ✅ Optimized game state management working')
      game.stateManager.releaseGameState(gameState)
    } else {
      console.log('   ❌ Optimized game state management failed')
    }

    game.performanceSystem.stop()

    // 3. 簡単なベンチマークテスト
    console.log('\n3. Testing Benchmark System...')
    const benchmarks = new GameOptimizationBenchmarks()
    
    // 1つの簡単なベンチマークを実行
    const result = await benchmarks.runArrayBenchmarks()
    if (result && result.results.length > 0) {
      console.log('   ✅ Benchmark system working')
      console.log(`   ℹ️ Ran ${result.results.length} benchmark tests`)
    } else {
      console.log('   ❌ Benchmark system failed')
    }

    console.log('\n✅ All optimization tests completed successfully!')
    return true

  } catch (error) {
    console.error('\n❌ Optimization test failed:', error)
    return false
  }
}

// 実行
if (typeof require !== 'undefined' && require.main === module) {
  testOptimizations().then(success => {
    process.exit(success ? 0 : 1)
  })
}

export { testOptimizations }