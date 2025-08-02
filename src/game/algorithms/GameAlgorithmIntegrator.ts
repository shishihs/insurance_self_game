import type { Card } from '../../domain/entities/Card'
import { Deck } from '../../domain/entities/Deck'
import type { GameStage } from '../../domain/types/card.types'

import { 
  AdvancedShuffleAlgorithm, 
  type ShuffleConfig, 
  type ShuffleStatistics 
} from './AdvancedShuffleAlgorithm'

import { 
  CardCombinationOptimizer, 
  type OptimizationConfig, 
  type OptimizationResult 
} from './CardCombinationOptimizer'

import { 
  type AIConfig, 
  type AIDecision, 
  type GameStateSnapshot, 
  StrategicAISystem 
} from './StrategicAISystem'

import { 
  type DrawGameState, 
  type ProbabilisticDrawResult, 
  ProbabilisticDrawSystem, 
  type ProbabilityConfig 
} from './ProbabilisticDrawSystem'

/**
 * 統合設定
 */
export interface IntegratorConfig {
  /** シャッフル設定 */
  shuffle: Partial<ShuffleConfig>
  /** 最適化設定 */
  optimization: Partial<OptimizationConfig>
  /** AI設定 */
  ai: Partial<AIConfig>
  /** 確率制御設定 */
  probability: Partial<ProbabilityConfig>
  /** デバッグモード */
  debugMode: boolean
}

/**
 * 統合レポート
 */
export interface IntegrationReport {
  /** シャッフル統計 */
  shuffleStats: ShuffleStatistics
  /** 最適化結果 */
  optimizationResult: OptimizationResult
  /** AI判定情報 */
  aiDecisions: AIDecision[]
  /** ドロー統計 */
  drawStats: any
  /** パフォーマンス情報 */
  performance: {
    shuffleTime: number
    optimizationTime: number
    aiThinkingTime: number
    drawTime: number
    totalTime: number
  }
}

/**
 * ゲームアルゴリズム統合器
 * 
 * 4つの高度なアルゴリズムを統合し、
 * 既存のゲームシステムで簡単に使用できるインターフェースを提供
 */
export class GameAlgorithmIntegrator {
  private drawSystem: ProbabilisticDrawSystem
  private lastReport?: IntegrationReport

  constructor(private config: IntegratorConfig) {
    this.drawSystem = new ProbabilisticDrawSystem(config.probability)
  }

  /**
   * デッキを高度アルゴリズムでシャッフル
   */
  async shuffleDeck(deck: Deck, seed?: number): Promise<{
    shuffledDeck: Deck
    statistics: ShuffleStatistics
  }> {
    const startTime = performance.now()
    
    const cards = deck.getCards()
    const shuffleConfig: ShuffleConfig = {
      ...this.config.shuffle,
      seed,
      debugMode: this.config.debugMode
    }

    const result = AdvancedShuffleAlgorithm.shuffle(cards, shuffleConfig)
    
    // 新しいデッキを作成
    const shuffledDeck = new Deck(deck.getName())
    shuffledDeck.addCards(result.shuffledCards)

    const endTime = performance.now()

    if (this.config.debugMode) {
      console.log(`Advanced Shuffle completed in ${endTime - startTime}ms`)
      console.log('Shuffle Statistics:', result.statistics)
    }

    return {
      shuffledDeck,
      statistics: result.statistics
    }
  }

  /**
   * 最適なカード組み合わせを生成
   */
  async optimizeCardCombination(
    cardPool: Card[],
    playerLevel: number,
    targetDifficulty: number = 0.6
  ): Promise<OptimizationResult> {
    const startTime = performance.now()
    
    const optimizationConfig: OptimizationConfig = {
      ...this.config.optimization,
      playerLevel,
      targetDifficulty
    }

    const result = CardCombinationOptimizer.optimize(cardPool, optimizationConfig)
    
    const endTime = performance.now()

    if (this.config.debugMode) {
      console.log(`Card Optimization completed in ${endTime - startTime}ms`)
      console.log('Best Combination:', result.bestCombinations[0])
    }

    return result
  }

  /**
   * AI による戦略的判定
   */
  async getAIRecommendation(gameState: GameStateSnapshot): Promise<AIDecision> {
    const startTime = performance.now()
    
    const aiConfig: AIConfig = {
      ...this.config.ai,
      debugMode: this.config.debugMode
    }

    const decision = StrategicAISystem.decideAction(gameState, aiConfig)
    
    const endTime = performance.now()

    if (this.config.debugMode) {
      console.log(`AI Decision completed in ${endTime - startTime}ms`)
      console.log('AI Recommendation:', decision.recommendedAction)
      console.log('Confidence:', decision.confidence)
    }

    return decision
  }

  /**
   * 確率制御によるカードドロー
   */
  async drawOptimizedCard(
    availableCards: Card[],
    gameState: DrawGameState
  ): Promise<ProbabilisticDrawResult> {
    const startTime = performance.now()
    
    const result = this.drawSystem.drawCard(availableCards, gameState)
    
    const endTime = performance.now()

    if (this.config.debugMode) {
      console.log(`Probabilistic Draw completed in ${endTime - startTime}ms`)
      console.log('Drawn Card:', result.drawnCard.name)
      console.log('Probability Info:', result.probabilityInfo)
    }

    return result
  }

