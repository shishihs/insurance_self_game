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
import { AGE_PARAMETERS, DREAM_AGE_ADJUSTMENTS } from '../types/game.types'
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
  
  // Phase 2-4: 保険カード管理
  insuranceCards: Card[]
  expiredInsurances: Card[]
  
  // Phase 3: 保険料負担
  insuranceBurden: number
  
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
    
    // Phase 2-4: 保険カード管理の初期化
    this.insuranceCards = []
    this.expiredInsurances = []
    
    // Phase 3: 保険料負担の初期化
    this.insuranceBurden = 0
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
    
    // Phase 3: 詳細なパワー計算
    const powerBreakdown = this.calculateTotalPower(this.selectedCards)
    const playerPower = powerBreakdown.total
    
    // Phase 4: 夢カードの場合は年齢調整を適用
    const challengePower = this.getDreamRequiredPower(this.currentChallenge)
    
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
        : `チャレンジ失敗... ${vitalityChange} 活力`,
      // Phase 3: パワー計算の詳細を含める
      powerBreakdown
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
    
    // Phase 2-4: 保険カードの場合は管理リストに追加
    if (selectedCard.type === 'insurance') {
      this.insuranceCards.push(selectedCard)
      // Phase 3: 保険料負担を更新
      this.updateInsuranceBurden()
    }
    
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
   * Phase 2-4: 保険カードの期限を更新
   * 
   * GameSceneでの期限切れ通知の実装例:
   * ```typescript
   * // nextTurn() 呼び出し後
   * const expiredCards = this.gameInstance.getExpiredInsurances()
   * if (expiredCards.length > 0) {
   *   expiredCards.forEach(card => {
   *     this.showNotification(`保険が期限切れになりました: ${card.name}`)
   *   })
   *   // 通知後にクリア
   *   this.gameInstance.clearExpiredInsurances()
   * }
   * ```
   */
  private updateInsuranceExpiration(): void {
    const updatedInsurances: Card[] = []
    const newlyExpiredInsurances: Card[] = []
    
    // 各保険カードの残りターン数を減少
    this.insuranceCards.forEach(insurance => {
      const updatedCard = insurance.decrementRemainingTurns()
      
      if (updatedCard === null) {
        // 期限切れ
        newlyExpiredInsurances.push(insurance)
      } else {
        // まだ有効
        updatedInsurances.push(updatedCard)
      }
    })
    
    // 保険カードリストを更新
    this.insuranceCards = updatedInsurances
    
    // 期限切れカードを記録
    if (newlyExpiredInsurances.length > 0) {
      this.expiredInsurances.push(...newlyExpiredInsurances)
    }
    
    // Phase 3: 保険料負担を更新
    this.updateInsuranceBurden()
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
    
    // Phase 2-4: 保険カードの期限を更新
    this.updateInsuranceExpiration()
    
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
   * Phase 4: 夢カードの必要パワーを年齢調整込みで計算
   */
  getDreamRequiredPower(challenge: Card): number {
    // 夢カードでない場合は基本パワーをそのまま返す
    if (!challenge.isDreamCard() || !challenge.dreamCategory) {
      return challenge.power
    }
    
    // 青年期は調整なし
    if (this.stage === 'youth') {
      return challenge.power
    }
    
    // 中年期・充実期の年齢調整を適用
    const adjustment = DREAM_AGE_ADJUSTMENTS[challenge.dreamCategory]
    const adjustedPower = challenge.power + adjustment
    
    // 最小値は1
    return Math.max(1, adjustedPower)
  }

  /**
   * Phase 2-4: 期限切れの保険カードを取得（通知用）
   */
  getExpiredInsurances(): Card[] {
    return [...this.expiredInsurances]
  }

  /**
   * Phase 2-4: 期限切れ通知をクリア
   */
  clearExpiredInsurances(): void {
    this.expiredInsurances = []
  }

  /**
   * Phase 2-4: 現在有効な保険カードを取得
   */
  getActiveInsurances(): Card[] {
    return [...this.insuranceCards]
  }

  /**
   * Phase 3: 保険料負担を計算
   * 有効な保険カード3枚ごとに-1の負担
   */
  calculateInsuranceBurden(): number {
    const activeInsuranceCount = this.insuranceCards.length
    // 3枚ごとに-1の負担（切り捨て）
    const burden = Math.floor(activeInsuranceCount / 3)
    return burden === 0 ? 0 : -burden // Ensure we return 0 not -0
  }

  /**
   * Phase 3: 保険料負担を更新
   */
  private updateInsuranceBurden(): void {
    this.insuranceBurden = this.calculateInsuranceBurden()
  }

  /**
   * Phase 3: 総合パワーを詳細に計算
   * @param cards 使用するカード
   * @returns パワーの詳細な内訳
   */
  calculateTotalPower(cards: Card[]): {
    base: number
    insurance: number
    burden: number
    total: number
  } {
    // 基本パワー（保険以外のカード）
    let basePower = 0
    let insurancePower = 0
    
    cards.forEach(card => {
      if (card.type === 'insurance') {
        // 保険カードのパワー（年齢ボーナス込み）
        insurancePower += card.calculateEffectivePower()
      } else {
        // その他のカードの基本パワー
        basePower += card.calculateEffectivePower()
      }
    })
    
    // 保険料負担（常に負の値）
    const burden = this.insuranceBurden
    
    // 総合パワー
    const total = basePower + insurancePower + burden
    
    return {
      base: basePower,
      insurance: insurancePower,
      burden: burden,
      total: Math.max(0, total) // 総合パワーは0以下にならない
    }
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
      insuranceCards: [...this.insuranceCards],
      expiredInsurances: [...this.expiredInsurances],
      insuranceBurden: this.insuranceBurden,
      stats: { ...this.stats },
      config: { ...this.config },
      startedAt: this.startedAt,
      completedAt: this.completedAt
    }
  }
}