/**
 * AI戦略サービス
 * 
 * 異なるAI戦略（Conservative, Aggressive, Balanced, Adaptive）を実装し、
 * チャレンジ選択とカード選択の意思決定を行います。
 */

import type { Card } from '../entities/Card'
import type { Game } from '../entities/Game'
import type { GameStage } from '../types/game.types'

/**
 * AI戦略タイプ
 */
export type AIStrategyType = 'conservative' | 'aggressive' | 'balanced' | 'adaptive'

/**
 * チャレンジ選択結果
 */
export interface ChallengeChoice {
  /** 選択されたチャレンジカード */
  challenge: Card
  /** 選択理由 */
  reason: string
  /** 成功確率予測 */
  successProbability: number
}

/**
 * カード選択結果
 */
export interface CardChoice {
  /** 選択されたカード配列 */
  cards: Card[]
  /** 選択理由 */
  reason: string
  /** 期待パワー値 */
  expectedPower: number
}

/**
 * AI戦略の基底インターフェース
 */
export interface AIStrategy {
  /**
   * 戦略名を取得
   */
  getName(): string

  /**
   * 戦略タイプを取得
   */
  getType(): AIStrategyType

  /**
   * 利用可能なチャレンジから最適なものを選択
   */
  selectChallenge(
    availableChallenges: Card[],
    game: Game
  ): ChallengeChoice

  /**
   * チャレンジに対して最適なカードを選択
   */
  selectCards(
    challenge: Card,
    availableCards: Card[],
    game: Game
  ): CardChoice

  /**
   * 現在のゲーム状況に対する戦略の適用度を評価（0-1）
   */
  evaluateFitness(game: Game): number
}

/**
 * 保守的戦略 - リスクを避け安全な選択を優先
 */
export class ConservativeStrategy implements AIStrategy {
  getName(): string {
    return '保守的戦略'
  }

  getType(): AIStrategyType {
    return 'conservative'
  }

  selectChallenge(availableChallenges: Card[], game: Game): ChallengeChoice {
    // 最も易しいチャレンジを選択
    const sortedChallenges = [...availableChallenges].sort((a, b) => a.power - b.power)
    const easiestChallenge = sortedChallenges[0]
    
    const currentPower = this.estimateCurrentPower(game)
    const successProbability = Math.min(1, currentPower / easiestChallenge.power)

    return {
      challenge: easiestChallenge,
      reason: '最も安全で成功確率の高いチャレンジを選択しました',
      successProbability
    }
  }

  selectCards(challenge: Card, availableCards: Card[], game: Game): CardChoice {
    const targetPower = challenge.power
    const selectedCards: Card[] = []
    let currentPower = 0

    // 保険カードを優先的に使用（リスク軽減）
    const insuranceCards = availableCards
      .filter(card => card.type === 'insurance')
      .sort((a, b) => b.calculateEffectivePower() - a.calculateEffectivePower())

    const otherCards = availableCards
      .filter(card => card.type !== 'insurance')
      .sort((a, b) => b.calculateEffectivePower() - a.calculateEffectivePower())

    // まず保険カードを選択
    for (const card of insuranceCards) {
      if (currentPower >= targetPower * 1.2) break // 余裕を持って停止
      selectedCards.push(card)
      currentPower += card.calculateEffectivePower()
    }

    // 必要に応じて他のカードを追加
    for (const card of otherCards) {
      if (currentPower >= targetPower * 1.2) break
      selectedCards.push(card)
      currentPower += card.calculateEffectivePower()
    }

    return {
      cards: selectedCards,
      reason: '保険カードを重視し、十分な余裕を持った安全な選択を行いました',
      expectedPower: currentPower
    }
  }

  evaluateFitness(game: Game): number {
    // 活力が低いほど保守的戦略が適している
    const vitalityRatio = game.vitality / game.maxVitality
    return 1 - vitalityRatio
  }

  private estimateCurrentPower(game: Game): number {
    return game.cardManager.playerDeck.getCards()
      .reduce((total, card) => total + card.calculateEffectivePower(), 0)
  }
}

/**
 * 攻撃的戦略 - 高リスク高リターンを狙う
 */
