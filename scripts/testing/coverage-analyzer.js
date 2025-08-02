#!/usr/bin/env node

/**
 * テストカバレッジ分析ツール
 * 
 * 現在のテストカバレッジを分析し、改善が必要な箇所を特定
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import ora from 'ora'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')

/**
 * テストファイルの存在を確認
 */
async function findTestFiles(srcPath) {
  const testFiles = new Map()
  
  async function traverse(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await traverse(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        // ソースファイルに対応するテストファイルを探す
        const testFileName = entry.name.replace('.ts', '.test.ts')
        const testFilePath = path.join(dir, '__tests__', testFileName)
        const altTestPath = path.join(dir, testFileName)
        const specPath = path.join(dir, entry.name.replace('.ts', '.spec.ts'))
        
        let hasTest = false
        try {
          await fs.access(testFilePath)
          hasTest = true
        } catch {
          try {
            await fs.access(altTestPath)
            hasTest = true
          } catch {
            try {
              await fs.access(specPath)
              hasTest = true
            } catch {
              // No test file found
            }
          }
        }
        
        testFiles.set(path.relative(PROJECT_ROOT, fullPath), hasTest)
      }
    }
  }
  
  await traverse(srcPath)
  return testFiles
}

/**
 * テストカバレッジの推定
 */
function estimateCoverage(testFiles) {
  const coverage = {
    total: testFiles.size,
    covered: 0,
    uncovered: [],
    criticalUncovered: [],
    byDirectory: new Map()
  }
  
  for (const [file, hasTest] of testFiles) {
    if (hasTest) {
      coverage.covered++
    } else {
      coverage.uncovered.push(file)
      
      // 重要なファイルを特定
      if (file.includes('domain/entities') || 
          file.includes('domain/services') ||
          file.includes('controllers') ||
          file.includes('game/systems')) {
        coverage.criticalUncovered.push(file)
      }
    }
    
    // ディレクトリ別の統計
    const dir = path.dirname(file)
    if (!coverage.byDirectory.has(dir)) {
      coverage.byDirectory.set(dir, { total: 0, covered: 0 })
    }
    const dirStats = coverage.byDirectory.get(dir)
    dirStats.total++
    if (hasTest) dirStats.covered++
  }
  
  coverage.percentage = Math.round((coverage.covered / coverage.total) * 100)
  
  return coverage
}

/**
 * レポートを生成
 */
function generateReport(coverage) {
  console.log(chalk.bold.cyan('\n📊 テストカバレッジ分析レポート\n'))
  
  // サマリー
  console.log(chalk.bold('概要:'))
  console.log(`  総ファイル数: ${coverage.total}`)
  console.log(`  テスト済み: ${coverage.covered}`)
  console.log(`  未テスト: ${coverage.uncovered.length}`)
  console.log(`  カバレッジ: ${coverage.percentage}%`)
  
  // カバレッジの評価
  if (coverage.percentage >= 90) {
    console.log(chalk.green(`  評価: 優秀 🌟`))
  } else if (coverage.percentage >= 70) {
    console.log(chalk.yellow(`  評価: 良好 ✅`))
  } else if (coverage.percentage >= 50) {
    console.log(chalk.yellow(`  評価: 改善必要 ⚠️`))
  } else {
    console.log(chalk.red(`  評価: 要注意 🚨`))
  }
  
  // 重要な未テストファイル
  if (coverage.criticalUncovered.length > 0) {
    console.log(chalk.red('\n🚨 重要な未テストファイル:'))
    coverage.criticalUncovered.forEach(file => {
      console.log(`  - ${file}`)
    })
  }
  
  // ディレクトリ別カバレッジ
  console.log(chalk.bold('\nディレクトリ別カバレッジ:'))
  const sortedDirs = Array.from(coverage.byDirectory.entries())
    .sort((a, b) => {
      const aPercentage = (a[1].covered / a[1].total) * 100
      const bPercentage = (b[1].covered / b[1].total) * 100
      return aPercentage - bPercentage
    })
  
  sortedDirs.forEach(([dir, stats]) => {
    const percentage = Math.round((stats.covered / stats.total) * 100)
    const bar = createProgressBar(percentage)
    console.log(`  ${dir}`)
    console.log(`    ${bar} ${percentage}% (${stats.covered}/${stats.total})`)
  })
  
  // 推奨事項
  console.log(chalk.bold.green('\n✅ 推奨される改善:'))
  if (coverage.percentage < 90) {
    console.log('  1. 重要なビジネスロジックのテストを優先的に作成')
  }
  if (coverage.criticalUncovered.length > 0) {
    console.log('  2. ドメインエンティティとサービスのテストカバレッジを向上')
  }
  console.log('  3. テスト駆動開発（TDD）の採用を検討')
  console.log('  4. CI/CDパイプラインでカバレッジ閾値を設定')
  
  return coverage
}

/**
 * プログレスバーを作成
 */
function createProgressBar(percentage) {
  const width = 20
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  
  let color = chalk.green
  if (percentage < 50) color = chalk.red
  else if (percentage < 70) color = chalk.yellow
  
  return color('█'.repeat(filled)) + chalk.gray('░'.repeat(empty))
}

/**
 * カバレッジレポートをファイルに保存
 */
async function saveCoverageReport(coverage) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: coverage.total,
      covered: coverage.covered,
      percentage: coverage.percentage
    },
    uncoveredFiles: coverage.uncovered,
    criticalUncoveredFiles: coverage.criticalUncovered,
    directoryStats: Object.fromEntries(coverage.byDirectory)
  }
  
  const reportPath = path.join(PROJECT_ROOT, 'test-coverage-report.json')
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  
  return reportPath
}

/**
 * メイン処理
 */
async function main() {
  const spinner = ora('テストカバレッジを分析中...').start()
  
  try {
    // srcディレクトリを分析
    const srcDir = path.join(PROJECT_ROOT, 'src')
    const testFiles = await findTestFiles(srcDir)
    
    spinner.succeed('分析完了')
    
    // カバレッジを推定
    const coverage = estimateCoverage(testFiles)
    
    // レポートを表示
    generateReport(coverage)
    
    // レポートを保存
    const reportPath = await saveCoverageReport(coverage)
    console.log(chalk.dim(`\n詳細レポートを保存: ${reportPath}`))
    
    // 終了コード（カバレッジが低い場合は1）
    process.exit(coverage.percentage < 70 ? 1 : 0)
    
  } catch (error) {
    spinner.fail('分析エラー')
    console.error(error)
    process.exit(1)
  }
}

// 実行
main()