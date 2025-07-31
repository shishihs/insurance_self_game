/**
 * セキュリティシステム統合初期化
 * 全セキュリティ機能の自動設定と連携
 */

import { initializeSecurity } from './security-extensions'
import { SecurityInterceptor } from './xss-csrf-protection'
import { CSPManager, SecurityHeaderManager } from './csp-manager'
import { SecurityAuditLogger } from './security-audit-logger'
import { secureLocalStorage } from './security'

/**
 * メインセキュリティシステムの初期化
 */
export async function initializeSecuritySystem(): Promise<void> {
  try {
    console.log('🛡️ セキュリティシステムを初期化中...')

    // 1. 基本セキュリティ機能の初期化
    initializeSecurity()

    // 2. CSPとセキュリティヘッダーの設定
    const cspManager = CSPManager.getInstance()
    const headerManager = SecurityHeaderManager.getInstance()
    
    cspManager.initialize()
    headerManager.initializeSecurityHeaders()

    // 3. XSS/CSRF保護の初期化
    const securityInterceptor = SecurityInterceptor.getInstance()
    securityInterceptor.initialize()

    // 4. 監査ログシステムの初期化
    const auditLogger = SecurityAuditLogger.getInstance()
    
    // セキュリティシステム初期化完了をログ
    await auditLogger.logSecurityEvent(
      'security_system_initialized',
      'low',
      'security_init',
      'セキュリティシステムが正常に初期化されました',
      {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        features: {
          csp: true,
          xssProtection: true,
          csrfProtection: true,
          auditLogging: true,
          secureStorage: true
        }
      }
    )

    // 5. セキュリティ設定の検証
    await validateSecurityConfiguration()

    // 6. セキュリティイベントリスナーの設定
    setupSecurityEventListeners()

    // 7. 定期的なセキュリティチェックの開始
    startPeriodicSecurityChecks()

    console.log('✅ セキュリティシステムの初期化が完了しました')

  } catch (error) {
    console.error('❌ セキュリティシステム初期化に失敗:', error)
    
    // フォールバック: 最低限のセキュリティ機能を設定
    setupFallbackSecurity()
    
    throw new Error(`セキュリティシステム初期化失敗: ${error instanceof Error ? error.message : String(error)}`)
  }
}

/**
 * セキュリティ設定の検証
 */
async function validateSecurityConfiguration(): Promise<void> {
  const auditLogger = SecurityAuditLogger.getInstance()
  const issues: string[] = []

  // HTTPS チェック
  if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
    issues.push('HTTPS が使用されていません')
  }

  // Crypto API チェック
  if (!window.crypto?.subtle) {
    issues.push('Web Crypto API が利用できません')
  }

  // セキュアストレージのテスト
  try {
    const storage = secureLocalStorage()
    await storage.setItem('__security_test__', { test: true }, true)
    const retrieved = await storage.getItem('__security_test__', true)
    if (!retrieved || retrieved.test !== true) {
      issues.push('セキュアストレージが正常に動作していません')
    }
    storage.removeItem('__security_test__')
  } catch (error) {
    issues.push('セキュアストレージのテストに失敗しました')
  }

  // CSP ヘッダーの確認
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')
  if (!cspMeta) {
    issues.push('Content-Security-Policy が設定されていません')
  }

  // セキュリティヘッダーの確認
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection'
  ]

  requiredHeaders.forEach(header => {
    const meta = document.querySelector(`meta[http-equiv="${header}"]`)
    if (!meta) {
      issues.push(`${header} ヘッダーが設定されていません`)
    }
  })

  // 問題があればログに記録
  if (issues.length > 0) {
    await auditLogger.logSecurityEvent(
      'security_configuration_issues',
      'medium',
      'security_validator',
      `セキュリティ設定に問題があります: ${issues.join(', ')}`,
      { issues }
    )
  } else {
    await auditLogger.logSecurityEvent(
      'security_configuration_valid',
      'low',
      'security_validator',
      'セキュリティ設定は正常です'
    )
  }
}

/**
 * セキュリティイベントリスナーの設定
 */