  /**
   * ゲーム開始時の包括的セットアップ
   */
  async setupGameSession(
    playerDeck: Deck,
    challengeDeck: Deck,
    playerLevel: number,
    gameStage: GameStage
  ): Promise<{
    shuffledPlayerDeck: Deck
    shuffledChallengeDeck: Deck
    optimizedStartingHand: Card[]
    setupReport: IntegrationReport
  }> {
    const totalStartTime = performance.now()
    const performanceTracking = {
      shuffleTime: 0,
      optimizationTime: 0,
      aiThinkingTime: 0,
      drawTime: 0,
      totalTime: 0
    }

    // Step 1: デッキをシャッフル
    const shuffleStartTime = performance.now()
    const playerShuffleResult = await this.shuffleDeck(playerDeck)
    const challengeShuffleResult = await this.shuffleDeck(challengeDeck)
    performanceTracking.shuffleTime = performance.now() - shuffleStartTime

    // Step 2: 最適な開始手札を計算
    const optimizationStartTime = performance.now()
    const allCards = [
      ...playerShuffleResult.shuffledDeck.getCards(),
      ...challengeShuffleResult.shuffledDeck.getCards()
    ]
    
    const optimizationResult = await this.optimizeCardCombination(
      allCards.slice(0, 20), // 上位20枚から選択
      playerLevel,
      0.4 // 開始時は易しめに設定
    )
    performanceTracking.optimizationTime = performance.now() - optimizationStartTime

    // Step 3: AI による初期戦略提案
    const aiStartTime = performance.now()
    const initialGameState: GameStateSnapshot = {
      playerHand: optimizationResult.bestCombinations[0]?.cards || [],
      playerVitality: 10,
      currentChallenge: challengeShuffleResult.shuffledDeck.drawCard() || undefined,
      fieldCards: [],
      turnNumber: 1,
      gameStage,
      context: { setupPhase: true }
    }
    
    const aiDecision = await this.getAIRecommendation(initialGameState)
    performanceTracking.aiThinkingTime = performance.now() - aiStartTime

    // Step 4: 確率システムの初期化
    const drawStartTime = performance.now()
    const drawGameState: DrawGameState = {
      playerLevel,
      currentTurn: 1,
      playerVitality: 10,
      gameStage,
      recentPerformance: 'neutral',
      handComposition: {},
      difficultyLevel: 5
    }
    
    // 統計システムを初期化（実際のドローは後で行う）
    performanceTracking.drawTime = performance.now() - drawStartTime

    performanceTracking.totalTime = performance.now() - totalStartTime

    // 統合レポートを作成
    const setupReport: IntegrationReport = {
      shuffleStats: playerShuffleResult.statistics,
      optimizationResult,
      aiDecisions: [aiDecision],
      drawStats: this.drawSystem.getStatistics(),
      performance: performanceTracking
    }

    this.lastReport = setupReport

    return {
      shuffledPlayerDeck: playerShuffleResult.shuffledDeck,
      shuffledChallengeDeck: challengeShuffleResult.shuffledDeck,
      optimizedStartingHand: optimizationResult.bestCombinations[0]?.cards || [],
      setupReport
    }
  }

  /**
   * ターン処理の包括的サポート
   */
  async processTurn(
    gameState: GameStateSnapshot,
    availableDrawCards: Card[],
    playerLevel: number
  ): Promise<{
    aiRecommendation: AIDecision
    drawnCard?: ProbabilisticDrawResult
    turnReport: Partial<IntegrationReport>
  }> {
    const turnStartTime = performance.now()
    const performanceTracking = {
      shuffleTime: 0,
      optimizationTime: 0,
      aiThinkingTime: 0,
      drawTime: 0,
      totalTime: 0
    }

    // AI判定
    const aiStartTime = performance.now()
    const aiRecommendation = await this.getAIRecommendation(gameState)
    performanceTracking.aiThinkingTime = performance.now() - aiStartTime

    // カードドロー（必要に応じて）
    let drawnCard: ProbabilisticDrawResult | undefined
    if (availableDrawCards.length > 0) {
      const drawStartTime = performance.now()
      const drawGameState: DrawGameState = {
        playerLevel,
        currentTurn: gameState.turnNumber,
        playerVitality: gameState.playerVitality,
        gameStage: gameState.gameStage,
        recentPerformance: this.evaluateRecentPerformance(gameState),
        handComposition: this.analyzeHandComposition(gameState.playerHand),
        difficultyLevel: this.calculateDifficultyLevel(gameState)
      }
      
      drawnCard = await this.drawOptimizedCard(availableDrawCards, drawGameState)
      performanceTracking.drawTime = performance.now() - drawStartTime
    }

    performanceTracking.totalTime = performance.now() - turnStartTime

    const turnReport: Partial<IntegrationReport> = {
      aiDecisions: [aiRecommendation],
      drawStats: this.drawSystem.getStatistics(),
      performance: performanceTracking
    }

    return {
      aiRecommendation,
      drawnCard,
      turnReport
    }
  }

