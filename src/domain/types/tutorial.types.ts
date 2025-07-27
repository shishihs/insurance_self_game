/**
 * チュートリアルシステム型定義
 */

/**
 * ゲームアクション検証用
 */
export interface GameActionValidation {
  type: 'draw_card' | 'select_cards' | 'resolve_challenge' | 'select_reward_card' | 'end_turn' | 'custom'
  validation: (gameState: Record<string, unknown>) => boolean
  timeout?: number  // タイムアウト時間（ms）
}

/**
 * チュートリアルステップの基本型
 */
export interface TutorialStep {
  id: string
  title: string
  description: string
  targetElement?: string  // セレクタまたは要素名
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center'
  action?: 'click' | 'hover' | 'wait' | 'auto' | 'wait_for_game_action'  // 進行条件
  waitTime?: number  // auto actionの場合の待機時間（ms）
  gameAction?: GameActionValidation  // ゲームアクション待機の詳細
  skipCondition?: () => boolean  // このステップをスキップする条件
  onEnter?: () => void  // ステップ開始時の処理
  onExit?: () => void   // ステップ終了時の処理
  highlightOptions?: HighlightOptions
}

/**
 * ハイライトオプション
 */
export interface HighlightOptions {
  color?: string
  opacity?: number
  borderWidth?: number
  borderColor?: string
  glowEffect?: boolean
  animationType?: 'pulse' | 'glow' | 'border' | 'none'
  duration?: number  // アニメーション時間（ms）
}

/**
 * チュートリアル進捗状況
 */
export interface TutorialProgress {
  currentStepIndex: number
  completedSteps: string[]
  skippedSteps: string[]
  isCompleted: boolean
  startedAt?: Date
  completedAt?: Date
  lastPlayedVersion?: string  // ゲームバージョン
}

/**
 * チュートリアル設定
 */
export interface TutorialConfig {
  id: string
  name: string
  description: string
  version: string
  steps: TutorialStep[]
  autoStart?: boolean
  canSkip?: boolean
  showProgress?: boolean
  overlayOptions?: OverlayOptions
}

/**
 * オーバーレイオプション
 */
export interface OverlayOptions {
  backgroundColor?: string
  opacity?: number
  blurBackground?: boolean
  allowClickThrough?: boolean
}

/**
 * チュートリアルイベント
 */
export type TutorialEvent = 
  | 'tutorial:started'
  | 'tutorial:step:enter'
  | 'tutorial:step:exit'
  | 'tutorial:step:completed'
  | 'tutorial:step:skipped'
  | 'tutorial:completed'
  | 'tutorial:skipped'
  | 'tutorial:error'

/**
 * チュートリアルイベントデータ
 */
export interface TutorialEventData {
  tutorialId: string
  stepId?: string
  stepIndex?: number
  totalSteps?: number
  progress?: TutorialProgress
  error?: string
}

/**
 * ローカルストレージのキー
 */
export const TUTORIAL_STORAGE_KEYS = {
  PROGRESS: 'insurance_game_tutorial_progress',
  SETTINGS: 'insurance_game_tutorial_settings',
  COMPLETED_TUTORIALS: 'insurance_game_completed_tutorials'
} as const

/**
 * チュートリアル状態
 */
export type TutorialState = 
  | 'idle'           // 待機中
  | 'running'        // 実行中
  | 'paused'         // 一時停止
  | 'completed'      // 完了
  | 'skipped'        // スキップ
  | 'error'          // エラー

/**
 * チュートリアルマネージャーの設定
 */
export interface TutorialManagerOptions {
  autoSaveProgress?: boolean
  debugMode?: boolean
  defaultHighlightOptions?: HighlightOptions
  defaultOverlayOptions?: OverlayOptions
  stepChangeDelay?: number  // ステップ変更時の遅延（ms）
}

/**
 * ステップ実行結果
 */
export interface StepExecutionResult {
  success: boolean
  stepId: string
  action: 'completed' | 'skipped' | 'error'
  message?: string
  error?: Error
}