import type { GameStage } from '../types/card.types'
import type { PlayerAchievements } from './AchievementSystemService'

/**
 * プレイヤーレベルデータ
 */
export interface PlayerLevel {
  currentLevel: number
  currentExperience: number
  experienceToNext: number
  totalExperience: number
}

/**
 * レベルアップ報酬
 */
export interface LevelUpReward {
  level: number
  vitalityBonus: number
  unlockedFeatures?: string[]
  unlockedCards?: string[]
  skillPoints?: number
}

/**
 * プレイヤー進行データ
 */
export interface PlayerProgression {
  level: PlayerLevel
  skillPoints: number
  unlockedFeatures: string[]
  playTime: number // 分単位
  gamesPlayed: number
  bestStreak: number
  favoriteStrategy: string
}

/**
 * プレイヤー進行システムサービス
 * レベル、経験値、スキルポイントの管理を担当
 */
export class PlayerProgressionService {
  
  /**
   * レベルごとの必要経験値テーブル
   */
  private static readonly EXPERIENCE_TABLE: number[] = [
    0,     // Level 1
    100,   // Level 2
    250,   // Level 3
    450,   // Level 4
    700,   // Level 5
    1000,  // Level 6
    1350,  // Level 7
    1750,  // Level 8
    2200,  // Level 9
    2700,  // Level 10
    3250,  // Level 11
    3850,  // Level 12
    4500,  // Level 13
    5200,  // Level 14
    5950,  // Level 15
    6750,  // Level 16
    7600,  // Level 17
    8500,  // Level 18
    9450,  // Level 19
    10450, // Level 20
    11500, // Level 21
    12600, // Level 22
    13750, // Level 23
    14950, // Level 24
    16200, // Level 25
    17500, // Level 26
    18850, // Level 27
    20250, // Level 28
    21700, // Level 29
    23200, // Level 30 (最大レベル)
  ]

  /**
   * レベルアップ報酬テーブル
   */
  private static readonly LEVEL_REWARDS: LevelUpReward[] = [
    { level: 2, vitalityBonus: 5, skillPoints: 1 },
    { level: 3, vitalityBonus: 5, unlockedFeatures: ['スキルカード'] },
    { level: 4, vitalityBonus: 5, skillPoints: 1 },
    { level: 5, vitalityBonus: 10, unlockedFeatures: ['コンボシステム'], skillPoints: 2 },
    { level: 6, vitalityBonus: 5, skillPoints: 1 },
    { level: 7, vitalityBonus: 5, skillPoints: 1 },
    { level: 8, vitalityBonus: 5, skillPoints: 1 },
    { level: 9, vitalityBonus: 5, skillPoints: 1 },
    { level: 10, vitalityBonus: 15, unlockedFeatures: ['イベントカード'], skillPoints: 3 },
    { level: 11, vitalityBonus: 5, skillPoints: 1 },
    { level: 12, vitalityBonus: 5, skillPoints: 1 },
    { level: 13, vitalityBonus: 5, skillPoints: 1 },
    { level: 14, vitalityBonus: 5, skillPoints: 1 },
    { level: 15, vitalityBonus: 20, unlockedFeatures: ['レアスキル'], skillPoints: 4 },
    { level: 16, vitalityBonus: 5, skillPoints: 1 },
    { level: 17, vitalityBonus: 5, skillPoints: 1 },
    { level: 18, vitalityBonus: 5, skillPoints: 1 },
    { level: 19, vitalityBonus: 5, skillPoints: 1 },
    { level: 20, vitalityBonus: 25, unlockedFeatures: ['エピックスキル'], skillPoints: 5 },
    { level: 21, vitalityBonus: 5, skillPoints: 1 },
    { level: 22, vitalityBonus: 5, skillPoints: 1 },
    { level: 23, vitalityBonus: 5, skillPoints: 1 },
    { level: 24, vitalityBonus: 5, skillPoints: 1 },
    { level: 25, vitalityBonus: 30, unlockedFeatures: ['レジェンダリーカード'], skillPoints: 6 },
    { level: 26, vitalityBonus: 5, skillPoints: 1 },
    { level: 27, vitalityBonus: 5, skillPoints: 1 },
    { level: 28, vitalityBonus: 5, skillPoints: 1 },
    { level: 29, vitalityBonus: 5, skillPoints: 1 },
    { level: 30, vitalityBonus: 50, unlockedFeatures: ['マスターモード'], skillPoints: 10 }
  ]

