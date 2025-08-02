/**
 * ファンクター実装
 * 
 * Functor、Applicative、Monad の型クラスを実装し、
 * 関数型プログラミングの抽象化を提供
 */

// ===== 基本的なファンクター =====

/**
 * Functor 型クラス
 */
export interface Functor<F> {
  map<A, B>(fa: F, f: (a: A) => B): F
}

/**
 * Applicative Functor 型クラス
 */
export interface Applicative<F> extends Functor<F> {
  pure<A>(a: A): F
  apply<A, B>(fab: F, fa: F): F
}

/**
 * Monad 型クラス
 */
export interface Monad<F> extends Applicative<F> {
  flatMap<A, B>(fa: F, f: (a: A) => F): F
}

// ===== Identity ファンクター =====

export class Identity<A> {
  constructor(private readonly value: A) {}

  static of<A>(value: A): Identity<A> {
    return new Identity(value)
  }

  map<B>(f: (value: A) => B): Identity<B> {
    return new Identity(f(this.value))
  }

  flatMap<B>(f: (value: A) => Identity<B>): Identity<B> {
    return f(this.value)
  }

  chain<B>(f: (value: A) => Identity<B>): Identity<B> {
    return this.flatMap(f)
  }

  get(): A {
    return this.value
  }

  toString(): string {
    return `Identity(${this.value})`
  }
}

// ===== Const ファンクター =====

export class Const<A, B = never> {
  constructor(private readonly value: A) {}

  static of<A, B = never>(value: A): Const<A, B> {
    return new Const(value)
  }

  map<C>(_f: (value: B) => C): Const<A, C> {
    return new Const(this.value)
  }

  get(): A {
    return this.value
  }

  toString(): string {
    return `Const(${this.value})`
  }
}

// ===== リストファンクター =====

export class List<A> {
  constructor(private readonly items: readonly A[]) {}

  static empty<A>(): List<A> {
    return new List([])
  }

  static of<A>(...items: A[]): List<A> {
    return new List(items)
  }

  static from<A>(items: Iterable<A>): List<A> {
    return new List(Array.from(items))
  }

  map<B>(f: (item: A) => B): List<B> {
    return new List(this.items.map(f))
  }

  flatMap<B>(f: (item: A) => List<B>): List<B> {
    const result: B[] = []
    for (const item of this.items) {
      result.push(...f(item).items)
    }
    return new List(result)
  }

  chain<B>(f: (item: A) => List<B>): List<B> {
    return this.flatMap(f)
  }

  filter(predicate: (item: A) => boolean): List<A> {
    return new List(this.items.filter(predicate))
  }

  fold<B>(f: (acc: B, item: A) => B, initial: B): B {
    return this.items.reduce(f, initial)
  }

  length(): number {
    return this.items.length
  }

  isEmpty(): boolean {
    return this.items.length === 0
  }

  head(): A | undefined {
    return this.items[0]
  }

  tail(): List<A> {
    return new List(this.items.slice(1))
  }

  append(item: A): List<A> {
    return new List([...this.items, item])
  }

  prepend(item: A): List<A> {
    return new List([item, ...this.items])
  }

  concat(other: List<A>): List<A> {
    return new List([...this.items, ...other.items])
  }

  toArray(): A[] {
    return [...this.items]
  }

  toString(): string {
    return `List[${this.items.join(', ')}]`
  }

  [Symbol.iterator](): Iterator<A> {
    return this.items[Symbol.iterator]()
  }
}

// ===== Tree ファンクター =====

export abstract class Tree<A> {
  abstract map<B>(f: (value: A) => B): Tree<B>
  abstract fold<B>(f: (value: A, children: B[]) => B): B
}

export class Leaf<A> extends Tree<A> {
  constructor(private readonly value: A) {
    super()
  }

  map<B>(f: (value: A) => B): Tree<B> {
    return new Leaf(f(this.value))
  }

  fold<B>(f: (value: A, children: B[]) => B): B {
    return f(this.value, [])
  }

  getValue(): A {
    return this.value
  }

  toString(): string {
    return `Leaf(${this.value})`
  }
}

export class Branch<A> extends Tree<A> {
  constructor(
    private readonly value: A,
    private readonly children: readonly Tree<A>[]
  ) {
    super()
  }

  map<B>(f: (value: A) => B): Tree<B> {
    return new Branch(
      f(this.value),
      this.children.map(child => child.map(f))
    )
  }

