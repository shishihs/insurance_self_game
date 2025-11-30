import type { GameStage } from '../types/card.types'
import type { DreamCategory } from '../types/card.types'

/**
 * ゲーム定数管理
 * 
 * ゲーム全体で使用される定数を一元管理し、
 * マジックナンバーを排除してメンテナンス性を向上させる。
 */

/**
 * 年齢ステージ関連の定数
 */
export const AGE_CONSTANTS = {
  /**
   * 各ステージの基本パラメータ
   */
  STAGE_PARAMETERS: {
    youth: {
      label: '青年期',
      maxVitality: 100,
      startTurn: 0,
      endTurn: 14,
      insuranceMultiplier: 1.0,
      challengeDifficultyModifier: 1.0
    },
    middle: {
      label: '中年期',
      maxVitality: 80,
      startTurn: 15,
      endTurn: 29,
      insuranceMultiplier: 1.2,
      challengeDifficultyModifier: 1.1
    },
    fulfillment: {
      label: '充実期',
      maxVitality: 60,
      startTurn: 30,
      endTurn: Infinity,
      insuranceMultiplier: 1.3,
      challengeDifficultyModifier: 1.2
    }
  } as const,

  /**
   * 年齢ボーナス計算式
   */
  AGE_BONUS: {
    youth: 0,
    middle: 0.5,
    fulfillment: 1.0
  } as const,

  /**
   * 活力上限調整パラメータ
   */
  VITALITY_LIMITS: {
    youth: 100,
    middle: 80,
    fulfillment: 60
  } as const
} as const

/**
 * 夢カード関連の定数
 */
export const DREAM_CONSTANTS = {
  /**
   * 夢カテゴリ別の年齢調整値
   */
  AGE_ADJUSTMENTS: {
    physical: -2,    // 身体系は年齢とともに難しくなる
    intellectual: 1, // 知的系は経験で易しくなる
    mixed: -1       // 混合系は少し難しくなる
  } as const satisfies Record<DreamCategory, number>,

  /**
   * 夢カードの基本設定
   */
  BASE_SETTINGS: {
    minPower: 1,        // 最小パワー
    maxPower: 15,       // 最大パワー
    defaultPower: 5     // デフォルトパワー
  } as const
} as const

/**
 * 保険関連の定数
 */
export const INSURANCE_CONSTANTS = {
  /**
   * 保険料計算の基本パラメータ
   */
  PREMIUM_CALCULATION: {
    baseCostMultiplier: 1.0,      // 基本コスト倍率
    ageMultiplierStart: 1.0,      // 年齢倍率開始値
    ageMultiplierIncrement: 0.2,  // 年齢倍率増分
    coverageRateBase: 50,         // カバレッジ基準値
    multiInsurancePenalty: 0.1    // 複数保険ペナルティ（3枚ごと）
  } as const,

  /**
   * 保険種類別の料率
   */
  TYPE_RATES: {
    medical: 1.0,     // 医療保険: 基準料率
    life: 1.2,        // 生命保険: 20%高
    income: 1.0,      // 収入保障: 基準料率
    disability: 0.8,  // 障害保険: 20%安
    accident: 0.6,    // 事故保険: 40%安
    cancer: 1.5,      // がん保険: 50%高
    dental: 0.4,      // 歯科保険: 60%安
    travel: 0.3       // 旅行保険: 70%安
  } as const,

  /**
   * 保険期間設定
   */
  DURATION_SETTINGS: {
    termInsurance: {
      defaultDuration: 10,  // 定期保険のデフォルト期間
      costDiscount: 0.7     // 定期保険のコスト割引率
    },
    wholeLifeInsurance: {
      costMultiplier: 1.0   // 終身保険のコスト倍率
    }
  } as const,

  /**
   * 保険使用実績による調整
   */
  USAGE_ADJUSTMENTS: {
    continuityDiscount: {
      noUsage: 0.1,      // 未使用: 10%割引
      lowUsage: 0.05,    // 低使用(1-2回): 5%割引
      normalUsage: 0     // 通常使用: 割引なし
    },
    riskMultiplier: {
      highUsage: 1.3,    // 高使用(5回以上): 30%増し
      moderateUsage: 1.1, // 中程度使用(3-4回): 10%増し
      lowUsage: 1.0      // 低使用: 基準料金
    }
  } as const
} as const

