import { Card } from '../entities/Card'
import type { Difficulty, GameStage } from '../types/card.types'
import type { PlayerProgression } from './PlayerProgressionService'
import type { PlayerAchievements } from './AchievementSystemService'

/**
 * 動的難易度調整データ
 */
export interface DynamicDifficulty {
  baseDifficulty: Difficulty
  adjustmentFactor: number // -0.5 to +0.5
  currentChallengeLevel: number
  recentPerformance: number[] // 最近10ゲームの成功率
  adaptiveModifiers: {
    challengePowerModifier: number
    rewardMultiplier: number
    cardRarityBonus: number
    experienceModifier: number
  }
}

/**
 * バランス調整結果
 */
export interface BalanceAdjustment {
  adjustedPower: number
  rewardMultiplier: number
  experienceBonus: number
  recommendedStrategy: string
  difficultyExplanation: string
}

/**
 * 難易度バランスサービス
 * 動的難易度調整とゲームバランスを管理
 */
export class DifficultyBalanceService {
  
  /**
   * プレイヤーの実力に基づいて動的難易度を計算
   */
  static calculateDynamicDifficulty(
    progression: PlayerProgression,
    achievements: PlayerAchievements,
    stage: GameStage,
    recentPerformance?: number[]
  ): DynamicDifficulty {
    const playerLevel = progression.level.currentLevel
    const totalAchievements = achievements.achievements.filter(a => a.isUnlocked).length
    
    // ベース難易度を決定
    let baseDifficulty: Difficulty = 'normal'
    if (playerLevel >= 20 || totalAchievements >= 15) {
      baseDifficulty = 'hard'
    } else if (playerLevel >= 30 || totalAchievements >= 25) {
      baseDifficulty = 'expert'
    } else if (playerLevel <= 5 && totalAchievements <= 3) {
      baseDifficulty = 'easy'
    }

    // 最近のパフォーマンスを分析
    const performance = recentPerformance || []
    const averagePerformance = performance.length > 0 
      ? performance.reduce((sum, p) => sum + p, 0) / performance.length
      : 0.5 // デフォルト50%

    // 調整係数を計算（-0.5 to +0.5）
    let adjustmentFactor = 0
    if (averagePerformance < 0.3) {
      adjustmentFactor = -0.3 // 難易度を下げる
    } else if (averagePerformance > 0.8) {
      adjustmentFactor = 0.2 // 難易度を上げる
    }

    // ステージ別の調整
    const stageModifiers = {
      youth: 0,
      middle: 0.1,
      fulfillment: 0.2
    }
    adjustmentFactor += stageModifiers[stage]

    // チャレンジレベルを計算
    const challengeLevel = this.calculateChallengeLevel(playerLevel, totalAchievements, stage)

    // 適応的モディファイアを設定
    const adaptiveModifiers = {
      challengePowerModifier: 1 + adjustmentFactor,
      rewardMultiplier: 1 + (adjustmentFactor > 0 ? adjustmentFactor * 1.5 : 0),
      cardRarityBonus: Math.max(0, adjustmentFactor * 2),
      experienceModifier: 1 + Math.abs(adjustmentFactor) * 0.5
    }

    return {
      baseDifficulty,
      adjustmentFactor,
      currentChallengeLevel: challengeLevel,
      recentPerformance: performance,
      adaptiveModifiers
    }
  }

  /**
   * チャレンジカードのパワーを動的に調整
   */
  static adjustChallengePower(
    originalPower: number,
    difficulty: DynamicDifficulty,
    playerLevel: number
  ): BalanceAdjustment {
    let adjustedPower = originalPower

    // 基本難易度による調整
    const difficultyMultipliers = {
      easy: 0.8,
      normal: 1.0,
      hard: 1.3,
      expert: 1.6
    }
    adjustedPower *= difficultyMultipliers[difficulty.baseDifficulty]

    // 動的調整を適用
    adjustedPower *= difficulty.adaptiveModifiers.challengePowerModifier

    // プレイヤーレベルに応じた微調整
    const levelAdjustment = Math.max(0.7, 1 - (playerLevel - 1) * 0.02)
    adjustedPower *= levelAdjustment

    // 整数に丸める
    adjustedPower = Math.max(1, Math.round(adjustedPower))

    const rewardMultiplier = difficulty.adaptiveModifiers.rewardMultiplier
    const experienceBonus = Math.floor(originalPower * difficulty.adaptiveModifiers.experienceModifier)

    // 推奨戦略を決定
    const recommendedStrategy = this.getRecommendedStrategy(difficulty, playerLevel)
    
    // 難易度説明を生成
    const difficultyExplanation = this.generateDifficultyExplanation(difficulty, adjustedPower, originalPower)

    return {
      adjustedPower,
      rewardMultiplier,
      experienceBonus,
      recommendedStrategy,
      difficultyExplanation
    }
  }

