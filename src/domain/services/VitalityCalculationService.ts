import type { Game } from '../entities/Game'
import type { Card } from '../entities/Card'

/**
 * 活力計算統一サービス
 * ゲーム内の活力変化を一元管理し、保険効果を正確に反映
 */
export class VitalityCalculationService {
  
  /**
   * チャレンジ結果に基づいて活力変化を計算（保険効果込み）
   */
  static calculateVitalityChange(
    game: Game,
    success: boolean,
    totalPower: number,
    requiredPower: number
  ): {
    rawChange: number
    insuranceReduction: number
    finalChange: number
    details: string
  } {
    let rawChange: number
    
    if (success) {
      // 成功時は余剰パワーの半分を活力回復
      rawChange = Math.floor((totalPower - requiredPower) / 2)
      return {
        rawChange,
        insuranceReduction: 0,
        finalChange: rawChange,
        details: `成功時活力回復: +${rawChange}`
      }
    } 
      // 失敗時は不足分だけ活力減少
      rawChange = -(requiredPower - totalPower)
      
      // 保険効果でダメージを軽減
      const insuranceReduction = this.calculateInsuranceReduction(game, -rawChange)
      const finalChange = Math.max(rawChange + insuranceReduction, Math.floor(rawChange * 0.3))
      
      const details = insuranceReduction > 0 
        ? `失敗時ダメージ: ${rawChange}, 保険軽減: +${insuranceReduction}, 実際の変化: ${finalChange}`
        : `失敗時ダメージ: ${finalChange} (保険なし)`
      
      return {
        rawChange,
        insuranceReduction,
        finalChange,
        details
      }
    
  }

  /**
   * 保険による軽減効果を計算
   */
  private static calculateInsuranceReduction(game: Game, damage: number): number {
    const insuranceCards = game.insuranceCards
    if (insuranceCards.length === 0) return 0

    let totalReduction = 0

    // 各保険の軽減効果を累積
    for (const card of insuranceCards) {
      if (card.isDefensiveInsurance()) {
        // 防御型保険の軽減効果
        totalReduction += card.calculateDamageReduction()
      } else if (card.coverage) {
        // 一般保険のカバレッジに基づく軽減
        totalReduction += Math.floor(card.coverage / 20)
      }
    }

    // ダメージの最大70%まで軽減可能
    const maxReduction = Math.floor(damage * 0.7)
    return Math.min(totalReduction, maxReduction)
  }

  /**
   * 実際に活力を更新（統一インターフェース）
   */
  static applyVitalityChange(game: Game, change: number): void {
    if (change > 0) {
      game.heal(change)
    } else if (change < 0) {
      game.applyDamage(-change)
    }
  }

  /**
   * ターン終了時の保険回復効果を計算
   */
  static calculateTurnHealingFromInsurance(game: Game): number {
    const insuranceCards = game.insuranceCards
    let totalHealing = 0

    for (const card of insuranceCards) {
      if (card.isRecoveryInsurance()) {
        totalHealing += card.calculateTurnHeal()
      }
    }

    return totalHealing
  }
}