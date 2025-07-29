/**
 * 厳格な型定義と型ガード
 * 
 * より安全で堅牢なコードのための型定義
 */

// ブランド型の定義（型安全性の向上）
type Brand<K, T> = K & { __brand: T }

// ブランド型の例
export type PlayerId = Brand<string, 'PlayerId'>
export type GameId = Brand<string, 'GameId'>
export type CardId = Brand<string, 'CardId'>
export type TurnNumber = Brand<number, 'TurnNumber'>
export type VitalityValue = Brand<number, 'VitalityValue'>
export type PowerValue = Brand<number, 'PowerValue'>

// 型ガード関数
export const isPlayerId = (value: unknown): value is PlayerId => {
  return typeof value === 'string' && value.length > 0
}

export const isGameId = (value: unknown): value is GameId => {
  return typeof value === 'string' && value.startsWith('game_')
}

export const isCardId = (value: unknown): value is CardId => {
  return typeof value === 'string' && value.startsWith('card_')
}

export const isTurnNumber = (value: unknown): value is TurnNumber => {
  return typeof value === 'number' && value > 0 && Number.isInteger(value)
}

export const isVitalityValue = (value: unknown): value is VitalityValue => {
  return typeof value === 'number' && value >= 0
}

export const isPowerValue = (value: unknown): value is PowerValue => {
  return typeof value === 'number' && value >= 0
}

// Result型（エラーハンドリング改善）
export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E }

export const ok = <T>(value: T): Result<T> => ({
  success: true,
  value
})

export const err = <E = Error>(error: E): Result<never, E> => ({
  success: false,
  error
})

// Option型（nullの安全な扱い）
export type Option<T> = 
  | { some: true; value: T }
  | { some: false }

export const some = <T>(value: T): Option<T> => ({
  some: true,
  value
})

export const none = <T>(): Option<T> => ({
  some: false
})

// 非空配列型
export type NonEmptyArray<T> = [T, ...T[]]

export const isNonEmptyArray = <T>(arr: T[]): arr is NonEmptyArray<T> => {
  return arr.length > 0
}

// Readonly Deep型
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

// Exhaustive Check
export const exhaustiveCheck = (value: never): never => {
  throw new Error(`Unhandled case: ${value}`)
}

// Utility types
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
  }[Keys]

export type RequireOnlyOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & 
      Partial<Record<Exclude<Keys, K>, undefined>>
  }[Keys]

// 文字列リテラル型のヘルパー
export type StringLiteral<T> = T extends string ? T : never

// 数値範囲型
export type Range<
  N extends number,
  Result extends Array<unknown> = []
> = Result['length'] extends N
  ? Result[number]
  : Range<N, [...Result, Result['length']]>

// タプル型ヘルパー
export type Head<T extends readonly unknown[]> = T extends readonly [infer H, ...unknown[]] ? H : never
export type Tail<T extends readonly unknown[]> = T extends readonly [unknown, ...infer Tail] ? Tail : []
export type Length<T extends readonly unknown[]> = T['length']

// Mutable型（ReadonlyをMutableに）
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

// 関数型プログラミングのための型
export type Fn<A, B> = (a: A) => B
export type Predicate<T> = (value: T) => boolean
export type Comparator<T> = (a: T, b: T) => number

// Validation型
export type ValidationResult<T> = Result<T, string[]>

export const validate = <T>(
  value: T,
  validators: Array<Predicate<T>>,
  errors: string[]
): ValidationResult<T> => {
  const failedValidations = validators
    .map((validator, index) => validator(value) ? null : errors[index])
    .filter((error): error is string => error !== null)
  
  return failedValidations.length === 0
    ? ok(value)
    : err(failedValidations)
}