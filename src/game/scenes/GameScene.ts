import { BaseScene } from './BaseScene'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import { CardFactory } from '@/domain/services/CardFactory'
import { GAME_CONSTANTS } from '../config/gameConfig'
import type { CardType } from '@/domain/types/card.types'
import type { ChallengeResult } from '@/domain/types/game.types'

/**
 * メインゲームシーン
 */
export class GameScene extends BaseScene {
  private gameInstance!: Game
  private handCards: Phaser.GameObjects.Container[] = []
  private selectedCards: Set<string> = new Set()
  private cardSelectionUI?: Phaser.GameObjects.Container

  constructor() {
    super({ key: 'GameScene' })
  }

  protected initialize(): void {
    // ゲームインスタンスの初期化
    this.initializeGame()

    // UI要素の作成
    this.createUI()

    // カードエリアの作成
    this.createCardAreas()

    // ゲーム開始
    this.startGame()
  }

  /**
   * ゲームを初期化
   */
  private initializeGame(): void {
    this.gameInstance = new Game({
      difficulty: 'normal',
      startingVitality: 20,
      startingHandSize: 5,
      maxHandSize: 7,
      dreamCardCount: 2
    })

    // 初期デッキを作成
    const starterCards = CardFactory.createStarterLifeCards()
    this.gameInstance.playerDeck.addCards(starterCards)
    this.gameInstance.playerDeck.shuffle()

    // チャレンジデッキを作成
    const challengeCards = CardFactory.createChallengeCards(this.gameInstance.stage)
    this.gameInstance.challengeDeck.addCards(challengeCards)
    this.gameInstance.challengeDeck.shuffle()
  }

  /**
   * UI要素を作成
   */
  private createUI(): void {
    // 背景
    this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0xf5f5f5)
      .setOrigin(0, 0)

    // ヘッダー
    this.add.rectangle(0, 0, this.gameWidth, 80, 0x2C3E50)
      .setOrigin(0, 0)

