/**
 * 非同期処理の関数型パターン
 * 
 * Promise、async/await、およびリアクティブストリームを
 * 関数型プログラミングの原則に基づいて扱う
 */

import { Either, Maybe } from './monads'

// ===== AsyncResult Monad =====

export type AsyncResult<E, A> = Promise<Either<E, A>>

export const AsyncResult = {
  /**
   * 成功値でAsyncResultを作成
   */
  ok: async <E, A>(value: A): AsyncResult<E, A> => 
    Promise.resolve(Either.right(value)),

  /**
   * エラー値でAsyncResultを作成
   */
  err: async <E, A>(error: E): AsyncResult<E, A> => 
    Promise.resolve(Either.left(error)),

  /**
   * 同期値からAsyncResultを作成
   */
  of: async <E, A>(value: A): AsyncResult<E, A> =>
    AsyncResult.ok(value),

  /**
   * try-catch処理をAsyncResultに変換
   */
  tryCatch: async <E, A>(
    operation: () => Promise<A>,
    onError: (error: unknown) => E
  ): AsyncResult<E, A> => {
    try {
      const result = await operation()
      return Either.right(result)
    } catch (error) {
      return Either.left(onError(error))
    }
  },

  /**
   * map操作
   */
  map: <E, A, B>(
    f: (value: A) => B
  ) => async (asyncResult: AsyncResult<E, A>): AsyncResult<E, B> => {
    const result = await asyncResult
    return result.map(f)
  },

  /**
   * flatMap操作
   */
  flatMap: <E, A, B>(
    f: (value: A) => AsyncResult<E, B>
  ) => async (asyncResult: AsyncResult<E, A>): AsyncResult<E, B> => {
    const result = await asyncResult
    if (result.isLeft()) {
      return Either.left(result.getValue())
    }
    return f(result.getValue())
  },

  /**
   * mapError操作
   */
  mapError: <E1, E2, A>(
    f: (error: E1) => E2
  ) => async (asyncResult: AsyncResult<E1, A>): AsyncResult<E2, A> => {
    const result = await asyncResult
    return result.mapLeft(f)
  },

  /**
   * fold操作
   */
  fold: <E, A, B>(
    onError: (error: E) => B,
    onSuccess: (value: A) => B
  ) => async (asyncResult: AsyncResult<E, A>): Promise<B> => {
    const result = await asyncResult
    return result.fold(onError, onSuccess)
  },

  /**
   * 複数のAsyncResultを並列実行
   */
  all: async <E, A>(
    asyncResults: readonly AsyncResult<E, A>[]
  ): AsyncResult<E, A[]> => {
    try {
      const results = await Promise.all(asyncResults)
      const values: A[] = []
      
      for (const result of results) {
        if (result.isLeft()) {
          return Either.left(result.getValue())
        }
        values.push(result.getValue())
      }
      
      return Either.right(values)
    } catch (error) {
      return Either.left(error as E)
    }
  },

  /**
   * 最初に成功したAsyncResultを返す
   */
  race: async <E, A>(
    asyncResults: readonly AsyncResult<E, A>[]
  ): AsyncResult<E, A> => {
    try {
      const result = await Promise.race(asyncResults)
      return result
    } catch (error) {
      return Either.left(error as E)
    }
  }
}

// ===== TaskEither Monad =====

export class TaskEither<E, A> {
  constructor(private readonly task: () => Promise<Either<E, A>>) {}

  static of<E, A>(value: A): TaskEither<E, A> {
    return new TaskEither(async () => Promise.resolve(Either.right(value)))
  }

  static left<E, A>(error: E): TaskEither<E, A> {
    return new TaskEither(async () => Promise.resolve(Either.left(error)))
  }

  static right<E, A>(value: A): TaskEither<E, A> {
    return TaskEither.of(value)
  }

  static tryCatch<E, A>(
    operation: () => Promise<A>,
    onError: (error: unknown) => E
  ): TaskEither<E, A> {
    return new TaskEither(async () => {
      try {
        const result = await operation()
        return Either.right(result)
      } catch (error) {
        return Either.left(onError(error))
      }
    })
  }

  map<B>(f: (value: A) => B): TaskEither<E, B> {
    return new TaskEither(async () => {
      const result = await this.task()
      return result.map(f)
    })
  }

  mapLeft<E2>(f: (error: E) => E2): TaskEither<E2, A> {
    return new TaskEither(async () => {
      const result = await this.task()
      return result.mapLeft(f)
    })
  }

  flatMap<B>(f: (value: A) => TaskEither<E, B>): TaskEither<E, B> {
    return new TaskEither(async () => {
      const result = await this.task()
      if (result.isLeft()) {
        return Either.left(result.getValue())
      }
      return f(result.getValue()).run()
    })
  }

  chain<B>(f: (value: A) => TaskEither<E, B>): TaskEither<E, B> {
    return this.flatMap(f)
  }

