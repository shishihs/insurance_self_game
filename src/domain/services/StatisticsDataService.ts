import type { Game } from '../entities/Game'
import type { Card } from '../entities/Card'
import type { GamePhase, GameStatus, PlayerStats } from '../types/game.types'
import type { GameStage } from '../types/card.types'

/**
 * 統計データ項目の型定義
 */
export interface StatisticsData {
  // 基本統計
  totalGames: number
  completedGames: number
  victoryGames: number
  gameOverCount: number
  totalPlayTime: number
  averageGameDuration: number
  
  // パフォーマンス統計
  totalChallenges: number
  successfulChallenges: number
  challengeSuccessRate: number
  averageVitality: number
  highestVitality: number
  lowestVitality: number
  
  // 進行統計
  averageTurnsPerGame: number
  stageReachCounts: Record<GameStage, number>
  stageSuccessRates: Record<GameStage, number>
  
  // カード統計
  cardsAcquiredTotal: number
  averageCardsPerGame: number
  cardTypeUsage: Record<string, number>
  favoriteCardTypes: string[]
  
  // 保険統計
  totalInsurancePurchases: number
  insuranceTypeUsage: Record<string, number>
  averageInsuranceBurden: number
  insuranceEffectiveness: number
  
  // 時系列データ
  gameHistoryByDate: Array<{
    date: string
    gamesPlayed: number
    averageScore: number
    totalPlayTime: number
  }>
  
  // 戦略パターン
  decisionPatterns: Array<{
    situation: string
    choice: string
    frequency: number
    successRate: number
  }>
  
  // トレンド分析
  recentTrends: {
    performanceImprovement: number // パーセンテージ
    playTimeIncrease: number
    difficultyPreference: 'easy' | 'normal' | 'hard'
    mostActiveTimeSlots: string[]
  }
}

/**
 * リアルタイム統計データ
 */
export interface RealtimeStatistics {
  currentSession: {
    startTime: Date
    gamesPlayed: number
    currentStreak: number
    sessionScore: number
  }
  
  live: {
    vitalityOverTime: Array<{ turn: number; vitality: number }>
    challengeDifficulty: Array<{ turn: number; difficulty: number }>
    decisionTimes: Array<{ turn: number; decisionTime: number }>
    cardUsagePatterns: Array<{ cardType: string; turn: number; effectiveness: number }>
  }
}

/**
 * フィルター設定
 */
export interface StatisticsFilter {
  dateRange?: {
    start: Date
    end: Date
  }
  gameStatus?: GameStatus[]
  stages?: GameStage[]
  difficultyLevel?: string[]
  minPlayTime?: number
  maxPlayTime?: number
}

/**
 * ソート設定
 */
export interface StatisticsSort {
  field: keyof StatisticsData | string
  direction: 'asc' | 'desc'
}

/**
 * 統計データ管理サービス
 * 
 * ゲームプレイ統計の収集、分析、可視化用データの提供を行う
 */
export class StatisticsDataService {
  private static instance: StatisticsDataService
  private readonly gameHistory: Game[] = []
  private currentGameData: RealtimeStatistics | null = null
  private readonly listeners: Set<(data: StatisticsData) => void> = new Set()
  
  private constructor() {}
  
  static getInstance(): StatisticsDataService {
    if (!StatisticsDataService.instance) {
      StatisticsDataService.instance = new StatisticsDataService()
    }
    return StatisticsDataService.instance
  }
  
  /**
   * ゲーム開始時のデータ記録
   */
  startGameTracking(game: Game): void {
    this.currentGameData = {
      currentSession: {
        startTime: new Date(),
        gamesPlayed: 0,
        currentStreak: 0,
        sessionScore: 0
      },
      live: {
        vitalityOverTime: [{ turn: 0, vitality: game.vitality }],
        challengeDifficulty: [],
        decisionTimes: [],
        cardUsagePatterns: []
      }
    }
  }
  
