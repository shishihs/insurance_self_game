import { InteractiveCUIRenderer } from '../renderers/InteractiveCUIRenderer'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { PlayerStats, ChallengeResult } from '@/domain/types/game.types'
import type { CUIConfig } from '../config/CUIConfig'
import chalk from 'chalk'
import boxen from 'boxen'
import inquirer from 'inquirer'

/**
 * Debug Mode Renderer
 * Developer-focused interface with detailed game state information
 */
export class DebugModeRenderer extends InteractiveCUIRenderer {
  private debugLog: DebugLogEntry[] = []
  private debugCommands: Map<string, DebugCommand> = new Map()

  constructor(config?: Partial<CUIConfig>) {
    super({
      ...config,
      showDebugInfo: true,
      animationSpeed: 'fast', // Faster for development
      confirmActions: true
    })
    
    this.initializeDebugCommands()
  }

  async initialize(): Promise<void> {
    await super.initialize()
    
    console.log(chalk.bold.red('🐛 DEBUG MODE ACTIVATED'))
    console.log(chalk.gray('═'.repeat(50)))
    console.log(chalk.yellow('Developer interface with enhanced debugging features'))
    console.log(chalk.dim('Type "debug help" anytime for debug commands\n'))

    this.logDebug('Debug mode initialized', 'system')
  }

  // === Enhanced Display Methods with Debug Info ===

  displayGameState(game: Game): void {
    super.displayGameState(game)
    
    // Additional debug information
    console.log('\n' + chalk.bold.red('🐛 DEBUG INFO:'))
    console.log(chalk.gray('─'.repeat(30)))
    
    console.log(chalk.dim(`Game Object ID: ${this.getObjectId(game)}`))
    console.log(chalk.dim(`Memory: ${this.getMemoryUsage()}`))
    console.log(chalk.dim(`Deck Size: ${game.playerDeck?.cards?.length || 0} cards`))
    console.log(chalk.dim(`Challenge Deck: ${game.challengeDeck?.cards?.length || 0} cards`))
    console.log(chalk.dim(`Discard Pile: ${game.discardPile?.length || 0} cards`))
    console.log(chalk.dim(`Insurance Count: ${game.insuranceCards?.length || 0}`))
    
    this.logDebug(`Game state displayed: ${game.stage} T${game.turn}`, 'display')
  }

