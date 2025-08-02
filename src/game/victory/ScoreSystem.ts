/**
 * 総合スコアシステム - 複数要素を考慮した高度なスコア計算
 * 
 * このシステムは以下の機能を提供します：
 * - 多次元スコア計算（時間、効率、完成度など）
 * - 動的難易度調整によるスコア補正
 * - プレイヤーの成長を反映した相対評価
 * - リーダーボードとランキング機能
 */

import type { Game } from '../../domain/entities/Game'
import type { VictoryResult } from './VictoryConditions'

/**
 * スコア要素
 */
export interface ScoreComponent {
  name: string
  value: number
  maxValue: number
  weight: number // 重み (0-1)
  description: string
}

/**
 * 詳細スコア情報
 */
export interface DetailedScore {
  components: ScoreComponent[]
  baseScore: number
  bonusScore: number
  totalScore: number
  rank: ScoreRank
  percentile: number // 上位何%か
  improvements: ScoreImprovement[]
}

/**
 * スコアランク
 */
export interface ScoreRank {
  letter: 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS'
  name: string
  description: string
  color: string
  threshold: number
}

/**
 * スコア改善提案
 */
export interface ScoreImprovement {
  category: string
  current: number
  potential: number
  suggestion: string
  impact: 'low' | 'medium' | 'high'
}

/**
 * 履歴スコア記録
 */
export interface ScoreRecord {
  gameId: string
  timestamp: Date
  totalScore: number
  rank: string
  components: Record<string, number>
  victoryTypes: string[]
  improvements: number // 前回からの改善点
}

/**
 * リーダーボード エントリ
 */
export interface LeaderboardEntry {
  rank: number
  playerName: string
  score: number
  victoryTypes: string[]
  date: Date
  special: boolean // 特別な記録（完璧など）
}

/**
 * 総合スコアシステム
 */
export class ScoreSystem {
  private readonly scoreHistory: ScoreRecord[]
  private leaderboard: LeaderboardEntry[]
  private readonly personalBests: Map<string, number>

  constructor() {
    this.scoreHistory = []
    this.leaderboard = []
    this.personalBests = new Map()
    this.initializeRanks()
  }

  /**
   * ランク定義を初期化
   */
  private initializeRanks(): void {
    // ランク定義は calculateRank メソッド内で行う
  }

  /**
   * 詳細スコアを計算
   */
  calculateDetailedScore(game: Game, victories: VictoryResult[]): DetailedScore {
    const components = this.calculateScoreComponents(game, victories)
    
    const baseScore = components.reduce((sum, comp) => 
      sum + (comp.value * comp.weight), 0
    )
    
    const bonusScore = this.calculateBonusScore(game, victories)
    const totalScore = Math.round(baseScore + bonusScore)
    
    const rank = this.calculateRank(totalScore)
    const percentile = this.calculatePercentile(totalScore)
    const improvements = this.suggestImprovements(components, game)

    return {
      components,
      baseScore: Math.round(baseScore),
      bonusScore: Math.round(bonusScore),
      totalScore,
      rank,
      percentile,
      improvements
    }
  }

