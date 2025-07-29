#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// モバイルテスト実行スクリプト
console.log('🧪 モバイルデバイステストを実行します...\n');

// Playwrightコマンドを実行
const args = [
  'playwright',
  'test',
  'tests/e2e/mobile-responsive.spec.ts',
  '--reporter=list',
  ...process.argv.slice(2) // 追加の引数を渡す
];

const testProcess = spawn('npx', args, {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '../..')
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ モバイルテストが正常に完了しました！');
  } else {
    console.log(`\n❌ モバイルテストが失敗しました (exit code: ${code})`);
    process.exit(code);
  }
});

testProcess.on('error', (err) => {
  console.error('テスト実行中にエラーが発生しました:', err);
  process.exit(1);
});