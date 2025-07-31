/**
 * ゲームチャレンジ処理サービス
 * 
 * チャレンジの解決に関する複雑なロジックを管理
 * 
 * @class GameChallengeService
 * @description
 * チャレンジの開始から解決までの一連のプロセスを管理します。
 * パワー計算、成功判定、活力変更、統計更新などを担当します。
 * 
 * @example
 * ```typescript
 * const challengeService = new GameChallengeService(resolutionService);
 * 
 * // チャレンジを開始
 * challengeService.startChallenge(game, challengeCard);
 * 
 * // チャレンジを解決
 * const result = challengeService.resolveChallenge(game);
 * if (result.success) {
 *   console.log('チャレンジ成功！');
 * }
 * ```
 */

import type { Card } from '../entities/Card'
import type { Game } from '../entities/Game'
import type { ChallengeResult, InsuranceTypeChoice } from '../types/game.types'
import { CardFactory } from './CardFactory'
import type { ChallengeResolutionService } from './ChallengeResolutionService'

/**
 * パワー計算の内訳
 * 
 * @interface PowerBreakdown
 * @property {number} base - 基本カードのパワー合計
 * @property {number} insurance - 保険カードのパワー合計
 * @property {number} burden - 保険料負担（負の値）
 * @property {number} total - 総合パワー（最小値は0）
 */
export interface PowerBreakdown {
  base: number
  insurance: number
  burden: number
  total: number
}

export class GameChallengeService {
  constructor(
    private readonly resolutionService: ChallengeResolutionService
  ) {}

  /**
   * チャレンジを開始
   */
  startChallenge(game: Game, challengeCard: Card): void {
    this.validatePhase(game, 'draw')
    
    game.currentChallenge = challengeCard
    game.cardManager.clearSelection()
    game.phase = 'challenge'
    
    // 経験学習システム: 同じチャレンジの失敗回数を取得
    const failureCount = (game as any)._learningHistory.get(challengeCard.name) || 0
    if (failureCount >= 2) {
      // 2回目以降の失敗で必要パワー-1（経験による効率化）
      challengeCard.power = Math.max(1, challengeCard.power - 1)
    }
  }

  /**
   * チャレンジを解決
   */
  resolveChallenge(game: Game): ChallengeResult {
    this.validateChallenge(game)
    
    // 新しいChallengeResolutionServiceを使用
    const result = this.resolutionService.resolveChallenge(
      game.currentChallenge!,
      game.selectedCards,
      game.cardManager,
      game.stage,
      game.insuranceBurden,
      game
    )
    
    // 統計更新
    this.updateStatistics(game, result.success)
    
    // 活力更新
    this.updateVitality(game, result.vitalityChange)
    
    // 経験学習システム: 失敗時に学習履歴を更新
    if (!result.success && game.currentChallenge) {
      const challengeName = game.currentChallenge.name
      const currentFailures = (game as any)._learningHistory.get(challengeName) || 0
      ;(game as any)._learningHistory.set(challengeName, currentFailures + 1)
    }
    
    // 成功時は保険種類選択肢を追加
    if (result.success) {
      const choices = CardFactory.createInsuranceTypeChoices(game.stage)
      game.insuranceTypeChoices = choices
      result.insuranceTypeChoices = choices
    }
    
    this.updateGameStateAfterChallenge(game, result)
    
    return result
  }

  /**
   * 総合パワーを計算
   * 
   * @method calculateTotalPower
   * @param {Game} game - ゲームインスタンス
   * @param {Card[]} cards - 計算対象のカード配列
   * @returns {PowerBreakdown} パワーの詳細な内訳
   * 
   * @description
   * 選択されたカードのパワーを計算し、保険料負担を考慮した
   * 総合パワーを算出します。結果は常に0以上になります。
   */
  calculateTotalPower(game: Game, cards: Card[]): PowerBreakdown {
    let basePower = 0
    let insurancePower = 0
    
    for (const card of cards) {
      if (card.type === 'insurance') {
        insurancePower += card.calculateEffectivePower()
      } else {
        basePower += card.calculateEffectivePower()
      }
    }
    
    const burden = game.insuranceBurden
    const total = Math.max(0, basePower + insurancePower + burden)
    
    return { base: basePower, insurance: insurancePower, burden, total }
  }

