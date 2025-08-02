/**
 * Test Utilities for UI Destruction Testing
 * 
 * Provides mock implementations, environment setup, and helper functions
 * for comprehensive UI component destructive testing.
 */

import { vi } from 'vitest'
import type { ComponentPublicInstance } from 'vue'

// Performance monitoring utilities
export interface PerformanceMetrics {
  renderTime: number
  memoryUsage: number
  domNodes: number
  eventListeners: number
}

export class PerformanceMonitor {
  private startTime: number = 0
  private startMemory: number = 0

  start() {
    this.startTime = performance.now()
    this.startMemory = performance.memory?.usedJSHeapSize || 0
  }

  measure(): PerformanceMetrics {
    const renderTime = performance.now() - this.startTime
    const memoryUsage = (performance.memory?.usedJSHeapSize || 0) - this.startMemory
    const domNodes = document.querySelectorAll('*').length
    
    // Estimate event listeners (not directly measurable)
    const eventListeners = this.estimateEventListeners()

    return {
      renderTime,
      memoryUsage,
      domNodes,
      eventListeners
    }
  }

  private estimateEventListeners(): number {
    // Rough estimation based on DOM elements and common patterns
    const interactiveElements = document.querySelectorAll(
      'button, input, select, textarea, [onclick], [onmouseover], [onkeydown]'
    ).length
    return interactiveElements * 2 // Estimate 2 listeners per interactive element
  }
}

// Mock GameManager for testing GameCanvas
export class MockGameManager {
  private isInitialized = false
  private isDestroyed = false
  private shouldFailInit = false
  private shouldTimeout = false

  constructor(options: { failInit?: boolean, timeout?: boolean } = {}) {
    this.shouldFailInit = options.failInit || false
    this.shouldTimeout = options.timeout || false
  }

  async initialize(container: HTMLElement): Promise<void> {
    if (this.shouldTimeout) {
      return new Promise(() => {}) // Never resolves
    }

    if (this.shouldFailInit) {
      throw new Error('GameManager initialization failed')
    }

    // Simulate async initialization
    await new Promise(resolve => setTimeout(resolve, 10))
    this.isInitialized = true
  }

  destroy() {
    this.isDestroyed = true
    this.isInitialized = false
  }

  reset() {
    // Mock reset functionality
  }

  switchScene(sceneName: string, options?: any) {
    if (!this.isInitialized) {
      throw new Error('GameManager not initialized')
    }
    // Mock scene switching
  }

  clearCache() {
    // Mock cache clearing
  }

  static getInstance(): MockGameManager {
    return new MockGameManager()
  }
}

// Mock TouchGestureManager for testing swipe components
export class MockTouchGestureManager {
  private eventHandlers: Map<string, Function[]> = new Map()
  private isDestroyed = false

  constructor(element: HTMLElement, options?: any) {
    // Mock initialization
  }

  on(eventType: string, handler: Function) {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, [])
    }
    this.eventHandlers.get(eventType)!.push(handler)
  }

  off(eventType: string, handler: Function) {
    const handlers = this.eventHandlers.get(eventType)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  emit(eventType: string, detail: any) {
    const handlers = this.eventHandlers.get(eventType) || []
    const mockEvent = {
      type: eventType,
      detail,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    }

    handlers.forEach(handler => {
      try {
        handler(mockEvent)
      } catch (error) {
        console.error('Error in mock gesture handler:', error)
      }
    })
  }

  destroy() {
    this.isDestroyed = true
    this.eventHandlers.clear()
  }

  // Utility methods for testing
  simulateSwipe(direction: 'left' | 'right' | 'up' | 'down', distance: number = 100) {
    const directions = {
      left: { x: -distance, y: 0 },
      right: { x: distance, y: 0 },
      up: { x: 0, y: -distance },
      down: { x: 0, y: distance }
    }

    const delta = directions[direction]
    
    this.emit('swipe', {
      direction,
      deltaX: delta.x,
      deltaY: delta.y,
      distance,
      velocity: distance / 100 // Mock velocity
    })
  }

  simulateDrag(totalX: number, totalY: number) {
    this.emit('drag', {
      totalX,
      totalY,
      deltaX: totalX / 10,
      deltaY: totalY / 10
    })
  }

  simulateDragEnd(totalX: number, totalY: number) {
    this.emit('dragend', {
      totalX,
      totalY,
      velocity: Math.sqrt(totalX * totalX + totalY * totalY) / 100
    })
  }
}

// Browser API Mocker for simulating various browser states
export class BrowserAPIMocker {
  private originalAPIs: Map<string, any> = new Map()

  mockWebGLContextLoss() {
    const originalGetContext = HTMLCanvasElement.prototype.getContext
    this.originalAPIs.set('canvas.getContext', originalGetContext)
    
    HTMLCanvasElement.prototype.getContext = function(contextType: string) {
      if (contextType === 'webgl' || contextType === 'webgl2') {
        return null // Simulate WebGL context loss
      }
      return originalGetContext.call(this, contextType)
    }
  }

