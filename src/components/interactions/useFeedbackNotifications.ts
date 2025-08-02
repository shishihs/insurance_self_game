/**
 * Vue Composition API for Feedback Notifications
 * ゲームアクションに対するフィードバック通知の統合
 */

import { onMounted, onUnmounted, ref } from 'vue'
import { FeedbackNotificationSystem, type GameFeedback, type NotificationConfig } from './FeedbackNotificationSystem'

export function useFeedbackNotifications() {
  const system = new FeedbackNotificationSystem()
  const activeNotifications = ref<string[]>([])

  onUnmounted(() => {
    system.destroy()
  })

  /**
   * 基本通知表示
   */
  const notify = async (config: NotificationConfig): Promise<string> => {
    const id = await system.show(config)
    activeNotifications.value.push(id)
    return id
  }

  /**
   * 通知を隠す
   */
  const hide = async (id: string): Promise<void> => {
    await system.hide(id)
    const index = activeNotifications.value.indexOf(id)
    if (index > -1) {
      activeNotifications.value.splice(index, 1)
    }
  }

  /**
   * 全ての通知をクリア
   */
  const clear = async (): Promise<void> => {
    await system.clear()
    activeNotifications.value = []
  }

  /**
   * 成功通知
   */
  const success = async (title: string, message?: string, duration = 3000): Promise<string> => {
    return notify({
      type: 'success',
      title,
      message,
      duration,
      haptic: true
    })
  }

  /**
   * エラー通知
   */
  const error = async (title: string, message?: string, duration = 5000): Promise<string> => {
    return notify({
      type: 'error',
      title,
      message,
      duration,
      haptic: true
    })
  }

  /**
   * 警告通知
   */
  const warning = async (title: string, message?: string, duration = 4000): Promise<string> => {
    return notify({
      type: 'warning',
      title,
      message,
      duration,
      haptic: true
    })
  }

  /**
   * 情報通知
   */
  const info = async (title: string, message?: string, duration = 3000): Promise<string> => {
    return notify({
      type: 'info',
      title,
      message,
      duration
    })
  }

  /**
   * 実績通知
   */
  const achievement = async (title: string, message?: string, duration = 6000): Promise<string> => {
    return notify({
      type: 'achievement',
      title,
      message,
      duration,
      position: 'center',
      haptic: true
    })
  }

  /**
   * クイックフィードバック
   */
  const quick = async (message: string, type: NotificationConfig['type'] = 'info'): Promise<string> => {
    return system.quickFeedback(message, type)
  }

  /**
   * 進捗通知
   */
  const progress = async (title: string, current: number, total: number): Promise<string> => {
    return system.showProgress(title, current, total)
  }

  /**
   * ゲーム固有のフィードバック
   */
  const gameFeedback = async (type: keyof GameFeedback, data: any): Promise<string> => {
    const id = await system.showGameFeedback(type, data)
    activeNotifications.value.push(id)
    return id
  }

  // ゲーム固有のヘルパー関数
  const cardPlayed = async (cardName: string, power: number, success: boolean): Promise<string> => {
    return gameFeedback('cardPlayed', { cardName, power, success })
  }

  const challengeCompleted = async (challengeName: string, reward: number): Promise<string> => {
    return gameFeedback('challengeCompleted', { challengeName, reward })
  }

  const levelUp = async (newLevel: string, bonuses: string[]): Promise<string> => {
    return gameFeedback('levelUp', { newLevel, bonuses })
  }

  const insuranceClaimed = async (type: string, amount: number): Promise<string> => {
    return gameFeedback('insuranceClaimed', { type, amount })
  }

  const gameOver = async (reason: string, finalScore: number): Promise<string> => {
    return gameFeedback('gameOver', { reason, finalScore })
  }

  const showAchievement = async (name: string, description: string): Promise<string> => {
    return gameFeedback('achievement', { name, description })
  }

  /**
   * 確認ダイアログ風通知
   */
  const confirm = async (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): Promise<string> => {
    return notify({
      type: 'warning',
      title,
      message,
      persistent: true,
      position: 'center',
      actions: [
        {
          label: 'はい',
          action: onConfirm,
          style: 'primary'
        },
        {
          label: 'いいえ',
          action: onCancel || (() => {}),
          style: 'secondary'
        }
      ]
    })
  }

  /**
   * 選択ダイアログ風通知
   */
  const choose = async (
    title: string,
    message: string,
    choices: Array<{ label: string; action: () => void; style?: 'primary' | 'secondary' | 'danger' }>
  ): Promise<string> => {
    return notify({
      type: 'info',
      title,
      message,
      persistent: true,
      position: 'center',
      actions: choices
    })
  }

  /**
   * ツールチップ風の小さな通知
   */
  const tooltip = async (element: HTMLElement, message: string, duration = 2000): Promise<string> => {
    const rect = element.getBoundingClientRect()
    
    return notify({
      type: 'info',
      title: message,
      duration,
      position: 'top-right', // 実際の位置は要素の位置に基づいて調整が必要
      haptic: false
    })
  }

  /**
   * ステータス更新通知
   */
  const statusUpdate = async (title: string, oldValue: number, newValue: number, unit = ''): Promise<string> => {
    const change = newValue - oldValue
    const changeText = change > 0 ? `+${change}` : change.toString()
    const type = change > 0 ? 'success' : change < 0 ? 'error' : 'info'
    
    return notify({
      type,
      title,
      message: `${oldValue}${unit} → ${newValue}${unit} (${changeText}${unit})`,
      duration: 2500,
      position: 'top-left',
      haptic: change !== 0
    })
  }

  /**
   * アクション結果通知
   */
  const actionResult = async (
    action: string,
    success: boolean,
    details?: string
  ): Promise<string> => {
    return notify({
      type: success ? 'success' : 'error',
      title: success ? `${action}成功` : `${action}失敗`,
      message: details,
      duration: success ? 2500 : 4000,
      haptic: true
    })
  }

  /**
   * バッチ操作（複数の通知を順次表示）
   */
  const batch = async (notifications: NotificationConfig[], delay = 300): Promise<string[]> => {
    const ids: string[] = []
    
    for (let i = 0; i < notifications.length; i++) {
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      const id = await notify(notifications[i])
      ids.push(id)
    }
    
    return ids
  }

  /**
   * 統計情報取得
   */
  const getStats = () => ({
    activeCount: activeNotifications.value.length,
    activeIds: [...activeNotifications.value]
  })

  return {
    // 基本通知
    notify,
    hide,
    clear,

    // タイプ別通知
    success,
    error,
    warning,
    info,
    achievement,
    quick,
    progress,

    // ゲーム固有通知
    gameFeedback,
    cardPlayed,
    challengeCompleted,
    levelUp,
    insuranceClaimed,
    gameOver,
    showAchievement,

    // 高度な通知
    confirm,
    choose,
    tooltip,
    statusUpdate,
    actionResult,
    batch,

    // 状態
    activeNotifications: readonly(activeNotifications),
    getStats,

    // 直接アクセス（高度な使用）
    system
  }
}

