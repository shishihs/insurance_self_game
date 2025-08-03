import type { GameRenderer } from '@/interfaces/GameRenderer'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { PlayerStats, ChallengeResult, GameConfig } from '@/domain/types/game.types'
import type { GameStage } from '@/domain/types/card.types'
import { CardFactory } from '@/domain/services/CardFactory'

/**
 * Mock GameRenderer for Testing
 * Implements all 26 GameRenderer methods for isolated testing
 */
export class MockRenderer implements GameRenderer {
  public calls: { method: string; args: any[] }[] = []
  public inputValues: any[] = []
  private inputIndex: number = 0

  // Helper methods for testing
  addInputValue(value: any): void {
    this.inputValues.push(value)
  }

  getLastCall(methodName: string): { method: string; args: any[] } | undefined {
    return this.calls.filter(call => call.method === methodName).pop()
  }

  getAllCalls(methodName: string): { method: string; args: any[] }[] {
    return this.calls.filter(call => call.method === methodName)
  }

  clearCalls(): void {
    this.calls = []
  }

  private recordCall(method: string, ...args: any[]): void {
    this.calls.push({ method, args })
  }

  // === GameRenderer Implementation ===
  
  async initialize(): Promise<void> {
    this.recordCall('initialize')
  }

  displayGameState(game: Game): void {
    this.recordCall('displayGameState', game)
  }

  displayHand(cards: Card[]): void {
    this.recordCall('displayHand', cards)
  }

  displayChallenge(challenge: Card): void {
    this.recordCall('displayChallenge', challenge)
  }

  displayVitality(current: number, max: number): void {
    this.recordCall('displayVitality', current, max)
  }

  displayInsuranceCards(insurances: Card[]): void {
    this.recordCall('displayInsuranceCards', insurances)
  }

  displayInsuranceBurden(burden: number): void {
    this.recordCall('displayInsuranceBurden', burden)
  }

  displayStageProgress(stage: GameStage, current: number, total: number): void {
    this.recordCall('displayStageProgress', stage, current, total)
  }

  displayMessage(message: string, level?: 'info' | 'warning' | 'error' | 'success'): void {
    this.recordCall('displayMessage', message, level)
  }

  displayError(error: string): void {
    this.recordCall('displayError', error)
  }

  displaySuccess(message: string): void {
    this.recordCall('displaySuccess', message)
  }

  displayWarning(message: string): void {
    this.recordCall('displayWarning', message)
  }

  async requestCardSelection(cards: Card[], prompt: string): Promise<Card> {
    this.recordCall('requestCardSelection', cards, prompt)
    const index = this.inputValues[this.inputIndex++] || 0
    return cards[index] || cards[0]
  }

  async requestInsuranceSelection(insurances: Card[], prompt: string): Promise<Card[]> {
    this.recordCall('requestInsuranceSelection', insurances, prompt)
    const selections = this.inputValues[this.inputIndex++] || []
    return Array.isArray(selections) ? selections : []
  }

  async requestYesNo(question: string): Promise<boolean> {
    this.recordCall('requestYesNo', question)
    return this.inputValues[this.inputIndex++] || false
  }

  async requestInput(prompt: string): Promise<string> {
    this.recordCall('requestInput', prompt)
    return this.inputValues[this.inputIndex++] || ''
  }

  async waitForInput(message?: string): Promise<void> {
    this.recordCall('waitForInput', message)
  }

  displayChallengeResult(result: ChallengeResult): void {
    this.recordCall('displayChallengeResult', result)
  }

  displayTurnStart(turn: number): void {
    this.recordCall('displayTurnStart', turn)
  }

  displayTurnEnd(turn: number): void {
    this.recordCall('displayTurnEnd', turn)
  }

  displayGameEnd(stats: PlayerStats): void {
    this.recordCall('displayGameEnd', stats)
  }

  displayFinalResults(stats: PlayerStats): void {
    this.recordCall('displayFinalResults', stats)
  }

