# モバイルテストガイド

> **最終更新**: 2025/01/29  
> **文書種別**: 開発ガイド  
> **更新頻度**: 定期的

## 概要

このガイドでは、人生充実ゲームのモバイル対応機能をテストする方法について説明します。

## 開発環境のセットアップ

### 1. HTTPS証明書の生成（PWAテスト用）

```bash
# mkcertのインストール
npm install -g mkcert

# 証明書の生成
mkcert -install
mkcert localhost
```

### 2. モバイル開発サーバーの起動

```bash
# ローカルホストでの開発
pnpm dev:mobile

# ネットワーク経由でのアクセス（実機テスト用）
pnpm dev:mobile:host
```

起動後、以下のURLでアクセスできます：
- PC: `https://localhost:5173`
- モバイル: `https://[PCのIPアドレス]:5173`

## 実機テストの手順

### iOS (iPhone/iPad)

1. **同じネットワークに接続**
   - PCとiOSデバイスを同じWi-Fiネットワークに接続

2. **アクセス方法**
   - Safariを開く
   - `https://[PCのIPアドレス]:5173` にアクセス
   - 証明書の警告が出たら「詳細」→「このWebサイトを閲覧」

3. **PWAとしてインストール**
   - 共有ボタンをタップ
   - 「ホーム画面に追加」を選択

### Android

1. **同じネットワークに接続**
   - PCとAndroidデバイスを同じWi-Fiネットワークに接続

2. **アクセス方法**
   - Chromeを開く
   - `https://[PCのIPアドレス]:5173` にアクセス
   - 証明書の警告が出たら「詳細設定」→「安全でないサイトへ移動」

3. **PWAとしてインストール**
   - メニューボタン（3点）をタップ
   - 「ホーム画面に追加」を選択

## テストチェックリスト

### 基本機能

- [ ] ゲームの起動と基本操作
- [ ] ボタンのタップ反応
- [ ] 画面遷移のスムーズさ
- [ ] アニメーションの動作

### タッチジェスチャー

- [ ] カードのドラッグ&ドロップ
- [ ] スワイプ操作（上下左右）
- [ ] ピンチズーム
- [ ] ダブルタップ
- [ ] ロングプレス

### レスポンシブデザイン

- [ ] 縦向き（ポートレート）表示
- [ ] 横向き（ランドスケープ）表示
- [ ] 画面回転時の動作
- [ ] セーフエリアの対応（ノッチ/ホームインジケーター）

### パフォーマンス

- [ ] ページロード時間
- [ ] アニメーションのフレームレート
- [ ] メモリ使用量の確認
- [ ] バッテリー消費の確認

### PWA機能

- [ ] オフライン時の動作
- [ ] ホーム画面からの起動
- [ ] フルスクリーン表示
- [ ] スプラッシュスクリーン

### アクセシビリティ

- [ ] 最小タップターゲットサイズ（44px）
- [ ] テキストの読みやすさ
- [ ] コントラスト比
- [ ] スクリーンリーダー対応

## 自動テストの実行

### E2Eテスト（モバイルデバイス）

```bash
# すべてのモバイルデバイステストを実行
pnpm test:e2e tests/e2e/mobile-responsive.spec.ts

# 特定のデバイスのみテスト
pnpm test:e2e tests/e2e/mobile-responsive.spec.ts --grep "iPhone 12"
```

### 対応デバイス一覧

- iPhone 12
- iPhone SE
- Pixel 5
- Galaxy S21
- iPad (gen 7)
- iPad Pro 11

## デバッグ方法

### Chrome DevTools（Android）

1. AndroidデバイスでUSBデバッグを有効化
2. USBケーブルでPCに接続
3. Chrome で `chrome://inspect` を開く
4. デバイスとページが表示されたら「inspect」をクリック

### Safari Web Inspector（iOS）

1. iOSデバイスの設定 → Safari → 詳細 → Webインスペクタを有効化
2. MacのSafariで開発メニューを有効化
3. USBケーブルで接続
4. Safari → 開発 → [デバイス名] → ページを選択

### リモートデバッグ（ネットワーク経由）

```javascript
// vConsoleを使用したデバッグ
// src/main.ts に追加
if (import.meta.env.DEV) {
  import('vconsole').then(({ default: VConsole }) => {
    new VConsole()
  })
}
```

## トラブルシューティング

### 証明書エラー

**問題**: HTTPS証明書の警告が解決できない

**解決方法**:
1. mkcertのルート証明書をデバイスにインストール
2. 開発時はHTTPでアクセス（PWA機能は制限される）

### ネットワークアクセスできない

**問題**: モバイルデバイスからアクセスできない

**解決方法**:
1. ファイアウォールでポート5173を許可
2. PCとモバイルが同じネットワークか確認
3. PCのIPアドレスを確認（`ipconfig` or `ifconfig`）

### パフォーマンスが悪い

**問題**: モバイルでの動作が重い

**解決方法**:
1. Chrome DevToolsのPerformanceタブで分析
2. `MobilePerformanceManager`の設定を調整
3. アニメーションを簡略化

## ベストプラクティス

### 開発時の推奨事項

1. **実機での定期的なテスト**
   - エミュレータだけでなく実機でテスト
   - 複数のデバイスサイズで確認

2. **ネットワーク条件の考慮**
   - 3G/4G環境をシミュレート
   - オフライン動作の確認

3. **バッテリー消費の最適化**
   - 不要なアニメーションを削減
   - GPUアクセラレーションの適切な使用

4. **タッチターゲットの確保**
   - 最小44pxのタップ領域
   - 十分な間隔の確保

## 参考リンク

- [PWA開発ガイド](https://web.dev/progressive-web-apps/)
- [モバイルウェブのベストプラクティス](https://developers.google.com/web/fundamentals/design-and-ux/principles)
- [iOS ヒューマンインターフェースガイドライン](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design](https://material.io/design)