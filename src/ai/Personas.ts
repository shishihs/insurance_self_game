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
        let totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)

        // v2: 手札0枚の場合は将来ドローする5枚の期待値で判定
        if (availableCards.length === 0) {
            // Beginner: 楽観的 (平均パワー6 * 5枚 = 30)
            totalPower = 30
        }

        // Extremely reckless - attempts almost any challenge (very low bar)
        return totalPower >= (challenge.power || 0) * 0.2
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

    shouldAttemptChallenge(challenge: Card, availableCards: Card[], _gameState: GameState): boolean {
        let totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)

        // v2: 手札0枚の場合は期待値で判定
        if (availableCards.length === 0) {
            // Intermediate: 平均的 (平均パワー4 * 5枚 = 20)
            totalPower = 20
        }

        const requiredPower = challenge.power || 0

        // 夢カードには挑戦（勝利に必要）
        if (challenge.isDreamCard && challenge.isDreamCard()) {
            // でも1.2倍は欲しい（少し余裕を持つ）
            return totalPower >= requiredPower * 1.2
        }

        // 通常チャレンジは必要パワーがあれば挑戦
        return totalPower >= requiredPower * 1.0
    }

    selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
        // Prefers Term - it's cheaper now for smart players
        if (availableTypes.includes('term')) return 'term'
        return 'whole_life'
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

    shouldAttemptChallenge(challenge: Card, availableCards: Card[], _gameState: GameState): boolean {
        let totalPower = availableCards.reduce((sum, card) => sum + (card.power || 0), 0)

        // v2: 手札0枚の場合は期待値で判定
        if (availableCards.length === 0) {
            // Advanced: 保守的 (平均パワー3 * 5枚 = 15)
            // 実際はもっと高いかもしれないが、リスクを避けるため低めに見積もる
            totalPower = 15
        }

        const requiredPower = challenge.power || 0

        // 夢カードには積極的に挑戦（勝利条件）
        if (challenge.isDreamCard && challenge.isDreamCard()) {
            // 夢チャレンジは必要パワーがあれば挑戦
            return totalPower >= requiredPower * 1.0
        }

        // 通常チャレンジには慎重に（少し余裕を持って）
        return totalPower >= requiredPower * 1.3
    }

    selectInsuranceType(availableTypes: ('whole_life' | 'term')[], gameState: GameState): 'whole_life' | 'term' {
        // Advanced: Uses Term insurance strategically - cheaper and efficient
        if (availableTypes.includes('term')) return 'term'
        return 'whole_life'
    }

    shouldRenewInsurance(insurance: Card, cost: number, gameState: GameState): boolean {
        // Renews if cost is reasonable
        return cost < 25 // Slightly increased threshold
    }

    calculateRiskScore(gameState: GameState): number {
        // Precise calculation
        return (1 - gameState.vitality / gameState.maxVitality)
    }

    adaptStrategy(gameResults: GameResult[], currentPerformance: StrategyPerformance): void {
        // High adaptation
    }
}
