/**
 * 勝利条件判定エンジン - ゲーム進行に合わせた勝利判定とスコア管理
 * 
 * このエンジンは以下の機能を提供します：
 * - リアルタイム勝利条件チェック
 * - スコア計算とランキング
 * - 実績解放システム
 * - プレイスタイル分析
 */

import type { Game } from '../../domain/entities/Game'
import { VictoryConditions, type VictoryResult, type VictoryType } from './VictoryConditions'
import { GameEvents } from '../../domain/events/GameEvents'

/**
 * プレイスタイル分析結果
 */
export interface PlayStyleAnalysis {
  primaryStyle: 'aggressive' | 'defensive' | 'balanced' | 'strategic'
  traits: PlayStyleTrait[]
  recommendations: string[]
  matchingVictoryConditions: VictoryType[]
}

/**
 * プレイスタイルの特徴
 */
export interface PlayStyleTrait {
  name: string
  description: string
  strength: number // 0-100
  examples: string[]
}

/**
 * 勝利イベント
 */
export interface VictoryEvent {
  type: 'victory_achieved' | 'milestone_reached' | 'record_broken' | 'achievement_unlocked'
  data: any
  timestamp: Date
}

/**
 * マイルストーン
 */
export interface Milestone {
  id: string
  name: string
  description: string
  threshold: number
  currentValue: number
  achieved: boolean
  reward?: string
}

/**
 * 勝利条件判定エンジン
 */
export class VictoryEngine {
  private readonly victoryConditions: VictoryConditions
  private readonly eventListeners: Map<string, Function[]>
  private readonly milestones: Map<string, Milestone>
  private readonly playStyleHistory: PlayStyleMetrics[]

  constructor() {
    this.victoryConditions = new VictoryConditions()
    this.eventListeners = new Map()
    this.milestones = new Map()
    this.playStyleHistory = []
    this.initializeMilestones()
  }

  /**
   * マイルストーンを初期化
   */
  private initializeMilestones(): void {
    const milestones: Milestone[] = [
      {
        id: 'first_victory',
        name: '初勝利',
        description: '初めてゲームをクリアする',
        threshold: 1,
        currentValue: 0,
        achieved: false,
        reward: 'チュートリアルモード解放'
      },
      {
        id: 'survival_master',
        name: '生存マスター',
        description: '活力50以上でクリアを5回達成',
        threshold: 5,
        currentValue: 0,
        achieved: false,
        reward: 'サバイバルモード解放'
      },
      {
        id: 'speed_demon',
        name: 'スピードデーモン',
        description: '15分以内クリアを3回達成',
        threshold: 3,
        currentValue: 0,
        achieved: false,
        reward: 'タイムアタックモード解放'
      },
      {
        id: 'perfectionist_path',
        name: '完璧への道',
        description: 'パーフェクトクリアを10回達成',
        threshold: 10,
        currentValue: 0,
        achieved: false,
        reward: 'エキスパートモード解放'
      },
      {
        id: 'insurance_expert',
        name: '保険エキスパート',
        description: '保険を効率的に活用してクリア（20回）',
        threshold: 20,
        currentValue: 0,
        achieved: false,
        reward: 'アドバイザーモード解放'
      }
    ]

    milestones.forEach(milestone => {
      this.milestones.set(milestone.id, milestone)
    })
  }

  /**
   * ゲーム終了時の勝利判定
   */
  evaluateVictory(game: Game): {
    victories: VictoryResult[]
    playStyle: PlayStyleAnalysis
    milestones: Milestone[]
    totalScore: number
    overallRank: string
  } {
    // 勝利条件チェック
    const victories = this.victoryConditions.checkVictoryConditions(game)

    // プレイスタイル分析
    const playStyle = this.analyzePlayStyle(game)

    // マイルストーン更新
    const achievedMilestones = this.updateMilestones(game, victories)

    // 総合スコア計算
    const totalScore = this.calculateTotalScore(victories, game)

    // 総合ランク算出
    const overallRank = this.calculateOverallRank(totalScore, victories.length)

    // イベント発火
    this.fireVictoryEvents(victories, achievedMilestones)

    // プレイスタイル履歴に記録
    this.recordPlayStyleMetrics(game, playStyle)

    return {
      victories,
      playStyle,
      milestones: achievedMilestones,
      totalScore,
      overallRank
    }
  }

