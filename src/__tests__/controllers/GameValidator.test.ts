import { describe, it, expect, beforeEach } from 'vitest'
import { GameValidator, GameValidationError, GameValidationWarning } from '@/controllers/GameValidator'
import type { ValidationResult } from '@/controllers/GameValidator'
import { Game } from '@/domain/entities/Game'
import { Card } from '@/domain/entities/Card'
import { TestDataGenerator, PerformanceTestHelper } from '../utils/TestHelpers'
import type { GameConfig } from '@/domain/types/game.types'

describe('GameValidator Comprehensive Tests', () => {
  let testConfig: GameConfig
  let testGame: Game
  let testCards: Card[]

  beforeEach(() => {
    TestDataGenerator.setSeed(12345)
    testConfig = TestDataGenerator.createTestGameConfig()
    testGame = new Game(testConfig)
    testCards = TestDataGenerator.createTestCards(5)
  })

  describe('Game Configuration Validation', () => {
    it('should validate correct game configuration', () => {
      const validConfig = TestDataGenerator.createTestGameConfig({
        maxTurns: 10,
        initialVitality: 100,
        maxVitality: 100,
        challengeDifficulty: 'normal'
      })

      const result = GameValidator.validateGameConfig(validConfig)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid initial vitality', () => {
      const invalidConfig = TestDataGenerator.createTestGameConfig({
        initialVitality: -10
      })

      const result = GameValidator.validateGameConfig(invalidConfig)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('初期体力は1以上である必要があります')
    })

    it('should detect invalid starting hand size', () => {
      const invalidConfig = TestDataGenerator.createTestGameConfig({
        startingHandSize: -5
      })

      const result = GameValidator.validateGameConfig(invalidConfig)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('初期手札サイズは0以上'))).toBe(true)
    })

    it('should detect max hand size smaller than starting hand size', () => {
      const invalidConfig = TestDataGenerator.createTestGameConfig({
        startingHandSize: 10,
        maxHandSize: 5
      })

      const result = GameValidator.validateGameConfig(invalidConfig)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('最大手札サイズは初期手札サイズ以上'))).toBe(true)
    })

    it('should detect negative dream card count', () => {
      const invalidConfig = TestDataGenerator.createTestGameConfig({
        dreamCardCount: -3
      })

      const result = GameValidator.validateGameConfig(invalidConfig)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('夢カード数は0以上'))).toBe(true)
    })

    it('should generate warnings for extreme values', () => {
      const extremeConfig = TestDataGenerator.createTestGameConfig({
        initialVitality: 150,
        maxHandSize: 20
      })

      const result = GameValidator.validateGameConfig(extremeConfig)
      
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(warning => warning.includes('初期体力が100を超えています'))).toBe(true)
      expect(result.warnings.some(warning => warning.includes('最大手札サイズが15を超えています'))).toBe(true)
    })

    it('should handle edge case values correctly', () => {
      const edgeCases = [
        { initialVitality: 1, description: 'minimum vitality' },
        { initialVitality: 100, description: 'maximum normal vitality' },
        { startingHandSize: 0, description: 'minimum hand size' },
        { maxHandSize: 15, description: 'maximum normal hand size' },
        { dreamCardCount: 0, description: 'no dream cards' }
      ]

      edgeCases.forEach(({ description, ...configOverride }) => {
        const config = TestDataGenerator.createTestGameConfig(configOverride)
        const result = GameValidator.validateGameConfig(config)
        
        expect(result.isValid).toBe(true)
        console.log(`Edge case passed: ${description}`)
      })
    })
  })

  describe('Game State Validation', () => {
    it('should validate normal game state', () => {
      const result = GameValidator.validateGameState(testGame)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect negative vitality', () => {
      // Manually set invalid state for testing
      Object.defineProperty(testGame, 'vitality', { value: -10, configurable: true })

      const result = GameValidator.validateGameState(testGame)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('体力が負の値になっています')
    })

    it('should detect vitality exceeding maximum', () => {
      Object.defineProperty(testGame, 'vitality', { value: 150, configurable: true })
      Object.defineProperty(testGame, 'maxVitality', { value: 100, configurable: true })

      const result = GameValidator.validateGameState(testGame)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('体力が最大値を超えています')
    })

    it('should detect hand size exceeding maximum', () => {
      // Create game with larger hand than allowed
      const largeHand = TestDataGenerator.createTestCards(20)
      Object.defineProperty(testGame, 'playerHand', { value: largeHand, configurable: true })

      const result = GameValidator.validateGameState(testGame)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('手札が最大サイズ'))).toBe(true)
    })

    it('should detect negative turn count', () => {
      Object.defineProperty(testGame, 'turn', { value: -1, configurable: true })

      const result = GameValidator.validateGameState(testGame)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('ターン数が負の値になっています')
    })

    it('should validate deck integrity', () => {
      // Create deck with duplicate IDs
      const duplicateCards = [
        TestDataGenerator.createTestCards(1)[0],
        TestDataGenerator.createTestCards(1)[0] // Same card (same ID)
      ]
      
      // Mock the deck to return duplicate cards
      const mockDeck = {
        getCards: () => duplicateCards
      }
      Object.defineProperty(testGame, 'playerDeck', { value: mockDeck, configurable: true })

      const result = GameValidator.validateGameState(testGame)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('重複したIDのカード'))).toBe(true)
    })

    it('should validate insurance cards', () => {
      // Create invalid insurance cards
      const invalidInsurance = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(invalidInsurance, 'type', { value: 'invalid_type', configurable: true })
      Object.defineProperty(invalidInsurance, 'cost', { value: -10, configurable: true })
      
      Object.defineProperty(testGame, 'insuranceCards', { value: [invalidInsurance], configurable: true })

      const result = GameValidator.validateGameState(testGame)
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('無効な保険タイプ'))).toBe(true)
      expect(result.errors.some(error => error.includes('コストが無効'))).toBe(true)
    })
  })

  describe('Card Selection Validation', () => {
    it('should validate correct card selection', () => {
      const availableCards = TestDataGenerator.createTestCards(5)
      const selectedCards = [availableCards[0], availableCards[2]]

      const result = GameValidator.validateCardSelection(
        selectedCards,
        availableCards,
        1,
        3
      )
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect insufficient selection', () => {
      const availableCards = TestDataGenerator.createTestCards(5)
      const selectedCards: Card[] = []

      const result = GameValidator.validateCardSelection(
        selectedCards,
        availableCards,
        2,
        5
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('最低2枚のカードを選択する必要があります')
    })

    it('should detect excessive selection', () => {
      const availableCards = TestDataGenerator.createTestCards(5)
      const selectedCards = availableCards.slice(0, 4)

      const result = GameValidator.validateCardSelection(
        selectedCards,
        availableCards,
        1,
        2
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('最大2枚まで選択可能です')
    })

    it('should detect unavailable card selection', () => {
      const availableCards = TestDataGenerator.createTestCards(3)
      const unavailableCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(unavailableCard, 'id', { value: 'unavailable-card', configurable: true })
      Object.defineProperty(unavailableCard, 'name', { value: 'Unavailable Card', configurable: true })
      
      const selectedCards = [unavailableCard]

      const result = GameValidator.validateCardSelection(
        selectedCards,
        availableCards,
        1,
        1
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('選択可能なカードに含まれていません'))).toBe(true)
    })

    it('should detect duplicate selection', () => {
      const availableCards = TestDataGenerator.createTestCards(5)
      const duplicateCard = availableCards[0]
      const selectedCards = [duplicateCard, duplicateCard]

      const result = GameValidator.validateCardSelection(
        selectedCards,
        availableCards,
        1,
        5
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('同じカードを複数回選択することはできません')
    })

    it('should handle empty available cards gracefully', () => {
      const availableCards: Card[] = []
      const selectedCards: Card[] = []

      const result = GameValidator.validateCardSelection(
        selectedCards,
        availableCards,
        0,
        0
      )
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('Challenge Execution Validation', () => {
    it('should validate correct challenge execution', () => {
      const challengeCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(challengeCard, 'power', { value: 50, configurable: true })
      
      const playerHand = TestDataGenerator.createTestCards(3)
      playerHand.forEach((card, index) => {
        Object.defineProperty(card, 'power', { value: 20 + index * 10, configurable: true })
      })
      
      const selectedCards = [playerHand[0], playerHand[1]]

      const result = GameValidator.validateChallengeExecution(
        challengeCard,
        selectedCards,
        playerHand
      )
      
      expect(result.isValid).toBe(true)
    })

    it('should detect missing challenge card', () => {
      const result = GameValidator.validateChallengeExecution(
        null as any,
        [],
        []
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('チャレンジカードが指定されていません')
    })

    it('should detect challenge card without power', () => {
      const challengeCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(challengeCard, 'power', { value: undefined, configurable: true })
      
      const result = GameValidator.validateChallengeExecution(
        challengeCard,
        [],
        []
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('チャレンジカードにパワーが設定されていません')
    })

    it('should validate card selection within challenge', () => {
      const challengeCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(challengeCard, 'power', { value: 50, configurable: true })
      
      const playerHand = TestDataGenerator.createTestCards(3)
      const unavailableCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(unavailableCard, 'id', { value: 'not-in-hand', configurable: true })
      
      const selectedCards = [unavailableCard]

      const result = GameValidator.validateChallengeExecution(
        challengeCard,
        selectedCards,
        playerHand
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('選択可能なカードに含まれていません'))).toBe(true)
    })

    it('should warn about cards without power', () => {
      const challengeCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(challengeCard, 'power', { value: 50, configurable: true })
      
      const playerHand = TestDataGenerator.createTestCards(3)
      playerHand.forEach(card => {
        Object.defineProperty(card, 'power', { value: undefined, configurable: true })
      })
      
      const selectedCards = [playerHand[0]]

      const result = GameValidator.validateChallengeExecution(
        challengeCard,
        selectedCards,
        playerHand
      )
      
      expect(result.warnings).toContain('選択されたカードにパワーが設定されていません')
    })
  })

  describe('Insurance Renewal Validation', () => {
    it('should validate correct insurance renewal', () => {
      const insurance = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(insurance, 'type', { value: 'whole_life', configurable: true })
      Object.defineProperty(insurance, 'cost', { value: 10, configurable: true })
      
      const result = GameValidator.validateInsuranceRenewal(
        insurance,
        10,
        100
      )
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing insurance card', () => {
      const result = GameValidator.validateInsuranceRenewal(
        null as any,
        10,
        100
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('保険カードが指定されていません')
    })

    it('should detect negative renewal cost', () => {
      const insurance = TestDataGenerator.createTestCards(1)[0]
      
      const result = GameValidator.validateInsuranceRenewal(
        insurance,
        -5,
        100
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('更新コストが負の値です')
    })

    it('should detect renewal cost exceeding vitality', () => {
      const insurance = TestDataGenerator.createTestCards(1)[0]
      
      const result = GameValidator.validateInsuranceRenewal(
        insurance,
        150,
        100
      )
      
      expect(result.isValid).toBe(false)
      expect(result.errors.some(error => error.includes('現在の体力を上回っています'))).toBe(true)
    })

    it('should warn about high renewal cost', () => {
      const insurance = TestDataGenerator.createTestCards(1)[0]
      
      const result = GameValidator.validateInsuranceRenewal(
        insurance,
        85,
        100
      )
      
      expect(result.warnings).toContain('更新コストが体力の80%を超えています。慎重に検討してください')
    })
  })

  describe('Performance Tests', () => {
    it('should validate game config quickly', async () => {
      const configs = Array.from({ length: 1000 }, (_, i) => 
        TestDataGenerator.createTestGameConfig({ maxTurns: i + 1 })
      )

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'config_validation',
        () => {
          configs.forEach(config => GameValidator.validateGameConfig(config))
        }
      )

      // Should validate 1000 configs in under 50ms
      expect(timeMs).toBeLessThan(50)
      console.log(`Validated 1000 configs in ${timeMs.toFixed(2)}ms`)
    })

    it('should validate game state efficiently', async () => {
      const games = Array.from({ length: 100 }, () => new Game(testConfig))

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'state_validation',
        () => {
          games.forEach(game => GameValidator.validateGameState(game))
        }
      )

      // Should validate 100 game states in under 100ms
      expect(timeMs).toBeLessThan(100)
      console.log(`Validated 100 game states in ${timeMs.toFixed(2)}ms`)
    })

    it('should handle large card selections efficiently', async () => {
      const largeAvailableCards = TestDataGenerator.createTestCards(1000)
      const largeSelectedCards = largeAvailableCards.slice(0, 100)

      const { timeMs } = await PerformanceTestHelper.measureExecutionTime(
        'large_card_selection',
        () => GameValidator.validateCardSelection(
          largeSelectedCards,
          largeAvailableCards,
          1,
          100
        )
      )

      // Should handle large selections efficiently
      expect(timeMs).toBeLessThan(20)
      console.log(`Validated selection of 100 from 1000 cards in ${timeMs.toFixed(2)}ms`)
    })
  })

  describe('Error and Warning Classes', () => {
    it('should create GameValidationError correctly', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errors: ['Test error'],
        warnings: []
      }

      const error = new GameValidationError('Test message', validationResult)
      
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(GameValidationError)
      expect(error.name).toBe('GameValidationError')
      expect(error.message).toBe('Test message')
      expect(error.validationResult).toEqual(validationResult)
    })

    it('should create GameValidationWarning correctly', () => {
      const warnings = ['Warning 1', 'Warning 2']
      const warning = new GameValidationWarning('Test warning message', warnings)
      
      expect(warning).toBeInstanceOf(Error)
      expect(warning).toBeInstanceOf(GameValidationWarning)
      expect(warning.name).toBe('GameValidationWarning')
      expect(warning.message).toBe('Test warning message')
      expect(warning.warnings).toEqual(warnings)
    })
  })

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // Test null config
      expect(() => GameValidator.validateGameConfig(null as any)).not.toThrow()
      
      // Test undefined cards
      const result = GameValidator.validateCardSelection(
        undefined as any,
        undefined as any,
        0,
        0
      )
      expect(result.isValid).toBe(false)
    })

    it('should handle empty arrays correctly', () => {
      const result = GameValidator.validateCardSelection([], [], 0, 0)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle extreme numeric values', () => {
      const extremeConfig = TestDataGenerator.createTestGameConfig({
        initialVitality: Number.MAX_SAFE_INTEGER,
        maxTurns: Number.MAX_SAFE_INTEGER
      })

      const result = GameValidator.validateGameConfig(extremeConfig)
      // Should handle extreme values without crashing
      expect(result).toBeDefined()
    })

    it('should validate complex game state combinations', () => {
      // Create a complex game state with multiple edge conditions
      const complexGame = new Game(testConfig)
      
      // Set multiple boundary conditions
      Object.defineProperty(complexGame, 'vitality', { value: 1, configurable: true }) // Minimum vitality
      Object.defineProperty(complexGame, 'turn', { value: testConfig.maxTurns - 1, configurable: true }) // Near max turns
      
      const result = GameValidator.validateGameState(complexGame)
      
      // Should handle complex state without errors
      expect(result.isValid).toBe(true)
    })
  })

  describe('Comprehensive Integration Tests', () => {
    it('should validate entire game flow', async () => {
      const validationResults: ValidationResult[] = []
      
      // Validate config
      validationResults.push(GameValidator.validateGameConfig(testConfig))
      
      // Validate initial game state
      validationResults.push(GameValidator.validateGameState(testGame))
      
      // Simulate game progression with validations
      const availableCards = TestDataGenerator.createTestCards(5)
      const selectedCards = [availableCards[0]]
      
      validationResults.push(GameValidator.validateCardSelection(
        selectedCards,
        availableCards,
        1,
        1
      ))
      
      // Validate challenge execution
      const challengeCard = TestDataGenerator.createTestCards(1)[0]
      Object.defineProperty(challengeCard, 'power', { value: 30, configurable: true })
      
      validationResults.push(GameValidator.validateChallengeExecution(
        challengeCard,
        selectedCards,
        availableCards
      ))
      
      // All validations should pass
      validationResults.forEach((result, index) => {
        expect(result.isValid).toBe(true)
        console.log(`Validation step ${index + 1}: PASSED`)
      })
      
      expect(validationResults).toHaveLength(4)
    })
  })
})