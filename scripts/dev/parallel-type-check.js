#!/usr/bin/env node
/**
 * 並列型チェックスクリプト
 * 大規模プロジェクトでの型チェックを高速化
 */

import { spawn } from 'child_process';
import { cpus } from 'os';
import { readdir } from 'fs/promises';
import { join } from 'path';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

// CPU コア数を取得（最大でコア数-1を使用）
const MAX_WORKERS = Math.max(1, cpus().length - 1);

// 型チェック対象のディレクトリを分割
const TYPE_CHECK_GROUPS = [
  {
    name: 'Domain',
    paths: ['src/domain'],
    tsconfig: 'tsconfig.domain.json'
  },
  {
    name: 'Components',
    paths: ['src/components'],
    tsconfig: 'tsconfig.components.json'
  },
  {
    name: 'Game',
    paths: ['src/game'],
    tsconfig: 'tsconfig.game.json'
  },
  {
    name: 'Utils & Services',
    paths: ['src/utils', 'src/services', 'src/analytics'],
    tsconfig: 'tsconfig.utils.json'
  }
];

// 各グループ用のtsconfig.jsonを生成
async function generateGroupTsConfig(group) {
  const config = {
    extends: './tsconfig.performance.json',
    compilerOptions: {
      incremental: true,
      tsBuildInfoFile: `.tsbuildinfo.${group.name.toLowerCase().replace(/\s+/g, '-')}`
    },
    include: group.paths.map(p => `${p}/**/*.ts`, `${p}/**/*.tsx`, `${p}/**/*.vue`),
    exclude: [
      'node_modules',
      'dist',
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/__tests__/**'
    ]
  };

  const fs = await import('fs/promises');
  await fs.writeFile(group.tsconfig, JSON.stringify(config, null, 2));
}

// 型チェックを実行
function runTypeCheck(group) {
  return new Promise((resolve, reject) => {
    console.log(`${COLORS.cyan}[${group.name}]${COLORS.reset} 型チェック開始...`);
    
    const startTime = Date.now();
    const child = spawn('npx', ['vue-tsc', '--noEmit', '-p', group.tsconfig], {
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
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      
      if (code === 0) {
        console.log(`${COLORS.green}✓${COLORS.reset} ${COLORS.cyan}[${group.name}]${COLORS.reset} 完了 (${duration}秒)`);
        resolve({ group: group.name, success: true, duration, output });
      } else {
        console.error(`${COLORS.red}✗${COLORS.reset} ${COLORS.cyan}[${group.name}]${COLORS.reset} エラー (${duration}秒)`);
        if (errorOutput) {
          console.error(`${COLORS.red}${errorOutput}${COLORS.reset}`);
        }
        if (output) {
          console.error(output);
        }
        resolve({ group: group.name, success: false, duration, output, errorOutput });
      }
    });
  });
}

// メイン処理
async function main() {
  console.log(`${COLORS.bright}${COLORS.magenta}並列型チェックツール${COLORS.reset}`);
  console.log(`${COLORS.yellow}CPU コア数: ${cpus().length}, 使用ワーカー数: ${MAX_WORKERS}${COLORS.reset}\n`);

  const startTime = Date.now();

  try {
    // 各グループのtsconfig生成
    console.log(`${COLORS.cyan}設定ファイル生成中...${COLORS.reset}`);
    await Promise.all(TYPE_CHECK_GROUPS.map(generateGroupTsConfig));

    // 並列実行（MAX_WORKERS数まで同時実行）
    console.log(`\n${COLORS.cyan}型チェック実行中...${COLORS.reset}\n`);
    const results = [];
    
    for (let i = 0; i < TYPE_CHECK_GROUPS.length; i += MAX_WORKERS) {
      const batch = TYPE_CHECK_GROUPS.slice(i, i + MAX_WORKERS);
      const batchResults = await Promise.all(batch.map(runTypeCheck));
      results.push(...batchResults);
    }

    // 結果のサマリー
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`\n${COLORS.bright}========== サマリー ==========${COLORS.reset}`);
    console.log(`総実行時間: ${COLORS.yellow}${totalDuration}秒${COLORS.reset}`);
    console.log(`成功: ${COLORS.green}${successCount}${COLORS.reset}, 失敗: ${COLORS.red}${failureCount}${COLORS.reset}`);

    if (failureCount > 0) {
      console.log(`\n${COLORS.red}型チェックエラーが発生しました。${COLORS.reset}`);
      process.exit(1);
    } else {
      console.log(`\n${COLORS.green}すべての型チェックが成功しました！${COLORS.reset}`);
    }

    // 一時ファイルのクリーンアップ（オプション）
    const cleanup = process.argv.includes('--cleanup');
    if (cleanup) {
      console.log(`\n${COLORS.cyan}一時ファイルをクリーンアップ中...${COLORS.reset}`);
      const fs = await import('fs/promises');
      for (const group of TYPE_CHECK_GROUPS) {
        try {
          await fs.unlink(group.tsconfig);
          await fs.unlink(`.tsbuildinfo.${group.name.toLowerCase().replace(/\s+/g, '-')}`);
        } catch (err) {
          // ファイルが存在しない場合は無視
        }
      }
    }

  } catch (error) {
    console.error(`${COLORS.red}エラーが発生しました:${COLORS.reset}`, error);
    process.exit(1);
  }
}

// 実行
main().catch(console.error);