  fold<B>(
    onError: (error: E) => B,
    onSuccess: (value: A) => B
  ): Task<B> {
    return new Task(async () => {
      const result = await this.task()
      return result.fold(onError, onSuccess)
    })
  }

  async run(): Promise<Either<E, A>> {
    return this.task()
  }

  // ユーティリティメソッド
  timeout(ms: number, timeoutError: E): TaskEither<E, A> {
    return new TaskEither(async () => 
      Promise.race([
        this.task(),
        new Promise<Either<E, A>>(resolve => 
          setTimeout(() => { resolve(Either.left(timeoutError)); }, ms)
        )
      ])
    )
  }

  retry(attempts: number, delay = 0): TaskEither<E, A> {
    return new TaskEither(async () => {
      for (let i = 0; i < attempts; i++) {
        const result = await this.task()
        if (result.isRight() || i === attempts - 1) {
          return result
        }
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
      // This should never be reached due to the loop logic
      return Either.left(new Error('Retry failed') as unknown as E)
    })
  }
}

// ===== Task Monad =====

export class Task<A> {
  constructor(private readonly task: () => Promise<A>) {}

  static of<A>(value: A): Task<A> {
    return new Task(async () => Promise.resolve(value))
  }

  static fromPromise<A>(promise: Promise<A>): Task<A> {
    return new Task(async () => promise)
  }

  map<B>(f: (value: A) => B): Task<B> {
    return new Task(async () => f(await this.task()))
  }

  flatMap<B>(f: (value: A) => Task<B>): Task<B> {
    return new Task(async () => {
      const value = await this.task()
      return f(value).run()
    })
  }

  chain<B>(f: (value: A) => Task<B>): Task<B> {
    return this.flatMap(f)
  }

  async run(): Promise<A> {
    return this.task()
  }

  delay(ms: number): Task<A> {
    return new Task(async () => {
      await new Promise(resolve => setTimeout(resolve, ms))
      return this.run()
    })
  }
}

// ===== Observable/Stream パターン =====

export class Observable<T> {
  constructor(
    private readonly subscribe: (observer: Observer<T>) => Subscription
  ) {}

  static of<T>(...values: T[]): Observable<T> {
    return new Observable(observer => {
      values.forEach(value => { observer.next(value); })
      observer.complete()
      return { unsubscribe: () => {} }
    })
  }

  static fromPromise<T>(promise: Promise<T>): Observable<T> {
    return new Observable(observer => {
      promise
        .then(value => {
          observer.next(value)
          observer.complete()
        })
        .catch(error => { observer.error(error); })
      
      return { unsubscribe: () => {} }
    })
  }

  static fromEvent<T>(
    target: EventTarget,
    eventName: string
  ): Observable<T> {
    return new Observable(observer => {
      const handler = (event: Event) => { observer.next(event as T); }
      target.addEventListener(eventName, handler)
      
      return {
        unsubscribe: () => { target.removeEventListener(eventName, handler); }
      }
    })
  }

  static interval(ms: number): Observable<number> {
    return new Observable(observer => {
      let count = 0
      const id = setInterval(() => { observer.next(count++); }, ms)
      
      return {
        unsubscribe: () => { clearInterval(id); }
      }
    })
  }

  map<U>(f: (value: T) => U): Observable<U> {
    return new Observable(observer => 
      this.subscribe({
        next: value => { observer.next(f(value)); },
        error: error => { observer.error(error); },
        complete: () => { observer.complete(); }
      })
    )
  }

  filter(predicate: (value: T) => boolean): Observable<T> {
    return new Observable(observer =>
      this.subscribe({
        next: value => predicate(value) && observer.next(value),
        error: error => { observer.error(error); },
        complete: () => { observer.complete(); }
      })
    )
  }

  flatMap<U>(f: (value: T) => Observable<U>): Observable<U> {
    return new Observable(observer => {
      const subscriptions: Subscription[] = []
      let completed = false
      let activeCount = 0

      const mainSubscription = this.subscribe({
        next: value => {
          activeCount++
          const innerSubscription = f(value).subscribe({
            next: innerValue => { observer.next(innerValue); },
            error: error => { observer.error(error); },
            complete: () => {
              activeCount--
              if (completed && activeCount === 0) {
                observer.complete()
              }
            }
          })
          subscriptions.push(innerSubscription)
        },
        error: error => { observer.error(error); },
        complete: () => {
          completed = true
          if (activeCount === 0) {
            observer.complete()
          }
        }
      })

      return {
        unsubscribe: () => {
          mainSubscription.unsubscribe()
          subscriptions.forEach(sub => { sub.unsubscribe(); })
        }
      }
    })
  }

  take(count: number): Observable<T> {
    return new Observable(observer => {
      let taken = 0
      const subscription = this.subscribe({
        next: value => {
          if (taken < count) {
            observer.next(value)
            taken++
            if (taken >= count) {
              observer.complete()
              subscription.unsubscribe()
            }
          }
        },
        error: error => { observer.error(error); },
        complete: () => { observer.complete(); }
      })
      
      return subscription
    })
  }

