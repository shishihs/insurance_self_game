/**
 * Generic object pool for reducing garbage collection pressure
 */
export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn: (obj: T) => void
  private maxSize: number
  private created: number = 0
  private reused: number = 0
  private poolHits: number = 0
  private poolMisses: number = 0

  constructor(
    createFn: () => T,
    resetFn: (obj: T) => void,
    initialSize: number = 10,
    maxSize: number = 100
  ) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.createFn())
      this.created++
    }
  }

  /**
   * Get an object from the pool
   */
  acquire(): T {
    let obj: T

    if (this.pool.length > 0) {
      obj = this.pool.pop()!
      this.poolHits++
      this.reused++
    } else {
      obj = this.createFn()
      this.poolMisses++
      this.created++
    }

    return obj
  }

  /**
   * Return an object to the pool
   */
  release(obj: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(obj)
      this.pool.push(obj)
    }
    // If pool is full, let object be garbage collected
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const totalRequests = this.poolHits + this.poolMisses
    const hitRate = totalRequests > 0 ? (this.poolHits / totalRequests) * 100 : 0

    return {
      poolSize: this.pool.length,
      maxSize: this.maxSize,
      created: this.created,
      reused: this.reused,
      hitRate,
      missRate: 100 - hitRate,
      totalRequests,
      efficiency: this.reused / Math.max(this.created, 1)
    }
  }

  /**
   * Clear the pool
   */
  clear(): void {
    this.pool.length = 0
  }

  /**
   * Resize the pool
   */
  resize(newMaxSize: number): void {
    this.maxSize = newMaxSize
    while (this.pool.length > newMaxSize) {
      this.pool.pop()
    }
  }
}

/**
 * Pool statistics
 */
export interface PoolStats {
  poolSize: number
  maxSize: number
  created: number
  reused: number
  hitRate: number
  missRate: number
  totalRequests: number
  efficiency: number
}

/**
 * Card object pool for game optimization
 */
export class CardPool {
  private static instance: CardPool
  private cardPool: ObjectPool<PooledCard>
  private arrayPool: ObjectPool<PooledCard[]>

  private constructor() {
    this.cardPool = new ObjectPool<PooledCard>(
      () => new PooledCard(),
      (card) => card.reset(),
      50, // Initial size
      200 // Max size
    )

    this.arrayPool = new ObjectPool<PooledCard[]>(
      () => [],
      (array) => { array.length = 0 },
      20,
      100
    )
  }

  static getInstance(): CardPool {
    if (!CardPool.instance) {
      CardPool.instance = new CardPool()
    }
    return CardPool.instance
  }

  /**
   * Get a card from the pool
   */
  acquireCard(): PooledCard {
    return this.cardPool.acquire()
  }

  /**
   * Return a card to the pool
   */
  releaseCard(card: PooledCard): void {
    this.cardPool.release(card)
  }

  /**
   * Get an array from the pool
   */
  acquireArray(): PooledCard[] {
    return this.arrayPool.acquire()
  }

  /**
   * Return an array to the pool
   */
  releaseArray(array: PooledCard[]): void {
    this.arrayPool.release(array)
  }

  /**
   * Get comprehensive pool statistics
   */
  getStats(): { cards: PoolStats; arrays: PoolStats } {
    return {
      cards: this.cardPool.getStats(),
      arrays: this.arrayPool.getStats()
    }
  }

  /**
   * Clear all pools
   */
  clearAll(): void {
    this.cardPool.clear()
    this.arrayPool.clear()
  }
}

/**
 * Pooled card implementation
 */
class PooledCard {
  public id: string = ''
  public name: string = ''
  public power: number = 0
  public cost: number = 0
  public type: string = ''
  public stage: string = ''
  public description: string = ''
  public category: string = ''
  public isActive: boolean = false
  public metadata: Record<string, any> = {}

  /**
   * Initialize card with data
   */
  initialize(data: Partial<PooledCard>): void {
    this.id = data.id || ''
    this.name = data.name || ''
    this.power = data.power || 0
    this.cost = data.cost || 0
    this.type = data.type || ''
    this.stage = data.stage || ''
    this.description = data.description || ''
    this.category = data.category || ''
    this.isActive = data.isActive || false
    this.metadata = { ...data.metadata } || {}
  }

  /**
   * Reset card to default state
   */
  reset(): void {
    this.id = ''
    this.name = ''
    this.power = 0
    this.cost = 0
    this.type = ''
    this.stage = ''
    this.description = ''
    this.category = ''
    this.isActive = false
    this.metadata = {}
  }

  /**
   * Clone card data
   */
  clone(): PooledCard {
    const clone = CardPool.getInstance().acquireCard()
    clone.initialize(this)
    return clone
  }
}

/**
 * Game state object pool
 */
