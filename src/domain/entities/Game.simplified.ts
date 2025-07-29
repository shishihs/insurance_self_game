import type { Card } from './Card'
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
} from '../types/game.types'
import { AGE_PARAMETERS } from '../types/game.types'
import type { GameStage } from '../types/card.types'
import { Vitality } from '../valueObjects/Vitality'

/**
 * 簡略化されたGameエンティティ
 * 
 * 責務を削減し、ゲームの基本的な状態管理のみを行います。
 * - チャレンジの詳細管理 → Challenge集約へ
 * - 保険の詳細管理 → Insurance集約へ
 * - 複雑なビジネスロジック → GameApplicationServiceへ
 */
export class SimplifiedGame implements IGameState {
  id: string
  status: GameStatus
  phase: GamePhase
  stage: GameStage
  turn: number
  private _vitality: Vitality
  
  // カード管理を移譲
  private cardManager: ICardManager
  
  currentChallenge?: Card
  
  stats: PlayerStats
  config: GameConfig
  
  // 簡略化: 保険カードのIDのみ保持
  insuranceCardIds: string[] = []
  
  startedAt?: Date
  completedAt?: Date

  constructor(config: GameConfig) {
    this.id = this.generateId()
    this.status = 'not_started'
    this.phase = 'setup'
    this.stage = 'youth'
    this.turn = 0
    
    // 値オブジェクトで初期化
    const maxVitality = AGE_PARAMETERS[this.stage].maxVitality
    this._vitality = Vitality.create(config.startingVitality, maxVitality)
    
    // CardManagerを初期化
    this.cardManager = new CardManager()
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
      highestVitality: config.startingVitality,
      turnsPlayed: 0
    }
    
    this.config = config
  }

  /**
   * 後方互換性のためのgetter
   */
  get vitality(): number {
    return this._vitality.getValue()
  }

  get maxVitality(): number {
    return this._vitality.getMax()
  }

  /**
   * 値オブジェクトとしての活力取得
   */
  getVitality(): Vitality {
    return this._vitality
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
   * チャレンジフェーズを開始（簡略化）
   */
  startChallenge(challengeCard: Card): void {
    if (this.phase !== 'draw') {
      throw new Error('Can only start challenge during draw phase')
    }
    
    this.currentChallenge = challengeCard
    this.phase = 'challenge'
  }

  /**
   * チャレンジを解決（簡略化）
   */
  resolveChallenge(totalPower: number, isSuccess: boolean): ChallengeResult {
    if (!this.currentChallenge) {
      throw new Error('No challenge to resolve')
    }
    
    const result: ChallengeResult = {
      isSuccess,
      totalPower,
      damage: isSuccess ? 0 : Math.max(0, this.currentChallenge.power - totalPower),
      rewards: isSuccess ? [/* 報酬カード */] : []
    }
    
    // 統計を更新
    this.stats.totalChallenges++
    if (isSuccess) {
      this.stats.successfulChallenges++
    } else {
      this.stats.failedChallenges++
    }
    
    this.currentChallenge = undefined
    this.phase = 'resolution'
    
    return result
  }

  /**
   * ダメージを適用
   */
  applyDamage(damage: number): void {
    this._vitality = this._vitality.decrease(damage)
    
    // ゲームオーバー判定
    if (this._vitality.isDepleted()) {
      this.status = 'game_over'
      this.completedAt = new Date()
    }
  }

  /**
   * 活力を回復
   */
  heal(amount: number): void {
    this._vitality = this._vitality.increase(amount)
    this.stats.highestVitality = Math.max(this.stats.highestVitality, this.vitality)
  }

  /**
   * ステージを進行
   */
  advanceStage(): void {
    const stages: GameStage[] = ['youth', 'middle_age', 'elder']
    const currentIndex = stages.indexOf(this.stage)
    
    if (currentIndex < stages.length - 1) {
      this.stage = stages[currentIndex + 1]
      this.updateMaxVitalityForAge()
    }
  }

  /**
   * ステージに応じて活力上限を更新
   */
  private updateMaxVitalityForAge(): void {
    const newMaxVitality = AGE_PARAMETERS[this.stage].maxVitality
    
    // 新しい最大値でVitalityオブジェクトを再作成
    const currentValue = Math.min(this.vitality, newMaxVitality)
    this._vitality = Vitality.create(currentValue, newMaxVitality)
  }

  /**
   * 次のターンへ
   */
  nextTurn(): void {
    this.turn++
    this.stats.turnsPlayed++
    this.phase = 'draw'
    
    // ステージ進行チェック（簡略化）
    if (this.turn % 10 === 0) {
      this.advanceStage()
    }
  }

  /**
   * ゲーム進行中かどうか
   */
  isInProgress(): boolean {
    return this.status === 'in_progress'
  }

  /**
   * ゲーム終了
   */
  end(): void {
    if (this.status === 'in_progress') {
      this.status = 'completed'
      this.completedAt = new Date()
    }
  }

  /**
   * 手札を取得
   */
  getHand(): Card[] {
    return this.cardManager.getHand()
  }

  /**
   * 使用済みカードを取得
   */
  getUsedCards(): Card[] {
    return this.cardManager.getUsedCards()
  }

  /**
   * ゲーム状態をクローン
   */
  clone(): SimplifiedGame {
    const cloned = Object.create(Object.getPrototypeOf(this))
    return Object.assign(cloned, {
      ...this,
      _vitality: this._vitality,
      stats: { ...this.stats },
      config: { ...this.config },
      insuranceCardIds: [...this.insuranceCardIds]
    })
  }
}