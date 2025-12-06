import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { Game } from '@/domain/entities/Game'
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
    const currentChallengeState = ref<Card | null>(null)

    // Getters - return the explicit state
    const vitality = computed(() => vitalityState.value)
    const maxVitality = computed(() => maxVitalityState.value)
    const hand = computed(() => handState.value)
    const currentStage = computed(() => currentStageState.value)
    const currentTurn = computed(() => currentTurnState.value)
    const currentPhase = computed(() => currentPhaseState.value)
    const currentChallenge = computed(() => currentChallengeState.value)

    const insuranceTypeChoices = computed(() => {
        if (!game.value) return []
        lastUpdate.value
        return game.value.insuranceTypeChoices
    })

    const cardChoices = computed(() => {
        if (!game.value) return []
        lastUpdate.value
        return game.value.cardChoices
    })

    const lastMessage = ref<string>('')

    // Actions
    function initializeGame(config?: GameConfig) {
        game.value = new Game(config)
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

    function selectInsurance(insuranceType: any) {
        if (!game.value) return
        console.log('Selected insurance:', insuranceType)
        game.value.phase = 'end'
        triggerUpdate()
    }

    function endTurn() {
        if (!game.value) return
        const result = game.value.nextTurn()
        if (result.insuranceExpirations) {
            lastMessage.value = result.insuranceExpirations.message
        } else {
            lastMessage.value = `Turn ${game.value.turn} started`
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
        currentChallengeState.value = game.value.currentChallenge || null

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
        triggerUpdate
    }
})