export class GameStatePool {
  private static instance: GameStatePool
  private statePool: ObjectPool<PooledGameState>
  private statsPool: ObjectPool<PooledPlayerStats>

  private constructor() {
    this.statePool = new ObjectPool<PooledGameState>(
      () => new PooledGameState(),
      (state) => state.reset(),
      10,
      50
    )

    this.statsPool = new ObjectPool<PooledPlayerStats>(
      () => new PooledPlayerStats(),
      (stats) => stats.reset(),
      20,
      100
    )
  }

  static getInstance(): GameStatePool {
    if (!GameStatePool.instance) {
      GameStatePool.instance = new GameStatePool()
    }
    return GameStatePool.instance
  }

  acquireGameState(): PooledGameState {
    return this.statePool.acquire()
  }

  releaseGameState(state: PooledGameState): void {
    this.statePool.release(state)
  }

  acquirePlayerStats(): PooledPlayerStats {
    return this.statsPool.acquire()
  }

  releasePlayerStats(stats: PooledPlayerStats): void {
    this.statsPool.release(stats)
  }

  getStats(): { states: PoolStats; stats: PoolStats } {
    return {
      states: this.statePool.getStats(),
      stats: this.statsPool.getStats()
    }
  }
}

/**
 * Pooled game state
 */
class PooledGameState {
  public turn: number = 0
  public phase: string = ''
  public stage: string = ''
  public vitality: number = 0
  public maxVitality: number = 0
  public status: string = ''
  public insuranceBurden: number = 0
  public playerHand: PooledCard[] = []
  public insuranceCards: PooledCard[] = []
  public discardPile: PooledCard[] = []
  public currentChallenge: PooledCard | null = null

  initialize(data: Partial<PooledGameState>): void {
    this.turn = data.turn || 0
    this.phase = data.phase || ''
    this.stage = data.stage || ''
    this.vitality = data.vitality || 0
    this.maxVitality = data.maxVitality || 0
    this.status = data.status || ''
    this.insuranceBurden = data.insuranceBurden || 0
    
    // Note: Arrays should be managed separately to avoid deep copying
    this.playerHand = data.playerHand || []
    this.insuranceCards = data.insuranceCards || []
    this.discardPile = data.discardPile || []
    this.currentChallenge = data.currentChallenge || null
  }

  reset(): void {
    this.turn = 0
    this.phase = ''
    this.stage = ''
    this.vitality = 0
    this.maxVitality = 0
    this.status = ''
    this.insuranceBurden = 0
    this.playerHand = []
    this.insuranceCards = []
    this.discardPile = []
    this.currentChallenge = null
  }
}

/**
 * Pooled player statistics
 */
class PooledPlayerStats {
  public totalChallenges: number = 0
  public successfulChallenges: number = 0
  public failedChallenges: number = 0
  public cardsAcquired: number = 0
  public highestVitality: number = 0
  public turnsPlayed: number = 0
  public gameStartTime: number = 0
  public gameEndTime: number = 0

  initialize(data: Partial<PooledPlayerStats>): void {
    this.totalChallenges = data.totalChallenges || 0
    this.successfulChallenges = data.successfulChallenges || 0
    this.failedChallenges = data.failedChallenges || 0
    this.cardsAcquired = data.cardsAcquired || 0
    this.highestVitality = data.highestVitality || 0
    this.turnsPlayed = data.turnsPlayed || 0
    this.gameStartTime = data.gameStartTime || 0
    this.gameEndTime = data.gameEndTime || 0
  }

  reset(): void {
    this.totalChallenges = 0
    this.successfulChallenges = 0
    this.failedChallenges = 0
    this.cardsAcquired = 0
    this.highestVitality = 0
    this.turnsPlayed = 0
    this.gameStartTime = 0
    this.gameEndTime = 0
  }

  getSuccessRate(): number {
    return this.totalChallenges > 0 ? this.successfulChallenges / this.totalChallenges : 0
  }

  getGameDuration(): number {
    return this.gameEndTime - this.gameStartTime
  }
}

/**
 * Pool manager for coordinating all object pools
 */
export class PoolManager {
  private static instance: PoolManager
  private pools: Map<string, ObjectPool<any>> = new Map()
  private monitoringEnabled: boolean = false
  private monitoringInterval: NodeJS.Timeout | null = null

  private constructor() {}

  static getInstance(): PoolManager {
    if (!PoolManager.instance) {
      PoolManager.instance = new PoolManager()
    }
    return PoolManager.instance
  }