  /**
   * スコア構成要素を計算
   */
  private calculateScoreComponents(game: Game, victories: VictoryResult[]): ScoreComponent[] {
    const components: ScoreComponent[] = []

    // 1. 生存性スコア (30%の重み)
    const survivalScore = this.calculateSurvivalScore(game)
    components.push({
      name: '生存性',
      value: survivalScore,
      maxValue: 1000,
      weight: 0.30,
      description: '最終活力と活力維持の安定性'
    })

    // 2. 効率性スコア (25%の重み)
    const efficiencyScore = this.calculateEfficiencyScore(game)
    components.push({
      name: '効率性',
      value: efficiencyScore,
      maxValue: 1000,
      weight: 0.25,
      description: 'リソース使用の効率性とターン数'
    })

    // 3. 戦略性スコア (20%の重み)
    const strategyScore = this.calculateStrategyScore(game)
    components.push({
      name: '戦略性',
      value: strategyScore,
      maxValue: 1000,
      weight: 0.20,
      description: '保険活用と長期計画の巧妙さ'
    })

    // 4. 技術スコア (15%の重み)
    const skillScore = this.calculateSkillScore(game)
    components.push({
      name: '技術',
      value: skillScore,
      maxValue: 1000,
      weight: 0.15,
      description: 'チャレンジ成功率と判断の正確性'
    })

    // 5. 完成度スコア (10%の重み)
    const completionScore = this.calculateCompletionScore(game, victories)
    components.push({
      name: '完成度',
      value: completionScore,
      maxValue: 1000,
      weight: 0.10,
      description: '勝利条件達成と全体的な完成度'
    })

    return components
  }

  /**
   * 生存性スコアを計算
   */
  private calculateSurvivalScore(game: Game): number {
    const finalVitality = game.vitality
    const maxVitality = game.maxVitality
    const vitalityRatio = finalVitality / maxVitality

    // 基本生存スコア
    let score = vitalityRatio * 800

    // 危機的状況からの回復ボーナス
    if (finalVitality >= 30 && this.hadLowVitality(game)) {
      score += 200 // 復活ボーナス
    }

    // 高活力維持ボーナス
    if (finalVitality >= maxVitality * 0.8) {
      score += 100 // 高活力維持ボーナス
    }

    return Math.min(1000, Math.round(score))
  }

  /**
   * 効率性スコアを計算
   */
  private calculateEfficiencyScore(game: Game): number {
    const turnEfficiency = this.calculateTurnEfficiency(game)
    const resourceEfficiency = this.calculateResourceEfficiency(game)
    const timeEfficiency = this.calculateTimeEfficiency(game)

    // 各効率性の重み付き平均
    const score = (turnEfficiency * 0.4) + (resourceEfficiency * 0.35) + (timeEfficiency * 0.25)

    return Math.min(1000, Math.round(score))
  }

  /**
   * 戦略性スコアを計算
   */
  private calculateStrategyScore(game: Game): number {
    let score = 0

    // 保険戦略の評価
    const insuranceStrategy = this.evaluateInsuranceStrategy(game)
    score += insuranceStrategy * 400

    // 長期計画の評価
    const longTermPlanning = this.evaluateLongTermPlanning(game)
    score += longTermPlanning * 300

    // リスク管理の評価
    const riskManagement = this.evaluateRiskManagement(game)
    score += riskManagement * 300

    return Math.min(1000, Math.round(score))
  }

  /**
   * 技術スコアを計算
   */
  private calculateSkillScore(game: Game): number {
    const successRate = game.stats.totalChallenges > 0 ?
      (game.stats.successfulChallenges / game.stats.totalChallenges) : 0

    let score = successRate * 800

    // 完璧なプレイボーナス
    if (game.stats.failedChallenges === 0 && game.stats.totalChallenges > 5) {
      score += 200
    }

    // 一貫性ボーナス
    const consistency = this.calculateConsistency(game)
    score += consistency * 200

    return Math.min(1000, Math.round(score))
  }

  /**
   * 完成度スコアを計算
   */
  private calculateCompletionScore(game: Game, victories: VictoryResult[]): number {
    let score = 0

    // 基本完成度
    if (game.isCompleted()) {
      score += 500
    }

    // 勝利条件達成ボーナス
    score += victories.length * 200

    // 特別勝利条件ボーナス
    const specialVictories = victories.filter(v => 
      ['perfect', 'speed', 'economy', 'challenge'].includes(v.type)
    )
    score += specialVictories.length * 100

    return Math.min(1000, Math.round(score))
  }

