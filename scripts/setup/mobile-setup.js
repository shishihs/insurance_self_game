#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('📱 モバイル開発環境のセットアップを開始します...\n');

// 質問関数
const ask = (question) => new Promise((resolve) => {
  rl.question(question, resolve);
});

async function setup() {
  console.log('1️⃣ 必要な依存関係を確認しています...');
  
  // Playwright のインストール確認
  try {
    execSync('npx playwright --version', { stdio: 'pipe' });
    console.log('   ✅ Playwright がインストールされています');
  } catch {
    console.log('   ⚠️ Playwright をインストールします...');
    execSync('pnpm install -D @playwright/test', { stdio: 'inherit' });
    execSync('npx playwright install', { stdio: 'inherit' });
  }

  console.log('\n2️⃣ HTTPS証明書のセットアップ');
  
  const keyPath = path.resolve(__dirname, '../../localhost-key.pem');
  const certPath = path.resolve(__dirname, '../../localhost.pem');
  
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    console.log('   ✅ HTTPS証明書が既に存在します');
  } else {
    console.log('   ⚠️ HTTPS証明書が見つかりません');
    console.log('   PWAテストにはHTTPS証明書が必要です。');
    console.log('   以下のコマンドでmkcertをインストールして証明書を生成してください:\n');
    console.log('   npm install -g mkcert');
    console.log('   mkcert -install');
    console.log('   mkcert localhost\n');
    
    const generateCert = await ask('今すぐ証明書を生成しますか？ (y/N): ');
    if (generateCert.toLowerCase() === 'y') {
      try {
        console.log('   mkcertをインストールしています...');
        execSync('npm install -g mkcert', { stdio: 'inherit' });
        console.log('   証明書を生成しています...');
        execSync('mkcert -install', { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });
        execSync('mkcert localhost', { stdio: 'inherit', cwd: path.resolve(__dirname, '../..') });
        console.log('   ✅ HTTPS証明書を生成しました');
      } catch (err) {
        console.log('   ❌ 証明書の生成に失敗しました:', err.message);
        console.log('   手動でセットアップしてください');
      }
    }
  }

  console.log('\n3️⃣ 環境情報');
  console.log('   開発サーバー起動コマンド:');
  console.log('   - ローカルホスト: pnpm dev:mobile');
  console.log('   - ネットワーク経由: pnpm dev:mobile:host');
  
  // IPアドレスを取得
  try {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    const addresses = [];
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }
    
    if (addresses.length > 0) {
      console.log('\n   📡 ネットワークアドレス:');
      addresses.forEach(addr => {
        console.log(`   - https://${addr}:5173`);
      });
    }
  } catch (err) {
    console.log('   IPアドレスの取得に失敗しました');
  }

  console.log('\n4️⃣ テストコマンド');
  console.log('   - 全てのモバイルテスト: pnpm test:e2e tests/e2e/mobile-responsive.spec.ts');
  console.log('   - 特定のデバイス: pnpm test:e2e tests/e2e/mobile-responsive.spec.ts --grep "iPhone 12"');
  console.log('   - UIモード: pnpm test:e2e:ui tests/e2e/mobile-responsive.spec.ts');

  console.log('\n✅ セットアップが完了しました！');
  console.log('\n📖 詳細なガイドは以下を参照してください:');
  console.log('   docs/development/MOBILE_TESTING_GUIDE.md');
  
  rl.close();
}

setup().catch(err => {
  console.error('セットアップ中にエラーが発生しました:', err);
  rl.close();
  process.exit(1);
});