/**
 * ゲームバランス関連の定数
 */
export const BALANCE_CONSTANTS = {
  /**
   * カード関連
   */
  CARD_LIMITS: {
    maxHandSize: 10,           // 最大手札数
    startingHandSize: 5,       // 初期手札数
    defaultDrawCount: 1,       // デフォルトドロー数
    maxDeckSize: 100          // 最大デッキサイズ
  } as const,

  /**
   * チャレンジ関連
   */
  CHALLENGE_SETTINGS: {
    minDifficulty: 1,          // 最小難易度
    maxDifficulty: 20,         // 最大難易度
    successBonusBase: 2,       // 成功時ボーナス基準値
    failurePenaltyRatio: 1.0,  // 失敗時ペナルティ比率
    enableDynamicDifficulty: true // 動的難易度調整の有効化
  } as const,

  /**
   * 活力関連
   */
  VITALITY_SETTINGS: {
    defaultStarting: 100,      // デフォルト初期活力
    minimumValue: 0,           // 最小活力値
    maximumValue: 150,         // 最大活力値
    healingCap: 0.8           // 回復上限（最大活力の80%）
  } as const,

  /**
   * ゲーム進行関連
   */
  PROGRESSION_SETTINGS: {
    maxTurns: 50,              // 最大ターン数
    stageTransitionTurns: {    // ステージ転換ターン
      youthToMiddle: 15,
      middleToFulfillment: 30
    },
    victoryConditions: {
      minTurns: 20,            // 勝利条件最小ターン
      minVitality: 50          // 勝利条件最小活力
    }
  } as const
} as const

/**
 * パフォーマンス関連の定数
 */
export const PERFORMANCE_CONSTANTS = {
  /**
   * キャッシュ設定
   */
  CACHE_SETTINGS: {
    stateSnapshotTTL: 50,      // 状態スナップショットTTL (ms)
    calculationCacheTTL: 100,  // 計算キャッシュTTL (ms)
    maxCacheEntries: 100       // 最大キャッシュエントリ数
  } as const,

  /**
   * オブジェクトプール設定
   */
  OBJECT_POOL_LIMITS: {
    maxPoolSize: 10,           // 最大プールサイズ
    initialPoolSize: 3         // 初期プールサイズ
  } as const,

  /**
   * 処理制限
   */
  PROCESSING_LIMITS: {
    maxCardsPerSelection: 20,  // 選択可能最大カード数
    maxInsuranceCards: 30,     // 最大保険カード数
    maxHistoryEntries: 1000    // 最大履歴エントリ数
  } as const
} as const

/**
 * UI関連の定数
 */
export const UI_CONSTANTS = {
  /**
   * アニメーション設定
   */
  ANIMATION_DURATIONS: {
    cardFlip: 300,           // カードフリップ (ms)
    cardDraw: 500,           // カードドロー (ms)
    phaseTransition: 800,    // フェーズ転換 (ms)
    messageDisplay: 2000     // メッセージ表示 (ms)
  } as const,

  /**
   * 表示設定
   */
  DISPLAY_SETTINGS: {
    maxVisibleCards: 12,     // 最大表示カード数
    cardSpacing: 10,         // カード間隔 (px)
    messageMaxLength: 200    // メッセージ最大長
  } as const
} as const

/**
 * デバッグ・テスト関連の定数
 */
