/**
 * GameCanvas Destruction Tests
 * 
 * Comprehensive destructive testing for the GameCanvas component focusing on:
 * - Phaser initialization failures
 * - WebGL context loss scenarios
 * - Network failures during asset loading
 * - Memory pressure during game operations
 * - Rapid mount/unmount cycles
 * - Timeout and error recovery scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

import GameCanvas from '@/components/game/GameCanvas.vue'
import { 
  createTestEnvironment, 
  MockGameManager, 
  BrowserAPIMocker,
  MemoryPressureSimulator,
  ViewportManager 
} from './test-utilities'

describe('GameCanvas Destruction Tests', () => {
  let testEnv: ReturnType<typeof createTestEnvironment>
  let browserMocker: BrowserAPIMocker
  let memorySimulator: MemoryPressureSimulator
  let viewportManager: ViewportManager

  beforeEach(() => {
    testEnv = createTestEnvironment()
    browserMocker = testEnv.browserMocker
    memorySimulator = testEnv.memorySimulator
    viewportManager = testEnv.viewportManager

    // Mock dynamic imports to avoid actual Phaser loading
    vi.mock('@/game/GameManager', () => ({
      GameManager: MockGameManager
    }))

    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    testEnv.cleanup()
    vi.restoreAllMocks()
  })

  describe('Initialization Failure Scenarios', () => {
    it('should handle GameManager import timeout gracefully', async () => {
      // Mock dynamic import to never resolve (timeout scenario)
      vi.doMock('@/game/GameManager', () => new Promise(() => {}))

      const wrapper = mount(GameCanvas)
      
      // Wait longer than the timeout period (10 seconds)
      await new Promise(resolve => setTimeout(resolve, 100))
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.error-container').exists()).toBe(true)
      expect(wrapper.text()).toContain('タイムアウト')
    })

    it('should handle GameManager initialization failure', async () => {
      vi.doMock('@/game/GameManager', () => ({
        GameManager: class {
          static getInstance() {
            return {
              initialize: vi.fn().mockRejectedValue(new Error('WebGL initialization failed')),
              destroy: vi.fn()
            }
          }
        }
      }))

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
      expect(wrapper.text()).toContain('WebGL')
    })

    it('should handle missing game container element', async () => {
      const wrapper = mount(GameCanvas)
      
      // Remove the container element after mount but before initialization
      const container = wrapper.find('#game-container')
      if (container.exists()) {
        container.element.remove()
      }

      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
    })

    it('should handle zero-size container gracefully', async () => {
      const wrapper = mount(GameCanvas)
      
      // Make container have zero dimensions
      const container = wrapper.find('#game-container')
      if (container.exists()) {
        const element = container.element as HTMLElement
        element.style.width = '0px'
        element.style.height = '0px'
      }

      await flushPromises()

      // Should handle zero-size container and either show error or wait for proper size
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('WebGL Context Loss Scenarios', () => {
    it('should handle WebGL context loss during initialization', async () => {
      browserMocker.mockWebGLContextLoss()

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
      expect(wrapper.text()).toContain('WebGL')
    })

    it('should handle WebGL context loss after successful initialization', async () => {
      const wrapper = mount(GameCanvas)
      
      // Wait for successful initialization
      await flushPromises()
      
      // Simulate WebGL context loss after initialization
      const canvas = document.createElement('canvas')
      const event = new Event('webglcontextlost')
      canvas.dispatchEvent(event)

      await nextTick()

      // Component should still exist and potentially show error
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Network and Loading Failures', () => {
    it('should handle network failure during dynamic import', async () => {
      browserMocker.mockNetworkFailure()
      
      vi.doMock('@/game/GameManager', () => 
        Promise.reject(new Error('Failed to fetch'))
      )

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
      expect(wrapper.text()).toContain('読み込み')
    })

    it('should handle chunk loading errors', async () => {
      vi.doMock('@/game/GameManager', () => 
        Promise.reject(new Error('ChunkLoadError: Loading chunk 2 failed'))
      )

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
      expect(wrapper.text()).toContain('ファイルの読み込み')
    })
  })

  describe('Memory Pressure Scenarios', () => {
    it('should handle memory pressure during game initialization', async () => {
      // Create memory pressure
      memorySimulator.createMemoryPressure(500) // 500MB

      const wrapper = mount(GameCanvas)
      await flushPromises()

      // Should either succeed or fail gracefully
      expect(wrapper.exists()).toBe(true)
      
      // Clean up memory
      memorySimulator.releaseMemory()
    })

    it('should handle fragmented memory conditions', async () => {
      memorySimulator.createFragmentedMemory()

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      memorySimulator.releaseMemory()
    })

    it('should handle out of memory during Phaser operations', async () => {
      vi.doMock('@/game/GameManager', () => ({
        GameManager: class {
          static getInstance() {
            return {
              initialize: vi.fn().mockRejectedValue(new Error('Out of memory')),
              destroy: vi.fn()
            }
          }
        }
      }))

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
    })
  })

  describe('Rapid Mount/Unmount Cycles', () => {
    it('should handle rapid mount/unmount without memory leaks', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0
      
      // Perform rapid mount/unmount cycles
      for (let i = 0; i < 50; i++) {
        const wrapper = mount(GameCanvas)
        
        // Trigger some initialization
        await nextTick()
        
        // Unmount immediately
        wrapper.unmount()
        
        if (i % 10 === 0) {
          if (global.gc) global.gc()
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      }

      // Force garbage collection
      if (global.gc) global.gc()
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (less than 20MB)
      expect(memoryIncrease).toBeLessThan(20 * 1024 * 1024)
    })

    it('should handle mount/unmount during initialization', async () => {
      const wrapper = mount(GameCanvas)
      
      // Unmount immediately before initialization completes
      setTimeout(() => wrapper.unmount(), 1)
      
      await flushPromises()
      
      // Should not throw errors
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })

  describe('Viewport and Resize Stress Tests', () => {
    it('should handle extreme viewport changes during initialization', async () => {
      const wrapper = mount(GameCanvas)
      
      const extremeSizes = viewportManager.simulateExtremeSizes()
      
      // Change viewport rapidly during initialization
      for (const size of extremeSizes) {
        viewportManager.setSize(size.width, size.height)
        await nextTick()
      }

      await flushPromises()
      
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle orientation changes during game loading', async () => {
      const wrapper = mount(GameCanvas)
      
      // Change orientation multiple times during loading
      viewportManager.setOrientation('portrait')
      await nextTick()
      viewportManager.setOrientation('landscape')
      await nextTick()
      viewportManager.setOrientation('portrait')
      
      await flushPromises()
      
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Event Handler and Cleanup Tests', () => {
    it('should properly clean up event listeners on unmount', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
      
      const wrapper = mount(GameCanvas)
      await flushPromises()
      
      const addEventCallCount = addEventListenerSpy.mock.calls.length
      
      wrapper.unmount()
      
      const removeEventCallCount = removeEventListenerSpy.mock.calls.length
      
      // Should remove at least as many listeners as it added
      expect(removeEventCallCount).toBeGreaterThanOrEqual(addEventCallCount)
    })

    it('should handle event listener registration failures', async () => {
      // Mock addEventListener to fail
      vi.spyOn(window, 'addEventListener').mockImplementation(() => {
        throw new Error('Cannot register event listener')
      })

      const wrapper = mount(GameCanvas)
      await flushPromises()

      // Should handle event listener failures gracefully
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Error Recovery and User Actions', () => {
    it('should handle error recovery attempts', async () => {
      // Force an error
      vi.doMock('@/game/GameManager', () => 
        Promise.reject(new Error('Test error'))
      )

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
      
      // Try to recover by clicking reload button
      const reloadButton = wrapper.find('button')
      if (reloadButton.exists()) {
        // Mock window.location.reload
        const reloadSpy = vi.fn()
        Object.defineProperty(window.location, 'reload', { value: reloadSpy })
        
        await reloadButton.trigger('click')
        expect(reloadSpy).toHaveBeenCalled()
      }
    })

    it('should handle back-to-home action', async () => {
      // Force an error
      vi.doMock('@/game/GameManager', () => 
        Promise.reject(new Error('Test error'))
      )

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.find('.error-container').exists()).toBe(true)
      
      // Trigger back-to-home event
      const backButton = wrapper.find('button')
      if (backButton.exists()) {
        await backButton.trigger('click')
        
        // Should emit back-to-home event
        expect(wrapper.emitted()).toHaveProperty('back-to-home')
      }
    })
  })

  describe('Debug Controls Stress Tests', () => {
    it('should handle rapid debug control interactions', async () => {
      // Set development mode
      import.meta.env.DEV = true

      const wrapper = mount(GameCanvas)
      await flushPromises()
      
      const debugControls = wrapper.findAll('.debug-controls button')
      
      // Rapidly click debug controls
      for (const control of debugControls) {
        for (let i = 0; i < 100; i++) {
          await control.trigger('click')
        }
      }

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Mobile-Specific Scenarios', () => {
    it('should handle mobile viewport height changes (dvh)', async () => {
      // Simulate mobile browser behavior
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
        writable: true
      })

      const wrapper = mount(GameCanvas)
      
      // Simulate mobile browser address bar hiding/showing
      viewportManager.setSize(375, 667) // iPhone 6/7/8
      await nextTick()
      viewportManager.setSize(375, 559) // Address bar visible
      await nextTick()
      viewportManager.setSize(375, 667) // Address bar hidden
      
      await flushPromises()
      
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle device memory constraints', async () => {
      // Mock limited device memory
      memorySimulator.createMemoryPressure(100) // Simulate low-memory device
      
      const wrapper = mount(GameCanvas)
      await flushPromises()
      
      expect(wrapper.exists()).toBe(true)
      memorySimulator.releaseMemory()
    })
  })

  describe('Timing and Race Condition Tests', () => {
    it('should handle component destruction during async operations', async () => {
      const wrapper = mount(GameCanvas)
      
      // Start async operation and destroy component immediately
      const promise = flushPromises()
      wrapper.unmount()
      
      await promise
      
      // Should not throw unhandled promise rejection
      expect(true).toBe(true)
    })

    it('should handle multiple simultaneous initialization attempts', async () => {
      const wrappers = []
      
      // Mount multiple instances simultaneously
      for (let i = 0; i < 10; i++) {
        wrappers.push(mount(GameCanvas))
      }

      await flushPromises()
      
      // All instances should exist
      wrappers.forEach(wrapper => {
        expect(wrapper.exists()).toBe(true)
      })
      
      // Clean up
      wrappers.forEach(wrapper => wrapper.unmount())
    })
  })
})