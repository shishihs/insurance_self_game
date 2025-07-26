<script setup lang="ts">
import { ref } from 'vue'
import GameCanvas from './components/game/GameCanvas.vue'

const showGame = ref(false)
const count = ref(0)

const handleClick = () => {
  count.value++
}

const resetCount = () => {
  count.value = 0
}

const startGame = () => {
  showGame.value = true
}

const backToHome = () => {
  showGame.value = false
}
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900">
    <!-- ゲーム画面 -->
    <div v-if="showGame" class="game-view">
      <GameCanvas />
      <button
        @click="backToHome"
        class="absolute top-4 left-4 btn btn-danger text-sm z-50"
      >
        ホームに戻る
      </button>
    </div>

    <!-- ホーム画面 -->
    <div v-else class="max-w-7xl mx-auto p-8 text-center">
      <h1 class="text-5xl font-bold mb-2 text-gray-800 dark:text-gray-100">
        人生充実ゲーム
      </h1>
      <p class="text-lg text-gray-600 dark:text-gray-300 mb-8">
        Life Fulfillment - 生命保険を「人生の味方」として描く
      </p>
      
      <!-- Phase 1 開発進捗 -->
      <div class="card max-w-2xl mx-auto mb-8">
        <h2 class="text-2xl font-bold mb-4 text-primary">
          Phase 1: プロトタイプ完成！✨
        </h2>
        <div class="text-left space-y-2">
          <p class="flex items-center gap-2">
            <span class="text-success">✅</span>
            Phaser 3 統合完了
          </p>
          <p class="flex items-center gap-2">
            <span class="text-success">✅</span>
            基本的なシーン構成実装
          </p>
          <p class="flex items-center gap-2">
            <span class="text-success">✅</span>
            カードシステム基礎実装
          </p>
          <p class="flex items-center gap-2">
            <span class="text-success">✅</span>
            ドラッグ＆ドロップ機能実装完了
          </p>
          <p class="flex items-center gap-2">
            <span class="text-success">✅</span>
            ゲームループ実装完了
          </p>
          <p class="flex items-center gap-2">
            <span class="text-success">✅</span>
            Phase 1 プロトタイプ完成！🎉
          </p>
        </div>
      </div>

      <div class="flex flex-col sm:flex-row gap-4 justify-center mb-8">
        <button
          @click="startGame"
          class="btn btn-success text-xl px-8 py-4"
        >
          ゲームをプレイ
        </button>
      </div>

      <!-- 旧OKボタンゲーム（デモ用） -->
      <div class="card max-w-md mx-auto">
        <h3 class="text-lg font-semibold mb-4">開発初期のOKボタンゲーム</h3>
        <button
          type="button"
          @click="handleClick"
          class="btn btn-primary text-lg px-8 py-4 mb-4"
        >
          OK ({{ count }}回クリック)
        </button>
        <p class="text-gray-600 dark:text-gray-300 mb-4">
          最初のプロトタイプです
        </p>
        <button
          type="button"
          @click="resetCount"
          class="btn btn-danger text-sm"
        >
          リセット
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-view {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}
</style>