/**
 * 高度なTypeScript型システム実装
 * 
 * Template Literal Types、Conditional Types、Mapped Types を活用した
 * 業界最高水準の型安全性を提供
 */

// ===== Template Literal Types =====

/**
 * API エンドポイント型（型安全なURL構築）
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
export type ApiVersion = 'v1' | 'v2'
export type ApiPath = `games` | `players` | `statistics` | `achievements`

export type ApiEndpoint<V extends ApiVersion = 'v1', P extends ApiPath = ApiPath> = `/api/${V}/${P}`

// 使用例: type GameEndpoint = ApiEndpoint<'v1', 'games'> // "/api/v1/games"

/**
 * Event名の型安全構築
 */
export type GameEvent = 'game' | 'card' | 'player' | 'turn'
export type GameAction = 'created' | 'updated' | 'deleted' | 'selected' | 'drawn' | 'played'

export type EventName<E extends GameEvent = GameEvent, A extends GameAction = GameAction> = `${E}:${A}`

// 使用例: type CardSelectedEvent = EventName<'card', 'selected'> // "card:selected"

/**
 * CSS クラス名の型安全構築
 */
export type ComponentName = 'game' | 'card' | 'deck' | 'player' | 'statistics'
export type Modifier = 'active' | 'disabled' | 'highlighted' | 'selected' | 'loading'
export type Size = 'small' | 'medium' | 'large'

export type CssClass<C extends ComponentName, M extends Modifier | Size | '' = ''> = 
  M extends '' ? C : `${C}--${M}`

// 使用例: type ActiveCard = CssClass<'card', 'active'> // "card--active"

// ===== Conditional Types =====

/**
 * プロパティ型による条件分岐
 */
export type ExtractByType<T, U> = {
  [K in keyof T]: T[K] extends U ? K : never
}[keyof T]

export type ExtractStringProps<T> = ExtractByType<T, string>
export type ExtractNumberProps<T> = ExtractByType<T, number>
export type ExtractFunctionProps<T> = ExtractByType<T, Function>

/**
 * 配列かどうかを判定する型
 */
export type IsArray<T> = T extends readonly unknown[] ? true : false

/**
 * Promise型を抽出
 */
export type UnwrapPromise<T> = T extends Promise<infer U> ? U : T

/**
 * 関数の戻り値型を抽出
 */
export type ExtractReturnType<T> = T extends (...args: any[]) => infer R ? R : never

/**
 * 深い階層のプロパティアクセス型
 */
