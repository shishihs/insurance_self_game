/**
 * 達成システム（アチーブメント）
 * プレイヤーの長期的なエンゲージメントを促進する包括的な達成システム
 */

import type { Card } from '../../domain/entities/Card'
import type { Difficulty, GameStage } from '../../domain/types/card.types'
import type { PlayerStats } from '../../domain/types/game.types'
import type { ScoreBreakdown } from './ScoringSystem'

/**
 * 達成カテゴリ
 */
export type AchievementCategory = 
  | 'progression'  // 進行系（初回クリア等）
  | 'mastery'      // 熟練系（速攻、パーフェクト等）
  | 'collection'   // 収集系（カード収集等）
  | 'challenge'    // チャレンジ系（困難な条件）
  | 'secret'       // シークレット系（隠し要素）
  | 'social'       // ソーシャル系（共有等）

/**
 * 達成度レベル
 */
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

/**
 * 達成条件
 */
export interface AchievementCondition {
  type: string
  value: number | string | boolean
  comparison?: 'eq' | 'gte' | 'lte' | 'gt' | 'lt' | 'contains'
}

/**
 * 達成情報
 */
export interface Achievement {
  id: string
  name: string
  description: string
  category: AchievementCategory
  tier: AchievementTier
  points: number
  icon: string
  conditions: AchievementCondition[]
  hidden: boolean // シークレット達成かどうか
  unlockedAt?: Date
  progress?: number // 0-100の進捗率
  rewards?: {
    cardUnlocks?: string[] // アンロックされるカードID
    customizations?: string[] // アンロックされるカスタマイズ要素
    titles?: string[] // 獲得できる称号
    points?: number // ボーナスポイント
  }
}

/**
 * プレイヤー達成データ
 */
export interface PlayerAchievements {
  unlockedAchievements: Set<string>
  achievementProgress: Map<string, number>
  totalPoints: number
  unlockedCards: Set<string>
  unlockedCustomizations: Set<string>
  unlockedTitles: Set<string>
  currentTitle?: string
}

/**
 * 達成システム
 */
export class AchievementSystem {
  private readonly achievements: Map<string, Achievement> = new Map()
  private playerData: PlayerAchievements = {
    unlockedAchievements: new Set(),
    achievementProgress: new Map(),
    totalPoints: 0,
    unlockedCards: new Set(),
    unlockedCustomizations: new Set(),
    unlockedTitles: new Set()
  }

  constructor() {
    this.initializeAchievements()
  }

