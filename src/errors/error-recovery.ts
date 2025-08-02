/**
 * エラー回復システム
 * 
 * 様々なエラー状況からの自動回復機能を提供し、
 * システムの復旧力（Resilience）を向上させる
 */

import { Railway, Result } from './railway'
import { AsyncRailway } from './async-railway'
import type { AppError} from './error-types';
import { ErrorCategory, ErrorSeverity, isRecoverableError, shouldRetryError } from './error-types'

// ===== 回復戦略の定義 =====

export interface RecoveryStrategy<T, E = AppError> {
  name: string
  canRecover: (error: E) => boolean
  recover: (error: E, context?: RecoveryContext) => Result<T, E>
}

export interface AsyncRecoveryStrategy<T, E = AppError> {
  name: string
  canRecover: (error: E) => boolean
  recover: (error: E, context?: RecoveryContext) => Promise<Result<T, E>>
}

export interface RecoveryContext {
  attemptCount: number
  maxAttempts: number
  lastAttemptTime: Date
  metadata?: Record<string, unknown>
}

export interface RetryPolicy {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
  retryableErrors: Array<new (...args: any[]) => AppError>
}

// ===== 基本的な回復戦略 =====

export const defaultValueStrategy = <T, E>(
  defaultValue: T
): RecoveryStrategy<T, E> => ({
  name: 'defaultValue',
  canRecover: () => true,
  recover: () => Result.ok(defaultValue)
})

export const fallbackValueStrategy = <T, E>(
  fallbackValues: T[]
): RecoveryStrategy<T, E> => {
  let currentIndex = 0
  return {
    name: 'fallbackValue',
    canRecover: () => currentIndex < fallbackValues.length,
    recover: () => {
      if (currentIndex >= fallbackValues.length) {
        return Result.err(new Error('No more fallback values') as E)
      }
      return Result.ok(fallbackValues[currentIndex++]!)
    }
  }
}

export const cacheStrategy = <T, E>(
  cache: Map<string, T>,
  keyExtractor: (error: E, context?: RecoveryContext) => string
): RecoveryStrategy<T, E> => ({
  name: 'cache',
  canRecover: (error, context) => {
    const key = keyExtractor(error, context)
    return cache.has(key)
  },
  recover: (error, context) => {
    const key = keyExtractor(error, context)
    const cachedValue = cache.get(key)
    return cachedValue !== undefined
      ? Result.ok(cachedValue)
      : Result.err(new Error('Cache miss') as E)
  }
})

export const alternativeOperationStrategy = <T, E>(
  alternativeOperation: () => Result<T, E>
): RecoveryStrategy<T, E> => ({
  name: 'alternativeOperation',
  canRecover: () => true,
  recover: () => {
    try {
      return alternativeOperation()
    } catch (error) {
      return Result.err(error as E)
    }
  }
})

// ===== リトライ機能 =====

