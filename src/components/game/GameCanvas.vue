<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import type { GameManager } from '@/game/GameManager'
import type { WindowWithTutorialEvents } from '@/types/game-events'

const gameContainer = ref<HTMLDivElement>()
// パフォーマンス最適化: GameManagerは深い監視不要
const gameManager = shallowRef<GameManager | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string>('')
const isDev = import.meta.env.DEV

// コンポーネントがマウントされているか追跡
let isMounted = false

onMounted(async () => {
  isMounted = true
  
  // requestAnimationFrameでDOMが完全に準備されるまで待機
  await new Promise(resolve => requestAnimationFrame(resolve))
  
  if (gameContainer.value) {
    try {
      
      // Phaserとゲームマネージャーを動的にインポート
      const { GameManager } = await import('@/game/GameManager')
      
      // マウント状態を再確認
      if (!isMounted) return
      
      gameManager.value = GameManager.getInstance()
      
      // ゲームを初期化
      gameManager.value.initialize(gameContainer.value)
      
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
        stack: error instanceof Error ? error.stack : undefined
      })
      errorMessage.value = error instanceof Error ? error.message : String(error)
      isLoading.value = false
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
      <h3 class="error-title">ゲームの読み込みに失敗しました</h3>
      <p class="error-message">{{ errorMessage }}</p>
      <p class="error-help">
        ブラウザのコンソール（F12）でより詳細なエラー情報を確認できます。
      </p>
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
  gap: 1rem;
  max-width: 500px;
  padding: 2rem;
  text-align: center;
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
}

.error-help {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0;
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