/**
 * ゲーム専用のフィードバック通知コンポーザブル
 */
export function useGameFeedback() {
  const notifications = useFeedbackNotifications()

  /**
   * ターン開始通知
   */
  const turnStart = async (turnNumber: number): Promise<string> => {
    return notifications.info(`ターン ${turnNumber}`, '新しいターンが開始されました', 2000)
  }

  /**
   * 活力変化通知
   */
  const vitalityChange = async (oldVitality: number, newVitality: number): Promise<string> => {
    return notifications.statusUpdate('活力', oldVitality, newVitality, 'pt')
  }

  /**
   * 保険追加通知
   */
  const insuranceAdded = async (insuranceType: string, coverage: number): Promise<string> => {
    return notifications.success(
      '保険追加',
      `${insuranceType}保険 (保障額: ${coverage}pt) を追加しました`,
      3000
    )
  }

  /**
   * ステージ変更通知
   */
  const stageChange = async (oldStage: string, newStage: string): Promise<string> => {
    const stageNames: Record<string, string> = {
      youth: '青年期',
      middle: '中年期',
      fulfillment: '充実期'
    }

    return notifications.achievement(
      'ステージ進行',
      `${stageNames[oldStage] || oldStage}から${stageNames[newStage] || newStage}に進みました`,
      4000
    )
  }

  /**
   * チュートリアル進行通知
   */
  const tutorialStep = async (step: string, description: string): Promise<string> => {
    return notifications.info(
      `チュートリアル: ${step}`,
      description,
      3000
    )
  }

  /**
   * エラー回復通知
   */
  const errorRecovered = async (error: string): Promise<string> => {
    return notifications.success(
      '問題解決',
      `${error}の問題が解決されました`,
      2500
    )
  }

  return {
    ...notifications,
    
    // ゲーム専用メソッド
    turnStart,
    vitalityChange,
    insuranceAdded,
    stageChange,
    tutorialStep,
    errorRecovered
  }
}

// readonly helper
function readonly<T>(ref: import('vue').Ref<T>): Readonly<import('vue').Ref<T>> {
  return ref as Readonly<import('vue').Ref<T>>
}