# GUI と CUI の使い分けガイドライン

> **最終更新**: 2025/01/27  
> **文書種別**: 正式仕様書  
> **更新頻度**: 定期的

## 📋 概要

本プロジェクトでは、同じゲームロジックを **GUI（Graphical User Interface）** と **CUI（Character User Interface）** の2つのインターフェースで提供しています。それぞれが異なる目的と用途を持っており、開発者は適切に使い分ける必要があります。

## 🎮 GUI（Vue.js + Phaser）- 本番用プレイ環境

### 用途
- **エンドユーザー向けの本番環境**
- **一般プレイヤーがゲームを楽しむためのインターフェース**
- **デプロイ先**: GitHub Pages（https://shishihs.github.io/insurance_self_game/）

### 特徴
- 🎨 **ビジュアル重視**: 美しいグラフィック、アニメーション、パーティクルエフェクト
- 🖱️ **直感的操作**: ドラッグ&ドロップ、クリック操作
- 📱 **レスポンシブ対応**: PC・タブレット・スマートフォンで動作
- 🎓 **チュートリアル**: インタラクティブな学習体験
- 🔊 **マルチメディア**: サウンドエフェクト（将来実装）

### 実行方法
```bash
# 開発サーバー起動
npm run dev

# プロダクションビルド
npm run build

# プレビュー
npm run preview
```

### 主要コンポーネント
- `src/App.vue` - メインアプリケーション
- `src/components/game/GameCanvas.vue` - ゲーム画面
- `src/game/scenes/` - Phaserシーン（ゲームロジック）

## 🖥️ CUI（ターミナル）- 開発・テスト・分析用

### 用途
- **開発者向けのツール**
- **ゲームバランス調整**
- **パフォーマンステスト**
- **AI戦略開発**
- **統計分析**

### 2つのCLIシステム

#### 1. インタラクティブCUI（`npm cui`）
**用途**: 開発中のゲームプレイテスト、ビジュアルデバッグ

```bash
# プレイモード（人間プレイヤー）
npm cui:play

# デモモード（AI自動プレイ）
npm cui:demo

# チュートリアルモード
npm cui:tutorial

# ベンチマークモード
npm cui:benchmark

# デバッグモード
npm cui:debug
```

**特徴**:
- 📊 美しいASCIIアートによるカード表示
- 🎨 5つのカラーテーマ
- ⚡ アニメーション効果
- 🎮 実際のゲームプレイに近い体験

#### 2. Advanced CLI（`npm advanced`）
**用途**: 大規模分析、パフォーマンス最適化、研究

```bash
# パフォーマンス分析
npm analyze:performance

# 大規模ベンチマーク（100万ゲームまで）
npm benchmark:massive

# ゲームバランス分析
npm analyze:balance

# AI戦略トーナメント
npm run test:ai

# A/Bテスト実験
npm experiment:ab
```

**特徴**:
- 📈 統計的に有意なデータ収集
- 🚀 超高速シミュレーション
- 🧪 実験フレームワーク
- 📊 詳細な分析レポート生成

## 🔄 使い分けのベストプラクティス

### 開発フロー

1. **新機能開発時**
   ```bash
   # 1. CUIでロジックをテスト
   npm cui:debug
   
   # 2. ベンチマークでパフォーマンス確認
   npm cui:benchmark:quick
   
   # 3. GUIに統合
   npm run dev
   ```

2. **ゲームバランス調整時**
   ```bash
   # 1. 大規模データ収集
   npm benchmark:research
   
   # 2. バランス分析
   npm analyze:balance -i results.json
   
   # 3. A/Bテストで検証
   npm experiment:ab
   
   # 4. GUIに反映してプレイテスト
   npm run dev
   ```

3. **AI戦略開発時**
   ```bash
   # 1. AI戦略実装（src/ai/AdvancedStrategies.ts）
   
   # 2. トーナメントで評価
   npm run test:ai
   
   # 3. CUIデモで視覚的確認
   npm cui:demo --strategy your-strategy
   
   # 4. パフォーマンス検証
   npm benchmark:massive
   ```

## 📊 データフロー

```
ゲームロジック（src/domain/）
    ↓
├── GUI（Vue + Phaser）
│   ├── ビジュアル表現
│   ├── ユーザーインタラクション
│   └── 本番デプロイ
│
└── CUI（ターミナル）
    ├── インタラクティブCUI
    │   ├── 開発テスト
    │   └── デバッグ
    │
    └── Advanced CLI
        ├── 大規模分析
        ├── 最適化
        └── 研究実験
```

## 🎯 選択基準

### GUIを使うべき場合
- ✅ エンドユーザーにゲームを提供する
- ✅ ビジュアル要素をテストする
- ✅ UX/UIを検証する
- ✅ 実際のプレイ体験を確認する

### インタラクティブCUIを使うべき場合
- ✅ ゲームロジックをデバッグする
- ✅ ターミナル環境でプレイテストする
- ✅ AI戦略を視覚的に確認する
- ✅ 軽量な環境でテストする

### Advanced CLIを使うべき場合
- ✅ 統計的に有意なデータが必要
- ✅ 大規模なパフォーマンステストを実行
- ✅ ゲームバランスを科学的に分析
- ✅ 新しいゲームメカニクスを実験

## 🔧 技術的な統合

両インターフェースは同じゲームロジックを使用:
- `src/domain/` - ゲームエンティティ
- `src/controllers/` - ゲームコントローラー
- `src/interfaces/GameRenderer.ts` - 共通インターフェース

これにより、ゲームロジックの変更は自動的に両方のインターフェースに反映されます。

## 📝 まとめ

- **GUI**: プレイヤー向けの美しい本番環境
- **インタラクティブCUI**: 開発者向けのテスト・デバッグツール
- **Advanced CLI**: 研究者向けの分析・最適化プラットフォーム

それぞれのツールを適切に使い分けることで、効率的な開発とより良いゲーム体験の提供が可能になります。