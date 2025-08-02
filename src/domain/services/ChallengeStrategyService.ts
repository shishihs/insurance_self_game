import type { Card } from '../entities/Card'
import type { ChallengeResult, GameStage } from '../types/game.types'
import { CardPower } from '../valueObjects/CardPower'
import { BALANCE_CONSTANTS, DREAM_CONSTANTS } from '../constants/GameConstants'

/**
 * チャレンジ解決戦略サービス
 * 
 * Strategy パターンを使用してチャレンジ解決のロジックを分離。
 * 異なるタイプのチャレンジに対して適切な解決戦略を適用。
 */

/**
 * チャレンジ解決戦略の基底インターフェース
 */
export interface ChallengeResolutionStrategy {
  /**
   * チャレンジを解決し、結果を返す
   */
  resolve(
    challengeCard: Card,
    selectedCards: Card[],
    context: ChallengeContext
  ): ChallengeResult

  /**
   * この戦略が適用可能なチャレンジタイプかチェック
   */
  canHandle(challengeCard: Card): boolean

  /**
   * 戦略の名前を取得
   */
  getName(): string
}

/**
 * チャレンジ解決のコンテキスト情報
 */
export interface ChallengeContext {
  currentStage: GameStage
  currentVitality: number
  insuranceBurden: number
  turn: number
}

/**
 * パワー計算の詳細結果
 */
export interface PowerBreakdown {
  base: number
  insurance: number
  burden: number
  bonus?: number
  total: number
}

/**
 * 基本チャレンジ解決戦略
 */
export class BasicChallengeStrategy implements ChallengeResolutionStrategy {
  resolve(
    challengeCard: Card,
    selectedCards: Card[],
    context: ChallengeContext
  ): ChallengeResult {
    const powerBreakdown = this.calculateTotalPower(selectedCards, context)
    const challengePower = challengeCard.power
    const success = powerBreakdown.total >= challengePower

    // 活力変更の計算
    let vitalityChange = 0
    if (success) {
      vitalityChange = Math.floor((powerBreakdown.total - challengePower) / 2)
    } else {
      vitalityChange = -(challengePower - powerBreakdown.total)
    }

    return {
      success,
      playerPower: powerBreakdown.total,
      challengePower,
      vitalityChange,
      message: success 
        ? `チャレンジ成功！ +${vitalityChange} 活力`
        : `チャレンジ失敗... ${vitalityChange} 活力`,
      powerBreakdown
    }
  }

  canHandle(challengeCard: Card): boolean {
    return challengeCard.type === 'challenge' && !challengeCard.dreamCategory
  }

  getName(): string {
    return 'basic'
  }

  protected calculateTotalPower(selectedCards: Card[], context: ChallengeContext): PowerBreakdown {
    let basePower = 0
    let insurancePower = 0

    selectedCards.forEach(card => {
      const effectivePower = card.calculateEffectivePower()
      
      if (card.type === 'insurance') {
        insurancePower += effectivePower
      } else {
        basePower += effectivePower
      }
    })

    const burden = context.insuranceBurden
    const total = Math.max(0, basePower + insurancePower + burden)

    return {
      base: basePower,
      insurance: insurancePower,
      burden,
      total
    }
  }
}

/**
 * 夢カード専用チャレンジ解決戦略
 */
export class DreamChallengeStrategy implements ChallengeResolutionStrategy {
  resolve(
    challengeCard: Card,
    selectedCards: Card[],
    context: ChallengeContext
  ): ChallengeResult {
    const powerBreakdown = this.calculateTotalPower(selectedCards, context)
    const adjustedChallengePower = this.calculateDreamRequiredPower(challengeCard, context.currentStage)
    const success = powerBreakdown.total >= adjustedChallengePower

    // 夢チャレンジは成功時のボーナスが大きい
    let vitalityChange = 0
    if (success) {
      const bonus = BALANCE_CONSTANTS.CHALLENGE_SETTINGS.successBonusBase
      vitalityChange = Math.floor((powerBreakdown.total - adjustedChallengePower) / 2) + bonus
    } else {
      vitalityChange = -(adjustedChallengePower - powerBreakdown.total)
    }

    return {
      success,
      playerPower: powerBreakdown.total,
      challengePower: adjustedChallengePower,
      vitalityChange,
      message: success 
        ? `夢チャレンジ成功！ +${vitalityChange} 活力（ボーナス込み）`
        : `夢チャレンジ失敗... ${vitalityChange} 活力`,
      powerBreakdown,
      dreamCategory: challengeCard.dreamCategory
    }
  }

