import type { Card } from '@/domain/entities/Card'
import type { Game } from '@/domain/entities/Game'
import type { PlayerStats, GameConfig } from '@/domain/types/game.types'
import type { GameStage } from '@/domain/types/card.types'

/**
 * AI strategy interface
 */
export interface AIStrategy {
  name: string
  description: string
  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[]
  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean
  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term'
  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean
  calculateRiskScore(gameState: GameState): number
  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void
}

/**
 * Game state representation for AI
 */
export interface GameState {
  vitality: number
  maxVitality: number
  turn: number
  stage: GameStage
  phase: string
  playerHand: Card[]
  insuranceCards: Card[]
  insuranceBurden: number
  discardPile: Card[]
  currentChallenge?: Card
  stats: PlayerStats
}

/**
 * Game result for strategy learning
 */
export interface GameResult {
  outcome: 'victory' | 'game_over'
  finalStats: PlayerStats
  strategy: string
  gameState: GameState
  decisions: Decision[]
  finalScore: number
}

/**
 * AI decision tracking
 */
export interface Decision {
  type: 'card_selection' | 'challenge_attempt' | 'insurance_choice' | 'insurance_renewal'
  context: any
  choice: any
  outcome: 'good' | 'neutral' | 'bad'
  impact: number
}

/**
 * Strategy performance metrics
 */
export interface StrategyPerformance {
  winRate: number
  averageScore: number
  averageTurns: number
  challengeSuccessRate: number
  efficiency: number
  adaptability: number
  consistency: number
}

/**
 * Machine learning parameters
 */
export interface MLParameters {
  learningRate: number
  explorationRate: number
  decayRate: number
  memorySize: number
  batchSize: number
  updateFrequency: number
}

/**
 * Genetic algorithm individual
 */
export interface GeneticIndividual {
  id: string
  genes: number[]
  fitness: number
  generation: number
  parents?: string[]
}

/**
 * Monte Carlo tree search node
 */
export interface MCTSNode {
  state: GameState
  action?: any
  parent?: MCTSNode
  children: MCTSNode[]
  visits: number
  wins: number
  untriedActions: any[]
}

/**
 * Random strategy (baseline)
 */
export class RandomStrategy implements AIStrategy {
  name = 'Random'
  description = 'Makes random decisions for baseline comparison'

  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
    if (availableCards.length === 0) return []
    
    const shuffled = [...availableCards].sort(() => Math.random() - 0.5)
    const selected: Card[] = []
    let totalPower = 0
    
    for (const card of shuffled) {
      if (totalPower >= requiredPower) break
      selected.push(card)
      totalPower += card.power || 0
    }
    
    return selected
  }

  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
    return Math.random() > 0.3 // 70% chance to attempt
  }

  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
    return availableTypes[Math.floor(Math.random() * availableTypes.length)]
  }

  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
    return Math.random() > 0.5
  }

  calculateRiskScore(gameState: GameState): number {
    return Math.random()
  }

  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
    // Random strategy doesn't adapt
  }
}

/**
 * Greedy strategy (highest power first)
 */
export class GreedyStrategy implements AIStrategy {
  name = 'Greedy'
  description = 'Always selects highest power cards and takes aggressive actions'

  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
    const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0))
    const selected: Card[] = []
    let totalPower = 0
    
    for (const card of sorted) {
      if (totalPower >= requiredPower) break
      selected.push(card)
      totalPower += card.power || 0
    }
    
    return selected
  }

  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
    const totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)
    return totalPower >= (challenge.power || 0)
  }

  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
    return 'whole_life' // Always prefer whole life for long-term benefits
  }

  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
    return gameState.vitality > cost * 2 // Only renew if we have plenty of vitality
  }

  calculateRiskScore(gameState: GameState): number {
    const vitalityRatio = gameState.vitality / gameState.maxVitality
    return 1 - vitalityRatio // Higher risk when vitality is low
  }

  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
    // Greedy strategy is fixed
  }
}

/**
 * Conservative strategy (risk-averse)
 */
