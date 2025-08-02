#!/usr/bin/env node

/**
 * 🎯 テスト品質監視システム
 * 
 * テストカバレッジ、実行時間、失敗率などを継続監視し、
 * 品質低下を早期検出・アラート機能を提供
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

class TestQualityMonitor {
  constructor() {
    this.metricsPath = join('test-results', 'quality-metrics.json');
    this.thresholds = {
      coverage: { warning: 80, critical: 70 },
      performance: { warning: 30000, critical: 60000 }, // ms
      reliability: { warning: 0.95, critical: 0.90 }, // success rate
      flakiness: { warning: 0.1, critical: 0.2 } // flaky test ratio
    };
    
    this.currentMetrics = {
      timestamp: Date.now(),
      coverage: { unit: 0, integration: 0, e2e: 0 },
      performance: { 
        unitAvg: 0, integrationAvg: 0, e2eAvg: 0,
        unitP95: 0, integrationP95: 0, e2eP95: 0
      },
      reliability: {
        unitSuccessRate: 0, integrationSuccessRate: 0, e2eSuccessRate: 0,
        overallSuccessRate: 0
      },
      flakiness: {
        flakyTests: [],
        flakyRatio: 0
      },
      trends: {
        coverageChange: 0,
        performanceChange: 0,
        reliabilityChange: 0
      }
    };
  }

  /**
   * メイン監視実行
   */
  async runQualityMonitoring() {
    console.log(chalk.blue.bold('📊 テスト品質監視システム開始'));
    
    try {
      // 過去のメトリクスを読み込み
      await this.loadHistoricalMetrics();
      
      // 現在のメトリクスを収集
      await this.collectCurrentMetrics();
      
      // トレンド分析
      await this.analyzeTrends();
      
      // 品質チェック実行
      const qualityStatus = await this.performQualityChecks();
      
      // アラート生成
      await this.generateAlerts(qualityStatus);
      
      // メトリクス保存
      await this.saveMetrics();
      
      // ダッシュボード生成
      await this.generateQualityDashboard();
      
      console.log(chalk.green.bold('✅ 品質監視完了'));
      
    } catch (error) {
      console.error(chalk.red.bold('❌ 品質監視エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 過去のメトリクス読み込み
   */
  async loadHistoricalMetrics() {
    if (existsSync(this.metricsPath)) {
      try {
        const data = await readFile(this.metricsPath, 'utf-8');
        this.historicalMetrics = JSON.parse(data);
        console.log(chalk.gray(`📈 過去のメトリクス読み込み: ${this.historicalMetrics.history?.length || 0}件`));
      } catch (error) {
        console.warn(chalk.yellow('⚠️ 過去メトリクス読み込み失敗、新規作成'));
        this.historicalMetrics = { history: [] };
      }
    } else {
      this.historicalMetrics = { history: [] };
    }
  }

  /**
   * 現在のメトリクス収集
   */
  async collectCurrentMetrics() {
    console.log(chalk.yellow('📊 現在のメトリクス収集中...'));
    
    // カバレッジメトリクス収集
    await this.collectCoverageMetrics();
    
    // パフォーマンスメトリクス収集
    await this.collectPerformanceMetrics();
    
    // 信頼性メトリクス収集
    await this.collectReliabilityMetrics();
    
    // フレーキネス検出
    await this.detectFlakyTests();
  }

  /**
   * カバレッジメトリクス収集
   */
  async collectCoverageMetrics() {
    // 最新のカバレッジレポートから情報を取得
    const coverageFiles = [
      'coverage/coverage-summary.json',
      'test-results/coverage-report.json'
    ];
    
    for (const filePath of coverageFiles) {
      if (existsSync(filePath)) {
        try {
          const data = await readFile(filePath, 'utf-8');
          const coverage = JSON.parse(data);
          
          // 全体カバレッジ
          if (coverage.total) {
            this.currentMetrics.coverage.unit = coverage.total.lines?.pct || 0;
            this.currentMetrics.coverage.integration = coverage.total.branches?.pct || 0;
            this.currentMetrics.coverage.e2e = coverage.total.functions?.pct || 0;
          }
          
          console.log(chalk.gray(`📋 カバレッジ: ${this.currentMetrics.coverage.unit}%`));
          break;
        } catch (error) {
          console.warn(chalk.yellow(`⚠️ カバレッジファイル読み込み失敗: ${filePath}`));
        }
      }
    }
  }

  /**
   * パフォーマンスメトリクス収集
   */
  async collectPerformanceMetrics() {
    // テスト実行時間の履歴から計算
    const performanceData = this.historicalMetrics.history.slice(-10); // 直近10回
    
    if (performanceData.length > 0) {
      const unitTimes = performanceData.map(d => d.performance?.unitAvg || 0).filter(t => t > 0);
      const integrationTimes = performanceData.map(d => d.performance?.integrationAvg || 0).filter(t => t > 0);
      const e2eTimes = performanceData.map(d => d.performance?.e2eAvg || 0).filter(t => t > 0);
      
      this.currentMetrics.performance.unitAvg = this.calculateAverage(unitTimes);
      this.currentMetrics.performance.integrationAvg = this.calculateAverage(integrationTimes);
      this.currentMetrics.performance.e2eAvg = this.calculateAverage(e2eTimes);
      
      // P95値計算
      this.currentMetrics.performance.unitP95 = this.calculatePercentile(unitTimes, 95);
      this.currentMetrics.performance.integrationP95 = this.calculatePercentile(integrationTimes, 95);
      this.currentMetrics.performance.e2eP95 = this.calculatePercentile(e2eTimes, 95);
    }
    
    console.log(chalk.gray(`⚡ 平均実行時間: Unit ${this.currentMetrics.performance.unitAvg}ms`));
  }

  /**
   * 信頼性メトリクス収集
   */
  async collectReliabilityMetrics() {
    // 最近のテスト結果から成功率を計算
    const recentResults = this.historicalMetrics.history.slice(-20);
    
    if (recentResults.length > 0) {
      const unitSuccesses = recentResults.filter(r => r.reliability?.unitSuccessRate > 0).length;
      const integrationSuccesses = recentResults.filter(r => r.reliability?.integrationSuccessRate > 0).length;
      const e2eSuccesses = recentResults.filter(r => r.reliability?.e2eSuccessRate > 0).length;
      
      this.currentMetrics.reliability.unitSuccessRate = unitSuccesses / recentResults.length;
      this.currentMetrics.reliability.integrationSuccessRate = integrationSuccesses / recentResults.length;
      this.currentMetrics.reliability.e2eSuccessRate = e2eSuccesses / recentResults.length;
      
      this.currentMetrics.reliability.overallSuccessRate = 
        (this.currentMetrics.reliability.unitSuccessRate +
         this.currentMetrics.reliability.integrationSuccessRate +
         this.currentMetrics.reliability.e2eSuccessRate) / 3;
    }
    
    console.log(chalk.gray(`🎯 全体成功率: ${(this.currentMetrics.reliability.overallSuccessRate * 100).toFixed(1)}%`));
  }

  /**
   * フレーキーテスト検出
   */
  async detectFlakyTests() {
    // テスト結果履歴からフレーキーなテストを特定
    const testHistory = {};
    
    this.historicalMetrics.history.forEach(record => {
      if (record.failedTests) {
        record.failedTests.forEach(test => {
          if (!testHistory[test.name]) {
            testHistory[test.name] = { total: 0, failures: 0 };
          }
          testHistory[test.name].total++;
          testHistory[test.name].failures++;
        });
      }
    });
    
    // フレーキネス計算（失敗率が10-90%のテストをフレーキーとみなす）
    const flakyTests = [];
    Object.entries(testHistory).forEach(([testName, stats]) => {
      const failureRate = stats.failures / stats.total;
      if (failureRate > 0.1 && failureRate < 0.9 && stats.total >= 5) {
        flakyTests.push({
          name: testName,
          failureRate: failureRate,
          occurrences: stats.total
        });
      }
    });
    
    this.currentMetrics.flakiness.flakyTests = flakyTests;
    this.currentMetrics.flakiness.flakyRatio = flakyTests.length / Object.keys(testHistory).length;
    
    console.log(chalk.gray(`🌪️  フレーキーテスト: ${flakyTests.length}件`));
  }

  /**
   * トレンド分析
   */
  async analyzeTrends() {
    console.log(chalk.yellow('📈 トレンド分析中...'));
    
    const recentHistory = this.historicalMetrics.history.slice(-5);
    if (recentHistory.length < 2) {
      console.log(chalk.gray('📊 トレンド分析には最低2回の履歴が必要'));
      return;
    }
    
    const latest = recentHistory[recentHistory.length - 1];
    const previous = recentHistory[recentHistory.length - 2];
    
    // カバレッジトレンド
    this.currentMetrics.trends.coverageChange = 
      (this.currentMetrics.coverage.unit - (latest?.coverage?.unit || 0));
    
    // パフォーマンストレンド
    this.currentMetrics.trends.performanceChange = 
      (this.currentMetrics.performance.unitAvg - (latest?.performance?.unitAvg || 0));
    
    // 信頼性トレンド
    this.currentMetrics.trends.reliabilityChange = 
      (this.currentMetrics.reliability.overallSuccessRate - (latest?.reliability?.overallSuccessRate || 0));
    
    console.log(chalk.gray(`📊 カバレッジ変化: ${this.currentMetrics.trends.coverageChange > 0 ? '+' : ''}${this.currentMetrics.trends.coverageChange.toFixed(1)}%`));
  }

  /**
   * 品質チェック実行
   */
  async performQualityChecks() {
    console.log(chalk.yellow('🔍 品質チェック実行中...'));
    
    const issues = [];
    
    // カバレッジチェック
    if (this.currentMetrics.coverage.unit < this.thresholds.coverage.critical) {
      issues.push({
        severity: 'critical',
        category: 'coverage',
        message: `単体テストカバレッジが危険水準: ${this.currentMetrics.coverage.unit}% < ${this.thresholds.coverage.critical}%`
      });
    } else if (this.currentMetrics.coverage.unit < this.thresholds.coverage.warning) {
      issues.push({
        severity: 'warning',
        category: 'coverage',
        message: `単体テストカバレッジが警告水準: ${this.currentMetrics.coverage.unit}% < ${this.thresholds.coverage.warning}%`
      });
    }
    
    // パフォーマンスチェック
    if (this.currentMetrics.performance.unitAvg > this.thresholds.performance.critical) {
      issues.push({
        severity: 'critical',
        category: 'performance',
        message: `テスト実行時間が危険水準: ${this.currentMetrics.performance.unitAvg}ms > ${this.thresholds.performance.critical}ms`
      });
    } else if (this.currentMetrics.performance.unitAvg > this.thresholds.performance.warning) {
      issues.push({
        severity: 'warning',
        category: 'performance',
        message: `テスト実行時間が警告水準: ${this.currentMetrics.performance.unitAvg}ms > ${this.thresholds.performance.warning}ms`
      });
    }
    
    // 信頼性チェック
    if (this.currentMetrics.reliability.overallSuccessRate < this.thresholds.reliability.critical) {
      issues.push({
        severity: 'critical',
        category: 'reliability',
        message: `テスト成功率が危険水準: ${(this.currentMetrics.reliability.overallSuccessRate * 100).toFixed(1)}% < ${this.thresholds.reliability.critical * 100}%`
      });
    }
    
    // フレーキネスチェック
    if (this.currentMetrics.flakiness.flakyRatio > this.thresholds.flakiness.critical) {
      issues.push({
        severity: 'critical',
        category: 'flakiness',
        message: `フレーキーテスト比率が危険水準: ${(this.currentMetrics.flakiness.flakyRatio * 100).toFixed(1)}% > ${this.thresholds.flakiness.critical * 100}%`
      });
    }
    
    return {
      status: issues.some(i => i.severity === 'critical') ? 'critical' : 
              issues.some(i => i.severity === 'warning') ? 'warning' : 'healthy',
      issues: issues,
      score: this.calculateQualityScore()
    };
  }

  /**
   * 品質スコア計算
   */
  calculateQualityScore() {
    const coverageScore = Math.min(this.currentMetrics.coverage.unit / 100, 1) * 25;
    const performanceScore = Math.max(0, (60000 - this.currentMetrics.performance.unitAvg) / 60000) * 25;
    const reliabilityScore = this.currentMetrics.reliability.overallSuccessRate * 25;
    const flakinesScore = Math.max(0, (0.2 - this.currentMetrics.flakiness.flakyRatio) / 0.2) * 25;
    
    return Math.round(coverageScore + performanceScore + reliabilityScore + flakinesScore);
  }

  /**
   * アラート生成
   */
  async generateAlerts(qualityStatus) {
    if (qualityStatus.status === 'healthy') {
      console.log(chalk.green.bold('✅ 品質状態: 良好'));
      return;
    }
    
    console.log(chalk.red.bold('🚨 品質アラートが発生しました:'));
    
    qualityStatus.issues.forEach(issue => {
      const color = issue.severity === 'critical' ? chalk.red : chalk.yellow;
      console.log(color(`  ${issue.severity.toUpperCase()}: ${issue.message}`));
    });
    
    // アラート履歴保存
    if (!existsSync('test-results')) {
      await mkdir('test-results', { recursive: true });
    }
    
    const alertData = {
      timestamp: new Date().toISOString(),
      status: qualityStatus.status,
      score: qualityStatus.score,
      issues: qualityStatus.issues
    };
    
    await writeFile(
      join('test-results', `quality-alert-${Date.now()}.json`),
      JSON.stringify(alertData, null, 2)
    );
  }

  /**
   * メトリクス保存
   */
  async saveMetrics() {
    if (!existsSync('test-results')) {
      await mkdir('test-results', { recursive: true });
    }
    
    // 履歴に追加（最新50件まで保持）
    this.historicalMetrics.history.push(this.currentMetrics);
    if (this.historicalMetrics.history.length > 50) {
      this.historicalMetrics.history = this.historicalMetrics.history.slice(-50);
    }
    
    await writeFile(this.metricsPath, JSON.stringify(this.historicalMetrics, null, 2));
    console.log(chalk.gray('💾 メトリクス保存完了'));
  }

  /**
   * 品質ダッシュボード生成
   */
  async generateQualityDashboard() {
    const dashboard = `# 🎯 テスト品質ダッシュボード

**生成日時**: ${new Date().toISOString()}
**品質スコア**: ${this.calculateQualityScore()}/100

## 📊 現在のメトリクス

### カバレッジ
- 単体テスト: ${this.currentMetrics.coverage.unit}%
- 統合テスト: ${this.currentMetrics.coverage.integration}%
- E2E: ${this.currentMetrics.coverage.e2e}%

### パフォーマンス
- 単体テスト平均: ${this.currentMetrics.performance.unitAvg}ms
- 統合テスト平均: ${this.currentMetrics.performance.integrationAvg}ms
- E2E平均: ${this.currentMetrics.performance.e2eAvg}ms

### 信頼性
- 全体成功率: ${(this.currentMetrics.reliability.overallSuccessRate * 100).toFixed(1)}%
- 単体テスト成功率: ${(this.currentMetrics.reliability.unitSuccessRate * 100).toFixed(1)}%
- 統合テスト成功率: ${(this.currentMetrics.reliability.integrationSuccessRate * 100).toFixed(1)}%

### フレーキネス
- フレーキーテスト数: ${this.currentMetrics.flakiness.flakyTests.length}件
- フレーキー比率: ${(this.currentMetrics.flakiness.flakyRatio * 100).toFixed(1)}%

## 📈 トレンド

- カバレッジ変化: ${this.currentMetrics.trends.coverageChange > 0 ? '+' : ''}${this.currentMetrics.trends.coverageChange.toFixed(1)}%
- パフォーマンス変化: ${this.currentMetrics.trends.performanceChange > 0 ? '+' : ''}${this.currentMetrics.trends.performanceChange.toFixed(0)}ms
- 信頼性変化: ${this.currentMetrics.trends.reliabilityChange > 0 ? '+' : ''}${(this.currentMetrics.trends.reliabilityChange * 100).toFixed(1)}%

## 🎯 推奨アクション

${this.generateActionRecommendations()}

---
*このダッシュボードは自動生成されました*`;

    await writeFile(
      join('test-results', 'quality-dashboard.md'),
      dashboard
    );
    
    console.log(chalk.green('📋 品質ダッシュボード生成完了'));
  }

  /**
   * アクション推奨生成
   */
  generateActionRecommendations() {
    const recommendations = [];
    
    if (this.currentMetrics.coverage.unit < 80) {
      recommendations.push('• カバレッジ向上: 単体テストの追加');
    }
    
    if (this.currentMetrics.performance.unitAvg > 30000) {
      recommendations.push('• パフォーマンス改善: テスト実行時間の最適化');
    }
    
    if (this.currentMetrics.flakiness.flakyTests.length > 0) {
      recommendations.push(`• フレーキーテスト修正: ${this.currentMetrics.flakiness.flakyTests.length}件の不安定テストを調査`);
    }
    
    if (this.currentMetrics.trends.coverageChange < -2) {
      recommendations.push('• カバレッジ回復: カバレッジが低下傾向、テスト追加が必要');
    }
    
    return recommendations.length > 0 ? recommendations.join('\\n') : '✅ 現時点で特別なアクションは不要です';
  }

  // ユーティリティメソッド
  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }

  calculatePercentile(numbers, percentile) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new TestQualityMonitor();
  monitor.runQualityMonitoring().catch(error => {
    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}

export default TestQualityMonitor;