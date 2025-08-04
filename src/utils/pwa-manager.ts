/**
 * PWA Manager - プログレッシブWebアプリの機能管理
 * 
 * 機能:
 * - Service Worker の管理
 * - Push通知の実装
 * - オフライン検知とハンドリング
 * - バックグラウンド同期
 * - アプリインストール促進
 * - パフォーマンス監視連携
 */

export interface PWAConfig {
  enablePushNotifications: boolean
  enableBackgroundSync: boolean
  enableOfflineMode: boolean
  vapidKey?: string
  notificationSettings?: NotificationSettings
}

export interface NotificationSettings {
  gameReminders: boolean
  performanceAlerts: boolean
  updateNotifications: boolean
  reminderInterval: number // minutes
}

export interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export class PWAManager {
  private static instance: PWAManager
  private serviceWorker: ServiceWorker | null = null
  private pushSubscription: PushSubscription | null = null
  private installPrompt: InstallPromptEvent | null = null
  private isOnline: boolean = navigator.onLine
  private config: PWAConfig
  private notificationPermission: NotificationPermission = 'default'

  private constructor(config: PWAConfig) {
    this.config = config
    this.init()
  }

  static getInstance(config?: PWAConfig): PWAManager {
    if (!PWAManager.instance) {
      const defaultConfig: PWAConfig = {
        enablePushNotifications: true,
        enableBackgroundSync: true,
        enableOfflineMode: true,
        notificationSettings: {
          gameReminders: true,
          performanceAlerts: false,
          updateNotifications: true,
          reminderInterval: 30
        }
      }
      PWAManager.instance = new PWAManager(config || defaultConfig)
    }
    return PWAManager.instance
  }

  /**
   * PWA機能の初期化
   */
  private async init(): Promise<void> {
    try {
      // Service Worker の登録
      await this.registerServiceWorker()
      
      // オンライン/オフライン状態の監視
      this.setupOnlineOfflineHandling()
      
      // インストールプロンプトの処理
      this.setupInstallPrompt()
      
      // Push通知の初期化
      if (this.config.enablePushNotifications) {
        await this.initializePushNotifications()
      }
      
      // バックグラウンド同期の設定
      if (this.config.enableBackgroundSync) {
        this.setupBackgroundSync()
      }
      
      console.log('🚀 PWA Manager initialized successfully')
    } catch (error) {
      console.error('❌ PWA Manager initialization failed:', error)
    }
  }

  /**
   * Service Worker の登録
   */
  private async registerServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported')
    }

    try {
      const basePath = import.meta.env.BASE_URL || '/'
      const registration = await navigator.serviceWorker.register(`${basePath}service-worker.js`, {
        scope: basePath,
        updateViaCache: 'none'
      })

      console.log('✅ Service Worker registered:', registration.scope)

      // 更新チェック
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.notifyServiceWorkerUpdate()
            }
          })
        }
      })

      // アクティブなService Workerを取得
      this.serviceWorker = registration.active
      
      // Service Workerからのメッセージを監視
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))
      
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error)
      throw error
    }
  }

  /**
   * Service Worker からのメッセージ処理
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    const { data } = event
    
    switch (data.type) {
      case 'SYNC_GAME_DATA':
        this.handleGameDataSync()
        break
      case 'CACHE_UPDATED':
        console.log('📦 Cache updated:', data.cacheName)
        break
      case 'PERFORMANCE_DATA':
        this.handlePerformanceData(data.metrics)
        break
      default:
        console.log('📨 Unknown message from SW:', data)
    }
  }

  /**
   * Push通知の初期化
   */
  private async initializePushNotifications(): Promise<void> {
    if (!('Notification' in window) || !('PushManager' in window)) {
      console.warn('⚠️ Push notifications not supported')
      return
    }

    try {
      // 通知権限の確認
      this.notificationPermission = await this.requestNotificationPermission()
      
      if (this.notificationPermission === 'granted') {
        await this.subscribeToPushNotifications()
        this.setupNotificationScheduler()
      }
    } catch (error) {
      console.error('❌ Push notification initialization failed:', error)
    }
  }

  /**
   * 通知権限のリクエスト
   */
  private async requestNotificationPermission(): Promise<NotificationPermission> {
    if (Notification.permission === 'default') {
      return await Notification.requestPermission()
    }
    return Notification.permission
  }

  /**
   * Push通知の購読
   */
  private async subscribeToPushNotifications(): Promise<void> {
    const registration = await navigator.serviceWorker.ready
    
    try {
      this.pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.config.vapidKey || this.generateVAPIDKey()
      })
      
      console.log('📱 Push subscription created:', this.pushSubscription.endpoint)
      
      // サーバーに購読情報を送信
      await this.sendSubscriptionToServer(this.pushSubscription)
    } catch (error) {
      console.error('❌ Push subscription failed:', error)
    }
  }

  /**
   * VAPID キーの生成（デモ用）
   */
  private generateVAPIDKey(): string {
    // 実際のプロダクションでは適切なVAPIDキーを使用
    return 'BEl62iUYgUivxIkv69yViUAHu2OtQgV0RmI1R1K2o7wnpCGhAWo6QjBdKYBgQwJP4eSCyWOmfLgdaVrLmRMb6Uk'
  }

  /**
   * 購読情報をサーバーに送信
   */
  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    // 実際のサーバーエンドポイントに送信
    console.log('📤 Sending subscription to server:', subscription.toJSON())
    
    // ローカルストレージに保存（デモ用）
    localStorage.setItem('pwa_push_subscription', JSON.stringify(subscription.toJSON()))
  }

  /**
   * 通知スケジューラーの設定
   */
  private setupNotificationScheduler(): void {
    if (!this.config.notificationSettings?.gameReminders) return

    const interval = this.config.notificationSettings.reminderInterval * 60 * 1000
    
    setInterval(() => {
      this.scheduleGameReminder()
    }, interval)
  }

  /**
   * ゲームリマインダーの送信
   */
  private async scheduleGameReminder(): Promise<void> {
    // ユーザーがアクティブでない場合のみ通知
    if (document.hidden && this.isOnline) {
      await this.sendNotification({
        title: '人生充実ゲーム',
        body: '新しいチャレンジが待っています！プレイを再開しませんか？',
        icon: '/favicon.ico',
        tag: 'game-reminder',
        data: {
          action: 'resume-game',
          timestamp: Date.now()
        }
      })
    }
  }

  /**
   * 通知の送信
   */
  async sendNotification(options: NotificationOptions & { title: string }): Promise<void> {
    if (this.notificationPermission !== 'granted') {
      console.warn('⚠️ Notification permission not granted')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      await registration.showNotification(options.title, options)
      console.log('📱 Notification sent:', options.title)
    } catch (error) {
      console.error('❌ Failed to send notification:', error)
    }
  }

  /**
   * オンライン/オフライン処理の設定
   */
  private setupOnlineOfflineHandling(): void {
    window.addEventListener('online', () => {
      this.isOnline = true
      this.handleOnlineStatus(true)
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
      this.handleOnlineStatus(false)
    })
  }

  /**
   * オンライン状態の変更処理
   */
  private handleOnlineStatus(isOnline: boolean): void {
    console.log(`🌐 Network status: ${isOnline ? 'Online' : 'Offline'}`)
    
    if (isOnline) {
      // オンライン復帰時の処理
      this.syncPendingData()
      this.preloadCriticalAssets()
    } else {
      // オフライン時の処理
      this.showOfflineMessage()
    }
    
    // UIに状態を通知
    this.notifyNetworkStatus(isOnline)
  }

  /**
   * 保留データの同期
   */
  private async syncPendingData(): Promise<void> {
    if (!this.serviceWorker) return

    try {
      // Service Workerにバックグラウンド同期を要求
      const registration = await navigator.serviceWorker.ready
      await registration.sync.register('sync-game-data')
      console.log('🔄 Background sync requested')
    } catch (error) {
      console.error('❌ Background sync failed:', error)
    }
  }

  /**
   * バックグラウンド同期の設定
   */
  private setupBackgroundSync(): void {
    // ゲームデータの定期同期
    setInterval(() => {
      if (this.isOnline) {
        this.syncPendingData()
      }
    }, 60000) // 1分ごと
  }

  /**
   * ゲームデータ同期の処理
   */
  private handleGameDataSync(): void {
    console.log('🎮 Syncing game data...')
    
    // ローカルストレージからゲームデータを取得
    const gameData = this.getLocalGameData()
    
    if (gameData) {
      // サーバーに送信（実際の実装では適切なAPIを使用）
      this.sendGameDataToServer(gameData)
    }
  }

  /**
   * ローカルゲームデータの取得
   */
  private getLocalGameData(): any {
    try {
      const data = localStorage.getItem('game_progress')
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error('❌ Failed to get local game data:', error)
      return null
    }
  }

  /**
   * ゲームデータをサーバーに送信
   */
  private sendGameDataToServer(data: any): void {
    // 実際の実装では適切なAPIエンドポイントを使用
    console.log('📤 Game data would be sent to server:', data)
  }

  /**
   * インストールプロンプトの設定
   */
  private setupInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault()
      this.installPrompt = event as InstallPromptEvent
      this.showInstallBanner()
    })

    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA installed successfully')
      this.hideInstallBanner()
      this.trackInstallEvent()
    })
  }

  /**
   * インストールバナーの表示
   */
  private showInstallBanner(): void {
    // UIにインストールプロンプトを表示
    const event = new CustomEvent('pwa-install-available')
    window.dispatchEvent(event)
  }

  /**
   * インストールバナーの非表示
   */
  private hideInstallBanner(): void {
    const event = new CustomEvent('pwa-installed')
    window.dispatchEvent(event)
  }

  /**
   * アプリのインストール実行
   */
  async promptInstall(): Promise<boolean> {
    if (!this.installPrompt) {
      console.warn('⚠️ Install prompt not available')
      return false
    }

    try {
      await this.installPrompt.prompt()
      const choice = await this.installPrompt.userChoice
      
      console.log(`📱 Install prompt result: ${choice.outcome}`)
      
      if (choice.outcome === 'accepted') {
        this.trackInstallEvent()
        return true
      }
      
      return false
    } catch (error) {
      console.error('❌ Install prompt failed:', error)
      return false
    }
  }

  /**
   * インストールイベントの追跡
   */
  private trackInstallEvent(): void {
    // アナリティクスにインストールイベントを送信
    console.log('📊 PWA install event tracked')
  }

  /**
   * 重要なアセットのプリロード
   */
  private async preloadCriticalAssets(): Promise<void> {
    if (!this.serviceWorker) return

    const criticalAssets = [
      '/manifest.json',
      '/favicon.ico',
      '/favicon.svg'
    ]

    try {
      // Service Workerにプリロードを要求
      navigator.serviceWorker.controller?.postMessage({
        type: 'PRELOAD_RESOURCES',
        resources: criticalAssets
      })
      
      console.log('📦 Critical assets preload requested')
    } catch (error) {
      console.error('❌ Asset preload failed:', error)
    }
  }

  /**
   * オフラインメッセージの表示
   */
  private showOfflineMessage(): void {
    const event = new CustomEvent('pwa-offline-mode')
    window.dispatchEvent(event)
  }

  /**
   * ネットワーク状態の通知
   */
  private notifyNetworkStatus(isOnline: boolean): void {
    const event = new CustomEvent('pwa-network-status', {
      detail: { isOnline }
    })
    window.dispatchEvent(event)
  }

  /**
   * Service Worker更新の通知
   */
  private notifyServiceWorkerUpdate(): void {
    const event = new CustomEvent('pwa-update-available')
    window.dispatchEvent(event)
  }

  /**
   * パフォーマンスデータの処理
   */
  private handlePerformanceData(metrics: any): void {
    console.log('📈 Performance data received:', metrics)
    
    // パフォーマンス警告の判定
    if (metrics.responseTime > 3000) {
      this.sendPerformanceAlert('サイトの応答が遅くなっています')
    }
  }

  /**
   * パフォーマンス警告の送信
   */
  private async sendPerformanceAlert(message: string): Promise<void> {
    if (!this.config.notificationSettings?.performanceAlerts) return

    await this.sendNotification({
      title: 'パフォーマンス警告',
      body: message,
      icon: '/favicon.ico',
      tag: 'performance-alert',
      data: {
        action: 'check-performance',
        timestamp: Date.now()
      }
    })
  }

  /**
   * PWAの状態情報を取得
   */
  getStatus(): {
    isOnline: boolean
    hasServiceWorker: boolean
    hasPushSubscription: boolean
    notificationPermission: NotificationPermission
    canInstall: boolean
  } {
    return {
      isOnline: this.isOnline,
      hasServiceWorker: Boolean(this.serviceWorker),
      hasPushSubscription: Boolean(this.pushSubscription),
      notificationPermission: this.notificationPermission,
      canInstall: Boolean(this.installPrompt)
    }
  }

  /**
   * キャッシュの管理
   */
  async manageCaches(): Promise<void> {
    if (!this.serviceWorker) return

    navigator.serviceWorker.controller?.postMessage({
      type: 'CLEAR_CACHE_TYPE',
      cacheType: 'dynamic'
    })
  }

  /**
   * PWA設定の更新
   */
  updateConfig(newConfig: Partial<PWAConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 設定変更をService Workerに通知
    navigator.serviceWorker.controller?.postMessage({
      type: 'UPDATE_CONFIG',
      config: this.config
    })
  }

  /**
   * PWAの無効化
   */
  async disable(): Promise<void> {
    try {
      // Service Workerの登録解除
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
      }
      
      // Push購読の解除
      if (this.pushSubscription) {
        await this.pushSubscription.unsubscribe()
      }
      
      console.log('🛑 PWA disabled successfully')
    } catch (error) {
      console.error('❌ PWA disable failed:', error)
    }
  }
}

// エクスポート用インスタンス
export const pwaManager = PWAManager.getInstance()