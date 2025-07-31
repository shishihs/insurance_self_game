#!/usr/bin/env node

/**
 * CUI Playtest Runner
 * 包括的なプレイテストを実行し、詳細なログを生成
 */

import chalk from 'chalk'
import { PlaytestGameController, SimpleGameRenderer } from './PlaytestGameController'
import { writeFileSync } from 'fs'
import { join } from 'path'

// プレイテスト戦略の定義
enum PlaytestStrategy {
  Conservative = 'conservative',
  Aggressive = 'aggressive',
  Balanced = 'balanced'
}

// プレイテストセッションのログ
interface PlaytestSession {
  sessionId: number
  strategy: PlaytestStrategy
  startTime: Date
  endTime?: Date
  turns: TurnLog[]
  finalState: GameState
  statistics: SessionStatistics
  observations: string[]
}

interface TurnLog {
  turnNumber: number
  challenges: any[]
  selectedChallenge: any
  handCards: any[]
  result: any
  gameState: GameState
  decision: string
  timestamp: Date
}

interface GameState {
  vitality: number
  stage: string
  insuranceCards: any[]
  status: string
}

interface SessionStatistics {
  totalTurns: number
  successfulChallenges: number
  failedChallenges: number
  averageVitality: number
  insuranceCount: number
  stagesReached: string[]
  finalOutcome: string
}

class PlaytestRenderer implements SimpleGameRenderer {
  private session: PlaytestSession
  private startTime: Date

  constructor(sessionId: number, strategy: PlaytestStrategy) {
    this.startTime = new Date()
    this.session = {
      sessionId,
      strategy,
      startTime: this.startTime,
      turns: [],
      finalState: { vitality: 0, stage: '', insuranceCards: [], status: '' },
      statistics: {
        totalTurns: 0,
        successfulChallenges: 0,
        failedChallenges: 0,
        averageVitality: 0,
        insuranceCount: 0,
        stagesReached: [],
        finalOutcome: ''
      },
      observations: []
    }
  }

  logTurn(
    turnNumber: number,
    challenges: any[],
    selectedChallenge: any,
    handCards: any[],
    result: any,
    gameState: any
  ): void {
    const turnLog: TurnLog = {
      turnNumber,
      challenges,
      selectedChallenge,
      handCards,
      result,
      gameState: {
        vitality: gameState.vitality,
        stage: gameState.stage,
        insuranceCards: gameState.insuranceCards,
        status: gameState.status || 'in_progress'
      },
      decision: this.analyzeDecision(selectedChallenge, challenges, gameState),
      timestamp: new Date()
    }

    this.session.turns.push(turnLog)
    this.updateStatistics(result, gameState)
    this.logTurnToConsole(turnLog)
  }

  private analyzeDecision(selected: any, available: any[], state: any): string {
    const requiredPowers = available.map(c => c.power || 2)
    const selectedPower = selected.power || 2
    const easiest = Math.min(...requiredPowers)
    
    if (selectedPower === easiest) {
      return 'Conservative: chose easiest challenge'
    } else if (selectedPower === Math.max(...requiredPowers)) {
      return 'Aggressive: chose hardest challenge'
    } else {
      return 'Balanced: chose moderate challenge'
    }
  }

  private updateStatistics(result: any, gameState: any): void {
    const stats = this.session.statistics
    stats.totalTurns++
    
    if (result.success) {
      stats.successfulChallenges++
    } else {
      stats.failedChallenges++
    }
    
    // ステージ追跡
    if (!stats.stagesReached.includes(gameState.stage)) {
      stats.stagesReached.push(gameState.stage)
    }
    
    stats.insuranceCount = gameState.insuranceCards.length
  }

  private logTurnToConsole(turn: TurnLog): void {
    console.log(chalk.cyan(`\n=== Turn ${turn.turnNumber} ===`))
    console.log(`Stage: ${turn.gameState.stage}, Vitality: ${turn.gameState.vitality}`)
    console.log(`Challenge: ${turn.selectedChallenge.name} (Power: ${turn.selectedChallenge.power || 2})`)
    console.log(`Result: ${turn.result.success ? chalk.green('SUCCESS') : chalk.red('FAILED')}`)
    console.log(`Decision: ${turn.decision}`)
  }