  displayHand(cards: Card[]): void {
    super.displayHand(cards)
    
    // Debug card analysis
    console.log('\n' + chalk.red('🐛 HAND ANALYSIS:'))
    console.log(chalk.dim(`Total Cards: ${cards.length}`))
    
    const totalPower = cards.reduce((sum, card) => sum + (card.power || 0), 0)
    const totalCost = cards.reduce((sum, card) => sum + (card.cost || 0), 0)
    const avgPower = cards.length > 0 ? (totalPower / cards.length).toFixed(1) : '0'
    
    console.log(chalk.dim(`Total Power: ${totalPower} | Total Cost: ${totalCost} | Avg Power: ${avgPower}`))
    
    // Card distribution
    const categories = cards.reduce((acc, card) => {
      const cat = card.category || 'unknown'
      acc[cat] = (acc[cat] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const catDisplay = Object.entries(categories)
      .map(([cat, count]) => `${cat}: ${count}`)
      .join(', ')
    console.log(chalk.dim(`Categories: ${catDisplay}`))
    
    this.logDebug(`Hand displayed: ${cards.length} cards, ${totalPower} total power`, 'display')
  }

  showChallengeResult(result: ChallengeResult): void {
    super.showChallengeResult(result)
    
    // Debug challenge analysis
    console.log('\n' + chalk.red('🐛 CHALLENGE DEBUG:'))
    console.log(chalk.dim(`Success: ${result.success}`))
    console.log(chalk.dim(`Player Power: ${result.playerPower} vs Challenge: ${result.challengePower}`))
    console.log(chalk.dim(`Vitality Change: ${result.vitalityChange}`))
    console.log(chalk.dim(`Message: "${result.message}"`))
    
    if (result.powerBreakdown) {
      console.log(chalk.dim('Power Breakdown:'))
      Object.entries(result.powerBreakdown).forEach(([key, value]) => {
        console.log(chalk.dim(`  ${key}: ${value}`))
      })
    }
    
    if (result.cardChoices) {
      console.log(chalk.dim(`Card Choices Available: ${result.cardChoices.length}`))
    }
    
    this.logDebug(`Challenge result: ${result.success ? 'SUCCESS' : 'FAIL'} (${result.playerPower} vs ${result.challengePower})`, 'challenge')
  }

  // === Enhanced Input Methods with Debug Features ===

  async askCardSelection(
    cards: Card[],
    minSelection: number = 1,
    maxSelection: number = 1,
    message?: string
  ): Promise<Card[]> {
    this.logDebug(`Card selection requested: ${cards.length} cards, min=${minSelection}, max=${maxSelection}`, 'input')
    
    // Show debug options
    console.log('\n' + chalk.red('🐛 DEBUG OPTIONS:'))
    console.log(chalk.dim('  Type "debug select <indices>" to quickly select cards'))
    console.log(chalk.dim('  Type "debug auto" for automatic selection'))
    console.log(chalk.dim('  Type "debug analyze" for detailed card analysis'))
    
    const result = await super.askCardSelection(cards, minSelection, maxSelection, message)
    
    this.logDebug(`Cards selected: ${result.map(c => c.name).join(', ')}`, 'input')
    return result
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    this.logDebug(`Challenge action requested: ${challenge.name} (power: ${challenge.power})`, 'input')
    
    console.log('\n' + chalk.red('🐛 CHALLENGE DEBUG:'))
    console.log(chalk.dim(`  Challenge ID: ${this.getObjectId(challenge)}`))
    console.log(chalk.dim(`  Challenge Power: ${challenge.power}`))
    console.log(chalk.dim(`  Challenge Type: ${challenge.type}`))
    
    const action = await super.askChallengeAction(challenge)
    
    this.logDebug(`Challenge action: ${action}`, 'input')
    return action
  }

  // === Debug Commands ===

  private initializeDebugCommands(): void {
    this.debugCommands.set('help', {
      description: 'Show debug command help',
      handler: () => this.showDebugHelp()
    })

    this.debugCommands.set('log', {
      description: 'Show debug log',
      handler: () => this.showDebugLog()
    })

    this.debugCommands.set('state', {
      description: 'Show detailed game state',
      handler: (args, game) => this.showDetailedGameState(game)
    })

    this.debugCommands.set('memory', {
      description: 'Show memory usage',
      handler: () => this.showMemoryInfo()
    })

    this.debugCommands.set('export', {
      description: 'Export debug log to JSON',
      handler: () => this.exportDebugLog()
    })

    this.debugCommands.set('clear', {
      description: 'Clear debug log',
      handler: () => this.clearDebugLog()
    })

    this.debugCommands.set('cards', {
      description: 'Analyze all cards in game',
      handler: (args, game) => this.analyzeAllCards(game)
    })

    this.debugCommands.set('simulate', {
      description: 'Simulate challenge outcomes',
      handler: (args, game) => this.simulateChallenge(args, game)
    })
  }

  private async showDebugHelp(): Promise<void> {
    const commands = Array.from(this.debugCommands.entries())
      .map(([cmd, info]) => `  debug ${cmd} - ${info.description}`)
      .join('\n')

    const helpText = `
🐛 DEBUG COMMANDS

${commands}

Usage: Type "debug <command>" during gameplay

Examples:
  debug log - Show recent debug messages
  debug state - Show detailed game state  
  debug memory - Show memory usage
  debug export - Export debug data to JSON
`

    const helpBox = boxen(helpText.trim(), {
      title: '🐛 Debug Help',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'single',
      borderColor: 'red'
    })

    console.log(helpBox)
  }

  private showDebugLog(): void {
    console.log('\n' + chalk.red('🐛 DEBUG LOG (Last 20 entries):'))
    console.log(chalk.gray('─'.repeat(50)))
    
    const recentLogs = this.debugLog.slice(-20)
    recentLogs.forEach(entry => {
      const timestamp = new Date(entry.timestamp).toLocaleTimeString()
      const typeColor = this.getLogTypeColor(entry.type)
      console.log(`${chalk.dim(timestamp)} ${chalk[typeColor](`[${entry.type.toUpperCase()}]`)} ${entry.message}`)
    })
  }

  private showDetailedGameState(game?: Game): void {
    if (!game) {
      console.log(chalk.red('❌ No game state available'))
      return
    }

    console.log('\n' + chalk.red('🐛 DETAILED GAME STATE:'))
    console.log(chalk.gray('─'.repeat(50)))
    
    console.log(chalk.yellow('Basic Info:'))
    console.log(`  Stage: ${game.stage}`)
    console.log(`  Turn: ${game.turn}`)
    console.log(`  Phase: ${game.phase}`)
    console.log(`  Status: ${game.status}`)
    console.log(`  Vitality: ${game.vitality}/${game.maxVitality}`)

    console.log(chalk.yellow('\nDeck Information:'))
    console.log(`  Player Deck: ${game.playerDeck?.cards?.length || 0} cards`)
    console.log(`  Challenge Deck: ${game.challengeDeck?.cards?.length || 0} cards`)
    console.log(`  Hand: ${game.playerHand?.length || 0} cards`)
    console.log(`  Discard: ${game.discardPile?.length || 0} cards`)

    console.log(chalk.yellow('\nInsurance:'))
    console.log(`  Active Policies: ${game.insuranceCards?.length || 0}`)
    console.log(`  Insurance Burden: ${game.insuranceBurden || 0}`)
    console.log(`  Expired Policies: ${game.expiredInsurances?.length || 0}`)

    console.log(chalk.yellow('\nStatistics:'))
    if (game.stats) {
      Object.entries(game.stats).forEach(([key, value]) => {
        console.log(`  ${key}: ${value}`)
      })
    }
  }

  private showMemoryInfo(): void {
    const memInfo = this.getMemoryUsage()
    console.log('\n' + chalk.red('🐛 MEMORY INFORMATION:'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`Memory Usage: ${memInfo}`)
    console.log(`Debug Log Entries: ${this.debugLog.length}`)
    console.log(`Debug Commands: ${this.debugCommands.size}`)
  }

  private exportDebugLog(): void {
    const exportData = {
      timestamp: new Date().toISOString(),
      totalEntries: this.debugLog.length,
      log: this.debugLog
    }

    const jsonData = JSON.stringify(exportData, null, 2)
    console.log('\n' + chalk.green('✅ Debug log exported:'))
    console.log(chalk.dim(jsonData.substring(0, 200) + '...'))
    console.log(chalk.dim(`Total size: ${jsonData.length} characters`))
  }

  private clearDebugLog(): void {
    const oldCount = this.debugLog.length
    this.debugLog = []
    console.log(chalk.green(`✅ Debug log cleared (${oldCount} entries removed)`))
  }

  private analyzeAllCards(game?: Game): void {
    if (!game) {
      console.log(chalk.red('❌ No game state available'))
      return
    }

    console.log('\n' + chalk.red('🐛 CARD ANALYSIS:'))
    console.log(chalk.gray('─'.repeat(40)))

    const allCards = [
      ...(game.playerHand || []),
      ...(game.playerDeck?.cards || []),
      ...(game.discardPile || []),
      ...(game.challengeDeck?.cards || []),
      ...(game.insuranceCards || [])
    ]

    const analysis = {
      total: allCards.length,
      byType: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      powerDistribution: { min: 0, max: 0, avg: 0 },
      costDistribution: { min: 0, max: 0, avg: 0 }
    }

    allCards.forEach(card => {
      // Type analysis
      const type = card.type || 'unknown'
      analysis.byType[type] = (analysis.byType[type] || 0) + 1

      // Category analysis
      const category = card.category || 'unknown'
      analysis.byCategory[category] = (analysis.byCategory[category] || 0) + 1
    })

    const powers = allCards.map(c => c.power || 0)
    const costs = allCards.map(c => c.cost || 0)

    if (powers.length > 0) {
      analysis.powerDistribution = {
        min: Math.min(...powers),
        max: Math.max(...powers),
        avg: powers.reduce((a, b) => a + b, 0) / powers.length
      }
    }

    if (costs.length > 0) {
      analysis.costDistribution = {
        min: Math.min(...costs),
        max: Math.max(...costs),
        avg: costs.reduce((a, b) => a + b, 0) / costs.length
      }
    }

    console.log(chalk.yellow('Summary:'))
    console.log(`  Total Cards: ${analysis.total}`)
    console.log(`  Power Range: ${analysis.powerDistribution.min}-${analysis.powerDistribution.max} (avg: ${analysis.powerDistribution.avg.toFixed(1)})`)
    console.log(`  Cost Range: ${analysis.costDistribution.min}-${analysis.costDistribution.max} (avg: ${analysis.costDistribution.avg.toFixed(1)})`)

    console.log(chalk.yellow('\nBy Type:'))
    Object.entries(analysis.byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`)
    })

    console.log(chalk.yellow('\nBy Category:'))
    Object.entries(analysis.byCategory).forEach(([category, count]) => {
      console.log(`  ${category}: ${count}`)
    })
  }

  private simulateChallenge(args: string[], game?: Game): void {
    if (!game?.currentChallenge) {
      console.log(chalk.red('❌ No active challenge to simulate'))
      return
    }

    const challenge = game.currentChallenge
    const hand = game.playerHand || []

    console.log('\n' + chalk.red('🐛 CHALLENGE SIMULATION:'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`Challenge: ${challenge.name} (Power: ${challenge.power})`)

    // Simulate different card combinations
    const combinations = this.generateCardCombinations(hand, 3)
    console.log(chalk.yellow(`\nTesting ${combinations.length} card combinations:`))

    combinations.forEach((combo, index) => {
      const totalPower = combo.reduce((sum, card) => sum + (card.power || 0), 0)
      const success = totalPower >= (challenge.power || 0)
      const successIcon = success ? '✅' : '❌'
      const comboNames = combo.map(c => c.name).join(', ')
      
      console.log(`  ${successIcon} Combo ${index + 1}: ${totalPower} power (${comboNames})`)
    })
  }

  // === Utility Methods ===

  private logDebug(message: string, type: DebugLogType): void {
    const entry: DebugLogEntry = {
      timestamp: Date.now(),
      type,
      message
    }
    
    this.debugLog.push(entry)
    
    // Keep only last 1000 entries to prevent memory bloat
    if (this.debugLog.length > 1000) {
      this.debugLog = this.debugLog.slice(-1000)
    }
  }

  private getObjectId(obj: any): string {
    // Simple object identification for debugging
    return obj?.constructor?.name + '_' + Math.random().toString(36).substr(2, 9)
  }

  private getMemoryUsage(): string {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage()
      return `${Math.round(usage.heapUsed / 1024 / 1024)}MB`
    }
    return 'N/A'
  }

  private getLogTypeColor(type: DebugLogType): keyof typeof chalk {
    const colors: Record<DebugLogType, keyof typeof chalk> = {
      system: 'blue',
      display: 'green', 
      input: 'yellow',
      challenge: 'red',
      error: 'red'
    }
    return colors[type] || 'gray'
  }

  private generateCardCombinations(cards: Card[], maxComboSize: number): Card[][] {
    const combinations: Card[][] = []
    
    // Generate all possible combinations up to maxComboSize
    for (let size = 1; size <= Math.min(maxComboSize, cards.length); size++) {
      const combos = this.getCombinations(cards, size)
      combinations.push(...combos)
    }
    
    return combinations.slice(0, 10) // Limit to first 10 for readability
  }

  private getCombinations<T>(array: T[], size: number): T[][] {
    if (size === 1) return array.map(item => [item])
    if (size === array.length) return [array]
    if (size > array.length) return []

    const result: T[][] = []
    for (let i = 0; i <= array.length - size; i++) {
      const head = array[i]
      const tailCombos = this.getCombinations(array.slice(i + 1), size - 1)
      tailCombos.forEach(combo => result.push([head, ...combo]))
    }
    
    return result
  }

  /**
   * Process debug commands during gameplay
   */
  async processDebugCommand(command: string, game?: Game): Promise<void> {
    const [cmd, ...args] = command.split(' ')
    
    const debugCommand = this.debugCommands.get(cmd)
    if (debugCommand) {
      try {
        await debugCommand.handler(args, game)
      } catch (error) {
        console.log(chalk.red(`❌ Debug command error: ${error}`))
        this.logDebug(`Debug command error: ${error}`, 'error')
      }
    } else {
      console.log(chalk.red(`❌ Unknown debug command: ${cmd}`))
      console.log(chalk.dim('Type "debug help" for available commands'))
    }
  }
}

/**
 * Debug log entry interface
 */
export interface DebugLogEntry {
  timestamp: number
  type: DebugLogType
  message: string
}

/**
 * Debug log types
 */
export type DebugLogType = 'system' | 'display' | 'input' | 'challenge' | 'error'

/**
 * Debug command interface
 */
export interface DebugCommand {
  description: string
  handler: (args: string[], game?: Game) => void | Promise<void>
}