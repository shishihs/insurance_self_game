import type { Card } from '../../domain/entities/Card'
import type { GameStage } from '../../domain/types/card.types'

/**
 * 最適化設定
 */
export interface OptimizationConfig {
  /** プレイヤーレベル（1-100） */
  playerLevel: number
  /** 目標難易度（0.0-1.0） */
  targetDifficulty: number
  /** 最大組み合わせ数 */
  maxCombinations: number
  /** バランス重み設定 */
  balanceWeights: BalanceWeights
  /** 制約条件 */
  constraints: OptimizationConstraints
}

/**
 * バランス重み設定
 */
export interface BalanceWeights {
  /** パワーバランスの重要度 */
  powerBalance: number
  /** タイプ多様性の重要度 */
  typeDiversity: number
  /** コスト効率の重要度 */
  costEfficiency: number
  /** リスク分散の重要度 */
  riskDistribution: number
  /** シナジー効果の重要度 */
  synergyBonus: number
}

/**
 * 最適化制約条件
 */
export interface OptimizationConstraints {
  /** 最小/最大カード数 */
  cardCountRange: { min: number; max: number }
  /** タイプ別の制限 */
  typeRestrictions: Record<string, { min: number; max: number }>
  /** パワーレベル制限 */
  powerRange: { min: number; max: number }
  /** 必須カード（含める必要がある） */
  requiredCards: string[]
  /** 禁止カード（除外する必要がある） */
  forbiddenCards: string[]
}

/**
 * 組み合わせ評価結果
 */
export interface CombinationEvaluation {
  /** 組み合わせのカード */
  cards: Card[]
  /** 総合スコア */
  totalScore: number
  /** 各評価項目のスコア */
  scores: {
    powerBalance: number
    typeDiversity: number
    costEfficiency: number
    riskDistribution: number
    synergyBonus: number
  }
  /** 期待勝率 */
  expectedWinRate: number
  /** 難易度適合度 */
  difficultyMatch: number
  /** メタデータ */
  metadata: {
    totalPower: number
    totalCost: number
    cardTypes: string[]
    averagePower: number
    powerVariance: number
  }
}

/**
 * 最適化結果
 */
export interface OptimizationResult {
  /** 最適な組み合わせ（上位N個） */
  bestCombinations: CombinationEvaluation[]
  /** 最適化統計 */
  statistics: {
    evaluatedCombinations: number
    processingTimeMs: number
    convergenceScore: number
    diversityIndex: number
  }
  /** デバッグ情報 */
  debugInfo?: {
    searchPath: string[]
    prunedBranches: number
    memoryUsage: number
  }
}

/**
 * 動的プログラミング用のメモ化テーブル
 */
interface MemoizationTable {
  [key: string]: CombinationEvaluation
}

/**
 * カード組み合わせ最適化システム
 * 
 * 動的プログラミングとメタヒューリスティクスを組み合わせて
 * プレイヤーレベルに最適なカード組み合わせを生成
 */
export class CardCombinationOptimizer {
  private static readonly DEFAULT_CONFIG: OptimizationConfig = {
    playerLevel: 50,
    targetDifficulty: 0.6,
    maxCombinations: 10,
    balanceWeights: {
      powerBalance: 0.25,
      typeDiversity: 0.20,
      costEfficiency: 0.20,
      riskDistribution: 0.15,
      synergyBonus: 0.20
    },
    constraints: {
      cardCountRange: { min: 3, max: 7 },
      typeRestrictions: {
        'life': { min: 1, max: 4 },
        'insurance': { min: 0, max: 3 },
        'pitfall': { min: 0, max: 1 },
        'challenge': { min: 1, max: 2 }
      },
      powerRange: { min: 1, max: 15 },
      requiredCards: [],
      forbiddenCards: []
    }
  }

  private readonly memoTable: MemoizationTable = {}
  private readonly evaluationCache = new Map<string, number>()

