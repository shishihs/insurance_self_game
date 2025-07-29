/**
 * Service Worker の登録と管理
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onOffline?: () => void
  onOnline?: () => void
  onError?: (error: Error) => void
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false
  private refreshing = false
  
  /**
   * Service Worker を登録
   */
  async register(config: ServiceWorkerConfig = {}): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker is not supported')
      return
    }
    
    try {
      // Service Worker の登録
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      })
      
      this.registration = registration
      console.log('Service Worker registered:', registration)
      
      // 登録成功時のコールバック
      if (config.onSuccess) {
        config.onSuccess(registration)
      }
      
      // 更新チェック
      this.checkForUpdates(registration, config)
      
      // オンライン/オフライン状態の監視
      this.setupNetworkListeners(config)
      
      // ページ更新の処理
      this.setupRefreshListener()
      
      // 定期的な更新チェック（1時間ごと）
      setInterval(() => {
        registration.update()
      }, 60 * 60 * 1000)
      
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      if (config.onError) {
        config.onError(error as Error)
      }
    }
  }
  
  /**
   * Service Worker の更新チェック
   */
  private checkForUpdates(registration: ServiceWorkerRegistration, config: ServiceWorkerConfig): void {
    // インストール中の Service Worker
    if (registration.installing) {
      this.trackInstalling(registration.installing, config)
    }
    
    // 待機中の Service Worker
    if (registration.waiting) {
      this.updateAvailable = true
      if (config.onUpdate) {
        config.onUpdate(registration)
      }
    }
    
    // 更新が見つかった時
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (newWorker) {
        this.trackInstalling(newWorker, config)
      }
    })
  }
  
  /**
   * インストール中の Service Worker を追跡
   */
  private trackInstalling(worker: ServiceWorker, config: ServiceWorkerConfig): void {
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        // 新しい Service Worker が利用可能
        this.updateAvailable = true
        if (config.onUpdate) {
          config.onUpdate(this.registration!)
        }
      }
    })
  }
  
  /**
   * ネットワーク状態のリスナーを設定
   */
  private setupNetworkListeners(config: ServiceWorkerConfig): void {
    window.addEventListener('online', () => {
      console.log('Network: Online')
      if (config.onOnline) {
        config.onOnline()
      }
    })
    
    window.addEventListener('offline', () => {
      console.log('Network: Offline')
      if (config.onOffline) {
        config.onOffline()
      }
    })
  }
  
  /**
   * ページ更新のリスナーを設定
   */
  private setupRefreshListener(): void {
    // Service Worker からのメッセージを受信
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (this.refreshing) return
      this.refreshing = true
      window.location.reload()
    })
  }
  
  /**
   * Service Worker を更新
   */
  async update(): Promise<void> {
    if (!this.registration) return
    
    try {
      await this.registration.update()
      
      if (this.registration.waiting) {
        // 待機中の Service Worker に切り替えを指示
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    } catch (error) {
      console.error('Service Worker update failed:', error)
    }
  }
  
  /**
   * キャッシュをクリア
   */
  async clearCache(): Promise<void> {
    if (!navigator.serviceWorker.controller) return
    
    navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })
    
    // ブラウザキャッシュもクリア
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      )
    }
  }
  
  /**
   * Service Worker の登録を解除
   */
  async unregister(): Promise<void> {
    if (!this.registration) return
    
    try {
      const success = await this.registration.unregister()
      if (success) {
        console.log('Service Worker unregistered')
        this.registration = null
      }
    } catch (error) {
      console.error('Service Worker unregistration failed:', error)
    }
  }
  
  /**
   * 更新が利用可能かどうか
   */
  isUpdateAvailable(): boolean {
    return this.updateAvailable
  }
  
  /**
   * オフライン対応かどうか
   */
  isOfflineReady(): boolean {
    return this.registration !== null && this.registration.active !== null
  }
}

// シングルトンインスタンス
const serviceWorkerManager = new ServiceWorkerManager()

/**
 * Service Worker を登録（エクスポート関数）
 */
export async function registerServiceWorker(config: ServiceWorkerConfig = {}): Promise<void> {
  // 開発環境では Service Worker を無効化
  if (import.meta.env.DEV) {
    console.log('Service Worker is disabled in development')
    return
  }
  
  // window.onload を待つ
  window.addEventListener('load', () => {
    serviceWorkerManager.register(config)
  })
}

/**
 * Service Worker を更新
 */
export async function updateServiceWorker(): Promise<void> {
  await serviceWorkerManager.update()
}

/**
 * キャッシュをクリア
 */
export async function clearServiceWorkerCache(): Promise<void> {
  await serviceWorkerManager.clearCache()
}

/**
 * Service Worker の登録を解除
 */
export async function unregisterServiceWorker(): Promise<void> {
  await serviceWorkerManager.unregister()
}

/**
 * 更新が利用可能かチェック
 */
export function isUpdateAvailable(): boolean {
  return serviceWorkerManager.isUpdateAvailable()
}

/**
 * オフライン対応かチェック
 */
export function isOfflineReady(): boolean {
  return serviceWorkerManager.isOfflineReady()
}