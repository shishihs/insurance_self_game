/**
 * Generic cache interface
 */
export interface Cache<K, V> {
  get(key: K): V | undefined
  set(key: K, value: V): void
  has(key: K): boolean
  delete(key: K): boolean
  clear(): void
  size(): number
}

/**
 * Cache entry with metadata
 */
interface CacheEntry<V> {
  value: V
  timestamp: number
  hits: number
  lastAccess: number
  ttl?: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number
  misses: number
  hitRate: number
  missRate: number
  size: number
  maxSize: number
  evictions: number
  totalRequests: number
  averageAge: number
  memoryUsage: number
}

/**
 * LRU (Least Recently Used) Cache implementation
 */
export class LRUCache<K, V> implements Cache<K, V> {
  private cache = new Map<K, CacheEntry<V>>()
  private maxSize: number
  private ttl: number | undefined
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  }

  constructor(maxSize: number = 100, ttl?: number) {
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return undefined
    }

    // Check TTL expiration
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      this.stats.misses++
      return undefined
    }

    // Update access information
    entry.hits++
    entry.lastAccess = Date.now()
    this.stats.hits++

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  set(key: K, value: V): void {
    const now = Date.now()
    
    // If key exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!
      entry.value = value
      entry.timestamp = now
      entry.lastAccess = now
      // Move to end
      this.cache.delete(key)
      this.cache.set(key, entry)
      return
    }

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }

    // Add new entry
    this.cache.set(key, {
      value,
      timestamp: now,
      hits: 0,
      lastAccess: now,
      ttl: this.ttl
    })
  }

  has(key: K): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check TTL
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: K): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, evictions: 0 }
  }

  size(): number {
    return this.cache.size
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    
    let totalAge = 0
    const now = Date.now()
    for (const entry of this.cache.values()) {
      totalAge += now - entry.timestamp
    }
    const averageAge = this.cache.size > 0 ? totalAge / this.cache.size : 0

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate,
      missRate: 100 - hitRate,
      size: this.cache.size,
      maxSize: this.maxSize,
      evictions: this.stats.evictions,
      totalRequests,
      averageAge,
      memoryUsage: this.estimateMemoryUsage()
    }
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value
    if (firstKey !== undefined) {
      this.cache.delete(firstKey)
      this.stats.evictions++
    }
  }

  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage in bytes
    let usage = 0
    for (const [key, entry] of this.cache.entries()) {
      usage += this.estimateObjectSize(key) + this.estimateObjectSize(entry)
    }
    return usage
  }

  private estimateObjectSize(obj: any): number {
    // Very rough estimation
    const type = typeof obj
    switch (type) {
      case 'string': return obj.length * 2
      case 'number': return 8
      case 'boolean': return 4
      case 'object': return obj ? JSON.stringify(obj).length * 2 : 0
      default: return 64 // Default estimate
    }
  }
}

/**
 * Computation cache for expensive operations
 */
export class ComputationCache {
  private cache: LRUCache<string, any>
  private computationStats = new Map<string, { calls: number; totalTime: number; hits: number }>()

  constructor(maxSize: number = 500, ttl?: number) {
    this.cache = new LRUCache(maxSize, ttl)
  }

  /**
   * Cached computation with automatic key generation
   */
  async compute<T>(
    key: string,
    computation: () => Promise<T> | T,
    options?: { ttl?: number; forceRefresh?: boolean }
  ): Promise<T> {
    const fullKey = this.generateKey(key, options)
    
    // Update stats
    if (!this.computationStats.has(key)) {
      this.computationStats.set(key, { calls: 0, totalTime: 0, hits: 0 })
    }
    const stats = this.computationStats.get(key)!
    stats.calls++

    // Check cache first
    if (!options?.forceRefresh && this.cache.has(fullKey)) {
      const result = this.cache.get(fullKey)
      if (result !== undefined) {
        stats.hits++
        return result
      }
    }

    // Compute result
    const startTime = performance.now()
    const result = await computation()
    const endTime = performance.now()
    
    stats.totalTime += endTime - startTime

    // Cache result
    this.cache.set(fullKey, result)

    return result
  }

  /**
   * Memoized function wrapper
   */
  memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn | Promise<TReturn>,
    keyGenerator?: (...args: TArgs) => string
  ): (...args: TArgs) => Promise<TReturn> {
    const fnName = fn.name || 'anonymous'
    
    return async (...args: TArgs): Promise<TReturn> => {
      const key = keyGenerator ? keyGenerator(...args) : `${fnName}_${this.hashArgs(args)}`
      
      return this.compute(key, () => fn(...args))
    }
  }

  /**
   * Get computation statistics
   */
  getComputationStats(): Record<string, {
    calls: number
    averageTime: number
    hitRate: number
    totalTime: number
  }> {
    const result: Record<string, any> = {}
    
    for (const [key, stats] of this.computationStats.entries()) {
      result[key] = {
        calls: stats.calls,
        averageTime: stats.calls > 0 ? stats.totalTime / stats.calls : 0,
        hitRate: stats.calls > 0 ? (stats.hits / stats.calls) * 100 : 0,
        totalTime: stats.totalTime
      }
    }
    
    return result
  }

  /**
   * Clear all cached computations
   */
  clear(): void {
    this.cache.clear()
    this.computationStats.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    return this.cache.getStats()
  }

  private generateKey(baseKey: string, options?: { ttl?: number }): string {
    let key = baseKey
    if (options?.ttl) {
      key += `_ttl_${options.ttl}`
    }
    return key
  }

  private hashArgs(args: any[]): string {
    // Simple hash function for arguments
    return JSON.stringify(args).replace(/[^a-zA-Z0-9]/g, '').substring(0, 50)
  }
}

