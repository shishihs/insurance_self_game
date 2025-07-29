/**
 * アセット最適化システム
 * 画像・音声の圧縮、遅延読み込み、プリロードの管理
 */

export interface AssetConfig {
  /** アセットキー */
  key: string
  /** ファイルパス */
  path: string
  /** アセット種別 */
  type: 'image' | 'audio' | 'json' | 'atlas' | 'spritesheet'
  /** 優先度 (1-10, 10が最高) */
  priority: number
  /** 遅延読み込み対象か */
  lazy: boolean
  /** 圧縮設定 */
  compression?: {
    quality: number
    format: 'webp' | 'png' | 'jpg'
  }
}

/**
 * アセット読み込み統計
 */
export interface AssetLoadStats {
  /** 総アセット数 */
  totalAssets: number
  /** 読み込み完了数 */
  loadedAssets: number
  /** 読み込み進捗率 */
  progress: number
  /** 読み込み速度 (assets/sec) */
  loadingSpeed: number
  /** 平均読み込み時間 */
  averageLoadTime: number
  /** キャッシュヒット率 */
  cacheHitRate: number
  /** 合計ファイルサイズ */
  totalSize: number
  /** メモリ使用量 */
  memoryUsage: number
}

/**
 * アセット最適化マネージャー
 */
export class AssetOptimizer {
  private scene: Phaser.Scene
  private assetConfigs: Map<string, AssetConfig> = new Map()
  private loadingQueue: AssetConfig[] = []
  private loadedAssets: Set<string> = new Set()
  private loadingStats: AssetLoadStats
  private compressionWorker: Worker | null = null
  private lazyLoadTriggers: Map<string, () => void> = new Map()
  
  // プリロード管理
  private preloadGroups: Map<string, string[]> = new Map()
  private currentGroup: string | null = null
  
