import { BaseScene } from './BaseScene'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import { CardFactory } from '@/domain/services/CardFactory'
import { GAME_CONSTANTS } from '../config/gameConfig'
import type { CardType } from '@/domain/types/card.types'
import type { ChallengeResult } from '@/domain/types/game.types'
import { AGE_PARAMETERS } from '@/domain/types/game.types'
import { TutorialManager } from '../systems/TutorialManager'
import { TutorialOverlay } from '../ui/TutorialOverlay'
import type { TutorialConfig, TutorialStep } from '@/domain/types/tutorial.types'
import { setupGlobalTutorialTests } from '../tutorial/TutorialTestHelper'
import { INTERACTIVE_GAME_TUTORIAL } from '../tutorial/InteractiveTutorialConfig'
import { DropZoneIntegration } from '../systems/DropZoneIntegration'

/**
 * メインゲームシーン
 */
export class GameScene extends BaseScene {
  private gameInstance!: Game
  private handCards: Phaser.GameObjects.Container[] = []
  private selectedCards: Set<string> = new Set()
  private cardSelectionUI?: Phaser.GameObjects.Container
  private insuranceTypeSelectionUI?: Phaser.GameObjects.Container
  private selectedInsuranceType?: 'whole_life' | 'term'
  private vitalityBarContainer?: Phaser.GameObjects.Container
  private vitalityBar?: Phaser.GameObjects.Rectangle
  private vitalityBarMaxWidth: number = 300
  private insuranceListContainer?: Phaser.GameObjects.Container
  private burdenIndicatorContainer?: Phaser.GameObjects.Container
  private insuranceRenewalDialogUI?: Phaser.GameObjects.Container
  
  // ダーティフラグによるUI最適化
  private dirtyFlags = {
    vitality: false,
    insurance: false,
    burden: false,
    hand: false,
    actionButtons: false,
    challenge: false,
    stage: false,
    deck: false
  }
  
  // パフォーマンス最適化用のスロットリング
  private updateThrottleTimers = {
    vitality: 0,
    insurance: 0,
    burden: 0
  }
  
  // ドラッグ&ドロップ関連（新システム）
  private dropZoneIntegration?: DropZoneIntegration
  
  // 旧システム（段階的移行のため一時的に保持）
  private dropZones: Map<string, Phaser.GameObjects.Container> = new Map()
  private dropZoneHighlights: Map<string, Phaser.GameObjects.Graphics> = new Map()
  private isDragInProgress: boolean = false
  private dragTrail?: Phaser.GameObjects.Graphics
  private magneticEffect?: Phaser.GameObjects.Graphics

  // チュートリアル関連
  private tutorialManager?: TutorialManager
  private tutorialOverlay?: TutorialOverlay
  private isTutorialMode: boolean = false
  private tutorialStepElements: Map<string, Phaser.GameObjects.GameObject> = new Map()
  private shouldStartTutorial: boolean = false

  constructor() {
    super({ key: 'GameScene' })
  }

  init(data: { startTutorial?: boolean }): void {
    // メニューからのチュートリアル開始要求をフラグとして保存
    this.shouldStartTutorial = data.startTutorial || false
  }

  protected initialize(): void {
    // ゲームインスタンスの初期化
    this.initializeGame()

    // UI要素の作成
    this.createUI()

    // カードエリアの作成
    this.createCardAreas()

    // チュートリアルUIの初期化
    this.initializeTutorial()

    // ゲーム開始
    this.startGame()

    // メニューからチュートリアルが要求された場合は自動開始
    if (this.shouldStartTutorial) {
      this.time.delayedCall(500, () => {
        this.autoStartTutorial()
      })
    }
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
    // 背景 - ダークでモダンな背景
    this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0x1F2937)
      .setOrigin(0, 0)

    // ヘッダー - グラデーション風の見た目
    const header = this.add.rectangle(0, 0, this.gameWidth, 80, 0x4C1D95)
      .setOrigin(0, 0)
    header.setAlpha(0.9)

