/**
 * 純粋関数ライブラリ
 * 
 * 副作用のない関数群を提供し、予測可能で
 * テストしやすいコードベースを構築
 */

import type { Comparator, Predicate } from '../types/advanced-types'
import { Maybe } from './monads'

// ===== 配列操作（純粋） =====

/**
 * 不変な配列操作
 */
export const append = <T>(arr: readonly T[], item: T): T[] => [...arr, item]

export const prepend = <T>(arr: readonly T[], item: T): T[] => [item, ...arr]

export const removeAt = <T>(arr: readonly T[], index: number): T[] => [
  ...arr.slice(0, index),
  ...arr.slice(index + 1)
]

export const updateAt = <T>(arr: readonly T[], index: number, item: T): T[] => [
  ...arr.slice(0, index),
  item,
  ...arr.slice(index + 1)
]

export const insertAt = <T>(arr: readonly T[], index: number, item: T): T[] => [
  ...arr.slice(0, index),
  item,
  ...arr.slice(index)
]

/**
 * 安全な配列アクセス
 */
export const safeGet = <T>(arr: readonly T[], index: number): Maybe<T> => {
  return index >= 0 && index < arr.length 
    ? Maybe.some(arr[index]!)
    : Maybe.none()
}

export const safeHead = <T>(arr: readonly T[]): Maybe<T> => safeGet(arr, 0)

export const safeLast = <T>(arr: readonly T[]): Maybe<T> => safeGet(arr, arr.length - 1)

/**
 * 配列の変換
 */
export const chunk = <T>(arr: readonly T[], size: number): T[][] => {
  if (size <= 0) return []
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export const flatten = <T>(arr: readonly T[][]): T[] => arr.flat()

export const zip = <A, B>(arrA: readonly A[], arrB: readonly B[]): Array<[A, B]> => {
  const length = Math.min(arrA.length, arrB.length)
  const result: Array<[A, B]> = []
  for (let i = 0; i < length; i++) {
    result.push([arrA[i]!, arrB[i]!])
  }
  return result
}

export const unzip = <A, B>(pairs: readonly Array<[A, B]>): [A[], B[]] => {
  const as: A[] = []
  const bs: B[] = []
  for (const [a, b] of pairs) {
    as.push(a)
    bs.push(b)
  }
  return [as, bs]
}

/**
 * 配列の集約
 */
export const groupBy = <T, K extends string | number | symbol>(
  arr: readonly T[],
  keyFn: (item: T) => K
): Record<K, T[]> => {
  const result = {} as Record<K, T[]>
  for (const item of arr) {
    const key = keyFn(item)
    if (!result[key]) {
      result[key] = []
    }
    result[key].push(item)
  }
  return result
}

export const countBy = <T, K extends string | number | symbol>(
  arr: readonly T[],
  keyFn: (item: T) => K
): Record<K, number> => {
  const result = {} as Record<K, number>
  for (const item of arr) {
    const key = keyFn(item)
    result[key] = (result[key] ?? 0) + 1
  }
  return result
}

export const partition = <T>(
  arr: readonly T[],
  predicate: Predicate<T>
): [T[], T[]] => {
  const trueItems: T[] = []
  const falseItems: T[] = []
  for (const item of arr) {
    if (predicate(item)) {
      trueItems.push(item)
    } else {
      falseItems.push(item)
    }
  }
  return [trueItems, falseItems]
}

// ===== オブジェクト操作（純粋） =====

/**
 * 不変なオブジェクト操作
 */
export const pick = <T, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> => {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

export const omit = <T, K extends keyof T>(obj: T, keys: readonly K[]): Omit<T, K> => {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export const mapValues = <T, U>(
  obj: Record<string, T>,
  fn: (value: T, key: string) => U
): Record<string, U> => {
  const result: Record<string, U> = {}
  for (const [key, value] of Object.entries(obj)) {
    result[key] = fn(value, key)
  }
  return result
}

export const filterValues = <T>(
  obj: Record<string, T>,
  predicate: (value: T, key: string) => boolean
): Record<string, T> => {
  const result: Record<string, T> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (predicate(value, key)) {
      result[key] = value
    }
  }
  return result
}

/**
 * 深いマージ
 */
export const deepMerge = <T extends Record<string, any>>(
  target: T,
  source: Partial<T>
): T => {
  const result = { ...target }
  for (const key in source) {
    const sourceValue = source[key]
    const targetValue = result[key]
    
    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue
    }
  }
  return result
}

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// ===== 関数合成 =====

/**
 * 関数合成ユーティリティ
 */
export const identity = <T>(x: T): T => x

export const constant = <T>(value: T) => (): T => value

export const negate = <T extends unknown[]>(
  predicate: (...args: T) => boolean
) => (...args: T): boolean => !predicate(...args)

export const once = <T extends unknown[], R>(
  fn: (...args: T) => R
): ((...args: T) => R | undefined) => {
  let called = false
  let result: R
  return (...args: T) => {
    if (!called) {
      called = true
      result = fn(...args)
      return result
    }
    return result
  }
}

export const memoize = <T extends unknown[], R>(
  fn: (...args: T) => R,
  keyFn?: (...args: T) => string
): ((...args: T) => R) => {
  const cache = new Map<string, R>()
  const getKey = keyFn ?? ((...args: T) => JSON.stringify(args))
  
  return (...args: T): R => {
    const key = getKey(...args)
    if (cache.has(key)) {
      return cache.get(key)!
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

/**
 * デバウンス・スロットル
 */
export const debounce = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let timeoutId: NodeJS.Timeout | null = null
  return (...args: T) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => { fn(...args); }, delay)
  }
}

export const throttle = <T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): ((...args: T) => void) => {
  let lastCall = 0
  return (...args: T) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

// ===== 数学・統計関数 =====

/**
 * 純粋な数学関数
 */
export const sum = (numbers: readonly number[]): number => 
  numbers.reduce((acc, n) => acc + n, 0)

export const product = (numbers: readonly number[]): number =>
  numbers.reduce((acc, n) => acc * n, 1)

export const average = (numbers: readonly number[]): Maybe<number> =>
  numbers.length > 0 ? Maybe.some(sum(numbers) / numbers.length) : Maybe.none()

export const median = (numbers: readonly number[]): Maybe<number> => {
  if (numbers.length === 0) return Maybe.none()
  
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return Maybe.some(
    sorted.length % 2 === 0
      ? (sorted[mid - 1]! + sorted[mid]!) / 2
      : sorted[mid]!
  )
}

export const min = (numbers: readonly number[]): Maybe<number> =>
  numbers.length > 0 ? Maybe.some(Math.min(...numbers)) : Maybe.none()

export const max = (numbers: readonly number[]): Maybe<number> =>
  numbers.length > 0 ? Maybe.some(Math.max(...numbers)) : Maybe.none()

export const clamp = (value: number, minVal: number, maxVal: number): number =>
  Math.min(Math.max(value, minVal), maxVal)

export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min

export const randomFloat = (min: number, max: number): number =>
  Math.random() * (max - min) + min

// ===== 文字列操作 =====

/**
 * 純粋な文字列操作
 */
export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()

export const camelCase = (str: string): string =>
  str.replace(/[-_\s]+(.)?/g, (_, char) => char ? char.toUpperCase() : '')

export const kebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

export const snakeCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()

export const truncate = (str: string, length: number, suffix = '...'): string =>
  str.length <= length ? str : str.slice(0, length - suffix.length) + suffix

export const padStart = (str: string, length: number, fillString = ' '): string =>
  str.padStart(length, fillString)

export const padEnd = (str: string, length: number, fillString = ' '): string =>
  str.padEnd(length, fillString)

// ===== 日付操作 =====

/**
 * 純粋な日付操作
 */
export const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000)

