#!/usr/bin/env node

/**
 * プレイテストセッション3: ステージ進行と活力変化の詳細調査
 */

import { PlaytestGameController, type SimpleGameRenderer } from './src/cui/PlaytestGameController'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

class StageVitalityLogger implements SimpleGameRenderer {
  private logs: string[] = []
  private sessionNumber: number
  private startTime: Date
  private previousVitality: number = 20
  private previousStage: string = 'youth'
  private turnCounter: number = 0
  
  constructor(sessionNumber: number) {
    this.sessionNumber = sessionNumber
    this.startTime = new Date()
  }
  
  logTurn(turnNumber: number, challenges: any[], selectedChallenge: any, handCards: any[], result: any, gameState: any): void {
    this.turnCounter++
    
    this.logs.push(`### ターン${turnNumber}:`)
    
    // ステージ変化の検出
    if (gameState.stage !== this.previousStage) {
      this.logs.push(`🚀 **[重要] ステージ変化検出: ${this.previousStage} → ${gameState.stage} (ターン${turnNumber}で変化)**`)
      this.logs.push(`🔍 [調査] ステージ変化の条件とタイミングを記録`)
    }
    
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
    this.logs.push(`- ドローしたカード:`)
    
    let totalBasePower = 0
    handCards.forEach((card, index) => {
      const cardName = card.name || '名称不明'
      const cardPower = card.power !== undefined ? card.power : 0
      totalBasePower += cardPower
      this.logs.push(`  ${index + 1}枚目: ${cardName}（パワー: ${cardPower >= 0 ? '+' : ''}${cardPower}）`)
    })
    
    this.logs.push(`- 合計パワー: ${result.totalPower}`)
    this.logs.push(`- 結果: ${result.success ? '成功' : '失敗'}`)
    this.logs.push(``)
    
    this.logs.push(`**[フェーズ3: 結果処理]**`)
    
    // 活力変化の詳細調査
    const calculatedVitalityChange = result.vitalityChange || 0
    const actualVitalityChange = gameState.vitality - this.previousVitality
    
    if (result.success) {
      this.logs.push(`- 成功時: 保険獲得`)
      if (calculatedVitalityChange > 0) {
        this.logs.push(`- 活力回復: +${calculatedVitalityChange}`)
      }
    } else {
      this.logs.push(`- 失敗時: 活力変化 ${calculatedVitalityChange}`)
      
      // 保険効果の詳細表示
      const insuranceCount = gameState.insuranceCards.length
      if (insuranceCount > 0) {
        const baseDamage = result.requiredPower - result.totalPower
        
        this.logs.push(`- 🔍[保険効果詳細]`)
        this.logs.push(`  基本ダメージ: ${baseDamage}ポイント`)
        this.logs.push(`  保険数: ${insuranceCount}枚`)
        
        let totalCoverage = 0
        gameState.insuranceCards.forEach((insurance: any, index: number) => {
          const coverage = insurance.coverage || 0
          totalCoverage += coverage
          this.logs.push(`  保険${index + 1}: ${insurance.name} (保障: ${coverage})`)
        })
        
        this.logs.push(`  保険保障合計: ${totalCoverage}ポイント`)
        this.logs.push(`  計算上軽減: ${calculatedVitalityChange} (${baseDamage} → ${Math.abs(calculatedVitalityChange)})`)
        this.logs.push(`  実際の変化: ${actualVitalityChange}`)
        
        if (Math.abs(calculatedVitalityChange) !== Math.abs(actualVitalityChange)) {
          this.logs.push(`  ⚠️[不整合] 計算値${calculatedVitalityChange}と実際値${actualVitalityChange}が一致しません`)
        }
      } else {
        this.logs.push(`- 保険なし: 基本ダメージ ${Math.abs(calculatedVitalityChange)}`)
      }
    }
    
    this.logs.push(`**[ターン終了時の状態]**`)
    this.logs.push(`- 活力: ${this.previousVitality} → ${gameState.vitality} (変化: ${actualVitalityChange})`)
    this.logs.push(`- ステージ: ${this.previousStage} → ${gameState.stage}`)
    this.logs.push(`- 獲得済み保険: ${gameState.insuranceCards.length}枚`)
    
    // ステージ進行条件の推測
    if (gameState.stage !== this.previousStage) {
      this.logs.push(`- 🔍[ステージ進行分析]`)
      this.logs.push(`  進行タイミング: ターン${turnNumber}`)
      this.logs.push(`  進行時活力: ${gameState.vitality}`)
      this.logs.push(`  進行時保険数: ${gameState.insuranceCards.length}`)
      this.logs.push(`  前回からの経過ターン数: ${turnNumber}`)
      
      // GameStageManagerの条件を推測
      if (this.previousStage === 'youth' && gameState.stage === 'middle') {
        this.logs.push(`  推測: youth→middle は特定ターン数または条件で発生`)
      } else if (this.previousStage === 'middle' && gameState.stage === 'fulfillment') {
        this.logs.push(`  推測: middle→fulfillment は別の条件で発生`)
      }
    }
    
    this.logs.push(``)
    
    // 状態更新
    this.previousVitality = gameState.vitality
    this.previousStage = gameState.stage
    
    // コンソール出力
    console.log(chalk.blue(`\n=== ターン ${turnNumber} ===`))
    if (gameState.stage !== this.previousStage) {
      console.log(chalk.magenta(`🚀 ステージ変化: ${this.previousStage} → ${gameState.stage}`))
    }
    console.log(chalk.gray(`選択: ${selectedName} (必要パワー: ${result.requiredPower})`))
    console.log(chalk.gray(`手札パワー: ${result.totalPower}`))
    console.log(result.success ? 
      chalk.green(`✅ 成功！`) : 
      chalk.red(`❌ 失敗...`))
    console.log(chalk.yellow(`活力: ${this.previousVitality} → ${gameState.vitality} (${actualVitalityChange})`))
    console.log(chalk.cyan(`ステージ: ${gameState.stage}`))
  }
  
