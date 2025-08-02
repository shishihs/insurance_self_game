/**
 * 最適化されたゲームコンポーネント
 * ゲーム特有のロジックに最適化技術を適用
 */

import { benchmark, memoize, UnifiedPerformanceSystem } from './UnifiedPerformanceSystem'
import { fastShuffle, OptimizedAlgorithms, OptimizedMath, OptimizedObject } from '../utils/performance/OptimizedUtilities'
import type { Card } from '../domain/entities/Card'
import type { Game } from '../domain/entities/Game'

// ===== OPTIMIZED CARD OPERATIONS =====

export class OptimizedCardManager {
  private readonly performanceSystem: UnifiedPerformanceSystem
  private readonly cardCache = new Map<string, Card>()
  private readonly shuffleCache = new Map<string, Card[]>()

  constructor() {
    this.performanceSystem = UnifiedPerformanceSystem.getInstance()
  }

  /**
   * 最適化されたカード作成（オブジェクトプール使用）
   */
  @benchmark
  createCard(id: string, type: string, value: number, riskFactor: number): Card {
    // プールからカードオブジェクトを取得
    const card = this.performanceSystem.acquireFromPool<Card>('cards') || {
      id: '',
      type: '',
      value: 0,
      riskFactor: 0,
      clone() { return { ...this } },
      toString() { return `${this.type}:${this.value}` }
    }

    // プロパティを設定
    card.id = id
    card.type = type
    card.value = value
    card.riskFactor = riskFactor

    // キャッシュに保存
    this.cardCache.set(id, card)

    return card
  }

  /**
   * カードの解放（プールに戻す）
   */
  releaseCard(card: Card): void {
    this.cardCache.delete(card.id)
    
    // カードをリセット
    card.id = ''
    card.type = ''
    card.value = 0
    card.riskFactor = 0

    // プールに戻す
    this.performanceSystem.releaseToPool('cards', card)
  }

  /**
   * メモ化されたカードデッキシャッフル
   */
  @memoize
  shuffleDeck(cards: Card[], seed?: number): Card[] {
    const key = this.generateDeckKey(cards) + (seed || '')
    
    return this.performanceSystem.memoize('gameLogic', `shuffle_${key}`, () => {
      const shuffled = fastShuffle([...cards])
      
      // シード指定の場合は決定論的シャッフル
      if (seed !== undefined) {
        return this.deterministicShuffle(shuffled, seed)
      }
      
      return shuffled
    })
  }

  /**
   * 最適化されたカード検索
   */
  @benchmark
  findCards(cards: Card[], predicate: (card: Card) => boolean): Card[] {
    // 配列をプールから取得
    const results: Card[] = this.performanceSystem.acquireFromPool('arrays') || []
    results.length = 0

    // 最適化されたフィルタリング
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      if (predicate(card)) {
        results.push(card)
      }
    }

    return results
  }

  /**
   * カードの価値計算（メモ化）
   */
  @memoize
  calculateCardValue(card: Card, gameState: any): number {
    const key = `${card.id}_${this.generateGameStateKey(gameState)}`
    
    return this.performanceSystem.memoize('computations', key, () => {
      // 複雑な価値計算ロジック
      const baseValue = card.value
      const riskAdjustment = OptimizedMath.power(1 - card.riskFactor, 2)
      const gameStateModifier = this.calculateGameStateModifier(gameState)
      
      return baseValue * riskAdjustment * gameStateModifier
    })
  }

  /**
   * 最適化されたカードコンボ検出
   */
  @benchmark
  detectCombos(cards: Card[]): Array<{combo: Card[], value: number}> {
    const combos: Array<{combo: Card[], value: number}> = []
    
    // 効率的なコンボ検索アルゴリズム
    const cardsByType = this.groupCardsByType(cards)
    
    // 同じタイプのカードでのコンボ
    for (const [type, typeCards] of cardsByType) {
      if (typeCards.length >= 2) {
        const sortedCards = OptimizedAlgorithms.quickSort(typeCards, (a, b) => b.value - a.value)
        
        for (let i = 0; i < sortedCards.length - 1; i++) {
          for (let j = i + 1; j < sortedCards.length; j++) {
            const combo = [sortedCards[i], sortedCards[j]]
            const value = this.calculateComboValue(combo)
            
            if (value > 0) {
              combos.push({ combo, value })
            }
          }
        }
      }
    }

    // コンボを価値順にソート
    return OptimizedAlgorithms.quickSort(combos, (a, b) => b.value - a.value)
  }

  private generateDeckKey(cards: Card[]): string {
    return cards.map(c => c.id).sort().join(',')
  }

  private generateGameStateKey(gameState: any): string {
    // ゲーム状態の重要な部分だけをキーとして使用
    return `${gameState.turn}_${gameState.vitality}_${gameState.cards?.length || 0}`
  }

  private deterministicShuffle(cards: Card[], seed: number): Card[] {
    // LCG (Linear Congruential Generator) を使用した決定論的シャッフル
    let currentSeed = seed
    const nextRandom = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % (2 ** 32)
      return currentSeed / (2 ** 32)
    }

    const shuffled = [...cards]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(nextRandom() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    return shuffled
  }

  private calculateGameStateModifier(gameState: any): number {
    // ゲーム状態に基づく修正値の計算
    const vitalityRatio = gameState.vitality / 100
    const turnRatio = Math.max(0.1, 1 - gameState.turn / 100)
    
    return vitalityRatio * turnRatio
  }

  private groupCardsByType(cards: Card[]): Map<string, Card[]> {
    const groups = new Map<string, Card[]>()
    
    for (const card of cards) {
      const typeCards = groups.get(card.type) || []
      typeCards.push(card)
      groups.set(card.type, typeCards)
    }
    
    return groups
  }

  private calculateComboValue(combo: Card[]): number {
    if (combo.length < 2) return 0
    
    const totalValue = combo.reduce((sum, card) => sum + card.value, 0)
    const avgRisk = combo.reduce((sum, card) => sum + card.riskFactor, 0) / combo.length
    const synergy = combo.length > 2 ? OptimizedMath.power(1.2, combo.length - 2) : 1
    
    return totalValue * (1 - avgRisk) * synergy
  }
}

