import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Game } from '@/domain/entities/Game'
import { CardFactory } from '@/domain/services/CardFactory'
import { Card } from '@/domain/entities/Card'

describe('Game E2E Boundary & Pattern Tests', () => {
    let game: Game

    beforeEach(() => {
        game = new Game({
            difficulty: 'normal',
            startingVitality: 100,
            startingHandSize: 5,
            maxHandSize: 100, // Large limit for boundary test
            dreamCardCount: 3
        })
    })

    describe('Phase: Dream Selection Boundaries', () => {
        beforeEach(() => {
            game.start() // Enters dream_selection
        })

        it('should fail if trying to proceed without selecting a dream', () => {
            expect(game.phase).toBe('dream_selection')
            // startChallengePhase strictly checks phase 'draw'
            expect(() => game.startChallengePhase()).toThrow(/Can only start challenge phase from draw phase/)
        })

        it('should fail if selecting a dream card not offered', () => {
            const fakeDream = new Card({
                id: 'fake-dream',
                name: 'Fake Dream',
                type: 'dream',
                power: 0,
                cost: 0,
                rarity: 'common',
                effects: [],
                flavorText: 'fake'
            })

            expect(() => game.selectDream(fakeDream)).toThrow(/Invalid dream selection/)
        })

        it('should fail if selecting a dream twice', () => {
            const dream = game.cardManager.getState().cardChoices![0]
            game.selectDream(dream)

            // Phase changed to draw
            expect(game.phase).toBe('draw')

            // Attempt to select again
            expect(() => game.selectDream(dream)).toThrow(/Not in dream selection phase/)
        })
    })

    describe('Phase: Challenge Selection Boundaries', () => {
        beforeEach(() => {
            game.start()
            const dream = game.cardManager.getState().cardChoices![0]
            game.selectDream(dream)
            // Now in 'draw' phase
        })

        it('should handle starting challenge phase with 0 cards in hand', () => {
            // Discard all cards
            const hand = [...game.hand]
            hand.forEach(c => game.cardManager.discard(c))
            expect(game.hand.length).toBe(0)

            game.startChallengePhase()
            expect(game.phase).toBe('challenge_choice')
            expect(game.cardChoices?.length).toBeGreaterThan(0)

            // Proceed to select
            const challenge = game.cardChoices![0]
            game.startChallenge(challenge)
            expect(game.phase).toBe('challenge')
        })

        it('should handle starting challenge phase with max cards (boundary: 99)', () => {
            // Ensure we have exactly 99 cards
            const currentHand = game.hand.length
            const needed = 99 - currentHand
            if (needed > 0) {
                const extraCards = CardFactory.createAgingCards(needed)
                extraCards.forEach(c => game.cardManager.addToHand(c))
            }

            expect(game.hand.length).toBe(99)

            game.startChallengePhase()
            expect(game.phase).toBe('challenge_choice')

            // Proceed to select
            const challenge = game.cardChoices![0]
            game.startChallenge(challenge)
            expect(game.phase).toBe('challenge')
        })

        it('should fail if passing on challenge selection (trying to skip to next)', () => {
            game.startChallengePhase()
            expect(game.phase).toBe('challenge_choice')

            // Try to resolve directly
            expect(() => game.resolveChallenge()).toThrow(/active challenge/)
        })

        it('should fail if selecting a challenge card not offered', () => {
            game.startChallengePhase()

            const fakeChallenge = new Card({
                id: 'fake-challenge',
                name: 'Fake Challenge',
                type: 'challenge',
                power: 10,
                cost: 0,
                rarity: 'common',
                effects: [],
                flavorText: 'fake'
            })

            expect(() => game.startChallenge(fakeChallenge)).toThrow(/Selected card is not in current choices/)
        })

        it('should fail if attempting to select multiple challenges (state transition prevents it)', () => {
            game.startChallengePhase()
            const choices = game.cardChoices!
            const c1 = choices[0]
            const c2 = choices[1] || choices[0]

            game.startChallenge(c1)
            expect(game.phase).toBe('challenge')

            // Try to select second challenge
            expect(() => game.startChallenge(c2)).toThrow()
        })
    })

    describe('Phase: Challenge Resolution Boundaries', () => {
        let challengeCard: Card

        beforeEach(() => {
            game.start()
            game.selectDream(game.cardManager.getState().cardChoices![0])
            game.startChallengePhase()
            challengeCard = game.cardChoices![0]
            game.startChallenge(challengeCard)
        })

        it('should allow resolving with 0 cards selected (Failure expected)', () => {
            // Ensure no cards selected
            game.cardManager.clearSelection()
            expect(game.selectedCards.length).toBe(0)

            const result = game.resolveChallenge()

            // Should proceed but likely fail
            expect(result.success).toBe(false)
            expect(game.stats.failedChallenges).toBe(1)
        })

        it('should allow resolving with ALL cards in hand selected', () => {
            // If hand is empty, draw some
            if (game.hand.length === 0) {
                const cards = CardFactory.createAgingCards(5)
                cards.forEach(c => game.cardManager.addToHand(c))
            }

            // Select all cards
            const hand = game.hand // Get current state
            hand.forEach(c => game.toggleCardSelection(c))

            expect(game.selectedCards.length).toBe(hand.length)

            const result = game.resolveChallenge()
            // Just ensure it runs without crashing
            expect(result).toBeDefined()
        })
    })
})
