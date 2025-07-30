<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { GameManager } from '@/game/GameManager'
import type { WindowWithTutorialEvents } from '@/types/game-events'
import { getUnifiedAnimationManager } from '@/game/systems/UnifiedAnimationManager'

const gameContainer = ref<HTMLDivElement>()
// パフォーマンス最適化: GameManagerは深い監視不要
const gameManager = shallowRef<GameManager | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string>('')
const isDev = import.meta.env.DEV

// コンポーネントがマウントされているか追跡
let isMounted = false

// アニメーションマネージャーのインスタンス
const animationManager = getUnifiedAnimationManager()

onMounted(async () => {
  isMounted = true
  
  // requestAnimationFrameでDOMが完全に準備されるまで待機
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  if (gameContainer.value) {
    try {
      // タイムアウト付きでPhaserとゲームマネージャーを動的にインポート
      const importPromise = import('@/game/GameManager')
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('GameManager import timeout after 10 seconds')), 10000)
      )
      
      if (isDev) console.log('🎮 GameManagerをインポート中...')
      const { GameManager } = await Promise.race([importPromise, timeoutPromise])
      
      // マウント状態を再確認
      if (!isMounted) return
      
      if (isDev) console.log('🎮 GameManagerインスタンスを取得中...')
      gameManager.value = GameManager.getInstance()
      
      // ゲームを初期化（タイムアウト付き）
      if (isDev) console.log('🎮 ゲームを初期化中...')
      const initPromise = gameManager.value.initialize(gameContainer.value)
      const initTimeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Game initialization timeout after 15 seconds')), 15000)
      )
      
      await Promise.race([initPromise, initTimeoutPromise])
      
      if (isDev) console.log('✅ ゲーム初期化完了')
      isLoading.value = false
      
      // チュートリアル開始イベントリスナーを設定
      const handleTutorialEvent = () => {
        if (isDev) console.log('GameCanvas: チュートリアル開始イベントを受信')
        if (gameManager.value && isMounted) {
          // GameSceneに直接移動してチュートリアルを開始
          gameManager.value.switchScene('GameScene', { startTutorial: true })
        }
      }
      
      // ゲームクリーンアップイベントリスナー
      const handleCleanupEvent = () => {
        if (gameManager.value) {
          // Phaserのリソースを解放
          gameManager.value.clearCache()
        }
      }
      
      window.addEventListener('startTutorial', handleTutorialEvent)
      window.addEventListener('cleanupGame', handleCleanupEvent)
      
      // クリーンアップ用に参照を保存
      ;(window as WindowWithTutorialEvents)._tutorialEventHandler = handleTutorialEvent
      ;(window as any)._cleanupEventHandler = handleCleanupEvent
      
    } catch (error) {
      console.error('❌ ゲームの初期化に失敗しました:', error)
      console.error('❌ エラー詳細:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
      
      // エラーメッセージをより詳細に設定
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (errorMsg.includes('timeout')) {
        errorMessage.value = 'ゲーム読み込みがタイムアウトしました。ページを再読み込みしてください。'
      } else if (errorMsg.includes('ChunkLoadError') || errorMsg.includes('Loading chunk')) {
        errorMessage.value = 'ゲームファイルの読み込みに失敗しました。インターネット接続を確認してページを再読み込みしてください。'
      } else if (errorMsg.includes('Script error')) {
        errorMessage.value = 'ゲームスクリプトの実行に失敗しました。ブラウザの設定を確認してください。'
      } else if (errorMsg.includes('WebGL')) {
        errorMessage.value = 'WebGLの初期化に失敗しました。ブラウザでWebGLが有効になっているか確認してください。'
      } else {
        errorMessage.value = `ゲーム初期化エラー: ${errorMsg}`
      }
      
      isLoading.value = false
      
      // グローバルエラーハンドラーによる重複通知を避けるため、
      // 手動でエラーハンドリングシステムには報告しない
    }
  } else {
    if (isDev) console.error('❌ gameContainer が見つかりません')
    errorMessage.value = 'ゲームコンテナが見つかりません'
    isLoading.value = false
  }
})

onUnmounted(() => {
  isMounted = false
  
  // イベントリスナーをクリーンアップ
  const tutorialHandler = (window as WindowWithTutorialEvents)._tutorialEventHandler
  const cleanupHandler = (window as any)._cleanupEventHandler
  
  if (tutorialHandler) {
    window.removeEventListener('startTutorial', tutorialHandler as EventListener)
    delete (window as WindowWithTutorialEvents)._tutorialEventHandler
  }
  
  if (cleanupHandler) {
    window.removeEventListener('cleanupGame', cleanupHandler as EventListener)
    delete (window as any)._cleanupEventHandler
  }
  
  // ゲームを破棄
  if (gameManager.value) {
    gameManager.value.destroy()
    gameManager.value = null
  }
})

/**
 * ゲームをリセット
 */
const resetGame = () => {
  if (gameManager.value) {
    gameManager.value.reset()
  }
}

/**
 * メインメニューに戻る
 */
const returnToMenu = () => {
  if (gameManager.value) {
    gameManager.value.switchScene('MainMenuScene')
  }
}

