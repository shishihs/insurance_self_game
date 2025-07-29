<template>
  <section class="action-section" id="navigation" role="navigation" aria-label="メインナビゲーション">
    <div class="button-group">
      <button
        ref="gameButtonRef"
        @click="$emit('start-game')"
        class="btn btn-primary ripple-container glow-on-hover bounce-in"
        aria-label="ゲームを開始する (Alt+G)"
        :aria-keyshortcuts="'Alt+G'"
        aria-describedby="game-description"
      >
        <span class="btn-icon" aria-hidden="true">🎮</span>
        <span class="btn-text">ゲームをプレイ</span>
      </button>
      
      <button
        ref="tutorialButtonRef"
        @click="$emit('start-tutorial')"
        class="btn btn-secondary ripple-container"
        aria-label="チュートリアルを開始する (Alt+T)"
        :aria-keyshortcuts="'Alt+T'"
        aria-describedby="tutorial-description"
      >
        <span class="btn-icon" aria-hidden="true">📚</span>
        <span class="btn-text">チュートリアル</span>
      </button>
      
      <button
        @click="$emit('open-statistics')"
        class="btn btn-secondary ripple-container"
        aria-label="統計ダッシュボードを開く (Alt+S)"
        :aria-keyshortcuts="'Alt+S'"
        aria-describedby="statistics-description"
      >
        <span class="btn-icon" aria-hidden="true">📊</span>
        <span class="btn-text">統計</span>
      </button>
    </div>
    
    <!-- ボタンの説明（スクリーンリーダー用） -->
    <div class="sr-only">
      <div id="game-description">保険をテーマにした人生シミュレーションゲームを開始します</div>
      <div id="tutorial-description">ゲームの遊び方を学習するチュートリアルを開始します</div>
      <div id="statistics-description">プレイ統計とパフォーマンス分析を表示します</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// イベント定義
defineEmits<{
  'start-game': []
  'start-tutorial': []
  'open-statistics': []
}>()

// テンプレート参照
const gameButtonRef = ref<HTMLButtonElement>()
const tutorialButtonRef = ref<HTMLButtonElement>()

// 外部から参照可能にする（親コンポーネント用）
defineExpose({
  gameButtonRef,
  tutorialButtonRef
})
</script>

<style scoped>
/* ===========================================
   ナビゲーションアクション専用スタイル
   ========================================= */

.action-section {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-2xl);
}

.button-group {
  display: flex;
  gap: var(--space-lg);
  flex-wrap: wrap;
  justify-content: center;
}

/* ボタンの基本スタイル */
.btn {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  
  min-width: 180px;
  min-height: var(--touch-target-comfortable);
  padding: var(--space-md) var(--space-xl);
  
  border: none;
  border-radius: 12px;
  
  font-family: Inter, system-ui, sans-serif;
  font-size: var(--text-lg);
  font-weight: 600;
  text-decoration: none;
  
  transition: all var(--transition-normal);
  cursor: pointer;
  
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(8px);
}

/* プライマリボタン */
.btn-primary {
  background: var(--primary-gradient);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-glow), 0 12px 40px rgba(102, 126, 234, 0.3);
}

/* セカンダリボタン */
.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(129, 140, 248, 0.5);
}

.btn-secondary:hover {
  background: rgba(129, 140, 248, 0.2);
  border-color: rgba(129, 140, 248, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.2);
}

/* アクティブ状態 */
.btn:active {
  transform: translateY(0);
}

/* ボタンアイコン */
.btn-icon {
  font-size: var(--text-xl);
  line-height: 1;
}

.btn-text {
  font-weight: 600;
}

/* リップルエフェクト */
.ripple-container {
  position: relative;
  overflow: hidden;
}

.ripple-container::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.ripple-container:active::after {
  width: 300px;
  height: 300px;
}

/* グローエフェクト */
.glow-on-hover:hover {
  box-shadow: 
    var(--shadow-glow),
    0 0 30px rgba(102, 126, 234, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* アニメーション */
.bounce-in {
  animation: bounce-in 0.8s ease-out forwards;
  opacity: 0;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  60% {
    opacity: 1;
    transform: translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

/* フォーカス表示 */
.btn:focus {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .button-group {
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: var(--space-md);
  }
  
  .btn {
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }
}

@media (max-width: 375px) {
  .btn {
    min-width: 160px;
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--text-base);
  }
}

/* ハイコントラストモード対応 */
@media (prefers-contrast: high) {
  .btn-primary,
  .btn-secondary {
    border: 2px solid white;
  }
}

/* モーション削減設定 */
@media (prefers-reduced-motion: reduce) {
  .btn,
  .bounce-in {
    transition: none;
    animation: none;
    opacity: 1;
    transform: none;
  }
  
  .btn:hover {
    transform: none;
  }
  
  .ripple-container::after {
    display: none;
  }
}

/* スクリーンリーダー専用 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>