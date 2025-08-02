/**
 * ゲーム状態管理システム - メインエクスポート
 * 
 * このモジュールは包括的な状態管理システムを提供します：
 * - セーブ/ロード機能
 * - 拡張統計システム
 * - Undo/Redo機能
 * - LocalStorage最適化
 * - プレイヤー分析
 * - アナリティクス統合
 */

// 状態管理の中核
export { GameStateManager } from './GameStateManager'
export type { 
  SaveData, 
  SaveMetadata, 
  EnhancedPlayerStats,
  InsuranceUsagePattern,
  Achievement,
  DailyProgress,
  PlayStreak,
  GameStateSnapshot,
  SaveSlot
} from './GameStateManager'

// セーブ/ロードサービス
export { SaveLoadService, SaveLoadUtils } from './SaveLoadService'
export type { 
  SaveLoadResult,
  SaveOptions,
  LoadOptions
} from './SaveLoadService'

// ストレージ最適化
export { StorageOptimizer } from '../storage/StorageOptimizer'
export type {
  CompressionOptions,
  CacheOptions,
  BatchOptions,
  StorageOptimizerConfig,
  StorageStats
} from '../storage/StorageOptimizer'

// プレイヤー分析
export { GameAnalytics } from '../analytics/GameAnalytics'
export type {
  PlayerAction,
  StrategyPattern,
  EfficiencyMetrics,
  LearningProgress
} from '../analytics/GameAnalytics'

// アナリティクス統合
export { AnalyticsIntegration } from './AnalyticsIntegration'
export type {
  CombinedAnalyticsReport,
  IntegratedExportData,
  DataConsistencyReport
} from './AnalyticsIntegration'

// Undo/Redo機能
export { UndoRedoManager } from '../commands/UndoRedoManager'
export { CommandHistory } from '../commands/CommandHistory'
export type {
  UndoRedoEvent,
  UndoRedoConfig,
  CommandHistoryConfig,
  CommandHistoryStats,
  UndoRedoResult
} from '../commands/UndoRedoManager'

// コマンドシステム
export {
  CardSelectionCommand,
  ChallengeCommand,
  InsurancePurchaseCommand,
  NextTurnCommand,
  NoOpCommand,
  CompositeCommand,
  SnapshotCommand
} from '../commands/GameCommand'
export type {
  GameCommand,
  CommandCategory
} from '../commands/GameCommand'

// UIコンポーネント
export { SaveLoadMenu } from '../ui/SaveLoadMenu'
export { StatisticsPanel } from '../ui/StatisticsPanel'

/**
 * 統合ゲーム状態管理システム
 * すべての状態管理機能を統合して提供する高レベルAPIクラス
 */
export class IntegratedGameStateSystem {
  private stateManager: GameStateManager
  private readonly saveLoadService: SaveLoadService
  private readonly storageOptimizer: StorageOptimizer
  private readonly analytics: GameAnalytics
  private readonly undoRedoManager: UndoRedoManager
  private readonly analyticsIntegration: AnalyticsIntegration
  
  constructor(config?: {
    storageConfig?: Partial<StorageOptimizerConfig>
    undoRedoConfig?: Partial<UndoRedoConfig>
  }) {
    this.stateManager = GameStateManager.getInstance()
    this.saveLoadService = new SaveLoadService()
    this.storageOptimizer = StorageOptimizer.getInstance(config?.storageConfig)
    this.analytics = new GameAnalytics()
    this.undoRedoManager = new UndoRedoManager(config?.undoRedoConfig)
    this.analyticsIntegration = AnalyticsIntegration.getInstance()
  }
  
  /**
   * システムを初期化
   */
  initialize(game: any): void {
    this.stateManager.setCurrentGame(game)
    this.undoRedoManager.setCurrentGame(game)
    this.analyticsIntegration.initialize()
    
    // 分析システムにゲーム開始を記録
    this.analytics.recordAction({
      type: 'game_complete',
      gameStage: game.stage,
      turn: game.turn,
      vitality: game.vitality,
      data: { sessionStart: true }
    })
    
    console.log('🎮 統合ゲーム状態管理システムを初期化しました')
  }
  
