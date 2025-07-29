<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">
      ⏱️ リアルタイム決定時間
      <span class="live-indicator">🔴 LIVE</span>
    </h3>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="time-metrics">
      <div class="metric-item">
        <div class="metric-icon">⚡</div>
        <div class="metric-content">
          <div class="metric-label">最新決定</div>
          <div class="metric-value">{{ latestDecisionTime.toFixed(1) }}秒</div>
        </div>
      </div>
      <div class="metric-item">
        <div class="metric-icon">📊</div>
        <div class="metric-content">
          <div class="metric-label">平均時間</div>
          <div class="metric-value">{{ averageTime.toFixed(1) }}秒</div>
        </div>
      </div>
      <div class="metric-item">
        <div class="metric-icon">🎯</div>
        <div class="metric-content">
          <div class="metric-label">決定パターン</div>
          <div class="metric-value">{{ decisionPattern }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

// Chart.jsの登録
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface DecisionTimeData {
  turn: number
  decisionTime: number
}

interface Props {
  data: DecisionTimeData[]
  autoUpdate?: boolean
  updateInterval?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoUpdate: true,
  updateInterval: 1000 // 1秒
})

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)
let updateTimer: number | null = null

// 計算されたプロパティ
const latestDecisionTime = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  return props.data[props.data.length - 1].decisionTime
})

const averageTime = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  const total = props.data.reduce((sum, item) => sum + item.decisionTime, 0)
  return total / props.data.length
})

const decisionPattern = computed(() => {
  if (!props.data || props.data.length < 3) return '分析中'
  
  const recent = props.data.slice(-3)
  const avgRecent = recent.reduce((sum, item) => sum + item.decisionTime, 0) / 3
  const overall = averageTime.value
  
  if (avgRecent < overall * 0.8) return '迅速化'
  if (avgRecent > overall * 1.2) return '慎重化'
  return '安定'
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
          label: '決定時間',
          data: [],
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(168, 85, 247)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: '目標時間（5秒）',
          data: [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          pointRadius: 0,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 500,
        easing: 'easeInOutQuart'
      },
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: 'white',
            usePointStyle: true,
            filter: (legendItem) => legendItem.text === '決定時間'
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
            title: (context) => {
              return `ターン ${context[0].label}`
            },
            label: (context) => {
              if (context.datasetIndex === 0) {
                const time = context.parsed.y
                let speed = ''
                if (time <= 3) speed = '超高速'
                else if (time <= 5) speed = '高速'
                else if (time <= 10) speed = '普通'
                else if (time <= 15) speed = '慎重'
                else speed = '超慎重'
                
                return `決定時間: ${time.toFixed(1)}秒 (${speed})`
              }
              return ''
            },
            afterBody: (context) => {
              if (context.length > 0) {
                const time = context[0].parsed.y
                const target = 5
                const diff = time - target
                
                if (Math.abs(diff) < 1) {
                  return '🎯 理想的な決定時間です'
                } else if (diff > 0) {
                  return `⏳ 目標より${diff.toFixed(1)}秒長いです`
                } else {
                  return `⚡ 目標より${Math.abs(diff).toFixed(1)}秒速いです`
                }
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
            color: 'rgba(209, 213, 219, 0.8)',
            maxTicksLimit: 8
          },
          title: {
            display: true,
            text: 'ターン',
            color: 'rgba(209, 213, 219, 0.8)'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)',
            callback: (value) => `${value}秒`
          },
          title: {
            display: true,
            text: '時間（秒）',
            color: 'rgba(209, 213, 219, 0.8)'
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      elements: {
        line: {
          tension: 0.4
        }
      }
    }
  })
}

