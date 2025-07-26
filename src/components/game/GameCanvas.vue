<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { GameManager } from '@/game/GameManager'

const gameContainer = ref<HTMLDivElement>()
const gameManager = GameManager.getInstance()
const isDev = import.meta.env.DEV

onMounted(() => {
  if (gameContainer.value) {
    // ゲームを初期化
    gameManager.initialize(gameContainer.value)
  }
})

onUnmounted(() => {
  // ゲームを破棄
  gameManager.destroy()
})

/**
 * ゲームをリセット
 */
const resetGame = () => {
  gameManager.reset()
}

/**
 * メインメニューに戻る
 */
const returnToMenu = () => {
  gameManager.switchScene('MainMenuScene')
}

// 親コンポーネントに関数を公開
defineExpose({
  resetGame,
  returnToMenu
})
</script>

<template>
  <div class="game-canvas-container">
    <!-- Phaserゲームがここにマウントされる -->
    <div ref="gameContainer" id="game-container" class="game-container"></div>
    
    <!-- デバッグ用コントロール（開発中のみ表示） -->
    <div v-if="isDev" class="debug-controls">
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