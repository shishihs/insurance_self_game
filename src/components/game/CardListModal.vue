<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/domain/entities/Card'
import CardComponent from './Card.vue'

const props = defineProps<{
  isOpen: boolean
  title: string
  cards: Card[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

// カードをソート（種類、コスト順など）
const sortedCards = computed(() => {
  return [...props.cards].sort((a, b) => {
    // 種類でソート (trouble -> life -> dream -> etc)
    if (a.type !== b.type) return a.type.localeCompare(b.type)
    // コストでソート
    return a.cost - b.cost
  })
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <!-- Backdrop -->
    <div 
      class="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      @click="emit('close')"
    ></div>

    <!-- Modal Content -->
    <div class="relative bg-slate-800 rounded-xl border border-slate-600 shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
      
      <!-- Header -->
      <div class="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
        <h2 class="text-xl font-bold text-white flex items-center gap-2">
          {{ title }}
          <span class="text-sm font-normal text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
            {{ cards.length }}枚
          </span>
        </h2>
        <button 
          @click="emit('close')"
          class="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-full transition-colors"
          aria-label="閉じる"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>

      <!-- Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <div v-if="cards.length === 0" class="text-center text-slate-500 py-12">
          カードがありません
        </div>
        
        <div v-else class="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 lg:grid-cols-5 gap-4">
          <div v-for="card in sortedCards" :key="card.id" class="transform hover:scale-105 transition-transform duration-200">
            <!-- Simplified Card Display if CardComponent is too heavy, but reuse is better for consistency -->
            <div class="relative group">
               <CardComponent 
                :card="card"
                :is-selected="false"
                :is-playable="false"
                size="sm"
              />
              <!-- Overlay to prevent interaction if needed -->
              <div class="absolute inset-0 z-10"></div>
            </div>
            
            <!-- Type badge for easier scanning -->
            <div class="mt-2 text-center">
               <span 
                class="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider"
                :class="{
                  'bg-rose-900/50 text-rose-200': card.type === 'trouble',
                  'bg-emerald-900/50 text-emerald-200': card.type === 'life',
                  'bg-amber-900/50 text-amber-200': card.type === 'dream',
                  'bg-slate-700 text-slate-300': !['trouble','life','dream'].includes(card.type)
                }"
              >
                {{ card.type }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-700 bg-slate-900/50 text-right">
        <button 
          @click="emit('close')"
          class="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-slate-900/30;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-600 rounded-full hover:bg-slate-500 transition-colors;
}
</style>
