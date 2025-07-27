<script setup lang="ts">
import { ref } from 'vue'
import GameCanvas from './components/game/GameCanvas.vue'

const showGame = ref(false)

const startGame = () => {
  showGame.value = true
}

const startTutorial = () => {
  showGame.value = true
  // GameCanvasコンポーネントにチュートリアル開始を通知
  // 次のtickeで実行することで、GameCanvasがマウントされてから実行される
  setTimeout(() => {
    const event = new CustomEvent('startTutorial')
    window.dispatchEvent(event)
  }, 100)
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
    <div v-else class="max-w-7xl mx-auto p-8">
      <div class="text-center mb-8">
        <h1 class="text-5xl font-bold mb-2 text-gray-800 dark:text-gray-100">
          人生充実ゲーム
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-300">
          Life Fulfillment - 生命保険を「人生の味方」として描く
        </p>
      </div>

      <div class="flex justify-center gap-4 mb-8">
        <button
          @click="startGame"
          class="btn btn-success text-xl px-8 py-4 shadow-lg hover:shadow-xl transition-shadow"
        >
          ゲームをプレイ
        </button>
        <button
          @click="startTutorial"
          class="btn btn-primary text-xl px-8 py-4 shadow-lg hover:shadow-xl transition-shadow"
        >
          チュートリアル
        </button>
      </div>

      <div class="grid md:grid-cols-2 gap-8">
        <!-- 最新の変更 -->
        <div class="card">
          <h2 class="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
            <span>🎮</span>
            最新アップデート v0.2.4
          </h2>
          <div class="text-left space-y-3">
            <div>
              <h3 class="font-semibold text-lg mb-2">高度なドラッグ&ドロップシステム</h3>
              <ul class="space-y-1 text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>マグネティックスナップ</strong>: 80-120px範囲での磁気吸着機能</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>60fps維持</strong>: 最適化されたフレームレート制御</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>モバイル最適化</strong>: タッチオフセット調整と振動フィードバック</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>ビジュアルフィードバック</strong>: ゾーンハイライト、成功/失敗エフェクト</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>パフォーマンス最適化</strong>: 100+ゾーンでも効率的な動作</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- 今後のロードマップ -->
        <div class="card">
          <h2 class="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
            <span>🚀</span>
            今後のロードマップ
          </h2>
          <div class="text-left space-y-3">
            <div>
              <h3 class="font-semibold mb-2">短期（1-2週間）</h3>
              <ul class="space-y-1 text-sm">
                <li class="flex items-center gap-2">
                  <span class="text-success">✅</span>
                  保険更新システム
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-gray-400">⭕</span>
                  チュートリアルモード
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-gray-400">⭕</span>
                  サウンドエフェクト
                </li>
              </ul>
            </div>
            <div>
              <h3 class="font-semibold mb-2">中期（1ヶ月）</h3>
              <ul class="space-y-1 text-sm">
                <li class="flex items-center gap-2">
                  <span class="text-gray-400">⭕</span>
                  実績システム
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-gray-400">⭕</span>
                  追加シナリオ（結婚、出産など）
                </li>
              </ul>
            </div>
          </div>
          <div class="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <a href="https://github.com/shishihs/insurance_self_game/blob/master/CHANGELOG.md" 
               target="_blank" 
               class="hover:text-primary transition-colors">
              詳細な変更履歴とロードマップ →
            </a>
          </div>
        </div>
      </div>

      <!-- フッター情報 -->
      <div class="text-center mt-8 text-sm text-gray-600 dark:text-gray-400">
        <p>
          <a href="https://github.com/shishihs/insurance_self_game" 
             target="_blank" 
             class="hover:text-primary transition-colors">
            GitHub
          </a>
          <span class="mx-2">•</span>
          <a href="https://github.com/shishihs/insurance_self_game/issues" 
             target="_blank" 
             class="hover:text-primary transition-colors">
            バグ報告・要望
          </a>
        </p>
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