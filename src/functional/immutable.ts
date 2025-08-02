/**
 * イミュータブルデータ構造実装
 * 
 * 構造的共有による効率的なイミュータブルコレクションを提供し、
 * メモリ効率と性能を両立させる
 */

import { Maybe } from './monads'

// ===== イミュータブルリスト =====

export class ImmutableList<T> {
  private constructor(private readonly items: readonly T[]) {}

  static empty<T>(): ImmutableList<T> {
    return new ImmutableList([])
  }

  static of<T>(...items: T[]): ImmutableList<T> {
    return new ImmutableList(items)
  }

  static from<T>(items: Iterable<T>): ImmutableList<T> {
    return new ImmutableList(Array.from(items))
  }

  // アクセス
  get(index: number): Maybe<T> {
    return index >= 0 && index < this.items.length
      ? Maybe.some(this.items[index]!)
      : Maybe.none()
  }

  first(): Maybe<T> {
    return this.get(0)
  }

  last(): Maybe<T> {
    return this.get(this.items.length - 1)
  }

  size(): number {
    return this.items.length
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  // 変換
  append(item: T): ImmutableList<T> {
    return new ImmutableList([...this.items, item])
  }

  prepend(item: T): ImmutableList<T> {
    return new ImmutableList([item, ...this.items])
  }

  insert(index: number, item: T): ImmutableList<T> {
    if (index < 0 || index > this.items.length) {
      return this
    }
    return new ImmutableList([
      ...this.items.slice(0, index),
      item,
      ...this.items.slice(index)
    ])
  }

  removeAt(index: number): ImmutableList<T> {
    if (index < 0 || index >= this.items.length) {
      return this
    }
    return new ImmutableList([
      ...this.items.slice(0, index),
      ...this.items.slice(index + 1)
    ])
  }

  updateAt(index: number, item: T): ImmutableList<T> {
    if (index < 0 || index >= this.items.length) {
      return this
    }
    return new ImmutableList([
      ...this.items.slice(0, index),
      item,
      ...this.items.slice(index + 1)
    ])
  }

  // 関数型操作
  map<U>(fn: (item: T, index: number) => U): ImmutableList<U> {
    return new ImmutableList(this.items.map(fn))
  }

  filter(predicate: (item: T, index: number) => boolean): ImmutableList<T> {
    return new ImmutableList(this.items.filter(predicate))
  }

  reduce<U>(fn: (acc: U, item: T, index: number) => U, initial: U): U {
    return this.items.reduce(fn, initial)
  }

  find(predicate: (item: T, index: number) => boolean): Maybe<T> {
    const found = this.items.find(predicate)
    return found !== undefined ? Maybe.some(found) : Maybe.none()
  }

  findIndex(predicate: (item: T, index: number) => boolean): Maybe<number> {
    const index = this.items.findIndex(predicate)
    return index >= 0 ? Maybe.some(index) : Maybe.none()
  }

  some(predicate: (item: T, index: number) => boolean): boolean {
    return this.items.some(predicate)
  }

  every(predicate: (item: T, index: number) => boolean): boolean {
    return this.items.every(predicate)
  }

  // 結合操作
  concat(other: ImmutableList<T>): ImmutableList<T> {
    return new ImmutableList([...this.items, ...other.items])
  }

  slice(start?: number, end?: number): ImmutableList<T> {
    return new ImmutableList(this.items.slice(start, end))
  }

  take(count: number): ImmutableList<T> {
    return this.slice(0, count)
  }

  drop(count: number): ImmutableList<T> {
    return this.slice(count)
  }

  reverse(): ImmutableList<T> {
    return new ImmutableList([...this.items].reverse())
  }

  sort(compareFn?: (a: T, b: T) => number): ImmutableList<T> {
    return new ImmutableList([...this.items].sort(compareFn))
  }

  // ユーティリティ
  toArray(): T[] {
    return [...this.items]
  }

  toString(): string {
    return `ImmutableList(${this.items.length})[${this.items.join(', ')}]`
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]()
  }

  // 等価性チェック
  equals(other: ImmutableList<T>, compareFn?: (a: T, b: T) => boolean): boolean {
    if (this.size() !== other.size()) {
      return false
    }
    
    const compare = compareFn ?? ((a, b) => a === b)
    for (let i = 0; i < this.items.length; i++) {
      if (!compare(this.items[i]!, other.items[i]!)) {
        return false
      }
    }
    return true
  }
}

// ===== イミュータブルマップ =====

export class ImmutableMap<K, V> {
  private constructor(private readonly entries: ReadonlyMap<K, V>) {}

  static empty<K, V>(): ImmutableMap<K, V> {
    return new ImmutableMap(new Map())
  }

  static of<K, V>(...entries: Array<[K, V]>): ImmutableMap<K, V> {
    return new ImmutableMap(new Map(entries))
  }

  static from<K, V>(entries: Iterable<[K, V]>): ImmutableMap<K, V> {
    return new ImmutableMap(new Map(entries))
  }

