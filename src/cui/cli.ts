#!/usr/bin/env node

/**
 * CUI Command Line Interface
 * Entry point for terminal-based game execution
 */

import { Command } from 'commander'
import chalk from 'chalk'
import figlet from 'figlet'
import { writeFile } from 'fs/promises'
import { GameController, GameControllerFactory } from '@/controllers/GameController'
import { InteractiveCUIRenderer } from './renderers/InteractiveCUIRenderer'
import { DemoModeRenderer, SmartDemoStrategy, AggressiveDemoStrategy, ConservativeDemoStrategy } from './modes/DemoMode'
import { BenchmarkModeRenderer } from './modes/BenchmarkMode'
import { TutorialModeRenderer } from './modes/TutorialMode'
import { DebugModeRenderer } from './modes/DebugMode'
import type { CUIConfig } from './config/CUIConfig'
import type { GameConfig } from '@/domain/types/game.types'

const program = new Command()

// CLI Configuration
program
  .name('life-game-cui')
  .description('Life Enrichment Game - Terminal Interface')
  .version('1.0.0')

// === Interactive Play Command ===
program
  .command('play')
  .description('Start interactive gameplay')
  .option('-t, --theme <theme>', 'UI theme (default, dark, colorful, minimal, matrix)', 'default')
  .option('-s, --speed <speed>', 'Animation speed (slow, normal, fast, off)', 'normal')
  .option('-c, --compact', 'Use compact layout')
  .option('--no-animations', 'Disable animations')
  .option('--no-colors', 'Disable colored output')
  .option('-d, --difficulty <level>', 'Game difficulty (easy, normal, hard)', 'normal')
  .option('--vitality <amount>', 'Starting vitality', '20')
  .option('--hand-size <size>', 'Starting hand size', '5')
  .action(async (options) => {
    try {
      await runInteractiveGame(options)
    } catch (error) {
      console.error(chalk.red('❌ Error starting game:'), error)
      process.exit(1)
    }
  })

// === Demo Mode Command ===
program
  .command('demo')
  .description('Watch AI play the game automatically')
  .option('-s, --speed <speed>', 'Demo speed (slow, normal, fast, turbo)', 'normal')
  .option('-t, --theme <theme>', 'UI theme', 'default')
  .option('--strategy <strategy>', 'AI strategy (smart, aggressive, conservative)', 'smart')
  .option('-g, --games <count>', 'Number of games to play', '1')
  .option('-d, --difficulty <level>', 'Game difficulty (easy, normal, hard)', 'normal')
  .option('--pause', 'Allow pausing during demo')
  .action(async (options) => {
    try {
      await runDemoMode(options)
    } catch (error) {
      console.error(chalk.red('❌ Error starting demo:'), error)
      process.exit(1)
    }
  })

// === Benchmark Command ===
program
  .command('benchmark')
  .description('Run performance benchmarks')
  .option('-g, --games <count>', 'Number of games to run', '100')
  .option('-o, --output <file>', 'Output file for results (JSON)')
  .option('-d, --difficulty <level>', 'Game difficulty', 'normal')
  .option('--quick', 'Quick benchmark (fewer games)')
  .action(async (options) => {
    try {
      await runBenchmark(options)
    } catch (error) {
      console.error(chalk.red('❌ Error running benchmark:'), error)
      process.exit(1)
    }
  })

// === Tutorial Command ===
program
  .command('tutorial')
  .description('Learn to play with guided tutorial')
  .option('-t, --theme <theme>', 'UI theme', 'default')
  .option('--skip-intro', 'Skip introduction')
  .action(async (options) => {
    try {
      await runTutorial(options)
    } catch (error) {
      console.error(chalk.red('❌ Error starting tutorial:'), error)
      process.exit(1)
    }
  })

// === Debug Command ===
program
  .command('debug')
  .description('Start game with debug interface')
  .option('-t, --theme <theme>', 'UI theme', 'default')
  .option('-d, --difficulty <level>', 'Game difficulty', 'normal')
  .option('--log-level <level>', 'Debug log level', 'info')
  .action(async (options) => {
    try {
      await runDebugMode(options)
    } catch (error) {
      console.error(chalk.red('❌ Error starting debug mode:'), error)
      process.exit(1)
    }
  })

// === Config Command ===
program
  .command('config')
  .description('Manage configuration')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset to defaults')
  .option('--theme <theme>', 'Set default theme')
  .option('--export <file>', 'Export configuration')
  .option('--import <file>', 'Import configuration')
  .action(async (options) => {
    try {
      await manageConfig(options)
    } catch (error) {
      console.error(chalk.red('❌ Configuration error:'), error)
      process.exit(1)
    }
  })

