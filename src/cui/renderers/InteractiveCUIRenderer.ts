import type { GameRenderer } from '@/interfaces/GameRenderer'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { PlayerStats, ChallengeResult } from '@/domain/types/game.types'

import { CUIConfigManager, type CUIConfig } from '../config/CUIConfig'
import { CardRenderer } from '../utils/CardRenderer'
import { ProgressDisplay } from '../utils/ProgressDisplay'
import { AnimationHelper } from '../utils/AnimationHelper'
import { InputValidator } from '../utils/InputValidator'

import chalk from 'chalk'
import boxen from 'boxen'
import figlet from 'figlet'
import inquirer from 'inquirer'

/**
 * Interactive CUI Renderer
 * Beautiful, feature-rich terminal-based game interface
 */
export class InteractiveCUIRenderer implements GameRenderer {
  private configManager: CUIConfigManager
  protected cardRenderer!: CardRenderer
  protected progressDisplay!: ProgressDisplay
  protected animationHelper!: AnimationHelper
  private isWaitingInput: boolean = false
  private isInitialized: boolean = false

  constructor(config?: Partial<CUIConfig>) {
    this.configManager = new CUIConfigManager(config)
    this.updateUtilities()
  }

  private updateUtilities(): void {
    const config = this.configManager.getConfig()
    const theme = this.configManager.getAccessibleColors()

    this.cardRenderer = new CardRenderer(config, theme)
    this.progressDisplay = new ProgressDisplay(config, theme)
    this.animationHelper = new AnimationHelper(config, theme)
  }

  // === GameRenderer Implementation ===

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    this.clear()

    // Show animated title
    await this.showGameTitle()

    // Matrix effect for matrix theme
    if (this.configManager.getConfig().theme === 'matrix') {
      await this.animationHelper.matrixRain(1500)
    }

