import type { PhaserTypes } from '../loaders/PhaserLoader'
import type { Card } from '@/domain/entities/Card'
import { GAME_CONSTANTS } from '../config/gameConfig'

/**
 * すべてのシーンの基底クラス
 * 注意: このクラスは実際にはPhaserのSceneクラスとして実行時に解釈される
 * GameManagerでPhaserのシーンとして登録される
 */
export abstract class BaseScene {
  // Phaserシーンのプロパティ（実行時に自動的に設定される）
  declare add: PhaserTypes['Scene']['add']
  declare cameras: PhaserTypes['Scene']['cameras']
  declare tweens: PhaserTypes['Scene']['tweens']
  declare scene: PhaserTypes['Scene']['scene']
  declare time: PhaserTypes['Scene']['time']
  declare load: PhaserTypes['Scene']['load']
  declare input: PhaserTypes['Scene']['input']
  declare events: PhaserTypes['Scene']['events']
  
  protected centerX!: number
  protected centerY!: number
  protected gameWidth!: number
  protected gameHeight!: number

  // コンストラクター - Phaserシーンの設定
  constructor(config: any) {
    // 注意: このコンストラクターは実際にはPhaserのSceneコンストラクターとして実行される
  }

  create(): void {
    // 画面サイズの取得
    this.gameWidth = this.cameras.main.width
    this.gameHeight = this.cameras.main.height
    this.centerX = this.gameWidth / 2
    this.centerY = this.gameHeight / 2

    // 背景色を設定（暗転問題の対策）
    this.cameras.main.setBackgroundColor('#1a1a2e')
    
    // デバッグ情報（開発時のみ）
    if (import.meta.env.DEV) {
      console.log(`✅ ${this.constructor.name} initialized - Size: ${this.gameWidth}x${this.gameHeight}`)
    }

    // 各シーンの初期化（非同期対応）
    const initResult = this.initialize()
    if (initResult instanceof Promise) {
      initResult.catch(error => {
        console.error(`Failed to initialize ${this.constructor.name}:`, error)
      })
    }
  }

  /**
   * 各シーンで実装する初期化処理
   */
  protected abstract initialize(): void | Promise<void>

  /**
   * 毎フレーム実行される更新処理（オプション）
   */
  update(time: number, delta: number): void {
    // サブクラスでオーバーライド可能
  }

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

  /**
   * コンテナボタンを作成（グラフィックス背景付き）
   */
  protected createContainerButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    
    // 背景
    const bg = this.add.graphics()
    bg.fillStyle(0x4C6EF5, 1)
    bg.fillRoundedRect(-80, -20, 160, 40, 8)
    
    // テキスト
    const buttonText = this.add.text(0, 0, text, style || this.getTextStyle())
      .setOrigin(0.5)
    
    container.add([bg, buttonText])
    container.setSize(160, 40)
    container.setInteractive({ useHandCursor: true })
    
    // ホバー効果
    container.on('pointerover', () => {
      bg.clear()
      bg.fillStyle(0x364FC7, 1)
      bg.fillRoundedRect(-80, -20, 160, 40, 8)
      container.setScale(1.05)
    })
    
    container.on('pointerout', () => {
      bg.clear()
      bg.fillStyle(0x4C6EF5, 1)
      bg.fillRoundedRect(-80, -20, 160, 40, 8)
      container.setScale(1)
    })
    
    container.on('pointerdown', () => {
      container.setScale(0.95)
    })
    
    container.on('pointerup', () => {
      container.setScale(1.05)
      onClick()
    })
    
