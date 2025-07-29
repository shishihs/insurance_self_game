import { InsurancePremium } from '../valueObjects/InsurancePremium'
import type { Card } from '../entities/Card'
import type { GameStage } from '../types/card.types'
import type { InsuranceType } from '../types/card.types'

/**
 * 保険料計算ドメインサービス
 * 
 * 保険料に関する複雑なビジネスロジックを集約し、
 * 年齢調整、保険種別調整、リスク調整等を統一的に管理します。
 * 
 * このサービスは状態を持たず、純粋なビジネスロジックのみを提供します。
 */
export class InsurancePremiumCalculationService {
  
  /**
   * 年齢ステージによる保険料倍率
   */
  private static readonly AGE_MULTIPLIERS: Record<GameStage, number> = {
    'youth': 1.0,          // 青年期: 基準倍率
    'adult': 1.0,          // 成人期: 基準倍率
    'middle_age': 1.2,     // 中年期: 20%増し
    'middle': 1.2,         // 中年期（旧定義）: 20%増し
    'elder': 1.5,          // 老年期: 50%増し
    'elderly': 1.5,        // 老年期（旧定義）: 50%増し
    'fulfillment': 1.3     // 充実期: 30%増し
  }

  /**
   * 保険種別による基本料率
   */
  private static readonly INSURANCE_TYPE_RATES: Record<InsuranceType, number> = {
    'health': 1.0,         // 健康保険: 基準料率
    'life': 1.2,           // 生命保険: 20%高
    'disability': 0.8,     // 障害保険: 20%安
    'accident': 0.6,       // 事故保険: 40%安
    'cancer': 1.5,         // がん保険: 50%高
    'dental': 0.4,         // 歯科保険: 60%安
    'travel': 0.3          // 旅行保険: 70%安
  }

  /**
   * 年齢調整済み保険料を計算
   * 
   * @param basePremium 基本保険料
   * @param stage プレイヤーの現在ステージ
   * @returns 年齢調整済み保険料
   */
  calculateAgeAdjustedPremium(basePremium: InsurancePremium, stage: GameStage): InsurancePremium {
    const multiplier = InsurancePremiumCalculationService.AGE_MULTIPLIERS[stage] || 1.0
    return basePremium.applyMultiplier(multiplier)
  }

  /**
   * 保険カードの総合保険料を計算
   * 
   * 基本料金 + 年齢調整 + 保険種別調整 + カバレッジ調整を総合的に計算
   * 
   * @param card 保険カード
   * @param stage プレイヤーの現在ステージ
   * @returns 総合保険料
   */
  calculateComprehensivePremium(card: Card, stage: GameStage): InsurancePremium {
    if (card.type !== 'insurance') {
      throw new Error('Card must be an insurance card')
    }

    // 基本保険料取得
    const basePremium = card.getCost()
    
    // 年齢調整
    const ageAdjustedPremium = this.calculateAgeAdjustedPremium(basePremium, stage)
    
    // 保険種別調整
    const typeAdjustedPremium = this.applyInsuranceTypeAdjustment(ageAdjustedPremium, card.insuranceType)
    
    // カバレッジ調整
    const coverageAdjustedPremium = this.applyCoverageAdjustment(typeAdjustedPremium, card.coverage)
    
    return coverageAdjustedPremium
  }

  /**
   * 保険料負担の総計算
   * 
   * 複数の保険を持つプレイヤーの総保険料負担を計算
   * 3枚ごとの負担増加ルールを適用
   * 
   * @param insuranceCards アクティブな保険カード配列
   * @param stage プレイヤーの現在ステージ
   * @returns 総保険料負担
   */
  calculateTotalInsuranceBurden(insuranceCards: Card[], stage: GameStage): InsurancePremium {
    // 各保険の個別料金計算
    const individualPremiums = insuranceCards.map(card => 
      this.calculateComprehensivePremium(card, stage)
    )
    
    // 基本合計
    const baseTotalPremium = InsurancePremium.sum(individualPremiums)
    
    // 3枚ごとの負担増加ルール
    const penaltyMultiplier = this.calculateMultiInsurancePenalty(insuranceCards.length)
    
    return baseTotalPremium.applyMultiplier(penaltyMultiplier)
  }