  /**
   * チャレンジ結果を作成
   * @private
   */
  private createChallengeResult(
    game: Game,
    powerBreakdown: PowerBreakdown,
    challengePower: number
  ): ChallengeResult {
    const playerPower = powerBreakdown.total
    const success = playerPower >= challengePower
    
    // 統計更新
    this.updateStatistics(game, success)
    
    // 活力変更を計算
    const vitalityChange = this.calculateVitalityChange(
      success,
      playerPower,
      challengePower
    )
    
    // 活力を更新
    this.updateVitality(game, vitalityChange)
    
    const result: ChallengeResult = {
      success,
      playerPower,
      challengePower,
      vitalityChange,
      message: this.createResultMessage(success, vitalityChange),
      powerBreakdown
    }
    
    // 成功時は保険種類選択肢を追加
    if (success) {
      const choices = CardFactory.createInsuranceTypeChoices(game.stage)
      game.insuranceTypeChoices = choices
      result.insuranceTypeChoices = choices
    }
    
    return result
  }

  /**
   * チャレンジ後のゲーム状態更新
   * @private
   */
  private updateGameStateAfterChallenge(
    game: Game,
    result: ChallengeResult
  ): void {
    // 使用したカードを捨て札に
    game.cardManager.discardSelectedCards()
    
    // フェーズ更新
    game.phase = result.success 
      ? 'insurance_type_selection' 
      : 'resolution'
    
    // チャレンジをクリア
    game.currentChallenge = undefined
    game.cardManager.clearSelection()
  }

  /**
   * バリデーション: フェーズチェック
   * @private
   */
  private validatePhase(game: Game, expectedPhase: string): void {
    if (game.phase !== expectedPhase) {
      if (expectedPhase === 'draw') {
        throw new Error('Can only start challenge during draw phase')
      }
      throw new Error(`Can only perform this action during ${expectedPhase} phase`)
    }
  }

  /**
   * バリデーション: チャレンジ存在チェック
   * @private
   */
  private validateChallenge(game: Game): void {
    if (!game.currentChallenge || game.phase !== 'challenge') {
      throw new Error('No active challenge to resolve')
    }
  }

  /**
   * チャレンジの必要パワーを取得
   * @private
   */
  private getChallengePower(game: Game): number {
    if (!game.currentChallenge) {
      throw new Error('No active challenge')
    }
    
    // 夢カードの年齢調整を適用
    return game.getDreamRequiredPower(game.currentChallenge)
  }

  /**
   * 統計を更新
   * @private
   */
  private updateStatistics(game: Game, success: boolean): void {
    game.stats.totalChallenges++
    if (success) {
      game.stats.successfulChallenges++
    } else {
      game.stats.failedChallenges++
    }
  }

  /**
   * 活力変更量を計算（保険効果を考慮）
   * @private
   */
  private calculateVitalityChange(
    game: Game,
    success: boolean,
    playerPower: number,
    challengePower: number
  ): number {
    if (success) {
      return Math.floor((playerPower - challengePower) / 2)
    } else {
      // 失敗時のダメージ計算
      const baseDamage = challengePower - playerPower
      
      // 防御型保険によるダメージ軽渚
      const activeInsurances = game.getActiveInsurances()
      let damageReduction = 0
      
      activeInsurances.forEach(insurance => {
        if (insurance.isDefensiveInsurance()) {
          damageReduction += insurance.calculateDamageReduction()
        }
      })
      
      return -(Math.max(1, baseDamage - damageReduction))
    }
  }

  /**
   * 活力を更新
   * @private
   */
  private updateVitality(game: Game, change: number): void {
    if (change >= 0) {
      game.heal(change)
    } else {
      game.applyDamage(-change)
    }
  }

  /**
   * 結果メッセージを作成
   * @private
   */
  private createResultMessage(success: boolean, vitalityChange: number): string {
    if (success) {
      return `チャレンジ成功！ +${vitalityChange} 活力`
    } else {
      return `チャレンジ失敗... ${vitalityChange} 活力`
    }
  }
}