export class ConservativeStrategy implements AIStrategy {
  name = 'Conservative'
  description = 'Minimizes risk and focuses on survival'

  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
    // Use minimum cards needed to meet requirement
    const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0))
    const selected: Card[] = []
    let totalPower = 0
    
    for (const card of sorted) {
      selected.push(card)
      totalPower += card.power || 0
      if (totalPower >= requiredPower) break
    }
    
    return selected
  }

  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
    const totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)
    const safety_margin = 1.5
    return totalPower >= (challenge.power || 0) * safety_margin
  }

  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
    return 'term' // Prefer lower cost option
  }

  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
    return cost <= gameState.vitality * 0.2 // Only renew if cost is less than 20% of vitality
  }

  calculateRiskScore(gameState: GameState): number {
    const vitalityRatio = gameState.vitality / gameState.maxVitality
    const turnRatio = gameState.turn / 20 // Assume 20 turns max
    return (1 - vitalityRatio) * 0.7 + turnRatio * 0.3
  }

  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
    // Conservative strategy adapts slowly
  }
}

/**
 * Balanced strategy with adaptive behavior
 */
export class BalancedStrategy implements AIStrategy {
  name = 'Balanced'
  description = 'Balances risk and reward with adaptive learning'
  
  private riskTolerance: number = 0.5
  private adaptationRate: number = 0.1
  private performance: StrategyPerformance = {
    winRate: 0,
    averageScore: 0,
    averageTurns: 0,
    challengeSuccessRate: 0,
    efficiency: 0,
    adaptability: 0,
    consistency: 0
  }

  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
    const riskScore = this.calculateRiskScore(gameState)
    const aggression = this.riskTolerance * (1 - riskScore)
    
    // Sort by power-to-cost ratio
    const sorted = [...availableCards].sort((a, b) => {
      const ratioA = (a.power || 0) / Math.max(a.cost || 1, 1)
      const ratioB = (b.power || 0) / Math.max(b.cost || 1, 1)
      return ratioB - ratioA
    })
    
    const selected: Card[] = []
    let totalPower = 0
    const targetPower = requiredPower * (1 + aggression * 0.5)
    
    for (const card of sorted) {
      if (totalPower >= targetPower) break
      selected.push(card)
      totalPower += card.power || 0
    }
    
    return selected
  }

  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
    const totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)
    const successProbability = Math.min(totalPower / Math.max(challenge.power || 1, 1), 1)
    const riskScore = this.calculateRiskScore(gameState)
    
    // Attempt if success probability exceeds risk tolerance
    return successProbability >= (1 - this.riskTolerance) + riskScore * 0.3
  }

  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
    const riskScore = this.calculateRiskScore(gameState)
    
    if (riskScore > 0.6) {
      return 'term' // High risk, prefer cheaper option
    } else {
      return availableTypes.includes('whole_life') ? 'whole_life' : 'term'
    }
  }

  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
    const affordability = cost / Math.max(gameState.vitality, 1)
    const riskScore = this.calculateRiskScore(gameState)
    
    return affordability <= 0.3 && riskScore < 0.8
  }

  calculateRiskScore(gameState: GameState): number {
    const vitalityRatio = gameState.vitality / gameState.maxVitality
    const turnProgress = gameState.turn / 20
    const insuranceBurden = gameState.insuranceBurden / Math.max(gameState.vitality, 1)
    
    return (1 - vitalityRatio) * 0.4 + turnProgress * 0.3 + insuranceBurden * 0.3
  }

  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
    this.performance = currentPerformance
    
    // Adjust risk tolerance based on performance
    if (currentPerformance.winRate < 0.4) {
      this.riskTolerance = Math.max(0.1, this.riskTolerance - this.adaptationRate)
    } else if (currentPerformance.winRate > 0.7) {
      this.riskTolerance = Math.min(0.9, this.riskTolerance + this.adaptationRate)
    }
    
    // Adjust adaptation rate based on consistency
    if (currentPerformance.consistency > 0.8) {
      this.adaptationRate = Math.max(0.05, this.adaptationRate * 0.9)
    } else {
      this.adaptationRate = Math.min(0.2, this.adaptationRate * 1.1)
    }
  }
}

