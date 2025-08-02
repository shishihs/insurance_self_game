/**
 * 最適化されたセキュリティシステム初期化
 * パフォーマンスを考慮した軽量版
 */

import { initializeSecurity } from './security-extensions'
import { SecurityInterceptor } from './xss-csrf-protection'
import { CSPManager, SecurityHeaderManager } from './csp-manager'
import { SecurityAuditLogger } from './security-audit-logger'
import { secureLocalStorage } from './security'
import { integratedSecuritySystem } from './integrated-security-system'

// パフォーマンス最適化のための設定
const PERFORMANCE_CONFIG = {
  enableDetailedChecks: !import.meta.env.PROD,
  lightCheckInterval: 5 * 60 * 1000, // 5分
  detailedCheckInterval: 15 * 60 * 1000, // 15分
  memoryWarningThreshold: 85, // 85%でワーニング
  maxEventListeners: 10, // イベントリスナーの最大数
  useRequestIdleCallback: true // requestIdleCallbackを使用
}

/**
 * メインセキュリティシステムの初期化（最適化版）
 */
export async function initializeSecuritySystemOptimized(): Promise<void> {
  try {
    console.log('🛡️ 統合セキュリティシステムを初期化中...')

    // 統合セキュリティシステムの初期化（最適化設定）
    await integratedSecuritySystem.initialize({
      enableAPIProtection: true,
      enableRateLimiting: true,
      enableSessionManagement: false, // ゲームアプリでは通常不要
      enableSecureErrorHandling: true,
      enableInputValidation: true,
      enableAuditLogging: true,
      enableRealTimeMonitoring: true,
      securityLevel: import.meta.env.PROD ? 'high' : 'medium',
      autoBlock: import.meta.env.PROD,
      alertThreshold: import.meta.env.PROD ? 10 : 50
    })

    // レガシーサポート: 既存の個別初期化も実行
    initializeSecurity()

    const cspManager = CSPManager.getInstance()
    const headerManager = SecurityHeaderManager.getInstance()
    
    cspManager.initialize()
    headerManager.initializeSecurityHeaders()

    const securityInterceptor = SecurityInterceptor.getInstance()
    securityInterceptor.initialize()

    // 4. 監査ログシステムの初期化
    const auditLogger = SecurityAuditLogger.getInstance()
    
    // セキュリティシステム初期化完了をログ
    await auditLogger.logSecurityEvent(
      'security_system_initialized',
      'low',
      'security_init',
      'セキュリティシステムが正常に初期化されました（最適化版）',
      {
        timestamp: new Date().toISOString(),
        config: PERFORMANCE_CONFIG
      }
    )

    // 5. セキュリティ設定の検証
    await validateSecurityConfiguration()

    // 6. 最適化されたセキュリティイベントリスナーの設定
    setupOptimizedSecurityEventListeners()

    // 7. 最適化された定期的なセキュリティチェックの開始
    startOptimizedPeriodicSecurityChecks()

    // セキュリティシステムの状態確認
    const securityStatus = await integratedSecuritySystem.getSecurityStatus()
    console.log('🛡️ セキュリティシステム状態:', {
      健全性: securityStatus.systemHealth,
      アクティブ脅威: securityStatus.activeThreats,
      コンポーネント状態: securityStatus.componentStatus
    })

    console.log('✅ 統合セキュリティシステムの初期化が完了しました（最適化版）')

  } catch (error) {
    console.error('❌ 統合セキュリティシステム初期化に失敗:', error)
    
    // フォールバック: 基本セキュリティ機能のみ設定
    console.warn('⚠️ 基本セキュリティモードで起動します')
    try {
      initializeSecurity()
      const cspManager = CSPManager.getInstance()
      cspManager.initialize()
      console.log('✅ 基本セキュリティモードで初期化完了')
    } catch (fallbackError) {
      console.error('❌ 基本セキュリティ初期化も失敗:', fallbackError)
      setupFallbackSecurity()
    }
    
    throw new Error(`統合セキュリティシステム初期化失敗: ${error instanceof Error ? error.message : String(error)}`)
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
    await storage.removeItem('__security_test__')
  } catch (error) {
    issues.push(`セキュアストレージのテストに失敗: ${error}`)
  }

  if (issues.length > 0) {
    await auditLogger.logSecurityEvent(
      'security_configuration_issues',
      'medium',
      'security_validator',
      'セキュリティ設定に問題があります',
      { issues }
    )
  }
}

