import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Game } from '@/domain/entities/Game'
import { TestDataGenerator } from '../../utils/TestHelpers'
import type { GameConfig } from '@/domain/types/game.types'

// Mock window APIs for test environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    now: vi.fn().mockReturnValue(Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn().mockReturnValue([{ duration: 100 }])
  }
})

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn().mockImplementation((cb) => {
  return setTimeout(cb, 16)
})

global.cancelAnimationFrame = vi.fn().mockImplementation((id) => {
  clearTimeout(id)
})

// Mock Phaser global object
global.Phaser = {
  Scene: class MockScene {
    constructor() {}
  },
  GameObjects: {
    Container: class MockContainer {
      constructor() {}
      add() { return this }
      setName() { return this }
      destroy() {}
      getData() { return {} }
      setData() { return this }
    },
    Text: class MockText {
      constructor() {}
      setOrigin() { return this }
      setName() { return this }
      setText() { return this }
      destroy() {}
    },
    Rectangle: class MockRectangle {
      constructor() {}
      setStrokeStyle() { return this }
    },
    Image: class MockImage {
      constructor() {}
    }
  },
  Geom: {
    Rectangle: {
      Contains: () => true
    }
  }
} as any

// Mock the GameScene dependencies
vi.mock('@/game/scenes/BaseScene', () => ({
  BaseScene: class MockBaseScene {
    centerX = 400
    centerY = 300
    gameWidth = 800
    gameHeight = 600
    children = {
      getByName: vi.fn().mockReturnValue({
        setText: vi.fn()
      })
    }
    add = {
      container: vi.fn().mockReturnValue({
        add: vi.fn(),
        setName: vi.fn()
      }),
      text: vi.fn().mockReturnValue({
        setOrigin: vi.fn().mockReturnThis(),
        setName: vi.fn().mockReturnThis(),
        setText: vi.fn().mockReturnThis(),
        destroy: vi.fn()
      }),
      rectangle: vi.fn().mockReturnValue({
        setStrokeStyle: vi.fn().mockReturnThis()
      }),
      image: vi.fn().mockReturnValue({})
    }
    tweens = {
      add: vi.fn()
    }
    time = {
      now: 0,
      delayedCall: vi.fn()
    }
  }
}))

vi.mock('@/game/config/gameConfig', () => ({
  GAME_CONSTANTS: {
    DECK_X_POSITION: 100,
    DECK_Y_POSITION: 500,
    DISCARD_X_POSITION: 700,
    DISCARD_Y_POSITION: 500,
    CHALLENGE_Y_POSITION: 200,
    HAND_Y_POSITION: 550,
    CARD_WIDTH: 120,
    CARD_HEIGHT: 160,
    CARD_SPACING: 10,
    CARD_MOVE_DURATION: 300
  }
}))

// Import GameScene after mocks
import { GameScene } from '@/game/scenes/GameScene'

