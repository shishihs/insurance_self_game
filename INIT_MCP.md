# INIT_MCP.md
**Windows環境でClaude CodeのMCP環境を設定するためのガイド**

## 🎯 このドキュメントの使い方

このドキュメントの内容をClaude Codeにコピー＆ペーストすることで、Claude Code自身がWindows環境でMCP環境を自動的に設定します。

## 📋 対応MCPクライアント

Windows環境で利用可能なMCPクライアント：
- **VS Code** + MCP拡張機能
- **Cursor**
- **Windsurf**
- **Cline (旧 Continue)**

---

## 📋 Claude Codeへの指示

以下の内容をClaude Codeに貼り付けてください：

```
Windows環境で人生充実ゲームプロジェクトのMCP環境を設定してください。

## 1. プロジェクトディレクトリの確認
まず、現在のプロジェクトディレクトリを確認してください：

```powershell
# PowerShellで現在のディレクトリを表示
Get-Location

# プロジェクトルートであることを確認（package.jsonの存在確認）
Test-Path ".\package.json"
```

## 2. VS Code用のMCP設定（推奨）

### VS Code MCP設定ファイルの作成：
```powershell
# .vscodeディレクトリの作成
New-Item -ItemType Directory -Force -Path ".\.vscode"

# 現在のプロジェクトパスを取得（Windows形式のパスをエスケープ）
$PROJECT_PATH = (Get-Location).Path -replace '\\', '\\\\'

# VS Code用MCP設定ファイルの作成
@"
{
  "mcp": {
    "servers": {
      "filesystem": {
        "command": "npx",
        "args": [
          "-y",
          "@modelcontextprotocol/server-filesystem",
          "$PROJECT_PATH",
          "$PROJECT_PATH\\\\public\\\\assets",
          "$PROJECT_PATH\\\\save-data"
        ]
      }
    }
  }
}
"@ | Out-File -FilePath ".\.vscode\mcp.json" -Encoding UTF8

Write-Host "✅ VS Code MCP設定が完了しました"
Write-Host "📁 プロジェクトパス: $((Get-Location).Path)"
```

## 3. Cursor用のMCP設定

### Cursor設定ファイルの作成：
```powershell
# .cursorディレクトリの作成
New-Item -ItemType Directory -Force -Path ".\.cursor"

# 現在のプロジェクトパスを取得
$PROJECT_PATH = (Get-Location).Path -replace '\\', '\\\\'

# Cursor用MCP設定ファイルの作成
@"
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "$PROJECT_PATH",
        "$PROJECT_PATH\\\\public\\\\assets",
        "$PROJECT_PATH\\\\save-data"
      ]
    }
  }
}
"@ | Out-File -FilePath ".\.cursor\mcp-config.json" -Encoding UTF8

Write-Host "✅ Cursor MCP設定が完了しました"
```

## 4. 汎用MCP設定ファイルの作成

### プロジェクトルートに汎用設定を作成：
```powershell
# mcpディレクトリの作成
New-Item -ItemType Directory -Force -Path ".\mcp"

# 汎用MCP設定ファイルの作成（相対パス版）
@'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        ".",
        "./public/assets",
        "./save-data"
      ],
      "description": "ファイルシステムアクセス（プロジェクト、アセット、セーブデータ）"
    }
  },
  "settings": {
    "allowedPaths": [
      "./src",
      "./public",
      "./save-data",
      "./docs"
    ],
    "deniedPaths": [
      ".env",
      ".env.*",
      "node_modules",
      ".git",
      "dist",
      "coverage"
    ]
  }
}
'@ | Out-File -FilePath ".\mcp\config.json" -Encoding UTF8

Write-Host "✅ 汎用MCP設定を作成しました"
```

## 5. セーブデータディレクトリの作成
ゲームのセーブデータを保存するディレクトリを作成：

```powershell
# セーブデータディレクトリの作成
New-Item -ItemType Directory -Force -Path ".\save-data"

# .gitignoreに追加（セーブデータをGitで管理しない場合）
Add-Content -Path ".\.gitignore" -Value @"

