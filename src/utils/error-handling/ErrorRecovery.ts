/**
 * エラーリカバリーシステム
 * エラーから自動的に回復を試みる
 */

import type { ErrorInfo } from './ErrorHandler'

export interface RecoveryStrategy {
  name: string
  description: string
  condition: (error: ErrorInfo) => boolean
  recover: (error: ErrorInfo) => Promise<boolean>
  maxRetries?: number
  retryDelay?: number
  priority?: number // 高いほど優先
  prerequisites?: string[] // 前提条件となる戦略
  rollback?: () => Promise<void> // 失敗時のロールバック
  healthCheck?: () => Promise<boolean> // 復旧後の健全性チェック
}

export interface RecoveryResult {
  success: boolean
  strategyUsed?: string
  attemptsCount: number
  error?: Error
}

export class ErrorRecovery {
  private readonly strategies: RecoveryStrategy[] = []
  private readonly recoveryAttempts = new Map<string, number>()
  private recoveryHistory: Array<{
    timestamp: number
    errorInfo: ErrorInfo
    result: RecoveryResult
  }> = []
  private readonly maxHistorySize = 100

  private gameStateBackup: any = null
  private performanceBaseline: { memory: number; timing: number } | null = null
  private lastCleanupTime = 0
  private readonly CLEANUP_INTERVAL = 60000 // 1分間隔
  private isCleaningUp = false
  
  constructor() {
    this.registerDefaultStrategies()
    this.initializePerformanceBaseline()
  }

  /**
   * パフォーマンスベースラインを初期化
   */
  private initializePerformanceBaseline(): void {
    try {
      const memory = (performance as any).memory?.usedJSHeapSize || 0
      const timing = performance.now()
      this.performanceBaseline = { memory, timing }
    } catch (error) {
      console.warn('[Recovery] Failed to initialize performance baseline:', error)
    }
  }

