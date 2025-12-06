import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameActionProcessor } from '@/domain/services/GameActionProcessor'
import { Game } from '@/domain/entities/Game'
import { CardFactory } from '@/domain/services/CardFactory'
import type { Card } from '@/domain/entities/Card'

// Mock Game
const mockGame = {
    phase: '',
    cardManager: {
        drawCards: vi.fn(),
        buyInsurance: vi.fn(),
        removeCardFromGame: vi.fn()
    },
    startChallengePhase: vi.fn(),
    startChallenge: vi.fn(),
    selectDream: vi.fn(),
    applyDamage: vi.fn(),
    selectInsuranceType: vi.fn(),
    resolveChallenge: vi.fn(),
    currentChallenge: null,
    selectedCards: []
} as unknown as Game

describe('GameActionProcessor v2', () => {
    let processor: GameActionProcessor

    beforeEach(() => {
        processor = new GameActionProcessor()
        vi.clearAllMocks()
            // Reset mock state default
            ; (mockGame as any).phase = 'draw'
    })

    describe('SelectDreamProcessor', () => {
        it('should execute select_dream successfully in correct phase', async () => {
            (mockGame as any).phase = 'dream_selection'
            const dreamCard = CardFactory.createCard({ base: { name: 'Dream', type: 'dream', description: '' }, variant: 'dream' })

            const result = await processor.executeAction('select_dream', mockGame, dreamCard)

            expect(result.success).toBe(true)
            expect(mockGame.selectDream).toHaveBeenCalledWith(dreamCard)
        })

        it('should fail select_dream in wrong phase', async () => {
            (mockGame as any).phase = 'draw'
            const dreamCard = CardFactory.createCard({ base: { name: 'Dream', type: 'dream', description: '' }, variant: 'dream' })

            const result = await processor.executeAction('select_dream', mockGame, dreamCard)

            expect(result.success).toBe(false)
            expect(result.error).toContain('夢選択フェーズではありません')
        })
    })

    describe('StartChallengePhaseProcessor', () => {
        it('should execute start_challenge_phase', async () => {
            (mockGame as any).phase = 'draw'
            const result = await processor.executeAction('start_challenge_phase', mockGame, undefined)

            expect(result.success).toBe(true)
            expect(mockGame.startChallengePhase).toHaveBeenCalled()
        })
    })

    describe('BuyInsuranceProcessor', () => {
        it('should execute buy_insurance and apply cost', async () => {
            const insuranceCard = CardFactory.createTermInsuranceCard({
                insuranceType: 'medical',
                name: 'Test',
                description: '',
                baseCard: {} as any,
                termOption: { cost: 10, duration: 10, description: '' },
                wholeLifeOption: { cost: 0, description: '' }
            })
            // Ensure cost is set for test
            expect(insuranceCard.cost).toBe(10)

            const result = await processor.executeAction('buy_insurance', mockGame, insuranceCard)

            expect(result.success).toBe(true)
            expect(mockGame.cardManager.buyInsurance).toHaveBeenCalledWith(insuranceCard)
            expect(mockGame.applyDamage).toHaveBeenCalledWith(10)
        })
    })

    describe('DrawCardsProcessor (Trouble Handling)', () => {
        it('should handle trouble cards and apply penalty', async () => {
            const troubleCard = CardFactory.createCard({ base: { name: 'Trouble', type: 'trouble', description: '' }, variant: 'trouble' })
                ; (troubleCard as any).penalty = 5; // Manually adding penalty for test

            // Mock drawCards return value
            ; (mockGame.cardManager.drawCards as any).mockReturnValue({
                drawnCards: [],
                troubleCards: [troubleCard],
                discardedCards: []
            })

            const result = await processor.executeAction('draw_cards', mockGame, 1)

            expect(result.success).toBe(true)
            expect(mockGame.applyDamage).toHaveBeenCalledWith(5)
            // Verify effect description contains trouble name
            expect(result.effects).toBeDefined()
            const troubleEffect = result.effects?.find(e => e.description.includes('Trouble'))
            expect(troubleEffect).toBeDefined()
        })
    })
})