  /**
   * 達成を初期化
   */
  private initializeAchievements(): void {
    const achievements: Achievement[] = [
      // === 進行系達成 ===
      {
        id: 'first_challenge',
        name: '最初の一歩',
        description: '初めてチャレンジをクリアする',
        category: 'progression',
        tier: 'bronze',
        points: 100,
        icon: '🎯',
        conditions: [{ type: 'challenges_completed', value: 1, comparison: 'gte' }],
        hidden: false
      },
      {
        id: 'youth_clear',
        name: '青春の証',
        description: '青年期をクリアする',
        category: 'progression',
        tier: 'silver',
        points: 500,
        icon: '🌟',
        conditions: [{ type: 'stage_cleared', value: 'youth', comparison: 'eq' }],
        hidden: false,
        rewards: {
          cardUnlocks: ['special_youth_card'],
          titles: ['青春の覇者']
        }
      },
      {
        id: 'middle_age_clear',
        name: '円熟の境地',
        description: '中年期をクリアする',
        category: 'progression',
        tier: 'gold',
        points: 1000,
        icon: '👑',
        conditions: [{ type: 'stage_cleared', value: 'middle_age', comparison: 'eq' }],
        hidden: false,
        rewards: {
          cardUnlocks: ['special_middle_card'],
          titles: ['中年の賢者']
        }
      },
      {
        id: 'fulfillment_clear',
        name: '人生の集大成',
        description: '充実期をクリアする',
        category: 'progression',
        tier: 'platinum',
        points: 2000,
        icon: '💎',
        conditions: [{ type: 'stage_cleared', value: 'fulfillment', comparison: 'eq' }],
        hidden: false,
        rewards: {
          cardUnlocks: ['special_fulfillment_card'],
          titles: ['人生の達人']
        }
      },

      // === 熟練系達成 ===
      {
        id: 'speed_run_youth',
        name: '青春の疾風',
        description: '青年期を10ターン以内でクリアする',
        category: 'mastery',
        tier: 'gold',
        points: 800,
        icon: '⚡',
        conditions: [
          { type: 'stage_cleared', value: 'youth', comparison: 'eq' },
          { type: 'turns_used', value: 10, comparison: 'lte' }
        ],
        hidden: false
      },
      {
        id: 'perfect_health',
        name: '不死身の体',
        description: 'ダメージを受けずにステージをクリアする',
        category: 'mastery',
        tier: 'gold',
        points: 1200,
        icon: '🛡️',
        conditions: [
          { type: 'stage_cleared', value: true, comparison: 'eq' },
          { type: 'damage_taken', value: 0, comparison: 'eq' }
        ],
        hidden: false
      },
      {
        id: 'efficiency_master',
        name: '効率の鬼',
        description: 'パワー効率200%以上でチャレンジをクリアする',
        category: 'mastery',
        tier: 'silver',
        points: 600,
        icon: '⚙️',
        conditions: [{ type: 'power_efficiency', value: 2.0, comparison: 'gte' }],
        hidden: false
      },
      {
        id: 'streak_master',
        name: '連勝の王者',
        description: '10回連続でチャレンジに成功する',
        category: 'mastery',
        tier: 'gold',
        points: 1000,
        icon: '🔥',
        conditions: [{ type: 'consecutive_successes', value: 10, comparison: 'gte' }],
        hidden: false
      },

      // === 収集系達成 ===
      {
        id: 'card_collector',
        name: 'カードコレクター',
        description: '50枚のカードを獲得する',
        category: 'collection',
        tier: 'silver',
        points: 400,
        icon: '🃏',
        conditions: [{ type: 'cards_acquired', value: 50, comparison: 'gte' }],
        hidden: false
      },
      {
        id: 'insurance_master',
        name: '保険の達人',
        description: '全種類の保険カードを使用する',
        category: 'collection',
        tier: 'gold',
        points: 800,
        icon: '📋',
        conditions: [{ type: 'insurance_types_used', value: 5, comparison: 'gte' }],
        hidden: false,
        rewards: {
          cardUnlocks: ['legendary_insurance_card']
        }
      },
      {
        id: 'dream_chaser',
        name: '夢追い人',
        description: '全カテゴリの夢カードをクリアする',
        category: 'collection',
        tier: 'platinum',
        points: 1500,
        icon: '🌈',
        conditions: [{ type: 'dream_categories_cleared', value: 3, comparison: 'gte' }],
        hidden: false
      },

      // === チャレンジ系達成 ===
      {
        id: 'hard_mode_clear',
        name: '試練を乗り越えし者',
        description: 'ハード難易度でゲームをクリアする',
        category: 'challenge',
        tier: 'platinum',
        points: 2500,
        icon: '🔥',
        conditions: [
          { type: 'game_completed', value: true, comparison: 'eq' },
          { type: 'difficulty', value: 'hard', comparison: 'eq' }
        ],
        hidden: false,
        rewards: {
          titles: ['試練の克服者'],
          customizations: ['hard_mode_theme']
        }
      },
      {
        id: 'expert_mode_clear',
        name: '極限への挑戦者',
        description: 'エキスパート難易度でゲームをクリアする',
        category: 'challenge',
        tier: 'diamond',
        points: 5000,
        icon: '💎',
        conditions: [
          { type: 'game_completed', value: true, comparison: 'eq' },
          { type: 'difficulty', value: 'expert', comparison: 'eq' }
        ],
        hidden: false,
        rewards: {
          titles: ['伝説の挑戦者'],
          customizations: ['expert_mode_theme', 'diamond_card_backs']
        }
      },
      {
        id: 'no_insurance_clear',
        name: '無保険の勇者',
        description: '保険を使わずにステージをクリアする',
        category: 'challenge',
        tier: 'gold',
        points: 1500,
        icon: '🗡️',
        conditions: [
          { type: 'stage_cleared', value: true, comparison: 'eq' },
          { type: 'insurance_used', value: 0, comparison: 'eq' }
        ],
        hidden: false
      },

      // === シークレット系達成 ===
      {
        id: 'perfect_game',
        name: '完璧なる人生',
        description: '全ての条件を満たしてゲームをクリアする',
        category: 'secret',
        tier: 'diamond',
        points: 10000,
        icon: '👑',
        conditions: [
          { type: 'game_completed', value: true, comparison: 'eq' },
          { type: 'damage_taken', value: 0, comparison: 'eq' },
          { type: 'all_dreams_achieved', value: true, comparison: 'eq' },
          { type: 'turns_used', value: 30, comparison: 'lte' }
        ],
        hidden: true,
        rewards: {
          titles: ['完璧なる人生の創造主'],
          customizations: ['perfect_theme', 'rainbow_effects'],
          cardUnlocks: ['ultimate_life_card']
        }
      },
      {
        id: 'insurance_overload',
        name: '保険中毒',
        description: '同時に10種類以上の保険に加入する',
        category: 'secret',
        tier: 'gold',
        points: 1200,
        icon: '📚',
        conditions: [{ type: 'active_insurances', value: 10, comparison: 'gte' }],
        hidden: true
      },

      // === ソーシャル系達成 ===
      {
        id: 'score_sharer',
        name: 'スコア自慢',
        description: 'スコアを共有する',
        category: 'social',
        tier: 'bronze',
        points: 200,
        icon: '📤',
        conditions: [{ type: 'scores_shared', value: 1, comparison: 'gte' }],
        hidden: false
      }
    ]

    achievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement)
    })
  }

  /**
   * 達成をチェック・更新
   */
  checkAchievements(gameData: {
    stats: PlayerStats
    currentStage: GameStage
    difficulty: Difficulty
    gameCompleted: boolean
    stagesCleared: GameStage[]
    damageThisStage: number
    turnsThisStage: number
    powerEfficiency: number
    consecutiveSuccesses: number
    activeInsurances: number
    insuranceTypesUsed: string[]
    dreamCategoriesCleared: string[]
    scoresShared: number
  }): Achievement[] {
    const newlyUnlocked: Achievement[] = []

    for (const [id, achievement] of this.achievements) {
      if (this.playerData.unlockedAchievements.has(id)) {
        continue // 既に達成済み
      }

      const progress = this.calculateProgress(achievement, gameData)
      this.playerData.achievementProgress.set(id, progress)

      if (progress >= 100) {
        this.unlockAchievement(achievement)
        newlyUnlocked.push(achievement)
      }
    }

    return newlyUnlocked
  }

  /**
   * 達成の進捗を計算
   */
  private calculateProgress(achievement: Achievement, gameData: any): number {
    let totalProgress = 0
    const conditionCount = achievement.conditions.length

    for (const condition of achievement.conditions) {
      const value = this.getValueFromGameData(condition.type, gameData)
      const conditionMet = this.evaluateCondition(value, condition)
      
      if (conditionMet) {
        totalProgress += (100 / conditionCount)
      } else if (typeof condition.value === 'number' && typeof value === 'number') {
        // 数値条件の場合は部分的進捗を計算
        const partialProgress = Math.min(value / condition.value, 1) * (100 / conditionCount)
        totalProgress += partialProgress
      }
    }

    return Math.floor(totalProgress)
  }

  /**
   * ゲームデータから値を取得
   */
  private getValueFromGameData(type: string, gameData: any): any {
    switch (type) {
      case 'challenges_completed': return gameData.stats.challengesCompleted || 0
      case 'stage_cleared': return gameData.stagesCleared.includes(gameData.currentStage)
      case 'turns_used': return gameData.turnsThisStage
      case 'damage_taken': return gameData.damageThisStage
      case 'power_efficiency': return gameData.powerEfficiency
      case 'consecutive_successes': return gameData.consecutiveSuccesses
      case 'cards_acquired': return gameData.stats.cardsAcquired
      case 'insurance_types_used': return gameData.insuranceTypesUsed.length
      case 'dream_categories_cleared': return gameData.dreamCategoriesCleared.length
      case 'game_completed': return gameData.gameCompleted
      case 'difficulty': return gameData.difficulty
      case 'insurance_used': return gameData.activeInsurances > 0 ? 1 : 0
      case 'active_insurances': return gameData.activeInsurances
      case 'all_dreams_achieved': return gameData.dreamCategoriesCleared.length >= 3
      case 'scores_shared': return gameData.scoresShared
      default: return 0
    }
  }

  /**
   * 条件を評価
   */
  private evaluateCondition(value: any, condition: AchievementCondition): boolean {
    const comparison = condition.comparison || 'eq'
    
    switch (comparison) {
      case 'eq': return value === condition.value
      case 'gte': return value >= condition.value
      case 'lte': return value <= condition.value
      case 'gt': return value > condition.value
      case 'lt': return value < condition.value
      case 'contains': return Array.isArray(value) && value.includes(condition.value)
      default: return false
    }
  }

  /**
   * 達成をアンロック
   */
  private unlockAchievement(achievement: Achievement): void {
    this.playerData.unlockedAchievements.add(achievement.id)
    this.playerData.totalPoints += achievement.points
    achievement.unlockedAt = new Date()

    // 報酬を付与
    if (achievement.rewards) {
      achievement.rewards.cardUnlocks?.forEach(cardId => {
        this.playerData.unlockedCards.add(cardId)
      })
      achievement.rewards.customizations?.forEach(customId => {
        this.playerData.unlockedCustomizations.add(customId)
      })
      achievement.rewards.titles?.forEach(title => {
        this.playerData.unlockedTitles.add(title)
      })
      if (achievement.rewards.points) {
        this.playerData.totalPoints += achievement.rewards.points
      }
    }
  }

  /**
   * 達成一覧を取得
   */
  getAchievements(includeHidden = false): Achievement[] {
    return Array.from(this.achievements.values())
      .filter(achievement => includeHidden || !achievement.hidden || this.playerData.unlockedAchievements.has(achievement.id))
      .map(achievement => ({
        ...achievement,
        progress: this.playerData.achievementProgress.get(achievement.id) || 0
      }))
  }

  /**
   * カテゴリ別達成を取得
   */
  getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return this.getAchievements().filter(achievement => achievement.category === category)
  }

  /**
   * 達成率を取得
   */
  getCompletionRate(): {
    overall: number
    byCategory: Record<AchievementCategory, number>
    byTier: Record<AchievementTier, number>
  } {
    const allAchievements = Array.from(this.achievements.values())
    const unlockedCount = this.playerData.unlockedAchievements.size
    
    const byCategory: Record<AchievementCategory, number> = {
      progression: 0,
      mastery: 0,
      collection: 0,
      challenge: 0,
      secret: 0,
      social: 0
    }

    const byTier: Record<AchievementTier, number> = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0,
      diamond: 0
    }

    // カテゴリ別・ティア別の達成率を計算
    Object.keys(byCategory).forEach(category => {
      const categoryAchievements = allAchievements.filter(a => a.category === category)
      const categoryUnlocked = categoryAchievements.filter(a => this.playerData.unlockedAchievements.has(a.id))
      byCategory[category as AchievementCategory] = categoryAchievements.length > 0 
        ? Math.floor((categoryUnlocked.length / categoryAchievements.length) * 100) 
        : 0
    })

    Object.keys(byTier).forEach(tier => {
      const tierAchievements = allAchievements.filter(a => a.tier === tier)
      const tierUnlocked = tierAchievements.filter(a => this.playerData.unlockedAchievements.has(a.id))
      byTier[tier as AchievementTier] = tierAchievements.length > 0 
        ? Math.floor((tierUnlocked.length / tierAchievements.length) * 100) 
        : 0
    })

    return {
      overall: Math.floor((unlockedCount / allAchievements.length) * 100),
      byCategory,
      byTier
    }
  }

  /**
   * プレイヤーデータを取得
   */
  getPlayerData(): PlayerAchievements {
    return {
      ...this.playerData,
      unlockedAchievements: new Set(this.playerData.unlockedAchievements),
      achievementProgress: new Map(this.playerData.achievementProgress),
      unlockedCards: new Set(this.playerData.unlockedCards),
      unlockedCustomizations: new Set(this.playerData.unlockedCustomizations),
      unlockedTitles: new Set(this.playerData.unlockedTitles)
    }
  }

  /**
   * 称号を設定
   */
  setCurrentTitle(title: string): boolean {
    if (this.playerData.unlockedTitles.has(title)) {
      this.playerData.currentTitle = title
      return true
    }
    return false
  }

  /**
   * 状態保存用データ取得
   */
  getSerializableState(): {
    unlockedAchievements: string[]
    achievementProgress: Record<string, number>
    totalPoints: number
    unlockedCards: string[]
    unlockedCustomizations: string[]
    unlockedTitles: string[]
    currentTitle?: string
  } {
    return {
      unlockedAchievements: Array.from(this.playerData.unlockedAchievements),
      achievementProgress: Object.fromEntries(this.playerData.achievementProgress),
      totalPoints: this.playerData.totalPoints,
      unlockedCards: Array.from(this.playerData.unlockedCards),
      unlockedCustomizations: Array.from(this.playerData.unlockedCustomizations),
      unlockedTitles: Array.from(this.playerData.unlockedTitles),
      currentTitle: this.playerData.currentTitle
    }
  }

  /**
   * 状態復元
   */
  loadState(state: {
    unlockedAchievements: string[]
    achievementProgress: Record<string, number>
    totalPoints: number
    unlockedCards: string[]
    unlockedCustomizations: string[]
    unlockedTitles: string[]
    currentTitle?: string
  }): void {
    this.playerData = {
      unlockedAchievements: new Set(state.unlockedAchievements),
      achievementProgress: new Map(Object.entries(state.achievementProgress)),
      totalPoints: state.totalPoints,
      unlockedCards: new Set(state.unlockedCards),
      unlockedCustomizations: new Set(state.unlockedCustomizations),
      unlockedTitles: new Set(state.unlockedTitles),
      currentTitle: state.currentTitle
    }
  }

  /**
   * リセット
   */
  reset(): void {
    this.playerData = {
      unlockedAchievements: new Set(),
      achievementProgress: new Map(),
      totalPoints: 0,
      unlockedCards: new Set(),
      unlockedCustomizations: new Set(),
      unlockedTitles: new Set()
    }
  }
}

/**
 * グローバル達成システムインスタンス
 */
export const achievementSystem = new AchievementSystem()