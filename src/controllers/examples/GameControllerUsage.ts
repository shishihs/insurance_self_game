/**
 * GameController使用例とサンプル実装
 * GUI/CUI両対応の完全分離アーキテクチャのデモンストレーション
 */

import { GameController, GameControllerFactory } from '../GameController'
import { ConsoleRenderer, AutoPlayRenderer } from './ConsoleRenderer'
import { GameValidator } from '../GameValidator'
import type { GameConfig } from '@/domain/types/game.types'

/**
 * 基本的な使用例
 */
export async function basicUsageExample(): Promise<void> {
  console.log('=== GameController基本使用例 ===\n')
  
  // 1. レンダラーの作成（CUI）
  const renderer = new ConsoleRenderer()
  
  // 2. ゲーム設定
  const config: GameConfig = {
    difficulty: 'normal',
    startingVitality: 20,
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  }
  
  // 3. 設定の検証
  const validation = GameValidator.validateGameConfig(config)
  if (!validation.isValid) {
    console.error('設定エラー:', validation.errors)
    return
  }
  
  // 警告があれば表示
  if (validation.warnings.length > 0) {
    console.warn('設定警告:', validation.warnings)
  }
  
  // 4. ゲームコントローラーの作成
  const controller = new GameController(config, renderer)
  
  // 5. デバッグモード有効化（オプション）
  controller.setDebugMode(true)
  
  try {
    // 6. ゲーム実行
    const finalStats = await controller.playGame()
    
    // 7. 結果の表示
    console.log('\n=== 最終結果 ===')
    console.log(`総チャレンジ数: ${finalStats.totalChallenges}`)
    console.log(`成功率: ${Math.round((finalStats.successfulChallenges / finalStats.totalChallenges) * 100)}%`)
    console.log(`獲得カード数: ${finalStats.cardsAcquired}`)
    
  } catch (error) {
    console.error('ゲーム実行エラー:', error)
  }
}

/**
 * ファクトリーを使用した簡単な例
 */
export async function factoryUsageExample(): Promise<void> {
  console.log('=== ファクトリー使用例 ===\n')
  
  const renderer = new ConsoleRenderer()
  
  // デフォルト設定でゲーム作成
  const controller = GameControllerFactory.createDefault(renderer)
  
  // ゲーム実行
  const stats = await controller.playGame()
  console.log('ゲーム完了:', stats)
}

/**
 * 自動プレイでのベンチマーク例
 */
export async function benchmarkExample(): Promise<void> {
  console.log('=== ベンチマーク例（自動プレイ） ===\n')
  
  const gameCount = 10
  const results: any[] = []
  
  for (let i = 1; i <= gameCount; i++) {
    console.log(`\n--- ゲーム ${i}/${gameCount} ---`)
    
    // 高速自動プレイレンダラー（遅延なし）
    const renderer = new AutoPlayRenderer(0)
    const controller = GameControllerFactory.createDefault(renderer)
    
    const startTime = Date.now()
    const stats = await controller.playGame()
    const endTime = Date.now()
    
    results.push({
      gameId: i,
      stats,
      duration: endTime - startTime,
      success: stats.successfulChallenges > stats.failedChallenges
    })
    
    console.log(`ゲーム${i}完了 (${endTime - startTime}ms)`)
  }
  
  // 統計の集計
  const successCount = results.filter(r => r.success).length
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / gameCount
  const avgChallenges = results.reduce((sum, r) => sum + r.stats.totalChallenges, 0) / gameCount
  
  console.log('\n=== ベンチマーク結果 ===')
  console.log(`ゲーム数: ${gameCount}`)
  console.log(`勝利数: ${successCount} (${Math.round((successCount / gameCount) * 100)}%)`)
  console.log(`平均実行時間: ${Math.round(avgDuration)}ms`)
  console.log(`平均チャレンジ数: ${Math.round(avgChallenges)}`)
}

/**
 * エラーハンドリング例
 */
