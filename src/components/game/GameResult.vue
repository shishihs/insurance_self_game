<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'

const store = useGameStore()

const isOpen = computed(() => store.currentStatus === 'game_over' || store.currentStatus === 'victory')
const isVictory = computed(() => store.currentStatus === 'victory')

const title = computed(() => isVictory.value ? 'Victory!' : 'Game Over')
const titleClass = computed(() => isVictory.value ? 'text-yellow-400' : 'text-red-500')

function restart() {
    window.location.reload() // Simple restart for now
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-md animate-fade-in">
    <h2 class="text-6xl font-bold mb-8 animate-bounce" :class="titleClass">{{ title }}</h2>
    
    <div class="bg-slate-800/80 p-8 rounded-2xl max-w-2xl w-full border border-slate-600 shadow-2xl">
        <h3 class="text-2xl font-bold text-white mb-6 border-b border-slate-600 pb-2">Final Results</h3>
        
        <div class="space-y-4 text-lg">
            <div class="flex justify-between items-center">
                <span class="text-slate-300">Final Score</span>
                <span class="font-mono text-3xl font-bold text-yellow-400">{{ store.score }}</span>
            </div>
            
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Turns Survived</span>
                <span class="font-mono text-white">{{ store.currentTurn }}</span>
            </div>
            
            <div class="flex justify-between items-center">
                <span class="text-slate-400">Final Vitality</span>
                <span class="font-mono text-white">{{ store.vitality }} / {{ store.maxVitality }}</span>
            </div>
            
             <div class="flex justify-between items-center">
                <span class="text-slate-400">Challenges Completed</span>
                <span class="font-mono text-white">{{ store.game?.challengesCompleted || 0 }}</span>
            </div>
        </div>
        
        <div class="mt-8 p-4 bg-slate-900/50 rounded-lg text-slate-400 text-sm italic text-center">
           "Life is a daring adventure or nothing at all."
        </div>
    </div>
    
    <button @click="restart" class="mt-12 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-full text-xl shadow-lg hover:shadow-blue-500/50 hover:scale-105 transition-all">
        Play Again
    </button>
  </div>
</template>
