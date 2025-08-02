<template>
  <div class="chart-wrapper">
    <h3 class="chart-title">🎯 ステージ別到達分析</h3>
    <div class="chart-container">
      <canvas ref="chartCanvas"></canvas>
    </div>
    <div class="analysis-summary">
      <div class="summary-item" v-for="(count, stage) in data" :key="stage">
        <div class="stage-icon">{{ getStageIcon(stage) }}</div>
        <div class="stage-info">
          <div class="stage-name">{{ getStageLabel(stage) }}</div>
          <div class="stage-count">{{ count }}回到達</div>
          <div class="stage-percentage">{{ getPercentage(count) }}%</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import {
  ArcElement,
  Chart,
  Legend,
  Tooltip
} from 'chart.js'

// Chart.jsの登録
Chart.register(ArcElement, Tooltip, Legend)

interface Props {
  data: Record<string, number>
}

const props = defineProps<Props>()

const chartCanvas = ref<HTMLCanvasElement>()
const chartInstance = ref<Chart | null>(null)

// ステージの設定
const STAGE_COLORS = {
  youth: 'rgb(34, 197, 94)',
  middle: 'rgb(251, 191, 36)', 
  fulfillment: 'rgb(168, 85, 247)'
}

const STAGE_LABELS = {
  youth: '青年期',
  middle: '中年期',
  fulfillment: '充実期'
}

const STAGE_ICONS = {
  youth: '🌱',
  middle: '🌳',
  fulfillment: '🌸'
}

const totalCount = computed(() => {
  return Object.values(props.data || {}).reduce((sum, count) => sum + count, 0)
})

const getStageLabel = (stage: string): string => {
  return STAGE_LABELS[stage as keyof typeof STAGE_LABELS] || stage
}

const getStageIcon = (stage: string): string => {
  return STAGE_ICONS[stage as keyof typeof STAGE_ICONS] || '⭐'
}

const getPercentage = (count: number): string => {
  if (totalCount.value === 0) return '0'
  return ((count / totalCount.value) * 100).toFixed(1)
}

// チャートの初期化
const initChart = () => {
  if (!chartCanvas.value || !props.data) return
  
  const ctx = chartCanvas.value.getContext('2d')
  if (!ctx) return
  
  const stages = Object.keys(props.data)
  const counts = Object.values(props.data)
  const colors = stages.map(stage => STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || 'rgb(107, 114, 128)')
  const labels = stages.map(stage => getStageLabel(stage))
  
  chartInstance.value = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: colors.map(color => color.replace('rgb', 'rgba').replace(')', ', 0.8)')),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 4
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
          display: false // カスタムサマリーを使用
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.9)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(75, 85, 99, 0.5)',
          borderWidth: 1,
          callbacks: {
            label: (context) => {
              const label = context.label
              const value = context.parsed
              const percentage = ((value / totalCount.value) * 100).toFixed(1)
              return `${label}: ${value}回 (${percentage}%)`
            },
            afterLabel: (context) => {
              const stage = Object.keys(props.data)[context.dataIndex]
              const difficulty = getDifficultyLevel(stage)
              return `難易度: ${difficulty}`
            }
          }
        }
      },
      cutout: '60%',
      elements: {
        arc: {
          borderWidth: 2
        }
      }
    }
  })
  
  // 中央にテキストを表示
  addCenterText()
}

// 中央テキストの追加
const addCenterText = () => {
  if (!chartInstance.value) return
  
  const chart = chartInstance.value
  const ctx = chart.ctx
  
  Chart.register({
    id: 'centerText',
    beforeDraw: (chart) => {
      const { width, height, ctx } = chart
      ctx.restore()
      
      const fontSize = (height / 180).toFixed(2)
      ctx.font = `bold ${fontSize}em Arial`
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'white'
      
      const text = `総計\n${totalCount.value}回`
      const textX = Math.round(width / 2)
      const textY = height / 2
      
      const lines = text.split('\n')
      lines.forEach((line, index) => {
        const lineHeight = parseInt(fontSize) * 20
        const y = textY + (index - (lines.length - 1) / 2) * lineHeight
        ctx.fillText(line, textX, y)
      })
      
      ctx.save()
    }
  })
}

// 難易度レベルの取得
const getDifficultyLevel = (stage: string): string => {
  const difficultyMap = {
    youth: '易',
    middle: '中',
    fulfillment: '難'
  }
  return difficultyMap[stage as keyof typeof difficultyMap] || '不明'
}

// チャートデータの更新
const updateChart = () => {
  if (!chartInstance.value || !props.data) return
  
  const stages = Object.keys(props.data)
  const counts = Object.values(props.data)
  const colors = stages.map(stage => STAGE_COLORS[stage as keyof typeof STAGE_COLORS] || 'rgb(107, 114, 128)')
  const labels = stages.map(stage => getStageLabel(stage))
  
  chartInstance.value.data.labels = labels
  chartInstance.value.data.datasets[0].data = counts
  chartInstance.value.data.datasets[0].backgroundColor = colors.map(color => 
    color.replace('rgb', 'rgba').replace(')', ', 0.8)')
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

.analysis-summary {
  @apply space-y-3 mt-4;
}

.summary-item {
  @apply flex items-center gap-3 p-3 bg-gray-700 rounded-lg;
}

.stage-icon {
  @apply text-2xl;
}

.stage-info {
  @apply flex-1;
}

.stage-name {
  @apply text-white font-medium;
}

.stage-count {
  @apply text-gray-300 text-sm;
}

.stage-percentage {
  @apply text-blue-400 text-xs;
}
</style>