  takeUntil<U>(notifier: Observable<U>): Observable<T> {
    return new Observable(observer => {
      const sourceSubscription = this.subscribe(observer)
      
      const notifierSubscription = notifier.subscribe({
        next: () => {
          observer.complete()
          sourceSubscription.unsubscribe()
          notifierSubscription.unsubscribe()
        },
        error: error => { observer.error(error); },
        complete: () => {}
      })

      return {
        unsubscribe: () => {
          sourceSubscription.unsubscribe()
          notifierSubscription.unsubscribe()
        }
      }
    })
  }

  debounce(ms: number): Observable<T> {
    return new Observable(observer => {
      let timeoutId: ReturnType<typeof setTimeout>Timeout | null = null
      
      return this.subscribe({
        next: value => {
          if (timeoutId) clearTimeout(timeoutId)
          timeoutId = setTimeout(() => { observer.next(value); }, ms)
        },
        error: error => { observer.error(error); },
        complete: () => { observer.complete(); }
      })
    })
  }

  distinctUntilChanged(compareFn?: (a: T, b: T) => boolean): Observable<T> {
    return new Observable(observer => {
      let hasValue = false
      let lastValue: T
      const compare = compareFn ?? ((a, b) => a === b)

      return this.subscribe({
        next: value => {
          if (!hasValue || !compare(value, lastValue)) {
            hasValue = true
            lastValue = value
            observer.next(value)
          }
        },
        error: error => { observer.error(error); },
        complete: () => { observer.complete(); }
      })
    })
  }

  subscribe(observer: Observer<T>): Subscription {
    return this.subscribe(observer)
  }

  // 静的コンビネーター
  static merge<T>(...observables: Observable<T>[]): Observable<T> {
    return new Observable(observer => {
      const subscriptions = observables.map(obs =>
        obs.subscribe({
          next: value => { observer.next(value); },
          error: error => { observer.error(error); },
          complete: () => {
            // Complete only when all observables complete
            if (subscriptions.every(sub => sub.unsubscribe)) {
              observer.complete()
            }
          }
        })
      )

      return {
        unsubscribe: () => { subscriptions.forEach(sub => { sub.unsubscribe(); }); }
      }
    })
  }

  static combineLatest<A, B>(
    obsA: Observable<A>,
    obsB: Observable<B>
  ): Observable<[A, B]> {
    return new Observable(observer => {
      let latestA: A | undefined
      let latestB: B | undefined
      let hasA = false
      let hasB = false

      const emit = (): void => {
        if (hasA && hasB) {
          observer.next([latestA!, latestB!])
        }
      }

      const subA = obsA.subscribe({
        next: value => {
          latestA = value
          hasA = true
          emit()
        },
        error: error => { observer.error(error); },
        complete: () => { observer.complete(); }
      })

      const subB = obsB.subscribe({
        next: value => {
          latestB = value
          hasB = true
          emit()
        },
        error: error => { observer.error(error); },
        complete: () => { observer.complete(); }
      })

      return {
        unsubscribe: () => {
          subA.unsubscribe()
          subB.unsubscribe()
        }
      }
    })
  }
}

export interface Observer<T> {
  next: (value: T) => void
  error: (error: Error) => void
  complete: () => void
}

export interface Subscription {
  unsubscribe: () => void
}

// ===== 非同期コンビネーター =====

/**
 * 複数の非同期処理を順次実行
 */
export const sequence = async <T>(
  tasks: Array<() => Promise<T>>
): Promise<T[]> => {
  const results: T[] = []
  for (const task of tasks) {
    results.push(await task())
  }
  return results
}

/**
 * 複数の非同期処理を並列実行
 */
export const parallel = async <T>(
  tasks: Array<() => Promise<T>>
): Promise<T[]> => Promise.all(tasks.map(async task => task()))

/**
 * 非同期処理のパイプライン
 */
export const asyncPipe = <T>(initial: T) => ({
  pipe: <U>(fn: (value: T) => Promise<U>) => asyncPipe(fn(initial)),
  run: (): T => initial
})

/**
 * 条件付き非同期実行
 */
export const asyncWhen = async <T>(
  condition: boolean,
  asyncFn: () => Promise<T>,
  defaultValue: T
): Promise<T> => condition ? asyncFn() : Promise.resolve(defaultValue)

/**
 * タイムアウト付き実行
 */
export const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: Error = new Error('Timeout')
): Promise<T> => 
  Promise.race([
    promise,
    new Promise<never>((_, reject) => 
      setTimeout(() => { reject(timeoutError); }, timeoutMs)
    )
  ])

/**
 * リトライ機能付き実行
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  delay = 1000,
  backoff = 1
): Promise<T> => {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      if (attempt < maxAttempts) {
        await new Promise(resolve => 
          setTimeout(resolve, delay * backoff**(attempt - 1))
        )
      }
    }
  }
  
  throw lastError!
}