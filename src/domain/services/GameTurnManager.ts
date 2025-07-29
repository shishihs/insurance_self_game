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
import { GameStageManager } from './GameStageManager'
import { InsuranceExpirationManager } from './InsuranceExpirationManager'

export class GameTurnManager {
  constructor(
    private readonly stageManager: GameStageManager,
    private readonly expirationManager: InsuranceExpirationManager
  ) {}

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
    
    // ターンを進める
    game.turn++
    game.stats.turnsPlayed++
    game.phase = 'draw'
    
    // ステージ進行の判定
    this.checkStageProgression(game)
    
    // 保険期限の更新
    const expirationResult = this.updateInsuranceExpirations(game)
    
    // ターン開始時のドロー
    game.drawCards(1)
    
    return {
      insuranceExpirations: expirationResult,
      newExpiredCount: expirationResult?.expiredCards.length || 0,
      remainingInsuranceCount: game.insuranceCards.length
    }
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
      game.insuranceCards,
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
}