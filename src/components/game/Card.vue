<script setup lang="ts">
import { computed } from 'vue'
import type { ICard } from '@/domain/types/game.types'

const props = defineProps<{
  card: ICard
  isSelected?: boolean
  isPlayable?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', card: ICard): void
}>()

const cardClasses = computed(() => {
  return {
    'border-yellow-400 ring-4 ring-yellow-400 shadow-xl scale-105': props.isSelected,
    'cursor-pointer hover:-translate-y-2 hover:shadow-2xl': props.isPlayable,
    'opacity-50 cursor-not-allowed': !props.isPlayable,
    'bg-gradient-to-br from-blue-50 to-white border-blue-400': props.card.type === 'life',
    'bg-gradient-to-br from-red-50 to-white border-red-500': props.card.type === 'challenge',
    'bg-gradient-to-br from-emerald-50 to-white border-emerald-500': props.card.type === 'insurance',
    'bg-gradient-to-br from-purple-50 to-white border-purple-500': props.card.type === 'skill',
    'bg-gradient-to-br from-red-100 to-white border-red-600 ring-4 ring-offset-2 ring-red-500': props.card.type === 'dream',
  }
})

const typeLabel = computed(() => {
  switch (props.card.type) {
    case 'life': return '人生'
    case 'challenge': return '試練'
    case 'insurance': return '保険'
    case 'skill': return 'スキル'
    case 'dream': return '夢'
    default: return props.card.type
  }
})
</script>

<template>
  <div 
    data-testid="card"
    class="w-48 h-72 rounded-xl border-2 shadow-lg flex flex-col p-4 transition-all duration-200 relative bg-white"
    :class="cardClasses"
    @click="emit('click', card)"
  >
    <!-- Damage Indicator (Top-Right) -->
    <div v-if="card.penalty && (card.type === 'challenge' || card.type === 'dream')" 
         class="absolute top-0 right-0 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md -mr-1 -mt-1 z-10"
         title="失敗時のダメージ">
      <span class="text-[10px] mr-[1px]">💥</span>{{ card.penalty }}
    </div>

    <!-- Header -->
    <div class="flex justify-start items-center mb-2 gap-2">
      <div v-if="card.cost > 0" class="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold shadow-md -ml-1 -mt-1 z-10 shrink-0">
        {{ card.cost }}
      </div>
      <span class="text-xs font-bold uppercase tracking-wider opacity-70">{{ typeLabel }}</span>
    </div>

    <!-- Image Placeholder -->
    <div class="w-full h-24 bg-gray-200 rounded-md mb-3 flex items-center justify-center overflow-hidden">
      <span class="text-4xl opacity-20">
        <span v-if="card.type === 'life'">🌱</span>
        <span v-else-if="card.type === 'challenge'">⚡</span>
        <span v-else-if="card.type === 'insurance'">🛡️</span>
        <span v-else>🃏</span>
      </span>
    </div>

    <!-- Content -->
    <h3 class="font-bold text-lg leading-tight mb-1 text-gray-800 min-h-[3.5rem] flex items-center break-words line-clamp-2">{{ card.name }}</h3>
    <p class="text-xs text-gray-600 flex-grow overflow-y-auto leading-snug break-words pr-1">{{ card.description }}</p>

    <!-- Footer -->
    <div class="mt-2 pt-2 border-t border-gray-200 flex justify-start items-center gap-3">
      <div v-if="card.power > 0" class="flex items-center text-red-600 font-bold">
        <span class="mr-1">⚔️</span>
        <span>{{ card.power }}</span>
      </div>
      <div v-if="card.coverage" class="flex items-center text-green-600 font-bold">
        <span class="mr-1">🛡️</span>
        <span>{{ card.coverage }}</span>
      </div>
    </div>
  </div>
</template>
