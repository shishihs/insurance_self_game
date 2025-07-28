import type { GameStage } from '../types/card.types'

/**
 * ゲームステージ管理サービス
 * 
 * ゲームのステージ進行ロジックを管理する単一責任クラス
 */
export class GameStageManager {
  private static readonly STAGE_TRANSITION_TURNS = {
    YOUTH_TO_MIDDLE: 8,
    MIDDLE_TO_FULFILLMENT: 15
  } as const

  /**
   * ターン数に基づいてステージ進行をチェックし、必要に応じて更新
   * @param currentStage 現在のステージ
   * @param turn 現在のターン数
   * @returns 新しいステージ（変更がない場合は元のステージ）
   */
  checkStageProgression(currentStage: GameStage, turn: number): {
    newStage: GameStage
    hasChanged: boolean
    transitionMessage?: string
  } {
    const oldStage = currentStage
    let newStage = currentStage

    if (turn >= GameStageManager.STAGE_TRANSITION_TURNS.YOUTH_TO_MIDDLE && currentStage === 'youth') {
      newStage = 'middle'
    } else if (turn >= GameStageManager.STAGE_TRANSITION_TURNS.MIDDLE_TO_FULFILLMENT && currentStage === 'middle') {
      newStage = 'fulfillment'
    }

    const hasChanged = oldStage !== newStage
    const transitionMessage = hasChanged 
      ? `🎯 ステージが変化しました: ${oldStage} → ${newStage}`
      : undefined

    return {
      newStage,
      hasChanged,
      transitionMessage
    }
  }

  /**
   * 手動でステージを進める
   * @param currentStage 現在のステージ
   * @returns 次のステージと完了状態
   */
  advanceStage(currentStage: GameStage): {
    newStage: GameStage | null
    isCompleted: boolean
  } {
    switch (currentStage) {
      case 'youth':
        return { newStage: 'middle', isCompleted: false }
      case 'middle':
        return { newStage: 'fulfillment', isCompleted: false }
      case 'fulfillment':
        return { newStage: null, isCompleted: true }
      default:
        return { newStage: null, isCompleted: true }
    }
  }

  /**
   * 指定されたステージが最終ステージかどうか判定
   */
  isFinalStage(stage: GameStage): boolean {
    return stage === 'fulfillment'
  }
}