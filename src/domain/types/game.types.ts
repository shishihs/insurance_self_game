import type { Difficulty, GameStage, InsuranceType } from './card.types'
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
  | 'draw'                     // ドロー
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
}

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
  baseCard: Omit<Card, 'id' | 'durationType' | 'remainingTurns'>
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
 * チャレンジ結果
 */
export interface ChallengeResult {
  success: boolean
  playerPower: number
  challengePower: number
  rewards?: Card[]
  cardChoices?: Card[]  // カード選択肢（3枚）
  insuranceTypeChoices?: InsuranceTypeChoice[]  // 保険種類選択肢（3種類）
  vitalityChange: number
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
    maxVitality: 100,
    label: '青年期',
    ageMultiplier: 0
  },
  middle: {
    maxVitality: 80,
    label: '中年期',
    ageMultiplier: 0.5
  },
  middle_age: {
    maxVitality: 80,
    label: '中年期',
    ageMultiplier: 0.5
  },
  fulfillment: {
    maxVitality: 60,
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
  currentChallenge?: Card
  selectedCards: Card[]
  cardChoices?: Card[]  // 現在の選択肢カード
  insuranceTypeChoices?: InsuranceTypeChoice[]  // 現在の保険種類選択肢

  // Phase 2-4: 保険カード管理
  insuranceCards?: Card[]  // 現在有効な保険カード
  expiredInsurances?: Card[]  // 期限切れになった保険カード

  // Phase 3: 保険料負担
  insuranceBurden?: number  // 保険料による負担（負の値）


  // 統計
  stats: PlayerStats

  // 設定
  config: GameConfig

  // タイムスタンプ
  startedAt?: Date
  completedAt?: Date
}
