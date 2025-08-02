import { secureLocalStorage } from '@/utils/security'

/**
 * データ圧縮のオプション
 */
export interface CompressionOptions {
  enabled: boolean
  level: 'fast' | 'balanced' | 'maximum'
  threshold: number // 圧縮を開始するデータサイズ（バイト）
}

/**
 * キャッシュ戦略のオプション
 */
export interface CacheOptions {
  enabled: boolean
  maxSize: number // MB
  ttl: number // Time To Live（秒）
  strategy: 'lru' | 'lfu' | 'fifo'
}

/**
 * バッチ処理のオプション
 */
export interface BatchOptions {
  enabled: boolean
  batchSize: number
  flushInterval: number // ミリ秒
  maxPendingOperations: number
}

/**
 * ストレージ最適化の設定
 */
export interface StorageOptimizerConfig {
  compression: CompressionOptions
  cache: CacheOptions
  batch: BatchOptions
  enablePerformanceMonitoring: boolean
  enableCleanup: boolean
  cleanupInterval: number // ミリ秒
}

/**
 * ストレージ操作の統計
 */
export interface StorageStats {
  totalOperations: number
  readOperations: number
  writeOperations: number
  deleteOperations: number
  cacheHits: number
  cacheMisses: number
  compressionSaved: number // バイト
  averageOperationTime: number // ミリ秒
  errorCount: number
}

/**
 * バッチ操作
 */
interface BatchOperation {
  id: string
  type: 'set' | 'get' | 'remove'
  key: string
  value?: any
  timestamp: number
  resolve: (result: any) => void
  reject: (error: Error) => void
}

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  data: any
  timestamp: number
  accessCount: number
  lastAccess: number
  size: number
}

/**
 * LocalStorage活用最適化システム
 * データ圧縮、キャッシュ、バッチ処理、パフォーマンス監視を提供
 */
export class StorageOptimizer {
  private static instance: StorageOptimizer | null = null
  private config: StorageOptimizerConfig
  private storage = secureLocalStorage()
  private cache = new Map<string, CacheEntry>()
  private pendingOperations: BatchOperation[] = []
  private stats: StorageStats
  private batchTimer: number | null = null
  private cleanupTimer: number | null = null
  
  private constructor(config?: Partial<StorageOptimizerConfig>) {
    this.config = {
      compression: {
        enabled: true,
        level: 'balanced',
        threshold: 1024 // 1KB
      },
      cache: {
        enabled: true,
        maxSize: 10, // MB
        ttl: 3600, // 1時間
        strategy: 'lru'
      },
      batch: {
        enabled: true,
        batchSize: 10,
        flushInterval: 100, // 100ms
        maxPendingOperations: 100
      },
      enablePerformanceMonitoring: true,
      enableCleanup: true,
      cleanupInterval: 300000, // 5分
      ...config
    }
    
    this.stats = this.initializeStats()
    this.setupTimers()
  }
  
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(config?: Partial<StorageOptimizerConfig>): StorageOptimizer {
    if (!StorageOptimizer.instance) {
      StorageOptimizer.instance = new StorageOptimizer(config)
    }
    return StorageOptimizer.instance
  }
  
  /**
   * データを保存（最適化付き）
   */
  async setItem(key: string, value: any): Promise<void> {
    const startTime = Date.now()
    
    try {
      if (this.config.batch.enabled) {
        return await this.addToBatch('set', key, value)
      } else {
        return await this.performSet(key, value)
      }
    } catch (error) {
      this.stats.errorCount++
      throw error
    } finally {
      this.updateOperationStats('write', Date.now() - startTime)
    }
  }
  
  /**
   * データを取得（キャッシュ付き）
   */
  async getItem<T>(key: string): Promise<T | null> {
    const startTime = Date.now()
    
    try {
      // キャッシュから確認
      if (this.config.cache.enabled) {
        const cached = this.getFromCache(key)
        if (cached !== null) {
          this.stats.cacheHits++
          this.updateOperationStats('read', Date.now() - startTime)
          return cached
        }
        this.stats.cacheMisses++
      }
      
      // バッチ処理が有効な場合
      if (this.config.batch.enabled) {
        const result = await this.addToBatch<T>('get', key)
        this.updateOperationStats('read', Date.now() - startTime)
        return result
      }
      
      // 直接読み込み
      const result = await this.performGet<T>(key)
      
      // キャッシュに保存
      if (this.config.cache.enabled && result !== null) {
        this.addToCache(key, result)
      }
      
      this.updateOperationStats('read', Date.now() - startTime)
      return result
      
    } catch (error) {
      this.stats.errorCount++
      throw error
    }
  }
  
