import { computed, type ComputedRef, type Ref, ref, watch } from 'vue'
import type { GameAggregate } from '../../domain/aggregates/GameAggregate';
import { GameId, GamePhase, GameStatus } from '../../domain/aggregates/GameAggregate'
import type { CommandBus, Command } from '../../application/commands/GameCommands';
import { ApplyDamageCommand, HealCommand, StartGameCommand } from '../../application/commands/GameCommands'
import type { IEventPublisher, IGameRepository } from '../../application/services/interfaces'

/**
 * Vue 3 Composition API pattern for Game State Management
 * 
 * This composable follows modern composition patterns:
 * - Separation of concerns
 * - Reactive state management
 * - Pure functions where possible
 * - Dependency injection
 * - Immutable state updates
 */

/**
 * Game state interface for UI consumption
 */
export interface GameState {
  id: string | null
  status: GameStatus
  phase: GamePhase
  vitality: number
  maxVitality: number
  currentTurn: number
  isActive: boolean
  isFinished: boolean
  vitalityPercentage: number
}

/**
 * Game actions interface
 */
export interface GameActions {
  startGame: (config?: GameConfiguration) => Promise<void>
  pauseGame: () => Promise<void>
  resumeGame: () => Promise<void>
  endGame: (reason?: string) => Promise<void>
  applyDamage: (amount: number, reason?: string) => Promise<void>
  heal: (amount: number, reason?: string) => Promise<void>
  nextTurn: () => Promise<void>
}

/**
 * Game configuration for starting new games
 */
export interface GameConfiguration {
  difficulty: 'easy' | 'normal' | 'hard'
  startingVitality?: number
  maxHandSize?: number
  turnsPerStage?: number
}

/**
 * Composable return type
 */
export interface UseGameStateReturn {
  // Reactive state (readonly)
  state: ComputedRef<GameState>

  // Computed properties
  canStartGame: ComputedRef<boolean>
  canPauseGame: ComputedRef<boolean>
  canResumeGame: ComputedRef<boolean>
  healthStatus: ComputedRef<'critical' | 'low' | 'good' | 'excellent'>

  // Actions
  actions: GameActions

  // Loading and error states
  isLoading: Ref<boolean>
  error: Ref<string | null>

  // Event handlers
  onGameEvent: (callback: (event: GameEvent) => void) => () => void
}

/**
 * Game events for external consumption
 */
export interface GameEvent {
  type: string
  gameId: string
  data: any
  timestamp: Date
}

/**
 * Main composable for game state management
 */
