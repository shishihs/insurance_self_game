import type { Card } from '../../entities/Card'
import type { InsurancePremium } from '../../valueObjects/InsurancePremium'
import { CardPower } from '../../valueObjects/CardPower'
import { InsuranceId } from './InsuranceId'
import type { 
  DomainEvent} from './events';
import {
  InsuranceActivatedEvent,
  InsuranceExpiredEvent,
  InsuranceUsedEvent,
} from './events'
import type { GameStage } from '../../types/card.types'

/**
 * 保険集約
 * 
 * 保険に関する全てのビジネスロジックを管理します。
 * 保険の使用、期限管理、保険料計算などを責務とします。
 */
export class Insurance {
  private usageCount: number = 0
  private totalDamageAbsorbed: number = 0
  private remainingTurns?: number
  private expired: boolean = false
  private uncommittedEvents: DomainEvent[] = []

  private constructor(
    private readonly id: InsuranceId,
    private readonly card: Card,
    private readonly coverage: CardPower,
    private readonly premium: InsurancePremium
  ) {
    this.remainingTurns = card.remainingTurns
    this.expired = card.isExpired()
  }

  /**
   * 保険を作成
   */
  static create(card: Card): Insurance {
    if (card.type !== 'insurance') {
      throw new Error('Card must be of type "insurance"')
    }

    const insurance = new Insurance(
      InsuranceId.generate(),
      card,
      CardPower.create(card.coverage || 0),
      card.getCost()
    )

    const event = new InsuranceActivatedEvent(
      insurance.id,
      card.id,
      card.coverage || 0,
      card.cost,
      card.durationType || 'term'
    )
    insurance.addEvent(event)

    return insurance
  }

  /**
   * 保険IDを取得
   */
  getId(): InsuranceId {
    return this.id
  }

  /**
   * 保険カードを取得
   */
  getCard(): Card {
    return this.card
  }

  /**
   * カバレッジを取得
   */
  getCoverage(): CardPower {
    return this.coverage
  }

  /**
   * 保険料を取得
   */
  getPremium(): InsurancePremium {
    return this.premium
  }

  /**
   * 使用回数を取得
   */
  getUsageCount(): number {
    return this.usageCount
  }

  /**
   * 総吸収ダメージを取得
   */
  getTotalDamageAbsorbed(): number {
    return this.totalDamageAbsorbed
  }

  /**
   * 残りターン数を取得
   */
  getRemainingTurns(): number | undefined {
    return this.remainingTurns
  }

  /**
   * 保険を使用してダメージを吸収
   */
  use(damage: number): DomainEvent[] {
    if (!this.isActive()) {
      return []
    }

    const maxAbsorption = this.coverage.getValue()
    const absorbed = Math.min(damage, maxAbsorption)
    const overflow = Math.max(0, damage - maxAbsorption)

    this.usageCount++
    this.totalDamageAbsorbed += absorbed

    const event = new InsuranceUsedEvent(this.id, absorbed, overflow)
    this.addEvent(event)

    return [event]
  }

  /**
   * ターンを経過させる（定期保険のみ）
   */
  decrementTurn(): DomainEvent[] {
    if (!this.isTermInsurance() || this.expired) {
      return []
    }

    if (this.remainingTurns === undefined || this.remainingTurns <= 0) {
      return []
    }

    this.remainingTurns--

    if (this.remainingTurns === 0) {
      this.expired = true
      const event = new InsuranceExpiredEvent(
        this.id,
        this.usageCount,
        this.totalDamageAbsorbed
      )
      this.addEvent(event)
      return [event]
    }

    return []
  }

  /**
   * 年齢による保険料調整を計算
   * 
   * @deprecated ドメインサービス InsurancePremiumCalculationService.calculateAgeAdjustedPremium() を使用してください
   */
  calculateAdjustedPremium(stage: GameStage): InsurancePremium {
    // 後方互換性のため残しているが、新しい実装ではドメインサービスを使用
    let multiplier = 1.0

    switch (stage) {
      case 'youth':
        multiplier = 1.0
        break
      case 'middle_age':
        multiplier = 1.2
        break
      case 'elder':
        multiplier = 1.5
        break
    }

    return this.premium.applyMultiplier(multiplier)
  }

  /**
   * アクティブかどうか
   */
  isActive(): boolean {
    return !this.expired
  }

  /**
   * 期限切れかどうか
   */
  isExpired(): boolean {
    return this.expired
  }

  /**
   * 定期保険かどうか
   */
  isTermInsurance(): boolean {
    return this.card.isTermInsurance()
  }

  /**
   * 終身保険かどうか
   */
  isWholeLifeInsurance(): boolean {
    return this.card.isWholeLifeInsurance()
  }

  /**
   * 年齢ボーナスを持つかどうか
   */
  hasAgeBonus(): boolean {
    return this.card.ageBonus !== undefined && this.card.ageBonus > 0
  }

  /**
   * 年齢ボーナスを取得
   */
  getAgeBonus(): number {
    return this.card.ageBonus || 0
  }

  /**
   * 未コミットのイベントを取得
   */
  getUncommittedEvents(): ReadonlyArray<DomainEvent> {
    return [...this.uncommittedEvents]
  }

  /**
   * イベントをコミット済みとしてマーク
   */
  markEventsAsCommitted(): void {
    this.uncommittedEvents = []
  }

  /**
   * イベントを追加
   */
  private addEvent(event: DomainEvent): void {
    this.uncommittedEvents.push(event)
  }
}