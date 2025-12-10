import type { Card } from '@/domain/entities/Card'
import type {
    AIStrategy,
    GameState,
    GameResult,
    StrategyPerformance
} from './AdvancedStrategies'

/**
 * Beginner Persona
 * Prefers safety (Whole Life insurance), risk-averse, suboptimal card selection.
 */
export class BeginnerPersona implements AIStrategy {
    name = 'Beginner'
    description = 'Risk-averse, prefers safety, over-insures.'

    selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
        // Beginner might just pick strong cards regardless of cost, or random
        // Let's say they pick highest power first (simple greedy) but maybe stop too early or late?
        // Let's stick to valid selection but maybe not efficient.
        const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0))
        const selected: Card[] = []
        let totalPower = 0

        for (const card of sorted) {
            if (totalPower >= requiredPower) break
            selected.push(card)
            totalPower += card.power || 0
        }
        return selected
    }

    shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
        const totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)
        // Needs 90% confidence essentially. Or just Total Power > Requirement * 1.2
        return totalPower >= (challenge.power || 0) * 1.2
    }

    selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
        // Prefers Whole Life if available
        if (availableTypes.includes('whole_life')) return 'whole_life'
        return 'term'
    }

    shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
        // Almost always renews if they have money, scared to lose it.
        return true
    }

    calculateRiskScore(gameState: GameState): number {
        return 0.8 // Always feels risky
    }

    adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
        // Beginner doesn't adapt well
    }
}

/**
 * Intermediate Persona
 * Values efficiency (Term insurance), calculates basic math, reasonable risk.
 */
export class IntermediatePersona implements AIStrategy {
    name = 'Intermediate'
    description = 'Balanced play, efficient card usage, understands insurance basics.'

    selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
        // Sorts by power (Greedy) which is decent standard play
        const sorted = [...availableCards].sort((a, b) => (b.power || 0) - (a.power || 0))
        const selected: Card[] = []
        let totalPower = 0

        for (const card of sorted) {
            if (totalPower >= requiredPower) break
            selected.push(card)
            totalPower += card.power || 0
        }
        return selected
    }

    shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
        const totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)
        // Attempts if they have enough power (Logic based)
        return totalPower >= (challenge.power || 0)
    }

    selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
        // Prefers Term (Cheaper)
        return 'term'
    }

    shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
        // Renews if cost is reasonable (< 30% of vitality/money whatever the metric is)
        // Assuming cost is vitality drain or money. 
        return cost < 20 // Arbitrary reasonable threshold
    }

    calculateRiskScore(gameState: GameState): number {
        const vitalityRatio = gameState.vitality / gameState.maxVitality
        return 1 - vitalityRatio
    }

    adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
        // Modest adaptation
    }
}

/**
 * Advanced Persona
 * Min-maxes. Optimizes Cost/Power ratio. Aggressive.
 */
export class AdvancedPersona implements AIStrategy {
    name = 'Advanced'
    description = 'Min-maxer, optimizes ratios, takes calculated risks.'

    selectCards(availableCards: Card[], requiredPower: number, gameState: GameState): Card[] {
        // Optimize for Efficiency: Power / Cost
        const sorted = [...availableCards].sort((a, b) => {
            const ratioA = (a.power || 0) / Math.max(a.cost || 1, 0.1) // Avoid div/0
            const ratioB = (b.power || 0) / Math.max(b.cost || 1, 0.1)
            return ratioB - ratioA // High efficiency first
        })

        const selected: Card[] = []
        let totalPower = 0

        for (const card of sorted) {
            if (totalPower >= requiredPower) break
            selected.push(card)
            totalPower += card.power || 0
        }
        return selected
    }

    shouldAttemptChallenge(challenge: Card, availableCards: Card[], gameState: GameState): boolean {
        const totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)
        // Might attempt even if slightly underpowered if they rely on luck or just strict math
        // But basic logic: minimal requirement meets.
        return totalPower >= (challenge.power || 0)
    }

    selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
        // Calculates expected value. Often Term is better value.
        // If vitality is low, might take Whole Life? Actually Advanced players usually optimize for Term/No Insurance and rely on skill.
        return 'term'
    }

    shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
        // Only if critical.
        return gameState.vitality < 30 // Only if low HP
    }

    calculateRiskScore(gameState: GameState): number {
        // Precise calculation
        return (1 - gameState.vitality / gameState.maxVitality)
    }

    adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
        // High adaptation
    }
}