# Game save data
save-data/*.json
save-data/*.save
"@

# セーブデータディレクトリのREADME作成
@'
# セーブデータディレクトリ

このディレクトリにはゲームのセーブデータが保存されます。

## ファイル形式
- `game-state-*.json`: ゲーム進行状況
- `player-*.json`: プレイヤーデータ
- `settings.json`: ゲーム設定

## 注意事項
- このディレクトリのファイルは自動生成されます
- 手動で編集しないでください
- バックアップを定期的に取ることを推奨します
'@ | Out-File -FilePath ".\save-data\README.md" -Encoding UTF8

Write-Host "✅ セーブデータディレクトリを作成しました"
```

## 6. MCP起動用バッチファイルの作成

### 開発時にMCPサーバーを起動するバッチファイル：
```powershell
# scriptsディレクトリの作成
New-Item -ItemType Directory -Force -Path ".\scripts"

# MCP起動バッチファイルの作成
@'
@echo off
echo 🎮 Starting MCP Servers for Life Fulfillment Game...
echo =====================================

REM Get current directory
set PROJECT_DIR=%cd%

echo 📁 Project Directory: %PROJECT_DIR%
echo.

REM Start Filesystem MCP Server
echo Starting Filesystem MCP Server...
start /B npx -y @modelcontextprotocol/server-filesystem "%PROJECT_DIR%" "%PROJECT_DIR%\public\assets" "%PROJECT_DIR%\save-data"

echo.
echo ✅ MCP Servers started!
echo.
echo 📝 Available in:
echo    - VS Code (with MCP extension)
echo    - Cursor
echo    - Windsurf
echo    - Cline
echo.
echo Press Ctrl+C to stop the servers.
pause >nul
'@ | Out-File -FilePath ".\scripts\start-mcp.bat" -Encoding ASCII

Write-Host "✅ MCP起動バッチファイルを作成しました"
```

## 7. MCP動作確認スクリプトの作成

### Node.jsスクリプトで設定を確認：
```powershell
# テストスクリプトの作成
@'
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
'@ | Out-File -FilePath ".\scripts\test-mcp.js" -Encoding UTF8

# package.jsonにスクリプトを追加
$packageJson = Get-Content -Path ".\package.json" -Raw | ConvertFrom-Json
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "test:mcp" -Value "node scripts/test-mcp.js" -Force
$packageJson.scripts | Add-Member -MemberType NoteProperty -Name "mcp:start" -Value "scripts\start-mcp.bat" -Force
$packageJson | ConvertTo-Json -Depth 100 | Set-Content -Path ".\package.json" -Encoding UTF8

Write-Host "✅ package.jsonにMCP関連スクリプトを追加しました"
```

## 8. 環境変数の設定（オプション）

### システム環境変数にプロジェクトパスを設定：
```powershell
# 現在のユーザー用の環境変数を設定（管理者権限不要）
[Environment]::SetEnvironmentVariable("LIFE_FULFILLMENT_GAME_PATH", (Get-Location).Path, [EnvironmentVariableTarget]::User)

Write-Host "✅ 環境変数 LIFE_FULFILLMENT_GAME_PATH を設定しました"
```

## 9. 動作確認
設定が完了したら、以下のコマンドで確認：

```powershell
# PowerShellで確認
pnpm test:mcp

# MCP設定ファイルの確認
Get-Content -Path ".\.vscode\mcp.json"
Get-Content -Path ".\mcp\config.json"
```

## 10. MCPサーバーの起動

### 方法1: バッチファイルで起動
```powershell
# PowerShellから実行
.\scripts\start-mcp.bat
```

### 方法2: npm scriptで起動
```powershell
pnpm mcp:start
```

## 11. エディタでの使用

### VS Codeの場合：
1. MCP拡張機能をインストール
2. VS Codeを再起動
3. コマンドパレット（Ctrl+Shift+P）から「MCP: Connect to Server」を選択

### Cursorの場合：
1. Cursorを起動
2. 設定でMCPが有効になっていることを確認
3. AIアシスタントがファイルシステムツールを使用可能

## 完了！
Windows環境でのMCP設定が完了しました。以下のような操作が可能になります：

- 「save-data\test.jsonにゲームデータを保存して」
- 「public\assets内の画像ファイル一覧を表示して」
- 「src\App.vueを読み込んで現在の実装状況を教えて」

問題が発生した場合は、`pnpm test:mcp`を実行して診断情報を確認してください。
```

---

## 🚀 使用方法

1. **上記の指示セクション全体をコピー**
2. **Claude Codeに貼り付け**
3. **Claude Codeが自動的に環境を設定**
4. **`scripts\start-mcp.bat`でMCPサーバーを起動**
5. **VS CodeやCursorでMCPツールが使えることを確認**

## ⚠️ Windows固有の注意事項

- パスの区切り文字は`\`（バックスラッシュ）を使用
- JSONファイル内では`\\`（エスケープ）が必要
- PowerShellスクリプトの実行ポリシーに注意
- 文字エンコーディングはUTF-8を使用

## 🔧 トラブルシューティング

### PowerShellスクリプトが実行できない場合：
```powershell
# 実行ポリシーを一時的に変更
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
```

### npmxコマンドが見つからない場合：
```powershell
# Node.jsが正しくインストールされているか確認
node --version
npm --version

# npxを直接実行
npm exec -y @modelcontextprotocol/server-filesystem .
```

### VS CodeでMCPが認識されない場合：
1. MCP拡張機能が最新版か確認
2. `.vscode\mcp.json`のパスが正しいか確認
3. VS Codeを再起動

---

**このドキュメントを使用することで、Windows環境でClaude Code自身がMCP環境を完全に設定できます。**