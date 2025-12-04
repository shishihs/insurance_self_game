# 開発ガイド

> **最終更新**: 2025/12/03
> **文書種別**: 開発ガイド
> **更新頻度**: 開発手順・ツール変更時に更新

## 🚀 プロジェクト概要

人生充実ゲーム（Life Fulfillment Game）は、生命保険を「人生の味方」として描く革新的な一人用デッキ構築ゲームです。
本プロジェクトは、シンプルで軽量なボードゲーム基盤として再構築されました。

## 🚨 現在の開発状況 (2025/12/03)

### 最新の変更点 ✅
- **コードベースの軽量化**: 不要な分析・パフォーマンス監視・PWA機能を削除
- **依存関係の整理**: 開発に必要な最小限の構成に最適化
- **CUIツールの維持**: バランス調整用の強力なCUIツールは継続利用可能

### 主要な技術スタック
- **フロントエンド**: Vue 3.5 + TypeScript 5.8 (strict mode)
- **ゲームエンジン**: Phaser 3.90
- **アーキテクチャ**: Domain-Driven Design (DDD) + サービスレイヤーパターン
- **ビルドツール**: Vite 5
- **テスト**: Vitest + Playwright (E2E)
- **デプロイ**: GitHub Pages + GitHub Actions

## 🔄 開発フロー

### 基本的な開発サイクル

1. **タスク管理**
   - 新機能実装前にタスクを明確化
   - 小さな単位で実装を進める

2. **実装とテスト**
   - TypeScript strict modeでの型安全性確保
   - 単体テスト・統合テスト・E2Eテストの実行

3. **デプロイ**
   - 変更をコミットし、GitHub Pagesへデプロイ

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
npm run type-check

# Lintチェック
npm run lint

# フォーマット
npm run format
```

#### テスト実行
```bash
# 単体テスト（Vitest）
npm run test

# E2Eテスト（Playwright）
npm run test:e2e

# テストカバレッジ
npm run test:coverage
```

#### CUIツール（開発者・バランス調整用）
```bash
# CUIヘルプ表示
npm run cui:help

# インタラクティブゲームプレイ
npm run cui:play

# AIデモンストレーション
npm run cui:demo

# チュートリアルモード
npm run cui:tutorial

# デバッグモード
npm run cui:debug
```

#### デプロイ
```bash
# GitHub Pagesへのデプロイ
npm run deploy
```

### 開発環境要件

#### 必須ツール
- **Node.js**: 18.0.0以上
- **npm**: パッケージマネージャー
- **Git**: バージョン管理

#### 推奨ツール
- **VS Code**: 統合開発環境
- **Vue.js devtools**: ブラウザ拡張機能

### プロジェクト構造

```
insurance_game/
├── src/                      # ソースコード
│   ├── components/          # Vueコンポーネント
│   │   ├── accessibility/   # アクセシビリティ対応
│   │   ├── animations/      # アニメーション
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
│   └── cli/                 # CLIツール
├── docs/                    # ドキュメント
│   ├── design/             # 設計書
│   ├── development/        # 開発ガイド
│   └── manual/            # ユーザーマニュアル
├── scripts/               # 開発スクリプト
├── tests/                 # テストファイル
└── public/               # 静的アセット
```

## 📚 関連ドキュメント

- [技術仕様書](../design/TECH_SPEC.md) - アーキテクチャと技術スタック
- [ゲームデザイン](../design/GAME_DESIGN.md) - ゲームルールと仕様
- [ユーザーマニュアル](../manual/GAME_MANUAL.md) - プレイヤー向けガイド