    // ステージ表示
    const stageText = this.add.text(
      20,
      40,
      this.getStageDisplayText(),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#F9FAFB',
        fontStyle: 'bold'
      }
    )
    stageText.setOrigin(0, 0.5)
    stageText.setName('stage-text')

    // 人生段階進行インジケーター
    this.createLifeStageIndicator()

    // 活力バーコンテナ
    this.createVitalityBar()

    // 活力表示（年齢段階を含む）
    const stageLabel = this.getStageDisplayText()
    const vitalityText = this.add.text(
      this.centerX,
      40,
      `活力: ${this.gameInstance.vitality} / ${this.gameInstance.maxVitality} (${stageLabel})`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#F9FAFB',
        fontStyle: 'bold'
      }
    )
    vitalityText.setOrigin(0.5)
    vitalityText.setShadow(2, 2, '#000000', 0.5, true, true)
    vitalityText.setName('vitality-text')

    // ターン表示
    const turnText = this.add.text(
      this.gameWidth - 20,
      40,
      `ターン: ${this.gameInstance.turn}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#E5E7EB'
      }
    )
    turnText.setOrigin(1, 0.5)
    turnText.setName('turn-text')

    // アクションボタン
    this.createActionButtons()

    // Phase 3-3: 保険料負担インジケーター
    this.createBurdenIndicator()

    // Phase 3-3: 保険カード一覧
    this.createInsuranceListDisplay()
  }

  /**
   * Phase 3-3: 保険料負担インジケーターを作成
   */
  private createBurdenIndicator(): void {
    this.burdenIndicatorContainer = this.add.container(this.gameWidth - 200, 120)
    this.burdenIndicatorContainer.setName('burden-indicator')

    // 背景 - ガラスモルフィズム風
    const bg = this.add.rectangle(0, 0, 180, 50, 0x111827, 0.8)
    bg.setStrokeStyle(1, 0x818CF8, 0.5)

    // ラベル
    const label = this.add.text(
      -80, 0,
      '保険料負担:',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#E5E7EB'
      }
    ).setOrigin(0, 0.5)

    // 負担値
    const burden = this.gameInstance.insuranceBurden
    const burdenText = this.add.text(
      40, 0,
      burden === 0 ? '負担なし' : `${burden}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: burden === 0 ? '#10B981' : '#EF4444',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    burdenText.setShadow(1, 1, '#000000', 0.3, true, true)
    burdenText.setName('burden-value')

    this.burdenIndicatorContainer.add([bg, label, burdenText])
  }

  /**
   * Phase 3-3: 保険カード一覧表示を作成
   */
  private createInsuranceListDisplay(): void {
    this.insuranceListContainer = this.add.container(this.gameWidth - 150, 250)
    this.insuranceListContainer.setName('insurance-list')

    // タイトル
    const title = this.add.text(
      0, 0,
      '有効な保険',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#F9FAFB',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    title.setShadow(1, 1, '#000000', 0.3, true, true)

    this.insuranceListContainer.add(title)

    // 保険カードリストを更新
    this.updateInsuranceList()
  }

  /**
   * 人生段階インジケーターを作成
   */
  private createLifeStageIndicator(): void {
    const indicatorContainer = this.add.container(20, 70)
    indicatorContainer.setName('life-stage-indicator')

    const stages = ['youth', 'middle', 'fulfillment'] as const
    const stageLabels = ['青年期', '中年期', '充実期']
    const stageColors = [0x10B981, 0xF59E0B, 0xA78BFA]
    const currentStageIndex = stages.indexOf(this.gameInstance.stage as 'youth' | 'middle' | 'fulfillment')

    stages.forEach((stage, index) => {
      const isActive = index <= currentStageIndex
      const isCurrent = index === currentStageIndex
      
      // ステージドット
      const dot = this.add.circle(
        index * 50, 0,
        isCurrent ? 8 : 6,
        isActive ? stageColors[index] : 0x4B5563,
        isActive ? 1 : 0.5
      )
      
      // ステージラベル
      const label = this.add.text(
        index * 50, 15,
        stageLabels[index],
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '10px',
          color: isActive ? '#F9FAFB' : '#6B7280',
          fontStyle: isCurrent ? 'bold' : 'normal'
        }
      ).setOrigin(0.5)
      
      // 最大活力表示
      const maxVitalityForStage = index === 0 ? 35 : index === 1 ? 30 : 27
      const maxVitalityLabel = this.add.text(
        index * 50, 25,
        `最大${maxVitalityForStage}`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '8px',
          color: isActive ? '#9CA3AF' : '#4B5563'
        }
      ).setOrigin(0.5)
      
      indicatorContainer.add([dot, label, maxVitalityLabel])
      
      // 現在のステージにパルス効果
      if (isCurrent) {
        this.tweens.add({
          targets: dot,
          scale: 1.2,
          duration: 1500,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      }
      
      // 接続線（最後のステージ以外）
      if (index < stages.length - 1) {
        const line = this.add.rectangle(
          index * 50 + 25, 0,
          20, 2,
          isActive && index < currentStageIndex ? stageColors[index] : 0x4B5563,
          isActive && index < currentStageIndex ? 1 : 0.3
        )
        indicatorContainer.add(line)
      }
    })
  }

  /**
   * 人生段階インジケーターを更新
   */
  private updateLifeStageIndicator(): void {
    const indicatorContainer = this.children.getByName('life-stage-indicator') as Phaser.GameObjects.Container
    if (!indicatorContainer) return

    indicatorContainer.destroy()
    this.createLifeStageIndicator()
  }

  /**
   * 活力バーを作成
   */
  private createVitalityBar(): void {
    this.vitalityBarContainer = this.add.container(this.centerX, 65)
    this.vitalityBarContainer.setName('vitality-bar-container')

    // 活力バーの背景 - よりモダンなスタイル
    const barBg = this.add.rectangle(
      0, 0,
      this.vitalityBarMaxWidth + 4,
      24,
      0x111827
    )
    barBg.setStrokeStyle(2, 0x818CF8)
    barBg.setAlpha(0.8)

    // 活力バー本体
    const vitalityPercentage = this.gameInstance.vitality / this.gameInstance.maxVitality
    const barWidth = Math.max(0, this.vitalityBarMaxWidth * vitalityPercentage)
    
    this.vitalityBar = this.add.rectangle(
      -this.vitalityBarMaxWidth / 2, 0,
      barWidth,
      20,
      this.getVitalityBarColor(vitalityPercentage)
    )
    this.vitalityBar.setOrigin(0, 0.5)

    // 最大値マーカー（現在のステージの最大値を示す）
    const maxMarker = this.add.rectangle(
      -this.vitalityBarMaxWidth / 2 + this.vitalityBarMaxWidth, 0,
      2,
      24,
      0x818CF8
    )
    maxMarker.setOrigin(0.5)

    this.vitalityBarContainer.add([barBg, this.vitalityBar, maxMarker])
  }

  /**
   * 活力バーの色を取得
   */
  private getVitalityBarColor(percentage: number): number {
    if (percentage > 0.6) return 0x10B981 // 緑 - 高活力
    if (percentage > 0.3) return 0xF59E0B // オレンジ - 中活力
    return 0xEF4444 // 赤 - 低活力
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
    
    // ドロップゾーンの初期化
    this.initializeDropZones()
    
    // 新しいドロップゾーンシステムの初期化
    this.initializeNewDropZoneSystem()
  }

  /**
   * ドロップゾーンを初期化
   */
  private initializeDropZones(): void {
    // チャレンジエリアのドロップゾーンを登録
    const challengeArea = this.children.getByName('challenge-area') as Phaser.GameObjects.Container
    if (challengeArea) {
      this.dropZones.set('challenge', challengeArea)
      this.createDropZoneHighlight('challenge', challengeArea.x, challengeArea.y, GAME_CONSTANTS.CARD_WIDTH + 20, GAME_CONSTANTS.CARD_HEIGHT + 20)
    }
    
    // 捨て札エリアのドロップゾーンを登録
    const discardArea = this.children.getByName('discard-area') as Phaser.GameObjects.Container
    if (discardArea) {
      this.dropZones.set('discard', discardArea)
      this.createDropZoneHighlight('discard', discardArea.x, discardArea.y, GAME_CONSTANTS.CARD_WIDTH + 20, GAME_CONSTANTS.CARD_HEIGHT + 20)
    }
    
    // ドラッグトレイル用のグラフィックスを作成
    this.dragTrail = this.add.graphics()
    this.dragTrail.setDepth(900) // カードより下、通常要素より上
    
    // マグネティック効果用のグラフィックスを作成
    this.magneticEffect = this.add.graphics()
    this.magneticEffect.setDepth(950) // ドラッグトレイルより上
  }

  /**
   * 新しいドロップゾーンシステムを初期化
   */
  private initializeNewDropZoneSystem(): void {
    // DropZoneIntegrationを初期化（デフォルトゾーンは自動的に設定される）
    this.dropZoneIntegration = new DropZoneIntegration(this, this.gameInstance)
    
    // カード選択イベントのハンドリングを設定
    this.data.events.on('cardSelected', (cardContainer: Phaser.GameObjects.Container) => {
      this.toggleCardSelection(cardContainer)
    })
  }

  /**
   * ドロップゾーンのハイライトを作成
   */
  private createDropZoneHighlight(zoneName: string, x: number, y: number, _width: number, _height: number): void {
    const highlight = this.add.graphics()
    highlight.setPosition(x, y)
    highlight.setAlpha(0) // 初期状態では非表示
    highlight.setDepth(100) // カードより下に表示
    
    this.dropZoneHighlights.set(zoneName, highlight)
  }

  /**
   * ドロップゾーンハイライトを表示
   */
  private showDropZoneHighlights(draggedCard?: Phaser.GameObjects.Container): void {
    this.dropZoneHighlights.forEach((highlight, zoneName) => {
      const isValid = this.isValidDropZone(zoneName, draggedCard)
      const color = isValid ? GAME_CONSTANTS.COLORS.DROP_ZONE_VALID : GAME_CONSTANTS.COLORS.DROP_ZONE_INVALID
      const alpha = isValid ? 0.3 : 0.15
      
      // ハイライトの描画をクリア
      highlight.clear()
      
      // 円形のハイライトを描画
      const radius = (GAME_CONSTANTS.CARD_WIDTH + 40) / 2
      highlight.fillStyle(color, alpha)
      highlight.fillCircle(0, 0, radius)
      
      // 境界線を描画
      highlight.lineStyle(3, color, 0.8)
      highlight.strokeCircle(0, 0, radius)
      
      // パルス効果のアニメーション
      this.tweens.add({
        targets: highlight,
        alpha: alpha * 1.5,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: GAME_CONSTANTS.DRAG_DROP.GLOW_PULSE_DURATION / 2,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
      })
      
      // フェードイン
      this.tweens.add({
        targets: highlight,
        alpha: alpha,
        duration: 200,
        ease: 'Power2'
      })
    })
  }

  /**
   * ドロップゾーンハイライトを隠す
   */
  private hideDropZoneHighlights(): void {
    this.dropZoneHighlights.forEach((highlight) => {
      // アニメーション停止
      this.tweens.killTweensOf(highlight)
      
      // フェードアウト
      this.tweens.add({
        targets: highlight,
        alpha: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
        ease: 'Power2',
        onComplete: () => {
          highlight.clear()
        }
      })
    })
  }

  /**
   * ドロップゾーンが有効かどうかを判定
   */
  private isValidDropZone(zoneName: string, draggedCard?: Phaser.GameObjects.Container): boolean {
    if (!draggedCard) return true
    
    switch (zoneName) {
      case 'challenge':
        // チャレンジエリアは、チャレンジが開始されている、かつ現在チャレンジカードがない場合に有効
        return this.gameInstance.currentChallenge !== null && !this.gameInstance.currentChallenge.isCardPlaced
      case 'discard':
        // 捨て札エリアは常に有効
        return true
      default:
        return false
    }
  }

  /**
   * ドラッグ中のマグネティック効果を更新
   */
  private updateMagneticEffect(cardX: number, cardY: number): string | null {
    let closestZone: string | null = null
    let minDistance = GAME_CONSTANTS.DRAG_DROP.SNAP_DISTANCE
    
    // マグネティック効果をクリア
    if (this.magneticEffect) {
      this.magneticEffect.clear()
    }
    
    this.dropZones.forEach((zone, zoneName) => {
      const distance = Phaser.Math.Distance.Between(cardX, cardY, zone.x, zone.y)
      
      if (distance < GAME_CONSTANTS.DRAG_DROP.SNAP_DISTANCE && distance < minDistance) {
        minDistance = distance
        closestZone = zoneName
      }
    })
    
    // 最も近いゾーンにマグネティック効果を表示
    if (closestZone && this.magneticEffect) {
      const zone = this.dropZones.get(closestZone)
      if (zone && this.isValidDropZone(closestZone)) {
        // マグネティック効果のグロウを描画
        this.magneticEffect.clear()
        this.magneticEffect.fillStyle(GAME_CONSTANTS.COLORS.MAGNETIC_GLOW, 0.4)
        this.magneticEffect.fillCircle(zone.x, zone.y, (GAME_CONSTANTS.CARD_WIDTH + 60) / 2)
        
        // 引力線を描画
        this.magneticEffect.lineStyle(3, GAME_CONSTANTS.COLORS.MAGNETIC_GLOW, 0.6)
        this.magneticEffect.beginPath()
        this.magneticEffect.moveTo(cardX, cardY)
        this.magneticEffect.lineTo(zone.x, zone.y)
        this.magneticEffect.strokePath()
      }
    }
    
    return closestZone
  }

  /**
   * ドラッグトレイルを更新
   */
  private updateDragTrail(cardX: number, cardY: number): void {
    if (!this.dragTrail) return
    
    // トレイル効果を描画
    this.dragTrail.fillStyle(GAME_CONSTANTS.COLORS.DRAG_SHADOW, 0.2)
    this.dragTrail.fillCircle(cardX - 5, cardY + 5, 30) // 少しオフセットしたシャドウ
  }

  /**
   * アクションボタンを作成
   */
  private createActionButtons(): void {
    const buttonContainer = this.add.container(this.gameWidth - 150, 150)
    buttonContainer.setName('action-buttons')

    // ドローボタン
    const drawButton = this.createContainerButton(
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
    drawButton.setName('draw-button')

    // チャレンジボタン
    const challengeButton = this.createContainerButton(
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
    challengeButton.setName('challenge-button')

    // ターン終了ボタン
    const endTurnButton = this.createContainerButton(
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
    endTurnButton.setName('end-turn-button')

    buttonContainer.add([drawButton, challengeButton, endTurnButton])
    
    // 初期状態でボタンの有効/無効を設定
    this.updateActionButtons()
  }

  /**
   * ゲーム開始
   */
  private startGame(): void {
    this.gameInstance.start()
    
    // 初期手札を引く
    this.drawCards(GAME_CONSTANTS.INITIAL_DRAW)
    
    // ボタン状態を初期化
    this.time.delayedCall(100, () => {
      this.updateActionButtons()
    })

    // ゲーム状態を公開（チュートリアル用）
    this.updateGameStateForTutorial()
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
      // チュートリアル用にゲーム状態を更新
      this.updateGameStateForTutorial()
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

    // カード背景 - グラデーションと角丸
    const graphics = this.add.graphics()
    const cardColor = this.getCardColor(card.type)
    
    // グラデーション背景
    graphics.fillGradientStyle(cardColor.top, cardColor.top, cardColor.bottom, cardColor.bottom, 1)
    graphics.fillRoundedRect(-60, -80, 120, 160, 12)
    
    // ガラスモルフィズム効果
    const glassBg = this.add.rectangle(0, 0, 116, 156, 0xffffff, 0.1)
    glassBg.setStrokeStyle(1, 0xffffff, 0.3)
    
    // カードをインタラクティブに
    const hitArea = new Phaser.Geom.Rectangle(-60, -80, 120, 160)
    cardContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
    
    // カードクリックイベント（チャレンジ中の選択用）
    cardContainer.on('pointerdown', () => {
      // チャレンジ中なら選択トグル
      if (this.gameInstance.currentChallenge && !cardContainer.getData('isDragging')) {
        this.toggleCardSelection(cardContainer)
      }
    })

    // カード名
    const cardName = this.add.text(
      0,
      -60,
      card.name,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: '#F9FAFB',
        fontStyle: 'bold',
        wordWrap: { width: 100 }
      }
    ).setOrigin(0.5)
    cardName.setShadow(1, 1, '#000000', 0.5, true, true)

    // パワー表示
    const powerBg = this.add.circle(-40, 60, 20, 0x111827, 0.8)
    const powerText = this.add.text(
      -40,
      60,
      `${card.power}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#10B981',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // コスト表示
    const costBg = this.add.circle(40, 60, 18, 0x111827, 0.8)
    const costText = this.add.text(
      40,
      60,
      `${card.cost}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#F59E0B',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // 年齢ボーナス表示（保険カードの場合）
    let ageBonusIndicator: Phaser.GameObjects.Container | null = null
    if (card.type === 'insurance' && card.ageBonus !== undefined && card.ageBonus > 0) {
      const stage = this.gameInstance.stage
      let currentBonus = 0
      if (stage === 'middle') currentBonus = 0.5
      else if (stage === 'fulfillment') currentBonus = 1.0
      
      if (currentBonus > 0) {
        // 年齢ボーナス背景
        const bonusBg = this.add.circle(0, -60, 12, 0x6366F1, 0.9)
        
        // 年齢ボーナステキスト
        const bonusText = this.add.text(
          0, -60,
          `+${currentBonus}`,
          {
            fontFamily: 'Noto Sans JP',
            fontSize: '12px',
            color: '#FFFFFF',
            fontStyle: 'bold'
          }
        ).setOrigin(0.5)
        
        ageBonusIndicator = this.add.container(0, 0, [bonusBg, bonusText])
        ageBonusIndicator.setAlpha(0.8)
        
        // パルス効果
        this.tweens.add({
          targets: ageBonusIndicator,
          alpha: 1,
          scale: 1.1,
          duration: 1000,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      }
    }

    // 効果的パワー表示（年齢ボーナス適用後）
    let effectivePower = card.power
    if (card.type === 'insurance' && card.ageBonus !== undefined) {
      const stage = this.gameInstance.stage
      let multiplier = 1
      if (stage === 'middle') multiplier = 1.5
      else if (stage === 'fulfillment') multiplier = 2.0
      effectivePower = Math.floor(card.power * multiplier)
    }

    // パワー表示を効果的パワーに更新
    if (effectivePower !== card.power) {
      powerText.setText(`${effectivePower}`)
      powerText.setColor('#A78BFA') // 紫色で年齢ボーナスを表示
      
      // 基本パワーを小さく表示
      const basePowerText = this.add.text(
        -40, 45,
        `(${card.power})`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '12px',
          color: '#9CA3AF',
          fontStyle: 'normal'
        }
      ).setOrigin(0.5)
      
      const cardElements = [graphics, glassBg, cardName, powerBg, powerText, basePowerText, costBg, costText]
      if (ageBonusIndicator) cardElements.push(ageBonusIndicator)
      cardContainer.add(cardElements)
    } else {
      const cardElements = [graphics, glassBg, cardName, powerBg, powerText, costBg, costText]
      if (ageBonusIndicator) cardElements.push(ageBonusIndicator)
      cardContainer.add(cardElements)
    }
    
    cardContainer.setData('card', card)
    cardContainer.setData('selected', false)
    
    // ホバーエフェクト用のグロウ
    const glow = this.add.rectangle(0, 0, 130, 170, 0x818CF8, 0)
    glow.setAlpha(0)
    cardContainer.add(glow)
    cardContainer.sendToBack(glow)
    cardContainer.setData('glow', glow)
    
    // インタラクション設定
    this.setupCardInteraction(cardContainer)
    
    // 新しいドラッグ&ドロップシステムの設定
    if (this.dropZoneIntegration) {
      this.dropZoneIntegration.setupCardDragAndDrop(cardContainer)
    }
    
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
   * カードの色を取得
   */
  private getCardColor(type: CardType): { top: number; bottom: number } {
    switch (type) {
      case 'life':
        return { top: 0x667eea, bottom: 0x764ba2 }  // 紫グラデーション
      case 'insurance':
        return { top: 0x10B981, bottom: 0x059669 }  // 緑グラデーション
      case 'pitfall':
        return { top: 0xEF4444, bottom: 0xDC2626 }  // 赤グラデーション
      case 'dream':
        return { top: 0xFCD34D, bottom: 0xF59E0B }  // 金色グラデーション
      default:
        return { top: 0x6B7280, bottom: 0x4B5563 }  // グレーグラデーション
    }
  }

  /**
   * カードのインタラクションを設定
   */
  private setupCardInteraction(cardContainer: Phaser.GameObjects.Container): void {
    // ドラッグ用の初期位置を保存
    cardContainer.setData('originalX', cardContainer.x)
    cardContainer.setData('originalY', cardContainer.y)
    cardContainer.setData('isDragging', false)
    
    const glow = cardContainer.getData('glow')

    // ドラッグ可能に設定
    this.input.setDraggable(cardContainer)

    // ホバー効果
    cardContainer.on('pointerover', () => {
      if (!cardContainer.getData('selected') && !cardContainer.getData('isDragging')) {
        // スケールアップアニメーション
        this.tweens.add({
          targets: cardContainer,
          scaleX: GAME_CONSTANTS.CARD_HOVER_SCALE,
          scaleY: GAME_CONSTANTS.CARD_HOVER_SCALE,
          duration: 200,
          ease: 'Power2'
        })
        
        // グロウエフェクト
        if (glow) {
          this.tweens.add({
            targets: glow,
            alpha: 0.3,
            duration: 200,
            ease: 'Power2'
          })
        }
      }
    })

    cardContainer.on('pointerout', () => {
      if (!cardContainer.getData('selected') && !cardContainer.getData('isDragging')) {
        // スケールダウンアニメーション
        this.tweens.add({
          targets: cardContainer,
          scaleX: 1,
          scaleY: 1,
          duration: 200,
          ease: 'Power2'
        })
        
        // グロウエフェクト消去
        if (glow) {
          this.tweens.add({
            targets: glow,
            alpha: 0,
            duration: 200,
            ease: 'Power2'
          })
        }
      }
    })

    // クリック（選択）
    cardContainer.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // 右クリックでドラッグ開始を防ぐ
      if (pointer.rightButtonDown()) return
      
      cardContainer.setData('dragStartTime', this.time.now)
      cardContainer.setDepth(1000) // 最前面に表示
    })

    cardContainer.on('pointerup', () => {
      const dragStartTime = cardContainer.getData('dragStartTime')
      const isDragging = cardContainer.getData('isDragging')
      
      // クリック判定（ドラッグしていない場合）
      if (!isDragging && dragStartTime && this.time.now - dragStartTime < 200) {
        this.toggleCardSelection(cardContainer)
      }
      
      cardContainer.setData('isDragging', false)
    })

    // ドラッグ開始
    cardContainer.on('dragstart', () => {
      cardContainer.setData('isDragging', true)
      this.isDragInProgress = true
      
      // 新しいビジュアル効果
      cardContainer.setScale(GAME_CONSTANTS.DRAG_DROP.DRAG_SCALE)
      cardContainer.setAlpha(GAME_CONSTANTS.DRAG_DROP.DRAG_ALPHA)
      
      // ドロップゾーンハイライトを表示
      this.showDropZoneHighlights(cardContainer)
      
      // ドラッグトレイルをクリア
      if (this.dragTrail) {
        this.dragTrail.clear()
      }
      
      // ドラッグ中は選択を解除
      if (cardContainer.getData('selected')) {
        this.toggleCardSelection(cardContainer)
      }
    })

    // ドラッグ中
    cardContainer.on('drag', (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      // モバイル端末でのタッチオフセット調整
      const isMobile = this.scale.orientation === Phaser.Scale.LANDSCAPE || this.scale.orientation === Phaser.Scale.PORTRAIT
      const offsetY = isMobile ? -GAME_CONSTANTS.DRAG_DROP.MOBILE_TOUCH_OFFSET : 0
      
      cardContainer.x = dragX
      cardContainer.y = dragY + offsetY
      
      // ドラッグトレイルを更新
      this.updateDragTrail(cardContainer.x, cardContainer.y)
      
      // マグネティック効果を更新
      const closestZone = this.updateMagneticEffect(cardContainer.x, cardContainer.y)
      
      // マグネティックスナップ
      if (closestZone && this.isValidDropZone(closestZone, cardContainer)) {
        const zone = this.dropZones.get(closestZone)
        if (zone) {
          const distance = Phaser.Math.Distance.Between(cardContainer.x, cardContainer.y, zone.x, zone.y)
          if (distance < GAME_CONSTANTS.DRAG_DROP.SNAP_DISTANCE) {
            // マグネティックスナップアニメーション
            this.tweens.add({
              targets: cardContainer,
              x: zone.x,
              y: zone.y,
              duration: GAME_CONSTANTS.DRAG_DROP.SNAP_DURATION,
              ease: 'Power2.out'
            })
          }
        }
      }
    })

    // ドラッグ終了
    cardContainer.on('dragend', () => {
      this.isDragInProgress = false
      
      // ビジュアル効果をリセット
      cardContainer.setScale(1)
      cardContainer.setAlpha(1)
      
      // ドロップゾーンハイライトを隠す
      this.hideDropZoneHighlights()
      
      // マグネティック効果とドラッグトレイルをクリア
      if (this.magneticEffect) {
        this.magneticEffect.clear()
      }
      if (this.dragTrail) {
        this.dragTrail.clear()
      }
      
      // ドロップ先の判定（新しいgetDropZoneV2を使用）
      const dropZone = this.getDropZoneV2(cardContainer.x, cardContainer.y)
      
      if (dropZone && this.isValidDropZone(dropZone, cardContainer)) {
        // 有効なドロップゾーンにドロップ
        this.handleValidDrop(dropZone, cardContainer)
      } else {
        // 無効なドロップ - 元の位置に戻す（振動効果付き）
        this.handleInvalidDrop(cardContainer)
      }
      
      cardContainer.setDepth(0) // 通常の深度に戻す
    })
  }

  /**
   * カードの選択状態を切り替え
   */
  private toggleCardSelection(cardContainer: Phaser.GameObjects.Container): void {
    // チャレンジ中でない場合は選択できない
    if (!this.gameInstance.currentChallenge) {
      return
    }
    
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
      
      // 選択解除時のアニメーション
      this.tweens.add({
        targets: cardContainer,
        scale: 1,
        duration: 200,
        ease: 'Back.easeOut'
      })
    } else {
      this.selectedCards.add(card.id)
      cardContainer.setData('selected', true)
      
      // 選択時のアニメーション
      this.tweens.add({
        targets: cardContainer,
        scale: 1.1,
        duration: 200,
        ease: 'Back.easeOut'
      })
      
      // ハイライト追加
      const graphics = this.add.graphics()
      graphics.lineStyle(4, 0x00ff00, 1)
      graphics.strokeRoundedRect(-62, -82, 124, 164, 12)
      graphics.setName('highlight')
      cardContainer.addAt(graphics, 0)
      
      // グロウ効果
      this.tweens.add({
        targets: graphics,
        alpha: 0.5,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
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
    this.updateActionButtons()
    
    // 手札のカードを選択可能にする
    this.enableHandCardSelection()
  }

  /**
   * ターン終了
   */
  private endTurn(): void {
    if (!this.gameInstance.isInProgress()) return
    
    // フェーズをチェックして適切に処理
    if (this.gameInstance.phase === 'resolution' || this.gameInstance.phase === 'draw') {
      // ステージ進行チェック
      this.checkStageProgress()
      
      // 次のターンへ
      this.gameInstance.nextTurn()
      
      // 簡素化版：保険は永続効果のため、期限切れ処理は不要
      
      // UI更新（ダーティフラグを設定）
      this.dirtyFlags.vitality = true
      this.dirtyFlags.stage = true  
      this.dirtyFlags.actionButtons = true
      this.updateUI()
      
      // チュートリアル用にゲーム状態を更新
      this.updateGameStateForTutorial()
      
      // ゲーム終了判定
      this.checkGameEnd()
    }
  }

  /**
   * Phase 3-3: 保険カードリストを更新
   */
  private updateInsuranceList(): void {
    if (!this.insuranceListContainer) return

    // 既存のカードアイテムを削除（タイトル以外）
    const itemsToRemove = this.insuranceListContainer.list.filter((item, index) => index > 0)
    itemsToRemove.forEach(item => item.destroy())

    const activeInsurances = this.gameInstance.getActiveInsurances()
    
    if (activeInsurances.length === 0) {
      const noInsuranceText = this.add.text(
        0, 30,
        'なし',
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '14px',
          color: '#999999'
        }
      ).setOrigin(0.5)
      this.insuranceListContainer.add(noInsuranceText)
      return
    }

    // 保険カードをリスト表示
    activeInsurances.forEach((insurance, index) => {
      const yPos = 30 + index * 35

      // カードコンテナ
      const cardItem = this.add.container(0, yPos)

      // Phase 5-2: 期限切れ間近の警告表示
      const isExpiringSoon = insurance.durationType === 'term' && 
                             insurance.remainingTurns !== undefined && 
                             insurance.remainingTurns <= 2
      const isExpiringSoonTwoTurns = isExpiringSoon && insurance.remainingTurns === 2
      const isExpiringSoonOneTurn = isExpiringSoon && insurance.remainingTurns === 1

      // カード背景色の決定
      let bgColor = insurance.durationType === 'whole_life' ? 0xFFD700 : 0xC0C0C0
      let strokeColor = bgColor
      
      if (isExpiringSoonTwoTurns) {
        bgColor = 0xFFA500  // オレンジ色（警告）
        strokeColor = 0xFFA500
      } else if (isExpiringSoonOneTurn) {
        bgColor = 0xFF4444  // 赤色（危険）
        strokeColor = 0xFF4444
      }

      // カード背景
      const itemBg = this.add.rectangle(
        0, 0, 240, 30,
        bgColor,
        0.2
      )
      itemBg.setStrokeStyle(2, strokeColor)

      // Phase 5-2: 期限切れ間近の点滅アニメーション
      if (isExpiringSoon) {
        const animationDuration = isExpiringSoonOneTurn ? 300 : 500  // 1ターン残りは速い点滅
        this.tweens.add({
          targets: itemBg,
          alpha: 0.3,
          duration: animationDuration,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
        itemBg.setFillStyle(bgColor, 0.3)
      }

      // Phase 5-2: 保険種別バッジ（警告状況に応じて色変更）
      let badgeColor = insurance.durationType === 'whole_life' ? 0xFFD700 : 0xC0C0C0
      let textColor = insurance.durationType === 'whole_life' ? '#000000' : '#ffffff'
      
      if (isExpiringSoonTwoTurns) {
        badgeColor = 0xFFA500  // オレンジ色（警告）
        textColor = '#000000'
      } else if (isExpiringSoonOneTurn) {
        badgeColor = 0xFF4444  // 赤色（危険）
        textColor = '#ffffff'
      }

      const typeBadge = this.add.rectangle(
        -100, 0, 40, 20,
        badgeColor
      )
      typeBadge.setStrokeStyle(1, 0xffffff)

      const typeText = this.add.text(
        -100, 0,
        insurance.durationType === 'whole_life' ? '終身' : '定期',
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '10px',
          color: textColor,
          fontStyle: 'bold'
        }
      ).setOrigin(0.5)

      // カード名
      const nameText = this.add.text(
        -50, 0,
        insurance.name.length > 8 ? insurance.name.substring(0, 8) + '...' : insurance.name,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '12px',
          color: '#ffffff'
        }
      ).setOrigin(0, 0.5)

      // Phase 5-2: 年齢ボーナス表示（終身保険のみ）
      if (insurance.durationType === 'whole_life') {
        const stage = this.gameInstance.stage
        let bonus = 0
        if (stage === 'middle') bonus = 0.5
        else if (stage === 'fulfillment') bonus = 1.0
        
        if (bonus > 0) {
          const bonusText = this.add.text(
            50, 0,
            `+${bonus}`,
            {
              fontFamily: 'Noto Sans JP',
              fontSize: '12px',
              color: '#4ade80',
              fontStyle: 'bold'
            }
          ).setOrigin(0.5)
          cardItem.add(bonusText)
        }
      }

      // 残りターン数（定期保険の場合）
      if (insurance.durationType === 'term' && insurance.remainingTurns !== undefined) {
        // 残りターン数に応じた色分け
        let turnsTextColor = '#ffffff'
        if (insurance.remainingTurns === 2) {
          turnsTextColor = '#FFA500'  // オレンジ色（警告）
        } else if (insurance.remainingTurns === 1) {
          turnsTextColor = '#FF4444'  // 赤色（危険）
        }

        const turnsText = this.add.text(
          100, 0,
          `残り${insurance.remainingTurns}T`,
          {
            fontFamily: 'Noto Sans JP',
            fontSize: '12px',
            color: turnsTextColor,
            fontStyle: insurance.remainingTurns <= 2 ? 'bold' : 'normal'
          }
        ).setOrigin(1, 0.5)
        
        // Phase 5-2: 期限切れ間近の警告アイコン（色分け対応）
        if (insurance.remainingTurns <= 2) {
          const warningIconColor = insurance.remainingTurns === 1 ? '#FF4444' : '#FFA500'
          const warningIcon = this.add.text(
            115, 0,
            insurance.remainingTurns === 1 ? '🚨' : '⚠',
            {
              fontFamily: 'Noto Sans JP',
              fontSize: '14px',
              color: warningIconColor
            }
          ).setOrigin(0.5)
          cardItem.add(warningIcon)
        }
        
        cardItem.add(turnsText)
      }

      cardItem.add([itemBg, typeBadge, typeText, nameText])
      this.insuranceListContainer.add(cardItem)

      // 3枚ごとに区切り線
      if ((index + 1) % 3 === 0 && index < activeInsurances.length - 1) {
        const divider = this.add.rectangle(
          0, yPos + 20, 200, 2,
          0xff4444, 0.5
        )
        this.insuranceListContainer.add(divider)
      }
    })

    // 負担発生の警告
    if (activeInsurances.length >= 3) {
      const warningText = this.add.text(
        0, 30 + activeInsurances.length * 35 + 10,
        `⚠ ${Math.floor(activeInsurances.length / 3)}ポイント負担中`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '14px',
          color: '#ff4444',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5)
      this.insuranceListContainer.add(warningText)
    }
  }

  /**
   * Phase 3-3: 保険料負担インジケーターを更新
   */
  private updateBurdenIndicator(): void {
    if (!this.burdenIndicatorContainer) return

    const burdenText = this.burdenIndicatorContainer.getByName('burden-value') as Phaser.GameObjects.Text
    if (!burdenText) return

    const burden = this.gameInstance.insuranceBurden
    const previousBurden = parseInt(burdenText.text === '負担なし' ? '0' : burdenText.text)

    // 負担値を更新
    burdenText.setText(burden === 0 ? '負担なし' : `${burden}`)
    burdenText.setColor(burden === 0 ? '#00ff00' : '#ff4444')

    // 負担が増えた場合は警告アニメーション
    if (burden < previousBurden) { // 負の値なので逆
      this.tweens.add({
        targets: this.burdenIndicatorContainer,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 200,
        yoyo: true,
        ease: 'Power2',
        onComplete: () => {
          // 赤く点滅
          const bg = this.burdenIndicatorContainer?.list[0] as Phaser.GameObjects.Rectangle
          if (bg) {
            bg.setFillStyle(0xff0000, 0.8)
            this.time.delayedCall(300, () => {
              bg.setFillStyle(0x000000, 0.7)
            })
          }
        }
      })
    }
  }

  /**
   * UI更新（最適化版）
   */
  private updateUI(): void {
    // ダーティフラグをチェックして必要な部分のみ更新
    if (this.dirtyFlags.vitality) {
      this.updateVitalityDisplay()
      this.dirtyFlags.vitality = false
    }

    if (this.dirtyFlags.stage) {
      this.updateStageDisplay() 
      this.dirtyFlags.stage = false
    }

    if (this.dirtyFlags.deck) {
      this.updateDeckDisplay()
      this.dirtyFlags.deck = false
    }

    if (this.dirtyFlags.insurance) {
      this.updateInsuranceList()
      this.dirtyFlags.insurance = false
    }

    if (this.dirtyFlags.burden) {
      this.updateBurdenIndicator()
      this.dirtyFlags.burden = false
    }

    if (this.dirtyFlags.hand) {
      this.arrangeHand()
      this.dirtyFlags.hand = false
    }

    if (this.dirtyFlags.actionButtons) {
      this.updateActionButtons()
      this.dirtyFlags.actionButtons = false
    }

    if (this.dirtyFlags.challenge) {
      this.updateChallengeUI()
      this.dirtyFlags.challenge = false
    }
  }

  /**
   * 活力表示を更新
   */
  private updateVitalityDisplay(): void {
    const currentTime = this.time.now
    
    // スロットリング: 100ms以内の更新は無視
    if (currentTime - this.updateThrottleTimers.vitality < 100) {
      return
    }
    this.updateThrottleTimers.vitality = currentTime

    const vitalityText = this.children.getByName('vitality-text') as Phaser.GameObjects.Text
    if (vitalityText) {
      const stageLabel = this.getStageDisplayText()
      vitalityText.setText(`活力: ${this.gameInstance.vitality} / ${this.gameInstance.maxVitality} (${stageLabel})`)
    }

    this.updateVitalityBar()
  }

  /**
   * ステージ表示を更新  
   */
  private updateStageDisplay(): void {
    const turnText = this.children.getByName('turn-text') as Phaser.GameObjects.Text
    if (turnText) {
      turnText.setText(`ターン: ${this.gameInstance.turn}`)
    }
    
    const stageText = this.children.getByName('stage-text') as Phaser.GameObjects.Text
    if (stageText) {
      stageText.setText(this.getStageDisplayText())
    }
  }

  /**
   * デッキ表示を更新
   */
  private updateDeckDisplay(): void {
    const deckCount = this.children.getByName('deck-count') as Phaser.GameObjects.Text
    if (deckCount) {
      deckCount.setText(`${this.gameInstance.playerDeck.size()}`)
    }
  }

  /**
   * 活力バーを更新
   */
  private updateVitalityBar(): void {
    if (!this.vitalityBar || !this.vitalityBarContainer) return

    const oldVitality = this.vitalityBar.getData('currentVitality') || this.gameInstance.vitality
    const newVitality = this.gameInstance.vitality
    const vitalityPercentage = newVitality / this.gameInstance.maxVitality
    const targetWidth = Math.max(0, this.vitalityBarMaxWidth * vitalityPercentage)
    const newColor = this.getVitalityBarColor(vitalityPercentage)

    // 数値カウントアップアニメーション
    const counter = { value: oldVitality }
    this.tweens.add({
      targets: counter,
      value: newVitality,
      duration: 800,
      ease: 'Cubic.out',
      onUpdate: () => {
        const vitalityText = this.children.getByName('vitality-text') as Phaser.GameObjects.Text
        if (vitalityText) {
          const stageLabel = this.getStageDisplayText()
          vitalityText.setText(`活力: ${Math.floor(counter.value)} / ${this.gameInstance.maxVitality} (${stageLabel})`)
        }
      }
    })

    // バーのアニメーション（より滑らか）
    this.tweens.add({
      targets: this.vitalityBar,
      width: targetWidth,
      duration: 800,
      ease: 'Cubic.out',
      onUpdate: () => {
        // 現在の割合に基づいて色を動的に更新
        const currentPercentage = this.vitalityBar!.width / this.vitalityBarMaxWidth
        const currentColor = this.getVitalityBarColor(currentPercentage)
        this.vitalityBar?.setFillStyle(currentColor)
      },
      onComplete: () => {
        // 最終的な色を設定
        this.vitalityBar?.setFillStyle(newColor)
      }
    })

    // バイタリティが減った場合のパルスエフェクト
    if (newVitality < oldVitality) {
      this.tweens.add({
        targets: this.vitalityBarContainer,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Power2',
        yoyo: true,
        repeat: 1
      })
    }
    
    // バイタリティが増えた場合のグローエフェクト
    if (newVitality > oldVitality) {
      const glow = this.add.rectangle(0, 0, this.vitalityBarMaxWidth + 20, 30, 0x10B981, 0.5)
      glow.setAlpha(0)
      this.vitalityBarContainer.add(glow)
      
      this.tweens.add({
        targets: glow,
        alpha: 0.6,
        duration: 200,
        ease: 'Power2',
        yoyo: true,
        repeat: 1,
        onComplete: () => glow.destroy()
      })
    }

    // 現在値を保存
    this.vitalityBar.setData('currentVitality', newVitality)
  }

  /**
   * パワー表示を更新
   */
  private updatePowerDisplay(): void {
    const powerDisplay = this.children.getByName('power-display') as Phaser.GameObjects.Container
    if (!powerDisplay) return

    // Phase 3-3: 詳細なパワー計算
    const selectedCardsArray = this.handCards
      .filter(cardContainer => this.selectedCards.has(cardContainer.getData('card').id))
      .map(cardContainer => cardContainer.getData('card') as Card)
    
    const powerBreakdown = this.gameInstance.calculateTotalPower(selectedCardsArray)
    
    // 既存のテキストを削除
    const textsToRemove = powerDisplay.list.filter(item => 
      item instanceof Phaser.GameObjects.Text && item.name !== 'power-text' && item.name !== 'count-text'
    )
    textsToRemove.forEach(text => text.destroy())
    
    const powerText = powerDisplay.getByName('power-text') as Phaser.GameObjects.Text
    const countText = powerDisplay.getByName('count-text') as Phaser.GameObjects.Text
    
    if (powerText) {
      powerText.setText(`合計パワー: ${powerBreakdown.total}`)
      powerText.setColor(powerBreakdown.total > 0 ? '#00ff00' : '#ff4444')
    }
    if (countText) {
      countText.setText(`選択カード: ${this.selectedCards.size}枚`)
    }

    // Phase 3-3: パワーの内訳を表示
    let yOffset = 40
    
    // 基本パワー
    if (powerBreakdown.base > 0) {
      const baseText = this.add.text(
        0, yOffset,
        `基本: +${powerBreakdown.base}`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '14px',
          color: '#ffffff'
        }
      ).setOrigin(0.5)
      powerDisplay.add(baseText)
      yOffset += 20
    }

    // 保険ボーナス
    if (powerBreakdown.insurance > 0) {
      const insuranceText = this.add.text(
        0, yOffset,
        `保険: +${powerBreakdown.insurance}`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '14px',
          color: '#4ade80'
        }
      ).setOrigin(0.5)
      powerDisplay.add(insuranceText)
      yOffset += 20
    }

    // 保険料負担
    if (powerBreakdown.burden < 0) {
      const burdenText = this.add.text(
        0, yOffset,
        `負担: ${powerBreakdown.burden}`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '14px',
          color: '#ff4444',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5)
      powerDisplay.add(burdenText)
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
    
    // 新しいDropZoneシステムで捕て札ゾーンは実装済み
    
    return null
  }

  /**
   * 改良版ドロップゾーン判定 - 新しいドロップゾーンシステムに対応
   */
  private getDropZoneV2(x: number, y: number): string | null {
    let closestZone: string | null = null
    let minDistance = GAME_CONSTANTS.DRAG_DROP.SNAP_DISTANCE
    
    this.dropZones.forEach((zone, zoneName) => {
      const distance = Phaser.Math.Distance.Between(x, y, zone.x, zone.y)
      if (distance < minDistance) {
        minDistance = distance
        closestZone = zoneName
      }
    })
    
    return closestZone
  }

  /**
   * 有効なドロップ処理
   */
  private handleValidDrop(zoneName: string, cardContainer: Phaser.GameObjects.Container): void {
    const zone = this.dropZones.get(zoneName)
    if (!zone) return
    
    // バウンス効果付きでドロップゾーンに移動
    this.tweens.add({
      targets: cardContainer,
      x: zone.x,
      y: zone.y,
      scaleX: GAME_CONSTANTS.DRAG_DROP.DROP_ZONE_SCALE,
      scaleY: GAME_CONSTANTS.DRAG_DROP.DROP_ZONE_SCALE,
      duration: GAME_CONSTANTS.DRAG_DROP.BOUNCE_DURATION / 2,
      ease: 'Back.out',
      onComplete: () => {
        // スケールを元に戻す
        this.tweens.add({
          targets: cardContainer,
          scaleX: 1,
          scaleY: 1,
          duration: GAME_CONSTANTS.DRAG_DROP.BOUNCE_DURATION / 2,
          ease: 'Elastic.out'
        })
      }
    })
    
    // 成功エフェクト
    this.showDropSuccessEffect(zone.x, zone.y)
    
    // ゾーン別の処理
    switch (zoneName) {
      case 'challenge':
        this.handleCardDropToChallenge(cardContainer)
        break
      case 'discard':
        this.handleCardDropToDiscard(cardContainer)
        break
      default:
        console.warn(`Unknown drop zone: ${zoneName}`)
    }
  }

  /**
   * 無効なドロップ処理
   */
  private handleInvalidDrop(cardContainer: Phaser.GameObjects.Container): void {
    // 振動効果
    const originalX = cardContainer.getData('originalX')
    const originalY = cardContainer.getData('originalY')
    
    // まず振動
    this.tweens.add({
      targets: cardContainer,
      x: cardContainer.x + 10,
      duration: GAME_CONSTANTS.DRAG_DROP.VIBRATION_DURATION / 6,
      ease: 'Power2',
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        // 振動後、元の位置に戻る
        this.tweens.add({
          targets: cardContainer,
          x: originalX,
          y: originalY,
          duration: GAME_CONSTANTS.CARD_MOVE_DURATION,
          ease: 'Back.out'
        })
      }
    })
    
    // 失敗エフェクト
    this.showDropFailureEffect(cardContainer.x, cardContainer.y)
  }

  /**
   * ドロップ成功エフェクト
   */
  private showDropSuccessEffect(x: number, y: number): void {
    // 成功時のパーティクル効果（緑色の輝き）
    const effect = this.add.graphics()
    effect.setPosition(x, y)
    effect.setDepth(1100)
    
    // 円形の輝きを描画
    effect.fillStyle(GAME_CONSTANTS.COLORS.DROP_ZONE_VALID, 0.8)
    effect.fillCircle(0, 0, 20)
    
    // 拡大しながらフェードアウト
    this.tweens.add({
      targets: effect,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 500,
      ease: 'Power2.out',
      onComplete: () => {
        effect.destroy()
      }
    })
    
    // 複数の小さな輝きを散らす
    for (let i = 0; i < 6; i++) {
      const spark = this.add.graphics()
      spark.setPosition(x, y)
      spark.setDepth(1100)
      spark.fillStyle(GAME_CONSTANTS.COLORS.DROP_ZONE_VALID, 0.6)
      spark.fillCircle(0, 0, 5)
      
      const angle = (i / 6) * Math.PI * 2
      const distance = 50
      
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 600,
        ease: 'Power2.out',
        onComplete: () => {
          spark.destroy()
        }
      })
    }
  }

  /**
   * ドロップ失敗エフェクト
   */
  private showDropFailureEffect(x: number, y: number): void {
    // 失敗時のX印エフェクト
    const effect = this.add.graphics()
    effect.setPosition(x, y)
    effect.setDepth(1100)
    
    // X印を描画
    effect.lineStyle(4, GAME_CONSTANTS.COLORS.DROP_ZONE_INVALID, 0.8)
    effect.beginPath()
    effect.moveTo(-15, -15)
    effect.lineTo(15, 15)
    effect.moveTo(15, -15)
    effect.lineTo(-15, 15)
    effect.strokePath()
    
    // 振動しながらフェードアウト
    this.tweens.add({
      targets: effect,
      x: x + 5,
      duration: 100,
      ease: 'Power2',
      yoyo: true,
      repeat: 3,
    })
    
    this.tweens.add({
      targets: effect,
      alpha: 0,
      duration: 800,
      ease: 'Power2.out',
      onComplete: () => {
        effect.destroy()
      }
    })
  }

  /**
   * 捨て札エリアへのドロップ処理
   */
  private handleCardDropToDiscard(cardContainer: Phaser.GameObjects.Container): void {
    const card = cardContainer.getData('card') as Card
    
    // カードを捨て札に移動
    this.gameInstance.discardCard(card.id)
    
    // 手札からカードを削除
    const cardIndex = this.handCards.indexOf(cardContainer)
    if (cardIndex > -1) {
      this.handCards.splice(cardIndex, 1)
      cardContainer.destroy()
    }
    
    // 手札を再配置
    this.arrangeHand()
    
    // UI更新（ダーティフラグを設定）
    this.dirtyFlags.vitality = true
    this.dirtyFlags.insurance = true
    this.dirtyFlags.burden = true
    this.updateUI()
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

    const bg = this.add.rectangle(0, 0, 200, 140, 0x000000, 0.8)
    
    const selectedPower = this.calculateSelectedPower()
    const text = this.add.text(
      0,
      -50,
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
      -20,
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

    // 初回表示時にパワーの内訳を更新
    this.updatePowerDisplay()

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
    
    // チュートリアル用にゲーム状態を更新
    const gameState = (window as Window & { __gameState?: Record<string, unknown> }).__gameState || {}
    gameState.lastChallengeResult = result
    this.updateGameStateForTutorial()
    
    // 結果表示
    this.showChallengeResult(result)
    
    // カード選択フェーズかチェック
    if (result.success && result.cardChoices) {
      // Phase 2: 保険種別選択UIを先に表示
      this.time.delayedCall(2000, () => {
        this.showInsuranceTypeSelection()
      })
    } else {
      // 失敗時または選択肢がない場合は、UIをクリーンアップして通常フローに戻す
      this.time.delayedCall(2000, () => {
        this.cleanupChallengeUI()
        this.updateActionButtons()
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
    
    // 手札の選択状態をクリア
    this.clearHandSelection()

    // UI更新（ダーティフラグを設定）
    this.dirtyFlags.vitality = true
    this.dirtyFlags.insurance = true
    this.dirtyFlags.burden = true
    this.dirtyFlags.hand = true
    this.dirtyFlags.actionButtons = true
    this.updateUI()
  }

  /**
   * チャレンジ結果を表示
   */
  private showChallengeResult(result: ChallengeResult): void {
    const resultContainer = this.add.container(this.centerX, this.centerY)
    
    const bg = this.add.rectangle(0, 0, 500, 300, 0x000000, 0.9)
    
    const titleText = this.add.text(
      0,
      -100,
      result.success ? 'チャレンジ成功！' : 'チャレンジ失敗...',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '28px',
        color: result.success ? '#00FF00' : '#FF0000',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    
    // Phase 3-3: パワー計算の内訳を表示
    let detailContent = `チャレンジパワー: ${result.challengePower}\n\n`
    
    if (result.powerBreakdown) {
      detailContent += 'あなたのパワー内訳:\n'
      if (result.powerBreakdown.base > 0) {
        detailContent += `  基本パワー: +${result.powerBreakdown.base}\n`
      }
      if (result.powerBreakdown.insurance > 0) {
        detailContent += `  保険ボーナス: +${result.powerBreakdown.insurance}\n`
      }
      if (result.powerBreakdown.burden < 0) {
        detailContent += `  保険料負担: ${result.powerBreakdown.burden}\n`
      }
      detailContent += `  合計: ${result.powerBreakdown.total}\n\n`
    } else {
      detailContent += `あなたのパワー: ${result.playerPower}\n\n`
    }
    
    detailContent += `活力変化: ${result.vitalityChange > 0 ? '+' : ''}${result.vitalityChange}`
    
    const detailText = this.add.text(
      0,
      -20,
      detailContent,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 5
      }
    ).setOrigin(0.5)

    // Phase 3-3: 保険料負担が勝敗に影響した場合の特別メッセージ
    if (!result.success && result.powerBreakdown && result.powerBreakdown.burden < 0) {
      const withoutBurden = result.powerBreakdown.base + result.powerBreakdown.insurance
      if (withoutBurden >= result.challengePower) {
        const burdenImpactText = this.add.text(
          0,
          90,
          '⚠ 保険料負担により敗北しました',
          {
            fontFamily: 'Noto Sans JP',
            fontSize: '14px',
            color: '#ff9999',
            fontStyle: 'bold'
          }
        ).setOrigin(0.5)
        resultContainer.add(burdenImpactText)
      }
    }
    
    const closeButton = this.createButton(
      0,
      120,
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
    const currentStage = this.gameInstance.stage
    const stageName = AGE_PARAMETERS[currentStage].label
    
    const turnsInStage = this.getTurnsInCurrentStage()
    const maxTurns = GAME_CONSTANTS.STAGE_TURNS[currentStage]
    
    return `${stageName} (${turnsInStage}/${maxTurns})`
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
      const previousMaxVitality = this.gameInstance.maxVitality
      this.gameInstance.advanceStage()
      this.showStageTransition('中年期', previousMaxVitality, this.gameInstance.maxVitality)
      this.updateChallengeDeck()
    } else if (stage === 'middle' && 
               turn >= GAME_CONSTANTS.STAGE_TURNS.youth + GAME_CONSTANTS.STAGE_TURNS.middle) {
      const previousMaxVitality = this.gameInstance.maxVitality
      this.gameInstance.advanceStage()
      this.showStageTransition('充実期', previousMaxVitality, this.gameInstance.maxVitality)
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
  private showStageTransition(stageName: string, previousMaxVitality: number, newMaxVitality: number): void {
    const transitionContainer = this.add.container(this.centerX, this.centerY)
    
    const bg = this.add.rectangle(0, 0, this.gameWidth, this.gameHeight, 0x000000, 0.8)
    
    const text = this.add.text(
      0,
      -80,
      `${stageName}へ突入！`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    
    // 体力減少メッセージ
    const vitalityChangeText = this.add.text(
      0,
      -20,
      `体力が衰えました (最大値: ${previousMaxVitality} → ${newMaxVitality})`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ff9999'
      }
    ).setOrigin(0.5)
    
    // Phase 5-1: 保険見直し推奨メッセージ
    const reviewRecommendation = this.getInsuranceReviewRecommendation(stageName)
    const reviewText = this.add.text(
      0,
      40,
      reviewRecommendation,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#00ff00',
        align: 'center'
      }
    ).setOrigin(0.5)

    // Phase 5-1: 保険見直しボタン
    const reviewButton = this.createButton(
      0,
      100,
      '保険を見直す',
      () => {
        this.showInsuranceReviewDialog()
        transitionContainer.destroy()
      },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff'
      }
    )

    const skipButton = this.createButton(
      0,
      150,
      'あとで見直す',
      () => {
        this.tweens.add({
          targets: transitionContainer,
          alpha: 0,
          duration: 500,
          onComplete: () => transitionContainer.destroy()
        })
      },
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#cccccc'
      }
    )
    
    transitionContainer.add([bg, text, vitalityChangeText, reviewText, reviewButton, skipButton])
    transitionContainer.setAlpha(0)
    
    // フェードインと同時にテキストアニメーション
    this.tweens.add({
      targets: transitionContainer,
      alpha: 1,
      duration: 500
    })
    
    // タイトルテキストにスケールアニメーション
    text.setScale(0)
    this.tweens.add({
      targets: text,
      scale: 1,
      duration: 800,
      delay: 200,
      ease: 'Back.easeOut'
    })
    
    // 活力変化テキストにフェードイン
    vitalityChangeText.setAlpha(0)
    this.tweens.add({
      targets: vitalityChangeText,
      alpha: 1,
      duration: 600,
      delay: 500
    })
    
    // パーティクルエフェクト（星とか光の粒子）
    for (let i = 0; i < 20; i++) {
      const particle = this.add.circle(
        Phaser.Math.Between(-200, 200),
        Phaser.Math.Between(-150, 150),
        Phaser.Math.Between(2, 6),
        0xFFD700,
        0.8
      )
      transitionContainer.add(particle)
      
      // パーティクルのアニメーション
      this.tweens.add({
        targets: particle,
        alpha: 0,
        scale: 1.5,
        duration: 2000,
        delay: Phaser.Math.Between(0, 1000),
        ease: 'Power2'
      })
    }
    
    // ステージ表示を更新
    const stageText = this.children.getByName('stage-text') as Phaser.GameObjects.Text
    if (stageText) {
      stageText.setText(this.getStageDisplayText())
    }
    
    // 人生段階インジケーターを更新
    this.updateLifeStageIndicator()
    
    // 活力バーの最大値変更をアニメーション
    this.animateMaxVitalityChange()
  }

  /**
   * Phase 5-1: 保険見直し推奨メッセージを取得
   */
  private getInsuranceReviewRecommendation(stageName: string): string {
    if (stageName === '中年期') {
      return '📌 保険見直しの機会\n定期保険から終身保険への変更を検討しましょう'
    } else if (stageName === '充実期') {
      return '📌 総合的な保険見直し\n終身保険の価値が大幅に上昇します！'
    }
    return ''
  }

  /**
   * Phase 5-1: 保険見直しダイアログを表示
   */
  private showInsuranceReviewDialog(): void {
    // 保険見直し機能は将来のリリースで実装予定
    this.showNotification('保険見直し機能は開発中です', 'info')
  }

  /**
   * Phase 5-1: 期限切れ間近の保険をチェック
   * DISABLED: 保険更新システムが削除されたため無効化
   */
  private checkExpiringInsurances(): void {
    // 保険更新システムが削除されたため、この機能は無効化
    return
  }

  /**
   * Phase 5-1: 期限切れ間近の保険警告を表示
   */
  private showExpiringInsuranceWarning(insurance: Card): void {
    const warningContainer = this.add.container(this.centerX, 300)
    warningContainer.setDepth(2000)

    const bg = this.add.rectangle(0, 0, 400, 120, 0xff4444, 0.95)
    bg.setStrokeStyle(3, 0xffffff)

    const iconText = this.add.text(
      -170, 0,
      '⚠',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '48px',
        color: '#ffffff'
      }
    ).setOrigin(0.5)

    const messageText = this.add.text(
      20, -20,
      `${insurance.name}が\nあと${insurance.remainingTurns}ターンで期限切れです！`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    const actionText = this.add.text(
      20, 20,
      '更新または終身保険への切り替えを検討しましょう',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: '#ffcccc'
      }
    ).setOrigin(0.5)

    warningContainer.add([bg, iconText, messageText, actionText])
    warningContainer.setScale(0)
    warningContainer.setAlpha(0)

    // 警告アニメーション
    this.tweens.add({
      targets: warningContainer,
      scale: 1.1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // パルスエフェクト
        this.tweens.add({
          targets: warningContainer,
          scale: 1,
          duration: 800,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.easeInOut'
        })

        // 自動で消える
        this.time.delayedCall(5000, () => {
          this.tweens.add({
            targets: warningContainer,
            scale: 0.8,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => warningContainer.destroy()
          })
        })
      }
    })
  }

  /**
   * 保険期限切れ警告システム - 改良版
   * getPendingRenewalInsurances()と連携し、残り1-2ターンの保険に対応
   */
  private showInsuranceExpirationWarning(renewal: InsuranceRenewalOption): void {
    const remainingTurns = renewal.remainingTurns
    // renewalOptionから保険情報を取得（cardNameを使用）
    const insuranceName = renewal.cardName
    
    // 警告レベルに応じた色とメッセージを決定
    let warningColor = 0xFFA500  // デフォルト：オレンジ（警告）
    let iconEmoji = '⚠'
    let urgencyText = ''
    
    if (remainingTurns === 1) {
      warningColor = 0xFF4444  // 赤色（危険）
      iconEmoji = '🚨'
      urgencyText = '緊急！'
    } else if (remainingTurns === 2) {
      warningColor = 0xFFA500  // オレンジ色（警告）
      iconEmoji = '⚠'
      urgencyText = '警告：'
    }

    const warningContainer = this.add.container(this.centerX, 350)
    warningContainer.setDepth(2000)

    const bg = this.add.rectangle(0, 0, 450, 130, warningColor, 0.95)
    bg.setStrokeStyle(3, 0xffffff)

    const iconText = this.add.text(
      -190, 0,
      iconEmoji,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '48px',
        color: '#ffffff'
      }
    ).setOrigin(0.5)

    const messageText = this.add.text(
      20, -25,
      `${urgencyText} ${insuranceName}が\n残り${remainingTurns}ターンで期限切れです`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center'
      }
    ).setOrigin(0.5)

    const actionText = this.add.text(
      20, 25,
      '更新手続きまたは終身保険への切り替えをご検討ください',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: '#ffcccc'
      }
    ).setOrigin(0.5)

    warningContainer.add([bg, iconText, messageText, actionText])
    warningContainer.setScale(0)
    warningContainer.setAlpha(0)

    // 警告アニメーション（緊急度に応じた速度）
    const animationDuration = remainingTurns === 1 ? 200 : 300
    this.tweens.add({
      targets: warningContainer,
      scale: 1.1,
      alpha: 1,
      duration: animationDuration,
      ease: 'Back.easeOut',
      onComplete: () => {
        // パルスエフェクト（緊急度に応じた回数）
        const pulseRepeats = remainingTurns === 1 ? 4 : 2
        this.tweens.add({
          targets: warningContainer,
          scale: 1,
          duration: remainingTurns === 1 ? 400 : 600,
          yoyo: true,
          repeat: pulseRepeats,
          ease: 'Sine.easeInOut'
        })

        // 自動で消える（緊急度に応じた表示時間）
        const displayTime = remainingTurns === 1 ? 7000 : 5000
        this.time.delayedCall(displayTime, () => {
          this.tweens.add({
            targets: warningContainer,
            scale: 0.8,
            alpha: 0,
            duration: 500,
            ease: 'Power2',
            onComplete: () => warningContainer.destroy()
          })
        })
      }
    })
  }

  /**
   * 最大活力変更時のアニメーション
   */
  private animateMaxVitalityChange(): void {
    if (!this.vitalityBarContainer) return

    // 最大値マーカーを点滅させる
    const maxMarker = this.vitalityBarContainer.list[2] as Phaser.GameObjects.Rectangle
    if (maxMarker) {
      this.tweens.add({
        targets: maxMarker,
        alpha: 0.3,
        duration: 300,
        yoyo: true,
        repeat: 3,
        ease: 'Power2'
      })
    }

    // 活力バーコンテナを揺らす
    this.tweens.add({
      targets: this.vitalityBarContainer,
      y: this.vitalityBarContainer.y - 5,
      duration: 100,
      yoyo: true,
      repeat: 2,
      ease: 'Power2'
    })

    // UI を更新（ダーティフラグを設定）
    this.dirtyFlags.vitality = true
    this.dirtyFlags.insurance = true
    this.dirtyFlags.burden = true
    this.updateUI()
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
   * 保険種別選択UIを表示（Phase 2）
   */
  private showInsuranceTypeSelection(): void {
    // 既存の保険種別選択UIがあれば削除
    if (this.insuranceTypeSelectionUI) {
      this.insuranceTypeSelectionUI.destroy()
    }

    // 保険種別選択コンテナを作成
    this.insuranceTypeSelectionUI = this.add.container(this.centerX, this.centerY)
    this.insuranceTypeSelectionUI.setDepth(2000)

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
      '保険種別を選択してください',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // 年齢に応じた推奨テキスト
    const recommendationText = this.getInsuranceRecommendation()
    const recommendText = this.add.text(
      0, -140,
      recommendationText,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#00ff00'
      }
    ).setOrigin(0.5)

    this.insuranceTypeSelectionUI.add([overlay, titleText, recommendText])

    // 終身保険選択ボタン
    this.createInsuranceTypeButton(
      -180, 0,
      '終身保険',
      '一生涯の保障\n高コスト・高効果',
      0xFFD700, // 金色
      'whole_life'
    )

    // 定期保険選択ボタン
    this.createInsuranceTypeButton(
      180, 0,
      '定期保険',
      '10ターンの保障\n低コスト・標準効果',
      0xC0C0C0, // 銀色
      'term'
    )

    // ボタンのスタガーアニメーション設定
    const buttons = this.insuranceTypeSelectionUI.list.filter(child => 
      child instanceof Phaser.GameObjects.Container && child !== overlay
    )
    
    buttons.forEach((button) => {
      if (button instanceof Phaser.GameObjects.Container) {
        button.setScale(0)
        button.setAlpha(0)
      }
    })

    // フェードイン
    this.insuranceTypeSelectionUI.setAlpha(0)
    this.tweens.add({
      targets: this.insuranceTypeSelectionUI,
      alpha: 1,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // ボタンを順番に表示
        buttons.forEach((button, index) => {
          if (button instanceof Phaser.GameObjects.Container) {
            this.time.delayedCall(index * 200, () => {
              this.tweens.add({
                targets: button,
                scale: 1,
                alpha: 1,
                duration: 500,
                ease: 'Back.easeOut'
              })
            })
          }
        })
      }
    })
  }

  /**
   * 保険種別選択ボタンを作成
   */
  private createInsuranceTypeButton(
    x: number,
    y: number,
    title: string,
    description: string,
    color: number,
    insuranceType: 'whole_life' | 'term'
  ): void {
    if (!this.insuranceTypeSelectionUI) return

    const buttonContainer = this.add.container(x, y)

    // カード風の背景
    const cardBg = this.add.rectangle(0, 0, 300, 400, 0x2C3E50)
    cardBg.setStrokeStyle(4, color)
    cardBg.setInteractive()
    
    // 光彩エフェクト（終身保険のみ）
    if (insuranceType === 'whole_life') {
      const glow = this.add.rectangle(0, 0, 310, 410, color, 0.2)
      glow.setAlpha(0.5)
      buttonContainer.addAt(glow, 0)
      
      // パルスエフェクト
      this.tweens.add({
        targets: glow,
        alpha: 0.2,
        scale: 1.05,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    // タイトル背景
    const titleBg = this.add.rectangle(0, -150, 280, 60, color)

    // タイトルテキスト
    const titleText = this.add.text(
      0, -150,
      title,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '28px',
        color: '#000000',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // 説明テキスト
    const descText = this.add.text(
      0, -50,
      description,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 10
      }
    ).setOrigin(0.5)

    // 特徴アイコンと説明
    const features = insuranceType === 'whole_life' 
      ? ['永続的な保障', 'パワー +2', 'コスト +2']
      : ['期間限定保障', '標準パワー', '標準コスト']

    features.forEach((feature, index) => {
      const featureText = this.add.text(
        0, 50 + index * 30,
        `• ${feature}`,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '16px',
          color: '#cccccc'
        }
      ).setOrigin(0.5)
      buttonContainer.add(featureText)
    })

    // Phase 5-1: 詳細な推奨理由を追加
    const detailBg = this.add.rectangle(0, 280, 280, 80, 0x000000, 0.5)
    detailBg.setStrokeStyle(1, 0x666666)
    
    const detailText = this.add.text(
      0, 280,
      this.getDetailedInsuranceRecommendation(insuranceType),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '12px',
        color: '#aaaaaa',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: 260 }
      }
    ).setOrigin(0.5)
    
    buttonContainer.add([detailBg, detailText])

    // 選択ボタン
    const selectButton = this.createButton(
      0, 160,
      '選択する',
      () => this.onInsuranceTypeSelected(insuranceType),
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: '#ffffff'
      }
    )

    // ホバー効果
    cardBg.on('pointerover', () => {
      buttonContainer.setScale(1.05)
      cardBg.setFillStyle(0x34495E)
      this.tweens.add({
        targets: buttonContainer,
        y: y - 10,
        duration: 200,
        ease: 'Power2'
      })
    })

    cardBg.on('pointerout', () => {
      buttonContainer.setScale(1)
      cardBg.setFillStyle(0x2C3E50)
      this.tweens.add({
        targets: buttonContainer,
        y: y,
        duration: 200,
        ease: 'Power2'
      })
    })

    // クリックで選択
    cardBg.on('pointerdown', () => {
      this.onInsuranceTypeSelected(insuranceType)
    })

    buttonContainer.add([cardBg, titleBg, titleText, descText, selectButton])
    this.insuranceTypeSelectionUI.add(buttonContainer)
  }

  /**
   * 年齢に応じた保険推奨を取得
   */
  private getInsuranceRecommendation(): string {
    const stage = this.gameInstance.stage
    
    switch (stage) {
      case 'youth':
        return '💡 青年期は定期保険がおすすめ - コストを抑えて活力に投資'
      case 'middle':
        return '💡 中年期は終身保険も検討 - 将来への備えを強化'
      case 'fulfillment':
        return '💡 充実期は終身保険が有利 - 年齢ボーナスで効果最大化'
      default:
        return '保険種別を選んでください'
    }
  }

  /**
   * 年齢に応じた詳細な保険推奨理由を取得
   */
  private getDetailedInsuranceRecommendation(insuranceType: 'whole_life' | 'term'): string {
    const stage = this.gameInstance.stage
    
    if (insuranceType === 'whole_life') {
      switch (stage) {
        case 'youth':
          return '終身保険は高コストですが、結婚や学資など\n人生の基盤となる保障には適しています。\n長期的な視点で選択しましょう。'
        case 'middle':
          return '中年期の終身保険は+0.5ボーナス付き。\n残りの人生を考えると、今が終身保険への\n切り替えを検討する良いタイミングです。'
        case 'fulfillment':
          return '充実期の終身保険は+1.0ボーナス！\n年齢による価値上昇を最大限活用できます。\n安定した老後の基盤作りに最適です。'
        default:
          return '永続的な保障を提供します。'
      }
    } else {
      switch (stage) {
        case 'youth':
          return '定期保険は低コストで効率的な選択です。\n若い時期は変化も多いため、柔軟に\n見直せる定期保険が有利です。'
        case 'middle':
          return '定期保険は期限があるため要注意。\n10ターン後の更新時にはコストが上がります。\n長期的な保障は終身への切り替えも検討を。'
        case 'fulfillment':
          return '充実期では終身保険のボーナスが大きいため、\n定期保険の相対的価値は下がります。\n一時的な保障のみに使用を推奨します。'
        default:
          return '10ターンの期間限定保障です。'
      }
    }
  }

  /**
   * Phase 5-1: 年齢による難易度調整の表示を取得
   */
  private getAgeAdjustmentDisplay(challengeCard: Card): Phaser.GameObjects.Container | null {
    // challengeCategoryが定義されていない場合は何も表示しない
    if (!challengeCard.challengeCategory) return null

    const stage = this.gameInstance.stage
    let adjustment = 0
    let color = 0xffffff
    let icon = ''

    // カテゴリに応じて調整値を計算
    if (challengeCard.challengeCategory === 'physical') {
      // 体力系: 年齢とともに難しくなる
      if (stage === 'middle') {
        adjustment = 3
        color = 0xff9999
        icon = '↑'
      } else if (stage === 'fulfillment') {
        adjustment = 6
        color = 0xff4444
        icon = '↑↑'
      }
    } else if (challengeCard.challengeCategory === 'knowledge') {
      // 知識系: 年齢とともに簡単になる
      if (stage === 'middle') {
        adjustment = -2
        color = 0x99ff99
        icon = '↓'
      } else if (stage === 'fulfillment') {
        adjustment = -4
        color = 0x44ff44
        icon = '↓↓'
      }
    }

    if (adjustment === 0) return null

    const container = this.add.container(60, 20)

    // 背景
    const bg = this.add.rectangle(0, 0, 40, 25, color, 0.3)
    bg.setStrokeStyle(1, color)

    // アイコンと数値
    const text = this.add.text(
      0, 0,
      `${icon}${Math.abs(adjustment)}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    container.add([bg, text])
    return container
  }

  /**
   * Phase 5-1: 難易度ツールチップを追加
   */
  private addDifficultyTooltip(challengeContainer: Phaser.GameObjects.Container, challengeCard: Card): void {
    const cardBg = challengeContainer.list[0] as Phaser.GameObjects.Image
    if (!cardBg) return

    let tooltipText = ''
    const stage = this.gameInstance.stage

    if (challengeCard.challengeCategory === 'physical') {
      tooltipText = '体力系チャレンジ\n'
      if (stage === 'middle') {
        tooltipText += '中年期: 必要パワー+3\n体力の衰えにより難易度上昇'
      } else if (stage === 'fulfillment') {
        tooltipText += '充実期: 必要パワー+6\n大幅な体力低下により高難度'
      } else {
        tooltipText += '青年期: 標準難易度\n体力が充実している時期'
      }
    } else if (challengeCard.challengeCategory === 'knowledge') {
      tooltipText = '知識系チャレンジ\n'
      if (stage === 'middle') {
        tooltipText += '中年期: 必要パワー-2\n経験の蓄積により容易化'
      } else if (stage === 'fulfillment') {
        tooltipText += '充実期: 必要パワー-4\n豊富な知識で大幅に容易化'
      } else {
        tooltipText += '青年期: 標準難易度\n経験はまだ浅い時期'
      }
    } else if (challengeCard.challengeCategory === 'balanced') {
      tooltipText = '複合系チャレンジ\n年齢による難易度変化なし\n体力と知識のバランスが重要'
    }

    if (!tooltipText) return

    // ツールチップコンテナ（初期は非表示）
    const tooltipContainer = this.add.container(0, -120)
    tooltipContainer.setVisible(false)
    tooltipContainer.setDepth(1000)

    const bg = this.add.rectangle(0, 0, 250, 80, 0x000000, 0.9)
    bg.setStrokeStyle(2, 0xffffff)

    const text = this.add.text(
      0, 0,
      tooltipText,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '12px',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 5
      }
    ).setOrigin(0.5)

    tooltipContainer.add([bg, text])
    challengeContainer.add(tooltipContainer)

    // ホバーでツールチップ表示
    cardBg.setInteractive()
    cardBg.on('pointerover', () => {
      tooltipContainer.setVisible(true)
      this.tweens.add({
        targets: tooltipContainer,
        alpha: 1,
        duration: 200
      })
    })

    cardBg.on('pointerout', () => {
      this.tweens.add({
        targets: tooltipContainer,
        alpha: 0,
        duration: 200,
        onComplete: () => tooltipContainer.setVisible(false)
      })
    })
  }

  /**
   * 保険種別選択時の処理
   */
  private onInsuranceTypeSelected(insuranceType: 'whole_life' | 'term'): void {
    if (!this.insuranceTypeSelectionUI) return

    this.selectedInsuranceType = insuranceType

    // 選択アニメーション
    const selectedTypeText = insuranceType === 'whole_life' ? '終身保険' : '定期保険'
    const confirmText = this.add.text(
      0, 250,
      `${selectedTypeText}を選択しました`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#00ff00',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)
    confirmText.setAlpha(0)
    this.insuranceTypeSelectionUI.add(confirmText)
    
    // 選択エフェクト
    this.tweens.add({
      targets: confirmText,
      alpha: 1,
      scale: 1.2,
      duration: 300,
      yoyo: true,
      ease: 'Power2'
    })

    // 選択後、カード選択画面へ遷移
    this.time.delayedCall(1000, () => {
      this.hideInsuranceTypeSelection(() => {
        // 選択した保険種別に基づいてカードを生成
        const cardChoices = this.generateInsuranceCards(insuranceType)
        this.showCardSelection(cardChoices)
      })
    })
  }

  /**
   * 保険種別選択UIを隠す
   */
  private hideInsuranceTypeSelection(onComplete?: () => void): void {
    if (!this.insuranceTypeSelectionUI) return

    this.tweens.add({
      targets: this.insuranceTypeSelectionUI,
      alpha: 0,
      scale: 0.8,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.insuranceTypeSelectionUI?.destroy()
        this.insuranceTypeSelectionUI = undefined
        if (onComplete) onComplete()
      }
    })
  }

  /**
   * 選択した保険種別に基づいてカードを生成
   */
  private generateInsuranceCards(insuranceType: 'whole_life' | 'term'): Card[] {
    // CardFactoryから拡張保険カードを取得
    const allInsuranceCards = CardFactory.createExtendedInsuranceCards(this.gameInstance.stage)
    
    // 選択した保険種別でフィルタリング
    const filteredCards = allInsuranceCards.filter(card => 
      card.durationType === insuranceType
    )
    
    // ランダムに3枚選択
    const shuffled = [...filteredCards].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 3)
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
    
    // アクションボタンを無効化
    this.updateActionButtons()
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

    // Phase 2: 保険期間の表示
    let durationText: Phaser.GameObjects.Text | undefined
    if (card.durationType) {
      const durationLabel = card.durationType === 'whole_life' ? '終身' : '10ターン'
      durationText = this.add.text(
        0, 80,
        durationLabel,
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '16px',
          color: card.durationType === 'whole_life' ? '#FFD700' : '#C0C0C0',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5)
    }

    // Phase 2: カード枠線の色を保険種別に応じて変更
    if (card.durationType === 'whole_life') {
      // 終身保険は金色の輝きとパーティクルエフェクト
      const goldGlow = this.add.rectangle(0, 0, GAME_CONSTANTS.CARD_WIDTH + 10, GAME_CONSTANTS.CARD_HEIGHT + 10, 0xFFD700, 0.3)
      goldGlow.setAlpha(0.6)
      cardContainer.addAt(goldGlow, 0)
      
      this.tweens.add({
        targets: goldGlow,
        alpha: 0.2,
        scale: 1.1,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    } else if (card.durationType === 'term') {
      // 定期保険は銀色のシンプルな枠
      cardBg.setStrokeStyle(3, 0xC0C0C0)
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
    if (durationText) cardElements.push(durationText)
    
    cardContainer.add(cardElements)
    this.cardSelectionUI.add(cardContainer)
  }

  /**
   * カード選択時の処理
   */
  private onCardSelected(card: Card): void {
    if (!this.cardSelectionUI) return

    // Phase 5-2: 保険料負担の境界警告
    const activeInsurances = this.gameInstance.getActiveInsurances()
    const currentCount = activeInsurances.length
    const nextCount = currentCount + 1
    
    // 3枚目、6枚目、9枚目の時に警告
    if (nextCount % 3 === 0) {
      this.showInsuranceBurdenWarning(nextCount)
    }

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

    // カードをゲームに追加（これにより phase が 'resolution' に変わる）
    this.gameInstance.selectCard(card.id)

    // カード獲得アニメーション
    this.showCardAcquisitionAnimation(card, () => {
      // アニメーション完了後にUIを閉じる
      this.hideCardSelection()
    })
  }

  /**
   * Phase 5-2: 保険料負担の境界警告を表示
   */
  private showInsuranceBurdenWarning(insuranceCount: number): void {
    const burdenAmount = Math.floor(insuranceCount / 3)
    const warningContainer = this.add.container(this.centerX, 200)
    warningContainer.setDepth(3500)

    const bg = this.add.rectangle(0, 0, 450, 150, 0xff4444, 0.95)
    bg.setStrokeStyle(3, 0xffffff)

    // 警告アイコン
    const iconText = this.add.text(
      -180, 0,
      '🚨',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '48px',
        color: '#ffffff'
      }
    ).setOrigin(0.5)

    // 警告メッセージ
    const titleText = this.add.text(
      20, -30,
      '保険料負担が発生します！',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    const detailText = this.add.text(
      20, 10,
      `保険${insuranceCount}枚目で負担が${burdenAmount}ポイントに増加します`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#ffcccc'
      }
    ).setOrigin(0.5)

    const adviceText = this.add.text(
      20, 40,
      '本当に必要な保険か、もう一度考えましょう',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: '#ffffff'
      }
    ).setOrigin(0.5)

    warningContainer.add([bg, iconText, titleText, detailText, adviceText])
    warningContainer.setScale(0)
    warningContainer.setAlpha(0)

    // 警告アニメーション
    this.tweens.add({
      targets: warningContainer,
      scale: 1.2,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 揺れアニメーション
        this.tweens.add({
          targets: warningContainer,
          angle: -5,
          duration: 100,
          yoyo: true,
          repeat: 3,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            // フェードアウト
            this.time.delayedCall(3000, () => {
              this.tweens.add({
                targets: warningContainer,
                scale: 0.8,
                alpha: 0,
                duration: 500,
                ease: 'Power2',
                onComplete: () => warningContainer.destroy()
              })
            })
          }
        })
      }
    })

    // 画面全体を一瞬赤くフラッシュ
    const flashOverlay = this.add.rectangle(
      this.centerX,
      this.centerY,
      this.gameWidth,
      this.gameHeight,
      0xff0000,
      0.3
    )
    flashOverlay.setDepth(3000)
    
    this.tweens.add({
      targets: flashOverlay,
      alpha: 0,
      duration: 200,
      onComplete: () => flashOverlay.destroy()
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
        
        // チャレンジUIをクリーンアップ
        this.cleanupChallengeUI()
        
        // 通常のゲームフローに戻る（ダーティフラグを設定）
        this.dirtyFlags.vitality = true
        this.dirtyFlags.actionButtons = true
        this.updateUI()
      }
    })
  }

  /**
   * ゲーム状態をチュートリアル用に公開
   */
  private updateGameStateForTutorial(): void {
    // ゲーム状態をグローバルとSceneデータの両方に設定
    const gameState = {
      hand: this.gameInstance.hand,
      selectedCards: this.gameInstance.selectedCards,
      phase: this.gameInstance.phase,
      turn: this.gameInstance.turn,
      vitality: this.gameInstance.vitality,
      maxVitality: this.gameInstance.maxVitality,
      insuranceCards: this.gameInstance.insuranceCards,
      config: this.gameInstance.config,
      lastChallengeResult: null as ChallengeResult | null
    };
    
    (window as Window & { __gameState?: typeof gameState }).__gameState = gameState;
    this.data.set('gameState', gameState);
  }

  /**
   * アクションボタンの有効/無効を更新
   */
  private updateActionButtons(): void {
    const actionButtons = this.children.getByName('action-buttons') as Phaser.GameObjects.Container
    if (!actionButtons) return

    const drawButton = actionButtons.getByName('draw-button') as Phaser.GameObjects.Container
    const challengeButton = actionButtons.getByName('challenge-button') as Phaser.GameObjects.Container
    const endTurnButton = actionButtons.getByName('end-turn-button') as Phaser.GameObjects.Container

    const phase = this.gameInstance.phase
    const isInProgress = this.gameInstance.isInProgress()

    // フェーズに応じてボタンの有効/無効を切り替え
    if (drawButton) {
      this.setButtonEnabled(drawButton, isInProgress && phase === 'draw')
    }

    if (challengeButton) {
      this.setButtonEnabled(challengeButton, isInProgress && phase === 'draw' && !this.gameInstance.currentChallenge)
    }

    if (endTurnButton) {
      // ドローフェーズまたは解決フェーズでターン終了を可能に
      this.setButtonEnabled(endTurnButton, isInProgress && (phase === 'draw' || phase === 'resolution'))
    }
  }

  /**
   * コンテナベースのボタンを作成
   */
  private createContainerButton(
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    style?: Phaser.Types.GameObjects.Text.TextStyle
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    
    // ボタン背景
    const bg = this.add.rectangle(0, 0, 150, 40, 0x3498DB)
    bg.setInteractive({ useHandCursor: true })
    
    // ボタンテキスト
    const textObj = this.add.text(0, 0, text, style || {
      fontFamily: 'Noto Sans JP',
      fontSize: '18px',
      color: '#ffffff'
    })
    textObj.setOrigin(0.5)
    
    container.add([bg, textObj])
    
    // クリックイベント
    bg.on('pointerdown', onClick)
    
    // ホバー効果
    bg.on('pointerover', () => {
      bg.setFillStyle(0x2980B9)
      container.setScale(1.05)
    })
    
    bg.on('pointerout', () => {
      bg.setFillStyle(0x3498DB)
      container.setScale(1)
    })
    
    return container
  }

  /**
   * ボタンの有効/無効を切り替え
   */
  private setButtonEnabled(button: Phaser.GameObjects.Container, enabled: boolean): void {
    if (!button || !button.list || button.list.length < 2) {
      console.warn('Invalid button structure')
      return
    }

    const buttonBg = button.list[0] as Phaser.GameObjects.Rectangle
    const buttonText = button.list[1] as Phaser.GameObjects.Text

    if (!buttonBg || !buttonText) {
      console.warn('Button components not found')
      return
    }

    if (enabled) {
      buttonBg.setFillStyle(0x3498DB)
      buttonText.setColor('#ffffff')
      buttonBg.setInteractive()
    } else {
      buttonBg.setFillStyle(0x95A5A6)
      buttonText.setColor('#cccccc')
      buttonBg.disableInteractive()
    }
  }

  /**
   * チャレンジUI要素をクリーンアップ
   */
  private cleanupChallengeUI(): void {
    // パワー表示を削除
    const powerDisplay = this.children.getByName('power-display')
    if (powerDisplay) {
      powerDisplay.destroy()
    }

    // チャレンジ解決ボタンを削除
    const resolveButton = this.children.getByName('resolve-challenge-button')
    if (resolveButton) {
      resolveButton.destroy()
    }

    // チャレンジ情報を削除
    const challengeInfo = this.children.getByName('challenge-info')
    if (challengeInfo) {
      challengeInfo.destroy()
    }
    
    // 手札の選択状態をクリア
    this.clearHandSelection()
  }

  /**
   * 手札の選択状態をクリア
   */
  private clearHandSelection(): void {
    this.handCards.forEach(cardContainer => {
      // 選択状態をクリア
      if (cardContainer.getData('selected')) {
        cardContainer.setData('selected', false)
        cardContainer.setScale(1)
        
        // ハイライト削除
        const highlight = cardContainer.getByName('highlight')
        if (highlight) {
          highlight.destroy()
        }
      }
    })
    
    // 選択カードセットをクリア
    this.selectedCards.clear()
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

  /**
   * Phase 3-3: 通知を表示
   */
  private showNotification(message: string, type: 'info' | 'warning' | 'success' = 'info'): void {
    const notificationContainer = this.add.container(this.centerX, 200)
    notificationContainer.setDepth(2500)

    const colors = {
      info: 0x3498db,
      warning: 0xf39c12,
      success: 0x2ecc71
    }

    const bg = this.add.rectangle(0, 0, 400, 60, colors[type], 0.9)
    bg.setStrokeStyle(2, 0xffffff)

    const text = this.add.text(
      0, 0,
      message,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    notificationContainer.add([bg, text])
    notificationContainer.setScale(0)
    notificationContainer.setAlpha(0)

    // アニメーション
    this.tweens.add({
      targets: notificationContainer,
      scale: 1,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // 3秒後にフェードアウト
        this.time.delayedCall(3000, () => {
          this.tweens.add({
            targets: notificationContainer,
            scale: 0.8,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => notificationContainer.destroy()
          })
        })
      }
    })
  }

  /**
   * 保険更新選択ダイアログを表示
   * DISABLED: 保険更新システムが削除されたため無効化
   */
  private showInsuranceRenewalDialog(renewalOption: unknown): void {
    // 保険更新システムが削除されたため、この機能は無効化
    console.warn('showInsuranceRenewalDialog: 保険更新システムが削除されました')
    return

    // 保険更新選択コンテナを作成
    this.insuranceRenewalDialogUI = this.add.container(this.centerX, this.centerY)
    this.insuranceRenewalDialogUI.setDepth(2100)

    // 背景オーバーレイ
    const overlay = this.add.rectangle(
      0, 0,
      this.gameWidth, this.gameHeight,
      0x000000, 0.8
    )
    overlay.setOrigin(0.5)

    // カード情報の背景
    const cardInfoBg = this.add.rectangle(0, -50, 600, 400, 0x2C3E50)
    cardInfoBg.setStrokeStyle(4, 0xFFD700)

    // タイトル
    const titleText = this.add.text(
      0, -220,
      '保険更新の選択',
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '36px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // 保険名表示
    const insuranceNameText = this.add.text(
      0, -170,
      renewalOption.cardName,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '28px',
        color: '#FFD700',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // コスト情報表示
    const currentVitality = this.gameInstance.vitality
    const canAffordRenewal = currentVitality >= renewalOption.renewalCost
    const costColor = canAffordRenewal ? '#00ff00' : '#ff4444'

    const costInfoText = this.add.text(
      0, -120,
      `現在コスト: ${renewalOption.currentCost} → 更新コスト: ${renewalOption.renewalCost} (+${renewalOption.costIncrease})`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: costColor,
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // 活力状況表示
    const vitalityStatusText = this.add.text(
      0, -80,
      `現在の活力: ${currentVitality}`,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '18px',
        color: '#ffffff'
      }
    ).setOrigin(0.5)

    // 年齢による増加理由
    const ageReason = this.getAgeIncreaseReason()
    const ageReasonText = this.add.text(
      0, -50,
      ageReason,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '16px',
        color: '#cccccc'
      }
    ).setOrigin(0.5)

    // 活力不足警告（必要に応じて表示）
    let insufficientVitalityWarning: Phaser.GameObjects.Text | null = null
    if (!canAffordRenewal) {
      insufficientVitalityWarning = this.add.text(
        0, -10,
        '⚠ 活力不足で更新できません',
        {
          fontFamily: 'Noto Sans JP',
          fontSize: '18px',
          color: '#ff4444',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5)
    }

    this.insuranceRenewalDialogUI.add([
      overlay, 
      cardInfoBg, 
      titleText, 
      insuranceNameText, 
      costInfoText, 
      vitalityStatusText, 
      ageReasonText
    ])

    if (insufficientVitalityWarning) {
      this.insuranceRenewalDialogUI.add(insufficientVitalityWarning)
    }

    // 更新ボタン（活力不足でも表示するが、効果的には失効する）
    this.createRenewalButton(
      -150, 80,
      '更新する',
      `コスト: ${renewalOption.renewalCost}`,
      canAffordRenewal ? 0x4CAF50 : 0x9E9E9E, // グリーンまたはグレー
      () => this.onRenewalSelected(renewalOption, true),
      canAffordRenewal
    )

    // 失効ボタン
    this.createRenewalButton(
      150, 80,
      '失効させる',
      'リスクを受け入れる',
      0xF44336, // レッド
      () => this.onRenewalSelected(renewalOption, false),
      true
    )

    // フェードイン
    this.insuranceRenewalDialogUI.setAlpha(0)
    this.tweens.add({
      targets: this.insuranceRenewalDialogUI,
      alpha: 1,
      duration: 500,
      ease: 'Power2'
    })
  }

  /**
   * 更新選択ボタンを作成
   */
  private createRenewalButton(
    x: number,
    y: number,
    title: string,
    subtitle: string,
    color: number,
    callback: () => void,
    enabled: boolean
  ): void {
    if (!this.insuranceRenewalDialogUI) return

    const buttonContainer = this.add.container(x, y)
    
    // ボタン背景
    const buttonBg = this.add.rectangle(0, 0, 250, 100, color)
    buttonBg.setStrokeStyle(3, enabled ? 0xffffff : 0x666666)
    
    if (enabled) {
      buttonBg.setInteractive()
    }
    
    // タイトルテキスト
    const titleText = this.add.text(
      0, -15,
      title,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '20px',
        color: enabled ? '#ffffff' : '#666666',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5)

    // サブタイトルテキスト
    const subtitleText = this.add.text(
      0, 15,
      subtitle,
      {
        fontFamily: 'Noto Sans JP',
        fontSize: '14px',
        color: enabled ? '#ffffff' : '#666666'
      }
    ).setOrigin(0.5)

    if (enabled) {
      // ホバー効果
      buttonBg.on('pointerover', () => {
        buttonContainer.setScale(1.05)
        buttonBg.setFillStyle(Phaser.Display.Color.ValueToColor(color).brighten(20).color)
      })

      buttonBg.on('pointerout', () => {
        buttonContainer.setScale(1)
        buttonBg.setFillStyle(color)
      })

      // クリック処理
      buttonBg.on('pointerdown', () => {
        // 即座にUI応答
        buttonContainer.setScale(0.95)
        
        this.time.delayedCall(100, () => {
          buttonContainer.setScale(1)
          callback()
        })
      })
    }

    buttonContainer.add([buttonBg, titleText, subtitleText])
    this.insuranceRenewalDialogUI.add(buttonContainer)
  }

  /**
   * 更新選択時の処理
   */
  private onRenewalSelected(renewalOption: InsuranceRenewalOption, shouldRenew: boolean): void {
    // UIを閉じる
    if (this.insuranceRenewalDialogUI) {
      this.tweens.add({
        targets: this.insuranceRenewalDialogUI,
        alpha: 0,
        scale: 0.8,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          this.insuranceRenewalDialogUI?.destroy()
          this.insuranceRenewalDialogUI = undefined
        }
      })
    }

    try {
      let result
      if (shouldRenew) {
        result = this.gameInstance.renewInsurance(renewalOption.cardId)
      } else {
        result = this.gameInstance.expireInsurance(renewalOption.cardId)
      }

      // 結果メッセージを表示
      const messageType = result.action === 'renewed' ? 'success' : 'warning'
      this.showNotification(result.message, messageType)

      // UIを更新
      this.time.delayedCall(500, () => {
        this.updateInsuranceDisplay()
        this.updateVitalityDisplay()
        
        // 他に期限切れの保険があるかチェック
        this.checkForAdditionalRenewals()
      })

    } catch (error) {
      console.error('Insurance renewal error:', error)
      this.showNotification('保険処理でエラーが発生しました', 'error')
    }
  }

  /**
   * 年齢による増加理由を取得
   */
  private getAgeIncreaseReason(): string {
    const stage = this.gameInstance.stage
    
    switch (stage) {
      case 'youth':
        return '青年期のため基本コストで更新可能'
      case 'middle':
        return '中年期のため更新コストが増加 (+2)'
      case 'fulfillment':
        return '充実期のため更新コストが大幅増加 (+4)'
      default:
        return '年齢に応じてコストが調整されます'
    }
  }

  /**
   * 追加の期限切れ保険をチェック
   * DISABLED: 保険更新システムが削除されたため無効化
   */
  private checkForAdditionalRenewals(): void {
    // 保険更新システムが削除されたため、この機能は無効化
    return
  }

  // ===================
  // チュートリアル関連
  // ===================

  /**
   * チュートリアルの初期化
   */
  private initializeTutorial(): void {
    try {
      // TutorialManagerの初期化
      this.tutorialManager = new TutorialManager(this, {
        debugMode: false,
        autoSaveProgress: true,
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

      // TutorialOverlayの初期化
      this.tutorialOverlay = new TutorialOverlay(this)
      this.tutorialOverlay.setVisible(false)

      // チュートリアルステップで参照される要素を登録
      this.registerTutorialElements()

      // イベントリスナー設定
      this.setupTutorialEventListeners()

      // 開発環境でのテストヘルパー設定
      if (process.env.NODE_ENV === 'development') {
        this.time.delayedCall(1000, () => {
          setupGlobalTutorialTests(this)
        })
      }

    } catch (error) {
      console.error('Tutorial initialization failed:', error)
    }
  }

  /**
   * チュートリアル要素の登録
   */
  private registerTutorialElements(): void {
    // 手札エリア
    if (this.handCards.length > 0) {
      this.tutorialStepElements.set('hand-area', this.handCards[0].parentContainer || this.handCards[0])
    }

    // バイタリティバー
    if (this.vitalityBarContainer) {
      this.tutorialStepElements.set('vitality-bar', this.vitalityBarContainer)
    }

    // 保険リスト
    if (this.insuranceListContainer) {
      this.tutorialStepElements.set('insurance-list', this.insuranceListContainer)
    }

    // 負担指標
    if (this.burdenIndicatorContainer) {
      this.tutorialStepElements.set('burden-indicator', this.burdenIndicatorContainer)
    }
  }

  /**
   * チュートリアルイベントリスナーの設定
   */
  private setupTutorialEventListeners(): void {
    if (!this.tutorialManager) return

    this.tutorialManager.on('tutorial:started', (data) => {
      this.isTutorialMode = true
      this.tutorialOverlay?.setVisible(true)
      if (import.meta.env.DEV) console.log('Tutorial started:', data.tutorialId)
    })

    this.tutorialManager.on('tutorial:step:enter', (data) => {
      this.handleTutorialStepEnter(data)
    })

    this.tutorialManager.on('tutorial:step:exit', () => {
      this.tutorialOverlay?.clearHighlights()
    })

    this.tutorialManager.on('tutorial:completed', () => {
      this.endTutorialMode()
    })

    this.tutorialManager.on('tutorial:skipped', () => {
      this.endTutorialMode()
    })

    this.tutorialManager.on('tutorial:error', (data) => {
      console.error('Tutorial error:', data.error)
      this.endTutorialMode()
    })

    // 画面リサイズ対応
    this.scale.on('resize', () => {
      this.tutorialOverlay?.onResize()
    })
  }

  /**
   * チュートリアルステップ開始時の処理
   */
  private handleTutorialStepEnter(_data: unknown): void {
    if (!this.tutorialOverlay || !this.tutorialManager) return

    const currentStep = this.tutorialManager.getCurrentStep()
    if (!currentStep) return

    const progress = this.tutorialManager.getProgress()
    if (!progress) return

    // 進捗バーの更新
    const totalSteps = this.tutorialManager.getCurrentStep() ? 
      (this.tutorialManager as unknown as { currentConfig?: { steps: { length: number } } }).currentConfig?.steps.length || 0 : 0
    this.tutorialOverlay.createProgressBar(progress, totalSteps)

    // ターゲット要素の処理
    let targetBounds: Phaser.Geom.Rectangle | undefined
    if (currentStep.targetElement) {
      const targetElement = this.tutorialStepElements.get(currentStep.targetElement) ||
                          this.children.getByName(currentStep.targetElement)
      
      if (targetElement && targetElement.getBounds) {
        targetBounds = targetElement.getBounds()
        
        // スポットライト効果
        this.tutorialOverlay.createSpotlight(targetElement)
        
        // ハイライト効果
        this.tutorialOverlay.highlightElement(
          currentStep.targetElement, 
          currentStep.highlightOptions
        )
      }
    }

    // 吹き出し表示
    this.tutorialOverlay.createSpeechBubble(currentStep, targetBounds)

    // 制御ボタン
    const canGoBack = progress.currentStepIndex > 0
    const canSkip = true // 基本的にはスキップ可能

    this.tutorialOverlay.createControlButtons(
      canGoBack,
      canSkip,
      () => this.tutorialManager?.nextStep(),
      canGoBack ? () => this.tutorialManager?.previousStep() : undefined,
      () => this.tutorialManager?.skipTutorial()
    )

    // キーボード操作の有効化
    this.tutorialOverlay.enableKeyboardControls(
      () => this.tutorialManager?.nextStep(),
      canGoBack ? () => this.tutorialManager?.previousStep() : undefined,
      () => this.tutorialManager?.skipTutorial()
    )

    // アクション待機の場合の自動進行設定
    if (currentStep.action === 'wait' && currentStep.waitTime) {
      this.time.delayedCall(currentStep.waitTime, () => {
        this.tutorialManager?.nextStep()
      })
    }
  }

  /**
   * チュートリアルモード終了
   */
  private endTutorialMode(): void {
    this.isTutorialMode = false
    
    if (this.tutorialOverlay) {
      this.tutorialOverlay.setVisible(false)
      this.tutorialOverlay.clearHighlights()
    }

    // 通常のUI制限を解除
    this.enableAllGameUI()
    
    if (import.meta.env.DEV) console.log('Tutorial mode ended')
  }

  /**
   * チュートリアル自動開始（メニューから呼び出された場合）
   */
  private autoStartTutorial(): void {
    if (import.meta.env.DEV) console.log('Auto-starting tutorial from menu')
    
    // インタラクティブチュートリアルを開始
    this.startTutorial(INTERACTIVE_GAME_TUTORIAL)
      .then(() => {
        if (import.meta.env.DEV) console.log('Tutorial started successfully')
      })
      .catch((error) => {
        console.error('Failed to start tutorial:', error)
      })
  }

  /**
   * チュートリアル開始（外部から呼び出し用）
   */
  public startTutorial(config: TutorialConfig): Promise<void> {
    if (!this.tutorialManager) {
      return Promise.reject(new Error('Tutorial manager not initialized'))
    }

    // 既存のチュートリアルが完了済みかチェック
    if (this.tutorialManager.isCompleted(config.id)) {
      if (import.meta.env.DEV) console.log('Tutorial already completed:', config.id)
      return Promise.resolve()
    }

    // チュートリアルモード制限を適用
    this.applyTutorialModeRestrictions()

    return this.tutorialManager.startTutorial(config)
  }

  /**
   * チュートリアル中のUI制限適用
   */
  private applyTutorialModeRestrictions(): void {
    // ドラッグ&ドロップを一時無効化
    this.isDragInProgress = false
    
    // 通常のボタンを無効化（チュートリアルで指示されたもの以外）
    this.disableNonTutorialUI()
  }

  /**
   * 非チュートリアルUIの無効化
   */
  private disableNonTutorialUI(): void {
    // 実装：チュートリアル中は特定のUI要素のみアクティブに
    // 詳細な実装は既存のUI要素の構造に依存
  }

  /**
   * 全ゲームUIの有効化
   */
  private enableAllGameUI(): void {
    // 実装：すべてのUI要素を再度有効化
    // ドラッグ&ドロップやボタンの制限を解除
  }

  /**
   * チュートリアル要素の動的登録
   */
  public registerTutorialElement(name: string, element: Phaser.GameObjects.GameObject): void {
    this.tutorialStepElements.set(name, element)
  }

  /**
   * チュートリアル状態の確認
   */
  public isTutorialActive(): boolean {
    return this.isTutorialMode
  }

  /**
   * 現在のチュートリアルステップ取得
   */
  public getCurrentTutorialStep(): TutorialStep | null {
    return this.tutorialManager?.getCurrentStep() || null
  }

  /**
   * チュートリアル強制終了
   */
  public stopTutorial(): void {
    if (this.tutorialManager) {
      this.tutorialManager.skipTutorial()
    }
  }

  /**
   * シーンのクリーンアップ処理
   */
  public destroy(): void {
    // 新しいドロップゾーンシステムのクリーンアップ
    if (this.dropZoneIntegration) {
      this.dropZoneIntegration.destroy()
      this.dropZoneIntegration = undefined
    }

    // イベントリスナーの削除
    this.data.events.off('cardSelected')

    // 親クラスのクリーンアップを呼び出し
    super.destroy()
  }

  // === GameRenderer Interface Support Methods ===

  /**
   * ゲーム状態を更新
   */
  updateGameState(game: Game): void {
    this.gameInstance = game
    this.updateVitalityDisplay(game.vitality, game.getMaxVitality())
    this.updateProgressDisplay(game.stage, game.turn)
  }

  /**
   * 手札カードを表示
   */
  displayHandCards(cards: Card[]): void {
    this.clearHandDisplay()
    cards.forEach((card, index) => {
      this.createHandCard(card, index)
    })
  }

  /**
   * 現在のチャレンジを表示
   */
  displayCurrentChallenge(challenge: Card): void {
    this.updateChallengeDisplay(challenge)
  }

  /**
   * 保険表示を更新
   */
  updateInsuranceDisplay(insurances: Card[]): void {
    this.updateInsuranceList(insurances)
  }

  /**
   * 保険料負担表示を更新
   */
  updateInsuranceBurdenDisplay(burden: number): void {
    this.updateBurdenIndicator(burden)
  }

  /**
   * 進捗表示を更新
   */
  updateProgressDisplay(stage: string, turn: number): void {
    if (this.stageText) {
      this.stageText.setText(`${stage} - ターン ${turn}`)
    }
  }

  /**
   * カード選択UIを表示
   */
  showCardSelectionUI(
    cards: Card[],
    minSelection: number,
    maxSelection: number,
    message: string,
    callback: (selectedCards: Card[]) => void
  ): void {
    this.createCardSelectionInterface(cards, minSelection, maxSelection, message, callback)
  }

  /**
   * チャレンジアクションUIを表示
   */
  showChallengeActionUI(
    challenge: Card,
    callback: (action: 'start' | 'skip') => void
  ): void {
    this.createChallengeActionInterface(challenge, callback)
  }

  /**
   * 保険選択UIを表示
   */
  showInsuranceSelectionUI(
    cards: Card[],
    message: string,
    callback: (selectedInsurance: Card) => void
  ): void {
    this.createInsuranceSelectionInterface(cards, message, callback)
  }

  /**
   * 確認UIを表示
   */
  showConfirmationUI(
    message: string,
    defaultChoice: 'yes' | 'no',
    callback: (choice: 'yes' | 'no') => void
  ): void {
    this.createConfirmationDialog(message, defaultChoice, callback)
  }

  /**
   * チャレンジ結果を表示
   */
  displayChallengeResult(result: ChallengeResult): void {
    this.showChallengeResultScreen(result)
  }

  /**
   * メッセージを表示
   */
  showMessage(message: string, level: 'info' | 'success' | 'warning' = 'info'): void {
    const color = level === 'success' ? '#4CAF50' : level === 'warning' ? '#FF9800' : '#2196F3'
    this.createTemporaryMessage(message, color)
  }

  /**
   * エラーメッセージを表示
   */
  showError(error: string): void {
    this.createTemporaryMessage(error, '#F44336')
  }

  /**
   * ゲームオーバー画面を表示
   */
  showGameOverScreen(stats: PlayerStats): void {
    this.createGameOverScreen(stats)
  }

  /**
   * 勝利画面を表示
   */
  showVictoryScreen(stats: PlayerStats): void {
    this.createVictoryScreen(stats)
  }

  /**
   * ステージクリア画面を表示
   */
  showStageClearScreen(stage: string, stats: PlayerStats): void {
    this.createStageClearScreen(stage, stats)
  }

  /**
   * 画面をクリア
   */
  clearDisplay(): void {
    this.clearAllUI()
  }

  // === Helper Methods for UI Creation ===

  private createCardSelectionInterface(
    cards: Card[],
    minSelection: number,
    maxSelection: number,
    message: string,
    callback: (selectedCards: Card[]) => void
  ): void {
    // カード選択インターフェースの実装（簡略化版）
    callback(cards.slice(0, Math.min(maxSelection, cards.length)))
  }

  private createChallengeActionInterface(
    challenge: Card,
    callback: (action: 'start' | 'skip') => void
  ): void {
    // チャレンジアクション選択の実装（簡略化版：自動でstartを選択）
    callback('start')
  }

  private createInsuranceSelectionInterface(
    cards: Card[],
    message: string,
    callback: (selectedInsurance: Card) => void
  ): void {
    // 保険選択インターフェースの実装（簡略化版：最初のカードを選択）
    if (cards.length > 0) {
      callback(cards[0])
    }
  }

  private createConfirmationDialog(
    message: string,
    defaultChoice: 'yes' | 'no',
    callback: (choice: 'yes' | 'no') => void
  ): void {
    // 確認ダイアログの実装（簡略化版：デフォルト選択を返す）
    callback(defaultChoice)
  }

  private showChallengeResultScreen(result: ChallengeResult): void {
    // チャレンジ結果画面の実装
    console.log('Challenge result:', result)
  }

  private createTemporaryMessage(message: string, color: string): void {
    // 一時的なメッセージ表示
    const messageText = this.add.text(
      this.cameras.main.centerX,
      this.cameras.main.centerY - 100,
      message,
      {
        fontSize: '24px',
        color: color,
        stroke: '#000000',
        strokeThickness: 2
      }
    )
    messageText.setOrigin(0.5)
    messageText.setDepth(1000)

    // 3秒後に削除
    this.time.delayedCall(3000, () => {
      messageText.destroy()
    })
  }

  private createGameOverScreen(stats: PlayerStats): void {
    // ゲームオーバー画面の実装
    console.log('Game Over:', stats)
  }

  private createVictoryScreen(stats: PlayerStats): void {
    // 勝利画面の実装
    console.log('Victory:', stats)
  }

  private createStageClearScreen(stage: string, stats: PlayerStats): void {
    // ステージクリア画面の実装
    console.log('Stage Clear:', stage, stats)
  }

  private clearAllUI(): void {
    // すべてのUI要素をクリア
    this.clearHandDisplay()
    this.clearSelectionUI()
  }

  private clearHandDisplay(): void {
    // 手札表示をクリア
    this.handCards.forEach(card => card.destroy())
    this.handCards = []
  }

  private clearSelectionUI(): void {
    // 選択UI要素をクリア
    if (this.cardSelectionUI) {
      this.cardSelectionUI.destroy()
      this.cardSelectionUI = undefined
    }
    if (this.insuranceTypeSelectionUI) {
      this.insuranceTypeSelectionUI.destroy()
      this.insuranceTypeSelectionUI = undefined
    }
  }
}