/**
 * Railway Oriented Programming 実装
 * 
 * 成功と失敗の両方のパスを明示的に扱い、
 * エラーの伝播と回復を型安全に実現
 */

// ===== Result型（Railway の基盤） =====

export abstract class Result<T, E = Error> {
  abstract isOk(): this is Ok<T, E>
  abstract isErr(): this is Err<T, E>
  abstract map<U>(fn: (value: T) => U): Result<U, E>
  abstract mapErr<F>(fn: (error: E) => F): Result<T, F>
  abstract flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>
  abstract recover<U>(fn: (error: E) => Result<U, E>): Result<T | U, E>
  abstract fold<U>(onErr: (error: E) => U, onOk: (value: T) => U): U
  abstract getOr(defaultValue: T): T
  abstract getOrElse(fn: (error: E) => T): T

  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Ok(value)
  }

  static err<T, E = Error>(error: E): Result<T, E> {
    return new Err(error)
  }

  static from<T, E = Error>(
    operation: () => T,
    errorMapper?: (error: unknown) => E
  ): Result<T, E> {
    try {
      return Result.ok(operation())
    } catch (error) {
      const mappedError = errorMapper ? errorMapper(error) : (error as E)
      return Result.err(mappedError)
    }
  }

  static async fromPromise<T, E = Error>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    return promise
      .then(value => Result.ok<T, E>(value))
      .catch(error => {
        const mappedError = errorMapper ? errorMapper(error) : (error as E)
        return Result.err<T, E>(mappedError)
      })
  }

  static all<T, E>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = []
    for (const result of results) {
      if (result.isErr()) {
        return result as Result<T[], E>
      }
      values.push(result.value)
    }
    return Result.ok(values)
  }

  static any<T, E>(results: Result<T, E>[]): Result<T, E[]> {
    const errors: E[] = []
    for (const result of results) {
      if (result.isOk()) {
        return result as Result<T, E[]>
      }
      errors.push(result.error)
    }
    return Result.err(errors)
  }
}

export class Ok<T, E = Error> extends Result<T, E> {
  constructor(public readonly value: T) {
    super()
  }

  isOk(): this is Ok<T, E> {
    return true
  }

  isErr(): this is Err<T, E> {
    return false
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    try {
      return Result.ok(fn(this.value))
    } catch (error) {
      return Result.err(error as E)
    }
  }

  mapErr<F>(_fn: (error: E) => F): Result<T, F> {
    return new Ok<T, F>(this.value)
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    try {
      return fn(this.value)
    } catch (error) {
      return Result.err(error as E)
    }
  }

  recover<U>(_fn: (error: E) => Result<U, E>): Result<T | U, E> {
    return this as Result<T | U, E>
  }

  fold<U>(_onErr: (error: E) => U, onOk: (value: T) => U): U {
    return onOk(this.value)
  }

  getOr(_defaultValue: T): T {
    return this.value
  }

  getOrElse(_fn: (error: E) => T): T {
    return this.value
  }
}

export class Err<T, E = Error> extends Result<T, E> {
  constructor(public readonly error: E) {
    super()
  }

  isOk(): this is Ok<T, E> {
    return false
  }

  isErr(): this is Err<T, E> {
    return true
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Err<U, E>(this.error)
  }

  mapErr<F>(fn: (error: E) => F): Result<T, F> {
    return Result.err(fn(this.error))
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Err<U, E>(this.error)
  }

  recover<U>(fn: (error: E) => Result<U, E>): Result<T | U, E> {
    return fn(this.error) as Result<T | U, E>
  }

  fold<U>(onErr: (error: E) => U, _onOk: (value: T) => U): U {
    return onErr(this.error)
  }

  getOr(defaultValue: T): T {
    return defaultValue
  }

  getOrElse(fn: (error: E) => T): T {
    return fn(this.error)
  }
}

// ===== Railway Functions =====

/**
 * 2つのトラック関数の合成
 */
export const bind = <T, U, E>(
  fn: (value: T) => Result<U, E>
) => (result: Result<T, E>): Result<U, E> => {
  return result.flatMap(fn)
}

/**
 * 1つのトラック関数を2つのトラック関数に変換
 */
export const map = <T, U, E>(
  fn: (value: T) => U
) => (result: Result<T, E>): Result<U, E> => {
  return result.map(fn)
}

/**
 * switch関数（失敗時の復旧）
 */
export const switch_ = <T, E>(
  fn: (error: E) => Result<T, E>
) => (result: Result<T, E>): Result<T, E> => {
  return result.recover(fn)
}

/**
 * tee関数（副作用の実行）
 */
export const tee = <T, E>(
  fn: (value: T) => void
) => (result: Result<T, E>): Result<T, E> => {
  if (result.isOk()) {
    try {
      fn(result.value)
    } catch {
      // teeでの副作用エラーは無視
    }
  }
  return result
}

/**
 * tryCatch関数
 */
export const tryCatch = <T, E>(
  operation: () => T,
  errorHandler: (error: unknown) => E
): Result<T, E> => {
  try {
    return Result.ok(operation())
  } catch (error) {
    return Result.err(errorHandler(error))
  }
}

// ===== Pipeline操作 =====

/**
 * Railway パイプライン
 */
export class Railway<T, E = Error> {
  constructor(private readonly result: Result<T, E>) {}

