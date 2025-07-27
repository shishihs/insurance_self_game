import { InteractiveCUIRenderer } from '../renderers/InteractiveCUIRenderer'
import type { Card } from '@/domain/entities/Card'
import type { PlayerStats } from '@/domain/types/game.types'
import type { CUIConfig } from '../config/CUIConfig'
import chalk from 'chalk'
import cliProgress from 'cli-progress'

/**
 * Benchmark Mode Renderer
 * High-speed automated gameplay for performance testing and statistics
 */
export class BenchmarkModeRenderer extends InteractiveCUIRenderer {
  private benchmarkResults: BenchmarkResults[]
  private totalGames: number
  private currentGame: number = 0
  private progressBar: cliProgress.SingleBar | null = null
  private startTime: number = 0

  constructor(config?: Partial<CUIConfig>, totalGames: number = 100) {
    super({
      ...config,
      animationSpeed: 'off',
      visualEffects: false,
      autoAdvance: true,
      confirmActions: false,
      showDebugInfo: false
    })
    
    this.totalGames = totalGames
    this.benchmarkResults = []
  }

  async initialize(): Promise<void> {
    console.clear()
    console.log(chalk.bold.cyan('⚡ BENCHMARK MODE ACTIVATED'))
    console.log(chalk.gray('═'.repeat(50)))
    console.log(chalk.blue(`Running ${this.totalGames} games for statistical analysis...`))
    console.log(chalk.gray('All animations and user interactions disabled for maximum speed.\n'))

    this.startTime = Date.now()
    
    // Initialize progress bar
    this.progressBar = new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} Games | ETA: {eta}s | Speed: {speed}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true,
      stopOnComplete: true
    }, cliProgress.Presets.shades_classic)

    this.progressBar.start(this.totalGames, 0, {
      speed: "0 games/s"
    })
  }

  dispose(): void {
    if (this.progressBar) {
      this.progressBar.stop()
    }
    
    this.generateBenchmarkReport()
    console.log(chalk.gray('\n📊 Benchmark completed. Results saved.'))
  }

  // === Automated Input Methods (Ultra-fast) ===

  async askCardSelection(
    cards: Card[],
    minSelection: number = 1,
    maxSelection: number = 1,
    message?: string
  ): Promise<Card[]> {
    return this.fastCardSelection(cards, minSelection, maxSelection)
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    // Always start challenges for consistent benchmarking
    return 'start'
  }

  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    // Prefer whole life for consistency
    return availableTypes.includes('whole_life') ? 'whole_life' : availableTypes[0]
  }

  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    // Renew if cost is reasonable
    return cost <= 3 ? 'renew' : 'expire'
  }

  async askConfirmation(message: string, defaultChoice: 'yes' | 'no' = 'no'): Promise<'yes' | 'no'> {
    return defaultChoice
  }

  // === Minimal Display Methods ===

  displayGameState(game: any): void {
    // Minimal logging in benchmark mode
    this.updateProgress()
  }

  displayHand(cards: Card[]): void {
    // Silent in benchmark mode
  }

  displayChallenge(challenge: Card): void {
    // Silent in benchmark mode
  }

  displayVitality(current: number, max: number): void {
    // Silent in benchmark mode
  }

  displayInsuranceCards(insurances: Card[]): void {
    // Silent in benchmark mode
  }

  displayInsuranceBurden(burden: number): void {
    // Silent in benchmark mode
  }

  displayProgress(stage: string, turn: number): void {
    // Silent in benchmark mode
  }

  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    // Silent in benchmark mode
  }

  showError(error: string): void {
    // Only log critical errors
    console.error(`\n⚠️ Error in game ${this.currentGame}: ${error}`)
  }

  showChallengeResult(result: any): void {
    // Silent in benchmark mode
  }

  showGameOver(stats: PlayerStats): void {
    this.recordGameResult(stats, 'game_over')
  }

  showVictory(stats: PlayerStats): void {
    this.recordGameResult(stats, 'victory')
  }

  showStageClear(stage: string, stats: PlayerStats): void {
    // Silent in benchmark mode
  }

  clear(): void {
    // Don't clear screen in benchmark mode
  }

  // === Benchmark-specific Methods ===

  /**
   * Record the result of a completed game
   */
  private recordGameResult(stats: PlayerStats, outcome: 'victory' | 'game_over'): void {
    const gameEndTime = Date.now()
    const duration = gameEndTime - this.startTime

    const result: BenchmarkResults = {
      gameNumber: this.currentGame + 1,
      outcome,
      stats: { ...stats },
      duration: duration / this.totalGames, // Average per game
      timestamp: gameEndTime
    }

    this.benchmarkResults.push(result)
    this.currentGame++
  }

  /**
   * Update progress bar
   */
  private updateProgress(): void {
    if (this.progressBar) {
      const elapsed = (Date.now() - this.startTime) / 1000
      const gamesPerSecond = this.currentGame / Math.max(elapsed, 1)
      
      this.progressBar.update(this.currentGame, {
        speed: `${gamesPerSecond.toFixed(1)} games/s`
      })
    }
  }

  /**
   * Fast card selection using optimized strategy
   */
  private fastCardSelection(cards: Card[], minSelection: number, maxSelection: number): Card[] {
    if (cards.length === 0 || minSelection === 0) {
      return []
    }

    // Quick selection: take highest power cards up to max
    const sortedCards = cards
      .map((card, index) => ({ card, power: card.power || 0, index }))
      .sort((a, b) => b.power - a.power)
      .slice(0, Math.min(maxSelection, cards.length))
      .map(item => item.card)

    return sortedCards.slice(0, Math.max(minSelection, 1))
  }

  /**
   * Generate comprehensive benchmark report
   */
  private generateBenchmarkReport(): void {
    if (this.benchmarkResults.length === 0) {
      console.log(chalk.red('❌ No benchmark results to report'))
      return
    }

    const totalDuration = Date.now() - this.startTime
    const report = this.analyzeBenchmarkResults()

    console.log('\n' + chalk.bold.cyan('📊 BENCHMARK REPORT'))
    console.log(chalk.gray('═'.repeat(60)))

    // Performance metrics
    console.log(chalk.bold.white('⚡ Performance Metrics:'))
    console.log(`  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`)
    console.log(`  Games Completed: ${this.benchmarkResults.length}/${this.totalGames}`)
    console.log(`  Average Game Time: ${(totalDuration / this.benchmarkResults.length).toFixed(2)}ms`)
    console.log(`  Games per Second: ${(this.benchmarkResults.length / (totalDuration / 1000)).toFixed(2)}`)

    // Game outcome statistics
    console.log('\n' + chalk.bold.white('🎮 Game Outcomes:'))
    console.log(`  Victories: ${report.victories} (${report.victoryRate.toFixed(1)}%)`)
    console.log(`  Game Overs: ${report.gameOvers} (${report.gameOverRate.toFixed(1)}%)`)

    // Challenge statistics
    console.log('\n' + chalk.bold.white('⚔️ Challenge Statistics:'))
    console.log(`  Average Challenges: ${report.averageStats.totalChallenges.toFixed(1)}`)
    console.log(`  Average Success Rate: ${report.averageStats.successRate.toFixed(1)}%`)
    console.log(`  Total Successful: ${report.averageStats.successfulChallenges.toFixed(1)}`)
    console.log(`  Total Failed: ${report.averageStats.failedChallenges.toFixed(1)}`)

    // Resource statistics
    console.log('\n' + chalk.bold.white('💰 Resource Statistics:'))
    console.log(`  Average Cards Acquired: ${report.averageStats.cardsAcquired.toFixed(1)}`)
    console.log(`  Average Highest Vitality: ${report.averageStats.highestVitality.toFixed(1)}`)
    console.log(`  Average Turns Played: ${report.averageStats.turnsPlayed.toFixed(1)}`)

    // Best and worst games
    if (report.bestGame && report.worstGame) {
      console.log('\n' + chalk.bold.white('🏆 Best Game:'))
      console.log(`  Game #${report.bestGame.gameNumber}: ${report.bestGame.outcome}`)
      console.log(`  Success Rate: ${((report.bestGame.stats.successfulChallenges / Math.max(report.bestGame.stats.totalChallenges, 1)) * 100).toFixed(1)}%`)
      console.log(`  Cards Acquired: ${report.bestGame.stats.cardsAcquired}`)

      console.log('\n' + chalk.bold.white('📉 Most Challenging Game:'))
      console.log(`  Game #${report.worstGame.gameNumber}: ${report.worstGame.outcome}`)
      console.log(`  Success Rate: ${((report.worstGame.stats.successfulChallenges / Math.max(report.worstGame.stats.totalChallenges, 1)) * 100).toFixed(1)}%`)
      console.log(`  Turns Survived: ${report.worstGame.stats.turnsPlayed}`)
    }

    // Recommendations
    console.log('\n' + chalk.bold.white('💡 Analysis:'))
    this.generateRecommendations(report)

    console.log('\n' + chalk.gray('═'.repeat(60)))
  }

  /**
   * Analyze benchmark results and generate statistics
   */
  private analyzeBenchmarkResults(): BenchmarkAnalysis {
    const results = this.benchmarkResults
    const victories = results.filter(r => r.outcome === 'victory').length
    const gameOvers = results.filter(r => r.outcome === 'game_over').length

    // Calculate averages
    const totalStats = results.reduce((acc, result) => {
      acc.totalChallenges += result.stats.totalChallenges
      acc.successfulChallenges += result.stats.successfulChallenges
      acc.failedChallenges += result.stats.failedChallenges
      acc.cardsAcquired += result.stats.cardsAcquired
      acc.highestVitality += result.stats.highestVitality
      acc.turnsPlayed += result.stats.turnsPlayed
      return acc
    }, {
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality: 0,
      turnsPlayed: 0
    })

    const gameCount = results.length
    const averageStats = {
      totalChallenges: totalStats.totalChallenges / gameCount,
      successfulChallenges: totalStats.successfulChallenges / gameCount,
      failedChallenges: totalStats.failedChallenges / gameCount,
      cardsAcquired: totalStats.cardsAcquired / gameCount,
      highestVitality: totalStats.highestVitality / gameCount,
      turnsPlayed: totalStats.turnsPlayed / gameCount,
      successRate: (totalStats.successfulChallenges / Math.max(totalStats.totalChallenges, 1)) * 100
    }

    // Find best and worst games
    const bestGame = results.reduce((best, current) => {
      const currentScore = this.calculateGameScore(current)
      const bestScore = this.calculateGameScore(best)
      return currentScore > bestScore ? current : best
    })

    const worstGame = results.reduce((worst, current) => {
      const currentScore = this.calculateGameScore(current)
      const worstScore = this.calculateGameScore(worst)
      return currentScore < worstScore ? current : worst
    })

    return {
      victories,
      gameOvers,
      victoryRate: (victories / gameCount) * 100,
      gameOverRate: (gameOvers / gameCount) * 100,
      averageStats,
      bestGame,
      worstGame,
      totalGames: gameCount
    }
  }

  /**
   * Calculate a score for a game to determine best/worst
   */
  private calculateGameScore(result: BenchmarkResults): number {
    const baseScore = result.outcome === 'victory' ? 1000 : 0
    const challengeScore = result.stats.successfulChallenges * 10
    const cardScore = result.stats.cardsAcquired * 5
    const vitalityScore = result.stats.highestVitality
    const turnScore = result.stats.turnsPlayed

    return baseScore + challengeScore + cardScore + vitalityScore + turnScore
  }

  /**
   * Generate gameplay recommendations based on results
   */
  private generateRecommendations(report: BenchmarkAnalysis): void {
    const recommendations: string[] = []

    if (report.victoryRate < 30) {
      recommendations.push('🎯 Victory rate is low. Consider adjusting game difficulty or providing better starting cards.')
    }

    if (report.averageStats.successRate < 60) {
      recommendations.push('⚔️ Challenge success rate is low. Players may need more strategic guidance.')
    }

    if (report.averageStats.turnsPlayed < 10) {
      recommendations.push('⏱️ Games are ending quickly. Consider increasing starting vitality or reducing early game difficulty.')
    }

    if (report.averageStats.cardsAcquired < 5) {
      recommendations.push('🃏 Card acquisition is low. Consider increasing reward opportunities.')
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Game balance appears healthy. No immediate adjustments recommended.')
    }

    recommendations.forEach(rec => console.log(`  ${rec}`))
  }

  /**
   * Export results to JSON for further analysis
   */
  exportResults(): string {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalGames: this.totalGames,
      completedGames: this.benchmarkResults.length,
      results: this.benchmarkResults,
      analysis: this.analyzeBenchmarkResults()
    }

    return JSON.stringify(exportData, null, 2)
  }
}

/**
 * Benchmark results for a single game
 */
export interface BenchmarkResults {
  gameNumber: number
  outcome: 'victory' | 'game_over'
  stats: PlayerStats
  duration: number // milliseconds
  timestamp: number
}

/**
 * Benchmark analysis summary
 */
export interface BenchmarkAnalysis {
  victories: number
  gameOvers: number
  victoryRate: number
  gameOverRate: number
  averageStats: {
    totalChallenges: number
    successfulChallenges: number
    failedChallenges: number
    cardsAcquired: number
    highestVitality: number
    turnsPlayed: number
    successRate: number
  }
  bestGame: BenchmarkResults
  worstGame: BenchmarkResults
  totalGames: number
}