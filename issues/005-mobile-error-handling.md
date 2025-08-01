# Issue #005: モバイル環境でのエラーハンドリング改善

## 問題の概要
モバイル環境でコンポーネントの読み込みエラーが発生した際のUXが不適切

## 発生している問題
スクリーンショットから確認できる問題：
- 「エラーが発生しました」というメッセージのみ表示
- エラーの詳細情報が不足
- リカバリー方法が不明確
- 「ページを再読み込み」ボタンが小さい

## 現在の表示
```
エラーが発生しました
アプリケーションで問題が発生しました。しばらく時間をおいてから再度お試しください。
[ページを再読み込み]
```

## 推奨される修正方法

### 1. エラーメッセージの改善
```vue
const errorMessages = {
  'dynamic-import': {
    title: 'コンテンツの読み込みに失敗しました',
    message: 'インターネット接続を確認してください',
    actions: ['再読み込み', 'ホームに戻る']
  },
  'network': {
    title: 'ネットワークエラー',
    message: 'オフラインの可能性があります',
    actions: ['オフラインモードで続行', '再接続']
  }
}
```

### 2. モバイル向けエラー画面の最適化
- より大きなタッチターゲット（最小44px）
- 分かりやすいアイコン
- 段階的なトラブルシューティング手順

### 3. プログレッシブエンハンスメント
- 基本機能は同期的に読み込む
- 追加機能（フィードバックなど）は後から読み込む
- 読み込み失敗時も基本機能は使える

### 4. オフライン対応
```javascript
// Service Workerでの基本アセットのキャッシュ
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('game-v1').then((cache) => {
      return cache.addAll([
        '/',
        '/src/main.js',
        '/src/game/core.js'
      ]);
    })
  );
});
```

## 優先度
**高** - モバイルユーザーの体験に大きく影響

## 関連ファイル
- `src/components/error/ErrorBoundary.vue`
- `src/components/error/ErrorNotification.vue`
- `src/App.vue`
- `public/service-worker.js`