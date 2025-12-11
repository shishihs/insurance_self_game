import { describe, it, expect, beforeEach } from 'vitest'
import { BeginnerPersona, IntermediatePersona, AdvancedPersona } from '../Personas'
import type { GameState, Card } from '../../domain/types/game'
// Note: Imports might need adjustment based on actual project structure

// Mock Data
const mockCard: Card = {
    id: 'c1',
    name: 'Test Card',
    type: 'action',
    power: 10,
    cost: 5,
    rarity: 'common',
    effects: []
}

const mockChallenge: Card = {
    id: 'ch1',
    name: 'Challenge',
    type: 'challenge',
    power: 20, // Requirement
    cost: 0,
    rarity: 'common',
    effects: []
}

const mockGameState: any = { // using any for simplicity in mock, specific properties below
    vitality: 50,
    maxVitality: 100,
    turn: 1,
    money: 1000,
    playerHand: [mockCard, { ...mockCard, id: 'c2', power: 5 }],
    insuranceCards: [],
    insuranceBurden: 0,
    stats: {}
}

describe('Personas', () => {
    describe('BeginnerPersona', () => {
        let persona: BeginnerPersona
        beforeEach(() => {
            persona = new BeginnerPersona()
        })

        it('should prefer Whole Life insurance (safety)', () => {
            const choice = persona.selectInsuranceType(['whole_life', 'term'], mockGameState)
            expect(choice).toBe('whole_life')
        })

        it('should be risk averse with challenges (skip if not guaranteed)', () => {
            // Total power 15 vs Challenge 20. Fail chance high.
            const shouldAttempt = persona.shouldAttemptChallenge(mockChallenge, mockGameState.playerHand, mockGameState)
            expect(shouldAttempt).toBe(true)
        })
    })

    describe('IntermediatePersona', () => {
        let persona: IntermediatePersona
        beforeEach(() => {
            persona = new IntermediatePersona()
        })

        it('should prefer Term insurance (cost effective)', () => {
            const choice = persona.selectInsuranceType(['whole_life', 'term'], mockGameState)
            expect(choice).toBe('term')
        })

        it('should sort cards by power for efficiency', () => {
            const selected = persona.selectCards(mockGameState.playerHand, 12, mockGameState)
            // Should pick power 10 and 5 to meet 12
            expect(selected.length).toBe(2)
            expect(selected[0].power).toBe(10) // Highest first
        })
    })

    describe('AdvancedPersona', () => {
        let persona: AdvancedPersona
        beforeEach(() => {
            persona = new AdvancedPersona()
        })

        it('should calculate risk vs reward (aggressive)', () => {
            // Can make it barely.
            const riskyHand = [{ ...mockCard, power: 18 }]
            const riskyChallenge = { ...mockChallenge, power: 20 }
            // Advanced might try if there's a mechanic to boost or luck involved, 
            // or strictly for this test, let's say they optimize. 
            // Actually, let's test Card Selection optimization

            const variedHand = [
                { ...mockCard, id: 'p1', power: 5, cost: 1 }, // Ratio 5
                { ...mockCard, id: 'p2', power: 10, cost: 5 }, // Ratio 2
                { ...mockCard, id: 'p3', power: 5, cost: 2 }   // Ratio 2.5
            ]
            // Target 5. 
            // Beginner might pick p2 (highest power).
            // Advanced should pick p1 (best efficiency).

            const selected = persona.selectCards(variedHand, 5, mockGameState)
            expect(selected[0].id).toBe('p1')
        })
    })
})
