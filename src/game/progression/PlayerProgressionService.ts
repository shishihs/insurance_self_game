/**
 * プレイヤー進行状況トラッキングサービス
 * 
 * プレイヤーの成長、実績、レベルアップ、報酬システムを管理
 */

import { StorageAdapter } from '@/infrastructure/storage/StorageAdapter'
import { IndexedDBManager, type Achievement } from '@/infrastructure/storage/IndexedDBManager'
import { EnhancedStatisticsService } from '@/domain/services/EnhancedStatisticsService'
import type { Game } from '@/domain/entities/Game'

export interface LevelSystem {
  currentLevel: number
  currentExperience: number
  experienceToNextLevel: number
  totalExperience: number
  levelUpRewards: LevelReward[]
}

export interface LevelReward {
  level: number
  type: 'unlock' | 'bonus' | 'cosmetic' | 'ability'
  name: string
  description: string
  value: any
  claimed: boolean
}

export interface ProgressionEvent {
  id: string
  type: 'level_up' | 'achievement' | 'milestone' | 'daily_complete'
  timestamp: Date
  details: {
    name: string
    description: string
    reward?: any
    previousValue?: number
    newValue?: number
  }
}

export interface SeasonalProgress {
  seasonId: string
  seasonName: string
  startDate: Date
  endDate: Date
  currentTier: number
  points: number
  rewards: SeasonReward[]
  challenges: SeasonChallenge[]
}

export interface SeasonReward {
  tier: number
  type: string
  name: string
  description: string
  claimed: boolean
}

export interface SeasonChallenge {
  id: string
  name: string
  description: string
  target: number
  progress: number
  completed: boolean
  points: number
}

export class PlayerProgressionService {
  private static instance: PlayerProgressionService | null = null
  private storage: StorageAdapter
  private indexedDB: IndexedDBManager
  private statsService: EnhancedStatisticsService
  private isInitialized = false
  
  // 経験値テーブル
  private readonly EXPERIENCE_TABLE = this.generateExperienceTable()
  
  // イベントリスナー
  private progressionListeners: ((event: ProgressionEvent) => void)[] = []
  
  private constructor() {
    this.storage = StorageAdapter.getInstance()
    this.indexedDB = IndexedDBManager.getInstance()
    this.statsService = EnhancedStatisticsService.getInstance()
  }
  
  static getInstance(): PlayerProgressionService {
    if (!PlayerProgressionService.instance) {
      PlayerProgressionService.instance = new PlayerProgressionService()
    }
    return PlayerProgressionService.instance
  }
  
  /**
   * サービスを初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    
    try {
      await this.storage.initialize()
      await this.indexedDB.initialize()
      await this.statsService.initialize()
      
      // 初回起動チェック
      await this.checkFirstTimeSetup()
      
      this.isInitialized = true
      console.log('✅ プレイヤー進行状況サービス初期化完了')
    } catch (error) {
      console.error('❌ 進行状況サービス初期化エラー:', error)
      throw error
    }
  }
  
  /**
   * ゲーム終了時の進行状況更新
   */
  async updateProgressionAfterGame(game: Game): Promise<ProgressionEvent[]> {
    await this.ensureInitialized()
    
    const events: ProgressionEvent[] = []
    
    // 経験値を付与
    const expGained = this.calculateExperienceGained(game)
    const levelUpEvent = await this.addExperience(expGained)
    if (levelUpEvent) {
      events.push(levelUpEvent)
    }
    
    // 実績チェック
    const achievementEvents = await this.checkAchievements(game)
    events.push(...achievementEvents)
    
    // シーズンチャレンジ更新
    const seasonEvents = await this.updateSeasonalProgress(game)
    events.push(...seasonEvents)
    
    // イベントを通知
    events.forEach(event => this.notifyProgressionEvent(event))
    
    return events
  }
  