  /**
   * チャレンジレベルを計算
   */
  private static calculateChallengeLevel(
    playerLevel: number,
    achievements: number,
    stage: GameStage
  ): number {
    const baseLevel = playerLevel
    const achievementBonus = Math.floor(achievements / 3)
    const stageBonus = { youth: 0, middle: 5, fulfillment: 10 }[stage]
    
    return baseLevel + achievementBonus + stageBonus
  }

  /**
   * 推奨戦略を決定
   */
  private static getRecommendedStrategy(difficulty: DynamicDifficulty, playerLevel: number): string {
    if (difficulty.adjustmentFactor < -0.2) {
      return '基本的な生存戦略：確実に勝てるチャレンジを選択し、リスクを避けてください'
    } if (difficulty.adjustmentFactor > 0.2) {
      return '積極的戦略：高難易度チャレンジで大きな報酬を狙い、コンボを活用してください'
    } if (playerLevel >= 15) {
      return 'バランス戦略：スキルとコンボを組み合わせて効率的にプレイしてください'
    } 
      return '成長戦略：新しいカードを積極的に獲得し、スキルを向上させてください'
    
  }

  /**
   * 難易度説明を生成
   */
  private static generateDifficultyExplanation(
    difficulty: DynamicDifficulty,
    adjustedPower: number,
    originalPower: number
  ): string {
    const powerChange = adjustedPower - originalPower
    let explanation = `難易度: ${difficulty.baseDifficulty.toUpperCase()}`

    if (powerChange > 0) {
      explanation += ` (${powerChange}上昇 - あなたの実力向上により難易度が上がりました)`
    } else if (powerChange < 0) {
      explanation += ` (${Math.abs(powerChange)}軽減 - バランス調整により難易度を下げました)`
    } else {
      explanation += ` (標準 - 現在のバランスが適切です)`
    }

    const performance = difficulty.recentPerformance
    if (performance.length > 0) {
      const avgPerformance = Math.floor(performance.reduce((sum, p) => sum + p, 0) / performance.length * 100)
      explanation += ` | 最近の成功率: ${avgPerformance}%`
    }

    return explanation
  }

  /**
   * 報酬の動的調整
   */
  static adjustRewards(
    baseReward: number,
    difficulty: DynamicDifficulty,
    challengeSuccess: boolean
  ): {
    adjustedReward: number
    bonusExperience: number
    rarityBonus: number
  } {
    let adjustedReward = baseReward

    if (challengeSuccess) {
      // 成功時の報酬調整
      adjustedReward *= difficulty.adaptiveModifiers.rewardMultiplier
      
      // 高難易度ボーナス
      const difficultyBonuses = {
        easy: 0.8,
        normal: 1.0,
        hard: 1.4,
        expert: 1.8
      }
      adjustedReward *= difficultyBonuses[difficulty.baseDifficulty]
    }

    const bonusExperience = Math.floor(baseReward * difficulty.adaptiveModifiers.experienceModifier)
    const rarityBonus = difficulty.adaptiveModifiers.cardRarityBonus

    return {
      adjustedReward: Math.floor(adjustedReward),
      bonusExperience,
      rarityBonus
    }
  }

  /**
   * カードレア度の出現確率を調整
   */
  static adjustCardRarity(
    baseRarityChances: { common: number, rare: number, epic: number, legendary: number },
    difficulty: DynamicDifficulty
  ): { common: number, rare: number, epic: number, legendary: number } {
    const bonus = difficulty.adaptiveModifiers.cardRarityBonus
    
    return {
      common: Math.max(0.1, baseRarityChances.common - bonus * 0.1),
      rare: baseRarityChances.rare + bonus * 0.05,
      epic: baseRarityChances.epic + bonus * 0.03,
      legendary: baseRarityChances.legendary + bonus * 0.02
    }
  }

