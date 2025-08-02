/**
 * Batch processing configuration
 */
export interface BatchConfig {
  /** Maximum batch size */
  maxBatchSize: number
  /** Maximum wait time before processing batch (ms) */
  maxWaitTime: number
  /** Minimum batch size to trigger processing */
  minBatchSize: number
  /** Enable parallel processing within batches */
  enableParallelProcessing: boolean
  /** Maximum concurrent operations */
  maxConcurrency: number
  /** Retry configuration */
  retryConfig?: {
    maxRetries: number
    retryDelay: number
    backoffMultiplier: number
  }
}

/**
 * Batch processing result
 */
export interface BatchResult<T, R> {
  /** Successfully processed items */
  successful: Array<{ item: T; result: R }>
  /** Failed items with errors */
  failed: Array<{ item: T; error: Error }>
  /** Batch processing statistics */
  stats: BatchStats
}

/**
 * Batch processing statistics
 */
export interface BatchStats {
  /** Total items processed */
  totalItems: number
  /** Successfully processed items */
  successfulItems: number
  /** Failed items */
  failedItems: number
  /** Success rate percentage */
  successRate: number
  /** Total processing time */
  processingTime: number
  /** Average time per item */
  averageTimePerItem: number
  /** Batch size used */
  batchSize: number
  /** Number of batches */
  batchCount: number
}

/**
 * High-performance batch processor
 */
export class BatchProcessor<T, R> {
  private config: BatchConfig
  private pendingItems: T[] = []
  private processor: (items: T[]) => Promise<R[]>
  private timeoutHandle: ReturnType<typeof setTimeout>Timeout | null = null
  private isProcessing: boolean = false
  private processingQueue: Array<{
    items: T[]
    resolve: (result: BatchResult<T, R>) => void
    reject: (error: Error) => void
  }> = []

  constructor(
    processor: (items: T[]) => Promise<R[]>,
    config: Partial<BatchConfig> = {}
  ) {
    this.processor = processor
    this.config = {
      maxBatchSize: 100,
      maxWaitTime: 1000, // 1 second
      minBatchSize: 1,
      enableParallelProcessing: true,
      maxConcurrency: 4,
      retryConfig: {
        maxRetries: 3,
        retryDelay: 1000,
        backoffMultiplier: 2
      },
      ...config
    }
  }

  /**
   * Add item to batch for processing
   */
  async addItem(item: T): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      this.pendingItems.push(item)
      
      // Store resolve/reject for this specific item
      const itemIndex = this.pendingItems.length - 1
      
      // Trigger batch processing if conditions are met
      this.checkTriggerConditions()
      
