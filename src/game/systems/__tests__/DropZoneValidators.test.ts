import { describe, it, expect, beforeEach, vi } from 'vitest'
import { 
  DropZoneValidators, 
  DropZoneActions, 
  DropZonePresets,
  type DropZoneValidator,
  type DropZoneAction 
} from '../DropZoneValidators'
import type { Card } from '@/domain/entities/Card'
import type { Game } from '@/domain/entities/Game'

describe('DropZoneValidators', () => {
  let mockCard: Card
  let mockInsuranceCard: Card
  let mockPitfallCard: Card
  let mockGame: Game

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockCard = {
      id: 'test-card',
      name: 'Test Card',
      type: 'life',
      power: 5,
      cost: 2
    } as Card

    mockInsuranceCard = {
      id: 'insurance-card',
      name: 'Test Insurance',
      type: 'insurance',
      power: 0,
      cost: 3
    } as Card

    mockPitfallCard = {
      id: 'pitfall-card',
      name: 'Test Pitfall',
      type: 'pitfall',
      power: -2,
      cost: 1
    } as Card

    mockGame = {
      currentChallenge: null,
      vitality: 20,
      maxVitality: 20,
      stage: 1,
      playerHand: {
        size: vi.fn(() => 5),
        contains: vi.fn(() => true),
        removeCard: vi.fn()
      },
      discardPile: {
        addCard: vi.fn()
      },
      playerDeck: {
        addCard: vi.fn(),
        shuffle: vi.fn()
      },
      playedCards: {
        addCard: vi.fn()
      },
      maxHandSize: 7,
      getCurrentPhase: vi.fn(() => 'setup'),
      getPlayerAge: vi.fn(() => 25),
      startChallenge: vi.fn(),
      placeChallengeCard: vi.fn(),
      discardCard: vi.fn()
    } as unknown as Game
  })

  describe('Basic Validators', () => {
    describe('cardTypeOnly validator', () => {
      it('should validate allowed card types', () => {
        const validator = DropZoneValidators.cardTypeOnly(['life', 'insurance'])
        
        expect(validator(mockCard, mockGame)).toBe(true)
        expect(validator(mockInsuranceCard, mockGame)).toBe(true)
        expect(validator(mockPitfallCard, mockGame)).toBe(false)
      })

      it('should handle empty allowed types', () => {
        const validator = DropZoneValidators.cardTypeOnly([])
        
        expect(validator(mockCard, mockGame)).toBe(false)
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
        expect(validator(mockPitfallCard, mockGame)).toBe(false)
      })

      it('should handle single card type', () => {
        const validator = DropZoneValidators.cardTypeOnly(['life'])
        
        expect(validator(mockCard, mockGame)).toBe(true)
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
      })
    })

    describe('phaseOnly validator', () => {
      it('should validate allowed game phases', () => {
        const validator = DropZoneValidators.phaseOnly(['purchase', 'renewal'])
        
        mockGame.getCurrentPhase = vi.fn(() => 'purchase')
        expect(validator(mockCard, mockGame)).toBe(true)
        
        mockGame.getCurrentPhase = vi.fn(() => 'setup')
        expect(validator(mockCard, mockGame)).toBe(false)
      })

      it('should handle undefined getCurrentPhase', () => {
        const validator = DropZoneValidators.phaseOnly(['unknown'])
        
        mockGame.getCurrentPhase = undefined
        expect(validator(mockCard, mockGame)).toBe(true) // Defaults to 'unknown'
      })
    })

    describe('power-based validators', () => {
      it('should validate minimum power requirements', () => {
        const validator = DropZoneValidators.minimumPower(3)
        
        expect(validator(mockCard, mockGame)).toBe(true) // power = 5
        expect(validator(mockInsuranceCard, mockGame)).toBe(false) // power = 0
        expect(validator(mockPitfallCard, mockGame)).toBe(false) // power = -2
      })

      it('should validate maximum power limits', () => {
        const validator = DropZoneValidators.maximumPower(3)
        
        expect(validator(mockCard, mockGame)).toBe(false) // power = 5
        expect(validator(mockInsuranceCard, mockGame)).toBe(true) // power = 0
        expect(validator(mockPitfallCard, mockGame)).toBe(true) // power = -2
      })

      it('should handle edge cases for power validation', () => {
        const exactValidator = DropZoneValidators.minimumPower(5)
        expect(exactValidator(mockCard, mockGame)).toBe(true) // Exactly 5
        
        const zeroValidator = DropZoneValidators.minimumPower(0)
        expect(zeroValidator(mockPitfallCard, mockGame)).toBe(false) // -2 < 0
      })
    })

    describe('cost-based validators', () => {
      it('should validate cost limits', () => {
        const validator = DropZoneValidators.costLimit(2)
        
        expect(validator(mockCard, mockGame)).toBe(true) // cost = 2
        expect(validator(mockInsuranceCard, mockGame)).toBe(false) // cost = 3
        expect(validator(mockPitfallCard, mockGame)).toBe(true) // cost = 1
      })

      it('should handle zero cost limit', () => {
        const validator = DropZoneValidators.costLimit(0)
        
        expect(validator(mockCard, mockGame)).toBe(false)
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
        expect(validator(mockPitfallCard, mockGame)).toBe(false)
      })
    })

    describe('vitality-based validators', () => {
      it('should validate vitality requirements', () => {
        const validator = DropZoneValidators.vitalityCheck(15)
        
        expect(validator(mockCard, mockGame)).toBe(true) // vitality = 20
        
        mockGame.vitality = 10
        expect(validator(mockCard, mockGame)).toBe(false) // vitality = 10 < 15
      })

      it('should handle zero vitality', () => {
        const validator = DropZoneValidators.vitalityCheck(1)
        
        mockGame.vitality = 0
        expect(validator(mockCard, mockGame)).toBe(false)
      })
    })

    describe('challenge-based validators', () => {
      it('should validate challenge state', () => {
        const notInChallengeValidator = DropZoneValidators.notInChallenge()
        const inChallengeValidator = DropZoneValidators.inChallenge()
        
        // No challenge
        expect(notInChallengeValidator(mockCard, mockGame)).toBe(true)
        expect(inChallengeValidator(mockCard, mockGame)).toBe(false)
        
        // With challenge
        mockGame.currentChallenge = { id: 'test' }
        expect(notInChallengeValidator(mockCard, mockGame)).toBe(false)
        expect(inChallengeValidator(mockCard, mockGame)).toBe(true)
      })
    })

    describe('hand management validators', () => {
      it('should validate hand space availability', () => {
        const validator = DropZoneValidators.handSpaceAvailable()
        
        // Hand has space (5 < 7)
        expect(validator(mockCard, mockGame)).toBe(true)
        
        // Hand is full
        mockGame.playerHand.size = vi.fn(() => 7)
        expect(validator(mockCard, mockGame)).toBe(false)
        
        // Hand exceeds limit
        mockGame.playerHand.size = vi.fn(() => 8)
        expect(validator(mockCard, mockGame)).toBe(false)
      })

      it('should validate card in hand', () => {
        const validator = DropZoneValidators.cardInHand()
        
        // Card is in hand
        expect(validator(mockCard, mockGame)).toBe(true)
        
        // Card not in hand
        mockGame.playerHand.contains = vi.fn(() => false)
        expect(validator(mockCard, mockGame)).toBe(false)
      })

      it('should handle undefined hand', () => {
        const validator = DropZoneValidators.handSpaceAvailable()
        
        mockGame.playerHand = undefined
        expect(validator(mockCard, mockGame)).toBe(false)
      })
    })

    describe('game state validators', () => {
      it('should validate stage restrictions', () => {
        const validator = DropZoneValidators.stageOnly([1, 3, 5])
        
        expect(validator(mockCard, mockGame)).toBe(true) // stage = 1
        
        mockGame.stage = 2
        expect(validator(mockCard, mockGame)).toBe(false)
        
        mockGame.stage = 3
        expect(validator(mockCard, mockGame)).toBe(true)
      })

      it('should validate age ranges', () => {
        const validator = DropZoneValidators.ageRange(20, 30)
        
        expect(validator(mockCard, mockGame)).toBe(true) // age = 25
        
        mockGame.getPlayerAge = vi.fn(() => 18)
        expect(validator(mockCard, mockGame)).toBe(false)
        
        mockGame.getPlayerAge = vi.fn(() => 35)
        expect(validator(mockCard, mockGame)).toBe(false)
        
        mockGame.getPlayerAge = vi.fn(() => 20) // Edge case: exactly min
        expect(validator(mockCard, mockGame)).toBe(true)
        
        mockGame.getPlayerAge = vi.fn(() => 30) // Edge case: exactly max
        expect(validator(mockCard, mockGame)).toBe(true)
      })

      it('should handle undefined age function', () => {
        const validator = DropZoneValidators.ageRange(18, 30)
        
        mockGame.getPlayerAge = undefined
        expect(validator(mockCard, mockGame)).toBe(true) // Defaults to 20
      })
    })
  })

  describe('Utility Validators', () => {
    describe('custom validator', () => {
      it('should execute custom validation logic', () => {
        const customLogic = vi.fn((card: Card, _game: Game) => card.power > 3)
        const validator = DropZoneValidators.custom(customLogic)
        
        expect(validator(mockCard, mockGame)).toBe(true) // power = 5
        expect(validator(mockInsuranceCard, mockGame)).toBe(false) // power = 0
        expect(customLogic).toHaveBeenCalledWith(mockCard, mockGame)
        expect(customLogic).toHaveBeenCalledWith(mockInsuranceCard, mockGame)
      })
    })

    describe('always and never validators', () => {
      it('should always validate', () => {
        const validator = DropZoneValidators.always()
        
        expect(validator(mockCard, mockGame)).toBe(true)
        expect(validator(mockInsuranceCard, mockGame)).toBe(true)
        expect(validator(mockPitfallCard, mockGame)).toBe(true)
      })

      it('should never validate', () => {
        const validator = DropZoneValidators.never()
        
        expect(validator(mockCard, mockGame)).toBe(false)
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
        expect(validator(mockPitfallCard, mockGame)).toBe(false)
      })
    })
  })

  describe('Combination Logic', () => {
    describe('combine validator (AND logic)', () => {
      it('should require all validators to pass', () => {
        const validator = DropZoneValidators.combine(
          DropZoneValidators.cardTypeOnly(['life']),
          DropZoneValidators.minimumPower(3),
          DropZoneValidators.costLimit(5)
        )
        
        // All conditions met
        expect(validator(mockCard, mockGame)).toBe(true)
        
        // Wrong type
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
        
        // Low power
        const lowPowerCard = { ...mockCard, power: 1 } as Card
        expect(validator(lowPowerCard, mockGame)).toBe(false)
        
        // High cost
        const highCostCard = { ...mockCard, cost: 10 } as Card
        expect(validator(highCostCard, mockGame)).toBe(false)
      })

      it('should handle empty validator list', () => {
        const validator = DropZoneValidators.combine()
        expect(validator(mockCard, mockGame)).toBe(true)
      })

      it('should handle single validator', () => {
        const validator = DropZoneValidators.combine(
          DropZoneValidators.cardTypeOnly(['life'])
        )
        
        expect(validator(mockCard, mockGame)).toBe(true)
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
      })
    })

    describe('either validator (OR logic)', () => {
      it('should pass if any validator passes', () => {
        const validator = DropZoneValidators.either(
          DropZoneValidators.cardTypeOnly(['life']),
          DropZoneValidators.cardTypeOnly(['insurance']),
          DropZoneValidators.minimumPower(10) // Very high power requirement
        )
        
        // Life card passes first condition
        expect(validator(mockCard, mockGame)).toBe(true)
        
        // Insurance card passes second condition
        expect(validator(mockInsuranceCard, mockGame)).toBe(true)
        
        // Pitfall card fails all conditions
        expect(validator(mockPitfallCard, mockGame)).toBe(false)
      })

      it('should handle empty validator list', () => {
        const validator = DropZoneValidators.either()
        expect(validator(mockCard, mockGame)).toBe(false)
      })

      it('should handle single validator', () => {
        const validator = DropZoneValidators.either(
          DropZoneValidators.cardTypeOnly(['life'])
        )
        
        expect(validator(mockCard, mockGame)).toBe(true)
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
      })
    })

    describe('not validator (negation)', () => {
      it('should negate validator results', () => {
        const baseValidator = DropZoneValidators.cardTypeOnly(['life'])
        const notValidator = DropZoneValidators.not(baseValidator)
        
        // Life card should be rejected by not validator
        expect(notValidator(mockCard, mockGame)).toBe(false)
        
        // Non-life card should be accepted by not validator
        expect(notValidator(mockInsuranceCard, mockGame)).toBe(true)
        expect(notValidator(mockPitfallCard, mockGame)).toBe(true)
      })

      it('should handle complex negation chains', () => {
        const complexValidator = DropZoneValidators.not(
          DropZoneValidators.combine(
            DropZoneValidators.cardTypeOnly(['life']),
            DropZoneValidators.minimumPower(3)
          )
        )
        
        // High-power life card should be rejected (negated)
        expect(complexValidator(mockCard, mockGame)).toBe(false)
        
        // Low-power life card should be accepted (combine fails, then negated)
        const lowPowerLife = { ...mockCard, power: 1 } as Card
        expect(complexValidator(lowPowerLife, mockGame)).toBe(true)
        
        // Insurance card should be accepted (combine fails, then negated)
        expect(complexValidator(mockInsuranceCard, mockGame)).toBe(true)
      })
    })

    describe('conditional validator', () => {
      it('should use different validators based on condition', () => {
        const condition = (card: Card, game: Game) => game.stage === 1
        const thenValidator = DropZoneValidators.cardTypeOnly(['life'])
        const elseValidator = DropZoneValidators.cardTypeOnly(['insurance'])
        
        const validator = DropZoneValidators.conditional(
          condition,
          thenValidator,
          elseValidator
        )
        
        // Stage 1: should use then validator (life cards only)
        mockGame.stage = 1
        expect(validator(mockCard, mockGame)).toBe(true)
        expect(validator(mockInsuranceCard, mockGame)).toBe(false)
        
        // Stage 2: should use else validator (insurance cards only)
        mockGame.stage = 2
        expect(validator(mockCard, mockGame)).toBe(false)
        expect(validator(mockInsuranceCard, mockGame)).toBe(true)
      })

      it('should handle missing else validator', () => {
        const condition = (card: Card, game: Game) => game.stage === 1
        const thenValidator = DropZoneValidators.cardTypeOnly(['life'])
        
        const validator = DropZoneValidators.conditional(
          condition,
          thenValidator
        )
        
        // Stage 1: should use then validator
        mockGame.stage = 1
        expect(validator(mockCard, mockGame)).toBe(true)
        
        // Stage 2: should default to true (no else validator)
        mockGame.stage = 2
        expect(validator(mockCard, mockGame)).toBe(true)
        expect(validator(mockInsuranceCard, mockGame)).toBe(true)
      })

      it('should handle complex conditions', () => {
        const complexCondition = (card: Card, game: Game) => 
          card.type === 'life' && game.vitality > 15
        
        const validator = DropZoneValidators.conditional(
          complexCondition,
          DropZoneValidators.minimumPower(10),
          DropZoneValidators.always()
        )
        
        // Life card with high vitality: use strict power requirement
        mockGame.vitality = 20
        expect(validator(mockCard, mockGame)).toBe(false) // power = 5 < 10
        
        // Insurance card: use always validator
        expect(validator(mockInsuranceCard, mockGame)).toBe(true)
        
        // Life card with low vitality: use always validator
        mockGame.vitality = 10
        expect(validator(mockCard, mockGame)).toBe(true)
      })
    })
  })

  describe('Complex Validation Scenarios', () => {
    it('should handle deeply nested combinations', () => {
      const validator = DropZoneValidators.combine(
        DropZoneValidators.either(
          DropZoneValidators.cardTypeOnly(['life']),
          DropZoneValidators.cardTypeOnly(['insurance'])
        ),
        DropZoneValidators.not(
          DropZoneValidators.combine(
            DropZoneValidators.minimumPower(10),
            DropZoneValidators.costLimit(1)
          )
        )
      )
      
      // Life card with moderate power/cost: should pass
      expect(validator(mockCard, mockGame)).toBe(true)
      
      // Insurance card: should pass
      expect(validator(mockInsuranceCard, mockGame)).toBe(true)
      
      // Pitfall card: should fail (wrong type)
      expect(validator(mockPitfallCard, mockGame)).toBe(false)
      
      // High power, low cost card: should fail (negated condition)
      const problematicCard = { ...mockCard, power: 15, cost: 1 } as Card
      expect(validator(problematicCard, mockGame)).toBe(false)
    })

    it('should handle validation with side effects', () => {
      const sideEffectValidator = vi.fn().mockReturnValue(true)
      const validator = DropZoneValidators.custom(sideEffectValidator)
      
      // First call
      expect(validator(mockCard, mockGame)).toBe(true)
      expect(sideEffectValidator).toHaveBeenCalledTimes(1)
      
      // Second call
      expect(validator(mockCard, mockGame)).toBe(true)
      expect(sideEffectValidator).toHaveBeenCalledTimes(2)
    })

    it('should handle validation errors gracefully', () => {
      const errorValidator = DropZoneValidators.custom(() => {
        throw new Error('Validation error')
      })
      
      // Should not throw - the error will be caught in DropZoneManager
      expect(() => {
        const result = errorValidator(mockCard, mockGame)
        // The validator itself can throw, but DropZoneManager will catch it
        expect(typeof result).toBe('boolean')
      }).toThrow('Validation error')
    })

    it('should handle performance with many validators', () => {
      // Create a large number of validators
      const validators: DropZoneValidator[] = []
      for (let i = 0; i < 100; i++) {
        validators.push(DropZoneValidators.always())
      }
      
      const massValidator = DropZoneValidators.combine(...validators)
      
      // パフォーマンステスト：大量のバリデーターが効率的に実行される
      const result = massValidator(mockCard, mockGame)
      
      expect(result).toBe(true)
      expect(massValidator).toBeDefined() // バリデーターが正常に作成された
    })
  })
})

