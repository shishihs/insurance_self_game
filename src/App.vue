<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import GameCanvas from './components/game/GameCanvas.vue'
import TransitionAnimations from './components/animations/TransitionAnimations.vue'
import { KeyboardManager } from './components/accessibility/KeyboardManager'
import { ScreenReaderManager } from './components/accessibility/ScreenReaderManager'
const showGame = ref(false)
let keyboardManager: KeyboardManager | null = null
let screenReaderManager: ScreenReaderManager | null = null

const startGame = () => {
  showGame.value = true
  screenReaderManager?.announceScreenChange('ゲーム画面', 'ゲームが開始されました')
}

const startTutorial = () => {
  showGame.value = true
  screenReaderManager?.announceScreenChange('チュートリアル', 'チュートリアルを開始します')
  // GameCanvasコンポーネントにチュートリアル開始を通知
  // 次のtickeで実行することで、GameCanvasがマウントされてから実行される
  setTimeout(() => {
    const event = new CustomEvent('startTutorial')
    window.dispatchEvent(event)
  }, 100)
}

const backToHome = () => {
  showGame.value = false
  screenReaderManager?.announceScreenChange('ホーム画面', 'ホーム画面に戻りました')
}

onMounted(() => {
  // アクセシビリティマネージャーを初期化
  keyboardManager = new KeyboardManager()
  screenReaderManager = new ScreenReaderManager()
  
  // キーボードショートカットを登録
  keyboardManager.registerShortcut({
    key: 'h',
    modifiers: ['alt'],
    description: 'ホーム画面に戻る',
    action: () => {
      if (showGame.value) {
        backToHome()
      }
    }
  })
  
  keyboardManager.registerShortcut({
    key: 'g',
    modifiers: ['alt'],
    description: 'ゲームを開始',
    action: () => {
      if (!showGame.value) {
        startGame()
      }
    }
  })
  
  keyboardManager.registerShortcut({
    key: 't',
    modifiers: ['alt'],
    description: 'チュートリアルを開始',
    action: () => {
      if (!showGame.value) {
        startTutorial()
      }
    }
  })
  
  // フォーカス可能要素を登録（ホーム画面のボタン）
  setTimeout(() => {
    const gameButton = document.querySelector('.primary-action-btn') as HTMLElement
    const tutorialButton = document.querySelector('.secondary-action-btn') as HTMLElement
    const backButton = document.querySelector('.back-to-home-btn') as HTMLElement
    
    if (gameButton) {
      keyboardManager?.registerFocusableElement(gameButton, {
        priority: 100,
        group: 'main-actions',
        onFocus: () => screenReaderManager?.announce('ゲーム開始ボタンにフォーカス')
      })
    }
    
    if (tutorialButton) {
      keyboardManager?.registerFocusableElement(tutorialButton, {
        priority: 90,
        group: 'main-actions',
        onFocus: () => screenReaderManager?.announce('チュートリアル開始ボタンにフォーカス')
      })
    }
    
    if (backButton) {
      keyboardManager?.registerFocusableElement(backButton, {
        priority: 100,
        group: 'game-actions',
        onFocus: () => screenReaderManager?.announce('ホーム画面に戻るボタンにフォーカス')
      })
    }
  }, 100)
  
  // 初期アナウンス
  screenReaderManager.announceScreenChange('ホーム画面', '人生充実ゲーム へようこそ。Alt+Gでゲーム開始、Alt+Tでチュートリアル、F1でヘルプを表示できます')
})

onUnmounted(() => {
  keyboardManager?.destroy()
  screenReaderManager?.destroy()
})
</script>