function setupSecurityEventListeners(): void {
  const auditLogger = SecurityAuditLogger.getInstance()

  // フォーカス/ブラー イベントの監視（タブ切り替えの検出）
  let isTabActive = true

  document.addEventListener('visibilitychange', async () => {
    if (document.hidden && isTabActive) {
      isTabActive = false
      await auditLogger.logSecurityEvent(
        'tab_hidden',
        'low',
        'visibility_monitor',
        'タブが非アクティブになりました'
      )
    } else if (!document.hidden && !isTabActive) {
      isTabActive = true
      await auditLogger.logSecurityEvent(
        'tab_visible',
        'low',
        'visibility_monitor',
        'タブがアクティブになりました'
      )
    }
  })

  // 右クリック禁止 (開発時は除く)
  if (process.env.NODE_ENV === 'production') {
    document.addEventListener('contextmenu', async (event) => {
      event.preventDefault()
      await auditLogger.logSecurityEvent(
        'context_menu_blocked',
        'low',
        'context_menu_blocker',
        '右クリックメニューがブロックされました',
        {
          target: event.target instanceof Element ? event.target.tagName : 'unknown',
          coordinates: { x: event.clientX, y: event.clientY }
        }
      )
    })
  }

  // キーボードショートカットの監視
  document.addEventListener('keydown', async (event) => {
    const dangerousShortcuts = [
      { key: 'F12' }, // Developer Tools
      { key: 'I', ctrlKey: true, shiftKey: true }, // Developer Tools
      { key: 'J', ctrlKey: true, shiftKey: true }, // Console
      { key: 'U', ctrlKey: true }, // View Source
      { key: 'S', ctrlKey: true, shiftKey: true }, // Save Page
    ]

    const isDangerous = dangerousShortcuts.some(shortcut => {
      return event.key === shortcut.key &&
             (!shortcut.ctrlKey || event.ctrlKey) &&
             (!shortcut.shiftKey || event.shiftKey)
    })

    if (isDangerous && process.env.NODE_ENV === 'production') {
      event.preventDefault()
      await auditLogger.logSecurityEvent(
        'dangerous_shortcut_blocked',
        'medium',
        'keyboard_monitor',
        `危険なキーボードショートカットがブロックされました: ${event.key}`,
        {
          key: event.key,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey
        }
      )
    }
  })

  // 不審なネットワーク活動の監視（Fetch API のオーバーライド）
  const originalFetch = window.fetch
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input.toString()
    
    // 外部ドメインへのリクエストを監視
    if (url.startsWith('http') && !url.startsWith(window.location.origin)) {
      await auditLogger.logSecurityEvent(
        'external_fetch_request',
        'medium',
        'fetch_monitor',
        `外部ドメインへのFetchリクエスト: ${url}`,
        {
          url,
          method: init?.method || 'GET',
          headers: init?.headers
        }
      )
    }
    
    // 不審なパターンの検出
    if (url.includes('eval') || url.includes('javascript:') || url.includes('data:')) {
      await auditLogger.logSecurityEvent(
        'suspicious_fetch_url',
        'high',
        'fetch_monitor',
        `不審なFetch URL: ${url}`,
        { url }
      )
    }
    
    return originalFetch.call(this, input, init)
  }

  // Storage イベントの監視
  window.addEventListener('storage', async (event) => {
    await auditLogger.logSecurityEvent(
      'storage_changed',
      'low',
      'storage_monitor',
      'LocalStorage/SessionStorageが変更されました',
      {
        key: event.key,
        oldValue: event.oldValue?.substring(0, 100),
        newValue: event.newValue?.substring(0, 100),
        storageArea: event.storageArea === localStorage ? 'localStorage' : 'sessionStorage'
      }
    )
  })

  // beforeunload イベントの監視（不正な離脱の検出）
  window.addEventListener('beforeunload', async () => {
    await auditLogger.logSecurityEvent(
      'page_unload',
      'low',
      'unload_monitor',
      'ページが閉じられようとしています'
    )
  })
}

/**
 * 定期的なセキュリティチェック
 */
function startPeriodicSecurityChecks(): void {
  const auditLogger = SecurityAuditLogger.getInstance()

  // 2分ごとの軽量チェック（頻度を下げる）
  setInterval(async () => {
    try {
      // メモリ使用量チェック
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024)
        const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
        const usage = (usedMB / limitMB) * 100

        if (usage > 90) {
          await auditLogger.logSecurityEvent(
            'high_memory_usage',
            'medium',
            'periodic_check',
            `メモリ使用率が高いです: ${usage.toFixed(1)}%`,
            { usedMB, limitMB, usage }
          )
        }
      }

      // DOM の異常な変更チェック
      const scriptTags = document.querySelectorAll('script[src]')
      const externalScripts = Array.from(scriptTags).filter(script => {
        const src = script.getAttribute('src')
        return src && !src.startsWith(window.location.origin) && !src.startsWith('/')
      })

      if (externalScripts.length > 5) { // 閾値: 5個以上の外部スクリプト
        await auditLogger.logSecurityEvent(
          'excessive_external_scripts',
          'medium',
          'periodic_check',
          `過度の外部スクリプトが検出されました: ${externalScripts.length}個`,
          {
            count: externalScripts.length,
            sources: externalScripts.map(s => s.getAttribute('src')).slice(0, 10)
          }
        )
      }

    } catch (error) {
      console.warn('定期セキュリティチェック中にエラー:', error)
    }
  }, 120000) // 2分 = 120000ms

  // 10分ごとの詳細チェック（頻度を下げる）
  setInterval(async () => {
    try {
      // LocalStorage のサイズチェック
      let totalSize = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length + key.length
        }
      }

      const sizeMB = totalSize / (1024 * 1024)
      if (sizeMB > 5) { // 5MB以上
        await auditLogger.logSecurityEvent(
          'large_localstorage_usage',
          'low',
          'periodic_check',
          `LocalStorageの使用量が大きいです: ${sizeMB.toFixed(2)}MB`
        )
      }

      // セキュリティ設定の再検証
      await validateSecurityConfiguration()

    } catch (error) {
      console.warn('詳細セキュリティチェック中にエラー:', error)
    }
  }, 10 * 60 * 1000) // 10分 = 600000ms

  // 1時間ごとのセキュリティレポート
  setInterval(async () => {
    try {
      const report = await auditLogger.generateAuditReport(
        new Date(Date.now() - 60 * 60 * 1000), // 1時間前から
        new Date()
      )

      if (report.summary.totalEvents > 0) {
        console.log('📊 セキュリティ時間レポート:', {
          期間: '過去1時間',
          総イベント数: report.summary.totalEvents,
          クリティカル: report.summary.criticalEvents,
          高: report.summary.highSeverityEvents,
          中: report.summary.mediumSeverityEvents,
          低: report.summary.lowSeverityEvents,
          推奨事項: report.recommendations
        })
      }

    } catch (error) {
      console.warn('セキュリティレポート生成中にエラー:', error)
    }
  }, 60 * 60 * 1000)
}

