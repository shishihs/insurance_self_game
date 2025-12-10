<template>
  <div class="character-selector fixed inset-0 bg-slate-900/95 z-modal flex flex-col items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
    <div class="text-center mb-10 max-w-2xl">
      <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-6">
        キャラクターを選択してください
      </h2>
      <p class="text-lg text-slate-300">
        あなたの人生観に最も近いキャラクターを選んでください。
        それぞれのキャラクターは異なる初期能力を持っています。
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
      <div 
        v-for="char in characters" 
        :key="char.id"
        class="character-card bg-slate-800/80 border border-slate-700 rounded-xl p-6 hover:border-blue-500 hover:bg-slate-800 transition-all cursor-pointer group relative overflow-hidden"
        @click="selectCharacter(char)"
      >
        <div class="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <h3 class="text-2xl font-bold text-white mb-2">{{ char.name }}</h3>
        <p class="text-slate-400 text-sm mb-4 min-h-[40px]">{{ char.description }}</p>
        
        <div class="space-y-3">
          <div class="flex justify-between items-center bg-slate-900/50 p-2 rounded">
            <span class="text-sm text-slate-400">初期活力補正</span>
            <span :class="char.initialVitalityModifier >= 0 ? 'text-green-400' : 'text-red-400'" class="font-bold">
              {{ char.initialVitalityModifier > 0 ? '+' : '' }}{{ char.initialVitalityModifier }}
            </span>
          </div>
          <div class="flex justify-between items-center bg-slate-900/50 p-2 rounded">
            <span class="text-sm text-slate-400">初期貯蓄</span>
            <span class="text-yellow-400 font-bold">+{{ char.initialSavings || 0 }}</span>
          </div>
        </div>

        <div class="mt-6">
          <button class="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors">
            選択する
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AVAILABLE_CHARACTERS, type Character } from '@/domain/types/game.types'

const characters = AVAILABLE_CHARACTERS

const emit = defineEmits<{
  (e: 'select', characterId: string): void
}>()

const selectCharacter = (character: Character) => {
  emit('select', character.id)
}
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
</style>
