/**
 * エラーリカバリーシステム
 * エラーから自動的に回復を試みる
 */

import type { ErrorInfo } from './ErrorHandler'

export interface RecoveryStrategy {
  name: string
  condition: (error: ErrorInfo) => boolean
  recover: () => Promise<boolean>
  maxRetries?: number
  retryDelay?: number
}

export interface RecoveryResult {
  success: boolean
  strategyUsed?: string
  attemptsCount: number
  error?: Error
}

export class ErrorRecovery {
  private strategies: RecoveryStrategy[] = []
  private recoveryAttempts = new Map<string, number>()
  private recoveryHistory: Array<{
    timestamp: number
    errorInfo: ErrorInfo
    result: RecoveryResult
  }> = []
  private maxHistorySize = 100

  constructor() {
    this.registerDefaultStrategies()
  }

  /**
   * デフォルトのリカバリー戦略を登録
   */
  private registerDefaultStrategies(): void {
    // ネットワークエラーのリカバリー
    this.registerStrategy({
      name: 'network-retry',
      condition: (error) => 
        error.category === 'network' || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network'),
      recover: async () => {
        console.log('[Recovery] Attempting network recovery...')
        
        // オフライン状態をチェック
        if (!navigator.onLine) {
          // オンラインになるまで待機
          await this.waitForOnline()
        }
        
        // ページのリロード（最終手段）
        if (this.getRecoveryAttempts('network-retry') >= 3) {
          console.log('[Recovery] Reloading page due to persistent network issues')
          location.reload()
          return true
        }
        
        return true
      },
      maxRetries: 3,
      retryDelay: 1000
    })

    // メモリ不足エラーのリカバリー
    this.registerStrategy({
      name: 'memory-cleanup',
      condition: (error) => 
        error.message.includes('out of memory') ||
        error.message.includes('Maximum call stack'),
      recover: async () => {
        console.log('[Recovery] Attempting memory cleanup...')
        
        // ガベージコレクションの強制実行を試みる
        if ('gc' in window) {
          (window as any).gc()
        }
        
        // 不要なイベントリスナーをクリーンアップ
        this.cleanupEventListeners()
        
        // キャッシュをクリア
        this.clearCaches()
        
        return true
      },
      maxRetries: 1
    })

    // Vueコンポーネントエラーのリカバリー
    this.registerStrategy({
      name: 'vue-component-remount',
      condition: (error) => error.category === 'vue',
      recover: async () => {
        console.log('[Recovery] Attempting Vue component recovery...')
        
        // コンポーネントの再マウントを試みる
        const event = new CustomEvent('app:remount-component', {
          detail: { component: error.component }
        })
        window.dispatchEvent(event)
        
        return true
      },
      maxRetries: 2,
      retryDelay: 500
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

    // 非同期エラーのリカバリー
    this.registerStrategy({
      name: 'async-retry',
      condition: (error) => 
        error.category === 'async' &&
        !error.message.includes('Network'),
      recover: async () => {
        console.log('[Recovery] Attempting async operation retry...')
        
        // 少し待ってから再試行
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        return true
      },
      maxRetries: 2,
      retryDelay: 1000
    })
  }

  /**
   * リカバリー戦略を登録
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy)
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
      keysToRemove.forEach(key => localStorage.removeItem(key))
      
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
   * クリーンアップ
   */
  clear(): void {
    this.recoveryAttempts.clear()
    this.recoveryHistory = []
  }
}