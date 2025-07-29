#!/usr/bin/env node

import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      metrics: {},
      memoryLeaks: [],
      renderingIssues: [],
      bundleAnalysis: {},
      recommendations: []
    };
  }

  async analyze() {
    console.log(chalk.cyan('🔍 パフォーマンス分析を開始します...\n'));

    // 1. バンドルサイズ分析
    await this.analyzeBundleSize();

    // 2. ランタイムパフォーマンス分析
    await this.analyzeRuntimePerformance();

    // 3. メモリリーク検出
    await this.detectMemoryLeaks();

    // 4. レポート生成
    this.generateReport();

    console.log(chalk.green('\n✅ 分析完了！'));
  }

  async analyzeBundleSize() {
    console.log(chalk.yellow('📦 バンドルサイズ分析...'));
    
    const distPath = join(ROOT_DIR, 'dist');
    if (!existsSync(distPath)) {
      console.log(chalk.red('  ⚠️  distディレクトリが見つかりません。ビルドを実行してください。'));
      return;
    }

    // 簡易的なバンドルサイズ分析（実際の実装では rollup-plugin-visualizer などを使用）
    const { execSync } = await import('child_process');
    try {
      const output = execSync(`dir "${distPath}" /s /b`, { encoding: 'utf8' });
      const files = output.split('\n').filter(f => f.endsWith('.js') || f.endsWith('.css'));
      
      let totalSize = 0;
      const chunks = {};
      
      for (const file of files) {
        if (file && existsSync(file)) {
          const stats = await import('fs').then(fs => fs.statSync(file));
          const size = stats.size;
          totalSize += size;
          
          const fileName = file.split('\\').pop();
          if (fileName) {
            chunks[fileName] = {
              size: size,
              sizeKB: (size / 1024).toFixed(2)
            };
          }
        }
      }

      this.results.bundleAnalysis = {
        totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2),
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        chunks
      };

      console.log(chalk.green(`  ✓ 総バンドルサイズ: ${this.results.bundleAnalysis.totalSizeMB} MB`));
    } catch (error) {
      console.log(chalk.red(`  ✗ バンドルサイズ分析エラー: ${error.message}`));
    }
  }

  async analyzeRuntimePerformance() {
    console.log(chalk.yellow('\n🏃 ランタイムパフォーマンス分析...'));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // パフォーマンス計測を有効化
      await page.evaluateOnNewDocument(() => {
        window.__performanceMetrics = {
          renderTimes: [],
          gcEvents: [],
          longTasks: [],
          memorySnapshots: []
        };

        // Long Task観測
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.duration > 50) {
                window.__performanceMetrics.longTasks.push({
                  duration: entry.duration,
                  startTime: entry.startTime,
                  name: entry.name
                });
              }
            }
          });
          observer.observe({ entryTypes: ['longtask'] });
        }

        // メモリ使用量の定期記録
        setInterval(() => {
          if (performance.memory) {
            window.__performanceMetrics.memorySnapshots.push({
              timestamp: Date.now(),
              usedJSHeapSize: performance.memory.usedJSHeapSize,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
            });
          }
        }, 1000);
      });

      // 開発サーバーまたはビルド済みファイルにアクセス
      const url = existsSync(join(ROOT_DIR, 'dist', 'index.html'))
        ? `file://${join(ROOT_DIR, 'dist', 'index.html')}`
        : 'http://localhost:5173';

      console.log(chalk.blue(`  📍 URL: ${url}`));

      // ページ読み込み
      const startTime = Date.now();
      await page.goto(url, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // パフォーマンスメトリクス取得
      const metrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        const paint = performance.getEntriesByType('paint');
        
        return {
          navigation: navigation ? {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            domInteractive: navigation.domInteractive,
            domComplete: navigation.domComplete
          } : null,
          paint: paint.map(p => ({
            name: p.name,
            startTime: p.startTime
          })),
          memory: performance.memory ? {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          } : null
        };
      });

      // ゲーム開始後のパフォーマンス測定
      await page.waitForTimeout(3000); // ゲーム初期化待ち

      const gameMetrics = await page.evaluate(() => {
        return window.__performanceMetrics || {};
      });

      this.results.metrics = {
        pageLoadTime: loadTime,
        ...metrics,
        longTasks: gameMetrics.longTasks || [],
        memorySnapshots: gameMetrics.memorySnapshots || []
      };

      console.log(chalk.green(`  ✓ ページ読み込み時間: ${loadTime}ms`));
      if (metrics.paint.length > 0) {
        console.log(chalk.green(`  ✓ First Paint: ${metrics.paint[0].startTime.toFixed(2)}ms`));
      }
      if (gameMetrics.longTasks && gameMetrics.longTasks.length > 0) {
        console.log(chalk.yellow(`  ⚠️  検出されたLong Tasks: ${gameMetrics.longTasks.length}個`));
      }

    } catch (error) {
      console.log(chalk.red(`  ✗ ランタイム分析エラー: ${error.message}`));
    } finally {
      await browser.close();
    }
  }

  async detectMemoryLeaks() {
    console.log(chalk.yellow('\n💾 メモリリーク検出...'));

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      const url = existsSync(join(ROOT_DIR, 'dist', 'index.html'))
        ? `file://${join(ROOT_DIR, 'dist', 'index.html')}`
        : 'http://localhost:5173';

      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);

      // メモリプロファイリング
      const memoryBefore = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });

      // ゲーム操作のシミュレーション
      for (let i = 0; i < 10; i++) {
        await page.evaluate(() => {
          // ゲーム内でカードを生成・破棄
          const event = new CustomEvent('test:memory-leak', { detail: { iteration: i } });
          window.dispatchEvent(event);
        });
        await page.waitForTimeout(500);
      }

      // GC実行
      await page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });

      await page.waitForTimeout(2000);

      const memoryAfter = await page.evaluate(() => {
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });

      if (memoryBefore && memoryAfter) {
        const heapGrowth = memoryAfter.usedJSHeapSize - memoryBefore.usedJSHeapSize;
        const heapGrowthMB = (heapGrowth / 1024 / 1024).toFixed(2);
        
        if (heapGrowth > 5 * 1024 * 1024) { // 5MB以上の増加
          this.results.memoryLeaks.push({
            severity: 'high',
            description: `操作後のヒープサイズが${heapGrowthMB}MB増加`,
            before: memoryBefore.usedJSHeapSize,
            after: memoryAfter.usedJSHeapSize
          });
          console.log(chalk.red(`  ✗ メモリリークの可能性: ${heapGrowthMB}MB増加`));
        } else {
          console.log(chalk.green(`  ✓ メモリ使用量は正常範囲内`));
        }
      }

    } catch (error) {
      console.log(chalk.red(`  ✗ メモリリーク検出エラー: ${error.message}`));
    } finally {
      await browser.close();
    }
  }

  generateReport() {
    // 推奨事項の生成
    this.generateRecommendations();

    // レポートディレクトリ作成
    const reportDir = join(ROOT_DIR, 'performance-reports');
    if (!existsSync(reportDir)) {
      mkdirSync(reportDir, { recursive: true });
    }

    // レポートファイル生成
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = join(reportDir, `performance-report-${timestamp}.json`);
    writeFileSync(reportPath, JSON.stringify(this.results, null, 2));

    // Markdown形式のサマリー生成
    const summaryPath = join(reportDir, `performance-summary-${timestamp}.md`);
    const summary = this.generateMarkdownSummary();
    writeFileSync(summaryPath, summary);

    console.log(chalk.cyan(`\n📊 レポート生成完了:`));
    console.log(chalk.gray(`  - JSON: ${reportPath}`));
    console.log(chalk.gray(`  - サマリー: ${summaryPath}`));
  }

  generateRecommendations() {
    const { metrics, bundleAnalysis, memoryLeaks } = this.results;

    // バンドルサイズの推奨事項
    if (bundleAnalysis.totalSizeMB > 2) {
      this.results.recommendations.push({
        category: 'bundle-size',
        priority: 'high',
        issue: `バンドルサイズが大きい (${bundleAnalysis.totalSizeMB}MB)`,
        solution: 'コード分割の実装、不要な依存関係の削除、tree-shakingの最適化'
      });
    }

    // ページ読み込み時間の推奨事項
    if (metrics.pageLoadTime > 3000) {
      this.results.recommendations.push({
        category: 'load-time',
        priority: 'high',
        issue: `ページ読み込み時間が遅い (${metrics.pageLoadTime}ms)`,
        solution: 'リソースの遅延読み込み、CDN活用、圧縮の最適化'
      });
    }

    // Long Tasksの推奨事項
    if (metrics.longTasks && metrics.longTasks.length > 5) {
      this.results.recommendations.push({
        category: 'rendering',
        priority: 'medium',
        issue: `Long Tasksが多い (${metrics.longTasks.length}個)`,
        solution: 'requestAnimationFrameの活用、処理の分割、Web Workersの検討'
      });
    }

    // メモリリークの推奨事項
    if (memoryLeaks.length > 0) {
      this.results.recommendations.push({
        category: 'memory',
        priority: 'high',
        issue: 'メモリリークの可能性',
        solution: 'イベントリスナーの適切な解除、未使用オブジェクトの削除、WeakMapの活用'
      });
    }
  }

  generateMarkdownSummary() {
    const { metrics, bundleAnalysis, memoryLeaks, recommendations } = this.results;

    let summary = `# パフォーマンス分析レポート

生成日時: ${new Date(this.results.timestamp).toLocaleString('ja-JP')}

## 📊 概要

### バンドルサイズ
- **総サイズ**: ${bundleAnalysis.totalSizeMB || 'N/A'} MB
- **チャンク数**: ${Object.keys(bundleAnalysis.chunks || {}).length}

### ページパフォーマンス
- **読み込み時間**: ${metrics.pageLoadTime || 'N/A'}ms
- **First Paint**: ${metrics.paint?.[0]?.startTime?.toFixed(2) || 'N/A'}ms
- **Long Tasks**: ${metrics.longTasks?.length || 0}個

### メモリ使用状況
- **メモリリーク検出**: ${memoryLeaks.length > 0 ? '⚠️ あり' : '✅ なし'}
`;

    if (recommendations.length > 0) {
      summary += `\n## 🔧 推奨事項\n\n`;
      const priorityOrder = { high: 1, medium: 2, low: 3 };
      const sortedRecommendations = recommendations.sort((a, b) => 
        priorityOrder[a.priority] - priorityOrder[b.priority]
      );

      for (const rec of sortedRecommendations) {
        const priorityEmoji = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        summary += `### ${priorityEmoji} ${rec.issue}\n`;
        summary += `- **カテゴリ**: ${rec.category}\n`;
        summary += `- **優先度**: ${rec.priority}\n`;
        summary += `- **解決策**: ${rec.solution}\n\n`;
      }
    }

    if (bundleAnalysis.chunks) {
      summary += `\n## 📦 チャンク詳細\n\n`;
      summary += `| ファイル | サイズ (KB) |\n`;
      summary += `|----------|------------|\n`;
      const sortedChunks = Object.entries(bundleAnalysis.chunks)
        .sort((a, b) => b[1].size - a[1].size)
        .slice(0, 10);
      
      for (const [name, info] of sortedChunks) {
        summary += `| ${name} | ${info.sizeKB} |\n`;
      }
    }

    return summary;
  }
}

// メイン実行
const analyzer = new PerformanceAnalyzer();
analyzer.analyze().catch(console.error);