  finalize(controller: PlaytestGameController): PlaytestSession {
    this.session.endTime = new Date()
    const gameState = controller.getGameState()
    
    this.session.finalState = {
      vitality: gameState.vitality,
      stage: gameState.stage,
      insuranceCards: gameState.insuranceCards,
      status: gameState.status
    }

    // 最終統計の計算
    const stats = this.session.statistics
    const totalVitality = this.session.turns.reduce((sum, turn) => sum + turn.gameState.vitality, 0)
    stats.averageVitality = totalVitality / Math.max(stats.totalTurns, 1)
    
    // 最終結果の判定
    if (gameState.status === 'victory') {
      stats.finalOutcome = 'Victory: Reached fulfillment stage'
    } else if (gameState.status === 'game_over') {
      stats.finalOutcome = `Game Over: Vitality depleted at ${gameState.stage} stage`
    } else {
      stats.finalOutcome = 'Incomplete: Session ended prematurely'
    }

    // 観察事項の生成
    this.generateObservations()

    return this.session
  }

  private generateObservations(): void {
    const obs = this.session.observations
    const stats = this.session.statistics

    // 成功率の分析
    const successRate = stats.successfulChallenges / Math.max(stats.totalTurns, 1)
    if (successRate < 0.5) {
      obs.push(`Low success rate (${(successRate * 100).toFixed(1)}%) - difficulty may be too high`)
    } else if (successRate > 0.8) {
      obs.push(`High success rate (${(successRate * 100).toFixed(1)}%) - difficulty may be too low`)
    }

    // 保険戦略の分析
    if (stats.insuranceCount > 10) {
      obs.push('Heavy insurance strategy detected - may impact power calculations')
    } else if (stats.insuranceCount < 3) {
      obs.push('Minimal insurance usage - high risk strategy')
    }

    // ステージ進行の分析
    if (stats.stagesReached.length === 1) {
      obs.push('Failed to progress beyond initial stage')
    } else if (stats.stagesReached.includes('fulfillment')) {
      obs.push('Successfully reached fulfillment stage - optimal progression')
    }
  }
}

