/**
 * スクリーンリーダー対応マネージャー
 * ARIA Live Regionsとセマンティックマークアップによる
 * アクセシブルなゲーム状態通知システム
 */

export interface AnnouncementOptions {
  priority: 'polite' | 'assertive'
  persist?: boolean
  delay?: number
  interrupt?: boolean
}

export interface GameStateAnnouncement {
  type: 'game_start' | 'turn_change' | 'card_draw' | 'challenge_start' | 'challenge_result' | 'game_end'
  message: string
  context?: Record<string, any>
}

export class ScreenReaderManager {
  private readonly liveRegions: Map<string, HTMLElement> = new Map()
  private gameStatusElement: HTMLElement
  private cardDetailsElement: HTMLElement
  private announcementQueue: Array<{ message: string; options: AnnouncementOptions }> = []
  private isProcessingQueue: boolean = false

  constructor() {
    this.createLiveRegions()
    this.createGameStatusElements()
    this.setupAriaDescriptions()
  }

  /**
   * メッセージをアナウンス
   */
  announce(message: string, options: AnnouncementOptions = { priority: 'polite' }): void {
    if (options.interrupt) {
      this.clearQueue()
    }

    this.announcementQueue.push({ message, options })
    this.processQueue()
  }

  /**
   * ゲーム状態の変更をアナウンス
   */
  announceGameState(announcement: GameStateAnnouncement): void {
    const { type, message, context } = announcement
    
    // ゲーム状態要素を更新
    this.updateGameStatus(type, message, context)
    
    // 適切な優先度でアナウンス
    const priority = this.getPriorityForGameState(type)
    this.announce(message, { priority, persist: true })
  }

  /**
   * カード情報の詳細説明
   */
  announceCardDetails(card: any): void {
    const description = this.createCardDescription(card)
    this.cardDetailsElement.textContent = description
    this.announce(`カード選択: ${description}`, { priority: 'polite' })
  }

  /**
   * エラーメッセージのアナウンス
   */
  announceError(message: string): void {
    this.announce(`エラー: ${message}`, { priority: 'assertive', interrupt: true })
  }

  /**
   * 成功メッセージのアナウンス
   */
  announceSuccess(message: string): void {
    this.announce(`成功: ${message}`, { priority: 'polite' })
  }

  /**
   * 進捗状況のアナウンス
   */
  announceProgress(current: number, total: number, description: string): void {
    const percentage = Math.round((current / total) * 100)
    const message = `${description}: ${current}/${total} (${percentage}%)`
    this.announce(message, { priority: 'polite' })
  }

  /**
   * 選択肢の説明
   */
  announceOptions(options: string[], currentIndex: number): void {
    const totalOptions = options.length
    const currentOption = options[currentIndex]
    const message = `選択肢 ${currentIndex + 1}/${totalOptions}: ${currentOption}`
    this.announce(message, { priority: 'polite' })
  }

  /**
   * タイマー情報のアナウンス
   */
  announceTimer(remainingTime: number, unit: 'seconds' | 'minutes' = 'seconds'): void {
    const unitText = unit === 'seconds' ? '秒' : '分'
    let message: string

    if (remainingTime <= 0) {
      message = '時間切れです'
    } else if (remainingTime <= 10 && unit === 'seconds') {
      message = `残り${remainingTime}${unitText}`
    } else if (remainingTime <= 60 && unit === 'seconds') {
      message = `残り${remainingTime}${unitText}`
    } else {
      message = `残り時間: ${remainingTime}${unitText}`
    }

    const priority = remainingTime <= 10 ? 'assertive' : 'polite'
    this.announce(message, { priority })
  }

  /**
   * 画面の状態変更をアナウンス
   */
  announceScreenChange(screenName: string, description?: string): void {
    let message = `画面が変更されました: ${screenName}`
    if (description) {
      message += `. ${description}`
    }
    this.announce(message, { priority: 'assertive', persist: true })
  }

