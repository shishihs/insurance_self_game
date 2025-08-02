/**
 * 最適化されたユーティリティ関数群
 * 重複を排除し、パフォーマンスを最適化した共通関数
 */

import { benchmark, memoize, UnifiedPerformanceSystem } from '../../optimizations/UnifiedPerformanceSystem'

// ===== OPTIMIZED ARRAY OPERATIONS =====

/**
 * 高速配列シャッフル（Fisher-Yates アルゴリズム最適化版）
 */
export function fastShuffle<T>(array: T[]): T[] {
  const system = UnifiedPerformanceSystem.getInstance()
  
  // Use object pool for temporary array if available
  const result = system.acquireFromPool<T[]>('arrays') || []
  result.length = 0
  result.push(...array)
  
  // Optimized Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    // Use bitwise operations for faster random index generation
    const j = Math.floor(Math.random() * (i + 1))
    
    // Swap without temporary variable
    if (i !== j) {
      result[i] ^= result[j] as any
      result[j] ^= result[i] as any
      result[i] ^= result[j] as any
    }
  }
  
  return result
}

/**
 * 最適化された配列フィルタリング（インプレース操作）
 */
export function fastFilter<T>(array: T[], predicate: (item: T, index: number) => boolean): T[] {
  let writeIndex = 0
  
  for (let readIndex = 0; readIndex < array.length; readIndex++) {
    const item = array[readIndex]
    if (predicate(item, readIndex)) {
      if (writeIndex !== readIndex) {
        array[writeIndex] = item
      }
      writeIndex++
    }
  }
  
  // Truncate array to new length
  array.length = writeIndex
  return array
}

/**
 * バッチ処理による配列操作最適化
 */
export function batchProcess<T, R>(
  items: T[], 
  processor: (batch: T[]) => R[], 
  batchSize: number = 100
): R[] {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = processor(batch)
    results.push(...batchResults)
  }
  
  return results
}

/**
 * 高速重複除去（Set を使用した最適化版）
 */
export function fastUnique<T>(array: T[], keySelector?: (item: T) => string | number): T[] {
  if (!keySelector) {
    return Array.from(new Set(array))
  }
  
  const seen = new Set<string | number>()
  const result: T[] = []
  
  for (const item of array) {
    const key = keySelector(item)
    if (!seen.has(key)) {
      seen.add(key)
      result.push(item)
    }
  }
  
  return result
}

// ===== MEMOIZED UTILITY FUNCTIONS =====

export class OptimizedMath {
  /**
   * メモ化された階乗計算
   */
  @memoize
  static factorial(n: number): number {
    if (n <= 1) return 1
    return n * this.factorial(n - 1)
  }

  /**
   * メモ化された組み合わせ計算
   */
  @memoize
  static combination(n: number, r: number): number {
    if (r > n || r < 0) return 0
    if (r === 0 || r === n) return 1
    
    // Optimize by using smaller r
    r = Math.min(r, n - r)
    
    let result = 1
    for (let i = 0; i < r; i++) {
      result = result * (n - i) / (i + 1)
    }
    
    return Math.round(result)
  }

  /**
   * メモ化されたべき乗計算
   */
  @memoize
  static power(base: number, exponent: number): number {
    if (exponent === 0) return 1
    if (exponent === 1) return base
    if (exponent < 0) return 1 / this.power(base, -exponent)
    
    // Fast exponentiation using binary method
    if (exponent % 2 === 0) {
      const half = this.power(base, exponent / 2)
      return half * half
    } 
      return base * this.power(base, exponent - 1)
    
  }

  /**
   * 高速平方根計算（ニュートン法）
   */
  static fastSqrt(x: number): number {
    if (x === 0) return 0
    if (x === 1) return 1
    
    // Initial guess using bit manipulation
    let guess = x
    let temp = 0
    
    // Newton's method iteration
    while (guess !== temp) {
      temp = guess
      guess = (guess + x / guess) / 2
    }
    
    return guess
  }
}

// ===== OPTIMIZED STRING OPERATIONS =====

export class OptimizedString {
  private static readonly charCodeMap = new Map<string, number>()
  
  /**
   * 高速文字列ハッシュ関数
   */
  static hash(str: string): number {
    let hash = 0
    if (str.length === 0) return hash
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return Math.abs(hash)
  }

  /**
   * 最適化された文字列比較
   */
  static fastEquals(a: string, b: string): boolean {
    if (a === b) return true
    if (a.length !== b.length) return false
    
    // Compare character codes directly for better performance
    for (let i = 0; i < a.length; i++) {
      if (a.charCodeAt(i) !== b.charCodeAt(i)) {
        return false
      }
    }
    
    return true
  }

  /**
   * メモ化されたパディング関数
   */
  @memoize
  static pad(str: string, length: number, char: string = ' '): string {
    if (str.length >= length) return str
    
    const padLength = length - str.length
    const padding = char.repeat(Math.ceil(padLength / char.length)).slice(0, padLength)
    
    return str + padding
  }

