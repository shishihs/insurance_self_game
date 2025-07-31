#!/usr/bin/env node

/**
 * Quick Playtest Script
 * PlaytestGameControllerの動作確認
 */

import chalk from 'chalk'
import { PlaytestGameController, SimpleGameRenderer } from './PlaytestGameController'
import { writeFileSync } from 'fs'
import { join } from 'path'

// シンプルなレンダラー実装
class QuickRenderer implements SimpleGameRenderer {
  private logs: any[] = []
  
  logTurn(
    turnNumber: number,
    challenges: any[],
    selectedChallenge: any,
    handCards: any[],
    result: any,
    gameState: any
  ): void {
    const log = {
      turnNumber,
      selectedChallenge: selectedChallenge.name,
      selectedPower: selectedChallenge.power || 2,
      result: result.success ? 'SUCCESS' : 'FAILED',
      vitalityChange: result.vitalityChange,
      currentVitality: gameState.vitality,
      stage: gameState.stage,
      insuranceCount: gameState.insuranceCards.length
    }
    
    this.logs.push(log)
    
    console.log(chalk.cyan(`\nTurn ${turnNumber}:`))
    console.log(`  Challenge: ${log.selectedChallenge} (Power: ${log.selectedPower})`)
    console.log(`  Result: ${result.success ? chalk.green('SUCCESS') : chalk.red('FAILED')}`)
    console.log(`  Vitality: ${gameState.vitality} (${result.vitalityChange >= 0 ? '+' : ''}${result.vitalityChange})`)
    console.log(`  Stage: ${gameState.stage}, Insurance: ${gameState.insuranceCards.length}`)
  }
  
  getLogs(): any[] {
    return this.logs
  }
}

async function runQuickTest() {
  console.log(chalk.bold.blue('🎮 Quick Playtest'))
  console.log(chalk.gray('Testing PlaytestGameController functionality'))
  console.log(chalk.gray('═'.repeat(50)))
  
  try {
    const renderer = new QuickRenderer()
    const controller = new PlaytestGameController()
    
    console.log(chalk.green('✅ Controller initialized'))
    
    // 最大10ターンまでプレイ
    let turnCount = 0
    const maxTurns = 10
    
    while (turnCount < maxTurns) {
      console.log(chalk.gray(`\nProcessing turn ${turnCount + 1}...`))
      
      const canContinue = await controller.playTurn(renderer, false)
      turnCount++
      
      if (!canContinue) {
        console.log(chalk.yellow('\nGame ended'))
        break
      }
    }
    
    // 結果サマリー
    const gameState = controller.getGameState()
    console.log(chalk.bold.green('\n📊 Game Summary:'))
    console.log(`  Final Status: ${gameState.status}`)
    console.log(`  Final Vitality: ${gameState.vitality}`)
    console.log(`  Final Stage: ${gameState.stage}`)
    console.log(`  Total Turns: ${turnCount}`)
    console.log(`  Insurance Cards: ${gameState.insuranceCards.length}`)
    
    // ログ保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const logPath = join(
      process.cwd(),
      'test-results',
      'playtest-logs',
      `quick_test_${timestamp}.json`
    )
    
    const logData = {
      timestamp: new Date().toISOString(),
      controller: 'PlaytestGameController',
      turns: renderer.getLogs(),
      finalState: {
        status: gameState.status,
        vitality: gameState.vitality,
        stage: gameState.stage,
        insuranceCount: gameState.insuranceCards.length
      }
    }
    
    writeFileSync(logPath, JSON.stringify(logData, null, 2))
    console.log(chalk.green(`\n📄 Log saved to: ${logPath}`))
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error during playtest:'), error)
    console.error(chalk.gray('Stack trace:'), error.stack)
  }
}

// メイン実行
runQuickTest().catch(error => {
  console.error(chalk.red('Fatal error:'), error)
  process.exit(1)
})