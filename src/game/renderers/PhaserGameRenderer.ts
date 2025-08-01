import type { GameRenderer } from '@/interfaces/GameRenderer'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { PlayerStats, ChallengeResult } from '@/domain/types/game.types'
import type { GameScene } from '../scenes/GameScene'

/**
 * Phaser3ベースのGameRenderer実装
 * GameSceneと連携してGUIゲーム表示・操作を提供
 */
export class PhaserGameRenderer implements GameRenderer {
  private gameScene: GameScene | null = null
  private isWaitingInput: boolean = false
  private currentInputResolver: ((result: unknown) => void) | null = null
  private debugMode: boolean = false

  constructor(gameScene?: GameScene) {
    this.gameScene = gameScene ?? null
  }

  setGameScene(gameScene: GameScene): void {
    this.gameScene = gameScene
  }

  // === ゲーム状態表示 ===

  displayGameState(game: Game): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.updateGameState(game)
  }

  displayHand(cards: Card[]): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.displayHandCards(cards)
  }

  displayChallenge(challenge: Card): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.displayCurrentChallenge(challenge)
  }

  displayVitality(current: number, max: number): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.updateVitalityDisplay(current, max)
  }

  displayInsuranceCards(insurances: Card[]): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.updateInsuranceDisplay(insurances)
  }

  displayInsuranceBurden(burden: number): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.updateInsuranceBurdenDisplay(burden)
  }

  displayProgress(stage: string, turn: number): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.updateProgressDisplay(stage, turn)
  }

  // === ユーザー入力要求 ===

  async askCardSelection(
    cards: Card[], 
    minSelection: number = 1, 
    maxSelection: number = 1, 
    message?: string
  ): Promise<Card[]> {
    if (this.gameScene === null || this.gameScene === undefined) {
      throw new Error('GameScene not available for card selection')
    }

    return new Promise((resolve) => {
      this.isWaitingInput = true
      this.currentInputResolver = resolve

      this.gameScene.showCardSelectionUI(
        cards,
        minSelection,
        maxSelection,
        message ?? 'カードを選択してください',
        (selectedCards: Card[]) => {
          this.isWaitingInput = false
          this.currentInputResolver = null
          resolve(selectedCards)
        }
      )
    })
  }

  async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
    if (this.gameScene === null || this.gameScene === undefined) {
      throw new Error('GameScene not available for challenge action')
    }

    return new Promise((resolve) => {
      this.isWaitingInput = true
      this.currentInputResolver = resolve

      this.gameScene.showChallengeActionUI(
        challenge,
        (action: 'start' | 'skip') => {
          this.isWaitingInput = false
          this.currentInputResolver = null
          resolve(action)
        }
      )
    })
  }

  async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
    if (this.gameScene === null || this.gameScene === undefined) {
      throw new Error('GameScene not available for insurance type choice')
    }

    return new Promise((resolve) => {
      this.isWaitingInput = true
      this.currentInputResolver = resolve

      this.gameScene.showInsuranceTypeSelectionUI(
        availableTypes,
        (insuranceType: 'whole_life' | 'term') => {
          this.isWaitingInput = false
          this.currentInputResolver = null
          resolve(insuranceType)
        }
      )
    })
  }

  async askInsuranceChoice(cards: Card[], message?: string): Promise<Card> {
    if (this.gameScene === null || this.gameScene === undefined) {
      throw new Error('GameScene not available for insurance choice')
    }

    return new Promise((resolve) => {
      this.isWaitingInput = true
      this.currentInputResolver = resolve

      this.gameScene.showInsuranceSelectionUI(
        cards,
        message ?? '保険を選択してください',
        (selectedInsurance: Card) => {
          this.isWaitingInput = false
          this.currentInputResolver = null
          resolve(selectedInsurance)
        }
      )
    })
  }

  async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
    if (this.gameScene === null || this.gameScene === undefined) {
      throw new Error('GameScene not available for insurance renewal choice')
    }

    return new Promise((resolve) => {
      this.isWaitingInput = true
      this.currentInputResolver = resolve

      this.gameScene.showInsuranceRenewalUI(
        insurance,
        cost,
        (choice: 'renew' | 'expire') => {
          this.isWaitingInput = false
          this.currentInputResolver = null
          resolve(choice)
        }
      )
    })
  }

  async askConfirmation(message: string, defaultChoice: 'yes' | 'no' = 'no'): Promise<'yes' | 'no'> {
    if (this.gameScene === null || this.gameScene === undefined) {
      throw new Error('GameScene not available for confirmation')
    }

    return new Promise((resolve) => {
      this.isWaitingInput = true
      this.currentInputResolver = resolve

      this.gameScene.showConfirmationUI(
        message,
        defaultChoice,
        (choice: 'yes' | 'no') => {
          this.isWaitingInput = false
          this.currentInputResolver = null
          resolve(choice)
        }
      )
    })
  }

  // === フィードバック・メッセージ ===

  showChallengeResult(result: ChallengeResult): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.displayChallengeResult(result)
  }

  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.showMessage(message, level)
  }

  showError(error: string): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.showError(error)
  }

  showGameOver(stats: PlayerStats): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.showGameOverScreen(stats)
  }

  showVictory(stats: PlayerStats): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.showVictoryScreen(stats)
  }

  showStageClear(stage: string, stats: PlayerStats): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.showStageClearScreen(stage, stats)
  }

  // === システム制御 ===

  clear(): void {
    if (this.gameScene === null || this.gameScene === undefined) return
    this.gameScene.clearDisplay()
  }

  async initialize(): Promise<void> {
    // GameSceneの初期化は外部で行われる
    // ここでは必要に応じて追加の初期化を行う
    if (this.debugMode === true && this.gameScene !== null && this.gameScene !== undefined) {
      this.gameScene.setDebugMode(true)
    }
  }

  dispose(): void {
    if (this.currentInputResolver !== null && this.currentInputResolver !== undefined) {
      // 待機中の入力がある場合はキャンセル
      this.currentInputResolver(null)
      this.currentInputResolver = null
    }
    this.isWaitingInput = false
    this.gameScene = null
  }

  isWaitingForInput(): boolean {
    return this.isWaitingInput
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled
    if (this.gameScene !== null && this.gameScene !== undefined) {
      this.gameScene.setDebugMode(enabled)
    }
  }

  // === Phaser特有の拡張メソッド ===

  /**
   * GameSceneが利用可能かチェック
   */
  isReady(): boolean {
    return this.gameScene !== null
  }

  /**
   * 現在のGameSceneを取得
   */
  getGameScene(): GameScene | null {
    return this.gameScene
  }

  /**
   * 入力待ちをキャンセル
   */
  cancelInput(): void {
    if (this.currentInputResolver !== null && this.currentInputResolver !== undefined) {
      this.currentInputResolver(null)
      this.currentInputResolver = null
    }
    this.isWaitingInput = false
  }
}