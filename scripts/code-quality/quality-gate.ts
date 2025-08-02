/**
 * 品質ゲートシステム
 * 
 * コードベースの品質基準を自動的にチェックし、
 * リリース可能性を判定する統合システム
 */

import { runMetricsAnalysis, ProjectMetrics, QualityThresholds } from './metrics-analyzer'
import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync, existsSync } from 'fs'

const execAsync = promisify(exec)

// ===== 品質ゲート定義 =====

export interface QualityGate {
  name: string
  description: string
  conditions: QualityCondition[]
  weight: number // 1-10 (10が最重要)
}

export interface QualityCondition {
  id: string
  name: string
  metric: string
  operator: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE'
  threshold: number
  errorThreshold?: number
  onNewCode?: boolean
  weight: number
}

export interface QualityGateResult {
  gate: QualityGate
  status: 'PASSED' | 'FAILED' | 'WARNING'
  score: number
  maxScore: number
  conditions: QualityConditionResult[]
  summary: string
}

export interface QualityConditionResult {
  condition: QualityCondition
  value: number
  status: 'PASSED' | 'FAILED' | 'WARNING'
  message: string
}

export interface OverallQualityResult {
  overallStatus: 'PASSED' | 'FAILED' | 'WARNING'
  overallScore: number
  maxScore: number
  gateResults: QualityGateResult[]
  summary: QualitySummary
  recommendations: Recommendation[]
  timestamp: string
}

export interface QualitySummary {
  totalIssues: number
  criticalIssues: number
  majorIssues: number
  minorIssues: number
  technicalDebtHours: number
  testCoverage: number
  codeSmells: number
  duplications: number
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  category: 'SECURITY' | 'PERFORMANCE' | 'MAINTAINABILITY' | 'RELIABILITY' | 'TESTING'
  title: string
  description: string
  actionItems: string[]
  estimatedEffort: string
}

// ===== 品質ゲート設定 =====

