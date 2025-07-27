/**
 * カードのパワーを表す値オブジェクト
 * 
 * このクラスはイミュータブルであり、すべての操作は新しいインスタンスを返します。
 * ビジネスルール：
 * - パワーは0以上、999以下でなければならない
 * - 演算結果が最大値を超える場合は最大値に制限される
 */
export class CardPower {
  private static readonly MIN_POWER = 0
  private static readonly MAX_POWER = 999

  private constructor(private readonly value: number) {
    this.validate()
  }

  /**
   * CardPower インスタンスを生成する
   * @param value パワー値
   * @throws {Error} 不正な値の場合
   */
  static create(value: number): CardPower {
    return new CardPower(value)
  }

  /**
   * 値の妥当性を検証する
   * @private
   */
  private validate(): void {
    if (this.value < CardPower.MIN_POWER) {
      throw new Error('CardPower must be non-negative')
    }
    if (this.value > CardPower.MAX_POWER) {
      throw new Error('CardPower cannot exceed maximum')
    }
  }

  /**
   * パワー値を取得
   */
  getValue(): number {
    return this.value
  }

  /**
   * 他のCardPowerと加算
   * @param other 加算するCardPower
   * @returns 新しいCardPowerインスタンス
   */
  add(other: CardPower): CardPower {
    const sum = this.value + other.value
    return new CardPower(Math.min(sum, CardPower.MAX_POWER))
  }

  /**
   * 複数のCardPowerを合計
   * @param powers CardPowerの配列
   * @returns 合計のCardPower
   */
  static sum(powers: CardPower[]): CardPower {
    const total = powers.reduce((sum, power) => sum + power.value, 0)
    return new CardPower(Math.min(total, CardPower.MAX_POWER))
  }

  /**
   * 倍率を適用
   * @param multiplier 倍率（0以上）
   * @returns 新しいCardPowerインスタンス
   * @throws {Error} 倍率が負の場合
   */
  multiply(multiplier: number): CardPower {
    if (multiplier < 0) {
      throw new Error('Multiplier cannot be negative')
    }
    const result = Math.floor(this.value * multiplier)
    return new CardPower(Math.min(result, CardPower.MAX_POWER))
  }

  /**
   * 他のCardPowerより大きいか判定
   */
  isGreaterThan(other: CardPower): boolean {
    return this.value > other.value
  }

  /**
   * 他のCardPower以上か判定
   */
  isGreaterThanOrEqual(other: CardPower): boolean {
    return this.value >= other.value
  }

  /**
   * 他のCardPowerと等価か判定
   */
  equals(other: CardPower): boolean {
    return this.value === other.value
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    return `Power: ${this.value}`
  }

  /**
   * ゼロパワーの定数
   */
  static get ZERO(): CardPower {
    return new CardPower(0)
  }

  /**
   * 最大パワーの定数
   */
  static get MAX(): CardPower {
    return new CardPower(CardPower.MAX_POWER)
  }
}