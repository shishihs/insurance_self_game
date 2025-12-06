<script setup lang="ts">
import { ref, watch } from 'vue'
import { useGameStore } from '@/stores/gameStore'

const store = useGameStore()
const visible = ref(false)
const currentTopic = ref('')

const explainedTopics = ref(new Set<string>())

const explanations: Record<string, { title: string; content: string; icon: string }> = {
  dream_selection: {
    title: '夢を選ぼう',
    content: '人生の目標となる「夢」を選んでください。これは勝利条件となり、ゲーム中にボーナスをもたらします。自分のプレイスタイルに合ったものを選びましょう！',
    icon: '🌠'
  },
  draw: {
    title: 'ドローフェーズ',
    content: '手札を補充してターンを開始します。カードはあなたの生活スキル、リソース、経験を表します。これらを使って課題を克服しましょう！',
    icon: '🃏'
  },
  challenge_phase: { // v2 phase name
    title: '課題フェーズ',
    content: '人生は試練の連続です。立ち向かう課題を1つ選んでください。必要パワーと報酬を確認し、リスクを見極めましょう！',
    icon: '⚔️'
  },
  challenge_resolution: { // logic for resolving
    title: '課題の解決',
    content: '手札からカードを選んで、課題の必要パワーを満たしてください。活力（コスト）の使いすぎに注意！十分なパワーがあれば成功です！',
    icon: '💪'
  },
  insurance_phase: {
    title: '保険フェーズ',
    content: '保険は人生の不測の事態に備えるものです。活力を消費して保険に加入することで、守りとボーナスを得られます。将来のリスクを軽減しましょう。',
    icon: '🛡️'
  }
}

// Watch for phase changes to trigger tutorial
watch(() => store.currentPhase, (newPhase) => {
  if (!store.isTutorialMode) return
  
  let topic = ''
  if (newPhase === 'dream_selection') topic = 'dream_selection'
  else if (newPhase === 'draw') topic = 'draw'
  else if (newPhase === 'challenge_choice') topic = 'challenge_phase'
  else if (newPhase === 'challenge') topic = 'challenge_resolution'
  else if (newPhase === 'insurance') topic = 'insurance_phase'
  
  if (topic && !explainedTopics.value.has(topic)) {
    currentTopic.value = topic
    visible.value = true
  }
}, { immediate: true })

function dismiss() {
  visible.value = false
  if (currentTopic.value) {
    explainedTopics.value.add(currentTopic.value)
  }
}

function disableTutorial() {
  store.toggleTutorialMode()
  visible.value = false
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-4 opacity-0 scale-95"
    enter-to-class="transform translate-y-0 opacity-100 scale-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100 scale-100"
    leave-to-class="transform translate-y-4 opacity-0 scale-95"
  >
    <div 
      v-if="visible && store.isTutorialMode && explanations[currentTopic]" 
      class="fixed bottom-8 left-8 z-[1000] max-w-sm w-full"
    >
      <div class="relative bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <!-- Decoration -->
        <div class="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl"></div>
        
        <!-- Header -->
        <div class="relative flex items-center justify-between mb-3">
          <div class="flex items-center space-x-3">
            <span class="text-2xl">{{ explanations[currentTopic]?.icon }}</span>
            <h3 class="font-bold text-lg text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              {{ explanations[currentTopic]?.title }}
            </h3>
          </div>
          <button 
            @click="dismiss"
            class="text-slate-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <!-- Content -->
        <p class="relative text-slate-300 text-sm leading-relaxed mb-6">
          {{ explanations[currentTopic]?.content }}
        </p>

        <!-- Footer Actions -->
        <div class="relative flex justify-between items-center pt-4 border-t border-slate-700/50">
          <button 
            @click="disableTutorial"
            class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ヒントを表示しない
          </button>
          <button 
            @click="dismiss"
            class="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/20 transition-all transform hover:scale-105"
          >
            わかった
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
