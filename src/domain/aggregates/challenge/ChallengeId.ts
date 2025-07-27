/**
 * チャレンジIDを表す値オブジェクト
 */
export class ChallengeId {
  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('ChallengeId cannot be empty')
    }
  }

  /**
   * 新しいChallengeIdを生成
   */
  static generate(): ChallengeId {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return new ChallengeId(`challenge_${timestamp}_${random}`)
  }

  /**
   * 既存の値からChallengeIdを作成
   */
  static from(value: string): ChallengeId {
    return new ChallengeId(value)
  }

  /**
   * 値を取得
   */
  getValue(): string {
    return this.value
  }

  /**
   * 等価性判定
   */
  equals(other: ChallengeId): boolean {
    return this.value === other.value
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return this.value
  }
}