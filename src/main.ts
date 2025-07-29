import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './style.css'
import App from './App.vue'

// セキュリティシステムの初期化
import { initializeSecurity } from '@/utils/security-extensions'

// エラーハンドリングシステムの初期化
import { GlobalErrorHandler } from '@/utils/error-handling/ErrorHandler'

// グローバルエラーハンドラーを設定
const errorHandler = GlobalErrorHandler.getInstance({
  enableLogging: true,
  enableReporting: import.meta.env.PROD,
  enableRecovery: true,
  logToConsole: import.meta.env.DEV,
  showUserNotification: true,
  maxErrorsPerMinute: 20
})

// グローバルハンドラーを設定（window.onerror, unhandledrejection）
errorHandler.setupGlobalHandlers()

// Vueアプリケーションを作成
const app = createApp(App)

// Vueエラーハンドラーを設定
errorHandler.setupVueErrorHandler(app)

// セキュリティシステムを起動
try {
  initializeSecurity()
} catch (error) {
  console.error('セキュリティシステムの初期化に失敗しました:', error)
  // エラーハンドラーに報告
  errorHandler.handleError({
    message: 'セキュリティシステムの初期化に失敗',
    stack: (error as Error).stack,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    severity: 'high',
    category: 'system'
  })
}

// アプリケーションをマウント
app.mount('#app')

// 開発環境でのデバッグ用
if (import.meta.env.DEV) {
  (window as any).__errorHandler = errorHandler
  console.log('エラーハンドリングシステムが有効化されました')
  console.log('エラー統計を確認: window.__errorHandler.getErrorStats()')
}