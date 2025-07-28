/**
 * 活力を表す値オブジェクト
 * 
 * このクラスはイミュータブルであり、すべての操作は新しいインスタンスを返します。
 * ビジネスルール：
 * - 活力は0以上100以下でなければならない
 */
export class Vitality {
  private static readonly DEFAULT_MAX_VITALITY = 100

  private constructor(
    private readonly value: number,
    private readonly maxVitality: number = Vitality.DEFAULT_MAX_VITALITY
  ) {
    this.validate()
  }

  /**
   * Vitality インスタンスを生成する
   * @param value 活力値
   * @param maxVitality 最大活力値（デフォルト: 100）
   * @throws {Error} 不正な値の場合
   */
  static create(value: number, maxVitality: number = Vitality.DEFAULT_MAX_VITALITY): Vitality {
    return new Vitality(value, maxVitality)
  }

  /**
   * 値の妥当性を検証する
   * @private
   */
  private validate(): void {
    if (this.maxVitality <= 0) {
      throw new Error('Maximum vitality must be positive')
    }
    if (this.value < 0) {
      throw new Error('Vitality value cannot be negative')
    }
    if (this.value > this.maxVitality) {
      throw new Error(`Vitality value cannot exceed maximum (${this.maxVitality})`)
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
    return this.maxVitality
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
    return new Vitality(Math.max(0, this.value - amount), this.maxVitality)
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
    return new Vitality(Math.min(this.maxVitality, this.value + amount), this.maxVitality)
  }

  /**
   * パーセンテージを取得（0-100）
   */
  getPercentage(): number {
    return Math.floor((this.value / this.maxVitality) * 100)
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
    return this.value === this.maxVitality
  }

  /**
   * 最大活力値を変更したVitalityインスタンスを作成
   * 現在の活力値が新しい最大値を超える場合は最大値に調整
   * @param newMaxVitality 新しい最大活力値
   * @returns 新しいVitalityインスタンス
   */
  withMaxVitality(newMaxVitality: number): Vitality {
    const adjustedValue = Math.min(this.value, newMaxVitality)
    return new Vitality(adjustedValue, newMaxVitality)
  }

  /**
   * 他のVitalityインスタンスと等価か判定
   */
  equals(other: Vitality): boolean {
    return this.value === other.value && this.maxVitality === other.maxVitality
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `${this.value}/${this.maxVitality} (${this.getPercentage()}%)`
  }
}