/**
 * 非同期Railway Oriented Programming
 * 
 * Promise、async/awaitと組み合わせた
 * 非同期エラーハンドリングの実装
 */

import { Err, Ok, Result } from './railway'
import type { AppError } from './error-types'

// ===== AsyncResult型 =====

export type AsyncResult<T, E = AppError> = Promise<Result<T, E>>

export class AsyncRailway<T, E = AppError> {
  constructor(private readonly asyncResult: AsyncResult<T, E>) {}

  static of<T, E = AppError>(value: T): AsyncRailway<T, E> {
    return new AsyncRailway(Promise.resolve(Result.ok(value)))
  }

  static err<T, E = AppError>(error: E): AsyncRailway<T, E> {
    return new AsyncRailway(Promise.resolve(Result.err(error)))
  }

  static fromPromise<T, E = AppError>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => E
  ): AsyncRailway<T, E> {
    const asyncResult = promise
      .then(value => Result.ok<T, E>(value))
      .catch(error => {
        const mappedError = errorMapper ? errorMapper(error) : (error as E)
        return Result.err<T, E>(mappedError)
      })
    return new AsyncRailway(asyncResult)
  }

  static fromResult<T, E = AppError>(result: Result<T, E>): AsyncRailway<T, E> {
    return new AsyncRailway(Promise.resolve(result))
  }

  static tryCatch<T, E = AppError>(
    operation: () => Promise<T>,
    errorMapper: (error: unknown) => E
  ): AsyncRailway<T, E> {
    const asyncResult = operation()
      .then(value => Result.ok<T, E>(value))
      .catch(error => Result.err<T, E>(errorMapper(error)))
    return new AsyncRailway(asyncResult)
  }

  // 基本操作
  async map<U>(fn: (value: T) => U): Promise<AsyncRailway<U, E>> {
    const result = await this.asyncResult
    if (result.isErr()) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(result.error)))
    }
    
    try {
      const newValue = fn(result.value)
      return new AsyncRailway(Promise.resolve(Result.ok(newValue)))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(error as E)))
    }
  }

  async mapAsync<U>(fn: (value: T) => Promise<U>): Promise<AsyncRailway<U, E>> {
    const result = await this.asyncResult
    if (result.isErr()) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(result.error)))
    }

    try {
      const newValue = await fn(result.value)
      return new AsyncRailway(Promise.resolve(Result.ok(newValue)))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(error as E)))
    }
  }

  async flatMap<U>(
    fn: (value: T) => AsyncResult<U, E>
  ): Promise<AsyncRailway<U, E>> {
    const result = await this.asyncResult
    if (result.isErr()) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(result.error)))
    }

    try {
      const newAsyncResult = await fn(result.value)
      return new AsyncRailway(Promise.resolve(newAsyncResult))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(error as E)))
    }
  }

  async flatMapAsync<U>(
    fn: (value: T) => Promise<AsyncResult<U, E>>
  ): Promise<AsyncRailway<U, E>> {
    const result = await this.asyncResult
    if (result.isErr()) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(result.error)))
    }

    try {
      const newAsyncResult = await fn(result.value)
      return new AsyncRailway(newAsyncResult)
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<U, E>(error as E)))
    }
  }

  async mapErr<F>(fn: (error: E) => F): Promise<AsyncRailway<T, F>> {
    const result = await this.asyncResult
    if (result.isOk()) {
      return new AsyncRailway(Promise.resolve(Result.ok<T, F>(result.value)))
    }

    try {
      const newError = fn(result.error)
      return new AsyncRailway(Promise.resolve(Result.err<T, F>(newError)))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<T, F>(error as F)))
    }
  }

  // エラー回復
  async recover<U>(
    fn: (error: E) => AsyncResult<U, E>
  ): Promise<AsyncRailway<T | U, E>> {
    const result = await this.asyncResult
    if (result.isOk()) {
      return new AsyncRailway(Promise.resolve(result as Result<T | U, E>))
    }

    try {
      const recoveredResult = await fn(result.error)
      return new AsyncRailway(Promise.resolve(recoveredResult as Result<T | U, E>))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<T | U, E>(error as E)))
    }
  }

  async recoverWith<U>(
    fn: (error: E) => U
  ): Promise<AsyncRailway<T | U, E>> {
    const result = await this.asyncResult
    if (result.isOk()) {
      return new AsyncRailway(Promise.resolve(result as Result<T | U, E>))
    }

    try {
      const recoveredValue = fn(result.error)
      return new AsyncRailway(Promise.resolve(Result.ok<T | U, E>(recoveredValue)))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<T | U, E>(error as E)))
    }
  }

  // バリデーション
  async validate<F>(
    predicate: (value: T) => boolean | Promise<boolean>,
    error: F
  ): Promise<AsyncRailway<T, E | F>> {
    const result = await this.asyncResult
    if (result.isErr()) {
      return new AsyncRailway(Promise.resolve(result as Result<T, E | F>))
    }

    try {
      const isValid = await predicate(result.value)
      return isValid
        ? new AsyncRailway(Promise.resolve(Result.ok<T, E | F>(result.value)))
        : new AsyncRailway(Promise.resolve(Result.err<T, E | F>(error)))
    } catch (catchError) {
      return new AsyncRailway(Promise.resolve(Result.err<T, E | F>(catchError as E | F)))
    }
  }

  // 副作用
  async tap(fn: (value: T) => void | Promise<void>): Promise<AsyncRailway<T, E>> {
    const result = await this.asyncResult
    if (result.isOk()) {
      try {
        await fn(result.value)
      } catch {
        // tapでのエラーは無視
      }
    }
    return this
  }

  async tapErr(fn: (error: E) => void | Promise<void>): Promise<AsyncRailway<T, E>> {
    const result = await this.asyncResult
    if (result.isErr()) {
      try {
        await fn(result.error)
      } catch {
        // tapErrでのエラーは無視
      }
    }
    return this
  }

  // タイムアウト処理
  timeout<F>(
    timeoutMs: number,
    timeoutError: F
  ): AsyncRailway<T, E | F> {
    const timeoutPromise = new Promise<Result<T, E | F>>(resolve => {
      setTimeout(() => { resolve(Result.err(timeoutError)); }, timeoutMs)
    })

    const racePromise = Promise.race([
      this.asyncResult.then(result => result as Result<T, E | F>),
      timeoutPromise
    ])

    return new AsyncRailway(racePromise)
  }

  // リトライ処理
  retry(
    maxAttempts: number,
    delay = 1000,
    backoffMultiplier = 1
  ): AsyncRailway<T, E> {
    const attemptOperation = async (attempt: number): Promise<Result<T, E>> => {
      const result = await this.asyncResult
      
      if (result.isOk() || attempt >= maxAttempts) {
        return result
      }

      // 遅延実行
      if (delay > 0) {
        const actualDelay = delay * backoffMultiplier**(attempt - 1)
        await new Promise(resolve => setTimeout(resolve, actualDelay))
      }

      return attemptOperation(attempt + 1)
    }

    return new AsyncRailway(attemptOperation(1))
  }

  // 並列処理
  static async all<T, E>(
    railways: AsyncRailway<T, E>[]
  ): Promise<AsyncRailway<T[], E>> {
    try {
      const results = await Promise.all(railways.map(async r => r.run()))
      const values: T[] = []
      
      for (const result of results) {
        if (result.isErr()) {
          return new AsyncRailway(Promise.resolve(Result.err<T[], E>(result.error)))
        }
        values.push(result.value)
      }
      
      return new AsyncRailway(Promise.resolve(Result.ok(values)))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<T[], E>(error as E)))
    }
  }

  static async race<T, E>(
    railways: AsyncRailway<T, E>[]
  ): Promise<AsyncRailway<T, E>> {
    try {
      const result = await Promise.race(railways.map(async r => r.run()))
      return new AsyncRailway(Promise.resolve(result))
    } catch (error) {
      return new AsyncRailway(Promise.resolve(Result.err<T, E>(error as E)))
    }
  }

  // 結果の取得
  async run(): Promise<Result<T, E>> {
    return this.asyncResult
  }

  async fold<U>(
    onErr: (error: E) => U | Promise<U>,
    onOk: (value: T) => U | Promise<U>
  ): Promise<U> {
    const result = await this.asyncResult
    return result.isOk() ? onOk(result.value) : onErr(result.error)
  }

  async getOr(defaultValue: T): Promise<T> {
    const result = await this.asyncResult
    return result.getOr(defaultValue)
  }

  async getOrElse(fn: (error: E) => T | Promise<T>): Promise<T> {
    const result = await this.asyncResult
    return result.isOk() ? result.value : fn(result.error)
  }
}

