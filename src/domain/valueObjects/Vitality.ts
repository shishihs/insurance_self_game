/**
 * 活力を表す値オブジェクト
 * 
 * このクラスはイミュータブルであり、すべての操作は新しいインスタンスを返します。
 * ビジネスルール：
 * - 活力は0以上、最大値以下でなければならない
 * - 最大値は1以上でなければならない
 */
export class Vitality {
  private constructor(
    private readonly value: number,
    private readonly max: number
  ) {
    this.validate()
  }

  /**
   * Vitality インスタンスを生成する
   * @param value 現在の活力値
   * @param max 最大活力値
   * @throws {Error} 不正な値の場合
   */
  static create(value: number, max: number): Vitality {
    return new Vitality(value, max)
  }

  /**
   * 値の妥当性を検証する
   * @private
   */
  private validate(): void {
    if (this.max <= 0) {
      throw new Error('Maximum vitality must be positive')
    }
    if (this.value < 0) {
      throw new Error('Vitality value cannot be negative')
    }
    if (this.value > this.max) {
      throw new Error('Vitality value cannot exceed maximum')
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
    return this.max
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
    return new Vitality(Math.max(0, this.value - amount), this.max)
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
    return new Vitality(Math.min(this.max, this.value + amount), this.max)
  }

  /**
   * パーセンテージを取得（0-100）
   */
  getPercentage(): number {
    return Math.floor((this.value / this.max) * 100)
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
    return this.value === this.max
  }

  /**
   * 他のVitalityインスタンスと等価か判定
   */
  equals(other: Vitality): boolean {
    return this.value === other.value && this.max === other.max
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `${this.value}/${this.max} (${this.getPercentage()}%)`
  }
}