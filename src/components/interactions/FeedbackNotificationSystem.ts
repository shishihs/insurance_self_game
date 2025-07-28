/**
 * フィードバック通知システム
 * ゲームアクションに対する即座の視覚的・触覚的フィードバック
 */

import { InteractionAudioManager } from './InteractionAudioManager'

export interface NotificationConfig {
  id?: string
  type: 'success' | 'error' | 'warning' | 'info' | 'achievement'
  title: string
  message?: string
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center'
  icon?: string
  haptic?: boolean
  sound?: boolean
  persistent?: boolean
  actions?: NotificationAction[]
}

export interface NotificationAction {
  label: string
  action: () => void
  style?: 'primary' | 'secondary' | 'danger'
}

export interface GameFeedback {
  cardPlayed: { cardName: string; power: number; success: boolean }
  challengeCompleted: { challengeName: string; reward: number }
  levelUp: { newLevel: string; bonuses: string[] }
  insuranceClaimed: { type: string; amount: number }
  gameOver: { reason: string; finalScore: number }
  achievement: { name: string; description: string }
}

export class FeedbackNotificationSystem {
  private container: HTMLElement
  private notifications: Map<string, HTMLElement> = new Map()
  private notificationQueue: NotificationConfig[] = []
  private isProcessingQueue: boolean = false
  private maxNotifications: number = 5
  private defaultDuration: number = 4000
  private audioManager: InteractionAudioManager

  constructor() {
    this.createContainer()
    this.setupStyles()
    this.audioManager = new InteractionAudioManager()
  }

  /**
   * 通知を表示
   */
  async show(config: NotificationConfig): Promise<string> {
    const id = config.id || this.generateId()
    const notification = this.createNotification({ ...config, id })

    // 最大表示数チェック
    if (this.notifications.size >= this.maxNotifications) {
      this.removeOldest()
    }

    this.notifications.set(id, notification)
    this.container.appendChild(notification)

    // アニメーション
    await this.animateIn(notification, config.position || 'top-right')

    // 自動削除
    if (!config.persistent) {
      const duration = config.duration || this.defaultDuration
      setTimeout(() => {
        this.hide(id)
      }, duration)
    }

    // ハプティックフィードバック
    if (config.haptic !== false) {
      this.triggerHaptic(config.type)
    }

    // オーディオフィードバック
    if (config.sound !== false) {
      this.audioManager.playInteractionSound({
        type: this.mapNotificationTypeToAudio(config.type),
        intensity: config.type === 'achievement' ? 'strong' : 'normal'
      })
    }

    return id
  }

  /**
   * 通知を非表示
   */
  async hide(id: string): Promise<void> {
    const notification = this.notifications.get(id)
    if (!notification) return

    await this.animateOut(notification)
    notification.remove()
    this.notifications.delete(id)
  }

  /**
   * 全ての通知をクリア
   */
  async clear(): Promise<void> {
    const promises = Array.from(this.notifications.keys()).map(id => this.hide(id))
    await Promise.all(promises)
  }

  /**
   * ゲーム固有のフィードバック通知
   */
  async showGameFeedback(type: keyof GameFeedback, data: any): Promise<string> {
    switch (type) {
      case 'cardPlayed':
        return this.showCardPlayedFeedback(data)
      case 'challengeCompleted':
        return this.showChallengeCompletedFeedback(data)
      case 'levelUp':
        return this.showLevelUpFeedback(data)
      case 'insuranceClaimed':
        return this.showInsuranceClaimedFeedback(data)
      case 'gameOver':
        return this.showGameOverFeedback(data)
      case 'achievement':
        return this.showAchievementFeedback(data)
      default:
        return this.show({
          type: 'info',
          title: 'ゲームイベント',
          message: JSON.stringify(data)
        })
    }
  }