  /**
   * 包括的な状態情報を取得
   */
  getSystemStatus(): {
    saveSlots: SaveSlot[]
    storageInfo: ReturnType<StorageOptimizer['getStorageInfo']>
    undoRedoState: ReturnType<UndoRedoManager['getHistoryState']>
    analytics: {
      stats: EnhancedPlayerStats
      efficiency: EfficiencyMetrics
      patterns: StrategyPattern[]
      learning: LearningProgress
    }
    performance: {
      storageStats: StorageStats
      undoRedoStats: CommandHistoryStats
    }
    integration: CombinedAnalyticsReport
  } {
    return {
      saveSlots: this.saveLoadService.getSaveSlots(),
      storageInfo: this.storageOptimizer.getStorageInfo(),
      undoRedoState: this.undoRedoManager.getHistoryState(),
      analytics: {
        stats: this.stateManager.getEnhancedStats(),
        efficiency: this.analytics.getEfficiencyMetrics(),
        patterns: this.analytics.getStrategyPatterns(),
        learning: this.analytics.getLearningProgress()
      },
      performance: {
        storageStats: this.storageOptimizer.getStats(),
        undoRedoStats: this.undoRedoManager.getHistoryStats()
      },
      integration: this.analyticsIntegration.generateCombinedReport()
    }
  }
  
  /**
   * システム全体を最適化
   */
  async optimizeSystem(): Promise<{
    cleanupResult: Awaited<ReturnType<StorageOptimizer['cleanup']>>
    performanceGain: number
    dataConsistency: DataConsistencyReport
  }> {
    const beforeStats = this.storageOptimizer.getStats()
    
    // ストレージクリーンアップ
    const cleanupResult = await this.storageOptimizer.cleanup()
    
    // バッチ処理を強制実行
    await this.storageOptimizer.flushBatch()
    
    // データ同期を実行
    this.analyticsIntegration.syncData()
    
    const afterStats = this.storageOptimizer.getStats()
    const performanceGain = afterStats.averageOperationTime > 0 
      ? (beforeStats.averageOperationTime - afterStats.averageOperationTime) / beforeStats.averageOperationTime
      : 0
    
    const dataConsistency = this.analyticsIntegration.checkDataConsistency()
    
    console.log('⚡ システム最適化完了:', {
      freedSpace: cleanupResult.freedSpace,
      performanceGain: `${(performanceGain * 100).toFixed(1)}%`,
      consistencyScore: dataConsistency.score
    })
    
    return { cleanupResult, performanceGain, dataConsistency }
  }
  
  /**
   * システム全体をリセット
   */
  async resetSystem(): Promise<void> {
    // 統合データのバックアップを作成
    const backup = this.analyticsIntegration.createExportData()
    
    // 各システムをクリア
    this.stateManager = GameStateManager.getInstance()
    this.undoRedoManager.clearHistory()
    this.storageOptimizer.clearCache()
    this.analytics.resetAnalytics()
    this.analyticsIntegration.destroy()
    
    console.log('🔄 システム全体をリセットしました')
    
    // バックアップをログに出力（手動復旧用）
    console.log('💾 統合バックアップデータ:', backup)
  }
  
  /**
   * システムを安全に終了
   */
  async shutdown(): Promise<void> {
    // 未保存のデータを保存
    await this.storageOptimizer.flushBatch()
    
    // アナリティクス統合の最終同期
    this.analyticsIntegration.syncData()
    
    // 各システムをクリーンアップ
    this.analyticsIntegration.destroy()
    this.storageOptimizer.destroy()
    this.undoRedoManager.destroy()
    this.stateManager.destroy()
    
    console.log('⏹️ 統合ゲーム状態管理システムを終了しました')
  }
  
  // ===== 便利なヘルパーメソッド =====
  
