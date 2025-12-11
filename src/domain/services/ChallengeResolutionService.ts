import type { Card } from '../entities/Card'
import type { GameStage } from '../types/card.types'
import type { ChallengeResult } from '../types/game.types'
import type { ICardManager } from './CardManager'
import type { Game } from '../entities/Game'
import { RiskRewardChallenge } from '../entities/RiskRewardChallenge'
import { AGE_PARAMETERS, DREAM_AGE_ADJUSTMENTS } from '../types/game.types'
import { MAX_TOTAL_DAMAGE_REDUCTION, MINIMUM_DAMAGE_AFTER_INSURANCE } from '../constants/insurance.constants'
import { GameConstantsAccessor } from '../constants/GameConstants'

/**
 * チャレンジ解決サービス
 * 
 * チャレンジの解決ロジックを専門に扱う単一責任クラス
 */
export class ChallengeResolutionService {
  /**
   * チャレンジを解決し、結果を計算
   * @param challenge チャレンジカード
   * @param selectedCards 選択されたカード
   * @param cardManager カード管理サービス
   * @param stage 現在のゲームステージ
   * @param insuranceBurden 保険料負担
   * @param game ゲームエンティティ（保険情報取得用）
   * @returns チャレンジ結果
   */
  resolveChallenge(
    challenge: Card,
    selectedCards: Card[],
    cardManager: ICardManager,
    stage: GameStage,
    insuranceBurden: number,
    game?: Game
  ): ChallengeResult {
    // リスクチャレンジの特殊ルールを確認
    const isRiskChallenge = challenge instanceof RiskRewardChallenge
    const insuranceImmunity = isRiskChallenge && challenge.insuranceImmunity

    // 保険効果を適用（特化型保険のボーナス）
    const insuranceBonus = (game && !insuranceImmunity) ? this.calculateInsuranceBonus(game, challenge) : 0

    // パワー計算の詳細
    const powerBreakdown = this.calculateTotalPower(selectedCards, insuranceBurden, insuranceBonus)
    const playerPower = powerBreakdown.total

    // 夢カードの場合は年齢調整を適用
    const challengePower = this.getDreamRequiredPower(challenge, stage)

    // 成功判定
    const success = playerPower >= challengePower

    // 活力変更計算
    let vitalityChange = 0
    if (success) {
      const bonusBase = GameConstantsAccessor.getBalanceSettings().CHALLENGE_SETTINGS.successBonusBase
      const powerDiff = playerPower - challengePower
      const baseReward = bonusBase + Math.floor(powerDiff / 2)

      // リスクチャレンジの場合は報酬を調整
      if (isRiskChallenge) {
        vitalityChange = challenge.calculateActualReward(baseReward)
      } else {
        vitalityChange = baseReward
      }
    } else {
      // 失敗時のダメージ計算: カード固有のペナルティを使用 (ユーザーFB対応: パワーと分離)
      const baseDamage = challenge.penalty ?? Math.ceil(challengePower * 0.3)
      // 防御型保険によるダメージ軽減（保険無効の場合は0）
      const damageReduction = (game && !insuranceImmunity) ? this.calculateDamageReduction(game) : 0
      // 最小ダメージ保証を適用
      const actualDamage = Math.max(MINIMUM_DAMAGE_AFTER_INSURANCE, baseDamage - damageReduction)

      // リスクチャレンジの場合はペナルティを調整
      if (isRiskChallenge) {
        vitalityChange = -challenge.calculateActualPenalty(actualDamage)
      } else {
        vitalityChange = -actualDamage
      }

      // NaNチェック
      if (!isFinite(vitalityChange)) {
        console.error('Invalid vitalityChange:', {
          vitalityChange,
          baseDamage,
          damageReduction,
          actualDamage,
          challengePower,
          playerPower
        })
        vitalityChange = -actualDamage
      }
    }

    // 使用したカードを捨て札に
    cardManager.discardSelectedCards()

    // 結果タイプと適切なメッセージを決定
    const resultType = success ? 'success' : 'damage_taken'
    const damageAmount = success ? undefined : Math.abs(vitalityChange)

    // メッセージを改善: 「失敗」ではなく「ダメージを受けた」
    let message: string
    if (success) {
      message = `🎉 チャレンジ成功！ +${vitalityChange} 活力`
    } else {
      message = `💥 ${damageAmount} ダメージを受けた`
    }

    // 結果作成
    const result: ChallengeResult = {
      challenge, // Include the challenge card in the result
      success,
      resultType,
      playerPower,
      challengePower,
      vitalityChange,
      message,
      powerBreakdown
    }

    // ダメージ量は damage_taken 時のみ設定
    if (!success && damageAmount !== undefined) {
      result.damageAmount = damageAmount
    }

    return result
  }

