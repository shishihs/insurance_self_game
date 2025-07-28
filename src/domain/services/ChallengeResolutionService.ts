import type { Card } from '../entities/Card'
import type { ChallengeResult, GameStage } from '../types/card.types'
import type { ICardManager } from './CardManager'

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
   * @returns チャレンジ結果
   */
  resolveChallenge(
    challenge: Card,
    selectedCards: Card[],
    cardManager: ICardManager,
    stage: GameStage,
    insuranceBurden: number
  ): ChallengeResult {
    // パワー計算の詳細
    const powerBreakdown = this.calculateTotalPower(selectedCards, insuranceBurden)
    const playerPower = powerBreakdown.total
    
    // 夢カードの場合は年齢調整を適用
    const challengePower = this.getDreamRequiredPower(challenge, stage)
    
    // 成功判定
    const success = playerPower >= challengePower
    
    // 活力変更計算
    let vitalityChange = 0
    if (success) {
      vitalityChange = Math.floor((playerPower - challengePower) / 2)
    } else {
      vitalityChange = -(challengePower - playerPower)
    }
    
    // 使用したカードを捨て札に
    cardManager.discardSelectedCards()
    
    // 結果作成
    const result: ChallengeResult = {
      success,
      playerPower,
      challengePower,
      vitalityChange,
      message: success 
        ? `チャレンジ成功！ +${vitalityChange} 活力`
        : `チャレンジ失敗... ${vitalityChange} 活力`,
      powerBreakdown
    }
    
    return result
  }

  /**
   * 総合パワーを詳細に計算
   * @param cards 使用するカード
   * @param insuranceBurden 保険料負担
   * @returns パワーの詳細な内訳
   */
  private calculateTotalPower(cards: Card[], insuranceBurden: number): {
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
    if (!challenge.isDreamCard() || !challenge.dreamCategory) {
      return challenge.power
    }
    
    // 青年期は調整なし
    if (stage === 'youth') {
      return challenge.power
    }
    
    // 中年期・充実期の年齢調整を適用（簡易版）
    const adjustment = stage === 'middle' ? 1 : 2
    const adjustedPower = challenge.power + adjustment
    
    // 最小値は1
    return Math.max(1, adjustedPower)
  }
}