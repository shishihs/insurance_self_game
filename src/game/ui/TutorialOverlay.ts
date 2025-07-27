import type { 
  TutorialStep, 
  HighlightOptions,
  TutorialProgress
} from '@/domain/types/tutorial.types'

/**
 * チュートリアルのUIオーバーレイコンポーネント
 * スポットライト効果、吹き出し、進行制御UIを提供
 */
export class TutorialOverlay {
  private scene: Phaser.Scene
  private container: Phaser.GameObjects.Container
  private overlayGraphics: Phaser.GameObjects.Graphics
  private spotlightMask: Phaser.GameObjects.Graphics
  private speechBubble: Phaser.GameObjects.Container | null = null
  private progressBar: Phaser.GameObjects.Container | null = null
  private controlButtons: Phaser.GameObjects.Container | null = null
  private highlightElements: Map<string, Phaser.GameObjects.Graphics> = new Map()
  private arrows: Phaser.GameObjects.Image[] = []
  private pulseAnimations: Phaser.Tweens.Tween[] = []
  
  // 設定
  private readonly OVERLAY_ALPHA = 0.7
  private readonly SPOTLIGHT_RADIUS = 80
  private readonly SPEECH_BUBBLE_PADDING = 20
  private readonly ANIMATION_DURATION = 800
  private readonly BUTTON_HEIGHT = 48
  private readonly BUTTON_WIDTH = 120

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.container = scene.add.container(0, 0)
    this.container.setDepth(2000) // 最前面に表示
    
    // オーバーレイグラフィックスの初期化
    this.overlayGraphics = scene.add.graphics()
    this.spotlightMask = scene.add.graphics()
    
    this.container.add([this.overlayGraphics, this.spotlightMask])
    
