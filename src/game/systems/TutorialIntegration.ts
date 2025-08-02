/**
 * TutorialManagerとGameSceneのインテグレーションガイド
 * 実際のGameSceneでの使用方法と実装例
 */

import { TutorialManager } from './TutorialManager'
import { MAIN_TUTORIAL_CONFIG, QUICK_TUTORIAL_CONFIG } from './TutorialSteps'
import type { TutorialEventData } from '@/domain/types/tutorial.types'

/**
 * GameSceneでのTutorialManager使用例
 */
export class TutorialIntegration {
  private readonly tutorialManager: TutorialManager
  private readonly scene: Phaser.Scene

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.tutorialManager = new TutorialManager(scene, {
      autoSaveProgress: true,
      debugMode: process.env.NODE_ENV === 'development',
      stepChangeDelay: 500,
      defaultHighlightOptions: {
        color: '#FFD700',
        opacity: 0.4,
        borderWidth: 3,
        borderColor: '#FFA500',
        glowEffect: true,
        animationType: 'pulse',
        duration: 1200
      }
    })

    this.setupEventListeners()
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // チュートリアル開始
    this.tutorialManager.on('tutorial:started', (data: TutorialEventData) => {
      if (import.meta.env.DEV) console.log('Tutorial started:', data.tutorialId)
      this.onTutorialStarted(data)
    })

    // ステップ進入
    this.tutorialManager.on('tutorial:step:enter', (data: TutorialEventData) => {
      if (import.meta.env.DEV) console.log('Step entered:', data.stepId)
      this.onStepEnter(data)
    })

    // ステップ完了
    this.tutorialManager.on('tutorial:step:completed', (data: TutorialEventData) => {
      if (import.meta.env.DEV) console.log('Step completed:', data.stepId)
      this.onStepCompleted(data)
    })

    // チュートリアル完了
    this.tutorialManager.on('tutorial:completed', (data: TutorialEventData) => {
      if (import.meta.env.DEV) console.log('Tutorial completed:', data.tutorialId)
      this.onTutorialCompleted(data)
    })

    // チュートリアルスキップ
    this.tutorialManager.on('tutorial:skipped', (data: TutorialEventData) => {
      if (import.meta.env.DEV) console.log('Tutorial skipped:', data.tutorialId)
      this.onTutorialSkipped(data)
    })

