import { InteractiveCUIRenderer } from '../renderers/InteractiveCUIRenderer'
import type { Card } from '@/domain/entities/Card'
import type { CUIConfig } from '../config/CUIConfig'
import chalk from 'chalk'
import boxen from 'boxen'
import inquirer from 'inquirer'

/**
 * Tutorial Mode Renderer
 * Step-by-step learning experience with guided explanations
 */
export class TutorialModeRenderer extends InteractiveCUIRenderer {
  private tutorialStep: number = 0
  private tutorialPhase: TutorialPhase = 'introduction'
  private explainedConcepts: Set<string> = new Set()

  constructor(config?: Partial<CUIConfig>) {
    super({
      ...config,
      animationSpeed: 'slow',
      showHelp: true,
      confirmActions: true,
      autoAdvance: false
    })
  }

  async initialize(): Promise<void> {
    await super.initialize()
    
    console.log(chalk.bold.green('🎓 TUTORIAL MODE ACTIVATED'))
    console.log(chalk.gray('═'.repeat(50)))
    console.log(chalk.blue('Welcome to the Life Enrichment Game Tutorial!'))
    console.log(chalk.gray('I\'ll guide you through each step of the gameplay.\n'))

    await this.showTutorialIntroduction()
  }

  // === Enhanced Input Methods with Tutorials ===

  async askCardSelection(
    cards: Card[],
    minSelection: number = 1,
    maxSelection: number = 1,
    message?: string
  ): Promise<Card[]> {
    // First time explaining card selection
    if (!this.explainedConcepts.has('card_selection')) {
      await this.explainCardSelection(cards, minSelection, maxSelection)
      this.explainedConcepts.add('card_selection')
    }

    // Show cards with detailed explanations
    console.log('\n' + chalk.bold.blue('🃏 Available Cards:'))
    console.log(chalk.gray('─'.repeat(40)))

    cards.forEach((card, index) => {
      const cardDisplay = this.cardRenderer.renderCard(card, {
        style: 'detailed',
        showIndex: true,
        index: index + 1
      })
      console.log(cardDisplay)
      
      // Add card-specific tutorial hints
      const hint = this.getCardTutorialHint(card)
      if (hint) {
        console.log(chalk.dim(`💡 ${hint}\n`))
      }
    })

    // Interactive selection with guidance
    const result = await super.askCardSelection(cards, minSelection, maxSelection, message)
    
    // Explain the choice
    if (result.length > 0) {
      await this.explainCardChoice(result)
    }

    return result
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    if (!this.explainedConcepts.has('challenges')) {
      await this.explainChallenges(challenge)
      this.explainedConcepts.add('challenges')
    }

    console.log('\n' + chalk.bold.yellow('⚔️ Challenge Decision Tutorial:'))
    console.log(chalk.gray('─'.repeat(40)))

    // Show challenge analysis
    await this.analyzeChallenge(challenge)

    const action = await super.askChallengeAction(challenge)
    
    // Explain the consequences
    await this.explainChallengeChoice(challenge, action)
    
    return action
  }

  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    if (!this.explainedConcepts.has('insurance_types')) {
      await this.explainInsuranceTypes(availableTypes)
      this.explainedConcepts.add('insurance_types')
    }

    const choice = await super.askInsuranceTypeChoice(availableTypes)
    
    await this.explainInsuranceTypeChoice(choice)
    