/**
 * Q-Learning strategy (reinforcement learning)
 */
export class QLearningStrategy implements AIStrategy {
  name = 'Q-Learning'
  description = 'Uses reinforcement learning to optimize decisions'
  
  private qTable: Map<string, Map<string, number>> = new Map()
  private parameters: MLParameters = {
    learningRate: 0.1,
    explorationRate: 0.3,
    decayRate: 0.99,
    memorySize: 10000,
    batchSize: 32,
    updateFrequency: 100
  }
  private gameCount: number = 0
  private recentExperiences: Array<{
    state: string
    action: string
    reward: number
    nextState: string
  }> = []

  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
    const stateKey = this.encodeGameState(gameState)
    const possibleActions = this.generateCardSelectionActions(availableCards, requiredPower)
    
    const action = this.selectAction(stateKey, possibleActions)
    return this.decodeCardAction(action, availableCards)
  }

  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
    const stateKey = this.encodeGameState(gameState)
    const actions = ['attempt', 'skip']
    
    const action = this.selectAction(stateKey, actions)
    return action === 'attempt'
  }

  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
    const stateKey = this.encodeGameState(gameState)
    const actions = availableTypes
    
    const action = this.selectAction(stateKey, actions)
    return action as 'whole_life' | 'term'
  }

  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
    const stateKey = this.encodeGameState(gameState) + `_${insurance.id}_${cost}`
    const actions = ['renew', 'expire']
    
    const action = this.selectAction(stateKey, actions)
    return action === 'renew'
  }

  calculateRiskScore(gameState: GameState): number {
    // Use Q-values to estimate risk
    const stateKey = this.encodeGameState(gameState)
    const stateActions = this.qTable.get(stateKey)
    
    if (!stateActions || stateActions.size === 0) {
      return 0.5 // Neutral risk for unknown states
    }
    
    const avgQValue = Array.from(stateActions.values()).reduce((sum, val) => sum + val, 0) / stateActions.size
    return Math.max(0, Math.min(1, 0.5 - avgQValue)) // Convert Q-value to risk score
  }

  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
    // Update Q-table based on game results
    for (const result of gameResults) {
      this.updateQValuesFromGame(result)
    }
    
    // Decay exploration rate
    this.parameters.explorationRate *= this.parameters.decayRate
    this.parameters.explorationRate = Math.max(0.05, this.parameters.explorationRate)
    
    this.gameCount += gameResults.length
  }

  private selectAction(stateKey: string, possibleActions: string[]): string {
    // ε-greedy action selection
    if (Math.random() < this.parameters.explorationRate) {
      return possibleActions[Math.floor(Math.random() * possibleActions.length)]
    }
    
    const stateActions = this.qTable.get(stateKey) || new Map()
    let bestAction = possibleActions[0]
    let bestValue = stateActions.get(bestAction) || 0
    
    for (const action of possibleActions) {
      const value = stateActions.get(action) || 0
      if (value > bestValue) {
        bestValue = value
        bestAction = action
      }
    }
    
    return bestAction
  }

  private updateQValue(state: string, action: string, reward: number, nextState: string): void {
    if (!this.qTable.has(state)) {
      this.qTable.set(state, new Map())
    }
    
    const stateActions = this.qTable.get(state)!
    const currentQ = stateActions.get(action) || 0
    
    // Find max Q-value for next state
    const nextStateActions = this.qTable.get(nextState) || new Map()
    const maxNextQ = Math.max(0, ...Array.from(nextStateActions.values()))
    
    // Q-learning update
    const newQ = currentQ + this.parameters.learningRate * (reward + 0.9 * maxNextQ - currentQ)
    stateActions.set(action, newQ)
  }

  private encodeGameState(gameState: GameState): string {
    // Create a compact state representation
    return [
      Math.floor(gameState.vitality / 5),
      gameState.turn,
      gameState.stage,
      gameState.playerHand.length,
      gameState.insuranceCards.length,
      Math.floor(gameState.insuranceBurden / 5)
    ].join('_')
  }

  private generateCardSelectionActions(availableCards: Card[], requiredPower: number): string[] {
    // Generate simplified action space for card selection
    const actions = ['none', 'minimal', 'optimal', 'aggressive']
    return actions
  }

  private decodeCardAction(action: string, availableCards: Card[]): Card[] {
    switch (action) {
      case 'none':
        return []
      case 'minimal':
        return availableCards.slice(0, 1)
      case 'optimal':
        return availableCards.slice(0, Math.ceil(availableCards.length / 2))
      case 'aggressive':
        return availableCards
      default:
        return []
    }
  }

  private updateQValuesFromGame(result: GameResult): void {
    const reward = result.outcome === 'victory' ? 1 : -1
    
    // Simplified Q-value update based on final outcome
    for (const decision of result.decisions) {
      const stateKey = this.encodeGameState(result.gameState)
      const actionKey = JSON.stringify(decision.choice)
      this.updateQValue(stateKey, actionKey, reward, stateKey)
    }
  }
}