  // アクセス
  get(key: K): Maybe<V> {
    const value = this.entries.get(key)
    return value !== undefined ? Maybe.some(value) : Maybe.none()
  }

  has(key: K): boolean {
    return this.entries.has(key)
  }

  size(): number {
    return this.entries.size
  }

  isEmpty(): boolean {
    return this.entries.size === 0
  }

  // 変更
  set(key: K, value: V): ImmutableMap<K, V> {
    const newEntries = new Map(this.entries)
    newEntries.set(key, value)
    return new ImmutableMap(newEntries)
  }

  delete(key: K): ImmutableMap<K, V> {
    if (!this.has(key)) {
      return this
    }
    const newEntries = new Map(this.entries)
    newEntries.delete(key)
    return new ImmutableMap(newEntries)
  }

  clear(): ImmutableMap<K, V> {
    return ImmutableMap.empty()
  }

  // 変換
  map<U>(fn: (value: V, key: K) => U): ImmutableMap<K, U> {
    const newEntries = new Map<K, U>()
    for (const [key, value] of this.entries) {
      newEntries.set(key, fn(value, key))
    }
    return new ImmutableMap(newEntries)
  }

  filter(predicate: (value: V, key: K) => boolean): ImmutableMap<K, V> {
    const newEntries = new Map<K, V>()
    for (const [key, value] of this.entries) {
      if (predicate(value, key)) {
        newEntries.set(key, value)
      }
    }
    return new ImmutableMap(newEntries)
  }

  reduce<U>(fn: (acc: U, value: V, key: K) => U, initial: U): U {
    let result = initial
    for (const [key, value] of this.entries) {
      result = fn(result, value, key)
    }
    return result
  }

  // 結合操作
  merge(other: ImmutableMap<K, V>): ImmutableMap<K, V> {
    const newEntries = new Map(this.entries)
    for (const [key, value] of other.entries) {
      newEntries.set(key, value)
    }
    return new ImmutableMap(newEntries)
  }

  // コレクション操作
  keys(): ImmutableList<K> {
    return ImmutableList.from(this.entries.keys())
  }

  values(): ImmutableList<V> {
    return ImmutableList.from(this.entries.values())
  }

  entryList(): ImmutableList<[K, V]> {
    return ImmutableList.from(this.entries.entries())
  }

  // ユーティリティ
  toMap(): Map<K, V> {
    return new Map(this.entries)
  }

  toObject(): Record<string, V> {
    const result: Record<string, V> = {}
    for (const [key, value] of this.entries) {
      result[String(key)] = value
    }
    return result
  }

  toString(): string {
    const entries = Array.from(this.entries.entries())
      .map(([k, v]) => `${String(k)} => ${String(v)}`)
      .join(', ')
    return `ImmutableMap(${this.size()}){${entries}}`
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries[Symbol.iterator]()
  }

  // 等価性チェック
  equals(
    other: ImmutableMap<K, V>,
    valueCompareFn?: (a: V, b: V) => boolean
  ): boolean {
    if (this.size() !== other.size()) {
      return false
    }

    const compare = valueCompareFn ?? ((a, b) => a === b)
    for (const [key, value] of this.entries) {
      const otherValue = other.get(key)
      if (otherValue.isNone() || !compare(value, otherValue.getValue())) {
        return false
      }
    }
    return true
  }
}

// ===== イミュータブルセット =====

export class ImmutableSet<T> {
  private constructor(private readonly items: ReadonlySet<T>) {}

  static empty<T>(): ImmutableSet<T> {
    return new ImmutableSet(new Set())
  }

  static of<T>(...items: T[]): ImmutableSet<T> {
    return new ImmutableSet(new Set(items))
  }

  static from<T>(items: Iterable<T>): ImmutableSet<T> {
    return new ImmutableSet(new Set(items))
  }

  // アクセス
  has(item: T): boolean {
    return this.items.has(item)
  }

  size(): number {
    return this.items.size
  }

  isEmpty(): boolean {
    return this.items.size === 0
  }

  // 変更
  add(item: T): ImmutableSet<T> {
    if (this.has(item)) {
      return this
    }
    const newItems = new Set(this.items)
    newItems.add(item)
    return new ImmutableSet(newItems)
  }

  delete(item: T): ImmutableSet<T> {
    if (!this.has(item)) {
      return this
    }
    const newItems = new Set(this.items)
    newItems.delete(item)
    return new ImmutableSet(newItems)
  }

  clear(): ImmutableSet<T> {
    return ImmutableSet.empty()
  }

  // 集合演算
  union(other: ImmutableSet<T>): ImmutableSet<T> {
    const newItems = new Set(this.items)
    for (const item of other.items) {
      newItems.add(item)
    }
    return new ImmutableSet(newItems)
  }

