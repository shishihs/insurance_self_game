import { createApp } from 'vue'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import './style.css'
import './styles/design-system.css'
import './styles/micro-interactions.css'
import './styles/brand-elements.css'
import './styles/rtl-support.css'
import App from './App.vue'

// 国際化システムの導入
import i18n from './i18n'

// セキュリティシステムの初期化
import { initializeSecuritySystem } from '@/utils/security-init'

// エラーハンドリングシステムの初期化
import { ErrorHandlingPlugin, errorHandlingSystem } from '@/utils/error-handling'

// PWA Service Worker の登録
import { registerServiceWorker } from '@/pwa/registerServiceWorker'

// リップルエフェクトの初期化
import { initAutoRipple } from '@/utils/ripple-effect'

// Vueアプリケーションを作成
const app = createApp(App)

// 国際化システムを統合
app.use(i18n)

// エラーハンドリングシステムをプラグインとして統合
app.use(ErrorHandlingPlugin, {
  enableLogging: true,
  enableReporting: import.meta.env.PROD,
  enableRecovery: true,
  enableUserNotifications: true,
  logToConsole: import.meta.env.DEV,
  reportToServer: import.meta.env.PROD,
  maxErrorsPerMinute: 20,
  environment: import.meta.env.MODE as any,
  buildVersion: import.meta.env.VITE_BUILD_VERSION,
  reportEndpoint: import.meta.env.VITE_ERROR_REPORT_ENDPOINT,
  reportApiKey: import.meta.env.VITE_ERROR_REPORT_API_KEY,
  onError: (errorInfo) => {
    console.log('[App] Error reported:', errorInfo.message)
  },
  onRecovery: (success, strategy) => {
    console.log(`[App] Recovery ${success ? 'succeeded' : 'failed'}${strategy ? ` using ${strategy}` : ''}`)
  },
  onAlert: (type, data) => {
    console.warn(`[App] Alert: ${type}`, data)
  }
})

// アプリケーション初期化とマウント
async function initializeApp() {
  try {
    // セキュリティシステムを起動
    await initializeSecuritySystem()
    console.log('🛡️ セキュリティシステムが正常に初期化されました')
    
    // アプリケーションをマウント
    app.mount('#app')
    
  } catch (error) {
    console.error('アプリケーション初期化に失敗しました:', error)
    // エラーハンドラーに報告
    errorHandlingSystem.reportError(
      error as Error,
      { component: 'app-initialization' },
      'system'
    )
    
    // フォールバック: セキュリティなしでアプリケーションをマウント
    console.warn('⚠️ セキュリティシステムなしでアプリケーションを起動します')
    app.mount('#app')
  }
}

// アプリケーション初期化を実行
initializeApp()

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
    errorHandlingSystem.reportError(
      error,
      { component: 'service-worker' },
      'system'
    )
  }
})

// 開発環境でのデバッグ用
if (import.meta.env.DEV) {
  (window as any).__errorHandling = errorHandlingSystem
  console.log('🚨 エラーハンドリングシステムが有効化されました')
  console.log('📊 エラー統計を確認: window.__errorHandling.getStatistics()')
  console.log('🩺 健全性を確認: window.__errorHandling.getHealthStatus()')
  console.log('🔍 デバッグ情報を収集: window.__errorHandling.collectDebugInfo()')
}