<script setup lang="ts">
import { computed, onErrorCaptured, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'

interface Props {
  fallback?: 'minimal' | 'detailed' | 'custom'
  onError?: (error: Error, instance: ComponentPublicInstance | null, info: string) => void
  canRecover?: boolean
  recoveryMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  fallback: 'detailed',
  canRecover: true,
  recoveryMessage: 'エラーから回復するには、ページを再読み込みしてください'
})

// 開発環境フラグ
const isDev = import.meta.env.DEV

const emit = defineEmits<{
  error: [error: Error, info: string]
  recover: []
}>()

const hasError = ref(false)
const error = ref<Error | null>(null)
const errorInfo = ref<string>('')
const errorCount = ref(0)
const isRecovering = ref(false)

// エラーの深刻度を判定
const errorSeverity = computed(() => {
  if (!error.value) return 'low'
  
  const message = error.value.message.toLowerCase()
  if (message.includes('cannot read') || message.includes('undefined')) {
    return 'high'
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'medium'
  }
  return 'low'
})

// エラーメッセージのユーザーフレンドリー版
const userFriendlyMessage = computed(() => {
  if (!error.value) return ''
  
  const message = error.value.message
  
  // より詳細なエラーパターンのマッピング
  if (message.includes('dynamically imported module') || message.includes('Failed to fetch')) {
    return 'アプリの一部が読み込めませんでした。インターネット接続を確認してください'
  }
  if (message.includes('Network') || message.includes('fetch')) {
    return 'ネットワーク接続に問題が発生しました'
  }
  if (message.includes('Cannot read') || message.includes('Cannot access')) {
    return '画面の表示中にエラーが発生しました'
  }
  if (message.includes('undefined') || message.includes('null')) {
    return 'データの読み込みに失敗しました'
  }
  if (message.includes('timeout')) {
    return '処理がタイムアウトしました。もう一度お試しください'
  }
  if (message.includes('Permission denied') || message.includes('CORS')) {
    return 'アクセス権限がありません'
  }
  
  return '予期しないエラーが発生しました'
})

// エラーをキャプチャ
onErrorCaptured((err: Error, instance: ComponentPublicInstance | null, info: string) => {
  console.error('[ErrorBoundary] Caught error:', err)
  console.error('[ErrorBoundary] Error info:', info)
  console.error('[ErrorBoundary] Component instance:', instance)
  
  hasError.value = true
  error.value = err
  errorInfo.value = info
  errorCount.value++
  
  // カスタムエラーハンドラーを呼び出し
  if (props.onError) {
    props.onError(err, instance, info)
  }
  
  // エラーイベントを発火
  emit('error', err, info)
  
  // エラーの伝播を止める
  return false
})

// エラーから回復を試みる
const tryRecover = async () => {
  isRecovering.value = true
  
  try {
    // コンポーネントの状態をリセット
    hasError.value = false
    error.value = null
    errorInfo.value = ''
    
    // リカバリーイベントを発火
    emit('recover')
    
    // 少し待ってから回復完了
    await new Promise(resolve => setTimeout(resolve, 100))
  } catch (e) {
    console.error('[ErrorBoundary] Recovery failed:', e)
    hasError.value = true
  } finally {
    isRecovering.value = false
  }
}

// ページをリロード
const reloadPage = () => {
  window.location.reload()
}

// エラー詳細をクリップボードにコピー
const copyErrorDetails = async () => {
  if (!error.value) return
  
  const details = `
エラー: ${error.value.message}
スタック: ${error.value.stack || 'N/A'}
情報: ${errorInfo.value}
時刻: ${new Date().toISOString()}
ユーザーエージェント: ${navigator.userAgent}
  `.trim()
  
  try {
    await navigator.clipboard.writeText(details)
    alert('エラー詳細をクリップボードにコピーしました')
  } catch (e) {
    console.error('Failed to copy error details:', e)
  }
}

// エラーレポートを送信
const sendErrorReport = () => {
  if (!error.value) return
  
  // エラーレポート送信のイベントを発火
  const event = new CustomEvent('app:send-error-report', {
    detail: {
      error: error.value,
      info: errorInfo.value,
      component: 'ErrorBoundary'
    }
  })
  window.dispatchEvent(event)
  
  alert('エラーレポートを送信しました')
}
</script>