    return choice
  }

  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    if (!this.explainedConcepts.has('insurance_renewal')) {
      await this.explainInsuranceRenewal()
      this.explainedConcepts.add('insurance_renewal')
    }

    console.log('\n' + chalk.bold.cyan('🛡️ Insurance Renewal Tutorial:'))
    console.log(chalk.gray('─'.repeat(40)))

    await this.analyzeInsuranceRenewal(insurance, cost)

    const decision = await super.askInsuranceRenewalChoice(insurance, cost)
    
    await this.explainRenewalChoice(insurance, cost, decision)
    
    return decision
  }

  // === Tutorial Explanation Methods ===

  private async showTutorialIntroduction(): Promise<void> {
    const introText = `
🎮 Welcome to the Life Enrichment Game!

This game simulates life's journey through different stages:
• 🌱 Youth - Building foundations
• 💪 Adult - Facing challenges 
• 👔 Middle Age - Managing responsibilities
• 👴 Elderly - Enjoying wisdom

Your goal is to navigate challenges, make smart decisions,
and build a fulfilling life while managing your vitality.

Key Concepts:
• ❤️ Vitality: Your life energy (health, motivation)
• 🃏 Cards: Represent life skills and experiences
• ⚔️ Challenges: Life obstacles to overcome
• 🛡️ Insurance: Protection against setbacks
`

    const tutorialBox = boxen(introText.trim(), {
      title: '🎓 Game Overview',
      titleAlignment: 'center',
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'blue'
    })

    console.log(tutorialBox)

    await this.waitForUserToContinue()
  }

  private async explainCardSelection(cards: Card[], minSelection: number, maxSelection: number): Promise<void> {
    const explanationText = `
🃏 CARD SELECTION TUTORIAL

Cards represent your life skills, experiences, and resources.
Each card has different properties:

• 💪 Power: How much this card helps in challenges
• 💰 Cost: Vitality required to use this card
• 🏷️ Category: What aspect of life this represents

Selection Rules:
• You must select ${minSelection === maxSelection ? 'exactly' : 'between'} ${minSelection}${minSelection !== maxSelection ? `-${maxSelection}` : ''} card(s)
• Higher power cards are usually better for challenges
• Consider the cost - don't exhaust your vitality!

💡 Strategy Tip: Balance high-power cards with your current vitality.
`

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 How to Select Cards',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'green'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async explainChallenges(challenge: Card): Promise<void> {
    const explanationText = `
⚔️ CHALLENGE TUTORIAL

Challenges represent life's obstacles and opportunities.
To succeed, your combined card power must meet or exceed 
the challenge's power requirement.

Challenge Analysis:
• 📊 Required Power: How much strength you need
• 🎯 Risk vs Reward: Weigh potential gains against costs
• ❤️ Vitality Impact: Success boosts you, failure drains you

Decision Options:
• ⚔️ Accept: Face the challenge with your cards
• 🏃 Skip: Avoid the challenge (no risk, no reward)

💡 Strategy Tip: Only take on challenges you can reasonably win!
`

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 Understanding Challenges',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'yellow'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async explainInsuranceTypes(availableTypes: ('whole_life' | 'term')[]): Promise<void> {
    const explanationText = `
🛡️ INSURANCE TUTORIAL

Insurance protects you from life's setbacks and provides
additional power for challenges.

Types Available:

🛡️ Whole Life Insurance:
• Permanent protection throughout life
• Higher cost but lasting benefits
• Provides consistent power bonus

⏳ Term Insurance:
• Temporary protection for specific periods
• Lower cost but must be renewed
• May become more expensive over time

💡 Strategy Tip: Whole life is more stable, term is more flexible.
Choose based on your current situation and long-term plans.
`

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 Insurance Types Explained',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async explainInsuranceRenewal(): Promise<void> {
    const explanationText = `
🔄 INSURANCE RENEWAL TUTORIAL

As you age, insurance becomes more expensive to maintain.
Each turn, you must decide whether to:

💰 Renew:
• Pay the renewal cost (vitality)
• Keep the insurance protection
• Maintain power bonuses for challenges

❌ Let Expire:
• Save the renewal cost
• Lose insurance protection
• May be harder to get insurance later

Factors to Consider:
• Current vitality level
• Upcoming challenges
• Age-related cost increases
• Alternative protection options

💡 Strategy Tip: Renewal costs increase with age, so plan ahead!
`

    const explanationBox = boxen(explanationText.trim(), {
      title: '🎓 Insurance Renewal Guide',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'round',
      borderColor: 'magenta'
    })

    console.log(explanationBox)
    await this.waitForUserToContinue()
  }

  private async analyzeChallenge(challenge: Card): Promise<void> {
    console.log(chalk.bold.blue('📊 Challenge Analysis:'))
    console.log(`  Name: ${challenge.name}`)
    console.log(`  Required Power: ${chalk.red(challenge.power || 0)}`)
    
    if (challenge.description) {
      console.log(`  Description: ${chalk.gray(challenge.description)}`)
    }

    // Provide strategic advice
    const powerRequired = challenge.power || 0
    if (powerRequired <= 3) {
      console.log(chalk.green('  💡 This looks like an easy challenge!'))
    } else if (powerRequired <= 6) {
      console.log(chalk.yellow('  💡 This is a moderate challenge. Choose your cards wisely.'))
    } else {
      console.log(chalk.red('  💡 This is a difficult challenge. Make sure you have strong cards!'))
    }
  }

  private async analyzeInsuranceRenewal(insurance: Card, cost: number): Promise<void> {
    console.log(chalk.bold.blue('📊 Renewal Analysis:'))
    console.log(`  Insurance: ${insurance.name}`)
    console.log(`  Renewal Cost: ${chalk.yellow(cost)} vitality`)
    console.log(`  Insurance Type: ${insurance.type}`)

    // Provide strategic advice
    if (cost <= 2) {
      console.log(chalk.green('  💡 Very affordable renewal - generally worth keeping'))
    } else if (cost <= 4) {
      console.log(chalk.yellow('  💡 Moderate cost - consider your current vitality'))
    } else {
      console.log(chalk.red('  💡 Expensive renewal - carefully weigh the benefits'))
    }
  }

  private getCardTutorialHint(card: Card): string {
    const power = card.power || 0
    const cost = card.cost || 0

    if (power >= 5) {
      return 'Strong card - great for difficult challenges'
    } else if (power >= 3) {
      return 'Balanced card - good for most situations'
    } else if (power >= 1) {
      return 'Basic card - useful for easy challenges'
    } else if (cost === 0) {
      return 'Free to use - no vitality cost'
    } else {
      return 'Consider the power-to-cost ratio'
    }
  }

  private async explainCardChoice(selectedCards: Card[]): Promise<void> {
    console.log('\n' + chalk.green('✅ Good choice! Let me explain why:'))
    
    const totalPower = selectedCards.reduce((sum, card) => sum + (card.power || 0), 0)
    const totalCost = selectedCards.reduce((sum, card) => sum + (card.cost || 0), 0)

    console.log(chalk.cyan(`  Total Power: ${totalPower}`))
    console.log(chalk.yellow(`  Total Cost: ${totalCost}`))

    if (totalPower > totalCost) {
      console.log(chalk.green('  💡 Great value! You get more power than you spend.'))
    } else if (totalPower === totalCost) {
      console.log(chalk.blue('  💡 Balanced choice - fair trade of vitality for power.'))
    } else {
      console.log(chalk.red('  💡 Expensive choice - make sure the challenge is worth it.'))
    }
  }

  private async explainChallengeChoice(challenge: Card, action: 'start' | 'skip'): Promise<void> {
    if (action === 'start') {
      console.log(chalk.green('\n💪 You chose to face the challenge!'))
      console.log(chalk.blue('  This shows courage and ambition.'))
      console.log(chalk.gray('  Remember: success brings rewards, failure costs vitality.'))
    } else {
      console.log(chalk.yellow('\n🏃 You chose to skip the challenge.'))
      console.log(chalk.blue('  Sometimes discretion is the better part of valor.'))
      console.log(chalk.gray('  You preserve vitality but miss potential rewards.'))
    }
  }

  private async explainInsuranceTypeChoice(choice: 'whole_life' | 'term'): Promise<void> {
    if (choice === 'whole_life') {
      console.log(chalk.blue('\n🛡️ You chose Whole Life Insurance!'))
      console.log(chalk.green('  ✅ Permanent protection'))
      console.log(chalk.green('  ✅ Stable costs'))
      console.log(chalk.red('  ❌ Higher initial cost'))
    } else {
      console.log(chalk.blue('\n⏳ You chose Term Insurance!'))
      console.log(chalk.green('  ✅ Lower initial cost'))
      console.log(chalk.green('  ✅ Flexibility to change'))
      console.log(chalk.red('  ❌ Costs may increase with age'))
    }
  }

  private async explainRenewalChoice(insurance: Card, cost: number, decision: 'renew' | 'expire'): Promise<void> {
    if (decision === 'renew') {
      console.log(chalk.green('\n💰 You chose to renew your insurance!'))
      console.log(chalk.blue('  This maintains your protection and challenge bonuses.'))
      console.log(chalk.gray(`  Cost: ${cost} vitality`))
    } else {
      console.log(chalk.yellow('\n❌ You let your insurance expire.'))
      console.log(chalk.blue('  This saves vitality but removes protection.'))
      console.log(chalk.gray('  Consider getting new insurance if you can afford it later.'))
    }
  }

  private async waitForUserToContinue(): Promise<void> {
    const { continue: shouldContinue } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continue',
        message: 'Press Enter to continue...',
        default: true
      }
    ])
  }

  // === Tutorial Progress Tracking ===

  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    super.showMessage(message, level)
    
    // Add tutorial context for certain messages
    if (message.includes('獲得') && !this.explainedConcepts.has('card_rewards')) {
      console.log(chalk.dim('💡 Tutorial: You earned a new card! This expands your options for future challenges.'))
      this.explainedConcepts.add('card_rewards')
    }
  }

  showChallengeResult(result: any): void {
    super.showChallengeResult(result)
    
    // Add tutorial explanations for results
    if (result.success && !this.explainedConcepts.has('success_explanation')) {
      console.log(chalk.dim('\n💡 Tutorial: Success! Your card power exceeded the challenge requirement.'))
      console.log(chalk.dim('This boosts your vitality and may provide additional rewards.'))
      this.explainedConcepts.add('success_explanation')
    } else if (!result.success && !this.explainedConcepts.has('failure_explanation')) {
      console.log(chalk.dim('\n💡 Tutorial: Challenge failed. Your card power was insufficient.'))
      console.log(chalk.dim('Failure reduces vitality, but you learn from the experience.'))
      this.explainedConcepts.add('failure_explanation')
    }
  }

  /**
   * Show comprehensive help
   */
  async showHelp(): Promise<void> {
    const helpText = `
🎓 TUTORIAL HELP

Commands you can use:
• Answer prompts with numbers or text as requested
• Use 'help' anytime to see this message
• Use 'explain <concept>' for specific explanations

Key Concepts:
• vitality: Your life energy and health
• power: Strength for overcoming challenges  
• cost: Vitality required to use cards
• insurance: Protection and bonus power
• stages: Different phases of life

Strategy Tips:
• Don't exhaust all your vitality at once
• Balance risk and reward in challenges
• Insurance is an investment in your future
• Learn from both successes and failures
`

    const helpBox = boxen(helpText.trim(), {
      title: '🆘 Tutorial Help',
      titleAlignment: 'center',
      padding: 1,
      borderStyle: 'double',
      borderColor: 'blue'
    })

    console.log(helpBox)
  }
}

/**
 * Tutorial phase tracking
 */
type TutorialPhase = 
  | 'introduction'
  | 'first_cards' 
  | 'first_challenge'
  | 'insurance_intro'
  | 'advanced_play'
  | 'mastery'