  /**
   * カードプレイフィードバック
   */
  private async showCardPlayedFeedback(data: GameFeedback['cardPlayed']): Promise<string> {
    const { cardName, power, success } = data
    
    return this.show({
      type: success ? 'success' : 'error',
      title: success ? 'カード成功!' : 'カード失敗',
      message: `${cardName} (パワー: ${power})`,
      icon: success ? '✅' : '❌',
      position: 'top-right',
      duration: 2500,
      haptic: true
    })
  }

  /**
   * チャレンジ完了フィードバック
   */
  private async showChallengeCompletedFeedback(data: GameFeedback['challengeCompleted']): Promise<string> {
    const { challengeName, reward } = data
    
    return this.show({
      type: 'success',
      title: 'チャレンジ達成!',
      message: `${challengeName} - 報酬: ${reward}pt`,
      icon: '🎯',
      position: 'center',
      duration: 3500,
      haptic: true,
      actions: [
        {
          label: '続ける',
          action: () => {},
          style: 'primary'
        }
      ]
    })
  }

  /**
   * レベルアップフィードバック
   */
  private async showLevelUpFeedback(data: GameFeedback['levelUp']): Promise<string> {
    const { newLevel, bonuses } = data
    
    return this.show({
      type: 'achievement',
      title: `${newLevel}に到達!`,
      message: `新しい特典: ${bonuses.join(', ')}`,
      icon: '⭐',
      position: 'center',
      duration: 5000,
      persistent: false,
      haptic: true
    })
  }

  /**
   * 保険請求フィードバック
   */
  private async showInsuranceClaimedFeedback(data: GameFeedback['insuranceClaimed']): Promise<string> {
    const { type, amount } = data
    
    return this.show({
      type: 'info',
      title: '保険適用',
      message: `${type}保険により${amount}pt回復`,
      icon: '🛡️',
      position: 'top-left',
      duration: 3000,
      haptic: true
    })
  }

  /**
   * ゲームオーバーフィードバック
   */
  private async showGameOverFeedback(data: GameFeedback['gameOver']): Promise<string> {
    const { reason, finalScore } = data
    
    return this.show({
      type: 'error',
      title: 'ゲーム終了',
      message: `${reason} - 最終スコア: ${finalScore}`,
      icon: '🎮',
      position: 'center',
      persistent: true,
      haptic: true,
      actions: [
        {
          label: 'リスタート',
          action: () => window.location.reload(),
          style: 'primary'
        },
        {
          label: 'ホームに戻る',
          action: () => {},
          style: 'secondary'
        }
      ]
    })
  }

  /**
   * 実績解除フィードバック
   */
  private async showAchievementFeedback(data: GameFeedback['achievement']): Promise<string> {
    const { name, description } = data
    
    return this.show({
      type: 'achievement',
      title: '実績解除!',
      message: `${name}: ${description}`,
      icon: '🏆',
      position: 'center',
      duration: 6000,
      haptic: true
    })
  }

  /**
   * クイックフィードバック（シンプルなメッセージ）
   */
  async quickFeedback(message: string, type: NotificationConfig['type'] = 'info', duration = 2000): Promise<string> {
    return this.show({
      type,
      title: message,
      duration,
      position: 'top-right',
      haptic: false
    })
  }

  /**
   * 進捗通知
   */
  async showProgress(title: string, current: number, total: number): Promise<string> {
    const percentage = Math.round((current / total) * 100)
    
    return this.show({
      type: 'info',
      title,
      message: `進捗: ${current}/${total} (${percentage}%)`,
      icon: '📊',
      position: 'bottom-right',
      duration: 2000,
      haptic: false
    })
  }

  /**
   * エラー通知（詳細付き）
   */
  async showError(title: string, error: Error | string, actions?: NotificationAction[]): Promise<string> {
    const errorMessage = error instanceof Error ? error.message : error
    
    return this.show({
      type: 'error',
      title,
      message: errorMessage,
      icon: '⚠️',
      position: 'top-right',
      duration: 6000,
      persistent: !!actions,
      haptic: true,
      actions
    })
  }

