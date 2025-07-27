/**
 * 保険料を表す値オブジェクト
 * 
 * このクラスはイミュータブルであり、すべての操作は新しいインスタンスを返します。
 * ビジネスルール：
 * - 保険料は0以上、99以下でなければならない
 * - 0は無料保険を表す
 * - 20以上は高額保険料とみなされる
 */
export class InsurancePremium {
  private static readonly MIN_PREMIUM = 0
  private static readonly MAX_PREMIUM = 99
  private static readonly EXPENSIVE_THRESHOLD = 20

  private constructor(private readonly value: number) {
    this.validate()
  }

  /**
   * InsurancePremium インスタンスを生成する
   * @param value 保険料値
   * @throws {Error} 不正な値の場合
   */
  static create(value: number): InsurancePremium {
    return new InsurancePremium(Math.floor(value))
  }

  /**
   * 値の妥当性を検証する
   * @private
   */
  private validate(): void {
    if (this.value < InsurancePremium.MIN_PREMIUM) {
      throw new Error('Insurance premium cannot be negative')
    }
    if (this.value > InsurancePremium.MAX_PREMIUM) {
      throw new Error('Insurance premium cannot exceed maximum')
    }
  }

  /**
   * 保険料値を取得
   */
  getValue(): number {
    return this.value
  }

  /**
   * 複数の保険料を合計
   * @param premiums InsurancePremiumの配列
   * @returns 合計の保険料
   */
  static sum(premiums: InsurancePremium[]): InsurancePremium {
    const total = premiums.reduce((sum, premium) => sum + premium.value, 0)
    return new InsurancePremium(Math.min(total, InsurancePremium.MAX_PREMIUM))
  }

  /**
   * 割引率を適用
   * @param discountRate 割引率（0.0〜1.0）
   * @returns 新しいInsurancePremiumインスタンス
   * @throws {Error} 割引率が不正な場合
   */
  applyDiscount(discountRate: number): InsurancePremium {
    if (discountRate < 0) {
      throw new Error('Discount rate cannot be negative')
    }
    if (discountRate > 1) {
      throw new Error('Discount rate cannot exceed 100%')
    }
    
    const discountedValue = Math.floor(this.value * (1 - discountRate))
    return new InsurancePremium(discountedValue)
  }

  /**
   * 倍率を適用
   * @param multiplier 倍率（0以上）
   * @returns 新しいInsurancePremiumインスタンス
   * @throws {Error} 倍率が負の場合
   */
  applyMultiplier(multiplier: number): InsurancePremium {
    if (multiplier < 0) {
      throw new Error('Multiplier cannot be negative')
    }
    
    const multipliedValue = Math.floor(this.value * multiplier)
    return new InsurancePremium(Math.min(multipliedValue, InsurancePremium.MAX_PREMIUM))
  }

  /**
   * 無料保険かどうか判定
   */
  isFree(): boolean {
    return this.value === 0
  }

  /**
   * 高額保険料かどうか判定
   */
  isExpensive(): boolean {
    return this.value >= InsurancePremium.EXPENSIVE_THRESHOLD
  }

  /**
   * 他の保険料より高いか判定
   */
  isHigherThan(other: InsurancePremium): boolean {
    return this.value > other.value
  }

  /**
   * 指定された活力で負担可能か判定
   * @param availableVitality 利用可能な活力
   */
  isAffordableWith(availableVitality: number): boolean {
    return availableVitality >= this.value
  }

  /**
   * 他のInsurancePremiumと等価か判定
   */
  equals(other: InsurancePremium): boolean {
    return this.value === other.value
  }

  /**
   * 文字列表現を取得
   */
  toString(): string {
    if (this.isFree()) {
      return '保険料: 無料'
    }
    return `保険料: ${this.value}`
  }

  /**
   * 無料保険の定数
   */
  static get FREE(): InsurancePremium {
    return new InsurancePremium(0)
  }
}