  /**
   * ワンクリックでゲームをセーブ、統計更新、最適化を実行
   */
  async quickSave(game: any, slotId: string = 'quick'): Promise<SaveLoadResult> {
    // ゲーム完了統計を更新
    this.stateManager.onGameComplete(game.stats)
    
    // セーブを実行
    const saveResult = await this.saveLoadService.saveGame(game, slotId, {
      slotName: `クイックセーブ - ${new Date().toLocaleString()}`,
      overwrite: true
    })
    
    if (saveResult.success) {
      // アナリティクス同期とバックグラウンド最適化
      this.analyticsIntegration.syncData()
      setTimeout(() => {
        this.optimizeSystem().catch(console.error)
      }, 100)
    }
    
    return saveResult
  }
  
  /**
   * インテリジェントなロード（最適なセーブデータを自動選択）
   */
  async smartLoad(): Promise<SaveLoadResult> {
    const slots = this.saveLoadService.getSaveSlots()
    const nonEmptySlots = slots.filter(slot => !slot.isEmpty)
    
    if (nonEmptySlots.length === 0) {
      return {
        success: false,
        message: 'ロード可能なセーブデータがありません',
        affectedCommands: 0
      }
    }
    
    // 最新のセーブデータを選択
    const latestSlot = nonEmptySlots.reduce((latest, current) => 
      current.lastSaved > latest.lastSaved ? current : latest
    )
    
    const loadResult = await this.saveLoadService.loadGame(latestSlot.id, {
      validateData: true
    })
    
    if (loadResult.success) {
      // ロード後にデータ同期を実行
      this.analyticsIntegration.syncData()
    }
    
    return loadResult
  }
  
  /**
   * 統合データのエクスポート
   */
  exportIntegratedData(): IntegratedExportData {
    return this.analyticsIntegration.createExportData()
  }
  
  /**
   * 統合データのインポート
   */
  async importIntegratedData(data: IntegratedExportData): Promise<void> {
    await this.analyticsIntegration.importIntegratedData(data)
  }
  
  /**
   * AIによるプレイ改善提案（統合分析版）
   */
  getAdvancedPlayImprovementSuggestions(): {
    immediate: string[]
    strategic: string[]
    longTerm: string[]
    dataQuality: string[]
  } {
    const report = this.analyticsIntegration.generateCombinedReport()
    const consistency = this.analyticsIntegration.checkDataConsistency()
    
    const immediate: string[] = []
    const strategic: string[] = []
    const longTerm: string[] = []
    const dataQuality: string[] = []
    
    // データ品質の問題を優先
    if (consistency.score < 80) {
      dataQuality.push('データの整合性に問題があります。システムの同期をお勧めします')
      dataQuality.push(...consistency.issues.slice(0, 2))
    }
    
    // 従来の提案に加えて、統合分析結果を活用
    const efficiency = report.analyticsMetrics
    const patterns = report.strategyPatterns
    
    // 即座に改善可能な点
    if (efficiency.decisionSpeed > 8) {
      immediate.push('決定時間を短縮することで集中力が向上します')
    }
    
    if (efficiency.optimalPlayRate < 60) {
      immediate.push('より強力なカードの組み合わせを意識してみてください')
    }
    
    // 戦略的改善点
    if (patterns.length > 0) {
      const dominantPattern = patterns[0]
      if (dominantPattern.successRate < 0.7) {
        strategic.push(`現在の「${dominantPattern.name}」の成功率を向上させるか、他の戦略を試してみてください`)
      }
    }
    
    strategic.push(...report.recommendations.slice(0, 2))
    
    // 長期的な目標
    const stats = report.stateManagerStats
    if (stats.gamesCompleted < 10) {
      longTerm.push('様々な戦略を試して自分に合ったプレイスタイルを見つけましょう')
    } else if (stats.gamesCompleted >= 10) {
      longTerm.push('一貫したプレイスタイルを確立し、効率性を追求しましょう')
    }
    
    // 実績の進捗に基づく提案
    const achievementProgress = report.achievementProgress
    if (achievementProgress.unlocked.length > 0) {
      longTerm.push(`新しい実績「${achievementProgress.unlocked[0].name}」を獲得しました！`)
    }
    
    return { immediate, strategic, longTerm, dataQuality }
  }
}

// デフォルトエクスポート
export default IntegratedGameStateSystem