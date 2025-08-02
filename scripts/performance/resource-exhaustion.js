#!/usr/bin/env node

/**
 * リソース枯渇テスト
 * 
 * メモリやCPUリソースを意図的に消費して
 * システムの安定性をテスト
 */

import { performance } from 'perf_hooks';
import { cpus } from 'os';

// コマンドライン引数を解析
const args = process.argv.slice(2);
const testType = args[args.indexOf('--type') + 1] || 'memory';
const limit = args[args.indexOf('--limit') + 1] || '1GB';
const duration = args[args.indexOf('--duration') + 1] || '10s';

/**
 * メモリ枯渇テスト
 */
async function memoryExhaustionTest() {
  console.log(`Starting memory exhaustion test (limit: ${limit})`);
  
  const limitBytes = parseSize(limit);
  const chunks = [];
  let totalAllocated = 0;
  const chunkSize = 10 * 1024 * 1024; // 10MB chunks
  
  const startTime = performance.now();
  
  try {
    while (totalAllocated < limitBytes) {
      // 10MBのバッファを割り当て
      const buffer = Buffer.alloc(chunkSize);
      
      // ランダムデータで埋める（最適化を防ぐため）
      for (let i = 0; i < buffer.length; i += 1024) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      
      chunks.push(buffer);
      totalAllocated += chunkSize;
      
      // 進捗表示
      if (chunks.length % 10 === 0) {
        const usedMB = totalAllocated / (1024 * 1024);
        const memUsage = process.memoryUsage();
        console.log(`Allocated: ${usedMB.toFixed(0)}MB, RSS: ${(memUsage.rss / 1024 / 1024).toFixed(0)}MB`);
      }
      
      // 小さな遅延（システムの応答性を保つ）
      if (chunks.length % 50 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
    
    const elapsedTime = performance.now() - startTime;
    
    console.log(`Memory exhaustion test completed successfully`);
    console.log(`Total allocated: ${(totalAllocated / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Time taken: ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`Allocation rate: ${(totalAllocated / elapsedTime * 1000 / 1024 / 1024).toFixed(2)}MB/s`);
    
    // メモリを解放
    chunks.length = 0;
    
    // GCを促す
    if (global.gc) {
      global.gc();
    }
    
    return { success: true, allocated: totalAllocated, duration: elapsedTime };
    
  } catch (error) {
    console.error(`Memory exhaustion test failed: ${error.message}`);
    return { success: false, error: error.message, allocated: totalAllocated };
  }
}

/**
 * CPU負荷テスト
 */
async function cpuExhaustionTest() {
  console.log(`Starting CPU exhaustion test (duration: ${duration})`);
  
  const durationMs = parseTime(duration);
  const numCores = cpus().length;
  const workers = [];
  
  const startTime = performance.now();
  
  // 各CPUコアに対してワーカーを起動
  for (let i = 0; i < numCores; i++) {
    workers.push(cpuWorker(i, durationMs));
  }
  
  // 定期的にCPU使用率を報告
  const reportInterval = setInterval(() => {
    const elapsed = performance.now() - startTime;
    const progress = (elapsed / durationMs * 100).toFixed(1);
    console.log(`CPU test progress: ${progress}% (${(elapsed / 1000).toFixed(1)}s / ${(durationMs / 1000).toFixed(1)}s)`);
  }, 1000);
  
  // すべてのワーカーが完了するまで待つ
  const results = await Promise.all(workers);
  clearInterval(reportInterval);
  
  const totalOperations = results.reduce((sum, r) => sum + r.operations, 0);
  const actualDuration = performance.now() - startTime;
  
  console.log(`CPU exhaustion test completed`);
  console.log(`Total operations: ${totalOperations.toLocaleString()}`);
  console.log(`Operations/second: ${(totalOperations / actualDuration * 1000).toFixed(0)}`);
  console.log(`Actual duration: ${(actualDuration / 1000).toFixed(2)}s`);
  
  return {
    success: true,
    operations: totalOperations,
    duration: actualDuration,
    cores: numCores
  };
}

/**
 * CPUワーカー
 */
async function cpuWorker(workerId, durationMs) {
  const startTime = performance.now();
  let operations = 0;
  
  // 素数計算による CPU 負荷
  while (performance.now() - startTime < durationMs) {
    // 素数判定（CPU集約的な処理）
    const num = Math.floor(Math.random() * 10000) + 10000;
    let isPrime = true;
    
    for (let i = 2; i <= Math.sqrt(num); i++) {
      if (num % i === 0) {
        isPrime = false;
        break;
      }
    }
    
    operations++;
    
    // 定期的に他のプロセスに制御を渡す
    if (operations % 1000 === 0) {
      await new Promise(resolve => setImmediate(resolve));
    }
  }
  
  return {
    workerId,
    operations,
    duration: performance.now() - startTime
  };
}

/**
 * ディスクI/O負荷テスト
 */
async function diskIOTest() {
  console.log('Starting disk I/O exhaustion test');
  
  const fs = await import('fs/promises');
  const path = await import('path');
  const os = await import('os');
  
  const tempDir = os.tmpdir();
  const testDir = path.join(tempDir, `io-test-${Date.now()}`);
  
  try {
    await fs.mkdir(testDir, { recursive: true });
    
    const fileSize = 1024 * 1024; // 1MB
    const numFiles = 100;
    const buffer = Buffer.alloc(fileSize);
    
    // ランダムデータで埋める
    for (let i = 0; i < buffer.length; i += 1024) {
      buffer.writeUInt32BE(Math.random() * 0xFFFFFFFF, i);
    }
    
    const startTime = performance.now();
    
    // 書き込みテスト
    console.log(`Writing ${numFiles} files...`);
    const writePromises = [];
    for (let i = 0; i < numFiles; i++) {
      const filePath = path.join(testDir, `test-${i}.dat`);
      writePromises.push(fs.writeFile(filePath, buffer));
    }
    await Promise.all(writePromises);
    
    const writeTime = performance.now() - startTime;
    
    // 読み込みテスト
    console.log(`Reading ${numFiles} files...`);
    const readStartTime = performance.now();
    const readPromises = [];
    for (let i = 0; i < numFiles; i++) {
      const filePath = path.join(testDir, `test-${i}.dat`);
      readPromises.push(fs.readFile(filePath));
    }
    await Promise.all(readPromises);
    
    const readTime = performance.now() - readStartTime;
    
    // クリーンアップ
    await fs.rm(testDir, { recursive: true, force: true });
    
    const totalSize = fileSize * numFiles / (1024 * 1024);
    
    console.log(`Disk I/O test completed`);
    console.log(`Total data: ${totalSize}MB`);
    console.log(`Write speed: ${(totalSize / (writeTime / 1000)).toFixed(2)}MB/s`);
    console.log(`Read speed: ${(totalSize / (readTime / 1000)).toFixed(2)}MB/s`);
    
    return {
      success: true,
      writeSpeed: totalSize / (writeTime / 1000),
      readSpeed: totalSize / (readTime / 1000)
    };
    
  } catch (error) {
    console.error(`Disk I/O test failed: ${error.message}`);
    // クリーンアップ試行
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (e) {
      // 無視
    }
    return { success: false, error: error.message };
  }
}

/**
 * サイズ文字列をバイトに変換
 */
function parseSize(sizeStr) {
  const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)?$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2]?.toUpperCase() || 'B';
  
  const multipliers = {
    'B': 1,
    'KB': 1024,
    'MB': 1024 * 1024,
    'GB': 1024 * 1024 * 1024,
    'TB': 1024 * 1024 * 1024 * 1024
  };
  
  return value * (multipliers[unit] || 1);
}

/**
 * 時間文字列をミリ秒に変換
 */
function parseTime(timeStr) {
  const match = timeStr.match(/^(\d+(?:\.\d+)?)\s*([smh])?$/i);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  
  const value = parseFloat(match[1]);
  const unit = match[2]?.toLowerCase() || 's';
  
  const multipliers = {
    'ms': 1,
    's': 1000,
    'm': 60 * 1000,
    'h': 60 * 60 * 1000
  };
  
  return value * (multipliers[unit] || 1000);
}

/**
 * メイン実行
 */
async function main() {
  console.log('Resource Exhaustion Test');
  console.log('========================');
  console.log(`Type: ${testType}`);
  console.log(`Limit: ${limit}`);
  console.log(`Duration: ${duration}`);
  console.log('');
  
  let result;
  
  switch (testType) {
    case 'memory':
      result = await memoryExhaustionTest();
      break;
    case 'cpu':
      result = await cpuExhaustionTest();
      break;
    case 'disk':
      result = await diskIOTest();
      break;
    case 'all':
      console.log('Running all tests...\n');
      const results = {
        memory: await memoryExhaustionTest(),
        cpu: await cpuExhaustionTest(),
        disk: await diskIOTest()
      };
      result = {
        success: Object.values(results).every(r => r.success),
        results
      };
      break;
    default:
      console.error(`Unknown test type: ${testType}`);
      process.exit(1);
  }
  
  // 結果に基づいて終了コードを設定
  process.exit(result.success ? 0 : 1);
}

// エラーハンドリング
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { memoryExhaustionTest, cpuExhaustionTest, diskIOTest };