  /**
   * 現在のレベルシステム情報を取得
   */
  async getLevelSystem(): Promise<LevelSystem> {
    await this.ensureInitialized()
    
    const savedSystem = await this.storage.loadPreference<LevelSystem>('level_system')
    
    if (!savedSystem) {
      // デフォルトのレベルシステムを作成
      const defaultSystem: LevelSystem = {
        currentLevel: 1,
        currentExperience: 0,
        experienceToNextLevel: this.EXPERIENCE_TABLE[1],
        totalExperience: 0,
        levelUpRewards: this.generateLevelRewards()
      }
      
      await this.storage.savePreference('level_system', defaultSystem)
      return defaultSystem
    }
    
    return savedSystem
  }
  
  /**
   * 経験値を追加
   */
  async addExperience(amount: number): Promise<ProgressionEvent | null> {
    await this.ensureInitialized()
    
    const levelSystem = await this.getLevelSystem()
    const previousLevel = levelSystem.currentLevel
    
    levelSystem.currentExperience += amount
    levelSystem.totalExperience += amount
    
    // レベルアップチェック
    let leveledUp = false
    while (levelSystem.currentExperience >= levelSystem.experienceToNextLevel) {
      levelSystem.currentExperience -= levelSystem.experienceToNextLevel
      levelSystem.currentLevel++
      leveledUp = true
      
      if (levelSystem.currentLevel < this.EXPERIENCE_TABLE.length) {
        levelSystem.experienceToNextLevel = this.EXPERIENCE_TABLE[levelSystem.currentLevel]
      } else {
        // 最大レベルに到達
        levelSystem.experienceToNextLevel = Infinity
        levelSystem.currentExperience = 0
        break
      }
    }
    
    await this.storage.savePreference('level_system', levelSystem)
    
    if (leveledUp) {
      // レベルアップ報酬を解放
      await this.unlockLevelRewards(previousLevel + 1, levelSystem.currentLevel)
      
      return {
        id: `levelup_${Date.now()}`,
        type: 'level_up',
        timestamp: new Date(),
        details: {
          name: 'レベルアップ！',
          description: `レベル ${previousLevel} → ${levelSystem.currentLevel}`,
          previousValue: previousLevel,
          newValue: levelSystem.currentLevel
        }
      }
    }
    
    return null
  }
  
  /**
   * 実績の達成状況をチェック
   */
  async checkAchievements(game: Game): Promise<ProgressionEvent[]> {
    await this.ensureInitialized()
    
    const events: ProgressionEvent[] = []
    const existingAchievements = await this.indexedDB.getAllAchievements()
    const achievementIds = new Set(existingAchievements.map(a => a.id))
    
    // 各実績の条件をチェック
    const newAchievements = await this.evaluateAchievementConditions(game, achievementIds)
    
    for (const achievement of newAchievements) {
      await this.indexedDB.saveAchievement(achievement)
      
      events.push({
        id: `achievement_${achievement.id}_${Date.now()}`,
        type: 'achievement',
        timestamp: new Date(),
        details: {
          name: achievement.name,
          description: achievement.description,
          reward: { experience: 100 } // 実績達成で経験値獲得
        }
      })
    }
    
    return events
  }
  
  /**
   * シーズン進行状況を取得
   */
  async getSeasonalProgress(): Promise<SeasonalProgress> {
    await this.ensureInitialized()
    
    const currentSeason = await this.getCurrentSeason()
    const savedProgress = await this.storage.loadPreference<SeasonalProgress>(`season_${currentSeason.seasonId}`)
    
    if (!savedProgress) {
      // 新しいシーズンの進行状況を作成
      const newProgress: SeasonalProgress = {
        ...currentSeason,
        currentTier: 0,
        points: 0,
        rewards: this.generateSeasonRewards(currentSeason.seasonId),
        challenges: this.generateSeasonChallenges(currentSeason.seasonId)
      }
      
      await this.storage.savePreference(`season_${currentSeason.seasonId}`, newProgress)
      return newProgress
    }
    
    return savedProgress
  }
  
  /**
   * 報酬を請求
   */
  async claimReward(type: 'level' | 'season' | 'achievement', rewardId: string | number): Promise<boolean> {
    await this.ensureInitialized()
    
    switch (type) {
      case 'level':
        return await this.claimLevelReward(rewardId as number)
        
      case 'season':
        return await this.claimSeasonReward(rewardId as number)
        
      case 'achievement':
        // 実績報酬は自動的に付与されるため、ここでは何もしない
        return true
        
      default:
        return false
    }
  }
  