  fold<B>(f: (value: A, children: B[]) => B): B {
    const childResults = this.children.map(child => child.fold(f))
    return f(this.value, childResults)
  }

  getValue(): A {
    return this.value
  }

  getChildren(): readonly Tree<A>[] {
    return this.children
  }

  toString(): string {
    const childrenStr = this.children.map(child => child.toString()).join(', ')
    return `Branch(${this.value}, [${childrenStr}])`
  }
}

// ===== パーサーファンクター =====

export interface ParseResult<A> {
  readonly success: boolean
  readonly value?: A
  readonly remaining?: string
  readonly error?: string
}

export class Parser<A> {
  constructor(
    private readonly parse: (input: string) => ParseResult<A>
  ) {}

  static pure<A>(value: A): Parser<A> {
    return new Parser(input => ({
      success: true,
      value,
      remaining: input
    }))
  }

  static fail<A>(error: string): Parser<A> {
    return new Parser(() => ({
      success: false,
      error
    }))
  }

  map<B>(f: (value: A) => B): Parser<B> {
    return new Parser(input => {
      const result = this.parse(input)
      if (result.success && result.value !== undefined) {
        return {
          success: true,
          value: f(result.value),
          remaining: result.remaining
        }
      }
      return result as ParseResult<B>
    })
  }

  flatMap<B>(f: (value: A) => Parser<B>): Parser<B> {
    return new Parser(input => {
      const result = this.parse(input)
      if (result.success && result.value !== undefined && result.remaining !== undefined) {
        return f(result.value).parse(result.remaining)
      }
      return result as ParseResult<B>
    })
  }

  chain<B>(f: (value: A) => Parser<B>): Parser<B> {
    return this.flatMap(f)
  }

  or(other: Parser<A>): Parser<A> {
    return new Parser(input => {
      const result = this.parse(input)
      return result.success ? result : other.parse(input)
    })
  }

  run(input: string): ParseResult<A> {
    return this.parse(input)
  }
}

// ===== 状態ファンクター =====

export class StateF<S, A> {
  constructor(
    private readonly runState: (state: S) => [A, S]
  ) {}

  static pure<S, A>(value: A): StateF<S, A> {
    return new StateF(state => [value, state])
  }

  static get<S>(): StateF<S, S> {
    return new StateF(state => [state, state])
  }

  static put<S>(newState: S): StateF<S, void> {
    return new StateF(() => [undefined as void, newState])
  }

  map<B>(f: (value: A) => B): StateF<S, B> {
    return new StateF(state => {
      const [value, newState] = this.runState(state)
      return [f(value), newState]
    })
  }

  flatMap<B>(f: (value: A) => StateF<S, B>): StateF<S, B> {
    return new StateF(state => {
      const [value, newState] = this.runState(state)
      return f(value).runState(newState)
    })
  }

