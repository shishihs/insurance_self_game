#!/usr/bin/env node

/**
 * 🎯 統合テストオーケストレーター
 * 
 * 単体テスト → 統合テスト → E2Eテスト の段階的実行と
 * 失敗時の詳細分析・自動復旧機能を提供
 */

import { spawn } from 'child_process';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

class TestOrchestrator {
  constructor() {
    this.results = {
      unit: { status: 'pending', duration: 0, coverage: 0, failedTests: [] },
      integration: { status: 'pending', duration: 0, failedTests: [] },
      e2e: { status: 'pending', duration: 0, failedTests: [] },
      overall: { status: 'pending', startTime: Date.now() }
    };
    
    this.config = {
      stopOnFailure: process.argv.includes('--stop-on-failure'),
      generateReport: !process.argv.includes('--no-report'),
      runParallel: process.argv.includes('--parallel'),
      verboseOutput: process.argv.includes('--verbose'),
      skipE2E: process.argv.includes('--skip-e2e')
    };
  }

  /**
   * メインテスト実行シーケンス
   */
  async runAllTests() {
    console.log(chalk.blue.bold('🚀 統合テストオーケストレーター開始'));
    console.log(chalk.gray(`設定: ${JSON.stringify(this.config, null, 2)}`));
    
    try {
      // Phase 1: 単体テスト
      await this.runUnitTests();
      
      if (this.results.unit.status === 'failed' && this.config.stopOnFailure) {
        throw new Error('単体テスト失敗のため中断');
      }
      
      // Phase 2: 統合テスト
      await this.runIntegrationTests();
      
      if (this.results.integration.status === 'failed' && this.config.stopOnFailure) {
        throw new Error('統合テスト失敗のため中断');
      }
      
      // Phase 3: E2Eテスト (オプション)
      if (!this.config.skipE2E) {
        await this.runE2ETests();
      }
      
      // Phase 4: 結果分析とレポート生成
      await this.analyzeResults();
      
      if (this.config.generateReport) {
        await this.generateComprehensiveReport();
      }
      
      this.printFinalSummary();
      
    } catch (error) {
      console.error(chalk.red.bold('❌ テスト実行中にエラーが発生:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 単体テスト実行
   */
  async runUnitTests() {
    console.log(chalk.yellow.bold('📋 Phase 1: 単体テスト実行中...'));
    const startTime = Date.now();
    
    try {
      const result = await this.executeCommand('pnpm', ['test', '--run', '--coverage']);
      
      this.results.unit = {
        status: result.exitCode === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        coverage: this.extractCoverageFromOutput(result.output),
        failedTests: this.extractFailedTests(result.output),
        output: result.output
      };
      
      console.log(chalk.green.bold(`✅ 単体テスト完了: ${this.results.unit.status}`));
      console.log(chalk.gray(`   実行時間: ${this.results.unit.duration}ms`));
      console.log(chalk.gray(`   カバレッジ: ${this.results.unit.coverage}%`));
      
    } catch (error) {
      this.results.unit.status = 'error';
      this.results.unit.error = error.message;
      console.error(chalk.red.bold('❌ 単体テスト実行エラー:'), error.message);
    }
  }

  /**
   * 統合テスト実行
   */
  async runIntegrationTests() {
    console.log(chalk.yellow.bold('🔗 Phase 2: 統合テスト実行中...'));
    const startTime = Date.now();
    
    try {
      // CUIプレイテスト実行
      const cuiResult = await this.executeCommand('node', ['cui-playtest.mjs', '--test-mode']);
      
      // ドメイン統合テスト実行
      const integrationResult = await this.executeCommand('pnpm', [
        'test', 
        '--run', 
        'src/**/*.integration.test.ts'
      ]);
      
      this.results.integration = {
        status: (cuiResult.exitCode === 0 && integrationResult.exitCode === 0) ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        failedTests: [
          ...this.extractFailedTests(cuiResult.output),
          ...this.extractFailedTests(integrationResult.output)
        ],
        cuiOutput: cuiResult.output,
        integrationOutput: integrationResult.output
      };
      
      console.log(chalk.green.bold(`✅ 統合テスト完了: ${this.results.integration.status}`));
      console.log(chalk.gray(`   実行時間: ${this.results.integration.duration}ms`));
      
    } catch (error) {
      this.results.integration.status = 'error';
      this.results.integration.error = error.message;
      console.error(chalk.red.bold('❌ 統合テスト実行エラー:'), error.message);
    }
  }

  /**
   * E2Eテスト実行
   */
  async runE2ETests() {
    console.log(chalk.yellow.bold('🌐 Phase 3: E2Eテスト実行中...'));
    const startTime = Date.now();
    
    try {
      const result = await this.executeCommand('pnpm', ['playwright', 'test']);
      
      this.results.e2e = {
        status: result.exitCode === 0 ? 'passed' : 'failed',
        duration: Date.now() - startTime,
        failedTests: this.extractPlaywrightFailures(result.output),
        output: result.output
      };
      
      console.log(chalk.green.bold(`✅ E2Eテスト完了: ${this.results.e2e.status}`));
      console.log(chalk.gray(`   実行時間: ${this.results.e2e.duration}ms`));
      
    } catch (error) {
      this.results.e2e.status = 'error';
      this.results.e2e.error = error.message;
      console.error(chalk.red.bold('❌ E2Eテスト実行エラー:'), error.message);
    }
  }

  /**
   * コマンド実行ユーティリティ
   */
  async executeCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options
      });
      
      let output = '';
      let errorOutput = '';
      
      child.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (this.config.verboseOutput) {
          console.log(chalk.gray(text.trim()));
        }
      });
      
