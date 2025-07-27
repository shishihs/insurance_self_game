#!/usr/bin/env node

/**
 * Claude Code Post-Bash Hook
 * bashコマンド実行後の後処理とログ記録
 */

const fs = require('fs');
const path = require('path');

const HOOK_LOG_FILE = path.join(__dirname, '..', 'logs', 'bash-commands.log');

function logCommandResult(command, exitCode, _output) {
    const timestamp = new Date().toISOString();
    const result = exitCode === 0 ? 'SUCCESS' : 'FAILED';
    const logEntry = `${timestamp} - ${result} (${exitCode}): ${command}\n`;
    
    // ログディレクトリを作成
    const logDir = path.dirname(HOOK_LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    // ログファイルに記録
    fs.appendFileSync(HOOK_LOG_FILE, logEntry);
}

function main() {
    const args = process.argv.slice(2);
    const command = args[0] || '';
    const exitCode = parseInt(args[1]) || 0;
    const output = args.slice(2).join(' ');
    
    // gitコマンドの成功をチェック
    if (command.startsWith('git') && exitCode === 0) {
        console.log('✅ Git command completed successfully');
        
        // git pushの場合は特別な処理
        if (command.includes('git push')) {
            console.log('🚀 Code pushed to remote repository');
            console.log('📋 Deployment will start automatically via GitHub Actions');
        }
        
        // git commitの場合は特別な処理
        if (command.includes('git commit')) {
            console.log('📝 Commit created successfully');
            console.log('💡 Remember to push changes when ready: git push origin master');
        }
    }
    
    // pnpmコマンドの処理
    if (command.startsWith('pnpm') && exitCode === 0) {
        console.log('✅ pnpm command completed successfully');
    }
    
    logCommandResult(command, exitCode, output);
    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = { main };