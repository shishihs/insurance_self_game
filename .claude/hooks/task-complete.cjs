#!/usr/bin/env node

/**
 * Claude Code Task Complete Hook
 * タスク完了時の品質チェックと次のステップ提案
 */

const fs = require('fs');
const path = require('path');

const HOOK_LOG_FILE = path.join(__dirname, '..', 'logs', 'task-completion.log');

function logTaskCompletion(taskType, suggestions) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} - TASK_COMPLETE: ${taskType} - Suggestions: ${suggestions.join(', ')}\n`;
    
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
    const taskType = args[0] || 'general';
    
    console.log('🎉 Task completed successfully!');
    console.log(`📋 Task type: ${taskType}`);
    
    const suggestions = ['🧪 Run relevant tests', '📚 Update documentation if needed', '🚀 Consider deploying changes'];
    console.log('\n💡 Suggested next steps:');
    suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
    
    console.log('\n🔄 Remember the deployment cycle:');
    console.log('   1 TODO = 1 Deploy = Continuous value delivery');
    
    logTaskCompletion(taskType, suggestions);
    process.exit(0);
}

if (require.main === module) {
    main();
}

module.exports = { main };