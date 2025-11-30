#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { MassiveBenchmark } from '@/benchmark/MassiveBenchmark'
import { GameConstantsAccessor } from '@/domain/constants/GameConstants'
import type { BalanceConfig } from '@/domain/types/game.types'

const program = new Command()

program
    .name('difficulty-cli')
    .description('CLI for adjusting and verifying game difficulty')
    .version('1.0.0')

program
    .command('simulate')
    .description('Run game simulations with custom parameters')
    .requiredOption('-c, --config <path>', 'Path to balance config JSON file')
    .option('-g, --games <count>', 'Number of games to simulate', '1000')
    .option('-o, --output <path>', 'Path to save results JSON')
    .action(async (options) => {
        try {
            console.log(chalk.cyan('🎮 Starting Difficulty Simulation...'))

            // Load config
            const configPath = options.config
            const configContent = await readFile(configPath, 'utf-8')
            const balanceConfig: BalanceConfig = JSON.parse(configContent)

            console.log(chalk.blue(`📝 Loaded configuration from ${configPath}`))

            // Apply overrides
            GameConstantsAccessor.setOverrides(balanceConfig)

            // Run benchmark
            const gameCount = parseInt(options.games, 10)
            console.log(chalk.yellow(`🚀 Running ${gameCount} simulations...`))

            const benchmark = new MassiveBenchmark({
                totalGames: gameCount,
                workerThreads: 0, // Use single-threaded mode
                enablePerformanceMonitoring: false,
                showProgress: true
            })

            const results = await benchmark.execute()

            // Clear overrides
            GameConstantsAccessor.clearOverrides()

            // Analyze results
            const winRate = results.statistics.outcomes.victoryRate
            const avgTurns = results.statistics.outcomes.averageTurns

            console.log(chalk.green('\n✅ Simulation Complete!'))
            console.log(chalk.white('📊 Results:'))
            console.log(`  Win Rate: ${winRate.toFixed(1)}%`)
            console.log(`  Avg Turns: ${avgTurns.toFixed(1)}`)
            console.log(`  Avg Score: ${results.statistics.outcomes.averageScore.toFixed(0)}`)

            // Save results if requested
            if (options.output) {
                await writeFile(options.output, JSON.stringify(results, null, 2))
                console.log(chalk.blue(`💾 Results saved to ${options.output}`))
            }

        } catch (error) {
            console.error(chalk.red('❌ Error running simulation:'), error)
            process.exit(1)
        }
    })

program.parse()
