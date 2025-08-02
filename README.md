# 人生充実ゲーム (Life Fulfillment Game)

[![Deploy Status](https://github.com/shishihs/insurance_self_game/workflows/Deploy%20to%20GitHub%20Pages/badge.svg)](https://github.com/shishihs/insurance_self_game/actions)

生命保険を「人生の味方」として描く革新的な一人用デッキ構築ゲーム

## 🎮 ゲーム概要

プレイヤーは人生の各ステージで様々なチャレンジに立ち向かい、保険カードを活用しながら充実した人生を送ることを目指します。

## 🚀 開発状況

### 現在のバージョン: v0.2.8

#### ✅ 完成機能
- **高度なゲームシステム**: ライフステージ管理、難易度自動調整、チャレンジ解決システム
- **アクセシビリティ対応**: WCAG 2.1 AA完全準拠、色覚異常対応、キーボードナビゲーション
- **モバイル最適化**: タッチ操作、PWA対応、レスポンシブデザイン
- **統計・分析システム**: リアルタイムダッシュボード、パフォーマンス分析
- **サウンドシステム**: Web Audio API による15種類の高品質サウンドエフェクト
- **実績・プログレッション**: スキルシステム、プレイヤー成長追跡
- **フィードバック収集**: リアルタイムユーザー体験分析
- **セキュリティ監査**: 自動脆弱性検出、コード品質分析
- **CUIシステム**: ターミナルベースの開発ツール

#### 🔄 今後の予定
- データ永続化（セーブ/ロード）強化
- 追加シナリオ（結婚、出産、転職イベント）
- オンライン機能（ランキング、SNS連携）

## 🛠️ 技術スタック

- **フレームワーク**: Vue 3.5 + TypeScript 5.8 (strict mode)
- **ゲームエンジン**: Phaser 3.90
- **アーキテクチャ**: DDD (Domain-Driven Design) + サービスレイヤーパターン
- **オーディオ**: Web Audio API (ファイル不要の動的音生成)
- **ビルドツール**: Vite 5
- **テスト**: Vitest + Playwright (E2E) + CUIテストシステム
- **デプロイ**: GitHub Pages + GitHub Actions

## 📦 インストール

```bash
# 依存関係のインストール
npm install
```

## 🎯 実行方法

### 開発サーバー
```bash
npm run dev
```

http://localhost:5173 でアクセス可能

### ビルド
```bash
npm run build
```

### テスト
```bash
npm run test
```

### 🚀 高速化コマンド（低スペック環境向け）

#### Type Check高速化
```bash
# インクリメンタルビルド（2回目以降高速）
npm run type-check:incremental

# パフォーマンス最適化版（厳格なルールを緩和）
npm run type-check:fast

# 並列型チェック（CPUコア数に応じて高速化）
npm run check:parallel
```

#### Lint高速化
```bash
# キャッシュ利用＆軽量設定
npm run lint:fast

# 並列Lint実行
npm run lint:parallel
```

#### 統合高速チェック
```bash
# Type Check + Lint の高速版
npm run check:fast
```

**💡 ヒント**: 
- 初回は`type-check:incremental`で`.tsbuildinfo`を生成
- 2回目以降は60-80%高速化
- メモリ不足の場合は`.npmrc`で`node-options=--max-old-space-size=2048`設定済み

### CUIツール（開発者向け）
```bash
# インタラクティブプレイ
npm cui:play

# AIデモ
npm cui:demo

# パフォーマンス分析
npm analyze:performance

# 大規模ベンチマーク
npm benchmark:massive
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
- **M**: サウンドのON/OFF切り替え

### サウンド機能
- **15種類のサウンドエフェクト**: カード操作、チャレンジ結果、UI操作音
- **Web Audio API**: ファイル不要の高品質な動的音生成
- **音楽理論に基づく設計**: C5-E5-G5和音、完全3度音程使用
- **設定の永続化**: 音量・有効状態をローカルストレージに自動保存
- **低レイテンシ**: 5ms未満のレスポンス時間
- **Mキー**: いつでもサウンドをON/OFF切り替え可能

## 🔧 開発環境

### Pre-commitフック
コード品質を保つため、コミット前に自動的にチェックが実行されます：
- TypeScript型チェック
- ESLintによるコード品質チェック
- テストの実行（Windows環境では現在無効）

初回セットアップ：
```bash
npm install  # huskyが自動的にセットアップされます
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
- **[パッケージマネージャー選択ガイド](./docs/development/PACKAGE_MANAGER_CHOICE.md)** - なぜnpmを使用するのか
- **[GUI/CUI使い分けガイド](./docs/development/GUI_AND_CUI_USAGE_GUIDE.md)** - 本番用GUIと開発用CUIの使い分け
- **[API ドキュメント](./docs/development/API_DOCUMENTATION.md)** - システムAPI詳細仕様書
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