/**
 * Game-specific caching system
 */
export class GameCache {
  private static instance: GameCache
  private cardCache: LRUCache<string, any>
  private gameStateCache: LRUCache<string, any>
  private computationCache: ComputationCache
  private strategyCache: LRUCache<string, any>

  private constructor() {
    this.cardCache = new LRUCache(1000, 30000) // 30 second TTL
    this.gameStateCache = new LRUCache(200, 10000) // 10 second TTL
    this.computationCache = new ComputationCache(500, 60000) // 1 minute TTL
    this.strategyCache = new LRUCache(100, 300000) // 5 minute TTL
  }

  static getInstance(): GameCache {
    if (!GameCache.instance) {
      GameCache.instance = new GameCache()
    }
    return GameCache.instance
  }

  /**
   * Cache card creation results
   */
  cacheCard(key: string, card: any): void {
    this.cardCache.set(key, card)
  }

  getCachedCard(key: string): any | undefined {
    return this.cardCache.get(key)
  }

  /**
   * Cache game state snapshots
   */
  cacheGameState(gameId: string, turn: number, state: any): void {
    const key = `${gameId}_${turn}`
    this.gameStateCache.set(key, state)
  }

  getCachedGameState(gameId: string, turn: number): any | undefined {
    const key = `${gameId}_${turn}`
    return this.gameStateCache.get(key)
  }

  /**
   * Cache expensive computations
   */
  async cacheComputation<T>(
    key: string,
    computation: () => Promise<T> | T
  ): Promise<T> {
    return this.computationCache.compute(key, computation)
  }

  /**
   * Cache AI strategy decisions
   */
  cacheStrategy(stateHash: string, strategy: any): void {
    this.strategyCache.set(stateHash, strategy)
  }

  getCachedStrategy(stateHash: string): any | undefined {
    return this.strategyCache.get(stateHash)
  }

  /**
   * Get comprehensive cache statistics
   */
  getAllStats(): {
    cards: CacheStats
    gameStates: CacheStats
    computations: CacheStats
    strategies: CacheStats
    overall: {
      totalMemoryUsage: number
      totalHitRate: number
      recommendations: string[]
    }
  } {
    const cardStats = this.cardCache.getStats()
    const gameStateStats = this.gameStateCache.getStats()
    const computationStats = this.computationCache.getCacheStats()
    const strategyStats = this.strategyCache.getStats()

    const totalMemoryUsage = cardStats.memoryUsage + gameStateStats.memoryUsage + 
                            computationStats.memoryUsage + strategyStats.memoryUsage

    const totalRequests = cardStats.totalRequests + gameStateStats.totalRequests + 
                         computationStats.totalRequests + strategyStats.totalRequests

    const totalHits = cardStats.hits + gameStateStats.hits + 
                     computationStats.hits + strategyStats.hits

    const totalHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0

    const recommendations = this.generateCacheRecommendations({
      cardStats,
      gameStateStats,
      computationStats,
      strategyStats
    })

    return {
      cards: cardStats,
      gameStates: gameStateStats,
      computations: computationStats,
      strategies: strategyStats,
      overall: {
        totalMemoryUsage,
        totalHitRate,
        recommendations
      }
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.cardCache.clear()
    this.gameStateCache.clear()
    this.computationCache.clear()
    this.strategyCache.clear()
  }

  /**
   * Optimize cache sizes based on usage patterns
   */
  optimizeCacheSizes(): void {
    const stats = this.getAllStats()
    
    // Resize caches based on hit rates and memory usage
    if (stats.cards.hitRate > 80 && stats.cards.size === stats.cards.maxSize) {
      // Increase card cache size
      this.cardCache = new LRUCache(stats.cards.maxSize * 1.5, 30000)
    }
    
    if (stats.computations.hitRate > 90) {
      // Increase computation cache size
      this.computationCache = new ComputationCache(stats.computations.maxSize * 1.2, 60000)
    }

    // Reduce cache sizes if hit rates are low
    if (stats.strategies.hitRate < 30) {
      this.strategyCache = new LRUCache(Math.max(50, stats.strategies.maxSize * 0.7), 300000)
    }
  }

  private generateCacheRecommendations(stats: {
    cardStats: CacheStats
    gameStateStats: CacheStats
    computationStats: CacheStats
    strategyStats: CacheStats
  }): string[] {
    const recommendations: string[] = []

    if (stats.cardStats.hitRate < 50) {
      recommendations.push('Card cache hit rate is low - consider increasing cache size or TTL')
    }

    if (stats.gameStateStats.hitRate > 90) {
      recommendations.push('Game state cache is very effective - consider increasing size')
    }

    if (stats.computationStats.hitRate < 40) {
      recommendations.push('Computation cache needs optimization - review cache keys and TTL')
    }

    if (stats.strategyStats.missRate > 80) {
      recommendations.push('Strategy cache is underutilized - review caching strategy')
    }

    const totalMemoryMB = (stats.cardStats.memoryUsage + stats.gameStateStats.memoryUsage + 
                          stats.computationStats.memoryUsage + stats.strategyStats.memoryUsage) / (1024 * 1024)

    if (totalMemoryMB > 100) {
      recommendations.push(`High memory usage (${totalMemoryMB.toFixed(2)}MB) - consider reducing cache sizes`)
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache performance is optimal')
    }

    return recommendations
  }
}

/**
 * Multi-level cache system
 */
export class MultiLevelCache<K, V> {
  private l1Cache: LRUCache<K, V> // Fast, small cache
  private l2Cache: LRUCache<K, V> // Slower, larger cache
  private stats = {
    l1Hits: 0,
    l2Hits: 0,
    misses: 0
  }