    this.isInitialized = true
  }

  dispose(): void {
    // Clean up any resources
    this.isInitialized = false
    console.log(chalk.gray('\n👋 Thanks for playing! Goodbye!'))
  }

  displayGameState(game: Game): void {
    if (!this.isInitialized || !game) return

    const theme = this.configManager.getAccessibleColors()
    const lines: string[] = []

    // Game header
    lines.push(chalk.bold.hex(theme.primary)('🎮 人生充実ゲーム'))
    lines.push(chalk.gray('═'.repeat(50)))

    // Current status
    const stageEmoji = this.getStageEmoji(game.stage)
    const statusText = `${stageEmoji} ${game.stage} | ターン ${game.turn} | ${game.phase}`
    lines.push(chalk.cyan(statusText))

    // Game status indicator
    const statusColor = game.status === 'in_progress' ? 'green' :
      game.status === 'game_over' ? 'red' : 'yellow'
    lines.push(chalk[statusColor as keyof typeof chalk](`📊 Status: ${game.status}`))

    console.log('\n' + lines.join('\n'))

    // カード枚数情報を表示
    this.displayCardCounts(game)
  }

  displayHand(cards: Card[]): void {
    console.log('\n' + chalk.bold.blue('🃏 Your Hand:'))
    console.log(chalk.gray('─'.repeat(40)))

    if (cards.length === 0) {
      console.log(chalk.dim('  (No cards in hand)'))
      return
    }

    // Display cards in grid if compact layout is enabled, otherwise detailed view
    const config = this.configManager.getConfig()
    if (config.compactLayout && cards.length > 3) {
      const cardGrid = this.cardRenderer.renderCardGrid(cards, {
        columns: 3,
        showIndices: true
      })
      console.log(cardGrid)
    } else {
      cards.forEach((card, index) => {
        const cardDisplay = this.cardRenderer.renderCard(card, {
          style: config.cardDisplayStyle,
          showIndex: true,
          index: index + 1
        })
        console.log(cardDisplay)
        if (index < cards.length - 1) console.log() // Spacing
      })
    }
  }

  displayChallenge(challenge: Card): void {
    console.log('\n' + chalk.bold.red('⚔️ Current Challenge:'))
    console.log(chalk.gray('─'.repeat(40)))

    const challengeCard = this.cardRenderer.renderCard(challenge, {
      style: 'detailed',
      selected: true
    })
    console.log(challengeCard)
  }

  displayVitality(current: number, max: number): void {
    const vitalityBar = this.progressDisplay.renderVitalityBar(current, max, {
      width: 25,
      showNumbers: true,
      showPercentage: true,
      style: this.configManager.getConfig().theme === 'matrix' ? 'ascii' : 'blocks'
    })
    console.log('\n' + vitalityBar)
  }

  /**
   * 手札・デッキ・捨て札の枚数情報を表示
   */
  displayCardCounts(game: Game): void {
    const theme = this.configManager.getAccessibleColors()
    const lines: string[] = []

    lines.push(chalk.bold.hex(theme.primary)('📊 Card Information'))
    lines.push(chalk.gray('─'.repeat(40)))

    // 手札枚数
    const handCount = game.hand.length
    const handText = `🃏 Hand: ${handCount} card${handCount !== 1 ? 's' : ''}`
    lines.push(chalk.cyan(handText))

    // デッキ枚数
    const deckCount = game.playerDeck.getCards().length
    const deckText = `🎴 Deck: ${deckCount} card${deckCount !== 1 ? 's' : ''}`
    lines.push(chalk.blue(deckText))

    // 捨て札枚数
    const discardCount = game.discardPile.length
    const discardText = `🗑️ Discard: ${discardCount} card${discardCount !== 1 ? 's' : ''}`
    lines.push(chalk.gray(discardText))

    console.log('\n' + lines.join('\n'))
  }

  displayInsuranceCards(insurances: Card[]): void {
    console.log('\n' + chalk.bold.cyan('🛡️ Insurance Coverage:'))
    console.log(chalk.gray('─'.repeat(40)))

    if (insurances.length === 0) {
      console.log(chalk.dim('  (No insurance coverage)'))
      return
    }

    insurances.forEach((insurance, index) => {
      const insuranceCard = this.cardRenderer.renderCard(insurance, {
        style: 'compact',
        showIndex: true,
        index: index + 1
      })
      console.log(insuranceCard)
    })
  }

  displayInsuranceBurden(burden: number): void {
    if (burden > 0) {
      const burdenDisplay = this.progressDisplay.renderInsuranceBurden(burden, 20)
      console.log('\n' + burdenDisplay)
    }
  }

  displayProgress(stage: string, turn: number): void {
    // Clamp turn to a reasonable display value
    const displayTurn = Math.min(turn, 999999)
    const progressDisplay = this.progressDisplay.renderStageProgress(stage, displayTurn, {
      showStageEmoji: true,
      showTurnNumber: true
    })
    console.log('\n' + progressDisplay)
  }

  // === User Input Methods ===

  async askCardSelection(
    cards: Card[],
    minSelection: number = 1,
    maxSelection: number = 1,
    message?: string
  ): Promise<Card[]> {
    if (cards.length === 0) {
      console.log(chalk.yellow('⚠️ No cards available for selection.'))
      return []
    }

    this.isWaitingInput = true

    try {
      // Show available cards
      console.log('\n' + chalk.bold.green(message || '🃏 Select cards:'))
      console.log(chalk.gray('─'.repeat(40)))

      const cardGrid = this.cardRenderer.renderCardGrid(cards, {
        columns: Math.min(3, cards.length),
        showIndices: true
      })
      console.log(cardGrid)

      // Selection constraints info
      let constraintText = ''
      if (minSelection === 0 && maxSelection === 1) {
        constraintText = '(Optional: select 1 card or enter "0" for none)'
      } else if (minSelection === maxSelection) {
        constraintText = `(Select exactly ${minSelection} card${minSelection > 1 ? 's' : ''})`
      } else {
        constraintText = `(Select ${minSelection}-${maxSelection} cards)`
      }
      console.log(chalk.dim(constraintText))

      // Get user input
      const { selection } = await inquirer.prompt([
        {
          type: 'input',
          name: 'selection',
          message: 'Enter card numbers (comma-separated):',
          validate: (input: string) => {
            const parsed = InputValidator.parseCardSelection(input, cards, minSelection, maxSelection)
            return parsed.isValid || parsed.errorMessage
          }
        }
      ])

      const parsed = InputValidator.parseCardSelection(selection, cards, minSelection, maxSelection)

      if (parsed.selectedCards.length > 0) {
        // Show selected cards with animation
        console.log('\n' + chalk.green('✅ Selected:'))
        for (const card of parsed.selectedCards) {
          await this.animationHelper.cardRevealAnimation(
            this.cardRenderer.renderCard(card, { style: 'compact', selected: true })
          )
        }
      }

      return parsed.selectedCards

    } finally {
      this.isWaitingInput = false
    }
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    this.isWaitingInput = true

    try {
      console.log('\n' + chalk.bold.yellow('⚔️ Challenge Decision:'))

      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: `Face the challenge "${challenge.name}"?`,
          choices: [
            { name: '⚔️ Accept Challenge', value: 'start' },
            { name: '🏃 Skip Challenge', value: 'skip' }
          ]
        }
      ])

      return action

    } finally {
      this.isWaitingInput = false
    }
  }

  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    this.isWaitingInput = true

    try {
      const choices = availableTypes.map(type => ({
        name: type === 'whole_life' ? '🛡️ Whole Life Insurance (終身保険)' : '⏳ Term Insurance (定期保険)',
        value: type
      }))

      const { type } = await inquirer.prompt([
        {
          type: 'list',
          name: 'type',
          message: '🏥 Choose insurance type:',
          choices
        }
      ])

      return type

    } finally {
      this.isWaitingInput = false
    }
  }

  async askInsuranceChoice(cards: Card[], message?: string): Promise<Card> {
    const selected = await this.askCardSelection(cards, 1, 1, message || '🛡️ Choose insurance:')
    return selected[0] || cards[0]
  }

  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    this.isWaitingInput = true

    try {
      console.log('\n' + chalk.bold.cyan('🛡️ Insurance Renewal:'))

      const insuranceDisplay = this.cardRenderer.renderCard(insurance, {
        style: 'detailed',
        selected: true
      })
      console.log(insuranceDisplay)

      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: `Renew "${insurance.name}" for ${cost} vitality?`,
          choices: [
            { name: `💰 Renew (Cost: ${cost})`, value: 'renew' },
            { name: '❌ Let Expire', value: 'expire' }
          ]
        }
      ])

      return choice

    } finally {
      this.isWaitingInput = false
    }
  }

  async askDreamSelection(cards: Card[]): Promise<Card> {
    const selected = await this.askCardSelection(cards, 1, 1, '🌠 Choose your Dream:')
    return selected[0]
  }

  async askChallengeSelection(challenges: Card[]): Promise<Card> {
    const selected = await this.askCardSelection(challenges, 1, 1, '⚔️ Choose a Challenge to face:')
    return selected[0]
  }

  async askConfirmation(message: string, defaultChoice: 'yes' | 'no' = 'no'): Promise<'yes' | 'no'> {
    this.isWaitingInput = true

    try {
      const { confirmed } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmed',
          message: message,
          default: defaultChoice === 'yes'
        }
      ])

      return confirmed ? 'yes' : 'no'

    } catch (error) {
      // On error, return default choice
      return defaultChoice
    } finally {
      this.isWaitingInput = false
    }
  }

  // === Feedback & Messages ===

  showChallengeResult(result: ChallengeResult): void {
    if (!result) return

    console.log('\n' + chalk.bold.white('⚔️ Challenge Result:'))
    console.log(chalk.gray('═'.repeat(50)))

    // Result header with animation
    const resultEmoji = result.success ? '✅' : '❌'
    const resultText = result.success ?
      chalk.bold.green('SUCCESS!') :
      chalk.bold.red('FAILED!')

    console.log(`${resultEmoji} ${resultText}`)

    // Power comparison
    const powerComparison = `${result.playerPower} vs ${result.challengePower}`
    console.log(`⚖️  Power: ${powerComparison}`)

    // Vitality change
    const vitalityChange = result.vitalityChange
    const changeColor = vitalityChange > 0 ? 'green' : vitalityChange < 0 ? 'red' : 'gray'
    const changeSign = vitalityChange > 0 ? '+' : ''
    console.log(`❤️  Vitality: ${chalk[changeColor as keyof typeof chalk](`${changeSign}${vitalityChange}`)}`)

    // Message
    console.log(`💬 ${result.message}`)

    // Power breakdown if available
    if (result.powerBreakdown) {
      console.log('\n' + chalk.dim('📊 Power Breakdown:'))
      console.log(chalk.dim(`  Base: ${result.powerBreakdown.base}`))
      console.log(chalk.dim(`  Insurance: ${result.powerBreakdown.insurance}`))
      console.log(chalk.dim(`  Burden: ${result.powerBreakdown.burden}`))
      console.log(chalk.dim(`  Total: ${result.powerBreakdown.total}`))
    }

    // Celebration animation for success
    if (result.success && this.configManager.getConfig().visualEffects) {
      setTimeout(() => {
        this.animationHelper.celebrateAnimation('Challenge Completed!')
      }, 500)
    }
  }

  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    try {
      const icons = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️'
      }

      const colors = {
        info: 'blue',
        success: 'green',
        warning: 'yellow'
      }

      const icon = icons[level]
      const color = colors[level] as keyof typeof chalk

      console.log(`\n${icon} ${chalk[color](message)}`)
    } catch (e) {
      // Ignore console errors
    }
  }

  showError(error: string): void {
    console.log(`\n❌ ${chalk.red.bold('Error:')} ${chalk.red(error)}`)

    if (this.configManager.getConfig().visualEffects) {
      this.animationHelper.shakeEffect(error)
    }
  }

  showGameOver(stats: PlayerStats): void {
    if (!stats) return

    console.log('\n')

    // Animated game over
    if (this.configManager.getConfig().visualEffects) {
      this.animationHelper.pulseText(chalk.red.bold('💀 GAME OVER 💀'))
    } else {
      console.log(chalk.red.bold('💀 GAME OVER 💀'))
    }

    this.displayFinalStats(stats, 'Game Over')
  }

  showVictory(stats: PlayerStats): void {
    if (!stats) return

    console.log('\n')

    // Animated victory
    if (this.configManager.getConfig().visualEffects) {
      this.animationHelper.celebrateAnimation('🎉 VICTORY! 🎉')
    } else {
      console.log(chalk.green.bold('🎉 VICTORY! 🎉'))
    }

    this.displayFinalStats(stats, 'Victory')
  }

  showStageClear(stage: string, stats: PlayerStats): void {
    console.log('\n')

    const stageEmoji = this.getStageEmoji(stage)
    const message = `${stageEmoji} Stage "${stage}" Cleared!`

    if (this.configManager.getConfig().visualEffects) {
      this.animationHelper.pulseText(chalk.yellow.bold(message))
    } else {
      console.log(chalk.yellow.bold(message))
    }

    console.log(chalk.gray('─'.repeat(40)))

    const statsDisplay = this.progressDisplay.renderStatsDashboard(stats)
    console.log(statsDisplay)
  }

  // === System Control ===

  clear(): void {
    if (process.stdout.clearLine) {
      console.clear()
    } else {
      console.log('\n'.repeat(50))
    }
  }

  isWaitingForInput(): boolean {
    return this.isWaitingInput
  }

  setDebugMode(enabled: boolean): void {
    const config = this.configManager.getConfig()
    this.configManager.updateConfig({ showDebugInfo: enabled })

    console.log(chalk.gray(`🔧 Debug mode: ${enabled ? 'ON' : 'OFF'}`))

    if (enabled) {
      console.log(chalk.dim('Debug info will be shown during gameplay'))
    }
  }

  // === Private Helper Methods ===

  private async showGameTitle(): Promise<void> {
    try {
      const title = figlet.textSync('LIFE GAME', {
        font: 'Small',
        horizontalLayout: 'default',
        verticalLayout: 'default'
      })

      const theme = this.configManager.getAccessibleColors()
      const coloredTitle = chalk.hex(theme.accent)(title)

      if (this.configManager.shouldShowAnimations()) {
        await this.animationHelper.typewriterEffect(coloredTitle + '\n', { delay: 10 })
      } else {
        console.log(coloredTitle)
      }

      // Subtitle
      const subtitle = chalk.italic.gray('Your journey to a fulfilling life starts here...')
      console.log('\n' + subtitle + '\n')

    } catch (error) {
      // Fallback if figlet fails
      console.log(chalk.bold.blue('🎮 LIFE GAME 🎮'))
      console.log(chalk.italic.gray('Your journey to a fulfilling life starts here...'))
    }
  }

  private displayFinalStats(stats: PlayerStats, context: string): void {
    const theme = this.configManager.getAccessibleColors()

    const content = this.progressDisplay.renderStatsDashboard(stats)

    const boxOptions = {
      title: `📊 ${context} Statistics`,
      titleAlignment: 'center' as const,
      padding: 1,
      margin: 1,
      borderStyle: 'double' as const,
      borderColor: theme.primary
    }

    const boxedStats = boxen(content, boxOptions)
    console.log(boxedStats)
  }

  private getStageEmoji(stage: string): string {
    const stageEmojis: Record<string, string> = {
      youth: '🌱',
      adult: '💪',
      middle_age: '👔',
      elderly: '👴'
    }
    return stageEmojis[stage] || '📍'
  }

  // === Configuration Methods ===

  /**
   * Update CUI configuration
   */
  updateConfig(config: Partial<CUIConfig>): void {
    this.configManager.updateConfig(config)
    this.updateUtilities()
  }

  /**
   * Get current configuration
   */
  getConfig(): CUIConfig {
    return this.configManager.getConfig()
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    this.configManager.reset()
    this.updateUtilities()
  }
}