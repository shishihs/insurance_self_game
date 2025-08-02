/**
 * 多次元スコアリングシステム
 * プレイヤーのモチベーションを高める包括的なスコア計算システム
 */

import type { Card } from '../../domain/entities/Card'
import type { Difficulty, GameStage } from '../../domain/types/card.types'
import type { PlayerStats } from '../../domain/types/game.types'

/**
 * スコア種別
 */
export type ScoreType = 
  | 'base'          // 基本スコア
  | 'efficiency'    // 効率性ボーナス
  | 'streak'        // 連続成功ボーナス
  | 'difficulty'    // 難易度補正
  | 'time'          // 時間ボーナス
  | 'perfect'       // 完璧プレイ報酬
  | 'stage'         // ステージクリアボーナス
  | 'total'         // 総合スコア

/**
 * スコア詳細
 */
export interface ScoreBreakdown {
  base: number
  efficiency: number
  streak: number
  difficulty: number
  time: number
  perfect: number
  stage: number
  total: number
}

/**
 * スコア計算パラメータ
 */
export interface ScoringParameters {
  challengePower: number
  playerPower: number
  turnsUsed: number
  vitalityRemaining: number
  maxVitality: number
  insuranceBurden: number
  stage: GameStage
  difficulty: Difficulty
  isSuccess: boolean
  isFirstClear: boolean
  consecutiveSuccesses: number
  perfectPlay: boolean // ダメージゼロ、最小ターン等
  gameStartTime: Date
  challengeStartTime: Date
}

/**
 * 難易度別スコア倍率
 */
const DIFFICULTY_MULTIPLIERS: Record<Difficulty, number> = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.3,
  expert: 1.6
}

/**
 * ステージ別基本スコア
 */
const STAGE_BASE_SCORES: Record<GameStage, number> = {
  youth: 100,
  middle_age: 150,
  fulfillment: 200
}

/**
 * ボーナス係数
 */
const BONUS_MULTIPLIERS = {
  efficiency: {
    excellent: 2.0,  // パワー効率200%以上
    good: 1.5,       // パワー効率150%以上
    normal: 1.0      // パワー効率100%未満
  },
  streak: {
    base: 0.1,       // 連続成功1回につき10%ボーナス
    max: 2.0         // 最大200%まで
  },
  time: {
    fast: 1.5,       // 素早いクリア（30秒未満）
    normal: 1.0,     // 通常クリア
    slow: 0.8        // 遅いクリア（2分以上）
  },
  perfect: {
    noDamage: 500,   // ダメージなし
    minTurns: 300,   // 最小ターン数
    fullHealth: 200  // 最大体力維持
  }
}

/**
 * 多次元スコアリングシステム
 */
export class ScoringSystem {
  private streakCounter: number = 0
  private bestScores: Map<string, number> = new Map()
  private scoreHistory: ScoreBreakdown[] = []

  /**
   * チャレンジスコアを計算
   */
  calculateChallengeScore(params: ScoringParameters): ScoreBreakdown {
    const breakdown: ScoreBreakdown = {
      base: 0,
      efficiency: 0,
      streak: 0,
      difficulty: 0,
      time: 0,
      perfect: 0,
      stage: 0,
      total: 0
    }

    // 失敗した場合は基本スコアのみ（小額）
    if (!params.isSuccess) {
      breakdown.base = Math.floor(STAGE_BASE_SCORES[params.stage] * 0.1)
      breakdown.total = breakdown.base
      this.streakCounter = 0 // 連続記録リセット
      return breakdown
    }

    // 1. 基本スコア計算
    breakdown.base = this.calculateBaseScore(params)

    // 2. 効率性ボーナス
    breakdown.efficiency = this.calculateEfficiencyBonus(params, breakdown.base)

    // 3. 連続成功ボーナス
    breakdown.streak = this.calculateStreakBonus(params, breakdown.base)

    // 4. 難易度補正
    breakdown.difficulty = this.calculateDifficultyBonus(params, breakdown.base)

    // 5. 時間ボーナス
    breakdown.time = this.calculateTimeBonus(params, breakdown.base)

    // 6. 完璧プレイ報酬
    breakdown.perfect = this.calculatePerfectBonus(params)

    // 7. ステージクリアボーナス
    breakdown.stage = this.calculateStageBonus(params)

    // 8. 総合スコア
    breakdown.total = Math.floor(
      breakdown.base + 
      breakdown.efficiency + 
      breakdown.streak + 
      breakdown.difficulty + 
      breakdown.time + 
      breakdown.perfect + 
      breakdown.stage
    )

    // 連続成功カウンターを更新
    this.streakCounter = params.consecutiveSuccesses + 1

    // スコア履歴に追加
    this.scoreHistory.push(breakdown)

    return breakdown
  }

