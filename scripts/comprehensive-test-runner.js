/**
 * 包括的テスト実行とレポート生成
 * 全テストカテゴリの実行、結果収集、詳細レポート作成
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs/promises'
import path from 'path'
import chalk from 'chalk'

const execAsync = promisify(exec)

class ComprehensiveTestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      categories: {},
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        coverage: {}
      },
      errors: []
    }
  }

  async runTestCategory(category, command, description) {
    console.log(chalk.blue(`\n🧪 ${description}を実行中...`))
    
    const startTime = Date.now()
    let success = false
    let output = ''
    let error = ''
    
    try {
      const result = await execAsync(command, { 
        timeout: 300000, // 5分タイムアウト
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      })
      
      output = result.stdout
      error = result.stderr
      success = true
      
      // 成功ログ
      console.log(chalk.green(`✅ ${description} 完了`))
      
    } catch (err) {
      output = err.stdout || ''
      error = err.stderr || err.message || ''
      success = false
      
      console.log(chalk.red(`❌ ${description} 失敗:`))
      console.log(chalk.gray(error.substring(0, 500)))
      
      this.results.errors.push({
        category,
        command,
        error: error.substring(0, 1000),
        timestamp: new Date()
      })
    }
    
    const duration = Date.now() - startTime
    
    // 結果をパース
    const testStats = this.parseTestOutput(output)
    
    this.results.categories[category] = {
      command,
      description,
      success,
      duration,
      output: output.substring(0, 2000), // 出力を制限
      error: error.substring(0, 1000),
      stats: testStats
    }
    
    // サマリー更新
    this.results.summary.totalTests += testStats.total
    this.results.summary.passedTests += testStats.passed
    this.results.summary.failedTests += testStats.failed
    this.results.summary.skippedTests += testStats.skipped
    
    return success
  }

  parseTestOutput(output) {
    const stats = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      coverage: null
    }
    
    // Vitest形式の結果をパース
    const testResultRegex = /(\d+)\s+passed.*?(\d+)\s+failed.*?(\d+)\s+skipped/
    const vitestMatch = output.match(testResultRegex)
    
    if (vitestMatch) {
      stats.passed = parseInt(vitestMatch[1]) || 0
      stats.failed = parseInt(vitestMatch[2]) || 0
      stats.skipped = parseInt(vitestMatch[3]) || 0
      stats.total = stats.passed + stats.failed + stats.skipped
    }
    
    // Playwright形式の結果をパース
    const playwrightRegex = /(\d+)\s+passed.*?(\d+)\s+failed/
    const playwrightMatch = output.match(playwrightRegex)
    
    if (playwrightMatch && !vitestMatch) {
      stats.passed = parseInt(playwrightMatch[1]) || 0
      stats.failed = parseInt(playwrightMatch[2]) || 0
      stats.total = stats.passed + stats.failed
    }
    
    // カバレッジ情報をパース
    const coverageRegex = /All files.*?(\d+\\.?\d*)%/
    const coverageMatch = output.match(coverageRegex)
    
    if (coverageMatch) {
      stats.coverage = parseFloat(coverageMatch[1])
    }
    
    // フォールバック：数値が見つからない場合
    if (stats.total === 0) {
      const testKeywords = ['test', 'spec', 'it(']
      const lines = output.split('\n')
      
      lines.forEach(line => {
        if (testKeywords.some(keyword => line.includes(keyword))) {
          if (line.includes('✓') || line.includes('PASS')) {
            stats.passed++
          } else if (line.includes('✗') || line.includes('FAIL')) {
            stats.failed++
          } else if (line.includes('SKIP')) {
            stats.skipped++
          }
        }
      })
      
      stats.total = stats.passed + stats.failed + stats.skipped
    }
    
    return stats
  }

  async generateReport() {
    this.results.endTime = new Date()
    const totalDuration = this.results.endTime - this.results.startTime
    
    const report = {
      timestamp: this.results.endTime.toISOString(),
      duration: `${Math.round(totalDuration / 1000)}秒`,
      summary: this.results.summary,
      categories: this.results.categories,
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    }
    
    // JSONレポート
    const jsonReport = JSON.stringify(report, null, 2)
    await fs.writeFile('test-results/comprehensive-test-report.json', jsonReport)
    
    // Markdownレポート
    const markdownReport = this.generateMarkdownReport(report)
    await fs.writeFile('test-results/comprehensive-test-report.md', markdownReport)
    
    // コンソール出力
    this.printSummary(report)
    
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    // 失敗率が高い場合
    const failureRate = this.results.summary.failedTests / this.results.summary.totalTests
    if (failureRate > 0.1) {
      recommendations.push({
        priority: 'high',
        category: 'reliability',
        message: `テスト失敗率が${(failureRate * 100).toFixed(1)}%と高いです。失敗したテストの根本原因を調査してください。`
      })
    }
    
    // カバレッジが低い場合
    Object.entries(this.results.categories).forEach(([category, result]) => {
      if (result.stats.coverage && result.stats.coverage < 80) {
        recommendations.push({
          priority: 'medium',
          category: 'coverage',
          message: `${category}のカバレッジが${result.stats.coverage}%と低いです。テストケースの追加を検討してください。`
        })
      }
    })
    
    // 実行時間が長い場合
    Object.entries(this.results.categories).forEach(([category, result]) => {
      if (result.duration > 120000) { // 2分以上
        recommendations.push({
          priority: 'low',
          category: 'performance',
          message: `${category}の実行時間が${Math.round(result.duration / 1000)}秒と長いです。テストの最適化を検討してください。`
        })
      }
    })
    
    // エラーが多い場合
    if (this.results.errors.length > 3) {
      recommendations.push({
        priority: 'high',
        category: 'stability',
        message: `${this.results.errors.length}個のテストカテゴリでエラーが発生しています。テスト環境の安定性を確認してください。`
      })
    }
    
    return recommendations
  }

  generateMarkdownReport(report) {
    const successRate = ((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(1)
    
    return `# 包括テスト実行レポート

## 📊 サマリー

- **実行日時**: ${report.timestamp}
- **実行時間**: ${report.duration}
- **総テスト数**: ${report.summary.totalTests}
- **成功**: ${report.summary.passedTests} (${successRate}%)
- **失敗**: ${report.summary.failedTests}
- **スキップ**: ${report.summary.skippedTests}

## 📋 カテゴリ別結果

${Object.entries(report.categories).map(([category, result]) => `
### ${category}

- **説明**: ${result.description}
- **結果**: ${result.success ? '✅ 成功' : '❌ 失敗'}
- **実行時間**: ${Math.round(result.duration / 1000)}秒
- **テスト統計**: ${result.stats.passed}通過 / ${result.stats.failed}失敗 / ${result.stats.skipped}スキップ
${result.stats.coverage ? `- **カバレッジ**: ${result.stats.coverage}%` : ''}
${result.error ? `- **エラー**: \`${result.error}\`` : ''}
`).join('\n')}

## 🚨 エラー詳細

${report.errors.length > 0 ? report.errors.map(error => `
### ${error.category}

- **コマンド**: \`${error.command}\`
- **エラー**: \`${error.error}\`
- **発生時刻**: ${error.timestamp}
`).join('\n') : 'エラーなし'}

## 💡 推奨事項

${report.recommendations.map(rec => `
- **${rec.priority.toUpperCase()}**: [${rec.category}] ${rec.message}
`).join('\n')}

## 📈 品質メトリクス

- **テスト成功率**: ${successRate}%
- **実行速度**: ${(report.summary.totalTests / (parseInt(report.duration) || 1)).toFixed(2)} テスト/秒
- **エラー率**: ${((report.errors.length / Object.keys(report.categories).length) * 100).toFixed(1)}%

---

*自動生成されたレポート - ${new Date().toISOString()}*
`
  }

  printSummary(report) {
    console.log(chalk.blue('\n' + '='.repeat(60)))
    console.log(chalk.blue('📊 包括テスト実行結果サマリー'))
    console.log(chalk.blue('='.repeat(60)))
    
    console.log(chalk.white(`実行時間: ${report.duration}`))
    console.log(chalk.white(`総テスト数: ${report.summary.totalTests}`))
    
    const successRate = ((report.summary.passedTests / report.summary.totalTests) * 100) || 0
    
    if (successRate >= 95) {
      console.log(chalk.green(`✅ 成功: ${report.summary.passedTests} (${successRate.toFixed(1)}%)`))
    } else if (successRate >= 80) {
      console.log(chalk.yellow(`⚠️  成功: ${report.summary.passedTests} (${successRate.toFixed(1)}%)`))
    } else {
      console.log(chalk.red(`❌ 成功: ${report.summary.passedTests} (${successRate.toFixed(1)}%)`))
    }
    
    if (report.summary.failedTests > 0) {
      console.log(chalk.red(`❌ 失敗: ${report.summary.failedTests}`))
    }
    
    if (report.summary.skippedTests > 0) {
      console.log(chalk.gray(`⏭️  スキップ: ${report.summary.skippedTests}`))
    }
    
    console.log(chalk.blue('\n📋 カテゴリ別結果:'))
    
    Object.entries(report.categories).forEach(([category, result]) => {
      const icon = result.success ? '✅' : '❌'
      const color = result.success ? chalk.green : chalk.red
      const duration = Math.round(result.duration / 1000)
      
      console.log(color(`${icon} ${category}: ${result.stats.passed}/${result.stats.total} (${duration}s)`))
    })
    
    if (report.recommendations.length > 0) {
      console.log(chalk.blue('\n💡 推奨事項:'))
      report.recommendations.forEach(rec => {
        const priorityColor = rec.priority === 'high' ? chalk.red : 
                             rec.priority === 'medium' ? chalk.yellow : chalk.gray
        console.log(priorityColor(`${rec.priority.toUpperCase()}: ${rec.message}`))
      })
    }
    
    console.log(chalk.blue('\n📄 詳細レポート: test-results/comprehensive-test-report.md'))
    console.log(chalk.blue('='.repeat(60)))
  }

  async run() {
    console.log(chalk.blue('🚀 包括テスト実行を開始します...'))
    
    // テスト結果ディレクトリを作成
    try {
      await fs.mkdir('test-results', { recursive: true })
    } catch (err) {
      // ディレクトリが既に存在する場合は無視
    }
    
    const testCategories = [
      {
        name: 'unit-tests',
        command: 'npm run test:run',
        description: 'ユニットテスト'
      },
      {
        name: 'integration-tests',
        command: 'npm run test:integration',
        description: '統合テスト'
      },
      {
        name: 'e2e-tests',
        command: 'npm run test:e2e',
        description: 'E2Eテスト'
      },
      {
        name: 'performance-tests',
        command: 'npm run test:performance:playwright',
        description: 'パフォーマンステスト'
      },
      {
        name: 'visual-tests',
        command: 'npm run test:visual',
        description: 'ビジュアル回帰テスト'
      },
      {
        name: 'mobile-tests',
        command: 'npm run test:mobile',
        description: 'モバイルテスト'
      },
      {
        name: 'coverage-analysis',
        command: 'npm run test:coverage',
        description: 'カバレッジ分析'
      }
    ]
    
    let successCount = 0
    
    // 各テストカテゴリを順次実行
    for (const category of testCategories) {
      const success = await this.runTestCategory(
        category.name,
        category.command,
        category.description
      )
      
      if (success) {
        successCount++
      }
      
      // 短い休憩（システムリソース回復のため）
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    
    // レポート生成
    const report = await this.generateReport()
    
    // 最終判定
    const overallSuccess = successCount === testCategories.length
    const criticalFailures = this.results.errors.filter(err => 
      ['unit-tests', 'integration-tests'].includes(err.category)
    ).length
    
    if (overallSuccess) {
      console.log(chalk.green('\n🎉 全テストカテゴリが正常に完了しました！'))
      process.exit(0)
    } else if (criticalFailures === 0) {
      console.log(chalk.yellow('\n⚠️  一部のテストで問題がありますが、クリティカルなエラーはありません'))
      process.exit(0)
    } else {
      console.log(chalk.red('\n🚨 クリティカルなテストエラーが発生しています'))
      process.exit(1)
    }
  }
}

// スクリプト実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new ComprehensiveTestRunner()
  
  runner.run().catch(error => {
    console.error(chalk.red('テスト実行中にエラーが発生しました:'), error)
    process.exit(1)
  })
}

export default ComprehensiveTestRunner