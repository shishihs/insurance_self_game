/**
 * モナドパターン実装
 * 
 * Maybe、Either、IO、State モナドを提供し、
 * エラーハンドリングと副作用の制御を改善
 */

// ===== Maybe Monad =====

export abstract class Maybe<T> {
  abstract map<U>(fn: (value: T) => U): Maybe<U>
  abstract flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U>
  abstract filter(predicate: (value: T) => boolean): Maybe<T>
  abstract getOrElse(defaultValue: T): T
  abstract isSome(): this is Some<T>
  abstract isNone(): this is None<T>

  static of<T>(value: T | null | undefined): Maybe<T> {
    return value != null ? new Some(value) : new None()
  }

  static some<T>(value: T): Maybe<T> {
    return new Some(value)
  }

  static none<T>(): Maybe<T> {
    return new None<T>()
  }
}

export class Some<T> extends Maybe<T> {
  constructor(private readonly value: T) {
    super()
  }

  map<U>(fn: (value: T) => U): Maybe<U> {
    try {
      return Maybe.some(fn(this.value))
    } catch {
      return Maybe.none()
    }
  }

  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    try {
      return fn(this.value)
    } catch {
      return Maybe.none()
    }
  }

  filter(predicate: (value: T) => boolean): Maybe<T> {
    try {
      return predicate(this.value) ? this : Maybe.none()
    } catch {
      return Maybe.none()
    }
  }

  getOrElse(_defaultValue: T): T {
    return this.value
  }

  isSome(): this is Some<T> {
    return true
  }

  isNone(): this is None<T> {
    return false
  }

  getValue(): T {
    return this.value
  }
}

export class None<T> extends Maybe<T> {
  map<U>(_fn: (value: T) => U): Maybe<U> {
    return new None<U>()
  }

  flatMap<U>(_fn: (value: T) => Maybe<U>): Maybe<U> {
    return new None<U>()
  }

  filter(_predicate: (value: T) => boolean): Maybe<T> {
    return this
  }

  getOrElse(defaultValue: T): T {
    return defaultValue
  }

  isSome(): this is Some<T> {
    return false
  }

  isNone(): this is None<T> {
    return true
  }
}

// ===== Either Monad =====

export abstract class Either<L, R> {
  abstract map<U>(fn: (value: R) => U): Either<L, U>
  abstract flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U>
  abstract mapLeft<U>(fn: (value: L) => U): Either<U, R>
  abstract fold<U>(leftFn: (left: L) => U, rightFn: (right: R) => U): U
  abstract isLeft(): this is Left<L, R>
  abstract isRight(): this is Right<L, R>

  static left<L, R>(value: L): Either<L, R> {
    return new Left(value)
  }

  static right<L, R>(value: R): Either<L, R> {
    return new Right(value)
  }

  static fromNullable<L, R>(value: R | null | undefined, leftValue: L): Either<L, R> {
    return value != null ? Either.right(value) : Either.left(leftValue)
  }

  static tryCatch<L, R>(fn: () => R, onError: (error: unknown) => L): Either<L, R> {
    try {
      return Either.right(fn())
    } catch (error) {
      return Either.left(onError(error))
    }
  }
}

export class Left<L, R> extends Either<L, R> {
  constructor(private readonly value: L) {
    super()
  }

  map<U>(_fn: (value: R) => U): Either<L, U> {
    return new Left<L, U>(this.value)
  }

  flatMap<U>(_fn: (value: R) => Either<L, U>): Either<L, U> {
    return new Left<L, U>(this.value)
  }

  mapLeft<U>(fn: (value: L) => U): Either<U, R> {
    return new Left<U, R>(fn(this.value))
  }

  fold<U>(leftFn: (left: L) => U, _rightFn: (right: R) => U): U {
    return leftFn(this.value)
  }

  isLeft(): this is Left<L, R> {
    return true
  }

  isRight(): this is Right<L, R> {
    return false
  }

  getValue(): L {
    return this.value
  }
}

export class Right<L, R> extends Either<L, R> {
  constructor(private readonly value: R) {
    super()
  }

  map<U>(fn: (value: R) => U): Either<L, U> {
    try {
      return Either.right(fn(this.value))
    } catch (error) {
      return new Left<L, U>(error as L)
    }
  }

  flatMap<U>(fn: (value: R) => Either<L, U>): Either<L, U> {
    try {
      return fn(this.value)
    } catch (error) {
      return Either.left(error as L)
    }
  }

  mapLeft<U>(_fn: (value: L) => U): Either<U, R> {
    return new Right<U, R>(this.value)
  }

  fold<U>(_leftFn: (left: L) => U, rightFn: (right: R) => U): U {
    return rightFn(this.value)
  }

  isLeft(): this is Left<L, R> {
    return false
  }

  isRight(): this is Right<L, R> {
    return true
  }

  getValue(): R {
    return this.value
  }
}

// ===== IO Monad =====

export class IO<T> {
  constructor(private readonly effect: () => T) {}

  static of<T>(value: T): IO<T> {
    return new IO(() => value)
  }