    // エラー処理
    this.tutorialManager.on('tutorial:error', (data: TutorialEventData) => {
      console.error('Tutorial error:', data.error)
      this.onTutorialError(data)
    })
  }

  /**
   * チュートリアルを開始するかチェック
   */
  public checkAndStartTutorial(): void {
    // 初回プレイかチェック
    const isFirstTime = this.isFirstTimePlayer()
    
    if (isFirstTime) {
      // 初回プレイヤーには確認ダイアログを表示
      this.showTutorialConfirmDialog()
    } else if (this.shouldShowQuickTutorial()) {
      // クイックチュートリアルの提案
      this.showQuickTutorialOption()
    }
  }

  /**
   * メインチュートリアルを開始
   */
  public async startMainTutorial(): Promise<void> {
    try {
      await this.tutorialManager.startTutorial(MAIN_TUTORIAL_CONFIG)
    } catch (error) {
      console.error('Failed to start main tutorial:', error)
    }
  }

  /**
   * クイックチュートリアルを開始
   */
  public async startQuickTutorial(): Promise<void> {
    try {
      await this.tutorialManager.startTutorial(QUICK_TUTORIAL_CONFIG)
    } catch (error) {
      console.error('Failed to start quick tutorial:', error)
    }
  }

  /**
   * チュートリアルの手動制御
   */
  public nextStep(): void {
    this.tutorialManager.nextStep()
  }

  public previousStep(): void {
    this.tutorialManager.previousStep()
  }

  public skipTutorial(): void {
    this.tutorialManager.skipTutorial()
  }

  /**
   * 現在チュートリアル中かチェック
   */
  public isTutorialActive(): boolean {
    return this.tutorialManager.getState() === 'running'
  }

  /**
   * 特定の要素をハイライト（チュートリアル外でも使用可能）
   */
  public highlightElement(elementName: string): void {
    this.tutorialManager.highlightElement(elementName)
  }

  public clearHighlight(): void {
    this.tutorialManager.clearHighlight()
  }

  // ===================
  // Private Methods
  // ===================

  /**
   * 初回プレイヤーかチェック
   */
  private isFirstTimePlayer(): boolean {
    try {
      const playHistory = localStorage.getItem('insurance_game_play_history')
      return !playHistory
    } catch {
      return true
    }
  }

  /**
   * クイックチュートリアルを表示すべきかチェック
   */
  private shouldShowQuickTutorial(): boolean {
    try {
      const tutorialSettings = localStorage.getItem('insurance_game_tutorial_settings')
      if (tutorialSettings) {
        const settings = JSON.parse(tutorialSettings)
        return settings.showQuickTutorialOption !== false
      }
      return false
    } catch {
      return false
    }
  }

  /**
   * チュートリアル確認ダイアログを表示
   */
  private showTutorialConfirmDialog(): void {
    // 実際の実装では、UIコンポーネントを表示
    // ここではコンソール出力で代替
    if (import.meta.env.DEV) console.log('Showing tutorial confirmation dialog')
    
    // 例：モーダルダイアログの表示
    // this.scene.add.existing(new TutorialConfirmDialog(this.scene, {
    //   onConfirm: () => this.startMainTutorial(),
    //   onDecline: () => this.markTutorialDeclined(),
    //   onQuickTutorial: () => this.startQuickTutorial()
    // }))
  }

  /**
   * クイックチュートリアルオプションを表示
   */
  private showQuickTutorialOption(): void {
    if (import.meta.env.DEV) console.log('Showing quick tutorial option')
    
    // 例：通知バナーの表示
    // this.scene.add.existing(new TutorialBanner(this.scene, {
    //   message: 'クイックガイドを見ますか？',
    //   onAccept: () => this.startQuickTutorial(),
    //   onDismiss: () => this.dismissTutorialOption()
    // }))
  }

  // ===================
  // Event Handlers
  // ===================

  /**
   * チュートリアル開始時の処理
   */
  private onTutorialStarted(data: TutorialEventData): void {
    // ゲームの一部機能を制限
    this.enableTutorialMode()
    
    // 統計記録
    this.recordTutorialStart(data.tutorialId)
  }

  /**
   * ステップ進入時の処理
   */
  private onStepEnter(data: TutorialEventData): void {
    // ステップに応じた特別な処理
    if (data.stepId === 'challenge_attempt') {
      // チャレンジボタンを有効化
      this.enableChallengeButton()
    } else if (data.stepId === 'card_selection_intro') {
      // カード選択を有効化
      this.enableCardSelection()
    }

    // 進捗表示を更新
    this.updateProgressDisplay(data)
  }

  /**
   * ステップ完了時の処理
   */
  private onStepCompleted(data: TutorialEventData): void {
    // 完了効果音を再生（オプション）
    // this.scene.sound.play('tutorial_step_complete')
    
    // 統計記録
    this.recordStepCompletion(data.stepId!)
  }

  /**
   * チュートリアル完了時の処理
   */
  private onTutorialCompleted(data: TutorialEventData): void {
    // チュートリアルモードを解除
    this.disableTutorialMode()
    
    // 完了報酬（オプション）
    this.grantTutorialRewards()
    
    // 統計記録
    this.recordTutorialCompletion(data.tutorialId, data.progress!)
    
    // 通常ゲームに移行
    this.transitionToNormalGame()
  }

  /**
   * チュートリアルスキップ時の処理
   */
  private onTutorialSkipped(data: TutorialEventData): void {
    // チュートリアルモードを解除
    this.disableTutorialMode()
    
    // 統計記録
    this.recordTutorialSkip(data.tutorialId)
    
    // 通常ゲームに移行
    this.transitionToNormalGame()
  }

  /**
   * チュートリアルエラー時の処理
   */
  private onTutorialError(data: TutorialEventData): void {
    // エラーメッセージを表示
    console.error('Tutorial error occurred:', data.error)
    
    // フォールバック処理
    this.disableTutorialMode()
    this.transitionToNormalGame()
  }

  // ===================
  // Game State Management
  // ===================

  /**
   * チュートリアルモードを有効化
   */
  private enableTutorialMode(): void {
    // ゲームの一部機能を制限・簡略化
    if (import.meta.env.DEV) console.log('Tutorial mode enabled')
  }

  /**
   * チュートリアルモードを解除
   */
  private disableTutorialMode(): void {
    // 制限を解除
    if (import.meta.env.DEV) console.log('Tutorial mode disabled')
  }

  /**
   * チャレンジボタンを有効化
   */
  private enableChallengeButton(): void {
    const button = this.scene.children.getByName('challenge-button')
    if (button) {
      (button as Phaser.GameObjects.Container).setAlpha(1)
    }
  }

  /**
   * カード選択を有効化
   */
  private enableCardSelection(): void {
    const handArea = this.scene.children.getByName('hand-area')
    if (handArea) {
      (handArea as Phaser.GameObjects.Container).setAlpha(1)
    }
  }

  /**
   * 進捗表示を更新
   */
  private updateProgressDisplay(data: TutorialEventData): void {
    const progressText = `${data.stepIndex! + 1} / ${data.totalSteps}`
    if (import.meta.env.DEV) console.log('Tutorial progress:', progressText)
  }

  /**
   * 通常ゲームに移行
   */
  private transitionToNormalGame(): void {
    if (import.meta.env.DEV) console.log('Transitioning to normal game')
    // 実際の実装では、ゲーム状態をリセットまたは継続
  }

  /**
   * チュートリアル報酬を付与
   */
  private grantTutorialRewards(): void {
    if (import.meta.env.DEV) console.log('Granting tutorial completion rewards')
    // 例：追加カード、活力回復など
  }

  // ===================
  // Analytics & Storage
  // ===================

  /**
   * チュートリアル開始を記録
   */
  private recordTutorialStart(tutorialId: string): void {
    try {
      const record = {
        tutorialId,
        startedAt: new Date().toISOString(),
        userAgent: navigator.userAgent
      }
      localStorage.setItem('tutorial_start_record', JSON.stringify(record))
    } catch (error) {
      console.warn('Failed to record tutorial start:', error)
    }
  }

  /**
   * ステップ完了を記録
   */
  private recordStepCompletion(stepId: string): void {
    try {
      const completedSteps = this.getCompletedStepsRecord()
      completedSteps.push({
        stepId,
        completedAt: new Date().toISOString()
      })
      localStorage.setItem('tutorial_completed_steps', JSON.stringify(completedSteps))
    } catch (error) {
      console.warn('Failed to record step completion:', error)
    }
  }

  /**
   * チュートリアル完了を記録
   */
  private recordTutorialCompletion(tutorialId: string, progress: { completedSteps: { length: number }, skippedSteps: { length: number }, startedAt: string }): void {
    try {
      const record = {
        tutorialId,
        completedAt: new Date().toISOString(),
        totalSteps: progress.completedSteps.length,
        skippedSteps: progress.skippedSteps.length,
        duration: Date.now() - new Date(progress.startedAt).getTime()
      }
      localStorage.setItem('tutorial_completion_record', JSON.stringify(record))
    } catch (error) {
      console.warn('Failed to record tutorial completion:', error)
    }
  }

  /**
   * チュートリアルスキップを記録
   */
  private recordTutorialSkip(tutorialId: string): void {
    try {
      const record = {
        tutorialId,
        skippedAt: new Date().toISOString()
      }
      localStorage.setItem('tutorial_skip_record', JSON.stringify(record))
    } catch (error) {
      console.warn('Failed to record tutorial skip:', error)
    }
  }

  /**
   * 完了ステップ記録を取得
   */
  private getCompletedStepsRecord(): Array<{stepId: string, completedAt: string}> {
    try {
      const saved = localStorage.getItem('tutorial_completed_steps')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  }

  /**
   * 破棄
   */
  public destroy(): void {
    this.tutorialManager.destroy()
  }
}

/**
 * GameSceneでの使用例
 */
export function setupTutorialInGameScene(scene: Phaser.Scene): TutorialIntegration {
  const integration = new TutorialIntegration(scene)
  
  // シーン開始時にチュートリアルチェック
  scene.events.once('create', () => {
    integration.checkAndStartTutorial()
  })
  
  // キーボードショートカット設定
  scene.input.keyboard?.on('keydown-T', () => {
    if (!integration.isTutorialActive()) {
      integration.startQuickTutorial()
    }
  })
  
  scene.input.keyboard?.on('keydown-ESC', () => {
    if (integration.isTutorialActive()) {
      integration.skipTutorial()
    }
  })
  
  // シーン破棄時のクリーンアップ
  scene.events.once('destroy', () => {
    integration.destroy()
  })
  
  return integration
}