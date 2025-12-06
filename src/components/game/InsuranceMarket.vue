<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import CardComponent from './Card.vue'
import type { ICard } from '@/domain/types/game.types'

const store = useGameStore()

const marketCards = computed(() => store.insuranceMarket)

function buy(card: ICard) {
  // Add confirmation or check cost logic here if needed
  store.buyInsurance(card)
}
</script>

<template>
  <div v-if="marketCards.length > 0" class="bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20">
    <h3 class="text-xl font-bold text-white mb-4 flex items-center">
      <span>🏥 Insurance Market</span>
      <span class="text-xs ml-2 text-slate-300 font-normal">Protect your future</span>
    </h3>
    
    <div class="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
      <div 
        v-for="card in marketCards" 
        :key="card.id"
        class="flex-shrink-0 transform hover:scale-105 transition-transform"
      >
        <CardComponent 
          :card="card"
          :isPlayable="true"
          @click="buy(card)"
        />
        <div class="text-center mt-2">
            <span class="text-xs bg-slate-800 text-white px-2 py-1 rounded-full">Cost: {{ card.cost }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.3);
}
</style>
