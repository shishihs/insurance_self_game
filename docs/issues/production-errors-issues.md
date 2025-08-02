# 本番環境エラー対応 Issue一覧

## 🔴 Issue #1: [CRITICAL] CSP違反によるインラインスクリプト実行エラー

### 概要
Content Security Policy (CSP) の設定により、インラインスクリプトの実行がブロックされています。

### エラー詳細
```
Refused to execute inline script because it violates the following Content Security Policy directive: 
"script-src 'self' 'nonce-PLACEHOLDER_NONCE' 'unsafe-eval'". 
Either the 'unsafe-inline' keyword, a hash ('sha256-ngW2PrZpvJFgJQXdBdxSK0yheEwRxFKR+aO7+/+5W58='), 
or a nonce ('nonce-...') is required to enable inline execution.
```

### 影響度
**Critical** - アプリケーションの基本機能が動作しない

### 原因分析
- `index.html`内のインラインスクリプトにnonceが適用されていない
- "PLACEHOLDER_NONCE"が実際のnonce値に置換されていない
- ビルドプロセスでのnonce生成・置換処理が欠落

### 解決方法
1. **即時対応**: CSPヘッダーに'unsafe-inline'を一時的に追加
2. **恒久対応**: 
   - ビルドプロセスでnonce生成・置換処理を実装
   - インラインスクリプトを外部ファイルに移動
   - スクリプトハッシュ（sha256）をCSPに追加

### タスク
- [ ] CSPヘッダーの一時的な修正
- [ ] nonce生成・置換スクリプトの作成
- [ ] インラインスクリプトの外部化検討
- [ ] テスト環境での動作確認

### 優先度
**最高** - ゲームが起動しない根本原因

---

## 🔴 Issue #2: [CRITICAL] TutorialManagerでPhaserが未定義エラー

### 概要
TutorialManagerクラスの初期化時にPhaserが定義されていないエラーが発生。

### エラー詳細
```
TutorialManager.ts:17 Uncaught ReferenceError: Phaser is not defined
    at TutorialManager.ts:17:38
```

### 影響度
**Critical** - ゲームの初期化が失敗する

### 原因分析
- TutorialManagerがPhaserのロード前に実行されている
- 動的インポートの非同期処理が考慮されていない
- クラスフィールド初期化時にPhaserを参照している

### 解決方法
1. **クラスフィールドの遅延初期化**
   ```typescript
   private phaserEventEmitter: any = null // 初期化を遅延
   
   async initialize() {
     const Phaser = await loadPhaser()
     this.phaserEventEmitter = new Phaser.Events.EventEmitter()
   }
   ```

2. **条件付き初期化**
   ```typescript
   if (typeof Phaser !== 'undefined') {
     this.phaserEventEmitter = new Phaser.Events.EventEmitter()
   }
   ```

### タスク
- [ ] TutorialManager.tsの修正
- [ ] Phaser依存部分の遅延初期化実装
- [ ] エラーハンドリングの追加
- [ ] 初期化順序の確認とテスト

### 優先度
**最高** - ゲーム起動の必須要件

---

## 🟡 Issue #3: [HIGH] PWA Manifest enctype警告

### 概要
PWAマニフェストでフォームのenctypeが未設定。

### エラー詳細
```
Manifest: Enctype should be set to either application/x-www-form-urlencoded or multipart/form-data. 
It currently defaults to application/x-www-form-urlencoded
```

### 影響度
**High** - PWA機能に影響する可能性

### 原因分析
- manifest.json内のフォーム関連設定でenctypeが未指定
- share_targetまたはprotocol_handlersの設定に問題

### 解決方法
```json
{
  "share_target": {
    "action": "/share",
    "method": "POST",
    "enctype": "application/x-www-form-urlencoded",
    "params": {
      "title": "title",
      "text": "text",
      "url": "url"
    }
  }
}
```

### タスク
- [ ] manifest.jsonの確認と修正
- [ ] share_target設定の追加（必要な場合）
- [ ] PWA機能のテスト

### 優先度
**高** - PWA機能の正常動作に必要

---

## 🟡 Issue #4: [HIGH] ファビコン404エラー

### 概要
favicon.svgが正しいパスに存在せず、404エラーが発生。

### エラー詳細
```
GET https://shishihs.github.io/favicon.svg 404 (Not Found)
Error while trying to use the following icon from the Manifest
```

### 影響度
**High** - ユーザー体験とSEOに影響

### 原因分析
- favicon.svgがルートディレクトリを参照している
- GitHub Pagesのサブディレクトリ構造が考慮されていない
- manifest.jsonとindex.htmlで異なるパスを参照

### 解決方法
1. **パスの統一**
   ```html
   <link rel="icon" href="/insurance_self_game/favicon.svg" type="image/svg+xml">
   ```

2. **manifest.json更新**
   ```json
   {
     "icons": [{
       "src": "/insurance_self_game/favicon.svg",
       "sizes": "any",
       "type": "image/svg+xml"
     }]
   }
   ```

### タスク
- [ ] favicon.svgの配置確認
- [ ] index.htmlのパス修正
- [ ] manifest.jsonのパス修正
- [ ] ビルド後の確認

### 優先度
**高** - 視覚的な問題とPWA機能への影響

---

## 🟢 Issue #5: [MEDIUM] リソースプリロード警告

### 概要
プリロードされたリソースが使用されていない警告。

### エラー詳細
```
The resource https://shishihs.github.io/insurance_self_game/assets/main-BKjlRM8r.ts 
was preloaded using link preload but not used within a few seconds from the window's load event.
```

### 影響度
**Medium** - パフォーマンスへの軽微な影響

### 原因分析
- TypeScriptファイル(.ts)が誤ってプリロードされている
- ビルド後のJavaScriptファイル(.js)をプリロードすべき
- Viteのビルド設定に問題がある可能性

### 解決方法
1. **プリロード設定の修正**
   ```html
   <!-- 誤り -->
   <link rel="preload" href="/assets/main-BKjlRM8r.ts" as="script">
   
   <!-- 正しい -->
   <link rel="preload" href="/assets/main-BKjlRM8r.js" as="script">
   ```

2. **動的プリロード生成**
   - ビルド時に正しいアセットパスを生成

### タスク
- [ ] index.htmlのプリロード設定確認
- [ ] Viteビルド設定の確認
- [ ] 不要なプリロードの削除
- [ ] パフォーマンステスト

### 優先度
**中** - 機能には影響しないが、パフォーマンス最適化に必要

---

## 📋 対応順序

1. **即時対応（Critical）**
   - Issue #1: CSP設定の修正
   - Issue #2: Phaser初期化エラーの修正

2. **短期対応（High）**
   - Issue #3: PWA Manifest修正
   - Issue #4: ファビコンパス修正

3. **中期対応（Medium）**
   - Issue #5: リソースプリロード最適化

## 🔧 テスト手順

各修正後に以下を確認：
1. ローカル開発環境での動作確認
2. ビルド成功の確認
3. GitHub Pagesデプロイ後の動作確認
4. ブラウザコンソールでのエラー確認
5. PWA機能の動作確認