  /**
   * 進行状況の統計を取得
   */
  async getProgressionStats(): Promise<{
    totalPlayTime: number
    gamesPlayed: number
    winRate: number
    currentStreak: number
    bestStreak: number
    achievementsUnlocked: number
    totalAchievements: number
  }> {
    await this.ensureInitialized()
    
    const [profile, stats, achievements] = await Promise.all([
      this.statsService.getPlayerProfile(),
      this.statsService.generateStatistics(),
      this.indexedDB.getAllAchievements()
    ])
    
    const totalAchievements = this.getTotalAchievementCount()
    
    return {
      totalPlayTime: profile.totalPlayTime,
      gamesPlayed: stats.totalGames,
      winRate: stats.totalGames > 0 ? (stats.victoryGames / stats.totalGames) * 100 : 0,
      currentStreak: 0, // TODO: ストリーク実装
      bestStreak: 0,
      achievementsUnlocked: achievements.length,
      totalAchievements
    }
  }
  
  /**
   * 進行イベントのリスナーを登録
   */
  subscribeToProgressionEvents(listener: (event: ProgressionEvent) => void): () => void {
    this.progressionListeners.push(listener)
    
    return () => {
      const index = this.progressionListeners.indexOf(listener)
      if (index > -1) {
        this.progressionListeners.splice(index, 1)
      }
    }
  }
  
