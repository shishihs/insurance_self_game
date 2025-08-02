<template>
  <div class="statistics-dashboard">
    <!-- ヘッダー -->
    <div class="dashboard-header">
      <h2 class="dashboard-title">
        <span class="icon">📊</span>
        プレイヤー統計ダッシュボード
      </h2>
      <div class="header-controls">
        <button class="refresh-btn" :disabled="loading" @click="refreshData">
          <span class="icon">🔄</span>
          {{ loading ? '更新中...' : '更新' }}
        </button>
        <button class="export-btn" @click="exportData">
          <span class="icon">💾</span>
          エクスポート
        </button>
        <button class="close-btn" @click="$emit('close')">
          <span class="icon">✕</span>
        </button>
      </div>
    </div>

    <!-- フィルターコントロール -->
    <div v-if="showFilters" class="filter-section">
      <div class="filter-row">
        <div class="filter-group">
          <label>期間</label>
          <select v-model="filters.dateRange" @change="applyFilters">
            <option value="all">全期間</option>
            <option value="week">過去1週間</option>
            <option value="month">過去1ヶ月</option>
            <option value="quarter">過去3ヶ月</option>
          </select>
        </div>
        <div class="filter-group">
          <label>ゲームステータス</label>
          <select v-model="filters.gameStatus" @change="applyFilters">
            <option value="all">すべて</option>
            <option value="victory">勝利</option>
            <option value="game_over">ゲームオーバー</option>
            <option value="in_progress">進行中</option>
          </select>
        </div>
        <div class="filter-group">
          <label>ステージ</label>
          <select v-model="filters.stage" @change="applyFilters">
            <option value="all">すべて</option>
            <option value="youth">青年期</option>
            <option value="middle">中年期</option>
            <option value="fulfillment">充実期</option>
          </select>
        </div>
      </div>
    </div>

    <!-- タブナビゲーション -->
    <div class="tab-navigation">
      <button 
        v-for="tab in tabs" 
        :key="tab.key"
        :class="['tab-button', { active: activeTab === tab.key }]"
        @click="activeTab = tab.key"
      >
        <span class="icon">{{ tab.icon }}</span>
        {{ tab.label }}
      </button>
    </div>

    <!-- メインコンテンツ -->
    <div v-if="!loading" class="dashboard-content">
      <!-- 概要タブ -->
      <div v-if="activeTab === 'overview'" class="tab-content">
        <div class="stats-grid">
          <StatsSummaryCard 
            title="基本統計"
            :stats="basicStats"
            icon="🎮"
          />
          <StatsSummaryCard 
            title="パフォーマンス"
            :stats="performanceStats"
            icon="⚡"
          />
          <StatsSummaryCard 
            title="プレイ時間"
            :stats="timeStats"
            icon="⏱️"
          />
          <StatsSummaryCard 
            title="保険統計"
            :stats="insuranceStats"
            icon="🛡️"
          />
        </div>

        <!-- 主要チャート -->
        <div class="main-charts">
          <div class="chart-container">
            <GameProgressChart :data="progressChartData" />
          </div>
          <div class="chart-container">
            <SuccessRateChart :data="successRateData" />
          </div>
        </div>
      </div>

      <!-- 詳細分析タブ -->
      <div v-if="activeTab === 'detailed'" class="tab-content">
        <div class="detailed-charts">
          <div class="chart-row">
            <div class="chart-container half">
              <VitalityTrendChart :data="vitalityTrendData" />
            </div>
            <div class="chart-container half">
              <StageAnalysisChart :data="stageAnalysisData" />
            </div>
          </div>
          <div class="chart-row">
            <div class="chart-container full">
              <CardUsageChart :data="cardUsageData" />
            </div>
          </div>
        </div>
      </div>

      <!-- 戦略パターンタブ -->
      <div v-if="activeTab === 'patterns'" class="tab-content">
        <div class="patterns-section">
          <StrategyPatternsChart :data="strategyPatternsData" />
          <DecisionAnalysisChart :data="decisionAnalysisData" />
        </div>
      </div>

      <!-- リアルタイムタブ -->
      <div v-if="activeTab === 'realtime'" class="tab-content">
        <div v-if="realtimeData" class="realtime-section">
          <div class="realtime-header">
            <h3>現在のセッション</h3>
            <div class="session-info">
              <span>開始時刻: {{ formatTime(realtimeData.currentSession.startTime) }}</span>
              <span>プレイ済みゲーム: {{ realtimeData.currentSession.gamesPlayed }}</span>
              <span>連続記録: {{ realtimeData.currentSession.currentStreak }}</span>
            </div>
          </div>
          <div class="realtime-charts">
            <LiveVitalityChart :data="realtimeData.live.vitalityOverTime" />
            <DecisionTimeChart :data="realtimeData.live.decisionTimes" />
          </div>
        </div>
        <div v-else class="no-session">
          <p>現在アクティブなゲームセッションがありません</p>
        </div>
      </div>
    </div>

    <!-- ローディング表示 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner">
        <span class="icon">⏳</span>
        <p>統計データを読み込み中...</p>
      </div>
    </div>

    <!-- エラー表示 -->
    <div v-if="error" class="error-message">
      <span class="icon">⚠️</span>
      <p>{{ error }}</p>
      <button @click="retryLoad">再試行</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { type RealtimeStatistics, type StatisticsData, StatisticsDataService, type StatisticsFilter } from '../../domain/services/StatisticsDataService'