  /**
   * キーボードショートカットのヘルプ
   */
  announceKeyboardHelp(): void {
    const shortcuts = [
      'Tabキーで次の要素に移動',
      'Shift+Tabで前の要素に移動',
      'Enterキーまたはスペースキーで選択',
      'F1キーでヘルプを表示'
    ]
    
    const message = `キーボードショートカット: ${shortcuts.join(', ')}`
    this.announce(message, { priority: 'polite', persist: true })
  }

  /**
   * ゲーム統計のアナウンス
   */
  announceGameStats(stats: Record<string, number | string>): void {
    const statMessages = Object.entries(stats).map(([key, value]) => {
      return `${this.translateStatKey(key)}: ${value}`
    })
    
    const message = `ゲーム統計. ${statMessages.join(', ')}`
    this.announce(message, { priority: 'polite', persist: true })
  }

  /**
   * 領域の状態説明
   */
  announceRegionStatus(regionName: string, items: any[]): void {
    const itemCount = items.length
    const itemType = this.getItemType(items)
    
    let message: string
    if (itemCount === 0) {
      message = `${regionName}は空です`
    } else if (itemCount === 1) {
      message = `${regionName}に${itemType}が1つあります`
    } else {
      message = `${regionName}に${itemType}が${itemCount}個あります`
    }
    
    this.announce(message, { priority: 'polite' })
  }

  /**
   * ドラッグ&ドロップ操作のアナウンス
   */
  announceDragDrop(phase: 'start' | 'move' | 'drop' | 'cancel', details: any): void {
    let message: string
    
    switch (phase) {
      case 'start':
        message = `${details.itemName}のドラッグを開始しました`
        break
      case 'move':
        message = `${details.targetName}の上に移動中`
        break
      case 'drop':
        message = details.success 
          ? `${details.targetName}に${details.itemName}をドロップしました`
          : `ドロップに失敗しました: ${details.reason}`
        break
      case 'cancel':
        message = 'ドラッグ操作をキャンセルしました'
        break
    }
    
    const priority = phase === 'drop' && !details.success ? 'assertive' : 'polite'
    this.announce(message, { priority })
  }

  private createLiveRegions(): void {
    // Polite live region
    const politeRegion = document.createElement('div')
    politeRegion.setAttribute('aria-live', 'polite')
    politeRegion.setAttribute('aria-relevant', 'additions text')
    politeRegion.setAttribute('aria-atomic', 'false')
    politeRegion.className = 'sr-only'
    politeRegion.id = 'live-region-polite'
    document.body.appendChild(politeRegion)
    this.liveRegions.set('polite', politeRegion)

    // Assertive live region
    const assertiveRegion = document.createElement('div')
    assertiveRegion.setAttribute('aria-live', 'assertive')
    assertiveRegion.setAttribute('aria-relevant', 'additions text')
    assertiveRegion.setAttribute('aria-atomic', 'true')
    assertiveRegion.className = 'sr-only'
    assertiveRegion.id = 'live-region-assertive'
    document.body.appendChild(assertiveRegion)
    this.liveRegions.set('assertive', assertiveRegion)
  }

  private createGameStatusElements(): void {
    // ゲーム状態を説明する要素
    this.gameStatusElement = document.createElement('div')
    this.gameStatusElement.id = 'game-status'
    this.gameStatusElement.className = 'sr-only'
    this.gameStatusElement.setAttribute('aria-label', 'ゲーム状態')
    document.body.appendChild(this.gameStatusElement)

    // カード詳細を説明する要素
    this.cardDetailsElement = document.createElement('div')
    this.cardDetailsElement.id = 'card-details'
    this.cardDetailsElement.className = 'sr-only'
    this.cardDetailsElement.setAttribute('aria-label', 'カード詳細')
    document.body.appendChild(this.cardDetailsElement)
  }

