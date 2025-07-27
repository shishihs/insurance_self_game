import { describe, it, expect, vi } from 'vitest'
import { DropZoneValidators, DropZoneActions } from '../DropZoneValidators'
import { Card } from '@/domain/entities/Card'
import { Game } from '@/domain/entities/Game'

const mockCard: Card = {
  id: 'test-card',
  name: 'Test Card',
  type: 'life',
  power: 5,
  cost: 2
} as Card

const mockInsuranceCard: Card = {
  id: 'insurance-card',
  name: 'Test Insurance',
  type: 'insurance',
  power: 0,
  cost: 3
} as Card

const mockGame = {
  currentChallenge: null,
  phase: 'setup',
  config: { tutorialEnabled: false },
  insuranceCards: [],
  placeChallengeCard: vi.fn(),
  discardCard: vi.fn()
} as any

describe('DropZoneValidators', () => {
  describe('challengeArea validator', () => {
    it('should be invalid when no challenge is active', () => {
      const validator = DropZoneValidators.challengeArea()
      const result = validator(mockCard, mockGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('No active challenge')
      expect(result.suggestion).toBe('Start a challenge first')
    })

    it('should be invalid when challenge card is already placed', () => {
      const gameWithChallenge = {
        ...mockGame,
        currentChallenge: { isCardPlaced: true }
      }
      
      const validator = DropZoneValidators.challengeArea()
      const result = validator(mockCard, gameWithChallenge)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Challenge card already placed')
    })

    it('should be valid when challenge is active and no card placed', () => {
      const gameWithChallenge = {
        ...mockGame,
        currentChallenge: { isCardPlaced: false }
      }
      
      const validator = DropZoneValidators.challengeArea()
      const result = validator(mockCard, gameWithChallenge)
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('discardArea validator', () => {
    it('should always be valid for basic discard', () => {
      const validator = DropZoneValidators.discardArea()
      const result = validator(mockCard, mockGame)
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('insuranceArea validator', () => {
    it('should be invalid for non-insurance cards', () => {
      const validator = DropZoneValidators.insuranceArea()
      const result = validator(mockCard, mockGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Only insurance cards allowed')
    })

    it('should be invalid during wrong game phase', () => {
      const validator = DropZoneValidators.insuranceArea()
      const result = validator(mockInsuranceCard, mockGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Insurance purchase not available in current phase')
    })

    it('should be invalid for duplicate insurance', () => {
      const gameWithInsurance = {
        ...mockGame,
        phase: 'purchase',
        insuranceCards: [mockInsuranceCard]
      }
      
      const validator = DropZoneValidators.insuranceArea()
      const result = validator(mockInsuranceCard, gameWithInsurance)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Insurance already purchased')
    })

    it('should be valid for new insurance in purchase phase', () => {
      const gameInPurchasePhase = {
        ...mockGame,
        phase: 'purchase',
        insuranceCards: []
      }
      
      const validator = DropZoneValidators.insuranceArea()
      const result = validator(mockInsuranceCard, gameInPurchasePhase)
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('cardTypeOnly validator', () => {
    it('should validate allowed card types', () => {
      const validator = DropZoneValidators.cardTypeOnly(['life', 'insurance'])
      
      expect(validator(mockCard, mockGame).isValid).toBe(true)
      expect(validator(mockInsuranceCard, mockGame).isValid).toBe(true)
      
      const pitfallCard = { ...mockCard, type: 'pitfall' } as Card
      const result = validator(pitfallCard, mockGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Only life, insurance cards allowed')
    })
  })

  describe('phaseOnly validator', () => {
    it('should validate allowed game phases', () => {
      const validator = DropZoneValidators.phaseOnly(['purchase', 'renewal'])
      
      const purchaseGame = { ...mockGame, phase: 'purchase' }
      expect(validator(mockCard, purchaseGame).isValid).toBe(true)
      
      const setupGame = { ...mockGame, phase: 'setup' }
      const result = validator(mockCard, setupGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Not available in setup phase')
    })
  })

  describe('custom validator', () => {
    it('should execute custom validation logic', () => {
      const customValidation = (card: Card, game: Game) => card.power > 3
      const validator = DropZoneValidators.custom(
        customValidation,
        'Card power too low',
        'Use a higher power card'
      )
      
      expect(validator(mockCard, mockGame).isValid).toBe(true) // power = 5
      
      const weakCard = { ...mockCard, power: 2 } as Card
      const result = validator(weakCard, mockGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Card power too low')
      expect(result.suggestion).toBe('Use a higher power card')
    })
  })

  describe('combine validator', () => {
    it('should require all validators to pass', () => {
      const validator = DropZoneValidators.combine(
        DropZoneValidators.cardTypeOnly(['insurance']),
        DropZoneValidators.phaseOnly(['purchase'])
      )
      
      const purchaseGame = { ...mockGame, phase: 'purchase' }
      
      // Should pass for insurance card in purchase phase
      expect(validator(mockInsuranceCard, purchaseGame).isValid).toBe(true)
      
      // Should fail for life card even in purchase phase
      const result = validator(mockCard, purchaseGame)
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Only insurance cards allowed')
    })
  })

  describe('either validator', () => {
    it('should pass if any validator passes', () => {
      const validator = DropZoneValidators.either(
        DropZoneValidators.cardTypeOnly(['life']),
        DropZoneValidators.cardTypeOnly(['insurance'])
      )
      
      expect(validator(mockCard, mockGame).isValid).toBe(true)
      expect(validator(mockInsuranceCard, mockGame).isValid).toBe(true)
      
      const pitfallCard = { ...mockCard, type: 'pitfall' } as Card
      const result = validator(pitfallCard, mockGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toContain('None of the conditions met')
    })
  })

  describe('conditional validator', () => {
    it('should use different validators based on condition', () => {
      const validator = DropZoneValidators.conditional(
        (game: Game) => game.phase === 'purchase',
        DropZoneValidators.cardTypeOnly(['insurance']),
        DropZoneValidators.cardTypeOnly(['life'])
      )
      
      const purchaseGame = { ...mockGame, phase: 'purchase' }
      const setupGame = { ...mockGame, phase: 'setup' }
      
      // In purchase phase, should accept insurance cards
      expect(validator(mockInsuranceCard, purchaseGame).isValid).toBe(true)
      expect(validator(mockCard, purchaseGame).isValid).toBe(false)
      
      // In setup phase, should accept life cards
      expect(validator(mockCard, setupGame).isValid).toBe(true)
      expect(validator(mockInsuranceCard, setupGame).isValid).toBe(false)
    })
  })

  describe('never and always validators', () => {
    it('should never validate', () => {
      const validator = DropZoneValidators.never('Disabled for testing')
      const result = validator(mockCard, mockGame)
      
      expect(result.isValid).toBe(false)
      expect(result.reason).toBe('Disabled for testing')
    })

    it('should always validate', () => {
      const validator = DropZoneValidators.always()
      const result = validator(mockCard, mockGame)
      
      expect(result.isValid).toBe(true)
    })
  })
})

describe('DropZoneActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('placeOnChallenge action', () => {
    it('should place card on challenge when valid', () => {
      const gameWithChallenge = {
        ...mockGame,
        currentChallenge: { isCardPlaced: false },
        placeChallengeCard: vi.fn()
      }
      
      const action = DropZoneActions.placeOnChallenge()
      action(mockCard, gameWithChallenge)
      
      expect(gameWithChallenge.placeChallengeCard).toHaveBeenCalledWith(mockCard)
    })

    it('should throw error when no challenge is active', () => {
      const action = DropZoneActions.placeOnChallenge()
      
      expect(() => action(mockCard, mockGame)).toThrow('No active challenge to place card on')
    })
  })

  describe('discardCard action', () => {
    it('should discard card successfully', () => {
      const gameWithDiscard = {
        ...mockGame,
        discardCard: vi.fn()
      }
      
      const action = DropZoneActions.discardCard()
      action(mockCard, gameWithDiscard)
      
      expect(gameWithDiscard.discardCard).toHaveBeenCalledWith(mockCard)
    })
  })

  describe('purchaseInsurance action', () => {
    it('should purchase insurance card', () => {
      const gameWithManager = {
        ...mockGame,
        insuranceCards: [],
        cardManager: {
          removeFromHand: vi.fn()
        }
      }
      
      const action = DropZoneActions.purchaseInsurance()
      action(mockInsuranceCard, gameWithManager)
      
      expect(gameWithManager.insuranceCards).toContain(mockInsuranceCard)
      expect(gameWithManager.cardManager.removeFromHand).toHaveBeenCalledWith(mockInsuranceCard)
    })

    it('should throw error for non-insurance cards', () => {
      const action = DropZoneActions.purchaseInsurance()
      
      expect(() => action(mockCard, mockGame)).toThrow('Only insurance cards can be purchased')
    })
  })

  describe('custom action', () => {
    it('should execute custom action function', () => {
      const customFn = vi.fn()
      const action = DropZoneActions.custom(customFn)
      
      action(mockCard, mockGame)
      
      expect(customFn).toHaveBeenCalledWith(mockCard, mockGame)
    })
  })

  describe('sequence action', () => {
    it('should execute actions in sequence', async () => {
      const action1 = vi.fn()
      const action2 = vi.fn()
      const sequenceAction = DropZoneActions.sequence(
        DropZoneActions.custom(action1),
        DropZoneActions.custom(action2)
      )
      
      await sequenceAction(mockCard, mockGame)
      
      expect(action1).toHaveBeenCalledBefore(action2)
      expect(action2).toHaveBeenCalled()
    })
  })

  describe('withErrorHandling action', () => {
    it('should handle errors gracefully', async () => {
      const errorAction = DropZoneActions.custom(() => {
        throw new Error('Test error')
      })
      
      const errorHandler = vi.fn()
      const wrappedAction = DropZoneActions.withErrorHandling(errorAction, errorHandler)
      
      await expect(wrappedAction(mockCard, mockGame)).rejects.toThrow('Test error')
      expect(errorHandler).toHaveBeenCalled()
    })
  })

  describe('withLogging action', () => {
    it('should log action execution', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const mockAction = vi.fn()
      const loggedAction = DropZoneActions.withLogging(
        DropZoneActions.custom(mockAction),
        '[TEST] '
      )
      
      await loggedAction(mockCard, mockGame)
      
      expect(consoleSpy).toHaveBeenCalledWith('[TEST] Executing action for card:', 'test-card')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/\[TEST\] Action completed in \d+\.\d+ms/))
      
      consoleSpy.mockRestore()
    })

    it('should log action failures', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const errorAction = DropZoneActions.custom(() => {
        throw new Error('Test error')
      })
      
      const loggedAction = DropZoneActions.withLogging(errorAction, '[TEST] ')
      
      await expect(loggedAction(mockCard, mockGame)).rejects.toThrow('Test error')
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/\[TEST\] Action failed after \d+\.\d+ms:/), expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })
})