  /**
   * 基本スコア計算
   */
  private calculateBaseScore(params: ScoringParameters): number {
    const stageBase = STAGE_BASE_SCORES[params.stage]
    const powerRatio = Math.min(params.playerPower / params.challengePower, 3.0) // 最大3倍まで
    
    return Math.floor(stageBase * powerRatio)
  }

  /**
   * 効率性ボーナス計算
   */
  private calculateEfficiencyBonus(params: ScoringParameters, baseScore: number): number {
    const efficiency = params.playerPower / params.challengePower
    
    let multiplier = BONUS_MULTIPLIERS.efficiency.normal
    if (efficiency >= 2.0) {
      multiplier = BONUS_MULTIPLIERS.efficiency.excellent
    } else if (efficiency >= 1.5) {
      multiplier = BONUS_MULTIPLIERS.efficiency.good
    }

    return Math.floor(baseScore * (multiplier - 1.0))
  }

  /**
   * 連続成功ボーナス計算
   */
  private calculateStreakBonus(params: ScoringParameters, baseScore: number): number {
    const streakBonus = Math.min(
      params.consecutiveSuccesses * BONUS_MULTIPLIERS.streak.base,
      BONUS_MULTIPLIERS.streak.max
    )
    
    return Math.floor(baseScore * streakBonus)
  }

  /**
   * 難易度補正計算
   */
  private calculateDifficultyBonus(params: ScoringParameters, baseScore: number): number {
    const multiplier = DIFFICULTY_MULTIPLIERS[params.difficulty] - 1.0
    return Math.floor(baseScore * multiplier)
  }

  /**
   * 時間ボーナス計算
   */
  private calculateTimeBonus(params: ScoringParameters, baseScore: number): number {
    const challengeTime = params.challengeStartTime.getTime() - params.gameStartTime.getTime()
    const seconds = challengeTime / 1000

    let multiplier = BONUS_MULTIPLIERS.time.normal
    if (seconds < 30) {
      multiplier = BONUS_MULTIPLIERS.time.fast
    } else if (seconds > 120) {
      multiplier = BONUS_MULTIPLIERS.time.slow
    }

    return Math.floor(baseScore * (multiplier - 1.0))
  }

  /**
   * 完璧プレイ報酬計算
   */
  private calculatePerfectBonus(params: ScoringParameters): number {
    let perfectScore = 0

    // ダメージなしボーナス
    if (params.vitalityRemaining === params.maxVitality) {
      perfectScore += BONUS_MULTIPLIERS.perfect.noDamage
    }

    // 最小ターンボーナス（推定）
    const estimatedMinTurns = Math.ceil(params.challengePower / 30) // 平均的なカード1枚のパワーを30と仮定
    if (params.turnsUsed <= estimatedMinTurns) {
      perfectScore += BONUS_MULTIPLIERS.perfect.minTurns
    }

    // 体力90%以上維持ボーナス
    if (params.vitalityRemaining >= params.maxVitality * 0.9) {
      perfectScore += BONUS_MULTIPLIERS.perfect.fullHealth
    }

    return perfectScore
  }

  /**
   * ステージクリアボーナス計算
   */
  private calculateStageBonus(params: ScoringParameters): number {
    if (params.isFirstClear) {
      return STAGE_BASE_SCORES[params.stage] * 2 // 初回クリアは2倍
    }
    return 0
  }

