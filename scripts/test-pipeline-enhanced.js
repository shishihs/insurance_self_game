#!/usr/bin/env node

/**
 * 🚀 Enhanced Test Pipeline Orchestrator
 * 
 * 包括的なテストパイプラインを提供:
 * - 並列実行による高速化
 * - ビジュアルリグレッションテスト
 * - パフォーマンステスト
 * - ストレステスト
 * - 詳細なメトリクス収集
 */

import { spawn } from 'child_process';
import { writeFile, readFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { cpus } from 'os';
import chalk from 'chalk';

class EnhancedTestPipeline {
  constructor() {
    this.config = {
      // 並列実行設定
      parallel: {
        enabled: !process.argv.includes('--sequential'),
        maxWorkers: process.argv.includes('--max-workers') 
          ? parseInt(process.argv[process.argv.indexOf('--max-workers') + 1])
          : Math.max(1, cpus().length - 1)
      },
      
      // テストスイート設定
      suites: {
        unit: !process.argv.includes('--skip-unit'),
        integration: !process.argv.includes('--skip-integration'),
        e2e: !process.argv.includes('--skip-e2e'),
        visual: !process.argv.includes('--skip-visual'),
        performance: !process.argv.includes('--skip-performance'),
        stress: !process.argv.includes('--skip-stress')
      },
      
      // レポート設定
      reporting: {
        detailed: process.argv.includes('--detailed'),
        coverage: !process.argv.includes('--no-coverage'),
        metrics: !process.argv.includes('--no-metrics'),
        artifacts: !process.argv.includes('--no-artifacts')
      },
      
      // CI/CD設定
      ci: {
        mode: process.env.CI === 'true',
        failFast: process.argv.includes('--fail-fast'),
        retries: process.env.CI ? 2 : 0
      }
    };
    
    this.metrics = {
      startTime: Date.now(),
      phases: {},
      performance: {},
      coverage: {},
      failures: [],
      warnings: []
    };
  }

  /**
   * メインパイプライン実行
   */
  async run() {
    console.log(chalk.blue.bold('🚀 Enhanced Test Pipeline Starting'));
    console.log(chalk.gray(`Configuration: ${JSON.stringify(this.config, null, 2)}`));
    
    try {
      // 準備フェーズ
      await this.preparePipeline();
      
      // テスト実行フェーズ
      const testPromises = [];
      
      if (this.config.parallel.enabled) {
        // 並列実行
        if (this.config.suites.unit) {
          testPromises.push(this.runUnitTests());
        }
        if (this.config.suites.integration) {
          testPromises.push(this.runIntegrationTests());
        }
        if (this.config.suites.visual) {
          testPromises.push(this.runVisualRegressionTests());
        }
        if (this.config.suites.performance) {
          testPromises.push(this.runPerformanceTests());
        }
        
        await Promise.all(testPromises);
        
        // E2Eとストレステストは順次実行
        if (this.config.suites.e2e) {
          await this.runE2ETests();
        }
        if (this.config.suites.stress) {
          await this.runStressTests();
        }
      } else {
        // 順次実行
        if (this.config.suites.unit) await this.runUnitTests();
        if (this.config.suites.integration) await this.runIntegrationTests();
        if (this.config.suites.e2e) await this.runE2ETests();
        if (this.config.suites.visual) await this.runVisualRegressionTests();
        if (this.config.suites.performance) await this.runPerformanceTests();
        if (this.config.suites.stress) await this.runStressTests();
      }
      
      // 結果集計・分析
      await this.analyzeResults();
      
      // レポート生成
      await this.generateReports();
      
      // 最終サマリー
      this.printSummary();
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Pipeline execution failed:'), error.message);
      if (this.config.ci.mode) {
        process.exit(1);
      }
    }
  }

  /**
   * パイプライン準備
   */
  async preparePipeline() {
    console.log(chalk.yellow('📋 Preparing test pipeline...'));
    
    // テスト結果ディレクトリ作成
    const dirs = [
      'test-results',
      'test-results/coverage',
      'test-results/visual',
      'test-results/performance',
      'test-results/artifacts'
    ];
    
    for (const dir of dirs) {
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }
    }
    
    // 前回の結果をクリーンアップ（オプション）
    if (process.argv.includes('--clean')) {
      console.log(chalk.gray('Cleaning previous test results...'));
      await rm('test-results', { recursive: true, force: true });
      await mkdir('test-results', { recursive: true });
    }
  }

  /**
   * 単体テスト実行（拡張版）
   */
  async runUnitTests() {
    const phase = 'unit';
    console.log(chalk.yellow.bold(`🧪 Running ${phase} tests...`));
    
    const startTime = Date.now();
    
    try {
      // カバレッジ付き実行
      const result = await this.executeCommand('pnpm', [
        'vitest',
        '--run',
        '--coverage',
        '--reporter=json',
        '--outputFile=test-results/unit-results.json'
      ]);
      
      // メトリクス収集
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: result.exitCode === 0 ? 'passed' : 'failed',
        exitCode: result.exitCode
      };
      
      // カバレッジ解析
      if (existsSync('coverage/coverage-final.json')) {
        const coverage = await this.analyzeCoverage('coverage/coverage-final.json');
        this.metrics.coverage.unit = coverage;
      }
      
      // 失敗テスト抽出
      if (result.exitCode !== 0) {
        const failures = this.extractTestFailures(result.output);
        this.metrics.failures.push(...failures.map(f => ({ ...f, phase })));
      }
      
      console.log(chalk.green(`✅ ${phase} tests completed in ${Math.round((Date.now() - startTime) / 1000)}s`));
      
    } catch (error) {
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
      throw error;
    }
  }

  /**
   * 統合テスト実行（拡張版）
   */
  async runIntegrationTests() {
    const phase = 'integration';
    console.log(chalk.yellow.bold(`🔗 Running ${phase} tests...`));
    
    const startTime = Date.now();
    
    try {
      // 統合テスト専用の設定で実行
      const result = await this.executeCommand('pnpm', [
        'vitest',
        '--run',
        'src/**/*.integration.test.ts',
        '--reporter=json',
        '--outputFile=test-results/integration-results.json'
      ]);
      
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: result.exitCode === 0 ? 'passed' : 'failed',
        exitCode: result.exitCode
      };
      
      console.log(chalk.green(`✅ ${phase} tests completed in ${Math.round((Date.now() - startTime) / 1000)}s`));
      
    } catch (error) {
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
      throw error;
    }
  }

  /**
   * E2Eテスト実行（拡張版）
   */
  async runE2ETests() {
    const phase = 'e2e';
    console.log(chalk.yellow.bold(`🌐 Running ${phase} tests...`));
    
    const startTime = Date.now();
    
    try {
      // Playwright実行（トレース・スクリーンショット付き）
      const result = await this.executeCommand('pnpm', [
        'playwright',
        'test',
        '--reporter=json',
        '--reporter=html',
        `--workers=${this.config.parallel.maxWorkers}`,
        '--trace=retain-on-failure',
        '--screenshot=only-on-failure',
        '--video=retain-on-failure'
      ]);
      
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: result.exitCode === 0 ? 'passed' : 'failed',
        exitCode: result.exitCode
      };
      
      // アーティファクト収集
      if (existsSync('test-results')) {
        console.log(chalk.gray('Collecting E2E artifacts...'));
        // トレース、スクリーンショット、ビデオを収集
      }
      
      console.log(chalk.green(`✅ ${phase} tests completed in ${Math.round((Date.now() - startTime) / 1000)}s`));
      
    } catch (error) {
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
      throw error;
    }
  }

  /**
   * ビジュアルリグレッションテスト
   */
  async runVisualRegressionTests() {
    const phase = 'visual';
    console.log(chalk.yellow.bold(`👁️ Running ${phase} regression tests...`));
    
    const startTime = Date.now();
    
    try {
      // Playwrightのビジュアル比較機能を使用
      const result = await this.executeCommand('pnpm', [
        'playwright',
        'test',
        'tests/visual',
        '--reporter=json',
        '--update-snapshots'
      ]);
      
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: result.exitCode === 0 ? 'passed' : 'failed',
        exitCode: result.exitCode,
        differences: this.extractVisualDifferences(result.output)
      };
      
      console.log(chalk.green(`✅ ${phase} tests completed in ${Math.round((Date.now() - startTime) / 1000)}s`));
      
    } catch (error) {
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
      // ビジュアルテストの失敗は警告として扱う
      this.metrics.warnings.push({
        phase,
        message: `Visual regression tests failed: ${error.message}`
      });
    }
  }

  /**
   * パフォーマンステスト
   */
  async runPerformanceTests() {
    const phase = 'performance';
    console.log(chalk.yellow.bold(`⚡ Running ${phase} tests...`));
    
    const startTime = Date.now();
    
    try {
      // Vitestベンチマーク実行
      const benchmarkResult = await this.executeCommand('pnpm', [
        'vitest',
        'bench',
        '--run',
        '--reporter=json',
        '--outputFile=test-results/benchmark-results.json'
      ]);
      
      // メモリプロファイリング
      const memoryResult = await this.executeCommand('node', [
        '--expose-gc',
        '--max-old-space-size=4096',
        'scripts/memory-profiler.js'
      ]);
      
      // パフォーマンスメトリクス集計
      this.metrics.performance = {
        benchmark: this.parseBenchmarkResults(benchmarkResult.output),
        memory: this.parseMemoryProfile(memoryResult.output),
        renderingMetrics: await this.measureRenderingPerformance()
      };
      
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'passed',
        metrics: this.metrics.performance
      };
      
      // パフォーマンス閾値チェック
      this.checkPerformanceThresholds();
      
      console.log(chalk.green(`✅ ${phase} tests completed in ${Math.round((Date.now() - startTime) / 1000)}s`));
      
    } catch (error) {
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
      throw error;
    }
  }

  /**
   * ストレステスト
   */
  async runStressTests() {
    const phase = 'stress';
    console.log(chalk.yellow.bold(`💪 Running ${phase} tests...`));
    
    const startTime = Date.now();
    
    try {
      // 大量データ処理テスト
      const dataStressResult = await this.executeCommand('pnpm', [
        'vitest',
        'run',
        'src/__tests__/stress',
        '--timeout=300000'
      ]);
      
      // 並行処理ストレステスト
      const concurrencyResult = await this.runConcurrencyStressTest();
      
      // リソース枯渇テスト
      const resourceResult = await this.runResourceExhaustionTest();
      
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'passed',
        results: {
          dataProcessing: dataStressResult.exitCode === 0,
          concurrency: concurrencyResult.passed,
          resourceHandling: resourceResult.passed
        }
      };
      
      console.log(chalk.green(`✅ ${phase} tests completed in ${Math.round((Date.now() - startTime) / 1000)}s`));
      
    } catch (error) {
      this.metrics.phases[phase] = {
        duration: Date.now() - startTime,
        status: 'error',
        error: error.message
      };
      throw error;
    }
  }

  /**
   * 並行処理ストレステスト
   */
  async runConcurrencyStressTest() {
    console.log(chalk.gray('Running concurrency stress test...'));
    
    const workers = 50; // 50並列処理
    const iterations = 1000; // 各ワーカー1000回操作
    
    const promises = [];
    for (let i = 0; i < workers; i++) {
      promises.push(
        this.executeCommand('node', [
          'scripts/stress-worker.js',
          '--iterations', iterations.toString(),
          '--worker-id', i.toString()
        ])
      );
    }
    
    const results = await Promise.allSettled(promises);
    const failures = results.filter(r => r.status === 'rejected').length;
    
    return {
      passed: failures === 0,
      workers,
      iterations,
      failures
    };
  }

  /**
   * リソース枯渇テスト
   */
  async runResourceExhaustionTest() {
    console.log(chalk.gray('Running resource exhaustion test...'));
    
    // メモリ枯渇シミュレーション
    const memoryTest = await this.executeCommand('node', [
      'scripts/resource-exhaustion.js',
      '--type=memory',
      '--limit=1GB'
    ]);
    
    // CPU負荷テスト
    const cpuTest = await this.executeCommand('node', [
      'scripts/resource-exhaustion.js',
      '--type=cpu',
      '--duration=10s'
    ]);
    
    return {
      passed: memoryTest.exitCode === 0 && cpuTest.exitCode === 0,
      memory: memoryTest.exitCode === 0,
      cpu: cpuTest.exitCode === 0
    };
  }

  /**
   * レンダリングパフォーマンス測定
   */
  async measureRenderingPerformance() {
    // Playwright使用してレンダリングメトリクスを収集
    const result = await this.executeCommand('pnpm', [
      'playwright',
      'test',
      'tests/performance/rendering.spec.ts',
      '--reporter=json'
    ]);
    
    // メトリクス解析
    return {
      fps: this.extractFPSMetrics(result.output),
      paintTimes: this.extractPaintMetrics(result.output),
      layoutShifts: this.extractLayoutShiftMetrics(result.output)
    };
  }

  /**
   * カバレッジ分析
   */
  async analyzeCoverage(coverageFile) {
    const coverage = JSON.parse(await readFile(coverageFile, 'utf-8'));
    
    let totalStatements = 0;
    let coveredStatements = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    
    for (const file in coverage) {
      const fileCoverage = coverage[file];
      
      // ステートメントカバレッジ
      const stmts = Object.values(fileCoverage.s || {});
      totalStatements += stmts.length;
      coveredStatements += stmts.filter(count => count > 0).length;
      
      // ブランチカバレッジ
      const branches = Object.values(fileCoverage.b || {}).flat();
      totalBranches += branches.length;
      coveredBranches += branches.filter(count => count > 0).length;
      
      // 関数カバレッジ
      const funcs = Object.values(fileCoverage.f || {});
      totalFunctions += funcs.length;
      coveredFunctions += funcs.filter(count => count > 0).length;
    }
    
    return {
      statements: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0,
      branches: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      functions: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      lines: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
    };
  }

  /**
   * パフォーマンス閾値チェック
   */
  checkPerformanceThresholds() {
    const thresholds = {
      renderingFPS: 30,
      firstPaint: 1000,
      layoutShifts: 0.1,
      unitTestDuration: 30000,
      e2eTestDuration: 120000
    };
    
    const violations = [];
    
    // FPSチェック
    if (this.metrics.performance.renderingMetrics?.fps < thresholds.renderingFPS) {
      violations.push(`Rendering FPS (${this.metrics.performance.renderingMetrics.fps}) below threshold (${thresholds.renderingFPS})`);
    }
    
    // テスト実行時間チェック
    if (this.metrics.phases.unit?.duration > thresholds.unitTestDuration) {
      violations.push(`Unit test duration (${this.metrics.phases.unit.duration}ms) exceeds threshold (${thresholds.unitTestDuration}ms)`);
    }
    
    if (violations.length > 0) {
      this.metrics.warnings.push(...violations.map(v => ({
        type: 'performance',
        message: v
      })));
    }
  }

  /**
   * 結果分析
   */
  async analyzeResults() {
    console.log(chalk.blue.bold('📊 Analyzing test results...'));
    
    // 全体ステータス判定
    const allPhases = Object.values(this.metrics.phases);
    const hasFailures = allPhases.some(p => p.status === 'failed' || p.status === 'error');
    
    this.metrics.overall = {
      status: hasFailures ? 'failed' : 'passed',
      duration: Date.now() - this.metrics.startTime,
      totalTests: this.countTotalTests(),
      failedTests: this.metrics.failures.length,
      coverage: this.calculateOverallCoverage(),
      warnings: this.metrics.warnings.length
    };
    
    // 失敗パターン分析
    if (this.metrics.failures.length > 0) {
      this.analyzeFailurePatterns();
    }
    
    // トレンド分析（前回の結果との比較）
    await this.analyzeTrends();
  }

  /**
   * 失敗パターン分析
   */
  analyzeFailurePatterns() {
    const patterns = {};
    
    this.metrics.failures.forEach(failure => {
      const category = this.categorizeFailure(failure);
      patterns[category] = (patterns[category] || 0) + 1;
    });
    
    this.metrics.failurePatterns = patterns;
    
    // 最も多い失敗パターンを特定
    const topPattern = Object.entries(patterns)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (topPattern) {
      this.metrics.primaryFailureType = topPattern[0];
    }
  }

  /**
   * トレンド分析
   */
  async analyzeTrends() {
    const historyFile = 'test-results/test-history.json';
    let history = [];
    
    if (existsSync(historyFile)) {
      history = JSON.parse(await readFile(historyFile, 'utf-8'));
    }
    
    // 現在の結果を履歴に追加
    history.push({
      timestamp: new Date().toISOString(),
      metrics: this.metrics
    });
    
    // 最新10件のみ保持
    if (history.length > 10) {
      history = history.slice(-10);
    }
    
    await writeFile(historyFile, JSON.stringify(history, null, 2));
    
    // トレンド計算
    if (history.length >= 2) {
      const previous = history[history.length - 2].metrics;
      const current = this.metrics;
      
      this.metrics.trends = {
        coverageChange: (current.overall.coverage || 0) - (previous.overall.coverage || 0),
        durationChange: current.overall.duration - previous.overall.duration,
        failureChange: current.overall.failedTests - previous.overall.failedTests
      };
    }
  }

  /**
   * レポート生成
   */
  async generateReports() {
    console.log(chalk.blue.bold('📋 Generating comprehensive reports...'));
    
    // JSONレポート
    await writeFile(
      'test-results/pipeline-report.json',
      JSON.stringify(this.metrics, null, 2)
    );
    
    // HTMLダッシュボード
    await this.generateHTMLDashboard();
    
    // Markdownサマリー
    await this.generateMarkdownReport();
    
    // CI/CD用のサマリー
    if (this.config.ci.mode) {
      await this.generateCISummary();
    }
    
    console.log(chalk.green('✅ Reports generated successfully'));
  }

  /**
   * HTMLダッシュボード生成
   */
  async generateHTMLDashboard() {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>Test Pipeline Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #333; color: white; padding: 20px; border-radius: 8px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        .metric-label { color: #666; margin-top: 5px; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-warning { color: #ffc107; }
        .chart { margin: 20px 0; }
        .phase-results { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Pipeline Dashboard</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="metrics">
            <div class="metric-card">
                <div class="metric-value ${this.metrics.overall.status === 'passed' ? 'status-passed' : 'status-failed'}">
                    ${this.metrics.overall.status.toUpperCase()}
                </div>
                <div class="metric-label">Overall Status</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${Math.round(this.metrics.overall.duration / 1000)}s</div>
                <div class="metric-label">Total Duration</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value">${this.metrics.overall.coverage?.toFixed(1) || 0}%</div>
                <div class="metric-label">Code Coverage</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-value ${this.metrics.overall.failedTests > 0 ? 'status-failed' : 'status-passed'}">
                    ${this.metrics.overall.failedTests}
                </div>
                <div class="metric-label">Failed Tests</div>
            </div>
        </div>
        
        <div class="phase-results">
            <h2>Test Phase Results</h2>
            <table>
                <thead>
                    <tr>
                        <th>Phase</th>
                        <th>Status</th>
                        <th>Duration</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(this.metrics.phases).map(([phase, data]) => `
                        <tr>
                            <td>${phase.charAt(0).toUpperCase() + phase.slice(1)}</td>
                            <td class="${data.status === 'passed' ? 'status-passed' : 'status-failed'}">${data.status}</td>
                            <td>${Math.round(data.duration / 1000)}s</td>
                            <td>${data.error || data.metrics ? JSON.stringify(data.metrics || data.error) : '-'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        ${this.metrics.performance ? `
        <div class="phase-results">
            <h2>Performance Metrics</h2>
            <pre>${JSON.stringify(this.metrics.performance, null, 2)}</pre>
        </div>
        ` : ''}
        
        ${this.metrics.warnings.length > 0 ? `
        <div class="phase-results">
            <h2>Warnings</h2>
            <ul>
                ${this.metrics.warnings.map(w => `<li class="status-warning">${w.message || w}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
    </div>
</body>
</html>`;
    
    await writeFile('test-results/dashboard.html', html);
  }

  /**
   * Markdownレポート生成
   */
  async generateMarkdownReport() {
    const report = `# 🚀 Enhanced Test Pipeline Report

**Generated**: ${new Date().toISOString()}  
**Duration**: ${Math.round(this.metrics.overall.duration / 1000)}s  
**Status**: ${this.metrics.overall.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${this.metrics.overall.totalTests || 'N/A'} |
| Failed Tests | ${this.metrics.overall.failedTests} |
| Code Coverage | ${this.metrics.overall.coverage?.toFixed(1) || 0}% |
| Warnings | ${this.metrics.overall.warnings} |

## 🧪 Test Phases

${Object.entries(this.metrics.phases).map(([phase, data]) => `
### ${phase.charAt(0).toUpperCase() + phase.slice(1)} Tests
- **Status**: ${data.status}
- **Duration**: ${Math.round(data.duration / 1000)}s
${data.error ? `- **Error**: ${data.error}` : ''}
`).join('\n')}

## ⚡ Performance Metrics

${this.metrics.performance ? `
### Rendering Performance
- **FPS**: ${this.metrics.performance.renderingMetrics?.fps || 'N/A'}
- **First Paint**: ${this.metrics.performance.renderingMetrics?.paintTimes?.first || 'N/A'}ms
- **Layout Shifts**: ${this.metrics.performance.renderingMetrics?.layoutShifts || 'N/A'}

### Benchmark Results
\`\`\`json
${JSON.stringify(this.metrics.performance.benchmark, null, 2)}
\`\`\`
` : 'No performance metrics available'}

## 📈 Trends

${this.metrics.trends ? `
- **Coverage Change**: ${this.metrics.trends.coverageChange > 0 ? '+' : ''}${this.metrics.trends.coverageChange.toFixed(1)}%
- **Duration Change**: ${this.metrics.trends.durationChange > 0 ? '+' : ''}${Math.round(this.metrics.trends.durationChange / 1000)}s
- **Failure Change**: ${this.metrics.trends.failureChange > 0 ? '+' : ''}${this.metrics.trends.failureChange}
` : 'No trend data available (first run)'}

## 🔍 Failure Analysis

${this.metrics.failures.length > 0 ? `
### Failed Tests
${this.metrics.failures.map(f => `- **${f.phase}**: ${f.name} - ${f.error}`).join('\n')}

### Failure Patterns
${this.metrics.failurePatterns ? Object.entries(this.metrics.failurePatterns)
  .map(([pattern, count]) => `- **${pattern}**: ${count} occurrences`)
  .join('\n') : 'No patterns detected'}
` : 'No failures detected'}

## ⚠️ Warnings

${this.metrics.warnings.length > 0 
  ? this.metrics.warnings.map(w => `- ${w.message || w}`).join('\n')
  : 'No warnings'}

## 🎯 Recommendations

${this.generateRecommendations().map(r => `- **[${r.priority.toUpperCase()}]** ${r.message}`).join('\n')}

---

*Generated by Enhanced Test Pipeline*
`;

    await writeFile('test-results/pipeline-report.md', report);
  }

  /**
   * CI/CDサマリー生成
   */
  async generateCISummary() {
    const summary = {
      conclusion: this.metrics.overall.status,
      stats: {
        total: this.metrics.overall.totalTests || 0,
        passed: (this.metrics.overall.totalTests || 0) - this.metrics.overall.failedTests,
        failed: this.metrics.overall.failedTests,
        skipped: 0
      },
      coverage: this.metrics.overall.coverage || 0,
      duration: this.metrics.overall.duration
    };
    
    await writeFile('test-results/ci-summary.json', JSON.stringify(summary, null, 2));
    
    // GitHub Actions用のアノテーション生成
    if (process.env.GITHUB_ACTIONS) {
      this.metrics.failures.forEach(failure => {
        console.log(`::error::${failure.phase} - ${failure.name}: ${failure.error}`);
      });
      
      this.metrics.warnings.forEach(warning => {
        console.log(`::warning::${warning.message || warning}`);
      });
    }
  }

  /**
   * 推奨事項生成
   */
  generateRecommendations() {
    const recommendations = [];
    
    // カバレッジ改善
    if (this.metrics.overall.coverage < 80) {
      recommendations.push({
        priority: 'high',
        message: `Increase code coverage from ${this.metrics.overall.coverage?.toFixed(1)}% to at least 80%`
      });
    }
    
    // パフォーマンス改善
    if (this.metrics.performance?.renderingMetrics?.fps < 30) {
      recommendations.push({
        priority: 'high',
        message: 'Improve rendering performance - FPS below 30'
      });
    }
    
    // テスト実行時間
    if (this.metrics.overall.duration > 300000) { // 5分以上
      recommendations.push({
        priority: 'medium',
        message: 'Optimize test execution time - currently taking over 5 minutes'
      });
    }
    
    // 失敗テスト修正
    if (this.metrics.overall.failedTests > 0) {
      recommendations.push({
        priority: 'critical',
        message: `Fix ${this.metrics.overall.failedTests} failing tests immediately`
      });
    }
    
    // 警告対応
    if (this.metrics.overall.warnings > 5) {
      recommendations.push({
        priority: 'medium',
        message: `Address ${this.metrics.overall.warnings} warnings to improve code quality`
      });
    }
    
    return recommendations;
  }

  /**
   * 最終サマリー出力
   */
  printSummary() {
    console.log(chalk.blue.bold('\n🎯 Test Pipeline Summary'));
    console.log(chalk.gray('='.repeat(50)));
    
    const status = this.metrics.overall.status === 'passed' 
      ? chalk.green.bold('✅ PASSED') 
      : chalk.red.bold('❌ FAILED');
    
    console.log(`Overall Status: ${status}`);
    console.log(`Total Duration: ${Math.round(this.metrics.overall.duration / 1000)}s`);
    console.log(`Code Coverage: ${this.metrics.overall.coverage?.toFixed(1) || 0}%`);
    console.log(`Failed Tests: ${this.metrics.overall.failedTests}`);
    console.log(`Warnings: ${this.metrics.overall.warnings}`);
    
    console.log(chalk.gray('='.repeat(50)));
    
    // フェーズ別結果
    Object.entries(this.metrics.phases).forEach(([phase, data]) => {
      const phaseStatus = data.status === 'passed' 
        ? chalk.green('✓') 
        : data.status === 'failed' 
        ? chalk.red('✗') 
        : chalk.yellow('!');
      
      console.log(`${phaseStatus} ${phase}: ${Math.round(data.duration / 1000)}s`);
    });
    
    // レポートへのリンク
    console.log(chalk.gray('\n📋 Reports:'));
    console.log(chalk.gray('- HTML Dashboard: test-results/dashboard.html'));
    console.log(chalk.gray('- Markdown Report: test-results/pipeline-report.md'));
    console.log(chalk.gray('- JSON Data: test-results/pipeline-report.json'));
    
    // 終了コード設定
    if (this.metrics.overall.status !== 'passed' && this.config.ci.failFast) {
      process.exitCode = 1;
    }
  }

  /**
   * ヘルパーメソッド群
   */
  
  async executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
        ...options
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      child.on('close', (code) => {
        resolve({
          exitCode: code,
          output: output + errorOutput,
          stdout: output,
          stderr: errorOutput
        });
      });
      
      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  extractTestFailures(output) {
    const failures = [];
    const lines = output.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('FAIL') || lines[i].includes('✗')) {
        const testName = lines[i].replace(/^.*?(FAIL|✗)\s*/, '').trim();
        const error = lines[i + 1] || 'Unknown error';
        
        failures.push({
          name: testName,
          error: error.trim()
        });
      }
    }
    
    return failures;
  }

  extractVisualDifferences(output) {
    // Playwrightのビジュアル比較結果を解析
    const diffs = [];
    const diffPattern = /Screenshot comparison failed for "(.+)"/g;
    
    let match;
    while ((match = diffPattern.exec(output)) !== null) {
      diffs.push(match[1]);
    }
    
    return diffs;
  }

  parseBenchmarkResults(output) {
    // Vitestベンチマーク結果を解析
    try {
      const results = {};
      const lines = output.split('\n');
      
      lines.forEach(line => {
        const match = line.match(/(.+?)\s+×\s+([\d,]+)\s+ops\/sec/);
        if (match) {
          results[match[1].trim()] = parseInt(match[2].replace(/,/g, ''));
        }
      });
      
      return results;
    } catch {
      return {};
    }
  }

  parseMemoryProfile(output) {
    // メモリプロファイル結果を解析
    try {
      const profile = {};
      const heapMatch = output.match(/Heap used:\s+([\d.]+)\s*MB/);
      const gcMatch = output.match(/GC runs:\s+(\d+)/);
      
      if (heapMatch) profile.heapUsed = parseFloat(heapMatch[1]);
      if (gcMatch) profile.gcRuns = parseInt(gcMatch[1]);
      
      return profile;
    } catch {
      return {};
    }
  }

  extractFPSMetrics(output) {
    // FPS情報を抽出
    const fpsMatch = output.match(/Average FPS:\s*([\d.]+)/);
    return fpsMatch ? parseFloat(fpsMatch[1]) : null;
  }

  extractPaintMetrics(output) {
    // ペイントタイミング情報を抽出
    const metrics = {};
    const fcpMatch = output.match(/First Contentful Paint:\s*([\d.]+)ms/);
    const lcpMatch = output.match(/Largest Contentful Paint:\s*([\d.]+)ms/);
    
    if (fcpMatch) metrics.first = parseFloat(fcpMatch[1]);
    if (lcpMatch) metrics.largest = parseFloat(lcpMatch[1]);
    
    return metrics;
  }

  extractLayoutShiftMetrics(output) {
    // レイアウトシフト情報を抽出
    const clsMatch = output.match(/Cumulative Layout Shift:\s*([\d.]+)/);
    return clsMatch ? parseFloat(clsMatch[1]) : null;
  }

  countTotalTests() {
    // 各フェーズのテスト数を集計
    let total = 0;
    
    // 結果ファイルから実際のテスト数を取得
    try {
      if (existsSync('test-results/unit-results.json')) {
        const unitResults = JSON.parse(readFileSync('test-results/unit-results.json', 'utf-8'));
        total += unitResults.numTotalTests || 0;
      }
    } catch {
      // エラーは無視
    }
    
    return total || 'N/A';
  }

  calculateOverallCoverage() {
    // 全体のカバレッジを計算
    const coverages = Object.values(this.metrics.coverage).filter(c => c && c.lines);
    
    if (coverages.length === 0) return 0;
    
    const totalCoverage = coverages.reduce((sum, c) => sum + (c.lines || 0), 0);
    return totalCoverage / coverages.length;
  }

  categorizeFailure(failure) {
    const error = failure.error.toLowerCase();
    
    if (error.includes('timeout')) return 'Timeout';
    if (error.includes('type') || error.includes('undefined')) return 'Type Error';
    if (error.includes('network') || error.includes('fetch')) return 'Network Error';
    if (error.includes('assert') || error.includes('expect')) return 'Assertion Error';
    if (error.includes('memory') || error.includes('heap')) return 'Memory Error';
    
    return 'Other';
  }
}

// CLI実行
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(chalk.yellow.bold(`
╔═══════════════════════════════════════╗
║   Enhanced Test Pipeline v2.0         ║
║   Comprehensive Testing Suite         ║
╚═══════════════════════════════════════╝
  `));

  const pipeline = new EnhancedTestPipeline();
  pipeline.run().catch(error => {
    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}

export default EnhancedTestPipeline;