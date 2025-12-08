<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import CardComponent from './Card.vue'
import type { Card } from '@/domain/entities/Card'

const store = useGameStore()

const hand = computed(() => {
  const h = store.hand
  console.log('[Hand] computed hand updated:', h.length)
  return h
})

function onCardClick(card: Card) {
  store.toggleCardSelection(card)
}

function isSelected(card: Card) {
  return store.game?.selectedCards.includes(card)
}
</script>

<template>
  <div 
    v-if="store.currentStatus !== 'game_over' && store.currentStatus !== 'victory' && store.currentPhase !== 'dream_selection' && store.currentPhase !== 'challenge_choice'"
    data-testid="hand-container" 
    class="fixed bottom-0 left-0 right-0 h-96 flex items-end justify-center pb-4 px-4 pointer-events-none z-30"
  >
    <div class="flex -space-x-12 hover:space-x-2 transition-all duration-300 pointer-events-auto">
      <div 
        v-for="(card, index) in hand" 
        :key="card.id"
        class="transform transition-transform hover:-translate-y-8 hover:z-10 origin-bottom"
        :style="{ zIndex: index }"
      >
        <CardComponent 
          :card="card" 
          :is-selected="isSelected(card)"
          :is-playable="true"
          @click="onCardClick"
        />
      </div>
    </div>
  </div>
</template>