  /**
   * 経験値を追加してレベルアップを処理
   */
  static addExperience(
    progression: PlayerProgression,
    experienceGained: number
  ): {
    updatedProgression: PlayerProgression
    levelUps: LevelUpReward[]
    newLevel: number
  } {
    const currentTotalExp = progression.level.totalExperience + experienceGained
    const newLevel = this.calculateLevelFromExperience(currentTotalExp)
    const currentLevel = progression.level.currentLevel

    // レベルアップした場合の報酬を計算
    const levelUps: LevelUpReward[] = []
    for (let level = currentLevel + 1; level <= newLevel; level++) {
      const reward = this.LEVEL_REWARDS.find(r => r.level === level)
      if (reward) {
        levelUps.push(reward)
      }
    }

    // スキルポイントを計算
    const totalSkillPoints = levelUps.reduce((sum, reward) => sum + (reward.skillPoints || 0), 0)

    // 新しい機能のアンロック
    const newUnlockedFeatures = levelUps
      .flatMap(reward => reward.unlockedFeatures || [])
      .filter(feature => !progression.unlockedFeatures.includes(feature))

    const updatedProgression: PlayerProgression = {
      ...progression,
      level: this.calculatePlayerLevel(currentTotalExp),
      skillPoints: progression.skillPoints + totalSkillPoints,
      unlockedFeatures: [...progression.unlockedFeatures, ...newUnlockedFeatures]
    }

    return {
      updatedProgression,
      levelUps,
      newLevel
    }
  }

  /**
   * 総経験値からレベルを計算
   */
  private static calculateLevelFromExperience(totalExperience: number): number {
    for (let level = this.EXPERIENCE_TABLE.length - 1; level >= 1; level--) {
      if (totalExperience >= this.EXPERIENCE_TABLE[level - 1]) {
        return Math.min(level, 30) // 最大レベル30
      }
    }
    return 1
  }

  /**
   * プレイヤーレベル情報を計算
   */
  private static calculatePlayerLevel(totalExperience: number): PlayerLevel {
    const currentLevel = this.calculateLevelFromExperience(totalExperience)
    const currentLevelExp = this.EXPERIENCE_TABLE[currentLevel - 1] || 0
    const nextLevelExp = this.EXPERIENCE_TABLE[currentLevel] || this.EXPERIENCE_TABLE[this.EXPERIENCE_TABLE.length - 1]
    
    const currentExperience = totalExperience - currentLevelExp
    const experienceToNext = nextLevelExp - totalExperience

    return {
      currentLevel,
      currentExperience,
      experienceToNext: Math.max(0, experienceToNext),
      totalExperience
    }
  }

  /**
   * レベルに応じた活力ボーナスを計算
   */
  static calculateVitalityBonus(level: number): number {
    return this.LEVEL_REWARDS
      .filter(reward => reward.level <= level)
      .reduce((sum, reward) => sum + reward.vitalityBonus, 0)
  }

  /**
   * 機能がアンロックされているかチェック
   */
  static isFeatureUnlocked(progression: PlayerProgression, feature: string): boolean {
    return progression.unlockedFeatures.includes(feature)
  }

