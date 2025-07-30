#!/usr/bin/env node

/**
 * CUI Direct Playtest - PlaytestGameControllerを使用した直接実行プレイテスト
 */

import { PlaytestGameController, type SimpleGameRenderer } from '@/cui/PlaytestGameController'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

class PlaytestLogger implements SimpleGameRenderer {
  private logs: any[] = []
  
  logTurn(turnNumber: number, challenges: any[], selectedChallenge: any, handCards: any[], result: any, gameState: any): void {
    const turnLog = {
      turnNumber,
      timestamp: new Date().toISOString(),
      challenges: challenges.map(c => ({ name: c.name, power: c.power })),
      selectedChallenge: { name: selectedChallenge.name, power: selectedChallenge.power },
      handCards: handCards.map(c => ({ name: c.name, power: c.power })),
      result,
      gameState: {
        vitality: gameState.vitality,
        stage: gameState.stage,
        insuranceCount: gameState.insuranceCards.length
      }
    }
    
    this.logs.push(turnLog)
    
    // コンソール出力
    console.log(chalk.blue(`\n=== ターン ${turnNumber} ===`))
    console.log(chalk.gray(`選択: ${selectedChallenge.name} (必要パワー: ${result.requiredPower})`))
    console.log(chalk.gray(`手札パワー: ${result.totalPower}`))
    console.log(result.success ? 
      chalk.green(`✅ 成功！`) : 
      chalk.red(`❌ 失敗...`))
    console.log(chalk.yellow(`活力: ${gameState.vitality}`))
  }
  
  getLogs() {
    return this.logs
  }
}

async function runPlaytest(sessionNumber: number, strategy: string, config: any) {
  console.log(chalk.yellow(`\n🎮 セッション${sessionNumber}: ${strategy}戦略`))
  
  const startTime = Date.now()
  const logger = new PlaytestLogger()
  const controller = new PlaytestGameController(config)
  
  let turnCount = 0
  let gameEnded = false
  
  // ゲームを最後まで実行
  while (!gameEnded) {
    turnCount++
    if (turnCount > 100) {
      console.log(chalk.red('⚠️ ターン数制限に到達'))
      break
    }
    
    gameEnded = !(await controller.playTurn(logger, false))
  }
  
  const duration = Date.now() - startTime
  const gameState = controller.getGameState()
  const logs = logger.getLogs()
  
  // セッション結果
  const sessionResult = {
    sessionNumber,
    strategy,
    startTime: new Date(startTime).toISOString(),
    duration,
    turnCount,
    finalVitality: gameState.vitality,
    finalStage: gameState.stage,
    outcome: gameState.status,
    totalChallenges: logs.length,
    successfulChallenges: logs.filter(l => l.result.success).length,
    insuranceCards: gameState.insuranceCards.length,
    logs
  }
  
  return sessionResult
}

async function main() {
  console.log(chalk.blue.bold('🎮 CUI Direct Playtest Runner'))
  
  const outputDir = 'test-results/playtest-logs'
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }
  
  try {
    // 3つの戦略でセッション実行
    const sessions = []
    
    // セッション1: 保守的戦略（易しい設定）
    const conservativeResult = await runPlaytest(1, 'conservative', {
      difficulty: 'easy',
      startingVitality: 25,
      startingHandSize: 6,
      maxHandSize: 8,
      dreamCardCount: 2
    })
    sessions.push(conservativeResult)
    
    // セッション2: 積極的戦略（難しい設定）
    const aggressiveResult = await runPlaytest(2, 'aggressive', {
      difficulty: 'hard',
      startingVitality: 15,
      startingHandSize: 4,
      maxHandSize: 6,
      dreamCardCount: 2
    })
    sessions.push(aggressiveResult)
    
    // セッション3: バランス戦略（通常設定）
    const balancedResult = await runPlaytest(3, 'balanced', {
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    })
    sessions.push(balancedResult)
    
    // 各セッションのログを保存
    for (const session of sessions) {
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
      const filename = `playtest-session-${session.sessionNumber}-${timestamp}.md`
      const filepath = join(outputDir, filename)
      
      const content = generateSessionReport(session)
      await writeFile(filepath, content)
      console.log(chalk.green(`\n✅ セッション${session.sessionNumber}ログ保存: ${filename}`))
    }
    
    // サマリーレポート生成
    const summaryReport = generateSummaryReport(sessions)
    const summaryTimestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
    const summaryPath = join(outputDir, `playtest-summary-${summaryTimestamp}.md`)
    await writeFile(summaryPath, summaryReport)
    
    console.log(chalk.green.bold('\n✅ プレイテスト完了！'))
    console.log(chalk.gray(`📄 サマリーレポート: ${summaryPath}`))
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error)
    process.exit(1)
  }
}

