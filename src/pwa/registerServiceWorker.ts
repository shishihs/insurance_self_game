/**
 * Next-Generation PWA Service Worker の登録と管理
 * 
 * 機能:
 * - オフラインサポート
 * - バックグラウンド同期
 * - プッシュ通知対応
 * - アクセシビリティ機能のキャッシュ
 * - パフォーマンス最適化
 */

export interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void
  onUpdate?: (registration: ServiceWorkerRegistration) => void
  onOffline?: () => void
  onOnline?: () => void
  onError?: (error: Error) => void
  onBackgroundSync?: (event: string) => void
  onPushReceived?: (notification: any) => void
  enableNotifications?: boolean
  enableBackgroundSync?: boolean
  offlineGameMode?: boolean
}

export interface PWAInstallPrompt {
  prompt: () => void
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface PWACapabilities {
  canInstall: boolean
  isInstalled: boolean
  isStandalone: boolean
  hasNotificationPermission: boolean
  hasBackgroundSync: boolean
  isOfflineReady: boolean
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private updateAvailable = false
  private refreshing = false
  private installPrompt: PWAInstallPrompt | null = null
  private capabilities: PWACapabilities = {
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    hasNotificationPermission: false,
    hasBackgroundSync: false,
    isOfflineReady: false
  }
  private config: ServiceWorkerConfig = {}
  
  /**
   * Next-Generation PWA Service Worker を登録
   */
  async register(config: ServiceWorkerConfig = {}): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker is not supported')
      return
    }
    
    this.config = config
    
