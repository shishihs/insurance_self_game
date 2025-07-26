# 人生充実ゲーム (Life Fulfillment Game)

生命保険を「人生の味方」として描く革新的な一人用デッキ構築ゲーム

## 🎮 ゲーム概要

プレイヤーは人生の各ステージで様々なチャレンジに立ち向かい、保険カードを活用しながら充実した人生を送ることを目指します。

## 🚀 開発状況

### Phase 1: プロトタイプ開発中
- ✅ Phaser 3統合完了
- ✅ 基本的なカードシステム実装
- ✅ ドラッグ＆ドロップ機能
- 🔄 ゲームループ実装中

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
# Windows
run-dev.bat

# または
pnpm dev
```

http://localhost:5173 でアクセス可能

### ビルド
```bash
# Windows
run-build.bat

# または
pnpm build
```

### テスト
```bash
pnpm test
```

## 🎮 操作方法

1. **ゲームをプレイ**ボタンをクリックしてゲーム開始
2. カードをクリックで選択/選択解除
3. カードをドラッグしてチャレンジエリアにドロップ
4. アクションボタンで各種操作

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

- [開発原則](./PRINCIPLES.md)
- [技術仕様](./TECH_SPEC.md)
- [ゲームデザイン](./GAME_DESIGN.md)
- [開発ガイド](./DEVELOPMENT.md)
- [作業状況](./WORK_STATUS.md)
- [ロードマップ](./ROADMAP.md)

## 🚀 デプロイ

GitHub Actionsで自動デプロイが設定されています。
`master`ブランチへのプッシュで自動的にGitHub Pagesにデプロイされます。

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

---

💡 **開発者へ**: Claude Codeとの共同開発プロジェクトです。詳細は[CLAUDE.md](./CLAUDE.md)を参照してください。