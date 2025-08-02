/**
 * Browser Compatibility & WebGL Startup Failure Tests - Paranoid Edition
 * 
 * This test suite covers every browser compatibility nightmare scenario.
 * We simulate ancient browsers, mobile quirks, and hardware limitations.
 * 
 * Browser Compatibility Failure Categories:
 * 1. WebGL Support and Context Issues
 * 2. Canvas API Limitations and Restrictions
 * 3. JavaScript Engine Compatibility
 * 4. Mobile Browser Quirks and Limitations
 * 5. Security Restrictions and Sandboxing
 * 6. Hardware Acceleration Issues
 * 7. Memory and Performance Constraints
 * 8. Vendor-Specific Browser Bugs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameManager } from '@/game/GameManager'
import { loadPhaser, clearPhaserCache } from '@/game/loaders/PhaserLoader'

// Browser capability simulation utilities
type BrowserProfile = {
  name: string
  userAgent: string
  webglSupport: boolean
  canvasSupport: boolean
  es6Support: boolean
  touchSupport: boolean
  webAudioSupport: boolean
  localStorageSupport: boolean
  requestAnimationFrameSupport: boolean
  performanceApiSupport: boolean
  restrictions: string[]
  quirks: string[]
}

const browserProfiles: Record<string, BrowserProfile> = {
  ie11: {
    name: 'Internet Explorer 11',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    webglSupport: false,
    canvasSupport: true,
    es6Support: false,
    touchSupport: false,
    webAudioSupport: false,
    localStorageSupport: true,
    requestAnimationFrameSupport: false,
    performanceApiSupport: false,
    restrictions: ['no-webgl', 'no-es6', 'no-modules'],
    quirks: ['canvas-text-baseline-bug', 'memory-leaks']
  },
  oldAndroid: {
    name: 'Android 4.4 Stock Browser',
    userAgent: 'Mozilla/5.0 (Linux; Android 4.4.2; SM-G900P Build/KOT49H) AppleWebKit/537.36',
    webglSupport: false,
    canvasSupport: true,
    es6Support: false,
    touchSupport: true,
    webAudioSupport: false,
    localStorageSupport: true,
    requestAnimationFrameSupport: true,
    performanceApiSupport: false,
    restrictions: ['no-webgl', 'canvas-size-limit', 'memory-limit'],
    quirks: ['touch-event-bugs', 'viewport-bugs', 'canvas-memory-issues']
  },
  oldIOS: {
    name: 'iOS 9 Safari',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_0 like Mac OS X) AppleWebKit/601.1.46',
    webglSupport: true,
    canvasSupport: true,
    es6Support: false,
    touchSupport: true,
    webAudioSupport: false, // Requires user interaction
    localStorageSupport: true,
    requestAnimationFrameSupport: true,
    performanceApiSupport: false,
    restrictions: ['audio-requires-gesture', 'canvas-size-limit', 'memory-limit'],
    quirks: ['iframe-issues', 'touch-scroll-bugs', 'audio-bugs']
  },
  restrictedWebview: {
    name: 'Restricted WebView',
    userAgent: 'Mozilla/5.0 (Linux; Android 8.0.0; SM-G950F) AppleWebKit/537.36 (WebView)',
    webglSupport: false, // Disabled by app
    canvasSupport: true,
    es6Support: true,
    touchSupport: true,
    webAudioSupport: false,
    localStorageSupport: false, // Disabled by app
    requestAnimationFrameSupport: true,
    performanceApiSupport: false,
    restrictions: ['no-webgl', 'no-storage', 'no-audio', 'sandbox-restrictions'],
    quirks: ['csp-restrictions', 'limited-apis']
  },
  lowMemoryDevice: {
    name: 'Low Memory Device',
    userAgent: 'Mozilla/5.0 (Android 8.0; Mobile; rv:61.0) Gecko/61.0 Firefox/61.0',
    webglSupport: true,
    canvasSupport: true,
    es6Support: true,
    touchSupport: true,
    webAudioSupport: true,
    localStorageSupport: true,
    requestAnimationFrameSupport: true,
    performanceApiSupport: true,
    restrictions: ['memory-limit-64mb', 'canvas-size-limit', 'webgl-context-limit'],
    quirks: ['frequent-gc', 'context-loss', 'oom-crashes']
  }
}

function simulateBrowser(profile: BrowserProfile): void {
  // Set user agent
  Object.defineProperty(navigator, 'userAgent', {
    value: profile.userAgent,
    writable: true
  })
  
  // Mock WebGL support
  const originalGetContext = HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(function(type: string, options?: any) {
    if (type === 'webgl' || type === 'experimental-webgl') {
      if (!profile.webglSupport) {
        return null
      }
      // Return mock WebGL context with limited capabilities
      return {
        getExtension: vi.fn().mockReturnValue(null),
        getParameter: vi.fn().mockImplementation((param) => {
          // Simulate low-end hardware
          if (param === 0x8B4C) return 16 // MAX_VERTEX_ATTRIBS
          if (param === 0x8872) return 8  // MAX_COMBINED_TEXTURE_IMAGE_UNITS
          return 0
        }),
        createShader: vi.fn().mockReturnValue({}),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn().mockReturnValue(true),
        createProgram: vi.fn().mockReturnValue({}),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn().mockReturnValue(true),
        useProgram: vi.fn(),
        createBuffer: vi.fn().mockReturnValue({}),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        drawArrays: vi.fn(),
        clear: vi.fn(),
        clearColor: vi.fn(),
        enable: vi.fn(),
        viewport: vi.fn(),
        canvas: { width: 300, height: 150 }
      }
    }
    
    if (type === '2d' && profile.canvasSupport) {
      const mockContext = {
        fillRect: vi.fn(),
        drawImage: vi.fn(),
        getImageData: vi.fn().mockImplementation(() => {
          if (profile.restrictions.includes('canvas-size-limit')) {
            throw new Error('Canvas size exceeds limit')
          }
          return { data: new Uint8ClampedArray(100) }
        }),
        putImageData: vi.fn(),
        createImageData: vi.fn(),
        measureText: vi.fn().mockReturnValue({ width: 100 }),
        save: vi.fn(),
        restore: vi.fn(),
        translate: vi.fn(),
        scale: vi.fn(),
        rotate: vi.fn()
      }
      
      // Add quirks
      if (profile.quirks.includes('canvas-text-baseline-bug')) {
        mockContext.measureText = vi.fn().mockReturnValue({ width: 0 })
      }
      
      return mockContext
    }
    
    return originalGetContext.call(this, type, options)
  })
  
  // Mock other APIs based on support
  if (!profile.requestAnimationFrameSupport) {
    delete (window as any).requestAnimationFrame
  }
  
  if (!profile.performanceApiSupport) {
    delete (window as any).performance
  }
  
  if (!profile.localStorageSupport) {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn().mockImplementation(() => {
          throw new Error('LocalStorage access denied')
        }),
        setItem: vi.fn().mockImplementation(() => {
          throw new Error('LocalStorage access denied')
        })
      },
      writable: true
    })
  }
  
  // Mock touch support
  if (profile.touchSupport) {
    Object.defineProperty(window, 'ontouchstart', { value: {} })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 10 })
  } else {
    delete (window as any).ontouchstart
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 })
  }
  
  // Mock Web Audio API
  if (!profile.webAudioSupport) {
    delete (window as any).AudioContext
    delete (window as any).webkitAudioContext
  }
}

describe.skip('Browser Compatibility & WebGL Startup Failure Tests - Paranoid Edition', () => {
  let gameManager: GameManager
  let capturedErrors: string[]
  let capturedWarnings: string[]
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn
  let originalGetContext: typeof HTMLCanvasElement.prototype.getContext

  beforeEach(() => {
    // Store original methods
    originalGetContext = HTMLCanvasElement.prototype.getContext
    
    // Clear GameManager singleton
    ;(GameManager as any).instance = null
    clearPhaserCache()
    
    // Setup error capture
    capturedErrors = []
    capturedWarnings = []
    originalConsoleError = console.error
    originalConsoleWarn = console.warn
    
    console.error = vi.fn((...args) => {
      capturedErrors.push(args.join(' '))
    })
    
    console.warn = vi.fn((...args) => {
      capturedWarnings.push(args.join(' '))
    })
    
    gameManager = GameManager.getInstance()
  })

  afterEach(() => {
    // Restore original methods
    HTMLCanvasElement.prototype.getContext = originalGetContext
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    
    // Cleanup
    if (gameManager.isInitialized()) {
      gameManager.destroy()
    }
    ;(GameManager as any).instance = null
    
    vi.clearAllMocks()
    clearPhaserCache()
  })

  describe('🚑 WebGL Support and Context Issues', () => {
    it('should handle complete WebGL unavailability', async () => {
      simulateBrowser(browserProfiles.ie11)
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('WebGL is not supported by this browser')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).rejects.toThrow('WebGL is not supported')
      expect(capturedErrors.some(e => e.includes('WebGL'))).toBeTruthy()
    })

    it('should handle WebGL context creation failure', async () => {
      // Mock WebGL context that fails to create
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          return null // Context creation failed
        }
        return originalGetContext.call(this, type)
      })
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Failed to create WebGL context')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).rejects.toThrow('Failed to create WebGL context')
    })

    it('should handle WebGL context loss during initialization', async () => {
      let contextLost = false
      
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          const context = {
            isContextLost: () => contextLost,
            getExtension: vi.fn().mockReturnValue(null),
            // ... other WebGL methods
          }
          
          // Simulate context loss after 100ms
          setTimeout(() => {
            contextLost = true
            const canvas = document.createElement('canvas')
            canvas.dispatchEvent(new Event('webglcontextlost'))
          }, 100)
          
          return context
        }
        return originalGetContext.call(this, type)
      })
      
      const parent = document.createElement('div')
      
      // Should handle context loss gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Wait for context loss event
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(capturedWarnings.some(w => w.includes('context') || w.includes('lost'))).toBeTruthy()
    })

    it('should handle limited WebGL extensions', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          return {
            getExtension: vi.fn().mockReturnValue(null), // No extensions available
            getParameter: vi.fn().mockImplementation((param) => {
              // Very limited capabilities
              if (param === 0x8B4C) return 4  // MAX_VERTEX_ATTRIBS (very low)
              if (param === 0x8872) return 2  // MAX_COMBINED_TEXTURE_IMAGE_UNITS (very low)
              return 0
            }),
            getSupportedExtensions: vi.fn().mockReturnValue([]), // No extensions
            // ... minimal WebGL methods
          }
        }
        return originalGetContext.call(this, type)
      })
      
      const parent = document.createElement('div')
      
      // Should adapt to limited WebGL capabilities
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })

  describe('📋 Canvas API Limitations and Restrictions', () => {
    it('should handle canvas size limitations on mobile', async () => {
      simulateBrowser(browserProfiles.oldAndroid)
      
      // Mock canvas that fails with large sizes
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === '2d') {
          return {
            canvas: { width: 2048, height: 2048 }, // At size limit
            getImageData: vi.fn().mockImplementation((x, y, w, h) => {
              if (w * h > 2048 * 2048) {
                throw new Error('Canvas size exceeds browser limit')
              }
              return { data: new Uint8ClampedArray(w * h * 4) }
            }),
            // ... other methods
          }
        }
        return originalGetContext.call(this, type)
      })
      
      const parent = document.createElement('div')
      
      // Should handle canvas size limits gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle canvas memory limitations', async () => {
      simulateBrowser(browserProfiles.lowMemoryDevice)
      
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === '2d') {
          let allocatedMemory = 0
          const MEMORY_LIMIT = 64 * 1024 * 1024 // 64MB limit
          
          return {
            getImageData: vi.fn().mockImplementation((x, y, w, h) => {
              const size = w * h * 4
              allocatedMemory += size
              
              if (allocatedMemory > MEMORY_LIMIT) {
                throw new Error('Out of memory: Canvas allocation failed')
              }
              
              return { data: new Uint8ClampedArray(size) }
            }),
            createImageData: vi.fn().mockImplementation((w, h) => {
              const size = w * h * 4
              allocatedMemory += size
              
              if (allocatedMemory > MEMORY_LIMIT) {
                throw new Error('Out of memory: ImageData allocation failed')
              }
              
              return { data: new Uint8ClampedArray(size) }
            })
          }
        }
        return originalGetContext.call(this, type)
      })
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      expect(capturedWarnings.some(w => w.includes('memory'))).toBeTruthy()
    })

    it('should handle CSP canvas restrictions', async () => {
      // Mock CSP blocking canvas operations
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => {
        throw new Error('Content Security Policy: canvas creation blocked')
      })
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Cannot create canvas due to CSP restrictions')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).rejects.toThrow('CSP restrictions')
    })
  })

  describe('🧠 JavaScript Engine Compatibility', () => {
    it('should handle ES6 features unavailability', async () => {
      simulateBrowser(browserProfiles.ie11)
      
      // Mock missing ES6 features
      delete (window as any).Promise
      delete (window as any).Map
      delete (window as any).Set
      delete (Array.prototype as any).find
      delete (Array.prototype as any).includes
      
      const parent = document.createElement('div')
      
      // Should provide polyfills or fallbacks
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle missing modern APIs', async () => {
      // Remove modern APIs
      delete (window as any).requestAnimationFrame
      delete (window as any).cancelAnimationFrame
      delete (window as any).performance
      delete (window as any).fetch
      
      const parent = document.createElement('div')
      
      // Should use polyfills or fallbacks
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle strict mode restrictions', async () => {
      // This test ensures the code works in strict mode
      'use strict'
      
      const parent = document.createElement('div')
      
      // Code should not rely on sloppy mode behaviors
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })

  describe('📱 Mobile Browser Quirks and Limitations', () => {
    it('should handle iOS Safari audio restrictions', async () => {
      simulateBrowser(browserProfiles.oldIOS)
      
      // Mock iOS audio context requiring user gesture
      const mockAudioContext = vi.fn().mockImplementation(() => {
        return {
          state: 'suspended',
          resume: vi.fn().mockRejectedValue(
            new Error('AudioContext resume requires user gesture')
          )
        }
      })
      
      ;(window as any).AudioContext = mockAudioContext
      ;(window as any).webkitAudioContext = mockAudioContext
      
      const parent = document.createElement('div')
      
      // Should handle audio restrictions gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      expect(capturedWarnings.some(w => w.includes('audio') || w.includes('gesture'))).toBeTruthy()
    })

    it('should handle Android viewport bugs', async () => {
      simulateBrowser(browserProfiles.oldAndroid)
      
      // Mock Android viewport issues
      Object.defineProperty(window, 'innerWidth', { value: 320, writable: true })
      Object.defineProperty(window, 'innerHeight', { value: 568, writable: true })
      Object.defineProperty(window, 'devicePixelRatio', { value: 2, writable: true })
      Object.defineProperty(screen, 'width', { value: 640, writable: true })
      Object.defineProperty(screen, 'height', { value: 1136, writable: true })
      
      // Inconsistent viewport values (common Android bug)
      Object.defineProperty(document.documentElement, 'clientWidth', { value: 640 })
      Object.defineProperty(document.documentElement, 'clientHeight', { value: 1136 })
      
      const parent = document.createElement('div')
      
      // Should handle viewport inconsistencies
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle touch event inconsistencies', async () => {
      simulateBrowser(browserProfiles.oldAndroid)
      
      // Mock inconsistent touch events
      const mockTouchEvent = {
        touches: [{ clientX: 100, clientY: 100 }],
        changedTouches: [{ clientX: 100, clientY: 100 }],
        preventDefault: vi.fn()
      }
      
      // Simulate touch events without proper support detection
      Object.defineProperty(window, 'ontouchstart', { value: null })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 })
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })

  describe('🔒 Security Restrictions and Sandboxing', () => {
    it('should handle iframe sandbox restrictions', async () => {
      simulateBrowser(browserProfiles.restrictedWebview)
      
      // Mock iframe sandbox environment
      Object.defineProperty(window, 'top', { value: null }) // Indicates iframe
      Object.defineProperty(window, 'parent', { value: window })
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('WebGL not available in sandboxed iframe')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).rejects.toThrow('sandboxed iframe')
    })

    it('should handle WebView API restrictions', async () => {
      simulateBrowser(browserProfiles.restrictedWebview)
      
      // Mock restricted APIs
      delete (window as any).localStorage
      delete (window as any).sessionStorage
      delete (window as any).indexedDB
      
      // Mock geolocation being blocked
      Object.defineProperty(navigator, 'geolocation', {
        value: {
          getCurrentPosition: vi.fn().mockImplementation((success, error) => {
            error({ code: 1, message: 'Permission denied' })
          })
        }
      })
      
      const parent = document.createElement('div')
      
      // Should work without restricted APIs
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })

  describe('🚀 Hardware Acceleration Issues', () => {
    it('should handle hardware acceleration disabled', async () => {
      // Mock software rendering
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          const context = {
            getParameter: vi.fn().mockImplementation((param) => {
              if (param === 0x1F00) return 'Software Renderer' // RENDERER
              return 'Software'
            }),
            // Very limited performance
            drawArrays: vi.fn().mockImplementation(() => {
              // Simulate slow software rendering
              const start = Date.now()
              while (Date.now() - start < 50) {} // Block for 50ms
            })
          }
          return context
        }
        return originalGetContext.call(this, type)
      })
      
      const parent = document.createElement('div')
      
      // Should detect and adapt to software rendering
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      expect(capturedWarnings.some(w => w.includes('software') || w.includes('performance'))).toBeTruthy()
    })

    it('should handle GPU driver issues', async () => {
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          // Simulate unstable GPU driver
          const operations = ['drawArrays', 'drawElements', 'clear']
          const unstableContext: any = {}
          
          operations.forEach(op => {
            unstableContext[op] = vi.fn().mockImplementation(() => {
              if (Math.random() < 0.1) { // 10% chance of driver crash
                throw new Error(`GPU driver error during ${op}`)
              }
            })
          })
          
          return unstableContext
        }
        return originalGetContext.call(this, type)
      })
      
      const parent = document.createElement('div')
      
      // Should handle GPU driver instability
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })

  describe('💻 Browser-Specific Bug Workarounds', () => {
    it('should handle Chrome canvas memory leak', async () => {
      // Simulate Chrome's canvas memory leak bug
      let canvasCount = 0
      const originalCreateElement = document.createElement
      
      document.createElement = vi.fn().mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          canvasCount++
          if (canvasCount > 10) {
            throw new Error('Too many canvas elements: Memory leak detected')
          }
        }
        return originalCreateElement.call(document, tagName)
      })
      
      const parent = document.createElement('div')
      
      // Should implement canvas pooling or cleanup
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Restore
      document.createElement = originalCreateElement
    })

    it('should handle Firefox WebGL context limit', async () => {
      // Firefox has a limit on concurrent WebGL contexts
      let contextCount = 0
      const MAX_CONTEXTS = 16
      
      HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation((type) => {
        if (type === 'webgl' || type === 'experimental-webgl') {
          contextCount++
          if (contextCount > MAX_CONTEXTS) {
            return null // Context creation failed
          }
          return { /* mock context */ }
        }
        return originalGetContext.call(this, type)
      })
      
      const parent = document.createElement('div')
      
      // Should handle context limit gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle Safari private browsing restrictions', async () => {
      // Mock Safari private browsing mode
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn().mockImplementation(() => {
            throw new Error('QuotaExceededError: Safari private browsing')
          }),
          setItem: vi.fn().mockImplementation(() => {
            throw new Error('QuotaExceededError: Safari private browsing')
          })
        },
        writable: true
      })
      
      const parent = document.createElement('div')
      
      // Should work without localStorage in private browsing
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })
})

