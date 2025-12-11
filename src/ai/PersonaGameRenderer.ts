
import type { GameRenderer } from '../interfaces/GameRenderer'
import type { Game } from '../domain/entities/Game'
import type { Card } from '../domain/entities/Card'
import type { ChallengeResult, PlayerStats } from '../domain/types/game.types'
import type { AIStrategy, GameState } from './AdvancedStrategies'

export class PersonaGameRenderer implements GameRenderer {
    private strategy: AIStrategy
    private game?: Game
    private lastChallenge?: Card
    private debugMode = false

    constructor(strategy: AIStrategy) {
        this.strategy = strategy
    }

    setDebugMode(enabled: boolean): void {
        this.debugMode = enabled
    }

    private log(message: string): void {
        if (this.debugMode) {
            console.log(message)
        }
    }

    // === System ===
    clear(): void { }
    async initialize(): Promise<void> { }
    dispose(): void { }
    isWaitingForInput(): boolean { return false }

    // === State Tracking ===
    displayGameState(game: Game): void {
        this.game = game
    }

    displayHand(cards: Card[]): void { }
    displayChallenge(challenge: Card): void {
        this.lastChallenge = challenge
        this.log(`[DEBUG] Display Challenge: ${challenge.name}, Power: ${challenge.power}, RewardType: ${challenge.rewardType}`)
    }

    displayVitality(current: number, max: number): void { }
    displayInsuranceCards(insurances: Card[]): void { }
    displayInsuranceBurden(burden: number): void { }
    displayProgress(stage: string, turn: number): void { }

    // === Utils to map Game to GameState ===
    private getAIState(): GameState {
        if (!this.game) {
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
            discardPile: [],
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
        this.log(`[DEBUG] askCardSelection called. Cards: ${cards.length}, Min: ${minSelection}, Msg: ${message}`);

        let requiredPower = 0
        if (this.game?.currentChallenge && (message?.includes('Challenge') || message?.includes('チャレンジ'))) {
            requiredPower = this.game.currentChallenge.power || 0
        }

        const selected = this.strategy.selectCards(cards, requiredPower, this.getAIState())
        this.log(`[DEBUG] Strategy selected: ${selected.length} cards`);

        if (selected.length < minSelection) {
            const needed = minSelection - selected.length
            const remaining = cards.filter(c => !selected.includes(c))
            selected.push(...remaining.slice(0, needed))
            this.log(`[DEBUG] Forced selection to meet min: ${selected.length}`);
        }
        if (selected.length > maxSelection) {
            this.log(`[DEBUG] Trimming selection to max: ${maxSelection}`);
            return selected.slice(0, maxSelection)
        }

        return selected
    }

    async askChallengeAction(challenge: Card): Promise<'start' | 'skip'> {
        const attempt = this.strategy.shouldAttemptChallenge(challenge, this.game?.hand || [], this.getAIState())
        this.log(`[DEBUG] askChallengeAction: ${challenge.name} (${challenge.power}) -> ${attempt ? 'start' : 'skip'}`);
        return attempt ? 'start' : 'skip'
    }

    async askInsuranceTypeChoice(availableTypes: ('whole_life' | 'term')[]): Promise<'whole_life' | 'term'> {
        const choice = this.strategy.selectInsuranceType(availableTypes, this.getAIState());
        this.log(`[DEBUG] askInsuranceTypeChoice -> ${choice}`);
        return choice;
    }

    async askInsuranceChoice(cards: Card[], message?: string): Promise<Card> {
        this.log(`[DEBUG] askInsuranceChoice. Cards: ${cards.length}`);
        const typePref = this.strategy.selectInsuranceType(['whole_life', 'term'], this.getAIState())

        const matches = cards.filter(c => {
            if (typePref === 'whole_life') return c.name.includes('終身') || c.name.includes('Life')
            if (typePref === 'term') return c.name.includes('定期') || c.name.includes('Term')
            return true
        })

        if (matches.length > 0) return matches[0] as Card
        return cards[0] as Card
    }

    async askInsuranceRenewalChoice(insurance: Card, cost: number): Promise<'renew' | 'expire'> {
        const renew = this.strategy.shouldRenewInsurance(insurance, cost, this.getAIState())
        this.log(`[DEBUG] askInsuranceRenewalChoice -> ${renew}`);
        return renew ? 'renew' : 'expire'
    }

    async askDreamSelection(cards: Card[]): Promise<Card> {
        this.log(`[DEBUG] askDreamSelection`);
        return cards[Math.floor(Math.random() * cards.length)] as Card
    }

    async askChallengeSelection(challenges: Card[]): Promise<Card> {
        this.log(`[DEBUG] askChallengeSelection. Choices: ${challenges.length}`);
        const state = this.getAIState()
        const likelyToWin = challenges.filter(c => this.strategy.shouldAttemptChallenge(c, state.playerHand, state))

        if (likelyToWin.length > 0) return likelyToWin[0] as Card
        return challenges[0] as Card
    }

    async askConfirmation(message: string, defaultChoice?: 'yes' | 'no'): Promise<'yes' | 'no'> {
        this.log(`[DEBUG] askConfirmation: ${message}`);
        if (message.includes('insurance') || message.includes('保険')) {
            const res = this.strategy.calculateRiskScore(this.getAIState()) > 0.5 ? 'yes' : 'no'
            this.log(`[DEBUG] confirmation -> ${res}`);
            return res;
        }
        return defaultChoice || 'no'
    }

    // === Feedback ===
    showChallengeResult(result: ChallengeResult): void {
        this.log(`[DEBUG] Challenge Result: ${result.success ? 'Success' : 'Failure'}, RewardType: ${result.challenge?.rewardType}`);
    }
    showMessage(message: string, level?: 'info' | 'success' | 'warning'): void {
        // no-op
    }
    showError(error: string): void {
        console.error(`[PersonaRenderer Error] ${error}`)
    }
    showGameOver(stats: PlayerStats): void {
        console.log(`[GameOver] Persona: ${this.strategy.name}, Turn: ${stats.turnsPlayed}, Vitality: ${stats.finalVitality}`)
        if (this.game) {
            console.log(`[GameOver Details] Status: ${this.game.status}, Phase: ${this.game.phase}`)
            // 最後のログ履歴を少し出すと原因が分かるかも
        }
    }
    showVictory(stats: PlayerStats): void {
        this.log(`[DEBUG] Victory`);
    }
    showStageClear(stage: string, stats: PlayerStats): void {
        this.log(`[DEBUG] Stage Clear: ${stage}`);
    }
}
