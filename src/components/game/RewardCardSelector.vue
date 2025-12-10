<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import type { Card } from '@/domain/entities/Card'

const store = useGameStore()

const choices = computed(() => store.rewardCardChoices)
const hasChoices = computed(() => choices.value && choices.value.length > 0)

function selectCard(card: Card) {
  store.selectRewardCard(card)
}

function skipReward() {
  store.skipRewardCard()
}

// カードからレアリティを取得
function getCardRarity(card: Card): string {
  // skillPropertiesがあればそこからrarity取得
  const skillProps = (card as any).skillProperties
  if (skillProps && skillProps.rarity) {
    return skillProps.rarity
  }
  return 'common'
}

// レアリティに応じた色を返す
function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return 'from-yellow-500 to-amber-600'
    case 'epic': return 'from-purple-500 to-pink-600'
    case 'rare': return 'from-blue-500 to-cyan-600'
    default: return 'from-gray-500 to-slate-600'
  }
}

function getRarityLabel(rarity: string): string {
  switch (rarity) {
    case 'legendary': return '伝説'
    case 'epic': return 'エピック'
    case 'rare': return 'レア'
    default: return 'コモン'
  }
}

function getRarityBorderColor(rarity: string): string {
  switch (rarity) {
    case 'legendary': return 'border-yellow-400 shadow-yellow-500/30'
    case 'epic': return 'border-purple-400 shadow-purple-500/30'
    case 'rare': return 'border-blue-400 shadow-blue-500/30'
    default: return 'border-gray-500 shadow-gray-500/20'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="hasChoices" 
        class="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8 backdrop-blur-sm"
      >
        <div class="bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-5xl w-full shadow-2xl relative overflow-hidden">
          <!-- Gradient Top Bar -->
          <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500"></div>
          
          <!-- Header -->
          <div class="mb-8">
            <div class="flex items-center gap-3 mb-2">
              <span class="text-4xl animate-bounce">🎁</span>
              <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                報酬カードを選択
              </h2>
            </div>
            <p class="text-gray-400">
              チャレンジ成功！以下のスキルカードから1枚を選んで獲得できます。
            </p>
          </div>

          <!-- Card Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div 
              v-for="card in choices" 
              :key="card.id"
              @click="selectCard(card)"
              class="group relative rounded-xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 border-2"
              :class="[
                getRarityBorderColor(getCardRarity(card)),
                'bg-gradient-to-br from-gray-800/80 to-gray-900/80',
                'hover:shadow-xl'
              ]"
            >
              <!-- Rarity Glow Effect -->
              <div 
                class="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity" 
                :class="['bg-gradient-to-br', getRarityColor(getCardRarity(card))]"
              ></div>
              
              <div class="relative z-10">
                <!-- Header Row -->
                <div class="flex items-center justify-between mb-4">
                  <span class="text-3xl">✨</span>
                  <span 
                    class="text-xs font-bold px-3 py-1 rounded-full text-white"
                    :class="['bg-gradient-to-r', getRarityColor(getCardRarity(card))]"
                  >
                    {{ getRarityLabel(getCardRarity(card)) }}
                  </span>
                </div>
                
                <!-- Card Name -->
                <h3 class="font-bold text-xl text-white mb-2 group-hover:text-emerald-300 transition-colors">
                  {{ card.name }}
                </h3>
                
                <!-- Description -->
                <p class="text-sm text-gray-400 mb-4 min-h-[40px] leading-relaxed">
                  {{ card.description }}
                </p>
                
                <!-- Stats -->
                <div class="flex items-center justify-between pt-4 border-t border-gray-700/50">
                  <div class="flex items-center gap-2">
                    <span class="text-yellow-400">⚡</span>
                    <span class="text-lg font-bold text-yellow-300">{{ card.power }}</span>
                    <span class="text-xs text-gray-500">パワー</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-blue-400">💧</span>
                    <span class="text-lg font-bold text-blue-300">{{ card.cost }}</span>
                    <span class="text-xs text-gray-500">コスト</span>
                  </div>
                </div>
                
                <!-- Select Indicator -->
                <div class="mt-4 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span class="text-sm text-emerald-400 font-semibold">
                    クリックして選択 →
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Skip Button -->
          <div class="text-center">
            <button 
              @click="skipReward"
              class="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
            >
              スキップする（報酬を受け取らない）
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