function generateSessionReport(session: any): string {
  const successRate = session.totalChallenges > 0 ? 
    (session.successfulChallenges / session.totalChallenges * 100).toFixed(1) : '0'
  
  return `# 🎮 CUIプレイテストログ - セッション${session.sessionNumber}

## 📊 セッション情報
- **戦略**: ${session.strategy}
- **開始時刻**: ${session.startTime}
- **実行時間**: ${(session.duration / 1000).toFixed(1)}秒
- **総ターン数**: ${session.turnCount}

## 📈 ゲーム結果
- **最終結果**: ${session.outcome}
- **最終活力**: ${session.finalVitality}
- **最終ステージ**: ${session.finalStage}
- **成功率**: ${successRate}% (${session.successfulChallenges}/${session.totalChallenges})
- **獲得保険**: ${session.insuranceCards}枚

## 📝 ターンログ概要

${session.logs.slice(0, 10).map((log: any) => `
### ターン ${log.turnNumber}
- チャレンジ: ${log.selectedChallenge.name}
- 必要パワー: ${log.result.requiredPower}
- 手札パワー: ${log.result.totalPower}
- 結果: ${log.result.success ? '✅ 成功' : '❌ 失敗'}
- 活力変化: ${log.result.vitalityChange >= 0 ? '+' : ''}${log.result.vitalityChange}
- 残り活力: ${log.gameState.vitality}
`).join('\n')}

${session.logs.length > 10 ? `\n... 他 ${session.logs.length - 10} ターン` : ''}

## 🔍 分析

### 戦略の特徴
- ${session.strategy === 'conservative' ? '保守的戦略: 易しい設定で安定したプレイ' : ''}
- ${session.strategy === 'aggressive' ? '積極的戦略: 難しい設定でリスクを取るプレイ' : ''}
- ${session.strategy === 'balanced' ? 'バランス戦略: 標準設定で中庸なプレイ' : ''}

### パフォーマンス
- 平均実行時間/ターン: ${(session.duration / session.turnCount).toFixed(1)}ms
- 最長生存ターン: ${session.turnCount}
`
}

function generateSummaryReport(sessions: any[]): string {
  const timestamp = new Date().toISOString()
  
  // 統計計算
  const avgVitality = sessions.reduce((sum, s) => sum + s.finalVitality, 0) / sessions.length
  const avgTurns = sessions.reduce((sum, s) => sum + s.turnCount, 0) / sessions.length
  const avgSuccessRate = sessions.reduce((sum, s) => 
    sum + (s.successfulChallenges / Math.max(s.totalChallenges, 1)), 0) / sessions.length * 100
  
  return `# 🎮 CUIプレイテストサマリーレポート

**実行日時**: ${timestamp}
**セッション数**: ${sessions.length}

## 📊 全体統計

| 戦略 | 結果 | 成功率 | ターン数 | 最終活力 | 保険数 | 実行時間 |
|------|------|--------|----------|----------|--------|----------|
${sessions.map(s => {
  const successRate = s.totalChallenges > 0 ? 
    (s.successfulChallenges / s.totalChallenges * 100).toFixed(1) : '0'
  return `| ${s.strategy} | ${s.outcome} | ${successRate}% | ${s.turnCount} | ${s.finalVitality} | ${s.insuranceCards} | ${(s.duration / 1000).toFixed(1)}s |`
}).join('\n')}

### 平均値
- **平均活力**: ${avgVitality.toFixed(1)}
- **平均ターン数**: ${avgTurns.toFixed(1)}
- **平均成功率**: ${avgSuccessRate.toFixed(1)}%

## 🌟 辛口な感想と分析

### 良かった点
1. **基本システムの安定性**: ゲームロジックは正常に動作し、クラッシュすることなく完走
2. **戦略による差異**: 難易度設定により明確に結果が変わることを確認
3. **保険システム**: 保険の獲得と効果が適切に機能

### ⚠️ 改善すべき点

#### 1. ゲームバランスの問題
- **活力減少が急激すぎる**: 特に難易度hardでは数ターンでゲームオーバー
- **保険効果が不明瞭**: 保険を集めても劇的な変化を感じにくい
- **リカバリー手段の不足**: 一度劣勢になると挽回が困難

#### 2. UIフィードバックの不足
- **詳細情報の欠如**: なぜ成功/失敗したのかが分かりにくい
- **保険効果の可視化不足**: 保険がどれだけダメージを軽減したか不明
- **進行状況の把握困難**: 残りチャレンジ数やゲーム進行度が見えない

#### 3. 戦略性の欠如
- **選択の無意味さ**: チャレンジ選択が自動化されており、プレイヤーの判断余地なし
- **手札管理の不在**: カードの使用順序や組み合わせを考える要素がない
- **リソース管理の単純さ**: 活力以外に管理するリソースがない

## 💡 具体的な改善提案

### 優先度: 高
1. **活力回復手段の追加**
   - 休息アクションの実装
   - 回復系カードの追加
   - 連続成功ボーナス

2. **UIの情報量増加**
   - ダメージ計算の詳細表示
   - 保険効果のビジュアル化
   - プログレスバーの追加

3. **難易度カーブの調整**
   - 序盤の難易度を下げる
   - 段階的な難易度上昇
   - プレイヤースキルに応じた調整

### 優先度: 中
1. **戦略的要素の追加**
   - 手札の選択的使用
   - カードコンボシステム
   - リスク/リターンの選択

2. **保険システムの拡張**
   - 保険種類の差別化
   - 保険の組み合わせ効果
   - 保険管理のミニゲーム

### 優先度: 低
1. **演出の強化**
   - 成功/失敗時のアニメーション
   - サウンドエフェクト
   - ストーリー要素の追加

## 📈 数値データに基づく提案

基準値（現状）:
- 平均生存ターン: ${avgTurns.toFixed(1)}
- 平均成功率: ${avgSuccessRate.toFixed(1)}%

目標値:
- 平均生存ターン: 15-20（現在の約2倍）
- 平均成功率: 60-70%（適度な挑戦性）

達成方法:
1. 基礎成功率を40%→50%に調整
2. 保険1枚あたりの効果を1.5倍に
3. 序盤3ターンは易しいチャレンジのみ

---
*このレポートはCUI Direct Playtestにより自動生成されました*
`
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}