// ===== ユーティリティ関数 =====

export const asyncOk = <T, E = AppError>(value: T): AsyncRailway<T, E> =>
  AsyncRailway.of(value)

export const asyncErr = <T, E = AppError>(error: E): AsyncRailway<T, E> =>
  AsyncRailway.err(error)

export const fromPromise = <T, E = AppError>(
  promise: Promise<T>,
  errorMapper?: (error: unknown) => E
): AsyncRailway<T, E> =>
  AsyncRailway.fromPromise(promise, errorMapper)

export const fromAsyncOperation = <T, E = AppError>(
  operation: () => Promise<T>,
  errorMapper: (error: unknown) => E
): AsyncRailway<T, E> =>
  AsyncRailway.tryCatch(operation, errorMapper)

// ===== パイプライン操作 =====

export const asyncBind = <T, U, E>(
  fn: (value: T) => AsyncResult<U, E>
) => async (railway: AsyncRailway<T, E>): Promise<AsyncRailway<U, E>> =>
  railway.flatMap(fn)

export const asyncMap = <T, U, E>(
  fn: (value: T) => U | Promise<U>
) => async (railway: AsyncRailway<T, E>): Promise<AsyncRailway<U, E>> => {
  const result = await railway.run()
  if (result.isErr()) {
    return AsyncRailway.err(result.error)
  }

  try {
    const newValue = await fn(result.value)
    return AsyncRailway.of(newValue)
  } catch (error) {
    return AsyncRailway.err(error as E)
  }
}