  static of<T, E = Error>(value: T): Railway<T, E> {
    return new Railway(Result.ok(value))
  }

  static err<T, E = Error>(error: E): Railway<T, E> {
    return new Railway(Result.err(error))
  }

  static from<T, E = Error>(
    operation: () => T,
    errorMapper?: (error: unknown) => E
  ): Railway<T, E> {
    return new Railway(Result.from(operation, errorMapper))
  }

  bind<U>(fn: (value: T) => Result<U, E>): Railway<U, E> {
    return new Railway(this.result.flatMap(fn))
  }

  map<U>(fn: (value: T) => U): Railway<U, E> {
    return new Railway(this.result.map(fn))
  }

  mapErr<F>(fn: (error: E) => F): Railway<T, F> {
    return new Railway(this.result.mapErr(fn))
  }

  switch(fn: (error: E) => Result<T, E>): Railway<T, E> {
    return new Railway(this.result.recover(fn))
  }

  tee(fn: (value: T) => void): Railway<T, E> {
    return new Railway(tee(fn)(this.result))
  }

  validate<F>(
    predicate: (value: T) => boolean,
    error: F
  ): Railway<T, E | F> {
    if (this.result.isOk() && !predicate(this.result.value)) {
      return new Railway(Result.err(error))
    }
    return this as Railway<T, E | F>
  }

  filter<F>(
    predicate: (value: T) => boolean,
    error?: F
  ): Railway<T, E | F> {
    return this.validate(predicate, error ?? ('Filter failed' as unknown as F))
  }

  run(): Result<T, E> {
    return this.result
  }

  fold<U>(onErr: (error: E) => U, onOk: (value: T) => U): U {
    return this.result.fold(onErr, onOk)
  }

  getOr(defaultValue: T): T {
    return this.result.getOr(defaultValue)
  }

  getOrElse(fn: (error: E) => T): T {
    return this.result.getOrElse(fn)
  }
}

// ===== 複数値の処理 =====

/**
 * すべてのResultが成功した場合のみ成功
 */
export const all = <T, E>(results: Result<T, E>[]): Result<T[], E> => {
  return Result.all(results)
}

/**
 * いずれかが成功すれば成功
 */
export const any = <T, E>(results: Result<T, E>[]): Result<T, E[]> => {
  return Result.any(results)
}

/**
 * Railway を並列実行
 */
export const parallel = <T, E>(
  railways: Array<() => Railway<T, E>>
): Railway<T[], E> => {
  const results = railways.map(railway => railway().run())
  return new Railway(all(results))
}

/**
 * Railway を順次実行
 */
export const sequence = <T, E>(
  railways: Array<() => Railway<T, E>>
): Railway<T[], E> => {
  const results: T[] = []
  
  const executeNext = (index: number): Result<T[], E> => {
    if (index >= railways.length) {
      return Result.ok(results)
    }
    
    const result = railways[index]!().run()
    if (result.isErr()) {
      return result as Result<T[], E>
    }
    
    results.push(result.value)
    return executeNext(index + 1)
  }
  
  return new Railway(executeNext(0))
}

// ===== 実用的なヘルパー =====

/**
 * 条件付き実行
 */
export const when = <T, E>(
  condition: boolean,
  railway: () => Railway<T, E>,
  defaultValue: T
): Railway<T, E> => {
  return condition ? railway() : Railway.of(defaultValue)
}

/**
 * Maybe型との相互変換
 */
export const fromMaybe = <T, E>(
  maybe: { isSome(): boolean; getValue(): T },
  error: E
): Result<T, E> => {
  return maybe.isSome() ? Result.ok(maybe.getValue()) : Result.err(error)
}

/**
 * パターンマッチング
 */
export const match = <T, E, U>(
  result: Result<T, E>,
  patterns: {
    ok: (value: T) => U
    err: (error: E) => U
  }
): U => {
  return result.fold(patterns.err, patterns.ok)
}

// ===== デバッグ・ロギング =====

/**
 * 結果をログ出力
 */
export const log = <T, E>(
  label: string = ''
) => (result: Result<T, E>): Result<T, E> => {
  const prefix = label ? `[${label}] ` : ''
  if (result.isOk()) {
    console.log(`${prefix}Success:`, result.value)
  } else {
    console.error(`${prefix}Error:`, result.error)
  }
  return result
}

/**
 * パフォーマンス測定
 */
export const time = <T, E>(
  label: string
) => (railway: Railway<T, E>): Railway<T, E> => {
  const start = performance.now()
  const result = railway.run()
  const end = performance.now()
  console.log(`[${label}] Execution time: ${end - start}ms`)
  return new Railway(result)
}

// ===== 型安全なエラーハンドリング =====

/**
 * 特定のエラー型に対する処理
 */
export const catchError = <T, E, F>(
  errorType: new (...args: any[]) => E,
  handler: (error: E) => Result<T, F>
) => (result: Result<T, E | F>): Result<T, F> => {
  if (result.isErr() && result.error instanceof errorType) {
    return handler(result.error)
  }
  return result as Result<T, F>
}

/**
 * エラーの再投げ
 */
export const rethrow = <T, E>(
  result: Result<T, E>
): T => {
  if (result.isErr()) {
    throw result.error
  }
  return result.value
}