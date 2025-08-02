import type {
  HighlightOptions,
  TutorialConfig,
  TutorialEvent,
  TutorialEventData,
  TutorialManagerOptions,
  TutorialProgress,
  TutorialState,
  TutorialStep
} from '@/domain/types/tutorial.types'
import { TUTORIAL_STORAGE_KEYS } from '@/domain/types/tutorial.types'

/**
 * チュートリアルシステムの中核管理クラス
 * ステップ進行、ハイライト、進捗保存を統括管理
 */
export class TutorialManager extends Phaser.Events.EventEmitter {
  private currentConfig: TutorialConfig | null = null
  private progress: TutorialProgress | null = null
  private state: TutorialState = 'idle'
  private readonly options: TutorialManagerOptions
  private readonly scene: Phaser.Scene
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null
  private overlayGraphics: Phaser.GameObjects.Graphics | null = null
  private tutorialUI: Phaser.GameObjects.Container | null = null
  private stepChangeTimeout: NodeJS.Timeout | null = null
  private highlightTween: Phaser.Tweens.Tween | null = null

  constructor(scene: Phaser.Scene, options: TutorialManagerOptions = {}) {
    super()
    this.scene = scene
    this.options = {
      autoSaveProgress: true,
      debugMode: false,
      stepChangeDelay: 300,
      defaultHighlightOptions: {
        color: '#FFD700',
        opacity: 0.3,
        borderWidth: 3,
        borderColor: '#FFA500',
        glowEffect: true,
        animationType: 'pulse',
        duration: 1000
      },
      defaultOverlayOptions: {
        backgroundColor: '#000000',
        opacity: 0.7,
        blurBackground: false,
        allowClickThrough: false
      },
      ...options
    }

    this.setupEventListeners()
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // シーンの破棄時にクリーンアップ
    this.scene.events.once('destroy', () => {
      this.cleanup()
    })

    // 画面リサイズ時にUIを更新
    this.scene.scale.on('resize', () => {
      if (this.state === 'running') {
        this.updateUILayout()
      }
    })
  }

  /**
   * チュートリアルを開始
   */
  public async startTutorial(config: TutorialConfig): Promise<void> {
    if (this.state === 'running') {
      this.log('Tutorial is already running')
      return
    }

    try {
      this.currentConfig = config
      this.progress = this.loadProgress(config.id) || this.createInitialProgress()
      this.state = 'running'

      this.log(`Starting tutorial: ${config.name}`)
      this.emitEvent('tutorial:started', {
        tutorialId: config.id,
        progress: this.progress
      })

      // オーバーレイを作成
      this.createOverlay()

      // 最初のステップまたは中断されたステップから開始
      await this.goToStep(this.progress.currentStepIndex)

    } catch (error) {
      this.handleError('Failed to start tutorial', error as Error)
    }
  }

  /**
   * 次のステップに進む
   */
  public async nextStep(): Promise<void> {
    if (this.state !== 'running' || !this.currentConfig || !this.progress) {
      return
    }

    const currentStep = this.getCurrentStep()
    if (!currentStep) return

    try {
      // 現在のステップを完了としてマーク
      await this.completeCurrentStep()

      // 次のステップがある場合は進む
      if (this.progress.currentStepIndex < this.currentConfig.steps.length - 1) {
        await this.goToStep(this.progress.currentStepIndex + 1)
      } else {
        // チュートリアル完了
        await this.completeTutorial()
      }
    } catch (error) {
      this.handleError('Failed to go to next step', error as Error)
    }
  }

  /**
   * 前のステップに戻る
   */
  public async previousStep(): Promise<void> {
    if (this.state !== 'running' || !this.progress) {
      return
    }

    if (this.progress.currentStepIndex > 0) {
      await this.goToStep(this.progress.currentStepIndex - 1)
    }
  }

