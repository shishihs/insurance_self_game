# MCP (Model Context Protocol) セットアップガイド

## 概要
Model Context Protocol (MCP) により、Claude Codeが外部ツールやデータソースにアクセスできるようになります。
このプロジェクトでは以下のMCPサーバーを利用します：

- **filesystem**: ファイルシステムアクセス
- **playwright**: Web自動テスト・動作確認
- **github**: GitHub API連携
- **gemini-cli**: Gemini AI への直接アクセス

## セットアップ手順

### 1. GitHub Personal Access Token の作成

1. GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. "Generate new token (classic)" を選択
3. 以下のスコープを選択：
   - `repo` (Full control of private repositories)
   - `workflow` (Update GitHub Action workflows)
   - `read:org` (Read org and team membership)
4. トークンを生成し、安全な場所に保存

### 2. 環境変数の設定

#### Windows (PowerShell)
```powershell
# ユーザー環境変数として設定
[Environment]::SetEnvironmentVariable("GITHUB_TOKEN", "YOUR_TOKEN_HERE", "User")

# または一時的なセッション用
$env:GITHUB_TOKEN = "YOUR_TOKEN_HERE"
```

#### Windows (コマンドプロンプト)
```cmd
setx GITHUB_TOKEN "YOUR_TOKEN_HERE"
```

#### macOS/Linux
```bash
# ~/.bashrc または ~/.zshrc に追加
export GITHUB_TOKEN="YOUR_TOKEN_HERE"

# 設定を反映
source ~/.bashrc  # または ~/.zshrc
```

### 3. MCP設定の確認

設定ファイル: `mcp/config.json`

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", ".", "./public/assets", "./save-data"],
      "description": "ファイルシステムアクセス（プロジェクト、アセット、セーブデータ）"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"],
      "description": "Webサイト自動テスト・動作確認（デプロイ検証用）"
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      },
      "description": "GitHub API連携（リポジトリ操作、Issues、PRs、Actions確認）"
    },
    "gemini-cli": {
      "command": "npx",
      "args": ["-y", "@choplin/mcp-gemini-cli"],
      "description": "Gemini AI への直接アクセス（コード生成、分析、質問応答）"
    }
  }
}
```

### 4. Claude Code での利用開始

Claude Codeを再起動すると、設定したMCPサーバーが利用可能になります。

## 利用可能な機能

### Gemini CLI の主要機能

1. **AI アシスタント機能**
   - コード生成・リファクタリング支援
   - バグ分析と修正提案
   - アルゴリズム最適化の提案

2. **技術相談**
   - ベストプラクティスの提案
   - アーキテクチャ設計のアドバイス
   - パフォーマンス改善のヒント

3. **ドキュメント生成**
   - コメント自動生成
   - README の作成支援
   - API ドキュメント作成

### GitHub MCP の主要機能

1. **リポジトリ管理**
   - ファイルの作成・更新・削除
   - ブランチ操作
   - 自動ブランチ作成

2. **Issues & Pull Requests**
   - Issues の検索・作成・更新
   - PRs の検索・作成・レビュー

3. **GitHub Actions**
   - ワークフロー実行状況の確認
   - 失敗したジョブの詳細確認

4. **検索機能**
   - コード検索
   - Issues/PRs 検索
   - ユーザー検索

### 使用例

```bash
# GitHub Actions の最新実行状況を確認
- リポジトリのワークフロー一覧を取得
- 特定のワークフロー実行の詳細確認

# Issues の管理
- 新しい Issue の作成
- 既存 Issues の検索・フィルタリング

# Pull Request の操作
- 新しい PR の作成
- PR のマージ・クローズ
```

## セキュリティ注意事項

1. **トークンの管理**
   - Personal Access Token は適切な権限のみ付与
   - トークンの定期的な更新を推奨
   - Git リポジトリにトークンをコミットしない

2. **アクセス制御**
   - 必要最小限のリポジトリアクセス権限
   - 組織のセキュリティポリシーに準拠

## トラブルシューティング

### 認証エラー
```
Error: Authentication failed
```
- GITHUB_TOKEN 環境変数が正しく設定されているか確認
- トークンの有効期限をチェック
- 必要なスコープが付与されているか確認

### MCP サーバー起動エラー
```
Error: Failed to start MCP server
```
- `npx @modelcontextprotocol/server-github` を直接実行してエラー詳細を確認
- Node.js のバージョンが適切か確認（推奨: Node.js 18+）

### 権限エラー
```
Error: Insufficient permissions
```
- Personal Access Token に適切なスコープが付与されているか確認
- 対象リポジトリへのアクセス権限があるか確認

## 参考リンク

- [Model Context Protocol 公式ドキュメント](https://modelcontextprotocol.io/)
- [GitHub MCP Server](https://github.com/modelcontextprotocol/servers)
- [Claude Code MCP サポート](https://docs.anthropic.com/en/docs/claude-code/mcp)