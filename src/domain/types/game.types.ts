import type { GameStage, Difficulty } from './card.types'
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
  | 'setup'           // セットアップ
  | 'draw'            // ドロー
  | 'challenge'       // チャレンジ
  | 'resolution'      // 結果処理
  | 'card_selection'  // カード選択（チャレンジ成功時）
  | 'upgrade'         // アップグレード（ステージクリア時）
  | 'end'            // 終了

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
  vitalityChange: number
  message: string
}

/**
 * ゲーム状態
 */
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
  
  // 統計
  stats: PlayerStats
  
  // 設定
  config: GameConfig
  
  // タイムスタンプ
  startedAt?: Date
  completedAt?: Date
}