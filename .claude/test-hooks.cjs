#!/usr/bin/env node

/**
 * Claude Code Hooks Test Script
 * フックシステムの動作テスト
 */

const { execSync } = require('child_process');
const path = require('path');

function testHook(hookName, args = []) {
    const hookPath = path.join(__dirname, 'hooks', `${hookName}.cjs`);
    try {
        console.log(`\n🔍 Testing ${hookName}...`);
        const result = execSync(`node "${hookPath}" ${args.join(' ')}`, { 
            encoding: 'utf8',
            stdio: 'pipe'
        });
        console.log(`✅ ${hookName} passed`);
        if (result.trim()) {
            console.log(`Output: ${result.trim()}`);
        }
        return true;
    } catch (error) {
        console.log(`❌ ${hookName} failed`);
        console.log(`Error: ${error.message}`);
        if (error.stdout) {
            console.log(`Stdout: ${error.stdout}`);
        }
        if (error.stderr) {
            console.log(`Stderr: ${error.stderr}`);
        }
        return false;
    }
}

function testDangerousCommands() {
    console.log('\n🚨 Testing dangerous command blocking...');
    
    const dangerousCommands = [
        ['git', 'add', '.'],
        ['git', 'add', '-A'],
        ['git', 'add', '--all'],
        ['npm', 'install', 'lodash']
    ];
    
    let blockedCount = 0;
    
    for (const command of dangerousCommands) {
        try {
            execSync(`node "${path.join(__dirname, 'hooks', 'pre-bash.cjs')}" ${command.join(' ')}`, {
                stdio: 'pipe'
            });
            console.log(`⚠️  Command "${command.join(' ')}" was NOT blocked (unexpected)`);
        } catch (error) {
            console.log(`✅ Command "${command.join(' ')}" was properly blocked`);
            blockedCount++;
        }
    }
    
    return blockedCount === dangerousCommands.length;
}

function testSafeCommands() {
    console.log('\n✅ Testing safe command approval...');
    
    const safeCommands = [
        ['git', 'status'],
        ['git', 'add', 'src/specific-file.ts'],
        ['pnpm', 'install'],
        ['pnpm', 'run', 'test']
    ];
    
    let approvedCount = 0;
    
    for (const command of safeCommands) {
        try {
            execSync(`node "${path.join(__dirname, 'hooks', 'pre-bash.cjs')}" ${command.join(' ')}`, {
                stdio: 'pipe'
            });
            console.log(`✅ Command "${command.join(' ')}" was properly approved`);
            approvedCount++;
        } catch (error) {
            console.log(`❌ Command "${command.join(' ')}" was blocked (unexpected)`);
        }
    }
    
    return approvedCount === safeCommands.length;
}

function main() {
    console.log('🧪 Claude Code Hooks Test Suite');
    console.log('==================================');
    
    let allTestsPassed = true;
    
    // 個別フックのテスト
    const hooks = ['pre-bash', 'post-bash', 'pre-commit', 'task-complete'];
    
    for (const hook of hooks) {
        if (!testHook(hook)) {
            allTestsPassed = false;
        }
    }
    
    // 危険なコマンドのブロックテスト
    if (!testDangerousCommands()) {
        allTestsPassed = false;
    }
    
    // 安全なコマンドの承認テスト
    if (!testSafeCommands()) {
        allTestsPassed = false;
    }
    
    // 結果報告
    console.log('\n📊 Test Results:');
    if (allTestsPassed) {
        console.log('🎉 All tests passed! Hook system is working correctly.');
        console.log('✅ Parallel development safety is ensured.');
    } else {
        console.log('❌ Some tests failed. Please check the hook configuration.');
        console.log('⚠️  Parallel development safety may be compromised.');
    }
    
    process.exit(allTestsPassed ? 0 : 1);
}

if (require.main === module) {
    main();
}

module.exports = { 
    testHook, 
    testDangerousCommands, 
    testSafeCommands 
};