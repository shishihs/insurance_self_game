/**
 * Browser Compatibility Destructive Tests
 * 
 * Comprehensive testing for browser API failures and compatibility edge cases:
 * - JavaScript API unavailability
 * - Feature detection failures
 * - Legacy browser simulation
 * - WebAPI permission failures
 * - Memory and performance API limitations
 * - Third-party script interference
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

import GameCanvas from '@/components/game/GameCanvas.vue'
import OptimizedGameInterface from '@/components/mobile/OptimizedGameInterface.vue'
import SwipeableCardStack from '@/components/mobile/SwipeableCardStack.vue'
import MobileBottomNav from '@/components/mobile/MobileBottomNav.vue'
import AccessibilitySettings from '@/components/accessibility/AccessibilitySettings.vue'
import ErrorBoundary from '@/components/error/ErrorBoundary.vue'

import { 
  createTestEnvironment,
  BrowserAPIMocker,
  mockDeviceInfo
} from './test-utilities'

describe('Browser Compatibility Destructive Tests', () => {
  let testEnv: ReturnType<typeof createTestEnvironment>
  let browserMocker: BrowserAPIMocker
  let originalApis: Map<string, any> = new Map()

  // Store original APIs for restoration
  const storeOriginalAPI = (path: string, api: any) => {
    originalApis.set(path, api)
  }

  beforeEach(() => {
    testEnv = createTestEnvironment()
    browserMocker = testEnv.browserMocker

    // Store original APIs
    storeOriginalAPI('navigator.userAgent', navigator.userAgent)
    storeOriginalAPI('window.requestAnimationFrame', window.requestAnimationFrame)
    storeOriginalAPI('window.localStorage', window.localStorage)
    storeOriginalAPI('navigator.vibrate', (navigator as any).vibrate)
    storeOriginalAPI('navigator.clipboard', navigator.clipboard)
  })

  afterEach(() => {
    // Restore all APIs
    originalApis.forEach((originalApi, path) => {
      const pathParts = path.split('.')
      let obj: any = window
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        obj = obj[pathParts[i]]
      }
      
      if (originalApi !== undefined) {
        obj[pathParts[pathParts.length - 1]] = originalApi
      } else {
        delete obj[pathParts[pathParts.length - 1]]
      }
    })
    
    originalApis.clear()
    testEnv.cleanup()
    vi.restoreAllMocks()
  })

  describe('JavaScript API Unavailability Tests', () => {
    it('should handle missing requestAnimationFrame API', async () => {
      // Remove requestAnimationFrame
      delete (window as any).requestAnimationFrame
      delete (window as any).webkitRequestAnimationFrame
      delete (window as any).mozRequestAnimationFrame

      const wrapper = mount(SwipeableCardStack, {
        props: {
          cards: [
            { id: '1', content: 'Card 1' },
            { id: '2', content: 'Card 2' }
          ]
        }
      })

      await nextTick()

      // Should fallback to setTimeout or handle gracefully
      expect(wrapper.exists()).toBe(true)
      
      // Try to perform animation-dependent actions
      const cardElement = wrapper.find('.swipeable-card')
      if (cardElement.exists()) {
        await cardElement.trigger('touchstart', {
          touches: [{ identifier: 0, clientX: 100, clientY: 100 }]
        })
        await cardElement.trigger('touchmove', {
          touches: [{ identifier: 0, clientX: 200, clientY: 100 }]
        })
        await cardElement.trigger('touchend', {
          changedTouches: [{ identifier: 0 }]
        })
      }

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle missing localStorage API', async () => {
      // Remove localStorage
      delete (window as any).localStorage

      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // Should work without persistence
      expect(wrapper.exists()).toBe(true)
      
      // Try to change settings (should not persist but shouldn't crash)
      const colorSchemeSelect = wrapper.find('#color-scheme')
      if (colorSchemeSelect.exists()) {
        await colorSchemeSelect.setValue('protanopia')
      }

      const fontSizeSelect = wrapper.find('#font-size')
      if (fontSizeSelect.exists()) {
        await fontSizeSelect.setValue('large')
      }

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle missing console API', async () => {
      // Remove console methods
      const originalConsole = window.console
      delete (window as any).console

      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: '<div>Test content</div>'
        }
      })

      await nextTick()

      // Should work without console logging
      expect(wrapper.exists()).toBe(true)

      // Restore console
      window.console = originalConsole
    })

    it('should handle missing performance API', async () => {
      // Remove performance API
      delete (window as any).performance

      const wrapper = mount(OptimizedGameInterface, {
        props: {
          sections: [
            { id: 'test', label: 'Test', icon: '🎮', component: 'TestComponent' }
          ],
          performanceMode: 'auto'
        }
      })

      await nextTick()

      // Should fallback gracefully without performance monitoring
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Feature Detection Failures', () => {
    it('should handle environments where CSS.supports is missing', async () => {
      // Remove CSS.supports
      delete (window as any).CSS

      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // Should assume feature support or have fallbacks
      expect(wrapper.exists()).toBe(true)
      
      // Try to apply color filters without CSS.supports
      const colorSchemeSelect = wrapper.find('#color-scheme')
      if (colorSchemeSelect.exists()) {
        await colorSchemeSelect.setValue('deuteranopia')
      }

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle browsers without touch event support', async () => {
      // Mock no touch support
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0 })
      delete (window as any).TouchEvent
      delete (window as any).ontouchstart

      const wrapper = mount(SwipeableCardStack, {
        props: {
          cards: [{ id: '1', content: 'Card 1' }]
        }
      })

      await nextTick()

      // Should work with mouse events as fallback
      expect(wrapper.exists()).toBe(true)
      
      const cardElement = wrapper.find('.swipeable-card')
      if (cardElement.exists()) {
        // Try mouse-based interaction
        await cardElement.trigger('mousedown', { clientX: 100, clientY: 100 })
        await cardElement.trigger('mousemove', { clientX: 200, clientY: 100 })
        await cardElement.trigger('mouseup')
      }

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle missing Intersection Observer', async () => {
      // Remove IntersectionObserver
      delete (global as any).IntersectionObserver

      const wrapper = mount(OptimizedGameInterface, {
        props: {
          sections: Array.from({ length: 10 }, (_, i) => ({
            id: `section-${i}`,
            label: `Section ${i}`,
            icon: '🎮',
            component: 'TestComponent'
          }))
        }
      })

      await nextTick()

      // Should work without intersection observation
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle missing ResizeObserver', async () => {
      // Remove ResizeObserver
      delete (global as any).ResizeObserver

      const wrapper = mount(GameCanvas)
      await flushPromises()

      // Should handle resizing without ResizeObserver
      expect(wrapper.exists()).toBe(true)
      
      // Simulate manual resize
      Object.defineProperty(window, 'innerWidth', { value: 800 })
      Object.defineProperty(window, 'innerHeight', { value: 600 })
      window.dispatchEvent(new Event('resize'))
      
      await nextTick()
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Legacy Browser Simulation', () => {
    it('should work in Internet Explorer 11 environment', async () => {
      // Mock IE11 environment
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
        configurable: true
      })

      // Remove modern APIs
      delete (window as any).fetch
      delete (window as any).Promise
      delete (window as any).Map
      delete (window as any).Set
      delete (window as any).Symbol

      // Mock old-style event handling
      const originalAddEventListener = Element.prototype.addEventListener
      Element.prototype.addEventListener = function(event: string, handler: any) {
        // Mock IE8 style attachEvent fallback
        if (this.attachEvent) {
          this.attachEvent('on' + event, handler)
        } else {
          originalAddEventListener.call(this, event, handler)
        }
      }

      const wrapper = mount(ErrorBoundary, {
        slots: {
          default: '<div>Legacy browser test</div>'
        }
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)

      // Restore
      Element.prototype.addEventListener = originalAddEventListener
    })

    it('should work with limited ES6 support', async () => {
      // Mock environment without arrow functions, const/let
      const originalFunction = window.Function
      
      // Mock old JavaScript environment
      window.Function = function(...args: any[]) {
        const code = args[args.length - 1]
        
        // Simulate syntax error for arrow functions
        if (typeof code === 'string' && code.includes('=>')) {
          throw new SyntaxError('Unexpected token =>')
        }
        
        return originalFunction.apply(this, args)
      } as any

      const wrapper = mount(MobileBottomNav, {
        props: {
          items: [
            { id: 'home', label: 'Home', icon: '🏠' }
          ],
          activeId: 'home'
        }
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)

      // Restore
      window.Function = originalFunction
    })
  })

  describe('WebAPI Permission Failures', () => {
    it('should handle clipboard API permission denied', async () => {
      // Mock clipboard API that fails
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied'))
        },
        configurable: true
      })

      const wrapper = mount(ErrorBoundary, {
        props: { fallback: 'detailed' }
      })

      await nextTick()

      // Force an error to show error boundary
      const ProblematicComponent = {
        setup() {
          throw new Error('Test error')
        },
        template: '<div>Should not render</div>'
      }

      const errorWrapper = mount(ErrorBoundary, {
        slots: { default: ProblematicComponent }
      })

      await nextTick()

      // Try to copy error details (should handle permission failure)
      const copyButton = errorWrapper.find('button')
      let copyButtonFound = false
      
      const buttons = errorWrapper.findAll('button')
      for (const button of buttons) {
        if (button.text().includes('詳細をコピー') || button.text().includes('コピー')) {
          await button.trigger('click')
          copyButtonFound = true
          break
        }
      }

      expect(errorWrapper.exists()).toBe(true)
    })

    it('should handle wake lock API failures', async () => {
      // Mock wake lock API that fails
      Object.defineProperty(navigator, 'wakeLock', {
        value: {
          request: vi.fn().mockRejectedValue(new Error('Wake lock not allowed'))
        },
        configurable: true
      })

      const wrapper = mount(OptimizedGameInterface, {
        props: {
          sections: [{ id: 'test', label: 'Test', icon: '🎮', component: 'TestComponent' }]
        }
      })

      await nextTick()

      // Should handle wake lock failure gracefully
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle vibration API failures', async () => {
      // Mock vibration API that fails
      Object.defineProperty(navigator, 'vibrate', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('Vibration not supported')
        }),
        configurable: true
      })

      const wrapper = mount(SwipeableCardStack, {
        props: {
          cards: [{ id: '1', content: 'Card 1' }]
        }
      })

      await nextTick()

      const cardElement = wrapper.find('.swipeable-card')
      if (cardElement.exists()) {
        // Perform swipe that would normally trigger vibration
        await cardElement.trigger('touchstart', {
          touches: [{ identifier: 0, clientX: 100, clientY: 100 }]
        })
        await cardElement.trigger('touchmove', {
          touches: [{ identifier: 0, clientX: 300, clientY: 100 }]
        })
        await cardElement.trigger('touchend', {
          changedTouches: [{ identifier: 0 }]
        })
      }

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Memory and Performance API Limitations', () => {
    it('should handle missing performance.memory API', async () => {
      // Remove performance.memory
      Object.defineProperty(performance, 'memory', {
        value: undefined,
        configurable: true
      })

      const wrapper = mount(OptimizedGameInterface, {
        props: {
          sections: [{ id: 'test', label: 'Test', icon: '🎮', component: 'TestComponent' }],
          performanceMode: 'auto'
        }
      })

      await nextTick()

      // Should work without memory monitoring
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle PerformanceObserver failures', async () => {
      // Mock PerformanceObserver that fails
      global.PerformanceObserver = vi.fn().mockImplementation(() => {
        return {
          observe: vi.fn(() => { throw new Error('PerformanceObserver failed') }),
          disconnect: vi.fn()
        }
      })

      const wrapper = mount(OptimizedGameInterface, {
        props: {
          sections: [{ id: 'test', label: 'Test', icon: '🎮', component: 'TestComponent' }],
          performanceMode: 'auto'
        }
      })

      await nextTick()

      // Should handle PerformanceObserver failure gracefully
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle memory pressure without garbage collection API', async () => {
      // Remove gc from global
      delete (global as any).gc

      // Create memory pressure scenario
      const largeData = new Array(1000000).fill('memory pressure test')
      
      const wrapper = mount(SwipeableCardStack, {
        props: {
          cards: Array.from({ length: 1000 }, (_, i) => ({
            id: `card-${i}`,
            content: `Card ${i} ${largeData[i % 100]}`
          }))
        }
      })

      await nextTick()

      // Should handle large datasets without gc
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Third-Party Script Interference', () => {
    it('should handle global variable pollution', async () => {
      // Pollute global namespace
      const globalPollution = {
        Vue: 'not-vue',
        React: 'fake-react',
        jQuery: 'fake-jquery',
        $: 'fake-dollar',
        _: 'fake-underscore',
        moment: 'fake-moment'
      }

      Object.keys(globalPollution).forEach(key => {
        (window as any)[key] = globalPollution[key as keyof typeof globalPollution]
      })

      const wrapper = mount(OptimizedGameInterface, {
        props: {
          sections: [{ id: 'test', label: 'Test', icon: '🎮', component: 'TestComponent' }]
        }
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)

      // Clean up pollution
      Object.keys(globalPollution).forEach(key => {
        delete (window as any)[key]
      })
    })

    it('should handle prototype pollution attacks', async () => {
      // Simulate prototype pollution
      (Object.prototype as any).__proto__ = { malicious: 'payload' };
      (Array.prototype as any).__proto__ = { evil: 'code' }

      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)

      // Clean up prototype pollution
      delete (Object.prototype as any).__proto__
      delete (Array.prototype as any).__proto__
    })

    it('should handle modified native method behaviors', async () => {
      // Modify native methods
      const originalPush = Array.prototype.push
      const originalStringify = JSON.stringify
      const originalParse = JSON.parse

      Array.prototype.push = function(...items: any[]) {
        // Modified push that sometimes fails
        if (Math.random() < 0.1) {
          throw new Error('Modified push failed')
        }
        return originalPush.apply(this, items)
      }

      JSON.stringify = function(value: any) {
        // Modified stringify that sometimes returns invalid data
        if (typeof value === 'object' && Math.random() < 0.1) {
          return 'invalid-json'
        }
        return originalStringify(value)
      }

      JSON.parse = function(text: string) {
        // Modified parse that sometimes fails
        if (Math.random() < 0.1) {
          throw new Error('Modified parse failed')
        }
        return originalParse(text)
      }

      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // Try operations that use these methods
      const colorSchemeSelect = wrapper.find('#color-scheme')
      if (colorSchemeSelect.exists()) {
        await colorSchemeSelect.setValue('protanopia')
      }

      expect(wrapper.exists()).toBe(true)

      // Restore native methods
      Array.prototype.push = originalPush
      JSON.stringify = originalStringify
      JSON.parse = originalParse
    })
  })

  describe('Network and Connectivity Edge Cases', () => {
    it('should handle offline mode', async () => {
      // Mock offline mode
      Object.defineProperty(navigator, 'onLine', { value: false })
      
      // Mock failed network requests
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const wrapper = mount(GameCanvas)
      await flushPromises()

      // Should handle offline gracefully
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle slow network conditions', async () => {
      // Mock very slow fetch
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 30000)) // 30 second delay
      )

      const wrapper = mount(GameCanvas)
      
      // Should timeout gracefully rather than hang indefinitely
      await new Promise(resolve => setTimeout(resolve, 100))
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle unstable network connections', async () => {
      // Mock network that randomly fails
      let requestCount = 0
      global.fetch = vi.fn().mockImplementation(() => {
        requestCount++
        if (requestCount % 3 === 0) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve(new Response('{}'))
      })

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('Cross-Origin and Security Restrictions', () => {
    it('should handle CORS errors gracefully', async () => {
      // Mock CORS error
      global.fetch = vi.fn().mockRejectedValue(new Error('CORS policy violation'))

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.error-container').exists()).toBe(true)
    })

    it('should handle CSP violations', async () => {
      // Mock CSP error
      const originalCreateElement = document.createElement
      document.createElement = vi.fn().mockImplementation((tagName) => {
        if (tagName === 'script') {
          throw new Error('Content Security Policy violation')
        }
        return originalCreateElement.call(document, tagName)
      })

      const wrapper = mount(GameCanvas)
      await flushPromises()

      expect(wrapper.exists()).toBe(true)

      // Restore
      document.createElement = originalCreateElement
    })
  })
})