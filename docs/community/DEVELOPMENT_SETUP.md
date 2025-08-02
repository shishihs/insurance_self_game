# 開発環境セットアップガイド

> **最終更新**: 2025/08/01  
> **文書種別**: 手順書  
> **更新頻度**: 必要に応じて

## 概要

insurance_gameプロジェクトの開発に参加するための環境構築ガイドです。初心者から上級者まで、スムーズに開発を始められるよう詳細な手順を提供します。

## 📋 目次

1. [前提条件](#前提条件)
2. [基本セットアップ](#基本セットアップ)
3. [IDE・エディタ設定](#ideエディタ設定)
4. [開発ツール設定](#開発ツール設定)
5. [動作確認](#動作確認)
6. [トラブルシューティング](#トラブルシューティング)

## 🔧 前提条件

### 必須ソフトウェア

#### Node.js（v18.0以上）
```bash
# バージョン確認
node --version
npm --version

# 期待される出力例
# v18.17.0 (またはそれ以上)
# 9.6.7 (またはそれ以上)
```

**インストール方法**:
- **公式サイト**: [nodejs.org](https://nodejs.org/) からLTS版をダウンロード
- **nvm使用**: Node.jsのバージョン管理ツール（推奨）

#### Git（最新版）
```bash
# バージョン確認
git --version

# 期待される出力例
# git version 2.41.0 (またはそれ以上)
```

**インストール方法**:
- **Windows**: [Git for Windows](https://gitforwindows.org/)
- **macOS**: `brew install git` または Xcode Command Line Tools
- **Linux**: `sudo apt install git`（Ubuntu/Debian）

#### モダンブラウザ
- **Chrome 120以上**（推奨）
- **Firefox 119以上**
- **Safari 17以上**
- **Edge 120以上**

### 推奨ソフトウェア

#### Node.js バージョン管理
```bash
# nvm（Linux/macOS）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash

# nvm-windows（Windows）
# https://github.com/coreybutler/nvm-windows からダウンロード

# 使用例
nvm install 18.17.0
nvm use 18.17.0
```

#### パッケージマネージャー
```bash
# npm（Node.js付属、プロジェクト標準）
npm --version

# 他の選択肢（お好みで）
# yarn --version
# pnpm --version
```

## 🚀 基本セットアップ

### 1. リポジトリのフォーク

#### GitHub上での操作
1. [プロジェクトページ](https://github.com/shishihs/insurance_self_game)にアクセス
2. 右上の「Fork」ボタンをクリック
3. 自分のアカウントにフォークを作成

#### ローカルへのクローン
```bash
# HTTPSでクローン（推奨）
git clone https://github.com/YOUR_USERNAME/insurance_self_game.git

# SSHでクローン（SSH設定済みの場合）
git clone git@github.com:YOUR_USERNAME/insurance_self_game.git

# ディレクトリに移動
cd insurance_self_game
```

### 2. リモートリポジトリの設定

```bash
# 元のリポジトリをupstreamとして追加
git remote add upstream https://github.com/shishihs/insurance_self_game.git

# リモートの確認
git remote -v

# 期待される出力
# origin    https://github.com/YOUR_USERNAME/insurance_self_game.git (fetch)
# origin    https://github.com/YOUR_USERNAME/insurance_self_game.git (push)
# upstream  https://github.com/shishihs/insurance_self_game.git (fetch)
# upstream  https://github.com/shishihs/insurance_self_game.git (push)
```

### 3. 依存関係のインストール

```bash
# 依存関係のインストール
npm install

# インストール確認
npm list --depth=0
```

**インストールされる主要パッケージ**:
- **Vue.js 3**: フロントエンドフレームワーク
- **TypeScript**: 型安全な開発
- **Vite**: 高速ビルドツール
- **Tailwind CSS**: CSSフレームワーク
- **Vitest**: テストフレームワーク

### 4. 環境変数の設定

```bash
# .env.localファイルを作成（任意）
touch .env.local

# 開発用設定例
echo "VITE_APP_VERSION=dev" >> .env.local
echo "VITE_DEBUG_MODE=true" >> .env.local
```

## 🖥 IDE・エディタ設定

### Visual Studio Code（推奨）

#### 必須拡張機能
```json
{
  "recommendations": [
    "Vue.volar",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next"
  ]
}
```

#### 設定ファイル（.vscode/settings.json）
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "vue.codeActions.enabled": true,
  "tailwindCSS.includeLanguages": {
    "vue": "html"
  }
}
```

#### ワークスペース設定
```json
{
  "folders": [
    {
      "path": "."
    }
  ],
  "settings": {
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/.git": true
    }
  }
}
```

### その他のエディタ

#### WebStorm（JetBrains）
1. プロジェクトを開く
2. Node.jsプラグインを有効化
3. Vue.jsプラグインを有効化
4. TypeScriptサポートを有効化

#### Vim/Neovim
```vim
" .vimrc設定例
Plug 'posva/vim-vue'
Plug 'leafgarland/typescript-vim'
Plug 'prettier/vim-prettier'
Plug 'dense-analysis/ale'
```

## 🛠 開発ツール設定

### ESLint・Prettier設定

#### 既存設定の確認
```bash
# ESLint設定確認
cat .eslintrc.cjs

# Prettier設定確認
cat .prettierrc
```

#### コマンドでの使用
```bash
# リント実行
npm run lint

# リント自動修正
npm run lint:fix

# フォーマット実行
npm run format

# 型チェック
npm run type-check
```

### Git フック設定

#### Pre-commit フックの有効化
```bash
# pre-commitの実行権限付与（Linux/macOS）
chmod +x .git/hooks/pre-commit

# Windowsの場合
# Git Bashまたは適切な権限でファイルを編集
```

#### フック内容の確認
```bash
# pre-commitフックの確認
cat .git/hooks/pre-commit
```

### ブラウザ開発者ツール

#### Chrome DevTools 拡張
- **Vue.js devtools**: Vueコンポーネントのデバッグ
- **Redux DevTools**: 状態管理のデバッグ（使用時）

#### Firefox Developer Tools
- 標準の開発者ツールでVue.jsをサポート

## ✅ 動作確認

### 1. 開発サーバーの起動

```bash
# 開発サーバー起動
npm run dev

# 期待される出力
# ➜  Local:   http://localhost:5173/
# ➜  Network: http://192.168.1.100:5173/
```

### 2. ブラウザでの確認

1. **http://localhost:5173** にアクセス
2. ゲーム画面が正常に表示されることを確認
3. 基本操作（カード選択等）が動作することを確認

### 3. テストの実行

```bash
# 全テスト実行
npm run test:run

# テスト監視モード
npm run test:watch

# カバレッジ確認
npm run test:coverage
```

**期待される結果**:
```
✓ src/utils/game-logic.test.ts (5)
✓ src/components/GameCard.test.ts (3)
✓ src/domain/GameManager.test.ts (8)

Test Files  3 passed (3)
Tests  16 passed (16)
```

### 4. ビルドの確認

```bash
# 本番ビルド
npm run build

# ビルド結果の確認
ls -la dist/

# プレビュー（任意）
npm run preview
```

### 5. 開発ツールの動作確認

```bash
# リント確認
npm run lint

# 型チェック
npm run type-check

# 全チェック実行
npm run check:all
```

## 🔧 高度な設定

### デバッグ設定

#### VSCode Launch Configuration
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMaps": true
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run"],
      "console": "integratedTerminal"
    }
  ]
}
```

#### ブラウザでのソースマップ確認
1. 開発者ツールを開く
2. Sourcesタブで元のTypeScriptファイルが表示されることを確認
3. ブレークポイントを設定してデバッグ可能なことを確認

### パフォーマンス監視

#### Bundle Analyzer
```bash
# バンドル分析（追加でインストールが必要な場合）
npm install --save-dev rollup-plugin-visualizer

# 分析実行
npm run build
# dist/bundle-analysis.html が生成される
```

#### パフォーマンス測定
```bash
# Lighthouse CI（追加でインストールが必要な場合）
npm install -g @lhci/cli

# パフォーマンス測定
lhci autorun
```

## 🔄 日常的な開発フロー

### 作業開始時

```bash
# 最新の変更を取得
git fetch upstream
git checkout master
git merge upstream/master

# 新しいブランチを作成
git checkout -b feature/your-feature-name

# 依存関係の更新確認
npm install
```

### 開発中

```bash
# 開発サーバー起動
npm run dev

# 別ターミナルでテスト監視
npm run test:watch

# リント・型チェック（定期的に）
npm run lint
npm run type-check
```

### コミット前

```bash
# 全チェック実行
npm run check:all

# 変更をステージング
git add specific-files

# コミット
git commit -m "feat: add new feature"
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. `npm install` が失敗する

**症状**: パッケージインストール時にエラー

**解決方法**:
```bash
# キャッシュクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules package-lock.json
npm install

# Node.jsバージョン確認
node --version  # v18.0以上であることを確認
```

#### 2. 開発サーバーが起動しない

**症状**: `npm run dev` でエラーが発生

**解決方法**:
```bash
# ポートが使用されていないか確認
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# 別のポートで起動
npm run dev -- --port 5174

# ファイアウォール設定の確認
# Windowsの場合、Windows Defenderファイアウォールで許可
```

#### 3. テストが失敗する

**症状**: `npm run test:run` で失敗

**解決方法**:
```bash
# テスト環境のクリーンアップ
npm run test:clean

# 個別テストファイルで確認
npm run test:run src/__tests__/specific-test.test.ts

# デバッグモードでテスト実行
npm run test:debug
```

#### 4. TypeScript エラー

**症状**: 型チェックでエラーが発生

**解決方法**:
```bash
# TypeScriptキャッシュクリア
rm -rf node_modules/.cache/

# tsconfig.jsonの確認
cat tsconfig.json

# 段階的な型チェック
npx tsc --noEmit --incremental
```

#### 5. ESLint・Prettier 競合

**症状**: フォーマットが期待通りにならない

**解決方法**:
```bash
# 設定の確認
npm run lint -- --print-config src/main.ts

# Prettierとの競合チェック
npx eslint-config-prettier src/main.ts

# 手動でフォーマット
npm run format
npm run lint:fix
```

### 環境別の問題

#### Windows 固有の問題

**問題**: パスの区切り文字やファイル権限
```bash
# Git設定（改行コード）
git config core.autocrlf true

# PowerShell実行ポリシー
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### macOS 固有の問題

**問題**: Xcode Command Line Tools
```bash
# Xcode Command Line Toolsのインストール
xcode-select --install

# Homebrewでのツールインストール
brew install git node
```

#### Linux 固有の問題

**問題**: パッケージマネージャーでの依存関係
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install build-essential

# CentOS/RHEL
sudo yum groupinstall "Development Tools"
```

## 📚 学習リソース

### 公式ドキュメント
- [Vue.js 3](https://vuejs.org/guide/)
- [TypeScript](https://www.typescriptlang.org/docs/)
- [Vite](https://vitejs.dev/guide/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest](https://vitest.dev/guide/)

### プロジェクト固有のドキュメント
- [ゲームデザイン](../design/GAME_DESIGN.md)
- [技術仕様](../design/TECH_SPEC.md)
- [開発原則](../development/PRINCIPLES.md)
- [貢献ガイドライン](./CONTRIBUTING.md)

### チュートリアル・ガイド
- [Vue 3 + TypeScript チュートリアル](https://vuejs.org/guide/typescript/overview.html)
- [Tailwind CSS チュートリアル](https://tailwindcss.com/docs/utility-first)
- [Vitest テストの書き方](https://vitest.dev/guide/features.html)

## 🤝 サポート

### ヘルプが必要な時

#### GitHub Issues
- **setup** ラベルを付けて環境構築の質問
- **help wanted** ラベルでサポート要請

#### コミュニティ
- **GitHub Discussions**: 一般的な開発相談
- **プルリクエスト**: コードレビューでの学習

### 質問テンプレート

```markdown
## 🤔 問題の概要
[何ができない/うまくいかないか]

## 🖥 環境情報
- OS: [Windows 11 / macOS 14.0 / Ubuntu 22.04]
- Node.js: [バージョン]
- npm: [バージョン]
- ブラウザ: [Chrome 120.0 など]

## 📋 実行したコマンド
```bash
[実行したコマンドを記載]
```

## 🚫 エラーメッセージ
```
[エラーメッセージをそのまま貼り付け]
```

## 🔍 試したこと
- [試した解決方法1]
- [試した解決方法2]
```

---

## ✅ セットアップ完了チェックリスト

最終確認として、以下の項目をチェックしてください：

- [ ] Node.js v18.0以上がインストールされている
- [ ] Gitが正常に動作する
- [ ] リポジトリがローカルにクローンされている
- [ ] `npm install` が成功している
- [ ] `npm run dev` でサーバーが起動する
- [ ] ブラウザでゲーム画面が表示される
- [ ] `npm run test:run` でテストが通る
- [ ] `npm run lint` でエラーが出ない
- [ ] `npm run type-check` でエラーが出ない
- [ ] IDEの拡張機能が動作している
- [ ] Git コミットが正常に作成できる

すべてチェックできたら、開発環境の準備完了です！

---

**開発環境でお困りのことがあれば、遠慮なくご質問ください。**
**一緒に素晴らしいゲームを作りましょう！** 🚀✨