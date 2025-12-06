<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '@/domain/entities/Card'

const props = defineProps<{
  card: Card
  isSelected?: boolean
  isPlayable?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', card: Card): void
}>()

const cardClasses = computed(() => {
  return {
    'border-yellow-400 ring-2 ring-yellow-400': props.isSelected,
    'cursor-pointer hover:-translate-y-2': props.isPlayable,
    'opacity-50 cursor-not-allowed': !props.isPlayable,
    'bg-blue-100 border-blue-300': props.card.type === 'life',
    'bg-red-100 border-red-300': props.card.type === 'challenge',
    'bg-green-100 border-green-300': props.card.type === 'insurance',
    'bg-purple-100 border-purple-300': props.card.type === 'skill',
    'bg-yellow-100 border-yellow-300': props.card.type === 'dream',
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
    class="w-48 h-72 rounded-xl border-2 shadow-lg flex flex-col p-4 transition-all duration-200 relative bg-white"
    :class="cardClasses"
    @click="emit('click', card)"
  >
    <!-- Header -->
    <div class="flex justify-between items-start mb-2">
      <span class="text-xs font-bold uppercase tracking-wider opacity-70">{{ typeLabel }}</span>
      <div v-if="card.cost > 0" class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-sm">
        {{ card.cost }}
      </div>
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
    <div class="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
      <div v-if="card.power > 0" class="flex items-center text-red-600 font-bold">
        <span class="mr-1">⚔️</span>
        <span>{{ card.power }}</span>
      </div>
      <div v-if="card.coverage" class="flex items-center text-green-600 font-bold ml-auto">
        <span class="mr-1">🛡️</span>
        <span>{{ card.coverage }}</span>
      </div>
    </div>
  </div>
</template>