      child.stderr?.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        if (this.config.verboseOutput) {
          console.error(chalk.red(text.trim()));
        }
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
        reject(new Error(`Command execution failed: ${error.message}`));
      });
      
      // 30秒タイムアウト
      setTimeout(() => {
        child.kill();
        reject(new Error('Command execution timeout'));
      }, 30000);
    });
  }

  /**
   * カバレッジ情報抽出
   */
  extractCoverageFromOutput(output) {
    // Vitestのカバレッジ出力から数値を抽出
    const coverageMatch = output.match(/All files\s*\|\s*(\d+(?:\.\d+)?)/);
    return coverageMatch ? parseFloat(coverageMatch[1]) : 0;
  }

  /**
   * 失敗テスト抽出
   */
  extractFailedTests(output) {
    const failures = [];
    const lines = output.split('\\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('FAIL') || line.includes('✗')) {
        // テスト名とエラー情報を抽出
        const testName = line.replace(/^.*?(FAIL|✗)\\s*/, '').trim();
        if (testName) {
          failures.push({
            name: testName,
            error: lines[i + 1] || 'No error details'
          });
        }
      }
    }
    
    return failures;
  }

  /**
   * Playwright失敗テスト抽出
   */
  extractPlaywrightFailures(output) {
    const failures = [];
    const failurePattern = /\\s*(\\d+)\\)\\s*(.+?)\\s*›.*?Error:(.*?)\\n/g;
    
    let match;
    while ((match = failurePattern.exec(output)) !== null) {
      failures.push({
        name: match[2].trim(),
        error: match[3].trim()
      });
    }
    
    return failures;
  }

  /**
   * 結果分析
   */
  async analyzeResults() {
    console.log(chalk.blue.bold('📊 テスト結果分析中...'));
    
    const totalDuration = Date.now() - this.results.overall.startTime;
    const allPassed = [
      this.results.unit.status,
      this.results.integration.status,
      this.results.e2e.status
    ].every(status => status === 'passed' || status === 'skipped');
    
    this.results.overall = {
      status: allPassed ? 'passed' : 'failed',
      totalDuration,
      testPhases: {
        unit: this.results.unit.status,
        integration: this.results.integration.status,
        e2e: this.results.e2e.status
      }
    };
    
    // 失敗パターン分析
    if (!allPassed) {
      this.analyzeFailurePatterns();
    }
  }

  /**
   * 失敗パターン分析
   */
  analyzeFailurePatterns() {
    console.log(chalk.yellow.bold('🔍 失敗パターン分析:'));
    
    const allFailures = [
      ...this.results.unit.failedTests || [],
      ...this.results.integration.failedTests || [],
      ...this.results.e2e.failedTests || []
    ];
    
    // 共通エラーパターンの検出
    const errorPatterns = {};
    allFailures.forEach(failure => {
      const errorType = this.categorizeError(failure.error);
      errorPatterns[errorType] = (errorPatterns[errorType] || 0) + 1;
    });
    
    console.log(chalk.gray('エラーカテゴリ別集計:'));
    Object.entries(errorPatterns).forEach(([pattern, count]) => {
      console.log(chalk.gray(`  ${pattern}: ${count}件`));
    });
    
    // 推奨修正アクション
    this.suggestFixActions(errorPatterns);
  }

  /**
   * エラー分類
   */
  categorizeError(errorMessage) {
    if (errorMessage.includes('TypeError') || errorMessage.includes('undefined')) {
      return 'Type/Null Reference Error';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('取得できませんでした')) {
      return 'Timeout/Performance Issue';
    } else if (errorMessage.includes('expect') || errorMessage.includes('assertion')) {
      return 'Assertion Failure';
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'Network/Resource Error';
    } else {
      return 'Other';
    }
  }

  /**
   * 修正アクション提案
   */
  suggestFixActions(errorPatterns) {
    console.log(chalk.blue.bold('💡 推奨修正アクション:'));
    
    Object.keys(errorPatterns).forEach(pattern => {
      switch (pattern) {
        case 'Type/Null Reference Error':
          console.log(chalk.cyan('  • TypeScript型定義の強化'));
          console.log(chalk.cyan('  • null/undefined チェックの追加'));
          break;
        case 'Timeout/Performance Issue':
          console.log(chalk.cyan('  • タイムアウト値の調整'));
          console.log(chalk.cyan('  • 非同期処理の最適化'));
          break;
        case 'Assertion Failure':
          console.log(chalk.cyan('  • テスト期待値の見直し'));
          console.log(chalk.cyan('  • アサーション条件の調整'));
          break;
        case 'Network/Resource Error':
          console.log(chalk.cyan('  • ネットワークモック実装'));
          console.log(chalk.cyan('  • リソース読み込み最適化'));
          break;
      }
    });
  }

  /**
   * 包括的レポート生成
   */
  async generateComprehensiveReport() {
    console.log(chalk.blue.bold('📋 包括的テストレポート生成中...'));
    
    if (!existsSync('test-results')) {
      await mkdir('test-results', { recursive: true });
    }
    
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: this.results.overall.totalDuration,
      summary: this.results.overall,
      phases: {
        unit: this.results.unit,
        integration: this.results.integration,
        e2e: this.results.e2e
      },
      recommendations: this.generateRecommendations()
    };
    
    // JSON形式のデータ
    await writeFile(
      join('test-results', `test-report-${Date.now()}.json`),
      JSON.stringify(reportData, null, 2)
    );
    
    // 人間が読みやすいMarkdown形式
    const markdownReport = this.generateMarkdownReport(reportData);
    await writeFile(
      join('test-results', `test-report-${Date.now()}.md`),
      markdownReport
    );
    
    console.log(chalk.green('✅ テストレポート生成完了'));
  }

  /**
   * 推奨事項生成
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.unit.coverage < 80) {
      recommendations.push({
        priority: 'high',
        category: 'coverage',
        message: `単体テストカバレッジが${this.results.unit.coverage}%です。80%以上を目標に改善してください。`
      });
    }
    
    if (this.results.unit.duration > 30000) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        message: '単体テスト実行時間が30秒を超えています。テスト最適化を検討してください。'
      });
    }
    
    const totalFailures = (this.results.unit.failedTests?.length || 0) +
                         (this.results.integration.failedTests?.length || 0) +
                         (this.results.e2e.failedTests?.length || 0);
    
    if (totalFailures > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'reliability',
        message: `${totalFailures}件のテスト失敗があります。優先的に修正してください。`
      });
    }
    
    return recommendations;
  }

  /**
   * Markdownレポート生成
   */
  generateMarkdownReport(data) {
    return `# 🎯 包括的テストレポート

**実行日時**: ${data.timestamp}  
**総実行時間**: ${Math.round(data.duration / 1000)}秒  
**全体結果**: ${data.summary.status === 'passed' ? '✅ 成功' : '❌ 失敗'}

## 📊 フェーズ別結果

### 🧪 単体テスト
- **ステータス**: ${data.phases.unit.status}
- **実行時間**: ${Math.round(data.phases.unit.duration / 1000)}秒
- **カバレッジ**: ${data.phases.unit.coverage}%
- **失敗テスト数**: ${data.phases.unit.failedTests?.length || 0}件

### 🔗 統合テスト  
- **ステータス**: ${data.phases.integration.status}
- **実行時間**: ${Math.round(data.phases.integration.duration / 1000)}秒
- **失敗テスト数**: ${data.phases.integration.failedTests?.length || 0}件

### 🌐 E2Eテスト
- **ステータス**: ${data.phases.e2e.status}
- **実行時間**: ${Math.round(data.phases.e2e.duration / 1000)}秒  
- **失敗テスト数**: ${data.phases.e2e.failedTests?.length || 0}件

## 💡 推奨事項

${data.recommendations.map(rec => 
  `### ${rec.priority === 'critical' ? '🚨' : rec.priority === 'high' ? '⚠️' : '💡'} ${rec.category}
${rec.message}`
).join('\\n\\n')}

## 📈 次のステップ

1. **失敗テストの修正**: 優先度の高い失敗から順次対応
2. **カバレッジ改善**: 未テスト領域の特定と追加テスト作成  
3. **パフォーマンス最適化**: 実行時間の長いテストの見直し
4. **継続的監視**: CI/CDパイプラインでの自動実行設定

---

*このレポートは統合テストオーケストレーターにより自動生成されました。*`;
  }

  /**
   * 最終サマリー出力
   */
  printFinalSummary() {
    console.log(chalk.blue.bold('\\n🎯 最終テスト結果サマリー'));
    console.log(chalk.gray('=========================================='));
    
    const totalTime = Math.round(this.results.overall.totalDuration / 1000);
    console.log(chalk.white(`総実行時間: ${totalTime}秒`));
    
    // フェーズ別結果
    const phases = [
      { name: '単体テスト', result: this.results.unit },
      { name: '統合テスト', result: this.results.integration },
      { name: 'E2Eテスト', result: this.results.e2e }
    ];
    
    phases.forEach(({ name, result }) => {
      const status = result.status;
      const color = status === 'passed' ? chalk.green : 
                   status === 'failed' ? chalk.red : 
                   chalk.yellow;
      
      const duration = result.duration ? Math.round(result.duration / 1000) : 0;
      const failures = result.failedTests?.length || 0;
      
      console.log(color(`${name}: ${status} (${duration}s, ${failures} failures)`));
    });
    
    // 全体結果
    console.log(chalk.gray('=========================================='));
    const overallColor = this.results.overall.status === 'passed' ? chalk.green.bold : chalk.red.bold;
    console.log(overallColor(`🎯 全体結果: ${this.results.overall.status.toUpperCase()}`));
    
    // 終了コード設定
    if (this.results.overall.status !== 'passed') {
      process.exitCode = 1;
    }
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new TestOrchestrator();
  orchestrator.runAllTests().catch(error => {
    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}

export default TestOrchestrator;