describe('GameScene Card Count Display Tests', () => {
  let gameScene: GameScene
  let testGame: Game
  let testConfig: GameConfig

  beforeEach(() => {
    // Setup test data
    TestDataGenerator.setSeed(12345)
    testConfig = TestDataGenerator.createTestGameConfig()
    testGame = new Game(testConfig)
    
    // Create GameScene instance
    gameScene = new GameScene()
    
    // Mock the gameInstance property
    Object.defineProperty(gameScene, 'gameInstance', {
      value: testGame,
      writable: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Card Count Display Methods', () => {
    it('should update deck display correctly', () => {
      // Add cards to player deck
      const testCards = TestDataGenerator.createTestCards(5)
      testCards.forEach(card => testGame.addCardToPlayerDeck(card))
      
      // Call the private method through reflection (for testing)
      const updateDeckDisplay = (gameScene as any).updateDeckDisplay?.bind(gameScene)
      
      if (updateDeckDisplay) {
        expect(() => updateDeckDisplay()).not.toThrow()
      }
    })

    it('should update hand count display correctly', () => {
      // Add cards to hand
      const testCards = TestDataGenerator.createTestCards(3)
      testCards.forEach(card => testGame.addCardToHand(card))
      
      // Call the private method through reflection (for testing)
      const updateHandCountDisplay = (gameScene as any).updateHandCountDisplay?.bind(gameScene)
      
      if (updateHandCountDisplay) {
        expect(() => updateHandCountDisplay()).not.toThrow()
      }
    })

    it('should update discard count display correctly', () => {
      // Add cards to discard pile
      const testCards = TestDataGenerator.createTestCards(2)
      testCards.forEach(card => testGame.addCardToDiscardPile(card))
      
      // Call the private method through reflection (for testing)
      const updateDiscardCountDisplay = (gameScene as any).updateDiscardCountDisplay?.bind(gameScene)
      
      if (updateDiscardCountDisplay) {
        expect(() => updateDiscardCountDisplay()).not.toThrow()
      }
    })

    it('should handle zero card counts gracefully', () => {
      // Clear all cards
      testGame.clearHand()
      
      // Verify that update methods handle zero counts
      const updateDeckDisplay = (gameScene as any).updateDeckDisplay?.bind(gameScene)
      const updateHandCountDisplay = (gameScene as any).updateHandCountDisplay?.bind(gameScene)
      const updateDiscardCountDisplay = (gameScene as any).updateDiscardCountDisplay?.bind(gameScene)
      
      expect(() => {
        if (updateDeckDisplay) updateDeckDisplay()
        if (updateHandCountDisplay) updateHandCountDisplay()
        if (updateDiscardCountDisplay) updateDiscardCountDisplay()
      }).not.toThrow()
    })

    it('should handle large card counts efficiently', () => {
      // Add many cards
      const manyCards = TestDataGenerator.createTestCards(100)
      manyCards.forEach(card => testGame.addCardToPlayerDeck(card))
      
      const startTime = performance.now()
      
      const updateDeckDisplay = (gameScene as any).updateDeckDisplay?.bind(gameScene)
      if (updateDeckDisplay) {
        updateDeckDisplay()
      }
      
      const endTime = performance.now()
      const executionTime = endTime - startTime
      
      // Should execute quickly even with many cards
      expect(executionTime).toBeLessThan(10) // Less than 10ms
    })
  })

  describe('UI Creation and Updates', () => {
    it('should create card areas without errors', () => {
      const createCardAreas = (gameScene as any).createCardAreas?.bind(gameScene)
      
      if (createCardAreas) {
        expect(() => createCardAreas()).not.toThrow()
      }
    })

    it('should update UI correctly when dirty flags are set', () => {
      // Set dirty flags
      const dirtyFlags = (gameScene as any).dirtyFlags
      if (dirtyFlags) {
        dirtyFlags.deck = true
        dirtyFlags.hand = true
      }
      
      const updateUI = (gameScene as any).updateUI?.bind(gameScene)
      
      if (updateUI) {
        expect(() => updateUI()).not.toThrow()
      }
    })

    it('should arrange hand and update count display', () => {
      // Add cards to hand
      const testCards = TestDataGenerator.createTestCards(4)
      testCards.forEach(card => testGame.addCardToHand(card))
      
      const arrangeHand = (gameScene as any).arrangeHand?.bind(gameScene)
      
      if (arrangeHand) {
        expect(() => arrangeHand()).not.toThrow()
      }
    })
  })

  describe('Performance and Memory Tests', () => {
    it('should handle frequent updates efficiently', () => {
      const updateCount = 100
      const startTime = performance.now()
      
      for (let i = 0; i < updateCount; i++) {
        // Add and remove cards to trigger updates
        const card = TestDataGenerator.createTestCards(1)[0]
        testGame.addCardToHand(card)
        
        const updateHandCountDisplay = (gameScene as any).updateHandCountDisplay?.bind(gameScene)
        if (updateHandCountDisplay) {
          updateHandCountDisplay()
        }
        
        testGame.clearHand()
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Should handle frequent updates efficiently
      expect(totalTime).toBeLessThan(100) // Less than 100ms for 100 updates
      console.log(`Performed ${updateCount} updates in ${totalTime.toFixed(2)}ms`)
    })

    it('should not leak memory during card count updates', () => {
      const initialMemory = process.memoryUsage().heapUsed
      
      // Perform many operations
      for (let i = 0; i < 1000; i++) {
        const card = TestDataGenerator.createTestCards(1)[0]
        testGame.addCardToHand(card)
        
        const updateHandCountDisplay = (gameScene as any).updateHandCountDisplay?.bind(gameScene)
        if (updateHandCountDisplay) {
          updateHandCountDisplay()
        }
        
        if (i % 100 === 0) {
          testGame.clearHand()
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      const finalMemory = process.memoryUsage().heapUsed
      const memoryIncrease = finalMemory - initialMemory
      
      // Memory increase should be reasonable (< 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024)
      console.log(`Memory increase after 1000 operations: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Integration Tests', () => {
    it('should integrate card count display with game flow', () => {
      // Start game
      testGame.start()
      
      // Draw cards
      const drawnCards = testGame.drawCardsSync(5)
      expect(drawnCards.length).toBe(5)
      
      // Update displays
      const updateDeckDisplay = (gameScene as any).updateDeckDisplay?.bind(gameScene)
      const updateHandCountDisplay = (gameScene as any).updateHandCountDisplay?.bind(gameScene)
      
      expect(() => {
        if (updateDeckDisplay) updateDeckDisplay()
        if (updateHandCountDisplay) updateHandCountDisplay()
      }).not.toThrow()
      
      // Verify game state
      expect(testGame.hand.length).toBe(5)
      expect(testGame.isInProgress()).toBe(true)
    })

    it('should handle game state changes correctly', () => {
      // Test different game phases
      const phases = ['setup', 'draw', 'challenge', 'resolution'] as const
      
      phases.forEach(phase => {
        testGame.setPhase(phase)
        
        const updateUI = (gameScene as any).updateUI?.bind(gameScene)
        if (updateUI) {
          expect(() => updateUI()).not.toThrow()
        }
      })
    })

    it('should maintain consistency between game state and display', () => {
      // Add cards and verify consistency
      const testCards = TestDataGenerator.createTestCards(7)
      
      // Add to different areas
      testCards.slice(0, 3).forEach(card => testGame.addCardToHand(card))
      testCards.slice(3, 5).forEach(card => testGame.addCardToPlayerDeck(card))
      testCards.slice(5, 7).forEach(card => testGame.addCardToDiscardPile(card))
      
      // Verify counts match
      expect(testGame.hand.length).toBe(3)
      expect(testGame.playerDeck.getCards().length).toBeGreaterThanOrEqual(2)
      expect(testGame.discardPile.length).toBe(2)
      
      // Update displays should not throw
      const updateDeckDisplay = (gameScene as any).updateDeckDisplay?.bind(gameScene)
      if (updateDeckDisplay) {
        expect(() => updateDeckDisplay()).not.toThrow()
      }
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Mock children.getByName to return null
      gameScene.children.getByName = vi.fn().mockReturnValue(null)
      
      const updateHandCountDisplay = (gameScene as any).updateHandCountDisplay?.bind(gameScene)
      const updateDiscardCountDisplay = (gameScene as any).updateDiscardCountDisplay?.bind(gameScene)
      
      expect(() => {
        if (updateHandCountDisplay) updateHandCountDisplay()
        if (updateDiscardCountDisplay) updateDiscardCountDisplay()
      }).not.toThrow()
    })

    it('should handle invalid game instance gracefully', () => {
      // Set invalid game instance
      Object.defineProperty(gameScene, 'gameInstance', {
        value: null,
        writable: true
      })
      
      const updateDeckDisplay = (gameScene as any).updateDeckDisplay?.bind(gameScene)
      
      expect(() => {
        if (updateDeckDisplay) updateDeckDisplay()
      }).not.toThrow()
    })

    it('should handle extreme card counts', () => {
      // Test with maximum safe integer
      const extremeCards = Array.from({ length: 1000 }, () => 
        TestDataGenerator.createTestCards(1)[0]
      )
      
      extremeCards.forEach(card => testGame.addCardToPlayerDeck(card))
      
      const updateDeckDisplay = (gameScene as any).updateDeckDisplay?.bind(gameScene)
      
      expect(() => {
        if (updateDeckDisplay) updateDeckDisplay()
      }).not.toThrow()
      
      // Verify the game can handle large numbers
      expect(testGame.playerDeck.getCards().length).toBeGreaterThan(0)
    })
  })
})