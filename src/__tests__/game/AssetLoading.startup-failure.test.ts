/**
 * Asset Loading Startup Failure Tests - Paranoid Edition
 * 
 * This test suite covers every possible asset loading failure scenario.
 * We simulate real-world network conditions, CDN failures, and file corruption.
 * 
 * Asset Loading Failure Categories:
 * 1. Network Connectivity Issues
 * 2. CDN and Server Failures 
 * 3. File Corruption and Invalid Formats
 * 4. Permission and CORS Issues
 * 5. Timeout and Performance Issues
 * 6. Mobile Network Constraints
 * 7. Caching and Storage Issues
 * 8. Progressive Loading Failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameManager } from '@/game/GameManager'
import { loadPhaser, clearPhaserCache } from '@/game/loaders/PhaserLoader'

// Mock fetch for network simulation
const originalFetch = global.fetch

type NetworkCondition = {
  name: string
  latency: number
  reliability: number // 0-1, probability of success
  bandwidth: number // bytes per second
  errorType?: string
}

const networkConditions: Record<string, NetworkCondition> = {
  offline: {
    name: 'Offline',
    latency: 0,
    reliability: 0,
    bandwidth: 0,
    errorType: 'NetworkError: Failed to fetch'
  },
  slow3G: {
    name: 'Slow 3G',
    latency: 2000,
    reliability: 0.8,
    bandwidth: 50000 // 50KB/s
  },
  unstableWifi: {
    name: 'Unstable WiFi',
    latency: 500,
    reliability: 0.6,
    bandwidth: 200000 // 200KB/s
  },
  cdn404: {
    name: 'CDN 404',
    latency: 100,
    reliability: 0,
    bandwidth: 1000000,
    errorType: 'HTTP 404: Resource not found'
  },
  cdn503: {
    name: 'CDN Service Unavailable',
    latency: 100,
    reliability: 0,
    bandwidth: 1000000,
    errorType: 'HTTP 503: Service temporarily unavailable'
  },
  corsError: {
    name: 'CORS Blocked',
    latency: 50,
    reliability: 0,
    bandwidth: 1000000,
    errorType: 'CORS error: Cross-origin request blocked'
  }
}

function simulateNetworkCondition(condition: NetworkCondition): void {
  global.fetch = vi.fn().mockImplementation(async (url: string) => {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, condition.latency))
    
    // Simulate reliability
    if (Math.random() > condition.reliability) {
      throw new Error(condition.errorType || `Network error for ${url}`)
    }
    
    // Simulate successful response with bandwidth limitation
    const mockResponse = {
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['mock-data'])),
      json: () => Promise.resolve({ mock: 'data' }),
      text: () => Promise.resolve('mock-text'),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024))
    }
    
    return mockResponse
  })
}

describe('Asset Loading Startup Failure Tests - Paranoid Edition', () => {
  let gameManager: GameManager
  let capturedErrors: string[]
  let capturedWarnings: string[]
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn

  beforeEach(() => {
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
    // Restore console
    console.error = originalConsoleError
    console.warn = originalConsoleWarn
    
    // Cleanup
    if (gameManager.isInitialized()) {
      gameManager.destroy()
    }
    ;(GameManager as any).instance = null
    
    // Restore fetch
    global.fetch = originalFetch
    
    vi.clearAllMocks()
    clearPhaserCache()
  })

  describe('🚑 Network Connectivity Failures', () => {
    it('should handle complete network offline', async () => {
      simulateNetworkCondition(networkConditions.offline)
      
      const parent = document.createElement('div')
      
      // Should still initialize core game without network assets
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should log appropriate warnings about offline mode
      expect(capturedWarnings.some(w => w.includes('offline') || w.includes('network'))).toBeTruthy()
    })

    it('should handle intermittent network failures', async () => {
      simulateNetworkCondition(networkConditions.unstableWifi)
      
      const parent = document.createElement('div')
      
      // Multiple retries should be attempted
      let attemptCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        attemptCount++
        if (attemptCount <= 2) {
          throw new Error('Network timeout')
        }
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['data']))
        }
      })
      
      await gameManager.initialize(parent)
      expect(attemptCount).toBeGreaterThan(1) // Should have retried
    })

    it('should handle slow network with progressive loading', async () => {
      simulateNetworkCondition(networkConditions.slow3G)
      
      const parent = document.createElement('div')
      
      const startTime = Date.now()
      await gameManager.initialize(parent)
      const duration = Date.now() - startTime
      
      // Should complete despite slow network
      expect(gameManager.isInitialized()).toBe(true)
      
      // Should implement progressive loading strategies
      expect(duration).toBeGreaterThan(1000) // Acknowledge it's slow
    })
  })

  describe('🏭 CDN and Server Failures', () => {
    it('should handle CDN 404 errors with fallback', async () => {
      simulateNetworkCondition(networkConditions.cdn404)
      
      const parent = document.createElement('div')
      
      // Should try fallback sources or proceed without optional assets
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should log 404 errors appropriately
      expect(capturedErrors.some(e => e.includes('404') || e.includes('not found'))).toBeTruthy()
    })

    it('should handle CDN service unavailable (503)', async () => {
      simulateNetworkCondition(networkConditions.cdn503)
      
      const parent = document.createElement('div')
      
      // Should implement retry logic with exponential backoff
      let retryCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        retryCount++
        if (retryCount <= 3) {
          const error = new Error('Service Unavailable')
          ;(error as any).status = 503
          throw error
        }
        return { ok: true, status: 200, blob: () => Promise.resolve(new Blob(['data'])) }
      })
      
      await gameManager.initialize(parent)
      expect(retryCount).toBeGreaterThanOrEqual(3) // Should retry 503 errors
    })

    it('should handle multiple CDN failures simultaneously', async () => {
      // Mock multiple asset requests failing
      const failedUrls: string[] = []
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        failedUrls.push(url.toString())
        throw new Error(`CDN failure for ${url}`)
      })
      
      const parent = document.createElement('div')
      
      // Should handle graceful degradation
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should log all failures
      expect(capturedErrors.length).toBeGreaterThan(0)
    })

    it('should handle DNS resolution failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('DNS resolution failed: NXDOMAIN')
      )
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      expect(capturedErrors.some(e => e.includes('DNS') || e.includes('NXDOMAIN'))).toBeTruthy()
    })
  })

  describe('📁 File Corruption and Invalid Formats', () => {
    it('should handle corrupted image files', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob(['corrupted-data'], { type: 'image/png' })),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(10)) // Too small for valid image
      })
      
      const parent = document.createElement('div')
      
      // Should handle corrupted image gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should use fallback images or placeholder
      expect(capturedWarnings.some(w => w.includes('corrupted') || w.includes('invalid'))).toBeTruthy()
    })

    it('should handle invalid JSON configuration files', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Unexpected token in JSON')),
        text: () => Promise.resolve('{ invalid json }}')
      })
      
      const parent = document.createElement('div')
      
      // Should use default configuration when JSON is invalid
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      expect(capturedErrors.some(e => e.includes('JSON'))).toBeTruthy()
    })

    it('should handle binary asset corruption', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        arrayBuffer: () => {
          // Return buffer with wrong magic bytes
          const buffer = new ArrayBuffer(100)
          const view = new Uint8Array(buffer)
          view[0] = 0xFF // Wrong magic bytes for any format
          view[1] = 0xFF
          return Promise.resolve(buffer)
        }
      })
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      expect(capturedWarnings.length).toBeGreaterThan(0)
    })
  })

  describe('🔒 Permission and CORS Issues', () => {
    it('should handle CORS violations for external assets', async () => {
      simulateNetworkCondition(networkConditions.corsError)
      
      const parent = document.createElement('div')
      
      // Should fall back to local assets or proceed without external ones
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      expect(capturedErrors.some(e => e.includes('CORS'))).toBeTruthy()
    })

    it('should handle mixed content security issues', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Mixed Content: The page was loaded over HTTPS, but requested an insecure resource')
      )
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      expect(capturedErrors.some(e => e.includes('Mixed Content'))).toBeTruthy()
    })

    it('should handle Content Security Policy violations', async () => {
      global.fetch = vi.fn().mockRejectedValue(
        new Error('Refused to load resource due to Content Security Policy')
      )
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      expect(capturedErrors.some(e => e.includes('Content Security Policy'))).toBeTruthy()
    })
  })

  describe('⏱️ Timeout and Performance Issues', () => {
    it('should handle asset loading timeouts', async () => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(() => {}) // Never resolves (timeout)
      )
      
      const parent = document.createElement('div')
      
      // Should timeout gracefully and continue with available assets
      const initPromise = gameManager.initialize(parent)
      
      // Fast-forward time to trigger timeout
      setTimeout(() => {
        vi.runAllTimers()
      }, 100)
      
      await expect(initPromise).resolves.not.toThrow()
    })

    it('should handle very large asset files on slow connections', async () => {
      global.fetch = vi.fn().mockImplementation(async () => {
        // Simulate very slow download
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['x'.repeat(10000000)])) // 10MB file
        }
      })
      
      const parent = document.createElement('div')
      
      // Should implement progressive loading or streaming
      const startTime = Date.now()
      await gameManager.initialize(parent)
      const duration = Date.now() - startTime
      
      expect(gameManager.isInitialized()).toBe(true)
      // Should not wait for all large assets before starting
      expect(duration).toBeLessThan(10000)
    })

    it('should handle memory pressure during asset loading', async () => {
      // Mock memory pressure scenario
      global.fetch = vi.fn().mockImplementation(async () => {
        // Try to allocate large amount of memory
        try {
          const largeArray = new Array(100000000).fill('memory-pressure')
          return {
            ok: true,
            status: 200,
            blob: () => Promise.resolve(new Blob([JSON.stringify(largeArray)]))
          }
        } catch (error) {
          throw new Error('Out of memory during asset loading')
        }
      })
      
      const parent = document.createElement('div')
      
      // Should handle memory pressure gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })
  })

  describe('📱 Mobile Network Constraints', () => {
    it('should handle data saver mode', async () => {
      // Mock data saver environment
      Object.defineProperty(navigator, 'connection', {
        value: {
          saveData: true,
          effectiveType: '2g'
        },
        writable: true
      })
      
      const parent = document.createElement('div')
      
      await gameManager.initialize(parent)
      
      // Should request lower quality assets or skip non-essential ones
      expect(gameManager.isInitialized()).toBe(true)
    })

    it('should handle mobile network switching (WiFi to cellular)', async () => {
      let connectionType = 'wifi'
      
      global.fetch = vi.fn().mockImplementation(async (url) => {
        if (connectionType === 'cellular') {
          // Simulate slower, more expensive connection
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
        
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['data']))
        }
      })
      
      const parent = document.createElement('div')
      
      // Start loading on WiFi
      const initPromise = gameManager.initialize(parent)
      
      // Switch to cellular mid-loading
      setTimeout(() => {
        connectionType = 'cellular'
      }, 100)
      
      await expect(initPromise).resolves.not.toThrow()
    })

    it('should handle metered connections', async () => {
      // Mock metered connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          saveData: false,
          effectiveType: '4g',
          type: 'cellular'
        },
        writable: true
      })
      
      const parent = document.createElement('div')
      
      await gameManager.initialize(parent)
      
      // Should be considerate of data usage on metered connections
      expect(gameManager.isInitialized()).toBe(true)
    })
  })

  describe('💾 Caching and Storage Issues', () => {
    it('should handle corrupted browser cache', async () => {
      // Mock cache returning corrupted data
      if ('caches' in window) {
        const mockCache = {
          match: vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            blob: () => Promise.resolve(new Blob(['corrupted-cache-data']))
          })
        }
        
        ;(window as any).caches = {
          open: vi.fn().mockResolvedValue(mockCache)
        }
      }
      
      const parent = document.createElement('div')
      
      // Should detect corruption and fetch fresh assets
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
    })

    it('should handle localStorage quota exceeded', async () => {
      // Mock localStorage quota exceeded
      const originalSetItem = localStorage.setItem
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error('QuotaExceededError: Failed to execute setItem on Storage')
      })
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Restore
      localStorage.setItem = originalSetItem
    })

    it('should handle IndexedDB access denied', async () => {
      // Mock IndexedDB being unavailable
      const originalIndexedDB = (window as any).indexedDB
      delete (window as any).indexedDB
      
      const parent = document.createElement('div')
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Restore
      ;(window as any).indexedDB = originalIndexedDB
    })
  })

  describe('📊 Progressive Loading Failures', () => {
    it('should handle critical asset loading failure', async () => {
      // Mock critical assets failing to load
      const criticalAssets = ['game-config.json', 'essential-sprites.png']
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (criticalAssets.some(asset => url.includes(asset))) {
          throw new Error(`Critical asset failed to load: ${url}`)
        }
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['data']))
        }
      })
      
      const parent = document.createElement('div')
      
      // Should fail gracefully or use fallbacks for critical assets
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should log critical asset failures
      expect(capturedErrors.some(e => e.includes('Critical asset failed'))).toBeTruthy()
    })

    it('should handle non-critical asset loading failure', async () => {
      // Mock non-critical assets failing
      const nonCriticalAssets = ['background-music.mp3', 'particle-effects.json']
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (nonCriticalAssets.some(asset => url.includes(asset))) {
          throw new Error(`Non-critical asset failed: ${url}`)
        }
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['data']))
        }
      })
      
      const parent = document.createElement('div')
      
      // Should continue without non-critical assets
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      expect(gameManager.isInitialized()).toBe(true)
      
      // Should warn about missing non-critical assets
      expect(capturedWarnings.some(w => w.includes('Non-critical asset failed'))).toBeTruthy()
    })

    it('should handle partial asset bundle corruption', async () => {
      // Mock asset bundle with some corrupted files
      let requestCount = 0
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        requestCount++
        
        // Every 3rd request is corrupted
        if (requestCount % 3 === 0) {
          return {
            ok: true,
            status: 200,
            blob: () => Promise.resolve(new Blob(['corrupted']))
          }
        }
        
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['valid-data']))
        }
      })
      
      const parent = document.createElement('div')
      
      // Should handle partial corruption gracefully
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      expect(gameManager.isInitialized()).toBe(true)
    })
  })
})

/**
 * Helper: Simulate realistic asset loading scenarios
 */