// 親コンポーネントに関数を公開
defineExpose({
  resetGame,
  returnToMenu
})
</script>

<template>
  <div class="game-canvas-container">
    <!-- ローディング表示 -->
    <div v-if="isLoading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">ゲームを読み込み中...</p>
    </div>
    
    <!-- エラー表示 -->
    <div v-else-if="errorMessage" class="error-container">
      <div class="error-icon">⚠️</div>
      <h3 class="error-title">ゲームの読み込みに失敗しました</h3>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-actions">
        <button @click="$emit('back-to-home')" class="btn btn-primary">
          <span>←</span> ホームに戻る
        </button>
        <button @click="window.location.reload()" class="btn btn-secondary">
          <span>↻</span> ページを再読み込み
        </button>
      </div>
      <details class="error-details">
        <summary>技術的な詳細</summary>
        <p class="error-help">
          ブラウザのコンソール（F12）でより詳細なエラー情報を確認できます。
        </p>
        <p class="error-troubleshoot">
          <strong>トラブルシューティング:</strong><br>
          • インターネット接続を確認してください<br>
          • ブラウザのキャッシュをクリアしてください<br>
          • 別のブラウザでお試しください<br>
          • しばらく時間をおいてから再度お試しください
        </p>
      </details>
    </div>
    
    <!-- Phaserゲームがここにマウントされる -->
    <div 
      ref="gameContainer" 
      id="game-container" 
      class="game-container" 
      :style="{ display: !isLoading && !errorMessage ? 'block' : 'none' }"
      :aria-hidden="isLoading || !!errorMessage"
    ></div>
    
    <!-- デバッグ用コントロール（開発中のみ表示） -->
    <div v-if="isDev && !isLoading" class="debug-controls">
      <button @click="resetGame" class="btn btn-warning text-sm">
        ゲームリセット
      </button>
      <button @click="returnToMenu" class="btn text-sm">
        メニューへ
      </button>
    </div>
  </div>
</template>

<style scoped>
.game-canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #1a1a1a;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #4C6EF5;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin: 0;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  max-width: 600px;
  padding: 2rem;
  text-align: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 16px;
  border: 1px solid rgba(255, 107, 107, 0.3);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

.error-title {
  color: #FF6B6B;
  font-size: 1.5rem;
  font-weight: bold;
  margin: 0;
}

.error-message {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  margin: 0;
  word-break: break-word;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 0.5rem;
}

.error-actions .btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  transition: all 0.2s ease;
  text-decoration: none;
  border: none;
  cursor: pointer;
  min-width: 140px;
  justify-content: center;
}

.error-actions .btn-primary {
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  color: white;
}

.error-actions .btn-primary:hover {
  background: linear-gradient(135deg, #3b5bdb 0%, #5a67d8 100%);
  transform: translateY(-2px);
}

.error-actions .btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error-actions .btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.error-details {
  margin-top: 1rem;
  width: 100%;
  text-align: left;
}

.error-details summary {
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  text-align: center;
}

.error-details summary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.error-help {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 1rem 0 0 0;
  line-height: 1.4;
}

.error-troubleshoot {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin: 1rem 0 0 0;
  line-height: 1.6;
}

.error-troubleshoot strong {
  color: rgba(255, 255, 255, 0.9);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.game-container {
  /* Phaserが自動的にcanvasのサイズを設定 */
}

.debug-controls {
  position: absolute;
  bottom: 10px;
  right: 10px;
  display: flex;
  gap: 10px;
  z-index: 100;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .game-canvas-container {
    /* モバイルでのフルスクリーン表示 */
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
  }
  
  .debug-controls {
    bottom: max(5px, env(safe-area-inset-bottom, 0px));
    right: max(5px, env(safe-area-inset-right, 0px));
    gap: 5px;
  }
  
  .debug-controls button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    min-height: var(--touch-target-min);
    border-radius: 6px;
  }
  
  .loading-container,
  .error-container {
    padding: var(--space-lg);
    margin: var(--space-sm);
  }
  
  .loading-spinner {
    width: 32px;
    height: 32px;
  }
  
  .error-title {
    font-size: 1.25rem;
  }
}

/* タブレット対応 */
@media (min-width: 769px) and (max-width: 1024px) {
  .debug-controls {
    bottom: 15px;
    right: 15px;
  }
}

/* ランドスケープモード対応 */
@media (max-height: 600px) and (orientation: landscape) {
  .debug-controls {
    bottom: max(5px, env(safe-area-inset-bottom, 0px));
    right: max(5px, env(safe-area-inset-right, 0px));
    flex-direction: row;
  }
  
  .debug-controls button {
    font-size: 0.7rem;
    padding: 0.2rem 0.4rem;
  }
}

/* 極小画面対応 */
@media (max-width: 375px) {
  .loading-container,
  .error-container {
    padding: var(--space-md);
    margin: var(--space-xs);
  }
  
  .error-container {
    max-width: 300px;
  }
  
  .debug-controls {
    flex-direction: column;
    align-items: flex-end;
  }
  
  .debug-controls button {
    width: 80px;
    font-size: 0.65rem;
  }
}
</style>