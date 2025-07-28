import type { GamePhase, GameStatus } from '../types/game.types'
import type { Card } from '../entities/Card'
import { IdGenerator } from '../../common/IdGenerator'

/**
 * ゲーム状態管理サービス
 * 
 * ゲームの状態変更とフェーズ管理を担当するドメインサービス。
 * State Patternを適用して、各フェーズ固有の振る舞いを分離。
 */

/**
 * ゲーム状態の基底インターフェース
 */
export interface GameState {
  readonly phase: GamePhase
  canStartChallenge(selectedCards: Card[]): boolean
  canResolveChallenge(): boolean
  canSelectCards(): boolean
  canEndTurn(): boolean
  getValidActions(): string[]
}

/**
 * 準備フェーズ
 */
export class PreparationState implements GameState {
  readonly phase: GamePhase = 'preparation'

  canStartChallenge(): boolean {
    return false
  }

  canResolveChallenge(): boolean {
    return false
  }

  canSelectCards(): boolean {
    return false
  }

  canEndTurn(): boolean {
    return false
  }

  getValidActions(): string[] {
    return ['start_game']
  }
}

/**
 * ドローフェーズ
 */
export class DrawState implements GameState {
  readonly phase: GamePhase = 'draw'

  canStartChallenge(selectedCards: Card[]): boolean {
    return selectedCards.length > 0
  }

  canResolveChallenge(): boolean {
    return false
  }

  canSelectCards(): boolean {
    return true
  }

  canEndTurn(): boolean {
    return false
  }

  getValidActions(): string[] {
    return ['select_cards', 'start_challenge']
  }
}

/**
 * チャレンジフェーズ
 */
export class ChallengeState implements GameState {
  readonly phase: GamePhase = 'challenge'

  canStartChallenge(): boolean {
    return false
  }

  canResolveChallenge(): boolean {
    return true
  }

  canSelectCards(): boolean {
    return true // チャレンジ中もカード選択可能
  }

  canEndTurn(): boolean {
    return false
  }

  getValidActions(): string[] {
    return ['select_cards', 'resolve_challenge']
  }
}

/**
 * カード選択フェーズ
 */
export class CardSelectionState implements GameState {
  readonly phase: GamePhase = 'card_selection'

  canStartChallenge(): boolean {
    return false
  }

  canResolveChallenge(): boolean {
    return false
  }

  canSelectCards(): boolean {
    return true
  }

  canEndTurn(): boolean {
    return true
  }

  getValidActions(): string[] {
    return ['select_card', 'end_turn']
  }
}

/**
 * 保険種類選択フェーズ
 */
export class InsuranceTypeSelectionState implements GameState {
  readonly phase: GamePhase = 'insurance_type_selection'

  canStartChallenge(): boolean {
    return false
  }

  canResolveChallenge(): boolean {
    return false
  }

  canSelectCards(): boolean {
    return false
  }

  canEndTurn(): boolean {
    return false
  }

  getValidActions(): string[] {
    return ['select_insurance_type']
  }
}

/**
 * 解決フェーズ
 */
export class ResolutionState implements GameState {
  readonly phase: GamePhase = 'resolution'

  canStartChallenge(): boolean {
    return false
  }

  canResolveChallenge(): boolean {
    return false
  }

  canSelectCards(): boolean {
    return false
  }

  canEndTurn(): boolean {
    return true
  }

  getValidActions(): string[] {
    return ['end_turn']
  }
}

/**
 * ゲーム状態管理コンテキスト
 */
export class GameStateContext {
  private currentState: GameState
  private status: GameStatus = 'not_started'
  private readonly stateMap: Map<GamePhase, GameState>

  constructor() {
    // 状態オブジェクトを初期化
    this.stateMap = new Map([
      ['preparation', new PreparationState()],
      ['draw', new DrawState()],
      ['challenge', new ChallengeState()],
      ['card_selection', new CardSelectionState()],
      ['insurance_type_selection', new InsuranceTypeSelectionState()],
      ['resolution', new ResolutionState()]
    ])

    this.currentState = this.stateMap.get('preparation')!
  }

  /**
   * 現在のフェーズを取得
   */
  getCurrentPhase(): GamePhase {
    return this.currentState.phase
  }

  /**
   * ゲームステータスを取得
   */
  getStatus(): GameStatus {
    return this.status
  }

