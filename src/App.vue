<script setup lang="ts">
import { defineAsyncComponent, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
// import GameCanvas from './components/game/GameCanvas.vue' // 動的インポートに変更
import transitionAnimations from './components/animations/TransitionAnimations.vue'
import accessibilitySettings from './components/accessibility/AccessibilitySettings.vue'
import visualIndicators from './components/accessibility/VisualIndicators.vue'
import errorBoundary from './components/error/ErrorBoundary.vue'
import errorNotification from './components/error/ErrorNotification.vue'
import mobileErrorHandler from './components/error/MobileErrorHandler.vue'
// import StatisticsDashboard from './components/statistics/StatisticsDashboard.vue' // 動的インポートに変更
import { KeyboardManager } from './components/accessibility/KeyboardManager'
import { ScreenReaderManager } from './components/accessibility/ScreenReaderManager'
// import FeedbackButton from './components/feedback/FeedbackButton.vue' // 動的インポートに変更

// レイアウトコンポーネント
import appHeader from './components/layout/AppHeader.vue'
import navigationActions from './components/layout/NavigationActions.vue'
import featureShowcase from './components/layout/FeatureShowcase.vue'

// 国際化コンポーネント
import languageSwitcher from './components/i18n/LanguageSwitcher.vue'

// PWAコンポーネント
import pwaInstallPrompt from './components/pwa/PWAInstallPrompt.vue'
import pwaStatusIndicator from './components/pwa/PWAStatusIndicator.vue'

// 国際化機能
const { t } = useI18n()
const showGame = ref(false)
const showAccessibilitySettings = ref(false)
const showStatistics = ref(false)
const isMobile = ref(false)
// 動的インポートにエラーハンドリングを追加
const StatisticsDashboard = defineAsyncComponent({
  loader: async () => import('./components/statistics/StatisticsDashboard.vue'),
  errorComponent: {
    template: '<div></div>' // エラー時は空のコンポーネント
  },
  delay: 200,
  timeout: 10000
})

const FeedbackButton = defineAsyncComponent({
  loader: async () => {
    try {
      return await import('./components/feedback/FeedbackButton.vue')
    } catch (error) {
      console.warn('FeedbackButton could not be loaded:', error)
      // フォールバックコンポーネント
      return {
        name: 'FeedbackButtonFallback',
        template: '<div class="feedback-button-fallback" style="display: none;"></div>'
      }
    }
  },
  errorComponent: {
    name: 'FeedbackButtonError',
    template: '<div class="feedback-button-error" style="display: none;"></div>'
  },
  delay: 200,
  timeout: 10000
})

const GameCanvas = defineAsyncComponent({
  loader: async () => import('./components/game/GameCanvas.vue'),
  errorComponent: {
    template: '<div class="error-container"><p>ゲームの読み込みに失敗しました</p></div>'
  },
  delay: 200,
  timeout: 30000
})

// コンポーネント参照
const navigationRef = ref<InstanceType<typeof navigationActions>>()

let keyboardManager: KeyboardManager | null = null
let screenReaderManager: ScreenReaderManager | null = null

// フィードバック用のゲーム状態
const gameState = ref({
  stage: 'youth',
  turn: 1,
  vitality: 100,
  phase: 'setup'
})

const startGame = (): void => {
  showGame.value = true
  screenReaderManager?.announceScreenChange('ゲーム画面', 'ゲームが開始されました')
}

const startTutorial = (): void => {
  showGame.value = true
  screenReaderManager?.announceScreenChange('チュートリアル', 'チュートリアルを開始します')
  // GameCanvasコンポーネントにチュートリアル開始を通知
  // 次のtickeで実行することで、GameCanvasがマウントされてから実行される
  setTimeout(() => {
    const event = new CustomEvent('startTutorial')
    window.dispatchEvent(event)
  }, 100)
}

const backToHome = (): void => {
  showGame.value = false
  screenReaderManager?.announceScreenChange('ホーム画面', 'ホーム画面に戻りました')
}

const openStatistics = (): void => {
  showStatistics.value = true
  screenReaderManager?.announceScreenChange('統計ダッシュボード', '統計ダッシュボードを開きました')
}

const closeStatistics = (): void => {
  showStatistics.value = false
  screenReaderManager?.announceScreenChange('ホーム画面', 'ホーム画面に戻りました')
}

const handleAccessibilitySettingsChanged = (settings: Record<string, boolean | string | number>): void => {
  // アクセシビリティ設定が変更されたときの処理
  console.log('アクセシビリティ設定が更新されました:', settings)
  
  // スクリーンリーダーに通知
  if (Boolean(settings.screenReaderEnabled)) {
    screenReaderManager?.announce('スクリーンリーダー対応が有効になりました', { priority: 'assertive' })
  }
}

const handleFeedbackSubmitted = (feedbackId: string, type: string): void => {
  console.log(`フィードバック送信完了: ${type} (${feedbackId})`)
  
  // アナリティクスやログ送信（将来的に実装）
  // trackFeedbackEvent(type, feedbackId)
}

// エラータイプを判定
const getErrorType = (error: Error): 'network' | 'dynamic-import' | 'runtime' | 'permission' | 'unknown' => {
  const message = error.message.toLowerCase()
  
  if (message.includes('dynamically imported module') || message.includes('failed to fetch')) {
    return 'dynamic-import'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'network'
  }
  if (message.includes('permission') || message.includes('cors')) {
    return 'permission'
  }
  if (message.includes('cannot read') || message.includes('undefined')) {
    return 'runtime'
  }
  
  return 'unknown'
}

// ホーム画面のエラーハンドリング
const handleHomeError = (error: Error, info: string) => {
  console.error('Home screen error:', error, info)
}

// エラーレポート送信
const reportError = (error: Error) => {
  console.log('Error report:', error)
  // 将来的にエラーレポートAPIに送信
}

onMounted(() => {
  // モバイル判定
  isMobile.value = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  
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
    const gameButton = navigationRef.value?.gameButtonRef
    const tutorialButton = navigationRef.value?.tutorialButtonRef
    const backButton = document.querySelector('.back-to-home-btn') as HTMLElement
    
    if (gameButton !== null && gameButton !== undefined) {
      keyboardManager?.registerFocusableElement(gameButton, {
        priority: 100,
        group: 'main-actions',
        onFocus: () => screenReaderManager?.announce('ゲーム開始ボタンにフォーカス')
      })
    }
    
    if (tutorialButton !== null && tutorialButton !== undefined) {
      keyboardManager?.registerFocusableElement(tutorialButton, {
        priority: 90,
        group: 'main-actions',
        onFocus: () => screenReaderManager?.announce('チュートリアル開始ボタンにフォーカス')
      })
    }
    
    if (backButton !== null && backButton !== undefined) {
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
    <errorNotification />

    <!-- ゲーム画面 -->
    <transitionAnimations type="slide" direction="left" :duration="400" intensity="normal">
      <div v-if="showGame" class="game-view" id="main-content" role="main" aria-label="ゲーム画面">
        <errorBoundary fallback="detailed" :can-recover="true">
          <GameCanvas @back-to-home="backToHome" />
        </errorBoundary>
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
        <errorBoundary 
          fallback="custom"
          :can-recover="true"
          @error="handleHomeError"
        >
          <div class="home-container">
            <appHeader />

            <navigationActions 
              @start-game="startGame"
              @start-tutorial="startTutorial"
              @open-statistics="openStatistics"
              ref="navigationRef"
            />

            <section class="info-section">
              <featureShowcase />
            </section>
          </div>
          
          <!-- カスタムエラーフォールバック（モバイル対応） -->
          <template #error="{ error, retry, reload }">
            <MobileErrorHandler
              v-if="isMobile"
              :error="error"
              :error-type="getErrorType(error)"
              @retry="retry"
              @go-home="reload"
              @report-error="reportError"
            />
            <div v-else class="desktop-error">
              <h2>エラーが発生しました</h2>
              <p>{{ error.message }}</p>
              <div class="desktop-error-actions">
                <button @click="retry" class="error-btn">もう一度試す</button>
                <button @click="reload" class="error-btn secondary">ページを再読み込み</button>
              </div>
            </div>
          </template>
        </errorBoundary>
      </div>
    </transitionAnimations>

    <!-- フッター -->
    <footer class="sr-only" id="footer" role="contentinfo">
      <p>人生充実ゲーム - アクセシブルなWebゲーム体験</p>
    </footer>
    
    <!-- アクセシビリティ設定モーダル -->
    <accessibilitySettings 
      :is-open="showAccessibilitySettings"
      @close="showAccessibilitySettings = false"
      @settings-changed="handleAccessibilitySettingsChanged"
    />
    
    <!-- ビジュアルインジケーター -->
    <visualIndicators :enabled="true" />
    
    <!-- 言語切り替えボタン -->
    <div class="language-switcher-container">
      <languageSwitcher 
        mode="dropdown" 
        :compact="true"
        :aria-label="t('accessibility.options.changeLanguage', 'Change Language')"
      />
    </div>

    <!-- アクセシビリティ設定ボタン -->
    <button
      @click="showAccessibilitySettings = true"
      class="accessibility-button"
      :aria-label="t('accessibility.keyboardShortcuts.openAccessibility', 'アクセシビリティ設定を開く (Alt+A)')"
      :aria-keyshortcuts="'Alt+A'"
      :title="t('accessibility.title', 'アクセシビリティ設定')"
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
    <Suspense>
      <FeedbackButton
        :game-state="gameState"
        :show-stats="true"
        :auto-survey="true"
        @feedback-submitted="handleFeedbackSubmitted"
      />
      <template #fallback>
        <!-- フィードバックボタンのフォールバック（非表示） -->
      </template>
    </Suspense>

    <!-- PWA機能 -->
    <pwaInstallPrompt />
    <pwaStatusIndicator />
  </div>
</template>

<style scoped>
/* デスクトップエラースタイル */
.desktop-error {
  text-align: center;
  padding: var(--space-xl);
}

.desktop-error h2 {
  color: #ef4444;
  margin-bottom: var(--space-md);
}

.desktop-error p {
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--space-lg);
}

.desktop-error-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
}

.error-btn {
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  background: #667eea;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.error-btn:hover {
  background: #5a67d8;
  transform: translateY(-1px);
}

.error-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.error-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
}
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

/* ヒーローセクションのスタイルは AppHeader.vue に移動 */

/* アクションボタンのスタイルは NavigationActions.vue に移動 */

/* 情報セクション・カード・機能リストのスタイルは FeatureShowcase.vue に移動 */

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
   言語切り替えコンテナ
   ================================= */

.language-switcher-container {
  position: fixed;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: var(--z-fixed);
}

@media (max-width: 640px) {
  .language-switcher-container {
    top: var(--space-md);
    right: var(--space-md);
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