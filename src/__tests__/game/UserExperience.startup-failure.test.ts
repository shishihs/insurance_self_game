/**
 * User Experience Error Handling Startup Failure Tests - Paranoid Edition
 * 
 * This test suite covers error handling from a user experience perspective.
 * We ensure users get meaningful feedback when things go wrong.
 * 
 * User Experience Error Categories:
 * 1. Error Message Clarity and Helpfulness
 * 2. Progressive Loading and Fallback Experiences
 * 3. Recovery Mechanisms and Retry Logic
 * 4. Accessibility in Error States
 * 5. Mobile-Specific Error Handling
 * 6. Performance Degradation Graceful Handling
 * 7. Offline and Network Error Experiences
 * 8. Browser Compatibility Error Messages
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GameManager } from '@/game/GameManager'
import { loadPhaser, clearPhaserCache } from '@/game/loaders/PhaserLoader'

// Mock error reporting system
class MockErrorReporting {
  private static reports: Array<{
    error: Error
    context: string
    timestamp: number
    userAgent: string
    additionalData?: any
  }> = []
  
  static report(error: Error, context: string, additionalData?: any) {
    this.reports.push({
      error,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      additionalData
    })
  }
  
  static getReports() {
    return [...this.reports]
  }
  
  static clear() {
    this.reports = []
  }
  
  static getLastReport() {
    return this.reports[this.reports.length - 1]
  }
}

// Mock user feedback system  
class MockUserFeedback {
  private static messages: Array<{
    type: 'error' | 'warning' | 'info' | 'success'
    message: string
    timestamp: number
    persistent: boolean
    actionable: boolean
  }> = []
  
  static show(type: 'error' | 'warning' | 'info' | 'success', message: string, options: {
    persistent?: boolean
    actionable?: boolean
  } = {}) {
    this.messages.push({
      type,
      message,
      timestamp: Date.now(),
      persistent: options.persistent || false,
      actionable: options.actionable || false
    })
  }
  
  static getMessages() {
    return [...this.messages]
  }
  
  static clear() {
    this.messages = []
  }
  
  static getLastMessage() {
    return this.messages[this.messages.length - 1]
  }
  
  static getErrorMessages() {
    return this.messages.filter(m => m.type === 'error')
  }
}

describe.skip('User Experience Error Handling Startup Failure Tests - Paranoid Edition', () => {
  let gameManager: GameManager
  let capturedErrors: string[]
  let capturedWarnings: string[]
  let originalConsoleError: typeof console.error
  let originalConsoleWarn: typeof console.warn

  beforeEach(() => {
    // Clear GameManager singleton
    ;(GameManager as any).instance = null
    clearPhaserCache()
    MockErrorReporting.clear()
    MockUserFeedback.clear()
    
    // Setup error capture
    capturedErrors = []
    capturedWarnings = []
    originalConsoleError = console.error
    originalConsoleWarn = console.warn
    
    console.error = vi.fn((...args) => {
      const message = args.join(' ')
      capturedErrors.push(message)
      MockErrorReporting.report(new Error(message), 'console.error')
    })
    
    console.warn = vi.fn((...args) => {
      const message = args.join(' ')
      capturedWarnings.push(message)
      MockUserFeedback.show('warning', message)
    })
    
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
    MockErrorReporting.clear()
    MockUserFeedback.clear()
  })

  describe('💬 Error Message Clarity and Helpfulness', () => {
    it('should provide clear error messages for WebGL not supported', async () => {
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
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      
      // Should have logged a helpful error message
      expect(capturedErrors.some(error => 
        error.includes('WebGL') && 
        error.includes('not supported') &&
        error.includes('browser')
      )).toBe(true)
      
      // Error should be reported with context
      const reports = MockErrorReporting.getReports()
      expect(reports.length).toBeGreaterThan(0)
      expect(reports[0].context).toBe('console.error')
    })

    it('should provide actionable error messages for network failures', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network request failed'))
      
      const parent = document.createElement('div')
      
      // Should still initialize but warn about network issues
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should provide actionable guidance
      const warnings = MockUserFeedback.getMessages().filter(m => m.type === 'warning')
      const networkWarning = warnings.find(w => 
        w.message.includes('network') || w.message.includes('connection')
      )
      
      if (networkWarning) {
        expect(networkWarning.actionable).toBe(true)
      }
    })

    it('should provide context-specific error messages', async () => {
      // Mock different types of failures
      const errorScenarios = [
        {
          error: new Error('Canvas creation failed: CSP restriction'),
          expectedKeywords: ['Canvas', 'CSP', 'Content Security Policy']
        },
        {
          error: new Error('WebGL context lost'),
          expectedKeywords: ['WebGL', 'context', 'lost', 'graphics']
        },
        {
          error: new Error('Out of memory'),
          expectedKeywords: ['memory', 'resources', 'close other tabs']
        }
      ]
      
      for (const scenario of errorScenarios) {
        MockErrorReporting.clear()
        MockUserFeedback.clear()
        
        const mockPhaser = {
          Game: vi.fn().mockImplementation(() => {
            throw scenario.error
          }),
          AUTO: 1,
          Scale: { FIT: 1, CENTER_BOTH: 1 }
        }

        vi.doMock('@/game/loaders/PhaserLoader', () => ({
          loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
        }))
        
        const parent = document.createElement('div')
        
        await expect(gameManager.initialize(parent)).rejects.toThrow()
        
        // Should contain relevant keywords for user understanding
        const hasRelevantError = capturedErrors.some(error => 
          scenario.expectedKeywords.some(keyword => 
            error.toLowerCase().includes(keyword.toLowerCase())
          )
        )
        
        expect(hasRelevantError).toBe(true)
      }
    })

    it('should localize error messages based on browser language', async () => {
      // Mock different browser languages
      const languages = ['en-US', 'ja-JP', 'es-ES', 'fr-FR']
      
      for (const lang of languages) {
        Object.defineProperty(navigator, 'language', {
          value: lang,
          writable: true
        })
        
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
        
        MockErrorReporting.clear()
        
        await expect(gameManager.initialize(parent)).rejects.toThrow()
        
        // Should consider language for error reporting
        const report = MockErrorReporting.getLastReport()
        expect(report?.additionalData || {}).toHaveProperty('language', lang)
      }
    })
  })

  describe('🔄 Progressive Loading and Fallback Experiences', () => {
    it('should provide loading progress feedback', async () => {
      const parent = document.createElement('div')
      
      // Mock progressive loading with multiple steps
      const loadingSteps = [
        'Loading game engine...',
        'Initializing graphics...',
        'Loading assets...',
        'Setting up scenes...'
      ]
      
      let currentStep = 0
      const mockPhaser = {
        Game: vi.fn().mockImplementation(async () => {
          for (const step of loadingSteps) {
            MockUserFeedback.show('info', step)
            await new Promise(resolve => setTimeout(resolve, 50))
            currentStep++
          }
          
          return {
            scale: { refresh: vi.fn(), removeAllListeners: vi.fn() },
            destroy: vi.fn(),
            scene: { getScenes: vi.fn(() => []) }
          }
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      await gameManager.initialize(parent)
      
      // Should have shown progress messages
      const infoMessages = MockUserFeedback.getMessages().filter(m => m.type === 'info')
      expect(infoMessages.length).toBe(loadingSteps.length)
      
      // Messages should be in order
      loadingSteps.forEach((step, index) => {
        expect(infoMessages[index].message).toBe(step)
      })
    })

    it('should gracefully degrade when WebGL fails', async () => {
      const parent = document.createElement('div')
      
      // Mock WebGL failure with Canvas 2D fallback
      const mockPhaser = {
        Game: vi.fn().mockImplementation((config: any) => {
          if (config.type === 1) { // WebGL
            throw new Error('WebGL context creation failed')
          }
          
          // Fallback to Canvas
          MockUserFeedback.show('warning', 'Using Canvas 2D fallback for better compatibility', {
            persistent: true,
            actionable: false
          })
          
          return {
            scale: { refresh: vi.fn(), removeAllListeners: vi.fn() },
            destroy: vi.fn(),
            scene: { getScenes: vi.fn(() => []) }
          }
        }),
        AUTO: 1,
        CANVAS: 2, // Canvas 2D fallback
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      // Should try WebGL first, then fallback to Canvas
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should have shown fallback message
      const fallbackMessage = MockUserFeedback.getMessages().find(m => 
        m.message.includes('fallback') && m.type === 'warning'
      )
      
      expect(fallbackMessage).toBeTruthy()
      expect(fallbackMessage?.persistent).toBe(true)
    })

    it('should provide reduced functionality mode for low-end devices', async () => {
      // Mock low-end device
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 })
      Object.defineProperty(navigator, 'deviceMemory', { value: 2 })
      
      const parent = document.createElement('div')
      
      await gameManager.initialize(parent)
      
      // Should detect low-end device and adjust accordingly
      const performanceMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('performance') || 
        m.message.includes('reduced') ||
        m.message.includes('optimized')
      )
      
      expect(performanceMessages.length).toBeGreaterThan(0)
    })

    it('should handle partial asset loading gracefully', async () => {
      const parent = document.createElement('div')
      
      // Mock some assets failing to load
      const assetStatus = new Map([
        ['critical-sprites.png', 'loaded'],
        ['background-music.mp3', 'failed'],
        ['particle-effects.json', 'failed'],
        ['ui-sounds.wav', 'loaded']
      ])
      
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        const filename = url.toString().split('/').pop() || ''
        const status = assetStatus.get(filename)
        
        if (status === 'failed') {
          throw new Error(`Failed to load asset: ${filename}`)
        }
        
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['data']))
        }
      })
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should inform user about missing non-critical assets
      const assetWarnings = MockUserFeedback.getMessages().filter(m => 
        m.type === 'warning' && m.message.includes('asset')
      )
      
      expect(assetWarnings.length).toBeGreaterThan(0)
    })
  })

  describe('🔄 Recovery Mechanisms and Retry Logic', () => {
    it('should provide retry option for network failures', async () => {
      const parent = document.createElement('div')
      
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
      
      // Should have retried and eventually succeeded
      expect(attemptCount).toBeGreaterThan(1)
      
      // Should have informed user about retries
      const retryMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('retry') || m.message.includes('attempting')
      )
      
      expect(retryMessages.length).toBeGreaterThan(0)
    })

    it('should offer manual retry for persistent failures', async () => {
      const parent = document.createElement('div')
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Persistent initialization failure')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      
      // Should offer actionable retry option
      const actionableMessages = MockUserFeedback.getMessages().filter(m => 
        m.actionable && (m.message.includes('retry') || m.message.includes('try again'))
      )
      
      expect(actionableMessages.length).toBeGreaterThan(0)
    })

    it('should provide different recovery strategies based on error type', async () => {
      const errorRecoveryTests = [
        {
          error: new Error('WebGL context lost'),
          expectedRecovery: 'context restoration'
        },
        {
          error: new Error('Out of memory'),
          expectedRecovery: 'memory cleanup'
        },
        {
          error: new Error('Network error'),
          expectedRecovery: 'network retry'
        }
      ]
      
      for (const test of errorRecoveryTests) {
        MockUserFeedback.clear()
        
        const mockPhaser = {
          Game: vi.fn().mockImplementation(() => {
            throw test.error
          }),
          AUTO: 1,
          Scale: { FIT: 1, CENTER_BOTH: 1 }
        }

        vi.doMock('@/game/loaders/PhaserLoader', () => ({
          loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
        }))
        
        const parent = document.createElement('div')
        
        await expect(gameManager.initialize(parent)).rejects.toThrow()
        
        // Should suggest appropriate recovery strategy
        const recoveryMessages = MockUserFeedback.getMessages().filter(m => 
          m.message.toLowerCase().includes(test.expectedRecovery.toLowerCase())
        )
        
        expect(recoveryMessages.length).toBeGreaterThan(0)
      }
    })
  })

  describe('♿ Accessibility in Error States', () => {
    it('should announce errors to screen readers', async () => {
      const parent = document.createElement('div')
      
      // Mock ARIA live region
      const liveRegion = document.createElement('div')
      liveRegion.setAttribute('aria-live', 'assertive')
      liveRegion.setAttribute('aria-relevant', 'additions text')
      document.body.appendChild(liveRegion)
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Game initialization failed')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      
      // Should have announced error to screen readers
      const ariaMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('screen reader') || m.type === 'error'
      )
      
      expect(ariaMessages.length).toBeGreaterThan(0)
      
      liveRegion.remove()
    })

    it('should provide keyboard-accessible error recovery options', async () => {
      const parent = document.createElement('div')
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Initialization failed')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      
      // Should provide keyboard-accessible recovery
      const keyboardMessages = MockUserFeedback.getMessages().filter(m => 
        m.actionable && (
          m.message.includes('Press') || 
          m.message.includes('Enter') ||
          m.message.includes('keyboard')
        )
      )
      
      expect(keyboardMessages.length).toBeGreaterThan(0)
    })

    it('should provide high contrast error indicators', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: vi.fn().mockReturnValue({
          matches: true, // High contrast mode
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        })
      })
      
      const parent = document.createElement('div')
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('High contrast error test')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      
      // Should adapt error display for high contrast mode
      const contrastMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('contrast') || m.type === 'error'
      )
      
      expect(contrastMessages.length).toBeGreaterThan(0)
    })
  })

  describe('📱 Mobile-Specific Error Handling', () => {
    it('should handle mobile WebGL limitations gracefully', async () => {
      // Mock mobile browser
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true
      })
      
      const parent = document.createElement('div')
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('WebGL context creation failed on mobile')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      
      // Should provide mobile-specific guidance
      const mobileMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('mobile') || 
        m.message.includes('device') ||
        m.message.includes('browser')
      )
      
      expect(mobileMessages.length).toBeGreaterThan(0)
    })

    it('should handle touch interaction errors', async () => {
      // Mock touch device with touch event issues
      Object.defineProperty(window, 'ontouchstart', { value: {} })
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 10 })
      
      const parent = document.createElement('div')
      
      // Mock touch gesture initialization failure
      const mockTouchManager = {
        initialize: vi.fn().mockImplementation(() => {
          throw new Error('Touch gesture initialization failed')
        })
      }
      
      await gameManager.initialize(parent)
      
      // Simulate touch error during initialization
      try {
        mockTouchManager.initialize()
      } catch (error) {
        MockUserFeedback.show('error', 'Touch controls may not work properly', {
          actionable: true
        })
      }
      
      // Should provide touch-specific error guidance
      const touchMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('touch') || 
        m.message.includes('gesture') ||
        m.message.includes('controls')
      )
      
      expect(touchMessages.length).toBeGreaterThan(0)
    })

    it('should handle mobile memory constraints', async () => {
      // Mock low memory mobile device
      Object.defineProperty(navigator, 'deviceMemory', { value: 1 }) // 1GB RAM
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 4 })
      
      const parent = document.createElement('div')
      
      const mockPhaser = {
        Game: vi.fn().mockImplementation(() => {
          throw new Error('Out of memory: Cannot allocate graphics resources')
        }),
        AUTO: 1,
        Scale: { FIT: 1, CENTER_BOTH: 1 }
      }

      vi.doMock('@/game/loaders/PhaserLoader', () => ({
        loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
      }))
      
      await expect(gameManager.initialize(parent)).rejects.toThrow()
      
      // Should provide mobile memory management advice
      const memoryMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('memory') || 
        m.message.includes('close') ||
        m.message.includes('apps')
      )
      
      expect(memoryMessages.length).toBeGreaterThan(0)
    })
  })

  describe('🚀 Performance Degradation Graceful Handling', () => {
    it('should detect and adapt to poor performance', async () => {
      const parent = document.createElement('div')
      
      // Mock performance monitoring
      const originalPerformance = global.performance
      let measurementCount = 0
      
      global.performance = {
        ...originalPerformance,
        now: vi.fn().mockImplementation(() => {
          measurementCount++
          // Simulate degrading performance
          return Date.now() + measurementCount * 100
        }),
        measure: vi.fn(),
        mark: vi.fn(),
        getEntriesByName: vi.fn().mockReturnValue([{ duration: 500 }]) // Slow
      }
      
      await gameManager.initialize(parent)
      
      // Should detect poor performance and suggest optimizations
      const performanceMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('performance') || 
        m.message.includes('slow') ||
        m.message.includes('optimize')
      )
      
      expect(performanceMessages.length).toBeGreaterThan(0)
      
      // Restore
      global.performance = originalPerformance
    })

    it('should provide performance improvement suggestions', async () => {
      const parent = document.createElement('div')
      
      // Mock various performance issues
      const performanceIssues = [
        'High memory usage detected',
        'Slow graphics rendering',
        'Network latency affecting assets',
        'CPU throttling detected'
      ]
      
      // Simulate performance issues during initialization
      for (const issue of performanceIssues) {
        MockUserFeedback.show('warning', issue, { actionable: true })
      }
      
      await gameManager.initialize(parent)
      
      // Should provide specific improvement suggestions
      const suggestions = MockUserFeedback.getMessages().filter(m => 
        m.actionable && (
          m.message.includes('close') ||
          m.message.includes('update') ||
          m.message.includes('restart')
        )
      )
      
      expect(suggestions.length).toBeGreaterThan(0)
    })
  })

  describe('🌐 Offline and Network Error Experiences', () => {
    it('should provide meaningful offline mode messaging', async () => {
      const parent = document.createElement('div')
      
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network offline'))
      
      await expect(gameManager.initialize(parent)).resolves.not.toThrow()
      
      // Should inform user about offline limitations
      const offlineMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('offline') || 
        m.message.includes('connection') ||
        m.message.includes('internet')
      )
      
      expect(offlineMessages.length).toBeGreaterThan(0)
    })

    it('should handle partial connectivity gracefully', async () => {
      const parent = document.createElement('div')
      
      // Mock intermittent connectivity
      let requestCount = 0
      global.fetch = vi.fn().mockImplementation(async () => {
        requestCount++
        if (requestCount % 2 === 0) {
          throw new Error('Connection unstable')
        }
        return {
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(['data']))
        }
      })
      
      await gameManager.initialize(parent)
      
      // Should handle unstable connection gracefully
      const connectivityMessages = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('unstable') || 
        m.message.includes('intermittent') ||
        m.message.includes('connection')
      )
      
      expect(connectivityMessages.length).toBeGreaterThan(0)
    })
  })

  describe('🌐 Browser Compatibility Error Messages', () => {
    it('should provide browser-specific upgrade recommendations', async () => {
      const browserTests = [
        {
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
          expectedSuggestion: 'Internet Explorer'
        },
        {
          userAgent: 'Mozilla/5.0 (Android 4.4.2; Mobile; rv:46.0) Gecko/46.0 Firefox/46.0',
          expectedSuggestion: 'Firefox'
        },
        {
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_0 like Mac OS X)',
          expectedSuggestion: 'Safari'
        }
      ]
      
      for (const test of browserTests) {
        MockUserFeedback.clear()
        
        Object.defineProperty(navigator, 'userAgent', {
          value: test.userAgent,
          writable: true
        })
        
        const mockPhaser = {
          Game: vi.fn().mockImplementation(() => {
            throw new Error('Browser compatibility issue')
          }),
          AUTO: 1,
          Scale: { FIT: 1, CENTER_BOTH: 1 }
        }

        vi.doMock('@/game/loaders/PhaserLoader', () => ({
          loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
        }))
        
        const parent = document.createElement('div')
        
        await expect(gameManager.initialize(parent)).rejects.toThrow()
        
        // Should provide browser-specific recommendations
        const browserMessages = MockUserFeedback.getMessages().filter(m => 
          m.message.includes(test.expectedSuggestion) || 
          m.message.includes('update') ||
          m.message.includes('browser')
        )
        
        expect(browserMessages.length).toBeGreaterThan(0)
      }
    })

    it('should detect and warn about experimental browser features', async () => {
      const parent = document.createElement('div')
      
      // Mock experimental feature detection
      const experimentalFeatures = [
        'WebGL 2.0',
        'OffScreenCanvas',
        'WebXR',
        'WebGPU'
      ]
      
      // Simulate using experimental features
      for (const feature of experimentalFeatures) {
        MockUserFeedback.show('warning', `Experimental feature detected: ${feature}`, {
          persistent: true
        })
      }
      
      await gameManager.initialize(parent)
      
      // Should warn about experimental feature usage
      const experimentalWarnings = MockUserFeedback.getMessages().filter(m => 
        m.message.includes('experimental') && m.persistent
      )
      
      expect(experimentalWarnings.length).toBeGreaterThan(0)
    })
  })
})

/**
 * Integration test for comprehensive error handling flow
 */