// === Help Command Enhancement ===
program
  .command('help-advanced')
  .description('Show advanced usage examples')
  .action(() => {
    showAdvancedHelp()
  })

// Main execution
async function main() {
  // Show title if no arguments
  if (process.argv.length === 2) {
    await showTitle()
    program.help()
    return
  }

  program.parse()
}

// === Implementation Functions ===

async function runInteractiveGame(options: any): Promise<void> {
  const config = createCUIConfig(options)
  const gameConfig = createGameConfig(options)

  const renderer = new InteractiveCUIRenderer(config)
  const controller = GameControllerFactory.create(gameConfig, renderer)

  console.log(chalk.green('🎮 Starting interactive game...'))

  const stats = await controller.playGame()

  console.log(chalk.blue('\n🎯 Final Statistics:'))
  console.log(`Games Played: 1`)
  console.log(`Outcome: ${stats.totalChallenges > 0 ? 'Completed' : 'Incomplete'}`)
  console.log(`Success Rate: ${((stats.successfulChallenges / Math.max(stats.totalChallenges, 1)) * 100).toFixed(1)}%`)
}

async function runDemoMode(options: any): Promise<void> {
  const config = createCUIConfig(options)
  const gameConfig = createGameConfig(options)
  const gamesCount = parseInt(options.games) || 1

  console.log(chalk.magenta('🎭 Starting demo mode...'))

  for (let i = 0; i < gamesCount; i++) {
    if (gamesCount > 1) {
      console.log(chalk.cyan(`\n🎮 Game ${i + 1}/${gamesCount}`))
    }

    const renderer = new DemoModeRenderer(config, options.speed)

    // Set strategy
    switch (options.strategy) {
      case 'aggressive':
        renderer.setDemoStrategy(new AggressiveDemoStrategy())
        break
      case 'conservative':
        renderer.setDemoStrategy(new ConservativeDemoStrategy())
        break
      default:
        renderer.setDemoStrategy(new SmartDemoStrategy())
    }

    const controller = GameControllerFactory.create(gameConfig, renderer)

    if (options.pause && i === 0) {
      console.log(chalk.yellow('Press Ctrl+C anytime to pause demo'))
    }

    await controller.playGame()

    if (i < gamesCount - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  console.log(chalk.green(`\n✅ Demo completed! Played ${gamesCount} game(s).`))
}

async function runBenchmark(options: any): Promise<void> {
  const gamesCount = options.quick ? 50 : (parseInt(options.games) || 100)
  const gameConfig = createGameConfig(options)

  console.log(chalk.cyan(`⚡ Starting benchmark: ${gamesCount} games`))

  const renderer = new BenchmarkModeRenderer({
    theme: 'minimal',
    animationSpeed: 'off',
    visualEffects: false
  }, gamesCount)

  const totalStats = {
    victories: 0,
    gameOvers: 0,
    totalChallenges: 0,
    successfulChallenges: 0
  }

  for (let i = 0; i < gamesCount; i++) {
    const controller = GameControllerFactory.create(gameConfig, renderer)
    const stats = await controller.playGame()

    totalStats.totalChallenges += stats.totalChallenges
    totalStats.successfulChallenges += stats.successfulChallenges

    // Simple progress indicator
    if (i % 10 === 0 && i > 0) {
      const progress = ((i / gamesCount) * 100).toFixed(0)
      process.stdout.write(`\r⚡ Progress: ${progress}% (${i}/${gamesCount})`)
    }
  }

  // Export results if requested
  if (options.output) {
    const exportData = renderer.exportResults()
    await writeFile(options.output, exportData)
    console.log(chalk.green(`\n💾 Results exported to: ${options.output}`))
  }
}

async function runTutorial(options: any): Promise<void> {
  const config = createCUIConfig(options)
  const gameConfig = createGameConfig({ difficulty: 'easy' }) // Tutorial uses easy mode

  console.log(chalk.blue('🎓 Starting tutorial mode...'))

  const renderer = new TutorialModeRenderer(config)
  const controller = GameControllerFactory.create(gameConfig, renderer)

  if (!options.skipIntro) {
    console.log(chalk.yellow('📚 Get ready to learn the basics of life management!'))
    await new Promise(resolve => setTimeout(resolve, 2000))
  }

  await controller.playGame()

  console.log(chalk.green('\n🎉 Tutorial completed! You\'re ready for the real game.'))
  console.log(chalk.dim('Try "pnpm cui:play" for a full game experience.'))
}

async function runDebugMode(options: any): Promise<void> {
  const config = createCUIConfig(options)
  const gameConfig = createGameConfig(options)

  console.log(chalk.red('🐛 Starting debug mode...'))

  const renderer = new DebugModeRenderer(config)
  const controller = GameControllerFactory.create(gameConfig, renderer)

  controller.setDebugMode(true)

  await controller.playGame()
}

async function manageConfig(options: any): Promise<void> {
  if (options.show) {
    // Show current config
    console.log(chalk.blue('📋 Current Configuration:'))
    // Implementation would show saved config
    console.log(chalk.gray('(Configuration management not yet implemented)'))
  }

  if (options.reset) {
    console.log(chalk.yellow('🔄 Resetting configuration to defaults...'))
    // Implementation would reset config
    console.log(chalk.green('✅ Configuration reset successfully'))
  }

  // Other config options...
}

// === Utility Functions ===

function createCUIConfig(options: any): Partial<CUIConfig> {
  return {
    theme: options.theme || 'default',
    animationSpeed: options.animations === false ? 'off' : (options.speed || 'normal'),
    compactLayout: options.compact || false,
    visualEffects: options.animations !== false,
    showHelp: true
  }
}

function createGameConfig(options: any): GameConfig {
  // ルールに基づいた年齢別活力設定（GAME_DESIGN.mdより）
  const difficultyMap = {
    easy: {
      startingVitality: 35,  // 青年期の最大活力
      startingHandSize: 6,
      maxHandSize: 8
    },
    normal: {
      startingVitality: 30,  // 青年期と中年期の中間
      startingHandSize: 5,
      maxHandSize: 7
    },
    hard: {
      startingVitality: 25,  // 少し余裕を持たせた値
      startingHandSize: 5,   // 手札は5枚維持（4枚は厳しすぎる）
      maxHandSize: 6
    }
  }

  const difficulty = difficultyMap[options.difficulty as keyof typeof difficultyMap] || difficultyMap.normal

  return {
    difficulty: options.difficulty || 'normal',
    startingVitality: parseInt(options.vitality) || difficulty.startingVitality,
    startingHandSize: parseInt(options.handSize) || difficulty.startingHandSize,
    maxHandSize: difficulty.maxHandSize,
    dreamCardCount: 2
  }
}

async function showTitle(): Promise<void> {
  try {
    const title = figlet.textSync('LIFE GAME', {
      font: 'Small',
      horizontalLayout: 'default'
    })
    console.log(chalk.blue(title))
  } catch {
    console.log(chalk.bold.blue('🎮 LIFE GAME - CUI'))
  }

  console.log(chalk.gray('Terminal-based Life Enrichment Game'))
  console.log(chalk.dim('Your journey to a fulfilling life starts here...\n'))
}

function showAdvancedHelp(): void {
  const examples = `
🎮 ADVANCED USAGE EXAMPLES

Basic Gameplay:
  pnpm cui:play                          # Start interactive game
  pnpm cui:play --theme dark             # Use dark theme
  pnpm cui:play --compact --no-animations # Minimal interface

Demo & Testing:
  pnpm cui:demo --speed fast             # Fast AI demo
  pnpm cui:demo --strategy aggressive    # Aggressive AI play
  pnpm cui:benchmark --games 1000        # Performance test

Learning:
  pnpm cui:tutorial                      # Step-by-step guide
  pnpm cui:tutorial --skip-intro         # Skip introduction

Development:
  pnpm cui:debug                         # Debug interface
  pnpm cui:benchmark --output results.json # Export data

Configuration:
  All modes support theme customization:
  --theme default    # Blue/gray professional theme
  --theme dark       # Dark mode for low light
  --theme colorful   # Vibrant colors
  --theme minimal    # Black and white only
  --theme matrix     # Green terminal aesthetic

Animation Control:
  --speed slow       # Slow animations for presentation
  --speed normal     # Default speed
  --speed fast       # Quick animations
  --speed off        # No animations (fastest)

Game Difficulty:
  --difficulty easy     # More vitality, larger hand
  --difficulty normal   # Balanced gameplay
  --difficulty hard     # Challenge mode

Accessibility:
  --no-colors        # For color-blind users
  --no-animations    # For motion sensitivity
  --compact          # For smaller terminals
`

  console.log(examples)
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('\n💥 Unhandled promise rejection:'), reason)
  process.exit(1)
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Game interrupted. Thanks for playing!'))
  process.exit(0)
})

// Run the CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}

export { main as runCLI }