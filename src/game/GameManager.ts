import Phaser from 'phaser'
import { gameConfig } from './config/gameConfig'
import { PreloadScene } from './scenes/PreloadScene'
import { MainMenuScene } from './scenes/MainMenuScene'
import { GameScene } from './scenes/GameScene'
import { TouchGestureManager } from './input/TouchGestureManager'

/**
 * Phaserゲームを管理するクラス
 */
export class GameManager {
  private game: Phaser.Game | null = null
  private static instance: GameManager | null = null
  private touchGestureManager: TouchGestureManager | null = null
  private isMobile: boolean = false

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager()
    }
    return GameManager.instance
  }

  /**
   * ゲームを初期化
   */
  initialize(parent: string | HTMLElement): void {
    
    if (this.game) {
      return
    }

    try {
      // モバイル判定
      this.isMobile = this.checkMobileDevice()
      
      // 設定をコピー（元の設定を変更しないため）
      const config = { ...gameConfig }
      config.parent = parent
      
      // モバイル最適化
      if (this.isMobile) {
        // ビューポート設定
        this.setupMobileViewport()
        
        // モバイル用の設定調整
        config.scale = {
          ...config.scale,
          mode: Phaser.Scale.RESIZE,
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
      
      // シーンを追加
      config.scene = [
        PreloadScene,
        MainMenuScene,
        GameScene
      ]

      
      // ゲームインスタンスを作成
      this.game = new Phaser.Game(config)
      
      // タッチジェスチャーマネージャーを初期化
      if (typeof parent === 'string') {
        const element = document.getElementById(parent)
        if (element) {
          this.initializeTouchGestures(element)
        }
      } else if (parent instanceof HTMLElement) {
        this.initializeTouchGestures(parent)
      }
      
      // 画面回転とリサイズの処理
      this.setupResponsiveHandlers()
      
    } catch (error) {
      console.error('❌ GameManager: ゲーム初期化エラー:', error)
      throw error
    }
  }

  /**
   * ゲームを破棄
   */
  destroy(): void {
    // タッチジェスチャーマネージャーを破棄
    if (this.touchGestureManager) {
      this.touchGestureManager.destroy()
      this.touchGestureManager = null
    }
    
    // リサイズハンドラーを削除
    this.removeResponsiveHandlers()
    
    if (this.game) {
      this.game.destroy(true, false)
      this.game = null
    }
  }

  /**
   * ゲームが初期化されているか
   */
  isInitialized(): boolean {
    return this.game !== null
  }

  /**
   * 現在のシーンを取得
   */
  getCurrentScene(): string | null {
    if (!this.game) return null
    
    const scenes = this.game.scene.getScenes(true)
    return scenes.length > 0 ? scenes[0].scene.key : null
  }

  /**
   * シーンを切り替え
   */
  switchScene(sceneKey: string, data?: object): void {
    if (!this.game) {
      if (import.meta.env.DEV) console.error('Game is not initialized')
      return
    }

    const currentScene = this.game.scene.getScenes(true)[0]
    if (currentScene) {
      currentScene.scene.start(sceneKey, data)
    }
  }

  /**
   * ゲームをリセット
   */
  reset(): void {
    if (!this.game) return
    
    // すべてのシーンを停止
    this.game.scene.getScenes(true).forEach(scene => {
      scene.scene.stop()
    })
    
    // プリロードシーンから再開
    this.game.scene.start('PreloadScene')
  }

  /**
   * キャッシュをクリア（メモリ最適化）
   */
  clearCache(): void {
    if (!this.game) return
    
    // テクスチャキャッシュをクリア（使用中のものは除く）
    const textureManager = this.game.textures
    const keysToRemove: string[] = []
    
    textureManager.list.forEach((texture, key) => {
      // システムテクスチャ以外を削除対象に
      if (key !== '__DEFAULT' && key !== '__MISSING' && key !== '__WHITE') {
        keysToRemove.push(key)
      }
    })
    
    // 使用されていないテクスチャを削除
    keysToRemove.forEach(key => {
      try {
        textureManager.remove(key)
      } catch (e) {
        // 使用中のテクスチャは削除できない
      }
    })
    
    // サウンドキャッシュをクリア
    if (this.game.sound) {
      this.game.sound.removeAll()
    }
    
    // ガベージコレクションをトリガー（可能な場合）
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc()
    }
  }

  /**
   * モバイルデバイスかどうかをチェック
   */
  private checkMobileDevice(): boolean {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
    
    // タッチデバイスの検出
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    
    // モバイルユーザーエージェントの検出
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
    const isMobileUA = mobileRegex.test(userAgent)
    
    // 画面サイズによる検出
    const isMobileSize = window.innerWidth <= 768
    
    return isTouchDevice || isMobileUA || isMobileSize
  }

  /**
   * モバイルビューポートの設定
   */
  private setupMobileViewport(): void {
    // ビューポートメタタグの設定/更新
    let viewport = document.querySelector('meta[name="viewport"]')
    if (!viewport) {
      viewport = document.createElement('meta')
      viewport.setAttribute('name', 'viewport')
      document.head.appendChild(viewport)
    }
    
    viewport.setAttribute('content', 
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
    )
    
    // iOSのスクロールバウンスを無効化
    document.body.style.touchAction = 'none'
    document.body.style.overscrollBehavior = 'none'
    document.body.style.webkitOverflowScrolling = 'touch'
    
    // フルスクリーン対応
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.body.style.height = '100%'
    document.body.style.overflow = 'hidden'
  }

  /**
   * タッチジェスチャーの初期化
   */
  private initializeTouchGestures(element: HTMLElement): void {
    this.touchGestureManager = new TouchGestureManager(element, {
      swipeThreshold: 50,
      swipeVelocityThreshold: 0.3,
      doubleTapThreshold: 300,
      longPressThreshold: 500,
      pinchThreshold: 0.1,
      dragThreshold: 10
    })
    
    // グローバルジェスチャーハンドラーの設定
    this.setupGlobalGestures()
  }

  /**
   * グローバルジェスチャーの設定
   */
  private setupGlobalGestures(): void {
    if (!this.touchGestureManager) return
    
    // ピンチズームでの画面調整
    this.touchGestureManager.on('pinch', (event) => {
      if (event.detail.scale > 1.2) {
        // ズームイン時の処理
        this.handleZoomIn()
      } else if (event.detail.scale < 0.8) {
        // ズームアウト時の処理
        this.handleZoomOut()
      }
    })
    
    // ダブルタップでフルスクリーン切り替え
    this.touchGestureManager.on('doubletap', () => {
      this.toggleFullscreen()
    })
    
    // ドラッグとスワイプのデフォルト動作を防止
    this.touchGestureManager.setPreventDefault('drag', true)
    this.touchGestureManager.setPreventDefault('swipe', true)
  }

  /**
   * レスポンシブハンドラーの設定
   */
  private setupResponsiveHandlers(): void {
    // 画面回転の処理
    this.handleOrientationChange = this.handleOrientationChange.bind(this)
    window.addEventListener('orientationchange', this.handleOrientationChange)
    
    // リサイズの処理
    this.handleResize = this.handleResize.bind(this)
    window.addEventListener('resize', this.handleResize)
    
    // ビジビリティ変更の処理（バックグラウンド時の処理）
    this.handleVisibilityChange = this.handleVisibilityChange.bind(this)
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * レスポンシブハンドラーの削除
   */
  private removeResponsiveHandlers(): void {
    window.removeEventListener('orientationchange', this.handleOrientationChange)
    window.removeEventListener('resize', this.handleResize)
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  /**
   * 画面回転の処理
   */
  private handleOrientationChange(): void {
    // 回転後の遅延処理
    setTimeout(() => {
      this.handleResize()
      
      // ゲームシーンに回転を通知
      if (this.game) {
        const activeScene = this.game.scene.getScenes(true)[0]
        if (activeScene?.events) {
          activeScene.events.emit('orientationchange', window.orientation)
        }
      }
    }, 300)
  }

  /**
   * リサイズの処理
   */
  private handleResize(): void {
    if (!this.game) return
    
    // Phaserのリサイズ処理
    this.game.scale.resize(window.innerWidth, window.innerHeight)
    
    // セーフエリアの再計算
    this.updateSafeArea()
  }

  /**
   * ビジビリティ変更の処理
   */
  private handleVisibilityChange(): void {
    if (!this.game) return
    
    if (document.hidden) {
      // バックグラウンドに移行した時
      this.game.sound.pauseAll()
      this.game.loop.sleep()
    } else {
      // フォアグラウンドに復帰した時
      this.game.sound.resumeAll()
      this.game.loop.wake()
    }
  }

  /**
   * セーフエリアの更新
   */
  private updateSafeArea(): void {
    const safeAreaInsets = {
      top: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)') || '0'),
      right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)') || '0'),
      bottom: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)') || '0'),
      left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)') || '0')
    }
    
    // セーフエリア情報をゲームに保存
    if (this.game && this.game.registry) {
      this.game.registry.set('safeAreaInsets', safeAreaInsets)
    }
  }

  /**
   * ズームイン処理
   */
  private handleZoomIn(): void {
    if (this.game) {
      const currentZoom = this.game.scale.zoom
      this.game.scale.setZoom(Math.min(currentZoom * 1.1, 2))
    }
  }

  /**
   * ズームアウト処理
   */
  private handleZoomOut(): void {
    if (this.game) {
      const currentZoom = this.game.scale.zoom
      this.game.scale.setZoom(Math.max(currentZoom * 0.9, 0.5))
    }
  }

  /**
   * フルスクリーン切り替え
   */
  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('フルスクリーンリクエストに失敗:', err)
      })
    } else {
      document.exitFullscreen()
    }
  }

  /**
   * タッチジェスチャーマネージャーを取得
   */
  getTouchGestureManager(): TouchGestureManager | null {
    return this.touchGestureManager
  }

  /**
   * モバイルデバイスかどうかを取得
   */
  getIsMobile(): boolean {
    return this.isMobile
  }

}