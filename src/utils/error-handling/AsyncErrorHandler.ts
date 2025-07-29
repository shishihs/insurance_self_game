/**
 * 非同期処理のエラー管理を強化するユーティリティ
 * すべての非同期処理を安全に実行する
 */

import { GlobalErrorHandler } from './ErrorHandler'

export interface AsyncOptions {
  retries?: number
  retryDelay?: number
  timeout?: number
  fallbackValue?: any
  onError?: (error: Error) => void
  errorCategory?: 'network' | 'async' | 'user' | 'system'
}

export interface AsyncResult<T> {
  data?: T
  error?: Error
  retryCount?: number
  duration?: number
}

/**
 * Promise を安全に実行するラッパー
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  options: AsyncOptions = {}
): Promise<AsyncResult<T>> {
  const {
    retries = 0,
    retryDelay = 1000,
    timeout = 0,
    fallbackValue,
    onError,
    errorCategory = 'async'
  } = options

  const startTime = Date.now()
  let lastError: Error | undefined
  let retryCount = 0

  // タイムアウト処理
  const withTimeout = timeout > 0
    ? Promise.race([
        promise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Operation timed out after ${timeout}ms`)), timeout)
        )
      ])
    : promise

  // リトライロジック
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await withTimeout
      return {
        data,
        retryCount,
        duration: Date.now() - startTime
      }
    } catch (error) {
      lastError = error as Error
      retryCount = attempt

      // エラーハンドラーに報告
      const errorHandler = GlobalErrorHandler.getInstance()
      errorHandler.handleError({
        message: lastError.message,
        stack: lastError.stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        severity: 'medium',
        category: errorCategory
      })

      // カスタムエラーハンドラーを実行
      if (onError) {
        onError(lastError)
      }

      // 最後の試行でなければリトライ
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  // すべての試行が失敗した場合
  return {
    error: lastError,
    data: fallbackValue,
    retryCount,
    duration: Date.now() - startTime
  }
}

/**
 * 複数のPromiseを安全に並列実行
 */
export async function safeAsyncAll<T>(
  promises: Promise<T>[],
  options: AsyncOptions = {}
): Promise<AsyncResult<T>[]> {
  const results = await Promise.allSettled(
    promises.map(promise => safeAsync(promise, options))
  )

  return results.map(result => {
    if (result.status === 'fulfilled') {
      return result.value
    } else {
      return {
        error: result.reason,
        data: options.fallbackValue
      }
    }
  })
}

/**
 * 非同期関数をデコレートして自動エラーハンドリングを追加
 */
export function withAsyncErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: AsyncOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const result = await safeAsync(fn(...args), options)
    
    if (result.error) {
      throw result.error
    }
    
    return result.data
  }) as T
}

/**
 * 非同期イテレーターを安全に処理
 */
export async function* safeAsyncIterator<T>(
  iterator: AsyncIterator<T>,
  options: AsyncOptions = {}
): AsyncGenerator<T, void, unknown> {
  while (true) {
    try {
      const { done, value } = await iterator.next()
      if (done) break
      yield value
    } catch (error) {
      const errorHandler = GlobalErrorHandler.getInstance()
      errorHandler.handleError({
        message: (error as Error).message,
        stack: (error as Error).stack,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        severity: 'medium',
        category: options.errorCategory || 'async'
      })

      if (options.onError) {
        options.onError(error as Error)
      }

      // フォールバック値を yield するか、イテレーションを終了
      if (options.fallbackValue !== undefined) {
        yield options.fallbackValue
      } else {
        break
      }
    }
  }
}

