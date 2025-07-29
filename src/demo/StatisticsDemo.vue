<template>
  <div class="demo-container">
    <h1>統計機能デモ</h1>
    
    <div class="demo-controls">
      <button @click="generateSampleData" class="btn btn-primary">
        サンプルデータ生成
      </button>
      <button @click="clearData" class="btn btn-secondary">
        データクリア
      </button>
      <button @click="showDashboard = !showDashboard" class="btn btn-secondary">
        {{ showDashboard ? 'ダッシュボードを閉じる' : 'ダッシュボードを開く' }}
      </button>
    </div>
    
    <div class="demo-info">
      <p>現在のデータ数: {{ dataCount }}ゲーム</p>
      <p>統計サービス状態: {{ statisticsService ? '初期化済み' : '未初期化' }}</p>
    </div>
    
    <!-- 統計ダッシュボード -->
    <div v-if="showDashboard" class="demo-dashboard">
      <StatisticsDashboard 
        :auto-refresh="false"
        @close="showDashboard = false"
      />
    </div>
    
    <!-- 個別チャートのテスト -->
    <div class="demo-charts">
      <h2>個別チャートテスト</h2>
      
      <div class="chart-grid">
        <div class="chart-item">
          <GameProgressChart :data="gameProgressData" />
        </div>
        
        <div class="chart-item">
          <SuccessRateChart :data="successRateData" />
        </div>
        
        <div class="chart-item">
          <VitalityTrendChart :data="vitalityTrendData" />
        </div>
        
        <div class="chart-item">
          <CardUsageChart :data="cardUsageData" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { StatisticsDataService } from '../domain/services/StatisticsDataService'
import { Game } from '../domain/entities/Game'
import StatisticsDashboard from '../components/statistics/StatisticsDashboard.vue'
import GameProgressChart from '../components/statistics/charts/GameProgressChart.vue'
import SuccessRateChart from '../components/statistics/charts/SuccessRateChart.vue'
import VitalityTrendChart from '../components/statistics/charts/VitalityTrendChart.vue'
import CardUsageChart from '../components/statistics/charts/CardUsageChart.vue'

const statisticsService = StatisticsDataService.getInstance()
const showDashboard = ref(false)
const dataCount = ref(0)

// サンプルデータ
const gameProgressData = ref([
  { date: '2024-01-01', gamesPlayed: 3, averageScore: 1500, totalPlayTime: 180000 },
  { date: '2024-01-02', gamesPlayed: 5, averageScore: 1800, totalPlayTime: 300000 },
  { date: '2024-01-03', gamesPlayed: 2, averageScore: 2200, totalPlayTime: 120000 },
  { date: '2024-01-04', gamesPlayed: 4, averageScore: 1900, totalPlayTime: 240000 },
  { date: '2024-01-05', gamesPlayed: 6, averageScore: 2100, totalPlayTime: 360000 }
])

const successRateData = ref({
  youth: 0.75,
  middle: 0.65,
  fulfillment: 0.55
})

const vitalityTrendData = ref([
  { turn: 1, vitality: 100 },
  { turn: 2, vitality: 95 },
  { turn: 3, vitality: 88 },
  { turn: 4, vitality: 92 },
  { turn: 5, vitality: 85 },
  { turn: 6, vitality: 90 },
  { turn: 7, vitality: 75 },
  { turn: 8, vitality: 80 },
  { turn: 9, vitality: 70 },
  { turn: 10, vitality: 65 }
])

const cardUsageData = ref({
  life: 45,
  insurance: 32,
  challenge: 28,
  dream: 15,
  action: 22
})