export const DEBUG_CONSTANTS = {
  /**
   * ログ設定
   */
  LOGGING: {
    maxLogEntries: 500,      // 最大ログエントリ数
    logRetentionDays: 7      // ログ保持日数
  } as const,

  /**
   * テスト設定
   */
  TESTING: {
    fastMode: false,         // 高速モード
    skipAnimations: false,   // アニメーションスキップ
    debugVitality: false     // 活力デバッグ
  } as const
} as const

/**
 * 定数の型安全なアクセサ
 */
import type { BalanceConfig } from '../types/game.types'

/**
 * 定数の型安全なアクセサ
 */
export class GameConstantsAccessor {
  private static overrides: BalanceConfig | undefined

  /**
   * オーバーライド設定を適用
   */
  static setOverrides(config?: BalanceConfig) {
    this.overrides = config
  }

  /**
   * オーバーライドをクリア
   */
  static clearOverrides() {
    this.overrides = undefined
  }

  /**
   * ステージパラメータを安全に取得
   */
  static getStageParameters(stage: GameStage) {
    const base = AGE_CONSTANTS.STAGE_PARAMETERS[stage] || AGE_CONSTANTS.STAGE_PARAMETERS.youth
    if (this.overrides?.stageParameters?.[stage]) {
      return { ...base, ...this.overrides.stageParameters[stage] }
    }
    return base
  }

  /**
   * 夢カード年齢調整値を安全に取得
   */
  static getDreamAgeAdjustment(category: DreamCategory): number {
    return DREAM_CONSTANTS.AGE_ADJUSTMENTS[category] ?? 0
  }

  /**
   * 保険種類別料率を安全に取得
   */
  static getInsuranceTypeRate(type: keyof typeof INSURANCE_CONSTANTS.TYPE_RATES): number {
    return INSURANCE_CONSTANTS.TYPE_RATES[type] ?? 1.0
  }

  /**
   * バランス設定を取得
   */
  static getBalanceSettings() {
    const base = BALANCE_CONSTANTS
    if (this.overrides) {
      return {
        ...base,
        CARD_LIMITS: { ...base.CARD_LIMITS, ...this.overrides.cardLimits },
        CHALLENGE_SETTINGS: { ...base.CHALLENGE_SETTINGS, ...this.overrides.challengeSettings },
        VITALITY_SETTINGS: { ...base.VITALITY_SETTINGS, ...this.overrides.vitalitySettings },
        PROGRESSION_SETTINGS: { ...base.PROGRESSION_SETTINGS, ...this.overrides.progressionSettings }
      }
    }
    return base
  }

  /**
   * パフォーマンス設定を取得
   */
  static getPerformanceSettings() {
    return PERFORMANCE_CONSTANTS
  }
}

/**
 * 定数の検証ユーティリティ
 */
export class ConstantsValidator {
  /**
   * 活力値が有効範囲内かチェック
   */
  static isValidVitality(value: number): boolean {
    return value >= BALANCE_CONSTANTS.VITALITY_SETTINGS.minimumValue &&
      value <= BALANCE_CONSTANTS.VITALITY_SETTINGS.maximumValue
  }

  /**
   * ターン数が有効範囲内かチェック
   */
  static isValidTurn(turn: number): boolean {
    return turn >= 0 && turn <= BALANCE_CONSTANTS.PROGRESSION_SETTINGS.maxTurns
  }

  /**
   * 手札サイズが有効範囲内かチェック
   */
  static isValidHandSize(size: number): boolean {
    return size >= 0 && size <= BALANCE_CONSTANTS.CARD_LIMITS.maxHandSize
  }

  /**
   * チャレンジ難易度が有効範囲内かチェック
   */
  static isValidDifficulty(difficulty: number): boolean {
    return difficulty >= BALANCE_CONSTANTS.CHALLENGE_SETTINGS.minDifficulty &&
      difficulty <= BALANCE_CONSTANTS.CHALLENGE_SETTINGS.maxDifficulty
  }
}