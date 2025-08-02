import type { Card } from '../../domain/entities/Card'
import type { GameStage } from '../../domain/types/card.types'

/**
 * 確率制御設定
 */
export interface ProbabilityConfig {
  /** 基本確率分布 */
  baseProbabilities: Record<string, number>
  /** 動的調整を有効にするか */
  enableDynamicAdjustment: boolean
  /** 偏り防止の強度（0.0-1.0） */
  biasPreventionStrength: number
  /** プレイヤー体験最適化レベル（0.0-1.0） */
  experienceOptimizationLevel: number
  /** 学習機能を有効にするか */
  enableLearning: boolean
  /** デバッグモード */
  debugMode: boolean
}

/**
 * ドロー履歴エントリ
 */
export interface DrawHistoryEntry {
  /** ドローしたカード */
  card: Card
  /** ドロー時刻 */
  timestamp: number
  /** ドロー時のゲーム状態 */
  gameState: DrawGameState
  /** 調整された確率 */
  adjustedProbability: number
  /** 元の確率 */
  originalProbability: number
}

/**
 * ドロー時のゲーム状態
 */
export interface DrawGameState {
  /** プレイヤーレベル */
  playerLevel: number
  /** 現在のターン */
  currentTurn: number
  /** プレイヤーの活力 */
  playerVitality: number
  /** ゲームステージ */
  gameStage: GameStage
  /** 最近の成功/失敗 */
  recentPerformance: 'success' | 'failure' | 'neutral'
  /** 手札の状況 */
  handComposition: Record<string, number>
  /** 困難度 */
  difficultyLevel: number
}

/**
 * 確率調整結果
 */
export interface ProbabilityAdjustment {
  /** 調整前の確率分布 */
  originalDistribution: Record<string, number>
  /** 調整後の確率分布 */
  adjustedDistribution: Record<string, number>
  /** 調整理由 */
  adjustmentReasons: string[]
  /** 調整の強度 */
  adjustmentStrength: number
}

/**
 * ドロー結果
 */
export interface ProbabilisticDrawResult {
  /** ドローされたカード */
  drawnCard: Card
  /** ドロー確率情報 */
  probabilityInfo: {
    originalProbability: number
    adjustedProbability: number
    adjustmentFactors: string[]
  }
  /** 統計情報更新 */
  statisticsUpdate: DrawStatistics
  /** デバッグ情報 */
  debugInfo?: {
    candidateCards: Card[]
    probabilityDistribution: Record<string, number>
    randomValue: number
  }
}

/**
 * ドロー統計情報
 */
export interface DrawStatistics {
  /** 総ドロー数 */
  totalDraws: number
  /** カードタイプ別ドロー数 */
  typeDrawCounts: Record<string, number>
  /** カードタイプ別確率 */
  typeProbabilities: Record<string, number>
  /** 偏り指標 */
  biasIndicator: number
  /** 満足度スコア */
  satisfactionScore: number
  /** 予測精度 */
  predictionAccuracy: number
}

/**
 * 満足度要因
 */
interface SatisfactionFactors {
  /** パワーレベル満足度 */
  powerLevelSatisfaction: number
  /** 多様性満足度 */
  diversitySatisfaction: number
  /** タイミング満足度 */
  timingSatisfaction: number
  /** 進行感満足度 */
  progressSatisfaction: number
}

/**
 * 確率的ドローシステム
 * 
 * プレイヤーの状況と履歴を分析して、最適なカードドロー確率を動的に調整
 */
export class ProbabilisticDrawSystem {
  private static readonly DEFAULT_CONFIG: ProbabilityConfig = {
    baseProbabilities: {
      'life': 0.40,      // 40% - 基本的な人生カード
      'insurance': 0.25, // 25% - 保険カード
      'challenge': 0.20, // 20% - チャレンジカード
      'skill': 0.10,     // 10% - スキルカード
      'combo': 0.03,     // 3% - コンボカード
      'legendary': 0.02  // 2% - レジェンダリーカード
    },
    enableDynamicAdjustment: true,
    biasPreventionStrength: 0.7,
    experienceOptimizationLevel: 0.8,
    enableLearning: true,
    debugMode: false
  }

  private drawHistory: DrawHistoryEntry[] = []
  private statistics: DrawStatistics
  private readonly learningWeights: Map<string, number> = new Map()
  private readonly satisfactionModel: Map<string, SatisfactionFactors> = new Map()

