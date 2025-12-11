<template>
  <section id="navigation" class="action-section" role="navigation" aria-label="メインナビゲーション">
    <div class="button-group">
      <button
        ref="gameButtonRef"
        class="btn btn-primary ripple-container glow-on-hover bounce-in"
        aria-label="ゲームを開始する (Alt+G)"
        :aria-keyshortcuts="'Alt+G'"
        aria-describedby="game-description"
        @click="$emit('start-game')"
      >
        <span class="btn-bg-effect"></span>
        <span class="btn-icon" aria-hidden="true">🎮</span>
        <span class="btn-text">ゲームをプレイ</span>
        <span class="btn-arrow" aria-hidden="true">→</span>
      </button>
      
      <button
        ref="tutorialButtonRef"
        class="btn btn-secondary ripple-container"
        aria-label="チュートリアルを開始する (Alt+T)"
        :aria-keyshortcuts="'Alt+T'"
        aria-describedby="tutorial-description"
        @click="$emit('start-tutorial')"
      >
        <span class="btn-bg-effect"></span>
        <span class="btn-icon" aria-hidden="true">📚</span>
        <span class="btn-text">チュートリアル</span>
      </button>
      
      <button
        ref="rulebookButtonRef"
        class="btn btn-tertiary ripple-container"
        aria-label="ゲームルールを読む (Alt+R)"
        :aria-keyshortcuts="'Alt+R'"
        aria-describedby="rulebook-description"
        @click="showRulebook = true"
      >
        <span class="btn-bg-effect"></span>
        <span class="btn-icon" aria-hidden="true">📖</span>
        <span class="btn-text">ルールを読む</span>
      </button>
    </div>
    
    <!-- ボタンの説明（スクリーンリーダー用） -->
    <div class="sr-only">
      <div id="game-description">保険をテーマにした人生シミュレーションゲームを開始します</div>
      <div id="tutorial-description">ゲームの遊び方を学習するチュートリアルを開始します</div>
      <div id="rulebook-description">ゲームのルールと遊び方を詳しく読むことができます</div>
    </div>
    
    <!-- ルールブックモーダル -->
    <RulebookModal 
      :is-open="showRulebook" 
      @close="showRulebook = false" 
    />
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RulebookModal from './RulebookModal.vue'

// イベント定義
defineEmits<{
  'start-game': []
  'start-tutorial': []
}>()

// ルールブックモーダルの表示状態
const showRulebook = ref(false)

// テンプレート参照
const gameButtonRef = ref<HTMLButtonElement>()
const tutorialButtonRef = ref<HTMLButtonElement>()
const rulebookButtonRef = ref<HTMLButtonElement>()

// 外部から参照可能にする（親コンポーネント用）
defineExpose({
  gameButtonRef,
  tutorialButtonRef,
  rulebookButtonRef
})
</script>

<style scoped>
/* ===========================================
   ナビゲーションアクション専用スタイル
   ========================================= */

.action-section {
  display: flex;
  justify-content: center;
  margin-top: var(--space-lg);
  margin-bottom: var(--space-xl);
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
  
  min-width: 200px;
  min-height: var(--touch-target-comfortable);
  padding: var(--space-md) var(--space-xl);
  
  border: none;
  border-radius: 16px;
  
  font-family: Inter, system-ui, sans-serif;
  font-size: var(--text-lg);
  font-weight: 600;
  text-decoration: none;
  
  transition: all var(--transition-normal);
  cursor: pointer;
  
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(8px);
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

/* 背景エフェクト */
.btn-bg-effect {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity var(--transition-normal);
  z-index: -1;
}

.btn:hover .btn-bg-effect {
  opacity: 1;
}

/* プライマリボタン */
.btn-primary {
  background: var(--brand-gradient-primary);
  color: white;
  position: relative;
}

.btn-primary::before {
  content: '';
  position: absolute;
  inset: -2px;
  background: var(--brand-gradient-hero);
  border-radius: inherit;
  opacity: 0;
  z-index: -1;
  transition: opacity var(--transition-normal);
  filter: blur(10px);
}

.btn-primary:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 
    0 10px 20px rgba(0, 0, 0, 0.2),
    0 15px 40px rgba(129, 140, 248, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.btn-primary:hover::before {
  opacity: 0.5;
}

.btn-primary .btn-arrow {
  margin-left: auto;
  font-size: 1.2em;
  transition: transform var(--transition-normal);
}

.btn-primary:hover .btn-arrow {
  transform: translateX(4px);
}

/* セカンダリボタン */
.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.9);
  border: 1.5px solid rgba(129, 140, 248, 0.3);
  position: relative;
}

.btn-secondary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(129, 140, 248, 0.1) 100%);
  opacity: 0;
  transition: opacity var(--transition-normal);
  border-radius: inherit;
}

.btn-secondary:hover {
  background: rgba(129, 140, 248, 0.15);
  border-color: rgba(129, 140, 248, 0.6);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.1),
    0 8px 25px rgba(129, 140, 248, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover::after {
  opacity: 1;
}

/* ターシャリーボタン（ルールブック用） */
.btn-tertiary {
  background: rgba(16, 185, 129, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1.5px solid rgba(16, 185, 129, 0.4);
  position: relative;
}

.btn-tertiary::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(16, 185, 129, 0.15) 100%);
  opacity: 0;
  transition: opacity var(--transition-normal);
  border-radius: inherit;
}

.btn-tertiary:hover {
  background: rgba(16, 185, 129, 0.2);
  border-color: rgba(16, 185, 129, 0.7);
  transform: translateY(-2px) scale(1.01);
  box-shadow: 
    0 8px 16px rgba(0, 0, 0, 0.1),
    0 8px 25px rgba(16, 185, 129, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn-tertiary:hover::after {
  opacity: 1;
}

.btn-tertiary .btn-icon {
  filter: drop-shadow(0 2px 4px rgba(16, 185, 129, 0.3));
}

/* アクティブ状態 */
.btn:active {
  transform: translateY(0);
}

/* ボタンアイコン */
.btn-icon {
  font-size: var(--text-xl);
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  transition: transform var(--transition-normal);
}

.btn:hover .btn-icon {
  transform: scale(1.1) rotate(-5deg);
}

.btn-text {
  font-weight: 600;
  letter-spacing: 0.02em;
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
.glow-on-hover {
  position: relative;
}

.glow-on-hover::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(135deg, var(--primary-400), var(--secondary-400));
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.glow-on-hover:hover::after {
  opacity: 1;
}

/* アニメーション */
.bounce-in {
  animation: bounce-in 0.8s ease-out both;
  /* フォールバック: アニメーションがサポートされない場合は表示 */
  opacity: 1;
}

@keyframes bounce-in {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.9);
  }
  60% {
    opacity: 1;
    transform: translateY(-5px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* ホバー時のパルスアニメーション */
@keyframes pulse-subtle {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.btn-primary:hover .btn-icon {
  animation: pulse-subtle 2s infinite;
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
    transition: none !important;
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
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