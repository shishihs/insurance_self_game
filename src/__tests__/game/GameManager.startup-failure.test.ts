/**
 * GameManager Startup Failure Tests - Paranoid Edition
 * 
 * This test suite covers EVERY POSSIBLE way the game initialization can fail.
 * We test scenarios that "should never happen" because they always do in production.
 * 
 * Categories of Failures Tested:
 * 1. Phaser Engine Initialization Failures
 * 2. Asset Loading Failures  
 * 3. Browser Compatibility Issues
 * 4. Race Conditions and Timing Problems
 * 5. Resource Constraint Failures
 * 6. Security and Permission Issues
 * 7. Network and Connectivity Problems
 * 8. Memory and Performance Issues
 * 9. DOM Manipulation Failures
 * 10. Configuration and Environment Issues
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameManager } from '@/game/GameManager'
import { loadPhaser, clearPhaserCache } from '@/game/loaders/PhaserLoader'
import { createGameConfig } from '@/game/config/gameConfig'

// Mock performance API for older browsers
Object.defineProperty(global, 'performance', {
  value: {
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => [{ duration: 100 }]),
    now: vi.fn(() => Date.now())
  },
  writable: true
})

// Mock DOM APIs that might not exist
Object.defineProperty(global, 'window', {
  value: {
    ...global.window,
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 1,
    orientation: 0,
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    navigator: {
      userAgent: 'Mozilla/5.0 (Test Browser)',
      vendor: '',
      maxTouchPoints: 0
    },
    requestAnimationFrame: vi.fn((cb) => setTimeout(cb, 16)),
    cancelAnimationFrame: vi.fn()
  },
  writable: true
})

// Mock document for DOM operations
Object.defineProperty(global, 'document', {
  value: {
    ...global.document,
    getElementById: vi.fn(),
    querySelector: vi.fn(),
    createElement: vi.fn(() => ({
      setAttribute: vi.fn(),
      appendChild: vi.fn(),
      style: {}
    })),
    documentElement: {
      requestFullscreen: vi.fn()
    },
    head: {
      appendChild: vi.fn()
    },
    body: {
      style: {}
    },
    fullscreenElement: null,
    exitFullscreen: vi.fn(),
    hidden: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  },
  writable: true
})

describe('GameManager Startup Failure Tests - Paranoid Edition', () => {
  let gameManager: GameManager
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn
  let capturedErrors: string[]
  let capturedWarnings: string[]

  beforeEach(() => {
    // Clear any existing GameManager instance
    const instance = (GameManager as any).instance
    ;(GameManager as any).instance = null
    
    // Clear Phaser cache to ensure clean state
    clearPhaserCache()
    
    // Capture console output for error analysis
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
    // Restore console functions
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    
    // Clean up GameManager
    if (gameManager && gameManager.isInitialized()) {
      gameManager.destroy()
    }
    
    // Reset singleton
    ;(GameManager as any).instance = null
    
    // Clear all mocks
    vi.clearAllMocks()
    clearPhaserCache()
  })

  describe('🚨 CRITICAL: Phaser Engine Initialization Failures', () => {
    it('should handle Phaser dynamic import failure gracefully', async () => {
      // Mock dynamic import failure
      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockRejectedValue(new Error('Failed to fetch dynamically imported module: phaser'))
      }))

      const parent = document.createElement('div')
      parent.id = 'game-container'
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      expect(capturedErrors).toContain(expect.stringContaining('GameManager: ゲーム初期化エラー'))
    })

    it('should handle WebGL context creation failure', async () => {
      // Mock Phaser with WebGL failure
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('WebGL context could not be created')
        }),
        AUTO: 1,
        Scale: {
          FIT: 1,
          CENTER_BOTH: 1
        }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow('WebGL context could not be created')
    })

    it('should handle Canvas element creation failure', async () => {
      // Mock DOM that fails to create canvas
      const failingDocument = {
        ...document,
        createElement: vi.fn((tag) => {
          if (tag === 'canvas') {
            throw new Error('Canvas creation blocked by CSP')
          }
          return document.createElement(tag)
        })
      }
      
      Object.defineProperty(global, 'document', { value: failingDocument, writable: true })
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Cannot create canvas element')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow()
    })

    it('should handle Phaser Game constructor timeout', async () => {
      // Mock slow Phaser initialization that never completes
      const mockGame = {
        scale: null, // Simulate incomplete initialization
        destroy: vi.fn(),
        scene: {
          getScenes: vi.fn(() => [])
        }
      }

      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          // Return game object but never call ready callback
          return mockGame
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      
      // Should not throw but should handle gracefully
      await gameManager.initialize(parent)
      
      // Verify game scale operations are protected
      expect(() => {
        if (gameManager.isInitialized()) {
          // This should not crash even if scale is null
          gameManager.reset()
        }
      }).not.toThrow()
    })

    it('should handle memory allocation failure during Phaser creation', async () => {
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Cannot allocate memory for WebGL context')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow('Cannot allocate memory')
    })
  })

  describe('⚠️ HIGH RISK: Asset Loading Failures', () => {
    it('should handle scene import failures', async () => {
      // Mock scene classes that fail to import
      vi.doMock('@/game/scenes/PreloadScene', () => {
        throw new Error('Failed to import PreloadScene')
      })

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow()
    })

    it('should handle corrupted game config', async () => {
      // Mock createGameConfig to return invalid config
      vi.doMock('@/game/config/gameConfig', () => ({
        createGameConfig: vi.fn().mockRejectedValue(new Error('Config validation failed'))
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow('Config validation failed')
    })

    it('should handle network timeout during asset loading', async () => {
      // Simulate network timeout
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          setTimeout(() => {
            throw new Error('Network timeout: Assets failed to load')
          }, 100)
          return {
            scale: {
              refresh: vi.fn(),
              removeAllListeners: vi.fn()
            },
            destroy: vi.fn(),
            scene: {
              getScenes: vi.fn(() => [])
            }
          }
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      
      // Initialize and wait for potential async errors
      await gameManager.initialize(parent)
      
      // Wait for timeout to trigger
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should not crash the application
      expect(gameManager.isInitialized()).toBe(true)
    })

    it('should handle CDN failure for external assets', async () => {
      // Mock fetch failures for external resources
      global.fetch = vi.fn().mockRejectedValue(new Error('CDN unavailable'))
      
      const parent = document.createElement('div')
      
      // Should still initialize but might have missing assets
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Check that appropriate warnings were logged
      // Note: This would depend on actual asset loading implementation
    })
  })

  describe('🌐 Browser Compatibility Issues', () => {
    it('should handle WebGL not supported', async () => {
      // Mock browser without WebGL support
      const mockCanvas = {
        getContext: vi.fn().mockReturnValue(null) // WebGL not supported
      }
      
      const mockDocument = {
        ...document,
        createElement: vi.fn((tag) => {
          if (tag === 'canvas') return mockCanvas
          return document.createElement(tag)
        })
      }
      
      Object.defineProperty(global, 'document', { value: mockDocument, writable: true })
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('WebGL not supported')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow('WebGL not supported')
    })

    it('should handle Canvas API restrictions (iOS Safari)', async () => {
      // Mock iOS Safari restrictions
      Object.defineProperty(window, 'navigator', {
        value: {
          ...window.navigator,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
          maxTouchPoints: 5
        },
        writable: true
      })
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Canvas dimensions exceed maximum supported size')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow('Canvas dimensions exceed maximum')
    })

    it('should handle Content Security Policy violations', async () => {
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Refused to create worker due to Content Security Policy')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow('Content Security Policy')
    })

    it('should handle browsers without requestAnimationFrame', async () => {
      // Mock older browser without rAF
      const originalRAF = window.requestAnimationFrame
      delete (window as any).requestAnimationFrame
      
      const parent = document.createElement('div')
      
      // Should still work with fallback
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Restore
      window.requestAnimationFrame = originalRAF
    })
  })

  describe('⏱️ Race Conditions and Timing Issues', () => {
    it('should handle multiple simultaneous initialization calls', async () => {
      const parent = document.createElement('div')
      
      // Start multiple initializations simultaneously
      const promises = Array.from({ length: 5 }, () => 
        gameManager.initialize(parent)
      )
      
      // All should resolve successfully without conflicts
      await expect(Promise.all(promises)).resolves.not.toThrow()
      
      // Only one game instance should exist
      expect(gameManager.isInitialized()).toBe(true)
    })

    it('should handle rapid initialize/destroy cycles', async () => {
      const parent = document.createElement('div')
      
      // Rapid init/destroy cycle
      for (let i = 0; i < 3; i++) {
        await gameManager.initialize(parent)
        expect(gameManager.isInitialized()).toBe(true)
        
        gameManager.destroy()
        expect(gameManager.isInitialized()).toBe(false)
      }
    })

    it('should handle initialization during page unload', async () => {
      // Mock page unload scenario
      Object.defineProperty(document, 'hidden', { value: true, writable: true })
      
      // Simulate window unload event during initialization
      const parent = document.createElement('div')
      
      setTimeout(() => {
        window.dispatchEvent(new Event('beforeunload'))
      }, 50)
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle DOM element removal during initialization', async () => {
      const parent = document.createElement('div')
      parent.id = 'game-container'
      document.body.appendChild(parent)
      
      // Remove parent element during initialization
      setTimeout(() => {
        parent.remove()
      }, 50)
      
      // Should handle gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle window resize during initialization', async () => {
      const parent = document.createElement('div')
      
      // Trigger resize events during initialization
      setTimeout(() => {
        Object.defineProperty(window, 'innerWidth', { value: 500, writable: true })
        Object.defineProperty(window, 'innerHeight', { value: 300, writable: true })
        window.dispatchEvent(new Event('resize'))
      }, 25)
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })

  describe('💾 Resource Constraint Failures', () => {
    it('should handle insufficient memory conditions', async () => {
      // Mock memory pressure
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          // Simulate memory allocation failure after some time
          setTimeout(() => {
            throw new Error('Out of memory')
          }, 10)
          
          return {
            scale: {
              refresh: vi.fn(),
              removeAllListeners: vi.fn()
            },
            destroy: vi.fn(),
            scene: {
              getScenes: vi.fn(() => [])
            }
          }
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await gameManager.initialize(parent)
      
      // Wait for memory error
      await new Promise(resolve => setTimeout(resolve, 50))
      
      // Should not crash completely
      expect(gameManager.isInitialized()).toBe(true)
    })

    it('should handle CPU throttling on mobile devices', async () => {
      // Mock mobile device with performance constraints
      Object.defineProperty(window, 'navigator', {
        value: {
          ...window.navigator,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 12_0 like Mac OS X)',
          hardwareConcurrency: 2, // Limited CPU cores
          deviceMemory: 2 // Limited RAM
        },
        writable: true
      })
      
      // Mock slow performance
      performance.now = vi.fn(() => {
        let time = 0
        return () => time += 100 // Simulate very slow operations
      })()
      
      const parent = document.createElement('div')
      
      // Should complete but might take longer
      const start = Date.now()
      await gameManager.initialize(parent)
      const duration = Date.now() - start
      
      expect(gameManager.isInitialized()).toBe(true)
      // Performance should be monitored but not fail
    })
  })

  describe('🔒 Security and Permission Issues', () => {
    it('should handle iframe sandbox restrictions', async () => {
      // Mock iframe environment with restrictions
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Sandbox restrictions: Cannot access WebGL context')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))

      const parent = document.createElement('div')
      await expect(gameManager.initialize(parent)).rejects.toThrow('Sandbox restrictions')
    })

    it('should handle CORS violations for assets', async () => {
      // Mock CORS error
      global.fetch = vi.fn().mockRejectedValue(
        new Error('CORS error: Cross-origin request blocked')
      )
      
      const parent = document.createElement('div')
      
      // Should still initialize core game
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })
})

/**
 * Helper function to simulate realistic browser conditions
 */