  private createContainer(): void {
    this.container = document.createElement('div')
    this.container.id = 'feedback-notifications-container'
    this.container.setAttribute('aria-live', 'polite')
    this.container.setAttribute('aria-label', 'フィードバック通知')
    document.body.appendChild(this.container)
  }

  private createNotification(config: NotificationConfig): HTMLElement {
    const notification = document.createElement('div')
    notification.className = `feedback-notification notification-${config.type} position-${config.position || 'top-right'}`
    notification.setAttribute('role', 'alert')
    notification.setAttribute('data-notification-id', config.id!)

    const icon = config.icon || this.getDefaultIcon(config.type)
    const hasActions = config.actions && config.actions.length > 0

    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-header">
          <span class="notification-icon">${icon}</span>
          <span class="notification-title">${config.title}</span>
          <button class="notification-close" aria-label="通知を閉じる">×</button>
        </div>
        ${config.message ? `<div class="notification-message">${config.message}</div>` : ''}
        ${hasActions ? `
          <div class="notification-actions">
            ${config.actions!.map(action => `
              <button class="notification-action notification-action-${action.style || 'secondary'}" 
                      data-action="${action.label}">
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div class="notification-progress"></div>
    `

    // イベントリスナー
    this.setupNotificationEvents(notification, config)

    return notification
  }

  private setupNotificationEvents(notification: HTMLElement, config: NotificationConfig): void {
    // 閉じるボタン
    const closeBtn = notification.querySelector('.notification-close')
    closeBtn?.addEventListener('click', () => {
      this.hide(config.id!)
    })

    // アクションボタン
    if (config.actions) {
      config.actions.forEach(action => {
        const btn = notification.querySelector(`[data-action="${action.label}"]`)
        btn?.addEventListener('click', () => {
          action.action()
          if (!config.persistent) {
            this.hide(config.id!)
          }
        })
      })
    }

    // プログレスバー（非永続的な通知のみ）
    if (!config.persistent) {
      const progressBar = notification.querySelector('.notification-progress') as HTMLElement
      const duration = config.duration || this.defaultDuration
      
      progressBar.style.animation = `notification-progress ${duration}ms linear`
    }
  }

  private async animateIn(notification: HTMLElement, position: string): Promise<void> {
    const animations = {
      'top-right': [
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      'top-left': [
        { transform: 'translateX(-100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      'bottom-right': [
        { transform: 'translateX(100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      'bottom-left': [
        { transform: 'translateX(-100%)', opacity: 0 },
        { transform: 'translateX(0)', opacity: 1 }
      ],
      'center': [
        { transform: 'scale(0.8) translateY(-20px)', opacity: 0 },
        { transform: 'scale(1) translateY(0)', opacity: 1 }
      ]
    }

    const keyframes = animations[position as keyof typeof animations] || animations['top-right']
    
    await notification.animate(keyframes, {
      duration: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'both'
    }).finished
  }

  private async animateOut(notification: HTMLElement): Promise<void> {
    await notification.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.8)', opacity: 0 }
    ], {
      duration: 200,
      easing: 'ease-in',
      fill: 'both'
    }).finished
  }

  private removeOldest(): void {
    const oldest = this.notifications.entries().next()
    if (!oldest.done) {
      const [id] = oldest.value
      this.hide(id)
    }
  }

  private getDefaultIcon(type: NotificationConfig['type']): string {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      achievement: '🏆'
    }
    return icons[type] || 'ℹ️'
  }

  private triggerHaptic(type: NotificationConfig['type']): void {
    if (!navigator.vibrate) return

    const patterns = {
      success: [10, 50, 10],
      error: [100],
      warning: [50, 50, 50],
      info: [10],
      achievement: [20, 100, 20, 100, 20]
    }

    navigator.vibrate(patterns[type] || [10])
  }

  private generateId(): string {
    return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private mapNotificationTypeToAudio(type: NotificationConfig['type']): 'success' | 'error' | 'notification' {
    switch (type) {
      case 'success':
      case 'achievement':
        return 'success'
      case 'error':
        return 'error'
      case 'warning':
      case 'info':
      default:
        return 'notification'
    }
  }

  private setupStyles(): void {
    const style = document.createElement('style')
    style.textContent = `
      #feedback-notifications-container {
        position: fixed;
        pointer-events: none;
        z-index: 10000;
        inset: 0;
      }

      .feedback-notification {
        position: absolute;
        width: 320px;
        max-width: 90vw;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.2);
        pointer-events: auto;
        overflow: hidden;
      }

