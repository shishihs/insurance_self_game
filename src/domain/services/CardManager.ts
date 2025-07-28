import { Card } from '../entities/Card'
import { Deck } from '../entities/Deck'
import type { GameConfig } from '../types/game.types'

/**
 * カード管理の状態
 */
export interface CardManagerState {
  hand: Card[]
  discardPile: Card[]
  playerDeck: Deck
  challengeDeck: Deck
  selectedCards: Card[]
  cardChoices?: Card[]
}

/**
 * カードドロー結果
 */
export interface DrawResult {
  drawnCards: Card[]
  discardedCards: Card[] // 手札上限により捨てられたカード
}

/**
 * CardManagerのインターフェース
 */
export interface ICardManager {
  /**
   * カード管理状態を初期化
   */
  initialize(playerDeck: Deck, challengeDeck: Deck, config: GameConfig): void

  /**
   * 現在の状態を取得
   */
  getState(): CardManagerState

  /**
   * 状態を復元
   */
  setState(state: CardManagerState): void

  /**
   * 指定した枚数のカードをドロー
   */
  drawCards(count: number): DrawResult

  /**
   * カードを選択/選択解除
   */
  toggleCardSelection(card: Card): boolean

  /**
   * 選択中のカードをクリア
   */
  clearSelection(): void

  /**
   * 選択されたカードを手札から捨て札に移動
   */
  discardSelectedCards(): Card[]

  /**
   * カードを手札に追加
   */
  addToHand(card: Card): void

  /**
   * カードを捨て札に追加
   */
  addToDiscardPile(card: Card): void

  /**
   * カードをプレイヤーデッキに追加
   */
  addToPlayerDeck(card: Card): void

  /**
   * 手札上限チェックと調整
   */
  enforceHandLimit(): Card[]

  /**
   * カード選択肢を設定
   */
  setCardChoices(choices: Card[]): void

  /**
   * カード選択肢をクリア
   */
  clearCardChoices(): void

  /**
   * 指定IDのカードを選択肢から取得
   */
  getCardChoiceById(cardId: string): Card | undefined
}

/**
 * カード管理サービス（最適化版）
 */
export class CardManager implements ICardManager {
  private hand: Card[] = []
  private discardPile: Card[] = []
  private playerDeck: Deck = new Deck('Player Deck')
  private challengeDeck: Deck = new Deck('Challenge Deck')
  private selectedCards: Card[] = []
  private cardChoices?: Card[]
  private config?: GameConfig

  // パフォーマンス最適化: オブジェクトプール
  private static readonly CARD_POOLS = {
    drawResults: [] as DrawResult[],
    selectedIds: new Set<string>() // IDベースの選択状態管理
  }

  // キャッシュ
  private _cachedState?: CardManagerState
  private _stateVersion = 0

  /**
   * カード管理状態を初期化
   */
  initialize(playerDeck: Deck, challengeDeck: Deck, config: GameConfig): void {
    this.playerDeck = playerDeck
    this.challengeDeck = challengeDeck
    this.hand = []
    this.discardPile = []
    this.selectedCards = []
    this.cardChoices = undefined
    this.config = config
  }

  /**
   * 現在の状態を取得（キャッシュ最適化版）
   */
  getState(): CardManagerState {
    // キャッシュが有効な場合はそれを返す
    if (this._cachedState && this._stateVersion > 0) {
      return this._cachedState
    }

    // 新しい状態を作成
    const state: CardManagerState = {
      hand: [...this.hand],
      discardPile: [...this.discardPile],
      playerDeck: this.playerDeck.clone(),
      challengeDeck: this.challengeDeck.clone(),
      selectedCards: [...this.selectedCards],
      cardChoices: this.cardChoices ? [...this.cardChoices] : undefined
    }

    // キャッシュに保存
    this._cachedState = state
    this._stateVersion++

    return state
  }

  /**
   * 状態を復元
   */
  setState(state: CardManagerState): void {
    this.hand = [...state.hand]
    this.discardPile = [...state.discardPile]
    this.playerDeck = state.playerDeck.clone()
    this.challengeDeck = state.challengeDeck.clone()
    this.selectedCards = [...state.selectedCards]
    this.cardChoices = state.cardChoices ? [...state.cardChoices] : undefined
    
    // キャッシュを無効化
    this.invalidateCache()
  }