  constructor(private readonly config: ProbabilityConfig = ProbabilisticDrawSystem.DEFAULT_CONFIG) {
    this.statistics = this.initializeStatistics()
    this.initializeLearningWeights()
  }

  /**
   * カードをドロー
   */
  drawCard(
    availableCards: Card[],
    gameState: DrawGameState
  ): ProbabilisticDrawResult {
    // Phase 1: 基本確率分布を計算
    const baseProbabilities = this.calculateBaseProbabilities(availableCards, gameState)
    
    // Phase 2: 動的調整を適用
    const adjustment = this.applyDynamicAdjustment(
      baseProbabilities, 
      availableCards, 
      gameState
    )
    
    // Phase 3: 偏り防止とプレイヤー体験最適化
    const optimizedProbabilities = this.optimizeForPlayerExperience(
      adjustment.adjustedDistribution,
      availableCards,
      gameState
    )
    
    // Phase 4: 実際のドロー実行
    const drawnCard = this.executeWeightedDraw(availableCards, optimizedProbabilities)
    
    // Phase 5: 履歴と統計の更新
    const historyEntry = this.createHistoryEntry(
      drawnCard, 
      gameState, 
      optimizedProbabilities[drawnCard.id] || 0,
      baseProbabilities[drawnCard.id] || 0
    )
    
    this.updateHistory(historyEntry)
    this.updateStatistics(drawnCard)
    
    // Phase 6: 学習データの更新
    if (this.config.enableLearning) {
      this.updateLearningModel(drawnCard, gameState)
    }
    
    return {
      drawnCard,
      probabilityInfo: {
        originalProbability: baseProbabilities[drawnCard.id] || 0,
        adjustedProbability: optimizedProbabilities[drawnCard.id] || 0,
        adjustmentFactors: adjustment.adjustmentReasons
      },
      statisticsUpdate: { ...this.statistics },
      debugInfo: this.config.debugMode ? {
        candidateCards: availableCards,
        probabilityDistribution: optimizedProbabilities,
        randomValue: Math.random() // 実際の値は保存済み
      } : undefined
    }
  }

  /**
   * 基本確率分布を計算
   */
  private calculateBaseProbabilities(
    cards: Card[], 
    gameState: DrawGameState
  ): Record<string, number> {
    const probabilities: Record<string, number> = {}
    
    cards.forEach(card => {
      // 基本確率を取得
      let baseProbability = this.config.baseProbabilities[card.type] || 0.1
      
      // ゲームステージによる調整
      baseProbability *= this.getStageMultiplier(card, gameState.gameStage)
      
      // プレイヤーレベルによる調整
      baseProbability *= this.getLevelMultiplier(card, gameState.playerLevel)
      
      // レアリティによる調整
      baseProbability *= this.getRarityMultiplier(card)
      
      probabilities[card.id] = baseProbability
    })
    
    // 確率を正規化
    const totalProbability = Object.values(probabilities).reduce((sum, p) => sum + p, 0)
    if (totalProbability > 0) {
      Object.keys(probabilities).forEach(cardId => {
        probabilities[cardId] /= totalProbability
      })
    }
    
    return probabilities
  }

  /**
   * ゲームステージ別の倍率を取得
   */
  private getStageMultiplier(card: Card, stage: GameStage): number {
    const multipliers: Record<GameStage, Record<string, number>> = {
      youth: {
        'life': 1.2,
        'insurance': 0.8,
        'challenge': 1.0,
        'skill': 1.1
      },
      middle: {
        'life': 1.0,
        'insurance': 1.3,
        'challenge': 1.1,
        'skill': 1.0
      },
      fulfillment: {
        'life': 0.9,
        'insurance': 1.0,
        'challenge': 1.2,
        'skill': 1.3
      }
    }
    
    return multipliers[stage]?.[card.type] || 1.0
  }

  /**
   * プレイヤーレベル別の倍率を取得
   */
  private getLevelMultiplier(card: Card, level: number): number {
    // レベルが高いプレイヤーには高品質カードの確率を上げる
    const levelRatio = level / 100
    
    if (card.power > 8 || card.type === 'legendary') {
      return 0.5 + levelRatio * 1.5 // 高パワーカードはレベルに応じて出現率UP
    }
    
    if (card.power < 3) {
      return 1.5 - levelRatio * 0.8 // 低パワーカードはレベルに応じて出現率DOWN
    }
    
    return 1.0
  }

