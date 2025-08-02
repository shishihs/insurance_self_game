# 開発ガイド

> **最終更新**: 2025/08/02  
> **文書種別**: 開発ガイド  
> **更新頻度**: 開発手順・ツール変更時に更新

## 🚀 プロジェクト概要

人生充実ゲーム（Life Fulfillment Game）は、生命保険を「人生の味方」として描く革新的な一人用デッキ構築ゲームです。v0.3.1では、GitHub Issues統合、259テストによる包括的テストスイート、CSPセキュリティ対策などが実装されています。

## 🚨 現在の開発状況 (2025/08/02)

### 解決済みの成果 ✅
- **GitHub Issues移行**: ドキュメントベース → GitHub Issues（効率的な問題追跡）
- **テストカバレッジ拡張**: 96→259テスト（170%増加）
- **Menu initialization fixed**: ゲーム起動問題の完全解決
- **CSP対策**: セキュリティヘッダーとContent Security Policy実装

### 現在の技術的課題 🚨
- **テスト実行環境**: SecurityAuditLogger.test.tsで環境変数エラー（6テスト失敗）
- **Vitestスタートアップ**: patheパッケージの型エラーでテスト実行困難
- **ESLint設定**: Minimal configurationに縮小（ワークフロー成功優先）

### 主要な技術スタック
- **フロントエンド**: Vue 3.5 + TypeScript 5.8 (strict mode)
- **ゲームエンジン**: Phaser 3.90
- **アーキテクチャ**: Domain-Driven Design (DDD) + サービスレイヤーパターン
- **ビルドツール**: Vite 5
- **テスト**: Vitest + Playwright (E2E)
- **デプロイ**: GitHub Pages + GitHub Actions

## 🔄 開発フロー

### 基本的な開発サイクル

1. **TodoWriteツールでタスク管理**
   - 新機能実装前にTODOリストを作成
   - 1つのTODOは2時間以内で完了できるサイズに分割
   - タスクステータスを適切に更新（pending → in_progress → completed）

2. **PRINCIPLES.mdの確認**
   - 実装前に[開発原則](./PRINCIPLES.md)を確認
   - 「プレイヤー体験至上主義」を念頭に置いた設計

3. **実装とテスト**
   - TypeScript strict modeでの型安全性確保
   - 単体テスト・統合テスト・E2Eテストの実行

4. **1 TODO = 1 デプロイ**
   - 各TODO完了後、即座にコミット・デプロイ
   - 小さく確実な価値提供の積み重ね

### SubAgent活用

```bash
# ゲームロジック実装
/agents use game-logic

# UI/UX改善
/agents use ui-designer

# データ管理
/agents use data-manager

# テスト作成
/agents use test-specialist
```

## 🚀 セットアップと実行

### クイックスタート

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:5173 にアクセス
```

### 主要なコマンド

#### 開発・ビルド
```bash
# 開発サーバー（ホットリロード付き）
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# TypeScript型チェック
npm type-check

# Lintチェック
npm run lint

# Lint自動修正
npm run lint:fix
```

#### テスト実行
```bash
# 単体テスト（Vitest）
npm run test

# E2Eテスト（Playwright）
npm run test:e2e

# テストカバレッジ
npm run test:coverage

# テストレポート生成
npm run test:report
```

#### CUIツール（開発者向け）
```bash
# インタラクティブゲームプレイ
npm cui:play

# AIデモンストレーション
npm cui:demo

# 大規模ベンチマーク
npm benchmark:massive

# パフォーマンス分析
npm analyze:performance

# コード品質分析
npm analyze:quality
```

#### デプロイ・チェック
```bash
# デプロイ状況確認
npm check:deployment

# ゲーム動作確認
npm check:game

# セキュリティチェック
npm check:security