/**
 * 最適化されたセキュリティイベントリスナーの設定
 */
function setupOptimizedSecurityEventListeners(): void {
  const auditLogger = SecurityAuditLogger.getInstance()
  
  // デバウンスヘルパー関数
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout | null = null
    return (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  }

  // スロットルヘルパー関数
  const throttle = <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean = false
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => { inThrottle = false }, limit)
      }
    }
  }

  // フォーカス/ブラー イベントの監視（デバウンス付き）
  const handleVisibilityChange = debounce(async () => {
    await auditLogger.logSecurityEvent(
      document.hidden ? 'tab_hidden' : 'tab_visible',
      'low',
      'visibility_monitor',
      document.hidden ? 'タブが非アクティブになりました' : 'タブがアクティブになりました'
    )
  }, 1000)

  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 本番環境のみの監視
  if (import.meta.env.PROD) {
    // 右クリック禁止（スロットル付き）
    const handleContextMenu = throttle(async (event: MouseEvent) => {
      event.preventDefault()
      await auditLogger.logSecurityEvent(
        'context_menu_blocked',
        'low',
        'context_menu_blocker',
        '右クリックメニューがブロックされました'
      )
    }, 5000) // 5秒に1回まで

    document.addEventListener('contextmenu', handleContextMenu)

    // 危険なキーボードショートカットの監視（スロットル付き）
    const handleKeyDown = throttle(async (event: KeyboardEvent) => {
      const dangerousShortcuts = [
        { key: 'F12' },
        { key: 'I', ctrlKey: true, shiftKey: true },
        { key: 'J', ctrlKey: true, shiftKey: true },
        { key: 'U', ctrlKey: true },
        { key: 'S', ctrlKey: true, shiftKey: true },
      ]

      const isDangerous = dangerousShortcuts.some(shortcut => {
        return event.key === shortcut.key &&
               (!shortcut.ctrlKey || event.ctrlKey) &&
               (!shortcut.shiftKey || event.shiftKey)
      })

      if (isDangerous) {
        event.preventDefault()
        await auditLogger.logSecurityEvent(
          'dangerous_shortcut_blocked',
          'medium',
          'keyboard_monitor',
          `危険なキーボードショートカットがブロックされました: ${event.key}`
        )
      }
    }, 3000) // 3秒に1回まで

    document.addEventListener('keydown', handleKeyDown)
  }

  // LocalStorageの変更監視（デバウンス付き）
  const handleStorageChange = debounce(async (event: StorageEvent) => {
    await auditLogger.logSecurityEvent(
      'storage_changed',
      'low',
      'storage_monitor',
      'LocalStorage/SessionStorageが変更されました',
      {
        key: event.key,
        storageArea: event.storageArea === localStorage ? 'localStorage' : 'sessionStorage'
      }
    )
  }, 2000)

  window.addEventListener('storage', handleStorageChange)
}

/**
 * 最適化された定期的なセキュリティチェック
 */