export class AggressiveStrategy implements AIStrategy {
  getName(): string {
    return '攻撃的戦略'
  }

  getType(): AIStrategyType {
    return 'aggressive'
  }

  selectChallenge(availableChallenges: Card[], game: Game): ChallengeChoice {
    // 最も難しいチャレンジを選択（ただし勝率50%以上のもの）
    const currentPower = this.estimateCurrentPower(game)
    
    const viableChallenges = availableChallenges
      .filter(challenge => currentPower >= challenge.power * 0.5) // 最低50%の勝率
      .sort((a, b) => b.power - a.power) // 難しい順

    const selectedChallenge = viableChallenges[0] || availableChallenges[0]
    const successProbability = Math.min(1, currentPower / selectedChallenge.power)

    return {
      challenge: selectedChallenge,
      reason: '高い報酬を狙って、可能な限り困難なチャレンジを選択しました',
      successProbability
    }
  }

  selectCards(challenge: Card, availableCards: Card[], game: Game): CardChoice {
    const targetPower = challenge.power
    const selectedCards: Card[] = []
    let currentPower = 0

    // 最もパワーの高いカードから選択（効率重視）
    const sortedCards = [...availableCards]
      .sort((a, b) => b.calculateEffectivePower() - a.calculateEffectivePower())

    for (const card of sortedCards) {
      if (currentPower >= targetPower) break // 必要最小限で停止
      selectedCards.push(card)
      currentPower += card.calculateEffectivePower()
    }

    return {
      cards: selectedCards,
      reason: '最高パワーのカードを優先し、必要最小限のコストで勝利を狙いました',
      expectedPower: currentPower
    }
  }

  evaluateFitness(game: Game): number {
    // 活力が高く、手札が強いほど攻撃的戦略が適している
    const vitalityRatio = game.vitality / game.maxVitality
    const handStrength = this.estimateHandStrength(game)
    return (vitalityRatio + handStrength) / 2
  }

  private estimateCurrentPower(game: Game): number {
    return game.cardManager.playerDeck.getCards()
      .reduce((total, card) => total + card.calculateEffectivePower(), 0)
  }

  private estimateHandStrength(game: Game): number {
    const handCards = game.cardManager.playerDeck.getCards()
    if (handCards.length === 0) return 0
    
    const averagePower = handCards
      .reduce((total, card) => total + card.calculateEffectivePower(), 0) / handCards.length
    
    // 平均パワー3を基準とした正規化（0-1）
    return Math.min(1, averagePower / 3)
  }
}

/**
 * バランス戦略 - リスクとリターンのバランスを重視
 */
export class BalancedStrategy implements AIStrategy {
  getName(): string {
    return 'バランス戦略'
  }

  getType(): AIStrategyType {
    return 'balanced'
  }

  selectChallenge(availableChallenges: Card[], game: Game): ChallengeChoice {
    const currentPower = this.estimateCurrentPower(game)
    
    // 成功確率70-90%の範囲でチャレンジを選択
    const scoredChallenges = availableChallenges.map(challenge => {
      const successProbability = Math.min(1, currentPower / challenge.power)
      const riskRewardScore = this.calculateRiskRewardScore(challenge, successProbability)
      
      return { challenge, successProbability, score: riskRewardScore }
    })

    const bestChoice = scoredChallenges
      .sort((a, b) => b.score - a.score)[0]

    return {
      challenge: bestChoice.challenge,
      reason: 'リスクとリターンのバランスを考慮して最適なチャレンジを選択しました',
      successProbability: bestChoice.successProbability
    }
  }

  selectCards(challenge: Card, availableCards: Card[], game: Game): CardChoice {
    const targetPower = challenge.power
    const selectedCards: Card[] = []
    let currentPower = 0

    // カード効率（パワー/コスト比）で優先順位を決定
    const scoredCards = availableCards.map(card => {
      const efficiency = this.calculateCardEfficiency(card, game)
      return { card, efficiency }
    }).sort((a, b) => b.efficiency - a.efficiency)

    for (const { card } of scoredCards) {
      if (currentPower >= targetPower * 1.1) break // 10%の余裕
      selectedCards.push(card)
      currentPower += card.calculateEffectivePower()
    }

    return {
      cards: selectedCards,
      reason: 'カード効率とリスク管理を両立した最適な組み合わせを選択しました',
      expectedPower: currentPower
    }
  }

