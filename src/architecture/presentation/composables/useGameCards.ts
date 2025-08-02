import { computed, type ComputedRef, readonly, type Ref, ref } from 'vue'
import type { GameId } from '../../domain/aggregates/GameAggregate'
import type { CardDto } from '../../application/services/interfaces'

/**
 * Card management composable with pure functional approach
 * 
 * Features:
 * - Immutable state updates
 * - Pure functions for card operations
 * - Reactive card collections
 * - Selection state management
 * - Drag & drop support
 */

/**
 * Card with UI state
 */
export interface UICard extends CardDto {
  isSelected: boolean
  isPlayable: boolean
  isHighlighted: boolean
  isDragging: boolean
  position: { x: number; y: number }
  animation?: string
}

/**
 * Card collection state
 */
export interface CardCollectionState {
  hand: UICard[]
  deck: CardDto[]
  discardPile: CardDto[]
  selectedCards: UICard[]
  playableCards: UICard[]
}

/**
 * Card actions interface
 */
export interface CardActions {
  drawCards: (count: number) => Promise<void>
  selectCard: (cardId: string) => void
  deselectCard: (cardId: string) => void
  toggleCardSelection: (cardId: string) => void
  clearSelection: () => void
  playSelectedCards: () => Promise<void>
  discardCard: (cardId: string) => void
  shuffleDeck: () => Promise<void>
  
  // Drag & Drop
  startDrag: (cardId: string, position: { x: number; y: number }) => void
  updateDragPosition: (cardId: string, position: { x: number; y: number }) => void
  endDrag: (cardId: string) => void
  
  // Animations
  animateCard: (cardId: string, animation: string) => void
  highlightCard: (cardId: string, highlight: boolean) => void
}

/**
 * Composable return interface
 */
export interface UseGameCardsReturn {
  // State
  state: ComputedRef<CardCollectionState>
  
  // Computed properties
  handSize: ComputedRef<number>
  deckSize: ComputedRef<number>
  selectedCount: ComputedRef<number>
  canDrawCards: ComputedRef<boolean>
  canPlayCards: ComputedRef<boolean>
  totalCardPower: ComputedRef<number>
  
  // Actions
  actions: CardActions
  
  // Loading states
  isLoading: Ref<boolean>
  error: Ref<string | null>
}

/**
 * Main composable for card management
 */