  clear(): void {
    this.recordCall('clear')
  }

  showHelp(): void {
    this.recordCall('showHelp')
  }

  cleanup(): Promise<void> {
    this.recordCall('cleanup')
    return Promise.resolve()
  }

  dispose(): void {
    this.recordCall('dispose')
  }

  showError(message: string): void {
    this.recordCall('showError', message)
  }

  displayDebugInfo(info: any): void {
    this.recordCall('displayDebugInfo', info)
  }

  // Missing GameRenderer interface methods
  displayProgress(stage: string, turn: number): void {
    this.recordCall('displayProgress', stage, turn)
  }

  async askCardSelection(cards: Card[], minSelection?: number, maxSelection?: number, message?: string): Promise<Card[]> {
    this.recordCall('askCardSelection', cards, minSelection, maxSelection, message)
    const selections = this.inputValues[this.inputIndex++] || []
    return Array.isArray(selections) ? selections : [cards[0]]
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    this.recordCall('askChallengeAction', challenge)
    return this.inputValues[this.inputIndex++] || 'start'
  }

  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    this.recordCall('askInsuranceTypeChoice', availableTypes)
    return this.inputValues[this.inputIndex++] || availableTypes[0]
  }

  async askInsuranceChoice(cards: Card[], message?: string): Promise<Card> {
    this.recordCall('askInsuranceChoice', cards, message)
    const index = this.inputValues[this.inputIndex++] || 0
    return cards[index] || cards[0]
  }

  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    this.recordCall('askInsuranceRenewalChoice', insurance, cost)
    return this.inputValues[this.inputIndex++] || 'renew'
  }

  async askConfirmation(message: string, defaultChoice?: 'yes' | 'no'): Promise<'yes' | 'no'> {
    this.recordCall('askConfirmation', message, defaultChoice)
    return this.inputValues[this.inputIndex++] || defaultChoice || 'no'
  }

  showChallengeResult(result: ChallengeResult): void {
    this.recordCall('showChallengeResult', result)
  }

  showMessage(message: string, level?: 'info' | 'success' | 'warning'): void {
    this.recordCall('showMessage', message, level)
  }

  showGameOver(stats: PlayerStats): void {
    this.recordCall('showGameOver', stats)
  }

  showVictory(stats: PlayerStats): void {
    this.recordCall('showVictory', stats)
  }

  showStageClear(stage: string, stats: PlayerStats): void {
    this.recordCall('showStageClear', stage, stats)
  }

  isWaitingForInput(): boolean {
    this.recordCall('isWaitingForInput')
    return false
  }

  setDebugMode(enabled: boolean): void {
    this.recordCall('setDebugMode', enabled)
  }
}

/**
 * Test Data Generation Utilities
 */
export class TestDataGenerator {
  private static seed: number = 12345

  /**
   * Set deterministic seed for reproducible test data
   */
  static setSeed(seed: number): void {
    TestDataGenerator.seed = seed
  }

  /**
   * Simple seeded random number generator for deterministic tests
   */
  static random(): number {
    const a = 1664525
    const c = 1013904223
    const m = 2 ** 32
    TestDataGenerator.seed = (a * TestDataGenerator.seed + c) % m
    return TestDataGenerator.seed / m
  }

  /**
   * Generate deterministic test game configuration
   */
  static createTestGameConfig(overrides: Partial<GameConfig> = {}): GameConfig {
    return {
      maxTurns: 10,
      initialVitality: 100,
      maxVitality: 100,
      initialInsuranceBurden: 0,
      maxInsuranceBurden: 50,
      challengeDifficulty: 'normal',
      seed: 12345,
      ...overrides
    }
  }

