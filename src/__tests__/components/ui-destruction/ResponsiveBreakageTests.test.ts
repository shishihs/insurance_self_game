/**
 * Responsive Design Breakage Tests
 * 
 * Comprehensive destructive testing for responsive design failures:
 * - Extreme viewport dimensions (1x1px to 8K+)
 * - Dynamic viewport changes during interactions
 * - CSS Grid/Flexbox breaking points
 * - Media query cascade failures
 * - Font scaling and text overflow scenarios
 * - Touch target accessibility under extreme conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

import OptimizedGameInterface from '@/components/mobile/OptimizedGameInterface.vue'
import MobileBottomNav from '@/components/mobile/MobileBottomNav.vue'
import StatisticsDashboard from '@/components/statistics/StatisticsDashboard.vue'
import AccessibilitySettings from '@/components/accessibility/AccessibilitySettings.vue'
import SwipeableCardStack from '@/components/mobile/SwipeableCardStack.vue'

import { 
  createTestEnvironment,
  ViewportManager,
  BrowserAPIMocker
} from './test-utilities'

describe('Responsive Design Breakage Tests', () => {
  let testEnv: ReturnType<typeof createTestEnvironment>
  let viewportManager: ViewportManager
  let browserMocker: BrowserAPIMocker

  // Common test data
  const mockSections = [
    { id: 'game', label: 'ゲーム', icon: '🎮', component: 'GameComponent' },
    { id: 'stats', label: '統計', icon: '📊', component: 'StatsComponent' },
    { id: 'settings', label: '設定', icon: '⚙️', component: 'SettingsComponent' }
  ]

  const mockNavItems = [
    { id: 'home', label: 'ホーム', icon: '🏠' },
    { id: 'play', label: 'プレイ', icon: '🎯' },
    { id: 'stats', label: '統計', icon: '📈' },
    { id: 'settings', label: '設定', icon: '⚙️' }
  ]

  beforeEach(() => {
    testEnv = createTestEnvironment()
    viewportManager = testEnv.viewportManager
    browserMocker = testEnv.browserMocker

    // Mock CSS support detection
    Object.defineProperty(CSS, 'supports', {
      value: vi.fn(() => true),
      writable: true,
      configurable: true
    })

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn(() => [])
    }))
  })

  afterEach(() => {
    testEnv.cleanup()
    vi.restoreAllMocks()
  })

  describe('Extreme Viewport Dimension Tests', () => {
    it('should handle 1x1 pixel viewport without crashing', async () => {
      viewportManager.setSize(1, 1)

      const wrapper = mount(OptimizedGameInterface, {
        props: { sections: mockSections }
      })

      await nextTick()
      await flushPromises()

      // Component should exist but might have minimal content
      expect(wrapper.exists()).toBe(true)
      
      // Test interactions in extreme viewport
      const buttons = wrapper.findAll('button')
      for (const button of buttons) {
        await button.trigger('click')
      }

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle massive 16K viewport (15360x8640) without memory explosion', async () => {
      viewportManager.setSize(15360, 8640) // 16K resolution
      
      const startTime = performance.now()
      const initialMemory = performance.memory?.usedJSHeapSize || 0

      const wrapper = mount(StatisticsDashboard, {
        props: {
          // Large dataset that might scale with viewport
          gameStats: {
            totalGames: 1000,
            averageScore: 85.5,
            bestStreak: 42,
            totalPlayTime: 12345,
            cardStats: new Array(1000).fill(null).map((_, i) => ({
              cardId: `card-${i}`,
              usage: Math.random() * 100,
              success: Math.random() * 100
            }))
          }
        }
      })

      await nextTick()
      await flushPromises()

      const renderTime = performance.now() - startTime
      const finalMemory = performance.memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Should render reasonably quickly even at extreme resolution
      expect(renderTime).toBeLessThan(500)
      
      // Memory increase should be controlled (less than 100MB)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024)
      
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle zero and negative viewport dimensions', async () => {
      const extremeDimensions = [
        { width: 0, height: 0 },
        { width: -100, height: -100 },
        { width: 100, height: 0 },
        { width: 0, height: 100 },
        { width: -50, height: 200 }
      ]

      for (const dimensions of extremeDimensions) {
        viewportManager.setSize(dimensions.width, dimensions.height)
        
        const wrapper = mount(MobileBottomNav, {
          props: { 
            items: mockNavItems,
            activeId: 'home'
          }
        })

        await nextTick()

        // Should handle gracefully without throwing errors
        expect(wrapper.exists()).toBe(true)
        wrapper.unmount()
      }
    })

    it('should handle extremely narrow viewport (1px wide)', async () => {
      viewportManager.setSize(1, 1080) // Ultra-narrow
      
      const wrapper = mount(OptimizedGameInterface, {
        props: { sections: mockSections }
      })

      await nextTick()

      // Should handle narrow viewport without horizontal overflow
      const element = wrapper.element as HTMLElement
      const computedStyle = window.getComputedStyle(element)
      
      // Should not have horizontal overflow
      expect(['hidden', 'clip', 'auto']).toContain(computedStyle.overflowX)
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle extremely short viewport (1px tall)', async () => {
      viewportManager.setSize(1920, 1) // Ultra-short
      
      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // Should handle short viewport without vertical overflow issues
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)
    })
  })

  describe('Dynamic Viewport Change Stress Tests', () => {
    it('should survive rapid viewport oscillation during user interaction', async () => {
      const wrapper = mount(SwipeableCardStack, {
        props: {
          cards: [
            { id: '1', content: 'Card 1' },
            { id: '2', content: 'Card 2' },
            { id: '3', content: 'Card 3' }
          ]
        }
      })

      const cardElement = wrapper.find('.swipeable-card')
      
      // Start a swipe gesture
      await cardElement.trigger('touchstart', {
        touches: [{ identifier: 0, clientX: 100, clientY: 100 }]
      })

      // Rapidly change viewport size during gesture
      const sizes = [
        { width: 320, height: 568 },
        { width: 1920, height: 1080 },
        { width: 768, height: 1024 },
        { width: 375, height: 667 },
        { width: 1366, height: 768 }
      ]

      for (const size of sizes) {
        viewportManager.setSize(size.width, size.height)
        
        // Continue gesture during resize
        await cardElement.trigger('touchmove', {
          touches: [{ identifier: 0, clientX: 150 + Math.random() * 100, clientY: 100 }]
        })
        
        await nextTick()
      }

      // End gesture
      await cardElement.trigger('touchend', {
        changedTouches: [{ identifier: 0 }]
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle viewport changes that trigger different media queries rapidly', async () => {
      const wrapper = mount(OptimizedGameInterface, {
        props: { sections: mockSections }
      })

      // Cycle through different media query breakpoints rapidly
      const breakpoints = [
        { width: 320, height: 568, name: 'mobile' },
        { width: 768, height: 1024, name: 'tablet-portrait' },
        { width: 1024, height: 768, name: 'tablet-landscape' },
        { width: 1440, height: 900, name: 'desktop' },
        { width: 1920, height: 1080, name: 'large-desktop' },
        { width: 2560, height: 1440, name: 'ultra-wide' }
      ]

      for (let cycle = 0; cycle < 5; cycle++) {
        for (const breakpoint of breakpoints) {
          viewportManager.setSize(breakpoint.width, breakpoint.height)
          
          // Interact with component at each breakpoint
          const buttons = wrapper.findAll('button')
          if (buttons.length > 0) {
            await buttons[0].trigger('click')
          }
          
          await nextTick()
        }
      }

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle orientation changes during modal interactions', async () => {
      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // Start interacting with modal
      const colorSchemeSelect = wrapper.find('#color-scheme')
      if (colorSchemeSelect.exists()) {
        await colorSchemeSelect.setValue('protanopia')
      }

      // Change orientation multiple times during interaction
      viewportManager.setOrientation('portrait')
      await nextTick()
      
      const fontSizeSelect = wrapper.find('#font-size')
      if (fontSizeSelect.exists()) {
        await fontSizeSelect.setValue('large')
      }

      viewportManager.setOrientation('landscape')
      await nextTick()

      const highContrastCheckbox = wrapper.find('#high-contrast')
      if (highContrastCheckbox.exists()) {
        await highContrastCheckbox.setChecked(true)
      }

      viewportManager.setOrientation('portrait')
      await nextTick()

      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)
    })
  })

  describe('CSS Layout System Breaking Points', () => {
    it('should handle Flexbox container with excessive items', async () => {
      // Create nav with excessive number of items
      const excessiveNavItems = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        label: `Very Long Item Label ${i} That Might Cause Overflow Issues`,
        icon: '🔥'
      }))

      const wrapper = mount(MobileBottomNav, {
        props: {
          items: excessiveNavItems,
          activeId: 'item-0'
        }
      })

      await nextTick()

      // Should handle excessive items without breaking layout
      expect(wrapper.exists()).toBe(true)
      
      // Should not cause horizontal scroll or overflow
      const navElement = wrapper.find('.mobile-bottom-nav')
      if (navElement.exists()) {
        const computedStyle = window.getComputedStyle(navElement.element as HTMLElement)
        expect(['hidden', 'clip']).toContain(computedStyle.overflowX)
      }
    })

    it('should handle CSS Grid breakdown under extreme content', async () => {
      // Test component that uses CSS Grid
      const wrapper = mount(StatisticsDashboard, {
        props: {
          gameStats: {
            totalGames: 0,
            averageScore: 0,
            bestStreak: 0,
            totalPlayTime: 0,
            // Extreme card stats that might break grid layout
            cardStats: Array.from({ length: 10000 }, (_, i) => ({
              cardId: `card-with-extremely-long-name-that-might-break-grid-layout-${i}`,
              usage: Math.random() * 100000000,
              success: Math.random() * 100000000
            }))
          }
        }
      })

      await nextTick()
      await flushPromises()

      expect(wrapper.exists()).toBe(true)
    })

    it('should handle nested container overflow scenarios', async () => {
      // Create deeply nested component structure that might cause overflow
      const nestedCards = Array.from({ length: 100 }, (_, i) => ({
        id: `nested-card-${i}`,
        content: {
          title: `Card ${i}`,
          description: 'A'.repeat(10000), // Very long content
          metadata: {
            tags: new Array(1000).fill('tag'),
            properties: new Array(500).fill({ key: 'value'.repeat(100) })
          }
        }
      }))

      const wrapper = mount(SwipeableCardStack, {
        props: { cards: nestedCards as any }
      })

      await nextTick()

      // Should handle nested overflow without breaking
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.swipeable-card').exists()).toBe(true)
    })
  })

  describe('Font Scaling and Text Overflow Tests', () => {
    it('should handle extreme font scaling without layout breaking', async () => {
      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // Apply extreme font sizes via CSS custom properties
      const rootElement = document.documentElement
      const originalFontSize = rootElement.style.getPropertyValue('--base-font-size')

      const extremeFontSizes = ['8px', '72px', '200px', '0.5px', '1000px']

      for (const fontSize of extremeFontSizes) {
        rootElement.style.setProperty('--base-font-size', fontSize)
        await nextTick()

        // Should handle extreme font sizes without breaking layout
        expect(wrapper.exists()).toBe(true)
        expect(wrapper.find('.modal-content').exists()).toBe(true)

        // Try interacting with elements at extreme font sizes
        const buttons = wrapper.findAll('button')
        if (buttons.length > 0) {
          await buttons[0].trigger('click')
        }
      }

      // Restore original font size
      rootElement.style.setProperty('--base-font-size', originalFontSize)
    })

    it('should handle text overflow in constrained containers', async () => {
      // Set very narrow viewport
      viewportManager.setSize(100, 600)

      const longTextCards = [{
        id: 'long-text',
        content: 'This is an extremely long text content that should definitely overflow in a very narrow container and test how the component handles text wrapping, truncation, and overflow scenarios. '.repeat(50)
      }]

      const wrapper = mount(SwipeableCardStack, {
        props: { cards: longTextCards }
      })

      await nextTick()

      // Should handle text overflow gracefully
      expect(wrapper.exists()).toBe(true)
      
      const cardElement = wrapper.find('.swipeable-card')
      if (cardElement.exists()) {
        const computedStyle = window.getComputedStyle(cardElement.element as HTMLElement)
        
        // Should have some form of overflow handling
        const hasOverflowHandling = 
          computedStyle.overflow !== 'visible' ||
          computedStyle.overflowWrap !== 'normal' ||
          computedStyle.wordBreak !== 'normal'
        
        expect(hasOverflowHandling).toBe(true)
      }
    })

    it('should handle RTL text layout in extreme viewports', async () => {
      // Set document direction to RTL
      document.dir = 'rtl'
      
      viewportManager.setSize(200, 400) // Narrow viewport
      
      const rtlCards = [{
        id: 'rtl-card',
        content: 'هذا نص طويل جداً باللغة العربية يجب أن يتم التعامل معه بشكل صحيح في التخطيط من اليمين إلى اليسار حتى في الشاشات الضيقة جداً'
      }]

      const wrapper = mount(SwipeableCardStack, {
        props: { cards: rtlCards }
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)
      
      // Restore LTR
      document.dir = 'ltr'
    })
  })

  describe('Touch Target Accessibility Under Extreme Conditions', () => {
    it('should maintain minimum touch target sizes in tiny viewports', async () => {
      viewportManager.setSize(200, 300) // Very small mobile viewport
      
      const wrapper = mount(MobileBottomNav, {
        props: {
          items: mockNavItems,
          activeId: 'home'
        }
      })

      await nextTick()

      // Check that touch targets meet minimum size requirements
      const buttons = wrapper.findAll('button')
      
      for (const button of buttons) {
        const element = button.element as HTMLElement
        const rect = element.getBoundingClientRect()
        
        // Should meet minimum 44px touch target (or as close as possible in tiny viewport)
        const minSize = Math.min(44, Math.min(window.innerWidth / buttons.length, window.innerHeight / 10))
        expect(Math.max(rect.width, rect.height)).toBeGreaterThanOrEqual(minSize * 0.8) // Allow some tolerance
      }
    })

    it('should handle touch targets at extreme zoom levels', async () => {
      // Mock extreme zoom level
      Object.defineProperty(window, 'devicePixelRatio', { value: 5, writable: true })
      
      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // All interactive elements should remain accessible
      const interactiveElements = wrapper.findAll('button, input, select')
      
      for (const element of interactiveElements) {
        // Should be able to interact without errors
        try {
          if (element.element.tagName === 'BUTTON') {
            await element.trigger('click')
          } else if (element.element.tagName === 'INPUT') {
            if ((element.element as HTMLInputElement).type === 'checkbox') {
              await element.trigger('change')
            }
          }
        } catch (error) {
          // Should not throw errors during interaction
          expect(error).toBeUndefined()
        }
      }

      // Restore normal device pixel ratio
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })
    })
  })

  describe('CSS Feature Support Edge Cases', () => {
    it('should handle environments without modern CSS support', async () => {
      // Mock limited CSS support
      Object.defineProperty(CSS, 'supports', {
        value: vi.fn().mockImplementation((property: string) => {
          // Only support basic properties
          return ['color', 'background', 'width', 'height'].includes(property.split(':')[0])
        }),
        writable: true,
        configurable: true
      })

      const wrapper = mount(OptimizedGameInterface, {
        props: { sections: mockSections }
      })

      await nextTick()

      // Should degrade gracefully without modern CSS features
      expect(wrapper.exists()).toBe(true)
    })

    it('should handle CSS custom properties failure', async () => {
      // Mock CSS custom properties not working
      const originalGetPropertyValue = CSSStyleDeclaration.prototype.getPropertyValue
      CSSStyleDeclaration.prototype.getPropertyValue = vi.fn().mockReturnValue('')

      const wrapper = mount(AccessibilitySettings, {
        props: { isOpen: true }
      })

      await nextTick()

      // Should work even without CSS custom properties
      expect(wrapper.exists()).toBe(true)
      expect(wrapper.find('.modal-content').exists()).toBe(true)

      // Restore original method
      CSSStyleDeclaration.prototype.getPropertyValue = originalGetPropertyValue
    })

    it('should handle viewport units calculation failures', async () => {
      // Mock viewport units not calculating correctly
      const originalGetComputedStyle = window.getComputedStyle
      window.getComputedStyle = vi.fn().mockImplementation((element) => {
        const mockStyle = originalGetComputedStyle(element)
        return new Proxy(mockStyle, {
          get(target, prop) {
            if (typeof prop === 'string' && (prop.includes('vh') || prop.includes('vw'))) {
              return '0px' // Simulate viewport units failing
            }
            return target[prop as keyof CSSStyleDeclaration]
          }
        })
      })

      viewportManager.setSize(375, 667)
      
      const wrapper = mount(OptimizedGameInterface, {
        props: { sections: mockSections }
      })

      await nextTick()

      expect(wrapper.exists()).toBe(true)

      // Restore original getComputedStyle
      window.getComputedStyle = originalGetComputedStyle
    })
  })

  describe('High DPI and Scaling Edge Cases', () => {
    it('should handle extreme device pixel ratios', async () => {
      const extremePixelRatios = [0.5, 0.1, 5, 10, 100]
      
      for (const ratio of extremePixelRatios) {
        Object.defineProperty(window, 'devicePixelRatio', { value: ratio, writable: true })
        
        const wrapper = mount(StatisticsDashboard, {
          props: {
            gameStats: {
              totalGames: 100,
              averageScore: 85,
              bestStreak: 25,
              totalPlayTime: 3600,
              cardStats: []
            }
          }
        })

        await nextTick()

        // Should render correctly at any pixel ratio
        expect(wrapper.exists()).toBe(true)
        wrapper.unmount()
      }

      // Restore normal pixel ratio
      Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true })
    })

    it('should handle browser zoom levels that break layout', async () => {
      // Simulate different zoom levels by changing viewport and pixel ratio
      const zoomLevels = [
        { scale: 0.25, viewport: { width: 1920 * 4, height: 1080 * 4 } },
        { scale: 0.5, viewport: { width: 1920 * 2, height: 1080 * 2 } },
        { scale: 2, viewport: { width: 1920 / 2, height: 1080 / 2 } },
        { scale: 5, viewport: { width: 1920 / 5, height: 1080 / 5 } }
      ]

      for (const zoom of zoomLevels) {
        Object.defineProperty(window, 'devicePixelRatio', { value: zoom.scale, writable: true })
        viewportManager.setSize(zoom.viewport.width, zoom.viewport.height)
        
        const wrapper = mount(MobileBottomNav, {
          props: {
            items: mockNavItems,
            activeId: 'home'
          }
        })

        await nextTick()

        // Should handle extreme zoom levels
        expect(wrapper.exists()).toBe(true)
        wrapper.unmount()
      }
    })
  })
})