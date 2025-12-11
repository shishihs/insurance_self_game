import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Game } from '../entities/Game'
import { Card } from '../entities/Card'
import type { GameConfig } from '../types/game.types'
import { CardFactory } from '../services/CardFactory'

describe('Insurance Triggers', () => {
    let game: Game
    const defaultConfig: GameConfig = {
        maxVitality: 100,
        startingVitality: 50,
        maxTurn: 20
    }

    beforeEach(() => {
        game = new Game(defaultConfig)

        // Start game properly to initialize deck
        const cards = CardFactory.createStarterLifeCards()
        cards.forEach(card => game.addCardToPlayerDeck(card))
        game.start()
        game.setPhase('draw')
    })

    it('Medical Insurance (on_heavy_damage) triggers on damage >= 10', async () => {
        // Setup Medical Insurance
        const insurance = new Card({
            id: 'ins-med', name: 'Medical Ins', type: 'insurance',
            insuranceType: 'medical', insuranceTriggerType: 'on_heavy_damage',
            cost: 10, payout: 100
        })
        insurance.active = true
        game.activeInsurances.push(insurance)

        const spy = vi.spyOn(game, 'triggerInsuranceClaim')
        const initialVitality = game.vitality

        // Apply Heavy Damage (>10)
        game.applyDamage(20)

        expect(spy).toHaveBeenCalled()

        expect(game.pendingInsuranceClaim).toBeDefined()
        expect(game.pendingInsuranceClaim?.triggerType).toBe('on_heavy_damage')
        expect(game.pendingInsuranceClaim?.context?.damage).toBe(20)
        // Damage should be prevented while claim is pending
        expect(game.vitality).toBe(initialVitality)

        await game.resolveInsuranceClaim()
        // After resolution (and payout), what happens?
        // Current implementation of resolveInsuranceClaim might vary.
        // But preventing damage is Key.
    })

    it('Life Insurance (on_death) triggers on vitality depletion', async () => {
        const insurance = new Card({
            id: 'ins-life', name: 'Life Ins', type: 'insurance',
            insuranceType: 'life', insuranceTriggerType: 'on_death',
            cost: 10, payout: 200
        })
        insurance.active = true
        game.activeInsurances.push(insurance)

        // Apply Fatal Damage (100 to be sure)
        game.applyDamage(100)

        expect(game.pendingInsuranceClaim).toBeDefined()
        expect(game.pendingInsuranceClaim?.triggerType).toBe('on_death')
        expect(game.status).not.toBe('game_over')
        expect(game.vitality).toBe(0)

        await game.resolveInsuranceClaim()

        expect(game.vitality).toBe(10)
        expect(game.status).toBe('in_progress')
    })

    it('Disability Insurance (on_aging_gameover) triggers on 3 aging cards', async () => {
        const insurance = new Card({
            id: 'ins-dis', name: 'Disability Ins', type: 'insurance',
            insuranceType: 'disability', insuranceTriggerType: 'on_aging_gameover',
            power: 0, cost: 0, effects: [], description: 'Reset hand'
        })
        game.activeInsurances.push(insurance)

        const agingCards = [1, 2, 3].map(i => new Card({
            id: `aging-${i}`, name: 'Aging', type: 'aging',
            power: 0, cost: 0, effects: [], description: 'Bad'
        }))

        game.cardManager.discardHand()
        agingCards.forEach(c => game.addCardToPlayerDeck(c))
        await game.drawCards(3)

        expect(game.pendingInsuranceClaim).toBeDefined()
        expect(game.pendingInsuranceClaim?.triggerType).toBe('on_aging_gameover')

        await game.resolveInsuranceClaim()

        expect(game.hand.length).toBe(5)
        expect(game.status).toBe('in_progress')
    })

    it('Income Protection (on_demand) skips challenge', async () => {
        const insurance = new Card({
            id: 'ins-inc', name: 'Income Ins', type: 'insurance',
            insuranceType: 'income', insuranceTriggerType: 'on_demand',
            power: 0, cost: 0, effects: [], description: 'Skip Challenge'
        })
        game.activeInsurances.push(insurance)

        game.setPhase('challenge')
        game.currentChallenge = new Card({
            id: 'chal', name: 'Chal', type: 'life', power: 10, cost: 0, effects: [],
            description: 'Challenge'
        })

        game.triggerInsuranceClaim(insurance, 'on_demand')

        expect(game.pendingInsuranceClaim).toBeDefined()

        await game.resolveInsuranceClaim()

        expect(game.currentChallenge).toBeUndefined()
        expect(game.phase).toBe('resolution')
    })
})
