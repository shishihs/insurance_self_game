# Issue #003: Long Task検出によるパフォーマンス問題

## 問題の概要
ブラウザコンソールで複数の"Long task detected"警告が発生

## 発生している問題
```
Error Info: {message: Long task detected, stack: undefined, category: performance, severity: medium, timestamp: 1754004443888}
```

複数のタイムスタンプで同様の警告が発生：
- 1754004443888
- 1754004443900
- 1754004443918
- 1754004443915

## 影響
- メインスレッドのブロッキング
- UIの応答性低下
- ユーザー操作の遅延

## 考えられる原因
1. Phaser 3の初期化処理が重い
2. 大量のアセットの同期的な読み込み
3. 複雑な計算処理がメインスレッドで実行されている

## 推奨される修正方法

### 1. 非同期処理の活用
```typescript
// 重い処理を分割
async function initializeGame() {
  await initPhaser();
  await new Promise(resolve => requestAnimationFrame(resolve));
  await loadAssets();
  await new Promise(resolve => requestAnimationFrame(resolve));
  await setupGameLogic();
}
```

### 2. Web Workerの検討
- 計算処理をワーカーに移動
- ゲームロジックの一部を別スレッドで実行

### 3. 遅延読み込みの実装
- 必要なアセットのみ先に読み込む
- その他のアセットは後から非同期で読み込む

### 4. パフォーマンスプロファイリング
```typescript
// パフォーマンス計測の実装
performance.mark('game-init-start');
// 初期化処理
performance.mark('game-init-end');
performance.measure('game-initialization', 'game-init-start', 'game-init-end');
```

## 優先度
**高** - ユーザー体験に直接影響

## 関連ファイル
- `src/game/GameManager.ts`
- `src/components/game/GameCanvas.vue`
- `src/game/scenes/PreloadScene.ts`