import { GameStateManager } from './GameStateManager'
import { GameAnalytics } from '../analytics/GameAnalytics'

/**
 * GameStateManagerとGameAnalyticsの統合ヘルパー
 * 
 * このクラスは両システム間のデータ同期と通信を管理します。
 */
export class AnalyticsIntegration {
  private static instance: AnalyticsIntegration | null = null
  private stateManager: GameStateManager
  private analytics: GameAnalytics
  private isInitialized = false
  
  private constructor() {
    this.stateManager = GameStateManager.getInstance()
    this.analytics = new GameAnalytics()
  }
  
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): AnalyticsIntegration {
    if (!AnalyticsIntegration.instance) {
      AnalyticsIntegration.instance = new AnalyticsIntegration()
    }
    return AnalyticsIntegration.instance
  }
  
  /**
   * 統合システムを初期化
   */
  initialize(): void {
    if (this.isInitialized) {
      return
    }
    
    // GameStateManagerのアナリティクスコールバックを登録
    this.stateManager.registerAnalyticsCallback((gameState, changeType) => {
      this.analytics.onGameStateChange(gameState, changeType)
    })
    
    // 初期同期を実行
    this.performInitialSync()
    
    this.isInitialized = true
    console.log('🔗 アナリティクス統合システムを初期化しました')
  }
  
  /**
   * 統合システムを終了
   */
  destroy(): void {
    if (!this.isInitialized) {
      return
    }
    
    // 最終同期を実行
    this.performFinalSync()
    this.isInitialized = false
    
    console.log('🔗 アナリティクス統合システムを終了しました')
  }
  
  /**
   * 双方向データ同期を実行
   */
  syncData(): void {
    if (!this.isInitialized) {
      console.warn('⚠️ 統合システムが初期化されていません')
      return
    }
    
    try {
      // アナリティクスデータをStateManagerに同期
      this.analytics.syncWithStateManager(this.stateManager)
      
      // StateManagerデータをアナリティクスに同期
      const stats = this.stateManager.getEnhancedStats()
      const analyticsData = this.analytics.exportAnalyticsData()
      this.stateManager.syncWithAnalytics(analyticsData)
      
      console.log('✅ 双方向データ同期が完了しました')
    } catch (error) {
      console.error('❌ データ同期エラー:', error)
    }
  }
  
  /**
   * 統計レポートを生成
   */
  generateCombinedReport(): CombinedAnalyticsReport {
    const stateStats = this.stateManager.getEnhancedStats()
    const analyticsStats = this.analytics.getEfficiencyMetrics()
    const learningProgress = this.analytics.getLearningProgress()
    const strategyPatterns = this.analytics.getStrategyPatterns()
    
    return {
      timestamp: new Date(),
      stateManagerStats: stateStats,
      analyticsMetrics: analyticsStats,
      learningProgress,
      strategyPatterns,
      recommendations: this.analytics.generatePersonalizedAdvice(),
      achievementProgress: this.analytics.checkAchievementProgress()
    }
  }
  
  /**
   * エクスポート用の統合データを作成
   */
  createExportData(): IntegratedExportData {
    const stateManagerData = this.stateManager.exportData()
    const analyticsData = this.analytics.exportAnalyticsData()
    
    return {
      version: '1.0.0',
      exportedAt: new Date(),
      stateManagerData: JSON.parse(stateManagerData),
      analyticsData,
      integrationMetadata: {
        syncCount: this.getSyncCount(),
        lastSyncAt: this.getLastSyncTime(),
        dataConsistency: this.checkDataConsistency()
      }
    }
  }
  
  /**
   * 統合データをインポート
   */
  async importIntegratedData(data: IntegratedExportData): Promise<void> {
    try {
      // バージョンチェック
      if (data.version !== '1.0.0') {
        throw new Error('サポートされていないデータバージョンです')
      }
      
      // StateManagerデータをインポート
      if (data.stateManagerData) {
        await this.stateManager.importData(JSON.stringify(data.stateManagerData))
      }
      
      // アナリティクスデータをインポート
      if (data.analyticsData) {
        this.analytics.importAnalyticsData(data.analyticsData)
      }
      
      // 統合後の同期を実行
      this.syncData()
      
      console.log('✅ 統合データのインポートが完了しました')
    } catch (error) {
      console.error('❌ 統合データインポートエラー:', error)
      throw new Error(`統合データのインポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  
  /**
   * データ整合性をチェック
   */
  checkDataConsistency(): DataConsistencyReport {
    const stateStats = this.stateManager.getEnhancedStats()
    const analyticsData = this.analytics.exportAnalyticsData()
    
    const issues: string[] = []
    let score = 100
    
    // チャレンジ数の整合性チェック
    const stateChallenges = stateStats.totalChallenges
    const analyticsChallenges = analyticsData.actionHistory.filter(a => a.type === 'challenge_attempt').length
    
    if (Math.abs(stateChallenges - analyticsChallenges) > 5) {
      issues.push(`チャレンジ数に大きな差異があります (State: ${stateChallenges}, Analytics: ${analyticsChallenges})`)
      score -= 20
    }
    
    // ゲーム完了数の整合性チェック
    const stateGamesCompleted = stateStats.gamesCompleted
    const analyticsGamesCompleted = analyticsData.actionHistory.filter(a => a.type === 'game_complete').length
    
    if (Math.abs(stateGamesCompleted - analyticsGamesCompleted) > 2) {
      issues.push(`ゲーム完了数に差異があります (State: ${stateGamesCompleted}, Analytics: ${analyticsGamesCompleted})`)
      score -= 15
    }
    
    // プレイ時間の整合性チェック
    const statePlaytime = stateStats.totalPlaytime
    const analyticsPlaytime = analyticsData.sessionData?.currentActions?.reduce(
      (sum, action) => sum + (action.data?.sessionDuration || 0), 0
    ) || 0
    
    if (statePlaytime > 0 && analyticsPlaytime > 0) {
      const timeDifference = Math.abs(statePlaytime - analyticsPlaytime) / Math.max(statePlaytime, analyticsPlaytime)
      if (timeDifference > 0.2) { // 20%以上の差異
        issues.push(`プレイ時間に大きな差異があります (State: ${statePlaytime}ms, Analytics: ${analyticsPlaytime}ms)`)
        score -= 10
      }
    }
    
    return {
      score: Math.max(0, score),
      issues,
      checkedAt: new Date(),
      recommendation: score < 80 ? 'データの再同期を推奨します' : 'データは正常です'
    }
  }
  
  // === プライベートメソッド ===
  
  private performInitialSync(): void {
    try {
      this.syncData()
      console.log('📊 初期データ同期を完了しました')
    } catch (error) {
      console.warn('⚠️ 初期データ同期でエラーが発生しました:', error)
    }
  }
  
  private performFinalSync(): void {
    try {
      this.syncData()
      console.log('📊 最終データ同期を完了しました')
    } catch (error) {
      console.warn('⚠️ 最終データ同期でエラーが発生しました:', error)
    }
  }
  
  private getSyncCount(): number {
    // 実装では実際の同期回数を追跡
    return parseInt(localStorage.getItem('analytics_sync_count') || '0', 10)
  }
  
  private getLastSyncTime(): Date | null {
    const timestamp = localStorage.getItem('analytics_last_sync')
    return timestamp ? new Date(timestamp) : null
  }
}

// === 型定義 ===

/**
 * 統合分析レポート
 */
export interface CombinedAnalyticsReport {
  timestamp: Date
  stateManagerStats: any
  analyticsMetrics: any
  learningProgress: any
  strategyPatterns: any[]
  recommendations: string[]
  achievementProgress: any
}

/**
 * 統合エクスポートデータ
 */
export interface IntegratedExportData {
  version: string
  exportedAt: Date
  stateManagerData: any
  analyticsData: any
  integrationMetadata: {
    syncCount: number
    lastSyncAt: Date | null
    dataConsistency: DataConsistencyReport
  }
}

/**
 * データ整合性レポート
 */
export interface DataConsistencyReport {
  score: number // 0-100のスコア
  issues: string[]
  checkedAt: Date
  recommendation: string
}