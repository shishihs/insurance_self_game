#!/usr/bin/env node

/**
 * Claude Code Pre-Bash Hook v2.0
 * 包括的システム保護 - 危険なコマンドの完全ブロック
 */

const fs = require('fs');
const path = require('path');

// フックログ設定
const HOOK_LOG_FILE = path.join(__dirname, '..', 'logs', 'bash-commands.log');

function logCommand(command, result) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - ${result}: ${command}\n`;
    
    const logDir = path.dirname(HOOK_LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    fs.appendFileSync(HOOK_LOG_FILE, logEntry);
}

function checkDestructiveCommands(command) {
    // 単純な文字列マッチングと正規表現の組み合わせで確実性を向上
    
    // CRITICAL: 即座にシステムを破壊するコマンド
    const criticalPatterns = [
        // rm系の危険パターン
        { pattern: 'rm -rf /', message: 'ルートディレクトリの削除' },
        { pattern: 'rm -rf ~', message: 'ホームディレクトリの削除' },
        { pattern: 'rm -rf $HOME', message: 'ホームディレクトリの削除' },
        { pattern: 'rm -rf .', message: 'カレントディレクトリの削除' },
        { pattern: 'rm -rf ./', message: 'カレントディレクトリの削除' },
        { pattern: 'rm -rf ..', message: '親ディレクトリの削除' },
        { pattern: 'rm -rf ../', message: '親ディレクトリの削除' },
        { pattern: 'rm -rf *', message: 'ワイルドカード削除' },
        { pattern: 'rm -f *', message: 'ワイルドカード削除' },
        { pattern: 'rm -r *', message: 'ワイルドカード削除' },
        
        // sudo rm系
        { pattern: 'sudo rm -rf /', message: 'sudo ルートディレクトリ削除' },
        { pattern: 'sudo rm -rf ~', message: 'sudo ホームディレクトリ削除' },
        { pattern: 'sudo rm -rf $HOME', message: 'sudo ホームディレクトリ削除' },
        { pattern: 'sudo rm -rf .', message: 'sudo カレントディレクトリ削除' },
        { pattern: 'sudo rm -rf *', message: 'sudo ワイルドカード削除' },
        
        // dd系のディスク破壊
        { pattern: 'dd if=/dev/zero of=/dev/sda', message: 'ディスク破壊' },
        { pattern: 'dd if=/dev/random of=/dev/disk', message: 'ディスク破壊' },
        { pattern: 'dd if=/dev/urandom of=/dev/', message: 'ディスク破壊' },
        
        // chmod/chown系のシステム破壊
        { pattern: 'chmod -R 000 /', message: 'ルート権限破壊' },
        { pattern: 'chmod 000 /', message: 'ルート権限破壊' },
        { pattern: 'sudo chown -R nobody:nobody /etc', message: 'システム設定権限破壊' },
        
        // システムファイル削除
        { pattern: 'rm /etc/passwd', message: 'パスワードファイル削除' },
        { pattern: 'sudo rm /etc/shadow', message: 'シャドウファイル削除' },
        { pattern: 'rm /etc/shadow', message: 'シャドウファイル削除' },
        
        // 機密ファイル表示
        { pattern: 'cat /etc/shadow', message: '機密ファイル表示' },
        { pattern: 'cat /root/.ssh/id_rsa', message: '秘密鍵表示' },
        { pattern: 'cat /etc/passwd', message: 'パスワードファイル表示' },
        
        // フォークボム
        { pattern: ':(){ :|:& };:', message: 'フォークボム' },
        { pattern: '() { () | () & }; ()', message: 'フォークボム' },
        
        // 危険なダウンロード実行
        { pattern: '| bash', message: '未検証スクリプト実行' },
        { pattern: '| sh', message: '未検証スクリプト実行' },
        { pattern: '| zsh', message: '未検証スクリプト実行' },
        { pattern: '| fish', message: '未検証スクリプト実行' },
        
        // プロセス破壊
        { pattern: 'kill -9 -1', message: '全プロセス終了' },
        { pattern: 'killall -9 -1', message: '全プロセス終了' },
        { pattern: 'sudo killall -9 -1', message: 'sudo 全プロセス終了' }
    ];
    
    // HIGH: 開発作業に影響するコマンド
    const highRiskPatterns = [
        { pattern: 'git add .', message: 'git一括追加（並行開発危険）' },
        { pattern: 'git add -A', message: 'git全体追加（並行開発危険）' },
        { pattern: 'git add --all', message: 'git全体追加（並行開発危険）' },
        { pattern: 'git add *', message: 'gitワイルドカード追加（並行開発危険）' },
        { pattern: 'fdisk /dev/sda', message: 'ディスクパーティション操作' },
        { pattern: 'iptables -A INPUT -j DROP', message: 'ファイアウォール設定' },
        { pattern: 'export PATH=""', message: 'PATH環境変数破壊' },
        { pattern: 'unset HOME', message: 'HOME環境変数削除' },
        { pattern: 'unset PATH', message: 'PATH環境変数削除' },
        { pattern: 'export HOME=""', message: 'HOME環境変数破壊' }
    ];
    
    // CRITICAL パターンチェック
    for (const { pattern, message } of criticalPatterns) {
        if (command.includes(pattern)) {
            console.error('\n🚨🚨🚨 CRITICAL SECURITY ALERT 🚨🚨🚨');
            console.error('═'.repeat(50));
            console.error(`🚨 BLOCKED: ${message}`);
            console.error(`💀 Command: ${command}`);
            console.error('═'.repeat(50));
            console.error('⛔ このコマンドは完全にブロックされました');
            console.error('🆘 システム管理者に連絡してください');
            console.error('\n🆘 緊急時の対応:');
            console.error('1. 作業を即座に停止してください');
            console.error('2. システム管理者に状況を報告してください');
            console.error('3. このコマンドを実行しないでください');
            console.error('4. 不明な場合は必ず確認を取ってください');
            logCommand(command, 'BLOCKED_CRITICAL');
            return { blocked: true, severity: 'CRITICAL', reason: message };
        }
    }
    
    // HIGH RISK パターンチェック
    for (const { pattern, message } of highRiskPatterns) {
        if (command.includes(pattern)) {
            console.error('\n⚠️ ⚠️ ⚠️  HIGH RISK WARNING ⚠️ ⚠️ ⚠️');
            console.error('─'.repeat(40));
            console.error(`⚠️  BLOCKED: ${message}`);
            console.error(`⚠️  Command: ${command}`);
            console.error('─'.repeat(40));
            if (command.includes('git add')) {
                console.error('\n💡 推奨される安全な方法:');
                console.error('1. git status で変更ファイルを確認');
                console.error('2. 必要なファイルのみを個別に追加');
                console.error('3. git diff で変更内容を確認してからコミット');
                console.error('例: git add src/specific-file.ts');
            }
            logCommand(command, 'BLOCKED_HIGH_RISK');
            return { blocked: true, severity: 'HIGH', reason: message };
        }
    }
    
    return { blocked: false };
}

function main() {
    const args = process.argv.slice(2);
    const command = args.join(' ').trim();
    
    console.log(`🔍 Pre-bash hook: Checking command - "${command}"`);
    
    // npmコマンドの禁止（pnpm必須）
    if (command.startsWith('npm ')) {
        console.error('❌ npmの使用は禁止されています。pnpmを使用してください。');
        console.error('例: npm install → pnpm install');
        logCommand(command, 'BLOCKED_NPM');
        process.exit(1);
    }
    
    // 破壊的コマンドのチェック
    const checkResult = checkDestructiveCommands(command);
    if (checkResult.blocked) {
        process.exit(1);
    }
    
    // 安全なコマンドの場合はログに記録して続行
    logCommand(command, 'ALLOWED');
    console.log('✅ Command approved');
    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = { main, checkDestructiveCommands };