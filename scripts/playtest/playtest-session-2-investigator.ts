#!/usr/bin/env node

/**
 * プレイテストセッション2: 手札枚数ルールと保険効果計算の詳細調査
 */

import { PlaytestGameController, type SimpleGameRenderer } from './src/cui/PlaytestGameController'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

class HandSizeInsuranceLogger implements SimpleGameRenderer {
  private logs: string[] = []
  private sessionNumber: number
  private startTime: Date
  private previousVitality: number = 20
  
  constructor(sessionNumber: number) {
    this.sessionNumber = sessionNumber
    this.startTime = new Date()
  }
  
  logTurn(turnNumber: number, challenges: any[], selectedChallenge: any, handCards: any[], result: any, gameState: any): void {
    this.logs.push(`### ターン${turnNumber}:`)
    this.logs.push(`**[フェーズ1: チャレンジ選択]**`)
    this.logs.push(`- 公開されたチャレンジ:`)
    
    challenges.forEach((challenge, index) => {
      const letter = String.fromCharCode(65 + index)
      const name = challenge.name || '名称不明'
      const power = challenge.power || result.requiredPower || 'パワー不明'
      this.logs.push(`  - ${letter}: ${name}（必要パワー: ${power}）`)
    })
    
    const selectedName = selectedChallenge.name || '選択不明'
    this.logs.push(`- 選択: ${selectedName}`)
    this.logs.push(``)
    
    this.logs.push(`**[フェーズ2: 挑戦]**`)
    this.logs.push(`- 必要パワー: ${result.requiredPower}`)
    
    // 手札枚数の詳細調査
    this.logs.push(`- ドローしたカード数: ${handCards.length}枚 🔍[調査]必要パワー${result.requiredPower}に対してカード${handCards.length}枚ドロー`)
    this.logs.push(`- ドローしたカード:`)
    
    let totalBasePower = 0
    handCards.forEach((card, index) => {
      const cardName = card.name || '名称不明'
      const cardPower = card.power !== undefined ? card.power : 0
      totalBasePower += cardPower
      this.logs.push(`  ${index + 1}枚目: ${cardName}（パワー: ${cardPower >= 0 ? '+' : ''}${cardPower}）`)
    })
    
    this.logs.push(`- ベースパワー合計: ${totalBasePower}`)
    this.logs.push(`- 最終合計パワー: ${result.totalPower}`)
    
    // 保険効果計算の詳細調査
    const insuranceCount = gameState.insuranceCards.length
    if (insuranceCount > 0) {
      this.logs.push(`- 🔍[保険効果詳細] 保険カード数: ${insuranceCount}枚`)
      
      let totalInsuranceBonus = 0
      gameState.insuranceCards.forEach((insurance: any, index: number) => {
        const bonus = insurance.power || 0
        totalInsuranceBonus += bonus
        this.logs.push(`  保険${index + 1}: ${insurance.name} (ボーナス: +${bonus})`)
      })
      
      const burden = Math.floor(insuranceCount / 3)
      this.logs.push(`- 保険ボーナス合計: +${totalInsuranceBonus}`)
      this.logs.push(`- 保険料負担: -${burden} (${insuranceCount}枚÷3=${Math.floor(insuranceCount/3)})`)
      this.logs.push(`- パワー計算: ${totalBasePower} + ${totalInsuranceBonus} - ${burden} = ${result.totalPower}`)
    }
    
    this.logs.push(`- 結果: ${result.success ? '成功' : '失敗'}`)
    this.logs.push(``)
    
    this.logs.push(`**[フェーズ3: 結果処理]**`)
    const vitalityChange = result.vitalityChange || 0
    const actualVitalityChange = gameState.vitality - this.previousVitality
    
    if (result.success) {
      this.logs.push(`- 成功時: 保険獲得`)
      if (vitalityChange > 0) {
        this.logs.push(`- 活力回復: +${vitalityChange}`)
      }
    } else {
      this.logs.push(`- 失敗時: 活力変化 ${vitalityChange}`)
      
      // 保険効果による軽減の詳細調査
      if (insuranceCount > 0) {
        const baseDamage = result.requiredPower - result.totalPower
        this.logs.push(`- 🔍[保険効果] 基本ダメージ: ${baseDamage}`)
        this.logs.push(`- 🔍[保険効果] 計算上の活力変化: ${vitalityChange}`)
        this.logs.push(`- 🔍[保険効果] 実際の活力変化: ${actualVitalityChange}`)
        
        if (Math.abs(vitalityChange - actualVitalityChange) > 0.1) {
          this.logs.push(`- ⚠️[不整合] 計算値と実際値が一致しません！`)
        }
      }
    }
    
    this.logs.push(`**[ターン終了時の状態]**`)
    this.logs.push(`- 活力: ${this.previousVitality} → ${gameState.vitality} (変化: ${actualVitalityChange})`)
    this.logs.push(`- ステージ: ${gameState.stage}`)
    this.logs.push(`- 獲得済み保険: ${gameState.insuranceCards.length}枚`)
    this.logs.push(``)
    
    this.previousVitality = gameState.vitality
    
    // コンソール出力
    console.log(chalk.blue(`\n=== ターン ${turnNumber} ===`))
    console.log(chalk.gray(`選択: ${selectedName} (必要パワー: ${result.requiredPower})`))
    console.log(chalk.cyan(`手札: ${handCards.length}枚 (必要パワー分: ${result.requiredPower})`))
    console.log(chalk.gray(`手札パワー: ${result.totalPower} (ベース: ${totalBasePower})`))
    console.log(result.success ? 
      chalk.green(`✅ 成功！`) : 
      chalk.red(`❌ 失敗...`))
    console.log(chalk.yellow(`活力: ${this.previousVitality} (変化: ${actualVitalityChange})`))
  }
  