  mockLocalStorageFailure() {
    const originalLocalStorage = window.localStorage
    this.originalAPIs.set('localStorage', originalLocalStorage)
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => { throw new Error('LocalStorage quota exceeded') }),
        setItem: vi.fn(() => { throw new Error('LocalStorage quota exceeded') }),
        removeItem: vi.fn(() => { throw new Error('LocalStorage quota exceeded') }),
        clear: vi.fn(() => { throw new Error('LocalStorage quota exceeded') }),
        length: 0,
        key: vi.fn()
      },
      writable: true,
      configurable: true
    })
  }

  mockNetworkFailure() {
    const originalFetch = global.fetch
    this.originalAPIs.set('fetch', originalFetch)
    
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
  }

  mockRAFFailure() {
    const originalRAF = window.requestAnimationFrame
    this.originalAPIs.set('requestAnimationFrame', originalRAF)
    
    Object.defineProperty(window, 'requestAnimationFrame', {
      value: vi.fn(() => { throw new Error('RAF not available') }),
      writable: true,
      configurable: true
    })
  }

  mockResizeObserverFailure() {
    const originalResizeObserver = global.ResizeObserver
    this.originalAPIs.set('ResizeObserver', originalResizeObserver)
    
    global.ResizeObserver = class MockResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        // Immediately throw to simulate failure
        setTimeout(() => {
          throw new Error('ResizeObserver failed')
        }, 0)
      }
      observe() { throw new Error('ResizeObserver observe failed') }
      unobserve() { throw new Error('ResizeObserver unobserve failed') }
      disconnect() { throw new Error('ResizeObserver disconnect failed') }
    }
  }

  mockIntersectionObserverFailure() {
    const originalIntersectionObserver = global.IntersectionObserver
    this.originalAPIs.set('IntersectionObserver', originalIntersectionObserver)
    
    global.IntersectionObserver = class MockIntersectionObserver {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        throw new Error('IntersectionObserver not supported')
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      get root() { return null }
      get rootMargin() { return '' }
      get thresholds() { return [] }
    }
  }

  restoreAll() {
    this.originalAPIs.forEach((originalAPI, key) => {
      switch (key) {
        case 'canvas.getContext':
          HTMLCanvasElement.prototype.getContext = originalAPI
          break
        case 'localStorage':
          Object.defineProperty(window, 'localStorage', { value: originalAPI })
          break
        case 'fetch':
          global.fetch = originalAPI
          break
        case 'requestAnimationFrame':
          Object.defineProperty(window, 'requestAnimationFrame', { value: originalAPI })
          break
        case 'ResizeObserver':
          global.ResizeObserver = originalAPI
          break
        case 'IntersectionObserver':
          global.IntersectionObserver = originalAPI
          break
      }
    })
    this.originalAPIs.clear()
  }
}

// Viewport manipulation utilities
export class ViewportManager {
  private originalDimensions: { width: number, height: number }

  constructor() {
    this.originalDimensions = {
      width: window.innerWidth,
      height: window.innerHeight
    }
  }

  setSize(width: number, height: number) {
    Object.defineProperty(window, 'innerWidth', { value: width, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: height, writable: true, configurable: true })
    
    // Trigger resize event
    window.dispatchEvent(new Event('resize'))
  }

  setOrientation(orientation: 'portrait' | 'landscape') {
    if (orientation === 'portrait') {
      this.setSize(768, 1024)
    } else {
      this.setSize(1024, 768)
    }
    
    // Mock orientation change
    Object.defineProperty(screen, 'orientation', {
      value: { angle: orientation === 'portrait' ? 0 : 90 },
      writable: true,
      configurable: true
    })
    
    window.dispatchEvent(new Event('orientationchange'))
  }

  simulateExtremeSizes() {
    const extremeSizes = [
      { width: 1, height: 1 },           // Minimum
      { width: 7680, height: 4320 },     // 8K
      { width: 320, height: 568 },       // iPhone 5
      { width: 1920, height: 1080 },     // Full HD
      { width: 2560, height: 1440 },     // QHD
      { width: 3840, height: 2160 }      // 4K
    ]

    return extremeSizes
  }

  restore() {
    this.setSize(this.originalDimensions.width, this.originalDimensions.height)
  }
}

// Memory pressure simulation
export class MemoryPressureSimulator {
  private memoryHogs: any[] = []

  createMemoryPressure(sizeInMB: number = 100) {
    // Create large objects to simulate memory pressure
    const arraySize = (sizeInMB * 1024 * 1024) / 8 // 8 bytes per number
    const memoryHog = new Array(arraySize).fill(Math.random())
    this.memoryHogs.push(memoryHog)
  }