  /**
   * レアリティ倍率を取得
   */
  private getRarityMultiplier(card: Card): number {
    if (card.type === 'legendary') return 0.1
    if (card.skillProperties?.rarity === 'legendary') return 0.15
    if (card.skillProperties?.rarity === 'epic') return 0.3
    if (card.skillProperties?.rarity === 'rare') return 0.6
    
    return 1.0
  }

  /**
   * 動的調整を適用
   */
  private applyDynamicAdjustment(
    baseProbabilities: Record<string, number>,
    cards: Card[],
    gameState: DrawGameState
  ): ProbabilityAdjustment {
    if (!this.config.enableDynamicAdjustment) {
      return {
        originalDistribution: { ...baseProbabilities },
        adjustedDistribution: { ...baseProbabilities },
        adjustmentReasons: [],
        adjustmentStrength: 0
      }
    }
    
    const adjustedProbabilities = { ...baseProbabilities }
    const adjustmentReasons: string[] = []
    
    // 1. 偏り防止調整
    const biasAdjustment = this.calculateBiasAdjustment(cards, gameState)
    this.applyBiasAdjustment(adjustedProbabilities, biasAdjustment, cards)
    if (Object.keys(biasAdjustment).length > 0) {
      adjustmentReasons.push('偏り防止調整')
    }
    
    // 2. パフォーマンスベース調整
    const performanceAdjustment = this.calculatePerformanceAdjustment(gameState)
    this.applyPerformanceAdjustment(adjustedProbabilities, performanceAdjustment, cards)
    if (performanceAdjustment !== 1.0) {
      adjustmentReasons.push(`パフォーマンス調整(${performanceAdjustment.toFixed(2)}x)`)
    }
    
    // 3. 手札バランス調整
    const balanceAdjustment = this.calculateHandBalanceAdjustment(gameState)
    this.applyHandBalanceAdjustment(adjustedProbabilities, balanceAdjustment, cards)
    if (Object.keys(balanceAdjustment).length > 0) {
      adjustmentReasons.push('手札バランス調整')
    }
    
    // 4. 困難度調整
    const difficultyAdjustment = this.calculateDifficultyAdjustment(gameState)
    this.applyDifficultyAdjustment(adjustedProbabilities, difficultyAdjustment, cards)
    if (difficultyAdjustment !== 1.0) {
      adjustmentReasons.push(`困難度調整(${difficultyAdjustment.toFixed(2)}x)`)
    }
    
    // 5. 学習ベース調整
    if (this.config.enableLearning) {
      const learningAdjustment = this.calculateLearningAdjustment(gameState)
      this.applyLearningAdjustment(adjustedProbabilities, learningAdjustment, cards)
      if (Object.keys(learningAdjustment).length > 0) {
        adjustmentReasons.push('学習ベース調整')
      }
    }
    
    // 確率を再正規化
    this.normalizeProbabilities(adjustedProbabilities)
    
    const adjustmentStrength = this.calculateAdjustmentStrength(
      baseProbabilities, 
      adjustedProbabilities
    )
    
    return {
      originalDistribution: baseProbabilities,
      adjustedDistribution: adjustedProbabilities,
      adjustmentReasons,
      adjustmentStrength
    }
  }

  /**
   * 偏り調整を計算
   */
  private calculateBiasAdjustment(cards: Card[], gameState: DrawGameState): Record<string, number> {
    const adjustment: Record<string, number> = {}
    
    // 最近のドロー履歴を分析
    const recentHistory = this.drawHistory.slice(-10) // 最近10回
    const typeCounts: Record<string, number> = {}
    
    recentHistory.forEach(entry => {
      const type = entry.card.type
      typeCounts[type] = (typeCounts[type] || 0) + 1
    })
    
    // 偏りを検出して調整
    const expectedCount = recentHistory.length * 0.1 // 各タイプの期待値
    
    Object.keys(this.config.baseProbabilities).forEach(type => {
      const actualCount = typeCounts[type] || 0
      const bias = actualCount - expectedCount
      
      if (Math.abs(bias) > 2) { // 偏りが2回以上
        // 多く出現したタイプは確率を下げ、少ないタイプは上げる
        const adjustmentFactor = Math.max(0.1, 1.0 - (bias * 0.1))
        adjustment[type] = adjustmentFactor
      }
    })
    
    return adjustment
  }

