/**
 * リスクプロファイル値オブジェクト
 * 
 * プレイヤーのリスク特性を表現する値オブジェクト。
 * 保険料計算やゲーム難易度調整に使用される。
 */
export class RiskProfile {
  private constructor(
    private readonly healthRisk: number,
    private readonly financialRisk: number,
    private readonly behavioralRisk: number
  ) {}

  /**
   * デフォルトのリスクプロファイルを作成
   */
  static default(): RiskProfile {
    return new RiskProfile(0.5, 0.5, 0.5)
  }

  /**
   * カスタムリスクプロファイルを作成
   * @param healthRisk 健康リスク（0.0-1.0）
   * @param financialRisk 財務リスク（0.0-1.0）
   * @param behavioralRisk 行動リスク（0.0-1.0）
   * @returns RiskProfileインスタンス
   * @throws {Error} 値が範囲外の場合
   */
  static create(
    healthRisk: number,
    financialRisk: number,
    behavioralRisk: number
  ): RiskProfile {
    const validateRisk = (value: number, name: string) => {
      if (value < 0 || value > 1) {
        throw new Error(`${name} must be between 0 and 1, got ${value}`)
      }
    }

    validateRisk(healthRisk, 'Health risk')
    validateRisk(financialRisk, 'Financial risk')
    validateRisk(behavioralRisk, 'Behavioral risk')

    return new RiskProfile(healthRisk, financialRisk, behavioralRisk)
  }

  /**
   * 健康リスクを取得
   */
  getHealthRisk(): number {
    return this.healthRisk
  }

  /**
   * 財務リスクを取得
   */
  getFinancialRisk(): number {
    return this.financialRisk
  }

  /**
   * 行動リスクを取得
   */
  getBehavioralRisk(): number {
    return this.behavioralRisk
  }

  /**
   * 総合リスクスコアを計算
   * @returns 0.0-1.0の範囲の総合リスクスコア
   */
  getOverallRisk(): number {
    return (this.healthRisk + this.financialRisk + this.behavioralRisk) / 3
  }

  /**
   * リスクレベルを取得
   * @returns 'low' | 'medium' | 'high'
   */
  getRiskLevel(): 'low' | 'medium' | 'high' {
    const overall = this.getOverallRisk()
    if (overall <= 0.3) return 'low'
    if (overall <= 0.7) return 'medium'
    return 'high'
  }

  /**
   * プレイヤーの行動に基づいてリスクプロファイルを更新
   * @param healthChange 健康リスクの変化量
   * @param financialChange 財務リスクの変化量
   * @param behavioralChange 行動リスクの変化量
   * @returns 新しいRiskProfileインスタンス
   */
  updateRisks(
    healthChange: number = 0,
    financialChange: number = 0,
    behavioralChange: number = 0
  ): RiskProfile {
    const clamp = (value: number): number => Math.max(0, Math.min(1, value))

    return new RiskProfile(
      clamp(this.healthRisk + healthChange),
      clamp(this.financialRisk + financialChange),
      clamp(this.behavioralRisk + behavioralChange)
    )
  }

  /**
   * 保険料係数を計算
   * @returns 保険料計算に使用する係数（0.5-2.0）
   */
  getPremiumMultiplier(): number {
    const overall = this.getOverallRisk()
    // リスクが低い場合は0.5倍、高い場合は2.0倍
    return 0.5 + (overall * 1.5)
  }

  /**
   * デバッグ用の文字列表現
   */
  toString(): string {
    return `RiskProfile(health: ${this.healthRisk.toFixed(2)}, financial: ${this.financialRisk.toFixed(2)}, behavioral: ${this.behavioralRisk.toFixed(2)})`
  }
}