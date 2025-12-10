import type { GameStage } from '../types/card.types'
import { GameConstantsAccessor } from '../constants/GameConstants'

/**
 * ゲームステージ管理サービス
 * 
 * ゲームのステージ進行ロジックを管理する単一責任クラス
 */
export class GameStageManager {
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
    upcomingTransition?: string
  } {
    const oldStage = currentStage
    let newStage = currentStage

    const settings = GameConstantsAccessor.getBalanceSettings().PROGRESSION_SETTINGS.stageTransitionTurns

    if (turn >= settings.youthToMiddle && currentStage === 'youth') {
      newStage = 'middle'
    } else if (turn >= settings.middleToFulfillment && currentStage === 'middle') {
      newStage = 'fulfillment'
    }

    const hasChanged = oldStage !== newStage
    const transitionMessage = hasChanged
      ? `🎯 ステージが変化しました: ${oldStage} → ${newStage} (ターン${turn})`
      : undefined

    // 次のステージ移行予告
    const upcomingTransition = this.getUpcomingTransitionMessage(currentStage, turn)

    const result: {
      newStage: GameStage
      hasChanged: boolean
      transitionMessage?: string
      upcomingTransition?: string
    } = {
      newStage,
      hasChanged
    }

    if (transitionMessage) {
      result.transitionMessage = transitionMessage
    }

    if (upcomingTransition) {
      result.upcomingTransition = upcomingTransition
    }

    return result
  }

  /**
   * 次のステージ移行予告メッセージを生成
   */
  private getUpcomingTransitionMessage(currentStage: GameStage, turn: number): string | undefined {
    const settings = GameConstantsAccessor.getBalanceSettings().PROGRESSION_SETTINGS.stageTransitionTurns

    if (currentStage === 'youth') {
      const turnsUntilMiddle = settings.youthToMiddle - turn
      if (turnsUntilMiddle <= 2 && turnsUntilMiddle > 0) {
        return `⏰ 中年期まであと${turnsUntilMiddle}ターン (体力上限が${this.getStageVitalityLimit('middle')}に減少)`
      }
    } else if (currentStage === 'middle') {
      const turnsUntilFulfillment = settings.middleToFulfillment - turn
      if (turnsUntilFulfillment <= 2 && turnsUntilFulfillment > 0) {
        return `⏰ 充実期まであと${turnsUntilFulfillment}ターン (体力上限が${this.getStageVitalityLimit('fulfillment')}に減少)`
      }
    }
    return undefined
  }

  /**
   * ステージ別の体力上限を取得
   */
  private getStageVitalityLimit(stage: GameStage): number {
    const params = GameConstantsAccessor.getStageParameters(stage)
    // Fallback if something is wrong, though accessor usually handles defaults
    return params ? params.maxVitality : 60
  }

  /**
   * ステージ進行条件を取得（透明化）
   */
  static getStageTransitionInfo(): {
    youthToMiddle: number
    middleToFulfillment: number
    description: string
  } {
    const settings = GameConstantsAccessor.getBalanceSettings().PROGRESSION_SETTINGS.stageTransitionTurns
    return {
      youthToMiddle: settings.youthToMiddle,
      middleToFulfillment: settings.middleToFulfillment,
      description: `青年期→中年期: ターン${settings.youthToMiddle}, 中年期→充実期: ターン${settings.middleToFulfillment}`
    }
  }

  /**
   * 現在のステージ情報を詳細に取得
   */
  static getStageDetails(stage: GameStage, turn: number): {
    stageName: string
    description: string
    vitalityLimit: number
    characteristics: string[]
    nextTransition?: { targetStage: string, atTurn: number, turnsRemaining: number }
  } {
    const stageInfo = {
      youth: {
        stageName: '青年期',
        description: '体力は充実しているが経験不足',
        vitalityLimit: 35,
        characteristics: ['高い体力上限', '経験による効率化なし', '基本的なチャレンジが多い']
      },
      middle: {
        stageName: '中年期',
        description: '体力は落ちるが経験豊富',
        vitalityLimit: 30,
        characteristics: ['中程度の体力上限', '経験による効率化開始', '複雑なチャレンジ増加']
      },
      fulfillment: {
        stageName: '充実期',
        description: '体力は限られるが知恵と余裕',
        vitalityLimit: 27,
        characteristics: ['低い体力上限', '高い経験による効率化', '知識系チャレンジ有利']
      }
    }

    const info = stageInfo[stage]
    const settings = GameConstantsAccessor.getBalanceSettings().PROGRESSION_SETTINGS.stageTransitionTurns

    let nextTransition
    if (stage === 'youth') {
      const turnsRemaining = settings.youthToMiddle - turn
      if (turnsRemaining > 0) {
        nextTransition = {
          targetStage: '中年期',
          atTurn: settings.youthToMiddle,
          turnsRemaining
        }
      }
    } else if (stage === 'middle') {
      const turnsRemaining = settings.middleToFulfillment - turn
      if (turnsRemaining > 0) {
        nextTransition = {
          targetStage: '充実期',
          atTurn: settings.middleToFulfillment,
          turnsRemaining
        }
      }
    }

    const result: {
      stageName: string
      description: string
      vitalityLimit: number
      characteristics: string[]
      nextTransition?: { targetStage: string, atTurn: number, turnsRemaining: number }
    } = {
      ...info
    }

    if (nextTransition) {
      result.nextTransition = nextTransition
    }

    return result
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