  static from<T>(effect: () => T): IO<T> {
    return new IO(effect)
  }

  map<U>(fn: (value: T) => U): IO<U> {
    return new IO(() => fn(this.effect()))
  }

  flatMap<U>(fn: (value: T) => IO<U>): IO<U> {
    return new IO(() => fn(this.effect()).unsafeRun())
  }

  chain<U>(fn: (value: T) => IO<U>): IO<U> {
    return this.flatMap(fn)
  }

  unsafeRun(): T {
    return this.effect()
  }

  // 副作用の遅延実行
  delay(ms: number): IO<T> {
    return new IO(() => {
      const start = Date.now()
      while (Date.now() - start < ms) {
        // busy waiting
      }
      return this.effect()
    })
  }

  // エラーハンドリング
  attempt(): IO<Either<Error, T>> {
    return new IO(() => {
      try {
        return Either.right(this.effect())
      } catch (error) {
        return Either.left(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }
}

// ===== State Monad =====

export class State<S, A> {
  constructor(private readonly runState: (state: S) => [A, S]) {}

  static of<S, A>(value: A): State<S, A> {
    return new State(state => [value, state])
  }

  static get<S>(): State<S, S> {
    return new State(state => [state, state])
  }

  static put<S>(newState: S): State<S, void> {
    return new State(_ => [undefined as void, newState])
  }

  static modify<S>(fn: (state: S) => S): State<S, void> {
    return new State(state => [undefined as void, fn(state)])
  }

  map<B>(fn: (value: A) => B): State<S, B> {
    return new State(state => {
      const [value, newState] = this.runState(state)
      return [fn(value), newState]
    })
  }

  flatMap<B>(fn: (value: A) => State<S, B>): State<S, B> {
    return new State(state => {
      const [value, newState] = this.runState(state)
      return fn(value).runState(newState)
    })
  }

  chain<B>(fn: (value: A) => State<S, B>): State<S, B> {
    return this.flatMap(fn)
  }

  run(initialState: S): [A, S] {
    return this.runState(initialState)
  }

  eval(initialState: S): A {
    return this.runState(initialState)[0]
  }

  exec(initialState: S): S {
    return this.runState(initialState)[1]
  }
}

// ===== Reader Monad =====

export class Reader<R, A> {
  constructor(private readonly runReader: (env: R) => A) {}

  static of<R, A>(value: A): Reader<R, A> {
    return new Reader(_ => value)
  }

  static ask<R>(): Reader<R, R> {
    return new Reader(env => env)
  }

  static asks<R, A>(fn: (env: R) => A): Reader<R, A> {
    return new Reader(fn)
  }

  map<B>(fn: (value: A) => B): Reader<R, B> {
    return new Reader(env => fn(this.runReader(env)))
  }

  flatMap<B>(fn: (value: A) => Reader<R, B>): Reader<R, B> {
    return new Reader(env => {
      const value = this.runReader(env)
      return fn(value).runReader(env)
    })
  }

  run(environment: R): A {
    return this.runReader(environment)
  }

  local<R2>(fn: (env: R2) => R): Reader<R2, A> {
    return new Reader(env => this.runReader(fn(env)))
  }
}

// ===== ユーティリティ関数 =====

/**
 * モナドのコンビネータ
 */
export const sequence = <T>(maybes: Maybe<T>[]): Maybe<T[]> => {
  const results: T[] = []
  for (const maybe of maybes) {
    if (maybe.isNone()) {
      return Maybe.none()
    }
    results.push(maybe.getValue())
  }
  return Maybe.some(results)
}

export const traverse = <T, U>(
  items: T[],
  fn: (item: T) => Maybe<U>
): Maybe<U[]> => {
  return sequence(items.map(fn))
}

/**
 * Either のコンビネータ
 */
export const sequenceEither = <L, R>(eithers: Either<L, R>[]): Either<L, R[]> => {
  const results: R[] = []
  for (const either of eithers) {
    if (either.isLeft()) {
      return either as Either<L, R[]>
    }
    results.push(either.getValue())
  }
  return Either.right(results)
}

/**
 * パイプライン演算子シミュレーション
 */
export const pipe = <T, U>(value: T, fn: (value: T) => U): U => fn(value)

export const compose = <A, B, C>(
  f: (b: B) => C,
  g: (a: A) => B
): ((a: A) => C) => (a: A) => f(g(a))

/**
 * モナドリフト
 */
export const liftA2 = <A, B, C>(
  fn: (a: A, b: B) => C
) => (ma: Maybe<A>, mb: Maybe<B>): Maybe<C> => {
  return ma.flatMap(a =>
    mb.map(b => fn(a, b))
  )
}

/**
 * カリー化
 */
export const curry = <A, B, C>(fn: (a: A, b: B) => C) =>
  (a: A) => (b: B) => fn(a, b)

export const curry3 = <A, B, C, D>(fn: (a: A, b: B, c: C) => D) =>
  (a: A) => (b: B) => (c: C) => fn(a, b, c)