<template>
  <div class="app-container" role="application" aria-label="人生充実ゲーム">
    <!-- スキップリンク -->
    <div class="skip-links">
      <a href="#main-content" class="skip-link">メインコンテンツに移動</a>
      <a href="#navigation" class="skip-link">ナビゲーションに移動</a>
    </div>

    <!-- ゲーム画面 -->
    <TransitionAnimations type="slide" direction="left" :duration="400" intensity="normal">
      <div v-if="showGame" class="game-view" id="main-content" role="main" aria-label="ゲーム画面">
        <GameCanvas />
        <button
          ref="backToHomeButtonRef"
          @click="backToHome"
          class="back-to-home-btn"
          aria-label="ホーム画面に戻る (Alt+H)"
          :aria-keyshortcuts="'Alt+H'"
        >
          <span class="btn-icon" aria-hidden="true">←</span>
          <span class="btn-text">ホーム</span>
        </button>
      </div>

      <!-- ホーム画面 -->
      <div v-else class="home-view" id="main-content" role="main" aria-label="ホーム画面">
        <div class="home-container">
        <header class="hero-section">
          <h1 class="hero-title">
            人生充実ゲーム
          </h1>
          <p class="hero-subtitle">
            Life Fulfillment - 生命保険を「人生の味方」として描く
          </p>
        </header>

        <section class="action-section" id="navigation" role="navigation" aria-label="メインナビゲーション">
          <div class="button-group">
            <button
              ref="gameButtonRef"
              @click="startGame"
              class="primary-action-btn"
              aria-label="ゲームを開始する (Alt+G)"
              :aria-keyshortcuts="'Alt+G'"
              aria-describedby="game-description"
            >
              <span class="btn-icon" aria-hidden="true">🎮</span>
              <span class="btn-text">ゲームをプレイ</span>
            </button>
            <button
              ref="tutorialButtonRef"
              @click="startTutorial"
              class="secondary-action-btn"
              aria-label="チュートリアルを開始する (Alt+T)"
              :aria-keyshortcuts="'Alt+T'"
              aria-describedby="tutorial-description"
            >
              <span class="btn-icon" aria-hidden="true">📚</span>
              <span class="btn-text">チュートリアル</span>
            </button>
          </div>
          
          <!-- ボタンの説明（スクリーンリーダー用） -->
          <div class="sr-only">
            <div id="game-description">保険をテーマにした人生シミュレーションゲームを開始します</div>
            <div id="tutorial-description">ゲームの遊び方を学習するチュートリアルを開始します</div>
          </div>
        </section>

        <section class="info-section">
          <div class="info-grid">
        <!-- 最新の変更 -->
        <div class="card">
          <h2 class="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
            <span>🎵</span>
            最新アップデート v0.2.5
          </h2>
          <div class="text-left space-y-3">
            <div>
              <h3 class="font-semibold text-lg mb-2">Web Audio APIサウンドシステム</h3>
              <ul class="space-y-1 text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>15種類のサウンドエフェクト</strong>: カード操作、チャレンジ、UI音響</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>ファイル不要の高品質音生成</strong>: Web Audio APIによる動的合成</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>音楽理論に基づく設計</strong>: C5-E5-G5和音、完全3度音程使用</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>Mキーサウンド切り替え</strong>: 瞬時ON/OFF、設定自動保存</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">🐛</span>
                  <span><strong>CardPowerエラー修正</strong>: 負の値処理を改善、安定性向上</span>
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
                  <span class="text-success">✅</span>
                  チュートリアルモード
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-success">✅</span>
                  サウンドエフェクト
                </li>
                <li class="flex items-center gap-2">
                  <span class="text-gray-400">⭕</span>
                  ゲームバランス微調整
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
      </section>
        </div>
      </div>
    </TransitionAnimations>

    <!-- フッター -->
    <footer class="sr-only" id="footer" role="contentinfo">
      <p>人生充実ゲーム - アクセシブルなWebゲーム体験</p>
    </footer>
  </div>
</template>

<style scoped>
/* =================================
   アプリケーション基本レイアウト
   ================================= */

.app-container {
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: rgba(255, 255, 255, 0.87);
  display: flex;
  flex-direction: column;
}

/* =================================
   ゲーム画面レイアウト
   ================================= */

.game-view {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.back-to-home-btn {
  position: absolute;
  top: var(--space-md);
  left: var(--space-md);
  z-index: var(--z-fixed);
  
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 8px;
  padding: var(--space-sm) var(--space-md);
  
  font-family: Inter, system-ui, sans-serif;
  font-size: var(--text-sm);
  font-weight: 600;
  
  backdrop-filter: blur(8px);
  box-shadow: var(--shadow-card);
  
  transition: all var(--transition-fast);
  cursor: pointer;
}

.back-to-home-btn:hover {
  background: rgba(220, 38, 38, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
}

.back-to-home-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: var(--text-lg);
  line-height: 1;
}

.btn-text {
  font-weight: 600;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .btn-text {
    display: none;
  }
  
  .back-to-home-btn {
    width: var(--touch-target-comfortable);
    height: var(--touch-target-comfortable);
    padding: var(--space-xs);
    justify-content: center;
    border-radius: 50%;
  }
  
  .game-view {
    /* モバイルでのゲームビューを最適化 */
    height: 100vh;
    height: 100dvh; /* Dynamic viewport height for mobile */
    overflow: hidden;
  }
}

/* タブレット縦持ち対応 */
@media (max-width: 768px) and (orientation: portrait) {
  .game-view {
    height: 100vh;
    height: 100dvh;
  }
  
  .back-to-home-btn {
    top: max(var(--space-md), env(safe-area-inset-top, 0px));
    left: max(var(--space-md), env(safe-area-inset-left, 0px));
  }
}

/* ランドスケープモード（横持ち）対応 */
@media (max-height: 600px) and (orientation: landscape) {
  .back-to-home-btn {
    top: var(--space-sm);
    left: var(--space-sm);
    width: var(--touch-target-min);
    height: var(--touch-target-min);
  }
  
  .game-view {
    height: 100vh;
    height: 100dvh;
  }
}

/* =================================
   ホーム画面レイアウト
   ================================= */

.home-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-md);
  min-height: 100vh;
}