const QUALITY_GATES: QualityGate[] = [
  {
    name: 'Code Coverage',
    description: 'Ensures adequate test coverage for reliability',
    weight: 10,
    conditions: [
      {
        id: 'coverage_line',
        name: 'Line Coverage',
        metric: 'coverage_line',
        operator: 'GTE',
        threshold: 80,
        errorThreshold: 70,
        weight: 10
      },
      {
        id: 'coverage_branch',
        name: 'Branch Coverage',
        metric: 'coverage_branch',
        operator: 'GTE',
        threshold: 70,
        errorThreshold: 60,
        weight: 8
      },
      {
        id: 'new_coverage',
        name: 'New Code Coverage',
        metric: 'new_coverage',
        operator: 'GTE',
        threshold: 85,
        errorThreshold: 75,
        onNewCode: true,
        weight: 9
      }
    ]
  },
  {
    name: 'Code Complexity',
    description: 'Maintains manageable code complexity',
    weight: 9,
    conditions: [
      {
        id: 'complexity',
        name: 'Cyclomatic Complexity',
        metric: 'complexity',
        operator: 'LTE',
        threshold: 15,
        errorThreshold: 25,
        weight: 9
      },
      {
        id: 'cognitive_complexity',
        name: 'Cognitive Complexity',
        metric: 'cognitive_complexity',
        operator: 'LTE',
        threshold: 15,
        errorThreshold: 25,
        weight: 8
      },
      {
        id: 'function_complexity',
        name: 'Function Complexity',
        metric: 'function_complexity',
        operator: 'LTE',
        threshold: 10,
        errorThreshold: 20,
        weight: 7
      }
    ]
  },
  {
    name: 'Code Quality',
    description: 'Enforces high code quality standards',
    weight: 8,
    conditions: [
      {
        id: 'maintainability_rating',
        name: 'Maintainability Rating',
        metric: 'maintainability_rating',
        operator: 'LTE',
        threshold: 1, // A rating
        errorThreshold: 2, // B rating
        weight: 9
      },
      {
        id: 'code_smells',
        name: 'Code Smells',
        metric: 'code_smells',
        operator: 'LTE',
        threshold: 50,
        errorThreshold: 100,
        weight: 7
      },
      {
        id: 'technical_debt',
        name: 'Technical Debt Ratio',
        metric: 'sqale_debt_ratio',
        operator: 'LTE',
        threshold: 5.0,
        errorThreshold: 10.0,
        weight: 8
      }
    ]
  },
  {
    name: 'Security',
    description: 'Ensures code security standards',
    weight: 10,
    conditions: [
      {
        id: 'security_rating',
        name: 'Security Rating',
        metric: 'security_rating',
        operator: 'LTE',
        threshold: 1, // A rating
        errorThreshold: 2, // B rating
        weight: 10
      },
      {
        id: 'vulnerabilities',
        name: 'Vulnerabilities',
        metric: 'vulnerabilities',
        operator: 'EQ',
        threshold: 0,
        errorThreshold: 3,
        weight: 10
      },
      {
        id: 'security_hotspots',
        name: 'Security Hotspots',
        metric: 'security_hotspots',
        operator: 'EQ',
        threshold: 0,
        errorThreshold: 5,
        weight: 8
      }
    ]
  },
  {
    name: 'Reliability',
    description: 'Ensures code reliability and bug-free operation',
    weight: 9,
    conditions: [
      {
        id: 'reliability_rating',
        name: 'Reliability Rating',
        metric: 'reliability_rating',
        operator: 'LTE',
        threshold: 1, // A rating
        errorThreshold: 2, // B rating
        weight: 9
      },
      {
        id: 'bugs',
        name: 'Bugs',
        metric: 'bugs',
        operator: 'EQ',
        threshold: 0,
        errorThreshold: 5,
        weight: 10
      },
      {
        id: 'new_bugs',
        name: 'New Bugs',
        metric: 'new_bugs',
        operator: 'EQ',
        threshold: 0,
        errorThreshold: 1,
        onNewCode: true,
        weight: 10
      }
    ]
  },
  {
    name: 'Duplication',
    description: 'Minimizes code duplication',
    weight: 6,
    conditions: [
      {
        id: 'duplicated_lines_density',
        name: 'Duplicated Lines Density',
        metric: 'duplicated_lines_density',
        operator: 'LTE',
        threshold: 3.0,
        errorThreshold: 5.0,
        weight: 7
      },
      {
        id: 'new_duplicated_lines_density',
        name: 'New Duplicated Lines Density',
        metric: 'new_duplicated_lines_density',
        operator: 'LTE',
        threshold: 3.0,
        errorThreshold: 5.0,
        onNewCode: true,
        weight: 8
      }
    ]
  },
  {
    name: 'Size & Documentation',
    description: 'Maintains appropriate code size and documentation',
    weight: 5,
    conditions: [
      {
        id: 'lines',
        name: 'Lines of Code',
        metric: 'lines',
        operator: 'LTE',
        threshold: 50000,
        errorThreshold: 100000,
        weight: 3
      },
      {
        id: 'comment_lines_density',
        name: 'Comment Lines Density',
        metric: 'comment_lines_density',
        operator: 'GTE',
        threshold: 20.0,
        errorThreshold: 10.0,
        weight: 5
      },
      {
        id: 'public_undocumented_api',
        name: 'Public Undocumented API',
        metric: 'public_undocumented_api',
        operator: 'EQ',
        threshold: 0,
        errorThreshold: 10,
        weight: 6
      }
    ]
  }
]

// ===== 品質ゲート実行器 =====

export class QualityGateRunner {
  private projectMetrics?: ProjectMetrics

  async runAllGates(): Promise<OverallQualityResult> {
    console.log('🚦 Running Quality Gates...')
    
    // メトリクス収集
    const metrics = await this.collectMetrics()
    this.projectMetrics = metrics

    // 各品質ゲートを実行
    const gateResults = await Promise.all(
      QUALITY_GATES.map(gate => this.runQualityGate(gate, metrics))
    )

    // 全体的な結果を計算
    const overallResult = this.calculateOverallResult(gateResults)
    
    // 推奨事項を生成
    const recommendations = this.generateRecommendations(gateResults, metrics)
    overallResult.recommendations = recommendations

    // 結果を表示
    this.displayResults(overallResult)

    return overallResult
  }

  private async collectMetrics(): Promise<ProjectMetrics> {
    console.log('📊 Collecting project metrics...')
    
    // 静的解析メトリクスを取得
    const projectMetrics = await runMetricsAnalysis('./src', './quality-metrics.json')
    
    // 追加メトリクスを収集
    const additionalMetrics = await this.collectAdditionalMetrics()
    
    return {
      ...projectMetrics,
      ...additionalMetrics
    }
  }