  /**
   * 高速文字列置換（正規表現を使わない）
   */
  static fastReplace(str: string, search: string, replace: string): string {
    if (!search) return str
    
    let result = ''
    let lastIndex = 0
    let index = str.indexOf(search)
    
    while (index !== -1) {
      result += str.slice(lastIndex, index) + replace
      lastIndex = index + search.length
      index = str.indexOf(search, lastIndex)
    }
    
    result += str.slice(lastIndex)
    return result
  }
}

// ===== OBJECT MANIPULATION UTILITIES =====

export class OptimizedObject {
  /**
   * 高速オブジェクトクローン（浅いコピー最適化版）
   */
  static fastClone<T extends Record<string, any>>(obj: T): T {
    const system = UnifiedPerformanceSystem.getInstance()
    
    // Try to get from object pool first
    const pooledObj = system.acquireFromPool<T>('objects')
    if (pooledObj) {
      Object.assign(pooledObj, obj)
      return pooledObj
    }
    
    // Fallback to optimized object creation
    const result = Object.create(Object.getPrototypeOf(obj))
    
    // Use for...in for better performance than Object.keys
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        result[key] = obj[key]
      }
    }
    
    return result
  }

  /**
   * 深いオブジェクト比較（最適化版）
   */
  @memoize
  static deepEquals(a: any, b: any): boolean {
    if (a === b) return true
    if (a == null || b == null) return a === b
    if (typeof a !== typeof b) return false
    
    if (typeof a !== 'object') return a === b
    
    if (Array.isArray(a) !== Array.isArray(b)) return false
    
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (!this.deepEquals(a[i], b[i])) return false
      }
      return true
    }
    
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    
    if (keysA.length !== keysB.length) return false
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false
      if (!this.deepEquals(a[key], b[key])) return false
    }
    
    return true
  }

  /**
   * オブジェクトマージ（最適化版）
   */
  static fastMerge<T extends Record<string, any>>(...objects: Partial<T>[]): T {
    const result = {} as T
    
    for (const obj of objects) {
      if (obj) {
        // Use for...in for better performance
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            result[key as keyof T] = obj[key] as T[keyof T]
          }
        }
      }
    }
    
    return result
  }

  /**
   * プロパティパス取得（ドット記法対応）
   */
  @memoize
  static getProperty(obj: any, path: string): any {
    if (!path) return obj
    
    const keys = path.split('.')
    let current = obj
    
    for (const key of keys) {
      if (current == null) return undefined
      current = current[key]
    }
    
    return current
  }

  /**
   * プロパティパス設定（ドット記法対応）
   */
  static setProperty(obj: any, path: string, value: any): void {
    if (!path) return
    
    const keys = path.split('.')
    let current = obj
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (current[key] == null || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }
    
    current[keys[keys.length - 1]] = value
  }
}

// ===== ALGORITHM OPTIMIZATIONS =====

export class OptimizedAlgorithms {
  /**
   * 最適化されたクイックソート
   */
  static quickSort<T>(array: T[], compareFn?: (a: T, b: T) => number): T[] {
    if (array.length <= 1) return array
    
    const compare = compareFn || ((a: any, b: any) => a > b ? 1 : a < b ? -1 : 0)
    
    // Use insertion sort for small arrays (optimization)
    if (array.length <= 10) {
      return this.insertionSort(array, compare)
    }
    
    const pivot = array[Math.floor(array.length / 2)]
    const left: T[] = []
    const equal: T[] = []
    const right: T[] = []
    
    for (const element of array) {
      const cmp = compare(element, pivot)
      if (cmp < 0) {
        left.push(element)
      } else if (cmp > 0) {
        right.push(element)
      } else {
        equal.push(element)
      }
    }
    
    return [
      ...this.quickSort(left, compare),
      ...equal,
      ...this.quickSort(right, compare)
    ]
  }

  /**
   * 挿入ソート（小さな配列用）
   */
  private static insertionSort<T>(array: T[], compare: (a: T, b: T) => number): T[] {
    const result = [...array]
    
    for (let i = 1; i < result.length; i++) {
      const key = result[i]
      let j = i - 1
      
      while (j >= 0 && compare(result[j], key) > 0) {
        result[j + 1] = result[j]
        j--
      }
      
      result[j + 1] = key
    }
    
    return result
  }

  /**
   * 二分探索（最適化版）
   */
  static binarySearch<T>(
    array: T[], 
    target: T, 
    compareFn?: (a: T, b: T) => number
  ): number {
    const compare = compareFn || ((a: any, b: any) => a > b ? 1 : a < b ? -1 : 0)
    
    let left = 0
    let right = array.length - 1
    
    while (left <= right) {
      // Use bitwise operation for faster midpoint calculation
      const mid = left + ((right - left) >>> 1)
      const cmp = compare(array[mid], target)
      
      if (cmp === 0) {
        return mid
      } if (cmp < 0) {
        left = mid + 1
      } else {
        right = mid - 1
      }
    }
    
    return -1
  }