export class RetryManager<T, E = AppError> {
  private static readonly DEFAULT_POLICY: RetryPolicy = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: []
  }

  constructor(private readonly policy: Partial<RetryPolicy> = {}) {
    this.policy = { ...RetryManager.DEFAULT_POLICY, ...policy }
  }

  retry(
    operation: () => Result<T, E>,
    errorFilter?: (error: E) => boolean
  ): Result<T, E> {
    let lastError: E
    const actualPolicy = this.policy as RetryPolicy
    
    for (let attempt = 1; attempt <= actualPolicy.maxAttempts; attempt++) {
      const result = operation()
      
      if (result.isOk()) {
        return result
      }
      
      lastError = result.error
      
      // 最後の試行の場合は諦める
      if (attempt === actualPolicy.maxAttempts) {
        break
      }
      
      // リトライ可能かチェック
      if (!this.shouldRetry(result.error, errorFilter)) {
        break
      }
      
      // 遅延実行（同期版では実際には遅延しない）
      const delay = this.calculateDelay(attempt)
      // ここで実際の遅延は実装しない（同期処理のため）
    }
    
    return Result.err(lastError!)
  }

  async retryAsync(
    operation: () => Promise<Result<T, E>>,
    errorFilter?: (error: E) => boolean
  ): Promise<Result<T, E>> {
    let lastError: E
    const actualPolicy = this.policy as RetryPolicy
    
    for (let attempt = 1; attempt <= actualPolicy.maxAttempts; attempt++) {
      const result = await operation()
      
      if (result.isOk()) {
        return result
      }
      
      lastError = result.error
      
      // 最後の試行の場合は諦める
      if (attempt === actualPolicy.maxAttempts) {
        break
      }
      
      // リトライ可能かチェック
      if (!this.shouldRetry(result.error, errorFilter)) {
        break
      }
      
      // 遅延実行
      const delay = this.calculateDelay(attempt)
      await this.sleep(delay)
    }
    
    return Result.err(lastError!)
  }

  private shouldRetry(error: E, customFilter?: (error: E) => boolean): boolean {
    // カスタムフィルターがある場合はそれを優先
    if (customFilter) {
      return customFilter(error)
    }
    
    // AppErrorの場合、shouldRetryErrorを使用
    if (error instanceof Error) {
      return shouldRetryError(error)
    }
    
    // 設定されたリトライ可能エラーかチェック
    const actualPolicy = this.policy as RetryPolicy
    return actualPolicy.retryableErrors.some(ErrorClass => error instanceof ErrorClass)
  }

  private calculateDelay(attempt: number): number {
    const actualPolicy = this.policy as RetryPolicy
    let delay = actualPolicy.baseDelay * actualPolicy.backoffMultiplier**(attempt - 1)
    
    // 最大遅延時間を超えないように制限
    delay = Math.min(delay, actualPolicy.maxDelay)
    
    // ジッター追加（ランダムな揺らぎ）
    if (actualPolicy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5)
    }
    
    return Math.floor(delay)
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// ===== サーキットブレーカー =====

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod: number
  expectedErrors: Array<new (...args: any[]) => Error>
}

export class CircuitBreaker<T, E = AppError> {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime?: Date
  private successCount = 0

  private static readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1分
    monitoringPeriod: 10000, // 10秒
    expectedErrors: []
  }

  constructor(private readonly config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...CircuitBreaker.DEFAULT_CONFIG, ...config }
  }

  execute(operation: () => Result<T, E>): Result<T, E> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
      } else {
        return Result.err(new Error('Circuit breaker is OPEN') as E)
      }
    }

    const result = operation()

    if (result.isOk()) {
      this.onSuccess()
    } else {
      this.onFailure(result.error)
    }

    return result
  }

  async executeAsync(operation: () => Promise<Result<T, E>>): Promise<Result<T, E>> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN
      } else {
        return Result.err(new Error('Circuit breaker is OPEN') as E)
      }
    }

    try {
      const result = await operation()

      if (result.isOk()) {
        this.onSuccess()
      } else {
        this.onFailure(result.error)
      }

      return result
    } catch (error) {
      this.onFailure(error as E)
      return Result.err(error as E)
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.successCount++

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED
    }
  }

  private onFailure(error: E): void {
    this.lastFailureTime = new Date()
    this.failureCount++

    const actualConfig = this.config as CircuitBreakerConfig
    if (this.failureCount >= actualConfig.failureThreshold) {
      this.state = CircuitState.OPEN
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false

    const actualConfig = this.config as CircuitBreakerConfig
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime()
    return timeSinceLastFailure >= actualConfig.recoveryTimeout
  }

  getState(): CircuitState {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }

  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.successCount = 0
    this.lastFailureTime = undefined
  }
}

// ===== 統合回復システム =====

export class RecoveryManager<T, E = AppError> {
  private readonly strategies: RecoveryStrategy<T, E>[] = []
  private readonly asyncStrategies: AsyncRecoveryStrategy<T, E>[] = []
  private readonly retryManager: RetryManager<T, E>
  private readonly circuitBreaker?: CircuitBreaker<T, E>

  constructor(
    retryPolicy?: Partial<RetryPolicy>,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    this.retryManager = new RetryManager(retryPolicy)
    if (circuitBreakerConfig) {
      this.circuitBreaker = new CircuitBreaker(circuitBreakerConfig)
    }
  }

  addStrategy(strategy: RecoveryStrategy<T, E>): this {
    this.strategies.push(strategy)
    return this
  }

  addAsyncStrategy(strategy: AsyncRecoveryStrategy<T, E>): this {
    this.asyncStrategies.push(strategy)
    return this
  }

