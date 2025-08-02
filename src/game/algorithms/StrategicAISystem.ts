import type { Card } from '../../domain/entities/Card'
import type { GameStage } from '../../domain/types/card.types'

/**
 * AI設定
 */
export interface AIConfig {
  /** 思考深度（シミュレーション回数） */
  thinkingDepth: number
  /** 探索時間制限（ms） */
  timeLimit: number
  /** 難易度レベル（1-10） */
  difficultyLevel: number
  /** AI性格設定 */
  personality: AIPersonality
  /** 学習機能を有効にするか */
  enableLearning: boolean
  /** デバッグモード */
  debugMode: boolean
}

/**
 * AI性格設定
 */
export interface AIPersonality {
  /** 攻撃性（0.0-1.0） */
  aggressiveness: number
  /** 慎重さ（0.0-1.0） */
  cautiousness: number
  /** 冒険性（0.0-1.0） */
  adventurousness: number
  /** 合理性（0.0-1.0） */
  rationality: number
  /** 適応性（0.0-1.0） */
  adaptability: number
}

/**
 * ゲーム状態スナップショット
 */
export interface GameStateSnapshot {
  /** プレイヤーの手札 */
  playerHand: Card[]
  /** プレイヤーの活力 */
  playerVitality: number
  /** 現在のチャレンジ */
  currentChallenge?: Card
  /** 場のカード */
  fieldCards: Card[]
  /** ターン数 */
  turnNumber: number
  /** ゲームステージ */
  gameStage: GameStage
  /** 追加コンテキスト */
  context: Record<string, any>
}

/**
 * AI判定結果
 */
export interface AIDecision {
  /** 推奨アクション */
  recommendedAction: AIAction
  /** アクションの理由 */
  reasoning: string
  /** 信頼度（0.0-1.0） */
  confidence: number
  /** 期待値 */
  expectedValue: number
  /** 代替選択肢 */
  alternatives: AIAction[]
  /** 思考プロセス */
  thinkingProcess: ThinkingStep[]
}

/**
 * AIアクション
 */
export interface AIAction {
  /** アクションタイプ */
  type: 'play_cards' | 'buy_insurance' | 'pass' | 'use_skill' | 'combo'
  /** 関連するカード */
  cards: Card[]
  /** アクションの詳細 */
  details: Record<string, any>
  /** 期待スコア */
  expectedScore: number
}

/**
 * 思考ステップ
 */
export interface ThinkingStep {
  /** ステップの説明 */
  description: string
  /** 評価値 */
  evaluation: number
  /** 考慮要素 */
  factors: string[]
  /** 時間戳 */
  timestamp: number
}

/**
 * モンテカルロ木探索ノード
 */
class MCTSNode {
  constructor(
    public state: GameStateSnapshot,
    public action: AIAction | null = null,
    public parent: MCTSNode | null = null
  ) {}

  public children: MCTSNode[] = []
  public visits = 0
  public totalReward = 0
  public untriedActions: AIAction[] = []

  /**
   * UCB1値を計算
   */
  get ucb1Value(): number {
    if (this.visits === 0) return Infinity
    
    const exploitation = this.totalReward / this.visits
    const exploration = Math.sqrt(2 * Math.log(this.parent?.visits || 1) / this.visits)
    
    return exploitation + exploration
  }

  /**
   * 最も有望な子ノードを選択
   */
  selectBestChild(): MCTSNode {
    return this.children.reduce((best, child) => 
      child.ucb1Value > best.ucb1Value ? child : best
    )
  }

  /**
   * 未試行のアクションがあるかチェック
   */
  get hasUntriedActions(): boolean {
    return this.untriedActions.length > 0
  }

  /**
   * ランダムな未試行アクションを取得
   */
  getRandomUntriedAction(): AIAction {
    const randomIndex = Math.floor(Math.random() * this.untriedActions.length)
    return this.untriedActions.splice(randomIndex, 1)[0]
  }