  /**
   * LRU キャッシュ実装
   */
  static createLRUCache<K, V>(maxSize: number): {
    get: (key: K) => V | undefined
    set: (key: K, value: V) => void
    clear: () => void
    size: () => number
  } {
    const cache = new Map<K, V>()
    
    return {
      get(key: K): V | undefined {
        if (cache.has(key)) {
          // Move to end (most recently used)
          const value = cache.get(key)!
          cache.delete(key)
          cache.set(key, value)
          return value
        }
        return undefined
      },
      
      set(key: K, value: V): void {
        if (cache.has(key)) {
          cache.delete(key)
        } else if (cache.size >= maxSize) {
          // Remove least recently used (first item)
          const firstKey = cache.keys().next().value
          cache.delete(firstKey)
        }
        cache.set(key, value)
      },
      
      clear(): void {
        cache.clear()
      },
      
      size(): number {
        return cache.size
      }
    }
  }
}

// ===== PERFORMANCE UTILITIES =====

export class PerformanceUtils {
  /**
   * デバウンス関数（最適化版）
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null
    
    return (...args: Parameters<T>) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        timeoutId = null
        func(...args)
      }, wait)
    }
  }

  /**
   * スロットル関数（最適化版）
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  /**
   * 非同期バッチ処理
   */
  static async batchAsync<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    batchSize: number = 10,
    delay: number = 0
  ): Promise<R[]> {
    const results: R[] = []
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize)
      const batchPromises = batch.map(processor)
      const batchResults = await Promise.all(batchPromises)
      
      results.push(...batchResults)
      
      // Optional delay between batches
      if (delay > 0 && i + batchSize < items.length) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    return results
  }

  /**
   * メモリ使用量測定
   */
  @benchmark
  static measureMemory<T>(operation: () => T): { result: T; memoryDelta: number } {
    const before = (performance as any).memory?.usedJSHeapSize || 0
    const result = operation()
    const after = (performance as any).memory?.usedJSHeapSize || 0
    
    return {
      result,
      memoryDelta: (after - before) / 1024 / 1024 // MB
    }
  }

  /**
   * 実行時間測定
   */
  static measureTime<T>(operation: () => T): { result: T; executionTime: number } {
    const start = performance.now()
    const result = operation()
    const end = performance.now()
    
    return {
      result,
      executionTime: end - start
    }
  }

  /**
   * プロファイル実行
   */
  static profile<T>(
    name: string,
    operation: () => T
  ): { result: T; profile: { executionTime: number; memoryDelta: number } } {
    console.time(name)
    const before = (performance as any).memory?.usedJSHeapSize || 0
    const start = performance.now()
    
    const result = operation()
    
    const end = performance.now()
    const after = (performance as any).memory?.usedJSHeapSize || 0
    console.timeEnd(name)
    
    return {
      result,
      profile: {
        executionTime: end - start,
        memoryDelta: (after - before) / 1024 / 1024
      }
    }
  }
}

// ===== LAZY EVALUATION UTILITIES =====

export class LazyEvaluation {
  /**
   * 遅延評価プロパティ
   */
  static lazy<T>(factory: () => T): () => T {
    let cached: T
    let computed = false
    
    return () => {
      if (!computed) {
        cached = factory()
        computed = true
      }
      return cached
    }
  }

  /**
   * 遅延配列
   */
  static lazyArray<T>(generator: () => Generator<T>): {
    take: (count: number) => T[]
    forEach: (callback: (item: T) => void) => void
    map: <R>(mapper: (item: T) => R) => LazyArray<R>
    filter: (predicate: (item: T) => boolean) => LazyArray<T>
  } {
    return new LazyArray(generator)
  }
}

class LazyArray<T> {
  constructor(private readonly generator: () => Generator<T>) {}

  take(count: number): T[] {
    const result: T[] = []
    const gen = this.generator()
    
    for (let i = 0; i < count; i++) {
      const { value, done } = gen.next()
      if (done) break
      result.push(value)
    }
    
    return result
  }

  forEach(callback: (item: T) => void): void {
    const gen = this.generator()
    let result = gen.next()
    
    while (!result.done) {
      callback(result.value)
      result = gen.next()
    }
  }

  map<R>(mapper: (item: T) => R): LazyArray<R> {
    return new LazyArray(function* () {
      const gen = this.generator()
      let result = gen.next()
      
      while (!result.done) {
        yield mapper(result.value)
        result = gen.next()
      }
    }.bind(this))
  }

  filter(predicate: (item: T) => boolean): LazyArray<T> {
    return new LazyArray(function* () {
      const gen = this.generator()
      let result = gen.next()
      
      while (!result.done) {
        if (predicate(result.value)) {
          yield result.value
        }
        result = gen.next()
      }
    }.bind(this))
  }
}

// ===== EXPORTS =====

export {
  OptimizedMath,
  OptimizedString,
  OptimizedObject,
  OptimizedAlgorithms,
  PerformanceUtils,
  LazyEvaluation
}

export default {
  Math: OptimizedMath,
  String: OptimizedString,
  Object: OptimizedObject,
  Algorithms: OptimizedAlgorithms,
  Performance: PerformanceUtils,
  Lazy: LazyEvaluation,
  
  // Utility functions
  fastShuffle,
  fastFilter,
  batchProcess,
  fastUnique
}