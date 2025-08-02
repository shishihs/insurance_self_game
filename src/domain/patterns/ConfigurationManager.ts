import type { 
  ConfigurationSystem, 
  DeepReadonly, 
  EnhancedGameConfig,
  EventHandler 
} from '../types/enhanced-types'

/**
 * デフォルト設定
 */
const DEFAULT_CONFIG: EnhancedGameConfig = {
  difficulty: 'normal',
  startingVitality: 100,
  startingHandSize: 5,
  maxHandSize: 10,
  dreamCardCount: 3,
  enableTutorial: true,
  enableAnalytics: false,
  customRules: {},
  plugins: []
}

/**
 * 設定変更イベント
 */
interface ConfigChangeEvent<T> {
  key: string
  oldValue: T
  newValue: T
  timestamp: number
}

/**
 * 型安全な設定管理システム
 * 
 * Strategy Pattern: 異なる設定ソース（ローカルストレージ、サーバー等）に対応
 * Observer Pattern: 設定変更の監視機能
 */
export class ConfigurationManager implements ConfigurationSystem<EnhancedGameConfig> {
  private config: EnhancedGameConfig
  private readonly watchers: Map<keyof EnhancedGameConfig, Array<EventHandler<any>>> = new Map()
  private changeHistory: ConfigChangeEvent<any>[] = []
  private readonly maxHistorySize = 50