    try {
      // Service Worker の登録
      const basePath = import.meta.env.BASE_URL || '/'
      const registration = await navigator.serviceWorker.register(`${basePath}service-worker.js`, {
        scope: basePath
      })
      
      this.registration = registration
      console.log('Service Worker registered:', registration)
      
      // PWA機能の初期化
      await this.initializePWAFeatures()
      
      // 登録成功時のコールバック
      if (config.onSuccess) {
        config.onSuccess(registration)
      }
      
      // 更新チェック
      this.checkForUpdates(registration, config)
      
      // ネットワーク状態の監視
      this.setupNetworkListeners(config)
      
      // ページ更新の処理
      this.setupRefreshListener()
      
      // PWAインストールプロンプトの設定
      this.setupInstallPrompt()
      
      // 通知機能の設定
      if (config.enableNotifications) {
        await this.setupNotifications()
      }
      
      // バックグラウンド同期の設定
      if (config.enableBackgroundSync) {
        this.setupBackgroundSync()
      }
      
      // アクセシビリティ機能のキャッシュ
      this.setupAccessibilityCache()
      
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
   * PWA機能の初期化
   */
  private async initializePWAFeatures(): Promise<void> {
    // PWA機能の検出
    this.capabilities = {
      canInstall: 'serviceWorker' in navigator && 'PushManager' in window,
      isInstalled: this.isRunningStandalone(),
      isStandalone: this.isRunningStandalone(),
      hasNotificationPermission: Notification.permission === 'granted',
      hasBackgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      isOfflineReady: this.registration !== null
    }
    
    // アクセシビリティ設定のキャッシュ
    this.cacheAccessibilitySettings()
    
    // オフラインゲームモードの準備
    if (this.config.offlineGameMode) {
      this.setupOfflineGameMode()
    }
  }

  /**
   * スタンドアロンモードで実行中かチェック
   */
  private isRunningStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    )
  }

  /**
   * PWAインストールプロンプトの設定
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      this.installPrompt = e as any
      this.capabilities.canInstall = true
      
      // インストール可能になったことを通知
      this.dispatchPWAEvent('installable', { canInstall: true })
    })
    
    window.addEventListener('appinstalled', () => {
      this.capabilities.isInstalled = true
      this.installPrompt = null
      
      // インストール完了を通知
      this.dispatchPWAEvent('installed', { isInstalled: true })
    })
  }

  /**
   * 通知機能の設定
   */
  private async setupNotifications(): Promise<void> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return
    }
    
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      this.capabilities.hasNotificationPermission = permission === 'granted'
    }
    
    // Push通知の設定
    if (this.registration && 'PushManager' in window) {
      try {
        const subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.getVAPIDPublicKey())
        })
        
        // サブスクリプション情報をサーバーに送信（実装に応じて）
        console.log('Push subscription:', subscription)
      } catch (error) {
        console.error('Failed to subscribe to push notifications:', error)
      }
    }
  }

  /**
   * バックグラウンド同期の設定
   */
  private setupBackgroundSync(): void {
    if (!this.capabilities.hasBackgroundSync) {
      console.log('Background sync is not supported')
      return
    }
    
    // バックグラウンド同期イベントの監視
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'BACKGROUND_SYNC') {
        if (this.config.onBackgroundSync) {
          this.config.onBackgroundSync(event.data.tag)
        }
      }
    })
  }

  /**
   * アクセシビリティ機能のキャッシュ設定
   */
  private setupAccessibilityCache(): void {
    // アクセシビリティ設定をService Workerにキャッシュ
    const a11ySettings = localStorage.getItem('accessibility-settings')
    if (a11ySettings && this.registration?.active) {
      this.registration.active.postMessage({
        type: 'CACHE_ACCESSIBILITY_SETTINGS',
        settings: JSON.parse(a11ySettings)
      })
    }
    
    // 設定変更の監視
    window.addEventListener('storage', (e) => {
      if (e.key === 'accessibility-settings' && this.registration?.active) {
        this.registration.active.postMessage({
          type: 'UPDATE_ACCESSIBILITY_SETTINGS',
          settings: JSON.parse(e.newValue || '{}')
        })
      }
    })
  }

  /**
   * オフラインゲームモードの設定
   */
  private setupOfflineGameMode(): void {
    // ゲームデータのキャッシュ
    const gameData = {
      savedGames: localStorage.getItem('saved-games'),
      gameSettings: localStorage.getItem('game-settings'),
      statistics: localStorage.getItem('game-statistics')
    }
    
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: 'CACHE_GAME_DATA',
        data: gameData
      })
    }
    
    // オフライン時のゲーム機能制限
    window.addEventListener('offline', () => {
      this.dispatchPWAEvent('offline-mode', { 
        features: ['local-save', 'basic-gameplay'],
        disabled: ['online-leaderboard', 'cloud-sync']
      })
    })
  }

  /**
   * アクセシビリティ設定のキャッシュ
   */
  private cacheAccessibilitySettings(): void {
    const settings = {
      highContrast: document.documentElement.classList.contains('high-contrast'),
      reducedMotion: document.documentElement.classList.contains('reduce-motion'),
      fontSize: document.documentElement.style.fontSize,
      colorScheme: document.documentElement.getAttribute('data-color-scheme')
    }
    
    if (this.registration?.active) {
      this.registration.active.postMessage({
        type: 'CACHE_ACCESSIBILITY_STATE',
        state: settings
      })
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
        cacheNames.map(async cacheName => caches.delete(cacheName))
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

  /**
   * PWAインストールプロンプトの表示
   */
  async promptInstall(): Promise<boolean> {
    if (!this.installPrompt) {
      console.log('Install prompt is not available')
      return false
    }

    try {
      this.installPrompt.prompt()
      const choiceResult = await this.installPrompt.userChoice
      
      if (choiceResult.outcome === 'accepted') {
        console.log('PWA installation accepted')
        return true
      } 
        console.log('PWA installation dismissed')
        return false
      
    } catch (error) {
      console.error('Install prompt failed:', error)
      return false
    }
  }

  /**
   * PWA機能の検出結果を取得
   */
  getPWACapabilities(): PWACapabilities {
    return { ...this.capabilities }
  }

  /**
   * 通知の送信
   */
  async sendNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!this.capabilities.hasNotificationPermission) {
      console.log('Notification permission not granted')
      return
    }

    if (this.registration) {
      await this.registration.showNotification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'game-notification',
        renotify: true,
        requireInteraction: false,
        ...options
      })
    }
  }

  /**
   * バックグラウンド同期の要求
   */
  async requestBackgroundSync(tag: string): Promise<void> {
    if (!this.capabilities.hasBackgroundSync || !this.registration) {
      console.log('Background sync not available')
      return
    }

    try {
      await this.registration.sync.register(tag)
      console.log(`Background sync registered: ${tag}`)
    } catch (error) {
      console.error('Background sync registration failed:', error)
    }
  }

  /**
   * PWAイベントの送出
   */
  private dispatchPWAEvent(type: string, detail: any): void {
    const event = new CustomEvent(`pwa-${type}`, { detail })
    window.dispatchEvent(event)
  }

  /**
   * VAPID公開キーの取得（実装に応じて設定）
   */
  private getVAPIDPublicKey(): string {
    // 実際の実装では環境変数から取得
    return 'YOUR_VAPID_PUBLIC_KEY_HERE'
  }

  /**
   * Base64 URLをUint8Arrayに変換
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/')

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
  }

  /**
   * PWA統計情報の取得
   */
  getPWAStats(): any {
    return {
      capabilities: this.capabilities,
      updateAvailable: this.updateAvailable,
      isOnline: navigator.onLine,
      installPromptAvailable: this.installPrompt !== null,
      registration: {
        scope: this.registration?.scope,
        updateViaCache: this.registration?.updateViaCache,
        active: this.registration?.active?.state
      }
    }
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

/**
 * PWAインストールプロンプトの表示
 */
export async function promptPWAInstall(): Promise<boolean> {
  return serviceWorkerManager.promptInstall()
}

/**
 * PWA機能の取得
 */
export function getPWACapabilities(): PWACapabilities {
  return serviceWorkerManager.getPWACapabilities()
}

/**
 * 通知の送信
 */
export async function sendNotification(title: string, options?: NotificationOptions): Promise<void> {
  return serviceWorkerManager.sendNotification(title, options)
}

/**
 * バックグラウンド同期の要求
 */
export async function requestBackgroundSync(tag: string): Promise<void> {
  return serviceWorkerManager.requestBackgroundSync(tag)
}

/**
 * PWA統計情報の取得
 */
export function getPWAStats(): any {
  return serviceWorkerManager.getPWAStats()
}

/**
 * Vue Composition API用のフック
 */
export function usePWA() {
  const { ref, onMounted, onUnmounted } = require('vue')
  
  const capabilities = ref<PWACapabilities>({
    canInstall: false,
    isInstalled: false,
    isStandalone: false,
    hasNotificationPermission: false,
    hasBackgroundSync: false,
    isOfflineReady: false
  })
  
  const updateAvailable = ref(false)
  const isOnline = ref(navigator.onLine)

  onMounted(() => {
    capabilities.value = getPWACapabilities()
    updateAvailable.value = isUpdateAvailable()
    
    // PWAイベントの監視
    const handlePWAEvent = (event: CustomEvent) => {
      switch (event.type) {
        case 'pwa-installable':
          capabilities.value.canInstall = true
          break
        case 'pwa-installed':
          capabilities.value.isInstalled = true
          break
      }
    }
    
    window.addEventListener('pwa-installable', handlePWAEvent as EventListener)
    window.addEventListener('pwa-installed', handlePWAEvent as EventListener)
    
    // ネットワーク状態の監視
    const updateOnlineStatus = () => {
      isOnline.value = navigator.onLine
    }
    
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    
    onUnmounted(() => {
      window.removeEventListener('pwa-installable', handlePWAEvent as EventListener)
      window.removeEventListener('pwa-installed', handlePWAEvent as EventListener)
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    })
  })

  const install = async () => {
    return promptPWAInstall()
  }

  const update = async () => {
    return updateServiceWorker()
  }

  const notify = async (title: string, options?: NotificationOptions) => {
    return sendNotification(title, options)
  }

  const sync = async (tag: string) => {
    return requestBackgroundSync(tag)
  }

  return {
    capabilities,
    updateAvailable,
    isOnline,
    install,
    update,
    notify,
    sync
  }
}