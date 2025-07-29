<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import GameCanvas from './components/game/GameCanvas.vue'
import TransitionAnimations from './components/animations/TransitionAnimations.vue'
import AccessibilitySettings from './components/accessibility/AccessibilitySettings.vue'
import VisualIndicators from './components/accessibility/VisualIndicators.vue'
import ErrorBoundary from './components/error/ErrorBoundary.vue'
import ErrorNotification from './components/error/ErrorNotification.vue'
import StatisticsDashboard from './components/statistics/StatisticsDashboard.vue'
import { KeyboardManager } from './components/accessibility/KeyboardManager'
import { ScreenReaderManager } from './components/accessibility/ScreenReaderManager'
import FeedbackButton from './components/feedback/FeedbackButton.vue'
const showGame = ref(false)
const showAccessibilitySettings = ref(false)
const showStatistics = ref(false)
let keyboardManager: KeyboardManager | null = null
let screenReaderManager: ScreenReaderManager | null = null

// フィードバック用のゲーム状態
const gameState = ref({
  stage: 'youth',
  turn: 1,
  vitality: 100,
  phase: 'setup'
})

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

const openStatistics = () => {
  showStatistics.value = true
  screenReaderManager?.announceScreenChange('統計ダッシュボード', '統計ダッシュボードを開きました')
}

const closeStatistics = () => {
  showStatistics.value = false
  screenReaderManager?.announceScreenChange('ホーム画面', 'ホーム画面に戻りました')
}

const handleAccessibilitySettingsChanged = (settings: any) => {
  // アクセシビリティ設定が変更されたときの処理
  console.log('アクセシビリティ設定が更新されました:', settings)
  
  // スクリーンリーダーに通知
  if (settings.screenReaderEnabled) {
    screenReaderManager?.announce('スクリーンリーダー対応が有効になりました', { priority: 'assertive' })
  }
}

