import { Card } from './Card'
import { Deck } from './Deck'
import { CardFactory } from '../services/CardFactory'
import type {
  IGameState,
  GameStatus,
  GamePhase,
  GameConfig,
  PlayerStats,
  ChallengeResult
} from '../types/game.types'
import { AGE_PARAMETERS } from '../types/game.types'
import type { GameStage } from '../types/card.types'

/**
 * ゲームエンティティ
 */
export class Game implements IGameState {
  id: string
  status: GameStatus
  phase: GamePhase
  stage: GameStage
  turn: number
  vitality: number
  maxVitality: number
  
  playerDeck: Deck
  hand: Card[]
  discardPile: Card[]
  challengeDeck: Deck
  
  currentChallenge?: Card
  selectedCards: Card[]
  cardChoices?: Card[]
  
  stats: PlayerStats
  config: GameConfig
  
  startedAt?: Date
  completedAt?: Date

  constructor(config: GameConfig) {
    this.id = this.generateId()
    this.status = 'not_started'
    this.phase = 'setup'
    this.stage = 'youth'
    this.turn = 0
    this.vitality = config.startingVitality
    this.maxVitality = AGE_PARAMETERS[this.stage].maxVitality
    
    this.playerDeck = new Deck('Player Deck')
    this.hand = []
    this.discardPile = []
    this.challengeDeck = new Deck('Challenge Deck')
    
    this.selectedCards = []
    this.cardChoices = undefined
    
    this.stats = {
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality: config.startingVitality,
      turnsPlayed: 0
    }
    
    this.config = config
  }

  /**
   * ゲームIDを生成
   */
  private generateId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * ゲーム開始
   */
  start(): void {
    if (this.status !== 'not_started') {
      throw new Error('Game has already started')
    }
    
    this.status = 'in_progress'
    this.startedAt = new Date()
    this.phase = 'draw'
    this.turn = 1
    this.stats.turnsPlayed = 1
  }

  /**
   * カードをドロー
   */
  drawCards(count: number): Card[] {
    const drawn: Card[] = []
    
    for (let i = 0; i < count; i++) {
      // デッキが空の場合、捨て札をシャッフルして山札に戻す
      if (this.playerDeck.isEmpty() && this.discardPile.length > 0) {
        this.reshuffleDeck()
      }
      
      const card = this.playerDeck.drawCard()
      if (card) {
        drawn.push(card)
        this.hand.push(card)
      }
    }
    
    // 手札上限チェック - 古いカードを捨て札に
    while (this.hand.length > this.config.maxHandSize) {
      const discarded = this.hand.shift()
      if (discarded) {
        this.discardPile.push(discarded)
      }
    }
    
    return drawn
  }

  /**
   * 捨て札をシャッフルして山札に戻す
   */
  private reshuffleDeck(): void {
    this.playerDeck.addCards(this.discardPile)
    this.playerDeck.shuffle()
    this.discardPile = []
  }

  /**
   * チャレンジを開始
   */
  startChallenge(challengeCard: Card): void {
    if (this.phase !== 'draw') {
      throw new Error('Can only start challenge during draw phase')
    }
    
    this.currentChallenge = challengeCard
    this.selectedCards = []
    this.phase = 'challenge'
  }

  /**
   * カードを選択/選択解除
   */
  toggleCardSelection(card: Card): boolean {
    const index = this.selectedCards.findIndex(c => c.id === card.id)
    
    if (index !== -1) {
      this.selectedCards.splice(index, 1)
      return false // 選択解除
    } else {
      this.selectedCards.push(card)
      return true // 選択
    }
  }