  constructor(initialConfig?: Partial<EnhancedGameConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig }
  }

  /**
   * 設定値を取得
   */
  get<K extends keyof EnhancedGameConfig>(key: K): EnhancedGameConfig[K] {
    return this.config[key]
  }

  /**
   * 設定値を更新
   */
  set<K extends keyof EnhancedGameConfig>(key: K, value: EnhancedGameConfig[K]): void {
    const oldValue = this.config[key]
    
    if (oldValue === value) {
      return // 変更なしの場合はスキップ
    }

    this.config[key] = value

    // 変更履歴を記録
    this.addToHistory({ key: String(key), oldValue, newValue: value, timestamp: Date.now() })

    // 監視者に通知
    this.notifyWatchers(key, value, oldValue)
  }

  /**
   * 設定キーが存在するかチェック
   */
  has(key: keyof EnhancedGameConfig): boolean {
    return key in this.config
  }

  /**
   * 全設定を取得（読み取り専用）
   */
  getAll(): DeepReadonly<EnhancedGameConfig> {
    return JSON.parse(JSON.stringify(this.config))
  }

  /**
   * 設定をデフォルトにリセット
   */
  reset(): void {
    const oldConfig = { ...this.config }
    this.config = { ...DEFAULT_CONFIG }

    // 全ての変更を通知
    for (const key of Object.keys(oldConfig) as Array<keyof EnhancedGameConfig>) {
      if (oldConfig[key] !== this.config[key]) {
        this.notifyWatchers(key, this.config[key], oldConfig[key])
      }
    }
  }

  /**
   * 設定変更を監視
   */
  watch<K extends keyof EnhancedGameConfig>(
    key: K, 
    callback: (newValue: EnhancedGameConfig[K], oldValue: EnhancedGameConfig[K]) => void
  ): () => void {
    const watchers = this.watchers.get(key) || []
    watchers.push(callback)
    this.watchers.set(key, watchers)

    // 監視解除関数を返す
    return () => {
      const currentWatchers = this.watchers.get(key) || []
      const index = currentWatchers.indexOf(callback)
      if (index > -1) {
        currentWatchers.splice(index, 1)
      }
    }
  }

  /**
   * 特定キーの全監視者を削除
   */
  removeWatchers(key: keyof EnhancedGameConfig): void {
    this.watchers.delete(key)
  }

  /**
   * 全監視者を削除
   */
  removeAllWatchers(): void {
    this.watchers.clear()
  }

  /**
   * 設定をJSONから読み込み
   */
  loadFromJSON(json: string): void {
    try {
      const loaded = JSON.parse(json)
      this.updateFromObject(loaded)
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
      throw new Error('Invalid configuration JSON')
    }
  }

  /**
   * 設定をJSONとして出力
   */
  toJSON(): string {
    return JSON.stringify(this.config, null, 2)
  }

  /**
   * ローカルストレージから読み込み
   */
  loadFromLocalStorage(key: string = 'game-config'): boolean {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        this.loadFromJSON(stored)
        return true
      }
    } catch (error) {
      console.warn('ローカルストレージからの読み込みに失敗:', error)
    }
    return false
  }

  /**
   * ローカルストレージに保存
   */
  saveToLocalStorage(key: string = 'game-config'): boolean {
    try {
      localStorage.setItem(key, this.toJSON())
      return true
    } catch (error) {
      console.error('ローカルストレージへの保存に失敗:', error)
      return false
    }
  }

  /**
   * 設定変更履歴を取得
   */
  getChangeHistory(): readonly ConfigChangeEvent<any>[] {
    return [...this.changeHistory]
  }

  /**
   * 変更履歴をクリア
   */
  clearHistory(): void {
    this.changeHistory = []
  }

  /**
   * 設定の妥当性検証
   */
  validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // 数値範囲チェック
    if (this.config.startingVitality < 1 || this.config.startingVitality > 1000) {
      errors.push('開始活力は1-1000の範囲で設定してください')
    }

    if (this.config.startingHandSize < 1 || this.config.startingHandSize > 15) {
      errors.push('初期手札枚数は1-15の範囲で設定してください')
    }

    if (this.config.maxHandSize < this.config.startingHandSize) {
      errors.push('最大手札枚数は初期手札枚数以上に設定してください')
    }

    if (this.config.dreamCardCount < 0 || this.config.dreamCardCount > 10) {
      errors.push('夢カード枚数は0-10の範囲で設定してください')
    }

    // 難易度チェック
    const validDifficulties = ['easy', 'normal', 'hard', 'expert']
    if (!validDifficulties.includes(this.config.difficulty)) {
      errors.push(`無効な難易度です: ${this.config.difficulty}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  /**
   * 設定プロファイルの作成（難易度別）
   */
  static createProfile(difficulty: EnhancedGameConfig['difficulty']): EnhancedGameConfig {
    const base = { ...DEFAULT_CONFIG }

    switch (difficulty) {
      case 'easy':
        return {
          ...base,
          difficulty,
          startingVitality: 120,
          startingHandSize: 6,
          maxHandSize: 12
        }

      case 'normal':
        return base

      case 'hard':
        return {
          ...base,
          difficulty,
          startingVitality: 80,
          startingHandSize: 4,
          maxHandSize: 8
        }

      case 'expert':
        return {
          ...base,
          difficulty,
          startingVitality: 60,
          startingHandSize: 3,
          maxHandSize: 6,
          dreamCardCount: 5
        }

      default:
        return base
    }
  }

  /**
   * 監視者に通知（内部使用）
   */
  private notifyWatchers<K extends keyof EnhancedGameConfig>(
    key: K,
    newValue: EnhancedGameConfig[K],
    oldValue: EnhancedGameConfig[K]
  ): void {
    const watchers = this.watchers.get(key) || []
    watchers.forEach(watcher => {
      try {
        watcher(newValue, oldValue)
      } catch (error) {
        console.error(`設定監視者でエラーが発生しました (${String(key)}):`, error)
      }
    })
  }

  /**
   * オブジェクトから設定を更新（内部使用）
   */
  private updateFromObject(obj: Partial<EnhancedGameConfig>): void {
    for (const [key, value] of Object.entries(obj)) {
      if (key in DEFAULT_CONFIG) {
        this.set(key as keyof EnhancedGameConfig, value)
      }
    }
  }

  /**
   * 変更履歴に追加（内部使用）
   */
  private addToHistory(event: ConfigChangeEvent<any>): void {
    this.changeHistory.push(event)

    // 履歴サイズ制限
    if (this.changeHistory.length > this.maxHistorySize) {
      this.changeHistory.shift()
    }
  }
}

/**
 * グローバル設定インスタンス（シングルトン）
 */
export const globalConfig = new ConfigurationManager()

/**
 * 設定ファクトリー
 */
export class ConfigurationFactory {
  /**
   * デバッグ用設定を作成
   */
  static createDebugConfig(): EnhancedGameConfig {
    return {
      ...DEFAULT_CONFIG,
      difficulty: 'easy',
      startingVitality: 1000,
      startingHandSize: 10,
      maxHandSize: 20,
      enableAnalytics: true,
      customRules: {
        fastMode: true,
        unlimitedCards: true
      }
    }
  }

  /**
   * テスト用設定を作成
   */
  static createTestConfig(): EnhancedGameConfig {
    return {
      ...DEFAULT_CONFIG,
      difficulty: 'normal',
      enableTutorial: false,
      enableAnalytics: false,
      customRules: {
        skipAnimations: true,
        deterministicRandom: true
      }
    }
  }

  /**
   * プロダクション用設定を作成
   */
  static createProductionConfig(): EnhancedGameConfig {
    return {
      ...DEFAULT_CONFIG,
      enableAnalytics: true,
      customRules: {}
    }
  }
}