// コンポーネントのインポート
import StatsSummaryCard from './StatsSummaryCard.vue'
import GameProgressChart from './charts/GameProgressChart.vue'
import SuccessRateChart from './charts/SuccessRateChart.vue'
import VitalityTrendChart from './charts/VitalityTrendChart.vue'
import StageAnalysisChart from './charts/StageAnalysisChart.vue'
import CardUsageChart from './charts/CardUsageChart.vue'
import StrategyPatternsChart from './charts/StrategyPatternsChart.vue'
import DecisionAnalysisChart from './charts/DecisionAnalysisChart.vue'
import LiveVitalityChart from './charts/LiveVitalityChart.vue'
import DecisionTimeChart from './charts/DecisionTimeChart.vue'

// Props
interface Props {
  autoRefresh?: boolean
  refreshInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoRefresh: true,
  refreshInterval: 30000 // 30秒
})

// Emits
const emit = defineEmits<{
  close: []
  dataUpdated: [data: StatisticsData]
}>()

// リアクティブデータ
const statisticsService = StatisticsDataService.getInstance()
const loading = ref(false)
const error = ref('')
const statisticsData = ref<StatisticsData | null>(null)
const realtimeData = ref<RealtimeStatistics | null>(null)
const activeTab = ref('overview')
const showFilters = ref(false)

// フィルター設定
const filters = ref({
  dateRange: 'all',
  gameStatus: 'all',
  stage: 'all'
})

// タブ設定
const tabs = [
  { key: 'overview', label: '概要', icon: '📊' },
  { key: 'detailed', label: '詳細分析', icon: '🔍' },
  { key: 'patterns', label: '戦略パターン', icon: '🧭' },
  { key: 'realtime', label: 'リアルタイム', icon: '📈' }
]

// 自動更新のインターバル
let refreshTimer: number | null = null
let unsubscribe: (() => void) | null = null

// 計算されたプロパティ
const basicStats = computed(() => {
  if (!statisticsData.value) return []
  const data = statisticsData.value
  return [
    { label: '総ゲーム数', value: data.totalGames.toString(), trend: '+' },
    { label: '完了ゲーム数', value: data.completedGames.toString(), trend: '+' },
    { label: '勝利ゲーム数', value: data.victoryGames.toString(), trend: '+' },
    { label: '勝利率', value: `${((data.victoryGames / Math.max(data.completedGames, 1)) * 100).toFixed(1)}%`, trend: '=' }
  ]
})

const performanceStats = computed(() => {
  if (!statisticsData.value) return []
  const data = statisticsData.value
  return [
    { label: 'チャレンジ成功率', value: `${data.challengeSuccessRate.toFixed(1)}%`, trend: data.recentTrends.performanceImprovement > 0 ? '↗' : '↘' },
    { label: '平均活力', value: data.averageVitality.toFixed(1), trend: '=' },
    { label: '最高活力', value: data.highestVitality.toString(), trend: '+' },
    { label: '平均ターン数', value: data.averageTurnsPerGame.toFixed(1), trend: '=' }
  ]
})

