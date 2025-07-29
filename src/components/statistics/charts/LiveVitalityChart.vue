<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">
      💗 リアルタイム活力変動
      <span class="live-indicator">🔴 LIVE</span>
    </h3>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="live-stats">
      <div class="stat-item">
        <span class="label">現在活力:</span>
        <span class="value" :class="getVitalityClass(currentVitality)">{{ currentVitality }}</span>
      </div>
      <div class="stat-item">
        <span class="label">変化量:</span>
        <span class="value" :class="getChangeClass(vitalityChange)">
          {{ vitalityChange > 0 ? '+' : '' }}{{ vitalityChange }}
        </span>
      </div>
      <div class="stat-item">
        <span class="label">危険度:</span>
        <span class="value" :class="getRiskClass(riskLevel)">{{ riskLevel }}</span>
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
  Title,
  Tooltip,
  Legend,
  Filler
)

interface VitalityPoint {
  turn: number
  vitality: number
}

interface Props {
  data: VitalityPoint[]
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
const currentVitality = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  return props.data[props.data.length - 1].vitality
})

const vitalityChange = computed(() => {
  if (!props.data || props.data.length < 2) return 0
  const current = props.data[props.data.length - 1].vitality
  const previous = props.data[props.data.length - 2].vitality
  return current - previous
})

const riskLevel = computed(() => {
  const vitality = currentVitality.value
  if (vitality >= 80) return '安全'
  if (vitality >= 60) return '注意'
  if (vitality >= 40) return '警戒'
  if (vitality >= 20) return '危険'
  return '極危険'
})

// スタイルクラスの取得
const getVitalityClass = (vitality: number): string => {
  if (vitality >= 80) return 'text-green-400'
  if (vitality >= 60) return 'text-blue-400'
  if (vitality >= 40) return 'text-yellow-400'
  if (vitality >= 20) return 'text-orange-400'
  return 'text-red-400'
}

const getChangeClass = (change: number): string => {
  if (change > 0) return 'text-green-400'
  if (change < 0) return 'text-red-400'
  return 'text-gray-400'
}

const getRiskClass = (risk: string): string => {
  const riskColors: Record<string, string> = {
    '安全': 'text-green-400',
    '注意': 'text-blue-400',
    '警戒': 'text-yellow-400',
    '危険': 'text-orange-400',
    '極危険': 'text-red-400 animate-pulse'
  }
  return riskColors[risk] || 'text-gray-400'
}

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
          label: '活力',
          data: [],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: '危険ライン',
          data: [],
          borderColor: 'rgb(245, 101, 101)',
          backgroundColor: 'transparent',
          borderDash: [10, 5],
          fill: false,
          pointRadius: 0,
          tension: 0
        },
        {
          label: '警戒ライン',
          data: [],
          borderColor: 'rgb(251, 191, 36)',
          backgroundColor: 'transparent',
          borderDash: [5, 10],
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
        duration: 750,
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
            filter: (legendItem) => legendItem.text === '活力'
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
                const vitality = context.parsed.y
                let status = ''
                if (vitality >= 80) status = '絶好調'
                else if (vitality >= 60) status = '好調'
                else if (vitality >= 40) status = '普通'
                else if (vitality >= 20) status = '要注意'
                else status = '危険'
                
                return `活力: ${vitality} (${status})`
              }
              return ''
            },
            afterBody: (context) => {
              if (context.length > 0 && context[0].dataIndex > 0) {
                const currentIndex = context[0].dataIndex
                const currentVitality = props.data[currentIndex].vitality
                const previousVitality = props.data[currentIndex - 1].vitality
                const change = currentVitality - previousVitality
                
                return `変化: ${change > 0 ? '+' : ''}${change}`
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
            maxTicksLimit: 10
          },
          title: {
            display: true,
            text: 'ターン',
            color: 'rgba(209, 213, 219, 0.8)'
          }
        },
        y: {
          beginAtZero: true,
          max: 100,
          grid: {
            color: 'rgba(75, 85, 99, 0.3)'
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)',
            stepSize: 20
          },
          title: {
            display: true,
            text: '活力',
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
  const vitalityData = props.data.map(point => point.vitality)
  const dangerLineData = props.data.map(() => 20) // 危険ライン
  const cautionLineData = props.data.map(() => 40) // 警戒ライン
  
  // 最新の活力値に応じて線の色を動的に変更
  const currentLevel = currentVitality.value
  let borderColor = 'rgb(239, 68, 68)'
  let backgroundColor = 'rgba(239, 68, 68, 0.1)'
  
  if (currentLevel >= 80) {
    borderColor = 'rgb(34, 197, 94)'
    backgroundColor = 'rgba(34, 197, 94, 0.1)'
  } else if (currentLevel >= 60) {
    borderColor = 'rgb(59, 130, 246)'
    backgroundColor = 'rgba(59, 130, 246, 0.1)'
  } else if (currentLevel >= 40) {
    borderColor = 'rgb(251, 191, 36)'
    backgroundColor = 'rgba(251, 191, 36, 0.1)'
  } else if (currentLevel >= 20) {
    borderColor = 'rgb(245, 101, 101)'
    backgroundColor = 'rgba(245, 101, 101, 0.1)'
  }
  
  chartInstance.value.data.labels = labels
  chartInstance.value.data.datasets[0].data = vitalityData
  chartInstance.value.data.datasets[0].borderColor = borderColor
  chartInstance.value.data.datasets[0].backgroundColor = backgroundColor
  chartInstance.value.data.datasets[0].pointBackgroundColor = borderColor
  chartInstance.value.data.datasets[1].data = dangerLineData
  chartInstance.value.data.datasets[2].data = cautionLineData
  
  // 最新のポイントを強調
  const pointRadii = vitalityData.map((_, index) => 
    index === vitalityData.length - 1 ? 8 : 4
  )
  chartInstance.value.data.datasets[0].pointRadius = pointRadii
  
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
  height: 280px;
}

.live-stats {
  @apply flex gap-4 mt-4 text-sm;
}

.stat-item {
  @apply flex flex-col gap-1 p-3 bg-gray-700 rounded-lg flex-1;
}

.stat-item .label {
  @apply text-gray-300 text-xs;
}

.stat-item .value {
  @apply font-bold text-lg;
}
</style>