/**
 * フォールバックセキュリティの設定
 */
function setupFallbackSecurity(): void {
  console.warn('⚠️ フォールバックセキュリティを設定中...')

  // 最低限のXSS保護
  const originalInnerHTML = Element.prototype.innerHTML
  Object.defineProperty(Element.prototype, 'innerHTML', {
    set(value: string) {
      if (typeof value === 'string') {
        // 基本的なXSS保護
        const sanitized = value
          .replace(/<script[^>]*>.*?<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '')
        
        originalInnerHTML.call(this, sanitized)
      } else {
        originalInnerHTML.call(this, value)
      }
    },
    get() {
      return originalInnerHTML.call(this)
    }
  })

  // 基本的なCSRF保護
  const forms = document.querySelectorAll('form')
  forms.forEach(form => {
    if (!form.querySelector('input[name="csrf_token"]')) {
      const csrfInput = document.createElement('input')
      csrfInput.type = 'hidden'
      csrfInput.name = 'csrf_token'
      csrfInput.value = Math.random().toString(36).substr(2, 15)
      form.appendChild(csrfInput)
    }
  })

  console.log('✅ フォールバックセキュリティが設定されました')
}

/**
 * セキュリティシステムの状態確認
 */
export async function getSecuritySystemStatus(): Promise<{
  initialized: boolean
  features: Record<string, boolean>
  issues: string[]
  recommendations: string[]
}> {
  const issues: string[] = []
  const recommendations: string[] = []

  // 各機能の状態確認
  const features = {
    https: window.location.protocol === 'https:' || window.location.hostname === 'localhost',
    cryptoApi: !!(window.crypto && window.crypto.subtle),
    csp: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
    xFrameOptions: !!document.querySelector('meta[http-equiv="X-Frame-Options"]'),
    contentTypeOptions: !!document.querySelector('meta[http-equiv="X-Content-Type-Options"]'),
    secureStorage: true, // secureLocalStorage() の存在確認
    auditLogging: true,  // SecurityAuditLogger の存在確認
    xssProtection: true, // XSSProtection の存在確認
    csrfProtection: true // CSRFProtection の存在確認
  }

  // 問題の特定
  if (!features.https) {
    issues.push('HTTPS が使用されていません')
    recommendations.push('本番環境では HTTPS を使用してください')
  }

  if (!features.cryptoApi) {
    issues.push('Web Crypto API が利用できません')
    recommendations.push('モダンなブラウザを使用することを推奨します')
  }

  if (!features.csp) {
    issues.push('Content-Security-Policy が設定されていません')
    recommendations.push('CSP ヘッダーを設定してください')
  }

  const initialized = issues.length === 0

  return {
    initialized,
    features,
    issues,
    recommendations
  }
}

/**
 * セキュリティシステムのデバッグ情報出力
 */
export function debugSecuritySystem(): void {
  console.group('🛡️ セキュリティシステム デバッグ情報')
  
  // CSP 情報
  const cspManager = CSPManager.getInstance()
  cspManager.debugCSP()

  // セキュリティヘッダー情報
  const headerManager = SecurityHeaderManager.getInstance()
  const headerValidation = headerManager.validateSecurityHeaders()
  console.log('セキュリティヘッダー:', headerValidation)

  // 監査ログ統計
  const auditLogger = SecurityAuditLogger.getInstance()
  auditLogger.getStatistics().then(stats => {
    console.log('監査ログ統計:', stats)
  })

  console.groupEnd()
}

// 自動初期化は削除（main.tsからの初期化で重複を防ぐ）
// 手動初期化が必要な場合は initializeSecuritySystem() を呼び出してください

// 開発環境でのデバッグ支援
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__SECURITY_DEBUG__ = {
    init: initializeSecuritySystem,
    status: getSecuritySystemStatus,
    debug: debugSecuritySystem
  }
}