  /**
   * ゲーム終了時の総合スコア計算
   */
  calculateFinalScore(stats: PlayerStats, gameConfig: {
    difficulty: Difficulty
    totalGameTime: number
    stagesCleared: GameStage[]
    perfectStages: GameStage[]
  }): {
    gameplayScore: number
    completionBonus: number
    timeBonus: number
    difficultyBonus: number
    perfectBonus: number
    totalScore: number
    rank: string
  } {
    // ゲームプレイスコア（全チャレンジの合計）
    const gameplayScore = this.scoreHistory.reduce((sum, score) => sum + score.total, 0)

    // 完了ボーナス
    const completionBonus = gameConfig.stagesCleared.length * 1000

    // 時間ボーナス（効率的なクリア）
    const averageTimePerStage = gameConfig.totalGameTime / gameConfig.stagesCleared.length
    const timeBonus = averageTimePerStage < 300 ? 2000 : averageTimePerStage < 600 ? 1000 : 0

    // 難易度ボーナス
    const difficultyBonus = Math.floor(gameplayScore * (DIFFICULTY_MULTIPLIERS[gameConfig.difficulty] - 1.0))

    // パーフェクトボーナス
    const perfectBonus = gameConfig.perfectStages.length * 3000

    // 総合スコア
    const totalScore = gameplayScore + completionBonus + timeBonus + difficultyBonus + perfectBonus

    // ランク判定
    const rank = this.calculateRank(totalScore, gameConfig.difficulty)

    return {
      gameplayScore,
      completionBonus,
      timeBonus,
      difficultyBonus,
      perfectBonus,
      totalScore,
      rank
    }
  }

  /**
   * ランク判定
   */
  private calculateRank(score: number, difficulty: Difficulty): string {
    const thresholds = {
      easy: { S: 15000, A: 12000, B: 9000, C: 6000 },
      normal: { S: 20000, A: 15000, B: 12000, C: 8000 },
      hard: { S: 25000, A: 20000, B: 15000, C: 10000 },
      expert: { S: 35000, A: 28000, B: 20000, C: 15000 }
    }

    const threshold = thresholds[difficulty]
    
    if (score >= threshold.S) return 'S'
    if (score >= threshold.A) return 'A'
    if (score >= threshold.B) return 'B'
    if (score >= threshold.C) return 'C'
    return 'D'
  }

  /**
   * ベストスコア更新
   */
  updateBestScore(key: string, score: number): boolean {
    const currentBest = this.bestScores.get(key) || 0
    if (score > currentBest) {
      this.bestScores.set(key, score)
      return true
    }
    return false
  }

  /**
   * ベストスコア取得
   */
  getBestScore(key: string): number {
    return this.bestScores.get(key) || 0
  }

  /**
   * スコア履歴取得
   */
  getScoreHistory(): ScoreBreakdown[] {
    return [...this.scoreHistory]
  }

  /**
   * 統計情報取得
   */
  getStatistics(): {
    totalGames: number
    averageScore: number
    bestScore: number
    currentStreak: number
    maxStreak: number
  } {
    const totalScores = this.scoreHistory.map(s => s.total)
    const maxStreak = Math.max(...this.scoreHistory.map((_, i, arr) => {
      let streak = 0
      for (let j = i; j < arr.length && arr[j].total > 0; j++) {
        streak++
      }
      return streak
    }), 0)

    return {
      totalGames: this.scoreHistory.length,
      averageScore: totalScores.length > 0 ? Math.floor(totalScores.reduce((a, b) => a + b, 0) / totalScores.length) : 0,
      bestScore: Math.max(...totalScores, 0),
      currentStreak: this.streakCounter,
      maxStreak
    }
  }

  /**
   * リセット
   */
  reset(): void {
    this.streakCounter = 0
    this.scoreHistory = []
  }

  /**
   * 状態保存用データ取得
   */
  getSerializableState(): {
    streakCounter: number
    bestScores: Record<string, number>
    scoreHistory: ScoreBreakdown[]
  } {
    return {
      streakCounter: this.streakCounter,
      bestScores: Object.fromEntries(this.bestScores),
      scoreHistory: this.scoreHistory
    }
  }

  /**
   * 状態復元
   */
  loadState(state: {
    streakCounter: number
    bestScores: Record<string, number>
    scoreHistory: ScoreBreakdown[]
  }): void {
    this.streakCounter = state.streakCounter
    this.bestScores = new Map(Object.entries(state.bestScores))
    this.scoreHistory = state.scoreHistory
  }
}

/**
 * グローバルスコアリングシステムインスタンス
 */
export const scoringSystem = new ScoringSystem()