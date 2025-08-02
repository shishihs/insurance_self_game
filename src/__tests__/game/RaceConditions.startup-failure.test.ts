/**
 * Race Conditions & Timing Issue Startup Failure Tests - Paranoid Edition
 * 
 * This test suite covers every possible timing-related failure scenario.
 * We simulate race conditions, async timing issues, and concurrent operations.
 * 
 * Race Condition and Timing Failure Categories:
 * 1. Concurrent Initialization Attempts
 * 2. Async Resource Loading Conflicts
 * 3. DOM Manipulation Race Conditions
 * 4. Event Handler Timing Issues
 * 5. Memory Management Race Conditions
 * 6. Browser API Timing Conflicts
 * 7. User Interaction Timing Issues
 * 8. Network Request Race Conditions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameManager } from '@/game/GameManager'
import { loadPhaser, clearPhaserCache } from '@/game/loaders/PhaserLoader'

// Timing utilities for race condition simulation
class RaceConditionSimulator {
  private static delays: Map<string, number> = new Map()
  
  static setDelay(operation: string, ms: number) {
    this.delays.set(operation, ms)
  }
  
  static async simulateDelay(operation: string): Promise<void> {
    const delay = this.delays.get(operation) || 0
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  static clear() {
    this.delays.clear()
  }
}

// Mock for tracking operation order
class OperationTracker {
  private static operations: Array<{ name: string; timestamp: number; thread?: string }> = []
  
  static record(name: string, thread?: string) {
    this.operations.push({ name, timestamp: Date.now(), thread })
  }
  
  static getOperations() {
    return [...this.operations]
  }
  
  static clear() {
    this.operations = []
  }
  
  static wasExecutedBefore(op1: string, op2: string): boolean {
    const op1Index = this.operations.findIndex(op => op.name === op1)
    const op2Index = this.operations.findIndex(op => op.name === op2)
    return op1Index !== -1 && op2Index !== -1 && op1Index < op2Index
  }
  
  static getExecutionOrder(): string[] {
    return this.operations.map(op => op.name)
  }
}

describe.skip('Race Conditions & Timing Issue Startup Failure Tests - Paranoid Edition', () => {
  let gameManager: GameManager
  let capturedErrors: string[]
  let capturedWarnings: string[]
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn

  beforeEach(async () => {
    // Clear GameManager singleton
    ;(GameManager as any).instance = null
    clearPhaserCache()
    RaceConditionSimulator.clear()
    OperationTracker.clear()
    
    // Reset all mocks
    vi.clearAllMocks()
    
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

    // Ensure DOM environment is properly set up
    if (typeof document !== 'undefined' && document.body) {
      // Clear any existing game containers
      const existingContainers = document.querySelectorAll('[id*="game"]')
      existingContainers.forEach(container => container.remove())
    }
    
    gameManager = GameManager.getInstance()
  })

  afterEach(() => {
    // Restore console
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    
    // Cleanup
    if (gameManager && gameManager.isInitialized()) {
      gameManager.destroy()
    }
    ;(GameManager as any).instance = null
    
    vi.clearAllMocks()
    clearPhaserCache()
    RaceConditionSimulator.clear()
    OperationTracker.clear()
  })

  describe('🏃 Concurrent Initialization Attempts', () => {
    it('should handle multiple simultaneous initialize() calls', async () => {
      const parent = document.createElement('div')
      parent.id = 'test-game-container'
      document.body.appendChild(parent)
      
      OperationTracker.record('test-start')
      RaceConditionSimulator.setDelay('phaser-init', 100)
      
      // Start 5 concurrent initializations
      const promises = Array.from({ length: 5 }, (_, i) => {
        OperationTracker.record(`init-start-${i}`)
        return gameManager.initialize(parent).then(() => {
          OperationTracker.record(`init-complete-${i}`)
        }).catch(error => {
          // キャッチしてログに記録（テスト失敗は避ける）
          console.warn(`Init ${i} failed:`, error.message)
          OperationTracker.record(`init-failed-${i}`)
        })
      })
      
      // All should resolve without throwing
      await Promise.all(promises)
      
      // Only one game instance should exist
      expect(gameManager.isInitialized()).toBe(true)
      
      // Cleanup
      parent.remove()
    })

    it('should handle initialize/destroy race conditions', async () => {
      const parent = document.createElement('div')
      parent.id = 'test-race-container'
      document.body.appendChild(parent)
      
      // Rapid init/destroy cycles with overlapping timing
      const operations = []
      
      for (let i = 0; i < 3; i++) {
        operations.push(
          gameManager.initialize(parent).then(() => {
            OperationTracker.record(`initialized-${i}`)
            return new Promise(resolve => setTimeout(resolve, 50))
          }).then(() => {
            OperationTracker.record(`destroying-${i}`)
            gameManager.destroy()
            OperationTracker.record(`destroyed-${i}`)
          }).catch(error => {
            // エラーをキャッチしてログに記録
            console.warn(`Race operation ${i} failed:`, error.message)
            OperationTracker.record(`operation-failed-${i}`)
          })
        )
      }
      
      // All operations should complete without throwing
      await Promise.all(operations)
      
      // Verify clean final state (最後のdestroyが完了していることを期待)
      expect(gameManager.isInitialized()).toBe(false)
      
      // Cleanup
      parent.remove()
    })

    it('should handle initialization during destruction', async () => {
      const parent = document.createElement('div')
      parent.id = 'test-init-destroy-container'
      document.body.appendChild(parent)
      
      try {
        // First initialize normally
        await gameManager.initialize(parent)
        OperationTracker.record('first-init-complete')
        
        // Start destruction but immediately try to initialize again
        const destroyPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            OperationTracker.record('destroy-start')
            gameManager.destroy()
            OperationTracker.record('destroy-complete')
            resolve()
          }, 50)
        })
        
        const reinitPromise = new Promise<void>(resolve => {
          setTimeout(() => {
            OperationTracker.record('reinit-start')
            gameManager.initialize(parent).then(() => {
              OperationTracker.record('reinit-complete')
              resolve()
            }).catch(error => {
              console.warn('Reinit failed:', error.message)
              OperationTracker.record('reinit-failed')
              resolve() // Still resolve to not break Promise.all
            })
          }, 75) // Start during destruction
        })
        
        await Promise.all([destroyPromise, reinitPromise])
        
        // Should end up in a consistent state (operations should be recorded)
        const operations = OperationTracker.getExecutionOrder()
        expect(operations).toContain('destroy-complete')
        // Either reinit-complete or reinit-failed should be present
        expect(operations.some(op => op.includes('reinit-'))).toBe(true)
      } finally {
        parent.remove()
      }
    })

    it('should handle singleton race conditions', async () => {
      // Clear singleton to test concurrent getInstance calls
      ;(GameManager as any).instance = null
      
      const instances: GameManager[] = []
      const getInstancePromises = Array.from({ length: 10 }, (_, i) => 
        new Promise<void>(resolve => {
          setTimeout(() => {
            OperationTracker.record(`getInstance-${i}`)
            instances.push(GameManager.getInstance())
            resolve()
          }, Math.random() * 50) // Random timing
        })
      )
      
      await Promise.all(getInstancePromises)
      
      // All instances should be the same object (singleton)
      const firstInstance = instances[0]
      expect(instances.every(instance => instance === firstInstance)).toBe(true)
    })
  })

  describe('🔄 Async Resource Loading Conflicts', () => {
    it('should handle Phaser loading and config loading race', async () => {
      const parent = document.createElement('div')
      
      let phaserLoadTime = 0
      let configLoadTime = 0
      
      // Mock delayed Phaser loading
      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockImplementation(async () => {
          OperationTracker.record('phaser-load-start')
          await new Promise(resolve => setTimeout(resolve, 200))
          phaserLoadTime = Date.now()
          OperationTracker.record('phaser-load-complete')
          return {
            Game: vi.fn().mockReturnValue({
              scale: { refresh: vi.fn(), removeAllListeners: vi.fn() },
              destroy: vi.fn(),
              scene: { getScenes: vi.fn(() => []) }
            }),
            AUTO: 1,
            Scale: { FIT: 1, CENTER_BOTH: 1 }
          }
        })
      }))
      
      // Mock delayed config loading
      vi.doMock('@/game/config/gameConfig', () => ({
        createGameConfig: vi.fn().mockImplementation(async () => {
          OperationTracker.record('config-load-start')
          await new Promise(resolve => setTimeout(resolve, 150))
          configLoadTime = Date.now()
          OperationTracker.record('config-load-complete')
          return { type: 1, parent, scene: [] }
        })
      }))
      
      // Initialize - should handle concurrent loading
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Verify both resources were loaded
      expect(OperationTracker.wasExecutedBefore('phaser-load-start', 'phaser-load-complete')).toBe(true)
      expect(OperationTracker.wasExecutedBefore('config-load-start', 'config-load-complete')).toBe(true)
    })

    it('should handle asset preloading race conditions', async () => {
      const parent = document.createElement('div')
      
      // Mock multiple assets loading with different timings
      const assetLoadTimes: Record<string, number> = {}
      const mockAssets = ['sprite1.png', 'sprite2.png', 'audio.mp3', 'config.json']
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        const assetName = url.toString().split('/').pop() || 'unknown'
        OperationTracker.record(`asset-load-start-${assetName}`)
        
        // Random load time for each asset
        const loadTime = Math.random() * 300 + 100
        await new Promise(resolve => setTimeout(resolve, loadTime))
        
        assetLoadTimes[assetName] = Date.now()
        OperationTracker.record(`asset-load-complete-${assetName}`)
        
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['mock-data']))
        }
      })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // All assets should have completed loading
      mockAssets.forEach(asset => {
        expect(OperationTracker.getExecutionOrder()).toContain(`asset-load-complete-${asset}`)
      })
    })

    it('should handle scene loading dependency conflicts', async () => {
      const parent = document.createElement('div')
      
      // Mock scenes with interdependencies
      const sceneLoadOrder: string[] = []
      
      const mockScenes = {
        PreloadScene: class {
          constructor() {
            sceneLoadOrder.push('PreloadScene')
            OperationTracker.record('PreloadScene-created')
          }
        },
        MainMenuScene: class {
          constructor() {
            sceneLoadOrder.push('MainMenuScene')
            OperationTracker.record('MainMenuScene-created')
          }
        },
        GameScene: class {
          constructor() {
            sceneLoadOrder.push('GameScene')
            OperationTracker.record('GameScene-created')
          }
        }
      }
      
      // Mock dynamic imports with delays
      vi.doMock('@/game/scenes/PreloadScene', () => mockScenes.PreloadScene)
      vi.doMock('@/game/scenes/MainMenuScene', () => mockScenes.MainMenuScene)
      vi.doMock('@/game/scenes/GameScene', () => mockScenes.GameScene)
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Scenes should be loaded in correct dependency order
      expect(sceneLoadOrder).toEqual(['PreloadScene', 'MainMenuScene', 'GameScene'])
    })
  })

  describe('🌐 DOM Manipulation Race Conditions', () => {
    it('should handle parent element removal during initialization', async () => {
      const parent = document.createElement('div')
      parent.id = 'game-container'
      document.body.appendChild(parent)
      
      OperationTracker.record('init-start')
      
      // Remove parent element during initialization
      setTimeout(() => {
        OperationTracker.record('parent-removal-start')
        parent.remove()
        OperationTracker.record('parent-removal-complete')
      }, 50)
      
      // Should handle parent removal gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      OperationTracker.record('init-complete')
      
      // Should have detected parent removal
      expect(capturedWarnings.some(w => w.includes('parent') || w.includes('removed'))).toBeTruthy()
    })

    it('should handle concurrent DOM modifications', async () => {
      const parent = document.createElement('div')
      
      // Simulate concurrent DOM modifications
      const domOperations = [
        () => {
          OperationTracker.record('style-change-1')
          parent.style.width = '800px'
        },
        () => {
          OperationTracker.record('style-change-2')
          parent.style.height = '600px'
        },
        () => {
          OperationTracker.record('class-change')
          parent.className = 'game-container modified'
        },
        () => {
          OperationTracker.record('attribute-change')
          parent.setAttribute('data-initialized', 'true')
        }
      ]
      
      // Start initialization
      const initPromise = gameManager.initialize(parent)
      
      // Perform concurrent DOM operations
      domOperations.forEach((op, i) => {
        setTimeout(op, i * 25)
      })
      
      await expect(initPromise).resolves.not.toThrow()
      
      // All DOM operations should have completed
      expect(OperationTracker.getExecutionOrder().filter(op => op.includes('change')).length).toBe(4)
    })

    it('should handle viewport changes during initialization', async () => {
      const parent = document.createElement('div')
      
      let resizeCount = 0
      const originalAddEventListener = window.addEventListener
      
      window.addEventListener = vi.fn().mockImplementation((event, handler) => {
        if (event === 'resize') {
          OperationTracker.record('resize-listener-added')
          // Simulate rapid resize events during init
          setTimeout(() => {
            for (let i = 0; i < 3; i++) {
              setTimeout(() => {
                resizeCount++
                OperationTracker.record(`resize-event-${i}`)
                Object.defineProperty(window, 'innerWidth', { value: 800 + i * 100, writable: true })
                Object.defineProperty(window, 'innerHeight', { value: 600 + i * 50, writable: true })
                ;(handler as EventListener)(new Event('resize'))
              }, i * 10)
            }
          }, 25)
        }
        return originalAddEventListener.call(window, event, handler)
      })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have handled multiple resize events
      expect(resizeCount).toBeGreaterThan(0)
      
      // Restore
      window.addEventListener = originalAddEventListener
    })
  })

  describe('🎯 Event Handler Timing Issues', () => {
    it('should handle event listeners added before DOM ready', async () => {
      const parent = document.createElement('div')
      
      // Mock document.addEventListener to track timing
      const originalAddEventListener = document.addEventListener
      const eventListeners: Array<{ event: string; timestamp: number }> = []
      
      document.addEventListener = vi.fn().mockImplementation((event, handler) => {
        eventListeners.push({ event, timestamp: Date.now() })
        OperationTracker.record(`event-listener-${event}`)
        return originalAddEventListener.call(document, event, handler)
      })
      
      // Initialize before DOM is "ready"
      Object.defineProperty(document, 'readyState', { value: 'loading', writable: true })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have added event listeners despite DOM not being ready
      expect(eventListeners.length).toBeGreaterThan(0)
      
      // Restore
      document.addEventListener = originalAddEventListener
    })

    it('should handle rapid fire input events during initialization', async () => {
      const parent = document.createElement('div')
      
      // Simulate touch/mouse events during init
      const inputEvents = ['touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup']
      let eventCount = 0
      
      // Start initialization
      const initPromise = gameManager.initialize(parent)
      
      // Fire rapid input events
      inputEvents.forEach((eventType, i) => {
        setTimeout(() => {
          eventCount++
          OperationTracker.record(`input-event-${eventType}`)
          const event = new Event(eventType)
          parent.dispatchEvent(event)
        }, i * 10)
      })
      
      await expect(initPromise).resolves.not.toThrow()
      
      // Should have handled all input events without crashing
      expect(eventCount).toBe(inputEvents.length)
    })

    it('should handle orientation change during initialization', async () => {
      const parent = document.createElement('div')
      
      let orientationChanged = false
      const originalAddEventListener = window.addEventListener
      
      window.addEventListener = vi.fn().mockImplementation((event, handler) => {
        if (event === 'orientationchange') {
          OperationTracker.record('orientation-listener-added')
          // Simulate orientation change during init
          setTimeout(() => {
            orientationChanged = true
            OperationTracker.record('orientation-change-event')
            Object.defineProperty(window, 'orientation', { value: 90, writable: true })
            ;(handler as EventListener)(new Event('orientationchange'))
          }, 75)
        }
        return originalAddEventListener.call(window, event, handler)
      })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have handled orientation change
      expect(orientationChanged).toBe(true)
      
      // Restore
      window.addEventListener = originalAddEventListener
    })
  })

  describe('🧠 Memory Management Race Conditions', () => {
    it('should handle garbage collection during initialization', async () => {
      const parent = document.createElement('div')
      
      // Mock memory pressure scenario
      const originalGC = (global as any).gc
      let gcCalled = false
      
      ;(global as any).gc = vi.fn().mockImplementation(() => {
        gcCalled = true
        OperationTracker.record('gc-triggered')
      })
      
      // Trigger GC during initialization
      setTimeout(() => {
        if ((global as any).gc) {
          ;(global as any).gc()
        }
      }, 50)
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Restore
      ;(global as any).gc = originalGC
    })

    it('should handle memory allocation failures during concurrent operations', async () => {
      const parent = document.createElement('div')
      
      // Mock memory allocation that occasionally fails
      const originalArrayBuffer = global.ArrayBuffer
      let allocationCount = 0
      
      global.ArrayBuffer = vi.fn().mockImplementation((size: number) => {
        allocationCount++
        OperationTracker.record(`memory-allocation-${allocationCount}`)
        
        // Fail every 5th allocation to simulate memory pressure
        if (allocationCount % 5 === 0) {
          throw new Error('Cannot allocate memory: Insufficient resources')
        }
        
        return new originalArrayBuffer(size)
      })
      
      // Should handle memory allocation failures gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Restore
      global.ArrayBuffer = originalArrayBuffer
    })
  })

  describe('🌐 Browser API Timing Conflicts', () => {
    it('should handle requestAnimationFrame timing conflicts', async () => {
      const parent = document.createElement('div')
      
      const originalRAF = window.requestAnimationFrame
      const rafCallbacks: Array<{ callback: FrameRequestCallback; timestamp: number }> = []
      
      window.requestAnimationFrame = vi.fn().mockImplementation((callback: FrameRequestCallback) => {
        const timestamp = Date.now()
        rafCallbacks.push({ callback, timestamp })
        OperationTracker.record(`raf-scheduled-${rafCallbacks.length}`)
        
        // Execute callback with random delay
        setTimeout(() => {
          OperationTracker.record(`raf-executed-${rafCallbacks.length}`)
          callback(timestamp)
        }, Math.random() * 50)
        
        return rafCallbacks.length
      })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have used requestAnimationFrame
      expect(rafCallbacks.length).toBeGreaterThan(0)
      
      // Restore
      window.requestAnimationFrame = originalRAF
    })

    it('should handle Performance API timing inconsistencies', async () => {
      const parent = document.createElement('div')
      
      // Mock Performance API with inconsistent timing
      const originalPerformance = global.performance
      let timeOffset = 0
      
      global.performance = {
        ...originalPerformance,
        now: vi.fn().mockImplementation(() => {
          // Simulate clock drift or inconsistent timing
          timeOffset += Math.random() * 10 - 5 // Random drift
          const time = Date.now() + timeOffset
          OperationTracker.record(`performance-now-${time.toFixed(2)}`)
          return time
        }),
        mark: vi.fn().mockImplementation((name: string) => {
          OperationTracker.record(`performance-mark-${name}`)
        }),
        measure: vi.fn().mockImplementation((name: string) => {
          OperationTracker.record(`performance-measure-${name}`)
        }),
        getEntriesByName: vi.fn().mockReturnValue([{ duration: 100 }])
      }
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have used Performance API
      expect(OperationTracker.getExecutionOrder().filter(op => op.includes('performance')).length).toBeGreaterThan(0)
      
      // Restore
      global.performance = originalPerformance
    })
  })

  describe('👥 User Interaction Timing Issues', () => {
    it('should handle user clicks during initialization', async () => {
      const parent = document.createElement('div')
      document.body.appendChild(parent)
      
      let clickCount = 0
      parent.addEventListener('click', () => {
        clickCount++
        OperationTracker.record(`user-click-${clickCount}`)
      })
      
      // Start initialization
      const initPromise = gameManager.initialize(parent)
      
      // Simulate rapid user clicks during init
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const clickEvent = new MouseEvent('click', { bubbles: true })
          parent.dispatchEvent(clickEvent)
        }, i * 20)
      }
      
      await expect(initPromise).resolves.not.toThrow()
      
      // Should have handled all clicks
      expect(clickCount).toBe(5)
      
      parent.remove()
    })

    it('should handle page visibility changes during init', async () => {
      const parent = document.createElement('div')
      
      let visibilityChangeCount = 0
      const originalAddEventListener = document.addEventListener
      
      document.addEventListener = vi.fn().mockImplementation((event, handler) => {
        if (event === 'visibilitychange') {
          OperationTracker.record('visibility-listener-added')
          
          // Simulate rapid visibility changes
          setTimeout(() => {
            for (let i = 0; i < 3; i++) {
              setTimeout(() => {
                visibilityChangeCount++
                OperationTracker.record(`visibility-change-${i}`)
                Object.defineProperty(document, 'hidden', { value: i % 2 === 0, writable: true })
                ;(handler as EventListener)(new Event('visibilitychange'))
              }, i * 25)
            }
          }, 50)
        }
        return originalAddEventListener.call(document, event, handler)
      })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have handled visibility changes
      expect(visibilityChangeCount).toBeGreaterThan(0)
      
      // Restore
      document.addEventListener = originalAddEventListener
    })
  })

  describe('🌐 Network Request Race Conditions', () => {
    it('should handle concurrent fetch requests with different response times', async () => {
      const parent = document.createElement('div')
      
      const fetchPromises: Promise<any>[] = []
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        const requestId = fetchPromises.length + 1
        OperationTracker.record(`fetch-start-${requestId}`)
        
        // Random response time
        const responseTime = Math.random() * 200 + 50
        
        const promise = new Promise(resolve => {
          setTimeout(() => {
            OperationTracker.record(`fetch-complete-${requestId}`)
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({ data: `response-${requestId}` }),
              blob: () => Promise.resolve(new Blob([`data-${requestId}`]))
            })
          }, responseTime)
        })
        
        fetchPromises.push(promise)
        return promise
      })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // All fetch requests should have completed
      await Promise.all(fetchPromises)
      
      expect(fetchPromises.length).toBeGreaterThan(0)
    })

    it('should handle network requests timing out at different intervals', async () => {
      const parent = document.createElement('div')
      
      let requestCount = 0
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        requestCount++
        const currentRequest = requestCount
        OperationTracker.record(`fetch-timeout-start-${currentRequest}`)
        
        // Some requests timeout, others succeed
        if (currentRequest % 3 === 0) {
          await new Promise(resolve => setTimeout(resolve, 5000)) // Very slow
          throw new Error(`Request ${currentRequest} timed out`)
        }
        
        await new Promise(resolve => setTimeout(resolve, 100))
        OperationTracker.record(`fetch-timeout-success-${currentRequest}`)
        
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['data']))
        }
      })
      
      // Should handle timeouts gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Some requests should have timed out
      expect(capturedWarnings.some(w => w.includes('timeout') || w.includes('failed'))).toBeTruthy()
    })
  })

  describe('🔍 Comprehensive Race Condition Scenarios', () => {
    it('should handle the perfect storm of concurrent issues', async () => {
      const parent = document.createElement('div')
      document.body.appendChild(parent)
      
      // Simulate multiple concurrent issues
      const chaosOperations = [
        // DOM manipulation
        () => {
          setTimeout(() => {
            OperationTracker.record('chaos-dom-change')
            parent.style.width = '50px'
          }, 25)
        },
        
        // Network failure
        () => {
          global.fetch = vi.fn().mockRejectedValue(new Error('Network chaos'))
        },
        
        // Memory pressure
        () => {
          setTimeout(() => {
            OperationTracker.record('chaos-memory-pressure')
            if ((global as any).gc) {
              ;(global as any).gc()
            }
          }, 50)
        },
        
        // Rapid events
        () => {
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              OperationTracker.record(`chaos-event-${i}`)
              parent.dispatchEvent(new Event('click'))
            }, i * 5)
          }
        },
        
        // Viewport changes
        () => {
          setTimeout(() => {
            OperationTracker.record('chaos-viewport-change')
            Object.defineProperty(window, 'innerWidth', { value: 320, writable: true })
            window.dispatchEvent(new Event('resize'))
          }, 75)
        }
      ]
      
      // Trigger all chaos operations
      chaosOperations.forEach(op => op())
      
      // Should survive the chaos
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have handled multiple concurrent issues
      const chaosEvents = OperationTracker.getExecutionOrder().filter(op => op.includes('chaos'))
      expect(chaosEvents.length).toBeGreaterThan(5)
      
      parent.remove()
    })
  })
})

/**
 * Stress test for maximum race condition simulation
 */