  canHandle(challengeCard: Card): boolean {
    return challengeCard.type === 'challenge' && challengeCard.isDreamCard()
  }

  getName(): string {
    return 'dream'
  }

  private calculateDreamRequiredPower(challengeCard: Card, stage: GameStage): number {
    if (!challengeCard.dreamCategory) {
      return challengeCard.power
    }

    // 青年期は調整なし
    if (stage === 'youth') {
      return challengeCard.power
    }

    // 年齢調整を適用
    const adjustment = DREAM_CONSTANTS.AGE_ADJUSTMENTS[challengeCard.dreamCategory]
    const adjustedPower = challengeCard.power + adjustment

    return Math.max(DREAM_CONSTANTS.BASE_SETTINGS.minPower, adjustedPower)
  }

  protected calculateTotalPower(selectedCards: Card[], context: ChallengeContext): PowerBreakdown {
    let basePower = 0
    let insurancePower = 0
    let bonus = 0

    selectedCards.forEach(card => {
      const effectivePower = card.calculateEffectivePower()
      
      if (card.type === 'insurance') {
        insurancePower += effectivePower
      } else {
        basePower += effectivePower
        
        // 夢チャレンジでは特定のカードにボーナス
        if (card.category === 'hobby' || card.category === 'career') {
          bonus += 1
        }
      }
    })

    const burden = context.insuranceBurden
    const total = Math.max(0, basePower + insurancePower + burden + bonus)

    return {
      base: basePower,
      insurance: insurancePower,
      burden,
      bonus,
      total
    }
  }
}

/**
 * 困難チャレンジ解決戦略（高難易度チャレンジ用）
 */
export class DifficultChallengeStrategy implements ChallengeResolutionStrategy {
  private static readonly DIFFICULTY_THRESHOLD = 10

  resolve(
    challengeCard: Card,
    selectedCards: Card[],
    context: ChallengeContext
  ): ChallengeResult {
    const powerBreakdown = this.calculateTotalPower(selectedCards, context)
    const challengePower = challengeCard.power
    const success = powerBreakdown.total >= challengePower

    // 困難チャレンジは失敗時のペナルティが大きく、成功時の報酬も大きい
    let vitalityChange = 0
    if (success) {
      const bonus = Math.floor(challengePower / 5) // 難易度に応じたボーナス
      vitalityChange = Math.floor((powerBreakdown.total - challengePower) / 2) + bonus
    } else {
      const penalty = Math.floor(challengePower / 4) // 追加ペナルティ
      vitalityChange = -(challengePower - powerBreakdown.total) - penalty
    }

    return {
      success,
      playerPower: powerBreakdown.total,
      challengePower,
      vitalityChange,
      message: success 
        ? `困難チャレンジ克服！ +${vitalityChange} 活力（大ボーナス）`
        : `困難チャレンジ失敗... ${vitalityChange} 活力（重いペナルティ）`,
      powerBreakdown,
      difficulty: 'hard'
    }
  }

  canHandle(challengeCard: Card): boolean {
    return challengeCard.type === 'challenge' && 
           challengeCard.power >= DifficultChallengeStrategy.DIFFICULTY_THRESHOLD
  }

  getName(): string {
    return 'difficult'
  }

  protected calculateTotalPower(selectedCards: Card[], context: ChallengeContext): PowerBreakdown {
    let basePower = 0
    let insurancePower = 0

    selectedCards.forEach(card => {
      const effectivePower = card.calculateEffectivePower()
      
      if (card.type === 'insurance') {
        // 困難チャレンジでは保険の効果が少し上がる
        insurancePower += Math.floor(effectivePower * 1.1)
      } else {
        basePower += effectivePower
      }
    })

    const burden = context.insuranceBurden
    const total = Math.max(0, basePower + insurancePower + burden)

    return {
      base: basePower,
      insurance: insurancePower,
      burden,
      total
    }
  }
}

/**
 * チャレンジストラテジーファクトリー
 */
export class ChallengeStrategyFactory {
  private static readonly strategies: ChallengeResolutionStrategy[] = [
    new DreamChallengeStrategy(),      // 夢カードを最初にチェック
    new DifficultChallengeStrategy(),  // 困難チャレンジを次にチェック
    new BasicChallengeStrategy()       // 基本戦略を最後にフォールバック
  ]

  /**
   * チャレンジカードに適した戦略を取得
   */
  static getStrategy(challengeCard: Card): ChallengeResolutionStrategy {
    for (const strategy of this.strategies) {
      if (strategy.canHandle(challengeCard)) {
        return strategy
      }
    }
    
    // フォールバック：基本戦略
    return new BasicChallengeStrategy()
  }

