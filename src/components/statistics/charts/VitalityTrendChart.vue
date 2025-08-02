<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">💗 活力変動トレンド</h3>
    <div class="chart-info">
      <div class="info-item">
        <span>現在: {{ currentVitality }}</span>
      </div>
      <div class="info-item">
        <span>最高: {{ maxVitality }}</span>
      </div>
      <div class="info-item">
        <span>最低: {{ minVitality }}</span>
      </div>
    </div>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
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

interface VitalityPoint {
  turn: number
  vitality: number
}

interface Props {
  data: VitalityPoint[]
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)

// 計算されたプロパティ
const currentVitality = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  return props.data[props.data.length - 1].vitality
})

const maxVitality = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  return Math.max(...props.data.map(point => point.vitality))
})

const minVitality = computed(() => {
  if (!props.data || props.data.length === 0) return 0
  return Math.min(...props.data.map(point => point.vitality))
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
          label: '活力',
          data: [],
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgb(239, 68, 68)',
          pointBorderColor: 'white',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: '危険ライン',
          data: [],
          borderColor: 'rgb(245, 101, 101)',
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
            filter: (legendItem) => legendItem.text !== '危険ライン' || props.data.some(point => point.vitality <= 20)
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
  if (!chartInstance.value || !props.data) return
  
  const labels = props.data.map(point => point.turn.toString())
  const vitalityData = props.data.map(point => point.vitality)
  const dangerLineData = props.data.map(() => 20) // 危険ラインは20で固定
  
  // 色の動的設定（活力レベルに応じて）
  const borderColors = vitalityData.map(vitality => {
    if (vitality >= 80) return 'rgb(34, 197, 94)'    // 緑
    if (vitality >= 60) return 'rgb(59, 130, 246)'   // 青
    if (vitality >= 40) return 'rgb(251, 191, 36)'   // 黄
    if (vitality >= 20) return 'rgb(245, 101, 101)'  // オレンジ
    return 'rgb(239, 68, 68)'                        // 赤
  })
  
  // グラデーション背景色
  const backgroundColors = vitalityData.map(vitality => {
    if (vitality >= 80) return 'rgba(34, 197, 94, 0.1)'
    if (vitality >= 60) return 'rgba(59, 130, 246, 0.1)'
    if (vitality >= 40) return 'rgba(251, 191, 36, 0.1)'
    if (vitality >= 20) return 'rgba(245, 101, 101, 0.1)'
    return 'rgba(239, 68, 68, 0.1)'
  })
  
  chartInstance.value.data.labels = labels
  chartInstance.value.data.datasets[0].data = vitalityData
  chartInstance.value.data.datasets[1].data = dangerLineData
  
  // 最新の活力レベルに応じてメインラインの色を設定
  const currentLevel = vitalityData[vitalityData.length - 1] || 0
  if (currentLevel >= 80) {
    chartInstance.value.data.datasets[0].borderColor = 'rgb(34, 197, 94)'
    chartInstance.value.data.datasets[0].backgroundColor = 'rgba(34, 197, 94, 0.1)'
  } else if (currentLevel >= 60) {
    chartInstance.value.data.datasets[0].borderColor = 'rgb(59, 130, 246)'
    chartInstance.value.data.datasets[0].backgroundColor = 'rgba(59, 130, 246, 0.1)'
  } else if (currentLevel >= 40) {
    chartInstance.value.data.datasets[0].borderColor = 'rgb(251, 191, 36)'
    chartInstance.value.data.datasets[0].backgroundColor = 'rgba(251, 191, 36, 0.1)'
  } else if (currentLevel >= 20) {
    chartInstance.value.data.datasets[0].borderColor = 'rgb(245, 101, 101)'
    chartInstance.value.data.datasets[0].backgroundColor = 'rgba(245, 101, 101, 0.1)'
  } else {
    chartInstance.value.data.datasets[0].borderColor = 'rgb(239, 68, 68)'
    chartInstance.value.data.datasets[0].backgroundColor = 'rgba(239, 68, 68, 0.1)'
  }
  
  chartInstance.value.update('active')
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
</script>

<style scoped>
.chart-wrapper {
  @apply w-full h-full flex flex-col;
}

.chart-title {
  @apply text-lg font-semibold text-white mb-2 flex items-center gap-2;
}

.chart-info {
  @apply flex gap-4 mb-4 text-sm;
}

.info-item {
  @apply px-3 py-1 bg-gray-700 rounded-full;
}

.info-item span {
  @apply text-gray-200;
}

.chart-container {
  @apply flex-1 min-h-0 relative;
  height: 280px;
}
</style>