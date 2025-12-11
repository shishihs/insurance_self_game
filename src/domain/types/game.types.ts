import type { Difficulty, GameStage, InsuranceType, ICard, InsuranceTriggerType } from './card.types'
export type { ICard }
import type { Card } from '../entities/Card'
import type { Deck } from '../entities/Deck'

/**
 * ゲーム状態
 */
export type GameStatus =
  | 'not_started'
  | 'in_progress'
  | 'stage_clear'
  | 'game_over'
  | 'victory'

/**
 * ゲームフェーズ
 */
export type GamePhase =
  | 'setup'                    // セットアップ
  | 'character_selection'      // キャラクター選択 (v2)
  | 'dream_selection'          // 夢選択 (v2)
  | 'draw'                     // ドロー
  | 'challenge_choice'         // チャレンジ選択 (v2)
  | 'challenge'                // チャレンジ
  | 'resolution'               // 結果処理
  | 'card_selection'           // カード選択（チャレンジ成功時）
  | 'insurance_type_selection' // 保険種類選択（チャレンジ成功時）
  | 'upgrade'                  // アップグレード（ステージクリア時）
  | 'end'                     // 終了

/**
 * プレイヤー統計
 */
export interface PlayerStats {
  totalChallenges: number
  successfulChallenges: number
  failedChallenges: number
  cardsAcquired: number
  highestVitality: number
  turnsPlayed: number
  // 分析・テスト用の追加統計
  totalTurns?: number
  score?: number
  challengesCompleted?: number
  challengesFailed?: number
  finalVitality?: number
  finalInsuranceBurden?: number
}

/**
 * ゲーム設定
 */
export interface GameConfig {
  difficulty: Difficulty
  startingVitality: number
  startingHandSize: number
  maxHandSize: number
  dreamCardCount: number // 最終試練で選ぶ夢カードの数
  // テスト・分析用の追加設定
  maxTurns?: number
  // バランス調整設定
  balanceConfig?: BalanceConfig
  characterId?: string // 選択されたキャラクターID
}

/**
 * キャラクター定義
 */
export interface Character {
  id: string
  name: string
  description: string
  initialVitalityModifier: number
  initialSavings?: number
  specialAbility: string
}

/**
 * 利用可能なキャラクターリスト
 */
export const AVAILABLE_CHARACTERS: Character[] = [
  {
    id: 'solid',
    name: '堅実家',
    description: '守り重視。初期活力が高く、保険の効果が高い。',
    initialVitalityModifier: 20,  // 貯蓄ボーナスの代わりに活力ボーナスを増加
    specialAbility: 'insurance_bonus'  // 貯蓄ボーナスから保険ボーナスに変更
  },
  {
    id: 'adventurer',
    name: '冒険家',
    description: 'リスク志向。初期活力は低いが、チャンスに強い。',
    initialVitalityModifier: -5,
    specialAbility: 'risk_taker'
  },
  {
    id: 'minimalist',
    name: 'ミニマリスト',
    description: '効率重視。バランスの取れた生活スタイル。',
    initialVitalityModifier: 10,
    specialAbility: 'efficiency'
  }
]

/**
 * バランス調整設定
 * GameConstantsの値を上書きするための設定
 */
export interface BalanceConfig {
  stageParameters?: {
    youth?: Partial<AgeParameters & { startTurn: number, endTurn: number, insuranceMultiplier: number, challengeDifficultyModifier: number }>
    middle?: Partial<AgeParameters & { startTurn: number, endTurn: number, insuranceMultiplier: number, challengeDifficultyModifier: number }>
    fulfillment?: Partial<AgeParameters & { startTurn: number, endTurn: number, insuranceMultiplier: number, challengeDifficultyModifier: number }>
  }
  vitalitySettings?: {
    defaultStarting?: number
    minimumValue?: number
    maximumValue?: number
    healingCap?: number
  }
  cardLimits?: {
    maxHandSize?: number
    startingHandSize?: number
    defaultDrawCount?: number
    maxDeckSize?: number
  }
  challengeSettings?: {
    minDifficulty?: number
    maxDifficulty?: number
    successBonusBase?: number
    failurePenaltyRatio?: number
    enableDynamicDifficulty?: boolean
  }
  progressionSettings?: {
    maxTurns?: number
    stageTransitionTurns?: {
      youthToMiddle: number
      middleToFulfillment: number
    }
    victoryConditions?: {
      minTurns?: number
      minVitality?: number
    }
  }
}

/**
 * 保険種類選択肢
 */