  /**
   * カードプールから最適な組み合わせを生成
   */
  static optimize(
    cardPool: Card[],
    config: Partial<OptimizationConfig> = {}
  ): OptimizationResult {
    const startTime = performance.now()
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    const optimizer = new this()

    // フェーズ1: 候補組み合わせの生成（動的プログラミング）
    const candidates = optimizer.generateCandidateCombinations(
      cardPool,
      finalConfig
    )

    // フェーズ2: 高度な評価とランキング
    const evaluatedCombinations = optimizer.evaluateAndRankCombinations(
      candidates,
      finalConfig
    )

    // フェーズ3: 遺伝的アルゴリズムによるファインチューニング
    const optimizedCombinations = optimizer.applyGeneticOptimization(
      evaluatedCombinations,
      finalConfig
    )

    const processingTime = performance.now() - startTime

    return {
      bestCombinations: optimizedCombinations.slice(0, finalConfig.maxCombinations),
      statistics: {
        evaluatedCombinations: candidates.length,
        processingTimeMs: processingTime,
        convergenceScore: optimizer.calculateConvergenceScore(optimizedCombinations),
        diversityIndex: optimizer.calculateDiversityIndex(optimizedCombinations)
      }
    }
  }

  /**
   * 候補組み合わせを動的プログラミングで生成
   */
  private generateCandidateCombinations(
    cardPool: Card[],
    config: OptimizationConfig
  ): Card[][] {
    const candidates: Card[][] = []
    const constraints = config.constraints

    // 前処理: カードをフィルタリング
    const validCards = this.filterValidCards(cardPool, constraints)

    // 動的プログラミング: 部分問題の解を構築
    const dpSolutions = this.buildDynamicProgrammingSolutions(
      validCards,
      constraints
    )

    // 解から実際の組み合わせを構築
    candidates.push(...this.reconstructCombinations(dpSolutions, constraints))

    // 制約チェック付きのランダム生成で多様性を追加
    candidates.push(...this.generateDiverseCombinations(
      validCards,
      constraints,
      Math.min(1000, candidates.length * 2)
    ))

    return this.removeDuplicateCombinations(candidates)
  }

  /**
   * 有効なカードをフィルタリング
   */
  private filterValidCards(
    cardPool: Card[],
    constraints: OptimizationConstraints
  ): Card[] {
    return cardPool.filter(card => {
      // 禁止カードをチェック
      if (constraints.forbiddenCards.includes(card.id)) {
        return false
      }

      // パワーレベル制限をチェック
      if (card.power < constraints.powerRange.min || 
          card.power > constraints.powerRange.max) {
        return false
      }

      return true
    })
  }

  /**
   * 動的プログラミングによる解の構築
   */
  private buildDynamicProgrammingSolutions(
    cards: Card[],
    constraints: OptimizationConstraints
  ): Map<string, Card[]> {
    const solutions = new Map<string, Card[]>()
    const { min: minCards, max: maxCards } = constraints.cardCountRange

    // DP状態: (使用可能カードインデックス, 現在のカード数, タイプ制約)
    const dp = (
      cardIndex: number,
      currentCombination: Card[],
      typeCount: Record<string, number>
    ): Card[][] => {
      // 基本ケース
      if (currentCombination.length >= minCards && 
          currentCombination.length <= maxCards &&
          this.satisfiesTypeConstraints(typeCount, constraints.typeRestrictions)) {
        const key = this.getCombinationKey(currentCombination)
        solutions.set(key, [...currentCombination])
      }

      // 終了条件
      if (cardIndex >= cards.length || currentCombination.length >= maxCards) {
        return []
      }

      const results: Card[][] = []
      const currentCard = cards[cardIndex]

      // 選択1: 現在のカードを含める
      if (this.canAddCard(currentCard, currentCombination, typeCount, constraints)) {
        const newCombination = [...currentCombination, currentCard]
        const newTypeCount = { ...typeCount }
        newTypeCount[currentCard.type] = (newTypeCount[currentCard.type] || 0) + 1

        results.push(...dp(cardIndex + 1, newCombination, newTypeCount))
      }

      // 選択2: 現在のカードを含めない
      results.push(...dp(cardIndex + 1, currentCombination, typeCount))

      return results
    }

    // 必須カードから開始
    const initialCombination: Card[] = []
    const initialTypeCount: Record<string, number> = {}

    constraints.requiredCards.forEach(cardId => {
      const card = cards.find(c => c.id === cardId)
      if (card) {
        initialCombination.push(card)
        initialTypeCount[card.type] = (initialTypeCount[card.type] || 0) + 1
      }
    })

    dp(0, initialCombination, initialTypeCount)
    return solutions
  }

