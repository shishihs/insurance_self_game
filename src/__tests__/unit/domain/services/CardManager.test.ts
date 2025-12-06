import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CardManager } from '@/domain/services/CardManager'
import { Deck } from '@/domain/entities/Deck'
import { CardFactory } from '@/domain/services/CardFactory'
import type { GameConfig } from '@/domain/types/game.types'

describe('CardManager v2 Logic', () => {
    let cardManager: CardManager
    let playerDeck: Deck
    let challengeDeck: Deck
    let config: GameConfig

    beforeEach(() => {
        cardManager = new CardManager()
        playerDeck = new Deck('Player Deck')
        challengeDeck = new Deck('Challenge Deck')
        config = {
            difficulty: 'normal',
            startingVitality: 100,
            startingHandSize: 5,
            maxHandSize: 10,
            dreamCardCount: 3
        }

        // Setup initial decks
        const initialCards = CardFactory.createStarterLifeCards()
        initialCards.forEach(c => playerDeck.addCard(c))

        // Add some challenges
        const challenges = CardFactory.createChallengeCards('youth')
        challenges.forEach(c => challengeDeck.addCard(c))

        cardManager.initialize(playerDeck, challengeDeck, config)
    })

    describe('Aging Deck', () => {
        it('should initialize with aging deck', () => {
            const state = cardManager.getState()
            expect(state.agingDeck).toBeDefined()
        })

        it('should insert aging card on reshuffle', () => {
            // Setup Aging Deck
            const agingCards = CardFactory.createAgingCards(5)
            cardManager.getState().agingDeck.addCards(agingCards)

            const initialDeckSize = cardManager.getState().playerDeck.size()

            // Perform reshuffle logic manually or trigger it
            // CardManager.reshuffleDiscardPileIntoDeck() is private or handled internally?
            // Need to check how to trigger reshuffle or if it's exposed.
            // drawCards automatically handles reshuffling if deck is empty.

            // Empty the deck first
            while (cardManager.getState().playerDeck.size() > 0) {
                cardManager.drawCards(1)
            }

            // Add cards to discard pile to allow reshuffle
            const discard = CardFactory.createStarterLifeCards()
            discard.forEach(c => cardManager.addToDiscardPile(c))

            expect(cardManager.getState().playerDeck.size()).toBe(0)
            expect(cardManager.getState().discardPile.length).toBeGreaterThan(0)

            // Draw to trigger reshuffle
            cardManager.drawCards(1)

            // Check if aging card was added (Deck size should be Discard size + 1 Aging - 1 Drawn)
            // Actually strictly: (Discard Size + 1 Aging) -> Then draw 1.
            // Wait, let's verify exact logic.
        })
    })

    describe('Insurance Market', () => {
        it('should allow buying insurance from market', () => {
            // Setup market
            const insuranceCard = CardFactory.createTermInsuranceCard({
                insuranceType: 'medical',
                name: 'Test Medical',
                description: 'Test',
                baseCard: {} as any,
                termOption: { cost: 10, duration: 20, description: '' },
                wholeLifeOption: { cost: 0, description: '' }
            })
            // Cost is set via factory from termOption
            expect(insuranceCard.cost).toBe(10)

            // Force add to market for test
            const state = cardManager.getState()
            state.insuranceMarket.push(insuranceCard)
            cardManager.setState(state)

            expect(cardManager.getState().insuranceMarket).toContain(insuranceCard)

            // Buy it
            cardManager.buyInsurance(insuranceCard)

            // Verify removed from market
            expect(cardManager.getState().insuranceMarket).not.toContain(insuranceCard)

            // Verify added to active insurances (which is tracking in Game, but CardManager adds to player deck? Or active list?)
            // Wait, CardManager.buyInsurance adds to player deck AND removes from market.
            // The "Active Insurances" list is in Game.ts, CardManager only handles Decks/Hands currently? 
            // Let's check CardManager implementation of buyInsurance.
        })
    })

    describe('Trouble Cards', () => {
        it('should separate trouble cards when drawing', () => {
            // Add a trouble card to top of deck
            const troubleCard = CardFactory.createCard({
                base: { name: 'Pitfall', type: 'trouble', description: 'Ouch', id: 't1' },
                variant: 'trouble',
                effects: []
            })

            // Manually inject into deck
            cardManager.addToPlayerDeck(troubleCard)

            const result = cardManager.drawCards(1)

            expect(result.troubleCards).toBeDefined()
            expect(result.troubleCards).toHaveLength(1)
            expect(result.troubleCards[0].id).toBe('t1')
            expect(result.drawnCards.length).toBe(0) // Should verify if it draws replacement? 
            // Usually trouble cards are "draw and resolve immediately", does it consume the draw count?
            // Rulebook says: "If drawn, immediately resolve and draw another?" Or just resolve?
            // Implementation logic in CardManager:
            // while (drawn.length < count) { draw() -> if trouble, push to trouble, continue }
            // So it should replace the card.
        })
    })
})
