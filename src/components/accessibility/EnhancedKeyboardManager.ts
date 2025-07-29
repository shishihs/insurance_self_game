/**
 * 拡張キーボードマネージャー
 * WCAG 2.1 AA準拠の包括的キーボードナビゲーション実装
 */

import { KeyboardManager, type FocusableElement, type KeyboardShortcut } from './KeyboardManager'
import { ariaManager } from './ARIAManager'

export interface KeyboardNavigationGroup {
  id: string
  name: string
  elements: HTMLElement[]
  type: 'linear' | 'grid' | 'tree' | 'menu' | 'tab'
  wrap: boolean
  roving: boolean
  orientation?: 'horizontal' | 'vertical' | 'both'
}

export interface GameSpecificShortcuts {
  playCard: string
  selectInsurance: string
  skipTurn: string
  showHelp: string
  toggleAccessibilityPanel: string
  announceGameState: string
  repeatLastAnnouncement: string
}

export interface KeyboardNavigationState {
  currentGroup: string | null
  currentIndex: number
  navigationHistory: string[]
  rovingFocus: boolean
  skipLinks: boolean
}

export class EnhancedKeyboardManager extends KeyboardManager {
  private navigationGroups = new Map<string, KeyboardNavigationGroup>()
  private navigationStack: string[] = []
  private currentState: KeyboardNavigationState = {
    currentGroup: null,
    currentIndex: -1,
    navigationHistory: [],
    rovingFocus: false,
    skipLinks: false
  }
  private gameShortcuts: GameSpecificShortcuts = {
    playCard: 'Space',
    selectInsurance: 'i',
    skipTurn: 's',
    showHelp: 'F1',
    toggleAccessibilityPanel: 'F2',
    announceGameState: 'F3',
    repeatLastAnnouncement: 'F4'
  }
  private lastAnnouncement = ''
  private customKeyHandlers = new Map<string, (event: KeyboardEvent) => void>()

  constructor() {
    super()
    this.setupGameSpecificShortcuts()
    this.setupNavigationGroups()
    this.setupRovingFocus()
  }

  /**
   * ナビゲーショングループの登録
   */
  public registerNavigationGroup(group: KeyboardNavigationGroup): void {
    this.navigationGroups.set(group.id, group)
    
    // 要素にARIA属性を設定
    group.elements.forEach((element, index) => {
      ariaManager.setARIA(element, {
        posInSet: index + 1,
        setSize: group.elements.length
      })
      
      if (group.roving) {
        element.setAttribute('tabindex', index === 0 ? '0' : '-1')
      }
    })
  }

  /**
   * ゲームカードエリアの設定
   */
  public setupGameCardArea(cardContainer: HTMLElement, cards: HTMLElement[]): void {
    this.registerNavigationGroup({
      id: 'game-cards',
      name: 'ゲームカード',
      elements: cards,
      type: 'grid',
      wrap: true,
      roving: true,
      orientation: 'both'
    })

    // カード特有のキーボード操作
    cards.forEach((card, index) => {
      this.registerFocusableElement(card, {
        priority: 100 - index,
        group: 'game-cards',
        onFocus: () => this.announceCardFocus(card),
        onActivate: () => this.handleCardActivation(card)
      })
    })
  }

  /**
   * ドロップゾーンエリアの設定
   */
  public setupDropZoneArea(dropZones: HTMLElement[]): void {
    this.registerNavigationGroup({
      id: 'drop-zones',
      name: 'ドロップゾーン',
      elements: dropZones,
      type: 'linear',
      wrap: true,
      roving: false,
      orientation: 'horizontal'
    })

    dropZones.forEach((zone, index) => {
      this.registerFocusableElement(zone, {
        priority: 200 + index,
        group: 'drop-zones',
        onFocus: () => this.announceDropZoneFocus(zone),
        onActivate: () => this.handleDropZoneActivation(zone)
      })
    })
  }