  /**
   * Create deterministic test cards with known properties
   */
  static createTestCards(count: number = 5): Card[] {
    const cards: Card[] = []
    
    // Create predictable test cards using Card static factory methods
    for (let i = 0; i < count; i++) {
      let card: Card
      
      if (i % 2 === 0) {
        // Create challenge cards
        card = CardFactory.createChallengeCards('youth')[0]
        // Override properties for test predictability
        Object.defineProperty(card, 'id', { value: `test-card-${i}`, configurable: true })
        Object.defineProperty(card, 'name', { value: `Test Card ${i}`, configurable: true })
        Object.defineProperty(card, 'description', { value: `Test card description ${i}`, configurable: true })
      } else {
        // Create insurance cards
        const insuranceCards = CardFactory.createBasicInsuranceCards('youth')
        card = insuranceCards[i % insuranceCards.length]
        // Override properties for test predictability
        Object.defineProperty(card, 'id', { value: `test-card-${i}`, configurable: true })
        Object.defineProperty(card, 'name', { value: `Test Card ${i}`, configurable: true })
        Object.defineProperty(card, 'description', { value: `Test card description ${i}`, configurable: true })
      }
      
      cards.push(card)
    }
    
    return cards
  }

  /**
   * Create test challenge result
   */
  static createTestChallengeResult(overrides: Partial<ChallengeResult> = {}): ChallengeResult {
    return {
      success: true,
      playerPower: 10,
      challengePower: 8,
      vitalityChange: -5,
      message: 'Test challenge result',
      rewards: [],
      ...overrides
    }
  }

  /**
   * Create test player statistics
   */
  static createTestPlayerStats(overrides: Partial<PlayerStats> = {}): PlayerStats {
    return {
      totalChallenges: 8,
      successfulChallenges: 6,
      failedChallenges: 2,
      cardsAcquired: 10,
      highestVitality: 100,
      turnsPlayed: 20,
      challengesCompleted: 6,
      challengesFailed: 2,
      finalVitality: 80,
      finalInsuranceBurden: 20,
      score: 500,
      ...overrides
    }
  }
}

/**
 * Performance Testing Utilities
 */
export class PerformanceTestHelper {
  private static measurements: Map<string, number[]> = new Map()

  /**
   * Measure execution time of a function
   */
  static async measureExecutionTime<T>(
    testName: string,
    fn: () => Promise<T> | T
  ): Promise<{ result: T; timeMs: number }> {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    const timeMs = end - start

    if (!this.measurements.has(testName)) {
      this.measurements.set(testName, [])
    }
    this.measurements.get(testName)!.push(timeMs)

    return { result, timeMs }
  }

  /**
   * Get performance statistics for a test
   */
  static getPerformanceStats(testName: string): {
    count: number
    average: number
    min: number
    max: number
    standardDeviation: number
  } | null {
    const times = this.measurements.get(testName)
    if (!times || times.length === 0) return null

    const count = times.length
    const average = times.reduce((sum, time) => sum + time, 0) / count
    const min = Math.min(...times)
    const max = Math.max(...times)
    
    const variance = times.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) / count
    const standardDeviation = Math.sqrt(variance)

    return { count, average, min, max, standardDeviation }
  }

  /**
   * Clear performance measurements
   */
  static clearMeasurements(): void {
    this.measurements.clear()
  }

  /**
   * Assert performance within acceptable bounds
   */
  static assertPerformance(
    testName: string,
    maxAverageMs: number,
    maxSingleMs: number
  ): void {
    const stats = this.getPerformanceStats(testName)
    if (!stats) {
      throw new Error(`No performance data found for test: ${testName}`)
    }

    if (stats.average > maxAverageMs) {
      throw new Error(
        `Performance test failed: Average time ${stats.average.toFixed(2)}ms exceeds limit ${maxAverageMs}ms`
      )
    }

    if (stats.max > maxSingleMs) {
      throw new Error(
        `Performance test failed: Max time ${stats.max.toFixed(2)}ms exceeds limit ${maxSingleMs}ms`
      )
    }
  }
}

/**
 * Memory Testing Utilities
 */
export class MemoryTestHelper {
  private static initialMemory: number = 0