  /**
   * パフォーマンス調整を計算
   */
  private calculatePerformanceAdjustment(gameState: DrawGameState): number {
    if (gameState.recentPerformance === 'failure') {
      // 失敗時は少し有利に
      return 1.1
    } if (gameState.recentPerformance === 'success') {
      // 成功時は少し不利に（バランス調整）
      return 0.95
    }
    
    return 1.0
  }

  /**
   * 手札バランス調整を計算
   */
  private calculateHandBalanceAdjustment(gameState: DrawGameState): Record<string, number> {
    const adjustment: Record<string, number> = {}
    const handComposition = gameState.handComposition
    
    // 手札に不足しているタイプを優遇
    const totalCards = Object.values(handComposition).reduce((sum, count) => sum + count, 0)
    
    if (totalCards > 0) {
      Object.keys(this.config.baseProbabilities).forEach(type => {
        const currentRatio = (handComposition[type] || 0) / totalCards
        const expectedRatio = this.config.baseProbabilities[type]
        
        if (currentRatio < expectedRatio * 0.5) {
          // 大幅に不足している場合は確率を上げる
          adjustment[type] = 1.5
        } else if (currentRatio > expectedRatio * 2) {
          // 大幅に過多の場合は確率を下げる
          adjustment[type] = 0.7
        }
      })
    }
    
    return adjustment
  }

  /**
   * 困難度調整を計算
   */
  private calculateDifficultyAdjustment(gameState: DrawGameState): number {
    // プレイヤーの活力が少ない場合は有利に
    if (gameState.playerVitality < 3) {
      return 1.2
    }
    
    // 困難度が高い場合は少し有利に
    if (gameState.difficultyLevel > 7) {
      return 1.1
    }
    
    return 1.0
  }

  /**
   * 学習調整を計算
   */
  private calculateLearningAdjustment(gameState: DrawGameState): Record<string, number> {
    const adjustment: Record<string, number> = {}
    const stateKey = this.generateStateKey(gameState)
    
    // 学習した重みを適用
    this.learningWeights.forEach((weight, key) => {
      if (key.startsWith(stateKey)) {
        const cardType = key.split('-').pop()
        if (cardType) {
          adjustment[cardType] = weight
        }
      }
    })
    
    return adjustment
  }

  /**
   * 各種調整を適用するヘルパーメソッド群
   */
  private applyBiasAdjustment(
    probabilities: Record<string, number>, 
    adjustment: Record<string, number>, 
    cards: Card[]
  ): void {
    cards.forEach(card => {
      if (adjustment[card.type]) {
        probabilities[card.id] *= adjustment[card.type]
      }
    })
  }

  private applyPerformanceAdjustment(
    probabilities: Record<string, number>, 
    multiplier: number, 
    cards: Card[]
  ): void {
    // 高品質カードに適用
    cards.forEach(card => {
      if (card.power > 5 || card.type === 'legendary') {
        probabilities[card.id] *= multiplier
      }
    })
  }

  private applyHandBalanceAdjustment(
    probabilities: Record<string, number>, 
    adjustment: Record<string, number>, 
    cards: Card[]
  ): void {
    cards.forEach(card => {
      if (adjustment[card.type]) {
        probabilities[card.id] *= adjustment[card.type]
      }
    })
  }

  private applyDifficultyAdjustment(
    probabilities: Record<string, number>, 
    multiplier: number, 
    cards: Card[]
  ): void {
    // 全体に適用
    Object.keys(probabilities).forEach(cardId => {
      probabilities[cardId] *= multiplier
    })
  }

  private applyLearningAdjustment(
    probabilities: Record<string, number>, 
    adjustment: Record<string, number>, 
    cards: Card[]
  ): void {
    cards.forEach(card => {
      if (adjustment[card.type]) {
        probabilities[card.id] *= adjustment[card.type]
      }
    })
  }