  /**
   * ゲームUIエリアの設定
   */
  public setupGameUIArea(uiElements: { buttons: HTMLElement[], status: HTMLElement[], modals: HTMLElement[] }): void {
    // ボタングループ
    this.registerNavigationGroup({
      id: 'ui-buttons',
      name: 'ゲームボタン',
      elements: uiElements.buttons,
      type: 'linear',
      wrap: false,
      roving: false,
      orientation: 'horizontal'
    })

    // ステータス表示グループ
    this.registerNavigationGroup({
      id: 'game-status',
      name: 'ゲームステータス',
      elements: uiElements.status,
      type: 'linear',
      wrap: false,
      roving: false,
      orientation: 'vertical'
    })

    // モーダルグループ
    uiElements.modals.forEach((modal, index) => {
      this.registerNavigationGroup({
        id: `modal-${index}`,
        name: 'モーダルダイアログ',
        elements: Array.from(modal.querySelectorAll('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')),
        type: 'linear',
        wrap: true,
        roving: false,
        orientation: 'vertical'
      })
    })
  }

  /**
   * グリッドナビゲーションの実装
   */
  private navigateGrid(group: KeyboardNavigationGroup, direction: 'up' | 'down' | 'left' | 'right'): void {
    const elements = group.elements
    const currentIndex = this.currentState.currentIndex
    
    // グリッドの次元を計算（仮定：正方形に近いレイアウト）
    const columns = Math.ceil(Math.sqrt(elements.length))
    const rows = Math.ceil(elements.length / columns)
    
    const currentRow = Math.floor(currentIndex / columns)
    const currentCol = currentIndex % columns
    
    let newRow = currentRow
    let newCol = currentCol
    
    switch (direction) {
      case 'up':
        newRow = group.wrap ? (currentRow - 1 + rows) % rows : Math.max(0, currentRow - 1)
        break
      case 'down':
        newRow = group.wrap ? (currentRow + 1) % rows : Math.min(rows - 1, currentRow + 1)
        break
      case 'left':
        newCol = group.wrap ? (currentCol - 1 + columns) % columns : Math.max(0, currentCol - 1)
        break
      case 'right':
        newCol = group.wrap ? (currentCol + 1) % columns : Math.min(columns - 1, currentCol + 1)
        break
    }
    
    const newIndex = newRow * columns + newCol
    if (newIndex < elements.length) {
      this.focusElementInGroup(group.id, newIndex)
    }
  }

  /**
   * メニューナビゲーションの実装
   */
  private navigateMenu(group: KeyboardNavigationGroup, direction: 'up' | 'down'): void {
    const elements = group.elements
    const currentIndex = this.currentState.currentIndex
    
    let newIndex: number
    if (direction === 'down') {
      newIndex = group.wrap ? (currentIndex + 1) % elements.length : Math.min(elements.length - 1, currentIndex + 1)
    } else {
      newIndex = group.wrap ? (currentIndex - 1 + elements.length) % elements.length : Math.max(0, currentIndex - 1)
    }
    
    this.focusElementInGroup(group.id, newIndex)
  }

  /**
   * タブナビゲーションの実装
   */
  private navigateTab(group: KeyboardNavigationGroup, direction: 'left' | 'right'): void {
    const elements = group.elements
    const currentIndex = this.currentState.currentIndex
    
    let newIndex: number
    if (direction === 'right') {
      newIndex = group.wrap ? (currentIndex + 1) % elements.length : Math.min(elements.length - 1, currentIndex + 1)
    } else {
      newIndex = group.wrap ? (currentIndex - 1 + elements.length) % elements.length : Math.max(0, currentIndex - 1)
    }
    
    this.focusElementInGroup(group.id, newIndex)
    
    // タブの選択状態を更新
    elements.forEach((tab, index) => {
      ariaManager.setARIA(tab, { selected: index === newIndex })
    })
  }