async function runPlaytestSession(
  sessionId: number,
  strategy: PlaytestStrategy
): Promise<PlaytestSession> {
  console.log(chalk.bold.blue(`\n🎮 Starting Playtest Session ${sessionId}`))
  console.log(chalk.gray(`Strategy: ${strategy}`))
  console.log(chalk.gray('═'.repeat(50)))

  const renderer = new PlaytestRenderer(sessionId, strategy)
  const controller = new PlaytestGameController()

  // ゲームループ
  let turnCount = 0
  const maxTurns = 30 // 安全のための上限

  while (turnCount < maxTurns) {
    const canContinue = await controller.playTurn(renderer, false)
    turnCount++

    if (!canContinue) {
      break
    }

    // 短い遅延（視覚的な確認のため）
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // セッション終了
  const session = renderer.finalize(controller)
  
  console.log(chalk.bold.green(`\n✅ Session ${sessionId} Complete`))
  console.log(`Final Outcome: ${session.statistics.finalOutcome}`)
  console.log(`Total Turns: ${session.statistics.totalTurns}`)
  console.log(`Success Rate: ${((session.statistics.successfulChallenges / session.statistics.totalTurns) * 100).toFixed(1)}%`)

  return session
}

async function main() {
  console.log(chalk.bold.magenta('🎮 CUI Game Comprehensive Playtest'))
  console.log(chalk.gray('Testing multiple strategies and scenarios'))
  console.log(chalk.gray('═'.repeat(60)))

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const sessions: PlaytestSession[] = []

  // 3つの異なる戦略でプレイテスト
  const strategies = [
    PlaytestStrategy.Conservative,
    PlaytestStrategy.Aggressive,
    PlaytestStrategy.Balanced
  ]

  for (let i = 0; i < strategies.length; i++) {
    const session = await runPlaytestSession(i + 1, strategies[i])
    sessions.push(session)
    
    // セッション間の短い休憩
    if (i < strategies.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // 総合分析レポートの生成
  const report = generateComprehensiveReport(sessions)
  
  // レポートの保存
  const reportPath = join(
    process.cwd(),
    'test-results',
    'playtest-logs',
    `playtest_report_${timestamp}.json`
  )
  
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(chalk.green(`\n📄 Report saved to: ${reportPath}`))

  // サマリーの表示
  displaySummary(report)
}

function generateComprehensiveReport(sessions: PlaytestSession[]): any {
  const report = {
    timestamp: new Date().toISOString(),
    totalSessions: sessions.length,
    sessions: sessions,
    overallAnalysis: {
      averageSuccessRate: 0,
      mostSuccessfulStrategy: '',
      commonFailurePoints: [] as string[],
      balanceIssues: [] as string[],
      recommendations: [] as string[]
    }
  }

  // 全体的な成功率
  const successRates = sessions.map(s => 
    s.statistics.successfulChallenges / Math.max(s.statistics.totalTurns, 1)
  )
  report.overallAnalysis.averageSuccessRate = 
    successRates.reduce((sum, rate) => sum + rate, 0) / sessions.length

  // 最も成功した戦略
  const bestSession = sessions.reduce((best, current) => 
    current.statistics.finalOutcome.includes('Victory') ? current : best
  )
  report.overallAnalysis.mostSuccessfulStrategy = bestSession.strategy

  // 共通の失敗ポイント
  const failureStages = sessions
    .filter(s => s.statistics.finalOutcome.includes('Game Over'))
    .map(s => s.finalState.stage)
  
  if (failureStages.length > 0) {
    report.overallAnalysis.commonFailurePoints.push(
      `Most failures occur at ${failureStages[0]} stage`
    )
  }

  // バランス問題の検出
  if (report.overallAnalysis.averageSuccessRate < 0.3) {
    report.overallAnalysis.balanceIssues.push('Game difficulty is too high')
  } else if (report.overallAnalysis.averageSuccessRate > 0.8) {
    report.overallAnalysis.balanceIssues.push('Game difficulty is too low')
  }

  // 推奨事項
  generateRecommendations(report, sessions)

  return report
}

function generateRecommendations(report: any, sessions: PlaytestSession[]): void {
  const recs = report.overallAnalysis.recommendations

  // 難易度調整
  if (report.overallAnalysis.averageSuccessRate < 0.5) {
    recs.push('Consider reducing challenge power requirements')
    recs.push('Increase positive card power values')
  } else if (report.overallAnalysis.averageSuccessRate > 0.7) {
    recs.push('Consider increasing challenge difficulty')
    recs.push('Add more strategic depth to decisions')
  }

  // 保険システム
  const avgInsurance = sessions.reduce((sum, s) => sum + s.statistics.insuranceCount, 0) / sessions.length
  if (avgInsurance < 5) {
    recs.push('Insurance system may not be attractive enough')
  } else if (avgInsurance > 15) {
    recs.push('Insurance burden calculation may need adjustment')
  }

  // ゲーム長
  const avgTurns = sessions.reduce((sum, s) => sum + s.statistics.totalTurns, 0) / sessions.length
  if (avgTurns < 10) {
    recs.push('Games are ending too quickly - consider adjusting vitality mechanics')
  } else if (avgTurns > 25) {
    recs.push('Games may be too long - consider pacing adjustments')
  }
}

function displaySummary(report: any): void {
  console.log(chalk.bold.yellow('\n📊 Playtest Summary'))
  console.log(chalk.gray('═'.repeat(60)))
  
  console.log(`Total Sessions: ${report.totalSessions}`)
  console.log(`Average Success Rate: ${(report.overallAnalysis.averageSuccessRate * 100).toFixed(1)}%`)
  console.log(`Most Successful Strategy: ${report.overallAnalysis.mostSuccessfulStrategy}`)
  
  if (report.overallAnalysis.balanceIssues.length > 0) {
    console.log(chalk.red('\n⚠️ Balance Issues:'))
    report.overallAnalysis.balanceIssues.forEach((issue: string) => 
      console.log(`  - ${issue}`)
    )
  }
  
  if (report.overallAnalysis.recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Recommendations:'))
    report.overallAnalysis.recommendations.forEach((rec: string) => 
      console.log(`  - ${rec}`)
    )
  }
  
  console.log(chalk.green('\n✨ Playtest Complete!'))
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Unexpected error:'), error)
  process.exit(1)
})

process.on('SIGINT', () => {
  console.log(chalk.yellow('\n👋 Playtest interrupted'))
  process.exit(0)
})

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Playtest error:'), error)
    process.exit(1)
  })
}

export { runPlaytestSession, PlaytestStrategy }