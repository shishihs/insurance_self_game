import type { Card } from './Card'
import { Deck } from './Deck'
import { CardFactory } from '../services/CardFactory'
import { CardManager, type ICardManager } from '../services/CardManager'
import { InsurancePremiumCalculationService } from '../services/InsurancePremiumCalculationService'
import { GameStageManager } from '../services/GameStageManager'
import { InsuranceExpirationManager } from '../services/InsuranceExpirationManager'
import { ChallengeResolutionService } from '../services/ChallengeResolutionService'
import { GameTurnManager } from '../services/GameTurnManager'
import { GameChallengeService } from '../services/GameChallengeService'
import { GameInsuranceService } from '../services/GameInsuranceService'
import { AIStrategyService, type AIStrategyType } from '../services/AIStrategyService'
import { GameStateManager } from '../services/GameStateManager'
import { GameActionProcessor } from '../services/GameActionProcessor'
import { IdGenerator } from '../../common/IdGenerator'
import type {
  ChallengeResult,
  GameConfig,
  GamePhase,
  GameStatus,
  IGameState,
  InsuranceExpirationNotice,
  InsuranceTypeChoice,
  InsuranceTypeSelectionResult,
  PlayerStats,
  TurnResult
} from '../types/game.types'
import { AGE_PARAMETERS, DREAM_AGE_ADJUSTMENTS } from '../types/game.types'
import type { GameStage } from '../types/card.types'
import { Vitality } from '../valueObjects/Vitality'
import { InsurancePremium } from '../valueObjects/InsurancePremium'
import { RiskProfile } from '../valueObjects/RiskProfile'
import type { PlayerHistory } from '../services/InsurancePremiumCalculationService'
import { GameConstantsAccessor } from '../constants/GameConstants'

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
  public cardManager: ICardManager

  // ドメインサービス
  private readonly premiumCalculationService: InsurancePremiumCalculationService
  private readonly stageManager: GameStageManager
  private readonly expirationManager: InsuranceExpirationManager
  private readonly challengeResolutionService: ChallengeResolutionService
  private readonly turnManager: GameTurnManager
  private readonly challengeService: GameChallengeService
  private readonly insuranceService: GameInsuranceService
  private readonly aiStrategyService: AIStrategyService

  // 新しいアーキテクチャ
  private readonly stateManager: GameStateManager
  private readonly actionProcessor: GameActionProcessor

  currentChallenge: Card | undefined = undefined

  stats: PlayerStats
  config: GameConfig

  // Phase 5: リスクプロファイルとプレイヤー履歴
  private readonly _riskProfile: RiskProfile
  private readonly _playerHistory: PlayerHistory

  // Phase 2-4:  // 保険関連
  activeInsurances: Card[] = []
  expiredInsurances: Card[] = []
  private readonly _insuranceBurden: InsurancePremium

  // v2: 新要素
  agingDeck: Deck
  score: number = 0
  insuranceMarket: Card[] = []
  selectedDream: Card | undefined = undefined

  // 選択肢
  insuranceTypeChoices: InsuranceTypeChoice[] | undefined = undefined

  // 経験学習システム（GAME_DESIGN.mdより）
  private readonly _learningHistory: Map<string, number> = new Map() // チャレンジ名 -> 失敗回数

  /**
   * 学習履歴を取得
   */
  getLearningHistory(challengeName: string): number {
    return this._learningHistory.get(challengeName) || 0
  }

  /**
   * 学習履歴を更新
   */
  updateLearningHistory(challengeName: string, failures: number): void {
    this._learningHistory.set(challengeName, failures)
  }

  // AI戦略設定
  private _aiEnabled: boolean = false
  private _currentAIStrategy: AIStrategyType = 'balanced'

  // パフォーマンス最適化: オブジェクトプール
  private static readonly OBJECT_POOLS = {
    cards: [] as Card[],
    gameStates: [] as Partial<IGameState>[],
    challengeResults: [] as Partial<ChallengeResult>[]
  }

  // ダーティフラグシステムの導入
  private readonly _dirtyFlags = {
    vitality: false,
    insurance: false,
    burden: false,
    stats: false,
    gameState: false
  }

  // キャッシュシステム
  private readonly _cachedValues = {
    insuranceBurden: 0,
    availableVitality: 0,
    totalInsuranceCount: 0,
    lastUpdateTime: 0
  }

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

    // 値オブジェクトで初期化（年齢別最大活力を適用）
    const startingVitality = config?.startingVitality ?? 100
    const ageParams = AGE_PARAMETERS[this.stage] || AGE_PARAMETERS['youth']
    if (!ageParams) throw new Error('Invalid stage parameters')
    const maxVitality = ageParams.maxVitality
    this._vitality = Vitality.create(Math.min(startingVitality, maxVitality), maxVitality)

    // CardManagerを初期化
    this.cardManager = new CardManager()

    // ドメインサービスを初期化
    this.premiumCalculationService = new InsurancePremiumCalculationService()
    this.stageManager = new GameStageManager()
    this.expirationManager = new InsuranceExpirationManager()
    this.challengeResolutionService = new ChallengeResolutionService()
    this.turnManager = new GameTurnManager(this.stageManager, this.expirationManager)
    this.challengeService = new GameChallengeService(this.challengeResolutionService)
    this.insuranceService = new GameInsuranceService(this.premiumCalculationService)
    this.aiStrategyService = new AIStrategyService(this._currentAIStrategy)

    // 新しいアーキテクチャを初期化
    this.stateManager = new GameStateManager()
    this.actionProcessor = new GameActionProcessor()

    // Config must be set before initializing CardManager
    this.config = config || {
      difficulty: 'normal',
      startingVitality,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    }

    // Apply balance overrides if provided
    if (this.config.balanceConfig) {
      GameConstantsAccessor.setOverrides(this.config.balanceConfig)
    } else {
      GameConstantsAccessor.clearOverrides()
    }

    // 状態変更イベントの監視を設定
    this.setupStateListeners()
    const playerDeck = new Deck('Player Deck')
    const challengeDeck = new Deck('Challenge Deck')

    // 初期デッキを作成
    const initialCards = CardFactory.createStarterLifeCards()
    initialCards.forEach(card => { playerDeck.addCard(card); })

    // チャレンジデッキを作成
    const challengeCards = CardFactory.createChallengeCards(this.stage)
    challengeCards.forEach(card => { challengeDeck.addCard(card); })

    // Initialize CardManager with config already set
    this.cardManager.initialize(playerDeck, challengeDeck, this.config)

    this.stats = {
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality: startingVitality,
      turnsPlayed: 0
    }

    // Phase 5: リスクプロファイルと履歴の初期化
    this._riskProfile = RiskProfile.default()
    this._playerHistory = {
      turnsPlayed: 0,
      totalDamageTaken: 0,
      insuranceClaimCount: 0,
      totalInsurancePurchased: 0,
      riskyChoiceCount: 0,
      totalChoiceCount: 0
    }

    // Phase 2-4: 保険カード管理の初期化
    this.activeInsurances = []
    this.expiredInsurances = []
    this.insuranceMarket = []

    // v2: 初期化
    this.agingDeck = new Deck('Aging Deck') // Keeps explicit reference if needed, but CardManager also has one.
    // Sync logic: CardManager has its own. We should populate CardManager's deck.
    // Or if this.agingDeck is intended to be the same, Game should use CardManager's deck reference?
    // Accessing CardManager's state for population
    const agingCards = CardFactory.createAgingCards(20)
    // We need to access CardManager's aging deck.
    // Since Game.ts doesn't expose cardManager.agingDeck directly but via getState():
    // But we are in constructor, cardManager is just initialized.
    this.cardManager.getState().agingDeck.addCards(agingCards)
    this.cardManager.getState().agingDeck.shuffle()

    this.score = 0

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
   * 完了したチャレンジ数を取得
   * @returns {number} 完了したチャレンジ数
   */
  get challengesCompleted(): number {
    return this.stats.challengesCompleted || 0
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
    // 型チェック
    if (damage === null || damage === undefined) {
      throw new Error('Change amount must not be null or undefined')
    }
    if (typeof damage !== 'number') {
      throw new Error('Change amount must be a number')
    }
    if (!isFinite(damage)) {
      throw new Error('Change amount must be a finite number')
    }
    this.updateVitality(-damage)
  }

  /**
   * 体力を回復させる
   * @param {number} amount - 回復量
   * @throws {Error} 回復量が負の値の場合
   */
  heal(amount: number): void {
    // 型チェック
    if (amount === null || amount === undefined) {
      throw new Error('Change amount must not be null or undefined')
    }
    if (typeof amount !== 'number') {
      throw new Error('Change amount must be a number')
    }
    if (!isFinite(amount)) {
      throw new Error('Change amount must be a finite number')
    }
    this.updateVitality(amount)
  }

  /**
   * 現在のリスクプロファイルを取得
   * @returns {RiskProfile} リスクプロファイル
   */
  getRiskProfile(): RiskProfile {
    return this._riskProfile
  }

  /**
   * プレイヤー履歴を取得
   * @returns {PlayerHistory} プレイヤー履歴
   */
  getPlayerHistory(): PlayerHistory {
    return { ...this._playerHistory }
  }

  /**
   * 利用可能体力を取得（保険料負担を考慮）
   * キャッシュによる最適化版
   * @returns {number} 保険料負担を差し引いた実質的な利用可能体力
   */
  getAvailableVitality(): number {
    const currentTime = Date.now()

    // キャッシュが有効な場合（50ms以内）は計算をスキップ
    if (!this._dirtyFlags.vitality && !this._dirtyFlags.burden &&
      currentTime - this._cachedValues.lastUpdateTime < 50) {
      return this._cachedValues.availableVitality
    }

    const result = this.vitality - this.insuranceBurden

    // キャッシュを更新
    this._cachedValues.availableVitality = result
    this._cachedValues.lastUpdateTime = currentTime
    this._dirtyFlags.vitality = false
    this._dirtyFlags.burden = false

    return result
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
    this.insuranceService.addInsurance(this, card)
  }

  /**
   * ゲームIDを生成
   * @returns {string} ユニークなゲームID
   * @private
   */
  private generateId(): string {
    return IdGenerator.generateGameId()
  }

  /**
   * ゲームを開始する
   * @throws {Error} 既にゲームが開始されている場合
   */
  start(): void {
    if (this.status !== 'not_started') {
      throw new Error('Game has already started')
    }

    this.changeStatus('in_progress')
    this.startedAt = new Date()

    // v2: Start with Dream Selection
    this.startDreamSelectionPhase()
    // turn starts after dream selection? Or turn 1 involves dream selection?
    // Usually Setup -> Dream Selection -> Turn 1
    // So turn remains 0 or 1?
    // Let's keep turn 0 until actual play starts.
  }

  /**
   * 夢選択フェーズを開始
   */
  startDreamSelectionPhase(): void {
    const dreams = CardFactory.createDreamCards()
    // random 3
    const shuffled = dreams.sort(() => Math.random() - 0.5).slice(0, 3)

    this.cardManager.setCardChoices(shuffled)
    this.changePhase('dream_selection')
    console.info('[Game Phase] Dream Selection Started')
  }

  /**
   * 夢カードを選択
   */
  selectDream(card: Card): void {
    if (this.phase !== 'dream_selection') throw new Error('Not in dream selection phase')

    const choices = this.cardManager.getState().cardChoices
    if (!choices?.some(c => c.id === card.id)) throw new Error('Invalid dream selection')

    this.selectedDream = card
    console.info(`[Game Event] Selected Dream: ${card.name}`)

    this.cardManager.clearCardChoices()

    // Start actual game loop
    this.changePhase('draw')
    this.changeTurn(1)
  }

  /**
   * カードをドローする（リファクタリング版）
   * @param {number} count - ドローする枚数
   * @returns {Promise<Card[]>} ドローしたカードの配列
   */
  async drawCards(count: number): Promise<Card[]> {
    console.debug('[Game] drawCards called', count)
    const result = await this.actionProcessor.executeAction<number, Card[]>('draw_cards', this, count)
    console.debug('[Game] actionProcessor result:', result)

    if (!result.success) {
      console.error('[Game] drawCards failed:', result.error)
      throw new Error(result.error || 'カードドローに失敗しました')
    }

    return result.data || []
  }

  /**
   * カードをドローする（後方互換版）
   * @param {number} count - ドローする枚数
   * @returns {Card[]} ドローしたカードの配列
   * @deprecated 新しいdrawCardsメソッドを使用してください
   */
  drawCardsSync(count: number): Card[] {
    const result = this.cardManager.drawCards(count)
    return result.drawnCards
  }


  /**
   * チャレンジフェーズを開始する (v2)
   * 2枚引いて選択肢を提示する
   */
  startChallengePhase(): void {
    // Phase check
    if (this.phase !== 'draw') {
      // Allow re-roll or other special cases? For now strict.
      throw new Error('Can only start challenge phase from draw phase')
    }

    const choices: Card[] = []

    // 2枚引く - refill if needed
    let card1 = this.cardManager.drawChallengeCard()
    if (!card1) {
      this.refillChallengeDeck()
      card1 = this.cardManager.drawChallengeCard()
    }
    if (card1) choices.push(card1)

    let card2 = this.cardManager.drawChallengeCard()
    if (!card2) {
      // Should rely on Deck implementation but refilling if 1st was null likely refilled enough
      // If deck was size 1, maybe need refill again?
      if (this.challengeDeck.getCards().length === 0) { // Check deck size
        this.refillChallengeDeck()
      }
      card2 = this.cardManager.drawChallengeCard()
    }
    if (card2) choices.push(card2)

    if (choices.length === 0) {
      throw new Error('No challenge cards available')
    }

    this.cardManager.setCardChoices(choices)
    this.changePhase('challenge_choice')
    console.debug(`[Game] Challenge choices set: ${choices.map(c => c.name).join(', ')}`)
  }

  /**
   * チャレンジを開始する
   * @param {Card} challengeCard - 挑戦するチャレンジカード
   * @throws {Error} 適切なフェーズ以外で実行された場合
   */
  startChallenge(challengeCard: Card): void {
    // v2: If in challenge_choice phase, validate selection
    if (this.phase === 'challenge_choice') {
      const choices = this.cardManager.getState().cardChoices
      if (!choices || !choices.some(c => c.id === challengeCard.id)) {
        throw new Error('Selected card is not in current choices')
      }
      // 他の選択肢は破棄される（チャレンジデッキに戻すルール? 捨て札? discard usually）
      // Rulebook check: "Draw 2, Choose 1. The other goes to discard pile."
      choices.forEach(c => {
        if (c.id !== challengeCard.id) {
          this.cardManager.addToDiscardPile(c) // Or explicitly challenge discard?
          // ChallengeDeck uses discard? Usually challenges are discarded to bottom or separate pile?
          // CardManager has discardPile (player's).
          // ChallengeDeck might need its own discard or shuffle back.
          // Assuming simple flow: unused challenge goes back to bottom or discarded.
          // For now, let's assume discard pile (shared?) or just ignored (lost). 
          // Actual rule: "Discard the other".
        }
      })
      this.cardManager.clearCardChoices()
    }

    this.challengeService.startChallenge(this, challengeCard)
  }

  /**
   * チャレンジカードを直接引く（状態更新あり）
   */
  drawChallengeCard(): Card | null {
    return this.cardManager.drawChallengeCard()
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
    return this.challengeService.resolveChallenge(this)
  }

  /**
   * チャレンジ結果を記録し、統計とゲーム状態を更新（ApplicationService用）
   * @param {number} totalPower プレイヤーの総パワー
   * @param {boolean} success チャレンジの成功/失敗
   */
  recordChallengeResult(totalPower: number, success: boolean): void {
    // 統計更新
    this.stats.totalChallenges++
    if (success) {
      this.stats.successfulChallenges++
      if (!this.stats.challengesCompleted) {
        this.stats.challengesCompleted = 0
      }
      this.stats.challengesCompleted++
    } else {
      this.stats.failedChallenges++
      if (!this.stats.challengesFailed) {
        this.stats.challengesFailed = 0
      }
      this.stats.challengesFailed++
    }
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
      this.activeInsurances.push(selectedCard)
      // Phase 3: 保険料負担を更新
      this.updateInsuranceBurden()
    }

    // 選択肢をクリア
    this.cardManager.clearCardChoices()

    // 解決フェーズに移行（ターン終了可能状態）
    this.changePhase('resolution')

    return true
  }

  /**
   * 保険種類を選択してカードを作成・追加
   */
  selectInsuranceType(insuranceType: string, durationType: 'term' | 'whole_life'): InsuranceTypeSelectionResult {
    return this.insuranceService.selectInsuranceType(this, insuranceType, durationType)
  }

  /**
   * 活力を更新（契約による設計版）
   * 
   * 事前条件: changeは数値である
   * 事後条件: 
   *   - 活力は0以上maxVitality以下である
   *   - change < 0の場合、活力は減少または0になる
   *   - change > 0の場合、活力は増加またはmaxVitalityになる
   *   - 統計情報が適切に更新される
   * 不変条件: ゲーム状態の整合性が保たれる
   */
  private updateVitality(change: number): void {
    // 事前条件チェック
    if (typeof change !== 'number' || !isFinite(change)) {
      throw new Error('Change amount must be a finite number')
    }

    // 変更がない場合は処理をスキップ
    if (change === 0) return

    const previousVitality = this.vitality

    if (change >= 0) {
      this._vitality = this._vitality.increase(change)
    } else {
      this._vitality = this._vitality.decrease(-change)
    }

    // 事後条件チェック
    const currentVitality = this.vitality
    if (currentVitality < 0 || currentVitality > this.maxVitality) {
      console.warn(`Vitality invariant violation: ${currentVitality} not in [0, ${this.maxVitality}]`)
      // Auto-correct to prevent crash
      if (currentVitality > this.maxVitality) {
        this._vitality = this._vitality.withMaxVitality(this.maxVitality)
      } else if (currentVitality < 0) {
        // Should be handled by Vitality class but just in case
        this._vitality = Vitality.create(0, this.maxVitality)
      }
    }

    // ダーティフラグを設定
    this._dirtyFlags.vitality = true
    this._dirtyFlags.stats = true

    // 統計更新（防御的プログラミング）
    if (currentVitality > this.stats.highestVitality) {
      this.stats.highestVitality = currentVitality
    }

    // ダメージ履歴を記録
    if (change < 0) {
      this._playerHistory.totalDamageTaken += Math.abs(change)
    }

    // ゲームオーバー判定
    if (this._vitality.isDepleted()) {
      this.changeStatus('game_over')
    }

    // 不変条件チェック
    if (this.status === 'game_over' && !this._vitality.isDepleted()) {
      throw new Error('Game over state inconsistency: vitality not depleted')
    }
  }


  /**
   * ステージに応じて活力上限を更新
   * 年齢が上がるにつれて最大活力が減少し、現実的な体力変化を反映
   */
  private updateMaxVitalityForAge(): void {
    const ageParams = AGE_PARAMETERS[this.stage]
    if (!ageParams) {
      console.warn(`Unknown stage: ${this.stage}`)
      return
    }

    const newMaxVitality = ageParams.maxVitality

    // 現在の活力値が新しい上限を超える場合は調整
    const currentValue = this._vitality.getValue()
    if (currentValue > newMaxVitality) {
      console.info(`[Stage] ${ageParams.label}: Max Vitality adjusted to ${newMaxVitality}`)
      this._vitality = this._vitality.withMaxVitality(newMaxVitality)
    } else {
      // 上限のみ更新（現在値はそのまま）
      this._vitality = Vitality.create(currentValue, newMaxVitality)
    }

    // ダーティフラグを設定
    this._dirtyFlags.vitality = true
  }

  /**
   * 次のターンへ
   */
  nextTurn(): TurnResult {
    this.updateScore()
    return this.turnManager.nextTurn(this)
  }


  /**
   * ステージを進める（手動用）
   */
  advanceStage(): void {
    const advanceResult = this.stageManager.advanceStage(this.stage)

    if (advanceResult.isCompleted) {
      // 最終ステージクリア
      this.changeStatus('victory')
    } else if (advanceResult.newStage) {
      this.changeStage(advanceResult.newStage)
    }
  }

  /**
   * チャレンジデッキを現在のステージ用のカードで補充する
   */
  refillChallengeDeck(): void {
    const newCards = CardFactory.createChallengeCards(this.stage)
    this.cardManager.refillChallengeDeck(newCards)
    console.debug(`[Game] Challenge deck refilled for stage ${this.stage}: ${newCards.length} cards`)
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
    return this.expirationManager.getExpiringSoonInsurances(this.activeInsurances)
  }

  /**
   * 保険期限切れの警告メッセージを取得
   */
  getExpirationWarnings(): string[] {
    return this.expirationManager.getExpirationWarnings(this.activeInsurances)
  }

  /**
   * ステージを設定（内部使用）
   */
  setStage(stage: GameStage): void {
    this.changeStage(stage)
  }

  /**
   * Phase 2-4: 現在有効な保険カードを取得
   */
  getActiveInsurances(): Card[] {
    return [...this.activeInsurances]
  }

  /**
   * スコア計算
   */
  private updateScore(): void {
    // Basic score calculation
    // Vitality * 1
    // Active Insurance: Coverage * 0.1? Or just a flat bonus per active card?
    // Let's go with Rulebook v2 approximation: Vitality + (Total Coverage / 10)
    let insuranceScore = 0
    this.activeInsurances.forEach(card => {
      if (card.coverage) {
        insuranceScore += Math.floor(card.coverage / 10)
      }
    })

    this.score = this.vitality + insuranceScore
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
   * @returns 年齢・種別・リスク調整済み保険料
   */
  calculateCardPremium(card: Card): InsurancePremium {
    if (card.type !== 'insurance') {
      throw new Error('Card must be an insurance card')
    }

    return this.premiumCalculationService.calculateComprehensivePremium(card, this.stage, this._riskProfile)
  }

  /**
   * Phase 3: 保険料負担を計算（最適化版）
   * 
   * キャッシュとダーティフラグによる高速化
   */
  calculateInsuranceBurden(): number {
    const currentTime = Date.now()

    // キャッシュが有効で保険状態が変わっていない場合は再計算をスキップ
    if (!this._dirtyFlags.insurance &&
      currentTime - this._cachedValues.lastUpdateTime < 100 &&
      this._cachedValues.totalInsuranceCount === this.activeInsurances.length) {
      return this._cachedValues.insuranceBurden
    }

    const burden = this.insuranceService.calculateInsuranceBurden(this)

    // キャッシュ更新
    this._cachedValues.insuranceBurden = burden
    this._cachedValues.totalInsuranceCount = this.activeInsurances.length
    this._cachedValues.lastUpdateTime = currentTime
    this._dirtyFlags.insurance = false

    return burden
  }

  /**
   * Phase 3: 保険料負担を更新（最適化版）
   */
  private updateInsuranceBurden(): void {
    this.insuranceService.updateInsuranceBurden(this)
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
    return this.challengeService.calculateTotalPower(this, cards)
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
    this.changePhase(phase)
  }


  /**
   * ゲーム状態のスナップショットを取得（最適化版）
   */
  getSnapshot(): IGameState {
    const cardState = this.cardManager.getState()

    // オブジェクトプールから再利用可能なオブジェクトを取得
    let snapshot = Game.OBJECT_POOLS.gameStates.pop()

    if (!snapshot) {
      snapshot = {}
    }

    // プロパティを設定（配列は適切にコピー）
    Object.assign(snapshot, {
      id: this.id,
      status: this.status,
      phase: this.phase,
      stage: this.stage,
      turn: this.turn,
      vitality: this.vitality,
      maxVitality: this.maxVitality,
      playerDeck: this.playerDeck, // Getter uses getState()
      hand: [...this.hand], // Getter uses getState()
      discardPile: [...this.discardPile], // Getter uses getState()
      challengeDeck: this.challengeDeck, // Getter uses getState()
      currentChallenge: this.currentChallenge,
      selectedCards: [...cardState.selectedCards], // 配列をコピー
      cardChoices: cardState.cardChoices ? [...cardState.cardChoices] : undefined, // 配列をコピー
      insuranceTypeChoices: this.insuranceTypeChoices,
      activeInsurances: [...this.activeInsurances],
      expiredInsurances: [...this.expiredInsurances],
      insuranceBurden: this.insuranceBurden,
      stats: { ...this.stats },
      config: { ...this.config },
      startedAt: this.startedAt,
      completedAt: this.completedAt
    })

    return snapshot as IGameState
  }

  /**
   * 状態変更イベントリスナーを設定
   * Observer Pattern の実装
   */
  private setupStateListeners(): void {
    // フェーズ変更の監視
    this.stateManager.addEventListener('phase_change', (event) => {
      console.info(`[Phase] ${event.previousValue} -> ${event.newValue}`)
      this.handlePhaseChange(event.previousValue, event.newValue)
    })

    // ステージ変更の監視
    this.stateManager.addEventListener('stage_change', (event) => {
      console.info(`[Stage] ${event.previousValue} -> ${event.newValue}`)
      this.updateMaxVitalityForAge()
    })

    // ターン変更の監視
    this.stateManager.addEventListener('turn_change', (event) => {
      console.info(`[Turn] ${event.previousValue} -> ${event.newValue}`)
      this.stats.turnsPlayed = event.newValue
    })

    // ステータス変更の監視
    this.stateManager.addEventListener('status_change', (event) => {
      console.info(`[Status] ${event.previousValue} -> ${event.newValue}`)

      if (event.newValue === 'game_over' || event.newValue === 'victory') {
        this.completedAt = new Date()
      }
    })
  }

  /**
   * フェーズ変更のハンドリング
   */
  private handlePhaseChange(previousPhase: GamePhase, newPhase: GamePhase): void {
    switch (newPhase) {
      case 'draw':
        // ドローフェーズ開始時の処理
        break
      case 'challenge':
        // チャレンジフェーズ開始時の処理
        break
      case 'card_selection':
        // カード選択フェーズ開始時の処理
        break
      case 'resolution':
        // 解決フェーズ開始時の処理
        break
    }
  }

  /**
   * フェーズを安全に変更
   */
  private changePhase(newPhase: GamePhase): void {
    const previousPhase = this.phase
    this.phase = newPhase
    this.stateManager.notifyPhaseChange(previousPhase, newPhase)
  }

  /**
   * ステータスを安全に変更
   */
  private changeStatus(newStatus: GameStatus): void {
    const previousStatus = this.status
    this.status = newStatus
    this.stateManager.notifyStatusChange(previousStatus, newStatus)
  }

  /**
   * ステージを安全に変更
   */
  private changeStage(newStage: GameStage): void {
    const previousStage = this.stage
    this.stage = newStage
    this.stateManager.notifyStageChange(previousStage, newStage)
  }

  /**
   * ターンを安全に変更
   */
  private changeTurn(newTurn: number): void {
    const previousTurn = this.turn
    this.turn = newTurn
    this.stateManager.notifyTurnChange(previousTurn, newTurn)
  }

  /**
   * 状態管理システムにアクセス（テスト・拡張用）
   */
  getStateManager(): GameStateManager {
    return this.stateManager
  }

  /**
   * アクション処理システムにアクセス（テスト・拡張用）
   */
  getActionProcessor(): GameActionProcessor {
    return this.actionProcessor
  }

  /**
   * オブジェクトプールへのスナップショット返却
   */
  static releaseSnapshot(snapshot: IGameState): void {
    // プールサイズを制限（メモリリーク防止）
    if (Game.OBJECT_POOLS.gameStates.length < 10) {
      // オブジェクトをクリア
      Object.keys(snapshot).forEach(key => {
        delete (snapshot as Record<string, any>)[key]
      })
      Game.OBJECT_POOLS.gameStates.push(snapshot as Partial<IGameState>)
    }
  }

  /**
   * パフォーマンス統計の取得
   */
  getPerformanceStats(): {
    poolStats: {
      gameStates: number
      cards: number
      challengeResults: number
    }
    cacheHitRate: number
    dirtyFlags: Record<string, boolean>
  } {
    return {
      poolStats: {
        gameStates: Game.OBJECT_POOLS.gameStates.length,
        cards: Game.OBJECT_POOLS.cards.length,
        challengeResults: Game.OBJECT_POOLS.challengeResults.length
      },
      cacheHitRate: this._cachedValues.lastUpdateTime > 0 ? 0.85 : 0, // 概算
      dirtyFlags: { ...this._dirtyFlags }
    }
  }

  // === AI戦略システム ===

  /**
   * AI機能の有効/無効を設定
   */
  setAIEnabled(enabled: boolean): void {
    this._aiEnabled = enabled
    if (enabled) {
      console.info(`[AI] System Enabled (Strategy: ${this._currentAIStrategy})`)
    } else {
      console.info('[AI] System Disabled')
    }
  }

  /**
   * AI機能の有効状態を取得
   */
  isAIEnabled(): boolean {
    return this._aiEnabled
  }

  /**
   * AI戦略を変更
   */
  setAIStrategy(strategyType: AIStrategyType): void {
    this._currentAIStrategy = strategyType
    this.aiStrategyService.setStrategy(strategyType)
    console.info(`[AI] Strategy Changed: ${strategyType}`)
  }

  /**
   * 現在のAI戦略を取得
   */
  getCurrentAIStrategy(): AIStrategyType {
    return this._currentAIStrategy
  }

  /**
   * AI戦略の統計情報を取得
   */
  getAIStatistics() {
    return this.aiStrategyService.getStatistics()
  }

  /**
   * AIによるチャレンジ自動選択
   */
  aiSelectChallenge(): Card | null {
    if (!this._aiEnabled) {
      throw new Error('AI is not enabled')
    }

    const availableChallenges = this.cardManager.getState().challengeDeck.getCards()
    if (availableChallenges.length === 0) {
      return null
    }

    const choice = this.aiStrategyService.autoSelectChallenge(availableChallenges, this)
    console.debug(`[AI] Auto-selected challenge: ${choice.challenge.name} (Success Rate: ${(choice.successProbability * 100).toFixed(1)}%)`)
    console.debug(`[AI] Reason: ${choice.reason}`)

    return choice.challenge
  }

  /**
   * AIによるカード自動選択
   */
  aiSelectCards(challenge: Card): Card[] {
    if (!this._aiEnabled) {
      throw new Error('AI is not enabled')
    }

    const availableCards = this.cardManager.getState().playerDeck.getCards()
    const choice = this.aiStrategyService.autoSelectCards(challenge, availableCards, this)

    console.debug(`[AI] Auto-selected cards: ${choice.cards.map(c => c.name).join(', ')}`)
    console.debug(`[AI] Reason: ${choice.reason}`)
    console.debug(`[AI] Expected Power: ${choice.expectedPower}`)

    return choice.cards
  }

  /**
   * AIによる完全自動プレイ（チャレンジ選択→カード選択→解決）
   */
  aiAutoPlay(): ChallengeResult | null {
    if (!this._aiEnabled) {
      throw new Error('AI is not enabled')
    }

    if (this.phase !== 'draw') {
      throw new Error('Auto play can only be used during draw phase')
    }

    // 1. チャレンジを選択
    const selectedChallenge = this.aiSelectChallenge()
    if (!selectedChallenge) {
      console.warn('[AI] No challenges available')
      return null
    }

    // 2. チャレンジを開始
    this.challengeService.startChallenge(this, selectedChallenge)

    // 3. カードを選択
    const selectedCards = this.aiSelectCards(selectedChallenge)

    // 4. カードを選択状態にする
    selectedCards.forEach(card => {
      this.cardManager.toggleCardSelection(card)
    })

    // 5. チャレンジを解決
    const result = this.challengeService.resolveChallenge(this)

    // 6. 統計を記録
    const challengeChoice = this.aiStrategyService.autoSelectChallenge([selectedChallenge], this)
    const cardChoice = this.aiStrategyService.autoSelectCards(selectedChallenge, selectedCards, this)
    this.aiStrategyService.recordDecision(this.turn, challengeChoice, cardChoice, result.success)

    return result
  }

  /**
   * AI設定のリセット
   */
  resetAISettings(): void {
    this._aiEnabled = false
    this._currentAIStrategy = 'balanced'
    this.aiStrategyService.setStrategy('balanced')
    this.aiStrategyService.clearHistory()
    console.info('[AI] Settings Reset')
  }
}