  // キャッシュ管理
  private assetCache: Map<string, any> = new Map()
  private cacheSize: number = 0
  private maxCacheSize: number = 100 * 1024 * 1024 // 100MB
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.initializeOptimizer()
  }
  
  /**
   * 最適化システムの初期化
   */
  private initializeOptimizer(): void {
    this.initializeStats()
    this.setupCompressionWorker()
    this.setupPreloadEvents()
    this.setupMemoryMonitoring()
  }
  
  /**
   * 統計情報の初期化
   */
  private initializeStats(): void {
    this.loadingStats = {
      totalAssets: 0,
      loadedAssets: 0,
      progress: 0,
      loadingSpeed: 0,
      averageLoadTime: 0,
      cacheHitRate: 0,
      totalSize: 0,
      memoryUsage: 0
    }
  }
  
  /**
   * 圧縮ワーカーのセットアップ
   */
  private setupCompressionWorker(): void {
    // Web Worker for image compression
    if (typeof Worker !== 'undefined') {
      const workerCode = `
        self.onmessage = function(e) {
          const { imageData, quality, format } = e.data;
          
          // Create canvas for compression
          const canvas = new OffscreenCanvas(imageData.width, imageData.height);
          const ctx = canvas.getContext('2d');
          
          // Apply compression logic here
          const compressedData = canvas.convertToBlob({
            type: 'image/' + format,
            quality: quality / 100
          });
          
          self.postMessage({ compressedData });
        };
      `
      
      const blob = new Blob([workerCode], { type: 'application/javascript' })
      this.compressionWorker = new Worker(URL.createObjectURL(blob))
    }
  }
  
  /**
   * プリロードイベントのセットアップ
   */
  private setupPreloadEvents(): void {
    this.scene.load.on('progress', (progress: number) => {
      this.loadingStats.progress = progress * 100
      this.updateLoadingSpeed()
    })
    
    this.scene.load.on('filecomplete', (key: string) => {
      this.loadedAssets.add(key)
      this.loadingStats.loadedAssets = this.loadedAssets.size
      this.updateCacheHitRate()
    })
    
    this.scene.load.on('loaderror', (file: any) => {
      console.error(`アセット読み込みエラー: ${file.key}`, file)
    })
  }
  
  /**
   * メモリ監視のセットアップ
   */
  private setupMemoryMonitoring(): void {
    setInterval(() => {
      this.updateMemoryUsage()
      this.cleanupCache()
    }, 5000) // 5秒ごとにチェック
  }
  
  /**
   * アセット設定を登録
   */
  registerAsset(config: AssetConfig): void {
    this.assetConfigs.set(config.key, config)
    this.loadingStats.totalAssets++
    
    if (!config.lazy) {
      this.loadingQueue.push(config)
    }
    
    // グループに追加（グループが設定されている場合）
    if (this.currentGroup) {
      const group = this.preloadGroups.get(this.currentGroup) || []
      group.push(config.key)
      this.preloadGroups.set(this.currentGroup, group)
    }
  }
  
  /**
   * 複数のアセットを一括登録
   */
  registerAssets(configs: AssetConfig[]): void {
    configs.forEach(config => this.registerAsset(config))
  }
  
  /**
   * プリロードグループの作成
   */
  createPreloadGroup(groupName: string, assetKeys: string[]): void {
    this.preloadGroups.set(groupName, [...assetKeys])
    this.currentGroup = groupName
  }
  
  /**
   * 優先度に基づいてアセットを読み込み
   */
  async loadByPriority(minPriority: number = 1): Promise<void> {
    const highPriorityAssets = this.loadingQueue
      .filter(config => config.priority >= minPriority)
      .sort((a, b) => b.priority - a.priority)
    
    const loadPromises = highPriorityAssets.map(config => this.loadAsset(config))
    await Promise.all(loadPromises)
  }
  
  /**
   * グループ単位でアセットを読み込み
   */
  async loadGroup(groupName: string): Promise<void> {
    const assetKeys = this.preloadGroups.get(groupName)
    if (!assetKeys) {
      console.warn(`プリロードグループが見つかりません: ${groupName}`)
      return
    }
    
    const loadPromises = assetKeys.map(key => {
      const config = this.assetConfigs.get(key)
      return config ? this.loadAsset(config) : Promise.resolve()
    })
    
    await Promise.all(loadPromises.filter(Boolean))
  }
  
  /**
   * 遅延読み込み用のトリガーを設定
   */
  setupLazyLoad(assetKey: string, trigger: () => void): void {
    this.lazyLoadTriggers.set(assetKey, trigger)
  }
  
  /**
   * 個別アセットの読み込み
   */
  private async loadAsset(config: AssetConfig): Promise<void> {
    const startTime = performance.now()
    
    // キャッシュをチェック
    if (this.assetCache.has(config.key)) {
      this.updateCacheHitRate(true)
      return
    }
    
    try {
      // 圧縮が設定されている場合は圧縮処理
      if (config.compression && config.type === 'image') {
        await this.loadCompressedImage(config)
      } else {
        await this.loadStandardAsset(config)
      }
      
      const loadTime = performance.now() - startTime
      this.updateAverageLoadTime(loadTime)
      
    } catch (error) {
      console.error(`アセット読み込み失敗: ${config.key}`, error)
    }
  }
  
  /**
   * 圧縮画像の読み込み
   */
  private async loadCompressedImage(config: AssetConfig): Promise<void> {
    if (!this.compressionWorker) {
      // フォールバック: 標準読み込み
      return this.loadStandardAsset(config)
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        // Canvas で圧縮処理
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        
        this.compressionWorker!.onmessage = (e) => {
          const { compressedData } = e.data
          this.cacheAsset(config.key, compressedData)
          resolve()
        }
        
        this.compressionWorker!.postMessage({
          imageData,
          quality: config.compression!.quality,
          format: config.compression!.format
        })
      }
      
      img.onerror = reject
      img.src = config.path
    })
  }
  
  /**
   * 標準アセットの読み込み
   */
  private async loadStandardAsset(config: AssetConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      switch (config.type) {
        case 'image':
          this.scene.load.image(config.key, config.path)
          break
        case 'audio':
          this.scene.load.audio(config.key, config.path)
          break
        case 'json':
          this.scene.load.json(config.key, config.path)
          break
        case 'atlas':
          this.scene.load.atlas(config.key, config.path + '.png', config.path + '.json')
          break
        case 'spritesheet':
          // スプライトシートの場合は追加パラメータが必要
          console.warn(`スプライトシート読み込みには追加設定が必要です: ${config.key}`)
          break
        default:
          reject(new Error(`未対応のアセット種別: ${config.type}`))
          return
      }
      
      this.scene.load.once('filecomplete-' + config.type + '-' + config.key, () => {
        this.cacheAsset(config.key, this.scene.textures.get(config.key))
        resolve()
      })
      
      this.scene.load.start()
    })
  }
  
  /**
   * アセットをキャッシュに保存
   */
  private cacheAsset(key: string, data: any): void {
    const size = this.estimateAssetSize(data)
    
    // キャッシュサイズチェック
    if (this.cacheSize + size > this.maxCacheSize) {
      this.evictLeastRecentlyUsed(size)
    }
    
    this.assetCache.set(key, {
      data,
      size,
      lastAccessed: Date.now()
    })
    
    this.cacheSize += size
  }
  
  /**
   * LRU方式でキャッシュを削除
   */
  private evictLeastRecentlyUsed(requiredSize: number): void {
    const entries = Array.from(this.assetCache.entries())
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
    
    let freedSize = 0
    for (const [key, entry] of entries) {
      this.assetCache.delete(key)
      this.cacheSize -= entry.size
      freedSize += entry.size
      
      if (freedSize >= requiredSize) {
        break
      }
    }
  }
  
  /**
   * アセットサイズの推定
   */
  private estimateAssetSize(data: any): number {
    if (!data) return 0
    
    // テクスチャの場合
    if (data.source && data.source.width && data.source.height) {
      return data.source.width * data.source.height * 4 // RGBA
    }
    
    // JSONの場合
    if (typeof data === 'object') {
      return JSON.stringify(data).length * 2 // UTF-16
    }
    
    // 文字列の場合
    if (typeof data === 'string') {
      return data.length * 2
    }
    
    // デフォルト推定値
    return 1024
  }
  
  /**
   * 読み込み速度の更新
   */
  private updateLoadingSpeed(): void {
    const now = Date.now()
    if (!this.lastProgressUpdate) {
      this.lastProgressUpdate = now
      return
    }
    
    const timeDelta = (now - this.lastProgressUpdate) / 1000
    const progressDelta = this.loadingStats.progress - (this.lastProgress || 0)
    
    if (timeDelta > 0) {
      this.loadingStats.loadingSpeed = (progressDelta / timeDelta) || 0
    }
    
    this.lastProgressUpdate = now
    this.lastProgress = this.loadingStats.progress
  }
  
  private lastProgressUpdate?: number
  private lastProgress?: number
  
  /**
   * 平均読み込み時間の更新
   */
  private updateAverageLoadTime(loadTime: number): void {
    const totalLoadTime = this.loadingStats.averageLoadTime * this.loadedAssets.size
    this.loadingStats.averageLoadTime = (totalLoadTime + loadTime) / (this.loadedAssets.size + 1)
  }
  
  /**
   * キャッシュヒット率の更新
   */
  private updateCacheHitRate(isHit: boolean = false): void {
    const totalRequests = this.cacheHits + this.cacheMisses + (isHit ? 1 : 0)
    if (isHit) {
      this.cacheHits++
    } else {
      this.cacheMisses++
    }
    
    this.loadingStats.cacheHitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0
  }
  
  private cacheHits: number = 0
  private cacheMisses: number = 0
  
  /**
   * メモリ使用量の更新
   */
  private updateMemoryUsage(): void {
    if ((performance as any).memory) {
      this.loadingStats.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024
    }
    
    this.loadingStats.totalSize = this.cacheSize / 1024 / 1024 // MB
  }
  
  /**
   * キャッシュのクリーンアップ
   */
  private cleanupCache(): void {
    const now = Date.now()
    const maxAge = 10 * 60 * 1000 // 10分
    
    for (const [key, entry] of this.assetCache.entries()) {
      if (now - entry.lastAccessed > maxAge) {
        this.assetCache.delete(key)
        this.cacheSize -= entry.size
      }
    }
  }
  
  /**
   * アセットの取得（キャッシュ優先）
   */
  getAsset(key: string): any {
    const cached = this.assetCache.get(key)
    if (cached) {
      cached.lastAccessed = Date.now()
      this.updateCacheHitRate(true)
      return cached.data
    }
    
    this.updateCacheHitRate(false)
    
    // Phaserのアセットマネージャーから取得
    return this.scene.textures.get(key) || 
           this.scene.cache.audio.get(key) || 
           this.scene.cache.json.get(key)
  }
  
  /**
   * アセットが読み込み済みかチェック
   */
  isAssetLoaded(key: string): boolean {
    return this.loadedAssets.has(key) || this.assetCache.has(key)
  }
  
  /**
   * 統計情報の取得
   */
  getStats(): AssetLoadStats {
    return { ...this.loadingStats }
  }
  
  /**
   * 詳細な統計情報の取得
   */
  getDetailedStats(): {
    basic: AssetLoadStats
    cache: {
      size: number
      maxSize: number
      entries: number
      hitRate: number
    }
    compression: {
      enabled: boolean
      workerAvailable: boolean
    }
    groups: Record<string, string[]>
  } {
    return {
      basic: this.getStats(),
      cache: {
        size: this.cacheSize,
        maxSize: this.maxCacheSize,
        entries: this.assetCache.size,
        hitRate: this.loadingStats.cacheHitRate
      },
      compression: {
        enabled: !!this.compressionWorker,
        workerAvailable: typeof Worker !== 'undefined'
      },
      groups: Object.fromEntries(this.preloadGroups.entries())
    }
  }
  
  /**
   * 最適化推奨事項の生成
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    const stats = this.getDetailedStats()
    
    if (stats.basic.cacheHitRate < 50) {
      recommendations.push('キャッシュヒット率が低いです - キャッシュサイズの増加を検討してください')
    }
    
    if (stats.basic.averageLoadTime > 1000) {
      recommendations.push('読み込み時間が長いです - アセット圧縮や優先度調整を検討してください')
    }
    
    if (stats.cache.size / stats.cache.maxSize > 0.9) {
      recommendations.push('キャッシュ使用率が高いです - 最大キャッシュサイズの増加を検討してください')
    }
    
    if (stats.basic.memoryUsage > 200) {
      recommendations.push('メモリ使用量が多いです - 不要なアセットの解放を検討してください')
    }
    
    if (!stats.compression.enabled && stats.compression.workerAvailable) {
      recommendations.push('画像圧縮が無効です - パフォーマンス向上のため有効化を検討してください')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('アセット最適化は良好な状態です')
    }
    
    return recommendations
  }
  
  /**
   * リソースのクリーンアップ
   */
  cleanup(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate()
      this.compressionWorker = null
    }
    
    this.assetCache.clear()
    this.loadingQueue.length = 0
    this.loadedAssets.clear()
    this.preloadGroups.clear()
    this.lazyLoadTriggers.clear()
    
    this.cacheSize = 0
  }
}

