import { 
  CardManager, 
  type CardManagerState, 
  type DrawResult, 
  type ICardManager 
} from '../../domain/services/CardManager'
import type { Card } from '../../domain/entities/Card'
import type { Deck } from '../../domain/entities/Deck'
import type { GameConfig } from '../../domain/types/game.types'
import type { GameStage } from '../../domain/types/card.types'

import type { GameAlgorithmIntegrator} from './GameAlgorithmIntegrator';
import { type IntegratorConfig } from './GameAlgorithmIntegrator'
import { 
  ALGORITHM_PRESETS, 
  createAlgorithmSystem, 
  selectOptimalPreset 
} from './AlgorithmUtils'
import { AdvancedDeck } from './AdvancedDeck'
import type { AIDecision, DrawGameState, GameStateSnapshot } from './index'

/**
 * 高度なアルゴリズムで強化されたCardManager
 * 
 * 既存のCardManagerを拡張し、以下の機能を追加：
 * - AI による戦略的判定
 * - 確率制御ドロー
 * - 最適化されたカード組み合わせ提案
 * - 高品質シャッフル
 * - 包括的な統計とレポート
 */
export class AlgorithmEnhancedCardManager implements ICardManager {
  private readonly baseManager: CardManager
  private readonly algorithmSystem: GameAlgorithmIntegrator
  private playerDeck: AdvancedDeck
  private challengeDeck: AdvancedDeck
  private playerLevel: number = 50
  private currentGameStage: GameStage = 'middle'

  constructor(
    playerLevel: number = 50,
    customAlgorithmConfig?: Partial<IntegratorConfig>
  ) {
    this.baseManager = new CardManager()
    this.playerLevel = playerLevel
    
    // プレイヤーレベルに基づいて最適なアルゴリズム設定を選択
    const optimalPreset = selectOptimalPreset(playerLevel)
    this.algorithmSystem = createAlgorithmSystem(optimalPreset, customAlgorithmConfig)

    this.playerDeck = new AdvancedDeck('Enhanced Player Deck')
    this.challengeDeck = new AdvancedDeck('Enhanced Challenge Deck')
  }

  /**
   * 高度アルゴリズムによる初期化
   */
  async initialize(playerDeck: Deck, challengeDeck: Deck, config: GameConfig): Promise<void> {
    // 基本初期化
    this.baseManager.initialize(playerDeck, challengeDeck, config)

    // 高度デッキに変換
    this.playerDeck = new AdvancedDeck(
      playerDeck.getName(),
      playerDeck.getCards()
    )
    this.challengeDeck = new AdvancedDeck(
      challengeDeck.getName(),
      challengeDeck.getCards()
    )

    // デッキを高品質シャッフル
    await this.playerDeck.advancedShuffle()
    await this.challengeDeck.advancedShuffle()

    // ゲームセッションをセットアップ
    const setupResult = await this.algorithmSystem.setupGameSession(
      this.playerDeck,
      this.challengeDeck,
      this.playerLevel,
      this.currentGameStage
    )

    console.log('Advanced Card Manager initialized with setup report:', setupResult.setupReport)
  }

  /**
   * AI による戦略的カードドロー
   */
  async intelligentDrawCards(count: number): Promise<{
    drawResult: DrawResult
    aiRecommendation: AIDecision
    optimizationSuggestions: string[]
  }> {
    const currentState = this.baseManager.getState()
    
    // 現在のゲーム状態を分析
    const gameState: GameStateSnapshot = {
      playerHand: currentState.hand,
      playerVitality: 10, // TODO: 実際のゲーム状態から取得
      currentChallenge: undefined, // TODO: 実際のチャレンジ情報
      fieldCards: [],
      turnNumber: 1, // TODO: 実際のターン数
      gameStage: this.currentGameStage,
      context: {}
    }

    // AI による判定を取得
    const aiRecommendation = await this.algorithmSystem.getAIRecommendation(gameState)

    // 確率制御によるドロー
    const drawGameState: DrawGameState = {
      playerLevel: this.playerLevel,
      currentTurn: gameState.turnNumber,
      playerVitality: gameState.playerVitality,
      gameStage: this.currentGameStage,
      recentPerformance: this.evaluateRecentPerformance(currentState),
      handComposition: this.analyzeHandComposition(currentState.hand),
      difficultyLevel: 5
    }

    const drawnCards: Card[] = []
    const availableCards = this.playerDeck.getCards()

    for (let i = 0; i < count && availableCards.length > 0; i++) {
      const drawResult = await this.algorithmSystem.drawOptimizedCard(
        availableCards,
        drawGameState
      )
      
      if (drawResult) {
        drawnCards.push(drawResult.drawnCard)
        this.baseManager.addToHand(drawResult.drawnCard)
        
        // 利用可能カードから除去
        const cardIndex = availableCards.findIndex(c => c.id === drawResult.drawnCard.id)
        if (cardIndex !== -1) {
          availableCards.splice(cardIndex, 1)
        }
      }
    }

    // 最適化提案を生成
    const optimizationSuggestions = this.playerDeck.getOptimizationSuggestions()

    return {
      drawResult: {
        drawnCards,
        discardedCards: this.baseManager.enforceHandLimit()
      },
      aiRecommendation,
      optimizationSuggestions
    }
  }