export function useGameState(
  gameRepository: IGameRepository,
  eventPublisher: IEventPublisher,
  commandBus: CommandBus
): UseGameStateReturn {

  // ============================================================================
  // REACTIVE STATE
  // ============================================================================

  const currentGame = ref<GameAggregate | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const eventCallbacks = ref<((event: GameEvent) => void)[]>([])

  // ============================================================================
  // COMPUTED STATE
  // ============================================================================

  /**
   * Computed game state for UI consumption
   */
  const state = computed<GameState>(() => {
    const game = currentGame.value

    if (!game) {
      return {
        id: null,
        status: GameStatus.NOT_STARTED,
        phase: GamePhase.SETUP,
        vitality: 0,
        maxVitality: 100,
        currentTurn: 0,
        isActive: false,
        isFinished: false,
        vitalityPercentage: 0
      }
    }

    return {
      id: game.id.getValue(),
      status: game.status,
      phase: game.phase,
      vitality: game.vitality.getValue(),
      maxVitality: game.vitality.getValue(),
      currentTurn: game.currentTurn,
      isActive: game.isActive(),
      isFinished: game.isFinished(),
      vitalityPercentage: game.vitality.getPercentage()
    }
  })

  /**
   * Game action conditions
   */
  const canStartGame = computed(() =>
    !currentGame.value || currentGame.value.status === GameStatus.NOT_STARTED
  )

  const canPauseGame = computed(() =>
    currentGame.value?.status === GameStatus.IN_PROGRESS
  )

  const canResumeGame = computed(() =>
    currentGame.value?.status === GameStatus.PAUSED
  )

  /**
   * Health status indicator
   */
  const healthStatus = computed<'critical' | 'low' | 'good' | 'excellent'>(() => {
    const percentage = state.value.vitalityPercentage

    if (percentage <= 10) return 'critical'
    if (percentage <= 30) return 'low'
    if (percentage <= 70) return 'good'
    return 'excellent'
  })

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Start a new game
   */
  const startGame = async (config: GameConfiguration = { difficulty: 'normal' }): Promise<void> => {
    try {
      isLoading.value = true
      error.value = null

      const command = new StartGameCommand({
        difficulty: config.difficulty,
        startingVitality: config.startingVitality ?? 100,
        maxHandSize: config.maxHandSize ?? 7,
        turnsPerStage: config.turnsPerStage ?? 10
      }) as unknown as Command

      const result = await commandBus.dispatch(command)

      if (!result.success) {
        throw new Error(result.error || 'Failed to start game')
      }

      // Refresh the current game state
      if (result.data?.gameId) {
        await loadGame(GameId.fromString(result.data.gameId))
      }

      emitEvent('gameStarted', { gameId: result.data?.gameId })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unknown error occurred'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Pause the current game
   */
  const pauseGame = async (): Promise<void> => {
    if (!currentGame.value) {
      throw new Error('No active game to pause')
    }

    try {
      isLoading.value = true
      error.value = null

      currentGame.value.pause()
      await gameRepository.save(currentGame.value as GameAggregate)

      emitEvent('gamePaused', { gameId: currentGame.value.id.getValue() })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to pause game'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Resume the current game
   */
  const resumeGame = async (): Promise<void> => {
    if (!currentGame.value) {
      throw new Error('No paused game to resume')
    }

    try {
      isLoading.value = true
      error.value = null

      currentGame.value.resume()
      await gameRepository.save(currentGame.value as GameAggregate)

      emitEvent('gameResumed', { gameId: currentGame.value.id.getValue() })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to resume game'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * End the current game
   */
  const endGame = async (reason: string = 'player_quit'): Promise<void> => {
    if (!currentGame.value) {
      throw new Error('No active game to end')
    }

    try {
      isLoading.value = true
      error.value = null

      if (reason === 'victory') {
        currentGame.value.complete()
      } else {
        // For other reasons, we might need different handling
        currentGame.value.complete() // Simplification for now
      }

      await gameRepository.save(currentGame.value as GameAggregate)

      emitEvent('gameEnded', {
        gameId: currentGame.value.id.getValue(),
        reason,
        finalState: state.value
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to end game'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Apply damage to the game
   */
  const applyDamage = async (amount: number, reason: string = 'challenge_failure'): Promise<void> => {
    if (!currentGame.value) {
      throw new Error('No active game')
    }

    try {
      isLoading.value = true
      error.value = null

      const command = new ApplyDamageCommand(
        currentGame.value.id as unknown as GameId,
        amount,
        'game_action',
        reason
      ) as unknown as Command

      const result = await commandBus.dispatch(command)

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply damage')
      }

      // Refresh game state
      await loadGame(currentGame.value.id as unknown as GameId)

      emitEvent('damageApplied', {
        gameId: currentGame.value.id.getValue(),
        amount,
        reason,
        newVitality: state.value.vitality
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to apply damage'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Heal the game
   */
  const heal = async (amount: number, reason: string = 'healing'): Promise<void> => {
    if (!currentGame.value) {
      throw new Error('No active game')
    }

    try {
      isLoading.value = true
      error.value = null

      const command = new HealCommand(
        currentGame.value.id as unknown as GameId,
        amount,
        'game_action',
        reason
      ) as unknown as Command

      const result = await commandBus.dispatch(command)

      if (!result.success) {
        throw new Error(result.error || 'Failed to heal')
      }

      // Refresh game state
      await loadGame(currentGame.value.id as unknown as GameId)

      emitEvent('healed', {
        gameId: currentGame.value.id.getValue(),
        amount,
        reason,
        newVitality: state.value.vitality
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to heal'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Advance to next turn
   */
  const nextTurn = async (): Promise<void> => {
    if (!currentGame.value) {
      throw new Error('No active game')
    }

    try {
      isLoading.value = true
      error.value = null

      currentGame.value.nextTurn()
      await gameRepository.save(currentGame.value as GameAggregate)

      emitEvent('turnAdvanced', {
        gameId: currentGame.value.id.getValue(),
        newTurn: currentGame.value.currentTurn
      })

    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to advance turn'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Load a game by ID
   */
  const loadGame = async (gameId: GameId): Promise<void> => {
    const game = await gameRepository.findById(gameId)
    if (game) {
      currentGame.value = game
    }
  }

  /**
   * Emit game events to subscribers
   */
  const emitEvent = (type: string, data: any): void => {
    const event: GameEvent = {
      type,
      gameId: currentGame.value?.id.getValue() || '',
      data,
      timestamp: new Date()
    }

    eventCallbacks.value.forEach(callback => {
      try {
        callback(event)
      } catch (err) {
        console.error('Error in game event callback:', err)
      }
    })
  }

  /**
   * Subscribe to game events
   */
  const onGameEvent = (callback: (event: GameEvent) => void): (() => void) => {
    eventCallbacks.value.push(callback)

    // Return unsubscribe function
    return () => {
      const index = eventCallbacks.value.indexOf(callback)
      if (index > -1) {
        eventCallbacks.value.splice(index, 1)
      }
    }
  }

  // ============================================================================
  // WATCHERS
  // ============================================================================

  /**
   * Watch for game over conditions
   */
  watch(
    () => state.value.vitality,
    (newVitality) => {
      if (newVitality <= 0 && currentGame.value?.isActive()) {
        // Automatically end game when vitality reaches 0
        endGame('game_over').catch(err => {
          console.error('Auto game over failed:', err)
        })
      }
    }
  )

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  const actions: GameActions = {
    startGame,
    pauseGame,
    resumeGame,
    endGame,
    applyDamage,
    heal,
    nextTurn
  }

  return {
    state,
    canStartGame,
    canPauseGame,
    canResumeGame,
    healthStatus,
    actions,
    isLoading,
    error,
    onGameEvent
  }
}