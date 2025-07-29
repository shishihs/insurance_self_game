import type { InsuranceId } from './InsuranceId'

/**
 * ドメインイベントの基底クラス
 */
export abstract class DomainEvent {
  readonly occurredAt: Date

  constructor() {
    this.occurredAt = new Date()
  }

  abstract get type(): string
}

/**
 * 保険が有効化されたイベント
 */
export class InsuranceActivatedEvent extends DomainEvent {
  constructor(
    public readonly insuranceId: InsuranceId,
    public readonly cardId: string,
    public readonly coverage: number,
    public readonly premium: number,
    public readonly durationType: 'term' | 'whole_life'
  ) {
    super()
  }

  get type(): string {
    return 'InsuranceActivated'
  }
}

/**
 * 保険が使用されたイベント
 */
export class InsuranceUsedEvent extends DomainEvent {
  constructor(
    public readonly insuranceId: InsuranceId,
    public readonly damageAbsorbed: number,
    public readonly damageOverflow: number = 0
  ) {
    super()
  }

  get type(): string {
    return 'InsuranceUsed'
  }
}

/**
 * 保険が期限切れになったイベント
 */
export class InsuranceExpiredEvent extends DomainEvent {
  constructor(
    public readonly insuranceId: InsuranceId,
    public readonly totalUsageCount: number,
    public readonly totalDamageAbsorbed: number
  ) {
    super()
  }

  get type(): string {
    return 'InsuranceExpired'
  }
}

/**
 * 保険料が調整されたイベント
 */
export class InsurancePremiumAdjustedEvent extends DomainEvent {
  constructor(
    public readonly insuranceId: InsuranceId,
    public readonly originalPremium: number,
    public readonly adjustedPremium: number,
    public readonly reason: string
  ) {
    super()
  }

  get type(): string {
    return 'InsurancePremiumAdjusted'
  }
}