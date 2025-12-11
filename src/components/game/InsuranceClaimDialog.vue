<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/gameStore'
import type { Card } from '@/domain/entities/Card'

const store = useGameStore()

// 保険請求ダイアログの状態
const pendingClaim = computed(() => store.pendingInsuranceClaim)
const isVisible = computed(() => pendingClaim.value !== null)

// 保険タイプに応じたアイコン
function getInsuranceIcon(triggerType: string): string {
  switch (triggerType) {
    case 'on_death': return '💖'  // 生命保険
    case 'on_heavy_damage': return '🏥'  // 医療保険
    case 'on_aging_gameover': return '♿'  // 障害保険
    case 'on_demand': return '💼'  // 就業不能保険
    default: return '🛡️'
  }
}

// トリガータイプに応じた説明文
function getTriggerDescription(triggerType: string): string {
  switch (triggerType) {
    case 'on_death': 
      return '活力が0になりました。生命保険を請求すると、活力10で復活できます。'
    case 'on_heavy_damage': 
      return '大ダメージを受けます。医療保険を請求すると、ダメージを1に軽減できます。'
    case 'on_aging_gameover': 
      return '老化カードが3枚揃いました。障害保険を請求すると、手札を全て引き直せます。'
    case 'on_demand': 
      return '課題を回避できます。就業不能保険を請求すると、この課題をスキップできます。'
    default: 
      return '保険を請求できます。'
  }
}

// 保険を請求する
function claimInsurance() {
  store.claimInsurance()
}

// 保険を請求しない
function declineClaim() {
  store.declineInsuranceClaim()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="claim-dialog">
      <div 
        v-if="isVisible && pendingClaim" 
        class="fixed inset-0 bg-black/90 z-[150] flex items-center justify-center p-8 backdrop-blur-sm"
      >
        <div class="bg-gray-900 border-2 border-amber-500/50 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden animate-pulse-glow">
          <!-- Glow Effect -->
          <div class="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none"></div>
          
          <!-- Header -->
          <div class="relative z-10 text-center mb-6">
            <span class="text-6xl block mb-4 animate-bounce">
              {{ getInsuranceIcon(pendingClaim.triggerType) }}
            </span>
            <h2 class="text-2xl font-bold text-amber-300 mb-2">
              {{ pendingClaim.insurance.name }}を請求しますか？
            </h2>
            <p class="text-gray-400 text-sm">
              {{ getTriggerDescription(pendingClaim.triggerType) }}
            </p>
          </div>

          <!-- Insurance Card Preview -->
          <div class="relative z-10 bg-gray-800/80 rounded-xl p-4 mb-6 border border-gray-700">
            <div class="flex items-center justify-between">
              <div>
                <span class="text-amber-400 font-bold">{{ pendingClaim.insurance.name }}</span>
                <p class="text-xs text-gray-500">{{ pendingClaim.insurance.description }}</p>
              </div>
              <div class="text-right">
                <span class="text-xs text-gray-500">毎ターンコスト</span>
                <span class="block text-lg font-bold text-blue-400">{{ pendingClaim.insurance.cost }}</span>
              </div>
            </div>
          </div>

          <!-- Warning -->
          <div class="relative z-10 bg-red-900/30 border border-red-500/30 rounded-lg p-3 mb-6">
            <p class="text-red-300 text-sm text-center">
              ⚠️ 請求すると保険契約は終了します
            </p>
          </div>

          <!-- Buttons -->
          <div class="relative z-10 grid grid-cols-2 gap-4">
            <!-- 請求する -->
            <button 
              @click="claimInsurance"
              class="group relative overflow-hidden bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white rounded-xl font-bold shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <div class="px-6 py-4 flex items-center justify-center gap-2">
                <span class="text-xl">✅</span>
                <span class="text-lg">請求する</span>
              </div>
            </button>

            <!-- 請求しない -->
            <button 
              @click="declineClaim"
              class="group relative overflow-hidden bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-xl font-bold shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              <div class="px-6 py-4 flex items-center justify-center gap-2">
                <span class="text-xl">❌</span>
                <span class="text-lg">請求しない</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Dialog Transition */
.claim-dialog-enter-active {
  animation: dialog-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.claim-dialog-leave-active {
  animation: dialog-out 0.2s ease-out;
}

@keyframes dialog-in {
  0% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
}

@keyframes dialog-out {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.9); }
}

/* Pulse Glow Effect */
.animate-pulse-glow {
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(251, 191, 36, 0.3); }
  50% { box-shadow: 0 0 40px rgba(251, 191, 36, 0.5); }
}
</style>
