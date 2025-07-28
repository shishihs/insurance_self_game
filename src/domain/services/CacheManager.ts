/**
 * キャッシュ管理サービス
 * 
 * パフォーマンス最適化のためのキャッシング機能を提供
 */
export class CacheManager {
  private static instance: CacheManager
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>

  private constructor() {
    this.cache = new Map()
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager()
    }
    return CacheManager.instance
  }

  /**
   * データをキャッシュに保存
   * @param key キー
   * @param data データ
   * @param ttlMs TTL（ミリ秒）
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    })
  }

  /**
   * キャッシュからデータを取得
   * @param key キー
   * @returns データまたはnull
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return null
    }

    // TTL チェック
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data as T
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 期限切れのエントリを削除
   */
  cleanupExpired(): void {
    const now = Date.now()
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key)
      }
    }
  }
}