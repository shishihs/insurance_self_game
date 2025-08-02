import { BaseScene } from './BaseScene'

/**
 * メインメニューシーン
 */
export class MainMenuScene extends BaseScene {
  constructor(config?: any) {
    super(config)
  }

  protected initialize(): void {
    try {
      // デバッグ：利用可能なメソッドを確認
      const debugInfo = {
        createButton: typeof this.createButton,
        createContainerButton: typeof this.createContainerButton,
        fadeIn: typeof this.fadeIn,
        fadeOut: typeof this.fadeOut,
        add: typeof this.add,
        cameras: typeof this.cameras,
        centerX: this.centerX,
        centerY: this.centerY,
        gameWidth: this.gameWidth,
        gameHeight: this.gameHeight
      }
      
      console.log('MainMenuScene - Available methods:', debugInfo)
      
      // 本番環境でのデバッグ用
      if (!this.createButton || typeof this.createButton !== 'function') {
        console.error('MainMenuScene: createButton method missing!', debugInfo)
        // デバッグ情報を画面に表示
        if (this.add && this.add.text) {
          this.add.text(10, 10, `Debug: createButton=${typeof this.createButton}`, {
            fontSize: '12px',
            color: '#ff0000'
          })
        }
      }
      
      // 必要なプロパティの確認
      if (!this.add || !this.cameras || !this.centerX || !this.centerY) {
        console.error('MainMenuScene: Required properties not initialized')
        return
      }
      
      // デバッグ表示（開発時のみ）
      if (import.meta.env.DEV) {
        // 画面境界を視覚化
        const boundary = this.add.graphics()
        boundary.lineStyle(2, 0x00ff00, 0.5)
        boundary.strokeRect(0, 0, this.gameWidth, this.gameHeight)
        
        // 中央点を表示
        const center = this.add.graphics()
        center.fillStyle(0xff0000, 1)
        center.fillCircle(this.centerX, this.centerY, 5)
        
        console.log('🎬 MainMenuScene initialized with debug visuals')
      }
      
      // フェードイン（メソッドが存在する場合のみ）
      if (typeof this.fadeIn === 'function') {
        this.fadeIn()
      }

    // タイトル
    this.add.text(
      this.centerX,
      100,
      '人生充実ゲーム',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '48px',
        color: '#333333',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // サブタイトル
    this.add.text(
      this.centerX,
      160,
      'Life Fulfillment - 生命保険を「人生の味方」として描く',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#666666'
      }
    ).setOrigin(0.5)

    // メニューボタン
    this.createMenuButtons()

    // バージョン情報
    this.add.text(
      10,
      this.gameHeight - 30,
      'v0.0.1 - Phase 1 Development',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: '#999999'
      }
    )
    } catch (error) {
      console.error('MainMenuScene initialization error:', error)
      console.error('Stack trace:', error.stack)
      // エラーを表示
      if (this.add) {
        this.add.text(
          this.centerX || 400,
          this.centerY || 300,
          'Menu initialization failed',
          {
            fontFamily: 'Arial',
            fontSize: '20px',
            color: '#ff0000'
          }
        ).setOrigin(0.5)
      }
    }
  }

  /**
   * メニューボタンを作成
   */
  private createMenuButtons(): void {
    const buttonY = 300
    const buttonSpacing = 80

    // createButtonメソッドが存在しない場合のフォールバック
    if (typeof this.createButton !== 'function') {
      console.error('createButton method not available')
      // テキストボタンを直接作成
      const startButton = this.add.text(
        this.centerX,
        buttonY,
        'ゲームを始める',
        {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffffff',
          backgroundColor: '#4C6EF5',
          padding: { x: 20, y: 10 }
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      
      startButton.on('pointerup', () => { this.startGame(); })
      return
    }

    // ゲーム開始ボタン
    this.createButton(
      this.centerX,
      buttonY,
      'ゲームを始める',
      () => { this.startGame(); },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ffffff'
      }
    )

    // チュートリアルボタン
    this.createButton(
      this.centerX,
      buttonY + buttonSpacing,
      'チュートリアル',
      () => { this.startTutorial(); },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ffffff'
      }
    )

    // 設定ボタン
    this.createButton(
      this.centerX,
      buttonY + buttonSpacing * 2,
      '設定',
      () => { this.openSettings(); },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ffffff'
      }
    )

    // クレジットボタン
    this.createButton(
      this.centerX,
      buttonY + buttonSpacing * 3,
      'クレジット',
      () => { this.showCredits(); },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ffffff'
      }
    )
  }

  /**
   * シンプルなボタンを作成（フォールバック用）
   */
  private createSimpleButton(x: number, y: number, text: string, onClick: () => void): void {
    const button = this.add.text(x, y, text, {
      fontFamily: 'Noto Sans JP',
      fontSize: '24px',
      color: '#ffffff',
      backgroundColor: '#4C6EF5',
      padding: { x: 20, y: 10 }
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true })

    button.on('pointerup', onClick)
  }

  /**
   * ゲーム開始
   */
  private startGame(): void {
    if (typeof this.fadeOut === 'function') {
      this.fadeOut(500, () => {
        this.scene.start('GameScene')
      })
    } else {
      // fadeOutが利用できない場合は直接遷移
      this.scene.start('GameScene')
    }
  }

  /**
   * チュートリアル開始
   */
  private startTutorial(): void {
    if (typeof this.fadeOut === 'function') {
      this.fadeOut(500, () => {
        // GameSceneを開始してすぐにチュートリアルを実行
        this.scene.start('GameScene', { startTutorial: true })
      })
    } else {
      // fadeOutが利用できない場合は直接遷移
      this.scene.start('GameScene', { startTutorial: true })
    }
  }

  /**
   * 設定画面を開く
   */
  private openSettings(): void {
    // 設定機能は将来のリリースで実装予定
    // - 音量設定
    // - グラフィック品質設定
    // - キーボードショートカット設定
    if (typeof this.showNotification === 'function') {
      this.showNotification('設定機能は開発中です', 'info')
    } else {
      console.log('設定機能は開発中です')
    }
  }

  /**
   * クレジット表示
   */
  private showCredits(): void {
    // クレジットオーバーレイを作成
    const overlay = this.add.graphics()
    overlay.fillStyle(0x000000, 0.8)
    overlay.fillRect(0, 0, this.gameWidth, this.gameHeight)

    const creditContainer = this.add.container(this.centerX, this.centerY)

    // クレジットテキスト
    const creditText = this.add.text(
      0,
      -100,
      '人生充実ゲーム\n\n開発: Claude Code & You\n\nPhase 1 - プロトタイプ開発中\n\nご期待ください！',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10
      }
    ).setOrigin(0.5)

    // 閉じるボタン
    let closeButton
    if (typeof this.createButton === 'function') {
      closeButton = this.createButton(
        0,
        100,
        '閉じる',
        () => {
          creditContainer.destroy()
          overlay.destroy()
        },
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '20px',
          color: '#ffffff'
        }
      )
    } else {
      // フォールバック: シンプルなテキストボタン
      closeButton = this.add.text(0, 100, '閉じる', {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff',
        backgroundColor: '#4C6EF5',
        padding: { x: 20, y: 10 }
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      
      closeButton.on('pointerup', () => {
        creditContainer.destroy()
        overlay.destroy()
      })
    }

    creditContainer.add([creditText, closeButton])

    // フェードイン効果
    creditContainer.setAlpha(0)
    this.tweens.add({
      targets: creditContainer,
      alpha: 1,
      duration: 300
    })
  }
}