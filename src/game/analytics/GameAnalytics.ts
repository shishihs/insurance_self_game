import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { GameStage } from '@/domain/types/card.types'
import type { ChallengeResult, PlayerStats } from '@/domain/types/game.types'
import { type Achievement, type EnhancedPlayerStats, GameStateManager } from '../state/GameStateManager'

/**
 * プレイヤーの行動データ
 */
export interface PlayerAction {
  id: string
  timestamp: Date
  type: 'card_selection' | 'challenge_attempt' | 'insurance_purchase' | 'stage_progression' | 'game_complete'
  gameStage: GameStage
  turn: number
  vitality: number
  data: Record<string, any>
}

/**
 * 戦略パターン分析結果
 */
export interface StrategyPattern {
  name: string
  description: string
  frequency: number
  successRate: number
  averageVitality: number
  stages: GameStage[]
}

/**
 * プレイ効率の指標
 */
export interface EfficiencyMetrics {
  decisionSpeed: number // 平均決定時間（秒）
  optimalPlayRate: number // 最適プレイ率（%）
  resourceEfficiency: number // リソース効率性
  adaptabilityScore: number // 適応性スコア
}

/**
 * 学習進度の追跡
 */
export interface LearningProgress {
  masteredConcepts: string[]
  strugglingAreas: string[]
  improvementRate: number
  skillLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  nextMilestone: string
}

/**
 * ゲーム分析エンジン
 * プレイヤーの行動を詳細に分析し、統計とインサイトを提供
 */
export class GameAnalytics {
  private readonly stateManager: GameStateManager
  private actionHistory: PlayerAction[] = []
  private sessionStartTime: Date = new Date()
  private currentSessionActions: PlayerAction[] = []
  
  constructor() {
    this.stateManager = GameStateManager.getInstance()
  }
  
  /**
   * プレイヤーのアクションを記録
   */
  recordAction(action: Omit<PlayerAction, 'id' | 'timestamp'>): void {
    const fullAction: PlayerAction = {
      id: this.generateActionId(),
      timestamp: new Date(),
      ...action
    }
    
    this.actionHistory.push(fullAction)
    this.currentSessionActions.push(fullAction)
    
    // アクション履歴が多すぎる場合は古いものを削除
    if (this.actionHistory.length > 10000) {
      this.actionHistory = this.actionHistory.slice(-5000)
    }
    
    // リアルタイム分析を実行
    this.analyzeRecentActions()
  }
  
  /**
   * カード選択を分析
   */
  analyzeCardSelection(selectedCards: Card[], availableCards: Card[], game: Game): void {
    this.recordAction({
      type: 'card_selection',
      gameStage: game.stage,
      turn: game.turn,
      vitality: game.vitality,
      data: {
        selectedCardIds: selectedCards.map(c => c.id),
        selectedPower: selectedCards.reduce((sum, c) => sum + c.power, 0),
        availableCardIds: availableCards.map(c => c.id),
        maxPossiblePower: availableCards.reduce((sum, c) => sum + c.power, 0),
        selectionTime: this.calculateSelectionTime(),
        insuranceCount: game.insuranceCards.length
      }
    })
  }
  
  /**
   * チャレンジ結果を分析
   */
  analyzeChallengeResult(result: ChallengeResult, game: Game): void {
    this.recordAction({
      type: 'challenge_attempt',
      gameStage: game.stage,
      turn: game.turn,
      vitality: game.vitality,
      data: {
        success: result.success,
        playerPower: result.playerPower,
        challengePower: result.challengePower,
        vitalityChange: result.vitalityChange,
        powerBreakdown: result.powerBreakdown,
        difficulty: this.calculateChallengeDifficulty(result)
      }
    })
    
    // チャレンジ成功率の更新
    this.updateChallengeSuccessRates(game.stage, result.success)
  }
  
  /**
   * 保険購入を分析
   */
  analyzeInsurancePurchase(insuranceCard: Card, game: Game): void {
    this.recordAction({
      type: 'insurance_purchase',
      gameStage: game.stage,
      turn: game.turn,
      vitality: game.vitality,
      data: {
        insuranceType: insuranceCard.insuranceType,
        cost: insuranceCard.cost,
        power: insuranceCard.power,
        durationType: insuranceCard.durationType,
        totalInsuranceCount: game.insuranceCards.length + 1,
        vitalityRatio: game.vitality / game.maxVitality
      }
    })
    
    // 保険使用パターンの更新
    this.updateInsuranceUsagePattern(insuranceCard)
  }
  