  executeWithRecovery(
    operation: () => Result<T, E>,
    context?: Partial<RecoveryContext>
  ): Result<T, E> {
    const execute = () => {
      if (this.circuitBreaker) {
        return this.circuitBreaker.execute(operation)
      }
      return operation()
    }

    // リトライ付きで実行
    const result = this.retryManager.retry(execute)

    // 失敗した場合は回復戦略を試行
    if (result.isErr()) {
      return this.attemptRecovery(result.error, context)
    }

    return result
  }

  async executeWithRecoveryAsync(
    operation: () => Promise<Result<T, E>>,
    context?: Partial<RecoveryContext>
  ): Promise<Result<T, E>> {
    const execute = async () => {
      if (this.circuitBreaker) {
        return this.circuitBreaker.executeAsync(operation)
      }
      return operation()
    }

    // リトライ付きで実行
    const result = await this.retryManager.retryAsync(execute)

    // 失敗した場合は回復戦略を試行
    if (result.isErr()) {
      return this.attemptRecoveryAsync(result.error, context)
    }

    return result
  }

  private attemptRecovery(
    error: E,
    context?: Partial<RecoveryContext>
  ): Result<T, E> {
    const recoveryContext: RecoveryContext = {
      attemptCount: 1,
      maxAttempts: this.strategies.length,
      lastAttemptTime: new Date(),
      ...context
    }

    for (const strategy of this.strategies) {
      if (strategy.canRecover(error)) {
        const recoveryResult = strategy.recover(error, recoveryContext)
        if (recoveryResult.isOk()) {
          return recoveryResult
        }
      }
      recoveryContext.attemptCount++
    }

    return Result.err(error)
  }

  private async attemptRecoveryAsync(
    error: E,
    context?: Partial<RecoveryContext>
  ): Promise<Result<T, E>> {
    const recoveryContext: RecoveryContext = {
      attemptCount: 1,
      maxAttempts: this.asyncStrategies.length,
      lastAttemptTime: new Date(),
      ...context
    }

    for (const strategy of this.asyncStrategies) {
      if (strategy.canRecover(error)) {
        const recoveryResult = await strategy.recover(error, recoveryContext)
        if (recoveryResult.isOk()) {
          return recoveryResult
        }
      }
      recoveryContext.attemptCount++
    }

    return Result.err(error)
  }
}

// ===== ゲーム固有の回復戦略 =====

export const gameRecoveryStrategies = {
  /**
   * 体力が0になった場合の回復
   */
  vitalityRecovery: <E>(minVitality = 1): RecoveryStrategy<number, E> => ({
    name: 'vitalityRecovery',
    canRecover: () => true,
    recover: () => Result.ok(minVitality)
  }),

  /**
   * 無効なカード操作の回復
   */
  invalidCardOperation: <T, E>(
    alternativeAction: () => T
  ): RecoveryStrategy<T, E> => ({
    name: 'invalidCardOperation',
    canRecover: () => true,
    recover: () => {
      try {
        return Result.ok(alternativeAction())
      } catch (error) {
        return Result.err(error as E)
      }
    }
  }),

  /**
   * ゲーム状態の回復
   */
  gameStateRecovery: <T, E>(
    stateFactory: () => T
  ): RecoveryStrategy<T, E> => ({
    name: 'gameStateRecovery',
    canRecover: () => true,
    recover: () => {
      try {
        return Result.ok(stateFactory())
      } catch (error) {
        return Result.err(error as E)
      }
    }
  })
}

// ===== ヘルパー関数 =====

export const withRecovery = <T, E>(
  operation: () => Result<T, E>,
  ...strategies: RecoveryStrategy<T, E>[]
): Result<T, E> => {
  const manager = new RecoveryManager<T, E>()
  strategies.forEach(strategy => manager.addStrategy(strategy))
  return manager.executeWithRecovery(operation)
}

export const withAsyncRecovery = async <T, E>(
  operation: () => Promise<Result<T, E>>,
  ...strategies: AsyncRecoveryStrategy<T, E>[]
): Promise<Result<T, E>> => {
  const manager = new RecoveryManager<T, E>()
  strategies.forEach(strategy => manager.addAsyncStrategy(strategy))
  return manager.executeWithRecoveryAsync(operation)
}

export const createRetryPolicy = (
  maxAttempts: number,
  baseDelay = 1000,
  backoffMultiplier = 2
): RetryPolicy => ({
  maxAttempts,
  baseDelay,
  maxDelay: baseDelay * backoffMultiplier**(maxAttempts - 1),
  backoffMultiplier,
  jitter: true,
  retryableErrors: []
})