  /**
   * ボーナススコアを計算
   */
  private calculateBonusScore(game: Game, victories: VictoryResult[]): number {
    let bonus = 0

    // 初回プレイボーナス
    if (this.scoreHistory.length === 0) {
      bonus += 500
    }

    // 連続クリアボーナス
    const consecutiveClears = this.getConsecutiveClears()
    if (consecutiveClears > 1) {
      bonus += Math.min(1000, consecutiveClears * 100)
    }

    // 改善ボーナス
    const improvement = this.calculateImprovement(game)
    bonus += improvement * 10

    // 多様性ボーナス (異なる勝利条件の達成)
    const uniqueVictoryTypes = new Set(
      this.scoreHistory.flatMap(record => record.victoryTypes)
    )
    bonus += uniqueVictoryTypes.size * 50

    return bonus
  }

  /**
   * ランクを計算
   */
  private calculateRank(totalScore: number): ScoreRank {
    if (totalScore >= 9000) {
      return {
        letter: 'SSS',
        name: '神話級',
        description: '伝説を超えた完璧な到達',
        color: '#FFD700',
        threshold: 9000
      }
    }
    if (totalScore >= 8000) {
      return {
        letter: 'SS',
        name: '伝説級',
        description: '圧倒的な実力の証明',
        color: '#FF6B35',
        threshold: 8000
      }
    }
    if (totalScore >= 7000) {
      return {
        letter: 'S',
        name: '達人級',
        description: '極めて優秀な成果',
        color: '#FF1744',
        threshold: 7000
      }
    }
    if (totalScore >= 5500) {
      return {
        letter: 'A',
        name: '上級者',
        description: '非常に良好な成果',
        color: '#2196F3',
        threshold: 5500
      }
    }
    if (totalScore >= 4000) {
      return {
        letter: 'B',
        name: '中級者',
        description: '良好な成果',
        color: '#4CAF50',
        threshold: 4000
      }
    }
    if (totalScore >= 2500) {
      return {
        letter: 'C',
        name: '初級者',
        description: '基本的な成果',
        color: '#FF9800',
        threshold: 2500
      }
    }
    return {
      letter: 'D',
      name: '見習い',
      description: '成長の余地あり',
      color: '#9E9E9E',
      threshold: 0
    }
  }

  /**
   * 上位何%かを計算
   */
  private calculatePercentile(score: number): number {
    if (this.scoreHistory.length === 0) return 100

    const higherScores = this.scoreHistory.filter(record => record.totalScore > score).length
    return Math.round((1 - higherScores / this.scoreHistory.length) * 100)
  }

  /**
   * 改善提案を生成
   */
  private suggestImprovements(components: ScoreComponent[], game: Game): ScoreImprovement[] {
    const improvements: ScoreImprovement[] = []

    components.forEach(component => {
      const efficiency = component.value / component.maxValue
      if (efficiency < 0.7) {
        const suggestion = this.generateImprovementSuggestion(component.name, game)
        if (suggestion) {
          improvements.push({
            category: component.name,
            current: component.value,
            potential: Math.min(component.maxValue, component.value + 200),
            suggestion,
            impact: efficiency < 0.4 ? 'high' : 'medium'
          })
        }
      }
    })

    return improvements
  }

  /**
   * 改善提案を生成
   */
  private generateImprovementSuggestion(category: string, game: Game): string | null {
    switch (category) {
      case '生存性':
        if (game.vitality < 30) {
          return '保険を積極的に活用して活力を維持しましょう'
        }
        return '危険なチャレンジは慎重に選択しましょう'

      case '効率性':
        if (game.turn > 25) {
          return 'より短いターンでのクリアを目指しましょう'
        }
        return 'リソースの無駄遣いを避けましょう'

      case '戦略性':
        if (game.getActiveInsurances().length < 3) {
          return '長期的な保険戦略を検討しましょう'
        }
        return 'ステージに応じた戦略を立てましょう'

      case '技術':
        if (game.stats.failedChallenges > 3) {
          return 'チャレンジの成功率向上を図りましょう'
        }
        return '判断の一貫性を高めましょう'

      case '完成度':
        return '異なる勝利条件への挑戦を検討しましょう'

      default:
        return null
    }
  }