  /**
   * 指定されたステップに移動
   */
  public async goToStep(stepIndex: number): Promise<void> {
    if (!this.currentConfig || !this.progress || stepIndex < 0 || stepIndex >= this.currentConfig.steps.length) {
      return
    }

    try {
      // 現在のステップの終了処理
      if (this.progress.currentStepIndex !== stepIndex) {
        await this.exitCurrentStep()
      }

      // 新しいステップに移動
      this.progress.currentStepIndex = stepIndex
      const step = this.currentConfig.steps[stepIndex]

      this.log(`Going to step ${stepIndex}: ${step.title}`)

      // ステップのスキップ条件をチェック
      if (step.skipCondition?.()) {
        await this.skipCurrentStep()
        return
      }

      // ステップに入る
      await this.enterStep(step)

      // 進捗を保存
      if (this.options.autoSaveProgress) {
        this.saveProgress()
      }

    } catch (error) {
      this.handleError(`Failed to go to step ${stepIndex}`, error as Error)
    }
  }

  /**
   * チュートリアルをスキップ
   */
  public async skipTutorial(): Promise<void> {
    if (this.state !== 'running' || !this.currentConfig) {
      return
    }

    try {
      this.log('Skipping tutorial')
      this.state = 'skipped'

      this.emitEvent('tutorial:skipped', {
        tutorialId: this.currentConfig.id,
        progress: this.progress
      })

      await this.cleanup()
    } catch (error) {
      this.handleError('Failed to skip tutorial', error as Error)
    }
  }

  /**
   * 現在のステップをスキップ
   */
  public async skipCurrentStep(): Promise<void> {
    if (this.state !== 'running' || !this.currentConfig || !this.progress) {
      return
    }

    const currentStep = this.getCurrentStep()
    if (!currentStep) return

    try {
      this.log(`Skipping step: ${currentStep.title}`)
      
      // スキップしたステップとして記録
      this.progress.skippedSteps.push(currentStep.id)

      this.emitEvent('tutorial:step:skipped', {
        tutorialId: this.currentConfig.id,
        stepId: currentStep.id,
        stepIndex: this.progress.currentStepIndex
      })

      // 次のステップに進む
      await this.nextStep()
    } catch (error) {
      this.handleError('Failed to skip current step', error as Error)
    }
  }

  /**
   * 要素をハイライト
   */
  public highlightElement(
    elementName: string, 
    options: HighlightOptions = {}
  ): void {
    try {
      // 既存のハイライトをクリア
      this.clearHighlight()

      // ターゲット要素を取得
      const element = this.scene.children.getByName(elementName)
      if (!element) {
        this.log(`Element not found: ${elementName}`)
        return
      }

      // ハイライトオプションをマージ
      const highlightOptions = {
        ...this.options.defaultHighlightOptions,
        ...options
      }

      // ハイライトグラフィックスを作成
      this.createHighlight(element, highlightOptions)

    } catch (error) {
      this.handleError('Failed to highlight element', error as Error)
    }
  }

  /**
   * ハイライトをクリア
   */
  public clearHighlight(): void {
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy()
      this.highlightGraphics = null
    }