  private async collectAdditionalMetrics(): Promise<Partial<ProjectMetrics>> {
    const metrics: any = {}

    try {
      // テストカバレッジの取得
      if (existsSync('./coverage/coverage-summary.json')) {
        const coverageReport = JSON.parse(
          readFileSync('./coverage/coverage-summary.json', 'utf-8')
        )
        metrics.lineCoverage = coverageReport.total.lines.pct
        metrics.branchCoverage = coverageReport.total.branches.pct
        metrics.functionCoverage = coverageReport.total.functions.pct
      }

      // ESLint結果の取得
      const { stdout: eslintOutput } = await execAsync(
        'npx eslint src --ext .ts,.tsx,.vue --format json --quiet || true'
      )
      
      if (eslintOutput.trim()) {
        const eslintResults = JSON.parse(eslintOutput)
        metrics.eslintErrors = eslintResults.reduce((sum: number, result: any) => 
          sum + result.errorCount, 0
        )
        metrics.eslintWarnings = eslintResults.reduce((sum: number, result: any) => 
          sum + result.warningCount, 0
        )
      }

      // TypeScript コンパイラエラーの取得
      try {
        await execAsync('npx tsc --noEmit --skipLibCheck')
        metrics.typeErrors = 0
      } catch (error) {
        const errorOutput = (error as any).stdout || (error as any).stderr || ''
        const errorMatches = errorOutput.match(/error TS\d+:/g)
        metrics.typeErrors = errorMatches ? errorMatches.length : 0
      }

    } catch (error) {
      console.warn('⚠️ Could not collect some additional metrics:', error)
    }

    return metrics
  }

  private async runQualityGate(
    gate: QualityGate, 
    metrics: ProjectMetrics
  ): Promise<QualityGateResult> {
    console.log(`  🔍 Checking ${gate.name}...`)

    const conditionResults: QualityConditionResult[] = []
    let score = 0
    const maxScore = gate.conditions.reduce((sum, c) => sum + c.weight, 0)

    for (const condition of gate.conditions) {
      const result = await this.evaluateCondition(condition, metrics)
      conditionResults.push(result)
      
      if (result.status === 'PASSED') {
        score += condition.weight
      } else if (result.status === 'WARNING') {
        score += Math.floor(condition.weight * 0.5)
      }
    }

    const failedConditions = conditionResults.filter(r => r.status === 'FAILED')
    const warningConditions = conditionResults.filter(r => r.status === 'WARNING')
    
    let status: 'PASSED' | 'FAILED' | 'WARNING'
    if (failedConditions.length > 0) {
      status = 'FAILED'
    } else if (warningConditions.length > 0) {
      status = 'WARNING'
    } else {
      status = 'PASSED'
    }

    const summary = this.generateGateSummary(gate, conditionResults, score, maxScore)

    return {
      gate,
      status,
      score,
      maxScore,
      conditions: conditionResults,
      summary
    }
  }

  private async evaluateCondition(
    condition: QualityCondition,
    metrics: any
  ): Promise<QualityConditionResult> {
    let value = this.getMetricValue(condition.metric, metrics)
    
    // メトリクスが見つからない場合はデフォルト値を使用
    if (value === undefined) {
      value = this.getDefaultMetricValue(condition.metric)
    }

    let status: 'PASSED' | 'FAILED' | 'WARNING'
    let message: string

    const passed = this.checkCondition(condition.operator, value, condition.threshold)
    const errorPassed = condition.errorThreshold 
      ? this.checkCondition(condition.operator, value, condition.errorThreshold)
      : true

    if (passed) {
      status = 'PASSED'
      message = `✅ ${condition.name}: ${value} meets threshold ${condition.threshold}`
    } else if (errorPassed) {
      status = 'WARNING'
      message = `⚠️ ${condition.name}: ${value} is within error threshold ${condition.errorThreshold}`
    } else {
      status = 'FAILED'
      message = `❌ ${condition.name}: ${value} fails threshold ${condition.threshold}`
    }

    return {
      condition,
      value,
      status,
      message
    }
  }

