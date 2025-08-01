# HIGH優先度: Long task detected によるメモリリーク疑い

> **最終更新**: 2025/01/31
> **文書種別**: 作業記録
> **更新頻度**: 一時文書

## 問題の概要
`ErrorRecovery.ts:800` で長時間タスクが検出され、頻繁なメモリクリーンアップが実行されている。

## 症状
- "Long task detected" エラーの発生
- メモリクリーンアップで-3.6MBの削減（頻繁に実行）
- アプリケーションのレスポンス低下

## 影響
- **ユーザー体験**: 操作に対するレスポンスの遅延
- **パフォーマンス**: 全体的な動作の重さ
- **安定性**: 長時間使用でのメモリ不足リスク

## 根本原因の推測
1. 重い処理がメインスレッドで実行されている
2. イベントリスナーやタイマーの解放漏れ
3. 大量のDOM操作やレンダリング処理
4. セキュリティシステムの過剰な監視処理

## 調査手順

### 1. Performance Profilerでの分析
```javascript
// 長時間タスクの特定
performance.mark('task-start');
// 処理
performance.mark('task-end');
performance.measure('task-duration', 'task-start', 'task-end');
```

### 2. メモリプロファイリング
- Chrome DevToolsのMemory Profilerを使用
- ヒープスナップショットの比較
- メモリリークの原因特定

## 修正案

### 1. 重い処理のWeb Worker移行
```typescript
// heavy-task.worker.ts
self.addEventListener('message', (event) => {
  const result = performHeavyTask(event.data);
  self.postMessage(result);
});

// main.ts
const worker = new Worker('./heavy-task.worker.js');
worker.postMessage(data);
worker.onmessage = (event) => {
  // 結果の処理
};
```

### 2. requestIdleCallbackの活用
```typescript
function scheduleTask(task: () => void) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(task, { timeout: 1000 });
  } else {
    setTimeout(task, 0);
  }
}
```

### 3. メモリリークの防止
```typescript
class ComponentManager {
  private cleanupFunctions: Array<() => void> = [];
  
  registerCleanup(cleanup: () => void) {
    this.cleanupFunctions.push(cleanup);
  }
  
  destroy() {
    this.cleanupFunctions.forEach(fn => fn());
    this.cleanupFunctions = [];
  }
}
```

## 最適化の優先順位
1. セキュリティシステムの監視頻度を調整
2. ゲームループの最適化
3. DOM操作のバッチ処理
4. 不要なイベントリスナーの削除

## 参考ファイル
- `src/utils/error-handling/ErrorRecovery.ts`
- `src/utils/security/security-init.ts`
- `src/main.ts`