  /**
   * ターン終了時のリアルタイムデータ更新
   */
  updateTurnData(game: Game, decisionTime?: number): void {
    if (!this.currentGameData) return
    
    const { live } = this.currentGameData
    
    // 活力の変化を記録
    live.vitalityOverTime.push({
      turn: game.turn,
      vitality: game.vitality
    })
    
    // 決定時間を記録
    if (decisionTime !== undefined) {
      live.decisionTimes.push({
        turn: game.turn,
        decisionTime
      })
    }
    
    // チャレンジ難易度を記録
    if (game.currentChallenge) {
      live.challengeDifficulty.push({
        turn: game.turn,
        difficulty: game.currentChallenge.power
      })
    }
    
    // カード使用パターンを記録
    const selectedCards = game.selectedCards
    selectedCards.forEach(card => {
      const effectiveness = this.calculateCardEffectiveness(card, game)
      live.cardUsagePatterns.push({
        cardType: card.type,
        turn: game.turn,
        effectiveness
      })
    })
  }
  
  /**
   * ゲーム終了時のデータ保存
   */
  finishGameTracking(game: Game): void {
    if (this.currentGameData) {
      this.currentGameData.currentSession.gamesPlayed++
      
      // 勝利の場合はストリークを更新
      if (game.status === 'victory') {
        this.currentGameData.currentSession.currentStreak++
        this.currentGameData.currentSession.sessionScore += this.calculateGameScore(game)
      } else {
        this.currentGameData.currentSession.currentStreak = 0
      }
    }
    
    // ゲーム履歴に追加（スナップショットではなく実際のゲームインスタンスを保存）
    this.gameHistory.push(game)
    
    // リスナーに通知
    this.notifyListeners()
  }
  
  /**
   * 統計データを生成
   */
  generateStatistics(filter?: StatisticsFilter, sort?: StatisticsSort): StatisticsData {
    const filteredGames = this.applyFilter(this.gameHistory, filter)
    
    const stats: StatisticsData = {
      // 基本統計
      totalGames: filteredGames.length,
      completedGames: filteredGames.filter(g => g.isCompleted()).length,
      victoryGames: filteredGames.filter(g => g.status === 'victory').length,
      gameOverCount: filteredGames.filter(g => g.status === 'game_over').length,
      totalPlayTime: this.calculateTotalPlayTime(filteredGames),
      averageGameDuration: this.calculateAverageGameDuration(filteredGames),
      
      // パフォーマンス統計
      totalChallenges: filteredGames.reduce((sum, g) => sum + g.stats.totalChallenges, 0),
      successfulChallenges: filteredGames.reduce((sum, g) => sum + g.stats.successfulChallenges, 0),
      challengeSuccessRate: this.calculateOverallSuccessRate(filteredGames),
      averageVitality: this.calculateAverageVitality(filteredGames),
      highestVitality: Math.max(...filteredGames.map(g => g.stats.highestVitality)),
      lowestVitality: Math.min(...filteredGames.map(g => g.vitality)),
      
      // 進行統計
      averageTurnsPerGame: filteredGames.reduce((sum, g) => sum + g.turn, 0) / Math.max(filteredGames.length, 1),
      stageReachCounts: this.calculateStageReachCounts(filteredGames),
      stageSuccessRates: this.calculateStageSuccessRates(filteredGames),
      
      // カード統計
      cardsAcquiredTotal: filteredGames.reduce((sum, g) => sum + g.stats.cardsAcquired, 0),
      averageCardsPerGame: this.calculateAverageCardsPerGame(filteredGames),
      cardTypeUsage: this.calculateCardTypeUsage(filteredGames),
      favoriteCardTypes: this.calculateFavoriteCardTypes(filteredGames),
      
      // 保険統計
      totalInsurancePurchases: this.calculateTotalInsurancePurchases(filteredGames),
      insuranceTypeUsage: this.calculateInsuranceTypeUsage(filteredGames),
      averageInsuranceBurden: this.calculateAverageInsuranceBurden(filteredGames),
      insuranceEffectiveness: this.calculateInsuranceEffectiveness(filteredGames),
      
      // 時系列データ
      gameHistoryByDate: this.generateGameHistoryByDate(filteredGames),
      
      // 戦略パターン
      decisionPatterns: this.analyzeDecisionPatterns(filteredGames),
      
      // トレンド分析
      recentTrends: this.analyzeRecentTrends(filteredGames)
    }
    
    return this.applySorting(stats, sort)
  }
  
