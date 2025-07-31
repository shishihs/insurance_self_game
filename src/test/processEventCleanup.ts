/**
 * Process Event Listener Cleanup Utility
 * 
 * This utility helps manage process event listeners during tests to prevent
 * the "MaxListenersExceededWarning" memory leak warnings.
 */

export class ProcessEventCleanup {
  private static originalListeners = new Map<string, Function[]>()
  private static isInitialized = false

  /**
   * Initialize the cleanup system - should be called once during test setup
   */
  static initialize(): void {
    if (this.isInitialized || typeof process === 'undefined') {
      return
    }

    // Store original listeners for cleanup
    const eventNames = ['exit', 'SIGINT', 'SIGTERM', 'uncaughtException', 'unhandledRejection']
    
    eventNames.forEach(eventName => {
      const listeners = process.listeners(eventName) as Function[]
      this.originalListeners.set(eventName, [...listeners])
    })

    this.isInitialized = true
  }

  /**
   * Add a process event listener with automatic cleanup tracking
   */
  static addListener(event: string, listener: Function): void {
    if (typeof process === 'undefined') return

    process.on(event as any, listener as any)
  }

  /**
   * Remove all test-added listeners while preserving original ones
   */
  static cleanup(): void {
    if (!this.isInitialized || typeof process === 'undefined') {
      return
    }

    // Remove all listeners and restore originals
    this.originalListeners.forEach((originalListeners, eventName) => {
      process.removeAllListeners(eventName as any)
      
      // Restore original listeners
      originalListeners.forEach(listener => {
        process.on(eventName as any, listener as any)
      })
    })
  }

  /**
   * Get current listener count for debugging
   */
  static getListenerCount(event?: string): number | Record<string, number> {
    if (typeof process === 'undefined') {
      return event ? 0 : {}
    }

    if (event) {
      return process.listenerCount(event)
    }

    // Return counts for all tracked events
    const counts: Record<string, number> = {}
    this.originalListeners.forEach((_, eventName) => {
      counts[eventName] = process.listenerCount(eventName)
    })
    return counts
  }

  /**
   * Check if we're approaching the listener limit
   */
  static checkListenerLimits(): { warning: boolean; counts: Record<string, number> } {
    const counts = this.getListenerCount() as Record<string, number>
    const maxListeners = process.getMaxListeners()
    const warning = Object.values(counts).some(count => count >= maxListeners * 0.8)

    return { warning, counts }
  }
}

// Auto-initialize when imported in test environment
if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
  ProcessEventCleanup.initialize()
}