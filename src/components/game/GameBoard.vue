<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import Hand from './Hand.vue'
import CardComponent from './Card.vue'
import CharacterSelector from './CharacterSelector.vue'
import DreamSelector from './DreamSelector.vue'
import ChallengeSelector from './ChallengeSelector.vue'
import InsuranceMarket from './InsuranceMarket.vue'
import GameResult from './GameResult.vue'
import TutorialOverlay from './TutorialOverlay.vue'

import InsuranceClaimDialog from './InsuranceClaimDialog.vue'
import CardListModal from './CardListModal.vue'
import type { GameConfig, ChallengeResult, Difficulty } from '@/domain/types/game.types'

const store = useGameStore()

// Deck/Discard Viewers
const showDeckModal = ref(false)
const showDiscardModal = ref(false)

// ダメージエフェクト用の状態
const isDamageEffect = ref(false)
const isBigDamageEffect = ref(false)
const lastDamageAmount = ref(0)
const showDamageToast = ref(false)

const phaseDisplayName = computed(() => {
  const map: Record<string, string> = {
    draw: 'ドロー',
    challenge_choice: '課題選択',
    challenge: '挑戦',
    resolution: '解決',
    market: '保険市場',
    end: 'ターン終了',
    insurance_type_selection: '保険選択',
    dream_selection: '夢選択',
    character_selection: '主人公選択',
    setup: '準備'
  }
  return map[store.currentPhase] || store.currentPhase.toUpperCase()
})

const stageDisplayName = computed(() => {
  const map: Record<string, string> = {
    youth: '青年期',
    middle: '壮年期',
    fulfillment: '充実期'
  }
  return map[store.currentStage] || store.currentStage
})

onMounted(() => {
  if (!store.game) {
    const windowConfig = (window as any).__GAME_CONFIG__ as GameConfig | undefined
    // V3.2 Hardcore Fix: Enforce startingVitality 20
    const config = {
      ...windowConfig,
      difficulty: 'hardcore' as Difficulty,
      startingVitality: 20
    }
    store.initializeGame(config)
    store.startGame()
  }
})

// ダメージエフェクトをトリガー
function triggerDamageEffect(damageAmount: number) {
  lastDamageAmount.value = damageAmount
  isDamageEffect.value = true
  showDamageToast.value = true
  
  // 大ダメージ（10以上）の場合は強調エフェクト
  if (damageAmount >= 10) {
    isBigDamageEffect.value = true
  }
  
  // エフェクト終了タイマー
  setTimeout(() => {
    isDamageEffect.value = false
    isBigDamageEffect.value = false
  }, 500)
  
  setTimeout(() => {
    showDamageToast.value = false
  }, 2000)
}

async function onEndTurn() {
  await store.endTurn()
}

async function onChallenge() {
  // v2: Start Challenge Phase (Draw 2, Select 1)
  store.startChallengePhase()
}

// チャレンジ解決をラップしてダメージエフェクトを追加
async function onResolveChallenge() {
  const result = store.resolveChallenge() as ChallengeResult | undefined
  
  if (result && result.resultType === 'damage_taken' && result.damageAmount) {
    triggerDamageEffect(result.damageAmount)
  }
}

</script>