  /**
   * データを削除
   */
  async removeItem(key: string): Promise<void> {
    const startTime = Date.now()
    
    try {
      if (this.config.batch.enabled) {
        await this.addToBatch('remove', key)
      } else {
        await this.performRemove(key)
      }
      
      // キャッシュからも削除
      this.cache.delete(key)
      
    } catch (error) {
      this.stats.errorCount++
      throw error
    } finally {
      this.updateOperationStats('delete', Date.now() - startTime)
    }
  }
  
  /**
   * バッチ処理を即座に実行
   */
  async flushBatch(): Promise<void> {
    if (this.pendingOperations.length === 0) return
    
    const operations = [...this.pendingOperations]
    this.pendingOperations = []
    
    try {
      await this.executeBatchOperations(operations)
    } catch (error) {
      // 失敗した操作を再キューに追加
      this.pendingOperations.unshift(...operations)
      throw error
    }
  }
  
  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear()
  }
  
  /**
   * 古いデータをクリーンアップ
   */
  async cleanup(): Promise<{
    removedKeys: string[]
    freedSpace: number
    cacheEvictions: number
  }> {
    const removedKeys: string[] = []
    let freedSpace = 0
    let cacheEvictions = 0
    
    // 期限切れのキャッシュエントリを削除
    const now = Date.now()
    const ttlMs = this.config.cache.ttl * 1000
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > ttlMs) {
        freedSpace += entry.size
        this.cache.delete(key)
        cacheEvictions++
      }
    }
    
    // LocalStorageの古いゲームデータをクリーンアップ
    if (this.config.enableCleanup) {
      const gameKeys = this.getGameRelatedKeys()
      
      for (const key of gameKeys) {
        const data = this.storage.getItem(key)
        if (data && this.isExpiredData(data)) {
          const size = this.estimateSize(data)
          this.storage.removeItem(key)
          removedKeys.push(key)
          freedSpace += size
        }
      }
    }
    
    // キャッシュサイズの制限を強制
    await this.enforceCacheLimits()
    
    return { removedKeys, freedSpace, cacheEvictions }
  }
  
  /**
   * ストレージ使用状況を取得
   */
  getStorageInfo(): {
    totalUsed: number
    gameDataUsed: number
    cacheSize: number
    pendingOperations: number
    compressionRatio: number
  } {
    let totalUsed = 0
    let gameDataUsed = 0
    
    // LocalStorageの使用量を計算
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        if (value) {
          const size = key.length + value.length
          totalUsed += size
          
          if (key.startsWith('game_')) {
            gameDataUsed += size
          }
        }
      }
    }
    
    // キャッシュサイズを計算
    const cacheSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0)
    
    // 圧縮率を計算
    const compressionRatio = this.stats.compressionSaved > 0 
      ? totalUsed / (totalUsed + this.stats.compressionSaved)
      : 1
    
    return {
      totalUsed,
      gameDataUsed,
      cacheSize,
      pendingOperations: this.pendingOperations.length,
      compressionRatio
    }
  }
  
  /**
   * パフォーマンス統計を取得
   */
  getStats(): StorageStats {
    return { ...this.stats }
  }
  
  /**
   * 統計をリセット
   */
  resetStats(): void {
    this.stats = this.initializeStats()
  }
  
  /**
   * 設定を更新
   */
  updateConfig(newConfig: Partial<StorageOptimizerConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // タイマーを再設定
    this.setupTimers()
    
    console.log('🔧 StorageOptimizer設定を更新しました')
  }
  
  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    config: StorageOptimizerConfig
    cacheEntries: number
    pendingOperations: number
    stats: StorageStats
    memoryUsage: number
  } {
    return {
      config: this.config,
      cacheEntries: this.cache.size,
      pendingOperations: this.pendingOperations.length,
      stats: this.stats,
      memoryUsage: this.estimateMemoryUsage()
    }
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer)
      this.batchTimer = null
    }
    
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    
    // 残りのバッチ操作を実行
    this.flushBatch().catch(console.error)
    
    this.cache.clear()
    this.pendingOperations = []
  }
  
  // === プライベートメソッド ===
  
  /**
   * 統計を初期化
   */
  private initializeStats(): StorageStats {
    return {
      totalOperations: 0,
      readOperations: 0,
      writeOperations: 0,
      deleteOperations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      compressionSaved: 0,
      averageOperationTime: 0,
      errorCount: 0
    }
  }
  
  /**
   * タイマーを設定
   */
  private setupTimers(): void {
    // 既存のタイマーをクリア
    if (this.batchTimer) clearInterval(this.batchTimer)
    if (this.cleanupTimer) clearInterval(this.cleanupTimer)
    
    // バッチ処理タイマー
    if (this.config.batch.enabled) {
      this.batchTimer = window.setInterval(() => {
        this.flushBatch().catch(console.error)
      }, this.config.batch.flushInterval)
    }
    
    // クリーンアップタイマー
    if (this.config.enableCleanup) {
      this.cleanupTimer = window.setInterval(() => {
        this.cleanup().catch(console.error)
      }, this.config.cleanupInterval)
    }
  }
  
  /**
   * バッチ操作に追加
   */
  private async addToBatch<T>(type: 'set' | 'get' | 'remove', key: string, value?: any): Promise<T | void> {
    return new Promise((resolve, reject) => {
      const operation: BatchOperation = {
        id: this.generateOperationId(),
        type,
        key,
        value,
        timestamp: Date.now(),
        resolve,
        reject
      }
      
      this.pendingOperations.push(operation)
      
      // バッチサイズに達したら即座に実行
      if (this.pendingOperations.length >= this.config.batch.batchSize) {
        this.flushBatch().catch(reject)
      }
      
      // 最大保留操作数を超えた場合はエラー
      if (this.pendingOperations.length > this.config.batch.maxPendingOperations) {
        reject(new Error('バッチ操作の上限を超えました'))
      }
    })
  }
  
  /**
   * バッチ操作を実行
   */
  private async executeBatchOperations(operations: BatchOperation[]): Promise<void> {
    for (const operation of operations) {
      try {
        let result: any
        
        switch (operation.type) {
          case 'set':
            await this.performSet(operation.key, operation.value)
            result = undefined
            break
          case 'get':
            result = await this.performGet(operation.key)
            break
          case 'remove':
            await this.performRemove(operation.key)
            result = undefined
            break
        }
        
        operation.resolve(result)
      } catch (error) {
        operation.reject(error as Error)
      }
    }
  }
  
  /**
   * データを実際に保存
   */
  private async performSet(key: string, value: any): Promise<void> {
    let data = JSON.stringify(value)
    
    // 圧縮を適用
    if (this.config.compression.enabled && data.length > this.config.compression.threshold) {
      const compressed = this.compressData(data)
      if (compressed.length < data.length) {
        this.stats.compressionSaved += data.length - compressed.length
        data = compressed
      }
    }
    
    this.storage.setItem(key, data)
    
    // キャッシュに追加
    if (this.config.cache.enabled) {
      this.addToCache(key, value)
    }
  }
  
  /**
   * データを実際に取得
   */
  private async performGet<T>(key: string): Promise<T | null> {
    const data = this.storage.getItem(key)
    if (!data) return null
    
    try {
      // 圧縮データかどうか判定して解凍
      const decompressed = this.isCompressedData(data) 
        ? this.decompressData(data) 
        : data
      
      return JSON.parse(decompressed)
    } catch (error) {
      console.error(`データ取得エラー (key: ${key}):`, error)
      return null
    }
  }
  
  /**
   * データを実際に削除
   */
  private async performRemove(key: string): Promise<void> {
    this.storage.removeItem(key)
  }
  
  /**
   * キャッシュから取得
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    
    // TTLチェック
    const now = Date.now()
    if (now - entry.timestamp > this.config.cache.ttl * 1000) {
      this.cache.delete(key)
      return null
    }
    
    // アクセス情報を更新
    entry.accessCount++
    entry.lastAccess = now
    
    return entry.data
  }
  
  /**
   * キャッシュに追加
   */
  private addToCache(key: string, data: any): void {
    const size = this.estimateSize(data)
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
      size
    }
    
    this.cache.set(key, entry)
    
    // キャッシュサイズ制限を確認
    this.enforceCacheLimits()
  }
  
  /**
   * キャッシュサイズ制限を強制
   */
  private async enforceCacheLimits(): Promise<void> {
    const maxSizeBytes = this.config.cache.maxSize * 1024 * 1024 // MB to bytes
    let currentSize = 0
    
    // 現在のキャッシュサイズを計算
    for (const entry of this.cache.values()) {
      currentSize += entry.size
    }
    
    if (currentSize <= maxSizeBytes) return
    
    // 戦略に応じてエントリを削除
    const entries = Array.from(this.cache.entries())
    
    switch (this.config.cache.strategy) {
      case 'lru': // Least Recently Used
        entries.sort(([, a], [, b]) => a.lastAccess - b.lastAccess)
        break
      case 'lfu': // Least Frequently Used  
        entries.sort(([, a], [, b]) => a.accessCount - b.accessCount)
        break
      case 'fifo': // First In First Out
        entries.sort(([, a], [, b]) => a.timestamp - b.timestamp)
        break
    }
    
    // サイズ制限内になるまで削除
    while (currentSize > maxSizeBytes && entries.length > 0) {
      const [key, entry] = entries.shift()!
      this.cache.delete(key)
      currentSize -= entry.size
    }
  }
  
  /**
   * データを圧縮
   */
  private compressData(data: string): string {
    // 簡易圧縮実装（実際はより高度な圧縮アルゴリズムを使用）
    try {
      // LZ77ベースの簡易圧縮
      return this.simpleLZCompression(data)
    } catch (error) {
      console.warn('圧縮に失敗しました:', error)
      return data
    }
  }
  
  /**
   * データを解凍
   */
  private decompressData(data: string): string {
    try {
      return this.simpleLZDecompression(data)
    } catch (error) {
      console.warn('解凍に失敗しました:', error)
      return data
    }
  }
  
  /**
   * 圧縮データかどうか判定
   */
  private isCompressedData(data: string): boolean {
    return data.startsWith('LZ_COMPRESSED:')
  }
  
  /**
   * 簡易LZ圧縮
   */
  private simpleLZCompression(input: string): string {
    // 簡易実装：繰り返しパターンを検出して圧縮
    const compressed: string[] = []
    let i = 0
    
    while (i < input.length) {
      let bestMatch = { length: 0, distance: 0 }
      
      // 前方の文字列から最長一致を検索
      for (let j = Math.max(0, i - 255); j < i; j++) {
        let matchLength = 0
        while (i + matchLength < input.length && 
               input[j + matchLength] === input[i + matchLength] &&
               matchLength < 255) {
          matchLength++
        }
        
        if (matchLength > bestMatch.length) {
          bestMatch = { length: matchLength, distance: i - j }
        }
      }
      
      if (bestMatch.length > 2) {
        compressed.push(`[${bestMatch.distance},${bestMatch.length}]`)
        i += bestMatch.length
      } else {
        compressed.push(input[i])
        i++
      }
    }
    
    const result = 'LZ_COMPRESSED:' + compressed.join('')
    return result.length < input.length ? result : input
  }
  
  /**
   * 簡易LZ解凍
   */
  private simpleLZDecompression(input: string): string {
    if (!input.startsWith('LZ_COMPRESSED:')) {
      return input
    }
    
    const compressed = input.substring('LZ_COMPRESSED:'.length)
    const result: string[] = []
    let i = 0
    
    while (i < compressed.length) {
      if (compressed[i] === '[') {
        // 圧縮された部分を解凍
        const endBracket = compressed.indexOf(']', i)
        const match = compressed.substring(i + 1, endBracket)
        const [distance, length] = match.split(',').map(Number)
        
        const startPos = result.length - distance
        for (let j = 0; j < length; j++) {
          result.push(result[startPos + j])
        }
        
        i = endBracket + 1
      } else {
        result.push(compressed[i])
        i++
      }
    }
    
    return result.join('')
  }
  
  /**
   * 操作統計を更新
   */
  private updateOperationStats(type: 'read' | 'write' | 'delete', duration: number): void {
    this.stats.totalOperations++
    
    switch (type) {
      case 'read':
        this.stats.readOperations++
        break
      case 'write':
        this.stats.writeOperations++
        break
      case 'delete':
        this.stats.deleteOperations++
        break
    }
    
    // 平均操作時間を更新
    this.stats.averageOperationTime = 
      (this.stats.averageOperationTime * (this.stats.totalOperations - 1) + duration) / 
      this.stats.totalOperations
  }
  
  /**
   * ゲーム関連のキーを取得
   */
  private getGameRelatedKeys(): string[] {
    const keys: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('game_')) {
        keys.push(key)
      }
    }
    
    return keys
  }
  
  /**
   * データが期限切れかどうか判定
   */
  private isExpiredData(data: any): boolean {
    try {
      if (data.metadata && data.metadata.savedAt) {
        const savedAt = new Date(data.metadata.savedAt)
        const now = new Date()
        const daysDiff = (now.getTime() - savedAt.getTime()) / (1000 * 60 * 60 * 24)
        
        // 30日以上古いデータは期限切れとみなす
        return daysDiff > 30
      }
      return false
    } catch {
      return false
    }
  }
  
  /**
   * データサイズを推定
   */
  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length
    } catch {
      return 0
    }
  }
  
  /**
   * メモリ使用量を推定
   */
  private estimateMemoryUsage(): number {
    let memoryUsage = 0
    
    // キャッシュのメモリ使用量
    for (const entry of this.cache.values()) {
      memoryUsage += entry.size
    }
    
    // バッチ操作のメモリ使用量
    memoryUsage += this.pendingOperations.length * 1024 // 1KB per operation
    
    return memoryUsage
  }
  
  /**
   * 操作IDを生成
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}