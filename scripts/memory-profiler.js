#!/usr/bin/env node

/**
 * メモリプロファイラー
 * 
 * アプリケーションのメモリ使用状況を詳細に分析
 */

import { performance } from 'perf_hooks';
import v8 from 'v8';
import { writeFileSync } from 'fs';

class MemoryProfiler {
  constructor() {
    this.samples = [];
    this.startTime = performance.now();
    this.gcRuns = 0;
    
    // GCイベントを監視
    if (global.gc) {
      const originalGc = global.gc;
      global.gc = () => {
        this.gcRuns++;
        originalGc();
      };
    }
  }

  /**
   * メモリサンプルを取得
   */
  takeSample(label = '') {
    const heapStats = v8.getHeapStatistics();
    const heapSpaces = v8.getHeapSpaceStatistics();
    
    const sample = {
      timestamp: performance.now() - this.startTime,
      label,
      memory: process.memoryUsage(),
      heap: {
        totalHeapSize: heapStats.total_heap_size,
        totalHeapSizeExecutable: heapStats.total_heap_size_executable,
        totalPhysicalSize: heapStats.total_physical_size,
        totalAvailableSize: heapStats.total_available_size,
        usedHeapSize: heapStats.used_heap_size,
        heapSizeLimit: heapStats.heap_size_limit,
        mallocedMemory: heapStats.malloced_memory,
        peakMallocedMemory: heapStats.peak_malloced_memory,
        doesZapGarbage: heapStats.does_zap_garbage
      },
      spaces: heapSpaces.map(space => ({
        spaceName: space.space_name,
        spaceSize: space.space_size,
        spaceUsedSize: space.space_used_size,
        spaceAvailableSize: space.space_available_size,
        physicalSpaceSize: space.physical_space_size
      })),
      gcRuns: this.gcRuns
    };
    
    this.samples.push(sample);
    return sample;
  }

  /**
   * メモリリークの検出
   */
  detectLeaks() {
    if (this.samples.length < 2) {
      return { hasLeak: false, message: 'Not enough samples' };
    }
    
    // 最初と最後のサンプルを比較
    const firstSample = this.samples[0];
    const lastSample = this.samples[this.samples.length - 1];
    
    const heapGrowth = lastSample.heap.usedHeapSize - firstSample.heap.usedHeapSize;
    const heapGrowthPercent = (heapGrowth / firstSample.heap.usedHeapSize) * 100;
    
    // 線形回帰でメモリ増加傾向を分析
    const trend = this.calculateMemoryTrend();
    
    const hasLeak = heapGrowthPercent > 50 && trend.slope > 1000; // 1KB/秒以上の増加
    
    return {
      hasLeak,
      heapGrowth,
      heapGrowthPercent,
      trend,
      message: hasLeak 
        ? `Potential memory leak detected: ${heapGrowthPercent.toFixed(2)}% growth`
        : 'No significant memory leak detected'
    };
  }