<template>
  <div data-testid="game-board" class="w-full h-screen bg-slate-900 text-white overflow-hidden relative font-sans selection:bg-purple-500 selection:text-white" :class="{ 'animate-shake': isDamageEffect, 'animate-shake-big': isBigDamageEffect }">
    <!-- Background -->
    <div class="absolute inset-0 z-0">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
      <div class="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-5 pointer-events-none"></div>
      <!-- Ambient Lights -->
      <div class="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[100px] animate-pulse-slow delay-1000"></div>
    </div>

    <!-- Header / Stats Bar -->
    <div class="absolute top-0 left-0 right-0 h-20 px-8 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl border-b border-white/5 z-20 shadow-2xl">
      <!-- Left Stats -->
      <div class="flex items-center space-x-8">
        <div class="flex flex-col relative group cursor-help">
          <span class="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1">
            Stage <span class="text-[8px] opacity-50">ℹ️</span>
          </span>
          <span class="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-100 border-b border-dashed border-purple-500/30 w-fit">{{ stageDisplayName }}</span>
          
          <!-- Stage Difficulty Tooltip -->
          <div class="absolute left-0 top-full mt-2 w-64 bg-slate-900/95 border border-slate-600 rounded-lg shadow-2xl p-4 opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] pointer-events-none translate-y-2 group-hover:translate-y-0 backdrop-blur-md">
            <h4 class="text-xs font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1 flex justify-between">
              <span>各ステージの課題強度</span>
              <span>Power</span>
            </h4>
            <table class="w-full text-xs">
              <tbody class="divide-y divide-slate-800">
                <tr>
                  <td class="py-1.5 text-purple-300 font-medium">青年期 (Youth)</td>
                  <td class="py-1.5 text-right font-mono text-slate-200">10 - 16</td>
                </tr>
                <tr>
                  <td class="py-1.5 text-blue-300 font-medium">壮年期 (Middle)</td>
                  <td class="py-1.5 text-right font-mono text-slate-200">22 - 32</td>
                </tr>
                <tr>
                  <td class="py-1.5 text-amber-300 font-medium">充実期 (Fulfillment)</td>
                  <td class="py-1.5 text-right font-mono text-slate-200">25 - 50+</td>
                </tr>
              </tbody>
            </table>
            <div class="mt-2 pt-2 border-t border-slate-700/50">
               <p class="text-[10px] text-slate-400 leading-tight">
                ※数値は課題の<span class="text-red-400 font-bold">パワー</span>（＝失敗時のダメージ量）の目安です。
              </p>
               <p class="text-[10px] text-slate-500 leading-tight mt-1">
                ※「理不尽な死」イベント（Power 30+）は全期間で発生する可能性があります。
              </p>
            </div>
          </div>
        </div>
        
        <div data-testid="vitality" class="flex flex-col relative group">
          <span class="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold">Vitality</span>
          <div class="flex items-baseline space-x-1">
            <span class="font-bold text-2xl text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]">{{ store.vitality }}</span>
            <span class="text-sm text-slate-600 font-medium">/ {{ store.maxVitality }}</span>
          </div>
          <!-- Bar visual -->
          <div class="absolute -bottom-2 left-0 w-24 h-1 bg-slate-700 rounded-full overflow-hidden">
             <div class="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500" :style="{ width: `${Math.min(100, (store.vitality / store.maxVitality) * 100)}%` }"></div>
          </div>
        </div>
      </div>

      <!-- Right Info -->
      <div class="flex items-center space-x-6">
        <div class="flex flex-col items-end">
          <span class="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold">Turn</span>
          <div class="flex items-baseline space-x-1">
             <span class="font-bold text-2xl text-white">{{ store.currentTurn }}</span>
             <span class="text-sm text-slate-600 font-medium">/ {{ store.maxTurns }}</span>
          </div>
        </div>
        
        <div class="w-px h-8 bg-white/10 mx-2"></div>

        <div class="flex flex-col items-end min-w-[100px]">
          <span class="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest font-semibold">Phase</span>
          <span class="font-bold text-lg text-blue-200">{{ phaseDisplayName }}</span>
        </div>
        
        <!-- Tutorial Toggle -->
        <button 
          @click="store.toggleTutorialMode()"
          class="p-2 rounded-full hover:bg-white/10 transition-colors relative group"
        >
          <span class="text-xl filter" :class="store.isTutorialMode ? 'grayscale-0 opacity-100' : 'grayscale opacity-40'">🎓</span>
        </button>
      </div>
    </div>

    <!-- Main Game Area -->
    <div class="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      
      <!-- Center: Challenge Zone -->
      <div class="transform -translate-y-12 flex flex-col items-center pointer-events-auto transition-all duration-500"
           :class="{ 'scale-100 opacity-100': store.currentChallenge, 'scale-90 opacity-0': !store.currentChallenge }">
        <div class="relative group">
          <!-- Glow effect -->
          <div v-if="store.currentChallenge" class="absolute -inset-4 bg-yellow-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <h2 class="text-slate-500 uppercase tracking-[0.2em] text-xs text-center mb-6 font-bold">Current Challenge</h2>
          <CardComponent v-if="store.currentChallenge" :card="store.currentChallenge" class="shadow-2xl" />
        </div>
      </div>

      <!-- Message Toast -->
      <div v-if="store.lastMessage" class="absolute top-28 bg-white/10 border border-white/10 backdrop-blur-md text-white px-8 py-3 rounded-full shadow-xl animate-fade-in-down z-50">
        {{ store.lastMessage }}
      </div>

    </div>

    <!-- Right Sidebar Operations -->
    <div class="absolute right-0 top-0 bottom-0 w-64 pt-24 pb-64 px-6 flex flex-col justify-center items-end z-30 pointer-events-none">
      <div class="pointer-events-auto space-y-4 flex flex-col items-end w-full">
        
        <!-- Button: Start Challenge -->
        <button 
          v-if="store.currentPhase === 'draw' && !store.currentChallenge"
          @click="onChallenge"
          class="group w-full relative overflow-hidden bg-gradient-to-r from-yellow-600 to-amber-700 hover:from-yellow-500 hover:to-amber-600 text-white rounded-xl font-bold shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-yellow-500/20"
        >
          <div class="px-6 py-4 flex items-center justify-between">
            <span class="text-lg">課題に挑む</span>
            <span class="text-2xl group-hover:translate-x-1 transition-transform">⚔️</span>
          </div>
        </button>

        <!-- Button: Resolve -->
        <button 
          v-if="store.currentPhase === 'challenge'"
          @click="onResolveChallenge()"
          class="group w-full relative overflow-hidden bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white rounded-xl font-bold shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-red-500/20"
        >
          <div class="px-6 py-4 flex items-center justify-between">
            <span class="text-lg">解決する</span>
            <span class="text-2xl group-hover:rotate-12 transition-transform">🎲</span>
          </div>
        </button>

        <!-- On-Demand Insurance Buttons -->
        <template v-if="store.currentPhase === 'challenge' && store.availableOnDemandInsurances && store.availableOnDemandInsurances.length > 0">
           <button v-for="insurance in store.availableOnDemandInsurances" :key="insurance.id"
               @click="store.useOnDemandInsurance(insurance)"
               class="group w-full relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white rounded-xl font-bold shadow-lg transition-all duration-200 transform hover:scale-105 mb-2"
           >
              <div class="px-6 py-4 flex items-center justify-between">
                <span class="text-lg">{{ insurance.name }}を使う</span>
                <span class="text-2xl group-hover:scale-110 transition-transform">🛡️</span>
              </div>
           </button>
        </template>

        <!-- Button: End Turn -->
        <button 
          v-if="store.currentPhase === 'resolution' || store.currentPhase === 'end'"
          @click="onEndTurn"
          class="group w-full relative overflow-hidden bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white rounded-xl font-bold shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-green-500/20 text-left"
        >
          <div class="px-5 py-3">
            <div class="flex items-center justify-between mb-1">
              <span class="text-lg text-white">次のターンへ</span>
              <span class="text-xl group-hover:translate-x-1 transition-transform">➡️</span>
            </div>
            <div class="text-[10px] text-green-100 opacity-80 font-normal">
              ※手札はすべて捨てられます
            </div>
          </div>
        </button>

      </div>
    </div>

    <!-- Bottom Areas (Deck / Discard) -->
    <!-- Bottom Areas (Deck / Discard) -->
    <div 
      class="fixed bottom-8 left-8 z-50 flex flex-col items-center opacity-80 group hover:opacity-100 transition-opacity cursor-pointer transform hover:scale-105"
      @click="showDeckModal = true"
    >
      <div class="w-20 h-28 border-2 border-dashed border-slate-500 rounded-lg flex items-center justify-center bg-slate-800/80 shadow-lg group-hover:border-slate-300 transition-colors">
        <span class="text-2xl">📚</span>
      </div>
      <span class="text-xs text-slate-400 mt-2 font-bold tracking-wider group-hover:text-white transition-colors">DECK</span>
      <span class="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">{{ store.playerDeck?.length ?? 0 }} Cards</span>
    </div>

    <div 
      class="fixed bottom-8 right-8 z-50 flex flex-col items-center opacity-80 group hover:opacity-100 transition-opacity cursor-pointer transform hover:scale-105"
      @click="showDiscardModal = true"
    >
      <div class="w-20 h-28 border-2 border-dashed border-slate-500 rounded-lg flex items-center justify-center bg-slate-800/80 shadow-lg group-hover:border-slate-300 transition-colors">
        <span class="text-2xl">🗑️</span>
      </div>
      <span class="text-xs text-slate-400 mt-2 font-bold tracking-wider group-hover:text-white transition-colors">DISCARD</span>
      <span class="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors">{{ store.discardPile?.length ?? 0 }} Cards</span>
    </div>

    <!-- Modals -->
    <CardListModal 
      :is-open="showDeckModal" 
      title="デッキ一覧" 
      :cards="store.playerDeck ?? []" 
      @close="showDeckModal = false" 
    />
    <CardListModal 
      :is-open="showDiscardModal" 
      title="捨て札一覧" 
      :cards="store.discardPile ?? []" 
      @close="showDiscardModal = false" 
    />

    <!-- Insurance Selection Overlay -->
    <div v-if="store.insuranceTypeChoices && store.insuranceTypeChoices.length > 0" class="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8 backdrop-blur-sm animate-fade-in">
      <div class="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-5xl w-full shadow-2xl relative overflow-hidden">
        <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-2">保険プランの選択</h2>
        <p class="text-gray-400 mb-8">将来のリスクに備え、最適な保険を選択してください。</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div 
            v-for="choice in store.insuranceTypeChoices" 
            :key="choice.insuranceType"
            class="group relative bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 hover:bg-gray-800 hover:border-blue-500/50 transition-all duration-300 flex flex-col"
          >
            <div class="absolute inset-0 bg-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <span class="text-3xl filter grayscale group-hover:grayscale-0 transition-all">🛡️</span>
                <span class="text-xs font-bold px-2 py-1 rounded bg-gray-700 text-gray-300">Type: {{ choice.insuranceType }}</span>
              </div>
              
              <h3 class="font-bold text-xl text-white mb-2 group-hover:text-blue-300 transition-colors">{{ choice.name }}</h3>
              <p class="text-sm text-gray-400 mb-6 min-h-[40px] leading-relaxed">{{ choice.description }}</p>
              
              <div class="space-y-3 mt-auto">
                <button 
                  @click.stop="store.selectInsurance(choice.insuranceType, 'term')"
                  class="w-full py-3 px-4 bg-gray-700 hover:bg-blue-600 text-gray-200 hover:text-white rounded-lg text-sm font-bold transition-all flex justify-between items-center group/btn"
                >
                  <span class="flex flex-col items-start text-xs">
                    <span class="font-bold text-sm">定期保険</span>
                    <span class="opacity-70">{{ choice.termOption.duration }}ターン限定</span>
                  </span>
                  <span class="bg-black/30 px-3 py-1 rounded text-xs font-mono group-hover/btn:bg-white/20">Cost: {{ choice.termOption.cost }}</span>
                </button>
                
                <button 
                  @click.stop="store.selectInsurance(choice.insuranceType, 'whole_life')"
                  class="w-full py-3 px-4 bg-gray-700 hover:bg-emerald-600 text-gray-200 hover:text-white rounded-lg text-sm font-bold transition-all flex justify-between items-center group/btn"
                >
                  <span class="flex flex-col items-start text-xs">
                    <span class="font-bold text-sm">終身保険</span>
                    <span class="opacity-70">永続効果</span>
                  </span>
                  <span class="bg-black/30 px-3 py-1 rounded text-xs font-mono group-hover/btn:bg-white/20">Cost: {{ choice.wholeLifeOption.cost }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Skip Insurance Button -->
        <div class="text-center pt-6 border-t border-gray-700">
          <button 
            @click.stop="store.skipInsurance()"
            class="group relative px-8 py-4 bg-gray-800 hover:bg-red-900/50 border border-gray-600 hover:border-red-500/50 text-gray-300 hover:text-white rounded-xl transition-all duration-200"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">🚫</span>
              <div class="text-left">
                <span class="block font-bold text-lg">保険に入らない</span>
                <span class="block text-xs text-gray-500 group-hover:text-gray-400">
                  コスト節約 / ピンチ時の保障なし
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>


    <!-- v2 Selectors -->
    <CharacterSelector v-if="store.currentPhase === 'character_selection'" @select="store.selectCharacter" />
    <DreamSelector />
    <ChallengeSelector />

    
    <!-- Result Overlay -->
    <GameResult />
    
    <!-- Damage Effect Overlay -->
    <Transition name="damage-flash">
      <div 
        v-if="isDamageEffect" 
        class="fixed inset-0 pointer-events-none z-[200]"
        :class="isBigDamageEffect ? 'bg-red-600/40' : 'bg-red-500/25'"
      ></div>
    </Transition>
    
    <!-- Damage Toast -->
    <Transition name="damage-toast">
      <div 
        v-if="showDamageToast && lastDamageAmount > 0" 
        class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[201] pointer-events-none"
      >
        <div class="bg-red-600/90 text-white px-8 py-6 rounded-2xl shadow-2xl border-2 border-red-400 animate-bounce-in">
          <div class="text-center">
            <span class="text-4xl mb-2 block">💥</span>
            <span class="text-3xl font-bold">-{{ lastDamageAmount }}</span>
            <span class="block text-sm opacity-80 mt-1">ダメージ</span>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- Market Button / Area -->
    <div v-if="store.currentPhase === 'draw'" class="fixed bottom-32 right-8 z-40 max-w-xl pointer-events-auto">
       <InsuranceMarket />
    </div>

    <!-- Player Hand -->
    <div class="absolute bottom-0 left-0 right-0 z-20 pointer-events-auto">
      <Hand />
    </div>
    
    <!-- Tutorial Overlay -->
    <TutorialOverlay />
    <!-- Insurance Claim Dialog -->
    <InsuranceClaimDialog v-if="store.pendingInsuranceClaim" 
        :pending-claim="store.pendingInsuranceClaim"
        @claim="store.claimInsurance"
        @decline="store.declineInsuranceClaim"
    />

  </div>
</template>

<style scoped>
/* Damage Shake Animation */
.animate-shake {
  animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
}

.animate-shake-big {
  animation: shake-big 0.5s cubic-bezier(.36,.07,.19,.97) both;
}

@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}

@keyframes shake-big {
  10%, 90% { transform: translateX(-2px) rotate(-0.5deg); }
  20%, 80% { transform: translateX(4px) rotate(0.5deg); }
  30%, 50%, 70% { transform: translateX(-6px) rotate(-1deg); }
  40%, 60% { transform: translateX(6px) rotate(1deg); }
}

/* Damage Flash Transition */
.damage-flash-enter-active {
  animation: flash-in 0.1s ease-out;
}

.damage-flash-leave-active {
  animation: flash-out 0.3s ease-out;
}

@keyframes flash-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes flash-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

/* Damage Toast Transition */
.damage-toast-enter-active {
  animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.damage-toast-leave-active {
  animation: fade-out 0.3s ease-out;
}

@keyframes bounce-in {
  0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
  60% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; transform: translate(-50%, -40%) scale(0.9); }
}

/* Bounce in helper */
.animate-bounce-in {
  animation: bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
</style>