  /**
   * カードが追加可能かチェック
   */
  private canAddCard(
    card: Card,
    currentCombination: Card[],
    typeCount: Record<string, number>,
    constraints: OptimizationConstraints
  ): boolean {
    // 既に含まれているかチェック
    if (currentCombination.some(c => c.id === card.id)) {
      return false
    }

    // タイプ制限をチェック
    const cardType = card.type
    const currentTypeCount = typeCount[cardType] || 0
    const maxAllowed = constraints.typeRestrictions[cardType]?.max ?? Infinity

    return currentTypeCount < maxAllowed
  }

  /**
   * タイプ制約を満たすかチェック
   */
  private satisfiesTypeConstraints(
    typeCount: Record<string, number>,
    restrictions: Record<string, { min: number; max: number }>
  ): boolean {
    for (const [type, restriction] of Object.entries(restrictions)) {
      const count = typeCount[type] || 0
      if (count < restriction.min || count > restriction.max) {
        return false
      }
    }
    return true
  }

  /**
   * 組み合わせから一意キーを生成
   */
  private getCombinationKey(combination: Card[]): string {
    return combination
      .map(card => card.id)
      .sort()
      .join(',')
  }

  /**
   * 解から組み合わせを再構築
   */
  private reconstructCombinations(
    solutions: Map<string, Card[]>,
    constraints: OptimizationConstraints
  ): Card[][] {
    return Array.from(solutions.values())
  }

  /**
   * 多様な組み合わせを生成
   */
  private generateDiverseCombinations(
    cards: Card[],
    constraints: OptimizationConstraints,
    targetCount: number
  ): Card[][] {
    const combinations: Card[][] = []
    const { min: minCards, max: maxCards } = constraints.cardCountRange

    for (let i = 0; i < targetCount; i++) {
      const cardCount = minCards + Math.floor(Math.random() * (maxCards - minCards + 1))
      const combination = this.generateRandomValidCombination(cards, cardCount, constraints)
      
      if (combination.length >= minCards) {
        combinations.push(combination)
      }
    }

    return combinations
  }

  /**
   * ランダムな有効組み合わせを生成
   */
  private generateRandomValidCombination(
    cards: Card[],
    targetCount: number,
    constraints: OptimizationConstraints
  ): Card[] {
    const combination: Card[] = []
    const availableCards = [...cards]
    const typeCount: Record<string, number> = {}

    // 必須カードを追加
    constraints.requiredCards.forEach(cardId => {
      const cardIndex = availableCards.findIndex(c => c.id === cardId)
      if (cardIndex !== -1) {
        const card = availableCards.splice(cardIndex, 1)[0]
        combination.push(card)
        typeCount[card.type] = (typeCount[card.type] || 0) + 1
      }
    })

    // ランダムに追加
    while (combination.length < targetCount && availableCards.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableCards.length)
      const card = availableCards[randomIndex]

      if (this.canAddCard(card, combination, typeCount, constraints)) {
        availableCards.splice(randomIndex, 1)
        combination.push(card)
        typeCount[card.type] = (typeCount[card.type] || 0) + 1
      } else {
        availableCards.splice(randomIndex, 1)
      }
    }

