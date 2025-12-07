/**
 * リスクファクター値オブジェクト
 * 
 * 保険料計算に使用されるリスク要因を表現する値オブジェクト。
 * 各要因は0.0〜1.0の範囲で表現され、高いほどリスクが高いことを示す。
 */
export class RiskFactor {
  private constructor(
    private readonly value: number,
    private readonly factorType: RiskFactorType
  ) { }

  /**
   * リスクファクターを作成
   * @param value リスク値（0.0-1.0）
   * @param factorType リスクの種類
   * @returns RiskFactorインスタンス
   * @throws {Error} 値が範囲外の場合
   */
  static create(value: number, factorType: RiskFactorType): RiskFactor {
    if (value < 0 || value > 1) {
      throw new Error(`Risk factor value must be between 0 and 1, got ${value}`)
    }
    return new RiskFactor(value, factorType)
  }

  /**
   * リスク値を取得
   */
  getValue(): number {
    return this.value
  }

  /**
   * リスクタイプを取得
   */
  getType(): RiskFactorType {
    return this.factorType
  }

  /**
   * リスクレベルを取得（低・中・高）
   */
  getRiskLevel(): RiskLevel {
    if (this.value <= 0.3) return 'low'
    if (this.value <= 0.7) return 'medium'
    return 'high'
  }

  /**
   * 保険料への影響倍率を計算
   * @returns 保険料倍率（1.0が基準）
   */
  getPremiumMultiplier(): number {
    // リスクタイプごとに異なる影響度
    const impactFactors: Record<RiskFactorType, number> = {
      age: 0.5,         // 年齢は50%の影響
      health: 0.3,      // 健康状態は30%の影響
      claims: 0.4,      // 請求履歴は40%の影響
      lifestyle: 0.2    // ライフスタイルは20%の影響
    }

    const impact = impactFactors[this.factorType] || 0.3
    // 基準1.0に対して、リスク値に応じて倍率を調整
    return 1.0 + (this.value * impact)
  }

  /**
   * リスクを調整（イベントによる変動）
   * @param adjustment 調整値（-1.0〜1.0）
   * @returns 新しいRiskFactorインスタンス
   */
  adjust(adjustment: number): RiskFactor {
    const newValue = Math.max(0, Math.min(1, this.value + adjustment))
    return new RiskFactor(newValue, this.factorType)
  }

  /**
   * 他のリスクファクターと結合
   * @param other 他のリスクファクター
   * @param weight 結合時の重み（0.0-1.0）
   * @returns 新しいRiskFactorインスタンス
   */
  combine(other: RiskFactor, weight: number = 0.5): RiskFactor {
    if (this.factorType !== other.factorType) {
      throw new Error('Cannot combine different risk factor types')
    }

    const combinedValue = this.value * (1 - weight) + other.value * weight
    return new RiskFactor(combinedValue, this.factorType)
  }

  /**
   * 等価性の確認
   */
  equals(other: RiskFactor): boolean {
    return this.value === other.value && this.factorType === other.factorType
  }

  /**
   * 文字列表現
   */
  toString(): string {
    return `RiskFactor(${this.factorType}: ${this.value.toFixed(2)} - ${this.getRiskLevel()})`
  }
}

/**
 * リスクファクターの種類
 */
export type RiskFactorType = 'age' | 'health' | 'claims' | 'lifestyle'

/**
 * リスクレベル
 */
export type RiskLevel = 'low' | 'medium' | 'high'