  /**
   * プレイヤー体験最適化
   */
  private optimizeForPlayerExperience(
    probabilities: Record<string, number>,
    cards: Card[],
    gameState: DrawGameState
  ): Record<string, number> {
    if (this.config.experienceOptimizationLevel === 0) {
      return probabilities
    }
    
    const optimized = { ...probabilities }
    const optimizationLevel = this.config.experienceOptimizationLevel
    
    // 1. 満足度予測モデルに基づく調整
    const satisfactionPredictions = this.predictSatisfaction(cards, gameState)
    
    cards.forEach(card => {
      const satisfaction = satisfactionPredictions.get(card.id) || 0.5
      const multiplier = 0.5 + satisfaction * optimizationLevel
      optimized[card.id] *= multiplier
    })
    
    // 2. 進行感の最適化
    const progressOptimization = this.calculateProgressOptimization(gameState)
    cards.forEach(card => {
      if (this.contributsToProgress(card, gameState)) {
        optimized[card.id] *= (1 + progressOptimization * optimizationLevel)
      }
    })
    
    // 3. サプライズ要素の確保
    const surpriseBoost = this.calculateSurpriseBoost(gameState)
    cards.forEach(card => {
      if (this.isSurpriseCard(card)) {
        optimized[card.id] *= (1 + surpriseBoost * optimizationLevel)
      }
    })
    
    this.normalizeProbabilities(optimized)
    return optimized
  }

  /**
   * 満足度を予測
   */
  private predictSatisfaction(cards: Card[], gameState: DrawGameState): Map<string, number> {
    const predictions = new Map<string, number>()
    
    cards.forEach(card => {
      let satisfaction = 0.5 // 基準値
      
      // パワーレベル満足度
      const powerSatisfaction = this.calculatePowerSatisfaction(card, gameState)
      satisfaction += powerSatisfaction * 0.3
      
      // タイミング満足度
      const timingSatisfaction = this.calculateTimingSatisfaction(card, gameState)
      satisfaction += timingSatisfaction * 0.3
      
      // 多様性満足度
      const diversitySatisfaction = this.calculateDiversitySatisfaction(card, gameState)
      satisfaction += diversitySatisfaction * 0.2
      
      // 進行感満足度
      const progressSatisfaction = this.calculateProgressSatisfaction(card, gameState)
      satisfaction += progressSatisfaction * 0.2
      
      predictions.set(card.id, Math.max(0, Math.min(1, satisfaction)))
    })
    
    return predictions
  }

  /**
   * パワー満足度を計算
   */
  private calculatePowerSatisfaction(card: Card, gameState: DrawGameState): number {
    // プレイヤーの現在の状況に適したパワーレベルかどうか
    const idealPower = this.calculateIdealPowerLevel(gameState)
    const powerDiff = Math.abs(card.power - idealPower)
    
    return Math.max(0, 1 - powerDiff / 10)
  }

  /**
   * タイミング満足度を計算
   */
  private calculateTimingSatisfaction(card: Card, gameState: DrawGameState): number {
    // 現在の状況でそのカードが有用かどうか
    let satisfaction = 0.5
    
    // 活力が少ない時の回復カード
    if (gameState.playerVitality < 5 && card.isRecoveryInsurance()) {
      satisfaction += 0.4
    }
    
    // チャレンジがある時の高パワーカード
    if (gameState.difficultyLevel > 5 && card.power > 6) {
      satisfaction += 0.3
    }
    
    return Math.min(1, satisfaction)
  }

  /**
   * 多様性満足度を計算
   */
  private calculateDiversitySatisfaction(card: Card, gameState: DrawGameState): number {
    // 手札に同じタイプが多い場合は他のタイプを優遇
    const totalHandCards = Object.values(gameState.handComposition).reduce((sum, count) => sum + count, 0)
    const sameTypeCount = gameState.handComposition[card.type] || 0
    
    if (totalHandCards === 0) return 0.5
    
    const sameTypeRatio = sameTypeCount / totalHandCards
    return Math.max(0, 1 - sameTypeRatio * 2)
  }

  /**
   * 進行感満足度を計算
   */
  private calculateProgressSatisfaction(card: Card, gameState: DrawGameState): number {
    // プレイヤーの成長感や達成感に寄与するかどうか
    let satisfaction = 0.5
    
    // レベルアップに寄与するカード
    if (card.isSkillCard() || card.type === 'legendary') {
      satisfaction += 0.3
    }
    
    // 新しい戦略を開拓できるカード
    if (card.isComboCard() || card.comboProperties) {
      satisfaction += 0.2
    }
    
    return Math.min(1, satisfaction)
  }

