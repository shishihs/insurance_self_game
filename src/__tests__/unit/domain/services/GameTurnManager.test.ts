import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameTurnManager } from '@/domain/services/GameTurnManager'
import { Game } from '@/domain/entities/Game'

// Mock dependencies
const mockStageManager = {
    checkStageProgression: vi.fn().mockReturnValue({ hasChanged: false })
}
const mockExpirationManager = {
    updateInsuranceExpirations: vi.fn().mockReturnValue(null) // No expirations
}

// Mock Game
const mockGame = {
    turn: 1,
    stats: { turnsPlayed: 0 },
    phase: '',
    status: 'in_progress',
    stage: 'youth',
    insuranceBurden: 0,
    activeInsurances: [], // internal usage mock
    expiredInsurances: [],
    applyDamage: vi.fn(),
    drawCards: vi.fn(),
    setStage: vi.fn(),
    getActiveInsurances: vi.fn().mockReturnValue([]),
    heal: vi.fn(),
    updateInsuranceBurden: vi.fn() // Called inside updateInsuranceExpirations logic via (game as any)
} as unknown as Game

describe('GameTurnManager v2', () => {
    let turnManager: GameTurnManager

    beforeEach(() => {
        turnManager = new GameTurnManager(mockStageManager as any, mockExpirationManager as any)
        vi.clearAllMocks()
            // Reset defaults
            ; (mockGame as any).insuranceBurden = 0
            ; (mockGame as any).turn = 1
            ; (mockGame as any).status = 'in_progress'
    })

    it('should deduct insurance cost from vitality', () => {
        // Setup insurance burden
        (mockGame as any).insuranceBurden = 20

        turnManager.nextTurn(mockGame)

        expect(mockGame.applyDamage).toHaveBeenCalledWith(20)
    })

    it('should not apply damage if no insurance cost', () => {
        (mockGame as any).insuranceBurden = 0

        turnManager.nextTurn(mockGame)

        expect(mockGame.applyDamage).not.toHaveBeenCalled()
    })

    it('should apply recovery insurance effects', () => {
        // Mock recovery insurance in active list
        const recoveryInsurance = {
            isRecoveryInsurance: () => true,
            calculateTurnHeal: () => 5
        }
            ; (mockGame.getActiveInsurances as any).mockReturnValue([recoveryInsurance])

        turnManager.nextTurn(mockGame)

        expect(mockGame.heal).toHaveBeenCalledWith(5)
    })
})
