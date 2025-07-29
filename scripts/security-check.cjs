#!/usr/bin/env node

/**
 * セキュリティチェックスクリプト
 * OWASP Top 10に基づく基本的なセキュリティ検証
 */

const fs = require('fs');
const path = require('path');

console.log('🛡️ セキュリティチェック開始...\n');

const securityChecks = {
  passed: 0,
  failed: 0,
  warnings: 0,
  results: []
};

// 1. 依存関係の脆弱性チェック
function checkDependencyVulnerabilities() {
  console.log('📦 依存関係の脆弱性チェック...');
  try {
    const { execSync } = require('child_process');
    const result = execSync('pnpm audit --json', { encoding: 'utf8' });
    const audit = JSON.parse(result);
    
    if (audit.metadata && audit.metadata.vulnerabilities) {
      const vulns = audit.metadata.vulnerabilities;
      const total = Object.values(vulns).reduce((sum, count) => sum + count, 0);
      
      if (total === 0) {
        securityChecks.passed++;
        securityChecks.results.push({ test: '依存関係脆弱性', status: 'PASS', message: '脆弱性なし' });
      } else {
        securityChecks.failed++;
        securityChecks.results.push({ 
          test: '依存関係脆弱性', 
          status: 'FAIL', 
          message: `${total}個の脆弱性を検出`,
          details: vulns
        });
      }
    }
  } catch (error) {
    // pnpm audit がエラーコードを返す場合の処理
    if (error.stdout) {
      const output = error.stdout.toString();
      if (output.includes('No known vulnerabilities found')) {
        securityChecks.passed++;
        securityChecks.results.push({ test: '依存関係脆弱性', status: 'PASS', message: '脆弱性なし' });
      } else {
        securityChecks.failed++;
        securityChecks.results.push({ test: '依存関係脆弱性', status: 'FAIL', message: '脆弱性を検出' });
      }
    }
  }
}

// 2. セキュリティヘッダーの確認
function checkSecurityHeaders() {
  console.log('🔒 セキュリティヘッダーの確認...');
  const indexPath = path.join(__dirname, '../index.html');
  
  try {
    const content = fs.readFileSync(indexPath, 'utf8');
    const requiredHeaders = [
      { name: 'Content-Security-Policy', pattern: /Content-Security-Policy/i },
      { name: 'X-Content-Type-Options', pattern: /X-Content-Type-Options/i },
      { name: 'X-Frame-Options', pattern: /X-Frame-Options/i },
      { name: 'Referrer-Policy', pattern: /referrer/i },
      { name: 'Permissions-Policy', pattern: /Permissions-Policy/i }
    ];
    
    let allHeadersFound = true;
    const missingHeaders = [];
    
    requiredHeaders.forEach(header => {
      if (!header.pattern.test(content)) {
        allHeadersFound = false;
        missingHeaders.push(header.name);
      }
    });
    
    if (allHeadersFound) {
      securityChecks.passed++;
      securityChecks.results.push({ test: 'セキュリティヘッダー', status: 'PASS', message: '全ヘッダー実装済み' });
    } else {
      securityChecks.failed++;
      securityChecks.results.push({ 
        test: 'セキュリティヘッダー', 
        status: 'FAIL', 
        message: `未実装ヘッダー: ${missingHeaders.join(', ')}`
      });
    }
  } catch (error) {
    securityChecks.failed++;
    securityChecks.results.push({ test: 'セキュリティヘッダー', status: 'FAIL', message: error.message });
  }
}

// 3. 危険な関数の使用チェック
function checkDangerousFunctions() {
  console.log('⚠️  危険な関数の使用チェック...');
  const srcDir = path.join(__dirname, '../src');
  const dangerousPatterns = [
    { pattern: /eval\s*\(/g, name: 'eval()' },
    { pattern: /new\s+Function\s*\(/g, name: 'new Function()' },
    { pattern: /innerHTML\s*=/g, name: 'innerHTML' },
    { pattern: /document\.write/g, name: 'document.write' },
    { pattern: /\$\{.*\}/g, name: 'テンプレートリテラル（潜在的XSS）', severity: 'warning' }
  ];
  
  const findings = [];
  
  function scanDirectory(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
        scanDirectory(filePath);
      } else if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.vue')) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        dangerousPatterns.forEach(({ pattern, name, severity }) => {
          const matches = content.match(pattern);
          if (matches) {
            findings.push({
              file: filePath.replace(path.join(__dirname, '..'), ''),
              pattern: name,
              count: matches.length,
              severity: severity || 'error'
            });
          }
        });
      }
    });
  }
  
  try {
    scanDirectory(srcDir);
    
    if (findings.length === 0) {
      securityChecks.passed++;
      securityChecks.results.push({ test: '危険な関数', status: 'PASS', message: '危険な関数の使用なし' });
    } else {
      const errors = findings.filter(f => f.severity === 'error');
      const warnings = findings.filter(f => f.severity === 'warning');
      
      if (errors.length > 0) {
        securityChecks.failed++;
        securityChecks.results.push({ 
          test: '危険な関数', 
          status: 'FAIL', 
          message: `${errors.length}個の危険な使用を検出`,
          details: errors
        });
      }
      
      if (warnings.length > 0) {
        securityChecks.warnings++;
        securityChecks.results.push({ 
          test: '潜在的リスク', 
          status: 'WARN', 
          message: `${warnings.length}個の警告`,
          details: warnings
        });
      }
    }
  } catch (error) {
    securityChecks.failed++;
    securityChecks.results.push({ test: '危険な関数', status: 'FAIL', message: error.message });
  }
}