/**
 * Genetic algorithm strategy
 */
export class GeneticStrategy implements AIStrategy {
  name = 'Genetic Algorithm'
  description = 'Evolves strategy parameters using genetic algorithms'
  
  private population: GeneticIndividual[] = []
  private generation: number = 0
  private populationSize: number = 50
  private mutationRate: number = 0.1
  private crossoverRate: number = 0.8
  private currentIndividual: GeneticIndividual
  
  constructor() {
    this.initializePopulation()
    this.currentIndividual = this.population[0]
  }

  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
    const genes = this.currentIndividual.genes
    const aggression = genes[0] // 0-1 scale
    const efficiency = genes[1] // 0-1 scale
    
    const sorted = [...availableCards].sort((a, b) => {
      const scoreA = (a.power || 0) * efficiency + Math.random() * (1 - efficiency)
      const scoreB = (b.power || 0) * efficiency + Math.random() * (1 - efficiency)
      return scoreB - scoreA
    })
    
    const targetPower = requiredPower * (1 + aggression)
    const selected: Card[] = []
    let totalPower = 0
    
    for (const card of sorted) {
      if (totalPower >= targetPower) break
      selected.push(card)
      totalPower += card.power || 0
    }
    
    return selected
  }

  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
    const riskTolerance = this.currentIndividual.genes[2]
    const totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)
    const successProbability = Math.min(totalPower / Math.max(challenge.power || 1, 1), 1)
    
    return successProbability >= (1 - riskTolerance)
  }

  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
    const preference = this.currentIndividual.genes[3]
    return preference > 0.5 ? 'whole_life' : 'term'
  }

  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
    const costTolerance = this.currentIndividual.genes[4]
    const affordability = cost / Math.max(gameState.vitality, 1)
    
    return affordability <= costTolerance
  }

  calculateRiskScore(gameState: GameState): number {
    const riskWeights = this.currentIndividual.genes.slice(5, 8)
    const vitalityRisk = (1 - gameState.vitality / gameState.maxVitality) * riskWeights[0]
    const turnRisk = (gameState.turn / 20) * riskWeights[1]
    const insuranceRisk = (gameState.insuranceBurden / Math.max(gameState.vitality, 1)) * riskWeights[2]
    
    return Math.max(0, Math.min(1, vitalityRisk + turnRisk + insuranceRisk))
  }

  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
    // Update fitness of current individual
    this.currentIndividual.fitness = this.calculateFitness(currentPerformance)
    
    // Check if it's time to evolve
    if (gameResults.length >= this.populationSize) {
      this.evolvePopulation()
      this.generation++
    }
  }

  private initializePopulation(): void {
    for (let i = 0; i < this.populationSize; i++) {
      this.population.push({
        id: `gen0_${i}`,
        genes: Array.from({ length: 10 }, () => Math.random()),
        fitness: 0,
        generation: 0
      })
    }
  }

  private evolvePopulation(): void {
    // Sort by fitness
    this.population.sort((a, b) => b.fitness - a.fitness)
    
    // Select elite (top 20%)
    const eliteSize = Math.floor(this.populationSize * 0.2)
    const elite = this.population.slice(0, eliteSize)
    
    // Generate new population
    const newPopulation: GeneticIndividual[] = [...elite]
    
    while (newPopulation.length < this.populationSize) {
      const parent1 = this.tournamentSelection()
      const parent2 = this.tournamentSelection()
      
      if (Math.random() < this.crossoverRate) {
        const offspring = this.crossover(parent1, parent2)
        this.mutate(offspring)
        newPopulation.push(offspring)
      } else {
        newPopulation.push({ ...parent1, id: `gen${this.generation + 1}_${newPopulation.length}` })
      }
    }
    
    this.population = newPopulation
    this.currentIndividual = this.population[0] // Use best individual
  }

  private tournamentSelection(): GeneticIndividual {
    const tournamentSize = 3
    const tournament = []
    
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * this.population.length)
      tournament.push(this.population[randomIndex])
    }
    
    return tournament.reduce((best, individual) => 
      individual.fitness > best.fitness ? individual : best
    )
  }

  private crossover(parent1: GeneticIndividual, parent2: GeneticIndividual): GeneticIndividual {
    const crossoverPoint = Math.floor(Math.random() * parent1.genes.length)
    const childGenes = [
      ...parent1.genes.slice(0, crossoverPoint),
      ...parent2.genes.slice(crossoverPoint)
    ]
    
    return {
      id: `gen${this.generation + 1}_child`,
      genes: childGenes,
      fitness: 0,
      generation: this.generation + 1,
      parents: [parent1.id, parent2.id]
    }
  }

  private mutate(individual: GeneticIndividual): void {
    for (let i = 0; i < individual.genes.length; i++) {
      if (Math.random() < this.mutationRate) {
        individual.genes[i] = Math.random()
      }
    }
  }

  private calculateFitness(performance: StrategyPerformance): number {
    return (
      performance.winRate * 0.4 +
      performance.efficiency * 0.3 +
      performance.consistency * 0.2 +
      performance.adaptability * 0.1
    )
  }
}

