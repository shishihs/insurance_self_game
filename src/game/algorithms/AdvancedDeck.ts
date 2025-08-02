import { Deck } from '../../domain/entities/Deck'
import type { Card } from '../../domain/entities/Card'
import type { GameStage } from '../../domain/types/card.types'

import { 
  AdvancedShuffleAlgorithm, 
  type ShuffleConfig, 
  type ShuffleStatistics 
} from './AdvancedShuffleAlgorithm'

import { 
  type DrawGameState, 
  type ProbabilisticDrawResult, 
  ProbabilisticDrawSystem, 
  type ProbabilityConfig 
} from './ProbabilisticDrawSystem'

/**
 * 高度なアルゴリズムを統合したDeckクラス
 * 
 * 既存のDeckクラスを拡張し、以下の機能を追加：
 * - 高品質なシャッフル
 * - 確率制御ドロー
 * - 統計情報の追跡
 * - パフォーマンス監視
 */
export class AdvancedDeck extends Deck {
  private drawSystem: ProbabilisticDrawSystem
  private shuffleHistory: ShuffleStatistics[] = []
  private drawHistory: ProbabilisticDrawResult[] = []
  private lastShuffleSeed?: number

  constructor(
    name: string,
    cards: Card[] = [],
    private probabilityConfig?: ProbabilityConfig,
    private shuffleConfig?: ShuffleConfig
  ) {
    super(name, cards)
    this.drawSystem = new ProbabilisticDrawSystem(probabilityConfig)
  }

  /**
   * 高度アルゴリズムによるシャッフル
   */
  advancedShuffle(seed?: number): ShuffleStatistics {
    const cards = this.getCards()
    this.clear()

    const config: ShuffleConfig = {
      ...this.shuffleConfig,
      seed
    }

    const result = AdvancedShuffleAlgorithm.shuffle(cards, config)
    
    // シャッフル結果をデッキに反映
    this.addCards(result.shuffledCards)
    
    // 統計を記録
    this.shuffleHistory.push(result.statistics)
    this.lastShuffleSeed = seed

    return result.statistics
  }

  /**
   * 確率制御によるカードドロー
   */
  probabilisticDraw(gameState: DrawGameState): ProbabilisticDrawResult | null {
    const availableCards = this.getCards()
    if (availableCards.length === 0) return null

    const result = this.drawSystem.drawCard(availableCards, gameState)
    
    // ドローしたカードを削除
    this.removeCard(result.drawnCard.id)
    
    // 履歴を記録
    this.drawHistory.push(result)
    
    return result
  }

  /**
   * 通常のドロー（後方互換性）
   */
  drawCard(): Card | null {
    // 簡略化したゲーム状態でデフォルトドロー
    const cards = this.getCards()
    if (cards.length === 0) return null

    const defaultGameState: DrawGameState = {
      playerLevel: 50,
      currentTurn: 1,
      playerVitality: 10,
      gameStage: 'middle',
      recentPerformance: 'neutral',
      handComposition: {},
      difficultyLevel: 5
    }

    const result = this.probabilisticDraw(defaultGameState)
    return result?.drawnCard || null
  }

  /**
   * 複数枚の確率制御ドロー
   */
  probabilisticDrawCards(count: number, gameState: DrawGameState): ProbabilisticDrawResult[] {
    const results: ProbabilisticDrawResult[] = []
    
    for (let i = 0; i < count && !this.isEmpty(); i++) {
      const result = this.probabilisticDraw(gameState)
      if (result) {
        results.push(result)
      }
    }
    
    return results
  }

  /**
   * ゲーム状況に最適化されたドロー
   */
  optimizedDraw(
    playerLevel: number,
    gameStage: GameStage,
    playerVitality: number,
    currentTurn: number = 1,
    recentPerformance: 'success' | 'failure' | 'neutral' = 'neutral'
  ): ProbabilisticDrawResult | null {
    const gameState: DrawGameState = {
      playerLevel,
      currentTurn,
      playerVitality,
      gameStage,
      recentPerformance,
      handComposition: {},
      difficultyLevel: Math.min(10, Math.max(1, 5 + Math.floor((currentTurn - 1) / 10)))
    }

    return this.probabilisticDraw(gameState)
  }

  /**
   * シャッフル品質の分析
   */
  analyzeShuffleQuality(): {
    averageQuality: number
    entropyTrend: number[]
    biasAdjustmentTrend: number[]
    recommendation: string
  } {
    if (this.shuffleHistory.length === 0) {
      return {
        averageQuality: 0,
        entropyTrend: [],
        biasAdjustmentTrend: [],
        recommendation: 'シャッフル履歴がありません'
      }
    }

    const qualities = this.shuffleHistory.map(stat => stat.qualityScore)
    const entropies = this.shuffleHistory.map(stat => stat.entropy)
    const biasAdjustments = this.shuffleHistory.map(stat => stat.biasAdjustments)

    const averageQuality = qualities.reduce((sum, q) => sum + q, 0) / qualities.length

    let recommendation = 'シャッフル品質は良好です'
    if (averageQuality < 70) {
      recommendation = 'シャッフル強度を上げることを推奨します'
    } else if (averageQuality > 95) {
      recommendation = '最高品質のシャッフルです'
    }

    return {
      averageQuality,
      entropyTrend: entropies,
      biasAdjustmentTrend: biasAdjustments,
      recommendation
    }
  }

