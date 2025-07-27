<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import type { GameManager } from '@/game/GameManager'

const gameContainer = ref<HTMLDivElement>()
const gameManager = ref<GameManager | null>(null)
const isLoading = ref(true)
const errorMessage = ref<string>('')
const isDev = import.meta.env.DEV

onMounted(async () => {
  console.log('GameCanvas: onMounted開始')
  
  if (gameContainer.value) {
    console.log('GameCanvas: gameContainer が見つかりました')
    try {
      console.log('GameCanvas: GameManagerを動的インポート中...')
      
      // Phaserとゲームマネージャーを動的にインポート
      const { GameManager } = await import('@/game/GameManager')
      console.log('GameCanvas: GameManagerインポート成功')
      
      gameManager.value = GameManager.getInstance()
      console.log('GameCanvas: GameManagerインスタンス取得成功')
      
      // ゲームを初期化
      console.log('GameCanvas: ゲーム初期化中...')
      gameManager.value.initialize(gameContainer.value)
      console.log('GameCanvas: ゲーム初期化成功')
      
      isLoading.value = false
      console.log('GameCanvas: 読み込み完了')
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
    console.error('❌ gameContainer が見つかりません')
    errorMessage.value = 'ゲームコンテナが見つかりません'
    isLoading.value = false
  }
})

onUnmounted(() => {
  // ゲームを破棄
  if (gameManager.value) {
    gameManager.value.destroy()
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
    <div v-else ref="gameContainer" id="game-container" class="game-container"></div>
    
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
  .debug-controls {
    bottom: 5px;
    right: 5px;
  }
  
  .debug-controls button {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>