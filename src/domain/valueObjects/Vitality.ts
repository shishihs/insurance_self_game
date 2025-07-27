/**
 * 活力を表す値オブジェクト
 * 
 * このクラスはイミュータブルであり、すべての操作は新しいインスタンスを返します。
 * ビジネスルール：
 * - 活力は0以上100以下でなければならない
 */
export class Vitality {
  private static readonly MAX_VITALITY = 100

  private constructor(
    private readonly value: number
  ) {
    this.validate()
  }

  /**
   * Vitality インスタンスを生成する
   * @param value 活力値（0-100）
   * @throws {Error} 不正な値の場合
   */
  static create(value: number): Vitality {
    return new Vitality(value)
  }

  /**
   * 値の妥当性を検証する
   * @private
   */
  private validate(): void {
    if (this.value < 0 || this.value > Vitality.MAX_VITALITY) {
      throw new Error(`Vitality must be between 0 and ${Vitality.MAX_VITALITY}`)
    }
  }

  /**
   * 現在の活力値を取得
   */
  getValue(): number {
    return this.value
  }

  /**
   * 最大活力値を取得
   */
  getMax(): number {
    return Vitality.MAX_VITALITY
  }

  /**
   * 活力を減少させる
   * @param amount 減少量
   * @returns 新しいVitalityインスタンス
   * @throws {Error} 減少量が負の場合
   */
  decrease(amount: number): Vitality {
    if (amount < 0) {
      throw new Error('Decrease amount must be non-negative')
    }
    return new Vitality(Math.max(0, this.value - amount))
  }

  /**
   * 活力を増加させる
   * @param amount 増加量
   * @returns 新しいVitalityインスタンス
   * @throws {Error} 増加量が負の場合
   */
  increase(amount: number): Vitality {
    if (amount < 0) {
      throw new Error('Increase amount must be non-negative')
    }
    return new Vitality(Math.min(Vitality.MAX_VITALITY, this.value + amount))
  }

  /**
   * パーセンテージを取得（0-100）
   */
  getPercentage(): number {
    return Math.floor((this.value / Vitality.MAX_VITALITY) * 100)
  }

  /**
   * 活力が枯渇しているか判定
   */
  isDepleted(): boolean {
    return this.value === 0
  }

  /**
   * 活力が満タンか判定
   */
  isFull(): boolean {
    return this.value === Vitality.MAX_VITALITY
  }

  /**
   * 他のVitalityインスタンスと等価か判定
   */
  equals(other: Vitality): boolean {
    return this.value === other.value
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `${this.value}/${Vitality.MAX_VITALITY} (${this.getPercentage()}%)`
  }
}