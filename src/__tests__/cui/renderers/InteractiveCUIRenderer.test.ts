import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InteractiveCUIRenderer } from '@/cui/renderers/InteractiveCUIRenderer'
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
    dim: vi.fn((text) => `DIM:${text}`)
  }
}))

vi.mock('boxen', () => ({
  default: vi.fn((text, options) => `BOXED[${options?.title || 'NO_TITLE'}]:${text}`)
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
      
      // Should initialize quickly
      expect(timeMs).toBeLessThan(50)
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

    it('should display stage progress', () => {
      renderer.displayStageProgress('youth', 3, 10)
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('youth')
      expect(allLogs).toContain('3')
      expect(allLogs).toContain('10')
    })
  })

  describe('Message Display Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should display info messages', () => {
      renderer.displayMessage('Test info message', 'info')
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('Test info message')
    })

    it('should display error messages', () => {
      renderer.displayError('Test error message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display success messages', () => {
      renderer.displaySuccess('Test success message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display warning messages', () => {
      renderer.displayWarning('Test warning message')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should handle different message levels', () => {
      const levels = ['info', 'warning', 'error', 'success'] as const
      
      levels.forEach(level => {
        renderer.displayMessage(`Test ${level} message`, level)
        expect(consoleLogSpy).toHaveBeenCalled()
      })
    })

    it('should handle messages without level', () => {
      renderer.displayMessage('Test message without level')
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })
  })

  describe('Interactive Input Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should request card selection', async () => {
      const cards = TestDataGenerator.createTestCards(3)
      
      const selectedCard = await renderer.requestCardSelection(cards, 'Select a card')
      
      expect(selectedCard).toBeDefined()
      expect(cards).toContain(selectedCard)
    })

    it('should request insurance selection', async () => {
      const insurances = TestDataGenerator.createTestCards(3)
      
      const selectedInsurances = await renderer.requestInsuranceSelection(insurances, 'Select insurance')
      
      expect(Array.isArray(selectedInsurances)).toBe(true)
    })

    it('should request yes/no confirmation', async () => {
      // Mock inquirer response
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValueOnce({ confirm: true })
      
      const result = await renderer.requestYesNo('Do you agree?')
      
      expect(typeof result).toBe('boolean')
    })

    it('should request text input', async () => {
      // Mock inquirer response
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValueOnce({ input: 'test input' })
      
      const result = await renderer.requestInput('Enter text:')
      
      expect(typeof result).toBe('string')
    })

    it('should handle empty card selection gracefully', async () => {
      const emptyCards: any[] = []
      
      // Should not throw
      await expect(renderer.requestCardSelection(emptyCards, 'Select from empty')).resolves.toBeDefined()
    })

    it('should handle inquirer errors gracefully', async () => {
      // Mock inquirer to throw
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockRejectedValueOnce(new Error('Input error'))
      
      // Should handle error without crashing
      await expect(renderer.requestInput('Test')).resolves.toBeDefined()
    })
  })

  describe('Game Flow Display Methods', () => {
    beforeEach(async () => {
      await renderer.initialize()
    })

    it('should display challenge result', () => {
      const challengeResult = TestDataGenerator.createTestChallengeResult({
        success: true,
        vitalityDamage: 10,
        message: 'Challenge completed successfully'
      })
      
      renderer.displayChallengeResult(challengeResult)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display turn start', () => {
      renderer.displayTurnStart(5)
      
      expect(consoleLogSpy).toHaveBeenCalled()
      const allLogs = consoleLogSpy.mock.calls.flat().join(' ')
      expect(allLogs).toContain('5')
    })

    it('should display turn end', () => {
      renderer.displayTurnEnd(5)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display game end', () => {
      const playerStats = TestDataGenerator.createTestPlayerStats({
        finalVitality: 85,
        totalTurns: 8
      })
      
      renderer.displayGameEnd(playerStats)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display final results', () => {
      const playerStats = TestDataGenerator.createTestPlayerStats({
        score: 1500,
        achievements: ['survivor', 'strategic']
      })
      
      renderer.displayFinalResults(playerStats)
      
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

    it('should show help', () => {
      renderer.showHelp()
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should display debug info', () => {
      const debugInfo = {
        currentState: 'test',
        debugData: [1, 2, 3]
      }
      
      renderer.displayDebugInfo(debugInfo)
      
      expect(consoleLogSpy).toHaveBeenCalled()
    })

    it('should wait for input', async () => {
      // Mock inquirer for wait
      const inquirer = await import('inquirer')
      vi.mocked(inquirer.default.prompt).mockResolvedValueOnce({ continue: true })
      
      await renderer.waitForInput('Press enter to continue')
      
      // Should complete without error
      expect(true).toBe(true)
    })

    it('should cleanup resources', async () => {
      await renderer.cleanup()
      
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
            renderer.displayMessage(`Message ${i}`)
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
        renderer.displayMessage(`Test message ${i}`)
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
      renderer.displayMessage('Test message')
      
      // Cleanup
      await renderer.cleanup()
      
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
      expect(() => renderer.displayChallengeResult(invalidResult)).not.toThrow()
    })

    it('should handle undefined player stats', () => {
      expect(() => renderer.displayGameEnd(undefined as any)).not.toThrow()
      expect(() => renderer.displayFinalResults(undefined as any)).not.toThrow()
    })

    it('should handle extreme numeric values', () => {
      expect(() => renderer.displayVitality(Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER)).not.toThrow()
      expect(() => renderer.displayInsuranceBurden(Number.MAX_SAFE_INTEGER)).not.toThrow()
      expect(() => renderer.displayTurnStart(Number.MAX_SAFE_INTEGER)).not.toThrow()
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
      expect(() => renderer.displayMessage('Test')).not.toThrow()
    })
  })

  describe('Theme and Styling Tests', () => {
    it('should apply different themes correctly', async () => {
      const themes = ['default', 'minimal', 'cyberpunk', 'retro', 'elegant']
      
      for (const theme of themes) {
        const themedRenderer = new InteractiveCUIRenderer({ theme: theme as any })
        await themedRenderer.initialize()
        
        // Each theme should render without errors
        expect(() => themedRenderer.displayMessage(`Testing ${theme} theme`)).not.toThrow()
        
        await themedRenderer.cleanup()
      }
    })

    it('should handle animation speed settings', async () => {
      const speeds = ['slow', 'normal', 'fast', 'instant']
      
      for (const speed of speeds) {
        const speedRenderer = new InteractiveCUIRenderer({ animationSpeed: speed as any })
        await speedRenderer.initialize()
        
        // Each speed should work without errors
        expect(() => speedRenderer.displayGameState(testGame)).not.toThrow()
        
        await speedRenderer.cleanup()
      }
    })

    it('should toggle progress display correctly', async () => {
      // Test with progress enabled
      const progressRenderer = new InteractiveCUIRenderer({ showProgress: true })
      await progressRenderer.initialize()
      
      expect(() => progressRenderer.displayStageProgress('youth', 5, 10)).not.toThrow()
      
      await progressRenderer.cleanup()
      
      // Test with progress disabled
      const noProgressRenderer = new InteractiveCUIRenderer({ showProgress: false })
      await noProgressRenderer.initialize()
      
      expect(() => noProgressRenderer.displayStageProgress('youth', 5, 10)).not.toThrow()
      
      await noProgressRenderer.cleanup()
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
          renderer.displayMessage(`Stress test ${i}`)
          renderer.displayVitality(i % 100, 100)
          renderer.displayTurnStart(i)
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
          renderer.displayMessage(`Concurrent operation ${i}`)
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
      renderer.displayChallengeResult(challengeResult)
      
      const playerStats = TestDataGenerator.createTestPlayerStats()
      renderer.displayFinalResults(playerStats)
      
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
      renderer.displayMessage('Test message')
      renderer.displayVitality(50, 100)
      renderer.showHelp()
      
      // Should have recorded all operations
      expect(operationCount).toBeGreaterThan(0)
    })
  })
})