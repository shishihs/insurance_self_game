<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import CardComponent from './Card.vue'
import type { ICard } from '@/domain/types/game.types'

const store = useGameStore()

const isOpen = computed(() => store.currentPhase === 'dream_selection')
const choices = computed(() => store.cardChoices)

function select(card: ICard) {
  store.selectDream(card)
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-slate-900/95 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
    <div class="text-center mb-10 max-w-2xl">
      <h2 class="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-4">Choose Your Dream</h2>
      <p class="text-lg text-slate-300">
        Your dream defines your life's purpose. Each dream provides unique bonuses during specific life stages.
        Choose wisely, for it will guide your path.
      </p>
    </div>
    
    <div class="flex flex-wrap justify-center gap-8 perspective-1000">
      <div 
        v-for="(card, index) in choices" 
        :key="card.id"
        class="transform transition-all duration-300 hover:scale-110 hover:-translate-y-4 hover:shadow-2xl"
        :style="{ animationDelay: `${index * 100}ms` }"
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

<style scoped>
.perspective-1000 {
  perspective: 1000px;
}
</style>
