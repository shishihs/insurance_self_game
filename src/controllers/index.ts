/**
 * GameController モジュール - エントリーポイント
 * GUI/CUI両対応の完全分離アーキテクチャ
 */

// === 核となるクラス ===
export { GameController, GameControllerFactory } from './GameController'
export { GameValidator, GameValidationError, GameValidationWarning } from './GameValidator'

// === インターフェース ===
export type { 
  GameRenderer, 
  RendererChoice, 
  CardSelectionOptions, 
  RendererEvents 
} from '../interfaces/GameRenderer'

// === サンプル実装 ===
export { ConsoleRenderer, AutoPlayRenderer } from './examples/ConsoleRenderer'

// === 使用例とユーティリティ ===
export {
  basicUsageExample,
  factoryUsageExample,
  benchmarkExample,
  errorHandlingExample,
  customRendererExample,
  interruptionExample,
  runAllExamples,
  createTestController,
  performanceTest
} from './examples/GameControllerUsage'

// === 型定義 ===
export type { ValidationResult } from './GameValidator'

/**
 * 簡単な使用方法:
 * 
 * ```typescript
 * import { GameControllerFactory, ConsoleRenderer } from '@/controllers'
 * 
 * const renderer = new ConsoleRenderer()
 * const controller = GameControllerFactory.createDefault(renderer)
 * const stats = await controller.playGame()
 * ```
 * 
 * CLI/CUIでの高速テスト:
 * 
 * ```typescript
 * import { AutoPlayRenderer, performanceTest } from '@/controllers'
 * 
 * const results = await performanceTest(100) // 100回自動実行
 * console.log('平均実行時間:', results.avgDuration, 'ms')
 * ```
 */