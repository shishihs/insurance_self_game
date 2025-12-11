import { describe, it, expect, beforeEach, vi } from 'vitest'
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

        // Check property
        expect(insurance.insuranceTriggerType).toBe('on_heavy_damage')
        expect(game.activeInsurances[0].insuranceTriggerType).toBe('on_heavy_damage')

        // Manual find check
        const found = game.activeInsurances.find(c => c.insuranceTriggerType === 'on_heavy_damage')
        expect(found).toBeDefined()
        expect(found?.id).toBe('ins-med')

        const spy = vi.spyOn(game, 'triggerInsuranceClaim')

        console.error('Test: Applying 20 damage')
        // Apply 20 damage
        game.applyDamage(20)

        expect(spy).toHaveBeenCalled()

        expect(game.pendingInsuranceClaim).toBeDefined()
        expect(game.pendingInsuranceClaim?.insurance.id).toBe('ins-med')
        expect(game.pendingInsuranceClaim?.triggerType).toBe('on_heavy_damage')
        expect(game.pendingInsuranceClaim?.context?.damage).toBe(20)
        expect(game.vitality).toBe(50)

        await game.resolveInsuranceClaim()

        expect(game.vitality).toBe(49)
        expect(game.activeInsurances.find(c => c.id === 'ins-med')).toBeUndefined()
        expect(game.expiredInsurances.find(c => c.id === 'ins-med')).toBeDefined()
    })

    it('Life Insurance (on_death) triggers on vitality depletion', async () => {
        const insurance = new Card({
            id: 'ins-life', name: 'Life Ins', type: 'insurance',
            insuranceType: 'life', insuranceTriggerType: 'on_death',
            power: 0, cost: 0, effects: [], description: 'Revive with 10 vit'
        })
        game.activeInsurances.push(insurance)

        console.error('Test: Applying fatal damage')
        game.applyDamage(50)

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
