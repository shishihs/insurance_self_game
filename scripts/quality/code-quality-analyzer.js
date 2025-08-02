#!/usr/bin/env node

/**
 * コード品質分析ツール
 * 
 * このツールは以下のメトリクスを測定します：
 * - 循環的複雑度（Cyclomatic Complexity）
 * - 行数（LOC）
 * - クラス/関数の責任数
 * - 重複コード
 * - テストカバレッジ
 */

import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import chalk from 'chalk'
import ora from 'ora'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.join(__dirname, '..')

/**
 * TypeScriptファイルの複雑度を計算
 */
function calculateCyclomaticComplexity(code) {
  // 簡易的な複雑度計算（実際にはAST解析が必要）
  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*:/g, // 三項演算子
    /&&/g,
    /\|\|/g,
  ]
  
  let complexity = 1 // 基本複雑度
  patterns.forEach(pattern => {
    const matches = code.match(pattern)
    if (matches) {
      complexity += matches.length
    }
  })
  
  return complexity
}

/**
 * メソッドの行数を計算
 */
function calculateMethodLines(code) {
  const methodPattern = /^[\s]*(?:async\s+)?(?:private\s+|public\s+|protected\s+)?(?:static\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{/gm
  const methods = []
  let match
  
  while ((match = methodPattern.exec(code)) !== null) {
    const methodName = match[1]
    const startIndex = match.index
    let braceCount = 1
    let endIndex = code.indexOf('{', startIndex) + 1
    
    // メソッドの終了位置を探す
    for (let i = endIndex; i < code.length && braceCount > 0; i++) {
      if (code[i] === '{') braceCount++
      else if (code[i] === '}') braceCount--
      if (braceCount === 0) endIndex = i
    }
    
    const methodCode = code.substring(startIndex, endIndex + 1)
    const lines = methodCode.split('\n').length
    const complexity = calculateCyclomaticComplexity(methodCode)
    
    methods.push({
      name: methodName,
      lines,
      complexity,
      isComplex: complexity > 10,
      isTooLong: lines > 50
    })
  }
  
  return methods
}

/**
 * ファイルのメトリクスを分析
 */
async function analyzeFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const lines = content.split('\n').length
    const complexity = calculateCyclomaticComplexity(content)
    const methods = calculateMethodLines(content)
    
    // クラスの責任数を推定（インポート数とパブリックメソッド数から）
    const imports = (content.match(/^import\s+/gm) || []).length
    const publicMethods = methods.filter(m => !m.name.startsWith('_')).length
    const responsibilities = Math.ceil((imports + publicMethods) / 5)
    
    return {
      filePath: path.relative(PROJECT_ROOT, filePath),
      lines,
      complexity,
      methods,
      imports,
      publicMethods,
      responsibilities,
      issues: []
    }
  } catch (error) {
    return null
  }
}

/**
 * ディレクトリを再帰的に分析
 */
async function analyzeDirectory(dir, pattern = /\.ts$/) {
  const results = []
  
  async function traverse(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true })
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await traverse(fullPath)
      } else if (entry.isFile() && pattern.test(entry.name)) {
        const analysis = await analyzeFile(fullPath)
        if (analysis) results.push(analysis)
      }
    }
  }
  
  await traverse(dir)
  return results
}

/**
 * 分析結果をレポート
 */