// ===== OPTIMIZED GAME STATE MANAGEMENT =====

export class OptimizedGameStateManager {
  private readonly performanceSystem: UnifiedPerformanceSystem
  private readonly stateHistory: Array<any> = []
  private readonly stateCache = new Map<string, any>()

  constructor() {
    this.performanceSystem = UnifiedPerformanceSystem.getInstance()
  }

  /**
   * 最適化されたゲーム状態作成
   */
  @benchmark
  createGameState(initialData: Partial<any>): any {
    const gameState = this.performanceSystem.acquireFromPool('gameStates') || {
      turn: 0,
      vitality: 100,
      cards: [],
      challenges: [],
      insurance: null
    }

    // データをマージ
    Object.assign(gameState, initialData)

    // 履歴に追加
    this.stateHistory.push(this.cloneGameState(gameState))

    return gameState
  }

  /**
   * ゲーム状態の解放
   */
  releaseGameState(gameState: any): void {
    // 状態をリセット
    gameState.turn = 0
    gameState.vitality = 100
    gameState.cards.length = 0
    gameState.challenges.length = 0
    gameState.insurance = null

    // プールに戻す
    this.performanceSystem.releaseToPool('gameStates', gameState)
  }

  /**
   * メモ化されたゲーム状態評価
   */
  @memoize
  evaluateGameState(gameState: any): number {
    const key = this.generateStateKey(gameState)
    
    return this.performanceSystem.memoize('gameLogic', `evaluate_${key}`, () => {
      let score = 0

      // バイタリティスコア
      score += gameState.vitality * 0.4

      // カードスコア
      const cardValue = gameState.cards.reduce((sum: number, card: Card) => sum + card.value, 0)
      score += cardValue * 0.3

      // チャレンジボーナス
      score += gameState.challenges.length * 10

      // 保険ボーナス
      if (gameState.insurance) {
        score += 20
      }

      // ターン効率ボーナス
      const turnEfficiency = gameState.turn > 0 ? score / gameState.turn : score
      score += turnEfficiency * 0.1

      return score
    })
  }

  /**
   * 最適化されたゲーム状態比較
   */
  @benchmark
  compareGameStates(state1: any, state2: any): number {
    const score1 = this.evaluateGameState(state1)
    const score2 = this.evaluateGameState(state2)
    return score1 - score2
  }

  /**
   * ゲーム状態の最適化されたクローン
   */
  @benchmark
  cloneGameState(gameState: any): any {
    return OptimizedObject.fastClone(gameState)
  }

  /**
   * 最適化されたアンドゥ機能
   */
  @benchmark
  undoLastAction(): any | null {
    if (this.stateHistory.length <= 1) return null

    this.stateHistory.pop() // 現在の状態を削除
    const previousState = this.stateHistory[this.stateHistory.length - 1]
    
    return this.cloneGameState(previousState)
  }

