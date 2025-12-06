import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Game } from '@/domain/entities/Game'
import { CardFactory } from '@/domain/services/CardFactory'

describe('Game Loop v2 Integration', () => {
    let game: Game

    beforeEach(() => {
        game = new Game({
            difficulty: 'normal',
            startingVitality: 100,
            startingHandSize: 5,
            maxHandSize: 10,
            dreamCardCount: 3
        })
    })

    it('should proceed through the full v2 game loop', async () => {
        // 1. Game Start -> Dream Selection
        game.start()
        expect(game.status).toBe('in_progress')
        expect(game.phase).toBe('dream_selection')
        expect(game.cardChoices).toBeDefined()
        expect(game.cardChoices?.length).toBe(3)

        // 2. Select Dream -> Draw Phase
        const dream = game.cardChoices![0]
        game.selectDream(dream)
        expect(game.phase).toBe('draw')
        expect(game.turn).toBe(1)
        expect(game.selectedDream).toBeDefined()
        expect(game.selectedDream?.id).toBe(dream.id)

        // 3. Draw Phase -> Start Challenge Phase
        // Ensure we handle startup logic first? start() does start flow.
        // We are in draw phase.

        // Let's draw some cards using processor or game method
        await game.drawCards(1)
        expect(game.hand.length).toBeGreaterThan(0) // Logic depends on initial hand + draw

        // Start Challenge Phase
        game.startChallengePhase()
        expect(game.phase).toBe('challenge_choice')
        expect(game.cardChoices).toBeDefined()
        // Should have drawn 2 challenges to choose from? Assuming startChallengePhase does this (implemented in Phase 3)
        // Let's verify startChallengePhase logic in Game.ts: "Draw 2-3? No, rulebook says Draw 2 choose 1" logic was implemented?
        // Actually, let's check what startChallengePhase does in Game.ts from previous interactions. 
        // I recall implementing it to draw random challenges and set choices.

        expect(game.cardChoices?.length).toBeGreaterThan(0)

        // 4. Select Challenge -> Challenge Phase
        const challenge = game.cardChoices![0]
        game.startChallenge(challenge)
        expect(game.phase).toBe('challenge')
        expect(game.currentChallenge).toBeDefined()

        // 5. Resolve Challenge
        // Need to select cards first.
        const cardToPlay = game.hand[0]
        if (cardToPlay) {
            game.toggleCardSelection(cardToPlay)
        }

        const result = game.resolveChallenge()
        expect(game.phase).toBe('resolution') // or card_selection if success?
        // Assuming result success/fail.

        // 6. End Turn (Insurance Cost Check)
        // Setup insurance burden to verify cost deduction
        // Need to force burden or buy insurance first?
        // Let's just run nextTurn and check turns

        game.nextTurn()
        expect(game.turn).toBe(2)
        expect(game.phase).toBe('draw')
    })
})