  /**
   * チャレンジを解決
   */
  resolveChallenge(): ChallengeResult {
    if (!this.currentChallenge || this.phase !== 'challenge') {
      throw new Error('No active challenge to resolve')
    }
    
    // プレイヤーのパワー計算
    let playerPower = 0
    this.selectedCards.forEach(card => {
      playerPower += card.calculateEffectivePower()
    })
    
    // チャレンジのパワー
    const challengePower = this.currentChallenge.power
    
    // 成功判定
    const success = playerPower >= challengePower
    
    // 統計更新
    this.stats.totalChallenges++
    if (success) {
      this.stats.successfulChallenges++
    } else {
      this.stats.failedChallenges++
    }
    
    // 活力変更
    let vitalityChange = 0
    if (success) {
      vitalityChange = Math.floor(playerPower - challengePower) / 2
    } else {
      vitalityChange = -(challengePower - playerPower)
    }
    
    this.updateVitality(vitalityChange)
    
    // 使用したカードを捨て札に
    this.selectedCards.forEach(card => {
      const index = this.hand.findIndex(c => c.id === card.id)
      if (index !== -1) {
        this.hand.splice(index, 1)
        this.discardPile.push(card)
      }
    })
    
    // 結果作成
    const result: ChallengeResult = {
      success,
      playerPower,
      challengePower,
      vitalityChange,
      message: success 
        ? `チャレンジ成功！ +${vitalityChange} 活力`
        : `チャレンジ失敗... ${vitalityChange} 活力`
    }
    
    // 成功時はカード選択フェーズへ
    if (success) {
      // 3枚のカード選択肢を生成
      const allInsuranceCards = CardFactory.createExtendedInsuranceCards()
      const cardChoices: Card[] = []
      
      // 重複なしで3枚を選択
      const availableCards = [...allInsuranceCards]
      for (let i = 0; i < 3 && availableCards.length > 0; i++) {
        const randomIndex = Math.floor(Math.random() * availableCards.length)
        cardChoices.push(availableCards.splice(randomIndex, 1)[0])
      }
      
      this.cardChoices = cardChoices
      result.cardChoices = cardChoices
      this.phase = 'card_selection'
    } else {
      // 失敗時は通常の解決フェーズへ
      this.phase = 'resolution'
    }
    
    this.currentChallenge = undefined
    this.selectedCards = []
    
    return result
  }

  /**
   * カードを選択してデッキに追加
   */
  selectCard(cardId: string): boolean {
    if (this.phase !== 'card_selection' || !this.cardChoices) {
      throw new Error('Not in card selection phase')
    }
    
    const selectedCard = this.cardChoices.find(card => card.id === cardId)
    if (!selectedCard) {
      throw new Error('Invalid card selection')
    }
    
    // カードをデッキに追加
    this.playerDeck.addCard(selectedCard)
    this.stats.cardsAcquired++
    
    // 選択肢をクリア
    this.cardChoices = undefined
    
    // 解決フェーズに移行（ターン終了可能状態）
    this.phase = 'resolution'
    
    return true
  }

  /**
   * 活力を更新
   */
  private updateVitality(change: number): void {
    this.vitality = Math.max(0, Math.min(this.maxVitality * 2, this.vitality + change))
    this.stats.highestVitality = Math.max(this.stats.highestVitality, this.vitality)
    
    // ゲームオーバー判定
    if (this.vitality <= 0) {
      this.status = 'game_over'
      this.completedAt = new Date()
    }
  }

  /**
   * ステージに応じて活力上限を更新
   */
  private updateMaxVitalityForAge(): void {
    const newMaxVitality = AGE_PARAMETERS[this.stage].maxVitality
    this.maxVitality = newMaxVitality
    
    // 現在の活力が新しい上限を超えていたら調整
    if (this.vitality > newMaxVitality) {
      this.vitality = newMaxVitality
    }
  }

  /**
   * 次のターンへ
   */
  nextTurn(): void {
    if (this.status !== 'in_progress') {
      throw new Error('Game is not in progress')
    }
    
    this.turn++
    this.stats.turnsPlayed++
    this.phase = 'draw'
    
    // ターン開始時のドロー
    this.drawCards(1)
  }

  /**
   * ステージを進める
   */
  advanceStage(): void {
    if (this.stage === 'youth') {
      this.stage = 'middle'
      this.updateMaxVitalityForAge()
    } else if (this.stage === 'middle') {
      this.stage = 'fulfillment'
      this.updateMaxVitalityForAge()
    } else {
      // 最終ステージクリア
      this.status = 'victory'
      this.completedAt = new Date()
    }
  }

  /**
   * ゲームが進行中かどうか
   */
  isInProgress(): boolean {
    return this.status === 'in_progress'
  }

  /**
   * ゲームが終了しているかどうか
   */
  isCompleted(): boolean {
    return this.status === 'game_over' || this.status === 'victory'
  }

  /**
   * ゲーム状態のスナップショットを取得
   */
  getSnapshot(): IGameState {
    return {
      id: this.id,
      status: this.status,
      phase: this.phase,
      stage: this.stage,
      turn: this.turn,
      vitality: this.vitality,
      maxVitality: this.maxVitality,
      playerDeck: this.playerDeck.clone(),
      hand: [...this.hand],
      discardPile: [...this.discardPile],
      challengeDeck: this.challengeDeck.clone(),
      currentChallenge: this.currentChallenge,
      selectedCards: [...this.selectedCards],
      cardChoices: this.cardChoices ? [...this.cardChoices] : undefined,
      stats: { ...this.stats },
      config: { ...this.config },
      startedAt: this.startedAt,
      completedAt: this.completedAt
    }
  }
}