const timeStats = computed(() => {
  if (!statisticsData.value) return []
  const data = statisticsData.value
  return [
    { label: '総プレイ時間', value: formatDuration(data.totalPlayTime), trend: '+' },
    { label: '平均ゲーム時間', value: formatDuration(data.averageGameDuration), trend: data.recentTrends.playTimeIncrease > 0 ? '↗' : '↘' },
    { label: '今日のプレイ', value: getTodayPlayTime(), trend: '=' },
    { label: '連続プレイ記録', value: getCurrentStreak(), trend: '+' }
  ]
})

const insuranceStats = computed(() => {
  if (!statisticsData.value) return []
  const data = statisticsData.value
  return [
    { label: '保険購入回数', value: data.totalInsurancePurchases.toString(), trend: '+' },
    { label: '平均保険負担', value: data.averageInsuranceBurden.toFixed(1), trend: '=' },
    { label: '保険効果', value: `${data.insuranceEffectiveness.toFixed(1)}%`, trend: data.insuranceEffectiveness > 0 ? '↗' : '↘' },
    { label: '人気保険', value: getMostPopularInsurance(), trend: '=' }
  ]
})

const progressChartData = computed(() => {
  return statisticsData.value?.gameHistoryByDate || []
})

const successRateData = computed(() => {
  if (!statisticsData.value) return {}
  return statisticsData.value.stageSuccessRates
})

const vitalityTrendData = computed(() => {
  return realtimeData.value?.live.vitalityOverTime || []
})

const stageAnalysisData = computed(() => {
  if (!statisticsData.value) return {}
  return statisticsData.value.stageReachCounts
})

const cardUsageData = computed(() => {
  if (!statisticsData.value) return {}
  return statisticsData.value.cardTypeUsage
})

const strategyPatternsData = computed(() => {
  return statisticsData.value?.decisionPatterns || []
})

const decisionAnalysisData = computed(() => {
  return realtimeData.value?.live.decisionTimes || []
})

// メソッド
const refreshData = async () => {
  loading.value = true
  error.value = ''
  
  try {
    // 統計データを取得
    const filters = createFilterFromUI()
    statisticsData.value = statisticsService.generateStatistics(filters)
    
    // リアルタイムデータを取得
    realtimeData.value = statisticsService.getRealtimeStatistics()
    
    emit('dataUpdated', statisticsData.value)
  } catch (err) {
    error.value = `データの読み込みに失敗しました: ${err}`
  } finally {
    loading.value = false
  }
}

const applyFilters = () => {
  refreshData()
}