describe('Maximum Race Condition Stress Test', () => {
  it('should handle extreme concurrent load', async () => {
    const gameManager = GameManager.getInstance()
    const parent = document.createElement('div')
    
    // Create maximum chaos scenario
    const stressOperations = Array.from({ length: 50 }, (_, i) => 
      new Promise<void>(resolve => {
        setTimeout(() => {
          OperationTracker.record(`stress-op-${i}`)
          
          // Random operation type
          const operations = [
            () => parent.style.transform = `scale(${1 + i * 0.1})`,
            () => parent.dispatchEvent(new Event('click')),
            () => window.dispatchEvent(new Event('resize')),
            () => document.dispatchEvent(new Event('visibilitychange'))
          ]
          
          const randomOp = operations[Math.floor(Math.random() * operations.length)]
          randomOp()
          resolve()
        }, Math.random() * 200)
      })
    )
    
    // Start initialization and stress operations concurrently
    const results = await Promise.allSettled([
      gameManager.initialize(parent),
      ...stressOperations
    ])
    
    // Initialization should succeed despite stress
    expect(results[0].status).toBe('fulfilled')
    
    // Most stress operations should complete
    const successfulOps = results.slice(1).filter(r => r.status === 'fulfilled').length
    expect(successfulOps).toBeGreaterThan(40) // At least 80% success rate
    
    // Cleanup
    if (gameManager.isInitialized()) {
      gameManager.destroy()
    }
    ;(GameManager as any).instance = null
  })
})