/**
 * デバウンスされた非同期関数
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number,
  options: AsyncOptions = {}
): (...args: Parameters<T>) => Promise<AsyncResult<Awaited<ReturnType<T>>>> {
  let timeoutId: number | null = null
  let pendingPromise: Promise<AsyncResult<Awaited<ReturnType<T>>>> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    if (!pendingPromise) {
      pendingPromise = new Promise((resolve) => {
        timeoutId = window.setTimeout(async () => {
          const result = await safeAsync(fn(...args), options)
          pendingPromise = null
          resolve(result)
        }, delay)
      })
    }

    return pendingPromise
  }
}

/**
 * スロットリングされた非同期関数
 */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  limit: number,
  options: AsyncOptions = {}
): (...args: Parameters<T>) => Promise<AsyncResult<Awaited<ReturnType<T>>> | null> {
  let lastCall = 0
  let lastResult: AsyncResult<Awaited<ReturnType<T>>> | null = null

  return async (...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastCall < limit) {
      return lastResult
    }

    lastCall = now
    lastResult = await safeAsync(fn(...args), options)
    return lastResult
  }
}

/**
 * 非同期キューを管理
 */
export class AsyncQueue<T> {
  private queue: Array<() => Promise<T>> = []
  private running = false
  private concurrency: number
  private results: AsyncResult<T>[] = []

  constructor(concurrency = 1) {
    this.concurrency = concurrency
  }

  /**
   * タスクをキューに追加
   */
  add(task: () => Promise<T>, options: AsyncOptions = {}): Promise<AsyncResult<T>> {
    return new Promise((resolve) => {
      this.queue.push(async () => {
        const result = await safeAsync(task(), options)
        this.results.push(result)
        resolve(result)
        return result.data as T
      })

      if (!this.running) {
        this.process()
      }
    })
  }

  /**
   * キューを処理
   */
  private async process(): Promise<void> {
    this.running = true
    const executing: Promise<any>[] = []

    while (this.queue.length > 0 || executing.length > 0) {
      while (executing.length < this.concurrency && this.queue.length > 0) {
        const task = this.queue.shift()
        if (task) {
          const promise = task().finally(() => {
            executing.splice(executing.indexOf(promise), 1)
          })
          executing.push(promise)
        }
      }

      if (executing.length > 0) {
        await Promise.race(executing)
      }
    }

    this.running = false
  }

  /**
   * すべてのタスクが完了するまで待機
   */
  async waitAll(): Promise<AsyncResult<T>[]> {
    while (this.running || this.queue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    return this.results
  }

  /**
   * キューをクリア
   */
  clear(): void {
    this.queue = []
    this.results = []
  }
}

/**
 * 非同期処理のメモ化
 */
export function memoizeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: {
    ttl?: number
    keyGenerator?: (...args: Parameters<T>) => string
    asyncOptions?: AsyncOptions
  } = {}
): T {
  const cache = new Map<string, { value: any; timestamp: number }>()
  const { ttl = 60000, keyGenerator = (...args) => JSON.stringify(args), asyncOptions = {} } = options

  return (async (...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    const cached = cache.get(key)
    const now = Date.now()

    if (cached && now - cached.timestamp < ttl) {
      return cached.value
    }

    const result = await safeAsync(fn(...args), asyncOptions)
    
    if (!result.error) {
      cache.set(key, { value: result.data, timestamp: now })
    }

    if (result.error) {
      throw result.error
    }

    return result.data
  }) as T
}

/**
 * 条件付き非同期実行
 */
export async function conditionalAsync<T>(
  condition: () => boolean | Promise<boolean>,
  thenFn: () => Promise<T>,
  elseFn?: () => Promise<T>,
  options: AsyncOptions = {}
): Promise<AsyncResult<T>> {
  try {
    const shouldExecute = await safeAsync(
      Promise.resolve(condition()),
      { ...options, errorCategory: 'system' }
    )

    if (shouldExecute.error) {
      return { error: shouldExecute.error }
    }

    if (shouldExecute.data) {
      return await safeAsync(thenFn(), options)
    } else if (elseFn) {
      return await safeAsync(elseFn(), options)
    }

    return { data: undefined as any }
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * 非同期パイプライン
 */
export async function asyncPipeline<T>(
  initial: T,
  ...fns: Array<(value: any) => Promise<any>>
): Promise<AsyncResult<any>> {
  let result: any = initial
  
  for (const fn of fns) {
    const stepResult = await safeAsync(fn(result))
    if (stepResult.error) {
      return stepResult
    }
    result = stepResult.data
  }

  return { data: result }
}