  /**
   * デフォルトのリカバリー戦略を登録
   */
  private registerDefaultStrategies(): void {
    // ネットワークエラーのリカバリー
    this.registerStrategy({
      name: 'network-retry',
      description: 'ネットワーク接続の再試行と復旧',
      condition: (error) => 
        error.category === 'network' || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network'),
      recover: async (error) => {
        console.log('[Recovery] Attempting network recovery...')
        
        // ネットワーク状態の診斧
        const networkStatus = await this.diagnoseNetworkStatus()
        
        if (networkStatus.isOffline) {
          await this.waitForOnline(30000) // 30秒タイムアウト
        }
        
        // DNSキャッシュのクリアを試みる
        await this.clearDNSCache()
        
        // 持続的な問題の場合はオフラインモードに切り替え
        if (this.getRecoveryAttempts('network-retry') >= 2) {
          return await this.enableOfflineMode()
        }
        
        return networkStatus.isOnline
      },
      maxRetries: 3,
      retryDelay: 2000,
      priority: 8,
      healthCheck: async () => this.checkNetworkHealth()
    })

    // メモリ不足エラーのリカバリー
    this.registerStrategy({
      name: 'memory-cleanup',
      description: 'メモリの最適化とクリーンアップ',
      condition: (error) => 
        error.message.includes('out of memory') ||
        error.message.includes('Maximum call stack') ||
        error.category === 'performance',
      recover: async (error) => {
        // クリーンアップが進行中または最近実行された場合はスキップ
        const now = Date.now()
        if (this.isCleaningUp || now - this.lastCleanupTime < this.CLEANUP_INTERVAL) {
          console.log('[Recovery] Memory cleanup already in progress or recently completed')
          return false
        }
        
        this.isCleaningUp = true
        this.lastCleanupTime = now
        
        try {
          console.log('[Recovery] Attempting memory cleanup...')
          
          const initialMemory = this.getCurrentMemoryUsage()
          
          // 段階的なメモリクリーンアップを実行
          await this.performMemoryCleanup()
          
          const finalMemory = this.getCurrentMemoryUsage()
          const memoryReduced = initialMemory - finalMemory
          
          console.log(`[Recovery] Memory cleanup completed. Reduced: ${(memoryReduced / 1024 / 1024).toFixed(1)}MB`)
          
          // 十分なメモリが解放されたかチェック
          return memoryReduced > 5 * 1024 * 1024 // 5MB以上で成功（闾値を下げる）
        } finally {
          this.isCleaningUp = false
        }
      },
      maxRetries: 2,
      retryDelay: 1000,
      priority: 7,
      healthCheck: async () => this.checkMemoryHealth()
    })

    // Vueコンポーネントエラーのリカバリー
    this.registerStrategy({
      name: 'vue-component-remount',
      description: 'Vueコンポーネントの再マウントと状態復旧',
      condition: (error) => error.category === 'vue',
      recover: async (error) => {
        console.log('[Recovery] Attempting Vue component recovery...')
        
        // コンポーネント固有のリカバリーを試みる
        const componentName = error.component || 'unknown'
        
        // コンポーネントの状態をバックアップ
        await this.backupComponentState(componentName)
        
        // コンポーネントの再マウント
        const remountEvent = new CustomEvent('app:remount-component', {
          detail: { 
            component: componentName,
            preserveState: true,
            errorId: error.fingerprint
          }
        })
        window.dispatchEvent(remountEvent)
        
        // 再マウントの完了を待つ
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 状態を復元
        await this.restoreComponentState(componentName)
        
        return true
      },
      maxRetries: 2,
      retryDelay: 1000,
      priority: 6,
      rollback: async () => {
        // 復旧に失敗した場合はページをリロード
        console.log('[Recovery] Vue recovery failed, reloading page')
        location.reload()
      }
    })

    // ローカルストレージエラーのリカバリー
    this.registerStrategy({
      name: 'storage-cleanup',
      condition: (error) => 
        error.message.includes('QuotaExceededError') ||
        error.message.includes('storage'),
      recover: async () => {
        console.log('[Recovery] Attempting storage cleanup...')
        
        // 古いデータを削除
        this.cleanupLocalStorage()
        
        return true
      },
      maxRetries: 1
    })

    // ゲーム状態のリカバリー
    this.registerStrategy({
      name: 'game-state-recovery',
      description: 'ゲーム状態のバックアップからの復旧',
      condition: (error) => 
        error.category === 'game' ||
        error.message.includes('game') ||
        error.message.includes('state'),
      recover: async (error) => {
        console.log('[Recovery] Attempting game state recovery...')
        
        // ゲーム状態のバックアップから復旧
        const recovered = await this.restoreGameState()
        
        if (recovered) {
          // ゲームの再初期化をトリガー
          const reinitEvent = new CustomEvent('app:reinitialize-game', {
            detail: { reason: 'error-recovery', errorId: error.fingerprint }
          })
          window.dispatchEvent(reinitEvent)
          
          return true
        }
        
        return false
      },
      maxRetries: 1,
      priority: 9,
      prerequisites: ['memory-cleanup'],
      rollback: async () => {
        // ゲーム状態の復旧に失敗した場合は新しいゲームを始める
        const newGameEvent = new CustomEvent('app:start-new-game', {
          detail: { reason: 'recovery-failed' }
        })
        window.dispatchEvent(newGameEvent)
      }
    })

    // 非同期エラーのリカバリー
    this.registerStrategy({
      name: 'async-retry',
      description: '非同期処理の再試行',
      condition: (error) => 
        error.category === 'async' &&
        !error.message.includes('Network'),
      recover: async (error) => {
        console.log('[Recovery] Attempting async operation retry...')
        
        // 指数バックオフで再試行
        const attempt = this.getRecoveryAttempts('async-retry')
        const delay = Math.min(1000 * 2**attempt, 10000)
        
        await new Promise(resolve => setTimeout(resolve, delay))
        
        // アプリケーションに再試行を通知
        const retryEvent = new CustomEvent('app:retry-async-operation', {
          detail: { 
            originalError: error,
            attempt: attempt + 1
          }
        })
        window.dispatchEvent(retryEvent)
        
        return true
      },
      maxRetries: 3,
      retryDelay: 1000,
      priority: 4
    })

    // セキュリティエラーのリカバリー
    this.registerStrategy({
      name: 'security-fallback',
      description: 'セキュリティ制限を回避するフォールバック',
      condition: (error) => 
        error.category === 'security' ||
        error.message.includes('CORS') ||
        error.message.includes('blocked'),
      recover: async (error) => {
        console.log('[Recovery] Attempting security fallback...')
        
        // 安全なフォールバックモードに切り替え
        const fallbackEvent = new CustomEvent('app:enable-security-fallback', {
          detail: { reason: error.message }
        })
        window.dispatchEvent(fallbackEvent)
        
        return true
      },
      maxRetries: 1,
      priority: 5
    })
  }