  /**
   * メモリ使用傾向を計算
   */
  calculateMemoryTrend() {
    const n = this.samples.length;
    if (n < 2) return { slope: 0, intercept: 0 };
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    
    this.samples.forEach(sample => {
      const x = sample.timestamp / 1000; // 秒に変換
      const y = sample.heap.usedHeapSize / 1024; // KBに変換
      
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  /**
   * プロファイリング結果を生成
   */
  generateReport() {
    const leakDetection = this.detectLeaks();
    
    const report = {
      summary: {
        duration: (performance.now() - this.startTime) / 1000,
        samples: this.samples.length,
        gcRuns: this.gcRuns,
        leakDetection
      },
      metrics: {
        peakHeapUsed: Math.max(...this.samples.map(s => s.heap.usedHeapSize)),
        avgHeapUsed: this.samples.reduce((sum, s) => sum + s.heap.usedHeapSize, 0) / this.samples.length,
        totalAllocated: this.samples[this.samples.length - 1]?.heap.totalHeapSize || 0
      },
      samples: this.samples,
      recommendations: this.generateRecommendations()
    };
    
    return report;
  }

  /**
   * 推奨事項を生成
   */
  generateRecommendations() {
    const recommendations = [];
    const lastSample = this.samples[this.samples.length - 1];
    
    if (!lastSample) return recommendations;
    
    // ヒープ使用率をチェック
    const heapUsagePercent = (lastSample.heap.usedHeapSize / lastSample.heap.heapSizeLimit) * 100;
    if (heapUsagePercent > 80) {
      recommendations.push({
        severity: 'high',
        message: `Heap usage is at ${heapUsagePercent.toFixed(2)}%. Consider increasing heap size or optimizing memory usage.`
      });
    }
    
    // GC頻度をチェック
    const gcFrequency = this.gcRuns / (this.samples.length / 60); // GC/分
    if (gcFrequency > 10) {
      recommendations.push({
        severity: 'medium',
        message: `High GC frequency: ${gcFrequency.toFixed(2)} runs/minute. This may impact performance.`
      });
    }
    
    // 外部メモリ使用をチェック
    if (lastSample.memory.external > 100 * 1024 * 1024) { // 100MB以上
      recommendations.push({
        severity: 'medium',
        message: `High external memory usage: ${(lastSample.memory.external / 1024 / 1024).toFixed(2)}MB`
      });
    }
    
    return recommendations;
  }

  /**
   * レポートを出力
   */
  exportReport(filename = 'memory-profile.json') {
    const report = this.generateReport();
    writeFileSync(filename, JSON.stringify(report, null, 2));
    
    // コンソールにサマリーを出力
    console.log('Memory Profile Summary:');
    console.log(`Duration: ${report.summary.duration.toFixed(2)}s`);
    console.log(`Samples: ${report.summary.samples}`);
    console.log(`GC Runs: ${report.summary.gcRuns}`);
    console.log(`Peak Heap: ${(report.metrics.peakHeapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Avg Heap: ${(report.metrics.avgHeapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Leak Detection: ${report.summary.leakDetection.message}`);
    
    if (report.recommendations.length > 0) {
      console.log('\nRecommendations:');
      report.recommendations.forEach(rec => {
        console.log(`[${rec.severity.toUpperCase()}] ${rec.message}`);
      });
    }
  }
}

// メインプロファイリング実行
async function runMemoryProfile() {
  const profiler = new MemoryProfiler();
  
  console.log('Starting memory profiling...');
  
  // 初期サンプル
  profiler.takeSample('initial');
  
  // テスト用のメモリ負荷をシミュレート
  const testDuration = parseInt(process.argv[2]) || 30000; // デフォルト30秒
  const sampleInterval = 1000; // 1秒ごとにサンプリング
  
  // 定期的にサンプルを取得
  const intervalId = setInterval(() => {
    profiler.takeSample('periodic');
  }, sampleInterval);
  
  // メモリ負荷テスト（オプション）
  if (process.argv.includes('--with-load')) {
    simulateMemoryLoad(profiler);
  }
  
  // 指定時間後に終了
  setTimeout(() => {
    clearInterval(intervalId);
    
    // 最終サンプル
    profiler.takeSample('final');
    
    // レポート生成
    profiler.exportReport('test-results/memory-profile.json');
    
    // Heap使用量とGC実行回数を出力（他のツールから読み取り用）
    console.log(`Heap used: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`GC runs: ${profiler.gcRuns}`);
    
    process.exit(0);
  }, testDuration);
}

/**
 * メモリ負荷をシミュレート
 */
function simulateMemoryLoad(profiler) {
  const arrays = [];
  let iteration = 0;
  
  const loadInterval = setInterval(() => {
    // 1MBのデータを割り当て
    arrays.push(new Array(1024 * 1024 / 8).fill(Math.random()));
    iteration++;
    
    // 10回ごとに古いデータを削除（メモリリークを防ぐ）
    if (iteration % 10 === 0) {
      arrays.splice(0, 5);
      
      // 手動GC（利用可能な場合）
      if (global.gc) {
        global.gc();
      }
    }
    
    profiler.takeSample(`load-${iteration}`);
    
    // 100MBを超えたら停止
    if (arrays.length * 1 > 100) {
      clearInterval(loadInterval);
    }
  }, 100);
}

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  runMemoryProfile().catch(console.error);
}

export default MemoryProfiler;