      // Set up a way to resolve this specific item's promise
      this.scheduleItemResolution(itemIndex, resolve, reject)
    })
  }

  /**
   * Add multiple items to batch
   */
  async addItems(items: T[]): Promise<BatchResult<T, R>> {
    return new Promise<BatchResult<T, R>>((resolve, reject) => {
      this.pendingItems.push(...items)
      
      this.processingQueue.push({
        items: [...items],
        resolve,
        reject
      })
      
      this.checkTriggerConditions()
    })
  }

  /**
   * Force immediate processing of pending items
   */
  async flush(): Promise<BatchResult<T, R>> {
    if (this.pendingItems.length === 0) {
      return {
        successful: [],
        failed: [],
        stats: {
          totalItems: 0,
          successfulItems: 0,
          failedItems: 0,
          successRate: 100,
          processingTime: 0,
          averageTimePerItem: 0,
          batchSize: 0,
          batchCount: 0
        }
      }
    }

    return this.processBatch()
  }

  /**
   * Get current batch status
   */
  getStatus(): {
    pendingItems: number
    isProcessing: boolean
    queuedBatches: number
    nextProcessingIn: number
  } {
    const nextProcessingIn = this.timeoutHandle ? 
      this.config.maxWaitTime - (Date.now() % this.config.maxWaitTime) : 0

    return {
      pendingItems: this.pendingItems.length,
      isProcessing: this.isProcessing,
      queuedBatches: this.processingQueue.length,
      nextProcessingIn
    }
  }

  /**
   * Clear all pending items
   */
  clear(): void {
    this.pendingItems = []
    this.processingQueue = []
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = null
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BatchConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  // === Private Methods ===

  private scheduleItemResolution(
    itemIndex: number,
    resolve: (result: R) => void,
    reject: (error: Error) => void
  ): void {
    // This is a simplified approach - in a real implementation,
    // you'd need to track individual item promises more carefully
    setTimeout(() => {
      if (itemIndex < this.pendingItems.length) {
        this.flush().then(result => {
          if (result.successful.length > itemIndex) {
            resolve(result.successful[itemIndex].result)
          } else if (result.failed.length > 0) {
            reject(result.failed[0].error)
          } else {
            reject(new Error('Item processing failed'))
          }
        }).catch(reject)
      }
    }, this.config.maxWaitTime)
  }

  private checkTriggerConditions(): void {
    const shouldTrigger = 
      this.pendingItems.length >= this.config.maxBatchSize ||
      (this.pendingItems.length >= this.config.minBatchSize && !this.timeoutHandle)

    if (shouldTrigger && !this.isProcessing) {
      this.scheduleBatchProcessing()
    } else if (!this.timeoutHandle && this.pendingItems.length > 0) {
      this.startWaitTimer()
    }
  }

  private scheduleBatchProcessing(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle)
      this.timeoutHandle = null
    }

    // Use setImmediate for immediate processing
    setImmediate(() => {
      this.processBatch()
    })
  }

  private startWaitTimer(): void {
    if (this.timeoutHandle) return

    this.timeoutHandle = setTimeout(() => {
      this.timeoutHandle = null
      if (this.pendingItems.length > 0 && !this.isProcessing) {
        this.processBatch()
      }
    }, this.config.maxWaitTime)
  }

  private async processBatch(): Promise<BatchResult<T, R>> {
    if (this.isProcessing) {
      // Wait for current processing to complete
      return new Promise((resolve) => {
        const checkProcessing = () => {
          if (!this.isProcessing) {
            resolve(this.processBatch())
          } else {
            setTimeout(checkProcessing, 10)
          }
        }
        checkProcessing()
      })
    }

    this.isProcessing = true
    const startTime = performance.now()

    try {
      // Extract current batch
      const batchItems = this.pendingItems.splice(0, this.config.maxBatchSize)
      if (batchItems.length === 0) {
        return this.createEmptyResult()
      }

      // Process batch
      const results = await this.processWithRetry(batchItems)
      const endTime = performance.now()

      // Create result
      const batchResult: BatchResult<T, R> = {
        successful: batchItems.map((item, index) => ({
          item,
          result: results[index]
        })),
        failed: [],
        stats: {
          totalItems: batchItems.length,
          successfulItems: batchItems.length,
          failedItems: 0,
          successRate: 100,
          processingTime: endTime - startTime,
          averageTimePerItem: (endTime - startTime) / batchItems.length,
          batchSize: batchItems.length,
          batchCount: 1
        }
      }

      // Resolve pending promises
      this.resolvePendingPromises(batchResult)

      return batchResult

    } catch (error) {
      // Handle batch processing error
      const errorResult = this.createErrorResult(error as Error)
      this.resolvePendingPromises(errorResult)
      return errorResult
    } finally {
      this.isProcessing = false
      
      // Check if there are more items to process
      if (this.pendingItems.length > 0) {
        this.checkTriggerConditions()
      }
    }
  }

  private async processWithRetry(items: T[]): Promise<R[]> {
    const { retryConfig } = this.config
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= (retryConfig?.maxRetries || 0); attempt++) {
      try {
        if (this.config.enableParallelProcessing && items.length > 1) {
          return await this.processInParallel(items)
        } else {
          return await this.processor(items)
        }
      } catch (error) {
        lastError = error as Error
        
        if (attempt < (retryConfig?.maxRetries || 0)) {
          const delay = (retryConfig?.retryDelay || 1000) * 
                       Math.pow(retryConfig?.backoffMultiplier || 2, attempt)
          await this.sleep(delay)
        }
      }
    }

    throw lastError || new Error('Batch processing failed')
  }

  private async processInParallel(items: T[]): Promise<R[]> {
    const chunks = this.chunkArray(items, this.config.maxConcurrency)
    const results: R[] = []

    for (const chunk of chunks) {
      const chunkResults = await this.processor(chunk)
      results.push(...chunkResults)
    }

    return results
  }

  private chunkArray<U>(array: U[], chunkSize: number): U[][] {
    const chunks: U[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private resolvePendingPromises(result: BatchResult<T, R>): void {
    // Resolve all pending promises in the queue
    while (this.processingQueue.length > 0) {
      const pending = this.processingQueue.shift()!
      pending.resolve(result)
    }
  }

  private createEmptyResult(): BatchResult<T, R> {
    return {
      successful: [],
      failed: [],
      stats: {
        totalItems: 0,
        successfulItems: 0,
        failedItems: 0,
        successRate: 100,
        processingTime: 0,
        averageTimePerItem: 0,
        batchSize: 0,
        batchCount: 0
      }
    }
  }

  private createErrorResult(error: Error): BatchResult<T, R> {
    const failedItems = this.pendingItems.map(item => ({ item, error }))
    
    return {
      successful: [],
      failed: failedItems,
      stats: {
        totalItems: failedItems.length,
        successfulItems: 0,
        failedItems: failedItems.length,
        successRate: 0,
        processingTime: 0,
        averageTimePerItem: 0,
        batchSize: failedItems.length,
        batchCount: 1
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Game-specific batch processors
 */
export class GameBatchProcessors {
  /**
   * Batch processor for card operations
   */
  static createCardProcessor(): BatchProcessor<CardOperation, CardResult> {
    return new BatchProcessor<CardOperation, CardResult>(
      async (operations) => {
        return operations.map(op => {
          // Simulate card processing
          return {
            cardId: op.cardId,
            success: true,
            result: `Processed ${op.operation} for card ${op.cardId}`
          }
        })
      },
      {
        maxBatchSize: 50,
        maxWaitTime: 500,
        enableParallelProcessing: true,
        maxConcurrency: 4
      }
    )
  }

  /**
   * Batch processor for game state updates
   */
  static createGameStateProcessor(): BatchProcessor<GameStateUpdate, GameStateResult> {
    return new BatchProcessor<GameStateUpdate, GameStateResult>(
      async (updates) => {
        // Process game state updates in batch
        return updates.map(update => ({
          gameId: update.gameId,
          success: true,
          newState: { ...update.state, updated: true }
        }))
      },
      {
        maxBatchSize: 20,
        maxWaitTime: 200,
        enableParallelProcessing: false, // Game states need sequential processing
        maxConcurrency: 1
      }
    )
  }

  /**
   * Batch processor for statistics collection
   */
  static createStatsProcessor(): BatchProcessor<StatEntry, StatResult> {
    return new BatchProcessor<StatEntry, StatResult>(
      async (entries) => {
        // Aggregate statistics in batch
        const aggregated = entries.reduce((acc, entry) => {
          if (!acc[entry.type]) {
            acc[entry.type] = { count: 0, total: 0 }
          }
          acc[entry.type].count++
          acc[entry.type].total += entry.value
          return acc
        }, {} as Record<string, { count: number; total: number }>)

        return entries.map(entry => ({
          entryId: entry.id,
          processed: true,
          aggregatedValue: aggregated[entry.type].total / aggregated[entry.type].count
        }))
      },
      {
        maxBatchSize: 200,
        maxWaitTime: 2000,
        enableParallelProcessing: true,
        maxConcurrency: 2
      }
    )
  }
}

/**
 * Batch processor manager for coordinating multiple processors
 */
export class BatchProcessorManager {
  private processors = new Map<string, BatchProcessor<any, any>>()
  private stats = {
    totalBatches: 0,
    totalItems: 0,
    totalProcessingTime: 0
  }

  /**
   * Register a batch processor
   */
  registerProcessor<T, R>(
    name: string,
    processor: BatchProcessor<T, R>
  ): void {
    this.processors.set(name, processor)
  }

  /**
   * Get a registered processor
   */
  getProcessor<T, R>(name: string): BatchProcessor<T, R> | undefined {
    return this.processors.get(name)
  }

  /**
   * Process item using named processor
   */
  async processItem<T, R>(processorName: string, item: T): Promise<R> {
    const processor = this.processors.get(processorName)
    if (!processor) {
      throw new Error(`Processor '${processorName}' not found`)
    }

    const result = await processor.addItem(item)
    this.updateStats(1)
    return result
  }

  /**
   * Flush all processors
   */
  async flushAll(): Promise<Record<string, BatchResult<any, any>>> {
    const results: Record<string, BatchResult<any, any>> = {}
    
    for (const [name, processor] of this.processors) {
      try {
        const result = await processor.flush()
        results[name] = result
        this.updateStats(result.stats.totalItems, result.stats.processingTime)
      } catch (error) {
        console.error(`Error flushing processor '${name}':`, error)
      }
    }

    return results
  }

  /**
   * Get status of all processors
   */
  getAllStatus(): Record<string, any> {
    const status: Record<string, any> = {}
    
    for (const [name, processor] of this.processors) {
      status[name] = processor.getStatus()
    }

    return status
  }

  /**
   * Get manager statistics
   */
  getStats(): {
    totalBatches: number
    totalItems: number
    totalProcessingTime: number
    averageItemsPerBatch: number
    averageProcessingTime: number
  } {
    return {
      ...this.stats,
      averageItemsPerBatch: this.stats.totalBatches > 0 ? 
        this.stats.totalItems / this.stats.totalBatches : 0,
      averageProcessingTime: this.stats.totalBatches > 0 ? 
        this.stats.totalProcessingTime / this.stats.totalBatches : 0
    }
  }

  /**
   * Clear all processors
   */
  clearAll(): void {
    for (const processor of this.processors.values()) {
      processor.clear()
    }
    this.stats = { totalBatches: 0, totalItems: 0, totalProcessingTime: 0 }
  }

  private updateStats(items: number, processingTime: number = 0): void {
    this.stats.totalBatches++
    this.stats.totalItems += items
    this.stats.totalProcessingTime += processingTime
  }
}

// Type definitions for game-specific batch operations

export interface CardOperation {
  cardId: string
  operation: 'create' | 'update' | 'delete' | 'validate'
  data?: any
}

export interface CardResult {
  cardId: string
  success: boolean
  result: any
}

export interface GameStateUpdate {
  gameId: string
  state: any
  timestamp: number
}

export interface GameStateResult {
  gameId: string
  success: boolean
  newState: any
}

export interface StatEntry {
  id: string
  type: string
  value: number
  timestamp: number
}

export interface StatResult {
  entryId: string
  processed: boolean
  aggregatedValue: number
}

/**
 * Utility functions for batch processing optimization
 */
export class BatchOptimizationUtils {
  /**
   * Calculate optimal batch size based on processing characteristics
   */
  static calculateOptimalBatchSize(
    itemProcessingTime: number,
    overhead: number,
    memoryConstraint: number
  ): number {
    // Simple formula to balance throughput and memory usage
    const timeBasedOptimal = Math.ceil(overhead / itemProcessingTime)
    const memoryBasedOptimal = Math.floor(memoryConstraint / 1000) // Assume 1KB per item
    
    return Math.min(Math.max(timeBasedOptimal, 10), memoryBasedOptimal, 1000)
  }

  /**
   * Auto-tune batch processor configuration
   */
  static async autoTuneBatchProcessor<T, R>(
    processor: BatchProcessor<T, R>,
    testItems: T[],
    targetLatency: number
  ): Promise<BatchConfig> {
    const configs = [
      { maxBatchSize: 10, maxWaitTime: 100 },
      { maxBatchSize: 50, maxWaitTime: 500 },
      { maxBatchSize: 100, maxWaitTime: 1000 },
      { maxBatchSize: 200, maxWaitTime: 2000 }
    ]

    let bestConfig = configs[0]
    let bestScore = 0

    for (const config of configs) {
      processor.updateConfig(config)
      
      const startTime = performance.now()
      await processor.addItems(testItems.slice(0, 100))
      const endTime = performance.now()
      
      const latency = endTime - startTime
      const score = latency <= targetLatency ? 
        (1000 / latency) * config.maxBatchSize : 0

      if (score > bestScore) {
        bestScore = score
        bestConfig = config
      }
    }

    return {
      maxBatchSize: bestConfig.maxBatchSize,
      maxWaitTime: bestConfig.maxWaitTime,
      minBatchSize: Math.max(1, Math.floor(bestConfig.maxBatchSize * 0.1)),
      enableParallelProcessing: true,
      maxConcurrency: 4
    }
  }
}

export { BatchProcessor, BatchProcessorManager }