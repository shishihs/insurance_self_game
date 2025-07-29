import { Card } from '../entities/Card'
import type { GameStage } from '../types/card.types'
import type { PlayerStats } from '../types/game.types'

/**
 * アチーブメント種別
 */
export type AchievementType = 
  | 'challenge_master'     // チャレンジ系
  | 'card_collector'       // カード収集系
  | 'survival_expert'      // 生存系
  | 'insurance_guru'       // 保険系
  | 'skill_master'         // スキル系
  | 'combo_artist'         // コンボ系
  | 'legendary_achiever'   // レジェンダリー系

/**
 * アチーブメントデータ
 */
export interface Achievement {
  id: string
  name: string
  description: string
  type: AchievementType
  condition: string
  reward: {
    experience: number
    unlockCards?: string[]
    permanentBonus?: {
      type: 'vitality' | 'power' | 'insurance_discount'
      value: number
    }
  }
  isUnlocked: boolean
  progress: number
  maxProgress: number
  unlockedAt?: Date
}

/**
 * プレイヤー実績データ
 */
export interface PlayerAchievements {
  achievements: Achievement[]
  totalExperience: number
  unlockedBonuses: Array<{
    type: 'vitality' | 'power' | 'insurance_discount'
    value: number
    source: string
  }>
}

/**
 * アチーブメントシステムサービス
 * 実績の管理、進捗追跡、報酬付与を担当
 */
export class AchievementSystemService {
  