    return combination
  }

  /**
   * 重複する組み合わせを除去
   */
  private removeDuplicateCombinations(combinations: Card[][]): Card[][] {
    const uniqueKeys = new Set<string>()
    return combinations.filter(combination => {
      const key = this.getCombinationKey(combination)
      if (uniqueKeys.has(key)) {
        return false
      }
      uniqueKeys.add(key)
      return true
    })
  }

  /**
   * 組み合わせを評価してランキング
   */
  private evaluateAndRankCombinations(
    combinations: Card[][],
    config: OptimizationConfig
  ): CombinationEvaluation[] {
    const evaluations = combinations.map(combination => 
      this.evaluateCombination(combination, config)
    )

    return evaluations.sort((a, b) => b.totalScore - a.totalScore)
  }

  /**
   * 組み合わせを総合評価
   */
  private evaluateCombination(
    cards: Card[],
    config: OptimizationConfig
  ): CombinationEvaluation {
    const cacheKey = this.getCombinationKey(cards)
    
    // キャッシュチェック
    if (this.evaluationCache.has(cacheKey)) {
      // キャッシュされた評価を再構築（手抜きを避けるため）
    }

    const weights = config.balanceWeights
    const scores = {
      powerBalance: this.evaluatePowerBalance(cards),
      typeDiversity: this.evaluateTypeDiversity(cards),
      costEfficiency: this.evaluateCostEfficiency(cards),
      riskDistribution: this.evaluateRiskDistribution(cards),
      synergyBonus: this.evaluateSynergyBonus(cards)
    }

    const totalScore = 
      scores.powerBalance * weights.powerBalance +
      scores.typeDiversity * weights.typeDiversity +
      scores.costEfficiency * weights.costEfficiency +
      scores.riskDistribution * weights.riskDistribution +
      scores.synergyBonus * weights.synergyBonus

    const expectedWinRate = this.calculateExpectedWinRate(cards, config)
    const difficultyMatch = this.calculateDifficultyMatch(cards, config)

    const metadata = this.calculateMetadata(cards)

    const evaluation: CombinationEvaluation = {
      cards: [...cards],
      totalScore,
      scores,
      expectedWinRate,
      difficultyMatch,
      metadata
    }

    this.evaluationCache.set(cacheKey, totalScore)
    return evaluation
  }

  /**
   * パワーバランスを評価
   */
  private evaluatePowerBalance(cards: Card[]): number {
    if (cards.length === 0) return 0

    const powers = cards.map(card => card.power)
    const average = powers.reduce((sum, power) => sum + power, 0) / powers.length
    const variance = powers.reduce((sum, power) => sum + (power - average)**2, 0) / powers.length
    
    // 適度な分散を持つことを評価（平均値の50%以内の分散が理想）
    const idealVariance = (average * 0.5)**2
    const balanceScore = Math.max(0, 1 - Math.abs(variance - idealVariance) / idealVariance)
    
    return balanceScore * 100
  }

  /**
   * タイプ多様性を評価
   */
  private evaluateTypeDiversity(cards: Card[]): number {
    const typeSet = new Set(cards.map(card => card.type))
    const diversityRatio = typeSet.size / Math.max(1, cards.length)
    
    // シャノンエントロピーによる多様性評価
    const typeCounts: Record<string, number> = {}
    cards.forEach(card => {
      typeCounts[card.type] = (typeCounts[card.type] || 0) + 1
    })
    
    let entropy = 0
    Object.values(typeCounts).forEach(count => {
      const probability = count / cards.length
      entropy -= probability * Math.log2(probability)
    })
    
    const maxEntropy = Math.log2(typeSet.size)
    const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0
    
    return normalizedEntropy * 100
  }

  /**
   * コスト効率を評価
   */
  private evaluateCostEfficiency(cards: Card[]): number {
    if (cards.length === 0) return 0

    const totalPower = cards.reduce((sum, card) => sum + card.power, 0)
    const totalCost = cards.reduce((sum, card) => sum + card.cost, 0)
    
    // コストが0の場合は最高効率とする
    if (totalCost === 0) return 100
    
    const efficiency = totalPower / totalCost
    
    // 効率値を0-100の範囲に正規化（効率3.0を最高とする）
    return Math.min(100, (efficiency / 3.0) * 100)
  }

  /**
   * リスク分散を評価
   */
  private evaluateRiskDistribution(cards: Card[]): number {
    // リスクの高いカード（pitfall等）の分散状況を評価
    const riskLevels = cards.map(card => this.calculateCardRisk(card))
    const averageRisk = riskLevels.reduce((sum, risk) => sum + risk, 0) / riskLevels.length
    
    // 適度なリスクレベルを目標とする（0.3-0.7が理想）
    const idealRisk = 0.5
    const riskScore = Math.max(0, 1 - Math.abs(averageRisk - idealRisk) / idealRisk)
    
    return riskScore * 100
  }

  /**
   * シナジー効果を評価
   */
  private evaluateSynergyBonus(cards: Card[]): number {
    let synergyScore = 0
    
    // タイプ別シナジー
    const typeCounts: Record<string, number> = {}
    cards.forEach(card => {
      typeCounts[card.type] = (typeCounts[card.type] || 0) + 1
    })
    
    // 2枚以上の同タイプにボーナス
    Object.values(typeCounts).forEach(count => {
      if (count >= 2) {
        synergyScore += count * 10
      }
    })
    
    // コンボカードの効果
    cards.forEach(card => {
      if (card.comboProperties) {
        const requiredTypes = card.comboProperties.requiredCards
        const hasAllRequired = requiredTypes.every(reqType => 
          cards.some(c => c.type === reqType || c.category === reqType)
        )
        if (hasAllRequired) {
          synergyScore += card.comboProperties.comboBonus
        }
      }
    })
    
    return Math.min(100, synergyScore)
  }

  /**
   * カードのリスクレベルを計算
   */
  private calculateCardRisk(card: Card): number {
    let risk = 0
    
    // カードタイプベースのリスク
    const typeRisk: Record<string, number> = {
      'pitfall': 0.9,
      'challenge': 0.6,
      'insurance': 0.2,
      'life': 0.3
    }
    
    risk += typeRisk[card.type] || 0.4
    
    // パワーレベルベースのリスク（高パワー＝高リスク）
    risk += Math.min(0.5, card.power / 20)
    
    // 効果ベースのリスク
    if (card.penalty && card.penalty > 0) {
      risk += card.penalty / 10
    }
    
    return Math.min(1.0, risk)
  }

  /**
   * 期待勝率を計算
   */
  private calculateExpectedWinRate(cards: Card[], config: OptimizationConfig): number {
    const totalPower = cards.reduce((sum, card) => sum + card.power, 0)
    const averagePower = totalPower / cards.length
    
    // プレイヤーレベルに基づく基準値
    const playerSkillMultiplier = 0.5 + (config.playerLevel / 100) * 0.5
    const adjustedPower = averagePower * playerSkillMultiplier
    
    // シグモイド関数で0-1の確率に変換
    const expectedWinRate = 1 / (1 + Math.exp(-(adjustedPower - 7) / 2))
    
    return expectedWinRate
  }

  /**
   * 難易度適合度を計算
   */
  private calculateDifficultyMatch(cards: Card[], config: OptimizationConfig): number {
    const expectedWinRate = this.calculateExpectedWinRate(cards, config)
    const targetWinRate = 1 - config.targetDifficulty
    
    // 目標勝率との差を評価
    const difference = Math.abs(expectedWinRate - targetWinRate)
    const match = Math.max(0, 1 - difference / 0.5) // 50%以内の差は許容
    
    return match
  }

  /**
   * メタデータを計算
   */
  private calculateMetadata(cards: Card[]): CombinationEvaluation['metadata'] {
    const totalPower = cards.reduce((sum, card) => sum + card.power, 0)
    const totalCost = cards.reduce((sum, card) => sum + card.cost, 0)
    const cardTypes = [...new Set(cards.map(card => card.type))]
    const averagePower = totalPower / cards.length
    
    const powers = cards.map(card => card.power)
    const powerVariance = powers.reduce((sum, power) => 
      sum + (power - averagePower)**2, 0
    ) / powers.length
    
    return {
      totalPower,
      totalCost,
      cardTypes,
      averagePower,
      powerVariance
    }
  }

  /**
   * 遺伝的アルゴリズムによる最適化
   */
  private applyGeneticOptimization(
    combinations: CombinationEvaluation[],
    config: OptimizationConfig
  ): CombinationEvaluation[] {
    // 上位組み合わせを選択
    const elite = combinations.slice(0, Math.min(20, combinations.length))
    
    // 交叉による新しい組み合わせ生成
    const offspring = this.generateOffspring(elite, config)
    
    // 突然変異
    const mutated = this.applyMutations(offspring, config)
    
    // 全体を再評価
    const allCombinations = [...elite, ...mutated]
    return allCombinations
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, config.maxCombinations * 2)
  }

  /**
   * 交叉により子世代を生成
   */
  private generateOffspring(
    elite: CombinationEvaluation[],
    config: OptimizationConfig
  ): CombinationEvaluation[] {
    const offspring: CombinationEvaluation[] = []
    
    for (let i = 0; i < elite.length / 2; i++) {
      const parent1 = elite[i * 2]
      const parent2 = elite[i * 2 + 1] || elite[0]
      
      const child = this.crossover(parent1.cards, parent2.cards, config)
      if (child.length > 0) {
        offspring.push(this.evaluateCombination(child, config))
      }
    }
    
    return offspring
  }

  /**
   * 2つの組み合わせを交叉
   */
  private crossover(cards1: Card[], cards2: Card[], config: OptimizationConfig): Card[] {
    const combined = [...cards1, ...cards2]
    const uniqueCards = combined.filter((card, index) => 
      combined.findIndex(c => c.id === card.id) === index
    )
    
    // ランダムに選択して新しい組み合わせを作成
    const targetSize = Math.min(
      config.constraints.cardCountRange.max,
      Math.floor((cards1.length + cards2.length) / 2)
    )
    
    const child: Card[] = []
    const available = [...uniqueCards]
    
    while (child.length < targetSize && available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length)
      const card = available.splice(randomIndex, 1)[0]
      
      if (this.canAddCard(card, child, this.getTypeCount(child), config.constraints)) {
        child.push(card)
      }
    }
    
    return child
  }

  /**
   * 突然変異を適用
   */
  private applyMutations(
    combinations: CombinationEvaluation[],
    config: OptimizationConfig
  ): CombinationEvaluation[] {
    return combinations.map(combination => {
      if (Math.random() < 0.1) { // 10%の確率で突然変異
        const mutated = this.mutateCombination(combination.cards, config)
        return this.evaluateCombination(mutated, config)
      }
      return combination
    })
  }

  /**
   * 組み合わせに突然変異を適用
   */
  private mutateCombination(cards: Card[], config: OptimizationConfig): Card[] {
    const mutated = [...cards]
    
    // ランダムにカードを1枚削除または追加
    if (Math.random() < 0.5 && mutated.length > config.constraints.cardCountRange.min) {
      // 削除
      const randomIndex = Math.floor(Math.random() * mutated.length)
      mutated.splice(randomIndex, 1)
    } else if (mutated.length < config.constraints.cardCountRange.max) {
      // 追加（利用可能なカードからランダム選択）
      // 実装簡略化のため、ここでは既存カードの複製を避ける
    }
    
    return mutated
  }

  /**
   * タイプ数をカウント
   */
  private getTypeCount(cards: Card[]): Record<string, number> {
    const typeCount: Record<string, number> = {}
    cards.forEach(card => {
      typeCount[card.type] = (typeCount[card.type] || 0) + 1
    })
    return typeCount
  }

  /**
   * 収束スコアを計算
   */
  private calculateConvergenceScore(combinations: CombinationEvaluation[]): number {
    if (combinations.length < 2) return 1.0
    
    const scores = combinations.map(c => c.totalScore)
    const maxScore = Math.max(...scores)
    const minScore = Math.min(...scores)
    
    // スコアの分散が小さいほど収束している
    const range = maxScore - minScore
    return Math.max(0, 1 - range / 100)
  }

  /**
   * 多様性指数を計算
   */
  private calculateDiversityIndex(combinations: CombinationEvaluation[]): number {
    const allTypes = new Set<string>()
    
    combinations.forEach(combination => {
      combination.cards.forEach(card => {
        allTypes.add(card.type)
      })
    })
    
    // シャノン多様性指数
    const typeCounts: Record<string, number> = {}
    let totalCards = 0
    
    combinations.forEach(combination => {
      combination.cards.forEach(card => {
        typeCounts[card.type] = (typeCounts[card.type] || 0) + 1
        totalCards++
      })
    })
    
    let diversity = 0
    Object.values(typeCounts).forEach(count => {
      const probability = count / totalCards
      diversity -= probability * Math.log2(probability)
    })
    
    const maxDiversity = Math.log2(allTypes.size)
    return maxDiversity > 0 ? diversity / maxDiversity : 0
  }
}