export const addHours = (date: Date, hours: number): Date =>
  new Date(date.getTime() + hours * 60 * 60 * 1000)

export const addMinutes = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000)

export const formatDate = (date: Date, format: string): string => {
  const replacements: Record<string, string> = {
    'YYYY': date.getFullYear().toString(),
    'MM': (date.getMonth() + 1).toString().padStart(2, '0'),
    'DD': date.getDate().toString().padStart(2, '0'),
    'HH': date.getHours().toString().padStart(2, '0'),
    'mm': date.getMinutes().toString().padStart(2, '0'),
    'ss': date.getSeconds().toString().padStart(2, '0')
  }
  
  return Object.entries(replacements).reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    format
  )
}

export const isValidDate = (date: unknown): date is Date =>
  date instanceof Date && !isNaN(date.getTime())

// ===== 型変換・バリデーション =====

/**
 * 安全な型変換
 */
export const safeParseInt = (str: string, radix = 10): Maybe<number> => {
  const result = parseInt(str, radix)
  return isNaN(result) ? Maybe.none() : Maybe.some(result)
}

export const safeParseFloat = (str: string): Maybe<number> => {
  const result = parseFloat(str)
  return isNaN(result) ? Maybe.none() : Maybe.some(result)
}

export const safeParseJSON = <T>(str: string): Maybe<T> => {
  try {
    return Maybe.some(JSON.parse(str) as T)
  } catch {
    return Maybe.none()
  }
}

/**
 * バリデーション関数
 */
export const isString = (value: unknown): value is string =>
  typeof value === 'string'

export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && !isNaN(value)

export const isBoolean = (value: unknown): value is boolean =>
  typeof value === 'boolean'

export const isArray = <T>(value: unknown): value is T[] =>
  Array.isArray(value)

export const isNotNull = <T>(value: T | null): value is T =>
  value !== null

export const isNotUndefined = <T>(value: T | undefined): value is T =>
  value !== undefined

export const isNotEmpty = (str: string): boolean =>
  str.trim().length > 0

export const isEmail = (str: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)

export const isUrl = (str: string): boolean => {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}