  /**
   * ゲーム完了を分析
   */
  analyzeGameCompletion(game: Game): void {
    const sessionDuration = Date.now() - this.sessionStartTime.getTime()
    
    this.recordAction({
      type: 'game_complete',
      gameStage: game.stage,
      turn: game.turn,
      vitality: game.vitality,
      data: {
        finalStats: game.stats,
        sessionDuration,
        totalActions: this.currentSessionActions.length,
        efficiency: this.calculateSessionEfficiency(),
        outcome: game.status
      }
    })
    
    // セッション統計を更新
    this.updateSessionStatistics(game, sessionDuration)
    
    // 学習進度を更新
    this.updateLearningProgress(game)
    
    // セッションをリセット
    this.resetSession()
  }
  
  /**
   * 戦略パターンを分析
   */
  getStrategyPatterns(): StrategyPattern[] {
    const patterns: StrategyPattern[] = []
    
    // 保険重視戦略
    const insuranceActions = this.actionHistory.filter(a => a.type === 'insurance_purchase')
    if (insuranceActions.length > 0) {
      patterns.push({
        name: '保険重視戦略',
        description: '早期から積極的に保険を購入する戦略',
        frequency: insuranceActions.length / this.actionHistory.length,
        successRate: this.calculateInsuranceStrategySuccessRate(),
        averageVitality: this.calculateAverageVitalityForStrategy('insurance_heavy'),
        stages: ['youth', 'middle', 'fulfillment']
      })
    }
    
    // 攻撃的戦略
    const aggressiveActions = this.actionHistory.filter(a => 
      a.type === 'challenge_attempt' && 
      a.data.playerPower > a.data.challengePower * 1.5
    )
    if (aggressiveActions.length > 0) {
      patterns.push({
        name: '攻撃的戦略',
        description: '高いパワーでチャレンジに挑む戦略',
        frequency: aggressiveActions.length / this.actionHistory.length,
        successRate: aggressiveActions.filter(a => a.data.success).length / aggressiveActions.length,
        averageVitality: aggressiveActions.reduce((sum, a) => sum + a.vitality, 0) / aggressiveActions.length,
        stages: ['youth', 'middle']
      })
    }
    
    // 保守的戦略
    const conservativeActions = this.actionHistory.filter(a => 
      a.type === 'challenge_attempt' && 
      a.data.playerPower < a.data.challengePower * 1.2
    )
    if (conservativeActions.length > 0) {
      patterns.push({
        name: '保守的戦略',
        description: 'リスクを避けて慎重にプレイする戦略',
        frequency: conservativeActions.length / this.actionHistory.length,
        successRate: conservativeActions.filter(a => a.data.success).length / conservativeActions.length,
        averageVitality: conservativeActions.reduce((sum, a) => sum + a.vitality, 0) / conservativeActions.length,
        stages: ['middle', 'fulfillment']
      })
    }
    
    return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 5)
  }
  
  /**
   * プレイ効率を計算
   */
  getEfficiencyMetrics(): EfficiencyMetrics {
    const challengeActions = this.actionHistory.filter(a => a.type === 'challenge_attempt')
    const cardSelectionActions = this.actionHistory.filter(a => a.type === 'card_selection')
    
    // 決定速度の計算
    const averageDecisionTime = cardSelectionActions.reduce(
      (sum, action) => sum + (action.data.selectionTime || 5), 0
    ) / Math.max(cardSelectionActions.length, 1)
    
    // 最適プレイ率の計算
    const optimalPlays = challengeActions.filter(a => 
      a.data.success && a.data.playerPower >= a.data.challengePower * 1.1
    ).length
    const optimalPlayRate = (optimalPlays / Math.max(challengeActions.length, 1)) * 100
    
    // リソース効率性の計算
    const resourceEfficiency = this.calculateResourceEfficiency()
    
    // 適応性スコアの計算
    const adaptabilityScore = this.calculateAdaptabilityScore()
    
    return {
      decisionSpeed: averageDecisionTime,
      optimalPlayRate,
      resourceEfficiency,
      adaptabilityScore
    }
  }
  
  /**
   * 学習進度を取得
   */
  getLearningProgress(): LearningProgress {
    const stats = this.stateManager.getEnhancedStats()
    
    // 習得した概念の判定
    const masteredConcepts: string[] = []
    if (stats.successfulChallenges > 10) masteredConcepts.push('基本的なチャレンジ')
    if (stats.insuranceUsagePatterns.length > 3) masteredConcepts.push('保険活用')
    if (stats.gamesCompleted > 5) masteredConcepts.push('ゲーム進行')
    
    // 苦手分野の特定
    const strugglingAreas: string[] = []
    const challengeSuccessRate = stats.successfulChallenges / Math.max(stats.totalChallenges, 1)
    if (challengeSuccessRate < 0.6) strugglingAreas.push('チャレンジ成功率')
    if (stats.averageTurnsPerGame > 20) strugglingAreas.push('効率的なプレイ')
    
    // 改善率の計算
    const improvementRate = this.calculateImprovementRate()
    
    // スキルレベルの判定
    let skillLevel: LearningProgress['skillLevel'] = 'beginner'
    if (stats.gamesCompleted > 10 && challengeSuccessRate > 0.7) skillLevel = 'intermediate'
    if (stats.gamesCompleted > 25 && challengeSuccessRate > 0.8) skillLevel = 'advanced'
    if (stats.gamesCompleted > 50 && challengeSuccessRate > 0.9) skillLevel = 'expert'
    
    // 次のマイルストーン
    let nextMilestone = '初回ゲームクリア'
    if (stats.gamesCompleted >= 1) nextMilestone = '10回クリア達成'
    if (stats.gamesCompleted >= 10) nextMilestone = '成功率80%達成'
    if (challengeSuccessRate >= 0.8) nextMilestone = 'エキスパートレベル到達'
    
    return {
      masteredConcepts,
      strugglingAreas,
      improvementRate,
      skillLevel,
      nextMilestone
    }
  }
  
  /**
   * 実績の進行状況をチェック
   */
  checkAchievementProgress(): { unlocked: Achievement[]; progress: Record<string, number> } {
    const unlocked: Achievement[] = []
    const progress: Record<string, number> = {}
    
    const stats = this.stateManager.getEnhancedStats()
    
    // チャレンジ系実績
    progress['challenge_master'] = Math.min(stats.successfulChallenges / 100, 1) * 100
    if (stats.successfulChallenges >= 100 && !stats.achievements.some(a => a.id === 'challenge_master')) {
      unlocked.push({
        id: 'challenge_master',
        name: 'チャレンジマスター',
        description: '100回のチャレンジに成功しました',
        unlockedAt: new Date(),
        category: 'gameplay'
      })
    }
    
    // 保険系実績
    const insuranceTypes = new Set(stats.insuranceUsagePatterns.map(p => p.insuranceType))
    progress['insurance_expert'] = Math.min(insuranceTypes.size / 5, 1) * 100
    if (insuranceTypes.size >= 5 && !stats.achievements.some(a => a.id === 'insurance_expert')) {
      unlocked.push({
        id: 'insurance_expert',
        name: '保険エキスパート',
        description: '5種類以上の保険を活用しました',
        unlockedAt: new Date(),
        category: 'strategy'
      })
    }
    
    // 効率系実績
    const efficiency = this.getEfficiencyMetrics()
    progress['speed_runner'] = Math.min(efficiency.decisionSpeed <= 3 ? 1 : 0, 1) * 100
    if (efficiency.decisionSpeed <= 3 && !stats.achievements.some(a => a.id === 'speed_runner')) {
      unlocked.push({
        id: 'speed_runner',
        name: 'スピードランナー',
        description: '平均決定時間3秒以下を達成しました',
        unlockedAt: new Date(),
        category: 'gameplay'
      })
    }
    
    return { unlocked, progress }
  }
  
  /**
   * 個人化されたアドバイスを生成
   */
  generatePersonalizedAdvice(): string[] {
    const advice: string[] = []
    const stats = this.stateManager.getEnhancedStats()
    const efficiency = this.getEfficiencyMetrics()
    const patterns = this.getStrategyPatterns()
    
    // 成功率が低い場合
    const successRate = stats.successfulChallenges / Math.max(stats.totalChallenges, 1)
    if (successRate < 0.6) {
      advice.push('💡 チャレンジの成功率を上げるため、より強力なカードの組み合わせを試してみましょう')
    }
    
    // 保険の活用度が低い場合
    if (stats.insuranceUsagePatterns.length < 3) {
      advice.push('🛡️ 保険カードを積極的に活用することで、より安定したプレイが可能になります')
    }
    
    // 決定が遅い場合
    if (efficiency.decisionSpeed > 10) {
      advice.push('⚡ 決定時間を短縮することで、より集中してプレイできるようになります')
    }
    
    // 戦略パターンに基づくアドバイス
    const dominantPattern = patterns[0]
    if (dominantPattern) {
      if (dominantPattern.successRate < 0.7) {
        advice.push(`📊 ${dominantPattern.name}の成功率が低めです。他の戦略も試してみてください`)
      }
    }
    
    // プレイ回数に応じたアドバイス
    if (stats.gamesCompleted < 5) {
      advice.push('🌟 まずは様々な戦略を試して、自分に合ったプレイスタイルを見つけましょう')
    } else if (stats.gamesCompleted > 20) {
      advice.push('🏆 経験豊富なプレイヤーですね！より高難度のチャレンジに挑戦してみてください')
    }
    
    return advice.slice(0, 3) // 最大3つのアドバイス
  }
  
  /**
   * 統計データをリセット
   */
  resetAnalytics(): void {
    this.actionHistory = []
    this.resetSession()
  }
  
  /**
   * アナリティクスデータをエクスポート
   */
  exportAnalyticsData(): {
    version: string
    exportedAt: Date
    actionHistory: PlayerAction[]
    sessionData: {
      startTime: Date
      currentActions: PlayerAction[]
    }
  } {
    return {
      version: '1.0.0',
      exportedAt: new Date(),
      actionHistory: this.actionHistory,
      sessionData: {
        startTime: this.sessionStartTime,
        currentActions: this.currentSessionActions
      }
    }
  }
  
  /**
   * アナリティクスデータをインポート
   */
  importAnalyticsData(data: {
    version: string
    actionHistory: PlayerAction[]
    sessionData?: {
      startTime: Date
      currentActions: PlayerAction[]
    }
  }): void {
    // バージョンチェック
    if (data.version !== '1.0.0') {
      console.warn('⚠️ アナリティクスデータのバージョンが異なります')
    }
    
    // データの妥当性チェック
    if (Array.isArray(data.actionHistory)) {
      this.actionHistory = data.actionHistory.map(action => ({
        ...action,
        timestamp: new Date(action.timestamp) // Date型に変換
      }))
    }
    
    if (data.sessionData) {
      this.sessionStartTime = new Date(data.sessionData.startTime)
      if (Array.isArray(data.sessionData.currentActions)) {
        this.currentSessionActions = data.sessionData.currentActions.map(action => ({
          ...action,
          timestamp: new Date(action.timestamp)
        }))
      }
    }
    
    console.log('✅ アナリティクスデータをインポートしました')
  }
  
  /**
   * GameStateManagerとの統合のためのフック
   */
  onGameStateChange(gameState: any, changeType: 'save' | 'load' | 'reset'): void {
    this.recordAction({
      type: 'system' as any,
      gameStage: gameState.stage || 'youth',
      turn: gameState.turn || 0,
      vitality: gameState.vitality || 100,
      data: {
        changeType,
        gameId: gameState.id,
        timestamp: Date.now()
      }
    })
  }
  
  /**
   * 統計データとGameStateManagerとの同期
   */
  syncWithStateManager(stateManager: any): void {
    const stats = stateManager.getEnhancedStats()
    
    // アナリティクスデータから統計を更新
    const analyticsStats = this.generateStatsFromAnalytics()
    
    // 統計データをマージ
    const mergedStats = {
      ...stats,
      ...analyticsStats,
      // 重要な数値は最大値を採用
      totalChallenges: Math.max(stats.totalChallenges, analyticsStats.totalChallenges),
      successfulChallenges: Math.max(stats.successfulChallenges, analyticsStats.successfulChallenges),
      cardsAcquired: Math.max(stats.cardsAcquired, analyticsStats.cardsAcquired),
      // プレイ時間は追加
      totalPlaytime: (stats.totalPlaytime || 0) + this.calculateTotalSessionTime(),
      // 最高記録は最大値
      highestVitality: Math.max(stats.highestVitality, analyticsStats.highestVitality),
      bestScore: Math.max(stats.bestScore, this.calculateBestSessionScore())
    }
    
    stateManager.updateStatistics(mergedStats)
    
    // 同期完了をローカルストレージに記録
    localStorage.setItem('analytics_last_sync', new Date().toISOString())
    const syncCount = parseInt(localStorage.getItem('analytics_sync_count') || '0', 10)
    localStorage.setItem('analytics_sync_count', (syncCount + 1).toString())
  }
  
  // === プライベートメソッド ===
  
  private generateActionId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private resetSession(): void {
    this.sessionStartTime = new Date()
    this.currentSessionActions = []
  }
  
  private calculateSelectionTime(): number {
    // 実際の実装では、カード選択開始から決定までの時間を測定
    // ここでは仮の値を返す
    return Math.random() * 10 + 2
  }
  
  private calculateChallengeDifficulty(result: ChallengeResult): number {
    // 難易度 = チャレンジパワー / プレイヤーパワー
    return result.challengePower / Math.max(result.playerPower, 1)
  }
  
  private analyzeRecentActions(): void {
    // 最近のアクションを分析してリアルタイムフィードバックを生成
    const recentActions = this.actionHistory.slice(-10)
    
    // 連続失敗の検出
    const recentChallenges = recentActions.filter(a => a.type === 'challenge_attempt')
    const recentFailures = recentChallenges.filter(a => !a.data.success)
    
    if (recentFailures.length >= 3) {
      // 失敗が連続している場合の分析とアドバイス
      console.log('連続失敗を検出。戦略の見直しを提案')
    }
  }
  
  private updateChallengeSuccessRates(stage: GameStage, success: boolean): void {
    const stats = this.stateManager.getEnhancedStats()
    const current = stats.challengeSuccessRates[stage] || 0
    const total = this.actionHistory.filter(a => 
      a.type === 'challenge_attempt' && a.gameStage === stage
    ).length
    
    // 成功率を更新
    const successCount = this.actionHistory.filter(a => 
      a.type === 'challenge_attempt' && a.gameStage === stage && a.data.success
    ).length
    
    stats.challengeSuccessRates[stage] = successCount / total
    this.stateManager.updateStatistics({ challengeSuccessRates: stats.challengeSuccessRates })
  }
  
  private updateInsuranceUsagePattern(insuranceCard: Card): void {
    const stats = this.stateManager.getEnhancedStats()
    const insuranceType = insuranceCard.insuranceType || 'unknown'
    
    let pattern = stats.insuranceUsagePatterns.find(p => p.insuranceType === insuranceType)
    if (!pattern) {
      pattern = {
        insuranceType,
        usageCount: 0,
        successRate: 0,
        averageBenefit: 0
      }
      stats.insuranceUsagePatterns.push(pattern)
    }
    
    pattern.usageCount++
    // 成功率と平均利益は後続のチャレンジ結果で更新
    
    this.stateManager.updateStatistics({ insuranceUsagePatterns: stats.insuranceUsagePatterns })
  }
  
  private calculateSessionEfficiency(): number {
    const sessionActions = this.currentSessionActions
    const challengeActions = sessionActions.filter(a => a.type === 'challenge_attempt')
    
    if (challengeActions.length === 0) return 0
    
    const successfulActions = challengeActions.filter(a => a.data.success)
    return successfulActions.length / challengeActions.length
  }
  
  private updateSessionStatistics(game: Game, sessionDuration: number): void {
    const stats = this.stateManager.getEnhancedStats()
    
    // セッション統計を更新
    stats.sessionsPlayed++
    stats.totalPlaytime += sessionDuration
    
    // ベストスコアを更新
    const currentScore = game.stats.score || 0
    if (currentScore > stats.bestScore) {
      stats.bestScore = currentScore
    }
    
    this.stateManager.updateStatistics(stats)
  }
  
  private updateLearningProgress(game: Game): void {
    // 学習進度の更新ロジック
    // 実装は今後拡張予定
  }
  
  private calculateInsuranceStrategySuccessRate(): number {
    const insuranceGames = this.actionHistory.filter(a => 
      a.type === 'game_complete' && 
      this.actionHistory.some(ia => 
        ia.type === 'insurance_purchase' && 
        ia.timestamp < a.timestamp
      )
    )
    
    const successfulInsuranceGames = insuranceGames.filter(a => 
      a.data.outcome === 'victory' || a.data.finalStats.successfulChallenges > 0
    )
    
    return successfulInsuranceGames.length / Math.max(insuranceGames.length, 1)
  }
  
  private calculateAverageVitalityForStrategy(strategy: string): number {
    // 戦略別の平均活力計算
    // 実装は戦略によって異なる
    return 0
  }
  
  private calculateResourceEfficiency(): number {
    const cardSelections = this.actionHistory.filter(a => a.type === 'card_selection')
    if (cardSelections.length === 0) return 0
    
    const totalEfficiency = cardSelections.reduce((sum, action) => {
      const selectedPower = action.data.selectedPower || 0
      const maxPossiblePower = action.data.maxPossiblePower || 1
      return sum + (selectedPower / maxPossiblePower)
    }, 0)
    
    return (totalEfficiency / cardSelections.length) * 100
  }
  
  private calculateAdaptabilityScore(): number {
    // 異なるステージでの戦略変更を測定
    const stageTransitions = this.actionHistory.filter(a => a.type === 'stage_progression')
    
    // 簡易的な適応性スコア
    return Math.min(stageTransitions.length * 25, 100)
  }
  
  private calculateImprovementRate(): number {
    const completedGames = this.actionHistory.filter(a => a.type === 'game_complete')
    if (completedGames.length < 2) return 0
    
    // 最初の5ゲームと最新の5ゲームを比較
    const earlyGames = completedGames.slice(0, 5)
    const recentGames = completedGames.slice(-5)
    
    const earlyAvgScore = earlyGames.reduce((sum, g) => sum + (g.data.finalStats.score || 0), 0) / earlyGames.length
    const recentAvgScore = recentGames.reduce((sum, g) => sum + (g.data.finalStats.score || 0), 0) / recentGames.length
    
    return ((recentAvgScore - earlyAvgScore) / Math.max(earlyAvgScore, 1)) * 100
  }
  
  /**
   * アナリティクスデータから統計情報を生成
   */
  private generateStatsFromAnalytics(): Partial<any> {
    const challengeActions = this.actionHistory.filter(a => a.type === 'challenge_attempt')
    const cardSelectionActions = this.actionHistory.filter(a => a.type === 'card_selection')
    const insuranceActions = this.actionHistory.filter(a => a.type === 'insurance_purchase')
    const gameCompleteActions = this.actionHistory.filter(a => a.type === 'game_complete')
    
    return {
      totalChallenges: challengeActions.length,
      successfulChallenges: challengeActions.filter(a => a.data.success).length,
      failedChallenges: challengeActions.filter(a => !a.data.success).length,
      cardsAcquired: cardSelectionActions.length,
      turnsPlayed: gameCompleteActions.reduce((sum, action) => sum + (action.turn || 0), 0),
      highestVitality: Math.max(...this.actionHistory.map(a => a.vitality), 0),
      gamesCompleted: gameCompleteActions.length,
      sessionsPlayed: new Set(gameCompleteActions.map(a => a.data.gameId)).size,
      insuranceUsagePatterns: this.generateInsurancePatterns(insuranceActions)
    }
  }
  
  /**
   * 保険使用パターンを生成
   */
  private generateInsurancePatterns(insuranceActions: PlayerAction[]): any[] {
    const patterns = new Map()
    
    insuranceActions.forEach(action => {
      const insuranceType = action.data.insuranceType || 'unknown'
      
      if (!patterns.has(insuranceType)) {
        patterns.set(insuranceType, {
          insuranceType,
          usageCount: 0,
          successRate: 0,
          averageBenefit: 0
        })
      }
      
      const pattern = patterns.get(insuranceType)
      pattern.usageCount++
      
      // 成功率と平均利益の計算（簡易版）
      if (action.data.power) {
        pattern.averageBenefit = (pattern.averageBenefit + action.data.power) / pattern.usageCount
      }
    })
    
    return Array.from(patterns.values())
  }
  
  /**
   * セッション全体の時間を計算
   */
  private calculateTotalSessionTime(): number {
    return this.currentSessionActions.reduce((total, action) => {
      return total + (action.data?.sessionDuration || 0)
    }, 0)
  }
  
  /**
   * セッション内のベストスコアを計算
   */
  private calculateBestSessionScore(): number {
    const gameCompleteActions = this.currentSessionActions.filter(a => a.type === 'game_complete')
    return gameCompleteActions.reduce((best, action) => {
      const score = action.data?.finalStats?.score || 0
      return Math.max(best, score)
    }, 0)
  }
}