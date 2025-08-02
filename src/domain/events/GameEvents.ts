/**
 * ゲームイベント管理
 * 
 * Observer Patternを使用したイベント駆動アーキテクチャ
 */

// イベント型定義
export interface GameEvent {
  type: string
  timestamp: Date
  data?: any
}

export interface GameEventListener {
  handle(event: GameEvent): void
}

// 具体的なイベント型
export class StageChangedEvent implements GameEvent {
  type = 'stage_changed'
  timestamp = new Date()
  
  constructor(
    public data: {
      oldStage: string
      newStage: string
      turn: number
    }
  ) {}
}

export class ChallengeResolvedEvent implements GameEvent {
  type = 'challenge_resolved'
  timestamp = new Date()
  
  constructor(
    public data: {
      challengeName: string
      success: boolean
      vitalityChange: number
    }
  ) {}
}

export class InsuranceExpiredEvent implements GameEvent {
  type = 'insurance_expired'
  timestamp = new Date()
  
  constructor(
    public data: {
      expiredCards: any[]
      message: string
    }
  ) {}
}

/**
 * イベントバス - Observer Pattern実装
 */
export class GameEventBus {
  private static instance: GameEventBus
  private readonly listeners: Map<string, GameEventListener[]> = new Map()

  private constructor() {}

  static getInstance(): GameEventBus {
    if (!GameEventBus.instance) {
      GameEventBus.instance = new GameEventBus()
    }
    return GameEventBus.instance
  }

  /**
   * イベントリスナーを登録
   */
  subscribe(eventType: string, listener: GameEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    this.listeners.get(eventType)!.push(listener)
  }

  /**
   * イベントリスナーを削除
   */
  unsubscribe(eventType: string, listener: GameEventListener): void {
    const listeners = this.listeners.get(eventType)
    if (listeners) {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
  }

  /**
   * イベントを発行
   */
  publish(event: GameEvent): void {
    const listeners = this.listeners.get(event.type)
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener.handle(event)
        } catch (error) {
          console.error(`Error handling event ${event.type}:`, error)
        }
      })
    }
  }
}