  /**
   * グループ内の特定要素にフォーカス
   */
  private focusElementInGroup(groupId: string, index: number): void {
    const group = this.navigationGroups.get(groupId)
    if (!group || index < 0 || index >= group.elements.length) return
    
    const element = group.elements[index]
    
    // Roving Focusの場合はtabindexを更新
    if (group.roving) {
      group.elements.forEach((el, i) => {
        el.setAttribute('tabindex', i === index ? '0' : '-1')
      })
    }
    
    element.focus()
    this.currentState.currentIndex = index
    this.currentState.currentGroup = groupId
    
    // ナビゲーション履歴を更新
    this.currentState.navigationHistory.push(`${groupId}:${index}`)
    if (this.currentState.navigationHistory.length > 50) {
      this.currentState.navigationHistory.shift()
    }
  }

  /**
   * ゲーム固有のショートカット設定
   */
  private setupGameSpecificShortcuts(): void {
    // カードをプレイ
    this.registerShortcut({
      key: this.gameShortcuts.playCard,
      description: 'カードをプレイ',
      action: () => this.handleCardPlay(),
      global: false
    })

    // 保険を選択
    this.registerShortcut({
      key: this.gameShortcuts.selectInsurance,
      description: '保険を選択',
      action: () => this.handleInsuranceSelection(),
      global: true
    })

    // ターンをスキップ
    this.registerShortcut({
      key: this.gameShortcuts.skipTurn,
      description: 'ターンをスキップ',
      action: () => this.handleTurnSkip(),
      global: true
    })

    // ヘルプ表示
    this.registerShortcut({
      key: this.gameShortcuts.showHelp,
      description: 'ヘルプを表示',
      action: () => this.toggleHelp(),
      global: true
    })

    // アクセシビリティパネル表示
    this.registerShortcut({
      key: this.gameShortcuts.toggleAccessibilityPanel,
      description: 'アクセシビリティパネル切り替え',
      action: () => this.toggleAccessibilityPanel(),
      global: true
    })

    // ゲーム状態の読み上げ
    this.registerShortcut({
      key: this.gameShortcuts.announceGameState,
      description: 'ゲーム状態を読み上げ',
      action: () => this.announceCurrentGameState(),
      global: true
    })

    // 最後のアナウンス繰り返し
    this.registerShortcut({
      key: this.gameShortcuts.repeatLastAnnouncement,
      description: '最後のアナウンスを繰り返し',
      action: () => this.repeatLastAnnouncement(),
      global: true
    })
  }

  /**
   * カスタムキーハンドラーの登録
   */
  public registerCustomKeyHandler(key: string, handler: (event: KeyboardEvent) => void): void {
    this.customKeyHandlers.set(key.toLowerCase(), handler)
  }