  /**
   * ノードを展開
   */
  expand(action: AIAction, newState: GameStateSnapshot): MCTSNode {
    const child = new MCTSNode(newState, action, this)
    child.untriedActions = this.generatePossibleActions(newState)
    this.children.push(child)
    return child
  }

  /**
   * 可能なアクションを生成
   */
  private generatePossibleActions(state: GameStateSnapshot): AIAction[] {
    const actions: AIAction[] = []
    
    // カードプレイアクション
    state.playerHand.forEach(card => {
      actions.push({
        type: 'play_cards',
        cards: [card],
        details: { cardId: card.id },
        expectedScore: this.estimateCardValue(card, state)
      })
    })

    // 保険購入アクション
    const insuranceCards = state.playerHand.filter(card => card.isInsurance())
    insuranceCards.forEach(card => {
      if (state.playerVitality >= card.cost) {
        actions.push({
          type: 'buy_insurance',
          cards: [card],
          details: { cost: card.cost },
          expectedScore: this.estimateInsuranceValue(card, state)
        })
      }
    })

    // パスアクション
    actions.push({
      type: 'pass',
      cards: [],
      details: {},
      expectedScore: 0
    })

    // コンボアクション
    const comboActions = this.findComboActions(state)
    actions.push(...comboActions)

    return actions
  }

  /**
   * カードの推定価値を計算
   */
  private estimateCardValue(card: Card, state: GameStateSnapshot): number {
    let value = card.power

    // チャレンジとの相性を評価
    if (state.currentChallenge) {
      const synergy = this.calculateChallengeSynergy(card, state.currentChallenge)
      value += synergy
    }

    // 残り活力との関係
    const costRatio = card.cost / Math.max(1, state.playerVitality)
    value -= costRatio * 10 // コストペナルティ

    return value
  }

  /**
   * 保険の推定価値を計算
   */
  private estimateInsuranceValue(card: Card, state: GameStateSnapshot): number {
    const baseValue = card.power + (card.coverage || 0) * 0.1
    
    // ゲームステージによる調整
    const stageMultiplier = {
      youth: 0.8,
      middle: 1.0,
      fulfillment: 1.2
    }[state.gameStage] || 1.0
    
    return baseValue * stageMultiplier
  }

  /**
   * チャレンジとの相性を計算
   */
  private calculateChallengeSynergy(card: Card, challenge: Card): number {
    let synergy = 0

    // タイプ相性
    if (card.type === 'insurance' && challenge.type === 'challenge') {
      synergy += 5
    }

    // 特化型保険のボーナス
    if (card.isSpecializedInsurance()) {
      synergy += card.calculateChallengeBonus(challenge.name)
    }

    return synergy
  }

  /**
   * コンボアクションを検索
   */
  private findComboActions(state: GameStateSnapshot): AIAction[] {
    const comboActions: AIAction[] = []
    const comboCards = state.playerHand.filter(card => card.isComboCard())
    
    comboCards.forEach(comboCard => {
      if (comboCard.comboProperties) {
        const requiredCards = comboCard.comboProperties.requiredCards
        const availableCards = state.playerHand.filter(card => 
          requiredCards.includes(card.type) || requiredCards.includes(card.category || '')
        )
        
        if (availableCards.length >= requiredCards.length) {
          comboActions.push({
            type: 'combo',
            cards: [comboCard, ...availableCards.slice(0, requiredCards.length)],
            details: { comboBonus: comboCard.comboProperties.comboBonus },
            expectedScore: comboCard.power + comboCard.comboProperties.comboBonus
          })
        }
      }
    })
    
    return comboActions
  }

  /**
   * 結果をバックプロパゲート
   */
  backpropagate(reward: number): void {
    this.visits++
    this.totalReward += reward
    
    if (this.parent) {
      this.parent.backpropagate(reward)
    }
  }
}

/**
 * 戦略的AI判定システム
 * 
 * モンテカルロ木探索（MCTS）を使用して最適な戦略を決定
 */