  /**
   * 最適化されたゲーム状態検索
   */
  @benchmark
  findBestMove(gameState: any, possibleMoves: Array<() => any>): {move: () => any, expectedValue: number} | null {
    if (possibleMoves.length === 0) return null

    let bestMove = possibleMoves[0]
    let bestValue = -Infinity

    for (const move of possibleMoves) {
      // 仮想的に手を実行
      const clonedState = this.cloneGameState(gameState)
      const resultState = move.call(null, clonedState)
      const value = this.evaluateGameState(resultState)

      if (value > bestValue) {
        bestValue = value
        bestMove = move
      }
    }

    return { move: bestMove, expectedValue: bestValue }
  }

  private generateStateKey(gameState: any): string {
    // 状態の重要な部分だけをキーとして使用
    const cardIds = gameState.cards ? gameState.cards.map((c: Card) => c.id).sort().join(',') : ''
    const challengeCount = gameState.challenges ? gameState.challenges.length : 0
    const hasInsurance = gameState.insurance ? '1' : '0'
    
    return `${gameState.turn}_${gameState.vitality}_${cardIds}_${challengeCount}_${hasInsurance}`
  }
}

// ===== OPTIMIZED ALGORITHM IMPLEMENTATIONS =====

export class OptimizedGameAlgorithms {
  private readonly performanceSystem: UnifiedPerformanceSystem

  constructor() {
    this.performanceSystem = UnifiedPerformanceSystem.getInstance()
  }

  /**
   * 最適化されたカード選択アルゴリズム
   */
  @benchmark
  selectOptimalCards(availableCards: Card[], maxCount: number, gameState: any): Card[] {
    if (availableCards.length <= maxCount) {
      return [...availableCards]
    }

    // カードを価値順にソート
    const cardManager = new OptimizedCardManager()
    const sortedCards = OptimizedAlgorithms.quickSort(availableCards, (a, b) => {
      const valueA = cardManager.calculateCardValue(a, gameState)
      const valueB = cardManager.calculateCardValue(b, gameState)
      return valueB - valueA
    })

    // 上位maxCount枚を選択
    return sortedCards.slice(0, maxCount)
  }

  /**
   * 最適化されたリスク計算
   */
  @memoize
  calculateRisk(cards: Card[], gameState: any): number {
    const key = `${cards.map(c => c.id).sort().join(',')  }_${  gameState.turn}`
    
    return this.performanceSystem.memoize('computations', `risk_${key}`, () => {
      if (cards.length === 0) return 0

      const totalRisk = cards.reduce((sum, card) => sum + card.riskFactor, 0)
      const avgRisk = totalRisk / cards.length

      // ゲーム状態に基づくリスク調整
      const vitalityMultiplier = gameState.vitality < 50 ? 1.5 : 1.0
      const turnMultiplier = gameState.turn > 20 ? 1.2 : 1.0

      return avgRisk * vitalityMultiplier * turnMultiplier
    })
  }

  /**
   * 最適化された保険プレミアム計算
   */
  @memoize
  calculateInsurancePremium(cards: Card[], coverage: number): number {
    const key = `${cards.map(c => c.id).sort().join(',')}_${coverage}`
    
    return this.performanceSystem.memoize('computations', `premium_${key}`, () => {
      const totalValue = cards.reduce((sum, card) => sum + card.value, 0)
      const totalRisk = cards.reduce((sum, card) => sum + card.riskFactor, 0)
      const avgRisk = totalRisk / cards.length

      // ベースプレミアム
      let premium = totalValue * avgRisk * 0.1

      // カバレッジ調整
      const coverageRatio = coverage / totalValue
      premium *= coverageRatio

      // リスク集中ペナルティ
      const riskConcentration = this.calculateRiskConcentration(cards)
      premium *= (1 + riskConcentration * 0.5)

      return Math.round(premium * 100) / 100
    })
  }

  /**
   * 最適化されたゲーム終了条件チェック
   */
  @benchmark
  checkGameEndConditions(gameState: any): {ended: boolean, reason?: string, score?: number} {
    // バイタリティチェック
    if (gameState.vitality <= 0) {
      return {
        ended: true,
        reason: 'vitality_depleted',
        score: this.calculateFinalScore(gameState)
      }
    }

    // 最大ターン数チェック
    if (gameState.turn >= 50) {
      return {
        ended: true,
        reason: 'max_turns_reached',
        score: this.calculateFinalScore(gameState)
      }
    }

    // 勝利条件チェック
    const cardValue = gameState.cards.reduce((sum: number, card: Card) => sum + card.value, 0)
    if (cardValue >= 1000) {
      return {
        ended: true,
        reason: 'victory',
        score: this.calculateFinalScore(gameState)
      }
    }

    return { ended: false }
  }