  /**
   * プレイスタイルを分析
   */
  private analyzePlayStyle(game: Game): PlayStyleAnalysis {
    const metrics = this.calculatePlayStyleMetrics(game)
    
    // 主要なプレイスタイルを決定
    const primaryStyle = this.determinePrimaryStyle(metrics)
    
    // 特徴を抽出
    const traits = this.extractPlayStyleTraits(metrics)
    
    // 推奨事項を生成
    const recommendations = this.generateRecommendations(primaryStyle, metrics)
    
    // マッチする勝利条件を特定
    const matchingVictoryConditions = this.findMatchingVictoryConditions(primaryStyle)

    return {
      primaryStyle,
      traits,
      recommendations,
      matchingVictoryConditions
    }
  }

  /**
   * プレイスタイルメトリクスを計算
   */
  private calculatePlayStyleMetrics(game: Game): PlayStyleMetrics {
    const totalTurns = game.turn
    const totalChallenges = game.stats.totalChallenges
    const successRate = totalChallenges > 0 ? 
      (game.stats.successfulChallenges / totalChallenges) * 100 : 0
    
    const insuranceUsage = game.getActiveInsurances().length
    const riskTolerance = this.calculateRiskTolerance(game)
    const efficiency = game.vitality / Math.max(totalTurns, 1)
    const adaptability = this.calculateAdaptability(game)

    return {
      aggressiveness: this.calculateAggressiveness(game),
      defensiveness: this.calculateDefensiveness(game, insuranceUsage),
      efficiency,
      consistency: successRate,
      riskTolerance,
      adaptability,
      resourceManagement: this.calculateResourceManagement(game),
      strategicPlanning: this.calculateStrategicPlanning(game)
    }
  }

  /**
   * 攻撃性を計算
   */
  private calculateAggressiveness(game: Game): number {
    const fastTurns = game.turn < 15 ? 30 : 0
    const highRiskChoices = game.stats.failedChallenges > 5 ? 40 : 0
    const lowInsurance = game.getActiveInsurances().length < 3 ? 30 : 0
    
    return Math.min(100, fastTurns + highRiskChoices + lowInsurance)
  }

  /**
   * 守備力を計算
   */
  private calculateDefensiveness(game: Game, insuranceCount: number): number {
    const highInsurance = insuranceCount > 5 ? 40 : insuranceCount * 8
    const lowFailures = game.stats.failedChallenges < 3 ? 30 : 0
    const highVitality = game.vitality > 40 ? 30 : 0
    
    return Math.min(100, highInsurance + lowFailures + highVitality)
  }

  /**
   * リスク許容度を計算
   */
  private calculateRiskTolerance(game: Game): number {
    const failureRate = game.stats.totalChallenges > 0 ? 
      (game.stats.failedChallenges / game.stats.totalChallenges) * 100 : 0
    
    if (failureRate > 30) return 80 // 高リスク許容
    if (failureRate > 15) return 60 // 中リスク許容
    if (failureRate > 5) return 40  // 低リスク許容
    return 20 // 極低リスク許容
  }

  /**
   * 適応性を計算
   */
  private calculateAdaptability(game: Game): number {
    // ステージ間での戦略変更を評価
    const stageProgression = this.getStageProgressionScore(game.stage)
    const cardVariety = Math.min(100, game.stats.cardsAcquired * 2)
    
    return Math.min(100, (stageProgression + cardVariety) / 2)
  }

  /**
   * リソース管理能力を計算
   */
  private calculateResourceManagement(game: Game): number {
    const vitalityEfficiency = (game.vitality / 100) * 100
    const insuranceEfficiency = this.calculateInsuranceEfficiency(game)
    
    return Math.min(100, (vitalityEfficiency + insuranceEfficiency) / 2)
  }

  /**
   * 戦略的計画性を計算
   */
  private calculateStrategicPlanning(game: Game): number {
    const longTermThinking = game.getActiveInsurances().length > 3 ? 40 : 20
    const balancedApproach = this.isBalancedApproach(game) ? 60 : 30
    
    return Math.min(100, longTermThinking + balancedApproach)
  }

