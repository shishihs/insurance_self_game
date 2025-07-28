import type { Card } from '../entities/Card'
import type { InsuranceExpirationNotice } from '../types/game.types'

/**
 * 保険期限管理サービス
 * 
 * 保険カードの期限切れ処理を専門に扱う単一責任クラス
 */
export class InsuranceExpirationManager {
  private static readonly EXPIRING_SOON_THRESHOLD = 2

  /**
   * 定期保険の期限を更新し、期限切れをチェック
   * @param insuranceCards 現在有効な保険カード配列（変更される）
   * @param expiredInsurances 期限切れ保険カード配列（変更される）
   * @param currentTurn 現在のターン数
   * @returns 期限切れ通知（期限切れがない場合はundefined）
   */
  updateInsuranceExpirations(
    insuranceCards: Card[], 
    expiredInsurances: Card[], 
    currentTurn: number
  ): InsuranceExpirationNotice | undefined {
    // 期限切れになった保険を一時的に保存
    const nowExpired: Card[] = []
    
    // 全ての保険カードの期限を更新
    insuranceCards.forEach(card => {
      if (card.isTermInsurance()) {
        card.decrementTurn()
        
        // 期限切れになったものを記録
        if (card.isExpired()) {
          nowExpired.push(card)
        }
      }
    })
    
    // 期限切れの保険を active から expired に移動
    if (nowExpired.length > 0) {
      // 期限切れカードを保険カード配列から削除
      nowExpired.forEach(expiredCard => {
        const index = insuranceCards.findIndex(card => card.id === expiredCard.id)
        if (index !== -1) {
          insuranceCards.splice(index, 1)
        }
      })
      
      // 期限切れ配列に追加
      expiredInsurances.push(...nowExpired)
      
      // 期限切れ通知を作成
      return this.createExpirationNotice(nowExpired, currentTurn)
    }
    
    return undefined
  }

  /**
   * 期限が近い保険カードを取得（残り指定ターン以下）
   */
  getExpiringSoonInsurances(insuranceCards: Card[]): Card[] {
    return insuranceCards.filter(card => 
      card.isTermInsurance() && 
      card.remainingTurns !== undefined && 
      card.remainingTurns <= InsuranceExpirationManager.EXPIRING_SOON_THRESHOLD && 
      card.remainingTurns > 0
    )
  }

  /**
   * 保険期限切れの警告メッセージを取得
   */
  getExpirationWarnings(insuranceCards: Card[]): string[] {
    const expiringSoon = this.getExpiringSoonInsurances(insuranceCards)
    return expiringSoon.map(card => 
      `⚠️ 「${card.name}」の期限まであと${card.remainingTurns}ターンです`
    )
  }

  /**
   * 期限切れ通知を作成
   * @private
   */
  private createExpirationNotice(expiredCards: Card[], turnNumber: number): InsuranceExpirationNotice {
    const expiredNames = expiredCards.map(card => card.name).join('、')
    const message = expiredCards.length === 1 
      ? `定期保険「${expiredNames}」の期限が切れました。`
      : `定期保険${expiredCards.length}件（${expiredNames}）の期限が切れました。`
    
    return {
      expiredCards,
      message,
      showRenewalOption: true, // 将来的に更新オプションを実装するため
      turnNumber
    }
  }
}