  /**
   * 最適化されたAI判断システム
   */
  @benchmark
  makeAIDecision(gameState: any, availableActions: string[]): string {
    if (availableActions.length === 0) return 'pass'
    if (availableActions.length === 1) return availableActions[0]

    const stateManager = new OptimizedGameStateManager()
    let bestAction = availableActions[0]
    let bestScore = -Infinity

    // 各アクションの結果を評価
    for (const action of availableActions) {
      const simulatedState = stateManager.cloneGameState(gameState)
      this.simulateAction(simulatedState, action)
      
      const score = stateManager.evaluateGameState(simulatedState)
      
      if (score > bestScore) {
        bestScore = score
        bestAction = action
      }
    }

    return bestAction
  }

  private calculateRiskConcentration(cards: Card[]): number {
    if (cards.length <= 1) return 0

    const typeCount = new Map<string, number>()
    for (const card of cards) {
      typeCount.set(card.type, (typeCount.get(card.type) || 0) + 1)
    }

    // ハーフィンダール・ハーシュマン指数を使用
    let hhi = 0
    for (const count of typeCount.values()) {
      const marketShare = count / cards.length
      hhi += marketShare * marketShare
    }

    return hhi
  }

  private calculateFinalScore(gameState: any): number {
    const stateManager = new OptimizedGameStateManager()
    const baseScore = stateManager.evaluateGameState(gameState)
    
    // ボーナススコア
    let bonusScore = 0
    
    // 生存ボーナス
    if (gameState.vitality > 0) {
      bonusScore += gameState.vitality * 2
    }
    
    // 効率ボーナス
    if (gameState.turn > 0) {
      bonusScore += (baseScore / gameState.turn) * 10
    }
    
    return Math.round(baseScore + bonusScore)
  }

  private simulateAction(gameState: any, action: string): void {
    // アクションのシミュレーション（簡略化）
    switch (action) {
      case 'draw_card':
        gameState.vitality -= 1
        break
      case 'play_card':
        gameState.vitality -= 2
        break
      case 'buy_insurance':
        gameState.vitality -= 5
        gameState.insurance = true
        break
      case 'take_challenge':
        gameState.vitality -= 10
        gameState.challenges.push({ id: Date.now() })
        break
      default:
        // パス - 何もしない
        break
    }
    
    gameState.turn += 1
  }
}

// ===== OPTIMIZED GAME FACTORY =====

export class OptimizedGameFactory {
  private static readonly cardManager = new OptimizedCardManager()
  private static readonly stateManager = new OptimizedGameStateManager()
  private static readonly algorithms = new OptimizedGameAlgorithms()

  /**
   * 最適化されたゲームインスタンス作成
   */
  @benchmark
  static createOptimizedGame(config: any = {}): {
    cardManager: OptimizedCardManager
    stateManager: OptimizedGameStateManager
    algorithms: OptimizedGameAlgorithms
    performanceSystem: UnifiedPerformanceSystem
  } {
    const performanceSystem = UnifiedPerformanceSystem.getInstance(config.optimization)
    
    // システムを開始
    if (!performanceSystem['isRunning']) {
      performanceSystem.start()
    }

    return {
      cardManager: this.cardManager,
      stateManager: this.stateManager,
      algorithms: this.algorithms,
      performanceSystem
    }
  }

  /**
   * 最適化されたテストゲーム作成
   */
  static createTestGame(): any {
    const game = this.createOptimizedGame({
      optimization: {
        memoryConfig: {
          gcThreshold: 50,
          monitoringInterval: 1000
        },
        poolingConfig: {
          poolSizes: {
            cards: 50,
            gameStates: 20,
            arrays: 100,
            objects: 200
          }
        }
      }
    })

    // テスト用のカードを作成
    const testCards = []
    for (let i = 0; i < 20; i++) {
      const card = game.cardManager.createCard(
        `test_${i}`,
        i % 4 === 0 ? 'attack' : i % 4 === 1 ? 'defense' : i % 4 === 2 ? 'utility' : 'special',
        10 + i * 2,
        Math.random() * 0.5
      )
      testCards.push(card)
    }

    // テスト用のゲーム状態を作成
    const gameState = game.stateManager.createGameState({
      turn: 1,
      vitality: 100,
      cards: testCards.slice(0, 5),
      challenges: [],
      insurance: null
    })

    return {
      ...game,
      testCards,
      gameState
    }
  }
}

// ===== EXPORTS =====

export {
  OptimizedCardManager,
  OptimizedGameStateManager,
  OptimizedGameAlgorithms,
  OptimizedGameFactory
}

export default {
  CardManager: OptimizedCardManager,
  StateManager: OptimizedGameStateManager,
  Algorithms: OptimizedGameAlgorithms,
  Factory: OptimizedGameFactory
}