  /**
   * レベルに応じた推奨戦略を取得
   */
  static getRecommendedStrategy(level: number, stage: GameStage): string {
    if (level <= 5) {
      return 'basic_survival'
    } else if (level <= 10) {
      return 'insurance_focused'
    } else if (level <= 15) {
      return 'skill_development' 
    } else if (level <= 20) {
      return 'combo_mastery'
    } else if (level <= 25) {
      return 'advanced_tactics'
    } else {
      return 'perfect_harmony'
    }
  }

  /**
   * プレゾン時間を更新
   */
  static updatePlayTime(progression: PlayerProgression, minutesPlayed: number): PlayerProgression {
    return {
      ...progression,
      playTime: progression.playTime + minutesPlayed
    }
  }

  /**
   * ゲーム終了時の統計を更新
   */
  static updateGameStats(
    progression: PlayerProgression,
    wasVictory: boolean,
    streak: number
  ): PlayerProgression {
    return {
      ...progression,
      gamesPlayed: progression.gamesPlayed + 1,
      bestStreak: Math.max(progression.bestStreak, streak)
    }
  }

  /**
   * 次のレベルまでの進捗率を計算
   */
  static getProgressToNextLevel(progression: PlayerProgression): number {
    const level = progression.level
    if (level.experienceToNext === 0) {
      return 100 // 最大レベル
    }
    
    const currentLevelExp = this.EXPERIENCE_TABLE[level.currentLevel - 1] || 0
    const nextLevelExp = this.EXPERIENCE_TABLE[level.currentLevel] || 0
    const expRange = nextLevelExp - currentLevelExp
    
    return Math.floor((level.currentExperience / expRange) * 100)
  }

  /**
   * プレイヤーのランクを計算
   */
  static getPlayerRank(level: number): string {
    if (level >= 30) return 'グランドマスター'
    if (level >= 25) return 'マスター'
    if (level >= 20) return 'エキスパート'
    if (level >= 15) return 'アドバンス'
    if (level >= 10) return 'インターミディエイト'
    if (level >= 5) return 'ビギナー'
    return 'ルーキー'
  }

  /**
   * 初期プレイヤー進行データを作成
   */
  static createInitialProgression(): PlayerProgression {
    return {
      level: {
        currentLevel: 1,
        currentExperience: 0,
        experienceToNext: 100,
        totalExperience: 0
      },
      skillPoints: 0,
      unlockedFeatures: ['基本カード'],
      playTime: 0,
      gamesPlayed: 0,
      bestStreak: 0,
      favoriteStrategy: 'basic_survival'
    }
  }

  /**
   * 経験値獲得のソース別ボーナス計算
   */
  static calculateExperienceBonus(
    baseExperience: number,
    source: 'challenge_success' | 'achievement' | 'combo' | 'survival' | 'perfect_game',
    level: number
  ): number {
    const sourceMultipliers = {
      'challenge_success': 1.0,
      'achievement': 1.2,
      'combo': 1.5,
      'survival': 2.0,
      'perfect_game': 3.0
    }

    // 高レベルほど経験値効率が下がる（バランス調整）
    const levelPenalty = Math.max(0.5, 1 - (level - 1) * 0.02)
    
    return Math.floor(baseExperience * sourceMultipliers[source] * levelPenalty)
  }

  /**
   * スキルポイントを消費
   */
  static spendSkillPoints(progression: PlayerProgression, amount: number): PlayerProgression {
    if (progression.skillPoints < amount) {
      throw new Error('Insufficient skill points')
    }

    return {
      ...progression,
      skillPoints: progression.skillPoints - amount
    }
  }

  /**
   * プレイヤーの総合的な強さを数値化
   */
  static calculatePlayerPower(progression: PlayerProgression, achievements: PlayerAchievements): number {
    const levelPower = progression.level.currentLevel * 10
    const expPower = Math.floor(progression.level.totalExperience / 100)
    const achievementPower = achievements.achievements.filter(a => a.isUnlocked).length * 50
    const playTimePower = Math.floor(progression.playTime / 60) * 5 // 1時間あたり5ポイント
    
    return levelPower + expPower + achievementPower + playTimePower
  }
}