  /**
   * ドロー統計の分析
   */
  analyzeDrawStatistics(): {
    totalDraws: number
    typeDistribution: Record<string, number>
    averageProbabilityAccuracy: number
    satisfactionScore: number
    recommendation: string
  } {
    const drawStats = this.drawSystem.getStatistics()

    let recommendation = 'ドローシステムは正常に動作しています'
    if (drawStats.biasIndicator > 0.3) {
      recommendation = '偏りが検出されています。設定の調整を推奨します'
    } else if (drawStats.satisfactionScore > 0.8) {
      recommendation = '優秀なドロー体験を提供しています'
    }

    return {
      totalDraws: drawStats.totalDraws,
      typeDistribution: drawStats.typeProbabilities,
      averageProbabilityAccuracy: drawStats.predictionAccuracy,
      satisfactionScore: drawStats.satisfactionScore,
      recommendation
    }
  }

  /**
   * デッキの最適化提案
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = []
    const cards = this.getCards()

    if (cards.length === 0) {
      suggestions.push('デッキにカードがありません')
      return suggestions
    }

    // カードタイプ分布の分析
    const typeCount: Record<string, number> = {}
    cards.forEach(card => {
      typeCount[card.type] = (typeCount[card.type] || 0) + 1
    })

    const totalCards = cards.length
    Object.entries(typeCount).forEach(([type, count]) => {
      const ratio = count / totalCards
      
      if (ratio > 0.6) {
        suggestions.push(`${type}カードが多すぎます (${(ratio * 100).toFixed(1)}%)`)
      } else if (ratio < 0.1 && totalCards > 10) {
        suggestions.push(`${type}カードが少なすぎる可能性があります (${(ratio * 100).toFixed(1)}%)`)
      }
    })

    // パワーレベル分析
    const powers = cards.map(card => card.power)
    const avgPower = powers.reduce((sum, power) => sum + power, 0) / powers.length
    const maxPower = Math.max(...powers)
    const minPower = Math.min(...powers)

    if (maxPower - minPower < 3) {
      suggestions.push('パワーレベルの多様性が不足しています')
    }

    if (avgPower < 3) {
      suggestions.push('全体的にパワーレベルが低すぎます')
    } else if (avgPower > 8) {
      suggestions.push('全体的にパワーレベルが高すぎる可能性があります')
    }

    // コスト分析
    const costs = cards.map(card => card.cost)
    const avgCost = costs.reduce((sum, cost) => sum + cost, 0) / costs.length

    if (avgCost > 3) {
      suggestions.push('カードコストが高すぎる可能性があります')
    }

    // シナジー分析
    const comboCards = cards.filter(card => card.comboProperties)
    if (comboCards.length > 0 && comboCards.length < 3) {
      suggestions.push('コンボカードを活用するためより多くの関連カードを追加することを推奨します')
    }

    if (suggestions.length === 0) {
      suggestions.push('デッキ構成は良好です')
    }

    return suggestions
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    shuffleHistory: ShuffleStatistics[]
    drawHistory: ProbabilisticDrawResult[]
    currentStats: any
    lastShuffleSeed?: number
    deckComposition: {
      totalCards: number
      typeDistribution: Record<string, number>
      powerDistribution: { low: number; medium: number; high: number }
      averagePower: number
      averageCost: number
    }
  } {
    const cards = this.getCards()
    const typeDistribution: Record<string, number> = {}
    let totalPower = 0
    let totalCost = 0
    let lowPower = 0, mediumPower = 0, highPower = 0

    cards.forEach(card => {
      typeDistribution[card.type] = (typeDistribution[card.type] || 0) + 1
      totalPower += card.power
      totalCost += card.cost

      if (card.power <= 3) lowPower++
      else if (card.power <= 7) mediumPower++
      else highPower++
    })

    return {
      shuffleHistory: [...this.shuffleHistory],
      drawHistory: [...this.drawHistory],
      currentStats: this.drawSystem.getStatistics(),
      lastShuffleSeed: this.lastShuffleSeed,
      deckComposition: {
        totalCards: cards.length,
        typeDistribution,
        powerDistribution: { low: lowPower, medium: mediumPower, high: highPower },
        averagePower: cards.length > 0 ? totalPower / cards.length : 0,
        averageCost: cards.length > 0 ? totalCost / cards.length : 0
      }
    }
  }

  /**
   * 設定を更新
   */
  updateProbabilityConfig(config: Partial<ProbabilityConfig>): void {
    this.probabilityConfig = { ...this.probabilityConfig, ...config }
    this.drawSystem = new ProbabilisticDrawSystem(this.probabilityConfig)
  }

  updateShuffleConfig(config: Partial<ShuffleConfig>): void {
    this.shuffleConfig = { ...this.shuffleConfig, ...config }
  }

  /**
   * 統計をリセット
   */
  resetStatistics(): void {
    this.shuffleHistory = []
    this.drawHistory = []
    this.drawSystem.reset()
  }

  /**
   * 既存のshuffleメソッドをオーバーライド
   */
  shuffle(): void {
    this.advancedShuffle()
  }

  /**
   * デッキのクローンを作成（統計情報も含む）
   */
  clone(): AdvancedDeck {
    const cloned = new AdvancedDeck(
      this.getName(),
      this.getCards().map(card => card.clone()),
      this.probabilityConfig,
      this.shuffleConfig
    )

    // 統計情報もクローン
    cloned.shuffleHistory = [...this.shuffleHistory]
    cloned.drawHistory = [...this.drawHistory]
    cloned.lastShuffleSeed = this.lastShuffleSeed

    return cloned
  }
}