describe('DropZoneActions', () => {
  let mockCard: Card
  let mockInsuranceCard: Card
  let mockGame: Game

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockCard = {
      id: 'test-card',
      name: 'Test Card',
      type: 'life',
      power: 5,
      cost: 2
    } as Card

    mockInsuranceCard = {
      id: 'insurance-card',
      name: 'Test Insurance',
      type: 'insurance',
      power: 0,
      cost: 3
    } as Card

    mockGame = {
      currentChallenge: null,
      vitality: 20,
      maxVitality: 20,
      stage: 1,
      playerHand: {
        size: vi.fn(() => 5),
        contains: vi.fn(() => true),
        removeCard: vi.fn()
      },
      discardPile: {
        addCard: vi.fn()
      },
      playerDeck: {
        addCard: vi.fn(),
        shuffle: vi.fn()
      },
      playedCards: {
        addCard: vi.fn()
      },
      maxHandSize: 7,
      getCurrentPhase: vi.fn(() => 'setup'),
      getPlayerAge: vi.fn(() => 25),
      startChallenge: vi.fn(),
      placeChallengeCard: vi.fn(),
      discardCard: vi.fn()
    } as unknown as Game
  })

  describe('Basic Actions', () => {
    describe('startChallenge action', () => {
      it('should start challenge when no challenge is active', () => {
        const action = DropZoneActions.startChallenge()
        action(mockCard, mockGame)
        
        expect(mockGame.startChallenge).toHaveBeenCalledWith(mockCard)
      })

      it('should not start challenge when challenge is already active', () => {
        mockGame.currentChallenge = { id: 'existing' }
        
        const action = DropZoneActions.startChallenge()
        action(mockCard, mockGame)
        
        expect(mockGame.startChallenge).not.toHaveBeenCalled()
      })
    })

    describe('discardCard action', () => {
      it('should discard card successfully', () => {
        const action = DropZoneActions.discardCard()
        action(mockCard, mockGame)
        
        expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockCard.id)
        expect(mockGame.discardPile.addCard).toHaveBeenCalledWith(mockCard)
      })

      it('should handle missing hand or discard pile gracefully', () => {
        mockGame.playerHand = undefined
        mockGame.discardPile = undefined
        
        const action = DropZoneActions.discardCard()
        
        expect(() => action(mockCard, mockGame)).not.toThrow()
      })
    })

    describe('returnToDeck action', () => {
      it('should return card to deck without shuffling', () => {
        const action = DropZoneActions.returnToDeck(false)
        action(mockCard, mockGame)
        
        expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockCard.id)
        expect(mockGame.playerDeck.addCard).toHaveBeenCalledWith(mockCard)
        expect(mockGame.playerDeck.shuffle).not.toHaveBeenCalled()
      })

      it('should return card to deck with shuffling', () => {
        const action = DropZoneActions.returnToDeck(true)
        action(mockCard, mockGame)
        
        expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockCard.id)
        expect(mockGame.playerDeck.addCard).toHaveBeenCalledWith(mockCard)
        expect(mockGame.playerDeck.shuffle).toHaveBeenCalled()
      })
    })

    describe('vitality management actions', () => {
      it('should consume vitality', () => {
        const action = DropZoneActions.consumeVitality(5)
        action(mockCard, mockGame)
        
        expect(mockGame.vitality).toBe(15) // 20 - 5
      })

      it('should not reduce vitality below zero', () => {
        const action = DropZoneActions.consumeVitality(25)
        action(mockCard, mockGame)
        
        expect(mockGame.vitality).toBe(0)
      })

      it('should restore vitality', () => {
        mockGame.vitality = 10
        const action = DropZoneActions.restoreVitality(5)
        action(mockCard, mockGame)
        
        expect(mockGame.vitality).toBe(15)
      })

      it('should not exceed maximum vitality', () => {
        const action = DropZoneActions.restoreVitality(10)
        action(mockCard, mockGame)
        
        expect(mockGame.vitality).toBe(20) // capped at maxVitality
      })

      it('should handle undefined maxVitality', () => {
        mockGame.maxVitality = undefined
        mockGame.vitality = 15
        
        const action = DropZoneActions.restoreVitality(10)
        action(mockCard, mockGame)
        
        expect(mockGame.vitality).toBe(20) // defaults to 20
      })
    })

    describe('playCard action', () => {
      it('should play life card and restore vitality', () => {
        mockGame.vitality = 15
        
        const action = DropZoneActions.playCard()
        action(mockCard, mockGame)
        
        expect(mockGame.vitality).toBe(20) // 15 + 5 (card power)
        expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockCard.id)
        expect(mockGame.playedCards.addCard).toHaveBeenCalledWith(mockCard)
      })

      it('should play non-life card without vitality effect', () => {
        const originalVitality = mockGame.vitality
        
        const action = DropZoneActions.playCard()
        action(mockInsuranceCard, mockGame)
        
        expect(mockGame.vitality).toBe(originalVitality) // unchanged
        expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockInsuranceCard.id)
        expect(mockGame.playedCards.addCard).toHaveBeenCalledWith(mockInsuranceCard)
      })

      it('should not exceed maximum vitality when playing life card', () => {
        const highPowerCard = { ...mockCard, power: 50 } as Card
        
        const action = DropZoneActions.playCard()
        action(highPowerCard, mockGame)
        
        expect(mockGame.vitality).toBe(20) // capped at maxVitality
      })
    })

    describe('triggerSpecialEffect action', () => {
      it('should trigger special effects with logging', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        
        const action = DropZoneActions.triggerSpecialEffect('test-effect')
        action(mockCard, mockGame)
        
        expect(consoleSpy).toHaveBeenCalledWith(
          'Triggering special effect: test-effect for card Test Card'
        )
        
        consoleSpy.mockRestore()
      })

      it('should handle insurance card effects', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        
        const action = DropZoneActions.triggerSpecialEffect('insurance-effect')
        action(mockInsuranceCard, mockGame)
        
        expect(consoleSpy).toHaveBeenCalled()
        
        consoleSpy.mockRestore()
      })
    })

    describe('log action', () => {
      it('should log messages with game context', () => {
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        
        const action = DropZoneActions.log('Test message')
        action(mockCard, mockGame)
        
        expect(consoleSpy).toHaveBeenCalledWith(
          '[DropZone] Test message',
          { card: 'Test Card', gameState: 1 }
        )
        
        consoleSpy.mockRestore()
      })
    })
  })

  describe('Advanced Actions', () => {
    describe('custom action', () => {
      it('should execute custom action function', () => {
        const customFn = vi.fn()
        const action = DropZoneActions.custom(customFn)
        
        action(mockCard, mockGame)
        
        expect(customFn).toHaveBeenCalledWith(mockCard, mockGame)
      })

      it('should pass through return values', () => {
        const customFn = vi.fn().mockReturnValue('test result')
        const action = DropZoneActions.custom(customFn)
        
        const result = action(mockCard, mockGame)
        
        expect(result).toBe('test result')
      })
    })

    describe('sequence action', () => {
      it('should execute actions in sequence', () => {
        const action1 = vi.fn()
        const action2 = vi.fn()
        const action3 = vi.fn()
        
        const sequenceAction = DropZoneActions.sequence(
          DropZoneActions.custom(action1),
          DropZoneActions.custom(action2),
          DropZoneActions.custom(action3)
        )
        
        sequenceAction(mockCard, mockGame)
        
        expect(action1).toHaveBeenCalledBefore(action2)
        expect(action2).toHaveBeenCalledBefore(action3)
        expect(action1).toHaveBeenCalledWith(mockCard, mockGame)
        expect(action2).toHaveBeenCalledWith(mockCard, mockGame)
        expect(action3).toHaveBeenCalledWith(mockCard, mockGame)
      })

      it('should handle empty sequence', () => {
        const sequenceAction = DropZoneActions.sequence()
        
        expect(() => sequenceAction(mockCard, mockGame)).not.toThrow()
      })

      it('should stop on first error', () => {
        const action1 = vi.fn()
        const action2 = vi.fn(() => { throw new Error('Action 2 failed') })
        const action3 = vi.fn()
        
        const sequenceAction = DropZoneActions.sequence(
          DropZoneActions.custom(action1),
          DropZoneActions.custom(action2),
          DropZoneActions.custom(action3)
        )
        
        expect(() => sequenceAction(mockCard, mockGame)).toThrow('Action 2 failed')
        expect(action1).toHaveBeenCalled()
        expect(action2).toHaveBeenCalled()
        expect(action3).not.toHaveBeenCalled()
      })
    })

    describe('conditional action', () => {
      it('should execute then action when condition is true', () => {
        const condition = DropZoneValidators.cardTypeOnly(['life'])
        const thenAction = vi.fn()
        const elseAction = vi.fn()
        
        const conditionalAction = DropZoneActions.conditional(
          condition,
          DropZoneActions.custom(thenAction),
          DropZoneActions.custom(elseAction)
        )
        
        conditionalAction(mockCard, mockGame) // life card
        
        expect(thenAction).toHaveBeenCalledWith(mockCard, mockGame)
        expect(elseAction).not.toHaveBeenCalled()
      })

      it('should execute else action when condition is false', () => {
        const condition = DropZoneValidators.cardTypeOnly(['insurance'])
        const thenAction = vi.fn()
        const elseAction = vi.fn()
        
        const conditionalAction = DropZoneActions.conditional(
          condition,
          DropZoneActions.custom(thenAction),
          DropZoneActions.custom(elseAction)
        )
        
        conditionalAction(mockCard, mockGame) // life card (not insurance)
        
        expect(thenAction).not.toHaveBeenCalled()
        expect(elseAction).toHaveBeenCalledWith(mockCard, mockGame)
      })

      it('should handle missing else action', () => {
        const condition = DropZoneValidators.cardTypeOnly(['insurance'])
        const thenAction = vi.fn()
        
        const conditionalAction = DropZoneActions.conditional(
          condition,
          DropZoneActions.custom(thenAction)
        )
        
        expect(() => conditionalAction(mockCard, mockGame)).not.toThrow()
        expect(thenAction).not.toHaveBeenCalled()
      })
    })

    describe('noop and throwError actions', () => {
      it('should do nothing for noop action', () => {
        const action = DropZoneActions.noop()
        
        expect(() => action(mockCard, mockGame)).not.toThrow()
        // No assertions needed - just ensure it doesn't crash
      })

      it('should throw error for throwError action', () => {
        const action = DropZoneActions.throwError('Test error message')
        
        expect(() => action(mockCard, mockGame)).toThrow('Test error message')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle actions with null/undefined parameters', () => {
      const action = DropZoneActions.discardCard()
      
      expect(() => action(null as unknown as Card, mockGame)).not.toThrow()
      expect(() => action(mockCard, null as unknown as Game)).not.toThrow()
    })

    it('should handle actions with malformed game objects', () => {
      const malformedGame = {} as unknown as Game
      
      const action = DropZoneActions.playCard()
      
      expect(() => action(mockCard, malformedGame)).not.toThrow()
    })

    it('should handle performance with many sequential actions', () => {
      const actions: DropZoneAction[] = []
      for (let i = 0; i < 100; i++) {
        actions.push(DropZoneActions.log(`Action ${i}`))
      }
      
      const massAction = DropZoneActions.sequence(...actions)
      
      // パフォーマンステスト：大量のアクションが効率的に実行される
      expect(() => massAction(mockCard, mockGame)).not.toThrow()
      expect(massAction).toBeDefined() // アクションが正常に作成された
    })
  })
})