  /**
   * 保険更新時の料金計算
   * 
   * 既存保険の更新時における料金調整
   * 継続割引、経験調整、年齢変化を考慮
   * 
   * @param card 更新対象の保険カード
   * @param currentStage 現在のステージ
   * @param usageHistory 使用履歴（使用回数）
   * @returns 更新時保険料
   */
  calculateRenewalPremium(card: Card, currentStage: GameStage, usageHistory: number): InsurancePremium {
    // 基本更新料金
    const basePremium = this.calculateComprehensivePremium(card, currentStage)
    
    // 継続割引適用（長期継続者優遇）
    const continuityDiscount = this.calculateContinuityDiscount(usageHistory)
    const discountedPremium = basePremium.applyDiscount(continuityDiscount)
    
    // 使用実績による調整（リスク評価）
    const riskMultiplier = this.calculateRiskMultiplier(usageHistory)
    
    return discountedPremium.applyMultiplier(riskMultiplier)
  }

  /**
   * 最適保険ポートフォリオの提案
   * 
   * プレイヤーの状況に応じた最適な保険組み合わせを計算
   * 
   * @param availableBudget 利用可能予算（活力）
   * @param stage 現在ステージ
   * @param riskProfile リスクプロファイル
   * @returns 推奨保険料上限
   */
  calculateOptimalInsuranceBudget(
    availableBudget: number, 
    stage: GameStage, 
    riskProfile: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
  ): InsurancePremium {
    const budgetRatios = {
      'conservative': 0.15,  // 予算の15%
      'balanced': 0.25,      // 予算の25%
      'aggressive': 0.35     // 予算の35%
    }
    
    const ratio = budgetRatios[riskProfile]
    const recommendedBudget = Math.floor(availableBudget * ratio)
    
    return InsurancePremium.create(recommendedBudget)
  }

  /**
   * 保険種別調整を適用
   * @private
   */
  private applyInsuranceTypeAdjustment(
    premium: InsurancePremium, 
    insuranceType?: InsuranceType
  ): InsurancePremium {
    if (!insuranceType) {
      return premium
    }
    
    const typeRate = InsurancePremiumCalculationService.INSURANCE_TYPE_RATES[insuranceType] || 1.0
    return premium.applyMultiplier(typeRate)
  }

  /**
   * カバレッジ調整を適用
   * @private
   */
  private applyCoverageAdjustment(premium: InsurancePremium, coverage?: number): InsurancePremium {
    if (!coverage || coverage <= 0) {
      // カバレッジ0の場合は基本料金の50%割引
      return premium.applyMultiplier(0.5)
    }
    
    // カバレッジが高いほど保険料も高くなる
    // 基準カバレッジを50として、比例計算
    const baselineCoverage = 50
    const coverageMultiplier = Math.max(0.5, coverage / baselineCoverage)
    
    return premium.applyMultiplier(coverageMultiplier)
  }

  /**
   * 複数保険ペナルティを計算
   * @private
   */
  private calculateMultiInsurancePenalty(insuranceCount: number): number {
    // 3枚ごとに10%ずつ負担増加
    const penaltySteps = Math.floor(insuranceCount / 3)
    return 1.0 + (penaltySteps * 0.1)
  }

  /**
   * 継続割引率を計算
   * @private
   */
  private calculateContinuityDiscount(usageHistory: number): number {
    // 使用履歴が少ないほど継続割引率が高い（優良顧客）
    if (usageHistory === 0) return 0.1      // 10%割引
    if (usageHistory <= 2) return 0.05      // 5%割引
    return 0                                 // 割引なし
  }

  /**
   * リスク倍率を計算
   * @private
   */
  private calculateRiskMultiplier(usageHistory: number): number {
    // 使用履歴が多いほどリスクが高いとみなして料金増加
    if (usageHistory >= 5) return 1.3       // 30%増し
    if (usageHistory >= 3) return 1.1       // 10%増し
    return 1.0                               // 基準料金
  }
}