  /**
   * 理想的なパワーレベルを計算
   */
  private calculateIdealPowerLevel(gameState: DrawGameState): number {
    let idealPower = 5 // ベースライン
    
    // ゲームステージによる調整
    const stageMultipliers = {
      youth: 0.8,
      middle: 1.0,
      fulfillment: 1.3
    }
    idealPower *= stageMultipliers[gameState.gameStage] || 1.0
    
    // プレイヤーレベルによる調整
    idealPower += (gameState.playerLevel / 100) * 5
    
    // 困難度による調整
    idealPower += (gameState.difficultyLevel - 5) * 0.5
    
    return Math.max(1, idealPower)
  }

  /**
   * 進行に寄与するカードかチェック
   */
  private contributsToProgress(card: Card, gameState: DrawGameState): boolean {
    // スキルカード、コンボカード、レジェンダリーカードは進行に寄与
    return card.isSkillCard() || card.isComboCard() || card.type === 'legendary'
  }

  /**
   * サプライズカードかチェック
   */
  private isSurpriseCard(card: Card): boolean {
    // レアカードや特殊効果を持つカード
    return (
      card.type === 'legendary' ||
      card.skillProperties?.rarity === 'legendary' ||
      card.skillProperties?.rarity === 'epic' ||
      (card.comboProperties && card.comboProperties.comboBonus > 5)
    )
  }

  /**
   * 進行最適化を計算
   */
  private calculateProgressOptimization(gameState: DrawGameState): number {
    // ゲームが長期化している場合は進行を促進
    if (gameState.currentTurn > 50) {
      return 0.3
    }
    
    // プレイヤーが停滞している場合
    if (gameState.recentPerformance === 'neutral') {
      return 0.2
    }
    
    return 0.1
  }

  /**
   * サプライズブーストを計算
   */
  private calculateSurpriseBoost(gameState: DrawGameState): number {
    // 最近サプライズがない場合は確率を上げる
    const recentSurprises = this.drawHistory.slice(-20).filter(entry => 
      this.isSurpriseCard(entry.card)
    ).length
    
    if (recentSurprises === 0) {
      return 0.5
    } if (recentSurprises < 2) {
      return 0.2
    }
    
    return 0.05
  }

  /**
   * 重み付きドローを実行
   */
  private executeWeightedDraw(
    cards: Card[], 
    probabilities: Record<string, number>
  ): Card {
    const random = Math.random()
    let cumulativeProbability = 0
    
    for (const card of cards) {
      cumulativeProbability += probabilities[card.id] || 0
      if (random <= cumulativeProbability) {
        return card
      }
    }
    
    // フォールバック（通常は発生しない）
    return cards[Math.floor(Math.random() * cards.length)]
  }

  /**
   * 確率を正規化
   */
  private normalizeProbabilities(probabilities: Record<string, number>): void {
    const total = Object.values(probabilities).reduce((sum, p) => sum + p, 0)
    if (total > 0) {
      Object.keys(probabilities).forEach(cardId => {
        probabilities[cardId] /= total
      })
    }
  }

  /**
   * 調整強度を計算
   */
  private calculateAdjustmentStrength(
    original: Record<string, number>,
    adjusted: Record<string, number>
  ): number {
    let totalDifference = 0
    let count = 0
    
    Object.keys(original).forEach(cardId => {
      const diff = Math.abs((adjusted[cardId] || 0) - (original[cardId] || 0))
      totalDifference += diff
      count++
    })
    
    return count > 0 ? totalDifference / count : 0
  }

  /**
   * 履歴エントリを作成
   */
  private createHistoryEntry(
    card: Card,
    gameState: DrawGameState,
    adjustedProbability: number,
    originalProbability: number
  ): DrawHistoryEntry {
    return {
      card,
      timestamp: Date.now(),
      gameState: { ...gameState },
      adjustedProbability,
      originalProbability
    }
  }

  /**
   * 履歴を更新
   */
  private updateHistory(entry: DrawHistoryEntry): void {
    this.drawHistory.push(entry)
    
    // 履歴サイズを制限（最大1000エントリ）
    if (this.drawHistory.length > 1000) {
      this.drawHistory.shift()
    }
  }

  /**
   * 統計情報を更新
   */
  private updateStatistics(drawnCard: Card): void {
    this.statistics.totalDraws++
    
    const cardType = drawnCard.type
    this.statistics.typeDrawCounts[cardType] = (this.statistics.typeDrawCounts[cardType] || 0) + 1
    
    // 確率を再計算
    Object.keys(this.statistics.typeDrawCounts).forEach(type => {
      this.statistics.typeProbabilities[type] = 
        this.statistics.typeDrawCounts[type] / this.statistics.totalDraws
    })
    
    // 偏り指標を更新
    this.statistics.biasIndicator = this.calculateBiasIndicator()
    
    // 満足度スコアを更新
    this.statistics.satisfactionScore = this.calculateSatisfactionScore()
    
    // 予測精度を更新
    this.statistics.predictionAccuracy = this.calculatePredictionAccuracy()
  }

