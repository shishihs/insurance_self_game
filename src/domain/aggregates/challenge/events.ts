import type { ChallengeId } from './ChallengeId'

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
 * カードがチャレンジのために選択されたイベント
 */
export class CardSelectedForChallengeEvent extends DomainEvent {
  constructor(
    public readonly challengeId: ChallengeId,
    public readonly cardId: string
  ) {
    super()
  }

  get type(): string {
    return 'CardSelectedForChallenge'
  }
}

/**
 * カードの選択が解除されたイベント
 */
export class CardDeselectedFromChallengeEvent extends DomainEvent {
  constructor(
    public readonly challengeId: ChallengeId,
    public readonly cardId: string
  ) {
    super()
  }

  get type(): string {
    return 'CardDeselectedFromChallenge'
  }
}

/**
 * チャレンジが解決されたイベント
 */
export class ChallengeResolvedEvent extends DomainEvent {
  constructor(
    public readonly challengeId: ChallengeId,
    public readonly success: boolean,
    public readonly totalPower: number,
    public readonly requiredPower: number,
    public readonly selectedCardIds: string[]
  ) {
    super()
  }

  get type(): string {
    return 'ChallengeResolved'
  }
}