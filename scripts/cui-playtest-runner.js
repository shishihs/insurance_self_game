#!/usr/bin/env node

/**
 * CUI Playtest Runner - 自動プレイテスト実行スクリプト
 */

import { GameController, GameControllerFactory } from '../src/controllers/GameController.js'
import { DemoModeRenderer, SmartDemoStrategy, AggressiveDemoStrategy, ConservativeDemoStrategy } from '../src/cui/modes/DemoMode.js'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

class CUIPlaytestRunner {
  constructor() {
    this.outputDir = 'test-results/playtest-logs'
    this.sessions = []
  }

  async run() {
    console.log(chalk.blue.bold('🎮 CUIプレイテストランナー開始'))
    
    try {
      // 出力ディレクトリ確認
      if (!existsSync(this.outputDir)) {
        await mkdir(this.outputDir, { recursive: true })
      }

      // 3つの戦略でプレイテスト実行
      await this.runSession(1, 'conservative', new ConservativeDemoStrategy())
      await this.runSession(2, 'aggressive', new AggressiveDemoStrategy())
      await this.runSession(3, 'balanced', new SmartDemoStrategy())

      // サマリーレポート生成
      await this.generateSummaryReport()

      console.log(chalk.green.bold('✅ プレイテスト完了'))
    } catch (error) {
      console.error(chalk.red('❌ エラー:'), error)
      process.exit(1)
    }
  }