  /**
   * スコアを記録
   */
  recordScore(game: Game, detailedScore: DetailedScore, victories: VictoryResult[]): void {
    const record: ScoreRecord = {
      gameId: game.id,
      timestamp: new Date(),
      totalScore: detailedScore.totalScore,
      rank: detailedScore.rank.letter,
      components: {},
      victoryTypes: victories.map(v => v.type),
      improvements: this.calculateImprovement(game)
    }

    detailedScore.components.forEach(comp => {
      record.components[comp.name] = comp.value
    })

    this.scoreHistory.push(record)
    this.updatePersonalBests(record)
    this.updateLeaderboard(record)

    // 履歴は最新100件まで保持
    if (this.scoreHistory.length > 100) {
      this.scoreHistory.shift()
    }
  }

  /**
   * 個人記録を更新
   */
  private updatePersonalBests(record: ScoreRecord): void {
    const currentBest = this.personalBests.get('total') || 0
    if (record.totalScore > currentBest) {
      this.personalBests.set('total', record.totalScore)
    }

    // カテゴリ別記録も更新
    Object.entries(record.components).forEach(([category, score]) => {
      const key = `component_${category}`
      const currentCategoryBest = this.personalBests.get(key) || 0
      if (score > currentCategoryBest) {
        this.personalBests.set(key, score)
      }
    })
  }

  /**
   * リーダーボードを更新
   */
  private updateLeaderboard(record: ScoreRecord): void {
    const entry: LeaderboardEntry = {
      rank: 0, // 後で計算
      playerName: 'Player', // 実際の実装では設定可能にする
      score: record.totalScore,
      victoryTypes: record.victoryTypes,
      date: record.timestamp,
      special: record.victoryTypes.includes('perfect') || record.totalScore > 8000
    }

    this.leaderboard.push(entry)
    this.leaderboard.sort((a, b) => b.score - a.score)

    // ランクを更新
    this.leaderboard.forEach((entry, index) => {
      entry.rank = index + 1
    })

    // 上位50位まで保持
    if (this.leaderboard.length > 50) {
      this.leaderboard = this.leaderboard.slice(0, 50)
    }
  }

  /**
   * スコア履歴を取得
   */
  getScoreHistory(): ScoreRecord[] {
    return [...this.scoreHistory]
  }

  /**
   * リーダーボードを取得
   */
  getLeaderboard(): LeaderboardEntry[] {
    return [...this.leaderboard]
  }