// チャートデータの更新
const updateChart = () => {
  if (!chartInstance.value || !props.data || props.data.length === 0) return
  
  const labels = props.data.map(point => point.turn.toString())
  const timeData = props.data.map(point => point.decisionTime)
  const targetData = props.data.map(() => 5) // 目標時間5秒
  
  // 最新の決定時間に応じて線の色を動的に変更
  const latestTime = latestDecisionTime.value
  let borderColor = 'rgb(168, 85, 247)'
  let backgroundColor = 'rgba(168, 85, 247, 0.1)'
  
  if (latestTime <= 3) {
    borderColor = 'rgb(34, 197, 94)' // 緑 - 高速
    backgroundColor = 'rgba(34, 197, 94, 0.1)'
  } else if (latestTime <= 5) {
    borderColor = 'rgb(59, 130, 246)' // 青 - 理想
    backgroundColor = 'rgba(59, 130, 246, 0.1)'
  } else if (latestTime <= 10) {
    borderColor = 'rgb(251, 191, 36)' // 黄 - 普通
    backgroundColor = 'rgba(251, 191, 36, 0.1)'
  } else if (latestTime <= 15) {
    borderColor = 'rgb(245, 101, 101)' // オレンジ - 慎重
    backgroundColor = 'rgba(245, 101, 101, 0.1)'
  } else {
    borderColor = 'rgb(239, 68, 68)' // 赤 - 超慎重
    backgroundColor = 'rgba(239, 68, 68, 0.1)'
  }
  
  chartInstance.value.data.labels = labels
  chartInstance.value.data.datasets[0].data = timeData
  chartInstance.value.data.datasets[0].borderColor = borderColor
  chartInstance.value.data.datasets[0].backgroundColor = backgroundColor
  chartInstance.value.data.datasets[0].pointBackgroundColor = borderColor
  chartInstance.value.data.datasets[1].data = targetData
  
  // 最新のポイントを強調
  const pointRadii = timeData.map((_, index) => 
    index === timeData.length - 1 ? 8 : 4
  )
  const pointColors = timeData.map((time, index) => {
    if (index === timeData.length - 1) {
      // 最新ポイントは特別な色
      if (time <= 3) return 'rgb(34, 197, 94)'
      if (time <= 5) return 'rgb(59, 130, 246)'
      if (time <= 10) return 'rgb(251, 191, 36)'
      if (time <= 15) return 'rgb(245, 101, 101)'
      return 'rgb(239, 68, 68)'
    }
    return borderColor
  })
  
  chartInstance.value.data.datasets[0].pointRadius = pointRadii
  chartInstance.value.data.datasets[0].pointBackgroundColor = pointColors
  
  chartInstance.value.update('active')
}

// 自動更新の設定
const startAutoUpdate = () => {
  if (props.autoUpdate && !updateTimer) {
    updateTimer = window.setInterval(() => {
      updateChart()
    }, props.updateInterval)
  }
}

const stopAutoUpdate = () => {
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }
}

// チャートの破棄
const destroyChart = () => {
  stopAutoUpdate()
  if (chartInstance.value) {
    chartInstance.value.destroy()
    chartInstance.value = null
  }
}

// ライフサイクル
onMounted(() => {
  initChart()
  updateChart()
  startAutoUpdate()
})

onUnmounted(() => {
  destroyChart()
})

// データ変更の監視
watch(() => props.data, () => {
  updateChart()
}, { deep: true })

// 自動更新設定の変更監視
watch(() => props.autoUpdate, (newValue) => {
  if (newValue) {
    startAutoUpdate()
  } else {
    stopAutoUpdate()
  }
})
</script>

<style scoped>
.chart-wrapper {
  @apply w-full h-full flex flex-col;
}

.chart-title {
  @apply text-lg font-semibold text-white mb-2 flex items-center gap-2;
}

.live-indicator {
  @apply text-xs px-2 py-1 bg-red-600 rounded-full animate-pulse;
}

.chart-container {
  @apply flex-1 min-h-0 relative;
  height: 250px;
}

.time-metrics {
  @apply flex gap-3 mt-4;
}

.metric-item {
  @apply flex items-center gap-3 p-3 bg-gray-700 rounded-lg flex-1;
}

.metric-icon {
  @apply text-2xl;
}

.metric-content {
  @apply flex-1;
}

.metric-label {
  @apply text-gray-300 text-xs;
}

.metric-value {
  @apply font-bold text-lg text-white;
}
</style>