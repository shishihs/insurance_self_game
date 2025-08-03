/**
 * モバイルデバイス向けのパフォーマンス最適化マネージャー
 */
export class MobilePerformanceManager {
  private static instance: MobilePerformanceManager | null = null
  private devicePixelRatio: number
  private isMobile: boolean
  private isLowEndDevice: boolean
  private performanceSettings: PerformanceSettings

  private constructor() {
    this.devicePixelRatio = window.devicePixelRatio || 1
    this.isMobile = this.detectMobile()
    this.isLowEndDevice = this.detectLowEndDevice()
    this.performanceSettings = this.determinePerformanceSettings()
  }

  static getInstance(): MobilePerformanceManager {
    if (!this.instance) {
      this.instance = new MobilePerformanceManager()
    }
    return this.instance
  }

  /**
   * モバイルデバイスかどうかを検出
   */
  private detectMobile(): boolean {
    const userAgent = navigator.userAgent.toLowerCase()
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'windows phone']
    const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword))
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isSmallScreen = window.innerWidth <= 768
    
    return isMobileUA || (isTouchDevice && isSmallScreen)
  }

  /**
   * 低スペックデバイスかどうかを検出
   */
  private detectLowEndDevice(): boolean {
    // メモリ容量チェック
    const memoryLimited = (navigator as any).deviceMemory && (navigator as any).deviceMemory <= 4
    
    // CPU コア数チェック
    const coresLimited = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4
    
    // 接続速度チェック
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    const slowConnection = connection && (
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g' ||
      connection.effectiveType === '3g'
    )
    
    // バッテリーレベルチェック
    let lowBattery = false
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        lowBattery = battery.level < 0.2 // 20%未満
      })
    }
    
    return memoryLimited || coresLimited || slowConnection || lowBattery
  }

  /**
   * デバイスに応じたパフォーマンス設定を決定
   */
  private determinePerformanceSettings(): PerformanceSettings {
    if (this.isLowEndDevice) {
      return {
        renderScale: 0.75,
        maxTextures: 8,
        maxTextureSize: 1024,
        batchSize: 2048,
        antialias: false,
        animations: {
          enabled: true,
          duration: 150, // 通常の50%
          fps: 30
        },
        particles: {
          enabled: false,
          maxParticles: 0
        },
        shadows: false,
        blur: false,
        pixelPerfect: false
      }
    } else if (this.isMobile) {
      return {
        renderScale: 1,
        maxTextures: 12,
        maxTextureSize: 2048,
        batchSize: 3072,
        antialias: true,
        animations: {
          enabled: true,
          duration: 200, // 通常の66%
          fps: 45
        },
        particles: {
          enabled: true,
          maxParticles: 50
        },
        shadows: false,
        blur: true,
        pixelPerfect: false
      }
    } else {
      // デスクトップのデフォルト設定
      return {
        renderScale: 1,
        maxTextures: 16,
        maxTextureSize: 4096,
        batchSize: 4096,
        antialias: true,
        animations: {
          enabled: true,
          duration: 300,
          fps: 60
        },
        particles: {
          enabled: true,
          maxParticles: 100
        },
        shadows: true,
        blur: true,
        pixelPerfect: true
      }
    }
  }

  /**
   * Phaser ゲーム設定を最適化
   */
  optimizePhaserConfig(baseConfig: any): any {
    const settings = this.performanceSettings
    
    return {
      ...baseConfig,
      render: {
        ...baseConfig.render,
        pixelArt: !settings.pixelPerfect,
        antialias: settings.antialias,
        maxTextures: settings.maxTextures,
        maxTextureSize: settings.maxTextureSize,
        batchSize: settings.batchSize,
        // モバイル向け追加設定
        powerPreference: this.isLowEndDevice ? 'low-power' : 'high-performance',
        desynchronized: !this.isLowEndDevice,
        preserveDrawingBuffer: false,
        failIfMajorPerformanceCaveat: false
      },
      scale: {
        ...baseConfig.scale,
        // モバイルでのスケーリング最適化
        autoRound: true,
        expandParent: false,
        // レンダリング解像度の調整
        zoom: settings.renderScale
      },
      fps: {
        target: settings.animations.fps,
        min: Math.floor(settings.animations.fps / 2),
        smoothStep: true,
        // モバイル向けフレームスキップ許可
        forceSetTimeout: this.isLowEndDevice
      },
      // モバイル向けバッファリング設定
      backgroundColor: baseConfig.backgroundColor || '#2a2a3e',
      transparent: false,
      clearBeforeRender: true,
      // WebGLコンテキスト設定
      banner: false, // バナー表示を無効化してパフォーマンス向上
      disableContextMenu: true,
      // オーディオ最適化
      audio: {
        ...baseConfig.audio,
        // モバイルでの自動再生制限対応
        context: this.isMobile ? undefined : baseConfig.audio?.context,
        disableWebAudio: this.isLowEndDevice
      }
    }
  }

  /**
   * アニメーション設定を取得
   */
  getAnimationSettings() {
    return this.performanceSettings.animations
  }

  /**
   * パーティクル設定を取得
   */
  getParticleSettings() {
    return this.performanceSettings.particles
  }

  /**
   * 現在のパフォーマンス設定を取得
   */
  getSettings(): PerformanceSettings {
    return this.performanceSettings
  }

  /**
   * デバイス情報を取得
   */
  getDeviceInfo() {
    return {
      isMobile: this.isMobile,
      isLowEndDevice: this.isLowEndDevice,
      devicePixelRatio: this.devicePixelRatio,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      deviceMemory: (navigator as any).deviceMemory || 'unknown'
    }
  }

  /**
   * パフォーマンス改善の推奨事項を取得
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []

    if (this.isLowEndDevice) {
      recommendations.push('低スペックデバイスが検出されました。パフォーマンス設定を自動的に調整しています。')
      recommendations.push('可能であれば、Wi-Fi接続をご利用ください。')
      recommendations.push('他のアプリケーションを終了することで、パフォーマンスが向上する可能性があります。')
    }

    if (this.devicePixelRatio > 2) {
      recommendations.push('高解像度ディスプレイが検出されました。必要に応じて画質設定を調整してください。')
    }

    if (this.isMobile && window.innerWidth < 400) {
      recommendations.push('小さな画面サイズが検出されました。横向きでのプレイを推奨します。')
    }

    return recommendations
  }
}

/**
 * パフォーマンス設定の型定義
 */
interface PerformanceSettings {
  renderScale: number
  maxTextures: number
  maxTextureSize: number
  batchSize: number
  antialias: boolean
  animations: {
    enabled: boolean
    duration: number
    fps: number
  }
  particles: {
    enabled: boolean
    maxParticles: number
  }
  shadows: boolean
  blur: boolean
  pixelPerfect: boolean
}

// シングルトンインスタンスをエクスポート
export const mobilePerformanceManager = MobilePerformanceManager.getInstance()