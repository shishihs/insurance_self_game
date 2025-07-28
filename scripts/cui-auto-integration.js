#!/usr/bin/env node

/**
 * 🎮 CUI自動統合システム
 * 
 * CUIプレイテストと他のテストシステムを自動連携し、
 * ゲームバランス分析・回帰テスト・品質保証を統合実行
 */

import { spawn } from 'child_process';
import { writeFile, readFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

class CUIAutoIntegration {
  constructor() {
    this.config = {
      playtestRuns: parseInt(process.env.CUI_PLAYTEST_RUNS) || 5,
      analysisMode: process.argv.includes('--analysis'),
      regressionMode: process.argv.includes('--regression'),
      continuousMode: process.argv.includes('--continuous'),
      verboseOutput: process.argv.includes('--verbose'),
      outputDir: 'test-results/cui-integration'
    };
    
    this.integrationResults = {
      timestamp: Date.now(),
      playtestResults: [],
      balanceAnalysis: {},
      regressionDetection: {},
      qualityMetrics: {},
      recommendations: []
    };
  }

  /**
   * メイン統合実行
   */
  async runAutoIntegration() {
    console.log(chalk.blue.bold('🔄 CUI自動統合システム開始'));
    console.log(chalk.gray(`設定: ${JSON.stringify(this.config, null, 2)}`));
    
    try {
      // 出力ディレクトリ準備
      await this.prepareOutputDirectory();
      
      // Phase 1: CUIプレイテスト実行
      await this.runBatchPlaytests();
      
      // Phase 2: ゲームバランス分析
      if (this.config.analysisMode) {
        await this.performBalanceAnalysis();
      }
      
      // Phase 3: 回帰テスト実行
      if (this.config.regressionMode) {
        await this.performRegressionTesting();
      }
      
      // Phase 4: 品質メトリクス統合
      await this.integrateQualityMetrics();
      
      // Phase 5: 自動推奨事項生成
      await this.generateRecommendations();
      
      // Phase 6: 統合レポート生成
      await this.generateIntegratedReport();
      
      // Phase 7: 継続監視モード
      if (this.config.continuousMode) {
        await this.startContinuousMonitoring();
      } else {
        console.log(chalk.green.bold('✅ CUI自動統合完了'));
      }
      
    } catch (error) {
      console.error(chalk.red.bold('❌ CUI統合エラー:'), error.message);
      process.exit(1);
    }
  }

  /**
   * 出力ディレクトリ準備
   */
  async prepareOutputDirectory() {
    if (!existsSync(this.config.outputDir)) {
      await mkdir(this.config.outputDir, { recursive: true });
    }
    
    // セッション用サブディレクトリ作成
    this.sessionDir = join(this.config.outputDir, `session-${Date.now()}`);
    await mkdir(this.sessionDir, { recursive: true });
    
    console.log(chalk.gray(`📁 出力ディレクトリ: ${this.sessionDir}`));
  }

  /**
   * バッチプレイテスト実行
   */
  async runBatchPlaytests() {
    console.log(chalk.yellow.bold(`🎮 CUIプレイテスト ${this.config.playtestRuns}回実行中...`));
    
    const playtestPromises = [];
    
    for (let i = 0; i < this.config.playtestRuns; i++) {
      playtestPromises.push(this.runSinglePlaytest(i + 1));
    }
    
    // 並列実行（最大3並列）
    const batchSize = 3;
    for (let i = 0; i < playtestPromises.length; i += batchSize) {
      const batch = playtestPromises.slice(i, i + batchSize);
      const results = await Promise.all(batch);
      this.integrationResults.playtestResults.push(...results);
      
      console.log(chalk.gray(`📊 進捗: ${Math.min(i + batchSize, this.config.playtestRuns)}/${this.config.playtestRuns}`));
    }
    
    console.log(chalk.green(`✅ プレイテスト完了: ${this.integrationResults.playtestResults.length}件`));
  }

  /**
   * 単一プレイテスト実行
   */
  async runSinglePlaytest(runNumber) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const outputLines = [];
      const errorLines = [];
      
      const cuiProcess = spawn('node', ['cui-playtest.mjs', '--batch-mode'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      cuiProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        outputLines.push(text);
        if (this.config.verboseOutput) {
          console.log(chalk.gray(`[${runNumber}] ${text.trim()}`));
        }
      });
      
      cuiProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        errorLines.push(text);
      });
      
      cuiProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        const output = outputLines.join('');
        
        // プレイテスト結果を解析
        const result = this.parsePlaytestOutput(output, runNumber, duration, code === 0);
        resolve(result);
      });
      
      cuiProcess.on('error', () => {
        resolve({
          runNumber,
          success: false,
          duration: Date.now() - startTime,
          error: 'Process execution failed'
        });
      });
      
      // 30秒タイムアウト
      setTimeout(() => {
        cuiProcess.kill();
        resolve({
          runNumber,
          success: false,
          duration: 30000,
          error: 'Timeout'
        });
      }, 30000);
    });
  }

  /**
   * プレイテスト出力解析
   */
  parsePlaytestOutput(output, runNumber, duration, success) {
    const result = {
      runNumber,
      success,
      duration,
      timestamp: Date.now(),
      gameMetrics: {}
    };
    
    try {
      // 活力情報抽出
      const vitalityMatch = output.match(/最終活力[：:]\\s*(\\d+)/);
      if (vitalityMatch) {
        result.gameMetrics.finalVitality = parseInt(vitalityMatch[1]);
      }
      
      // ターン数抽出
      const turnsMatch = output.match(/合計ターン[：:]\\s*(\\d+)|ターン\\s*(\\d+)/);
      if (turnsMatch) {
        result.gameMetrics.totalTurns = parseInt(turnsMatch[1] || turnsMatch[2]);
      }
      
      // 成功チャレンジ数抽出
      const challengesMatch = output.match(/成功チャレンジ[：:]\\s*(\\d+)/);
      if (challengesMatch) {
        result.gameMetrics.successfulChallenges = parseInt(challengesMatch[1]);
      }
      
      // 保険カード数抽出
      const insuranceMatch = output.match(/保険カード[：:]\\s*(\\d+)/);
      if (insuranceMatch) {
        result.gameMetrics.insuranceCards = parseInt(insuranceMatch[1]);
      }
      
      // ゲーム結果抽出
      if (output.includes('ゲームクリア') || output.includes('勝利')) {
        result.gameMetrics.outcome = 'victory';
      } else if (output.includes('ゲームオーバー') || output.includes('敗北')) {
        result.gameMetrics.outcome = 'defeat';
      } else {
        result.gameMetrics.outcome = 'unknown';
      }
      
    } catch (error) {
      result.parseError = error.message;
    }
    
    return result;
  }

  /**
   * ゲームバランス分析
   */
  async performBalanceAnalysis() {
    console.log(chalk.yellow.bold('⚖️ ゲームバランス分析中...'));
    
    const validResults = this.integrationResults.playtestResults.filter(r => r.success && r.gameMetrics);
    
    if (validResults.length === 0) {
      console.warn(chalk.yellow('⚠️ 有効なプレイテスト結果がありません'));
      return;
    }
    
    // 基本統計
    const vitalityValues = validResults.map(r => r.gameMetrics.finalVitality).filter(v => v !== undefined);
    const turnValues = validResults.map(r => r.gameMetrics.totalTurns).filter(v => v !== undefined);
    const outcomeStats = {};
    
    validResults.forEach(r => {
      const outcome = r.gameMetrics.outcome || 'unknown';
      outcomeStats[outcome] = (outcomeStats[outcome] || 0) + 1;
    });
    
    this.integrationResults.balanceAnalysis = {
      totalRuns: validResults.length,
      vitality: {
        average: this.calculateAverage(vitalityValues),
        median: this.calculateMedian(vitalityValues),
        min: Math.min(...vitalityValues),
        max: Math.max(...vitalityValues),
        standardDeviation: this.calculateStandardDeviation(vitalityValues)
      },
      turns: {
        average: this.calculateAverage(turnValues),
        median: this.calculateMedian(turnValues),
        min: Math.min(...turnValues),
        max: Math.max(...turnValues)
      },
      outcomes: outcomeStats,
      winRate: (outcomeStats.victory || 0) / validResults.length,
      balanceScore: this.calculateBalanceScore(validResults)
    };
    
    console.log(chalk.green(`✅ バランス分析完了: 勝率 ${(this.integrationResults.balanceAnalysis.winRate * 100).toFixed(1)}%`));
  }

  /**
   * バランススコア計算
   */
  calculateBalanceScore(results) {
    const winRate = this.integrationResults.balanceAnalysis.winRate;
    const vitalityVariance = this.integrationResults.balanceAnalysis.vitality.standardDeviation;
    const turnVariance = this.integrationResults.balanceAnalysis.turns.standardDeviation;
    
    // 理想的なバランス: 勝率50-70%, 低い分散
    let score = 100;
    
    // 勝率スコア (50-70%が理想)
    if (winRate < 0.3 || winRate > 0.8) {
      score -= 30;
    } else if (winRate < 0.4 || winRate > 0.7) {
      score -= 15;
    }
    
    // 分散スコア (一貫性)
    if (vitalityVariance > 20) {
      score -= 20;
    }
    if (turnVariance > 5) {
      score -= 15;
    }
    
    return Math.max(0, score);
  }

  /**
   * 回帰テスト実行
   */
  async performRegressionTesting() {
    console.log(chalk.yellow.bold('🔄 回帰テスト実行中...'));
    
    try {
      // 過去のベースライン結果を読み込み
      const baselineFile = join(this.config.outputDir, 'baseline-results.json');
      let baseline = null;
      
      if (existsSync(baselineFile)) {
        const baselineData = await readFile(baselineFile, 'utf-8');
        baseline = JSON.parse(baselineData);
        console.log(chalk.gray(`📊 ベースライン読み込み: ${baseline.timestamp}`));
      }
      
      // 現在の結果と比較
      const regressionResults = {
        hasBaseline: !!baseline,
        comparisons: {},
        regressionDetected: false,
        improvements: [],
        degradations: []
      };
      
      if (baseline && baseline.balanceAnalysis) {
        // 勝率の比較
        const winRateChange = this.integrationResults.balanceAnalysis.winRate - baseline.balanceAnalysis.winRate;
        regressionResults.comparisons.winRate = {
          current: this.integrationResults.balanceAnalysis.winRate,
          baseline: baseline.balanceAnalysis.winRate,
          change: winRateChange,
          significant: Math.abs(winRateChange) > 0.1
        };
        
        // 平均活力比較
        const vitalityChange = this.integrationResults.balanceAnalysis.vitality.average - baseline.balanceAnalysis.vitality.average;
        regressionResults.comparisons.vitality = {
          current: this.integrationResults.balanceAnalysis.vitality.average,
          baseline: baseline.balanceAnalysis.vitality.average,
          change: vitalityChange,
          significant: Math.abs(vitalityChange) > 5
        };
        
        // 回帰/改善判定
        if (winRateChange < -0.1) {
          regressionResults.degradations.push('勝率が大幅に低下');
          regressionResults.regressionDetected = true;
        } else if (winRateChange > 0.1) {
          regressionResults.improvements.push('勝率が改善');
        }
        
        if (vitalityChange < -5) {
          regressionResults.degradations.push('平均活力が低下');
          regressionResults.regressionDetected = true;
        } else if (vitalityChange > 5) {
          regressionResults.improvements.push('平均活力が改善');
        }
      }
      
      this.integrationResults.regressionDetection = regressionResults;
      
      // 現在の結果をベースラインとして保存
      await writeFile(baselineFile, JSON.stringify(this.integrationResults, null, 2));
      
      if (regressionResults.regressionDetected) {
        console.log(chalk.red.bold('🚨 回帰が検出されました'));
        regressionResults.degradations.forEach(d => {
          console.log(chalk.red(`  • ${d}`));
        });
      } else {
        console.log(chalk.green('✅ 回帰テスト: 問題なし'));
      }
      
    } catch (error) {
      console.error(chalk.red('❌ 回帰テスト実行エラー:'), error.message);
    }
  }

  /**
   * 品質メトリクス統合
   */
  async integrateQualityMetrics() {
    console.log(chalk.yellow.bold('📊 品質メトリクス統合中...'));
    
    // CUIプレイテストの品質メトリクス
    const validRuns = this.integrationResults.playtestResults.filter(r => r.success);
    const failedRuns = this.integrationResults.playtestResults.filter(r => !r.success);
    
    this.integrationResults.qualityMetrics = {
      cui: {
        successRate: validRuns.length / this.integrationResults.playtestResults.length,
        averageExecutionTime: this.calculateAverage(
          this.integrationResults.playtestResults.map(r => r.duration)
        ),
        reliability: validRuns.length / this.config.playtestRuns,
        consistency: this.calculateConsistencyScore(validRuns)
      },
      integration: {
        balanceScore: this.integrationResults.balanceAnalysis.balanceScore || 0,
        coverageEquivalent: this.estimateCUITestCoverage(),
        regressionRisk: this.integrationResults.regressionDetection.regressionDetected ? 'high' : 'low'
      }
    };
    
    console.log(chalk.green('✅ 品質メトリクス統合完了'));
    console.log(chalk.gray(`   CUI成功率: ${(this.integrationResults.qualityMetrics.cui.successRate * 100).toFixed(1)}%`));
    console.log(chalk.gray(`   バランススコア: ${this.integrationResults.qualityMetrics.integration.balanceScore}/100`));
  }

  /**
   * 一貫性スコア計算
   */
  calculateConsistencyScore(results) {
    if (results.length < 2) return 100;
    
    const vitalityValues = results.map(r => r.gameMetrics.finalVitality).filter(v => v !== undefined);
    const turnValues = results.map(r => r.gameMetrics.totalTurns).filter(v => v !== undefined);
    
    const vitalityCV = this.calculateCoefficientOfVariation(vitalityValues);
    const turnCV = this.calculateCoefficientOfVariation(turnValues);
    
    // 変動係数が低いほど一貫性が高い
    const consistencyScore = Math.max(0, 100 - (vitalityCV + turnCV) * 10);
    return Math.round(consistencyScore);
  }

  /**
   * CUIテストカバレッジ推定
   */
  estimateCUITestCoverage() {
    // プレイテスト結果から機能カバレッジを推定
    const validResults = this.integrationResults.playtestResults.filter(r => r.success && r.gameMetrics);
    
    let coverageScore = 0;
    
    // 基本ゲームフロー
    if (validResults.some(r => r.gameMetrics.totalTurns > 0)) {
      coverageScore += 20; // ゲーム進行
    }
    
    // チャレンジシステム
    if (validResults.some(r => r.gameMetrics.successfulChallenges > 0)) {
      coverageScore += 20;
    }
    
    // 保険システム
    if (validResults.some(r => r.gameMetrics.insuranceCards > 0)) {
      coverageScore += 20;
    }
    
    // 勝利条件
    if (validResults.some(r => r.gameMetrics.outcome === 'victory')) {
      coverageScore += 15;
    }
    
    // 敗北条件
    if (validResults.some(r => r.gameMetrics.outcome === 'defeat')) {
      coverageScore += 15;
    }
    
    // 多様性 (結果のバリエーション)
    const uniqueOutcomes = new Set(validResults.map(r => r.gameMetrics.outcome)).size;
    if (uniqueOutcomes > 1) {
      coverageScore += 10;
    }
    
    return Math.min(100, coverageScore);
  }

  /**
   * 自動推奨事項生成
   */
  async generateRecommendations() {
    console.log(chalk.yellow.bold('💡 推奨事項生成中...'));
    
    const recommendations = [];
    
    // バランス関連推奨
    if (this.integrationResults.balanceAnalysis.winRate < 0.3) {
      recommendations.push({
        priority: 'high',
        category: 'balance',
        issue: '勝率が低すぎる',
        recommendation: 'ゲーム難易度を下げるか、プレイヤー支援機能を強化する',
        data: `現在の勝率: ${(this.integrationResults.balanceAnalysis.winRate * 100).toFixed(1)}%`
      });
    } else if (this.integrationResults.balanceAnalysis.winRate > 0.8) {
      recommendations.push({
        priority: 'medium',
        category: 'balance',
        issue: '勝率が高すぎる',
        recommendation: 'ゲーム難易度を上げるか、チャレンジ要素を追加する',
        data: `現在の勝率: ${(this.integrationResults.balanceAnalysis.winRate * 100).toFixed(1)}%`
      });
    }
    
    // 品質関連推奨
    if (this.integrationResults.qualityMetrics.cui.successRate < 0.9) {
      recommendations.push({
        priority: 'high',
        category: 'quality',
        issue: 'CUIプレイテストの成功率が低い',
        recommendation: 'エラーハンドリングの改善とタイムアウト調整が必要',
        data: `成功率: ${(this.integrationResults.qualityMetrics.cui.successRate * 100).toFixed(1)}%`
      });
    }
    
    // 回帰関連推奨
    if (this.integrationResults.regressionDetection.regressionDetected) {
      recommendations.push({
        priority: 'critical',
        category: 'regression',
        issue: '回帰が検出されました',
        recommendation: '検出された劣化要因を調査し、修正が必要',
        data: this.integrationResults.regressionDetection.degradations.join(', ')
      });
    }
    
    // パフォーマンス関連推奨
    const avgExecutionTime = this.integrationResults.qualityMetrics.cui.averageExecutionTime;
    if (avgExecutionTime > 15000) {
      recommendations.push({
        priority: 'medium',
        category: 'performance',
        issue: 'CUI実行時間が長い',
        recommendation: 'プレイテスト実行速度の最適化を検討',
        data: `平均実行時間: ${Math.round(avgExecutionTime / 1000)}秒`
      });
    }
    
    this.integrationResults.recommendations = recommendations;
    
    console.log(chalk.green(`✅ 推奨事項生成完了: ${recommendations.length}件`));
    
    // 重要な推奨事項を表示
    recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').forEach(r => {
      const color = r.priority === 'critical' ? chalk.red : chalk.yellow;
      console.log(color(`  ${r.priority.toUpperCase()}: ${r.issue} - ${r.recommendation}`));
    });
  }

  /**
   * 統合レポート生成
   */
  async generateIntegratedReport() {
    console.log(chalk.yellow.bold('📋 統合レポート生成中...'));
    
    const reportPath = join(this.sessionDir, 'cui-integration-report.md');
    const jsonPath = join(this.sessionDir, 'cui-integration-data.json');
    
    // 詳細データ保存
    await writeFile(jsonPath, JSON.stringify(this.integrationResults, null, 2));
    
    // 人間向けMarkdownレポート生成
    const report = this.generateMarkdownReport();
    await writeFile(reportPath, report);
    
    console.log(chalk.green('✅ 統合レポート生成完了'));
    console.log(chalk.gray(`   Markdown: ${reportPath}`));
    console.log(chalk.gray(`   JSON: ${jsonPath}`));
  }

  /**
   * Markdownレポート生成
   */
  generateMarkdownReport() {
    const balanceAnalysis = this.integrationResults.balanceAnalysis;
    const qualityMetrics = this.integrationResults.qualityMetrics;
    
    return `# 🎮 CUI自動統合レポート

**実行日時**: ${new Date(this.integrationResults.timestamp).toISOString()}  
**プレイテスト実行数**: ${this.config.playtestRuns}回  
**成功実行数**: ${this.integrationResults.playtestResults.filter(r => r.success).length}回

## 📊 ゲームバランス分析

### 基本統計
- **勝率**: ${(balanceAnalysis.winRate * 100).toFixed(1)}%
- **平均最終活力**: ${balanceAnalysis.vitality.average.toFixed(1)}
- **平均ターン数**: ${balanceAnalysis.turns.average.toFixed(1)}
- **バランススコア**: ${balanceAnalysis.balanceScore}/100

### 結果分布
${Object.entries(balanceAnalysis.outcomes).map(([outcome, count]) => 
  `- ${outcome}: ${count}回 (${((count / balanceAnalysis.totalRuns) * 100).toFixed(1)}%)`
).join('\\n')}

## 🎯 品質メトリクス

### CUI実行品質
- **成功率**: ${(qualityMetrics.cui.successRate * 100).toFixed(1)}%
- **平均実行時間**: ${Math.round(qualityMetrics.cui.averageExecutionTime / 1000)}秒
- **一貫性スコア**: ${qualityMetrics.cui.consistency}/100

### 統合品質
- **推定カバレッジ**: ${qualityMetrics.integration.coverageEquivalent}%
- **回帰リスク**: ${qualityMetrics.integration.regressionRisk}

## 🔄 回帰テスト結果

${this.integrationResults.regressionDetection.hasBaseline ? 
  `### ベースライン比較
${this.integrationResults.regressionDetection.regressionDetected ? 
  '🚨 **回帰が検出されました**\\n\\n' + 
  this.integrationResults.regressionDetection.degradations.map(d => `- ❌ ${d}`).join('\\n') : 
  '✅ **回帰は検出されませんでした**'
}

${this.integrationResults.regressionDetection.improvements.length > 0 ? 
  '### 改善点\\n' + 
  this.integrationResults.regressionDetection.improvements.map(i => `- ✅ ${i}`).join('\\n') : ''
}` : 
  '⚠️ ベースラインが存在しないため、回帰テストはスキップされました'
}

## 💡 推奨事項

${this.integrationResults.recommendations.length > 0 ?
  this.integrationResults.recommendations.map(r => 
    `### ${r.priority === 'critical' ? '🚨' : r.priority === 'high' ? '⚠️' : '💡'} ${r.category} - ${r.issue}
**推奨対応**: ${r.recommendation}  
**データ**: ${r.data}
`).join('\\n') :
  '✅ 現時点で特別な対応は不要です'
}

## 📈 次のステップ

1. **高優先度問題への対応**: ${this.integrationResults.recommendations.filter(r => r.priority === 'critical' || r.priority === 'high').length}件
2. **継続監視の設定**: 定期実行による品質維持
3. **ベースライン更新**: 改善後の新しい基準値設定

---

*このレポートはCUI自動統合システムにより生成されました*`;
  }

  /**
   * 継続監視モード開始
   */
  async startContinuousMonitoring() {
    console.log(chalk.blue.bold('🔄 継続監視モード開始'));
    console.log(chalk.gray('Ctrl+Cで終了'));
    
    const monitoringInterval = 30 * 60 * 1000; // 30分間隔
    
    const runMonitoring = async () => {
      try {
        console.log(chalk.yellow(`🔍 監視実行: ${new Date().toLocaleString()}`));
        
        // 軽量版プレイテスト実行
        this.config.playtestRuns = 3;
        await this.runBatchPlaytests();
        await this.performBalanceAnalysis();
        
        // 品質劣化検出
        const currentWinRate = this.integrationResults.balanceAnalysis.winRate;
        if (currentWinRate < 0.2 || currentWinRate > 0.9) {
          console.log(chalk.red.bold('🚨 品質劣化を検出！詳細分析を実行してください'));
        }
        
      } catch (error) {
        console.error(chalk.red('監視実行エラー:'), error.message);
      }
    };
    
    // 初回実行
    await runMonitoring();
    
    // 定期実行設定
    const intervalId = setInterval(runMonitoring, monitoringInterval);
    
    // 終了処理
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      console.log(chalk.blue('\\n継続監視を終了しました'));
      process.exit(0);
    });
  }

  // ユーティリティメソッド
  calculateAverage(numbers) {
    return numbers.length > 0 ? numbers.reduce((a, b) => a + b, 0) / numbers.length : 0;
  }

  calculateMedian(numbers) {
    if (numbers.length === 0) return 0;
    const sorted = numbers.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  calculateStandardDeviation(numbers) {
    if (numbers.length === 0) return 0;
    const avg = this.calculateAverage(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    const avgSquareDiff = this.calculateAverage(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  calculateCoefficientOfVariation(numbers) {
    const avg = this.calculateAverage(numbers);
    const std = this.calculateStandardDeviation(numbers);
    return avg > 0 ? (std / avg) * 100 : 0;
  }
}

// メイン実行
if (import.meta.url === `file://${process.argv[1]}`) {
  const integration = new CUIAutoIntegration();
  integration.runAutoIntegration().catch(error => {
    console.error(chalk.red.bold('Fatal error:'), error);
    process.exit(1);
  });
}

export default CUIAutoIntegration;