  /**
   * 総合パワーを詳細に計算
   * @param cards 使用するカード
   * @param insuranceBurden 保険料負担
   * @param insuranceBonus 保険ボーナス
   * @returns パワーの詳細な内訳
   */
  private calculateTotalPower(cards: Card[], insuranceBurden: number, insuranceBonus: number = 0): {
    base: number
    insurance: number
    burden: number
    total: number
  } {
    // 基本パワー（保険以外のカード）
    let basePower = 0
    let insurancePower = 0

    cards.forEach(card => {
      if (card.type === 'insurance') {
        // 保険カードのパワー（年齢ボーナス込み）
        insurancePower += card.calculateEffectivePower()
      } else {
        // その他のカードの基本パワー
        basePower += card.calculateEffectivePower()
      }
    })

    // 保険ボーナスを保険パワーに加算
    insurancePower += insuranceBonus

    // 総合パワー
    const total = basePower + insurancePower - insuranceBurden

    return {
      base: basePower,
      insurance: insurancePower,
      burden: -insuranceBurden, // 負の値として表示
      total: Math.max(0, total) // 総合パワーは0以下にならない
    }
  }

  /**
   * 夢カードの必要パワーを年齢調整込みで計算
   */
  private getDreamRequiredPower(challenge: Card, stage: GameStage): number {
    // 夢カードでない場合は基本パワーをそのまま返す
    // NOTE: 通常のチャレンジでもdreamCategory（身体的/知識的）が設定されていれば年齢調整を適用する
    if (!challenge.dreamCategory) {
      return challenge.power
    }

    // 青年期は調整なし
    if (stage === 'youth') {
      return challenge.power
    }

    // 中年期・充実期の年齢調整を適用（GAME_DESIGN.md準拠）
    // Physical: +3, Intellectual: -2, Mixed: 0
    // @ts-ignore
    const adjustment = DREAM_AGE_ADJUSTMENTS[challenge.dreamCategory] || 0
    const adjustedPower = challenge.power + adjustment

    // 最小値は1
    return Math.max(1, adjustedPower)
  }

  /**
   * 保険によるチャレンジボーナスを計算
   * @private
   */
  private calculateInsuranceBonus(game: Game, challenge: Card): number {
    let totalBonus = 0
    const insuranceCards = game.getActiveInsurances()
    const currentStage = game.stage
    const ageParams = AGE_PARAMETERS[currentStage] || AGE_PARAMETERS['youth']
    const ageMultiplier = ageParams?.ageMultiplier ?? 0

    insuranceCards.forEach(insurance => {
      // 終身保険の年齢価値上昇を適用
      let bonus = 0

      if (insurance.isSpecializedInsurance()) {
        const challengeType = challenge.name
        bonus = insurance.calculateChallengeBonus(challengeType)
      }

      // 終身保険の場合、年齢倍率を適用
      if (insurance.isWholeLifeInsurance() && ageMultiplier > 0) {
        bonus += ageMultiplier  // 中年期+0.5、充実期+1.0
      }

      totalBonus += bonus
    })

    return totalBonus
  }

  /**
   * 防御型保険によるダメージ軽減を計算
   * Issue #24: 複数保険の合計軽減量にも上限を設定
   * @private
   */
  private calculateDamageReduction(game: Game): number {
    let totalReduction = 0
    const insuranceCards = game.getActiveInsurances()

    insuranceCards.forEach(insurance => {
      // calculateDamageReduction内で防御効果のチェックを行うため、
      // 全ての保険カードで計算を実行
      totalReduction += insurance.calculateDamageReduction()
    })

    // 合計軽減量の上限を適用
    return Math.min(totalReduction, MAX_TOTAL_DAMAGE_REDUCTION)
  }
}