  intersection(other: ImmutableSet<T>): ImmutableSet<T> {
    const newItems = new Set<T>()
    for (const item of this.items) {
      if (other.has(item)) {
        newItems.add(item)
      }
    }
    return new ImmutableSet(newItems)
  }

  difference(other: ImmutableSet<T>): ImmutableSet<T> {
    const newItems = new Set<T>()
    for (const item of this.items) {
      if (!other.has(item)) {
        newItems.add(item)
      }
    }
    return new ImmutableSet(newItems)
  }

  // 述語操作
  filter(predicate: (item: T) => boolean): ImmutableSet<T> {
    const newItems = new Set<T>()
    for (const item of this.items) {
      if (predicate(item)) {
        newItems.add(item)
      }
    }
    return new ImmutableSet(newItems)
  }

  some(predicate: (item: T) => boolean): boolean {
    for (const item of this.items) {
      if (predicate(item)) {
        return true
      }
    }
    return false
  }

  every(predicate: (item: T) => boolean): boolean {
    for (const item of this.items) {
      if (!predicate(item)) {
        return false
      }
    }
    return true
  }

  // 変換
  map<U>(fn: (item: T) => U): ImmutableSet<U> {
    const newItems = new Set<U>()
    for (const item of this.items) {
      newItems.add(fn(item))
    }
    return new ImmutableSet(newItems)
  }

  toList(): ImmutableList<T> {
    return ImmutableList.from(this.items)
  }

  toArray(): T[] {
    return Array.from(this.items)
  }

  toSet(): Set<T> {
    return new Set(this.items)
  }

  toString(): string {
    return `ImmutableSet(${this.size()}){${Array.from(this.items).join(', ')}}`
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]()
  }

  // 等価性チェック
  equals(other: ImmutableSet<T>): boolean {
    if (this.size() !== other.size()) {
      return false
    }
    for (const item of this.items) {
      if (!other.has(item)) {
        return false
      }
    }
    return true
  }
}

// ===== イミュータブルレコード =====

export abstract class ImmutableRecord<T extends Record<string, unknown>> {
  protected constructor(private readonly data: T) {}

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key]
  }

  set<K extends keyof T>(key: K, value: T[K]): this {
    if (this.data[key] === value) {
      return this
    }
    return this.create({ ...this.data, [key]: value })
  }

  update<K extends keyof T>(key: K, updater: (value: T[K]) => T[K]): this {
    return this.set(key, updater(this.data[key]))
  }

  merge(updates: Partial<T>): this {
    return this.create({ ...this.data, ...updates })
  }

  delete<K extends keyof T>(key: K): Omit<this, K> {
    const { [key]: _, ...rest } = this.data
    return this.create(rest as any)
  }

  toObject(): T {
    return { ...this.data }
  }

  toString(): string {
    return `${this.constructor.name}(${JSON.stringify(this.data)})`
  }

  equals(other: ImmutableRecord<T>): boolean {
    const keys1 = Object.keys(this.data) as Array<keyof T>
    const keys2 = Object.keys(other.data) as Array<keyof T>
    
    if (keys1.length !== keys2.length) {
      return false
    }
    
    for (const key of keys1) {
      if (this.data[key] !== other.data[key]) {
        return false
      }
    }
    
    return true
  }

  protected abstract create(data: T): this
}

// ===== ファクトリー関数 =====

export const List = ImmutableList
export const Map = ImmutableMap
export const Set = ImmutableSet

export const list = <T>(...items: T[]): ImmutableList<T> => 
  ImmutableList.of(...items)

export const map = <K, V>(...entries: Array<[K, V]>): ImmutableMap<K, V> =>
  ImmutableMap.of(...entries)

export const set = <T>(...items: T[]): ImmutableSet<T> =>
  ImmutableSet.of(...items)

// ===== レンズ（Lens）パターン =====

export interface Lens<S, A> {
  get: (s: S) => A
  set: (a: A) => (s: S) => S
}

export const lens = <S, A>(
  getter: (s: S) => A,
  setter: (a: A) => (s: S) => S
): Lens<S, A> => ({
  get: getter,
  set: setter
})

export const view = <S, A>(lens: Lens<S, A>) => (s: S): A => lens.get(s)

export const set = <S, A>(lens: Lens<S, A>) => (a: A) => (s: S): S => lens.set(a)(s)

export const over = <S, A>(lens: Lens<S, A>) => (f: (a: A) => A) => (s: S): S =>
  lens.set(f(lens.get(s)))(s)

// 基本レンズ
export const prop = <S, K extends keyof S>(key: K): Lens<S, S[K]> =>
  lens(
    (s: S) => s[key],
    (value: S[K]) => (s: S) => ({ ...s, [key]: value })
  )

// レンズ合成
export const compose = <S, A, B>(
  lensA: Lens<S, A>,
  lensB: Lens<A, B>
): Lens<S, B> =>
  lens(
    (s: S) => lensB.get(lensA.get(s)),
    (b: B) => (s: S) => lensA.set(lensB.set(b)(lensA.get(s)))(s)
  )