      .notification-success {
        border-left: 4px solid #10B981;
      }

      .notification-error {
        border-left: 4px solid #EF4444;
      }

      .notification-warning {
        border-left: 4px solid #F59E0B;
      }

      .notification-info {
        border-left: 4px solid #3B82F6;
      }

      .notification-achievement {
        border-left: 4px solid #8B5CF6;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(255, 255, 255, 0.95));
      }

      .position-top-right {
        top: 20px;
        right: 20px;
      }

      .position-top-left {
        top: 20px;
        left: 20px;
      }

      .position-bottom-right {
        bottom: 20px;
        right: 20px;
      }

      .position-bottom-left {
        bottom: 20px;
        left: 20px;
      }

      .position-center {
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 400px;
      }

      .notification-content {
        padding: 16px;
      }

      .notification-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
      }

      .notification-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .notification-title {
        font-weight: 600;
        color: #1F2937;
        flex-grow: 1;
      }

      .notification-close {
        background: none;
        border: none;
        font-size: 18px;
        color: #6B7280;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.15s ease;
      }

      .notification-close:hover {
        background: rgba(0, 0, 0, 0.05);
        color: #374151;
      }

      .notification-message {
        color: #4B5563;
        font-size: 14px;
        line-height: 1.4;
        margin-bottom: 12px;
      }

      .notification-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }

      .notification-action {
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease;
        border: 1px solid transparent;
      }

      .notification-action-primary {
        background: #3B82F6;
        color: white;
      }

      .notification-action-primary:hover {
        background: #2563EB;
      }

      .notification-action-secondary {
        background: rgba(0, 0, 0, 0.05);
        color: #374151;
        border-color: rgba(0, 0, 0, 0.1);
      }

      .notification-action-secondary:hover {
        background: rgba(0, 0, 0, 0.1);
      }

      .notification-action-danger {
        background: #EF4444;
        color: white;
      }

      .notification-action-danger:hover {
        background: #DC2626;
      }

      .notification-progress {
        height: 3px;
        background: rgba(0, 0, 0, 0.1);
        position: relative;
      }

      .notification-progress::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        background: currentColor;
        width: 100%;
        transform-origin: left;
      }

      @keyframes notification-progress {
        from { transform: scaleX(1); }
        to { transform: scaleX(0); }
      }

      .notification-progress::before {
        animation: inherit;
      }

      /* モバイル対応 */
      @media (max-width: 640px) {
        .feedback-notification {
          width: calc(100vw - 32px);
          max-width: none;
        }

        .position-top-right,
        .position-top-left {
          top: 16px;
          left: 16px;
          right: 16px;
        }

        .position-bottom-right,
        .position-bottom-left {
          bottom: 16px;
          left: 16px;
          right: 16px;
        }

        .position-center {
          width: calc(100vw - 32px);
          left: 16px;
          right: 16px;
          transform: translateY(-50%);
        }
      }

      /* 縮小モーション設定対応 */
      @media (prefers-reduced-motion: reduce) {
        .feedback-notification {
          animation: none !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  /**
   * クリーンアップ
   */
  destroy(): void {
    this.clear()
    this.container.remove()
    this.audioManager.destroy()
  }
}