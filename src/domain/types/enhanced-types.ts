/**
 * 強化された型定義システム
 * 型安全性とコード補完を大幅に向上
 */

// ===========================================
// Utility Types（再利用可能なジェネリック型）
// ===========================================

/**
 * 深い読み取り専用型
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

/**
 * 部分的に必須の型
 */
export type PartialRequired<T, K extends keyof T> = Partial<T> & Required<Pick<T, K>>

/**
 * 型安全なイベントハンドラー
 */
export type EventHandler<T> = (event: T) => void | Promise<void>

/**
 * 結果型（成功・失敗の両方を表現）
 */
export type Result<T, E = Error> = 
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: E }

/**
 * 非同期結果型
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>

/**
 * オプショナルプロミス型（同期・非同期両対応）
 */
export type MaybeAsync<T> = T | Promise<T>

// ===========================================
// Domain-Specific Types（ドメイン固有型）
// ===========================================

/**
 * 強化されたゲーム設定
 */
export interface EnhancedGameConfig {
  readonly difficulty: 'easy' | 'normal' | 'hard' | 'expert'
  readonly startingVitality: number
  readonly startingHandSize: number
  readonly maxHandSize: number
  readonly dreamCardCount: number
  
  // 拡張設定
  readonly enableTutorial?: boolean
  readonly enableAnalytics?: boolean
  readonly customRules?: Record<string, any>
  readonly plugins?: string[]
}

/**
 * 型安全なカード種別
 */
export const CARD_TYPES = ['life', 'challenge', 'insurance', 'dream'] as const
export type CardType = typeof CARD_TYPES[number]

/**
 * 型安全なゲームフェーズ
 */
export const GAME_PHASES = ['setup', 'draw', 'challenge', 'card_selection', 'resolution'] as const
export type GamePhase = typeof GAME_PHASES[number]

/**
 * 型安全なゲームステータス
 */
export const GAME_STATUSES = ['not_started', 'in_progress', 'paused', 'game_over', 'victory'] as const
export type GameStatus = typeof GAME_STATUSES[number]

/**
 * 型安全なゲームステージ
 */
export const GAME_STAGES = ['youth', 'middle_age', 'fulfillment'] as const
export type GameStage = typeof GAME_STAGES[number]

/**
 * コマンドパターンのインターフェース
 */
export interface Command<TInput = void, TOutput = void> {
  readonly name: string
  execute(input: TInput): MaybeAsync<Result<TOutput>>
  undo?(): MaybeAsync<Result<void>>
  canExecute?(input: TInput): boolean
}

/**
 * ストラテジーパターンのインターフェース
 */
export interface Strategy<TContext, TResult> {
  readonly name: string
  execute(context: TContext): MaybeAsync<TResult>
}

/**
 * オブザーバーパターンのインターフェース
 */
export interface Observer<T> {
  update(data: T): void | Promise<void>
}

export interface Observable<T> {
  subscribe(observer: Observer<T>): () => void
  unsubscribe(observer: Observer<T>): void
  notify(data: T): void | Promise<void>
}

/**
 * ファクトリーパターンのインターフェース
 */
export interface Factory<T, K extends string = string> {
  create(type: K, ...args: any[]): T
  supports(type: K): boolean
}

/**
 * 型安全なイベント定義
 */
export interface TypedEventMap {
  'game:start': { gameId: string; config: EnhancedGameConfig }
  'game:end': { gameId: string; result: 'victory' | 'defeat'; stats: any }
  'card:draw': { cardIds: string[]; count: number }
  'card:play': { cardId: string; power: number }
  'challenge:start': { challengeId: string; difficulty: number }
  'challenge:complete': { challengeId: string; success: boolean; reward?: any }
  'insurance:add': { insuranceId: string; type: string; premium: number }
  'insurance:expire': { insuranceId: string; type: string }
  'phase:change': { from: GamePhase; to: GamePhase }
  'stage:change': { from: GameStage; to: GameStage }
  'vitality:change': { previous: number; current: number; change: number }
}

/**
 * 型安全なイベントエミッター
 */
export interface TypedEventEmitter<T extends Record<string, any> = TypedEventMap> {
  on<K extends keyof T>(event: K, handler: EventHandler<T[K]>): () => void
  off<K extends keyof T>(event: K, handler: EventHandler<T[K]>): void
  emit<K extends keyof T>(event: K, data: T[K]): void | Promise<void>
}