  /**
   * 主要プレイスタイルを決定
   */
  private determinePrimaryStyle(metrics: PlayStyleMetrics): 'aggressive' | 'defensive' | 'balanced' | 'strategic' {
    if (metrics.aggressiveness > 70) return 'aggressive'
    if (metrics.defensiveness > 70) return 'defensive'
    if (metrics.strategicPlanning > 70) return 'strategic'
    return 'balanced'
  }

  /**
   * プレイスタイル特徴を抽出
   */
  private extractPlayStyleTraits(metrics: PlayStyleMetrics): PlayStyleTrait[] {
    const traits: PlayStyleTrait[] = []

    if (metrics.aggressiveness > 60) {
      traits.push({
        name: '積極的',
        description: 'リスクを恐れず、積極的にチャレンジに挑む',
        strength: metrics.aggressiveness,
        examples: ['早いターンでのクリア', '高リスクチャレンジへの挑戦']
      })
    }

    if (metrics.defensiveness > 60) {
      traits.push({
        name: '慎重',
        description: '安全を重視し、確実な選択を好む',
        strength: metrics.defensiveness,
        examples: ['多数の保険加入', '低リスクな選択']
      })
    }

    if (metrics.efficiency > 60) {
      traits.push({
        name: '効率的',
        description: 'リソースを効率的に活用する',
        strength: metrics.efficiency,
        examples: ['最小限のリソースでの成功', '無駄のない戦略']
      })
    }

    if (metrics.adaptability > 60) {
      traits.push({
        name: '適応力',
        description: '状況に応じて戦略を柔軟に変更する',
        strength: metrics.adaptability,
        examples: ['多様なカードの活用', 'ステージに応じた戦略変更']
      })
    }

    return traits
  }

  /**
   * 推奨事項を生成
   */
  private generateRecommendations(primaryStyle: string, metrics: PlayStyleMetrics): string[] {
    const recommendations: string[] = []

    switch (primaryStyle) {
      case 'aggressive':
        if (metrics.defensiveness < 30) {
          recommendations.push('保険をもう少し活用してリスクを分散させましょう')
        }
        recommendations.push('スピードクリアやチャレンジクリアに挑戦してみましょう')
        break

      case 'defensive':
        if (metrics.efficiency < 40) {
          recommendations.push('リソースをもう少し効率的に使ってみましょう')
        }
        recommendations.push('エコノミークリアに挑戦してみましょう')
        break

      case 'balanced':
        recommendations.push('バランス型のプレイスタイルです。様々な勝利条件に挑戦できます')
        recommendations.push('特定の分野を伸ばして専門性を高めるのも良いでしょう')
        break

      case 'strategic':
        recommendations.push('戦略的思考が優れています。複合的な勝利条件に挑戦しましょう')
        recommendations.push('完璧主義者やコンプリートクリアが向いています')
        break
    }

    return recommendations
  }

  /**
   * マッチする勝利条件を特定
   */
  private findMatchingVictoryConditions(primaryStyle: string): VictoryType[] {
    const matches: VictoryType[] = ['standard'] // 全スタイルで基本クリア可能

    switch (primaryStyle) {
      case 'aggressive':
        matches.push('speed', 'challenge')
        break
      case 'defensive':
        matches.push('perfect', 'economy')
        break
      case 'balanced':
        matches.push('speed', 'perfect', 'economy')
        break
      case 'strategic':
        matches.push('perfect', 'completionist')
        break
    }

    return matches
  }

  /**
   * マイルストーンを更新
   */
  private updateMilestones(game: Game, victories: VictoryResult[]): Milestone[] {
    const achieved: Milestone[] = []

    // 勝利数をカウント
    if (victories.length > 0) {
      const firstVictory = this.milestones.get('first_victory')!
      firstVictory.currentValue = Math.max(firstVictory.currentValue, 1)
      if (!firstVictory.achieved && firstVictory.currentValue >= firstVictory.threshold) {
        firstVictory.achieved = true
        achieved.push(firstVictory)
      }
    }

    // 高活力クリア
    if (game.vitality >= 50) {
      const survivalMaster = this.milestones.get('survival_master')!
      survivalMaster.currentValue++
      if (!survivalMaster.achieved && survivalMaster.currentValue >= survivalMaster.threshold) {
        survivalMaster.achieved = true
        achieved.push(survivalMaster)
      }
    }

    // スピードクリア
    const duration = this.getGameDuration(game)
    if (duration <= 900) { // 15分
      const speedDemon = this.milestones.get('speed_demon')!
      speedDemon.currentValue++
      if (!speedDemon.achieved && speedDemon.currentValue >= speedDemon.threshold) {
        speedDemon.achieved = true
        achieved.push(speedDemon)
      }
    }

    return achieved
  }