  createFragmentedMemory() {
    // Create many small objects to fragment memory
    for (let i = 0; i < 10000; i++) {
      this.memoryHogs.push({
        id: i,
        data: new Array(Math.floor(Math.random() * 1000)).fill(i),
        timestamp: Date.now(),
        random: Math.random()
      })
    }
  }

  releaseMemory() {
    this.memoryHogs.length = 0
    if (global.gc) {
      global.gc()
    }
  }
}

// Event simulation utilities
export class EventSimulator {
  static simulateRapidClicks(element: Element, count: number = 100, interval: number = 1) {
    return new Promise<void>((resolve) => {
      let clickCount = 0
      
      const performClicks = () => {
        if (clickCount >= count) {
          resolve()
          return
        }
        
        // Create a simple click event
        const event = new Event('click', { bubbles: true, cancelable: true })
        element.dispatchEvent(event)
        clickCount++
        
        if (clickCount < count) {
          setTimeout(performClicks, interval)
        } else {
          resolve()
        }
      }
      
      performClicks()
    })
  }

  static simulateKeyboardSpam(element: Element, keys: string[], count: number = 100) {
    return new Promise<void>((resolve) => {
      let keyCount = 0
      
      const performKeyPresses = () => {
        if (keyCount >= count) {
          resolve()
          return
        }
        
        const key = keys[keyCount % keys.length]
        
        // Create keyboard events
        const keydownEvent = new Event('keydown', { bubbles: true, cancelable: true })
        const keyupEvent = new Event('keyup', { bubbles: true, cancelable: true })
        
        element.dispatchEvent(keydownEvent)
        element.dispatchEvent(keyupEvent)
        
        keyCount++
        
        if (keyCount < count) {
          setTimeout(performKeyPresses, 1)
        } else {
          resolve()
        }
      }
      
      performKeyPresses()
    })
  }

  static simulateMouseMoves(element: Element, count: number = 1000) {
    return new Promise<void>((resolve) => {
      let moveCount = 0
      
      const performMouseMoves = () => {
        if (moveCount >= count) {
          resolve()
          return
        }
        
        // Create a simple mouse move event
        const event = new Event('mousemove', { bubbles: true, cancelable: true })
        element.dispatchEvent(event)
        moveCount++
        
        if (moveCount < count) {
          setTimeout(performMouseMoves, 1)
        } else {
          resolve()
        }
      }
      
      performMouseMoves()
    })
  }
}

// Main test environment setup
export function createTestEnvironment() {
  const performanceMonitor = new PerformanceMonitor()
  const browserMocker = new BrowserAPIMocker()
  const viewportManager = new ViewportManager()
  const memorySimulator = new MemoryPressureSimulator()

  // Setup global test environment
  performanceMonitor.start()

  return {
    performanceMonitor,
    browserMocker,
    viewportManager,
    memorySimulator,
    eventSimulator: EventSimulator,
    
    cleanup() {
      browserMocker.restoreAll()
      viewportManager.restore()
      memorySimulator.releaseMemory()
    },

    measurePerformance() {
      return performanceMonitor.measure()
    }
  }
}

// Device simulation utilities
export function mockDeviceInfo(deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop') {
  const deviceConfigs = {
    mobile: {
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      performanceLevel: 'low' as const,
      supportsTouch: true,
      supportsWakeLock: true,
      maxTextureSize: 2048,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    },
    tablet: {
      isMobile: false,
      isTablet: true,
      isDesktop: false,
      performanceLevel: 'medium' as const,
      supportsTouch: true,
      supportsWakeLock: true,
      maxTextureSize: 4096,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15'
    },
    desktop: {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      performanceLevel: 'high' as const,
      supportsTouch: false,
      supportsWakeLock: false,
      maxTextureSize: 8192,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }

  return deviceConfigs[deviceType]
}

// Error injection utilities
export class ErrorInjector {
  static injectRandomErrors(component: ComponentPublicInstance, probability: number = 0.1) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(component))
      .filter(name => typeof (component as any)[name] === 'function')

    methods.forEach(methodName => {
      const originalMethod = (component as any)[methodName]
      
      if (typeof originalMethod === 'function') {
        (component as any)[methodName] = function(...args: any[]) {
          if (Math.random() < probability) {
            throw new Error(`Injected error in ${methodName}`)
          }
          return originalMethod.apply(this, args)
        }
      }
    })
  }

  static injectAsyncErrors(component: ComponentPublicInstance, probability: number = 0.1) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(component))
      .filter(name => typeof (component as any)[name] === 'function')

    methods.forEach(methodName => {
      const originalMethod = (component as any)[methodName]
      
      if (typeof originalMethod === 'function') {
        (component as any)[methodName] = async function(...args: any[]) {
          if (Math.random() < probability) {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
            throw new Error(`Async injected error in ${methodName}`)
          }
          return originalMethod.apply(this, args)
        }
      }
    })
  }
}