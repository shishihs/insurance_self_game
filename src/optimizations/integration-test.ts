/**
 * 統合テスト - 最適化システムの動作確認
 */

import { UnifiedPerformanceSystem } from './UnifiedPerformanceSystem'
import { OptimizedGameFactory } from './OptimizedGameComponents'

// 簡単な統合テスト
export async function runIntegrationTest(): Promise<boolean> {
  console.log('Running integration test...')
  
  try {
    // 1. システム初期化テスト
    const system = UnifiedPerformanceSystem.getInstance()
    system.start()
    
    // 2. ゲームコンポーネントテスト
    const game = OptimizedGameFactory.createOptimizedGame()
    
    // 3. 基本機能テスト
    const card = game.cardManager.createCard('test', 'attack', 100, 0.5)
    const gameState = game.stateManager.createGameState({ 
      turn: 1, 
      vitality: 100, 
      cards: [card] 
    })
    
    // 4. 最適化機能テスト
    const score = game.stateManager.evaluateGameState(gameState)
    const risk = game.algorithms.calculateRisk([card], gameState)
    
    // 5. クリーンアップ
    game.cardManager.releaseCard(card)
    game.stateManager.releaseGameState(gameState)
    system.stop()
    
    console.log('✅ Integration test passed')
    console.log(`   Game state score: ${score}`)
    console.log(`   Risk calculation: ${risk}`)
    
    return true
  } catch (error) {
    console.error('❌ Integration test failed:', error)
    return false
  }
}

// TypeScriptチェック用の型定義テスト
export function typeCheckTest() {
  // 型が正しく推論されることを確認
  const system: UnifiedPerformanceSystem = UnifiedPerformanceSystem.getInstance()
  const metrics = system.getCurrentMetrics()
  
  // 型安全性の確認
  const memoryUsage: number = metrics.memory.usagePercent
  const poolEfficiency: number = metrics.optimization.poolEfficiency
  
  return { memoryUsage, poolEfficiency }
}

// Node.js環境での実行
if (typeof require !== 'undefined' && require.main === module) {
  runIntegrationTest().then(success => {
    console.log(`Test result: ${success ? 'PASS' : 'FAIL'}`)
    process.exit(success ? 0 : 1)
  })
}