  /**
   * 最適なカード組み合わせを提案
   */
  async suggestOptimalCombination(): Promise<{
    combinations: any[]
    evaluation: string
    confidence: number
  }> {
    const currentState = this.baseManager.getState()
    const cardPool = [...currentState.hand, ...this.playerDeck.getCards().slice(0, 10)]

    const optimizationResult = await this.algorithmSystem.optimizeCardCombination(
      cardPool,
      this.playerLevel,
      0.6
    )

    const bestCombination = optimizationResult.bestCombinations[0]
    let evaluation = 'バランスの取れた組み合わせです'
    let confidence = 0.7

    if (bestCombination) {
      confidence = bestCombination.difficultyMatch
      
      if (bestCombination.totalScore > 80) {
        evaluation = '優秀な組み合わせです'
      } else if (bestCombination.totalScore > 60) {
        evaluation = '良い組み合わせです'
      } else {
        evaluation = '改善の余地があります'
      }
    }

    return {
      combinations: optimizationResult.bestCombinations,
      evaluation,
      confidence
    }
  }

  /**
   * ターン処理のサポート
   */
  async processTurnWithAI(
    availableActions: string[],
    challengeCard?: Card
  ): Promise<{
    recommendation: AIDecision
    suggestedActions: string[]
    riskAssessment: {
      level: 'low' | 'medium' | 'high'
      factors: string[]
    }
  }> {
    const currentState = this.baseManager.getState()
    
    const gameState: GameStateSnapshot = {
      playerHand: currentState.hand,
      playerVitality: 10, // TODO: 実際の値
      currentChallenge: challengeCard,
      fieldCards: [],
      turnNumber: 1, // TODO: 実際の値
      gameStage: this.currentGameStage,
      context: { availableActions }
    }

    const recommendation = await this.algorithmSystem.getAIRecommendation(gameState)
    
    // リスク評価
    const riskAssessment = this.assessTurnRisk(currentState, challengeCard)
    
    // 提案アクションを生成
    const suggestedActions = this.generateActionSuggestions(
      recommendation,
      currentState,
      riskAssessment
    )

    return {
      recommendation,
      suggestedActions,
      riskAssessment
    }
  }

  /**
   * 包括的なゲーム分析レポート
   */
  async generateAnalysisReport(): Promise<{
    playerProgress: {
      level: number
      efficiency: number
      adaptability: number
    }
    deckAnalysis: {
      playerDeck: any
      challengeDeck: any
    }
    algorithmPerformance: any
    recommendations: string[]
  }> {
    const sessionAnalysis = await this.algorithmSystem.analyzeGameSession()
    
    return {
      playerProgress: {
        level: this.playerLevel,
        efficiency: sessionAnalysis.performanceSummary.systemEfficiency,
        adaptability: sessionAnalysis.performanceSummary.playerSatisfactionEstimate
      },
      deckAnalysis: {
        playerDeck: this.playerDeck.getDebugInfo(),
        challengeDeck: this.challengeDeck.getDebugInfo()
      },
      algorithmPerformance: sessionAnalysis.finalReport,
      recommendations: sessionAnalysis.recommendations
    }
  }

  /**
   * プレイヤーレベルを動的に調整
   */
  adjustPlayerLevel(performanceScore: number): void {
    const adjustment = performanceScore > 0.8 ? 2 : performanceScore < 0.4 ? -1 : 0
    this.playerLevel = Math.max(1, Math.min(100, this.playerLevel + adjustment))
    
    // 新しいレベルに基づいてアルゴリズム設定を更新
    const newPreset = selectOptimalPreset(this.playerLevel)
    const newConfig = ALGORITHM_PRESETS[newPreset]
    this.algorithmSystem.updateConfiguration(newConfig)
  }

  /**
   * ゲームステージを更新
   */
  updateGameStage(stage: GameStage): void {
    this.currentGameStage = stage
    
    // 確率設定をステージに応じて調整
    const stageConfig = this.getStageSpecificConfig(stage)
    this.algorithmSystem.updateConfiguration(stageConfig)
  }

