<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  error: Error
  errorType?: 'network' | 'dynamic-import' | 'runtime' | 'permission' | 'unknown'
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  errorType: 'unknown',
  showDetails: false
})

const emit = defineEmits<{
  retry: []
  goHome: []
  reportError: [error: Error]
}>()

// エラータイプに基づいたアイコンと色
const errorConfig = computed(() => {
  switch (props.errorType) {
    case 'network':
      return {
        icon: '📡',
        title: 'ネットワークエラー',
        message: 'インターネット接続を確認してください',
        color: 'orange',
        actions: [
          { label: '再接続', action: 'retry', primary: true },
          { label: 'ホームに戻る', action: 'goHome' }
        ]
      }
    case 'dynamic-import':
      return {
        icon: '📦',
        title: '読み込みエラー',
        message: 'コンテンツの読み込みに失敗しました',
        color: 'blue',
        actions: [
          { label: 'もう一度試す', action: 'retry', primary: true },
          { label: 'ホームに戻る', action: 'goHome' }
        ]
      }
    case 'runtime':
      return {
        icon: '⚠️',
        title: 'エラーが発生しました',
        message: 'アプリケーションでエラーが発生しました',
        color: 'red',
        actions: [
          { label: 'ページを再読み込み', action: 'retry', primary: true },
          { label: 'エラーを報告', action: 'reportError' }
        ]
      }
    case 'permission':
      return {
        icon: '🔒',
        title: 'アクセス拒否',
        message: 'このコンテンツへのアクセス権限がありません',
        color: 'purple',
        actions: [
          { label: 'ホームに戻る', action: 'goHome', primary: true }
        ]
      }
    default:
      return {
        icon: '❌',
        title: 'エラー',
        message: '問題が発生しました',
        color: 'gray',
        actions: [
          { label: 'もう一度試す', action: 'retry', primary: true },
          { label: 'ホームに戻る', action: 'goHome' }
        ]
      }
  }
})

// トラブルシューティング手順
const troubleshootingSteps = computed(() => {
  switch (props.errorType) {
    case 'network':
      return [
        'Wi-Fi または モバイルデータが有効か確認',
        '機内モードがオフになっているか確認',
        'ブラウザを完全に閉じて再度開く',
        '他のウェブサイトが開けるか確認'
      ]
    case 'dynamic-import':
      return [
        'ブラウザの更新ボタンをタップ',
        'ブラウザのキャッシュをクリア',
        'プライベートブラウジングモードで試す',
        '異なるブラウザで試す'
      ]
    default:
      return [
        'アプリを完全に終了して再起動',
        'デバイスを再起動',
        'アプリの最新版を確認'
      ]
  }
})

const handleAction = (action: string) => {
  switch (action) {
    case 'retry':
      emit('retry')
      break
    case 'goHome':
      emit('goHome')
      break
    case 'reportError':
      emit('reportError', props.error)
      break
  }
}

const reloadPage = () => {
  window.location.reload()
}
</script>

<template>
  <div class="mobile-error-handler" :data-error-type="errorType">
    <div class="error-content">
      <!-- エラーアイコン -->
      <div class="error-icon" :class="`error-icon--${errorConfig.color}`">
        <span class="icon-emoji">{{ errorConfig.icon }}</span>
      </div>
      
      <!-- エラーメッセージ -->
      <div class="error-messages">
        <h2 class="error-title">{{ errorConfig.title }}</h2>
        <p class="error-message">{{ errorConfig.message }}</p>
      </div>
      
      <!-- アクションボタン -->
      <div class="error-actions">
        <button
          v-for="action in errorConfig.actions"
          :key="action.label"
          @click="handleAction(action.action)"
          :class="['action-btn', { 'action-btn--primary': action.primary }]"
        >
          {{ action.label }}
        </button>
      </div>
      
      <!-- トラブルシューティング -->
      <details class="troubleshooting">
        <summary class="troubleshooting-toggle">
          <span>解決方法を見る</span>
          <svg class="toggle-icon" width="20" height="20" viewBox="0 0 20 20">
            <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </summary>
        <div class="troubleshooting-content">
          <h3 class="troubleshooting-title">お試しください：</h3>
          <ol class="troubleshooting-steps">
            <li v-for="(step, index) in troubleshootingSteps" :key="index">
              {{ step }}
            </li>
          </ol>
          <button @click="reloadPage" class="action-btn action-btn--text">
            ページを強制的に再読み込み
          </button>
        </div>
      </details>
      
      <!-- エラー詳細（開発モードのみ） -->
      <details v-if="showDetails && error" class="error-details">
        <summary class="details-toggle">技術的な詳細</summary>
        <div class="details-content">
          <p class="error-name">{{ error.name }}</p>
          <p class="error-technical-message">{{ error.message }}</p>
        </div>
      </details>
    </div>
  </div>
