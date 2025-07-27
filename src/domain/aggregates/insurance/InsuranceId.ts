/**
 * 保険IDを表す値オブジェクト
 */
export class InsuranceId {
  private constructor(private readonly value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('InsuranceId cannot be empty')
    }
  }

  /**
   * 新しいInsuranceIdを生成
   */
  static generate(): InsuranceId {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return new InsuranceId(`insurance_${timestamp}_${random}`)
  }

  /**
   * 既存の値からInsuranceIdを作成
   */
  static from(value: string): InsuranceId {
    return new InsuranceId(value)
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
  equals(other: InsuranceId): boolean {
    return this.value === other.value
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return this.value
  }
}