  // === プライベートメソッド ===
  
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }
  }
  
  private async checkFirstTimeSetup(): Promise<void> {
    const hasPlayedBefore = await this.storage.loadPreference<boolean>('has_played_before')
    
    if (!hasPlayedBefore) {
      // 初回プレイヤー向けのセットアップ
      console.log('🎮 初回プレイヤーを検出しました')
      
      // チュートリアル完了実績を付与
      const tutorialAchievement: Achievement = {
        id: 'first_launch',
        name: 'ようこそ！',
        description: 'ゲームを初めて起動しました',
        unlockedAt: new Date(),
        category: 'special'
      }
      
      await this.indexedDB.saveAchievement(tutorialAchievement)
      await this.storage.savePreference('has_played_before', true)
    }
  }
  
  private generateExperienceTable(): number[] {
    const table: number[] = [0] // レベル0は存在しない
    
    // レベル1〜100までの必要経験値を生成
    for (let level = 1; level <= 100; level++) {
      // 指数関数的に増加する経験値カーブ
      const exp = Math.floor(100 * Math.pow(1.2, level - 1))
      table.push(exp)
    }
    
    return table
  }
  
  private generateLevelRewards(): LevelReward[] {
    const rewards: LevelReward[] = []
    
    // レベル5ごとに報酬を設定
    for (let level = 5; level <= 100; level += 5) {
      if (level % 10 === 0) {
        // レベル10の倍数では特別な報酬
        rewards.push({
          level,
          type: 'unlock',
          name: `特別カード解放 Lv.${level}`,
          description: '新しいカードタイプが使用可能になります',
          value: { cardType: `special_${level}` },
          claimed: false
        })
      } else {
        // その他のレベルではボーナス報酬
        rewards.push({
          level,
          type: 'bonus',
          name: `ボーナス報酬 Lv.${level}`,
          description: '追加の経験値ブーストを獲得',
          value: { expBoost: 0.1 * (level / 5) },
          claimed: false
        })
      }
    }
    
    return rewards
  }
  
  private calculateExperienceGained(game: Game): number {
    let exp = 0
    
    // 基本経験値
    exp += 50
    
    // ゲーム結果による追加経験値
    if (game.status === 'victory') {
      exp += 200
    } else if (game.status === 'game_over') {
      exp += 100
    }
    
    // ターン数ボーナス
    exp += game.turn * 5
    
    // チャレンジ成功ボーナス
    exp += game.stats.successfulChallenges * 10
    
    // 活力ボーナス
    exp += Math.floor(game.vitality / 10) * 10
    
    return exp
  }
  
  private async unlockLevelRewards(fromLevel: number, toLevel: number): Promise<void> {
    const levelSystem = await this.getLevelSystem()
    
    for (const reward of levelSystem.levelUpRewards) {
      if (reward.level >= fromLevel && reward.level <= toLevel && !reward.claimed) {
        // 報酬を適用
        await this.applyLevelReward(reward)
        reward.claimed = true
      }
    }
    
    await this.storage.savePreference('level_system', levelSystem)
  }
  
  private async applyLevelReward(reward: LevelReward): Promise<void> {
    switch (reward.type) {
      case 'unlock':
        // カード解放などのロジック
        console.log(`🎁 報酬解放: ${reward.name}`)
        break
        
      case 'bonus':
        // ボーナス適用のロジック
        console.log(`💰 ボーナス獲得: ${reward.name}`)
        break
        
      case 'cosmetic':
        // 見た目アイテムの解放
        console.log(`🎨 コスメティック獲得: ${reward.name}`)
        break
        
      case 'ability':
        // 特殊能力の解放
        console.log(`⚡ アビリティ獲得: ${reward.name}`)
        break
    }
  }
  
  private async evaluateAchievementConditions(
    game: Game,
    existingIds: Set<string>
  ): Promise<Achievement[]> {
    const newAchievements: Achievement[] = []
    const stats = await this.statsService.generateStatistics()
    
    // パーフェクトゲーム
    if (game.status === 'victory' && game.vitality === game.maxVitality && !existingIds.has('perfect_game')) {
      newAchievements.push({
        id: 'perfect_game',
        name: 'パーフェクトゲーム',
        description: '最大活力を維持したまま勝利',
        unlockedAt: new Date(),
        category: 'gameplay'
      })
    }
    
    // スピードラン
    if (game.status === 'victory' && game.turn <= 20 && !existingIds.has('speedrun')) {
      newAchievements.push({
        id: 'speedrun',
        name: 'スピードラン',
        description: '20ターン以内に勝利',
        unlockedAt: new Date(),
        category: 'gameplay'
      })
    }
    
    // 保険コレクター
    if (game.insuranceCards.length >= 5 && !existingIds.has('insurance_collector')) {
      newAchievements.push({
        id: 'insurance_collector',
        name: '保険コレクター',
        description: '1ゲームで5つ以上の保険を保持',
        unlockedAt: new Date(),
        category: 'strategy'
      })
    }
    
    // マラソンランナー
    if (game.turn >= 100 && !existingIds.has('marathon_runner')) {
      newAchievements.push({
        id: 'marathon_runner',
        name: 'マラソンランナー',
        description: '100ターン以上プレイ',
        unlockedAt: new Date(),
        category: 'milestone'
      })
    }
    
    // ベテランプレイヤー
    if (stats.totalGames >= 50 && !existingIds.has('veteran_player_50')) {
      newAchievements.push({
        id: 'veteran_player_50',
        name: 'ベテランプレイヤー',
        description: '50回ゲームをプレイ',
        unlockedAt: new Date(),
        category: 'milestone'
      })
    }
    
    return newAchievements
  }
  
  private async getCurrentSeason(): Promise<{
    seasonId: string
    seasonName: string
    startDate: Date
    endDate: Date
  }> {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    
    // 3ヶ月ごとのシーズン
    const seasonIndex = Math.floor(month / 3)
    const seasonNames = ['春', '夏', '秋', '冬']
    
    const startMonth = seasonIndex * 3
    const endMonth = startMonth + 3
    
    return {
      seasonId: `${year}_S${seasonIndex + 1}`,
      seasonName: `${year}年 ${seasonNames[seasonIndex]}シーズン`,
      startDate: new Date(year, startMonth, 1),
      endDate: new Date(year, endMonth, 0, 23, 59, 59)
    }
  }
  
  private generateSeasonRewards(seasonId: string): SeasonReward[] {
    const rewards: SeasonReward[] = []
    
    for (let tier = 1; tier <= 10; tier++) {
      rewards.push({
        tier,
        type: tier % 5 === 0 ? 'special' : 'normal',
        name: `シーズン報酬 Tier ${tier}`,
        description: `${seasonId} の Tier ${tier} 達成報酬`,
        claimed: false
      })
    }
    
    return rewards
  }
  
  private generateSeasonChallenges(seasonId: string): SeasonChallenge[] {
    return [
      {
        id: `${seasonId}_games`,
        name: 'シーズンゲーム',
        description: '今シーズン中に20ゲームプレイ',
        target: 20,
        progress: 0,
        completed: false,
        points: 100
      },
      {
        id: `${seasonId}_victories`,
        name: 'シーズン勝利',
        description: '今シーズン中に10回勝利',
        target: 10,
        progress: 0,
        completed: false,
        points: 200
      },
      {
        id: `${seasonId}_challenges`,
        name: 'チャレンジマスター',
        description: '今シーズン中に100回チャレンジ成功',
        target: 100,
        progress: 0,
        completed: false,
        points: 150
      }
    ]
  }
  
  private async updateSeasonalProgress(game: Game): Promise<ProgressionEvent[]> {
    const events: ProgressionEvent[] = []
    const seasonProgress = await this.getSeasonalProgress()
    
    // チャレンジ進捗を更新
    let pointsGained = 0
    
    for (const challenge of seasonProgress.challenges) {
      let progressMade = false
      
      switch (challenge.id.split('_').pop()) {
        case 'games':
          challenge.progress++
          progressMade = true
          break
          
        case 'victories':
          if (game.status === 'victory') {
            challenge.progress++
            progressMade = true
          }
          break
          
        case 'challenges':
          challenge.progress += game.stats.successfulChallenges
          progressMade = true
          break
      }
      
      // 完了チェック
      if (progressMade && challenge.progress >= challenge.target && !challenge.completed) {
        challenge.completed = true
        pointsGained += challenge.points
        
        events.push({
          id: `season_challenge_${challenge.id}_${Date.now()}`,
          type: 'daily_complete',
          timestamp: new Date(),
          details: {
            name: 'シーズンチャレンジ完了',
            description: challenge.name,
            reward: { points: challenge.points }
          }
        })
      }
    }
    
    // ポイントを加算してティアを更新
    if (pointsGained > 0) {
      seasonProgress.points += pointsGained
      const newTier = Math.floor(seasonProgress.points / 100)
      
      if (newTier > seasonProgress.currentTier) {
        seasonProgress.currentTier = newTier
        
        events.push({
          id: `season_tierup_${Date.now()}`,
          type: 'milestone',
          timestamp: new Date(),
          details: {
            name: 'シーズンティアアップ',
            description: `Tier ${newTier} に到達しました`,
            previousValue: newTier - 1,
            newValue: newTier
          }
        })
      }
    }
    
    await this.storage.savePreference(`season_${seasonProgress.seasonId}`, seasonProgress)
    
    return events
  }
  
  private async claimLevelReward(level: number): Promise<boolean> {
    const levelSystem = await this.getLevelSystem()
    const reward = levelSystem.levelUpRewards.find(r => r.level === level)
    
    if (reward && !reward.claimed && levelSystem.currentLevel >= level) {
      await this.applyLevelReward(reward)
      reward.claimed = true
      await this.storage.savePreference('level_system', levelSystem)
      return true
    }
    
    return false
  }
  
  private async claimSeasonReward(tier: number): Promise<boolean> {
    const seasonProgress = await this.getSeasonalProgress()
    const reward = seasonProgress.rewards.find(r => r.tier === tier)
    
    if (reward && !reward.claimed && seasonProgress.currentTier >= tier) {
      // 報酬を適用
      console.log(`🎁 シーズン報酬獲得: ${reward.name}`)
      reward.claimed = true
      await this.storage.savePreference(`season_${seasonProgress.seasonId}`, seasonProgress)
      return true
    }
    
    return false
  }
  
  private getTotalAchievementCount(): number {
    // 実装されている全実績数
    return 10 // TODO: 実際の実績数に更新
  }
  
  private notifyProgressionEvent(event: ProgressionEvent): void {
    this.progressionListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        console.error('進行イベントリスナーエラー:', error)
      }
    })
  }
}