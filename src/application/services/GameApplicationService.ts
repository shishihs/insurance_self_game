import { Game } from '../../domain/entities/Game'
import { Card } from '../../domain/entities/Card'
import { Challenge } from '../../domain/aggregates/challenge'
import { Insurance } from '../../domain/aggregates/insurance'
import { ChallengeResult } from '../../domain/aggregates/challenge/types'
import { DomainEvent } from '../../domain/aggregates/challenge/events'
import { Vitality } from '../../domain/valueObjects/Vitality'
import { InsurancePremium } from '../../domain/valueObjects/InsurancePremium'

/**
 * ゲームアプリケーションサービス
 * 
 * ゲームのユースケースを実装し、集約間の調整を行います。
 * このサービスはドメインロジックを含まず、純粋に集約の調整のみを行います。
 */
export class GameApplicationService {
  private currentChallenge?: Challenge
  private activeInsurances: Map<string, Insurance> = new Map()
  private domainEvents: DomainEvent[] = []

  constructor(
    private game: Game,
    private eventPublisher?: (event: DomainEvent) => void
  ) {}

  /**
   * ゲームを開始
   */
  startGame(): void {
    this.game.start()
  }

  /**
   * チャレンジを開始
   */
  startChallenge(challengeCard: Card): Challenge {
    if (this.currentChallenge?.isInProgress()) {
      throw new Error('Another challenge is already in progress')
    }

    // Game集約でフェーズを更新
    this.game.startChallenge(challengeCard)
    
    // Challenge集約を作成
    this.currentChallenge = Challenge.create(challengeCard)
    
    return this.currentChallenge
  }

  /**
   * チャレンジ用のカードを選択
   */
  selectCardForChallenge(card: Card): void {
    if (!this.currentChallenge) {
      throw new Error('No challenge in progress')
    }

    const events = this.currentChallenge.selectCard(card)
    this.publishEvents(events)
  }

  /**
   * チャレンジ用のカードの選択を解除
   */
  deselectCardForChallenge(card: Card): void {
    if (!this.currentChallenge) {
      throw new Error('No challenge in progress')
    }

    const events = this.currentChallenge.deselectCard(card)
    this.publishEvents(events)
  }

  /**
   * チャレンジを解決
   */
  resolveChallenge(): ChallengeResult {
    if (!this.currentChallenge) {
      throw new Error('No challenge to resolve')
    }

    // チャレンジを解決
    const result = this.currentChallenge.resolve()
    
    // ダメージ処理
    if (!result.isSuccess()) {
      const damage = result.calculateDamage()
      this.applyDamageWithInsurance(damage)
    }

    // チャレンジをクリア
    this.currentChallenge = undefined
    
    // Game集約に結果を反映
    const gameResult = this.game.resolveChallenge(
      result.getTotalPower().getValue(),
      result.isSuccess()
    )

    return result
  }

  /**
   * 保険を有効化
   */
  activateInsurance(insuranceCard: Card): Insurance {
    const insurance = Insurance.create(insuranceCard)
    this.activeInsurances.set(insurance.getId().getValue(), insurance)
    
    // 保険料負担を更新
    this.updateInsuranceBurden()
    
    const events = insurance.getUncommittedEvents()
    this.publishEvents(events)
    insurance.markEventsAsCommitted()
    
    return insurance
  }

  /**
   * ダメージを保険で軽減して適用
   */
  private applyDamageWithInsurance(damage: number): void {
    let remainingDamage = damage
    
    // アクティブな保険でダメージを吸収
    for (const insurance of this.activeInsurances.values()) {
      if (remainingDamage <= 0 || !insurance.isActive()) continue
      
      const events = insurance.use(remainingDamage)
      if (events.length > 0) {
        const absorbed = events[0].damageAbsorbed
        remainingDamage -= absorbed
        this.publishEvents(events)
      }
    }
    
    // 残りのダメージをゲームに適用
    if (remainingDamage > 0) {
      this.game.applyDamage(remainingDamage)
    }
  }

  /**
   * ターンを進める
   */
  nextTurn(): void {
    // 保険の期限を更新
    for (const insurance of this.activeInsurances.values()) {
      const events = insurance.decrementTurn()
      this.publishEvents(events)
      
      // 期限切れの保険を削除
      if (insurance.isExpired()) {
        this.activeInsurances.delete(insurance.getId().getValue())
      }
    }
    
    // 保険料負担を更新
    this.updateInsuranceBurden()
    
    // ゲームのターンを進める
    this.game.nextTurn()
  }

  /**
   * 保険料負担を更新
   */
  private updateInsuranceBurden(): void {
    // アクティブな保険の保険料を集計
    const premiums: InsurancePremium[] = []
    for (const insurance of this.activeInsurances.values()) {
      if (insurance.isActive()) {
        const adjustedPremium = insurance.calculateAdjustedPremium(this.game.stage)
        premiums.push(adjustedPremium)
      }
    }
    
    // 合計保険料を計算
    const totalPremium = InsurancePremium.sum(premiums)
    
    // Game集約に反映（簡略化のため、直接設定）
    // 本来はGame集約のメソッドを通じて更新すべき
  }

  /**
   * イベントを発行
   */
  private publishEvents(events: DomainEvent[]): void {
    for (const event of events) {
      this.domainEvents.push(event)
      if (this.eventPublisher) {
        this.eventPublisher(event)
      }
    }
  }

  /**
   * 発生したドメインイベントを取得
   */
  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return [...this.domainEvents]
  }

  /**
   * ドメインイベントをクリア
   */
  clearDomainEvents(): void {
    this.domainEvents = []
  }

  /**
   * 現在のチャレンジを取得
   */
  getCurrentChallenge(): Challenge | undefined {
    return this.currentChallenge
  }

  /**
   * アクティブな保険を取得
   */
  getActiveInsurances(): ReadonlyArray<Insurance> {
    return Array.from(this.activeInsurances.values())
  }
}