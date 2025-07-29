/**
 * 強化されたゲーム型定義
 * 
 * 既存の型定義を拡張し、より厳格な型安全性を提供
 */

import type { 
  GameStatus, 
  GamePhase, 
  GameConfig,
  PlayerStats,
  ChallengeResult,
  TurnResult,
  InsuranceTypeChoice
} from './game.types'
import type { GameStage, CardType } from './card.types'
import type { 
  GameId, 
  CardId, 
  TurnNumber, 
  VitalityValue,
  PowerValue,
  NonEmptyArray,
  Result,
  Option
} from './strict-types'

/**
 * ゲーム状態の不変型定義
 */
export interface ImmutableGameState {
  readonly id: GameId
  readonly status: GameStatus
  readonly phase: GamePhase
  readonly stage: GameStage
  readonly turn: TurnNumber
  readonly vitality: VitalityValue
  readonly maxVitality: VitalityValue
  readonly insuranceBurden: number
  readonly stats: Readonly<PlayerStats>
  readonly config: Readonly<GameConfig>
  readonly startedAt: Option<Date>
  readonly completedAt: Option<Date>
}

/**
 * ゲームアクションの型定義
 */
export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'DRAW_CARDS'; payload: { count: number } }
  | { type: 'START_CHALLENGE'; payload: { cardId: CardId } }
  | { type: 'SELECT_CARD'; payload: { cardId: CardId } }
  | { type: 'RESOLVE_CHALLENGE' }
  | { type: 'SELECT_INSURANCE_TYPE'; payload: { 
      insuranceType: string
      durationType: 'term' | 'whole_life' 
    }}
  | { type: 'END_TURN' }
  | { type: 'ADVANCE_STAGE' }

/**
 * ゲームイベントの型定義
 */
export type GameEvent =
  | { type: 'GAME_STARTED'; timestamp: Date; gameId: GameId }
  | { type: 'CARDS_DRAWN'; timestamp: Date; cardIds: NonEmptyArray<CardId> }
  | { type: 'CHALLENGE_STARTED'; timestamp: Date; challengeId: CardId }
  | { type: 'CHALLENGE_RESOLVED'; timestamp: Date; result: ChallengeResult }
  | { type: 'INSURANCE_SELECTED'; timestamp: Date; insuranceId: CardId }
  | { type: 'TURN_ENDED'; timestamp: Date; turnNumber: TurnNumber }
  | { type: 'STAGE_ADVANCED'; timestamp: Date; newStage: GameStage }
  | { type: 'GAME_OVER'; timestamp: Date; reason: string }
  | { type: 'VICTORY'; timestamp: Date; finalScore: number }

/**
 * ゲームルールの型定義
 */
export interface GameRules {
  readonly maxHandSize: number
  readonly startingHandSize: number
  readonly cardsPerTurn: number
  readonly vitalityLossOnFailure: PowerValue
  readonly vitalityGainOnSuccess: PowerValue
  readonly insurancePremiumRate: number
  readonly stageTransitionTurns: Record<GameStage, TurnNumber>
}

/**
 * カード効果の型定義
 */
export type CardEffect =
  | { type: 'INCREASE_VITALITY'; amount: VitalityValue }
  | { type: 'DECREASE_VITALITY'; amount: VitalityValue }
  | { type: 'DRAW_CARDS'; count: number }
  | { type: 'DISCARD_CARDS'; count: number }
  | { type: 'GAIN_POWER'; amount: PowerValue }
  | { type: 'REDUCE_INSURANCE_COST'; percentage: number }
  | { type: 'EXTEND_INSURANCE_DURATION'; turns: TurnNumber }

/**
 * ゲーム検証ルールの型定義
 */
export interface ValidationRule<T> {
  readonly name: string
  readonly validate: (value: T) => Result<T, string>
}

/**
 * ゲーム制約の型定義
 */
export interface GameConstraints {
  readonly minVitality: VitalityValue
  readonly maxVitality: VitalityValue
  readonly maxInsuranceCount: number
  readonly maxCardPower: PowerValue
  readonly minCardPower: PowerValue
  readonly maxTurns: TurnNumber
}

/**
 * ゲーム統計の拡張型
 */
export interface ExtendedGameStats extends PlayerStats {
  readonly averageVitality: number
  readonly insuranceUsageRate: number
  readonly winRate: number
  readonly averageTurnsPerGame: number
  readonly mostUsedCardType: CardType
  readonly criticalMoments: Array<{
    turn: TurnNumber
    vitality: VitalityValue
    action: string
  }>
}

/**
 * ゲームメタデータ
 */
export interface GameMetadata {
  readonly version: string
  readonly createdBy: string
  readonly lastModified: Date
  readonly tags: ReadonlyArray<string>
  readonly difficulty: 'easy' | 'normal' | 'hard' | 'expert'
  readonly estimatedPlayTime: number // in minutes
}

/**
 * 型安全なゲーム設定ビルダー
 */
export class GameConfigBuilder {
  private config: Partial<GameConfig> = {}

  setDifficulty(difficulty: GameConfig['difficulty']): this {
    this.config.difficulty = difficulty
    return this
  }

  setStartingVitality(vitality: number): this {
    if (vitality < 0 || vitality > 200) {
      throw new Error('Starting vitality must be between 0 and 200')
    }
    this.config.startingVitality = vitality
    return this
  }

  setMaxHandSize(size: number): this {
    if (size < 1 || size > 20) {
      throw new Error('Max hand size must be between 1 and 20')
    }
    this.config.maxHandSize = size
    return this
  }

  build(): GameConfig {
    return {
      difficulty: this.config.difficulty ?? 'normal',
      startingVitality: this.config.startingVitality ?? 100,
      startingHandSize: this.config.startingHandSize ?? 5,
      maxHandSize: this.config.maxHandSize ?? 10,
      dreamCardCount: this.config.dreamCardCount ?? 3
    }
  }
}