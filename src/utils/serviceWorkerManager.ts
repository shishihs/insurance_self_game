/**
 * Service Worker管理ユーティリティ
 * 
 * 機能:
 * - Service Workerの登録・更新管理
 * - キャッシュの制御
 * - オフライン状態の監視
 * - パフォーマンスモードの連携
 */

export interface CacheInfo {
  [cacheName: string]: {
    entries: number
    estimatedSize: number
  }
}

export interface ServiceWorkerState {
  supported: boolean
  registered: boolean
  updateAvailable: boolean
  isOnline: boolean
  performanceMode: 'low' | 'high'
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateCallback: (() => void) | null = null
  private stateChangeCallback: ((state: ServiceWorkerState) => void) | null = null
  private state: ServiceWorkerState = {
    supported: 'serviceWorker' in navigator,
    registered: false,
    updateAvailable: false,
    isOnline: navigator.onLine,
    performanceMode: 'high'
  }

  constructor() {
    this.setupOnlineListener()
  }

  /**
   * Service Workerの登録
   */
  async register(): Promise<boolean> {
    if (!this.state.supported) {
      console.warn('[SW Manager] Service Worker not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/',
        updateViaCache: 'none' // 常に最新版をチェック
      })

      console.log('[SW Manager] Service Worker registered successfully')
      this.state.registered = true
      this.setupUpdateListener()
      this.setupMessageListener()
      this.notifyStateChange()

      return true
    } catch (error) {
      console.error('[SW Manager] Service Worker registration failed:', error)
      return false
    }
  }

  /**
   * Service Workerの更新チェック
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.registration) return false

    try {
      await this.registration.update()
      return this.state.updateAvailable
    } catch (error) {
      console.error('[SW Manager] Update check failed:', error)
      return false
    }
  }

  /**
   * アプリケーションの更新適用
   */
  async applyUpdate(): Promise<void> {
    if (!this.registration || !this.state.updateAvailable) return

    const waitingWorker = this.registration.waiting
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
      
      // ページをリロード
      window.location.reload()
    }
  }

  /**
   * キャッシュ情報の取得
   */
  async getCacheInfo(): Promise<CacheInfo> {
    if (!this.registration || !this.registration.active) {
      return {}
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel()
      
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data || {})
      }

      this.registration!.active!.postMessage({
        type: 'GET_CACHE_INFO'
      }, [messageChannel.port2])

      // タイムアウト処理
      setTimeout(() => resolve({}), 5000)
    })
  }

  /**
   * キャッシュのクリア
   */
  async clearCache(type?: 'static' | 'dynamic' | 'images' | 'api'): Promise<void> {
    if (!this.registration || !this.registration.active) return

    const messageType = type ? 'CLEAR_CACHE_TYPE' : 'CLEAR_CACHE'
    const message: any = { type: messageType }
    
    if (type) {
      message.cacheType = type
    }

    this.registration.active.postMessage(message)
    console.log(`[SW Manager] Cache clear requested: ${type || 'all'}`)
  }

  /**
   * リソースのプリロード
   */
  async preloadResources(resources: string[]): Promise<void> {
    if (!this.registration || !this.registration.active) return

    this.registration.active.postMessage({
      type: 'PRELOAD_RESOURCES',
      resources
    })
    
    console.log('[SW Manager] Resource preload requested:', resources)
  }

  /**
   * パフォーマンスモードの設定
   */
  setPerformanceMode(mode: 'low' | 'high'): void {
    this.state.performanceMode = mode

    if (this.registration && this.registration.active) {
      this.registration.active.postMessage({
        type: 'UPDATE_PERFORMANCE_MODE',
        mode
      })
    }

    this.notifyStateChange()
    console.log(`[SW Manager] Performance mode set to: ${mode}`)
  }

  /**
   * オフライン状態の取得
   */
  isOffline(): boolean {
    return !this.state.isOnline
  }

  /**
   * 現在の状態の取得
   */
  getState(): ServiceWorkerState {
    return { ...this.state }
  }

  /**
   * 更新コールバックの設定
   */
  onUpdateAvailable(callback: () => void): void {
    this.updateCallback = callback
  }

  /**
   * 状態変更コールバックの設定
   */
  onStateChange(callback: (state: ServiceWorkerState) => void): void {
    this.stateChangeCallback = callback
  }

  /**
   * Service Workerからのメッセージ処理
   */
  private setupMessageListener(): void {
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { data } = event

      switch (data.type) {
        case 'SYNC_GAME_DATA':
          // ゲームデータの同期要求
          this.handleGameDataSync()
          break

        case 'CACHE_UPDATED':
          console.log('[SW Manager] Cache updated:', data.resource)
          break

        default:
          console.log('[SW Manager] Unknown message from SW:', data)
      }
    })
  }

  /**
   * アップデート監視の設定
   */
  private setupUpdateListener(): void {
    if (!this.registration) return

    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // 新しいバージョンが利用可能
            this.state.updateAvailable = true
            this.notifyStateChange()
            
            if (this.updateCallback) {
              this.updateCallback()
            }
          }
        })
      }
    })
  }

  /**
   * オンライン状態の監視
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.state.isOnline = true
      this.notifyStateChange()
      console.log('[SW Manager] Online status: connected')
    })

    window.addEventListener('offline', () => {
      this.state.isOnline = false
      this.notifyStateChange()
      console.log('[SW Manager] Online status: disconnected')
    })
  }

  /**
   * ゲームデータ同期の処理
   */
  private handleGameDataSync(): void {
    // ローカルストレージからゲームデータを読み取り
    const gameData = localStorage.getItem('gameData')
    
    if (gameData) {
      console.log('[SW Manager] Game data sync requested')
      // 必要に応じてサーバーとの同期処理を実装
    }
  }

  /**
   * 状態変更の通知
   */
  private notifyStateChange(): void {
    if (this.stateChangeCallback) {
      this.stateChangeCallback(this.getState())
    }
  }
}

// シングルトンインスタンス
export const serviceWorkerManager = new ServiceWorkerManager()

// Vue.js向けのコンポーザブル関数
export function useServiceWorker() {
  const register = () => serviceWorkerManager.register()
  const checkForUpdate = () => serviceWorkerManager.checkForUpdate()
  const applyUpdate = () => serviceWorkerManager.applyUpdate()
  const getCacheInfo = () => serviceWorkerManager.getCacheInfo()
  const clearCache = (type?: 'static' | 'dynamic' | 'images' | 'api') => 
    serviceWorkerManager.clearCache(type)
  const preloadResources = (resources: string[]) => 
    serviceWorkerManager.preloadResources(resources)
  const setPerformanceMode = (mode: 'low' | 'high') => 
    serviceWorkerManager.setPerformanceMode(mode)
  const isOffline = () => serviceWorkerManager.isOffline()
  const getState = () => serviceWorkerManager.getState()

  return {
    register,
    checkForUpdate,
    applyUpdate,
    getCacheInfo,
    clearCache,
    preloadResources,
    setPerformanceMode,
    isOffline,
    getState,
    onUpdateAvailable: (callback: () => void) => 
      serviceWorkerManager.onUpdateAvailable(callback),
    onStateChange: (callback: (state: ServiceWorkerState) => void) => 
      serviceWorkerManager.onStateChange(callback)
  }
}

// 自動初期化（ブラウザ環境でのみ）
if (typeof window !== 'undefined') {
  // ページロード後に自動登録
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      serviceWorkerManager.register()
    })
  } else {
    serviceWorkerManager.register()
  }
}