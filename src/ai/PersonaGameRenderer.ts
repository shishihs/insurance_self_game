
import type { GameRenderer } from '@/interfaces/GameRenderer'
import type { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { ChallengeResult, PlayerStats } from '@/domain/types/game.types'
import type { AIStrategy, GameState } from './AdvancedStrategies'

export class PersonaGameRenderer implements GameRenderer {
    private strategy: AIStrategy
    private game?: Game
    private lastChallenge?: Card

    constructor(strategy: AIStrategy) {
        this.strategy = strategy
    }

    // === State Tracking ===
    displayGameState(game: Game): void {
        this.game = game
    }

    displayHand(cards: Card[]): void { }
    displayChallenge(challenge: Card): void {
        this.lastChallenge = challenge
    }
    displayVitality(current: number, max: number): void { }
    displayInsuranceCards(insurances: Card[]): void { }
    displayInsuranceBurden(burden: number): void { }
    displayProgress(stage: string, turn: number): void { }

    // === Utils to map Game to GameState ===
    private getAIState(): GameState {
        if (!this.game) {
            // Fallback if game state not yet set
            return {
                vitality: 20,
                maxVitality: 20,
                turn: 0,
                stage: 'youth',
                phase: 'setup',
                playerHand: [],
                insuranceCards: [],
                insuranceBurden: 0,
                discardPile: [],
                stats: {} as PlayerStats
            }
        }

        return {
            vitality: this.game.vitality,
            maxVitality: this.game.maxVitality,
            turn: this.game.turn,
            stage: this.game.stage,
            phase: this.game.phase,
            playerHand: this.game.hand,
            insuranceCards: this.game.activeInsurances,
            insuranceBurden: this.game.insuranceBurden,
            discardPile: [], // Not exposed in Game entity easily?
            currentChallenge: this.game.currentChallenge,
            stats: this.game.stats
        } as unknown as GameState
    }

    // === Decisions ===

    async askCardSelection(
        cards: Card[],
        minSelection: number = 1,
        maxSelection: number = 1,
        message?: string
    ): Promise<Card[]> {
        // Strategy needs to know context. 
        let requiredPower = 0
        if (this.game?.currentChallenge && (message?.includes('Challenge') || message?.includes('チャレンジ'))) {
            requiredPower = this.game.currentChallenge.power || 0
        }

        // Use strategy
        const selected = this.strategy.selectCards(cards, requiredPower, this.getAIState())

        // Enforce limits
        if (selected.length < minSelection) {
            // Force select if enough cards
            const needed = minSelection - selected.length
            const remaining = cards.filter(c => !selected.includes(c))
            selected.push(...remaining.slice(0, needed))
        }
        if (selected.length > maxSelection) {
            return selected.slice(0, maxSelection)
        }

        return selected
    }

    async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
        const attempt = this.strategy.shouldAttemptChallenge(challenge, this.game?.hand || [], this.getAIState())
        return attempt ? 'start' : 'skip'
    }

    async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
        return this.strategy.selectInsuranceType(availableTypes, this.getAIState())
    }

    async askInsuranceChoice(cards: Card[], message?: string): Promise<Card> {
        const typePref = this.strategy.selectInsuranceType(['whole_life', 'term'], this.getAIState())

        const matches = cards.filter(c => {
            if (typePref === 'whole_life') return c.name.includes('終身') || c.name.includes('Life')
            if (typePref === 'term') return c.name.includes('定期') || c.name.includes('Term')
            return true
        })

        if (matches.length > 0) return matches[0]
        return cards[0]
    }

    async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
        const renew = this.strategy.shouldRenewInsurance(insurance, cost, this.getAIState())
        return renew ? 'renew' : 'expire'
    }

    async askDreamSelection(cards: Card[]): Promise<Card> {
        return cards[Math.floor(Math.random() * cards.length)]
    }

    async askChallengeSelection(challenges: Card[]): Promise<Card> {
        const state = this.getAIState()
        const likelyToWin = challenges.filter(c => this.strategy.shouldAttemptChallenge(c, state.playerHand, state))

        if (likelyToWin.length > 0) return likelyToWin[0]
        return challenges[0]
    }

    async askConfirmation(message: string, defaultChoice?: 'yes' | 'no'): Promise<'yes' | 'no'> {
        if (message.includes('insurance') || message.includes('保険')) {
            return this.strategy.calculateRiskScore(this.getAIState()) > 0.5 ? 'yes' : 'no'
        }
        return defaultChoice || 'no'
    }

    // === Feedback (No-op or Logging) ===
    showChallengeResult(result: ChallengeResult): void { }
    showMessage(message: string, level?: 'info' | 'success' | 'warning'): void { }
    showError(error: string): void {
        console.error(`[PersonaRenderer Error] ${error}`)
    }
    showGameOver(stats: PlayerStats): void { }
    showVictory(stats: PlayerStats): void { }
    showStageClear(stage: string, stats: PlayerStats): void { }

    // === System ===
    clear(): void { }
    async initialize(): Promise<void> { }
    dispose(): void { }
    isWaitingForInput(): boolean { return false }
    setDebugMode(enabled: boolean): void { }
}