function startOptimizedPeriodicSecurityChecks(): void {
  const auditLogger = SecurityAuditLogger.getInstance()
  
  // チェック実行状態を管理
  const checkState = {
    isLightCheckRunning: false,
    isDetailedCheckRunning: false,
    lastLightCheck: 0,
    lastDetailedCheck: 0
  }

  // 軽量チェック関数
  const performLightweightCheck = async () => {
    if (checkState.isLightCheckRunning) return
    checkState.isLightCheckRunning = true

    try {
      // メモリ使用量チェック（高速）
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100

        if (usage > PERFORMANCE_CONFIG.memoryWarningThreshold) {
          await auditLogger.logSecurityEvent(
            'high_memory_usage',
            'medium',
            'periodic_check',
            `メモリ使用率が高いです: ${usage.toFixed(1)}%`
          )
        }
      }

      checkState.lastLightCheck = Date.now()
    } catch (error) {
      console.warn('軽量セキュリティチェック中にエラー:', error)
    } finally {
      checkState.isLightCheckRunning = false
    }
  }

  // 詳細チェック関数
  const performDetailedCheck = async () => {
    if (checkState.isDetailedCheckRunning) return
    checkState.isDetailedCheckRunning = true

    try {
      // DOM の異常な変更チェック
      const scriptTags = document.querySelectorAll('script[src]')
      const externalScripts = Array.from(scriptTags).filter(script => {
        const src = script.getAttribute('src')
        return src && !src.startsWith(window.location.origin) && !src.startsWith('/')
      })

      if (externalScripts.length > 5) {
        await auditLogger.logSecurityEvent(
          'excessive_external_scripts',
          'medium',
          'periodic_check',
          `過度の外部スクリプトが検出されました: ${externalScripts.length}個`
        )
      }

      // LocalStorage のサイズチェック
      let localStorageSize = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          localStorageSize += localStorage.getItem(key)?.length || 0
        }
      }

      if (localStorageSize > 5 * 1024 * 1024) { // 5MB
        await auditLogger.logSecurityEvent(
          'excessive_localstorage_usage',
          'low',
          'periodic_check',
          `LocalStorageの使用量が多いです: ${(localStorageSize / 1024 / 1024).toFixed(2)}MB`
        )
      }

      checkState.lastDetailedCheck = Date.now()
    } catch (error) {
      console.warn('詳細セキュリティチェック中にエラー:', error)
    } finally {
      checkState.isDetailedCheckRunning = false
    }
  }

  // requestIdleCallbackを使用したスケジューリング
  const scheduleCheck = (checkFunc: () => Promise<void>, interval: number) => {
    const runCheck = () => {
      if (PERFORMANCE_CONFIG.useRequestIdleCallback && 'requestIdleCallback' in window) {
        requestIdleCallback(() => {
          checkFunc().then(() => {
            setTimeout(runCheck, interval)
          })
        }, { timeout: interval / 2 })
      } else {
        setTimeout(() => {
          checkFunc().then(() => {
            setTimeout(runCheck, interval)
          })
        }, interval)
      }
    }
    
    // 初回実行を遅延
    setTimeout(runCheck, 60000) // 1分後に開始
  }

  // チェックのスケジューリング
  scheduleCheck(performLightweightCheck, PERFORMANCE_CONFIG.lightCheckInterval)
  scheduleCheck(performDetailedCheck, PERFORMANCE_CONFIG.detailedCheckInterval)
}

/**
 * フォールバックセキュリティの設定
 */
function setupFallbackSecurity(): void {
  console.warn('⚠️ フォールバックセキュリティモードで動作しています')
  
  // 最低限のCSPを設定
  const meta = document.createElement('meta')
  meta.httpEquiv = 'Content-Security-Policy'
  meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  document.head.appendChild(meta)
  
  // 基本的なXSS保護
  const originalInnerHTML = Element.prototype.innerHTML
  Object.defineProperty(Element.prototype, 'innerHTML', {
    set(value: string) {
      if (typeof value === 'string') {
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
}

// 開発環境でのデバッグ支援
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__SECURITY_DEBUG__ = {
    init: initializeSecuritySystemOptimized,
    integrated: {
      getStatus: async () => integratedSecuritySystem.getSecurityStatus(),
      generateReport: async (hours = 1) => integratedSecuritySystem.generateSecurityReport(
        new Date(Date.now() - hours * 60 * 60 * 1000),
        new Date()
      ),
      updateConfig: (config: any) => { integratedSecuritySystem.updateConfig(config); }
    },
    config: PERFORMANCE_CONFIG
  }
  
  console.log('🔧 セキュリティデバッグツールが利用可能です:')
  console.log('   window.__SECURITY_DEBUG__.integrated.getStatus() - システム状態の確認')
  console.log('   window.__SECURITY_DEBUG__.integrated.generateReport() - セキュリティレポート生成')
  console.log('   window.__SECURITY_DEBUG__.integrated.updateConfig(config) - 設定の更新')
}

// エクスポート
export { integratedSecuritySystem }
export default initializeSecuritySystemOptimized