  /**
   * 全アチーブメントの定義を取得
   */
  static getAllAchievements(): Achievement[] {
    return [
      // チャレンジ系
      {
        id: 'first_victory',
        name: '初勝利',
        description: '初めてチャレンジに成功する',
        type: 'challenge_master',
        condition: 'successfulChallenges >= 1',
        reward: { experience: 100 },
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'challenge_streak_5',
        name: '連勝街道',
        description: '5回連続でチャレンジに成功する',
        type: 'challenge_master',
        condition: 'consecutiveSuccesses >= 5',
        reward: { 
          experience: 500,
          permanentBonus: { type: 'power', value: 2 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 5
      },
      {
        id: 'master_challenger',
        name: 'チャレンジマスター',
        description: '通算50回チャレンジに成功する',
        type: 'challenge_master',
        condition: 'successfulChallenges >= 50',
        reward: { 
          experience: 2000,
          unlockCards: ['人生の達人'],
          permanentBonus: { type: 'power', value: 5 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 50
      },

      // カード収集系
      {
        id: 'card_collector_basic',
        name: '初心者コレクター',
        description: '10種類のカードを獲得する',
        type: 'card_collector',
        condition: 'uniqueCardsAcquired >= 10',
        reward: { experience: 200 },
        isUnlocked: false,
        progress: 0,
        maxProgress: 10
      },
      {
        id: 'legendary_collector',
        name: 'レジェンダリーコレクター',
        description: 'レジェンダリーカードを3枚獲得する',
        type: 'card_collector',
        condition: 'legendaryCardsAcquired >= 3',
        reward: { 
          experience: 3000,
          permanentBonus: { type: 'vitality', value: 20 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 3
      },

      // 生存系
      {
        id: 'survivor',
        name: 'サバイバー',
        description: '活力1で1ターン生き延びる',
        type: 'survival_expert',
        condition: 'survivedWithLowVitality >= 1',
        reward: { experience: 300 },
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'vitality_master',
        name: '活力の達人',
        description: '活力を最大値の150%まで回復する',
        type: 'survival_expert',
        condition: 'maxVitalityReached >= 150',
        reward: { 
          experience: 1000,
          permanentBonus: { type: 'vitality', value: 10 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 150
      },

      // 保険系
      {
        id: 'insurance_novice',
        name: '保険初心者',
        description: '初めて保険に加入する',
        type: 'insurance_guru',
        condition: 'insuranceCardsAcquired >= 1',
        reward: { experience: 150 },
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'insurance_master',
        name: '保険マスター',
        description: '5種類の異なる保険に同時加入する',
        type: 'insurance_guru',
        condition: 'simultaneousInsuranceTypes >= 5',
        reward: { 
          experience: 1500,
          permanentBonus: { type: 'insurance_discount', value: 20 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 5
      },

      // スキル系
      {
        id: 'skill_learner',
        name: 'スキル学習者',
        description: '初めてスキルを習得する',
        type: 'skill_master',
        condition: 'skillsLearned >= 1',
        reward: { experience: 200 },
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'master_craftsman',
        name: '職人の域',
        description: 'スキルの熟練度を最大まで上げる',
        type: 'skill_master',
        condition: 'skillsMaxMastery >= 1',
        reward: { 
          experience: 1000,
          permanentBonus: { type: 'power', value: 3 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      },

      // コンボ系
      {
        id: 'combo_beginner',
        name: 'コンボ初心者',
        description: '初めてコンボを決める',
        type: 'combo_artist',
        condition: 'combosPerformed >= 1',
        reward: { experience: 250 },
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      },
      {
        id: 'combo_master',
        name: 'コンボマスター',
        description: '10回コンボを決める',
        type: 'combo_artist',
        condition: 'combosPerformed >= 10',
        reward: { 
          experience: 1200,
          permanentBonus: { type: 'power', value: 4 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 10
      },

      // レジェンダリー系
      {
        id: 'life_master',
        name: '人生の達人',
        description: '全ステージをクリアする',
        type: 'legendary_achiever',
        condition: 'allStagesCleared >= 1',
        reward: { 
          experience: 5000,
          unlockCards: ['完璧な調和'],
          permanentBonus: { type: 'vitality', value: 50 }
        },
        isUnlocked: false,
        progress: 0,
        maxProgress: 1
      }
    ]
  }

  /**
   * プレイヤーのアチーブメント進捗を更新
   */
  static updateProgress(
    achievements: PlayerAchievements,
    stats: PlayerStats & { [key: string]: any },
    gameData: { [key: string]: any }
  ): PlayerAchievements {
    let experienceGained = 0
    const newBonuses: typeof achievements.unlockedBonuses = []

    const updatedAchievements = achievements.achievements.map(achievement => {
      if (achievement.isUnlocked) {
        return achievement
      }

      const newProgress = this.calculateProgress(achievement, stats, gameData)
      const wasCompleted = achievement.progress >= achievement.maxProgress
      const isNowCompleted = newProgress >= achievement.maxProgress

      if (!wasCompleted && isNowCompleted) {
        // アチーブメント達成！
        experienceGained += achievement.reward.experience
        
        if (achievement.reward.permanentBonus) {
          newBonuses.push({
            ...achievement.reward.permanentBonus,
            source: achievement.name
          })
        }

        return {
          ...achievement,
          progress: newProgress,
          isUnlocked: true,
          unlockedAt: new Date()
        }
      }

      return {
        ...achievement,
        progress: newProgress
      }
    })

    return {
      achievements: updatedAchievements,
      totalExperience: achievements.totalExperience + experienceGained,
      unlockedBonuses: [...achievements.unlockedBonuses, ...newBonuses]
    }
  }

  /**
   * 特定のアチーブメントの進捗を計算
   */
  private static calculateProgress(
    achievement: Achievement,
    stats: PlayerStats & { [key: string]: any },
    gameData: { [key: string]: any }
  ): number {
    switch (achievement.id) {
      case 'first_victory':
      case 'master_challenger':
        return stats.successfulChallenges || 0
      
      case 'challenge_streak_5':
        return gameData.consecutiveSuccesses || 0
      
      case 'card_collector_basic':
        return gameData.uniqueCardsAcquired || 0
      
      case 'legendary_collector':
        return gameData.legendaryCardsAcquired || 0
      
      case 'survivor':
        return gameData.survivedWithLowVitality || 0
      
      case 'vitality_master':
        return gameData.maxVitalityReached || 0
      
      case 'insurance_novice':
        return gameData.insuranceCardsAcquired || 0
      
      case 'insurance_master':
        return gameData.simultaneousInsuranceTypes || 0
      
      case 'skill_learner':
        return gameData.skillsLearned || 0
      
      case 'master_craftsman':
        return gameData.skillsMaxMastery || 0
      
      case 'combo_beginner':
      case 'combo_master':
        return gameData.combosPerformed || 0
      
      case 'life_master':
        return gameData.allStagesCleared || 0
      
      default:
        return 0
    }
  }

  /**
   * 新しく達成されたアチーブメントを取得
   */
  static getNewlyUnlockedAchievements(achievements: PlayerAchievements): Achievement[] {
    const oneMinuteAgo = new Date(Date.now() - 60000)
    return achievements.achievements.filter(achievement => 
      achievement.isUnlocked && 
      achievement.unlockedAt && 
      achievement.unlockedAt > oneMinuteAgo
    )
  }

  /**
   * アチーブメントによる永続ボーナスを計算
   */
  static calculateTotalBonuses(achievements: PlayerAchievements): {
    vitalityBonus: number
    powerBonus: number
    insuranceDiscount: number
  } {
    const bonuses = achievements.unlockedBonuses

    return {
      vitalityBonus: bonuses
        .filter(bonus => bonus.type === 'vitality')
        .reduce((sum, bonus) => sum + bonus.value, 0),
      
      powerBonus: bonuses
        .filter(bonus => bonus.type === 'power')
        .reduce((sum, bonus) => sum + bonus.value, 0),
      
      insuranceDiscount: bonuses
        .filter(bonus => bonus.type === 'insurance_discount')
        .reduce((sum, bonus) => sum + bonus.value, 0)
    }
  }

  /**
   * アチーブメント進捗の表示用文字列を生成
   */
  static formatProgress(achievement: Achievement): string {
    if (achievement.isUnlocked) {
      return '達成済み'
    }
    
    const percentage = Math.floor((achievement.progress / achievement.maxProgress) * 100)
    return `${achievement.progress}/${achievement.maxProgress} (${percentage}%)`
  }

  /**
   * 次に達成しやすいアチーブメントを提案
   */
  static suggestNextAchievements(achievements: PlayerAchievements, limit: number = 3): Achievement[] {
    const unlockedAchievements = achievements.achievements
      .filter(achievement => !achievement.isUnlocked)
      .map(achievement => ({
        ...achievement,
        progressPercentage: achievement.progress / achievement.maxProgress
      }))
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, limit)

    return unlockedAchievements
  }

  /**
   * 初期プレイヤーアチーブメントデータを作成
   */
  static createInitialPlayerAchievements(): PlayerAchievements {
    return {
      achievements: this.getAllAchievements(),
      totalExperience: 0,
      unlockedBonuses: []
    }
  }
}