/**
 * 画像最適化ユーティリティ
 */
export class ImageOptimizer {
  /**
   * 画像を最適な形式に変換
   */
  static async convertToOptimalFormat(
    imageData: ImageData, 
    options: {
      quality?: number
      format?: 'webp' | 'png' | 'jpg'
      maxWidth?: number
      maxHeight?: number
    } = {}
  ): Promise<Blob> {
    const {
      quality = 85,
      format = 'webp',
      maxWidth = 2048,
      maxHeight = 2048
    } = options
    
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // リサイズが必要な場合
    let { width, height } = imageData
    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height)
      width *= ratio
      height *= ratio
    }
    
    canvas.width = width
    canvas.height = height
    
    // リサイズして描画
    ctx.putImageData(imageData, 0, 0)
    
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('変換失敗')),
        `image/${format}`,
        quality / 100
      )
    })
  }
  
  /**
   * 画像のメタデータ除去
   */
  static stripMetadata(imageBlob: Blob): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        
        canvas.toBlob((blob) => {
          blob ? resolve(blob) : reject(new Error('メタデータ除去失敗'))
        })
      }
      
      img.onerror = reject
      img.src = URL.createObjectURL(imageBlob)
    })
  }
}

/**
 * 音声最適化ユーティリティ
 */
export class AudioOptimizer {
  /**
   * 音声を最適な形式に変換
   */
  static async convertToOptimalFormat(
    audioBuffer: ArrayBuffer,
    options: {
      quality?: 'low' | 'medium' | 'high'
      format?: 'mp3' | 'ogg' | 'webm'
    } = {}
  ): Promise<ArrayBuffer> {
    const { quality = 'medium', format = 'mp3' } = options
    
    // Web Audio API を使用した音声処理
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const audioData = await audioContext.decodeAudioData(audioBuffer)
    
    // 品質設定に基づくサンプリングレート調整
    const targetSampleRate = quality === 'low' ? 22050 : quality === 'medium' ? 44100 : 48000
    
    // リサンプリング処理（簡易版）
    if (audioData.sampleRate !== targetSampleRate) {
      // 実際のリサンプリング処理を実装
      console.log(`音声リサンプリング: ${audioData.sampleRate}Hz -> ${targetSampleRate}Hz`)
    }
    
    // この例では元のバッファーを返す（実際には圧縮処理を実装）
    return audioBuffer
  }
  
  /**
   * 音声の無音部分をトリミング
   */
  static async trimSilence(audioBuffer: ArrayBuffer): Promise<ArrayBuffer> {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const audioData = await audioContext.decodeAudioData(audioBuffer)
    
    const channelData = audioData.getChannelData(0)
    const threshold = 0.01 // 無音判定の閾値
    
    let start = 0
    let end = channelData.length - 1
    
    // 開始位置の検出
    for (let i = 0; i < channelData.length; i++) {
      if (Math.abs(channelData[i]) > threshold) {
        start = i
        break
      }
    }
    
    // 終了位置の検出
    for (let i = channelData.length - 1; i >= 0; i--) {
      if (Math.abs(channelData[i]) > threshold) {
        end = i
        break
      }
    }
    
    // トリミング処理（実際の実装が必要）
    console.log(`音声トリミング: ${start} - ${end}`)
    
    return audioBuffer
  }
}