#!/usr/bin/env node

/**
 * Standalone CUI Demo
 * Demonstrates the CUI system without requiring the full game integration
 */

import chalk from 'chalk'
import figlet from 'figlet'
import inquirer from 'inquirer'
import boxen from 'boxen'
import { CUIConfigManager, defaultCUIConfig } from './config/CUIConfig'
import { CardRenderer } from './utils/CardRenderer'
import { ProgressDisplay } from './utils/ProgressDisplay'
import { AnimationHelper } from './utils/AnimationHelper'

// Mock card interface for demo
interface DemoCard {
  name: string
  power?: number
  cost?: number
  category?: string
  type?: string
  description?: string
}

// Mock cards for demonstration
const demoCards: DemoCard[] = [
  {
    name: '朝のジョギング',
    power: 3,
    cost: 1,
    category: 'health',
    description: '健康的な一日の始まり'
  },
  {
    name: 'スキルアップ講座',
    power: 4,
    cost: 2,
    category: 'career',
    description: '新しい技術を学ぶ'
  },
  {
    name: '家族との時間',
    power: 2,
    cost: 1,
    category: 'family',
    description: '大切な人との絆を深める'
  },
  {
    name: '読書',
    power: 2,
    cost: 0,
    category: 'hobby',
    description: '知識と心を豊かにする'
  },
  {
    name: '投資セミナー',
    power: 5,
    cost: 3,
    category: 'finance',
    description: '将来の安定を築く'
  }
]

async function main() {
  console.clear()
  
  // Show title
  try {
    const title = figlet.textSync('CUI DEMO', { font: 'Small' })
    console.log(chalk.blue(title))
  } catch {
    console.log(chalk.bold.blue('🎮 CUI DEMO'))
  }
  
  console.log(chalk.gray('Life Enrichment Game - CUI System Demonstration'))
  console.log(chalk.dim('Showcasing beautiful terminal interface capabilities\n'))

  // Initialize CUI system
  const configManager = new CUIConfigManager(defaultCUIConfig)
  const config = configManager.getConfig()
  const theme = configManager.getAccessibleColors()
  
  const cardRenderer = new CardRenderer(config, theme)
  const progressDisplay = new ProgressDisplay(config, theme)
  const animationHelper = new AnimationHelper(config, theme)

  // Demo menu
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Choose a demonstration:',
      choices: [
        { name: '🃏 Card Display Showcase', value: 'cards' },
        { name: '📊 Progress Bars & Stats', value: 'progress' },
        { name: '🎨 Themes & Animations', value: 'themes' },
        { name: '🎮 Interactive Game Simulation', value: 'game' },
        { name: '❌ Exit', value: 'exit' }
      ]
    }
  ])

  switch (choice) {
    case 'cards':
      await showcaseCards(cardRenderer)
      break
    case 'progress':
      await showcaseProgress(progressDisplay)
      break
    case 'themes':
      await showcaseThemes(configManager)
      break
    case 'game':
      await simulateGame(cardRenderer, progressDisplay, animationHelper)
      break
    case 'exit':
      console.log(chalk.cyan('👋 Thanks for trying the CUI demo!'))
      return
  }

  // Ask if user wants to continue
  const { again } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'again',
      message: 'Try another demonstration?',
      default: true
    }
  ])

  if (again) {
    await main()
  } else {
    console.log(chalk.green('\n✨ CUI Demo completed!'))
    console.log(chalk.dim('The terminal interface is ready for game integration.'))
  }
}

