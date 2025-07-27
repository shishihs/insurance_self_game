#!/usr/bin/env node

/**
 * Automatic CUI Demo
 * Shows all CUI features without user interaction
 */

import chalk from 'chalk'
import figlet from 'figlet'
import { CUIConfigManager, defaultCUIConfig } from './config/CUIConfig'
import { CardRenderer } from './utils/CardRenderer'
import { ProgressDisplay } from './utils/ProgressDisplay'
import { AnimationHelper } from './utils/AnimationHelper'

// Mock card for demo
const demoCards = [
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
  }
]

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.clear()
  
  // Show title with animation
  try {
    const title = figlet.textSync('CUI DEMO', { font: 'Small' })
    console.log(chalk.blue(title))
  } catch {
    console.log(chalk.bold.blue('🎮 CUI DEMO'))
  }
  
  console.log(chalk.gray('Life Enrichment Game - CUI System'))
  console.log(chalk.cyan('Automatic demonstration of all features\n'))
  
  await sleep(2000)

  // Initialize CUI system
  console.log(chalk.yellow('🔧 Initializing CUI system...'))
  const configManager = new CUIConfigManager(defaultCUIConfig)
  const config = configManager.getConfig()
  const theme = configManager.getAccessibleColors()
  
  const cardRenderer = new CardRenderer(config, theme)
  const progressDisplay = new ProgressDisplay(config, theme)
  const animationHelper = new AnimationHelper(config, theme)
  
  console.log(chalk.green('✅ CUI system initialized!'))
  await sleep(1500)

  // 1. Card Rendering Demo
  console.log('\n' + chalk.bold.blue('🃏 CARD RENDERING SHOWCASE'))
  console.log(chalk.gray('═'.repeat(50)))
  
  console.log(chalk.yellow('\nDetailed Card Style:'))
  const detailedCard = cardRenderer.renderCard(demoCards[0] as any, { style: 'detailed', showIndex: true, index: 1 })
  console.log(detailedCard)
  await sleep(2000)
  
  console.log(chalk.yellow('\nCompact Card Style:'))
  const compactCard = cardRenderer.renderCard(demoCards[1] as any, { style: 'compact', selected: true })
  console.log(compactCard)
  await sleep(2000)
  
  console.log(chalk.yellow('\nCard Grid Layout:'))
  const cardGrid = cardRenderer.renderCardGrid(demoCards as any[], {
    columns: 3,
    showIndices: true,
    selectedIndices: [0, 2]
  })
  console.log(cardGrid)
  await sleep(3000)

  // 2. Progress Display Demo
  console.log('\n' + chalk.bold.green('📊 PROGRESS DISPLAY SHOWCASE'))
  console.log(chalk.gray('═'.repeat(50)))
  
  console.log(chalk.yellow('\nVitality Bars:'))
  for (let vitality = 20; vitality >= 5; vitality -= 5) {
    const bar = progressDisplay.renderVitalityBar(vitality, 20, {
      style: 'blocks',
      showNumbers: true,
      showPercentage: true
    })
    console.log(bar)
    await sleep(800)
  }
  
  console.log(chalk.yellow('\nStage Progress:'))
  const stages = ['youth', 'adult', 'middle_age', 'elderly']
  for (let i = 0; i < stages.length; i++) {
    const stageProgress = progressDisplay.renderStageProgress(stages[i], i * 3 + 1)
    console.log(stageProgress)
    await sleep(1000)
  }
  
  console.log(chalk.yellow('\nStatistics Dashboard:'))
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
  await sleep(3000)

  // 3. Theme Showcase
  console.log('\n' + chalk.bold.magenta('🎨 THEME SHOWCASE'))
  console.log(chalk.gray('═'.repeat(50)))
  
  const themes = ['default', 'dark', 'colorful', 'minimal', 'matrix'] as const
  
  for (const themeName of themes) {
    configManager.updateConfig({ theme: themeName })
    const themeColors = configManager.getAccessibleColors()
    
    console.log('\n' + chalk.bold(`${themeName.toUpperCase()} Theme:`))
    
    // Show theme demonstration
    const colorPalette = `
${chalk.hex(themeColors.primary)('██')} Primary   ${chalk.hex(themeColors.secondary)('██')} Secondary
${chalk.hex(themeColors.success)('██')} Success   ${chalk.hex(themeColors.warning)('██')} Warning  
${chalk.hex(themeColors.error)('██')} Error     ${chalk.hex(themeColors.info)('██')} Info      
${chalk.hex(themeColors.accent)('██')} Accent    ${chalk.hex(themeColors.text)('██')} Text      
`
    console.log(colorPalette)
    
    // Show a card in this theme
    const themedRenderer = new CardRenderer(configManager.getConfig(), themeColors)
    const themedCard = themedRenderer.renderCard(demoCards[0] as any, { 
      style: 'compact', 
      selected: themeName === 'colorful' 
    })
    console.log(themedCard)
    
    await sleep(2500)
  }

  // 4. Animation Demo (if animations are enabled)
  configManager.updateConfig({ animationSpeed: 'normal', visualEffects: true })
  const finalAnimationHelper = new AnimationHelper(configManager.getConfig(), configManager.getAccessibleColors())
  
  console.log('\n' + chalk.bold.red('🎭 ANIMATION SHOWCASE'))
  console.log(chalk.gray('═'.repeat(50)))
  
  console.log(chalk.yellow('\nTypewriter Effect:'))
  await finalAnimationHelper.typewriterEffect('This text appears character by character...', { delay: 100 })
  console.log()
  await sleep(1000)
  
  console.log(chalk.yellow('\nCelebration Animation:'))
  await finalAnimationHelper.celebrateAnimation('SUCCESS!')
  await sleep(1000)
  
  console.log(chalk.yellow('\nPulse Effect:'))
  await finalAnimationHelper.pulseText('Important Message!', 2)
  await sleep(1000)

  // 5. Complete Game Simulation
  console.log('\n' + chalk.bold.cyan('🎮 MINI GAME SIMULATION'))
  console.log(chalk.gray('═'.repeat(50)))
  
  let gameVitality = 15
  
  for (let turn = 1; turn <= 3; turn++) {
    console.log('\n' + chalk.cyan(`Turn ${turn}:`))
    
    // Show vitality
    const vitalityDisplay = progressDisplay.renderVitalityBar(gameVitality, 20)
    console.log(vitalityDisplay)
    
    // Show available cards
    console.log('\n' + chalk.blue('Available Cards:'))
    const gameCards = demoCards.slice(0, 2)
    for (const card of gameCards) {
      const cardDisplay = cardRenderer.renderCard(card as any, { style: 'compact' })
      console.log(cardDisplay)
    }
    
    await sleep(2000)
    
    // Simulate choice
    console.log(chalk.green('🤖 AI selects: ' + gameCards[0].name))
    
    // Simulate challenge
    const challengePower = Math.floor(Math.random() * 5) + 2
    const playerPower = gameCards[0].power || 0
    const success = playerPower >= challengePower
    
    console.log('\n' + chalk.yellow('⚔️ Challenge:'))
    console.log(`Challenge Power: ${challengePower}`)
    console.log(`Player Power: ${playerPower}`)
    console.log(`Result: ${success ? chalk.green('SUCCESS!') : chalk.red('FAILED!')}`)
    
    // Update vitality
    if (success) {
      gameVitality += 2
      await finalAnimationHelper.celebrateAnimation('Challenge Won!')
    } else {
      gameVitality -= 2
      console.log(chalk.red('💔 Vitality decreased'))
    }
    
    gameVitality = Math.max(0, Math.min(20, gameVitality))
    await sleep(2000)
  }

  // Final summary
  console.log('\n' + chalk.bold.green('🎉 CUI DEMO COMPLETE!'))
  console.log(chalk.gray('═'.repeat(50)))
  
  const summary = `
✅ Card Rendering System - Multiple styles and layouts
✅ Progress Display System - Bars, stats, and indicators  
✅ Theme System - 5 different color schemes
✅ Animation System - Typewriter, celebrations, transitions
✅ Interactive Components - All working beautifully

🎯 The CUI system is fully functional and ready for game integration!

Key Features Demonstrated:
• Beautiful ASCII art card displays
• Responsive progress bars and vitality indicators
• Multiple themes for different preferences  
• Smooth animations and visual effects
• Professional terminal interface design
• Modular and extensible architecture

Next Steps:
• Integrate with GameController for full gameplay
• Add more card styles and animations
• Implement save/load for configurations
• Add more interactive elements
`

  console.log(chalk.cyan(summary))
  
  console.log(chalk.bold.yellow('\n🚀 Try these commands:'))
  console.log(chalk.dim('pnpm cui:demo     - Interactive demo with user choices'))
  console.log(chalk.dim('pnpm cui:tutorial - Learn the game with guided tutorial'))
  console.log(chalk.dim('pnpm cui:play     - Full interactive gameplay (when integrated)'))
  
  console.log(chalk.green('\n👋 Thanks for viewing the CUI demonstration!'))
}

// Run the demo
main().catch(error => {
  console.error(chalk.red('Demo error:'), error)
  process.exit(1)
})