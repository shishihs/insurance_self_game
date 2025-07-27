import { InteractiveCUIRenderer } from '../renderers/InteractiveCUIRenderer'
import type { Card } from '@/domain/entities/Card'
import type { CUIConfig } from '../config/CUIConfig'
import chalk from 'chalk'

/**
 * Demo Mode Renderer
 * Automated gameplay demonstration with configurable speed
 */
export class DemoModeRenderer extends InteractiveCUIRenderer {
  private demoSpeed: 'slow' | 'normal' | 'fast' | 'turbo'
  private demoStrategy: DemoStrategy

  constructor(config?: Partial<CUIConfig>, speed: 'slow' | 'normal' | 'fast' | 'turbo' = 'normal') {
    super({
      ...config,
      autoAdvance: true,
      confirmActions: false,
      animationSpeed: speed === 'turbo' ? 'fast' : speed
    })
    
    this.demoSpeed = speed
    this.demoStrategy = new SmartDemoStrategy()
  }

  async initialize(): Promise<void> {
    await super.initialize()
    
    console.log(chalk.bold.magenta('🎭 DEMO MODE ACTIVATED'))
    console.log(chalk.gray(`Speed: ${this.demoSpeed.toUpperCase()}`))
    console.log(chalk.gray('Watch as the AI plays the game automatically...\n'))
    
    await this.delay(this.getDemoDelay() * 3)
  }

  // === Automated Input Methods ===