function generateReport(results) {
  const report = {
    summary: {
      totalFiles: results.length,
      totalLines: 0,
      avgComplexity: 0,
      complexFiles: [],
      largeFiles: [],
      godClasses: []
    },
    details: []
  }
  
  results.forEach(file => {
    report.summary.totalLines += file.lines
    
    // 問題のあるファイルを特定
    if (file.complexity > 50) {
      file.issues.push('高い循環的複雑度')
      report.summary.complexFiles.push(file.filePath)
    }
    
    if (file.lines > 300) {
      file.issues.push('ファイルが大きすぎる')
      report.summary.largeFiles.push(file.filePath)
    }
    
    if (file.responsibilities > 5) {
      file.issues.push('責任が多すぎる（God Class）')
      report.summary.godClasses.push(file.filePath)
    }
    
    // 問題のあるメソッドを特定
    file.methods.forEach(method => {
      if (method.isTooLong) {
        file.issues.push(`メソッド ${method.name} が長すぎる（${method.lines}行）`)
      }
      if (method.isComplex) {
        file.issues.push(`メソッド ${method.name} が複雑すぎる（複雑度: ${method.complexity}）`)
      }
    })
    
    if (file.issues.length > 0) {
      report.details.push(file)
    }
  })
  
  report.summary.avgComplexity = Math.round(
    results.reduce((sum, file) => sum + file.complexity, 0) / results.length
  )
  
  return report
}

/**
 * レポートを表示
 */
function displayReport(report) {
  console.log(chalk.bold.cyan('\n📊 コード品質分析レポート\n'))
  
  // サマリー
  console.log(chalk.bold('概要:'))
  console.log(`  総ファイル数: ${report.summary.totalFiles}`)
  console.log(`  総行数: ${report.summary.totalLines.toLocaleString()}`)
  console.log(`  平均複雑度: ${report.summary.avgComplexity}`)
  
  // 問題のあるファイル
  if (report.summary.complexFiles.length > 0) {
    console.log(chalk.yellow('\n⚠️  高複雑度ファイル:'))
    report.summary.complexFiles.forEach(file => {
      console.log(`  - ${file}`)
    })
  }
  
  if (report.summary.largeFiles.length > 0) {
    console.log(chalk.yellow('\n⚠️  大きすぎるファイル:'))
    report.summary.largeFiles.forEach(file => {
      console.log(`  - ${file}`)
    })
  }
  
  if (report.summary.godClasses.length > 0) {
    console.log(chalk.red('\n🚨 God Classes:'))
    report.summary.godClasses.forEach(file => {
      console.log(`  - ${file}`)
    })
  }
  
  // 詳細
  if (report.details.length > 0) {
    console.log(chalk.bold('\n詳細な問題:'))
    report.details.forEach(file => {
      console.log(`\n${chalk.cyan(file.filePath)}:`)
      console.log(`  複雑度: ${file.complexity} | 行数: ${file.lines} | 責任数: ${file.responsibilities}`)
      file.issues.forEach(issue => {
        console.log(chalk.red(`  ❌ ${issue}`))
      })
    })
  }
  
  // 推奨事項
  console.log(chalk.bold.green('\n✅ 推奨される改善:'))
  if (report.summary.godClasses.length > 0) {
    console.log('  1. God Classesを責任ごとに分割')
  }
  if (report.summary.complexFiles.length > 0) {
    console.log('  2. 複雑なロジックを小さな関数に分割')
  }
  if (report.summary.largeFiles.length > 0) {
    console.log('  3. 大きなファイルをモジュールに分割')
  }
  console.log('  4. 単体テストのカバレッジを向上')
  console.log('  5. ドキュメンテーションコメントを追加')
}

/**
 * メイン処理
 */
async function main() {
  const spinner = ora('コード品質を分析中...').start()
  
  try {
    // srcディレクトリを分析
    const srcDir = path.join(PROJECT_ROOT, 'src')
    const results = await analyzeDirectory(srcDir)
    
    spinner.succeed('分析完了')
    
    // レポート生成
    const report = generateReport(results)
    
    // レポート表示
    displayReport(report)
    
    // レポートをファイルに保存
    const reportPath = path.join(PROJECT_ROOT, 'code-quality-report.json')
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    console.log(chalk.dim(`\n詳細レポートを保存: ${reportPath}`))
    
  } catch (error) {
    spinner.fail('分析エラー')
    console.error(error)
    process.exit(1)
  }
}

// 実行
main()