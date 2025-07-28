import { Card } from './Card'
import { Deck } from './Deck'
import { CardFactory } from '../services/CardFactory'
import { CardManager, type ICardManager } from '../services/CardManager'
import { InsurancePremiumCalculationService } from '../services/InsurancePremiumCalculationService'
import type {
  IGameState,
  GameStatus,
  GamePhase,
  GameConfig,
  PlayerStats,
  ChallengeResult,
  TurnResult,
  InsuranceExpirationNotice,
  InsuranceTypeChoice,
  InsuranceTypeSelectionResult
} from '../types/game.types'
import { AGE_PARAMETERS, DREAM_AGE_ADJUSTMENTS } from '../types/game.types'
import type { GameStage } from '../types/card.types'
import { Vitality } from '../valueObjects/Vitality'
import { CardPower } from '../valueObjects/CardPower'
import { InsurancePremium } from '../valueObjects/InsurancePremium'

/**
 * ゲームエンティティ - ゲーム全体の状態と進行を管理する中核クラス
 * 
 * このクラスは値オブジェクトを使用してゲーム状態を管理します：
 * - vitality: Vitality値オブジェクトで管理（プレイヤーの活力）
 * - insuranceBurden: InsurancePremium値オブジェクトで管理（保険料負担）
 * 
 * @implements {IGameState} ゲーム状態のインターフェース
 * 
 * @example
 * // ゲームの初期化
 * const config = { startingVitality: 20, maxHandSize: 7 };
 * const game = new Game(config);
 * game.start();
 * 
 * // ターンの進行
 * game.drawCards(5);
 * const challenge = game.challengeDeck.drawCard();
 * game.startChallenge(challenge);
 */
export class Game implements IGameState {
  id: string
  status: GameStatus
  phase: GamePhase
  stage: GameStage
  turn: number
  private _vitality: Vitality
  
  // カード管理を移譲
  private cardManager: ICardManager
  
  // 保険料計算サービス
  private premiumCalculationService: InsurancePremiumCalculationService
  
  currentChallenge?: Card
  
  stats: PlayerStats
  config: GameConfig
  
  // Phase 2-4: 保険カード管理
  insuranceCards: Card[]
  expiredInsurances: Card[]
  
  // Phase 3: 保険料負担
  private _insuranceBurden: InsurancePremium
  
  // 保険種類選択
  insuranceTypeChoices?: InsuranceTypeChoice[]
  
  
  startedAt?: Date
  completedAt?: Date

  /**
   * Gameインスタンスを作成
   * @param {GameConfig} [config] - ゲーム設定（オプション）
   * @param {string} [config.difficulty='normal'] - 難易度
   * @param {number} [config.startingVitality=100] - 初期活力
   * @param {number} [config.startingHandSize=5] - 初期手札枚数
   * @param {number} [config.maxHandSize=10] - 最大手札枚数
   * @param {number} [config.dreamCardCount=3] - 夢カード枚数
   */
  constructor(config?: GameConfig) {
    this.id = this.generateId()
    this.status = 'not_started'
    this.phase = 'setup'
    this.stage = 'youth'
    this.turn = 0
    
    // 値オブジェクトで初期化
    const startingVitality = config?.startingVitality ?? 100
    this._vitality = Vitality.create(startingVitality)
    
    // CardManagerを初期化
    this.cardManager = new CardManager()
    
    // 保険料計算サービスを初期化
    this.premiumCalculationService = new InsurancePremiumCalculationService()
    const playerDeck = new Deck('Player Deck')
    const challengeDeck = new Deck('Challenge Deck')
    
    // 初期デッキを作成
    const initialCards = CardFactory.createStarterLifeCards()
    initialCards.forEach(card => playerDeck.addCard(card))
    
    // チャレンジデッキを作成
    const challengeCards = CardFactory.createChallengeCards(this.stage)
    challengeCards.forEach(card => challengeDeck.addCard(card))
    
    this.cardManager.initialize(playerDeck, challengeDeck, config)
    
    this.stats = {
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality: startingVitality,
      turnsPlayed: 0
    }
    
    this.config = config || {
      difficulty: 'normal',
      startingVitality,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    }
    
    // Phase 2-4: 保険カード管理の初期化
    this.insuranceCards = []
    this.expiredInsurances = []
    
    // Phase 3: 保険料負担の初期化
    this._insuranceBurden = InsurancePremium.create(0)
    
  }