  /**
   * リアルタイム統計データを取得
   */
  getRealtimeStatistics(): RealtimeStatistics | null {
    return this.currentGameData
  }
  
  /**
   * 統計更新の購読
   */
  subscribe(listener: (data: StatisticsData) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  
  /**
   * データをエクスポート
   */
  exportData(format: 'json' | 'csv' = 'json'): string {
    const stats = this.generateStatistics()
    
    if (format === 'json') {
      return JSON.stringify(stats, null, 2)
    } 
      return this.convertToCSV(stats)
    
  }
  
  /**
   * プライベートメソッド群
   */
  
  private applyFilter(games: Game[], filter?: StatisticsFilter): Game[] {
    if (!filter) return games
    
    return games.filter(game => {
      // 日付範囲フィルター
      if (filter.dateRange && game.startedAt) {
        const gameDate = game.startedAt
        if (gameDate < filter.dateRange.start || gameDate > filter.dateRange.end) {
          return false
        }
      }
      
      // ステータスフィルター
      if (filter.gameStatus && !filter.gameStatus.includes(game.status)) {
        return false
      }
      
      // ステージフィルター
      if (filter.stages && !filter.stages.includes(game.stage)) {
        return false
      }
      
      // プレイ時間フィルター
      const playTime = this.calculateGamePlayTime(game)
      if (filter.minPlayTime && playTime < filter.minPlayTime) {
        return false
      }
      if (filter.maxPlayTime && playTime > filter.maxPlayTime) {
        return false
      }
      
      return true
    })
  }
  
  private applySorting(stats: StatisticsData, sort?: StatisticsSort): StatisticsData {
    if (!sort) return stats
    
    // ソート可能な配列データに対してソートを適用
    if (sort.field === 'gameHistoryByDate') {
      stats.gameHistoryByDate.sort((a, b) => {
        const comparison = a.date.localeCompare(b.date)
        return sort.direction === 'asc' ? comparison : -comparison
      })
    }
    
    if (sort.field === 'decisionPatterns') {
      stats.decisionPatterns.sort((a, b) => {
        const comparison = a.frequency - b.frequency
        return sort.direction === 'asc' ? comparison : -comparison
      })
    }
    
    return stats
  }
  
  private calculateTotalPlayTime(games: Game[]): number {
    return games.reduce((total, game) => {
      return total + this.calculateGamePlayTime(game)
    }, 0)
  }
  
  private calculateGamePlayTime(game: Game): number {
    if (!game.startedAt) return 0
    const endTime = game.completedAt || new Date()
    return endTime.getTime() - game.startedAt.getTime()
  }
  
  private calculateAverageGameDuration(games: Game[]): number {
    if (games.length === 0) return 0
    return this.calculateTotalPlayTime(games) / games.length
  }
  
  private calculateOverallSuccessRate(games: Game[]): number {
    const totalChallenges = games.reduce((sum, g) => sum + g.stats.totalChallenges, 0)
    const successfulChallenges = games.reduce((sum, g) => sum + g.stats.successfulChallenges, 0)
    return totalChallenges > 0 ? (successfulChallenges / totalChallenges) * 100 : 0
  }
  
  private calculateAverageVitality(games: Game[]): number {
    if (games.length === 0) return 0
    return games.reduce((sum, g) => sum + g.vitality, 0) / games.length
  }
  
  private calculateStageReachCounts(games: Game[]): Record<GameStage, number> {
    const counts: Record<GameStage, number> = {
      youth: 0,
      middle: 0,
      fulfillment: 0
    }
    
    games.forEach(game => {
      counts[game.stage]++
    })
    
    return counts
  }
  
  private calculateStageSuccessRates(games: Game[]): Record<GameStage, number> {
    const rates: Record<GameStage, number> = {
      youth: 0,
      middle: 0,
      fulfillment: 0
    }
    
    const stageCounts = this.calculateStageReachCounts(games)
    
    Object.keys(rates).forEach(stage => {
      const stageGames = games.filter(g => g.stage === stage)
      const victories = stageGames.filter(g => g.status === 'victory')
      rates[stage as GameStage] = stageGames.length > 0 ? victories.length / stageGames.length : 0
    })
    
    return rates
  }
  
  private calculateAverageCardsPerGame(games: Game[]): number {
    if (games.length === 0) return 0
    return games.reduce((sum, g) => sum + g.stats.cardsAcquired, 0) / games.length
  }
  
  private calculateCardTypeUsage(games: Game[]): Record<string, number> {
    const usage: Record<string, number> = {}
    
    games.forEach(game => {
      const allCards = [...game.playerDeck.cards, ...game.hand, ...game.discardPile]
      allCards.forEach(card => {
        usage[card.type] = (usage[card.type] || 0) + 1
      })
    })
    
    return usage
  }
  
  private calculateFavoriteCardTypes(games: Game[]): string[] {
    const usage = this.calculateCardTypeUsage(games)
    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([type]) => type)
  }
  
