#!/usr/bin/env node

import chalk from 'chalk'
import figlet from 'figlet'
import { Command } from 'commander'

const program = new Command()

program
  .name('life-game-cui')
  .description('Life Enrichment Game - Terminal Interface')
  .version('1.0.0')

program
  .command('test')
  .description('Test CUI system')
  .action(async () => {
    console.log(chalk.green('🎮 CUI Test Mode'))
    
    try {
      // Test title
      const title = figlet.textSync('LIFE GAME', { font: 'Small' })
      console.log(chalk.blue(title))
      
      // Test imports
      const { InteractiveCUIRenderer } = await import('./renderers/InteractiveCUIRenderer')
      console.log(chalk.green('✅ InteractiveCUIRenderer imported'))
      
      const { GameControllerFactory } = await import('../controllers/GameController')
      console.log(chalk.green('✅ GameController imported'))
      
      // Test renderer creation
      const renderer = new InteractiveCUIRenderer()
      console.log(chalk.green('✅ Renderer created'))
      
      // Test controller creation
      const controller = GameControllerFactory.createDefault(renderer)
      console.log(chalk.green('✅ Controller created'))
      
      console.log(chalk.cyan('\n🎉 All systems working! Ready for game development.'))
      
    } catch (error) {
      console.error(chalk.red('❌ Error:'), error)
    }
  })

program
  .command('demo')
  .description('Quick demo')
  .action(async () => {
    console.log(chalk.magenta('🎭 Demo Mode (Simplified)'))
    console.log(chalk.gray('This would run a game demo...'))
    
    // Simulate a quick demo
    for (let i = 1; i <= 3; i++) {
      console.log(chalk.blue(`Turn ${i}: AI making decisions...`))
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(chalk.green('✅ Demo completed!'))
  })

if (process.argv.length === 2) {
  console.log(chalk.bold.blue('🎮 LIFE GAME - CUI'))
  console.log(chalk.gray('Simple test interface for development'))
  program.help()
} else {
  program.parse()
}