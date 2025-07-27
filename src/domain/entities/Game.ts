import { Card } from './Card'
import { Deck } from './Deck'
import { CardFactory } from '../services/CardFactory'
import { CardManager, type ICardManager } from '../services/CardManager'
import type {
  IGameState,
  GameStatus,
  GamePhase,
  GameConfig,
  PlayerStats,
  ChallengeResult,
  InsuranceRenewalOption,
  InsuranceRenewalResult
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
  
  // カード管理を移譲
  private cardManager: ICardManager
  
  currentChallenge?: Card
  
  stats: PlayerStats
  config: GameConfig
  
  // Phase 2-4: 保険カード管理
  insuranceCards: Card[]
  expiredInsurances: Card[]
  
  // Phase 3: 保険料負担
  insuranceBurden: number
  
  // 保険更新システム
  pendingRenewals: InsuranceRenewalOption[]
  
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
    
    // CardManagerを初期化
    this.cardManager = new CardManager()
    const playerDeck = new Deck('Player Deck')
    const challengeDeck = new Deck('Challenge Deck')
    this.cardManager.initialize(playerDeck, challengeDeck, config)
    
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
    
    // 保険更新システムの初期化
    this.pendingRenewals = []
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
    const result = this.cardManager.drawCards(count)
    return result.drawnCards
  }


  /**
   * チャレンジを開始
   */
  startChallenge(challengeCard: Card): void {
    if (this.phase !== 'draw') {
      throw new Error('Can only start challenge during draw phase')
    }
    
    this.currentChallenge = challengeCard
    this.cardManager.clearSelection()
    this.phase = 'challenge'
  }

  /**
   * カードを選択/選択解除
   */
  toggleCardSelection(card: Card): boolean {
    return this.cardManager.toggleCardSelection(card)
  }

  /**
   * チャレンジを解決
   */
  resolveChallenge(): ChallengeResult {
    if (!this.currentChallenge || this.phase !== 'challenge') {
      throw new Error('No active challenge to resolve')
    }
    
    // Phase 3: 詳細なパワー計算
    const selectedCards = this.cardManager.getState().selectedCards
    const powerBreakdown = this.calculateTotalPower(selectedCards)
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
    this.cardManager.discardSelectedCards()
    
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
      
      this.cardManager.setCardChoices(cardChoices)
      result.cardChoices = cardChoices
      this.phase = 'card_selection'
    } else {
      // 失敗時は通常の解決フェーズへ
      this.phase = 'resolution'
    }
    
    this.currentChallenge = undefined
    this.cardManager.clearSelection()
    
    return result
  }

  /**
   * カードを選択してデッキに追加
   */
  selectCard(cardId: string): boolean {
    if (this.phase !== 'card_selection') {
      throw new Error('Not in card selection phase')
    }
    
    const selectedCard = this.cardManager.getCardChoiceById(cardId)
    if (!selectedCard) {
      throw new Error('Invalid card selection')
    }
    
    // カードをデッキに追加
    this.cardManager.addToPlayerDeck(selectedCard)
    this.stats.cardsAcquired++
    
    // Phase 2-4: 保険カードの場合は管理リストに追加
    if (selectedCard.type === 'insurance') {
      this.insuranceCards.push(selectedCard)
      // Phase 3: 保険料負担を更新
      this.updateInsuranceBurden()
    }
    
    // 選択肢をクリア
    this.cardManager.clearCardChoices()
    
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
    
    // 保険更新警告システムと統合
    this.updatePendingRenewals()
    
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
   * 手札を取得
   */
  get hand(): Card[] {
    return this.cardManager.getState().hand
  }

  /**
   * 捨て札を取得
   */
  get discardPile(): Card[] {
    return this.cardManager.getState().discardPile
  }

  /**
   * プレイヤーデッキを取得
   */
  get playerDeck(): Deck {
    return this.cardManager.getState().playerDeck
  }

  /**
   * チャレンジデッキを取得
   */
  get challengeDeck(): Deck {
    return this.cardManager.getState().challengeDeck
  }

  /**
   * 選択中のカードを取得
   */
  get selectedCards(): Card[] {
    return this.cardManager.getState().selectedCards
  }

  /**
   * カード選択肢を取得
   */
  get cardChoices(): Card[] | undefined {
    return this.cardManager.getState().cardChoices
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
   * 期限切れ警告システム: 残り2ターン以下の定期保険を取得
   */
  getPendingRenewalInsurances(): InsuranceRenewalOption[] {
    return this.pendingRenewals.filter(renewal => renewal.remainingTurns <= 2)
  }

  /**
   * 更新コスト計算: 年齢に応じた更新コストを計算
   */
  calculateRenewalCost(card: Card, stage: GameStage): number {
    let additionalCost = 0
    
    switch (stage) {
      case 'youth':
        additionalCost = 1
        break
      case 'middle':
        additionalCost = 2
        break
      case 'fulfillment':
        additionalCost = 3
        break
    }
    
    return card.cost + additionalCost
  }

  /**
   * 保険更新処理: 保険を更新し期限を10ターン延長
   */
  renewInsurance(cardId: string): InsuranceRenewalResult {
    const renewalOption = this.pendingRenewals.find(option => option.cardId === cardId)
    if (!renewalOption) {
      throw new Error('Invalid renewal option')
    }
    
    const card = this.insuranceCards.find(c => c.id === cardId)
    if (!card) {
      throw new Error('Card not found in insurance list')
    }
    
    const renewalCost = renewalOption.renewalCost
    
    // 活力不足チェック
    if (this.vitality < renewalCost) {
      return {
        action: 'expired',
        cardId: cardId,
        message: `活力不足のため更新できませんでした（必要: ${renewalCost}, 現在: ${this.vitality}）`
      }
    }
    
    // 活力を差し引く
    this.vitality -= renewalCost
    
    // カードの期限を10ターン延長
    const renewedCard = this.createRenewedCard(card, 10)
    const cardIndex = this.insuranceCards.findIndex(c => c.id === cardId)
    if (cardIndex !== -1) {
      this.insuranceCards[cardIndex] = renewedCard
    }
    
    // 更新リストから削除
    this.pendingRenewals = this.pendingRenewals.filter(option => option.cardId !== cardId)
    
    return {
      action: 'renewed',
      cardId: cardId,
      costPaid: renewalCost,
      message: `保険を更新しました（コスト: ${renewalCost}活力）`
    }
  }

  /**
   * 保険失効処理: 保険を失効させ、保険リストから削除
   */
  expireInsurance(cardId: string): InsuranceRenewalResult {
    const card = this.insuranceCards.find(c => c.id === cardId)
    if (!card) {
      throw new Error('Card not found in insurance list')
    }
    
    // 保険リストから削除
    this.insuranceCards = this.insuranceCards.filter(c => c.id !== cardId)
    
    // 期限切れリストに追加
    this.expiredInsurances.push(card)
    
    // 更新リストからも削除
    this.pendingRenewals = this.pendingRenewals.filter(option => option.cardId !== cardId)
    
    // 保険料負担を更新
    this.updateInsuranceBurden()
    
    return {
      action: 'expired',
      cardId: cardId,
      message: `保険が失効しました: ${card.name}`
    }
  }

  /**
   * 更新警告リストを更新
   */
  private updatePendingRenewals(): void {
    this.pendingRenewals = []
    
    this.insuranceCards.forEach(card => {
      // 定期保険のみ更新対象
      if (card.durationType === 'term' && card.remainingTurns !== undefined) {
        const currentCost = card.cost
        const renewalCost = this.calculateRenewalCost(card, this.stage)
        const costIncrease = renewalCost - currentCost
        
        const renewalOption: InsuranceRenewalOption = {
          cardId: card.id,
          cardName: card.name,
          currentCost: currentCost,
          renewalCost: renewalCost,
          costIncrease: costIncrease,
          remainingTurns: card.remainingTurns
        }
        
        this.pendingRenewals.push(renewalOption)
      }
    })
  }

  /**
   * カードの期限を延長した新しいカードインスタンスを作成
   */
  private createRenewedCard(card: Card, additionalTurns: number): Card {
    if (card.durationType !== 'term' || card.remainingTurns === undefined) {
      return card
    }
    
    const newRemainingTurns = card.remainingTurns + additionalTurns
    
    const renewedCardData = {
      id: card.id,
      name: card.name,
      description: card.description,
      type: card.type,
      power: card.power,
      cost: card.cost,
      effects: [...card.effects],
      imageUrl: card.imageUrl,
      category: card.category,
      insuranceType: card.insuranceType,
      coverage: card.coverage,
      penalty: card.penalty,
      durationType: card.durationType,
      remainingTurns: newRemainingTurns,
      ageBonus: card.ageBonus || 0
    }
    
    return new Card(renewedCardData)
  }

  /**
   * テスト用: カードを手札に直接追加
   */
  addCardToHand(card: Card): void {
    this.cardManager.addToHand(card)
  }

  /**
   * テスト用: カードを捨て札に直接追加
   */
  addCardToDiscardPile(card: Card): void {
    this.cardManager.addToDiscardPile(card)
  }

  /**
   * テスト用: プレイヤーデッキにカードを追加
   */
  addCardToPlayerDeck(card: Card): void {
    this.cardManager.addToPlayerDeck(card)
  }

  /**
   * テスト用: 手札をクリア
   */
  clearHand(): void {
    const state = this.cardManager.getState()
    state.hand = []
    this.cardManager.setState(state)
  }

  /**
   * テスト用: 手札を設定
   */
  setHand(cards: Card[]): void {
    const state = this.cardManager.getState()
    state.hand = [...cards]
    this.cardManager.setState(state)
  }

  /**
   * テスト用: カード選択肢を設定
   */
  setCardChoices(choices: Card[]): void {
    this.cardManager.setCardChoices(choices)
  }

  /**
   * テスト用: フェーズを設定
   */
  setPhase(phase: GamePhase): void {
    this.phase = phase
  }

  /**
   * テスト用: ステージを設定
   */
  setStage(stage: GameStage): void {
    this.stage = stage
    this.updateMaxVitalityForAge()
  }

  /**
   * ゲーム状態のスナップショットを取得
   */
  getSnapshot(): IGameState {
    const cardState = this.cardManager.getState()
    return {
      id: this.id,
      status: this.status,
      phase: this.phase,
      stage: this.stage,
      turn: this.turn,
      vitality: this.vitality,
      maxVitality: this.maxVitality,
      playerDeck: cardState.playerDeck,
      hand: cardState.hand,
      discardPile: cardState.discardPile,
      challengeDeck: cardState.challengeDeck,
      currentChallenge: this.currentChallenge,
      selectedCards: cardState.selectedCards,
      cardChoices: cardState.cardChoices,
      insuranceCards: [...this.insuranceCards],
      expiredInsurances: [...this.expiredInsurances],
      insuranceBurden: this.insuranceBurden,
      pendingRenewals: [...this.pendingRenewals],
      stats: { ...this.stats },
      config: { ...this.config },
      startedAt: this.startedAt,
      completedAt: this.completedAt
    }
  }
}