export async function errorHandlingExample(): Promise<void> {
  console.log('=== エラーハンドリング例 ===\n')
  
  // 無効な設定でのテスト
  const invalidConfig: GameConfig = {
    difficulty: 'normal',
    startingVitality: -10, // 無効な値
    startingHandSize: 20,  // 大きすぎる値
    maxHandSize: 5,        // startingHandSizeより小さい
    dreamCardCount: -1     // 無効な値
  }
  
  const validation = GameValidator.validateGameConfig(invalidConfig)
  
  console.log('設定検証結果:')
  console.log('有効:', validation.isValid)
  console.log('エラー:', validation.errors)
  console.log('警告:', validation.warnings)
  
  if (!validation.isValid) {
    console.log('\n設定が無効なためゲームを開始できません。')
    return
  }
  
  // ゲーム実行（この例では実行されない）
}

/**
 * カスタムレンダラー例（ログのみ）
 */
class LogOnlyRenderer extends ConsoleRenderer {
  private logs: string[] = []
  
  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    this.logs.push(`[${level.toUpperCase()}] ${message}`)
    super.showMessage(message, level)
  }
  
  showError(error: string): void {
    this.logs.push(`[ERROR] ${error}`)
    super.showError(error)
  }
  
  getLogs(): string[] {
    return [...this.logs]
  }
  
  clearLogs(): void {
    this.logs = []
  }
}

/**
 * カスタムレンダラー使用例
 */
export async function customRendererExample(): Promise<void> {
  console.log('=== カスタムレンダラー例 ===\n')
  
  const renderer = new LogOnlyRenderer()
  const controller = GameControllerFactory.createDefault(renderer)
  
  const stats = await controller.playGame()
  
  console.log('\n=== 収集されたログ ===')
  const logs = renderer.getLogs()
  logs.forEach((log, index) => {
    console.log(`${index + 1}. ${log}`)
  })
  
  console.log(`\n総ログ数: ${logs.length}`)
}

/**
 * 段階的停止機能のデモ
 */
export async function interruptionExample(): Promise<void> {
  console.log('=== 中断機能例 ===\n')
  
  const renderer = new AutoPlayRenderer(100) // 100ms遅延
  const controller = GameControllerFactory.createDefault(renderer)
  controller.setDebugMode(true)
  
  // 3秒後にゲームを強制停止
  setTimeout(() => {
    console.log('\n🛑 ゲームを強制停止します...')
    controller.stopGame()
  }, 3000)
  
  try {
    const stats = await controller.playGame()
    console.log('ゲーム完了（正常終了）:', stats)
  } catch (error) {
    console.log('ゲーム中断（異常終了）:', error)
  }
}

/**
 * メイン実行関数
 */
export async function runAllExamples(): Promise<void> {
  console.log('🎮 GameController使用例集\n')
  
  try {
    await basicUsageExample()
    console.log('\n' + '='.repeat(60) + '\n')
    
    await factoryUsageExample()
    console.log('\n' + '='.repeat(60) + '\n')
    
    await errorHandlingExample()
    console.log('\n' + '='.repeat(60) + '\n')
    
    await customRendererExample()
    console.log('\n' + '='.repeat(60) + '\n')
    
    await benchmarkExample()
    console.log('\n' + '='.repeat(60) + '\n')
    
    await interruptionExample()
    
  } catch (error) {
    console.error('例の実行中にエラーが発生しました:', error)
  }
}

// 使用方法:
// import { runAllExamples } from './path/to/GameControllerUsage'
// runAllExamples()

/**
 * 単体テスト用のヘルパー関数
 */
export function createTestController(): GameController {
  const mockRenderer = new AutoPlayRenderer(0)
  return GameControllerFactory.createDefault(mockRenderer)
}

/**
 * パフォーマンステスト用の関数
 */
export async function performanceTest(iterations: number = 100): Promise<{
  avgDuration: number
  minDuration: number
  maxDuration: number
  successRate: number
}> {
  const results: number[] = []
  let successCount = 0
  
  for (let i = 0; i < iterations; i++) {
    const renderer = new AutoPlayRenderer(0)
    const controller = GameControllerFactory.createDefault(renderer)
    
    const start = Date.now()
    const stats = await controller.playGame()
    const duration = Date.now() - start
    
    results.push(duration)
    if (stats.successfulChallenges > stats.failedChallenges) {
      successCount++
    }
  }
  
  return {
    avgDuration: results.reduce((a, b) => a + b, 0) / results.length,
    minDuration: Math.min(...results),
    maxDuration: Math.max(...results),
    successRate: successCount / iterations
  }
}