export class StrategicAISystem {
  private static readonly DEFAULT_CONFIG: AIConfig = {
    thinkingDepth: 1000,
    timeLimit: 5000, // 5秒
    difficultyLevel: 5,
    personality: {
      aggressiveness: 0.5,
      cautiousness: 0.5,
      adventurousness: 0.4,
      rationality: 0.8,
      adaptability: 0.6
    },
    enableLearning: true,
    debugMode: false
  }

  private readonly learningData: Map<string, number> = new Map()
  private readonly performanceHistory: number[] = []

  /**
   * 最適なアクションを決定
   */
  static decideAction(
    gameState: GameStateSnapshot,
    config: Partial<AIConfig> = {}
  ): AIDecision {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config }
    const ai = new this()
    
    return ai.performMCTSSearch(gameState, finalConfig)
  }

  /**
   * モンテカルロ木探索を実行
   */
  private performMCTSSearch(
    gameState: GameStateSnapshot,
    config: AIConfig
  ): AIDecision {
    const startTime = performance.now()
    const thinkingProcess: ThinkingStep[] = []
    
    // ルートノードを作成
    const rootNode = new MCTSNode(gameState)
    rootNode.untriedActions = this.generateAllPossibleActions(gameState, config)
    
    let iterations = 0
    const maxIterations = config.thinkingDepth
    
    // MCTS主ループ
    while (iterations < maxIterations && 
           (performance.now() - startTime) < config.timeLimit) {
      
      // Phase 1: Selection（選択）
      let node = rootNode
      const path: MCTSNode[] = [rootNode]
      
      while (!node.hasUntriedActions && node.children.length > 0) {
        node = node.selectBestChild()
        path.push(node)
      }
      
      // Phase 2: Expansion（展開）
      if (node.hasUntriedActions) {
        const action = node.getRandomUntriedAction()
        const newState = this.simulateAction(node.state, action, config)
        node = node.expand(action, newState)
        path.push(node)
      }
      
      // Phase 3: Simulation（シミュレーション）
      const reward = this.runSimulation(node.state, config)
      
      // Phase 4: Backpropagation（逆伝播）
      node.backpropagate(reward)
      
      iterations++
      
      // 思考ステップを記録
      if (config.debugMode && iterations % 100 === 0) {
        thinkingProcess.push({
          description: `Iteration ${iterations}: Best action has score ${rootNode.children[0]?.totalReward / Math.max(1, rootNode.children[0]?.visits) || 0}`,
          evaluation: reward,
          factors: ['MCTS Search', 'Simulation'],
          timestamp: performance.now() - startTime
        })
      }
    }
    
    // 最適なアクションを選択
    const bestChild = rootNode.children.reduce((best, child) => 
      (child.totalReward / Math.max(1, child.visits)) > 
      (best.totalReward / Math.max(1, best.visits)) ? child : best
    )
    
    const recommendedAction = bestChild.action!
    const confidence = this.calculateConfidence(rootNode, bestChild)
    const expectedValue = bestChild.totalReward / Math.max(1, bestChild.visits)
    
    // 代替選択肢を生成
    const alternatives = rootNode.children
      .filter(child => child !== bestChild)
      .sort((a, b) => (b.totalReward / Math.max(1, b.visits)) - 
                      (a.totalReward / Math.max(1, a.visits)))
      .slice(0, 3)
      .map(child => child.action!)
    
    // 判定理由を生成
    const reasoning = this.generateReasoning(
      recommendedAction, 
      gameState, 
      config, 
      expectedValue
    )
    
    // 学習データを更新
    if (config.enableLearning) {
      this.updateLearningData(gameState, recommendedAction, expectedValue)
    }
    
    return {
      recommendedAction,
      reasoning,
      confidence,
      expectedValue,
      alternatives,
      thinkingProcess
    }
  }

  /**
   * 可能な全アクションを生成
   */
  private generateAllPossibleActions(
    state: GameStateSnapshot,
    config: AIConfig
  ): AIAction[] {
    const actions: AIAction[] = []
    
    // 基本的なカードプレイ
    state.playerHand.forEach(card => {
      if (state.playerVitality >= card.cost) {
        actions.push({
          type: 'play_cards',
          cards: [card],
          details: { single: true },
          expectedScore: this.evaluateCardPlay(card, state, config)
        })
      }
    })
    
    // 複数カードの組み合わせ
    const combinations = this.generateCardCombinations(state.playerHand, 2, 3)
    combinations.forEach(combo => {
      const totalCost = combo.reduce((sum, card) => sum + card.cost, 0)
      if (state.playerVitality >= totalCost) {
        actions.push({
          type: 'play_cards',
          cards: combo,
          details: { combination: true },
          expectedScore: this.evaluateCardCombination(combo, state, config)
        })
      }
    })
    
    // 保険特化アクション
    const insuranceActions = this.generateInsuranceActions(state, config)
    actions.push(...insuranceActions)
    
    // スキルアクション
    const skillActions = this.generateSkillActions(state, config)
    actions.push(...skillActions)
    
    // 戦略的パス（意図的な見送り）
    if (this.shouldConsiderStrategicPass(state, config)) {
      actions.push({
        type: 'pass',
        cards: [],
        details: { strategic: true },
        expectedScore: this.evaluateStrategicPass(state, config)
      })
    }
    
    return actions.sort((a, b) => b.expectedScore - a.expectedScore)
  }

  /**
   * カードの組み合わせを生成
   */
  private generateCardCombinations(
    cards: Card[], 
    minSize: number, 
    maxSize: number
  ): Card[][] {
    const combinations: Card[][] = []
    
    const generateCombos = (
      index: number, 
      current: Card[], 
      remaining: Card[]
    ): void => {
      if (current.length >= minSize && current.length <= maxSize) {
        combinations.push([...current])
      }
      
      if (current.length >= maxSize || index >= remaining.length) {
        return
      }
      
      for (let i = index; i < remaining.length; i++) {
        current.push(remaining[i])
        generateCombos(i + 1, current, remaining)
        current.pop()
      }
    }
    
    generateCombos(0, [], cards)
    return combinations
  }

  /**
   * 保険アクションを生成
   */
  private generateInsuranceActions(
    state: GameStateSnapshot,
    config: AIConfig
  ): AIAction[] {
    const actions: AIAction[] = []
    const insuranceCards = state.playerHand.filter(card => card.isInsurance())
    
    insuranceCards.forEach(card => {
      if (state.playerVitality >= card.cost) {
        // 基本的な保険購入
        actions.push({
          type: 'buy_insurance',
          cards: [card],
          details: { immediate: true },
          expectedScore: this.evaluateInsurancePurchase(card, state, config)
        })
        
        // 条件付き保険購入（リスク予測）
        const riskLevel = this.predictUpcomingRisk(state)
        if (riskLevel > 0.6) {
          actions.push({
            type: 'buy_insurance',
            cards: [card],
            details: { riskPredicted: true, riskLevel },
            expectedScore: this.evaluateInsurancePurchase(card, state, config) * 1.5
          })
        }
      }
    })
    
    return actions
  }

  /**
   * スキルアクションを生成
   */
  private generateSkillActions(
    state: GameStateSnapshot,
    config: AIConfig
  ): AIAction[] {
    const actions: AIAction[] = []
    const skillCards = state.playerHand.filter(card => card.isSkillCard())
    
    skillCards.forEach(card => {
      if (card.skillProperties && 
          (card.skillProperties.remainingCooldown || 0) === 0) {
        actions.push({
          type: 'use_skill',
          cards: [card],
          details: { 
            rarity: card.skillProperties.rarity,
            masteryLevel: card.skillProperties.masteryLevel 
          },
          expectedScore: this.evaluateSkillUsage(card, state, config)
        })
      }
    })
    
    return actions
  }

  /**
   * アクションをシミュレート
   */
  private simulateAction(
    state: GameStateSnapshot,
    action: AIAction,
    config: AIConfig
  ): GameStateSnapshot {
    const newState: GameStateSnapshot = {
      ...state,
      playerHand: [...state.playerHand],
      fieldCards: [...state.fieldCards],
      context: { ...state.context }
    }
    
    switch (action.type) {
      case 'play_cards':
        action.cards.forEach(card => {
          const index = newState.playerHand.findIndex(c => c.id === card.id)
          if (index !== -1) {
            newState.playerHand.splice(index, 1)
            newState.fieldCards.push(card)
            newState.playerVitality -= card.cost
          }
        })
        break
        
      case 'buy_insurance':
        action.cards.forEach(card => {
          newState.playerVitality -= card.cost
          newState.context.insuranceActive = (newState.context.insuranceActive || 0) + 1
        })
        break
        
      case 'use_skill':
        action.cards.forEach(card => {
          if (card.skillProperties) {
            // スキル効果の適用
            newState.playerVitality += card.power
            // クールダウンの設定
            card.skillProperties.remainingCooldown = card.skillProperties.cooldown || 0
          }
        })
        break
    }
    
    return newState
  }

  /**
   * シミュレーションを実行
   */
  private runSimulation(
    state: GameStateSnapshot,
    config: AIConfig
  ): number {
    let simulationState = { ...state }
    let totalReward = 0
    const maxSteps = 10
    
    for (let step = 0; step < maxSteps; step++) {
      // ランダムなアクションを実行
      const actions = this.generateQuickActions(simulationState)
      if (actions.length === 0) break
      
      const randomAction = actions[Math.floor(Math.random() * actions.length)]
      simulationState = this.simulateAction(simulationState, randomAction, config)
      
      // 報酬を計算
      const stepReward = this.calculateReward(simulationState, randomAction, config)
      totalReward += stepReward * 0.9**step // 割引率を適用
      
      // 終了条件
      if (simulationState.playerVitality <= 0) break
    }
    
    return totalReward
  }

  /**
   * 高速アクション生成（シミュレーション用）
   */
  private generateQuickActions(state: GameStateSnapshot): AIAction[] {
    const actions: AIAction[] = []
    
    // 最も基本的なアクションのみ
    state.playerHand.slice(0, 3).forEach(card => {
      if (state.playerVitality >= card.cost) {
        actions.push({
          type: 'play_cards',
          cards: [card],
          details: {},
          expectedScore: card.power
        })
      }
    })
    
    return actions
  }

  /**
   * 報酬を計算
   */
  private calculateReward(
    state: GameStateSnapshot,
    action: AIAction,
    config: AIConfig
  ): number {
    let reward = 0
    
    // 基本報酬
    reward += action.expectedScore
    
    // 活力維持ボーナス
    if (state.playerVitality > 5) {
      reward += 5
    }
    
    // チャレンジ成功予測
    if (state.currentChallenge) {
      const totalPower = state.fieldCards.reduce((sum, card) => sum + card.power, 0)
      if (totalPower >= state.currentChallenge.power) {
        reward += 20 // 成功ボーナス
      }
    }
    
    // AI性格による調整
    const personality = config.personality
    reward *= (1 + personality.rationality * 0.2)
    
    if (action.type === 'buy_insurance') {
      reward *= (1 + personality.cautiousness * 0.3)
    }
    
    return reward
  }

  /**
   * 信頼度を計算
   */
  private calculateConfidence(rootNode: MCTSNode, bestChild: MCTSNode): number {
    if (rootNode.children.length < 2) return 0.5
    
    const bestScore = bestChild.totalReward / Math.max(1, bestChild.visits)
    const secondBest = rootNode.children
      .filter(child => child !== bestChild)
      .reduce((best, child) => {
        const score = child.totalReward / Math.max(1, child.visits)
        return score > (best.totalReward / Math.max(1, best.visits)) ? child : best
      })
    
    const secondBestScore = secondBest.totalReward / Math.max(1, secondBest.visits)
    const gap = bestScore - secondBestScore
    
    // ギャップが大きいほど信頼度が高い
    return Math.min(1.0, Math.max(0.1, gap / 10 + 0.5))
  }

  /**
   * 判定理由を生成
   */
  private generateReasoning(
    action: AIAction,
    state: GameStateSnapshot,
    config: AIConfig,
    expectedValue: number
  ): string {
    const reasons: string[] = []
    
    switch (action.type) {
      case 'play_cards':
        if (action.cards.length === 1) {
          const card = action.cards[0]
          reasons.push(`${card.name}をプレイ（パワー: ${card.power}）`)
          
          if (state.currentChallenge && card.power >= state.currentChallenge.power) {
            reasons.push('チャレンジクリアに十分なパワー')
          }
        } else {
          reasons.push(`${action.cards.length}枚のカードを組み合わせてプレイ`)
          const totalPower = action.cards.reduce((sum, card) => sum + card.power, 0)
          reasons.push(`合計パワー: ${totalPower}`)
        }
        break
        
      case 'buy_insurance':
        const insurance = action.cards[0]
        reasons.push(`${insurance.name}を購入`)
        if (action.details.riskPredicted) {
          reasons.push(`リスクレベル${(action.details.riskLevel * 100).toFixed(0)}%を予測`)
        }
        break
        
      case 'use_skill':
        const skill = action.cards[0]
        reasons.push(`スキル「${skill.name}」を使用`)
        break
        
      case 'pass':
        if (action.details.strategic) {
          reasons.push('戦略的にターンをパス')
          reasons.push('より良い機会を待つ')
        }
        break
    }
    
    // 期待値に基づく追加理由
    if (expectedValue > 10) {
      reasons.push('高い期待値を持つアクション')
    }
    
    // 性格に基づく追加理由
    const personality = config.personality
    if (personality.aggressiveness > 0.7 && action.type === 'play_cards') {
      reasons.push('積極的な戦略に合致')
    }
    if (personality.cautiousness > 0.7 && action.type === 'buy_insurance') {
      reasons.push('慎重な戦略として保険を重視')
    }
    
    return `${reasons.join('。')  }。`
  }

  /**
   * カードプレイを評価
   */
  private evaluateCardPlay(
    card: Card,
    state: GameStateSnapshot,
    config: AIConfig
  ): number {
    let score = card.power
    
    // チャレンジとの相性
    if (state.currentChallenge) {
      const powerGap = card.power - state.currentChallenge.power
      if (powerGap >= 0) {
        score += 10 // 成功ボーナス
      } else {
        score += powerGap * 0.5 // 不足ペナルティ
      }
    }
    
    // コスト効率
    if (card.cost > 0) {
      score -= card.cost * 2
    }
    
    // AI性格による調整
    if (config.personality.aggressiveness > 0.5) {
      score *= 1.2
    }
    
    return score
  }

  /**
   * カード組み合わせを評価
   */
  private evaluateCardCombination(
    cards: Card[],
    state: GameStateSnapshot,
    config: AIConfig
  ): number {
    const totalPower = cards.reduce((sum, card) => sum + card.power, 0)
    const totalCost = cards.reduce((sum, card) => sum + card.cost, 0)
    
    let score = totalPower - totalCost * 1.5
    
    // シナジーボーナス
    const synergyBonus = this.calculateSynergyBonus(cards)
    score += synergyBonus
    
    return score
  }

  /**
   * シナジーボーナスを計算
   */
  private calculateSynergyBonus(cards: Card[]): number {
    let bonus = 0
    
    // 同タイプボーナス
    const typeCounts: Record<string, number> = {}
    cards.forEach(card => {
      typeCounts[card.type] = (typeCounts[card.type] || 0) + 1
    })
    
    Object.values(typeCounts).forEach(count => {
      if (count >= 2) {
        bonus += count * 2
      }
    })
    
    // コンボボーナス
    cards.forEach(card => {
      if (card.comboProperties) {
        const hasRequiredCards = card.comboProperties.requiredCards.every(reqType =>
          cards.some(c => c.type === reqType || c.category === reqType)
        )
        if (hasRequiredCards) {
          bonus += card.comboProperties.comboBonus
        }
      }
    })
    
    return bonus
  }

  /**
   * 保険購入を評価
   */
  private evaluateInsurancePurchase(
    card: Card,
    state: GameStateSnapshot,
    config: AIConfig
  ): number {
    let score = card.power - card.cost
    
    // 保険効果による調整
    if (card.isDefensiveInsurance()) {
      score += card.calculateDamageReduction() * 2
    }
    if (card.isRecoveryInsurance()) {
      score += card.calculateTurnHeal() * 3
    }
    
    // AI性格による調整
    score *= (1 + config.personality.cautiousness)
    
    return score
  }

  /**
   * スキル使用を評価
   */
  private evaluateSkillUsage(
    card: Card,
    state: GameStateSnapshot,
    config: AIConfig
  ): number {
    let score = card.power
    
    // レアリティボーナス
    if (card.skillProperties) {
      const rarityBonus = {
        common: 0,
        rare: 5,
        epic: 10,
        legendary: 20
      }[card.skillProperties.rarity] || 0
      
      score += rarityBonus
    }
    
    return score
  }

  /**
   * 戦略的パスを検討すべきかチェック
   */
  private shouldConsiderStrategicPass(
    state: GameStateSnapshot,
    config: AIConfig
  ): boolean {
    // 活力が少ない場合
    if (state.playerVitality < 3) return true
    
    // 良いカードが手札にない場合
    const averagePower = state.playerHand.reduce((sum, card) => sum + card.power, 0) / 
                        Math.max(1, state.playerHand.length)
    if (averagePower < 3) return true
    
    // 慎重な性格の場合
    if (config.personality.cautiousness > 0.8) return true
    
    return false
  }

  /**
   * 戦略的パスを評価
   */
  private evaluateStrategicPass(
    state: GameStateSnapshot,
    config: AIConfig
  ): number {
    let score = 0
    
    // 活力保持ボーナス
    score += state.playerVitality * 0.5
    
    // 慎重性格ボーナス
    score += config.personality.cautiousness * 5
    
    return score
  }

  /**
   * 今後のリスクを予測
   */
  private predictUpcomingRisk(state: GameStateSnapshot): number {
    let riskLevel = 0
    
    // ターン数に基づくリスク
    riskLevel += Math.min(0.5, state.turnNumber / 20)
    
    // 活力レベルに基づくリスク
    if (state.playerVitality < 5) {
      riskLevel += 0.3
    }
    
    // ゲームステージに基づくリスク
    const stageRisk = {
      youth: 0.2,
      middle: 0.5,
      fulfillment: 0.8
    }[state.gameStage] || 0.3
    
    riskLevel += stageRisk
    
    return Math.min(1.0, riskLevel)
  }

  /**
   * 学習データを更新
   */
  private updateLearningData(
    state: GameStateSnapshot,
    action: AIAction,
    expectedValue: number
  ): void {
    const stateKey = this.generateStateKey(state)
    const actionKey = `${action.type}-${action.cards.map(c => c.type).join(',')}`
    const key = `${stateKey}-${actionKey}`
    
    // 現在の学習値を更新
    const currentValue = this.learningData.get(key) || 0
    const learningRate = 0.1
    const newValue = currentValue + learningRate * (expectedValue - currentValue)
    
    this.learningData.set(key, newValue)
    
    // パフォーマンス履歴を更新
    this.performanceHistory.push(expectedValue)
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift()
    }
  }

  /**
   * 状態キーを生成
   */
  private generateStateKey(state: GameStateSnapshot): string {
    const handTypes = state.playerHand.map(card => card.type).sort().join(',')
    const vitalityBucket = Math.floor(state.playerVitality / 5) * 5
    const challengePower = state.currentChallenge?.power || 0
    
    return `${handTypes}-${vitalityBucket}-${challengePower}-${state.gameStage}`
  }
}