<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import CardComponent from './Card.vue'
import type { ICard } from '@/domain/types/game.types'

const store = useGameStore()

const isOpen = computed(() => store.currentPhase === 'challenge_choice')
const choices = computed(() => store.cardChoices)

function select(card: ICard) {
  store.selectChallengeChoice(card)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/90 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
    <div class="text-center mb-8">
      <h2 class="text-3xl font-bold text-white mb-2">Confront a Challenge</h2>
      <p class="text-slate-300">Select which challenge you wish to face this turn.</p>
    </div>
    
    <div class="flex flex-wrap justify-center gap-8">
      <div 
        v-for="card in choices" 
        :key="card.id"
        class="transform transition-all duration-300 hover:scale-105"
      >
        <CardComponent 
          :card="card"
          :isPlayable="true"
          @click="select(card)"
        />
      </div>
    </div>
  </div>
</template>