  private setupAriaDescriptions(): void {
    // Screen Reader Only用のCSSを追加
    const style = document.createElement('style')
    style.textContent = `
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      
      .sr-only-focusable:focus {
        position: static;
        width: auto;
        height: auto;
        padding: inherit;
        margin: inherit;
        overflow: visible;
        clip: auto;
        white-space: normal;
      }
    `
    document.head.appendChild(style)
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.announcementQueue.length === 0) return

    this.isProcessingQueue = true

    while (this.announcementQueue.length > 0) {
      const { message, options } = this.announcementQueue.shift()!
      
      if (options.delay) {
        await this.delay(options.delay)
      }

      await this.performAnnouncement(message, options)
      
      // メッセージ間の間隔
      await this.delay(100)
    }

    this.isProcessingQueue = false
  }

  private async performAnnouncement(message: string, options: AnnouncementOptions): Promise<void> {
    const region = this.liveRegions.get(options.priority)
    if (!region) return

    // 既存のメッセージをクリア（必要に応じて）
    if (!options.persist) {
      region.textContent = ''
      await this.delay(10) // DOM更新を待つ
    }

    // 新しいメッセージを追加
    if (options.persist) {
      const messageElement = document.createElement('div')
      messageElement.textContent = message
      region.appendChild(messageElement)
      
      // 一定時間後に削除（永続化しない場合）
      setTimeout(() => {
        if (messageElement.parentNode) {
          messageElement.parentNode.removeChild(messageElement)
        }
      }, 5000)
    } else {
      region.textContent = message
    }
  }

  private updateGameStatus(type: string, message: string, context?: Record<string, any>): void {
    const statusInfo = {
      type,
      message,
      timestamp: new Date().toISOString(),
      ...context
    }

    this.gameStatusElement.setAttribute('data-game-state', JSON.stringify(statusInfo))
    this.gameStatusElement.textContent = message
  }

  private createCardDescription(card: any): string {
    const parts = [card.name]
    
    if (card.type) {
      parts.push(`種類: ${this.translateCardType(card.type)}`)
    }
    
    if (card.power !== undefined) {
      parts.push(`パワー: ${card.power}`)
    }
    
    if (card.cost !== undefined) {
      parts.push(`コスト: ${card.cost}`)
    }
    
    if (card.description) {
      parts.push(`説明: ${card.description}`)
    }

    return parts.join(', ')
  }

  private getPriorityForGameState(type: string): 'polite' | 'assertive' {
    const assertiveStates = ['challenge_result', 'game_end', 'error']
    return assertiveStates.includes(type) ? 'assertive' : 'polite'
  }

  private translateStatKey(key: string): string {
    const translations: Record<string, string> = {
      'vitality': '活力',
      'turn': 'ターン',
      'cardsInHand': '手札枚数',
      'challengesCompleted': '完了チャレンジ数',
      'insuranceCards': '保険カード数'
    }
    return translations[key] || key
  }

  private translateCardType(type: string): string {
    const translations: Record<string, string> = {
      'life': 'ライフカード',
      'insurance': '保険カード',
      'challenge': 'チャレンジカード',
      'dream': 'ドリームカード'
    }
    return translations[type] || type
  }

  private getItemType(items: any[]): string {
    if (items.length === 0) return 'アイテム'
    
    const firstItem = items[0]
    if (firstItem.type) {
      return this.translateCardType(firstItem.type)
    }
    
    return 'アイテム'
  }

  private clearQueue(): void {
    this.announcementQueue = []
    this.liveRegions.forEach(region => {
      region.textContent = ''
    })
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.liveRegions.forEach(region => {
      if (region.parentNode) {
        region.parentNode.removeChild(region)
      }
    })
    
    if (this.gameStatusElement?.parentNode) {
      this.gameStatusElement.parentNode.removeChild(this.gameStatusElement)
    }
    
    if (this.cardDetailsElement?.parentNode) {
      this.cardDetailsElement.parentNode.removeChild(this.cardDetailsElement)
    }
    
    this.clearQueue()
  }
}