  /**
   * リカバリー戦略を登録
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    // プライオリティによるソートで挿入
    const priority = strategy.priority || 0
    const insertIndex = this.strategies.findIndex(s => (s.priority || 0) < priority)
    
    if (insertIndex === -1) {
      this.strategies.push(strategy)
    } else {
      this.strategies.splice(insertIndex, 0, strategy)
    }
  }

  /**
   * エラーからの回復を試みる
   */
  async tryRecover(errorInfo: ErrorInfo): Promise<RecoveryResult> {
    console.log('[Recovery] Attempting recovery for error:', errorInfo.message)
    
    // 適用可能な戦略を探す
    for (const strategy of this.strategies) {
      if (strategy.condition(errorInfo)) {
        const attempts = this.getRecoveryAttempts(strategy.name)
        const maxRetries = strategy.maxRetries || 1
        
        if (attempts >= maxRetries) {
          console.log(`[Recovery] Max retries reached for strategy: ${strategy.name}`)
          continue
        }
        
        try {
          // リトライ遅延
          if (attempts > 0 && strategy.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, strategy.retryDelay))
          }
          
          // リカバリー実行
          this.incrementRecoveryAttempts(strategy.name)
          const success = await strategy.recover()
          
          const result: RecoveryResult = {
            success,
            strategyUsed: strategy.name,
            attemptsCount: attempts + 1
          }
          
          // 履歴に記録
          this.addToHistory(errorInfo, result)
          
          if (success) {
            console.log(`[Recovery] Successfully recovered using strategy: ${strategy.name}`)
            this.resetRecoveryAttempts(strategy.name)
          }
          
          return result
        } catch (error) {
          console.error(`[Recovery] Strategy ${strategy.name} failed:`, error)
          
          const result: RecoveryResult = {
            success: false,
            strategyUsed: strategy.name,
            attemptsCount: attempts + 1,
            error: error as Error
          }
          
          this.addToHistory(errorInfo, result)
          return result
        }
      }
    }
    
    // 適用可能な戦略がない
    const result: RecoveryResult = {
      success: false,
      attemptsCount: 0
    }
    
    this.addToHistory(errorInfo, result)
    return result
  }

  /**
   * オンラインになるまで待機
   */
  private async waitForOnline(timeout = 30000): Promise<void> {
    if (navigator.onLine) return
    
    return new Promise((resolve) => {
      const handler = () => {
        window.removeEventListener('online', handler)
        resolve()
      }
      
      window.addEventListener('online', handler)
      
      // タイムアウト設定
      setTimeout(() => {
        window.removeEventListener('online', handler)
        resolve()
      }, timeout)
    })
  }

  /**
   * イベントリスナーのクリーンアップ
   */
  private cleanupEventListeners(): void {
    // カスタムイベントのクリーンアップフラグを送信
    const event = new CustomEvent('app:cleanup-listeners')
    window.dispatchEvent(event)
  }

  /**
   * キャッシュのクリア
   */
  private clearCaches(): void {
    // セッションストレージのクリア（一時的なデータ）
    try {
      sessionStorage.clear()
    } catch (e) {
      console.error('[Recovery] Failed to clear session storage:', e)
    }
    
    // メモリ内のキャッシュをクリア
    const event = new CustomEvent('app:clear-caches')
    window.dispatchEvent(event)
  }

  /**
   * ローカルストレージのクリーンアップ
   */
  private cleanupLocalStorage(): void {
    try {
      const keysToRemove: string[] = []
      const now = Date.now()
      
      // 期限切れのデータを探す
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        
        try {
          const value = localStorage.getItem(key)
          if (!value) continue
          
          const data = JSON.parse(value)
          if (data.expiry && data.expiry < now) {
            keysToRemove.push(key)
          }
        } catch {
          // JSON解析に失敗した場合はスキップ
        }
      }
      
      // 期限切れデータを削除
      keysToRemove.forEach(key => { localStorage.removeItem(key); })
      
      // それでも容量が足りない場合は古いゲームデータを削除
      if (keysToRemove.length === 0) {
        const gameDataKeys = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('game_')) {
            gameDataKeys.push(key)
          }
        }
        
        // 最も古いデータを削除
        if (gameDataKeys.length > 0) {
          localStorage.removeItem(gameDataKeys[0])
        }
      }
    } catch (e) {
      console.error('[Recovery] Failed to cleanup local storage:', e)
    }
  }

  /**
   * リカバリー試行回数を取得
   */
  private getRecoveryAttempts(strategyName: string): number {
    return this.recoveryAttempts.get(strategyName) || 0
  }

  /**
   * リカバリー試行回数を増加
   */
  private incrementRecoveryAttempts(strategyName: string): void {
    const current = this.getRecoveryAttempts(strategyName)
    this.recoveryAttempts.set(strategyName, current + 1)
  }

  /**
   * リカバリー試行回数をリセット
   */
  private resetRecoveryAttempts(strategyName: string): void {
    this.recoveryAttempts.delete(strategyName)
  }

  /**
   * 履歴に追加
   */
  private addToHistory(errorInfo: ErrorInfo, result: RecoveryResult): void {
    this.recoveryHistory.push({
      timestamp: Date.now(),
      errorInfo,
      result
    })
    
    // 履歴サイズ制限
    if (this.recoveryHistory.length > this.maxHistorySize) {
      this.recoveryHistory = this.recoveryHistory.slice(-this.maxHistorySize)
    }
  }

  /**
   * リカバリー統計を取得
   */
  getStatistics() {
    const successful = this.recoveryHistory.filter(h => h.result.success).length
    const failed = this.recoveryHistory.filter(h => !h.result.success).length
    const byStrategy = new Map<string, { success: number; failed: number }>()
    
    this.recoveryHistory.forEach(h => {
      if (h.result.strategyUsed) {
        const stats = byStrategy.get(h.result.strategyUsed) || { success: 0, failed: 0 }
        if (h.result.success) {
          stats.success++
        } else {
          stats.failed++
        }
        byStrategy.set(h.result.strategyUsed, stats)
      }
    })
    
    return {
      total: this.recoveryHistory.length,
      successful,
      failed,
      successRate: this.recoveryHistory.length > 0 ? successful / this.recoveryHistory.length : 0,
      byStrategy: Object.fromEntries(byStrategy),
      currentAttempts: Object.fromEntries(this.recoveryAttempts)
    }
  }

  /**
   * ネットワーク状態の診断
   */
  private async diagnoseNetworkStatus(): Promise<{
    isOnline: boolean
    isOffline: boolean
    latency?: number
    bandwidth?: string
  }> {
    const isOnline = navigator.onLine
    
    if (!isOnline) {
      return { isOnline: false, isOffline: true }
    }
    
    try {
      // 軽量な接続テスト
      const startTime = performance.now()
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      const latency = performance.now() - startTime
      
      const connection = (navigator as any).connection
      const bandwidth = connection?.effectiveType || 'unknown'
      
      return {
        isOnline: response.ok,
        isOffline: !response.ok,
        latency,
        bandwidth
      }
    } catch (error) {
      return { isOnline: false, isOffline: true }
    }
  }

  /**
   * DNSキャッシュのクリア
   */
  private async clearDNSCache(): Promise<void> {
    // ブラウザでできる範囲でDNSキャッシュをクリア
    try {
      // Service Workerにキャッシュクリアを依頼
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_DNS_CACHE'
        })
      }
    } catch (error) {
      console.warn('[Recovery] Could not clear DNS cache:', error)
    }
  }

  /**
   * オフラインモードの有効化
   */
  private async enableOfflineMode(): Promise<boolean> {
    try {
      const offlineEvent = new CustomEvent('app:enable-offline-mode', {
        detail: { reason: 'network-recovery-failed' }
      })
      window.dispatchEvent(offlineEvent)
      return true
    } catch (error) {
      console.error('[Recovery] Failed to enable offline mode:', error)
      return false
    }
  }

  /**
   * ネットワーク健全性チェック
   */
  private async checkNetworkHealth(): Promise<boolean> {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      })
      return response.ok
    } catch {
      return navigator.onLine
    }
  }

  /**
   * 現在のメモリ使用量を取得
   */
  private getCurrentMemoryUsage(): number {
    try {
      return (performance as any).memory?.usedJSHeapSize || 0
    } catch {
      return 0
    }
  }

  /**
   * 段階的なメモリクリーンアップを実行
   */
  private async performMemoryCleanup(): Promise<void> {
    // requestIdleCallbackのpolyfill
    const scheduleTask = (callback: () => void, options?: { timeout?: number }) => {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, options)
      } else {
        setTimeout(callback, options?.timeout || 0)
      }
    }
    
    // 段階1: 軽量なクリーンアップ
    this.clearCaches()
    await new Promise(resolve => setTimeout(resolve, 10)) // 待機時間を短縮
    
    // 段階2: イベントリスナーのクリーンアップ
    this.cleanupEventListeners()
    await new Promise(resolve => setTimeout(resolve, 10)) // 待機時間を短縮
    
    // 段階3: DOM要素の削除（非同期実行）
    scheduleTask(() => this.cleanupDOMElements(), { timeout: 1000 })
    
    // 段階4: 強制ガベージコレクション
    if ('gc' in window) {
      scheduleTask(() => (window as any).gc(), { timeout: 500 })
    }
    
    // 段階5: メモリリークの検出と修正（低優先度）
    scheduleTask(() => this.detectAndFixMemoryLeaks(), { timeout: 2000 })
  }

  /**
   * DOM要素のクリーンアップ
   */
  private async cleanupDOMElements(): Promise<void> {
    // 非表示の要素や不要な要素を削除
    const hiddenElements = document.querySelectorAll('[style*="display: none"]')
    hiddenElements.forEach(el => {
      if (el.parentNode && !el.hasAttribute('data-keep')) {
        el.parentNode.removeChild(el)
      }
    })
    
    // 古いログ要素を削除
    const logElements = document.querySelectorAll('[data-log-entry]')
    if (logElements.length > 100) {
      const toRemove = Array.from(logElements).slice(0, logElements.length - 50)
      toRemove.forEach(el => { el.remove(); })
    }
  }

  /**
   * メモリリークの検出と修正
   */
  private async detectAndFixMemoryLeaks(): Promise<void> {
    // 循環参照の検出と修正（簡易版）
    const memoryLeakEvent = new CustomEvent('app:detect-memory-leaks')
    window.dispatchEvent(memoryLeakEvent)
    
    // タイマーの整理
    this.cleanupOrphanedTimers()
  }

  /**
   * 孤立したタイマーのクリーンアップ
   */
  private cleanupOrphanedTimers(): void {
    // この実装は限定的ですが、アプリケーションに通知を送ることで
    // 各コンポーネントが自身のタイマーをクリーンアップできます
    const timerCleanupEvent = new CustomEvent('app:cleanup-timers')
    window.dispatchEvent(timerCleanupEvent)
  }

  /**
   * メモリ健全性チェック
   */
  private async checkMemoryHealth(): Promise<boolean> {
    const currentMemory = this.getCurrentMemoryUsage()
    if (!this.performanceBaseline || currentMemory === 0) {
      return true // 測定できない場合は健全とみなす
    }
    
    const memoryIncrease = currentMemory - this.performanceBaseline.memory
    const criticalThreshold = 100 * 1024 * 1024 // 100MB
    
    return memoryIncrease < criticalThreshold
  }

  /**
   * コンポーネント状態のバックアップ
   */
  private async backupComponentState(componentName: string): Promise<void> {
    const backupEvent = new CustomEvent('app:backup-component-state', {
      detail: { component: componentName }
    })
    window.dispatchEvent(backupEvent)
  }

  /**
   * コンポーネント状態の復元
   */
  private async restoreComponentState(componentName: string): Promise<void> {
    const restoreEvent = new CustomEvent('app:restore-component-state', {
      detail: { component: componentName }
    })
    window.dispatchEvent(restoreEvent)
  }

  /**
   * ゲーム状態の復旧
   */
  private async restoreGameState(): Promise<boolean> {
    try {
      // ローカルストレージからの復旧を試みる
      const savedState = localStorage.getItem('game_state_backup')
      if (savedState) {
        const gameState = JSON.parse(savedState)
        
        const restoreEvent = new CustomEvent('app:restore-game-state', {
          detail: { state: gameState, source: 'backup' }
        })
        window.dispatchEvent(restoreEvent)
        
        return true
      }
      
      // 自動保存からの復旧を試みる
      const autoSave = localStorage.getItem('game_autosave')
      if (autoSave) {
        const gameState = JSON.parse(autoSave)
        
        const restoreEvent = new CustomEvent('app:restore-game-state', {
          detail: { state: gameState, source: 'autosave' }
        })
        window.dispatchEvent(restoreEvent)
        
        return true
      }
      
      return false
    } catch (error) {
      console.error('[Recovery] Failed to restore game state:', error)
      return false
    }
  }

  /**
   * 前提条件の戦略をチェック
   */
  private async checkPrerequisites(strategy: RecoveryStrategy): Promise<boolean> {
    if (!strategy.prerequisites || strategy.prerequisites.length === 0) {
      return true
    }
    
    for (const prerequisite of strategy.prerequisites) {
      const prerequisiteStrategy = this.strategies.find(s => s.name === prerequisite)
      if (!prerequisiteStrategy) {
        continue
      }
      
      // 前提条件の戦略を実行
      try {
        const result = await prerequisiteStrategy.recover(
          {} as ErrorInfo // ダミーのエラー情報
        )
        if (!result) {
          console.log(`[Recovery] Prerequisite ${prerequisite} failed`)
          return false
        }
      } catch (error) {
        console.error(`[Recovery] Prerequisite ${prerequisite} threw error:`, error)
        return false
      }
    }
    
    return true
  }

  /**
   * 高度なリカバリー実行（前提条件とヘルスチェック付き）
   */
  async tryAdvancedRecover(errorInfo: ErrorInfo): Promise<RecoveryResult> {
    // パフォーマンス関連エラーはログレベルを下げる
    if (errorInfo.category === 'performance') {
      console.debug('[Recovery] Starting advanced recovery for performance error')
    } else {
      console.log('[Recovery] Starting advanced recovery for error:', errorInfo.message)
    }
    
    // 優先度順にソートされた戦略を取得
    const sortedStrategies = [...this.strategies].sort((a, b) => 
      (b.priority || 0) - (a.priority || 0)
    )
    
    for (const strategy of sortedStrategies) {
      if (strategy.condition(errorInfo)) {
        const attempts = this.getRecoveryAttempts(strategy.name)
        const maxRetries = strategy.maxRetries || 1
        
        if (attempts >= maxRetries) {
          console.log(`[Recovery] Max retries reached for strategy: ${strategy.name}`)
          continue
        }
        
        // 前提条件をチェック
        const prerequisitesMet = await this.checkPrerequisites(strategy)
        if (!prerequisitesMet) {
          console.log(`[Recovery] Prerequisites not met for strategy: ${strategy.name}`)
          continue
        }
        
        try {
          // リトライ遅延
          if (attempts > 0 && strategy.retryDelay) {
            await new Promise(resolve => setTimeout(resolve, strategy.retryDelay))
          }
          
          // リカバリー実行
          this.incrementRecoveryAttempts(strategy.name)
          const success = await strategy.recover(errorInfo)
          
          // ヘルスチェック
          let healthCheckPassed = true
          if (success && strategy.healthCheck) {
            healthCheckPassed = await strategy.healthCheck()
            if (!healthCheckPassed) {
              console.log(`[Recovery] Health check failed for strategy: ${strategy.name}`)
            }
          }
          
          const result: RecoveryResult = {
            success: success && healthCheckPassed,
            strategyUsed: strategy.name,
            attemptsCount: attempts + 1
          }
          
          // 履歴に記録
          this.addToHistory(errorInfo, result)
          
          if (result.success) {
            console.log(`[Recovery] Successfully recovered using strategy: ${strategy.name}`)
            this.resetRecoveryAttempts(strategy.name)
            return result
          } if (strategy.rollback) {
            // ロールバック実行
            console.log(`[Recovery] Rolling back strategy: ${strategy.name}`)
            await strategy.rollback()
          }
          
          return result
        } catch (error) {
          console.error(`[Recovery] Strategy ${strategy.name} failed:`, error)
          
          if (strategy.rollback) {
            try {
              await strategy.rollback()
            } catch (rollbackError) {
              console.error(`[Recovery] Rollback failed for ${strategy.name}:`, rollbackError)
            }
          }
          
          const result: RecoveryResult = {
            success: false,
            strategyUsed: strategy.name,
            attemptsCount: attempts + 1,
            error: error as Error
          }
          
          this.addToHistory(errorInfo, result)
          return result
        }
      }
    }
    
    // 適用可能な戦略がない
    const result: RecoveryResult = {
      success: false,
      attemptsCount: 0
    }
    
    this.addToHistory(errorInfo, result)
    return result
  }

  /**
   * クリーンアップ
   */
  clear(): void {
    this.recoveryAttempts.clear()
    this.recoveryHistory = []
    this.gameStateBackup = null
    this.performanceBaseline = null
  }
}