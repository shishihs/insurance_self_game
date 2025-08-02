/**
 * キーボード操作コントローラー
 * アクセシビリティ向上のためのキーボードナビゲーション実装
 */
export class KeyboardController {
  private readonly scene: Phaser.Scene
  private enabled: boolean = false
  
  // フォーカス管理
  private focusableElements: Phaser.GameObjects.GameObject[] = []
  private currentFocusIndex: number = -1
  private focusIndicator?: Phaser.GameObjects.Graphics
  
  // キーバインディング
  private readonly keyBindings = {
    // ナビゲーション
    TAB: 'next',
    SHIFT_TAB: 'previous',
    LEFT: 'left',
    RIGHT: 'right',
    UP: 'up',
    DOWN: 'down',
    
    // アクション
    SPACE: 'select',
    ENTER: 'confirm',
    ESC: 'cancel',
    
    // ゲーム固有
    D: 'draw',
    C: 'challenge',
    E: 'endTurn',
    
    // 数字キー（カード選択）
    ONE: 'card1',
    TWO: 'card2',
    THREE: 'card3',
    FOUR: 'card4',
    FIVE: 'card5',
    SIX: 'card6',
    SEVEN: 'card7'
  }
  
  // コールバック
  private readonly callbacks: Map<string, () => void> = new Map()
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene
    this.setupKeyboardListeners()
    this.createFocusIndicator()
  }
  
  /**
   * キーボードコントローラーを有効化
   */
  enable(): void {
    this.enabled = true
    this.showAccessibilityHint()
  }
  
  /**
   * キーボードコントローラーを無効化
   */
  disable(): void {
    this.enabled = false
    this.clearFocus()
  }
  
  /**
   * フォーカス可能な要素を登録
   */
  registerFocusableElement(element: Phaser.GameObjects.GameObject, callback?: () => void): void {
    this.focusableElements.push(element)
    
    // 要素にインデックスを保存
    element.setData('focusIndex', this.focusableElements.length - 1)
    
    // コールバックがあれば登録
    if (callback) {
      this.callbacks.set(`element_${this.focusableElements.length - 1}`, callback)
    }
  }
  
  /**
   * フォーカス可能な要素を解除
   */
  unregisterFocusableElement(element: Phaser.GameObjects.GameObject): void {
    const index = this.focusableElements.indexOf(element)
    if (index > -1) {
      this.focusableElements.splice(index, 1)
      this.callbacks.delete(`element_${index}`)
      
      // フォーカスインデックスを調整
      if (this.currentFocusIndex >= index) {
        this.currentFocusIndex--
      }
    }
  }
  
  /**
   * アクションコールバックを登録
   */
  registerActionCallback(action: string, callback: () => void): void {
    this.callbacks.set(action, callback)
  }
  
  /**
   * キーボードリスナーをセットアップ
   */
  private setupKeyboardListeners(): void {
    const keyboard = this.scene.input.keyboard
    if (!keyboard) return
    
    // TABキー（次の要素へ）
    keyboard.on('keydown-TAB', (event: KeyboardEvent) => {
      if (!this.enabled) return
      event.preventDefault()
      
      if (event.shiftKey) {
        this.focusPrevious()
      } else {
        this.focusNext()
      }
    })
    
    // 矢印キー
    keyboard.on('keydown-LEFT', () => { this.handleArrowKey('left'); })
    keyboard.on('keydown-RIGHT', () => { this.handleArrowKey('right'); })
    keyboard.on('keydown-UP', () => { this.handleArrowKey('up'); })
    keyboard.on('keydown-DOWN', () => { this.handleArrowKey('down'); })
    
    // アクションキー
    keyboard.on('keydown-SPACE', (event: KeyboardEvent) => {
      if (!this.enabled) return
      event.preventDefault()
      this.handleAction('select')
    })
    
    keyboard.on('keydown-ENTER', () => {
      if (!this.enabled) return
      this.handleAction('confirm')
    })
    
    keyboard.on('keydown-ESC', () => {
      if (!this.enabled) return
      this.handleAction('cancel')
    })
    
    // ゲーム固有キー
    keyboard.on('keydown-D', () => {
      if (!this.enabled) return
      this.handleAction('draw')
    })
    
    keyboard.on('keydown-C', () => {
      if (!this.enabled) return
      this.handleAction('challenge')
    })
    
    keyboard.on('keydown-E', () => {
      if (!this.enabled) return
      this.handleAction('endTurn')
    })
    
    // 数字キー（1-7）
    for (let i = 1; i <= 7; i++) {
      keyboard.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN'][i - 1]}`, () => {
        if (!this.enabled) return
        this.handleAction(`card${i}`)
      })
    }
  }
  
  /**
   * フォーカスインジケーターを作成
   */
  private createFocusIndicator(): void {
    this.focusIndicator = this.scene.add.graphics()
    this.focusIndicator.setDepth(10000)
    this.focusIndicator.setVisible(false)
  }
  
  /**
   * 次の要素にフォーカス
   */
  private focusNext(): void {
    if (this.focusableElements.length === 0) return
    
    this.currentFocusIndex++
    if (this.currentFocusIndex >= this.focusableElements.length) {
      this.currentFocusIndex = 0
    }
    
    this.updateFocusIndicator()
  }
  
  /**
   * 前の要素にフォーカス
   */
  private focusPrevious(): void {
    if (this.focusableElements.length === 0) return
    
    this.currentFocusIndex--
    if (this.currentFocusIndex < 0) {
      this.currentFocusIndex = this.focusableElements.length - 1
    }
    
    this.updateFocusIndicator()
  }
  
  /**
   * 矢印キーの処理
   */
  private handleArrowKey(direction: string): void {
    if (!this.enabled) return
    
    // 現在フォーカスされている要素に応じて処理
    const currentElement = this.getCurrentFocusedElement()
    if (!currentElement) {
      // フォーカスがない場合は最初の要素にフォーカス
      this.currentFocusIndex = 0
      this.updateFocusIndicator()
      return
    }
    
    // 方向に応じて最も近い要素を見つける
    const nearestIndex = this.findNearestElement(currentElement, direction)
    if (nearestIndex !== -1) {
      this.currentFocusIndex = nearestIndex
      this.updateFocusIndicator()
    }
  }
  
  /**
   * アクションを処理
   */
  private handleAction(action: string): void {
    // アクション固有のコールバックを実行
    const actionCallback = this.callbacks.get(action)
    if (actionCallback) {
      actionCallback()
      return
    }
    
    // 現在フォーカスされている要素のコールバックを実行
    if (action === 'select' || action === 'confirm') {
      const element = this.getCurrentFocusedElement()
      if (element) {
        const elementCallback = this.callbacks.get(`element_${this.currentFocusIndex}`)
        if (elementCallback) {
          elementCallback()
        }
      }
    }
  }
  
  /**
   * フォーカスインジケーターを更新
   */
  private updateFocusIndicator(): void {
    if (!this.focusIndicator) return
    
    const element = this.getCurrentFocusedElement()
    if (!element) {
      this.focusIndicator.setVisible(false)
      return
    }
    
    // 要素の境界を取得
    const bounds = this.getElementBounds(element)
    if (!bounds) return
    
    // フォーカスインジケーターを描画
    this.focusIndicator.clear()
    this.focusIndicator.lineStyle(3, 0xffff00, 1)
    this.focusIndicator.strokeRoundedRect(
      bounds.x - 5,
      bounds.y - 5,
      bounds.width + 10,
      bounds.height + 10,
      5
    )
    this.focusIndicator.setVisible(true)
    
    // パルスアニメーション
    this.scene.tweens.add({
      targets: this.focusIndicator,
      alpha: { from: 1, to: 0.5 },
      duration: 500,
      yoyo: true,
      repeat: -1
    })
  }
  
  /**
   * 現在フォーカスされている要素を取得
   */
  private getCurrentFocusedElement(): Phaser.GameObjects.GameObject | null {
    if (this.currentFocusIndex < 0 || this.currentFocusIndex >= this.focusableElements.length) {
      return null
    }
    return this.focusableElements[this.currentFocusIndex]
  }
  
  /**
   * 要素の境界を取得
   */
  private getElementBounds(element: Phaser.GameObjects.GameObject): { x: number, y: number, width: number, height: number } | null {
    if ('getBounds' in element) {
      const bounds = (element as any).getBounds()
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }
    }
    
    // Containerの場合
    if (element instanceof Phaser.GameObjects.Container) {
      const bounds = element.getBounds()
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }
    }
    
    return null
  }
  
  /**
   * 指定方向の最も近い要素を見つける
   */
  private findNearestElement(currentElement: Phaser.GameObjects.GameObject, direction: string): number {
    const currentBounds = this.getElementBounds(currentElement)
    if (!currentBounds) return -1
    
    let nearestIndex = -1
    let nearestDistance = Infinity
    
    for (let i = 0; i < this.focusableElements.length; i++) {
      if (i === this.currentFocusIndex) continue
      
      const element = this.focusableElements[i]
      const bounds = this.getElementBounds(element)
      if (!bounds) continue
      
      // 方向に応じた判定
      let isInDirection = false
      let distance = 0
      
      switch (direction) {
        case 'left':
          isInDirection = bounds.x + bounds.width < currentBounds.x
          distance = currentBounds.x - (bounds.x + bounds.width)
          break
        case 'right':
          isInDirection = bounds.x > currentBounds.x + currentBounds.width
          distance = bounds.x - (currentBounds.x + currentBounds.width)
          break
        case 'up':
          isInDirection = bounds.y + bounds.height < currentBounds.y
          distance = currentBounds.y - (bounds.y + bounds.height)
          break
        case 'down':
          isInDirection = bounds.y > currentBounds.y + currentBounds.height
          distance = bounds.y - (currentBounds.y + currentBounds.height)
          break
      }
      
      if (isInDirection && distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = i
      }
    }
    
    return nearestIndex
  }
  
  /**
   * フォーカスをクリア
   */
  private clearFocus(): void {
    this.currentFocusIndex = -1
    if (this.focusIndicator) {
      this.focusIndicator.setVisible(false)
    }
  }
  
  /**
   * アクセシビリティヒントを表示
   */
  private showAccessibilityHint(): void {
    const hintText = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      50,
      'キーボード操作が有効です (Tab: 移動, Space/Enter: 選択, Esc: キャンセル)',
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#000000',
        padding: { x: 10, y: 5 }
      }
    )
    hintText.setOrigin(0.5)
    hintText.setDepth(10001)
    
    // 3秒後にフェードアウト
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: hintText,
        alpha: 0,
        duration: 500,
        onComplete: () => { hintText.destroy(); }
      })
    })
  }
  
  /**
   * クリーンアップ
   */
  destroy(): void {
    this.disable()
    this.focusableElements = []
    this.callbacks.clear()
    
    if (this.focusIndicator) {
      this.focusIndicator.destroy()
    }
  }
}