  // ICardManager インターフェースの実装（既存メソッドの委譲）

  getState(): CardManagerState {
    return this.baseManager.getState()
  }

  setState(state: CardManagerState): void {
    this.baseManager.setState(state)
  }

  drawCards(count: number): DrawResult {
    // 従来の方法も維持（後方互換性）
    return this.baseManager.drawCards(count)
  }

  toggleCardSelection(card: Card): boolean {
    return this.baseManager.toggleCardSelection(card)
  }

  clearSelection(): void {
    this.baseManager.clearSelection()
  }

  discardSelectedCards(): Card[] {
    return this.baseManager.discardSelectedCards()
  }

  addToHand(card: Card): void {
    this.baseManager.addToHand(card)
  }

  addToDiscardPile(card: Card): void {
    this.baseManager.addToDiscardPile(card)
  }

  addToPlayerDeck(card: Card): void {
    this.baseManager.addToPlayerDeck(card)
    this.playerDeck.addCard(card)
  }

  enforceHandLimit(): Card[] {
    return this.baseManager.enforceHandLimit()
  }

  setCardChoices(choices: Card[]): void {
    this.baseManager.setCardChoices(choices)
  }

  clearCardChoices(): void {
    this.baseManager.clearCardChoices()
  }

  getCardChoiceById(cardId: string): Card | undefined {
    return this.baseManager.getCardChoiceById(cardId)
  }

  // プライベートヘルパーメソッド

  private evaluateRecentPerformance(state: CardManagerState): 'success' | 'failure' | 'neutral' {
    // 簡略化された評価ロジック
    const handStrength = state.hand.reduce((sum, card) => sum + card.power, 0)
    const averageStrength = handStrength / Math.max(1, state.hand.length)
    
    if (averageStrength > 6) return 'success'
    if (averageStrength < 3) return 'failure'
    return 'neutral'
  }

  private analyzeHandComposition(hand: Card[]): Record<string, number> {
    const composition: Record<string, number> = {}
    hand.forEach(card => {
      composition[card.type] = (composition[card.type] || 0) + 1
    })
    return composition
  }

  private assessTurnRisk(
    state: CardManagerState, 
    challenge?: Card
  ): { level: 'low' | 'medium' | 'high'; factors: string[] } {
    const factors: string[] = []
    let riskScore = 0

    // チャレンジの難易度
    if (challenge && challenge.power > 8) {
      riskScore += 3
      factors.push('高難易度チャレンジ')
    }

    // 手札の状況
    const handPower = state.hand.reduce((sum, card) => sum + card.power, 0)
    if (handPower < 10) {
      riskScore += 2
      factors.push('手札パワー不足')
    }

    // 保険カードの有無
    const hasInsurance = state.hand.some(card => card.isInsurance())
    if (!hasInsurance) {
      riskScore += 1
      factors.push('保険カード不足')
    }

    let level: 'low' | 'medium' | 'high' = 'low'
    if (riskScore >= 4) level = 'high'
    else if (riskScore >= 2) level = 'medium'

    return { level, factors }
  }

  private generateActionSuggestions(
    recommendation: AIDecision,
    state: CardManagerState,
    riskAssessment: any
  ): string[] {
    const suggestions: string[] = []
    
    // AI推奨に基づく提案
    suggestions.push(`AI推奨: ${recommendation.reasoning}`)
    
    // リスクに基づく提案
    if (riskAssessment.level === 'high') {
      suggestions.push('高リスク状況です。慎重な行動を推奨します')
    }
    
    // 手札に基づく提案
    const handTypes = new Set(state.hand.map(card => card.type))
    if (!handTypes.has('insurance')) {
      suggestions.push('保険カードの準備を検討してください')
    }
    
    return suggestions
  }

  private getStageSpecificConfig(stage: GameStage): Partial<IntegratorConfig> {
    const configs = {
      youth: {
        probability: {
          baseProbabilities: {
            'life': 0.50,
            'insurance': 0.20,
            'challenge': 0.20,
            'skill': 0.08,
            'combo': 0.02,
            'legendary': 0.00
          }
        }
      },
      middle: {
        probability: {
          baseProbabilities: {
            'life': 0.35,
            'insurance': 0.30,
            'challenge': 0.20,
            'skill': 0.12,
            'combo': 0.02,
            'legendary': 0.01
          }
        }
      },
      fulfillment: {
        probability: {
          baseProbabilities: {
            'life': 0.25,
            'insurance': 0.25,
            'challenge': 0.30,
            'skill': 0.15,
            'combo': 0.03,
            'legendary': 0.02
          }
        }
      }
    }

    return configs[stage] || configs.middle
  }
}