export function useGameCards(
  gameId: Ref<GameId | null>,
  maxHandSize: Ref<number>,
  cardService: any // TODO: Type properly
): UseGameCardsReturn {
  
  // ============================================================================
  // REACTIVE STATE
  // ============================================================================
  
  const hand = ref<UICard[]>([])
  const deck = ref<CardDto[]>([])
  const discardPile = ref<CardDto[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  
  // ============================================================================
  // COMPUTED STATE
  // ============================================================================
  
  /**
   * Combined card collection state
   */
  const state = computed<CardCollectionState>(() => {
    const selectedCards = hand.value.filter(card => card.isSelected)
    const playableCards = hand.value.filter(card => card.isPlayable)
    
    return {
      hand: hand.value,
      deck: deck.value,
      discardPile: discardPile.value,
      selectedCards,
      playableCards
    }
  })
  
  /**
   * Collection size metrics
   */
  const handSize = computed(() => hand.value.length)
  const deckSize = computed(() => deck.value.length)
  const selectedCount = computed(() => 
    hand.value.filter(card => card.isSelected).length
  )
  
  /**
   * Action conditions
   */
  const canDrawCards = computed(() => 
    deckSize.value > 0 && handSize.value < maxHandSize.value
  )
  
  const canPlayCards = computed(() => 
    selectedCount.value > 0 && gameId.value !== null
  )
  
  /**
   * Total power of selected cards
   */
  const totalCardPower = computed(() => 
    hand.value
      .filter(card => card.isSelected)
      .reduce((total, card) => total + card.power, 0)
  )
  
  // ============================================================================
  // PURE HELPER FUNCTIONS
  // ============================================================================
  
  /**
   * Convert CardDto to UICard (pure function)
   */
  const createUICard = (card: CardDto): UICard => ({
    ...card,
    isSelected: false,
    isPlayable: true,
    isHighlighted: false,
    isDragging: false,
    position: { x: 0, y: 0 }
  })
  
  /**
   * Update card in collection (pure function)
   */
  const updateCardInCollection = (
    cards: UICard[],
    cardId: string,
    updater: (card: UICard) => Partial<UICard>
  ): UICard[] => {
    return cards.map(card => 
      card.id === cardId 
        ? { ...card, ...updater(card) }
        : card
    )
  }
  
  /**
   * Find card by ID (pure function)
   */
  const findCard = (cards: UICard[], cardId: string): UICard | undefined => 
    cards.find(card => card.id === cardId)
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  /**
   * Draw cards from deck
   */
  const drawCards = async (count: number): Promise<void> => {
    if (!gameId.value) {
      throw new Error('No active game')
    }
    
    try {
      isLoading.value = true
      error.value = null
      
      const drawnCards = await cardService.drawCards(gameId.value, count)
      const uiCards = drawnCards.map(createUICard)
      
      // Immutable update
      hand.value = [...hand.value, ...uiCards]
      
      // Animate newly drawn cards
      uiCards.forEach(card => {
        animateCard(card.id, 'draw')
      })
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to draw cards'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Select a card
   */
  const selectCard = (cardId: string): void => {
    hand.value = updateCardInCollection(hand.value, cardId, () => ({
      isSelected: true
    }))
  }
  
  /**
   * Deselect a card
   */
  const deselectCard = (cardId: string): void => {
    hand.value = updateCardInCollection(hand.value, cardId, () => ({
      isSelected: false
    }))
  }
  
  /**
   * Toggle card selection
   */
  const toggleCardSelection = (cardId: string): void => {
    const card = findCard(hand.value, cardId)
    if (!card) return
    
    if (card.isSelected) {
      deselectCard(cardId)
    } else {
      selectCard(cardId)
    }
  }
  
  /**
   * Clear all selections
   */
  const clearSelection = (): void => {
    hand.value = hand.value.map(card => ({
      ...card,
      isSelected: false
    }))
  }
  
  /**
   * Play selected cards
   */
  const playSelectedCards = async (): Promise<void> => {
    if (!gameId.value) {
      throw new Error('No active game')
    }
    
    const selectedCards = hand.value.filter(card => card.isSelected)
    if (selectedCards.length === 0) {
      throw new Error('No cards selected')
    }
    
    try {
      isLoading.value = true
      error.value = null
      
      const cardIds = selectedCards.map(card => card.id)
      await cardService.playCards(gameId.value, cardIds)
      
      // Remove played cards from hand and add to discard pile
      const remainingCards = hand.value.filter(card => !card.isSelected)
      const playedCards = selectedCards.map(card => ({
        id: card.id,
        name: card.name,
        type: card.type,
        power: card.power,
        cost: card.cost,
        description: card.description
      }))
      
      hand.value = remainingCards
      discardPile.value = [...discardPile.value, ...playedCards]
      
      // Animate card play
      selectedCards.forEach(card => {
        animateCard(card.id, 'play')
      })
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to play cards'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * Discard a card
   */
  const discardCard = (cardId: string): void => {
    const card = findCard(hand.value, cardId)
    if (!card) return
    
    // Remove from hand
    hand.value = hand.value.filter(c => c.id !== cardId)
    
    // Add to discard pile
    const discardedCard: CardDto = {
      id: card.id,
      name: card.name,
      type: card.type,
      power: card.power,
      cost: card.cost,
      description: card.description
    }
    discardPile.value = [...discardPile.value, discardedCard]
    
    // Animate discard
    animateCard(cardId, 'discard')
  }
  
  /**
   * Shuffle deck
   */
  const shuffleDeck = async (): Promise<void> => {
    if (!gameId.value) return
    
    try {
      isLoading.value = true
      await cardService.shuffleDeck(gameId.value)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to shuffle deck'
      throw err
    } finally {
      isLoading.value = false
    }
  }
  
  // ============================================================================
  // DRAG & DROP ACTIONS
  // ============================================================================
  
  /**
   * Start dragging a card
   */
  const startDrag = (cardId: string, position: { x: number; y: number }): void => {
    hand.value = updateCardInCollection(hand.value, cardId, () => ({
      isDragging: true,
      position: { ...position }
    }))
  }
  
  /**
   * Update drag position
   */
  const updateDragPosition = (cardId: string, position: { x: number; y: number }): void => {
    hand.value = updateCardInCollection(hand.value, cardId, () => ({
      position: { ...position }
    }))
  }
  
  /**
   * End dragging
   */
  const endDrag = (cardId: string): void => {
    hand.value = updateCardInCollection(hand.value, cardId, () => ({
      isDragging: false,
      position: { x: 0, y: 0 }
    }))
  }
  
  // ============================================================================
  // ANIMATION ACTIONS
  // ============================================================================
  
  /**
   * Animate a card
   */
  const animateCard = (cardId: string, animation: string): void => {
    hand.value = updateCardInCollection(hand.value, cardId, () => ({
      animation
    }))
    
    // Clear animation after delay
    setTimeout(() => {
      hand.value = updateCardInCollection(hand.value, cardId, () => ({
        animation: undefined
      }))
    }, 500)
  }
  
  /**
   * Highlight a card
   */
  const highlightCard = (cardId: string, highlight: boolean): void => {
    hand.value = updateCardInCollection(hand.value, cardId, () => ({
      isHighlighted: highlight
    }))
  }
  
  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================
  
  const actions: CardActions = {
    drawCards,
    selectCard,
    deselectCard,
    toggleCardSelection,
    clearSelection,
    playSelectedCards,
    discardCard,
    shuffleDeck,
    startDrag,
    updateDragPosition,
    endDrag,
    animateCard,
    highlightCard
  }
  
  return {
    state: readonly(state),
    handSize: readonly(handSize),
    deckSize: readonly(deckSize),
    selectedCount: readonly(selectedCount),
    canDrawCards: readonly(canDrawCards),
    canPlayCards: readonly(canPlayCards),
    totalCardPower: readonly(totalCardPower),
    actions,
    isLoading,
    error
  }
}