  async askCardSelection(
    cards: Card[],
    minSelection: number = 1,
    maxSelection: number = 1,
    message?: string
  ): Promise<Card[]> {
    // Show the selection process
    console.log('\n' + chalk.bold.blue('🤖 AI is thinking...'))
    console.log(chalk.gray(message || 'Selecting cards...'))
    
    // Display available cards
    await super.displayHand(cards)
    
    await this.delay(this.getDemoDelay())
    
    // Use strategy to select cards
    const selectedCards = this.demoStrategy.selectCards(cards, minSelection, maxSelection)
    
    // Show selection process
    if (selectedCards.length > 0) {
      console.log(chalk.green(`✅ AI selected ${selectedCards.length} card(s):`))
      selectedCards.forEach((card, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${card.name}`))
      })
    } else {
      console.log(chalk.yellow('🤖 AI chose not to select any cards'))
    }

    await this.delay(this.getDemoDelay())
    return selectedCards
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    console.log('\n' + chalk.bold.yellow('🤖 AI is evaluating challenge...'))
    
    await this.delay(this.getDemoDelay())
    
    const action = this.demoStrategy.decideChallengeAction(challenge)
    
    const actionText = action === 'start' ? 
      chalk.green('⚔️ AI decides to ACCEPT the challenge!') :
      chalk.yellow('🏃 AI decides to SKIP the challenge')
    
    console.log(actionText)
    await this.delay(this.getDemoDelay())
    
    return action
  }

  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    console.log('\n' + chalk.bold.cyan('🤖 AI is choosing insurance type...'))
    
    await this.delay(this.getDemoDelay())
    
    const choice = this.demoStrategy.chooseInsuranceType(availableTypes)
    const typeName = choice === 'whole_life' ? 'Whole Life Insurance' : 'Term Insurance'
    
    console.log(chalk.cyan(`🛡️ AI selected: ${typeName}`))
    await this.delay(this.getDemoDelay())
    
    return choice
  }

  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    console.log('\n' + chalk.bold.cyan('🤖 AI is deciding on insurance renewal...'))
    console.log(chalk.gray(`Insurance: ${insurance.name}, Cost: ${cost}`))
    
    await this.delay(this.getDemoDelay())
    
    const decision = this.demoStrategy.decideInsuranceRenewal(insurance, cost)
    
    const decisionText = decision === 'renew' ?
      chalk.green(`💰 AI decides to RENEW insurance (Cost: ${cost})`) :
      chalk.yellow('❌ AI decides to let insurance EXPIRE')
    
    console.log(decisionText)
    await this.delay(this.getDemoDelay())
    
    return decision
  }

  async askConfirmation(message: string, defaultChoice: 'yes' | 'no' = 'no'): Promise<'yes' | 'no'> {
    console.log('\n' + chalk.bold.gray('🤖 AI is making a decision...'))
    console.log(chalk.gray(`Question: ${message}`))
    
    await this.delay(this.getDemoDelay())
    
    const decision = this.demoStrategy.makeConfirmationChoice(message, defaultChoice)
    const responseText = decision === 'yes' ? 
      chalk.green('✅ AI answers: YES') :
      chalk.red('❌ AI answers: NO')
    
    console.log(responseText)
    await this.delay(this.getDemoDelay())
    
    return decision
  }

  // === Enhanced Display Methods ===

  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    super.showMessage(message, level)
    
    // Add a pause in demo mode to let viewers read
    if (this.demoSpeed !== 'turbo') {
      setTimeout(() => {}, this.getDemoDelay())
    }
  }

  showChallengeResult(result: any): void {
    super.showChallengeResult(result)
    
    // Extended pause for important results
    setTimeout(() => {}, this.getDemoDelay() * 2)
  }

  // === Demo Control Methods ===

  private getDemoDelay(): number {
    const delays = {
      slow: 3000,
      normal: 1500,
      fast: 750,
      turbo: 100
    }
    return delays[this.demoSpeed]
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Set demo speed during runtime
   */
  setDemoSpeed(speed: 'slow' | 'normal' | 'fast' | 'turbo'): void {
    this.demoSpeed = speed
    console.log(chalk.gray(`🎭 Demo speed changed to: ${speed.toUpperCase()}`))
  }

  /**
   * Set demo strategy
   */
  setDemoStrategy(strategy: DemoStrategy): void {
    this.demoStrategy = strategy
    console.log(chalk.gray('🎭 Demo strategy updated'))
  }

  /**
   * Pause demo (wait for user input to continue)
   */
  async pauseDemo(): Promise<void> {
    console.log(chalk.yellow('\n⏸️ Demo paused - Press Enter to continue...'))
    
    return new Promise(resolve => {
      process.stdin.once('data', () => {
        console.log(chalk.green('▶️ Demo resumed'))
        resolve()
      })
    })
  }
}

/**
 * Demo Strategy Interface
 * Defines how the AI makes decisions during demo
 */
export interface DemoStrategy {
  selectCards(cards: Card[], minSelection: number, maxSelection: number): Card[]
  decideChallengeAction(challenge: Card): 'start' | 'skip'
  chooseInsuranceType(availableTypes: ('whole_life' | 'term')[]): 'whole_life' | 'term'
  decideInsuranceRenewal(insurance: Card, cost: number): 'renew' | 'expire'
  makeConfirmationChoice(message: string, defaultChoice: 'yes' | 'no'): 'yes' | 'no'
}

/**
 * Smart Demo Strategy
 * Makes intelligent decisions based on game state
 */
export class SmartDemoStrategy implements DemoStrategy {
  selectCards(cards: Card[], minSelection: number, maxSelection: number): Card[] {
    if (cards.length === 0 || minSelection === 0) {
      // Sometimes choose not to select anything if optional
      return Math.random() < 0.3 ? [] : cards.slice(0, Math.min(1, maxSelection))
    }

    // Sort by power and select highest power cards
    const sortedCards = [...cards].sort((a, b) => (b.power || 0) - (a.power || 0))
    const selectionCount = Math.min(
      maxSelection,
      Math.max(minSelection, Math.ceil(cards.length * 0.6))
    )

    return sortedCards.slice(0, selectionCount)
  }

  decideChallengeAction(challenge: Card): 'start' | 'skip' {
    // Mostly accept challenges, but sometimes skip for variety
    return Math.random() < 0.8 ? 'start' : 'skip'
  }

  chooseInsuranceType(availableTypes: ('whole_life' | 'term')[]): 'whole_life' | 'term' {
    // Prefer whole life insurance if available
    return availableTypes.includes('whole_life') ? 'whole_life' : availableTypes[0]
  }

  decideInsuranceRenewal(insurance: Card, cost: number): 'renew' | 'expire' {
    // Renew if cost is reasonable (≤ 3)
    return cost <= 3 ? 'renew' : 'expire'
  }

  makeConfirmationChoice(message: string, defaultChoice: 'yes' | 'no'): 'yes' | 'no' {
    // Mostly go with the default, but add some randomness
    return Math.random() < 0.7 ? defaultChoice : (defaultChoice === 'yes' ? 'no' : 'yes')
  }
}

/**
 * Aggressive Demo Strategy
 * Takes more risks and aggressive plays
 */
export class AggressiveDemoStrategy implements DemoStrategy {
  selectCards(cards: Card[], minSelection: number, maxSelection: number): Card[] {
    // Always select maximum possible cards
    return cards.slice(0, maxSelection)
  }

  decideChallengeAction(challenge: Card): 'start' | 'skip' {
    // Always accept challenges
    return 'start'
  }

  chooseInsuranceType(availableTypes: ('whole_life' | 'term')[]): 'whole_life' | 'term' {
    // Prefer term insurance (cheaper, more risk)
    return availableTypes.includes('term') ? 'term' : availableTypes[0]
  }

  decideInsuranceRenewal(insurance: Card, cost: number): 'renew' | 'expire' {
    // Renew only very cheap insurance
    return cost <= 1 ? 'renew' : 'expire'
  }

  makeConfirmationChoice(message: string, defaultChoice: 'yes' | 'no'): 'yes' | 'no' {
    // Always say yes to everything
    return 'yes'
  }
}

/**
 * Conservative Demo Strategy
 * Plays it safe and cautious
 */
export class ConservativeDemoStrategy implements DemoStrategy {
  selectCards(cards: Card[], minSelection: number, maxSelection: number): Card[] {
    // Select minimum required cards, prefer low cost
    const sortedCards = [...cards].sort((a, b) => (a.cost || 0) - (b.cost || 0))
    return sortedCards.slice(0, minSelection)
  }

  decideChallengeAction(challenge: Card): 'start' | 'skip' {
    // Skip challenges with high power requirements
    return (challenge.power || 0) > 5 ? 'skip' : 'start'
  }

  chooseInsuranceType(availableTypes: ('whole_life' | 'term')[]): 'whole_life' | 'term' {
    // Always prefer whole life for security
    return availableTypes.includes('whole_life') ? 'whole_life' : availableTypes[0]
  }

  decideInsuranceRenewal(insurance: Card, cost: number): 'renew' | 'expire' {
    // Renew most insurance for security
    return cost <= 5 ? 'renew' : 'expire'
  }

  makeConfirmationChoice(message: string, defaultChoice: 'yes' | 'no'): 'yes' | 'no' {
    // Always stick with defaults (conservative)
    return defaultChoice
  }
}