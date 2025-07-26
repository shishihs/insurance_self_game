#!/usr/bin/env node

console.log("🎮 MCP動作確認スクリプト (Windows)");
console.log("===================================");

const fs = require('fs');
const path = require('path');

// プロジェクトパス
const projectPath = process.cwd();
console.log(`📁 プロジェクトパス: ${projectPath}`);

// VS Code設定の確認
const vscodeConfigPath = path.join(projectPath, '.vscode', 'mcp.json');
if (fs.existsSync(vscodeConfigPath)) {
    console.log("✅ VS Code MCP設定ファイルが見つかりました");
} else {
    console.log("❌ VS Code MCP設定ファイルが見つかりません");
}

// Cursor設定の確認
const cursorConfigPath = path.join(projectPath, '.cursor', 'mcp-config.json');
if (fs.existsSync(cursorConfigPath)) {
    console.log("✅ Cursor MCP設定ファイルが見つかりました");
} else {
    console.log("❌ Cursor MCP設定ファイルが見つかりません");
}

// 汎用設定の確認
const genericConfigPath = path.join(projectPath, 'mcp', 'config.json');
if (fs.existsSync(genericConfigPath)) {
    console.log("✅ 汎用MCP設定ファイルが見つかりました");
    
    // 設定内容の読み込み
    const config = JSON.parse(fs.readFileSync(genericConfigPath, 'utf8'));
    
    if (config.mcpServers && config.mcpServers.filesystem) {
        console.log("✅ Filesystem MCPサーバーが設定されています");
        console.log("📁 アクセス可能なパス:");
        config.mcpServers.filesystem.args.slice(2).forEach(p => {
            console.log(`   - ${p}`);
        });
    }
}

// セーブデータディレクトリの確認
const saveDataPath = path.join(projectPath, 'save-data');
if (fs.existsSync(saveDataPath)) {
    console.log("✅ セーブデータディレクトリが存在します");
} else {
    console.log("❌ セーブデータディレクトリが見つかりません");
}

// Node.jsバージョン確認
console.log(`\n📊 Node.js バージョン: ${process.version}`);

console.log("\n💡 次のステップ:");
console.log("1. VS Code、Cursor、またはその他のMCP対応エディタを起動");
console.log("2. MCP拡張機能がインストールされていることを確認");
console.log("3. scripts\\start-mcp.bat を実行してMCPサーバーを起動");
console.log("4. エディタでMCPツールが利用可能になることを確認");