  /**
   * 偏り指標を計算
   */
  private calculateBiasIndicator(): number {
    const expectedProbs = this.config.baseProbabilities
    const actualProbs = this.statistics.typeProbabilities
    
    let totalDeviation = 0
    let count = 0
    
    Object.keys(expectedProbs).forEach(type => {
      const expected = expectedProbs[type]
      const actual = actualProbs[type] || 0
      totalDeviation += Math.abs(expected - actual)
      count++
    })
    
    return count > 0 ? totalDeviation / count : 0
  }

  /**
   * 満足度スコアを計算
   */
  private calculateSatisfactionScore(): number {
    // 簡略化した満足度計算
    const recentDraws = this.drawHistory.slice(-10)
    let totalSatisfaction = 0
    
    recentDraws.forEach(entry => {
      // 調整が適切に機能していれば満足度が高い
      const adjustmentSuccess = entry.adjustedProbability > entry.originalProbability ? 1 : 0.8
      totalSatisfaction += adjustmentSuccess
    })
    
    return recentDraws.length > 0 ? totalSatisfaction / recentDraws.length : 0.5
  }

  /**
   * 予測精度を計算
   */
  private calculatePredictionAccuracy(): number {
    // 予測した確率と実際の結果の一致度
    // 簡略化した実装
    return Math.max(0, 1 - this.statistics.biasIndicator)
  }

  /**
   * 学習モデルを更新
   */
  private updateLearningModel(drawnCard: Card, gameState: DrawGameState): void {
    const stateKey = this.generateStateKey(gameState)
    const key = `${stateKey}-${drawnCard.type}`
    
    // 学習率
    const learningRate = 0.1
    const currentWeight = this.learningWeights.get(key) || 1.0
    
    // フィードバックに基づく重み更新（簡略化）
    const feedback = this.calculateLearningFeedback(drawnCard, gameState)
    const newWeight = currentWeight + learningRate * (feedback - currentWeight)
    
    this.learningWeights.set(key, newWeight)
  }

  /**
   * 学習フィードバックを計算
   */
  private calculateLearningFeedback(card: Card, gameState: DrawGameState): number {
    // プレイヤーの反応や成果を基にしたフィードバック
    // 実際の実装では、プレイヤーのアクション結果を考慮
    
    let feedback = 1.0
    
    // カードの有効性評価
    if (gameState.recentPerformance === 'success') {
      feedback += 0.2
    } else if (gameState.recentPerformance === 'failure') {
      feedback -= 0.1
    }
    
    return Math.max(0.1, Math.min(2.0, feedback))
  }

  /**
   * 状態キーを生成
   */
  private generateStateKey(gameState: DrawGameState): string {
    const vitality = Math.floor(gameState.playerVitality / 5) * 5
    const turn = Math.floor(gameState.currentTurn / 10) * 10
    const level = Math.floor(gameState.playerLevel / 20) * 20
    
    return `${gameState.gameStage}-${vitality}-${turn}-${level}-${gameState.recentPerformance}`
  }

  /**
   * 統計情報を初期化
   */
  private initializeStatistics(): DrawStatistics {
    return {
      totalDraws: 0,
      typeDrawCounts: {},
      typeProbabilities: {},
      biasIndicator: 0,
      satisfactionScore: 0.5,
      predictionAccuracy: 0.5
    }
  }

  /**
   * 学習重みを初期化
   */
  private initializeLearningWeights(): void {
    // 基本的な重みを設定
    Object.keys(this.config.baseProbabilities).forEach(type => {
      this.learningWeights.set(`default-${type}`, 1.0)
    })
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): DrawStatistics {
    return { ...this.statistics }
  }

  /**
   * 履歴を取得
   */
  getHistory(limit?: number): DrawHistoryEntry[] {
    const history = [...this.drawHistory]
    return limit ? history.slice(-limit) : history
  }

  /**
   * 設定をリセット
   */
  reset(): void {
    this.drawHistory = []
    this.statistics = this.initializeStatistics()
    this.learningWeights.clear()
    this.initializeLearningWeights()
  }
}