    return container
  }

  /**
   * カードコンテナを作成（改善されたデザイン）
   */
  protected createCardContainer(card: Card, x: number, y: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    
    // カードのサイズ
    const cardWidth = GAME_CONSTANTS.CARD_WIDTH
    const cardHeight = GAME_CONSTANTS.CARD_HEIGHT
    
    // 背景グラフィックス
    const cardBg = this.add.graphics()
    
    // 保険カードかどうかで背景を変える
    const isInsuranceCard = card.cardType === 'insurance'
    
    if (isInsuranceCard) {
      // 保険カード：グラデーション背景 + 特別なボーダー
      // 外側のグロー効果
      cardBg.fillStyle(0x818CF8, 0.3)
      cardBg.fillRoundedRect(-cardWidth/2 - 4, -cardHeight/2 - 4, cardWidth + 8, cardHeight + 8, 14)
      
      // メインカード背景（グラデーション風）
      const gradient = this.add.graphics()
      gradient.fillStyle(0x6366F1, 1)
      gradient.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 12)
      
      // 光沢効果
      const gloss = this.add.graphics()
      gloss.fillStyle(0xFFFFFF, 0.15)
      gloss.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight/2, 12)
      
      // 装飾的なパターン
      const pattern = this.add.graphics()
      pattern.lineStyle(1, 0xFFFFFF, 0.1)
      for (let i = 0; i < 5; i++) {
        pattern.beginPath()
        pattern.arc(-cardWidth/2 + 20 + i * 30, -cardHeight/2 + 20, 15, 0, Math.PI * 2)
        pattern.strokePath()
      }
      
      container.add([cardBg, gradient, gloss, pattern])
    } else {
      // 通常カード：シンプルな背景
      cardBg.fillStyle(0xFFFFFF, 0.95)
      cardBg.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 12)
      
      // 薄いボーダー
      cardBg.lineStyle(2, 0xE5E7EB, 1)
      cardBg.strokeRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 12)
      
      container.add(cardBg)
    }
    
    // カードの種類アイコン
    let typeIcon = '🎯'
    let iconBgColor = 0x64748B
    
    switch (card.cardType) {
      case 'insurance':
        typeIcon = '🛡️'
        iconBgColor = 0x6366F1
        break
      case 'lifeEvent':
        typeIcon = card.power > 0 ? '✨' : '⚡'
        iconBgColor = card.power > 0 ? 0x10B981 : 0xF59E0B
        break
      case 'chance':
        typeIcon = '🎲'
        iconBgColor = 0x8B5CF6
        break
      case 'special':
        typeIcon = '⭐'
        iconBgColor = 0xF59E0B
        break
    }
    
    // アイコン背景
    const iconBg = this.add.graphics()
    iconBg.fillStyle(iconBgColor, isInsuranceCard ? 0.3 : 0.15)
    iconBg.fillCircle(-cardWidth/2 + 25, -cardHeight/2 + 25, 20)
    
    // カードアイコン
    const icon = this.add.text(-cardWidth/2 + 25, -cardHeight/2 + 25, typeIcon, {
      fontFamily: 'Arial',
      fontSize: '20px'
    }).setOrigin(0.5)
    
    // カード名
    const cardName = this.add.text(0, -cardHeight/2 + 30, card.name, {
      fontFamily: 'Noto Sans JP',
      fontSize: '16px',
      fontStyle: 'bold',
      color: isInsuranceCard ? '#FFFFFF' : '#1F2937',
      align: 'center',
      wordWrap: { width: cardWidth - 20 }
    }).setOrigin(0.5, 0)
    
    // カード説明
    const description = this.add.text(0, -10, card.description, {
      fontFamily: 'Noto Sans JP',
      fontSize: '12px',
      color: isInsuranceCard ? '#E0E7FF' : '#6B7280',
      align: 'center',
      wordWrap: { width: cardWidth - 30 },
      lineSpacing: 4
    }).setOrigin(0.5)
    
    // パワー表示（保険カード以外）
    if (!isInsuranceCard && card.power !== 0) {
      const powerBg = this.add.graphics()
      const powerColor = card.power > 0 ? 0x10B981 : 0xEF4444
      powerBg.fillStyle(powerColor, 1)
      powerBg.fillCircle(cardWidth/2 - 25, cardHeight/2 - 25, 18)
      
      const powerText = this.add.text(
        cardWidth/2 - 25,
        cardHeight/2 - 25,
        `${card.power > 0 ? '+' : ''}${card.power}`,
        {
          fontFamily: 'Arial',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#FFFFFF'
        }
      ).setOrigin(0.5)
      
      container.add([powerBg, powerText])
    }
    
    // 保険カードの追加情報
    if (isInsuranceCard) {
      // 保険の種類ラベル
      const insuranceType = card.insuranceType === 'whole_life' ? '終身保険' : '定期保険'
      const typeBg = this.add.graphics()
      typeBg.fillStyle(0xFFFFFF, 0.2)
      typeBg.fillRoundedRect(-50, cardHeight/2 - 35, 100, 20, 10)
      
      const typeText = this.add.text(0, cardHeight/2 - 25, insuranceType, {
        fontFamily: 'Noto Sans JP',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#FFFFFF'
      }).setOrigin(0.5)
      
      container.add([typeBg, typeText])
    }
    
    container.add([iconBg, icon, cardName, description])
    
    // インタラクティブ設定
    container.setSize(cardWidth, cardHeight)
    container.setInteractive({ useHandCursor: true })
    container.setData('card', card)
    container.setData('originalX', x)
    container.setData('originalY', y)
    
    // ホバー効果
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 200,
        ease: 'Power2'
      })
      
      // 保険カードは特別な輝き効果
      if (isInsuranceCard) {
        const glow = this.add.graphics()
        glow.lineStyle(4, 0x818CF8, 0.6)
        glow.strokeRoundedRect(-cardWidth/2 - 2, -cardHeight/2 - 2, cardWidth + 4, cardHeight + 4, 12)
        container.add(glow)
        container.setData('glowEffect', glow)
        
        this.tweens.add({
          targets: glow,
          alpha: 0.3,
          duration: 500,
          yoyo: true,
          repeat: -1
        })
      }
    })
    
    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Power2'
      })
      
      // グロー効果を削除
      const glow = container.getData('glowEffect')
      if (glow) {
        glow.destroy()
        container.setData('glowEffect', null)
      }
    })
    
    return container
  }

  /**
   * 通知を表示
   */
  protected showNotification(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const colors = {
      info: 0x4C6EF5,
      warning: 0xF59E0B,
      error: 0xEF4444
    }
    
    const notification = this.add.container(this.centerX, 100)
    
    // 背景
    const bg = this.add.graphics()
    bg.fillStyle(colors[type], 0.9)
    bg.fillRoundedRect(-150, -25, 300, 50, 25)
    
    // テキスト
    const text = this.add.text(0, 0, message, {
      fontFamily: 'Noto Sans JP',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5)
    
    notification.add([bg, text])
    
    // フェードイン→表示→フェードアウト
    notification.setAlpha(0)
    this.tweens.add({
      targets: notification,
      alpha: 1,
      duration: 300,
      onComplete: () => {
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: notification,
            alpha: 0,
            duration: 300,
            onComplete: () => { notification.destroy(); }
          })
        })
      }
    })
  }
}