  /**
   * ゲーム終了時の包括的分析
   */
  async analyzeGameSession(): Promise<{
    finalReport: IntegrationReport
    recommendations: string[]
    performanceSummary: {
      totalOperations: number
      averageResponseTime: number
      systemEfficiency: number
      playerSatisfactionEstimate: number
    }
  }> {
    const drawStats = this.drawSystem.getStatistics()
    const history = this.drawSystem.getHistory(50) // 最近50回のドロー
    
    // パフォーマンス分析
    const performanceSummary = {
      totalOperations: drawStats.totalDraws,
      averageResponseTime: this.calculateAverageResponseTime(),
      systemEfficiency: this.calculateSystemEfficiency(),
      playerSatisfactionEstimate: drawStats.satisfactionScore
    }

    // 改善提案を生成
    const recommendations = this.generateRecommendations(drawStats, performanceSummary)

    const finalReport: IntegrationReport = {
      shuffleStats: this.lastReport?.shuffleStats || {
        swapCount: 0,
        biasAdjustments: 0,
        entropy: 0,
        qualityScore: 0,
        typeDistribution: {},
        powerDistribution: { low: 0, medium: 0, high: 0 }
      },
      optimizationResult: this.lastReport?.optimizationResult || {
        bestCombinations: [],
        statistics: {
          evaluatedCombinations: 0,
          processingTimeMs: 0,
          convergenceScore: 0,
          diversityIndex: 0
        }
      },
      aiDecisions: this.lastReport?.aiDecisions || [],
      drawStats,
      performance: this.lastReport?.performance || {
        shuffleTime: 0,
        optimizationTime: 0,
        aiThinkingTime: 0,
        drawTime: 0,
        totalTime: 0
      }
    }

    return {
      finalReport,
      recommendations,
      performanceSummary
    }
  }

  /**
   * 設定を動的に更新
   */
  updateConfiguration(newConfig: Partial<IntegratorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 確率システムの設定を更新
    if (newConfig.probability) {
      this.drawSystem = new ProbabilisticDrawSystem({
        ...this.config.probability,
        ...newConfig.probability
      })
    }
  }

  /**
   * システム状態をリセット
   */
  reset(): void {
    this.drawSystem.reset()
    this.lastReport = undefined
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    return {
      config: this.config,
      drawSystemStats: this.drawSystem.getStatistics(),
      drawHistory: this.drawSystem.getHistory(10),
      lastReport: this.lastReport
    }
  }

  // プライベートヘルパーメソッド

  private evaluateRecentPerformance(gameState: GameStateSnapshot): 'success' | 'failure' | 'neutral' {
    // ゲーム状態から最近のパフォーマンスを評価
    // 簡略化された実装
    if (gameState.playerVitality > 7) return 'success'
    if (gameState.playerVitality < 3) return 'failure'
    return 'neutral'
  }

  private analyzeHandComposition(hand: Card[]): Record<string, number> {
    const composition: Record<string, number> = {}
    hand.forEach(card => {
      composition[card.type] = (composition[card.type] || 0) + 1
    })
    return composition
  }

  private calculateDifficultyLevel(gameState: GameStateSnapshot): number {
    // ゲーム状態から困難度を計算
    let difficulty = 5 // ベースライン
    
    if (gameState.currentChallenge) {
      difficulty += Math.min(3, gameState.currentChallenge.power / 3)
    }
    
    if (gameState.playerVitality < 5) {
      difficulty += 2
    }
    
    return Math.min(10, Math.max(1, difficulty))
  }

  private calculateAverageResponseTime(): number {
    if (!this.lastReport) return 0
    
    const times = this.lastReport.performance
    const totalTime = times.shuffleTime + times.optimizationTime + times.aiThinkingTime + times.drawTime
    const operationCount = 4 // 4つの主要操作
    
    return totalTime / operationCount
  }

  private calculateSystemEfficiency(): number {
    const drawStats = this.drawSystem.getStatistics()
    
    // 偏り指標が低く、満足度が高いほど効率的
    const biasScore = Math.max(0, 1 - drawStats.biasIndicator)
    const satisfactionScore = drawStats.satisfactionScore
    
    return (biasScore + satisfactionScore) / 2
  }

  private generateRecommendations(
    drawStats: any, 
    performanceSummary: any
  ): string[] {
    const recommendations: string[] = []
    
    if (drawStats.biasIndicator > 0.3) {
      recommendations.push('偏り防止の強度を上げることを推奨します')
    }
    
    if (drawStats.satisfactionScore < 0.6) {
      recommendations.push('プレイヤー体験最適化レベルを調整することを推奨します')
    }
    
    if (performanceSummary.averageResponseTime > 100) {
      recommendations.push('応答時間の改善のためアルゴリズム設定の調整を検討してください')
    }
    
    if (performanceSummary.systemEfficiency < 0.7) {
      recommendations.push('システム効率向上のため設定の見直しを推奨します')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('システムは最適な状態で動作しています')
    }
    
    return recommendations
  }
}