# Issue #006: ゲーム終了後の画面サイズが極端に小さくなる問題

## 問題の概要
ゲームをプレイした後、ゲーム画面が画面の1/10程度の極端に小さいサイズで表示される。画面をリサイズすると正常なサイズに戻る。

## 発生条件
1. ゲームを開始する
2. ゲームをプレイする
3. ゲームを終了する（ホームに戻る、ゲームオーバーなど）
4. 再度ゲームを開始する

## 現象の詳細
- 初回のゲーム起動時は正常なサイズで表示される
- ゲーム終了後、2回目以降の起動時に画面が極端に小さくなる
- ブラウザウィンドウをリサイズすると正常なサイズに戻る
- キャンバスのスケール計算に問題がある可能性

## 考えられる原因
1. **Phaserゲームインスタンスの破棄処理が不完全**
   - 前回のスケール設定が残っている
   - レスポンシブハンドラーが重複している

2. **親コンテナのサイズ計算タイミング**
   - Vueコンポーネントの再マウント時にサイズが0になっている
   - DOMの更新とPhaserの初期化のタイミングがずれている

3. **スケールマネージャーの設定問題**
   - `scale.mode` の設定が適切でない
   - 親要素のサイズを正しく取得できていない

## 推奨される修正方法

### 1. ゲーム破棄処理の改善
```typescript
// GameManager.ts
destroy(): void {
  if (this.game) {
    // スケールマネージャーのイベントリスナーを削除
    this.game.scale.removeAllListeners();
    
    // ゲームを完全に破棄
    this.game.destroy(true, false);
    this.game = null;
  }
}
```

### 2. 初期化タイミングの調整
```typescript
// GameCanvas.vue
onMounted(async () => {
  await nextTick(); // DOMの更新を待つ
  
  // 親要素のサイズを確認
  const container = gameContainer.value;
  if (container && container.offsetWidth > 0) {
    await initializeGame();
  } else {
    // サイズが0の場合は少し待つ
    setTimeout(() => initializeGame(), 100);
  }
})
```

### 3. 強制的なリサイズトリガー
```typescript
// ゲーム初期化後に強制リサイズ
game.scale.refresh();
// または
window.dispatchEvent(new Event('resize'));
```

### 4. スケール設定の見直し
```typescript
scale: {
  mode: Phaser.Scale.FIT,
  parent: 'game-container',
  autoCenter: Phaser.Scale.CENTER_BOTH,
  width: 800,
  height: 600,
  min: {
    width: 320,
    height: 240
  },
  max: {
    width: 1600,
    height: 1200
  }
}
```

## 影響範囲
- すべてのユーザー（特にゲームを複数回プレイするユーザー）
- ユーザー体験の大幅な低下
- ゲームの継続プレイ意欲の減退

## 優先度
**緊急** - ゲームプレイ体験に直接的かつ深刻な影響を与えるため

## 関連ファイル
- `src/game/GameManager.ts`
- `src/game/config/gameConfig.ts`
- `src/components/game/GameCanvas.vue`
- `src/game/scenes/BaseScene.ts`

## テスト項目
1. ゲームの初回起動時のサイズ確認
2. ゲーム終了→再起動のサイクルを複数回実行
3. 異なる画面サイズでの動作確認
4. モバイルデバイスでの動作確認