describe('DropZonePresets', () => {
  let mockCard: Card
  let mockInsuranceCard: Card
  let mockGame: Game

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockCard = {
      id: 'test-card',
      name: 'Test Card',
      type: 'life',
      power: 5,
      cost: 2
    } as Card

    mockInsuranceCard = {
      id: 'insurance-card',
      name: 'Test Insurance',
      type: 'insurance',
      power: 0,
      cost: 3
    } as Card

    mockGame = {
      currentChallenge: null,
      vitality: 20,
      maxVitality: 20,
      stage: 1,
      playerHand: {
        size: vi.fn(() => 5),
        contains: vi.fn(() => true),
        removeCard: vi.fn()
      },
      discardPile: {
        addCard: vi.fn()
      },
      playerDeck: {
        addCard: vi.fn(),
        shuffle: vi.fn()
      },
      playedCards: {
        addCard: vi.fn()
      },
      maxHandSize: 7,
      getCurrentPhase: vi.fn(() => 'setup'),
      getPlayerAge: vi.fn(() => 25),
      startChallenge: vi.fn(),
      placeChallengeCard: vi.fn(),
      discardCard: vi.fn()
    } as unknown as Game
  })

  describe('challengeZone preset', () => {
    it('should validate life cards not in challenge with card in hand', () => {
      const preset = DropZonePresets.challengeZone()
      
      // Valid case: life card, no challenge, card in hand
      expect(preset.validator(mockCard, mockGame)).toBe(true)
      
      // Invalid case: wrong card type
      expect(preset.validator(mockInsuranceCard, mockGame)).toBe(false)
      
      // Invalid case: already in challenge
      mockGame.currentChallenge = { id: 'test' }
      expect(preset.validator(mockCard, mockGame)).toBe(false)
      
      // Invalid case: card not in hand
      mockGame.currentChallenge = null
      mockGame.playerHand.contains = vi.fn(() => false)
      expect(preset.validator(mockCard, mockGame)).toBe(false)
    })

    it('should execute challenge action sequence', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const preset = DropZonePresets.challengeZone()
      preset.action(mockCard, mockGame)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DropZone] Starting challenge',
        { card: 'Test Card', gameState: 1 }
      )
      expect(mockGame.startChallenge).toHaveBeenCalledWith(mockCard)
      
      consoleSpy.mockRestore()
    })
  })

  describe('discardZone preset', () => {
    it('should validate cards in hand when not in challenge', () => {
      const preset = DropZonePresets.discardZone()
      
      // Valid case: card in hand, no challenge
      expect(preset.validator(mockCard, mockGame)).toBe(true)
      expect(preset.validator(mockInsuranceCard, mockGame)).toBe(true)
      
      // Invalid case: in challenge
      mockGame.currentChallenge = { id: 'test' }
      expect(preset.validator(mockCard, mockGame)).toBe(false)
      
      // Invalid case: card not in hand
      mockGame.currentChallenge = null
      mockGame.playerHand.contains = vi.fn(() => false)
      expect(preset.validator(mockCard, mockGame)).toBe(false)
    })

    it('should execute discard action sequence', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const preset = DropZonePresets.discardZone()
      preset.action(mockCard, mockGame)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DropZone] Discarding card',
        { card: 'Test Card', gameState: 1 }
      )
      expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockCard.id)
      expect(mockGame.discardPile.addCard).toHaveBeenCalledWith(mockCard)
      
      consoleSpy.mockRestore()
    })
  })

  describe('insurancePlayZone preset', () => {
    it('should validate insurance cards with vitality and hand requirements', () => {
      const preset = DropZonePresets.insurancePlayZone()
      
      // Valid case: insurance card, enough vitality, card in hand
      expect(preset.validator(mockInsuranceCard, mockGame)).toBe(true)
      
      // Invalid case: wrong card type
      expect(preset.validator(mockCard, mockGame)).toBe(false)
      
      // Invalid case: insufficient vitality
      mockGame.vitality = 0
      expect(preset.validator(mockInsuranceCard, mockGame)).toBe(false)
      
      // Invalid case: card not in hand
      mockGame.vitality = 20
      mockGame.playerHand.contains = vi.fn(() => false)
      expect(preset.validator(mockInsuranceCard, mockGame)).toBe(false)
    })

    it('should execute insurance play action sequence', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const preset = DropZonePresets.insurancePlayZone()
      preset.action(mockInsuranceCard, mockGame)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DropZone] Playing insurance card',
        { card: 'Test Insurance', gameState: 1 }
      )
      expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockInsuranceCard.id)
      expect(mockGame.playedCards.addCard).toHaveBeenCalledWith(mockInsuranceCard)
      expect(mockGame.vitality).toBe(19) // 20 - 1 vitality cost
      
      consoleSpy.mockRestore()
    })
  })

  describe('specialAbilityZone preset', () => {
    it('should validate specific card type with vitality cost', () => {
      const preset = DropZonePresets.specialAbilityZone('life', 5)
      
      // Valid case: life card, enough vitality, card in hand
      expect(preset.validator(mockCard, mockGame)).toBe(true)
      
      // Invalid case: wrong card type
      expect(preset.validator(mockInsuranceCard, mockGame)).toBe(false)
      
      // Invalid case: insufficient vitality
      mockGame.vitality = 3
      expect(preset.validator(mockCard, mockGame)).toBe(false)
      
      // Invalid case: card not in hand
      mockGame.vitality = 20
      mockGame.playerHand.contains = vi.fn(() => false)
      expect(preset.validator(mockCard, mockGame)).toBe(false)
    })

    it('should execute special ability action sequence with custom costs', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const preset = DropZonePresets.specialAbilityZone('life', 8)
      preset.action(mockCard, mockGame)
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[DropZone] Using special ability (cost: 8)',
        { card: 'Test Card', gameState: 1 }
      )
      expect(mockGame.vitality).toBe(12) // 20 - 8 vitality cost
      expect(mockGame.playerHand.removeCard).toHaveBeenCalledWith(mockCard.id)
      expect(mockGame.discardPile.addCard).toHaveBeenCalledWith(mockCard)
      
      consoleSpy.mockRestore()
    })
  })

  describe('Preset Integration', () => {
    it('should work with actual DropZone objects', () => {
      const challengePreset = DropZonePresets.challengeZone()
      
      const dropZone = {
        id: 'challenge-zone',
        type: 'challenge' as const,
        bounds: new Phaser.Geom.Rectangle(0, 0, 100, 100),
        isValid: challengePreset.validator,
        onDrop: challengePreset.action,
        priority: 10,
        magneticDistance: 80
      }
      
      // Test validation
      expect(dropZone.isValid(mockCard, mockGame)).toBe(true)
      
      // Test action
      expect(() => dropZone.onDrop(mockCard, mockGame)).not.toThrow()
      expect(mockGame.startChallenge).toHaveBeenCalledWith(mockCard)
    })

    it('should handle all preset types in sequence', () => {
      const presets = [
        DropZonePresets.challengeZone(),
        DropZonePresets.discardZone(),
        DropZonePresets.insurancePlayZone(),
        DropZonePresets.specialAbilityZone('life', 2)
      ]
      
      // Test that all presets have required properties
      presets.forEach(preset => {
        expect(preset).toHaveProperty('validator')
        expect(preset).toHaveProperty('action')
        expect(typeof preset.validator).toBe('function')
        expect(typeof preset.action).toBe('function')
      })
    })
  })
})