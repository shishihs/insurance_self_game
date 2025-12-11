/**
 * ゲームターン管理サービス
 * 
 * Game.tsから分離されたターン管理の責任を持つ
 * 
 * @class GameTurnManager
 * @description
 * ゲームのターン進行に関するすべてのロジックを管理します。
 * ステージ進行、保険期限管理、ターン開始時のドローなどを担当します。
 * 
 * @example
 * ```typescript
 * const turnManager = new GameTurnManager(stageManager, expirationManager);
 * const result = turnManager.nextTurn(game);
 * console.log(`Turn ${game.turn} - Expired insurances: ${result.newExpiredCount}`);
 * ```
 */

import type { Game } from '../entities/Game'
import type { TurnResult } from '../types/game.types'
import type { GameStageManager } from './GameStageManager'
import type { InsuranceExpirationManager } from './InsuranceExpirationManager'

export class GameTurnManager {
  constructor(
    private readonly stageManager: GameStageManager,
    private readonly expirationManager: InsuranceExpirationManager
  ) { }

  /**
   * 次のターンへ進める
   * 
   * @method nextTurn
   * @param {Game} game - ゲームインスタンス
   * @returns {TurnResult} ターン結果（期限切れ保険情報を含む）
   * @throws {Error} ゲームが進行中でない場合
   * 
   * @description
   * 1. ゲーム状態を検証
   * 2. ターン数をインクリメント
   * 3. ステージ進行をチェック
   * 4. 保険期限を更新
   * 5. カードをドロー
   */
  nextTurn(game: Game): TurnResult {
    this.validateGameState(game)

    // 手札をすべて捨て札に移動 (デッキ構築ゲームの基本ルール)
    game.cardManager.discardHand()

    game.turn++
    game.stats.turnsPlayed++
    game.phase = 'draw'

    // ステージ進行の判定
    this.checkStageProgression(game)

    // 勝利条件のチェック
    this.checkVictoryCondition(game)
    if (game.status === 'victory') {
      return {
        newExpiredCount: 0,
        remainingInsuranceCount: game.getActiveInsurances().length
      }
    }

    // 保険期限の更新
    const expirationResult = this.updateInsuranceExpirations(game)

    // 保険料の支払い logic (GameTurnManager or Game entity responsibility)
    const insuranceCost = game.insuranceBurden
    if (insuranceCost > 0) {
      // 活力が足りる場合のみ支払う
      if (game.vitality > insuranceCost) {
        try {
          game.applyDamage(insuranceCost)
          console.log(`💸 保険料支払い: -${insuranceCost} 活力`)
        } catch (e) {
          console.error('保険料支払いに失敗しました', e)
        }
      } else {
        // 払えない場合は保険失効（即死はさせない）
        console.warn(`⚠️ 保険料(${insuranceCost})を支払う活力が不足しています。全ての保険が失効します。`)

        // 全ての有効な保険を失効させる
        game.expireAllInsurances()

        // ユーザーにお知らせ（Gameエンティティに通知機能があれば呼ぶが、ここではログのみ）
      }
    }

    // Check if game ended due to insurance cost
    if (game.status === 'game_over') {
      return {
        newExpiredCount: expirationResult?.expiredCards.length || 0,
        remainingInsuranceCount: game.getActiveInsurances().length
      }
    }

    // ターン開始時のドロー (手札を補充)
    // GameController側でチャレンジ決定後に引くように変更するため削除
    // const drawCount = game.config.startingHandSize || 5
    // game.drawCards(drawCount)

    // 回復型保険の効果を適用
    this.applyRecoveryInsuranceEffects(game)

    return {
      ...(expirationResult ? { insuranceExpirations: expirationResult } : {}),
      newExpiredCount: expirationResult?.expiredCards.length || 0,
      remainingInsuranceCount: game.getActiveInsurances().length
    }
  }

  /**
   * 勝利条件をチェック
   * 勝利条件: 夢チャレンジをクリアした場合のみ（Game.tsのresolveChallengeで判定）
   * 敗北条件: 最大ターン数に達しても夢を達成できなかった場合
   * @private
   */
  private checkVictoryCondition(game: Game): void {
    // 最大ターン数（夢を達成できなければゲームオーバー）
    // 夢達成には時間がかかるため、少し長めに設定
    const maxTurns = 100

    if (game.turn >= maxTurns && game.status !== 'victory') {
      game.status = 'game_over'
      game.completedAt = new Date()
      console.log(`💔 ゲームオーバー: ${maxTurns}ターン経過しても夢を達成できませんでした`)
    }

    // Note: 夢達成はGame.tsのresolveChallenge内で判定
  }

  /**
   * ゲーム状態の検証
   * @private
   */
  private validateGameState(game: Game): void {
    if (game.status !== 'in_progress') {
      throw new Error('Game is not in progress')
    }
  }

  /**
   * ステージ進行をチェック
   * @private
   */
  private checkStageProgression(game: Game): void {
    const progressionResult = this.stageManager.checkStageProgression(
      game.stage,
      game.turn
    )

    if (progressionResult.hasChanged) {
      game.setStage(progressionResult.newStage)

      if (progressionResult.transitionMessage) {
        console.log(progressionResult.transitionMessage)
      }
    }
  }

  /**
   * 保険期限を更新
   * @private
   */
  private updateInsuranceExpirations(game: Game) {
    const expirationResult = this.expirationManager.updateInsuranceExpirations(
      game.activeInsurances,
      game.expiredInsurances,
      game.turn
    )

    // 期限切れがあった場合は保険料負担を再計算
    if (expirationResult) {
      // Gameクラスのメソッドを呼び出して更新
      // これにより、Gameクラスの内部状態の一貫性を保つ
      (game as any).updateInsuranceBurden()
    }

    return expirationResult
  }

  /**
   * 回復型保険の効果を適用
   * @private
   */
  private applyRecoveryInsuranceEffects(game: Game): void {
    const activeInsurances = game.getActiveInsurances()
    let totalHeal = 0

    activeInsurances.forEach(insurance => {
      if (insurance.isRecoveryInsurance()) {
        totalHeal += insurance.calculateTurnHeal()
      }
    })

    if (totalHeal > 0) {
      game.heal(totalHeal)
      console.log(`💚 回復型保険効果: +${totalHeal} 活力`)
    }
  }
}