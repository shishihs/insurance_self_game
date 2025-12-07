import { RiskFactor, type RiskFactorType } from './RiskFactor'

/**
 * リスクプロファイル - 複数のリスクファクターの集合
 */
export class RiskProfile {
  private constructor(
    private readonly factors: Map<RiskFactorType, RiskFactor>
  ) { }

  /**
   * 空のリスクプロファイルを作成
   */
  static empty(): RiskProfile {
    return new RiskProfile(new Map())
  }

  /**
   * デフォルトのリスクプロファイルを作成
   */
  static default(): RiskProfile {
    const factors = new Map<RiskFactorType, RiskFactor>()
    factors.set('age', RiskFactor.create(0.3, 'age'))
    factors.set('health', RiskFactor.create(0.2, 'health'))
    factors.set('claims', RiskFactor.create(0.0, 'claims'))
    factors.set('lifestyle', RiskFactor.create(0.3, 'lifestyle'))
    return new RiskProfile(factors)
  }

  /**
   * リスクファクターを追加/更新
   */
  withFactor(factor: RiskFactor): RiskProfile {
    const newFactors = new Map(this.factors)
    newFactors.set(factor.getType(), factor)
    return new RiskProfile(newFactors)
  }

  /**
   * 特定のリスクファクターを取得
   */
  getFactor(type: RiskFactorType): RiskFactor | undefined {
    return this.factors.get(type)
  }

  /**
   * 全体のリスクスコアを計算（0.0-1.0）
   */
  getOverallRiskScore(): number {
    if (this.factors.size === 0) return 0

    let totalScore = 0
    this.factors.forEach(factor => {
      totalScore += factor.getValue()
    })

    return totalScore / this.factors.size
  }

  /**
   * 保険料への総合的な影響倍率を計算
   */
  getTotalPremiumMultiplier(): number {
    if (this.factors.size === 0) return 1.0

    let multiplier = 1.0
    this.factors.forEach(factor => {
      // 各ファクターの倍率を乗算的に適用
      multiplier *= factor.getPremiumMultiplier()
    })

    return multiplier
  }

  /**
   * リスクプロファイルの要約を取得
   */
  getSummary(): string {
    const overallScore = this.getOverallRiskScore()
    const level = overallScore <= 0.3 ? '低リスク' :
      overallScore <= 0.7 ? '中リスク' : '高リスク'

    return `${level} (スコア: ${overallScore.toFixed(2)})`
  }
}