// 4. HTTPS使用の確認
function checkHTTPS() {
  console.log('🔐 HTTPS設定の確認...');
  const viteConfig = path.join(__dirname, '../vite.config.ts');
  
  try {
    const content = fs.readFileSync(viteConfig, 'utf8');
    
    // GitHub Pagesは自動的にHTTPSを使用
    if (content.includes('base:') && content.includes('github')) {
      securityChecks.passed++;
      securityChecks.results.push({ test: 'HTTPS設定', status: 'PASS', message: 'GitHub Pages（HTTPS自動適用）' });
    } else {
      securityChecks.warnings++;
      securityChecks.results.push({ test: 'HTTPS設定', status: 'WARN', message: 'HTTPS設定を確認してください' });
    }
  } catch (error) {
    securityChecks.warnings++;
    securityChecks.results.push({ test: 'HTTPS設定', status: 'WARN', message: '設定ファイルを確認できません' });
  }
}

// 5. セキュリティ実装の確認
function checkSecurityImplementation() {
  console.log('🛡️ セキュリティ実装の確認...');
  const securityFiles = [
    { path: 'src/utils/security.ts', name: '基本セキュリティ機能' },
    { path: 'src/utils/security-extensions.ts', name: '拡張セキュリティ機能' },
    { path: 'src/utils/error-handling/ErrorHandler.ts', name: 'エラーハンドリング' }
  ];
  
  let allFound = true;
  const missing = [];
  
  securityFiles.forEach(({ path: filePath, name }) => {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      allFound = false;
      missing.push(name);
    }
  });
  
  if (allFound) {
    securityChecks.passed++;
    securityChecks.results.push({ test: 'セキュリティ実装', status: 'PASS', message: '全セキュリティモジュール実装済み' });
  } else {
    securityChecks.failed++;
    securityChecks.results.push({ 
      test: 'セキュリティ実装', 
      status: 'FAIL', 
      message: `未実装: ${missing.join(', ')}`
    });
  }
}

// 6. .npmrcの確認
function checkNpmrcSecurity() {
  console.log('📋 .npmrc セキュリティ設定の確認...');
  const npmrcPath = path.join(__dirname, '../.npmrc');
  
  try {
    if (fs.existsSync(npmrcPath)) {
      const content = fs.readFileSync(npmrcPath, 'utf8');
      
      if (content.includes('ignore-scripts=true')) {
        securityChecks.passed++;
        securityChecks.results.push({ test: '.npmrc設定', status: 'PASS', message: 'サプライチェーン攻撃対策実装済み' });
      } else {
        securityChecks.warnings++;
        securityChecks.results.push({ 
          test: '.npmrc設定', 
          status: 'WARN', 
          message: 'ignore-scripts=true の設定を推奨'
        });
      }
    } else {
      securityChecks.warnings++;
      securityChecks.results.push({ test: '.npmrc設定', status: 'WARN', message: '.npmrcファイルが存在しません' });
    }
  } catch (error) {
    securityChecks.warnings++;
    securityChecks.results.push({ test: '.npmrc設定', status: 'WARN', message: error.message });
  }
}

// レポート生成
function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 セキュリティチェック結果サマリー');
  console.log('='.repeat(60) + '\n');
  
  console.log(`✅ 合格: ${securityChecks.passed}`);
  console.log(`❌ 不合格: ${securityChecks.failed}`);
  console.log(`⚠️  警告: ${securityChecks.warnings}`);
  console.log('\n' + '-'.repeat(60) + '\n');
  
  securityChecks.results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.test}: ${result.message}`);
    
    if (result.details) {
      console.log('   詳細:');
      if (Array.isArray(result.details)) {
        result.details.forEach(detail => {
          console.log(`   - ${detail.file || ''} ${detail.pattern || ''} (${detail.count || 0}回)`);
        });
      } else {
        console.log(`   ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  const score = (securityChecks.passed / (securityChecks.passed + securityChecks.failed + securityChecks.warnings)) * 100;
  console.log(`\n🏆 セキュリティスコア: ${score.toFixed(1)}%`);
  
  if (score === 100) {
    console.log('🎉 完璧です！全てのセキュリティチェックに合格しました。');
  } else if (score >= 80) {
    console.log('👍 良好です。いくつかの改善点があります。');
  } else if (score >= 60) {
    console.log('⚠️  改善が必要です。セキュリティ対策を強化してください。');
  } else {
    console.log('🚨 危険です！直ちにセキュリティ対策を実施してください。');
  }
  
  // レポートファイルの生成
  const reportPath = path.join(__dirname, '../security-check-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    score: score.toFixed(1),
    summary: {
      passed: securityChecks.passed,
      failed: securityChecks.failed,
      warnings: securityChecks.warnings
    },
    results: securityChecks.results
  }, null, 2));
  
  console.log(`\n📄 詳細レポート: ${reportPath}`);
}

// メイン実行
async function main() {
  checkDependencyVulnerabilities();
  checkSecurityHeaders();
  checkDangerousFunctions();
  checkHTTPS();
  checkSecurityImplementation();
  checkNpmrcSecurity();
  
  generateReport();
  
  // 終了コード
  process.exit(securityChecks.failed > 0 ? 1 : 0);
}

main();