    this.createBaseOverlay()
  }

  /**
   * ベースオーバーレイの作成（画面全体を暗くする）
   */
  private createBaseOverlay(): void {
    const camera = this.scene.cameras.main
    
    this.overlayGraphics.clear()
    this.overlayGraphics.fillStyle(0x000000, this.OVERLAY_ALPHA)
    this.overlayGraphics.fillRect(0, 0, camera.width, camera.height)
    
    // クリック無効化
    this.overlayGraphics.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, camera.width, camera.height),
      Phaser.Geom.Rectangle.Contains
    )
  }

  /**
   * スポットライト効果の作成
   */
  public createSpotlight(targetElement: Phaser.GameObjects.GameObject): void {
    if (!targetElement.getBounds) return

    const bounds = targetElement.getBounds()
    const camera = this.scene.cameras.main
    
    // スポットライト用マスクをクリア
    this.spotlightMask.clear()
    
    // 全体を塗りつぶし
    this.spotlightMask.fillStyle(0x000000, this.OVERLAY_ALPHA)
    this.spotlightMask.fillRect(0, 0, camera.width, camera.height)
    
    // スポットライト部分を切り抜き
    const centerX = bounds.centerX
    const centerY = bounds.centerY
    const radius = Math.max(bounds.width, bounds.height) / 2 + this.SPOTLIGHT_RADIUS
    
    this.spotlightMask.fillStyle(0x000000, 0) // 透明で切り抜き
    this.spotlightMask.fillCircle(centerX, centerY, radius)
    
    // グラデーション効果のためのマスク設定
    this.overlayGraphics.setMask(new Phaser.Display.Masks.GeometryMask(this.scene, this.spotlightMask))
  }

  /**
   * 吹き出しの作成
   */
  public createSpeechBubble(
    step: TutorialStep, 
    targetBounds?: Phaser.Geom.Rectangle
  ): void {
    // 既存の吹き出しを削除
    if (this.speechBubble) {
      this.speechBubble.destroy()
    }

    const camera = this.scene.cameras.main
    const bubbleMaxWidth = Math.min(400, camera.width - 40)
    
    this.speechBubble = this.scene.add.container(0, 0)
    
    // 背景
    const background = this.scene.add.graphics()
    background.fillStyle(0xffffff, 0.95)
    background.lineStyle(2, 0x333333, 1)
    
    // タイトルテキスト
    const titleText = this.scene.add.text(0, 0, step.title, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#333333',
      fontStyle: 'bold',
      wordWrap: { width: bubbleMaxWidth - this.SPEECH_BUBBLE_PADDING * 2 }
    })
    
    // 説明テキスト
    const descriptionText = this.scene.add.text(0, 0, step.description, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#666666',
      wordWrap: { width: bubbleMaxWidth - this.SPEECH_BUBBLE_PADDING * 2 }
    })
    
    // レイアウト計算
    const titleHeight = titleText.height
    const descriptionHeight = descriptionText.height
    const totalHeight = titleHeight + descriptionHeight + this.SPEECH_BUBBLE_PADDING * 3
    const bubbleWidth = bubbleMaxWidth
    
    // 背景描画
    const radius = 12
    background.fillRoundedRect(
      -bubbleWidth / 2, -totalHeight / 2,
      bubbleWidth, totalHeight,
      radius
    )
    background.strokeRoundedRect(
      -bubbleWidth / 2, -totalHeight / 2,
      bubbleWidth, totalHeight,
      radius
    )
    
    // テキスト配置
    titleText.setPosition(
      -bubbleWidth / 2 + this.SPEECH_BUBBLE_PADDING,
      -totalHeight / 2 + this.SPEECH_BUBBLE_PADDING
    )
    descriptionText.setPosition(
      -bubbleWidth / 2 + this.SPEECH_BUBBLE_PADDING,
      titleText.y + titleHeight + this.SPEECH_BUBBLE_PADDING / 2
    )
    
    this.speechBubble.add([background, titleText, descriptionText])
    
    // 位置決定
    this.positionSpeechBubble(step.position || 'bottom', targetBounds)
    
    // アニメーション
    this.speechBubble.setAlpha(0)
    this.speechBubble.setScale(0.8)
    
    this.scene.tweens.add({
      targets: this.speechBubble,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: this.ANIMATION_DURATION / 2,
      ease: 'Back.easeOut'
    })
    
    this.container.add(this.speechBubble)
  }

  /**
   * 吹き出しの位置調整
   */
  private positionSpeechBubble(
    position: 'top' | 'bottom' | 'left' | 'right' | 'center',
    targetBounds?: Phaser.Geom.Rectangle
  ): void {
    if (!this.speechBubble) return

    const camera = this.scene.cameras.main
    const bubbleBounds = this.speechBubble.getBounds()
    const margin = 20
    
    let x = camera.centerX
    let y = camera.centerY
    
    if (targetBounds) {
      switch (position) {
        case 'top':
          x = targetBounds.centerX
          y = targetBounds.top - bubbleBounds.height / 2 - margin
          break
        case 'bottom':
          x = targetBounds.centerX
          y = targetBounds.bottom + bubbleBounds.height / 2 + margin
          break
        case 'left':
          x = targetBounds.left - bubbleBounds.width / 2 - margin
          y = targetBounds.centerY
          break
        case 'right':
          x = targetBounds.right + bubbleBounds.width / 2 + margin
          y = targetBounds.centerY
          break
        case 'center':
          x = camera.centerX
          y = camera.centerY
          break
      }
    }
    
    // 画面内に収める
    x = Phaser.Math.Clamp(x, bubbleBounds.width / 2 + margin, camera.width - bubbleBounds.width / 2 - margin)
    y = Phaser.Math.Clamp(y, bubbleBounds.height / 2 + margin, camera.height - bubbleBounds.height / 2 - margin)
    
    this.speechBubble.setPosition(x, y)
  }

  /**
   * 進捗バーの作成
   */
  public createProgressBar(progress: TutorialProgress, totalSteps: number): void {
    if (this.progressBar) {
      this.progressBar.destroy()
    }

    const camera = this.scene.cameras.main
    this.progressBar = this.scene.add.container(camera.centerX, 50)
    
    const barWidth = 300
    const barHeight = 8
    const currentStep = progress.currentStepIndex + 1
    
    // 背景バー
    const background = this.scene.add.graphics()
    background.fillStyle(0x333333, 0.3)
    background.fillRoundedRect(-barWidth / 2, -barHeight / 2, barWidth, barHeight, 4)
    
    // 進捗バー
    const progressWidth = (currentStep / totalSteps) * barWidth
    const progressBar = this.scene.add.graphics()
    progressBar.fillStyle(0x4CAF50, 1)
    progressBar.fillRoundedRect(-barWidth / 2, -barHeight / 2, progressWidth, barHeight, 4)
    
    // 進捗テキスト
    const progressText = this.scene.add.text(0, -30, `ステップ ${currentStep} / ${totalSteps}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5)
    
    this.progressBar.add([background, progressBar, progressText])
    this.container.add(this.progressBar)
  }

  /**
   * 制御ボタンの作成
   */
  public createControlButtons(
    canGoBack: boolean,
    canSkip: boolean,
    onNext: () => void,
    onBack?: () => void,
    onSkip?: () => void
  ): void {
    if (this.controlButtons) {
      this.controlButtons.destroy()
    }

    const camera = this.scene.cameras.main
    this.controlButtons = this.scene.add.container(camera.centerX, camera.height - 80)
    
    const buttons: Phaser.GameObjects.Container[] = []
    let totalWidth = 0
    
    // 戻るボタン
    if (canGoBack && onBack) {
      const backButton = this.createButton('戻る', '#6c757d', onBack)
      buttons.push(backButton)
      totalWidth += this.BUTTON_WIDTH + 10
    }
    
    // 次へボタン
    const nextButton = this.createButton('次へ', '#007bff', onNext)
    buttons.push(nextButton)
    totalWidth += this.BUTTON_WIDTH + 10
    
    // スキップボタン
    if (canSkip && onSkip) {
      const skipButton = this.createButton('スキップ', '#dc3545', onSkip)
      buttons.push(skipButton)
      totalWidth += this.BUTTON_WIDTH + 10
    }
    
    // ボタン配置
    let currentX = -totalWidth / 2
    buttons.forEach(button => {
      button.setPosition(currentX + this.BUTTON_WIDTH / 2, 0)
      currentX += this.BUTTON_WIDTH + 10
      this.controlButtons!.add(button)
    })
    
    this.container.add(this.controlButtons)
  }

  /**
   * ボタンの作成
   */
  private createButton(
    text: string,
    color: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const button = this.scene.add.container(0, 0)
    
    // ボタン背景
    const background = this.scene.add.graphics()
    const colorValue = parseInt(color.substring(1), 16)
    background.fillStyle(colorValue, 1)
    background.fillRoundedRect(
      -this.BUTTON_WIDTH / 2, -this.BUTTON_HEIGHT / 2,
      this.BUTTON_WIDTH, this.BUTTON_HEIGHT,
      8
    )
    
    // ホバー効果用の背景
    const hoverBackground = this.scene.add.graphics()
    hoverBackground.fillStyle(colorValue, 0.8)
    hoverBackground.fillRoundedRect(
      -this.BUTTON_WIDTH / 2, -this.BUTTON_HEIGHT / 2,
      this.BUTTON_WIDTH, this.BUTTON_HEIGHT,
      8
    )
    hoverBackground.setVisible(false)
    
    // ボタンテキスト
    const buttonText = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5)
    
    button.add([background, hoverBackground, buttonText])
    
    // インタラクティブ設定
    button.setSize(this.BUTTON_WIDTH, this.BUTTON_HEIGHT)
    button.setInteractive()
    
    // イベント設定
    button.on('pointerover', () => {
      background.setVisible(false)
      hoverBackground.setVisible(true)
      this.scene.tweens.add({
        targets: button,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2'
      })
    })
    
    button.on('pointerout', () => {
      background.setVisible(true)
      hoverBackground.setVisible(false)
      this.scene.tweens.add({
        targets: button,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Power2'
      })
    })
    
    button.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: button,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 100,
        yoyo: true,
        ease: 'Power2',
        onComplete: onClick
      })
    })
    
    return button
  }

  /**
   * 要素のハイライト（パルス、グロー効果）
   */
  public highlightElement(
    elementName: string,
    options: HighlightOptions = {}
  ): void {
    const element = this.scene.children.getByName(elementName)
    if (!element || !element.getBounds) return

    const bounds = element.getBounds()
    const highlight = this.scene.add.graphics()
    highlight.setDepth(1999) // オーバーレイより少し下
    
    // デフォルトオプション
    const defaultOptions: HighlightOptions = {
      color: '#FFD700',
      opacity: 0.4,
      borderWidth: 3,
      borderColor: '#FFA500',
      glowEffect: true,
      animationType: 'pulse',
      duration: 1000
    }
    
    const finalOptions = { ...defaultOptions, ...options }
    
    // ハイライト描画
    if (finalOptions.color) {
      const colorValue = parseInt(finalOptions.color.substring(1), 16)
      highlight.fillStyle(colorValue, finalOptions.opacity || 0.4)
      highlight.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
    
    // ボーダー描画
    if (finalOptions.borderColor && finalOptions.borderWidth) {
      const borderColorValue = parseInt(finalOptions.borderColor.substring(1), 16)
      highlight.lineStyle(finalOptions.borderWidth, borderColorValue)
      highlight.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
    
    // グローエフェクト
    if (finalOptions.glowEffect) {
      const glow = this.scene.add.graphics()
      glow.setDepth(1998)
      const glowColorValue = parseInt(finalOptions.borderColor?.substring(1) || 'FFA500', 16)
      glow.lineStyle(8, glowColorValue, 0.3)
      glow.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8)
      this.highlightElements.set(elementName + '_glow', glow)
    }
    
    // アニメーション
    if (finalOptions.animationType !== 'none') {
      const animation = this.createHighlightAnimation(highlight, finalOptions)
      if (animation) {
        this.pulseAnimations.push(animation)
      }
    }
    
    this.highlightElements.set(elementName, highlight)
  }

  /**
   * ハイライトアニメーションの作成
   */
  private createHighlightAnimation(
    target: Phaser.GameObjects.Graphics,
    options: HighlightOptions
  ): Phaser.Tweens.Tween | null {
    const duration = options.duration || 1000
    
    switch (options.animationType) {
      case 'pulse':
        return this.scene.tweens.add({
          targets: target,
          alpha: { from: 1, to: 0.3 },
          duration: duration / 2,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
        
      case 'glow':
        return this.scene.tweens.add({
          targets: target,
          scaleX: { from: 1, to: 1.1 },
          scaleY: { from: 1, to: 1.1 },
          alpha: { from: 1, to: 0.7 },
          duration: duration / 2,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
        
      case 'border':
        return this.scene.tweens.add({
          targets: target,
          rotation: { from: 0, to: Math.PI * 2 },
          duration: duration,
          repeat: -1,
          ease: 'Linear'
        })
        
      default:
        return null
    }
  }

  /**
   * 誘導矢印の作成
   */
  public createArrow(
    fromX: number, fromY: number,
    toX: number, toY: number,
    color: string = '#FFD700'
  ): void {
    // 矢印の計算
    const angle = Phaser.Math.Angle.Between(fromX, fromY, toX, toY)
    const distance = Phaser.Math.Distance.Between(fromX, fromY, toX, toY)
    const arrowX = fromX + Math.cos(angle) * (distance * 0.7)
    const arrowY = fromY + Math.sin(angle) * (distance * 0.7)
    
    // 矢印画像の作成（シンプルなトライアングル）
    const arrow = this.scene.add.graphics()
    arrow.setDepth(2001)
    
    const colorValue = parseInt(color.substring(1), 16)
    arrow.fillStyle(colorValue, 1)
    arrow.beginPath()
    arrow.moveTo(0, -10)
    arrow.lineTo(20, 0)
    arrow.lineTo(0, 10)
    arrow.closePath()
    arrow.fillPath()
    
    arrow.setPosition(arrowX, arrowY)
    arrow.setRotation(angle)
    
    // 矢印アニメーション（パルス）
    this.scene.tweens.add({
      targets: arrow,
      scaleX: { from: 1, to: 1.2 },
      scaleY: { from: 1, to: 1.2 },
      alpha: { from: 1, to: 0.7 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    
    this.arrows.push(arrow as Phaser.GameObjects.Graphics) // 型を明確に指定
  }

  /**
   * すべてのハイライトをクリア
   */
  public clearHighlights(): void {
    this.highlightElements.forEach(highlight => highlight.destroy())
    this.highlightElements.clear()
    
    this.pulseAnimations.forEach(animation => animation.destroy())
    this.pulseAnimations = []
    
    this.arrows.forEach(arrow => arrow.destroy())
    this.arrows = []
  }

  /**
   * レスポンシブ対応：画面サイズ変更時の調整
   */
  public onResize(): void {
    // const camera = this.scene.cameras.main // 未使用のため削除
    
    // ベースオーバーレイの再描画
    this.createBaseOverlay()
    
    // レスポンシブレイアウトの適用
    this.updateResponsiveLayout()
    
    // スポットライトの再計算（ターゲット要素がある場合）
    if (this.spotlightMask && this.highlightElements.size > 0) {
      // 最初のハイライト要素でスポットライトを再作成
      const firstElement = this.highlightElements.values().next().value
      if (firstElement && firstElement.getBounds) {
        const bounds = firstElement.getBounds()
        const mockElement = { getBounds: () => bounds }
        this.createSpotlight(mockElement as Phaser.GameObjects.GameObject)
      }
    }
  }

  /**
   * キーボード操作対応（アクセシビリティ対応）
   */
  public enableKeyboardControls(
    onNext: () => void,
    onBack?: () => void,
    onSkip?: () => void
  ): void {
    const cursors = this.scene.input.keyboard?.createCursorKeys()
    if (!cursors) return

    // 基本操作
    this.scene.input.keyboard?.on('keydown-SPACE', onNext)
    this.scene.input.keyboard?.on('keydown-ENTER', onNext)
    
    if (onBack) {
      this.scene.input.keyboard?.on('keydown-BACKSPACE', onBack)
      cursors.left.on('down', onBack)
    }
    
    if (onSkip) {
      this.scene.input.keyboard?.on('keydown-ESC', onSkip)
    }
    
    cursors.right.on('down', onNext)

    // アクセシビリティ拡張キー
    this.scene.input.keyboard?.on('keydown-TAB', (event: KeyboardEvent) => {
      event.preventDefault()
      // TABでボタン間のフォーカス移動をシミュレート
      this.cycleButtonFocus()
    })

    // 数字キーでステップ直接移動（開発・テスト用）
    for (let i = 1; i <= 9; i++) {
      this.scene.input.keyboard?.on(`keydown-${i}`, () => {
        this.jumpToStep(i - 1)
      })
    }
  }

  /**
   * ボタン間のフォーカスサイクル
   */
  private cycleButtonFocus(): void {
    // 実装：TABキーでボタン間を移動する視覚的フィードバック
    if (this.controlButtons) {
      // 既存のボタンにフォーカス効果を追加
      const buttons = this.controlButtons.list as Phaser.GameObjects.Container[]
      if (buttons.length > 0) {
        // シンプルなフォーカス効果として、最初のボタンを強調
        const firstButton = buttons[0]
        this.scene.tweens.add({
          targets: firstButton,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 200,
          yoyo: true,
          ease: 'Power2'
        })
      }
    }
  }

  /**
   * 指定ステップへのジャンプ（デバッグ用）
   */
  private jumpToStep(stepIndex: number): void {
    // 開発時のみ有効にする機能
    if (import.meta.env.DEV) console.log(`Attempt to jump to step ${stepIndex} (debug mode only)`)
  }

  /**
   * レスポンシブ対応の拡張
   */
  public updateResponsiveLayout(): void {
    const camera = this.scene.cameras.main
    const isSmallScreen = camera.width < 768
    const isMobile = camera.width < 480

    if (isMobile) {
      this.applyMobileLayout()
    } else if (isSmallScreen) {
      this.applyTabletLayout()
    } else {
      this.applyDesktopLayout()
    }
  }

  /**
   * モバイル向けレイアウト
   */
  private applyMobileLayout(): void {
    const camera = this.scene.cameras.main
    
    // ボタンサイズを大きく
    const mobileButtonHeight = 56
    const mobileButtonWidth = Math.min(150, camera.width / 3 - 10)
    
    // 進捗バーを上部に配置
    if (this.progressBar) {
      this.progressBar.setPosition(camera.centerX, 30)
    }
    
    // 吹き出しのサイズ調整
    if (this.speechBubble) {
      const maxWidth = camera.width - 20
      this.repositionSpeechBubbleForMobile(maxWidth)
    }
    
    // ボタンを画面下部に大きく配置
    if (this.controlButtons) {
      this.controlButtons.setPosition(camera.centerX, camera.height - 40)
      this.adjustButtonSizesForMobile(mobileButtonWidth, mobileButtonHeight)
    }
  }

  /**
   * タブレット向けレイアウト
   */
  private applyTabletLayout(): void {
    const camera = this.scene.cameras.main
    
    // 中間的なサイズ設定
    const tabletButtonHeight = 52
    const tabletButtonWidth = 140
    
    if (this.progressBar) {
      this.progressBar.setPosition(camera.centerX, 40)
    }
    
    if (this.controlButtons) {
      this.controlButtons.setPosition(camera.centerX, camera.height - 60)
      this.adjustButtonSizes(tabletButtonWidth, tabletButtonHeight)
    }
  }

  /**
   * デスクトップ向けレイアウト
   */
  private applyDesktopLayout(): void {
    const camera = this.scene.cameras.main
    
    // 標準サイズを維持
    if (this.progressBar) {
      this.progressBar.setPosition(camera.centerX, 50)
    }
    
    if (this.controlButtons) {
      this.controlButtons.setPosition(camera.centerX, camera.height - 80)
    }
  }

  /**
   * モバイル用吹き出し再配置
   */
  private repositionSpeechBubbleForMobile(maxWidth: number): void {
    if (!this.speechBubble) return
    
    const camera = this.scene.cameras.main
    
    // モバイルでは画面中央上部に固定配置
    this.speechBubble.setPosition(camera.centerX, camera.height * 0.3)
    
    // テキストの再配置（幅制限）
    const textElements = this.speechBubble.list.filter(child => 
      child instanceof Phaser.GameObjects.Text
    ) as Phaser.GameObjects.Text[]
    
    textElements.forEach(text => {
      text.setWordWrapWidth(maxWidth - this.SPEECH_BUBBLE_PADDING * 2)
    })
  }

  /**
   * ボタンサイズ調整（モバイル用）
   */
  private adjustButtonSizesForMobile(width: number, height: number): void {
    if (!this.controlButtons) return
    
    const buttons = this.controlButtons.list as Phaser.GameObjects.Container[]
    buttons.forEach((button, index) => {
      // ボタンの再描画
      const graphics = button.list[0] as Phaser.GameObjects.Graphics
      if (graphics) {
        graphics.clear()
        graphics.fillStyle(0x007bff, 1)
        graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
      }
      
      // テキストサイズ調整
      const text = button.list.find(child => 
        child instanceof Phaser.GameObjects.Text
      ) as Phaser.GameObjects.Text
      if (text) {
        text.setFontSize('18px')
      }
      
      // ボタン間の間隔調整
      button.setPosition(
        (index - 1) * (width + 15),
        0
      )
    })
  }

  /**
   * ボタンサイズ調整（一般用）
   */
  private adjustButtonSizes(width: number, height: number): void {
    if (!this.controlButtons) return
    
    const buttons = this.controlButtons.list as Phaser.GameObjects.Container[]
    buttons.forEach((button) => {
      const graphics = button.list[0] as Phaser.GameObjects.Graphics
      if (graphics) {
        graphics.clear()
        graphics.fillStyle(0x007bff, 1)
        graphics.fillRoundedRect(-width / 2, -height / 2, width, height, 8)
      }
    })
  }

  /**
   * アクセシビリティアナウンス（スクリーンリーダー対応）
   */
  public announceForScreenReader(message: string): void {
    // ARIA live region を利用したアナウンス
    const announcement = this.scene.add.text(-1000, -1000, message, {
      fontSize: '1px',
      color: '#000000'
    })
    
    // 要素にARIA属性を設定（可能な範囲で）
    const canvas = this.scene.game.canvas
    if (canvas) {
      canvas.setAttribute('aria-label', message)
      
      // 短時間で削除
      this.scene.time.delayedCall(1000, () => {
        announcement.destroy()
        canvas.removeAttribute('aria-label')
      })
    }
  }

  /**
   * 高コントラストモード対応
   */
  public enableHighContrastMode(): void {
    // 色の調整
    this.overlayGraphics.clear()
    this.overlayGraphics.fillStyle(0x000000, 0.9) // より濃い背景
    const camera = this.scene.cameras.main
    this.overlayGraphics.fillRect(0, 0, camera.width, camera.height)
    
    // ハイライト色の調整
    this.highlightElements.forEach(highlight => {
      // より強いコントラストの色に変更
      highlight.clear()
      highlight.fillStyle(0xFFFF00, 0.7) // 明るい黄色
      highlight.lineStyle(4, 0xFF0000, 1) // 赤いボーダー
    })
  }

  /**
   * アニメーション削減モード（motion-reduction対応）
   */
  public enableReducedMotion(): void {
    // 既存のアニメーションを停止
    this.pulseAnimations.forEach(animation => {
      animation.stop()
    })
    this.pulseAnimations = []
    
    // 静的なハイライトに変更
    this.highlightElements.forEach(highlight => {
      highlight.setAlpha(0.6) // 固定の透明度
    })
  }

  /**
   * オーバーレイの表示/非表示
   */
  public setVisible(visible: boolean): void {
    this.container.setVisible(visible)
  }

  /**
   * 破棄
   */
  public destroy(): void {
    this.clearHighlights()
    
    // キーボードイベントのクリーンアップ
    this.scene.input.keyboard?.removeAllListeners()
    
    this.container.destroy()
  }
}