  evaluateFitness(game: Game): number {
    // 常に中程度の適用度（他の戦略がフィットしない場合のフォールバック）
    return 0.6
  }

  private estimateCurrentPower(game: Game): number {
    return game.cardManager.playerDeck.getCards()
      .reduce((total, card) => total + card.calculateEffectivePower(), 0)
  }

  private calculateRiskRewardScore(challenge: Card, successProbability: number): number {
    // リスクリワード比を計算（成功確率 * 報酬 - 失敗確率 * ペナルティ）
    const reward = challenge.power * 0.5 // 成功時の報酬想定
    const penalty = challenge.power * 0.3 // 失敗時のペナルティ想定
    
    return successProbability * reward - (1 - successProbability) * penalty
  }

  private calculateCardEfficiency(card: Card, game: Game): number {
    const power = card.calculateEffectivePower()
    const cost = this.estimateCardCost(card)
    return power / Math.max(1, cost)
  }

  private estimateCardCost(card: Card): number {
    // カードのコスト推定（保険カードは負担があるため高コスト）
    if (card.type === 'insurance') {
      return card.calculateEffectivePower() + 1 // 保険料負担を考慮
    }
    return 1 // 基本カードは標準コスト
  }
}

/**
 * 適応戦略 - ゲーム状況に応じて他の戦略を動的に選択
 */
export class AdaptiveStrategy implements AIStrategy {
  private strategies: AIStrategy[]

  constructor() {
    this.strategies = [
      new ConservativeStrategy(),
      new AggressiveStrategy(),
      new BalancedStrategy()
    ]
  }

  getName(): string {
    return '適応戦略'
  }

  getType(): AIStrategyType {
    return 'adaptive'
  }

  selectChallenge(availableChallenges: Card[], game: Game): ChallengeChoice {
    const bestStrategy = this.selectBestStrategy(game)
    const choice = bestStrategy.selectChallenge(availableChallenges, game)
    
    return {
      ...choice,
      reason: `現在の状況を分析し、${bestStrategy.getName()}を採用: ${choice.reason}`
    }
  }

  selectCards(challenge: Card, availableCards: Card[], game: Game): CardChoice {
    const bestStrategy = this.selectBestStrategy(game)
    const choice = bestStrategy.selectCards(challenge, availableCards, game)
    
    return {
      ...choice,
      reason: `${bestStrategy.getName()}による判断: ${choice.reason}`
    }
  }

  evaluateFitness(game: Game): number {
    // 他の戦略の中で最も適用度の高いものを採用
    return Math.max(...this.strategies.map(strategy => strategy.evaluateFitness(game)))
  }

  private selectBestStrategy(game: Game): AIStrategy {
    // 各戦略の適用度を評価し、最も適したものを選択
    const strategyScores = this.strategies.map(strategy => ({
      strategy,
      fitness: strategy.evaluateFitness(game)
    }))

    return strategyScores
      .sort((a, b) => b.fitness - a.fitness)[0]
      .strategy
  }
}

/**
 * AI戦略ファクトリー
 */
export class AIStrategyFactory {
  private static readonly strategies = new Map<AIStrategyType, () => AIStrategy>([
    ['conservative', () => new ConservativeStrategy()],
    ['aggressive', () => new AggressiveStrategy()],
    ['balanced', () => new BalancedStrategy()],
    ['adaptive', () => new AdaptiveStrategy()]
  ])

  /**
   * 指定されたタイプの戦略を作成
   */
  static createStrategy(type: AIStrategyType): AIStrategy {
    const factory = this.strategies.get(type)
    if (!factory) {
      throw new Error(`Unknown strategy type: ${type}`)
    }
    return factory()
  }

