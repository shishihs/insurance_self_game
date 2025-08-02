/**
 * イベントリスナーのクリーンアップを管理するクラス
 * メモリリークを防ぐため、すべてのイベントリスナーを追跡し、適切に削除する
 */
export class EventCleanupManager {
  private readonly eventListeners: Map<string, {
    target: EventTarget
    type: string
    listener: EventListener
    options?: AddEventListenerOptions
  }[]> = new Map()
  
  private readonly phaserListeners: Map<string, {
    emitter: Phaser.Events.EventEmitter
    event: string | symbol
    fn: Function
    context?: any
  }[]> = new Map()
  
  /**
   * DOMイベントリスナーを追加（自動追跡）
   */
  addEventListener(
    id: string,
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): void {
    // リスナーを追加
    target.addEventListener(type, listener, options)
    
    // 追跡リストに追加
    if (!this.eventListeners.has(id)) {
      this.eventListeners.set(id, [])
    }
    
    this.eventListeners.get(id)!.push({
      target,
      type,
      listener,
      options
    })
  }
  
  /**
   * Phaserイベントリスナーを追加（自動追跡）
   */
  addPhaserListener(
    id: string,
    emitter: Phaser.Events.EventEmitter,
    event: string | symbol,
    fn: Function,
    context?: any
  ): void {
    // リスナーを追加
    emitter.on(event, fn, context)
    
    // 追跡リストに追加
    if (!this.phaserListeners.has(id)) {
      this.phaserListeners.set(id, [])
    }
    
    this.phaserListeners.get(id)!.push({
      emitter,
      event,
      fn,
      context
    })
  }
  
  /**
   * 特定のIDに関連するすべてのイベントリスナーを削除
   */
  removeAllListeners(id: string): void {
    // DOMイベントリスナーの削除
    const domListeners = this.eventListeners.get(id)
    if (domListeners) {
      domListeners.forEach(({ target, type, listener, options }) => {
        try {
          target.removeEventListener(type, listener, options)
        } catch (e) {
          console.warn(`Failed to remove DOM listener: ${e}`)
        }
      })
      this.eventListeners.delete(id)
    }
    
    // Phaserイベントリスナーの削除
    const phaserListeners = this.phaserListeners.get(id)
    if (phaserListeners) {
      phaserListeners.forEach(({ emitter, event, fn, context }) => {
        try {
          emitter.off(event, fn, context)
        } catch (e) {
          console.warn(`Failed to remove Phaser listener: ${e}`)
        }
      })
      this.phaserListeners.delete(id)
    }
  }
  
  /**
   * すべてのイベントリスナーを削除
   */
  removeAll(): void {
    // すべてのIDのリスナーを削除
    const allIds = [
      ...Array.from(this.eventListeners.keys()),
      ...Array.from(this.phaserListeners.keys())
    ]
    
    allIds.forEach(id => {
      this.removeAllListeners(id)
    })
  }
  
  /**
   * メモリ使用状況のレポート
   */
  getMemoryReport(): {
    domListenerCount: number
    phaserListenerCount: number
    ids: string[]
  } {
    let domCount = 0
    let phaserCount = 0
    
    this.eventListeners.forEach(listeners => {
      domCount += listeners.length
    })
    
    this.phaserListeners.forEach(listeners => {
      phaserCount += listeners.length
    })
    
    return {
      domListenerCount: domCount,
      phaserListenerCount: phaserCount,
      ids: [
        ...Array.from(this.eventListeners.keys()),
        ...Array.from(this.phaserListeners.keys())
      ]
    }
  }
  
  /**
   * デバッグ用: アクティブなリスナーをコンソールに出力
   */
  debugPrint(): void {
    const report = this.getMemoryReport()
    console.group('Event Cleanup Manager Report')
    console.log(`DOM Listeners: ${report.domListenerCount}`)
    console.log(`Phaser Listeners: ${report.phaserListenerCount}`)
    console.log(`Active IDs: ${report.ids.join(', ')}`)
    console.groupEnd()
  }
}