/**
 * Comprehensive browser compatibility test runner
 */
describe('Cross-Browser Compatibility Matrix', () => {
  const testCases = [
    { browser: 'ie11', shouldFail: true, reason: 'No WebGL support' },
    { browser: 'oldAndroid', shouldFail: false, reason: 'Canvas fallback' },
    { browser: 'oldIOS', shouldFail: false, reason: 'Limited WebGL' },
    { browser: 'restrictedWebview', shouldFail: true, reason: 'API restrictions' },
    { browser: 'lowMemoryDevice', shouldFail: false, reason: 'Memory management' }
  ]
  
  testCases.forEach(({ browser, shouldFail, reason }) => {
    it(`should ${shouldFail ? 'fail gracefully' : 'work'} on ${browser} (${reason})`, async () => {
      const profile = browserProfiles[browser as keyof typeof browserProfiles]
      simulateBrowser(profile)
      
      const gameManager = GameManager.getInstance()
      const parent = document.createElement('div')
      
      if (shouldFail) {
        // Mock Phaser to throw appropriate error
        const mockPhaser = {
          Game: vi.fn().mockImplementation(() => {
            throw new Error(`Initialization failed: ${reason}`)
          }),
          AUTO: 1,
          Scale: { FIT: 1, CENTER_BOTH: 1 }
        }

        vi.doMock('@/game/loaders/PhaserLoader', () => ({
          loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
        }))
        
        await expect(gameManager.initialize(parent)).rejects.toThrow()
      } else {
        await expect(gameManager.initialize(parent)).resolves.not.toThrow()
        expect(gameManager.isInitialized()).toBe(true)
      }
      
      // Cleanup
      if (gameManager.isInitialized()) {
        gameManager.destroy()
      }
      ;(GameManager as any).instance = null
    })
  })
})