  /**
   * 後方互換性のためのgetter - 現在の活力値を取得
   * @returns {number} 現在の活力値
   */
  get vitality(): number {
    return this._vitality.getValue()
  }

  /**
   * 最大活力値を取得
   * @returns {number} 最大活力値
   */
  get maxVitality(): number {
    return this._vitality.getMax()
  }

  /**
   * 現在の保険料負担を取得
   * @returns {number} 保険料負担額
   */
  get insuranceBurden(): number {
    return this._insuranceBurden.getValue()
  }

  /**
   * 値オブジェクトとしての活力取得
   * @returns {Vitality} 活力値オブジェクト
   */
  getVitality(): Vitality {
    return this._vitality
  }

  /**
   * 値オブジェクトとしての保険料負担取得
   * @returns {InsurancePremium} 保険料負担値オブジェクト
   */
  getInsuranceBurden(): InsurancePremium {
    return this._insuranceBurden
  }

  /**
   * ダメージを適用して活力を減少させる
   * @param {number} damage - 適用するダメージ量
   * @throws {Error} ダメージが負の値の場合
   */
  applyDamage(damage: number): void {
    this.updateVitality(-damage)
  }

  /**
   * 体力を回復させる
   * @param {number} amount - 回復量
   * @throws {Error} 回復量が負の値の場合
   */
  heal(amount: number): void {
    this.updateVitality(amount)
  }

  /**
   * 利用可能体力を取得（保険料負担を考慮）
   * @returns {number} 保険料負担を差し引いた実質的な利用可能体力
   */
  getAvailableVitality(): number {
    return this.vitality - this.insuranceBurden
  }

  /**
   * ゲームオーバーかどうか判定
   * @returns {boolean} ゲームオーバーの場合true
   */
  isGameOver(): boolean {
    return this.status === 'game_over' || this._vitality.isDepleted()
  }

  /**
   * 保険を追加（簡易版テスト用）
   * @param {Card} card - 追加する保険カード
   * @throws {Error} 保険カード以外が渡された場合
   */
  addInsurance(card: Card): void {
    if (!card.isInsurance()) {
      throw new Error('Only insurance cards can be added')
    }
    this.insuranceCards.push(card)
  }