  private calculateTotalInsurancePurchases(games: Game[]): number {
    return games.reduce((total, game) => {
      return total + game.insuranceCards.length
    }, 0)
  }
  
  private calculateInsuranceTypeUsage(games: Game[]): Record<string, number> {
    const usage: Record<string, number> = {}
    
    games.forEach(game => {
      game.insuranceCards.forEach(card => {
        const insuranceType = card.name || 'unknown'
        usage[insuranceType] = (usage[insuranceType] || 0) + 1
      })
    })
    
    return usage
  }
  
  private calculateAverageInsuranceBurden(games: Game[]): number {
    if (games.length === 0) return 0
    return games.reduce((sum, g) => sum + g.insuranceBurden, 0) / games.length
  }
  
  private calculateInsuranceEffectiveness(games: Game[]): number {
    // 保険を持っていたゲームでの成功率を計算
    const gamesWithInsurance = games.filter(g => g.insuranceCards.length > 0)
    const gamesWithoutInsurance = games.filter(g => g.insuranceCards.length === 0)
    
    if (gamesWithInsurance.length === 0) return 0
    
    const withInsuranceSuccessRate = gamesWithInsurance.filter(g => g.status === 'victory').length / gamesWithInsurance.length
    const withoutInsuranceSuccessRate = gamesWithoutInsurance.length > 0
      ? gamesWithoutInsurance.filter(g => g.status === 'victory').length / gamesWithoutInsurance.length
      : 0
    
    return (withInsuranceSuccessRate - withoutInsuranceSuccessRate) * 100
  }
  
