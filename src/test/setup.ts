import '@testing-library/jest-dom'
import { expect, vi } from 'vitest'

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

      getRandomPoint(point?: any): any {
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
      GetValue: (obj: any, key: string, defaultValue?: any) => {
        return obj?.[key] ?? defaultValue
      }
    }
  }
}

// PhaserをグローバルにモックとしてInjection
;(globalThis as any).Phaser = mockPhaser

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
  if (!(globalThis as any).performance) {
    ;(globalThis as any).performance = {}
  }

  if (!(globalThis as any).performance.memory) {
    ;(globalThis as any).performance.memory = {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  }

  // performance.now をモック
  if (!(globalThis as any).performance.now) {
    let mockTime = 0
    ;(globalThis as any).performance.now = vi.fn(() => {
      mockTime += 16.67 // Simulate 60fps
      return mockTime
    })
  }

  // window オブジェクトをモック
  if (!(globalThis as any).window) {
    ;(globalThis as any).window = {
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1
    }
  }

  // requestAnimationFrame をモック
  ;(globalThis as any).requestAnimationFrame = vi.fn((callback) => {
    setTimeout(callback, 16.67)
    return 1
  })

  ;(globalThis as any).cancelAnimationFrame = vi.fn()
}