  async saveLog(): Promise<string> {
    const outputDir = 'test-results/playtest-logs'
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true })
    }
    
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
    const filename = `playtest-session-${this.sessionNumber}-stage-vitality-${timestamp}.md`
    const filepath = join(outputDir, filename)
    
    const content = `# プレイテストセッション${this.sessionNumber}: ステージ進行と活力変化の詳細調査

## テスト概要
- **実施番号**: ${this.sessionNumber}
- **目的**: ステージ進行と活力変化問題の原因調査
- **実施日時**: ${this.startTime.toISOString()}
- **使用システム**: PlaytestGameController + ステージ・活力詳細ログ

## 発見された問題の詳細分析

### 1. ステージ進行の不明確さ
GameStageManagerで以下の問題:
- ステージ変化のタイミングが突然発生
- 変化条件が不明確（ターン数ベース？条件ベース？）
- プレイヤーに事前通知なし

### 2. 活力変化の不整合
Game.tsで以下の問題:
- calculateVitalityChangeの計算結果と実際の活力変化に乖離
- 保険効果計算が正しく反映されない
- updateVitalityメソッドの挙動が予想と異なる

## ゲームプレイ記録

${this.logs.join('\n')}

## 問題分析サマリー

### ステージ進行問題
1. **現状**: 予期しないタイミングでステージが変化
2. **問題**: プレイヤーに変化理由が不明
3. **影響**: ゲーム進行の予測可能性が低下

### 活力変化不整合問題
1. **現状**: 計算ロジックと実装に乖離
2. **問題**: 保険効果が期待通りに動作しない
3. **影響**: ゲームバランスが崩れる

### 提案する修正方法
1. GameStageManagerの進行条件明確化
2. ステージ変化の事前通知システム
3. 活力変化計算ロジックの統一
4. 保険効果計算の修正
5. デバッグログの充実

---
*このレポートはステージ・活力詳細調査プレイテストにより生成されました*
`
    
    await writeFile(filepath, content)
    return filepath
  }
}

async function runSession3() {
  console.log(chalk.blue.bold('🎮 プレイテストセッション3: ステージ進行・活力変化調査'))
  
  const logger = new StageVitalityLogger(3)
  const config = {
    difficulty: 'normal',
    startingVitality: 18, // 中程度の開始活力
    startingHandSize: 5,
    maxHandSize: 7,
    dreamCardCount: 2
  }
  
  const controller = new PlaytestGameController(config)
  
  let turnCount = 0
  let gameEnded = false
  
  // 20ターンまで実行（ステージ変化を十分に観察）
  while (!gameEnded && turnCount < 20) {
    turnCount++
    console.log(chalk.cyan(`\n🎯 ターン${turnCount}開始...`))
    
    gameEnded = !(await controller.playTurn(logger, false))
    
    if (gameEnded) {
      const gameState = controller.getGameState()
      console.log(chalk.magenta(`\n🏁 ゲーム終了: ${gameState.status}`))
      console.log(chalk.gray(`最終ステージ: ${gameState.stage}`))
      console.log(chalk.gray(`最終活力: ${gameState.vitality}`))
      break
    }
  }
  
  const filepath = await logger.saveLog()
  console.log(chalk.green.bold('\n✅ セッション3完了'))
  console.log(chalk.gray(`📄 詳細ログ保存: ${filepath}`))
  
  return {
    turnCount,
    status: 'completed',
    logFile: filepath
  }
}

// メイン実行
runSession3().catch(console.error)

export { runSession3 }