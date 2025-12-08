import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { Game } from '@/domain/entities/Game'
import { Vitality } from '@/domain/valueObjects/Vitality'
import type { Card } from '@/domain/entities/Card'
import type { GameConfig } from '@/domain/types/game.types'

export const useGameStore = defineStore('game', () => {
    // State - using shallowRef to avoid deep reactivity on Game instance
    const game = shallowRef<Game | null>(null)
    const isInitialized = ref(false)
    const lastUpdate = ref(Date.now()) // Keep for other computeds if needed

    // Explicit reactive state for UI
    const handState = ref<Card[]>([])
    const vitalityState = ref(0)
    const maxVitalityState = ref(100)
    const currentStageState = ref<string>('youth')
    const currentTurnState = ref(0)
    const currentPhaseState = ref<string>('setup')
    const currentStatusState = ref<string>('not_started')
    const currentChallengeState = ref<Card | null>(null)
    const activeInsurancesState = ref<Card[]>([])
    const insuranceMarketState = ref<Card[]>([])
    const scoreState = ref(0)
    const cardChoicesState = ref<Card[]>([])
    const insuranceTypeChoicesState = ref<any[]>([])

    // Tutorial State
    const isTutorialMode = ref(true)
    function toggleTutorialMode() {
        isTutorialMode.value = !isTutorialMode.value
    }

    // Getters - return the explicit state
    const vitality = computed(() => vitalityState.value)
    const maxVitality = computed(() => maxVitalityState.value)
    const hand = computed(() => handState.value)
    const currentStage = computed(() => currentStageState.value)
    const currentTurn = computed(() => currentTurnState.value)
    const currentPhase = computed(() => currentPhaseState.value)
    const currentStatus = computed(() => currentStatusState.value)
    const currentChallenge = computed(() => currentChallengeState.value)

    const insuranceTypeChoices = computed(() => insuranceTypeChoicesState.value)

    const activeInsurances = computed(() => activeInsurancesState.value)
    const insuranceMarket = computed(() => insuranceMarketState.value)
    const score = computed(() => scoreState.value)
    const cardChoices = computed(() => cardChoicesState.value)


    const lastMessage = ref<string>('')

    // Actions
    function initializeGame(config?: GameConfig) {
        console.log('[GameStore] initializeGame called with config:', JSON.stringify(config))
        game.value = new Game(config)

        // Force Vitality Cheat if configured (Bypass Game constructor clamping)
        if (config?.startingVitality && config.startingVitality > 200) {
            console.log(`[GameStore] Forcing High Vitality Cheat: ${config.startingVitality}`)
                // Access private property for testing
                ; (game.value as any)._vitality = Vitality.create(config.startingVitality, config.startingVitality)
        }

        isInitialized.value = true
        triggerUpdate()
    }

    function startGame() {
        if (!game.value) return
        game.value.start()
        triggerUpdate()
    }

    async function drawCards(count: number) {
        console.log('[GameStore] drawCards called', count)
        if (!game.value) {
            console.error('[GameStore] Game instance is null')
            return
        }
        await game.value.drawCards(count)
        console.log('[GameStore] drawCards finished, triggering update')
        triggerUpdate()
    }

    function startChallenge(card: Card) {
        if (!game.value) return
        game.value.startChallenge(card)
        triggerUpdate()
    }

    function startChallengePhase() {
        if (!game.value) return
        game.value.startChallengePhase()
        triggerUpdate()
    }

    function selectChallengeChoice(card: any) {
        if (!game.value) return
        game.value.startChallenge(card as Card)
        triggerUpdate()
    }

    async function selectDream(card: any) {
        if (!game.value) return
        await game.value.selectDream(card as Card)
        triggerUpdate()
    }

    function buyInsurance(card: any) {
        if (!game.value) return
        // Use processor if possible, or direct method
        game.value.cardManager.buyInsurance(card as Card)
        // Also apply cost
        // game.value.applyDamage(card.cost) // Should be part of buy logic? 
        // Processor does this. Let's assume store calls processor or Game method that handles it?
        // Game.ts doesn't have buyInsurance directly in the Entity, it has CardManager.buyInsurance
        // GameActionProcessor.ts has BuyInsuranceProcessor which applies cost.
        // For simplicity and directness in store (bypassing processor validation for now or calling executeAction):
        // Ideally: game.value.actionProcessor.executeAction('buy_insurance', game.value, card)
        // But actionProcessor is private in Game (I think).
        // Let's use direct cardManager + damage for now, or assume this logic is refactored later.
        // Actually, let's look at GameActionProcessor logic.
        // Calling cardManager.buyInsurance removes from market and adds to active.
        if (card.cost > 0) game.value.applyDamage(card.cost)
        triggerUpdate()
    }

    function drawChallenge() {
        if (!game.value) return
        if (game.value.currentChallenge) return

        console.log('[GameStore] drawChallenge called. Deck size:', game.value.challengeDeck.size())

        const challengeCard = game.value.drawChallengeCard()
        if (challengeCard) {
            game.value.startChallenge(challengeCard)
            triggerUpdate()
        } else {
            // Deck is empty, advance stage
            console.log('[GameStore] Challenge deck empty, advancing stage')
            game.value.advanceStage()

            if (game.value.status === 'victory') {
                console.log('[GameStore] Victory!')
            } else {
                // Refill deck for new stage
                game.value.refillChallengeDeck()
            }
            triggerUpdate()
        }
    }

    function resolveChallenge() {
        if (!game.value) return
        const result = game.value.resolveChallenge()
        lastMessage.value = result.message
        triggerUpdate()
        return result
    }

    function selectInsurance(insuranceType: string, durationType: 'term' | 'whole_life' = 'whole_life') {
        if (!game.value) return
        console.log('Selected insurance:', insuranceType, durationType)

        try {
            // モデルのロジックを実行して保険を追加
            game.value.selectInsuranceType(insuranceType, durationType)

            // フェーズはGame内のロジックで更新されるが、念の為Store側も通知
            triggerUpdate()

            lastMessage.value = `${durationType === 'term' ? '定期' : '終身'}${insuranceType}保険に加入しました`
        } catch (e) {
            console.error('Failed to select insurance:', e)
            lastMessage.value = '保険の加入に失敗しました'
        }
    }

    function endTurn() {
        if (!game.value) return
        const result = game.value.nextTurn()
        if (result.insuranceExpirations) {
            lastMessage.value = result.insuranceExpirations.message
        } else {
            lastMessage.value = `ターン ${game.value.turn} 開始`
        }
        triggerUpdate()
    }

    function toggleCardSelection(card: Card) {
        if (!game.value) return
        game.value.toggleCardSelection(card)
        triggerUpdate()
    }

    // Helper to force UI updates since Game entity mutations might not be deep-watched
    function triggerUpdate() {
        if (!game.value) return

        lastUpdate.value = Date.now()

        // Sync explicit state
        handState.value = [...game.value.hand] // Create new array reference
        vitalityState.value = game.value.vitality
        maxVitalityState.value = game.value.maxVitality
        currentStageState.value = game.value.stage
        currentTurnState.value = game.value.turn
        currentPhaseState.value = game.value.phase
        currentStatusState.value = game.value.status
        currentChallengeState.value = game.value.currentChallenge || null

        // v2 sync
        activeInsurancesState.value = [...game.value.activeInsurances]
        insuranceMarketState.value = [...game.value.insuranceMarket]
        scoreState.value = game.value.score
        scoreState.value = game.value.score
        cardChoicesState.value = game.value.cardChoices ? [...game.value.cardChoices] : []
        insuranceTypeChoicesState.value = game.value.insuranceTypeChoices ? [...game.value.insuranceTypeChoices] : []

        console.log('[GameStore] State synced. Hand size:', handState.value.length)

        // Expose for testing
        if (typeof window !== 'undefined') {
            (window as any)._gameStore = { game: game.value }
        }
    }

    return {
        game,
        isInitialized,
        vitality,
        maxVitality,
        hand,
        currentStage,
        currentTurn,
        currentPhase,
        currentStatus,
        currentChallenge,
        insuranceTypeChoices,
        lastMessage,
        initializeGame,
        startGame,
        drawCards,
        startChallenge,
        drawChallenge,
        resolveChallenge,
        selectInsurance,
        endTurn,
        toggleCardSelection,
        triggerUpdate,
        // v2
        activeInsurances,
        insuranceMarket,
        score,
        cardChoices,
        startChallengePhase,
        selectChallengeChoice,
        selectDream,
        buyInsurance,
        isTutorialMode,
        toggleTutorialMode
    }
})