    // ステージ表示
    const stageText = this.add.text(
      20,
      40,
      this.getStageDisplayText(),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff'
      }
    )
    stageText.setOrigin(0, 0.5)
    stageText.setName('stage-text')

    // 活力表示
    const vitalityText = this.add.text(
      this.centerX,
      40,
      `活力: ${this.gameInstance.vitality} / ${this.gameInstance.maxVitality}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ffffff'
      }
    )
    vitalityText.setOrigin(0.5)
    vitalityText.setName('vitality-text')

    // ターン表示
    const turnText = this.add.text(
      this.gameWidth - 20,
      40,
      `ターン: ${this.gameInstance.turn}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff'
      }
    )
    turnText.setOrigin(1, 0.5)
    turnText.setName('turn-text')

    // アクションボタン
    this.createActionButtons()
  }

  /**
   * カードエリアを作成
   */
  private createCardAreas(): void {
    // デッキエリア
    const deckArea = this.add.container(
      GAME_CONSTANTS.DECK_X_POSITION,
      GAME_CONSTANTS.DECK_Y_POSITION
    )
    
    const deckBack = this.add.image(0, 0, 'card-back')
    const deckCount = this.add.text(
      0,
      70,
      `${this.gameInstance.playerDeck.size()}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#333333'
      }
    )
    deckCount.setOrigin(0.5)
    deckCount.setName('deck-count')

    deckArea.add([deckBack, deckCount])
    deckArea.setName('deck-area')

    // 捨て札エリア
    const discardArea = this.add.container(
      GAME_CONSTANTS.DISCARD_X_POSITION,
      GAME_CONSTANTS.DISCARD_Y_POSITION
    )

    const discardPlaceholder = this.add.rectangle(
      0,
      0,
      GAME_CONSTANTS.CARD_WIDTH,
      GAME_CONSTANTS.CARD_HEIGHT,
      0xCCCCCC,
      0.3
    )
    discardPlaceholder.setStrokeStyle(2, 0x999999)

    const discardLabel = this.add.text(
      0,
      70,
      '捨て札',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#666666'
      }
    ).setOrigin(0.5)

    discardArea.add([discardPlaceholder, discardLabel])
    discardArea.setName('discard-area')

    // チャレンジエリア
    const challengeArea = this.add.container(
      this.centerX,
      GAME_CONSTANTS.CHALLENGE_Y_POSITION
    )

    const challengePlaceholder = this.add.rectangle(
      0,
      0,
      GAME_CONSTANTS.CARD_WIDTH,
      GAME_CONSTANTS.CARD_HEIGHT,
      0xFFD43B,
      0.3
    )
    challengePlaceholder.setStrokeStyle(2, 0xFAB005)

    const challengeLabel = this.add.text(
      0,
      -100,
      'チャレンジ',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#333333'
      }
    ).setOrigin(0.5)

    challengeArea.add([challengePlaceholder, challengeLabel])
    challengeArea.setName('challenge-area')
  }

  /**
   * アクションボタンを作成
   */
  private createActionButtons(): void {
    const buttonContainer = this.add.container(this.gameWidth - 150, 150)

    // ドローボタン
    const drawButton = this.createButton(
      0,
      0,
      'カードを引く',
      () => this.drawCards(1),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff'
      }
    )

    // チャレンジボタン
    const challengeButton = this.createButton(
      0,
      60,
      'チャレンジ',
      () => this.startChallenge(),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff'
      }
    )

    // ターン終了ボタン
    const endTurnButton = this.createButton(
      0,
      120,
      'ターン終了',
      () => this.endTurn(),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff'
      }
    )

    buttonContainer.add([drawButton, challengeButton, endTurnButton])
  }

  /**
   * ゲーム開始
   */
  private startGame(): void {
    this.gameInstance.start()
    
    // 初期手札を引く
    this.drawCards(GAME_CONSTANTS.INITIAL_DRAW)
  }

  /**
   * カードを引く
   */
  private drawCards(count: number): void {
    const drawnCards = this.gameInstance.drawCards(count)
    
    drawnCards.forEach((card, index) => {
      this.time.delayedCall(index * 100, () => {
        this.createHandCard(card)
      })
    })

    // 手札を再配置
    this.time.delayedCall(count * 100 + 100, () => {
      this.arrangeHand()
    })
  }

  /**
   * 手札にカードを作成
   */
  private createHandCard(card: Card): void {
    const cardContainer = this.add.container(
      GAME_CONSTANTS.DECK_X_POSITION,
      GAME_CONSTANTS.DECK_Y_POSITION
    )

    // カード背景
    const cardBg = this.add.image(0, 0, this.getCardTemplate(card.type))
    cardBg.setInteractive()

    // カード名
    const cardName = this.add.text(
      0,
      -60,
      card.name,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: '#ffffff',
        wordWrap: { width: 100 }
      }
    ).setOrigin(0.5)

    // パワー表示
    const powerText = this.add.text(
      -40,
      60,
      `${card.power}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#333333',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // コスト表示
    const costText = this.add.text(
      40,
      60,
      `${card.cost}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#666666'
      }
    ).setOrigin(0.5)

    cardContainer.add([cardBg, cardName, powerText, costText])
    cardContainer.setData('card', card)
    cardContainer.setData('selected', false)
    
    // インタラクション設定
    this.setupCardInteraction(cardContainer)
    
    this.handCards.push(cardContainer)
  }

  /**
   * カードテンプレートを取得
   */
  private getCardTemplate(type: CardType): string {
    switch (type) {
      case 'life':
        return 'life-card-template'
      case 'insurance':
        return 'insurance-card-template'
      case 'pitfall':
        return 'pitfall-card-template'
      default:
        return 'life-card-template'
    }
  }

  /**
   * カードのインタラクションを設定
   */
  private setupCardInteraction(cardContainer: Phaser.GameObjects.Container): void {
    const cardBg = cardContainer.list[0] as Phaser.GameObjects.Image
    
    // ドラッグ用の初期位置を保存
    cardContainer.setData('originalX', cardContainer.x)
    cardContainer.setData('originalY', cardContainer.y)
    cardContainer.setData('isDragging', false)

    // ドラッグ可能に設定
    this.input.setDraggable(cardBg)

    // ホバー効果
    cardBg.on('pointerover', () => {
      if (!cardContainer.getData('selected') && !cardContainer.getData('isDragging')) {
        cardContainer.setScale(GAME_CONSTANTS.CARD_HOVER_SCALE)
      }
    })

    cardBg.on('pointerout', () => {
      if (!cardContainer.getData('selected') && !cardContainer.getData('isDragging')) {
        cardContainer.setScale(1)
      }
    })

    // クリック（選択）
    cardBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 右クリックでドラッグ開始を防ぐ
      if (pointer.rightButtonDown()) return
      
      cardContainer.setData('dragStartTime', this.time.now)
      cardContainer.setDepth(1000) // 最前面に表示
    })

    cardBg.on('pointerup', () => {
      const dragStartTime = cardContainer.getData('dragStartTime')
      const isDragging = cardContainer.getData('isDragging')
      
      // クリック判定（ドラッグしていない場合）
      if (!isDragging && dragStartTime && this.time.now - dragStartTime < 200) {
        this.toggleCardSelection(cardContainer)
      }
      
      cardContainer.setData('isDragging', false)
    })

    // ドラッグ開始
    cardBg.on('dragstart', () => {
      cardContainer.setData('isDragging', true)
      cardContainer.setScale(GAME_CONSTANTS.CARD_HOVER_SCALE)
      
      // ドラッグ中は選択を解除
      if (cardContainer.getData('selected')) {
        this.toggleCardSelection(cardContainer)
      }
    })

    // ドラッグ中
    cardBg.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      cardContainer.x = dragX
      cardContainer.y = dragY
    })

    // ドラッグ終了
    cardBg.on('dragend', () => {
      cardContainer.setScale(1)
      
      // ドロップ先の判定
      const dropZone = this.getDropZone(cardContainer.x, cardContainer.y)
      
      if (dropZone === 'challenge') {
        // チャレンジエリアにドロップ
        this.handleCardDropToChallenge(cardContainer)
      } else {
        // 元の位置に戻す
        this.tweens.add({
          targets: cardContainer,
          x: cardContainer.getData('originalX'),
          y: cardContainer.getData('originalY'),
          duration: GAME_CONSTANTS.CARD_MOVE_DURATION,
          ease: 'Power2'
        })
      }
      
      cardContainer.setDepth(0) // 通常の深度に戻す
    })
  }

  /**
   * カードの選択状態を切り替え
   */
  private toggleCardSelection(cardContainer: Phaser.GameObjects.Container): void {
    const card = cardContainer.getData('card') as Card
    const isSelected = cardContainer.getData('selected')
    
    if (isSelected) {
      this.selectedCards.delete(card.id)
      cardContainer.setData('selected', false)
      cardContainer.setScale(1)
      
      // ハイライト削除
      const highlight = cardContainer.getByName('highlight')
      if (highlight) {
        highlight.destroy()
      }
    } else {
      this.selectedCards.add(card.id)
      cardContainer.setData('selected', true)
      
      // ハイライト追加
      const highlight = this.add.image(0, 0, 'card-highlight')
      highlight.setName('highlight')
      cardContainer.addAt(highlight, 0)
    }

    // チャレンジ中ならパワー表示を更新
    if (this.gameInstance.currentChallenge) {
      this.updatePowerDisplay()
    }
  }

  /**
   * 手札を整列
   */
  private arrangeHand(): void {
    const cardCount = this.handCards.length
    const totalWidth = (cardCount - 1) * (GAME_CONSTANTS.CARD_WIDTH + GAME_CONSTANTS.CARD_SPACING)
    const startX = this.centerX - totalWidth / 2

    this.handCards.forEach((card, index) => {
      const targetX = startX + index * (GAME_CONSTANTS.CARD_WIDTH + GAME_CONSTANTS.CARD_SPACING)
      
      // ドラッグ用の元の位置を更新
      card.setData('originalX', targetX)
      card.setData('originalY', GAME_CONSTANTS.HAND_Y_POSITION)
      
      this.tweens.add({
        targets: card,
        x: targetX,
        y: GAME_CONSTANTS.HAND_Y_POSITION,
        duration: GAME_CONSTANTS.CARD_MOVE_DURATION,
        ease: 'Power2'
      })
    })
  }

  /**
   * チャレンジ開始
   */
  private startChallenge(): void {
    if (this.gameInstance.currentChallenge) {
      // すでにチャレンジが進行中
      return
    }

    // チャレンジカードを引く
    const challengeCard = this.gameInstance.challengeDeck.drawCard()
    if (!challengeCard) {
      // チャレンジカードがありません
      return
    }

    // チャレンジ開始
    this.gameInstance.startChallenge(challengeCard)
    
    // チャレンジカードを表示
    this.displayChallengeCard(challengeCard)
    
    // UIを更新
    this.updateChallengeUI()
  }

  /**
   * ターン終了
   */
  private endTurn(): void {
    if (!this.gameInstance.isInProgress()) return

    // ステージ進行チェック
    this.checkStageProgress()
    
    // 次のターンへ
    this.gameInstance.nextTurn()
    
    // UI更新
    this.updateUI()
    
    // ゲーム終了判定
    this.checkGameEnd()
  }

  /**
   * UI更新
   */
  private updateUI(): void {
    // 活力表示を更新
    const vitalityText = this.children.getByName('vitality-text') as Phaser.GameObjects.Text
    if (vitalityText) {
      vitalityText.setText(`活力: ${this.gameInstance.vitality} / ${this.gameInstance.maxVitality}`)
    }

    // ターン数表示を更新
    const turnText = this.children.getByName('turn-text') as Phaser.GameObjects.Text
    if (turnText) {
      turnText.setText(`ターン: ${this.gameInstance.turn}`)
    }

    // デッキ枚数を更新
    const deckCount = this.children.getByName('deck-count') as Phaser.GameObjects.Text
    if (deckCount) {
      deckCount.setText(`${this.gameInstance.playerDeck.size()}`)
    }
  }

  /**
   * パワー表示を更新
   */
  private updatePowerDisplay(): void {
    const powerDisplay = this.children.getByName('power-display') as Phaser.GameObjects.Container
    if (!powerDisplay) return

    const selectedPower = this.calculateSelectedPower()
    const powerText = powerDisplay.getByName('power-text') as Phaser.GameObjects.Text
    const countText = powerDisplay.getByName('count-text') as Phaser.GameObjects.Text
    
    if (powerText) {
      powerText.setText(`選択パワー: ${selectedPower}`)
    }
    if (countText) {
      countText.setText(`選択カード: ${this.selectedCards.size}枚`)
    }
  }

  /**
   * ドロップゾーンを判定
   */
  private getDropZone(x: number, y: number): string | null {
    // チャレンジエリアの判定
    const challengeX = this.centerX
    const challengeY = GAME_CONSTANTS.CHALLENGE_Y_POSITION
    const distance = Phaser.Math.Distance.Between(x, y, challengeX, challengeY)
    
    if (distance < 100) {
      return 'challenge'
    }
    
    // TODO: 他のドロップゾーン（捨て札など）の判定
    
    return null
  }

  /**
   * カードをチャレンジエリアにドロップした時の処理
   */
  private handleCardDropToChallenge(cardContainer: Phaser.GameObjects.Container): void {
    const card = cardContainer.getData('card') as Card
    
    // すでにチャレンジカードがある場合は戻す
    if (this.gameInstance.currentChallenge) {
      this.tweens.add({
        targets: cardContainer,
        x: cardContainer.getData('originalX'),
        y: cardContainer.getData('originalY'),
        duration: GAME_CONSTANTS.CARD_MOVE_DURATION,
        ease: 'Power2'
      })
      return
    }
    
    // チャレンジエリアに配置
    this.tweens.add({
      targets: cardContainer,
      x: this.centerX,
      y: GAME_CONSTANTS.CHALLENGE_Y_POSITION,
      duration: GAME_CONSTANTS.CARD_MOVE_DURATION,
      ease: 'Power2',
      onComplete: () => {
        // 手札から削除
        const index = this.handCards.indexOf(cardContainer)
        if (index !== -1) {
          this.handCards.splice(index, 1)
        }
        
        // チャレンジ開始
        this.gameInstance.startChallenge(card)
        
        // 手札を再配置
        this.arrangeHand()
        
        // チャレンジUI表示
        this.showChallengeUI(card)
      }
    })
  }

  /**
   * チャレンジUIを表示
   */
  private showChallengeUI(challengeCard: Card): void {
    // チャレンジ情報を表示
    const challengeInfo = this.add.container(this.centerX, GAME_CONSTANTS.CHALLENGE_Y_POSITION - 150)
    
    const bg = this.add.rectangle(0, 0, 300, 60, 0x000000, 0.8)
    const text = this.add.text(
      0,
      0,
      `チャレンジ: ${challengeCard.name}\nパワー: ${challengeCard.power}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center'
      }
    ).setOrigin(0.5)
    
    challengeInfo.add([bg, text])
    challengeInfo.setName('challenge-info')
    
    // フェードイン
    challengeInfo.setAlpha(0)
    this.tweens.add({
      targets: challengeInfo,
      alpha: 1,
      duration: 300
    })
  }

  /**
   * チャレンジカードを表示
   */
  private displayChallengeCard(challengeCard: Card): void {
    const challengeContainer = this.add.container(
      this.centerX,
      GAME_CONSTANTS.CHALLENGE_Y_POSITION
    )

    // カード背景
    const cardBg = this.add.image(0, 0, this.getCardTemplate('life'))
    cardBg.setTint(0xFFD43B)

    // カード名
    const cardName = this.add.text(
      0,
      -60,
      challengeCard.name,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#333333',
        fontStyle: 'bold',
        wordWrap: { width: 100 }
      }
    ).setOrigin(0.5)

    // パワー表示
    const powerText = this.add.text(
      0,
      20,
      `${challengeCard.power}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '36px',
        color: '#FF0000',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // 説明文
    const descText = this.add.text(
      0,
      60,
      challengeCard.description,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '12px',
        color: '#666666',
        wordWrap: { width: 100 }
      }
    ).setOrigin(0.5)

    challengeContainer.add([cardBg, cardName, powerText, descText])
    challengeContainer.setName('challenge-card')
    challengeContainer.setScale(0)
    
    // アニメーション
    this.tweens.add({
      targets: challengeContainer,
      scale: 1.2,
      duration: 500,
      ease: 'Back.easeOut'
    })
  }

  /**
   * チャレンジUI更新
   */
  private updateChallengeUI(): void {
    // 既存のチャレンジボタンを削除
    const existingButton = this.children.getByName('resolve-challenge-button')
    if (existingButton) {
      existingButton.destroy()
    }

    // プレイヤーパワー表示
    const powerDisplay = this.add.container(this.gameWidth - 150, 300)
    powerDisplay.setName('power-display')

    const bg = this.add.rectangle(0, 0, 200, 80, 0x000000, 0.8)
    
    const selectedPower = this.calculateSelectedPower()
    const text = this.add.text(
      0,
      -20,
      `選択パワー: ${selectedPower}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#00FF00'
      }
    )
    text.setOrigin(0.5)
    text.setName('power-text')

    const subText = this.add.text(
      0,
      10,
      `選択カード: ${this.selectedCards.size}枚`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: '#ffffff'
      }
    )
    subText.setOrigin(0.5)
    subText.setName('count-text')

    powerDisplay.add([bg, text, subText])

    // チャレンジ解決ボタン
    const resolveButton = this.createButton(
      this.gameWidth - 150,
      400,
      'チャレンジに挑む',
      () => this.resolveChallenge(),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff'
      }
    )
    resolveButton.setName('resolve-challenge-button')
  }

  /**
   * 選択したカードの合計パワーを計算
   */
  private calculateSelectedPower(): number {
    let totalPower = 0
    this.handCards.forEach(cardContainer => {
      const card = cardContainer.getData('card') as Card
      if (this.selectedCards.has(card.id)) {
        totalPower += card.power
      }
    })
    return totalPower
  }

  /**
   * チャレンジを解決
   */
  private resolveChallenge(): void {
    if (!this.gameInstance.currentChallenge) {
      return
    }

    // 選択したカードをゲームインスタンスに設定
    this.gameInstance.selectedCards = []
    this.handCards.forEach(cardContainer => {
      const card = cardContainer.getData('card') as Card
      if (this.selectedCards.has(card.id)) {
        this.gameInstance.selectedCards.push(card)
      }
    })

    // チャレンジ解決
    const result = this.gameInstance.resolveChallenge()
    
    // 結果表示
    this.showChallengeResult(result)
    
    // カード選択フェーズかチェック
    if (result.success && result.cardChoices) {
      // カード選択UIを表示（結果表示後に）
      this.time.delayedCall(2000, () => {
        this.showCardSelection(result.cardChoices!)
      })
    }
    
    // 使用したカードを削除
    this.handCards = this.handCards.filter(cardContainer => {
      const card = cardContainer.getData('card') as Card
      if (this.selectedCards.has(card.id)) {
        cardContainer.destroy()
        return false
      }
      return true
    })
    
    // 選択をクリア
    this.selectedCards.clear()
    
    // チャレンジカードを削除
    const challengeCard = this.children.getByName('challenge-card')
    if (challengeCard) {
      this.tweens.add({
        targets: challengeCard,
        scale: 0,
        duration: 300,
        onComplete: () => challengeCard.destroy()
      })
    }

    // UI更新
    this.updateUI()
    this.arrangeHand()
    
    // パワー表示を削除
    const powerDisplay = this.children.getByName('power-display')
    if (powerDisplay) {
      powerDisplay.destroy()
    }
  }

  /**
   * チャレンジ結果を表示
   */
  private showChallengeResult(result: ChallengeResult): void {
    const resultContainer = this.add.container(this.centerX, this.centerY)
    
    const bg = this.add.rectangle(0, 0, 400, 200, 0x000000, 0.9)
    
    const titleText = this.add.text(
      0,
      -60,
      result.success ? 'チャレンジ成功！' : 'チャレンジ失敗...',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '28px',
        color: result.success ? '#00FF00' : '#FF0000',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    
    const detailText = this.add.text(
      0,
      0,
      `あなたのパワー: ${result.playerPower}\nチャレンジパワー: ${result.challengePower}\n活力変化: ${result.vitalityChange > 0 ? '+' : ''}${result.vitalityChange}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 5
      }
    ).setOrigin(0.5)
    
    const closeButton = this.createButton(
      0,
      70,
      '閉じる',
      () => {
        this.tweens.add({
          targets: resultContainer,
          scale: 0,
          duration: 300,
          onComplete: () => resultContainer.destroy()
        })
      },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#ffffff'
      }
    )
    
    resultContainer.add([bg, titleText, detailText, closeButton])
    resultContainer.setScale(0)
    
    // アニメーション
    this.tweens.add({
      targets: resultContainer,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    })
  }

  /**
   * ステージ表示テキストを取得
   */
  private getStageDisplayText(): string {
    const stageNames = {
      youth: '青年期',
      middle: '中年期',
      fulfillment: '充実期'
    }
    const currentStage = this.gameInstance.stage
    const stageName = stageNames[currentStage] || '不明'
    
    const turnsInStage = this.getTurnsInCurrentStage()
    const maxTurns = GAME_CONSTANTS.STAGE_TURNS[currentStage]
    
    return `ステージ: ${stageName} (${turnsInStage}/${maxTurns})`
  }

  /**
   * 現在のステージでのターン数を取得
   */
  private getTurnsInCurrentStage(): number {
    const turn = this.gameInstance.turn
    
    if (this.gameInstance.stage === 'youth') {
      return turn
    } else if (this.gameInstance.stage === 'middle') {
      return turn - GAME_CONSTANTS.STAGE_TURNS.youth
    } else {
      return turn - GAME_CONSTANTS.STAGE_TURNS.youth - GAME_CONSTANTS.STAGE_TURNS.middle
    }
  }

  /**
   * ステージ進行をチェック
   */
  private checkStageProgress(): void {
    const turn = this.gameInstance.turn
    const stage = this.gameInstance.stage
    
    if (stage === 'youth' && turn >= GAME_CONSTANTS.STAGE_TURNS.youth) {
      this.gameInstance.advanceStage()
      this.showStageTransition('中年期')
      this.updateChallengeDeck()
    } else if (stage === 'middle' && 
               turn >= GAME_CONSTANTS.STAGE_TURNS.youth + GAME_CONSTANTS.STAGE_TURNS.middle) {
      this.gameInstance.advanceStage()
      this.showStageTransition('充実期')
      this.updateChallengeDeck()
    }
  }

  /**
   * チャレンジデッキを更新
   */
  private updateChallengeDeck(): void {
    // 古いチャレンジカードをクリア
    this.gameInstance.challengeDeck.clear()
    
    // 新しいステージのチャレンジカードを追加
    const newChallenges = CardFactory.createChallengeCards(this.gameInstance.stage)
    this.gameInstance.challengeDeck.addCards(newChallenges)
    this.gameInstance.challengeDeck.shuffle()
  }

  /**
   * ステージ遷移演出を表示
   */
  private showStageTransition(stageName: string): void {
    const transitionContainer = this.add.container(this.centerX, this.centerY)
    
    const bg = this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0x000000, 0.8)
    
    const text = this.add.text(
      0,
      0,
      `${stageName}へ突入！`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    
    transitionContainer.add([bg, text])
    transitionContainer.setAlpha(0)
    
    // フェードイン
    this.tweens.add({
      targets: transitionContainer,
      alpha: 1,
      duration: 500,
      onComplete: () => {
        // 一定時間表示後、フェードアウト
        this.time.delayedCall(2000, () => {
          this.tweens.add({
            targets: transitionContainer,
            alpha: 0,
            duration: 500,
            onComplete: () => transitionContainer.destroy()
          })
        })
      }
    })
    
    // ステージ表示を更新
    const stageText = this.children.getByName('stage-text') as Phaser.GameObjects.Text
    if (stageText) {
      stageText.setText(this.getStageDisplayText())
    }
  }

  /**
   * ゲーム終了をチェック
   */
  private checkGameEnd(): void {
    if (this.gameInstance.isCompleted()) {
      if (this.gameInstance.status === 'victory') {
        this.showGameEnd(true)
      } else if (this.gameInstance.status === 'game_over') {
        this.showGameEnd(false)
      }
    } else if (this.gameInstance.stage === 'fulfillment' && 
               this.gameInstance.vitality >= GAME_CONSTANTS.VICTORY_VITALITY) {
      // 充実期で活力が一定以上なら勝利
      this.gameInstance.status = 'victory'
      this.showGameEnd(true)
    }
  }

  /**
   * カード選択UIを表示
   */
  private showCardSelection(cardChoices: Card[]): void {
    // 既存のカード選択UIがあれば削除
    if (this.cardSelectionUI) {
      this.cardSelectionUI.destroy()
    }

    // カード選択コンテナを作成
    this.cardSelectionUI = this.add.container(this.centerX, this.centerY)
    this.cardSelectionUI.setDepth(2000)

    // 背景オーバーレイ
    const overlay = this.add.rectangle(
      0, 0,
      this.gameWidth, this.gameHeight,
      0x000000, 0.8
    )
    overlay.setOrigin(0.5)

    // タイトル
    const titleText = this.add.text(
      0, -200,
      '保険カードを選択してください',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // 説明文
    const descText = this.add.text(
      0, -150,
      '1枚選んでデッキに追加されます',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#cccccc'
      }
    ).setOrigin(0.5)

    this.cardSelectionUI.add([overlay, titleText, descText])

    // カードを表示
    cardChoices.forEach((card, index) => {
      this.createSelectableCard(card, index)
    })

    // フェードイン
    this.cardSelectionUI.setAlpha(0)
    this.tweens.add({
      targets: this.cardSelectionUI,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    })
  }

  /**
   * 選択可能なカードを作成
   */
  private createSelectableCard(card: Card, index: number): void {
    if (!this.cardSelectionUI) return

    const cardSpacing = 220
    const totalCards = 3 // 常に3枚のカード
    const startX = -(totalCards - 1) * cardSpacing / 2
    const cardX = startX + index * cardSpacing

    const cardContainer = this.add.container(cardX, 0)
    cardContainer.setScale(1.2) // 少し大きめに表示

    // カード背景
    const cardBg = this.add.image(0, 0, this.getCardTemplate(card.type))
    cardBg.setInteractive()

    // カード名
    const cardName = this.add.text(
      0, -80,
      card.name,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
        wordWrap: { width: 120 }
      }
    ).setOrigin(0.5)

    // 説明文
    const cardDesc = this.add.text(
      0, -40,
      card.description,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '12px',
        color: '#cccccc',
        wordWrap: { width: 120 },
        align: 'center'
      }
    ).setOrigin(0.5)

    // パワー表示
    const powerText = this.add.text(
      -40, 50,
      `${card.power}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#333333',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // カバレッジ表示（保険カードの場合）
    let coverageText: Phaser.GameObjects.Text | undefined
    if (card.coverage) {
      coverageText = this.add.text(
        40, 50,
        `保障:${card.coverage}`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '14px',
          color: '#0066cc',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5)
    }

    // 選択ボタン
    const selectButton = this.createButton(
      0, 120,
      '選択',
      () => this.onCardSelected(card),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff'
      }
    )

    // ホバー効果
    cardBg.on('pointerover', () => {
      cardContainer.setScale(1.3)
      this.tweens.add({
        targets: cardContainer,
        y: -20,
        duration: 200,
        ease: 'Power2'
      })
    })

    cardBg.on('pointerout', () => {
      cardContainer.setScale(1.2)
      this.tweens.add({
        targets: cardContainer,
        y: 0,
        duration: 200,
        ease: 'Power2'
      })
    })

    // クリックで選択
    cardBg.on('pointerdown', () => {
      this.onCardSelected(card)
    })

    const cardElements = [cardBg, cardName, cardDesc, powerText, selectButton]
    if (coverageText) cardElements.push(coverageText)
    
    cardContainer.add(cardElements)
    this.cardSelectionUI.add(cardContainer)
  }

  /**
   * カード選択時の処理
   */
  private onCardSelected(card: Card): void {
    if (!this.cardSelectionUI) return

    // 選択アニメーション
    const selectedContainer = this.cardSelectionUI.list.find(child => {
      return child instanceof Phaser.GameObjects.Container &&
             child.list.some(element => 
               element instanceof Phaser.GameObjects.Image && 
               element.input?.enabled
             )
    }) as Phaser.GameObjects.Container

    // 選択されたカードのアニメーション
    if (selectedContainer) {
      this.tweens.add({
        targets: selectedContainer,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        yoyo: true,
        ease: 'Power2'
      })
    }

    // カードをゲームに追加
    this.gameInstance.selectCard(card.id)

    // カード獲得アニメーション
    this.showCardAcquisitionAnimation(card, () => {
      // アニメーション完了後にUIを閉じる
      this.hideCardSelection()
    })
  }

  /**
   * カード獲得アニメーション
   */
  private showCardAcquisitionAnimation(card: Card, onComplete: () => void): void {
    // 選択されたカードを強調表示
    const highlightContainer = this.add.container(this.centerX, this.centerY)
    highlightContainer.setDepth(3000)

    const cardBg = this.add.image(0, 0, this.getCardTemplate(card.type))
    cardBg.setScale(2) // 大きく表示

    const cardName = this.add.text(
      0, -100,
      card.name,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    const acquiredText = this.add.text(
      0, 120,
      'デッキに追加されました！',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#00ff00',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    highlightContainer.add([cardBg, cardName, acquiredText])

    // パルス効果
    this.tweens.add({
      targets: highlightContainer,
      scale: 1.1,
      duration: 300,
      yoyo: true,
      repeat: 1,
      ease: 'Power2',
      onComplete: () => {
        // フェードアウト
        this.tweens.add({
          targets: highlightContainer,
          alpha: 0,
          scale: 0.5,
          duration: 800,
          ease: 'Power2',
          onComplete: () => {
            highlightContainer.destroy()
            onComplete()
          }
        })
      }
    })
  }

  /**
   * カード選択UIを隠す
   */
  private hideCardSelection(): void {
    if (!this.cardSelectionUI) return

    this.tweens.add({
      targets: this.cardSelectionUI,
      alpha: 0,
      scale: 0.8,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.cardSelectionUI?.destroy()
        this.cardSelectionUI = undefined
        
        // 通常のゲームフローに戻る
        this.updateUI()
      }
    })
  }

  /**
   * ゲーム終了画面を表示
   */
  private showGameEnd(isVictory: boolean): void {
    const endContainer = this.add.container(this.centerX, this.centerY)
    
    const bg = this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0x000000, 0.9)
    
    const titleText = this.add.text(
      0,
      -100,
      isVictory ? '人生充実！' : 'ゲームオーバー',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '48px',
        color: isVictory ? '#FFD43B' : '#FF6B6B',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    
    const stats = this.gameInstance.stats
    const statsText = this.add.text(
      0,
      0,
      `最終活力: ${this.gameInstance.vitality}\n` +
      `総ターン数: ${stats.turnsPlayed}\n` +
      `チャレンジ成功数: ${stats.successfulChallenges}/${stats.totalChallenges}\n` +
      `最高活力: ${stats.highestVitality}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10
      }
    ).setOrigin(0.5)
    
    const retryButton = this.createButton(
      -100,
      100,
      'もう一度',
      () => {
        this.scene.restart()
      },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff'
      }
    )
    
    const menuButton = this.createButton(
      100,
      100,
      'メニューへ',
      () => {
        this.scene.start('MainMenuScene')
      },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff'
      }
    )
    
    endContainer.add([bg, titleText, statsText, retryButton, menuButton])
    endContainer.setDepth(1000)
    endContainer.setAlpha(0)
    
    // フェードイン
    this.tweens.add({
      targets: endContainer,
      alpha: 1,
      duration: 1000
    })
  }
}