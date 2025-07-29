import type { Card } from '../../entities/Card'
import { CardPower } from '../../valueObjects/CardPower'
import { ChallengeId } from './ChallengeId'
import type { ChallengeStatus} from './types';
import { ChallengeResult } from './types'
import type { 
  DomainEvent} from './events';
import {
  CardSelectedForChallengeEvent,
  CardDeselectedFromChallengeEvent,
  ChallengeResolvedEvent
} from './events'

/**
 * チャレンジ集約
 * 
 * チャレンジに関する全てのビジネスロジックを管理します。
 * この集約はイベントソーシングパターンを採用し、全ての状態変更はイベントとして記録されます。
 */
export class Challenge {
  private selectedCards: Card[] = []
  private status: ChallengeStatus = 'in_progress'
  private uncommittedEvents: DomainEvent[] = []

  private constructor(
    private readonly id: ChallengeId,
    private readonly challengeCard: Card,
    private readonly requiredPower: CardPower
  ) {}

  /**
   * チャレンジを作成
   */
  static create(challengeCard: Card): Challenge {
    if (challengeCard.type !== 'challenge') {
      throw new Error('Challenge card must be of type "challenge"')
    }

    return new Challenge(
      ChallengeId.generate(),
      challengeCard,
      challengeCard.getPower()
    )
  }

  /**
   * チャレンジIDを取得
   */
  getId(): ChallengeId {
    return this.id
  }

  /**
   * チャレンジカードを取得
   */
  getChallengeCard(): Card {
    return this.challengeCard
  }

  /**
   * 必要パワーを取得
   */
  getRequiredPower(): CardPower {
    return this.requiredPower
  }

  /**
   * 状態を取得
   */
  getStatus(): ChallengeStatus {
    return this.status
  }

  /**
   * 選択されたカードを取得
   */
  getSelectedCards(): ReadonlyArray<Card> {
    return [...this.selectedCards]
  }

  /**
   * カードを選択
   */
  selectCard(card: Card): DomainEvent[] {
    if (this.status !== 'in_progress') {
      throw new Error('Challenge is already resolved')
    }

    if (card.type === 'challenge') {
      throw new Error('Cannot select challenge cards')
    }

    // 既に選択されているかチェック
    const isAlreadySelected = this.selectedCards.some(c => c.id === card.id)
    if (isAlreadySelected) {
      return []
    }

    this.selectedCards.push(card)
    const event = new CardSelectedForChallengeEvent(this.id, card.id)
    this.addEvent(event)
    return [event]
  }

  /**
   * カードの選択を解除
   */
  deselectCard(card: Card): DomainEvent[] {
    if (this.status !== 'in_progress') {
      throw new Error('Challenge is already resolved')
    }

    const index = this.selectedCards.findIndex(c => c.id === card.id)
    if (index === -1) {
      return []
    }

    this.selectedCards.splice(index, 1)
    const event = new CardDeselectedFromChallengeEvent(this.id, card.id)
    this.addEvent(event)
    return [event]
  }

  /**
   * 選択されたカードの合計パワーを計算
   */
  calculateSelectedPower(): CardPower {
    const powers = this.selectedCards.map(card => card.getPower())
    return CardPower.sum(powers)
  }

  /**
   * チャレンジを解決
   */
  resolve(): ChallengeResult {
    if (this.status !== 'in_progress') {
      throw new Error('Challenge is already resolved')
    }

    const totalPower = this.calculateSelectedPower()
    const isSuccess = totalPower.isGreaterThanOrEqual(this.requiredPower)

    this.status = 'resolved'

    const event = new ChallengeResolvedEvent(
      this.id,
      isSuccess,
      totalPower.getValue(),
      this.requiredPower.getValue(),
      this.selectedCards.map(c => c.id)
    )
    this.addEvent(event)

    return new ChallengeResult(
      this.id,
      isSuccess,
      totalPower,
      this.requiredPower
    )
  }

  /**
   * チャレンジが進行中かどうか
   */
  isInProgress(): boolean {
    return this.status === 'in_progress'
  }

  /**
   * チャレンジが解決済みかどうか
   */
  isResolved(): boolean {
    return this.status === 'resolved'
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

  /**
   * イベントから状態を再構築（イベントソーシング用）
   */
  static fromEvents(id: ChallengeId, challengeCard: Card, events: DomainEvent[]): Challenge {
    const challenge = new Challenge(id, challengeCard, challengeCard.getPower())
    
    for (const event of events) {
      challenge.applyEvent(event)
    }
    
    return challenge
  }

  /**
   * イベントを適用
   */
  private applyEvent(event: DomainEvent): void {
    switch (event.type) {
      case 'CardSelectedForChallenge':
        // イベントから状態を再構築する場合の処理
        // 実際のカード取得はリポジトリ経由で行う必要がある
        break
      case 'CardDeselectedFromChallenge':
        // 同上
        break
      case 'ChallengeResolved':
        this.status = 'resolved'
        break
    }
  }
}