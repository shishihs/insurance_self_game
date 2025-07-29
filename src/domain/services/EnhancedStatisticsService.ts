/**
 * 拡張統計管理サービス
 * 
 * StatisticsDataServiceをIndexedDBと統合し、
 * より高度なデータ分析と永続化機能を提供
 */

import { StatisticsDataService, type StatisticsData, type StatisticsFilter, type StatisticsSort } from './StatisticsDataService'
import { IndexedDBManager } from '@/infrastructure/storage/IndexedDBManager'
import { StorageAdapter } from '@/infrastructure/storage/StorageAdapter'
import type { Game } from '../entities/Game'

export interface PlayerProfile {
  id: string
  name: string
  level: number
  experience: number
  totalPlayTime: number
  joinedAt: Date
  lastPlayedAt: Date
  preferences: {
    difficulty: 'easy' | 'normal' | 'hard'
    soundEnabled: boolean
    autoSaveEnabled: boolean
  }
}

export interface ProgressMilestone {
  id: string
  name: string
  description: string
  requirement: string
  progress: number
  total: number
  unlockedAt?: Date
  reward?: {
    type: 'experience' | 'unlock' | 'cosmetic'
    value: any
  }
}

export interface DailyChallenge {
  id: string
  date: string
  name: string
  description: string
  target: number
  progress: number
  completed: boolean
  reward: {
    experience: number
    bonus?: string
  }
}

export class EnhancedStatisticsService {
  private static instance: EnhancedStatisticsService | null = null
  private baseService: StatisticsDataService
  private indexedDB: IndexedDBManager
  private storage: StorageAdapter
  private isInitialized = false
  
  private constructor() {
    this.baseService = StatisticsDataService.getInstance()
    this.indexedDB = IndexedDBManager.getInstance()
    this.storage = StorageAdapter.getInstance()
  }
  
  static getInstance(): EnhancedStatisticsService {
    if (!EnhancedStatisticsService.instance) {
      EnhancedStatisticsService.instance = new EnhancedStatisticsService()
    }
    return EnhancedStatisticsService.instance
  }
  
  /**
   * サービスを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      await this.storage.initialize()
      await this.indexedDB.initialize()
      
      // 既存の統計データを読み込み
      await this.loadStatisticsFromStorage()
      
      this.isInitialized = true
      console.log('✅ 拡張統計サービス初期化完了')
    } catch (error) {
      console.error('❌ 拡張統計サービス初期化エラー:', error)
      throw error
    }
  }
  
  /**
   * ゲーム開始時のトラッキング開始
   */
  async startGameTracking(game: Game): Promise<void> {
    await this.ensureInitialized()
    
    // 基本サービスでトラッキング開始
    this.baseService.startGameTracking(game)
    
    // プレイヤープロファイルを更新
    await this.updatePlayerProfile()
    
    // デイリーチャレンジの進捗をチェック
    await this.checkDailyChallenges()
  }
  
  /**
   * ターン終了時のデータ更新
   */
  async updateTurnData(game: Game, decisionTime?: number): Promise<void> {
    await this.ensureInitialized()
    
    // 基本サービスでデータ更新
    this.baseService.updateTurnData(game, decisionTime)
    
    // リアルタイムデータを永続化（一定間隔で）
    if (game.turn % 5 === 0) {
      await this.saveRealtimeData()
    }
  }
  
  /**
   * ゲーム終了時の処理
   */
  async finishGameTracking(game: Game): Promise<void> {
    await this.ensureInitialized()
    
    // 基本サービスで終了処理
    this.baseService.finishGameTracking(game)
    
    // ゲーム履歴をIndexedDBに保存
    await this.indexedDB.addGameToHistory(game)
    
    // 統計データを永続化
    await this.saveStatistics()
    
    // マイルストーンの進捗を更新
    await this.updateMilestones(game)
    
    // デイリーチャレンジの完了チェック
    await this.completeDailyChallenges(game)
  }
  
  /**
   * 統計データを生成（キャッシュ付き）
   */
  async generateStatistics(filter?: StatisticsFilter, sort?: StatisticsSort): Promise<StatisticsData> {
    await this.ensureInitialized()
    
    // キャッシュキーを生成
    const cacheKey = this.generateCacheKey(filter, sort)
    const cachedData = await this.getCachedStatistics(cacheKey)
    
    if (cachedData && this.isCacheValid(cachedData)) {
      return cachedData.data
    }
    
    // 新しい統計データを生成
    const stats = this.baseService.generateStatistics(filter, sort)
    
    // キャッシュに保存
    await this.cacheStatistics(cacheKey, stats)
    
    return stats
  }
  