  private generateGameHistoryByDate(games: Game[]): Array<{date: string; gamesPlayed: number; averageScore: number; totalPlayTime: number}> {
    const dateMap = new Map<string, {games: Game[], totalScore: number, totalPlayTime: number}>()
    
    games.forEach(game => {
      if (!game.startedAt) return
      
      const dateKey = game.startedAt.toISOString().split('T')[0]
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, { games: [], totalScore: 0, totalPlayTime: 0 })
      }
      
      const entry = dateMap.get(dateKey)!
      entry.games.push(game)
      entry.totalScore += this.calculateGameScore(game)
      entry.totalPlayTime += this.calculateGamePlayTime(game)
    })
    
    return Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      gamesPlayed: data.games.length,
      averageScore: data.totalScore / data.games.length,
      totalPlayTime: data.totalPlayTime
    })).sort((a, b) => a.date.localeCompare(b.date))
  }
  
  private analyzeDecisionPatterns(games: Game[]): Array<{situation: string; choice: string; frequency: number; successRate: number}> {
    // 簡易的な決定パターン分析
    const patterns: Record<string, {count: number, successes: number}> = {}
    
    games.forEach(game => {
      const situation = `${game.stage}_${game.vitality > 50 ? 'high' : 'low'}_vitality`
      const hasInsurance = game.insuranceCards.length > 0
      const choice = hasInsurance ? 'with_insurance' : 'no_insurance'
      const success = game.status === 'victory'
      
      const key = `${situation}_${choice}`
      if (!patterns[key]) {
        patterns[key] = { count: 0, successes: 0 }
      }
      
      patterns[key].count++
      if (success) patterns[key].successes++
    })
    
    return Object.entries(patterns).map(([key, data]) => {
      const [situation, choice] = key.split('_with_insurance').length > 1 
        ? [key.replace('_with_insurance', ''), 'with_insurance']
        : [key.replace('_no_insurance', ''), 'no_insurance']
      
      return {
        situation,
        choice,
        frequency: data.count,
        successRate: data.count > 0 ? data.successes / data.count : 0
      }
    })
  }
  
  private analyzeRecentTrends(games: Game[]): StatisticsData['recentTrends'] {
    const recentGames = games.slice(-10) // 直近10ゲーム
    const olderGames = games.slice(-20, -10) // その前の10ゲーム
    
    // パフォーマンス改善率
    const recentSuccessRate = recentGames.filter(g => g.status === 'victory').length / Math.max(recentGames.length, 1)
    const olderSuccessRate = olderGames.filter(g => g.status === 'victory').length / Math.max(olderGames.length, 1)
    const performanceImprovement = ((recentSuccessRate - olderSuccessRate) / Math.max(olderSuccessRate, 0.01)) * 100
    
    // プレイ時間の変化
    const recentAvgPlayTime = this.calculateAverageGameDuration(recentGames)
    const olderAvgPlayTime = this.calculateAverageGameDuration(olderGames)
    const playTimeIncrease = recentAvgPlayTime - olderAvgPlayTime
    
    return {
      performanceImprovement: Math.round(performanceImprovement * 10) / 10,
      playTimeIncrease: Math.round(playTimeIncrease / 1000), // 秒単位
      difficultyPreference: 'normal', // 簡易実装
      mostActiveTimeSlots: ['20:00-22:00'] // 簡易実装
    }
  }
  
  private calculateGameScore(game: Game): number {
    let score = 0
    
    // 基本スコア（活力ベース）
    score += game.vitality * 10
    
    // ボーナススコア
    if (game.status === 'victory') score += 1000
    score += game.stats.successfulChallenges * 50
    score += game.stats.cardsAcquired * 25
    
    // ステージボーナス
    const stageMultiplier = { youth: 1, middle: 1.5, fulfillment: 2 }
    score *= stageMultiplier[game.stage]
    
    return Math.round(score)
  }
  
  private calculateCardEffectiveness(card: Card, game: Game): number {
    // カードの効果的さを0-100で評価
    const vitalityRatio = game.vitality / game.maxVitality
    const cardPowerRatio = card.power / 10 // 仮の最大パワー10
    
    return Math.min(100, (cardPowerRatio + vitalityRatio) * 50)
  }
  
  private convertToCSV(stats: StatisticsData): string {
    const rows = [
      ['統計項目', '値'],
      ['総ゲーム数', stats.totalGames.toString()],
      ['完了ゲーム数', stats.completedGames.toString()],
      ['勝利ゲーム数', stats.victoryGames.toString()],
      ['総チャレンジ数', stats.totalChallenges.toString()],
      ['成功チャレンジ数', stats.successfulChallenges.toString()],
      ['チャレンジ成功率', `${stats.challengeSuccessRate.toFixed(1)}%`],
      ['平均活力', stats.averageVitality.toFixed(1)],
      ['最高活力', stats.highestVitality.toString()],
      ['平均ターン数', stats.averageTurnsPerGame.toFixed(1)]
    ]
    
    return rows.map(row => row.join(',')).join('\n')
  }
  
  private notifyListeners(): void {
    const stats = this.generateStatistics()
    this.listeners.forEach(listener => { listener(stats); })
  }
}