class AssetLoadingSimulator {
  static simulateRealWorldConditions() {
    const conditions = [
      () => simulateNetworkCondition(networkConditions.slow3G),
      () => simulateNetworkCondition(networkConditions.unstableWifi),
      () => {
        // Random failures
        global.fetch = vi.fn().mockImplementation(async (url) => {
          if (Math.random() < 0.1) { // 10% failure rate
            throw new Error(`Random failure for ${url}`)
          }
          return {
            ok: true,
            status: 200,
            blob: () => Promise.resolve(new Blob(['data']))
          }
        })
      }
    ]
    
    // Apply random condition
    const condition = conditions[Math.floor(Math.random() * conditions.length)]
    condition()
  }
  
  static simulateWorstCaseScenario() {
    global.fetch = vi.fn().mockImplementation(async (url) => {
      // Combine multiple failure modes
      await new Promise(resolve => setTimeout(resolve, 3000)) // Slow
      
      if (Math.random() < 0.3) { // 30% failure rate
        const errors = [
          'Network timeout',
          'CORS error',
          'Service unavailable',
          'File not found',
          'Permission denied'
        ]
        const error = errors[Math.floor(Math.random() * errors.length)]
        throw new Error(error)
      }
      
      // Return potentially corrupted data
      const isCorrupted = Math.random() < 0.1
      const data = isCorrupted ? 'corrupted' : 'valid-data'
      
      return {
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob([data]))
      }
    })
  }
}