// サンプルデータ生成
const generateSampleData = () => {
  console.log('サンプルデータを生成中...')
  
  // 複数のサンプルゲームを作成
  for (let i = 0; i < 10; i++) {
    const game = new Game({
      difficulty: 'normal',
      startingVitality: 100,
      startingHandSize: 5,
      maxHandSize: 10,
      dreamCardCount: 3
    })
    
    // ゲーム開始
    game.start()
    
    // サンプルゲームプレイをシミュレート
    simulateGameplay(game)
    
    // 統計サービスに記録
    statisticsService.startGameTracking(game)
    
    // いくつかのターンをシミュレート
    for (let turn = 0; turn < Math.floor(Math.random() * 10) + 5; turn++) {
      const decisionTime = Math.random() * 15 + 2 // 2-17秒
      statisticsService.updateTurnData(game, decisionTime)
    }
    
    // ゲーム終了
    const isVictory = Math.random() > 0.4 // 60%の勝率
    if (isVictory) {
      (game as any).status = 'victory'
    } else {
      (game as any).status = 'game_over'
    }
    
    statisticsService.finishGameTracking(game)
  }
  
  dataCount.value += 10
  console.log('サンプルデータ生成完了')
}

// ゲームプレイシミュレーション
const simulateGameplay = (game: Game) => {
  // 基本統計を設定
  game.stats.totalChallenges = Math.floor(Math.random() * 20) + 10
  game.stats.successfulChallenges = Math.floor(game.stats.totalChallenges * (Math.random() * 0.4 + 0.4))
  game.stats.failedChallenges = game.stats.totalChallenges - game.stats.successfulChallenges
  game.stats.cardsAcquired = Math.floor(Math.random() * 15) + 5
  game.stats.turnsPlayed = Math.floor(Math.random() * 15) + 10
  
  // 活力値をランダムに設定
  const finalVitality = Math.floor(Math.random() * 80) + 20
  ;(game as any)._vitality = {
    getValue: () => finalVitality,
    getMax: () => 100,
    isDepleted: () => finalVitality <= 0
  }
  
  // ステージをランダムに設定
  const stages = ['youth', 'middle', 'fulfillment']
  ;(game as any).stage = stages[Math.floor(Math.random() * stages.length)]
  
  // 保険カードをいくつか追加
  const insuranceCount = Math.floor(Math.random() * 5)
  const sampleInsuranceCards = []
  for (let i = 0; i < insuranceCount; i++) {
    sampleInsuranceCards.push({
      id: `insurance_${i}`,
      name: `保険カード${i + 1}`,
      type: 'insurance',
      power: Math.floor(Math.random() * 10) + 1
    })
  }
  ;(game as any).insuranceCards = sampleInsuranceCards
  
  // 保険料負担を設定
  ;(game as any)._insuranceBurden = {
    getValue: () => insuranceCount * 5
  }
  
  // 開始・終了時刻を設定
  const now = new Date()
  const startTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000) // 過去1週間内
  const playDuration = Math.random() * 60 * 60 * 1000 + 10 * 60 * 1000 // 10分-70分
  
  ;(game as any).startedAt = startTime
  ;(game as any).completedAt = new Date(startTime.getTime() + playDuration)
}

// データクリア
const clearData = () => {
  console.log('データをクリアしています...')
  // 実際の実装では統計サービスのクリアメソッドを呼び出す
  // statisticsService.clearData()
  dataCount.value = 0
  console.log('データクリア完了')
}

onMounted(() => {
  console.log('統計デモページが初期化されました')
})
</script>

<style scoped>
.demo-container {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  min-height: 100vh;
}

h1 {
  color: #4c6ef5;
  margin-bottom: 2rem;
  text-align: center;
}

h2 {
  color: #22c55e;
  margin: 2rem 0 1rem 0;
}

.demo-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #4c6ef5;
  color: white;
}

.btn-primary:hover {
  background: #3b5bdb;
  transform: translateY(-2px);
}

.btn-secondary {
  background: #64748b;
  color: white;
}

.btn-secondary:hover {
  background: #475569;
  transform: translateY(-2px);
}

.demo-info {
  background: rgba(255, 255, 255, 0.1);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid rgba(76, 110, 245, 0.3);
}

.demo-dashboard {
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  margin-bottom: 2rem;
  border: 1px solid rgba(76, 110, 245, 0.3);
  height: 600px;
  overflow: hidden;
}

.demo-charts {
  margin-top: 2rem;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  margin-top: 1rem;
}

.chart-item {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(76, 110, 245, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  height: 350px;
}

@media (max-width: 640px) {
  .chart-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }
  
  .chart-item {
    height: 300px;
    padding: 1rem;
  }
  
  .demo-controls {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
}
</style>