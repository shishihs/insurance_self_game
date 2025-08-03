<template>
  <div class="game-statistics">
    <div class="settings-header">
      <h3 class="settings-title">ゲーム統計</h3>
      <p class="settings-description">
        あなたのプレイ履歴と成績を確認できます
      </p>
    </div>

    <div v-if="gameStore.game" class="statistics-content">
      <!-- プレイ統計サマリー -->
      <div class="stats-section">
        <h4 class="section-title">基本統計</h4>
        
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon">🎮</div>
            <div class="stat-info">
              <span class="stat-value">{{ gameStore.game.turn }}</span>
              <span class="stat-label">現在のターン</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">❤️</div>
            <div class="stat-info">
              <span class="stat-value">{{ gameStore.game.vitality }}</span>
              <span class="stat-label">現在の活力</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">🏆</div>
            <div class="stat-info">
              <span class="stat-value">{{ gameStore.game.stats.successfulChallenges }}</span>
              <span class="stat-label">成功したチャレンジ</span>
            </div>
          </div>
          
          <div class="stat-card">
            <div class="stat-icon">💔</div>
            <div class="stat-info">
              <span class="stat-value">{{ gameStore.game.stats.failedChallenges }}</span>
              <span class="stat-label">失敗したチャレンジ</span>
            </div>
          </div>
        </div>
      </div>

      <!-- チャレンジ統計 -->
      <div class="stats-section">
        <h4 class="section-title">チャレンジ成績</h4>
        
        <div class="challenge-stats">
          <div class="success-rate-card">
            <div class="rate-circle">
              <svg viewBox="0 0 100 100" class="rate-svg">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  stroke-width="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#4C6EF5"
                  stroke-width="8"
                  stroke-linecap="round"
                  :stroke-dasharray="successRateCircumference"
                  :stroke-dashoffset="successRateOffset"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div class="rate-text">
                <span class="rate-percentage">{{ successRate.toFixed(1) }}%</span>
                <span class="rate-label">成功率</span>
              </div>
            </div>
            
            <div class="rate-details">
              <div class="detail-item">
                <span class="detail-label">総チャレンジ数</span>
                <span class="detail-value">{{ totalChallenges }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">成功</span>
                <span class="detail-value success">{{ gameStore.game.stats.successfulChallenges }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">失敗</span>
                <span class="detail-value failure">{{ gameStore.game.stats.failedChallenges }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI統計（AIが有効な場合のみ） -->
      <div v-if="gameStore.game.isAIEnabled()" class="stats-section">
        <h4 class="section-title">AI戦略統計</h4>
        
        <div class="ai-stats">
          <div class="ai-stat-grid">
            <div class="ai-stat-card">
              <div class="ai-stat-header">
                <span class="ai-stat-icon">🤖</span>
                <span class="ai-stat-title">現在の戦略</span>
              </div>
              <span class="ai-stat-value">{{ getStrategyDisplayName(gameStore.game.getCurrentAIStrategy()) }}</span>
            </div>
            
            <div class="ai-stat-card">
              <div class="ai-stat-header">
                <span class="ai-stat-icon">🎯</span>
                <span class="ai-stat-title">AI意思決定</span>
              </div>
              <span class="ai-stat-value">{{ aiStatistics.totalDecisions }}回</span>
            </div>
            
            <div class="ai-stat-card">
              <div class="ai-stat-header">
                <span class="ai-stat-icon">📈</span>
                <span class="ai-stat-title">AI成功率</span>
              </div>
              <span class="ai-stat-value">{{ (aiStatistics.successRate * 100).toFixed(1) }}%</span>
            </div>
          </div>
          
          <div v-if="aiStatistics.strategyUsage.size > 0" class="strategy-usage">
            <h5 class="usage-title">戦略使用履歴</h5>
            <div class="usage-bars">
              <div
                v-for="[strategy, count] of aiStatistics.strategyUsage"
                :key="strategy"
                class="usage-bar"
              >
                <div class="usage-info">
                  <span class="usage-strategy">{{ strategy }}</span>
                  <span class="usage-count">{{ count }}回</span>
                </div>
                <div class="usage-progress">
                  <div
                    class="usage-fill"
                    :style="{ width: `${(count / Math.max(...Array.from(aiStatistics.strategyUsage.values()))) * 100}%` }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- カード統計 -->
      <div class="stats-section">
        <h4 class="section-title">カード統計</h4>
        
        <div class="card-stats">
          <div class="card-stat-item">
            <span class="card-stat-icon">🃏</span>
            <div class="card-stat-info">
              <span class="card-stat-value">{{ gameStore.game.cardManager.playerDeck.getHandCards().length }}</span>
              <span class="card-stat-label">手札枚数</span>
            </div>
          </div>
          
          <div class="card-stat-item">
            <span class="card-stat-icon">💼</span>
            <div class="card-stat-info">
              <span class="card-stat-value">{{ gameStore.game.cardManager.playerDeck.getTotalCards() }}</span>
              <span class="card-stat-label">総カード数</span>
            </div>
          </div>
          
          <div class="card-stat-item">
            <span class="card-stat-icon">🛡️</span>
            <div class="card-stat-info">
              <span class="card-stat-value">{{ gameStore.game.insuranceCards.length }}</span>
              <span class="card-stat-label">保険カード数</span>
            </div>
          </div>
          
          <div class="card-stat-item">
            <span class="card-stat-icon">🗑️</span>
            <div class="card-stat-info">
              <span class="card-stat-value">{{ gameStore.game.cardManager.playerDeck.getDiscardedCards().length }}</span>
              <span class="card-stat-label">捨て札枚数</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 詳細データエクスポート -->
      <div class="stats-section">
        <h4 class="section-title">データ管理</h4>
        
        <div class="data-management">
          <div class="data-actions">
            <button class="action-btn export-btn" @click="exportStatistics">
              <span class="btn-icon">📊</span>
              <span class="btn-text">統計データをエクスポート</span>
            </button>
            
            <button class="action-btn clear-btn" @click="confirmClearStats = true">
              <span class="btn-icon">🗑️</span>
              <span class="btn-text">統計データをクリア</span>
            </button>
          </div>
          
          <p class="data-note">
            エクスポートしたデータはJSON形式で保存されます。
            統計データのクリアは元に戻せません。
          </p>
        </div>
      </div>
    </div>

    <div v-else class="no-game-message">
      <div class="no-game-icon">🎮</div>
      <h4 class="no-game-title">ゲームが開始されていません</h4>
      <p class="no-game-text">
        ゲームを開始すると、ここに統計情報が表示されます
      </p>
    </div>

    <!-- 統計クリア確認モーダル -->
    <div v-if="confirmClearStats" class="modal-overlay" @click="confirmClearStats = false">
      <div class="modal-content" @click.stop>
        <h4 class="modal-title">統計データのクリア</h4>
        <p class="modal-message">
          すべての統計データを削除しますか？<br>
          この操作は元に戻せません。
        </p>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="confirmClearStats = false">
            キャンセル
          </button>
          <button class="btn btn-danger" @click="clearStatistics">
            削除実行
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useGameStore } from '../../stores/gameStore'
import type { AIStrategyType } from '../../domain/services/AIStrategyService'

const gameStore = useGameStore()

// リアクティブな状態
const confirmClearStats = ref(false)
const aiStatistics = ref({
  totalDecisions: 0,
  successRate: 0,
  strategyUsage: new Map<string, number>()
})

// 計算プロパティ
const totalChallenges = computed(() => {
  if (!gameStore.game) return 0
  return gameStore.game.stats.totalChallenges || 
         (gameStore.game.stats.successfulChallenges + gameStore.game.stats.failedChallenges)
})

const successRate = computed(() => {
  if (totalChallenges.value === 0) return 0
  return (gameStore.game!.stats.successfulChallenges / totalChallenges.value) * 100
})

const successRateCircumference = computed(() => {
  return 2 * Math.PI * 45 // r=45の円周
})

const successRateOffset = computed(() => {
  const percentage = successRate.value / 100
  return successRateCircumference.value * (1 - percentage)
})

// AI戦略の表示名を取得
function getStrategyDisplayName(type: AIStrategyType): string {
  const names: Record<AIStrategyType, string> = {
    conservative: '保守的戦略',
    aggressive: '攻撃的戦略',
    balanced: 'バランス戦略',
    adaptive: '適応戦略'
  }
  return names[type]
}

// AI統計を更新
function updateAIStatistics(): void {
  if (gameStore.game && gameStore.game.isAIEnabled()) {
    aiStatistics.value = gameStore.game.getAIStatistics()
  } else {
    aiStatistics.value = {
      totalDecisions: 0,
      successRate: 0,
      strategyUsage: new Map()
    }
  }
}

// 統計データをエクスポート
function exportStatistics(): void {
  if (!gameStore.game) return

  const exportData = {
    gameInfo: {
      turn: gameStore.game.turn,
      stage: gameStore.game.stage,
      vitality: gameStore.game.vitality,
      maxVitality: gameStore.game.maxVitality
    },
    basicStats: gameStore.game.stats,
    aiStats: gameStore.game.isAIEnabled() ? aiStatistics.value : null,
    cardStats: {
      handSize: gameStore.game.cardManager.playerDeck.getHandCards().length,
      totalCards: gameStore.game.cardManager.playerDeck.getTotalCards(),
      insuranceCards: gameStore.game.insuranceCards.length,
      discardedCards: gameStore.game.cardManager.playerDeck.getDiscardedCards().length
    },
    exportDate: new Date().toISOString()
  }

  // JSONファイルとしてダウンロード
  const dataStr = JSON.stringify(exportData, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  
  const link = document.createElement('a')
  link.href = URL.createObjectURL(dataBlob)
  link.download = `game-statistics-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  console.log('統計データをエクスポートしました')
}

// 統計データをクリア
function clearStatistics(): void {
  if (gameStore.game) {
    // ゲーム統計をリセット
    gameStore.game.stats = {
      totalChallenges: 0,
      successfulChallenges: 0,
      failedChallenges: 0,
      cardsAcquired: 0,
      highestVitality: gameStore.game.vitality
    }
    
    // AI統計をリセット
    if (gameStore.game.isAIEnabled()) {
      gameStore.game.resetAISettings()
    }
    
    // ローカルストレージからも削除
    localStorage.removeItem('gameStatistics')
    
    updateAIStatistics()
    console.log('統計データをクリアしました')
  }
  
  confirmClearStats.value = false
}

// 初期化
onMounted(() => {
  updateAIStatistics()
})

// ゲーム状態の変更を監視
gameStore.$subscribe(() => {
  updateAIStatistics()
})
</script>

<style scoped>
.game-statistics {
  max-width: 1000px;
  margin: 0 auto;
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

.stats-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.section-title {
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: bold;
  margin-bottom: 1rem;
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 0.5rem;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: rgba(76, 110, 245, 0.3);
  background: rgba(255, 255, 255, 0.08);
}

.stat-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  color: #4C6EF5;
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
}

.stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-top: 0.2rem;
}

.challenge-stats {
  display: flex;
  justify-content: center;
}

.success-rate-card {
  display: flex;
  align-items: center;
  gap: 2rem;
  max-width: 500px;
}

.rate-circle {
  position: relative;
  width: 150px;
  height: 150px;
}

.rate-svg {
  width: 100%;
  height: 100%;
}

.rate-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.rate-percentage {
  display: block;
  color: #4C6EF5;
  font-size: 2rem;
  font-weight: bold;
  line-height: 1;
}

.rate-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.rate-details {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
}

.detail-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.detail-value {
  color: #ffffff;
  font-weight: bold;
  font-size: 1.1rem;
}

.detail-value.success {
  color: #28a745;
}

.detail-value.failure {
  color: #dc3545;
}

.ai-stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.ai-stat-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.ai-stat-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.ai-stat-icon {
  font-size: 1.5rem;
}

.ai-stat-title {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
}

.ai-stat-value {
  color: #4C6EF5;
  font-size: 1.5rem;
  font-weight: bold;
}

.strategy-usage {
  margin-top: 1rem;
}

.usage-title {
  color: #ffffff;
  font-size: 1rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.usage-bars {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.usage-bar {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.usage-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.usage-strategy {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
}

.usage-count {
  color: #4C6EF5;
  font-weight: bold;
}

.usage-progress {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  background: linear-gradient(135deg, #4C6EF5 0%, #667eea 100%);
  transition: width 0.3s ease;
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.card-stat-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.card-stat-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.card-stat-info {
  display: flex;
  flex-direction: column;
}

.card-stat-value {
  color: #4C6EF5;
  font-size: 1.5rem;
  font-weight: bold;
  line-height: 1;
}

.card-stat-label {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.9rem;
  margin-top: 0.2rem;
}

.data-management {
  text-align: center;
}

.data-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-bottom: 1rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.export-btn:hover {
  background: linear-gradient(135deg, #218838 0%, #1fa187 100%);
  transform: translateY(-2px);
}

.clear-btn {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.clear-btn:hover {
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
  transform: translateY(-2px);
}

.data-note {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin: 0;
}

.no-game-message {
  text-align: center;
  padding: 4rem 2rem;
}

.no-game-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.no-game-title {
  color: #ffffff;
  font-size: 1.5rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.no-game-text {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin: 0;
}

/* モーダル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: rgba(26, 26, 46, 0.95);
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-title {
  color: #ffffff;
  font-size: 1.3rem;
  font-weight: bold;
  margin-bottom: 1rem;
}

.modal-message {
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  line-height: 1.5;
  margin-bottom: 2rem;
}

.modal-actions {
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
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-danger {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.btn-danger:hover {
  background: linear-gradient(135deg, #c82333 0%, #a71e2a 100%);
  transform: translateY(-2px);
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .success-rate-card {
    flex-direction: column;
    gap: 1rem;
  }
  
  .rate-circle {
    width: 120px;
    height: 120px;
  }
  
  .data-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .modal-actions {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .ai-stat-grid {
    grid-template-columns: 1fr;
  }
  
  .card-stats {
    grid-template-columns: 1fr;
  }
}
</style>