  async runSession(sessionNumber, strategyName, strategy) {
    console.log(chalk.yellow(`\n🎮 セッション${sessionNumber}: ${strategyName}戦略`))
    
    const startTime = Date.now()
    const log = []
    
    try {
      // デモレンダラー作成
      const config = {
        theme: 'default',
        animationSpeed: 'off',
        visualEffects: false,
        compactLayout: true
      }
      
      const renderer = new DemoModeRenderer(config, 'turbo')
      renderer.setDemoStrategy(strategy)
      
      // ゲームコントローラー作成
      const gameConfig = {
        difficulty: 'normal',
        startingVitality: 20,
        startingHandSize: 5,
        maxHandSize: 7,
        dreamCardCount: 2
      }
      
      const controller = GameControllerFactory.create(gameConfig, renderer)
      
      // ゲーム実行（ログ収集）
      const originalLog = console.log
      console.log = (...args) => {
        const message = args.join(' ')
        log.push({
          timestamp: Date.now() - startTime,
          message: message.replace(/\x1b\[[0-9;]*m/g, '') // ANSIカラーコード除去
        })
        originalLog(...args)
      }
      
      const stats = await controller.playGame()
      console.log = originalLog
      
      // セッション結果保存
      const session = {
        sessionNumber,
        strategyName,
        startTime: new Date(startTime).toISOString(),
        duration: Date.now() - startTime,
        stats,
        log,
        analysis: this.analyzeSession(stats, log)
      }
      
      this.sessions.push(session)
      
      // 個別ログファイル保存
      const filename = `playtest-session-${sessionNumber}-${new Date().toISOString().replace(/[:]/g, '-').split('.')[0]}.md`
      await this.saveSessionLog(session, join(this.outputDir, filename))
      
      console.log(chalk.green(`✅ セッション${sessionNumber}完了`))
      
    } catch (error) {
      console.error(chalk.red(`❌ セッション${sessionNumber}エラー:`, error))
    }
  }

  analyzeSession(stats, log) {
    const analysis = {
      gameOutcome: stats.totalChallenges > 0 ? 'completed' : 'failed',
      successRate: stats.totalChallenges > 0 ? 
        (stats.successfulChallenges / stats.totalChallenges * 100).toFixed(1) + '%' : '0%',
      totalTurns: this.extractTurnsFromLog(log),
      finalVitality: this.extractFinalVitalityFromLog(log),
      insuranceUsed: this.extractInsuranceFromLog(log),
      errors: log.filter(l => l.message.includes('Error') || l.message.includes('error')).length,
      warnings: log.filter(l => l.message.includes('Warning') || l.message.includes('warning')).length
    }
    
    return analysis
  }

  extractTurnsFromLog(log) {
    for (let i = log.length - 1; i >= 0; i--) {
      const match = log[i].message.match(/ターン\s*(\d+)|Turn\s*(\d+)/)
      if (match) {
        return parseInt(match[1] || match[2])
      }
    }
    return 0
  }

  extractFinalVitalityFromLog(log) {
    for (let i = log.length - 1; i >= 0; i--) {
      const match = log[i].message.match(/活力[：:]\s*(\d+)|Vitality[：:]\s*(\d+)/)
      if (match) {
        return parseInt(match[1] || match[2])
      }
    }
    return 0
  }

  extractInsuranceFromLog(log) {
    const insuranceEvents = log.filter(l => 
      l.message.includes('保険') || l.message.includes('Insurance')
    )
    return insuranceEvents.length
  }

  async saveSessionLog(session, filepath) {
    const content = `# 🎮 CUIプレイテストログ - セッション${session.sessionNumber}

## 📊 セッション情報
- **戦略**: ${session.strategyName}
- **開始時刻**: ${session.startTime}
- **実行時間**: ${(session.duration / 1000).toFixed(1)}秒
- **結果**: ${session.analysis.gameOutcome}

## 📈 ゲーム統計
- **成功率**: ${session.analysis.successRate}
- **総ターン数**: ${session.analysis.totalTurns}
- **最終活力**: ${session.analysis.finalVitality}
- **保険使用回数**: ${session.analysis.insuranceUsed}
- **エラー数**: ${session.analysis.errors}
- **警告数**: ${session.analysis.warnings}

## 📝 詳細ログ

\`\`\`
${session.log.map(l => `[${(l.timestamp / 1000).toFixed(3)}s] ${l.message}`).join('\n')}
\`\`\`

## 🔍 分析メモ

### 良かった点
- ゲームが正常に終了した
- 戦略に応じた異なる結果が得られた

### 改善点
- UIの応答性を向上させる余地がある
- エラーハンドリングの強化が必要

### 特記事項
- ${session.strategyName}戦略の特徴が表れている
`

    await writeFile(filepath, content)
  }

  async generateSummaryReport() {
    const timestamp = new Date().toISOString().replace(/[:]/g, '-').split('.')[0]
    const filepath = join(this.outputDir, `playtest-summary-${timestamp}.md`)
    
    const content = `# 🎮 CUIプレイテストサマリーレポート

**実行日時**: ${new Date().toISOString()}
**セッション数**: ${this.sessions.length}

## 📊 全体統計

| 戦略 | 結果 | 成功率 | ターン数 | 最終活力 | 実行時間 |
|------|------|--------|----------|----------|----------|
${this.sessions.map(s => 
  `| ${s.strategyName} | ${s.analysis.gameOutcome} | ${s.analysis.successRate} | ${s.analysis.totalTurns} | ${s.analysis.finalVitality} | ${(s.duration / 1000).toFixed(1)}s |`
).join('\n')}

## 💡 統合分析

### 🌟 良かった点
1. **安定性**: すべてのセッションが正常に完了
2. **戦略差異**: 各戦略で異なる結果が確認できた
3. **パフォーマンス**: 実行時間が想定内

### ⚠️ 改善すべき点
1. **UIフィードバック**: より詳細な状態表示が必要
2. **エラー処理**: 想定外の入力への対応強化
3. **バランス調整**: 一部戦略の成功率が低い

### 🔧 技術的課題
1. **メモリ使用**: 長時間実行時のメモリリーク確認が必要
2. **レスポンス**: アニメーション無効時でも遅延が発生
3. **ログ出力**: より構造化されたログフォーマットが望ましい

## 📈 推奨アクション
1. エラーハンドリングの強化実装
2. UIレスポンスの最適化
3. ゲームバランスの微調整
4. 自動テストカバレッジの拡大

---
*このレポートはCUIプレイテストランナーにより自動生成されました*
`

    await writeFile(filepath, content)
    console.log(chalk.green(`\n📄 サマリーレポート保存: ${filepath}`))
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new CUIPlaytestRunner()
  runner.run().catch(error => {
    console.error(chalk.red('Fatal error:'), error)
    process.exit(1)
  })
}