async function showcaseCards(cardRenderer: CardRenderer) {
  console.log('\n' + chalk.bold.blue('🃏 Card Display Showcase'))
  console.log(chalk.gray('═'.repeat(50)))

  // Show different card styles
  const styles = ['detailed', 'compact', 'ascii', 'unicode'] as const
  
  for (const style of styles) {
    console.log('\n' + chalk.yellow(`${style.toUpperCase()} Style:`))
    console.log(chalk.gray('─'.repeat(30)))
    
    const card = demoCards[0]
    const renderedCard = cardRenderer.renderCard(card as any, { style })
    console.log(renderedCard)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  // Show card grid
  console.log('\n' + chalk.yellow('GRID Layout:'))
  console.log(chalk.gray('─'.repeat(30)))
  
  const cardGrid = cardRenderer.renderCardGrid(demoCards as any[], {
    columns: 2,
    showIndices: true,
    selectedIndices: [0, 2]
  })
  console.log(cardGrid)
}

async function showcaseProgress(progressDisplay: ProgressDisplay) {
  console.log('\n' + chalk.bold.green('📊 Progress Bars & Statistics'))
  console.log(chalk.gray('═'.repeat(50)))

  // Vitality bar demo
  console.log('\n' + chalk.yellow('Vitality Bars:'))
  const vitalityLevels = [20, 15, 10, 5, 2]
  
  for (const vitality of vitalityLevels) {
    const bar = progressDisplay.renderVitalityBar(vitality, 20, {
      style: 'blocks',
      showNumbers: true,
      showPercentage: true
    })
    console.log(bar)
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // Stats dashboard
  console.log('\n' + chalk.yellow('Statistics Dashboard:'))
  const stats = {
    totalChallenges: 15,
    successfulChallenges: 12,
    failedChallenges: 3,
    cardsAcquired: 8,
    highestVitality: 25,
    turnsPlayed: 20
  }
  
  const dashboard = progressDisplay.renderStatsDashboard(stats)
  console.log(dashboard)

  // Stage progress
  console.log('\n' + chalk.yellow('Stage Progress:'))
  const stages = ['youth', 'adult', 'middle_age', 'elderly']
  for (let i = 0; i < stages.length; i++) {
    const stageProgress = progressDisplay.renderStageProgress(stages[i], i * 5 + 3)
    console.log(stageProgress)
  }
}

async function showcaseThemes(configManager: CUIConfigManager) {
  console.log('\n' + chalk.bold.magenta('🎨 Themes & Animations'))
  console.log(chalk.gray('═'.repeat(50)))

  const themes = ['default', 'dark', 'colorful', 'minimal', 'matrix'] as const
  
  for (const themeName of themes) {
    configManager.updateConfig({ theme: themeName })
    const theme = configManager.getAccessibleColors()
    
    console.log('\n' + chalk.bold(`${themeName.toUpperCase()} Theme:`))
    
    // Show theme colors
    const colorDemo = `
${chalk.hex(theme.primary)('█')} Primary    ${chalk.hex(theme.secondary)('█')} Secondary
${chalk.hex(theme.success)('█')} Success    ${chalk.hex(theme.warning)('█')} Warning  
${chalk.hex(theme.error)('█')} Error      ${chalk.hex(theme.info)('█')} Info      
${chalk.hex(theme.accent)('█')} Accent     ${chalk.hex(theme.text)('█')} Text      
`
    console.log(colorDemo)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
  }
}

async function simulateGame(
  cardRenderer: CardRenderer, 
  progressDisplay: ProgressDisplay, 
  animationHelper: AnimationHelper
) {
  console.log('\n' + chalk.bold.red('🎮 Interactive Game Simulation'))
  console.log(chalk.gray('═'.repeat(50)))

  let vitality = 20
  let turn = 1
  
  while (vitality > 0 && turn <= 5) {
    console.log('\n' + chalk.cyan(`=== Turn ${turn} ===`))
    
    // Show current state
    const vitalityBar = progressDisplay.renderVitalityBar(vitality, 20)
    console.log(vitalityBar)
    
    // Show available cards
    console.log('\n' + chalk.blue('Available Cards:'))
    const availableCards = demoCards.slice(0, 3)
    const cardGrid = cardRenderer.renderCardGrid(availableCards as any[], {
      columns: 3,
      showIndices: true
    })
    console.log(cardGrid)
    
    // Player choice
    const { selectedCards } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedCards',
        message: 'Select cards to play:',
        choices: availableCards.map((card, index) => ({
          name: `${card.name} (Power: ${card.power}, Cost: ${card.cost})`,
          value: index
        }))
      }
    ])
    
    // Calculate result
    let totalPower = 0
    let totalCost = 0
    
    for (const index of selectedCards) {
      const card = availableCards[index]
      totalPower += card.power || 0
      totalCost += card.cost || 0
    }
    
    // Challenge simulation
    const challengePower = Math.floor(Math.random() * 8) + 3
    const success = totalPower >= challengePower
    
    console.log('\n' + chalk.yellow('⚔️ Challenge Result:'))
    console.log(`Challenge Power: ${challengePower}`)
    console.log(`Your Power: ${totalPower}`)
    console.log(`Result: ${success ? chalk.green('SUCCESS!') : chalk.red('FAILED!')}`)
    
    // Update vitality
    if (success) {
      vitality += 2
      vitality = Math.min(vitality, 20)
    } else {
      vitality -= 3
    }
    vitality -= totalCost
    vitality = Math.max(vitality, 0)
    
    // Celebration or failure animation
    if (success) {
      await animationHelper.celebrateAnimation('Challenge Completed!')
    } else {
      await animationHelper.shakeEffect('Challenge Failed!')
    }
    
    turn++
  }
  
  // Game end
  console.log('\n' + chalk.bold.yellow('🎯 Game Simulation Complete!'))
  
  const finalStats = {
    totalChallenges: turn - 1,
    successfulChallenges: Math.floor((turn - 1) * 0.7),
    failedChallenges: Math.floor((turn - 1) * 0.3),
    cardsAcquired: 5,
    highestVitality: 20,
    turnsPlayed: turn - 1
  }
  
  const finalDashboard = progressDisplay.renderStatsDashboard(finalStats)
  
  const boxedStats = boxen(finalDashboard, {
    title: '📊 Final Results',
    titleAlignment: 'center',
    padding: 1,
    borderStyle: 'double',
    borderColor: 'green'
  })
  
  console.log(boxedStats)
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Demo interrupted. Thanks for trying it!'))
  process.exit(0)
})

// Run the demo
main().catch(error => {
  console.error(chalk.red('Demo error:'), error)
  process.exit(1)
})