  /**
   * 利用可能な戦略タイプを取得
   */
  static getAvailableTypes(): AIStrategyType[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * 戦略の説明を取得
   */
  static getStrategyDescription(type: AIStrategyType): string {
    switch (type) {
      case 'conservative':
        return 'リスクを避け、安全な選択を優先する戦略。活力が低い時に適している。'
      case 'aggressive':
        return '高リスク高リターンを狙う戦略。活力と手札が充実している時に効果的。'
      case 'balanced':
        return 'リスクとリターンのバランスを重視する万能戦略。安定した判断を行う。'
      case 'adaptive':
        return '状況に応じて最適な戦略を自動選択する高度な戦略。経験豊富なプレイヤー向け。'
      default:
        return '不明な戦略タイプです。'
    }
  }
}

/**
 * AI戦略管理サービス
 */
export class AIStrategyService {
  private currentStrategy: AIStrategy
  private statisticsEnabled: boolean = true
  private decisionHistory: Array<{
    turn: number
    strategy: string
    challengeChoice: ChallengeChoice
    cardChoice: CardChoice
    result: 'success' | 'failure'
  }> = []

  constructor(strategyType: AIStrategyType = 'balanced') {
    this.currentStrategy = AIStrategyFactory.createStrategy(strategyType)
  }

  /**
   * 現在の戦略を取得
   */
  getCurrentStrategy(): AIStrategy {
    return this.currentStrategy
  }

  /**
   * 戦略を変更
   */
  setStrategy(strategyType: AIStrategyType): void {
    this.currentStrategy = AIStrategyFactory.createStrategy(strategyType)
  }

  /**
   * チャレンジを自動選択
   */
  autoSelectChallenge(availableChallenges: Card[], game: Game): ChallengeChoice {
    const choice = this.currentStrategy.selectChallenge(availableChallenges, game)
    
    if (this.statisticsEnabled) {
      console.log(`AI戦略 (${this.currentStrategy.getName()}): ${choice.reason}`)
      console.log(`選択されたチャレンジ: ${choice.challenge.name} (成功確率: ${(choice.successProbability * 100).toFixed(1)}%)`)
    }

    return choice
  }

  /**
   * カードを自動選択
   */
  autoSelectCards(challenge: Card, availableCards: Card[], game: Game): CardChoice {
    const choice = this.currentStrategy.selectCards(challenge, availableCards, game)
    
    if (this.statisticsEnabled) {
      console.log(`AI戦略 (${this.currentStrategy.getName()}): ${choice.reason}`)
      console.log(`選択されたカード: ${choice.cards.map(c => c.name).join(', ')} (期待パワー: ${choice.expectedPower})`)
    }

    return choice
  }

  /**
   * 意思決定履歴を記録
   */
  recordDecision(
    turn: number,
    challengeChoice: ChallengeChoice,
    cardChoice: CardChoice,
    success: boolean
  ): void {
    if (!this.statisticsEnabled) return

    this.decisionHistory.push({
      turn,
      strategy: this.currentStrategy.getName(),
      challengeChoice,
      cardChoice,
      result: success ? 'success' : 'failure'
    })

    // 履歴を最新100件に制限
    if (this.decisionHistory.length > 100) {
      this.decisionHistory = this.decisionHistory.slice(-100)
    }
  }

  /**
   * 統計情報を取得
   */
  getStatistics() {
    const total = this.decisionHistory.length
    if (total === 0) {
      return {
        totalDecisions: 0,
        successRate: 0,
        strategyUsage: new Map<string, number>()
      }
    }

    const successes = this.decisionHistory.filter(d => d.result === 'success').length
    const strategyUsage = new Map<string, number>()

    this.decisionHistory.forEach(decision => {
      const count = strategyUsage.get(decision.strategy) || 0
      strategyUsage.set(decision.strategy, count + 1)
    })

    return {
      totalDecisions: total,
      successRate: successes / total,
      strategyUsage
    }
  }

  /**
   * 統計収集の有効/無効を切り替え
   */
  setStatisticsEnabled(enabled: boolean): void {
    this.statisticsEnabled = enabled
  }

  /**
   * 意思決定履歴をクリア
   */
  clearHistory(): void {
    this.decisionHistory = []
  }
}