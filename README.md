# 人生充実ゲーム (Life Fulfillment Game)

[![Deploy Status](https://github.com/shishihs/insurance_self_game/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/shishihs/insurance_self_game/actions)

生命保険を「人生の味方」として描く革新的な一人用デッキ構築ゲーム

## 🎮 ゲーム概要

プレイヤーは人生の各ステージで様々なチャレンジに立ち向かい、保険カードを活用しながら充実した人生を送ることを目指します。

## 🚀 開発状況

### 現在のバージョン: v0.2.4

#### ✅ 完成機能
- **ゲームシステム**: カードプレイ、チャレンジ、ステージ進行
- **保険システム**: 期限切れ警告、更新機能、年齢別コスト
- **チュートリアル**: インタラクティブな学習体験
- **ドラッグ&ドロップ**: マグネティックスナップ、モバイル対応
- **CUIシステム**: ターミナルベースの開発ツール

#### 🔄 今後の予定
- サウンドエフェクト
- 実績システム
- データ永続化（セーブ/ロード）

## 🛠️ 技術スタック

- **フレームワーク**: Vue 3 + TypeScript
- **ゲームエンジン**: Phaser 3
- **ビルドツール**: Vite
- **スタイリング**: UnoCSS
- **テスト**: Vitest

## 📦 インストール

```bash
# 依存関係のインストール
pnpm install
```

## 🎯 実行方法

### 開発サーバー
```bash
pnpm dev
```

http://localhost:5173 でアクセス可能

### ビルド
```bash
pnpm build
```

### テスト
```bash
pnpm test
```

### CUIツール（開発者向け）
```bash
# インタラクティブプレイ
pnpm cui:play

# AIデモ
pnpm cui:demo

# パフォーマンス分析
pnpm analyze:performance

# 大規模ベンチマーク
pnpm benchmark:massive
```

## 🎮 操作方法

### マウス操作
1. **ゲームをプレイ**ボタンをクリックしてゲーム開始
2. カードをクリックで選択/選択解除
3. カードをドラッグしてチャレンジエリアにドロップ
4. アクションボタンで各種操作

### キーボード操作（アクセシビリティ対応）
- **Tab**: 次の要素へフォーカス移動
- **Shift+Tab**: 前の要素へフォーカス移動
- **矢印キー**: 方向指定のナビゲーション
- **Space/Enter**: 選択/決定
- **Esc**: キャンセル/選択解除
- **D**: カードをドロー
- **C**: チャレンジ開始
- **E**: ターン終了
- **1-7**: 手札カードを直接選択

## 🔧 開発環境

### Pre-commitフック
コード品質を保つため、コミット前に自動的にチェックが実行されます：
- TypeScript型チェック
- ESLintによるコード品質チェック
- テストの実行（Windows環境では現在無効）

初回セットアップ：
```bash
pnpm install  # huskyが自動的にセットアップされます
```

## 📚 プロジェクト構造

```
insurance_game/
├── src/
│   ├── components/     # Vueコンポーネント
│   ├── domain/        # ドメインモデル
│   │   ├── entities/  # エンティティ（Card, Deck, Game）
│   │   ├── types/     # 型定義
│   │   └── services/  # ビジネスロジック
│   └── game/          # Phaser関連
│       ├── scenes/    # ゲームシーン
│       ├── objects/   # ゲームオブジェクト
│       └── config/    # ゲーム設定
├── docs/              # ドキュメント
└── .github/           # GitHub Actions設定
```

## 📖 ドキュメント

### 開発者向け
- **[開発原則](./docs/development/PRINCIPLES.md)** - プロジェクトの核となる開発思想
- **[GUI/CUI使い分けガイド](./docs/development/GUI_AND_CUI_USAGE_GUIDE.md)** - 本番用GUIと開発用CUIの使い分け
- [開発ガイド](./docs/development/DEVELOPMENT.md) - セットアップと開発手順
- [技術仕様書](./docs/design/TECH_SPEC.md) - アーキテクチャと技術スタック
- [CUI使用ガイド](./docs/CUI_USAGE.md) - CUIツールの詳細な使い方

### ゲームデザイン
- [ゲームデザイン仕様書](./docs/design/GAME_DESIGN.md) - 最新のゲームルール
- [ゲームマニュアル](./docs/manual/GAME_MANUAL.md) - プレイ方法とルール説明
- [プリント＆プレイガイド](./docs/manual/PRINT_AND_PLAY_GUIDE.md) - 物理版の作成方法

### プロジェクト管理
- [ロードマップ](./docs/planning/ROADMAP.md) - 開発計画と今後の展望
- [作業状況](./docs/planning/WORK_STATUS.md) - 現在の進捗状況
- [ゲーム改善プロセス](./docs/planning/GAME_IMPROVEMENT_PROCESS.md) - テストプレイの進め方

## 🚀 デプロイ

GitHub Actionsで自動デプロイが設定されています。
`master`ブランチへのプッシュで自動的にGitHub Pagesにデプロイされます。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

💡 **開発者へ**: Claude Codeとの共同開発プロジェクトです。詳細は[CLAUDE.md](./CLAUDE.md)を参照してください。