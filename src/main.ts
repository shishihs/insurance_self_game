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

// セキュリティシステムの初期化（最適化版を使用）
import { initializeSecuritySystemOptimized as initializeSecuritySystem } from '@/utils/security-init-optimized'
import '@/utils/security/frame-detector' // iframe検出を初期化

// エラーハンドリングシステムの初期化
import { ErrorHandlingPlugin, errorHandlingSystem } from '@/utils/error-handling'

// PWA Service Worker の登録
import { registerServiceWorker } from '@/pwa/registerServiceWorker'

// リップルエフェクトの初期化
import { initAutoRipple } from '@/utils/ripple-effect'

// パフォーマンス監視システム
import performanceMonitor from '@/utils/performance-monitor'

// 遅延読み込みシステム
import { lazyLoader, vLazyLoad } from '@/utils/lazy-loader'

// PWA管理システム
import { pwaManager } from '@/utils/pwa-manager'

// SEO管理システム
import { seoManager } from '@/utils/seo-manager'

// Vueアプリケーションを作成
const app = createApp(App)

// 国際化システムを統合
app.use(i18n)

// Piniaの初期化
import { createPinia } from 'pinia'
const pinia = createPinia()
app.use(pinia)

// 遅延読み込みディレクティブを登録
app.directive('lazy-load', vLazyLoad)

// エラーハンドリングシステムをプラグインとして統合
app.use(ErrorHandlingPlugin, {
  enableLogging: true,
  enableReporting: import.meta.env.PROD,
  enableRecovery: true,
  enableUserNotifications: import.meta.env.DEV, // 本番では通知を無効化
  logToConsole: import.meta.env.DEV,
  reportToServer: false, // サーバー報告を無効化（エンドポイントが未設定のため）
  maxErrorsPerMinute: import.meta.env.PROD ? 5 : 20, // 本番では制限を厳しく
  environment: import.meta.env.MODE as any,
  buildVersion: import.meta.env.VITE_BUILD_VERSION,
  reportEndpoint: import.meta.env.VITE_ERROR_REPORT_ENDPOINT,
  reportApiKey: import.meta.env.VITE_ERROR_REPORT_API_KEY,
  onError: (errorInfo) => {
    // 本番では重要なエラーのみログ出力
    if (import.meta.env.DEV || errorInfo.severity === 'critical' || errorInfo.severity === 'high') {
      console.log('[App] Error reported:', errorInfo.message)
    }
  },
  onRecovery: (success, strategy) => {
    if (import.meta.env.DEV) {
      console.log(`[App] Recovery ${success ? 'succeeded' : 'failed'}${strategy ? ` using ${strategy}` : ''}`)
    }
  },
  onAlert: (type, data) => {
    if (import.meta.env.DEV) {
      console.warn(`[App] Alert: ${type}`, data)
    }
  }
})

// アプリケーション初期化とマウント
async function initializeApp() {
  try {
    // パフォーマンス監視開始
    performanceMonitor.markGameStart()

    // セキュリティシステムを起動
    await initializeSecuritySystem()
    console.log('🛡️ セキュリティシステムが正常に初期化されました')

    // PWAシステムを初期化
    console.log('🚀 PWAシステムを初期化中...')
    // PWA Managerは自動で初期化されるため、状態確認のみ
    const pwaStatus = pwaManager.getStatus()
    console.log('📱 PWA状態:', pwaStatus)

    // SEOシステムを初期化
    console.log('📈 SEOシステムを初期化中...')
    seoManager.updatePageSEO({
      title: '人生充実ゲーム - 保険をテーマにした革新的な一人用ボードゲーム',
      description: '生命保険を「人生の味方」として描く、革新的な一人用デッキ構築ゲーム。アクセシブルで多言語対応、すべての人が楽しめる教育的ゲーム体験を提供します。',
      keywords: ['保険', 'ゲーム', '人生', 'シミュレーション', '一人用', 'ボードゲーム', 'デッキ構築', '戦略', '教育', 'PWA', 'アクセシビリティ'],
      url: 'https://shishihs.github.io/insurance_self_game/',
      image: 'https://shishihs.github.io/insurance_self_game/favicon.ico',
      type: 'game',
      locale: 'ja',
      alternateUrls: {
        'ja': 'https://shishihs.github.io/insurance_self_game/',
        'en': 'https://shishihs.github.io/insurance_self_game/?lang=en',
        'x-default': 'https://shishihs.github.io/insurance_self_game/'
      }
    })

    // パンくずリストを生成
    seoManager.generateBreadcrumbs([
      { name: 'ホーム', url: 'https://shishihs.github.io/insurance_self_game/' },
      { name: 'ゲーム', url: 'https://shishihs.github.io/insurance_self_game/#game' },
      { name: '統計', url: 'https://shishihs.github.io/insurance_self_game/#stats' }
    ])

    console.log('📊 SEO設定が完了しました')

    // アプリケーションをマウント
    app.mount('#app')

    // パフォーマンス監視完了
    performanceMonitor.markGameLoaded()

    // 開発環境でパフォーマンスレポート表示
    if (import.meta.env.DEV) {
      setTimeout(() => {
        console.log(performanceMonitor.generateReport());
      }, 3000);
    }

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
  (window as any).__errorHandling = errorHandlingSystem;
  (window as any).__performanceMonitor = performanceMonitor;
  (window as any).__lazyLoader = lazyLoader;
  (window as any).__pwaManager = pwaManager;
  (window as any).__seoManager = seoManager;

  console.log('🚨 エラーハンドリングシステムが有効化されました')
  console.log('📊 エラー統計を確認: window.__errorHandling.getStatistics()')
  console.log('🩺 健全性を確認: window.__errorHandling.getHealthStatus()')
  console.log('🔍 デバッグ情報を収集: window.__errorHandling.collectDebugInfo()')
  console.log('')
  console.log('⚡ パフォーマンス監視システムが有効化されました')
  console.log('📈 パフォーマンスレポート: window.__performanceMonitor.generateReport()')
  console.log('🎯 パフォーマンススコア: window.__performanceMonitor.getPerformanceScore()')
  console.log('')
  console.log('🚀 遅延読み込みシステムが有効化されました')
  console.log('📦 リソース統計: window.__lazyLoader.getStats()')
  console.log('')
  console.log('📱 PWAシステムが有効化されました')
  console.log('🔍 PWA状態を確認: window.__pwaManager.getStatus()')
  console.log('⚙️ キャッシュ管理: window.__pwaManager.manageCaches()')
  console.log('')
  console.log('📈 SEOシステムが有効化されました')
  console.log('📊 SEOレポート生成: window.__seoManager.generateSEOReport()')
  console.log('🎯 SEOスコア計算: window.__seoManager.calculateSEOScore()')
}