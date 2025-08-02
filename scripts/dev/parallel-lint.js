#!/usr/bin/env node
/**
 * 並列Lintスクリプト
 * ESLintを並列実行して高速化
 */

import { spawn } from 'child_process';
import { cpus } from 'os';
import { glob } from 'glob';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');

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

// Lint対象のディレクトリグループ
const LINT_GROUPS = [
  {
    name: 'Domain',
    patterns: ['src/domain/**/*.{ts,tsx,vue}'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**']
  },
  {
    name: 'Components',
    patterns: ['src/components/**/*.{ts,tsx,vue}'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**']
  },
  {
    name: 'Game',
    patterns: ['src/game/**/*.{ts,tsx,vue}'],
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**']
  },
  {
    name: 'Utils & Services',
    patterns: [
      'src/utils/**/*.{ts,tsx,vue}',
      'src/services/**/*.{ts,tsx,vue}',
      'src/analytics/**/*.{ts,tsx,vue}'
    ],
    exclude: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**']
  }
];

// ファイルリストを取得
async function getFiles(patterns, excludePatterns = []) {
  const allFiles = new Set();
  
  for (const pattern of patterns) {
    const files = await glob(pattern, {
      cwd: PROJECT_ROOT,
      ignore: excludePatterns
    });
    files.forEach(f => allFiles.add(f));
  }
  
  return Array.from(allFiles);
}

// ESLintを実行
function runESLint(files, groupName) {
  return new Promise((resolve) => {
    console.log(`${COLORS.cyan}[${groupName}]${COLORS.reset} Lint開始 (${files.length}ファイル)...`);
    
    if (files.length === 0) {
      console.log(`${COLORS.yellow}[${groupName}]${COLORS.reset} 対象ファイルなし`);
      resolve({ group: groupName, success: true, duration: 0, warnings: 0, errors: 0 });
      return;
    }
    
    const startTime = Date.now();
    const child = spawn('npx', [
      'eslint',
      '--cache',
      '--cache-location', `.eslintcache.${groupName.toLowerCase().replace(/\s+/g, '-')}`,
      '-c', '.eslintrc.performance.json',
      '--format', 'json',
      ...files
    ], {
      shell: true,
      stdio: 'pipe',
      cwd: PROJECT_ROOT
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
      
      try {
        const results = output ? JSON.parse(output) : [];
        let totalWarnings = 0;
        let totalErrors = 0;
        let filesWithIssues = [];

        results.forEach(result => {
          if (result.warningCount > 0 || result.errorCount > 0) {
            totalWarnings += result.warningCount;
            totalErrors += result.errorCount;
            filesWithIssues.push({
              file: result.filePath.replace(PROJECT_ROOT, '.'),
              warnings: result.warningCount,
              errors: result.errorCount
            });
          }
        });

        if (totalErrors > 0) {
          console.log(`${COLORS.red}✗${COLORS.reset} ${COLORS.cyan}[${groupName}]${COLORS.reset} エラー: ${totalErrors}, 警告: ${totalWarnings} (${duration}秒)`);
          filesWithIssues.forEach(file => {
            if (file.errors > 0) {
              console.log(`  ${COLORS.red}${file.file}: ${file.errors} errors${COLORS.reset}`);
            }
          });
        } else if (totalWarnings > 0) {
          console.log(`${COLORS.yellow}⚠${COLORS.reset} ${COLORS.cyan}[${groupName}]${COLORS.reset} 警告: ${totalWarnings} (${duration}秒)`);
        } else {
          console.log(`${COLORS.green}✓${COLORS.reset} ${COLORS.cyan}[${groupName}]${COLORS.reset} 完了 (${duration}秒)`);
        }

        resolve({
          group: groupName,
          success: totalErrors === 0,
          duration: parseFloat(duration),
          warnings: totalWarnings,
          errors: totalErrors,
          filesWithIssues
        });
      } catch (error) {
        console.error(`${COLORS.red}✗${COLORS.reset} ${COLORS.cyan}[${groupName}]${COLORS.reset} 解析エラー (${duration}秒)`);
        if (errorOutput) {
          console.error(errorOutput);
        }
        resolve({
          group: groupName,
          success: false,
          duration: parseFloat(duration),
          warnings: 0,
          errors: 1,
          filesWithIssues: []
        });
      }
    });
  });
}

// バッチ処理を実行
async function runBatch(groups, batchSize) {
  const results = [];
  
  for (let i = 0; i < groups.length; i += batchSize) {
    const batch = groups.slice(i, i + batchSize);
    const batchPromises = batch.map(async (group) => {
      const files = await getFiles(group.patterns, group.exclude);
      return runESLint(files, group.name);
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}

// メイン処理
async function main() {
  console.log(`${COLORS.bright}${COLORS.magenta}並列Lintツール${COLORS.reset}`);
  console.log(`${COLORS.yellow}CPU コア数: ${cpus().length}, 使用ワーカー数: ${MAX_WORKERS}${COLORS.reset}\n`);

  const startTime = Date.now();

  try {
    // 並列実行
    console.log(`${COLORS.cyan}Lint実行中...${COLORS.reset}\n`);
    const results = await runBatch(LINT_GROUPS, MAX_WORKERS);

    // 結果のサマリー
    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`\n${COLORS.bright}========== サマリー ==========${COLORS.reset}`);
    console.log(`総実行時間: ${COLORS.yellow}${totalDuration}秒${COLORS.reset}`);
    console.log(`グループ: 成功 ${COLORS.green}${successCount}${COLORS.reset}, 失敗 ${COLORS.red}${failureCount}${COLORS.reset}`);
    console.log(`エラー: ${COLORS.red}${totalErrors}${COLORS.reset}, 警告: ${COLORS.yellow}${totalWarnings}${COLORS.reset}`);

    // 個別実行時間
    console.log(`\n${COLORS.cyan}実行時間詳細:${COLORS.reset}`);
    results.forEach(r => {
      console.log(`  ${r.group}: ${r.duration}秒`);
    });

    if (totalErrors > 0) {
      console.log(`\n${COLORS.red}Lintエラーが発生しました。${COLORS.reset}`);
      process.exit(1);
    } else if (totalWarnings > 0) {
      console.log(`\n${COLORS.yellow}Lint警告があります。${COLORS.reset}`);
    } else {
      console.log(`\n${COLORS.green}すべてのLintチェックが成功しました！${COLORS.reset}`);
    }

    // キャッシュ情報
    const cacheOption = process.argv.includes('--show-cache');
    if (cacheOption) {
      console.log(`\n${COLORS.cyan}キャッシュ統計:${COLORS.reset}`);
      // キャッシュファイルのサイズを表示（実装は省略）
    }

  } catch (error) {
    console.error(`${COLORS.red}エラーが発生しました:${COLORS.reset}`, error);
    process.exit(1);
  }
}

// 実行
main().catch(console.error);