.home-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3xl);
}

/* =================================
   ヒーローセクション
   ================================= */

.hero-section {
  text-align: center;
  padding: var(--space-xl) 0;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4rem);
  font-weight: 800;
  margin-bottom: var(--space-md);
  
  background: var(--primary-gradient);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  
  text-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
  line-height: 1.1;
}

.hero-subtitle {
  font-size: clamp(1rem, 3vw, 1.25rem);
  color: rgb(156, 163, 175);
  margin-bottom: var(--space-xl);
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
  line-height: 1.6;
}

/* =================================
   アクションボタンセクション
   ================================= */

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

.primary-action-btn,
.secondary-action-btn {
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

.primary-action-btn {
  background: var(--primary-gradient);
  color: white;
}

.primary-action-btn:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-glow), 0 12px 40px rgba(102, 126, 234, 0.3);
}

.secondary-action-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 2px solid rgba(129, 140, 248, 0.5);
}

.secondary-action-btn:hover {
  background: rgba(129, 140, 248, 0.2);
  border-color: rgba(129, 140, 248, 0.8);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(129, 140, 248, 0.2);
}

.primary-action-btn:active,
.secondary-action-btn:active {
  transform: translateY(0);
}

/* ボタンアイコン */
.primary-action-btn .btn-icon,
.secondary-action-btn .btn-icon {
  font-size: var(--text-xl);
  line-height: 1;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .button-group {
    flex-direction: column;
    align-items: center;
    width: 100%;
  }
  
  .primary-action-btn,
  .secondary-action-btn {
    width: 100%;
    max-width: 280px;
    justify-content: center;
  }
}

/* =================================
   情報セクション
   ================================= */

.info-section {
  margin-bottom: var(--space-2xl);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: var(--space-xl);
}

/* モバイル対応 */
@media (max-width: 640px) {
  .info-grid {
    grid-template-columns: 1fr;
    gap: var(--space-lg);
  }
}

/* =================================
   情報カード
   ================================= */

.info-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(129, 140, 248, 0.2);
  border-radius: 16px;
  padding: var(--space-xl);
  
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-card);
  
  transition: all var(--transition-normal);
}

.info-card:hover {
  border-color: rgba(129, 140, 248, 0.4);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}

.card-header {
  margin-bottom: var(--space-lg);
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  
  font-size: var(--text-2xl);
  font-weight: 700;
  color: rgba(129, 140, 248, 1);
  margin-bottom: var(--space-md);
}

.card-icon {
  font-size: var(--text-3xl);
  line-height: 1;
}

.card-content {
  color: rgba(255, 255, 255, 0.9);
}

/* =================================
   機能リスト
   ================================= */

.feature-group,
.roadmap-group {
  margin-bottom: var(--space-lg);
}

.feature-title,
.roadmap-title {
  font-size: var(--text-lg);
  font-weight: 600;
  margin-bottom: var(--space-md);
  color: rgba(255, 255, 255, 0.95);
}

.feature-list,
.roadmap-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.feature-item,
.roadmap-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-sm);
  padding: var(--space-xs) 0;
}

.feature-status,
.roadmap-status {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  margin-top: 2px;
}

.feature-status.success {
  color: rgb(34, 197, 94);
}

.roadmap-status.completed {
  color: rgb(34, 197, 94);
}

.roadmap-status.pending {
  color: rgb(156, 163, 175);
}

.feature-text {
  flex: 1;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
}

/* =================================
   外部リンク
   ================================= */

.external-link {
  margin-top: var(--space-lg);
  padding-top: var(--space-md);
  border-top: 1px solid rgba(129, 140, 248, 0.2);
}

.link-primary {
  color: rgba(129, 140, 248, 1);
  text-decoration: none;
  font-weight: 500;
  transition: color var(--transition-fast);
}