  /**
   * ゲームIDを生成
   * @returns {string} ユニークなゲームID
   * @private
   */
  private generateId(): string {
    return `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * ゲームを開始する
   * @throws {Error} 既にゲームが開始されている場合
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
   * カードをドローする
   * @param {number} count - ドローする枚数
   * @returns {Card[]} ドローしたカードの配列
   */
  drawCards(count: number): Card[] {
    const result = this.cardManager.drawCards(count)
    return result.drawnCards
  }


  /**
   * チャレンジを開始する
   * @param {Card} challengeCard - 挑戦するチャレンジカード
   * @throws {Error} ドローフェーズ以外で実行された場合
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
   * カードを選択/選択解除する
   * @param {Card} card - 選択/解除するカード
   * @returns {boolean} 選択状態（true:選択、false:解除）
   */
  toggleCardSelection(card: Card): boolean {
    return this.cardManager.toggleCardSelection(card)
  }

  /**
   * チャレンジを解決し、結果を返す
   * @returns {ChallengeResult} チャレンジの結果
   * @throws {Error} アクティブなチャレンジがない場合
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
    
    // 成功時は保険種類選択フェーズへ
    if (success) {
      // 保険種類選択肢を生成
      const insuranceTypeChoices = CardFactory.createInsuranceTypeChoices(this.stage)
      this.insuranceTypeChoices = insuranceTypeChoices
      result.insuranceTypeChoices = insuranceTypeChoices
      this.phase = 'insurance_type_selection'
    } else {
      // 失敗時は通常の解決フェーズへ
      this.phase = 'resolution'
    }
    
    this.currentChallenge = undefined
    this.cardManager.clearSelection()
    
    return result
  }

  /**
   * カードを選択してデッキに追加（従来のカード選択フェーズ用）
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
   * 保険種類を選択してカードを作成・追加
   */
  selectInsuranceType(insuranceType: string, durationType: 'term' | 'whole_life'): InsuranceTypeSelectionResult {
    if (this.phase !== 'insurance_type_selection') {
      throw new Error('Not in insurance type selection phase')
    }
    
    if (!this.insuranceTypeChoices) {
      throw new Error('No insurance type choices available')
    }
    
    // 指定された保険種類の選択肢を探す
    const choice = this.insuranceTypeChoices.find(choice => choice.insuranceType === insuranceType)
    if (!choice) {
      return {
        success: false,
        message: 'Invalid insurance type selection'
      }
    }
    
    // 選択された種類に応じてカードを作成
    let selectedCard: Card
    if (durationType === 'term') {
      selectedCard = CardFactory.createTermInsuranceCard(choice)
    } else {
      selectedCard = CardFactory.createWholeLifeInsuranceCard(choice)
    }
    
    // カードをデッキに追加
    this.cardManager.addToPlayerDeck(selectedCard)
    this.stats.cardsAcquired++
    
    // 保険カードの場合は管理リストに追加
    this.insuranceCards.push(selectedCard)
    // Phase 3: 保険料負担を更新
    this.updateInsuranceBurden()
    
    // 選択肢をクリア
    this.insuranceTypeChoices = undefined
    
    // 解決フェーズに移行（ターン終了可能状態）
    this.phase = 'resolution'
    
    const durationText = durationType === 'term' 
      ? `定期保険（${choice.termOption.duration}ターン）` 
      : '終身保険'
    
    return {
      success: true,
      selectedCard,
      message: `${choice.name}（${durationText}）を選択しました。コスト: ${selectedCard.cost}`
    }
  }

  /**
   * 活力を更新
   */
  private updateVitality(change: number): void {
    if (change >= 0) {
      this._vitality = this._vitality.increase(change)
    } else {
      this._vitality = this._vitality.decrease(-change)
    }
    
    this.stats.highestVitality = Math.max(this.stats.highestVitality, this.vitality)
    
    // ゲームオーバー判定
    if (this._vitality.isDepleted()) {
      this.status = 'game_over'
      this.completedAt = new Date()
    }
  }


  /**
   * ステージに応じて活力上限を更新
   * 注意: 現在のVitality実装では最大値は常に100なので、何もしない
   */
  private updateMaxVitalityForAge(): void {
    // 値オブジェクトの実装では最大値は固定なので何もしない
    // 将来的に年齢によって上限を変更したい場合は、
    // Vitalityクラスを拡張するか、別の仕組みを検討する
  }

  /**
   * 次のターンへ
   */
  nextTurn(): TurnResult {
    if (this.status !== 'in_progress') {
      throw new Error('Game is not in progress')
    }
    
    this.turn++
    this.stats.turnsPlayed++
    this.phase = 'draw'
    
    // 定期保険の期限を1ターン減らし、期限切れ通知を取得
    const expirationResult = this.updateInsuranceExpirations()
    
    // ターン開始時のドロー
    this.drawCards(1)
    
    // ターン結果を返す
    return {
      insuranceExpirations: expirationResult,
      newExpiredCount: expirationResult?.expiredCards.length || 0,
      remainingInsuranceCount: this.insuranceCards.length
    }
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
   * 保険種類選択肢を取得
   */
  get currentInsuranceTypeChoices(): InsuranceTypeChoice[] | undefined {
    return this.insuranceTypeChoices
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
   * 期限が近い保険カードを取得（残り2ターン以下）
   */
  getExpiringsSoonInsurances(): Card[] {
    return this.insuranceCards.filter(card => 
      card.isTermInsurance() && 
      card.remainingTurns !== undefined && 
      card.remainingTurns <= 2 && 
      card.remainingTurns > 0
    )
  }

  /**
   * 保険期限切れの警告メッセージを取得
   */
  getExpirationWarnings(): string[] {
    const expiringSoon = this.getExpiringsSoonInsurances()
    return expiringSoon.map(card => 
      `⚠️ 「${card.name}」の期限まであと${card.remainingTurns}ターンです`
    )
  }

  /**
   * Phase 2-4: 現在有効な保険カードを取得
   */
  getActiveInsurances(): Card[] {
    return [...this.insuranceCards]
  }

  /**
   * プレイヤーに最適な保険予算を提案
   * 
   * @param riskProfile リスクプロファイル
   * @returns 推奨保険予算
   */
  getRecommendedInsuranceBudget(riskProfile: 'conservative' | 'balanced' | 'aggressive' = 'balanced'): InsurancePremium {
    return this.premiumCalculationService.calculateOptimalInsuranceBudget(
      this.vitality,
      this.stage,
      riskProfile
    )
  }

  /**
   * 特定の保険カードの総合保険料を取得
   * 
   * @param card 保険カード
   * @returns 年齢・種別調整済み保険料
   */
  calculateCardPremium(card: Card): InsurancePremium {
    if (card.type !== 'insurance') {
      throw new Error('Card must be an insurance card')
    }
    
    return this.premiumCalculationService.calculateComprehensivePremium(card, this.stage)
  }

  /**
   * Phase 3: 保険料負担を計算
   * 
   * ドメインサービスを使用した高度な保険料計算
   */
  calculateInsuranceBurden(): number {
    if (this.insuranceCards.length === 0) {
      return 0
    }

    try {
      // ドメインサービスを使用して総保険料負担を計算
      const totalBurden = this.premiumCalculationService.calculateTotalInsuranceBurden(
        this.insuranceCards, 
        this.stage
      )
      
      // 負の値として返す（活力から差し引かれるため）
      return -totalBurden.getValue()
    } catch (error) {
      console.warn('保険料計算でエラーが発生しました。従来の計算方法を使用します:', error)
      
      // フォールバック: 従来の簡易計算
      const activeInsuranceCount = this.insuranceCards.length
      const burden = Math.floor(activeInsuranceCount / 3)
      return burden === 0 ? 0 : -burden
    }
  }

  /**
   * Phase 3: 保険料負担を更新
   */
  private updateInsuranceBurden(): void {
    const burden = this.calculateInsuranceBurden()
    // 負の値でもInsurancePremiumは正の値として扱う
    this._insuranceBurden = InsurancePremium.create(Math.abs(burden))
  }

  /**
   * 定期保険の期限を更新し、期限切れをチェック
   */
  private updateInsuranceExpirations(): InsuranceExpirationNotice | undefined {
    // 期限切れになった保険を一時的に保存
    const nowExpired: Card[] = []
    
    // 全ての保険カードの期限を更新
    this.insuranceCards.forEach(card => {
      if (card.isTermInsurance()) {
        card.decrementTurn()
        
        // 期限切れになったものを記録
        if (card.isExpired()) {
          nowExpired.push(card)
        }
      }
    })
    
    // 期限切れの保険を active から expired に移動
    if (nowExpired.length > 0) {
      this.insuranceCards = this.insuranceCards.filter(card => !nowExpired.includes(card))
      this.expiredInsurances.push(...nowExpired)
      
      // 保険料負担を再計算
      this.updateInsuranceBurden()
      
      // 期限切れ通知を作成
      return this.createExpirationNotice(nowExpired)
    }
    
    return undefined
  }

  /**
   * 期限切れ通知を作成
   */
  private createExpirationNotice(expiredCards: Card[]): InsuranceExpirationNotice {
    const expiredNames = expiredCards.map(card => card.name).join('、')
    const message = expiredCards.length === 1 
      ? `定期保険「${expiredNames}」の期限が切れました。`
      : `定期保険${expiredCards.length}件（${expiredNames}）の期限が切れました。`
    
    return {
      expiredCards,
      message,
      showRenewalOption: true, // 将来的に更新オプションを実装するため
      turnNumber: this.turn
    }
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
      insuranceTypeChoices: this.insuranceTypeChoices,
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
