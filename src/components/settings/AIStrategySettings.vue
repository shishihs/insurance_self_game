<template>
  <div class="ai-strategy-settings">
    <div class="settings-header">
      <h3 class="settings-title">AI戦略設定</h3>
      <p class="settings-description">
        AIによる自動プレイの戦略を設定できます
      </p>
    </div>

    <div class="ai-toggle-section">
      <div class="toggle-group">
        <label class="toggle-label">
          <input
            type="checkbox"
            v-model="aiEnabled"
            @change="updateAIEnabled"
            class="toggle-checkbox"
          />
          <span class="toggle-slider"></span>
          <span class="toggle-text">AI自動プレイを有効にする</span>
        </label>
      </div>
    </div>

    <div v-if="aiEnabled" class="strategy-selection-section">
      <h4 class="section-title">戦略タイプ</h4>
      
      <div class="strategy-grid">
        <div
          v-for="strategyType in availableStrategies"
          :key="strategyType"
          :class="[
            'strategy-card',
            { 'selected': currentStrategy === strategyType }
          ]"
          @click="selectStrategy(strategyType)"
        >
          <div class="strategy-header">
            <div class="strategy-icon">{{ getStrategyIcon(strategyType) }}</div>
            <h5 class="strategy-name">{{ getStrategyDisplayName(strategyType) }}</h5>
          </div>
          
          <p class="strategy-description">
            {{ getStrategyDescription(strategyType) }}
          </p>
          
          <div class="strategy-features">
            <span
              v-for="feature in getStrategyFeatures(strategyType)"
              :key="feature"
              class="feature-tag"
            >
              {{ feature }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="aiEnabled" class="statistics-section">
      <h4 class="section-title">AI統計情報</h4>
      
      <div v-if="statistics.totalDecisions > 0" class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">総意思決定回数</span>
          <span class="stat-value">{{ statistics.totalDecisions }}</span>
        </div>
        
        <div class="stat-item">
          <span class="stat-label">成功率</span>
          <span class="stat-value">{{ (statistics.successRate * 100).toFixed(1) }}%</span>
        </div>
        
        <div class="stat-item strategy-usage">
          <span class="stat-label">戦略使用履歴</span>
          <div class="usage-list">
            <div
              v-for="[strategy, count] of statistics.strategyUsage"
              :key="strategy"
              class="usage-item"
            >
              <span class="usage-strategy">{{ strategy }}</span>
              <span class="usage-count">{{ count }}回</span>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="no-stats">
        まだ統計データがありません
      </div>

      <div class="action-buttons">
        <button
          class="btn btn-secondary"
          @click="clearStatistics"
          :disabled="statistics.totalDecisions === 0"
        >
          統計をクリア
        </button>
        
        <button
          class="btn btn-primary"
          @click="testAIStrategy"
          :disabled="!aiEnabled"
        >
          戦略をテスト
        </button>
      </div>
    </div>

    <div v-if="aiEnabled" class="quick-actions">
      <h4 class="section-title">クイックアクション</h4>
      
      <div class="action-grid">
        <button
          class="action-button"
          @click="aiAutoPlay"
          :disabled="!canAutoPlay"
          title="現在のターンでAIに自動プレイさせる"
        >
          <span class="action-icon">🎮</span>
          <span class="action-text">1ターン自動プレイ</span>
        </button>
        
        <button
          class="action-button"
          @click="aiSelectChallenge"
          :disabled="!canSelectChallenge"
          title="AIにチャレンジを選択させる"
        >
          <span class="action-icon">🎯</span>
          <span class="action-text">チャレンジ選択</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import type { AIStrategyType } from '../../domain/services/AIStrategyService'
import { AIStrategyFactory } from '../../domain/services/AIStrategyService'

const gameStore = useGameStore()

// リアクティブな状態
const aiEnabled = ref(false)
const currentStrategy = ref<AIStrategyType>('balanced')
const statistics = ref({
  totalDecisions: 0,
  successRate: 0,
  strategyUsage: new Map<string, number>()
})

// 利用可能な戦略
const availableStrategies = computed(() => AIStrategyFactory.getAvailableTypes())

// ゲーム状態に基づく計算プロパティ
const canAutoPlay = computed(() => {
  return gameStore.game && 
         gameStore.game.phase === 'draw' && 
         gameStore.game.isInProgress()
})

const canSelectChallenge = computed(() => {
  return gameStore.game && 
         gameStore.game.phase === 'draw' && 
         gameStore.game.isInProgress()
})

// 戦略の表示名を取得
function getStrategyDisplayName(type: AIStrategyType): string {
  const names: Record<AIStrategyType, string> = {
    conservative: '保守的戦略',
    aggressive: '攻撃的戦略',
    balanced: 'バランス戦略',
    adaptive: '適応戦略'
  }
  return names[type]
}

// 戦略のアイコンを取得
function getStrategyIcon(type: AIStrategyType): string {
  const icons: Record<AIStrategyType, string> = {
    conservative: '🛡️',
    aggressive: '⚔️',
    balanced: '⚖️',
    adaptive: '🧠'
  }
  return icons[type]
}

// 戦略の説明を取得
function getStrategyDescription(type: AIStrategyType): string {
  return AIStrategyFactory.getStrategyDescription(type)
}

// 戦略の特徴を取得
function getStrategyFeatures(type: AIStrategyType): string[] {
  const features: Record<AIStrategyType, string[]> = {
    conservative: ['低リスク', '安全性重視', '保険活用'],
    aggressive: ['高リターン', '効率重視', 'リスク承知'],
    balanced: ['バランス型', '安定判断', '万能対応'],
    adaptive: ['状況適応', '高度戦略', '学習機能']
  }
  return features[type]
}

// AI有効/無効の更新
function updateAIEnabled(): void {
  if (!gameStore.game) return
  
  gameStore.game.setAIEnabled(aiEnabled.value)
  updateStatistics()
}

// 戦略選択
function selectStrategy(type: AIStrategyType): void {
  if (!gameStore.game) return
  
  currentStrategy.value = type
  gameStore.game.setAIStrategy(type)
  updateStatistics()
}

// 統計情報の更新
function updateStatistics(): void {
  if (!gameStore.game || !gameStore.game.isAIEnabled()) {
    statistics.value = {
      totalDecisions: 0,
      successRate: 0,
      strategyUsage: new Map()
    }
    return
  }
  
  const stats = gameStore.game.getAIStatistics()
  statistics.value = stats
}

// 統計クリア
function clearStatistics(): void {
  if (!gameStore.game) return
  
  gameStore.game.resetAISettings()
  updateStatistics()
}

// 戦略テスト
function testAIStrategy(): void {
  if (!gameStore.game || !canAutoPlay.value) return
  
  try {
    const result = gameStore.game.aiAutoPlay()
    if (result) {
      const message = result.success ? 
        `テスト成功! 活力変化: +${result.vitalityChange}` :
        `テスト失敗... 活力変化: ${result.vitalityChange}`
      
      console.log(`AI戦略テスト結果: ${message}`)
      // 必要に応じてトーストなどで通知
    }
    updateStatistics()
  } catch (error) {
    console.error('AI戦略テストエラー:', error)
  }
}

// AI自動プレイ
function aiAutoPlay(): void {
  testAIStrategy()
}

// AIチャレンジ選択
function aiSelectChallenge(): void {
  if (!gameStore.game) return
  
  try {
    const challenge = gameStore.game.aiSelectChallenge()
    if (challenge) {
      console.log(`AIがチャレンジを選択しました: ${challenge.name}`)
      // ゲームシーンに選択結果を通知する処理があれば追加
    }
  } catch (error) {
    console.error('AIチャレンジ選択エラー:', error)
  }
}

// 初期化
onMounted(() => {
  if (gameStore.game) {
    aiEnabled.value = gameStore.game.isAIEnabled()
    currentStrategy.value = gameStore.game.getCurrentAIStrategy()
    updateStatistics()
  }
})

// ゲーム変更の監視
gameStore.$subscribe((mutation, state) => {
  if (state.game) {
    aiEnabled.value = state.game.isAIEnabled()
    currentStrategy.value = state.game.getCurrentAIStrategy()
    updateStatistics()
  }
})
</script>

<style scoped>
.ai-strategy-settings {
  max-width: 800px;
  margin: 0 auto;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.settings-header {
  text-align: center;
  margin-bottom: 2rem;
}

.settings-title {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.settings-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin: 0;
}

.ai-toggle-section {
  margin-bottom: 2rem;
}

.toggle-group {
  display: flex;
  justify-content: center;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  font-weight: 500;
  color: #ffffff;
}

.toggle-checkbox {
  display: none;
}

.toggle-slider {
  position: relative;
  width: 60px;
  height: 30px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 15px;
  transition: all 0.3s ease;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 24px;
  height: 24px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
}

.toggle-checkbox:checked + .toggle-slider {
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(30px);
}

.section-title {
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;
}

.strategy-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.strategy-card {
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.strategy-card:hover {
  border-color: rgba(76, 110, 245, 0.5);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.strategy-card.selected {
  border-color: #4C6EF5;
  background: rgba(76, 110, 245, 0.1);
}

.strategy-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.strategy-icon {
  font-size: 2rem;
}

.strategy-name {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: bold;
  margin: 0;
}

.strategy-description {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  line-height: 1.4;
  margin-bottom: 1rem;
}

.strategy-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-tag {
  background: rgba(76, 110, 245, 0.2);
  color: #ffffff;
  font-size: 0.8rem;
  padding: 0.3rem 0.8rem;
  border-radius: 16px;
  border: 1px solid rgba(76, 110, 245, 0.3);
}

.statistics-section {
  margin-bottom: 2rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1rem;
}

.stat-label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.stat-value {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: bold;
}

.strategy-usage .usage-list {
  margin-top: 0.5rem;
}

.usage-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
}

.usage-count {
  color: #4C6EF5;
  font-weight: bold;
}

.no-stats {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  padding: 2rem;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b5bdb 0%, #5a67d8 100%);
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.quick-actions {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 2rem;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-button:hover:not(:disabled) {
  border-color: rgba(76, 110, 245, 0.5);
  background: rgba(255, 255, 255, 0.08);
  transform: translateY(-2px);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.action-icon {
  font-size: 2rem;
}

.action-text {
  font-weight: 600;
  text-align: center;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .ai-strategy-settings {
    padding: 1rem;
  }
  
  .strategy-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .action-buttons {
    flex-direction: column;
  }
  
  .action-grid {
    grid-template-columns: 1fr;
  }
}
</style>