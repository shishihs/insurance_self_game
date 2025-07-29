import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './style.css'
import './styles/design-system.css'
import './styles/micro-interactions.css'
import './styles/brand-elements.css'
import App from './App.vue'

// セキュリティシステムの初期化
import { initializeSecurity } from '@/utils/security-extensions'

// エラーハンドリングシステムの初期化
import { GlobalErrorHandler } from '@/utils/error-handling/ErrorHandler'

// PWA Service Worker の登録
import { registerServiceWorker } from '@/pwa/registerServiceWorker'

// リップルエフェクトの初期化
import { initAutoRipple } from '@/utils/ripple-effect'

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

// UI エンハンスメントの初期化
initAutoRipple()

// Service Worker の登録
registerServiceWorker({
  onSuccess: (registration) => {
    console.log('PWA: Service Worker 登録成功', registration)
  },
  onUpdate: (registration) => {
    console.log('PWA: 新しいバージョンが利用可能です', registration)
    // ユーザーに更新を通知（実装は別途）
  },
  onOffline: () => {
    console.log('PWA: オフラインモード')
  },
  onOnline: () => {
    console.log('PWA: オンラインに復帰')
  },
  onError: (error) => {
    console.error('PWA: Service Worker エラー', error)
    errorHandler.handleError({
      message: 'Service Worker 登録エラー',
      stack: error.stack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      severity: 'medium',
      category: 'pwa'
    })
  }
})

// 開発環境でのデバッグ用
if (import.meta.env.DEV) {
  (window as any).__errorHandler = errorHandler
  console.log('エラーハンドリングシステムが有効化されました')
  console.log('エラー統計を確認: window.__errorHandler.getErrorStats()')
}