# モバイルテスト
npm run test:mobile
```

### 開発環境要件

#### 必須ツール
- **Node.js**: 18.0.0以上
- **pnpm**: 8.0.0以上（推奨パッケージマネージャー）
- **Git**: バージョン管理

#### 推奨ツール
- **VS Code**: 統合開発環境
- **Vue.js devtools**: ブラウザ拡張機能
- **TypeScript**: 言語サポート

### プロジェクト構造

```
insurance_game/
├── src/                      # ソースコード
│   ├── components/          # Vueコンポーネント
│   │   ├── accessibility/   # アクセシビリティ対応
│   │   ├── animations/      # アニメーション
│   │   ├── feedback/        # フィードバック収集
│   │   ├── statistics/      # 統計ダッシュボード
│   │   └── mobile/          # モバイル専用UI
│   ├── domain/              # ドメインレイヤー
│   │   ├── entities/        # エンティティ
│   │   ├── services/        # ドメインサービス
│   │   ├── aggregates/      # 集約
│   │   └── valueObjects/    # 値オブジェクト
│   ├── game/                # Phaserゲームエンジン
│   │   ├── scenes/          # ゲームシーン
│   │   ├── systems/         # ゲームシステム
│   │   └── ui/              # ゲームUI
│   ├── cui/                 # CUI開発ツール
│   └── analytics/           # 分析・統計
├── docs/                    # ドキュメント
│   ├── design/             # 設計書
│   ├── development/        # 開発ガイド
│   ├── manual/            # ユーザーマニュアル
│   └── planning/          # 計画・進捗
├── scripts/               # 開発スクリプト
├── tests/                 # テストファイル
└── public/               # 静的アセット
```
```json
{
  "name": "life-fulfillment-game",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "type-check": "vue-tsc --noEmit",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts",
    "format": "prettier --write .",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "principles": "cat docs/PRINCIPLES.md"
  },
  "dependencies": {
    "vue": "^3.5.0",
    "phaser": "^3.80.0",
    "pinia": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "@vue/test-utils": "^2.4.0",
    "typescript": "^5.6.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "vue-tsc": "^2.0.0",
    "unocss": "^0.58.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Step 4: 依存関係インストール
```bash
# pnpmを使用（推奨）
npm install

# またはnpm
npm install
```

## 🎮 OKボタンゲーム実装（Phase 0）

### Step 1: エントリーポイント作成
```bash
# index.html
touch index.html
```

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>人生充実ゲーム</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

### Step 2: Vue アプリケーション作成
```bash
# メインファイル
touch src/main.ts
touch src/App.vue
```

```typescript
// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import 'uno.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

### Step 3: シンプルゲーム実装
```vue
<!-- src/App.vue -->
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100">
    <div class="bg-white p-8 rounded-lg shadow-lg text-center">
      <h1 class="text-3xl font-bold mb-4">人生充実ゲーム</h1>
      <p class="text-6xl mb-8">{{ count }}</p>
      <button 
        @click="incrementCount" 
        class="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
      >
        OK!
      </button>
      <button 
        @click="resetCount" 
        class="ml-4 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition"
      >
        リセット
      </button>
      <p class="mt-4 text-gray-600">クリック数: {{ count }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)

const incrementCount = () => {
  count.value++
  if (count.value % 10 === 0) {
    alert(`すごい！${count.value}回も押しました！`)
  }
}

const resetCount = () => {
  if (confirm('本当にリセットしますか？')) {
    count.value = 0
  }
}
</script>
```

## 🔧 よく使うClaude Codeコマンド

### ファイル操作
```bash
# ファイル作成
touch src/domain/models/Card.ts

# ディレクトリ作成
mkdir -p src/presentation/components/game

# ファイル一覧
ls -la src/

# ファイル内容確認
cat src/main.ts

# ファイル編集（Claude Codeは自動的に適切なエディタを使用）
# 単に実装内容を伝えれば良い
```

### Git操作
```bash
# 状態確認
git status

# 変更を追加
git add .

# コミット（PRINCIPLESを読んでから！）
git commit -m "feat: OKボタンゲームの実装"

# リモート追加
git remote add origin https://github.com/[username]/life-fulfillment-game.git

# プッシュ
git push -u origin main
```

### 開発サーバー
```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# プレビュー
npm run preview

# 型チェック
npm type-check

# テスト実行
npm run test
```

## 📝 タスク完了フック

### Claude Code用タスク完了スクリプト
```bash
# scripts/task-complete.sh
#!/bin/bash

echo "=== タスク完了 ==="
echo ""
echo "🎯 PRINCIPLES.md の確認..."
echo ""
cat docs/PRINCIPLES.md | grep -A 5 "タスク完了時の復唱"
echo ""
echo "✅ チェックリスト:"
echo "  □ プレイヤーファーストで実装した"
echo "  □ 可能な限りシンプルにした"
echo "  □ テストを書いて品質を保証した"
echo "  □ ドキュメントを更新した"
echo "  □ 次の人が理解できるコードにした"
echo ""
read -p "上記を確認しましたか？ (y/n): " confirm
if [ "$confirm" = "y" ]; then
  echo "素晴らしい！次のタスクも頑張りましょう！"
else
  echo "PRINCIPLES.mdをもう一度読み返してください。"
fi
```

### package.jsonにタスク完了コマンド追加
```json
{
  "scripts": {
    "task:complete": "bash scripts/task-complete.sh",
    "tc": "npm task:complete"
  }
}
```

## 🔄 一時的変更管理ガイドライン

### 緊急デプロイ時の一時的変更手順

#### 1. 一時的無効化の原則
```bash
# ❌ 削除禁止 - ファイルを削除しない
rm problematic-file.ts

# ✅ 推奨 - .bakファイルに変更
mv problematic-file.ts problematic-file.ts.bak

# ✅ または拡張子変更で無効化
mv test.spec.ts test.spec.ts.disabled
```

#### 2. 必須TODO管理
一時的変更を行った場合は**必ず**TodoWriteツールで復元タスクを追加：

```bash
# 例: テストファイルを一時無効化した場合
TodoWrite: "一時的に無効化したテストファイルを復元する（ファイル名.bak）"
TodoWrite: "無効化の根本原因を調査・修正する"
```

#### 3. コミットメッセージの明記
```bash
# 一時的変更であることを明記
git commit -m "fix(temp): Temporarily disable failing tests for urgent deployment

- Move Card.test.ts to Card.test.ts.bak
- TODO: Restore tests after root cause investigation
- Reason: CI/CD blocking critical deployment

🤖 Generated with [Claude Code](https://claude.ai/code)"
```

#### 4. 復元スケジュール
- **即座復元**: 緊急度が低い場合、同日中に復元
- **調査後復元**: 根本原因調査が必要な場合、1週間以内
- **段階的復元**: 複雑な場合、部分的に復元

#### 5. 禁止事項
- ❌ `.bak`ファイルをコミットに含める（.gitignoreで除外）
- ❌ 一時的変更のまま放置する
- ❌ TODOタスクを作成せずに一時的変更する
- ❌ チーム通知なしに本番に影響する変更をする

#### 6. .gitignoreへの追加
```bash
# 一時的ファイルの除外
*.bak
*.disabled
*.temp
*_temp
*_backup
```

### 緊急デプロイチェックリスト
```bash
□ 一時的変更にTODOタスクを作成した
□ コミットメッセージに「temp」「temporary」を明記した
□ .bakファイルが.gitignoreされている
□ 復元期限を設定した（目安：1週間以内）
□ 根本原因調査のタスクを作成した
```

### 報告スタイル規約
#### 絶対禁止
- ❌ 「〜はずです」「〜と思います」「〜の予定です」で終わる報告
- ❌ 推測や期待で完了報告をする
- ❌ 実際の結果確認なしに成功を報告する

#### 必須
- ✅ 「〜しました」「〜が成功しました」「〜を確認しました」で報告
- ✅ 実際の結果を確認してから報告する
- ✅ エラーの場合は具体的な失敗内容を明記する

#### 報告テンプレート
```
❌ NG例: 「デプロイがうまくいくはずです」
✅ OK例: 「デプロイが成功しました。https://example.com で動作確認済みです」

❌ NG例: 「テストが通ると思います」  
✅ OK例: 「テストが全て通りました。3/3件成功を確認しました」
```

## 🚨 トラブルシューティング

### よくある問題と解決方法

#### 1. TypeScriptエラー
```bash
# 型定義の再生成
npm type-check

# node_modulesの再インストール
rm -rf node_modules package-lock.json
npm install
```

#### 2. Viteが起動しない
```bash
# ポート確認
lsof -i :5173

# キャッシュクリア
rm -rf node_modules/.vite
```

#### 3. Gitの問題
```bash
# 大きなファイルのエラー
git rm --cached [large-file]
echo "[large-file]" >> .gitignore

# マージコンフリクト
git status
# 手動で解決後
git add .
git commit
```

## 🎯 効率的な開発のコツ

### 1. 小さく始める
- まず動くものを作る
- 完璧を求めない
- 段階的に改善

### 2. 頻繁にコミット
- 機能単位でコミット
- わかりやすいメッセージ
- 履歴を大切に

### 3. テストを書く
- 実装前にテストケース
- 重要な部分から
- リファクタリングの安心感

### 4. ドキュメント更新
- コードと同時に更新
- 未来の自分のため
- チームのため

## 📊 開発メトリクス

### 確認すべき指標
```bash
# コードカバレッジ
npm run test -- --coverage

# バンドルサイズ
npm run build
ls -lh dist/assets/

# パフォーマンス
# ブラウザのLighthouseで確認
```

### 目標値
- テストカバレッジ: 80%以上
- 初回ロード: 3秒以内
- Lighthouseスコア: 90以上
- TypeScriptエラー: 0

## 📚 関連ドキュメント

- [開発原則](./PRINCIPLES.md) - プロジェクトの核となる開発思想
- [技術仕様書](../design/TECH_SPEC.md) - アーキテクチャと技術スタック
- [ゲームデザイン](../design/GAME_DESIGN.md) - ゲームルールと仕様
- [MCP設定ガイド](./MCP_SETUP.md) - Model Context Protocol設定
- [Issue完了ガイドライン](./ISSUE_COMPLETION_GUIDE.md) - Issue対応の完了手順
- [パッケージマネージャー選択](./PACKAGE_MANAGER_CHOICE.md) - npmを使用する理由
- [GUI/CUI使い分けガイド](./GUI_AND_CUI_USAGE_GUIDE.md) - 本番用GUIと開発用CUI

---

**Tips**: Claude Codeは賢いので、具体的な実装内容を伝えれば適切にファイルを作成・編集してくれます。「○○を実装して」と伝えるだけでOK！