<template>
  <div v-if="hasError" class="error-boundary" :data-severity="errorSeverity">
    <!-- ミニマルフォールバック -->
    <div v-if="fallback === 'minimal'" class="error-minimal">
      <p class="error-message">エラーが発生しました</p>
      <button class="error-action-btn" @click="reloadPage">
        ページを再読み込み
      </button>
    </div>
    
    <!-- 詳細フォールバック -->
    <div v-else-if="fallback === 'detailed'" class="error-detailed">
      <div class="error-icon" aria-hidden="true">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke-width="2"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke-width="2"/>
        </svg>
      </div>
      
      <h2 class="error-title">エラーが発生しました</h2>
      <p class="error-user-message">{{ userFriendlyMessage }}</p>
      
      <div class="error-actions">
        <button 
          v-if="canRecover && !isRecovering" 
          class="error-action-btn primary"
          :disabled="errorCount > 3"
          @click="tryRecover"
        >
          {{ errorCount > 3 ? '回復できません' : '回復を試みる' }}
        </button>
        
        <button 
          class="error-action-btn secondary" 
          @click="reloadPage"
        >
          ページを再読み込み
        </button>
      </div>
      
      <!-- エラー詳細（開発環境のみ） -->
      <details v-if="isDev" class="error-details">
        <summary>エラー詳細（開発者向け）</summary>
        <div class="error-technical">
          <p><strong>エラーメッセージ:</strong> {{ error?.message }}</p>
          <p><strong>エラー情報:</strong> {{ errorInfo }}</p>
          <p><strong>エラー回数:</strong> {{ errorCount }}</p>
          <pre v-if="error?.stack" class="error-stack">{{ error.stack }}</pre>
          
          <div class="error-dev-actions">
            <button class="error-action-btn small" @click="copyErrorDetails">
              詳細をコピー
            </button>
            <button class="error-action-btn small" @click="sendErrorReport">
              レポート送信
            </button>
          </div>
        </div>
      </details>
    </div>
    
    <!-- カスタムフォールバック -->
    <div v-else-if="fallback === 'custom'" class="error-custom">
      <slot name="error" :error="error" :retry="tryRecover" :reload="reloadPage" />
    </div>
  </div>
  
  <!-- 正常時は子コンポーネントを表示 -->
  <slot v-else />
</template>

<style scoped>
.error-boundary {
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-xl);
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 12px;
  margin: var(--space-md);
}

.error-boundary[data-severity="high"] {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.4);
}

.error-boundary[data-severity="medium"] {
  background: rgba(245, 158, 11, 0.05);
  border-color: rgba(245, 158, 11, 0.2);
}

/* ミニマルスタイル */
.error-minimal {
  text-align: center;
}

.error-message {
  margin-bottom: var(--space-md);
  color: rgba(239, 68, 68, 1);
  font-weight: 500;
}

/* 詳細スタイル */
.error-detailed {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.error-icon {
  color: rgba(239, 68, 68, 0.8);
  margin-bottom: var(--space-lg);
}

.error-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: rgba(239, 68, 68, 1);
  margin-bottom: var(--space-sm);
}

.error-user-message {
  font-size: var(--text-lg);
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: var(--space-xl);
}

.error-actions {
  display: flex;
  gap: var(--space-md);
  justify-content: center;
  flex-wrap: wrap;
}

.error-action-btn {
  padding: var(--space-sm) var(--space-lg);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: var(--text-base);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-width: 140px;
  min-height: var(--touch-target-min, 44px); /* モバイルタッチターゲット */
}

.error-action-btn.primary {
  background: rgba(239, 68, 68, 0.9);
  color: white;
}

.error-action-btn.primary:hover:not(:disabled) {
  background: rgba(220, 38, 38, 1);
  transform: translateY(-2px);
}

.error-action-btn.secondary {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(239, 68, 68, 0.5);
}

.error-action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(239, 68, 68, 0.8);
}

.error-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-action-btn.small {
  padding: var(--space-xs) var(--space-sm);
  font-size: var(--text-sm);
  min-width: auto;
}

/* エラー詳細 */
.error-details {
  margin-top: var(--space-xl);
  text-align: left;
  width: 100%;
}

.error-details summary {
  cursor: pointer;
  padding: var(--space-sm);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.7);
  transition: background var(--transition-fast);
}

.error-details summary:hover {
  background: rgba(0, 0, 0, 0.3);
}

.error-technical {
  margin-top: var(--space-md);
  padding: var(--space-md);
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  font-size: var(--text-sm);
}

.error-technical p {
  margin-bottom: var(--space-sm);
  color: rgba(255, 255, 255, 0.8);
}

.error-technical strong {
  color: rgba(255, 255, 255, 0.9);
}

.error-stack {
  margin-top: var(--space-md);
  padding: var(--space-sm);
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  overflow-x: auto;
  font-family: monospace;
  font-size: var(--text-xs);
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

.error-dev-actions {
  margin-top: var(--space-md);
  display: flex;
  gap: var(--space-sm);
}

/* カスタムスタイル */
.error-custom {
  width: 100%;
}

/* レスポンシブ */
@media (max-width: 640px) {
  .error-boundary {
    padding: var(--space-md);
    margin: var(--space-sm);
  }
  
  .error-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .error-action-btn {
    width: 100%;
  }
  
  .error-icon svg {
    width: 48px;
    height: 48px;
  }
  
  .error-title {
    font-size: var(--text-xl);
  }
  
  .error-user-message {
    font-size: var(--text-base);
  }
}

/* アニメーション */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.6; }
  100% { opacity: 1; }
}

.error-boundary[data-severity="high"] .error-icon {
  animation: pulse 2s infinite;
}

/* アクセシビリティ */
@media (prefers-reduced-motion: reduce) {
  .error-boundary .error-icon {
    animation: none;
  }
  
  .error-action-btn {
    transition: none;
  }
}

/* ハイコントラストモード */
@media (prefers-contrast: high) {
  .error-boundary {
    border-width: 2px;
  }
  
  .error-action-btn {
    border: 2px solid currentColor;
  }
}
</style>