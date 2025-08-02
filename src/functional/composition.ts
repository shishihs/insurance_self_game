/**
 * 関数合成とパイプライン操作
 * 
 * 複雑な処理を小さな純粋関数の組み合わせで表現し、
 * 可読性と再利用性を向上させる
 */

// ===== 基本的な関数合成 =====

/**
 * 右から左への関数合成
 */
export const compose = <A, B, C>(
  f: (b: B) => C,
  g: (a: A) => B
): ((a: A) => C) => (a: A) => f(g(a))

export const compose3 = <A, B, C, D>(
  f: (c: C) => D,
  g: (b: B) => C,
  h: (a: A) => B
): ((a: A) => D) => (a: A) => f(g(h(a)))

export const compose4 = <A, B, C, D, E>(
  f: (d: D) => E,
  g: (c: C) => D,
  h: (b: B) => C,
  i: (a: A) => B
): ((a: A) => E) => (a: A) => f(g(h(i(a))))

/**
 * 左から右へのパイプライン
 */
export const pipe = <T>(initial: T) => new Pipeline(initial)

class Pipeline<T> {
  constructor(private readonly value: T) {}

  pipe<U>(fn: (value: T) => U): Pipeline<U> {
    return new Pipeline(fn(this.value))
  }

  map<U>(fn: (value: T) => U): Pipeline<U> {
    return this.pipe(fn)
  }

  filter(predicate: (value: T) => boolean): Pipeline<T | undefined> {
    return new Pipeline(predicate(this.value) ? this.value : undefined)
  }

  tap(sideEffect: (value: T) => void): Pipeline<T> {
    sideEffect(this.value)
    return this
  }

  unwrap(): T {
    return this.value
  }

  get(): T {
    return this.value
  }
}

/**
 * 関数型パイプライン演算子
 */
export const flow = <A extends readonly unknown[], B>(
  ...fns: readonly [(...args: A) => B, ...Array<(a: B) => B>]
): ((...args: A) => B) => {
  return (...args: A) => fns.slice(1).reduce((acc, fn) => fn(acc), fns[0](...args))
}

export const flow2 = <A, B, C>(
  f1: (a: A) => B,
  f2: (b: B) => C
): ((a: A) => C) => (a: A) => f2(f1(a))

export const flow3 = <A, B, C, D>(
  f1: (a: A) => B,
  f2: (b: B) => C,
  f3: (c: C) => D
): ((a: A) => D) => (a: A) => f3(f2(f1(a)))

// ===== 条件付き合成 =====

/**
 * 条件に基づく分岐処理
 */
export const branch = <T, U>(
  predicate: (value: T) => boolean,
  onTrue: (value: T) => U,
  onFalse: (value: T) => U
) => (value: T): U => predicate(value) ? onTrue(value) : onFalse(value)

export const when = <T>(
  predicate: (value: T) => boolean,
  transform: (value: T) => T
) => (value: T): T => predicate(value) ? transform(value) : value

export const unless = <T>(
  predicate: (value: T) => boolean,
  transform: (value: T) => T
) => (value: T): T => predicate(value) ? value : transform(value)

/**
 * マルチ分岐処理
 */
export const cond = <T, U>(
  conditions: Array<[(value: T) => boolean, (value: T) => U]>
) => (value: T): U | undefined => {
  for (const [predicate, transform] of conditions) {
    if (predicate(value)) {
      return transform(value)
    }
  }
  return undefined
}

export const match = <T, U>(value: T) => ({
  when: (predicate: (value: T) => boolean, result: U) => ({
    when: (nextPredicate: (value: T) => boolean, nextResult: U) => 
      match(value).when(nextPredicate, nextResult).when(predicate, result),
    otherwise: (defaultResult: U): U => 
      predicate(value) ? result : defaultResult
  }),
  otherwise: (defaultResult: U): U => defaultResult
})

// ===== カリー化とパーシャル適用 =====

/**
 * カリー化ヘルパー
 */
export const curry2 = <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) => (b: B) => fn(a, b)

export const curry3 = <A, B, C, D>(fn: (a: A, b: B, c: C) => D) =>
  (a: A) => (b: B) => (c: C) => fn(a, b, c)

export const curry4 = <A, B, C, D, E>(fn: (a: A, b: B, c: C, d: D) => E) =>
  (a: A) => (b: B) => (c: C) => (d: D) => fn(a, b, c, d)

/**
 * パーシャル適用
 */
export const partial = <T extends readonly unknown[], U>(
  fn: (...args: T) => U,
  ...partialArgs: Partial<T>
) => (...remainingArgs: unknown[]): U => 
  fn(...(partialArgs.concat(remainingArgs) as T))

export const partialRight = <T extends readonly unknown[], U>(
  fn: (...args: T) => U,
  ...partialArgs: Partial<T>
) => (...remainingArgs: unknown[]): U =>
  fn(...(remainingArgs.concat(partialArgs) as T))

// ===== 非同期処理の合成 =====

/**
 * Promise合成
 */
export const asyncPipe = <T>(initial: Promise<T>) => new AsyncPipeline(initial)