/**
 * 型安全なサービスレジストリ
 */
export interface ServiceRegistry {
  register<T>(name: string, service: T): void
  get<T>(name: string): T | undefined
  has(name: string): boolean
  unregister(name: string): boolean
}

/**
 * 型安全な設定システム
 */
export interface ConfigurationSystem<T extends Record<string, any> = Record<string, any>> {
  get<K extends keyof T>(key: K): T[K]
  set<K extends keyof T>(key: K, value: T[K]): void
  has(key: keyof T): boolean
  getAll(): DeepReadonly<T>
  reset(): void
  watch<K extends keyof T>(key: K, callback: (newValue: T[K], oldValue: T[K]) => void): () => void
}

// ===========================================
// Validation Types（バリデーション型）
// ===========================================

/**
 * バリデーション結果
 */
export interface ValidationResult {
  readonly isValid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
}

/**
 * バリデータ関数型
 */
export type Validator<T> = (value: T) => ValidationResult

/**
 * 型安全なバリデータービルダー
 */
export interface ValidatorBuilder<T> {
  required(message?: string): ValidatorBuilder<T>
  min(value: number, message?: string): ValidatorBuilder<T>
  max(value: number, message?: string): ValidatorBuilder<T>
  pattern(regex: RegExp, message?: string): ValidatorBuilder<T>
  custom(validator: Validator<T>): ValidatorBuilder<T>
  build(): Validator<T>
}

// ===========================================
// Plugin System Types（プラグインシステム型）
// ===========================================

/**
 * プラグインのメタデータ
 */
export interface PluginMetadata {
  readonly name: string
  readonly version: string
  readonly description: string
  readonly author: string
  readonly dependencies: readonly string[]
  readonly optionalDependencies: readonly string[]
}

/**
 * プラグインのライフサイクル
 */
export interface PluginLifecycle {
  onInstall?(): MaybeAsync<void>
  onActivate?(): MaybeAsync<void>
  onDeactivate?(): MaybeAsync<void>
  onUninstall?(): MaybeAsync<void>
}

/**
 * プラグインインターフェース
 */
export interface Plugin extends PluginLifecycle {
  readonly metadata: PluginMetadata
  readonly hooks: Record<string, Function>
}

/**
 * プラグインマネージャーインターフェース
 */
export interface PluginManager {
  install(plugin: Plugin): AsyncResult<void>
  uninstall(pluginName: string): AsyncResult<void>
  activate(pluginName: string): AsyncResult<void>
  deactivate(pluginName: string): AsyncResult<void>
  getPlugin(name: string): Plugin | undefined
  getAllPlugins(): readonly Plugin[]
  isActive(pluginName: string): boolean
}

// ===========================================
// Type Guards（型ガード）
// ===========================================

/**
 * カードタイプの型ガード
 */
export function isCardType(value: any): value is CardType {
  return CARD_TYPES.includes(value)
}

/**
 * ゲームフェーズの型ガード
 */
export function isGamePhase(value: any): value is GamePhase {
  return GAME_PHASES.includes(value)
}

/**
 * ゲームステータスの型ガード
 */
export function isGameStatus(value: any): value is GameStatus {
  return GAME_STATUSES.includes(value)
}

/**
 * ゲームステージの型ガード
 */
export function isGameStage(value: any): value is GameStage {
  return GAME_STAGES.includes(value)
}

/**
 * 結果型の型ガード
 */
export function isSuccess<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true
}

export function isFailure<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false
}

// ===========================================
// Builder Pattern Types（ビルダーパターン型）
// ===========================================

/**
 * ビルダーパターンの基底インターフェース
 */
export interface Builder<T> {
  build(): T
  reset(): this
}

/**
 * 流暢なビルダーインターフェース
 */
export interface FluentBuilder<T> extends Builder<T> {
  clone(): this
}

// ===========================================
// Testing Types（テスト用型）
// ===========================================

/**
 * モックオブジェクト型
 */
export type Mock<T> = {
  [P in keyof T]: T[P] extends (...args: any[]) => any 
    ? jest.MockedFunction<T[P]>
    : T[P]
}

/**
 * テストダブル型
 */
export interface TestDouble<T> {
  readonly original: T
  readonly mock: Mock<T>
  reset(): void
  verify(): void
}

/**
 * テストファクトリー
 */
export interface TestFactory<T> {
  create(overrides?: Partial<T>): T
  createMany(count: number, overrides?: Partial<T>): T[]
}