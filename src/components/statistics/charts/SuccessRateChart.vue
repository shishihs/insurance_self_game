<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">📊 ステージ別成功率</h3>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="chart-legend">
      <div v-for="(rate, stage) in data" :key="stage" class="legend-item">
        <div class="legend-color" :style="{ backgroundColor: getStageColor(stage) }"></div>
        <span class="legend-label">{{ getStageLabel(stage) }}</span>
        <span class="legend-value">{{ (rate * 100).toFixed(1) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import {
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  Title,
  Tooltip
} from 'chart.js'

// Chart.jsの登録
Chart.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface Props {
  data: Record<string, number>
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)

// ステージの色とラベルのマッピング
const STAGE_COLORS = {
  youth: 'rgb(34, 197, 94)',    // 緑
  middle: 'rgb(251, 191, 36)',  // 黄
  fulfillment: 'rgb(168, 85, 247)' // 紫
}

const STAGE_LABELS = {
  youth: '青年期',
  middle: '中年期', 
  fulfillment: '充実期'
}

const getStageColor = (stage: string): string => {
  return STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || 'rgb(107, 114, 128)'
}

const getStageLabel = (stage: string): string => {
  return STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage
}

// チャートの初期化
const initChart = () => {
  if (!chartCanvas.value || !props.data) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  const stages = Object.keys(props.data)
  const rates = Object.values(props.data).map(rate => rate * 100) // パーセンテージに変換
  const colors = stages.map(stage => getStageColor(stage))
  const labels = stages.map(stage => getStageLabel(stage))
  
  chartInstance.value = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '成功率 (%)',
          data: rates,
          backgroundColor: colors.map(color => color.replace('rgb', 'rgba').replace(')', ', 0.6)')),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false
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
          display: false // カスタムレジェンドを使用
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const value = context.parsed.y
              const stage = context.label
              return `${stage}: ${value.toFixed(1)}%`
            },
            afterLabel: (context) => {
              const rate = context.parsed.y / 100
              let performance = ''
              if (rate >= 0.8) performance = '優秀'
              else if (rate >= 0.6) performance = '良好'
              else if (rate >= 0.4) performance = '普通'
              else performance = '要改善'
              
              return `パフォーマンス: ${performance}`
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: 'rgba(209, 213, 219, 0.8)',
            font: {
              size: 12
            }
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
            callback: (value) => `${value}%`
          },
          title: {
            display: true,
            text: '成功率 (%)',
            color: 'rgba(209, 213, 219, 0.8)'
          }
        }
      },
      elements: {
        bar: {
          borderWidth: 2
        }
      },
      interaction: {
        mode: 'index',
        intersect: false
      }
    }
  })
}

// チャートデータの更新
const updateChart = () => {
  if (!chartInstance.value || !props.data) return
  
  const stages = Object.keys(props.data)
  const rates = Object.values(props.data).map(rate => rate * 100)
  const colors = stages.map(stage => getStageColor(stage))
  const labels = stages.map(stage => getStageLabel(stage))
  
  chartInstance.value.data.labels = labels
  chartInstance.value.data.datasets[0].data = rates
  chartInstance.value.data.datasets[0].backgroundColor = colors.map(color => 
    color.replace('rgb', 'rgba').replace(')', ', 0.6)')
  )
  chartInstance.value.data.datasets[0].borderColor = colors
  
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
  @apply text-lg font-semibold text-white mb-4 flex items-center gap-2;
}

.chart-container {
  @apply flex-1 min-h-0 relative;
  height: 250px;
}

.chart-legend {
  @apply flex gap-4 mt-4 flex-wrap;
}

.legend-item {
  @apply flex items-center gap-2 text-sm;
}

.legend-color {
  @apply w-3 h-3 rounded;
}

.legend-label {
  @apply text-gray-300;
}

.legend-value {
  @apply text-white font-semibold;
}
</style>