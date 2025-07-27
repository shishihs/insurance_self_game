import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CardRenderer } from '@/cui/utils/CardRenderer'
import type { CUIConfig, ThemeColors } from '@/cui/config/CUIConfig'
import { TestDataGenerator, PerformanceTestHelper } from '../../utils/TestHelpers'
import type { Card } from '@/domain/entities/Card'

// Mock external dependencies
vi.mock('chalk', () => ({
  default: {
    red: vi.fn((text) => `RED:${text}`),
    green: vi.fn((text) => `GREEN:${text}`),
    blue: vi.fn((text) => `BLUE:${text}`),
    yellow: vi.fn((text) => `YELLOW:${text}`),
    cyan: vi.fn((text) => `CYAN:${text}`),
    magenta: vi.fn((text) => `MAGENTA:${text}`),
    white: vi.fn((text) => `WHITE:${text}`),
    gray: vi.fn((text) => `GRAY:${text}`),
    bold: vi.fn((text) => `BOLD:${text}`),
    italic: vi.fn((text) => `ITALIC:${text}`),
    underline: vi.fn((text) => `UNDERLINE:${text}`),
    dim: vi.fn((text) => `DIM:${text}`),
    bgRed: vi.fn((text) => `BG_RED:${text}`),
    bgGreen: vi.fn((text) => `BG_GREEN:${text}`),
    bgBlue: vi.fn((text) => `BG_BLUE:${text}`)
  }
}))

vi.mock('boxen', () => ({
  default: vi.fn((text, options) => `BOXED[${options?.title || 'NO_TITLE'}]:${text}`)
}))

