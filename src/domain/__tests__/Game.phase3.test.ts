import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Game } from '../entities/Game'
import { Card } from '../entities/Card'
import { CardFactory } from '../services/CardFactory'
import type { GameConfig } from '../types/game.types'

// Helper function to create a whole life insurance card
function createWholeLifeInsurance(): Card {
  const insurances = CardFactory.createExtendedInsuranceCards()
  return insurances.find(card => card.durationType === 'whole_life')!
}

// Helper function to create a term insurance card with remaining turns
function createTermInsurance(turns?: number): Card {
  const insurances = CardFactory.createExtendedInsuranceCards()
  const termInsurance = insurances.find(card => card.durationType === 'term')!
  if (turns !== undefined && termInsurance.remainingTurns !== undefined) {
    // Create a new card with custom remaining turns
    return new Card({
      ...termInsurance,
      remainingTurns: turns
    })
  }
  return termInsurance
}

describe('Game - Phase 3: Insurance Burden System', () => {
  let game: Game
  const config: GameConfig = {
    difficulty: 'normal',
    startingVitality: 20,
    startingHandSize: 5,
    maxHandSize: 10,
    dreamCardCount: 3
  }

  beforeEach(() => {
    game = new Game(config)
    game.start()
  })

  describe('calculateInsuranceBurden', () => {
    it('should calculate 0 burden for 0-2 insurance cards', () => {
      expect(game.calculateInsuranceBurden()).toBe(0)
      
      // Add 1 insurance card
      const insurance1 = createWholeLifeInsurance()
      game.insuranceCards.push(insurance1)
      expect(game.calculateInsuranceBurden()).toBe(0)
      
      // Add 2nd insurance card
      const insurance2 = createTermInsurance(5)
      game.insuranceCards.push(insurance2)
      expect(game.calculateInsuranceBurden()).toBe(0)
    })

    it('should calculate -1 burden for 3-5 insurance cards', () => {
      // Add 3 insurance cards
      const insurances = [
        createWholeLifeInsurance(),
        createTermInsurance(5),
        createWholeLifeInsurance()
      ]
      game.insuranceCards.push(...insurances)
      expect(game.calculateInsuranceBurden()).toBe(-1)
      
      // Add 4th and 5th
      game.insuranceCards.push(createTermInsurance(3))
      expect(game.calculateInsuranceBurden()).toBe(-1)
      
      game.insuranceCards.push(createWholeLifeInsurance())
      expect(game.calculateInsuranceBurden()).toBe(-1)
    })

    it('should calculate -2 burden for 6-8 insurance cards', () => {
      // Add 6 insurance cards
      const insurances = Array(6).fill(null).map(() => createWholeLifeInsurance())
      game.insuranceCards.push(...insurances)
      expect(game.calculateInsuranceBurden()).toBe(-2)
    })

    it('should calculate -3 burden for 9 insurance cards', () => {
      // Add 9 insurance cards
      const insurances = Array(9).fill(null).map(() => createWholeLifeInsurance())
      game.insuranceCards.push(...insurances)
      expect(game.calculateInsuranceBurden()).toBe(-3)
    })
  })

  describe('calculateTotalPower', () => {
    it('should correctly calculate power breakdown with no insurance burden', () => {
      const lifeCard = new Card({
        id: 'life1',
        name: 'Life Card',
        description: 'A life card',
        type: 'life',
        power: 5,
        cost: 1,
        effects: []
      })
      
      const insuranceCard = createWholeLifeInsurance()
      
      const result = game.calculateTotalPower([lifeCard, insuranceCard])
      
      expect(result.base).toBe(5)
      expect(result.insurance).toBe(insuranceCard.power)
      expect(result.burden).toBe(0) // No burden with < 3 insurances
      expect(result.total).toBe(5 + insuranceCard.power)
    })

    it('should apply insurance burden when having 3+ insurances', () => {
      // Add 3 insurance cards to inventory
      const insurances = Array(3).fill(null).map(() => createWholeLifeInsurance())
      game.insuranceCards.push(...insurances)
      game['updateInsuranceBurden']() // Force update burden
      
      const lifeCard = new Card({
        id: 'life1',
        name: 'Life Card',
        description: 'A life card',
        type: 'life',
        power: 5,
        cost: 1,
        effects: []
      })
      
      const result = game.calculateTotalPower([lifeCard])
      
      expect(result.base).toBe(5)
      expect(result.insurance).toBe(0)
      expect(result.burden).toBe(-1) // Burden for 3 insurances
      expect(result.total).toBe(4) // 5 - 1
    })

    it('should include age bonus in insurance power', () => {
      // Set stage to middle age for age bonus
      game.stage = 'middle'
      
      const insuranceCard = new Card({
        id: 'ins1',
        name: 'Age Bonus Insurance',
        description: 'Insurance with age bonus',
        type: 'insurance',
        power: 3,
        cost: 1,
        effects: [],
        durationType: 'whole_life',
        ageBonus: 2
      })
      
      const result = game.calculateTotalPower([insuranceCard])
      
      expect(result.base).toBe(0)
      expect(result.insurance).toBe(5) // 3 base + 2 age bonus
      expect(result.burden).toBe(0)
      expect(result.total).toBe(5)
    })

    it('should ensure total power never goes below 0', () => {
      // Add 6 insurance cards for -2 burden
      const insurances = Array(6).fill(null).map(() => createWholeLifeInsurance())
      game.insuranceCards.push(...insurances)
      game['updateInsuranceBurden']()
      
      const weakCard = new Card({
        id: 'weak1',
        name: 'Weak Card',
        description: 'A weak card',
        type: 'life',
        power: 1,
        cost: 1,
        effects: []
      })
      
      const result = game.calculateTotalPower([weakCard])
      
      expect(result.base).toBe(1)
      expect(result.insurance).toBe(0)
      expect(result.burden).toBe(-2)
      expect(result.total).toBe(0) // Not negative
    })
  })

  describe('resolveChallenge with insurance burden', () => {
    it('should include power breakdown in challenge result', () => {
      // Add some insurance cards
      const insurances = Array(3).fill(null).map(() => createWholeLifeInsurance())
      game.insuranceCards.push(...insurances)
      game['updateInsuranceBurden']()
      
      // Setup challenge
      const challenge = new Card({
        id: 'challenge1',
        name: 'Test Challenge',
        description: 'A challenge',
        type: 'pitfall',
        power: 5,
        cost: 0,
        effects: []
      })
      
      const playerCard = new Card({
        id: 'player1',
        name: 'Player Card',
        description: 'A card',
        type: 'life',
        power: 6,
        cost: 1,
        effects: []
      })
      
      game.hand.push(playerCard)
      game.startChallenge(challenge)
      game.toggleCardSelection(playerCard)
      
      const result = game.resolveChallenge()
      
      expect(result.powerBreakdown).toBeDefined()
      expect(result.powerBreakdown?.base).toBe(6)
      expect(result.powerBreakdown?.insurance).toBe(0)
      expect(result.powerBreakdown?.burden).toBe(-1)
      expect(result.powerBreakdown?.total).toBe(5) // 6 - 1
      expect(result.playerPower).toBe(5)
      expect(result.success).toBe(true) // 5 >= 5
    })
  })

  describe('insurance burden updates', () => {
    it('should update burden when adding insurance through card selection', () => {
      // Start with 2 insurances
      game.insuranceCards.push(createWholeLifeInsurance())
      game.insuranceCards.push(createWholeLifeInsurance())
      game['updateInsuranceBurden']()
      expect(game.insuranceBurden).toBe(0)
      
      // Mock successful challenge and card selection
      game.phase = 'card_selection'
      const newInsurance = createWholeLifeInsurance()
      game.cardChoices = [newInsurance]
      game.playerDeck.addCard = vi.fn()
      
      // Select the insurance card
      game.selectCard(newInsurance.id)
      
      // Burden should now be -1 (3 insurances)
      expect(game.insuranceBurden).toBe(-1)
    })

    it('should update burden when insurance expires', () => {
      // Add 3 insurances (1 term, 2 whole life)
      const termInsurance = createTermInsurance(1) // Expires next turn
      game.insuranceCards.push(termInsurance)
      game.insuranceCards.push(createWholeLifeInsurance())
      game.insuranceCards.push(createWholeLifeInsurance())
      game['updateInsuranceBurden']()
      expect(game.insuranceBurden).toBe(-1)
      
      // Advance turn to expire the term insurance
      game.phase = 'draw'
      game.nextTurn()
      
      // Burden should now be 0 (2 insurances)
      expect(game.insuranceBurden).toBe(0)
      expect(game.insuranceCards.length).toBe(2)
    })
  })
})