  /**
   * フロー状態の検出（プレイヤーが最適な挑戦レベルにいるか）
   */
  static detectFlowState(
    difficulty: DynamicDifficulty,
    playerProgression: PlayerProgression
  ): {
    isInFlow: boolean
    flowScore: number // 0-100
    recommendations: string[]
  } {
    const performance = difficulty.recentPerformance
    const avgPerformance = performance.length > 0 
      ? performance.reduce((sum, p) => sum + p, 0) / performance.length
      : 0.5

    // フロー状態の理想は成功率60-75%
    const idealPerformance = 0.675
    const performanceDiff = Math.abs(avgPerformance - idealPerformance)
    
    // フロースコアを計算（理想的な成功率に近いほど高い）
    const flowScore = Math.max(0, 100 - (performanceDiff * 200))
    const isInFlow = flowScore >= 70

    const recommendations: string[] = []
    
    if (avgPerformance < 0.4) {
      recommendations.push('難易度を下げることを検討してください')
      recommendations.push('基本的なスキルの練習を重点的に行ってください')
    } else if (avgPerformance > 0.85) {
      recommendations.push('より高い難易度に挑戦してみてください')
      recommendations.push('新しいコンボや戦略を試してみてください')
    } else if (isInFlow) {
      recommendations.push('現在の難易度が最適です！')
      recommendations.push('この調子で継続してスキルを向上させてください')
    }

    return {
      isInFlow,
      flowScore: Math.floor(flowScore),
      recommendations
    }
  }

  /**
   * 長期的なバランス分析
   */
  static analyzeLongTermBalance(
    gameHistory: Array<{
      stage: GameStage
      difficulty: Difficulty
      success: boolean
      playerLevel: number
      sessionLength: number
    }>
  ): {
    overallBalance: 'too_easy' | 'balanced' | 'too_hard'
    stageBalance: Record<GameStage, number>
    recommendations: string[]
  } {
    if (gameHistory.length < 10) {
      return {
        overallBalance: 'balanced',
        stageBalance: { youth: 0.5, middle: 0.5, fulfillment: 0.5 },
        recommendations: ['より多くのデータが必要です']
      }
    }

    // 全体の成功率を計算
    const overallSuccessRate = gameHistory.reduce((sum, game) => sum + (game.success ? 1 : 0), 0) / gameHistory.length

    let overallBalance: 'too_easy' | 'balanced' | 'too_hard'
    if (overallSuccessRate < 0.4) {
      overallBalance = 'too_hard'
    } else if (overallSuccessRate > 0.8) {
      overallBalance = 'too_easy'
    } else {
      overallBalance = 'balanced'
    }

    // ステージ別バランス
    const stageBalance: Record<GameStage, number> = {
      youth: 0.5,
      middle: 0.5,
      fulfillment: 0.5
    }

    for (const stage of ['youth', 'middle', 'fulfillment'] as GameStage[]) {
      const stageGames = gameHistory.filter(game => game.stage === stage)
      if (stageGames.length > 0) {
        stageBalance[stage] = stageGames.reduce((sum, game) => sum + (game.success ? 1 : 0), 0) / stageGames.length
      }
    }

    // 推奨事項を生成
    const recommendations: string[] = []
    if (overallBalance === 'too_easy') {
      recommendations.push('全体的な難易度を上げることを検討してください')
    } else if (overallBalance === 'too_hard') {
      recommendations.push('全体的な難易度を下げることを検討してください')
    }

    Object.entries(stageBalance).forEach(([stage, rate]) => {
      if (rate < 0.3) {
        recommendations.push(`${stage}ステージの難易度を下げることを検討してください`)
      } else if (rate > 0.9) {
        recommendations.push(`${stage}ステージの難易度を上げることを検討してください`)
      }
    })

    return {
      overallBalance,
      stageBalance,
      recommendations
    }
  }

  /**
   * 初期動的難易度を作成
   */
  static createInitialDifficulty(): DynamicDifficulty {
    return {
      baseDifficulty: 'normal',
      adjustmentFactor: 0,
      currentChallengeLevel: 1,
      recentPerformance: [],
      adaptiveModifiers: {
        challengePowerModifier: 1.0,
        rewardMultiplier: 1.0,
        cardRarityBonus: 0,
        experienceModifier: 1.0
      }
    }
  }

  /**
   * パフォーマンス履歴を更新
   */
  static updatePerformanceHistory(
    difficulty: DynamicDifficulty,
    success: boolean
  ): DynamicDifficulty {
    const newPerformance = [...difficulty.recentPerformance, success ? 1 : 0]
    
    // 最新10ゲームのみ保持
    if (newPerformance.length > 10) {
      newPerformance.shift()
    }

    return {
      ...difficulty,
      recentPerformance: newPerformance
    }
  }
}