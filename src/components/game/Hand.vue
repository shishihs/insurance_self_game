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
      :class="[spacingClass, { 'is-playing': store.lastHandAction === 'play' }]"
    >
      <div 
        v-for="(card, index) in hand" 
        :key="card.id"
        class="group relative origin-bottom transition-all duration-300 ease-out hover:!z-50"
        :style="{ zIndex: index }"
      >
        <div class="transition-all duration-200 ease-out origin-bottom group-hover:-translate-y-32 group-hover:scale-125">
          <CardComponent 
            :card="card" 
            :is-selected="isSelected(card)"
            :is-playable="true"
            class="shadow-2xl"
            @click="onCardClick"
          />
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* Container 3D perspective */
.perspective-1000 {
  perspective: 1000px;
}

/* List Transitions */
.hand-move,
.hand-enter-active,
.hand-leave-active {
  transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
}

/* Enter: Draw from Left Deck (Bottom-Left offscreen) */
.hand-enter-from {
  opacity: 0;
  transform: translate(-100vw, 100px) rotate(-45deg) scale(0.5);
}

/* Leave: Default Discard (Fly Up) */
.hand-leave-to {
  opacity: 0;
  transform: translateY(-150%) rotate(15deg) scale(0.6);
}

/* Leave: Play to Right (towards discord/challenge result area) */
.is-playing .hand-leave-to {
  opacity: 0;
  transform: translate(50vw, -50vh) rotate(45deg) scale(1.2); /* Fly towards top-right/center */
}

/* Ensure leaving items don't mess up layout width immediately */
.hand-leave-active {
  position: absolute;
  z-index: 0;
}
</style>
