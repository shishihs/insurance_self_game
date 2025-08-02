import '@testing-library/jest-dom'
import { expect, vi } from 'vitest'
import { ProcessEventCleanup } from './processEventCleanup'

// Fix EventEmitter memory leak warning by increasing max listeners for tests
if (typeof process !== 'undefined' && process.setMaxListeners) {
  process.setMaxListeners(100) // Increase significantly to handle parallel test execution
}

// Initialize process event cleanup system
ProcessEventCleanup.initialize()

// Mock console methods to reduce test noise
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

// Only show console output during tests if explicitly needed
const isVerboseMode = process.env.VITEST_VERBOSE === 'true'

if (!isVerboseMode) {
  console.log = vi.fn()
  console.error = vi.fn()
  console.warn = vi.fn()
}

// phaser3spectorjs モジュールをモック（すべてのテストファイルで利用可能）
vi.doMock('phaser3spectorjs', () => ({
  default: {
    enable: vi.fn(),
    disable: vi.fn(),
    createTexture: vi.fn(),
    WebGLDebugRenderer: vi.fn()
  }
}))

// グローバルなテスト設定
expect.extend({
  // カスタムマッチャーをここに追加可能
})

// Phaserのグローバルモック
const mockPhaser = {
  Geom: {
    Rectangle: class MockRectangle {
      x: number
      y: number
      width: number
      height: number

      constructor(x: number = 0, y: number = 0, width: number = 0, height: number = 0) {
        this.x = x
        this.y = y
        this.width = width
        this.height = height
      }

      contains(x: number, y: number): boolean {
        return x >= this.x && x <= this.x + this.width &&
               y >= this.y && y <= this.y + this.height
      }

      getCenterX(): number {
        return this.x + this.width / 2
      }

      getCenterY(): number {
        return this.y + this.height / 2
      }

      getRandomPoint(_point?: unknown): { x: number; y: number } {
        return {
          x: this.x + Math.random() * this.width,
          y: this.y + Math.random() * this.height
        }
      }
    }
  },
  Math: {
    Distance: {
      Between: (x1: number, y1: number, x2: number, y2: number): number => {
        return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
      }
    }
  },
  Utils: {
    Objects: {
      GetValue: (obj: Record<string, unknown>, key: string, defaultValue?: unknown) => {
        return obj?.[key] ?? defaultValue
      }
    }
  }
}

// PhaserをグローバルにモックとしてInjection
;(globalThis as typeof globalThis & { Phaser: typeof mockPhaser }).Phaser = mockPhaser

// PerformanceObserverのグローバルモック
if (typeof globalThis.PerformanceObserver === 'undefined') {
  class MockPerformanceObserver {
    callback: (list: any) => void
    
    constructor(callback: (list: any) => void) {
      this.callback = callback
    }
    
    observe(options?: any) {
      // テスト用の空実装
    }
    
    disconnect() {
      // テスト用の空実装
    }
    
    takeRecords() {
      return []
    }
  }
  
  ;(globalThis as any).PerformanceObserver = MockPerformanceObserver
}

// requestIdleCallbackのグローバルモック
if (typeof globalThis.requestIdleCallback === 'undefined') {
  ;(globalThis as any).requestIdleCallback = (callback: IdleRequestCallback, options?: IdleRequestOptions) => {
    const deadline: IdleDeadline = {
      didTimeout: false,
      timeRemaining: () => 50
    }
    setTimeout(() => callback(deadline), options?.timeout || 1)
    return Math.random()
  }
  
  ;(globalThis as any).cancelIdleCallback = (handle: number) => {
    // テスト用の空実装
  }
}

// PhaserLoaderの完全なモック化（テスト環境で実際のPhaserを読み込まないようにする）
vi.doMock('@/game/loaders/PhaserLoader', () => ({
  loadPhaser: vi.fn().mockResolvedValue({
    Game: vi.fn().mockImplementation(() => ({
      scale: {
        refresh: vi.fn(),
        removeAllListeners: vi.fn(),
        resize: vi.fn(),
        gameSize: { width: 800, height: 600 },
        displaySize: { width: 800, height: 600 },
        parentSize: { width: 800, height: 600 },
        setGameSize: vi.fn(),
        setDisplaySize: vi.fn(),
        setParentSize: vi.fn(),
        setZoom: vi.fn(),
        setMode: vi.fn()
      },
      destroy: vi.fn(),
      scene: {
        getScenes: vi.fn(() => [])
      },
      sound: {
        pauseAll: vi.fn(),
        resumeAll: vi.fn(),
        stopAll: vi.fn(),
        mute: vi.fn(),
        unmute: vi.fn()
      },
      loop: {
        sleep: vi.fn(),
        wake: vi.fn()
      }
    })),
    Scene: class MockScene {
      constructor(config: { key: string }) {
        this.scene = { key: config.key }
      }
      scene: { key: string }
      cameras = { main: { width: 800, height: 600, setBackgroundColor: vi.fn() } }
      add = { text: vi.fn(() => ({ setOrigin: vi.fn() })) }
    },
    AUTO: 1,
    Scale: { 
      FIT: 1, 
      CENTER_BOTH: 1,
      RESIZE: 2,
      SHOW_ALL: 3
    },
    Input: {
      Events: {
        POINTER_DOWN: 'pointerdown',
        POINTER_UP: 'pointerup',
        POINTER_MOVE: 'pointermove'
      }
    },
    ...mockPhaser
  }),
  clearPhaserCache: vi.fn(),
  isPhaserLoaded: vi.fn(() => true),
  getPhaser: vi.fn(() => mockPhaser)
}))