export const asyncTee = <T, E>(
  fn: (value: T) => void | Promise<void>
) => async (railway: AsyncRailway<T, E>): Promise<AsyncRailway<T, E>> =>
  railway.tap(fn)

export const asyncSwitch = <T, E>(
  fn: (error: E) => AsyncResult<T, E>
) => async (railway: AsyncRailway<T, E>): Promise<AsyncRailway<T, E>> =>
  railway.recover(fn)

// ===== 組み合わせ操作 =====

export const sequence = async <T, E>(
  operations: Array<() => AsyncRailway<T, E>>
): Promise<AsyncRailway<T[], E>> => {
  const results: T[] = []
  
  for (const operation of operations) {
    const railway = operation()
    const result = await railway.run()
    
    if (result.isErr()) {
      return AsyncRailway.err(result.error)
    }
    
    results.push(result.value)
  }
  
  return AsyncRailway.of(results)
}

export const parallel = async <T, E>(
  operations: Array<() => AsyncRailway<T, E>>
): Promise<AsyncRailway<T[], E>> => {
  const railways = operations.map(op => op())
  return AsyncRailway.all(railways)
}

// ===== 条件分岐 =====

export const asyncWhen = <T, E>(
  condition: boolean | (() => boolean | Promise<boolean>),
  thenRailway: () => AsyncRailway<T, E>,
  elseRailway: () => AsyncRailway<T, E>
): AsyncRailway<T, E> => {
  return AsyncRailway.tryCatch(async () => {
    const conditionResult = typeof condition === 'function' 
      ? await condition() 
      : condition
      
    const selectedRailway = conditionResult ? thenRailway() : elseRailway()
    const result = await selectedRailway.run()
    
    if (result.isErr()) {
      throw result.error
    }
    
    return result.value
  }, error => error as E)
}

// ===== 型安全なバッチ処理 =====

export class AsyncBatch<E = AppError> {
  private readonly operations: Array<() => AsyncRailway<unknown, E>> = []

  add<T>(operation: () => AsyncRailway<T, E>): this {
    this.operations.push(operation)
    return this
  }

  async executeSequentially(): Promise<AsyncRailway<unknown[], E>> {
    return sequence(this.operations)
  }

  async executeParallel(): Promise<AsyncRailway<unknown[], E>> {
    return parallel(this.operations)
  }

  async executeWithFailFast(): Promise<AsyncRailway<unknown[], E>> {
    const railways = this.operations.map(op => op())
    return AsyncRailway.all(railways)
  }
}