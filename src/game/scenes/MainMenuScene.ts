import { BaseScene } from './BaseScene'

/**
 * メインメニューシーン
 */
export class MainMenuScene extends BaseScene {
  constructor(config?: any) {
    super(config)
  }

  protected initialize(): void {
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
    
    // フェードイン
    this.fadeIn()

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
  }

  /**
   * メニューボタンを作成
   */
  private createMenuButtons(): void {
    const buttonY = 300
    const buttonSpacing = 80

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
   * ゲーム開始
   */
  private startGame(): void {
    this.fadeOut(500, () => {
      this.scene.start('GameScene')
    })
  }

  /**
   * チュートリアル開始
   */
  private startTutorial(): void {
    this.fadeOut(500, () => {
      // GameSceneを開始してすぐにチュートリアルを実行
      this.scene.start('GameScene', { startTutorial: true })
    })
  }

  /**
   * 設定画面を開く
   */
  private openSettings(): void {
    // 設定機能は将来のリリースで実装予定
    // - 音量設定
    // - グラフィック品質設定
    // - キーボードショートカット設定
    this.showNotification('設定機能は開発中です', 'info')
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
    const closeButton = this.createButton(
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