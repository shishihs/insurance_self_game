import { CardPower } from '../../valueObjects/CardPower'
import { ChallengeId } from './ChallengeId'

/**
 * チャレンジの状態
 */
export type ChallengeStatus = 'in_progress' | 'resolved'

/**
 * チャレンジ結果
 */
export class ChallengeResult {
  constructor(
    private readonly challengeId: ChallengeId,
    private readonly success: boolean,
    private readonly totalPower: CardPower,
    private readonly requiredPower: CardPower
  ) {}

  /**
   * チャレンジIDを取得
   */
  getChallengeId(): ChallengeId {
    return this.challengeId
  }

  /**
   * 成功したかどうか
   */
  isSuccess(): boolean {
    return this.success
  }

  /**
   * 選択されたカードの合計パワー
   */
  getTotalPower(): CardPower {
    return this.totalPower
  }

  /**
   * 必要だったパワー
   */
  getRequiredPower(): CardPower {
    return this.requiredPower
  }

  /**
   * ダメージ量を計算（失敗時のみ）
   */
  calculateDamage(): number {
    if (this.success) {
      return 0
    }
    const deficit = this.requiredPower.getValue() - this.totalPower.getValue()
    return Math.max(0, deficit)
  }
}