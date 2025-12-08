<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import Hand from './Hand.vue'
import CardComponent from './Card.vue'
import DreamSelector from './DreamSelector.vue'
import ChallengeSelector from './ChallengeSelector.vue'
import InsuranceMarket from './InsuranceMarket.vue'
import GameResult from './GameResult.vue'
import TutorialOverlay from './TutorialOverlay.vue'
import type { GameConfig } from '@/domain/types/game.types'

const store = useGameStore()

const phaseDisplayName = computed(() => {
  const map: Record<string, string> = {
    draw: 'ドロー',
    challenge_choice: '課題選択',
    challenge: '挑戦',
    resolution: '解決',
    market: '保険市場',
    end: 'ターン終了',
    insurance_type_selection: '保険選択'
  }
  return map[store.currentPhase] || store.currentPhase.toUpperCase()
})

onMounted(() => {
  if (!store.game) {
    const config = (window as any).__GAME_CONFIG__ as GameConfig | undefined
    store.initializeGame(config)
    store.startGame()
  }
})



async function onEndTurn() {
  await store.endTurn()
}

async function onChallenge() {
  // v2: Start Challenge Phase (Draw 2, Select 1)
  store.startChallengePhase()
}

</script>

<template>
  <div data-testid="game-board" class="w-full h-screen bg-slate-900 text-white overflow-hidden relative font-sans">
    <!-- Header / Stats -->
    <div class="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-slate-800/80 backdrop-blur-md z-20 shadow-md">
      <div class="flex items-center space-x-6">
        <div class="flex flex-col">
          <span class="text-xs text-slate-400 uppercase">スコア</span>
          <span class="font-bold text-xl text-yellow-400">{{ store.score }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-xs text-slate-400 uppercase">ステージ</span>
          <span class="font-bold text-xl text-purple-400">{{ store.currentStage }}</span>
        </div>
        <div data-testid="vitality" class="flex flex-col">
          <span class="text-xs text-slate-400 uppercase">バイタリティ</span>
          <div class="flex items-end">
            <span class="font-bold text-2xl text-green-400">{{ store.vitality }}</span>
            <span class="text-sm text-slate-500 mb-1 ml-1">/ {{ store.maxVitality }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        <div class="flex flex-col items-end">
          <span class="text-xs text-slate-400 uppercase">ターン</span>
          <span class="font-bold text-xl">{{ store.currentTurn }}</span>
        </div>
        <div class="flex flex-col items-end">
          <span class="text-xs text-slate-400 uppercase">フェーズ</span>
          <span class="font-bold text-lg text-blue-300">{{ phaseDisplayName }}</span>
        </div>
        
        <!-- Tutorial Toggle -->
        <button 
          @click="store.toggleTutorialMode()"
          class="p-2 rounded-full hover:bg-slate-700 transition-colors relative group"
          :title="store.isTutorialMode ? 'チュートリアルを無効化' : 'チュートリアルを有効化'"
        >
          <span v-if="store.isTutorialMode" class="text-xl">🎓</span>
          <span v-else class="text-xl opacity-50 grayscale">🎓</span>
          
          <!-- Tooltip -->
          <span class="absolute right-0 top-full mt-2 w-max px-2 py-1 bg-black text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {{ store.isTutorialMode ? 'チュートリアル ON' : 'チュートリアル OFF' }}
          </span>
        </button>
      </div>
    </div>

    <!-- Main Game Area -->
    <div class="absolute inset-0 flex flex-col items-center justify-center pt-20 pb-96 z-10">
      
      <!-- Challenge Area -->
      <div class="mb-8 flex flex-col items-center">
        <h2 class="text-slate-400 uppercase tracking-widest text-sm mb-4">現在の課題</h2>
        <div v-if="store.currentChallenge" class="transform scale-110">
          <CardComponent :card="store.currentChallenge" />
        </div>
        <div v-else class="w-48 h-72 border-2 border-dashed border-slate-600 rounded-xl flex items-center justify-center bg-slate-800/50">
          <span class="text-slate-500">課題なし</span>
        </div>
      </div>

      <!-- Message Area -->
      <div v-if="store.lastMessage" class="absolute top-20 bg-black/50 text-white px-6 py-2 rounded-full backdrop-blur-sm animate-fade-in-down">
        {{ store.lastMessage }}
      </div>

      <!-- Actions -->
      <div v-if="store.currentStatus !== 'game_over' && store.currentStatus !== 'victory'" class="flex space-x-4 mt-4 relative z-fixed">
        <!-- Draw button removed: Auto-draw at start of turn -->
        
        <button 
          v-if="store.currentPhase === 'draw' && !store.currentChallenge"
          @click="onChallenge"
          class="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-bold shadow-lg transition-colors"
        >
          課題に取り組む
        </button>

        <button 
          v-if="store.currentPhase === 'challenge'"
          @click="store.resolveChallenge()"
          class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg transition-colors"
        >
          課題を解決する
        </button>

        <button 
          v-if="store.currentPhase === 'resolution' || store.currentPhase === 'end'"
          @click="onEndTurn"
          class="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-lg transition-colors"
        >
          ターン終了
        </button>
      </div>

      <!-- Insurance Selection Overlay -->
      <div v-if="store.insuranceTypeChoices && store.insuranceTypeChoices.length > 0" class="fixed inset-0 bg-black/80 z-modal flex items-center justify-center p-8">
        <div class="bg-white rounded-xl p-8 max-w-4xl w-full">
          <h2 class="text-2xl font-bold text-gray-800 mb-4">保険を選択</h2>
          <div class="grid grid-cols-3 gap-4">
            <div 
              v-for="choice in store.insuranceTypeChoices" 
              :key="choice.insuranceType"
              class="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors flex flex-col h-full bg-slate-50"
            >
              <h3 class="font-bold text-lg text-gray-800 mb-2">{{ choice.name }}</h3>
              <p class="text-sm text-gray-600 mb-4 flex-grow">{{ choice.description }}</p>
              
              <div class="space-y-2 mt-auto">
                <button 
                  @click.stop="store.selectInsurance(choice.insuranceType, 'term')"
                  class="w-full py-2 px-3 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded text-sm font-semibold transition-colors flex justify-between items-center"
                >
                  <span>定期保険 ({{ choice.termOption.duration }}ターン)</span>
                  <span class="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">{{ choice.termOption.cost }}</span>
                </button>
                
                <button 
                  @click.stop="store.selectInsurance(choice.insuranceType, 'whole_life')"
                  class="w-full py-2 px-3 bg-green-100 hover:bg-green-200 text-green-800 rounded text-sm font-semibold transition-colors flex justify-between items-center"
                >
                  <span>終身保険 (永続)</span>
                  <span class="bg-green-600 text-white text-xs px-2 py-1 rounded-full">{{ choice.wholeLifeOption.cost }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      <!-- v2 Components -->
      <DreamSelector />
      <ChallengeSelector />
      <GameResult />
      
      <!-- Market Area (Bottom Right or toggleable) -->
      <!-- For now, we put it in the main area but maybe conditional? -->
      <!-- Let's put it fixed at bottom right for access -->
      <div v-if="store.currentPhase === 'draw'" class="fixed bottom-32 right-8 z-40 max-w-xl">
         <InsuranceMarket />
      </div>

    </div>

    <!-- Player Hand -->
    <Hand />
    
    <!-- Background Elements -->
    <div class="absolute inset-0 z-0 opacity-10 pointer-events-none">
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full blur-3xl"></div>
      <div class="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl"></div>
    </div>

    <!-- Tutorial Overlay -->
    <TutorialOverlay />
  </div>
</template>