class AsyncPipeline<T> {
  constructor(private readonly promise: Promise<T>) {}

  pipe<U>(fn: (value: T) => Promise<U>): AsyncPipeline<U> {
    return new AsyncPipeline(this.promise.then(fn))
  }

  map<U>(fn: (value: T) => U): AsyncPipeline<U> {
    return new AsyncPipeline(this.promise.then(fn))
  }

  filter(predicate: (value: T) => boolean): AsyncPipeline<T | undefined> {
    return new AsyncPipeline(
      this.promise.then(value => predicate(value) ? value : undefined)
    )
  }

  tap(sideEffect: (value: T) => void): AsyncPipeline<T> {
    return new AsyncPipeline(
      this.promise.then(value => {
        sideEffect(value)
        return value
      })
    )
  }

  catch<U>(handler: (error: Error) => U): AsyncPipeline<T | U> {
    return new AsyncPipeline(this.promise.catch(handler))
  }

  async unwrap(): Promise<T> {
    return this.promise
  }
}

/**
 * 非同期関数の合成
 */
export const composeAsync = <A, B, C>(
  f: (b: B) => Promise<C>,
  g: (a: A) => Promise<B>
) => async (a: A): Promise<C> => f(await g(a))

export const flowAsync = <A, B, C, D>(
  f1: (a: A) => Promise<B>,
  f2: (b: B) => Promise<C>,
  f3: (c: C) => Promise<D>
) => async (a: A): Promise<D> => f3(await f2(await f1(a)))

// ===== 高階関数 =====

/**
 * 関数の装飾
 */
export const withLogging = <T extends unknown[], U>(
  fn: (...args: T) => U,
  label?: string
) => (...args: T): U => {
  const name = label ?? fn.name || 'anonymous'
  console.log(`[${name}] Called with:`, args)
  const result = fn(...args)
  console.log(`[${name}] Returned:`, result)
  return result
}

export const withTiming = <T extends unknown[], U>(
  fn: (...args: T) => U,
  label?: string
) => (...args: T): U => {
  const name = label ?? fn.name || 'anonymous'
  const start = performance.now()
  const result = fn(...args)
  const end = performance.now()
  console.log(`[${name}] Execution time: ${end - start}ms`)
  return result
}

export const withRetry = <T extends unknown[], U>(
  fn: (...args: T) => U,
  maxAttempts = 3,
  delay = 1000
) => async (...args: T): Promise<U> => {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.resolve(fn(...args))
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError!
}

/**
 * 関数の組み合わせ
 */
export const allOf = <T>(
  ...predicates: Array<(value: T) => boolean>
) => (value: T): boolean => predicates.every(predicate => predicate(value))

export const anyOf = <T>(
  ...predicates: Array<(value: T) => boolean>
) => (value: T): boolean => predicates.some(predicate => predicate(value))

export const noneOf = <T>(
  ...predicates: Array<(value: T) => boolean>
) => (value: T): boolean => !predicates.some(predicate => predicate(value))

// ===== 関数型ユーティリティ =====

/**
 * 関数の反転
 */
export const flip = <A, B, C>(fn: (a: A, b: B) => C) =>
  (b: B, a: A): C => fn(a, b)

/**
 * 引数の順序変更
 */
export const rearg = <T extends readonly unknown[], U>(
  fn: (...args: T) => U,
  ...indices: number[]
) => (...args: unknown[]): U => {
  const reorderedArgs = indices.map(index => args[index]) as T
  return fn(...reorderedArgs)
}

/**
 * 関数のスプレッド
 */
export const spread = <T, U>(fn: (args: T[]) => U) =>
  (...args: T[]): U => fn(args)

export const unspread = <T extends readonly unknown[], U>(fn: (...args: T) => U) =>
  (args: T): U => fn(...args)

/**
 * 引数の変換
 */
export const mapArgs = <T extends readonly unknown[], U extends readonly unknown[], V>(
  fn: (...args: U) => V,
  transform: (...args: T) => U
) => (...args: T): V => fn(...transform(...args))

/**
 * デバウンスとスロットル（関数型版）
 */
export const debounced = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) => {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: T): void => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => { fn(...args); }, delay)
  }
}

export const throttled = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
) => {
  let lastCall = 0
  return (...args: T): void => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

// ===== 実用例 =====

/**
 * データ処理パイプラインの例
 */
export const processGameData = flow3(
  (data: unknown[]) => data.filter((item): item is object => typeof item === 'object' && item !== null),
  (objects: object[]) => objects.map(obj => ({ ...obj, processed: true })),
  (processedData: Array<object & { processed: boolean }>) => processedData.length
)

/**
 * バリデーションパイプライン
 */
export const validateUser = (user: unknown) =>
  pipe(user)
    .pipe(user => typeof user === 'object' && user !== null ? user as Record<string, unknown> : null)
    .pipe(obj => obj && typeof obj.name === 'string' ? obj : null)
    .pipe(obj => obj && typeof obj.email === 'string' && obj.email.includes('@') ? obj : null)
    .unwrap()

export { Pipeline, AsyncPipeline }