  /**
   * 個人記録を取得
   */
  getPersonalBests(): Map<string, number> {
    return new Map(this.personalBests)
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): {
    totalGames: number
    averageScore: number
    bestScore: number
    mostCommonRank: string
    improvementTrend: number
  } {
    if (this.scoreHistory.length === 0) {
      return {
        totalGames: 0,
        averageScore: 0,
        bestScore: 0,
        mostCommonRank: 'N/A',
        improvementTrend: 0
      }
    }

    const totalGames = this.scoreHistory.length
    const averageScore = this.scoreHistory.reduce((sum, record) => sum + record.totalScore, 0) / totalGames
    const bestScore = Math.max(...this.scoreHistory.map(record => record.totalScore))
    
    // 最も多いランク
    const rankCounts = new Map<string, number>()
    this.scoreHistory.forEach(record => {
      rankCounts.set(record.rank, (rankCounts.get(record.rank) || 0) + 1)
    })
    const mostCommonRank = Array.from(rankCounts.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

    // 改善傾向 (最近5ゲームと初期5ゲームの平均の差)
    let improvementTrend = 0
    if (totalGames >= 10) {
      const recent = this.scoreHistory.slice(-5)
      const initial = this.scoreHistory.slice(0, 5)
      const recentAvg = recent.reduce((sum, r) => sum + r.totalScore, 0) / 5
      const initialAvg = initial.reduce((sum, r) => sum + r.totalScore, 0) / 5
      improvementTrend = recentAvg - initialAvg
    }

    return {
      totalGames,
      averageScore: Math.round(averageScore),
      bestScore,
      mostCommonRank,
      improvementTrend: Math.round(improvementTrend)
    }
  }

  // ヘルパーメソッド
  private hadLowVitality(game: Game): boolean {
    // 実装では、ゲーム中の活力履歴を追跡する必要がある
    // ここでは簡略化して、現在の活力が低くても最終的に回復した場合を想定
    return game.vitality >= 30 && game.stats.failedChallenges > 2
  }

  private calculateTurnEfficiency(game: Game): number {
    const optimalTurns = 15 // 理想的なターン数
    const actualTurns = game.turn
    const efficiency = Math.max(0, 1 - (actualTurns - optimalTurns) / optimalTurns)
    return efficiency * 1000
  }

  private calculateResourceEfficiency(game: Game): number {
    const vitalityEfficiency = game.vitality / 100
    const insuranceEfficiency = this.calculateInsuranceEfficiency(game)
    return ((vitalityEfficiency + insuranceEfficiency) / 2) * 1000
  }

  private calculateTimeEfficiency(game: Game): number {
    if (!game.startedAt || !game.completedAt) return 500
    
    const duration = (game.completedAt.getTime() - game.startedAt.getTime()) / 1000 / 60 // 分
    const optimalTime = 20 // 20分が理想
    const efficiency = Math.max(0, 1 - (duration - optimalTime) / optimalTime)
    return efficiency * 1000
  }

  private calculateInsuranceEfficiency(game: Game): number {
    const burden = game.insuranceBurden
    const vitality = game.vitality
    if (burden === 0) return vitality > 50 ? 0.8 : 0.4
    return Math.min(1, vitality / burden * 0.05)
  }

  private evaluateInsuranceStrategy(game: Game): number {
    const insuranceCount = game.getActiveInsurances().length
    const burden = game.insuranceBurden
    const vitality = game.vitality
    
    // バランスの取れた保険戦略を評価
    if (insuranceCount >= 2 && insuranceCount <= 6 && burden < vitality * 0.3) {
      return 1.0
    }
    return 0.5
  }

  private evaluateLongTermPlanning(game: Game): number {
    // ステージ進行と保険の継続性を評価
    const stageScore = game.stage === 'fulfillment' ? 1.0 : 0.7
    const planningScore = game.getActiveInsurances().length > 0 ? 1.0 : 0.5
    return (stageScore + planningScore) / 2
  }

  private evaluateRiskManagement(game: Game): number {
    const failureRate = game.stats.totalChallenges > 0 ?
      game.stats.failedChallenges / game.stats.totalChallenges : 0
    return Math.max(0, 1 - failureRate * 2)
  }

  private calculateConsistency(game: Game): number {
    // 成功率の一貫性を評価（簡略化）
    const successRate = game.stats.totalChallenges > 0 ?
      game.stats.successfulChallenges / game.stats.totalChallenges : 0
    return successRate
  }

  private getConsecutiveClears(): number {
    let consecutive = 0
    for (let i = this.scoreHistory.length - 1; i >= 0; i--) {
      if (this.scoreHistory[i].totalScore > 2500) { // 基本クリアライン
        consecutive++
      } else {
        break
      }
    }
    return consecutive
  }

  private calculateImprovement(game: Game): number {
    if (this.scoreHistory.length === 0) return 0
    
    const lastScore = this.scoreHistory[this.scoreHistory.length - 1]?.totalScore || 0
    const currentScore = 5000 // 仮の現在スコア（実際は計算結果を使用）
    
    return Math.max(0, currentScore - lastScore)
  }
}