  private getMetricValue(metric: string, metrics: any): number {
    const metricMap: Record<string, string> = {
      'coverage_line': 'overallTestCoverage',
      'coverage_branch': 'branchCoverage',
      'new_coverage': 'overallTestCoverage',
      'complexity': 'averageComplexity',
      'cognitive_complexity': 'averageComplexity',
      'function_complexity': 'averageComplexity',
      'maintainability_rating': 'averageMaintainabilityIndex',
      'code_smells': 'codeSmellsSummary.total',
      'sqale_debt_ratio': 'technicalDebt.estimatedHours',
      'security_rating': 'securityRating',
      'vulnerabilities': 'vulnerabilities',
      'security_hotspots': 'securityHotspots',
      'reliability_rating': 'reliabilityRating',
      'bugs': 'bugs',
      'new_bugs': 'newBugs',
      'duplicated_lines_density': 'duplicationPercentage',
      'new_duplicated_lines_density': 'newDuplicationPercentage',
      'lines': 'totalLinesOfCode',
      'comment_lines_density': 'commentDensity',
      'public_undocumented_api': 'undocumentedApi'
    }

    const path = metricMap[metric] || metric
    return this.getNestedValue(metrics, path)
  }

  private getNestedValue(obj: any, path: string): number {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  private getDefaultMetricValue(metric: string): number {
    const defaults: Record<string, number> = {
      'coverage_line': 0,
      'coverage_branch': 0,
      'new_coverage': 0,
      'complexity': 0,
      'cognitive_complexity': 0,
      'function_complexity': 0,
      'maintainability_rating': 100,
      'code_smells': 0,
      'sqale_debt_ratio': 0,
      'security_rating': 1,
      'vulnerabilities': 0,
      'security_hotspots': 0,
      'reliability_rating': 1,
      'bugs': 0,
      'new_bugs': 0,
      'duplicated_lines_density': 0,
      'new_duplicated_lines_density': 0,
      'lines': 0,
      'comment_lines_density': 0,
      'public_undocumented_api': 0
    }

    return defaults[metric] || 0
  }

  private checkCondition(operator: string, value: number, threshold: number): boolean {
    switch (operator) {
      case 'GT': return value > threshold
      case 'GTE': return value >= threshold
      case 'LT': return value < threshold
      case 'LTE': return value <= threshold
      case 'EQ': return value === threshold
      default: return false
    }
  }

  private generateGateSummary(
    gate: QualityGate,
    results: QualityConditionResult[],
    score: number,
    maxScore: number
  ): string {
    const passed = results.filter(r => r.status === 'PASSED').length
    const failed = results.filter(r => r.status === 'FAILED').length
    const warnings = results.filter(r => r.status === 'WARNING').length
    const percentage = Math.round((score / maxScore) * 100)

    return `${gate.name}: ${percentage}% (${passed} passed, ${warnings} warnings, ${failed} failed)`
  }

  private calculateOverallResult(gateResults: QualityGateResult[]): OverallQualityResult {
    let overallScore = 0
    let maxScore = 0
    let criticalIssues = 0
    let majorIssues = 0
    let minorIssues = 0

    gateResults.forEach(result => {
      overallScore += result.score * result.gate.weight
      maxScore += result.maxScore * result.gate.weight
      
      result.conditions.forEach(condition => {
        if (condition.status === 'FAILED') {
          if (condition.condition.weight >= 9) criticalIssues++
          else if (condition.condition.weight >= 6) majorIssues++
          else minorIssues++
        }
      })
    })

    const failedGates = gateResults.filter(r => r.status === 'FAILED')
    const warningGates = gateResults.filter(r => r.status === 'WARNING')

    let overallStatus: 'PASSED' | 'FAILED' | 'WARNING'
    if (failedGates.length > 0) {
      overallStatus = 'FAILED'
    } else if (warningGates.length > 0) {
      overallStatus = 'WARNING'
    } else {
      overallStatus = 'PASSED'
    }

    const summary: QualitySummary = {
      totalIssues: criticalIssues + majorIssues + minorIssues,
      criticalIssues,
      majorIssues,
      minorIssues,
      technicalDebtHours: this.projectMetrics?.technicalDebt.estimatedHours || 0,
      testCoverage: this.projectMetrics?.overallTestCoverage || 0,
      codeSmells: this.projectMetrics?.codeSmellsSummary.total || 0,
      duplications: 0 // Will be calculated from duplication metrics
    }

    return {
      overallStatus,
      overallScore: Math.round(overallScore),
      maxScore,
      gateResults,
      summary,
      recommendations: [], // Will be filled later
      timestamp: new Date().toISOString()
    }
  }

  private generateRecommendations(
    gateResults: QualityGateResult[],
    metrics: ProjectMetrics
  ): Recommendation[] {
    const recommendations: Recommendation[] = []

    // テストカバレッジの推奨事項
    if (metrics.overallTestCoverage < 80) {
      recommendations.push({
        priority: 'HIGH',
        category: 'TESTING',
        title: 'Improve Test Coverage',
        description: `Current test coverage is ${metrics.overallTestCoverage.toFixed(1)}%, which is below the recommended 80%`,
        actionItems: [
          'Add unit tests for core business logic',
          'Create integration tests for critical user flows',
          'Implement component tests for UI elements',
          'Add end-to-end tests for key scenarios'
        ],
        estimatedEffort: '2-3 weeks'
      })
    }

    // 複雑さの推奨事項
    if (metrics.averageComplexity > 15) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'MAINTAINABILITY',
        title: 'Reduce Code Complexity',
        description: `Average complexity is ${metrics.averageComplexity.toFixed(1)}, which is above the recommended threshold of 15`,
        actionItems: [
          'Break down large functions into smaller ones',
          'Extract complex conditions into well-named functions',
          'Apply design patterns to simplify code structure',
          'Refactor nested conditionals using early returns'
        ],
        estimatedEffort: '1-2 weeks'
      })
    }

    // コードスメルの推奨事項
    if (metrics.codeSmellsSummary.total > 50) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'MAINTAINABILITY',
        title: 'Address Code Smells',
        description: `Found ${metrics.codeSmellsSummary.total} code smells that should be addressed`,
        actionItems: [
          'Refactor long methods and large classes',
          'Eliminate duplicate code through extraction',
          'Replace magic numbers with named constants',
          'Improve naming and documentation'
        ],
        estimatedEffort: `${Math.ceil(metrics.technicalDebt.estimatedHours / 40)} weeks`
      })
    }

    // セキュリティ推奨事項（失敗したセキュリティゲートがある場合）
    const securityGate = gateResults.find(r => r.gate.name === 'Security')
    if (securityGate && securityGate.status !== 'PASSED') {
      recommendations.push({
        priority: 'HIGH',
        category: 'SECURITY',
        title: 'Address Security Issues',
        description: 'Security gate failed - immediate attention required',
        actionItems: [
          'Review and fix security vulnerabilities',
          'Address security hotspots',
          'Implement secure coding practices',
          'Run security audit tools regularly'
        ],
        estimatedEffort: '1 week'
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private displayResults(result: OverallQualityResult): void {
    console.log('\n🏆 Quality Gate Results')
    console.log('========================')
    console.log(`Overall Status: ${this.getStatusIcon(result.overallStatus)} ${result.overallStatus}`)
    console.log(`Overall Score: ${result.overallScore}/${result.maxScore} (${Math.round((result.overallScore / result.maxScore) * 100)}%)`)
    console.log()

    console.log('📊 Summary:')
    console.log(`  Total Issues: ${result.summary.totalIssues}`)
    console.log(`  Critical: ${result.summary.criticalIssues}, Major: ${result.summary.majorIssues}, Minor: ${result.summary.minorIssues}`)
    console.log(`  Test Coverage: ${result.summary.testCoverage.toFixed(1)}%`)
    console.log(`  Technical Debt: ${result.summary.technicalDebtHours}h`)
    console.log()

    console.log('🚦 Gate Results:')
    result.gateResults.forEach(gateResult => {
      console.log(`  ${this.getStatusIcon(gateResult.status)} ${gateResult.summary}`)
    })

    if (result.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      result.recommendations.slice(0, 3).forEach((rec, index) => {
        console.log(`  ${index + 1}. [${rec.priority}] ${rec.title}`)
        console.log(`     ${rec.description}`)
        console.log(`     Estimated effort: ${rec.estimatedEffort}`)
      })
    }

    console.log(`\n📄 Detailed report saved to: quality-gate-report.json`)
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'PASSED': return '✅'
      case 'WARNING': return '⚠️'
      case 'FAILED': return '❌'
      default: return '❓'
    }
  }
}

// ===== メイン実行関数 =====

export async function runQualityGates(): Promise<OverallQualityResult> {
  const runner = new QualityGateRunner()
  const result = await runner.runAllGates()
  
  // 結果をファイルに保存
  const fs = require('fs')
  fs.writeFileSync('quality-gate-report.json', JSON.stringify(result, null, 2))
  
  return result
}

// CLIから実行された場合
if (require.main === module) {
  runQualityGates()
    .then(result => {
      console.log('\n🎉 Quality gates completed!')
      process.exit(result.overallStatus === 'FAILED' ? 1 : 0)
    })
    .catch(error => {
      console.error('❌ Quality gates failed:', error)
      process.exit(1)
    })
}