  async saveLog(): Promise<string> {
    const outputDir = 'test-results/playtest-logs'
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
    const filename = `playtest-session-${this.sessionNumber}-handsize-insurance-${timestamp}.md`
    const filepath = join(outputDir, filename)
    
    const content = `# プレイテストセッション${this.sessionNumber}: 手札枚数ルールと保険効果計算の詳細調査

## テスト概要
- **実施番号**: ${this.sessionNumber}
- **目的**: 手札枚数ルールと保険効果計算問題の原因調査
- **実施日時**: ${this.startTime.toISOString()}
- **使用システム**: PlaytestGameController + 手札・保険詳細ログ

## 発見された問題の詳細分析

### 1. 手札枚数の問題
PlaytestGameController.drawHandCardsで以下の問題:
- 必要パワー分だけカードをドロー（例: 必要パワー3なら3枚）
- これはGAME_DESIGN.mdのルールと異なる可能性
- 実際のルールでは固定枚数ドローのはず

### 2. 保険効果計算の問題
保険による活力変化軽減で以下の問題:
- 計算上の活力変化と実際の変化に乖離
- Game.tsのupdateVitalityメソッドと計算ロジックの不整合

## ゲームプレイ記録

${this.logs.join('\n')}

## 問題分析サマリー

### 手札枚数ルール問題
1. **現状**: drawHandCardsで必要パワー分カードをドロー
2. **問題**: ゲームルールとの乖離（要確認）
3. **影響**: ゲームバランスに大きな影響

### 保険効果計算問題
1. **現状**: calculateVitalityChangeとGame.updateVitalityに不整合
2. **問題**: 保険効果が正しく反映されない
3. **影響**: 保険の価値が不明確

### 提案する修正方法
1. GAME_DESIGN.mdとの手札ルール整合性確認
2. 保険効果計算ロジックの統一
3. テストケースの追加による検証

---
*このレポートは手札・保険詳細調査プレイテストにより生成されました*
`
    
    await writeFile(filepath, content)
    return filepath
  }
}

async function runSession2() {
  console.log(chalk.blue.bold('🎮 プレイテストセッション2: 手札枚数・保険効果調査'))
  
  const logger = new HandSizeInsuranceLogger(2)
  const config = {
    difficulty: 'hard', // 難易度を上げて失敗を誘発
    startingVitality: 15, // 開始活力を下げて保険効果を確認しやすく
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  }
  
  const controller = new PlaytestGameController(config)
  
  let turnCount = 0
  let gameEnded = false
  
  // 15ターンまで実行（より多くの保険効果を観察）
  while (!gameEnded && turnCount < 15) {
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
  console.log(chalk.green.bold('\n✅ セッション2完了'))
  console.log(chalk.gray(`📄 詳細ログ保存: ${filepath}`))
  
  return {
    turnCount,
    status: 'completed',
    logFile: filepath
  }
}

// メイン実行
runSession2().catch(console.error)

export { runSession2 }