</template>

<style scoped>
.mobile-error-handler {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-lg);
  background: var(--bg-primary, #1a1a2e);
}

.error-content {
  width: 100%;
  max-width: 400px;
  text-align: center;
}

/* エラーアイコン */
.error-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto var(--space-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.error-icon--red {
  background: rgba(239, 68, 68, 0.2);
}

.error-icon--orange {
  background: rgba(251, 146, 60, 0.2);
}

.error-icon--blue {
  background: rgba(59, 130, 246, 0.2);
}

.error-icon--purple {
  background: rgba(147, 51, 234, 0.2);
}

.error-icon--gray {
  background: rgba(156, 163, 175, 0.2);
}

.icon-emoji {
  font-size: 60px;
  line-height: 1;
}

/* エラーメッセージ */
.error-messages {
  margin-bottom: var(--space-xl);
}

.error-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: white;
  margin-bottom: var(--space-sm);
}

.error-message {
  font-size: var(--text-lg);
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.5;
}

/* アクションボタン */
.error-actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  margin-bottom: var(--space-xl);
}

.action-btn {
  width: 100%;
  min-height: 56px; /* モバイル向け大きめのタッチターゲット */
  padding: var(--space-md) var(--space-lg);
  border: none;
  border-radius: 12px;
  font-size: var(--text-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.action-btn--primary:active {
  transform: scale(0.98);
}

.action-btn:not(.action-btn--primary) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.action-btn:not(.action-btn--primary):active {
  background: rgba(255, 255, 255, 0.15);
}

.action-btn--text {
  background: none;
  border: none;
  color: rgba(129, 140, 248, 1);
  text-decoration: underline;
  min-height: 44px;
}

/* トラブルシューティング */
.troubleshooting {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: var(--space-md);
  margin-bottom: var(--space-lg);
}

.troubleshooting-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-sm);
  cursor: pointer;
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
  list-style: none;
}

.troubleshooting-toggle::-webkit-details-marker {
  display: none;
}

.toggle-icon {
  transition: transform var(--transition-fast);
}

details[open] .toggle-icon {
  transform: rotate(180deg);
}

.troubleshooting-content {
  margin-top: var(--space-md);
  text-align: left;
}

.troubleshooting-title {
  font-size: var(--text-base);
  font-weight: 600;
  color: white;
  margin-bottom: var(--space-sm);
}

.troubleshooting-steps {
  margin: 0 0 var(--space-md) var(--space-lg);
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
}

.troubleshooting-steps li {
  margin-bottom: var(--space-xs);
}

/* エラー詳細 */
.error-details {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  padding: var(--space-sm);
  text-align: left;
}

.details-toggle {
  cursor: pointer;
  color: rgba(255, 255, 255, 0.6);
  font-size: var(--text-sm);
  padding: var(--space-xs);
}

.details-content {
  margin-top: var(--space-sm);
  font-size: var(--text-sm);
  color: rgba(255, 255, 255, 0.6);
  font-family: monospace;
}

.error-name {
  font-weight: 600;
  margin-bottom: var(--space-xs);
}

.error-technical-message {
  word-break: break-word;
}

/* レスポンシブ - より小さい画面 */
@media (max-width: 375px) {
  .mobile-error-handler {
    padding: var(--space-md);
  }
  
  .error-icon {
    width: 100px;
    height: 100px;
  }
  
  .icon-emoji {
    font-size: 48px;
  }
  
  .error-title {
    font-size: var(--text-xl);
  }
  
  .error-message {
    font-size: var(--text-base);
  }
  
  .action-btn {
    font-size: var(--text-base);
    min-height: 48px;
  }
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .action-btn,
  .toggle-icon {
    transition: none;
  }
}

/* ハイコントラストモード */
@media (prefers-contrast: high) {
  .action-btn {
    border: 2px solid currentColor;
  }
  
  .error-icon {
    border: 2px solid white;
  }
}
</style>