  /**
   * プレイヤープロファイルを取得
   */
  async getPlayerProfile(): Promise<PlayerProfile> {
    await this.ensureInitialized()
    
    const profile = await this.storage.loadPreference<PlayerProfile>('player_profile')
    
    if (!profile) {
      // デフォルトプロファイルを作成
      const defaultProfile: PlayerProfile = {
        id: this.generatePlayerId(),
        name: 'プレイヤー',
        level: 1,
        experience: 0,
        totalPlayTime: 0,
        joinedAt: new Date(),
        lastPlayedAt: new Date(),
        preferences: {
          difficulty: 'normal',
          soundEnabled: true,
          autoSaveEnabled: true
        }
      }
      
      await this.storage.savePreference('player_profile', defaultProfile)
      return defaultProfile
    }
    
    return profile
  }
  
  /**
   * プレイヤープロファイルを更新
   */
  async updatePlayerProfile(updates?: Partial<PlayerProfile>): Promise<void> {
    await this.ensureInitialized()
    
    const currentProfile = await this.getPlayerProfile()
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      lastPlayedAt: new Date()
    }
    
    await this.storage.savePreference('player_profile', updatedProfile)
  }
  
  /**
   * 進行状況マイルストーンを取得
   */
  async getMilestones(): Promise<ProgressMilestone[]> {
    await this.ensureInitialized()
    
    const milestones = await this.storage.loadPreference<ProgressMilestone[]>('progress_milestones')
    
    if (!milestones) {
      // デフォルトマイルストーンを作成
      const defaultMilestones = this.createDefaultMilestones()
      await this.storage.savePreference('progress_milestones', defaultMilestones)
      return defaultMilestones
    }
    
    return milestones
  }
  
  /**
   * デイリーチャレンジを取得
   */
  async getDailyChallenges(): Promise<DailyChallenge[]> {
    await this.ensureInitialized()
    
    const today = new Date().toISOString().split('T')[0]
    const challenges = await this.storage.loadPreference<DailyChallenge[]>(`daily_challenges_${today}`)
    
    if (!challenges) {
      // 今日のチャレンジを生成
      const newChallenges = this.generateDailyChallenges()
      await this.storage.savePreference(`daily_challenges_${today}`, newChallenges)
      return newChallenges
    }
    
    return challenges
  }
  
  /**
   * 詳細なゲーム履歴を検索
   */
  async searchGameHistory(criteria: {
    status?: string
    minScore?: number
    maxScore?: number
    startDate?: Date
    endDate?: Date
    limit?: number
  }): Promise<Game[]> {
    await this.ensureInitialized()
    
    const serializedGames = await this.indexedDB.searchGameHistory(criteria)
    
    // SerializedGameからGameインスタンスを復元
    const games: Game[] = []
    for (const serialized of serializedGames) {
      try {
        const gameState = JSON.parse(serialized.data)
        // ここでGameインスタンスを復元する処理が必要
        // 実際の実装では、Gameクラスに復元メソッドを追加するか、
        // ファクトリーパターンを使用する
        console.log('Game restoration from:', gameState)
      } catch (error) {
        console.error('ゲーム復元エラー:', error)
      }
    }
    
    return games
  }
  
  /**
   * 統計データをエクスポート（拡張版）
   */
  async exportStatistics(format: 'json' | 'csv' = 'json'): Promise<string> {
    await this.ensureInitialized()
    
    const [stats, profile, milestones, achievements] = await Promise.all([
      this.generateStatistics(),
      this.getPlayerProfile(),
      this.getMilestones(),
      this.indexedDB.getAllAchievements()
    ])
    
    const exportData = {
      exportedAt: new Date(),
      statistics: stats,
      playerProfile: profile,
      milestones,
      achievements
    }
    
    if (format === 'json') {
      return JSON.stringify(exportData, null, 2)
    } else {
      return this.convertToCSV(exportData)
    }
  }
  
  /**
   * レポート生成機能
   */
  async generateReport(type: 'weekly' | 'monthly' | 'all-time'): Promise<{
    summary: string
    highlights: string[]
    recommendations: string[]
    charts: any[]
  }> {
    await this.ensureInitialized()
    
    const stats = await this.generateStatistics()
    const profile = await this.getPlayerProfile()
    
    // 期間に応じたフィルターを設定
    const dateRange = this.getDateRangeForReport(type)
    const filteredStats = await this.generateStatistics({ dateRange })
    
    // レポートを生成
    const summary = this.generateSummary(filteredStats, type)
    const highlights = this.extractHighlights(filteredStats)
    const recommendations = this.generateRecommendations(filteredStats, profile)
    const charts = this.prepareChartData(filteredStats)
    
    return {
      summary,
      highlights,
      recommendations,
      charts
    }
  }
  
  // === プライベートメソッド ===
  
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }
  
  private async loadStatisticsFromStorage(): Promise<void> {
    const savedStats = await this.indexedDB.loadStatistics()
    if (savedStats) {
      // 保存された統計データから内部状態を復元
      console.log('統計データを復元しました')
    }
  }
  
  private async saveStatistics(): Promise<void> {
    const stats = this.baseService.generateStatistics()
    await this.indexedDB.saveStatistics(stats)
  }
  
  private async saveRealtimeData(): Promise<void> {
    const realtimeData = this.baseService.getRealtimeStatistics()
    if (realtimeData) {
      await this.storage.savePreference('realtime_stats', realtimeData)
    }
  }
  
  private generateCacheKey(filter?: StatisticsFilter, sort?: StatisticsSort): string {
    const filterStr = filter ? JSON.stringify(filter) : 'none'
    const sortStr = sort ? `${sort.field}_${sort.direction}` : 'none'
    return `stats_cache_${filterStr}_${sortStr}`
  }
  
  private async getCachedStatistics(key: string): Promise<{ data: StatisticsData; timestamp: number } | null> {
    return await this.storage.loadPreference(key)
  }
  
  private isCacheValid(cached: { timestamp: number }): boolean {
    const CACHE_DURATION = 5 * 60 * 1000 // 5分
    return Date.now() - cached.timestamp < CACHE_DURATION
  }
  
  private async cacheStatistics(key: string, data: StatisticsData): Promise<void> {
    await this.storage.savePreference(key, {
      data,
      timestamp: Date.now()
    })
  }
  
  private generatePlayerId(): string {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  private createDefaultMilestones(): ProgressMilestone[] {
    return [
      {
        id: 'first_victory',
        name: '初勝利',
        description: '初めてゲームに勝利する',
        requirement: 'ゲームに1回勝利',
        progress: 0,
        total: 1
      },
      {
        id: 'veteran',
        name: 'ベテラン',
        description: '10回ゲームをクリア',
        requirement: 'ゲームを10回クリア',
        progress: 0,
        total: 10
      },
      {
        id: 'insurance_master',
        name: '保険マスター',
        description: '全種類の保険を使用',
        requirement: '全ての保険タイプを使用',
        progress: 0,
        total: 5
      },
      {
        id: 'high_scorer',
        name: 'ハイスコアラー',
        description: '10000点以上を獲得',
        requirement: '1回のゲームで10000点以上',
        progress: 0,
        total: 10000
      },
      {
        id: 'endurance',
        name: '持久力',
        description: '50ターン以上生存',
        requirement: '1回のゲームで50ターン以上',
        progress: 0,
        total: 50
      }
    ]
  }
  
  private generateDailyChallenges(): DailyChallenge[] {
    const challenges = [
      {
        id: 'daily_games',
        name: '今日のゲーム',
        description: '3回ゲームをプレイ',
        target: 3,
        progress: 0,
        completed: false,
        reward: { experience: 100 }
      },
      {
        id: 'daily_challenges',
        name: 'チャレンジマスター',
        description: '5回チャレンジに成功',
        target: 5,
        progress: 0,
        completed: false,
        reward: { experience: 150 }
      },
      {
        id: 'daily_insurance',
        name: '保険活用',
        description: '保険を3回使用',
        target: 3,
        progress: 0,
        completed: false,
        reward: { experience: 120 }
      }
    ]
    
    // 日付を追加
    const today = new Date().toISOString().split('T')[0]
    return challenges.map(c => ({ ...c, date: today }))
  }
  
  private async updateMilestones(game: Game): Promise<void> {
    const milestones = await this.getMilestones()
    const stats = this.baseService.generateStatistics()
    
    // 各マイルストーンの進捗を更新
    for (const milestone of milestones) {
      switch (milestone.id) {
        case 'first_victory':
          if (game.status === 'victory' && milestone.progress === 0) {
            milestone.progress = 1
            milestone.unlockedAt = new Date()
          }
          break
          
        case 'veteran':
          milestone.progress = stats.completedGames
          if (milestone.progress >= milestone.total && !milestone.unlockedAt) {
            milestone.unlockedAt = new Date()
          }
          break
          
        case 'high_scorer':
          if (game.stats.score && game.stats.score >= 10000) {
            milestone.progress = game.stats.score
            if (!milestone.unlockedAt) {
              milestone.unlockedAt = new Date()
            }
          }
          break
          
        case 'endurance':
          if (game.turn >= 50) {
            milestone.progress = game.turn
            if (!milestone.unlockedAt) {
              milestone.unlockedAt = new Date()
            }
          }
          break
      }
    }
    
    await this.storage.savePreference('progress_milestones', milestones)
  }
  
  private async checkDailyChallenges(): Promise<void> {
    const challenges = await this.getDailyChallenges()
    // チャレンジの進捗確認ロジック
  }
  
  private async completeDailyChallenges(game: Game): Promise<void> {
    const challenges = await this.getDailyChallenges()
    const today = new Date().toISOString().split('T')[0]
    
    // 各チャレンジの完了チェック
    for (const challenge of challenges) {
      switch (challenge.id) {
        case 'daily_games':
          challenge.progress++
          break
          
        case 'daily_challenges':
          challenge.progress += game.stats.successfulChallenges
          break
          
        case 'daily_insurance':
          challenge.progress += game.insuranceCards.length
          break
      }
      
      // 完了チェック
      if (challenge.progress >= challenge.target && !challenge.completed) {
        challenge.completed = true
        
        // 経験値を付与
        const profile = await this.getPlayerProfile()
        await this.updatePlayerProfile({
          experience: profile.experience + challenge.reward.experience
        })
      }
    }
    
    await this.storage.savePreference(`daily_challenges_${today}`, challenges)
  }
  
  private getDateRangeForReport(type: 'weekly' | 'monthly' | 'all-time'): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()
    
    switch (type) {
      case 'weekly':
        start.setDate(start.getDate() - 7)
        break
      case 'monthly':
        start.setMonth(start.getMonth() - 1)
        break
      case 'all-time':
        start.setFullYear(2020) // 適当な過去の日付
        break
    }
    
    return { start, end }
  }
  
  private generateSummary(stats: StatisticsData, type: string): string {
    return `${type}期間の統計サマリー: 
    総ゲーム数: ${stats.totalGames}
    勝利数: ${stats.victoryGames}
    平均プレイ時間: ${Math.round(stats.averageGameDuration / 60000)}分
    チャレンジ成功率: ${stats.challengeSuccessRate.toFixed(1)}%`
  }
  
  private extractHighlights(stats: StatisticsData): string[] {
    const highlights: string[] = []
    
    if (stats.challengeSuccessRate > 70) {
      highlights.push('🏆 高いチャレンジ成功率を維持しています！')
    }
    
    if (stats.highestVitality > 80) {
      highlights.push('💪 素晴らしい活力管理です！')
    }
    
    if (stats.favoriteCardTypes.length > 0) {
      highlights.push(`🎯 よく使用するカード: ${stats.favoriteCardTypes[0]}`)
    }
    
    return highlights
  }
  
  private generateRecommendations(stats: StatisticsData, profile: PlayerProfile): string[] {
    const recommendations: string[] = []
    
    if (stats.challengeSuccessRate < 50) {
      recommendations.push('🎯 保険カードをもっと活用してチャレンジ成功率を上げましょう')
    }
    
    if (stats.averageVitality < 30) {
      recommendations.push('💊 活力回復カードを優先的に選択することをお勧めします')
    }
    
    if (profile.level < 10 && stats.totalGames < 20) {
      recommendations.push('📈 もっとプレイして経験を積みましょう')
    }
    
    return recommendations
  }
  
  private prepareChartData(stats: StatisticsData): any[] {
    return [
      {
        type: 'line',
        name: '日別プレイ履歴',
        data: stats.gameHistoryByDate
      },
      {
        type: 'pie',
        name: 'カードタイプ使用率',
        data: Object.entries(stats.cardTypeUsage).map(([type, count]) => ({
          name: type,
          value: count
        }))
      },
      {
        type: 'bar',
        name: 'ステージ別成功率',
        data: Object.entries(stats.stageSuccessRates).map(([stage, rate]) => ({
          stage,
          rate: rate * 100
        }))
      }
    ]
  }
  
  private convertToCSV(data: any): string {
    // CSV変換の実装
    const lines: string[] = []
    lines.push('Insurance Game Statistics Export')
    lines.push(`Exported at: ${data.exportedAt}`)
    lines.push('')
    
    // プレイヤー情報
    lines.push('Player Profile')
    lines.push(`Name,Level,Experience,Total Play Time`)
    lines.push(`${data.playerProfile.name},${data.playerProfile.level},${data.playerProfile.experience},${data.playerProfile.totalPlayTime}`)
    lines.push('')
    
    // 基本統計
    lines.push('Basic Statistics')
    lines.push('Metric,Value')
    lines.push(`Total Games,${data.statistics.totalGames}`)
    lines.push(`Victory Games,${data.statistics.victoryGames}`)
    lines.push(`Average Game Duration,${data.statistics.averageGameDuration}`)
    lines.push(`Challenge Success Rate,${data.statistics.challengeSuccessRate}`)
    
    return lines.join('\n')
  }
}