  /**
   * カスタム戦略を登録
   */
  static registerStrategy(strategy: ChallengeResolutionStrategy): void {
    // 既存の戦略と重複しないかチェック
    const existing = this.strategies.find(s => s.getName() === strategy.getName())
    if (existing) {
      throw new Error(`Strategy with name '${strategy.getName()}' already exists`)
    }
    
    // 基本戦略の前に挿入（基本戦略は常に最後のフォールバック）
    this.strategies.splice(-1, 0, strategy)
  }

  /**
   * 利用可能な戦略の一覧を取得
   */
  static getAvailableStrategies(): ReadonlyArray<ChallengeResolutionStrategy> {
    return [...this.strategies]
  }
}

/**
 * チャレンジ解決サービス
 */
export class ChallengeResolutionService {
  /**
   * チャレンジを解決する
   */
  resolveChallenge(
    challengeCard: Card,
    selectedCards: Card[],
    context: ChallengeContext
  ): ChallengeResult {
    const strategy = ChallengeStrategyFactory.getStrategy(challengeCard)
    
    console.log(`Using strategy: ${strategy.getName()} for challenge: ${challengeCard.name}`)
    
    return strategy.resolve(challengeCard, selectedCards, context)
  }

  /**
   * チャレンジの推奨戦略を取得
   */
  getRecommendedCards(
    challengeCard: Card,
    availableCards: Card[],
    context: ChallengeContext
  ): Card[] {
    const strategy = ChallengeStrategyFactory.getStrategy(challengeCard)
    
    // 戦略ごとの推奨ロジックは今後実装
    return this.calculateOptimalSelection(challengeCard, availableCards, context)
  }

  /**
   * 最適なカード選択を計算（簡易版）
   */
  private calculateOptimalSelection(
    challengeCard: Card,
    availableCards: Card[],
    context: ChallengeContext
  ): Card[] {
    const targetPower = challengeCard.power
    let currentPower = 0
    const selectedCards: Card[] = []

    // 貪欲法で近似的な最適解を求める
    const sortedCards = [...availableCards].sort((a, b) => 
      b.calculateEffectivePower() - a.calculateEffectivePower()
    )

    for (const card of sortedCards) {
      if (currentPower >= targetPower) break
      
      selectedCards.push(card)
      currentPower += card.calculateEffectivePower()
    }

    return selectedCards
  }
}

/**
 * チャレンジ解決の統計情報
 */
export interface ChallengeStatistics {
  totalAttempts: number
  successRate: number
  averagePlayerPower: number
  averageVitalityChange: number
  strategyUsage: Map<string, number>
}

/**
 * チャレンジ統計管理サービス
 */
export class ChallengeStatisticsService {
  private statistics: ChallengeStatistics = {
    totalAttempts: 0,
    successRate: 0,
    averagePlayerPower: 0,
    averageVitalityChange: 0,
    strategyUsage: new Map()
  }

  private results: ChallengeResult[] = []

  /**
   * チャレンジ結果を記録
   */
  recordResult(result: ChallengeResult, strategyName: string): void {
    this.results.push(result)
    this.updateStatistics(strategyName)
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): ChallengeStatistics {
    return {
      ...this.statistics,
      strategyUsage: new Map(this.statistics.strategyUsage)
    }
  }

  /**
   * 統計をリセット
   */
  resetStatistics(): void {
    this.results = []
    this.statistics = {
      totalAttempts: 0,
      successRate: 0,
      averagePlayerPower: 0,
      averageVitalityChange: 0,
      strategyUsage: new Map()
    }
  }

  private updateStatistics(strategyName: string): void {
    const total = this.results.length
    const successes = this.results.filter(r => r.success).length
    const totalPower = this.results.reduce((sum, r) => sum + r.playerPower, 0)
    const totalVitalityChange = this.results.reduce((sum, r) => sum + r.vitalityChange, 0)

    this.statistics.totalAttempts = total
    this.statistics.successRate = total > 0 ? successes / total : 0
    this.statistics.averagePlayerPower = total > 0 ? totalPower / total : 0
    this.statistics.averageVitalityChange = total > 0 ? totalVitalityChange / total : 0

    // 戦略使用回数を記録
    const currentUsage = this.statistics.strategyUsage.get(strategyName) || 0
    this.statistics.strategyUsage.set(strategyName, currentUsage + 1)
  }
}