#!/usr/bin/env node
/**
 * 型チェックのベンチマークスクリプト
 * 各種型チェック方法の実行時間を比較
 */

import { spawn } from 'child_process';
import { performance } from 'perf_hooks';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// テスト対象のコマンド
const COMMANDS = [
  {
    name: '通常の型チェック',
    command: 'npm',
    args: ['run', 'type-check'],
    description: '標準のvue-tsc実行'
  },
  {
    name: '高速型チェック',
    command: 'npm',
    args: ['run', 'type-check:fast'],
    description: '厳格なルールを緩和'
  },
  {
    name: 'インクリメンタル型チェック（初回）',
    command: 'npm',
    args: ['run', 'type-check:incremental'],
    description: 'インクリメンタルビルド（キャッシュ生成）'
  }
];

// コマンドを実行して時間を計測
function runCommand(cmd) {
  return new Promise((resolve) => {
    console.log(`\n${COLORS.cyan}実行中: ${cmd.name}${COLORS.reset}`);
    console.log(`${COLORS.yellow}コマンド: ${cmd.command} ${cmd.args.join(' ')}${COLORS.reset}`);
    
    const startTime = performance.now();
    const child = spawn(cmd.command, cmd.args, {
      shell: true,
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.on('close', (code) => {
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      const result = {
        name: cmd.name,
        command: `${cmd.command} ${cmd.args.join(' ')}`,
        description: cmd.description,
        duration: parseFloat(duration),
        success: code === 0,
        exitCode: code
      };

      if (code === 0) {
        console.log(`${COLORS.green}✓ 成功${COLORS.reset} - ${duration}秒`);
      } else {
        console.log(`${COLORS.red}✗ 失敗${COLORS.reset} - ${duration}秒 (exit code: ${code})`);
        if (errorOutput) {
          console.log(`${COLORS.red}エラー出力:${COLORS.reset}\n${errorOutput.slice(0, 500)}...`);
        }
      }

      resolve(result);
    });
  });
}

// メイン処理
async function main() {
  console.log(`${COLORS.bright}${COLORS.magenta}=== 型チェック ベンチマーク ===${COLORS.reset}`);
  console.log(`${COLORS.yellow}実行時刻: ${new Date().toLocaleString()}${COLORS.reset}`);
  console.log(`${COLORS.yellow}Node.js: ${process.version}${COLORS.reset}`);
  console.log(`${COLORS.yellow}プラットフォーム: ${process.platform}${COLORS.reset}`);
  
  const results = [];
  
  // 各コマンドを実行
  for (const cmd of COMMANDS) {
    const result = await runCommand(cmd);
    results.push(result);
    
    // インクリメンタルビルドの2回目も測定
    if (cmd.name.includes('インクリメンタル')) {
      console.log(`\n${COLORS.magenta}インクリメンタルビルド（2回目）を実行...${COLORS.reset}`);
      const secondResult = await runCommand({
        ...cmd,
        name: 'インクリメンタル型チェック（2回目）',
        description: 'インクリメンタルビルド（キャッシュ使用）'
      });
      results.push(secondResult);
    }
  }
  
  // 結果のサマリー
  console.log(`\n${COLORS.bright}${COLORS.cyan}=== ベンチマーク結果 ===${COLORS.reset}`);
  console.log(`${COLORS.yellow}┌─────────────────────────────────┬──────────┬────────┐${COLORS.reset}`);
  console.log(`${COLORS.yellow}│ 方法                            │ 実行時間 │ 状態   │${COLORS.reset}`);
  console.log(`${COLORS.yellow}├─────────────────────────────────┼──────────┼────────┤${COLORS.reset}`);
  
  results.forEach(result => {
    const nameCol = result.name.padEnd(31);
    const timeCol = `${result.duration}秒`.padStart(8);
    const statusCol = result.success ? 
      `${COLORS.green}成功${COLORS.reset}` : 
      `${COLORS.red}失敗${COLORS.reset}`;
    
    console.log(`│ ${nameCol} │ ${timeCol} │ ${statusCol}  │`);
  });
  
  console.log(`${COLORS.yellow}└─────────────────────────────────┴──────────┴────────┘${COLORS.reset}`);
  
  // パフォーマンス分析
  const successfulResults = results.filter(r => r.success);
  if (successfulResults.length > 0) {
    const fastest = successfulResults.reduce((a, b) => a.duration < b.duration ? a : b);
    const slowest = successfulResults.reduce((a, b) => a.duration > b.duration ? a : b);
    
    console.log(`\n${COLORS.bright}パフォーマンス分析:${COLORS.reset}`);
    console.log(`最速: ${COLORS.green}${fastest.name}${COLORS.reset} (${fastest.duration}秒)`);
    console.log(`最遅: ${COLORS.red}${slowest.name}${COLORS.reset} (${slowest.duration}秒)`);
    
    const speedup = ((slowest.duration - fastest.duration) / slowest.duration * 100).toFixed(1);
    console.log(`高速化率: ${COLORS.yellow}${speedup}%${COLORS.reset}`);
  }
  
  // 推奨事項
  console.log(`\n${COLORS.bright}推奨事項:${COLORS.reset}`);
  console.log('1. 開発時は「高速型チェック」または「インクリメンタル（2回目）」を使用');
  console.log('2. CI/CDでは「通常の型チェック」で完全性を保証');
  console.log('3. メモリ不足の場合は.npmrcで設定済みの2GBメモリ割り当てを確認');
}

// 実行
main().catch(console.error);