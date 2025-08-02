import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { ChallengeResult, PlayerStats } from '@/domain/types/game.types'

/**
 * ゲーム表示・操作の抽象化インターフェース
 * GUI (Phaser) / CUI の両方で使用可能な統一API
 */
export interface GameRenderer {
  // === ゲーム状態表示 ===
  
  /**
   * ゲーム全体の状態を表示
   * @param game ゲーム状態
   */
  displayGameState(game: Game): void

  /**
   * プレイヤーの手札を表示
   * @param cards 手札のカード一覧
   */
  displayHand(cards: Card[]): void

  /**
   * 現在のチャレンジカードを表示
   * @param challenge チャレンジカード
   */
  displayChallenge(challenge: Card): void

  /**
   * 体力（バイタリティ）を表示
   * @param current 現在の体力
   * @param max 最大体力
   */
  displayVitality(current: number, max: number): void

  /**
   * 保有している保険カードを表示
   * @param insurances 保険カード一覧
   */
  displayInsuranceCards(insurances: Card[]): void

  /**
   * 保険料の負担状況を表示
   * @param burden 現在の保険料負担
   */
  displayInsuranceBurden(burden: number): void

  /**
   * 現在のステージと進捗を表示
   * @param stage 現在のステージ
   * @param turn ターン数
   */
  displayProgress(stage: string, turn: number): void

  // === ユーザー入力要求 ===

  /**
   * カード選択を要求（複数選択可能）
   * @param cards 選択肢となるカード一覧
   * @param minSelection 最小選択数（デフォルト: 1）
   * @param maxSelection 最大選択数（デフォルト: 1）
   * @param message 選択を促すメッセージ
   * @returns 選択されたカード一覧
   */
  askCardSelection(
    cards: Card[], 
    minSelection?: number, 
    maxSelection?: number, 
    message?: string
  ): Promise<Card[]>

  /**
   * チャレンジ実行の意思決定を要求
   * @param challenge チャレンジカード
   * @returns チャレンジ実行('start')かスキップ('skip')
   */
  askChallengeAction(challenge: Card): Promise<'start' | 'skip'>

  /**
   * 保険タイプの選択を要求
   * @param availableTypes 選択可能な保険タイプ
   * @returns 選択された保険タイプ
   */
  askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'>

  /**
   * 保険カードの選択を要求
   * @param cards 選択可能な保険カード一覧
   * @param message 選択を促すメッセージ
   * @returns 選択された保険カード
   */
  askInsuranceChoice(cards: Card[], message?: string): Promise<Card>

  /**
   * 保険更新の意思決定を要求
   * @param insurance 更新対象の保険カード
   * @param cost 更新にかかるコスト
   * @returns 更新('renew')か失効('expire')
   */
  askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'>

  /**
   * Yes/No の確認を要求
   * @param message 確認メッセージ
   * @param defaultChoice デフォルトの選択（省略時は'no'）
   * @returns ユーザーの選択
   */
  askConfirmation(message: string, defaultChoice?: 'yes' | 'no'): Promise<'yes' | 'no'>

  // === フィードバック・メッセージ ===

  /**
   * チャレンジ結果を表示
   * @param result チャレンジ結果の詳細
   */
  showChallengeResult(result: ChallengeResult): void

  /**
   * 一般的なメッセージを表示
   * @param message 表示するメッセージ
   * @param level メッセージレベル（デフォルト: 'info'）
   */
  showMessage(message: string, level?: 'info' | 'success' | 'warning'): void

  /**
   * エラーメッセージを表示
   * @param error エラーメッセージ
   */
  showError(error: string): void

  /**
   * ゲームオーバー画面を表示
   * @param stats プレイヤーの最終統計
   */
  showGameOver(stats: PlayerStats): void

  /**
   * 勝利画面を表示
   * @param stats プレイヤーの最終統計
   */
  showVictory(stats: PlayerStats): void

  /**
   * ステージクリア画面を表示
   * @param stage クリアしたステージ
   * @param stats 現在の統計
   */
  showStageClear(stage: string, stats: PlayerStats): void

  // === システム制御 ===

  /**
   * 画面をクリア（必要に応じて）
   */
  clear(): void

  /**
   * レンダラーの初期化
   */
  initialize(): Promise<void>

  /**
   * レンダラーの終了処理
   */
  dispose(): void

  /**
   * 入力待ちの状態かどうか
   */
  isWaitingForInput(): boolean

  /**
   * デバッグ情報の表示切り替え
   * @param enabled デバッグ表示の有効/無効
   */
  setDebugMode(enabled: boolean): void
}

/**
 * GameRendererの選択肢
 */
export interface RendererChoice<T> {
  value: T
  label: string
  description?: string
}

/**
 * カード選択のオプション
 */
export interface CardSelectionOptions {
  minSelection: number
  maxSelection: number
  message?: string
  allowCancel?: boolean
  showCardDetails?: boolean
}

/**
 * レンダラーイベント（オプション）
 * レンダラー実装で発生するイベントを定義
 */
export interface RendererEvents {
  onCardHover?: (card: Card) => void
  onCardClick?: (card: Card) => void
  onGameStateChange?: (game: Game) => void
  onError?: (error: Error) => void
}