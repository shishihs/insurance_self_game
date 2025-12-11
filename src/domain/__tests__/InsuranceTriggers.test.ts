import { describe, it, expect, beforeEach } from 'vitest'
import { Game } from '../entities/Game'
import { Card } from '../entities/Card'
import type { GameConfig } from '../types/game.types'
import { CardFactory } from '../services/CardFactory'

describe('Insurance Triggers', () => {
    let game: Game
    const defaultConfig: GameConfig = {
        difficulty: 'normal',
        startingVitality: 50,
        startingHandSize: 5,
        maxHandSize: 7,
        dreamCardCount: 2
    }

    beforeEach(() => {
        game = new Game(defaultConfig)
        const cards = CardFactory.createStarterLifeCards()
        cards.forEach(card => game.addCardToPlayerDeck(card))
        game.start()
        // start() calls dream_selection phase.
        // Force phase to draw for some tests
        game.setPhase('draw')
    })

    it('Medical Insurance (on_heavy_damage) triggers on damage >= 10', async () => {
        // Setup Medical Insurance
        const insurance = new Card({
            id: 'ins-med', name: 'Medical Ins', type: 'insurance',
            insuranceType: 'medical', insuranceTriggerType: 'on_heavy_damage',
            power: 0, cost: 0, effects: [], description: 'Reduces damage to 1'
        })
        game.activeInsurances.push(insurance)
        console.error('Test: Active Insurances count:', game.activeInsurances.length)
        console.error('Test: Insurance Trigger Type:', insurance.insuranceTriggerType)

        // Apply 20 damage
        game.applyDamage(20)

        // Should trigger claim and suspend damage
        expect(game.pendingInsuranceClaim).toBeDefined()
        expect(game.pendingInsuranceClaim?.insurance.id).toBe('ins-med')
        expect(game.pendingInsuranceClaim?.triggerType).toBe('on_heavy_damage')
        expect(game.pendingInsuranceClaim?.context?.damage).toBe(20)
        expect(game.vitality).toBe(50) // No damage applied yet

        // Resolve claim
        await game.resolveInsuranceClaim()

        // Damage reduced to 1
        expect(game.vitality).toBe(49)
        expect(game.activeInsurances.find(c => c.id === 'ins-med')).toBeUndefined()
        expect(game.expiredInsurances.find(c => c.id === 'ins-med')).toBeDefined()
    })

    it('Life Insurance (on_death) triggers on vitality depletion', async () => {
        // Setup Life Insurance
        const insurance = new Card({
            id: 'ins-life', name: 'Life Ins', type: 'insurance',
            insuranceType: 'life', insuranceTriggerType: 'on_death',
            power: 0, cost: 0, effects: [], description: 'Revive with 10 vit'
        })
        game.activeInsurances.push(insurance)

        // Apply fatal damage
        game.applyDamage(50)

        // Trigger should happen
        expect(game.pendingInsuranceClaim).toBeDefined()
        expect(game.pendingInsuranceClaim?.triggerType).toBe('on_death')

        // Status should NOT be game_over yet (pending)
        expect(game.status).not.toBe('game_over')
        // Vitality should be 0 (depleted state but preserved until processed?)
        // In updateVitality:
        // if (isDepleted()) { checkInsurance; if found return; setGameOver }
        // So vitality IS 0.
        expect(game.vitality).toBe(0)

        // Resolve claim
        await game.resolveInsuranceClaim()

        // Revived with 10 vitality
        expect(game.vitality).toBe(10)
        expect(game.status).toBe('in_progress')
    })

    it('Disability Insurance (on_aging_gameover) triggers on 3 aging cards', async () => {
        // Setup Disability Insurance
        const insurance = new Card({
            id: 'ins-dis', name: 'Disability Ins', type: 'insurance',
            insuranceType: 'disability', insuranceTriggerType: 'on_aging_gameover',
            power: 0, cost: 0, effects: [], description: 'Reset hand'
        })
        game.activeInsurances.push(insurance)

        // Force hand to have 3 aging cards
        // We need to inject aging cards into hand.
        // Hand is managed by CardManager.
        // game.cardManager.addCardToHand() - is this available?
        // We can just mock the hand property getter? No, it's integration test.

        // Create aging cards
        const agingCards = [1, 2, 3].map(i => new Card({
            id: `aging-${i}`, name: 'Aging', type: 'aging',
            power: 0, cost: 0, effects: [], description: 'Bad'
        }))

        // Add to deck and force draw? 
        // Or manipulate internal state via adding to hand directly if possible.
        // game.addCardToHand()? - No.
        // We can use game.cardManager.state.hand.push() if accessible? No, CardManager private.
        // We can use game.addCardToPlayerDeck then draw.

        // Clear hand
        game.cardManager.discardHand()

        // Add aging cards to deck
        agingCards.forEach(c => game.addCardToPlayerDeck(c))

        // Force draw 3 cards
        await game.drawCards(3)

        // Should trigger check in drawCards()
        expect(game.pendingInsuranceClaim).toBeDefined()
        expect(game.pendingInsuranceClaim?.triggerType).toBe('on_aging_gameover')

        // Resolve
        await game.resolveInsuranceClaim()

        // Hand should be reset (discarded and drawn new)
        // New hand size should be startingHandSize (5)
        expect(game.hand.length).toBe(5)
        expect(game.status).toBe('in_progress')
    })

    it('Income Protection (on_demand) skips challenge', async () => {
        const insurance = new Card({
            id: 'ins-inc', name: 'Income Ins', type: 'insurance',
            insuranceType: 'income_protection', insuranceTriggerType: 'on_demand',
            power: 0, cost: 0, effects: [], description: 'Skip Challenge'
        })
        game.activeInsurances.push(insurance)

        // Set Phase Challenge
        game.setPhase('challenge')
        game.currentChallenge = new Card({ id: 'chal', name: 'Chal', type: 'life', power: 10, cost: 0, effects: [] })

        // Use manually
        game.triggerInsuranceClaim(insurance, 'on_demand')

        expect(game.pendingInsuranceClaim).toBeDefined()

        await game.resolveInsuranceClaim()

        expect(game.currentChallenge).toBeUndefined()
        expect(game.phase).toBe('resolution')
    })
})