  chain<B>(f: (value: A) => StateF<S, B>): StateF<S, B> {
    return this.flatMap(f)
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

// ===== 継続ファンクター =====

export class Cont<R, A> {
  constructor(
    private readonly computation: (k: (a: A) => R) => R
  ) {}

  static pure<R, A>(value: A): Cont<R, A> {
    return new Cont(k => k(value))
  }

  map<B>(f: (a: A) => B): Cont<R, B> {
    return new Cont(k => this.computation(a => k(f(a))))
  }

  flatMap<B>(f: (a: A) => Cont<R, B>): Cont<R, B> {
    return new Cont(k => 
      this.computation(a => 
        f(a).computation(k)
      )
    )
  }

  chain<B>(f: (a: A) => Cont<R, B>): Cont<R, B> {
    return this.flatMap(f)
  }

  run<T>(k: (a: A) => T): T {
    return this.computation(k)
  }

  callCC<B>(f: (escape: (a: A) => Cont<R, B>) => Cont<R, A>): Cont<R, A> {
    return new Cont(k => {
      const escape = (a: A): Cont<R, B> => new Cont(() => k(a))
      return f(escape).computation(k)
    })
  }
}

// ===== Zipper ファンクター =====

export class ListZipper<A> {
  constructor(
    private readonly lefts: readonly A[],
    private readonly focus: A,
    private readonly rights: readonly A[]
  ) {}

  static fromList<A>(list: A[]): ListZipper<A> | null {
    if (list.length === 0) return null
    return new ListZipper([], list[0]!, list.slice(1))
  }

  static singleton<A>(value: A): ListZipper<A> {
    return new ListZipper([], value, [])
  }

  map<B>(f: (value: A) => B): ListZipper<B> {
    return new ListZipper(
      this.lefts.map(f),
      f(this.focus),
      this.rights.map(f)
    )
  }

  getFocus(): A {
    return this.focus
  }

  setFocus(value: A): ListZipper<A> {
    return new ListZipper(this.lefts, value, this.rights)
  }

  updateFocus(f: (value: A) => A): ListZipper<A> {
    return this.setFocus(f(this.focus))
  }

  moveLeft(): ListZipper<A> | null {
    if (this.lefts.length === 0) return null
    
    const newFocus = this.lefts[this.lefts.length - 1]!
    const newLefts = this.lefts.slice(0, -1)
    const newRights = [this.focus, ...this.rights]
    
    return new ListZipper(newLefts, newFocus, newRights)
  }

  moveRight(): ListZipper<A> | null {
    if (this.rights.length === 0) return null
    
    const newFocus = this.rights[0]!
    const newLefts = [...this.lefts, this.focus]
    const newRights = this.rights.slice(1)
    
    return new ListZipper(newLefts, newFocus, newRights)
  }

  insertLeft(value: A): ListZipper<A> {
    return new ListZipper([...this.lefts, value], this.focus, this.rights)
  }

  insertRight(value: A): ListZipper<A> {
    return new ListZipper(this.lefts, this.focus, [value, ...this.rights])
  }

  deleteLeft(): ListZipper<A> | null {
    if (this.lefts.length === 0) return null
    return new ListZipper(this.lefts.slice(0, -1), this.focus, this.rights)
  }

  deleteRight(): ListZipper<A> | null {
    if (this.rights.length === 0) return null
    return new ListZipper(this.lefts, this.focus, this.rights.slice(1))
  }

  toList(): A[] {
    return [...this.lefts, this.focus, ...this.rights]
  }

  size(): number {
    return this.lefts.length + 1 + this.rights.length
  }

  toString(): string {
    const leftStr = this.lefts.join(', ')
    const rightStr = this.rights.join(', ')
    return `[${leftStr}] *${this.focus}* [${rightStr}]`
  }
}

// ===== ファンクター法則の検証 =====

export const validateFunctorLaws = {
  identity: <F, A>(
    functor: { map: (f: (a: A) => A) => F },
    equals: (a: F, b: F) => boolean
  ): boolean => {
    const identity = <T>(x: T): T => x
    const mapped = functor.map(identity)
    return equals(mapped, functor as any)
  },

  composition: <F, A, B, C>(
    functor: { map: (f: (a: A) => B) => { map: (g: (b: B) => C) => F } },
    f: (a: A) => B,
    g: (b: B) => C,
    equals: (a: F, b: F) => boolean
  ): boolean => {
    const composed = functor.map((x: A) => g(f(x)))
    const sequential = functor.map(f).map(g)
    return equals(composed, sequential)
  }
}

// ===== ユーティリティ関数 =====

export const liftA1 = <A, B>(f: (a: A) => B) => <F>(
  fa: { map: (fn: (a: A) => B) => F }
): F => fa.map(f)

export const liftA2 = <A, B, C>(f: (a: A, b: B) => C) => <F>(
  fa: { flatMap: (fn: (a: A) => F) => F },
  fb: { map: (fn: (b: B) => C) => F }
): F => fa.flatMap(a => fb.map(b => f(a, b)))

export const liftA3 = <A, B, C, D>(f: (a: A, b: B, c: C) => D) => <F>(
  fa: { flatMap: (fn: (a: A) => F) => F },
  fb: { flatMap: (fn: (b: B) => F) => F },
  fc: { map: (fn: (c: C) => D) => F }
): F => fa.flatMap(a => fb.flatMap(b => fc.map(c => f(a, b, c))))

export const sequence = <F, A>(
  applicative: {
    pure: (a: A[]) => F
    apply: (fab: F, fa: F) => F
  },
  items: Array<{ map: (f: (a: A) => any) => F }>
): F => {
  const cons = (head: A) => (tail: A[]): A[] => [head, ...tail]
  
  return items.reduce(
    (acc, item) => applicative.apply(
      item.map(cons) as any,
      acc
    ),
    applicative.pure([])
  )
}

export const traverse = <F, A, B>(
  applicative: {
    pure: (a: B[]) => F
    apply: (fab: F, fa: F) => F
  },
  f: (a: A) => { map: (fn: (b: B) => any) => F },
  items: A[]
): F => sequence(applicative, items.map(f))