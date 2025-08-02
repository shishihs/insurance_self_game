<template>
  <div class="modern-game-component">
    <!-- Game Status Display -->
    <div class="game-status" :class="healthStatusClass">
      <h2>Insurance Game</h2>
      <div class="vitality-bar">
        <div 
          class="vitality-fill" 
          :style="{ width: `${state.vitalityPercentage}%` }"
        ></div>
        <span class="vitality-text">
          {{ state.vitality }} / {{ state.maxVitality }}
        </span>
      </div>
      <div class="game-info">
        <span>Turn: {{ state.currentTurn }}</span>
        <span>Status: {{ state.status }}</span>
        <span>Phase: {{ state.phase }}</span>
      </div>
    </div>

    <!-- Game Controls -->
    <div class="game-controls">
      <button 
        :disabled="!canStartGame || isLoading"
        class="btn btn-primary"
        @click="handleStartGame"
      >
        {{ canStartGame ? 'Start New Game' : 'Game In Progress' }}
      </button>
      
      <button 
        :disabled="!canPauseGame || isLoading"
        class="btn btn-secondary"
        @click="handlePauseGame"
      >
        Pause Game
      </button>
      
      <button 
        :disabled="!canResumeGame || isLoading"
        class="btn btn-secondary"
        @click="handleResumeGame"
      >
        Resume Game
      </button>
      
      <button 
        :disabled="!state.isActive || isLoading"
        class="btn btn-danger"
        @click="handleEndGame"
      >
        End Game
      </button>
    </div>

    <!-- Card Management -->
    <div v-if="state.isActive" class="card-section">
      <h3>Your Hand ({{ cardState.handSize }}/{{ maxHandSize }})</h3>
      
      <div class="hand">
        <div 
          v-for="card in cardState.hand" 
          :key="card.id"
          :class="{
            'card': true,
            'selected': card.isSelected,
            'playable': card.isPlayable,
            'highlighted': card.isHighlighted,
            'dragging': card.isDragging
          }"
          @click="handleCardClick(card)"
          @mouseenter="cardActions.highlightCard(card.id, true)"
          @mouseleave="cardActions.highlightCard(card.id, false)"
        >
          <div class="card-header">
            <h4>{{ card.name }}</h4>
            <span class="card-power">{{ card.power }}</span>
          </div>
          <p class="card-description">{{ card.description }}</p>
          <div class="card-footer">
            <span class="card-type">{{ card.type }}</span>
            <span class="card-cost">Cost: {{ card.cost }}</span>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <button 
          :disabled="!cardState.canDrawCards || isLoading"
          class="btn btn-primary"
          @click="handleDrawCards"
        >
          Draw Cards
        </button>
        
        <button 
          :disabled="!cardState.canPlayCards || isLoading"
          class="btn btn-success"
          @click="handlePlaySelectedCards"
        >
          Play Selected ({{ cardState.selectedCount }})
        </button>
        
        <button 
          :disabled="cardState.selectedCount === 0"
          class="btn btn-secondary"
          @click="cardActions.clearSelection"
        >
          Clear Selection
        </button>
      </div>

      <div v-if="cardState.selectedCount > 0" class="power-display">
        <strong>Total Power: {{ cardState.totalCardPower }}</strong>
      </div>
    </div>

    <!-- Game Actions -->
    <div v-if="state.isActive" class="game-actions">
      <h3>Game Actions</h3>
      
      <div class="action-buttons">
        <button 
          :disabled="isLoading"
          class="btn btn-warning"
          @click="handleApplyDamage"
        >
          Apply Damage (10)
        </button>
        
        <button 
          :disabled="isLoading"
          class="btn btn-success"
          @click="handleHeal"
        >
          Heal (10)
        </button>
        
        <button 
          :disabled="isLoading"
          class="btn btn-primary"
          @click="handleNextTurn"
        >
          Next Turn
        </button>
      </div>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error-message">
      <strong>Error:</strong> {{ error }}
      <button class="btn btn-small" @click="clearError">×</button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="spinner"></div>
      <p>Processing...</p>
    </div>

    <!-- Game Events Log -->
    <div v-if="events.length > 0" class="events-log">
      <h3>Game Events</h3>
      <div class="events-list">
        <div 
          v-for="event in events.slice(-5)" 
          :key="event.id"
          class="event-item"
        >
          <span class="event-time">{{ formatTime(event.timestamp) }}</span>
          <span class="event-type">{{ event.type }}</span>
          <span class="event-data">{{ formatEventData(event.data) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'
import { useGameState } from '../presentation/composables/useGameState'
import { useGameCards } from '../presentation/composables/useGameCards'
import { SERVICE_TOKENS } from '../infrastructure/ioc/Container'
import type { GameEvent } from '../presentation/composables/useGameState'

// ============================================================================
// DEPENDENCY INJECTION
// ============================================================================

const gameRepository = inject(SERVICE_TOKENS.GAME_REPOSITORY)
const eventPublisher = inject(SERVICE_TOKENS.EVENT_PUBLISHER)
const commandBus = inject(SERVICE_TOKENS.COMMAND_BUS)

if (!gameRepository || !eventPublisher || !commandBus) {
  throw new Error('Required services not provided')
}

// ============================================================================
// COMPOSABLES
// ============================================================================

const {
  state,
  canStartGame,
  canPauseGame,
  canResumeGame,
  healthStatus,
  actions: gameActions,
  isLoading,
  error,
  onGameEvent
} = useGameState(gameRepository, eventPublisher, commandBus)

const gameId = computed(() => 
  state.value.id ? { getValue: () => state.value.id! } as any : null
)

const maxHandSize = ref(7)

const {
  state: cardState,
  actions: cardActions
} = useGameCards(gameId, maxHandSize, inject('cardService'))

// ============================================================================
// LOCAL STATE
// ============================================================================

const events = ref<GameEvent[]>([])

// ============================================================================
// COMPUTED PROPERTIES
// ============================================================================

const healthStatusClass = computed(() => ({
  'status-critical': healthStatus.value === 'critical',
  'status-low': healthStatus.value === 'low',
  'status-good': healthStatus.value === 'good',
  'status-excellent': healthStatus.value === 'excellent'
}))

// ============================================================================
// EVENT HANDLERS
// ============================================================================

const handleStartGame = async () => {
  try {
    await gameActions.startGame({
      difficulty: 'normal',
      startingVitality: 100,
      maxHandSize: 7,
      turnsPerStage: 10
    })
  } catch (err) {
    console.error('Failed to start game:', err)
  }
}

const handlePauseGame = async () => {
  try {
    await gameActions.pauseGame()
  } catch (err) {
    console.error('Failed to pause game:', err)
  }
}

const handleResumeGame = async () => {
  try {
    await gameActions.resumeGame()
  } catch (err) {
    console.error('Failed to resume game:', err)
  }
}

const handleEndGame = async () => {
  try {
    await gameActions.endGame('player_quit')
  } catch (err) {
    console.error('Failed to end game:', err)
  }
}

const handleCardClick = (card: any) => {
  if (card.isPlayable) {
    cardActions.toggleCardSelection(card.id)
  }
}

const handleDrawCards = async () => {
  try {
    await cardActions.drawCards(3)
  } catch (err) {
    console.error('Failed to draw cards:', err)
  }
}

const handlePlaySelectedCards = async () => {
  try {
    await cardActions.playSelectedCards()
  } catch (err) {
    console.error('Failed to play cards:', err)
  }
}

const handleApplyDamage = async () => {
  try {
    await gameActions.applyDamage(10, 'test_damage')
  } catch (err) {
    console.error('Failed to apply damage:', err)
  }
}

const handleHeal = async () => {
  try {
    await gameActions.heal(10, 'test_healing')
  } catch (err) {
    console.error('Failed to heal:', err)
  }
}

const handleNextTurn = async () => {
  try {
    await gameActions.nextTurn()
  } catch (err) {
    console.error('Failed to advance turn:', err)
  }
}

const clearError = () => {
  error.value = null
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatTime = (timestamp: Date): string => {
  return timestamp.toLocaleTimeString()
}

const formatEventData = (data: any): string => {
  if (typeof data === 'object') {
    return JSON.stringify(data, null, 2)
  }
  return String(data)
}

// ============================================================================
// LIFECYCLE
// ============================================================================

let unsubscribeEvents: (() => void) | null = null

onMounted(() => {
  // Subscribe to game events
  unsubscribeEvents = onGameEvent((event) => {
    events.value.push({
      ...event,
      id: crypto.randomUUID()
    } as any)
    
    // Keep only last 50 events
    if (events.value.length > 50) {
      events.value = events.value.slice(-50)
    }
  })
})

onUnmounted(() => {
  if (unsubscribeEvents) {
    unsubscribeEvents()
  }
})
</script>

<style scoped>
.modern-game-component {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.game-status {
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.vitality-bar {
  position: relative;
  background: rgba(255, 255, 255, 0.2);
  height: 24px;
  border-radius: 12px;
  margin: 12px 0;
  overflow: hidden;
}

.vitality-fill {
  height: 100%;
  background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
  transition: width 0.3s ease;
  border-radius: 12px;
}

.vitality-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.game-info {
  display: flex;
  gap: 16px;
  margin-top: 12px;
}

.game-info span {
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 14px;
}

.status-critical .vitality-fill {
  background: #ef4444 !important;
}

.status-low .vitality-fill {
  background: #f59e0b !important;
}

.status-good .vitality-fill {
  background: #10b981 !important;
}

.status-excellent .vitality-fill {
  background: #06b6d4 !important;
}

.game-controls, .card-section, .game-actions {
  background: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 24px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.hand {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.card:hover {
  border-color: #6366f1;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.card.selected {
  border-color: #10b981;
  background-color: #f0fdf4;
}

.card.highlighted {
  border-color: #f59e0b;
  background-color: #fffbeb;
}

.card.dragging {
  opacity: 0.7;
  transform: rotate(5deg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.card-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.card-power {
  background: #6366f1;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
}

.card-description {
  font-size: 14px;
  color: #6b7280;
  margin: 8px 0;
  line-height: 1.4;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9ca3af;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-right: 8px;
  margin-bottom: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #5b21b6;
}

.btn-secondary {
  background: #6b7280;
  color: white;
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-warning {
  background: #f59e0b;
  color: white;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-small {
  padding: 4px 8px;
  font-size: 12px;
}

.error-message {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #dc2626;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 1000;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-left: 4px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.events-log {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.events-list {
  max-height: 200px;
  overflow-y: auto;
}

.event-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.event-time {
  color: #6b7280;
  min-width: 80px;
}

.event-type {
  color: #6366f1;
  font-weight: 500;
  min-width: 120px;
}

.event-data {
  color: #374151;
  flex: 1;
}

.power-display {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  color: #0369a1;
  padding: 12px;
  border-radius: 6px;
  text-align: center;
  margin-top: 16px;
}

@media (max-width: 768px) {
  .hand {
    grid-template-columns: 1fr;
  }
  
  .game-info {
    flex-direction: column;
    gap: 8px;
  }
  
  .event-item {
    flex-direction: column;
    gap: 4px;
  }
}
</style>