describe('CardRenderer Tests', () => {
  let cardRenderer: CardRenderer
  let testConfig: CUIConfig
  let testTheme: ThemeColors
  let testCards: Card[]

  beforeEach(() => {
    TestDataGenerator.setSeed(12345)
    
    // Create test configuration
    testConfig = {
      theme: 'default',
      animationSpeed: 'normal',
      showProgress: true,
      debugMode: false,
      cardDisplayStyle: 'detailed',
      maxCardsDisplayed: 10,
      terminalWidth: 80,
      useUnicode: true,
      colorMode: 'full',
      accessibility: {
        highContrast: false,
        reducedMotion: false,
        screenReader: false
      }
    }
    
    // Create test theme
    testTheme = {
      primary: '#00ff00',
      secondary: '#0080ff',
      accent: '#ff8000',
      success: '#00ff80',
      warning: '#ffff00',
      error: '#ff0000',
      info: '#80c0ff',
      text: '#ffffff',
      background: '#000000',
      border: '#808080',
      muted: '#606060'
    }
    
    // Create card renderer
    cardRenderer = new CardRenderer(testConfig, testTheme)
    
    // Create test cards
    testCards = TestDataGenerator.createTestCards(5)
    
    // Enhance test cards with various properties
    testCards.forEach((card, index) => {
      Object.defineProperty(card, 'power', { value: (index + 1) * 10, configurable: true })
      Object.defineProperty(card, 'cost', { value: index + 1, configurable: true })
      Object.defineProperty(card, 'rarity', { 
        value: ['common', 'rare', 'epic', 'legendary', 'mythic'][index % 5], 
        configurable: true 
      })
      Object.defineProperty(card, 'type', { 
        value: index % 2 === 0 ? 'challenge' : 'insurance', 
        configurable: true 
      })
    })
  })

  describe('Single Card Rendering', () => {
    it('should render detailed card style correctly', () => {
      const card = testCards[0]
      const result = cardRenderer.renderCard(card, { style: 'detailed' })
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      
      // Should contain card information
      expect(result).toContain(card.name)
      expect(result).toContain(card.description)
    })

    it('should render compact card style correctly', () => {
      const card = testCards[0]
      const result = cardRenderer.renderCard(card, { style: 'compact' })
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result).toContain(card.name)
      
      // Compact style should be shorter than detailed
      const detailedResult = cardRenderer.renderCard(card, { style: 'detailed' })
      expect(result.length).toBeLessThan(detailedResult.length)
    })

    it('should render ASCII card style correctly', () => {
      const card = testCards[0]
      const result = cardRenderer.renderCard(card, { style: 'ascii' })
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result).toContain(card.name)
    })

    it('should render Unicode card style correctly', () => {
      const card = testCards[0]
      const result = cardRenderer.renderCard(card, { style: 'unicode' })
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result).toContain(card.name)
    })

    it('should handle selected card highlighting', () => {
      const card = testCards[0]
      const normalResult = cardRenderer.renderCard(card, { selected: false })
      const selectedResult = cardRenderer.renderCard(card, { selected: true })
      
      expect(normalResult).toBeDefined()
      expect(selectedResult).toBeDefined()
      
      // Selected version should be different (likely contain selection indicators)
      expect(selectedResult).not.toBe(normalResult)
    })

    it('should handle dimmed card display', () => {
      const card = testCards[0]
      const normalResult = cardRenderer.renderCard(card, { dimmed: false })
      const dimmedResult = cardRenderer.renderCard(card, { dimmed: true })
      
      expect(normalResult).toBeDefined()
      expect(dimmedResult).toBeDefined()
      
      // Dimmed version should be different
      expect(dimmedResult).not.toBe(normalResult)
    })

    it('should show card index when requested', () => {
      const card = testCards[0]
      const withoutIndex = cardRenderer.renderCard(card, { showIndex: false })
      const withIndex = cardRenderer.renderCard(card, { showIndex: true, index: 5 })
      
      expect(withoutIndex).toBeDefined()
      expect(withIndex).toBeDefined()
      expect(withIndex).toContain('5')
    })

    it('should handle different card types appropriately', () => {
      const challengeCard = testCards.find(c => c.type === 'challenge')
      const insuranceCard = testCards.find(c => c.type === 'insurance')
      
      if (challengeCard && insuranceCard) {
        const challengeResult = cardRenderer.renderCard(challengeCard)
        const insuranceResult = cardRenderer.renderCard(insuranceCard)
        
        expect(challengeResult).toBeDefined()
        expect(insuranceResult).toBeDefined()
        
        // Different types should render differently
        expect(challengeResult).not.toBe(insuranceResult)
      }
    })

    it('should handle different card rarities', () => {
      const rarities = ['common', 'rare', 'epic', 'legendary', 'mythic']
      const results: string[] = []
      
      rarities.forEach((rarity, index) => {
        if (testCards[index]) {
          Object.defineProperty(testCards[index], 'rarity', { value: rarity, configurable: true })
          const result = cardRenderer.renderCard(testCards[index])
          results.push(result)
          expect(result).toBeDefined()
        }
      })
      
      // All rarity renders should be unique
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBe(results.length)
    })
  })

  describe('Card Grid Rendering', () => {
    it('should render card grid with default options', () => {
      const result = cardRenderer.renderCardGrid(testCards)
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
      
      // Should contain all card names
      testCards.forEach(card => {
        expect(result).toContain(card.name)
      })
    })

    it('should respect column count in grid layout', () => {
      const result2Cols = cardRenderer.renderCardGrid(testCards, { columns: 2 })
      const result4Cols = cardRenderer.renderCardGrid(testCards, { columns: 4 })
      
      expect(result2Cols).toBeDefined()
      expect(result4Cols).toBeDefined()
      
      // Different column counts should produce different layouts
      expect(result2Cols).not.toBe(result4Cols)
    })

    it('should show indices when requested', () => {
      const withoutIndices = cardRenderer.renderCardGrid(testCards, { showIndices: false })
      const withIndices = cardRenderer.renderCardGrid(testCards, { showIndices: true })
      
      expect(withoutIndices).toBeDefined()
      expect(withIndices).toBeDefined()
      
      // Version with indices should contain numbers
      expect(withIndices).toMatch(/\d/)
    })

    it('should highlight selected cards in grid', () => {
      const selectedIndices = [0, 2, 4]
      const result = cardRenderer.renderCardGrid(testCards, { selectedIndices })
      
      expect(result).toBeDefined()
      
      // Should contain selection indicators for selected cards
      selectedIndices.forEach(index => {
        expect(result).toContain(testCards[index].name)
      })
    })

    it('should respect maximum cards displayed', () => {
      const maxCards = 3
      const manyCards = TestDataGenerator.createTestCards(10)
      const result = cardRenderer.renderCardGrid(manyCards, { maxCards })
      
      expect(result).toBeDefined()
      
      // Should only show first maxCards
      for (let i = 0; i < maxCards; i++) {
        expect(result).toContain(manyCards[i].name)
      }
      
      // Should not show cards beyond maxCards
      for (let i = maxCards; i < manyCards.length; i++) {
        expect(result).not.toContain(manyCards[i].name)
      }
    })

    it('should handle empty card array gracefully', () => {
      const result = cardRenderer.renderCardGrid([])
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle single card in grid', () => {
      const singleCard = [testCards[0]]
      const result = cardRenderer.renderCardGrid(singleCard)
      
      expect(result).toBeDefined()
      expect(result).toContain(singleCard[0].name)
    })
  })

  describe('Card List Rendering', () => {
    it('should render numbered card list', () => {
      const result = cardRenderer.renderCardList(testCards)
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
      
      // Should contain all card names
      testCards.forEach(card => {
        expect(result).toContain(card.name)
      })
      
      // Should contain numbers for list
      expect(result).toMatch(/\d+/)
    })

    it('should respect compact format in list', () => {
      const compactResult = cardRenderer.renderCardList(testCards, { compact: true })
      const fullResult = cardRenderer.renderCardList(testCards, { compact: false })
      
      expect(compactResult).toBeDefined()
      expect(fullResult).toBeDefined()
      
      // Compact should be shorter
      expect(compactResult.length).toBeLessThan(fullResult.length)
    })

    it('should highlight selected cards in list', () => {
      const selectedIndices = [1, 3]
      const result = cardRenderer.renderCardList(testCards, { selectedIndices })
      
      expect(result).toBeDefined()
      
      // Should indicate selection for selected cards
      selectedIndices.forEach(index => {
        expect(result).toContain(testCards[index].name)
      })
    })

    it('should show card power when available', () => {
      const cardsWithPower = testCards.map(card => {
        Object.defineProperty(card, 'power', { value: 50, configurable: true })
        return card
      })
      
      const result = cardRenderer.renderCardList(cardsWithPower, { showPower: true })
      
      expect(result).toBeDefined()
      expect(result).toContain('50')
    })

    it('should show card cost when available', () => {
      const cardsWithCost = testCards.map(card => {
        Object.defineProperty(card, 'cost', { value: 3, configurable: true })
        return card
      })
      
      const result = cardRenderer.renderCardList(cardsWithCost, { showCost: true })
      
      expect(result).toBeDefined()
      expect(result).toContain('3')
    })
  })

  describe('Performance Tests', () => {
    it('should render single card quickly', async () => {
      const card = testCards[0]
      
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'single_card_render',
        () => cardRenderer.renderCard(card)
      )
      
      // Should render quickly (< 5ms)
      expect(timeMs).toBeLessThan(5)
    })

    it('should render multiple cards efficiently', async () => {
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'card_grid_render',
        () => cardRenderer.renderCardGrid(testCards)
      )
      
      // Should render grid efficiently (< 20ms)
      expect(timeMs).toBeLessThan(20)
    })

    it('should handle large card collections efficiently', async () => {
      const largeCardSet = TestDataGenerator.createTestCards(100)
      
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'large_card_set_render',
        () => cardRenderer.renderCardGrid(largeCardSet, { maxCards: 50 })
      )
      
      // Should handle large sets reasonably (< 100ms)
      expect(timeMs).toBeLessThan(100)
      console.log(`Rendered 50 cards from 100 card set in ${timeMs.toFixed(2)}ms`)
    })

    it('should maintain consistent performance across render styles', async () => {
      const styles = ['detailed', 'compact', 'ascii', 'unicode'] as const
      const card = testCards[0]
      
      for (const style of styles) {
        const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
          `render_style_${style}`,
          () => cardRenderer.renderCard(card, { style })
        )
        
        // All styles should render quickly
        expect(timeMs).toBeLessThan(10)
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle null card gracefully', () => {
      expect(() => cardRenderer.renderCard(null as any)).not.toThrow()
    })

    it('should handle undefined card gracefully', () => {
      expect(() => cardRenderer.renderCard(undefined as any)).not.toThrow()
    })

    it('should handle card without name', () => {
      const incompleteCard = { ...testCards[0] }
      Object.defineProperty(incompleteCard, 'name', { value: undefined, configurable: true })
      
      expect(() => cardRenderer.renderCard(incompleteCard)).not.toThrow()
    })

    it('should handle card without description', () => {
      const incompleteCard = { ...testCards[0] }
      Object.defineProperty(incompleteCard, 'description', { value: undefined, configurable: true })
      
      expect(() => cardRenderer.renderCard(incompleteCard)).not.toThrow()
    })

    it('should handle malformed cards in grid', () => {
      const malformedCards = [
        null,
        undefined,
        {},
        testCards[0], // Valid card
        { name: 'Partial card' }
      ] as any[]
      
      expect(() => cardRenderer.renderCardGrid(malformedCards)).not.toThrow()
    })

    it('should handle extreme options values', () => {
      const extremeOptions = {
        columns: 0,
        maxCards: -1,
        selectedIndices: [-1, 999]
      }
      
      expect(() => cardRenderer.renderCardGrid(testCards, extremeOptions)).not.toThrow()
    })

    it('should handle very long card names and descriptions', () => {
      const longCard = { ...testCards[0] }
      const longText = 'A'.repeat(1000)
      
      Object.defineProperty(longCard, 'name', { value: longText, configurable: true })
      Object.defineProperty(longCard, 'description', { value: longText, configurable: true })
      
      const result = cardRenderer.renderCard(longCard)
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should handle special characters in card data', () => {
      const specialCard = { ...testCards[0] }
      const specialText = '特殊文字 🎮 ♠️♥️♦️♣️ ←→↑↓ ★☆'
      
      Object.defineProperty(specialCard, 'name', { value: specialText, configurable: true })
      Object.defineProperty(specialCard, 'description', { value: specialText, configurable: true })
      
      const result = cardRenderer.renderCard(specialCard)
      expect(result).toBeDefined()
      expect(result).toContain(specialText)
    })
  })

  describe('Theme and Style Integration', () => {
    it('should apply theme colors correctly', () => {
      const card = testCards[0]
      const result = cardRenderer.renderCard(card)
      
      expect(result).toBeDefined()
      
      // The result should be processed by chalk color functions
      // (We can't directly test colors, but we can verify the result is non-empty)
      expect(result.length).toBeGreaterThan(card.name.length)
    })

    it('should handle different color modes', () => {
      const colorModes = ['full', 'basic', 'none'] as const
      
      colorModes.forEach(colorMode => {
        const config = { ...testConfig, colorMode }
        const renderer = new CardRenderer(config, testTheme)
        
        const result = renderer.renderCard(testCards[0])
        expect(result).toBeDefined()
        expect(typeof result).toBe('string')
      })
    })

    it('should respect Unicode settings', () => {
      // Test with Unicode enabled
      const unicodeConfig = { ...testConfig, useUnicode: true }
      const unicodeRenderer = new CardRenderer(unicodeConfig, testTheme)
      
      // Test with Unicode disabled
      const noUnicodeConfig = { ...testConfig, useUnicode: false }
      const noUnicodeRenderer = new CardRenderer(noUnicodeConfig, testTheme)
      
      const unicodeResult = unicodeRenderer.renderCard(testCards[0], { style: 'unicode' })
      const noUnicodeResult = noUnicodeRenderer.renderCard(testCards[0], { style: 'unicode' })
      
      expect(unicodeResult).toBeDefined()
      expect(noUnicodeResult).toBeDefined()
      
      // Results should be different based on Unicode setting
      expect(unicodeResult).not.toBe(noUnicodeResult)
    })

    it('should handle accessibility options', () => {
      const accessibilityConfig = {
        ...testConfig,
        accessibility: {
          highContrast: true,
          reducedMotion: true,
          screenReader: true
        }
      }
      
      const accessibleRenderer = new CardRenderer(accessibilityConfig, testTheme)
      const result = accessibleRenderer.renderCard(testCards[0])
      
      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })
  })

  describe('Responsive Layout Tests', () => {
    it('should adapt to different terminal widths', () => {
      const widths = [40, 80, 120, 160]
      
      widths.forEach(width => {
        const config = { ...testConfig, terminalWidth: width }
        const renderer = new CardRenderer(config, testTheme)
        
        const result = renderer.renderCardGrid(testCards)
        expect(result).toBeDefined()
        
        // Result should respect terminal width constraints
        const lines = result.split('\n')
        lines.forEach(line => {
          // Strip ANSI codes for actual length check
          const cleanLine = line.replace(/\u001b\[[0-9;]*m/g, '')
          expect(cleanLine.length).toBeLessThanOrEqual(width + 10) // Allow some margin
        })
      })
    })

    it('should adjust grid columns based on terminal width', () => {
      const narrowConfig = { ...testConfig, terminalWidth: 40 }
      const wideConfig = { ...testConfig, terminalWidth: 160 }
      
      const narrowRenderer = new CardRenderer(narrowConfig, testTheme)
      const wideRenderer = new CardRenderer(wideConfig, testTheme)
      
      const narrowResult = narrowRenderer.renderCardGrid(testCards)
      const wideResult = wideRenderer.renderCardGrid(testCards)
      
      expect(narrowResult).toBeDefined()
      expect(wideResult).toBeDefined()
      
      // Wide terminal should potentially allow more columns
      expect(narrowResult).not.toBe(wideResult)
    })
  })

  describe('Card Information Display', () => {
    it('should display card power when present', () => {
      const powerCard = { ...testCards[0] }
      Object.defineProperty(powerCard, 'power', { value: 42, configurable: true })
      
      const result = cardRenderer.renderCard(powerCard)
      expect(result).toContain('42')
    })

    it('should display card cost when present', () => {
      const costCard = { ...testCards[0] }
      Object.defineProperty(costCard, 'cost', { value: 7, configurable: true })
      
      const result = cardRenderer.renderCard(costCard)
      expect(result).toContain('7')
    })

    it('should handle missing optional properties gracefully', () => {
      const minimalCard = {
        id: 'minimal-card',
        name: 'Minimal Card',
        description: 'A card with minimal properties'
      } as any
      
      const result = cardRenderer.renderCard(minimalCard)
      expect(result).toBeDefined()
      expect(result).toContain('Minimal Card')
    })
  })
})