/**
 * Monte Carlo Tree Search strategy
 */
export class MCTSStrategy implements AIStrategy {
  name = 'Monte Carlo Tree Search'
  description = 'Uses MCTS for optimal decision making'
  
  private root: MCTSNode | null = null
  private iterations: number = 1000
  private explorationConstant: number = Math.sqrt(2)

  selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
    const rootState = { ...gameState }
    this.root = this.createNode(rootState)
    
    // Run MCTS iterations
    for (let i = 0; i < this.iterations; i++) {
      const leaf = this.select(this.root)
      const result = this.simulate(leaf)
      this.backpropagate(leaf, result)
    }
    
    // Select best action
    const bestChild = this.getBestChild(this.root, 0)
    return bestChild?.action || []
  }

  shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
    // Simplified MCTS for binary decision
    const attempts = this.runSimulations(gameState, ['attempt', 'skip'], 100)
    return attempts['attempt'] > attempts['skip']
  }

  selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
    const results = this.runSimulations(gameState, availableTypes, 50)
    return Object.keys(results).reduce((a, b) => results[a] > results[b] ? a : b) as 'whole_life' | 'term'
  }

  shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
    const results = this.runSimulations(gameState, ['renew', 'expire'], 50)
    return results['renew'] > results['expire']
  }

  calculateRiskScore(gameState: GameState): number {
    // Use MCTS simulations to estimate risk
    const simulations = this.runSimulations(gameState, ['conservative', 'aggressive'], 20)
    const conservativeAdvantage = simulations['conservative'] - simulations['aggressive']
    return Math.max(0, Math.min(1, 0.5 + conservativeAdvantage / 100))
  }

  adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
    // Adjust MCTS parameters based on performance
    if (currentPerformance.efficiency < 0.5) {
      this.iterations = Math.min(2000, this.iterations * 1.1)
    } else if (currentPerformance.efficiency > 0.8) {
      this.iterations = Math.max(500, this.iterations * 0.9)
    }
  }

  private createNode(state: GameState, action?: any, parent?: MCTSNode): MCTSNode {
    return {
      state,
      action,
      parent,
      children: [],
      visits: 0,
      wins: 0,
      untriedActions: this.getValidActions(state)
    }
  }

  private select(node: MCTSNode): MCTSNode {
    while (node.untriedActions.length === 0 && node.children.length > 0) {
      node = this.getBestChild(node, this.explorationConstant)!
    }
    return node
  }

  private expand(node: MCTSNode): MCTSNode {
    if (node.untriedActions.length === 0) return node
    
    const action = node.untriedActions.pop()!
    const newState = this.applyAction(node.state, action)
    const child = this.createNode(newState, action, node)
    node.children.push(child)
    return child
  }

  private simulate(node: MCTSNode): number {
    // Run random simulation from this state
    let currentState = { ...node.state }
    let steps = 0
    const maxSteps = 20
    
    while (steps < maxSteps && !this.isTerminal(currentState)) {
      const actions = this.getValidActions(currentState)
      if (actions.length === 0) break
      
      const randomAction = actions[Math.floor(Math.random() * actions.length)]
      currentState = this.applyAction(currentState, randomAction)
      steps++
    }
    
    return this.evaluateState(currentState)
  }

  private backpropagate(node: MCTSNode, result: number): void {
    while (node) {
      node.visits++
      node.wins += result
      node = node.parent!
    }
  }

  private getBestChild(node: MCTSNode, explorationWeight: number): MCTSNode | null {
    if (node.children.length === 0) return null
    
    let bestChild = node.children[0]
    let bestValue = this.calculateUCB1(bestChild, node.visits, explorationWeight)
    
    for (let i = 1; i < node.children.length; i++) {
      const child = node.children[i]
      const value = this.calculateUCB1(child, node.visits, explorationWeight)
      if (value > bestValue) {
        bestValue = value
        bestChild = child
      }
    }
    
    return bestChild
  }

  private calculateUCB1(node: MCTSNode, parentVisits: number, explorationWeight: number): number {
    if (node.visits === 0) return Infinity
    
    const exploitation = node.wins / node.visits
    const exploration = explorationWeight * Math.sqrt(Math.log(parentVisits) / node.visits)
    return exploitation + exploration
  }

  private getValidActions(state: GameState): any[] {
    // Simplified action space
    return ['action1', 'action2', 'action3']
  }

  private applyAction(state: GameState, action: any): GameState {
    // Simplified state transition
    return { ...state, turn: state.turn + 1 }
  }

  private isTerminal(state: GameState): boolean {
    return state.vitality <= 0 || state.turn >= 20
  }

  private evaluateState(state: GameState): number {
    if (state.vitality <= 0) return 0
    if (state.turn >= 20) return 1
    return state.vitality / state.maxVitality
  }

  private runSimulations(state: GameState, actions: any[], iterations: number): Record<string, number> {
    const results: Record<string, number> = {}
    
    for (const action of actions) {
      results[action] = 0
      for (let i = 0; i < iterations; i++) {
        const newState = this.applyAction(state, action)
        results[action] += this.simulate(this.createNode(newState))
      }
    }
    
    return results
  }
}

