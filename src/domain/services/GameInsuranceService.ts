/**
 * 保険管理サービス
 * 
 * 保険関連の処理を集約
 */

import type { Card } from '../entities/Card'
import type { Game } from '../entities/Game'
import type { InsuranceTypeSelectionResult } from '../types/game.types'
import { CardFactory } from './CardFactory'
import { InsurancePremium } from '../valueObjects/InsurancePremium'
import type { InsurancePremiumCalculationService } from './InsurancePremiumCalculationService'

export class GameInsuranceService {
  constructor(
    private readonly premiumService: InsurancePremiumCalculationService
  ) {}

  /**
   * 保険を追加
   */
  addInsurance(game: Game, card: Card): void {
    if (!card.isInsurance()) {
      throw new Error('Only insurance cards can be added')
    }
    
    game.insuranceCards.push(card)
    this.updateInsuranceBurden(game)
  }

  /**
   * 保険種類を選択
   */
  selectInsuranceType(
    game: Game,
    insuranceType: string,
    durationType: 'term' | 'whole_life'
  ): InsuranceTypeSelectionResult {
    this.validateInsuranceSelection(game)
    
    const choice = this.findInsuranceChoice(game, insuranceType)
    if (!choice) {
      return {
        success: false,
        message: 'Invalid insurance type selection'
      }
    }
    
    const selectedCard = this.createInsuranceCard(choice, durationType)
    
    this.addInsuranceCard(game, selectedCard)
    this.updatePlayerHistory(game, insuranceType)
    this.updateRiskProfile(game)
    this.completeInsuranceSelection(game)
    
    return this.createSelectionResult(selectedCard, choice, durationType)
  }

  /**
   * 保険料負担を計算
   */
  calculateInsuranceBurden(game: Game): number {
    if (game.insuranceCards.length === 0) {
      return 0
    }

    try {
      const totalBurden = this.premiumService.calculateTotalInsuranceBurden(
        game.insuranceCards,
        game.stage,
        game.getRiskProfile()
      )
      
      // 負の値として返す（活力から差し引かれるため）
      return -totalBurden.getValue()
    } catch (error) {
      console.warn('保険料計算でエラーが発生しました:', error)
      return this.fallbackBurdenCalculation(game)
    }
  }

  /**
   * 保険料負担を更新
   */
  updateInsuranceBurden(game: Game): void {
    const burden = this.calculateInsuranceBurden(game)
    // Gameクラスの内部プロパティを更新
    const absValue = Math.abs(burden)
    ;(game as any)._insuranceBurden = InsurancePremium.create(absValue)
    
    // ダーティフラグを更新
    if ((game as any)._dirtyFlags) {
      (game as any)._dirtyFlags.insurance = true
      ;(game as any)._dirtyFlags.burden = true
    }
  }

  /**
   * 推奨保険予算を取得
   */
  getRecommendedInsuranceBudget(
    vitality: number,
    stage: string,
    riskProfile: 'conservative' | 'balanced' | 'aggressive' = 'balanced'
  ): InsurancePremium {
    return this.premiumService.calculateOptimalInsuranceBudget(
      vitality,
      stage as any,
      riskProfile
    )
  }

  /**
   * 期限が近い保険を取得
   */
  getExpiringSoonInsurances(insuranceCards: Card[]): Card[] {
    return insuranceCards.filter(card => {
      if (!card.isTermInsurance() || !card.remainingTurns) {
        return false
      }
      return card.remainingTurns <= 2
    })
  }

  /**
   * バリデーション
   * @private
   */
  private validateInsuranceSelection(game: Game): void {
    if (game.phase !== 'insurance_type_selection') {
      throw new Error('Not in insurance type selection phase')
    }
    
    if (!game.insuranceTypeChoices) {
      throw new Error('No insurance type choices available')
    }
  }

  /**
   * 保険選択肢を検索
   * @private
   */
  private findInsuranceChoice(game: Game, insuranceType: string) {
    return game.insuranceTypeChoices?.find(
      choice => choice.insuranceType === insuranceType
    )
  }

  /**
   * 保険カードを作成
   * @private
   */
  private createInsuranceCard(choice: any, durationType: 'term' | 'whole_life'): Card {
    if (durationType === 'term') {
      return CardFactory.createTermInsuranceCard(choice)
    } else {
      return CardFactory.createWholeLifeInsuranceCard(choice)
    }
  }

  /**
   * 保険カードを追加
   * @private
   */
  private addInsuranceCard(game: Game, card: Card): void {
    game.cardManager.addToPlayerDeck(card)
    game.stats.cardsAcquired++
    game.insuranceCards.push(card)
    this.updateInsuranceBurden(game)
  }

  /**
   * 保険選択を完了
   * @private
   */
  private completeInsuranceSelection(game: Game): void {
    game.insuranceTypeChoices = undefined
    game.phase = 'resolution'
  }

  /**
   * 選択結果を作成
   * @private
   */
  private createSelectionResult(
    card: Card,
    choice: any,
    durationType: 'term' | 'whole_life'
  ): InsuranceTypeSelectionResult {
    const durationText = durationType === 'term' 
      ? `定期保険（${choice.termOption.duration}ターン）` 
      : '終身保険'
    
    return {
      success: true,
      selectedCard: card,
      message: `${choice.name}（${durationText}）を選択しました。コスト: ${card.cost}`
    }
  }

  /**
   * フォールバック計算
   * @private
   */
  private fallbackBurdenCalculation(game: Game): number {
    const activeInsuranceCount = game.insuranceCards.length
    const burden = Math.floor(activeInsuranceCount / 3)
    return burden === 0 ? 0 : -burden
  }

  /**
   * プレイヤー履歴を更新
   * @private
   */
  private updatePlayerHistory(game: Game, insuranceType: string): void {
    const history = game.getPlayerHistory()
    history.totalInsurancePurchased++
    
    // リスクの高い保険種類を選んだ場合
    if (insuranceType === 'life' || insuranceType === 'cancer') {
      history.riskyChoiceCount++
    }
    history.totalChoiceCount++
    
    // Gameの内部プロパティを更新
    ;(game as any)._playerHistory = history
  }

  /**
   * リスクプロファイルを更新
   * @private
   */
  private updateRiskProfile(game: Game): void {
    const newProfile = this.premiumService.generateRiskProfile(
      game.getPlayerHistory(),
      game.stage
    )
    ;(game as any)._riskProfile = newProfile
  }
}