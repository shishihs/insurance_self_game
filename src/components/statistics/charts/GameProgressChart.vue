<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">🎮 ゲーム進行履歴</h3>
    <div class="chart-controls">
      <select v-model="chartPeriod" class="period-selector" @change="updateChart">
        <option value="week">過去1週間</option>
        <option value="month">過去1ヶ月</option>
        <option value="quarter">過去3ヶ月</option>
        <option value="all">全期間</option>
      </select>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="chart-stats">
      <div class="stat-item">
        <span class="label">総ゲーム数:</span>
        <span class="value">{{ totalGames }}</span>
      </div>
      <div class="stat-item">
        <span class="label">平均スコア:</span>
        <span class="value">{{ averageScore.toFixed(1) }}</span>
      </div>
      <div class="stat-item">
        <span class="label">最高スコア:</span>
        <span class="value">{{ maxScore }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip
} from 'chart.js'

// Chart.jsの登録
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface GameHistoryData {
  date: string
  gamesPlayed: number
  averageScore: number
  totalPlayTime: number
}

interface Props {
  data: GameHistoryData[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)
const chartPeriod = ref('month')

// 計算されたプロパティ
const filteredData = computed(() => {
  if (!props.data || props.data.length === 0) return []
  
  const now = new Date()
  let cutoffDate = new Date()
  
  switch (chartPeriod.value) {
    case 'week':
      cutoffDate.setDate(now.getDate() - 7)
      break
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1)
      break
    case 'quarter':
      cutoffDate.setMonth(now.getMonth() - 3)
      break
    case 'all':
    default:
      cutoffDate = new Date(0) // すべてのデータを含める
      break
  }
  
  return props.data.filter(item => new Date(item.date) >= cutoffDate)
})

const totalGames = computed(() => {
  return filteredData.value.reduce((sum, item) => sum + item.gamesPlayed, 0)
})

const averageScore = computed(() => {
  if (filteredData.value.length === 0) return 0
  const totalScore = filteredData.value.reduce((sum, item) => sum + item.averageScore * item.gamesPlayed, 0)
  return totalScore / totalGames.value
})

const maxScore = computed(() => {
  if (filteredData.value.length === 0) return 0
  return Math.max(...filteredData.value.map(item => item.averageScore))
})

// チャートの初期化
const initChart = () => {
  if (!chartCanvas.value) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'プレイ回数',
          data: [],
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          yAxisID: 'y',
          fill: true,
          tension: 0.4
        },
        {
          label: '平均スコア',
          data: [],
          borderColor: 'rgb(34, 197, 94)', 
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          yAxisID: 'y1',
          fill: false,
          tension: 0.4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'white',
            usePointStyle: true
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1,
          callbacks: {
            afterLabel: (context) => {
              const dataIndex = context.dataIndex
              const item = filteredData.value[dataIndex]
              if (item) {
                return `プレイ時間: ${formatDuration(item.totalPlayTime)}`
              }
              return ''
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)'
          }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)'
          },
          title: {
            display: true,
            text: 'プレイ回数',
            color: 'rgb(99, 102, 241)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)'
          },
          title: {
            display: true,
            text: '平均スコア',
            color: 'rgb(34, 197, 94)'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      elements: {
        point: {
          radius: 4,
          hoverRadius: 6
        }
      }
    }
  })
}

// チャートデータの更新
const updateChart = () => {
  if (!chartInstance.value) return
  
  const labels = filteredData.value.map(item => {
    const date = new Date(item.date)
    return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
  })
  
  const gamesData = filteredData.value.map(item => item.gamesPlayed)
  const scoresData = filteredData.value.map(item => item.averageScore)
  
  chartInstance.value.data.labels = labels
  chartInstance.value.data.datasets[0].data = gamesData
  chartInstance.value.data.datasets[1].data = scoresData
  
  chartInstance.value.update('active')
}

// ユーティリティ関数
const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  
  if (hours > 0) {
    return `${hours}時間${minutes % 60}分`
  } if (minutes > 0) {
    return `${minutes}分`
  } 
    return `${seconds}秒`
  
}

// チャートの破棄
const destroyChart = () => {
  if (chartInstance.value) {
    chartInstance.value.destroy()
    chartInstance.value = null
  }
}

// ライフサイクル
onMounted(() => {
  initChart()
  updateChart()
})

onUnmounted(() => {
  destroyChart()
})

// データ変更の監視
watch(() => props.data, () => {
  updateChart()
}, { deep: true })

watch(() => chartPeriod.value, () => {
  updateChart()
})
</script>

<style scoped>
.chart-wrapper {
  @apply w-full h-full flex flex-col;
}

.chart-title {
  @apply text-lg font-semibold text-white mb-2 flex items-center gap-2;
}

.chart-controls {
  @apply flex justify-end mb-4;
}

.period-selector {
  @apply px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm;
}

.chart-container {
  @apply flex-1 min-h-0 relative;
  height: 300px;
}

.chart-stats {
  @apply flex gap-6 mt-4 text-sm;
}

.stat-item {
  @apply flex gap-2;
}

.stat-item .label {
  @apply text-gray-300;
}

.stat-item .value {
  @apply text-white font-semibold;
}
</style>