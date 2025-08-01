# Issue #008: バンドルサイズの異常な増大（16MB）

## 概要
本番ビルドのバンドルサイズが16MBという異常な値に達し、ユーザー体験に深刻な影響を与える問題。

## 問題の詳細

### 発生日時
2025年1月31日（Performance Monitoring ワークフローで検出）

### 影響範囲
- 初回ロード時間の大幅な増加（特にモバイル環境）
- 低速回線でのアクセス困難
- データ通信量の増大

### 根本原因
1. Phaserライブラリ（1.4MB）が初期バンドルに含まれていた
2. 開発専用ツール（CUI/CLI）が本番ビルドに含まれていた
3. Tree-shakingが効果的に機能していなかった
4. チャンク分割戦略が不適切だった

## 測定値

### 最適化前
```
Total Bundle Size: 16138.9 KB (16MB)
- phaser-core-DawqAqIN.js: 1448 KB
- index-BXR4nYlW.css: 316 KB
- index-DhkwF5S_.js: 196 KB
- chart-vendor-Xt8I3p8E.js: 160 KB
```

### 最適化後
```
Total Bundle Size: 2.22MB（86%削減）
- phaser-core: 1.41MB（動的ロード）
- index: 200KB
- その他チャンク: 610KB
```

## 解決策

### 実装済み
1. **Phaserの動的インポート**
   - PhaserLoader.tsの作成
   - 必要時のみロードする仕組み

2. **Vite設定の最適化**
   - Tree-shaking設定の強化
   - 開発専用コードの除外
   - チャンク分割戦略の改善

3. **コンポーネントの遅延読み込み**
   - 統計・分析系の分離
   - ゲームシーンの段階的ロード

### 今後の改善案
1. Phaserカスタムビルドの検討
2. Service Workerによるキャッシング
3. WebP画像形式への移行

## パフォーマンスへの影響

### Before
- 3G環境での初回ロード: 10秒以上
- LTE環境での初回ロード: 3-5秒

### After
- 3G環境での初回ロード: 2秒以下
- LTE環境での初回ロード: 1秒以下

## 関連ドキュメント
- [バンドル最適化レポート](../docs/development/BUNDLE_OPTIMIZATION_REPORT.md)
- [vite.config.ts](../vite.config.ts)

## ステータス
- [x] 問題特定
- [x] 原因分析
- [x] 解決策実装
- [x] 効果測定
- [x] 文書化完了

## 優先度
Critical - ユーザー体験に直接影響する重大な問題

## ラベル
- performance
- bundle-size
- optimization
- user-experience