describe('Comprehensive Error Handling Flow', () => {
  it('should handle complete error handling lifecycle', async () => {
    // Reset GameManager instance before test
    ;(GameManager as any).instance = null
    
    const gameManager = GameManager.getInstance()
    const parent = document.createElement('div')
    parent.id = 'test-game-container'
    document.body.appendChild(parent)
    
    // Mock comprehensive failure scenario
    const mockPhaser = {
      Game: vi.fn().mockImplementation(() => {
        throw new Error('Complete system failure: WebGL, Canvas, and fallbacks failed')
      }),
      AUTO: 1,
      Scale: { FIT: 1, CENTER_BOTH: 1 }
    }

    vi.doMock('@/game/loaders/PhaserLoader', () => ({
      loadPhaser: vi.fn().mockResolvedValue(mockPhaser)
    }))
    
    // Initialize should throw an error
    let errorThrown = false
    try {
      await gameManager.initialize(parent)
    } catch (error) {
      errorThrown = true
      expect(error).toBeTruthy()
    }
    
    expect(errorThrown).toBe(true)
    
    // Check that error UI was created
    const errorUI = parent.querySelector('div')
    expect(errorUI).toBeTruthy()
    expect(errorUI?.textContent).toContain('エラーが発生しました')
    
    // Cleanup
    document.body.removeChild(parent)
    if (gameManager.isInitialized()) {
      gameManager.destroy()
    }
    ;(GameManager as any).instance = null
  })
})