  /**
   * 総合スコアを計算
   */
  private calculateTotalScore(victories: VictoryResult[], game: Game): number {
    const baseScore = victories.reduce((sum, victory) => sum + victory.totalScore, 0)
    const completionBonus = game.isCompleted() ? 1000 : 0
    const varietyBonus = victories.length > 1 ? victories.length * 500 : 0
    
    return baseScore + completionBonus + varietyBonus
  }

  /**
   * 総合ランクを算出
   */
  private calculateOverallRank(totalScore: number, victoryCount: number): string {
    if (victoryCount >= 3 && totalScore >= 15000) return 'レジェンド'
    if (victoryCount >= 2 && totalScore >= 10000) return 'マスター'
    if (totalScore >= 7500) return 'エキスパート'
    if (totalScore >= 5000) return 'アドバンス'
    if (totalScore >= 2500) return 'インターミディエート'
    return 'ビギナー'
  }

  /**
   * 勝利イベントを発火
   */
  private fireVictoryEvents(victories: VictoryResult[], milestones: Milestone[]): void {
    victories.forEach(victory => {
      this.emitEvent('victory_achieved', {
        type: victory.type,
        rank: victory.rank,
        score: victory.totalScore
      })
    })

    milestones.forEach(milestone => {
      this.emitEvent('milestone_reached', {
        id: milestone.id,
        name: milestone.name,
        reward: milestone.reward
      })
    })
  }

  /**
   * プレイスタイルメトリクスを記録
   */
  private recordPlayStyleMetrics(game: Game, analysis: PlayStyleAnalysis): void {
    const metrics: PlayStyleMetrics = this.calculatePlayStyleMetrics(game)
    metrics.timestamp = new Date()
    metrics.gameId = game.id
    
    this.playStyleHistory.push(metrics)
    
    // 履歴は最新50件まで保持
    if (this.playStyleHistory.length > 50) {
      this.playStyleHistory.shift()
    }
  }