export interface InsuranceTypeChoice {
  insuranceType: InsuranceType
  name: string
  description: string
  baseCard: Omit<ICard, 'id' | 'durationType' | 'remainingTurns'>
  termOption: {
    cost: number
    duration: number // ターン数
    description: string
  }
  wholeLifeOption: {
    cost: number
    description: string
  }
}

/**
 * チャレンジ結果タイプ
 * - success: チャレンジ成功（報酬獲得）
 * - damage_taken: パワー不足でダメージを受けた
 */
export type ChallengeResultType = 'success' | 'damage_taken' | 'error'

/**
 * チャレンジ結果
 */
export interface ChallengeResult {
  challenge: Card
  success: boolean
  resultType: ChallengeResultType  // 成功 or ダメージ受容
  playerPower: number
  challengePower: number
  rewards?: Card[]
  cardChoices?: Card[]  // カード選択肢（3枚）
  insuranceTypeChoices?: InsuranceTypeChoice[]  // 保険種類選択肢（3種類）
  vitalityChange: number
  damageAmount?: number  // ダメージ量（damage_taken時のみ）
  message: string
  // Phase 3: パワー計算の詳細
  powerBreakdown?: {
    base: number
    insurance: number
    burden: number
    total: number
  }
}

/**
 * 保険期限切れ通知
 */
export interface InsuranceExpirationNotice {
  expiredCards: Card[]
  message: string
  showRenewalOption: boolean
  turnNumber: number
}

/**
 * ターン結果（期限切れ通知を含む）
 */
export interface TurnResult {
  insuranceExpirations?: InsuranceExpirationNotice
  newExpiredCount: number
  remainingInsuranceCount: number
}

/**
 * 保険種類選択結果
 */
export interface InsuranceTypeSelectionResult {
  success: boolean
  selectedCard?: Card
  message: string
}

/**
 * ゲーム状態
 */
/**
 * 年齢別パラメータ
 */
export interface AgeParameters {
  maxVitality: number
  label: string
  ageMultiplier: number  // 保険効果の年齢倍率
}

/**
 * 年齢別設定
 */
export const AGE_PARAMETERS: Record<string, AgeParameters> = {
  youth: {
    maxVitality: 25,
    label: '青年期',
    ageMultiplier: 0
  },
  middle: {
    maxVitality: 20,
    label: '中年期',
    ageMultiplier: 0.5
  },
  middle_age: {
    maxVitality: 20,
    label: '中年期',
    ageMultiplier: 0.5
  },
  fulfillment: {
    maxVitality: 15,
    label: '充実期',
    ageMultiplier: 1.0
  }
}

/**
 * 夢カードの年齢調整値
 */
export const DREAM_AGE_ADJUSTMENTS = {
  physical: 3,      // 体力系：年齢で+3パワー必要
  intellectual: -2, // 知識系：年齢で-2パワー
  mixed: 0         // 複合系：変化なし
}




/**
 * 保留中の保険請求情報
 */
export interface PendingInsuranceClaim {
  insurance: Card
  triggerType: InsuranceTriggerType
  context?: any
}

export interface IGameState {
  id: string
  status: GameStatus
  phase: GamePhase
  stage: GameStage
  turn: number
  vitality: number
  maxVitality: number

  // デッキ関連
  playerDeck: Deck
  hand: Card[]
  discardPile: Card[]
  challengeDeck: Deck

  // チャレンジ関連
  currentChallenge: Card | undefined
  selectedCards: Card[]
  cardChoices: Card[] | undefined  // 現在の選択肢カード
  insuranceTypeChoices: InsuranceTypeChoice[] | undefined  // 現在の保険種類選択肢
  pendingInsuranceClaim: PendingInsuranceClaim | undefined // 保留中の保険請求

  // Phase 2-4: 保険カード管理
  activeInsurances: Card[]  // 現在有効な保険カード (renamed from insuranceCards)
  expiredInsurances: Card[] | undefined  // 期限切れになった保険カード
  insuranceMarket: Card[]     // 保険市場（販売中の保険）

  // Phase 3: 保険料負担
  insuranceBurden?: number  // 保険料による負担（負の値）

  // v2: 新要素
  agingDeck: Deck
  score: number             // 現在のスコア
  selectedDream: Card | undefined      // 選択した夢カード (DreamCard)

  // 統計
  stats: PlayerStats

  // 設定
  config: GameConfig

  // タイムスタンプ
  startedAt?: Date
  completedAt?: Date
}