  constructor(
    l1Size: number = 50,
    l2Size: number = 500,
    l1TTL?: number,
    l2TTL?: number
  ) {
    this.l1Cache = new LRUCache(l1Size, l1TTL)
    this.l2Cache = new LRUCache(l2Size, l2TTL)
  }

  get(key: K): V | undefined {
    // Try L1 first
    let value = this.l1Cache.get(key)
    if (value !== undefined) {
      this.stats.l1Hits++
      return value
    }

    // Try L2
    value = this.l2Cache.get(key)
    if (value !== undefined) {
      this.stats.l2Hits++
      // Promote to L1
      this.l1Cache.set(key, value)
      return value
    }

    this.stats.misses++
    return undefined
  }

  set(key: K, value: V): void {
    this.l1Cache.set(key, value)
    this.l2Cache.set(key, value)
  }

  has(key: K): boolean {
    return this.l1Cache.has(key) || this.l2Cache.has(key)
  }

  delete(key: K): boolean {
    const l1Deleted = this.l1Cache.delete(key)
    const l2Deleted = this.l2Cache.delete(key)
    return l1Deleted || l2Deleted
  }

  clear(): void {
    this.l1Cache.clear()
    this.l2Cache.clear()
    this.stats = { l1Hits: 0, l2Hits: 0, misses: 0 }
  }

  getStats(): {
    l1: CacheStats
    l2: CacheStats
    combined: {
      l1HitRate: number
      l2HitRate: number
      totalHitRate: number
      promotionRate: number
    }
  } {
    const l1Stats = this.l1Cache.getStats()
    const l2Stats = this.l2Cache.getStats()
    
    const totalRequests = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses
    const l1HitRate = totalRequests > 0 ? (this.stats.l1Hits / totalRequests) * 100 : 0
    const l2HitRate = totalRequests > 0 ? (this.stats.l2Hits / totalRequests) * 100 : 0
    const totalHitRate = l1HitRate + l2HitRate
    const promotionRate = this.stats.l2Hits > 0 ? (this.stats.l2Hits / (this.stats.l1Hits + this.stats.l2Hits)) * 100 : 0

    return {
      l1: l1Stats,
      l2: l2Stats,
      combined: {
        l1HitRate,
        l2HitRate,
        totalHitRate,
        promotionRate
      }
    }
  }
}

/**
 * Cache warming utilities
 */
export class CacheWarmer {
  /**
   * Warm up game cache with common data
   */
  static async warmGameCache(cache: GameCache): Promise<void> {
    console.log('Warming up game cache...')
    
    // Pre-compute common card combinations
    const commonCardTypes = ['life', 'challenge', 'insurance']
    const stages = ['youth', 'adult', 'middle_age', 'elderly']
    
    for (const type of commonCardTypes) {
      for (const stage of stages) {
        const key = `${type}_${stage}_common`
        await cache.cacheComputation(key, async () => {
          // Simulate expensive card generation
          return { type, stage, computed: true }
        })
      }
    }
    
    console.log('Cache warming completed')
  }

  /**
   * Pre-populate cache with frequently accessed data
   */
  static prePopulateCache<K, V>(
    cache: Cache<K, V>,
    dataGenerator: () => Array<{ key: K; value: V }>
  ): void {
    const data = dataGenerator()
    for (const item of data) {
      cache.set(item.key, item.value)
    }
  }
}

export { LRUCache, ComputationCache, GameCache, MultiLevelCache }