  /**
   * イベントを発火
   */
  private emitEvent(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType) || []
    listeners.forEach(listener => listener(data))
  }

  /**
   * イベントリスナーを追加
   */
  addEventListener(eventType: string, listener: Function): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, [])
    }
    this.eventListeners.get(eventType)!.push(listener)
  }

  /**
   * プレイスタイル履歴を取得
   */
  getPlayStyleHistory(): PlayStyleMetrics[] {
    return [...this.playStyleHistory]
  }

  /**
   * プレイスタイルの傾向を分析
   */
  analyzePlayStyleTrends(): {
    improvement: string[]
    consistency: number
    evolution: string
  } {
    if (this.playStyleHistory.length < 3) {
      return {
        improvement: ['データが不足しています'],
        consistency: 0,
        evolution: '分析には更多くのプレイが必要です'
      }
    }

    const recent = this.playStyleHistory.slice(-5)
    const older = this.playStyleHistory.slice(-10, -5)

    const improvement = this.identifyImprovements(older, recent)
    const consistency = this.calculateConsistency(recent)
    const evolution = this.describeEvolution(older, recent)

    return { improvement, consistency, evolution }
  }

  // ヘルパーメソッド
  private getGameDuration(game: Game): number {
    if (!game.startedAt) return 0
    const endTime = game.completedAt || new Date()
    return Math.floor((endTime.getTime() - game.startedAt.getTime()) / 1000)
  }

  private getStageProgressionScore(stage: string): number {
    switch (stage) {
      case 'youth': return 30
      case 'middle': return 60
      case 'fulfillment': return 100
      default: return 0
    }
  }

  private calculateInsuranceEfficiency(game: Game): number {
    const burden = game.insuranceBurden
    const vitality = game.vitality
    if (burden === 0) return vitality > 50 ? 80 : 40
    return Math.min(100, (vitality / burden) * 20)
  }

  private isBalancedApproach(game: Game): boolean {
    const insuranceCount = game.getActiveInsurances().length
    const vitality = game.vitality
    return insuranceCount >= 2 && insuranceCount <= 6 && vitality >= 30
  }

  private identifyImprovements(older: PlayStyleMetrics[], recent: PlayStyleMetrics[]): string[] {
    const improvements: string[] = []
    
    const avgOld = this.averageMetrics(older)
    const avgNew = this.averageMetrics(recent)

    if (avgNew.efficiency > avgOld.efficiency + 10) {
      improvements.push('効率性が向上しています')
    }
    if (avgNew.consistency > avgOld.consistency + 5) {
      improvements.push('一貫性が向上しています')
    }
    if (avgNew.strategicPlanning > avgOld.strategicPlanning + 10) {
      improvements.push('戦略的思考が向上しています')
    }

    return improvements.length > 0 ? improvements : ['安定したプレイを続けています']
  }

  private calculateConsistency(metrics: PlayStyleMetrics[]): number {
    if (metrics.length < 2) return 0
    
    const variations = metrics.map(m => m.efficiency).reduce((acc, val, i, arr) => {
      if (i === 0) return acc
      return acc + Math.abs(val - arr[i-1])
    }, 0)
    
    return Math.max(0, 100 - (variations / metrics.length))
  }

  private describeEvolution(older: PlayStyleMetrics[], recent: PlayStyleMetrics[]): string {
    const avgOld = this.averageMetrics(older)
    const avgNew = this.averageMetrics(recent)

    if (avgNew.aggressiveness > avgOld.aggressiveness + 15) {
      return 'より積極的なプレイスタイルに進化しています'
    }
    if (avgNew.defensiveness > avgOld.defensiveness + 15) {
      return 'より慎重なプレイスタイルに進化しています'
    }
    if (avgNew.strategicPlanning > avgOld.strategicPlanning + 15) {
      return 'より戦略的なプレイスタイルに進化しています'
    }
    
    return '一貫したプレイスタイルを維持しています'
  }

  private averageMetrics(metrics: PlayStyleMetrics[]): PlayStyleMetrics {
    if (metrics.length === 0) {
      return {
        aggressiveness: 0, defensiveness: 0, efficiency: 0,
        consistency: 0, riskTolerance: 0, adaptability: 0,
        resourceManagement: 0, strategicPlanning: 0
      }
    }

    const sum = metrics.reduce((acc, m) => ({
      aggressiveness: acc.aggressiveness + m.aggressiveness,
      defensiveness: acc.defensiveness + m.defensiveness,
      efficiency: acc.efficiency + m.efficiency,
      consistency: acc.consistency + m.consistency,
      riskTolerance: acc.riskTolerance + m.riskTolerance,
      adaptability: acc.adaptability + m.adaptability,
      resourceManagement: acc.resourceManagement + m.resourceManagement,
      strategicPlanning: acc.strategicPlanning + m.strategicPlanning
    }))

    return {
      aggressiveness: sum.aggressiveness / metrics.length,
      defensiveness: sum.defensiveness / metrics.length,
      efficiency: sum.efficiency / metrics.length,
      consistency: sum.consistency / metrics.length,
      riskTolerance: sum.riskTolerance / metrics.length,
      adaptability: sum.adaptability / metrics.length,
      resourceManagement: sum.resourceManagement / metrics.length,
      strategicPlanning: sum.strategicPlanning / metrics.length
    }
  }
}

/**
 * プレイスタイルメトリクス
 */
interface PlayStyleMetrics {
  aggressiveness: number      // 攻撃性 (0-100)
  defensiveness: number       // 守備力 (0-100)
  efficiency: number          // 効率性 (0-100)
  consistency: number         // 一貫性 (0-100)
  riskTolerance: number       // リスク許容度 (0-100)
  adaptability: number        // 適応性 (0-100)
  resourceManagement: number  // リソース管理 (0-100)
  strategicPlanning: number   // 戦略的計画性 (0-100)
  timestamp?: Date
  gameId?: string
}