  /**
   * 拡張キーボードイベントハンドリング
   */
  protected handleKeyDown(event: KeyboardEvent): void {
    // カスタムハンドラーをチェック
    const customHandler = this.customKeyHandlers.get(event.key.toLowerCase())
    if (customHandler) {
      customHandler(event)
      return
    }

    // 現在のグループを取得
    const currentGroup = this.currentState.currentGroup 
      ? this.navigationGroups.get(this.currentState.currentGroup)
      : null

    // グループタイプ別のナビゲーション
    if (currentGroup) {
      switch (currentGroup.type) {
        case 'grid':
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault()
            const direction = event.key.replace('Arrow', '').toLowerCase() as 'up' | 'down' | 'left' | 'right'
            this.navigateGrid(currentGroup, direction)
            return
          }
          break

        case 'menu':
          if (['ArrowUp', 'ArrowDown'].includes(event.key)) {
            event.preventDefault()
            const direction = event.key.replace('Arrow', '').toLowerCase() as 'up' | 'down'
            this.navigateMenu(currentGroup, direction)
            return
          }
          break

        case 'tab':
          if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
            event.preventDefault()
            const direction = event.key.replace('Arrow', '').toLowerCase() as 'left' | 'right'
            this.navigateTab(currentGroup, direction)
            return
          }
          break
      }
    }

    // デフォルトのキーボード処理
    super.handleKeyDown(event)

    // 追加のキー処理
    switch (event.key) {
      case 'Home':
        if (event.ctrlKey) {
          event.preventDefault()
          this.focusFirstElement()
        }
        break

      case 'End':
        if (event.ctrlKey) {
          event.preventDefault()
          this.focusLastElement()
        }
        break

      case 'PageUp':
        event.preventDefault()
        this.navigateToGroup('previous')
        break

      case 'PageDown':
        event.preventDefault()
        this.navigateToGroup('next')
        break

      case 'Escape':
        event.preventDefault()
        this.handleEscape()
        break
    }
  }

  private setupNavigationGroups(): void {
    // スキップリンクグループ
    const skipLinks = document.querySelectorAll('.skip-link') as NodeListOf<HTMLElement>
    if (skipLinks.length > 0) {
      this.registerNavigationGroup({
        id: 'skip-links',
        name: 'スキップリンク',
        elements: Array.from(skipLinks),
        type: 'linear',
        wrap: false,
        roving: false,
        orientation: 'horizontal'
      })
    }
  }

  private setupRovingFocus(): void {
    // Roving Focusの設定
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      const groupId = this.findElementGroup(target)
      
      if (groupId) {
        const group = this.navigationGroups.get(groupId)
        if (group?.roving) {
          const index = group.elements.indexOf(target)
          if (index >= 0) {
            this.currentState.currentGroup = groupId
            this.currentState.currentIndex = index
          }
        }
      }
    })
  }

  private findElementGroup(element: HTMLElement): string | null {
    for (const [groupId, group] of this.navigationGroups) {
      if (group.elements.includes(element)) {
        return groupId
      }
    }
    return null
  }

  private announceCardFocus(card: HTMLElement): void {
    const cardData = this.getCardData(card)
    const message = `カード選択: ${cardData.name}, タイプ: ${cardData.type}, パワー: ${cardData.power}`
    this.announceMessage(message)
  }

  private announceDropZoneFocus(zone: HTMLElement): void {
    const zoneName = zone.getAttribute('aria-label') || 'ドロップゾーン'
    const message = `${zoneName}にフォーカス`
    this.announceMessage(message)
  }

  private handleCardActivation(card: HTMLElement): void {
    const cardData = this.getCardData(card)
    const message = `${cardData.name}を選択しました`
    this.announceMessage(message, 'assertive')
    
    // カード選択のビジュアル状態を更新
    card.setAttribute('aria-pressed', 'true')
    card.classList.add('selected')
  }

  private handleDropZoneActivation(zone: HTMLElement): void {
    const zoneName = zone.getAttribute('aria-label') || 'ドロップゾーン'
    const message = `${zoneName}を選択しました`
    this.announceMessage(message, 'assertive')
  }

  private handleCardPlay(): void {
    const selectedCard = document.querySelector('.game-card[aria-pressed="true"]') as HTMLElement
    if (selectedCard) {
      const cardData = this.getCardData(selectedCard)
      const message = `${cardData.name}をプレイしました`
      this.announceMessage(message, 'assertive')
      
      // ゲームロジックを呼び出し
      this.dispatchGameEvent('card-play', { card: cardData })
    } else {
      this.announceMessage('プレイするカードを先に選択してください', 'assertive')
    }
  }

  private handleInsuranceSelection(): void {
    const insuranceCards = document.querySelectorAll('.game-card[data-card-type="insurance"]')
    if (insuranceCards.length > 0) {
      const firstInsurance = insuranceCards[0] as HTMLElement
      firstInsurance.focus()
      this.announceMessage('保険カードを選択中', 'polite')
    } else {
      this.announceMessage('利用可能な保険カードがありません', 'assertive')
    }
  }

  private handleTurnSkip(): void {
    this.announceMessage('ターンをスキップしました', 'assertive')
    this.dispatchGameEvent('turn-skip', {})
  }

  private toggleAccessibilityPanel(): void {
    const panel = document.querySelector('.accessibility-panel') as HTMLElement
    if (panel) {
      const isVisible = panel.style.display !== 'none'
      panel.style.display = isVisible ? 'none' : 'block'
      const message = isVisible ? 'アクセシビリティパネルを閉じました' : 'アクセシビリティパネルを開きました'
      this.announceMessage(message, 'assertive')
    }
  }

  private announceCurrentGameState(): void {
    const vitality = document.querySelector('[data-vitality]')?.textContent || '不明'
    const turn = document.querySelector('[data-turn]')?.textContent || '不明'
    const cardsInHand = document.querySelectorAll('.hand .game-card').length
    
    const message = `現在の状態: 活力 ${vitality}, ターン ${turn}, 手札 ${cardsInHand}枚`
    this.announceMessage(message, 'assertive')
  }

  private repeatLastAnnouncement(): void {
    if (this.lastAnnouncement) {
      this.announceMessage(`繰り返し: ${this.lastAnnouncement}`, 'assertive')
    } else {
      this.announceMessage('繰り返すアナウンスがありません', 'polite')
    }
  }

  private announceMessage(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    this.lastAnnouncement = message
    ariaManager.announceLive(message, priority)
  }

  private navigateToGroup(direction: 'previous' | 'next'): void {
    const groupIds = Array.from(this.navigationGroups.keys())
    const currentGroupIndex = this.currentState.currentGroup 
      ? groupIds.indexOf(this.currentState.currentGroup)
      : 0
    
    let nextIndex: number
    if (direction === 'next') {
      nextIndex = (currentGroupIndex + 1) % groupIds.length
    } else {
      nextIndex = (currentGroupIndex - 1 + groupIds.length) % groupIds.length
    }
    
    const nextGroupId = groupIds[nextIndex]
    const nextGroup = this.navigationGroups.get(nextGroupId)
    
    if (nextGroup && nextGroup.elements.length > 0) {
      this.focusElementInGroup(nextGroupId, 0)
      this.announceMessage(`${nextGroup.name}に移動しました`, 'polite')
    }
  }

  private focusFirstElement(): void {
    const firstGroup = this.navigationGroups.values().next().value
    if (firstGroup) {
      this.focusElementInGroup(firstGroup.id, 0)
    }
  }

  private focusLastElement(): void {
    const groups = Array.from(this.navigationGroups.values())
    const lastGroup = groups[groups.length - 1]
    if (lastGroup) {
      this.focusElementInGroup(lastGroup.id, lastGroup.elements.length - 1)
    }
  }

  private handleEscape(): void {
    // モーダルやポップアップを閉じる
    const openModal = document.querySelector('[role="dialog"][aria-modal="true"]') as HTMLElement
    if (openModal) {
      const closeButton = openModal.querySelector('.close-button, [aria-label*="閉じる"]') as HTMLElement
      if (closeButton) {
        closeButton.click()
      }
      return
    }
    
    // 選択状態をクリア
    const selectedElements = document.querySelectorAll('[aria-pressed="true"]')
    selectedElements.forEach(el => {
      el.setAttribute('aria-pressed', 'false')
      el.classList.remove('selected')
    })
    
    this.announceMessage('選択をクリアしました', 'polite')
  }

  private getCardData(card: HTMLElement): any {
    return {
      name: card.getAttribute('data-card-name') || card.textContent?.trim() || 'カード',
      type: card.getAttribute('data-card-type') || '不明',
      power: card.getAttribute('data-card-power') || '0'
    }
  }

  private dispatchGameEvent(type: string, detail: any): void {
    const event = new CustomEvent(`game:${type}`, { detail })
    document.dispatchEvent(event)
  }

  /**
   * ナビゲーション状態のリセット
   */
  public resetNavigationState(): void {
    this.currentState = {
      currentGroup: null,
      currentIndex: -1,
      navigationHistory: [],
      rovingFocus: false,
      skipLinks: false
    }
  }

  /**
   * アクセシビリティ統計の取得
   */
  public getAccessibilityStats(): any {
    return {
      totalGroups: this.navigationGroups.size,
      totalElements: Array.from(this.navigationGroups.values())
        .reduce((sum, group) => sum + group.elements.length, 0),
      navigationHistory: this.currentState.navigationHistory.length,
      currentGroup: this.currentState.currentGroup,
      shortcuts: Array.from(this.shortcuts.keys()).length
    }
  }

  /**
   * クリーンアップ
   */
  public destroy(): void {
    super.destroy()
    this.navigationGroups.clear()
    this.customKeyHandlers.clear()
    this.resetNavigationState()
  }
}