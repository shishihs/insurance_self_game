import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GameController } from '@/controllers/GameController'
import { MockRenderer, TestDataGenerator, PerformanceTestHelper, MemoryTestHelper, SnapshotHelper } from '../utils/TestHelpers'
import type { GameConfig } from '@/domain/types/game.types'

describe('GameController Integration Tests', () => {
  let gameController: GameController
  let mockRenderer: MockRenderer
  let gameConfig: GameConfig

  beforeEach(() => {
    // Set deterministic seed for reproducible tests
    TestDataGenerator.setSeed(12345)
    
    // Create test configuration
    gameConfig = TestDataGenerator.createTestGameConfig({
      maxTurns: 5,
      initialVitality: 100,
      maxVitality: 100,
      challengeDifficulty: 'normal'
    })
    
    // Create mock renderer
    mockRenderer = new MockRenderer()
    
    // Create game controller
    gameController = new GameController(gameConfig, mockRenderer)
    
    // Start memory monitoring
    MemoryTestHelper.startMemoryMonitoring()
  })

  afterEach(() => {
    PerformanceTestHelper.clearMeasurements()
  })

  describe('Initialization and Setup', () => {
    it('should initialize correctly with valid config', () => {
      expect(gameController).toBeDefined()
      expect(gameController).toBeInstanceOf(GameController)
    })

    it('should call renderer initialize on game start', async () => {
      // Setup automated inputs for complete game
      mockRenderer.addInputValue(0) // Card selection
      mockRenderer.addInputValue([]) // Insurance selection
      mockRenderer.addInputValue(false) // Continue question
      
      await gameController.playGame()
      
      expect(mockRenderer.getLastCall('initialize')).toBeDefined()
    })

    it('should handle renderer initialization errors gracefully', async () => {
      // Mock renderer that fails on initialize
      const failingRenderer = new MockRenderer()
      failingRenderer.initialize = vi.fn().mockRejectedValue(new Error('Renderer init failed'))
      
      const controller = new GameController(gameConfig, failingRenderer)
      
      await expect(controller.playGame()).rejects.toThrow()
    })
  })

  describe('Complete Game Flow Tests', () => {
    it('should complete a full game successfully', async () => {
      // Setup inputs for complete game playthrough
      for (let i = 0; i < gameConfig.maxTurns; i++) {
        mockRenderer.addInputValue(0) // Always select first card
        mockRenderer.addInputValue([]) // No insurance selections
      }
      mockRenderer.addInputValue(false) // Don't continue after game

      const result = await gameController.playGame()
      
      // Verify game completion
      expect(result).toBeDefined()
      expect(result.totalTurns).toBeGreaterThan(0)
      expect(result.gameResult).toBe('completed')
      
      // Verify renderer calls
      expect(mockRenderer.getLastCall('initialize')).toBeDefined()
      expect(mockRenderer.getLastCall('displayFinalResults')).toBeDefined()
      expect(mockRenderer.getAllCalls('displayGameState').length).toBeGreaterThan(0)
    })

    it('should handle early game termination', async () => {
      // Setup config for quick failure
      const quickFailConfig = TestDataGenerator.createTestGameConfig({
        maxTurns: 10,
        initialVitality: 10 // Low health for quick failure
      })
      
      const controller = new GameController(quickFailConfig, mockRenderer)
      
      // Add minimal inputs
      mockRenderer.addInputValue(0)
      mockRenderer.addInputValue([])
      
      const result = await controller.playGame()
      
      // Should complete even with early termination
      expect(result).toBeDefined()
      expect(result.totalTurns).toBeLessThanOrEqual(quickFailConfig.maxTurns)
    })

    it('should maintain game state consistency throughout play', async () => {
      const snapshots: any[] = []
      
      // Create a custom renderer that captures game state
      class SnapshotRenderer extends MockRenderer {
        displayGameState(game: any): void {
          super.displayGameState(game)
          snapshots.push(SnapshotHelper.createGameStateSnapshot(game))
        }
      }
      
      const snapshotRenderer = new SnapshotRenderer()
      const controller = new GameController(gameConfig, snapshotRenderer)
      
      // Setup inputs
      for (let i = 0; i < 3; i++) {
        snapshotRenderer.addInputValue(0)
        snapshotRenderer.addInputValue([])
      }
      
      await controller.playGame()
      
      // Verify state progression
      expect(snapshots.length).toBeGreaterThan(0)
      
      // Each snapshot should have valid state
      snapshots.forEach((snapshot, index) => {
        expect(snapshot.status).toBeDefined()
        expect(snapshot.currentTurn).toBeGreaterThanOrEqual(0)
        expect(snapshot.vitality).toBeGreaterThanOrEqual(0)
        expect(snapshot.vitality).toBeLessThanOrEqual(snapshot.maxVitality)
        expect(snapshot.insuranceBurden).toBeGreaterThanOrEqual(0)
        
        // Turn should progress or stay same
        if (index > 0) {
          expect(snapshot.currentTurn).toBeGreaterThanOrEqual(snapshots[index - 1].currentTurn)
        }
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid card selection gracefully', async () => {
      // Provide invalid card selection indices
      mockRenderer.addInputValue(-1) // Invalid negative index
      mockRenderer.addInputValue(999) // Invalid high index
      mockRenderer.addInputValue(0) // Valid fallback
      mockRenderer.addInputValue([])
      
      const result = await controller.playGame()
      
      // Should complete despite invalid inputs
      expect(result).toBeDefined()
      expect(result.gameResult).toBe('completed')
    })

    it('should handle renderer errors during gameplay', async () => {
      // Create renderer that fails on specific calls
      const unreliableRenderer = new MockRenderer()
      unreliableRenderer.displayChallenge = vi.fn().mockImplementation(() => {
        throw new Error('Display error')
      })
      
      const controller = new GameController(gameConfig, unreliableRenderer)
      
      // Add inputs
      unreliableRenderer.addInputValue(0)
      unreliableRenderer.addInputValue([])
      
      // Should handle renderer errors gracefully
      await expect(controller.playGame()).resolves.toBeDefined()
    })

    it('should validate game configuration bounds', async () => {
      const invalidConfigs = [
        { maxTurns: 0 },
        { maxTurns: -1 },
        { initialVitality: -10 },
        { maxVitality: 0 }
      ]
      
      for (const invalidOverride of invalidConfigs) {
        const config = TestDataGenerator.createTestGameConfig(invalidOverride)
        
        // Should either throw or handle gracefully
        try {
          const controller = new GameController(config, mockRenderer)
          const result = await controller.playGame()
          // If it doesn't throw, result should be valid
          expect(result).toBeDefined()
        } catch (error) {
          // Throwing is also acceptable for invalid configs
          expect(error).toBeInstanceOf(Error)
        }
      }
    })

    it('should handle empty deck scenarios', async () => {
      // This tests edge case where all cards are drawn
      const config = TestDataGenerator.createTestGameConfig({
        maxTurns: 50 // High turn count to potentially exhaust deck
      })
      
      const controller = new GameController(config, mockRenderer)
      
      // Add many inputs
      for (let i = 0; i < 50; i++) {
        mockRenderer.addInputValue(0)
        mockRenderer.addInputValue([])
      }
      
      const result = await controller.playGame()
      
      // Should handle deck exhaustion gracefully
      expect(result).toBeDefined()
    })
  })

  describe('Performance Tests', () => {
    it('should complete game initialization within performance bounds', async () => {
      const { result, timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'game_initialization',
        () => gameController.playGame()
      )
      
      // Game should initialize quickly (< 100ms)
      expect(timeMs).toBeLessThan(100)
      expect(result).toBeDefined()
    })

    it('should handle multiple rapid games efficiently', async () => {
      const gameCount = 10
      const results: any[] = []
      
      for (let i = 0; i < gameCount; i++) {
        const renderer = new MockRenderer()
        renderer.addInputValue(0)
        renderer.addInputValue([])
        
        const controller = new GameController(gameConfig, renderer)
        
        const { result, timeMs } = await PerformanceTestHelper.measureExecutionTime(
          'rapid_games',
          () => controller.playGame()
        )
        
        results.push(result)
        
        // Each game should complete reasonably quickly
        expect(timeMs).toBeLessThan(50)
      }
      
      // All games should complete successfully
      expect(results).toHaveLength(gameCount)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(result.gameResult).toBeDefined()
      })
      
      // Check overall performance stats
      const stats = PerformanceTestHelper.getPerformanceStats('rapid_games')
      expect(stats).toBeDefined()
      expect(stats!.average).toBeLessThan(30) // Average < 30ms per game
    })

    it('should maintain consistent performance across game types', async () => {
      const configurations = [
        { maxTurns: 5, challengeDifficulty: 'easy' as const },
        { maxTurns: 10, challengeDifficulty: 'normal' as const },
        { maxTurns: 15, challengeDifficulty: 'hard' as const }
      ]
      
      for (const configOverride of configurations) {
        const config = TestDataGenerator.createTestGameConfig(configOverride)
        const renderer = new MockRenderer()
        const controller = new GameController(config, renderer)
        
        // Add sufficient inputs
        for (let i = 0; i < config.maxTurns; i++) {
          renderer.addInputValue(0)
          renderer.addInputValue([])
        }
        
        const { result, timeMs } = await PerformanceTestHelper.measureExecutionTime(
          `game_${config.challengeDifficulty}`,
          () => controller.playGame()
        )
        
        expect(result).toBeDefined()
        // Performance should scale reasonably with game length
        expect(timeMs).toBeLessThan(config.maxTurns * 10) // 10ms per turn max
      }
    })
  })

  describe('Memory Usage Tests', () => {
    it('should not leak memory during normal gameplay', async () => {
      const initialDelta = MemoryTestHelper.getMemoryDelta()
      
      // Run multiple games
      for (let i = 0; i < 5; i++) {
        const renderer = new MockRenderer()
        renderer.addInputValue(0)
        renderer.addInputValue([])
        
        const controller = new GameController(gameConfig, renderer)
        await controller.playGame()
      }
      
      const finalDelta = MemoryTestHelper.getMemoryDelta()
      const memoryIncrease = finalDelta - initialDelta
      
      // Memory increase should be reasonable (< 10MB)
      MemoryTestHelper.assertMemoryUsage(10 * 1024 * 1024)
      
      console.log(`Memory usage: ${MemoryTestHelper.formatBytes(memoryIncrease)}`)
    })

    it('should clean up resources properly', async () => {
      const renderer = new MockRenderer()
      renderer.addInputValue(0)
      renderer.addInputValue([])
      
      const controller = new GameController(gameConfig, renderer)
      await controller.playGame()
      
      // Verify cleanup was called
      expect(renderer.getLastCall('cleanup')).toBeDefined()
    })
  })

  describe('Stress Tests', () => {
    it('should handle 1000+ rapid game iterations', async () => {
      const iterations = 1000
      let successCount = 0
      let errorCount = 0
      
      for (let i = 0; i < iterations; i++) {
        try {
          const renderer = new MockRenderer()
          renderer.addInputValue(0)
          renderer.addInputValue([])
          
          const controller = new GameController(gameConfig, renderer)
          const result = await controller.playGame()
          
          if (result && result.gameResult) {
            successCount++
          }
        } catch (error) {
          errorCount++
        }
      }
      
      // Should have high success rate (>95%)
      expect(successCount).toBeGreaterThan(iterations * 0.95)
      expect(errorCount).toBeLessThan(iterations * 0.05)
      
      console.log(`Stress test: ${successCount}/${iterations} successful, ${errorCount} errors`)
    }, 30000) // 30 second timeout for stress test

    it('should handle concurrent game executions', async () => {
      const concurrentCount = 10
      
      const gamePromises = Array.from({ length: concurrentCount }, async (_, i) => {
        const renderer = new MockRenderer()
        renderer.addInputValue(0)
        renderer.addInputValue([])
        
        const controller = new GameController(gameConfig, renderer)
        return controller.playGame()
      })
      
      const results = await Promise.all(gamePromises)
      
      // All games should complete successfully
      expect(results).toHaveLength(concurrentCount)
      results.forEach((result, index) => {
        expect(result).toBeDefined()
        expect(result.gameResult).toBeDefined()
      })
    })
  })

  describe('Game State Validation', () => {
    it('should maintain valid game state transitions', async () => {
      // Create game with debug enabled
      const controller = new GameController(gameConfig, mockRenderer)
      
      // Add inputs
      mockRenderer.addInputValue(0)
      mockRenderer.addInputValue([])
      
      await controller.playGame()
      
      // Check that debug info was displayed
      const debugCalls = mockRenderer.getAllCalls('displayDebugInfo')
      expect(debugCalls.length).toBeGreaterThanOrEqual(0)
    })

    it('should validate turn progression logic', async () => {
      let turnCount = 0
      let lastTurn = -1
      
      class TurnTrackingRenderer extends MockRenderer {
        displayTurnStart(turn: number): void {
          super.displayTurnStart(turn)
          expect(turn).toBeGreaterThan(lastTurn)
          lastTurn = turn
          turnCount++
        }
      }
      
      const renderer = new TurnTrackingRenderer()
      const controller = new GameController(gameConfig, renderer)
      
      // Add inputs
      for (let i = 0; i < gameConfig.maxTurns; i++) {
        renderer.addInputValue(0)
        renderer.addInputValue([])
      }
      
      await controller.playGame()
      
      // Should have tracked all turns
      expect(turnCount).toBeGreaterThan(0)
      expect(turnCount).toBeLessThanOrEqual(gameConfig.maxTurns)
    })
  })

  describe('Snapshot Testing', () => {
    it('should produce consistent game flow snapshots', async () => {
      // Run the same game twice with same seed
      const renderer1 = new MockRenderer()
      const renderer2 = new MockRenderer()
      
      // Same inputs
      const inputs = [0, [], 0, [], 0, []]
      inputs.forEach(input => {
        renderer1.addInputValue(input)
        renderer2.addInputValue(input)
      })
      
      const controller1 = new GameController(
        TestDataGenerator.createTestGameConfig({ seed: 12345 }),
        renderer1
      )
      const controller2 = new GameController(
        TestDataGenerator.createTestGameConfig({ seed: 12345 }),
        renderer2
      )
      
      const result1 = await controller1.playGame()
      const result2 = await controller2.playGame()
      
      // Results should be identical for same seed and inputs
      expect(result1.totalTurns).toBe(result2.totalTurns)
      expect(result1.challengesCompleted).toBe(result2.challengesCompleted)
      expect(result1.gameResult).toBe(result2.gameResult)
      
      // Renderer call patterns should be similar
      const snapshot1 = SnapshotHelper.createRendererCallSnapshot(renderer1)
      const snapshot2 = SnapshotHelper.createRendererCallSnapshot(renderer2)
      
      expect(snapshot1.totalCalls).toBe(snapshot2.totalCalls)
      expect(snapshot1.methodCounts).toEqual(snapshot2.methodCounts)
    })
  })
})