import type { GameScene } from './GameScene'
import { GameManager } from '../GameManager'
import type { TouchGestureManager, GestureEvent, SwipeDetail, DragDetail } from '../input/TouchGestureManager'

/**
 * ゲームシーンのレスポンシブ対応ミックスイン
 * 
 * モバイル対応機能:
 * - タッチジェスチャーの統合
 * - レスポンシブレイアウト
 * - 画面回転対応
 * - セーフエリア対応
 */
export const ResponsiveGameSceneMixin = {
  /**
   * レスポンシブ対応の初期化
   */
  initializeResponsive(this: GameScene): void {
    const gameManager = GameManager.getInstance()
    const touchManager = gameManager.getTouchGestureManager()
    const isMobile = gameManager.getIsMobile()
    
    // モバイル設定をレジストリに保存
    this.registry.set('isMobile', isMobile)
    this.registry.set('touchManager', touchManager)
    
    // レスポンシブレイアウトの設定
    this.setupResponsiveLayout()
    
    // タッチジェスチャーの設定
    if (touchManager && isMobile) {
      this.setupTouchGestures(touchManager)
    }
    
    // 画面回転リスナー
    this.events.on('orientationchange', this.handleOrientationChange, this)
    
    // リサイズリスナー
    this.scale.on('resize', this.handleResize, this)
  },

  /**
   * レスポンシブレイアウトの設定
   */
  setupResponsiveLayout(this: GameScene): void {
    const { width, height } = this.scale
    const isMobile = this.registry.get('isMobile')
    const safeAreaInsets = this.registry.get('safeAreaInsets') || { top: 0, right: 0, bottom: 0, left: 0 }
    
    // ゲームエリアの計算（セーフエリアを考慮）
    const gameArea = {
      x: safeAreaInsets.left,
      y: safeAreaInsets.top,
      width: width - safeAreaInsets.left - safeAreaInsets.right,
      height: height - safeAreaInsets.top - safeAreaInsets.bottom
    }
    
    this.registry.set('gameArea', gameArea)
    
    // モバイル用のレイアウト調整
    if (isMobile) {
      this.adjustMobileLayout(gameArea)
    }
  },

  /**
   * モバイルレイアウトの調整
   */
  adjustMobileLayout(this: GameScene, gameArea: { x: number; y: number; width: number; height: number }): void {
    const isPortrait = gameArea.height > gameArea.width
    
    if (isPortrait) {
      // 縦持ちレイアウト
      this.adjustPortraitLayout(gameArea)
    } else {
      // 横持ちレイアウト
      this.adjustLandscapeLayout(gameArea)
    }
  },

  /**
   * 縦持ちレイアウトの調整
   */
  adjustPortraitLayout(this: GameScene, gameArea: { x: number; y: number; width: number; height: number }): void {
    // カードの配置を縦向けに最適化
    const cardScale = Math.min(gameArea.width / 800, 1)
    const cardSpacing = 10 * cardScale
    
    // 手札の位置を下部に調整
    const handY = gameArea.y + gameArea.height - 120 * cardScale
    
    // チャレンジエリアを上部に配置
    const challengeY = gameArea.y + 100
    
    // UIパネルを中央に配置
    const uiPanelX = gameArea.x + gameArea.width / 2
    const uiPanelY = gameArea.y + gameArea.height / 2
    
    // レイアウト設定をレジストリに保存
    this.registry.set('layout', {
      cardScale,
      cardSpacing,
      handY,
      challengeY,
      uiPanelX,
      uiPanelY,
      orientation: 'portrait'
    })
  },

  /**
   * 横持ちレイアウトの調整
   */
  adjustLandscapeLayout(this: GameScene, gameArea: { x: number; y: number; width: number; height: number }): void {
    // カードの配置を横向けに最適化
    const cardScale = Math.min(gameArea.height / 600, 1)
    const cardSpacing = 15 * cardScale
    
    // 手札の位置を右側に調整
    const handX = gameArea.x + gameArea.width - 200
    const handY = gameArea.y + gameArea.height / 2
    
    // チャレンジエリアを左側に配置
    const challengeX = gameArea.x + 200
    const challengeY = gameArea.y + gameArea.height / 2
    
    // UIパネルを上部に配置
    const uiPanelX = gameArea.x + gameArea.width / 2
    const uiPanelY = gameArea.y + 50
    
    // レイアウト設定をレジストリに保存
    this.registry.set('layout', {
      cardScale,
      cardSpacing,
      handX,
      handY,
      challengeX,
      challengeY,
      uiPanelX,
      uiPanelY,
      orientation: 'landscape'
    })
  },

  /**
   * タッチジェスチャーの設定
   */
  setupTouchGestures(this: GameScene, touchManager: TouchGestureManager): void {
    // カードのスワイプ操作
    touchManager.on('swipe', (event: GestureEvent) => {
      const swipeDetail = event.detail as SwipeDetail
      
      if (swipeDetail.direction === 'up') {
        // 上スワイプでカードをプレイ
        this.handleCardSwipeUp(event.target)
      } else if (swipeDetail.direction === 'down') {
        // 下スワイプでカードを手札に戻す
        this.handleCardSwipeDown(event.target)
      }
    })
    
    // カードのドラッグ操作
    touchManager.on('drag', (event: GestureEvent) => {
      const dragDetail = event.detail as DragDetail
      this.handleCardDrag(event.target, dragDetail)
    })
    
    // カードのドラッグ終了
    touchManager.on('dragend', (event: GestureEvent) => {
      const dragDetail = event.detail as DragDetail
      this.handleCardDragEnd(event.target, dragDetail)
    })
    
    // ロングプレスでカード詳細表示
    touchManager.on('longpress', (event: GestureEvent) => {
      this.handleCardLongPress(event.target)
    })
    
    // ダブルタップでカード選択
    touchManager.on('doubletap', (event: GestureEvent) => {
      this.handleCardDoubleTap(event.target)
    })
  },

  /**
   * カードの上スワイプ処理
   */
  handleCardSwipeUp(this: GameScene, target: HTMLElement | null): void {
    if (!target) return
    
    // ターゲットからカードオブジェクトを取得
    const cardObject = this.getCardObjectFromElement(target)
    if (!cardObject) return
    
    // カードをプレイエリアに移動
    this.playCardWithAnimation(cardObject)
  },

  /**
   * カードの下スワイプ処理
   */
  handleCardSwipeDown(this: GameScene, target: HTMLElement | null): void {
    if (!target) return
    
    // ターゲットからカードオブジェクトを取得
    const cardObject = this.getCardObjectFromElement(target)
    if (!cardObject) return
    
    // カードを手札に戻す
    this.returnCardToHand(cardObject)
  },

  /**
   * カードのドラッグ処理
   */
  handleCardDrag(this: GameScene, target: HTMLElement | null, dragDetail: DragDetail): void {
    if (!target) return
    
    const cardObject = this.getCardObjectFromElement(target)
    if (!cardObject) return
    
    // カードの位置を更新
    cardObject.x += dragDetail.deltaX
    cardObject.y += dragDetail.deltaY
    
    // ドロップゾーンのハイライト
    this.updateDropZoneHighlight(cardObject)
  },

  /**
   * カードのドラッグ終了処理
   */
  handleCardDragEnd(this: GameScene, target: HTMLElement | null, dragDetail: DragDetail): void {
    if (!target) return
    
    const cardObject = this.getCardObjectFromElement(target)
    if (!cardObject) return
    
    // ドロップゾーンチェック
    const dropZone = this.getDropZoneAt(cardObject.x, cardObject.y)
    
    if (dropZone) {
      // ドロップゾーンにカードを配置
      this.dropCardToZone(cardObject, dropZone)
    } else {
      // 元の位置に戻す
      this.returnCardToOriginalPosition(cardObject)
    }
  },

  /**
   * カードのロングプレス処理
   */
  handleCardLongPress(this: GameScene, target: HTMLElement | null): void {
    if (!target) return
    
    const cardObject = this.getCardObjectFromElement(target)
    if (!cardObject) return
    
    // カード詳細ポップアップを表示
    this.showCardDetail(cardObject)
  },

  /**
   * カードのダブルタップ処理
   */
  handleCardDoubleTap(this: GameScene, target: HTMLElement | null): void {
    if (!target) return
    
    const cardObject = this.getCardObjectFromElement(target)
    if (!cardObject) return
    
    // カードの選択/選択解除
    this.toggleCardSelection(cardObject)
  },

  /**
   * 画面回転の処理
   */
  handleOrientationChange(this: GameScene, orientation: number): void {
    // レイアウトの再計算
    this.setupResponsiveLayout()
    
    // 既存要素の再配置
    this.repositionAllElements()
    
    // アニメーションで smooth transition
    this.tweens.add({
      targets: this.children.list,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        // 回転完了後の処理
        this.events.emit('orientationChangeComplete', orientation)
      }
    })
  },

  /**
   * リサイズの処理
   */
  handleResize(this: GameScene, gameSize: Phaser.Structs.Size): void {
    const { width, height } = gameSize
    
    // レイアウトの再計算
    this.setupResponsiveLayout()
    
    // カメラの調整
    this.cameras.main.setViewport(0, 0, width, height)
    
    // UI要素のスケール調整
    this.adjustUIScale()
  },

  /**
   * 全要素の再配置
   */
  repositionAllElements(this: GameScene): void {
    const layout = this.registry.get('layout')
    if (!layout) return
    
    // 手札の再配置
    this.repositionHandCards(layout)
    
    // UIパネルの再配置
    this.repositionUIElements(layout)
    
    // チャレンジエリアの再配置
    this.repositionChallengeArea(layout)
  },

  /**
   * UIスケールの調整
   */
  adjustUIScale(this: GameScene): void {
    const { width, height } = this.scale
    const baseWidth = 1280
    const baseHeight = 720
    
    // スケール係数の計算
    const scaleX = width / baseWidth
    const scaleY = height / baseHeight
    const scale = Math.min(scaleX, scaleY)
    
    // UI要素のスケール適用
    this.registry.set('uiScale', scale)
    
    // 各UI要素に適用
    const uiElements = this.children.list.filter(child => child.getData && child.getData('isUI'))
    uiElements.forEach(element => {
      if ('setScale' in element) {
        (element as any).setScale(scale)
      }
    })
  },

  /**
   * HTMLエレメントからカードオブジェクトを取得（仮実装）
   */
  getCardObjectFromElement(this: GameScene, element: HTMLElement): Phaser.GameObjects.Container | null {
    // 実際の実装では、elementのIDやデータ属性からカードを特定
    // ここでは仮実装
    return null
  },

  /**
   * カードをアニメーション付きでプレイ（仮実装）
   */
  playCardWithAnimation(this: GameScene, card: Phaser.GameObjects.Container): void {
    // 実装は GameScene 側で行う
  },

  /**
   * カードを手札に戻す（仮実装）
   */
  returnCardToHand(this: GameScene, card: Phaser.GameObjects.Container): void {
    // 実装は GameScene 側で行う
  },

  /**
   * ドロップゾーンのハイライト更新（仮実装）
   */
  updateDropZoneHighlight(this: GameScene, card: Phaser.GameObjects.Container): void {
    // 実装は GameScene 側で行う
  },

  /**
   * 指定位置のドロップゾーンを取得（仮実装）
   */
  getDropZoneAt(this: GameScene, x: number, y: number): any {
    // 実装は GameScene 側で行う
    return null
  },

  /**
   * カードをドロップゾーンに配置（仮実装）
   */
  dropCardToZone(this: GameScene, card: Phaser.GameObjects.Container, zone: any): void {
    // 実装は GameScene 側で行う
  },

  /**
   * カードを元の位置に戻す（仮実装）
   */
  returnCardToOriginalPosition(this: GameScene, card: Phaser.GameObjects.Container): void {
    // 実装は GameScene 側で行う
  },

  /**
   * カード詳細を表示（仮実装）
   */
  showCardDetail(this: GameScene, card: Phaser.GameObjects.Container): void {
    // 実装は GameScene 側で行う
  },

  /**
   * カード選択の切り替え（仮実装）
   */
  toggleCardSelection(this: GameScene, card: Phaser.GameObjects.Container): void {
    // 実装は GameScene 側で行う
  },

  /**
   * 手札の再配置（仮実装）
   */
  repositionHandCards(this: GameScene, layout: any): void {
    // 実装は GameScene 側で行う
  },

  /**
   * UI要素の再配置（仮実装）
   */
  repositionUIElements(this: GameScene, layout: any): void {
    // 実装は GameScene 側で行う
  },

  /**
   * チャレンジエリアの再配置（仮実装）
   */
  repositionChallengeArea(this: GameScene, layout: any): void {
    // 実装は GameScene 側で行う
  }
}