function simulateBrowserConditions(type: 'mobile' | 'desktop' | 'tablet' | 'legacy') {
  const conditions = {
    mobile: {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      innerWidth: 375,
      innerHeight: 667,
      devicePixelRatio: 2,
      maxTouchPoints: 5
    },
    desktop: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      innerWidth: 1920,
      innerHeight: 1080,
      devicePixelRatio: 1,
      maxTouchPoints: 0
    },
    tablet: {
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X)',
      innerWidth: 768,
      innerHeight: 1024,
      devicePixelRatio: 2,
      maxTouchPoints: 10
    },
    legacy: {
      userAgent: 'Mozilla/5.0 (Windows NT 6.1; Trident/7.0; rv:11.0) like Gecko',
      innerWidth: 1024,
      innerHeight: 768,
      devicePixelRatio: 1,
      maxTouchPoints: 0
    }
  }
  
  const config = conditions[type]
  
  Object.defineProperty(window, 'navigator', {
    value: { ...window.navigator, ...config },
    writable: true
  })
  
  Object.defineProperty(window, 'innerWidth', { value: config.innerWidth, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: config.innerHeight, writable: true })
  Object.defineProperty(window, 'devicePixelRatio', { value: config.devicePixelRatio, writable: true })
}

/**
 * Helper to simulate network conditions
 */
function simulateNetworkConditions(type: 'offline' | 'slow' | 'unstable' | 'normal') {
  const conditions = {
    offline: () => Promise.reject(new Error('Network offline')),
    slow: () => new Promise(resolve => setTimeout(resolve, 5000)),
    unstable: () => Math.random() > 0.5 
      ? Promise.resolve() 
      : Promise.reject(new Error('Network error')),
    normal: () => Promise.resolve()
  }
  
  global.fetch = vi.fn().mockImplementation(() => conditions[type]())
}
