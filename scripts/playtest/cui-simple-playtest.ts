#!/usr/bin/env node

/**
 * CUI Simple Playtest - ベンチマークモードを使用したプレイテスト
 */

import { GameControllerFactory } from '@/controllers/GameController'
import { BenchmarkModeRenderer } from '@/cui/modes/BenchmarkMode'
import { DemoModeRenderer, SmartDemoStrategy, AggressiveDemoStrategy, ConservativeDemoStrategy } from '@/cui/modes/DemoMode'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

async function runBenchmarkTest() {
  console.log(chalk.blue.bold('🎮 CUI ベンチマークプレイテスト開始'))
  
  const outputDir = 'test-results/playtest-logs'
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true })
  }
  
  const startTime = Date.now()
  
  try {
    // ベンチマークモードでテスト実行
    console.log(chalk.yellow('\n⚡ ベンチマークモード（3ゲーム）'))
    
    const benchmarkConfig = {
      theme: 'minimal',
      animationSpeed: 'off',
      visualEffects: false
    }
    
    const renderer = new BenchmarkModeRenderer(benchmarkConfig, 3)
    
    const gameConfig = {
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    }
    
    await renderer.initialize()
    
    // 3ゲーム実行
    for (let i = 0; i < 3; i++) {
      const controller = GameControllerFactory.create(gameConfig, renderer)
      await controller.playGame()
    }
    
    renderer.dispose()
    
    const duration = Date.now() - startTime
    
    // レポート作成
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
    const reportPath = join(outputDir, `benchmark-test-${timestamp}.md`)
    
    const report = `# 🎮 CUIベンチマークプレイテスト結果

**実行日時**: ${new Date().toISOString()}
**実行時間**: ${(duration / 1000).toFixed(1)}秒
**実行ゲーム数**: 3

## 📊 実行結果

### ベンチマークモード
- ✅ 3ゲームが正常に完了
- 実行時間: ${(duration / 1000).toFixed(1)}秒
- 平均実行時間: ${(duration / 3000).toFixed(1)}秒/ゲーム

## 🔍 観察結果

### 良かった点
1. **安定性**: ベンチマークモードは非インタラクティブで安定動作
2. **速度**: アニメーション無効で高速実行
3. **自動化**: 人の介入なしで完全自動実行

### 改善が必要な点
1. **ログ出力**: より詳細なゲーム統計の記録が必要
2. **戦略選択**: ベンチマークモードでも戦略を選択できるように
3. **結果分析**: ゲーム結果の詳細な分析機能が不足

## 💡 推奨事項
1. プレイテスト専用モードの実装
2. 詳細なゲームイベントログの記録
3. 統計情報の自動集計と可視化

---
*このレポートはCUI簡易プレイテストにより生成されました*
`
    
    await writeFile(reportPath, report)
    
    console.log(chalk.green.bold('\n✅ ベンチマークテスト完了'))
    console.log(chalk.gray(`📄 レポート保存: ${reportPath}`))
    
  } catch (error) {
    console.error(chalk.red('❌ エラー:'), error)
    
    const errorReport = `# ❌ CUIプレイテストエラーレポート

**エラー発生時刻**: ${new Date().toISOString()}
**エラー内容**: ${error}

## スタックトレース
\`\`\`
${error instanceof Error ? error.stack : 'スタックトレース取得不可'}
\`\`\`
`
    
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
    const errorPath = join(outputDir, `error-report-${timestamp}.md`)
    await writeFile(errorPath, errorReport)
    
    process.exit(1)
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runBenchmarkTest().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}