const handleFeedbackSubmitted = (feedbackId: string, type: string) => {
  console.log(`フィードバック送信完了: ${type} (${feedbackId})`)
  
  // アナリティクスやログ送信（将来的に実装）
  // trackFeedbackEvent(type, feedbackId)
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
  
  keyboardManager.registerShortcut({
    key: 'a',
    modifiers: ['alt'],
    description: 'アクセシビリティ設定を開く',
    action: () => {
      showAccessibilitySettings.value = true
      screenReaderManager?.announce('アクセシビリティ設定を開きました', { priority: 'assertive' })
    }
  })
  
  keyboardManager.registerShortcut({
    key: 's',
    modifiers: ['alt'],
    description: '統計ダッシュボードを開く',
    action: () => {
      if (!showGame.value && !showStatistics.value) {
        openStatistics()
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
  screenReaderManager.announceScreenChange('ホーム画面', '人生充実ゲーム へようこそ。Alt+Gでゲーム開始、Alt+Tでチュートリアル、Alt+Sで統計、Alt+Aでアクセシビリティ設定、F1でヘルプを表示できます')
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

    <!-- エラー通知 -->
    <ErrorNotification />

    <!-- ゲーム画面 -->
    <TransitionAnimations type="slide" direction="left" :duration="400" intensity="normal">
      <div v-if="showGame" class="game-view" id="main-content" role="main" aria-label="ゲーム画面">
        <ErrorBoundary fallback="detailed" :can-recover="true">
          <GameCanvas />
        </ErrorBoundary>
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
        <ErrorBoundary fallback="minimal">
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
            <button
              @click="openStatistics"
              class="secondary-action-btn"
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

        <section class="info-section">
          <div class="info-grid">
        <!-- 最新の変更 -->
        <div class="card">
          <h2 class="text-2xl font-bold mb-4 text-primary flex items-center gap-2">
            <span>📱</span>
            最新アップデート v0.2.7
          </h2>
          <div class="text-left space-y-3">
            <div>
              <h3 class="font-semibold text-lg mb-2">包括的なモバイル最適化</h3>
              <ul class="space-y-1 text-sm">
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>タッチ操作完全対応</strong>: スワイプ、ピンチズーム、ドラッグ&ドロップ</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>レスポンシブデザイン</strong>: あらゆる画面サイズに自動適応</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>PWA対応</strong>: ホーム画面追加、オフライン動作可能</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>パフォーマンス最適化</strong>: 60fps維持、バッテリー効率向上</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="text-success mt-1">✅</span>
                  <span><strong>モバイル専用UI</strong>: タッチに最適化されたインターフェース</span>
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
        </ErrorBoundary>
      </div>
    </TransitionAnimations>

    <!-- フッター -->
    <footer class="sr-only" id="footer" role="contentinfo">
      <p>人生充実ゲーム - アクセシブルなWebゲーム体験</p>
    </footer>
    
    <!-- アクセシビリティ設定モーダル -->
    <AccessibilitySettings 
      :is-open="showAccessibilitySettings"
      @close="showAccessibilitySettings = false"
      @settings-changed="handleAccessibilitySettingsChanged"
    />
    
    <!-- ビジュアルインジケーター -->
    <VisualIndicators :enabled="true" />
    
    <!-- アクセシビリティ設定ボタン -->
    <button
      @click="showAccessibilitySettings = true"
      class="accessibility-button"
      aria-label="アクセシビリティ設定を開く (Alt+A)"
      :aria-keyshortcuts="'Alt+A'"
      title="アクセシビリティ設定"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9H15L13.5 7.5C13 7 12.5 6.5 11.9 6.5H12.1C11.5 6.5 11 7 10.5 7.5L7.91 10.09C7.66 10.34 7.66 10.76 7.91 11.01L10.5 13.6C11 14.1 11.5 14.6 12.1 14.6H11.9C12.5 14.6 13 14.1 13.5 13.6L15 12.1H21C21.6 12.1 22 11.7 22 11.1V10C22 9.4 21.6 9 21 9ZM8.5 12.5L12 16L15.5 12.5L12 22L8.5 12.5Z" fill="currentColor"/>
      </svg>
    </button>

    <!-- 統計ダッシュボード -->
    <Teleport to="body">
      <div v-if="showStatistics" class="modal-overlay" @click="closeStatistics">
        <div class="modal-content" @click.stop>
          <StatisticsDashboard 
            :auto-refresh="true"
            @close="closeStatistics"
          />
        </div>
      </div>
    </Teleport>

    <!-- フィードバックボタン -->
    <FeedbackButton
      :game-state="gameState"
      :show-stats="true"
      :auto-survey="true"
      @feedback-submitted="handleFeedbackSubmitted"
    />
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

/* =================================
   アクセシビリティボタン
   ================================= */

.accessibility-button {
  position: fixed;
  bottom: var(--space-lg);
  right: var(--space-lg);
  z-index: var(--z-fixed);
  
  width: var(--touch-target-comfortable);
  height: var(--touch-target-comfortable);
  
  display: flex;
  align-items: center;
  justify-content: center;
  
  background: rgba(129, 140, 248, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(8px);
  
  cursor: pointer;
  transition: all var(--transition-normal);
}

.accessibility-button:hover {
  background: rgba(99, 102, 241, 0.95);
  transform: translateY(-4px) scale(1.1);
  box-shadow: 0 12px 40px rgba(129, 140, 248, 0.4);
}

.accessibility-button:active {
  transform: translateY(-2px) scale(1.05);
}

.accessibility-button:focus {
  outline: 3px solid white;
  outline-offset: 3px;
}

.accessibility-button svg {
  width: 24px;
  height: 24px;
}

/* モバイル対応 */
@media (max-width: 640px) {
  .accessibility-button {
    bottom: var(--space-md);
    right: var(--space-md);
    width: var(--touch-target-min);
    height: var(--touch-target-min);
  }
}

/* ハイコントラストモード専用スタイル */
.high-contrast {
  /* 背景とテキストのコントラスト強化 */
  --bg-primary: #000000;
  --bg-secondary: #0a0a0a;
  --bg-card: rgba(255, 255, 255, 0.15);
}

.high-contrast .primary-action-btn,
.high-contrast .secondary-action-btn {
  border: 3px solid white;
}

.high-contrast .info-card {
  border-width: 2px;
  border-color: white;
  background: rgba(0, 0, 0, 0.9);
}

.high-contrast .card-title {
  color: #FFD43B;
}

.high-contrast .hero-title {
  background: none;
  -webkit-text-fill-color: white;
  text-shadow: 2px 2px 4px black;
}

/* モーション削減モード */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* フォントサイズ調整用CSS変数の適用 */
.app-container {
  font-size: var(--base-font-size, 16px);
}

/* タッチターゲットサイズの適用 */
button,
a,
input,
select,
textarea,
[role="button"],
[tabindex]:not([tabindex="-1"]) {
  min-width: var(--touch-target-size, 44px);
  min-height: var(--touch-target-size, 44px);
}

/* アニメーション速度の調整 */
@property --animation-speed-multiplier {
  syntax: '<number>';
  initial-value: 1;
  inherits: true;
}

.game-card,
.drop-zone,
.info-card,
.primary-action-btn,
.secondary-action-btn {
  transition-duration: calc(var(--transition-normal) / var(--animation-speed-multiplier, 1));
}

/* =================================
   統計ダッシュボードモーダル
   ================================= */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-md);
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 100%;
  height: 100%;
  max-width: 1400px;
  max-height: 900px;
  background: var(--bg-primary);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(129, 140, 248, 0.2);
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: var(--space-xs);
  }
  
  .modal-content {
    border-radius: 12px;
  }
}
</style>