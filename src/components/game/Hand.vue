<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import CardComponent from './Card.vue'

const store = useGameStore()

const hand = computed(() => store.hand)

function onCardClick(card: any) {
  store.toggleCardSelection(card)
}

function isSelected(card: any) {
  return store.game?.selectedCards.includes(card) ?? false
}

// Dynamic spacing based on card count to prevent overflow
const spacingClass = computed(() => {
  const count = hand.value.length
  if (count <= 3) return '-space-x-4'
  if (count <= 5) return '-space-x-12'
  if (count <= 7) return '-space-x-24'
  return '-space-x-32' // Very tight overlap for many cards
})
</script>

<template>
  <div 
    v-if="store.currentStatus !== 'game_over' && store.currentStatus !== 'victory' && store.currentPhase !== 'dream_selection' && store.currentPhase !== 'challenge_choice' && store.currentPhase !== 'character_selection' && store.currentPhase !== 'insurance_type_selection'"
    data-testid="hand-container" 
    class="fixed bottom-0 left-0 right-0 h-96 flex items-end justify-center pb-8 px-4 pointer-events-none z-30"
  >
    <TransitionGroup 
      name="hand" 
      tag="div" 
      class="flex items-end justify-center perspective-1000 w-full max-w-6xl pointer-events-auto"
      :class="spacingClass"
    >
      <div 
        v-for="(card, index) in hand" 
        :key="card.id"
        class="relative transition-all duration-200 ease-out hover:z-50 hover:!-translate-y-32 hover:scale-125 origin-bottom"
        :style="{ zIndex: index }"
      >
        <CardComponent 
          :card="card" 
          :is-selected="isSelected(card)"
          :is-playable="true"
          class="shadow-2xl"
          @click="onCardClick"
        />
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Container 3D perspective if needed, but 'perspective-1000' class handled it */
.perspective-1000 {
  perspective: 1000px;
}

/* List Transitions */
.hand-move, /* apply transition to moving elements */
.hand-enter-active,
.hand-leave-active {
  transition: all 0.5s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.hand-enter-from {
  opacity: 0;
  transform: translateY(120%) scale(0.8);
}

.hand-leave-to {
  opacity: 0;
  transform: translateY(-150%) rotate(15deg) scale(0.6);
}

/* ensure leaving items are taken out of layout flow so others move smoothly */
.hand-leave-active {
  position: absolute;
  z-index: 0; /* Ensure fading card doesn't block clicks */
}
</style>