    if (this.highlightTween) {
      this.highlightTween.destroy()
      this.highlightTween = null
    }
  }

  /**
   * 進捗を保存
   */
  public saveProgress(): void {
    if (!this.currentConfig || !this.progress) {
      return
    }

    try {
      const storageKey = `${TUTORIAL_STORAGE_KEYS.PROGRESS}_${this.currentConfig.id}`
      localStorage.setItem(storageKey, JSON.stringify(this.progress))
      this.log('Progress saved')
    } catch (error) {
      this.handleError('Failed to save progress', error as Error)
    }
  }

  /**
   * 進捗を読み込み
   */
  public loadProgress(tutorialId: string): TutorialProgress | null {
    try {
      const storageKey = `${TUTORIAL_STORAGE_KEYS.PROGRESS}_${tutorialId}`
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const progress = JSON.parse(saved) as TutorialProgress
        this.log('Progress loaded')
        return progress
      }
    } catch (error) {
      this.handleError('Failed to load progress', error as Error)
    }
    return null
  }

  /**
   * 進捗をクリア
   */
  public clearProgress(tutorialId: string): void {
    try {
      const storageKey = `${TUTORIAL_STORAGE_KEYS.PROGRESS}_${tutorialId}`
      localStorage.removeItem(storageKey)
      this.log('Progress cleared')
    } catch (error) {
      this.handleError('Failed to clear progress', error as Error)
    }
  }

  /**
   * チュートリアルが完了済みかチェック
   */
  public isCompleted(tutorialId: string): boolean {
    try {
      const completedTutorials = this.getCompletedTutorials()
      return completedTutorials.includes(tutorialId)
    } catch (error) {
      this.handleError('Failed to check completion status', error as Error)
      return false
    }
  }

  /**
   * 現在の状態を取得
   */
  public getState(): TutorialState {
    return this.state
  }

  /**
   * 現在のステップを取得
   */
  public getCurrentStep(): TutorialStep | null {
    if (!this.currentConfig || !this.progress) {
      return null
    }
    return this.currentConfig.steps[this.progress.currentStepIndex] || null
  }

  /**
   * 進捗状況を取得
   */
  public getProgress(): TutorialProgress | null {
    return this.progress
  }

  // ===================
  // Private Methods
  // ===================

  /**
   * ステップに入る
   */
  private async enterStep(step: TutorialStep): Promise<void> {
    try {
      this.log(`Entering step: ${step.title}`)

      // ステップ開始時の処理
      if (step.onEnter) {
        step.onEnter()
      }

      // イベント発火
      this.emitEvent('tutorial:step:enter', {
        tutorialId: this.currentConfig!.id,
        stepId: step.id,
        stepIndex: this.progress!.currentStepIndex,
        totalSteps: this.currentConfig!.steps.length
      })

      // UI更新
      this.updateTutorialUI(step)

      // 要素ハイライト
      if (step.targetElement) {
        this.highlightElement(step.targetElement, step.highlightOptions)
      }

      // 自動進行の場合
      if (step.action === 'auto' && step.waitTime) {
        this.stepChangeTimeout = setTimeout(() => {
          this.nextStep()
        }, step.waitTime)
      }

      // ゲームアクション待機の場合
      if (step.action === 'wait_for_game_action' && step.gameAction) {
        this.startGameActionValidation(step)
      }

    } catch (error) {
      this.handleError('Failed to enter step', error as Error)
    }
  }

  /**
   * 現在のステップから退出
   */
  private async exitCurrentStep(): Promise<void> {
    const currentStep = this.getCurrentStep()
    if (!currentStep) return

    try {
      this.log(`Exiting step: ${currentStep.title}`)

      // タイムアウトをクリア
      if (this.stepChangeTimeout) {
        clearTimeout(this.stepChangeTimeout)
        this.stepChangeTimeout = null
      }

      // ゲームアクション検証をクリーンアップ
      const interval = this.scene.data.get('_tutorialValidationInterval')
      const timeout = this.scene.data.get('_tutorialValidationTimeout')
      if (interval) {
        clearInterval(interval)
        this.scene.data.remove('_tutorialValidationInterval')
      }
      if (timeout) {
        clearTimeout(timeout)
        this.scene.data.remove('_tutorialValidationTimeout')
      }

      // ハイライトをクリア
      this.clearHighlight()

      // ステップ終了時の処理
      if (currentStep.onExit) {
        currentStep.onExit()
      }

      // イベント発火
      this.emitEvent('tutorial:step:exit', {
        tutorialId: this.currentConfig!.id,
        stepId: currentStep.id,
        stepIndex: this.progress!.currentStepIndex
      })

    } catch (error) {
      this.handleError('Failed to exit current step', error as Error)
    }
  }

  /**
   * 現在のステップを完了
   */
  private async completeCurrentStep(): Promise<void> {
    const currentStep = this.getCurrentStep()
    if (!currentStep || !this.progress) return

    try {
      this.log(`Completing step: ${currentStep.title}`)

      // 完了したステップとして記録
      if (!this.progress.completedSteps.includes(currentStep.id)) {
        this.progress.completedSteps.push(currentStep.id)
      }

      this.emitEvent('tutorial:step:completed', {
        tutorialId: this.currentConfig!.id,
        stepId: currentStep.id,
        stepIndex: this.progress.currentStepIndex
      })

    } catch (error) {
      this.handleError('Failed to complete current step', error as Error)
    }
  }

  /**
   * ゲームアクションの検証を開始
   */
  private startGameActionValidation(step: TutorialStep): void {
    if (!step.gameAction) return

    const { type, validation, timeout = 30000 } = step.gameAction
    
    this.log(`Starting game action validation: ${type}`)
    
    // ゲーム状態の監視を開始
    const checkInterval = setInterval(() => {
      try {
        // ゲーム状態を取得（GameSceneから）
        const gameState = (window as Window & { __gameState?: Record<string, unknown> }).__gameState || this.scene.data.get('gameState')
        
        if (!gameState) {
          this.logDebug('Game state not available yet')
          return
        }
        
        // 検証実行
        if (validation(gameState)) {
          this.log(`Game action validated: ${type}`)
          clearInterval(checkInterval)
          clearTimeout(timeoutId)
          
          // クリーンアップ
          this.scene.data.remove('_tutorialValidationInterval')
          this.scene.data.remove('_tutorialValidationTimeout')
          
          // 自動的に次のステップへ
          this.nextStep()
        }
      } catch (error) {
        this.handleError('Error during game action validation', error as Error)
      }
    }, 250) // 250msごとにチェック
    
    // タイムアウト処理
    const timeoutId = setTimeout(() => {
      clearInterval(checkInterval)
      this.log(`Game action validation timeout: ${type}`)
      
      // クリーンアップ
      this.scene.data.remove('_tutorialValidationInterval')
      this.scene.data.remove('_tutorialValidationTimeout')
      
      // タイムアウト時は手動で進められるようにする
      this.emit('tutorial:action:timeout', { step, actionType: type })
    }, timeout)
    
    // クリーンアップ用に保存
    this.scene.data.set('_tutorialValidationInterval', checkInterval)
    this.scene.data.set('_tutorialValidationTimeout', timeoutId)
  }

  /**
   * チュートリアル完了
   */
  private async completeTutorial(): Promise<void> {
    if (!this.currentConfig || !this.progress) return

    try {
      this.log('Completing tutorial')
      
      this.progress.isCompleted = true
      this.progress.completedAt = new Date()
      this.state = 'completed'

      // 完了したチュートリアルリストに追加
      this.markAsCompleted(this.currentConfig.id)

      this.emitEvent('tutorial:completed', {
        tutorialId: this.currentConfig.id,
        progress: this.progress
      })

      // 進捗保存
      if (this.options.autoSaveProgress) {
        this.saveProgress()
      }

      // クリーンアップ
      await this.cleanup()

    } catch (error) {
      this.handleError('Failed to complete tutorial', error as Error)
    }
  }

  /**
   * オーバーレイを作成
   */
  private createOverlay(): void {
    if (!this.currentConfig) return

    const overlayOptions = {
      ...this.options.defaultOverlayOptions,
      ...this.currentConfig.overlayOptions
    }

    this.overlayGraphics = this.scene.add.graphics()
    this.overlayGraphics.setDepth(1000)
    
    this.overlayGraphics.fillStyle(
      Phaser.Display.Color.HexStringToColor(overlayOptions.backgroundColor!).color,
      overlayOptions.opacity
    )
    this.overlayGraphics.fillRect(
      0, 0, 
      this.scene.cameras.main.width, 
      this.scene.cameras.main.height
    )

    if (!overlayOptions.allowClickThrough) {
      this.overlayGraphics.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, this.scene.cameras.main.width, this.scene.cameras.main.height),
        Phaser.Geom.Rectangle.Contains
      )
    }
  }

  /**
   * ハイライトを作成
   */
  private createHighlight(element: Phaser.GameObjects.GameObject, options: HighlightOptions): void {
    if (!element.getBounds) return

    const bounds = element.getBounds()
    this.highlightGraphics = this.scene.add.graphics()
    this.highlightGraphics.setDepth(1001)

    // ハイライト描画
    if (options.color) {
      this.highlightGraphics.fillStyle(
        Phaser.Display.Color.HexStringToColor(options.color).color,
        options.opacity || 0.3
      )
      this.highlightGraphics.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }

    // ボーダー描画
    if (options.borderColor && options.borderWidth) {
      this.highlightGraphics.lineStyle(
        options.borderWidth,
        Phaser.Display.Color.HexStringToColor(options.borderColor).color
      )
      this.highlightGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }

    // アニメーション
    if (options.animationType && options.animationType !== 'none') {
      this.createHighlightAnimation(options)
    }
  }

  /**
   * ハイライトアニメーションを作成
   */
  private createHighlightAnimation(options: HighlightOptions): void {
    if (!this.highlightGraphics) return

    const duration = options.duration || 1000

    switch (options.animationType) {
      case 'pulse':
        this.highlightTween = this.scene.tweens.add({
          targets: this.highlightGraphics,
          alpha: { from: 1, to: 0.3 },
          duration: duration / 2,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
        break

      case 'glow':
        this.highlightTween = this.scene.tweens.add({
          targets: this.highlightGraphics,
          scaleX: { from: 1, to: 1.1 },
          scaleY: { from: 1, to: 1.1 },
          alpha: { from: 1, to: 0.7 },
          duration: duration / 2,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
        break
    }
  }

  /**
   * チュートリアルUI更新
   */
  private updateTutorialUI(step: TutorialStep): void {
    // UI実装は別途UIManagerクラスで行う想定
    // ここでは基本的な情報のみ処理
    this.log(`UI Update: ${step.title} - ${step.description}`)
  }

  /**
   * UIレイアウト更新
   */
  private updateUILayout(): void {
    // レスポンシブ対応の実装
  }

  /**
   * 初期進捗状況を作成
   */
  private createInitialProgress(): TutorialProgress {
    return {
      currentStepIndex: 0,
      completedSteps: [],
      skippedSteps: [],
      isCompleted: false,
      startedAt: new Date(),
      lastPlayedVersion: this.currentConfig?.version
    }
  }

  /**
   * 完了したチュートリアルリストを取得
   */
  private getCompletedTutorials(): string[] {
    try {
      const saved = localStorage.getItem(TUTORIAL_STORAGE_KEYS.COMPLETED_TUTORIALS)
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      this.handleError('Failed to get completed tutorials', error as Error)
      return []
    }
  }

  /**
   * チュートリアルを完了としてマーク
   */
  private markAsCompleted(tutorialId: string): void {
    try {
      const completed = this.getCompletedTutorials()
      if (!completed.includes(tutorialId)) {
        completed.push(tutorialId)
        localStorage.setItem(TUTORIAL_STORAGE_KEYS.COMPLETED_TUTORIALS, JSON.stringify(completed))
      }
    } catch (error) {
      this.handleError('Failed to mark as completed', error as Error)
    }
  }

  /**
   * イベント発火
   */
  private emitEvent(event: TutorialEvent, data: TutorialEventData): void {
    this.emit(event, data)
    
    if (this.options.debugMode && import.meta.env.DEV) {
      console.log(`[TutorialManager] ${event}:`, data)
    }
  }

  /**
   * エラーハンドリング
   */
  private handleError(message: string, error: Error): void {
    this.log(`Error: ${message} - ${error.message}`)
    this.state = 'error'
    
    this.emitEvent('tutorial:error', {
      tutorialId: this.currentConfig?.id || 'unknown',
      error: error.message
    })
  }

  /**
   * ログ出力
   */
  private log(message: string): void {
    if (this.options.debugMode && import.meta.env.DEV) {
      console.log(`[TutorialManager] ${message}`)
    }
  }

  /**
   * クリーンアップ
   */
  private async cleanup(): Promise<void> {
    try {
      // タイムアウトクリア
      if (this.stepChangeTimeout) {
        clearTimeout(this.stepChangeTimeout)
        this.stepChangeTimeout = null
      }

      // グラフィックス削除
      this.clearHighlight()
      
      if (this.overlayGraphics) {
        this.overlayGraphics.destroy()
        this.overlayGraphics = null
      }

      if (this.tutorialUI) {
        this.tutorialUI.destroy()
        this.tutorialUI = null
      }

      // 状態リセット
      this.state = 'idle'
      
    } catch (error) {
      this.handleError('Failed to cleanup', error as Error)
    }
  }

  /**
   * 破棄
   */
  public destroy(): void {
    this.cleanup()
    this.removeAllListeners()
  }
}