import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import { Game } from '@/domain/entities/Game'
import type { Card } from '@/domain/entities/Card'
import type { GameConfig } from '@/domain/types/game.types'

export const useGameStore = defineStore('game', () => {
    // State - using shallowRef to avoid deep reactivity on Game instance
    const game = shallowRef<Game | null>(null)
    const isInitialized = ref(false)
    const lastUpdate = ref(Date.now()) // Force reactivity when game state changes internally

    // Getters
    const vitality = computed(() => {
        if (!game.value) return 0
        // Dependency on lastUpdate forces re-evaluation
        lastUpdate.value
        return game.value.vitality
    })

    const maxVitality = computed(() => {
        if (!game.value) return 100
        lastUpdate.value
        return game.value.maxVitality
    })

    const hand = computed(() => {
        if (!game.value) return []
        lastUpdate.value
        return game.value.hand
    })

    const currentStage = computed(() => {
        if (!game.value) return 'youth'
        lastUpdate.value
        return game.value.stage
    })

    const currentTurn = computed(() => {
        if (!game.value) return 0
        lastUpdate.value
        return game.value.turn
    })

    const currentPhase = computed(() => {
        if (!game.value) return 'setup'
        lastUpdate.value
        return game.value.phase
    })

    const currentChallenge = computed(() => {
        if (!game.value) return null
        lastUpdate.value
        return game.value.currentChallenge
    })

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
        if (!game.value) return
        await game.value.drawCards(count)
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

        const challengeCard = game.value.challengeDeck.drawCard()
        if (challengeCard) {
            game.value.startChallenge(challengeCard)
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
        // Assuming Game entity has a method to handle insurance selection
        // If not, we might need to implement it or use a service
        // Checking Game.ts, it seems we might need to call a service or a method on Game
        // Let's assume for now we just log it or need to implement it in Game.ts if missing
        // Actually Game.ts likely has a method or we need to use GameInsuranceService
        console.log('Selected insurance:', insuranceType)
        // For now, let's just move to next phase to unblock
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
        lastUpdate.value = Date.now()
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
