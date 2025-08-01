# Issue #002: ローディングインジケーターのタイミング問題

## 問題の概要
ゲーム開始時のローディング表示が期待通りに動作していない

## 発生している問題
1. Playwrightテストで`loadingIndicator`が見つからない
2. ゲームが瞬時に読み込まれるか、ローディング表示がスキップされている可能性
3. ユーザーに適切なフィードバックが提供されていない

## テスト結果
```
Error: Timed out 5000ms waiting for expect(locator).toBeVisible()
Locator: locator('.loading-container, .loading-spinner')
Expected: visible
Received: <element(s) not found>
```

## 推奨される修正方法

### 1. ローディング表示の確実化
```vue
// GameCanvas.vue
onMounted(async () => {
  // 最小表示時間を設定
  const minLoadingTime = 1000; // 1秒
  const startTime = Date.now();
  
  // ゲームの初期化処理
  await initializeGame();
  
  // 最小時間経過まで待機
  const elapsed = Date.now() - startTime;
  if (elapsed < minLoadingTime) {
    await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
  }
  
  isLoading.value = false;
})
```

### 2. ローディング状態の可視化改善
- より明確なローディングアニメーション
- 進捗表示の追加
- スケルトンスクリーンの検討

## 優先度
**中** - UXに影響するが、機能的には問題ない

## 関連ファイル
- `src/components/game/GameCanvas.vue`