const exportData = () => {
  try {
    const jsonData = statisticsService.exportData('json')
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `game-statistics-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    error.value = `エクスポートに失敗しました: ${err}`
  }
}

const retryLoad = () => {
  refreshData()
}

const createFilterFromUI = (): StatisticsFilter => {
  const filter: StatisticsFilter = {}
  
  if (filters.value.dateRange !== 'all') {
    const now = new Date()
    const start = new Date()
    
    switch (filters.value.dateRange) {
      case 'week':
        start.setDate(now.getDate() - 7)
        break
      case 'month':
        start.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        start.setMonth(now.getMonth() - 3)
        break
    }
    
    filter.dateRange = { start, end: now }
  }
  
  if (filters.value.gameStatus !== 'all') {
    filter.gameStatus = [filters.value.gameStatus as any]
  }
  
  if (filters.value.stage !== 'all') {
    filter.stages = [filters.value.stage as any]
  }
  
  return filter
}

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}時間${minutes % 60}分`
  } if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`
  } 
    return `${seconds}秒`
  
}

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('ja-JP')
}

const getTodayPlayTime = (): string => {
  // 簡易実装: 今日のプレイ時間を計算
  if (!statisticsData.value) return '0分'
  
  const today = new Date().toISOString().split('T')[0]
  const todayData = statisticsData.value.gameHistoryByDate.find(d => d.date === today)
  
  return todayData ? formatDuration(todayData.totalPlayTime) : '0分'
}

const getCurrentStreak = (): string => {
  if (realtimeData.value) {
    return `${realtimeData.value.currentSession.currentStreak}勝`
  }
  return '0勝'
}

const getMostPopularInsurance = (): string => {
  if (!statisticsData.value) return '-'
  
  const usage = statisticsData.value.insuranceTypeUsage
  const entries = Object.entries(usage)
  
  if (entries.length === 0) return '-'
  
  const most = entries.reduce((a, b) => a[1] > b[1] ? a : b)
  return most[0]
}

// 自動更新の設定
const setupAutoRefresh = () => {
  if (props.autoRefresh && !refreshTimer) {
    refreshTimer = window.setInterval(refreshData, props.refreshInterval)
  }
}

const clearAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}

// ライフサイクルフック
onMounted(() => {
  refreshData()
  setupAutoRefresh()
  
  // データ変更の購読
  unsubscribe = statisticsService.subscribe((data) => {
    statisticsData.value = data
    emit('dataUpdated', data)
  })
})

onUnmounted(() => {
  clearAutoRefresh()
  if (unsubscribe) {
    unsubscribe()
  }
})

// フィルター変更の監視  
watch(() => filters.value, () => {
  applyFilters()
}, { deep: true })
</script>

<style scoped>
.statistics-dashboard {
  @apply w-full h-full bg-gray-900 text-white overflow-hidden flex flex-col;
}

.dashboard-header {
  @apply flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700;
}

.dashboard-title {
  @apply text-2xl font-bold flex items-center gap-2;
}

.header-controls {
  @apply flex gap-2;
}

.refresh-btn, .export-btn, .close-btn {
  @apply px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors flex items-center gap-1;
}

.close-btn {
  @apply bg-red-600 hover:bg-red-700;
}

.filter-section {
  @apply p-4 bg-gray-800 border-b border-gray-700;
}

.filter-row {
  @apply flex gap-4 flex-wrap;
}

.filter-group {
  @apply flex flex-col gap-1;
}

.filter-group label {
  @apply text-sm text-gray-300;
}

.filter-group select {
  @apply px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white;
}

.tab-navigation {
  @apply flex bg-gray-800 border-b border-gray-700;
}

.tab-button {
  @apply px-6 py-3 border-b-2 border-transparent hover:bg-gray-700 transition-colors flex items-center gap-2;
}

.tab-button.active {
  @apply border-blue-500 bg-gray-700;
}

.dashboard-content {
  @apply flex-1 overflow-auto p-4;
}

.tab-content {
  @apply space-y-6;
}

.stats-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4;
}

.main-charts {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.chart-container {
  @apply bg-gray-800 rounded-lg p-4;
}

.chart-container.half {
  @apply flex-1;
}

.chart-container.full {
  @apply col-span-full;
}

.detailed-charts {
  @apply space-y-6;
}

.chart-row {
  @apply flex gap-6 flex-col lg:flex-row;
}

.patterns-section {
  @apply space-y-6;
}

.realtime-section {
  @apply space-y-6;
}

.realtime-header {
  @apply bg-gray-800 rounded-lg p-4;
}

.realtime-header h3 {
  @apply text-xl font-bold mb-2;
}

.session-info {
  @apply flex gap-4 text-sm text-gray-300 flex-wrap;
}

.realtime-charts {
  @apply grid grid-cols-1 lg:grid-cols-2 gap-6;
}

.no-session {
  @apply text-center py-12 text-gray-400;
}

.loading-overlay {
  @apply absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center;
}

.loading-spinner {
  @apply text-center;
}

.loading-spinner .icon {
  @apply text-4xl block mb-4;
}

.error-message {
  @apply bg-red-900 border border-red-700 rounded-lg p-4 m-4 flex items-center gap-2;
}

.error-message button {
  @apply ml-auto px-4 py-2 bg-red-700 hover:bg-red-600 rounded transition-colors;
}

.icon {
  @apply inline-block;
}
</style>