/**
 * Advanced AI strategy manager
 */
export class AdvancedAIManager {
  private strategies: Map<string, AIStrategy> = new Map()
  private performanceHistory: Map<string, StrategyPerformance[]> = new Map()
  private currentStrategy: AIStrategy
  private gameResults: GameResult[] = []

  constructor() {
    this.initializeStrategies()
    this.currentStrategy = this.strategies.get('Balanced')!
  }

  /**
   * Initialize all available strategies
   */
  private initializeStrategies(): void {
    this.strategies.set('Random', new RandomStrategy())
    this.strategies.set('Greedy', new GreedyStrategy())
    this.strategies.set('Conservative', new ConservativeStrategy())
    this.strategies.set('Balanced', new BalancedStrategy())
    this.strategies.set('Q-Learning', new QLearningStrategy())
    this.strategies.set('Genetic', new GeneticStrategy())
    this.strategies.set('MCTS', new MCTSStrategy())
  }

  /**
   * Get available strategy names
   */
  getAvailableStrategies(): string[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * Set current strategy
   */
  setStrategy(strategyName: string): void {
    const strategy = this.strategies.get(strategyName)
    if (strategy) {
      this.currentStrategy = strategy
    } else {
      throw new Error(`Strategy '${strategyName}' not found`)
    }
  }

  /**
   * Get current strategy
   */
  getCurrentStrategy(): AIStrategy {
    return this.currentStrategy
  }

  /**
   * Record game result for learning
   */
  recordGameResult(result: GameResult): void {
    this.gameResults.push(result)
    
    // Update strategy performance
    if (this.gameResults.length >= 10) {
      this.updateStrategyPerformance()
    }
  }

  /**
   * Get strategy performance
   */
  getStrategyPerformance(strategyName: string): StrategyPerformance | undefined {
    const history = this.performanceHistory.get(strategyName)
    return history && history.length > 0 ? history[history.length - 1] : undefined
  }

  /**
   * Get all strategy performances
   */
  getAllPerformances(): Record<string, StrategyPerformance> {
    const performances: Record<string, StrategyPerformance> = {}
    
    for (const [name, history] of this.performanceHistory) {
      if (history.length > 0) {
        performances[name] = history[history.length - 1]
      }
    }
    
    return performances
  }

  /**
   * Automatically select best performing strategy
   */
  autoSelectBestStrategy(): string {
    const performances = this.getAllPerformances()
    let bestStrategy = 'Balanced'
    let bestScore = 0
    
    for (const [name, performance] of Object.entries(performances)) {
      const score = this.calculateOverallScore(performance)
      if (score > bestScore) {
        bestScore = score
        bestStrategy = name
      }
    }
    
    this.setStrategy(bestStrategy)
    return bestStrategy
  }

  /**
   * Run strategy tournament
   */
  async runStrategyTournament(gamesPerStrategy: number = 100): Promise<StrategyTournamentResult> {
    const results: StrategyTournamentResult = {
      strategies: [],
      winner: '',
      summary: {
        totalGames: 0,
        averageScore: 0,
        bestPerformance: 0
      }
    }
    
    for (const strategyName of this.getAvailableStrategies()) {
      console.log(`Testing strategy: ${strategyName}`)
      
      this.setStrategy(strategyName)
      const strategyResults: GameResult[] = []
      
      // Simulate games for this strategy
      for (let i = 0; i < gamesPerStrategy; i++) {
        const gameResult = await this.simulateGame()
        strategyResults.push(gameResult)
      }
      
      const performance = this.calculatePerformance(strategyResults)
      const overallScore = this.calculateOverallScore(performance)
      
      results.strategies.push({
        name: strategyName,
        performance,
        overallScore,
        gamesPlayed: gamesPerStrategy
      })
      
      results.summary.totalGames += gamesPerStrategy
    }
    
    // Find winner
    results.strategies.sort((a, b) => b.overallScore - a.overallScore)
    results.winner = results.strategies[0].name
    results.summary.averageScore = results.strategies.reduce((sum, s) => sum + s.overallScore, 0) / results.strategies.length
    results.summary.bestPerformance = results.strategies[0].overallScore
    
    return results
  }

  private updateStrategyPerformance(): void {
    const recentResults = this.gameResults.slice(-10)
    const performance = this.calculatePerformance(recentResults)
    
    const strategyName = this.currentStrategy.name
    if (!this.performanceHistory.has(strategyName)) {
      this.performanceHistory.set(strategyName, [])
    }
    
    this.performanceHistory.get(strategyName)!.push(performance)
    
    // Adapt the strategy
    this.currentStrategy.adaptStrategy(recentResults, performance)
  }

  private calculatePerformance(results: GameResult[]): StrategyPerformance {
    if (results.length === 0) {
      return {
        winRate: 0,
        averageScore: 0,
        averageTurns: 0,
        challengeSuccessRate: 0,
        efficiency: 0,
        adaptability: 0,
        consistency: 0
      }
    }
    
    const winRate = results.filter(r => r.outcome === 'victory').length / results.length
    const averageScore = results.reduce((sum, r) => sum + r.finalScore, 0) / results.length
    const averageTurns = results.reduce((sum, r) => sum + r.finalStats.turnsPlayed, 0) / results.length
    const challengeSuccessRate = this.calculateChallengeSuccessRate(results)
    const efficiency = this.calculateEfficiency(results)
    const adaptability = this.calculateAdaptability(results)
    const consistency = this.calculateConsistency(results)
    
    return {
      winRate,
      averageScore,
      averageTurns,
      challengeSuccessRate,
      efficiency,
      adaptability,
      consistency
    }
  }

  private calculateOverallScore(performance: StrategyPerformance): number {
    return (
      performance.winRate * 0.3 +
      performance.efficiency * 0.25 +
      performance.consistency * 0.2 +
      performance.challengeSuccessRate * 0.15 +
      performance.adaptability * 0.1
    )
  }

  private calculateChallengeSuccessRate(results: GameResult[]): number {
    let totalChallenges = 0
    let successfulChallenges = 0
    
    for (const result of results) {
      totalChallenges += result.finalStats.totalChallenges
      successfulChallenges += result.finalStats.successfulChallenges
    }
    
    return totalChallenges > 0 ? successfulChallenges / totalChallenges : 0
  }

  private calculateEfficiency(results: GameResult[]): number {
    // Efficiency = average score per turn
    const totalScore = results.reduce((sum, r) => sum + r.finalScore, 0)
    const totalTurns = results.reduce((sum, r) => sum + r.finalStats.turnsPlayed, 0)
    
    return totalTurns > 0 ? totalScore / totalTurns : 0
  }

  private calculateAdaptability(results: GameResult[]): number {
    // Measure improvement over time
    if (results.length < 5) return 0.5
    
    const firstHalf = results.slice(0, Math.floor(results.length / 2))
    const secondHalf = results.slice(Math.floor(results.length / 2))
    
    const firstHalfWinRate = firstHalf.filter(r => r.outcome === 'victory').length / firstHalf.length
    const secondHalfWinRate = secondHalf.filter(r => r.outcome === 'victory').length / secondHalf.length
    
    return Math.max(0, Math.min(1, 0.5 + (secondHalfWinRate - firstHalfWinRate)))
  }

  private calculateConsistency(results: GameResult[]): number {
    if (results.length < 3) return 0.5
    
    const scores = results.map(r => r.finalScore)
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    const standardDeviation = Math.sqrt(variance)
    
    // Lower standard deviation = higher consistency
    return Math.max(0, Math.min(1, 1 - (standardDeviation / mean)))
  }

  private async simulateGame(): Promise<GameResult> {
    // Simplified game simulation
    const mockResult: GameResult = {
      outcome: Math.random() > 0.5 ? 'victory' : 'game_over',
      finalStats: {
        totalChallenges: Math.floor(Math.random() * 20) + 5,
        successfulChallenges: Math.floor(Math.random() * 15) + 2,
        failedChallenges: Math.floor(Math.random() * 10),
        cardsAcquired: Math.floor(Math.random() * 10) + 2,
        highestVitality: Math.floor(Math.random() * 30) + 10,
        turnsPlayed: Math.floor(Math.random() * 15) + 5,
        gameStartTime: Date.now() - 300000,
        gameEndTime: Date.now()
      },
      strategy: this.currentStrategy.name,
      gameState: {} as GameState, // Simplified
      decisions: [],
      finalScore: Math.floor(Math.random() * 100) + 50
    }
    
    return mockResult
  }
}

/**
 * Strategy tournament result
 */
export interface StrategyTournamentResult {
  strategies: Array<{
    name: string
    performance: StrategyPerformance
    overallScore: number
    gamesPlayed: number
  }>
  winner: string
  summary: {
    totalGames: number
    averageScore: number
    bestPerformance: number
  }
}

export { AdvancedAIManager }