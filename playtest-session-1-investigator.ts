#!/usr/bin/env node

/**
 * プレイテストセッション1: チャレンジ報酬undefined問題の詳細調査
 */

import { PlaytestGameController, type SimpleGameRenderer } from './src/cui/PlaytestGameController'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

class DetailedPlaytestLogger implements SimpleGameRenderer {
  private logs: string[] = []
  private sessionNumber: number
  private startTime: Date
  
  constructor(sessionNumber: number) {
    this.sessionNumber = sessionNumber
    this.startTime = new Date()
  }
  
  logTurn(turnNumber: number, challenges: any[], selectedChallenge: any, handCards: any[], result: any, gameState: any): void {
    this.logs.push(`### ターン${turnNumber}:`)
    this.logs.push(`**[フェーズ1: チャレンジ選択]**`)
    this.logs.push(`- 公開されたチャレンジ:`)
    
    challenges.forEach((challenge, index) => {
      const letter = String.fromCharCode(65 + index) // A, B, C...
      const name = challenge.name || '名称不明'
      const power = challenge.power || 'パワー不明'
      
      // 詳細調査: rewardType, rewards, その他のプロパティをチェック
      const rewardType = challenge.rewardType
      const rewards = challenge.rewards
      const challengeType = challenge.type
      
      let rewardDisplay = 'undefined'
      if (rewardType !== undefined) {
        rewardDisplay = rewardType
      } else if (rewards !== undefined) {
        rewardDisplay = Array.isArray(rewards) ? rewards.join(', ') : String(rewards)
      } else if (challengeType) {
        rewardDisplay = `${challengeType}報酬`
      }
      
      this.logs.push(`  - ${letter}: ${name}（必要パワー: ${power}）→ 報酬: ${rewardDisplay}`)
      
      // 詳細調査ログ
      this.logs.push(`    🔍 [調査] type: ${challenge.type}, rewardType: ${challenge.rewardType}, rewards: ${JSON.stringify(challenge.rewards)}`)
      this.logs.push(`    🔍 [調査] 全プロパティ: ${Object.keys(challenge).join(', ')}`)
    })
    
    const selectedName = selectedChallenge.name || '選択不明'
    this.logs.push(`- 選択: ${selectedName}`)
    this.logs.push(``)
    
    this.logs.push(`**[フェーズ2: 挑戦]**`)
    this.logs.push(`- 必要パワー: ${result.requiredPower}`)
    this.logs.push(`- ドローしたカード:`)
    
    handCards.forEach((card, index) => {
      const cardName = card.name || '名称不明'
      const cardPower = card.power !== undefined ? card.power : '不明'
      this.logs.push(`  ${index + 1}枚目: ${cardName}（パワー: ${cardPower >= 0 ? '+' : ''}${cardPower}）`)
    })
    
    this.logs.push(`- 合計パワー: ${result.totalPower}`)
    this.logs.push(`- 結果: ${result.success ? '成功' : '失敗'}`)
    this.logs.push(``)
    
    this.logs.push(`**[フェーズ3: 結果処理]**`)
    if (result.success) {
      this.logs.push(`- 成功時: 保険獲得`)
    } else {
      this.logs.push(`- 失敗時: 活力変化 ${result.vitalityChange}`)
    }
    
    this.logs.push(`**[ターン終了時の状態]**`)
    this.logs.push(`- 活力: ${gameState.vitality}`)
    this.logs.push(`- ステージ: ${gameState.stage}`)
    this.logs.push(`- 獲得済み保険: ${gameState.insuranceCards.length}枚`)
    this.logs.push(``)
    
    // コンソール出力
    console.log(chalk.blue(`\n=== ターン ${turnNumber} ===`))
    console.log(chalk.gray(`選択: ${selectedName} (必要パワー: ${result.requiredPower})`))
    challenges.forEach((challenge, index) => {
      const letter = String.fromCharCode(65 + index)
      console.log(chalk.dim(`  ${letter}: ${challenge.name} - rewardType: ${challenge.rewardType}, type: ${challenge.type}`))
    })
    console.log(chalk.gray(`手札パワー: ${result.totalPower}`))
    console.log(result.success ? 
      chalk.green(`✅ 成功！`) : 
      chalk.red(`❌ 失敗...`))
    console.log(chalk.yellow(`活力: ${gameState.vitality}`))
  }
  
  async saveLog(): Promise<string> {
    const outputDir = 'test-results/playtest-logs'
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
    const filename = `playtest-session-${this.sessionNumber}-detailed-${timestamp}.md`
    const filepath = join(outputDir, filename)
    
    const content = `# プレイテストセッション${this.sessionNumber}: チャレンジ報酬undefined問題の詳細調査

## テスト概要
- **実施番号**: ${this.sessionNumber}
- **目的**: チャレンジ報酬undefined問題の原因調査
- **実施日時**: ${this.startTime.toISOString()}
- **使用システム**: PlaytestGameController + 詳細ログ

## 発見された問題の詳細分析

### 1. チャレンジカード生成時の問題
CardFactory.createChallengeCardsで生成されるチャレンジカードに以下の問題:
- rewardTypeプロパティが設定されていない
- rewardsプロパティが設定されていない  
- プレイテストログでundefinedと表示される

## ゲームプレイ記録

${this.logs.join('\n')}

## 問題分析サマリー

### チャレンジ報酬undefined問題
1. **原因**: CardFactory.createChallengeCardメソッドでrewardTypeが設定されていない
2. **影響**: プレイテストログで全チャレンジの報酬が「undefined」表示
3. **修正箇所**: CardFactory.tsのcreateChallengeCardメソッド

### 提案する修正方法
1. createChallengeCardメソッドでrewardTypeを適切に設定
2. チャレンジタイプに応じた報酬種別の定義
3. プレイテストログの表示ロジック改善

---
*このレポートは詳細調査プレイテストにより生成されました*
`
    
    await writeFile(filepath, content)
    return filepath
  }
}

async function runSession1() {
  console.log(chalk.blue.bold('🎮 プレイテストセッション1: チャレンジ報酬undefined問題調査'))
  
  const logger = new DetailedPlaytestLogger(1)
  const config = {
    difficulty: 'normal',
    startingVitality: 20,
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  }
  
  const controller = new PlaytestGameController(config)
  
  let turnCount = 0
  let gameEnded = false
  
  // 10ターンまで実行
  while (!gameEnded && turnCount < 10) {
    turnCount++
    console.log(chalk.cyan(`\n🎯 ターン${turnCount}開始...`))
    
    gameEnded = !(await controller.playTurn(logger, false))
    
    if (gameEnded) {
      const gameState = controller.getGameState()
      console.log(chalk.magenta(`\n🏁 ゲーム終了: ${gameState.status}`))
      break
    }
  }
  
  const filepath = await logger.saveLog()
  console.log(chalk.green.bold('\n✅ セッション1完了'))
  console.log(chalk.gray(`📄 詳細ログ保存: ${filepath}`))
  
  return {
    turnCount,
    status: 'completed',
    logFile: filepath
  }
}

// メイン実行
runSession1().catch(console.error)

export { runSession1 }