export type DeepKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${DeepKeyOf<T[K]>}`
    : `${K}`
}[keyof T & (string | number)]

/**
 * パスによる型取得
 */
export type DeepGet<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepGet<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never

// ===== Mapped Types =====

/**
 * 特定のプロパティのみOptional化
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * 特定のプロパティのみRequired化
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * 全プロパティをnullable化
 */
export type Nullable<T> = {
  [P in keyof T]: T[P] | null
}

/**
 * 全プロパティをOptional化（再帰）
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/**
 * プロパティの型変換
 */
export type Transform<T, From, To> = {
  [K in keyof T]: T[K] extends From ? To : T[K]
}

/**
 * キーの型変換（文字列からnumberへ等）
 */
export type TransformKeys<T, U extends PropertyKey> = {
  [K in keyof T as K extends string ? U : K]: T[K]
}

// ===== Phantom Types（幽霊型）=====

/**
 * 単位付き数値型（型レベルでの単位チェック）
 */
declare const __unit: unique symbol
export type Unit<T, U extends string> = T & { [__unit]: U }

export type Pixel = Unit<number, 'px'>
export type Percent = Unit<number, '%'>
export type Second = Unit<number, 's'>
export type Millisecond = Unit<number, 'ms'>

// 単位変換関数
export const px = (value: number): Pixel => value as Pixel
export const percent = (value: number): Percent => value as Percent
export const seconds = (value: number): Second => value as Second
export const milliseconds = (value: number): Millisecond => value as Millisecond

/**
 * 状態マシン型（型レベルでの状態遷移制御）
 */
export type StateMachine<States extends string, Transitions extends Record<States, States[]>> = {
  readonly currentState: States
  readonly canTransitionTo: <T extends States>(target: T) => target extends Transitions[States][number] ? true : false
  readonly transitionTo: <T extends States>(target: T) => T extends Transitions[States][number] ? StateMachine<T, Transitions> : never
}

// ゲーム状態マシンの定義
export type GameStates = 'idle' | 'playing' | 'paused' | 'ended'
export type GameTransitions = {
  idle: ['playing']
  playing: ['paused', 'ended']
  paused: ['playing', 'ended']  
  ended: ['idle']
}

export type GameStateMachine = StateMachine<GameStates, GameTransitions>

// ===== 高度なユーティリティ型 =====

/**
 * Union型から配列型へ
 */
export type UnionToArray<T> = T extends any ? [T] : never

/**
 * 交差型のマージ
 */
export type Merge<T, U> = Omit<T, keyof U> & U

/**
 * 型の等価性チェック
 */
export type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false

/**
 * 型のサイズ計算（プロパティ数）
 */
export type ObjectSize<T> = keyof T extends never ? 0 : keyof T['length'] extends number ? T['length'] : never

/**
 * 関数オーバーロード支援型
 */
export type Overload<T> = T extends {
  (...args: infer A1): infer R1
  (...args: infer A2): infer R2
  (...args: infer A3): infer R3
  (...args: infer A4): infer R4
} ? {
  (...args: A1): R1
  (...args: A2): R2  
  (...args: A3): R3
  (...args: A4): R4
} : T extends {
  (...args: infer A1): infer R1
  (...args: infer A2): infer R2
  (...args: infer A3): infer R3
} ? {
  (...args: A1): R1
  (...args: A2): R2
  (...args: A3): R3
} : T extends {
  (...args: infer A1): infer R1
  (...args: infer A2): infer R2
} ? {
  (...args: A1): R1
  (...args: A2): R2
} : T

// ===== 型レベル計算 =====

/**
 * 型レベルでの足し算
 */
type Increment<N extends number> = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10][N]
type Decrement<N extends number> = [never, never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9][N]

/**
 * 配列の長さを型レベルで取得
 */
export type ArrayLength<T extends readonly unknown[]> = T['length']

/**
 * 型レベルでの条件分岐（if-then-else）
 */
export type If<Condition extends boolean, Then, Else> = Condition extends true ? Then : Else

// ===== 実用的な型エイリアス =====

/**
 * ゲーム関連の高度な型定義
 */
export type GameEntityId<T extends string> = `${T}_${string}`
export type TimestampedEntity<T> = T & {
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type Serializable = string | number | boolean | null | undefined | SerializableObject | SerializableArray
export type SerializableObject = { [key: string]: Serializable }
export type SerializableArray = Serializable[]

/**
 * イベントハンドラ型の改善
 */
export type EventHandler<T = any> = (event: T) => void | Promise<void>
export type TypedEventEmitter<T extends Record<string, any[]>> = {
  on<K extends keyof T>(event: K, handler: (...args: T[K]) => void): void
  off<K extends keyof T>(event: K, handler: (...args: T[K]) => void): void
  emit<K extends keyof T>(event: K, ...args: T[K]): void
}

// ===== 型バリデーション =====

/**
 * 実行時型チェック関数の型定義
 */
export type TypeGuard<T> = (value: unknown) => value is T
export type TypePredicate<T> = (value: T) => boolean

/**
 * スキーマベースの型バリデーション
 */
export type Schema<T> = {
  [K in keyof T]: {
    type: string
    required?: boolean
    validator?: TypePredicate<T[K]>
    default?: T[K]
  }
}

/**
 * バリデーション結果型
 */
export type ValidationError = {
  field: string
  message: string
  value: unknown
}

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: ValidationError[] }