  /**
   * ゲームステータスを設定
   */
  setStatus(status: GameStatus): void {
    this.status = status
  }

  /**
   * フェーズを変更
   */
  transitionTo(phase: GamePhase): void {
    const newState = this.stateMap.get(phase)
    if (!newState) {
      throw new Error(`Unknown phase: ${phase}`)
    }

    console.log(`Phase transition: ${this.currentState.phase} -> ${phase}`)
    this.currentState = newState
  }

  /**
   * 現在の状態でチャレンジを開始できるか
   */
  canStartChallenge(selectedCards: Card[] = []): boolean {
    return this.currentState.canStartChallenge(selectedCards)
  }

  /**
   * 現在の状態でチャレンジを解決できるか
   */
  canResolveChallenge(): boolean {
    return this.currentState.canResolveChallenge()
  }

  /**
   * 現在の状態でカードを選択できるか
   */
  canSelectCards(): boolean {
    return this.currentState.canSelectCards()
  }

  /**
   * 現在の状態でターンを終了できるか
   */
  canEndTurn(): boolean {
    return this.currentState.canEndTurn()
  }

  /**
   * 現在の状態で実行可能なアクションを取得
   */
  getValidActions(): string[] {
    return this.currentState.getValidActions()
  }

  /**
   * ゲームが進行中かどうか
   */
  isInProgress(): boolean {
    return this.status === 'in_progress'
  }

  /**
   * ゲームが終了しているかどうか
   */
  isCompleted(): boolean {
    return this.status === 'game_over' || this.status === 'victory'
  }

  /**
   * フェーズの自動遷移ロジック
   */
  autoTransition(context: {
    challengeResolved?: boolean
    cardSelected?: boolean
    insuranceSelected?: boolean
  }): void {
    const currentPhase = this.currentState.phase

    switch (currentPhase) {
      case 'challenge':
        if (context.challengeResolved) {
          this.transitionTo('insurance_type_selection')
        }
        break

      case 'card_selection':
        if (context.cardSelected) {
          this.transitionTo('resolution')
        }
        break

      case 'insurance_type_selection':
        if (context.insuranceSelected) {
          this.transitionTo('resolution')
        }
        break

      case 'resolution':
        // ターン終了時にドローフェーズに戻る
        this.transitionTo('draw')
        break
    }
  }
}

/**
 * ゲーム状態のファクトリー
 */
export class GameStateFactory {
  /**
   * 指定されたフェーズの状態オブジェクトを作成
   */
  static createState(phase: GamePhase): GameState {
    switch (phase) {
      case 'preparation':
        return new PreparationState()
      case 'draw':
        return new DrawState()
      case 'challenge':
        return new ChallengeState()
      case 'card_selection':
        return new CardSelectionState()
      case 'insurance_type_selection':
        return new InsuranceTypeSelectionState()
      case 'resolution':
        return new ResolutionState()
      default:
        throw new Error(`Unknown phase: ${phase}`)
    }
  }
}

/**
 * ゲーム状態のスナップショット
 */
export interface GameStateSnapshot {
  id: string
  timestamp: Date
  phase: GamePhase
  status: GameStatus
  validActions: string[]
}

/**
 * ゲーム状態のスナップショット管理
 */
export class GameStateSnapshotManager {
  private snapshots: GameStateSnapshot[] = []
  private maxSnapshots = 10

  /**
   * 現在の状態のスナップショットを作成
   */
  createSnapshot(context: GameStateContext): GameStateSnapshot {
    const snapshot: GameStateSnapshot = {
      id: IdGenerator.generate('snapshot'),
      timestamp: new Date(),
      phase: context.getCurrentPhase(),
      status: context.getStatus(),
      validActions: context.getValidActions()
    }

    this.snapshots.push(snapshot)

    // 最大数を超えた場合は古いものを削除
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift()
    }

    return snapshot
  }

  /**
   * スナップショット履歴を取得
   */
  getSnapshots(): ReadonlyArray<GameStateSnapshot> {
    return [...this.snapshots]
  }

  /**
   * 最新のスナップショットを取得
   */
  getLatestSnapshot(): GameStateSnapshot | undefined {
    return this.snapshots[this.snapshots.length - 1]
  }

  /**
   * スナップショットをクリア
   */
  clearSnapshots(): void {
    this.snapshots = []
  }
}