  /**
   * Start memory monitoring
   */
  static startMemoryMonitoring(): void {
    if (global.gc) {
      global.gc()
    }
    this.initialMemory = process.memoryUsage().heapUsed
  }

  /**
   * Get current memory usage delta
   */
  static getMemoryDelta(): number {
    if (global.gc) {
      global.gc()
    }
    const currentMemory = process.memoryUsage().heapUsed
    return currentMemory - this.initialMemory
  }

  /**
   * Assert memory usage within bounds
   */
  static assertMemoryUsage(maxDeltaBytes: number): void {
    const delta = this.getMemoryDelta()
    if (delta > maxDeltaBytes) {
      throw new Error(
        `Memory test failed: Memory delta ${delta} bytes exceeds limit ${maxDeltaBytes} bytes`
      )
    }
  }

  /**
   * Format bytes for readable output
   */
  static formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let value = bytes
    let unitIndex = 0
    
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024
      unitIndex++
    }
    
    return `${value.toFixed(2)} ${units[unitIndex]}`
  }
}

/**
 * Snapshot Testing Helper
 */
export class SnapshotHelper {
  /**
   * Create a serializable snapshot of game state
   */
  static createGameStateSnapshot(game: Game): any {
    return {
      status: game.status,
      currentTurn: game.currentTurn,
      maxTurns: game.maxTurns,
      currentStage: game.currentStage,
      vitality: game.vitality,
      maxVitality: game.maxVitality,
      insuranceBurden: game.insuranceBurden,
      maxInsuranceBurden: game.maxInsuranceBurden,
      handSize: game.hand.length,
      insuranceCount: game.insuranceCards.length,
      hasCurrentChallenge: !!game.currentChallenge
    }
  }

  /**
   * Create a snapshot of renderer calls
   */
  static createRendererCallSnapshot(mockRenderer: MockRenderer): any {
    return {
      totalCalls: mockRenderer.calls.length,
      methodCounts: mockRenderer.calls.reduce((counts, call) => {
        counts[call.method] = (counts[call.method] || 0) + 1
        return counts
      }, {} as Record<string, number>),
      lastFiveCalls: mockRenderer.calls.slice(-5).map(call => ({
        method: call.method,
        argCount: call.args.length
      }))
    }
  }
}

/**
 * Statistical Test Helpers
 */
export class StatisticalTestHelper {
  /**
   * Calculate basic statistics for an array of numbers
   */
  static calculateStats(numbers: number[]): {
    mean: number
    median: number
    standardDeviation: number
    min: number
    max: number
    count: number
  } {
    if (numbers.length === 0) {
      throw new Error('Cannot calculate statistics for empty array')
    }

    const sorted = [...numbers].sort((a, b) => a - b)
    const count = numbers.length
    const mean = numbers.reduce((sum, n) => sum + n, 0) / count
    
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)]
    
    const variance = numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / count
    const standardDeviation = Math.sqrt(variance)
    
    const min = sorted[0]
    const max = sorted[count - 1]

    return { mean, median, standardDeviation, min, max, count }
  }

  /**
   * Perform a simple t-test between two samples
   */
  static tTest(sample1: number[], sample2: number[]): {
    tStatistic: number
    degreesOfFreedom: number
    significant: boolean
  } {
    const stats1 = this.calculateStats(sample1)
    const stats2 = this.calculateStats(sample2)
    
    const pooledStandardError = Math.sqrt(
      (Math.pow(stats1.standardDeviation, 2) / stats1.count) +
      (Math.pow(stats2.standardDeviation, 2) / stats2.count)
    )
    
    const tStatistic = (stats1.mean - stats2.mean) / pooledStandardError
    const degreesOfFreedom = stats1.count + stats2.count - 2
    
    // Simple significance test at p < 0.05 level
    const significant = Math.abs(tStatistic) > 1.96 // Approximate critical value
    
    return { tStatistic, degreesOfFreedom, significant }
  }
}