  /**
   * キャッシュを無効化
   */
  private invalidateCache(): void {
    this._cachedState = undefined
    this._stateVersion = 0
  }

  /**
   * 指定した枚数のカードをドロー（最適化版）
   */
  drawCards(count: number): DrawResult {
    if (!this.config) {
      throw new Error('CardManager not initialized')
    }

    // オブジェクトプールからDrawResultを取得
    let result = CardManager.CARD_POOLS.drawResults.pop()
    if (!result) {
      result = { drawnCards: [], discardedCards: [] }
    } else {
      // 配列をクリア
      result.drawnCards.length = 0
      result.discardedCards.length = 0
    }

    for (let i = 0; i < count; i++) {
      // デッキが空の場合、捨て札をシャッフルして山札に戻す
      if (this.playerDeck.isEmpty() && this.discardPile.length > 0) {
        this.reshuffleDeck()
      }
      
      const card = this.playerDeck.drawCard()
      if (card) {
        result.drawnCards.push(card)
        this.hand.push(card)
      }
    }
    
    // 手札上限チェック
    const discardedCards = this.enforceHandLimit()
    result.discardedCards.push(...discardedCards)
    
    // キャッシュを無効化
    this.invalidateCache()
    
    return result
  }

  /**
   * カードを選択/選択解除（最適化版）
   */
  toggleCardSelection(card: Card): boolean {
    const cardId = card.id
    
    // SetベースのIDチェックで高速化
    if (CardManager.CARD_POOLS.selectedIds.has(cardId)) {
      // 選択解除
      CardManager.CARD_POOLS.selectedIds.delete(cardId)
      const index = this.selectedCards.findIndex(c => c.id === cardId)
      if (index !== -1) {
        this.selectedCards.splice(index, 1)
      }
      this.invalidateCache()
      return false // 選択解除
    } else {
      // 選択
      CardManager.CARD_POOLS.selectedIds.add(cardId)
      this.selectedCards.push(card)
      this.invalidateCache()
      return true // 選択
    }
  }

  /**
   * 選択中のカードをクリア（最適化版）
   */
  clearSelection(): void {
    this.selectedCards.length = 0
    CardManager.CARD_POOLS.selectedIds.clear()
    this.invalidateCache()
  }

  /**
   * 選択されたカードを手札から捨て札に移動
   */
  discardSelectedCards(): Card[] {
    const discardedCards: Card[] = []
    
    this.selectedCards.forEach(card => {
      const index = this.hand.findIndex(c => c.id === card.id)
      if (index !== -1) {
        const removedCard = this.hand.splice(index, 1)[0]
        this.discardPile.push(removedCard)
        discardedCards.push(removedCard)
      }
    })
    
    this.selectedCards = []
    return discardedCards
  }

  /**
   * カードを手札に追加
   */
  addToHand(card: Card): void {
    this.hand.push(card)
    this.invalidateCache()
  }

  /**
   * カードを捨て札に追加
   */
  addToDiscardPile(card: Card): void {
    this.discardPile.push(card)
    this.invalidateCache()
  }

  /**
   * カードをプレイヤーデッキに追加
   */
  addToPlayerDeck(card: Card): void {
    this.playerDeck.addCard(card)
    this.invalidateCache()
  }

  /**
   * 手札上限チェックと調整
   */
  enforceHandLimit(): Card[] {
    if (!this.config) {
      return []
    }

    const discardedCards: Card[] = []
    
    // 手札上限チェック - 古いカードを捨て札に
    while (this.hand.length > this.config.maxHandSize) {
      const discarded = this.hand.shift()
      if (discarded) {
        this.discardPile.push(discarded)
        discardedCards.push(discarded)
      }
    }
    
    return discardedCards
  }

  /**
   * カード選択肢を設定
   */
  setCardChoices(choices: Card[]): void {
    this.cardChoices = [...choices]
  }

  /**
   * カード選択肢をクリア
   */
  clearCardChoices(): void {
    this.cardChoices = undefined
  }

  /**
   * 指定IDのカードを選択肢から取得
   */
  getCardChoiceById(cardId: string): Card | undefined {
    return this.cardChoices?.find(card => card.id === cardId)
  }

  /**
   * 捨て札をシャッフルして山札に戻す
   */
  private reshuffleDeck(): void {
    this.playerDeck.addCards(this.discardPile)
    this.playerDeck.shuffle()
    this.discardPile = []
  }
}