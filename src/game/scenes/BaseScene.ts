import { Scene } from 'phaser'

/**
 * すべてのシーンの基底クラス
 */
export abstract class BaseScene extends Scene {
  protected centerX!: number
  protected centerY!: number
  protected gameWidth!: number
  protected gameHeight!: number

  create(): void {
    // 画面サイズの取得
    this.gameWidth = this.cameras.main.width
    this.gameHeight = this.cameras.main.height
    this.centerX = this.gameWidth / 2
    this.centerY = this.gameHeight / 2

    // 各シーンの初期化
    this.initialize()
  }

  /**
   * 各シーンで実装する初期化処理
   */
  protected abstract initialize(): void

  /**
   * フェードイン効果
   */
  protected fadeIn(duration: number = 500): void {
    this.cameras.main.fadeIn(duration, 0, 0, 0)
  }

  /**
   * フェードアウト効果
   */
  protected fadeOut(duration: number = 500, callback?: () => void): void {
    this.cameras.main.fadeOut(duration, 0, 0, 0)
    
    if (callback) {
      this.cameras.main.once('camerafadeoutcomplete', callback)
    }
  }

  /**
   * テキストスタイルのデフォルト設定
   */
  protected getTextStyle(size: number = 24): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: 'Noto Sans JP',
      fontSize: `${size}px`,
      color: '#333333'
    }
  }

  /**
   * ボタンを作成
   */
  protected createButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, text, style || this.getTextStyle())
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setPadding(20, 10)
      .setBackgroundColor('#4C6EF5')
      .setColor('#ffffff')

    // ホバー効果
    button.on('pointerover', () => {
      button.setBackgroundColor('#364FC7')
      button.setScale(1.05)
    })

    button.on('pointerout', () => {
      button.setBackgroundColor('#4C6EF5')
      button.setScale(1)
    })

    button.on('pointerdown', () => {
      button.setScale(0.95)
    })

    button.on('pointerup', () => {
      button.setScale(1.05)
      onClick()
    })

    return button
  }
}