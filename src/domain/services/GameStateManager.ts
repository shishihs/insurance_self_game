import type { GamePhase, GameStage, GameStatus } from '../types/game.types'
import type { Card } from '../entities/Card'

/**
 * ゲーム状態の変更イベント
 */
export interface GameStateChangeEvent {
  type: 'phase_change' | 'status_change' | 'stage_change' | 'turn_change'
  previousValue: any
  newValue: any
  timestamp: number
}

/**
 * ゲーム状態変更の履歴管理
 */
export interface GameStateHistory {
  events: GameStateChangeEvent[]
  maxEvents: number
}

/**
 * ゲーム状態管理の専門サービス
 * 
 * Single Responsibility: ゲーム状態の管理とイベント発行に特化
 * Open/Closed: 新しい状態タイプは拡張で対応
 */
export class GameStateManager {
  private readonly listeners: Map<string, Array<(event: GameStateChangeEvent) => void>> = new Map()
  private readonly history: GameStateHistory = {
    events: [],
    maxEvents: 50 // パフォーマンス考慮で制限
  }

  /**
   * 状態変更イベントリスナーを登録
   * 
   * @param eventType イベントタイプ
   * @param listener リスナー関数
   * @returns リスナー解除関数
   */
  addEventListener(
    eventType: GameStateChangeEvent['type'],
    listener: (event: GameStateChangeEvent) => void
  ): () => void {
    const existingListeners = this.listeners.get(eventType) || []
    existingListeners.push(listener)
    this.listeners.set(eventType, existingListeners)

    // リスナー解除関数を返す
    return () => {
      const current = this.listeners.get(eventType) || []
      const index = current.indexOf(listener)
      if (index > -1) {
        current.splice(index, 1)
      }
    }
  }

  /**
   * 状態変更を通知し、履歴に記録
   * 
   * @param type 変更タイプ
   * @param previousValue 以前の値
   * @param newValue 新しい値
   */
  notifyStateChange(
    type: GameStateChangeEvent['type'],
    previousValue: any,
    newValue: any
  ): void {
    const event: GameStateChangeEvent = {
      type,
      previousValue,
      newValue,
      timestamp: Date.now()
    }

    // 履歴に追加
    this.addToHistory(event)

    // リスナーに通知
    const listeners = this.listeners.get(type) || []
    listeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        // テスト環境では期待される挙動なのでエラーログを抑制
        if (process.env.NODE_ENV !== 'test') {
          console.error(`GameStateManager: イベントリスナーでエラーが発生しました`, error)
        }
      }
    })
  }

  /**
   * フェーズ変更を通知
   */
  notifyPhaseChange(previousPhase: GamePhase, newPhase: GamePhase): void {
    this.notifyStateChange('phase_change', previousPhase, newPhase)
  }

  /**
   * ステータス変更を通知
   */
  notifyStatusChange(previousStatus: GameStatus, newStatus: GameStatus): void {
    this.notifyStateChange('status_change', previousStatus, newStatus)
  }

  /**
   * ステージ変更を通知
   */
  notifyStageChange(previousStage: GameStage, newStage: GameStage): void {
    this.notifyStateChange('stage_change', previousStage, newStage)
  }

  /**
   * ターン変更を通知
   */
  notifyTurnChange(previousTurn: number, newTurn: number): void {
    this.notifyStateChange('turn_change', previousTurn, newTurn)
  }

  /**
   * 状態変更履歴を取得
   */
  getHistory(): GameStateHistory {
    return { ...this.history }
  }

  /**
   * 特定タイプのイベント履歴のみを取得
   */
  getHistoryByType(type: GameStateChangeEvent['type']): GameStateChangeEvent[] {
    return this.history.events.filter(event => event.type === type)
  }

  /**
   * 履歴をクリア
   */
  clearHistory(): void {
    this.history.events = []
  }

  /**
   * 履歴に追加（上限管理付き）
   */
  private addToHistory(event: GameStateChangeEvent): void {
    this.history.events.push(event)
    
    // 上限を超えた場合は古いイベントを削除
    if (this.history.events.length > this.history.maxEvents) {
      this.history.events.shift()
    }
  }

  /**
   * 全リスナーを解除
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * 特定タイプのリスナーを解除
   */
  removeListenersForType(eventType: GameStateChangeEvent['type']): void {
    this.listeners.delete(eventType)
  }
}