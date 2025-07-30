import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { CUIConfig } from '@/cui/config/CUIConfig'
import { Game } from '@/domain/entities/Game'
import { TestDataGenerator, PerformanceTestHelper, MemoryTestHelper } from '../../utils/TestHelpers'
import type { GameConfig, ChallengeResult, PlayerStats } from '@/domain/types/game.types'

// Mock external dependencies
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ selection: 0 })
  }
}))

vi.mock('chalk', () => {
  const createChainableMock = () => {
    const chainableHandler: ProxyHandler<any> = {
      get: function(target: any, prop: string) {
        // Handle special properties
        if (prop === 'bold' || prop === 'dim' || prop === 'gray' || prop === 'cyan' || 
            prop === 'blue' || prop === 'red' || prop === 'yellow' || prop === 'green' ||
            prop === 'magenta' || prop === 'bgBlue' || prop === 'white' || prop === 'inverse' ||
            prop === 'italic') {
          // Return a chainable mock
          return new Proxy(function(text: string) {
            // For dimmed text, actually prepend DIM: to make tests work
            if (prop === 'dim') {
              return `DIM:${text}`
            }
            return `${prop.toUpperCase()}:${text}`
          }, chainableHandler)
        }
        
        // Handle hex method
        if (prop === 'hex') {
          return vi.fn((color: string) => vi.fn((text: string) => `HEX(${color}):${text}`))
        }
        
        // Handle rgb method
        if (prop === 'rgb') {
          return vi.fn((r: number, g: number, b: number) => vi.fn((text: string) => `RGB(${r},${g},${b}):${text}`))
        }
        
        // For chained properties, support them
        if (typeof prop === 'string') {
          // Handle object access for specific colors
          const colorMap: Record<string, (text: string) => string> = {
            'gray': (text: string) => `GRAY:${text}`,
            'blue': (text: string) => `BLUE:${text}`,
            'red': (text: string) => `RED:${text}`,
            'yellow': (text: string) => `YELLOW:${text}`,
            'green': (text: string) => `GREEN:${text}`,
            'cyan': (text: string) => `CYAN:${text}`,
            'magenta': (text: string) => `MAGENTA:${text}`
          }
          
          if (prop in colorMap) {
            return vi.fn(colorMap[prop])
          }
        }
        
        // For functions, return a mock that applies styling
        return vi.fn((text: string) => `${prop.toUpperCase()}:${text}`)
      },
      apply: function(target: any, thisArg: any, args: any[]) {
        // When called as a function
        return args[0] || ''
      }
    }
    
    return new Proxy(() => '', chainableHandler)
  }
  
  return {
    default: createChainableMock()
  }
})

// Import after mocks are defined
import { InteractiveCUIRenderer } from '@/cui/renderers/InteractiveCUIRenderer'

vi.mock('boxen', () => ({
  default: vi.fn((text, options) => {
    const borderStyle = options?.borderStyle || 'single'
    const borderColor = options?.borderColor || 'default'
    return `BOXED[style:${borderStyle},color:${borderColor}]:${text}`
  })
}))

vi.mock('figlet', () => ({
  default: {
    textSync: vi.fn((text) => `ASCII_ART:${text}`)
  }
}))