  /**
   * Register a pool for monitoring
   */
  registerPool<T>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool)
  }

  /**
   * Get statistics for all pools
   */
  getAllStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {}
    
    // Include built-in pools
    const cardPool = CardPool.getInstance()
    const cardStats = cardPool.getStats()
    stats['cards'] = cardStats.cards
    stats['cardArrays'] = cardStats.arrays

    const gameStatePool = GameStatePool.getInstance()
    const stateStats = gameStatePool.getStats()
    stats['gameStates'] = stateStats.states
    stats['playerStats'] = stateStats.stats

    // Include registered pools
    for (const [name, pool] of this.pools) {
      stats[name] = pool.getStats()
    }

    return stats
  }

  /**
   * Start monitoring pool performance
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringEnabled) {
      this.stopMonitoring()
    }

    this.monitoringEnabled = true
    this.monitoringInterval = setInterval(() => {
      this.logPoolStats()
    }, intervalMs)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.monitoringEnabled = false
  }

  /**
   * Clear all pools
   */
  clearAllPools(): void {
    CardPool.getInstance().clearAll()
    // Additional pool clearing logic
    
    for (const pool of this.pools.values()) {
      pool.clear()
    }
  }

  /**
   * Get memory efficiency report
   */
  getEfficiencyReport(): PoolEfficiencyReport {
    const allStats = this.getAllStats()
    let totalCreated = 0
    let totalReused = 0
    let totalHits = 0
    let totalRequests = 0

    for (const stats of Object.values(allStats)) {
      totalCreated += stats.created
      totalReused += stats.reused
      totalHits += (stats.hitRate / 100) * stats.totalRequests
      totalRequests += stats.totalRequests
    }

    const overallHitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0
    const overallEfficiency = totalCreated > 0 ? totalReused / totalCreated : 0
    const memoryReduction = totalReused > 0 ? (totalReused / (totalCreated + totalReused)) * 100 : 0

    return {
      overallHitRate,
      overallEfficiency,
      memoryReduction,
      totalObjectsCreated: totalCreated,
      totalObjectsReused: totalReused,
      estimatedMemorySaved: this.estimateMemorySaved(totalReused),
      recommendations: this.generateOptimizationRecommendations(allStats)
    }
  }

  /**
   * Log pool statistics
   */
  private logPoolStats(): void {
    const stats = this.getAllStats()
    console.log('=== Object Pool Statistics ===')
    
    for (const [name, poolStats] of Object.entries(stats)) {
      console.log(`${name}: ${poolStats.poolSize}/${poolStats.maxSize} objects, ${poolStats.hitRate.toFixed(1)}% hit rate`)
    }
    
    const efficiency = this.getEfficiencyReport()
    console.log(`Overall efficiency: ${(efficiency.overallEfficiency * 100).toFixed(1)}%, Memory saved: ${efficiency.estimatedMemorySaved.toFixed(2)}MB`)
  }

  /**
   * Estimate memory saved by object pooling
   */
  private estimateMemorySaved(totalReused: number): number {
    // Rough estimate: each object saves ~100 bytes of allocation overhead
    const bytesPerObject = 100
    return (totalReused * bytesPerObject) / (1024 * 1024) // Convert to MB
  }

  /**
   * Generate optimization recommendations
   */
  private generateOptimizationRecommendations(stats: Record<string, PoolStats>): string[] {
    const recommendations: string[] = []

    for (const [name, poolStats] of Object.entries(stats)) {
      if (poolStats.hitRate < 50) {
        recommendations.push(`${name}: Low hit rate (${poolStats.hitRate.toFixed(1)}%) - consider increasing pool size`)
      }
      
      if (poolStats.poolSize === poolStats.maxSize && poolStats.missRate > 20) {
        recommendations.push(`${name}: Pool frequently at capacity - consider increasing max size`)
      }
      
      if (poolStats.efficiency < 0.5) {
        recommendations.push(`${name}: Low reuse efficiency - review object lifecycle`)
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Object pools are performing optimally')
    }

    return recommendations
  }
}

/**
 * Pool efficiency report
 */
export interface PoolEfficiencyReport {
  overallHitRate: number
  overallEfficiency: number
  memoryReduction: number
  totalObjectsCreated: number
  totalObjectsReused: number
  estimatedMemorySaved: number
  recommendations: string[]
}

/**
 * Utility decorators for automatic pool management
 */
export function pooled<T>(pool: ObjectPool<T>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = function (...args: any[]) {
      const pooledObject = pool.acquire()
      try {
        return originalMethod.apply(this, [pooledObject, ...args])
      } finally {
        pool.release(pooledObject)
      }
    }

    return descriptor
  }
}

/**
 * Auto-releasing pool wrapper
 */
export class AutoReleasingPool<T> {
  constructor(private pool: ObjectPool<T>) {}

  /**
   * Use an object with automatic cleanup
   */
  async use<R>(fn: (obj: T) => Promise<R> | R): Promise<R> {
    const obj = this.pool.acquire()
    try {
      return await fn(obj)
    } finally {
      this.pool.release(obj)
    }
  }
}

export { PooledCard, PooledGameState, PooledPlayerStats }