// gameConfigも安全にモック
vi.doMock('@/game/config/gameConfig', () => ({
  createGameConfig: vi.fn().mockResolvedValue({
    type: 1, // Phaser.AUTO
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scene: [],
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scale: {
      mode: 1, // Phaser.Scale.FIT
      autoCenter: 1 // Phaser.Scale.CENTER_BOTH
    }
  })
}))

// HTMLCanvasElementのgetContextをモック
if (typeof HTMLCanvasElement !== 'undefined') {
  const mockWebGLContext = {
    getParameter: vi.fn(() => 'WebGL Mock'),
    getExtension: vi.fn(() => null),
    createShader: vi.fn(() => ({})),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    useProgram: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    getProgramParameter: vi.fn(() => true)
  }

  HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return mockWebGLContext
    }
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(4),
        width: 1,
        height: 1
      })),
      putImageData: vi.fn(),
      drawImage: vi.fn()
    }
  })
}

// performance.memory をモック (メモリテスト用)
if (typeof globalThis !== 'undefined') {
  if (!(globalThis as typeof globalThis & { performance?: Performance }).performance) {
    ;(globalThis as typeof globalThis & { performance: Partial<Performance> }).performance = {}
  }

  if (!(globalThis as typeof globalThis & { performance: { memory?: unknown } }).performance.memory) {
    ;(globalThis as typeof globalThis & { performance: { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } } }).performance.memory = {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }

  // performance.now をモック
  const originalPerformanceNow = performance.now
  ;(globalThis as typeof globalThis & { performance: { now: () => number } }).performance.now = vi.fn(() => {
    // フェイクタイマーが有効な場合は Date.now() と同期
    try {
      if (vi.isFakeTimers()) {
        return Date.now()
      }
    } catch {
      // フェイクタイマーチェックでエラーが出る場合は無視
    }
    // フェイクタイマーが無効な場合は元の関数を使用
    return originalPerformanceNow.call(performance)
  })

  // window オブジェクトをモック
  if (!(globalThis as typeof globalThis & { window?: Window }).window) {
    ;(globalThis as typeof globalThis & { window: { innerWidth: number; innerHeight: number; devicePixelRatio: number } }).window = {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1
    }
  }

  // requestAnimationFrame をモック
  ;(globalThis as typeof globalThis & { requestAnimationFrame: (callback: FrameRequestCallback) => number }).requestAnimationFrame = vi.fn((callback) => {
    setTimeout(callback, 16.67)
    return 1
  })

  ;(globalThis as typeof globalThis & { cancelAnimationFrame: (handle: number) => void }).cancelAnimationFrame = vi.fn()
}

// Test cleanup utilities
export const testCleanup = {
  // Reset console methods if needed
  restoreConsole: () => {
    if (!isVerboseMode) {
      console.log = originalConsoleLog
      console.error = originalConsoleError
      console.warn = originalConsoleWarn
    }
  },
  
  // Clean up any remaining timers
  clearAllTimers: () => {
    vi.clearAllTimers()
  },

  // Clean up process event listeners
  cleanupProcessListeners: () => {
    ProcessEventCleanup.cleanup()
  },

  // Check for potential memory leaks
  checkMemoryLeaks: () => {
    const { warning, counts } = ProcessEventCleanup.checkListenerLimits()
    if (warning) {
      console.warn('⚠️ Approaching process event listener limits:', counts)
    }
    return { warning, counts }
  },

  // Full cleanup
  fullCleanup: () => {
    testCleanup.clearAllTimers()
    testCleanup.cleanupProcessListeners()
    testCleanup.restoreConsole()
  }
}

// Global test hooks for better cleanup
if (typeof globalThis !== 'undefined') {
  // Suppress unhandled promise rejections during tests
  const originalUnhandledRejection = process.listenerCount('unhandledRejection')
  
  // Add a test-specific unhandled rejection handler that doesn't crash
  process.on('unhandledRejection', (reason, promise) => {
    // Only log if it's not already handled by other listeners
    if (originalUnhandledRejection === 0) {
      console.warn('Unhandled Rejection in test:', reason)
    }
  })
}