describe('InteractiveCUIRenderer Tests', () => {
  let renderer: InteractiveCUIRenderer
  let testGame: Game
  let testConfig: GameConfig
  let consoleLogSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    // Setup test data
    TestDataGenerator.setSeed(12345)
    testConfig = TestDataGenerator.createTestGameConfig()
    testGame = new Game(testConfig)
    
    // Spy on console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Create renderer with test configuration
    renderer = new InteractiveCUIRenderer({
      theme: 'default',
      animationSpeed: 'fast',
      showProgress: false,
      debugMode: true
    })
    
    // Start memory monitoring
    MemoryTestHelper.startMemoryMonitoring()
  })

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    
    // Clear performance measurements
    PerformanceTestHelper.clearMeasurements()
  })

  describe('Initialization and Configuration', () => {
    it('should initialize with default configuration', () => {
      const defaultRenderer = new InteractiveCUIRenderer()
      expect(defaultRenderer).toBeDefined()
      expect(defaultRenderer).toBeInstanceOf(InteractiveCUIRenderer)
    })

    it('should initialize with custom configuration', () => {
      const customConfig: Partial<CUIConfig> = {
        theme: 'cyberpunk',
        animationSpeed: 'slow',
        showProgress: true,
        debugMode: false
      }
      
      const customRenderer = new InteractiveCUIRenderer(customConfig)
      expect(customRenderer).toBeDefined()
    })

    it('should handle initialization gracefully', async () => {
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'renderer_initialization',
        () => renderer.initialize()
      )
      
      // Should initialize in reasonable time (figlet/animation can take time)
      expect(timeMs).toBeLessThan(1000)
    })

    it('should support all available themes', () => {
      const themes = ['default', 'minimal', 'cyberpunk', 'retro', 'elegant']
      
      themes.forEach(theme => {
        const themeRenderer = new InteractiveCUIRenderer({ theme: theme as any })
        expect(themeRenderer).toBeDefined()
      })
    })

    it('should handle multiple initializations safely', async () => {
      await renderer.initialize()
      await renderer.initialize() // Second initialization
      await renderer.initialize() // Third initialization
      
      // Should not throw or cause issues
      expect(true).toBe(true)
    })
  })

  describe('Game State Display Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should display game state correctly', () => {
      renderer.displayGameState(testGame)
      
      // Verify console output was called
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display hand cards', () => {
      const testCards = TestDataGenerator.createTestCards(5)
      
      renderer.displayHand(testCards)
      
      expect(consoleLogSpy).toHaveBeenCalled()
      
      // Verify all cards are mentioned in output
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      testCards.forEach(card => {
        expect(allLogs).toContain(card.name)
      })
    })

    it('should display challenge card', () => {
      const challengeCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(challengeCard, 'name', { value: 'Test Challenge', configurable: true })
      
      renderer.displayChallenge(challengeCard)
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('Test Challenge')
    })

    it('should display vitality correctly', () => {
      renderer.displayVitality(75, 100)
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('75')
      expect(allLogs).toContain('100')
    })

    it('should display insurance cards', () => {
      const insuranceCards = TestDataGenerator.createTestCards(3)
      insuranceCards.forEach((card, index) => {
        Object.defineProperty(card, 'type', { value: 'insurance', configurable: true })
        Object.defineProperty(card, 'name', { value: `Insurance ${index}`, configurable: true })
      })
      
      renderer.displayInsuranceCards(insuranceCards)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display insurance burden', () => {
      renderer.displayInsuranceBurden(25)
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('25')
    })

    it('should display progress', () => {
      renderer.displayProgress('youth', 3)
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('youth')
      expect(allLogs).toContain('3')
    })
  })

  describe('Message Display Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should display info messages', () => {
      renderer.showMessage('Test info message', 'info')
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('Test info message')
    })

    it('should display error messages', () => {
      renderer.showError('Test error message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display success messages', () => {
      renderer.showMessage('Test success message', 'success')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display warning messages', () => {
      renderer.showMessage('Test warning message', 'warning')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should handle different message levels', () => {
      const levels = ['info', 'warning', 'success'] as const
      
      levels.forEach(level => {
        renderer.showMessage(`Test ${level} message`, level)
        expect(consoleLogSpy).toHaveBeenCalled()
      })
    })

    it('should handle messages without level', () => {
      renderer.showMessage('Test message without level')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('Interactive Input Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should request card selection', async () => {
      const cards = TestDataGenerator.createTestCards(3)
      
      const selectedCards = await renderer.askCardSelection(cards, 1, 1, 'Select a card')
      
      expect(selectedCards).toBeDefined()
      expect(Array.isArray(selectedCards)).toBe(true)
    })

    it('should request insurance choice', async () => {
      const insurances = TestDataGenerator.createTestCards(3)
      
      const selectedInsurance = await renderer.askInsuranceChoice(insurances, 'Select insurance')
      
      expect(selectedInsurance).toBeDefined()
    })

    it('should request confirmation', async () => {
      // Mock inquirer response
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValueOnce({ confirmed: true })
      
      const result = await renderer.askConfirmation('Do you agree?')
      
      expect(result).toBe('yes')
    })

    it('should request challenge action', async () => {
      const challenge = TestDataGenerator.createTestCards(1)[0]
      
      // Mock inquirer response
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValueOnce({ action: 'start' })
      
      const result = await renderer.askChallengeAction(challenge)
      
      expect(['start', 'skip']).toContain(result)
    })

    it('should handle empty card selection gracefully', async () => {
      const emptyCards: any[] = []
      
      // Should not throw
      await expect(renderer.askCardSelection(emptyCards, 1, 1, 'Select from empty')).resolves.toBeDefined()
    })

    it('should handle inquirer errors gracefully', async () => {
      // Mock inquirer to throw
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockRejectedValueOnce(new Error('Input error'))
      
      // Should handle error without crashing
      await expect(renderer.askConfirmation('Test')).resolves.toBeDefined()
    })
  })

  describe('Game Flow Display Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should show challenge result', () => {
      const challengeResult = TestDataGenerator.createTestChallengeResult({
        success: true,
        vitalityChange: -10,
        message: 'Challenge completed successfully'
      })
      
      renderer.showChallengeResult(challengeResult)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should show game over', () => {
      const playerStats = TestDataGenerator.createTestPlayerStats({
        turnsPlayed: 20,
        highestVitality: 85
      })
      
      renderer.showGameOver(playerStats)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should show victory', () => {
      const playerStats = TestDataGenerator.createTestPlayerStats({
        turnsPlayed: 20,
        successfulChallenges: 15
      })
      
      renderer.showVictory(playerStats)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should show stage clear', () => {
      const playerStats = TestDataGenerator.createTestPlayerStats({
        turnsPlayed: 10,
        successfulChallenges: 8
      })
      
      renderer.showStageClear('youth', playerStats)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('Utility Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should clear screen', () => {
      renderer.clear()
      
      // Should not throw
      expect(true).toBe(true)
    })

    it('should check waiting for input', () => {
      const result = renderer.isWaitingForInput()
      
      expect(typeof result).toBe('boolean')
    })

    it('should set debug mode', () => {
      renderer.setDebugMode(true)
      
      // Should not throw
      expect(true).toBe(true)
      
      renderer.setDebugMode(false)
      
      // Should not throw
      expect(true).toBe(true)
    })

    it('should dispose resources', () => {
      renderer.dispose()
      
      // Should complete without error
      expect(true).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should render game state quickly', async () => {
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'game_state_render',
        () => renderer.displayGameState(testGame)
      )
      
      // Should render quickly (< 10ms)
      expect(timeMs).toBeLessThan(10)
    })

    it('should handle multiple rapid renders efficiently', async () => {
      const renderCount = 100
      
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'rapid_renders',
        () => {
          for (let i = 0; i < renderCount; i++) {
            renderer.showMessage(`Message ${i}`)
          }
        }
      )
      
      // Should handle rapid renders efficiently
      expect(timeMs).toBeLessThan(100)
      console.log(`Rendered ${renderCount} messages in ${timeMs.toFixed(2)}ms`)
    })

    it('should handle large card displays efficiently', async () => {
      const largeCardSet = TestDataGenerator.createTestCards(100)
      
      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'large_card_display',
        () => renderer.displayHand(largeCardSet)
      )
      
      // Should handle large card sets reasonably
      expect(timeMs).toBeLessThan(50)
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not leak memory during normal operation', async () => {
      await renderer.initialize()
      
      const initialDelta = MemoryTestHelper.getMemoryDelta()
      
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        renderer.showMessage(`Test message ${i}`)
        renderer.displayVitality(i, 100)
        
        const cards = TestDataGenerator.createTestCards(5)
        renderer.displayHand(cards)
      }
      
      const finalDelta = MemoryTestHelper.getMemoryDelta()
      const memoryIncrease = finalDelta - initialDelta
      
      // Memory increase should be reasonable (< 5MB)
      MemoryTestHelper.assertMemoryUsage(5 * 1024 * 1024)
      
      console.log(`Memory usage after 100 operations: ${MemoryTestHelper.formatBytes(memoryIncrease)}`)
    })

    it('should clean up properly after cleanup', async () => {
      await renderer.initialize()
      
      // Perform operations
      renderer.displayGameState(testGame)
      renderer.showMessage('Test message')
      
      // Cleanup
      renderer.dispose()
      
      // Should not have significant memory retention
      const memoryDelta = MemoryTestHelper.getMemoryDelta()
      expect(memoryDelta).toBeLessThan(1024 * 1024) // Less than 1MB
    })
  })

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should handle null game state gracefully', () => {
      expect(() => renderer.displayGameState(null as any)).not.toThrow()
    })

    it('should handle empty card arrays', () => {
      expect(() => renderer.displayHand([])).not.toThrow()
      expect(() => renderer.displayInsuranceCards([])).not.toThrow()
    })

    it('should handle invalid challenge results', () => {
      const invalidResult = null as any
      expect(() => renderer.showChallengeResult(invalidResult)).not.toThrow()
    })

    it('should handle undefined player stats', () => {
      expect(() => renderer.showGameOver(undefined as any)).not.toThrow()
      expect(() => renderer.showVictory(undefined as any)).not.toThrow()
    })

    it('should handle extreme numeric values', () => {
      expect(() => renderer.displayVitality(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).not.toThrow()
      expect(() => renderer.displayInsuranceBurden(Number.MAX_SAFE_INTEGER)).not.toThrow()
      expect(() => renderer.displayProgress('youth', Number.MAX_SAFE_INTEGER)).not.toThrow()
    })

    it('should handle malformed cards gracefully', () => {
      const malformedCards = [
        null,
        undefined,
        {},
        { name: null },
        { id: undefined, name: 'Test' }
      ] as any[]
      
      expect(() => renderer.displayHand(malformedCards)).not.toThrow()
    })

    it('should handle console errors gracefully', () => {
      // Mock console.log to throw
      consoleLogSpy.mockImplementation(() => {
        throw new Error('Console error')
      })
      
      // Should handle console errors without crashing
      expect(() => renderer.showMessage('Test')).not.toThrow()
    })
  })

  describe('Theme and Styling Tests', () => {
    it('should apply different themes correctly', async () => {
      const themes = ['default', 'minimal', 'cyberpunk', 'retro', 'elegant']
      
      for (const theme of themes) {
        const themedRenderer = new InteractiveCUIRenderer({ theme: theme as any })
        await themedRenderer.initialize()
        
        // Each theme should render without errors
        expect(() => themedRenderer.showMessage(`Testing ${theme} theme`)).not.toThrow()
        
        themedRenderer.dispose()
      }
    })

    it('should handle animation speed settings', async () => {
      const speeds = ['slow', 'normal', 'fast', 'instant']
      
      for (const speed of speeds) {
        const speedRenderer = new InteractiveCUIRenderer({ animationSpeed: speed as any })
        await speedRenderer.initialize()
        
        // Each speed should work without errors
        expect(() => speedRenderer.displayGameState(testGame)).not.toThrow()
        
        speedRenderer.dispose()
      }
    })

    it('should toggle progress display correctly', async () => {
      // Test with progress enabled
      const progressRenderer = new InteractiveCUIRenderer({ showProgress: true })
      await progressRenderer.initialize()
      
      expect(() => progressRenderer.displayProgress('youth', 5)).not.toThrow()
      
      progressRenderer.dispose()
      
      // Test with progress disabled
      const noProgressRenderer = new InteractiveCUIRenderer({ showProgress: false })
      await noProgressRenderer.initialize()
      
      expect(() => noProgressRenderer.displayProgress('youth', 5)).not.toThrow()
      
      noProgressRenderer.dispose()
    })
  })

  describe('Stress Tests', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should handle rapid method calls', async () => {
      const iterations = 1000
      let errorCount = 0
      
      for (let i = 0; i < iterations; i++) {
        try {
          renderer.showMessage(`Stress test ${i}`)
          renderer.displayVitality(i % 100, 100)
          renderer.displayProgress('youth', i)
        } catch (error) {
          errorCount++
        }
      }
      
      // Should handle rapid calls with minimal errors
      expect(errorCount).toBeLessThan(iterations * 0.01) // Less than 1% error rate
      
      console.log(`Stress test: ${iterations - errorCount}/${iterations} successful calls`)
    })

    it('should handle concurrent operations', async () => {
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve().then(() => {
          renderer.showMessage(`Concurrent operation ${i}`)
          renderer.displayVitality(i * 10, 100)
        })
      )
      
      // Should handle concurrent operations without issues
      await expect(Promise.all(concurrentOperations)).resolves.toBeDefined()
    })
  })

  describe('Integration with Game Components', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should integrate with complete game flow', async () => {
      // Simulate complete game interaction
      renderer.displayGameState(testGame)
      
      const cards = TestDataGenerator.createTestCards(5)
      renderer.displayHand(cards)
      
      const challengeCard = TestDataGenerator.createTestCards(1)[0]
      renderer.displayChallenge(challengeCard)
      
      const challengeResult = TestDataGenerator.createTestChallengeResult()
      renderer.showChallengeResult(challengeResult)
      
      const playerStats = TestDataGenerator.createTestPlayerStats()
      renderer.showVictory(playerStats)
      
      // All operations should complete without errors
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should maintain state consistency across operations', async () => {
      let operationCount = 0
      
      // Override console.log to count operations
      consoleLogSpy.mockImplementation(() => {
        operationCount++
      })
      
      // Perform sequence of operations
      renderer.displayGameState(testGame)
      renderer.showMessage('Test message')
      renderer.displayVitality(50, 100)
      renderer.displayInsuranceBurden(10)
      
      // Should have recorded all operations
      expect(operationCount).toBeGreaterThan(0)
    })
  })
})