.link-primary:hover {
  color: rgba(99, 102, 241, 1);
  text-decoration: underline;
}

/* =================================
   フッターセクション
   ================================= */

.footer-section {
  text-align: center;
  padding-top: var(--space-xl);
  border-top: 1px solid rgba(129, 140, 248, 0.1);
}

.footer-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
  flex-wrap: wrap;
}

.footer-link {
  color: rgba(156, 163, 175, 1);
  text-decoration: none;
  font-size: var(--text-sm);
  transition: color var(--transition-fast);
}

.footer-link:hover {
  color: rgba(129, 140, 248, 1);
}

.footer-separator {
  color: rgba(156, 163, 175, 0.6);
  font-size: var(--text-sm);
}

/* =================================
   アクセシビリティ対応
   ================================= */

/* フォーカス表示 */
.back-to-home-btn:focus,
.primary-action-btn:focus,
.secondary-action-btn:focus,
.footer-link:focus,
.link-primary:focus {
  outline: 2px solid rgba(129, 140, 248, 0.8);
  outline-offset: 2px;
}

/* モーション削減設定 */
@media (prefers-reduced-motion: reduce) {
  .hero-title,
  .info-card,
  .back-to-home-btn,
  .primary-action-btn,
  .secondary-action-btn {
    transition: none;
  }
  
  .info-card:hover,
  .primary-action-btn:hover,
  .secondary-action-btn:hover {
    transform: none;
  }
}

/* ハイコントラスト対応 */
@media (prefers-contrast: high) {
  .info-card {
    border-color: rgba(129, 140, 248, 0.6);
    background: rgba(255, 255, 255, 0.1);
  }
  
  .primary-action-btn,
  .secondary-action-btn {
    border: 2px solid white;
  }
}

/* =================================
   レスポンシブ詳細調整
   ================================= */

/* タブレット */
@media (max-width: 1024px) {
  .home-container {
    max-width: 768px;
    gap: var(--space-2xl);
  }
  
  .hero-section {
    padding: var(--space-lg) 0;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
    max-width: 600px;
    margin: 0 auto;
  }
}

/* スマートフォン */
@media (max-width: 640px) {
  .home-view {
    padding: var(--space-sm);
  }
  
  .home-container {
    gap: var(--space-xl);
  }
  
  .info-card {
    padding: var(--space-lg);
  }
  
  .card-title {
    font-size: var(--text-xl);
  }
  
  .feature-title,
  .roadmap-title {
    font-size: var(--text-base);
  }
}

/* 極小画面 */
@media (max-width: 375px) {
  .home-view {
    padding: var(--space-xs);
  }
  
  .info-card {
    padding: var(--space-md);
  }
  
  .hero-title {
    font-size: 2rem;
    line-height: 1.2;
  }
  
  .hero-subtitle {
    font-size: var(--text-base);
    line-height: 1.5;
  }
  
  .primary-action-btn,
  .secondary-action-btn {
    min-width: 160px;
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--text-base);
  }
}

/* 大画面対応 */
@media (min-width: 1536px) {
  .home-container {
    max-width: 1400px;
  }
  
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2xl);
  }
}

/* =================================
   アクセシビリティ専用スタイル
   ================================= */

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

/* スキップリンク */
.skip-links {
  position: absolute;
  top: -40px;
  left: 6px;
  z-index: var(--z-tooltip);
}

.skip-link {
  position: absolute;
  left: -10000px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  background: var(--primary-dark);
  color: white;
  padding: var(--space-sm) var(--space-md);
  text-decoration: none;
  border-radius: 4px;
  font-weight: 600;
  border: 2px solid var(--primary-light);
}

.skip-link:focus {
  position: static;
  width: auto;
  height: auto;
  left: auto;
  top: auto;
  overflow: visible;
}

/* キーボードナビゲーション表示 */
.keyboard-navigation *:focus {
  outline: 3px solid var(--primary-light) !important;
  outline-offset: 2px !important;
  border-radius: 4px;
}

/* 高コントラストモード対応 */
@media (prefers-contrast: high) {
  .skip-link {
    background: #000;
    border: 3px solid #fff;
  }
  
  .skip-link:focus {
    background: #fff;
    color: #000;
    border-color: #000;
  }
  
  .keyboard-navigation *:focus {
    outline-color: #000 !important;
    outline-width: 4px !important;
  }
}

/* フォーカス表示の改善 */
@media (prefers-reduced-motion: no-preference) {
  .keyboard-navigation *:focus {
    transition: outline-color var(--transition-fast);
  }
}
</style>